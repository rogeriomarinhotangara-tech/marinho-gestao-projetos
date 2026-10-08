"""Planilha simples para a Dra. Patrícia: fechamento de Cruzeiro do Sul (05–07/10/2026) com custo de sala.
Uso: python3 -I build_simples.py <scratch> <saida.xlsx>"""
import sys, json
import pandas as pd, openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.workbook.defined_name import DefinedName
SP, OUT = sys.argv[1], sys.argv[2]
O = json.load(open(SP + '/out/out26.json', encoding='utf-8'))
b = pd.read_pickle(SP + '/ref/base_v2_out.pkl')

# ---------------- dados reais
LINES = O['lines']
TIPOS = [('cons', 'Consultas', 'FAT_CONS'), ('tri', 'Tricologia', 'FAT_TRI'), ('fac', 'Facial', 'FAT_FAC'), ('pes', 'Pescoço', 'FAT_PES'), ('cor', 'Corporal', 'FAT_COR')]
SRV = {'CONSULTA DRA PATRICIA FABRINI': 'cons', 'TRICOLOGIA': 'tri', 'FACIAL DRA PATRICIA': 'fac', 'PESCOÇO DRA PATRICIA': 'pes', 'CORPORAL DRA PATRICIA': 'cor'}
PAC = {}
for l in LINES:
    p = PAC.setdefault(l['p'], dict.fromkeys([t[0] for t in TIPOS] + ['cred'], 0.0))
    p[SRV[l['srv']]] += l['v']
    if 'cr' in l['met'].lower() and 'dito' in l['met'].lower(): p['cred'] += l['vs']
TOTP = lambda p: sum(p[t[0]] for t in TIPOS)
PAC_ORD = sorted(PAC.items(), key=lambda x: -TOTP(x[1]))
assert abs(sum(map(TOTP, PAC.values())) - 73250) < 0.01 and abs(sum(p['cred'] for p in PAC.values()) - 34100) < 0.01
assert abs(sum(p['cons'] for p in PAC.values()) - 4900) < 0.01
# custo fixo mensal de Cruzeiro do Sul (estrutura), média jul–set/2026
e = b[(b['R/D'] == 'Despesa') & (b.Estrutura == 'SIM') & (b.Mes.isin([202607, 202608, 202609])) & (b.Unidade == 'Cruzeiro do Sul')]
avg = (e.groupby('Conta analítica').Valor.sum() / 3)
GRP = [('Aluguel do imóvel', ['Aluguel de imóvel']), ('Energia elétrica', ['Energia elétrica']), ('Internet', ['Internet e links de dados']),
       ('Vigilância e segurança', ['Vigilância e segurança']), ('Manutenção e pequenos reparos', ['Pequenos reparos e materiais de manutenção']),
       ('Limpeza, recepção e utensílios', ['Material de limpeza e higienização', 'Material de recepção e ambientação', 'Utensílios de baixo valor']),
       ('Equipe de apoio — salários', ['Salários — equipe clínica e enfermagem']),
       ('Equipe de apoio — INSS e FGTS', ['INSS patronal', 'FGTS']), ('Equipe de apoio — benefícios e saúde ocupacional', ['Auxílio combustível', 'PCMSO, PGR, LTCAT e saúde ocupacional']),
       ('Refeições da equipe', ['Refeições administrativas']), ('Contabilidade e material de escritório', ['Contabilidade', 'Material de escritório']),
       ('Alvarás e taxas de funcionamento', ['Alvará municipal e taxas de funcionamento']), ('Coleta de lixo de saúde', ['Coleta e destinação de resíduos de saúde']),
       ('Tarifas bancárias', ['Tarifas bancárias'])]
used = set(sum((g[1] for g in GRP), []))
assert set(avg.index) <= used, set(avg.index) - used
CF = [(lab, round(float(sum(avg.get(k, 0) for k in ks)), 6)) for lab, ks in GRP]
CF_TOT = round(sum(v for _, v in CF), 2)
CF_NOTE = {'Equipe de apoio — salários': 'Recepção, enfermagem e limpeza', 'Equipe de apoio — INSS e FGTS': 'Encargos sobre os salários acima', 'Alvarás e taxas de funcionamento': 'Alvará, vigilância sanitária e taxas da prefeitura'}
assert abs(CF_TOT - float(avg.sum())) < 0.05, (CF_TOT, avg.sum())

# ---------------- estilo (simples, letra grande)
PET = '0A6A70'; INK = '10272B'
F_HEAD = PatternFill('solid', fgColor=PET); F_IN = PatternFill('solid', fgColor='FFF2CC'); F_TOT = PatternFill('solid', fgColor='EEF3F3')
F_PAT = PatternFill('solid', fgColor='DCEBFA'); F_CLI = PatternFill('solid', fgColor='DDF1E7'); F_NOTE = PatternFill('solid', fgColor='F7F9F9')
thin = Side(style='thin', color='C9D4D4'); BOX = Border(left=thin, right=thin, top=thin, bottom=thin)
def F(size=13, bold=False, color=INK, italic=False): return Font(name='Calibri', size=size, bold=bold, color=color, italic=italic)
BRL = '"R$" #,##0.00;[Red]-"R$" #,##0.00;"R$" 0,00'
PCT = '0.00%'
wb = openpyxl.Workbook()
def name(n, ref): wb.defined_names[n] = DefinedName(n, attr_text=ref)
def q(s): return "'" + s + "'"
def setup(ws, widths, title, sub, landscape=False):
    ws.sheet_view.showGridLines = False; ws.sheet_view.zoomScale = 110
    for i, w in enumerate(widths): ws.column_dimensions[chr(65 + i)].width = w
    ws['A1'] = title; ws['A1'].font = F(20, True, PET); ws.row_dimensions[1].height = 34
    ws['A2'] = sub; ws['A2'].font = F(12, False, '4A5F63', True); ws.row_dimensions[2].height = 22
    ws.page_setup.orientation = 'landscape' if landscape else 'portrait'; ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.page_setup.fitToWidth = 1; ws.page_setup.fitToHeight = 0; ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.oddFooter.left.text = 'Clínica Núcleo S · Parceria de Tricologia'; ws.oddFooter.right.text = 'Página &P de &N'
def head(ws, r, vals, h=34):
    for i, v in enumerate(vals):
        c = ws.cell(r, 1 + i, v); c.fill = F_HEAD; c.font = F(13, True, 'FFFFFF'); c.border = BOX
        c.alignment = Alignment(horizontal='left' if i == 0 else 'center', vertical='center', wrap_text=True)
    ws.row_dimensions[r].height = h
def cell(ws, r, c, v, fmt=None, bold=False, fill=None, size=13, color=INK, wrap=False, h=None, italic=False):
    x = ws.cell(r, c, v); x.font = F(size, bold, color, italic); x.border = BOX
    if fmt: x.number_format = fmt
    if fill: x.fill = fill
    x.alignment = Alignment(vertical='center', wrap_text=wrap, horizontal=h)
    return x
def edit(ws, r, c, v, fmt=None):  # campo editável (amarelo, azul)
    return cell(ws, r, c, v, fmt, fill=F_IN, color='1F4FBF', bold=True)
def note(ws, r, text, cols=4, size=11):
    x = ws.cell(r, 1, text); x.font = F(size, False, '4A5F63', True); x.alignment = Alignment(wrap_text=True, vertical='top')
    ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=cols); ws.row_dimensions[r].height = 18 * max(1, len(text) // 95 + 1)

SH = ['Resumo', 'Receitas', 'Despesas', 'Custo da sala', 'Passagens', 'Como foi feito']
wb.active.title = SH[0]
for s in SH[1:]: wb.create_sheet(s)
L = openpyxl.utils.get_column_letter
BRL0 = '"R$" #,##0.00;[Red]-"R$" #,##0.00;"–"'

# ================= Receitas
ws = wb['Receitas']
setup(ws, [40, 16, 16, 14, 14, 14, 17, 20], 'Receitas — Cruzeiro do Sul, 05 a 07/10/2026', 'Quanto cada paciente pagou, separado por tipo de serviço. Os campos amarelos podem ser alterados.', landscape=True)
head(ws, 4, ['Paciente'] + [t[1] + ' (R$)' for t in TIPOS] + ['Total (R$)', 'Pago no cartão de crédito (R$)'], 40)
r = 5; f0 = r
for n, p in PAC_ORD:
    cell(ws, r, 1, n.title(), bold=True)
    for i, t in enumerate(TIPOS): edit(ws, r, 2 + i, round(p[t[0]], 2), BRL0)
    cell(ws, r, 7, f'=SUM(B{r}:F{r})', BRL, bold=True); edit(ws, r, 8, round(p['cred'], 2), BRL0); ws.row_dimensions[r].height = 24; r += 1
f1 = r - 1
cell(ws, r, 1, 'TOTAL', bold=True, fill=F_TOT)
for c in range(2, 9): cell(ws, r, c, f'=SUM({L(c)}{f0}:{L(c)}{f1})', BRL, True, F_TOT)
ws.row_dimensions[r].height = 28; tr = r
for i, t in enumerate(TIPOS): name(t[2], f"Receitas!${L(2 + i)}${tr}")
name('FAT_TOT', f"Receitas!$G${tr}"); name('FAT_CRED', f"Receitas!$H${tr}")
r += 2
ws.cell(r, 1, 'Receita por tipo de serviço').font = F(15, True, PET); ws.row_dimensions[r].height = 26; r += 1
head(ws, r, ['Tipo de receita', 'Valor (R$)', '% do total'], 28); r += 1; s0 = r
for t in TIPOS:
    cell(ws, r, 1, t[1]); cell(ws, r, 2, '=' + t[2], BRL); cell(ws, r, 3, f'=IFERROR(B{r}/FAT_TOT,0)', PCT); ws.row_dimensions[r].height = 24; r += 1
cell(ws, r, 1, 'RECEITA BRUTA TOTAL', bold=True, fill=F_TOT); cell(ws, r, 2, f'=SUM(B{s0}:B{r-1})', BRL, True, F_TOT); cell(ws, r, 3, f'=IFERROR(B{r}/FAT_TOT,0)', PCT, True, F_TOT)
ws.row_dimensions[r].height = 26; r += 2
ws.cell(r, 1, 'Receita por forma de pagamento').font = F(15, True, PET); ws.row_dimensions[r].height = 26; r += 1
head(ws, r, ['Forma de pagamento', 'Valor (R$)', '% do total'], 28); r += 1; s0 = r
cell(ws, r, 1, 'Cartão de crédito'); cell(ws, r, 2, '=FAT_CRED', BRL); cell(ws, r, 3, f'=IFERROR(B{r}/FAT_TOT,0)', PCT); ws.row_dimensions[r].height = 24; r += 1
cell(ws, r, 1, 'PIX e dinheiro'); cell(ws, r, 2, '=FAT_TOT-FAT_CRED', BRL); cell(ws, r, 3, f'=IFERROR(B{r}/FAT_TOT,0)', PCT); ws.row_dimensions[r].height = 24; r += 1
cell(ws, r, 1, 'TOTAL', bold=True, fill=F_TOT); cell(ws, r, 2, f'=SUM(B{s0}:B{r-1})', BRL, True, F_TOT); cell(ws, r, 3, f'=IFERROR(B{r}/FAT_TOT,0)', PCT, True, F_TOT); ws.row_dimensions[r].height = 26; r += 2
note(ws, r, 'Consultas pelo valor total: R$ 800 ou R$ 900 (a 1ª parte, paga antes de outubro, já está somada aqui). Incluídos, conforme a diretoria em 08/10: o pescoço de R$ 8.100 e o saldo de R$ 5.000 do corporal, considerado pago. Sobre o valor pago no cartão de crédito incidem a taxa da maquininha e a antecipação.', 8)
ws.freeze_panes = 'B5'

# ================= Passagens
ws = wb['Passagens']
setup(ws, [16, 40, 16, 22], 'Passagens aéreas da viagem', 'São Paulo → Cruzeiro do Sul → Rio Branco → São Paulo · pagas no cartão da clínica (fatura de 05/10/2026)')
head(ws, 4, ['Data', 'Descrição na fatura', 'Parcela', 'Valor (R$)'])
r = 5; p0 = r
for x in O['pass_']:
    cell(ws, r, 1, x[0]); cell(ws, r, 2, x[1].replace('*', ' ')); cell(ws, r, 3, x[3] or '—'); edit(ws, r, 4, x[4], BRL); ws.row_dimensions[r].height = 22; r += 1
def lab3(ws, r, text, fill=None, size=13, color=INK):
    for c in (1, 2, 3): cell(ws, r, c, text if c == 1 else None, bold=True, fill=fill, size=size, color=color)
    ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=3)
lab3(ws, r, 'TOTAL DAS PASSAGENS NA FATURA', F_TOT); cell(ws, r, 4, f'=SUM(D{p0}:D{r-1})', BRL, True, F_TOT); name('PASS_FAT', f"Passagens!$D${r}"); ws.row_dimensions[r].height = 26; r += 1
lab3(ws, r, 'Parte descontada neste fechamento'); edit(ws, r, 4, 1.0, '0%'); name('PASS_PCT', f"Passagens!$D${r}"); ws.row_dimensions[r].height = 26; r += 1
lab3(ws, r, 'PASSAGENS DESCONTADAS (vai para o Resumo)', F_CLI, 14); cell(ws, r, 4, '=ROUND(PASS_FAT*PASS_PCT,2)', BRL, True, F_CLI, 14); name('PASS_TOT', f"Passagens!$D${r}"); ws.row_dimensions[r].height = 30; r += 2
note(ws, r, '100% = todas as passagens da fatura saem da receita de Cruzeiro do Sul. Se uma parte da viagem for cobrada no fechamento de Rio Branco, troque a porcentagem (o fechamento anterior usava 75%). O bilhete de R$ 2.160,00 foi parcelado em 2 vezes: a 2ª parcela vem na fatura de novembro.', 4)

# ================= Custo da sala (cálculo detalhado)
ws = wb['Custo da sala']
setup(ws, [56, 20, 18, 64], 'Custo da sala — cálculo detalhado', 'Quanto custa usar uma sala da clínica de Cruzeiro do Sul por um dia de atendimento. Campos amarelos podem ser alterados.', landscape=True)
r = 4
ws.cell(r, 1, 'Passo 1 — Quanto custa manter a clínica de Cruzeiro do Sul funcionando por mês').font = F(15, True, PET); ws.row_dimensions[r].height = 26; r += 1
x = ws.cell(r, 1, 'Valores por mês: média de julho a setembro/2026, tirada do relatório de transações do sistema.'); x.font = F(12, False, '4A5F63', True); r += 1
head(ws, r, ['Despesa fixa da unidade', 'R$ por mês', '', 'Observação']); r += 1; c0 = r
for lab, v in CF:
    cell(ws, r, 1, lab, wrap=True); edit(ws, r, 2, v, BRL); cell(ws, r, 3, ''); cell(ws, r, 4, CF_NOTE.get(lab), size=11, color='4A5F63'); ws.row_dimensions[r].height = 26; r += 1
cell(ws, r, 1, 'TOTAL — custo fixo mensal de Cruzeiro do Sul', bold=True, fill=F_TOT); cell(ws, r, 2, f'=SUM(B{c0}:B{r-1})', BRL, True, F_TOT); cell(ws, r, 3, '', fill=F_TOT); cell(ws, r, 4, '', fill=F_TOT)
name('SALA_CF', f"{q('Custo da sala')}!$B${r}"); ws.row_dimensions[r].height = 26; r += 1
note(ws, r, 'São as despesas que existem para a clínica abrir as portas: aluguel, energia, equipe de apoio, limpeza, segurança, alvarás. Não entram medicamentos, honorários de médicos, marketing nem retiradas dos sócios.', 4, 11); r += 2
ws.cell(r, 1, 'Passo 2 — Quantas salas a clínica tem e quanto tempo elas ficam disponíveis').font = F(15, True, PET); ws.row_dimensions[r].height = 26; r += 1
head(ws, r, ['Item', 'Valor', '', 'Observação']); r += 1
cell(ws, r, 1, 'Salas de atendimento em Cruzeiro do Sul'); edit(ws, r, 2, 4, '0'); cell(ws, r, 3, ''); cell(ws, r, 4, 'A CONFIRMAR: contar consultórios + salas de procedimento + soroterapia', size=11, color='B3382F', bold=True); name('SALA_N', f"{q('Custo da sala')}!$B${r}"); r += 1
cell(ws, r, 1, 'Dias de funcionamento por mês'); edit(ws, r, 2, 22, '0'); cell(ws, r, 3, ''); cell(ws, r, 4, 'Dias úteis (planilha de precificação)', size=11, color='4A5F63'); name('SALA_DIAS', f"{q('Custo da sala')}!$B${r}"); r += 1
cell(ws, r, 1, 'Horas de funcionamento por dia'); edit(ws, r, 2, 10, '0'); cell(ws, r, 3, ''); cell(ws, r, 4, 'Planilha de precificação', size=11, color='4A5F63'); name('SALA_H', f"{q('Custo da sala')}!$B${r}"); r += 1
cell(ws, r, 1, 'Taxa de ocupação considerada'); edit(ws, r, 2, 0.65, '0%'); cell(ws, r, 3, ''); cell(ws, r, 4, 'Mesma taxa da planilha de precificação: as salas ficam ocupadas 65% do tempo e o custo do tempo vazio é dividido entre as horas usadas. Se colocar 100%, cobra só o tempo usado.', size=11, color='4A5F63', wrap=True)
ws.row_dimensions[r].height = 52; name('SALA_OCUP', f"{q('Custo da sala')}!$B${r}"); r += 1
cell(ws, r, 1, 'Salas-dia por mês (salas × dias × ocupação)', bold=True, fill=F_TOT); cell(ws, r, 2, '=SALA_N*SALA_DIAS*SALA_OCUP', '#,##0.0', True, F_TOT); cell(ws, r, 3, '', fill=F_TOT); cell(ws, r, 4, '', fill=F_TOT); name('SALA_SD', f"{q('Custo da sala')}!$B${r}"); r += 2
ws.cell(r, 1, 'Passo 3 — Custo de uma sala').font = F(15, True, PET); ws.row_dimensions[r].height = 26; r += 1
head(ws, r, ['Cálculo', 'R$', '', 'Como é feito']); r += 1
cell(ws, r, 1, 'Custo de 1 sala por DIA', bold=True, fill=F_CLI); cell(ws, r, 2, '=ROUND(SALA_CF/SALA_SD,2)', BRL, True, F_CLI); cell(ws, r, 3, ''); cell(ws, r, 4, 'Custo fixo mensal ÷ salas-dia por mês', size=11, color='4A5F63'); name('SALA_DIA', f"{q('Custo da sala')}!$B${r}"); ws.row_dimensions[r].height = 26; r += 1
cell(ws, r, 1, 'Custo de 1 sala por HORA'); cell(ws, r, 2, '=ROUND(SALA_DIA/SALA_H,2)', BRL); cell(ws, r, 3, ''); cell(ws, r, 4, 'Custo por dia ÷ horas de funcionamento', size=11, color='4A5F63'); r += 2
ws.cell(r, 1, 'Passo 4 — Uso pela Dra. Patrícia em Cruzeiro do Sul (05 a 07/10)').font = F(15, True, PET); ws.row_dimensions[r].height = 26; r += 1
head(ws, r, ['Item', 'Valor', '', 'Observação']); r += 1
cell(ws, r, 1, 'Dias de atendimento'); edit(ws, r, 2, 3, '0'); cell(ws, r, 3, ''); cell(ws, r, 4, '05, 06 e 07/10', size=11, color='4A5F63'); name('USO_DIAS', f"{q('Custo da sala')}!$B${r}"); r += 1
cell(ws, r, 1, 'Salas usadas por dia'); edit(ws, r, 2, 1, '0'); cell(ws, r, 3, ''); cell(ws, r, 4, 'Se ela usou consultório e sala de procedimento ao mesmo tempo, coloque 2', size=11, color='4A5F63', wrap=True); name('USO_SALAS', f"{q('Custo da sala')}!$B${r}"); ws.row_dimensions[r].height = 30; r += 1
cell(ws, r, 1, 'TAXA DE OCUPAÇÃO DA SALA (vai para o Resumo)', bold=True, fill=F_CLI, size=14); cell(ws, r, 2, '=SALA_DIA*USO_DIAS*USO_SALAS', BRL, True, F_CLI, size=14); cell(ws, r, 3, '', fill=F_CLI)
cell(ws, r, 4, 'Custo de 1 sala por dia × dias × salas', size=11, color='4A5F63', fill=F_CLI); name('SALA_TAXA', f"{q('Custo da sala')}!$B${r}"); ws.row_dimensions[r].height = 30; r += 2
ws.cell(r, 1, 'Para comparar: custo de 1 sala por dia conforme o nº de salas e a ocupação').font = F(13, True, PET); r += 1
head(ws, r, ['Nº de salas na unidade', 'Ocupação 100%', 'Ocupação 80%', 'Ocupação 65%'], 28); r += 1
for n_ in (3, 4, 5, 6, 7):
    cell(ws, r, 1, f'{n_} salas');
    for c, oc in ((2, 1.0), (3, 0.8), (4, 0.65)): cell(ws, r, c, f'=SALA_CF/({n_}*SALA_DIAS*{oc})', BRL)
    r += 1
r += 1
note(ws, r, 'Mesmo método da planilha "Precificação de Procedimentos" (custo fixo ÷ horas de sala ocupadas), agora com os custos reais de Cruzeiro do Sul. Os custos da administração central lançados em Rio Branco (sistema, jurídico, parte da contabilidade) não estão aqui.', 4, 11)

# ================= Despesas
ws = wb['Despesas']
setup(ws, [42, 22, 12, 20, 58], 'Despesas descontadas da receita bruta', 'Somente estas 7 despesas são descontadas. Cada uma mostra sobre qual valor é calculada, a taxa e o resultado. Taxas em amarelo podem ser alteradas.', landscape=True)
head(ws, 4, ['Despesa', 'Calculada sobre (R$)', 'Taxa', 'Valor (R$)', 'O que é'])
CST = [('1. PIS', '=FAT_TOT', 0.0065, 'Imposto federal sobre a receita bruta', 'C_PIS'),
       ('1. COFINS', '=FAT_TOT', 0.03, 'Imposto federal sobre a receita bruta', 'C_COF'),
       ('2. Taxa do cartão (maquininha)', '=FAT_CRED', 0.0192, 'Cobrada pela máquina nas vendas no cartão de crédito. Medida no relatório: R$ 646,14 sobre R$ 33.600 (1,92%)', 'C_MDR'),
       ('3. Antecipação do cartão', '=FAT_CRED', 0.0874, 'Custo para receber já as vendas parceladas no cartão. Todas as vendas no crédito foram antecipadas', 'C_ANT'),
       ('4. Insumos (material usado)', '=FAT_TOT', 0.0349, 'Ativos, seringas, luvas e descartáveis. Sem compra em outubro: índice da clínica', 'C_INS'),
       ('5. Passagens aéreas', None, None, 'Passagens da viagem (aba Passagens)', 'C_PASS'),
       ('6. Taxa de ocupação da sala', None, None, 'Uso das salas da clínica nos dias de atendimento (aba Custo da sala)', 'C_SALA'),
       ('7. IRPJ e CSLL — consultas', '=FAT_CONS', 0.0768, 'Impostos sobre o lucro das consultas', 'C_IRC'),
       ('7. IRPJ e CSLL — procedimentos', '=FAT_TRI+FAT_FAC+FAT_PES+FAT_COR', 0.0228, 'Impostos sobre o lucro dos procedimentos (tricologia, facial, pescoço e corporal)', 'C_IRP')]
r = 5; k0 = r
for lab, base, tx, oque, nm in CST:
    cell(ws, r, 1, lab, bold=True)
    if base: cell(ws, r, 2, base, BRL); edit(ws, r, 3, tx, PCT); cell(ws, r, 4, f'=ROUND(B{r}*C{r},2)', BRL, True)
    else: cell(ws, r, 2, '—', h='center'); cell(ws, r, 3, '—', h='center'); cell(ws, r, 4, '=PASS_TOT' if nm == 'C_PASS' else '=SALA_TAXA', BRL, True)
    cell(ws, r, 5, oque, size=11, color='4A5F63', wrap=True); ws.row_dimensions[r].height = 36
    name(nm, f"Despesas!$D${r}"); r += 1
cell(ws, r, 1, 'TOTAL DAS DESPESAS', bold=True, fill=F_TOT); cell(ws, r, 2, None, fill=F_TOT); cell(ws, r, 3, None, fill=F_TOT); cell(ws, r, 4, f'=SUM(D{k0}:D{r-1})', BRL, True, F_TOT); cell(ws, r, 5, None, fill=F_TOT)
name('C_TOT', f"Despesas!$D${r}"); ws.row_dimensions[r].height = 28; r += 2
note(ws, r, 'Todas as despesas saem da receita bruta. PIS, COFINS e insumos são calculados sobre a receita bruta; a taxa do cartão e a antecipação, só sobre o que foi pago no cartão de crédito; o IRPJ e a CSLL têm taxas diferentes para consultas e para procedimentos.', 5)

# ================= Resumo
ws = wb['Resumo']
setup(ws, [50, 22, 15, 50], 'Parceria de Tricologia — Cruzeiro do Sul', 'Atendimentos de 05 a 07 de outubro de 2026 · Clínica Núcleo S e Dra. Patrícia Fabrini')
ws['A3'] = 'Da receita bruta saem só as 7 despesas abaixo. O que sobra é dividido meio a meio.'; ws['A3'].font = F(13, True, '4A5F63')
head(ws, 5, ['', 'Valor (R$)', '% da receita', 'O que é'])
def sec(ws, r, text):
    x = ws.cell(r, 1, text); x.font = F(14, True, PET); ws.row_dimensions[r].height = 28
def line(ws, r, lab, f, oq, kind=None):
    fill = {'t': F_TOT, 'res': F_CLI}.get(kind); big = kind in ('t', 'res'); sz = 15 if kind == 'res' else 14 if big else 13
    cell(ws, r, 1, lab, None, big, fill, sz); cell(ws, r, 2, f, BRL, big, fill, sz)
    cell(ws, r, 3, f'=IFERROR(B{r}/FAT_TOT,0)', PCT, big, fill); cell(ws, r, 4, oq, size=11, color='4A5F63', fill=fill, wrap=True)
    ws.row_dimensions[r].height = 32 if big else 26
r = 6; sec(ws, r, 'RECEITAS'); r += 1; r0 = r
REC = [('Consultas', 'Consultas da Dra. Patrícia (valor total de R$ 800 ou R$ 900)'), ('Tricologia', 'Tratamentos capilares'), ('Facial', 'Procedimento facial'),
       ('Pescoço', 'Procedimento de pescoço'), ('Corporal', 'Procedimentos corporais')]
for (lab, oq), t in zip(REC, TIPOS): line(ws, r, '   ' + lab, '=' + t[2], oq); r += 1
line(ws, r, 'RECEITA BRUTA TOTAL', f'=SUM(B{r0}:B{r-1})', 'Tudo o que os atendimentos faturaram', 't'); rb = r; r += 2
sec(ws, r, 'DESPESAS (descontadas da receita bruta)'); r += 1; d0 = r
DSP = [('1. PIS e COFINS', '=C_PIS+C_COF', 'Impostos federais sobre a receita'), ('2. Taxa do cartão (maquininha)', '=C_MDR', 'Cobrada nas vendas no cartão de crédito'),
       ('3. Antecipação do cartão', '=C_ANT', 'Para receber já as vendas parceladas'), ('4. Insumos', '=C_INS', 'Material usado nos atendimentos'),
       ('5. Passagens aéreas', '=C_PASS', 'Viagem São Paulo – Acre – São Paulo'), ('6. Taxa de ocupação da sala', '=C_SALA', 'Uso das salas da clínica (aba Custo da sala)'),
       ('7. IRPJ e CSLL', '=C_IRC+C_IRP', 'Impostos sobre o lucro')]
for lab, f, oq in DSP: line(ws, r, '   ' + lab, f, oq); r += 1
line(ws, r, 'TOTAL DAS DESPESAS', f'=SUM(B{d0}:B{r-1})', 'Soma das 7 despesas', 't'); td = r; r += 2
line(ws, r, 'RESULTADO PARA DIVIDIR', f'=B{rb}-B{td}', 'Receita bruta total − total das despesas', 'res'); res = r; r += 2
sec(ws, r, 'DIVISÃO DO RESULTADO'); r += 1
cell(ws, r, 1, 'Parte da Dra. Patrícia'); edit(ws, r, 2, 0.5, '0%'); cell(ws, r, 3, None); cell(ws, r, 4, 'Meio a meio (50%)', size=11, color='4A5F63'); name('PARTE_PAT', f"Resumo!$B${r}"); ws.row_dimensions[r].height = 26; r += 1
cell(ws, r, 1, 'DRA. PATRÍCIA RECEBE', None, True, F_PAT, 16, '1F4FBF'); cell(ws, r, 2, f'=ROUND(B{res}*PARTE_PAT,2)', BRL, True, F_PAT, 16, '1F4FBF')
cell(ws, r, 3, f'=IFERROR(B{r}/FAT_TOT,0)', PCT, True, F_PAT); cell(ws, r, 4, 'Contra nota fiscal da empresa dela', size=11, color='4A5F63', fill=F_PAT); ws.row_dimensions[r].height = 36; rp = r; r += 1
cell(ws, r, 1, 'CLÍNICA NÚCLEO S RECEBE', None, True, F_CLI, 16, '0F7F59'); cell(ws, r, 2, f'=B{res}-B{rp}', BRL, True, F_CLI, 16, '0F7F59')
cell(ws, r, 3, f'=IFERROR(B{r}/FAT_TOT,0)', PCT, True, F_CLI); cell(ws, r, 4, 'O restante do resultado', size=11, color='4A5F63', fill=F_CLI); ws.row_dimensions[r].height = 36; rc = r; r += 2
cell(ws, r, 1, 'De cada R$ 100 de receita, a Dra. Patrícia recebe', bold=True); cell(ws, r, 2, f'=IFERROR(B{rp}/FAT_TOT*100,0)', BRL, True); ws.row_dimensions[r].height = 26; r += 2
x = ws.cell(r, 1, 'Conferência'); x.font = F(11, True, '4A5F63'); r += 1
CHK = [('Receita bruta igual à aba Receitas', f'=IF(ABS(B{rb}-FAT_TOT)<0.005,"OK","VERIFICAR")'),
       ('Total das despesas igual à aba Despesas', f'=IF(ABS(B{td}-C_TOT)<0.005,"OK","VERIFICAR")'),
       ('Dra. Patrícia + clínica = resultado', f'=IF(ABS(B{rp}+B{rc}-B{res})<0.005,"OK","VERIFICAR")')]
for lab, f in CHK:
    a = ws.cell(r, 1, lab); a.font = F(11, False, '4A5F63'); bb = ws.cell(r, 2, f); bb.font = F(11, True, '0F7F59'); bb.alignment = Alignment(horizontal='center'); r += 1
ws.freeze_panes = 'A6'

# ================= Como foi feito
ws = wb['Como foi feito']
setup(ws, [6, 110], 'Como os números foram feitos', 'De onde vem cada valor desta planilha.')
TXT = [('1', 'Receitas: relatório de transações do sistema de 05 a 07/10/2026 (40 lançamentos, R$ 57.750,00), mais os ajustes da diretoria de 08/10: consultas pelo valor total (R$ 800 ou R$ 900), pescoço de R$ 8.100,00 e saldo de R$ 5.000,00 do corporal considerado pago. Receita bruta total: R$ 73.250,00, separada em consultas, tricologia, facial, pescoço e corporal.'),
       ('2', 'Regra da divisão: da receita bruta saem só as 7 despesas desta planilha. O que sobra é dividido 50% para a Dra. Patrícia e 50% para a Clínica Núcleo S, a partir das receitas de outubro/2026. Não entram a taxa de estrutura nem a amortização do investimento.'),
       ('3', 'PIS (0,65%) e COFINS (3%): alíquotas do Lucro Presumido, sobre a receita bruta.'),
       ('4', 'Taxa do cartão (1,92%): diferença entre o valor bruto e o valor líquido das vendas parceladas no relatório (R$ 646,14 sobre R$ 33.600,00), aplicada sobre todas as vendas no cartão de crédito (R$ 34.100,00).'),
       ('5', 'Antecipação (8,74%): taxa informada pela diretoria. Todas as vendas no cartão de crédito de outubro foram antecipadas.'),
       ('6', 'Insumos (3,49%): não houve compra de material em outubro. O índice vem das compras de ago–set (R$ 6.281,73) sobre a receita da tricologia nesses meses (R$ 179.877,00). Quando houver nota fiscal, troque pela taxa real.'),
       ('7', 'Passagens: os 9 lançamentos Smiles da fatura do cartão de 05/10/2026, total de R$ 6.836,55, descontados por inteiro. A 2ª parcela de R$ 2.160,00 vem na fatura de novembro.'),
       ('8', 'Taxa de ocupação da sala: custo fixo mensal de Cruzeiro do Sul (média de jul–set/2026, R$ 21.892,52) ÷ (salas × dias de funcionamento × ocupação) = custo de 1 sala por dia. Esse valor × dias de atendimento × salas usadas. Mesmo método da planilha de precificação. Detalhes na aba "Custo da sala".'),
       ('9', 'IRPJ e CSLL: Lucro Presumido. Consultas: 7,68% (32% × 24%). Procedimentos: 2,28% (8% × 15% + 12% × 9%).')]
r = 4
for k, t in TXT:
    c = ws.cell(r, 1, k); c.font = F(14, True, PET); c.alignment = Alignment(vertical='top', horizontal='center')
    c = ws.cell(r, 2, t); c.font = F(13); c.alignment = Alignment(wrap_text=True, vertical='top'); ws.row_dimensions[r].height = 20 * (len(t) // 100 + 1) + 6; r += 1
for s in wb.worksheets: s.sheet_properties.tabColor = {'Resumo': '0A6A70', 'Custo da sala': '1BAF7A'}.get(s.title, '9FB3B6')
for s_ in wb.worksheets:
    for row in s_.iter_rows(min_row=3):
        if any(c.value not in (None, '') for c in row) and s_.row_dimensions[row[0].row].height is None: s_.row_dimensions[row[0].row].height = 24
wb.save(OUT); print('ok', OUT, 'CF', CF_TOT)
