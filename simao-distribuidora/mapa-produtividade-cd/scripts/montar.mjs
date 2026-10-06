// Monta a página única (HTML autocontido) a partir de src/ e assets/.
// Uso: node scripts/montar.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = p => fs.readFileSync(path.join(raiz, p), 'utf8');
const b64 = p => 'data:image/png;base64,' + fs.readFileSync(path.join(raiz, p)).toString('base64');

const css = ler('src/styles.css');
const arquivosJs = fs.readdirSync(path.join(raiz, 'src/js')).filter(f => f.endsWith('.js')).sort();
const js = arquivosJs.map(f => `/* ---- ${f} ---- */\n` + ler(`src/js/${f}`)).join('\n');

const BIBLIOTECAS = [
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

const html = `<title>Mapa de Produtividade — CD Simão</title>
<meta name="description" content="Produtividade por função e por colaborador do CD da Simão Distribuidora (Rio Branco/AC), a partir das extrações do coletor Kaizen.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Ubuntu:wght@400;500;700&display=swap">
<style>
${css}
</style>
<div id="app" class="app"></div>
${BIBLIOTECAS.map(u => `<script defer src="${u}"></script>`).join('\n')}
<script>
(function () {
'use strict';
const LOGO_SIMAO = '${b64('assets/logo-simao.png')}';
const LOGO_CHAPEU = '${b64('assets/logo-simao-chapeu.png')}';
${js}
})();
</script>
`;
fs.mkdirSync(path.join(raiz, 'dist'), { recursive: true });
const saida = path.join(raiz, 'dist/mapa-produtividade-cd-simao.html');
fs.writeFileSync(saida, html);
console.log(`Gerado ${path.relative(raiz, saida)} (${(html.length / 1024).toFixed(1)} KB, ${arquivosJs.length} módulos)`);
