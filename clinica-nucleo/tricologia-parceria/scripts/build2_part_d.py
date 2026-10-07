DRE_T=q('03 DRE Tricologia')
fm=lambda v: f"R$ {v:,.2f}".replace(',','X').replace('.',',').replace('X','.')
def ms(code): return J[J['Código']==code].groupby('Mes').Valor.sum()
cart_m=ms('2.13.01.099'); soc_m=ms('2.18.01.003'); rb_m=J[J.Grupo=='Receita Operacional Bruta'].groupby('Mes').Valor.sum()
cg_m=ms('2.09.01.004'); mk_m=J[J.Grupo=='Marketing'].groupby('Mes').Valor.sum()
# ============================================================ 16 Auditoria
ws=W['16 Auditoria e Alertas']; title(ws,'Auditoria e alertas — jul a set/2026 (exports completos)','Ordenado por criticidade. Cada item pede documento ou decisão antes do próximo fechamento.')
for col,w in zip('ABCDEF',[5,12,70,16,62,14]): ws.column_dimensions[col].width=w
hdr(ws,4,1,['#','Criticidade','Achado','Valor exposto (R$)','Ação necessária','Afeta a parceria?'])
AL=[('ALTA',f'Retirada de R$ 11.000 (08/07) para a conta do Dr. Marcos pagar despesas da clínica. Era tratada como despesa: é transferência. As despesas pagas com ela já estão lançadas uma a uma (R$ 7.205,21 identificados).',11000,'Reclassificada para passagem (3.03.01.008). Dr. Marcos prestar contas dos R$ 3.794,79 restantes. Ver aba 09-E.','NÃO'),
 ('ALTA','63,5% da receita da parceria em agosto (R$ 100,6 mil) foi cartão parcelado em até 12x, mas o sistema dá baixa de todas as parcelas no dia da venda.',100587.66,'Decidir se a partilha é sobre o vendido ou sobre o recebido (aba 17, nº 5). Conferir agenda da adquirente.','SIM'),
 ('ALTA','Facial e corporal da Dra. Patrícia (R$ 67,2 mil em ago–set) entraram como receita, mas não há compra de produto identificada para esses procedimentos.',67238,'Se entram na parceria, levantar os produtos usados (NF ou fatura do cartão) e lançar com "TRICOLOGIA/PATRICIA" na descrição.','SIM'),
 ('ALTA',f'Faturas de cartão sem detalhamento: jul {fm(cart_m.get(202607,0))}, ago {fm(cart_m.get(202608,0))}, set {fm(cart_m.get(202609,0))}. Passagens da Dra. Patrícia podem estar aqui dentro.',float(cart_m.sum()),'Exigir fatura detalhada e reclassificar item a item. Nunca ratear. Fora da base de estrutura.','SIM'),
 ('MÉDIA','MATERIAL TRICOLOGIA R$ 2.744,67 aparece em 27/07, 30/07 e 10/08 (boletos). Pode ser parcelamento de uma compra ou lançamento repetido.',2744.67,'Conferir os boletos. Se for duplicado, excluir — reduz o custo da parceria em julho.','SIM'),
 ('MÉDIA','CONSULTORIA TRICOLOGIA R$ 5.714,28/mês desde abr (7 × = R$ 40 mil). Beneficiário não identificado.',40000,'Informar quem recebe. Se for a própria Dra. Patrícia, tratar como adiantamento dela.','SIM'),
 ('MÉDIA','TAXA EMBARQUE R$ 250 (12/08, dinheiro CZS) no meio da visita da Dra. Patrícia.',250,'Se for da viagem dela, marcar SIM na coluna AC da Base (entra na parceria).','SIM'),
 ('MÉDIA',f'Retiradas do Dr. Marcos: jul {fm(soc_m.get(202607,0))}, ago {fm(soc_m.get(202608,0))}, set {fm(soc_m.get(202609,0))}. Set R$ 16.500 sem data de baixa. Sem política formal.',float(soc_m.sum()),'Formalizar pró-labore e distribuição. Fora da DRE e da parceria.','NÃO'),
 ('MÉDIA','IRPJ e CSLL: nenhum pagamento em jul–set. O 2º trimestre vencia em 31/07.',None,'Confirmar com a contabilidade se foi parcelado ou está em aberto.','NÃO'),
 ('MÉDIA','PIS R$ 1.850,88 e COFINS R$ 8.542,53 de julho sem data de baixa.',1850.88+8542.53,'Confirmar pagamento.','NÃO'),
 ('MÉDIA','PARCELAMENTO PGFN R$ 440,30 lançado 3 vezes em 31/08 (obs. "MES 6", "MES 7" e vazia).',880.60,'Confirmar se é quitação de parcelas atrasadas ou duplicidade.','NÃO'),
 ('MÉDIA','Duas contas cadastradas para Santander Cruzeiro do Sul ("Centro de Custo Cruzeiro do Sul" e "-CRUZEIRO DO SUL").',None,'Confirmar se é a mesma conta bancária e unificar o cadastro — senão a conciliação com o extrato não fecha.','NÃO'),
 ('MÉDIA','Vendas de set em PAGAMENTO EM ABERTO (R$ 36.894) e julho em PERMUTA (R$ 17.250).',36894+17250,'Cobrar os em aberto; documentar a contrapartida da permuta.','NÃO'),
 ('BAIXA','"DR MARCOS" R$ 3.000 (04/08) com obs. "complemento salarial Katiele mês 06" — reclassificado de retirada para salário.',3000,'Lançar salários com a descrição do colaborador, não com o nome do sócio.','NÃO'),
 ('BAIXA','Despesas pagas pela conta pessoal do Dr. Marcos lançadas em contas da clínica (DINHEIRO RB, Santander Epitaciolândia).',7205.21,'Criar a conta "a prestar contas" no sistema; o saldo das contas da clínica não bate com o extrato.','NÃO'),
 ('INFO',f'Achados recorrentes: depreciação não registrada; marketing {mk_m.sum()/rb_m.sum():.1%} do faturamento (abaixo de 8%); consultorias de gestão {cg_m.sum()/rb_m.sum():.1%} (abaixo do teto de 10%, mas alto).',None,'Manter no radar.','NÃO')]
r=5
for i,(cr,ach,val,acao,tri) in enumerate(AL,start=1):
    put(ws,r,1,i,border=B_ALL); c=put(ws,r,2,cr,border=B_ALL,font=FT_B); c.fill=F_WARN if cr=='ALTA' else (F_PART if cr=='MÉDIA' else F_TOT)
    put(ws,r,3,ach,border=B_ALL,align=WRAP); put(ws,r,4,val,fmt=NUM,border=B_ALL); put(ws,r,5,acao,border=B_ALL,align=WRAP)
    put(ws,r,6,tri,border=B_ALL,font=FT_GRN if tri=='SIM' else FT_N); ws.row_dimensions[r].height=48; r+=1
r+=1
dd=J[J['R/D']=='Despesa'].copy(); dd['nd']=dd['Descrição'].map(norm_desc)
put(ws,r,3,'Duplicidades (jul–set): mesma descrição e valor com até 35 dias',font=FT_T2); r+=1
hdr(ws,r,2,['Tipo','Descrição','Valor (R$)','Vencimentos','Dias']); r+=1
dups=[]
for (k,v),g_ in dd.groupby(['nd','Valor']):
    if len(g_)<2: continue
    g_=g_.sort_values('Data de vencimento').to_dict('records')
    for i_ in range(len(g_)):
        for j_ in range(i_+1,len(g_)):
            gap=(g_[j_]['Data de vencimento']-g_[i_]['Data de vencimento']).days
            if gap<=35: dups.append((0 if gap==0 else (1 if gap<=20 else 2),'ESTRITA (mesma data)' if gap==0 else ('SUSPEITA (≤ 20 dias)' if gap<=20 else 'Recorrência mensal provável'),k,v,f"{g_[i_]['Data de vencimento']:%d/%m} e {g_[j_]['Data de vencimento']:%d/%m}",gap))
for o,tp,k,v,dts,gap in sorted(dups):
    put(ws,r,2,tp,border=B_ALL,font=FT_RED if o<2 else FT_N); put(ws,r,3,k,border=B_ALL); put(ws,r,4,v,fmt=NUM,border=B_ALL); put(ws,r,5,dts,border=B_ALL); put(ws,r,6,gap,border=B_ALL); r+=1
r+=1
put(ws,r,3,'Despesas ≥ R$ 5.000 sem observação (jul–set)',font=FT_T2); r+=1
hdr(ws,r,2,['Mês','Descrição','Valor (R$)','Conta analítica','Código']); r+=1
big=dd[(dd.Valor>=5000)&~dd['Observações'].apply(lambda s: isinstance(s,str) and s.strip()!='')].sort_values(['Mes','Valor'],ascending=[True,False])
for _,x in big.iterrows():
    put(ws,r,2,x.Mes,border=B_ALL); put(ws,r,3,x['nd'],border=B_ALL); put(ws,r,4,x.Valor,fmt=NUM,border=B_ALL); put(ws,r,5,x['Conta analítica'],border=B_ALL); put(ws,r,6,x['Código'],border=B_ALL); r+=1
r+=1
put(ws,r,3,'Despesas sem data de baixa (jul–set)',font=FT_T2); r+=1
hdr(ws,r,2,['Mês','Descrição','Valor (R$)','Conta analítica','Código']); r+=1
for _,x in dd[~dd['Data de baixa'].apply(lambda v: isinstance(v,dt.date))].iterrows():
    put(ws,r,2,x.Mes,border=B_ALL); put(ws,r,3,x['nd'],border=B_ALL); put(ws,r,4,x.Valor,fmt=NUM,border=B_ALL); put(ws,r,5,x['Conta analítica'],border=B_ALL); put(ws,r,6,x['Código'],border=B_ALL); r+=1
r+=1
put(ws,r,3,'Ajustes manuais feitos nesta análise (coluna AI da Base)',font=FT_T2); r+=1
hdr(ws,r,2,['Mês','Descrição','Valor (R$)','Código final','Motivo']); r+=1
for _,x in base[base['Nota de ajuste'].notna()].iterrows():
    put(ws,r,2,x.Mes,border=B_ALL); put(ws,r,3,norm_desc(x['Descrição']),border=B_ALL); put(ws,r,4,x.Valor,fmt=NUM,border=B_ALL); put(ws,r,5,x['Código'],border=B_ALL); put(ws,r,6,x['Nota de ajuste'],border=B_ALL,align=WRAP); r+=1
ws.freeze_panes='A5'

# ============================================================ 17 Decisões
ws=W['17 Decisões Diretoria']; title(ws,'Decisões para a diretoria validar antes da apresentação',
 'O modelo já roda com a proposta da coluna C. Mudou alguma? Ajuste a premissa na aba 02 e a DRE recalcula. Marque a coluna G.')
for col,w in zip('ABCDEFG',[4,40,44,54,38,18,16]): ws.column_dimensions[col].width=w
hdr(ws,4,1,['#','Decisão','Proposta (já no modelo)','Por quê','Alternativa','Efeito em ago–set (R$)','Status'])
DEC=[('Taxa de estrutura','Método A: % do faturamento igual ao peso da estrutura na clínica (≈18,5% em jul–set)','Objetivo, acompanha o volume e não depende de dado que falta.','Método B: diária de sala × dias. Precisa das salas de CZS e Epitaciolândia.',f"={DRE_T}!E25"),
 ('Facial e corporal da Dra. Patrícia entram na parceria?','SIM (R$ 67,2 mil em ago–set)','São serviços dela, vendidos com o nome dela.','NÃO: ficam 100% da clínica e ela recebe só pela tricologia. Se SIM, os produtos usados precisam entrar no custo.',f"={DRE_T}!E11"),
 ('Investimento de implantação (R$ 61,1 mil) entra na conta?','SIM: amortizar em 24 meses a partir de ago/26','Os aparelhos que geram a receita foram pagos 100% pela clínica.','A clínica absorve sozinha.',f"={DRE_T}!E27"),
 ('Quem recebeu a CONSULTORIA TRICOLOGIA (R$ 40 mil)?','Tratada como investimento de implantação','A base não identifica o beneficiário.','Se foi a Dra. Patrícia: adiantamento a descontar dos repasses dela.',None),
 ('Partilha sobre o VENDIDO ou sobre o RECEBIDO?','Sobre o vendido (competência), com a taxa de cartão descontada','Simples e igual à DRE.','Sobre o recebido: mais seguro para o caixa da clínica — 63,5% de agosto entra em até 12 meses (aba 09-G).',f"={DRE_T}!E41"),
 ('Material comprado antes de começar (jul, R$ 13,6 mil)','Insumo de julho, compensado como prejuízo em agosto','Sem estoque, compra = consumo (regra da clínica).','Somar ao investimento e amortizar.',f"={DRE_T}!B19"),
 ('Prejuízo de um mês','Compensado nos meses seguintes antes de nova partilha','Evita pagar partilha em mês bom depois de mês ruim.','Zerar a cada mês.',None),
 ('Forma de pagamento à Dra. Patrícia','PJ com nota fiscal, até o dia 15','Pagamento como pessoa física gera INSS patronal de 20%.','—',None),
 ('ISS','0% (ISS fixo anual)','Nenhum ISS mensal em 9 meses de base.','Se houver ISS variável, lançar a alíquota na aba 02.',f"={DRE_T}!E14"),
 ('IRPJ/CSLL presumidos','Consultas 7,68% · procedimentos 2,28%','Alíquota efetiva da clínica no 1º tri: 1,95%.','Confirmar com a contabilidade.',f"={DRE_T}!E28"),
 ('Participação efetiva da Dra. Patrícia','Ver aba 03, linha 38','É o que sobra para ela depois de todos os descontos e da divisão.','Ajustar % de partilha ou taxa de estrutura se a diretoria quiser outro equilíbrio.',f"={DRE_T}!E33"),
 ('Preços dos procedimentos ("Definir preço")','Fechar após preencher a NF dos ativos (aba 05)','Sem o custo dos ativos não há preço mínimo confiável.','—',None),
 ('Passagens da Dra. Patrícia','Identificar na fatura do cartão e lançar em 2.02.06.001','Agosto só tem hotel e refeições (R$ 1.240).','—',None)]
r=5
for i,(d_,p_,w_,a_,f_) in enumerate(DEC,start=1):
    put(ws,r,1,i,border=B_ALL); put(ws,r,2,d_,border=B_ALL,align=WRAP,font=FT_B); put(ws,r,3,p_,border=B_ALL,align=WRAP)
    put(ws,r,4,w_,border=B_ALL,align=WRAP); put(ws,r,5,a_,border=B_ALL,align=WRAP); put(ws,r,6,f_,fmt=NUM,border=B_ALL); inp(ws,r,7,'A validar'); ws.row_dimensions[r].height=48; r+=1
dv=DataValidation(type='list',formula1='"A validar,Aprovado,Ajustar"',allow_blank=True); ws.add_data_validation(dv); dv.add(f'G5:G{r-1}'); ws.freeze_panes='C5'

# ============================================================ 00 Leia-me
ws=W['00 Leia-me']; title(ws,'Clínica Núcleo — DRE da parceria de Tricologia e lançamentos jul–set/2026','Controladoria · Marinho Gestão & Resultados · versão para validação da diretoria · 07/10/2026')
ws.column_dimensions['A'].width=4; ws.column_dimensions['B'].width=66; ws.column_dimensions['C'].width=20; ws.column_dimensions['D'].width=70
r=4; put(ws,r,2,'Números-chave (atualizam sozinhos)',font=FT_T2); r+=1
KEYS=[('Faturamento da parceria — jul a set',f"={DRE_T}!E12",NUM,'Consultas + tricologia + facial/corporal da Dra. Patrícia'),
 ('Resultado líquido da parceria — jul a set',f"={DRE_T}!E29",NUM,'Depois de impostos, insumos, viagens, estrutura e amortização'),
 ('Partilha acumulada — Clínica Núcleo (50%)',f"={DRE_T}!E32",NUM,''),('Partilha acumulada — Dra. Patrícia (50%)',f"={DRE_T}!E33",NUM,''),
 ('Retorno total da clínica (50% + estrutura + amortização)',f"={DRE_T}!E37",NUM,''),
 ('Taxa de estrutura — método A',"=P_PCTA",PCT,'Despesa fixa compartilhada ÷ faturamento da clínica (jul–set)'),
 ('Despesa fixa compartilhada da clínica (média mensal)','='+RATEIO_TOT,NUM,'Aba 04'),
 ('Investimento de implantação da tricologia','=P_INV',NUM,'Equipamentos líquidos + consultoria de R$ 40 mil (aba 06)'),
 ('Vendas da parceria em cartão parcelado (jul–set)',f"={DRE_T}!E41",NUM,'Entram no caixa em até 12 meses (aba 09-G)')]
for lab,f,fmt_,nt in KEYS: put(ws,r,2,lab,border=B_ALL); put(ws,r,3,f,fmt=fmt_,font=FT_B,border=B_ALL); put(ws,r,4,nt,font=FT_NOTE); r+=1
r+=1; put(ws,r,2,'Fontes',font=FT_T2); r+=1
for t in ['Jul, ago e set: exports completos do sistema enviados em 07/10/2026 (498 + 605 + 474 lançamentos).',
          'Jan a jun: base já classificada do export anterior (2.813 lançamentos) — usada só para histórico da DRE.',
          'Plano de contas: "Plano de Contas Nucleo.xlsx" (Google Drive) — 590 contas analíticas, incluindo as contas próprias de tricologia em parceria.',
          'Salas: "Relatório Técnico Levantamento Estrutural da Clínica Núcleo S" (Google Drive, 12/07/2026).',
          'Procedimentos: folha "Procedimentos de Tricologia" (fotos enviadas).']:
    put(ws,r,2,'• '+t,align=WRAP); ws.merge_cells(start_row=r,start_column=2,end_row=r,end_column=4); ws.row_dimensions[r].height=28; r+=1
r+=1; put(ws,r,2,'Critérios',font=FT_T2); r+=1
for t in ['Competência = data de VENCIMENTO (a data de emissão das recorrentes vem deslocada no sistema). Caixa = data de baixa.',
          'Transferência entre contas, saque, suprimento, aplicação/resgate e dinheiro enviado para a conta do sócio pagar despesas = PASSAGEM (fora de receita e despesa). Teste por data e valor na aba 09-D: nenhuma transferência escondida em jul–set.',
          'Dr. Marcos: com "MOD" = honorário médico; sem "MOD" = retirada de sócio (fora da DRE); pró-labore = Pessoal.',
          'Fatura de cartão = linha isolada, nunca rateada. Empréstimos e parcelamentos = principal (fora da DRE).',
          'Parceria = tudo marcado com TRICOLOGIA / CAPILAR / PATRICIA na descrição ou no serviço, ou Responsável = Patrícia. Marcação manual na coluna AC da Base.']:
    put(ws,r,2,'• '+t,align=WRAP); ws.merge_cells(start_row=r,start_column=2,end_row=r,end_column=4); ws.row_dimensions[r].height=30; r+=1
r+=1; put(ws,r,2,'Como atualizar com um mês novo',font=FT_T2); r+=1
for t in ['1. Cole o export do sistema na aba 20 Base, colunas A–R, a partir da primeira linha vazia. As colunas S–AI classificam sozinhas até a linha 6001.',
          '2. Confira a coluna AG (Alertas): "NÃO CLASSIFICADA" pede regra nova na aba 18 De-Para.',
          '3. Atendimento da parceria não marcado: escreva SIM na coluna AC. Falso positivo: NÃO.',
          '4. Na aba 03, a coluna do mês novo usa o código AAAAMM da linha 5 — troque o mês e a DRE recalcula.']:
    put(ws,r,2,t,align=WRAP); ws.merge_cells(start_row=r,start_column=2,end_row=r,end_column=4); ws.row_dimensions[r].height=28; r+=1
r+=1; put(ws,r,2,'Legenda',font=FT_T2); r+=1
put(ws,r,2,'Célula amarela com número azul = premissa editável',fill=F_IN,font=FT_IN,border=B_ALL); r+=1
put(ws,r,2,'Linha cinza = total / subtotal',fill=F_TOT,font=FT_B,border=B_ALL); r+=1
put(ws,r,2,'Conta em amarelo no plano = conta criada nesta reestruturação',fill=F_IN,border=B_ALL); r+=2
put(ws,r,2,'Mapa das abas',font=FT_T2); r+=1
for a,b_ in [('01 Política Parceria','Regras da partilha: o que entra e o que não entra.'),('02 Premissas','Alíquotas, partilha, rateio, investimento, cenário.'),
             ('03 DRE Tricologia','DRE real jul–set + cenário + partilha 50/50.'),('04 Rateio Estrutura','Despesa fixa da clínica e taxa de estrutura.'),
             ('05 Custo Procedimento','Fichas técnicas e precificação.'),('06 Investimento Tricologia','Equipamentos, consultoria e recuperação.'),
             ('07 Razão Tricologia','Todos os lançamentos da parceria.'),('08 DRE Clínica','DRE gerencial jan–set, conferida ao centavo.'),
             ('09 Conciliação Datas','Competência × caixa, contas, movimento diário, transferências, agenda do cartão.'),('10 a 15','Receitas e despesas de jul, ago e set.'),
             ('16 Auditoria e Alertas','Achados e ações.'),('17 Decisões Diretoria','O que aprovar antes de apresentar.'),('18 · 19 · 20','De-Para, plano de contas oficial e base com fórmulas.')]:
    put(ws,r,2,a,font=FT_B); put(ws,r,4,b_); r+=1

# ============================================================ 01 Política
ws=W['01 Política Parceria']; title(ws,'Política da parceria de Tricologia — Clínica Núcleo × Dra. Patrícia Fabrini','Minuta para validação da diretoria. Os números vêm das abas 02 a 06.')
ws.column_dimensions['A'].width=4; ws.column_dimensions['B'].width=60; ws.column_dimensions['C'].width=4; ws.column_dimensions['D'].width=60
r=4; put(ws,r,2,'A regra em uma linha',font=FT_T2); r+=1
put(ws,r,2,'Tudo o que a parceria fatura, menos tudo o que ela custa (impostos, insumos, viagens, estrutura da clínica e o investimento feito), é dividido meio a meio: 50% Clínica Núcleo, 50% Dra. Patrícia.',align=WRAP,font=FT_B)
ws.merge_cells(start_row=r,start_column=2,end_row=r,end_column=4); ws.row_dimensions[r].height=34; r+=2
put(ws,r,2,'A conta, na ordem',font=FT_T2); r+=1
for a,b_ in [('1. Faturamento da parceria','Consultas + procedimentos de tricologia + facial/corporal da Dra. Patrícia (se aprovado)'),
 ('2. (−) Impostos e taxas sobre o faturamento','="PIS+COFINS "&FIXED((P_PIS+P_COFINS)*100,2)&"% · ISS "&FIXED(P_ISS*100,2)&"% · cartão "&FIXED(P_CARTAO*100,1)&"%"'),
 ('3. (−) Insumos e ativos','Ativos e descartáveis dos procedimentos (compras "TRICOLOGIA" / ficha técnica)'),
 ('4. (−) Viagens e despesas diretas','Passagem, hotel e alimentação da Dra. Patrícia; marketing próprio; recepção dos dias de atendimento'),
 ('5. (−) Taxa de estrutura da clínica','=IF(P_MET="A",FIXED(P_PCTA*100,1)&"% do faturamento (sala, recepção, energia, sistema, limpeza, contabilidade)","Diária de sala × dias de atendimento")'),
 ('6. (−) Amortização do investimento','=IF(P_AM_SW="SIM","Equipamentos + consultoria de implantação em "&P_AM_PRAZO&" parcelas mensais","Não entra: a clínica absorve")'),
 ('7. (−) IRPJ e CSLL presumidos','Sobre o faturamento da parceria'),('8. (=) Resultado líquido','Se negativo, é compensado nos meses seguintes antes de nova partilha'),
 ('9. Partilha','50% Clínica Núcleo · 50% Dra. Patrícia')]:
    put(ws,r,2,a,font=FT_B,border=B_ALL); put(ws,r,4,b_,border=B_ALL,align=WRAP); ws.row_dimensions[r].height=30; r+=1
r+=1
put(ws,r,2,'ENTRA na conta (desconta antes da partilha)',font=FT_GRN,fill=F_OK); put(ws,r,4,'NÃO ENTRA (fica com a clínica)',font=FT_RED,fill=F_WARN); r+=1
ENTRA=['Impostos sobre o faturamento da parceria (PIS, COFINS, ISS se houver)','Taxas de cartão e antecipação das vendas da parceria','Insumos e ativos dos procedimentos',
 'Passagem, hotel e alimentação da Dra. Patrícia, com comprovante','Marketing específico aprovado pelos dois','Manutenção dos aparelhos da tricologia',
 'Taxa de estrutura: a fatia da despesa fixa da clínica usada pela parceria','Amortização dos equipamentos e da consultoria de implantação',
 'IRPJ e CSLL presumidos sobre o faturamento da parceria','Reembolsos e devoluções a pacientes da parceria']
NAO=['Medicamentos, implantes e honorários de outros serviços','Marketing institucional da clínica','Pró-labore e retiradas dos sócios',
 'Empréstimos e parcelamentos de impostos antigos','Equipamentos e obras de outras áreas','Faturas de cartão sem detalhamento e despesa sem comprovante',
 'Consultorias e mentorias de gestão da clínica','Transferências entre contas e dinheiro enviado para a conta do sócio','Multas e juros por atraso da clínica',
 'Comissões da equipe comercial de outros serviços']
for i in range(10):
    put(ws,r,2,'✓ '+ENTRA[i],border=B_ALL,align=WRAP); put(ws,r,4,'✗ '+NAO[i],border=B_ALL,align=WRAP); ws.row_dimensions[r].height=30; r+=1
r+=1; put(ws,r,2,'Regras de operação',font=FT_T2); r+=1
for t in ['Identificação: receita da parceria com serviço de tricologia ou "DRA PATRICIA"; despesa com "TRICOLOGIA" ou "PATRICIA" na descrição. O que não estiver marcado não entra.',
 'Apuração mensal; fechamento até o dia 10 e repasse até o dia 15 do mês seguinte, contra NF da PJ da Dra. Patrícia (conta 2.02.04.002 — Repasse à parceira de tricologia).',
 'Vendas parceladas: a partilha segue a regra aprovada na aba 17 (vendido ou recebido).',
 'Prejuízo de um mês é compensado com os resultados seguintes antes de nova partilha.',
 'Equipamentos são patrimônio da clínica. Quitada a amortização, a linha zera e o resultado partilhado sobe.',
 'Taxa de estrutura revisada a cada 6 meses com a DRE da clínica.',
 'Prestação de contas mensal: DRE da parceria + razão com comprovantes, aberta às duas partes.']:
    put(ws,r,2,'• '+t,align=WRAP); ws.merge_cells(start_row=r,start_column=2,end_row=r,end_column=4); ws.row_dimensions[r].height=30; r+=1

for s in SHEETS:
    p=s[:2]
    W[s].sheet_properties.tabColor = '1BAF7A' if p in ('01','03') else ('1F3A5F' if p in ('00','02','04','05','06','07') else ('EB6834' if p in ('09','16','17') else ('2A78D6' if p in ('08','10','11','12','13','14','15') else 'A0AAB4')))
