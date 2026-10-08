import sys, datetime as dt
sys.path.insert(0, sys.argv[1])
import openpyxl
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.utils import get_column_letter as L
from xl_style import *
OUT=sys.argv[2]
wb=openpyxl.Workbook(); wb.active.title='Como usar'
for n in ['Base de cálculo','Índices','Calculadora','Lançamento mensal','Como explicar']: wb.create_sheet(n)
def q(s): return "'"+s+"'"
def name(n,ref): wb.defined_names[n]=DefinedName(n,attr_text=ref)
# ================= Índices
ws=wb['Índices']; title(ws,'Índices da parceria de Tricologia — taxas padrão da clínica','Células amarelas podem ser alteradas. Tudo nas outras abas usa estes valores.')
for col,w in zip('ABCDEF',[6,46,14,30,70,40]): ws.column_dimensions[col].width=w
hdr(ws,4,1,['Nº','Índice','Valor padrão','Aplica sobre','Como foi calculado','Fonte'])
IDX=[('I_PIS','PIS',0.0065,PCT2,'Receita bruta da parceria','Alíquota legal do Lucro Presumido (cumulativo).','Legislação'),
 ('I_COFINS','COFINS',0.03,PCT2,'Receita bruta da parceria','Alíquota legal do Lucro Presumido (cumulativo).','Legislação'),
 ('I_ISS','ISS',0.0,PCT2,'Receita bruta da parceria','A clínica recolhe ISS fixo anual: nenhum ISS mensal nos 9 meses de 2026. Confirmar com a contabilidade.','Base de transações jan–set/26'),
 ('I_CARTAO','Taxas de cartão e antecipação',0.022,PCT2,'Receita bruta da parceria','R$ 60,2 mil de deságio, MDR e maquineta ÷ R$ 2,72 mi faturados em jan–jul/26.','Base de transações jan–jul/26'),
 ('I_IRCS_C','IRPJ + CSLL presumidos — consultas',0.0768,PCT2,'Receita de consultas','Presunção de 32%: 32% × 15% (IRPJ) + 32% × 9% (CSLL).','Legislação — confirmar com a contabilidade'),
 ('I_IRCS_P','IRPJ + CSLL presumidos — procedimentos',0.0228,PCT2,'Receita de procedimentos','Presunção reduzida: 8% × 15% + 12% × 9%. A clínica pagou 1,95% efetivo no 1º tri/26.','Legislação — confirmar com a contabilidade'),
 ('I_EST','Taxa de estrutura da clínica',0.184628712949474,PCT2,'Receita bruta da parceria','Despesa fixa compartilhada (R$ 90.597,90/mês) ÷ faturamento médio da clínica (R$ 490.703,22/mês), média jul–set/26. Composição abaixo.','DRE da clínica jul–set/26'),
 ('I_INS','Insumos e ativos (quando não houver valor lançado)',0.0349,PCT2,'Receita bruta da parceria','Compras "TRICOLOGIA" de ago–set (R$ 6.281,73) ÷ receita da parceria ago–set (R$ 179.877). Use o valor real sempre que tiver.','Razão da tricologia ago–set/26'),
 ('I_VIAG','Viagens e estadia (passagem, hotel, alimentação, transporte)',0.0069,PCT2,'Receita bruta da parceria','R$ 1.240 lançados em ago ÷ R$ 179.877. Está SUBESTIMADO: passagens e hotel de setembro ainda não foram localizados. Use o valor real.','Razão da tricologia ago–set/26'),
 ('I_OUT','Outras despesas diretas (recepção, ambientação)',0.0043,PCT2,'Receita bruta da parceria','R$ 769,75 em ago ÷ R$ 179.877.','Razão da tricologia ago–set/26'),
 ('I_AMORT','Amortização do investimento (R$ por mês)',2547.49083333333,NUM,'Valor fixo mensal por 24 meses','Aparelhos R$ 21.139,82 + consultoria R$ 40.000 = R$ 61.139,78 ÷ 24 meses (out/26 a set/28), junto com o início da partilha.','Investimento de implantação'),
 ('I_PAT','Parte da Dra. Patrícia no resultado',0.5,PCT,'Base de partilha','Acordo: 50% do resultado líquido.','Acordo da parceria'),
]
r=5
for i,(nm,lab,v,fmt,ap,como,fonte) in enumerate(IDX,start=1):
    put(ws,r,1,i,border=B_ALL); put(ws,r,2,lab,border=B_ALL,font=FT_B); inp(ws,r,3,v,fmt); put(ws,r,4,ap,border=B_ALL,align=WRAP)
    put(ws,r,5,como,border=B_ALL,align=WRAP); put(ws,r,6,fonte,border=B_ALL,align=WRAP); ws.row_dimensions[r].height=34
    name(nm,f"{q('Índices')}!$C${r}"); r+=1
put(ws,r,2,'Parte da clínica no resultado',border=B_ALL,font=FT_B); put(ws,r,3,'=1-I_PAT',fmt=PCT,border=B_ALL,font=FT_B); name('I_CLI',f"{q('Índices')}!$C${r}"); r+=1
put(ws,r,2,'Total de impostos e taxas sobre a receita (PIS + COFINS + ISS + cartão)',border=B_ALL,font=FT_B); put(ws,r,3,'=I_PIS+I_COFINS+I_ISS+I_CARTAO',fmt=PCT2,border=B_ALL,font=FT_B); r+=2
put(ws,r,2,'De onde vem a taxa de estrutura de 18,46%',font=FT_T2); r+=1
hdr(ws,r,2,['Despesa fixa compartilhada (média mensal jul–set/26)','R$ por mês','% do faturamento da clínica','O que está dentro']); r+=1; e0=r
COMP=[('Equipe de apoio e encargos',49346.24,'Salários da equipe, INSS, FGTS, vale-alimentação, seguro de vida, saúde ocupacional'),
 ('Aluguel, energia, internet, limpeza, segurança',28526.07,'Ocupação das 3 unidades'),('Contabilidade, jurídico, escritório, copa',7629.64,'Serviços administrativos essenciais'),
 ('Sistema de gestão e informática',2254.43,'ERP, certificado digital, manutenção de computadores'),('Alvarás e taxas de funcionamento',2174.60,'Taxas regulatórias'),
 ('Resíduos de saúde e biossegurança',511.69,'Coleta e destinação'),('Tarifas bancárias e maquineta',155.23,'Despesas financeiras recorrentes')]
for lab,v,o in COMP:
    put(ws,r,2,lab,border=B_ALL); put(ws,r,3,v,fmt=NUM,border=B_ALL); put(ws,r,4,f'=C{r}/$C${e0+len(COMP)+1}',fmt=PCT2,border=B_ALL); put(ws,r,5,o,border=B_ALL,align=WRAP); r+=1
put(ws,r,2,'Total da estrutura compartilhada',font=FT_B,fill=F_TOT,border=B_ALL); put(ws,r,3,f'=SUM(C{e0}:C{r-1})',fmt=NUM,font=FT_B,fill=F_TOT,border=B_ALL); put(ws,r,4,f'=C{r}/C{r+1}',fmt=PCT2,font=FT_B,fill=F_TOT,border=B_ALL); r+=1
put(ws,r,2,'Faturamento médio mensal da clínica (jul–set/26)',border=B_ALL); put(ws,r,3,490703.216666667,fmt=NUM,border=B_ALL); r+=1
put(ws,r,2,'Fica de fora da estrutura: pró-labore e retiradas, consultorias de gestão, marketing institucional, medicamentos de outros serviços, fatura de cartão sem detalhamento, empréstimos.',font=FT_NOTE)
ws.freeze_panes='A5'

# ================= Base de cálculo
ws=wb['Base de cálculo']; title(ws,'Base de cálculo — a clínica tem despesas para operar','Média mensal de jul–set/2026, tirada da DRE da clínica (relatórios de transações). A parceria paga só a parte da estrutura que todo atendimento usa.')
for col,w in zip('ABCDEFGH',[4,52,16,13,16,16,62,4]): ws.column_dimensions[col].width=w
put(ws,4,2,'1. Quanto custa manter a clínica funcionando (média por mês, jul–set/26)',font=FT_T2)
put(ws,5,2,'Faturamento médio da clínica',font=FT_B,border=B_ALL); put(ws,5,3,490703.216666667,fmt=NUM,font=FT_B,border=B_ALL); put(ws,5,4,1,fmt=PCT,border=B_ALL)
hdr(ws,7,2,['Despesa da clínica','R$ por mês','% do faturamento','Entra na taxa de estrutura (R$)','Fica 100% com a clínica (R$)','Por quê'])
G=[('Equipe: salários, encargos, benefícios e pró-labore',56173.07,49346.24,'Entra a equipe de apoio (recepção, enfermagem, limpeza) e seus encargos. Fica de fora: pró-labore, bônus, rescisões e cursos.'),
 ('Aluguel, energia, internet, limpeza, segurança e manutenção',28782.65,28526.07,'Entra tudo: são as salas e a estrutura física que a Dra. Patrícia usa.'),
 ('Contabilidade, jurídico, escritório, consultorias de gestão',56412.66,7629.64,'Entra contabilidade, jurídico, escritório e copa. Fica de fora: consultorias e mentorias de gestão da clínica (R$ 47,8 mil/mês).'),
 ('Sistema de gestão e informática',2254.43,2254.43,'Entra tudo: agenda, prontuário e financeiro rodam no mesmo sistema.'),
 ('Alvarás e taxas de funcionamento',2174.60,2174.60,'Entra tudo: a clínica só funciona com eles.'),
 ('Biossegurança, resíduos e manutenção de aparelhos',818.18,511.69,'Entra coleta de resíduos e biossegurança. Fica de fora: manutenção de aparelhos de outros serviços.'),
 ('Tarifas bancárias e maquineta',155.54,155.23,'Entra tarifa e aluguel de maquineta. Fica de fora: juros e IOF.'),
 ('Medicamentos, insumos, honorários e comissões dos outros serviços',76002.42,0,'Não entra: são custos do emagrecimento, implantes e injetáveis. A tricologia paga só os insumos dela.'),
 ('Faturas de cartão sem detalhamento',39441.98,0,'Não entra: não se cobra do parceiro despesa sem comprovante.'),
 ('Impostos sobre o faturamento da clínica (PIS, COFINS)',8884.98,0,'Não entra aqui: a tricologia paga os impostos sobre o próprio faturamento (passo 1 abaixo).'),
 ('Marketing institucional',6099.00,0,'Não entra: marketing da clínica. Campanha própria da tricologia entra 100% nela, se aprovada pelos dois.')]
r=8; g0=r
for lab,tot,ent,why in G:
    put(ws,r,2,lab,border=B_ALL); put(ws,r,3,tot,fmt=NUM,border=B_ALL); put(ws,r,4,f'=C{r}/$C$5',fmt=PCT,border=B_ALL)
    put(ws,r,5,ent,fmt=NUM,border=B_ALL,fill=F_OK if ent else None); put(ws,r,6,f'=C{r}-E{r}',fmt=NUM,border=B_ALL); put(ws,r,7,why,border=B_ALL,align=WRAP,font=FT_NOTE)
    ws.row_dimensions[r].height=32; r+=1
put(ws,r,2,'Total de despesas para operar',font=FT_B,fill=F_TOT,border=B_ALL)
for c in (3,5,6): put(ws,r,c,f'=SUM({L(c)}{g0}:{L(c)}{r-1})',fmt=NUM,font=FT_B,fill=F_TOT,border=B_ALL)
put(ws,r,4,f'=C{r}/$C$5',fmt=PCT,font=FT_B,fill=F_TOT,border=B_ALL); rt=r; r+=1
put(ws,r,2,'% do faturamento',font=FT_B,border=B_ALL); put(ws,r,3,None,border=B_ALL); put(ws,r,4,None,border=B_ALL)
put(ws,r,5,f'=E{rt}/$C$5',fmt=PCT2,font=FT_B,fill=F_OK,border=B_ALL); put(ws,r,6,f'=F{rt}/$C$5',fmt=PCT2,font=FT_B,border=B_ALL)
put(ws,r,7,'← a coluna verde é a TAXA DE ESTRUTURA cobrada da parceria',font=FT_B); r+=1
put(ws,r,2,'Fora desta conta (não são despesa do resultado): retiradas dos sócios, empréstimos, compra de equipamentos.',font=FT_NOTE); r+=2
put(ws,r,2,'Leitura: para cada R$ 100 que a clínica fatura, ela gasta cerca de R$ 56 para funcionar. Desses, R$ 18,46 são a estrutura que qualquer atendimento usa: é só essa parte que a parceria paga, na mesma proporção do que ela fatura.',font=FT_B,align=WRAP)
ws.merge_cells(start_row=r,start_column=2,end_row=r,end_column=7); ws.row_dimensions[r].height=34; r+=2
put(ws,r,2,'2. Do faturamento da tricologia ao valor de cada um (exemplo com R$ 100.000)',font=FT_T2); r+=1
put(ws,r,2,'Faturamento da tricologia no exemplo (pode mudar)',font=FT_B,border=B_ALL); inp(ws,r,3,100000,NUM); name('BC_REC',f"{q('Base de cálculo')}!$C${r}"); r+=1
hdr(ws,r,2,['Passo','R$','% do faturamento','Índice','Sobre o quê','De onde vem o número']); r+=1; s0=r
ST=[('Faturamento da tricologia','=BC_REC',None,'Tudo o que os atendimentos da Dra. Patrícia faturam no mês','Relatório de transações'),
 ('1. (−) PIS e COFINS','=-BC_REC*(I_PIS+I_COFINS)','=I_PIS+I_COFINS','Faturamento','Lei: 0,65% + 3% no Lucro Presumido. A clínica recolhe sobre todo o faturamento.'),
 ('2. (−) Taxas de cartão e antecipação','=-BC_REC*I_CARTAO','=I_CARTAO','Faturamento','O que a maquininha e o banco cobraram da clínica: média de 2,2% do faturamento.'),
 ('3. (−) Insumos e ativos (exemplo pelo índice)','=-BC_REC*I_INS','=I_INS','Valor real das compras do mês','Notas fiscais das compras de material da tricologia. No mês real usa o valor da nota, não o índice.'),
 ('4. (−) Viagens: passagem, hotel, alimentação, transporte','=-BC_REC*I_VIAG','=I_VIAG','Valor real das despesas','A clínica paga e desconta da receita da tricologia, com comprovante.'),
 ('5. (−) Outras despesas diretas','=-BC_REC*I_OUT','=I_OUT','Valor real das despesas','Recepção e ambientação dos dias de atendimento.'),
 ('6. (−) Taxa de estrutura da clínica','=-BC_REC*I_EST','=I_EST','Faturamento','Parte 1 desta aba: R$ 90.597,90 ÷ R$ 490.703,22 = 18,46%.'),
 ('7. (−) Amortização do investimento','=-I_AMORT',None,'Valor fixo por 24 meses','Aparelhos + consultoria de implantação (R$ 61.139,78) ÷ 24.'),
 ('8. (−) IRPJ e CSLL','=-BC_REC*I_IRCS_P','=I_IRCS_P','Faturamento (procedimentos)','Lei: Lucro Presumido. Consultas pagam 7,68%.'),
 ('(=) Resultado a dividir',f'=SUM(C{s0}:C{s0+8})',None,'',''),
 ('Dra. Patrícia — 50%',f'=C{s0+9}*I_PAT','=I_PAT','Resultado',''),
 ('Clínica Núcleo — 50%',f'=C{s0+9}*I_CLI','=I_CLI','Resultado','')]
for i,(lab,f,idx,sobre,fonte) in enumerate(ST):
    k='t' if lab.startswith('(=)') or i==0 else ('k' if '50%' in lab else 'n')
    fill=F_TOT if k=='t' else (F_OK if k=='k' else None); font=FT_B if k!='n' else FT_N
    put(ws,r,2,lab,border=B_ALL,font=font,fill=fill); put(ws,r,3,f,fmt=NUM,border=B_ALL,font=font,fill=fill)
    put(ws,r,4,f'=IFERROR(C{r}/BC_REC,0)',fmt=PCT2,border=B_ALL,font=font,fill=fill); put(ws,r,5,idx,fmt=PCT2,border=B_ALL)
    put(ws,r,6,sobre,border=B_ALL,align=WRAP,font=FT_NOTE); put(ws,r,7,fonte,border=B_ALL,align=WRAP,font=FT_NOTE); ws.row_dimensions[r].height=30; r+=1
put(ws,r,2,'Clínica Núcleo — total (50% + estrutura + amortização)',border=B_ALL,font=FT_B,fill=F_OK); put(ws,r,3,f'=C{s0+11}-C{s0+6}-C{s0+7}',fmt=NUM,border=B_ALL,font=FT_B,fill=F_OK)
put(ws,r,4,f'=IFERROR(C{r}/BC_REC,0)',fmt=PCT2,border=B_ALL,font=FT_B,fill=F_OK); r+=2
put(ws,r,2,'A estrutura e a amortização não são lucro da clínica: pagam a sala, a equipe, o sistema e os aparelhos que a parceria usa. A partilha começa nas receitas de outubro/2026.',font=FT_NOTE,align=WRAP)
ws.merge_cells(start_row=r,start_column=2,end_row=r,end_column=7); ws.row_dimensions[r].height=30
ws.freeze_panes='A4'

# ================= Calculadora
ws=wb['Calculadora']; title(ws,'Calculadora da partilha — digite a receita e veja quanto fica para cada um','Amarelo = você digita. O resto calcula sozinho com os índices da aba "Índices".')
for col,w in zip('ABCDE',[4,58,18,14,70]): ws.column_dimensions[col].width=w
put(ws,4,2,'ENTRADAS',font=FT_T2)
INP=[(5,'Receita bruta da parceria no mês (R$)',100000,'C_REC','Tudo o que a parceria faturou (ou recebeu, se a regra for o recebido).'),
 (6,'   dos quais: consultas (R$)',0,'C_CONS','Opcional. Consulta paga IRPJ/CSLL maior (7,68%). Se não souber, deixe zero.'),
 (7,'Insumos do mês (R$) — vazio = usa o índice',None,'C_INS','Valor real das compras de material da tricologia. Vazio: aplica 3,49%.'),
 (8,'Viagens do mês: passagem, hotel, alimentação (R$) — vazio = usa o índice',None,'C_VIAG','Pagos pela clínica e descontados da receita. Vazio: aplica 0,69% (índice subestimado).'),
 (9,'Outras despesas diretas (R$) — vazio = usa o índice',None,'C_OUT','Recepção e ambientação dos dias de atendimento. Vazio: aplica 0,43%.'),
 (10,'Prejuízo de meses anteriores a compensar (R$, positivo)',0,'C_PREJ','Se um mês anterior fechou negativo, o valor é compensado antes da nova partilha.'),
 (11,'Descontar a amortização do investimento neste mês? (SIM/NÃO)','SIM','C_AM','SIM por 24 meses a partir de out/26 (início da partilha).')]
for rr,lab,v,nm,nt in INP:
    put(ws,rr,2,lab,border=B_ALL); inp(ws,rr,3,v,NUM if rr!=11 else None); put(ws,rr,5,nt,font=FT_NOTE,align=WRAP); name(nm,f"{q('Calculadora')}!$C${rr}")
dv=DataValidation(type='list',formula1='"SIM,NÃO"',allow_blank=False); ws.add_data_validation(dv); dv.add('C11')
put(ws,13,2,'CÁLCULO',font=FT_T2)
hdr(ws,14,2,['Linha','R$','% da receita','Explicação para a Dra. Patrícia'])
CALC=[(15,'Receita bruta da parceria','=C_REC','t','O que foi faturado com os atendimentos dela.'),
 (16,'(−) PIS','=-C_REC*I_PIS','n','Imposto federal sobre o faturamento (0,65%).'),
 (17,'(−) COFINS','=-C_REC*I_COFINS','n','Imposto federal sobre o faturamento (3%).'),
 (18,'(−) ISS','=-C_REC*I_ISS','n','Imposto municipal. Hoje zero: a clínica paga ISS fixo anual.'),
 (19,'(−) Taxas de cartão e antecipação','=-C_REC*I_CARTAO','n','O que a maquininha e o banco cobram para receber as vendas (2,2%).'),
 (20,'(=) Receita líquida','=SUM(C15:C19)','t','O que sobra depois dos impostos e das taxas.'),
 (21,'(−) Insumos e ativos','=-IF(C_INS="",C_REC*I_INS,C_INS)','n','Produtos usados nos procedimentos (ativos, seringas, luvas, gazes).'),
 (22,'(−) Viagens e estadia','=-IF(C_VIAG="",C_REC*I_VIAG,C_VIAG)','n','Passagem, hotel, alimentação e transporte das visitas, pagos pela clínica.'),
 (23,'(−) Outras despesas diretas','=-IF(C_OUT="",C_REC*I_OUT,C_OUT)','n','Recepção e ambientação dos dias de atendimento.'),
 (24,'(−) Taxa de estrutura da clínica','=-C_REC*I_EST','n','A parte do custo fixo da clínica que a parceria usa: sala, equipe de apoio, recepção, energia, sistema, limpeza, contabilidade. É o mesmo peso que a estrutura tem no faturamento da clínica (18,46%).'),
 (25,'(=) Resultado operacional','=C20+SUM(C21:C24)','t','Quanto a operação gerou antes do investimento e dos impostos sobre o lucro.'),
 (26,'(−) Amortização do investimento','=-IF(C_AM="SIM",I_AMORT,0)','n','Parcela mensal que devolve à clínica os aparelhos e a consultoria de implantação (R$ 61,1 mil em 24 meses).'),
 (27,'(−) IRPJ e CSLL','=-(C_CONS*I_IRCS_C+(C_REC-C_CONS)*I_IRCS_P)','n','Impostos sobre o lucro, calculados sobre o faturamento (regime presumido).'),
 (28,'(=) Resultado do mês','=C25+C26+C27','t','Lucro líquido da parceria no mês.'),
 (29,'(−) Prejuízo de meses anteriores','=-C_PREJ','n','Compensação de mês anterior negativo.'),
 (30,'(=) Base de partilha','=MAX(0,C28+C29)','t','Se der negativo, não há partilha e o valor vai para o mês seguinte.'),
 (31,'Dra. Patrícia — 50%','=C30*I_PAT','k','O valor que ela recebe, contra nota fiscal da empresa dela.'),
 (32,'Clínica Núcleo — 50%','=C30*I_CLI','k','A parte da clínica no resultado.'),
 (33,'Clínica Núcleo — total (50% + estrutura + amortização)','=C32-C24-C26','k','Tudo o que fica com a clínica: a parte dela, mais a estrutura e o investimento que ela repõe.'),
 (34,'Prejuízo que passa para o mês seguinte','=-MIN(0,C28+C29)','n','Preencher na entrada "Prejuízo de meses anteriores" do mês seguinte.')]
for rr,lab,f,k,ex in CALC:
    fill=F_TOT if k=='t' else (F_OK if k=='k' else None); font=FT_B if k in ('t','k') else FT_N
    put(ws,rr,2,lab,border=B_ALL,font=font,fill=fill); put(ws,rr,3,f,fmt=NUM,border=B_ALL,font=font,fill=fill)
    put(ws,rr,4,f'=IFERROR(C{rr}/C$15,0)',fmt=PCT,border=B_ALL,font=font,fill=fill); put(ws,rr,5,ex,font=FT_NOTE,align=WRAP); ws.row_dimensions[rr].height=30
put(ws,36,2,'Resumo: de cada R$ 100 faturados',font=FT_T2)
for i,(lab,f) in enumerate([('Impostos, taxas de cartão e IRPJ/CSLL','=-(C16+C17+C18+C19+C27)'),('Insumos, viagens e despesas diretas','=-(C21+C22+C23)'),
                            ('Estrutura e investimento (vão para a clínica)','=-(C24+C26)'),('Partilha da clínica','=C32'),('Partilha da Dra. Patrícia','=C31')]):
    rr=37+i; put(ws,rr,2,lab,border=B_ALL); put(ws,rr,3,f,fmt=NUM,border=B_ALL); put(ws,rr,4,f'=IFERROR(C{rr}/C$15*100,0)',fmt='"R$ "0.00',border=B_ALL)
put(ws,42,2,'Confere (soma = receita, quando não há prejuízo a compensar)',font=FT_NOTE); put(ws,42,3,'=SUM(C37:C41)',fmt=NUM,font=FT_NOTE)
ws.freeze_panes='A5'
# ================= Lançamento mensal
ws=wb['Lançamento mensal']; title(ws,'Lançamento mensal da parceria — a partir de outubro/2026','A partilha começa nas receitas de out/26. Até set/26 a receita da tricologia é 100% da clínica. Digite um mês por coluna nas células amarelas.')
ws.column_dimensions['A'].width=4; ws.column_dimensions['B'].width=52
MESES=[(2026,10),(2026,11),(2026,12),(2027,1),(2027,2),(2027,3),(2027,4),(2027,5),(2027,6),(2027,7),(2027,8),(2027,9)]
MN=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
for i in range(len(MESES)+1): ws.column_dimensions[L(3+i)].width=14
hdr(ws,4,2,['Linha']+[f'{MN[m-1]}/{str(y)[2:]}' for y,m in MESES]+['Total'])
REAL={}
ROWS=[(5,'ENTRADAS (amarelo)',None,'sec'),
 (6,'Receita — consultas da Dra. Patrícia','c','in'),(7,'Receita — procedimentos de tricologia','t','in'),(8,'Receita — facial e corporal da Dra. Patrícia','f','in'),
 (9,'Insumos e ativos (R$; vazio = índice)','ins','in'),(10,'Viagens: passagem, hotel, alimentação (R$; vazio = índice)','vi','in'),(11,'Outras despesas diretas (R$; vazio = índice)','ou','in'),
 (12,'Facial e corporal entram na parceria? (SIM/NÃO)',None,'set'),
 (14,'CÁLCULO',None,'sec')]
for rr,lab,key,k in ROWS:
    if k=='sec': put(ws,rr,2,lab,font=FT_T2); continue
    put(ws,rr,2,lab,border=B_ALL)
    if k=='set':
        inp(ws,rr,3,'SIM'); name('M_FC',f"{q('Lançamento mensal')}!$C${rr}")
        dv=DataValidation(type='list',formula1='"SIM,NÃO"',allow_blank=False); ws.add_data_validation(dv); dv.add(f'C{rr}')
        put(ws,rr,4,'← vale para todos os meses',font=FT_NOTE); continue
    for i in range(len(MESES)):
        v=REAL.get(i,{}).get(key) if i in REAL else None
        if i in REAL and key in ('ins','vi','ou') and v==0: v=0
        inp(ws,rr,3+i,v,NUM)
put(ws,13,2,'Prejuízo inicial a compensar (zero: o período até set/26 foi 100% da clínica)',border=B_ALL); inp(ws,13,3,0,NUM)
CL=[(15,'Receita bruta da parceria',lambda c:f'={c}6+{c}7+IF(M_FC="SIM",{c}8,0)','t'),
 (16,'(−) PIS, COFINS e ISS',lambda c:f'=-{c}15*(I_PIS+I_COFINS+I_ISS)','n'),
 (17,'(−) Taxas de cartão e antecipação',lambda c:f'=-{c}15*I_CARTAO','n'),
 (18,'(−) Insumos e ativos',lambda c:f'=-IF({c}9="",{c}15*I_INS,{c}9)','n'),
 (19,'(−) Viagens e estadia',lambda c:f'=-IF({c}10="",{c}15*I_VIAG,{c}10)','n'),
 (20,'(−) Outras despesas diretas',lambda c:f'=-IF({c}11="",{c}15*I_OUT,{c}11)','n'),
 (21,'(−) Taxa de estrutura da clínica',lambda c:f'=-{c}15*I_EST','n'),
 (22,'(−) Amortização do investimento',lambda c:f'=-IF({c}15>0,I_AMORT,0)','n'),
 (23,'(−) IRPJ e CSLL',lambda c:f'=-({c}6*I_IRCS_C+({c}15-{c}6)*I_IRCS_P)','n'),
 (24,'(=) Resultado do mês',lambda c:f'=SUM({c}15:{c}23)','t'),
 (25,'Prejuízo de meses anteriores',None,'n'),
 (26,'(=) Base de partilha',lambda c:f'=MAX(0,{c}24+{c}25)','t'),
 (27,'Dra. Patrícia — 50%',lambda c:f'={c}26*I_PAT','k'),
 (28,'Clínica Núcleo — 50%',lambda c:f'={c}26*I_CLI','k'),
 (29,'Clínica — total (50% + estrutura + amortização)',lambda c:f'={c}28-{c}21-{c}22','k'),
 (30,'Prejuízo que passa para o mês seguinte',lambda c:f'=MIN(0,{c}24+{c}25)','n'),
 (31,'Dra. Patrícia — % da receita',lambda c:f'=IFERROR({c}27/{c}15,0)','p')]
TC=L(3+len(MESES))
for rr,lab,fn,k in CL:
    fill=F_TOT if k=='t' else (F_OK if k=='k' else None); font=FT_B if k in ('t','k') else FT_N; fmt=PCT if k=='p' else NUM
    put(ws,rr,2,lab,border=B_ALL,font=font,fill=fill)
    for i in range(len(MESES)):
        c=L(3+i)
        if rr==25: v='=-C13' if i==0 else f'={L(2+i)}30'
        else: v=fn(c)
        put(ws,rr,3+i,v,fmt=fmt,border=B_ALL,font=font,fill=fill)
    if k=='p': put(ws,rr,3+len(MESES),f'=IFERROR({TC}27/{TC}15,0)',fmt=fmt,border=B_ALL,font=FT_B)
    elif rr in (25,30): put(ws,rr,3+len(MESES),None,border=B_ALL)
    else: put(ws,rr,3+len(MESES),f'=SUM(C{rr}:{L(2+len(MESES))}{rr})',fmt=fmt,border=B_ALL,font=FT_B,fill=fill)
put(ws,33,2,'Jul a set/26 não entram aqui: foram o período anterior à partilha (100% da clínica). Os números reais desses meses estão na planilha principal, aba 03.',font=FT_NOTE)
put(ws,34,2,'A amortização entra em todo mês com receita, até completar 24 parcelas (set/28).',font=FT_NOTE)
put(ws,35,2,'Regra do repasse: pelo projeto de 13/08, o acerto com a Dra. Patrícia é feito sobre o valor RECEBIDO e conciliado. Se for essa a regra, digite na receita o que entrou no caixa no mês.',font=FT_NOTE)
ws.freeze_panes='C5'
# ================= Como explicar
ws=wb['Como explicar']; title(ws,'Como explicar a conta para a Dra. Patrícia','Texto simples, na ordem da conta.')
ws.column_dimensions['A'].width=4; ws.column_dimensions['B'].width=34; ws.column_dimensions['C'].width=100
EXP=[('Quando começa','A divisão vale para as receitas a partir de outubro/2026. Até setembro, a receita da tricologia é 100% da clínica, inclusive as parcelas de cartão dessas vendas que entram depois.'),
 ('A regra','Tudo o que a parceria fatura, menos tudo o que ela custa, é dividido meio a meio: 50% para a Dra. Patrícia, 50% para a clínica.'),
 ('1. Impostos (3,65%)','PIS e COFINS são cobrados pelo governo sobre todo faturamento da clínica. A parte da tricologia sai da receita da tricologia.'),
 ('2. Cartão (2,2%)','Quando o paciente paga no cartão, a maquininha e o banco ficam com uma parte. A média da clínica é 2,2% do faturamento.'),
 ('3. Insumos','Ativos, seringas, luvas, gazes e pentes usados nos atendimentos. Entram pelo valor real das compras.'),
 ('4. Viagens','Passagem, hotel, alimentação e transporte das visitas da Dra. Patrícia. A clínica paga e desconta da receita da tricologia.'),
 ('5. Estrutura (18,46%)','A clínica tem um custo fixo para qualquer atendimento acontecer: sala, equipe de apoio, recepção, energia, sistema, limpeza, contabilidade. Em jul–set esse custo foi R$ 90,6 mil por mês, contra R$ 490,7 mil de faturamento: 18,46%. A tricologia paga o mesmo peso sobre o que ela fatura.'),
 ('6. Investimento','A clínica comprou os aparelhos (R$ 21,1 mil) e pagou a consultoria de implantação (R$ 40 mil). Esse valor volta em 24 parcelas de R$ 2.547, de out/26 a set/28. Os aparelhos continuam sendo da clínica.'),
 ('7. IRPJ e CSLL','Impostos sobre o lucro, calculados sobre o faturamento: 2,28% nos procedimentos e 7,68% nas consultas.'),
 ('8. Partilha','O que sobra é dividido 50/50. Se um mês fechar negativo, ninguém recebe e o valor é compensado no mês seguinte.'),
 ('Exemplo com R$ 100 mil','Com R$ 100.000 de faturamento (só procedimentos, insumos e viagens pelos índices), sobram cerca de R$ 66,3 mil para dividir: R$ 33,1 mil para a Dra. Patrícia e R$ 54,1 mil para a clínica (R$ 33,1 mil da partilha + R$ 18,5 mil de estrutura + R$ 2,5 mil do investimento). Veja a aba Calculadora.')]
r=4
for a,b_ in EXP: put(ws,r,2,a,font=FT_B,border=B_ALL,align=WRAP); put(ws,r,3,b_,border=B_ALL,align=WRAP); ws.row_dimensions[r].height=46; r+=1
# ================= Como usar
ws=wb['Como usar']; title(ws,'Calculadora da Parceria de Tricologia — Clínica Núcleo','Controladoria · 08/10/2026')
ws.column_dimensions['A'].width=4; ws.column_dimensions['B'].width=110
r=4
for t in ['A partilha com a Dra. Patrícia começa nas receitas de outubro/2026. Até setembro, a receita da tricologia é 100% da clínica.',
 'Base de cálculo: quanto a clínica gasta por mês para funcionar, o que entra na taxa cobrada da parceria e o que fica de fora. É a aba para mostrar à Dra. Patrícia.',
 'Índices: todas as taxas padrão da clínica, com o cálculo e a fonte de cada uma. A taxa de estrutura (18,46%) está detalhada conta a conta.',
 'Calculadora: digite a receita do mês (ex.: 100.000) e a planilha desconta tudo na ordem e mostra quanto fica para a Dra. Patrícia e para a clínica.',
 'Lançamento mensal: um mês por coluna, de out/26 a set/27, com o prejuízo e a amortização passando de um mês para o outro.',
 'Como explicar: o texto, item por item, para mostrar à Dra. Patrícia de onde vem cada desconto.',
 'Amarelo = você digita. Branco = calcula sozinho. Mudou um índice na aba Índices, todas as abas recalculam.']:
    put(ws,r,2,'• '+t,align=WRAP); ws.row_dimensions[r].height=30; r+=1
for s in wb.worksheets: s.sheet_view.showGridLines=False
wb.save(OUT); print('ok')
