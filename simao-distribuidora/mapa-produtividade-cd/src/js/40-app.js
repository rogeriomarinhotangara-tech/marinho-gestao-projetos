/* =========================================================================
   Casca do aplicativo: estado da interface, período, navegação com trilha,
   menu lateral, barra superior, barra inferior (celular) e renderização.
   ========================================================================= */

const UI = {
  rota: 'painel', params: {},
  trilha: [{ rota: 'painel', params: {} }],
  ym: null,                 // mês selecionado
  visao: 'mensal',          // mensal | acumulado
  inicioAcum: null,         // início do acumulado (padrão: janeiro do ano do mês)
  funcao: '',               // filtro global de função ('' = todas)
  leitura: 'principal',     // principal | todos
  funcaoModulo: 'separacao',
  exportar: null,           // modelo da tela atual para PDF/Excel
  gavetaAberta: false
};

const MENU = [
  { grupo: 'Análise', itens: [
    { rota: 'painel', rotulo: 'Painel Geral', ic: 'painel' },
    { rota: 'funcao', params: { f: 'recebimento' }, rotulo: 'Recebimento', ic: 'recebimento', func: 'recebimento' },
    { rota: 'funcao', params: { f: 'separacao' }, rotulo: 'Separação', ic: 'separacao', func: 'separacao' },
    { rota: 'funcao', params: { f: 'expedicao' }, rotulo: 'Conferência de Expedição', ic: 'expedicao', func: 'expedicao' },
    { rota: 'rankings', rotulo: 'Rankings', ic: 'ranking' },
    { rota: 'ficha', rotulo: 'Ficha do Colaborador', ic: 'ficha' },
    { rota: 'multifuncao', rotulo: 'Multifunção e Alocação', ic: 'multifuncao' },
    { rota: 'fluxo', rotulo: 'Fluxo e Capacidade', ic: 'fluxo' },
    { rota: 'alertas', rotulo: 'Alertas e Plano de Ação', ic: 'alertas', contador: true }
  ] },
  { grupo: 'Dados', itens: [
    { rota: 'lancamentos', rotulo: 'Lançamentos', ic: 'lancamentos' },
    { rota: 'importar', rotulo: 'Importar Extração', ic: 'importar', editor: true },
    { rota: 'colaboradores', rotulo: 'Colaboradores', ic: 'colaboradores' },
    { rota: 'parametros', rotulo: 'Parâmetros e Metas', ic: 'parametros' },
    { rota: 'auditoria', rotulo: 'Auditoria', ic: 'auditoria' }
  ] },
  { grupo: 'Saídas', itens: [
    { rota: 'relatorios', rotulo: 'Relatórios e Exportação', ic: 'relatorios' },
    { rota: 'guia', rotulo: 'Guia de Uso', ic: 'guia' }
  ] }
];

const VIEWS = {};       // rota -> função que devolve { titulo, html, exportar }
const ROTULOS_ROTA = {
  painel: () => 'Painel',
  funcao: p => FUNC[p.f] ? FUNC[p.f].nome : 'Função',
  rankings: () => 'Rankings',
  ficha: p => p.codigo ? nomeExib(p.codigo) : 'Ficha do Colaborador',
  fichaMes: p => rotuloYM(p.ym),
  multifuncao: () => 'Multifunção e Alocação',
  fluxo: () => 'Fluxo e Capacidade',
  alertas: () => 'Alertas e Plano de Ação',
  lancamentos: () => 'Lançamentos',
  lancamento: () => 'Lançamento',
  importar: () => 'Importar Extração',
  colaboradores: () => 'Colaboradores',
  parametros: () => 'Parâmetros e Metas',
  auditoria: () => 'Auditoria',
  relatorios: () => 'Relatórios e Exportação',
  guia: () => 'Guia de Uso',
  indicador: p => ({ documentos: 'Documentos', itens: 'Itens', unidades: 'Unidades', dias: 'Dias-função', colaboradores: 'Colaboradores ativos', situacao: 'Situação frente à meta', indice: 'Índice do CD' }[p.id] || 'Indicador')
};

/* ---------- período ---------- */
function periodo() {
  const fim = UI.ym;
  if (fim == null) return null;
  if (UI.visao === 'acumulado') {
    let ini = UI.inicioAcum != null && UI.inicioAcum <= fim ? UI.inicioAcum : ymDe(anoDe(fim), 1);
    return { ini, fim, mensal: false, rotulo: rotuloPeriodo(ini, fim), rotuloLongo: ini === fim ? rotuloYM(fim) : `${rotuloYM(ini)} a ${rotuloYM(fim)}` };
  }
  return { ini: fim, fim, mensal: true, rotulo: rotuloYM(fim), rotuloLongo: rotuloYM(fim) };
}
function periodoAnteriorUI() {
  const p = periodo();
  if (!p) return null;
  const a = periodoAnterior(p.ini, p.fim, UI.visao);
  if (!a || !lancamentosPeriodo(a[0], a[1]).length) return null;
  return { ini: a[0], fim: a[1], rotulo: UI.visao === 'acumulado' ? `acumulado até ${rotuloYM(a[1]).toLowerCase()}` : rotuloYM(a[1]).toLowerCase() };
}
function mesesDoAnoAte(ym) {
  const meses = mesesComDados();
  return meses.filter(y => anoDe(y) === anoDe(ym) && y <= ym);
}
function rotuloLeitura() { return UI.leitura === 'principal' ? 'Função principal' : 'Todos os lançamentos'; }

/* ---------- navegação ---------- */
function navegar(rota, params = {}, modo = 'menu') {
  if (rota === 'importar' && !podeEditar()) { toast('Importar é exclusivo de quem pode editar o painel.', 'erro'); return; }
  if (params && params.ym != null && Number.isFinite(params.ym)) UI.ym = params.ym;
  if (rota === 'funcao' && params.f) UI.funcaoModulo = params.f;
  const novo = { rota, params: { ...params } };
  if (modo === 'menu') {
    UI.trilha = rota === 'painel' ? [{ rota: 'painel', params: {} }] : [{ rota: 'painel', params: {} }, novo];
  } else if (modo === 'detalhe') {
    const ult = UI.trilha[UI.trilha.length - 1];
    if (!(ult.rota === rota && iguais(ult.params, novo.params))) {
      if (rota === 'ficha' && params.ym != null && !(ult.rota === 'ficha' && ult.params.codigo === params.codigo)) {
        UI.trilha.push({ rota: 'ficha', params: { codigo: params.codigo } });
        UI.trilha.push({ rota: 'ficha', params: { codigo: params.codigo, ym: params.ym, f: params.f }, mes: true });
      } else if (rota === 'ficha' && params.ym != null) {
        UI.trilha.push({ ...novo, mes: true });
      } else UI.trilha.push(novo);
    }
  }
  UI.rota = rota;
  UI.params = { ...params };
  UI.gavetaAberta = false;
  salvarPreferencias();
  render({ rolarTopo: true });
}
function voltar() {
  if (UI.trilha.length <= 1) { navegar('painel', {}, 'menu'); return; }
  UI.trilha.pop();
  const ult = UI.trilha[UI.trilha.length - 1];
  UI.rota = ult.rota; UI.params = { ...ult.params };
  if (ult.params.ym != null) UI.ym = ult.params.ym;
  salvarPreferencias();
  render({ rolarTopo: true });
}
function irTrilha(i) {
  UI.trilha = UI.trilha.slice(0, i + 1);
  const ult = UI.trilha[i];
  UI.rota = ult.rota; UI.params = { ...ult.params };
  if (ult.params.ym != null) UI.ym = ult.params.ym;
  salvarPreferencias();
  render({ rolarTopo: true });
}
function salvarPreferencias() {
  Preferencias.gravar({ rota: UI.rota, params: UI.params, trilha: UI.trilha, ym: UI.ym, visao: UI.visao, inicioAcum: UI.inicioAcum, funcao: UI.funcao, leitura: UI.leitura, funcaoModulo: UI.funcaoModulo });
}
function restaurarPreferencias() {
  const p = Preferencias.ler();
  if (p.visao === 'acumulado' || p.visao === 'mensal') UI.visao = p.visao;
  if (p.leitura === 'principal' || p.leitura === 'todos') UI.leitura = p.leitura;
  if (p.funcao === '' || FUNC[p.funcao]) UI.funcao = p.funcao || '';
  if (FUNC[p.funcaoModulo]) UI.funcaoModulo = p.funcaoModulo;
  if (Number.isFinite(p.ym)) UI.ym = p.ym;
  if (Number.isFinite(p.inicioAcum)) UI.inicioAcum = p.inicioAcum;
  if (p.rota && VIEWS_VALIDAS.includes(p.rota)) {
    UI.rota = p.rota; UI.params = p.params || {};
    UI.trilha = Array.isArray(p.trilha) && p.trilha.length ? p.trilha.filter(t => VIEWS_VALIDAS.includes(t.rota)) : [{ rota: 'painel', params: {} }];
    if (!UI.trilha.length) UI.trilha = [{ rota: 'painel', params: {} }];
  }
}
const VIEWS_VALIDAS = ['painel', 'funcao', 'rankings', 'ficha', 'multifuncao', 'fluxo', 'alertas', 'lancamentos', 'lancamento', 'importar', 'colaboradores', 'parametros', 'auditoria', 'relatorios', 'guia', 'indicador'];

/* ---------- casca ---------- */
function htmlMenu() {
  const nAlertas = UI.ym != null && S.status === 'pronto' ? alertasDoMes(UI.ym).filter(a => a.gravidade === 'alta').length : 0;
  return MENU.map(g => `<nav class="menu-grupo" aria-label="${esc(g.grupo)}"><div class="rotulo-grupo">${esc(g.grupo)}</div>${g.itens.filter(i => !i.editor || podeEditar()).map(i => {
    const ativo = UI.rota === i.rota && (!i.params || (i.params.f === UI.params.f));
    const ativoIndicador = i.rota === 'painel' && UI.rota === 'indicador';
    const ativoLanc = i.rota === 'lancamentos' && UI.rota === 'lancamento';
    return `<button type="button" class="menu-item"${dataAcao('menu', { rota: i.rota, params: i.params || {} })}${(ativo || ativoIndicador || ativoLanc) ? ' aria-current="page"' : ''}>${icone(i.ic)}<span>${esc(i.rotulo)}</span>${i.func ? `<i class="ponto-func" style="background:var(${FUNC[i.func].cor})"></i>` : ''}${i.contador && nAlertas ? `<span class="cont" data-dica="Alertas de prioridade alta no mês">${nAlertas}</span>` : ''}</button>`;
  }).join('')}</nav>`).join('');
}
function htmlRodapeLateral() {
  const modo = podeEditar()
    ? '<span class="chip-modo editor"><i class="bolinha"></i>Modo editor</span>'
    : `<span class="chip-modo"><i class="bolinha"></i>Somente leitura</span>`;
  const ult = [...S.importacoes.values()].sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')))[0];
  return `${modo}
    ${ult ? `<span>Última importação: ${esc(fDataHora(ult.data))}</span>` : ''}
    ${S.ultimaAtualizacao ? `<span>Dados sincronizados às ${esc(S.ultimaAtualizacao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))}</span>` : ''}
    <span class="fraco">Fonte: coletor Kaizen integrado ao Winthor</span>`;
}
function opcoesMes() {
  const meses = mesesDisponiveis();
  if (!meses.length) return '<option value="">Sem meses</option>';
  return meses.slice().reverse().map(y => `<option value="${y}"${y === UI.ym ? ' selected' : ''}>${esc(rotuloYM(y))}</option>`).join('');
}
function htmlTopo() {
  const p = periodo();
  const temDados = mesesComDados().length > 0;
  const im = UI.ym != null ? infoMes(UI.ym) : null;
  const quebraNoPeriodo = p && quebrasNoIntervalo(p.ini, p.fim).length > 0;
  const escopo = im ? `<span class="chip-escopo${quebraNoPeriodo ? ' quebra' : ''}" data-dica="${esc(quebraNoPeriodo ? 'Quebra de série no período: o volume a partir daqui inclui operação que antes não era medida no coletor.' : 'O que o coletor registrou neste mês.')}">${icone(quebraNoPeriodo ? 'atencao' : 'info')}<span>Escopo: ${esc(im.escopo)}</span></span>` : '';
  const iniOpts = p && !p.mensal ? mesesComDados().filter(y => y <= UI.ym).map(y => `<option value="${y}"${y === p.ini ? ' selected' : ''}>${esc(rotuloYM(y))}</option>`).join('') : '';
  return `<div class="topo-linha">
      <button type="button" class="btn fantasma btn-icone so-celular" data-acao="gaveta" aria-label="Abrir menu">${icone('menu')}</button>
      <div class="titulo-sistema"><span class="logo-mini"><img src="${LOGO_CHAPEU}" alt="Simão Distribuidora"></span><span class="t1">Simão Distribuidora — CD</span><span class="sep">|</span><span class="t2">Mapa de Produtividade</span></div>
      <label class="campo-topo"><span class="so-desktop">Mês</span><select class="sel mes" id="sel-mes" aria-label="Mês de referência"${temDados ? '' : ' disabled'}>${opcoesMes()}</select></label>
      ${podeBaixar() ? `<div class="filtros so-desktop">
        <button type="button" class="btn" data-acao="exportar-pdf"${temDados ? '' : ' disabled'}>${icone('pdf')}<span>Exportar PDF</span></button>
        <button type="button" class="btn" data-acao="exportar-excel"${temDados ? '' : ' disabled'}>${icone('excel')}<span>Exportar Excel</span></button>
      </div>` : ''}
      <button type="button" class="btn btn-icone so-celular btn-filtros" data-acao="filtros-topo" aria-label="Visão, função e escopo" aria-expanded="${UI.filtrosAbertos ? 'true' : 'false'}">${icone('parametros')}${UI.visao === 'acumulado' || UI.funcao ? '<i class="marca-filtro" aria-hidden="true"></i>' : ''}</button>
      ${podeBaixar() ? `<button type="button" class="btn btn-icone so-celular" data-acao="menu-exportar" aria-label="Exportar"${temDados ? '' : ' disabled'}>${icone('baixar')}</button>` : ''}
    </div>
    <div class="filtros-linha2">
      <div class="seg" role="group" aria-label="Visão">
        <button type="button" data-acao="visao" data-p='"mensal"' aria-pressed="${UI.visao === 'mensal'}">Mensal</button>
        <button type="button" data-acao="visao" data-p='"acumulado"' aria-pressed="${UI.visao === 'acumulado'}">Acumulado</button>
      </div>
      ${p && !p.mensal ? `<label class="campo-topo">desde <select class="sel" id="sel-inicio" aria-label="Início do acumulado">${iniOpts}</select></label>` : ''}
      <label class="campo-topo"><span class="so-desktop">Função</span><select class="sel" id="sel-funcao" aria-label="Filtro de função"><option value="">Todas as funções</option>${FUNCOES.map(f => `<option value="${f.id}"${UI.funcao === f.id ? ' selected' : ''}>${esc(f.nome)}</option>`).join('')}</select></label>
      ${escopo}
    </div>`;
}
function htmlTrilha() {
  if (UI.trilha.length <= 1 && UI.rota === 'painel') return '';
  const itens = UI.trilha.map((t, i) => {
    const rot = t.mes ? ROTULOS_ROTA.fichaMes(t.params) : (ROTULOS_ROTA[t.rota] ? ROTULOS_ROTA[t.rota](t.params || {}) : t.rota);
    if (i === UI.trilha.length - 1) return `<span class="atual" aria-current="page">${esc(rot)}</span>`;
    return `<button type="button"${dataAcao('trilha', i)}>${esc(rot)}</button><span class="seta" aria-hidden="true">›</span>`;
  }).join('');
  return `<nav class="trilha" aria-label="Caminho">${UI.trilha.length > 1 ? `<button type="button" data-acao="voltar" aria-label="Voltar">${icone('voltar')}</button>` : ''}${itens}</nav>`;
}
function htmlBarraInferior() {
  const r = UI.rota;
  const item = (rota, rotulo, ic, params) => `<button type="button"${dataAcao('menu', { rota, params: params || {} })}${r === rota ? ' aria-current="page"' : ''}>${icone(ic)}<span>${rotulo}</span></button>`;
  return item('painel', 'Painel', 'painel') + item('funcao', 'Funções', 'separacao', { f: UI.funcaoModulo }) + item('rankings', 'Ranking', 'ranking') + item('ficha', 'Colaborador', 'ficha');
}
function montarCasca() {
  document.getElementById('app').innerHTML = `
    <aside class="lateral" id="lateral" aria-label="Menu principal">
      <div class="marca"><span class="logo-tile"><img src="${LOGO_SIMAO}" alt="Simão Distribuidora"></span><span class="sub">CD Rio Branco/AC · Mapa de Produtividade</span></div>
      <div id="menu"></div>
      <div class="rodape-lateral" id="rodape-lateral"></div>
    </aside>
    <div class="fundo-gaveta" id="fundo-gaveta" data-acao="fechar-gaveta"></div>
    <div class="principal">
      <header class="topo" id="topo"></header>
      <main class="conteudo" id="conteudo" tabindex="-1"></main>
    </div>
    <nav class="barra-inferior" id="barra-inferior" aria-label="Atalhos"></nav>`;
}

/* ---------- renderização ---------- */
let renderAgendado = false;
function agendarRender() {
  if (renderAgendado) return;
  renderAgendado = true;
  requestAnimationFrame(() => { renderAgendado = false; render({ dados: true }); });
}
function ajustarMesSelecionado() {
  const meses = mesesDisponiveis();
  const comDados = mesesComDados();
  if (!meses.length) { UI.ym = null; return; }
  if (UI.ym == null || !meses.includes(UI.ym)) UI.ym = comDados.length ? comDados[comDados.length - 1] : meses[meses.length - 1];
}
function render({ rolarTopo = false, dados = false } = {}) {
  const conteudo = document.getElementById('conteudo');
  if (!conteudo) return;
  if (S.status === 'pronto') ajustarMesSelecionado();
  const yAntes = window.scrollY;
  const focoId = document.activeElement && document.activeElement.id && conteudo.contains(document.activeElement) ? document.activeElement.id : null;
  let selecao = null;
  if (focoId) { try { selecao = [document.activeElement.selectionStart, document.activeElement.selectionEnd]; } catch (e) { selecao = null; } }
  document.getElementById('menu').innerHTML = htmlMenu();
  document.getElementById('rodape-lateral').innerHTML = htmlRodapeLateral();
  document.getElementById('topo').innerHTML = htmlTopo();
  document.getElementById('topo').classList.toggle('filtros-abertos', !!UI.filtrosAbertos);
  document.getElementById('barra-inferior').innerHTML = htmlBarraInferior();
  document.getElementById('lateral').classList.toggle('aberta', UI.gavetaAberta);
  document.getElementById('fundo-gaveta').classList.toggle('aberta', UI.gavetaAberta);
  GRAF.pendentes = [];
  let r;
  try {
    r = conteudoDaRota();
  } catch (e) {
    console.error(e);
    r = { titulo: 'Erro', html: avisoHTML('erro', `Não foi possível montar esta tela: ${esc(e.message)}. Volte ao Painel e tente de novo.`, botao('Ir para o Painel', 'menu', { rota: 'painel', params: {} }, { classe: 'primario' })) };
  }
  UI.exportar = r.exportar || null;
  const avisoLeitura = S.leituraForcada ? avisoHTML('erro', esc(S.motivoLeitura)) : '';
  conteudo.innerHTML = htmlTrilha() + avisoLeitura + r.html;
  montarGraficos();
  if (r.depois) try { r.depois(conteudo); } catch (e) { console.error(e); }
  document.title = 'Mapa de Produtividade — CD Simão';
  if (rolarTopo) { window.scrollTo(0, 0); }
  else { window.scrollTo(0, yAntes); }
  if (focoId && !rolarTopo) {
    const el = document.getElementById(focoId);
    if (el) { try { el.focus({ preventScroll: true }); if (selecao && selecao[0] != null) el.setSelectionRange(selecao[0], selecao[1]); } catch (e) { /* sem foco */ } }
  }
}
function conteudoDaRota() {
  if (S.status === 'sem-runtime') return { html: telaSemRuntime() };
  if (S.status === 'sem-db') return { html: telaSemBanco() };
  if (S.status === 'revogado') return { html: avisoHTML('erro', 'O acesso a este painel foi retirado enquanto a página estava aberta. Recarregue a página ou peça um novo convite ao responsável.') };
  if (S.status === 'conectando') return { html: '<div class="carregando"><span class="giro"></span>Carregando os dados do painel…</div>' };
  const semDados = !mesesComDados().length;
  const precisaDados = !['importar', 'colaboradores', 'parametros', 'guia', 'relatorios', 'lancamentos', 'auditoria'].includes(UI.rota);
  if (semDados && precisaDados) return { html: telaVazia() };
  const fn = VIEWS[UI.rota] || VIEWS.painel;
  return fn(UI.params || {});
}
function telaVazia() {
  return `<div class="bloco"><div class="vazio">${icone('importar')}
    <h2>Nenhum mês importado — importe a extração do Kaizen</h2>
    <p>${podeEditar() ? 'Abra "Importar Extração", solte o arquivo do mês (.xlsx, .xls ou .csv), confira a pré-visualização e confirme. O painel se monta sozinho a partir daí.' : 'Assim que o responsável importar a primeira extração do Kaizen, os painéis, rankings e relatórios aparecem aqui automaticamente.'}</p>
    ${podeEditar() ? botao('Importar extração do Kaizen', 'menu', { rota: 'importar', params: {} }, { classe: 'primario', ic: 'importar' }) : ''}
    ${botao('Ler o Guia de Uso', 'menu', { rota: 'guia', params: {} }, { classe: 'fantasma', ic: 'guia' })}
  </div></div>`;
}
function telaSemRuntime() {
  return `<div class="bloco"><div class="vazio">${icone('info')}
    <h2>Abra este painel pelo link do claude.ai</h2>
    <p>Os dados ficam no banco compartilhado do painel e só aparecem quando a página é aberta pelo endereço publicado no claude.ai, com a sua conta conectada.</p>
  </div></div>`;
}
function telaSemBanco() {
  return `<div class="bloco"><div class="vazio">${icone('cadeado')}
    <h2>Não foi possível acessar os dados</h2>
    <p>Entre na sua conta do claude.ai e abra o link de novo. Se o problema continuar, peça ao responsável pelo painel para conferir o seu acesso.</p>
  </div></div>`;
}
function cabecalhoTela(titulo, subtitulo = '', acoes = '') {
  return `<div class="cab-tela"><div class="esq"><h1>${esc(titulo)}</h1>${subtitulo ? `<p class="subtitulo">${subtitulo}</p>` : ''}</div>${acoes ? `<div class="dir">${acoes}</div>` : ''}</div>`;
}
function avisoQuebraPeriodo(p) {
  const qs = quebrasNoIntervalo(p.mensal ? p.fim : p.ini, p.fim);
  if (!qs.length) return '';
  const y = qs[qs.length - 1];
  const im = infoMes(y);
  return avisoHTML('atencao', `<b>Quebra de série em ${esc(rotuloYM(y).toLowerCase())}.</b> Escopo da coleta: ${esc(im.escopo)}. O aumento de volume a partir daqui vem da entrada das rotas externas no coletor, não de ganho de produtividade. Comparações com os meses anteriores devem ser lidas com essa ressalva.${P().inicioRotasConfirmado ? '' : ' A data de início ainda precisa ser confirmada em Parâmetros.'}`);
}

/* ---------- eventos globais ---------- */
const ACOES = {};
function ligarEventos() {
  document.addEventListener('click', ev => {
    const el = ev.target.closest('[data-acao]');
    if (!el || el.disabled) return;
    const controle = ev.target.closest('select, input, textarea, label, a[href]');
    if (controle && controle !== el && el.contains(controle)) return;
    const acao = el.getAttribute('data-acao');
    let p = null;
    const raw = el.getAttribute('data-p');
    if (raw) { try { p = JSON.parse(raw); } catch (e) { p = raw; } }
    const fn = ACOES[acao];
    if (fn) { ev.preventDefault(); fn(p, el, ev); }
  });
  document.addEventListener('keydown', ev => {
    if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches && ev.target.matches('tr[data-acao], td[data-acao], div[data-acao][tabindex]')) {
      ev.preventDefault();
      ev.target.click();
    }
    if (ev.key === 'Escape' && UI.gavetaAberta) { UI.gavetaAberta = false; render(); }
  });
  document.addEventListener('change', ev => {
    const id = ev.target.id;
    if (id === 'sel-mes') {
      const v = Number(ev.target.value);
      if (Number.isFinite(v)) {
        UI.ym = v;
        if (UI.inicioAcum != null && (UI.inicioAcum > v || anoDe(UI.inicioAcum) !== anoDe(v))) UI.inicioAcum = null;
        const ult = UI.trilha[UI.trilha.length - 1];
        if (ult && ult.params && ult.params.ym != null) { ult.params.ym = v; UI.params.ym = v; }
        salvarPreferencias();
        render();
      }
    } else if (id === 'sel-inicio') {
      UI.inicioAcum = Number(ev.target.value);
      salvarPreferencias(); render();
    } else if (id === 'sel-funcao') {
      UI.funcao = ev.target.value || '';
      if (UI.funcao) UI.funcaoModulo = UI.funcao;
      if (UI.rota === 'funcao' && UI.funcao) { UI.params.f = UI.funcao; const ult = UI.trilha[UI.trilha.length - 1]; if (ult.rota === 'funcao') ult.params.f = UI.funcao; }
      salvarPreferencias(); render();
    }
  });
  const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  if (mq && mq.addEventListener) mq.addEventListener('change', () => render());
  new MutationObserver(() => render()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}
Object.assign(ACOES, {
  menu: p => navegar(p.rota, p.params || {}, 'menu'),
  ir: p => navegar(p.rota, p.params || {}, 'detalhe'),
  trilha: i => irTrilha(i),
  voltar: () => voltar(),
  gaveta: () => { UI.gavetaAberta = true; render(); setTimeout(() => { const b = $('#lateral .menu-item'); if (b) b.focus(); }, 50); },
  'fechar-gaveta': () => { UI.gavetaAberta = false; render(); },
  'filtros-topo': () => { UI.filtrosAbertos = !UI.filtrosAbertos; render(); },
  visao: v => { UI.visao = v === 'acumulado' ? 'acumulado' : 'mensal'; salvarPreferencias(); render(); },
  leitura: v => { UI.leitura = v === 'todos' ? 'todos' : 'principal'; salvarPreferencias(); render(); },
  ficha: p => navegar('ficha', { codigo: String(p.codigo), ym: p.ym ?? UI.ym, f: p.f }, 'detalhe'),
  'exportar-pdf': () => exportarTelaPDF(),
  'exportar-excel': () => exportarTelaExcel(),
  'menu-exportar': () => {
    abrirModal({
      titulo: 'Exportar esta tela',
      corpo: `<p class="muted">Gera o arquivo com o que está na tela agora: mês, visão e filtros aplicados.</p>`,
      botoes: [
        { rotulo: 'Exportar PDF', classe: 'primario', ic: 'pdf', acao: () => { exportarTelaPDF(); } },
        { rotulo: 'Exportar Excel', ic: 'excel', acao: () => { exportarTelaExcel(); } }
      ]
    });
  }
});
