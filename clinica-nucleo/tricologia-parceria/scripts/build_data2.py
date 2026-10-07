import sys, json, datetime as dt
import pandas as pd
sys.path.insert(0, sys.argv[2])
from plano2 import build
from rules2 import auto_code, tri_flag, unidade, norm_desc, PALAVRAS
SP = sys.argv[1]
pd.set_option('display.width',250); pd.set_option('display.max_rows',400); pd.set_option('display.max_colwidth',55)
plano = build(SP+'/drive/plano_oficial.json'); P = plano.set_index('cod')
b = pd.read_pickle(SP+'/ref/base_janjul.pkl'); b = b[(b['cod']!='') & (b['dv_d']<=dt.date(2026,6,30))].copy()
print('jan-jun base anterior', len(b))
COLS = ['R/D','Data de emissão','Data de vencimento','Data de baixa','Responsável','Paciente','Descrição','Serviços',
        'Categorias','Nota fiscal','Convênio','Método','Conta','Valor','Valor líquido','Agendado','Pago','Observações']
clean = lambda x: None if (x is None or x!=x or x=='—') else x
rows=[]
for _,r in b.iterrows():
    rows.append({'R/D':'Receita' if r.t==1 else 'Despesa','Data de emissão':r.de_d,'Data de vencimento':r.dv_d,'Data de baixa':r.dp_d,
      'Responsável':clean(r.rsp),'Paciente':None,'Descrição':r.desc,'Serviços':clean(r.srv),'Categorias':None,'Nota fiscal':None,'Convênio':None,
      'Método':clean(r.met),'Conta':clean(r.cta),'Valor':round(float(r.v),2),'Valor líquido':None,'Agendado':None,'Pago':None,'Observações':None,
      'Origem':'Base jan–jun classificada (export anterior)','Código manual':r.cod,'Tricologia manual':None,'Nota de ajuste':None,'_prior':r.cod})
for fn,lab in [('jul','Export jul/2026 completo (498)'),('ago','Export ago/2026 completo (605)'),('set','Export set/2026 completo (474)')]:
    df = pd.read_excel(f'{SP}/data2/{fn}.xlsx')
    for _,u in df.iterrows():
        d = {c:(None if (not isinstance(u[c],str) and u[c]!=u[c]) else u[c]) for c in COLS}
        for c in ['Data de emissão','Data de vencimento']: d[c] = u[c].date() if u[c]==u[c] else None
        d['Data de baixa'] = dt.datetime.strptime(u['Data de baixa'],'%d/%m/%Y').date() if isinstance(u['Data de baixa'],str) else None
        d['Valor']=round(float(u['Valor']),2)
        if d['Valor líquido'] is not None: d['Valor líquido']=round(float(d['Valor líquido']),2)
        d.update({'Origem':lab,'Código manual':None,'Tricologia manual':None,'Nota de ajuste':None,'_prior':None})
        rows.append(d)
base = pd.DataFrame(rows)
# ajustes manuais documentados
def adj(mask, code=None, tri=None, nota=None):
    n = mask.sum(); assert n>=1, nota
    if code: base.loc[mask,'Código manual']=code
    if tri: base.loc[mask,'Tricologia manual']=tri
    base.loc[mask,'Nota de ajuste']=nota
    return n
nd = base['Descrição'].map(norm_desc)
print(adj((nd=='DR MARCOS') & base['Observações'].astype(str).str.contains('COMPLEMENTO SALARIAL KATIELE'), '2.03.01.002', None,
    'Obs. do lançamento: "PAGAMENTO DO COMPLEMENTO SALARIAL KATIELE MES 06" — é salário, não retirada de sócio.'))
print(adj((nd=='REEMBOLSO MERCADO LIVRE') & (base['Valor']==275.92), '1.02.02.006', 'SIM',
    'Estorno de R$ 275,92 do Mercado Livre = valor exato do MICROSCOPIO TRICOLOGIA comprado em 29/06. Reduz o investimento da tricologia.'))
# memória (jan-jun, moda), sem descrições que têm regra prioritária
d0 = base[(base['R/D']=='Despesa') & base['_prior'].notna()].copy(); d0['nd']=d0['Descrição'].map(norm_desc)
d0 = d0[~d0['nd'].str.contains('DR MARCOS|MARCOS SANTANA|TRICOLOG|TROCOLOG|PATRICIA|TRANSFER|SAQUE|SUPRIMENTO|RESGATE|RETIRADA PARA|ESTEIRA', regex=True)]
mem = d0.groupby('nd')['_prior'].agg(lambda s: s.value_counts().index[0]).to_dict()
mem = {k:v for k,v in mem.items() if v in P.index}
print('memória', len(mem))
base['Cód auto'] = [auto_code(r, mem) for _,r in base.iterrows()]
base['Código'] = [m if isinstance(m,str) and m else a for m,a in zip(base['Código manual'], base['Cód auto'])]
miss = set(base['Código'])-set(P.index); assert not miss, miss
assert (P.loc[list(set(base['Código'])),'registro']=='Analítica').all()
base['Tricologia auto'] = [tri_flag(r) for _,r in base.iterrows()]
base['Tricologia'] = [m if isinstance(m,str) and m else a for m,a in zip(base['Tricologia manual'], base['Tricologia auto'])]
base['Unidade'] = [unidade(r) for _,r in base.iterrows()]
base['Mes'] = [d.year*100+d.month for d in base['Data de vencimento']]
base['Mes baixa'] = [d.year*100+d.month if isinstance(d,dt.date) else None for d in base['Data de baixa']]
base['Conta analítica'] = base['Código'].map(P['nome']); base['Grupo'] = base['Código'].map(P['grupo'])
base['Linha trico'] = [P.at[c,'linha_trico'] if t=='SIM' else '' for c,t in zip(base['Código'],base['Tricologia'])]
base['Estrutura'] = [('SIM' if (a=='Despesa' and t!='SIM' and P.at[c,'estrutura']=='SIM') else 'NÃO') for a,c,t in zip(base['R/D'],base['Código'],base['Tricologia'])]
base['Natureza'] = base['Código'].map(P['natureza'])
new = base[base['Origem'].str.startswith('Export')]
print('não classificadas:'); print(new[new['Código'].isin(['2.13.01.090','1.01.99.000'])][['Mes','R/D','Descrição','Categorias','Serviços','Valor']].to_string())
print(new.groupby(['R/D','Grupo']).Valor.sum().round(2).to_string())
base.to_pickle(SP+'/ref/base_v2.pkl'); plano.to_pickle(SP+'/ref/plano_v2.pkl'); json.dump(mem, open(SP+'/ref/memoria_v2.json','w'), ensure_ascii=False)
