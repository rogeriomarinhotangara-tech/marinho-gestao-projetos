// Monta site/index.html: o mesmo mapa de dist/ (sem nenhuma alteração), precedido do
// adaptador que liga o mapa ao Supabase fora do claude.ai.
// Uso: node scripts/montar.mjs && node scripts/montar-site.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERSAO_SUPABASE = '2.117.2';
const SDK = `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@${VERSAO_SUPABASE}/dist/umd/supabase.js`;

const mapa = fs.readFileSync(path.join(RAIZ, 'dist/mapa-produtividade-cd-simao.html'), 'utf8');
const adaptador = fs.readFileSync(path.join(RAIZ, 'publicacao/adaptador-supabase.js'), 'utf8');
const logo = 'data:image/png;base64,' + fs.readFileSync(path.join(RAIZ, 'assets/logo-simao.png')).toString('base64');
if (!adaptador.includes('__LOGO_SIMAO__')) throw new Error('marcador da logo não encontrado no adaptador');
if (/<\/script/i.test(adaptador)) throw new Error('o adaptador não pode conter </script>');

// mesmo "esqueleto" que o claude.ai usa em volta do artefato, para o mapa ficar idêntico
const RESET = ':root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif;background:#fafaf9}img{max-width:100%}[hidden]{display:none!important}';

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>Mapa de Produtividade — CD Simão</title>
<style>${RESET}</style>
<script src="${SDK}"></script>
<script>
${adaptador.replace('__LOGO_SIMAO__', () => logo)}
</script>
</head>
<body>
${mapa}
</body>
</html>
`;

const destino = path.join(RAIZ, 'site/index.html');
fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.writeFileSync(destino, html);
// confere que o mapa entrou byte a byte
if (!fs.readFileSync(destino, 'utf8').includes(mapa)) throw new Error('o mapa não entrou intacto no site');
console.log(`Gerado site/index.html (${(html.length / 1024).toFixed(1)} KB): mapa idêntico ao de dist/ + adaptador do Supabase ${VERSAO_SUPABASE}`);
