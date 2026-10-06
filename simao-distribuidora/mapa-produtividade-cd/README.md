# Mapa de Produtividade — CD Simão

Painel de produtividade do Centro de Distribuição da Simão Distribuidora (Rio Branco/AC):
Recebimento, Separação e Conferência de Expedição, com ranking mensal e acumulado,
ficha do colaborador, multifunção, fluxo e capacidade, alertas com plano de ação,
importação mensal da extração do Kaizen, auditoria e relatórios em PDF e Excel.

Publicado em https://claude.ai/artifact/Fjdnd79VjZC9cfbd4V4uAr (privado: compartilhe pelo menu Compartilhar;
Visualizador só consulta e exporta, Editor também grava).

É uma página única publicada como artefato no claude.ai, com as capacidades
`db` (dados compartilhados), `user` (quem pode editar) e `downloads` (PDF, Excel e JSON).
Regra do banco: todos que abrem o link leem; só Editor e Dono gravam.

## Pastas

| Pasta | Conteúdo |
|---|---|
| `src/` | Código-fonte: `styles.css` e os módulos `js/` (00-base … 99-inicio) |
| `assets/` | Logos da Simão usadas na página (embutidas em base64 no HTML) |
| `scripts/montar.mjs` | Junta CSS, JS e logos em `dist/mapa-produtividade-cd-simao.html` |
| `scripts/gerar_carga.py` | Lê a planilha de análise e as extrações de jul/ago/set, confere com a tabela de fechamento e gera `carga-inicial/` |
| `carga-inicial/` | Gerada localmente pelo `gerar_carga.py` e **fora do Git** (`.gitignore`): tem nomes e produtividade dos colaboradores. Os dados oficiais ficam no banco privado do artefato |
| `dist/` | Página pronta para publicar |
| `tests/` | Simulador do runtime do claude.ai e testes com Playwright |

## Comandos

```bash
node scripts/montar.mjs                       # gera dist/mapa-produtividade-cd-simao.html
python3 scripts/gerar_carga.py ANALISE.xlsx JULHO.xlsx AGOSTO.xlsx SETEMBRO.xlsx   # refaz carga-inicial/

# testes (bibliotecas do npm em LIBS_DIR e fontes em FONTES_DIR no lugar do CDN)
node tests/fumaca.mjs                         # 26 telas em computador, celular e modo escuro
SAIDA=/tmp/exp node tests/exportacoes.mjs     # gera todos os PDFs, Excel e a cópia JSON
KAIZEN_SET=/caminho/Produtividade_Setembro.xlsx node tests/aceite.mjs   # critérios de aceite
# os testes leem carga-inicial/seed.json local ou o arquivo apontado em SEED_JSON (nunca versionado)
```

## Rotina mensal

1. Pedir ao suporte Kaizen a extração de produtividade do mês fechado (mesmo layout).
2. Importar Extração: soltar o arquivo, conferir a pré-visualização, confirmar.
3. Revisar colaboradores novos, a função principal e quem foi desligado.
4. Conferir dias de operação e escopo da coleta do mês (Parâmetros e Metas › Meses).
5. Auditoria: diferença zero.
6. Fechar o mês e enviar o Relatório Executivo ao CEO e ao gerente.

## Dados pessoais

Este repositório é público. Nomes dos colaboradores, a base de lançamentos e as planilhas do Kaizen não entram no Git:
`carga-inicial/`, `*.xlsx`, `*.xls` e `*.csv` estão no `.gitignore`. A base fica só no banco do artefato,
que é privado e só aceita gravação de Editor e Dono.
