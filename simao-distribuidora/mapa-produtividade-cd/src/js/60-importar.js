/* =========================================================================
   Importação mensal da extração do Kaizen (.xlsx, .xls, .csv): leitura pelo
   nome das colunas, validações bloqueantes e de alerta, pré-visualização,
   substituir ou mesclar mês existente, gravação em lote com histórico.
   ========================================================================= */

/* ---------- bibliotecas sob demanda ---------- */
const BIBLIOTECAS = {
  chart: { global: () => window.Chart, urls: ['https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js', 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.js'] },
  xlsx: { global: () => window.XLSX, urls: ['https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'] },
  jspdf: { global: () => window.jspdf && window.jspdf.jsPDF, urls: ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'] },
  autotable: { global: () => window.jspdf && window.jspdf.jsPDF && window.jspdf.jsPDF.API && window.jspdf.jsPDF.API.autoTable, depende: 'jspdf', urls: ['https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js', 'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js'] }
};
const DOM_PRONTO = new Promise(r => { if (document.readyState !== 'loading') r(); else document.addEventListener('DOMContentLoaded', () => r(), { once: true }); });
function carregarScript(url) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = url; s.async = false;
    s.onload = () => res();
    s.onerror = () => { s.remove(); rej(new Error('Falha ao carregar ' + url)); };
    document.head.appendChild(s);
  });
}
function aplicarAutoTable() {
  const m = window.jspdfAutoTable || window['jspdf-autotable'];
  if (window.jspdf && window.jspdf.jsPDF && !window.jspdf.jsPDF.API.autoTable && m && typeof m.applyPlugin === 'function') m.applyPlugin(window.jspdf.jsPDF);
}
async function garantirBiblioteca(nome) {
  const b = BIBLIOTECAS[nome];
  if (b.global()) return true;
  await DOM_PRONTO;
  if (b.depende) await garantirBiblioteca(b.depende);
  if (nome === 'autotable') aplicarAutoTable();
  if (b.global()) return true;
  if (!b.promessa) {
    b.promessa = (async () => {
      for (const u of b.urls) {
        try { await carregarScript(u); if (nome === 'autotable') aplicarAutoTable(); if (b.global()) return true; } catch (e) { /* tenta o próximo endereço */ }
      }
      return !!b.global();
    })();
  }
  return b.promessa;
}

/* ---------- leitura do arquivo ---------- */
const COLUNAS_KAIZEN = {
  atividade: ['atividade', 'funcao'],
  mes: ['mes', 'competencia', 'mes referencia'],
  dias: ['dias', 'dias trabalhados', 'dias efetivos', 'dias efetivos de trabalho no mes', 'lista de dias'],
  operador: ['operador', 'colaborador', 'funcionario'],
  qtdeDias: ['qtde dias', 'qtd dias', 'quantidade de dias', 'total de dias', 'total de dias trabalhados'],
  pedidos: ['qtde pedido', 'qtde pedidos', 'qtd pedido', 'qtd pedidos', 'qtde pedido om', 'pedidos'],
  nfs: ['qt conf recebimento', 'qtde conf recebimento', 'qt conf recebimento nf', 'qtd conf recebimento', 'notas fiscais'],
  skus: ['qtde skus', 'qtde sku', 'qtd skus', 'qtd sku', 'skus'],
  media: ['media skus dia', 'media sku dia', 'media skus dia informada kaizen'],
  unidades: ['qtde und', 'qtde unidades', 'qtd und', 'qtd unidades', 'unidades'],
  peso: ['peso kg', 'peso'],
  volume: ['volume m3', 'volume'],
  data: ['data', 'data movimento', 'data do movimento'],
  destino: ['destino', 'canal'],
  divergencias: ['itens divergentes', 'divergencias', 'divergencia', 'qtde divergencias']
};
const OBRIGATORIAS = { atividade: 'Atividade', operador: 'Operador', pedidos: 'Qtde Pedido', nfs: 'Qt Conf Recebimento', skus: 'Qtde Skus', unidades: 'Qtde Und' };
function mapearColunas(cab) {
  const mapa = {};
  cab.forEach((h, i) => {
    const n = norm(h);
    if (!n) return;
    for (const [campoK, sins] of Object.entries(COLUNAS_KAIZEN)) {
      if (mapa[campoK] !== undefined) continue;
      if (sins.includes(n)) { mapa[campoK] = i; return; }
    }
  });
  return mapa;
}
function acharCabecalho(linhas) {
  let melhor = { i: -1, n: 0, mapa: {} };
  for (let i = 0; i < Math.min(linhas.length, 12); i++) {
    const mapa = mapearColunas(linhas[i] || []);
    const n = Object.keys(mapa).length;
    if (n > melhor.n) melhor = { i, n, mapa };
  }
  return melhor.n >= 4 ? melhor : null;
}
function decodificarTexto(buf) {
  let t = new TextDecoder('utf-8').decode(buf);
  if (t.includes('\uFFFD')) { try { t = new TextDecoder('windows-1252').decode(buf); } catch (e) { /* mantém utf-8 */ } }
  return t.replace(/^\uFEFF/, '');
}
function lerCSV(texto) {
  const primeira = texto.split(/\r?\n/)[0] || '';
  const sep = [';', '\t', ','].map(s => [s, primeira.split(s).length]).sort((a, b) => b[1] - a[1])[0][0];
  const linhas = [];
  let campoAtual = '', linha = [], aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') { campoAtual += '"'; i++; }
      else if (c === '"') aspas = false;
      else campoAtual += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) { linha.push(campoAtual); campoAtual = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      linha.push(campoAtual); linhas.push(linha); linha = []; campoAtual = '';
    } else campoAtual += c;
  }
  if (campoAtual !== '' || linha.length) { linha.push(campoAtual); linhas.push(linha); }
  return linhas.filter(l => l.some(x => String(x).trim() !== ''));
}
async function lerArquivo(arquivo) {
  const buf = await arquivo.arrayBuffer();
  const nome = (arquivo.name || '').toLowerCase();
  if (nome.endsWith('.csv') || nome.endsWith('.txt')) return lerCSV(decodificarTexto(buf));
  const okLib = await garantirBiblioteca('xlsx');
  if (!okLib) throw new Error('Não foi possível carregar o leitor de planilhas. Verifique a conexão e tente de novo.');
  const wb = XLSX.read(new Uint8Array(buf), { type: 'array', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: false });
}
function vazioOuZero(v) { return v === null || v === undefined || String(v).trim() === '' || String(v).trim() === '0'; }
function funcaoDoTexto(v) {
  const t = norm(v);
  if (!t) return null;
  if (t.includes('receb')) return 'recebimento';
  if (t.includes('separa')) return 'separacao';
  if (t.includes('exped') || t.includes('saida')) return 'expedicao';
  return null;
}
function dataDaCelula(v) {
  if (v instanceof Date && !isNaN(v)) return v;
  if (typeof v === 'number' && v > 20000 && v < 80000) return new Date(Math.round((v - 25569) * 86400000) + 12 * 3600000);
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/.exec(String(v || '').trim());
  if (m) { const a = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return new Date(a, +m[2] - 1, +m[1], 12); }
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || '').trim());
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3], 12);
  return null;
}

/* ---------- interpretação ---------- */
function interpretarExtracao(linhas, nomeArquivo) {
  const r = { arquivo: nomeArquivo, erros: [], alertas: [], ignoradas: [], registros: [], lidas: 0, colunas: {}, opcionais: [] };
  const cab = acharCabecalho(linhas);
  if (!cab) { r.erros.push('Não encontrei o cabeçalho da extração (Atividade, Mês, Operador, Qtde Skus…). Confira se é o arquivo de produtividade do Kaizen.'); return r; }
  const m = cab.mapa;
  r.colunas = m;
  const faltando = Object.entries(OBRIGATORIAS).filter(([k]) => m[k] === undefined).map(([, rot]) => rot);
  if (m.mes === undefined && m.data === undefined) faltando.push('Mês');
  if (m.qtdeDias === undefined && m.dias === undefined && m.data === undefined) faltando.push('Qtde Dias');
  if (faltando.length) { r.erros.push(`Coluna obrigatória ausente: ${faltando.join(', ')}.`); return r; }
  r.opcionais = ['data', 'destino', 'divergencias'].filter(k => m[k] !== undefined);
  const brutos = [];
  for (let i = cab.i + 1; i < linhas.length; i++) {
    const l = linhas[i] || [];
    if (!l.some(x => x !== null && String(x).trim() !== '')) continue;
    r.lidas++;
    const nLinha = i + 1;
    const op = l[m.operador], at = l[m.atividade];
    if (vazioOuZero(op) || vazioOuZero(at)) { r.ignoradas.push({ linha: nLinha, motivo: 'Sem operador ou sem atividade (linha de totais ou em branco).' }); continue; }
    const s = String(op).replace(/\s+/g, ' ').trim();
    const pos = s.indexOf('-');
    if (pos < 0) { r.ignoradas.push({ linha: nLinha, motivo: `Operador "${s}" fora do formato "código - nome".` }); continue; }
    const codigo = s.slice(0, pos).trim(), nome = s.slice(pos + 1).trim();
    if (!codigo) { r.ignoradas.push({ linha: nLinha, motivo: `Operador "${s}" sem código.` }); continue; }
    const funcao = funcaoDoTexto(at);
    if (!funcao) { r.erros.push(`Linha ${nLinha}: função desconhecida "${String(at).trim()}" (esperado: Conferente de recebimento, Separação ou Conferência Expedição).`); continue; }
    const data = m.data !== undefined ? dataDaCelula(l[m.data]) : null;
    let mes = m.mes !== undefined ? mesDoTexto(l[m.mes]) : null;
    if (!mes && data) mes = data.getMonth() + 1;
    if (!mes) { r.erros.push(`Linha ${nLinha}: mês não reconhecido ("${l[m.mes] ?? ''}").`); continue; }
    let diasLista = m.dias !== undefined ? parseDias(l[m.dias]) : [];
    if (!diasLista.length && data) diasLista = [data.getDate()];
    const qd = m.qtdeDias !== undefined ? numeroTexto(l[m.qtdeDias]) : null;
    const num = k => m[k] !== undefined ? (numeroTexto(l[m[k]]) ?? 0) : 0;
    brutos.push({
      linha: nLinha, codigo, nome, funcao, mes, data, diasLista,
      diasFuncao: ok(qd) ? qd : diasLista.length,
      pedidos: num('pedidos'), nfs: num('nfs'), skus: num('skus'), unidades: num('unidades'),
      mediaKaizen: m.media !== undefined ? numeroTexto(l[m.media]) : null,
      pesoBruto: m.peso !== undefined ? numeroTexto(l[m.peso]) : null,
      volumeBruto: m.volume !== undefined ? numeroTexto(l[m.volume]) : null,
      destino: m.destino !== undefined && !vazioOuZero(l[m.destino]) ? String(l[m.destino]).trim() : null,
      divergencias: m.divergencias !== undefined ? numeroTexto(l[m.divergencias]) : null
    });
  }
  const meses = [...new Set(brutos.map(b => b.mes))];
  if (meses.length > 1) r.erros.push(`Mês divergente entre linhas: ${meses.map(x => MESES[x - 1]).join(', ')}. Importe um mês por arquivo.`);
  r.mes = meses.length ? meses.sort((a, b) => brutos.filter(x => x.mes === b).length - brutos.filter(x => x.mes === a).length)[0] : null;
  const anosData = [...new Set(brutos.filter(b => b.data).map(b => b.data.getFullYear()))];
  r.anoSugerido = anosData.length === 1 ? anosData[0] : null;
  /* agrupa por colaborador × função (extração diária ou por destino vira um lançamento mensal com detalhe) */
  const grupos = new Map();
  for (const b of brutos) {
    const k = b.codigo + '|' + b.funcao;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(b);
  }
  const permiteAgrupar = m.data !== undefined || m.destino !== undefined;
  for (const [k, gs] of grupos) {
    if (gs.length > 1 && !permiteAgrupar) {
      r.erros.push(`${gs[0].codigo} - ${gs[0].nome} aparece ${gs.length} vezes em ${FUNC[gs[0].funcao].nome} (linhas ${gs.map(g => g.linha).join(', ')}). Sem coluna Data ou Destino, cada colaborador deve ter uma linha por função.`);
      continue;
    }
    const dias = new Set(); gs.forEach(g => g.diasLista.forEach(d => dias.add(d)));
    const somaK = key => gs.reduce((s, g) => s + (ok(g[key]) ? g[key] : 0), 0);
    const reg = {
      linhas: gs.map(g => g.linha), codigo: gs[0].codigo, nome: gs[0].nome, funcao: gs[0].funcao, mes: gs[0].mes,
      diasLista: [...dias].sort((a, b) => a - b),
      diasFuncao: gs.length > 1 ? (dias.size || somaK('diasFuncao')) : gs[0].diasFuncao,
      pedidos: somaK('pedidos'), nfs: somaK('nfs'), skus: somaK('skus'), unidades: somaK('unidades'),
      mediaKaizen: gs.length === 1 ? gs[0].mediaKaizen : null,
      pesoBruto: gs.some(g => ok(g.pesoBruto)) ? somaK('pesoBruto') : null,
      volumeBruto: gs.some(g => ok(g.volumeBruto)) ? arred(somaK('volumeBruto'), 4) : null,
      divergencias: gs.some(g => ok(g.divergencias)) ? somaK('divergencias') : null,
      destino: gs.length === 1 ? gs[0].destino : (gs.some(g => g.destino) ? 'vários' : null)
    };
    if (m.data !== undefined) reg.diario = gs.filter(g => g.data).map(g => ({ data: `${g.data.getFullYear()}-${String(g.data.getMonth() + 1).padStart(2, '0')}-${String(g.data.getDate()).padStart(2, '0')}`, pedidos: g.pedidos, nfs: g.nfs, skus: g.skus, unidades: g.unidades, divergencias: g.divergencias, destino: g.destino }));
    if (m.destino !== undefined && gs.length > 1) {
      reg.porDestino = {};
      for (const g of gs) { const d = g.destino || 'sem destino'; const o = reg.porDestino[d] || (reg.porDestino[d] = { pedidos: 0, nfs: 0, skus: 0, unidades: 0 }); o.pedidos += g.pedidos; o.nfs += g.nfs; o.skus += g.skus; o.unidades += g.unidades; }
    }
    r.registros.push(reg);
  }
  return r;
}
/* validações que dependem do ano escolhido e do que já existe no banco */
function validarImportacao(r, ano) {
  const v = { erros: [...r.erros], alertas: [], novos: [], duplicidades: [], fatiados: [], login: [], desligados: [], nomes: [], diasOperacao: 0 };
  if (!r.registros.length && !v.erros.length) v.erros.push('Nenhuma linha válida encontrada no arquivo.');
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) v.erros.push('Ano inválido.');
  const mes = r.mes;
  const ym = mes ? ymDe(ano, mes) : null;
  if (ym != null && mesFechado(ym)) v.erros.push(`${rotuloYM(ym)} está fechado. Reabra o mês em Parâmetros e Metas antes de importar.`);
  for (const g of r.registros) {
    if (!ok(g.diasFuncao) || g.diasFuncao <= 0) v.erros.push(`${g.codigo} - ${g.nome} (${FUNC[g.funcao].nome}): dias zerados.`);
    const max = mes ? diasNoMes(ano, mes) : 31;
    const ruins = g.diasLista.filter(d => d < 1 || d > max);
    if (ruins.length) v.erros.push(`${g.codigo} - ${g.nome} (${FUNC[g.funcao].nome}): dias fora do calendário (${ruins.join(', ')}).`);
    if (g.diasLista.length && g.diasLista.length !== g.diasFuncao) v.alertas.push(`${g.codigo} - ${g.nome} (${FUNC[g.funcao].nome}): a lista tem ${g.diasLista.length} dias e "Qtde Dias" é ${g.diasFuncao}.`);
  }
  const codigos = [...new Set(r.registros.map(g => g.codigo))];
  for (const c of codigos) {
    const gs = r.registros.filter(g => g.codigo === c);
    if (!colab(c)) {
      const porF = {}; gs.forEach(g => { porF[g.funcao] = (porF[g.funcao] || 0) + g.diasFuncao; });
      const sug = Object.entries(porF).sort((a, b) => b[1] - a[1])[0][0];
      v.novos.push({ codigo: c, nome: gs[0].nome, funcaoSugerida: sug, porF });
    } else {
      const cad = colab(c);
      if (cad.nome && norm(cad.nome) !== norm(gs[0].nome)) v.nomes.push(`${c}: cadastro "${cad.nome}" × extração "${gs[0].nome}".`);
      if (ym != null && estaDesligado(c, ym)) v.desligados.push(`${c} - ${nomeExib(c)} está marcado como desligado (${fData(cad.dataDesligamento)}) e aparece na extração.`);
    }
    const dias = new Set(); let df = 0;
    gs.forEach(g => { g.diasLista.forEach(d => dias.add(d)); df += g.diasFuncao; });
    if (df > dias.size && dias.size) v.fatiados.push(`${c} - ${gs[0].nome}: ${df} dias-função em ${dias.size} dias de presença.`);
    for (let i = 0; i < gs.length; i++) for (let j = i + 1; j < gs.length; j++) {
      const a = gs[i], b = gs[j];
      if (a.diasFuncao === b.diasFuncao && a.pedidos === b.pedidos && a.nfs === b.nfs && a.skus === b.skus && a.unidades === b.unidades && iguais(a.diasLista, b.diasLista)) v.duplicidades.push({ codigo: c, nome: a.nome, funcoes: [a.funcao, b.funcao], texto: `${c} - ${a.nome}: lançamentos idênticos em ${FUNC[a.funcao].nome} e ${FUNC[b.funcao].nome} (${a.diasFuncao} dias, ${fInt(a.skus)} itens, ${fInt(a.unidades)} unidades).` });
    }
  }
  for (const f of FUNCOES) {
    const eleg = r.registros.filter(g => g.funcao === f.id && g.diasFuncao >= P().minimoDias);
    const med = mediana(eleg.map(g => g.skus / g.diasFuncao));
    if (med && eleg.length >= 3) for (const g of eleg) if (g.skus / g.diasFuncao > (P().fatorMediana || 2) * med) v.login.push(`${g.codigo} - ${g.nome} (${f.nome}): ${fD1(g.skus / g.diasFuncao)} itens/dia, mais que o dobro da mediana (${fD1(med)}). Verificar login compartilhado no coletor.`);
  }
  const dOp = new Set(); r.registros.forEach(g => g.diasLista.forEach(d => dOp.add(d)));
  v.diasOperacao = dOp.size;
  v.totais = FUNCOES.map(f => { const gs = r.registros.filter(g => g.funcao === f.id); return { funcao: f.id, linhas: gs.length, dias: soma(gs, g => g.diasFuncao), documentos: soma(gs, g => g.pedidos + g.nfs), itens: soma(gs, g => g.skus), unidades: soma(gs, g => g.unidades) }; });
  return v;
}
function docLancamentoImportado(g, ano, arquivo, agora, suspeitos) {
  const id = idLancamento(ano, g.mes, g.codigo, g.funcao);
  const susp = suspeitos.has(g.codigo + '|' + g.funcao);
  const doc = {
    ano, mes: g.mes, funcao: g.funcao, codigo: g.codigo, nomeKaizen: g.nome,
    diasLista: g.diasLista, diasFuncao: g.diasFuncao, pedidos: g.pedidos, nfs: g.nfs, skus: g.skus, unidades: g.unidades,
    mediaKaizen: ok(g.mediaKaizen) ? g.mediaKaizen : null, pesoBruto: ok(g.pesoBruto) ? g.pesoBruto : null, volumeBruto: ok(g.volumeBruto) ? g.volumeBruto : null,
    divergencias: ok(g.divergencias) ? g.divergencias : null, destino: g.destino || null,
    origem: 'importação', arquivo, importadoEm: agora, editadoEm: null,
    suspeito: susp, motivoSuspeita: susp ? 'Lançamento idêntico em outra função no mesmo mês (possível duplicidade).' : null
  };
  if (g.diario) doc.diario = g.diario;
  if (g.porDestino) doc.porDestino = g.porDestino;
  return { id, doc };
}
function diferencaMes(r, ano) {
  const ym = ymDe(ano, r.mes);
  const existentes = new Map(lancamentosPeriodo(ym, ym).map(l => [l.id, l]));
  const campos = ['diasLista', 'diasFuncao', 'pedidos', 'nfs', 'skus', 'unidades'];
  const res = { novos: [], alterados: [], iguais: [], ausentes: [] };
  const vistos = new Set();
  for (const g of r.registros) {
    const id = idLancamento(ano, g.mes, g.codigo, g.funcao);
    vistos.add(id);
    const e = existentes.get(id);
    if (!e) { res.novos.push(g); continue; }
    const mud = campos.filter(k => !iguais(e[k], g[k]));
    if (mud.length) res.alterados.push({ g, e, mud }); else res.iguais.push(g);
  }
  for (const [id, e] of existentes) if (!vistos.has(id)) res.ausentes.push(e);
  return res;
}

/* ---------- tela ---------- */
UI.imp = { etapa: 1, r: null, ano: null, modo: '', arquivo: '', erroLeitura: '', gravando: false, progresso: 0 };
function htmlEtapas(atual) {
  const et = [[1, 'Escolher arquivo'], [2, 'Conferir pré-visualização'], [3, 'Gravar']];
  return `<div class="etapas">${et.map(([n, r]) => `<span class="et${n === atual ? ' atual' : n < atual ? ' feita' : ''}"><b>${n < atual ? '✓' : n}</b>${esc(r)}</span>`).join('<span class="fraco">›</span>')}</div>`;
}
function htmlPrevia() {
  const im = UI.imp, r = im.r;
  const ano = im.ano;
  const v = validarImportacao(r, ano);
  const ym = r.mes ? ymDe(ano, r.mes) : null;
  const existe = ym != null && lancamentosPeriodo(ym, ym).length > 0;
  const dif = existe && !v.erros.length ? diferencaMes(r, ano) : null;
  const totais = modeloSimples([
    { id: 'f', rotulo: 'Função', valor: l => FUNC[l.funcao].nome, html: l => funcTag(l.funcao) },
    { id: 'lin', rotulo: 'Linhas', tipo: 'int', valor: l => l.linhas },
    { id: 'dias', rotulo: 'Dias-função', tipo: 'int', valor: l => l.dias },
    { id: 'docs', rotulo: 'Documentos', tipo: 'int', valor: l => l.documentos },
    { id: 'itens', rotulo: 'Itens', tipo: 'int', valor: l => l.itens },
    { id: 'unid', rotulo: 'Unidades', tipo: 'dx', valor: l => l.unidades }
  ], v.totais || [], { cartoes: false, rodape: { f: 'Total', lin: soma(v.totais || [], t => t.linhas), dias: soma(v.totais || [], t => t.dias), docs: soma(v.totais || [], t => t.documentos), itens: soma(v.totais || [], t => t.itens), unid: soma(v.totais || [], t => t.unidades) } });
  const lista = (titulo, itens, tipo) => itens.length ? avisoHTML(tipo, `<b>${esc(titulo)} (${itens.length})</b><ul style="margin:4px 0 0;padding-left:18px">${itens.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`) : '';
  const anoOpts = [];
  for (let a = new Date().getFullYear() + 1; a >= 2024; a--) anoOpts.push({ valor: a, rotulo: String(a) });
  const novos = v.novos.length ? `<div class="tabela-wrap"><table class="tbl"><thead><tr><th>Código</th><th>Nome no Kaizen</th><th>Dias por função</th><th>Função principal sugerida</th></tr></thead><tbody>${v.novos.map(n => `<tr><td>${esc(n.codigo)}</td><td>${esc(n.nome)}</td><td>${Object.entries(n.porF).map(([f, d]) => `${esc(FUNC[f].nome)} ${d}`).join(' · ')}</td><td>${funcTag(n.funcaoSugerida)}</td></tr>`).join('')}</tbody></table></div><p class="nota-tabela">Entram no cadastro como ativos, com a função sugerida (a de mais dias) e marcados para revisão em Colaboradores.</p>` : '';
  let difHTML = '';
  if (dif) {
    difHTML = bloco({ titulo: `${rotuloYM(ym)} já tem ${lancamentosPeriodo(ym, ym).length} lançamentos no painel`, desc: 'Escolha como gravar. Nada muda até você confirmar.', corpo: `
      <div class="kpis" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">
        ${kpiHTML({ rotulo: 'Novos no arquivo', valor: dif.novos.length })}
        ${kpiHTML({ rotulo: 'Com diferença', valor: dif.alterados.length })}
        ${kpiHTML({ rotulo: 'Iguais', valor: dif.iguais.length })}
        ${kpiHTML({ rotulo: 'Só no painel', valor: dif.ausentes.length, detalhe: 'saem se substituir' })}
      </div>
      ${dif.alterados.length ? `<ul style="margin:10px 0 0;padding-left:18px;font-size:13px">${dif.alterados.map(a => `<li><b>${esc(a.g.codigo)} - ${esc(a.g.nome)}</b> (${esc(FUNC[a.g.funcao].nome)}): ${a.mud.map(k => `${esc(ROTULOS_CAMPOS[k] || k)} ${esc(valorCampoTexto(k, a.e[k]))} → ${esc(valorCampoTexto(k, a.g[k]))}`).join('; ')}</li>`).join('')}</ul>` : ''}
      ${dif.ausentes.length ? `<p style="margin-top:8px;font-size:13px">Só no painel: ${esc(dif.ausentes.map(e => `${nomeExib(e.codigo)} (${FUNC[e.funcao].nome})`).join(', '))}.</p>` : ''}
      <div class="pilha" style="margin-top:12px">
        <label class="check"><input type="radio" name="modo-imp" value="substituir"${im.modo === 'substituir' ? ' checked' : ''}> <span><b>Substituir o mês inteiro</b>: o mês fica igual ao arquivo (${dif.ausentes.length} ${dif.ausentes.length === 1 ? 'lançamento sai' : 'lançamentos saem'}).</span></label>
        <label class="check"><input type="radio" name="modo-imp" value="mesclar"${im.modo === 'mesclar' ? ' checked' : ''}> <span><b>Mesclar</b>: grava as linhas do arquivo e mantém as que só existem no painel.</span></label>
      </div>` });
  }
  const bloqueado = v.erros.length > 0;
  const precisaModo = !!dif && !im.modo;
  const html = `
    ${bloco({ titulo: `Arquivo: ${im.arquivo}`, corpo: `<div class="form" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">
        <div class="campo"><label>Mês detectado</label><div class="inp" style="background:var(--surface-2)">${r.mes ? esc(MESES[r.mes - 1]) : TRACO}</div></div>
        ${campo({ id: 'imp-ano', rotulo: 'Ano (a extração não traz o ano)', valor: ano, opcoes: anoOpts, ajuda: r.anoSugerido ? `A coluna Data indica ${r.anoSugerido}.` : 'Padrão: ano corrente.' })}
        <div class="campo"><label>Dias de operação calculados</label><div class="inp" style="background:var(--surface-2)">${fInt(v.diasOperacao)} dias distintos com movimento</div></div>
        <div class="campo"><label>Linhas</label><div class="inp" style="background:var(--surface-2)">${r.lidas} lidas · ${r.registros.length} lançamentos · ${r.ignoradas.length} ignoradas</div></div>
      </div>
      ${r.opcionais.length ? `<p class="nota-tabela">Colunas opcionais encontradas e gravadas: ${esc(r.opcionais.map(o => ({ data: 'Data', destino: 'Destino/Canal', divergencias: 'Divergências' }[o])).join(', '))}.</p>` : ''}` })}
    ${bloqueado ? avisoHTML('erro', `<b>Importação bloqueada.</b> Corrija o arquivo e solte de novo:<ul style="margin:4px 0 0;padding-left:18px">${v.erros.map(e => `<li>${esc(e)}</li>`).join('')}</ul>`) : avisoHTML('ok', 'Nenhuma validação bloqueante. Confira os alertas abaixo antes de confirmar.')}
    ${bloco({ titulo: 'Totais por função', desc: 'Compare com o total da extração antes de gravar.', corpo: tabelaHTML(totais) })}
    ${r.ignoradas.length ? bloco({ titulo: `Linhas ignoradas (${r.ignoradas.length})`, corpo: `<ul style="margin:0;padding-left:18px;font-size:13px">${r.ignoradas.map(i => `<li>Linha ${i.linha}: ${esc(i.motivo)}</li>`).join('')}</ul>` }) : ''}
    ${v.novos.length ? bloco({ titulo: `Colaboradores novos (${v.novos.length})`, corpo: novos }) : ''}
    <div class="pilha">
      ${lista('Possível duplicidade (o lançamento entra marcado como suspeito)', v.duplicidades.map(d => d.texto), 'atencao')}
      ${lista('Itens/dia acima de 2 vezes a mediana da função', v.login, 'atencao')}
      ${lista('Soma de dias-função maior que os dias de presença', v.fatiados, 'info')}
      ${lista('Colaborador desligado aparece na extração', v.desligados, 'atencao')}
      ${lista('Nome diferente do cadastro (a chave é o código)', v.nomes, 'info')}
      ${lista('Outros alertas', v.alertas, 'info')}
    </div>
    ${difHTML}
    ${!bloqueado ? `<div class="linha">${botao('Voltar', 'imp-reiniciar', null, { classe: 'fantasma' })}<span class="espaco"></span>${precisaModo ? '<span class="muted">Escolha substituir ou mesclar para continuar.</span>' : ''}${botao(dif ? (im.modo === 'substituir' ? 'Substituir o mês e gravar' : im.modo === 'mesclar' ? 'Mesclar e gravar' : 'Confirmar importação') : 'Confirmar importação', 'imp-gravar', null, { classe: 'primario', ic: 'certo', desab: precisaModo || im.gravando })}</div>` : `<div class="linha">${botao('Escolher outro arquivo', 'imp-reiniciar', null, { classe: 'primario' })}</div>`}`;
  return html;
}
VIEWS.importar = () => {
  if (!podeEditar()) return { html: `${cabecalhoTela('Importar Extração')}${avisoHTML('info', 'A importação é feita por quem edita o painel. Você pode consultar as importações já feitas abaixo.')}${bloco({ titulo: 'Importações feitas', corpo: tabelaHTML(modeloImportacoes()) })}` };
  const im = UI.imp;
  let corpo;
  if (im.etapa === 1 || !im.r) {
    corpo = `<div class="soltar" id="zona-soltar" tabindex="0" role="button" aria-label="Escolher arquivo da extração">
        ${icone('importar')}
        <span class="t">Arraste e solte a extração do Kaizen aqui</span>
        <span class="muted">ou clique para escolher o arquivo (.xlsx, .xls ou .csv). As colunas são lidas pelo nome do cabeçalho, em qualquer ordem.</span>
        <input type="file" id="arquivo-imp" accept=".xlsx,.xls,.csv,.txt" hidden>
      </div>
      ${im.erroLeitura ? avisoHTML('erro', esc(im.erroLeitura)) : ''}
      ${avisoHTML('info', 'Rotina: peça ao suporte Kaizen a extração de produtividade do mês fechado (mesmo layout), solte aqui, confira a pré-visualização e confirme. O mês importado abre direto no Painel.')}`;
  } else if (im.etapa === 2) {
    corpo = htmlPrevia();
  } else {
    corpo = bloco({ titulo: 'Gravando…', corpo: `<div class="progresso"><i style="width:${Math.round(im.progresso * 100)}%"></i></div><p class="muted" style="margin-top:8px">Não feche a página até terminar.</p>` });
  }
  const html = `${cabecalhoTela('Importar Extração do Kaizen', 'Um arquivo por mês. Detecta o mês pelo conteúdo e pede o ano.')}
    ${htmlEtapas(im.etapa)}
    ${corpo}
    ${bloco({ titulo: 'Importações feitas', corpo: tabelaHTML(modeloImportacoes()) })}`;
  return {
    html,
    depois: raiz => {
      const zona = $('#zona-soltar', raiz), inp = $('#arquivo-imp', raiz);
      if (zona && inp) {
        zona.addEventListener('click', () => inp.click());
        zona.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); inp.click(); } });
        zona.addEventListener('dragover', ev => { ev.preventDefault(); zona.classList.add('ativo'); });
        zona.addEventListener('dragleave', () => zona.classList.remove('ativo'));
        zona.addEventListener('drop', ev => { ev.preventDefault(); zona.classList.remove('ativo'); const f = ev.dataTransfer.files && ev.dataTransfer.files[0]; if (f) processarArquivo(f); });
        inp.addEventListener('change', () => { const f = inp.files && inp.files[0]; if (f) processarArquivo(f); });
      }
      const selAno = $('#imp-ano', raiz);
      if (selAno) selAno.addEventListener('change', () => { UI.imp.ano = Number(selAno.value); UI.imp.modo = ''; render(); });
      $$('input[name="modo-imp"]', raiz).forEach(rd => rd.addEventListener('change', () => { UI.imp.modo = rd.value; render(); }));
    },
    exportar: { titulo: 'Importações feitas', subtitulo: '', secoes: [{ tipo: 'tabela', titulo: 'Importações', modelo: modeloImportacoes() }] }
  };
};
function modeloImportacoes() {
  const ls = [...S.importacoes.values()].sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')));
  return modeloSimples([
    { id: 'data', rotulo: 'Data', valor: l => fDataHora(l.data) },
    { id: 'arq', rotulo: 'Arquivo', valor: l => l.arquivo || '' },
    { id: 'mes', rotulo: 'Mês', valor: l => l.ano && l.mes ? rotuloYM(ymDe(l.ano, l.mes)) : (l.periodo || '') },
    { id: 'modo', rotulo: 'Modo', valor: l => ({ substituir: 'Substituir', mesclar: 'Mesclar', novo: 'Mês novo', 'carga inicial': 'Carga inicial' }[l.modo] || l.modo || '') },
    { id: 'lin', rotulo: 'Lançamentos', tipo: 'int', valor: l => l.linhas },
    ...FUNCOES.map(f => ({ id: 'it' + f.id, rotulo: `Itens ${f.curto}`, tipo: 'int', valor: l => l.totais && l.totais[f.id] ? l.totais[f.id].itens : null, ocultoCel: true })),
    { id: 'novos', rotulo: 'Novos', tipo: 'int', valor: l => Array.isArray(l.novosColaboradores) ? l.novosColaboradores.length : null }
  ], ls, { vazio: 'Nenhuma importação registrada.' });
}
async function processarArquivo(arquivo) {
  UI.imp = { etapa: 1, r: null, ano: null, modo: '', arquivo: arquivo.name, erroLeitura: '', gravando: false, progresso: 0 };
  if (!/\.(xlsx|xls|csv|txt)$/i.test(arquivo.name)) { UI.imp.erroLeitura = 'Formato não aceito. Use .xlsx, .xls ou .csv.'; render(); return; }
  toast('Lendo o arquivo…');
  try {
    const linhas = await lerArquivo(arquivo);
    const r = interpretarExtracao(linhas, arquivo.name);
    const hoje = new Date();
    let ano = r.anoSugerido || hoje.getFullYear();
    if (!r.anoSugerido && r.mes && r.mes > hoje.getMonth() + 1) ano = hoje.getFullYear() - 1;
    UI.imp.r = r; UI.imp.ano = ano; UI.imp.etapa = 2;
  } catch (e) {
    console.error(e);
    UI.imp.erroLeitura = `Não foi possível ler o arquivo: ${e.message}`;
  }
  render({ rolarTopo: true });
}
async function gravarImportacao() {
  const im = UI.imp, r = im.r, ano = im.ano;
  const v = validarImportacao(r, ano);
  if (v.erros.length) { toast('Há validações bloqueantes.', 'erro'); return; }
  const ym = ymDe(ano, r.mes);
  const existentes = lancamentosPeriodo(ym, ym);
  const existe = existentes.length > 0;
  if (existe && !im.modo) { toast('Escolha substituir ou mesclar.', 'erro'); return; }
  const modo = existe ? im.modo : 'novo';
  const agora = agoraISO();
  const suspeitos = new Set(v.duplicidades.flatMap(d => d.funcoes.map(f => d.codigo + '|' + f)));
  const ops = [];
  const antes = {}, depois = {};
  const idsArquivo = new Set();
  for (const g of r.registros) {
    const { id, doc } = docLancamentoImportado(g, ano, r.arquivo, agora, suspeitos);
    idsArquivo.add(id);
    const e = S.lancamentos.get(id);
    if (e) antes[id] = docLancamentoParaBanco(e);
    depois[id] = doc;
    ops.push(opGravar('lancamentos', id, doc));
  }
  if (modo === 'substituir') for (const e of existentes) if (!idsArquivo.has(e.id)) { antes[e.id] = docLancamentoParaBanco(e); ops.push(opExcluir('lancamentos', e.id)); }
  for (const n of v.novos) {
    ops.push(opGravar('colaboradores', n.codigo, { codigo: n.codigo, nome: n.nome, nomeCurto: nomeCurtoDe(n.nome), funcaoPrincipal: n.funcaoSugerida, funcaoPrincipalSugerida: n.funcaoSugerida, status: 'ativo', dataDesligamento: null, observacao: '', revisar: true, motivoRevisao: `Novo na importação de ${rotuloYM(ym).toLowerCase()}: confirmar função principal.`, rotasExternas: false, criadoEm: agora, atualizadoEm: agora }));
  }
  const diasMes = new Set();
  r.registros.forEach(g => g.diasLista.forEach(d => diasMes.add(d)));
  if (modo === 'mesclar') existentes.filter(e => !idsArquivo.has(e.id)).forEach(e => e.diasLista.forEach(d => diasMes.add(d)));
  const mAnt = docMes(ym);
  const calcAnt = mAnt && ok(Number(mAnt.diasOperacaoCalculado)) ? Number(mAnt.diasOperacaoCalculado) : null;
  const manual = mAnt && ok(Number(mAnt.diasOperacao)) && calcAnt != null && Number(mAnt.diasOperacao) !== calcAnt;
  ops.push(opGravar('meses', chaveYM(ym), {
    ...(mAnt ? docSimplesParaBanco(mAnt) : {}),
    ano, mes: r.mes,
    diasOperacao: manual ? Number(mAnt.diasOperacao) : diasMes.size,
    diasOperacaoCalculado: diasMes.size,
    escopoColeta: (mAnt && mAnt.escopoColeta) || escopoPadrao(ym),
    quebraSerie: mAnt && typeof mAnt.quebraSerie === 'boolean' ? mAnt.quebraSerie : ym === ymInicioRotas(),
    dataInicioRotasExternas: (mAnt && mAnt.dataInicioRotasExternas) || (ym === ymInicioRotas() ? P().inicioRotasExternas : null),
    situacao: 'aberto', observacao: (mAnt && mAnt.observacao) || '', atualizadoEm: agora
  }));
  const idImp = novoId('i');
  ops.push(opGravar('importacoes', idImp, {
    arquivo: r.arquivo, ano, mes: r.mes, linhas: r.registros.length, lidas: r.lidas, ignoradas: r.ignoradas.length, modo, data: agora, autorId: S.usuarioId || null,
    totais: Object.fromEntries(v.totais.map(t => [t.funcao, { linhas: t.linhas, dias: t.dias, documentos: t.documentos, itens: t.itens, unidades: t.unidades }])),
    novosColaboradores: v.novos.map(n => n.codigo), alertas: v.duplicidades.length + v.login.length + v.fatiados.length + v.alertas.length,
    diasOperacao: diasMes.size, colunasOpcionais: r.opcionais
  }));
  UI.imp.etapa = 3; UI.imp.gravando = true; UI.imp.progresso = 0;
  render();
  try {
    const todas = [...ops, opHistorico({ tipo: 'importacao', colecao: 'lancamentos', alvos: [...new Set([...Object.keys(antes), ...Object.keys(depois)])], resumo: `Importação de ${rotuloYM(ym)} (${modo === 'novo' ? 'mês novo' : modo}): ${r.registros.length} lançamentos do arquivo ${r.arquivo}`, antes, depois, mapa: true })];
    await executarOperacoes(todas, (f, t) => { UI.imp.progresso = f / t; const barra = $('.progresso i'); if (barra) barra.style.width = Math.round(f / t * 100) + '%'; });
    toast(`${rotuloYM(ym)} importado: ${r.registros.length} lançamentos.`, 'ok', 6000);
    UI.imp = { etapa: 1, r: null, ano: null, modo: '', arquivo: '', erroLeitura: '', gravando: false, progresso: 0 };
    UI.ym = ym;
    UI.visao = 'mensal';
    navegar('painel', {}, 'menu');
  } catch (e) {
    UI.imp.gravando = false;
    UI.imp.etapa = 2;
    toast(`A importação parou: ${e.message}${e.gravadas ? ` (${e.gravadas} gravações feitas; importe de novo com "Substituir" para completar).` : ''}`, 'erro', 10000);
    render();
  }
}
Object.assign(ACOES, {
  'imp-reiniciar': () => { UI.imp = { etapa: 1, r: null, ano: null, modo: '', arquivo: '', erroLeitura: '', gravando: false, progresso: 0 }; render({ rolarTopo: true }); },
  'imp-gravar': () => gravarImportacao()
});
