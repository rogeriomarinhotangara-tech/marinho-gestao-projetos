/* =========================================================================
   Modelos de tabela reutilizados na tela e nas exportações (PDF/Excel).
   ========================================================================= */

function textoPuro(html) {
  const d = document.createElement('div');
  d.innerHTML = html;
  // itens lado a lado (quebra por função, selos) viram texto separado, não colado
  d.querySelectorAll('.fb').forEach((e, i) => { if (i) e.before(' · '); });
  d.querySelectorAll('.selo').forEach(e => e.before(' '));
  return (d.textContent || '').replace(/\s+/g, ' ').trim();
}
function colNome(extra = {}) {
  return {
    id: 'nome', rotulo: 'Colaborador', prim: true,
    valor: l => l.nome, texto: l => `${l.nome} (${l.codigo})`,
    html: l => `<span class="nome">${esc(l.nome)}</span><span class="cod">${esc(l.codigo)}</span> ${selosColab(l)}`,
    ...extra
  };
}
/* ordem: resultado (índice e situação), componentes (% das metas, médias diárias) e depois volumes */
function colunasIndicadores({ funcao, completa = true } = {}) {
  const f = FUNC[funcao];
  const docRot = f ? (f.id === 'recebimento' ? 'NF' : 'Pedidos') : 'Documentos';
  const cols = [
    { id: 'indice', rotulo: 'Índice', tipo: 'pct', valor: l => l.ind.indice, html: l => l.ind.indice != null ? `<b>${fPct(l.ind.indice)}</b>` : `<span class="fraco" data-dica="${esc(l.ind.motivo)}">${TRACO}</span>`,
      dica: `% meta itens × ${fNum(P().pesoItens * 100, 'int')}% + % meta quantidade × ${fNum(P().pesoQuantidade * 100, 'int')}%. Só calcula com ${P().minimoDias} dias ou mais.` },
    { id: 'situacao', rotulo: 'Situação', valor: l => SITUACOES[l.ind.situacao]?.rotulo || '', html: l => pillSituacao(l.ind.situacao) },
    { id: 'pctItens', rotulo: '% meta itens', tipo: 'pct', valor: l => l.ind.pctItens, ocultoCel: true, dica: 'Itens/dia ÷ meta de itens/dia vigente' },
    { id: 'pctUnid', rotulo: '% meta qtd.', tipo: 'pct', valor: l => l.ind.pctUnid, ocultoCel: true, dica: 'Unidades/dia ÷ meta de unidades/dia vigente' },
    { id: 'itensDia', rotulo: 'Itens/dia', tipo: 'd1', valor: l => l.ind.itensDia, dica: 'Itens ÷ dias na função (complexidade)' },
    { id: 'unidDia', rotulo: 'Unid./dia', tipo: 'int', valor: l => l.ind.unidDia, dica: 'Unidades ÷ dias na função (volume físico)' },
    { id: 'dias', rotulo: 'Dias', tipo: 'int', valor: l => l.ag.dias, dica: 'Dias trabalhados na função' },
    { id: 'docs', rotulo: docRot, tipo: 'int', valor: l => l.ag.documentos, ocultoCel: true, dica: f ? (f.id === 'recebimento' ? 'Notas fiscais conferidas' : 'Pedidos (OM)') : 'Pedidos + NF' },
    { id: 'itens', rotulo: 'Itens', tipo: 'int', valor: l => l.ag.skus, ocultoCel: true, dica: 'Itens (linhas de SKU) processados' },
    { id: 'unid', rotulo: 'Unidades', tipo: 'int', valor: l => l.ag.unidades, ocultoCel: true }
  ];
  if (completa) cols.push(
    { id: 'docsDia', rotulo: `${docRot}/dia`, tipo: 'd1', valor: l => l.ind.docsDia, ocultoCel: true, pdf: false },
    { id: 'itensDoc', rotulo: 'Itens/doc.', tipo: 'd1', valor: l => l.ind.itensPorDoc, ocultoCel: true, pdf: false, dica: 'Tamanho médio do pedido ou da nota' },
    { id: 'unidItem', rotulo: 'Unid./item', tipo: 'd1', valor: l => l.ind.unidPorItem, ocultoCel: true, pdf: false, dica: 'Alto = carga fechada; baixo = picking fracionado' }
  );
  return cols;
}
/* ranking de uma função: elegíveis, não elegíveis (cinza) e apoio (separado) */
function modeloRanking({ ini, fim, funcao, leitura, visao, completa = true, comMovimento = true }) {
  const rk = ranking(ini, fim, funcao, leitura);
  const { topo, fim: ultimos } = primeirosEUltimos(rk);
  const topoSet = new Set(topo.map(r => r.codigo)), fimSet = new Set(ultimos.map(r => r.codigo));
  const linhas = [];
  rk.eleg.forEach(r => linhas.push({ ...r, _pos: rk.pos.get(r.codigo), _mov: comMovimento ? movimento(ini, fim, funcao, leitura, r.codigo, visao) : null, _tipo: 'eleg' }));
  if (rk.nao.length) { linhas.push({ _grupo: `Fora do ranking (menos de ${P().minimoDias} dias na função ou sem meta)` }); rk.nao.forEach(r => linhas.push({ ...r, _tipo: 'nao' })); }
  if (rk.apoio.length) { linhas.push({ _grupo: 'Apoio: função principal diferente (não comparados com quem faz a função o mês inteiro)' }); rk.apoio.forEach(r => linhas.push({ ...r, _tipo: 'apoio' })); }
  const posCel = l => l._pos ? `<span class="pos${l._pos <= 3 ? ' p' + l._pos : ''}">${l._pos}</span>` : `<span class="fraco">${l._tipo === 'apoio' ? 'apoio' : TRACO}</span>`;
  const cols = [
    { id: 'pos', rotulo: 'Pos.', ocultoCel: true, valor: l => l._pos ?? null, texto: l => l._pos ? `${l._pos}º` : (l._tipo === 'apoio' ? 'apoio' : 'fora'), html: posCel },
    ...(comMovimento ? [{ id: 'mov', rotulo: 'Mov.', ocultoCel: true, valor: l => movTexto(l._mov), html: l => l._tipo === 'eleg' ? movHTML(l._mov) : '' }] : []),
    colNome({ html: l => `<span class="so-celular pos-cel">${posCel(l)}${comMovimento && l._tipo === 'eleg' ? movHTML(l._mov) : ''}</span><span class="nome-bloco"><span class="nome">${esc(l.nome)}</span><span class="cod">${esc(l.codigo)}</span> ${l._pos === 1 ? `<span class="selo campeao">${ini !== fim ? 'líder do período' : 'campeão do mês'}</span> ` : ''}${selosColab(l)}</span>` }),
    ...colunasIndicadores({ funcao, completa })
  ];
  return {
    colunas: cols, linhas, rk,
    linhaAttrs: l => ({
      acao: 'ficha', params: { codigo: l.codigo, ym: fim, f: funcao },
      classe: l._tipo === 'nao' ? 'inelegivel' : topoSet.has(l.codigo) ? 'destaque-topo' : fimSet.has(l.codigo) ? 'destaque-fim' : '',
      dica: `${l.nomeCompleto} · ${l.codigo}\nClique para abrir a ficha`
    }),
    vazio: 'Nenhum lançamento nesta função no período.',
    nota: `Ordem: Índice de Eficiência decrescente; desempate pelo total de itens. Verde à esquerda: 3 primeiros; vermelho: 3 últimos elegíveis. Leitura: ${leitura === 'principal' ? 'função principal' : 'todos os lançamentos'}.`
  };
}
function modeloSimples(colunas, linhas, extra = {}) { return { colunas, linhas, ...extra }; }
/* cartão de indicador para exportação: texto pronto (PDF) e número com formato (Excel) */
function itemKpiExport(c) {
  const num = typeof c.valor === 'number' && Number.isFinite(c.valor) ? c.valor : null;
  return {
    rotulo: c.rotulo,
    valor: num != null ? fNum(num, c.formato || 'int') : (typeof c.valor === 'string' ? c.valor : TRACO),
    numero: num, formato: c.formato || 'int',
    variacao: c.variacao && ok(c.variacao.valor) ? textoPuro(variacaoHTML(c.variacao)) : (c.variacao && c.variacao.semBase) || '',
    detalhe: textoPuro(c.detalhe || '')
  };
}
