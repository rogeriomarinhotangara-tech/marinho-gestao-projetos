"""Planilha simples para a Dra. Patrícia: fechamento de Cruzeiro do Sul (05–07/10/2026) com custo de sala.
Uso: python3 -I build_simples.py <scratch> <saida.xlsx>"""
import sys, json
import pandas as pd, openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.worksheet.pagebreak import Break
from openpyxl.worksheet.datavalidation import DataValidation
SP, OUT = sys.argv[1], sys.argv[2]
O = json.load(open(SP + '/out/out26.json', encoding='utf-8'))

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
# custo fixo de Cruzeiro do Sul: relatório de transações de setembro/2026 (lançamentos marcados "CZS" ou pagos pelas contas de CZS)
S = pd.read_excel(SP + '/data6/set26_v5.xlsx'); S = S[S['R/D'] == 'Despesa'].copy()
up = lambda s: s.astype(str).str.upper()
S['mk'] = up(S['Descrição']).str.contains('CZS'); S['acc'] = up(S['Conta']).str.contains('CRUZEIRO DO SUL')
S = S[S.mk | S.acc].copy(); cat = S['Categorias']; S['fora'] = ''
S.loc[up(S['Descrição']).str.contains('EPITACIOLANDIA'), 'fora'] = 'Despesa de Epitaciolândia'
S.loc[cat == 'DR MARCOS SANTANA', 'fora'] = 'Retirada do sócio'
S.loc[(cat == 'CURSOS,TREINAMENTOS E CONSULTORIAS') & ~S.mk, 'fora'] = 'Consultoria / curso'
S.loc[cat == 'GRATIFICAÇÃO', 'fora'] = 'Comissão (varia com as vendas)'
S.loc[(cat == 'MATERIAL PERMANENTE') & ~S.mk, 'fora'] = 'Compra de equipamento'
S.loc[up(S['Descrição']).str.contains('ALUGUEL DEPOSITO'), 'fora'] = 'Aluguel do depósito (diretoria: só o aluguel da clínica)'
S.loc[cat == 'PRO LABORE', 'fora'] = 'Pró-labore do sócio (diretoria)'
FORA = S[S.fora != '']; S = S[S.fora == ''].copy()
GRUPO = {'ALUGUEL E CONDOMINIO': 'Aluguel', 'CONTAS ENERGIA': 'Energia elétrica', 'TELEFONE/ INTERNET': 'Internet', 'SEGURANÇA': 'Vigilância e segurança',
         'SALARIO': 'Equipe — salários', 'INSS': 'Equipe — INSS e FGTS', 'FGTS': 'Equipe — INSS e FGTS',
         'VALE COMBUSTIVEL': 'Equipe — combustível e medicina do trabalho', 'MEDICINA DO TRABALHO': 'Equipe — combustível e medicina do trabalho',
         'PRO LABORE': 'Pró-labore da administração', 'DESPESA HOSPEDAGEM, ALIMENTAÇÃO E COMBUSTIVEL': 'Refeições e alimentação da equipe',
         'SERVIÇO CONTABIL': 'Contabilidade e material de escritório', 'MATERIAL DE ESCRITORIO': 'Contabilidade e material de escritório',
         'TAXAS E CONTRIBUIÇÕES (IPTU,ALVARA,LICENÇAS...)': 'Taxas, alvarás e licenças', 'COLETA LIXO': 'Coleta de lixo de saúde',
         'MANUTENÇÃO': 'Manutenção, extintor e adequação do prédio', 'MATERIAL PERMANENTE': 'Manutenção, extintor e adequação do prédio'}
GORD = list(dict.fromkeys(GRUPO.values()))
assert set(S.Categorias) <= set(GRUPO), set(S.Categorias) - set(GRUPO)
NOMES = {'SEGURANÇA DO TRABALHO': 'Segurança e medicina do trabalho', 'ENERGIA': 'Energia elétrica', 'REFEIÇÃO': 'Refeição da equipe', 'ALIMENTAÇAO': 'Alimentação da equipe',
         'TAXA AJUSTE DE AREA CONSTRIDA': 'Taxa de ajuste de área construída', 'TAXA INSPEÇÃO SANITARIA': 'Taxa de inspeção sanitária', 'INTERNET': 'Internet',
         'EXTINTOR': 'Extintor de incêndio', 'TONNER E PEN DRIVE': 'Toner e pen drive', 'COMPRAS MERCADO': 'Compras de mercado (copa da equipe)',
         'COMPRA REFEIÇÃO': 'Refeição da equipe', 'INSS': 'INSS da equipe', 'FGTS': 'FGTS da equipe', 'ADEQUAÇÃO PREDIO (BOMBEIROS)': 'Adequação do prédio (Bombeiros)',
         'CONTABILIDADE': 'Contabilidade', 'MENSALIDADE SEGURANÇA': 'Mensalidade de segurança', 'PAZ AMBIENTAL - COLETA LIXO': 'Coleta de lixo de saúde',
         'AUX COMBUSTIVEL': 'Auxílio combustível', 'ALUGUEL': 'Aluguel do imóvel da clínica', 'ALUGUEL DEPOSITO': 'Aluguel do depósito',
         'TAXA CERTIDÃO MEIO AMBIENTE': 'Taxa de certidão de meio ambiente'}
ALUGUEL_CZS = 5000.0
FMTBR = lambda v: f'{v:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
CZ = []
for _, x in S.iterrows():
    k = ' '.join(str(x['Descrição']).upper().replace('TRANSAÇÃO RECORRENTE:', '').replace('CZS', '').split()).strip(' -')
    c = x['Categorias']
    lab = ('Complemento de salário — equipe' if 'COMPLEME' in k else 'Salário — equipe') if c == 'SALARIO' else 'Pró-labore da administração' if c == 'PRO LABORE' else NOMES[k]
    v = round(float(x['Valor']), 2); obs_ = []
    if lab == 'Aluguel do imóvel da clínica':
        assert v == 3000.0, v; obs_.append('No relatório: R$ 3.000,00. Considerado R$ 5.000,00 (diretoria)'); v = ALUGUEL_CZS
    if not x.mk: obs_.append('Pago pela conta de Cruzeiro do Sul')
    elif not x.acc: obs_.append('Marcado CZS; pago pela conta de Rio Branco')
    CZ.append(dict(d=pd.Timestamp(x['Data de vencimento']).strftime('%d/%m/%Y'), lab=lab, g=GRUPO[c], v=v, obs='. '.join(obs_)))
CZ.sort(key=lambda z: (GORD.index(z['g']), z['d'][3:5] + z['d'][:2], z['lab']))
CF_TOT = round(sum(z['v'] for z in CZ), 2)
assert len(CZ) == 24 and abs(CF_TOT - 25001.48) < 0.005 and len(FORA) == 9, (len(CZ), CF_TOT, len(FORA))
GRP_USED = [g for g in GORD if any(z['g'] == g for z in CZ)]
CF_NOTE = {'Aluguel': 'Só o imóvel da clínica: R$ 5.000,00 (diretoria)', 'Equipe — salários': 'Salários e complemento da equipe de Cruzeiro do Sul',
           'Pró-labore da administração': 'Lançamento marcado CZS', 'Taxas, alvarás e licenças': 'Inspeção sanitária, área construída e meio ambiente',
           'Refeições e alimentação da equipe': 'Refeições e compras de mercado da equipe'}

# ---------------- estilo (simples, letra grande)
PET = '0A6A70'; INK = '10272B'
F_HEAD = PatternFill('solid', fgColor=PET); F_IN = PatternFill('solid', fgColor='FFF2CC'); F_TOT = PatternFill('solid', fgColor='EEF3F3')
F_PAT = PatternFill('solid', fgColor='DCEBFA'); F_CLI = PatternFill('solid', fgColor='DDF1E7'); F_NOTE = PatternFill('solid', fgColor='F7F9F9')
thin = Side(style='thin', color='C9D4D4'); BOX = Border(left=thin, right=thin, top=thin, bottom=thin)
def F(size=13, bold=False, color=INK, italic=False): return Font(name='Calibri', size=size, bold=bold, color=color, italic=italic)
BRL = '"R$" #,##0.00;[Red]-"R$" #,##0.00;"R$" 0.00'
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

SH = ['Resumo', 'Receitas', 'Despesas', 'Insumos', 'Custo da sala', 'Despesas de CZS', 'Viagem', 'Como foi feito']
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
f1 = r - 1; REC_F0, REC_F1 = f0, f1
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

# ================= Viagem (passagens, alimentação e táxi)
ws = wb['Viagem']
setup(ws, [16, 40, 16, 22], 'Despesas da viagem', 'São Paulo → Cruzeiro do Sul → Rio Branco → São Paulo. Os campos amarelos podem ser alterados.')
x = ws.cell(4, 1, 'Passagens aéreas — pagas no cartão da clínica (fatura de 05/10/2026)'); x.font = F(14, True, PET); ws.row_dimensions[4].height = 26
head(ws, 5, ['Data', 'Descrição na fatura', 'Parcela', 'Valor (R$)'])
r = 6; p0 = r
for x in O['pass_']:
    cell(ws, r, 1, x[0]); cell(ws, r, 2, x[1].replace('*', ' ')); cell(ws, r, 3, x[3] or '—'); edit(ws, r, 4, x[4], BRL); ws.row_dimensions[r].height = 22; r += 1
def lab3(ws, r, text, fill=None, size=13, color=INK, bold=True):
    for c in (1, 2, 3): cell(ws, r, c, text if c == 1 else None, bold=bold, fill=fill, size=size, color=color)
    ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=3)
lab3(ws, r, 'TOTAL DAS PASSAGENS NA FATURA', F_TOT); cell(ws, r, 4, f'=SUM(D{p0}:D{r-1})', BRL, True, F_TOT); name('PASS_FAT', f"Viagem!$D${r}"); ws.row_dimensions[r].height = 26; r += 1
lab3(ws, r, 'Parte descontada neste fechamento'); edit(ws, r, 4, 1.0, '0%'); name('PASS_PCT', f"Viagem!$D${r}"); ws.row_dimensions[r].height = 26; r += 1
lab3(ws, r, 'PASSAGENS DESCONTADAS', F_CLI, 14); cell(ws, r, 4, '=ROUND(PASS_FAT*PASS_PCT,2)', BRL, True, F_CLI, 14); name('PASS_TOT', f"Viagem!$D${r}"); ws.row_dimensions[r].height = 30; r += 1
note(ws, r, '100% = todas as passagens da fatura saem da receita de Cruzeiro do Sul. O bilhete de R$ 2.160,00 foi parcelado em 2 vezes: a 2ª parcela vem na fatura de novembro.', 4); r += 2
x = ws.cell(r, 1, 'Outras despesas da viagem'); x.font = F(14, True, PET); ws.row_dimensions[r].height = 26; r += 1
head(ws, r, ['Despesa', None, None, 'Valor (R$)']); ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=3); r += 1
lab3(ws, r, 'Alimentação', bold=False); edit(ws, r, 4, 90.0, BRL); name('VIAG_ALIM', f"Viagem!$D${r}"); ws.row_dimensions[r].height = 26; r += 1
lab3(ws, r, 'Transporte — táxi', bold=False); edit(ws, r, 4, 50.0, BRL); name('VIAG_TAXI', f"Viagem!$D${r}"); ws.row_dimensions[r].height = 26; r += 1
lab3(ws, r, 'TOTAL DA VIAGEM (passagens + alimentação + táxi)', F_TOT); cell(ws, r, 4, '=PASS_TOT+VIAG_ALIM+VIAG_TAXI', BRL, True, F_TOT); ws.row_dimensions[r].height = 28; r += 1

# ================= Insumos (por tratamento completo, por paciente)
ws = wb['Insumos']
setup(ws, [40, 12, 9, 14, 15, 11, 17, 42], 'Insumos de cada tratamento', 'Ativos e materiais usados em cada sessão, conforme as folhas de procedimento. Quantidades, preços e sessões em amarelo podem ser alterados.', landscape=True)
QT = 'General'
def ins_table(ws, r, rows, vezes):
    head(ws, r, ['Item', 'Quantidade', 'Unid.', 'Preço (R$)', 'Custo de cada vez (R$)', 'Vezes', 'Total (R$)', 'Observação'], 36); r += 1; t0 = r
    for it, qtd, un, pr, modo, ob in rows:
        cell(ws, r, 1, it); edit(ws, r, 2, qtd, QT); ws.cell(r, 2).alignment = Alignment(horizontal='center', vertical='center')
        cell(ws, r, 3, un, h='center', size=12); edit(ws, r, 4, pr, BRL); cell(ws, r, 5, f'=ROUND(B{r}*D{r},2)', BRL)
        if modo == 'S': cell(ws, r, 6, f'={vezes}', '0', h='center')
        else: edit(ws, r, 6, 1, '0'); ws.cell(r, 6).alignment = Alignment(horizontal='center', vertical='center')
        cell(ws, r, 7, f'=ROUND(E{r}*F{r},2)', BRL, True); cell(ws, r, 8, ob or None, size=11, color='4A5F63', wrap=True)
        ws.row_dimensions[r].height = 22 if len(ob or '') < 46 else 34; r += 1
    return r, t0
def ins_sub(ws, r, lab, t0, nm, fill=F_TOT, size=13):
    cell(ws, r, 1, lab, bold=True, fill=fill, size=size)
    for c in range(2, 7): cell(ws, r, c, None, fill=fill)
    ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=6)
    cell(ws, r, 7, f'=SUM(G{t0}:G{r-1})' if t0 else None, BRL, True, fill, size); cell(ws, r, 8, None, fill=fill)
    if nm: name(nm, f"Insumos!$G${r}")
    ws.row_dimensions[r].height = 28; return r + 1
def kv(ws, r, lab, v, fmt, nm, ob=None, formula=False):
    cell(ws, r, 1, lab, bold=True)
    (cell(ws, r, 2, v, fmt, True, h='center') if formula else edit(ws, r, 2, v, fmt)); ws.cell(r, 2).alignment = Alignment(horizontal='center', vertical='center')
    for c in range(3, 9): cell(ws, r, c, ob if c == 3 else None, size=11, color='4A5F63')
    ws.merge_cells(start_row=r, start_column=3, end_row=r, end_column=8)
    if nm: name(nm, f"Insumos!$B${r}")
    ws.row_dimensions[r].height = 24; return r + 1
r = 4
x = ws.cell(r, 1, 'Resumo — insumos por paciente (tratamento fechado)'); x.font = F(15, True, PET); ws.row_dimensions[r].height = 26; r += 1
head(ws, r, ['Tratamento', 'Sessões', 'Custo por paciente (R$)', None, 'Pacientes', 'Total (R$)', None, 'De onde vem'], 36)
for a_, b_ in ((3, 4), (6, 7)): ws.merge_cells(start_row=r, start_column=a_, end_row=r, end_column=b_)
r += 1; rs0 = r
RES_I = [('Tricologia', '=TRI_SESS', '=INS_TRI', 'C', 'Tratamento completo: eletroporação + fototerapia + kit + sala (quadro 1)'), ('Pescoço (colo)', '=CFP_S', '=INS_CFP', 'E', 'Protocolo de eletroporação (quadro 2)'),
         ('Facial', '=CFP_S', '=INS_CFP', 'D', 'Protocolo de eletroporação (quadro 2)'), ('Corporal', '=CFP_S', '=INS_CFP', 'F', 'Protocolo de eletroporação (quadro 2)')]
for lab, ss, cp, col, ob in RES_I:
    cell(ws, r, 1, lab, bold=True); cell(ws, r, 2, ss, '0', h='center'); cell(ws, r, 3, cp, BRL); cell(ws, r, 4, None); ws.merge_cells(start_row=r, start_column=3, end_row=r, end_column=4)
    cell(ws, r, 5, f'=COUNTIF(Receitas!{col}{REC_F0}:{col}{REC_F1},">0")', '0', h='center'); cell(ws, r, 6, f'=ROUND(C{r}*E{r},2)', BRL, True); cell(ws, r, 7, None)
    ws.merge_cells(start_row=r, start_column=6, end_row=r, end_column=7); cell(ws, r, 8, ob, size=11, color='4A5F63'); ws.row_dimensions[r].height = 26; r += 1
cell(ws, r, 1, 'TOTAL DE INSUMOS (vai para as Despesas)', bold=True, fill=F_CLI, size=14)
for c in (2, 3, 4, 5): cell(ws, r, c, None, fill=F_CLI)
ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=5)
cell(ws, r, 6, f'=SUM(F{rs0}:F{r-1})', BRL, True, F_CLI, 14); cell(ws, r, 7, None, fill=F_CLI); ws.merge_cells(start_row=r, start_column=6, end_row=r, end_column=7); cell(ws, r, 8, None, fill=F_CLI)
name('INS_TOTAL', f"Insumos!$F${r}"); ws.row_dimensions[r].height = 30; r += 1
note(ws, r, 'Pacientes: contados sozinhos na aba Receitas. Quem fez dois tratamentos (ex.: facial e pescoço) tem os insumos dos dois.', 8, 11); r += 2
# --- quadro 1: tricologia
ws.row_breaks.append(Break(id=r - 1))
x = ws.cell(r, 1, 'Quadro 1 — Tricologia (tratamento fechado)'); x.font = F(15, True, PET); ws.row_dimensions[r].height = 26; r += 1
r = kv(ws, r, 'Sessões de eletroporação', 3, '0', 'TRI_ELE_S', 'Aparelho de eletroporação')
r = kv(ws, r, 'Sessões de fototerapia', 8, '0', 'TRI_FOT_S', 'Cascata de LED')
r = kv(ws, r, 'Total de sessões', '=TRI_ELE_S+TRI_FOT_S', '0', 'TRI_SESS', 'Cada sessão é uma visita do paciente à clínica', True); r += 1
SER = 'A folha fala em até 5 seringas; a conta da folha usou 1 de 3 mL + 1 de 5 mL por sessão'
PENTE = 'Não entrou na conta final da folha (R$ 8,00). Para cobrar, ponha 1'
ELE = [('Hair cocktail', 2, 'mL', 23.80, 'S', '0 a 2 mL por sessão (máximo)'), ('Densi hair', 2, 'mL', 35.00, 'S', '0 a 2 mL'), ('Exossomos', 2, 'mL', 0.0, 'S', 'Preço não informado na folha: preencher'),
       ('Lumicen', 2, 'mL', 38.31, 'S', '0 a 2 mL'), ('A-OX', 2, 'mL', 24.00, 'S', '0 a 2 mL'), ('Luvas P', 1, 'par', 0.70, 'S', None),
       ('Seringa 3 mL com rosca', 1, 'un', 0.33, 'S', SER), ('Seringa 5 mL com rosca', 1, 'un', 0.50, 'S', None), ('Gaze', 4, 'un', 0.07, 'S', 'Pode gastar ou não (máximo 4)'),
       ('Lençol de maca', 1, 'un', 2.90, 'S', None), ('Máscara', 1, 'un', 0.22, 'S', None), ('Touca', 1, 'un', 0.15, 'S', None), ('Pente', 0, 'un', 8.00, 'T', PENTE)]
FOT = [('Minoxidil', 1, 'mL', 2.40, 'S', None), ('Dutasterida', 1, 'mL', 8.48, 'S', None), ('Clobetasol', 1, 'mL', 0.75, 'S', '2 a 20 gotas; frasco de R$ 22,27 com 30 mL'),
       ('Luvas P', 1, 'par', 0.70, 'S', None), ('Seringa 3 mL com rosca', 1, 'un', 0.33, 'S', SER), ('Seringa 5 mL com rosca', 1, 'un', 0.50, 'S', None),
       ('Gaze', 4, 'un', 0.07, 'S', 'Pode gastar ou não (máximo 4)'), ('Lençol de maca', 1, 'un', 2.90, 'S', None), ('Máscara', 1, 'un', 0.22, 'S', None),
       ('Touca', 1, 'un', 0.15, 'S', None), ('Pente', 0, 'un', 8.00, 'T', PENTE)]
x = ws.cell(r, 1, 'Eletroporação'); x.font = F(13, True, PET); r += 1
r, t0 = ins_table(ws, r, ELE, 'TRI_ELE_S'); r = ins_sub(ws, r, 'Total da eletroporação', t0, 'INS_TRI_ELE'); r += 1
ws.row_breaks.append(Break(id=r - 1))
x = ws.cell(r, 1, 'Fototerapia'); x.font = F(13, True, PET); r += 1
r, t0 = ins_table(ws, r, FOT, 'TRI_FOT_S'); r = ins_sub(ws, r, 'Total da fototerapia', t0, 'INS_TRI_FOT'); r += 1
x = ws.cell(r, 1, 'Kit do paciente e sala de procedimento'); x.font = F(13, True, PET); r += 1
r, t0 = ins_table(ws, r, [('Kit SP', 1, 'kit', 135.50, 'T', 'Valor da folha de tricologia'), ('Sala de procedimento (30 min por sessão)', 1, 'sessão', 20.00, 'S', 'R$ 20,00 por sessão, conforme a folha'), ('Ajuste ao total da folha', 1, 'un', 1.00, 'T', 'Luvas da eletroporação: a folha soma R$ 3,10')], 'TRI_SESS'); r = ins_sub(ws, r, 'Total do kit e da sala', t0, 'INS_TRI_KIT'); r += 1
cell(ws, r, 1, 'INSUMOS DA TRICOLOGIA POR PACIENTE (tratamento completo)', bold=True, fill=F_CLI, size=14)
for c in range(2, 7): cell(ws, r, c, None, fill=F_CLI)
ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=6)
cell(ws, r, 7, '=INS_TRI_ELE+INS_TRI_FOT+INS_TRI_KIT', BRL, True, F_CLI, 14); cell(ws, r, 8, 'Eletroporação + fototerapia + kit + sala', size=11, color='4A5F63', fill=F_CLI)
name('INS_TRI', f"Insumos!$G${r}"); ws.row_dimensions[r].height = 30; r += 1
# --- quadro 2: facial, pescoço e corporal
ws.row_breaks.append(Break(id=r - 1))
x = ws.cell(r, 1, 'Quadro 2 — Facial, pescoço (colo) e corporal (tratamento fechado)'); x.font = F(15, True, PET); ws.row_dimensions[r].height = 26; r += 1
r = kv(ws, r, 'Sessões com insumo', 8, '0', 'CFP_S', 'Aparelho de eletroporação. O mesmo protocolo vale para facial, pescoço e corporal'); r += 1
CFP = [('WCPR', 2, 'mL', 73.20, 'S', '0 a 2 mL por sessão (máximo)'), ('Lumicen', 2, 'mL', 38.31, 'S', '0 a 2 mL'), ('Mesolift', 2, 'mL', 24.00, 'S', '0 a 2 mL'),
       ('Silhouette', 2, 'mL', 23.14, 'S', '0 a 2 mL'), ('A-OX', 2, 'mL', 24.00, 'S', '0 a 2 mL'), ('Luvas P', 1, 'par', 0.70, 'S', None),
       ('Seringa 3 mL com rosca', 1, 'un', 0.33, 'S', 'A folha fala em até 4 seringas; a conta usou 1 de 3 mL + 1 de 5 mL'), ('Seringa 5 mL com rosca', 1, 'un', 0.50, 'S', None),
       ('Lençol de maca', 1, 'un', 2.90, 'S', None), ('Touca', 1, 'un', 0.15, 'S', None), ('Máscara', 1, 'un', 0.22, 'S', None),
       ('Lenços umedecidos — radiofrequência (Unyque)', 1, 'kit', 0.14, 'S', '3 lenços para limpeza do paciente (facial e colo)'),
       ('Lenços umedecidos — Hipro', 1, 'kit', 0.14, 'S', '3 lenços para limpeza do paciente (facial)')]
r, t0 = ins_table(ws, r, CFP, 'CFP_S'); r = ins_sub(ws, r, 'INSUMOS POR PACIENTE (facial, pescoço ou corporal)', t0, 'INS_CFP', F_CLI, 14)
note(ws, r, 'Campo eletromagnético (Supreme) e Velaryan, no corporal, não usam insumo extra.', 8, 11); r += 1

# ================= Custo da sala (cálculo detalhado, por hora)
ws = wb['Custo da sala']
setup(ws, [50, 18, 14, 14, 15, 18], 'Custo da sala — cálculo detalhado', 'Quanto custa usar uma sala da clínica de Cruzeiro do Sul por hora. Os campos amarelos podem ser alterados; o resto se calcula sozinho.', landscape=True)
def obs(ws, r, text, fill=None, color='4A5F63', bold=False, size=11):
    for c in range(3, 7): cell(ws, r, c, text if c == 3 else None, fill=fill, size=size, color=color, bold=bold, wrap=True)
    ws.merge_cells(start_row=r, start_column=3, end_row=r, end_column=6)
def hd3(ws, r, a, b, c):
    head(ws, r, [a, b, c, None, None, None]); ws.merge_cells(start_row=r, start_column=3, end_row=r, end_column=6)
def step(ws, r, text):
    x = ws.cell(r, 1, text); x.font = F(15, True, PET); ws.row_dimensions[r].height = 26
HRS = '0.0" h"'; MIN = '0" min"'
r = 4
step(ws, r, 'Passo 1 — Quanto custa manter a clínica de Cruzeiro do Sul funcionando por mês'); r += 1
note(ws, r, 'Valores de setembro/2026, do relatório de transações: lançamentos de Cruzeiro do Sul, um a um na aba "Despesas de CZS" (lá os valores podem ser alterados). Aluguel: só o imóvel da clínica, R$ 5.000,00.', 6, 11); ws.row_dimensions[r].height = 30; r += 1
hd3(ws, r, 'Despesa da unidade', 'R$ no mês', 'Observação'); r += 1; c0 = r
for g in GRP_USED:
    cell(ws, r, 1, g); cell(ws, r, 2, f'=SUMIFS(CZS_VAL,CZS_GRP,A{r},CZS_ENT,"SIM")', BRL); obs(ws, r, CF_NOTE.get(g)); ws.row_dimensions[r].height = 20; r += 1
cell(ws, r, 1, 'TOTAL — custo mensal de Cruzeiro do Sul', bold=True, fill=F_TOT); cell(ws, r, 2, f'=SUM(B{c0}:B{r-1})', BRL, True, F_TOT); obs(ws, r, None, F_TOT)
name('SALA_CF', f"{q('Custo da sala')}!$B${r}"); ws.row_dimensions[r].height = 28; r += 2
ws.row_breaks.append(Break(id=r - 1)); step(ws, r, 'Passo 2 — Quantas horas de sala a clínica tem por mês'); r += 1
hd3(ws, r, 'Item', 'Quantidade', 'Observação'); r += 1
cell(ws, r, 1, 'Salas produtivas em Cruzeiro do Sul'); edit(ws, r, 2, 3, '0'); obs(ws, r, '2 consultórios (também fazem procedimentos) + sala da esteira'); ws.row_dimensions[r].height = 26; name('SALA_N', f"{q('Custo da sala')}!$B${r}"); r += 1
cell(ws, r, 1, 'Dias de funcionamento por mês'); edit(ws, r, 2, 22, '0'); obs(ws, r, 'Dias úteis (planilha de precificação)'); name('SALA_DIAS', f"{q('Custo da sala')}!$B${r}"); r += 1
cell(ws, r, 1, 'Horas de funcionamento por dia'); edit(ws, r, 2, 10, HRS); obs(ws, r, 'Planilha de precificação'); name('SALA_H', f"{q('Custo da sala')}!$B${r}"); r += 1
cell(ws, r, 1, 'Taxa de ocupação considerada'); edit(ws, r, 2, 0.65, '0%')
obs(ws, r, 'Mesma taxa da planilha de precificação: as salas ficam ocupadas 65% do tempo e o custo do tempo vazio é dividido entre as horas usadas. Se colocar 100%, cobra só o tempo usado.')
ws.row_dimensions[r].height = 46; name('SALA_OCUP', f"{q('Custo da sala')}!$B${r}"); r += 1
cell(ws, r, 1, 'Horas de sala ocupadas por mês', bold=True, fill=F_TOT); cell(ws, r, 2, '=SALA_N*SALA_DIAS*SALA_H*SALA_OCUP', HRS, True, F_TOT); obs(ws, r, 'Salas × dias × horas por dia × ocupação', F_TOT)
name('SALA_HD', f"{q('Custo da sala')}!$B${r}"); ws.row_dimensions[r].height = 28; r += 2
step(ws, r, 'Passo 3 — Custo de uma sala por hora'); r += 1
hd3(ws, r, 'Cálculo', 'R$', 'Como é feito'); r += 1
cell(ws, r, 1, 'CUSTO REAL de 1 sala por hora', bold=True, fill=F_TOT, size=14); cell(ws, r, 2, '=ROUND(SALA_CF/SALA_HD,2)', BRL, True, F_TOT, 14); obs(ws, r, 'Custo mensal ÷ horas de sala ocupadas por mês', F_TOT)
name('SALA_HORA', f"{q('Custo da sala')}!$B${r}"); ws.row_dimensions[r].height = 30; r += 1
cell(ws, r, 1, 'Custo real de 1 sala por dia inteiro (para comparar)'); cell(ws, r, 2, '=ROUND(SALA_HORA*SALA_H,2)', BRL); obs(ws, r, 'Custo por hora × horas de funcionamento por dia'); r += 1
cell(ws, r, 1, 'CUSTO NEGOCIADO de 1 sala por hora', bold=True, fill=F_CLI, size=14); edit(ws, r, 2, 40.0, BRL); ws.cell(r, 2).font = F(14, True, '1F4FBF')
obs(ws, r, 'Combinado pela diretoria para esta bateria de procedimentos em Cruzeiro do Sul (início da parceria). É este valor que entra na conta.', F_CLI)
name('SALA_NEG', f"{q('Custo da sala')}!$B${r}"); ws.row_dimensions[r].height = 36; r += 1
cell(ws, r, 1, 'Desconto por hora concedido na negociação'); cell(ws, r, 2, '=SALA_HORA-SALA_NEG', BRL); obs(ws, r, '=IFERROR("Custo real − custo negociado: "&FIXED((1-SALA_NEG/SALA_HORA)*100,1)&"% abaixo do custo real","")'); r += 2
ws.row_breaks.append(Break(id=r - 1)); step(ws, r, 'Passo 4 — Consultas da Dra. Patrícia'); r += 1
note(ws, r, 'Na consulta a Dra. Patrícia avalia o paciente e define o tratamento. Cada consulta ocupa uma sala por 1 hora.', 6, 12); ws.row_dimensions[r].height = 22; r += 1
hd3(ws, r, 'Item', 'Quantidade', 'Observação'); r += 1
cell(ws, r, 1, 'Tempo de cada consulta', bold=True); edit(ws, r, 2, 1, HRS); obs(ws, r, '1 hora por consulta'); name('CONS_H', f"{q('Custo da sala')}!$B${r}"); ws.row_dimensions[r].height = 26; r += 1
cell(ws, r, 1, 'Consultas realizadas'); cell(ws, r, 2, f'=COUNTIF(Receitas!B{REC_F0}:B{REC_F1},">0")', '0', True); obs(ws, r, 'Pacientes com consulta na aba Receitas (contados sozinhos)')
name('CONS_N', f"{q('Custo da sala')}!$B${r}"); ws.row_dimensions[r].height = 26; r += 1
cell(ws, r, 1, 'Horas de sala nas consultas', bold=True, fill=F_TOT); cell(ws, r, 2, '=CONS_N*CONS_H', HRS, True, F_TOT); obs(ws, r, 'Consultas × tempo de cada consulta', F_TOT)
name('CONS_HS', f"{q('Custo da sala')}!$B${r}"); ws.row_dimensions[r].height = 28; r += 2
step(ws, r, 'Passo 5 — Visitas para os procedimentos (tratamento fechado)'); r += 1
note(ws, r, 'Depois da consulta, cada paciente volta à clínica para as visitas do tratamento fechado. Cada visita ocupa uma sala. Quem fez dois tratamentos (ex.: facial e pescoço) faz as visitas dos dois.', 6, 12); ws.row_dimensions[r].height = 36; r += 1
head(ws, r, ['Tratamento', 'Pacientes', 'Visitas por paciente', 'Total de visitas', 'Tempo de cada visita', 'Horas de sala'], 40); r += 1; v0 = r
VIS = [('Tricologia', 'C', 11, 30, 'TRI'), ('Pescoço', 'E', 8, 30, 'PES'), ('Facial', 'D', 8, 30, 'FAC'), ('Corporal', 'F', 16, 60, 'COR')]
for lab, col, nv, mn, k in VIS:
    cell(ws, r, 1, lab, bold=True); cell(ws, r, 2, f'=COUNTIF(Receitas!{col}{REC_F0}:{col}{REC_F1},">0")', '0', h='center')
    edit(ws, r, 3, nv, '0'); ws.cell(r, 3).alignment = Alignment(horizontal='center', vertical='center'); name('VIS_' + k, f"{q('Custo da sala')}!$C${r}")
    cell(ws, r, 4, f'=B{r}*C{r}', '0', h='center')
    edit(ws, r, 5, mn, MIN); ws.cell(r, 5).alignment = Alignment(horizontal='center', vertical='center'); name('MIN_' + k, f"{q('Custo da sala')}!$E${r}")
    cell(ws, r, 6, f'=ROUND(D{r}*E{r}/60,2)', HRS, True, h='center'); ws.row_dimensions[r].height = 26; r += 1
cell(ws, r, 1, 'TOTAL', bold=True, fill=F_TOT); cell(ws, r, 2, None, fill=F_TOT); cell(ws, r, 3, None, fill=F_TOT)
cell(ws, r, 4, f'=SUM(D{v0}:D{r-1})', '0', True, F_TOT, h='center'); cell(ws, r, 5, None, fill=F_TOT); cell(ws, r, 6, f'=SUM(F{v0}:F{r-1})', HRS, True, F_TOT, h='center')
name('AVAL_HS', f"{q('Custo da sala')}!$F${r}"); name('VIS_TOT', f"{q('Custo da sala')}!$D${r}"); ws.row_dimensions[r].height = 28; r += 1
note(ws, r, 'Tricologia, pescoço e facial: 30 minutos por visita. Corporal: 16 visitas de 1 hora. Pacientes contados sozinhos na aba Receitas.', 6, 11); r += 2
ws.row_breaks.append(Break(id=r - 1)); x = ws.cell(r, 1, 'Horas de sala de cada paciente (consulta + visitas)'); x.font = F(13, True, PET); ws.row_dimensions[r].height = 24; r += 1
head(ws, r, ['Paciente', 'Tratamento', 'Consulta', 'Visitas', 'Horas das visitas', 'Total de horas'], 40); r += 1; w0 = r
for i in range(REC_F0, REC_F1 + 1):
    R = lambda c: f'Receitas!{c}{i}'
    cell(ws, r, 1, f'={R("A")}', bold=True)
    trat = (f'=IF({R("C")}+{R("D")}+{R("E")}+{R("F")}=0,"Só consulta",MID(IF({R("C")}>0,", Tricologia","")&IF({R("E")}>0,", Pescoço","")'
            f'&IF({R("D")}>0,", Facial","")&IF({R("F")}>0,", Corporal",""),3,80))')
    cell(ws, r, 2, trat, size=12, wrap=True)
    cell(ws, r, 3, f'=IF({R("B")}>0,CONS_H,0)', HRS, h='center')
    cell(ws, r, 4, f'=IF({R("C")}>0,VIS_TRI,0)+IF({R("E")}>0,VIS_PES,0)+IF({R("D")}>0,VIS_FAC,0)+IF({R("F")}>0,VIS_COR,0)', '0', h='center')
    cell(ws, r, 5, f'=ROUND((IF({R("C")}>0,VIS_TRI*MIN_TRI,0)+IF({R("E")}>0,VIS_PES*MIN_PES,0)+IF({R("D")}>0,VIS_FAC*MIN_FAC,0)+IF({R("F")}>0,VIS_COR*MIN_COR,0))/60,2)', HRS, h='center')
    cell(ws, r, 6, f'=C{r}+E{r}', HRS, True, h='center'); ws.row_dimensions[r].height = 26; r += 1
cell(ws, r, 1, 'TOTAL', bold=True, fill=F_TOT); cell(ws, r, 2, None, fill=F_TOT)
for c in (3, 4, 5, 6): cell(ws, r, c, f'=SUM({L(c)}{w0}:{L(c)}{r-1})', '0' if c == 4 else HRS, True, F_TOT, h='center')
name('PAC_HS', f"{q('Custo da sala')}!$F${r}"); ws.row_dimensions[r].height = 28; r += 1
note(ws, r, 'Consulta: 1 hora para quem tem consulta na aba Receitas. Visitas: conforme o tratamento fechado (quadro acima).', 6, 11); r += 2
ws.row_breaks.append(Break(id=r - 1)); step(ws, r, 'Conta final — taxa de ocupação da sala'); r += 1
hd3(ws, r, 'Cálculo', 'Valor', 'Como é feito'); r += 1
cell(ws, r, 1, 'Horas de sala — consultas'); cell(ws, r, 2, '=CONS_HS', HRS); obs(ws, r, '="Passo 4: "&CONS_N&" consultas × "&FIXED(CONS_H,1)&" h"'); r += 1
cell(ws, r, 1, 'Horas de sala — visitas dos procedimentos'); cell(ws, r, 2, '=AVAL_HS', HRS); obs(ws, r, '="Passo 5: "&VIS_TOT&" visitas"'); r += 1
cell(ws, r, 1, 'Total de horas de sala', bold=True, fill=F_TOT); cell(ws, r, 2, '=CONS_HS+AVAL_HS', HRS, True, F_TOT); obs(ws, r, None, F_TOT); name('SALA_HS', f"{q('Custo da sala')}!$B${r}"); r += 1
cell(ws, r, 1, 'Custo negociado de 1 sala por hora'); cell(ws, r, 2, '=SALA_NEG', BRL); obs(ws, r, 'Passo 3 (valor combinado para esta bateria)'); r += 1
cell(ws, r, 1, 'Ocupação — consultas'); cell(ws, r, 2, '=ROUND(SALA_NEG*CONS_HS,2)', BRL); obs(ws, r, 'Horas das consultas × custo negociado'); name('SALA_AT', f"{q('Custo da sala')}!$B${r}"); r += 1
cell(ws, r, 1, 'Ocupação — visitas dos procedimentos'); cell(ws, r, 2, '=ROUND(SALA_NEG*AVAL_HS,2)', BRL); obs(ws, r, 'Horas das visitas × custo negociado'); name('SALA_AV', f"{q('Custo da sala')}!$B${r}"); r += 1
cell(ws, r, 1, 'TAXA DE OCUPAÇÃO DA SALA (negociada)', bold=True, fill=F_CLI, size=14); cell(ws, r, 2, '=SALA_AT+SALA_AV', BRL, True, F_CLI, 14)
obs(ws, r, 'Consultas + visitas · é este valor que vai para o Resumo', F_CLI); name('SALA_TAXA', f"{q('Custo da sala')}!$B${r}"); ws.row_dimensions[r].height = 32; r += 1
GR = '7A8B8E'
cell(ws, r, 1, 'Pelo custo real seria (para comparar)', color=GR, italic=True); cell(ws, r, 2, '=ROUND(SALA_HORA*CONS_HS,2)+ROUND(SALA_HORA*AVAL_HS,2)', BRL, color=GR, italic=True)
obs(ws, r, '=FIXED(SALA_HS,1)&" h × custo real de R$ "&FIXED(SALA_HORA,2)&" por hora"', color=GR); name('SALA_REAL', f"{q('Custo da sala')}!$B${r}"); r += 1
cell(ws, r, 1, 'Desconto concedido pela clínica nesta negociação', bold=True, color='0F7F59'); cell(ws, r, 2, '=SALA_REAL-SALA_TAXA', BRL, True, color='0F7F59')
obs(ws, r, 'Custo real − custo negociado. A clínica absorve essa diferença.', color='0F7F59'); name('SALA_DESC', f"{q('Custo da sala')}!$B${r}"); r += 2
ws.row_breaks.append(Break(id=r - 1)); x = ws.cell(r, 1, 'Para comparar: custo real de 1 sala por hora conforme o nº de salas e a ocupação'); x.font = F(13, True, PET); r += 1
head(ws, r, ['Nº de salas na unidade', 'Ocupação 100%', 'Ocupação 80%', 'Ocupação 65%'], 34); r += 1
for n_ in (2, 3, 4, 5, 6):
    cell(ws, r, 1, f'{n_} salas')
    for c, oc in ((2, 1.0), (3, 0.8), (4, 0.65)): cell(ws, r, c, f'=ROUND(SALA_CF/({n_}*SALA_DIAS*SALA_H*{oc}),2)', BRL)
    r += 1
r += 1
note(ws, r, 'Mesmo método da planilha "Precificação de Procedimentos" (custo mensal ÷ horas de sala ocupadas), com os custos reais de Cruzeiro do Sul em setembro/2026. Os custos da administração central lançados em Rio Branco (sistema, jurídico, parte da contabilidade) não estão aqui.', 6, 11)

# ================= Despesas de CZS (lançamentos de setembro/2026)
ws = wb['Despesas de CZS']
setup(ws, [14, 40, 44, 18, 14, 48], 'Despesas de Cruzeiro do Sul — setembro/2026', 'Lançamentos do relatório de transações que formam o custo da sala. Os valores podem ser alterados; na coluna "Entra no custo?" pode trocar SIM por NÃO.', landscape=True)
ws.page_setup.fitToHeight = 1
head(ws, 4, ['Vencimento', 'Despesa', 'Grupo', 'Valor (R$)', 'Entra no custo?', 'Observação'], 34)
dv = DataValidation(type='list', formula1='"SIM,NÃO"', allow_blank=False); ws.add_data_validation(dv)
r = 5; z0 = r
for z in CZ:
    cell(ws, r, 1, z['d'], h='center'); cell(ws, r, 2, z['lab']); cell(ws, r, 3, z['g'], size=12, color='4A5F63'); edit(ws, r, 4, z['v'], BRL)
    edit(ws, r, 5, 'SIM'); ws.cell(r, 5).alignment = Alignment(horizontal='center', vertical='center'); dv.add(ws.cell(r, 5))
    cell(ws, r, 6, z['obs'] or None, size=11, color='4A5F63', wrap=True); ws.row_dimensions[r].height = 30 if len(z['obs']) > 45 else 22; r += 1
z1 = r - 1
name('CZS_VAL', f"{q('Despesas de CZS')}!$D${z0}:$D${z1}"); name('CZS_GRP', f"{q('Despesas de CZS')}!$C${z0}:$C${z1}"); name('CZS_ENT', f"{q('Despesas de CZS')}!$E${z0}:$E${z1}")
cell(ws, r, 1, None, fill=F_TOT); cell(ws, r, 2, 'TOTAL QUE ENTRA NO CUSTO DA SALA', bold=True, fill=F_TOT); cell(ws, r, 3, None, fill=F_TOT)
cell(ws, r, 4, '=SUMIFS(CZS_VAL,CZS_ENT,"SIM")', BRL, True, F_TOT); cell(ws, r, 5, None, fill=F_TOT); cell(ws, r, 6, None, fill=F_TOT)
name('CZS_TOT', f"{q('Despesas de CZS')}!$D${r}"); ws.row_dimensions[r].height = 28; r += 2
note(ws, r, 'Não entram no custo da sala: retiradas e pró-labore do sócio, aluguel do depósito, comissões, consultorias e cursos, compras de equipamentos sem a marca CZS e despesas de Epitaciolândia pagas pelo caixa de Cruzeiro do Sul.', 6, 11)
ws.freeze_panes = 'A5'

# ================= Despesas (como uma conta razão)
ws = wb['Despesas']
setup(ws, [50, 20, 16, 18, 60], 'Despesas descontadas da receita bruta', 'Como uma conta razão: cada despesa com as linhas que a formam e de onde vem cada valor. Campos amarelos podem ser alterados.', landscape=True)
ws.print_title_rows = '4:4'
head(ws, 4, ['Despesa / detalhe', 'Base ou quantidade', 'Taxa ou preço', 'Valor (R$)', 'De onde vem'])
r = 5; SUBS = []; GR = '7A8B8E'
def conta(t):
    global r
    for c in range(1, 6): cell(ws, r, c, t if c == 1 else None, bold=True, fill=F_TOT, size=14, color=PET)
    ws.row_dimensions[r].height = 28; r += 1
def det(lab, base, bfmt, taxa, tfmt, val, origem, nm=None, edit_tx=False, info=False):
    global r
    col = GR if info else INK
    cell(ws, r, 1, '   ' + lab, size=12, color=col, italic=info, wrap=True); cell(ws, r, 2, base, bfmt, size=12, color=col)
    if edit_tx: edit(ws, r, 3, taxa, tfmt)
    else: cell(ws, r, 3, taxa, tfmt, size=12, color=col)
    cell(ws, r, 4, val.format(r=r) if val else None, BRL, size=12, color=col, italic=info); cell(ws, r, 5, origem, size=11, color='4A5F63', wrap=True)
    if nm: name(nm, f"Despesas!$D${r}")
    ws.row_dimensions[r].height = 28; r += 1; return r - 1
def subtotal(lab, rows, nm):
    global r
    cell(ws, r, 1, 'Total — ' + lab, bold=True); cell(ws, r, 2, None); cell(ws, r, 3, None)
    cell(ws, r, 4, '=' + '+'.join(f'D{x}' for x in rows), BRL, True); cell(ws, r, 5, None)
    name(nm, f"Despesas!$D${r}"); SUBS.append(r); ws.row_dimensions[r].height = 26; r += 2
VAL = '=ROUND(B{r}*C{r},2)'
conta('1. PIS e COFINS')
a = det('PIS', '=FAT_TOT', BRL, 0.0065, PCT, VAL, 'Receita bruta (aba Receitas) × 0,65% (Lucro Presumido)', 'C_PIS', True)
b = det('COFINS', '=FAT_TOT', BRL, 0.03, PCT, VAL, 'Receita bruta (aba Receitas) × 3% (Lucro Presumido)', 'C_COF', True)
subtotal('PIS e COFINS', [a, b], 'S_IMP')
conta('2. Taxa do cartão (maquininha)')
a = det('Vendas no cartão de crédito', '=FAT_CRED', BRL, 0.0192, PCT, VAL, 'Aba Receitas. Taxa medida no relatório: R$ 646,14 sobre R$ 33.600,00 parcelados (1,92%)', 'C_MDR', True)
subtotal('taxa do cartão', [a], 'S_MDR')
conta('3. Antecipação do cartão')
a = det('Vendas no crédito antecipadas', '=FAT_CRED', BRL, 0.0874, PCT, VAL, 'Todas as vendas no crédito de outubro foram antecipadas (taxa informada pela diretoria)', 'C_ANT', True)
subtotal('antecipação', [a], 'S_ANT')
conta('4. Insumos (material de cada tratamento fechado)')
rows = []
for lab, col, cp, ob in (('Tricologia', 'C', 'INS_TRI', 'Aba Insumos, quadro 1: tratamento completo (eletroporação + fototerapia + kit + sala)'), ('Pescoço (colo)', 'E', 'INS_CFP', 'Aba Insumos, quadro 2'),
                         ('Facial', 'D', 'INS_CFP', 'Aba Insumos, quadro 2'), ('Corporal', 'F', 'INS_CFP', 'Aba Insumos, quadro 2')):
    rows.append(det(f'{lab}: pacientes × insumos por paciente', f'=COUNTIF(Receitas!{col}{REC_F0}:{col}{REC_F1},">0")', '0" pac."', f'={cp}', BRL, VAL, ob))
subtotal('insumos', rows, 'C_INS')
ws.row_breaks.append(Break(id=r - 1)); conta('5. Passagens aéreas')
a = det('Fatura do cartão de 05/10/2026: 9 lançamentos Smiles', '=PASS_FAT', BRL, '=PASS_PCT', '0%', '=PASS_TOT', 'Aba Viagem (parte descontada neste fechamento)', 'C_PASS')
subtotal('passagens', [a], 'S_PASS')
conta('6. Alimentação')
a = det('Alimentação durante a viagem', None, None, None, None, '=VIAG_ALIM', 'Aba Viagem', 'C_ALIM')
subtotal('alimentação', [a], 'S_ALIM')
conta('7. Transporte — táxi')
a = det('Táxi durante a viagem', None, None, None, None, '=VIAG_TAXI', 'Aba Viagem', 'C_TAXI')
subtotal('transporte', [a], 'S_TAXI')
conta('8. Ocupação da sala (custo-hora negociado)')
a = det('Consultas: horas × custo negociado', '=CONS_HS', HRS, '=SALA_NEG', BRL, '=SALA_AT', '1 hora por consulta (aba Custo da sala, Passo 4)', 'C_SALA1')
b = det('Visitas dos procedimentos: horas × custo negociado', '=AVAL_HS', HRS, '=SALA_NEG', BRL, '=SALA_AV', 'Visitas do tratamento fechado (aba Custo da sala, Passo 5)', 'C_SALA2')
det('Para comparar: horas × custo real (não entra na conta)', '=SALA_HS', HRS, '=SALA_HORA', BRL, '=SALA_REAL', 'Custo real de 1 sala por hora (aba Custo da sala, Passo 3)', info=True)
det('Desconto concedido pela clínica (não entra na conta)', None, None, None, None, '=SALA_DESC', 'Custo real − custo negociado', info=True)
subtotal('ocupação da sala', [a, b], 'S_SALA')
ws.row_breaks.append(Break(id=r - 1)); conta('9. IRPJ e CSLL')
a = det('Sobre as consultas', '=FAT_CONS', BRL, 0.0768, PCT, VAL, 'Lucro Presumido: 32% × 24% = 7,68%', 'C_IRC', True)
b = det('Sobre os procedimentos', '=FAT_TRI+FAT_FAC+FAT_PES+FAT_COR', BRL, 0.0228, PCT, VAL, 'Lucro Presumido: 8% × 15% + 12% × 9% = 2,28%', 'C_IRP', True)
subtotal('IRPJ e CSLL', [a, b], 'S_IRC')
for c in range(1, 6): cell(ws, r, c, 'TOTAL DAS DESPESAS' if c == 1 else None, bold=True, fill=F_CLI, size=15)
cell(ws, r, 4, '=' + '+'.join(f'D{x}' for x in SUBS), BRL, True, F_CLI, 15); name('C_TOT', f"Despesas!$D${r}"); ws.row_dimensions[r].height = 32; r += 2
note(ws, r, 'Todas as despesas saem da receita bruta. Linhas em cinza são só para comparação e não entram na soma.', 5)

# ================= Resumo
ws = wb['Resumo']
setup(ws, [50, 22, 15, 52], 'Parceria de Tricologia — Cruzeiro do Sul', 'Atendimentos de 05 a 07 de outubro de 2026 · Clínica Núcleo S e Dra. Patrícia Fabrini')
ws['A3'] = 'Da receita bruta saem só as 9 despesas abaixo. O que sobra é dividido meio a meio.'; ws['A3'].font = F(13, True, '4A5F63')
head(ws, 5, ['', 'Valor (R$)', '% da receita', 'O que é'])
def sec(ws, r, text):
    x = ws.cell(r, 1, text); x.font = F(14, True, PET); ws.row_dimensions[r].height = 28
def line(ws, r, lab, f, oq, kind=None):
    fill = {'t': F_TOT, 'res': F_CLI}.get(kind); big = kind in ('t', 'res'); sz = 15 if kind == 'res' else 14 if big else 13
    cell(ws, r, 1, lab, None, big, fill, sz); cell(ws, r, 2, f, BRL, big, fill, sz)
    cell(ws, r, 3, f'=IFERROR(B{r}/FAT_TOT,0)', PCT, big, fill); cell(ws, r, 4, oq, size=11, color='4A5F63', fill=fill, wrap=True)
    ws.row_dimensions[r].height = 32 if big else 28
r = 6; sec(ws, r, 'RECEITAS'); r += 1; r0 = r
REC = [('Consultas', 'Consultas da Dra. Patrícia (valor total de R$ 800 ou R$ 900)'), ('Tricologia', 'Tratamentos capilares'), ('Facial', 'Procedimento facial'),
       ('Pescoço', 'Procedimento de pescoço'), ('Corporal', 'Procedimentos corporais')]
for (lab, oq), t in zip(REC, TIPOS): line(ws, r, '   ' + lab, '=' + t[2], oq); r += 1
line(ws, r, 'RECEITA BRUTA TOTAL', f'=SUM(B{r0}:B{r-1})', 'Tudo o que os atendimentos faturaram', 't'); rb = r; r += 2
sec(ws, r, 'DESPESAS (descontadas da receita bruta)'); r += 1; d0 = r
DSP = [('1. PIS e COFINS', '=S_IMP', 'Impostos federais sobre a receita'), ('2. Taxa do cartão (maquininha)', '=S_MDR', 'Cobrada nas vendas no cartão de crédito'),
       ('3. Antecipação do cartão', '=S_ANT', 'Para receber já as vendas parceladas'), ('4. Insumos', '=C_INS', 'Material de cada tratamento fechado (aba Insumos)'),
       ('5. Passagens aéreas', '=S_PASS', 'Viagem São Paulo – Acre – São Paulo'), ('6. Alimentação', '=S_ALIM', 'Alimentação durante a viagem'),
       ('7. Transporte — táxi', '=S_TAXI', 'Táxi durante a viagem'),
       ('8. Ocupação da sala', '=S_SALA', '=FIXED(SALA_HS,1)&" h × R$ "&FIXED(SALA_NEG,2)&" (negociado; custo real R$ "&FIXED(SALA_HORA,2)&")"'),
       ('9. IRPJ e CSLL', '=S_IRC', 'Impostos sobre o lucro')]
for lab, f, oq in DSP: line(ws, r, '   ' + lab, f, oq); r += 1
line(ws, r, 'TOTAL DAS DESPESAS', f'=SUM(B{d0}:B{r-1})', 'Soma das 9 despesas', 't'); td = r; r += 2
line(ws, r, 'RESULTADO PARA DIVIDIR', f'=B{rb}-B{td}', 'Receita bruta total − total das despesas', 'res'); res = r; r += 2
sec(ws, r, 'DIVISÃO DO RESULTADO'); r += 1
cell(ws, r, 1, 'Parte da Dra. Patrícia'); edit(ws, r, 2, 0.5, '0%'); cell(ws, r, 3, None); cell(ws, r, 4, 'Meio a meio (50%)', size=11, color='4A5F63'); name('PARTE_PAT', f"Resumo!$B${r}"); ws.row_dimensions[r].height = 26; r += 1
cell(ws, r, 1, 'DRA. PATRÍCIA RECEBE', None, True, F_PAT, 16, '1F4FBF'); cell(ws, r, 2, f'=ROUND(B{res}*PARTE_PAT,2)', BRL, True, F_PAT, 16, '1F4FBF')
cell(ws, r, 3, f'=IFERROR(B{r}/FAT_TOT,0)', PCT, True, F_PAT); cell(ws, r, 4, 'Contra nota fiscal da empresa dela', size=11, color='4A5F63', fill=F_PAT); ws.row_dimensions[r].height = 36; rp = r; r += 1
cell(ws, r, 1, 'CLÍNICA NÚCLEO S RECEBE', None, True, F_CLI, 16, '0F7F59'); cell(ws, r, 2, f'=B{res}-B{rp}', BRL, True, F_CLI, 16, '0F7F59')
cell(ws, r, 3, f'=IFERROR(B{r}/FAT_TOT,0)', PCT, True, F_CLI); cell(ws, r, 4, 'O restante do resultado', size=11, color='4A5F63', fill=F_CLI); ws.row_dimensions[r].height = 36; rc = r; r += 2
cell(ws, r, 1, 'De cada R$ 100 de receita, a Dra. Patrícia recebe', bold=True); cell(ws, r, 2, f'=IFERROR(B{rp}/FAT_TOT*100,0)', BRL, True); ws.row_dimensions[r].height = 26; r += 1
cell(ws, r, 1, 'Desconto da sala concedido pela clínica', color='0F7F59'); cell(ws, r, 2, '=SALA_DESC', BRL, color='0F7F59')
cell(ws, r, 4, 'Custo real da sala − custo negociado de R$ 40 por hora (aba Custo da sala)', size=11, color='4A5F63', wrap=True); ws.row_dimensions[r].height = 26; r += 2
x = ws.cell(r, 1, 'Conferência'); x.font = F(11, True, '4A5F63'); r += 1
CHK = [('Receita bruta igual à aba Receitas', f'=IF(ABS(B{rb}-FAT_TOT)<0.005,"OK","VERIFICAR")'),
       ('Total das despesas igual à aba Despesas', f'=IF(ABS(B{td}-C_TOT)<0.005,"OK","VERIFICAR")'),
       ('Insumos iguais à aba Insumos', '=IF(ABS(C_INS-INS_TOTAL)<0.005,"OK","VERIFICAR")'),
       ('Taxa da sala igual à aba Custo da sala', '=IF(ABS(S_SALA-SALA_TAXA)<0.005,"OK","VERIFICAR")'),
       ('Custo mensal da sala igual à aba Despesas de CZS', '=IF(ABS(SALA_CF-CZS_TOT)<0.005,"OK","VERIFICAR")'),
       ('Horas de sala: por paciente = consultas + visitas', '=IF(ABS(PAC_HS-CONS_HS-AVAL_HS)<0.005,"OK","VERIFICAR")'),
       ('Dra. Patrícia + clínica = resultado', f'=IF(ABS(B{rp}+B{rc}-B{res})<0.005,"OK","VERIFICAR")')]
for lab, f in CHK:
    a = ws.cell(r, 1, lab); a.font = F(11, False, '4A5F63'); bb = ws.cell(r, 2, f); bb.font = F(11, True, '0F7F59'); bb.alignment = Alignment(horizontal='center'); r += 1
ws.freeze_panes = 'A6'

# ================= Como foi feito
ws = wb['Como foi feito']
setup(ws, [6, 110], 'Como os números foram feitos', 'De onde vem cada valor desta planilha. Os campos amarelos de todas as abas podem ser alterados; o resto se recalcula sozinho.')
TXT = [('1', 'Receitas: relatório de transações do sistema de 05 a 07/10/2026 (40 lançamentos, R$ 57.750,00), mais os ajustes da diretoria de 08/10: consultas pelo valor total (R$ 800 ou R$ 900), pescoço de R$ 8.100,00 e saldo de R$ 5.000,00 do corporal considerado pago. Receita bruta total: R$ 73.250,00, separada em consultas, tricologia, facial, pescoço e corporal.'),
       ('2', 'Regra da divisão: da receita bruta saem só as 9 despesas desta planilha. O que sobra é dividido 50% para a Dra. Patrícia e 50% para a Clínica Núcleo S, a partir das receitas de outubro/2026. Não entram a taxa de estrutura nem a amortização do investimento.'),
       ('3', 'PIS (0,65%) e COFINS (3%): alíquotas do Lucro Presumido, sobre a receita bruta.'),
       ('4', 'Taxa do cartão (1,92%): diferença entre o valor bruto e o valor líquido das vendas parceladas no relatório (R$ 646,14 sobre R$ 33.600,00), aplicada sobre todas as vendas no cartão de crédito (R$ 34.100,00). Antecipação (8,74%): taxa informada pela diretoria; todas as vendas no crédito foram antecipadas.'),
       ('5', 'Insumos: folhas de procedimento de cada tratamento fechado (quantidade × preço × sessões). Tricologia: R$ 1.232,08 por paciente, tratamento completo da folha (3 sessões de eletroporação + 8 de fototerapia + kit + sala de procedimento). Facial, pescoço e corporal: 8 sessões do protocolo de eletroporação.'),
       ('6', 'Viagem: passagens (9 lançamentos Smiles da fatura do cartão de 05/10/2026, R$ 6.836,55; a 2ª parcela de R$ 2.160,00 vem em novembro), alimentação de R$ 90,00 e táxi de R$ 50,00.'),
       ('7', 'Ocupação da sala — custo real: despesas de Cruzeiro do Sul em setembro/2026 (relatório de transações, 24 lançamentos; só o aluguel da clínica, R$ 5.000,00; sem pró-labore), total de R$ '+FMTBR(CF_TOT)+', ÷ horas de sala ocupadas no mês (3 salas produtivas × 22 dias × 10 horas × 65%) = custo real de 1 sala por hora.'),
       ('8', 'Ocupação da sala — custo negociado: para esta bateria de procedimentos em Cruzeiro do Sul, a diretoria combinou R$ 40,00 por hora de sala. Horas: 1 hora por consulta + visitas do tratamento fechado (tricologia 11, pescoço 8 e facial 8 visitas de 30 minutos; corporal 16 visitas de 1 hora). A diferença para o custo real é um desconto concedido pela clínica.'),
       ('9', 'IRPJ e CSLL: Lucro Presumido. Consultas: 7,68% (32% × 24%). Procedimentos: 2,28% (8% × 15% + 12% × 9%).')]
r = 4
for k, t in TXT:
    c = ws.cell(r, 1, k); c.font = F(14, True, PET); c.alignment = Alignment(vertical='top', horizontal='center')
    c = ws.cell(r, 2, t); c.font = F(13); c.alignment = Alignment(wrap_text=True, vertical='top'); ws.row_dimensions[r].height = 20 * (len(t) // 100 + 1) + 6; r += 1
for s in wb.worksheets: s.sheet_properties.tabColor = {'Resumo': '0A6A70', 'Custo da sala': '1BAF7A', 'Insumos': '1BAF7A', 'Despesas de CZS': '7FCFB0'}.get(s.title, '9FB3B6')
for s_ in wb.worksheets:
    for row in s_.iter_rows(min_row=3):
        if any(c.value not in (None, '') for c in row) and s_.row_dimensions[row[0].row].height is None: s_.row_dimensions[row[0].row].height = 24
wb.save(OUT); print('ok', OUT, 'CF', CF_TOT)
