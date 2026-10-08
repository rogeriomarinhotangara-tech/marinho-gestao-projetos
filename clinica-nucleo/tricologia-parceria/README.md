# Clínica Núcleo S — DRE da parceria de Tricologia (jul–set/2026)

Parceria Clínica Núcleo S × Dra. Patrícia Fabrini: o resultado líquido da parceria
(faturamento − impostos − insumos − despesas diretas − taxa de estrutura −
amortização do investimento − IRPJ/CSLL) é dividido 50/50 **a partir das receitas de
out/2026** (decisão de 08/10/2026). Até set/2026 a receita da tricologia é 100% da clínica.
Viagens da Dra. Patrícia (passagem, hotel, alimentação, transporte): a clínica paga e
desconta da receita da tricologia.

## Entregáveis

Nenhuma planilha é versionada aqui: todas trazem lançamentos com nomes de pacientes (LGPD).

- `Nucleo_Controladoria_2026_Tricologia_v3.xlsx` — planilha principal (21 abas, fórmulas vivas).
- `Calculadora_Base_de_Calculo_Parceria_Tricologia.xlsx` — índices, base de cálculo didática,
  calculadora (digita a receita, sai a parte de cada um) e lançamento mensal out/26–set/27.
- `Conferencia_Tricologia_Sra_Viviane_Abr-Set2026.xlsx` — conferência linha a linha no
  sistema (como está no sistema × como lançamos × colunas de correção), abr–set/2026.
- Painel: https://claude.ai/artifact/A1RKRD9GzECyje2NBqf4kQ (privado). Sem nomes de pacientes
  e sem detalhe por pessoa em folha, honorários, comissões, consultorias e retiradas.

## Fontes

| Período | Fonte |
|---|---|
| Jan–jun/2026 | Base já classificada do export anterior (histórico da DRE) |
| Jul, ago, set/2026 | Exports completos do sistema (498 + 605 + 474 lançamentos) |
| Plano de contas | `Plano de Contas Nucleo.xlsx` (Google Drive) — 590 contas analíticas |
| Salas | Levantamento estrutural da Clínica Núcleo S (Drive, 12/07/2026) |

## Critérios

- Competência = data de vencimento; caixa = data de baixa.
- Transferências, saques, suprimentos, aplicações/resgates e dinheiro enviado à conta do
  sócio para pagar despesas = contas de passagem (3.01 / 3.03), fora da DRE. Teste de
  pares espelho por data e valor (±3 dias, contas diferentes): nenhuma transferência
  escondida em jul–set.
- Dr. Marcos com "MOD" = honorário (2.02.04.001); sem "MOD" = retirada (2.18.01.003);
  pró-labore = Pessoal.
- Receita da parceria: 1.01.03.001 (consulta), 1.01.03.010 (serviço tricológico em
  parceria), 1.01.04.014 / 1.01.05.014 (facial/corporal da Dra. Patrícia).
- Custos da parceria: 2.02.01.005 (ativos), 2.02.06.x (viagem da parceira),
  repasse em 2.02.04.002.
- Taxa de estrutura (método A) = despesa fixa compartilhada ÷ faturamento da clínica,
  jul–set/2026 = 18,46%.

## Jul–set/2026 (período de teste, 100% da clínica)

| | R$ |
|---|---:|
| Faturamento da parceria | 179.877,00 |
| Resultado da tricologia (sem amortização, que começa em out/26) | 109.897,12 |
| Partilha da Dra. Patrícia | 0,00 |

Exemplo da regra com R$ 100.000 faturados (só procedimentos, custos pelos índices):
Dra. Patrícia R$ 33.124,82 (33,1%); clínica R$ 54.135,18 (50% + estrutura + amortização).

## Verificação

- `recalc.py`: 82.181 fórmulas na planilha principal, 0 erros; calculadora e conferência, 0 erros.
- Classificação por fórmula (aba Base) = classificação em Python: 0 divergências em 4.390 linhas.
- DRE + itens fora da DRE = total de despesas da base, mês a mês, diferença 0,00.
- Totais das abas de lançamentos = totais dos exports do sistema, ao centavo.

## Como rodar

```bash
python3 -I scripts/build_data2.py <scratch> scripts      # monta a base classificada
python3 -I scripts/build_xlsx2.py <scratch> scripts out.xlsx
python3 recalc.py out.xlsx && python3 -I scripts/verify2.py <scratch> out.xlsx
python3 -I scripts/build_conf.py <scratch> scripts conf.xlsx       # conferência (Sra. Viviane)
python3 -I scripts/build_calc.py scripts calc.xlsx                  # calculadora e base de cálculo
python3 -I scripts/build_dash.py <scratch> <scratch>/out/dash2.json  # dados agregados do painel
python3 -I scripts/build_html.py <scratch>                          # painel (dash_template.html + dados)
```
