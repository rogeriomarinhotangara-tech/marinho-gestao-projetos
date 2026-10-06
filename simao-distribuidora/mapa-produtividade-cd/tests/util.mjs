// Utilidades dos testes locais: servidor da página (com o mesmo "esqueleto" do claude.ai),
// bibliotecas do npm no lugar do CDN, fontes locais e o simulador do runtime.
// ALVO=site testa o site publicado fora do claude.ai (site/index.html + Supabase simulado).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { criarSupabaseSimulado, URL_SUPABASE, CHAVE_PUBLICA, USUARIOS_TESTE } from './supabase-simulado.mjs';

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ALVO = process.env.ALVO === 'site' ? 'site' : 'artefato';
const LIBS = process.env.LIBS_DIR || '/tmp/claude-0/-home-user-marinho-gestao-projetos/08452eb8-14b3-56b8-8700-3c254c73c21b/scratchpad/libs';
const FONTES = process.env.FONTES_DIR || '/tmp/claude-0/-home-user-marinho-gestao-projetos/08452eb8-14b3-56b8-8700-3c254c73c21b/scratchpad/fonts';
const MAPA_LIBS = [
  [/Chart\.js\/4\.4\.1\/chart\.umd\.js|chart\.js@4\.4\.1/, 'chart.js-4.4.1/package/dist/chart.umd.js'],
  [/jspdf\/2\.5\.1\/jspdf\.umd\.min\.js|jspdf@2\.5\.1/, 'jspdf-2.5.1/package/dist/jspdf.umd.min.js'],
  [/jspdf-autotable\/3\.8\.2|jspdf-autotable@3\.8\.2/, 'jspdf-autotable-3.8.2/package/dist/jspdf.plugin.autotable.min.js'],
  [/xlsx\/0\.18\.5|xlsx@0\.18\.5/, 'xlsx-0.18.5/package/dist/xlsx.full.min.js'],
  [/@supabase\/supabase-js@2\.117\.2\/dist\/umd\/supabase\.js/, 'supabase/package/dist/umd/supabase.js']
];
const ESQUELETO = c => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif;background:#fafaf9}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${c}</body></html>`;

export function servidor({ config = { url: URL_SUPABASE, chave: CHAVE_PUBLICA } } = {}) {
  const html = fs.readFileSync(path.join(RAIZ, 'dist/mapa-produtividade-cd-simao.html'), 'utf8');
  const srv = http.createServer((req, res) => {
    const p = req.url.split('?')[0];
    if (p === '/api/mapa-cd-simao/config') { res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(config)); return; }
    if (p === '/mapa-cd-simao') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(fs.readFileSync(path.join(RAIZ, 'site/index.html'))); return; }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(ESQUELETO(html));
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ url: `http://127.0.0.1:${srv.address().port}/`, fechar: () => srv.close() })));
}
export async function navegador() { return chromium.launch(); }
// A carga tem nomes e produtividade dos colaboradores: fica fora do Git (carga-inicial/ no .gitignore ou SEED_JSON).
export function seed() {
  const arq = process.env.SEED_JSON || path.join(RAIZ, 'carga-inicial/seed.json');
  if (!fs.existsSync(arq)) throw new Error(`Carga de teste não encontrada em ${arq}. Gere com scripts/gerar_carga.py ou aponte SEED_JSON.`);
  return JSON.parse(fs.readFileSync(arq, 'utf8'));
}

/* No site, os downloads são do navegador (link com download): guarda o conteúdo em window.__DOWNLOADS__ como o simulador do artefato. */
function capturarDownloads() {
  window.__DOWNLOADS__ = [];
  const clicar = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.download && /^blob:/.test(this.href)) {
      const nome = this.download;
      fetch(this.href).then(r => r.arrayBuffer()).then(buf => {
        const bytes = new Uint8Array(buf);
        let bin = '';
        for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        window.__DOWNLOADS__.push({ filename: nome, base64: btoa(bin) });
      });
      return undefined;
    }
    return clicar.call(this);
  };
}

export async function entrar(page, quem = 'editor') {
  const u = USUARIOS_TESTE[quem];
  await page.waitForSelector('#acesso-email', { timeout: 15000 });
  await page.fill('#acesso-email', u.email);
  await page.fill('#acesso-senha', u.senha);
  await page.click('#form-entrar button[type="submit"]');
}

export async function novaPagina(browser, url, { cfg = {}, viewport = { width: 1440, height: 900 }, esquema = 'light', bloquearCdnjs = false, alvo = ALVO, emu = null, quem = null, semEntrar = false, contexto = null } = {}) {
  const ctx = contexto || await browser.newContext({ viewport, colorScheme: esquema, locale: 'pt-BR', timezoneId: 'America/Rio_Branco', acceptDownloads: true });
  const page = await ctx.newPage();
  const erros = [];
  page.on('console', m => { if (m.type() === 'error') erros.push('console: ' + m.text()); });
  page.on('pageerror', e => erros.push('pageerror: ' + e.message));
  await page.route(/cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com/, route => {
    const u = route.request().url();
    if (bloquearCdnjs && u.includes('cdnjs')) return route.fulfill({ status: 404, body: '' });
    const m = MAPA_LIBS.find(([re]) => re.test(u));
    if (!m) return route.fulfill({ status: 404, body: '' });
    route.fulfill({ body: fs.readFileSync(path.join(LIBS, m[1])), contentType: 'application/javascript' });
  });
  await page.route(/fonts\.googleapis\.com/, r => r.fulfill({ body: fs.readFileSync(path.join(FONTES, 'ubuntu.css')), contentType: 'text/css' }));
  await page.route(/fonts\.gstatic\.com/, r => { const f = r.request().url().split('/').pop(); const p = path.join(FONTES, f); r.fulfill(fs.existsSync(p) ? { body: fs.readFileSync(p), contentType: 'font/woff2' } : { status: 404, body: '' }); });
  if (alvo === 'site') {
    emu = emu || criarSupabaseSimulado({ documentos: cfg.seed || {}, recusarGravacao: !!cfg.recusarGravacao });
    await page.route(/teste-mapa\.supabase\.co/, r => emu.rotear(r));
    await page.routeWebSocket(/teste-mapa\.supabase\.co/, ws => emu.tempoReal(ws));
    await page.addInitScript(capturarDownloads);
    await page.goto(url + 'mapa-cd-simao');
    if (!semEntrar) await entrar(page, quem || (cfg.podeEditar === false ? 'leitor' : 'editor'));
    return { page, ctx, erros, emu };
  }
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
