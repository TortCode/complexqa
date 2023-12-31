import json
import csv
import argparse
from time import sleep
from nltk.tokenize.treebank import TreebankWordDetokenizer
from typing import List, Tuple
from collections import defaultdict
import re

configs=argparse.Namespace()

def main():
    get_args() 

    with configs.file as f:
        train_json = list(f)
    # load kairos roles
    global kairos_roles
    with configs.kairos as f:
        kairos_roles = json.load(f)

    with configs.output as outfile:
        # write header
        writer = csv.writer(outfile)
        field = ['docid', 'text', 'events']
        writer.writerow(field)

        # parse each line of jsonl file
        start_idx = configs.start
        end_idx = configs.end if configs.end != -1 else (len(train_json) - 1)

        for line in train_json[start_idx:(end_idx+1)]:
            example = json.loads(line.encode('utf-8'))
            tokens = example['tokens']
            docid = example['doc_id']

            entity_map = {entity['id']:
                {'offset': entity['start'],
                 'length': entity['end'] - entity['start']}
            for entity in example['entity_mentions']}

            # convert events to metatriggers
            events = [process_event(event, entity_map) for event in example['event_mentions']]
            events.sort(key=lambda x: x['offset'])

            # add markup about triggers and their indices to tokens
            add_indices(tokens, events)
            indexed_text = detokenize_and_collapsews(tokens)

            writer.writerow([
                docid, indexed_text, json.dumps(events),
            ])

def process_event(event, entity_map) -> dict:
    """Converts an event to a metatrigger (trigger with additional info to aid QA gen) """
    template, role_text_map = get_template_and_role_mapping(event, entity_map)
    event_id = event['id']
    event_type = event['event_type']
    trigger = event['trigger']
    text = trigger['text']
    offset = trigger['start']
    length = trigger['end'] - offset
    # if debug:
    #     print(f"text:{text} offset:{offset} template:{template} role_text_map:{role_text_map}")
    return {
        'event_id': event_id,
        'event_type': event_type,
        'text':text, 'offset':offset, 'length':length, 'template':template,
        'role_text_map': role_text_map
    }

def get_template_and_role_mapping(event, entity_map) -> Tuple[str, List[dict]]:
    """Returns the template and role mapping for the given event"""
    def process_arg(arg):
        id = arg['entity_id']
        return {
            'text': arg['text'],
            'entity_id': id,
            **entity_map[id],
        }
    
    role_mapping_dict = defaultdict(list)
    for arg in event['arguments']:
        role_mapping_dict[arg['role']].append(process_arg(arg))
    
    event_type = event['event_type']
    event_role = kairos_roles.get(event_type)
    if event_role is None:
        # retry with 'unspecified' variant of event type
        event_type = event_type.rsplit('.', 1)[0] + '.Unspecified' 
        event_role = kairos_roles.get(event_type)
        if event_role is None:
            return None, [] # just give up

    template = event_role['template']
    role_text_map = [
        {'role':role, 'tokens':role_mapping_dict[role]}
        for role in set(event_role['roles'])]
    return template, role_text_map

def detokenize_and_collapsews(tokens: List[str]) -> str:
    """Detokenizes tokens and collapses whitespace in an intuitive fashion"""
    text = TreebankWordDetokenizer().detokenize(tokens)
    text = re.sub('\s*,\s*', ', ', text)
    text = re.sub('\s*\.\s*', '. ', text)
    text = re.sub('\s*\?\s*', '? ', text)
    text = re.sub('\s*\-\s*', '-', text)
    text = re.sub('\s*\’\s*', '’', text)
    text = re.sub('\s*\“\s*', ' “', text)
    text = re.sub('\s*\”\s*', '” ', text)
    text = re.sub('\s*\–\s*', '–', text)
    text = re.sub('\s*\'\s*', "'", text)
    text = re.sub('\s*\"\s*', '"', text)
    return text

def get_args() -> argparse.Namespace:
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(
        prog='parse_multitrigger.py', fromfile_prefix_chars='@',
        description='Parse data from jsonl file into csv format with one document per row.')
    parser.add_argument('file', type=argparse.FileType("r"), 
                        help='jsonl file to parse', metavar='src')
    parser.add_argument('-k', '--kairos', type=argparse.FileType("r"),
                        help='kairos roles file')
    parser.add_argument('-o', '--output', type=csv_filetype("w"), 
                        help='output file')
    parser.add_argument('-s', '--start', type=int, default=0, 
                        help='start index (inclusive) of range to parse in file; default: beginning of file')
    parser.add_argument('-e', '--end', type=int, default=-1, 
                        help='end index (inclusive) of range to parse in file; default: end of file')
    parser.add_argument('-d', '--debug', action='store_true',
                        help='set debugging on')
    parser.parse_args(namespace=configs)

def csv_filetype(mode: str):
    """Returns a function that opens a csv file in the specified mode """
    def opencsv(path: str) :
        """Opens a csv file in the specified mode"""
        try:
            return open(path, mode=mode, newline='', encoding='utf-8')
        except FileNotFoundError:
            raise argparse.ArgumentError(f"File {path} not found")
    return opencsv

def add_indices(raw_tokens: List[str], triggers: List[dict]):
    """Marks each trigger with an HTML tag"""
    for i, trigger in enumerate(triggers):
        p = trigger['offset']
        pl = trigger['length']
        raw_tokens[p] = f"<trigger id='trigger-{i}'>{raw_tokens[p]}"
        raw_tokens[p+pl-1] += f"</trigger>"
        for arg in trigger['role_text_map']:
            for j, tok in enumerate(arg['tokens']):
                q = tok['offset']
                ql = tok['length']
                raw_tokens[q] = \
                    f"<role id='role-{i}-{arg['role']}-{j}' trigno='{i}'>{raw_tokens[q]}"
                raw_tokens[q+ql-1] += f"</role>"

if __name__ == '__main__':
    main()
