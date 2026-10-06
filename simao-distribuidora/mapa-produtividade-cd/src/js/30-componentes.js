/* =========================================================================
   Componentes de interface: cartões de indicador, selos, tabelas
   (que viram cartões no celular), diálogos, avisos flutuantes e dicas.
   ========================================================================= */

function pillSituacao(sit, extra = '') {
  if (!sit || !SITUACOES[sit]) return `<span class="fraco">${TRACO}</span>`;
  return `<span class="pill ${sit}"${extra}>${icone(sit)}${esc(SITUACOES[sit].rotulo)}</span>`;
}
function funcTag(funcao, curto = false) {
  const f = FUNC[funcao];
  if (!f) return esc(funcao || TRACO);
  return `<span class="func-tag"><i style="background:var(${f.cor})"></i>${esc(curto ? f.curto : f.nome)}</span>`;
}
function selosColab(r, { funcao } = {}) {
  const s = [];
  if (r.apoio) s.push(`<span class="selo apoio" data-dica="${esc(`Função principal: ${FUNC[r.principal]?.nome || 'não definida'}. Aparece aqui como apoio.`)}">apoio</span>`);
  if (r.novo) s.push('<span class="selo novo" data-dica="Primeiros meses de atividade: curva de aprendizado.">novo</span>');
  if (r.rotas) s.push('<span class="selo rotas" data-dica="Atuava nas rotas externas: produção parcialmente registrada no coletor até set/2026.">rotas externas</span>');
  if (r.suspeito) s.push('<span class="selo suspeito" data-dica="Lançamento marcado como suspeito na auditoria (possível duplicidade).">suspeito</span>');
  if (r.desligado) s.push('<span class="selo" data-dica="Colaborador desligado (cadastro).">desligado</span>');
  return s.join(' ');
}
function movHTML(m) {
  if (!m) return `<span class="mov igual" data-dica="Sem período anterior para comparar">${TRACO}</span>`;
  if (m.tipo === 'novo') return '<span class="mov novo" data-dica="Não estava classificado no período anterior">novo</span>';
  if (m.tipo === 'igual') return `<span class="mov igual" data-dica="Manteve a ${m.anterior}ª posição">=</span>`;
  const t = m.tipo === 'sobe' ? `Subiu ${m.d} ${m.d === 1 ? 'posição' : 'posições'} (era ${m.anterior}º)` : `Caiu ${m.d} ${m.d === 1 ? 'posição' : 'posições'} (era ${m.anterior}º)`;
  return `<span class="mov ${m.tipo}" data-dica="${esc(t)}">${m.tipo === 'sobe' ? '▲' : '▼'} ${m.d}</span>`;
}
function movTexto(m) {
  if (!m) return TRACO;
  if (m.tipo === 'novo') return 'novo';
  if (m.tipo === 'igual') return '=';
  return (m.tipo === 'sobe' ? 'subiu ' : 'caiu ') + m.d;
}
function avisoHTML(tipo, html, acoes = '') {
  const ic = { atencao: 'atencao', erro: 'atencao', ok: 'certo', info: 'info' }[tipo] || 'info';
  return `<div class="aviso ${tipo}" role="${tipo === 'erro' ? 'alert' : 'note'}">${icone(ic)}<div>${html}${acoes ? `<div class="acoes-aviso">${acoes}</div>` : ''}</div></div>`;
}
function botao(rotulo, acao, params, { classe = '', ic = '', dica = '', titulo = '', tipo = 'button', id = '', desab = false } = {}) {
  return `<button type="${tipo}" class="btn ${classe}"${dataAcao(acao, params)}${attrs({ 'data-dica': dica || undefined, 'aria-label': titulo || undefined, id: id || undefined, disabled: desab })}>${ic ? icone(ic) : ''}${rotulo ? `<span>${esc(rotulo)}</span>` : ''}</button>`;
}
function bloco({ titulo, desc = '', corpo, acoes = '', id = '', classe = '' }) {
  return `<section class="bloco ${classe}"${id ? ` id="${esc(id)}"` : ''}>
    ${titulo ? `<div class="cab-bloco"><div class="tit"><h3>${esc(titulo)}</h3>${desc ? `<p class="desc">${desc}</p>` : ''}</div>${acoes ? `<div class="linha">${acoes}</div>` : ''}</div>` : ''}
    ${corpo}
  </section>`;
}

/* variação: relativa (contagens/volumes) ou em pontos percentuais (taxas) */
function variacaoHTML(v) {
  if (!v || v.valor === null || v.valor === undefined || !Number.isFinite(v.valor)) {
    return v && v.semBase ? `<span class="var neutro">${esc(v.semBase)}</span>` : '';
  }
  const val = v.valor;
  const dir = Math.abs(val) < 1e-12 ? 'igual' : val > 0 ? 'sobe' : 'desce';
  let classe = 'neutro';
  if (v.melhorSeMaior === true) classe = dir === 'sobe' ? 'sobe' : dir === 'desce' ? 'desce' : 'neutro';
  if (v.melhorSeMaior === false) classe = dir === 'sobe' ? 'desce' : dir === 'desce' ? 'sobe' : 'neutro';
  const txt = v.abs ? `${fSinal(val, 'int')}${v.unidade ? ' ' + v.unidade : ''}` : v.pp ? `${fSinal(val * 100, 'd1')} p.p.` : `${fSinal(val * 100, Math.abs(val) < 0.1 ? 'd1' : 'int')}%`;
  const dica = `${v.rotulo || 'Contra o período anterior'}${v.quebra ? '\nComparação afetada pela quebra de série do escopo da coleta.' : ''}`;
  return `<span class="var ${classe}${v.quebra ? ' quebra' : ''}" data-dica="${esc(dica)}">${dir === 'igual' ? icone('igual') : icone(dir)}${esc(txt)}${v.quebra ? ' ⚠' : ''}</span>`;
}
function kpiHTML(k) {
  const valor = k.valorHTML ?? (k.valor === null || k.valor === undefined || (typeof k.valor === 'number' && !Number.isFinite(k.valor)) ? TRACO : (typeof k.valor === 'number' ? fNum(k.valor, k.formato || 'int') : esc(k.valor)));
  const tag = k.acao ? 'button' : 'div';
  return `<${tag} class="kpi"${k.acao ? ` type="button"${dataAcao(k.acao, k.params)}` : ''}${k.dica ? ` data-dica="${esc(k.dica)}"` : ''}>
    <span class="rot">${esc(k.rotulo)}</span>
    <span class="val">${valor}${k.sufixo ? ` <small>${esc(k.sufixo)}</small>` : ''}</span>
    ${variacaoHTML(k.variacao)}
    ${k.detalhe ? `<span class="det">${k.detalhe}</span>` : ''}
    ${k.acao ? icone('seta', 'ir') : ''}
  </${tag}>`;
}
function variacaoRel(atual, anterior, opts = {}) {
  if (!ok(atual) || !ok(anterior) || anterior === 0) return { valor: null, semBase: opts.semBase || '' };
  return { valor: atual / anterior - 1, ...opts };
}
function variacaoPP(atual, anterior, opts = {}) {
  if (!ok(atual) || !ok(anterior)) return { valor: null, semBase: opts.semBase || '' };
  return { valor: atual - anterior, pp: true, ...opts };
}

/* ---------- tabelas ---------- */
/* coluna: { id, rotulo, tipo, valor(l), html(l), classe, prim, ocultoCel, dica, exportar } */
function celulaValor(col, linha) {
  const v = col.valor ? col.valor(linha) : linha[col.id];
  return v;
}
function celulaTexto(col, linha) {
  const v = celulaValor(col, linha);
  if (col.texto) return col.texto(linha);
  if (['int', 'd1', 'd2', 'dx', 'pct', 'pct1'].includes(col.tipo)) return fNum(typeof v === 'number' ? v : null, col.tipo);
  return v === null || v === undefined ? '' : String(v);
}
function tabelaHTML(m) {
  const cols = m.colunas.filter(c => c.tela !== false);
  if (!m.linhas.length) return `<div class="vazio-tabela">${esc(m.vazio || 'Nenhum registro para os filtros escolhidos.')}</div>`;
  const numerico = c => ['int', 'd1', 'd2', 'dx', 'pct', 'pct1', 'n'].includes(c.tipo);
  const thead = cols.map(c => `<th class="${numerico(c) ? 'n' : ''} ${c.classeTh || ''}"${c.dica ? ` data-dica="${esc(c.dica)}"` : ''} scope="col">${esc(c.rotulo)}</th>`).join('');
  const linhas = m.linhas.map(l => {
    if (l._grupo) return `<tr class="sep-grupo"><td colspan="${cols.length}" data-rotulo="">${esc(l._grupo)}</td></tr>`;
    const at = m.linhaAttrs ? m.linhaAttrs(l) : {};
    const classe = [at.classe || '', at.acao ? 'clicavel' : ''].join(' ').trim();
    const tr = `<tr${classe ? ` class="${classe}"` : ''}${at.acao ? `${dataAcao(at.acao, at.params)} tabindex="0"` : ''}${at.dica ? ` data-dica="${esc(at.dica)}"` : ''}>`;
    const tds = cols.map(c => {
      const conteudo = c.html ? c.html(l) : esc(celulaTexto(c, l));
      const cls = [numerico(c) ? 'n' : '', c.classe || '', c.prim ? 'prim' : '', c.ocultoCel ? 'oculto-cel' : ''].join(' ').trim();
      return `<td${cls ? ` class="${cls}"` : ''} data-rotulo="${esc(c.prim ? '' : c.rotulo)}">${c.prim ? conteudo : `<span class="cv">${conteudo}</span>`}</td>`;
    }).join('');
    return tr + tds + '</tr>';
  }).join('');
  const rodape = m.rodape ? `<tfoot><tr class="total">${cols.map(c => {
    const v = m.rodape[c.id];
    const cls = numerico(c) ? 'n' : '';
    const txt = v === undefined ? '' : (typeof v === 'number' ? fNum(v, c.tipo) : esc(v));
    return `<td class="${cls}" data-rotulo="${esc(c.prim ? '' : c.rotulo)}">${txt}</td>`;
  }).join('')}</tr></tfoot>` : '';
  const cartoes = m.cartoes !== false;
  return `<div class="tabela-wrap${cartoes ? ' cartoes' : ''}"><table class="tbl${cartoes ? ' cartoes' : ''}"${m.id ? ` id="${esc(m.id)}"` : ''}>
    <thead><tr>${thead}</tr></thead><tbody>${linhas}</tbody>${rodape}</table></div>
    ${m.nota ? `<p class="nota-tabela">${m.nota}</p>` : ''}`;
}

/* ---------- diálogos (nunca janelas nativas) ---------- */
let modalAtual = null;
function abrirModal({ titulo, corpo, botoes = [], largo = false, aoMontar, fecharFora = true }) {
  fecharModal();
  const raiz = document.createElement('div');
  raiz.className = 'modal-fundo';
  raiz.innerHTML = `<div class="modal${largo ? ' largo' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
    <div class="cab-modal"><h3 id="modal-titulo">${esc(titulo)}</h3><button type="button" class="btn fantasma btn-icone" data-modal-fechar aria-label="Fechar">${icone('fechar')}</button></div>
    <div class="corpo-modal">${corpo}</div>
    ${botoes.length ? `<div class="pe-modal">${botoes.map((b, i) => `<button type="button" class="btn ${b.classe || ''}" data-modal-botao="${i}"${b.desab ? ' disabled' : ''}>${b.ic ? icone(b.ic) : ''}<span>${esc(b.rotulo)}</span></button>`).join('')}</div>` : ''}
  </div>`;
  document.body.appendChild(raiz);
  const anterior = document.activeElement;
  const ctrl = {
    el: raiz,
    fechar() {
      if (!raiz.isConnected) return;
      raiz.remove();
      if (modalAtual === ctrl) modalAtual = null;
      if (anterior && anterior.focus && document.contains(anterior)) { try { anterior.focus(); } catch (e) { /* sem foco */ } }
    },
    ocupado(sim) { $$('.pe-modal button, [data-modal-fechar]', raiz).forEach(b => { b.disabled = !!sim; }); }
  };
  raiz.addEventListener('click', async ev => {
    if (ev.target === raiz && fecharFora) { ctrl.fechar(); return; }
    if (ev.target.closest('[data-modal-fechar]')) { ctrl.fechar(); return; }
    const b = ev.target.closest('[data-modal-botao]');
    if (b) {
      const def = botoes[+b.dataset.modalBotao];
      if (!def) return;
      if (def.acao) {
        const r = await def.acao(ctrl);
        if (r === false) return;
      }
      if (def.fechar !== false) ctrl.fechar();
    }
  });
  raiz.addEventListener('keydown', ev => {
    if (ev.key === 'Escape') { ev.stopPropagation(); ctrl.fechar(); }
    if (ev.key === 'Tab') {
      const foco = $$('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]', raiz).filter(e => e.offsetParent !== null);
      if (!foco.length) return;
      const pri = foco[0], ult = foco[foco.length - 1];
      if (ev.shiftKey && document.activeElement === pri) { ev.preventDefault(); ult.focus(); }
      else if (!ev.shiftKey && document.activeElement === ult) { ev.preventDefault(); pri.focus(); }
    }
  });
  modalAtual = ctrl;
  if (aoMontar) aoMontar(raiz, ctrl);
  setTimeout(() => {
    const alvo = $('[autofocus]', raiz) || $('.corpo-modal input, .corpo-modal select, .corpo-modal textarea', raiz) || $('.pe-modal .btn.primario', raiz) || $('[data-modal-fechar]', raiz);
    if (alvo) try { alvo.focus(); } catch (e) { /* sem foco */ }
  }, 30);
  return ctrl;
}
function fecharModal() { if (modalAtual) modalAtual.fechar(); }
function confirmar({ titulo, texto, rotuloOk = 'Confirmar', perigo = false, rotuloCancelar = 'Cancelar' }) {
  return new Promise(resolve => {
    let resposta = false;
    const ctrl = abrirModal({
      titulo,
      corpo: `<div class="texto">${texto}</div>`,
      botoes: [
        { rotulo: rotuloCancelar, classe: 'fantasma', acao: () => { resposta = false; } },
        { rotulo: rotuloOk, classe: perigo ? 'perigo cheio' : 'primario', acao: () => { resposta = true; } }
      ]
    });
    const obs = new MutationObserver(() => { if (!ctrl.el.isConnected) { obs.disconnect(); resolve(resposta); } });
    obs.observe(document.body, { childList: true });
  });
}

/* ---------- avisos flutuantes ---------- */
function toast(msg, tipo = 'info', ms = 4500) {
  let raiz = $('.avisos-flutuantes');
  if (!raiz) { raiz = document.createElement('div'); raiz.className = 'avisos-flutuantes'; raiz.setAttribute('aria-live', 'polite'); document.body.appendChild(raiz); }
  const t = document.createElement('div');
  t.className = `toast ${tipo}`;
  t.setAttribute('role', tipo === 'erro' ? 'alert' : 'status');
  t.textContent = msg;
  raiz.appendChild(t);
  setTimeout(() => t.remove(), ms);
}

/* ---------- dicas (passar o mouse ou focar) ---------- */
function iniciarDicas() {
  let dica = null, alvo = null;
  const mostrar = el => {
    const txt = el.getAttribute('data-dica');
    if (!txt) return;
    alvo = el;
    if (!dica) { dica = document.createElement('div'); dica.className = 'dica-flutuante'; dica.setAttribute('role', 'tooltip'); document.body.appendChild(dica); }
    dica.textContent = txt;
    dica.hidden = false;
    const r = el.getBoundingClientRect();
    const d = dica.getBoundingClientRect();
    let x = r.left + r.width / 2 - d.width / 2;
    x = Math.max(8, Math.min(x, window.innerWidth - d.width - 8));
    let y = r.top - d.height - 8;
    if (y < 8) y = r.bottom + 8;
    dica.style.left = x + 'px';
    dica.style.top = y + 'px';
  };
  const esconder = () => { alvo = null; if (dica) dica.hidden = true; };
  document.addEventListener('mouseover', ev => {
    const el = ev.target.closest && ev.target.closest('[data-dica]');
    if (el && el !== alvo) mostrar(el);
    if (!el && alvo) esconder();
  });
  document.addEventListener('focusin', ev => { const el = ev.target.closest && ev.target.closest('[data-dica]'); if (el) mostrar(el); });
  document.addEventListener('focusout', esconder);
  document.addEventListener('scroll', esconder, true);
  document.addEventListener('touchstart', esconder, { passive: true });
}

/* ---------- formulários ---------- */
function campo({ id, rotulo, tipo = 'text', valor = '', ajuda = '', opcoes = null, full = false, attrsExtra = {}, obrig = false }) {
  let ctl;
  if (opcoes) {
    ctl = `<select class="sel" id="${esc(id)}" name="${esc(id)}"${attrs(attrsExtra)}>${opcoes.map(o => `<option value="${esc(o.valor)}"${String(o.valor) === String(valor) ? ' selected' : ''}>${esc(o.rotulo)}</option>`).join('')}</select>`;
  } else if (tipo === 'textarea') {
    ctl = `<textarea class="txa" id="${esc(id)}" name="${esc(id)}"${attrs(attrsExtra)}>${esc(valor)}</textarea>`;
  } else {
    ctl = `<input class="inp" id="${esc(id)}" name="${esc(id)}" type="${esc(tipo)}" value="${esc(valor)}"${attrs(attrsExtra)}>`;
  }
  return `<div class="campo${full ? ' full' : ''}" data-campo="${esc(id)}"><label for="${esc(id)}">${esc(rotulo)}${obrig ? ' *' : ''}</label>${ctl}${ajuda ? `<span class="ajuda">${ajuda}</span>` : ''}<span class="msg-erro" hidden></span></div>`;
}
function lerCampo(raiz, id) { const el = $(`#${CSS.escape(id)}`, raiz); return el ? el.value : ''; }
function lerNumero(raiz, id) {
  const t = String(lerCampo(raiz, id)).trim();
  if (t === '') return null;
  return numeroTexto(t);
}
function marcarErro(raiz, id, msg) {
  const c = $(`[data-campo="${CSS.escape(id)}"]`, raiz);
  if (!c) return;
  c.classList.toggle('erro', !!msg);
  const m = $('.msg-erro', c);
  if (m) { m.textContent = msg || ''; m.hidden = !msg; }
}
/* número digitado ou lido de planilha: aceita 1.234,5 / 1234.5 / "183046.67kg" */
function numeroTexto(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  let s = String(v).trim().replace(/\s+/g, '').replace(/(kg|m³|m3|und|un)$/i, '');
  if (s === '' || s === '-') return null;
  const temV = s.includes(','), temP = s.includes('.');
  if (temV && temP) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (temV) {
    s = s.replace(',', '.');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
