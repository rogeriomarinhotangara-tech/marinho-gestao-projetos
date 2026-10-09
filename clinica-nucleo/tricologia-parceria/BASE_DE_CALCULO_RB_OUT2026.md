# Base de cálculo — fechamento de Rio Branco (08/10/2026)

Usa o mesmo modelo de Cruzeiro do Sul ([`BASE_DE_CALCULO_CZS_OUT2026.md`](BASE_DE_CALCULO_CZS_OUT2026.md)).
A planilha é gerada por `scripts/build_simples_rb.py`. O PDF e o Word saem de
`scripts/build_print.py` e `scripts/build_docx.js`, com os parâmetros `"Rio Branco" "atendimentos de 08/10/2026"`.
Nenhum arquivo com nomes de pacientes fica no repositório.

## Receitas (relatório de transações de 08/10/2026, 19 lançamentos)

| Tipo | R$ |
|---|---|
| Consultas | 2.500,00 |
| Tricologia | 21.200,00 |
| Facial | 15.200,00 |
| Pescoço | 15.200,00 |
| Corporal | 7.200,00 |
| **Receita bruta** | **61.300,00** |

- **Lançamentos com mais de um serviço:** foram separados pelos detalhes da transação.
  - Facial R$ 8.000 + tricologia R$ 10.000.
  - Corporal, facial e pescoço: R$ 7.200 cada.
- **Consulta de R$ 800 paga em 23/09 via PIX:** entra em outubro, mesma regra de Cruzeiro do Sul.
- **Pescoço de R$ 8.000 (eletroporação):** pagamento em aberto, a cada 15 dias.
- **Vendas no cartão de crédito:** R$ 51.700,00.

## Despesas (7 contas)

- **Mesmas regras de Cruzeiro do Sul:**
  - PIS e COFINS: 0,65% e 3%;
  - taxa do cartão: 1,92%;
  - antecipação: 8,74%;
  - IRPJ e CSLL: 7,68% sobre consultas e 2,28% sobre procedimentos;
  - insumos por tratamento fechado: tricologia R$ 1.232,08; facial, pescoço e corporal R$ 2.963,04.
- **Taxa do cartão medida em Rio Branco:** R$ 643,73 sobre R$ 33.700,00 com taxa registrada, ou 1,91%.
- **Viagem:** R$ 0,00. Passagens, alimentação e táxi já foram descontados por inteiro em Cruzeiro do Sul.

## Custo da sala (pela metragem)

- **Custo fixo de setembro/2026:** R$ 64.135,95, em 44 lançamentos de estrutura de Rio Branco.
  - Inclui aluguel de R$ 11.000,60, condomínio de R$ 1.460,66 e IPTU.
  - Inclui equipe, encargos, benefícios, energia, internet, contabilidade, jurídico, sistemas e manutenção.
  - Fora da conta: pró-labore e retiradas, aluguel do depósito, empréstimos, parcelamentos e
    tributos, equipamentos, medicamentos e insumos, marketing, consultorias, faturas de cartão,
    fretes, reembolsos e Epitaciolândia.
- **Salas produtivas** (inventário patrimonial): 6 salas, 77,18 m².
  - Soroterapia: 21,88 m².
  - Procedimento 01 e 02: 9,45 m² cada.
  - Consultório médico: 11,66 m².
  - Nutricionista: 10,13 m².
  - Esteira: 14,61 m².
- **Custo de 1 m² por hora:** R$ 64.135,95 ÷ (77,18 m² × 143 h) = R$ 5,81. As 143 h são 22 dias × 10 h × 65% de ocupação.
- **Custo real de 1 sala por hora:** R$ 5,81 × 9,45 m² (sala de procedimento) = **R$ 54,90**. A média por sala é R$ 74,75.
- **Custo negociado:** R$ 40,00 por hora, o mesmo de Cruzeiro do Sul.
- **Horas:** 3 consultas × 1 h + 43 h de visitas = 46 h.
  - Tricologia: 2 pacientes × 11 visitas de 30 min.
  - Pescoço: 2 pacientes × 8 visitas de 30 min.
  - Facial: 2 pacientes × 8 visitas de 30 min.
  - Corporal: 1 paciente × 16 visitas de 1 h.
- **Taxa de ocupação da sala:** R$ 1.840,00. Pelo custo real seriam R$ 2.525,40, então o desconto da clínica é de R$ 685,40.

## Resultado de Rio Branco

| | R$ |
|---|---|
| Receita bruta | 61.300,00 |
| Total das despesas | 28.400,67 |
| Resultado para dividir | 32.899,33 |
| Dra. Patrícia (50%) | 16.449,67 |
| Clínica Núcleo S (50%) | 16.449,66 |
