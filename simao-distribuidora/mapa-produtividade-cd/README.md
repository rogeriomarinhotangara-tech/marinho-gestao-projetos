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
| `dist/` | Página pronta para publicar como artefato no claude.ai |
| `publicacao/` | Adaptador do Supabase (banco, entrada e downloads fora do claude.ai) e o script SQL do banco |
| `site/index.html` | O mesmo mapa de `dist/`, sem alteração, com o adaptador: é a página publicada na Vercel |
| `tests/` | Simulador do runtime do claude.ai e testes com Playwright |

## Comandos

```bash
node scripts/montar.mjs                       # gera dist/mapa-produtividade-cd-simao.html
node scripts/montar-site.mjs                  # gera site/index.html (rodar depois do montar.mjs)
python3 scripts/gerar_carga.py ANALISE.xlsx JULHO.xlsx AGOSTO.xlsx SETEMBRO.xlsx   # refaz carga-inicial/

# testes (bibliotecas do npm em LIBS_DIR e fontes em FONTES_DIR no lugar do CDN)
node tests/fumaca.mjs                         # 26 telas em computador, celular e modo escuro
SAIDA=/tmp/exp node tests/exportacoes.mjs     # gera todos os PDFs, Excel e a cópia JSON
KAIZEN_SET=/caminho/Produtividade_Setembro.xlsx node tests/aceite.mjs   # critérios de aceite
# os testes leem carga-inicial/seed.json local ou o arquivo apontado em SEED_JSON (nunca versionado)
ALVO=site node tests/aceite.mjs              # os mesmos critérios de aceite, no site com Supabase simulado
node tests/site.mjs                           # entrada, papéis, tempo real, senha, configuração e migração
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
`carga-inicial/`, as planilhas e as cópias de segurança (`Copia_Seguranca_*.json`) estão no `.gitignore`.
A base fica só nos bancos, que exigem entrada: o do artefato no claude.ai e o Supabase do site, este com as regras de
`publicacao/supabase.sql` (só quem está em `perfis` lê; só editor e dono gravam).

## Publicar fora do claude.ai (site na Vercel)

O mapa roda igual em `site/index.html`. A diferença está só no adaptador (`publicacao/adaptador-supabase.js`): ele troca o banco
do claude.ai pelo Supabase e acrescenta a tela de entrada com e-mail e senha. O endereço fica
`https://marinho-gestao-projetos.vercel.app/mapa-cd-simao` (configurado no `vercel.json` da raiz).

Uma vez só:

1. **Banco:** na Vercel, projeto `marinho-gestao-projetos` › Storage › Create Database › Supabase (plano gratuito, região São Paulo)
   › conectar ao projeto. Isso cria as variáveis `SUPABASE_URL` e `SUPABASE_ANON_KEY`. Se preferir criar o projeto direto no
   supabase.com, cadastre essas duas variáveis em Settings › Environment Variables.
2. **Tabelas e regras:** no Supabase, SQL Editor › colar o conteúdo de `publicacao/supabase.sql` › Run.
3. **Pessoas:** Authentication › Users › Add user › Create new user, com e-mail, senha e "Auto Confirm User", para cada pessoa.
4. **Papéis:** Table Editor › `perfis` › Insert row, com o e-mail e o papel: `dono`, `editor` ou `leitor`.
   Leitor consulta, filtra e exporta; editor também grava e importa. Quem não está em `perfis` não vê dado nenhum.
5. **Links de e-mail:** Authentication › URL Configuration › Site URL = `https://marinho-gestao-projetos.vercel.app/mapa-cd-simao`.
6. **Republicar:** na Vercel, Deployments › Redeploy, para o site enxergar as variáveis.
7. **Dados:** entrar como dono › Relatórios e Exportação › Restaurar a partir do JSON › escolher a cópia de segurança baixada
   do artefato › Substituir › digitar RESTAURAR.

Senhas: cada pessoa troca a sua em "Trocar senha", no rodapé do menu. No plano gratuito sem SMTP próprio, o e-mail de
"Esqueci minha senha" só chega para quem é da equipe do projeto no Supabase; para os demais, o dono define uma senha nova
em Authentication › Users.

Depois de qualquer mudança no mapa: `node scripts/montar.mjs && node scripts/montar-site.mjs`, commit e push.
