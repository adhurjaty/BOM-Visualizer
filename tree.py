import json
import csv

index = 0

def construct_json(parent, node, reader):
    global index

    while index < len(reader):
            
        level, pn, name, rev, quantity = reader[index]
        level = int(level)

        #print parent, node, level, pn
        new_node = {'name': pn, 'part_name': name,
                    'qty': quantity, 'size': 2000}

        if parent == level - 1:
            node['children'].append(new_node)
            index += 1

        elif parent == level - 2:
            old_node = node['children'][-1]
            del old_node['size']
            old_node['children'] = []
            
            construct_json(level - 1, old_node, reader)
        else:
            return

with open(r'C:\Users\adhurjaty\Desktop\161401.csv', 'rb') as csvfile:
    reader = csv.reader(csvfile, delimiter=',')

    #remove headers
    reader.next()
    
    reader = list(reader)

level, pn, name, rev, quantity = reader[0]
level = int(level)

json_dict = {'name': pn, 'part_name': name,
             'qty': quantity, 'children': []}

index = 1

construct_json(level, json_dict, reader)

with open(r'C:\Users\adhurjaty\Desktop\bom.json', 'wb') as jfile:
    jfile.write(json.dumps(json_dict, indent=4, separators=(',', ': ')))

    
    
