/* =========================================================================
   Rankings: mensal, acumulado, evolução de posições e campeões do mês.
   O ranking nunca mistura funções.
   ========================================================================= */

function abasHTML(abas, atual, acao, extraParams = {}) {
  return `<div class="abas" role="tablist">${abas.map(a => `<button type="button" role="tab" aria-selected="${a.id === atual}"${dataAcao(acao, { ...extraParams, aba: a.id })}>${esc(a.rotulo)}</button>`).join('')}</div>`;
}
ACOES['aba-rankings'] = p => { UI.params.aba = p.aba; const ult = UI.trilha[UI.trilha.length - 1]; if (ult.rota === 'rankings') ult.params.aba = p.aba; salvarPreferencias(); render(); };

function periodoAcumuladoUI() {
  const fim = UI.ym;
  const ini = UI.visao === 'acumulado' && UI.inicioAcum != null && UI.inicioAcum <= fim ? UI.inicioAcum : ymDe(anoDe(fim), 1);
  return { ini, fim };
}
function modeloEvolucaoPosicoes(fId, meses) {
  const cods = new Map();
  for (const y of meses) for (const r of linhasFuncao(y, y, fId)) {
    const c = cods.get(r.codigo) || { codigo: r.codigo, nome: r.nome, apoio: r.apoio, itens: 0 };
    c.itens += r.ag.skus; cods.set(r.codigo, c);
  }
  const linhas = [...cods.values()].sort((a, b) => (a.apoio - b.apoio) || (b.itens - a.itens));
  const cel = (codigo, y) => {
    const rk = ranking(y, y, fId, UI.leitura);
    const pos = rk.pos.get(codigo);
    const r = linhasFuncao(y, y, fId).find(x => x.codigo === codigo);
    if (!r) return { txt: '', cls: 'vazio' };
    if (pos) return { txt: `${pos}º`, cls: r.ind.situacao, r, pos };
    if (UI.leitura === 'principal' && r.apoio) return { txt: 'apoio', cls: 'insuf', r };
    return { txt: r.ind.situacao === 'insuf' ? `${r.ag.dias}d` : TRACO, cls: 'insuf', r };
  };
  return {
    colunas: [
      { id: 'nome', rotulo: 'Colaborador', valor: l => l.nome + (l.apoio ? ' (apoio)' : '') },
      ...meses.map(y => ({ id: 'm' + y, rotulo: rotuloYMCurto(y), valor: l => cel(l.codigo, y).pos ?? null, texto: l => cel(l.codigo, y).txt }))
    ],
    linhas, cel, meses
  };
}
function htmlEvolucaoPosicoes(fId, meses) {
  const m = modeloEvolucaoPosicoes(fId, meses);
  if (!m.linhas.length) return '<p class="muted">Sem lançamentos.</p>';
  const cab = `<tr><th scope="col" style="text-align:left">Colaborador</th>${meses.map(y => `<th scope="col" class="${y === UI.ym ? 'mes-atual' : ''}">${esc(rotuloYMCurto(y))}</th>`).join('')}</tr>`;
  const corpo = m.linhas.map(l => `<tr><td class="nome">${esc(l.nome)}${l.apoio ? ' <span class="selo apoio">apoio</span>' : ''}</td>${meses.map(y => {
    const c = m.cel(l.codigo, y);
    if (c.cls === 'vazio') return '<td class="cel sem-dado"></td>';
    const dica = `${l.nome} · ${rotuloYM(y)}\n${c.pos ? `${c.pos}º lugar · índice ${fPct(c.r.ind.indice)}` : c.txt === 'apoio' ? 'Apoio (função principal diferente)' : c.r.ind.motivo}`;
    return `<td class="cel ${c.cls}${y === UI.ym ? ' mes-atual' : ''}" tabindex="0"${dataAcao('ficha', { codigo: l.codigo, ym: y, f: fId })} data-dica="${esc(dica)}">${esc(c.txt)}</td>`;
  }).join('')}</tr>`).join('');
  return `<div class="calor-wrap"><table class="calor"><thead>${cab}</thead><tbody>${corpo}</tbody></table></div>`;
}
function modeloCampeoes(meses, fs) {
  return modeloSimples([
    { id: 'mes', rotulo: 'Mês', valor: l => rotuloYM(l.y) },
    ...fs.map(f => ({
      id: f.id, rotulo: f.nome,
      valor: l => { const c = campeao(l.y, f.id, UI.leitura); return c ? `${c.nome} (${fPct(c.ind.indice)})` : TRACO; },
      html: l => { const c = campeao(l.y, f.id, UI.leitura); return c ? `<button type="button" class="btn fantasma peq"${dataAcao('ficha', { codigo: c.codigo, ym: l.y, f: f.id })}>${icone('trofeu')}<span>${esc(c.nome)}</span></button> <span class="muted">${fPct(c.ind.indice)} · ${fD1(c.ind.itensDia)} itens/dia</span>` : `<span class="fraco">${TRACO}</span>`; }
    })),
    { id: 'esc', rotulo: 'Escopo', valor: l => infoMes(l.y).escopo, html: l => infoMes(l.y).quebraSerie ? `<span class="selo rotas">quebra de série</span> ${esc(infoMes(l.y).escopo)}` : esc(infoMes(l.y).escopo), ocultoCel: true }
  ], meses.slice().reverse().map(y => ({ y })), { cartoes: true });
}

VIEWS.rankings = params => {
  const aba = ['mensal', 'acumulado', 'evolucao', 'campeoes'].includes(params.aba) ? params.aba : (UI.visao === 'acumulado' ? 'acumulado' : 'mensal');
  const fs = funcoesFiltradas();
  const ym = UI.ym;
  const pa = periodoAcumuladoUI();
  const meses = mesesDoAnoAte(ym);
  const abas = [
    { id: 'mensal', rotulo: 'Mensal' }, { id: 'acumulado', rotulo: 'Acumulado' },
    { id: 'evolucao', rotulo: 'Evolução de posições' }, { id: 'campeoes', rotulo: 'Campeões do mês' }
  ];
  let corpo = '', secoes = [];
  if (aba === 'mensal' || aba === 'acumulado') {
    const ini = aba === 'mensal' ? ym : pa.ini;
    corpo = fs.map(f => {
      const m = modeloRanking({ ini, fim: ym, funcao: f.id, leitura: UI.leitura, visao: aba === 'mensal' ? 'mensal' : 'acumulado' });
      secoes.push({ tipo: 'tabela', titulo: `${aba === 'mensal' ? 'Ranking mensal' : 'Ranking acumulado'}: ${f.nome}`, modelo: m });
      return bloco({ titulo: `${f.nome} · ${aba === 'mensal' ? esc(rotuloYM(ym)) : esc(rotuloPeriodo(ini, ym))}`, corpo: tabelaHTML(m) });
    }).join('');
  } else if (aba === 'evolucao') {
    corpo = fs.map(f => {
      secoes.push({ tipo: 'tabela', titulo: `Evolução de posições: ${f.nome}`, modelo: modeloEvolucaoPosicoes(f.id, meses) });
      return bloco({ titulo: `${f.nome}: colocação mês a mês`, desc: 'Posição no ranking mensal, colorida pela situação. "apoio": função principal diferente; "Nd": N dias, abaixo do mínimo.', corpo: htmlEvolucaoPosicoes(f.id, meses) });
    }).join('');
  } else {
    const m = modeloCampeoes(meses, fs);
    secoes.push({ tipo: 'tabela', titulo: 'Campeões do mês', modelo: m });
    corpo = bloco({ titulo: 'Campeões do mês por função', desc: 'O 1º colocado de cada função em cada mês, pelo Índice de Eficiência.', corpo: tabelaHTML(m) });
  }
  const html = `${cabecalhoTela('Rankings', `${esc(aba === 'acumulado' ? rotuloPeriodo(pa.ini, ym) : rotuloYM(ym))} · leitura: ${esc(rotuloLeitura().toLowerCase())} · ${UI.funcao ? esc(FUNC[UI.funcao].nome) : 'as três funções, cada uma no seu ranking'}`, seletorLeitura())}
    ${abasHTML(abas, aba, 'aba-rankings')}
    ${aba !== 'campeoes' ? avisoQuebraPeriodo(aba === 'acumulado' ? { ini: pa.ini, fim: ym, mensal: false } : { ini: ym, fim: ym, mensal: true }) : ''}
    ${corpo}`;
  return { html, exportar: { titulo: `Rankings: ${abas.find(a => a.id === aba).rotulo}`, subtitulo: `${aba === 'acumulado' ? rotuloPeriodo(pa.ini, ym) : rotuloYM(ym)} · leitura: ${rotuloLeitura().toLowerCase()}`, secoes } };
};
