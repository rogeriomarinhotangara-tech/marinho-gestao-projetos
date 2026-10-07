from collections import Counter
nd_ = base['Descrição'].map(norm_desc)
J = base[base.Mes>=202607]
# ============================================================ 09 Conciliação Datas
ws = W['09 Conciliação Datas']; title(ws,'Conciliação por datas — competência × caixa, contas bancárias, transferências',
 'Competência = vencimento. Caixa = data de baixa. Seções A–C recalculam com a Base; D–H são a fotografia desta análise (07/10/2026).')
ws.column_dimensions['A'].width=58
for i in range(2,16): ws.column_dimensions[L(i)].width=15
r=4; put(ws,r,1,'A) COMPETÊNCIA × CAIXA POR MÊS',font=FT_T2); r+=1
hdr(ws,r,1,['Linha','Jul/26','Ago/26','Set/26','Total']); r+=1
for i,m in enumerate([202607,202608,202609]): put(ws,r,2+i,m,font=FT_NOTE,fmt='0')
MR=r; r+=1
def blockA(tipo, label):
    global r
    put(ws,r,1,label,font=FT_B,fill=F_SUB); r+=1
    rows=[(f'{label} lançadas no mês (vencimento)',lambda c:f'=SUMIFS(B_VAL,B_TIPO,"{tipo}",B_MES,{c}${MR})'),
          ('   … baixadas no próprio mês',lambda c:f'=SUMIFS(B_VAL,B_TIPO,"{tipo}",B_MES,{c}${MR},B_MESB,{c}${MR})'),
          ('   … baixadas antes do mês do vencimento',lambda c:f'=SUMIFS(B_VAL,B_TIPO,"{tipo}",B_MES,{c}${MR},B_MESB,"<"&{c}${MR})'),
          ('   … baixadas em mês posterior',lambda c:f'=SUMIFS(B_VAL,B_TIPO,"{tipo}",B_MES,{c}${MR},B_MESB,">"&{c}${MR})'),
          ('   … sem data de baixa (em aberto)',lambda c:f'=SUMIFS(B_VAL,B_TIPO,"{tipo}",B_MES,{c}${MR})-SUMIFS(B_VAL,B_TIPO,"{tipo}",B_MES,{c}${MR},B_MESB,">0")')]
    first=r
    for lab,fn in rows:
        put(ws,r,1,lab,border=B_ALL)
        for i in range(3): put(ws,r,2+i,fn(L(2+i)),fmt=NUM,border=B_ALL)
        put(ws,r,5,f'=SUM(B{r}:D{r})',fmt=NUM,border=B_ALL,font=FT_B); r+=1
    put(ws,r,1,'   conferência (soma das partes − lançado)',font=FT_NOTE)
    for i in range(3): c=L(2+i); put(ws,r,2+i,f'=ROUND(SUM({c}{first+1}:{c}{first+4})-{c}{first},2)',fmt=NUM,font=FT_NOTE)
    r+=2
blockA('Receita','Receitas'); blockA('Despesa','Despesas')
put(ws,r,1,'Caixa do mês pela data de baixa (só lançamentos dos exports de jul–set)',font=FT_B,fill=F_SUB); r+=1
for lab,fn in [('Entradas baixadas no mês',lambda c:f'=SUMIFS(B_VAL,B_TIPO,"Receita",B_MESB,{c}${MR},B_MES,">=202607")'),
               ('Saídas baixadas no mês',lambda c:f'=-SUMIFS(B_VAL,B_TIPO,"Despesa",B_MESB,{c}${MR},B_MES,">=202607")'),
               ('   das quais transferências / passagem (fora da DRE)',lambda c:f'=-SUMIFS(B_VAL,B_TIPO,"Despesa",B_MESB,{c}${MR},B_COD,"3*",B_MES,">=202607")')]:
    put(ws,r,1,lab,border=B_ALL)
    for i in range(3): put(ws,r,2+i,fn(L(2+i)),fmt=NUM,border=B_ALL)
    put(ws,r,5,f'=SUM(B{r}:D{r})',fmt=NUM,border=B_ALL,font=FT_B); r+=1
put(ws,r,1,'Variação de caixa registrada no sistema',font=FT_B,fill=F_TOT,border=B_ALL)
for i in range(4): c=L(2+i); put(ws,r,2+i,f'={c}{r-3}+{c}{r-2}',fmt=NUM,font=FT_B,fill=F_TOT,border=B_ALL)
r+=1
put(ws,r,1,'Atenção: o sistema dá baixa em TODAS as parcelas do cartão na data da venda. A entrada real das vendas parceladas segue a agenda da seção G.',font=FT_RED); r+=2
# B) por conta
put(ws,r,1,'B) FLUXO POR CONTA BANCÁRIA (pela data de baixa)',font=FT_T2); r+=1
contas = sorted(set(J['Conta'].dropna()))
hdr(ws,r,1,['Conta','Entradas jul','Saídas jul','Líquido jul','Entradas ago','Saídas ago','Líquido ago','Entradas set','Saídas set','Líquido set']); r+=1
cfirst=r
for cta in contas:
    put(ws,r,1,cta,border=B_ALL)
    for k,m in enumerate([202607,202608,202609]):
        put(ws,r,2+3*k,f'=SUMIFS(B_VAL,B_CTA,$A{r},B_TIPO,"Receita",B_MESB,{m},B_MES,">=202607")',fmt=NUM,border=B_ALL)
        put(ws,r,3+3*k,f'=-SUMIFS(B_VAL,B_CTA,$A{r},B_TIPO,"Despesa",B_MESB,{m},B_MES,">=202607")',fmt=NUM,border=B_ALL)
        put(ws,r,4+3*k,f'={L(2+3*k)}{r}+{L(3+3*k)}{r}',fmt=NUM,border=B_ALL,font=FT_B)
    r+=1
put(ws,r,1,'Total',font=FT_B,fill=F_TOT,border=B_ALL)
for k in range(9): put(ws,r,2+k,f'=SUM({L(2+k)}{cfirst}:{L(2+k)}{r-1})',fmt=NUM,font=FT_B,fill=F_TOT,border=B_ALL)
r+=1
put(ws,r,1,'Só lançamentos dos exports de jul–set (as baixas de jan–jun vêm reprogramadas da análise anterior e não entram aqui).',font=FT_NOTE); r+=1
put(ws,r,1,'"SANTANDER - Centro de Custo Cruzeiro do Sul" e "SANTANDER -CRUZEIRO DO SUL" podem ser a MESMA conta cadastrada duas vezes — confirmar no banco.',font=FT_RED); r+=1
put(ws,r,1,'PAGAMENTO EM ABERTO e PERMUTA não são contas bancárias: são vendas ainda não recebidas ou trocadas por serviço.',font=FT_NOTE); r+=2
# C) diário
put(ws,r,1,'C) MOVIMENTO DIÁRIO POR CONTA (entradas − saídas, pela data de baixa) — para bater com o extrato',font=FT_T2); r+=1
bank = [c for c in contas if c not in ('PAGAMENTO EM ABERTO','PERMUTA')]
hdr(ws,r,1,['Data']+bank+['Total do dia','Acumulado'],None,height=48); r+=1
d0=dt.date(2026,7,1); dmax=max(x for x in J['Data de baixa'] if isinstance(x,dt.date)); dfirst=r
dd=d0
while dd<=dmax:
    put(ws,r,1,dd,fmt=DATE,border=B_ALL)
    for k,cta in enumerate(bank):
        cl=L(2+k); hcell=f'{cl}${dfirst-1}'
        put(ws,r,2+k,f'=SUMIFS(B_VAL,B_BX,$A{r},B_CTA,{hcell},B_TIPO,"Receita",B_MES,">=202607")-SUMIFS(B_VAL,B_BX,$A{r},B_CTA,{hcell},B_TIPO,"Despesa",B_MES,">=202607")',fmt=NUM,border=B_ALL)
    nb=len(bank); put(ws,r,2+nb,f'=SUM(B{r}:{L(1+nb)}{r})',fmt=NUM,border=B_ALL,font=FT_B)
    put(ws,r,3+nb,f'={L(2+nb)}{r}' if r==dfirst else f'={L(3+nb)}{r-1}+{L(2+nb)}{r}',fmt=NUM,border=B_ALL)
    r+=1; dd+=dt.timedelta(days=1)
r+=1
# D) teste de transferências
put(ws,r,1,'D) TESTE DE TRANSFERÊNCIAS ENTRE CONTAS (despesa que é só dinheiro mudando de conta)',font=FT_T2); r+=1
dJ=J[J['R/D']=='Despesa']; rJ=J[J['R/D']=='Receita']
pairs=[]
for _,x in dJ.iterrows():
    if not isinstance(x['Data de baixa'],dt.date): continue
    c=rJ[(rJ.Valor.round(2)==round(x.Valor,2))&(rJ.Conta!=x.Conta)]
    for _,y in c.iterrows():
        if isinstance(y['Data de baixa'],dt.date) and abs((x['Data de baixa']-y['Data de baixa']).days)<=3: pairs.append((x,y))
txt=[f'1. Descrições com "Transferência", saque, suprimento, aplicação/resgate: {int((J["Código"].str.startswith("3.01")).sum())} lançamentos em jul–set (nenhum).',
     f'2. Pares espelho (mesmo valor, contas diferentes, até 3 dias): {len(pairs)} coincidências — TODAS são recebimentos de pacientes identificados (consultas, procedimentos). Nenhuma é transferência.',
     '3. Despesa reclassificada para PASSAGEM: "RETIRADA PARA DESPESAS" R$ 11.000,00 (08/07) — dinheiro enviado para a conta do Dr. Marcos pagar despesas da clínica. Fica fora da DRE até a prestação de contas (seção E).',
     '4. Despesa reclassificada para PESSOAL: "DR MARCOS" R$ 3.000,00 (04/08) com obs. "pagamento do complemento salarial Katiele mês 06".',
     '5. Receita reclassificada: "REEMBOLSO MERCADO LIVRE" R$ 275,92 (17/07) = estorno do MICROSCÓPIO TRICOLOGIA (29/06). Reduz o investimento da tricologia.',
     '6. Saídas pelas contas DINHEIRO são pagas com o dinheiro recebido em espécie (R$ 255,5 mil de entradas em espécie em jul–set). Não há saque bancário lançado.']
for t in txt: put(ws,r,1,t,align=WRAP); ws.merge_cells(start_row=r,start_column=1,end_row=r,end_column=10); ws.row_dimensions[r].height=30; r+=1
hdr(ws,r,1,['Despesa (descrição)','Baixa','Conta da despesa','Valor','Receita que coincide','Baixa','Conta da receita','Conclusão']); r+=1
for x,y in pairs:
    put(ws,r,1,norm_desc(x['Descrição'])[:60],border=B_ALL); put(ws,r,2,x['Data de baixa'],fmt=DATE,border=B_ALL); put(ws,r,3,x['Conta'],border=B_ALL)
    put(ws,r,4,x.Valor,fmt=NUM,border=B_ALL); put(ws,r,5,str(y['Descrição'])[:45],border=B_ALL); put(ws,r,6,y['Data de baixa'],fmt=DATE,border=B_ALL)
    put(ws,r,7,y['Conta'],border=B_ALL); put(ws,r,8,'Pagamento de paciente — não é transferência',border=B_ALL,font=FT_NOTE); r+=1
r+=1
# E) prestação de contas
put(ws,r,1,'E) PRESTAÇÃO DE CONTAS DA "RETIRADA PARA DESPESAS" (R$ 11.000,00 em 08/07, pela conta do Dr. Marcos)',font=FT_T2); r+=1
pm=J[(J['R/D']=='Despesa')&(J['Observações'].astype(str).str.upper().str.contains('CONTA MARCOS|CONTA DO MARCOS'))&(~nd_.loc[J.index].str.startswith('RETIRADA PARA'))]
hdr(ws,r,1,['Despesa paga pela conta do Dr. Marcos','Baixa','Conta registrada no sistema','Valor','Observação']); r+=1; p0=r
for _,x in pm.sort_values('Data de baixa').iterrows():
    put(ws,r,1,norm_desc(x['Descrição']),border=B_ALL); put(ws,r,2,x['Data de baixa'],fmt=DATE,border=B_ALL); put(ws,r,3,x['Conta'],border=B_ALL)
    put(ws,r,4,x.Valor,fmt=NUM,border=B_ALL); put(ws,r,5,x['Observações'],border=B_ALL); r+=1
put(ws,r,1,'Total já identificado',font=FT_B,fill=F_TOT,border=B_ALL); put(ws,r,4,f'=SUM(D{p0}:D{r-1})',fmt=NUM,font=FT_B,fill=F_TOT,border=B_ALL); r+=1
put(ws,r,1,'Saldo da retirada ainda sem comprovação',font=FT_B,border=B_ALL); put(ws,r,4,f'=11000-D{r-1}',fmt=NUM,font=FT_RED,border=B_ALL); r+=1
put(ws,r,1,'Essas despesas estão lançadas em contas da clínica (DINHEIRO RB, Santander), mas foram pagas pela conta pessoal — o saldo dessas contas no sistema não vai bater com o extrato.',font=FT_NOTE); r+=2
# F) julho
put(ws,r,1,'F) JULHO: EXPORT COMPLETO NOVO × BASE ANTERIOR (jan–jul)',font=FT_T2); r+=1
old=pd.read_pickle(SP+'/ref/base_janjul.pkl'); old=old[(old.cod!='')&(old.mv=='2026-07')]
jn=base[base.Mes==202607]
ko=Counter(zip(old.t.map({1:'Receita',0:'Despesa'}),old.v.round(2),old.dv_d)); kn=Counter(zip(jn['R/D'],jn.Valor.round(2),jn['Data de vencimento']))
so=ko-kn; sn=kn-ko
hdr(ws,r,1,['Linha','Base anterior','Export novo','Diferença']); r+=1
for tp in ('Receita','Despesa'):
    a=old[old.t==(1 if tp=='Receita' else 0)].v.sum(); b_=jn[jn['R/D']==tp].Valor.sum()
    put(ws,r,1,f'{tp}s de julho',border=B_ALL); put(ws,r,2,round(a,2),fmt=NUM,border=B_ALL); put(ws,r,3,round(b_,2),fmt=NUM,border=B_ALL); put(ws,r,4,f'=C{r}-B{r}',fmt=NUM,border=B_ALL,font=FT_B); r+=1
put(ws,r,1,'Lançamentos que saíram do sistema depois do export anterior:',font=FT_B); r+=1
for (tp,v,d),n in so.items():
    o=old[(old.t==(1 if tp=='Receita' else 0))&(old.v.round(2)==v)&(old.dv_d==d)].iloc[0]
    put(ws,r,1,f'{tp}: {o.desc[:55]}',border=B_ALL); put(ws,r,2,v*n,fmt=NUM,border=B_ALL); put(ws,r,3,d,fmt=DATE,border=B_ALL); put(ws,r,4,o.cta if isinstance(o.cta,str) else '',border=B_ALL); r+=1
if sn:
    put(ws,r,1,'Lançamentos novos que não estavam no export anterior:',font=FT_B); r+=1
    for (tp,v,d),n in sn.items():
        o=jn[(jn['R/D']==tp)&(jn.Valor.round(2)==v)&(jn['Data de vencimento']==d)].iloc[0]
        put(ws,r,1,f'{tp}: {norm_desc(o["Descrição"])[:55]}',border=B_ALL); put(ws,r,2,v*n,fmt=NUM,border=B_ALL); put(ws,r,3,d,fmt=DATE,border=B_ALL); r+=1
put(ws,r,1,'Leitura: as 3 vendas em "PAGAMENTO EM ABERTO" (R$ 23.351) e 2 despesas sem baixa (PGFN R$ 392,06 e HIDOCTOR R$ 178,00) foram apagadas ou alteradas no sistema. Todo o restante bate linha a linha.',font=FT_NOTE); r+=2
# G) agenda de recebimento
put(ws,r,1,'G) AGENDA ESTIMADA DE RECEBIMENTO DAS VENDAS EM CARTÃO PARCELADO (jul–set) — parcela n cai ~30×n dias após a venda',font=FT_T2); r+=1
cart=J[(J['R/D']=='Receita')&(J['Método'].astype(str).str.upper().str.contains('PARCELADO'))].copy()
pn=cart['Descrição'].str.extract(r'\((\d+)/(\d+)\)\s*$')
cart['n']=pd.to_numeric(pn[0]).fillna(1).astype(int)
def addm(m,k): y,mm=divmod(m,100); t=y*12+mm-1+k; return (t//12)*100+t%12+1
cart['mrec']=[addm(m,n) for m,n in zip(cart.Mes,cart.n)]
ag_all=cart.groupby('mrec').Valor.sum(); ag_tri=cart[cart.Tricologia=='SIM'].groupby('mrec').Valor.sum()
hdr(ws,r,1,['Mês de entrada no caixa','Clínica toda (R$)','Parceria tricologia (R$)','Acumulado parceria']); r+=1; a0=r
for m in sorted(ag_all.index):
    put(ws,r,1,m,fmt='0',border=B_ALL); put(ws,r,2,round(ag_all.get(m,0),2),fmt=NUM,border=B_ALL); put(ws,r,3,round(ag_tri.get(m,0),2),fmt=NUM,border=B_ALL)
    put(ws,r,4,f'=SUM(C${a0}:C{r})',fmt=NUM,border=B_ALL); r+=1
put(ws,r,1,'Total vendido em cartão parcelado',font=FT_B,fill=F_TOT,border=B_ALL); put(ws,r,2,f'=SUM(B{a0}:B{r-1})',fmt=NUM,font=FT_B,fill=F_TOT,border=B_ALL); put(ws,r,3,f'=SUM(C{a0}:C{r-1})',fmt=NUM,font=FT_B,fill=F_TOT,border=B_ALL); r+=1
put(ws,r,1,'Estimativa sem antecipação. O número exato está na agenda da adquirente (Santander/Stone) — usar o extrato de recebíveis para fechar.',font=FT_NOTE); r+=1
AGENDA_TRI={int(k):round(float(v),2) for k,v in ag_tri.items()}
ws.freeze_panes='B4'

# ============================================================ listagens
LCOLS=['Vencimento','Emissão','Baixa','Descrição','Serviço','Categoria (sistema)','Código','Conta analítica','Grupo DRE','Unidade','Tricologia','Método','Conta bancária','Valor (R$)','Alertas','Nota de ajuste']
LW=[11,11,11,46,26,30,12,42,30,15,10,22,34,13,30,40]
def alerts(x):
    a=[]
    if x['Código']=='2.13.01.099': a.append('CARTÃO SEM DETALHE')
    if x['R/D']=='Despesa' and not isinstance(x['Data de baixa'],dt.date): a.append('SEM BAIXA')
    if x['R/D']=='Despesa' and x['Valor']>=5000 and not (isinstance(x['Observações'],str) and x['Observações'].strip()): a.append('≥5 MIL SEM OBS.')
    if str(x['Código']).startswith('2.17'): a.append('JUROS NÃO SEGREGADOS')
    if x['Código'] in ('2.13.01.090','1.01.99.000'): a.append('NÃO CLASSIFICADA')
    if x['Código']=='2.18.01.003': a.append('RETIRADA DE SÓCIO')
    if str(x['Código']).startswith('3.'): a.append('PASSAGEM (FORA DA DRE)')
    return '; '.join(a)
base['Alertas']=base.apply(alerts,axis=1)
for sh,mes,tipo in [('10 Jul Receitas',202607,'Receita'),('11 Jul Despesas',202607,'Despesa'),('12 Ago Receitas',202608,'Receita'),
                    ('13 Ago Despesas',202608,'Despesa'),('14 Set Receitas',202609,'Receita'),('15 Set Despesas',202609,'Despesa')]:
    ws=W[sh]; ml=MLAB[MESES.index(mes)]
    title(ws,f'{"Receitas" if tipo=="Receita" else "Despesas"} de {ml} — classificadas pelo plano de contas oficial','Fonte: export completo do mês. Competência = vencimento. O total respeita o filtro.')
    d=base[(base.Mes==mes)&(base['R/D']==tipo)].sort_values(['Grupo','Código','Data de vencimento'])
    n0=6; n1=n0+len(d)-1
    put(ws,3,13,'TOTAL (filtrado):',font=FT_B); put(ws,3,14,f'=SUBTOTAL(9,N{n0}:N{n1})',fmt=NUM,font=FT_B,fill=F_TOT)
    put(ws,4,13,'Nº de lançamentos:',font=FT_B); put(ws,4,14,f'=SUBTOTAL(3,N{n0}:N{n1})',fmt=NUM0,font=FT_B)
    hdr(ws,5,1,LCOLS,LW); rr=n0
    for _,x in d.iterrows():
        vals=[x['Data de vencimento'],x['Data de emissão'],x['Data de baixa'],x['Descrição'],x['Serviços'],x['Categorias'],x['Código'],x['Conta analítica'],
              x['Grupo'],x['Unidade'],x['Tricologia'],x['Método'],x['Conta'],x['Valor'],x['Alertas'],x['Nota de ajuste']]
        for j,v in enumerate(vals,start=1):
            if v is None or (isinstance(v,float) and v!=v): continue
            if isinstance(v,pd.Timestamp): v=v.date()
            c=ws.cell(rr,j,v); c.font=FT_N
            if j<=3: c.number_format=DATE
            if j==14: c.number_format=NUM
            if j==11 and v=='SIM': c.fill=F_OK; c.font=FT_GRN
            if j in (15,16) and v: c.font=FT_RED
        rr+=1
    ws.auto_filter.ref=f"A5:P{n1}"; ws.freeze_panes='E6'
    put(ws,1,18,'Resumo por grupo DRE',font=FT_T2); hdr(ws,2,18,['Grupo DRE','Valor (R$)','Nº'],[36,14,6],height=20)
    gs=d.groupby('Grupo').Valor.sum().sort_values(ascending=False); rr=3
    for gname in gs.index:
        put(ws,rr,18,gname,border=B_ALL); put(ws,rr,19,f'=SUMIFS($N${n0}:$N${n1},$I${n0}:$I${n1},R{rr})',fmt=NUM,border=B_ALL); put(ws,rr,20,f'=COUNTIF($I${n0}:$I${n1},R{rr})',fmt=NUM0,border=B_ALL); rr+=1
    put(ws,rr,18,'Total',font=FT_B,fill=F_TOT,border=B_ALL); put(ws,rr,19,f'=SUM(S3:S{rr-1})',fmt=NUM,font=FT_B,fill=F_TOT,border=B_ALL)
    put(ws,rr+1,18,'Confere com o total da coluna N?',font=FT_NOTE); put(ws,rr+1,19,f'=IF(ABS(S{rr}-SUM(N{n0}:N{n1}))<0.01,"confere","DIVERGE")',font=FT_NOTE)

# ============================================================ 07 Razão Tricologia
ws=W['07 Razão Tricologia']; title(ws,'Razão da parceria — tudo o que foi marcado como tricologia / Dra. Patrícia',
 'Totais no topo vêm da Base (atualizam ao colar meses novos). Marcação: "TRICOLOGIA"/"CAPILAR"/"PATRICIA" na descrição ou no serviço, Responsável = Patrícia, ou coluna AC da Base.')
for col,w in zip('ABCDEFGHI',[44,14,11,11,50,13,42,34,36]): ws.column_dimensions[col].width=w
hdr(ws,4,1,['Linha da DRE da parceria','Total (R$)','Nº'])
TL=['R1 Consultas','R2 Procedimentos de tricologia','R3 Facial e corporal (Dra. Patrícia)','T2 Reembolsos a pacientes','C1 Insumos e ativos','D1 Viagens e deslocamento',
    'D2 Marketing da tricologia','D3 Outras despesas diretas','X1 Equipamentos (CAPEX)','X2 Consultoria de implantação']
r=5
for t in TL: put(ws,r,1,t,border=B_ALL); put(ws,r,2,f'=SUMIFS(B_VAL,B_TLIN,A{r})',fmt=NUM,border=B_ALL); put(ws,r,3,f'=COUNTIF(B_TLIN,A{r})',fmt=NUM0,border=B_ALL); r+=1
put(ws,r,1,'X1 inclui o estorno do microscópio (receita de R$ 275,92) somado — o líquido está na aba 06.',font=FT_NOTE); r+=2
hdr(ws,r,1,['Linha','Valor (R$)','Vencimento','Baixa','Descrição','Código','Conta analítica','Serviço','Conta bancária']); r+=1
for _,x in base[base.Tricologia=='SIM'].sort_values(['Linha trico','Data de vencimento']).iterrows():
    vals=[x['Linha trico'],x['Valor'],x['Data de vencimento'],x['Data de baixa'],x['Descrição'],x['Código'],x['Conta analítica'],x['Serviços'],x['Conta']]
    for j,v in enumerate(vals,start=1):
        if v is None or (isinstance(v,float) and v!=v): continue
        c=put(ws,r,j,v,border=B_ALL)
        if j==2: c.number_format=NUM
        if j in (3,4): c.number_format=DATE
    r+=1
ws.freeze_panes='A5'
exec(open(sys.argv[2]+'/build2_part_d.py',encoding='utf-8').read())
