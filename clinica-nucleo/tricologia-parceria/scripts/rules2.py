# Regras de classificação v2 (plano oficial) — espelho EXATO das fórmulas da aba Base
def norm_desc(g):
    if g is None or g != g: return ''
    s = str(g).replace('Transação Recorrente:', '')
    return ' '.join([p for p in s.split(' ') if p != '']).upper()
def has(sub, s):
    return (s is not None and s == s) and sub.upper() in str(s).upper()
def tri_flag(r):
    A, G, H, E = r['R/D'], r['Descrição'], r['Serviços'], r['Responsável']
    if A is None or A != A or A == '': return ''
    if has('TRICOLOG', G) or has('TROCOLOG', G) or has('CAPILAR', G): return 'SIM'
    if has('PATRICIA', E): return 'SIM'
    for k in ('PATRICIA','TRICOLOG','CAPILAR','BARBA','FOTOTERAPIA','ELETROPORA'):
        if has(k, H): return 'SIM'
    if A == 'Despesa' and has('PATRICIA', G): return 'SIM'
    return 'NÃO'
DEPARA_RECEITA = {
 "CONSULTA":"1.01.01.001","EMAGRECIMENTO":"1.01.02.001","EMAGRECIMENTO CRZ":"1.01.02.001","EMAGRECIMENTO CRZ (1)":"1.01.02.001",
 "EMAGRECIMENTO EPITACIO":"1.01.02.001","EMAGRECIMENTO COMPLEMENTAÇÃO":"1.01.02.001","IMPLANTE":"1.01.02.005",
 "INJETAVEIS":"1.01.02.007","VITAMINAS INJETAVEIS":"1.01.02.007","APLICAÇÃO TIZERPATIDA":"1.01.02.007",
 "ASSIMETRIA G":"1.01.05.010","ASSIMETRIA M":"1.01.05.010","GOLD GLUTEO G":"1.01.05.010","PREENCHIMENTO DE GLÚTEO":"1.01.05.010",
 "BIOIMPEDANCIA":"1.01.08.003","CALORIMETRIA":"1.01.08.003","CONSULTA NUTRICIONISTA":"1.01.07.001","PACOTE NUTRI":"1.01.07.001",
 "ESTEIRA":"1.01.06.001","SHAP SPACE":"1.01.06.001","SUPREME PRO":"1.01.06.001","UNYQUE PRO":"1.01.06.001","VELARYAN":"1.01.06.001",
 "RECEITA":"1.02.01.005","CONSULTA DR MARCOS":"1.01.01.001",
 "TRICOLOGIA":"1.01.03.010","CONSULTA DRA PATRICIA FABRINI":"1.01.03.001","FACIAL DRA PATRICIA":"1.01.04.014","CORPORAL DRA PATRICIA":"1.01.05.014",
}
DEPARA_CATEGORIA = {
 "FERIAS":"2.03.02.004","PARCELAMENTOS":"2.17.01.007","MATERIAL E MEDICAMENTO ESTETICA":"2.02.01.006","MEDICINA DO TRABALHO":"2.03.04.003",
 "CONTAS ENERGIA":"2.06.01.005","SERVIÇO PRESTADO PESSOA FISICA":"2.09.01.010","SISTEMA E APLICATIVOS":"2.08.01.001","CARTÃO CREDITO":"2.13.01.099",
 "COMPRA DE EQUIPAMENTOS":"2.16.01.001","ALUGUEL E CONDOMINIO":"2.06.01.001","VALE ALIMENTAÇÃO":"2.03.03.002","TELEFONE/ INTERNET":"2.06.01.008",
 "CURSOS,TREINAMENTOS E CONSULTORIAS":"2.09.01.004","MATERIAL E MEDICAMENTOS MEDICOS":"2.02.01.002","SEGURO DE VIDA":"2.03.03.005",
 "TRIBUTOS FEDERAIS":"2.01.02.002","DESPESA HOSPEDAGEM, ALIMENTAÇÃO E COMBUSTIVEL":"2.09.02.011","MATERIAL DE USO E CONSUMO":"2.02.02.011",
 "TAXAS E CONTRIBUIÇÕES (IPTU,ALVARA,LICENÇAS...)":"2.10.02.001","REEMBOLSO":"2.01.01.004","MATERIAL PERMANENTE":"2.16.01.003",
 "MATERIAL ESCRITORIO":"2.09.02.001","MATERIAL DE ESCRITORIO":"2.09.02.001","OUTROS":"2.13.01.090","TAXA PIX":"2.11.01.001","MATERIAL LIMPEZA":"2.06.01.011",
 "COLETA LIXO":"2.07.02.001","MANUTENÇÃO":"2.06.02.008","DESPESAS TRABALHISTAS":"2.03.05.001","FRETES":"2.09.02.004","GRATIFICAÇÃO":"2.03.01.015",
 "DR MARCOS SANTANA":"2.18.01.003","SALARIO":"2.03.01.002","PUBLICIDADE":"2.05.01.001","MANUTENÇÃO DE EQUIPAMENTOS":"2.07.01.002",
 "SEGURANÇA":"2.06.01.014","POSTAGEM CORREIOS":"2.09.02.003","CERTIFICADO DIGITAL PF":"2.08.01.013","CERTIFICADO DIGITAL PJ":"2.08.01.013",
 "INSS":"2.03.02.001","FGTS":"2.03.02.002","SERVIÇOS JURIDICOS":"2.09.01.002","SERVIÇO CONTABIL":"2.09.01.001","VALE COMBUSTIVEL":"2.03.03.006",
 "VALE TRANSPORTE":"2.03.03.001","PRO LABORE":"2.03.01.010","EMPRESTIMOS":"2.17.01.001","TARIFA BANCARIA":"2.11.01.001","UNIFORMES":"2.03.03.009",
 "MANUTENÇÃO COMPUTADORES E AFINS":"2.08.01.020",
}
# palavra-chave na descrição -> código (a ÚLTIMA da lista que aparecer vence)
PALAVRAS = [
 ("LUVAS PVC","2.06.01.011","Luva de limpeza"),
 ("COMISSÃO","2.02.08.001","Comissão de venda (custo variável)"),
 ("UTILIDADES","2.09.02.009","Utensílios de baixo valor"),
 ("GAZIN","2.09.02.009","Utensílios de baixo valor"),
 ("MERCADO LIVRE","2.09.02.009","Utensílios de baixo valor (ver observação)"),
 ("BORDADO","2.06.01.016","Enxoval / ambientação"),
 ("BERMUDAS ESTEIRA","2.02.02.011","Vestuário descartável da esteira"),
 ("ROUPAS ESTEIRA","2.02.02.011","Vestuário descartável da esteira"),
 ("ENFERMEIRA","2.02.04.008","Profissional clínico terceirizado"),
 ("HOSPEDAGEM","2.09.03.002","Viagem"),
 ("HOTEL","2.09.03.002","Viagem"),
 ("PASSAGEM","2.09.03.001","Viagem"),
 ("TAXA EMBARQUE","2.09.03.001","Viagem (confirmar se é da Dra. Patrícia)"),
 ("COMBUSTIVEL","2.09.04.001","Veículos"),
 ("ESTACIONAMENTO","2.09.04.005","Veículos"),
 ("ENDOGIN","2.09.01.004","Mentoria de gestão"),
 ("IOF","2.11.01.007","Despesa financeira"),
 ("TARIFA","2.11.01.001","Tarifa bancária"),
 ("COFINS","2.01.02.003","Dedução da receita"),
 ("IRPJ","2.10.01.001","Tributo sobre o lucro"),
 ("CSLL","2.10.01.003","Tributo sobre o lucro"),
 ("ROYALT","2.14.01.010","Franquia"),
 ("EMPRESTIMO","2.17.01.001","Principal de empréstimo — juros não segregados"),
 ("PARCELAMENTO","2.17.01.007","Parcelamento tributário — juros não segregados"),
 ("MATERIAL TRICOLOG","2.02.01.005","Ativos de tricologia (conta oficial)"),
 ("PENTES","2.02.02.007","Descartável dos procedimentos"),
 ("DECORAÇÃO","2.06.01.016","Ambientação"),
 ("LANCHE TRICOLOG","2.06.01.016","Recepção do dia de tricologia"),
 ("CAFE TRICOLOG","2.06.01.016","Recepção do dia de tricologia"),
 ("CONSULTORIA TRICOLOG","2.09.01.008","Implantação da tricologia"),
 ("CONSULTORIA TROCOLOG","2.09.01.008","Implantação da tricologia (grafia errada no sistema)"),
 ("DR PATRICIA","2.02.06.004","Alimentação da parceira"),
 ("DRA PATRICIA","2.02.06.004","Alimentação da parceira"),
 ("HOTEL DR","2.02.06.002","Hospedagem da parceira"),
 ("PASSAGEM DR","2.02.06.001","Passagem da parceira"),
 ("TRANSFERÊNCIA","3.01.01.003","Transferência entre contas — PASSAGEM, fora da DRE"),
 ("TRANSFERENCIA","3.01.01.003","Transferência entre contas — PASSAGEM, fora da DRE"),
 ("SAQUE","3.01.01.002","Banco para caixa — PASSAGEM"),
 ("SUPRIMENTO","3.01.01.005","Fundo fixo — PASSAGEM"),
 ("APLICAÇÃO FINANCEIRA","3.01.01.007","Aplicação — PASSAGEM"),
 ("RESGATE","3.01.01.008","Resgate — PASSAGEM"),
 ("RETIRADA PARA","3.03.01.008","Dinheiro enviado para conta do sócio pagar despesas — PASSAGEM até a prestação de contas"),
]
def auto_code(r, memoria):
    A, G, H, I, E = r['R/D'], r['Descrição'], r['Serviços'], r['Categorias'], r['Responsável']
    if A is None or A != A or A == '': return ''
    if str(G).startswith('Transferência') or has('TRANSFERÊNCIA', G) or has('TRANSFERENCIA', G): return '3.01.01.003'
    if A == 'Receita':
        h = '' if H != H or H is None else str(H)
        first = ' '.join((h.split(',')[0] if ',' in h else h).split()).upper()
        if tri_flag(r) == 'SIM' and (first == 'CONSULTA' or has('CONSULTA DRA PATRICIA', H)): return '1.01.03.001'
        if first in DEPARA_RECEITA: return DEPARA_RECEITA[first]
        return '1.01.03.010' if tri_flag(r) == 'SIM' else '1.01.99.000'
    cat = '' if I != I or I is None else ' '.join(str(I).split()).upper()
    if (has('DR MARCOS', G) or has('MARCOS SANTANA', G) or cat == 'DR MARCOS SANTANA') and not has('LABORE', G):
        return '2.02.04.001' if has('MOD', G) else '2.18.01.003'
    nd = norm_desc(G)
    if nd in memoria: return memoria[nd]
    hit = None
    for k, c, _ in PALAVRAS:
        if k.upper() in nd: hit = c
    if hit: return hit
    return DEPARA_CATEGORIA.get(cat, '2.13.01.090')
def unidade(r):
    G, H, M = r['Descrição'], r['Serviços'], r['Conta']
    if has('CZS', G) or has('CRZ', G) or has('CRUZEIRO DO SUL', G) or has('CRZ', H): return 'Cruzeiro do Sul'
    if has('EPITACIO', G) or has('EPITACIO', H): return 'Epitaciolândia'
    if has('CRUZEIRO', M): return 'Cruzeiro do Sul'
    if has('EPITACIO', M): return 'Epitaciolândia'
    if M is None or M != M or M == '': return 'Não alocado'
    return 'Rio Branco'
