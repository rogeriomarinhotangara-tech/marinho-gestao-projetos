/* =========================================================================
   Painel Geral (Mapa de Produtividade) e detalhamento dos cartões.
   ========================================================================= */

function funcoesFiltradas() { return UI.funcao ? [FUNC[UI.funcao]] : FUNCOES; }
function subtituloPeriodo(p) {
  return `${esc(p.rotuloLongo)} · ${p.mensal ? 'visão mensal' : 'acumulado'} · ${UI.funcao ? esc(FUNC[UI.funcao].nome) : 'todas as funções'} · leitura: ${esc(rotuloLeitura().toLowerCase())}`;
}
function pctNaMeta(ini, fim, fs, leitura) {
  let bons = 0, eleg = 0;
  for (const f of fs) { const d = distribuicaoSituacao(ini, fim, f.id, leitura); bons += d.acima.length + d.na.length; eleg += d.acima.length + d.na.length + d.abaixo.length; }
  return { valor: div(bons, eleg), bons, eleg };
}
function seletorLeitura() {
  return `<div class="seg" role="group" aria-label="Leitura do ranking">
    <button type="button" data-acao="leitura" data-p='"principal"' aria-pressed="${UI.leitura === 'principal'}" data-dica="Só quem tem esta função como principal no cadastro. Quem atua como apoio aparece separado.">Função principal</button>
    <button type="button" data-acao="leitura" data-p='"todos"' aria-pressed="${UI.leitura === 'todos'}" data-dica="Todos que tiveram lançamento na função, com selo de apoio quando a função principal é outra.">Todos os lançamentos</button>
  </div>`;
}
function kpisCD(p, pa) {
  const fs = funcoesFiltradas();
  const fId = UI.funcao || null;
  const cd = totaisCD(p.ini, p.fim, fId);
  const cdA = pa ? totaisCD(pa.ini, pa.fim, fId) : null;
  const afetada = pa ? comparacaoAfetada(p.fim, pa.fim) : false;
  const rotComp = pa ? `Contra ${pa.rotulo}` : '';
  const semBase = 'sem mês anterior';
  const vr = (a, b, mais = true) => pa ? variacaoRel(a, b, { melhorSeMaior: mais, rotulo: rotComp, quebra: afetada }) : { valor: null, semBase };
  const vp = (a, b, mais = true) => pa ? variacaoPP(a, b, { melhorSeMaior: mais, rotulo: rotComp, quebra: afetada }) : { valor: null, semBase };
  const porF = campo => fs.length > 1 ? fs.map(f => `<span class="fb"><i style="background:var(${f.cor})"></i>${esc(f.curto)} ${compacto(campo(cd.porFuncao[f.id]))}</span>`).join('') : '';
  const op = operacao(p.ini, p.fim);
  const opA = pa ? operacao(pa.ini, pa.fim) : null;
  const pm = pctNaMeta(p.ini, p.fim, fs, UI.leitura);
  const pmA = pa ? pctNaMeta(pa.ini, pa.fim, fs, UI.leitura) : null;
  const pe = div(cd.dias, diasOperacaoPeriodo(p.ini, p.fim));
  const cards = [
    { rotulo: fs.length > 1 ? 'Documentos (pedidos + NF)' : `Documentos (${FUNC[fId].id === 'recebimento' ? 'NF' : 'pedidos'})`, valor: cd.documentos, variacao: vr(cd.documentos, cdA && cdA.documentos), detalhe: porF(t => t.ag.documentos), acao: 'ir', params: { rota: 'indicador', params: { id: 'documentos' } }, dica: 'Pedidos (separação e expedição) e notas fiscais (recebimento) processados nas funções filtradas.' },
    { rotulo: 'Itens (SKU)', valor: cd.skus, variacao: vr(cd.skus, cdA && cdA.skus), detalhe: porF(t => t.ag.skus), acao: 'ir', params: { rota: 'indicador', params: { id: 'itens' } }, dica: 'Linhas de SKU processadas: mede a complexidade do trabalho.' },
    { rotulo: 'Unidades', valor: cd.unidades, variacao: vr(cd.unidades, cdA && cdA.unidades), detalhe: porF(t => t.ag.unidades), acao: 'ir', params: { rota: 'indicador', params: { id: 'unidades' } }, dica: 'Unidades movimentadas: volume físico.' },
    { rotulo: 'Dias-função', valor: cd.dias, variacao: vr(cd.dias, cdA && cdA.dias, null), detalhe: pe != null ? `≈ ${fD1(pe)} pessoas-equivalentes por dia de operação` : '', acao: 'ir', params: { rota: 'indicador', params: { id: 'dias' } }, dica: 'Soma dos dias trabalhados em cada função: o custo de mão de obra em dias.' },
    { rotulo: 'Colaboradores ativos', valor: cd.colaboradores, variacao: vr(cd.colaboradores, cdA && cdA.colaboradores, null), detalhe: 'com lançamento no período', acao: 'ir', params: { rota: 'indicador', params: { id: 'colaboradores' } } },
    { rotulo: '% na meta ou acima', valor: pm.valor, formato: 'pct', variacao: vp(pm.valor, pmA && pmA.valor), detalhe: pm.eleg ? `${pm.bons} de ${pm.eleg} avaliações elegíveis` : 'sem elegíveis', acao: 'ir', params: { rota: 'indicador', params: { id: 'situacao' } }, dica: `Elegíveis (${P().minimoDias}+ dias) com índice de ${fPct(P().tolerancia)} da meta ou mais. Leitura: ${rotuloLeitura().toLowerCase()}.` },
    { rotulo: 'Índice do CD', valor: cd.indice, formato: 'pct', variacao: vp(cd.indice, cdA && cdA.indice), detalhe: 'produção total contra a meta (60/40)', acao: 'ir', params: { rota: 'indicador', params: { id: 'indice' } }, dica: 'Itens e unidades de todos os lançamentos ÷ o que as metas preveem para os mesmos dias, ponderado pelos dias de cada função.' }
  ];
  if (!fId || fId !== 'recebimento') {
    cards.push({ rotulo: 'Cobertura da conferência', valor: op.coberturaItens, formato: 'pct1', variacao: vp(op.coberturaItens, opA && opA.coberturaItens, null),
      detalhe: op.coberturaPedidos != null ? `pedidos: ${fPct1(op.coberturaPedidos)}` : '', acao: 'menu', params: { rota: 'fluxo', params: {} },
      dica: 'Itens conferidos na expedição ÷ itens separados. Perto de 100% indica que tudo o que foi separado passou pela conferência.' });
  }
  return { html: `<div class="kpis">${cards.map(kpiHTML).join('')}</div>`, cards };
}
function htmlLeitura(frases) {
  if (!frases.length) return '<p class="muted">Sem sinais relevantes para o período.</p>';
  return `<div class="leitura">${frases.map(f => `<button type="button" class="frase"${dataAcao('ir', { rota: f.acao, params: f.params })}>
    <span class="marcador t-${f.tom}">${icone(f.icone || 'info')}</span><span class="txt">${f.html}</span><span class="ir">Ver dado ›</span></button>`).join('')}</div>`;
}
function htmlPodios(p) {
  return `<div class="podios">${funcoesFiltradas().map(f => {
    const rk = ranking(p.ini, p.fim, f.id, UI.leitura);
    const { topo, fim } = primeirosEUltimos(rk);
    const item = (r, i, campeao) => `<button type="button" class="item${campeao ? ' campeao' : ''}"${dataAcao('ficha', { codigo: r.codigo, ym: p.fim, f: f.id })} data-dica="${esc(`${r.nomeCompleto}\nÍndice ${fPct(r.ind.indice)} · ${fD1(r.ind.itensDia)} itens/dia · ${fInt(r.ag.dias)} dias`)}">
      <span class="pos">${i}º</span><span class="nm">${esc(r.nome)} ${campeao ? `<span class="selo campeao">${p.mensal ? 'campeão' : 'líder'}</span>` : ''}${r.apoio ? ' <span class="selo apoio">apoio</span>' : ''}</span><span class="vl">${fPct(r.ind.indice)}</span></button>`;
    return `<div class="podio"><h4>${funcTag(f.id)}</h4>
      ${topo.length ? `<div class="sub-rot">3 primeiros</div><div class="lista">${topo.map((r, i) => item(r, i + 1, i === 0)).join('')}</div>` : '<p class="muted">Sem elegíveis no período.</p>'}
      ${fim.length ? `<div class="sub-rot">Menores índices</div><div class="lista">${fim.map(r => item(r, rk.pos.get(r.codigo), false)).join('')}</div>` : (topo.length ? '<p class="muted" style="font-size:12px">Menos de 4 elegíveis: sem lista de menores índices.</p>' : '')}
    </div>`;
  }).join('')}</div>`;
}
function htmlBalas(p) {
  return `<div class="balas">${funcoesFiltradas().map(f => {
    const t = totaisFuncao(p.ini, p.fim, f.id);
    const v = t.ind.itensDia, meta = t.ind.metaItens;
    if (!ok(v)) return `<div class="bala"><span>${funcTag(f.id)}</span><span class="muted">Sem lançamentos</span><span></span></div>`;
    const escala = Math.max(v, meta || 0) * 1.15 || 1;
    const tol = P().tolerancia;
    return `<button type="button" class="bala"${dataAcao('ir', { rota: 'funcao', params: { f: f.id } })} data-dica="${esc(`${f.nome}: ${fD1(v)} itens/dia (itens ÷ dias-função da equipe)\nMeta: ${fD1(meta)} itens/dia · faixa amarela: ${fPct(tol)} a 100% da meta`)}">
      <span>${funcTag(f.id)}</span>
      <span class="trilho">${meta ? `<span class="faixa" style="left:${(meta * tol / escala) * 100}%;width:${(meta * (1 - tol) / escala) * 100}%"></span>` : ''}<span class="barra" style="width:${(v / escala) * 100}%;background:var(${f.cor})"></span>${meta ? `<span class="meta" style="left:calc(${(meta / escala) * 100}% - 1px)"></span>` : ''}</span>
      <span class="valores"><b>${fD1(v)}</b> itens/dia · meta ${fD1(meta)} · ${fPct(div(v, meta))}</span>
    </button>`;
  }).join('')}</div>
  <div class="legenda" style="margin-top:10px"><span class="it"><span class="ln" style="border-color:var(--text)"></span>meta vigente</span><span class="it"><span class="sw" style="background:color-mix(in srgb, var(--warn) 30%, transparent)"></span>faixa "na meta" (${fPct(P().tolerancia)} a 100%)</span></div>`;
}
function htmlDistribuicao(p) {
  const ordem = ['acima', 'na', 'abaixo', 'insuf'];
  return `<div class="dist">${funcoesFiltradas().map(f => {
    const d = distribuicaoSituacao(p.ini, p.fim, f.id, UI.leitura);
    const total = ordem.reduce((s, k) => s + d[k].length, 0);
    if (!total) return `<div class="lin"><span>${funcTag(f.id)}</span><span class="muted">Sem lançamentos</span></div>`;
    return `<div class="lin"><span>${funcTag(f.id)}</span><div class="pilha-barra" role="img" aria-label="${esc(`${f.nome}: ${ordem.map(k => `${d[k].length} ${SITUACOES[k].rotulo.toLowerCase()}`).join(', ')}`)}">${ordem.filter(k => d[k].length).map(k => `<button type="button" class="seg-barra ${k}" style="flex:${d[k].length}"${dataAcao('ir', { rota: 'funcao', params: { f: f.id } })} data-dica="${esc(`${SITUACOES[k].rotulo}: ${d[k].map(r => r.nome).join(', ')}`)}">${d[k].length}</button>`).join('')}</div></div>`;
  }).join('')}</div>
  <div class="legenda" style="margin-top:12px">${ordem.map(k => `<span class="it">${pillSituacao(k)}</span>`).join('')}</div>`;
}
function htmlMapaCalor(p) {
  const meses = p.mensal ? mesesDoAnoAte(p.fim) : mesesComDados().filter(y => y >= p.ini && y <= p.fim);
  const blocos = funcoesFiltradas().map(f => {
    const cods = new Map();
    for (const y of meses) for (const r of linhasFuncao(y, y, f.id)) {
      const c = cods.get(r.codigo) || { codigo: r.codigo, nome: r.nome, nomeCompleto: r.nomeCompleto, apoio: r.apoio, itens: 0 };
      c.itens += r.ag.skus;
      cods.set(r.codigo, c);
    }
    const linhas = [...cods.values()].sort((a, b) => (a.apoio - b.apoio) || (b.itens - a.itens));
    if (!linhas.length) return `<h4 style="margin:6px 0">${funcTag(f.id)}</h4><p class="muted">Sem lançamentos.</p>`;
    const cab = `<tr><th scope="col" style="text-align:left">Colaborador</th>${meses.map(y => `<th scope="col" class="${y === p.fim ? 'mes-atual' : ''}">${esc(rotuloYMCurto(y))}</th>`).join('')}</tr>`;
    const corpo = linhas.map(c => `<tr><td class="nome" title="${esc(c.nomeCompleto)}">${esc(c.nome)}${c.apoio ? ' <span class="selo apoio">apoio</span>' : ''}</td>${meses.map(y => {
      const r = linhasFuncao(y, y, f.id).find(x => x.codigo === c.codigo);
      const atual = y === p.fim && p.mensal ? ' mes-atual' : '';
      if (!r) return `<td class="cel sem-dado${atual}"></td>`;
      const sit = r.ind.situacao;
      const forte = (sit === 'acima' && r.ind.indice >= 1.3) || (sit === 'abaixo' && r.ind.indice < 0.5) ? ' forte' : '';
      const txt = r.ind.indice != null ? fPct(r.ind.indice) : `${r.ag.dias}d`;
      const dica = `${r.nomeCompleto} · ${rotuloYM(y)} · ${f.nome}\nÍndice: ${r.ind.indice != null ? fPct(r.ind.indice) : TRACO} (${SITUACOES[sit].rotulo})\nItens/dia: ${fD1(r.ind.itensDia)} (meta ${fD1(r.ind.metaItens)})\nUnid./dia: ${fInt(r.ind.unidDia)} (meta ${fInt(r.ind.metaUnid)})\nDias na função: ${r.ag.dias}`;
      return `<td class="cel ${sit}${forte}${atual}" tabindex="0"${dataAcao('ficha', { codigo: c.codigo, ym: y, f: f.id })} data-dica="${esc(dica)}" aria-label="${esc(dica.replace(/\n/g, '. '))}">${esc(txt)}</td>`;
    }).join('')}</tr>`).join('');
    return `<h4 style="margin:10px 0 6px">${funcTag(f.id)}</h4><div class="calor-wrap"><table class="calor"><thead>${cab}</thead><tbody>${corpo}</tbody></table></div>`;
  }).join('');
  return blocos + `<div class="legenda" style="margin-top:12px">
    <span class="it"><span class="sw" style="background:var(--ok-bg);outline:1px solid var(--ok)"></span>Acima da meta (≥ 100%)</span>
    <span class="it"><span class="sw" style="background:var(--warn-bg);outline:1px solid var(--warn)"></span>Na meta (${fPct(P().tolerancia)} a 100%)</span>
    <span class="it"><span class="sw" style="background:var(--bad-bg);outline:1px solid var(--bad)"></span>Abaixo da meta</span>
    <span class="it"><span class="sw" style="background:var(--na-bg);outline:1px solid var(--na)"></span>Dias insuficientes (mostra os dias)</span>
  </div>`;
}
function specEvolucaoItens(meses, fs) {
  return specEvolucao({
    meses,
    series: fs.map(f => ({ funcao: f.id, rotulo: f.nome, dados: meses.map(y => { const t = totaisFuncao(y, y, f.id).ag; return t.linhas ? t.skus : null; }) })),
    formato: 'int',
    aoClicar: (s, y) => navegar('funcao', { f: s.funcao, ym: y }, 'detalhe')
  });
}
function legendaItens(itens, extra = '') {
  return `<div class="legenda" style="margin-top:8px">${itens.map(i => `<span class="it">${i.tipo === 'sw' ? `<span class="sw" style="background:${i.cor}"></span>` : `<span class="ln${i.tipo === 'trac' ? ' trac' : ''}" style="border-color:${i.cor}"></span>`}${esc(i.rotulo)}</span>`).join('')}${extra}</div>`;
}
function legendaFuncoes(fs, extra = '') {
  return `<div class="legenda" style="margin-top:8px">${fs.map(f => `<span class="it"><span class="ln" style="border-color:var(${f.cor})"></span>${esc(f.nome)}</span>`).join('')}${extra}</div>`;
}
const LEGENDA_QUEBRA = '<span class="it"><span class="ln trac" style="border-color:var(--warn)"></span>Quebra de série (entrada das rotas externas no coletor)</span>';

VIEWS.painel = () => {
  const p = periodo();
  const pa = periodoAnteriorUI();
  const fs = funcoesFiltradas();
  const k = kpisCD(p, pa);
  const frases = leituraGerencial(p.ini, p.fim, UI.funcao || null, UI.leitura, UI.visao);
  const mesesEvol = mesesDoAnoAte(p.fim);
  const evol = specEvolucaoItens(mesesEvol, fs);
  const html = `
    ${cabecalhoTela('Painel Geral', subtituloPeriodo(p), seletorLeitura())}
    ${avisoQuebraPeriodo(p)}
    ${k.html}
    ${bloco({ titulo: 'Leitura gerencial automática', desc: 'Sinais de alerta gerados por regra a partir dos dados. Clique numa frase para ver o dado que a originou.', corpo: htmlLeitura(frases) })}
    ${bloco({ titulo: `Pódio: 3 primeiros e menores índices ${p.mensal ? 'do mês' : 'do período'}`, desc: 'Pelo Índice de Eficiência, sempre dentro da mesma função.', corpo: htmlPodios(p) })}
    <div class="grade-2">
      ${bloco({ titulo: 'Evolução mensal de itens por função', desc: 'Clique num ponto para abrir a função naquele mês.', corpo: graficoHTML(evol, { altura: 300, rotulo: 'Evolução mensal de itens por função' }) + legendaFuncoes(fs, quebrasNoIntervalo(mesesEvol[0] ?? p.fim, p.fim).length ? LEGENDA_QUEBRA : '') })}
      ${bloco({ titulo: 'Itens/dia da equipe contra a meta', desc: 'Total de itens ÷ total de dias-função de cada função.', corpo: htmlBalas(p) + '<div style="height:18px"></div><h4 style="margin-bottom:10px">Colaboradores por situação</h4>' + htmlDistribuicao(p) })}
    </div>
    ${bloco({ titulo: 'Mapa de calor: Índice de Eficiência por colaborador e mês', desc: 'Cada célula é um colaborador numa função num mês. Clique para abrir a ficha naquele mês.', corpo: htmlMapaCalor(p) })}
  `;
  const exportar = {
    titulo: 'Painel Geral', subtitulo: textoPuro(subtituloPeriodo(p)),
    secoes: [
      { tipo: 'kpis', titulo: 'Indicadores principais', itens: k.cards.map(itemKpiExport) },
      ...(avisoQuebraPeriodo(p) ? [{ tipo: 'texto', titulo: 'Quebra de série', paragrafos: [textoPuro(avisoQuebraPeriodo(p))] }] : []),
      { tipo: 'texto', titulo: 'Leitura gerencial automática', paragrafos: frases.map(f => textoPuro(f.html)), marcadores: true },
      ...fs.map(f => {
        const m = modeloRanking({ ini: p.ini, fim: p.fim, funcao: f.id, leitura: UI.leitura, visao: UI.visao, completa: false });
        return { tipo: 'tabela', titulo: `Ranking: ${f.nome}`, modelo: m };
      }),
      { tipo: 'grafico', titulo: 'Evolução mensal de itens por função', specFn: evol, legenda: fs.map(f => f.nome).join(' · ') },
      { tipo: 'tabela', titulo: 'Itens/dia da equipe contra a meta', modelo: modeloSimples([
        { id: 'f', rotulo: 'Função', valor: l => l.f.nome },
        { id: 'v', rotulo: 'Itens/dia', tipo: 'd1', valor: l => l.t.ind.itensDia },
        { id: 'm', rotulo: 'Meta itens/dia', tipo: 'd1', valor: l => l.t.ind.metaItens },
        { id: 'p', rotulo: '% da meta', tipo: 'pct', valor: l => l.t.ind.pctItens },
        { id: 'i', rotulo: 'Índice da equipe', tipo: 'pct', valor: l => l.t.ind.indice },
        ...['acima', 'na', 'abaixo', 'insuf'].map(s => ({ id: s, rotulo: SITUACOES[s].curto, tipo: 'int', valor: l => distribuicaoSituacao(p.ini, p.fim, l.f.id, UI.leitura)[s].length }))
      ], fs.map(f => ({ f, t: totaisFuncao(p.ini, p.fim, f.id) }))) },
      ...fs.map(f => ({ tipo: 'tabela', titulo: `Mapa de calor: ${f.nome} (Índice de Eficiência)`, modelo: modeloCalor(p, f.id) }))
    ]
  };
  return { html, exportar };
};
function modeloCalor(p, funcao) {
  const meses = p.mensal ? mesesDoAnoAte(p.fim) : mesesComDados().filter(y => y >= p.ini && y <= p.fim);
  const cods = new Map();
  for (const y of meses) for (const r of linhasFuncao(y, y, funcao)) { const c = cods.get(r.codigo) || { codigo: r.codigo, nome: r.nome, itens: 0, apoio: r.apoio }; c.itens += r.ag.skus; cods.set(r.codigo, c); }
  const linhas = [...cods.values()].sort((a, b) => (a.apoio - b.apoio) || (b.itens - a.itens));
  return modeloSimples([
    { id: 'nome', rotulo: 'Colaborador', valor: l => l.nome + (l.apoio ? ' (apoio)' : '') },
    ...meses.map(y => ({ id: 'm' + y, rotulo: rotuloYMCurto(y), tipo: 'pct', valor: l => { const r = linhasFuncao(y, y, funcao).find(x => x.codigo === l.codigo); return r ? r.ind.indice : null; },
      texto: l => { const r = linhasFuncao(y, y, funcao).find(x => x.codigo === l.codigo); return !r ? '' : r.ind.indice != null ? fPct(r.ind.indice) : `${r.ag.dias} dias`; } }))
  ], linhas);
}

/* ---------- detalhamento dos cartões ---------- */
const INDICADORES = {
  documentos: { rotulo: 'Documentos', desc: 'Pedidos (separação e expedição) e notas fiscais (recebimento).', valor: t => t.ag.documentos, formato: 'int' },
  itens: { rotulo: 'Itens (SKU)', desc: 'Linhas de SKU processadas em cada função.', valor: t => t.ag.skus, formato: 'int' },
  unidades: { rotulo: 'Unidades', desc: 'Unidades movimentadas em cada função.', valor: t => t.ag.unidades, formato: 'int' },
  dias: { rotulo: 'Dias-função', desc: 'Soma dos dias trabalhados em cada função.', valor: t => t.ag.dias, formato: 'int' },
  indice: { rotulo: 'Índice da equipe', desc: 'Produção da equipe contra a meta: itens e unidades ÷ o que a meta prevê para os mesmos dias (pesos 60/40).', valor: t => t.ind.indice, formato: 'pct' },
  colaboradores: { rotulo: 'Colaboradores ativos', desc: 'Colaboradores distintos com lançamento.', valor: t => t.colaboradores, formato: 'int' },
  situacao: { rotulo: '% na meta ou acima', desc: 'Avaliações elegíveis com índice na tolerância ou acima.', valor: null, formato: 'pct' }
};
VIEWS.indicador = params => {
  const p = periodo();
  const def = INDICADORES[params.id] || INDICADORES.itens;
  const fs = funcoesFiltradas();
  const meses = mesesDoAnoAte(p.fim);
  const valorF = (y0, y1, f) => params.id === 'situacao' ? pctNaMeta(y0, y1, [f], UI.leitura).valor : def.valor(totaisFuncao(y0, y1, f.id));
  const cartoes = fs.map(f => kpiHTML({ rotulo: f.nome, valor: valorF(p.ini, p.fim, f), formato: def.formato, acao: 'ir', params: { rota: 'funcao', params: { f: f.id } }, detalhe: 'Abrir a função ›' })).join('');
  const spec = specEvolucao({ meses, series: fs.map(f => ({ funcao: f.id, rotulo: f.nome, dados: meses.map(y => totaisFuncao(y, y, f.id).ag.linhas ? valorF(y, y, f) : null) })), formato: def.formato, aoClicar: (s, y) => navegar('funcao', { f: s.funcao, ym: y }, 'detalhe') });
  const modelo = modeloSimples([
    { id: 'mes', rotulo: 'Mês', valor: l => rotuloYM(l.y) },
    ...fs.map(f => ({ id: f.id, rotulo: f.nome, tipo: def.formato === 'pct' ? 'pct' : 'int', valor: l => totaisFuncao(l.y, l.y, f.id).ag.linhas ? valorF(l.y, l.y, f) : null })),
    ...(def.formato !== 'pct' && params.id !== 'colaboradores' ? [{ id: 'total', rotulo: 'Total', tipo: 'int', valor: l => soma(fs, f => valorF(l.y, l.y, f)) }] : [])
  ], meses.map(y => ({ y })), { linhaAttrs: l => ({ acao: 'ir', params: { rota: 'painel', params: { ym: l.y } } }) });
  let extra = '';
  if (params.id === 'colaboradores' || params.id === 'situacao') {
    const lista = [];
    for (const f of fs) for (const r of [...ranking(p.ini, p.fim, f.id, UI.leitura).eleg, ...ranking(p.ini, p.fim, f.id, UI.leitura).nao, ...ranking(p.ini, p.fim, f.id, UI.leitura).apoio]) lista.push(r);
    lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR') || FUNCOES.findIndex(f => f.id === a.funcao) - FUNCOES.findIndex(f => f.id === b.funcao));
    const m = modeloSimples([
      colNome(),
      { id: 'f', rotulo: 'Função', valor: l => FUNC[l.funcao].nome, html: l => funcTag(l.funcao) },
      { id: 'dias', rotulo: 'Dias', tipo: 'int', valor: l => l.ag.dias },
      { id: 'itensDia', rotulo: 'Itens/dia', tipo: 'd1', valor: l => l.ind.itensDia },
      { id: 'indice', rotulo: 'Índice', tipo: 'pct', valor: l => l.ind.indice },
      { id: 'sit', rotulo: 'Situação', valor: l => SITUACOES[l.ind.situacao].rotulo, html: l => pillSituacao(l.ind.situacao) }
    ], lista, { linhaAttrs: l => ({ acao: 'ficha', params: { codigo: l.codigo, ym: p.fim, f: l.funcao } }) });
    extra = bloco({ titulo: 'Colaboradores no período', desc: `Leitura: ${esc(rotuloLeitura().toLowerCase())}. Clique para abrir a ficha.`, corpo: tabelaHTML(m) });
  }
  const html = `${cabecalhoTela(def.rotulo, subtituloPeriodo(p))}
    <p class="muted">${esc(def.desc)}</p>
    <div class="kpis">${cartoes}</div>
    ${bloco({ titulo: 'Evolução mês a mês por função', desc: 'Clique num ponto para abrir a função naquele mês.', corpo: graficoHTML(spec, { altura: 300, rotulo: def.rotulo }) + legendaFuncoes(fs, quebrasNoIntervalo(meses[0] ?? p.fim, p.fim).length ? LEGENDA_QUEBRA : '') })}
    ${bloco({ titulo: 'Tabela mês a mês', corpo: tabelaHTML(modelo) })}
    ${extra}`;
  return { html, exportar: { titulo: def.rotulo, subtitulo: textoPuro(subtituloPeriodo(p)), secoes: [{ tipo: 'grafico', titulo: 'Evolução mês a mês', specFn: spec }, { tipo: 'tabela', titulo: 'Tabela mês a mês', modelo }] } };
};
