// Word editável, aba por aba, com capa no estilo do relatório dos painéis.
// Uso: node build_docx.js <blocos.json> <saida.docx>
const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  AlignmentType, HeadingLevel, PageOrientation, Footer, PageNumber, TabStopType, PageBreak, VerticalAlign, HeightRule,
} = require('docx');
const [, , IN, OUT] = process.argv;
const J = JSON.parse(fs.readFileSync(IN, 'utf8'));
const FONT = 'Arial', INK = '10272B', INK2 = '3D5357', MUT = '6B7E82', ACC = '0A6A70', LINE = 'C9D4D4';
const PW = 11906, PH = 16838, MAR = 1000;
const CW = { p: PW - 2 * MAR, l: PH - 2 * MAR };
const PT = { 11: 7.5, 12: 8, 13: 8.5, 14: 9.5, 15: 10, 16: 11, 20: 13 };
const hp = (sz) => Math.round((PT[Math.round(sz)] || 8.5) * 2);
const brl = (v) => (v < 0 ? '−' : '') + 'R$ ' + Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const hex = (c) => (c || '').replace('#', '').toUpperCase();
const b1 = (color) => ({ style: BorderStyle.SINGLE, size: 4, color });
const NONE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const BOX = { top: b1(LINE), bottom: b1(LINE), left: b1(LINE), right: b1(LINE) };
const NOB = { top: NONE, bottom: NONE, left: NONE, right: NONE };

function run(t, o = {}) { return new TextRun({ text: t, font: FONT, size: o.size || 18, bold: !!o.bold, italics: !!o.i, color: o.color || INK }); }
function para(t, o = {}) {
  return new Paragraph({ children: [run(t, o)], alignment: o.al, spacing: { before: o.before || 0, after: o.after == null ? 80 : o.after }, keepNext: !!o.keepNext });
}

// ---------------- capa (uma tabela escura ocupando a página)
const C = Object.assign({ uni: 'Cruzeiro do Sul', per: 'atendimentos de 05 a 07/10/2026' }, J.capa), DARK = '0C2A2F', CARD = '10353B', CB = '1D4A51';
const coverW = PW - 2 * 720, half = Math.floor(coverW / 2);
function ccell(children, o = {}) {
  return new TableCell({
    children, columnSpan: o.span || 1, width: { size: o.span === 2 ? coverW : half, type: WidthType.DXA },
    shading: { fill: o.fill || DARK, type: ShadingType.CLEAR, color: 'auto' },
    borders: o.card ? { top: b1(CB), bottom: b1(CB), left: b1(CB), right: b1(CB) } : { top: b1(DARK), bottom: b1(DARK), left: b1(DARK), right: b1(DARK) },
    margins: { top: 160, bottom: 160, left: 360, right: 360 }, verticalAlign: o.va || VerticalAlign.TOP,
  });
}
const kpi = (lab, v, col) => ccell([para(lab, { size: 17, color: '8FB0B3', after: 40 }), para(brl(v), { size: 32, bold: true, color: col || 'FFFFFF', after: 0 })], { fill: CARD, card: true, va: VerticalAlign.CENTER });
const tocL = J.sheets.slice(0, 4), tocR = J.sheets.slice(4);
const tocP = (arr) => arr.map((s) => new Paragraph({ spacing: { after: 70 }, children: [run(String(s.n), { bold: true, color: 'FFFFFF', size: 18 }), run('  ·  ' + s.name, { color: 'CFE0E0', size: 18 })] }));
const coverRows = [
  new TableRow({ height: { value: 5600, rule: HeightRule.EXACT }, children: [ccell([
    new Paragraph({ spacing: { after: 500 }, children: [new TextRun({ text: ' NS ', font: FONT, bold: true, size: 30, color: 'FFFFFF', shading: { type: ShadingType.CLEAR, fill: ACC, color: 'auto' } })] }),
    para('Parceria de Tricologia', { size: 54, bold: true, color: 'FFFFFF', after: 0 }),
    para('Fechamento de ' + C.uni, { size: 54, bold: true, color: 'FFFFFF', after: 240 }),
    para(`Clínica Núcleo S × Dra. Patrícia Fabrini · ${C.per} · receitas, despesas, insumos, custo da sala${J.sheets.some((s) => s.name === 'Viagem') ? ', viagem' : ''} e a base de cálculo de cada valor, aba por aba.`, { size: 22, color: 'A9C4C6' }),
  ], { span: 2 })] }),
  new TableRow({ height: { value: 1350, rule: HeightRule.EXACT }, children: [kpi('Receita bruta', C.rec), kpi('Total das despesas descontadas', C.desp)] }),
  new TableRow({ height: { value: 1350, rule: HeightRule.EXACT }, children: [kpi('Resultado para dividir', C.res), kpi('Dra. Patrícia · 50%', C.pat, '9CC6FF')] }),
  new TableRow({ height: { value: 1300, rule: HeightRule.EXACT }, children: [ccell([para(`Sala: custo real de ${brl(C.sala_real)} por hora; nesta bateria de procedimentos foi negociado ${brl(C.sala_neg)} por hora (desconto de ${brl(C.desc)} concedido pela clínica).`, { size: 18, color: 'CFE0E0' })], { span: 2, va: VerticalAlign.CENTER })] }),
  new TableRow({ height: { value: 3600, rule: HeightRule.EXACT }, children: [ccell(tocP(tocL), { va: VerticalAlign.BOTTOM }), ccell(tocP(tocR), { va: VerticalAlign.BOTTOM })] }),
  new TableRow({ height: { value: 1600, rule: HeightRule.EXACT }, children: [ccell([para(`Controladoria · Rogério Marinho · gerado em ${C.data} · fonte: relatórios de transações do sistema, folhas de procedimento e ajustes da diretoria. Em amarelo, os valores que podem ser alterados na planilha.`, { size: 16, color: '7F9EA1' })], { span: 2, va: VerticalAlign.CENTER })] }),
];
const cover = new Table({ width: { size: coverW, type: WidthType.DXA }, columnWidths: [half, coverW - half], rows: coverRows });

// ---------------- abas
function footer(w) {
  return new Footer({ children: [new Paragraph({ tabStops: [{ type: TabStopType.RIGHT, position: w }], children: [
    run(`Clínica Núcleo S · Parceria de Tricologia · ${C.uni} · outubro/2026`, { size: 15, color: MUT }),
    new TextRun({ children: ['\tPágina ', PageNumber.CURRENT, ' de ', PageNumber.TOTAL_PAGES], font: FONT, size: 15, color: MUT }),
  ] })] });
}
function table(b, W) {
  const tot = b.w.reduce((a, x) => a + x, 0);
  const cw = b.w.map((x) => Math.floor((x / tot) * W)); cw[cw.length - 1] += W - cw.reduce((a, x) => a + x, 0);
  const rows = b.rows.map((row, ri) => {
    let ci = 0;
    const cells = row.cells.map((c) => {
      const w = cw.slice(ci, ci + c.span).reduce((a, x) => a + x, 0); ci += c.span;
      if (c.blank) return new TableCell({ children: [new Paragraph({ children: [] })], width: { size: w, type: WidthType.DXA }, borders: NOB });
      const hdr = row.hdr;
      const fill = hdr ? 'F3F7F7' : (c.fill && hex(c.fill) !== 'FFFFFF' ? hex(c.fill) : null);
      const color = hdr ? INK2 : (c.col && !['10272B', '000000'].includes(hex(c.col)) ? hex(c.col) : INK);
      const al = hdr ? (ci - c.span === 0 ? AlignmentType.LEFT : AlignmentType.CENTER) : ({ center: AlignmentType.CENTER, right: AlignmentType.RIGHT }[c.al] || AlignmentType.LEFT);
      const lines = String(c.t || '').split('\n');
      return new TableCell({
        children: lines.map((t) => new Paragraph({ alignment: al, spacing: { after: 0 }, children: [run(t, { size: hdr ? 15 : hp(c.sz), bold: hdr || c.b, i: c.i, color })] })),
        columnSpan: c.span, width: { size: w, type: WidthType.DXA }, borders: BOX, verticalAlign: VerticalAlign.CENTER,
        shading: fill ? { fill, type: ShadingType.CLEAR, color: 'auto' } : undefined,
      });
    });
    return new TableRow({ children: cells, cantSplit: true, tableHeader: ri === 0 && row.hdr });
  });
  return new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: cw, rows, margins: { top: 40, bottom: 40, left: 90, right: 90 } });
}
const sections = [{ properties: { page: { size: { width: PW, height: PH }, margin: { top: 720, bottom: 720, left: 720, right: 720 } } }, children: [cover] }];
for (const s of J.sheets) {
  const W = s.land ? CW.l : CW.p;
  const kids = [
    para(`ABA ${s.n} · ${s.name.toUpperCase()}`, { size: 15, bold: true, color: ACC, after: 40 }),
    new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { after: 60 }, children: [new TextRun({ text: s.title, font: FONT, size: 30, bold: true, color: INK })] }),
    para(s.sub, { size: 17, color: INK2, after: 160 }),
  ];
  let pb = false;
  for (const b of s.blocks) {
    if (b.k === 'pb') { pb = true; continue; }
    if (pb) { kids.push(new Paragraph({ children: [new PageBreak()] })); pb = false; }
    if (b.k === 'h') kids.push(new Paragraph({ heading: b.lvl === 1 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3, keepNext: true, spacing: { before: 160, after: 60 },
      children: [new TextRun({ text: b.t, font: FONT, size: b.lvl === 1 ? 21 : 19, bold: true, color: ACC })] }));
    else if (b.k === 'p') kids.push(para(b.t, { size: b.b ? 17 : 15, bold: b.b, i: b.i, color: b.b ? INK : MUT, after: 100 }));
    else if (b.k === 'kv') {
      if (b.num) kids.push(new Paragraph({ spacing: { after: 120 }, indent: { left: 420, hanging: 420 }, children: [run(b.a + '\t', { size: 22, bold: true, color: ACC }), run(b.b, { size: 18 })], tabStops: [{ type: TabStopType.LEFT, position: 420 }] }));
      else kids.push(new Paragraph({ spacing: { after: 30 }, tabStops: [{ type: TabStopType.RIGHT, position: Math.round(W * 0.6) }], children: [run(b.a, { size: 15, color: INK2 }), run('\t' + b.b, { size: 15, bold: true, color: '0F7F59' })] }));
    } else { kids.push(table(b, W)); kids.push(new Paragraph({ spacing: { after: 80 }, children: [] })); }
  }
  sections.push({
    properties: { page: { size: { width: PW, height: PH, orientation: s.land ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT }, margin: { top: 900, bottom: 900, left: MAR, right: MAR } } },
    footers: { default: footer(W) }, children: kids,
  });
}
const doc = new Document({
  creator: 'Controladoria · Clínica Núcleo S', title: 'Parceria de Tricologia — Fechamento de ' + C.uni,
  styles: { default: { document: { run: { font: FONT, size: 18 } } } }, sections,
});
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(OUT, buf); console.log('ok', OUT, sections.length - 1, 'abas'); });
