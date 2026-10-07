import re, csv, io, sys, json
t = open(sys.argv[1]).read()
parts = re.split(r'\s(?=\d\.\d{2}\.\d{2}\.\d{3},)', t)
rows=[]
for p in parts[1:]:
    rec = next(csv.reader(io.StringIO(p)))
    rows.append(rec[:24])
print('contas', len(rows))
hdr = ['cod','desc','tipo','passagem','zerar','nivel','registro','aceita','pai','grupo','subgrupo','dre','fluxo','natureza','concil','centro','regra','status','legado','qc','impacto','atividade','direcao','linha_fluxo']
D = [dict(zip(hdr,r)) for r in rows]
json.dump(D, open(sys.argv[2],'w'), ensure_ascii=False)
idx = {d['cod']:d for d in D}
for c in ['1.01.09.000','1.01.09.001','1.01.09.002','1.01.99.000','2.09.03.000','2.09.03.001','2.09.03.002','2.09.03.003','2.09.03.004','2.02.04.000','2.02.04.008','2.02.04.009','2.02.04.010','2.13.01.090','2.13.01.098','2.13.01.099','2.02.01.006','2.09.01.008','2.16.01.001','2.14.01.010','2.02.02.011','2.03.01.015','2.03.01.010']:
    d=idx.get(c); print(c, '->', (d['desc'], d['registro'], d['grupo'], d['subgrupo']) if d else 'NÃO EXISTE')
# grupos nivel 3 sob 1.01 e 2.09
for d in D:
    if d['nivel'] in ('2','3') and (d['cod'].startswith('1.01') or d['cod'].startswith('2.09') or d['cod'].startswith('2.02') or d['cod'].startswith('2.13') or d['cod'].startswith('2.14')): print(d['cod'], d['desc'], d['nivel'])
# contas com TRICO / CAPILAR / PARCERIA / REPASSE
for d in D:
    if re.search(r'TRICO|CAPILAR|PARCERI|REPASSE|RATEIO|PASSAGE|AÉREA|AEREA', d['desc'].upper()): print('*', d['cod'], d['desc'], d['registro'], d['grupo'])
