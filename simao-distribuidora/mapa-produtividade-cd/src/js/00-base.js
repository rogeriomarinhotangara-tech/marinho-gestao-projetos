
/* =========================================================================
   Mapa de Produtividade — CD Simão
   Base: constantes, formatação pt-BR, utilidades de texto, datas e ícones.
   ========================================================================= */

const SISTEMA = 'Mapa de Produtividade — CD Simão';
const EMPRESA = 'Simão Distribuidora — CD';
const VERSAO_DADOS = 1;

const FUNCOES = [
  { id: 'recebimento', nome: 'Recebimento', nomeLongo: 'Conferência de Recebimento', curto: 'Receb.', sigla: 'REC',
    doc: 'NF', docPlural: 'NF', docNome: 'notas fiscais', verboItens: 'conferidos no recebimento', cor: '--f-rec', menu: 'recebimento' },
  { id: 'separacao', nome: 'Separação', nomeLongo: 'Separação', curto: 'Sep.', sigla: 'SEP',
    doc: 'pedido', docPlural: 'pedidos', docNome: 'pedidos (OM)', verboItens: 'separados', cor: '--f-sep', menu: 'separacao' },
  { id: 'expedicao', nome: 'Conferência de Expedição', nomeLongo: 'Conferência de Expedição', curto: 'Exp.', sigla: 'EXP',
    doc: 'pedido', docPlural: 'pedidos', docNome: 'pedidos (OM)', verboItens: 'conferidos na expedição', cor: '--f-exp', menu: 'expedicao' }
];
const FUNC = Object.fromEntries(FUNCOES.map(f => [f.id, f]));
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

const PARAMETROS_PADRAO = {
  minimoDias: 5,
  pesoItens: 0.6,
  pesoQuantidade: 0.4,
  tolerancia: 0.85,
  limiteConcentracao: 0.30,
  limiteQueda: 0.20,
  fatorMediana: 2,
  mesesNovato: 3,
  mesesSemMovimento: 2,
  inicioRotasExternas: '2026-09-22',
  inicioRotasConfirmado: false,
  minimoDiasMeta: 10
};

const SITUACOES = {
  acima: { rotulo: 'Acima da meta', curto: 'Acima' },
  na: { rotulo: 'Na meta', curto: 'Na meta' },
  abaixo: { rotulo: 'Abaixo da meta', curto: 'Abaixo' },
  insuf: { rotulo: 'Dias insuficientes', curto: 'Dias insuf.' },
  semmeta: { rotulo: 'Sem meta vigente', curto: 'Sem meta' }
};

const SITUACAO_COLAB = {
  ativo: 'Ativo',
  desligado: 'Desligado'
};

/* ---------- DOM ---------- */
const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => Array.from(raiz.querySelectorAll(sel));
function esc(v) {
  if (v === null || v === undefined) return '';
  return String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function attrs(obj) {
  return Object.entries(obj || {}).filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => v === true ? ` ${k}` : ` ${k}="${esc(v)}"`).join('');
}
function dataAcao(acao, params) {
  return attrs({ 'data-acao': acao, 'data-p': params ? JSON.stringify(params) : undefined });
}

/* ---------- números ---------- */
const NF = {
  i: new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }),
  d1: new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
  d2: new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  dx: new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }),
  p0: new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 }),
  p1: new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 })
};
const TRACO = '—';
const ok = v => v !== null && v !== undefined && Number.isFinite(v);
const fInt = v => ok(v) ? NF.i.format(v) : TRACO;
const fD1 = v => ok(v) ? NF.d1.format(v) : TRACO;
const fD2 = v => ok(v) ? NF.d2.format(v) : TRACO;
const fDx = v => ok(v) ? NF.dx.format(v) : TRACO;
const fPct = v => ok(v) ? NF.p0.format(v) : TRACO;
const fPct1 = v => ok(v) ? NF.p1.format(v) : TRACO;
function fNum(v, formato) {
  switch (formato) {
    case 'int': return fInt(v);
    case 'd1': return fD1(v);
    case 'd2': return fD2(v);
    case 'dx': return fDx(v);
    case 'pct': return fPct(v);
    case 'pct1': return fPct1(v);
    default: return ok(v) ? String(v) : (v ?? '');
  }
}
function fSinal(v, formato) {
  if (!ok(v)) return TRACO;
  const s = fNum(Math.abs(v), formato);
  return (v > 0 ? '+' : v < 0 ? '−' : '') + s;
}
function compacto(v) {
  if (!ok(v)) return TRACO;
  const a = Math.abs(v);
  if (a >= 1e6) return NF.d1.format(v / 1e6) + ' mi';
  if (a >= 1e4) return NF.i.format(v / 1e3) + ' mil';
  return NF.i.format(v);
}
const div = (a, b) => (ok(a) && ok(b) && b !== 0) ? a / b : null;
const soma = (arr, f) => arr.reduce((s, x) => s + (f ? (f(x) || 0) : (x || 0)), 0);
function arred(v, casas = 0) { const m = 10 ** casas; return Math.round(v * m) / m; }
function mediana(valores) {
  const v = valores.filter(ok).slice().sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}
/* percentil inclusivo, igual ao PERCENTIL/QUARTIL do Excel (PERCENTILE.INC) */
function percentilInc(valores, p) {
  const v = valores.filter(ok).slice().sort((a, b) => a - b);
  if (!v.length) return null;
  const pos = (v.length - 1) * p, lo = Math.floor(pos), hi = Math.ceil(pos);
  return v[lo] + (v[hi] - v[lo]) * (pos - lo);
}

/* ---------- texto ---------- */
/* tira o ponto final para a frase poder ser composta sem ".." */
function semPonto(t) { return String(t ?? '').trim().replace(/[.;]+$/, ''); }
function norm(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[³]/g, '3').replace(/[^a-z0-9]+/g, ' ').trim();
}
const PREPOSICOES = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);
const ACENTOS_NOMES = { joao: 'João', deoclecio: 'Deoclécio' };
function capitalizar(p) {
  const k = norm(p);
  if (ACENTOS_NOMES[k]) return ACENTOS_NOMES[k];
  const low = p.toLocaleLowerCase('pt-BR');
  return low.charAt(0).toLocaleUpperCase('pt-BR') + low.slice(1);
}
function nomeCurtoDe(nome) {
  const partes = String(nome || '').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '';
  const uteis = partes.filter(p => !PREPOSICOES.has(norm(p)));
  if (uteis.length <= 1) return capitalizar(uteis[0] || partes[0]);
  return capitalizar(uteis[0]) + ' ' + capitalizar(uteis[uteis.length - 1]);
}
function nomeTitulo(nome) {
  return String(nome || '').trim().split(/\s+/).map(p => PREPOSICOES.has(norm(p)) ? p.toLocaleLowerCase('pt-BR') : capitalizar(p)).join(' ');
}
function iniciais(nome) {
  const p = String(nome || '').trim().split(/\s+/).filter(x => !PREPOSICOES.has(norm(x)));
  return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}
function corAvatar(codigo) {
  const cores = ['#7D0003', '#B53A1E', '#8D2661', '#4C7FD3', '#2F6E62', '#6B4E9B', '#A2541A', '#5D6B2E'];
  let h = 0; for (const c of String(codigo)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return cores[h % cores.length];
}
function plural(n, um, varios) { return `${fInt(n)} ${n === 1 ? um : varios}`; }

/* ---------- meses ---------- */
/* ym = índice mensal contínuo (ano*12 + mês-1): facilita "mês anterior" atravessando o ano */
const ymDe = (ano, mes) => ano * 12 + (mes - 1);
const anoDe = ym => Math.floor(ym / 12);
const mesDe = ym => (ym % 12) + 1;
const chaveYM = ym => `${anoDe(ym)}-${String(mesDe(ym)).padStart(2, '0')}`;
function ymDeChave(ch) { const m = /^(\d{4})-(\d{2})$/.exec(String(ch || '')); return m ? ymDe(+m[1], +m[2]) : null; }
const rotuloYM = ym => `${MESES[mesDe(ym) - 1]}/${anoDe(ym)}`;
const rotuloYMCurto = ym => `${MESES_CURTOS[mesDe(ym) - 1]}/${String(anoDe(ym)).slice(2)}`;
const nomeMes = ym => MESES[mesDe(ym) - 1];
const diasNoMes = (ano, mes) => new Date(ano, mes, 0).getDate();
function mesDoTexto(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number' && v >= 1 && v <= 12) return Math.round(v);
  if (v instanceof Date && !isNaN(v)) return v.getMonth() + 1;
  const t = norm(v);
  if (!t) return null;
  if (/^\d{1,2}$/.test(t) && +t >= 1 && +t <= 12) return +t;
  const nomes = MESES.map(m => norm(m));
  let i = nomes.indexOf(t);
  if (i >= 0) return i + 1;
  i = nomes.findIndex(n => t.startsWith(n.slice(0, 3)));
  return i >= 0 ? i + 1 : null;
}
function rotuloPeriodo(inicio, fim) {
  if (inicio === fim) return rotuloYM(fim);
  if (anoDe(inicio) === anoDe(fim)) return `${MESES_CURTOS[mesDe(inicio) - 1]}–${MESES_CURTOS[mesDe(fim) - 1]}/${anoDe(fim)}`;
  return `${rotuloYMCurto(inicio)} a ${rotuloYMCurto(fim)}`;
}

/* ---------- datas ---------- */
function agoraISO() { return new Date().toISOString(); }
function fData(iso) {
  if (!iso) return TRACO;
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
  if (isNaN(d)) return TRACO;
  return d.toLocaleDateString('pt-BR');
}
function fDataHora(iso) {
  if (!iso) return TRACO;
  const d = new Date(iso);
  if (isNaN(d)) return TRACO;
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function dataCurta(iso) { // '2026-09-22' -> '22/09'
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `${m[3]}/${m[2]}` : '';
}

/* ---------- diversos ---------- */
function novoId(prefixo = '') {
  return prefixo + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function idLancamento(ano, mes, codigo, funcao) {
  return `${ano}-${String(mes).padStart(2, '0')}-${String(codigo).replace(/[^A-Za-z0-9_.~:@+-]/g, '_')}-${funcao}`;
}
function clonar(o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); }
function iguais(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
function porCodigo(a, b) {
  const na = Number(a), nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  return String(a).localeCompare(String(b), 'pt-BR');
}
function dormir(ms) { return new Promise(r => setTimeout(r, ms)); }

const Preferencias = {
  chave: 'mapa-cd-simao:preferencias:v1',
  ler() { try { return JSON.parse(localStorage.getItem(this.chave) || '{}') || {}; } catch (e) { return {}; } },
  gravar(obj) { try { localStorage.setItem(this.chave, JSON.stringify(obj)); } catch (e) { /* conveniência apenas */ } }
};

/* ---------- ícones (traço 2px, 24x24) ---------- */
const ICONES = {
  painel: '<path d="M3 13h8V3H3zM13 21h8V11h-8zM13 3v6h8V3zM3 21h8v-6H3z"/>',
  recebimento: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  separacao: '<path d="M4 6h16M4 12h10M4 18h7"/><path d="m16 15 3 3 3-3M19 9v9"/>',
  expedicao: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>',
  ranking: '<path d="M8 21V11M16 21V7M12 21V3M4 21h16"/>',
  ficha: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  multifuncao: '<circle cx="8" cy="9" r="3"/><circle cx="17" cy="7" r="2.5"/><path d="M2.5 20c.8-3.2 3-5 5.5-5s4.7 1.8 5.5 5M14 14.5c.9-.6 1.9-.9 3-.9 2.3 0 4.2 1.6 4.8 4.4"/>',
  fluxo: '<path d="M4 7h13l-3-3M20 17H7l3 3"/>',
  alertas: '<path d="M10.3 3.9 2.6 17.3A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.7L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  lancamentos: '<path d="M4 4h16v16H4z"/><path d="M4 9h16M4 14h16M9 4v16"/>',
  importar: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v3h16v-3"/>',
  colaboradores: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.9-3.6 3.5-5.5 6.5-5.5s5.6 1.9 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.8c1.6.8 2.6 2.5 3 5.2"/>',
  parametros: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  auditoria: '<path d="M9 11l2 2 4-4"/><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
  relatorios: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 13h6M9 17h6M9 9h2"/>',
  guia: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  fechar: '<path d="M6 6l12 12M18 6 6 18"/>',
  voltar: '<path d="M15 18l-6-6 6-6"/>',
  seta: '<path d="M9 18l6-6-6-6"/>',
  pdf: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4"/><path d="M9 15h1.5a1.5 1.5 0 0 0 0-3H9v5M14 12v5"/>',
  excel: '<path d="M4 4h16v16H4z"/><path d="m8 8 8 8M16 8l-8 8"/>',
  baixar: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  editar: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  excluir: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  historico: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  busca: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
  atencao: '<path d="M10.3 3.9 2.6 17.3A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.7L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  certo: '<path d="m5 12 5 5L20 7"/>',
  acima: '<circle cx="12" cy="12" r="9"/><path d="m8 13 4-4 4 4"/>',
  na: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  abaixo: '<circle cx="12" cy="12" r="9"/><path d="m8 11 4 4 4-4"/>',
  insuf: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  semmeta: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
  sobe: '<path d="m6 15 6-6 6 6"/>',
  desce: '<path d="m6 9 6 6 6-6"/>',
  igual: '<path d="M6 10h12M6 14h12"/>',
  trofeu: '<path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  arquivo: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4"/>',
  cadeado: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  aberto: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
  calendario: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  restaurar: '<path d="M12 21V9M7 14l5-5 5 5M4 4h16"/>',
  olho: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  lupa: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M11 8v6M8 11h6"/>'
};
function icone(nome, cls = '') {
  const p = ICONES[nome] || ICONES.info;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${cls ? ` class="${cls}"` : ''}>${p}</svg>`;
}
