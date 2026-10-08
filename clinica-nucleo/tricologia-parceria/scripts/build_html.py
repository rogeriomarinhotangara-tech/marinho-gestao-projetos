import sys, json, base64, os
SP=sys.argv[1]
t=open(SP+'/scripts/dash_template.html',encoding='utf-8').read()
dd=json.load(open(SP+'/out/dash2.json',encoding='utf-8')); dd['out']=json.load(open(SP+'/out/out26.json',encoding='utf-8')); d=json.dumps(dd,ensure_ascii=False,separators=(',',':'))
assert t.count('/*__DATA__*/null')==1
t=t.replace('/*__XLSX_B64__*/""', '"'+(base64.b64encode(open(SP+'/out/exports/Tricologia_Paineis_Out2026.xlsx','rb').read()).decode() if os.path.exists(SP+'/out/exports/Tricologia_Paineis_Out2026.xlsx') else '')+'"')
open(SP+'/out/parceria_tricologia.html','w',encoding='utf-8').write(t.replace('/*__DATA__*/null',d.replace('</','<\\/')))
print('ok',len(t)//1024,'KB template', (len(t)+len(d))//1024,'KB total')
