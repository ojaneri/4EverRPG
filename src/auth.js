'use strict';

// ---------------------------------------------------------------------------
// 4EverRPG — Contas de jogador
// - Cadastro com email + nome: já entra na hora (sessão salva no navegador).
// - Para entrar de novo (outro aparelho, sessão expirada, email já cadastrado):
//   magic link enviado por email, válido por 15 minutos e de uso único, que
//   abre uma sessão de 30 dias.
// - Tokens são guardados apenas como hash SHA-256.
// ---------------------------------------------------------------------------

const crypto = require('crypto');
const storage = require('./storage');
const { enviarEmail } = require('./mailer');

const SESSAO_MS = 30 * 24 * 60 * 60 * 1000;
const LINK_MS = 15 * 60 * 1000;
const INTERVALO_REENVIO_MS = 60 * 1000;

const usuarios = new Map(); // id -> usuario
const sessoes = new Map(); // hash -> { userId, expiraEm }
const links = new Map(); // hash -> { userId, expiraEm, destino }
const ultimoEnvio = new Map(); // email -> ts

for (const u of storage.carregarDoc('usuarios', [])) usuarios.set(u.id, u);
for (const [h, s] of Object.entries(storage.carregarDoc('sessoes', {}))) {
  if (s.expiraEm > Date.now()) sessoes.set(h, s);
}

const hash = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');
const novoToken = () => crypto.randomBytes(32).toString('base64url');
const novoId = () => crypto.randomBytes(9).toString('base64url');

function salvarUsuarios() {
  storage.salvarDoc('usuarios', [...usuarios.values()]);
}
function salvarSessoes() {
  storage.salvarDoc('sessoes', Object.fromEntries(sessoes));
}

function normalizarEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  if (e.length > 120 || !/^[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}$/.test(e)) {
    throw new Error('Informe um email válido.');
  }
  return e;
}

function sanitizarNome(nome) {
  const n = String(nome || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20);
  if (n.length < 2) throw new Error('Seu nome precisa ter pelo menos 2 letras.');
  return n;
}

function usuarioPorEmail(email) {
  for (const u of usuarios.values()) if (u.email === email) return u;
  return null;
}

function publico(u) {
  return u ? { id: u.id, nome: u.nome, email: u.email } : null;
}

function criarSessao(userId) {
  const token = novoToken();
  sessoes.set(hash(token), { userId, expiraEm: Date.now() + SESSAO_MS });
  salvarSessoes();
  return token;
}

function validarSessao(token) {
  if (!token) return null;
  const s = sessoes.get(hash(token));
  if (!s) return null;
  if (s.expiraEm < Date.now()) {
    sessoes.delete(hash(token));
    salvarSessoes();
    return null;
  }
  return usuarios.get(s.userId) || null;
}

function sair(token) {
  if (sessoes.delete(hash(token))) salvarSessoes();
}

// Cadastro: se o email é novo, cria a conta e já devolve a sessão.
// Se já existe, não loga direto (seria login sem senha): manda o magic link.
async function registrar({ email, nome, baseUrl, destino }) {
  const e = normalizarEmail(email);
  const n = sanitizarNome(nome);
  const existente = usuarioPorEmail(e);
  if (existente) {
    await enviarMagicLink({ email: e, baseUrl, destino });
    return { linkEnviado: true };
  }
  const u = { id: novoId(), email: e, nome: n, criadoEm: Date.now() };
  usuarios.set(u.id, u);
  salvarUsuarios();
  return { usuario: publico(u), token: criarSessao(u.id) };
}

async function enviarMagicLink({ email, baseUrl, destino }) {
  const e = normalizarEmail(email);
  const u = usuarioPorEmail(e);
  if (!u) throw new Error('Não encontramos uma conta com esse email. Crie sua conta primeiro.');

  const ultimo = ultimoEnvio.get(e) || 0;
  if (Date.now() - ultimo < INTERVALO_REENVIO_MS) {
    throw new Error('Acabamos de enviar um link para esse email. Aguarde um minuto antes de pedir outro.');
  }

  const token = novoToken();
  links.set(hash(token), { userId: u.id, expiraEm: Date.now() + LINK_MS, destino: destino || '' });
  ultimoEnvio.set(e, Date.now());

  const url = `${baseUrl.replace(/\/+$/, '')}/auth/magic?t=${encodeURIComponent(token)}`;
  const text =
    `Olá, ${u.nome}!\n\nUse o link abaixo para entrar no 4Ever RPG (válido por 15 minutos, uso único):\n\n${url}\n\n` +
    `Depois de entrar, você fica conectado neste aparelho por 30 dias.\n\nSe não foi você que pediu, ignore este email.`;
  const html = `<!doctype html><html><body style="margin:0;background:#11101a;font-family:Segoe UI,Arial,sans-serif;color:#ece8ff">
  <div style="max-width:480px;margin:0 auto;padding:32px 24px">
    <h1 style="font-family:Georgia,serif;margin:0 0 16px">4<span style="color:#9b7bd1">Ever</span></h1>
    <p>Olá, <strong>${u.nome.replace(/[<>&"]/g, '')}</strong>!</p>
    <p>Clique no botão para entrar no 4Ever RPG:</p>
    <p style="text-align:center;margin:28px 0">
      <a href="${url}" style="background:#9b7bd1;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;display:inline-block">Entrar no 4Ever</a>
    </p>
    <p style="color:#a79fd6;font-size:13px">O link vale por 15 minutos e só pode ser usado uma vez. Depois de entrar, você fica conectado neste aparelho por 30 dias.</p>
    <p style="color:#a79fd6;font-size:13px">Se não foi você que pediu, ignore este email.</p>
  </div></body></html>`;

  try {
    await enviarEmail({ to: e, subject: 'Seu link de acesso ao 4Ever RPG', text, html });
  } catch (err) {
    ultimoEnvio.delete(e);
    console.error('[auth] falha ao enviar magic link:', err.message);
    throw new Error('Não foi possível enviar o email agora. Tente novamente em instantes.');
  }
  return true;
}

// Troca o magic link (uso único) por uma sessão de 30 dias.
function consumirMagicLink(token) {
  const h = hash(token);
  const l = links.get(h);
  links.delete(h);
  if (!l || l.expiraEm < Date.now() || !usuarios.has(l.userId)) return null;
  const u = usuarios.get(l.userId);
  return { token: criarSessao(u.id), usuario: publico(u), destino: l.destino };
}

function atualizarNome(userId, nome) {
  const u = usuarios.get(userId);
  if (!u) throw new Error('Conta não encontrada.');
  u.nome = sanitizarNome(nome);
  salvarUsuarios();
  return publico(u);
}

function getUsuario(id) {
  return usuarios.get(id) || null;
}

// Limpeza periódica de sessões e links vencidos.
setInterval(() => {
  const agora = Date.now();
  let mudou = false;
  for (const [h, s] of sessoes) if (s.expiraEm < agora) { sessoes.delete(h); mudou = true; }
  for (const [h, l] of links) if (l.expiraEm < agora) links.delete(h);
  if (mudou) salvarSessoes();
}, 60 * 60 * 1000).unref();

module.exports = {
  registrar,
  enviarMagicLink,
  consumirMagicLink,
  validarSessao,
  sair,
  atualizarNome,
  getUsuario,
  publico,
};
