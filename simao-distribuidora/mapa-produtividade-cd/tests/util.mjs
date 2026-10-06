// Utilidades dos testes locais: servidor da página (com o mesmo "esqueleto" do claude.ai),
// bibliotecas do npm no lugar do CDN, fontes locais e o simulador do runtime.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIBS = process.env.LIBS_DIR || '/tmp/claude-0/-home-user-marinho-gestao-projetos/08452eb8-14b3-56b8-8700-3c254c73c21b/scratchpad/libs';
const FONTES = process.env.FONTES_DIR || '/tmp/claude-0/-home-user-marinho-gestao-projetos/08452eb8-14b3-56b8-8700-3c254c73c21b/scratchpad/fonts';
const MAPA_LIBS = [
  [/Chart\.js\/4\.4\.1\/chart\.umd\.js|chart\.js@4\.4\.1/, 'chart.js-4.4.1/package/dist/chart.umd.js'],
  [/jspdf\/2\.5\.1\/jspdf\.umd\.min\.js|jspdf@2\.5\.1/, 'jspdf-2.5.1/package/dist/jspdf.umd.min.js'],
  [/jspdf-autotable\/3\.8\.2|jspdf-autotable@3\.8\.2/, 'jspdf-autotable-3.8.2/package/dist/jspdf.plugin.autotable.min.js'],
  [/xlsx\/0\.18\.5|xlsx@0\.18\.5/, 'xlsx-0.18.5/package/dist/xlsx.full.min.js']
];
const ESQUELETO = c => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif;background:#fafaf9}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${c}</body></html>`;

export function servidor() {
  const html = fs.readFileSync(path.join(RAIZ, 'dist/mapa-produtividade-cd-simao.html'), 'utf8');
  const srv = http.createServer((req, res) => { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(ESQUELETO(html)); });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ url: `http://127.0.0.1:${srv.address().port}/`, fechar: () => srv.close() })));
}
export async function navegador() { return chromium.launch(); }
// A carga tem nomes e produtividade dos colaboradores: fica fora do Git (carga-inicial/ no .gitignore ou SEED_JSON).
export function seed() {
  const arq = process.env.SEED_JSON || path.join(RAIZ, 'carga-inicial/seed.json');
  if (!fs.existsSync(arq)) throw new Error(`Carga de teste não encontrada em ${arq}. Gere com scripts/gerar_carga.py ou aponte SEED_JSON.`);
  return JSON.parse(fs.readFileSync(arq, 'utf8'));
}
export async function novaPagina(browser, url, { cfg = {}, viewport = { width: 1440, height: 900 }, esquema = 'light', bloquearCdnjs = false } = {}) {
  const ctx = await browser.newContext({ viewport, colorScheme: esquema, locale: 'pt-BR', timezoneId: 'America/Rio_Branco', acceptDownloads: true });
  const page = await ctx.newPage();
  const erros = [];
  page.on('console', m => { if (m.type() === 'error') erros.push('console: ' + m.text()); });
  page.on('pageerror', e => erros.push('pageerror: ' + e.message));
  await page.route(/cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net/, route => {
    const u = route.request().url();
    if (bloquearCdnjs && u.includes('cdnjs')) return route.fulfill({ status: 404, body: '' });
    const m = MAPA_LIBS.find(([re]) => re.test(u));
    if (!m) return route.fulfill({ status: 404, body: '' });
    route.fulfill({ body: fs.readFileSync(path.join(LIBS, m[1])), contentType: 'application/javascript' });
  });
  await page.route(/fonts\.googleapis\.com/, r => r.fulfill({ body: fs.readFileSync(path.join(FONTES, 'ubuntu.css')), contentType: 'text/css' }));
  await page.route(/fonts\.gstatic\.com/, r => { const f = r.request().url().split('/').pop(); const p = path.join(FONTES, f); r.fulfill(fs.existsSync(p) ? { body: fs.readFileSync(p), contentType: 'font/woff2' } : { status: 404, body: '' }); });
  await page.addInitScript(c => { window.__MOCK_CFG__ = c; }, cfg);
  await page.addInitScript({ path: path.join(RAIZ, 'tests/mock-claude.js') });
  await page.goto(url);
  return { page, ctx, erros };
}
export async function aguardarPronto(page) {
  await page.waitForFunction(() => window.__mapa && window.__mapa.S.status !== 'conectando', null, { timeout: 15000 });
  await page.waitForFunction(() => !!window.Chart, null, { timeout: 15000 });
  await page.waitForTimeout(250);
}
