// Gera todas as exportações (PDF da tela, Relatório Executivo, ficha, Excel da tela, Excel completo, cópia JSON)
// pelo caminho real dos botões e grava os arquivos em SAIDA para conferência externa.
// Uso: SAIDA=/caminho node tests/exportacoes.mjs
import fs from 'node:fs';
import path from 'node:path';
import { servidor, navegador, seed, novaPagina, aguardarPronto, ALVO } from './util.mjs';

const SAIDA = process.env.SAIDA || path.resolve('saida-exportacoes');
fs.mkdirSync(SAIDA, { recursive: true });

const srv = await servidor();
const browser = await navegador();
const { page, erros } = await novaPagina(browser, srv.url, { cfg: { seed: seed(), podeEditar: true } });
await aguardarPronto(page);

async function esperarDownloads(n, rotulo) {
  try {
    await page.waitForFunction(k => window.__DOWNLOADS__.length >= k, n, { timeout: 60000 });
  } catch (e) {
    const toasts = await page.$$eval('.toast', ts => ts.map(t => t.textContent));
    throw new Error(`${rotulo}: arquivo não gerado. Avisos na tela: ${toasts.join(' | ')}`);
  }
}
async function clicar(seletor) { await page.click(seletor); }
async function ir(rota, params) { await page.evaluate(([r, p]) => window.__mapa.navegar(r, p || {}), [rota, params]); await page.waitForTimeout(400); }

let n = 0;
const passos = [
  ['Painel – PDF da tela', async () => { await ir('painel'); await clicar('[data-acao="exportar-pdf"]'); }],
  ['Painel – Excel da tela', async () => { await clicar('[data-acao="exportar-excel"]'); }],
  ['Separação – PDF da tela', async () => { await ir('funcao', { f: 'separacao' }); await clicar('[data-acao="exportar-pdf"]'); }],
  ['Rankings – Excel da tela', async () => { await ir('rankings'); await clicar('[data-acao="exportar-excel"]'); }],
  ['Fluxo – PDF da tela', async () => { await ir('fluxo'); await clicar('[data-acao="exportar-pdf"]'); }],
  ['Auditoria – PDF da tela', async () => { await ir('auditoria'); await clicar('[data-acao="exportar-pdf"]'); }],
  ['Relatório Executivo', async () => { await ir('relatorios'); await clicar('[data-acao="rel-executivo"]'); }],
  ['Excel completo', async () => { await clicar('[data-acao="rel-excel"]'); }],
  ['Ficha PDF (código 245)', async () => { await ir('ficha', { codigo: '245' }); await clicar('[data-acao="exportar-ficha"]'); }],
  ['Cópia de segurança', async () => { await ir('relatorios'); await clicar('[data-acao="copia-baixar"]'); }]
];
for (const [rotulo, fazer] of passos) {
  const t0 = Date.now();
  await fazer();
  n += 1;
  await esperarDownloads(n, rotulo);
  const d = await page.evaluate(k => window.__DOWNLOADS__[k - 1], n);
  const destino = path.join(SAIDA, d.filename);
  fs.writeFileSync(destino, Buffer.from(d.base64, 'base64'));
  console.log(`${rotulo}: ${d.filename} (${(fs.statSync(destino).size / 1024).toFixed(1)} KB, ${Date.now() - t0} ms)`);
  await page.waitForTimeout(300);
}

// Visualizador sem downloads (só existe no claude.ai): os botões de exportação não aparecem.
let sem = { erros: [] };
if (ALVO !== 'site') {
  sem = await novaPagina(browser, srv.url, { cfg: { seed: seed(), podeEditar: true, semDownloads: true } });
  await aguardarPronto(sem.page);
  const botoesTopo = await sem.page.$$eval('[data-acao="exportar-pdf"],[data-acao="exportar-excel"],[data-acao="menu-exportar"]', b => b.length);
  await sem.page.evaluate(() => window.__mapa.navegar('relatorios', {}));
  await sem.page.waitForTimeout(300);
  const botoesRel = await sem.page.$$eval('[data-acao="rel-executivo"],[data-acao="rel-excel"],[data-acao="rel-ficha"],[data-acao="copia-baixar"]', b => b.length);
  const aviso = await sem.page.$eval('.aviso', a => a.textContent).catch(() => '');
  console.log(`Sem downloads: botões no topo ${botoesTopo}, botões em Relatórios ${botoesRel}, aviso: ${aviso.slice(0, 60)}…`);

}
console.log('erros de console:', erros.length ? erros.join('\n') : 'nenhum', '| sem downloads:', sem.erros.length ? sem.erros.join('\n') : 'nenhum');
await browser.close();
srv.fechar();
