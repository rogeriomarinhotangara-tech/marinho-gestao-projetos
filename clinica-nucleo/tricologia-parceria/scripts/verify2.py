import sys, openpyxl, pandas as pd, datetime as dt
SP=sys.argv[1]; F=sys.argv[2]
wb=openpyxl.load_workbook(F,data_only=True); b=pd.read_pickle(SP+'/ref/base_v2_out.pkl')
ws=wb['20 Base']; bad=0
for i,(row,(_,p)) in enumerate(zip(ws.iter_rows(min_row=2,max_row=len(b)+1,values_only=True),b.iterrows())):
    chk=[('Mes',row[20],p['Mes']),('Cod',row[22],p['Código']),('Grp',row[24],p['Grupo']),('Uni',row[26],p['Unidade']),('Tri',row[29],p['Tricologia']),
         ('TL',row[30] or '',p['Linha trico'] or ''),('Est',row[31],p['Estrutura']),('MesB',row[33] if row[33]!='' else None,p['Mes baixa'] if p['Mes baixa']==p['Mes baixa'] else None)]
    if str(p['Origem']).startswith('Export'): chk.append(('Auto',row[21],p['Cód auto']))
    for k,a,e in chk:
        if a!=e and not (k=='MesB' and (a in (None,'') and e is None)):
            bad+=1
            if bad<20: print('row',i+2,k,'xl=',a,'py=',e,'|',p['Descrição'])
print('MISMATCHES', bad)
d=wb['08 DRE Clínica']
for i,m in enumerate([202601,202602,202603,202604,202605,202606,202607,202608,202609]):
    rb=b[(b['R/D']=='Receita')&(b.Grupo=='Receita Operacional Bruta')&(b.Mes==m)].Valor.sum()
    print(m,'RB xl',round(d.cell(6,2+i).value,2),'py',round(rb,2),'| dif desp',d.cell(45,2+i).value,'| dif rec',d.cell(48,2+i).value,'| EBITDA',round(d.cell(22,2+i).value,2),'| RL',round(d.cell(31,2+i).value,2))
t=wb['03 DRE Tricologia']
for r in range(9,45):
    v=[t.cell(r,c).value for c in range(1,8)]
    if v[0]: print(r, v[0][:52].ljust(52), [round(x,2) if isinstance(x,float) else x for x in v[1:]])
ra=wb['04 Rateio Estrutura']
for row in ra.iter_rows(min_row=1,max_row=ra.max_row):
    if row[1].value and isinstance(row[1].value,str) and ('MÉTODO' in row[1].value or '(=)' in row[1].value or 'Receita operacional' in row[1].value or 'Diária' in row[1].value):
        print(row[1].value[:60], [round(c.value,4) if isinstance(c.value,float) else c.value for c in row[3:13]])
iv=wb['06 Investimento Tricologia']; print('invest', [(iv.cell(r,2).value[:40], round(iv.cell(r,4).value,2)) for r in range(5,14)])
pr=wb['02 Premissas']; print('P_PCTA',pr['B21'].value,'P_DIARIA',pr['B28'].value,'P_INV',pr['B35'].value,'AM',pr['B36'].value)
c=wb['09 Conciliação Datas']
for row in c.iter_rows(min_row=1,max_row=40,values_only=True):
    if row[0]: print([ (round(x,2) if isinstance(x,float) else x) for x in row[:5]])
