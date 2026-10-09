# Base de cálculo — fechamento de Cruzeiro do Sul (05 a 07/10/2026)

A planilha simples para a Dra. Patrícia é gerada por `scripts/build_simples.py`. O PDF e o
Word, aba por aba e com capa, saem de `scripts/build_print.py` e `scripts/build_docx.js`.
As planilhas, o PDF e o Word não ficam no repositório porque trazem nomes de pacientes (LGPD).

## Regra da divisão

Da receita bruta saem só 9 despesas. O que sobra é dividido 50% para a Dra. Patrícia e 50%
para a Clínica Núcleo S. Não entram a taxa de estrutura nem a amortização do investimento.

| # | Despesa | Base de cálculo |
|---|---|---|
| 1 | PIS e COFINS | receita bruta × 0,65% e × 3% (Lucro Presumido) |
| 2 | Taxa do cartão | vendas no crédito × 1,92% (medido no relatório: R$ 646,14 / R$ 33.600) |
| 3 | Antecipação | vendas no crédito × 8,74% (todas antecipadas) |
| 4 | Insumos | pacientes × insumos do tratamento completo (aba Insumos) |
| 5 | Passagens | fatura do cartão (9 lançamentos Smiles, R$ 6.836,55) |
| 6 | Alimentação | R$ 90,00 |
| 7 | Transporte (táxi) | R$ 50,00 |
| 8 | Ocupação da sala | horas de sala × custo-hora negociado (R$ 40,00) |
| 9 | IRPJ e CSLL | consultas × 7,68%; procedimentos × 2,28% |

## Insumos por paciente (tratamento fechado)

- **Tricologia:** R$ 1.232,08, o valor da folha. Somam-se:
  - 3 sessões de eletroporação: R$ 741,90;
  - 8 sessões de fototerapia: R$ 133,68;
  - kit SP: R$ 135,50;
  - sala de procedimento: R$ 20,00 × 11 sessões;
  - ajuste de R$ 1,00 para fechar com o total da folha (as luvas da eletroporação somam R$ 3,10 na folha).
- **Facial, pescoço (colo) e corporal:** R$ 2.963,04. São 8 sessões do protocolo de
  eletroporação: WCPR, Lumicen, Mesolift, Silhouette e A-OX, mais materiais e lenços. A folha
  traz R$ 2.987,04 porque somou o Lumicen como R$ 636,96, e 2 mL × R$ 38,31 × 8 dá R$ 612,96.
  Com R$ 39,81/mL o total fecha nos R$ 2.987,04.
- **Exossomos:** sem preço na folha (R$ 0,00 até ser informado).

## Custo da sala

- **Custo real:** despesas de Cruzeiro do Sul em set/2026 (relatório de transações). São os
  lançamentos marcados "CZS" ou pagos pelas contas de CZS.
  - Fora da conta: retiradas e pró-labore do sócio, aluguel do depósito, comissões,
    consultorias, equipamentos sem a marca CZS e despesas de Epitaciolândia.
  - Aluguel considerado: R$ 5.000,00.
  - Total do mês: R$ 25.001,48.
  - Esse total é dividido por 429 horas de sala (3 salas × 22 dias × 10 h × 65% de
    ocupação), o que dá **R$ 58,28 por hora**.
- **Custo negociado para esta bateria:** R$ 40,00 por hora. A diferença é um desconto
  concedido pela clínica: R$ 1.142,50.
- **Horas de sala:**
  - 1 hora por consulta.
  - Visitas do tratamento fechado:
    - tricologia: 11 visitas de 30 min;
    - pescoço: 8 visitas de 30 min;
    - facial: 8 visitas de 30 min;
    - corporal: 16 visitas de 1 h.
  - Total em Cruzeiro do Sul: 6 h + 56,5 h = 62,5 h.

## Resultado de Cruzeiro do Sul

| | R$ |
|---|---|
| Receita bruta | 73.250,00 |
| Total das despesas | 33.268,34 |
| Resultado para dividir | 39.981,66 |
| Dra. Patrícia (50%) | 19.990,83 |
| Clínica Núcleo S (50%) | 19.990,83 |

## Como gerar de novo

```bash
python3 -I scripts/build_simples.py <scratch> planilha.xlsx
cp planilha.xlsx planilha_calc.xlsx
python3 <skill xlsx>/scripts/recalc.py planilha_calc.xlsx 120
python3 -I scripts/build_print.py <scratch> planilha.xlsx planilha_calc.xlsx <saida> <nome>
node scripts/build_docx.js <saida>/<nome>.json <saida>/<nome>.docx
```

Entradas que ficam fora do repositório:
- `out/out26.json`: receitas de outubro, com nomes de pacientes;
- `data6/set26_v5.xlsx`: relatório de transações de setembro;
- `fonts/local.css`: as fontes do PDF.

## Para fechar Rio Branco (08/10) no mesmo escopo

- **Receitas:** relatório de transações de Rio Branco do dia 08/10, com os mesmos ajustes
  de consulta pelo valor total.
- **Custo real da sala:** lançamentos de Rio Branco no relatório de setembro, mais o nº de
  salas produtivas e o horário de funcionamento de Rio Branco.
- **O que mantém:**
  - as horas de sala (1 h por consulta + visitas do tratamento fechado);
  - os insumos por tratamento;
  - as taxas.
- **Para confirmar:**
  - o custo-hora negociado para Rio Branco;
  - a parte das passagens que fica com Rio Branco (a 2ª parcela de R$ 2.160,00 vem em novembro).
