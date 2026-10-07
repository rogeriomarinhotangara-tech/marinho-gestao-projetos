# ============================================================ 04 Rateio Estrutura
ws = W['04 Rateio Estrutura']; title(ws,'Rateio da estrutura — quanto da despesa fixa da clínica a tricologia usa',
 'Base de estrutura = despesas compartilhadas que existem para qualquer serviço funcionar (sala, recepção, energia, sistema, limpeza, contabilidade). Período de referência na aba 02.')
ws.column_dimensions['A'].width=13; ws.column_dimensions['B'].width=46; ws.column_dimensions['C'].width=32
for i in range(9): ws.column_dimensions[L(4+i)].width=12
ws.column_dimensions['M'].width=16
hdr(ws,4,1,['Código','Conta analítica','Grupo DRE']+MLAB+['Média do período (aba 02)'])
put(ws,5,1,'competência →',font=FT_NOTE)
for i,m in enumerate(MESES): put(ws,5,4+i,m,font=FT_NOTE,fmt='0')
est_codes = sorted(set(base.loc[base.Estrutura=='SIM','Código']))
r=6
for c in est_codes:
    put(ws,r,1,c,border=B_ALL); put(ws,r,2,f'=VLOOKUP($A{r},PC_TAB,2,0)',border=B_ALL); put(ws,r,3,f'=VLOOKUP($A{r},PC_TAB,3,0)',border=B_ALL)
    for i in range(9): put(ws,r,4+i,f'=SUMIFS(B_VAL,B_COD,$A{r},B_MES,{L(4+i)}$5,B_EST,"SIM")',fmt=NUM,border=B_ALL)
    put(ws,r,13,f'=IFERROR(AVERAGEIFS(D{r}:L{r},$D$5:$L$5,">="&P_EST_INI,$D$5:$L$5,"<="&P_EST_FIM),0)',fmt=NUM,border=B_ALL,font=FT_B); r+=1
put(ws,r,1,'—',border=B_ALL); put(ws,r,2,'Outras contas de estrutura (lançamentos novos)',border=B_ALL,font=FT_NOTE)
for i in range(9): put(ws,r,4+i,f'=SUMIFS(B_VAL,B_EST,"SIM",B_MES,{L(4+i)}$5)-SUM({L(4+i)}6:{L(4+i)}{r-1})',fmt=NUM,border=B_ALL)
put(ws,r,13,f'=IFERROR(AVERAGEIFS(D{r}:L{r},$D$5:$L$5,">="&P_EST_INI,$D$5:$L$5,"<="&P_EST_FIM),0)',fmt=NUM,border=B_ALL)
EST_LAST=r; R_TOT=r+2; R_REC=R_TOT+1; R_PCT=R_TOT+2; R_A=R_TOT+3
put(ws,R_TOT,2,'(=) Despesa fixa compartilhada (base de estrutura)',font=FT_B,fill=F_TOT,border=B_ALL)
for i in range(9): put(ws,R_TOT,4+i,f'=SUM({L(4+i)}6:{L(4+i)}{EST_LAST})',fmt=NUM,font=FT_B,fill=F_TOT,border=B_ALL)
put(ws,R_TOT,13,f'=IFERROR(AVERAGEIFS(D{R_TOT}:L{R_TOT},$D$5:$L$5,">="&P_EST_INI,$D$5:$L$5,"<="&P_EST_FIM),0)',fmt=NUM,font=FT_B,fill=F_TOT,border=B_ALL)
put(ws,R_REC,2,'Receita operacional bruta da clínica',border=B_ALL)
for i in range(9): put(ws,R_REC,4+i,f'=SUMIFS(B_VAL,B_GRP,"Receita Operacional Bruta",B_MES,{L(4+i)}$5,B_TIPO,"Receita")',fmt=NUM,border=B_ALL)
put(ws,R_REC,13,f'=IFERROR(AVERAGEIFS(D{R_REC}:L{R_REC},$D$5:$L$5,">="&P_EST_INI,$D$5:$L$5,"<="&P_EST_FIM),0)',fmt=NUM,border=B_ALL,font=FT_B)
put(ws,R_PCT,2,'Estrutura ÷ receita (%)',border=B_ALL)
for i in range(10): put(ws,R_PCT,4+i,f'=IFERROR({L(4+i)}{R_TOT}/{L(4+i)}{R_REC},0)',fmt=PCT,border=B_ALL)
put(ws,R_A,2,'MÉTODO A — taxa de estrutura (% do faturamento da tricologia)',font=FT_B,fill=F_OK,border=B_ALL)
put(ws,R_A,13,f'=IFERROR(M{R_TOT}/M{R_REC},0)',fmt=PCT,font=FT_GRN,fill=F_OK,border=B_ALL)
put(ws,R_A+1,2,'A cada R$ 100 faturados, a clínica gasta este valor com a estrutura compartilhada. A tricologia paga a mesma proporção sobre o faturamento dela.',font=FT_NOTE)
RB_=R_A+3
put(ws,RB_,2,'MÉTODO B — diária de sala',font=FT_T2)
put(ws,RB_+1,2,'Salas de atendimento (aba 02: RB = 7 pelo levantamento estrutural; CZS e Epitaciolândia a informar)',border=B_ALL); put(ws,RB_+1,13,'=P_SALAS',fmt=NUM0,border=B_ALL)
put(ws,RB_+2,2,'Dias úteis por mês (aba 02)',border=B_ALL); put(ws,RB_+2,13,'=P_DIAS',fmt=NUM0,border=B_ALL)
put(ws,RB_+3,2,'Diária de 1 sala (R$) = despesa fixa média ÷ (salas × dias)',font=FT_B,fill=F_OK,border=B_ALL)
put(ws,RB_+3,13,f'=IFERROR(M{R_TOT}/(P_SALAS*P_DIAS),0)',fmt=NUM,font=FT_GRN,fill=F_OK,border=B_ALL)
put(ws,RB_+4,2,'Atenção: enquanto CZS e Epitaciolândia não tiverem as salas informadas, a diária fica superestimada (toda a estrutura dividida só pelas 7 salas de Rio Branco).',font=FT_NOTE)
RT=RB_+6
put(ws,RT,2,'O QUE ENTRA E O QUE NÃO ENTRA NA BASE DE ESTRUTURA (média mensal do período)',font=FT_T2)
hdr(ws,RT+1,2,['Grupo de despesa','Média mensal total','Entra na estrutura','Fica de fora','Motivo'])
ws.column_dimensions['F'].width=14
GRP_MOT=[('Deduções da Receita','A tricologia paga os próprios impostos (aba 02).'),
 ('Custos Diretos','Medicamentos, implantes, comissões e honorários de outros serviços. A tricologia paga só os insumos dela.'),
 ('Pessoal','Entra equipe de apoio (salários, encargos, benefícios). Fora: pró-labore, bônus, cursos, rescisões.'),
 ('Comercial e Relacionamento','Entra CRM, WhatsApp e agendamento. Fora: ações comerciais de outros serviços.'),
 ('Marketing','Marketing institucional não é rateado. Campanha da tricologia entra 100% nela.'),
 ('Ocupação e Infraestrutura','Entra tudo: aluguel, energia, internet, limpeza, segurança, reparos.'),
 ('Equipamentos e Compliance Clínico','Entra resíduos, esterilização e biossegurança. Fora: manutenção de aparelhos de outros serviços.'),
 ('Tecnologia','Entra tudo: sistema, certificado digital, informática.'),
 ('Administrativo e Profissionais','Entra contabilidade, jurídico, escritório, copa. Fora: consultorias/mentorias de gestão, fretes, viagens, veículos.'),
 ('Taxas e Obrigações Regulatórias','Entra alvarás e taxas. Fora: multas.'),
 ('Rateios e Overhead Compartilhado','Royalties de franquia de outro procedimento. Fora.'),
 ('Despesas sem identificação','Fatura de cartão sem detalhamento. Fora — não se cobra do parceiro o que não tem comprovante.'),
 ('Despesas Financeiras','Entra tarifas bancárias e maquineta. Fora: IOF e juros.'),
 ('Tributos sobre Lucro','A tricologia paga o IRPJ/CSLL dela (aba 02).')]
r=RT+2; G0=r
NM='COUNTIFS($D$5:$L$5,">="&P_EST_INI,$D$5:$L$5,"<="&P_EST_FIM)'
for g,mot in GRP_MOT:
    put(ws,r,2,g,border=B_ALL)
    put(ws,r,3,f'=IFERROR(SUMIFS(B_VAL,B_GRP,$B{r},B_TIPO,"Despesa",B_MES,">="&P_EST_INI,B_MES,"<="&P_EST_FIM)/{NM},0)',fmt=NUM,border=B_ALL)
    put(ws,r,4,f'=IFERROR(SUMIFS(B_VAL,B_GRP,$B{r},B_TIPO,"Despesa",B_MES,">="&P_EST_INI,B_MES,"<="&P_EST_FIM,B_EST,"SIM")/{NM},0)',fmt=NUM,border=B_ALL)
    put(ws,r,5,f'=C{r}-D{r}',fmt=NUM,border=B_ALL); put(ws,r,6,mot,font=FT_NOTE,align=WRAP)
    ws.merge_cells(start_row=r,start_column=6,end_row=r,end_column=13); ws.row_dimensions[r].height=28; r+=1
put(ws,r,2,'Total',font=FT_B,fill=F_TOT,border=B_ALL)
for c in (3,4,5): put(ws,r,c,f'=SUM({L(c)}{G0}:{L(c)}{r-1})',fmt=NUM,font=FT_B,fill=F_TOT,border=B_ALL)
put(ws,r+1,2,'Conferência: "Entra na estrutura" = média da linha de total acima',font=FT_NOTE); put(ws,r+1,4,f'=IF(ABS(D{r}-M{R_TOT})<0.01,"confere","DIVERGE")',font=FT_NOTE)
ws.freeze_panes='D6'
RATEIO_PCT=f"{q('04 Rateio Estrutura')}!$M${R_A}"; RATEIO_DIA=f"{q('04 Rateio Estrutura')}!$M${RB_+3}"; RATEIO_TOT=f"{q('04 Rateio Estrutura')}!$M${R_TOT}"; RATEIO_REC=f"{q('04 Rateio Estrutura')}!$M${R_REC}"

# ============================================================ 02 Premissas
ws = W['02 Premissas']; title(ws,'Premissas do modelo (células amarelas são editáveis)','Mudou uma célula amarela, todas as abas recalculam.')
for col,w in zip('ABCDE',[64,16,16,16,84]): ws.column_dimensions[col].width=w
def sec(r,t): put(ws,r,1,t,font=FT_T2)
def par(r,label,val,fmt,nm,note='',is_input=True):
    put(ws,r,1,label,border=B_ALL)
    (inp(ws,r,2,val,fmt) if is_input else put(ws,r,2,val,fmt=fmt,border=B_ALL,font=FT_B))
    put(ws,r,5,note,font=FT_NOTE,align=WRAP); name(nm,f"{q('02 Premissas')}!$B${r}")
sec(4,'Tributos e taxas sobre a receita da parceria')
par(5,'PIS (cumulativo, Lucro Presumido)',0.0065,PCT2,'P_PIS','Alíquota legal.')
par(6,'COFINS (cumulativo, Lucro Presumido)',0.03,PCT2,'P_COFINS','Alíquota legal.')
par(7,'ISS sobre o faturamento',0.0,PCT2,'P_ISS','0%: a base só tem "TAXA ANUAL ISS" (ISS fixo) e nenhum ISS mensal em 9 meses. CONFIRMAR com a contabilidade.')
par(8,'Taxas de cartão e antecipação (média sobre a receita)',0.022,PCT2,'P_CARTAO','Média histórica jan–jul/26: R$ 60,2 mil de deságio/MDR/POS ÷ R$ 2,72 mi. Atenção: 63,5% da tricologia de agosto foi cartão parcelado em até 12x — a taxa real tende a ser maior. Conferir no extrato da adquirente.')
par(9,'IRPJ + CSLL presumidos — consultas',0.0768,PCT2,'P_IRCS_C','32% × 15% + 32% × 9%. Consulta não tem equiparação hospitalar.')
par(10,'IRPJ + CSLL presumidos — procedimentos',0.0228,PCT2,'P_IRCS_P','8% × 15% + 12% × 9%. Alíquota efetiva paga no 1º tri/26: 1,95% (indica equiparação hospitalar). CONFIRMAR com a contabilidade.')
sec(12,'Partilha do resultado')
par(13,'Participação da Clínica Núcleo',0.5,PCT,'P_CLI','Acordo: 50% / 50% do resultado líquido.')
par(14,'Participação da Dra. Patrícia',"=1-P_CLI",PCT,'P_PAT','Calculado.',is_input=False)
par(15,'Procedimentos FACIAL e CORPORAL da Dra. Patrícia entram na parceria? (SIM/NÃO)','SIM',None,'P_FC','Em agosto foram R$ 61,2 mil (39% da receita da parceria). Se entrarem, os produtos usados neles também precisam entrar — hoje não há compra identificada para eles.')
sec(17,'Taxa de estrutura (parte da despesa fixa da clínica usada pela parceria)')
par(18,'Método (A = % do faturamento | B = diária de sala)','A',None,'P_MET','A: paga o mesmo % do faturamento que a estrutura custa para a clínica. B: paga a diária da sala nos dias de atendimento.')
par(19,'Período de referência — início (AAAAMM)',202607,'0','P_EST_INI','Padrão: jul–set/2026 (estrutura atual, 3 meses dos exports completos). Jan–set dá 18,0%; jan–jun dá 17,7%.')
par(20,'Período de referência — fim (AAAAMM)',202609,'0','P_EST_FIM','')
par(21,'Taxa de estrutura — método A (% do faturamento)','='+RATEIO_PCT,PCT,'P_PCTA','Aba 04.',is_input=False)
par(22,'Salas de atendimento — Rio Branco',7,NUM0,'P_SALAS_RB','Levantamento estrutural (Drive, 12/07/2026): 4 consultórios + 2 salas de procedimento + soroterapia.')
par(23,'Salas de atendimento — Cruzeiro do Sul',None,NUM0,'P_SALAS_CZS','PREENCHER.')
par(24,'Salas de atendimento — Epitaciolândia',None,NUM0,'P_SALAS_EPI','PREENCHER.')
par(25,'Total de salas','=SUM(B22:B24)',NUM0,'P_SALAS','',is_input=False)
par(26,'Dias úteis de atendimento por mês',22,NUM0,'P_DIAS','')
par(27,'Salas ocupadas pela parceria nos dias de atendimento',1,NUM0,'P_SALAS_TRI','')
par(28,'Diária de sala — método B (R$ por sala por dia)','='+RATEIO_DIA,NUM,'P_DIARIA','Aba 04.',is_input=False)
for cell,f in (('B18','"A,B"'),('B15','"SIM,NÃO"')):
    dv=DataValidation(type='list',formula1=f,allow_blank=False); ws.add_data_validation(dv); dv.add(cell)
sec(30,'Investimento de implantação (equipamentos + consultoria)')
par(31,'Amortizar o investimento dentro da DRE da parceria? (SIM/NÃO)','SIM',None,'P_AM_SW','SIM: a clínica recupera o investimento em parcelas antes da partilha (as duas partes arcam). NÃO: a clínica absorve e recupera só pelos 50% dela.')
dv=DataValidation(type='list',formula1='"SIM,NÃO"',allow_blank=False); ws.add_data_validation(dv); dv.add('B31')
par(32,'Prazo de amortização (meses)',24,NUM0,'P_AM_PRAZO','')
par(33,'Mês de início da amortização (AAAAMM)',202608,'0','P_AM_INI','Primeiro mês de atendimento da Dra. Patrícia (11/08/2026).')
par(34,'Parcelas contratadas ainda não pagas (R$)',5714.28,NUM,'P_PARC_FUT','7ª parcela da CONSULTORIA TRICOLOGIA (out/26): 7 × R$ 5.714,28 = R$ 40.000.')
par(35,'Investimento total de implantação (R$)',f"={q('06 Investimento Tricologia')}!$D$10",NUM,'P_INV','Aba 06.',is_input=False)
par(36,'Amortização mensal (R$)','=IF(P_AM_SW="SIM",P_INV/P_AM_PRAZO,0)',NUM,'P_AM_MES','',is_input=False)
sec(38,'Cenário — simulação livre de um mês (não é previsão; os números reais estão nas colunas de jul a set da aba 03)')
hdr(ws,39,1,['Serviço','Qtd no mês','Preço (R$)','Receita (R$)'])
sims=[('Consulta de tricologia',10,400,'S_CONS','Preço real praticado (R$ 400; algumas consultas a R$ 800).'),
 ('Eletroporação capilar (sessão)',24,450,'S_EC','Preço A DEFINIR. Referência de mercado para procedimento comparável (microagulhamento capilar): R$ 250–700/sessão.'),
 ('Fototerapia capilar — cascata de LED (sessão)',16,200,'S_FT','Preço A DEFINIR. Referência de mercado LED capilar: R$ 150–400/sessão.'),
 ('Eletroporação de barba (sessão)',8,400,'S_EB','Preço A DEFINIR.')]
for i,(lab,qt,pr,nm,note) in enumerate(sims):
    r=40+i; put(ws,r,1,lab,border=B_ALL); inp(ws,r,2,qt,NUM0); inp(ws,r,3,pr,NUM); put(ws,r,4,f'=B{r}*C{r}',fmt=NUM,border=B_ALL); put(ws,r,5,note,font=FT_NOTE,align=WRAP)
    name(nm+'_Q',f"{q('02 Premissas')}!$B${r}"); name(nm+'_P',f"{q('02 Premissas')}!$C${r}")
put(ws,44,1,'Total',font=FT_B,fill=F_TOT,border=B_ALL); put(ws,44,2,'=SUM(B40:B43)',fmt=NUM0,font=FT_B,fill=F_TOT,border=B_ALL); put(ws,44,4,'=SUM(D40:D43)',fmt=NUM,font=FT_B,fill=F_TOT,border=B_ALL)
name('S_REC',f"{q('02 Premissas')}!$D$44")
par(45,'Viagens da Dra. Patrícia no mês (R$)',2500,NUM,'S_VIAG','Real de agosto: R$ 1.240 de hotel e refeições (passagem não identificada — pode estar na fatura do cartão). Ajustar.')
par(46,'Marketing específico no mês (R$)',0,NUM,'S_MKT','')
par(47,'Dias de atendimento no mês',4,NUM0,'S_DIAS','Usado só no método B.')
par(48,'Insumos como % do preço (enquanto a ficha técnica não tiver os preços das NFs)',0.20,PCT,'S_INS','Com a aba 05 completa, o modelo usa o custo da ficha.')
ws.freeze_panes='A4'

# ============================================================ 05 Custo Procedimento (igual à v1, contas oficiais)
ws = W['05 Custo Procedimento']; title(ws,'Custo por procedimento — fichas técnicas da tricologia',
 'Fonte: folha "Procedimentos de Tricologia". Ativos: PREENCHER com o preço da NF. Insumos comuns: estimativa de mercado (substituir pela NF).')
for i,w in enumerate([36,10,11,9,16,14,14,14,15,14,58],start=1): ws.column_dimensions[L(i)].width=w
A2='Ativo'; I2='Insumo'
PROCS=[('ELETROPORAÇÃO CAPILAR','Aparelho: Eletroporação','EC',[('Hair cocktail',A2,2,'mL',None,None,'2.02.01.005','Faixa 0–2 mL; usando o máximo (custo-teto).'),
  ('Densi hair',A2,2,'mL',None,None,'2.02.01.005','Faixa 0–2 mL; máximo.'),('Exossomos',A2,2,'mL',None,None,'2.02.01.005','Faixa 0–2 mL; máximo.'),
  ('Lumicen',A2,2,'mL',None,None,'2.02.01.005','Faixa 0–2 mL; máximo.'),('A-OX',A2,2,'mL',None,None,'2.02.01.005','Faixa 0–2 mL; máximo.'),
  ('Luvas de procedimento P (par)',I2,1,'par',45,50,'2.02.02.003','Estimativa: caixa 100 luvas (50 pares) R$ 45. Rasura no "1" da ficha — confirmar.'),
  ('Seringa 5 mL',I2,5,'un',55,100,'2.02.02.001','Ficha: "3 mL ou 5 mL". Estimativa: caixa 100 un R$ 55.'),
  ('Pente',I2,1,'un',None,None,'2.02.02.007','Compra real: PENTES TRICOLOGIA R$ 27,06 (08/08) — informar quantos vieram.'),
  ('Gaze (unidade)',I2,4,'un',2.5,10,'2.02.02.004','"4 gases (pode gastar ou não)" — usando 4. Estimativa: envelope 10 un R$ 2,50.')]),
 ('FOTOTERAPIA CAPILAR','Aparelho: Cascata de LED','FT',[('Minoxidil',A2,1,'mL',None,None,'2.02.01.005','1 mL.'),('Dutasterida',A2,1,'mL',None,None,'2.02.01.005','1 mL.'),
  ('Clobetasol',A2,20,'gota',None,None,'2.02.01.005','Faixa 2–20 gotas; máximo. Informar gotas por frasco.'),
  ('Luvas de procedimento P (par)',I2,1,'par',45,50,'2.02.02.003','Estimativa.'),('Seringa 5 mL',I2,2,'un',55,100,'2.02.02.001','"2 seringas" com rasura no "2" — CONFIRMAR.'),
  ('Pente',I2,1,'un',None,None,'2.02.02.007','Ver acima.'),('Gaze (unidade)',I2,4,'un',2.5,10,'2.02.02.004','Estimativa.')]),
 ('ELETROPORAÇÃO DE BARBA','Aparelho: Eletroporação','EB',[('Densi hair',A2,2,'mL',None,None,'2.02.01.005','Faixa 0–2 mL; máximo.'),
  ('Exossomos',A2,2,'mL',None,None,'2.02.01.005','Faixa 0–2 mL; máximo.'),('Lumicen',A2,2,'mL',None,None,'2.02.01.005','Faixa 0–2 mL; máximo.'),
  ('A-OX',A2,2,'mL',None,None,'2.02.01.005','Faixa 0–2 mL; máximo.'),('Minoxidil',A2,1,'mL',None,None,'2.02.01.005','1 mL.'),
  ('Luvas de procedimento P (par)',I2,1,'par',45,50,'2.02.02.003','Estimativa.'),('Seringa 5 mL',I2,5,'un',55,100,'2.02.02.001','Estimativa.'),
  ('Pente',I2,1,'un',None,None,'2.02.02.007','Ver acima.'),('Gaze (unidade)',I2,4,'un',2.5,10,'2.02.02.004','Estimativa.')])]
r=4
for pname,ap,code,items in PROCS:
    put(ws,r,1,pname,font=FT_T2); put(ws,r,3,ap,font=FT_NOTE); r+=1
    hdr(ws,r,1,['Item','Tipo','Qtd por sessão','Unid.','Preço da embalagem (NF) R$','Qtd na embalagem','Custo unitário R$','Custo por sessão R$','Status','Conta do plano','Observação']); r+=1; first=r
    for it,tp,qt,un,pr,qe,cta,obs in items:
        put(ws,r,1,it,border=B_ALL); put(ws,r,2,tp,border=B_ALL); inp(ws,r,3,qt,'0.0'); put(ws,r,4,un,border=B_ALL); inp(ws,r,5,pr,NUM); inp(ws,r,6,qe,'#,##0.0')
        put(ws,r,7,f'=IF(OR(E{r}="",F{r}="",F{r}=0),0,E{r}/F{r})',fmt='#,##0.0000',border=B_ALL); put(ws,r,8,f'=C{r}*G{r}',fmt=NUM,border=B_ALL)
        put(ws,r,9,f'=IF(OR(E{r}="",F{r}=""),"PREENCHER NF",IF(B{r}="Insumo","ESTIMATIVA","OK"))',border=B_ALL); put(ws,r,10,cta,border=B_ALL); put(ws,r,11,obs,font=FT_NOTE,align=WRAP); r+=1
    last=r-1
    put(ws,r,1,'Custo de insumos e ativos por sessão',font=FT_B,fill=F_TOT,border=B_ALL); put(ws,r,8,f'=SUM(H{first}:H{last})',fmt=NUM,font=FT_B,fill=F_TOT,border=B_ALL)
    put(ws,r,9,f'=IF(COUNTIF(I{first}:I{last},"PREENCHER NF")>0,"INCOMPLETO","OK")',font=FT_B,fill=F_TOT,border=B_ALL)
    name(f'F_{code}_C',f"{q('05 Custo Procedimento')}!$H${r}"); name(f'F_{code}_OK',f"{q('05 Custo Procedimento')}!$I${r}"); r+=3
put(ws,r,1,'PRECIFICAÇÃO — "Definir preço"',font=FT_T2); r+=1
put(ws,r,1,'Preço mínimo cobre insumos, equipamento, impostos, cartão, IRPJ/CSLL e taxa de estrutura. O sugerido acrescenta a margem-alvo. Só calcula com a ficha completa (status OK).',font=FT_NOTE); r+=1
put(ws,r,1,'Vida útil gerencial dos equipamentos da tricologia (meses)',border=B_ALL); inp(ws,r,3,60,NUM0); name('F_VIDA',f"{q('05 Custo Procedimento')}!$C${r}"); r+=1
put(ws,r,1,'Margem-alvo sobre o preço (resultado antes da partilha)',border=B_ALL); inp(ws,r,3,0.30,PCT); name('F_MARG',f"{q('05 Custo Procedimento')}!$C${r}"); r+=2
hdr(ws,r,1,['Componente','','Eletroporação capilar','','Fototerapia capilar','','Eletroporação de barba']); r+=1
colmap={'EC':3,'FT':5,'EB':7}; start=r
rows_p=[('Insumos e ativos por sessão (ficha)',lambda c:f'=F_{c}_C',NUM),
 ('Equipamento por sessão (CAPEX ÷ vida útil ÷ sessões do cenário)',lambda c:f"=IFERROR({q('06 Investimento Tricologia')}!$D$5/F_VIDA/(S_EC_Q+S_FT_Q+S_EB_Q),0)",NUM),
 ('Custo direto por sessão',None,NUM),('Deduções sobre o preço (PIS, COFINS, ISS, cartão, IRPJ/CSLL)',lambda c:'=P_PIS+P_COFINS+P_ISS+P_CARTAO+P_IRCS_P',PCT),
 ('Taxa de estrutura (método A)',lambda c:'=IF(P_MET="A",P_PCTA,0)',PCT),('Preço mínimo (resultado zero)',None,NUM),('Preço sugerido com margem-alvo',None,NUM),
 ('Preço do cenário (aba 02)',lambda c:f'=S_{c}_P',NUM),('Resultado por sessão no preço do cenário (antes da partilha)',None,NUM),('Margem no preço do cenário',None,PCT),
 ('Status da ficha',lambda c:f'=F_{c}_OK',None)]
for i,(lab,fn,fmt) in enumerate(rows_p):
    rr=start+i; put(ws,rr,1,lab,border=B_ALL,font=FT_B if lab.startswith('Preço') else FT_N)
    for c in ('EC','FT','EB'):
        col=colmap[c]; CL=L(col); ok=f'{CL}{start+10}<>"OK"'
        if fn: v=fn(c)
        elif lab.startswith('Custo direto'): v=f'={CL}{start}+{CL}{start+1}'
        elif lab.startswith('Preço mínimo'): v=f'=IF({ok},"preencher NF",IFERROR({CL}{start+2}/(1-{CL}{start+3}-{CL}{start+4}),0))'
        elif lab.startswith('Preço sugerido'): v=f'=IF({ok},"preencher NF",IFERROR({CL}{start+2}/(1-{CL}{start+3}-{CL}{start+4}-F_MARG),0))'
        elif lab.startswith('Resultado por'): v=f'=IF({ok},"preencher NF",{CL}{start+7}*(1-{CL}{start+3}-{CL}{start+4})-{CL}{start+2})'
        else: v=f'=IF({ok},"preencher NF",IFERROR({CL}{start+8}/{CL}{start+7},0))'
        put(ws,rr,col,v,fmt=fmt,border=B_ALL)
r=start+len(rows_p)+1
put(ws,r,1,'Anotação "10x7" na folha: possivelmente protocolo de 10 sessões a cada 7 dias — confirmar; se for, precificar também o pacote. Agosto já mostra vendas de pacotes de tricologia em 12x (R$ 5.000 a R$ 11.200).',font=FT_NOTE); r+=1
put(ws,r,1,'Referências de mercado (2025–26): LED capilar R$ 150–400/sessão; microagulhamento capilar R$ 250–700/sessão (Catraca Livre). Não há preço público para eletroporação capilar.',font=FT_NOTE)

# ============================================================ 06 Investimento Tricologia
ws = W['06 Investimento Tricologia']; title(ws,'Investimento de implantação da tricologia',
 'Equipamentos (CAPEX) e consultoria de implantação. Fica fora da DRE mensal; volta para a clínica pela amortização (aba 03), se aprovado.')
for col,w in zip('ABCDEFG',[16,50,30,16,16,36,34]): ws.column_dimensions[col].width=w
put(ws,4,1,'Resumo',font=FT_T2)
rowsR=[(5,'Equipamentos (CAPEX) pagos, líquidos de estornos','=SUMIFS(B_VAL,B_TLIN,"X1 Equipamentos (CAPEX)",B_TIPO,"Despesa")-SUMIFS(B_VAL,B_TLIN,"X1 Equipamentos (CAPEX)",B_TIPO,"Receita")'),
 (6,'   dos quais: estorno do microscópio (Mercado Livre, 17/07)','=-SUMIFS(B_VAL,B_TLIN,"X1 Equipamentos (CAPEX)",B_TIPO,"Receita")'),
 (7,'Consultoria de implantação paga (abr–set)','=SUMIFS(B_VAL,B_TLIN,"X2 Consultoria de implantação")'),
 (8,'Parcelas contratadas a pagar (out/26)','=P_PARC_FUT'),
 (9,'(informativo) Material de tricologia de julho — entra na DRE como insumo, não aqui','=SUMIFS(B_VAL,B_TLIN,"C1 Insumos e ativos",B_MES,202607)'),
 (10,'INVESTIMENTO TOTAL DE IMPLANTAÇÃO','=D5+D7+D8'),(11,'Amortização mensal na DRE da parceria','=P_AM_MES'),
 (12,'Parte arcada pela Dra. Patrícia via partilha (se amortizar)','=IF(P_AM_SW="SIM",D10*P_PAT,0)'),(13,'Parte arcada pela clínica','=D10-D12')]
for rr,lab,f in rowsR:
    tot = rr==10
    put(ws,rr,2,lab,border=B_ALL,font=FT_B if tot else (FT_NOTE if rr in (6,9) else FT_N),fill=F_TOT if tot else None)
    put(ws,rr,4,f,fmt=NUM,border=B_ALL,font=FT_B if tot else FT_N,fill=F_TOT if tot else None)
put(ws,15,1,'Lançamentos que compõem o investimento',font=FT_T2)
hdr(ws,16,1,['Vencimento','Descrição','Tipo','Valor (R$)','Data de baixa','Conta bancária','Origem'])
inv=base[base['Linha trico'].isin(['X1 Equipamentos (CAPEX)','X2 Consultoria de implantação'])].sort_values('Data de vencimento'); r=17
for _,x in inv.iterrows():
    sign=-1 if x['R/D']=='Receita' else 1
    put(ws,r,1,x['Data de vencimento'],fmt=DATE,border=B_ALL); put(ws,r,2,x['Descrição'],border=B_ALL)
    put(ws,r,3,('Estorno de equipamento' if sign<0 else ('Equipamento (CAPEX)' if x['Linha trico'].startswith('X1') else 'Consultoria de implantação')),border=B_ALL)
    put(ws,r,4,sign*x['Valor'],fmt=NUM,border=B_ALL); put(ws,r,5,x['Data de baixa'],fmt=DATE,border=B_ALL); put(ws,r,6,x['Conta'],border=B_ALL); put(ws,r,7,x['Origem'],border=B_ALL); r+=1
put(ws,r,2,'Parcela 7/7 CONSULTORIA TRICOLOGIA (contratada, a vencer out/26)',border=B_ALL,font=FT_NOTE); put(ws,r,4,'=P_PARC_FUT',fmt=NUM,border=B_ALL); r+=1
put(ws,r,2,'Total',font=FT_B,fill=F_TOT,border=B_ALL); put(ws,r,4,f'=SUM(D17:D{r-1})',fmt=NUM,font=FT_B,fill=F_TOT,border=B_ALL)
put(ws,r,5,f'=IF(ABS(D{r}-D10)<0.01,"confere com o resumo","DIVERGE")',font=FT_NOTE); r+=2
put(ws,r,1,'Cronograma de recuperação (amortização mensal)',font=FT_T2); r+=1
hdr(ws,r,1,['Mês nº','Competência (AAAAMM)','','Amortização (R$)','Saldo a recuperar (R$)']); r+=1; s0=r
for n in range(1,37):
    put(ws,r,1,n,border=B_ALL)
    put(ws,r,2,f'=(INT(P_AM_INI/100)+INT((MOD(P_AM_INI,100)-1+{n-1})/12))*100+MOD(MOD(P_AM_INI,100)-1+{n-1},12)+1',fmt='0',border=B_ALL)
    put(ws,r,4,f'=IF({n}<=P_AM_PRAZO,P_AM_MES,0)',fmt=NUM,border=B_ALL)
    put(ws,r,5,f'=MAX(0,$D$10*(P_AM_SW="SIM")-SUM($D${s0}:D{r}))',fmt=NUM,border=B_ALL); r+=1

# ============================================================ 03 DRE Tricologia
ws = W['03 DRE Tricologia']; title(ws,'DRE da Tricologia — parceria Clínica Núcleo × Dra. Patrícia Fabrini',
 'Resultado líquido dividido 50/50 depois de impostos, insumos, despesas diretas, taxa de estrutura e amortização do investimento. Números reais de jul a set/2026.')
for col,w in zip('ABCDEFGH',[60,15,15,15,17,19,12,70]): ws.column_dimensions[col].width=w
hdr(ws,4,1,['Linha','Jul/26','Ago/26','Set/26','Acumulado jul–set','Cenário (simulação)','% receita (cenário)','Como é calculado'])
put(ws,5,1,'Competência (AAAAMM)',font=FT_NOTE)
for i,m in enumerate([202607,202608,202609]): put(ws,5,2+i,m,font=FT_NOTE,fmt='0')
put(ws,6,1,'Dias de atendimento da parceria no mês (só para o método B)',border=B_ALL)
for c in (2,3,4): inp(ws,6,c,0,NUM0)
put(ws,6,6,'=S_DIAS',fmt=NUM0,border=B_ALL)
MC=['B','C','D']
def sif(line,c,tipo=None): return f'SUMIFS(B_VAL,B_TRI,"SIM",B_TLIN,"{line}",B_MES,{c}$5'+(f',B_TIPO,"{tipo}")' if tipo else ')')
LINES=[(8,'RECEITA',None,None,'sec',''),
 (9,'Receita bruta — consultas da Dra. Patrícia',lambda c:'='+sif('R1 Consultas',c),'=S_CONS_Q*S_CONS_P','n','Conta 1.01.03.001'),
 (10,'Receita bruta — procedimentos de tricologia',lambda c:'='+sif('R2 Procedimentos de tricologia',c),'=S_EC_Q*S_EC_P+S_FT_Q*S_FT_P+S_EB_Q*S_EB_P','n','Conta 1.01.03.010 (serviço "TRICOLOGIA")'),
 (11,'Receita bruta — facial e corporal da Dra. Patrícia',lambda c:'=IF(P_FC="SIM",1,0)*'+sif('R3 Facial e corporal (Dra. Patrícia)',c),'=0','n','Contas 1.01.04.014 / 1.01.05.014 — só entra se a aba 02 disser SIM'),
 (12,'(=) Receita bruta da parceria',lambda c:f'={c}9+{c}10+{c}11','=F9+F10+F11','t',''),
 (13,'(−) PIS e COFINS',lambda c:f'=-{c}12*(P_PIS+P_COFINS)','=-F12*(P_PIS+P_COFINS)','n','3,65% do faturamento'),
 (14,'(−) ISS',lambda c:f'=-{c}12*P_ISS','=-F12*P_ISS','n','Aba 02 (0% — ISS fixo anual; confirmar)'),
 (15,'(−) Taxas de cartão e antecipação',lambda c:f'=-{c}12*P_CARTAO','=-F12*P_CARTAO','n','2,2% — média histórica da clínica'),
 (16,'(−) Reembolsos e devoluções a pacientes',lambda c:'=-'+sif('T2 Reembolsos a pacientes',c),'=0','n',''),
 (17,'(=) Receita líquida',lambda c:f'={c}12+{c}13+{c}14+{c}15+{c}16','=F12+F13+F14+F15+F16','t',''),
 (18,'CUSTO DIRETO',None,None,'sec',''),
 (19,'(−) Insumos e ativos',lambda c:'=-'+sif('C1 Insumos e ativos',c),
   '=-(S_EC_Q*IF(F_EC_OK="OK",F_EC_C,S_EC_P*S_INS)+S_FT_Q*IF(F_FT_OK="OK",F_FT_C,S_FT_P*S_INS)+S_EB_Q*IF(F_EB_OK="OK",F_EB_C,S_EB_P*S_INS))','n',
   'Compras "TRICOLOGIA" no mês (sem estoque = consumo). Cenário: ficha técnica (aba 05) ou % da aba 02'),
 (20,'(=) Margem de contribuição',lambda c:f'={c}17+{c}19','=F17+F19','t',''),
 (21,'DESPESAS DA PARCERIA',None,None,'sec',''),
 (22,'(−) Viagens e estadia da Dra. Patrícia',lambda c:'=-'+sif('D1 Viagens e deslocamento',c),'=-S_VIAG','n','Hotel, refeições, passagem (contas 2.02.06.x)'),
 (23,'(−) Marketing específico',lambda c:'=-'+sif('D2 Marketing da tricologia',c),'=-S_MKT','n',''),
 (24,'(−) Outras despesas diretas',lambda c:f'=-({sif("D3 Outras despesas diretas",c)}+{sif("T1 Deduções (reais)",c)})','=0','n','Lanche, decoração e recepção dos dias de tricologia'),
 (25,'(−) Taxa de estrutura da clínica',lambda c:f'=-IF(P_MET="B",P_DIARIA*P_SALAS_TRI*{c}6,{c}12*P_PCTA)','=-IF(P_MET="B",P_DIARIA*P_SALAS_TRI*F6,F12*P_PCTA)','n','Método A: % do faturamento (aba 04). B: diária × dias'),
 (26,'(=) Resultado operacional (EBITDA) da parceria',lambda c:f'={c}20+{c}22+{c}23+{c}24+{c}25','=F20+F22+F23+F24+F25','t',''),
 (27,'(−) Amortização do investimento de implantação',
   lambda c:f'=-IF(AND(P_AM_SW="SIM",{c}5>=P_AM_INI,(INT({c}5/100)*12+MOD({c}5,100))-(INT(P_AM_INI/100)*12+MOD(P_AM_INI,100))<P_AM_PRAZO),P_AM_MES,0)',
   '=-P_AM_MES','n','Investimento ÷ prazo (abas 02 e 06)'),
 (28,'(−) IRPJ e CSLL presumidos',lambda c:f'=-({c}9*P_IRCS_C+({c}10+{c}11)*P_IRCS_P)','=-(F9*P_IRCS_C+(F10+F11)*P_IRCS_P)','n','Consultas 7,68%; procedimentos 2,28%'),
 (29,'(=) Resultado líquido do mês',lambda c:f'={c}26+{c}27+{c}28','=F26+F27+F28','t',''),
 (30,'Prejuízo acumulado de meses anteriores',None,'=0','n','Compensado antes de nova partilha'),
 (31,'(=) Base de partilha',lambda c:f'=MAX(0,{c}29+{c}30)','=MAX(0,F29+F30)','t',''),
 (32,'Clínica Núcleo — 50%',lambda c:f'={c}31*P_CLI','=F31*P_CLI','k',''),
 (33,'Dra. Patrícia Fabrini — 50%',lambda c:f'={c}31*P_PAT','=F31*P_PAT','k','Repasse contra NF da PJ dela (conta 2.02.04.002)'),
 (34,'Prejuízo a compensar no mês seguinte',lambda c:f'=MIN(0,{c}29+{c}30)','=MIN(0,F29+F30)','n',''),
 (36,'LEITURA GERENCIAL',None,None,'sec',''),
 (37,'Retorno total da clínica (50% + taxa de estrutura + amortização)',lambda c:f'={c}32-{c}25-{c}27','=F32-F25-F27','n',''),
 (38,'Participação da Dra. Patrícia sobre a receita bruta',lambda c:f'=IF({c}12<5000,"–",{c}33/{c}12)','=IFERROR(F33/F12,0)','p',''),
 (39,'Participação da clínica sobre a receita bruta',lambda c:f'=IF({c}12<5000,"–",{c}37/{c}12)','=IFERROR(F37/F12,0)','p',''),
 (40,'Margem líquida da parceria',lambda c:f'=IF({c}12<5000,"–",{c}29/{c}12)','=IFERROR(F29/F12,0)','p',''),
 (41,'Vendas da parceria em cartão parcelado (dinheiro entra em até 12 meses)',
   lambda c:f'=SUMIFS(B_VAL,B_TRI,"SIM",B_TIPO,"Receita",B_MES,{c}$5,B_MET,"*arcelad*")-IF(P_FC="SIM",0,SUMIFS(B_VAL,B_TLIN,"R3*",B_TIPO,"Receita",B_MES,{c}$5,B_MET,"*arcelad*"))',None,'n','Ver agenda de recebimento na aba 09'),
 (42,'% da receita da parceria em cartão parcelado',lambda c:f'=IF({c}12<5000,"–",{c}41/{c}12)',None,'p',''),
 (43,'Investimento de implantação pago no mês (fora da DRE)',lambda c:f'={sif("X1 Equipamentos (CAPEX)",c,"Despesa")}-{sif("X1 Equipamentos (CAPEX)",c,"Receita")}+{sif("X2 Consultoria de implantação",c)}','=0','n','Equipamentos e consultoria — aba 06'),
 (44,'Faturamento mínimo para não dar prejuízo (ponto de equilíbrio)',None,'=IFERROR(-(F22+F23+F24+F27+IF(P_MET="B",F25,0))/((F29-(F22+F23+F24+F27+IF(P_MET="B",F25,0)))/F12),0)','n','Custos fixos do mês ÷ margem por real faturado'),
]
for (r,lab,fm,fs,kind,note) in LINES:
    if kind=='sec': put(ws,r,1,lab,font=FT_T2); continue
    fill=F_TOT if kind=='t' else (F_OK if kind=='k' else None); font=FT_B if kind in ('t','k') else FT_N; fmt=PCT if kind=='p' else NUM
    put(ws,r,1,lab,font=font,fill=fill,border=B_ALL)
    for c in MC:
        if r==30: v=0 if c=='B' else f'={chr(ord(c)-1)}34'
        elif fm is None: v=None
        else: v=fm(c)
        put(ws,r,ord(c)-64,v,fmt=fmt,font=font,fill=fill,border=B_ALL)
    if r==30: ev='=B30'
    elif r==34: ev='=D34'
    elif kind=='p': ev={38:'=IF(E12<5000,"–",E33/E12)',39:'=IF(E12<5000,"–",E37/E12)',40:'=IF(E12<5000,"–",E29/E12)',42:'=IF(E12<5000,"–",E41/E12)'}[r]
    elif fm is None: ev=None
    else: ev=f'=SUM(B{r}:D{r})'
    put(ws,r,5,ev,fmt=fmt,font=FT_B,fill=fill,border=B_ALL)
    put(ws,r,6,fs,fmt=fmt,font=font,fill=fill or F_SUB,border=B_ALL)
    if kind!='p' and fs is not None and r not in (30,34,43,44): put(ws,r,7,f'=IFERROR(F{r}/F$12,0)',fmt=PCT,border=B_ALL)
    put(ws,r,8,note,font=FT_NOTE)
put(ws,46,1,'Atenção: partilhar sobre o VENDIDO (competência) obriga a clínica a pagar hoje a parte da Dra. Patrícia sobre parcelas de cartão que só vão entrar nos próximos 12 meses. Decisão nº 5 da aba 17.',font=FT_RED)
put(ws,47,1,'Cenário = simulação livre com volumes e preços da aba 02. Os números reais estão nas colunas de jul a set.',font=FT_NOTE)
ws.freeze_panes='B7'

# ============================================================ 08 DRE Clínica
ws = W['08 DRE Clínica']; title(ws,'DRE gerencial da clínica — jan a set/2026 (competência pelo vencimento, plano oficial)',
 'Jan–jun: base classificada do export anterior. Jul–set: exports completos enviados em 07/10/2026.')
ws.column_dimensions['A'].width=50
for i in range(12): ws.column_dimensions[L(2+i)].width=13
hdr(ws,4,1,['Linha']+MLAB+['Acum. jan–set','Acum. jul–set','AV % jul–set'])
for i,m in enumerate(MESES): put(ws,5,2+i,m,font=FT_NOTE,fmt='0')
def g(grp,c,tipo): return f'SUMIFS(B_VAL,B_GRP,"{grp}",B_MES,{c}$5,B_TIPO,"{tipo}")'
DL=[(6,'Receita Operacional Bruta',lambda c:'='+g('Receita Operacional Bruta',c,'Receita'),'n'),
 (7,'Outras Receitas Operacionais',lambda c:'='+g('Outras Receitas Operacionais',c,'Receita'),'n'),
 (8,'(−) Deduções da Receita',lambda c:'=-'+g('Deduções da Receita',c,'Despesa'),'n'),
 (9,'(=) Receita Líquida',lambda c:f'={c}6+{c}7+{c}8','t'),
 (10,'(−) Custos Diretos',lambda c:'=-'+g('Custos Diretos',c,'Despesa'),'n'),
 (11,'(=) Margem de Contribuição',lambda c:f'={c}9+{c}10','t')]
OPEX=['Pessoal','Comercial e Relacionamento','Marketing','Ocupação e Infraestrutura','Equipamentos e Compliance Clínico','Tecnologia',
      'Administrativo e Profissionais','Taxas e Obrigações Regulatórias','Rateios e Overhead Compartilhado','Despesas sem identificação']
for i,gname in enumerate(OPEX):
    lab='(−) '+gname+(' (fatura de cartão sem detalhe)' if gname=='Despesas sem identificação' else '')
    DL.append((12+i,lab,(lambda gg: (lambda c:'=-'+g(gg,c,'Despesa')))(gname),'n'))
DL+= [(22,'(=) EBITDA',lambda c:f'={c}11+SUM({c}12:{c}21)','t'),
 (23,'(−) Depreciação e Amortização (não registrada na base)',lambda c:'=-'+g('Depreciação e Amortização',c,'Despesa'),'n'),
 (24,'(=) EBIT',lambda c:f'={c}22+{c}23','t'),
 (25,'(+) Receitas Financeiras',lambda c:'='+g('Receitas Financeiras',c,'Receita'),'n'),
 (26,'(−) Despesas Financeiras',lambda c:'=-'+g('Despesas Financeiras',c,'Despesa'),'n'),
 (27,'(+) Outras Receitas Não Operacionais',lambda c:'='+g('Outras Receitas / Resultado Não Operacional',c,'Receita'),'n'),
 (28,'(−) Outras Despesas Não Operacionais',lambda c:'=-'+g('Outras Despesas / Não Operacionais',c,'Despesa'),'n'),
 (29,'(=) Resultado antes de IRPJ/CSLL',lambda c:f'=SUM({c}24:{c}28)','t'),
 (30,'(−) Tributos sobre o Lucro (IRPJ/CSLL)',lambda c:'=-'+g('Tributos sobre Lucro',c,'Despesa'),'n'),
 (31,'(=) Resultado Líquido',lambda c:f'={c}29+{c}30','t'),
 (32,'Margem líquida (%)',lambda c:f'=IFERROR({c}31/{c}6,0)','p'),
 (34,'FORA DA DRE (consome caixa, não é despesa do resultado)',None,'sec'),
 (35,'Investimentos (CAPEX)',lambda c:'='+g('Investimentos - Não DRE',c,'Despesa'),'n'),
 (36,'Amortização de empréstimos e parcelamentos (principal)',lambda c:'='+g('Financiamentos - Não DRE',c,'Despesa'),'n'),
 (37,'Retiradas de sócio',lambda c:'='+g('Patrimônio - Não DRE',c,'Despesa'),'n'),
 (38,'Compras para estoque',lambda c:'='+g('Compras para Estoque - Não DRE',c,'Despesa'),'n'),
 (39,'Adiantamentos',lambda c:'='+g('Adiantamentos e Ativos - Não DRE',c,'Despesa'),'n'),
 (40,'Contas de passagem (transferências / a prestar contas) — saídas',lambda c:'='+g('Contas de Passagem - Não DRE',c,'Despesa'),'n'),
 (42,'CONFERÊNCIA AO CENTAVO (deve ser zero)',None,'sec'),
 (43,'Total de despesas na Base',lambda c:f'=SUMIFS(B_VAL,B_TIPO,"Despesa",B_MES,{c}$5)','n'),
 (44,'DRE + fora da DRE',lambda c:f'=-({c}8+{c}10+SUM({c}12:{c}21)+{c}23+{c}26+{c}28+{c}30)+SUM({c}35:{c}40)','n'),
 (45,'Diferença despesas',lambda c:f'=ROUND({c}43-{c}44,2)','n'),
 (46,'Total de receitas na Base',lambda c:f'=SUMIFS(B_VAL,B_TIPO,"Receita",B_MES,{c}$5)','n'),
 (47,'Receitas na DRE + entradas fora da DRE',lambda c:f'={c}6+{c}7+{c}25+{c}27+'+g('Entradas Não DRE',c,'Receita')+'+'+g('Contas de Passagem - Não DRE',c,'Receita'),'n'),
 (48,'Diferença receitas',lambda c:f'=ROUND({c}46-{c}47,2)','n')]
for (r,lab,fm,kind) in DL:
    if kind=='sec': put(ws,r,1,lab,font=FT_T2); continue
    fill=F_TOT if kind=='t' else None; font=FT_B if kind=='t' else FT_N; fmt=PCT if kind=='p' else NUM
    put(ws,r,1,lab,font=font,fill=fill,border=B_ALL)
    for i in range(9): put(ws,r,2+i,fm(L(2+i)),fmt=fmt,font=font,fill=fill,border=B_ALL)
    if kind=='p': put(ws,r,11,'=IFERROR(K31/K6,0)',fmt=fmt,border=B_ALL); put(ws,r,12,'=IFERROR(L31/L6,0)',fmt=fmt,border=B_ALL)
    else:
        put(ws,r,11,f'=SUM(B{r}:J{r})',fmt=fmt,font=FT_B,fill=fill,border=B_ALL); put(ws,r,12,f'=SUM(H{r}:J{r})',fmt=fmt,font=FT_B,fill=fill,border=B_ALL)
        if r<=31: put(ws,r,13,f'=IFERROR(L{r}/L$6,0)',fmt=PCT,border=B_ALL)
ws.freeze_panes='B6'
