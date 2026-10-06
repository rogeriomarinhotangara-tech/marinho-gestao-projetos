// Simulador do Supabase para testar o site com a biblioteca real supabase-js:
// Auth (entrar, renovar, sair, trocar senha, recuperar), REST (rpc papel_atual e tabela documentos
// com as mesmas regras do publicacao/supabase.sql) e tempo real (WebSocket Phoenix, vsn 2.0.0).
import crypto from 'node:crypto';

export const URL_SUPABASE = 'https://teste-mapa.supabase.co';
export const CHAVE_PUBLICA = 'chave-publica-de-teste';
export const USUARIOS_TESTE = {
  dono: { email: 'dono@teste.com.br', senha: 'senha-dono-123' },
  editor: { email: 'editor@teste.com.br', senha: 'senha-editor-123' },
  leitor: { email: 'leitor@teste.com.br', senha: 'senha-leitor-123' },
  semAcesso: { email: 'sem-acesso@teste.com.br', senha: 'senha-sem-123' }
};

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'access-control-expose-headers': 'content-range, x-total-count, x-supabase-api-version'
};
const COLUNAS = [
  { name: 'colecao', type: 'text' }, { name: 'id', type: 'text' }, { name: 'dados', type: 'jsonb' },
  { name: 'atualizado_em', type: 'timestamptz' }, { name: 'atualizado_por', type: 'uuid' }
];
const chave = (c, i) => `${c}\u0000${i}`;
const clonar = o => JSON.parse(JSON.stringify(o));
const b64url = o => Buffer.from(JSON.stringify(o)).toString('base64url');

export function criarSupabaseSimulado({ documentos = {}, perfis, recusarGravacao = false, semFuncao = false, semTempoReal = false, maxLinhas = 1000 } = {}) {
  const usuarios = Object.values(USUARIOS_TESTE).map(u => ({ id: crypto.randomUUID(), email: u.email, senha: u.senha }));
  const estado = {
    usuarios,
    perfis: new Map(Object.entries(perfis || {
      [USUARIOS_TESTE.dono.email]: 'dono', [USUARIOS_TESTE.editor.email]: 'editor', [USUARIOS_TESTE.leitor.email]: 'leitor'
    })),
    linhas: new Map(),
    tokens: new Map(),
    refresh: new Map(),
    recuperacoes: [],
    pedidos: [],
    recusarGravacao, semFuncao, semTempoReal, maxLinhas,
    conexoes: new Set()
  };
  for (const [col, docs] of Object.entries(documentos)) {
    for (const [id, dados] of Object.entries(docs)) estado.linhas.set(chave(col, id), { colecao: col, id, dados: clonar(dados), atualizado_em: new Date().toISOString(), atualizado_por: null });
  }
  let proximoId = 1000;

  const papelDe = u => (u ? estado.perfis.get(u.email.toLowerCase()) || null : null);
  const podeGravar = u => ['editor', 'dono'].includes(papelDe(u)) && !estado.recusarGravacao;

  function usuarioJson(u) {
    return {
      id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, phone: '',
      email_confirmed_at: '2026-01-01T00:00:00Z', confirmed_at: '2026-01-01T00:00:00Z', last_sign_in_at: new Date().toISOString(),
      app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {}, identities: [],
      created_at: '2026-01-01T00:00:00Z', updated_at: new Date().toISOString(), is_anonymous: false
    };
  }
  function novaSessao(u, segundos = 3600) {
    const agora = Math.floor(Date.now() / 1000);
    const expiresAt = agora + segundos;
    const access_token = [b64url({ alg: 'HS256', typ: 'JWT' }), b64url({ sub: u.id, email: u.email, role: 'authenticated', aud: 'authenticated', iat: agora, exp: expiresAt, session_id: crypto.randomUUID() }), 'assinatura-de-teste'].join('.');
    const refresh_token = crypto.randomBytes(12).toString('hex');
    estado.tokens.set(access_token, u);
    estado.refresh.set(refresh_token, u);
    return { access_token, token_type: 'bearer', expires_in: segundos, expires_at: expiresAt, refresh_token, user: usuarioJson(u) };
  }

  const responder = (route, status, corpo, extra = {}) => route.fulfill({
    status, headers: { ...CORS, 'content-type': 'application/json; charset=utf-8', ...extra },
    body: corpo === undefined ? '' : JSON.stringify(corpo)
  });
  const erroRls = route => responder(route, 403, { code: '42501', details: null, hint: null, message: 'new row violates row-level security policy for table "documentos"' });

  function filtros(u) {
    const f = {};
    for (const [k, v] of u.searchParams) {
      if (['select', 'order', 'offset', 'limit', 'on_conflict', 'columns'].includes(k)) continue;
      const m = /^eq\.(.*)$/.exec(v);
      if (m) f[k] = m[1];
    }
    return f;
  }
  const casa = (l, f) => Object.entries(f).every(([k, v]) => String(l[k]) === v);

  function emitirMudanca(tipo, nova, antiga) {
    if (estado.semTempoReal) return;
    for (const c of estado.conexoes) {
      for (const [topico, canal] of c.canais) {
        if (!papelDe(canal.usuario)) continue;   // a regra de leitura vale também no tempo real
        for (const b of canal.bindings) {
          if (b.table !== 'documentos' || (b.event !== '*' && b.event !== tipo)) continue;
          c.enviar([null, null, topico, 'postgres_changes', {
            ids: [b.id],
            data: {
              type: tipo, schema: 'public', table: 'documentos', commit_timestamp: new Date().toISOString(), columns: COLUNAS,
              record: nova ? clonar(nova) : {}, old_record: antiga ? { colecao: antiga.colecao, id: antiga.id } : {}, errors: null
            }
          }]);
        }
      }
    }
  }

  async function rotear(route) {
    const req = route.request();
    const u = new URL(req.url());
    const metodo = req.method();
    if (metodo === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS, body: '' });
    const cab = await req.allHeaders();
    const token = (cab.authorization || '').replace(/^Bearer\s+/i, '');
    const usuario = estado.tokens.get(token) || null;
    let corpo = null;
    try { corpo = req.postDataJSON(); } catch (e) { corpo = null; }
    const p = u.pathname;
    estado.pedidos.push(`${metodo} ${p}${u.search}`);

    /* ----- Auth ----- */
    if (p === '/auth/v1/token' && metodo === 'POST') {
      const g = u.searchParams.get('grant_type');
      if (g === 'password') {
        const alvo = estado.usuarios.find(x => x.email === String(corpo && corpo.email || '').toLowerCase());
        if (!alvo || alvo.senha !== (corpo && corpo.password)) return responder(route, 400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
        return responder(route, 200, novaSessao(alvo));
      }
      if (g === 'refresh_token') {
        const alvo = estado.refresh.get(corpo && corpo.refresh_token);
        if (!alvo) return responder(route, 400, { code: 400, error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token: Refresh Token Not Found' });
        estado.refresh.delete(corpo.refresh_token);
        return responder(route, 200, novaSessao(alvo));
      }
      return responder(route, 400, { code: 400, error_code: 'validation_failed', msg: 'unsupported grant_type' });
    }
    if (p === '/auth/v1/user') {
      if (!usuario) return responder(route, 401, { code: 401, error_code: 'bad_jwt', msg: 'invalid JWT: unable to parse or verify signature' });
      if (metodo === 'PUT') {
        const nova = corpo && corpo.password;
        if (typeof nova === 'string') {
          if (nova.length < 6) return responder(route, 422, { code: 422, error_code: 'weak_password', msg: 'Password should be at least 6 characters.' });
          if (nova === usuario.senha) return responder(route, 422, { code: 422, error_code: 'same_password', msg: 'New password should be different from the old password.' });
          usuario.senha = nova;
        }
      }
      return responder(route, 200, usuarioJson(usuario));
    }
    if (p === '/auth/v1/logout') {
      if (token) estado.tokens.delete(token);
      return route.fulfill({ status: 204, headers: CORS, body: '' });
    }
    if (p === '/auth/v1/recover') { estado.recuperacoes.push(String(corpo && corpo.email || '')); return responder(route, 200, {}); }

    /* ----- REST ----- */
    if (p === '/rest/v1/rpc/papel_atual') {
      if (estado.semFuncao) return responder(route, 404, { code: 'PGRST202', details: 'Searched for the function public.papel_atual without parameters', hint: null, message: 'Could not find the function public.papel_atual without parameters in the schema cache' });
      if (!usuario) return responder(route, 401, { code: '42501', details: null, hint: null, message: 'permission denied for function papel_atual' });
      return responder(route, 200, papelDe(usuario));
    }
    if (p === '/rest/v1/documentos') {
      if (!usuario) return responder(route, 401, { code: '42501', details: null, hint: null, message: 'permission denied for table documentos' });
      const f = filtros(u);
      if (metodo === 'GET' || metodo === 'HEAD') {
        if (!papelDe(usuario)) return responder(route, 200, []);
        let lista = [...estado.linhas.values()].filter(l => casa(l, f)).sort((a, b) => (a.colecao + '\u0000' + a.id < b.colecao + '\u0000' + b.id ? -1 : 1));
        const offset = Number(u.searchParams.get('offset') || 0);
        const limit = Math.min(Number(u.searchParams.get('limit') || estado.maxLinhas), estado.maxLinhas);
        lista = lista.slice(offset, offset + limit);
        const cols = (u.searchParams.get('select') || '*').split(',').map(s => s.trim());
        const proj = cols.includes('*') ? lista : lista.map(l => Object.fromEntries(cols.map(c => [c, l[c]])));
        return responder(route, 200, clonar(proj));
      }
      if (metodo === 'POST') {
        if (!podeGravar(usuario)) return erroRls(route);
        const linhas = Array.isArray(corpo) ? corpo : [corpo];
        for (const l of linhas) {
          if (!l || typeof l.colecao !== 'string' || typeof l.id !== 'string' || !l.dados || typeof l.dados !== 'object') return responder(route, 400, { code: '23502', details: null, hint: null, message: 'documento inválido' });
          const k = chave(l.colecao, l.id);
          const antes = estado.linhas.get(k);
          const nova = { colecao: l.colecao, id: l.id, dados: clonar(l.dados), atualizado_em: new Date().toISOString(), atualizado_por: usuario.id };
          estado.linhas.set(k, nova);
          emitirMudanca(antes ? 'UPDATE' : 'INSERT', nova, antes);
        }
        return route.fulfill({ status: 201, headers: CORS, body: '' });
      }
      if (metodo === 'DELETE') {
        // sem permissão, a regra simplesmente não encontra linhas para excluir (como no Postgres)
        if (podeGravar(usuario)) {
          for (const [k, l] of [...estado.linhas]) if (casa(l, f)) { estado.linhas.delete(k); emitirMudanca('DELETE', null, l); }
        }
        return route.fulfill({ status: 204, headers: CORS, body: '' });
      }
    }
    return responder(route, 404, { message: `rota não simulada: ${metodo} ${p}` });
  }

  /* ----- tempo real (protocolo Phoenix, serializador vsn 2.0.0: [join_ref, ref, topic, event, payload]) ----- */
  function tempoReal(ws) {
    if (estado.semTempoReal) { ws.close({ code: 1011, reason: 'tempo real indisponível' }); return; }
    const c = { canais: new Map(), enviar: m => { try { ws.send(JSON.stringify(m)); } catch (e) { /* conexão fechada */ } } };
    estado.conexoes.add(c);
    ws.onMessage(texto => {
      let m;
      try { m = JSON.parse(String(texto)); } catch (e) { return; }
      if (!Array.isArray(m)) return;
      const [joinRef, ref, topico, evento, payload] = m;
      const ok = (resp = {}) => c.enviar([joinRef, ref, topico, 'phx_reply', { status: 'ok', response: resp }]);
      if (topico === 'phoenix' && evento === 'heartbeat') return ok();
      if (evento === 'phx_join') {
        const pcs = (payload && payload.config && payload.config.postgres_changes) || [];
        const bindings = pcs.map(b => ({ id: proximoId++, event: b.event, schema: b.schema, table: b.table, ...(b.filter ? { filter: b.filter } : {}) }));
        c.canais.set(topico, { bindings, usuario: estado.tokens.get(payload && payload.access_token) || null });
        ok({ postgres_changes: bindings });
        c.enviar([null, null, topico, 'system', { message: 'Subscribed to PostgreSQL', status: 'ok', extension: 'postgres_changes', channel: topico.replace(/^realtime:/, '') }]);
        return;
      }
      if (evento === 'access_token') { const canal = c.canais.get(topico); if (canal) canal.usuario = estado.tokens.get(payload && payload.access_token) || canal.usuario; return; }
      if (evento === 'phx_leave') { c.canais.delete(topico); return ok(); }
      return ok();
    });
    ws.onClose(() => estado.conexoes.delete(c));
  }

  return {
    estado, rotear, tempoReal, novaSessao,
    usuario: email => estado.usuarios.find(x => x.email === email.toLowerCase()),
    documentos: col => [...estado.linhas.values()].filter(l => l.colecao === col)
  };
}
