// Testes do site publicado fora do claude.ai: entrada, papéis, tempo real, senha e configuração.
// Uso: SEED_JSON=/caminho/seed.json node tests/site.mjs   (CAPTURAS=/pasta guarda imagens da tela de entrada)
import fs from 'node:fs';
import path from 'node:path';
import { servidor, navegador, seed, novaPagina, aguardarPronto, entrar } from './util.mjs';
import { criarSupabaseSimulado, USUARIOS_TESTE } from './supabase-simulado.mjs';

const CAPTURAS = process.env.CAPTURAS || '';
const resultados = [];
function verificar(grupo, nome, ok, detalhe = '') {
  resultados.push({ grupo, nome, ok: !!ok });
  console.log(`${ok ? 'OK   ' : 'FALHA'} [${grupo}] ${nome}${detalhe ? ' — ' + detalhe : ''}`);
}
const textoTela = page => page.locator('#mapa-acesso').innerText().catch(() => '');
const temTela = page => page.evaluate(() => !!document.getElementById('mapa-acesso'));
const esperarTexto = (page, re, timeout = 8000) => page.waitForFunction(r => { const t = document.getElementById('mapa-acesso'); return t && new RegExp(r).test(t.innerText); }, re.source, { timeout }).then(() => true).catch(() => false);
const errosInesperados = erros => erros.filter(e => !/status of (400|401|403|404|422)/.test(e));

const srv = await servidor();
const browser = await navegador();
const base = seed();
const todosErros = [];

/* 1. Entrada */
{
  const { page, erros } = await novaPagina(browser, srv.url, { alvo: 'site', semEntrar: true, cfg: { seed: base } });
  const G = 'Entrada';
  await page.waitForSelector('#acesso-email');
  const st = await page.evaluate(() => ({ status: window.__mapa && window.__mapa.S.status, tela: !!document.getElementById('mapa-acesso') }));
  verificar(G, 'Tela de entrada aparece antes do mapa (mapa aguardando)', st.tela && st.status === 'conectando', JSON.stringify(st));
  if (CAPTURAS) { fs.mkdirSync(CAPTURAS, { recursive: true }); await page.screenshot({ path: path.join(CAPTURAS, 'entrada-desktop.png') }); }
  await page.click('#form-entrar button[type="submit"]');
  verificar(G, 'Campos vazios pedem e-mail e senha', await esperarTexto(page, /Preencha o e-mail e a senha/));
  await page.fill('#acesso-email', USUARIOS_TESTE.editor.email);
  await page.fill('#acesso-senha', 'senha-errada');
  await page.click('#form-entrar button[type="submit"]');
  verificar(G, 'Senha errada: "E-mail ou senha incorretos."', await esperarTexto(page, /E-mail ou senha incorretos/));
  await page.fill('#acesso-senha', USUARIOS_TESTE.editor.senha);
  await page.click('#form-entrar button[type="submit"]');
  await aguardarPronto(page);
  await page.waitForTimeout(400);
  verificar(G, 'Senha certa: a tela some e o mapa abre em modo editor', !(await temTela(page)) && await page.evaluate(() => window.__mapa.S.podeEditarBanco === true));
  const rod = await page.locator('#rodape-lateral').innerText();
  verificar(G, 'Rodapé mostra quem está conectado, Trocar senha e Sair', rod.includes(`Conectado como ${USUARIOS_TESTE.editor.email}`) && /Trocar senha/.test(rod) && /Sair/.test(rod));
  await page.reload();
  await aguardarPronto(page);
  verificar(G, 'Ao recarregar, continua conectado (sem pedir a senha de novo)', !(await temTela(page)) && await page.evaluate(() => window.__mapa.S.lancamentos.size === 159));
  await page.click('.mapa-conta button[data-conta="sair"]');
  await page.waitForSelector('#acesso-email', { timeout: 8000 });
  const sessaoGuardada = await page.evaluate(() => Object.keys(localStorage).some(k => /auth-token/.test(k) && localStorage.getItem(k)));
  verificar(G, 'Sair volta para a entrada e apaga a sessão do navegador', !sessaoGuardada);
  todosErros.push(...errosInesperados(erros).map(e => 'entrada: ' + e));
}

/* 2. Papéis e acesso */
{
  const G = 'Papéis';
  const leitor = await novaPagina(browser, srv.url, { alvo: 'site', quem: 'leitor', cfg: { seed: base } });
  await aguardarPronto(leitor.page);
  const st = await leitor.page.evaluate(() => ({ edita: window.__mapa.S.podeEditarBanco, botoes: document.querySelectorAll('[data-acao="novo-lanc"],[data-acao="novo-colab"]').length }));
  verificar(G, 'Leitor abre o mapa somente para leitura', st.edita === false);
  const tentativa = await leitor.page.evaluate(async () => {
    const db = await window.claude.use('db');
    try { await db.collection('lancamentos').doc('teste-invasao').set({ ano: 2026 }); return 'gravou'; } catch (e) { return e.code; }
  });
  verificar(G, 'Leitor não consegue gravar nem chamando o banco direto', tentativa === 'invalid_argument' && !leitor.emu.documentos('lancamentos').some(l => l.id === 'teste-invasao'), tentativa);
  todosErros.push(...errosInesperados(leitor.erros).map(e => 'leitor: ' + e));
  await leitor.ctx.close();

  const sem = await novaPagina(browser, srv.url, { alvo: 'site', quem: 'semAcesso', cfg: { seed: base } });
  verificar(G, 'E-mail sem perfil vê "Seu acesso ainda não foi liberado"', await esperarTexto(sem.page, /Seu acesso ainda não foi liberado/));
  const st2 = await sem.page.evaluate(() => ({ status: window.__mapa.S.status, lanc: window.__mapa.S.lancamentos.size }));
  verificar(G, 'Sem perfil, nenhum dado chega ao navegador', st2.status === 'conectando' && st2.lanc === 0, JSON.stringify(st2));
  await sem.page.click('#acesso-sair');
  await sem.page.waitForSelector('#acesso-email', { timeout: 8000 });
  verificar(G, 'Botão "Sair e entrar com outro e-mail" volta para a entrada', true);
  todosErros.push(...errosInesperados(sem.erros).map(e => 'sem acesso: ' + e));
  await sem.ctx.close();
}

/* 3. Tempo real entre duas abas */
{
  const G = 'Tempo real';
  const emu = criarSupabaseSimulado({ documentos: base });
  const a = await novaPagina(browser, srv.url, { alvo: 'site', emu, quem: 'editor' });
  const b = await novaPagina(browser, srv.url, { alvo: 'site', emu, quem: 'leitor' });
  await aguardarPronto(a.page); await aguardarPronto(b.page);
  await b.page.waitForTimeout(600);
  const t0 = Date.now();
  await a.page.evaluate(async () => {
    const db = await window.claude.use('db');
    await db.collection('lancamentos').doc('2026-09-81-recebimento').set({ ano: 2026, mes: 9, codigo: '81', funcao: 'recebimento', diasLista: [1, 2], diasFuncao: 2, pedidos: 0, nfs: 4, skus: 50, unidades: 5000 });
  });
  const chegou = await b.page.waitForFunction(() => window.__mapa.S.lancamentos.has('2026-09-81-recebimento'), null, { timeout: 6000 }).then(() => true).catch(() => false);
  verificar(G, 'Lançamento gravado numa aba aparece na outra sem recarregar', chegou, `${Date.now() - t0} ms`);
  await a.page.evaluate(async () => { const db = await window.claude.use('db'); await db.collection('lancamentos').doc('2026-09-81-recebimento').delete(); });
  const saiu = await b.page.waitForFunction(() => !window.__mapa.S.lancamentos.has('2026-09-81-recebimento'), null, { timeout: 6000 }).then(() => true).catch(() => false);
  verificar(G, 'Exclusão também chega na outra aba', saiu);
  todosErros.push(...errosInesperados([...a.erros, ...b.erros]).map(e => 'tempo real: ' + e));
  await a.ctx.close(); await b.ctx.close();

  const emu2 = criarSupabaseSimulado({ documentos: base, semTempoReal: true });
  const c = await novaPagina(browser, srv.url, { alvo: 'site', emu: emu2, quem: 'leitor' });
  await aguardarPronto(c.page);
  verificar(G, 'Sem tempo real, o mapa abre normalmente (consulta periódica)', await c.page.evaluate(() => window.__mapa.S.lancamentos.size === 159));
  emu2.estado.linhas.set('lancamentos\u0000novo-teste', { colecao: 'lancamentos', id: 'novo-teste', dados: { ano: 2026, mes: 9, codigo: '81', funcao: 'recebimento', diasLista: [1], diasFuncao: 1, pedidos: 0, nfs: 1, skus: 5, unidades: 50 } });
  await c.page.evaluate(() => window.dispatchEvent(new Event('online')));
  const reserva = await c.page.waitForFunction(() => window.__mapa.S.lancamentos.has('novo-teste'), null, { timeout: 5000 }).then(() => true).catch(() => false);
  verificar(G, 'Sem tempo real, a conexão de volta (ou a aba de volta) busca os dados novos', reserva);
  await c.ctx.close();
}

/* 4. Senha */
{
  const G = 'Senha';
  const emu = criarSupabaseSimulado({ documentos: base });
  const { page, ctx, erros } = await novaPagina(browser, srv.url, { alvo: 'site', emu, quem: 'leitor' });
  await aguardarPronto(page);
  await page.click('.mapa-conta button[data-conta="senha"]');
  await page.waitForSelector('#acesso-nova');
  await page.fill('#acesso-nova', 'curta'); await page.fill('#acesso-repete', 'curta');
  await page.click('#form-senha button[type="submit"]');
  verificar(G, 'Trocar senha: menos de 8 caracteres é recusado', await esperarTexto(page, /pelo menos 8 caracteres/));
  await page.fill('#acesso-nova', 'nova-senha-2026'); await page.fill('#acesso-repete', 'outra-senha-2026');
  await page.click('#form-senha button[type="submit"]');
  verificar(G, 'Trocar senha: as duas precisam ser iguais', await esperarTexto(page, /não são iguais/));
  await page.fill('#acesso-repete', 'nova-senha-2026');
  await page.click('#form-senha button[type="submit"]');
  verificar(G, 'Trocar senha: confirma "Senha trocada."', await esperarTexto(page, /Senha trocada/) && emu.usuario(USUARIOS_TESTE.leitor.email).senha === 'nova-senha-2026');
  await page.click('#acesso-ok');
  await page.waitForTimeout(400);
  verificar(G, '"Voltar ao Mapa" fecha a janela e o mapa continua aberto', !(await temTela(page)) && await page.evaluate(() => window.__mapa.S.status === 'pronto'));
  await page.click('.mapa-conta button[data-conta="sair"]');
  await page.waitForSelector('#acesso-email');
  await page.fill('#acesso-email', USUARIOS_TESTE.leitor.email); await page.fill('#acesso-senha', 'nova-senha-2026');
  await page.click('#form-entrar button[type="submit"]');
  await aguardarPronto(page);
  verificar(G, 'Entra com a senha nova', !(await temTela(page)));
  await page.click('.mapa-conta button[data-conta="sair"]');
  await page.waitForSelector('#acesso-email');
  await page.click('#acesso-esqueci');
  await page.fill('#acesso-email-rec', USUARIOS_TESTE.leitor.email);
  await page.click('#form-esqueci button[type="submit"]');
  verificar(G, '"Esqueci minha senha" envia o pedido e explica o que fazer', await esperarTexto(page, /Se o e-mail estiver cadastrado/) && emu.estado.recuperacoes.includes(USUARIOS_TESTE.leitor.email));
  todosErros.push(...errosInesperados(erros).map(e => 'senha: ' + e));
  await ctx.close();

  // links recebidos por e-mail
  for (const tipo of ['recovery', 'invite']) {
    const emuL = criarSupabaseSimulado({ documentos: base });
    const s = emuL.novaSessao(emuL.usuario(USUARIOS_TESTE.editor.email));
    const l = await novaPagina(browser, srv.url, { alvo: 'site', emu: emuL, semEntrar: true });
    const hash = `#access_token=${s.access_token}&expires_at=${s.expires_at}&expires_in=3600&refresh_token=${s.refresh_token}&token_type=bearer&type=${tipo}`;
    await l.page.goto('about:blank');   // o link do e-mail abre a página do zero
    await l.page.goto(srv.url + 'mapa-cd-simao' + hash);
    const titulo = tipo === 'invite' ? /Crie a sua senha/ : /Defina uma nova senha/;
    const pediu = await esperarTexto(l.page, titulo);
    await l.page.fill('#acesso-nova', 'senha-pelo-link-1'); await l.page.fill('#acesso-repete', 'senha-pelo-link-1');
    await l.page.click('#form-senha button[type="submit"]');
    await aguardarPronto(l.page);
    const fim = await l.page.evaluate(() => ({ hash: location.hash, tela: !!document.getElementById('mapa-acesso') }));
    verificar(G, `Link de ${tipo === 'invite' ? 'convite' : 'nova senha'} pede a senha e abre o mapa`, pediu && !fim.tela && !fim.hash && emuL.usuario(USUARIOS_TESTE.editor.email).senha === 'senha-pelo-link-1', JSON.stringify(fim));
    todosErros.push(...errosInesperados(l.erros).map(e => 'link: ' + e));
    await l.ctx.close();
  }
  const exp = await novaPagina(browser, srv.url, { alvo: 'site', semEntrar: true, cfg: { seed: base } });
  await exp.page.goto('about:blank');
  await exp.page.goto(srv.url + 'mapa-cd-simao#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
  verificar(G, 'Link vencido explica e mostra a entrada', await esperarTexto(exp.page, /expirou ou já foi usado/) && await exp.page.locator('#acesso-email').count() === 1);
  await exp.ctx.close();
}

/* 5. Configuração */
{
  const G = 'Configuração';
  const srvVazio = await servidor({ config: { url: '', chave: '' } });
  const v = await novaPagina(browser, srvVazio.url, { alvo: 'site', semEntrar: true, cfg: { seed: base } });
  verificar(G, 'Sem Supabase configurado na Vercel: mensagem para quem publica', await esperarTexto(v.page, /ainda não foi ligado ao banco de dados/));
  await v.ctx.close(); srvVazio.fechar();
  const emu = criarSupabaseSimulado({ documentos: base, semFuncao: true });
  const f = await novaPagina(browser, srv.url, { alvo: 'site', emu, quem: 'editor' });
  verificar(G, 'Banco sem o script SQL: mensagem pedindo para rodar publicacao/supabase.sql', await esperarTexto(f.page, /rode o script publicacao\/supabase\.sql/));
  await f.ctx.close();
  const s = await novaPagina(browser, srv.url, { alvo: 'site', quem: 'editor', cfg: { seed: base } });
  await aguardarPronto(s.page);
  await s.page.goto(srv.url + 'mapa-cd-simao#sair');
  verificar(G, 'Endereço com #sair desconecta e volta para a entrada', await s.page.waitForSelector('#acesso-email', { timeout: 8000 }).then(() => true).catch(() => false));
  await s.ctx.close();
}

/* 6. Celular e modo escuro */
{
  const G = 'Aparência';
  const cel = await novaPagina(browser, srv.url, { alvo: 'site', semEntrar: true, cfg: { seed: base }, viewport: { width: 390, height: 844 } });
  await cel.page.waitForSelector('#acesso-email');
  const w = await cel.page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vis: window.innerWidth, alto: [...document.querySelectorAll('#mapa-acesso .inp, #mapa-acesso .btn')].every(e => e.getBoundingClientRect().height >= 44) }));
  verificar(G, 'Celular 390 px: sem rolagem lateral e campos com 44 px', w.doc <= w.vis && w.alto, JSON.stringify(w));
  if (CAPTURAS) await cel.page.screenshot({ path: path.join(CAPTURAS, 'entrada-celular.png') });
  await cel.ctx.close();
  const esc = await novaPagina(browser, srv.url, { alvo: 'site', semEntrar: true, cfg: { seed: base }, esquema: 'dark' });
  await esc.page.waitForSelector('#acesso-email');
  const cores = await esc.page.evaluate(() => { const t = document.getElementById('mapa-acesso'); return { fundo: getComputedStyle(t).backgroundColor, cartao: getComputedStyle(t.querySelector('.acesso-cartao')).backgroundColor }; });
  verificar(G, 'Modo escuro usa as cores escuras do mapa', /rgb\(21, 17, 16\)/.test(cores.fundo) && /rgb\(32, 26, 25\)/.test(cores.cartao), JSON.stringify(cores));
  if (CAPTURAS) await esc.page.screenshot({ path: path.join(CAPTURAS, 'entrada-escuro.png') });
  await esc.ctx.close();
}

/* 7. Migração: cópia de segurança do artefato restaurada num site com banco vazio */
{
  const G = 'Migração';
  let arq = process.env.COPIA_JSON;
  if (!arq) {
    const colecoes = Object.fromEntries(['colaboradores', 'lancamentos', 'meses', 'parametros', 'metas', 'importacoes', 'planoAcao', 'historico'].map(c => [c, Object.entries(base[c] || {}).map(([id, dados]) => ({ id, dados }))]));
    arq = path.join(process.env.CAPTURAS || '/tmp', 'copia-teste-migracao.json');
    fs.writeFileSync(arq, JSON.stringify({ sistema: 'Mapa de Produtividade — CD Simão', versao: 1, geradoEm: new Date().toISOString(), colecoes }));
  }
  const copia = JSON.parse(fs.readFileSync(arq, 'utf8'));
  const totalCopia = Object.values(copia.colecoes).reduce((n, l) => n + l.length, 0);
  const emu = criarSupabaseSimulado({ documentos: {} });
  const { page, ctx, erros } = await novaPagina(browser, srv.url, { alvo: 'site', emu, quem: 'dono' });
  await aguardarPronto(page);
  verificar(G, 'Site novo começa vazio ("Nenhum mês importado")', /Nenhum mês importado/.test(await page.locator('#conteudo').innerText()));
  await page.evaluate(() => window.__mapa.navegar('relatorios', {}));
  await page.waitForTimeout(300);
  const [escolha] = await Promise.all([page.waitForEvent('filechooser'), page.click('[data-acao="copia-restaurar"]')]);
  await escolha.setFiles(arq);
  await page.waitForSelector('.modal-fundo #rest-conf');
  await page.fill('#rest-conf', 'RESTAURAR');
  await page.locator('.modal-fundo .pe-modal button', { hasText: 'Restaurar' }).click();
  await page.waitForFunction(() => !document.querySelector('.modal-fundo'), null, { timeout: 60000 }).catch(() => {});
  await page.waitForFunction(n => window.__mapa.S.lancamentos.size === n, (copia.colecoes.lancamentos || []).length, { timeout: 15000 }).catch(() => {});
  const noBanco = emu.estado.linhas.size;
  const st = await page.evaluate(() => ({ lanc: window.__mapa.S.lancamentos.size, col: window.__mapa.S.colaboradores.size, amarrado: window.__mapa.auditoria(2026).amarracao.every(a => a.dif.dias === 0 && a.dif.itens === 0 && a.dif.unidades === 0) }));
  verificar(G, `Restaurar grava os ${totalCopia} documentos no banco do site (+1 registro no histórico)`, noBanco === totalCopia + 1, `${noBanco} no banco`);
  verificar(G, 'Depois de restaurar, o mapa mostra os dados e a Auditoria fecha em zero', st.lanc === (copia.colecoes.lancamentos || []).length && st.col === (copia.colecoes.colaboradores || []).length && st.amarrado, JSON.stringify(st));
  todosErros.push(...errosInesperados(erros).map(e => 'migração: ' + e));
  await ctx.close();
}

verificar('Console', 'Nenhum erro de JavaScript inesperado', !todosErros.length, todosErros.slice(0, 5).join(' | '));
await browser.close();
srv.fechar();
const falhas = resultados.filter(r => !r.ok);
console.log(`\n${resultados.length - falhas.length} de ${resultados.length} verificações do site atendidas.`);
process.exit(falhas.length ? 1 : 0);
