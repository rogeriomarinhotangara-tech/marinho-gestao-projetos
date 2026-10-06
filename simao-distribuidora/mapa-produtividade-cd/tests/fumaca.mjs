// Teste de fumaça: abre cada tela com a carga inicial, coleta erros e tira capturas.
import fs from 'node:fs';
import path from 'node:path';
import { servidor, navegador, novaPagina, aguardarPronto, seed, RAIZ } from './util.mjs';

const SAIDA = process.env.SAIDA || path.join(RAIZ, 'tests/saida');
fs.mkdirSync(SAIDA, { recursive: true });
const srv = await servidor();
const b = await navegador();
const telas = [
  ['painel', {}], ['funcao', { f: 'recebimento' }], ['funcao', { f: 'separacao' }], ['funcao', { f: 'expedicao' }], ['rankings', { aba: 'mensal' }], ['rankings', { aba: 'acumulado' }],
  ['rankings', { aba: 'evolucao' }], ['rankings', { aba: 'campeoes' }], ['ficha', {}], ['ficha', { codigo: '215' }], ['ficha', { codigo: '245' }], ['multifuncao', {}], ['fluxo', {}],
  ['alertas', { aba: 'alertas' }], ['alertas', { aba: 'plano' }], ['lancamentos', {}], ['lancamento', { id: '2026-06-94-separacao' }], ['importar', {}], ['colaboradores', {}],
  ['parametros', { aba: 'gerais' }], ['parametros', { aba: 'metas' }], ['parametros', { aba: 'meses' }], ['auditoria', {}], ['relatorios', {}], ['guia', {}], ['indicador', { id: 'itens' }]
];
const modos = (process.env.MODOS || 'desktop-claro').split(',');
for (const modo of modos) {
  const vp = modo.startsWith('cel') ? { width: 390, height: 844 } : { width: 1440, height: 900 };
  const { page, erros } = await novaPagina(b, srv.url, { cfg: { seed: seed(), podeEditar: true }, viewport: vp, esquema: modo.includes('escuro') ? 'dark' : 'light' });
  await aguardarPronto(page);
  for (const [rota, params] of telas) {
    await page.evaluate(([r, p]) => window.__mapa.navegar(r, p, 'menu'), [rota, params]);
    await page.waitForTimeout(300);
    const info = await page.evaluate(() => ({ larg: document.documentElement.scrollWidth, vis: innerWidth, texto: document.body.innerText.slice(0, 120).replace(/\s+/g, ' ') }));
    const nome = `${modo}-${rota}${params.f ? '-' + params.f : ''}${params.aba ? '-' + params.aba : ''}${params.codigo ? '-' + params.codigo : ''}${params.id ? '-' + params.id : ''}`;
    if (process.env.CAPTURAS !== '0') await page.screenshot({ path: path.join(SAIDA, nome + '.png'), fullPage: true });
    console.log(`${nome}: largura ${info.larg}/${info.vis}${info.larg > info.vis ? '  ROLAGEM HORIZONTAL!' : ''}`);
  }
  console.log(`[${modo}] erros:`, erros.length ? erros : 'nenhum');
  await page.context().close();
}
await b.close();
srv.fechar();
