/* =========================================================================
   Motor de cálculo: metas vigentes, agregações (somar antes de dividir),
   índice de eficiência, ranking, presença/multifunção, indicadores da
   operação, alertas, leitura gerencial, auditoria e metas sugeridas (P75).
   Tudo derivado dos documentos do banco; nada é inventado.
   ========================================================================= */

const MEMO = new Map();
let memoVersao = -1;
function memo(chave, fn) {
  if (memoVersao !== S.versao) { MEMO.clear(); memoVersao = S.versao; }
  if (!MEMO.has(chave)) MEMO.set(chave, fn());
  return MEMO.get(chave);
}
const P = () => S.parametros;
const EPS = 1e-9;

/* ---------- colaboradores ---------- */
function colab(codigo) { return S.colaboradores.get(String(codigo)) || null; }
function nomeKaizenDe(codigo) {
  return memo('nk|' + codigo, () => {
    let nome = '';
    for (const l of todosLancamentos()) if (l.codigo === String(codigo) && l.nomeKaizen) nome = l.nomeKaizen;
    return nome;
  });
}
function nomeExib(codigo) {
  const c = colab(codigo);
  if (c && c.nomeCurto) return c.nomeCurto;
  const nome = (c && c.nome) || nomeKaizenDe(codigo);
  return nome ? nomeCurtoDe(nome) : `Código ${codigo}`;
}
function nomeCompleto(codigo) {
  const c = colab(codigo);
  const nome = (c && c.nome) || nomeKaizenDe(codigo);
  return nome ? nomeTitulo(nome) : `Código ${codigo}`;
}
function estaDesligado(codigo, ym) {
  const c = colab(codigo);
  if (!c || c.status !== 'desligado') return false;
  if (ym === undefined) return true;
  const yd = ymDeChave((c.dataDesligamento || '').slice(0, 7));
  return yd == null ? true : ym >= yd;
}

/* ---------- lançamentos ---------- */
function todosLancamentos() {
  return memo('todos', () => [...S.lancamentos.values()].sort((a, b) => a.ym - b.ym || FUNCOES.findIndex(f => f.id === a.funcao) - FUNCOES.findIndex(f => f.id === b.funcao) || porCodigo(a.codigo, b.codigo)));
}
function lancamentosPeriodo(ini, fim, funcao) {
  return memo(`lp|${ini}|${fim}|${funcao || ''}`, () => todosLancamentos().filter(l => l.ym >= ini && l.ym <= fim && (!funcao || l.funcao === funcao)));
}
function lancamentosDoColab(codigo) {
  return memo('lc|' + codigo, () => todosLancamentos().filter(l => l.codigo === String(codigo)));
}
function mesesComDados() {
  return memo('mesesDados', () => [...new Set(todosLancamentos().map(l => l.ym))].sort((a, b) => a - b));
}
function mesesDisponiveis() {
  return memo('mesesDisp', () => {
    const s = new Set(mesesComDados());
    for (const k of S.meses.keys()) { const y = ymDeChave(k); if (y != null) s.add(y); }
    return [...s].sort((a, b) => a - b);
  });
}
function primeiroMesDados() { const m = mesesComDados(); return m.length ? m[0] : null; }
function primeiraAtividade(codigo) { const ls = lancamentosDoColab(codigo); return ls.length ? ls[0].ym : null; }
function ultimaAtividade(codigo) { const ls = lancamentosDoColab(codigo); return ls.length ? ls[ls.length - 1].ym : null; }
function ehNovato(codigo, ym) {
  const prim = primeiraAtividade(codigo), base = primeiroMesDados();
  if (prim == null || base == null || prim <= base) return false;
  return ym >= prim && ym - prim < (P().mesesNovato || 3);
}
function codigosComDados() {
  return memo('codigos', () => [...new Set(todosLancamentos().map(l => l.codigo))].sort(porCodigo));
}
function todosCodigos() {
  return memo('todosCod', () => [...new Set([...S.colaboradores.keys(), ...codigosComDados()])].sort(porCodigo));
}

/* ---------- função principal ---------- */
function diasPorFuncao(codigo, ini = -Infinity, fim = Infinity) {
  const r = Object.fromEntries(FUNCOES.map(f => [f.id, 0]));
  for (const l of lancamentosDoColab(codigo)) if (l.ym >= ini && l.ym <= fim && r[l.funcao] !== undefined) r[l.funcao] += l.diasFuncao;
  return r;
}
function funcaoSugerida(codigo) {
  const d = diasPorFuncao(codigo);
  let melhor = null;
  for (const f of FUNCOES) if (d[f.id] > 0 && (melhor === null || d[f.id] > d[melhor])) melhor = f.id;
  return melhor;
}
function funcaoPrincipalDe(codigo) {
  const c = colab(codigo);
  return (c && FUNC[c.funcaoPrincipal]) ? c.funcaoPrincipal : funcaoSugerida(codigo);
}

/* ---------- metas e meses ---------- */
function metasDaFuncao(funcao) {
  return memo('metas|' + funcao, () => [...S.metas.values()]
    .filter(m => m.funcao === funcao)
    .map(m => ({ ...m, ymVig: ymDeChave(m.vigenciaDesde) }))
    .filter(m => m.ymVig != null)
    .sort((a, b) => a.ymVig - b.ymVig));
}
function metaVigente(funcao, ym) {
  let r = null;
  for (const m of metasDaFuncao(funcao)) if (m.ymVig <= ym) r = m;
  return r;
}
function diasOperacaoCalculado(ym) {
  return memo('dopc|' + ym, () => {
    const s = new Set();
    for (const l of lancamentosPeriodo(ym, ym)) for (const d of l.diasLista) s.add(d);
    return s.size;
  });
}
function docMes(ym) { return S.meses.get(chaveYM(ym)) || null; }
function diasOperacao(ym) {
  const m = docMes(ym);
  if (m && ok(Number(m.diasOperacao)) && Number(m.diasOperacao) > 0) return Number(m.diasOperacao);
  const c = diasOperacaoCalculado(ym);
  return c > 0 ? c : null;
}
function ymInicioRotas() {
  const s = P().inicioRotasExternas;
  return s ? ymDeChave(String(s).slice(0, 7)) : null;
}
function escopoPadrao(ym) {
  const ini = ymInicioRotas();
  if (ini == null || ym < ini) return 'Lojas Simão';
  if (ym === ini) return `Lojas Simão + rotas externas a partir de ${dataCurta(P().inicioRotasExternas)}`;
  return 'Lojas Simão + rotas externas';
}
function infoMes(ym) {
  const m = docMes(ym) || {};
  return {
    ym,
    existe: !!docMes(ym),
    escopo: m.escopoColeta || escopoPadrao(ym),
    quebraSerie: typeof m.quebraSerie === 'boolean' ? m.quebraSerie : ym === ymInicioRotas(),
    situacao: m.situacao === 'fechado' ? 'fechado' : 'aberto',
    diasOperacao: diasOperacao(ym),
    diasOperacaoCalculado: diasOperacaoCalculado(ym),
    diasOperacaoGravado: ok(Number(m.diasOperacao)) ? Number(m.diasOperacao) : null,
    observacao: m.observacao || '',
    dataInicioRotasExternas: m.dataInicioRotasExternas || null
  };
}
function mesFechado(ym) { return infoMes(ym).situacao === 'fechado'; }
function comparacaoAfetada(ymA, ymB) {
  if (ymA == null || ymB == null) return false;
  const a = Math.min(ymA, ymB), b = Math.max(ymA, ymB);
  for (let y = a; y <= b; y++) if (y !== a && infoMes(y).quebraSerie) return true;
  return infoMes(ymA).escopo !== infoMes(ymB).escopo;
}
function quebrasNoIntervalo(ini, fim) {
  const r = [];
  for (let y = ini; y <= fim; y++) if (infoMes(y).quebraSerie) r.push(y);
  return r;
}
function diasOperacaoPeriodo(ini, fim) {
  let t = 0;
  for (const y of mesesComDados()) if (y >= ini && y <= fim) t += diasOperacao(y) || 0;
  return t;
}

/* ---------- agregação e indicadores ---------- */
function agregar(lancs) {
  const ag = { linhas: 0, dias: 0, pedidos: 0, nfs: 0, documentos: 0, skus: 0, unidades: 0, espItens: 0, espUnid: 0, espDocs: 0, semMeta: false, meses: new Set(), metasUsadas: new Set() };
  for (const l of lancs) {
    ag.linhas++;
    ag.dias += l.diasFuncao; ag.pedidos += l.pedidos; ag.nfs += l.nfs; ag.documentos += l.documentos;
    ag.skus += l.skus; ag.unidades += l.unidades;
    ag.meses.add(l.ym);
    const m = metaVigente(l.funcao, l.ym);
    if (m && m.itensDia > 0 && m.unidadesDia > 0) {
      ag.espItens += l.diasFuncao * m.itensDia;
      ag.espUnid += l.diasFuncao * m.unidadesDia;
      ag.espDocs += l.diasFuncao * (m.documentosDia || 0);
      ag.metasUsadas.add(m.id);
    } else ag.semMeta = true;
  }
  return ag;
}
/* % da meta = Σ realizado ÷ Σ (dias × meta vigente no mês). Com uma só meta no período,
   é exatamente (itens/dia) ÷ meta. Nunca média de percentuais mensais. */
function indicadores(ag, { equipe = false } = {}) {
  const p = P();
  const r = {
    itensDia: div(ag.skus, ag.dias), unidDia: div(ag.unidades, ag.dias), docsDia: div(ag.documentos, ag.dias),
    itensPorDoc: div(ag.skus, ag.documentos), unidPorItem: div(ag.unidades, ag.skus),
    metaItens: ag.semMeta ? null : div(ag.espItens, ag.dias),
    metaUnid: ag.semMeta ? null : div(ag.espUnid, ag.dias),
    metaDocs: ag.semMeta || !ag.espDocs ? null : div(ag.espDocs, ag.dias),
    pctItens: ag.semMeta ? null : div(ag.skus, ag.espItens),
    pctUnid: ag.semMeta ? null : div(ag.unidades, ag.espUnid),
    pctDocs: ag.semMeta || !ag.espDocs ? null : div(ag.documentos, ag.espDocs),
    elegivel: equipe ? ag.dias > 0 : ag.dias >= p.minimoDias,
    indice: null, situacao: null, motivo: ''
  };
  if (!r.elegivel) { r.situacao = 'insuf'; r.motivo = `${fInt(ag.dias)} ${ag.dias === 1 ? 'dia' : 'dias'} na função (mínimo ${p.minimoDias})`; }
  else if (r.pctItens == null || r.pctUnid == null) { r.situacao = 'semmeta'; r.motivo = 'Sem meta vigente cadastrada para o período'; }
  else {
    r.indice = r.pctItens * p.pesoItens + r.pctUnid * p.pesoQuantidade;
    r.situacao = r.indice >= 1 - EPS ? 'acima' : r.indice >= p.tolerancia - EPS ? 'na' : 'abaixo';
  }
  return r;
}
function linhasFuncao(ini, fim, funcao) {
  return memo(`lf|${ini}|${fim}|${funcao}`, () => {
    const grupos = new Map();
    for (const l of lancamentosPeriodo(ini, fim, funcao)) {
      if (!grupos.has(l.codigo)) grupos.set(l.codigo, []);
      grupos.get(l.codigo).push(l);
    }
    return [...grupos.entries()].map(([codigo, lancs]) => {
      const ag = agregar(lancs);
      const ind = indicadores(ag);
      const principal = funcaoPrincipalDe(codigo);
      const c = colab(codigo);
      return {
        codigo, funcao, lancs, ag, ind, principal,
        apoio: !!principal && principal !== funcao,
        nome: nomeExib(codigo), nomeCompleto: nomeCompleto(codigo),
        suspeito: lancs.some(l => l.suspeito),
        novo: ehNovato(codigo, fim),
        rotas: !!(c && c.rotasExternas),
        desligado: estaDesligado(codigo)
      };
    });
  });
}
function totaisFuncao(ini, fim, funcao) {
  return memo(`tf|${ini}|${fim}|${funcao}`, () => {
    const lancs = lancamentosPeriodo(ini, fim, funcao);
    const ag = agregar(lancs);
    const ind = indicadores(ag, { equipe: true });
    if (ind.pctItens != null && ind.pctUnid != null) {
      ind.indice = ind.pctItens * P().pesoItens + ind.pctUnid * P().pesoQuantidade;
    }
    const dOp = diasOperacaoPeriodo(ini, fim);
    return { ag, ind, colaboradores: new Set(lancs.map(l => l.codigo)).size, pessoasEq: div(ag.dias, dOp), diasOperacao: dOp };
  });
}
function totaisCD(ini, fim, funcaoFiltro) {
  return memo(`cd|${ini}|${fim}|${funcaoFiltro || ''}`, () => {
    const fs = funcaoFiltro ? [funcaoFiltro] : FUNCOES.map(f => f.id);
    const porFuncao = Object.fromEntries(fs.map(f => [f, totaisFuncao(ini, fim, f)]));
    const r = { porFuncao, documentos: 0, skus: 0, unidades: 0, dias: 0, linhas: 0 };
    let pesoIdx = 0, somaIdx = 0;
    for (const f of fs) {
      const t = porFuncao[f];
      r.documentos += t.ag.documentos; r.skus += t.ag.skus; r.unidades += t.ag.unidades; r.dias += t.ag.dias; r.linhas += t.ag.linhas;
      if (t.ind.indice != null) { somaIdx += t.ind.indice * t.ag.dias; pesoIdx += t.ag.dias; }
    }
    r.indice = div(somaIdx, pesoIdx);
    const lancs = fs.flatMap(f => lancamentosPeriodo(ini, fim, f));
    r.colaboradores = new Set(lancs.map(l => l.codigo)).size;
    return r;
  });
}

/* ---------- ranking ---------- */
function ranking(ini, fim, funcao, leitura) {
  return memo(`rk|${ini}|${fim}|${funcao}|${leitura}`, () => {
    const linhas = linhasFuncao(ini, fim, funcao);
    const base = leitura === 'principal' ? linhas.filter(r => !r.apoio) : linhas;
    const apoio = leitura === 'principal' ? linhas.filter(r => r.apoio) : [];
    const eleg = base.filter(r => r.ind.indice != null)
      .sort((a, b) => (b.ind.indice - a.ind.indice) || (b.ag.skus - a.ag.skus) || porCodigo(a.codigo, b.codigo));
    const pos = new Map(eleg.map((r, i) => [r.codigo, i + 1]));
    const nao = base.filter(r => r.ind.indice == null).sort((a, b) => (b.ag.dias - a.ag.dias) || (b.ag.skus - a.ag.skus));
    const apoioOrd = apoio.slice().sort((a, b) => ((b.ind.indice ?? -1) - (a.ind.indice ?? -1)) || (b.ag.skus - a.ag.skus));
    return { eleg, nao, apoio: apoioOrd, pos, linhas };
  });
}
function periodoAnterior(ini, fim, visao) {
  if (visao === 'acumulado') return fim - 1 >= ini ? [ini, fim - 1] : null;
  return [fim - 1, fim - 1];
}
function movimento(ini, fim, funcao, leitura, codigo, visao) {
  const ant = periodoAnterior(ini, fim, visao);
  if (!ant) return null;
  const atual = ranking(ini, fim, funcao, leitura).pos.get(codigo);
  if (atual == null) return null;
  if (!lancamentosPeriodo(ant[0], ant[1], funcao).length) return null;
  const antes = ranking(ant[0], ant[1], funcao, leitura).pos.get(codigo);
  if (antes == null) return { tipo: 'novo' };
  const d = antes - atual;
  return { tipo: d > 0 ? 'sobe' : d < 0 ? 'desce' : 'igual', d: Math.abs(d), anterior: antes };
}
function campeao(ym, funcao, leitura) {
  const rk = ranking(ym, ym, funcao, leitura);
  return rk.eleg[0] || null;
}
function primeirosEUltimos(rk, n = 3) {
  const e = rk.eleg;
  const topo = e.slice(0, n);
  const resto = e.slice(n);
  const fim = resto.slice(Math.max(0, resto.length - n));
  return { topo, fim };
}
function distribuicaoSituacao(ini, fim, funcao, leitura) {
  const rk = ranking(ini, fim, funcao, leitura);
  const d = { acima: [], na: [], abaixo: [], insuf: [], semmeta: [] };
  for (const r of [...rk.eleg, ...rk.nao]) d[r.ind.situacao].push(r);
  return d;
}

/* ---------- presença e multifunção ---------- */
function presenca(ym, codigo) {
  return memo(`pr|${ym}|${codigo}`, () => {
    const ls = lancamentosPeriodo(ym, ym).filter(l => l.codigo === String(codigo));
    const dias = new Set();
    const porFuncao = {};
    let df = 0;
    for (const l of ls) { l.diasLista.forEach(d => dias.add(d)); df += l.diasFuncao; porFuncao[l.funcao] = l.diasLista; }
    const dOp = diasOperacao(ym);
    return {
      ym, codigo: String(codigo), lancs: ls, funcoes: [...new Set(ls.map(l => l.funcao))],
      presenca: dias.size, diasFuncao: df, fatiamento: div(df, dias.size), alocacao: div(df, dOp), diasOperacao: dOp,
      dias: [...dias].sort((a, b) => a - b), porFuncao
    };
  });
}
function multifuncao(ini, fim) {
  return memo(`mf|${ini}|${fim}`, () => {
    const meses = mesesComDados().filter(y => y >= ini && y <= fim);
    const codigos = [...new Set(lancamentosPeriodo(ini, fim).map(l => l.codigo))].sort(porCodigo);
    const dOpTotal = diasOperacaoPeriodo(ini, fim);
    return codigos.map(codigo => {
      const porMes = meses.map(y => presenca(y, codigo));
      const pres = soma(porMes, m => m.presenca), df = soma(porMes, m => m.diasFuncao);
      const funcoes = new Set(); porMes.forEach(m => m.funcoes.forEach(f => funcoes.add(f)));
      return {
        codigo, nome: nomeExib(codigo), principal: funcaoPrincipalDe(codigo), porMes, meses,
        presenca: pres, diasFuncao: df, fatiamento: div(df, pres), alocacao: div(df, dOpTotal),
        funcoes: [...funcoes], maxFuncoesMes: Math.max(0, ...porMes.map(m => m.funcoes.length)),
        mesesFatiados: porMes.filter(m => m.diasFuncao > m.presenca).length
      };
    });
  });
}

/* ---------- operação (visão do CEO) ---------- */
function concentracao(ini, fim, funcao) {
  return memo(`cc|${ini}|${fim}|${funcao}`, () => {
    const linhas = linhasFuncao(ini, fim, funcao);
    const total = soma(linhas, r => r.ag.skus);
    if (!total) return null;
    const ord = linhas.slice().sort((a, b) => b.ag.skus - a.ag.skus);
    const topo = ord[0];
    return { codigo: topo.codigo, nome: topo.nome, share: topo.ag.skus / total, itens: topo.ag.skus, total, ordenado: ord.map(r => ({ codigo: r.codigo, nome: r.nome, itens: r.ag.skus, share: r.ag.skus / total, apoio: r.apoio })) };
  });
}
/* Capacidade potencial: para cada elegível com índice abaixo de 100%, os dias que bastariam
   para o mesmo volume se estivesse na meta = dias × índice. A diferença é liberável. */
function capacidade(ini, fim, funcao) {
  return memo(`cap|${ini}|${fim}|${funcao}`, () => {
    const dOp = diasOperacaoPeriodo(ini, fim);
    const det = linhasFuncao(ini, fim, funcao)
      .filter(r => r.ind.indice != null && r.ind.indice < 1 - EPS)
      .map(r => ({
        codigo: r.codigo, nome: r.nome, dias: r.ag.dias, indice: r.ind.indice, situacao: r.ind.situacao, apoio: r.apoio,
        necessarios: r.ag.dias * r.ind.indice, liberaveis: r.ag.dias * (1 - r.ind.indice)
      }))
      .sort((a, b) => b.liberaveis - a.liberaveis);
    const dias = soma(det, d => d.liberaveis);
    const diasAbaixo = soma(det.filter(d => d.situacao === 'abaixo'), d => d.liberaveis);
    return { detalhes: det, dias, diasAbaixo, pessoas: div(dias, dOp), pessoasAbaixo: div(diasAbaixo, dOp), diasOperacao: dOp };
  });
}
function operacao(ini, fim) {
  return memo(`op|${ini}|${fim}`, () => {
    const t = Object.fromEntries(FUNCOES.map(f => [f.id, totaisFuncao(ini, fim, f.id)]));
    const rec = t.recebimento.ag, sep = t.separacao.ag, exp = t.expedicao.ag;
    const dOp = diasOperacaoPeriodo(ini, fim);
    return {
      t, diasOperacao: dOp,
      coberturaItens: sep.skus ? div(exp.skus, sep.skus) : null,
      coberturaPedidos: sep.pedidos ? div(exp.pedidos, sep.pedidos) : null,
      relacaoMO: exp.dias ? div(sep.dias, exp.dias) : null,
      saldo: (rec.linhas && sep.linhas) ? rec.unidades - sep.unidades : null,
      pessoasEq: Object.fromEntries(FUNCOES.map(f => [f.id, div(t[f.id].ag.dias, dOp)])),
      pessoasEqTotal: div(rec.dias + sep.dias + exp.dias, dOp),
      produtividade: Object.fromEntries(FUNCOES.map(f => [f.id, t[f.id].ind.itensDia])),
      concentracao: Object.fromEntries(FUNCOES.map(f => [f.id, concentracao(ini, fim, f.id)])),
      capacidade: Object.fromEntries(FUNCOES.map(f => [f.id, capacidade(ini, fim, f.id)]))
    };
  });
}
function saldoAcumulado(ate) {
  let s = 0;
  for (const y of mesesComDados()) {
    if (y > ate || anoDe(y) !== anoDe(ate)) continue;
    const op = operacao(y, y);
    if (op.saldo != null) s += op.saldo;
  }
  return s;
}

/* ---------- duplicidades (achado A1) ---------- */
function duplicidades(ym) {
  return memo('dup|' + ym, () => {
    const ls = lancamentosPeriodo(ym, ym);
    const r = [];
    for (let i = 0; i < ls.length; i++) for (let j = i + 1; j < ls.length; j++) {
      const a = ls[i], b = ls[j];
      if (a.codigo === b.codigo && a.funcao !== b.funcao && a.diasFuncao === b.diasFuncao && a.pedidos === b.pedidos && a.nfs === b.nfs && a.skus === b.skus && a.unidades === b.unidades && iguais(a.diasLista, b.diasLista)) r.push([a, b]);
    }
    return r;
  });
}

/* ---------- alertas automáticos ---------- */
function alertasDoMes(ym) {
  return memo('al|' + ym, () => {
    const p = P();
    const lista = [];
    const ant = ym - 1;
    const temAnt = lancamentosPeriodo(ant, ant).length > 0;
    const afetada = comparacaoAfetada(ym, ant);
    const add = a => lista.push({ ...a, ym, id: `${a.tipo}-${chaveYM(ym)}-${a.codigo || ''}-${a.funcao || ''}` });
    for (const f of FUNCOES) {
      const linhas = linhasFuncao(ym, ym, f.id);
      const antes = new Map(linhasFuncao(ant, ant, f.id).map(r => [r.codigo, r]));
      const eleg = linhas.filter(r => r.ind.indice != null);
      const med = mediana(eleg.map(r => r.ind.itensDia));
      for (const r of eleg) {
        const a = antes.get(r.codigo);
        if (r.ind.situacao === 'abaixo' && a && a.ind.situacao === 'abaixo') {
          add({ tipo: 'abaixo2', gravidade: 'alta', codigo: r.codigo, funcao: f.id,
            titulo: `${r.nome}: abaixo da meta pelo 2º mês seguido em ${f.nome}`,
            texto: `Índice ${fPct(a.ind.indice)} em ${nomeMes(ant).toLowerCase()} e ${fPct(r.ind.indice)} em ${nomeMes(ym).toLowerCase()} (tolerância ${fPct(p.tolerancia)}).` });
        }
        if (a && a.ind.indice != null && a.ind.indice > 0) {
          const queda = (a.ind.indice - r.ind.indice) / a.ind.indice;
          if (queda > p.limiteQueda + EPS) {
            add({ tipo: 'queda', gravidade: 'media', codigo: r.codigo, funcao: f.id,
              titulo: `${r.nome}: índice caiu ${fPct(queda)} em ${f.nome}`,
              texto: `De ${fPct(a.ind.indice)} para ${fPct(r.ind.indice)} contra o mês anterior (limite de queda: ${fPct(p.limiteQueda)}).${afetada ? ' Comparação afetada pela quebra de série do escopo da coleta.' : ''}` });
          }
        }
        if (med && eleg.length >= 3 && r.ind.itensDia > (p.fatorMediana || 2) * med + EPS) {
          add({ tipo: 'login', gravidade: 'media', codigo: r.codigo, funcao: f.id,
            titulo: `${r.nome}: ${fD1(r.ind.itensDia)} itens/dia em ${f.nome}, mais que o dobro da mediana`,
            texto: `Mediana da função no mês: ${fD1(med)} itens/dia. Verificar login compartilhado no coletor antes de usar o número como referência.` });
        }
      }
      const c = concentracao(ym, ym, f.id);
      if (c && c.share > p.limiteConcentracao + EPS) {
        add({ tipo: 'concentracao', gravidade: 'media', codigo: c.codigo, funcao: f.id,
          titulo: `${c.nome} concentrou ${fPct(c.share)} dos itens ${f.verboItens}`,
          texto: `Limite de concentração: ${fPct(p.limiteConcentracao)}. Risco de dependência: se ele faltar, a função perde ${fPct(c.share)} do volume. Avaliar formação de substituto.` });
      }
    }
    const codigos = [...new Set(lancamentosPeriodo(ym, ym).map(l => l.codigo))];
    for (const codigo of codigos) {
      const pr = presenca(ym, codigo);
      if (pr.diasFuncao > pr.presenca) {
        add({ tipo: 'fatiamento', gravidade: 'info', codigo,
          titulo: `${nomeExib(codigo)}: ${pr.diasFuncao} dias-função em ${pr.presenca} dias de presença`,
          texto: `Atuou em ${pr.funcoes.length} funções no mesmo período (índice de fatiamento ${fD2(pr.fatiamento)}). A produtividade por dia em cada função fica subestimada.` });
      }
      if (ehNovato(codigo, ym)) {
        const prim = primeiraAtividade(codigo);
        add({ tipo: 'novo', gravidade: 'info', codigo,
          titulo: `${nomeExib(codigo)}: ${ym - prim + 1}º mês de atividade`,
          texto: `Primeiro registro em ${rotuloYM(prim).toLowerCase()}. Curva de aprendizado: comparar com cautela nos ${P().mesesNovato || 3} primeiros meses.` });
      }
      if (estaDesligado(codigo, ym)) {
        add({ tipo: 'desligado', gravidade: 'alta', codigo,
          titulo: `${nomeExib(codigo)} está marcado como desligado, mas tem lançamento em ${rotuloYM(ym).toLowerCase()}`,
          texto: `Data de desligamento no cadastro: ${fData(colab(codigo).dataDesligamento)}. Confira o cadastro ou o login usado no coletor.` });
      }
    }
    for (const [a, b] of duplicidades(ym)) {
      add({ tipo: 'duplicidade', gravidade: 'alta', codigo: a.codigo, funcao: a.funcao,
        titulo: `${nomeExib(a.codigo)}: lançamentos idênticos em ${FUNC[a.funcao].nome} e ${FUNC[b.funcao].nome}`,
        texto: `${a.diasFuncao} dias, ${fInt(a.pedidos + a.nfs)} documentos, ${fInt(a.skus)} itens e ${fInt(a.unidades)} unidades nas duas funções, com a mesma lista de dias. Provável lançamento em dobro: confirme com o suporte Kaizen e exclua um dos dois.`,
        ids: [a.id, b.id] });
    }
    const ordem = { alta: 0, media: 1, info: 2 };
    lista.sort((x, y) => ordem[x.gravidade] - ordem[y.gravidade]);
    lista.temAnterior = temAnt;
    return lista;
  });
}

/* ---------- metas sugeridas (P75) ---------- */
function sugerirMetas(ini, fim, minDias) {
  return FUNCOES.map(f => {
    const ls = lancamentosPeriodo(ini, fim, f.id).filter(l => l.diasFuncao >= minDias);
    const it = ls.map(l => l.skus / l.diasFuncao), un = ls.map(l => l.unidades / l.diasFuncao), dc = ls.map(l => l.documentos / l.diasFuncao);
    return { funcao: f.id, n: ls.length, itensDia: percentilInc(it, 0.75), unidadesDia: percentilInc(un, 0.75), documentosDia: percentilInc(dc, 0.75) };
  });
}

/* ---------- validação de um lançamento ---------- */
function validarLancamento(l) {
  const erros = [], alertas = [];
  if (!Number.isInteger(l.ano) || l.ano < 2000 || l.ano > 2100) erros.push('Ano inválido.');
  if (!Number.isInteger(l.mes) || l.mes < 1 || l.mes > 12) erros.push('Mês inválido.');
  if (!FUNC[l.funcao]) erros.push('Função desconhecida.');
  if (!String(l.codigo || '').trim()) erros.push('Código do colaborador em branco.');
  if (!ok(l.diasFuncao) || l.diasFuncao <= 0) erros.push('Dias na função zerados.');
  else if (!Number.isInteger(l.diasFuncao)) erros.push('Dias na função precisa ser um número inteiro.');
  for (const k of ['pedidos', 'nfs', 'skus', 'unidades']) if (!ok(l[k]) || l[k] < 0) erros.push(`Valor inválido em ${k === 'skus' ? 'itens' : k === 'nfs' ? 'NF' : k}.`);
  if (Number.isInteger(l.ano) && Number.isInteger(l.mes) && l.mes >= 1 && l.mes <= 12) {
    const max = diasNoMes(l.ano, l.mes);
    const ruins = (l.diasLista || []).filter(d => !Number.isInteger(d) || d < 1 || d > max);
    if (ruins.length) erros.push(`Dias fora do calendário do mês: ${ruins.join(', ')}.`);
    if (new Set(l.diasLista || []).size !== (l.diasLista || []).length) alertas.push('Há dias repetidos na lista de dias.');
  }
  if ((l.diasLista || []).length && ok(l.diasFuncao) && l.diasLista.length !== l.diasFuncao) alertas.push(`A lista tem ${l.diasLista.length} dias, mas "dias na função" é ${l.diasFuncao}.`);
  if (!(l.diasLista || []).length) alertas.push('Sem lista de dias: presença e calendário ficam incompletos.');
  if (l.funcao === 'recebimento' && l.pedidos > 0) alertas.push('Recebimento com pedidos (OM): normalmente é zero.');
  if (l.funcao && l.funcao !== 'recebimento' && l.nfs > 0) alertas.push('NF conferidas fora do recebimento: normalmente é zero.');
  if (l.skus === 0) alertas.push('Itens (SKU) zerados.');
  return { erros, alertas };
}
function parseDias(v) {
  if (v === null || v === undefined || v === '') return [];
  if (typeof v === 'number') return Number.isInteger(v) ? [v] : [];
  return (String(v).match(/\d+/g) || []).map(Number);
}

/* ---------- auditoria ---------- */
function auditoria(ano) {
  return memo('aud|' + ano, () => {
    const ini = ymDe(ano, 1), fim = ymDe(ano, 12);
    const ls = lancamentosPeriodo(ini, fim);
    const meses = mesesComDados().filter(y => anoDe(y) === ano);
    const amarracao = FUNCOES.map(f => {
      const base = { dias: 0, itens: 0, unidades: 0 };
      for (const l of ls) if (l.funcao === f.id) { base.dias += l.diasFuncao; base.itens += l.skus; base.unidades += l.unidades; }
      const mensal = { dias: 0, itens: 0, unidades: 0 };
      for (const y of meses) { const t = totaisFuncao(y, y, f.id).ag; mensal.dias += t.dias; mensal.itens += t.skus; mensal.unidades += t.unidades; }
      const acum = { dias: 0, itens: 0, unidades: 0 };
      for (const r of linhasFuncao(ini, fim, f.id)) { acum.dias += r.ag.dias; acum.itens += r.ag.skus; acum.unidades += r.ag.unidades; }
      // soma das diferenças absolutas: uma sobra num lado não pode esconder uma falta no outro
      const dif = k => arred(Math.abs(base[k] - mensal[k]) + Math.abs(base[k] - acum[k]), 2);
      return { funcao: f.id, base, mensal, acum, dif: { dias: dif('dias'), itens: dif('itens'), unidades: dif('unidades') } };
    });
    const totais = [];
    for (const y of meses) for (const f of FUNCOES) {
      const t = totaisFuncao(y, y, f.id).ag;
      if (t.linhas) totais.push({ ym: y, funcao: f.id, linhas: t.linhas, dias: t.dias, documentos: t.documentos, itens: t.skus, unidades: t.unidades });
    }
    const problemas = [];
    const addP = (tipo, texto, acao, params, gravidade = 'media') => problemas.push({ tipo, texto, acao, params, gravidade });
    for (const l of ls) {
      if (l.diasLista.length && l.diasLista.length !== l.diasFuncao) addP('Lista de dias', `${nomeExib(l.codigo)} · ${FUNC[l.funcao]?.nome} · ${rotuloYM(l.ym)}: lista com ${l.diasLista.length} dias e ${l.diasFuncao} dias na função.`, 'lancamento', { id: l.id });
      if (l.diasFuncao <= 0) addP('Dias zerados', `${nomeExib(l.codigo)} · ${FUNC[l.funcao]?.nome} · ${rotuloYM(l.ym)}: lançamento sem dias.`, 'lancamento', { id: l.id }, 'alta');
      if (!FUNC[l.funcao]) addP('Função desconhecida', `Lançamento ${l.id} com função "${l.funcao}".`, 'lancamento', { id: l.id }, 'alta');
      if (!colab(l.codigo)) addP('Sem cadastro', `Código ${l.codigo} tem lançamento em ${rotuloYM(l.ym)} mas não está no cadastro de colaboradores.`, 'colaboradores', {}, 'alta');
    }
    for (const y of meses) {
      for (const [a, b] of duplicidades(y)) addP('Duplicidade', `${nomeExib(a.codigo)} · ${rotuloYM(y)}: lançamentos idênticos em ${FUNC[a.funcao].nome} e ${FUNC[b.funcao].nome}.`, 'lancamento', { id: a.id }, 'alta');
      if (!infoMes(y).existe || !infoMes(y).diasOperacaoGravado) addP('Dias de operação', `${rotuloYM(y)}: dias de operação não gravados (usando o calculado: ${fInt(diasOperacaoCalculado(y))}).`, 'parametros', { aba: 'meses' }, 'info');
    }
    for (const c of S.colaboradores.values()) {
      if (c.revisar) addP('Revisar cadastro', `${nomeExib(c.codigo)} (${c.codigo}): ${semPonto(c.motivoRevisao || 'função principal a confirmar')}.`, 'colaboradores', {}, 'info');
    }
    const fatiados = [];
    for (const y of meses) for (const codigo of new Set(lancamentosPeriodo(y, y).map(l => l.codigo))) {
      const pr = presenca(y, codigo);
      if (pr.diasFuncao > pr.presenca) fatiados.push(pr);
    }
    const fracionadas = ls.filter(l => Math.abs(l.unidades - Math.round(l.unidades)) > 1e-9);
    const comMedia = ls.filter(l => ok(Number(l.mediaKaizen)) && l.diasFuncao > 0);
    const truncada = comMedia.filter(l => Number(l.mediaKaizen) === Math.floor(l.skus / l.diasFuncao)).length;
    const arredondada = comMedia.filter(l => Number(l.mediaKaizen) !== Math.floor(l.skus / l.diasFuncao) && Number(l.mediaKaizen) === Math.round(l.skus / l.diasFuncao)).length;
    const comPeso = ls.filter(l => l.pesoBruto !== null && l.pesoBruto !== undefined && l.pesoBruto !== '');
    const pesoIgual = comPeso.filter(l => Math.abs(Number(l.pesoBruto) - l.unidades) < 0.006).length;
    const comVol = ls.filter(l => l.volumeBruto !== null && l.volumeBruto !== undefined && l.volumeBruto !== '');
    const volIgual = comVol.filter(l => Math.abs(Number(l.volumeBruto) - l.unidades / 10000) < 0.0051).length;
    return { ano, meses, amarracao, totais, problemas, fatiados, fracionadas, comMedia: comMedia.length, truncada, arredondada, comPeso: comPeso.length, pesoIgual, comVol: comVol.length, volIgual, linhas: ls.length };
  });
}

/* ---------- leitura gerencial automática ---------- */
function leituraGerencial(ini, fim, funcaoFiltro, leitura, visao) {
  const frases = [];
  const per = rotuloPeriodo(ini, fim);
  const perMin = ini === fim ? `em ${rotuloYM(fim).toLowerCase()}` : `em ${per}`;
  const fs = funcaoFiltro ? [FUNC[funcaoFiltro]] : FUNCOES;
  const p = P();
  const op = operacao(ini, fim);
  const quebras = quebrasNoIntervalo(visao === 'acumulado' ? ini : fim, fim);
  if (quebras.length) {
    const y = quebras[quebras.length - 1];
    const im = infoMes(y);
    frases.push({ tom: 'atencao', icone: 'atencao', acao: 'parametros', params: { aba: 'meses' },
      html: `<b>Quebra de série em ${esc(rotuloYM(y).toLowerCase())}</b>: o escopo da coleta passou a ser "${esc(im.escopo)}". O aumento de volume vem da entrada de uma operação que antes não era medida, não de ganho de produtividade.` });
  } else if (visao !== 'acumulado' && lancamentosPeriodo(fim - 1, fim - 1).length && comparacaoAfetada(fim, fim - 1)) {
    frases.push({ tom: 'atencao', icone: 'atencao', acao: 'parametros', params: { aba: 'meses' },
      html: `<b>O escopo da coleta mudou</b> de "${esc(infoMes(fim - 1).escopo)}" para "${esc(infoMes(fim).escopo)}": comparações com ${esc(rotuloYM(fim - 1).toLowerCase())} ficam afetadas.` });
  }
  for (const f of fs) {
    const c = op.concentracao[f.id];
    if (c && c.share > p.limiteConcentracao + EPS) {
      frases.push({ tom: 'alerta', icone: 'atencao', acao: 'funcao', params: { f: f.id },
        html: `<b>${esc(c.nome)}</b> concentrou <b>${fPct(c.share)}</b> dos itens ${esc(f.verboItens)} ${esc(perMin)}. Risco de dependência.` });
    }
  }
  if (ini === fim) {
    for (const a of alertasDoMes(fim).filter(a => a.tipo === 'login' && (!funcaoFiltro || a.funcao === funcaoFiltro)).slice(0, 2)) {
      frases.push({ tom: 'atencao', icone: 'lupa', acao: 'ficha', params: { codigo: a.codigo, ym: fim, f: a.funcao },
        html: `<b>${esc(a.titulo)}</b>. Verificar login compartilhado no coletor.` });
    }
  }
  if (!funcaoFiltro || funcaoFiltro === 'expedicao' || funcaoFiltro === 'separacao') {
    if (op.coberturaItens != null) {
      const cob = op.coberturaItens;
      frases.push({ tom: Math.abs(1 - cob) <= 0.02 ? 'bom' : 'atencao', icone: Math.abs(1 - cob) <= 0.02 ? 'certo' : 'atencao', acao: 'fluxo', params: {},
        html: `A conferência de expedição cobriu <b>${fPct1(cob)}</b> dos itens separados${op.coberturaPedidos != null ? ` e <b>${fPct1(op.coberturaPedidos)}</b> dos pedidos` : ''} ${esc(perMin)}.` });
    }
    if (op.relacaoMO != null) {
      frases.push({ tom: 'info', icone: 'multifuncao', acao: 'fluxo', params: {},
        html: `A separação consumiu <b>${fD1(op.relacaoMO)} dias-função</b> para cada dia de conferência de expedição.` });
    }
  }
  if (op.saldo != null && (!funcaoFiltro || funcaoFiltro !== 'expedicao')) {
    frases.push({ tom: 'info', icone: 'fluxo', acao: 'fluxo', params: {},
      html: op.saldo >= 0
        ? `Saldo de fluxo ${esc(perMin)}: entraram <b>${fInt(op.saldo)} unidades a mais</b> do que foram separadas.`
        : `Saldo de fluxo ${esc(perMin)}: foram separadas <b>${fInt(-op.saldo)} unidades a mais</b> do que entraram.` });
  }
  let nAbaixo = 0, nAcima = 0, nEleg = 0;
  for (const f of fs) { const d = distribuicaoSituacao(ini, fim, f.id, leitura); nAbaixo += d.abaixo.length; nAcima += d.acima.length; nEleg += d.acima.length + d.na.length + d.abaixo.length; }
  if (nEleg) {
    frases.push({ tom: nAbaixo > nEleg / 2 ? 'alerta' : 'info', icone: 'ranking', acao: 'rankings', params: { aba: visao === 'acumulado' ? 'acumulado' : 'mensal' },
      html: `<b>${nAbaixo} de ${nEleg}</b> avaliações elegíveis ficaram abaixo da meta e <b>${nAcima}</b> acima ${esc(perMin)} (leitura: ${leitura === 'principal' ? 'função principal' : 'todos os lançamentos'}).` });
  }
  if (ini === fim) {
    const abaixo2 = alertasDoMes(fim).filter(a => a.tipo === 'abaixo2' && (!funcaoFiltro || a.funcao === funcaoFiltro));
    if (abaixo2.length) {
      frases.push({ tom: 'alerta', icone: 'desce', acao: 'alertas', params: { aba: 'alertas' },
        html: `<b>${abaixo2.length} ${abaixo2.length === 1 ? 'colaborador está' : 'colaboradores estão'}</b> abaixo da meta pelo 2º mês seguido: ${esc(abaixo2.map(a => nomeExib(a.codigo)).filter((v, i, arr) => arr.indexOf(v) === i).join(', '))}.` });
    }
  }
  const mf = multifuncao(ini, fim).filter(m => m.diasFuncao > m.presenca).sort((a, b) => (b.diasFuncao - b.presenca) - (a.diasFuncao - a.presenca));
  if (mf.length) {
    const m = mf[0];
    frases.push({ tom: 'atencao', icone: 'multifuncao', acao: 'multifuncao', params: {},
      html: `<b>${esc(m.nome)}</b> somou <b>${fInt(m.diasFuncao)} dias-função em ${fInt(m.presenca)} dias de presença</b> (${m.funcoes.length} funções). A produtividade por dia dele está subestimada; leia Multifunção antes de cobrar.` });
  }
  let capDias = 0, capDiasAbaixo = 0;
  for (const f of fs) { capDias += op.capacidade[f.id].dias; capDiasAbaixo += op.capacidade[f.id].diasAbaixo; }
  if (capDias > 0 && op.diasOperacao) {
    frases.push({ tom: 'info', icone: 'fluxo', acao: 'fluxo', params: {},
      html: `Capacidade potencial: se os elegíveis abaixo de 100% chegassem à meta, seriam liberados <b>${fD1(capDias)} dias-função</b> (≈ ${fD1(capDias / op.diasOperacao)} pessoas-equivalentes); só os "abaixo da meta" somam ${fD1(capDiasAbaixo)}. Não considera qualidade nem função de apoio.` });
  }
  const ant = periodoAnterior(ini, fim, visao);
  if (ant && lancamentosPeriodo(ant[0], ant[1]).length) {
    let maior = null;
    for (const f of fs) {
      const a = totaisFuncao(ant[0], ant[1], f.id).ind.itensDia, b = totaisFuncao(ini, fim, f.id).ind.itensDia;
      if (a && b) { const v = b / a - 1; if (!maior || Math.abs(v) > Math.abs(maior.v)) maior = { f, v, b }; }
    }
    if (maior) {
      const afet = comparacaoAfetada(fim, ant[1]);
      frases.push({ tom: afet ? 'atencao' : (maior.v >= 0 ? 'bom' : 'atencao'), icone: maior.v >= 0 ? 'sobe' : 'desce', acao: 'funcao', params: { f: maior.f.id },
        html: `A produtividade da equipe de ${esc(maior.f.nome.toLowerCase())} foi de <b>${fD1(maior.b)} itens/dia</b> (${fSinal(maior.v * 100, 'int')}% contra ${visao === 'acumulado' ? 'o acumulado até o mês anterior' : esc(rotuloYM(ant[1]).toLowerCase())})${afet ? '; comparação afetada pela quebra de série' : ''}.` });
    }
  }
  return frases;
}
