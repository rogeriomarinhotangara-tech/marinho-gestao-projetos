/* =========================================================================
   Alertas automáticos e Plano de Ação (quadro por situação).
   ========================================================================= */

const SITUACOES_ACAO = { aberta: 'Aberta', andamento: 'Em andamento', concluida: 'Concluída' };
const TIPOS_ALERTA = {
  abaixo2: 'Abaixo da meta 2 meses seguidos', queda: 'Queda de índice', concentracao: 'Concentração', login: 'Verificar login (acima de 2× a mediana)',
  novo: 'Colaborador novo', fatiamento: 'Dias-função acima da presença', duplicidade: 'Possível duplicidade', desligado: 'Desligado com lançamento'
};
function acaoDoAlerta(alertaId) { return [...S.planoAcao.values()].find(pl => pl.alertaOrigem && pl.alertaOrigem.id === alertaId) || null; }
function cartaoAcaoHTML(pl) {
  const vencida = pl.prazo && pl.situacao !== 'concluida' && pl.prazo < hojeISO();
  return `<div class="cartao-acao">
    <div class="o-que">${esc(pl.acao || '(sem descrição)')}</div>
    <div class="meta-acao">
      ${pl.codigo ? `<span>Colaborador: <button type="button" class="btn fantasma peq" style="min-height:24px;padding:0 4px"${dataAcao('ficha', { codigo: pl.codigo })}>${esc(nomeExib(pl.codigo))}</button></span>` : ''}
      ${pl.funcao && FUNC[pl.funcao] ? `<span>${funcTag(pl.funcao, true)}</span>` : ''}
      ${pl.mesOrigem ? `<span>Origem: ${esc(rotuloYM(ymDeChave(pl.mesOrigem) ?? 0))}</span>` : ''}
      <span>Responsável: <b>${esc(pl.responsavel || TRACO)}</b></span>
      <span class="${vencida ? 'vencida' : ''}">Prazo: ${esc(fData(pl.prazo))}${vencida ? ' (vencido)' : ''}</span>
      <span>Situação: <b>${esc(SITUACOES_ACAO[pl.situacao] || pl.situacao || TRACO)}</b></span>
    </div>
    ${pl.alertaOrigem && pl.alertaOrigem.texto ? `<div class="meta-acao">Alerta: ${esc(pl.alertaOrigem.texto)}</div>` : ''}
    ${pl.resultado ? `<div class="meta-acao">Resultado: ${esc(pl.resultado)}</div>` : ''}
    ${podeEditar() ? `<div class="linha" style="gap:6px;margin-top:4px">
      ${botao('Editar', 'editar-acao', { id: pl.id }, { classe: 'peq', ic: 'editar' })}
      ${pl.situacao !== 'andamento' && pl.situacao !== 'concluida' ? botao('Iniciar', 'mover-acao', { id: pl.id, situacao: 'andamento' }, { classe: 'peq' }) : ''}
      ${pl.situacao !== 'concluida' ? botao('Concluir', 'mover-acao', { id: pl.id, situacao: 'concluida' }, { classe: 'peq' }) : botao('Reabrir', 'mover-acao', { id: pl.id, situacao: 'aberta' }, { classe: 'peq' })}
      ${botao('', 'excluir-acao', { id: pl.id }, { classe: 'peq perigo', ic: 'excluir', titulo: 'Excluir ação', dica: 'Excluir ação' })}
    </div>` : ''}
  </div>`;
}
function alertaHTML(a) {
  const acao = acaoDoAlerta(a.id);
  const ver = a.codigo ? botao('Ver dado', 'ficha', { codigo: a.codigo, ym: a.ym, f: a.funcao }, { classe: 'peq', ic: 'olho' }) : (a.funcao ? botao('Ver dado', 'ir', { rota: 'funcao', params: { f: a.funcao } }, { classe: 'peq', ic: 'olho' }) : '');
  const extra = a.tipo === 'duplicidade' && a.ids ? botao('Ver lançamentos', 'ir', { rota: 'lancamento', params: { id: a.ids[0] } }, { classe: 'peq' }) : '';
  const criar = acao ? `<span class="selo">${esc(`ação: ${SITUACOES_ACAO[acao.situacao] || acao.situacao}`)}</span>` : (podeEditar() ? botao('Criar ação', 'nova-acao', { codigo: a.codigo || '', funcao: a.funcao || '', mesOrigem: chaveYM(a.ym), alerta: { id: a.id, tipo: a.tipo, texto: a.titulo } }, { classe: 'peq', ic: 'mais' }) : '');
  return `<div class="alerta ${a.gravidade}">
    <span class="ic">${icone(a.gravidade === 'info' ? 'info' : 'atencao')}</span>
    <div><div class="tt">${esc(a.titulo)}</div><div class="tx">${esc(a.texto)}</div><div class="tx"><span class="selo">${esc(TIPOS_ALERTA[a.tipo] || a.tipo)}</span>${a.funcao ? ' ' + funcTag(a.funcao, true) : ''}</div></div>
    <div class="acs">${ver}${extra}${criar}</div>
  </div>`;
}
ACOES['aba-alertas'] = p => { UI.params.aba = p.aba; const ult = UI.trilha[UI.trilha.length - 1]; if (ult.rota === 'alertas') ult.params.aba = p.aba; salvarPreferencias(); render(); };

VIEWS.alertas = params => {
  const aba = params.aba === 'plano' ? 'plano' : 'alertas';
  const ym = UI.ym;
  const todos = alertasDoMes(ym).filter(a => !UI.funcao || !a.funcao || a.funcao === UI.funcao);
  const grupos = [['alta', 'Prioridade alta'], ['media', 'Atenção'], ['info', 'Para contexto']];
  const planos = [...S.planoAcao.values()];
  const cont = { aberta: 0, andamento: 0, concluida: 0 };
  planos.forEach(pl => { cont[pl.situacao] = (cont[pl.situacao] || 0) + 1; });
  let corpo;
  if (aba === 'alertas') {
    corpo = (todos.length ? grupos.map(([g, rot]) => {
      const ls = todos.filter(a => a.gravidade === g);
      return ls.length ? bloco({ titulo: `${rot} (${ls.length})`, corpo: `<div class="lista-alertas">${ls.map(alertaHTML).join('')}</div>` }) : '';
    }).join('') : bloco({ titulo: '', corpo: `<div class="vazio">${icone('certo')}<h2>Nenhum alerta em ${esc(rotuloYM(ym).toLowerCase())}</h2><p>As regras de alerta não encontraram sinais neste mês${UI.funcao ? ' para a função filtrada' : ''}.</p></div>` }))
      + (!todos.temAnterior && !lancamentosPeriodo(ym - 1, ym - 1).length ? avisoHTML('info', 'Sem o mês anterior na base, os alertas de "2 meses seguidos" e de queda de índice não podem ser calculados.') : '');
  } else {
    corpo = `<div class="linha" style="justify-content:space-between"><p class="muted">Ações abertas a partir dos alertas ou registradas à mão. Responsável, prazo, situação e resultado.</p>${podeEditar() ? botao('Nova ação', 'nova-acao', { mesOrigem: chaveYM(ym) }, { classe: 'primario', ic: 'mais' }) : ''}</div>
      <div class="quadro">${Object.entries(SITUACOES_ACAO).map(([k, rot]) => {
        const ls = planos.filter(pl => (pl.situacao || 'aberta') === k).sort((a, b) => String(a.prazo || '9999').localeCompare(String(b.prazo || '9999')));
        return `<div class="coluna-quadro"><h4>${esc(rot)}<span class="qt">${ls.length}</span></h4>${ls.length ? ls.map(cartaoAcaoHTML).join('') : '<p class="muted" style="font-size:12.5px">Nenhuma ação.</p>'}</div>`;
      }).join('')}</div>`;
  }
  const modeloAlertas = modeloSimples([
    { id: 'g', rotulo: 'Prioridade', valor: l => ({ alta: 'Alta', media: 'Atenção', info: 'Contexto' }[l.gravidade]) },
    { id: 't', rotulo: 'Tipo', valor: l => TIPOS_ALERTA[l.tipo] || l.tipo },
    { id: 'f', rotulo: 'Função', valor: l => l.funcao ? FUNC[l.funcao].nome : '' },
    { id: 'tt', rotulo: 'Alerta', valor: l => l.titulo },
    { id: 'tx', rotulo: 'Detalhe', valor: l => l.texto },
    { id: 'ac', rotulo: 'Ação', valor: l => { const a = acaoDoAlerta(l.id); return a ? SITUACOES_ACAO[a.situacao] || a.situacao : ''; } }
  ], todos);
  const html = `${cabecalhoTela('Alertas e Plano de Ação', `${esc(rotuloYM(ym))} · alertas calculados mês a mês`)}
    ${abasHTML([{ id: 'alertas', rotulo: `Alertas do mês (${todos.length})` }, { id: 'plano', rotulo: `Plano de ação (${cont.aberta + cont.andamento} em aberto)` }], aba, 'aba-alertas')}
    ${corpo}`;
  return { html, exportar: { titulo: 'Alertas e Plano de Ação', subtitulo: rotuloYM(ym), secoes: [{ tipo: 'tabela', titulo: 'Alertas do mês', modelo: modeloAlertas }, { tipo: 'tabela', titulo: 'Plano de ação', modelo: modeloPlano() }] } };
};
function modeloPlano() {
  return modeloSimples([
    { id: 'acao', rotulo: 'O quê', valor: l => l.acao },
    { id: 'col', rotulo: 'Colaborador', valor: l => l.codigo ? `${nomeExib(l.codigo)} (${l.codigo})` : '' },
    { id: 'f', rotulo: 'Função', valor: l => l.funcao && FUNC[l.funcao] ? FUNC[l.funcao].nome : '' },
    { id: 'mes', rotulo: 'Mês de origem', valor: l => l.mesOrigem ? rotuloYM(ymDeChave(l.mesOrigem)) : '' },
    { id: 'al', rotulo: 'Alerta de origem', valor: l => l.alertaOrigem ? l.alertaOrigem.texto : '' },
    { id: 'resp', rotulo: 'Responsável', valor: l => l.responsavel },
    { id: 'prazo', rotulo: 'Prazo', valor: l => fData(l.prazo) },
    { id: 'sit', rotulo: 'Situação', valor: l => SITUACOES_ACAO[l.situacao] || l.situacao },
    { id: 'res', rotulo: 'Resultado', valor: l => l.resultado || '' }
  ], [...S.planoAcao.values()].sort((a, b) => String(a.prazo || '').localeCompare(String(b.prazo || ''))));
}
function abrirFormAcao(existente, pre = {}) {
  if (!podeEditar()) { toast('Somente quem pode editar registra ações.', 'erro'); return; }
  const d = existente ? { ...existente } : { codigo: pre.codigo || '', funcao: pre.funcao || '', mesOrigem: pre.mesOrigem || chaveYM(UI.ym), alertaOrigem: pre.alerta || null, acao: '', responsavel: '', prazo: '', situacao: 'aberta', resultado: '' };
  const colabs = [{ valor: '', rotulo: '(nenhum)' }, ...todosCodigos().map(c => ({ valor: c, rotulo: `${nomeExib(c)} (${c})` }))];
  const mesesOp = mesesDisponiveis().map(y => ({ valor: chaveYM(y), rotulo: rotuloYM(y) }));
  abrirModal({
    titulo: existente ? 'Editar ação' : 'Nova ação',
    corpo: `${d.alertaOrigem ? avisoHTML('info', `Alerta de origem: ${esc(d.alertaOrigem.texto)}`) : ''}
      <form class="form" id="form-acao" novalidate>
        ${campo({ id: 'acao-oque', rotulo: 'O que será feito', tipo: 'textarea', valor: d.acao, full: true, obrig: true, attrsExtra: { autofocus: true, placeholder: 'Ex.: acompanhar a separação por 2 dias e treinar no endereçamento' } })}
        ${campo({ id: 'acao-colab', rotulo: 'Colaborador', valor: d.codigo, opcoes: colabs })}
        ${campo({ id: 'acao-funcao', rotulo: 'Função', valor: d.funcao, opcoes: [{ valor: '', rotulo: '(nenhuma)' }, ...FUNCOES.map(f => ({ valor: f.id, rotulo: f.nome }))] })}
        ${campo({ id: 'acao-resp', rotulo: 'Responsável', valor: d.responsavel, obrig: true, attrsExtra: { placeholder: 'Ex.: gerente do CD' } })}
        ${campo({ id: 'acao-prazo', rotulo: 'Prazo', tipo: 'date', valor: d.prazo })}
        ${campo({ id: 'acao-mes', rotulo: 'Mês de origem', valor: d.mesOrigem, opcoes: mesesOp.length ? mesesOp : [{ valor: d.mesOrigem, rotulo: d.mesOrigem }] })}
        ${campo({ id: 'acao-sit', rotulo: 'Situação', valor: d.situacao, opcoes: Object.entries(SITUACOES_ACAO).map(([v, r]) => ({ valor: v, rotulo: r })) })}
        ${campo({ id: 'acao-res', rotulo: 'Resultado', tipo: 'textarea', valor: d.resultado, full: true, attrsExtra: { placeholder: 'Preencha quando concluir: o que mudou?' } })}
      </form>`,
    botoes: [
      { rotulo: 'Cancelar', classe: 'fantasma' },
      { rotulo: 'Salvar ação', classe: 'primario', acao: async ctrl => {
        const raiz = ctrl.el;
        const acao = lerCampo(raiz, 'acao-oque').trim(), resp = lerCampo(raiz, 'acao-resp').trim();
        marcarErro(raiz, 'acao-oque', acao ? '' : 'Descreva a ação.');
        marcarErro(raiz, 'acao-resp', resp ? '' : 'Informe o responsável.');
        if (!acao || !resp) return false;
        const id = existente ? existente.id : novoId('a');
        const doc = {
          codigo: lerCampo(raiz, 'acao-colab') || null, funcao: lerCampo(raiz, 'acao-funcao') || null, mesOrigem: lerCampo(raiz, 'acao-mes') || null,
          alertaOrigem: d.alertaOrigem || null, acao, responsavel: resp, prazo: lerCampo(raiz, 'acao-prazo') || null,
          situacao: lerCampo(raiz, 'acao-sit') || 'aberta', resultado: lerCampo(raiz, 'acao-res').trim(),
          criadoEm: existente ? existente.criadoEm || agoraISO() : agoraISO(), atualizadoEm: agoraISO()
        };
        ctrl.ocupado(true);
        const okG = await gravarComHistorico([opGravar('planoAcao', id, doc)], { tipo: existente ? 'edicao' : 'inclusao', colecao: 'planoAcao', alvo: id, resumo: `${existente ? 'Ação editada' : 'Ação criada'}: ${acao}`, antes: existente ? docSimplesParaBanco(existente) : null, depois: doc }, existente ? 'Ação atualizada.' : 'Ação registrada no plano.');
        ctrl.ocupado(false);
        return okG;
      } }
    ]
  });
}
Object.assign(ACOES, {
  'nova-acao': p => abrirFormAcao(null, p || {}),
  'editar-acao': p => { const pl = S.planoAcao.get(p.id); if (pl) abrirFormAcao(pl); },
  'mover-acao': async p => {
    const pl = S.planoAcao.get(p.id);
    if (!pl) return;
    const doc = { ...docSimplesParaBanco(pl), situacao: p.situacao, atualizadoEm: agoraISO() };
    await gravarComHistorico([opGravar('planoAcao', pl.id, doc)], { tipo: 'edicao', colecao: 'planoAcao', alvo: pl.id, resumo: `Ação movida para "${SITUACOES_ACAO[p.situacao]}": ${pl.acao}`, antes: docSimplesParaBanco(pl), depois: doc }, `Ação marcada como "${SITUACOES_ACAO[p.situacao]}".`);
  },
  'excluir-acao': async p => {
    const pl = S.planoAcao.get(p.id);
    if (!pl) return;
    const sim = await confirmar({ titulo: 'Excluir ação', texto: `<p>Excluir a ação "<b>${esc(pl.acao)}</b>"? O registro fica no histórico, mas sai do quadro.</p>`, rotuloOk: 'Excluir', perigo: true });
    if (!sim) return;
    await gravarComHistorico([opExcluir('planoAcao', pl.id)], { tipo: 'exclusao', colecao: 'planoAcao', alvo: pl.id, resumo: `Ação excluída: ${pl.acao}`, antes: docSimplesParaBanco(pl), depois: null }, 'Ação excluída.');
  }
});
