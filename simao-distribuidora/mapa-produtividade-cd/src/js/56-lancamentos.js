/* =========================================================================
   Lançamentos: tabela com filtros, inclusão manual, edição, exclusão,
   exclusão de um mês inteiro e histórico de cada linha.
   ========================================================================= */

UI.filtrosLanc = { ano: null, mes: 'atual', funcao: '', codigo: '', busca: '' };

function lancamentosFiltrados() {
  const fl = UI.filtrosLanc;
  const ano = fl.ano || (UI.ym != null ? anoDe(UI.ym) : null);
  let ls = todosLancamentos();
  if (ano) ls = ls.filter(l => l.ano === ano);
  if (fl.mes === 'atual' && UI.ym != null) ls = ls.filter(l => l.ym === UI.ym);
  else if (fl.mes !== 'todos' && fl.mes !== 'atual' && fl.mes !== '' && fl.mes != null) ls = ls.filter(l => l.ym === Number(fl.mes));
  if (fl.funcao) ls = ls.filter(l => l.funcao === fl.funcao);
  if (fl.codigo) ls = ls.filter(l => l.codigo === fl.codigo);
  if (fl.busca) { const t = norm(fl.busca); ls = ls.filter(l => norm(nomeCompleto(l.codigo)).includes(t) || norm(l.codigo).startsWith(t)); }
  return ls;
}
function colunasLancamentos({ acoes = true } = {}) {
  return [
    { id: 'mes', rotulo: 'Mês', valor: l => rotuloYM(l.ym), prim: true, html: l => `<b>${esc(rotuloYM(l.ym))}</b> ${mesFechado(l.ym) ? `<span class="selo fechado" data-dica="Mês fechado: reabra em Parâmetros para editar">${icone('cadeado')}fechado</span>` : ''}` },
    { id: 'f', rotulo: 'Função', valor: l => FUNC[l.funcao]?.nome || l.funcao, html: l => funcTag(l.funcao) },
    { id: 'cod', rotulo: 'Código', valor: l => l.codigo },
    { id: 'nome', rotulo: 'Colaborador', valor: l => nomeExib(l.codigo), html: l => `<span class="nome">${esc(nomeExib(l.codigo))}</span> ${l.suspeito ? '<span class="selo suspeito" data-dica="' + esc(l.motivoSuspeita || 'Marcado como suspeito') + '">suspeito</span>' : ''}${l.editadoEm ? ' <span class="selo" data-dica="Editado em ' + esc(fDataHora(l.editadoEm)) + '">editado</span>' : ''}` },
    { id: 'dias', rotulo: 'Dias', tipo: 'int', valor: l => l.diasFuncao },
    { id: 'ped', rotulo: 'Pedidos', tipo: 'int', valor: l => l.pedidos },
    { id: 'nf', rotulo: 'NF', tipo: 'int', valor: l => l.nfs },
    { id: 'itens', rotulo: 'Itens', tipo: 'int', valor: l => l.skus },
    { id: 'unid', rotulo: 'Unidades', tipo: 'dx', valor: l => l.unidades },
    { id: 'itd', rotulo: 'Itens/dia', tipo: 'd1', valor: l => div(l.skus, l.diasFuncao) },
    { id: 'und', rotulo: 'Unid./dia', tipo: 'int', valor: l => div(l.unidades, l.diasFuncao), ocultoCel: true },
    { id: 'origem', rotulo: 'Origem', valor: l => l.origem || '', ocultoCel: true },
    ...(acoes ? [{ id: 'acoes', rotulo: '', tela: true, exportar: false, valor: () => '', html: l => `<div class="acoes-linha">
      ${botao('', 'ir', { rota: 'lancamento', params: { id: l.id } }, { classe: 'peq fantasma', ic: 'olho', titulo: 'Detalhar', dica: 'Detalhar' })}
      ${podeEditar() && !mesFechado(l.ym) ? botao('', 'editar-lanc', { id: l.id }, { classe: 'peq fantasma', ic: 'editar', titulo: 'Editar', dica: 'Editar' }) + botao('', 'excluir-lanc', { id: l.id }, { classe: 'peq fantasma perigo', ic: 'excluir', titulo: 'Excluir', dica: 'Excluir' }) : ''}
    </div>` }] : [])
  ];
}
function opcoesFiltroMes(ano) {
  const meses = mesesComDados().filter(y => anoDe(y) === ano);
  return [{ valor: 'atual', rotulo: `Mês selecionado (${UI.ym != null ? rotuloYM(UI.ym) : TRACO})` }, { valor: 'todos', rotulo: 'Todos os meses do ano' }, ...meses.map(y => ({ valor: String(y), rotulo: rotuloYM(y) }))];
}
VIEWS.lancamentos = () => {
  const fl = UI.filtrosLanc;
  const anos = [...new Set(mesesComDados().map(anoDe))].sort((a, b) => b - a);
  const ano = fl.ano || (UI.ym != null ? anoDe(UI.ym) : anos[0]);
  const ls = lancamentosFiltrados();
  const cols = colunasLancamentos();
  const modelo = modeloSimples(cols, ls, {
    linhaAttrs: l => ({ acao: 'ir', params: { rota: 'lancamento', params: { id: l.id } } }),
    rodape: { mes: `${ls.length} ${ls.length === 1 ? 'lançamento' : 'lançamentos'}`, dias: soma(ls, l => l.diasFuncao), ped: soma(ls, l => l.pedidos), nf: soma(ls, l => l.nfs), itens: soma(ls, l => l.skus), unid: soma(ls, l => l.unidades) },
    vazio: mesesComDados().length ? 'Nenhum lançamento com esses filtros.' : 'Nenhum mês importado — importe a extração do Kaizen.'
  });
  const filtros = `<div class="form" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">
    ${campo({ id: 'fl-ano', rotulo: 'Ano', valor: ano, opcoes: (anos.length ? anos : [ano]).map(a => ({ valor: a, rotulo: String(a) })) })}
    ${campo({ id: 'fl-mes', rotulo: 'Mês', valor: fl.mes, opcoes: opcoesFiltroMes(ano) })}
    ${campo({ id: 'fl-funcao', rotulo: 'Função', valor: fl.funcao, opcoes: [{ valor: '', rotulo: 'Todas' }, ...FUNCOES.map(f => ({ valor: f.id, rotulo: f.nome }))] })}
    ${campo({ id: 'fl-codigo', rotulo: 'Colaborador', valor: fl.codigo, opcoes: [{ valor: '', rotulo: 'Todos' }, ...todosCodigos().map(c => ({ valor: c, rotulo: `${nomeExib(c)} (${c})` }))] })}
    ${campo({ id: 'fl-busca', rotulo: 'Buscar nome ou código', valor: fl.busca, attrsExtra: { type: 'search', placeholder: 'Nome ou código' } })}
  </div>`;
  const acoes = podeEditar() ? botao('Incluir lançamento', 'novo-lanc', null, { classe: 'primario', ic: 'mais' }) + botao('Excluir mês inteiro', 'excluir-mes', null, { classe: 'perigo', ic: 'excluir' }) : '';
  const html = `${cabecalhoTela('Lançamentos', 'Base completa: uma linha por colaborador × função × mês. Clique para detalhar e ver o histórico de alterações.', acoes)}
    ${bloco({ titulo: '', corpo: filtros })}
    ${bloco({ titulo: `${ls.length} ${ls.length === 1 ? 'lançamento' : 'lançamentos'}`, desc: 'Totais no rodapé. Unidades aparecem com casas decimais quando a extração traz rateio de caixa/fardo.', corpo: tabelaHTML(modelo) })}`;
  return { html, exportar: { titulo: 'Lançamentos', subtitulo: `Filtros: ano ${ano}; mês ${opcoesFiltroMes(ano).find(o => o.valor === String(fl.mes))?.rotulo || 'todos'}; função ${fl.funcao ? FUNC[fl.funcao].nome : 'todas'}; colaborador ${fl.codigo ? nomeExib(fl.codigo) : 'todos'}`, secoes: [{ tipo: 'tabela', titulo: 'Lançamentos', modelo: { ...modelo, colunas: colunasLancamentos({ acoes: false }) } }] } };
};
document.addEventListener('change', ev => {
  const id = ev.target.id || '';
  if (!id.startsWith('fl-')) return;
  const v = ev.target.value;
  if (id === 'fl-ano') { UI.filtrosLanc.ano = Number(v); UI.filtrosLanc.mes = 'todos'; }
  if (id === 'fl-mes') UI.filtrosLanc.mes = v;
  if (id === 'fl-funcao') UI.filtrosLanc.funcao = v;
  if (id === 'fl-codigo') UI.filtrosLanc.codigo = v;
  render();
});
document.addEventListener('input', debounce(ev => {
  if (ev.target.id === 'fl-busca') { UI.filtrosLanc.busca = ev.target.value; render(); }
}, 250));

/* ---------- detalhe de um lançamento ---------- */
function historicoDe(id) {
  return [...S.historico.values()].filter(h => h.alvo === id || (Array.isArray(h.alvos) && h.alvos.includes(id))).sort((a, b) => String(b.quando).localeCompare(String(a.quando)));
}
const ROTULOS_CAMPOS = { ano: 'Ano', mes: 'Mês', funcao: 'Função', codigo: 'Código', nomeKaizen: 'Nome no Kaizen', diasLista: 'Dias (lista)', diasFuncao: 'Dias na função', pedidos: 'Pedidos (OM)', nfs: 'NF conferidas', skus: 'Itens (SKU)', unidades: 'Unidades', mediaKaizen: 'Média Kaizen', pesoBruto: 'Peso (bruto)', volumeBruto: 'Volume (bruto)', divergencias: 'Divergências', destino: 'Destino/canal', origem: 'Origem', arquivo: 'Arquivo', importadoEm: 'Importado em', editadoEm: 'Editado em', suspeito: 'Suspeito', motivoSuspeita: 'Motivo da suspeita', observacao: 'Observação' };
function valorCampoTexto(k, v) {
  if (v === null || v === undefined || v === '') return TRACO;
  if (k === 'funcao') return FUNC[v]?.nome || v;
  if (k === 'mes') return MESES[v - 1] || v;
  if (Array.isArray(v)) return v.map(x => typeof x === 'object' ? JSON.stringify(x) : String(x).padStart(2, '0')).join(', ');
  if (k === 'importadoEm' || k === 'editadoEm') return fDataHora(v);
  if (typeof v === 'boolean') return v ? 'sim' : 'não';
  if (typeof v === 'number') return Number.isInteger(v) ? fInt(v) : fDx(v);
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
function diffHTML(antes, depois) {
  const ks = [...new Set([...Object.keys(antes || {}), ...Object.keys(depois || {})])].filter(k => !['importadoEm', 'editadoEm'].includes(k));
  const mud = ks.filter(k => !iguais((antes || {})[k], (depois || {})[k]));
  if (!antes && depois) return '<span class="muted">Inclusão.</span>';
  if (antes && !depois) return '<span class="muted">Exclusão.</span>';
  if (!mud.length) return '<span class="muted">Sem diferença nos campos.</span>';
  return `<ul style="margin:4px 0 0;padding-left:18px">${mud.map(k => `<li><b>${esc(ROTULOS_CAMPOS[k] || k)}:</b> ${esc(valorCampoTexto(k, (antes || {})[k]))} → ${esc(valorCampoTexto(k, (depois || {})[k]))}</li>`).join('')}</ul>`;
}
function autorTexto(id) { if (!id) return 'editor'; return id === S.usuarioId ? 'você' : 'outro editor'; }
VIEWS.lancamento = params => {
  const l = S.lancamentos.get(params.id);
  if (!l) {
    const hist = historicoDe(params.id);
    return { html: `${cabecalhoTela('Lançamento não encontrado', 'Ele pode ter sido excluído ou substituído por uma importação.')}${hist.length ? bloco({ titulo: 'Histórico', corpo: htmlHistorico(hist, params.id) }) : ''}` };
  }
  const r = linhasFuncao(l.ym, l.ym, l.funcao).find(x => x.codigo === l.codigo);
  const fechado = mesFechado(l.ym);
  const acoes = podeEditar() && !fechado ? botao('Editar', 'editar-lanc', { id: l.id }, { ic: 'editar' }) + botao(l.suspeito ? 'Desmarcar suspeito' : 'Marcar como suspeito', 'suspeito-lanc', { id: l.id }) + botao('Excluir', 'excluir-lanc', { id: l.id }, { classe: 'perigo', ic: 'excluir' }) : (fechado ? '<span class="selo fechado">mês fechado</span>' : '');
  const campos = ['ano', 'mes', 'funcao', 'codigo', 'nomeKaizen', 'diasLista', 'diasFuncao', 'pedidos', 'nfs', 'skus', 'unidades', 'mediaKaizen', 'pesoBruto', 'volumeBruto', 'divergencias', 'destino', 'origem', 'arquivo', 'importadoEm', 'editadoEm', 'suspeito', 'motivoSuspeita', 'observacao'];
  const linhasCampos = campos.map(k => ({ k, rot: ROTULOS_CAMPOS[k], v: valorCampoTexto(k, l[k]) }));
  const mCampos = modeloSimples([{ id: 'rot', rotulo: 'Campo', valor: x => x.rot }, { id: 'v', rotulo: 'Valor', valor: x => x.v }], linhasCampos, { cartoes: false });
  const media = div(l.skus, l.diasFuncao);
  const mInd = r ? modeloSimples([{ id: 'rot', rotulo: 'Indicador', valor: x => x.rot }, { id: 'v', rotulo: 'Valor', valor: x => x.v }, { id: 'n', rotulo: 'Como é calculado', valor: x => x.n }], [
    { rot: 'Itens/dia', v: fD1(r.ind.itensDia), n: `${fInt(l.skus)} itens ÷ ${l.diasFuncao} dias` },
    { rot: 'Unidades/dia', v: fInt(r.ind.unidDia), n: `${fDx(l.unidades)} ÷ ${l.diasFuncao}` },
    { rot: 'Documentos/dia', v: fD1(r.ind.docsDia), n: `${fInt(l.documentos)} ÷ ${l.diasFuncao}` },
    { rot: 'Itens por documento', v: fD1(r.ind.itensPorDoc), n: 'itens ÷ documentos' },
    { rot: 'Unidades por item', v: fD1(r.ind.unidPorItem), n: 'unidades ÷ itens' },
    { rot: '% da meta de itens', v: fPct(r.ind.pctItens), n: `itens/dia ÷ meta ${fD1(r.ind.metaItens)}` },
    { rot: '% da meta de quantidade', v: fPct(r.ind.pctUnid), n: `unidades/dia ÷ meta ${fInt(r.ind.metaUnid)}` },
    { rot: 'Índice de Eficiência', v: r.ind.indice != null ? fPct(r.ind.indice) : TRACO, n: r.ind.indice != null ? `${fPct(r.ind.pctItens)} × ${fNum(P().pesoItens * 100, 'int')}% + ${fPct(r.ind.pctUnid)} × ${fNum(P().pesoQuantidade * 100, 'int')}%` : r.ind.motivo },
    { rot: 'Média do Kaizen × recalculada', v: `${valorCampoTexto('mediaKaizen', l.mediaKaizen)} × ${fD2(media)}`, n: 'O Kaizen corta as casas decimais; o painel recalcula itens ÷ dias.' }
  ], { cartoes: false }) : null;
  const hist = historicoDe(l.id);
  const html = `${cabecalhoTela(`${nomeExib(l.codigo)} · ${FUNC[l.funcao]?.nome || l.funcao} · ${rotuloYM(l.ym)}`, `Lançamento ${esc(l.id)} ${l.suspeito ? '· <span class="selo suspeito">suspeito</span>' : ''}`, acoes)}
    ${l.suspeito ? avisoHTML('erro', `<b>Suspeito:</b> ${esc(l.motivoSuspeita || 'marcado na auditoria')}.`) : ''}
    <div class="grade-2">
      ${bloco({ titulo: 'Dados do lançamento', desc: 'Como vieram da extração (ou da inclusão manual). Peso e volume ficam só como registro de auditoria.', corpo: tabelaHTML(mCampos) })}
      <div class="pilha">
        ${mInd ? bloco({ titulo: 'Indicadores calculados', corpo: tabelaHTML(mInd) }) : ''}
        ${bloco({ titulo: 'Histórico de alterações desta linha', corpo: htmlHistorico(hist, l.id) })}
        ${bloco({ titulo: '', corpo: `<div class="linha">${botao('Abrir ficha do colaborador', 'ficha', { codigo: l.codigo, ym: l.ym, f: l.funcao }, { ic: 'ficha' })}${botao(`Ver ${FUNC[l.funcao]?.nome || 'função'} em ${rotuloYM(l.ym)}`, 'ir', { rota: 'funcao', params: { f: l.funcao, ym: l.ym } }, { ic: 'ranking' })}</div>` })}
      </div>
    </div>`;
  return { html, exportar: { titulo: 'Lançamento', subtitulo: `${nomeExib(l.codigo)} · ${FUNC[l.funcao]?.nome} · ${rotuloYM(l.ym)}`, secoes: [{ tipo: 'tabela', titulo: 'Dados', modelo: mCampos }, ...(mInd ? [{ tipo: 'tabela', titulo: 'Indicadores', modelo: mInd }] : [])] } };
};
function htmlHistorico(hist, id) {
  if (!hist.length) return '<p class="muted">Sem alterações registradas.</p>';
  return `<div class="lista-alertas">${hist.map(h => {
    const antes = h.mapa ? (h.antes && h.antes[id]) || null : (h.alvo === id ? h.antes : null);
    const depois = h.mapa ? (h.depois && h.depois[id]) || null : (h.alvo === id ? h.depois : null);
    return `<div class="alerta info"><span class="ic">${icone('historico')}</span><div><div class="tt">${esc(h.resumo || h.tipo)}</div><div class="tx">${esc(fDataHora(h.quando))} · por ${esc(autorTexto(h.autorId))}</div>${(antes || depois) ? `<div class="tx">${diffHTML(antes, depois)}</div>` : ''}</div><div></div></div>`;
  }).join('')}</div>`;
}

/* ---------- formulário de inclusão/edição ---------- */
function abrirFormLancamento(existente) {
  if (!podeEditar()) { toast('Esta tela está em modo leitura.', 'erro'); return; }
  if (existente && mesFechado(existente.ym)) { toast('Mês fechado: reabra em Parâmetros para editar.', 'erro'); return; }
  const base = existente || { ano: UI.ym != null ? anoDe(UI.ym) : new Date().getFullYear(), mes: UI.ym != null ? mesDe(UI.ym) : new Date().getMonth() + 1, funcao: UI.funcao || 'separacao', codigo: '', diasLista: [], diasFuncao: '', pedidos: 0, nfs: 0, skus: '', unidades: '', mediaKaizen: '', destino: '', divergencias: '', observacao: '' };
  const colabs = todosCodigos().map(c => ({ valor: c, rotulo: `${nomeExib(c)} (${c})` }));
  abrirModal({
    titulo: existente ? 'Editar lançamento' : 'Incluir lançamento',
    largo: true,
    corpo: `<form class="form" id="form-lanc" novalidate>
      ${campo({ id: 'l-ano', rotulo: 'Ano', tipo: 'number', valor: base.ano, obrig: true, attrsExtra: { min: 2000, max: 2100, step: 1 } })}
      ${campo({ id: 'l-mes', rotulo: 'Mês', valor: base.mes, opcoes: MESES.map((m, i) => ({ valor: i + 1, rotulo: m })) })}
      ${campo({ id: 'l-funcao', rotulo: 'Função', valor: base.funcao, opcoes: FUNCOES.map(f => ({ valor: f.id, rotulo: f.nome })) })}
      ${campo({ id: 'l-colab', rotulo: 'Colaborador', valor: base.codigo || '', opcoes: [{ valor: '', rotulo: 'Selecione…' }, ...colabs, { valor: '__novo', rotulo: 'Outro (código novo)…' }] })}
      <div class="campo" data-campo="l-novo" hidden><label for="l-novo-cod">Código e nome do novo colaborador</label><div class="linha"><input class="inp" id="l-novo-cod" style="max-width:110px" placeholder="Código"><input class="inp" id="l-novo-nome" style="flex:1" placeholder="Nome completo (como no Kaizen)"></div><span class="ajuda">O colaborador entra no cadastro com esta função como principal e fica marcado para revisão.</span><span class="msg-erro" hidden></span></div>
      ${campo({ id: 'l-dias', rotulo: 'Dias trabalhados na função (lista)', valor: (base.diasLista || []).map(d => String(d).padStart(2, '0')).join(', '), full: true, ajuda: 'Como vem do Kaizen: 01, 02, 03… O número de dias é preenchido a partir da lista.', attrsExtra: { placeholder: '01, 02, 03, 06' } })}
      ${campo({ id: 'l-qdias', rotulo: 'Dias na função', tipo: 'number', valor: base.diasFuncao, obrig: true, attrsExtra: { min: 0, step: 1 } })}
      ${campo({ id: 'l-ped', rotulo: 'Pedidos (OM)', tipo: 'number', valor: base.pedidos, attrsExtra: { min: 0, step: 1 }, ajuda: 'Zero no recebimento.' })}
      ${campo({ id: 'l-nf', rotulo: 'NF conferidas', tipo: 'number', valor: base.nfs, attrsExtra: { min: 0, step: 1 }, ajuda: 'Zero na separação e na expedição.' })}
      ${campo({ id: 'l-skus', rotulo: 'Itens (SKU)', tipo: 'number', valor: base.skus, obrig: true, attrsExtra: { min: 0, step: 1 } })}
      ${campo({ id: 'l-unid', rotulo: 'Unidades', tipo: 'number', valor: base.unidades, obrig: true, attrsExtra: { min: 0, step: 'any' } })}
      ${campo({ id: 'l-media', rotulo: 'Média SKU/dia do Kaizen (opcional)', tipo: 'number', valor: base.mediaKaizen ?? '', attrsExtra: { min: 0, step: 'any' } })}
      ${campo({ id: 'l-div', rotulo: 'Divergências (opcional)', tipo: 'number', valor: base.divergencias ?? '', attrsExtra: { min: 0, step: 1 } })}
      ${campo({ id: 'l-dest', rotulo: 'Destino/canal (opcional)', valor: base.destino || '', attrsExtra: { placeholder: 'Loja Simão ou rota externa' } })}
      ${campo({ id: 'l-obs', rotulo: 'Observação', tipo: 'textarea', valor: base.observacao || '', full: true })}
    </form><div id="l-validacao" class="lista-validacao"></div>`,
    aoMontar: raiz => {
      const sel = $('#l-colab', raiz), bloco = $('[data-campo="l-novo"]', raiz);
      sel.addEventListener('change', () => { bloco.hidden = sel.value !== '__novo'; });
      $('#l-dias', raiz).addEventListener('input', ev => { const n = parseDias(ev.target.value).length; if (n) $('#l-qdias', raiz).value = n; });
    },
    botoes: [
      { rotulo: 'Cancelar', classe: 'fantasma' },
      { rotulo: existente ? 'Salvar alterações' : 'Incluir', classe: 'primario', acao: async ctrl => salvarFormLancamento(ctrl, existente) }
    ]
  });
}
async function salvarFormLancamento(ctrl, existente) {
  const raiz = ctrl.el;
  let codigo = lerCampo(raiz, 'l-colab');
  let nomeNovo = '';
  if (codigo === '__novo') { codigo = lerCampo(raiz, 'l-novo-cod').trim(); nomeNovo = lerCampo(raiz, 'l-novo-nome').trim().toUpperCase(); }
  const l = {
    ano: Math.round(lerNumero(raiz, 'l-ano') ?? NaN), mes: Number(lerCampo(raiz, 'l-mes')), funcao: lerCampo(raiz, 'l-funcao'), codigo: String(codigo || '').trim(),
    diasLista: [...new Set(parseDias(lerCampo(raiz, 'l-dias')))].sort((a, b) => a - b), diasFuncao: lerNumero(raiz, 'l-qdias'),
    pedidos: lerNumero(raiz, 'l-ped') ?? 0, nfs: lerNumero(raiz, 'l-nf') ?? 0, skus: lerNumero(raiz, 'l-skus'), unidades: lerNumero(raiz, 'l-unid')
  };
  const v = validarLancamento(l);
  if (!l.codigo) v.erros.push('Escolha o colaborador.');
  if (lerCampo(raiz, 'l-colab') === '__novo' && !nomeNovo) v.erros.push('Informe o nome do novo colaborador.');
  if (lerCampo(raiz, 'l-colab') === '__novo' && colab(l.codigo)) v.erros.push(`O código ${l.codigo} já existe no cadastro: selecione-o na lista.`);
  const novoId = idLancamento(l.ano, l.mes, l.codigo, l.funcao);
  if ((!existente || existente.id !== novoId) && S.lancamentos.has(novoId)) v.erros.push('Já existe lançamento para este colaborador, função e mês. Edite o existente.');
  if (Number.isInteger(l.ano) && l.mes >= 1 && mesFechado(ymDe(l.ano, l.mes))) v.erros.push(`${rotuloYM(ymDe(l.ano, l.mes))} está fechado. Reabra o mês em Parâmetros para lançar.`);
  const caixa = $('#l-validacao', raiz);
  if (v.erros.length) { caixa.innerHTML = avisoHTML('erro', `<b>Corrija antes de salvar:</b><ul style="margin:4px 0 0;padding-left:18px">${v.erros.map(e => `<li>${esc(e)}</li>`).join('')}</ul>`); return false; }
  if (v.alertas.length && !ctrl.alertasVistos) {
    ctrl.alertasVistos = true;
    caixa.innerHTML = avisoHTML('atencao', `<b>Confira:</b><ul style="margin:4px 0 0;padding-left:18px">${v.alertas.map(e => `<li>${esc(e)}</li>`).join('')}</ul>Clique de novo em salvar para gravar mesmo assim.`);
    return false;
  }
  const media = lerNumero(raiz, 'l-media'), divg = lerNumero(raiz, 'l-div');
  const doc = {
    ...(existente ? docLancamentoParaBanco(existente) : {}),
    ...l,
    nomeKaizen: existente && existente.codigo === l.codigo ? existente.nomeKaizen || nomeNovo || (colab(l.codigo)?.nome || '') : (nomeNovo || colab(l.codigo)?.nome || ''),
    mediaKaizen: media, divergencias: divg, destino: lerCampo(raiz, 'l-dest').trim() || null, observacao: lerCampo(raiz, 'l-obs').trim(),
    origem: existente ? existente.origem || 'manual' : 'manual',
    arquivo: existente ? existente.arquivo || null : null,
    importadoEm: existente ? existente.importadoEm || null : null,
    editadoEm: agoraISO()
  };
  if (!existente) { doc.pesoBruto = null; doc.volumeBruto = null; doc.suspeito = false; doc.motivoSuspeita = null; }
  const ops = [opGravar('lancamentos', novoId, doc)];
  if (existente && existente.id !== novoId) ops.unshift(opExcluir('lancamentos', existente.id));
  if (!colab(l.codigo)) {
    ops.push(opGravar('colaboradores', l.codigo, { codigo: l.codigo, nome: nomeNovo || doc.nomeKaizen || `CÓDIGO ${l.codigo}`, nomeCurto: nomeCurtoDe(nomeNovo || doc.nomeKaizen || ''), funcaoPrincipal: l.funcao, funcaoPrincipalSugerida: l.funcao, status: 'ativo', dataDesligamento: null, observacao: '', revisar: true, motivoRevisao: 'Incluído por lançamento manual: confirmar função principal.', rotasExternas: false, criadoEm: agoraISO(), atualizadoEm: agoraISO() }));
  }
  ctrl.ocupado(true);
  const okG = await gravarComHistorico(ops, {
    tipo: existente ? 'edicao' : 'inclusao', colecao: 'lancamentos', alvo: novoId, alvos: existente && existente.id !== novoId ? [existente.id, novoId] : [novoId],
    resumo: `${existente ? 'Lançamento editado' : 'Lançamento incluído'}: ${nomeExib(l.codigo)} · ${FUNC[l.funcao].nome} · ${rotuloYM(ymDe(l.ano, l.mes))}`,
    antes: existente ? docLancamentoParaBanco(existente) : null, depois: doc
  }, existente ? 'Lançamento atualizado. Painel, rankings e auditoria já refletem a mudança.' : 'Lançamento incluído. Painel, rankings e auditoria já refletem a mudança.');
  ctrl.ocupado(false);
  if (okG && existente && existente.id !== novoId && UI.rota === 'lancamento') { UI.params.id = novoId; const ult = UI.trilha[UI.trilha.length - 1]; if (ult.rota === 'lancamento') ult.params.id = novoId; }
  return okG;
}
Object.assign(ACOES, {
  'novo-lanc': () => abrirFormLancamento(null),
  'editar-lanc': p => { const l = S.lancamentos.get(p.id); if (l) abrirFormLancamento(l); },
  'excluir-lanc': async p => {
    const l = S.lancamentos.get(p.id);
    if (!l) return;
    if (mesFechado(l.ym)) { toast('Mês fechado: reabra em Parâmetros para excluir.', 'erro'); return; }
    const sim = await confirmar({ titulo: 'Excluir lançamento', texto: `<p>Excluir o lançamento de <b>${esc(nomeExib(l.codigo))}</b> em <b>${esc(FUNC[l.funcao].nome)}</b>, ${esc(rotuloYM(l.ym))}?</p><p class="muted">${l.diasFuncao} dias · ${fInt(l.documentos)} documentos · ${fInt(l.skus)} itens · ${fDx(l.unidades)} unidades. O conteúdo fica guardado no histórico.</p>`, rotuloOk: 'Excluir lançamento', perigo: true });
    if (!sim) return;
    const okG = await gravarComHistorico([opExcluir('lancamentos', l.id)], { tipo: 'exclusao', colecao: 'lancamentos', alvo: l.id, resumo: `Lançamento excluído: ${nomeExib(l.codigo)} · ${FUNC[l.funcao].nome} · ${rotuloYM(l.ym)}`, antes: docLancamentoParaBanco(l), depois: null }, 'Lançamento excluído.');
    if (okG && UI.rota === 'lancamento') voltar();
  },
  'suspeito-lanc': async p => {
    const l = S.lancamentos.get(p.id);
    if (!l) return;
    const doc = { ...docLancamentoParaBanco(l), suspeito: !l.suspeito, motivoSuspeita: !l.suspeito ? 'Marcado manualmente na auditoria' : null, editadoEm: agoraISO() };
    await gravarComHistorico([opGravar('lancamentos', l.id, doc)], { tipo: 'edicao', colecao: 'lancamentos', alvo: l.id, resumo: `${doc.suspeito ? 'Marcado' : 'Desmarcado'} como suspeito: ${nomeExib(l.codigo)} · ${FUNC[l.funcao].nome} · ${rotuloYM(l.ym)}`, antes: docLancamentoParaBanco(l), depois: doc }, doc.suspeito ? 'Marcado como suspeito.' : 'Marca de suspeito retirada.');
  },
  'excluir-mes': () => {
    if (!podeEditar()) return;
    const meses = mesesComDados().slice().reverse();
    if (!meses.length) { toast('Não há meses com lançamentos.', 'erro'); return; }
    const resumo = y => { const ls = lancamentosPeriodo(y, y); return `${ls.length} lançamentos · ${fInt(soma(ls, l => l.diasFuncao))} dias-função · ${fInt(soma(ls, l => l.skus))} itens · ${fInt(soma(ls, l => l.unidades))} unidades`; };
    abrirModal({
      titulo: 'Excluir um mês inteiro',
      corpo: `${avisoHTML('erro', 'Remove todos os lançamentos do mês escolhido. Use antes de reimportar um mês do zero, ou para desfazer uma importação errada. O conteúdo fica guardado no histórico.')}
        ${campo({ id: 'ex-mes', rotulo: 'Mês', valor: UI.ym, opcoes: meses.map(y => ({ valor: y, rotulo: `${rotuloYM(y)}${mesFechado(y) ? ' (fechado)' : ''}` })) })}
        <p class="muted" id="ex-resumo">${esc(resumo(meses.includes(UI.ym) ? UI.ym : meses[0]))}</p>
        ${campo({ id: 'ex-conf', rotulo: 'Para confirmar, digite EXCLUIR', valor: '', attrsExtra: { autocomplete: 'off' } })}`,
      aoMontar: raiz => { $('#ex-mes', raiz).addEventListener('change', ev => { $('#ex-resumo', raiz).textContent = resumo(Number(ev.target.value)); }); },
      botoes: [
        { rotulo: 'Cancelar', classe: 'fantasma' },
        { rotulo: 'Excluir mês', classe: 'perigo cheio', acao: async ctrl => {
          const y = Number(lerCampo(ctrl.el, 'ex-mes'));
          if (lerCampo(ctrl.el, 'ex-conf').trim().toUpperCase() !== 'EXCLUIR') { marcarErro(ctrl.el, 'ex-conf', 'Digite EXCLUIR para confirmar.'); return false; }
          if (mesFechado(y)) { marcarErro(ctrl.el, 'ex-mes', 'Mês fechado: reabra em Parâmetros antes.'); return false; }
          const ls = lancamentosPeriodo(y, y);
          ctrl.ocupado(true);
          const antes = Object.fromEntries(ls.map(l => [l.id, docLancamentoParaBanco(l)]));
          const okG = await gravarComHistorico(ls.map(l => opExcluir('lancamentos', l.id)), { tipo: 'exclusao', colecao: 'lancamentos', alvos: ls.map(l => l.id), resumo: `Mês inteiro excluído: ${rotuloYM(y)} (${ls.length} lançamentos)`, antes, depois: null, mapa: true }, `${rotuloYM(y)} excluído (${ls.length} lançamentos).`);
          ctrl.ocupado(false);
          return okG;
        } }
      ]
    });
  }
});
