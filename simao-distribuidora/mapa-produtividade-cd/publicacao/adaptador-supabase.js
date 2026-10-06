/* =========================================================================
   Mapa de Produtividade — CD Simão · publicação fora do claude.ai.
   Fornece window.claude.use('db' | 'user' | 'downloads') usando o Supabase
   (banco, login e tempo real), para o mapa rodar sem nenhuma alteração.
   Carregado antes do mapa, depois da biblioteca do Supabase.
   ========================================================================= */
(function () {
  'use strict';

  const CONFIG_URL = '/api/mapa-cd-simao/config';
  const SDK_RESERVA = 'https://unpkg.com/@supabase/supabase-js@2.117.2/dist/umd/supabase.js';
  const TABELA = 'documentos';
  const TAM_PAGINA = 1000;                  // limite padrão de linhas por consulta no Supabase
  const CONSULTA_COM_TEMPO_REAL = 120000;   // conferência periódica de segurança (ms)
  const CONSULTA_SEM_TEMPO_REAL = 30000;    // sem tempo real, confere com mais frequência
  const LOGO = '__LOGO_SIMAO__';            // trocado pela logo em base64 na montagem do site
  const PAPEIS_QUE_EDITAM = ['editor', 'dono'];

  /* tipo do link recebido por e-mail (convite ou nova senha), lido antes de a biblioteca limpar o endereço */
  const paramsLink = new URLSearchParams(location.hash.replace(/^#/, ''));
  const tipoLink = paramsLink.get('type');
  const erroLink = paramsLink.get('error_description');
  const pedidoSair = location.hash === '#sair';

  let sb = null;
  let sessao = null;
  let papel = null;
  let liberar;
  const acessoPronto = new Promise(r => { liberar = r; });

  /* ---------- erros no formato que o mapa entende ---------- */
  function erro(code, message) { const e = new Error(message || code); e.code = code; return e; }
  function traduzirErro(e, status) {
    const msg = (e && (e.message || e.msg)) || 'erro desconhecido';
    const cod = e && e.code;
    if (cod === 'PGRST301' || /jwt expired/i.test(msg)) { if (sb) sb.auth.refreshSession().catch(() => {}); return erro('unavailable', msg); }
    if (cod === '42501' || status === 403 || /row-level security|permission denied/i.test(msg)) return erro('invalid_argument', msg);
    if (status === 401) { if (sb) sb.auth.refreshSession().catch(() => {}); return erro('unavailable', msg); }
    if (status === 429) return erro('resource_exhausted', msg);
    if (status === 413 || cod === '54000') return erro('invalid_argument', msg);
    if (cod === '53100' || /disk full|quota/i.test(msg)) return erro('quota_exceeded', msg);
    if (!status || status >= 500 || /fetch|network|timeout|load failed/i.test(msg)) return erro('unavailable', msg);
    return erro('desconhecido', msg);
  }
  const clonar = typeof structuredClone === 'function' ? o => structuredClone(o) : o => JSON.parse(JSON.stringify(o));
  const podeGravar = () => PAPEIS_QUE_EDITAM.includes(papel);

  /* ---------- leitura das coleções ---------- */
  async function lerColecao(col) {
    const linhas = [];
    for (let de = 0, voltas = 0; voltas < 200; voltas++) {
      const r = await sb.from(TABELA).select('id,dados').eq('colecao', col).order('id', { ascending: true }).range(de, de + TAM_PAGINA - 1);
      if (r.error) throw traduzirErro(r.error, r.status);
      const lote = r.data || [];
      linhas.push(...lote);
      if (!lote.length) break;           // continua até uma página vazia: o limite do projeto pode ser menor que 1000
      de += lote.length;
    }
    return linhas;
  }
  function montarSnapshot(linhas, opts) {
    let lista = linhas.slice();
    if (opts.orderBy) {
      const [campo, dir] = opts.orderBy;
      const sinal = dir === 'desc' ? -1 : 1;
      lista.sort((a, b) => {
        const x = a.dados ? a.dados[campo] : undefined, y = b.dados ? b.dados[campo] : undefined;
        return (x < y ? -1 : x > y ? 1 : 0) * sinal;
      });
    }
    if (opts.limit) lista = lista.slice(0, opts.limit);
    const docs = lista.map(l => ({ id: l.id, exists: true, data: () => clonar(l.dados), metadata: { fromCache: false, hasPendingWrites: false } }));
    return { docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: { fromCache: false, hasPendingWrites: false } };
  }

  /* ---------- assinaturas: carga inicial, tempo real e conferência periódica ---------- */
  const ouvintes = new Map();     // coleção -> Set de ouvintes
  const ultimaLeitura = new Map(); // coleção -> { linhas, texto }
  const agendadas = new Map();
  let canal = null;
  let tempoRealOk = false;
  let relogio = null;

  async function recarregar(col) {
    const lista = ouvintes.get(col);
    if (!lista || !lista.size) return;
    let linhas;
    try { linhas = await lerColecao(col); }
    catch (e) {
      for (const o of lista) if (!o.recebeu && o.ativo) { o.ativo = false; lista.delete(o); try { o.err(e); } catch (x) { /* ouvinte encerrado */ } }
      return;   // quem já tem dados fica com os últimos; a próxima conferência tenta de novo
    }
    const texto = JSON.stringify(linhas);
    ultimaLeitura.set(col, { linhas, texto });
    for (const o of lista) entregar(o, linhas, texto);
  }
  function entregar(o, linhas, texto) {
    if (!o.ativo) return;
    if (o.recebeu && o.texto === texto) return;   // nada mudou: não força o mapa a redesenhar
    o.recebeu = true; o.texto = texto;
    try { o.next(montarSnapshot(linhas, o.opts)); } catch (e) { console.error(e); }
  }
  function agendarRecarga(col, espera = 250) {
    clearTimeout(agendadas.get(col));
    agendadas.set(col, setTimeout(() => { agendadas.delete(col); recarregar(col); }, espera));
  }
  function recarregarTodas() { for (const col of ouvintes.keys()) agendarRecarga(col, 50); }
  function ligarRelogio() {
    clearInterval(relogio);
    relogio = setInterval(recarregarTodas, tempoRealOk ? CONSULTA_COM_TEMPO_REAL : CONSULTA_SEM_TEMPO_REAL);
  }
  function ligarTempoReal() {
    if (canal) return;
    canal = sb.channel('mapa-documentos')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABELA }, payload => {
        const reg = (payload && (payload.new && payload.new.colecao ? payload.new : payload.old)) || {};
        if (reg.colecao) agendarRecarga(reg.colecao); else recarregarTodas();
      })
      .subscribe(status => {
        const ok = status === 'SUBSCRIBED';
        if (ok !== tempoRealOk) { tempoRealOk = ok; ligarRelogio(); }
        if (ok) recarregarTodas();   // cobre o que mudou enquanto a conexão estava fora
      });
    ligarRelogio();
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') recarregarTodas(); });
    window.addEventListener('online', recarregarTodas);
  }
  function assinar(col, opts, next, err) {
    const o = { opts, next, err: err || (() => {}), ativo: true, recebeu: false, texto: null };
    if (!ouvintes.has(col)) ouvintes.set(col, new Set());
    ouvintes.get(col).add(o);
    ligarTempoReal();
    const ultima = ultimaLeitura.get(col);
    if (ultima) setTimeout(() => entregar(o, ultima.linhas, ultima.texto), 0);
    agendarRecarga(col, ultima ? 250 : 0);
    return () => { o.ativo = false; const l = ouvintes.get(col); if (l) l.delete(o); };
  }

  /* ---------- gravações ---------- */
  function exigirEdicao() { if (!podeGravar()) throw erro('invalid_argument', 'Esta conta não tem permissão de edição.'); }
  function refDoc(col, id) {
    id = String(id);
    return Object.freeze({
      id, path: col + '/' + id,
      async get() {
        const r = await sb.from(TABELA).select('dados').eq('colecao', col).eq('id', id).limit(1);
        if (r.error) throw traduzirErro(r.error, r.status);
        const l = (r.data || [])[0];
        return { id, exists: !!l, data: () => (l ? clonar(l.dados) : undefined), metadata: {} };
      },
      async set(dados) {
        exigirEdicao();
        if (!dados || typeof dados !== 'object' || Array.isArray(dados)) throw erro('invalid_argument', 'Documento inválido.');
        const r = await sb.from(TABELA).upsert({ colecao: col, id, dados }, { onConflict: 'colecao,id' });
        if (r.error) throw traduzirErro(r.error, r.status);
        agendarRecarga(col);
      },
      async update(parcial) {
        const atual = await this.get();
        if (!atual.exists) throw erro('invalid_argument', 'Documento não encontrado.');
        return this.set(Object.assign(atual.data(), parcial));
      },
      async delete() {
        exigirEdicao();
        const r = await sb.from(TABELA).delete().eq('colecao', col).eq('id', id);
        if (r.error) throw traduzirErro(r.error, r.status);
        agendarRecarga(col);
      }
    });
  }
  function consulta(col, opts) {
    return Object.freeze({
      path: col,
      orderBy: (campo, dir = 'asc') => consulta(col, Object.assign({}, opts, { orderBy: [campo, dir] })),
      limit: n => consulta(col, Object.assign({}, opts, { limit: n })),
      async get() { return montarSnapshot(await lerColecao(col), opts); },
      onSnapshot: (next, err) => assinar(col, opts, next, err),
      doc: id => refDoc(col, id)
    });
  }
  const db = Object.freeze({ collection: col => consulta(String(col), {}) });

  /* ---------- quem está vendo ---------- */
  const usuario = Object.freeze({
    canEdit: async () => podeGravar(),
    isOwner: async () => papel === 'dono',
    can: async nome => (nome === 'data.write' ? podeGravar() : null),
    id: async () => (sessao ? sessao.user.id : null),
    me: async () => ({ id: sessao ? sessao.user.id : null, name: sessao ? sessao.user.email || '' : '' }),
    profiles: async () => ({})
  });

  /* ---------- arquivos: download comum do navegador ---------- */
  const TIPOS = { pdf: 'application/pdf', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', json: 'application/json', csv: 'text/csv', txt: 'text/plain' };
  const downloads = Object.freeze({
    async save({ filename, data } = {}) {
      if (typeof filename !== 'string' || !filename || data === undefined || data === null) throw erro('bad_request', 'Arquivo inválido.');
      const ext = (filename.split('.').pop() || '').toLowerCase();
      const blob = data instanceof Blob ? data : new Blob([data], { type: TIPOS[ext] || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.rel = 'noopener'; a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return { status: 'saved' };
    }
  });

  window.claude = Object.freeze({
    use(nome) {
      if (nome === 'db') return acessoPronto.then(() => db);
      if (nome === 'user') return acessoPronto.then(() => usuario);
      if (nome === 'downloads') return Promise.resolve(downloads);
      return Promise.resolve(null);
    }
  });

  /* =========================================================================
     Tela de entrada (usa os mesmos estilos de botões e campos do mapa)
     ========================================================================= */
  let tela = null;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function estilo() {
    if (document.getElementById('mapa-acesso-estilo')) return;
    const st = document.createElement('style');
    st.id = 'mapa-acesso-estilo';
    st.textContent = `
      #mapa-acesso { position: fixed; inset: 0; z-index: 2147483000; display: grid; place-items: center; overflow-y: auto;
        padding: max(16px, env(safe-area-inset-top, 0px)) 16px max(16px, env(safe-area-inset-bottom, 0px));
        background: var(--bg, #F7F5F4); color: var(--text, #2B2321); font-family: var(--font, "Ubuntu", system-ui, sans-serif); transition: opacity .25s ease; }
      #mapa-acesso.saindo { opacity: 0; pointer-events: none; }
      @media (prefers-reduced-motion: reduce) { #mapa-acesso { transition: none; } }
      #mapa-acesso .acesso-cartao { width: 100%; max-width: 400px; box-sizing: border-box; background: var(--surface, #fff); border: 1px solid var(--border, #E8E2DF);
        border-radius: var(--radius, 12px); box-shadow: var(--shadow-pop, 0 8px 28px rgba(43,35,33,.16)); padding: 28px 24px 24px; display: flex; flex-direction: column; gap: 14px; }
      #mapa-acesso .acesso-marca { display: flex; align-items: center; gap: 14px; }
      #mapa-acesso .acesso-logo { width: 64px; height: 64px; object-fit: contain; border-radius: 12px; background: #fff; padding: 6px; border: 1px solid var(--border, #E8E2DF); flex: none; }
      #mapa-acesso h1 { margin: 0; font-size: var(--fs-xl, 20px); line-height: 1.2; color: var(--title, #7D0003); text-wrap: balance; }
      #mapa-acesso .acesso-sub { margin: 2px 0 0; font-size: var(--fs-sm, 12.5px); color: var(--text-2, #6E6360); }
      #mapa-acesso .acesso-corpo { display: flex; flex-direction: column; gap: 12px; }
      #mapa-acesso form { display: flex; flex-direction: column; gap: 12px; margin: 0; }
      #mapa-acesso .inp { min-height: 44px; box-sizing: border-box; width: 100%; }
      #mapa-acesso .btn { min-height: 44px; justify-content: center; width: 100%; }
      #mapa-acesso .acesso-texto { margin: 0; font-size: var(--fs-md, 14px); line-height: 1.5; color: var(--text-2, #6E6360); }
      #mapa-acesso .acesso-texto b { color: var(--text, #2B2321); }
      #mapa-acesso .acesso-msg { margin: 0; font-size: var(--fs-sm, 12.5px); line-height: 1.45; border-radius: var(--radius-sm, 8px); padding: 9px 11px; }
      #mapa-acesso .acesso-msg.erro { background: var(--bad-bg, #FBE6E7); color: var(--bad-ink, #A31F25); }
      #mapa-acesso .acesso-msg.ok { background: var(--ok-bg, #E6F4EC); color: var(--ok-ink, #157A45); }
      #mapa-acesso .acesso-link { align-self: center; background: none; border: 0; padding: 10px 8px; min-height: 44px; font: inherit; font-size: var(--fs-sm, 12.5px);
        color: var(--simao-ink, #C82000); cursor: pointer; text-decoration: underline; text-underline-offset: 3px; }
      #mapa-acesso .acesso-rodape { margin: 4px 0 0; font-size: var(--fs-xs, 11.5px); color: var(--muted, #9A918E); text-align: center; }
      #mapa-acesso .acesso-carregando { display: flex; align-items: center; gap: 10px; color: var(--text-2, #6E6360); font-size: var(--fs-md, 14px); padding: 8px 0; }
      #mapa-acesso .acesso-carregando i { width: 16px; height: 16px; border-radius: 50%; border: 2px solid var(--border, #E8E2DF); border-top-color: var(--simao, #FF2A00); animation: mapa-gira 0.9s linear infinite; }
      @keyframes mapa-gira { to { transform: rotate(360deg); } }
      @media (prefers-reduced-motion: reduce) { #mapa-acesso .acesso-carregando i { animation: none; } }
      .rodape-lateral .mapa-conta { display: flex; flex-wrap: wrap; gap: 4px 12px; align-items: center; }
      .rodape-lateral .mapa-conta .quem { width: 100%; overflow-wrap: anywhere; }
      .rodape-lateral .mapa-conta button { background: none; border: 0; padding: 6px 0; min-height: 32px; font: inherit; color: var(--simao-ink, #C82000);
        cursor: pointer; text-decoration: underline; text-underline-offset: 3px; }
      @media (max-width: 768px) { .rodape-lateral .mapa-conta button { min-height: 44px; } }
    `;
    document.head.appendChild(st);
  }

  function montarTela() {
    if (tela) return;
    estilo();
    tela = document.createElement('div');
    tela.id = 'mapa-acesso';
    tela.setAttribute('role', 'dialog');
    tela.setAttribute('aria-modal', 'true');
    tela.setAttribute('aria-labelledby', 'acesso-titulo');
    tela.innerHTML = `<div class="acesso-cartao">
        <div class="acesso-marca">
          <img class="acesso-logo" src="${LOGO}" alt="Simão Distribuidora">
          <div><h1 id="acesso-titulo">Mapa de Produtividade</h1><p class="acesso-sub">Simão Distribuidora · CD Rio Branco/AC</p></div>
        </div>
        <div class="acesso-corpo" id="acesso-corpo" aria-live="polite"></div>
        <p class="acesso-rodape">Acesso restrito. Dados de uso interno da Simão Distribuidora.</p>
      </div>`;
    document.body.appendChild(tela);
    document.documentElement.style.overflow = 'hidden';
  }
  function corpo(html, focar) {
    montarTela();
    const c = document.getElementById('acesso-corpo');
    c.innerHTML = html;
    const alvo = focar && c.querySelector(focar);
    if (alvo) setTimeout(() => alvo.focus(), 30);
    return c;
  }
  const msg = (tipo, texto) => `<p class="acesso-msg ${tipo}" role="${tipo === 'erro' ? 'alert' : 'status'}">${texto}</p>`;
  function carregando(texto) { corpo(`<div class="acesso-carregando"><i aria-hidden="true"></i><span>${esc(texto)}</span></div>`); }
  function ocupar(form, sim, rotulo) {
    form.querySelectorAll('input, button').forEach(el => { el.disabled = sim; });
    const b = form.querySelector('button[type="submit"]');
    if (b && rotulo) { if (sim) { b.dataset.rotulo = b.textContent; b.textContent = rotulo; } else if (b.dataset.rotulo) b.textContent = b.dataset.rotulo; }
  }

  function telaEntrar(aviso) {
    const c = corpo(`
      ${aviso || ''}
      <form id="form-entrar" novalidate>
        <div class="campo"><label for="acesso-email">E-mail</label><input class="inp" id="acesso-email" type="email" autocomplete="username" inputmode="email" required></div>
        <div class="campo"><label for="acesso-senha">Senha</label><input class="inp" id="acesso-senha" type="password" autocomplete="current-password" required></div>
        <div id="acesso-erro"></div>
        <button class="btn primario" type="submit">Entrar</button>
      </form>
      <button type="button" class="acesso-link" id="acesso-esqueci">Esqueci minha senha</button>`, '#acesso-email');
    const form = c.querySelector('#form-entrar');
    form.addEventListener('submit', async ev => {
      ev.preventDefault();
      const email = form.querySelector('#acesso-email').value.trim();
      const senha = form.querySelector('#acesso-senha').value;
      const caixaErro = form.querySelector('#acesso-erro');
      if (!email || !senha) { caixaErro.innerHTML = msg('erro', 'Preencha o e-mail e a senha.'); return; }
      ocupar(form, true, 'Entrando…');
      const { data, error } = await sb.auth.signInWithPassword({ email, password: senha });
      if (error) {
        ocupar(form, false);
        caixaErro.innerHTML = msg('erro', textoErroLogin(error));
        form.querySelector('#acesso-senha').select();
        return;
      }
      sessao = data.session;
      verificarAcesso();
    });
    c.querySelector('#acesso-esqueci').addEventListener('click', () => telaEsqueci(c.querySelector('#acesso-email').value.trim()));
  }
  function textoErroLogin(e) {
    const t = `${e.code || ''} ${e.message || ''}`.toLowerCase();
    if (/invalid_credentials|invalid login/.test(t)) return 'E-mail ou senha incorretos.';
    if (/email_not_confirmed|not confirmed/.test(t)) return 'Este e-mail ainda não foi confirmado. Peça ao responsável para confirmar o seu acesso.';
    if (/rate|too many|over_request/.test(t) || e.status === 429) return 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.';
    if (/fetch|network|load failed/.test(t) || !e.status) return 'Sem conexão com o servidor. Verifique a internet e tente de novo.';
    return 'Não foi possível entrar: ' + esc(e.message || 'erro desconhecido') + '.';
  }

  function telaEsqueci(emailInicial) {
    const c = corpo(`
      <p class="acesso-texto">Informe o e-mail cadastrado. Você vai receber um link para criar uma nova senha.</p>
      <form id="form-esqueci" novalidate>
        <div class="campo"><label for="acesso-email-rec">E-mail</label><input class="inp" id="acesso-email-rec" type="email" autocomplete="username" inputmode="email" value="${esc(emailInicial)}" required></div>
        <div id="acesso-erro"></div>
        <button class="btn primario" type="submit">Enviar link</button>
      </form>
      <button type="button" class="acesso-link" id="acesso-voltar">Voltar para a entrada</button>`, '#acesso-email-rec');
    const form = c.querySelector('#form-esqueci');
    form.addEventListener('submit', async ev => {
      ev.preventDefault();
      const email = form.querySelector('#acesso-email-rec').value.trim();
      if (!email) { form.querySelector('#acesso-erro').innerHTML = msg('erro', 'Informe o e-mail.'); return; }
      ocupar(form, true, 'Enviando…');
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
      ocupar(form, false);
      if (error && (error.status === 429 || /rate/i.test(error.message || ''))) { form.querySelector('#acesso-erro').innerHTML = msg('erro', 'Muitos pedidos seguidos. Aguarde alguns minutos e tente de novo.'); return; }
      telaEntrar(msg('ok', 'Se o e-mail estiver cadastrado, o link chega em alguns minutos (confira também o spam). Se não chegar, peça ao responsável pelo Mapa para redefinir a sua senha.'));
    });
    c.querySelector('#acesso-voltar').addEventListener('click', () => telaEntrar());
  }

  function telaNovaSenha({ titulo, texto, aoSalvar, podeVoltar }) {
    const c = corpo(`
      <p class="acesso-texto"><b>${esc(titulo)}</b><br>${esc(texto)}</p>
      <form id="form-senha" novalidate>
        <div class="campo"><label for="acesso-nova">Nova senha</label><input class="inp" id="acesso-nova" type="password" autocomplete="new-password" minlength="8" required></div>
        <div class="campo"><label for="acesso-repete">Repita a nova senha</label><input class="inp" id="acesso-repete" type="password" autocomplete="new-password" minlength="8" required></div>
        <div id="acesso-erro"></div>
        <button class="btn primario" type="submit">Salvar senha</button>
      </form>
      ${podeVoltar ? '<button type="button" class="acesso-link" id="acesso-voltar">Cancelar</button>' : ''}`, '#acesso-nova');
    const form = c.querySelector('#form-senha');
    form.addEventListener('submit', async ev => {
      ev.preventDefault();
      const nova = form.querySelector('#acesso-nova').value, repete = form.querySelector('#acesso-repete').value;
      const caixaErro = form.querySelector('#acesso-erro');
      if (nova.length < 8) { caixaErro.innerHTML = msg('erro', 'Use pelo menos 8 caracteres.'); return; }
      if (nova !== repete) { caixaErro.innerHTML = msg('erro', 'As duas senhas não são iguais.'); return; }
      ocupar(form, true, 'Salvando…');
      const { error } = await sb.auth.updateUser({ password: nova });
      ocupar(form, false);
      if (error) {
        const t = `${error.code || ''} ${error.message || ''}`.toLowerCase();
        caixaErro.innerHTML = msg('erro', /weak|fraca|password should/.test(t) ? 'Senha fraca: use letras e números, com pelo menos 8 caracteres.'
          : /same_password|different from the old/.test(t) ? 'A nova senha precisa ser diferente da atual.'
          : 'Não foi possível salvar a senha: ' + esc(error.message || 'erro desconhecido') + '.');
        return;
      }
      aoSalvar();
    });
    const voltar = c.querySelector('#acesso-voltar');
    if (voltar) voltar.addEventListener('click', () => podeVoltar());
  }

  function telaSemAcesso(email) {
    const c = corpo(`
      <p class="acesso-texto"><b>Seu acesso ainda não foi liberado.</b><br>Você entrou como <b>${esc(email)}</b>, mas este e-mail não está na lista de quem pode ver o Mapa. Peça ao responsável para liberar o seu acesso.</p>
      <button type="button" class="btn" id="acesso-sair">Sair e entrar com outro e-mail</button>`);
    c.querySelector('#acesso-sair').addEventListener('click', sair);
  }
  function telaErro(texto, podeTentar = true) {
    const c = corpo(`${msg('erro', texto)}${podeTentar ? '<button type="button" class="btn" id="acesso-tentar">Tentar de novo</button>' : ''}`);
    const b = c.querySelector('#acesso-tentar');
    if (b) b.addEventListener('click', () => location.reload());
  }

  function liberarMapa() {
    if (tela) {
      tela.classList.add('saindo');
      const t = tela; tela = null;
      setTimeout(() => { t.remove(); document.documentElement.style.overflow = ''; }, 280);
    }
    observarRodape();
    liberar();
  }

  /* ---------- conta no rodapé do menu lateral: quem está conectado, trocar senha e sair ---------- */
  function garantirConta() {
    const rod = document.getElementById('rodape-lateral');
    if (!rod || !sessao || rod.querySelector('.mapa-conta')) return;
    const div = document.createElement('div');
    div.className = 'mapa-conta';
    div.innerHTML = `<span class="quem">Conectado como ${esc(sessao.user.email || '')}</span><button type="button" data-conta="senha">Trocar senha</button><button type="button" data-conta="sair">Sair</button>`;
    rod.appendChild(div);
  }
  let observandoRodape = false;
  function observarRodape() {
    if (observandoRodape) return;
    observandoRodape = true;
    garantirConta();
    new MutationObserver(garantirConta).observe(document.body, { childList: true, subtree: true });
    document.addEventListener('click', ev => {
      const b = ev.target.closest && ev.target.closest('.mapa-conta button');
      if (!b) return;
      if (b.dataset.conta === 'sair') sair();
      if (b.dataset.conta === 'senha') trocarSenha();
    });
  }
  function trocarSenha() {
    const fechar = () => { if (tela) { tela.remove(); tela = null; document.documentElement.style.overflow = ''; } };
    telaNovaSenha({
      titulo: 'Trocar senha', texto: 'Escolha uma nova senha com pelo menos 8 caracteres.',
      aoSalvar: () => { corpo(`${msg('ok', 'Senha trocada.')}<button type="button" class="btn primario" id="acesso-ok">Voltar ao Mapa</button>`, '#acesso-ok').querySelector('#acesso-ok').addEventListener('click', fechar); },
      podeVoltar: fechar
    });
  }
  async function sair() {
    try { await sb.auth.signOut(); } catch (e) { /* sai mesmo sem resposta do servidor */ }
    location.replace(location.pathname + location.search);
  }

  /* ---------- verificação de acesso ---------- */
  async function verificarAcesso() {
    carregando('Verificando o seu acesso…');
    const r = await sb.rpc('papel_atual');
    if (r.error) {
      const t = `${r.error.code || ''} ${r.error.message || ''}`;
      if (/PGRST202|PGRST205|42883|42P01|could not find/i.test(t)) telaErro('O banco ainda não foi preparado: rode o script publicacao/supabase.sql no Supabase (veja o README).', false);
      else if (!r.status || r.status >= 500) telaErro('Sem conexão com o banco de dados. Verifique a internet e tente de novo.');
      else telaErro('Não foi possível verificar o seu acesso: ' + esc(r.error.message || 'erro desconhecido') + '.');
      return;
    }
    papel = typeof r.data === 'string' ? r.data : null;
    if (!papel) { telaSemAcesso(sessao.user.email || ''); return; }
    liberarMapa();
  }

  async function carregarBiblioteca() {
    if (window.supabase && window.supabase.createClient) return true;
    await new Promise(res => {
      const s = document.createElement('script');
      s.src = SDK_RESERVA; s.onload = res; s.onerror = res;
      document.head.appendChild(s);
    });
    return !!(window.supabase && window.supabase.createClient);
  }
  async function lerConfig() {
    if (window.MAPA_SUPABASE && window.MAPA_SUPABASE.url) return window.MAPA_SUPABASE;
    const r = await fetch(CONFIG_URL, { cache: 'no-store' });
    if (!r.ok) throw new Error('config ' + r.status);
    return r.json();
  }

  async function iniciar() {
    montarTela();
    carregando('Conectando…');
    if (!(await carregarBiblioteca())) { telaErro('Não foi possível carregar o componente de acesso. Verifique a internet e tente de novo.'); return; }
    let cfg;
    try { cfg = await lerConfig(); } catch (e) { telaErro('Não foi possível ler a configuração do site. Tente de novo em instantes.'); return; }
    if (!cfg || !cfg.url || !cfg.chave) {
      telaErro('O Mapa ainda não foi ligado ao banco de dados. Quem publica precisa conectar o Supabase ao projeto na Vercel (variáveis SUPABASE_URL e SUPABASE_ANON_KEY). Veja o README.', false);
      return;
    }
    sb = window.supabase.createClient(cfg.url, cfg.chave, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' } });
    if (pedidoSair) { await sair(); return; }
    const { data } = await sb.auth.getSession();
    sessao = data && data.session;
    sb.auth.onAuthStateChange((evento, nova) => {
      if (nova) sessao = nova;
      // sessão encerrada em outra aba ou expirada: volta para a entrada
      if (evento === 'SIGNED_OUT' && papel) location.replace(location.pathname + location.search);
    });
    if (erroLink) { telaEntrar(msg('erro', 'O link do e-mail expirou ou já foi usado. Peça um novo em "Esqueci minha senha".')); history.replaceState(null, '', location.pathname + location.search); return; }
    if (sessao && (tipoLink === 'recovery' || tipoLink === 'invite')) {
      telaNovaSenha({
        titulo: tipoLink === 'invite' ? 'Crie a sua senha' : 'Defina uma nova senha',
        texto: tipoLink === 'invite' ? 'Bem-vindo ao Mapa de Produtividade. Escolha uma senha com pelo menos 8 caracteres.' : 'Escolha uma nova senha com pelo menos 8 caracteres.',
        aoSalvar: () => { history.replaceState(null, '', location.pathname + location.search); verificarAcesso(); },
        podeVoltar: null
      });
      return;
    }
    if (!sessao) { telaEntrar(); return; }
    verificarAcesso();
  }
  // "#sair" digitado no endereço de uma aba já aberta
  window.addEventListener('hashchange', () => { if (location.hash === '#sair' && sb) sair(); });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
