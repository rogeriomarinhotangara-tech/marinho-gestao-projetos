import json, re, sys
html = open(sys.argv[1], encoding='utf-8').read()
i = html.index('const RAW = ') + len('const RAW = ')
raw, end = json.JSONDecoder().raw_decode(html[i:])
json.dump(raw, open(sys.argv[2],'w'), ensure_ascii=False)
print(raw.keys(), raw['cols'], len(raw['rows']))
print(raw['empresa'], raw['d0'], raw['hoje'])
for k,v in raw.items():
    if k not in ('dic','rows','cols','empresa'): print(k, str(v)[:600])
print('AFTER:', html[i+end:i+end+3000])
