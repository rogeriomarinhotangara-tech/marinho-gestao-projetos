# Clínica Núcleo — DRE da parceria de Tricologia (jul–set/2026)

Parceria Clínica Núcleo × Dra. Patrícia Fabrini: o resultado líquido da parceria
(faturamento − impostos − insumos − despesas diretas − taxa de estrutura −
amortização do investimento − IRPJ/CSLL) é dividido 50/50.

## Entregáveis

- Planilha `Nucleo_Parceria_Tricologia_DRE_Jul-Set2026.xlsx` (21 abas, fórmulas vivas) —
  **não versionada aqui** porque traz nomes de pacientes (LGPD). Enviada direto ao consultor.
- Apresentação: https://claude.ai/artifact/A1RKRD9GzECyje2NBqf4kQ (privada).

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

## Resultado jul–set/2026 (regras propostas)

| | R$ |
|---|---:|
| Faturamento da parceria | 179.877,00 |
| Resultado líquido a partilhar | 104.802,14 |
| Dra. Patrícia (50%) | 52.401,07 |
| Clínica Núcleo (50% + estrutura + amortização) | 90.706,51 |

## Verificação

- `recalc.py`: 82.175 fórmulas, 0 erros.
- Classificação por fórmula (aba Base) = classificação em Python: 0 divergências em 4.390 linhas.
- DRE + itens fora da DRE = total de despesas da base, mês a mês, diferença 0,00.
- Totais das abas de lançamentos = totais dos exports do sistema, ao centavo.

## Como rodar

```bash
python3 -I scripts/build_data2.py <scratch> scripts      # monta a base classificada
python3 -I scripts/build_xlsx2.py <scratch> scripts out.xlsx
python3 recalc.py out.xlsx && python3 -I scripts/verify2.py <scratch> out.xlsx
```
