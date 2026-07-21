import re, json

with open('dax_calculated_columns.txt', 'r', encoding='utf-8') as f:
    text = f.read()

roles = {}
current_role = None

role_re = re.compile(r'col_Score_([A-Za-z0-9_]+)\s*=')
valid_pos_re = re.compile(r'CONTAINSSTRING\(pos,\s*\"([^\"]+)\"\)')
weight_re = re.compile(r'VAR\s+s_([A-Za-z0-9_]+)\s*=\s*DIVIDE\(COALESCE\([^\[]+\[([^\]]+)\],\s*0\)\s*-\s*[^,]+,\s*[^,]+,\s*0\)\s*\*\s*([\d\.]+)')

for line in text.split('\n'):
    r_match = role_re.search(line)
    if r_match:
        current_role = r_match.group(1).replace('_L', '')
        roles[current_role] = {'valid_positions': [], 'weights': {}}
        continue
        
    if current_role:
        p_match = valid_pos_re.search(line)
        if p_match:
            roles[current_role]['valid_positions'].append(p_match.group(1))
            
        w_match = weight_re.search(line)
        if w_match:
            stat_name = w_match.group(2)
            weight = float(w_match.group(3))
            roles[current_role]['weights'][stat_name] = weight

with open('backend/scraper/scoring_config.py', 'w', encoding='utf-8') as f:
    f.write('ROLES_CONFIG = ' + json.dumps(roles, indent=4) + '\n')
