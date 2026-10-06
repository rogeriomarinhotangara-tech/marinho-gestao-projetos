/* =========================================================================
   PDF (jsPDF + jspdf-autotable): PDF da tela atual, Relatório Executivo
   Mensal e ficha individual. A4 retrato, margens de 1 cm.
   ========================================================================= */

const PDF_COR = { bordo: [125, 0, 3], simao: [255, 42, 0], texto: [43, 35, 33], texto2: [110, 99, 96], borda: [232, 226, 223], fundo: [251, 248, 247], tint: [255, 237, 232] };
const PDF_M = 10; // margem em mm
/* fontes padrão do PDF usam a codificação WinAnsi: troca símbolos que ela não tem */
function pdfTexto(s) {
  return String(s ?? '')
    .replace(/−/g, '-').replace(/≈/g, '~').replace(/→/g, '->').replace(/▲/g, '+').replace(/▼/g, '-')
    .replace(/⚠/g, '*').replace(/✓/g, '').replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/›/g, '>')
    .replace(/ | /g, ' ').replace(/[  ​]/g, '').replace(/[^\x09\x0a\x0d\x20-\x7e -ÿ–—‘’“”•…€]/g, '');
}
async function prepararPDF() {
  const okJ = await garantirBiblioteca('jspdf');
  const okT = okJ && await garantirBiblioteca('autotable');
  if (!okJ || !okT) throw new Error('Não foi possível carregar o gerador de PDF. Verifique a conexão e tente de novo.');
  if (!window.Chart) await garantirBiblioteca('chart');
}
function novoPDF() {
  const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  doc.setFont('helvetica', 'normal');
  doc.setLineHeightFactor(1.3);
  return doc;
}
const PDF_LARG = 210 - 2 * PDF_M;
function pdfCabecalho(doc, titulo, subtitulo) {
  doc.__paginasComCabecalho = doc.__paginasComCabecalho || new Set();
  doc.__paginasComCabecalho.add(doc.getCurrentPageInfo().pageNumber);
  try { doc.addImage(LOGO_CHAPEU, 'PNG', PDF_M, 7, 11, 10.2); } catch (e) { /* sem logo */ }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...PDF_COR.bordo);
  doc.text(pdfTexto(EMPRESA), PDF_M + 14, 11);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...PDF_COR.texto2);
  doc.text('Mapa de Produtividade', PDF_M + 14, 15);
  doc.setFontSize(8);
  doc.text(pdfTexto(`Emitido em ${new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`), 210 - PDF_M, 11, { align: 'right' });
  doc.setDrawColor(...PDF_COR.borda); doc.setLineWidth(0.3); doc.line(PDF_M, 19, 210 - PDF_M, 19);
  let y = 26;
  if (titulo) { doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...PDF_COR.bordo); const ls = doc.splitTextToSize(pdfTexto(titulo), PDF_LARG); doc.text(ls, PDF_M, y); y += ls.length * 6.5; }
  if (subtitulo) { doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...PDF_COR.texto2); const ls = doc.splitTextToSize(pdfTexto(subtitulo), PDF_LARG); doc.text(ls, PDF_M, y); y += ls.length * 4.6 + 2; }
  return y + 2;
}
function pdfRodapes(doc, rotulo) {
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...PDF_COR.texto2);
    doc.setDrawColor(...PDF_COR.borda); doc.line(PDF_M, 287, 210 - PDF_M, 287);
    doc.text(pdfTexto(`${rotulo} · Fonte: coletor Kaizen integrado ao Winthor`), PDF_M, 291);
    doc.text(`Página ${i} de ${n}`, 210 - PDF_M, 291, { align: 'right' });
  }
}
function pdfQuebraSePreciso(doc, y, altura) {
  if (y + altura > 282) { doc.addPage(); return pdfCabecalho(doc, '', ''); }
  return y;
}
function pdfTitulo(doc, y, texto) {
  y = pdfQuebraSePreciso(doc, y, 16);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...PDF_COR.bordo);
  doc.text(pdfTexto(texto), PDF_M, y + 4);
  doc.setDrawColor(...PDF_COR.simao); doc.setLineWidth(0.6); doc.line(PDF_M, y + 6, PDF_M + 14, y + 6); doc.setLineWidth(0.3);
  return y + 10;
}
function pdfParagrafos(doc, y, paragrafos, { tamanho = 11, marcadores = false, justificar = true } = {}) {
  doc.setFont('helvetica', 'normal'); doc.setFontSize(tamanho); doc.setTextColor(...PDF_COR.texto);
  const alturaLinha = tamanho * 0.3528 * 1.3;
  for (const p of paragrafos) {
    const recuo = marcadores ? 4 : 0;
    const linhas = doc.splitTextToSize(pdfTexto(p), PDF_LARG - recuo);
    const alt = linhas.length * alturaLinha + 2.2;
    y = pdfQuebraSePreciso(doc, y, Math.min(alt, 60));
    if (marcadores) { doc.setTextColor(...PDF_COR.simao); doc.text('•', PDF_M, y + alturaLinha * 0.75); doc.setTextColor(...PDF_COR.texto); }
    if (justificar && linhas.length > 1) {
      doc.text(pdfTexto(p), PDF_M + recuo, y + alturaLinha * 0.75, { maxWidth: PDF_LARG - recuo, align: 'justify' });
    } else {
      doc.text(linhas, PDF_M + recuo, y + alturaLinha * 0.75);
    }
    y += alt;
  }
  return y + 1;
}
const NOTA_QUEBRA = '* Comparação afetada pela quebra de série do escopo da coleta (entrada das rotas externas no coletor): o aumento de volume não é ganho de produtividade.';
function pdfNota(doc, y, texto) {
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...PDF_COR.texto2);
  const ls = doc.splitTextToSize(pdfTexto(texto), PDF_LARG);
  y = pdfQuebraSePreciso(doc, y, ls.length * 3.4 + 2);
  doc.text(ls, PDF_M, y + 2.5);
  return y + ls.length * 3.4 + 3;
}
function pdfKpis(doc, y, itens) {
  const temQuebra = itens.some(it => /⚠/.test(`${it.variacao || ''} ${it.detalhe || ''}`));
  const body = [];
  for (let i = 0; i < itens.length; i += 2) {
    const a = itens[i], b = itens[i + 1];
    body.push([pdfTexto(a.rotulo), pdfTexto(a.valor), pdfTexto([a.variacao, a.detalhe].filter(Boolean).join(' · ')), b ? pdfTexto(b.rotulo) : '', b ? pdfTexto(b.valor) : '', b ? pdfTexto([b.variacao, b.detalhe].filter(Boolean).join(' · ')) : '']);
  }
  doc.autoTable({
    startY: y, body, theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2, textColor: PDF_COR.texto, lineColor: PDF_COR.borda, lineWidth: 0.2, valign: 'middle' },
    columnStyles: { 0: { textColor: PDF_COR.texto2, cellWidth: 33 }, 1: { fontStyle: 'bold', fontSize: 11, cellWidth: 25, halign: 'right' }, 2: { textColor: PDF_COR.texto2, fontSize: 7.5 }, 3: { textColor: PDF_COR.texto2, cellWidth: 33 }, 4: { fontStyle: 'bold', fontSize: 11, cellWidth: 25, halign: 'right' }, 5: { textColor: PDF_COR.texto2, fontSize: 7.5 } },
    didDrawPage: () => {
      const pg = doc.getCurrentPageInfo().pageNumber;
      if (!doc.__paginasComCabecalho || !doc.__paginasComCabecalho.has(pg)) pdfCabecalho(doc, '', '');
    },
    margin: { left: PDF_M, right: PDF_M, top: 24 }
  });
  const y2 = doc.lastAutoTable.finalY + 1.5;
  return temQuebra ? pdfNota(doc, y2, NOTA_QUEBRA) + 4 : y2 + 4.5;
}
/* no PDF (A4 retrato) saem as colunas derivadas marcadas pdf:false; o Excel continua com todas */
function linhasExport(modelo) {
  const cols = modelo.colunas.filter(c => c.exportar !== false && c.pdf !== false && c.rotulo !== '');
  const linhas = [];
  for (const l of modelo.linhas) {
    if (l._grupo) { linhas.push({ grupo: l._grupo }); continue; }
    linhas.push({ cel: cols.map(c => celulaTexto(c, l)) });
  }
  return { cols, linhas };
}
/* larguras mínimas (mm) para as colunas de texto não quebrarem palavra por palavra */
const LARGURA_MIN_PDF = { nome: 30, situacao: 19, f: 22, mov: 9, pos: 8, a: 30, n: 30 };
function alturaTabelaEstimada(modelo, fonte = 7.6) {
  const n = modelo.linhas.length + 1 + (modelo.rodape ? 1 : 0);
  return n * (fonte * 0.3528 * 1.3 + 2.9) + 2;
}
function pdfTabela(doc, y, modelo, { fonte = 7.6 } = {}) {
  const { cols, linhas } = linhasExport(modelo);
  if (!linhas.length) return pdfParagrafos(doc, y, [modelo.vazio || 'Sem registros.'], { tamanho: 9 });
  const temQuebra = linhas.some(l => l.cel && l.cel.some(t => /⚠/.test(t)));
  const numerico = c => ['int', 'd1', 'd2', 'dx', 'pct', 'pct1'].includes(c.tipo);
  const body = linhas.map(l => l.grupo ? [{ content: pdfTexto(l.grupo), colSpan: cols.length, styles: { fillColor: PDF_COR.fundo, textColor: PDF_COR.texto2, fontStyle: 'bold', fontSize: fonte - 0.4 } }] : l.cel.map(pdfTexto));
  const foot = modelo.rodape ? [cols.map(c => { const v = modelo.rodape[c.id]; return v === undefined ? '' : pdfTexto(typeof v === 'number' ? fNum(v, c.tipo) : v); })] : undefined;
  doc.autoTable({
    startY: y, margin: { left: PDF_M, right: PDF_M, top: 24 }, head: [cols.map(c => pdfTexto(c.rotulo))], body, foot, theme: 'grid', showFoot: 'lastPage',
    styles: { font: 'helvetica', fontSize: fonte, cellPadding: 1.4, textColor: PDF_COR.texto, lineColor: PDF_COR.borda, lineWidth: 0.15, overflow: 'linebreak', valign: 'middle' },
    headStyles: { fillColor: PDF_COR.tint, textColor: PDF_COR.bordo, fontStyle: 'bold', fontSize: fonte - 0.4, lineColor: PDF_COR.borda },
    footStyles: { fillColor: PDF_COR.fundo, textColor: PDF_COR.texto, fontStyle: 'bold' },
    columnStyles: Object.fromEntries(cols.map((c, i) => [i, { ...(numerico(c) ? { halign: 'right' } : {}), ...(!numerico(c) && LARGURA_MIN_PDF[c.id] ? { minCellWidth: LARGURA_MIN_PDF[c.id] } : {}) }])),
    didDrawPage: () => {
      const pg = doc.getCurrentPageInfo().pageNumber;
      if (!doc.__paginasComCabecalho || !doc.__paginasComCabecalho.has(pg)) pdfCabecalho(doc, '', '');
    },
    rowPageBreak: 'avoid'
  });
  return temQuebra ? pdfNota(doc, doc.lastAutoTable.finalY + 1.5, NOTA_QUEBRA) + 4 : doc.lastAutoTable.finalY + 6;
}
/* título + tabela sem partir a tabela quando ela cabe inteira numa página nova */
function pdfTabelaComTitulo(doc, y, titulo, modelo, opts = {}) {
  const alt = alturaTabelaEstimada(modelo, opts.fonte) + 12;
  // cabe inteira numa página nova: quebra antes; não cabe nem assim: garante título, cabeçalho e 3 linhas juntos
  if (y + alt > 282 && (alt < 250 || y + 40 > 282)) { doc.addPage(); y = pdfCabecalho(doc, '', ''); }
  y = pdfTitulo(doc, y, titulo);
  return pdfTabela(doc, y, modelo, opts);
}
function pdfSubtitulo(doc, y, texto) {
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...PDF_COR.texto2);
  const ls = doc.splitTextToSize(pdfTexto(texto), PDF_LARG);
  doc.text(ls, PDF_M, y + 1);
  return y + ls.length * 4.4 + 2;
}
function pdfGrafico(doc, y, specFn, { altura = 70, legenda = '' } = {}) {
  const largPx = 1600, altPx = Math.round(largPx * altura / PDF_LARG);
  const img = imagemGrafico(specFn, largPx, altPx);
  if (!img) return pdfParagrafos(doc, y, ['Gráfico indisponível (biblioteca de gráficos não carregada).'], { tamanho: 9 });
  y = pdfQuebraSePreciso(doc, y, altura + (legenda ? 6 : 2));
  doc.addImage(img, 'PNG', PDF_M, y, PDF_LARG, altura);
  y += altura + 1.5;
  if (legenda) { doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...PDF_COR.texto2); const ls = doc.splitTextToSize(pdfTexto(legenda), PDF_LARG); doc.text(ls, PDF_M, y + 2.5); y += 2 + ls.length * 3.3; }
  return y + 3;
}
function pdfSecoes(doc, y, secoes) {
  for (const s of secoes) {
    if (s.tipo === 'kpis') { y = pdfTitulo(doc, y, s.titulo); y = pdfKpis(doc, y, s.itens); }
    else if (s.tipo === 'texto') { y = pdfTitulo(doc, y, s.titulo); y = pdfParagrafos(doc, y, s.paragrafos.filter(Boolean), { marcadores: !!s.marcadores, tamanho: s.tamanho || 10 }); }
    else if (s.tipo === 'tabela') { y = pdfTabelaComTitulo(doc, y, s.titulo, s.modelo, { fonte: s.fonte || 7.6 }); }
    else if (s.tipo === 'grafico') {
      const alt = Math.min(130, Math.max(55, (s.altura || 300) * 0.24));
      y = pdfQuebraSePreciso(doc, y, alt + 16);
      y = pdfTitulo(doc, y, s.titulo);
      y = pdfGrafico(doc, y, s.specFn, { altura: alt, legenda: s.legenda || '' });
    }
  }
  return y;
}
function nomeArquivo(base, ext) {
  return `${base}`.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '') + '.' + ext;
}
async function salvarArquivo(nome, dados) {
  if (!CAP.downloads) { toast('Este visualizador não permite salvar arquivos. Abra o painel pelo claude.ai num navegador e tente de novo.', 'erro', 8000); return false; }
  try {
    const r = await CAP.downloads.save({ filename: nome, data: dados });
    if (r && r.status === 'saved') toast(`Arquivo pronto: ${nome}`, 'ok');
    return true;
  } catch (e) {
    const code = e && e.code;
    if (code === 'declined') { toast('Arquivo não salvo: o salvamento foi cancelado.'); return false; }
    if (code === 'rate_limited') { toast('Já existe um arquivo aguardando confirmação. Conclua ou cancele o anterior e tente de novo.', 'erro', 7000); return false; }
    if (code === 'too_large') { toast('Arquivo grande demais para este visualizador. Exporte um período ou uma tela menor.', 'erro', 8000); return false; }
    if (code === 'bad_request' || code === 'transform_error' || code === 'rejected_extension') { toast(`Não foi possível salvar o arquivo (${code}).`, 'erro', 8000); return false; }
    // unavailable, not_granted, extension_not_enabled e demais: o visualizador não salva arquivos.
    CAP.downloads = null;
    agendarRender();
    toast('Este visualizador não permite salvar arquivos. Os botões de exportação foram ocultados.', 'erro', 8000);
    return false;
  }
}
function legendaFiltros() {
  const p = periodo();
  return `Mês: ${rotuloYM(UI.ym)} · Visão: ${p && !p.mensal ? `acumulado (${p.rotulo})` : 'mensal'} · Função: ${UI.funcao ? FUNC[UI.funcao].nome : 'todas'} · Leitura do ranking: ${rotuloLeitura().toLowerCase()}`;
}
async function exportarTelaPDF() {
  const ex = UI.exportar;
  if (!ex) { toast('Esta tela não tem conteúdo para exportar.', 'erro'); return; }
  toast('Gerando PDF…');
  try {
    await prepararPDF();
    const doc = novoPDF();
    let y = pdfCabecalho(doc, ex.titulo, [ex.subtitulo, legendaFiltros()].filter(Boolean).join(' · '));
    y = pdfSecoes(doc, y, ex.secoes || []);
    pdfRodapes(doc, `${SISTEMA} · ${ex.titulo}`);
    await salvarArquivo(nomeArquivo(`Mapa_Produtividade_${ex.titulo}_${chaveYM(UI.ym)}`, 'pdf'), doc.output('blob'), 'application/pdf');
  } catch (e) { console.error(e); toast(e.message || 'Falha ao gerar o PDF.', 'erro', 8000); }
}

/* ---------- Relatório Executivo Mensal ---------- */
function resumoExecutivo(ym) {
  const leitura = UI.leitura;
  const ant = ym - 1;
  const temAnt = lancamentosPeriodo(ant, ant).length > 0;
  const cd = totaisCD(ym, ym, null), cdA = temAnt ? totaisCD(ant, ant, null) : null;
  const afet = temAnt && comparacaoAfetada(ym, ant);
  const op = operacao(ym, ym);
  const frases = [];
  const varI = cdA && cdA.skus ? cd.skus / cdA.skus - 1 : null;
  frases.push(`Em ${rotuloYM(ym).toLowerCase()} o CD processou ${fInt(cd.documentos)} documentos, ${fInt(cd.skus)} itens e ${fInt(cd.unidades)} unidades nas três funções, com ${fInt(cd.dias)} dias-função de ${fInt(cd.colaboradores)} colaboradores${varI != null ? ` (itens ${fSinal(varI * 100, 'int')}% sobre ${rotuloYM(ant).toLowerCase()}${afet ? ', comparação afetada pela entrada das rotas externas no coletor' : ''})` : ''}.`);
  const pm = pctNaMeta(ym, ym, FUNCOES, leitura);
  frases.push(`O Índice do CD ficou em ${fPct(cd.indice)} da meta; ${pm.bons} de ${pm.eleg} avaliações elegíveis estão na meta ou acima (leitura: ${leitura === 'principal' ? 'função principal' : 'todos os lançamentos'}).`);
  const camp = FUNCOES.map(f => { const c = campeao(ym, f.id, leitura); return c ? `${c.nome} em ${f.nome} (${fPct(c.ind.indice)})` : null; }).filter(Boolean);
  if (camp.length) frases.push(`Campeões do mês: ${camp.join('; ')}.`);
  const riscos = [];
  for (const f of FUNCOES) { const c = op.concentracao[f.id]; if (c && c.share > P().limiteConcentracao) riscos.push(`${c.nome} concentrou ${fPct(c.share)} dos itens ${f.verboItens}`); }
  const al = alertasDoMes(ym);
  const altos = al.filter(a => a.gravidade === 'alta').length;
  frases.push(`${riscos.length ? `Risco de dependência: ${riscos.join('; ')}. ` : ''}${al.length ? `Foram gerados ${al.length} alertas automáticos (${altos} de prioridade alta).` : 'Nenhum alerta automático no mês.'}`);
  const capD = soma(FUNCOES, f => op.capacidade[f.id].dias);
  frases.push(`Fluxo: ${op.saldo != null ? (op.saldo >= 0 ? `entraram ${fInt(op.saldo)} unidades a mais do que foram separadas` : `foram separadas ${fInt(-op.saldo)} unidades a mais do que entraram`) : 'saldo indisponível'}; a conferência cobriu ${fPct1(op.coberturaItens)} dos itens separados; capacidade potencial de ${fD1(capD)} dias-função (≈ ${fD1(div(capD, op.diasOperacao))} pessoas-equivalentes) se os elegíveis abaixo de 100% chegassem à meta.`);
  return frases.slice(0, 5);
}
function glossarioPDF() {
  const p = P();
  return [
    `Itens/dia (SKU/dia): itens (linhas de SKU) ÷ dias trabalhados na função. Mede a complexidade: quantas referências diferentes foram tocadas por dia.`,
    `Unidades/dia: unidades movimentadas ÷ dias na função. Mede o volume físico.`,
    `Documentos/dia: pedidos (separação e expedição) ou notas fiscais (recebimento) ÷ dias na função.`,
    `Itens por documento: itens ÷ documentos (tamanho médio do pedido ou da nota). Unidades por item: unidades ÷ itens; alto = carga fechada, baixo = picking fracionado.`,
    `% da meta: indicador ÷ meta da função vigente no mês. No acumulado, soma-se o realizado e o previsto pela meta antes de dividir; nunca se faz média de percentuais mensais.`,
    `Índice de Eficiência: % da meta de itens × ${fPct(p.pesoItens)} + % da meta de quantidade × ${fPct(p.pesoQuantidade)}. Só é calculado com ${p.minimoDias} ou mais dias na função. É o critério do ranking (desempate pelo total de itens).`,
    `Situação: acima da meta (índice de 100% ou mais), na meta (de ${fPct(p.tolerancia)} a 100%), abaixo da meta (menos de ${fPct(p.tolerancia)}) ou dias insuficientes.`,
    `Fatiamento: dias-função ÷ dias de presença. Acima de 1, o dia foi dividido entre funções e a produtividade por dia fica subestimada. Alocação: dias-função ÷ dias de operação do CD.`,
    `Cobertura da conferência: itens (ou pedidos) conferidos na expedição ÷ separados. Relação de mão de obra: dias-função da separação ÷ dias-função da conferência. Saldo de fluxo: unidades recebidas − unidades separadas.`,
    `Pessoas-equivalentes: dias-função ÷ dias de operação. Capacidade potencial: para cada elegível abaixo de 100%, dias × (1 − índice); não considera qualidade nem função de apoio.`
  ];
}
function limitesPDF() {
  return [
    'A extração do Kaizen é mensal: sem dado por dia, hora ou turno. As médias diárias são médias do mês.',
    'Não há indicador de qualidade (erro de separação, divergência de conferência, devolução). Hoje só se mede volume.',
    'Peso e volume da extração não são reais: o "Peso Kg" é igual às unidades e o "Volume M³" é unidades ÷ 10.000 (cadastro logístico não preenchido). Ficam fora de todos os índices.',
    'Um dia dividido entre funções conta como um dia inteiro em cada uma (ver fatiamento).',
    'Unidades podem vir com casas decimais (rateio de caixa/fardo). A média do Kaizen vem sem casas decimais; o painel recalcula.',
    'A partir de 22/09/2026 o coletor passou a registrar também as rotas externas: o aumento de volume não é ganho de produtividade (quebra de série).'
  ];
}
async function exportarRelatorioExecutivo(ym = UI.ym) {
  toast('Gerando o Relatório Executivo…');
  try {
    await prepararPDF();
    const doc = novoPDF();
    const im = infoMes(ym);
    /* capa */
    try { doc.addImage(LOGO_SIMAO, 'PNG', 105 - 30, 38, 60, 62.7); } catch (e) { /* sem logo */ }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(...PDF_COR.bordo);
    doc.text('Relatório Executivo de Produtividade', 105, 128, { align: 'center' });
    doc.setFontSize(15); doc.setTextColor(...PDF_COR.simao);
    doc.text(pdfTexto(rotuloYM(ym)), 105, 140, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(...PDF_COR.texto);
    doc.text('Centro de Distribuição Simão Distribuidora · Rio Branco/AC', 105, 152, { align: 'center' });
    doc.setFontSize(9.5); doc.setTextColor(...PDF_COR.texto2);
    doc.text(pdfTexto(`Escopo da coleta: ${im.escopo}`), 105, 160, { align: 'center' });
    doc.text(pdfTexto(`Leitura do ranking: ${rotuloLeitura().toLowerCase()} · mínimo de ${P().minimoDias} dias · índice ${fNum(P().pesoItens * 100, 'int')}/${fNum(P().pesoQuantidade * 100, 'int')}`), 105, 166, { align: 'center' });
    doc.text(pdfTexto(`Situação do mês: ${im.situacao === 'fechado' ? 'fechado' : 'aberto (números ainda podem mudar)'} · emitido em ${new Date().toLocaleDateString('pt-BR')}`), 105, 172, { align: 'center' });
    doc.text('Fonte: coletor Kaizen integrado ao Winthor', 105, 178, { align: 'center' });
    doc.setDrawColor(...PDF_COR.simao); doc.setLineWidth(0.8); doc.line(85, 186, 125, 186);
    /* 1. resumo */
    doc.addPage();
    let y = pdfCabecalho(doc, `Relatório Executivo · ${rotuloYM(ym)}`, `Para o CEO e a gerência do CD · ${im.escopo}`);
    y = pdfTitulo(doc, y, '1. Resumo do mês');
    y = pdfParagrafos(doc, y, resumoExecutivo(ym), { tamanho: 11, marcadores: true });
    if (quebrasNoIntervalo(ym, ym).length || comparacaoAfetada(ym, ym - 1)) {
      y = pdfTitulo(doc, y, 'Quebra de série');
      y = pdfParagrafos(doc, y, [`A separação e a conferência das lojas Simão sempre foram feitas no coletor; as das rotas externas eram manuais e passaram para o coletor no fim de setembro/2026 (a partir de ${fData(P().inicioRotasExternas)}${P().inicioRotasConfirmado ? '' : ', data a confirmar'}). O escopo de ${rotuloYM(ym).toLowerCase()} é "${im.escopo}". O aumento de volume não é ganho de produtividade: é a entrada de uma operação que antes não era medida.`], { tamanho: 11 });
    }
    /* 2. cartões */
    const temAnt = lancamentosPeriodo(ym - 1, ym - 1).length > 0;
    const k = kpisCD({ ini: ym, fim: ym, mensal: true }, temAnt ? { ini: ym - 1, fim: ym - 1, rotulo: rotuloYM(ym - 1).toLowerCase() } : null);
    y = pdfTitulo(doc, y, '2. Cartões principais');
    y = pdfKpis(doc, y, k.cards.map(c => ({ rotulo: c.rotulo, valor: typeof c.valor === 'number' ? fNum(c.valor, c.formato || 'int') : TRACO, variacao: c.variacao && ok(c.variacao.valor) ? textoPuro(variacaoHTML(c.variacao)) : '', detalhe: textoPuro(c.detalhe || '') })));
    const mesesEvol = mesesDoAnoAte(ym);
    y = pdfQuebraSePreciso(doc, y, 80);
    y = pdfTitulo(doc, y, 'Evolução mensal de itens por função');
    const opMes = operacao(ym, ym);
    const juntas = opMes.coberturaItens != null && Math.abs(1 - opMes.coberturaItens) <= 0.05;
    y = pdfGrafico(doc, y, specEvolucaoItens(mesesEvol, FUNCOES), { altura: 62, legenda: `Azul: Recebimento · Laranja: Separação · Vinho: Conferência de Expedição · Tracejado: quebra de série${juntas ? '. As linhas de separação e conferência quase se sobrepõem porque a conferência cobre praticamente tudo o que é separado.' : ''}` });
    /* 3. rankings completos (cada função inteira na mesma página sempre que couber) */
    y = pdfQuebraSePreciso(doc, y, 60);
    y = pdfTitulo(doc, y, '3. Ranking das três funções');
    y = pdfSubtitulo(doc, y, `${rotuloYM(ym)} · leitura: ${rotuloLeitura().toLowerCase()} · cada função no seu ranking · ordem pelo Índice de Eficiência`);
    for (const f of FUNCOES) {
      y = pdfTabelaComTitulo(doc, y, f.nome, modeloRanking({ ini: ym, fim: ym, funcao: f.id, leitura: UI.leitura, visao: 'mensal', completa: false }), { fonte: 7.2 });
    }
    /* 4. destaques */
    y = pdfTitulo(doc, y, '4. Destaques e menores índices');
    const linhasDest = [];
    for (const f of FUNCOES) {
      const rk = ranking(ym, ym, f.id, UI.leitura);
      const { topo, fim } = primeirosEUltimos(rk);
      topo.forEach(r => linhasDest.push({ f, r, tipo: 'Destaque', pos: rk.pos.get(r.codigo) }));
      fim.forEach(r => linhasDest.push({ f, r, tipo: 'Menor índice', pos: rk.pos.get(r.codigo) }));
    }
    y = pdfTabela(doc, y, modeloSimples([
      { id: 'f', rotulo: 'Função', valor: l => l.f.nome }, { id: 't', rotulo: 'Grupo', valor: l => l.tipo }, { id: 'p', rotulo: 'Pos.', valor: l => `${l.pos}º` },
      { id: 'n', rotulo: 'Colaborador', valor: l => `${l.r.nome} (${l.r.codigo})` }, { id: 'd', rotulo: 'Dias', tipo: 'int', valor: l => l.r.ag.dias },
      { id: 'i', rotulo: 'Itens/dia', tipo: 'd1', valor: l => l.r.ind.itensDia }, { id: 'u', rotulo: 'Unid./dia', tipo: 'int', valor: l => l.r.ind.unidDia },
      { id: 'x', rotulo: 'Índice', tipo: 'pct', valor: l => l.r.ind.indice }, { id: 's', rotulo: 'Situação', valor: l => SITUACOES[l.r.ind.situacao].rotulo }
    ], linhasDest));
    /* 5. alertas */
    y = pdfTitulo(doc, y, '5. Alertas do mês');
    const al = alertasDoMes(ym);
    const comAcao = al.some(l => acaoDoAlerta(l.id));
    y = pdfTabela(doc, y, modeloSimples([
      { id: 'g', rotulo: 'Prioridade', valor: l => ({ alta: 'Alta', media: 'Atenção', info: 'Contexto' }[l.gravidade]) },
      { id: 'a', rotulo: 'Alerta', valor: l => l.titulo }, { id: 'd', rotulo: 'Detalhe', valor: l => l.texto },
      ...(comAcao ? [{ id: 'c', rotulo: 'Ação no plano', valor: l => { const a = acaoDoAlerta(l.id); return a ? `${SITUACOES_ACAO[a.situacao]}: ${a.acao}` : 'sem ação registrada'; } }] : [])
    ], al, { vazio: 'Nenhum alerta automático no mês.' }), { fonte: 7.2 });
    if (al.length && !comAcao) y = pdfNota(doc, y - 4, 'Nenhum destes alertas tem ação registrada no Plano de Ação até a emissão deste relatório.') + 3;
    /* 6. multifunção */
    y = pdfTitulo(doc, y, '6. Multifunção e alocação');
    y = pdfParagrafos(doc, y, ['Leia antes de cobrar produtividade individual: quem divide o dia entre funções tem cada dia contado inteiro em cada função, e a produtividade por dia fica subestimada.'], { tamanho: 10 });
    const mf = multifuncao(ym, ym).filter(m => m.funcoes.length > 1 || m.diasFuncao > m.presenca).sort((a, b) => (b.fatiamento || 0) - (a.fatiamento || 0));
    const op = operacao(ym, ym);
    y = pdfTabela(doc, y, modeloSimples([
      { id: 'n', rotulo: 'Colaborador', valor: l => `${l.nome} (${l.codigo})` }, { id: 'f', rotulo: 'Funções', valor: l => l.funcoes.map(f => FUNC[f].nome).join(' + ') },
      { id: 'p', rotulo: 'Presença', tipo: 'int', valor: l => l.presenca }, { id: 'd', rotulo: 'Dias-função', tipo: 'int', valor: l => l.diasFuncao },
      { id: 't', rotulo: 'Fatiamento', tipo: 'd2', valor: l => l.fatiamento }, { id: 'a', rotulo: 'Alocação', tipo: 'pct', valor: l => l.alocacao }
    ], mf, { vazio: 'Nenhum colaborador em mais de uma função no mês.' }));
    y = pdfTabela(doc, y, modeloSimples([
      { id: 'f', rotulo: 'Função', valor: l => l.f.nome }, { id: 'd', rotulo: 'Dias-função', tipo: 'int', valor: l => op.t[l.f.id].ag.dias },
      { id: 'p', rotulo: 'Pessoas-equivalentes', tipo: 'd1', valor: l => op.pessoasEq[l.f.id] }, { id: 'e', rotulo: 'Itens/dia da equipe', tipo: 'd1', valor: l => op.produtividade[l.f.id] }
    ], FUNCOES.map(f => ({ f })), { rodape: { f: 'Total', d: soma(FUNCOES, f => op.t[f.id].ag.dias), p: op.pessoasEqTotal } }));
    /* 7. fluxo e capacidade */
    y = pdfTitulo(doc, y, '7. Fluxo e capacidade');
    const capD = soma(FUNCOES, f => op.capacidade[f.id].dias), capA = soma(FUNCOES, f => op.capacidade[f.id].diasAbaixo);
    y = pdfKpis(doc, y, [
      { rotulo: 'Saldo de fluxo do mês', valor: fSinal(op.saldo, 'int'), detalhe: 'recebidas - separadas (unidades)' },
      { rotulo: `Saldo acumulado ${anoDe(ym)}`, valor: fSinal(saldoAcumulado(ym), 'int'), detalhe: 'janeiro até o mês' },
      { rotulo: 'Cobertura (itens)', valor: fPct1(op.coberturaItens), detalhe: 'conferidos / separados' },
      { rotulo: 'Cobertura (pedidos)', valor: fPct1(op.coberturaPedidos), detalhe: 'conferidos / separados' },
      { rotulo: 'Relação de mão de obra', valor: fD2(op.relacaoMO), detalhe: 'separação / conferência (dias-função)' },
      { rotulo: 'Capacidade potencial', valor: `${fD1(capD)} d`, detalhe: `~ ${fD1(div(capD, op.diasOperacao))} pessoas-eq.; só abaixo da meta: ${fD1(capA)} d` }
    ]);
    y = pdfParagrafos(doc, y, ['Ressalva: a capacidade potencial não considera qualidade nem função de apoio; no recebimento, o ritmo depende do volume que chega. Use como ordem de grandeza.'], { tamanho: 9.5 });
    /* 8. glossário e limites */
    doc.addPage(); y = pdfCabecalho(doc, 'Glossário e limites dos dados', '');
    y = pdfTitulo(doc, y, 'Como cada indicador é calculado');
    y = pdfParagrafos(doc, y, glossarioPDF(), { tamanho: 10, marcadores: true });
    y = pdfTitulo(doc, y, 'Limites dos dados');
    y = pdfParagrafos(doc, y, limitesPDF(), { tamanho: 10, marcadores: true });
    pdfRodapes(doc, `Relatório Executivo · ${rotuloYM(ym)}`);
    await salvarArquivo(nomeArquivo(`Relatorio_Executivo_CD_Simao_${chaveYM(ym)}`, 'pdf'), doc.output('blob'), 'application/pdf');
  } catch (e) { console.error(e); toast(e.message || 'Falha ao gerar o relatório.', 'erro', 8000); }
}

/* ---------- ficha individual ---------- */
async function exportarFichaPDF(codigo) {
  toast('Gerando a ficha em PDF…');
  try {
    await prepararPDF();
    const ym = UI.ym;
    const doc = novoPDF();
    const c = colab(codigo);
    const principal = funcaoPrincipalDe(codigo);
    let y = pdfCabecalho(doc, `Ficha individual · ${nomeExib(codigo)}`, `${nomeCompleto(codigo)} · código ${codigo} · função principal: ${principal ? FUNC[principal].nome : 'não definida'} · ${c && c.status === 'desligado' ? `desligado${c.dataDesligamento ? ' em ' + fData(c.dataDesligamento) : ''}` : 'ativo'} · referência: ${rotuloYM(ym)}`);
    const caixa = document.createElement('div'); caixa.innerHTML = avisosFicha(codigo, ym);
    const avs = [...caixa.querySelectorAll('.aviso')].map(e => textoPuro(e.innerHTML)).filter(Boolean);
    if (avs.length) { y = pdfTitulo(doc, y, 'Avisos'); y = pdfParagrafos(doc, y, avs, { tamanho: 9.5, marcadores: true }); }
    y = pdfTitulo(doc, y, `Indicadores de ${rotuloYM(ym)}`);
    y = pdfTabela(doc, y, modeloIndicadoresColab(codigo, ym, ym));
    const acum = periodoAcumuladoUI();
    y = pdfTitulo(doc, y, `Acumulado ${rotuloPeriodo(acum.ini, acum.fim)}`);
    y = pdfTabela(doc, y, modeloIndicadoresColab(codigo, acum.ini, acum.fim));
    const meses = mesesDoAnoAte(ym);
    for (const f of FUNCOES.filter(f => meses.some(m => linhasFuncao(m, m, f.id).some(r => r.codigo === codigo)))) {
      y = pdfQuebraSePreciso(doc, y, 70);
      y = pdfTitulo(doc, y, `Evolução de itens/dia: ${f.nome}`);
      y = pdfGrafico(doc, y, specFichaFuncao(codigo, f.id, meses), { altura: 50, legenda: 'Linha contínua: itens/dia do colaborador · tracejada: meta vigente' });
    }
    y = pdfTitulo(doc, y, 'Colocação mês a mês');
    y = pdfTabela(doc, y, modeloPosicoesColab(codigo, meses));
    y = pdfTitulo(doc, y, 'Multifunção mês a mês');
    y = pdfTabela(doc, y, modeloMultiColab(codigo, meses));
    const planos = [...S.planoAcao.values()].filter(pl => String(pl.codigo) === String(codigo));
    if (planos.length) {
      y = pdfTitulo(doc, y, 'Planos de ação');
      y = pdfTabela(doc, y, modeloSimples([{ id: 'a', rotulo: 'O quê', valor: l => l.acao }, { id: 'r', rotulo: 'Responsável', valor: l => l.responsavel }, { id: 'p', rotulo: 'Prazo', valor: l => fData(l.prazo) }, { id: 's', rotulo: 'Situação', valor: l => SITUACOES_ACAO[l.situacao] }, { id: 'x', rotulo: 'Resultado', valor: l => l.resultado || '' }], planos));
    }
    y = pdfQuebraSePreciso(doc, y, 92);
    y = pdfTitulo(doc, y, 'Conversa de retorno');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...PDF_COR.texto);
    for (const rot of ['Pontos fortes', 'Pontos a desenvolver', 'Combinados e prazos']) {
      doc.text(rot, PDF_M, y + 4);
      doc.setDrawColor(...PDF_COR.borda);
      for (let i = 1; i <= 3; i++) doc.line(PDF_M, y + 4 + i * 6.5, 210 - PDF_M, y + 4 + i * 6.5);
      y += 27;
    }
    doc.line(PDF_M, y + 8, PDF_M + 80, y + 8); doc.line(210 - PDF_M - 80, y + 8, 210 - PDF_M, y + 8);
    doc.setFontSize(8.5); doc.setTextColor(...PDF_COR.texto2);
    doc.text('Colaborador', PDF_M, y + 12); doc.text('Gestor', 210 - PDF_M - 80, y + 12);
    pdfRodapes(doc, `Ficha individual · ${nomeExib(codigo)} (${codigo})`);
    await salvarArquivo(nomeArquivo(`Ficha_${nomeExib(codigo)}_${codigo}_${chaveYM(ym)}`, 'pdf'), doc.output('blob'), 'application/pdf');
  } catch (e) { console.error(e); toast(e.message || 'Falha ao gerar a ficha.', 'erro', 8000); }
}
