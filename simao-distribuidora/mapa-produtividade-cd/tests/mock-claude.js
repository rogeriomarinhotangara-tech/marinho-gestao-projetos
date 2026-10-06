/* Simulador local do runtime do claude.ai (window.claude.use) para os testes de aceite.
   Reproduz o contrato de db (coleções, onSnapshot, set/delete, dados congelados),
   user (canEdit/isOwner/id) e downloads (save). Configuração em window.__MOCK_CFG__. */
(function () {
  const cfg = window.__MOCK_CFG__ || {};
  const store = new Map();            // 'colecao/id' -> dados
  const ouvintes = [];                // { colecao, next, err, opts }
  window.__DOWNLOADS__ = [];
  window.__GRAVACOES__ = 0;
  const congelar = o => { if (o && typeof o === 'object') { Object.values(o).forEach(congelar); Object.freeze(o); } return o; };
  const clonar = o => JSON.parse(JSON.stringify(o));
  for (const [col, docs] of Object.entries(cfg.seed || {})) for (const [id, d] of Object.entries(docs)) store.set(col + '/' + id, clonar(d));
  function snapshot(colecao, opts) {
    let docs = [];
    for (const [k, v] of store) {
      const i = k.lastIndexOf('/');
      if (k.slice(0, i) === colecao) docs.push({ id: k.slice(i + 1), dados: v });
    }
    docs.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    if (opts.orderBy) { const [f, dir] = opts.orderBy; docs.sort((a, b) => { const x = a.dados[f], y = b.dados[f]; return (x < y ? -1 : x > y ? 1 : 0) * (dir === 'desc' ? -1 : 1); }); }
    if (opts.limit) docs = docs.slice(0, opts.limit);
    const snaps = docs.map(d => ({ id: d.id, exists: true, data: () => congelar(clonar(d.dados)), metadata: { fromCache: false, hasPendingWrites: false } }));
    return { docs: snaps, size: snaps.length, empty: !snaps.length, docChanges: () => [], metadata: { fromCache: false, hasPendingWrites: false } };
  }
  function avisar(colecao) {
    for (const o of ouvintes) if (o.colecao === colecao && o.ativo) setTimeout(() => o.ativo && o.next(snapshot(o.colecao, o.opts)), 5);
  }
  function erro(code) { return Promise.reject({ code, message: code }); }
  function consulta(colecao, opts = {}) {
    return {
      path: colecao,
      orderBy(f, dir = 'asc') { return consulta(colecao, { ...opts, orderBy: [f, dir] }); },
      limit(n) { return consulta(colecao, { ...opts, limit: n }); },
      where() { return consulta(colecao, opts); },
      get() { return Promise.resolve(snapshot(colecao, opts)); },
      onSnapshot(next, err) {
        const o = { colecao, next, err, opts, ativo: true };
        ouvintes.push(o);
        setTimeout(() => o.ativo && next(snapshot(colecao, opts)), cfg.atrasoInicial || 20);
        return () => { o.ativo = false; };
      },
      doc(id) { return refDoc(colecao, id); }
    };
  }
  function refDoc(colecao, id) {
    if (!/^[A-Za-z0-9_\-.~:@+]{1,200}$/.test(String(id))) throw new TypeError('caminho inválido: ' + id);
    const chave = colecao + '/' + id;
    return {
      id: String(id), path: chave,
      async get() { const d = store.get(chave); return { id: String(id), exists: !!d, data: () => d ? congelar(clonar(d)) : undefined, metadata: {} }; },
      async set(dados) {
        await new Promise(r => setTimeout(r, cfg.atrasoGravacao || 2));
        if (cfg.recusarGravacao || !cfg.podeEditar) return erro('invalid_argument');
        if (!dados || typeof dados !== 'object' || Array.isArray(dados)) return erro('invalid_argument');
        const txt = JSON.stringify(dados);
        if (txt.length > 256 * 1024) return erro('invalid_argument');
        if (/"undefined"|NaN/.test(txt) && false) return erro('invalid_argument');
        store.set(chave, JSON.parse(txt));
        window.__GRAVACOES__++;
        avisar(colecao);
      },
      async update(dados) { if (!store.has(chave)) return erro('invalid_argument'); return this.set({ ...store.get(chave), ...dados }); },
      async delete() {
        await new Promise(r => setTimeout(r, cfg.atrasoGravacao || 2));
        if (cfg.recusarGravacao || !cfg.podeEditar) return erro('invalid_argument');
        store.delete(chave); window.__GRAVACOES__++; avisar(colecao);
      },
      onSnapshot(next) { setTimeout(() => { const d = store.get(chave); next({ id: String(id), exists: !!d, data: () => d ? congelar(clonar(d)) : undefined, metadata: {} }); }, 5); return () => {}; }
    };
  }
  const db = Object.freeze({ collection: c => consulta(c), doc: p => { const i = p.lastIndexOf('/'); return refDoc(p.slice(0, i), p.slice(i + 1)); } });
  const user = Object.freeze({
    isOwner: async () => !!cfg.podeEditar, canEdit: async () => !!cfg.podeEditar, can: async n => n === 'data.write' ? !!cfg.podeEditar : null,
    id: async () => cfg.usuarioId || 'u_teste000000000000000000', me: async () => ({ id: 'u_teste000000000000000000', name: '', avatarUrl: '', color: '#888', email: null, isOwner: !!cfg.podeEditar, canEdit: !!cfg.podeEditar }),
    profiles: async ids => Object.fromEntries([].concat(ids).map(i => [i, { id: i, name: '', avatarUrl: '', color: '#888', email: null, isMe: false, guest: false }]))
  });
  const toB64 = async data => {
    const blob = data instanceof Blob ? data : new Blob([data]);
    const buf = new Uint8Array(await blob.arrayBuffer());
    let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    return btoa(s);
  };
  const downloads = Object.freeze({
    async save({ filename, data }) {
      if (!/\.(gif|png|jpg|jpeg|webp|mp4|webm|txt|json|md|docx|pptx|epub|csv|ttf|html|svg|pdf|xlsx|zip)$/i.test(filename)) throw { code: 'rejected_extension', message: 'ext' };
      window.__DOWNLOADS__.push({ filename, base64: await toB64(data) });
      return { status: 'saved' };
    }
  });
  window.__MOCK_STORE__ = store;
  window.claude = Object.freeze({
    use: async nome => {
      await new Promise(r => setTimeout(r, 10));
      if (nome === 'db') return cfg.semDb ? null : db;
      if (nome === 'user') return user;
      if (nome === 'downloads') return cfg.semDownloads ? null : downloads;
      return null;
    }
  });
})();
