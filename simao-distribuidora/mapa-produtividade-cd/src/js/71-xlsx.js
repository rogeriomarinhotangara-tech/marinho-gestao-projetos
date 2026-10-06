/* =========================================================================
   Excel (.xlsx) com formatação nativa: cabeçalho formatado, largura de
   colunas ajustada, números com formato brasileiro e painel congelado.
   Gerador próprio (SpreadsheetML + ZIP sem compressão), sem dependência.
   ========================================================================= */

const XLSXW = (() => {
  const enc = new TextEncoder();
  const TAB = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; TAB[n] = c >>> 0; }
  function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = TAB[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zip(arquivos) {
    const d = new Date();
    const hora = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
    const data = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    const partes = [], central = [];
    let desloc = 0;
    for (const a of arquivos) {
      const nome = enc.encode(a.nome), dados = a.dados, crc = crc32(dados);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, hora, true); lh.setUint16(12, data, true); lh.setUint32(14, crc, true);
      lh.setUint32(18, dados.length, true); lh.setUint32(22, dados.length, true); lh.setUint16(26, nome.length, true); lh.setUint16(28, 0, true);
      partes.push(new Uint8Array(lh.buffer), nome, dados);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0, true); ch.setUint16(10, 0, true);
      ch.setUint16(12, hora, true); ch.setUint16(14, data, true); ch.setUint32(16, crc, true); ch.setUint32(20, dados.length, true); ch.setUint32(24, dados.length, true);
      ch.setUint16(28, nome.length, true); ch.setUint16(30, 0, true); ch.setUint16(32, 0, true); ch.setUint16(34, 0, true); ch.setUint16(36, 0, true);
      ch.setUint32(38, 0, true); ch.setUint32(42, desloc, true);
      central.push(new Uint8Array(ch.buffer), nome);
      desloc += 30 + nome.length + dados.length;
    }
    const tamCentral = central.reduce((s, p) => s + p.length, 0);
    const fim = new DataView(new ArrayBuffer(22));
    fim.setUint32(0, 0x06054b50, true); fim.setUint16(4, 0, true); fim.setUint16(6, 0, true);
    fim.setUint16(8, arquivos.length, true); fim.setUint16(10, arquivos.length, true);
    fim.setUint32(12, tamCentral, true); fim.setUint32(16, desloc, true); fim.setUint16(20, 0, true);
    const todas = [...partes, ...central, new Uint8Array(fim.buffer)];
    const total = todas.reduce((s, p) => s + p.length, 0);
    const out = new Uint8Array(total);
    let o = 0; for (const p of todas) { out.set(p, o); o += p.length; }
    return out;
  }
  const escXml = s => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const colLetra = i => { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  /* estilos: 0 texto · 1 cabeçalho · 2 int · 3 d1 · 4 d2 · 5 dx · 6 pct · 7 pct1 · 8 título · 9 subtítulo · 10 grupo · 11 total texto · 12-17 total numérico · 18 texto quebrado */
  const ESTILO_NUM = { int: 2, d1: 3, d2: 4, dx: 5, pct: 6, pct1: 7 };
  const ESTILO_TOTAL = { int: 12, d1: 13, d2: 14, dx: 15, pct: 16, pct1: 17 };
  const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="4"><numFmt numFmtId="164" formatCode="#,##0.0"/><numFmt numFmtId="165" formatCode="0.0%"/><numFmt numFmtId="166" formatCode="#,##0.###"/><numFmt numFmtId="167" formatCode="#,##0.00"/></numFmts>
<fonts count="5">
<font><sz val="10"/><color rgb="FF2B2321"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="10"/><color rgb="FF7D0003"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="14"/><color rgb="FF7D0003"/><name val="Calibri"/><family val="2"/></font>
<font><i/><sz val="9"/><color rgb="FF6E6360"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="10"/><color rgb="FF2B2321"/><name val="Calibri"/><family val="2"/></font>
</fonts>
<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFFEDE8"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF6F0EE"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>
<border><left/><right/><top/><bottom style="thin"><color rgb="FFD8CEC9"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="19">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf>
<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="167" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="9" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="4" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="3" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1"/>
<xf numFmtId="164" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1"/>
<xf numFmtId="167" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1"/>
<xf numFmtId="166" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1"/>
<xf numFmtId="9" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1"/>
<xf numFmtId="165" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
  function nomeAba(nome, usados) {
    let n = String(nome || 'Aba')
      .replace(/Conferência de Expedição/g, 'Expedição').replace(/^Mapa de calor/, 'Calor')
      .replace(/Itens\/dia da equipe contra a meta/, 'Equipe contra a meta')
      .replace(/\s*\([^)]*\)/g, '').replace(/\s*:\s*/g, ' - ').replace(/[\\/?*[\]]/g, ' ').replace(/\s+/g, ' ').trim() || 'Aba';
    if (n.length > 31) { const corte = n.slice(0, 31); n = (corte.lastIndexOf(' ') > 18 ? corte.slice(0, corte.lastIndexOf(' ')) : corte).replace(/[\s-]+$/, ''); }
    let base = n, i = 2;
    while (usados.has(n.toLowerCase())) { const suf = ` (${i++})`; n = base.slice(0, 31 - suf.length) + suf; }
    usados.add(n.toLowerCase());
    return n;
  }
  /* aba: { nome, titulo, subtitulo, blocos: [{ titulo, modelo }] } */
  function planilha(aba) {
    const linhasXml = [];
    const larg = [];
    let r = 0;
    let congelar = null;
    const marca = (ci, txt) => { const n = Math.min(70, String(txt ?? '').length + 2); larg[ci] = Math.max(larg[ci] || 9, n); };
    const celTexto = (ci, txt, s = 0) => { marca(ci, txt); return `<c r="${colLetra(ci)}${r}" t="inlineStr" s="${s}"><is><t xml:space="preserve">${escXml(txt)}</t></is></c>`; };
    const celNum = (ci, v, s) => { marca(ci, fNum(v, 'd2')); return `<c r="${colLetra(ci)}${r}" s="${s}"><v>${Number(v)}</v></c>`; };
    const linha = cels => { linhasXml.push(`<row r="${r}">${cels.join('')}</row>`); };
    r++; linha([`<c r="A${r}" t="inlineStr" s="8"><is><t xml:space="preserve">${escXml(aba.titulo || aba.nome)}</t></is></c>`]);
    r++; linha([`<c r="A${r}" t="inlineStr" s="9"><is><t xml:space="preserve">${escXml(aba.subtitulo || '')}</t></is></c>`]);
    r++;
    const numericos = ['int', 'd1', 'd2', 'dx', 'pct', 'pct1'];
    (aba.blocos || []).forEach((b, bi) => {
      if (b.paragrafos) {
        if (b.titulo) { r++; linha([`<c r="A${r}" t="inlineStr" s="10"><is><t xml:space="preserve">${escXml(b.titulo)}</t></is></c>`]); }
        for (const p of b.paragrafos) { r++; linha([`<c r="A${r}" t="inlineStr" s="0"><is><t xml:space="preserve">${escXml(p)}</t></is></c>`]); }
        r++;
        return;
      }
      const m = b.modelo;
      const cols = m.colunas.filter(c => c.exportar !== false && c.rotulo !== '');
      if (b.titulo) { r++; linha([`<c r="A${r}" t="inlineStr" s="10"><is><t xml:space="preserve">${escXml(b.titulo)}</t></is></c>`]); }
      r++; linha(cols.map((c, ci) => celTexto(ci, c.rotulo, 1)));
      if ((aba.blocos || []).length === 1) congelar = r;
      for (const l of m.linhas) {
        r++;
        if (l._grupo) { linha([`<c r="A${r}" t="inlineStr" s="10"><is><t xml:space="preserve">${escXml(l._grupo)}</t></is></c>`]); continue; }
        linha(cols.map((c, ci) => {
          const v = celulaValor(c, l);
          const tp = c.tipoLinha ? c.tipoLinha(l) : c.tipo;
          if (numericos.includes(tp) && typeof v === 'number' && Number.isFinite(v)) return celNum(ci, v, ESTILO_NUM[tp]);
          const t = celulaTexto(c, l);
          if (t === '' || t === null || t === undefined) return '';
          return celTexto(ci, t, String(t).length > 60 ? 18 : 0);
        }));
      }
      if (m.rodape) {
        r++;
        linha(cols.map((c, ci) => {
          const v = m.rodape[c.id];
          if (v === undefined || v === null) return `<c r="${colLetra(ci)}${r}" s="11"/>`;
          if (typeof v === 'number' && numericos.includes(c.tipo)) return celNum(ci, v, ESTILO_TOTAL[c.tipo]);
          return celTexto(ci, typeof v === 'number' ? fNum(v, c.tipo) : v, 11);
        }));
      }
      r++;
    });
    const cols = larg.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.max(8, Math.min(w, 70))}" customWidth="1"/>`).join('');
    const vista = congelar ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${congelar}" topLeftCell="A${congelar + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` : '<sheetViews><sheetView workbookViewId="0"/></sheetViews>';
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${vista}<sheetFormatPr defaultRowHeight="15"/>${cols ? `<cols>${cols}</cols>` : ''}<sheetData>${linhasXml.join('')}</sheetData><pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/></worksheet>`;
  }
  function gerar(abas) {
    const usados = new Set();
    const nomes = abas.map(a => nomeAba(a.nome, usados));
    const arq = [];
    const add = (nome, txt) => arq.push({ nome, dados: enc.encode(txt) });
    add('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${abas.map((a, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`);
    add('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`);
    const agora = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    add('docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${escXml(SISTEMA)}</dc:title><dc:creator>${escXml(EMPRESA)}</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${agora}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${agora}</dcterms:modified></cp:coreProperties>`);
    add('docProps/app.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>${escXml(SISTEMA)}</Application></Properties>`);
    add('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${nomes.map((n, i) => `<sheet name="${escXml(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`);
    add('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${abas.map((a, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${abas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
    add('xl/styles.xml', STYLES);
    abas.forEach((a, i) => add(`xl/worksheets/sheet${i + 1}.xml`, planilha({ ...a, nome: nomes[i] })));
    return zip(arq);
  }
  return { gerar };
})();

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const NOTA_QUEBRA_XLS = '⚠ ' + NOTA_QUEBRA.slice(2);
async function exportarTelaExcel() {
  const ex = UI.exportar;
  if (!ex) { toast('Esta tela não tem conteúdo para exportar.', 'erro'); return; }
  try {
    const abas = [];
    const resumo = [];
    for (const s of ex.secoes || []) {
      if (s.tipo === 'kpis') {
        resumo.push({ titulo: s.titulo, modelo: modeloSimples([{ id: 'r', rotulo: 'Indicador', valor: l => l.rotulo }, { id: 'v', rotulo: 'Valor', tipoLinha: l => typeof l.numero === 'number' ? l.formato : 'txt', valor: l => typeof l.numero === 'number' ? l.numero : l.valor }, { id: 'x', rotulo: 'Variação', valor: l => l.variacao }, { id: 'd', rotulo: 'Detalhe', valor: l => l.detalhe }], s.itens) });
        if (s.itens.some(it => /⚠/.test(it.variacao || ''))) resumo.push({ paragrafos: [NOTA_QUEBRA_XLS] });
      }
      else if (s.tipo === 'texto') resumo.push({ titulo: s.titulo, paragrafos: s.paragrafos });
      else if (s.tipo === 'tabela') abas.push({ nome: s.titulo, titulo: s.titulo, subtitulo: `${ex.titulo} · ${legendaFiltros()}`, blocos: [{ modelo: s.modelo }] });
    }
    if (resumo.length) abas.unshift({ nome: 'Resumo', titulo: ex.titulo, subtitulo: [ex.subtitulo, legendaFiltros(), `Emitido em ${new Date().toLocaleString('pt-BR')}`].filter(Boolean).join(' · '), blocos: resumo });
    if (!abas.length) { toast('Esta tela não tem tabela para exportar.', 'erro'); return; }
    const bytes = XLSXW.gerar(abas);
    await salvarArquivo(nomeArquivo(`Mapa_Produtividade_${ex.titulo}_${chaveYM(UI.ym)}`, 'xlsx'), new Blob([bytes], { type: MIME_XLSX }), MIME_XLSX);
  } catch (e) { console.error(e); toast('Falha ao gerar o Excel: ' + e.message, 'erro', 8000); }
}
function abasExcelCompleto(ym) {
  const ini = ymDe(anoDe(ym), 1);
  const leit = rotuloLeitura().toLowerCase();
  const sub = `${rotuloYM(ym)} · leitura do ranking: ${leit} · emitido em ${new Date().toLocaleString('pt-BR')}`;
  const temAnt = lancamentosPeriodo(ym - 1, ym - 1).length > 0;
  const k = kpisCD({ ini: ym, fim: ym, mensal: true }, temAnt ? { ini: ym - 1, fim: ym - 1, rotulo: rotuloYM(ym - 1).toLowerCase() } : null);
  const kA = kpisCD({ ini, fim: ym, mensal: false }, null);
  const modK = cards => modeloSimples([{ id: 'r', rotulo: 'Indicador', valor: l => l.rotulo }, { id: 'v', rotulo: 'Valor', tipoLinha: l => typeof l.numero === 'number' ? l.formato : 'txt', valor: l => typeof l.numero === 'number' ? l.numero : l.valor }, { id: 'x', rotulo: 'Variação', valor: l => l.variacao }, { id: 'd', rotulo: 'Detalhe', valor: l => l.detalhe }], cards.map(itemKpiExport));
  const totaisMes = modeloSimples([
    { id: 'f', rotulo: 'Função', valor: l => l.f.nome }, { id: 'lin', rotulo: 'Linhas', tipo: 'int', valor: l => l.t.ag.linhas }, { id: 'dias', rotulo: 'Dias-função', tipo: 'int', valor: l => l.t.ag.dias },
    { id: 'docs', rotulo: 'Documentos', tipo: 'int', valor: l => l.t.ag.documentos }, { id: 'it', rotulo: 'Itens', tipo: 'int', valor: l => l.t.ag.skus }, { id: 'un', rotulo: 'Unidades', tipo: 'dx', valor: l => l.t.ag.unidades },
    { id: 'itd', rotulo: 'Itens/dia', tipo: 'd1', valor: l => l.t.ind.itensDia }, { id: 'meta', rotulo: 'Meta itens/dia', tipo: 'd1', valor: l => l.t.ind.metaItens }, { id: 'idx', rotulo: 'Índice da equipe', tipo: 'pct', valor: l => l.t.ind.indice }, { id: 'pe', rotulo: 'Pessoas-equiv.', tipo: 'd1', valor: l => l.t.pessoasEq }
  ], FUNCOES.map(f => ({ f, t: totaisFuncao(ym, ym, f.id) })));
  const lancs = todosLancamentos();
  const base = modeloSimples([
    { id: 'ano', rotulo: 'Ano', tipo: 'int', valor: l => l.ano }, { id: 'mes', rotulo: 'Mês', tipo: 'int', valor: l => l.mes }, { id: 'nm', rotulo: 'Nome do mês', valor: l => MESES[l.mes - 1] },
    { id: 'f', rotulo: 'Função', valor: l => FUNC[l.funcao]?.nome || l.funcao }, { id: 'cod', rotulo: 'Código', valor: l => l.codigo }, { id: 'nk', rotulo: 'Nome (Kaizen)', valor: l => l.nomeKaizen || nomeCompleto(l.codigo) },
    { id: 'nc', rotulo: 'Nome curto', valor: l => nomeExib(l.codigo) }, { id: 'dl', rotulo: 'Dias (lista)', valor: l => l.diasLista.map(d => String(d).padStart(2, '0')).join(', ') },
    { id: 'dias', rotulo: 'Dias na função', tipo: 'int', valor: l => l.diasFuncao }, { id: 'ped', rotulo: 'Pedidos (OM)', tipo: 'int', valor: l => l.pedidos }, { id: 'nf', rotulo: 'NF', tipo: 'int', valor: l => l.nfs },
    { id: 'it', rotulo: 'Itens (SKU)', tipo: 'int', valor: l => l.skus }, { id: 'un', rotulo: 'Unidades', tipo: 'dx', valor: l => l.unidades }, { id: 'itd', rotulo: 'Itens/dia', tipo: 'd2', valor: l => div(l.skus, l.diasFuncao) },
    { id: 'mk', rotulo: 'Média Kaizen', tipo: 'd2', valor: l => ok(Number(l.mediaKaizen)) && l.mediaKaizen !== null ? Number(l.mediaKaizen) : null }, { id: 'pb', rotulo: 'Peso bruto (auditoria)', tipo: 'dx', valor: l => ok(Number(l.pesoBruto)) && l.pesoBruto !== null ? Number(l.pesoBruto) : null },
    { id: 'vb', rotulo: 'Volume bruto (auditoria)', tipo: 'dx', valor: l => ok(Number(l.volumeBruto)) && l.volumeBruto !== null ? Number(l.volumeBruto) : null }, { id: 'dv', rotulo: 'Divergências', tipo: 'int', valor: l => ok(Number(l.divergencias)) && l.divergencias !== null ? Number(l.divergencias) : null },
    { id: 'de', rotulo: 'Destino', valor: l => l.destino || '' }, { id: 'or', rotulo: 'Origem', valor: l => l.origem || '' }, { id: 'ar', rotulo: 'Arquivo', valor: l => l.arquivo || '' },
    { id: 'im', rotulo: 'Importado em', valor: l => l.importadoEm ? fDataHora(l.importadoEm) : '' }, { id: 'ed', rotulo: 'Editado em', valor: l => l.editadoEm ? fDataHora(l.editadoEm) : '' }, { id: 'su', rotulo: 'Suspeito', valor: l => l.suspeito ? 'sim' : '' }
  ], lancs, { rodape: { ano: `${lancs.length} lançamentos`, dias: soma(lancs, l => l.diasFuncao), ped: soma(lancs, l => l.pedidos), nf: soma(lancs, l => l.nfs), it: soma(lancs, l => l.skus), un: soma(lancs, l => l.unidades) } });
  const mesesAno = mesesDoAnoAte(ym);
  const mfMes = multifuncao(ym, ym), mfAno = multifuncao(ini, ym);
  const modMF = ls => modeloSimples([
    { id: 'cod', rotulo: 'Código', valor: l => l.codigo }, { id: 'n', rotulo: 'Colaborador', valor: l => l.nome }, { id: 'p', rotulo: 'Função principal', valor: l => l.principal ? FUNC[l.principal].nome : '' },
    { id: 'f', rotulo: 'Funções', valor: l => l.funcoes.map(f => FUNC[f].nome).join(' + ') }, { id: 'nf', rotulo: 'Nº de funções', tipo: 'int', valor: l => l.funcoes.length },
    { id: 'pr', rotulo: 'Dias de presença', tipo: 'int', valor: l => l.presenca }, { id: 'df', rotulo: 'Dias-função', tipo: 'int', valor: l => l.diasFuncao },
    { id: 'ft', rotulo: 'Fatiamento', tipo: 'd2', valor: l => l.fatiamento }, { id: 'al', rotulo: 'Alocação', tipo: 'pct', valor: l => l.alocacao }
  ], ls);
  const opMeses = modeloSimples([
    { id: 'mes', rotulo: 'Mês', valor: l => rotuloYM(l.y) }, { id: 'esc', rotulo: 'Escopo da coleta', valor: l => infoMes(l.y).escopo },
    { id: 'rec', rotulo: 'Unid. recebidas', tipo: 'dx', valor: l => l.o.t.recebimento.ag.unidades }, { id: 'sep', rotulo: 'Unid. separadas', tipo: 'dx', valor: l => l.o.t.separacao.ag.unidades },
    { id: 'exp', rotulo: 'Unid. conferidas', tipo: 'dx', valor: l => l.o.t.expedicao.ag.unidades }, { id: 'sal', rotulo: 'Saldo (rec − sep)', tipo: 'dx', valor: l => l.o.saldo },
    { id: 'ci', rotulo: 'Cobertura itens', tipo: 'pct1', valor: l => l.o.coberturaItens }, { id: 'cp', rotulo: 'Cobertura pedidos', tipo: 'pct1', valor: l => l.o.coberturaPedidos },
    { id: 'mo', rotulo: 'Relação MO (sep/exp)', tipo: 'd2', valor: l => l.o.relacaoMO }, { id: 'dop', rotulo: 'Dias de operação', tipo: 'int', valor: l => l.o.diasOperacao },
    ...FUNCOES.map(f => ({ id: 'pe' + f.id, rotulo: `Pessoas-eq. ${f.nome}`, tipo: 'd1', valor: l => l.o.pessoasEq[f.id] })),
    { id: 'cap', rotulo: 'Dias-função liberáveis', tipo: 'd1', valor: l => soma(FUNCOES, f => l.o.capacidade[f.id].dias) }
  ], mesesAno.map(y => ({ y, o: operacao(y, y) })));
  const capMes = operacao(ym, ym);
  const capModelo = modeloSimples([
    { id: 'f', rotulo: 'Função', valor: l => FUNC[l.funcao].nome }, { id: 'n', rotulo: 'Colaborador', valor: l => `${l.nome} (${l.codigo})` }, { id: 'd', rotulo: 'Dias', tipo: 'int', valor: l => l.dias },
    { id: 'i', rotulo: 'Índice', tipo: 'pct', valor: l => l.indice }, { id: 's', rotulo: 'Situação', valor: l => SITUACOES[l.situacao].rotulo }, { id: 'nc', rotulo: 'Dias se na meta', tipo: 'd1', valor: l => l.necessarios }, { id: 'lb', rotulo: 'Dias liberáveis', tipo: 'd1', valor: l => l.liberaveis }
  ], FUNCOES.flatMap(f => capMes.capacidade[f.id].detalhes.map(d => ({ ...d, funcao: f.id }))));
  const al = alertasDoMes(ym);
  const modAl = modeloSimples([
    { id: 'g', rotulo: 'Prioridade', valor: l => ({ alta: 'Alta', media: 'Atenção', info: 'Contexto' }[l.gravidade]) }, { id: 't', rotulo: 'Tipo', valor: l => TIPOS_ALERTA[l.tipo] || l.tipo },
    { id: 'f', rotulo: 'Função', valor: l => l.funcao ? FUNC[l.funcao].nome : '' }, { id: 'c', rotulo: 'Colaborador', valor: l => l.codigo ? `${nomeExib(l.codigo)} (${l.codigo})` : '' },
    { id: 'a', rotulo: 'Alerta', valor: l => l.titulo }, { id: 'd', rotulo: 'Detalhe', valor: l => l.texto }, { id: 'ac', rotulo: 'Ação', valor: l => { const a = acaoDoAlerta(l.id); return a ? SITUACOES_ACAO[a.situacao] : ''; } }
  ], al);
  const p = P();
  const modParam = modeloSimples([{ id: 'k', rotulo: 'Parâmetro', valor: l => l[0] }, { id: 'v', rotulo: 'Valor', valor: l => l[1] }], [
    ['Mínimo de dias para ranking', String(p.minimoDias)], ['Peso de itens no índice', fPct(p.pesoItens)], ['Peso de quantidade no índice', fPct(p.pesoQuantidade)], ['Tolerância "Na meta"', fPct(p.tolerancia)],
    ['Alerta de concentração', fPct(p.limiteConcentracao)], ['Alerta de queda de índice', fPct(p.limiteQueda)], ['Alerta de login (vezes a mediana)', fD1(p.fatorMediana)],
    ['Início das rotas externas no coletor', `${fData(p.inicioRotasExternas)}${p.inicioRotasConfirmado ? ' (confirmado)' : ' (a confirmar)'}`]
  ]);
  return [
    { nome: 'Resumo', titulo: `Resumo · ${rotuloYM(ym)}`, subtitulo: sub, blocos: [
      { titulo: `Cartões do mês (${rotuloYM(ym)})`, modelo: modK(k.cards) },
      ...(k.cards.some(c => c.variacao && c.variacao.quebra) ? [{ paragrafos: [NOTA_QUEBRA_XLS] }] : []),
      { titulo: `Cartões do acumulado (${rotuloPeriodo(ini, ym)})`, modelo: modK(kA.cards) },
      { titulo: 'Totais por função no mês', modelo: totaisMes },
      { titulo: 'Leitura gerencial automática', paragrafos: leituraGerencial(ym, ym, null, UI.leitura, 'mensal').map(f => textoPuro(f.html)) },
      { titulo: 'Escopo da coleta', paragrafos: [`${rotuloYM(ym)}: ${infoMes(ym).escopo}${infoMes(ym).quebraSerie ? ' (quebra de série)' : ''}.`] }
    ] },
    { nome: 'Ranking Mensal', titulo: `Ranking mensal · ${rotuloYM(ym)}`, subtitulo: sub, blocos: FUNCOES.map(f => ({ titulo: f.nome, modelo: modeloRanking({ ini: ym, fim: ym, funcao: f.id, leitura: UI.leitura, visao: 'mensal' }) })) },
    { nome: 'Ranking Acumulado', titulo: `Ranking acumulado · ${rotuloPeriodo(ini, ym)}`, subtitulo: sub, blocos: FUNCOES.map(f => ({ titulo: f.nome, modelo: modeloRanking({ ini, fim: ym, funcao: f.id, leitura: UI.leitura, visao: 'acumulado' }) })) },
    { nome: 'Evolução de Posições', titulo: 'Evolução de posições (ranking mensal)', subtitulo: sub, blocos: FUNCOES.map(f => ({ titulo: f.nome, modelo: modeloEvolucaoPosicoes(f.id, mesesAno) })).concat([{ titulo: 'Campeões do mês', modelo: modeloCampeoes(mesesAno, FUNCOES) }]) },
    { nome: 'Multifunção', titulo: 'Multifunção e alocação', subtitulo: `${sub} · fatiamento = dias-função ÷ presença; alocação = dias-função ÷ dias de operação`, blocos: [{ titulo: rotuloYM(ym), modelo: modMF(mfMes) }, { titulo: `Acumulado ${rotuloPeriodo(ini, ym)}`, modelo: modMF(mfAno) }] },
    { nome: 'Fluxo e Capacidade', titulo: 'Fluxo e capacidade', subtitulo: `${sub} · capacidade não considera qualidade nem função de apoio`, blocos: [{ titulo: 'Comparação entre meses', modelo: opMeses }, { titulo: `Capacidade potencial · ${rotuloYM(ym)}`, modelo: capModelo }] },
    { nome: 'Alertas', titulo: `Alertas · ${rotuloYM(ym)}`, subtitulo: sub, blocos: [{ modelo: modAl }] },
    { nome: 'Plano de Ação', titulo: 'Plano de ação', subtitulo: sub, blocos: [{ modelo: modeloPlano() }] },
    { nome: 'Lançamentos', titulo: 'Lançamentos (base completa)', subtitulo: `${lancs.length} lançamentos · peso e volume guardados só para auditoria`, blocos: [{ modelo: base }] },
    { nome: 'Parâmetros', titulo: 'Parâmetros, metas e meses', subtitulo: sub, blocos: [{ titulo: 'Parâmetros gerais', modelo: modParam }, { titulo: 'Metas com vigência', modelo: modeloMetas() }, { titulo: 'Meses', modelo: modeloMeses() }] }
  ];
}
async function exportarExcelCompleto(ym = UI.ym) {
  try {
    toast('Gerando o Excel completo…');
    const bytes = XLSXW.gerar(abasExcelCompleto(ym));
    await salvarArquivo(nomeArquivo(`Mapa_Produtividade_CD_Simao_${chaveYM(ym)}`, 'xlsx'), new Blob([bytes], { type: MIME_XLSX }), MIME_XLSX);
  } catch (e) { console.error(e); toast('Falha ao gerar o Excel: ' + e.message, 'erro', 8000); }
}
