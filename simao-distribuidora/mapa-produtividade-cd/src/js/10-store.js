/* =========================================================================
   Dados: conexão com o banco do artefato (db), quem está vendo (user),
   arquivos para baixar (downloads), assinaturas em tempo real e gravações.
   ========================================================================= */

const COLECOES = ['colaboradores', 'lancamentos', 'meses', 'parametros', 'metas', 'importacoes', 'planoAcao', 'historico'];

const S = {
  status: 'conectando',            // conectando | pronto | sem-runtime | sem-db | revogado
  carregado: Object.fromEntries(COLECOES.map(c => [c, false])),
  podeEditarBanco: false,          // canEdit() do runtime (nível de edição)
  ehDono: false,
  usuarioId: null,
  leituraForcada: false,           // uma gravação foi recusada: volta ao modo leitura
  motivoLeitura: '',
  colaboradores: new Map(),
  lancamentos: new Map(),
  meses: new Map(),
  parametros: { ...PARAMETROS_PADRAO },
  parametrosDoc: null,
  metas: new Map(),
  importacoes: new Map(),
  planoAcao: new Map(),
  historico: new Map(),
  versao: 0,
  ultimaAtualizacao: null
};
const CAP = { db: null, user: null, downloads: null };
const ASSINATURAS = {};
let gravando = 0;

function podeEditar() { return S.podeEditarBanco && !S.leituraForcada && S.status === 'pronto'; }
/* Salvar arquivos depende da capacidade downloads do visualizador; sem ela, os botões de exportação somem. */
function podeBaixar() { return !!CAP.downloads; }
function tudoCarregado() { return COLECOES.every(c => S.carregado[c]); }

/* ---------- normalização dos documentos lidos ---------- */
function numero(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function normalizarLancamento(id, d) {
  const ano = Math.round(numero(d.ano)), mes = Math.round(numero(d.mes));
  const pedidos = numero(d.pedidos), nfs = numero(d.nfs);
  return {
    ...d, id,
    ano, mes, ym: ymDe(ano, mes),
    codigo: String(d.codigo ?? '').trim(),
    funcao: d.funcao,
    diasLista: Array.isArray(d.diasLista) ? d.diasLista.map(Number).filter(n => Number.isInteger(n)) : [],
    diasFuncao: numero(d.diasFuncao),
    pedidos, nfs, documentos: pedidos + nfs,
    skus: numero(d.skus),
    unidades: numero(d.unidades)
  };
}
function normalizarDoc(col, id, d) {
  if (col === 'lancamentos') return normalizarLancamento(id, d);
  if (col === 'colaboradores') return { ...d, codigo: String(d.codigo ?? id), id };
  return { ...d, id };
}

/* ---------- conexão ---------- */
async function conectar() {
  const claudeRt = window.claude;
  if (!claudeRt || typeof claudeRt.use !== 'function') {
    S.status = 'sem-runtime';
    agendarRender();
    return;
  }
  let db = null, user = null, downloads = null;
  try {
    [db, user, downloads] = await Promise.all([
      claudeRt.use('db').catch(() => null),
      claudeRt.use('user').catch(() => null),
      claudeRt.use('downloads').catch(() => null)
    ]);
  } catch (e) { /* tratado abaixo como ausência */ }
  CAP.db = db; CAP.user = user; CAP.downloads = downloads;
  if (user) {
    try {
      const [podeEd, dono, id] = await Promise.all([user.canEdit(), user.isOwner(), user.id()]);
      S.podeEditarBanco = !!podeEd;
      S.ehDono = !!dono;
      S.usuarioId = id || null;
    } catch (e) { S.podeEditarBanco = false; }
  }
  if (!db) {
    S.status = 'sem-db';
    agendarRender();
    return;
  }
  for (const col of COLECOES) assinar(col);
}

function assinar(col) {
  try { ASSINATURAS[col] && ASSINATURAS[col](); } catch (e) { /* já encerrada */ }
  let consulta = CAP.db.collection(col);
  if (col === 'historico') consulta = consulta.orderBy('quando', 'desc').limit(1000);
  ASSINATURAS[col] = consulta.onSnapshot(
    snap => aplicarSnapshot(col, snap),
    err => erroAssinatura(col, err)
  );
}

function aplicarSnapshot(col, snap) {
  const mapa = new Map();
  for (const d of snap.docs) {
    if (!d.exists) continue;
    const dados = d.data();
    if (!dados) continue;
    mapa.set(d.id, normalizarDoc(col, d.id, dados));
  }
  if (col === 'parametros') {
    const geral = mapa.get('geral') || null;
    S.parametrosDoc = geral;
    S.parametros = { ...PARAMETROS_PADRAO, ...(geral || {}) };
  } else {
    S[col] = mapa;
  }
  S.carregado[col] = true;
  S.versao++;
  S.ultimaAtualizacao = new Date();
  if (S.status === 'conectando' && tudoCarregado()) S.status = 'pronto';
  agendarRender();
}

function erroAssinatura(col, err) {
  const code = err && err.code;
  if (code === 'revoked') {
    S.status = 'revogado';
    agendarRender();
    return;
  }
  if (code === 'unavailable' || code === 'queue_overflow') {
    setTimeout(() => assinar(col), 2500 + Math.random() * 2500);
    return;
  }
  console.warn('Assinatura encerrada', col, err);
  S.carregado[col] = true;
  if (S.status === 'conectando' && tudoCarregado()) S.status = 'pronto';
  toast(`Não foi possível acompanhar "${col}" em tempo real. Recarregue a página se os números parecerem desatualizados.`, 'erro');
  agendarRender();
}

/* ---------- gravação ---------- */
function mensagemErroBanco(e) {
  const code = e && e.code;
  switch (code) {
    case 'invalid_argument': return 'O banco de dados recusou a gravação. Normalmente isso significa que esta conta não tem permissão de edição neste painel.';
    case 'quota_exceeded': return 'O limite de armazenamento do painel foi atingido. Exclua registros antigos (por exemplo, do histórico) antes de gravar.';
    case 'resource_exhausted': return 'Muitas gravações em sequência. Aguarde alguns segundos e tente de novo.';
    case 'revoked': return 'O acesso a este painel foi retirado enquanto a página estava aberta.';
    case 'not_granted': case 'capability_disabled': case 'capability_removed': return 'Esta visualização não permite gravar dados.';
    case 'unavailable': return 'O banco de dados está momentaneamente indisponível. Tente de novo em instantes.';
    default: return 'Não foi possível gravar: ' + ((e && e.message) || 'erro desconhecido') + '.';
  }
}
function ehRecusa(e) {
  const code = e && e.code;
  return code === 'invalid_argument' || code === 'not_granted' || code === 'revoked' || code === 'capability_disabled' || code === 'capability_removed';
}
function entrarModoLeitura(motivo) {
  S.leituraForcada = true;
  S.motivoLeitura = motivo;
  agendarRender();
}
function exigirEdicao() {
  if (!podeEditar()) {
    const e = new Error('Somente leitura');
    e.code = 'somente_leitura';
    throw e;
  }
}
function limparParaBanco(obj) {
  /* o banco aceita apenas JSON puro: remove undefined, NaN e funções */
  return JSON.parse(JSON.stringify(obj, (k, v) => (typeof v === 'number' && !Number.isFinite(v)) ? null : v));
}
async function executarOperacao(op) {
  const ref = CAP.db.collection(op.colecao).doc(op.id);
  if (op.tipo === 'excluir') return ref.delete();
  return ref.set(limparParaBanco(op.dados));
}
async function executarComRetentativa(op) {
  try { return await executarOperacao(op); }
  catch (e) {
    if (e && (e.code === 'unavailable' || e.code === 'resource_exhausted')) {
      await dormir(600 + Math.random() * 900);
      return executarOperacao(op);
    }
    throw e;
  }
}
/* Executa gravações (até 4 em paralelo, nunca duas no mesmo documento). */
async function executarOperacoes(ops, aoProgredir) {
  exigirEdicao();
  const vistos = new Set();
  const unicas = [];
  for (const op of ops) {
    const chave = op.colecao + '/' + op.id;
    if (vistos.has(chave)) { const i = unicas.findIndex(o => o.colecao + '/' + o.id === chave); unicas[i] = op; continue; }
    vistos.add(chave); unicas.push(op);
  }
  let feitas = 0;
  const erros = [];
  const fila = unicas.slice();
  gravando++;
  agendarRender();
  async function trabalhador() {
    while (fila.length) {
      const op = fila.shift();
      try { await executarComRetentativa(op); }
      catch (e) {
        erros.push({ op, e });
        if (ehRecusa(e) || (e && e.code === 'quota_exceeded')) fila.length = 0;
      }
      feitas++;
      if (aoProgredir) aoProgredir(feitas, unicas.length);
    }
  }
  try {
    await Promise.all(Array.from({ length: Math.min(4, unicas.length) }, trabalhador));
  } finally {
    gravando--;
    agendarRender();
  }
  if (erros.length) {
    const e = erros[0].e;
    const msg = mensagemErroBanco(e);
    if (ehRecusa(e)) entrarModoLeitura(msg + ' A tela voltou ao modo leitura.');
    const err = new Error(msg);
    err.code = e && e.code;
    err.erros = erros;
    err.gravadas = feitas - erros.length;
    throw err;
  }
  return feitas;
}
function opGravar(colecao, id, dados) { return { tipo: 'gravar', colecao, id: String(id), dados }; }
function opExcluir(colecao, id) { return { tipo: 'excluir', colecao, id: String(id) }; }
/* mapa: true quando antes/depois são { idDoDocumento: conteúdo } (importação, exclusão de mês, restauração) */
function opHistorico({ tipo, colecao, alvo, alvos, resumo, antes, depois, mapa = false }) {
  return opGravar('historico', novoId('h'), {
    quando: agoraISO(),
    autorId: S.usuarioId || null,
    tipo,
    colecao: colecao || null,
    alvo: alvo || null,
    alvos: alvos || (alvo ? [alvo] : []),
    resumo: resumo || '',
    mapa: !!mapa,
    antes: antes === undefined ? null : antes,
    depois: depois === undefined ? null : depois
  });
}
/* Gravação com histórico e aviso de resultado; devolve true quando tudo foi gravado. */
async function gravarComHistorico(ops, historico, mensagemOk) {
  try {
    const todas = historico ? [...ops, opHistorico(historico)] : ops;
    await executarOperacoes(todas);
    if (mensagemOk) toast(mensagemOk, 'ok');
    return true;
  } catch (e) {
    if (e && e.code === 'somente_leitura') toast('Esta tela está em modo leitura.', 'erro');
    else toast(e.message || mensagemErroBanco(e), 'erro', 8000);
    return false;
  }
}
/* doc a gravar sem os campos calculados internamente */
function docLancamentoParaBanco(l) {
  const { id, ym, documentos, ...resto } = l;
  return resto;
}
function docSimplesParaBanco(d) {
  const { id, ...resto } = d;
  return resto;
}
