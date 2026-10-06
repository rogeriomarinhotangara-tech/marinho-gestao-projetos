/* =========================================================================
   Gráficos (Chart.js): paleta lida dos tokens do tema, linha de meta com
   faixa de tolerância, marcação de quebra de série e rótulos seletivos.
   Os mesmos "specs" desenham na tela e nas imagens dos PDFs (tema claro).
   ========================================================================= */

const GRAF = { instancias: [], pendentes: [] };
const PALETA_CLARA = {
  texto: '#2B2321', texto2: '#6E6360', fraco: '#9A918E', grade: '#EFEAE8', eixo: '#D8CEC9', superficie: '#FFFFFF',
  simao: '#FF2A00', bordo: '#7D0003', ok: '#1F9D55', warn: '#E0A100', bad: '#C0262D', na: '#9A918E',
  funcao: { recebimento: '#4C7FD3', separacao: '#EB6834', expedicao: '#8D2661' }
};
function token(nome) { return getComputedStyle(document.documentElement).getPropertyValue(nome).trim(); }
function paletaAtual() {
  return {
    texto: token('--text'), texto2: token('--text-2'), fraco: token('--muted'), grade: token('--grid'), eixo: token('--axis'), superficie: token('--surface'),
    simao: token('--simao'), bordo: token('--bordo'), ok: token('--ok'), warn: token('--warn'), bad: token('--bad'), na: token('--na'),
    funcao: { recebimento: token('--f-rec'), separacao: token('--f-sep'), expedicao: token('--f-exp') }
  };
}
function comAlfa(hex, a) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
const reduzMovimento = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- plugins ---------- */
const pluginLinhaMeta = {
  id: 'linhaMeta',
  beforeDatasetsDraw(chart, args, o) {
    if (!o || !ok(o.valor) || !ok(o.tolerancia)) return;
    const { ctx, chartArea: a } = chart;
    const esc = chart.scales[o.eixo === 'x' ? 'x' : 'y'];
    if (!esc) return;
    const p1 = esc.getPixelForValue(o.valor * o.tolerancia), p2 = esc.getPixelForValue(o.valor);
    ctx.save();
    ctx.fillStyle = o.corFaixa || 'rgba(224,161,0,.14)';
    if (o.eixo === 'x') ctx.fillRect(Math.min(p1, p2), a.top, Math.abs(p2 - p1), a.bottom - a.top);
    else ctx.fillRect(a.left, Math.min(p1, p2), a.right - a.left, Math.abs(p2 - p1));
    ctx.restore();
  },
  afterDatasetsDraw(chart, args, o) {
    if (!o || !ok(o.valor)) return;
    const { ctx, chartArea: a } = chart;
    const esc = chart.scales[o.eixo === 'x' ? 'x' : 'y'];
    if (!esc) return;
    const p = esc.getPixelForValue(o.valor);
    ctx.save();
    ctx.strokeStyle = o.cor || '#2B2321';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (o.eixo === 'x') { ctx.moveTo(p, a.top); ctx.lineTo(p, a.bottom); }
    else { ctx.moveTo(a.left, p); ctx.lineTo(a.right, p); }
    ctx.stroke();
    if (o.rotulo) {
      ctx.fillStyle = o.cor || '#2B2321';
      ctx.font = `700 11px ${getComputedStyle(document.body).fontFamily || 'sans-serif'}`;
      if (o.eixo === 'x') {
        const larg = ctx.measureText(o.rotulo).width;
        const esquerda = p + 5 + larg > a.right;
        ctx.textAlign = esquerda ? 'right' : 'left';
        ctx.fillText(o.rotulo, p + (esquerda ? -5 : 5), o.posRotulo === 'topo' ? a.top + 11 : a.bottom - 6);
      }
      else { ctx.textAlign = 'right'; ctx.fillText(o.rotulo, a.right - 4, p - 5); }
    }
    ctx.restore();
  }
};
const pluginQuebra = {
  id: 'quebraSerie',
  afterDatasetsDraw(chart, args, o) {
    if (!o || !Array.isArray(o.indices) || !o.indices.length) return;
    const { ctx, chartArea: a } = chart;
    const x = chart.scales.x;
    if (!x) return;
    ctx.save();
    for (const i of o.indices) {
      if (i < 0) continue;
      const px = i > 0 ? (x.getPixelForValue(i - 1) + x.getPixelForValue(i)) / 2 : x.getPixelForValue(i) - 8;
      ctx.strokeStyle = o.cor || '#E0A100';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(px, a.top); ctx.lineTo(px, a.bottom); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = o.corTexto || '#6E6360';
      ctx.font = `500 10.5px ${getComputedStyle(document.body).fontFamily || 'sans-serif'}`;
      const rot = o.rotulo || 'Quebra de série';
      const cabe = px + 4 + ctx.measureText(rot).width <= chart.width - 2;
      ctx.textAlign = cabe ? 'left' : 'right';
      ctx.fillText(rot, cabe ? px + 4 : px - 4, a.top + 10);
    }
    ctx.restore();
  }
};
const pluginRotulos = {
  id: 'rotulosPontos',
  afterDatasetsDraw(chart, args, o) {
    if (!o || !o.rotulos) return;
    const { ctx } = chart;
    ctx.save();
    ctx.font = `500 11px ${getComputedStyle(document.body).fontFamily || 'sans-serif'}`;
    ctx.fillStyle = o.cor || '#2B2321';
    ctx.textBaseline = 'middle';
    chart.data.datasets.forEach((ds, di) => {
      const meta = chart.getDatasetMeta(di);
      if (meta.hidden) return;
      meta.data.forEach((pt, i) => {
        const r = o.rotulos[di] && o.rotulos[di][i];
        if (!r) return;
        const x = pt.x + 8 + ctx.measureText(r).width > chart.chartArea.right ? pt.x - 8 : pt.x + 8;
        ctx.textAlign = x < pt.x ? 'right' : 'left';
        ctx.fillText(r, x, pt.y - 1);
      });
    });
    ctx.restore();
  }
};
const pluginFimBarra = {
  id: 'valorFimBarra',
  afterDatasetsDraw(chart, args, o) {
    if (!o || !o.formatar) return;
    const { ctx } = chart;
    ctx.save();
    ctx.font = `500 11px ${getComputedStyle(document.body).fontFamily || 'sans-serif'}`;
    ctx.fillStyle = o.cor || '#2B2321';
    ctx.textBaseline = 'middle';
    chart.data.datasets.forEach((ds, di) => {
      if (o.dataset !== undefined && o.dataset !== di) return;
      const meta = chart.getDatasetMeta(di);
      meta.data.forEach((el, i) => {
        const v = ds.data[i];
        if (v === null || v === undefined) return;
        const t = o.formatar(v, i);
        if (chart.options.indexAxis === 'y') { ctx.textAlign = 'left'; ctx.fillText(t, el.x + 6, el.y); }
        else { ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(t, el.x, el.y - 4); }
      });
    });
    ctx.restore();
  }
};

/* ---------- opções comuns ---------- */
function fonteGraf() { return getComputedStyle(document.body).fontFamily || 'Ubuntu, sans-serif'; }
function opcoesBase(pal, tela) {
  return {
    responsive: !!tela,
    maintainAspectRatio: false,
    animation: tela && !reduzMovimento() ? { duration: 260 } : false,
    devicePixelRatio: tela ? undefined : 2,
    layout: { padding: { top: 6, right: 10, bottom: 0, left: 2 } },
    interaction: { mode: 'nearest', intersect: true },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: !!tela,
        backgroundColor: pal.texto, titleColor: pal.superficie, bodyColor: pal.superficie, footerColor: pal.superficie,
        padding: 10, cornerRadius: 8, boxPadding: 4, usePointStyle: true,
        titleFont: { family: fonteGraf(), weight: '700', size: 12 }, bodyFont: { family: fonteGraf(), size: 12 }, footerFont: { family: fonteGraf(), size: 11, weight: '400' }
      }
    }
  };
}
function eixoCategoria(pal, extra = {}) {
  return { grid: { display: false }, border: { color: pal.eixo }, ticks: { color: pal.texto2, font: { family: fonteGraf(), size: 11.5 }, ...extra.ticks }, ...extra.base };
}
function eixoValor(pal, fmt, extra = {}) {
  return { beginAtZero: true, grid: { color: pal.grade }, border: { display: false }, ticks: { color: pal.texto2, font: { family: fonteGraf(), size: 11.5 }, callback: v => fmt(v), maxTicksLimit: 6 }, ...extra };
}
function aoClicarGrafico(fn) {
  return {
    onClick: (ev, els, chart) => {
      if (!els || !els.length) return;
      // no modo "index" vêm os pontos de todas as séries naquele mês: fica com o mais próximo do clique
      let alvo = els[0];
      if (els.length > 1) { try { const perto = chart.getElementsAtEventForMode(ev, 'nearest', { intersect: false }, true); if (perto && perto.length) alvo = perto[0]; } catch (e) { /* mantém o primeiro */ } }
      const { datasetIndex, index } = alvo;
      // a navegação redesenha a tela e destrói este gráfico: deixa o Chart.js terminar o evento antes
      setTimeout(() => fn(datasetIndex, index, chart), 0);
    },
    onHover: (ev, els) => { const c = ev.native && ev.native.target; if (c) c.style.cursor = els && els.length ? 'pointer' : 'default'; }
  };
}

/* ---------- montagem na tela ---------- */
let idGraf = 0;
function graficoHTML(specFn, { altura = 300, rotulo = '' } = {}) {
  const id = 'g' + (++idGraf);
  GRAF.pendentes.push({ id, specFn });
  return `<div class="grafico" style="height:${Math.round(altura)}px"><canvas id="cv-${id}" role="img" aria-label="${esc(rotulo)}"></canvas>${window.Chart ? '' : '<div class="grafico-carregando">Carregando gráfico…</div>'}</div>`;
}
function destruirGraficos() {
  for (const c of GRAF.instancias) { try { c.destroy(); } catch (e) { /* já destruído */ } }
  GRAF.instancias = [];
}
function montarGraficos() {
  destruirGraficos();
  if (!window.Chart) return;
  const pal = paletaAtual();
  for (const g of GRAF.pendentes) {
    const cv = document.getElementById('cv-' + g.id);
    if (!cv) continue;
    const vazio = cv.parentElement.querySelector('.grafico-carregando');
    if (vazio) vazio.remove();
    try {
      const cfg = g.specFn(pal, true);
      if (cfg) GRAF.instancias.push(new Chart(cv, cfg));
    } catch (e) { console.error('Falha ao desenhar gráfico', e); }
  }
}
/* imagem PNG de um gráfico no tema claro (para PDF) */
function imagemGrafico(specFn, largura = 1600, altura = 700) {
  if (!window.Chart) return null;
  // o Chart.js (sem responsive) desenha no tamanho dos atributos do canvas; com devicePixelRatio 2
  // a imagem final tem largura × altura pixels e as fontes ficam legíveis no A4
  const cv = document.createElement('canvas');
  cv.width = Math.round(largura / 2); cv.height = Math.round(altura / 2);
  cv.style.width = (largura / 2) + 'px'; cv.style.height = (altura / 2) + 'px';
  const box = document.createElement('div');
  box.style.cssText = `position:fixed;left:-99999px;top:0;width:${largura / 2}px;height:${altura / 2}px;`;
  box.appendChild(cv);
  document.body.appendChild(box);
  let url = null, ch = null;
  try {
    const cfg = specFn(PALETA_CLARA, false);
    if (!cfg) return null;
    cfg.options = cfg.options || {};
    cfg.options.responsive = false;
    cfg.options.animation = false;
    cfg.options.devicePixelRatio = 2;
    cfg.plugins = [...(cfg.plugins || []), { id: 'fundoBranco', beforeDraw(c) { const x = c.ctx; x.save(); x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, c.width, c.height); x.restore(); } }];
    ch = new Chart(cv, cfg);
    url = cv.toDataURL('image/png');
  } catch (e) { console.error('Falha ao gerar imagem do gráfico', e); }
  finally { if (ch) ch.destroy(); box.remove(); }
  return url;
}

/* ---------- specs reutilizáveis ---------- */
/* linhas por função ao longo dos meses (evolução), com quebra de série */
function specEvolucao({ meses, series, formato = 'int', rotuloEixo = '', aoClicar, metas }) {
  return (pal, tela) => {
    const idxQuebra = meses.map((y, i) => infoMes(y).quebraSerie ? i : -1).filter(i => i > 0);
    const cfg = {
      type: 'line',
      data: {
        labels: meses.map(rotuloYMCurto),
        datasets: series.map(s => ({
          label: s.rotulo, data: s.dados, borderColor: s.cor ? s.cor(pal) : pal.funcao[s.funcao], backgroundColor: s.cor ? s.cor(pal) : pal.funcao[s.funcao],
          borderWidth: s.tracejada ? 1.5 : 2, borderDash: s.tracejada ? [6, 4] : undefined, pointRadius: s.tracejada ? 0 : 4, pointHoverRadius: 6,
          pointBorderColor: pal.superficie, pointBorderWidth: 2, spanGaps: false, tension: 0, stepped: s.degrau ? 'middle' : false
        }))
      },
      options: {
        ...opcoesBase(pal, tela),
        interaction: { mode: 'index', intersect: false },
        scales: { x: eixoCategoria(pal), y: eixoValor(pal, v => fNum(v, formato === 'd1' ? 'int' : formato), { title: rotuloEixo ? { display: true, text: rotuloEixo, color: pal.texto2, font: { family: fonteGraf(), size: 11 } } : undefined }) },
        plugins: {
          ...opcoesBase(pal, tela).plugins,
          quebraSerie: { indices: idxQuebra, cor: pal.warn, corTexto: pal.texto2, rotulo: 'Quebra de série' },
          tooltip: {
            ...opcoesBase(pal, tela).plugins.tooltip,
            callbacks: {
              title: items => items.length ? rotuloYM(meses[items[0].dataIndex]) : '',
              label: it => `${it.dataset.label}: ${fNum(it.parsed.y, formato)}`,
              footer: items => {
                const y = meses[items[0].dataIndex];
                const linhas = [];
                if (metas) for (const m of metas(y)) linhas.push(m);
                if (infoMes(y).quebraSerie) linhas.push('Quebra de série: ' + infoMes(y).escopo);
                return linhas.join('\n');
              }
            }
          }
        },
        ...(aoClicar ? aoClicarGrafico((di, i) => aoClicar(series[di], meses[i])) : {})
      },
      plugins: [pluginQuebra]
    };
    return cfg;
  };
}
/* barras horizontais por colaborador com linha da meta e faixa de tolerância */
function specBarrasColab({ linhas, valor, formato = 'd1', meta, tolerancia, cor, aoClicar, rotuloValor = '', rodapeDica }) {
  return (pal, tela) => {
    const dados = linhas.map(valor);
    return {
      type: 'bar',
      data: {
        labels: linhas.map(r => r.nome),
        datasets: [{
          label: rotuloValor, data: dados,
          backgroundColor: linhas.map(r => r.ind && r.ind.indice == null ? comAlfa(cor(pal), 0.35) : cor(pal)),
          borderRadius: { topRight: 4, bottomRight: 4, topLeft: 0, bottomLeft: 0 }, borderSkipped: 'start', maxBarThickness: 22, categoryPercentage: 0.8, barPercentage: 0.9
        }]
      },
      options: {
        ...opcoesBase(pal, tela),
        indexAxis: 'y',
        layout: { padding: { right: 46, top: 18 } },
        scales: {
          x: eixoValor(pal, v => fNum(v, 'int'), { suggestedMax: meta ? meta * 1.1 : undefined, grace: '4%' }),
          y: eixoCategoria(pal, { ticks: { autoSkip: false, color: pal.texto } })
        },
        plugins: {
          ...opcoesBase(pal, tela).plugins,
          linhaMeta: meta ? { valor: meta, tolerancia, eixo: 'x', cor: pal.texto, corFaixa: comAlfa(pal.warn, 0.16), rotulo: `meta ${fNum(meta, 'int')}` } : false,
          valorFimBarra: { formatar: v => fNum(v, formato), cor: pal.texto2 },
          tooltip: {
            ...opcoesBase(pal, tela).plugins.tooltip,
            callbacks: {
              title: items => items.length ? linhas[items[0].dataIndex].nomeCompleto || linhas[items[0].dataIndex].nome : '',
              label: it => `${rotuloValor}: ${fNum(it.parsed.x, formato)}`,
              footer: items => rodapeDica ? rodapeDica(linhas[items[0].dataIndex]) : ''
            }
          }
        },
        ...(aoClicar ? aoClicarGrafico((di, i) => aoClicar(linhas[i])) : {})
      },
      plugins: [pluginLinhaMeta, pluginFimBarra]
    };
  };
}
