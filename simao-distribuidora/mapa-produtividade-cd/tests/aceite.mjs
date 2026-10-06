// Critérios de aceite (seção 13) executados contra a página gerada, com o simulador do runtime do claude.ai.
// Uso: KAIZEN_SET=/caminho/Produtividade_Setembro_Logistica.xlsx node tests/aceite.mjs
import fs from 'node:fs';
import { servidor, navegador, seed, novaPagina, aguardarPronto } from './util.mjs';

const ARQ_SET = process.env.KAIZEN_SET;
// Tabela de fechamento da seção 12: [linhas, dias-função, documentos, itens, unidades] por mês e função
const ESPERADO = {
  1: { recebimento: [3, 31, 57, 565, 144737], separacao: [9, 151, 1034, 9536, 267763], expedicao: [5, 64, 1023, 9531, 267523] },
  2: { recebimento: [4, 37, 121, 1192, 240605], separacao: [8, 119, 902, 7480, 218294], expedicao: [4, 65, 891, 7372, 214725] },
  3: { recebimento: [6, 48, 183, 2354, 350112], separacao: [10, 142, 1121, 12857, 335300], expedicao: [6, 73, 1110, 12724, 332281] },
  4: { recebimento: [2, 40, 138, 1643, 269230], separacao: [12, 148, 1428, 11984, 295669], expedicao: [4, 70, 1422, 12021, 297414] },
  5: { recebimento: [2, 40, 142, 2402, 359063], separacao: [10, 173, 1741, 14157, 334661], expedicao: [3, 71, 1728, 14025, 331892] },
  6: { recebimento: [2, 41, 146, 2656, 403011], separacao: [12, 178, 1853, 16616, 401894], expedicao: [4, 69, 1827, 16716, 402802] },
  7: { recebimento: [2, 49, 147, 2935, 455497], separacao: [9, 164, 1602, 11803, 263452], expedicao: [3, 70, 1598, 11647, 260740] },
  8: { recebimento: [3, 41, 107, 1500, 309729], separacao: [10, 147, 1547, 12084, 327862], expedicao: [4, 68, 1543, 12174, 329454] },
  9: { recebimento: [3, 48, 177, 2623, 455601], separacao: [13, 188, 2046, 16876, 411397], expedicao: [6, 85, 2043, 16795, 410325] }
};
const DIAS_OPERACAO = { 1: 26, 2: 24, 3: 26, 4: 26, 5: 26, 6: 26, 7: 27, 8: 26, 9: 26 };
const ym = (a, m) => a * 12 + (m - 1);
const SET = ym(2026, 9), AGO = ym(2026, 8);
const fmt = n => Math.round(n).toLocaleString('pt-BR');
const itensMes = m => Object.values(ESPERADO[m]).reduce((s, v) => s + v[3], 0);

const resultados = [];
function verificar(grupo, nome, ok, detalhe = '') {
  resultados.push({ grupo, nome, ok: !!ok, detalhe });
  console.log(`${ok ? 'OK   ' : 'FALHA'} [${grupo}] ${nome}${detalhe ? ' — ' + detalhe : ''}`);
}
async function ir(page, rota, params = {}) {
  await page.evaluate(([r, p]) => window.__mapa.navegar(r, p), [rota, params]);
  await page.waitForTimeout(350);
}
const estado = page => page.evaluate(() => ({ rota: window.__mapa.UI.rota, params: JSON.parse(JSON.stringify(window.__mapa.UI.params || {})), ym: window.__mapa.UI.ym, visao: window.__mapa.UI.visao }));
const contar = (page, col) => page.evaluate(c => window.__mapa.S[c].size, col);
const totais = (page, y, f) => page.evaluate(([y, f]) => { const t = window.__mapa.totaisFuncao(y, y, f).ag; return [t.linhas, t.dias, t.documentos, t.skus, t.unidades]; }, [y, f]);
async function textoKpi(page, rotulo) {
  return page.locator('.kpi', { hasText: rotulo }).first().locator('.val').innerText();
}
async function auditoriaZerada(page) {
  return page.evaluate(() => window.__mapa.auditoria(2026).amarracao.every(a => a.dif.dias === 0 && a.dif.itens === 0 && a.dif.unidades === 0));
}
async function esperarGravacoes(page, rotulo, timeout = 20000) {
  await page.waitForFunction(() => !document.querySelector('.modal-fundo') || !document.querySelector('.modal-fundo .pe-modal button[disabled]'), null, { timeout }).catch(() => {});
  await page.waitForTimeout(600);
}
async function clicarBotaoModal(page, texto) {
  await page.locator('.modal-fundo .pe-modal button', { hasText: texto }).first().click();
}

const srv = await servidor();
const browser = await navegador();
const errosGerais = [];

/* ======================= 1. Carga inicial confere com a seção 12 ======================= */
{
  const { page, erros } = await novaPagina(browser, srv.url, { cfg: { seed: seed(), podeEditar: true } });
  await aguardarPronto(page);
  const G = 'Carga';
  verificar(G, '159 lançamentos e 25 colaboradores carregados', (await contar(page, 'lancamentos')) === 159 && (await contar(page, 'colaboradores')) === 25,
    `${await contar(page, 'lancamentos')} lançamentos, ${await contar(page, 'colaboradores')} colaboradores`);
  const difs = [];
  for (const [m, fs] of Object.entries(ESPERADO)) for (const [f, esp] of Object.entries(fs)) {
    const t = await totais(page, ym(2026, +m), f);
    const ok = t.slice(0, 4).every((v, i) => v === esp[i]) && Math.abs(t[4] - esp[4]) <= 0.5;
    if (!ok) difs.push(`${m}/${f}: ${t.join('/')} ≠ ${esp.join('/')}`);
  }
  verificar(G, 'Totais por mês e função iguais à tabela da seção 12 (27 combinações)', !difs.length, difs.join('; '));
  const dOp = await page.evaluate(() => Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map(m => [m, window.__mapa.infoMes(2026 * 12 + m - 1).diasOperacao])));
  verificar(G, 'Dias de operação por mês (26, 24, 26, 26, 26, 26, 27, 26, 26)', Object.entries(DIAS_OPERACAO).every(([m, d]) => dOp[m] === d), JSON.stringify(dOp));
  verificar(G, 'Auditoria: base × painéis mensais × acumulado com diferença zero', await auditoriaZerada(page));
  await ir(page, 'auditoria');
  const txtAud = await page.locator('#conteudo').innerText();
  verificar(G, 'Tela de Auditoria mostra "Amarrado" nas três funções', (txtAud.match(/Amarrado/g) || []).length >= 3);
  const esc = await page.evaluate(() => [8, 9, 10].map(m => window.__mapa.infoMes(2026 * 12 + m - 1)).map(i => `${i.escopo}|${i.quebraSerie}`));
  verificar(G, 'Escopo: agosto "Lojas Simão"; setembro com rotas externas e quebra de série', esc[0].startsWith('Lojas Simão|false') && /rotas externas a partir de 22\/09\|true/.test(esc[1]), esc.join(' · '));

  /* ======================= 2. Painel, mês e visão ======================= */
  const P = 'Painel e filtros';
  await ir(page, 'painel');
  verificar(P, 'Abre no último mês com dados (setembro/2026)', (await estado(page)).ym === SET);
  verificar(P, 'Cartão Itens (SKU) de setembro = 36.294', (await textoKpi(page, 'Itens (SKU)')).includes(fmt(itensMes(9))), await textoKpi(page, 'Itens (SKU)'));
  verificar(P, 'Cartão Documentos de setembro = 4.266', (await textoKpi(page, 'Documentos')).includes('4.266'));
  verificar(P, 'Cartão Unidades de setembro = 1.277.323', (await textoKpi(page, 'Unidades')).includes('1.277.323'));
  await page.selectOption('#sel-mes', String(AGO));
  await page.waitForTimeout(400);
  verificar(P, 'Trocar o mês para agosto atualiza os cartões (25.758 itens)', (await textoKpi(page, 'Itens (SKU)')).includes(fmt(itensMes(8))), await textoKpi(page, 'Itens (SKU)'));
  const subAgo = await page.locator('.cab-tela').first().innerText().catch(() => '');
  verificar(P, 'Subtítulo da tela acompanha o mês', /Agosto\/2026/.test(subAgo), subAgo.split('\n')[1] || '');
  await page.click('[data-acao="visao"][data-p=\'"acumulado"\']');
  await page.waitForTimeout(400);
  const acum = [1, 2, 3, 4, 5, 6, 7, 8].reduce((s, m) => s + itensMes(m), 0);
  verificar(P, 'Acumulado jan–ago soma os meses (207.974 itens)', (await textoKpi(page, 'Itens (SKU)')).includes(fmt(acum)), await textoKpi(page, 'Itens (SKU)'));
  await page.click('[data-acao="visao"][data-p=\'"mensal"\']');
  await page.selectOption('#sel-mes', String(SET));
  await page.waitForTimeout(300);
  await page.selectOption('#sel-funcao', 'separacao');
  await page.waitForTimeout(400);
  verificar(P, 'Filtro de função (Separação) restringe os cartões (16.876 itens)', (await textoKpi(page, 'Itens (SKU)')).includes('16.876'), await textoKpi(page, 'Itens (SKU)'));
  await page.selectOption('#sel-funcao', '');
  await page.waitForTimeout(300);
  // ranking por função, acumulado = soma ÷ soma
  // sem códigos fixos: o líder e a ordem vêm dos próprios dados carregados
  const rk = await page.evaluate(() => {
    const r = window.__mapa.ranking(2026 * 12 + 8, 2026 * 12 + 8, 'separacao', 'principal');
    const ordenado = r.eleg.every((x, i) => i === 0 || r.eleg[i - 1].ind.indice > x.ind.indice || (r.eleg[i - 1].ind.indice === x.ind.indice && r.eleg[i - 1].ag.skus >= x.ag.skus));
    return { lider: r.eleg[0] && r.eleg[0].codigo, n: r.eleg.length, ordenado };
  });
  verificar(P, 'Ranking de Separação em setembro em ordem de Índice (desempate por itens)', rk.ordenado && rk.n > 0, `${rk.n} elegíveis`);
  const somaDivide = await page.evaluate(cod => {
    const ini = 2026 * 12, fim = 2026 * 12 + 8;
    const r = window.__mapa.linhasFuncao(ini, fim, 'separacao').find(x => x.codigo === cod);
    const ls = window.__mapa.S.lancamentos;
    let itens = 0, dias = 0;
    for (const l of ls.values()) if (l.codigo === cod && l.funcao === 'separacao' && l.ym >= ini && l.ym <= fim) { itens += l.skus; dias += l.diasFuncao; }
    return { painel: r.ind.itensDia, calculado: itens / dias };
  }, rk.lider);
  verificar(P, 'Acumulado usa soma ÷ soma (itens/dia do líder no ano)', Math.abs(somaDivide.painel - somaDivide.calculado) < 1e-9, `${somaDivide.painel.toFixed(3)} = ${somaDivide.calculado.toFixed(3)}`);

  /* ======================= 3. Cliques e aprofundamento ======================= */
  const C = 'Aprofundamento';
  await ir(page, 'painel');
  await page.locator('.kpi', { hasText: 'Itens (SKU)' }).first().click();
  await page.waitForTimeout(350);
  let e = await estado(page);
  verificar(C, 'Clique no cartão Itens abre o detalhamento do indicador', e.rota === 'indicador' && e.params.id === 'itens', JSON.stringify(e));
  await page.click('[data-acao="voltar"]');
  await page.waitForTimeout(350);
  verificar(C, 'Botão Voltar retorna ao Painel', (await estado(page)).rota === 'painel');
  await page.locator('.bala', { hasText: 'Separação' }).first().click();
  await page.waitForTimeout(350);
  e = await estado(page);
  verificar(C, 'Clique na barra de Separação abre a tela da função', e.rota === 'funcao' && e.params.f === 'separacao', JSON.stringify(e));
  await page.locator('tr[data-acao="ficha"]').first().click();
  await page.waitForTimeout(350);
  e = await estado(page);
  verificar(C, 'Clique na linha do ranking abre a ficha do colaborador', e.rota === 'ficha' && e.params.codigo === rk.lider, JSON.stringify(e));
  const trilha = await page.locator('.trilha').innerText().catch(() => '');
  const nomeLider = await page.evaluate(() => window.__mapa.ranking(2026 * 12 + 8, 2026 * 12 + 8, 'separacao', 'principal').eleg[0].nome);
  verificar(C, 'Trilha de navegação mostra o caminho (Painel › Separação › colaborador)', /Painel/.test(trilha) && /Separação/.test(trilha) && trilha.includes(nomeLider), trilha.replace(/\s+/g, ' '));
  await ir(page, 'painel');
  await page.locator('.calor td.cel[data-acao="ficha"]').first().click();
  await page.waitForTimeout(350);
  e = await estado(page);
  verificar(C, 'Clique numa célula do mapa de calor abre a ficha no mês da célula', e.rota === 'ficha' && !!e.params.codigo && Number.isInteger(e.params.ym), JSON.stringify(e));
  await ir(page, 'painel');
  await page.locator('.podios .item').first().click();
  await page.waitForTimeout(350);
  verificar(C, 'Clique no pódio abre a ficha', (await estado(page)).rota === 'ficha');
  await ir(page, 'painel');
  await page.selectOption('#sel-mes', String(SET));
  await page.waitForTimeout(400);
  // clique num ponto do gráfico de evolução (canvas): agosto de Separação
  const ponto = await page.evaluate(() => {
    const cvs = [...document.querySelectorAll('canvas')];
    for (const cv of cvs) {
      const ch = window.Chart && window.Chart.getChart(cv);
      if (!ch || ch.config.type !== 'line') continue;
      const ds = ch.data.datasets.findIndex(d => /Separação/.test(d.label || ''));
      if (ds < 0) continue;
      const meta = ch.getDatasetMeta(ds);
      const i = ch.data.labels.length - 2;
      const p = meta.data[i];
      if (!p) return null;
      cv.scrollIntoView({ block: 'center' });
      const r2 = cv.getBoundingClientRect();
      return { x: r2.left + p.x, y: r2.top + p.y, rotulo: ch.data.labels[i] };
    }
    return null;
  });
  if (ponto) {
    await page.mouse.click(ponto.x, ponto.y);
    await page.waitForTimeout(400);
    e = await estado(page);
    verificar(C, `Clique no ponto do gráfico (${ponto.rotulo}) abre Separação naquele mês`, e.rota === 'funcao' && e.params.f === 'separacao' && e.ym === AGO, JSON.stringify(e));
  } else verificar(C, 'Gráfico de evolução encontrado no Painel', false);
  await page.selectOption('#sel-mes', String(SET));
  await page.waitForTimeout(300);
  await ir(page, 'painel');
  await page.locator('.frase').first().click();
  await page.waitForTimeout(350);
  verificar(C, 'Clique numa frase da leitura gerencial leva ao dado de origem', (await estado(page)).rota !== 'painel', (await estado(page)).rota);

  /* ======================= 4. Lançamento: incluir, editar, excluir ======================= */
  const L = 'Lançamentos (editor)';
  const recOriginal = await totais(page, SET, 'recebimento');
  await ir(page, 'lancamentos');
  await page.click('[data-acao="novo-lanc"]');
  await page.waitForSelector('.modal-fundo #l-ano');
  await page.fill('#l-ano', '2026');
  await page.selectOption('#l-mes', '9');
  await page.selectOption('#l-funcao', 'recebimento');
  await page.selectOption('#l-colab', '81');
  await page.fill('#l-dias', '01, 02');
  await page.fill('#l-qdias', '2');
  await page.fill('#l-ped', '0');
  await page.fill('#l-nf', '4');
  await page.fill('#l-skus', '50');
  await page.fill('#l-unid', '5000');
  await clicarBotaoModal(page, 'Incluir');
  await page.waitForTimeout(500);
  if (await page.locator('.modal-fundo').count()) { await clicarBotaoModal(page, 'Incluir'); await page.waitForTimeout(800); }
  await page.waitForFunction(() => window.__mapa.S.lancamentos.has('2026-09-81-recebimento'), null, { timeout: 10000 }).catch(() => {});
  const recNovo = await totais(page, SET, 'recebimento');
  verificar(L, 'Incluir lançamento grava no banco (160 lançamentos)', (await contar(page, 'lancamentos')) === 160);
  verificar(L, 'Totais de Recebimento de setembro somam o novo lançamento', recNovo[0] === recOriginal[0] + 1 && recNovo[3] === recOriginal[3] + 50 && Math.abs(recNovo[4] - recOriginal[4] - 5000) < 0.01, `${recOriginal.join('/')} → ${recNovo.join('/')}`);
  await ir(page, 'painel');
  verificar(L, 'Painel atualiza na hora (itens 36.344)', (await textoKpi(page, 'Itens (SKU)')).includes(fmt(itensMes(9) + 50)), await textoKpi(page, 'Itens (SKU)'));
  const rkRec = await page.evaluate(() => { const r = window.__mapa.ranking(2026 * 12 + 8, 2026 * 12 + 8, 'recebimento', 'principal'); return { nao: r.nao.map(x => x.codigo), eleg: r.eleg.map(x => x.codigo) }; });
  verificar(L, 'Ranking: 2 dias ficam fora do ranking (dias insuficientes)', rkRec.nao.includes('81') && !rkRec.eleg.includes('81'), JSON.stringify(rkRec));
  await ir(page, 'ficha', { codigo: '81', ym: SET });
  const txtFicha = await page.locator('#conteudo').innerText();
  verificar(L, 'Ficha do colaborador mostra o lançamento novo', /Recebimento/.test(txtFicha) && /Dias insuficientes/.test(txtFicha));
  verificar(L, 'Auditoria continua com diferença zero', await auditoriaZerada(page));
  await ir(page, 'lancamento', { id: '2026-09-81-recebimento' });
  await page.click('[data-acao="editar-lanc"]');
  await page.waitForSelector('.modal-fundo #l-skus');
  await page.fill('#l-skus', '60');
  await clicarBotaoModal(page, 'Salvar alterações');
  await page.waitForTimeout(600);
  if (await page.locator('.modal-fundo').count()) { await clicarBotaoModal(page, 'Salvar alterações'); await page.waitForTimeout(800); }
  const recEd = await totais(page, SET, 'recebimento');
  verificar(L, 'Editar lançamento atualiza os totais (itens +60)', recEd[3] === recOriginal[3] + 60, `${recEd[3]}`);
  const hist = await page.evaluate(() => [...window.__mapa.S.historico.values()].filter(h => (h.alvos || []).includes('2026-09-81-recebimento')).map(h => h.tipo));
  verificar(L, 'Histórico registra inclusão e edição com antes/depois', hist.length >= 2, hist.join(', '));
  await ir(page, 'lancamento', { id: '2026-09-81-recebimento' });
  await page.click('[data-acao="excluir-lanc"]');
  await page.waitForSelector('.modal-fundo');
  await clicarBotaoModal(page, 'Excluir');
  await page.waitForTimeout(800);
  verificar(L, 'Excluir lançamento (confirmação dentro da página) volta a 159', (await contar(page, 'lancamentos')) === 159);
  const recFim = await totais(page, SET, 'recebimento');
  verificar(L, 'Totais voltam aos da seção 12', recFim.slice(0, 4).every((v, i) => v === recOriginal[i]), recFim.join('/'));

  /* ======================= 5. Reimportar setembro ======================= */
  const I = 'Importação';
  if (ARQ_SET && fs.existsSync(ARQ_SET)) {
    for (const modo of ['substituir', 'mesclar']) {
      await ir(page, 'importar');
      await page.setInputFiles('#arquivo-imp', ARQ_SET);
      await page.waitForSelector('input[name="modo-imp"]', { timeout: 15000 }).catch(() => {});
      const txtPrev = await page.locator('#conteudo').innerText();
      verificar(I, `Pré-visualização detecta setembro/2026 já existente (${modo})`, /já existe|já tem|existente/i.test(txtPrev) && (await page.locator('input[name="modo-imp"]').count()) === 2, txtPrev.match(/[^\n]*(já existe|já tem)[^\n]*/i)?.[0] || '');
      await page.check(`input[name="modo-imp"][value="${modo}"]`);
      await page.waitForTimeout(300);
      await page.click('[data-acao="imp-gravar"]');
      await page.waitForFunction(() => window.__mapa.UI.rota === 'painel', null, { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(900);
      verificar(I, `${modo === 'substituir' ? 'Substituir' : 'Mesclar'}: sem duplicar (continua com 159 lançamentos)`, (await contar(page, 'lancamentos')) === 159, `${await contar(page, 'lancamentos')}`);
      const t = await Promise.all(['recebimento', 'separacao', 'expedicao'].map(f => totais(page, SET, f)));
      const okT = ['recebimento', 'separacao', 'expedicao'].every((f, k) => t[k].slice(0, 4).every((v, i) => v === ESPERADO[9][f][i]) && Math.abs(t[k][4] - ESPERADO[9][f][4]) <= 0.5);
      verificar(I, `${modo === 'substituir' ? 'Substituir' : 'Mesclar'}: totais de setembro iguais à seção 12`, okT, t.map(x => x.join('/')).join(' · '));
      verificar(I, `${modo === 'substituir' ? 'Substituir' : 'Mesclar'}: abre o Painel no mês importado`, (await estado(page)).rota === 'painel' && (await estado(page)).ym === SET);
    }
    verificar(I, 'Importações registradas (4 da carga + 2 reimportações)', (await contar(page, 'importacoes')) === 6, `${await contar(page, 'importacoes')}`);
    verificar(I, 'Auditoria com diferença zero após reimportar', await auditoriaZerada(page));
  } else verificar(I, 'Arquivo de setembro disponível para o teste (KAIZEN_SET)', false, 'defina KAIZEN_SET');

  /* ======================= 6. Textos: português, sem "undefined"/"NaN" ======================= */
  const T = 'Textos';
  const rotas = [['painel'], ['funcao', { f: 'recebimento' }], ['funcao', { f: 'separacao' }], ['funcao', { f: 'expedicao' }], ['rankings'], ['rankings', { aba: 'acumulado' }], ['rankings', { aba: 'evolucao' }], ['rankings', { aba: 'campeoes' }],
    ['ficha', { codigo: '245' }], ['multifuncao'], ['fluxo'], ['alertas'], ['alertas', { aba: 'plano' }], ['lancamentos'], ['importar'], ['colaboradores'], ['parametros'], ['parametros', { aba: 'metas' }], ['parametros', { aba: 'meses' }],
    ['auditoria'], ['relatorios'], ['guia'], ['indicador', { id: 'indice' }], ['lancamento', { id: '2026-09-215-separacao' }]];
  const ruins = /\b(undefined|NaN|null|Infinity)\b|\[object/;
  const ingles = /\b(Loading|Error|Save|Cancel|Delete|Edit|Search|Settings|Dashboard|Download|Upload|Submit|Close|Next|Previous|Week|Month|Year|Today|Yes|Update|Export|Import|Report|Back|Home|Help|Filter|Sort|Details|Summary)\b/;
  const achadosRuins = [], achadosIngles = [];
  for (const [r, p] of rotas) {
    await ir(page, r, p || {});
    const txt = await page.locator('body').innerText();
    const m1 = txt.match(ruins), m2 = txt.match(ingles);
    if (m1) achadosRuins.push(`${r}: ${m1[0]}`);
    if (m2) achadosIngles.push(`${r}: ${m2[0]}`);
  }
  verificar(T, `Nenhum "undefined", "NaN", "null" em ${rotas.length} telas`, !achadosRuins.length, achadosRuins.join('; '));
  verificar(T, `Nenhuma palavra de interface em inglês em ${rotas.length} telas`, !achadosIngles.length, achadosIngles.join('; '));
  errosGerais.push(...erros.map(x => 'editor: ' + x));
}

/* ======================= 7. Leitor (CEO/gerente) ======================= */
{
  const { page, erros } = await novaPagina(browser, srv.url, { cfg: { seed: seed(), podeEditar: false } });
  await aguardarPronto(page);
  const R = 'Leitor';
  const EDICAO = ['novo-lanc', 'editar-lanc', 'excluir-lanc', 'suspeito-lanc', 'excluir-mes', 'novo-colab', 'editar-colab', 'excluir-colab', 'revisado-colab', 'salvar-param', 'confirmar-rotas', 'editar-meta', 'excluir-meta', 'p75', 'editar-mes', 'fechar-mes', 'abrir-mes', 'imp-gravar', 'nova-acao', 'editar-acao', 'mover-acao', 'excluir-acao', 'copia-baixar', 'copia-restaurar'];
  const rotas = [['painel'], ['funcao', { f: 'separacao' }], ['rankings'], ['ficha', { codigo: '245' }], ['multifuncao'], ['fluxo'], ['alertas'], ['alertas', { aba: 'plano' }], ['lancamentos'], ['lancamento', { id: '2026-09-215-separacao' }], ['importar'], ['colaboradores'], ['parametros'], ['parametros', { aba: 'metas' }], ['parametros', { aba: 'meses' }], ['auditoria'], ['relatorios'], ['guia']];
  const achados = [];
  for (const [r, p] of rotas) {
    await ir(page, r, p || {});
    const acoes = await page.$$eval('[data-acao]', els => els.map(e => e.dataset.acao));
    const extra = await page.$$eval('#zona-soltar, #arquivo-imp, select[data-status-colab]', els => els.length);
    const proibidas = acoes.filter(a => EDICAO.includes(a));
    if (proibidas.length || extra) achados.push(`${r}: ${[...new Set(proibidas)].join(', ')}${extra ? ' + controles de edição' : ''}`);
  }
  verificar(R, `Nenhum botão de edição em ${rotas.length} telas`, !achados.length, achados.join('; '));
  await ir(page, 'painel');
  verificar(R, 'Leitor pode exportar (botões Exportar PDF e Excel presentes)', (await page.locator('[data-acao="exportar-pdf"]').count()) > 0 && (await page.locator('[data-acao="exportar-excel"]').count()) > 0);
  await page.selectOption('#sel-mes', String(AGO));
  await page.waitForTimeout(300);
  verificar(R, 'Leitor filtra por mês', (await textoKpi(page, 'Itens (SKU)')).includes(fmt(itensMes(8))));
  await page.click('[data-acao="exportar-excel"]');
  await page.waitForFunction(() => window.__DOWNLOADS__.length > 0, null, { timeout: 20000 }).catch(() => {});
  verificar(R, 'Leitor exporta o Excel da tela', (await page.evaluate(() => window.__DOWNLOADS__.length)) > 0);
  errosGerais.push(...erros.map(x => 'leitor: ' + x));
}

/* ======================= 8. Gravação recusada volta ao modo leitura ======================= */
{
  const { page, erros } = await novaPagina(browser, srv.url, { cfg: { seed: seed(), podeEditar: true, recusarGravacao: true } });
  await aguardarPronto(page);
  const G = 'Recusa de gravação';
  await ir(page, 'colaboradores');
  verificar(G, 'Editor vê os botões de edição antes da recusa', (await page.locator('[data-acao="novo-colab"]').count()) > 0);
  await ir(page, 'lancamentos');
  await page.click('[data-acao="novo-lanc"]');
  await page.waitForSelector('.modal-fundo #l-ano');
  await page.selectOption('#l-mes', '9');
  await page.selectOption('#l-funcao', 'recebimento');
  await page.selectOption('#l-colab', '81');
  await page.fill('#l-dias', '01');
  await page.fill('#l-qdias', '1');
  await page.fill('#l-nf', '1');
  await page.fill('#l-skus', '5');
  await page.fill('#l-unid', '50');
  await clicarBotaoModal(page, 'Incluir');
  await page.waitForTimeout(600);
  if (await page.locator('.modal-fundo .pe-modal button', { hasText: 'Incluir' }).count()) { await clicarBotaoModal(page, 'Incluir'); }
  await page.waitForTimeout(1500);
  const st = await page.evaluate(() => ({ forcada: window.__mapa.S.leituraForcada, motivo: window.__mapa.S.motivoLeitura }));
  verificar(G, 'Página entra em modo leitura com mensagem clara', st.forcada && st.motivo.length > 20, st.motivo);
  await page.evaluate(() => document.querySelector('.modal-fundo') && document.querySelector('.modal-fundo').remove());
  await ir(page, 'lancamentos');
  verificar(G, 'Botões de edição somem depois da recusa', (await page.locator('[data-acao="novo-lanc"]').count()) === 0);
  const aviso = await page.locator('.aviso.erro').first().innerText().catch(() => '');
  verificar(G, 'Aviso de modo leitura visível na tela', aviso.length > 10, aviso.slice(0, 90));
  verificar(G, 'Nada foi gravado (159 lançamentos)', (await contar(page, 'lancamentos')) === 159);
  errosGerais.push(...erros.filter(x => !/invalid_argument|status of 403/.test(x)).map(x => 'recusa: ' + x));  // a recusa (403) é o próprio cenário
}

/* ======================= 9. Banco vazio ======================= */
{
  for (const podeEditar of [true, false]) {
    const { page, erros } = await novaPagina(browser, srv.url, { cfg: { seed: {}, podeEditar } });
    await aguardarPronto(page);
    const txt = await page.locator('#conteudo').innerText();
    verificar('Banco vazio', `${podeEditar ? 'Editor' : 'Leitor'} vê "Nenhum mês importado — importe a extração do Kaizen"`, /Nenhum mês importado — importe a extração do Kaizen/.test(txt));
    if (podeEditar) verificar('Banco vazio', 'Editor recebe o atalho para Importar Extração', (await page.locator('[data-acao="menu"][data-p*="importar"]').count()) > 0);
    for (const r of ['funcao', 'rankings', 'ficha', 'fluxo', 'auditoria', 'relatorios', 'colaboradores', 'parametros']) await ir(page, r, r === 'funcao' ? { f: 'separacao' } : {});
    errosGerais.push(...erros.map(x => `vazio(${podeEditar ? 'editor' : 'leitor'}): ` + x));
  }
}

/* ======================= 10. Celular (390 px) ======================= */
{
  const { page, erros } = await novaPagina(browser, srv.url, { cfg: { seed: seed(), podeEditar: true }, viewport: { width: 390, height: 844 } });
  await aguardarPronto(page);
  const M = 'Celular 390 px';
  const rotas = [['painel'], ['funcao', { f: 'separacao' }], ['rankings'], ['ficha', { codigo: '245' }], ['multifuncao'], ['fluxo'], ['alertas'], ['lancamentos'], ['importar'], ['colaboradores'], ['parametros'], ['auditoria'], ['relatorios'], ['guia']];
  const largas = [];
  for (const [r, p] of rotas) {
    await ir(page, r, p || {});
    const w = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vis: window.innerWidth }));
    if (w.doc > w.vis) largas.push(`${r}: ${w.doc}px`);
  }
  verificar(M, `Sem rolagem horizontal em ${rotas.length} telas`, !largas.length, largas.join('; '));
  const barra = await page.$$eval('.barra-inferior button', bs => bs.map(b => b.innerText.trim()));
  verificar(M, 'Barra inferior com Painel, Funções, Ranking e Colaborador', ['Painel', 'Funções', 'Ranking', 'Colaborador'].every(t => barra.includes(t)), barra.join(' · '));
  await page.click('[data-acao="gaveta"]');
  await page.waitForTimeout(300);
  const aberta = await page.evaluate(() => document.getElementById('lateral').classList.contains('aberta'));
  await page.click('#fundo-gaveta', { position: { x: 380, y: 400 } });
  await page.waitForTimeout(300);
  const fechada = await page.evaluate(() => !document.getElementById('lateral').classList.contains('aberta'));
  verificar(M, 'Menu lateral abre como gaveta e fecha ao tocar fora', aberta && fechada);
  await page.click('.barra-inferior button:has-text("Ranking")');
  await page.waitForTimeout(350);
  verificar(M, 'Barra inferior navega (Ranking)', (await estado(page)).rota === 'rankings');
  const alvoPequeno = await page.$$eval('.barra-inferior button, .topo button', bs => bs.filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && (r.height < 44 || r.width < 44); }).map(b => b.getAttribute('aria-label') || b.innerText.trim()).slice(0, 5));
  verificar(M, 'Botões do topo e da barra inferior com área de toque de 44 px', !alvoPequeno.length, alvoPequeno.join(', '));
  errosGerais.push(...erros.map(x => 'celular: ' + x));
}

/* ======================= 11. Sem runtime e cdnjs bloqueado ======================= */
{
  const { page, erros } = await novaPagina(browser, srv.url, { cfg: { seed: seed(), podeEditar: true }, bloquearCdnjs: true });
  await aguardarPronto(page);
  verificar('Bibliotecas', 'Com o cdnjs fora do ar, os gráficos carregam pela reserva (jsDelivr)', await page.evaluate(() => !!window.Chart && document.querySelectorAll('canvas').length > 0));
  errosGerais.push(...erros.filter(x => !/cdnjs|404|Failed to load resource/.test(x)).map(x => 'cdnjs: ' + x));
}

verificar('Console', 'Nenhum erro de JavaScript em todos os cenários', !errosGerais.length, errosGerais.slice(0, 6).join(' | '));

await browser.close();
srv.fechar();
const falhas = resultados.filter(r => !r.ok);
console.log(`\n${resultados.length - falhas.length} de ${resultados.length} critérios atendidos.`);
if (process.env.SAIDA_JSON) fs.writeFileSync(process.env.SAIDA_JSON, JSON.stringify(resultados, null, 1));
process.exit(falhas.length ? 1 : 0);
