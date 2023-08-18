import csv
import argparse
import json
from pathlib import Path
from typing import List, Tuple

configs=argparse.Namespace()

def main():
    get_args() 
    print(f"Merging template {configs.file.name} with data {configs.data.name} to {configs.output}.")

    with configs.file as f:
        template = f.read() 

    with configs.question as q:
        questions = json.loads(q.read().encode('utf-8'))

    with configs.data as datafile:
        dataname = Path(datafile.name).stem
        reader = csv.DictReader(datafile)

        for i, line in enumerate(reader):
            line['strategy'] = json.dumps(questions.get(line['docid']))
            text = template
            for k, v in line.items():
                text = text.replace(f"${{{k}}}", v)
            with open(configs.output / f"{dataname}_{i}.html", 'w') as outfile:
                outfile.write(text)

def get_args() -> argparse.Namespace:
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(
        prog='fill_html_template.py', fromfile_prefix_chars='@',
        description='Fill html template from given csv.')
    parser.add_argument('data', type=csv_opener("r"),
                        help='data file')
    parser.add_argument('file', type=argparse.FileType("r"), 
                        help='template file to fill')
    parser.add_argument('-q', '--question', type=argparse.FileType("r"),
                        help='question file')
    parser.add_argument('-o', '--output', type=Path, 
                        help='output dir')
    parser.parse_args(namespace=configs)

def csv_opener(mode: str):
    """Returns a function that opens a csv file in the specified mode """
    def opencsv(path: str) :
        """Opens a csv file in the specified mode"""
        try:
            return open(path, mode=mode, newline='', encoding='utf-8')
        except FileNotFoundError:
            raise argparse.ArgumentError(f"File {path} not found")
    return opencsv

if __name__ == '__main__':
    main()
