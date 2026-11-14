'use strict';

require('dotenv').config();
const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const gameManager = require('./src/gameManager');
const { CLASSES, ATTRIBUTES, ATTRIBUTE_LABELS, POINT_BUY, HABILIDADES, ITENS, RARIDADES, MAX_EQUIPADOS, CORES_PERSONAGEM, COR_PADRAO_CLASSE } = require('./src/characterSystem');
const { ADVENTURES, getAdventureById } = require('./src/adventures');
const tts = require('./src/tts');
const auth = require('./src/auth');
const { MUSICAS, CREDITOS_SFX } = require('./src/musicas');
const { AMBIENTES } = require('./src/ambientes');
const { enviarEmail } = require('./src/mailer');
const storage = require('./src/storage');

const app = express();
app.set('trust proxy', 'loopback');
const server = http.createServer(app);
// Áudios do bate-papo vão até ~3 MB; o limite padrão do Socket.IO (1 MB) derrubava a conexão.
const io = new Server(server, { maxHttpBufferSize: 4 * 1024 * 1024 });

const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/+$/, '');
function baseUrl(req) {
  return PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
}

// Cache no navegador: index.html nunca (aponta para css/js versionados com ?v=);
// músicas, efeitos e imagens de cena por 30 dias (não mudam).
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, arquivo) => {
    if (arquivo.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
    else if (/[\\/](musicas|sfx)[\\/]/.test(arquivo)) res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
  },
}));
app.use(express.json({ limit: '20kb' }));

// --- Autenticação HTTP -------------------------------------------------------
function tokenDaRequisicao(req) {
  const h = req.get('authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}
function exigirLogin(req, res, next) {
  const usuario = auth.validarSessao(tokenDaRequisicao(req));
  if (!usuario) return res.status(401).json({ erro: 'Sessão expirada. Entre de novo.' });
  req.usuario = usuario;
  next();
}
const responder = (fn) => async (req, res) => {
  try {
    res.json(await fn(req, res));
  } catch (e) {
    res.status(400).json({ erro: e.message });
  }
};

app.get('/api/config', (req, res) => {
  res.json({
    CLASSES,
    CORES_PERSONAGEM,
    COR_PADRAO_CLASSE,
    ATTRIBUTES,
    ATTRIBUTE_LABELS,
    POINT_BUY,
    HABILIDADES,
    ITENS,
    RARIDADES,
    MAX_EQUIPADOS,
    ADVENTURES,
    ttsDisponivel: tts.disponivel(),
    tempoTurnoMs: gameManager.TEMPO_TURNO_MS,
    tempoDadoMs: gameManager.TEMPO_DADO_MS,
    opcoesTempoTurno: gameManager.OPCOES_TEMPO_TURNO,
    opcoesTempoDado: gameManager.OPCOES_TEMPO_DADO,
    MUSICAS,
    CREDITOS_SFX,
    AMBIENTES,
    maxPulos: gameManager.MAX_PULOS,
  });
});

app.post('/api/registrar', responder(async (req) => {
  const { email, nome, destino } = req.body || {};
  return auth.registrar({ email, nome, destino, baseUrl: baseUrl(req) });
}));

app.post('/api/login', responder(async (req) => {
  const { email, destino } = req.body || {};
  await auth.enviarMagicLink({ email, destino, baseUrl: baseUrl(req) });
  return { linkEnviado: true };
}));

app.get('/api/eu', exigirLogin, (req, res) => res.json({ usuario: auth.publico(req.usuario) }));

app.post('/api/eu', exigirLogin, responder(async (req) => ({ usuario: auth.atualizarNome(req.usuario.id, (req.body || {}).nome) })));

app.post('/api/sair', (req, res) => {
  const t = tokenDaRequisicao(req);
  if (t) auth.sair(t);
  res.json({ ok: true });
});

app.get('/api/jogos-abertos', exigirLogin, (req, res) => res.json({ jogos: gameManager.listarJogosAbertos() }));
app.get('/api/observar', exigirLogin, (req, res) => {
  if (!auth.ehAdmin(req.usuario)) return res.status(403).json({ erro: 'Só administradores.' });
  res.json({ jogos: gameManager.listarPartidasRodando() });
});
app.get('/api/minhas-partidas', exigirLogin, (req, res) => res.json({ jogos: gameManager.listarMinhasPartidas(req.usuario.id) }));

// Magic link: troca o link de uso único por uma sessão de 30 dias, guarda no
// navegador e volta para o jogo.
app.get('/auth/magic', (req, res) => {
  const r = auth.consumirMagicLink(String(req.query.t || ''));
  res.set('Cache-Control', 'no-store');
  res.set('Referrer-Policy', 'no-referrer');
  if (!r) {
    return res.status(400).send(paginaSimples(
      'Link inválido ou expirado',
      '<p>Este link de acesso já foi usado ou expirou (vale por 15 minutos).</p><p><a href="./../#/entrar">Pedir um novo link</a></p>'
    ));
  }
  const destino = /^#\/[\w/-]*$/.test(r.destino || '') ? r.destino : '#/';
  const payload = JSON.stringify({ token: r.token, usuario: r.usuario }).replace(/</g, '\\u003c');
  res.send(paginaSimples(
    'Entrando...',
    `<p>Entrando no 4Ever...</p><script>try{localStorage.setItem('4ever.sessao', JSON.stringify(${payload}));}catch(e){}location.replace('../' + ${JSON.stringify(destino)});</script>`
  ));
});

function paginaSimples(titulo, corpo) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titulo} — 4Ever</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#11101a;color:#ece8ff;font-family:Segoe UI,system-ui,sans-serif;padding:16px}a{color:#9b7bd1}h1{font-family:Georgia,serif}</style></head>
<body><main><h1>4<span style="color:#9b7bd1">Ever</span></h1><h2>${titulo}</h2>${corpo}</main></body></html>`;
}

// Ilustrações de cena (geradas uma vez, guardadas em data/imagens).
const imagens = require('./src/imagens');
app.get('/imagens/:codigo/:arquivo', (req, res) => {
  const caminho = imagens.caminhoArquivo(String(req.params.codigo).toUpperCase(), String(req.params.arquivo));
  if (!caminho) return res.status(404).end();
  res.set('Cache-Control', 'public, max-age=2592000, immutable');
  res.sendFile(caminho);
});

// Narração do Mestre por voz (ElevenLabs). Só sintetiza falas do Mestre que
// existem na sala (por índice do log), para não virar um proxy de TTS aberto.
app.get('/api/tts', async (req, res) => {
  try {
    const room = gameManager.getRoom(String(req.query.codigo || ''));
    const idx = parseInt(req.query.idx, 10);
    const msg = room && room.logPublico[idx];
    if (!msg || msg.tipo !== 'mestre') return res.status(404).json({ erro: 'Fala não encontrada.' });
    const audio = await tts.sintetizar(msg.texto);
    res.set('Content-Type', 'audio/mpeg');
    res.set('Cache-Control', 'private, max-age=604800'); // a fala de um índice do log nunca muda
    res.send(audio);
  } catch (e) {
    console.error('[tts]', e.message);
    res.status(502).json({ erro: e.message });
  }
});

// --- Transmissão do estado das mesas ----------------------------------------
// Coalesce várias mudanças no mesmo tick e envia só as entradas novas do log.
const logEnviado = new Map(); // codigo -> quantas entradas do log já foram transmitidas
const agendadas = new Set();
gameManager.eventos.on('mudou', (room) => {
  if (agendadas.has(room.codigo)) return;
  agendadas.add(room.codigo);
  setImmediate(() => {
    agendadas.delete(room.codigo);
    const enviados = Math.min(logEnviado.get(room.codigo) ?? 0, room.logPublico.length);
    if (room.logPublico.length > enviados) {
      io.to(room.codigo).emit('logNovo', { inicio: enviados, msgs: room.logPublico.slice(enviados) });
    }
    logEnviado.set(room.codigo, room.logPublico.length);
    io.to(room.codigo).emit('estadoAtualizado', gameManager.roomPublicState(room));
  });
});

// Rolagem de dado: vai para a mesa na hora, antes da narração da IA.
gameManager.eventos.on('dado', (room, rolagem) => io.to(room.codigo).emit('dadoRolado', rolagem));
// Baú/gaveta aberto: todos veem o que saiu.
gameManager.eventos.on('saque', (room, saque) => io.to(room.codigo).emit('saqueAberto', saque));
// Avisos rápidos para toda a mesa (dar/descartar itens).
gameManager.eventos.on('aviso', (room, aviso) => io.to(room.codigo).emit('avisoMesa', aviso));
// Recado de um bot no bate-papo: o áudio (quando há voz) e sempre a mesma fala em texto.
gameManager.eventos.on('chatBot', (room, { autor, texto, audio }) => {
  const base = { autor, bot: true, escopo: 'geral', ts: Date.now() };
  if (audio) io.to(room.codigo).emit('chatMensagem', { ...base, tipo: 'audio', mime: 'audio/mpeg', dados: audio });
  io.to(room.codigo).emit('chatMensagem', { ...base, tipo: 'texto', texto });
});
// Etapa da missão concluída: comemoração para a mesa.
gameManager.eventos.on('etapa', (room, etapa) => io.to(room.codigo).emit('etapaConcluida', etapa));

// --- Convites por email -------------------------------------------------------
const convitesEnviados = new Map(); // `${codigo}:${userId}` -> [timestamps]
async function enviarConvite({ room, quem, email }) {
  const base = PUBLIC_URL || 'https://4ever.janeri.com.br';
  const link = `${base}/#/sala/${room.codigo}`;
  const nome = (quem && quem.nome) || 'Um amigo';
  const limpar = (t) => String(t || '').replace(/[<>&"]/g, '');
  const titulo = room.aventuraTitulo || 'uma aventura personalizada';
  const missao = room.missao ? room.missao.objetivo : '';
  const text = `${nome} convidou você para jogar ${titulo} no 4Ever, um RPG online narrado por uma IA Mestre.\n\n` +
    (missao ? `Missão: ${missao}\n\n` : '') + `Entre na mesa: ${link}\nCódigo da mesa: ${room.codigo}\n\nSe ainda não tem conta, é só criar com seu nome e email.`;
  const html = `<!doctype html><html><body style="margin:0;background:#11101a;font-family:Segoe UI,Arial,sans-serif;color:#ece8ff">
  <div style="max-width:480px;margin:0 auto;padding:32px 24px">
    <h1 style="font-family:Georgia,serif;margin:0 0 16px">4<span style="color:#9b7bd1">Ever</span></h1>
    <p><strong>${limpar(nome)}</strong> convidou você para jogar <strong>${limpar(titulo)}</strong>, um RPG online narrado por uma IA Mestre.</p>
    ${missao ? `<p style="background:#2a2414;border:1px solid #d6a925;border-radius:8px;padding:10px 12px">📜 ${limpar(missao)}</p>` : ''}
    <p style="text-align:center;margin:28px 0">
      <a href="${link}" style="background:#9b7bd1;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;display:inline-block">Entrar na mesa</a>
    </p>
    <p style="color:#a79fd6;font-size:13px">Código da mesa: <strong>${room.codigo}</strong>. Se ainda não tem conta, é só criar com seu nome e email.</p>
  </div></body></html>`;
  try {
    await enviarEmail({ to: email, subject: `${nome} convidou você para uma aventura no 4Ever`, text, html });
  } catch (e) {
    console.error('[convite] falha ao enviar:', e.message);
    throw new Error('Não foi possível enviar o convite agora. Tente de novo ou copie o link.');
  }
}

// --- Socket.IO ---------------------------------------------------------------
io.use((socket, next) => {
  const usuario = auth.validarSessao(socket.handshake.auth && socket.handshake.auth.token);
  if (!usuario) return next(new Error('nao_autenticado'));
  socket.data.userId = usuario.id;
  next();
});

function usuarioDo(socket) {
  const u = auth.getUsuario(socket.data.userId);
  if (!u) throw new Error('Sessão expirada. Entre de novo.');
  return u;
}

// Entra na sala do Socket.IO (e sai da anterior, se trocou de mesa).
function vincularSala(socket, codigo, { observando = false } = {}) {
  socket.data.observando = observando;
  if (socket.data.codigo && socket.data.codigo !== codigo) {
    socket.leave(socket.data.codigo);
    gameManager.disconnectSocket(socket.id, socket.data.codigo);
  }
  socket.data.codigo = codigo;
  socket.join(codigo);
  // Garante que esta conexão receba o log a partir do ponto já transmitido.
  if (!logEnviado.has(codigo)) logEnviado.set(codigo, gameManager.getRoom(codigo).logPublico.length);
}

function handler(fn) {
  return async (payload, cb) => {
    const responder = typeof cb === 'function' ? cb : () => {};
    try {
      responder({ ok: true, ...((await fn(payload || {})) || {}) });
    } catch (e) {
      responder({ ok: false, erro: e.message });
    }
  };
}

// Observador (admin): fica na sala do Socket.IO e recebe tudo o que a mesa recebe,
// mas não é jogador — ninguém vê que ele está lá e nenhuma ação é aceita.
const EVENTOS_OBSERVADOR = new Set(['observarJogo', 'entrarJogo', 'criarJogo', 'sairDaSala', 'pedirLog', 'adminEncerrar', 'adminApagar']);

io.on('connection', (socket) => {
  const eu = () => usuarioDo(socket);
  socket.use(([evento, ...args], next) => {
    if (!socket.data.observando || EVENTOS_OBSERVADOR.has(evento)) return next();
    const cb = args[args.length - 1];
    if (typeof cb === 'function') cb({ ok: false, erro: 'Você está só observando esta mesa.' });
  });
  const codigoAtual = (p) => String((p && p.codigo) || socket.data.codigo || '').toUpperCase();

  function estadoInicial(room, jogador) {
    return { state: gameManager.roomPublicState(room, { comLog: true }), meuId: jogador.id };
  }

  socket.on('criarJogo', handler(({ aventuraId, tema, publica, bots }) => {
    let temaFinal = tema || '';
    let aventuraTitulo = null;
    if (aventuraId) {
      const aventura = getAdventureById(aventuraId);
      if (!aventura) throw new Error('Aventura não encontrada.');
      temaFinal = aventura.premissa;
      aventuraTitulo = aventura.titulo;
    }
    const aventura = aventuraId ? getAdventureById(aventuraId) : null;
    const room = gameManager.createRoom({
      usuario: eu(), socketId: socket.id, tema: temaFinal, aventuraTitulo, publica, bots,
      missao: aventura ? aventura.missao : null,
      ambiente: aventura ? aventura.ambiente : null,
    });
    vincularSala(socket, room.codigo);
    return estadoInicial(room, room.personagens[0]);
  }));

  // Entrar numa mesa (ou voltar para ela — a conta é a identidade do jogador).
  socket.on('entrarJogo', handler(({ codigo }) => {
    const { room, jogador } = gameManager.joinRoom({ codigo, usuario: eu(), socketId: socket.id });
    vincularSala(socket, room.codigo);
    return estadoInicial(room, jogador);
  }));

  // Admin observando uma mesa (mesmo privada), sem entrar como jogador.
  socket.on('observarJogo', handler(({ codigo }) => {
    if (!auth.ehAdmin(eu())) throw new Error('Só administradores podem observar mesas.');
    const room = gameManager.getRoom(codigo);
    if (!room) throw new Error('Jogo não encontrado.');
    vincularSala(socket, room.codigo, { observando: true });
    return { state: gameManager.roomPublicState(room, { comLog: true }), meuId: null, observando: true };
  }));

  // Admin: encerrar (com epílogo do Mestre) ou apagar de vez qualquer mesa.
  socket.on('adminEncerrar', handler(async ({ codigo }) => {
    if (!auth.ehAdmin(eu())) throw new Error('Só administradores.');
    await gameManager.encerrarPeloAdmin(codigo);
  }));
  socket.on('adminApagar', handler(({ codigo }) => {
    if (!auth.ehAdmin(eu())) throw new Error('Só administradores.');
    const cod = gameManager.apagarSalaPeloAdmin(codigo);
    io.to(cod).emit('mesaApagada', { codigo: cod });
    io.in(cod).socketsLeave(cod);
    logEnviado.delete(cod);
  }));

  socket.on('sairDaSala', handler(() => {
    socket.data.observando = false;
    if (socket.data.codigo) {
      socket.leave(socket.data.codigo);
      gameManager.disconnectSocket(socket.id, socket.data.codigo);
      socket.data.codigo = null;
    }
  }));

  socket.on('pedirLog', handler((p) => {
    const room = gameManager.getRoom(codigoAtual(p));
    const observa = socket.data.observando && socket.data.codigo === (room && room.codigo);
    if (!room || !(observa || gameManager.jogadorDoUsuario(room, socket.data.userId))) throw new Error('Jogo não encontrado.');
    return { state: gameManager.roomPublicState(room, { comLog: true }) };
  }));

  socket.on('escolherPersonagem', handler((p) => {
    gameManager.setCharacter({ codigo: codigoAtual(p), userId: socket.data.userId, dados: p.personagem });
  }));

  socket.on('iniciarAventura', handler((p) => gameManager.startAdventure({ codigo: codigoAtual(p), userId: socket.data.userId })));

  socket.on('acaoJogador', handler((p) =>
    gameManager.sendPlayerAction({
      codigo: codigoAtual(p),
      userId: socket.data.userId,
      texto: p.texto,
      habilidadeId: p.habilidadeId,
      itemUid: p.itemUid,
      alvoId: p.alvoId,
      descansar: p.descansar === true,
      armaUid: p.armaUid,
    })
  ));

  socket.on('configurarSala', handler((p) => gameManager.configurarSala({ codigo: codigoAtual(p), userId: socket.data.userId, ajustes: p.ajustes })));

  // Convite por email: manda o link da mesa (limite de 10 por hora por pessoa e mesa).
  socket.on('convidarPorEmail', handler(async (p) => {
    const room = gameManager.getRoom(codigoAtual(p));
    if (!room) throw new Error('Jogo não encontrado.');
    if (!gameManager.jogadorDoUsuario(room, socket.data.userId)) throw new Error('Você não está nesta mesa.');
    const email = String(p.email || '').trim().toLowerCase();
    if (!/^[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}$/.test(email) || email.length > 120) throw new Error('Informe um email válido.');
    const chave = `${room.codigo}:${socket.data.userId}`;
    const envios = (convitesEnviados.get(chave) || []).filter((t) => Date.now() - t < 60 * 60 * 1000);
    if (envios.length >= 10) throw new Error('Limite de 10 convites por hora atingido. Compartilhe o link diretamente.');
    convitesEnviados.set(chave, [...envios, Date.now()]);
    await enviarConvite({ room, quem: auth.getUsuario(socket.data.userId), email });
    return { enviado: true };
  }));

  socket.on('concluirEtapa', handler((p) => gameManager.concluirEtapaPeloAnfitriao({ codigo: codigoAtual(p), userId: socket.data.userId })));
  socket.on('procurar', handler((p) => gameManager.procurar({ codigo: codigoAtual(p), userId: socket.data.userId, buscavelId: p.buscavelId })));
  socket.on('darItem', handler((p) => gameManager.darItem({ codigo: codigoAtual(p), userId: socket.data.userId, uid: p.uid, alvoId: p.alvoId })));
  socket.on('descartarItem', handler((p) => gameManager.descartarItem({ codigo: codigoAtual(p), userId: socket.data.userId, uid: p.uid })));
  socket.on('mudarCor', handler((p) => gameManager.mudarCor({ codigo: codigoAtual(p), userId: socket.data.userId, cor: p.cor })));

  socket.on('equiparItem', handler((p) => gameManager.equiparItem({ codigo: codigoAtual(p), userId: socket.data.userId, uid: p.uid })));

  socket.on('rolarDado', handler(async (p) => ({
    rollResult: await gameManager.sendRollResult({ codigo: codigoAtual(p), userId: socket.data.userId }),
  })));

  socket.on('desistirTeste', handler((p) => gameManager.desistirTeste({ codigo: codigoAtual(p), userId: socket.data.userId })));

  socket.on('passarVez', handler((p) => gameManager.passarVez({ codigo: codigoAtual(p), userId: socket.data.userId })));

  socket.on('voltei', handler((p) => {
    gameManager.confirmarVolta({ codigo: codigoAtual(p), userId: socket.data.userId });
  }));

  socket.on('fecharDado', handler((p) => gameManager.fecharDado({ codigo: codigoAtual(p), userId: socket.data.userId })));

  socket.on('atividade', (p) => gameManager.registrarAtividade({ codigo: codigoAtual(p), userId: socket.data.userId }));

  socket.on('encerrarAventura', handler((p) => gameManager.encerrarAventura({ codigo: codigoAtual(p), userId: socket.data.userId })));

  // --- Bate-papo de texto (geral e privado, não entra no histórico da IA) ---
  function remetente(p) {
    const room = gameManager.getRoom(codigoAtual(p));
    if (!room) throw new Error('Jogo não encontrado.');
    const jogador = gameManager.jogadorDoUsuario(room, socket.data.userId);
    if (!jogador) throw new Error('Jogador não encontrado.');
    return { room, autor: jogador.personagem ? jogador.personagem.nome : jogador.nome };
  }

  socket.on('chatTexto', handler((p) => {
    const { room, autor } = remetente(p);
    if (!p.destino) {
      const msg = gameManager.addChatGeral(room, autor, p.texto);
      io.to(room.codigo).emit('chatMensagem', { ...msg, tipo: 'texto', escopo: 'geral' });
      return;
    }
    const destinoSocketId = gameManager.resolvePlayerSocket(room, p.destino);
    if (!destinoSocketId) throw new Error('Jogador de destino não encontrado ou offline.');
    const msg = { autor, tipo: 'texto', texto: String(p.texto || '').slice(0, 500), ts: Date.now(), escopo: 'privado', para: String(p.destino).slice(0, 40) };
    io.to(destinoSocketId).emit('chatMensagem', msg);
    if (destinoSocketId !== socket.id) socket.emit('chatMensagem', msg);
  }));

  // --- Mensagens de voz estilo WhatsApp ---
  socket.on('chatAudio', handler((p) => {
    const { room, autor } = remetente(p);
    if (room.config && room.config.audioChat === false) throw new Error('O anfitrião deixou o bate-papo só com texto.');
    const dados = p.dados;
    if (!dados || !(dados instanceof Buffer || dados instanceof ArrayBuffer) || dados.byteLength > 3 * 1024 * 1024) {
      throw new Error('Áudio inválido ou grande demais (máx. ~3MB, grave uma mensagem mais curta).');
    }
    const mime = /^audio\/[\w.+-]+(;\s*codecs=[\w.,-]+)?$/i.test(p.mime || '') ? p.mime : 'audio/webm';
    const base = { autor, tipo: 'audio', mime, duracao: Number(p.duracao) || 0, dados, ts: Date.now() };
    if (!p.destino) {
      io.to(room.codigo).emit('chatMensagem', { ...base, escopo: 'geral' });
      return;
    }
    const destinoSocketId = gameManager.resolvePlayerSocket(room, p.destino);
    if (!destinoSocketId) throw new Error('Jogador de destino não encontrado ou offline.');
    const msg = { ...base, escopo: 'privado', para: String(p.destino).slice(0, 40) };
    io.to(destinoSocketId).emit('chatMensagem', msg);
    if (destinoSocketId !== socket.id) socket.emit('chatMensagem', msg);
  }));

  socket.on('disconnect', () => gameManager.disconnectSocket(socket.id));
});

for (const sinal of ['SIGINT', 'SIGTERM']) {
  process.on(sinal, () => {
    storage.descarregarTudo();
    process.exit(0);
  });
}

const PORT = process.env.PORT || 3000;
// HOST=127.0.0.1 em produção (atrás do proxy do Apache); padrão: todas as interfaces.
const HOST = process.env.HOST || undefined;
server.listen(PORT, HOST, () => {
  console.log(`4EverRPG rodando em http://${HOST || 'localhost'}:${PORT}`);
});
