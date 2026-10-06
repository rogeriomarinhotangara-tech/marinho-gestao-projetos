/* =========================================================================
   Parâmetros e Metas: parâmetros gerais, metas com vigência (e meta
   sugerida P75), meses (dias de operação, escopo, abrir/fechar).
   ========================================================================= */

ACOES['aba-parametros'] = p => { UI.params.aba = p.aba; const ult = UI.trilha[UI.trilha.length - 1]; if (ult.rota === 'parametros') ult.params.aba = p.aba; salvarPreferencias(); render(); };

function htmlParametrosGerais() {
  const p = P();
  const ed = podeEditar();
  const ro = ed ? {} : { readonly: true, disabled: true };
  return `<form class="form" id="form-param" novalidate style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">
    ${campo({ id: 'pg-min', rotulo: 'Mínimo de dias na função para entrar no ranking', tipo: 'number', valor: p.minimoDias, attrsExtra: { min: 1, max: 31, step: 1, ...ro }, ajuda: 'Evita que quem trabalhou 1 ou 2 dias distorça o ranking.' })}
    ${campo({ id: 'pg-pi', rotulo: 'Peso de ITENS (itens/dia) no índice, em %', tipo: 'number', valor: arred(p.pesoItens * 100, 2), attrsExtra: { min: 0, max: 100, step: 1, ...ro }, ajuda: 'Itens medem a complexidade (referências tocadas).' })}
    ${campo({ id: 'pg-pq', rotulo: 'Peso de QUANTIDADE (unid./dia) no índice, em %', tipo: 'number', valor: arred(p.pesoQuantidade * 100, 2), attrsExtra: { min: 0, max: 100, step: 1, ...ro }, ajuda: 'Unidades medem o volume físico. Os dois pesos somam 100%.' })}
    ${campo({ id: 'pg-tol', rotulo: 'Tolerância "Na meta", em % da meta', tipo: 'number', valor: arred(p.tolerancia * 100, 2), attrsExtra: { min: 0, max: 100, step: 1, ...ro }, ajuda: 'Abaixo disso, a situação é "Abaixo da meta".' })}
    ${campo({ id: 'pg-conc', rotulo: 'Alerta de concentração, em % dos itens', tipo: 'number', valor: arred(p.limiteConcentracao * 100, 2), attrsExtra: { min: 1, max: 100, step: 1, ...ro }, ajuda: 'Participação de uma pessoa no volume da função.' })}
    ${campo({ id: 'pg-queda', rotulo: 'Alerta de queda de índice, em %', tipo: 'number', valor: arred(p.limiteQueda * 100, 2), attrsExtra: { min: 1, max: 100, step: 1, ...ro }, ajuda: 'Queda relativa contra o mês anterior.' })}
    ${campo({ id: 'pg-med', rotulo: 'Alerta de login: itens/dia acima de N vezes a mediana', tipo: 'number', valor: p.fatorMediana, attrsExtra: { min: 1, max: 10, step: 0.1, ...ro } })}
    ${campo({ id: 'pg-nov', rotulo: 'Colaborador novo: primeiros N meses', tipo: 'number', valor: p.mesesNovato, attrsExtra: { min: 1, max: 12, step: 1, ...ro } })}
    ${campo({ id: 'pg-sem', rotulo: 'Revisar quem está sem movimento há N meses', tipo: 'number', valor: p.mesesSemMovimento, attrsExtra: { min: 1, max: 12, step: 1, ...ro } })}
    ${campo({ id: 'pg-p75', rotulo: 'Mínimo de dias para entrar no cálculo da meta (P75)', tipo: 'number', valor: p.minimoDiasMeta, attrsExtra: { min: 1, max: 31, step: 1, ...ro } })}
  </form>
  ${ed ? `<div class="linha" style="margin-top:14px">${botao('Salvar parâmetros', 'salvar-param', null, { classe: 'primario' })}<span class="muted" style="font-size:12.5px">Mudar pesos, mínimo ou tolerância recalcula índices e rankings de todos os meses.</span></div>` : ''}`;
}
function htmlRotasExternas() {
  const p = P();
  const ed = podeEditar();
  return `${p.inicioRotasConfirmado
    ? avisoHTML('ok', `Início das rotas externas no coletor confirmado: <b>${esc(fData(p.inicioRotasExternas))}</b>.`)
    : avisoHTML('atencao', `<b>Confirme a data de início das rotas externas no coletor.</b> Pelos dados, os colaboradores das rotas externas aparecem a partir de <b>${esc(fData(p.inicioRotasExternas))}</b> (Deoclécio, Emanuel e Paulo Rian começam em 22/09). Essa data define o escopo da coleta e a quebra de série.`)}
    <div class="form" style="margin-top:12px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">
      ${campo({ id: 'rt-data', rotulo: 'Início das rotas externas no coletor', tipo: 'date', valor: p.inicioRotasExternas || '', attrsExtra: ed ? {} : { readonly: true, disabled: true } })}
    </div>
    ${ed ? `<div class="linha" style="margin-top:12px">${botao(p.inicioRotasConfirmado ? 'Salvar data' : 'Confirmar data', 'confirmar-rotas', null, { classe: 'primario' })}<span class="muted" style="font-size:12.5px">Ao salvar, o escopo e a quebra de série dos meses afetados são atualizados.</span></div>` : ''}`;
}
function modeloMetas() {
  const linhas = [];
  for (const f of FUNCOES) {
    const ms = metasDaFuncao(f.id);
    const vig = metaVigente(f.id, UI.ym ?? Infinity);
    if (!ms.length) linhas.push({ f, m: null });
    ms.slice().reverse().forEach(m => linhas.push({ f, m, atual: vig && vig.id === m.id }));
  }
  return modeloSimples([
    { id: 'f', rotulo: 'Função', valor: l => l.f.nome, prim: true, html: l => `${funcTag(l.f.id)} ${l.atual ? '<span class="selo novo">vigente</span>' : ''}` },
    { id: 'vig', rotulo: 'Vigência a partir de', valor: l => l.m ? rotuloYM(l.m.ymVig) : 'sem meta' },
    { id: 'it', rotulo: 'Itens/dia', tipo: 'd1', valor: l => l.m ? l.m.itensDia : null },
    { id: 'un', rotulo: 'Unidades/dia', tipo: 'int', valor: l => l.m ? l.m.unidadesDia : null },
    { id: 'dc', rotulo: 'Documentos/dia', tipo: 'd1', valor: l => l.m ? l.m.documentosDia : null },
    { id: 'or', rotulo: 'Origem', valor: l => l.m ? l.m.origem || '' : '' },
    ...(podeEditar() ? [{ id: 'ac', rotulo: '', exportar: false, valor: () => '', html: l => l.m ? `<div class="acoes-linha">${botao('', 'editar-meta', { id: l.m.id }, { classe: 'peq fantasma', ic: 'editar', titulo: 'Editar meta', dica: 'Editar' })}${botao('', 'excluir-meta', { id: l.m.id }, { classe: 'peq fantasma perigo', ic: 'excluir', titulo: 'Excluir meta', dica: 'Excluir' })}</div>` : '' }] : [])
  ], linhas);
}
function modeloMeses() {
  const meses = mesesDisponiveis().slice().reverse();
  const ed = podeEditar();
  return modeloSimples([
    { id: 'mes', rotulo: 'Mês', valor: l => rotuloYM(l.ym), prim: true, html: l => `<b>${esc(rotuloYM(l.ym))}</b> ${l.situacao === 'fechado' ? `<span class="selo fechado">${icone('cadeado')}fechado</span>` : '<span class="selo">aberto</span>'}` },
    { id: 'dop', rotulo: 'Dias de operação', tipo: 'int', valor: l => l.diasOperacao, html: l => `${fInt(l.diasOperacao)}${l.diasOperacaoGravado != null && l.diasOperacaoGravado !== l.diasOperacaoCalculado ? ` <span class="selo revisar" data-dica="Calculado pelos dados: ${l.diasOperacaoCalculado}">ajustado</span>` : ''}` },
    { id: 'calc', rotulo: 'Calculado pelos dados', tipo: 'int', valor: l => l.diasOperacaoCalculado },
    { id: 'esc', rotulo: 'Escopo da coleta', valor: l => l.escopo },
    { id: 'qb', rotulo: 'Quebra de série', valor: l => l.quebraSerie ? 'sim' : 'não', html: l => l.quebraSerie ? '<span class="selo rotas">sim</span>' : '<span class="fraco">não</span>' },
    { id: 'obs', rotulo: 'Observação', valor: l => l.observacao || '', ocultoCel: true },
    ...(ed ? [{ id: 'ac', rotulo: '', exportar: false, valor: () => '', html: l => `<div class="acoes-linha">${botao('Editar', 'editar-mes', { ym: l.ym }, { classe: 'peq', ic: 'editar' })}${l.situacao === 'fechado' ? botao('Reabrir', 'abrir-mes', { ym: l.ym }, { classe: 'peq', ic: 'aberto' }) : botao('Fechar', 'fechar-mes', { ym: l.ym }, { classe: 'peq', ic: 'cadeado' })}</div>` }] : [])
  ], meses.map(infoMes), { vazio: 'Nenhum mês importado.' });
}
VIEWS.parametros = params => {
  const aba = ['gerais', 'metas', 'meses'].includes(params.aba) ? params.aba : 'gerais';
  const ed = podeEditar();
  let corpo = '';
  if (aba === 'gerais') {
    corpo = bloco({ titulo: 'Data de início das rotas externas', desc: 'A separação e a conferência das lojas Simão sempre foram no coletor; as rotas externas passaram para o coletor no fim de setembro/2026.', corpo: htmlRotasExternas() })
      + bloco({ titulo: 'Parâmetros de cálculo', desc: ed ? '' : 'Somente leitura.', corpo: htmlParametrosGerais() });
  } else if (aba === 'metas') {
    corpo = bloco({ titulo: 'Metas por função, com vigência', desc: 'Cada mês usa a meta vigente na época: mudar a meta não reescreve meses fechados. As metas atuais são o 3º quartil (P75) do próprio desempenho da equipe de janeiro a julho/2026, só com registros de 10 ou mais dias na função.',
      acoes: ed ? botao('Nova meta', 'editar-meta', null, { classe: 'primario', ic: 'mais' }) + botao('Calcular meta sugerida (P75)', 'p75', null, { ic: 'ranking' }) : '', corpo: tabelaHTML(modeloMetas()) });
  } else {
    corpo = bloco({ titulo: 'Meses', desc: 'Dias de operação (calculados na importação: dias distintos com movimento; podem ser ajustados), escopo da coleta e situação. Mês fechado bloqueia inclusão, edição, exclusão e importação até ser reaberto.', corpo: tabelaHTML(modeloMeses()) });
  }
  const html = `${cabecalhoTela('Parâmetros e Metas', ed ? 'Tudo aqui é editável e recalcula o painel na hora.' : 'Somente leitura: alterações são feitas por quem edita o painel.')}
    ${abasHTML([{ id: 'gerais', rotulo: 'Parâmetros gerais' }, { id: 'metas', rotulo: 'Metas' }, { id: 'meses', rotulo: 'Meses' }], aba, 'aba-parametros')}
    ${corpo}`;
  const p = P();
  const modeloParam = modeloSimples([{ id: 'k', rotulo: 'Parâmetro', valor: l => l[0] }, { id: 'v', rotulo: 'Valor', valor: l => l[1] }], [
    ['Mínimo de dias para ranking', String(p.minimoDias)], ['Peso de itens', fPct(p.pesoItens)], ['Peso de quantidade', fPct(p.pesoQuantidade)],
    ['Tolerância "Na meta"', fPct(p.tolerancia)], ['Alerta de concentração', fPct(p.limiteConcentracao)], ['Alerta de queda', fPct(p.limiteQueda)],
    ['Fator da mediana (login)', fD1(p.fatorMediana)], ['Início das rotas externas', `${fData(p.inicioRotasExternas)}${p.inicioRotasConfirmado ? ' (confirmado)' : ' (a confirmar)'}`]
  ]);
  return { html, exportar: { titulo: 'Parâmetros e Metas', subtitulo: '', secoes: [{ tipo: 'tabela', titulo: 'Parâmetros gerais', modelo: modeloParam }, { tipo: 'tabela', titulo: 'Metas', modelo: modeloMetas() }, { tipo: 'tabela', titulo: 'Meses', modelo: modeloMeses() }] } };
};
function docParametrosAtual() { return { ...PARAMETROS_PADRAO, ...(S.parametrosDoc ? docSimplesParaBanco(S.parametrosDoc) : {}) }; }
Object.assign(ACOES, {
  'salvar-param': async () => {
    const r = document.getElementById('form-param');
    if (!r) return;
    const num = id => numeroTexto(lerCampo(r, id));
    const v = { minimoDias: num('pg-min'), pesoItens: num('pg-pi'), pesoQuantidade: num('pg-pq'), tolerancia: num('pg-tol'), limiteConcentracao: num('pg-conc'), limiteQueda: num('pg-queda'), fatorMediana: num('pg-med'), mesesNovato: num('pg-nov'), mesesSemMovimento: num('pg-sem'), minimoDiasMeta: num('pg-p75') };
    const erros = [];
    if (!Number.isInteger(v.minimoDias) || v.minimoDias < 1) erros.push(['pg-min', 'Use um número inteiro de 1 a 31.']);
    if (!ok(v.pesoItens) || !ok(v.pesoQuantidade) || Math.abs(v.pesoItens + v.pesoQuantidade - 100) > 0.001) erros.push(['pg-pq', 'Os dois pesos precisam somar 100%.']);
    if (!ok(v.tolerancia) || v.tolerancia <= 0 || v.tolerancia > 100) erros.push(['pg-tol', 'Entre 1% e 100%.']);
    for (const k of ['pg-conc', 'pg-queda']) if (!ok(num(k)) || num(k) <= 0 || num(k) > 100) erros.push([k, 'Entre 1% e 100%.']);
    ['pg-min', 'pg-pi', 'pg-pq', 'pg-tol', 'pg-conc', 'pg-queda'].forEach(id => marcarErro(r, id, ''));
    if (erros.length) { erros.forEach(([id, m]) => marcarErro(r, id, m)); toast('Corrija os campos marcados.', 'erro'); return; }
    const antes = docParametrosAtual();
    const doc = { ...antes, minimoDias: v.minimoDias, pesoItens: v.pesoItens / 100, pesoQuantidade: v.pesoQuantidade / 100, tolerancia: v.tolerancia / 100, limiteConcentracao: v.limiteConcentracao / 100, limiteQueda: v.limiteQueda / 100, fatorMediana: v.fatorMediana || 2, mesesNovato: Math.round(v.mesesNovato || 3), mesesSemMovimento: Math.round(v.mesesSemMovimento || 2), minimoDiasMeta: Math.round(v.minimoDiasMeta || 10), atualizadoEm: agoraISO() };
    await gravarComHistorico([opGravar('parametros', 'geral', doc)], { tipo: 'edicao', colecao: 'parametros', alvo: 'geral', resumo: 'Parâmetros gerais alterados', antes, depois: doc }, 'Parâmetros salvos. Índices e rankings recalculados.');
  },
  'confirmar-rotas': async () => {
    const data = lerCampo(document, 'rt-data');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) { toast('Informe uma data válida.', 'erro'); return; }
    const antes = docParametrosAtual();
    const doc = { ...antes, inicioRotasExternas: data, inicioRotasConfirmado: true, atualizadoEm: agoraISO() };
    const yIni = ymDeChave(data.slice(0, 7));
    const ops = [opGravar('parametros', 'geral', doc)];
    for (const [k, m] of S.meses) {
      const y = ymDeChave(k);
      if (y == null) continue;
      const escopo = y < yIni ? 'Lojas Simão' : y === yIni ? `Lojas Simão + rotas externas a partir de ${dataCurta(data)}` : 'Lojas Simão + rotas externas';
      const quebra = y === yIni;
      if (m.escopoColeta !== escopo || !!m.quebraSerie !== quebra || (quebra && m.dataInicioRotasExternas !== data)) {
        ops.push(opGravar('meses', k, { ...docSimplesParaBanco(m), escopoColeta: escopo, quebraSerie: quebra, dataInicioRotasExternas: quebra ? data : null, atualizadoEm: agoraISO() }));
      }
    }
    await gravarComHistorico(ops, { tipo: 'edicao', colecao: 'parametros', alvo: 'geral', resumo: `Início das rotas externas confirmado: ${fData(data)}`, antes, depois: doc }, `Data confirmada: ${fData(data)}. Escopo e quebra de série atualizados.`);
  },
  'editar-meta': p => abrirFormMeta(p && p.id ? S.metas.get(p.id) : null),
  'excluir-meta': async p => {
    const m = S.metas.get(p.id);
    if (!m) return;
    const sim = await confirmar({ titulo: 'Excluir meta', texto: `<p>Excluir a meta de <b>${esc(FUNC[m.funcao]?.nome)}</b> vigente desde <b>${esc(rotuloYM(ymDeChave(m.vigenciaDesde)))}</b>? Os meses dessa vigência passam a usar a meta anterior (ou ficam sem meta).</p>`, rotuloOk: 'Excluir meta', perigo: true });
    if (!sim) return;
    await gravarComHistorico([opExcluir('metas', m.id)], { tipo: 'exclusao', colecao: 'metas', alvo: m.id, resumo: `Meta excluída: ${FUNC[m.funcao]?.nome} desde ${m.vigenciaDesde}`, antes: docSimplesParaBanco(m), depois: null }, 'Meta excluída.');
  },
  p75: () => abrirP75(),
  'editar-mes': p => abrirFormMes(p.ym),
  'fechar-mes': async p => alternarMes(p.ym, 'fechado'),
  'abrir-mes': async p => alternarMes(p.ym, 'aberto')
});
function abrirFormMeta(m) {
  if (!podeEditar()) return;
  const d = m ? { ...m } : { funcao: UI.funcaoModulo || 'separacao', vigenciaDesde: chaveYM(UI.ym ?? ymDe(new Date().getFullYear(), new Date().getMonth() + 1)), itensDia: '', unidadesDia: '', documentosDia: '', origem: 'Meta definida pela diretoria' };
  abrirModal({
    titulo: m ? 'Editar meta' : 'Nova meta (vigência)',
    corpo: `${avisoHTML('info', 'A meta vale a partir do mês de vigência. Meses anteriores continuam com a meta da época.')}
      <form class="form" novalidate>
        ${campo({ id: 'mt-f', rotulo: 'Função', valor: d.funcao, opcoes: FUNCOES.map(f => ({ valor: f.id, rotulo: f.nome })), attrsExtra: m ? { disabled: true } : {} })}
        ${campo({ id: 'mt-vig', rotulo: 'Vigência a partir de (mês)', tipo: 'month', valor: d.vigenciaDesde, attrsExtra: m ? { readonly: true } : {} })}
        ${campo({ id: 'mt-it', rotulo: 'Itens/dia', tipo: 'number', valor: d.itensDia, attrsExtra: { min: 0, step: 'any' } })}
        ${campo({ id: 'mt-un', rotulo: 'Unidades/dia', tipo: 'number', valor: d.unidadesDia, attrsExtra: { min: 0, step: 'any' } })}
        ${campo({ id: 'mt-dc', rotulo: 'Documentos/dia', tipo: 'number', valor: d.documentosDia, attrsExtra: { min: 0, step: 'any' } })}
        ${campo({ id: 'mt-or', rotulo: 'Origem da meta', valor: d.origem || '', full: true })}
      </form>`,
    botoes: [{ rotulo: 'Cancelar', classe: 'fantasma' }, { rotulo: 'Salvar meta', classe: 'primario', acao: async ctrl => {
      const r = ctrl.el;
      const funcao = m ? m.funcao : lerCampo(r, 'mt-f');
      const vig = m ? m.vigenciaDesde : lerCampo(r, 'mt-vig');
      const it = lerNumero(r, 'mt-it'), un = lerNumero(r, 'mt-un'), dc = lerNumero(r, 'mt-dc');
      let erro = false;
      if (!/^\d{4}-\d{2}$/.test(vig)) { marcarErro(r, 'mt-vig', 'Escolha o mês.'); erro = true; }
      if (!ok(it) || it <= 0) { marcarErro(r, 'mt-it', 'Informe um valor maior que zero.'); erro = true; } else marcarErro(r, 'mt-it', '');
      if (!ok(un) || un <= 0) { marcarErro(r, 'mt-un', 'Informe um valor maior que zero.'); erro = true; } else marcarErro(r, 'mt-un', '');
      if (erro) return false;
      const id = `${funcao}-${vig}`;
      const existente = S.metas.get(id);
      const doc = { funcao, vigenciaDesde: vig, itensDia: it, unidadesDia: un, documentosDia: ok(dc) ? dc : null, origem: lerCampo(r, 'mt-or').trim(), criadoEm: existente ? existente.criadoEm || agoraISO() : agoraISO(), atualizadoEm: agoraISO() };
      ctrl.ocupado(true);
      const okG = await gravarComHistorico([opGravar('metas', id, doc)], { tipo: existente ? 'edicao' : 'inclusao', colecao: 'metas', alvo: id, resumo: `Meta ${existente ? 'alterada' : 'incluída'}: ${FUNC[funcao].nome} desde ${vig}`, antes: existente ? docSimplesParaBanco(existente) : null, depois: doc }, 'Meta salva. Índices recalculados a partir da vigência.');
      ctrl.ocupado(false);
      return okG;
    } }]
  });
}
function abrirP75() {
  const meses = mesesComDados();
  if (!meses.length) { toast('Sem dados para calcular.', 'erro'); return; }
  const op = meses.map(y => ({ valor: y, rotulo: rotuloYM(y) }));
  const ini0 = meses.find(y => anoDe(y) === anoDe(meses[meses.length - 1])) ?? meses[0];
  abrirModal({
    titulo: 'Calcular meta sugerida (P75)', largo: true,
    corpo: `<p class="muted">O 3º quartil (P75) é o patamar que os 25% melhores registros da própria equipe já entregam. Só entram lançamentos com o mínimo de dias escolhido. Nada é gravado sem a sua confirmação.</p>
      <div class="form" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">
        ${campo({ id: 'p75-ini', rotulo: 'De', valor: ini0, opcoes: op })}
        ${campo({ id: 'p75-fim', rotulo: 'Até', valor: meses[meses.length - 1], opcoes: op })}
        ${campo({ id: 'p75-min', rotulo: 'Mínimo de dias na função', tipo: 'number', valor: P().minimoDiasMeta || 10, attrsExtra: { min: 1, max: 31, step: 1 } })}
        ${campo({ id: 'p75-vig', rotulo: 'Gravar com vigência a partir de', tipo: 'month', valor: chaveYM((meses[meses.length - 1]) + 1) })}
      </div>
      <div class="linha">${'<button type="button" class="btn" id="p75-calc">' + icone('ranking') + '<span>Calcular</span></button>'}</div>
      <div id="p75-res"></div>`,
    aoMontar: raiz => {
      const calc = () => {
        const ini = Number(lerCampo(raiz, 'p75-ini')), fim = Number(lerCampo(raiz, 'p75-fim')), min = Math.round(numeroTexto(lerCampo(raiz, 'p75-min')) || 10);
        if (ini > fim) { $('#p75-res', raiz).innerHTML = avisoHTML('erro', 'O início precisa ser anterior ao fim.'); return; }
        const sug = sugerirMetas(ini, fim, min);
        $('#p75-res', raiz).innerHTML = `<div class="tabela-wrap"><table class="tbl"><thead><tr><th>Função</th><th class="n">Registros</th><th class="n">P75 itens/dia</th><th class="n">P75 unid./dia</th><th class="n">P75 docs/dia</th><th>Gravar itens/dia</th><th>Gravar unid./dia</th><th>Gravar docs/dia</th></tr></thead><tbody>${sug.map(s => {
          const m = metaVigente(s.funcao, fim);
          return `<tr><td>${funcTag(s.funcao)}<div class="muted" style="font-size:11.5px">atual: ${m ? `${fD1(m.itensDia)} · ${fInt(m.unidadesDia)} · ${fD1(m.documentosDia)}` : 'sem meta'}</div></td><td class="n">${s.n}</td><td class="n">${fD2(s.itensDia)}</td><td class="n">${fD1(s.unidadesDia)}</td><td class="n">${fD2(s.documentosDia)}</td>
            <td><input class="inp" type="number" step="any" data-p75="${s.funcao}|itensDia" value="${ok(s.itensDia) ? Math.round(s.itensDia) : ''}" style="max-width:110px"></td>
            <td><input class="inp" type="number" step="any" data-p75="${s.funcao}|unidadesDia" value="${ok(s.unidadesDia) ? Math.round(s.unidadesDia / 100) * 100 : ''}" style="max-width:120px"></td>
            <td><input class="inp" type="number" step="any" data-p75="${s.funcao}|documentosDia" value="${ok(s.documentosDia) ? arred(s.documentosDia, 1) : ''}" style="max-width:100px"></td></tr>`;
        }).join('')}</tbody></table></div><p class="nota-tabela">Período: ${esc(rotuloPeriodo(ini, fim))} · lançamentos com ${min}+ dias. Os campos "Gravar" vêm arredondados e podem ser ajustados antes de confirmar.</p>`;
        raiz.dataset.p75 = JSON.stringify({ ini, fim, min });
      };
      $('#p75-calc', raiz).addEventListener('click', calc);
      calc();
    },
    botoes: [{ rotulo: 'Fechar sem gravar', classe: 'fantasma' }, { rotulo: 'Confirmar e gravar metas', classe: 'primario', acao: async ctrl => {
      if (!podeEditar()) return false;
      const raiz = ctrl.el;
      const vig = lerCampo(raiz, 'p75-vig');
      if (!/^\d{4}-\d{2}$/.test(vig)) { marcarErro(raiz, 'p75-vig', 'Escolha o mês de vigência.'); return false; }
      const info = JSON.parse(raiz.dataset.p75 || '{}');
      const vals = {};
      $$('[data-p75]', raiz).forEach(inp => { const [f, k] = inp.dataset.p75.split('|'); vals[f] = vals[f] || {}; vals[f][k] = numeroTexto(inp.value); });
      const ops = [];
      for (const f of FUNCOES) {
        const v = vals[f.id];
        if (!v || !ok(v.itensDia) || !ok(v.unidadesDia) || v.itensDia <= 0 || v.unidadesDia <= 0) continue;
        ops.push(opGravar('metas', `${f.id}-${vig}`, { funcao: f.id, vigenciaDesde: vig, itensDia: v.itensDia, unidadesDia: v.unidadesDia, documentosDia: ok(v.documentosDia) ? v.documentosDia : null, origem: `P75 de ${rotuloPeriodo(info.ini, info.fim)} (registros com ${info.min}+ dias na função), confirmado em ${fData(hojeISO())}`, criadoEm: agoraISO(), atualizadoEm: agoraISO() }));
      }
      if (!ops.length) { toast('Nenhuma meta válida para gravar.', 'erro'); return false; }
      const sim = await confirmar({ titulo: 'Gravar metas sugeridas', texto: `<p>Gravar ${ops.length} ${ops.length === 1 ? 'meta' : 'metas'} com vigência a partir de <b>${esc(rotuloYM(ymDeChave(vig)))}</b>? Meses anteriores continuam com a meta da época.</p>`, rotuloOk: 'Gravar metas' });
      if (!sim) return false;
      return gravarComHistorico(ops, { tipo: 'inclusao', colecao: 'metas', alvos: ops.map(o => o.id), resumo: `Metas P75 gravadas com vigência ${vig}`, antes: null, depois: Object.fromEntries(ops.map(o => [o.id, o.dados])), mapa: true }, 'Metas gravadas.');
    } }]
  });
}
function abrirFormMes(ym) {
  if (!podeEditar()) return;
  const im = infoMes(ym);
  abrirModal({
    titulo: `Mês: ${rotuloYM(ym)}`,
    corpo: `<form class="form" novalidate>
      ${campo({ id: 'ms-dop', rotulo: 'Dias de operação', tipo: 'number', valor: im.diasOperacao ?? '', attrsExtra: { min: 1, max: 31, step: 1 }, ajuda: `Calculado pelos dados: ${im.diasOperacaoCalculado} dias distintos com movimento.` })}
      ${campo({ id: 'ms-esc', rotulo: 'Escopo da coleta', valor: im.escopo, full: true })}
      ${campo({ id: 'ms-ini', rotulo: 'Início das rotas externas neste mês (se houver)', tipo: 'date', valor: im.dataInicioRotasExternas || '' })}
      <div class="campo"><label class="check"><input type="checkbox" id="ms-qb"${im.quebraSerie ? ' checked' : ''}> Marcar quebra de série neste mês</label></div>
      ${campo({ id: 'ms-obs', rotulo: 'Observação', tipo: 'textarea', valor: im.observacao, full: true })}
    </form>`,
    botoes: [{ rotulo: 'Cancelar', classe: 'fantasma' }, { rotulo: 'Salvar mês', classe: 'primario', acao: async ctrl => {
      const r = ctrl.el;
      const dop = lerNumero(r, 'ms-dop');
      if (!Number.isInteger(dop) || dop < 1 || dop > 31) { marcarErro(r, 'ms-dop', 'Entre 1 e 31.'); return false; }
      const antes = docMes(ym) ? docSimplesParaBanco(docMes(ym)) : null;
      const doc = { ...(antes || {}), ano: anoDe(ym), mes: mesDe(ym), diasOperacao: dop, diasOperacaoCalculado: im.diasOperacaoCalculado, escopoColeta: lerCampo(r, 'ms-esc').trim() || escopoPadrao(ym), dataInicioRotasExternas: lerCampo(r, 'ms-ini') || null, quebraSerie: $('#ms-qb', r).checked, situacao: im.situacao, observacao: lerCampo(r, 'ms-obs').trim(), atualizadoEm: agoraISO() };
      ctrl.ocupado(true);
      const okG = await gravarComHistorico([opGravar('meses', chaveYM(ym), doc)], { tipo: 'edicao', colecao: 'meses', alvo: chaveYM(ym), resumo: `Mês ${rotuloYM(ym)} atualizado`, antes, depois: doc }, 'Mês atualizado.');
      ctrl.ocupado(false);
      return okG;
    } }]
  });
}
async function alternarMes(ym, situacao) {
  const im = infoMes(ym);
  if (situacao === 'fechado') {
    const aud = auditoria(anoDe(ym));
    const difs = aud.amarracao.some(a => Math.abs(a.dif.dias) + Math.abs(a.dif.itens) + Math.abs(a.dif.unidades) > 0.5);
    const sim = await confirmar({ titulo: `Fechar ${rotuloYM(ym)}`, texto: `<p>Mês fechado bloqueia inclusão, edição, exclusão e importação até ser reaberto.</p>${difs ? avisoHTML('erro', 'A auditoria do ano tem diferença diferente de zero. Confira antes de fechar.') : avisoHTML('ok', 'Auditoria do ano com diferença zero.')}<p class="muted">Depois de fechar, gere o Relatório Executivo em Relatórios e Exportação.</p>`, rotuloOk: 'Fechar mês' });
    if (!sim) return;
  }
  const antes = docMes(ym) ? docSimplesParaBanco(docMes(ym)) : null;
  const doc = { ...(antes || { ano: anoDe(ym), mes: mesDe(ym), diasOperacao: im.diasOperacao, diasOperacaoCalculado: im.diasOperacaoCalculado, escopoColeta: im.escopo, quebraSerie: im.quebraSerie, observacao: '' }), situacao, ...(situacao === 'fechado' ? { fechadoEm: agoraISO() } : { reabertoEm: agoraISO() }), atualizadoEm: agoraISO() };
  await gravarComHistorico([opGravar('meses', chaveYM(ym), doc)], { tipo: 'edicao', colecao: 'meses', alvo: chaveYM(ym), resumo: `${rotuloYM(ym)} ${situacao === 'fechado' ? 'fechado' : 'reaberto'}`, antes, depois: doc }, `${rotuloYM(ym)} ${situacao === 'fechado' ? 'fechado' : 'reaberto'}.`);
}
