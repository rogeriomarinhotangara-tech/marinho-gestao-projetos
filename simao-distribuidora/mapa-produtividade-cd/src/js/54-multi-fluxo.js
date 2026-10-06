/* =========================================================================
   Multifunção e Alocação · Fluxo e Capacidade.
   ========================================================================= */

function specPessoasEq(meses) {
  return (pal, tela) => ({
    type: 'bar',
    data: { labels: meses.map(rotuloYMCurto), datasets: FUNCOES.map(f => ({ label: f.nome, data: meses.map(y => div(totaisFuncao(y, y, f.id).ag.dias, diasOperacao(y))), backgroundColor: pal.funcao[f.id], borderColor: pal.superficie, borderWidth: { top: 2, bottom: 0, left: 0, right: 0 }, borderSkipped: false, maxBarThickness: 26, stack: 'pe' })) },
    options: {
      ...opcoesBase(pal, tela),
      interaction: { mode: 'index', intersect: false },
      scales: { x: { ...eixoCategoria(pal), stacked: true }, y: { ...eixoValor(pal, v => fNum(v, 'int')), stacked: true } },
      plugins: { ...opcoesBase(pal, tela).plugins, quebraSerie: { indices: meses.map((y, i) => infoMes(y).quebraSerie ? i : -1).filter(i => i > 0), cor: pal.warn, corTexto: pal.texto2 },
        tooltip: { ...opcoesBase(pal, tela).plugins.tooltip, callbacks: { title: it => it.length ? rotuloYM(meses[it[0].dataIndex]) : '', label: it => `${it.dataset.label}: ${fD1(it.parsed.y)} pessoas-equivalentes`, footer: it => { const y = meses[it[0].dataIndex]; return `Dias de operação: ${diasOperacao(y) ?? TRACO}`; } } } }
    },
    plugins: [pluginQuebra]
  });
}

VIEWS.multifuncao = () => {
  const p = periodo();
  const mf = multifuncao(p.ini, p.fim);
  const meses = mesesComDados().filter(y => y >= p.ini && y <= p.fim);
  const op = operacao(p.ini, p.fim);
  const multi = mf.filter(m => m.funcoes.length > 1);
  const fatiados = mf.filter(m => m.mesesFatiados > 0);
  const linhas = mf.slice().sort((a, b) => (b.fatiamento || 0) - (a.fatiamento || 0) || b.diasFuncao - a.diasFuncao);
  const modelo = modeloSimples([
    colNome({ html: l => `<span class="nome">${esc(l.nome)}</span><span class="cod">${esc(l.codigo)}</span>${estaDesligado(l.codigo) ? ' <span class="selo">desligado</span>' : ''}` }),
    { id: 'pr', rotulo: 'Função principal', valor: l => l.principal ? FUNC[l.principal].nome : '', html: l => l.principal ? funcTag(l.principal, true) : TRACO },
    { id: 'fns', rotulo: 'Funções no período', valor: l => l.funcoes.map(f => FUNC[f].nome).join(' + '), html: l => l.funcoes.map(f => funcTag(f, true)).join(' ') },
    ...(p.mensal ? [] : meses.map(y => ({ id: 'n' + y, rotulo: `nº ${rotuloYMCurto(y)}`, tipo: 'int', valor: l => { const m = l.porMes.find(x => x.ym === y); return m && m.funcoes.length ? m.funcoes.length : null; }, ocultoCel: true }))),
    { id: 'pres', rotulo: 'Dias de presença', tipo: 'int', valor: l => l.presenca },
    { id: 'df', rotulo: 'Dias-função', tipo: 'int', valor: l => l.diasFuncao },
    { id: 'fat', rotulo: 'Fatiamento', tipo: 'd2', valor: l => l.fatiamento, html: l => l.fatiamento > 1 + EPS ? `<b style="color:var(--warn-ink)">${fD2(l.fatiamento)}</b>` : fD2(l.fatiamento), dica: 'Dias-função ÷ dias de presença. Acima de 1: dia dividido entre funções.' },
    { id: 'al', rotulo: 'Alocação', tipo: 'pct', valor: l => l.alocacao, dica: 'Dias-função ÷ dias de operação do CD no período.' }
  ], linhas, { linhaAttrs: l => ({ acao: 'ficha', params: { codigo: l.codigo, ym: p.fim }, classe: l.fatiamento > 1 + EPS ? 'destaque-fim' : '' }) });
  const modeloPE = modeloSimples([
    { id: 'f', rotulo: 'Função', valor: l => l.f.nome, html: l => funcTag(l.f.id) },
    { id: 'df', rotulo: 'Dias-função', tipo: 'int', valor: l => op.t[l.f.id].ag.dias },
    { id: 'pe', rotulo: 'Pessoas-eq.', tipo: 'd1', valor: l => op.pessoasEq[l.f.id], dica: 'Dias-função ÷ dias de operação' },
    { id: 'col', rotulo: 'Pessoas', tipo: 'int', valor: l => op.t[l.f.id].colaboradores, dica: 'Colaboradores distintos com lançamento' }
  ], FUNCOES.map(f => ({ f })), { rodape: { f: 'Total', df: soma(FUNCOES, f => op.t[f.id].ag.dias), pe: op.pessoasEqTotal, col: new Set(lancamentosPeriodo(p.ini, p.fim).map(l => l.codigo)).size }, cartoes: false });
  const spec = specPessoasEq(mesesDoAnoAte(p.fim));
  const html = `${cabecalhoTela('Multifunção e Alocação', `${esc(p.rotuloLongo)} · ${p.mensal ? 'visão mensal' : 'acumulado'}`)}
    ${avisoHTML('atencao', `<b>Leia antes de cobrar produtividade individual.</b> Quem divide o dia entre funções tem cada dia contado inteiro em cada função. Por isso a produtividade por dia dessa pessoa fica subestimada em todas elas. Fatiamento acima de 1,00 é o sinal. Alocação mostra quanto do tempo de operação do CD a pessoa ocupou somando as funções.`)}
    <div class="kpis">
      ${kpiHTML({ rotulo: 'Pessoas-equivalentes no CD', valor: op.pessoasEqTotal, formato: 'd1', detalhe: `dias-função ÷ ${fInt(op.diasOperacao)} dias de operação` })}
      ${FUNCOES.map(f => kpiHTML({ rotulo: `Pessoas-equiv.: ${f.nome}`, valor: op.pessoasEq[f.id], formato: 'd1', acao: 'ir', params: { rota: 'funcao', params: { f: f.id } } })).join('')}
      ${kpiHTML({ rotulo: 'Colaboradores em mais de uma função', valor: multi.length, detalhe: `de ${mf.length} com lançamento` })}
      ${kpiHTML({ rotulo: 'Com dia dividido entre funções', valor: fatiados.length, detalhe: 'dias-função acima da presença em algum mês' })}
    </div>
    <div class="grade-2">
      ${bloco({ titulo: 'Pessoas-equivalentes por função, mês a mês', desc: 'Dias-função de cada função ÷ dias de operação do mês.', corpo: graficoHTML(spec, { altura: 280, rotulo: 'Pessoas-equivalentes por função' }) + legendaItens(FUNCOES.map(f => ({ rotulo: f.nome, cor: `var(${f.cor})`, tipo: 'sw' })), quebrasNoIntervalo(ymDe(anoDe(p.fim), 1), p.fim).length ? LEGENDA_QUEBRA : '') })}
      ${bloco({ titulo: 'Pessoas-equivalentes no período', corpo: tabelaHTML(modeloPE) })}
    </div>
    ${bloco({ titulo: 'Colaboradores: presença, dias-função e fatiamento', desc: 'Ordenado pelo fatiamento. Linhas marcadas em vermelho: dia dividido entre funções. Clique para abrir a ficha.', corpo: tabelaHTML(modelo) })}`;
  return { html, exportar: { titulo: 'Multifunção e Alocação', subtitulo: `${p.rotuloLongo} · ${p.mensal ? 'visão mensal' : 'acumulado'}`, secoes: [
    { tipo: 'texto', titulo: 'Como ler', paragrafos: ['Quem divide o dia entre funções tem cada dia contado inteiro em cada função; a produtividade por dia dessa pessoa fica subestimada. Fatiamento = dias-função ÷ dias de presença (acima de 1 = dia dividido). Alocação = dias-função ÷ dias de operação.'] },
    { tipo: 'tabela', titulo: 'Pessoas-equivalentes no período', modelo: modeloPE },
    { tipo: 'grafico', titulo: 'Pessoas-equivalentes por função, mês a mês', specFn: spec },
    { tipo: 'tabela', titulo: 'Colaboradores: presença, dias-função e fatiamento', modelo }
  ] } };
};

/* ---------- Fluxo e Capacidade ---------- */
function specFluxoUnidades(meses) {
  return (pal, tela) => ({
    type: 'bar',
    data: { labels: meses.map(rotuloYMCurto), datasets: [
      { label: 'Recebidas', data: meses.map(y => totaisFuncao(y, y, 'recebimento').ag.unidades || null), backgroundColor: pal.funcao.recebimento },
      { label: 'Separadas', data: meses.map(y => totaisFuncao(y, y, 'separacao').ag.unidades || null), backgroundColor: pal.funcao.separacao },
      { label: 'Conferidas na expedição', data: meses.map(y => totaisFuncao(y, y, 'expedicao').ag.unidades || null), backgroundColor: pal.funcao.expedicao }
    ].map(d => ({ ...d, borderRadius: { topLeft: 4, topRight: 4 }, borderSkipped: 'start', maxBarThickness: 16, categoryPercentage: 0.72, barPercentage: 0.92 })) },
    options: {
      ...opcoesBase(pal, tela), interaction: { mode: 'index', intersect: false },
      scales: { x: eixoCategoria(pal), y: eixoValor(pal, v => compacto(v)) },
      plugins: { ...opcoesBase(pal, tela).plugins, quebraSerie: { indices: meses.map((y, i) => infoMes(y).quebraSerie ? i : -1).filter(i => i > 0), cor: pal.warn, corTexto: pal.texto2 },
        tooltip: { ...opcoesBase(pal, tela).plugins.tooltip, callbacks: { title: it => it.length ? rotuloYM(meses[it[0].dataIndex]) : '', label: it => `${it.dataset.label}: ${fInt(it.parsed.y)} unidades` } } },
      ...aoClicarGrafico((di, i) => navegar('fluxo', { ym: meses[i] }, 'detalhe'))
    },
    plugins: [pluginQuebra]
  });
}
function specSaldo(meses) {
  return (pal, tela) => {
    const saldos = meses.map(y => operacao(y, y).saldo);
    let ac = 0;
    const acum = saldos.map(s => { if (s == null) return null; ac += s; return ac; });
    return {
      type: 'bar',
      data: { labels: meses.map(rotuloYMCurto), datasets: [
        { type: 'bar', label: 'Saldo do mês', data: saldos, backgroundColor: saldos.map(s => s >= 0 ? pal.funcao.recebimento : pal.funcao.separacao), borderRadius: 4, borderSkipped: false, maxBarThickness: 24, order: 2 },
        { type: 'line', label: 'Saldo acumulado no ano', data: acum, borderColor: pal.texto, backgroundColor: pal.texto, borderWidth: 2, pointRadius: 4, pointBorderColor: pal.superficie, pointBorderWidth: 2, tension: 0, order: 1 }
      ] },
      options: {
        ...opcoesBase(pal, tela), interaction: { mode: 'index', intersect: false },
        scales: { x: eixoCategoria(pal), y: { ...eixoValor(pal, v => compacto(v)), beginAtZero: true } },
        plugins: { ...opcoesBase(pal, tela).plugins, quebraSerie: { indices: meses.map((y, i) => infoMes(y).quebraSerie ? i : -1).filter(i => i > 0), cor: pal.warn, corTexto: pal.texto2 },
          tooltip: { ...opcoesBase(pal, tela).plugins.tooltip, callbacks: { title: it => it.length ? rotuloYM(meses[it[0].dataIndex]) : '', label: it => `${it.dataset.label}: ${fSinal(it.parsed.y, 'int')} unidades`, footer: () => 'Saldo = unidades recebidas − unidades separadas' } } }
      },
      plugins: [pluginQuebra]
    };
  };
}
VIEWS.fluxo = () => {
  const p = periodo(), pa = periodoAnteriorUI();
  const op = operacao(p.ini, p.fim);
  const opA = pa ? operacao(pa.ini, pa.fim) : null;
  const afetada = pa ? comparacaoAfetada(p.fim, pa.fim) : false;
  const rotComp = pa ? `Contra ${pa.rotulo}` : '';
  const meses = mesesDoAnoAte(p.fim);
  const capTotal = soma(FUNCOES, f => op.capacidade[f.id].dias), capAbaixo = soma(FUNCOES, f => op.capacidade[f.id].diasAbaixo);
  const sAcum = saldoAcumulado(p.fim);
  const cards = [
    { rotulo: 'Saldo de fluxo do período', valor: op.saldo, detalhe: 'unidades recebidas − separadas', variacao: pa && op.saldo != null && opA && opA.saldo != null ? { valor: op.saldo - opA.saldo, abs: true, unidade: 'un.', melhorSeMaior: null, rotulo: `${rotComp} (diferença em unidades)`, quebra: afetada } : null, dica: 'Positivo: entrou mais mercadoria do que saiu para as lojas e rotas.' },
    { rotulo: `Saldo acumulado em ${anoDe(p.fim)}`, valor: sAcum, detalhe: `janeiro a ${nomeMes(p.fim).toLowerCase()}` },
    { rotulo: 'Cobertura da conferência (itens)', valor: op.coberturaItens, formato: 'pct1', detalhe: 'itens conferidos ÷ itens separados', variacao: pa ? variacaoPP(op.coberturaItens, opA && opA.coberturaItens, { melhorSeMaior: null, rotulo: rotComp, quebra: afetada }) : null },
    { rotulo: 'Cobertura da conferência (pedidos)', valor: op.coberturaPedidos, formato: 'pct1', detalhe: 'pedidos conferidos ÷ pedidos separados' },
    { rotulo: 'Relação de mão de obra', valor: op.relacaoMO, formato: 'd2', detalhe: 'dias-função de separação ÷ de conferência', variacao: pa ? variacaoRel(op.relacaoMO, opA && opA.relacaoMO, { melhorSeMaior: false, rotulo: rotComp, quebra: afetada }) : null },
    { rotulo: 'Dias-função liberáveis', valor: capTotal, formato: 'd1', detalhe: `≈ ${fD1(div(capTotal, op.diasOperacao))} pessoas-equivalentes · só "abaixo da meta": ${fD1(capAbaixo)}` }
  ];
  const modeloMeses = modeloSimples([
    { id: 'mes', rotulo: 'Mês', valor: l => rotuloYM(l.y), prim: true, html: l => `<b>${esc(rotuloYM(l.y))}</b>${infoMes(l.y).quebraSerie ? ' <span class="selo rotas">quebra de série</span>' : ''}` },
    { id: 'rec', rotulo: 'Unid. recebidas', tipo: 'int', valor: l => l.o.t.recebimento.ag.unidades },
    { id: 'sep', rotulo: 'Unid. separadas', tipo: 'int', valor: l => l.o.t.separacao.ag.unidades },
    { id: 'exp', rotulo: 'Unid. conferidas', tipo: 'int', valor: l => l.o.t.expedicao.ag.unidades },
    { id: 'saldo', rotulo: 'Saldo', tipo: 'int', valor: l => l.o.saldo, texto: l => fSinal(l.o.saldo, 'int') },
    { id: 'cobI', rotulo: 'Cobertura itens', tipo: 'pct1', valor: l => l.o.coberturaItens },
    { id: 'cobP', rotulo: 'Cobertura pedidos', tipo: 'pct1', valor: l => l.o.coberturaPedidos },
    { id: 'mo', rotulo: 'Relação MO', tipo: 'd2', valor: l => l.o.relacaoMO },
    ...FUNCOES.map(f => ({ id: 'pe' + f.id, rotulo: `Pessoas-eq. ${f.curto}`, tipo: 'd1', valor: l => l.o.pessoasEq[f.id], ocultoCel: true, tela: false })),
    { id: 'dop', rotulo: 'Dias de operação', tipo: 'int', valor: l => l.o.diasOperacao, ocultoCel: true }
  ], meses.map(y => ({ y, o: operacao(y, y) })), { linhaAttrs: l => ({ acao: 'ir', params: { rota: 'fluxo', params: { ym: l.y } }, classe: l.y === p.fim ? 'destaque-topo' : '' }) });
  const capDet = FUNCOES.flatMap(f => op.capacidade[f.id].detalhes.map(d => ({ ...d, funcao: f.id })));
  const modeloCap = modeloSimples([
    colNome({ html: l => `<span class="nome">${esc(l.nome)}</span><span class="cod">${esc(l.codigo)}</span>${l.apoio ? ' <span class="selo apoio">apoio</span>' : ''}` }),
    { id: 'f', rotulo: 'Função', valor: l => FUNC[l.funcao].nome, html: l => funcTag(l.funcao, true) },
    { id: 'dias', rotulo: 'Dias trabalhados', tipo: 'int', valor: l => l.dias },
    { id: 'idx', rotulo: 'Índice', tipo: 'pct', valor: l => l.indice },
    { id: 'sit', rotulo: 'Situação', valor: l => SITUACOES[l.situacao].rotulo, html: l => pillSituacao(l.situacao) },
    { id: 'nec', rotulo: 'Dias se estivesse na meta', tipo: 'd1', valor: l => l.necessarios },
    { id: 'lib', rotulo: 'Dias liberáveis', tipo: 'd1', valor: l => l.liberaveis }
  ], capDet.sort((a, b) => b.liberaveis - a.liberaveis), { linhaAttrs: l => ({ acao: 'ficha', params: { codigo: l.codigo, ym: p.fim, f: l.funcao } }), vazio: 'Nenhum elegível abaixo de 100% da meta no período.' });
  const modeloCapF = modeloSimples([
    { id: 'f', rotulo: 'Função', valor: l => l.f.nome, html: l => funcTag(l.f.id) },
    { id: 'n', rotulo: 'Elegíveis abaixo de 100%', tipo: 'int', valor: l => op.capacidade[l.f.id].detalhes.length },
    { id: 'd', rotulo: 'Dias-função liberáveis', tipo: 'd1', valor: l => op.capacidade[l.f.id].dias },
    { id: 'pe', rotulo: 'Pessoas-equiv. liberáveis', tipo: 'd1', valor: l => op.capacidade[l.f.id].pessoas },
    { id: 'da', rotulo: 'Só "abaixo da meta" (dias)', tipo: 'd1', valor: l => op.capacidade[l.f.id].diasAbaixo },
    { id: 'pa', rotulo: 'Só "abaixo da meta" (pessoas-eq.)', tipo: 'd1', valor: l => op.capacidade[l.f.id].pessoasAbaixo }
  ], FUNCOES.map(f => ({ f })), { cartoes: false, rodape: { f: 'Total', n: capDet.length, d: capTotal, pe: div(capTotal, op.diasOperacao), da: capAbaixo, pa: div(capAbaixo, op.diasOperacao) } });
  const sUn = specFluxoUnidades(meses), sSaldo = specSaldo(meses);
  const html = `${cabecalhoTela('Fluxo e Capacidade', `${esc(p.rotuloLongo)} · ${p.mensal ? 'visão mensal' : 'acumulado'}`)}
    ${avisoQuebraPeriodo(p)}
    <div class="kpis">${cards.map(kpiHTML).join('')}</div>
    <div class="grade-2">
      ${bloco({ titulo: 'Unidades recebidas, separadas e conferidas', desc: 'Clique num mês para abri-lo.', corpo: graficoHTML(sUn, { altura: 290, rotulo: 'Unidades por mês' }) + `<div class="legenda" style="margin-top:8px"><span class="it"><span class="sw" style="background:var(--f-rec)"></span>Recebidas</span><span class="it"><span class="sw" style="background:var(--f-sep)"></span>Separadas</span><span class="it"><span class="sw" style="background:var(--f-exp)"></span>Conferidas na expedição</span>${quebrasNoIntervalo(meses[0] ?? p.fim, p.fim).length ? LEGENDA_QUEBRA : ''}</div>` })}
      ${bloco({ titulo: 'Saldo de fluxo: recebido − separado', desc: 'Barra azul: entrou mais do que saiu. Barra laranja: saiu mais do que entrou. Linha: saldo acumulado no ano.', corpo: graficoHTML(sSaldo, { altura: 290, rotulo: 'Saldo de fluxo' }) + legendaItens([{ rotulo: 'Entrou mais do que saiu', cor: 'var(--f-rec)', tipo: 'sw' }, { rotulo: 'Saiu mais do que entrou', cor: 'var(--f-sep)', tipo: 'sw' }, { rotulo: 'Saldo acumulado no ano', cor: 'var(--text)', tipo: 'ln' }]) })}
    </div>
    ${bloco({ titulo: 'Comparação entre meses', corpo: tabelaHTML(modeloMeses) })}
    ${bloco({ titulo: 'Capacidade potencial', desc: 'Para cada elegível com índice abaixo de 100%: dias que bastariam para o mesmo volume se estivesse na meta (dias × índice). A diferença somada vira dias-função e pessoas-equivalentes liberáveis.', corpo: avisoHTML('info', '<b>Ressalva:</b> a conta não considera qualidade (erros, divergências) nem o trabalho de apoio entre funções. No recebimento, o ritmo depende do volume que chega. Use como ordem de grandeza, não como meta de corte.') + '<div style="height:12px"></div>' + tabelaHTML(modeloCapF) + '<div style="height:16px"></div>' + tabelaHTML(modeloCap) })}`;
  return { html, exportar: { titulo: 'Fluxo e Capacidade', subtitulo: `${p.rotuloLongo} · ${p.mensal ? 'visão mensal' : 'acumulado'}`, secoes: [
    { tipo: 'kpis', titulo: 'Indicadores da operação', itens: cards.map(itemKpiExport) },
    { tipo: 'grafico', titulo: 'Unidades recebidas, separadas e conferidas', specFn: sUn, legenda: 'Recebidas · Separadas · Conferidas na expedição' },
    { tipo: 'grafico', titulo: 'Saldo de fluxo (recebido − separado)', specFn: sSaldo },
    { tipo: 'tabela', titulo: 'Comparação entre meses', modelo: modeloMeses },
    { tipo: 'tabela', titulo: 'Capacidade potencial por função', modelo: modeloCapF },
    { tipo: 'texto', titulo: 'Ressalva', paragrafos: ['A capacidade potencial não considera qualidade (erros, divergências) nem o trabalho de apoio entre funções. No recebimento, o ritmo depende do volume que chega.'] },
    { tipo: 'tabela', titulo: 'Capacidade potencial: colaboradores', modelo: modeloCap }
  ] } };
};
