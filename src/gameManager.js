'use strict';

const { customAlphabet } = require('nanoid');
const { createCharacter } = require('./characterSystem');
const { callMaster } = require('./aiMaster');

// Alfabeto sem caracteres ambíguos (sem 0/O, 1/I, etc.)
const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 5);

const rooms = new Map(); // codigo -> room

function createRoom({ hostSocketId, hostName, tema, aventuraTitulo }) {
  let codigo;
  do {
    codigo = nanoid();
  } while (rooms.has(codigo));

  const room = {
    codigo,
    tema: (tema || '').slice(0, 2000),
    aventuraTitulo: aventuraTitulo || null,
    hostSocketId,
    status: 'lobby', // lobby | em_jogo
    personagens: [], // { socketId, nome, personagem, conectado }
    historico: [], // mensagens no formato da Messages API: {role, content}
    logPublico: [], // log amigável para exibir no chat: {autor, tipo, texto, ts}
    chatGeral: [], // bate-papo OOC entre jogadores (não vai para a IA): {autor, texto, ts}
    pendingTest: null, // { nomePersonagem, atributo, dificuldade }
    cena: null, // { local, descricao, clima } — para o painel de cena
    criadoEm: Date.now(),
  };

  room.personagens.push({ socketId: hostSocketId, nome: hostName, personagem: null, conectado: true });
  rooms.set(codigo, room);
  return room;
}

function getRoom(codigo) {
  return rooms.get((codigo || '').toUpperCase());
}

function joinRoom({ codigo, socketId, nome }) {
  const room = getRoom(codigo);
  if (!room) throw new Error('Código de jogo não encontrado.');

  const existente = room.personagens.find((p) => p.nome === nome && !p.conectado);
  if (existente) {
    existente.socketId = socketId;
    existente.conectado = true;
    return room;
  }

  room.personagens.push({ socketId, nome, personagem: null, conectado: true });
  return room;
}

function disconnectPlayer(socketId) {
  for (const room of rooms.values()) {
    const p = room.personagens.find((p) => p.socketId === socketId);
    if (p) {
      p.conectado = false;
      return { room, nome: p.personagem ? p.personagem.nome : p.nome };
    }
  }
  return null;
}

// Resolve o socketId atual de um jogador pelo nome (do jogador ou do personagem).
function resolvePlayerSocket(room, nome) {
  const p = room.personagens.find(
    (p) => p.conectado && (p.nome === nome || (p.personagem && p.personagem.nome === nome))
  );
  return p ? p.socketId : null;
}

function addChatGeral(room, autor, texto) {
  const msg = { autor, texto: String(texto).slice(0, 500), ts: Date.now() };
  room.chatGeral.push(msg);
  if (room.chatGeral.length > 200) room.chatGeral.shift();
  return msg;
}

function setCharacter(codigo, socketId, dadosPersonagem) {
  const room = getRoom(codigo);
  if (!room) throw new Error('Jogo não encontrado.');
  const jogador = room.personagens.find((p) => p.socketId === socketId);
  if (!jogador) throw new Error('Jogador não encontrado na sala.');
  jogador.personagem = createCharacter(dadosPersonagem);
  return room;
}

function allReady(room) {
  return room.personagens.length > 0 && room.personagens.every((p) => p.personagem);
}

function normalizeAttr(s) {
  const map = {
    força: 'forca',
    forca: 'forca',
    agilidade: 'agilidade',
    mente: 'mente',
    espírito: 'espirito',
    espirito: 'espirito',
  };
  return map[(s || '').toLowerCase()] || (s || '').toLowerCase();
}

const RE_TESTE = /\[TESTE:\s*([^|]+)\|\s*([a-zçã]+)\s*\|\s*([a-zçã_]+)\]/i;
const RE_CENA = /\[CENA:\s*([^|]+)\|\s*([^|]+)\|\s*([a-zçã_]+)\]/i;

function detectPendingTest(room, texto) {
  const m = texto.match(RE_TESTE);
  if (m) {
    room.pendingTest = {
      nomePersonagem: m[1].trim(),
      atributo: normalizeAttr(m[2].trim()),
      dificuldade: m[3].trim().toLowerCase(),
    };
  } else {
    room.pendingTest = null;
  }
}

function detectCena(room, texto) {
  const m = texto.match(RE_CENA);
  if (m) {
    room.cena = {
      local: m[1].trim().slice(0, 60),
      descricao: m[2].trim().slice(0, 160),
      clima: m[3].trim().toLowerCase(),
    };
  }
  // Se não houver tag nesta mensagem, mantém a última cena conhecida (não reseta).
}

// Remove as tags de controle ([TESTE: ...], [CENA: ...]) do texto antes de
// mostrar a narração para os jogadores — elas são só sinalização interna.
function limparTags(texto) {
  return texto.replace(RE_TESTE, '').replace(RE_CENA, '').trim();
}

async function startAdventure(codigo) {
  const room = getRoom(codigo);
  if (!room) throw new Error('Jogo não encontrado.');
  if (!allReady(room)) throw new Error('Nem todos os jogadores escolheram um personagem ainda.');

  room.status = 'em_jogo';
  const abertura =
    'Inicie a aventura agora: descreva a cena de abertura, o local onde o grupo se encontra e um gancho inicial que os convide a agir. Termine perguntando o que o grupo deseja fazer.';
  room.historico.push({ role: 'user', content: abertura });

  const resposta = await callMaster({ room, history: room.historico });
  room.historico.push({ role: 'assistant', content: resposta });
  room.logPublico.push({ autor: 'Mestre', tipo: 'mestre', texto: limparTags(resposta), ts: Date.now() });
  detectPendingTest(room, resposta);
  detectCena(room, resposta);
  return resposta;
}

async function sendPlayerAction({ codigo, socketId, texto }) {
  const room = getRoom(codigo);
  if (!room) throw new Error('Jogo não encontrado.');
  const jogador = room.personagens.find((p) => p.socketId === socketId);
  if (!jogador) throw new Error('Jogador não encontrado.');

  const nomeExibicao = jogador.personagem ? jogador.personagem.nome : jogador.nome;
  room.logPublico.push({ autor: nomeExibicao, tipo: 'jogador', texto, ts: Date.now() });
  room.historico.push({ role: 'user', content: `${nomeExibicao}: ${texto}` });

  const resposta = await callMaster({ room, history: room.historico });
  room.historico.push({ role: 'assistant', content: resposta });
  room.logPublico.push({ autor: 'Mestre', tipo: 'mestre', texto: limparTags(resposta), ts: Date.now() });
  detectPendingTest(room, resposta);
  detectCena(room, resposta);
  return resposta;
}

async function sendRollResult({ codigo, socketId, rollResult }) {
  const room = getRoom(codigo);
  if (!room) throw new Error('Jogo não encontrado.');
  const jogador = room.personagens.find((p) => p.socketId === socketId);
  const nomeExibicao = (jogador && jogador.personagem && jogador.personagem.nome) || (jogador && jogador.nome) || 'Jogador';

  const texto = `[Resultado do teste de ${nomeExibicao}: dado ${rollResult.die} + modificador ${rollResult.mod} = total ${rollResult.total} (${rollResult.resultado.replace('_', ' ')})]`;
  room.logPublico.push({ autor: 'Sistema', tipo: 'sistema', texto, ts: Date.now() });
  room.historico.push({ role: 'user', content: texto });
  room.pendingTest = null;

  const resposta = await callMaster({ room, history: room.historico });
  room.historico.push({ role: 'assistant', content: resposta });
  room.logPublico.push({ autor: 'Mestre', tipo: 'mestre', texto: limparTags(resposta), ts: Date.now() });
  detectPendingTest(room, resposta);
  detectCena(room, resposta);
  return resposta;
}

function roomPublicState(room) {
  return {
    codigo: room.codigo,
    tema: room.tema,
    aventuraTitulo: room.aventuraTitulo,
    status: room.status,
    pendingTest: room.pendingTest,
    cena: room.cena,
    personagens: room.personagens.map((p) => ({
      nome: p.nome,
      conectado: p.conectado,
      personagem: p.personagem,
    })),
    log: room.logPublico,
    chatGeral: room.chatGeral,
  };
}

module.exports = {
  createRoom,
  getRoom,
  joinRoom,
  disconnectPlayer,
  resolvePlayerSocket,
  addChatGeral,
  setCharacter,
  allReady,
  startAdventure,
  sendPlayerAction,
  sendRollResult,
  roomPublicState,
};
