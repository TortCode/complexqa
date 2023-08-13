import json
import os

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

data_file = 'event_role_formatted.json'
with open(data_file, 'r') as f:
    data = json.load(f)

template_annotation = {}
template_file = 'annotated_templates_new.json'
if os.path.exists(template_file):
    with open(template_file, 'r') as f:
        template_annotation = json.load(f)
#print(json.dumps(template_annotation, indent=2))
print(len(template_annotation), "templates annotated.")
input("Press Enter to continue...")

for k, v in data.items():
    template = v['template'].split(' ')
    cnt = 0
    for token in template:
        if '[' == token[0]:
            cnt += 1
    if k in template_annotation and len(template_annotation[k]['scopes']) == cnt:
        continue
    template_annotation[k] = {'template': template, 'scopes': []}
    for idx, token in enumerate(template):
        if '[' == token[0]:
            clear_screen()
            print(f"Event Type: {k}")
            print("#"*32)
            for i, t in enumerate(template):
                print(f"  {i} - {t}")
            print('*'*32)
            print(f"param @ {idx} - {token[1:-1]}")
#            sub_q = input('Question: ')
#            template_annotation[k][token[1:-1]] = sub_q
            notdone = True
            while notdone:
                start = int(input('start: '))
                end = int(input('end: '))
                print("\ntext:", ' '.join(template[start:end+1]))
                # get approval
                while True:
                    yn = input('Correct? (y/n): ').lower()
                    if yn == 'y':
                        notdone = False
                        break
                    elif yn == 'n':
                        break
                    else:
                        print("Invalid response.")

            template_annotation[k]['scopes'].append({
                    'role': token[1:-1],
                    'index': idx,
                    'start': start,
                    'end': end,
                    'text': ' '.join(template[start:end+1])
            })

    with open(template_file, 'w') as f:
        json.dump(template_annotation, f, indent=2)

    print()
