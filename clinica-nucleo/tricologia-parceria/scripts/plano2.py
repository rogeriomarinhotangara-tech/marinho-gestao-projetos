import json, pandas as pd
CRIADAS = {
 '1.01.99.000': ('Receita não classificada – aguardando definição','Receita Operacional Bruta','Conta criada: serviço sem regra no De-Para. Investigar e reclassificar.'),
 '2.13.01.090': ('Despesa não classificada – aguardando definição','Despesas sem identificação','Conta criada: categoria sem regra no De-Para. Investigar e reclassificar.'),
 '2.13.01.098': ('Retirada sem justificativa documentada','Despesas sem identificação','Conta criada na reestruturação.'),
 '2.13.01.099': ('Fatura de cartão de crédito – composição não identificada','Despesas sem identificação','Conta criada na reestruturação: criticidade ALTA, nunca ratear.'),
 '2.14.01.010': ('Royalties e taxa de franquia','Rateios e Overhead Compartilhado','Conta criada na reestruturação.'),
}
EST_EXPL = {'2.03.01.001','2.03.01.002','2.03.01.003','2.03.01.004','2.03.01.005','2.03.01.006','2.03.01.007','2.03.01.008','2.03.01.009',
 '2.03.01.011','2.03.01.012','2.03.01.013','2.03.04.001','2.03.04.002','2.03.04.003','2.03.04.009','2.04.01.001','2.04.01.002','2.04.01.004',
 '2.07.02.001','2.07.02.002','2.07.02.003','2.07.02.004','2.07.02.009','2.09.01.001','2.09.01.002','2.09.01.003','2.09.01.005','2.09.01.006',
 '2.09.01.007','2.09.01.010','2.09.05.001','2.09.05.002','2.09.05.003','2.09.05.005','2.11.01.001','2.11.01.002','2.11.01.011'}
def estrutura(c):
    if c in EST_EXPL: return 'SIM'
    if c.startswith('2.03.02') or c.startswith('2.03.03') or c.startswith('2.06') or c.startswith('2.08'): return 'SIM'
    if c.startswith('2.09.02') and c != '2.09.02.004': return 'SIM'
    if c.startswith('2.10.02') and c != '2.10.02.008': return 'SIM'
    return 'NÃO'
def linha_trico(c):
    if c == '1.01.03.001': return 'R1 Consultas'
    if c.startswith('1.01.04') or c.startswith('1.01.05'): return 'R3 Facial e corporal (Dra. Patrícia)'
    if c in ('1.02.02.006','1.02.02.002'): return 'X1 Equipamentos (CAPEX)'
    if c.startswith('1.'): return 'R2 Procedimentos de tricologia'
    if c.startswith('2.01.01'): return 'T2 Reembolsos a pacientes'
    if c.startswith('2.01'): return 'T1 Deduções (reais)'
    if c.startswith('2.02.01') or c.startswith('2.02.02') or c.startswith('2.02.03') or c.startswith('2.15'): return 'C1 Insumos e ativos'
    if c.startswith('2.02.06') or c.startswith('2.09.03') or c.startswith('2.09.04') or c == '2.03.04.008': return 'D1 Viagens e deslocamento'
    if c.startswith('2.05'): return 'D2 Marketing da tricologia'
    if c == '2.09.01.008': return 'X2 Consultoria de implantação'
    if c.startswith('2.16'): return 'X1 Equipamentos (CAPEX)'
    if c == '2.02.04.002': return 'P1 Repasse à parceira'
    if c.startswith('2.17') or c.startswith('2.18') or c.startswith('3.'): return 'Z Fora da DRE'
    return 'D3 Outras despesas diretas'
def natureza(c, g):
    if 'Não DRE' in g or g.startswith('Entradas'): return 'Fora da DRE'
    if c.startswith('1.'): return 'Receita'
    if g == 'Deduções da Receita': return 'Dedução'
    if g == 'Custos Diretos': return 'Custo direto'
    return 'Despesa'
def build(path):
    D0 = json.load(open(path)); seen=set(); D=[]
    for d in D0:  # o arquivo tem uma 2ª tabela (regras de conciliação) com códigos repetidos: fica só a tabela principal
        if len(d)==24 and d['cod'] not in seen: D.append(d); seen.add(d['cod'])
    out=[]
    for d in D:
        an = d.get('registro')=='Analítica'
        g = d.get('grupo','')
        out.append(dict(cod=d['cod'], nome=d['desc'], grupo=g, natureza=natureza(d['cod'],g) if an else 'Sintética', subgrupo=d.get('subgrupo',''),
            linha_trico=linha_trico(d['cod']) if an else '', estrutura=estrutura(d['cod']) if an else '', registro=d.get('registro',''),
            obs=d.get('regra',''), origem='Plano oficial (Drive)', criada=False))
    for c,(n,g,obs) in CRIADAS.items():
        out.append(dict(cod=c, nome=n, grupo=g, natureza=natureza(c,g), subgrupo='', linha_trico=linha_trico(c), estrutura='NÃO', registro='Analítica',
            obs=obs, origem='Criada nesta reestruturação', criada=True))
    return pd.DataFrame(out).sort_values('cod').reset_index(drop=True)
