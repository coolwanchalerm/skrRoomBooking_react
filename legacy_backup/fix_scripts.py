import re

with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if i == 14: # Line 15: <script> (Chart.js)
        skip = True
        new_lines.append('<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js" defer></script>\n')
        continue
    
    if skip and i == 23: # Line 24: </script> for Chart.js
        skip = False
        continue
        
    if not skip:
        if i < 40 and '<script src="' in line and 'defer' not in line:
            line = line.replace('></script>', ' defer></script>')
        new_lines.append(line)

with open('index.html', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Done")
