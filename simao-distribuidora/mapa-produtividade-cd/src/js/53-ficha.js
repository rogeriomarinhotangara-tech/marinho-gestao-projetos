/* =========================================================================
   Ficha do Colaborador: busca, cartões do mês e do acumulado, evolução com
   meta, colocação mês a mês, calendário de dias, multifunção e avisos.
   ========================================================================= */

function situacaoColabHTML(c) {
  if (!c) return '<span class="selo revisar">sem cadastro</span>';
  if (c.status === 'desligado') return `<span class="selo">desligado${c.dataDesligamento ? ` em ${esc(fData(c.dataDesligamento))}` : ''}</span>`;
  return '<span class="selo novo">ativo</span>';
}
function buscarColaboradores(termo) {
  const t = norm(termo);
  const cods = todosCodigos();
  const lista = cods.map(codigo => ({ codigo, nome: nomeExib(codigo), completo: nomeCompleto(codigo), principal: funcaoPrincipalDe(codigo), ultima: ultimaAtividade(codigo), desligado: estaDesligado(codigo) }));
  if (!t) return lista;
  return lista.filter(c => norm(c.codigo).startsWith(t) || norm(c.completo).includes(t) || norm(c.nome).includes(t));
}
function itemColabHTML(c) {
  return `<button type="button" class="cartao-colab"${dataAcao('ficha', { codigo: c.codigo })}>
    <span class="av" style="background:${corAvatar(c.codigo)}">${esc(iniciais(c.completo))}</span>
    <span style="min-width:0"><span class="nm" style="display:block">${esc(c.nome)}</span><span class="sb">${esc(c.codigo)} · ${c.principal ? esc(FUNC[c.principal].nome) : 'sem função'}${c.ultima != null ? ` · último: ${esc(rotuloYMCurto(c.ultima))}` : ''}${c.desligado ? ' · desligado' : ''}</span></span>
  </button>`;
}
function atualizarSugestoes(input) {
  const caixa = document.getElementById('sugestoes-ficha');
  if (!caixa) return;
  const t = input.value.trim();
  UI.buscaFicha = t;
  if (!t) { caixa.hidden = true; caixa.innerHTML = ''; return; }
  const r = buscarColaboradores(t).slice(0, 8);
  caixa.innerHTML = r.length ? r.map((c, i) => `<button type="button"${i === 0 ? ' class="ativo"' : ''}${dataAcao('ficha', { codigo: c.codigo })}><span class="av" style="background:${corAvatar(c.codigo)};width:26px;height:26px;border-radius:8px;display:grid;place-items:center;color:#fff;font-size:11px;font-weight:700">${esc(iniciais(c.completo))}</span><span><b>${esc(c.nome)}</b> <span class="muted">· ${esc(c.codigo)} · ${esc(c.completo)}</span></span></button>`).join('') : '<div class="vazio-tabela">Ninguém encontrado com esse nome ou código.</div>';
  caixa.hidden = false;
}
function caixaBusca() {
  return `<div class="busca">${icone('busca')}<input class="inp" id="busca-ficha" type="search" autocomplete="off" placeholder="Buscar por nome ou código" aria-label="Buscar colaborador" value="${esc(UI.buscaFicha || '')}"><div class="sugestoes" id="sugestoes-ficha" hidden></div></div>`;
}

function htmlCalendario(codigo, ym) {
  const ano = anoDe(ym), mes = mesDe(ym);
  const pr = presenca(ym, codigo);
  const opDias = new Set(); for (const l of lancamentosPeriodo(ym, ym)) l.diasLista.forEach(d => opDias.add(d));
  const primeiro = new Date(ano, mes - 1, 1).getDay();
  const total = diasNoMes(ano, mes);
  let html = DIAS_SEMANA.map(d => `<div class="dsem">${d}</div>`).join('');
  for (let i = 0; i < primeiro; i++) html += '<div class="dia vazio"></div>';
  for (let d = 1; d <= total; d++) {
    const fs = FUNCOES.filter(f => (pr.porFuncao[f.id] || []).includes(d));
    const trabalhou = fs.length > 0;
    const dica = trabalhou ? `${d}/${String(mes).padStart(2, '0')}: ${fs.map(f => f.nome).join(' + ')}` : (opDias.has(d) ? `${d}/${String(mes).padStart(2, '0')}: CD operou, sem registro deste colaborador` : `${d}/${String(mes).padStart(2, '0')}: sem movimento no CD`);
    html += `<div class="dia${trabalhou ? ' trabalhou' : ''}${opDias.has(d) ? '' : ' fora'}" data-dica="${esc(dica)}"><span class="n">${d}</span><span class="marcas">${fs.map(f => `<i style="background:var(${f.cor})"></i>`).join('')}</span></div>`;
  }
  return `<div class="calendario" role="img" aria-label="${esc(`Dias trabalhados em ${rotuloYM(ym)}: ${pr.presenca} dias de presença`)}">${html}</div>
    <div class="legenda" style="margin-top:10px">${FUNCOES.filter(f => pr.porFuncao[f.id]).map(f => `<span class="it"><span class="sw" style="background:var(${f.cor})"></span>${esc(f.nome)} (${pr.porFuncao[f.id].length} dias)</span>`).join('')}<span class="it"><span class="sw" style="border:1px dashed var(--border-strong)"></span>dia sem movimento no CD</span></div>
    <p class="nota-tabela">Presença: <b>${pr.presenca}</b> dias · dias-função: <b>${pr.diasFuncao}</b>${pr.fatiamento != null ? ` · índice de fatiamento: <b>${fD2(pr.fatiamento)}</b>` : ''}${pr.diasOperacao ? ` · dias de operação do CD: ${pr.diasOperacao}` : ''}</p>`;
}
function cartoesFicha(codigo, ini, fim, rotulo) {
  const cards = [];
  for (const f of FUNCOES) {
    const r = linhasFuncao(ini, fim, f.id).find(x => x.codigo === codigo);
    if (!r) continue;
    const pos = ranking(ini, fim, f.id, UI.leitura).pos.get(codigo);
    const posTxt = pos ? `${pos}º de ${ranking(ini, fim, f.id, UI.leitura).eleg.length}` : (UI.leitura === 'principal' && r.apoio ? 'apoio' : 'fora do ranking');
    const mov = pos ? movimento(ini, fim, f.id, UI.leitura, codigo, ini === fim ? 'mensal' : 'acumulado') : null;
    cards.push(`<div class="bloco" style="padding:14px">
      <div class="linha" style="justify-content:space-between;margin-bottom:8px">${funcTag(f.id)}<span class="muted" style="font-size:12px">${esc(rotulo)}</span></div>
      <div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">
        ${kpiHTML({ rotulo: 'Índice', valor: r.ind.indice, formato: 'pct', detalhe: pillSituacao(r.ind.situacao) })}
        ${kpiHTML({ rotulo: 'Itens/dia', valor: r.ind.itensDia, formato: 'd1', detalhe: `meta ${fD1(r.ind.metaItens)} · ${fPct(r.ind.pctItens)}` })}
        ${kpiHTML({ rotulo: 'Unid./dia', valor: r.ind.unidDia, detalhe: `meta ${fInt(r.ind.metaUnid)} · ${fPct(r.ind.pctUnid)}` })}
        ${kpiHTML({ rotulo: 'Posição', valorHTML: esc(posTxt), detalhe: pos ? movHTML(mov) : (r.ind.motivo ? esc(r.ind.motivo) : '') })}
        ${kpiHTML({ rotulo: 'Dias / itens', valorHTML: `${fInt(r.ag.dias)} <small>dias</small>`, detalhe: `${fInt(r.ag.skus)} itens · ${fInt(r.ag.unidades)} unid. · ${fInt(r.ag.documentos)} ${f.id === 'recebimento' ? 'NF' : 'pedidos'}` })}
      </div></div>`);
  }
  return cards.length ? cards.join('') : `<p class="muted">Sem lançamentos em ${esc(rotulo.toLowerCase())}.</p>`;
}
function specFichaFuncao(codigo, fId, meses) {
  return specEvolucao({
    meses,
    series: [
      { funcao: fId, rotulo: 'Itens/dia', dados: meses.map(y => { const r = linhasFuncao(y, y, fId).find(x => x.codigo === codigo); return r ? r.ind.itensDia : null; }) },
      { rotulo: 'Meta', dados: meses.map(y => metaVigente(fId, y)?.itensDia ?? null), cor: pal => pal.texto, tracejada: true, degrau: true }
    ],
    formato: 'd1',
    metas: y => { const r = linhasFuncao(y, y, fId).find(x => x.codigo === codigo); return r ? [`Dias: ${r.ag.dias} · índice ${r.ind.indice != null ? fPct(r.ind.indice) : TRACO}`] : []; },
    aoClicar: (s, y) => navegar('ficha', { codigo, ym: y, f: fId }, 'detalhe')
  });
}
function modeloPosicoesColab(codigo, meses) {
  const fs = FUNCOES.filter(f => meses.some(y => linhasFuncao(y, y, f.id).some(r => r.codigo === codigo)));
  const cel = (f, y) => {
    const r = linhasFuncao(y, y, f.id).find(x => x.codigo === codigo);
    if (!r) return '';
    const pos = ranking(y, y, f.id, UI.leitura).pos.get(codigo);
    if (pos) return `${pos}º/${ranking(y, y, f.id, UI.leitura).eleg.length}`;
    if (UI.leitura === 'principal' && r.apoio) return 'apoio';
    return `${r.ag.dias}d`;
  };
  return modeloSimples([
    { id: 'f', rotulo: 'Função', valor: l => l.f.nome, html: l => funcTag(l.f.id) },
    ...meses.map(y => ({ id: 'm' + y, rotulo: rotuloYMCurto(y), valor: l => cel(l.f, y) }))
  ], fs.map(f => ({ f })), { cartoes: false, nota: '"Nº/total": posição entre os elegíveis do mês. "apoio": função principal diferente. "Nd": N dias, abaixo do mínimo para ranking.' });
}
function modeloMultiColab(codigo, meses) {
  return modeloSimples([
    { id: 'mes', rotulo: 'Mês', valor: l => rotuloYM(l.ym) },
    { id: 'fn', rotulo: 'Funções', valor: l => l.funcoes.map(f => FUNC[f].nome).join(' + '), html: l => l.funcoes.map(f => funcTag(f, true)).join(' ') },
    { id: 'pr', rotulo: 'Presença', tipo: 'int', valor: l => l.presenca },
    { id: 'df', rotulo: 'Dias-função', tipo: 'int', valor: l => l.diasFuncao },
    { id: 'fat', rotulo: 'Fatiamento', tipo: 'd2', valor: l => l.fatiamento, html: l => l.fatiamento > 1 + EPS ? `<b style="color:var(--warn-ink)">${fD2(l.fatiamento)}</b>` : fD2(l.fatiamento) },
    { id: 'al', rotulo: 'Alocação', tipo: 'pct', valor: l => l.alocacao }
  ], meses.map(y => presenca(y, codigo)).filter(m => m.lancs.length), { cartoes: true });
}
function modeloLancamentosColab(codigo, ano) {
  const ls = lancamentosDoColab(codigo).filter(l => anoDe(l.ym) === ano).slice().reverse();
  return modeloSimples([
    { id: 'mes', rotulo: 'Mês', valor: l => rotuloYM(l.ym), prim: true, html: l => `<b>${esc(rotuloYM(l.ym))}</b> ${l.suspeito ? '<span class="selo suspeito">suspeito</span>' : ''}` },
    { id: 'f', rotulo: 'Função', valor: l => FUNC[l.funcao]?.nome, html: l => funcTag(l.funcao) },
    { id: 'dias', rotulo: 'Dias', tipo: 'int', valor: l => l.diasFuncao },
    { id: 'docs', rotulo: 'Pedidos/NF', tipo: 'int', valor: l => l.documentos },
    { id: 'itens', rotulo: 'Itens', tipo: 'int', valor: l => l.skus },
    { id: 'unid', rotulo: 'Unidades', tipo: 'dx', valor: l => l.unidades },
    { id: 'itd', rotulo: 'Itens/dia', tipo: 'd1', valor: l => div(l.skus, l.diasFuncao) },
    { id: 'or', rotulo: 'Origem', valor: l => l.origem || '', ocultoCel: true }
  ], ls, { linhaAttrs: l => ({ acao: 'ir', params: { rota: 'lancamento', params: { id: l.id } } }) });
}
function avisosFicha(codigo, ym) {
  const av = [];
  const c = colab(codigo);
  if (c && c.rotasExternas) av.push(avisoHTML('atencao', '<b>Produção parcialmente registrada até set/2026.</b> A separação e a conferência das rotas externas eram manuais e passaram para o coletor no fim de setembro/2026. Antes disso, a produção deste colaborador nas rotas externas não aparece no coletor: compare os meses anteriores com cautela.'));
  if (!c) av.push(avisoHTML('atencao', `Código ${esc(codigo)} sem cadastro de colaborador. Cadastre em Colaboradores para definir a função principal.`));
  if (c && c.revisar) av.push(avisoHTML('info', `<b>Cadastro a revisar:</b> ${esc(semPonto(c.motivoRevisao || 'confirmar função principal'))}.`));
  if (estaDesligado(codigo)) av.push(avisoHTML('info', `Colaborador desligado${c && c.dataDesligamento ? ` em ${esc(fData(c.dataDesligamento))}` : ''}. O histórico dos meses trabalhados continua valendo.`));
  const pr = presenca(ym, codigo);
  if (pr.lancs.length) {
    const principal = funcaoPrincipalDe(codigo);
    const apoio = pr.funcoes.filter(f => f !== principal);
    if (apoio.length) av.push(avisoHTML('info', `Em ${esc(rotuloYM(ym).toLowerCase())} atuou como <b>apoio</b> em ${esc(apoio.map(f => FUNC[f].nome).join(' e '))} (função principal: ${esc(FUNC[principal]?.nome || 'não definida')}).`));
    const insuf = pr.lancs.filter(l => l.diasFuncao < P().minimoDias);
    if (insuf.length) av.push(avisoHTML('info', `<b>Dias insuficientes</b> para o ranking em ${esc(insuf.map(l => `${FUNC[l.funcao].nome} (${l.diasFuncao} ${l.diasFuncao === 1 ? 'dia' : 'dias'})`).join(', '))}: mínimo de ${P().minimoDias} dias.`));
    if (pr.diasFuncao > pr.presenca) av.push(avisoHTML('atencao', `<b>Dia dividido entre funções:</b> ${pr.diasFuncao} dias-função em ${pr.presenca} dias de presença (fatiamento ${fD2(pr.fatiamento)}). A produtividade por dia em cada função está subestimada.`));
    if (pr.lancs.some(l => l.suspeito)) av.push(avisoHTML('erro', '<b>Lançamento suspeito neste mês</b> (possível duplicidade). Veja em Auditoria.'));
    if (infoMes(ym).quebraSerie) av.push(avisoHTML('atencao', `Mês com quebra de série: ${esc(infoMes(ym).escopo)}.`));
  }
  return av.join('');
}

VIEWS.ficha = params => {
  const codigo = params.codigo ? String(params.codigo) : null;
  if (!codigo) {
    const lista = buscarColaboradores('');
    const recentes = lista.filter(c => !c.desligado && c.ultima != null).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const outros = lista.filter(c => c.desligado || c.ultima == null).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const porFuncao = FUNCOES.map(f => {
      const ls = recentes.filter(c => c.principal === f.id);
      return ls.length ? `<h4 style="margin:14px 0 8px">${funcTag(f.id)} <span class="muted" style="font-weight:400">(${ls.length})</span></h4><div class="grade-colab">${ls.map(itemColabHTML).join('')}</div>` : '';
    }).join('');
    return { html: `${cabecalhoTela('Ficha do Colaborador', 'Busque por nome ou código para abrir a ficha completa, com evolução, colocação, calendário e avisos.')}
      ${caixaBusca()}
      ${bloco({ titulo: 'Colaboradores por função principal', corpo: porFuncao + (outros.length ? `<h4 style="margin:18px 0 8px">Desligados ou sem lançamento</h4><div class="grade-colab">${outros.map(itemColabHTML).join('')}</div>` : '') })}` };
  }
  const ym = UI.ym;
  const ano = anoDe(ym);
  const c = colab(codigo);
  const principal = funcaoPrincipalDe(codigo);
  const meses = mesesDoAnoAte(ym);
  const fsAno = FUNCOES.filter(f => meses.some(y => linhasFuncao(y, y, f.id).some(r => r.codigo === codigo)));
  const acum = periodoAcumuladoUI();
  const planos = [...S.planoAcao.values()].filter(pl => String(pl.codigo) === codigo).sort((a, b) => String(b.criadoEm || '').localeCompare(String(a.criadoEm || '')));
  const specs = fsAno.map(f => ({ f, spec: specFichaFuncao(codigo, f.id, meses) }));
  const mPos = modeloPosicoesColab(codigo, meses);
  const mMulti = modeloMultiColab(codigo, meses);
  const mLanc = modeloLancamentosColab(codigo, ano);
  const html = `
    <div class="cab-tela">
      <div class="ficha-cab">
        <span class="avatar" style="background:${corAvatar(codigo)}">${esc(iniciais(nomeCompleto(codigo)))}</span>
        <div class="info">
          <h1>${esc(nomeExib(codigo))}</h1>
          <div class="linha"><span class="muted">${esc(nomeCompleto(codigo))} · código ${esc(codigo)}</span></div>
          <div class="linha">${principal ? `Função principal: ${funcTag(principal)}` : '<span class="muted">Sem função principal</span>'} ${situacaoColabHTML(c)} ${c && c.rotasExternas ? '<span class="selo rotas">rotas externas</span>' : ''} ${ehNovato(codigo, ym) ? '<span class="selo novo">novo</span>' : ''}</div>
        </div>
      </div>
      <div class="dir">${caixaBusca()}${podeBaixar() ? `<button type="button" class="btn primario"${dataAcao('exportar-ficha', { codigo })}>${icone('pdf')}<span>Exportar ficha em PDF</span></button>` : ''}</div>
    </div>
    ${avisosFicha(codigo, ym)}
    <h2 style="font-size:17px">${esc(rotuloYM(ym))}</h2>
    <div class="grade-auto">${cartoesFicha(codigo, ym, ym, rotuloYM(ym))}</div>
    <h2 style="font-size:17px">Acumulado ${esc(rotuloPeriodo(acum.ini, acum.fim))}</h2>
    <div class="grade-auto">${cartoesFicha(codigo, acum.ini, acum.fim, rotuloPeriodo(acum.ini, acum.fim))}</div>
    ${specs.length ? bloco({ titulo: 'Evolução mensal por função contra a meta', desc: 'Itens/dia de cada mês; linha tracejada: meta vigente. Clique num ponto para abrir o mês.', corpo: `<div class="grade-${Math.min(specs.length, 3) === 1 ? 'auto' : '2'}">${specs.map(s => `<div><h4 style="margin-bottom:6px">${funcTag(s.f.id)}</h4>${graficoHTML(s.spec, { altura: 220, rotulo: `Evolução de itens por dia em ${s.f.nome}` })}</div>`).join('')}</div><div class="legenda" style="margin-top:8px"><span class="it"><span class="ln trac" style="border-color:var(--text)"></span>Meta de itens/dia</span>${quebrasNoIntervalo(meses[0] ?? ym, ym).length ? LEGENDA_QUEBRA : ''}</div>` }) : ''}
    ${bloco({ titulo: 'Colocação mês a mês', desc: `Leitura: ${esc(rotuloLeitura().toLowerCase())}.`, corpo: tabelaHTML(mPos) })}
    <div class="grade-2">
      ${bloco({ titulo: `Calendário de ${esc(rotuloYM(ym).toLowerCase())}`, desc: 'Dias trabalhados em cada função, pela lista de dias do coletor.', corpo: htmlCalendario(codigo, ym) })}
      ${bloco({ titulo: 'Multifunção mês a mês', desc: 'Presença = dias distintos no CD; dias-função = soma dos dias de cada função. Fatiamento acima de 1: dia dividido entre funções.', corpo: tabelaHTML(mMulti) })}
    </div>
    ${bloco({ titulo: 'Planos de ação ligados', corpo: planos.length ? `<div class="lista-alertas">${planos.map(pl => cartaoAcaoHTML(pl)).join('')}</div>` : `<p class="muted">Nenhuma ação registrada para este colaborador.${podeEditar() ? ' ' : ''}</p>${podeEditar() ? botao('Criar ação', 'nova-acao', { codigo, funcao: principal, mesOrigem: chaveYM(ym) }, { classe: 'peq', ic: 'mais' }) : ''}` })}
    ${bloco({ titulo: `Lançamentos de ${ano}`, desc: 'Clique para ver o lançamento completo e o histórico de alterações.', corpo: tabelaHTML(mLanc) })}
  `;
  const exportar = {
    titulo: `Ficha: ${nomeExib(codigo)} (${codigo})`, subtitulo: `${rotuloYM(ym)} · leitura: ${rotuloLeitura().toLowerCase()}`,
    secoes: [
      { tipo: 'texto', titulo: 'Avisos', paragrafos: [textoPuro(avisosFicha(codigo, ym)) || 'Sem avisos.'] },
      { tipo: 'tabela', titulo: `Indicadores de ${rotuloYM(ym)}`, modelo: modeloIndicadoresColab(codigo, ym, ym) },
      { tipo: 'tabela', titulo: `Acumulado ${rotuloPeriodo(acum.ini, acum.fim)}`, modelo: modeloIndicadoresColab(codigo, acum.ini, acum.fim) },
      ...specs.map(s => ({ tipo: 'grafico', titulo: `Evolução de itens/dia: ${s.f.nome}`, specFn: s.spec, altura: 240 })),
      { tipo: 'tabela', titulo: 'Colocação mês a mês', modelo: mPos },
      { tipo: 'tabela', titulo: 'Multifunção mês a mês', modelo: mMulti },
      { tipo: 'tabela', titulo: `Lançamentos de ${ano}`, modelo: mLanc }
    ]
  };
  return { html, exportar };
};
function modeloIndicadoresColab(codigo, ini, fim) {
  const linhas = FUNCOES.map(f => linhasFuncao(ini, fim, f.id).find(x => x.codigo === codigo)).filter(Boolean)
    .map(r => ({ ...r, _pos: ranking(ini, fim, r.funcao, UI.leitura).pos.get(codigo), _n: ranking(ini, fim, r.funcao, UI.leitura).eleg.length }));
  return modeloSimples([
    { id: 'f', rotulo: 'Função', valor: l => FUNC[l.funcao].nome, html: l => funcTag(l.funcao) },
    { id: 'pos', rotulo: 'Posição', valor: l => l._pos ? `${l._pos}º de ${l._n}` : (l.apoio && UI.leitura === 'principal' ? 'apoio' : 'fora do ranking') },
    ...colunasIndicadores({ funcao: null, completa: true })
  ], linhas);
}
ACOES['exportar-ficha'] = p => exportarFichaPDF(p.codigo);
