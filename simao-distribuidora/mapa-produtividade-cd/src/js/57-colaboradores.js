/* =========================================================================
   Colaboradores: cadastro (incluir, editar, ativo/desligado, excluir só sem
   lançamento), função principal, observação e lista de revisão.
   ========================================================================= */

UI.filtrosColab = { situacao: '', funcao: '', busca: '' };

function motivosRevisao(codigo) {
  const c = colab(codigo);
  const m = [];
  if (!c) { m.push('tem lançamento mas não está no cadastro'); return m; }
  if (c.revisar) m.push(c.motivoRevisao || 'função principal a confirmar');
  const sug = funcaoSugerida(codigo);
  if (sug && c.funcaoPrincipal && sug !== c.funcaoPrincipal) m.push(`a função com mais dias-função é ${FUNC[sug].nome}, mas o cadastro diz ${FUNC[c.funcaoPrincipal]?.nome || c.funcaoPrincipal}`);
  if (!c.funcaoPrincipal) m.push('sem função principal');
  const ult = ultimaAtividade(codigo), ultBase = mesesComDados().slice(-1)[0];
  const lim = P().mesesSemMovimento || 2;
  if (c.status !== 'desligado' && ult != null && ultBase != null && ultBase - ult >= lim) m.push(`sem movimento desde ${rotuloYM(ult).toLowerCase()}: confirme se foi desligado`);
  if (c.status !== 'desligado' && ult == null) m.push('sem nenhum lançamento: confirme se ainda está no CD');
  return m;
}
function listaColaboradores() {
  return todosCodigos().map(codigo => {
    const c = colab(codigo);
    const d = diasPorFuncao(codigo);
    return {
      codigo, c, nome: nomeExib(codigo), completo: nomeCompleto(codigo), principal: c ? c.funcaoPrincipal : null, sugerida: funcaoSugerida(codigo),
      status: c ? (c.status === 'desligado' ? 'desligado' : 'ativo') : 'sem-cadastro', dataDesligamento: c ? c.dataDesligamento : null,
      dias: d, totalDias: soma(FUNCOES, f => d[f.id]), nLanc: lancamentosDoColab(codigo).length,
      ultima: ultimaAtividade(codigo), primeira: primeiraAtividade(codigo), revisao: motivosRevisao(codigo)
    };
  });
}
VIEWS.colaboradores = () => {
  const fc = UI.filtrosColab;
  const todos = listaColaboradores();
  let ls = todos;
  if (fc.situacao) ls = ls.filter(x => x.status === fc.situacao);
  if (fc.funcao) ls = ls.filter(x => (x.principal || x.sugerida) === fc.funcao);
  if (fc.busca) { const t = norm(fc.busca); ls = ls.filter(x => norm(x.completo).includes(t) || norm(x.nome).includes(t) || norm(x.codigo).startsWith(t)); }
  ls = ls.slice().sort((a, b) => (a.status === 'desligado') - (b.status === 'desligado') || a.nome.localeCompare(b.nome, 'pt-BR'));
  const revisar = todos.filter(x => x.revisao.length);
  const ed = podeEditar();
  const cols = [
    { id: 'cod', rotulo: 'Código', valor: l => l.codigo },
    colNome({ html: l => `<span class="nome">${esc(l.nome)}</span> ${l.c && l.c.rotasExternas ? '<span class="selo rotas">rotas externas</span>' : ''}${l.revisao.length ? ' <span class="selo revisar" data-dica="' + esc(l.revisao.join('\n')) + '">revisar</span>' : ''}<div class="muted" style="font-size:12px">${esc(l.completo)}</div>` }),
    { id: 'fp', rotulo: 'Função principal', valor: l => l.principal ? FUNC[l.principal]?.nome : '', html: l => l.principal ? funcTag(l.principal) : '<span class="fraco">não definida</span>' },
    ...FUNCOES.map(f => ({ id: 'd' + f.id, rotulo: `Dias ${f.curto}`, tipo: 'int', valor: l => l.dias[f.id] || null, dica: `Dias-função em ${f.nome} (toda a base)` })),
    { id: 'sit', rotulo: 'Situação', valor: l => l.status === 'desligado' ? `Desligado${l.dataDesligamento ? ' em ' + fData(l.dataDesligamento) : ''}` : l.status === 'ativo' ? 'Ativo' : 'Sem cadastro',
      html: l => ed && l.c ? `<select class="sel" data-status-colab="${esc(l.codigo)}" aria-label="Situação de ${esc(l.nome)}" style="min-height:34px;padding:4px 28px 4px 8px;font-size:13px"><option value="ativo"${l.status === 'ativo' ? ' selected' : ''}>Ativo</option><option value="desligado"${l.status === 'desligado' ? ' selected' : ''}>Desligado</option></select>${l.status === 'desligado' && l.dataDesligamento ? `<div class="muted" style="font-size:11.5px">em ${esc(fData(l.dataDesligamento))}</div>` : ''}`
        : (l.status === 'desligado' ? `<span class="selo">desligado${l.dataDesligamento ? ' em ' + esc(fData(l.dataDesligamento)) : ''}</span>` : l.status === 'ativo' ? '<span class="selo novo">ativo</span>' : '<span class="selo revisar">sem cadastro</span>') },
    { id: 'ult', rotulo: 'Último mês', valor: l => l.ultima != null ? rotuloYM(l.ultima) : TRACO },
    { id: 'obs', rotulo: 'Observação', valor: l => l.c ? l.c.observacao || '' : '', ocultoCel: true },
    ...(ed ? [{ id: 'ac', rotulo: '', exportar: false, valor: () => '', html: l => `<div class="acoes-linha">${l.c ? botao('', 'editar-colab', { codigo: l.codigo }, { classe: 'peq fantasma', ic: 'editar', titulo: 'Editar', dica: 'Editar cadastro' }) : botao('Cadastrar', 'novo-colab', { codigo: l.codigo }, { classe: 'peq' })}${l.c && l.nLanc === 0 ? botao('', 'excluir-colab', { codigo: l.codigo }, { classe: 'peq fantasma perigo', ic: 'excluir', titulo: 'Excluir', dica: 'Excluir (sem lançamentos)' }) : ''}</div>` }] : [])
  ];
  const modelo = modeloSimples(cols, ls, { linhaAttrs: l => ({ acao: 'ficha', params: { codigo: l.codigo }, dica: 'Clique para abrir a ficha' }), vazio: 'Nenhum colaborador com esses filtros.' });
  const modeloRev = modeloSimples([
    { id: 'cod', rotulo: 'Código', valor: l => l.codigo },
    { id: 'nome', rotulo: 'Colaborador', valor: l => l.nome, prim: true, html: l => `<span class="nome">${esc(l.nome)}</span>` },
    { id: 'dist', rotulo: 'Dias por função', valor: l => FUNCOES.filter(f => l.dias[f.id]).map(f => `${f.curto} ${l.dias[f.id]}`).join(' · '), html: l => FUNCOES.filter(f => l.dias[f.id]).map(f => `${funcTag(f.id, true)} <b>${l.dias[f.id]}</b>`).join(' &nbsp; ') || TRACO },
    { id: 'fp', rotulo: 'Função principal', valor: l => l.principal ? FUNC[l.principal]?.nome : '(sem)', html: l => l.principal ? funcTag(l.principal) : '<span class="fraco">sem</span>' },
    { id: 'mot', rotulo: 'O que revisar', valor: l => l.revisao.join('; ') },
    ...(ed ? [{ id: 'ac', rotulo: '', exportar: false, valor: () => '', html: l => `<div class="acoes-linha">${l.c ? botao('Editar', 'editar-colab', { codigo: l.codigo }, { classe: 'peq', ic: 'editar' }) + (l.c.revisar ? botao('Marcar como revisado', 'revisado-colab', { codigo: l.codigo }, { classe: 'peq' }) : '') : botao('Cadastrar', 'novo-colab', { codigo: l.codigo }, { classe: 'peq primario' })}</div>` }] : [])
  ], revisar, { linhaAttrs: l => ({ acao: 'ficha', params: { codigo: l.codigo } }) });
  const filtros = `<div class="form" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">
    ${campo({ id: 'fc-sit', rotulo: 'Situação', valor: fc.situacao, opcoes: [{ valor: '', rotulo: 'Todos' }, { valor: 'ativo', rotulo: 'Ativos' }, { valor: 'desligado', rotulo: 'Desligados' }, { valor: 'sem-cadastro', rotulo: 'Sem cadastro' }] })}
    ${campo({ id: 'fc-funcao', rotulo: 'Função principal', valor: fc.funcao, opcoes: [{ valor: '', rotulo: 'Todas' }, ...FUNCOES.map(f => ({ valor: f.id, rotulo: f.nome }))] })}
    ${campo({ id: 'fc-busca', rotulo: 'Buscar nome ou código', valor: fc.busca, attrsExtra: { type: 'search' } })}
  </div>`;
  const nAtivos = todos.filter(x => x.status === 'ativo').length, nDeslig = todos.filter(x => x.status === 'desligado').length;
  const html = `${cabecalhoTela('Colaboradores', `${nAtivos} ativos · ${nDeslig} desligados · a chave é o código do Kaizen, não o nome`, ed ? botao('Incluir colaborador', 'novo-colab', null, { classe: 'primario', ic: 'mais' }) : '')}
    ${revisar.length ? bloco({ titulo: `Precisam de revisão (${revisar.length})`, desc: 'Função principal sugerida pelo maior número de dias-função na base, colaboradores em mais de uma função, códigos novos e quem está sem movimento há meses (confirme se foi desligado).', corpo: tabelaHTML(modeloRev) }) : ''}
    ${bloco({ titulo: '', corpo: filtros })}
    ${bloco({ titulo: `Cadastro (${ls.length})`, desc: ed ? 'Altere a situação direto na lista. Desligado continua no histórico dos meses em que trabalhou.' : '', corpo: tabelaHTML(modelo) })}`;
  return { html, exportar: { titulo: 'Colaboradores', subtitulo: `${nAtivos} ativos · ${nDeslig} desligados`, secoes: [{ tipo: 'tabela', titulo: 'Precisam de revisão', modelo: modeloRev }, { tipo: 'tabela', titulo: 'Cadastro', modelo }] } };
};
document.addEventListener('change', ev => {
  const id = ev.target.id || '';
  if (id === 'fc-sit') { UI.filtrosColab.situacao = ev.target.value; render(); }
  else if (id === 'fc-funcao') { UI.filtrosColab.funcao = ev.target.value; render(); }
  const cod = ev.target.getAttribute && ev.target.getAttribute('data-status-colab');
  if (cod) alterarSituacaoColab(cod, ev.target.value);
});
document.addEventListener('input', debounce(ev => { if (ev.target.id === 'fc-busca') { UI.filtrosColab.busca = ev.target.value; render(); } }, 250));

async function alterarSituacaoColab(codigo, nova) {
  const c = colab(codigo);
  if (!c || !podeEditar()) { render(); return; }
  if (nova === 'desligado') {
    abrirModal({
      titulo: `Desligar ${nomeExib(codigo)}`,
      corpo: `<p class="muted">O colaborador sai das listas de ativos, mas o histórico dos meses trabalhados continua nos painéis. Se aparecer lançamento depois da data, o sistema avisa.</p>
        <form class="form" novalidate>
          ${campo({ id: 'dg-data', rotulo: 'Data de desligamento', tipo: 'date', valor: c.dataDesligamento || '', obrig: true })}
          ${campo({ id: 'dg-obs', rotulo: 'Observação', tipo: 'textarea', valor: c.observacao || '', full: true, attrsExtra: { placeholder: 'Ex.: pedido de demissão; dispensa' } })}
        </form>`,
      botoes: [
        { rotulo: 'Cancelar', classe: 'fantasma', acao: () => { render(); } },
        { rotulo: 'Confirmar desligamento', classe: 'perigo cheio', acao: async ctrl => {
          const data = lerCampo(ctrl.el, 'dg-data');
          if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) { marcarErro(ctrl.el, 'dg-data', 'Informe a data.'); return false; }
          const doc = { ...docSimplesParaBanco(c), status: 'desligado', dataDesligamento: data, observacao: lerCampo(ctrl.el, 'dg-obs').trim(), atualizadoEm: agoraISO() };
          ctrl.ocupado(true);
          const okG = await gravarComHistorico([opGravar('colaboradores', codigo, doc)], { tipo: 'edicao', colecao: 'colaboradores', alvo: codigo, resumo: `${nomeExib(codigo)} marcado como desligado em ${fData(data)}`, antes: docSimplesParaBanco(c), depois: doc }, `${nomeExib(codigo)} marcado como desligado.`);
          ctrl.ocupado(false);
          return okG;
        } }
      ]
    });
    return;
  }
  const doc = { ...docSimplesParaBanco(c), status: 'ativo', dataDesligamento: null, atualizadoEm: agoraISO() };
  await gravarComHistorico([opGravar('colaboradores', codigo, doc)], { tipo: 'edicao', colecao: 'colaboradores', alvo: codigo, resumo: `${nomeExib(codigo)} marcado como ativo`, antes: docSimplesParaBanco(c), depois: doc }, `${nomeExib(codigo)} marcado como ativo.`);
}
function abrirFormColab(codigoExistente, codigoSugerido) {
  if (!podeEditar()) return;
  const c = codigoExistente ? colab(codigoExistente) : null;
  const sug = codigoSugerido || '';
  const d = c ? { ...c } : { codigo: sug, nome: sug ? (nomeKaizenDe(sug) || '') : '', nomeCurto: sug ? nomeCurtoDe(nomeKaizenDe(sug) || '') : '', funcaoPrincipal: sug ? funcaoSugerida(sug) || 'separacao' : 'separacao', status: 'ativo', dataDesligamento: '', observacao: '', rotasExternas: false };
  const dias = d.codigo ? diasPorFuncao(d.codigo) : null;
  abrirModal({
    titulo: c ? `Editar ${nomeExib(c.codigo)}` : 'Incluir colaborador',
    corpo: `<form class="form" novalidate>
      ${campo({ id: 'cb-cod', rotulo: 'Código (Kaizen)', valor: d.codigo, obrig: true, attrsExtra: c ? { readonly: true } : { autofocus: true } })}
      ${campo({ id: 'cb-nome', rotulo: 'Nome completo (como no Kaizen)', valor: d.nome, obrig: true })}
      ${campo({ id: 'cb-curto', rotulo: 'Nome curto (aparece nos painéis)', valor: d.nomeCurto || nomeCurtoDe(d.nome), ajuda: 'Padrão: primeiro e último nome. Pode ajustar (ex.: "Maria Clara").' })}
      ${campo({ id: 'cb-funcao', rotulo: 'Função principal', valor: d.funcaoPrincipal || '', opcoes: FUNCOES.map(f => ({ valor: f.id, rotulo: f.nome })), ajuda: dias ? `Dias-função na base: ${FUNCOES.map(f => `${f.nome} ${dias[f.id]}`).join(' · ')}` : '' })}
      ${campo({ id: 'cb-status', rotulo: 'Situação', valor: d.status === 'desligado' ? 'desligado' : 'ativo', opcoes: [{ valor: 'ativo', rotulo: 'Ativo' }, { valor: 'desligado', rotulo: 'Desligado' }] })}
      ${campo({ id: 'cb-data', rotulo: 'Data de desligamento', tipo: 'date', valor: d.dataDesligamento || '', ajuda: 'Obrigatória quando a situação é "Desligado".' })}
      <div class="campo full"><label class="check"><input type="checkbox" id="cb-rotas"${d.rotasExternas ? ' checked' : ''}> Atuava nas rotas externas (produção parcialmente registrada no coletor até set/2026)</label></div>
      ${c && c.revisar ? `<div class="campo full"><label class="check"><input type="checkbox" id="cb-revisado"> Marcar como revisado (${esc(semPonto(c.motivoRevisao || 'função principal a confirmar'))})</label></div>` : ''}
      ${campo({ id: 'cb-obs', rotulo: 'Observação', tipo: 'textarea', valor: d.observacao || '', full: true })}
    </form>`,
    botoes: [
      { rotulo: 'Cancelar', classe: 'fantasma' },
      { rotulo: 'Salvar', classe: 'primario', acao: async ctrl => {
        const r = ctrl.el;
        const codigo = lerCampo(r, 'cb-cod').trim(), nome = lerCampo(r, 'cb-nome').trim().toUpperCase();
        const status = lerCampo(r, 'cb-status'), data = lerCampo(r, 'cb-data');
        let erro = false;
        if (!/^[A-Za-z0-9_.~:@+-]{1,40}$/.test(codigo)) { marcarErro(r, 'cb-cod', 'Use só números (ou letras) do código do Kaizen.'); erro = true; } else marcarErro(r, 'cb-cod', '');
        if (!c && colab(codigo)) { marcarErro(r, 'cb-cod', 'Este código já está no cadastro.'); erro = true; }
        if (!nome) { marcarErro(r, 'cb-nome', 'Informe o nome.'); erro = true; } else marcarErro(r, 'cb-nome', '');
        if (status === 'desligado' && !/^\d{4}-\d{2}-\d{2}$/.test(data)) { marcarErro(r, 'cb-data', 'Informe a data de desligamento.'); erro = true; } else marcarErro(r, 'cb-data', '');
        if (erro) return false;
        const revisadoMarcado = $('#cb-revisado', r) ? $('#cb-revisado', r).checked : false;
        const doc = {
          ...(c ? docSimplesParaBanco(c) : {}),
          codigo, nome, nomeCurto: lerCampo(r, 'cb-curto').trim() || nomeCurtoDe(nome), funcaoPrincipal: lerCampo(r, 'cb-funcao'),
          funcaoPrincipalSugerida: funcaoSugerida(codigo) || lerCampo(r, 'cb-funcao'),
          status, dataDesligamento: status === 'desligado' ? data : null,
          observacao: lerCampo(r, 'cb-obs').trim(), rotasExternas: $('#cb-rotas', r).checked,
          revisar: c ? (revisadoMarcado ? false : !!c.revisar) : true,
          motivoRevisao: c ? (revisadoMarcado ? null : c.motivoRevisao || null) : 'Incluído manualmente: confirmar função principal.',
          criadoEm: c ? c.criadoEm || agoraISO() : agoraISO(), atualizadoEm: agoraISO()
        };
        ctrl.ocupado(true);
        const okG = await gravarComHistorico([opGravar('colaboradores', codigo, doc)], { tipo: c ? 'edicao' : 'inclusao', colecao: 'colaboradores', alvo: codigo, resumo: `${c ? 'Cadastro editado' : 'Colaborador incluído'}: ${nomeCurtoDe(nome)} (${codigo})`, antes: c ? docSimplesParaBanco(c) : null, depois: doc }, c ? 'Cadastro atualizado.' : 'Colaborador incluído.');
        ctrl.ocupado(false);
        return okG;
      } }
    ]
  });
}
Object.assign(ACOES, {
  'novo-colab': p => abrirFormColab(null, p && p.codigo),
  'editar-colab': p => abrirFormColab(p.codigo),
  'revisado-colab': async p => {
    const c = colab(p.codigo);
    if (!c) return;
    const doc = { ...docSimplesParaBanco(c), revisar: false, motivoRevisao: null, atualizadoEm: agoraISO() };
    await gravarComHistorico([opGravar('colaboradores', c.codigo, doc)], { tipo: 'edicao', colecao: 'colaboradores', alvo: c.codigo, resumo: `Cadastro revisado: ${nomeExib(c.codigo)}`, antes: docSimplesParaBanco(c), depois: doc }, 'Marcado como revisado.');
  },
  'excluir-colab': async p => {
    const c = colab(p.codigo);
    if (!c) return;
    if (lancamentosDoColab(p.codigo).length) { toast('Só é possível excluir quem não tem lançamento. Use "Desligado" para quem saiu.', 'erro', 7000); return; }
    const sim = await confirmar({ titulo: 'Excluir colaborador', texto: `<p>Excluir <b>${esc(nomeExib(p.codigo))}</b> (${esc(p.codigo)}) do cadastro? Ele não tem nenhum lançamento.</p>`, rotuloOk: 'Excluir', perigo: true });
    if (!sim) return;
    await gravarComHistorico([opExcluir('colaboradores', p.codigo)], { tipo: 'exclusao', colecao: 'colaboradores', alvo: p.codigo, resumo: `Colaborador excluído: ${nomeExib(p.codigo)} (${p.codigo})`, antes: docSimplesParaBanco(c), depois: null }, 'Colaborador excluído.');
  }
});
