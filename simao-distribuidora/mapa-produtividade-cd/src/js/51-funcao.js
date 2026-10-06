/* =========================================================================
   Módulos por função: Recebimento, Separação e Conferência de Expedição.
   ========================================================================= */

function seletorFuncao(atual) {
  return `<div class="seg" role="group" aria-label="Função">${FUNCOES.map(f => `<button type="button"${dataAcao('menu', { rota: 'funcao', params: { f: f.id } })} aria-pressed="${f.id === atual}">${esc(f.nome)}</button>`).join('')}</div>`;
}
function chipsMeta(fId, ym) {
  const m = metaVigente(fId, ym);
  if (!m) return avisoHTML('atencao', `Sem meta vigente para ${esc(FUNC[fId].nome)} em ${esc(rotuloYM(ym))}. Índice e situação aparecem como "${TRACO}". Cadastre a meta em Parâmetros e Metas.`);
  return `<div class="linha" style="font-size:13px">
    <span class="muted">Meta vigente (desde ${esc(rotuloYM(m.ymVig).toLowerCase())}):</span>
    <span class="selo" data-dica="${esc(m.origem || '')}"><b>${fD1(m.itensDia)}</b>&nbsp;itens/dia</span>
    <span class="selo"><b>${fInt(m.unidadesDia)}</b>&nbsp;unidades/dia</span>
    ${ok(m.documentosDia) ? `<span class="selo"><b>${fD1(m.documentosDia)}</b>&nbsp;${FUNC[fId].id === 'recebimento' ? 'NF' : 'pedidos'}/dia</span>` : ''}
    <span class="muted">· mínimo ${P().minimoDias} dias para ranking · pesos ${fNum(P().pesoItens * 100, 'int')}/${fNum(P().pesoQuantidade * 100, 'int')}</span>
  </div>`;
}
function linhasGraficoFuncao(p, fId) {
  const rk = ranking(p.ini, p.fim, fId, UI.leitura);
  return [...rk.eleg, ...rk.nao, ...rk.apoio].filter(r => ok(r.ind.itensDia));
}
function specDispersao(linhas, fId, meta) {
  return (pal, tela) => {
    const ordem = linhas.slice().sort((a, b) => b.ind.itensDia - a.ind.itensDia);
    const rotular = new Set(linhas.length <= 9 ? linhas.map(r => r.codigo) : [...ordem.slice(0, 3), ...ordem.slice(-2)].map(r => r.codigo));
    return {
      type: 'scatter',
      data: { datasets: [{ label: FUNC[fId].nome, data: linhas.map(r => ({ x: r.ind.itensDia, y: r.ind.unidPorItem })),
        backgroundColor: linhas.map(r => r.ind.indice == null ? comAlfa(pal.funcao[fId], 0.35) : pal.funcao[fId]),
        pointRadius: 6, pointHoverRadius: 8, pointBorderColor: pal.superficie, pointBorderWidth: 2, pointHitRadius: 14 }] },
      options: {
        ...opcoesBase(pal, tela),
        layout: { padding: { top: 18, right: 24, left: 4, bottom: 0 } },
        scales: {
          x: eixoValor(pal, v => fNum(v, 'int'), { title: { display: true, text: 'Itens por dia', color: pal.texto2, font: { family: fonteGraf(), size: 11 } } }),
          y: eixoValor(pal, v => fNum(v, 'int'), { title: { display: true, text: 'Unidades por item', color: pal.texto2, font: { family: fonteGraf(), size: 11 } } })
        },
        plugins: {
          ...opcoesBase(pal, tela).plugins,
          linhaMeta: meta ? { valor: meta, eixo: 'x', cor: pal.texto, rotulo: `meta ${fNum(meta, 'int')} itens/dia` } : false,
          rotulosPontos: { rotulos: [linhas.map(r => rotular.has(r.codigo) ? r.nome : '')], cor: pal.texto2 },
          tooltip: { ...opcoesBase(pal, tela).plugins.tooltip, callbacks: {
            title: items => items.length ? linhas[items[0].dataIndex].nomeCompleto : '',
            label: it => { const r = linhas[it.dataIndex]; return [`Itens/dia: ${fD1(r.ind.itensDia)}`, `Unidades por item: ${fD1(r.ind.unidPorItem)}`, `Dias na função: ${r.ag.dias}`]; },
            footer: () => 'Unidades por item alto = carga fechada; baixo = picking fracionado'
          } }
        },
        ...aoClicarGrafico((di, i) => abrirFicha(linhas[i].codigo, null, fId))
      },
      plugins: [pluginLinhaMeta, pluginRotulos]
    };
  };
}
function specParticipacao(conc, fId) {
  return (pal, tela) => {
    const itens = conc.ordenado;
    return {
      type: 'bar',
      data: { labels: itens.map(i => i.nome), datasets: [{ label: 'Participação nos itens', data: itens.map(i => i.share), backgroundColor: itens.map(i => i.share > P().limiteConcentracao ? pal.funcao[fId] : comAlfa(pal.funcao[fId], 0.55)), borderRadius: { topRight: 4, bottomRight: 4 }, borderSkipped: 'start', maxBarThickness: 20 }] },
      options: {
        ...opcoesBase(pal, tela), indexAxis: 'y', layout: { padding: { right: 44, top: 18 } },
        scales: { x: eixoValor(pal, v => fNum(v, 'pct'), { suggestedMax: Math.max(P().limiteConcentracao * 1.25, (itens[0] ? itens[0].share : 0) * 1.08) }), y: eixoCategoria(pal, { ticks: { autoSkip: false, color: pal.texto } }) },
        plugins: {
          ...opcoesBase(pal, tela).plugins,
          linhaMeta: { valor: P().limiteConcentracao, eixo: 'x', cor: pal.bad, rotulo: `limite ${fPct(P().limiteConcentracao)}` },
          valorFimBarra: { formatar: v => fPct(v), cor: pal.texto2 },
          tooltip: { ...opcoesBase(pal, tela).plugins.tooltip, callbacks: { label: it => `${fPct1(it.parsed.x)} dos itens (${fInt(itens[it.dataIndex].itens)} de ${fInt(conc.total)})` } }
        },
        ...aoClicarGrafico((di, i) => abrirFicha(itens[i].codigo, null, fId))
      },
      plugins: [pluginLinhaMeta, pluginFimBarra]
    };
  };
}
function specEquipe(meses, fId) {
  return specEvolucao({
    meses,
    series: [
      { funcao: fId, rotulo: 'Itens/dia da equipe', dados: meses.map(y => totaisFuncao(y, y, fId).ind.itensDia) },
      { rotulo: 'Meta de itens/dia', dados: meses.map(y => metaVigente(fId, y)?.itensDia ?? null), cor: pal => pal.texto, tracejada: true, degrau: true }
    ],
    formato: 'd1',
    aoClicar: (s, y) => navegar('funcao', { f: fId, ym: y }, 'detalhe')
  });
}
function specVolumeRecebido(meses) {
  return (pal, tela) => ({
    type: 'bar',
    data: { labels: meses.map(rotuloYMCurto), datasets: [{ label: 'Itens recebidos', data: meses.map(y => totaisFuncao(y, y, 'recebimento').ag.skus || null), backgroundColor: pal.funcao.recebimento, borderRadius: { topLeft: 4, topRight: 4 }, borderSkipped: 'start', maxBarThickness: 24 }] },
    options: {
      ...opcoesBase(pal, tela),
      scales: { x: eixoCategoria(pal), y: eixoValor(pal, v => fNum(v, 'int')) },
      plugins: { ...opcoesBase(pal, tela).plugins, quebraSerie: { indices: meses.map((y, i) => infoMes(y).quebraSerie ? i : -1).filter(i => i > 0), cor: pal.warn, corTexto: pal.texto2 },
        tooltip: { ...opcoesBase(pal, tela).plugins.tooltip, callbacks: { title: it => it.length ? rotuloYM(meses[it[0].dataIndex]) : '', label: it => { const t = totaisFuncao(meses[it.dataIndex], meses[it.dataIndex], 'recebimento').ag; return [`Itens recebidos: ${fInt(t.skus)}`, `Notas fiscais: ${fInt(t.nfs)}`, `Itens por NF: ${fD1(div(t.skus, t.nfs))}`, `Dias-função: ${fInt(t.dias)}`]; } } } },
      ...aoClicarGrafico((di, i) => navegar('funcao', { f: 'recebimento', ym: meses[i] }, 'detalhe'))
    },
    plugins: [pluginQuebra]
  });
}
function abrirFicha(codigo, ym, f) { navegar('ficha', { codigo: String(codigo), ym: ym ?? UI.ym, f }, 'detalhe'); }

VIEWS.funcao = params => {
  const fId = FUNC[params.f] ? params.f : UI.funcaoModulo;
  const f = FUNC[fId];
  const p = periodo(), pa = periodoAnteriorUI();
  const t = totaisFuncao(p.ini, p.fim, fId), tA = pa ? totaisFuncao(pa.ini, pa.fim, fId) : null;
  const afetada = pa ? comparacaoAfetada(p.fim, pa.fim) : false;
  const rotComp = pa ? `Contra ${pa.rotulo}` : '';
  const vr = (a, b, mais = true) => pa ? variacaoRel(a, b, { melhorSeMaior: mais, rotulo: rotComp, quebra: afetada }) : { valor: null, semBase: 'sem mês anterior' };
  const vp = (a, b) => pa ? variacaoPP(a, b, { melhorSeMaior: true, rotulo: rotComp, quebra: afetada }) : { valor: null, semBase: 'sem mês anterior' };
  const docRot = fId === 'recebimento' ? 'Notas fiscais' : 'Pedidos (OM)';
  const cards = [
    { rotulo: docRot, valor: t.ag.documentos, variacao: vr(t.ag.documentos, tA && tA.ag.documentos), detalhe: `${fD1(t.ind.docsDia)} por dia-função` },
    { rotulo: 'Itens (SKU)', valor: t.ag.skus, variacao: vr(t.ag.skus, tA && tA.ag.skus), detalhe: `${fD1(t.ind.itensPorDoc)} itens por ${fId === 'recebimento' ? 'NF' : 'pedido'}` },
    { rotulo: 'Unidades', valor: t.ag.unidades, variacao: vr(t.ag.unidades, tA && tA.ag.unidades), detalhe: `${fD1(t.ind.unidPorItem)} unidades por item` },
    { rotulo: 'Dias-função', valor: t.ag.dias, variacao: vr(t.ag.dias, tA && tA.ag.dias, null), detalhe: `${fInt(t.colaboradores)} colaboradores · ≈ ${fD1(t.pessoasEq)} pessoas-equivalentes` },
    { rotulo: 'Itens/dia da equipe', valor: t.ind.itensDia, formato: 'd1', variacao: vr(t.ind.itensDia, tA && tA.ind.itensDia), detalhe: `meta ${fD1(t.ind.metaItens)} · ${fPct(t.ind.pctItens)} da meta`, dica: 'Total de itens ÷ total de dias-função da função.' },
    { rotulo: 'Unidades/dia da equipe', valor: t.ind.unidDia, variacao: vr(t.ind.unidDia, tA && tA.ind.unidDia), detalhe: `meta ${fInt(t.ind.metaUnid)} · ${fPct(t.ind.pctUnid)} da meta` },
    { rotulo: 'Índice da equipe', valor: t.ind.indice, formato: 'pct', variacao: vp(t.ind.indice, tA && tA.ind.indice), detalhe: pillSituacao(t.ind.indice == null ? null : t.ind.indice >= 1 - EPS ? 'acima' : t.ind.indice >= P().tolerancia - EPS ? 'na' : 'abaixo') }
  ];
  const conc = concentracao(p.ini, p.fim, fId);
  const linhasG = linhasGraficoFuncao(p, fId).slice().sort((a, b) => b.ind.itensDia - a.ind.itensDia);
  const meta = t.ind.metaItens;
  const barras = specBarrasColab({ linhas: linhasG, valor: r => r.ind.itensDia, formato: 'd1', meta, tolerancia: P().tolerancia, cor: pal => pal.funcao[fId], rotuloValor: 'Itens/dia',
    aoClicar: r => abrirFicha(r.codigo, p.fim, fId),
    rodapeDica: r => [`Meta: ${fD1(r.ind.metaItens)} itens/dia (${fPct(r.ind.pctItens)})`, `Índice: ${r.ind.indice != null ? fPct(r.ind.indice) : TRACO + ' ' + r.ind.motivo}`, r.apoio ? 'Apoio: função principal diferente' : ''].filter(Boolean).join('\n') });
  const disp = specDispersao(linhasG, fId, meta);
  const part = conc ? specParticipacao(conc, fId) : null;
  const meses = mesesDoAnoAte(p.fim);
  const equipe = specEquipe(meses, fId);
  const mr = modeloRanking({ ini: p.ini, fim: p.fim, funcao: fId, leitura: UI.leitura, visao: UI.visao });
  const modeloEquipe = modeloSimples([
    { id: 'mes', rotulo: 'Mês', valor: l => rotuloYM(l.y), prim: true, html: l => `<b>${esc(rotuloYM(l.y))}</b>${infoMes(l.y).quebraSerie ? ' <span class="selo rotas">quebra de série</span>' : ''}` },
    { id: 'col', rotulo: 'Pessoas', tipo: 'int', valor: l => l.t.colaboradores },
    { id: 'dias', rotulo: 'Dias-função', tipo: 'int', valor: l => l.t.ag.dias },
    { id: 'pe', rotulo: 'Pessoas-equiv.', tipo: 'd1', valor: l => l.t.pessoasEq },
    { id: 'docs', rotulo: fId === 'recebimento' ? 'NF' : 'Pedidos', tipo: 'int', valor: l => l.t.ag.documentos },
    { id: 'itens', rotulo: 'Itens', tipo: 'int', valor: l => l.t.ag.skus },
    { id: 'unid', rotulo: 'Unidades', tipo: 'int', valor: l => l.t.ag.unidades },
    { id: 'itd', rotulo: 'Itens/dia', tipo: 'd1', valor: l => l.t.ind.itensDia },
    { id: 'meta', rotulo: 'Meta itens/dia', tipo: 'd1', valor: l => l.t.ind.metaItens },
    { id: 'und', rotulo: 'Unid./dia', tipo: 'int', valor: l => l.t.ind.unidDia },
    { id: 'idx', rotulo: 'Índice equipe', tipo: 'pct', valor: l => l.t.ind.indice },
    { id: 'esc', rotulo: 'Escopo da coleta', valor: l => infoMes(l.y).escopo, tela: false }
  ], meses.map(y => ({ y, t: totaisFuncao(y, y, fId) })), { linhaAttrs: l => ({ acao: 'ir', params: { rota: 'funcao', params: { f: fId, ym: l.y } }, classe: l.y === p.fim ? 'destaque-topo' : '' }) });

  let recebimento = '';
  if (fId === 'recebimento') {
    const anoMeses = mesesDoAnoAte(p.fim);
    recebimento = bloco({
      titulo: 'Volume recebido: leia antes de comparar conferentes',
      desc: 'A produtividade do conferente de recebimento depende do volume que chega. Em mês de poucas notas, o itens/dia cai sem que o conferente tenha trabalhado menos. Compare o volume antes de comparar pessoas.',
      corpo: `<div class="kpis" style="margin-bottom:14px">
        ${kpiHTML({ rotulo: 'Notas fiscais recebidas', valor: t.ag.nfs, variacao: vr(t.ag.nfs, tA && tA.ag.nfs, null) })}
        ${kpiHTML({ rotulo: 'Itens recebidos', valor: t.ag.skus, variacao: vr(t.ag.skus, tA && tA.ag.skus, null) })}
        ${kpiHTML({ rotulo: 'Itens por NF', valor: t.ind.itensPorDoc, formato: 'd1', variacao: vr(t.ind.itensPorDoc, tA && tA.ind.itensPorDoc, null) })}
        ${kpiHTML({ rotulo: 'NF por dia-função', valor: t.ind.docsDia, formato: 'd1', detalhe: `meta ${fD1(t.ind.metaDocs)}` })}
      </div>${graficoHTML(specVolumeRecebido(anoMeses), { altura: 230, rotulo: 'Itens recebidos por mês' })}`
    });
  }
  const html = `
    ${cabecalhoTela(f.nome, `${esc(p.rotuloLongo)} · ${p.mensal ? 'visão mensal' : 'acumulado'} · leitura: ${esc(rotuloLeitura().toLowerCase())}`, seletorFuncao(fId) + seletorLeitura())}
    ${chipsMeta(fId, p.fim)}
    ${avisoQuebraPeriodo(p)}
    <div class="kpis">${cards.map(kpiHTML).join('')}</div>
    ${recebimento}
    ${bloco({ titulo: `Ranking ${p.mensal ? 'do mês' : 'do período'}: ${f.nome}`, desc: `Situação, % das metas, índice e movimento de posição contra ${pa ? esc(pa.rotulo) : 'o período anterior'}. Clique numa linha para abrir a ficha.`, corpo: tabelaHTML(mr) })}
    <div class="grade-2">
      ${bloco({ titulo: 'Itens/dia por colaborador', desc: `Linha vertical: meta; faixa amarela: ${fPct(P().tolerancia)} a 100% da meta. Barras claras: fora do ranking (dias insuficientes).`, corpo: graficoHTML(barras, { altura: Math.max(220, linhasG.length * 30 + 50), rotulo: 'Itens por dia por colaborador' }) })}
      ${bloco({ titulo: 'Perfil de trabalho: itens/dia × unidades por item', desc: 'Um ponto por colaborador. Mais à direita: mais referências por dia. Mais alto: carga mais fechada (menos fracionada).', corpo: graficoHTML(disp, { altura: 320, rotulo: 'Dispersão itens por dia e unidades por item' }) })}
    </div>
    <div class="grade-2">
      ${bloco({ titulo: 'Participação no volume da função (concentração)', desc: `Parte dos itens feita por cada colaborador. Acima de ${fPct(P().limiteConcentracao)} para uma pessoa indica risco de dependência.`, corpo: part ? graficoHTML(part, { altura: Math.max(200, (conc.ordenado.length) * 28 + 50), rotulo: 'Participação no volume' }) : '<p class="muted">Sem volume no período.</p>' })}
      ${bloco({ titulo: 'Evolução da produtividade da equipe', desc: 'Itens/dia da equipe mês a mês contra a meta vigente em cada mês. Clique num ponto para abrir o mês.', corpo: graficoHTML(equipe, { altura: 300, rotulo: 'Evolução itens por dia da equipe' }) + `<div class="legenda" style="margin-top:8px"><span class="it"><span class="ln" style="border-color:var(${f.cor})"></span>Itens/dia da equipe</span><span class="it"><span class="ln trac" style="border-color:var(--text)"></span>Meta</span>${quebrasNoIntervalo(meses[0] ?? p.fim, p.fim).length ? LEGENDA_QUEBRA : ''}</div>` })}
    </div>
    ${bloco({ titulo: 'Equipe mês a mês', corpo: tabelaHTML(modeloEquipe) })}
  `;
  const exportar = {
    titulo: f.nome, subtitulo: `${p.rotuloLongo} · ${p.mensal ? 'visão mensal' : 'acumulado'} · leitura: ${rotuloLeitura().toLowerCase()}`,
    secoes: [
      { tipo: 'kpis', titulo: 'Indicadores da função', itens: cards.map(itemKpiExport) },
      ...(fId === 'recebimento' ? [{ tipo: 'texto', titulo: 'Volume recebido', paragrafos: [`Notas fiscais: ${fInt(t.ag.nfs)} · itens recebidos: ${fInt(t.ag.skus)} · itens por NF: ${fD1(t.ind.itensPorDoc)}. A produtividade do conferente de recebimento depende do volume que chega: compare o volume antes de comparar pessoas.`] }] : []),
      { tipo: 'tabela', titulo: `Ranking: ${f.nome}`, modelo: mr },
      { tipo: 'grafico', titulo: 'Itens/dia por colaborador (linha: meta)', specFn: barras, altura: Math.max(220, linhasG.length * 30 + 50) },
      { tipo: 'grafico', titulo: 'Perfil de trabalho: itens/dia × unidades por item', specFn: disp },
      ...(part ? [{ tipo: 'grafico', titulo: 'Participação no volume da função', specFn: part, altura: Math.max(200, conc.ordenado.length * 28 + 50) }] : []),
      { tipo: 'grafico', titulo: 'Evolução da produtividade da equipe', specFn: equipe },
      { tipo: 'tabela', titulo: 'Equipe mês a mês', modelo: modeloEquipe }
    ]
  };
  return { html, exportar };
};
