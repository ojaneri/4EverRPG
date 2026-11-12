'use strict';

require('dotenv').config();
const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const gameManager = require('./src/gameManager');
const {
  CLASSES,
  ATTRIBUTES,
  ATTRIBUTE_LABELS,
  POINT_BUY,
  rollCheck,
} = require('./src/characterSystem');
const { ADVENTURES, getAdventureById } = require('./src/adventures');
const tts = require('./src/tts');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.get('/api/config', (req, res) => {
  res.json({ CLASSES, ATTRIBUTES, ATTRIBUTE_LABELS, POINT_BUY, ADVENTURES, ttsDisponivel: tts.disponivel() });
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
    res.set('Cache-Control', 'private, max-age=3600');
    res.send(audio);
  } catch (e) {
    console.error('[tts]', e.message);
    res.status(502).json({ erro: e.message });
  }
});

io.on('connection', (socket) => {
  socket.on('criarJogo', ({ nome, aventuraId, tema }, cb) => {
    try {
      let temaFinal = tema || '';
      let aventuraTitulo = null;
      if (aventuraId) {
        const aventura = getAdventureById(aventuraId);
        if (!aventura) throw new Error('Aventura não encontrada.');
        temaFinal = aventura.premissa;
        aventuraTitulo = aventura.titulo;
      }
      const room = gameManager.createRoom({
        hostSocketId: socket.id,
        hostName: nome,
        tema: temaFinal,
        aventuraTitulo,
      });
      socket.join(room.codigo);
      cb({ ok: true, state: gameManager.roomPublicState(room), souHost: true });
    } catch (e) {
      cb({ ok: false, erro: e.message });
    }
  });

  socket.on('entrarJogo', ({ codigo, nome }, cb) => {
    try {
      const room = gameManager.joinRoom({ codigo, socketId: socket.id, nome });
      socket.join(room.codigo);
      cb({ ok: true, state: gameManager.roomPublicState(room), souHost: false });
      io.to(room.codigo).emit('estadoAtualizado', gameManager.roomPublicState(room));
    } catch (e) {
      cb({ ok: false, erro: e.message });
    }
  });

  socket.on('escolherPersonagem', ({ codigo, personagem }, cb) => {
    try {
      const room = gameManager.setCharacter(codigo, socket.id, personagem);
      cb({ ok: true, state: gameManager.roomPublicState(room) });
      io.to(room.codigo).emit('estadoAtualizado', gameManager.roomPublicState(room));
    } catch (e) {
      cb({ ok: false, erro: e.message });
    }
  });

  socket.on('iniciarAventura', async ({ codigo }, cb) => {
    try {
      io.to(codigo).emit('mestreDigitando', true);
      await gameManager.startAdventure(codigo);
      const room = gameManager.getRoom(codigo);
      io.to(codigo).emit('mestreDigitando', false);
      io.to(codigo).emit('estadoAtualizado', gameManager.roomPublicState(room));
      cb({ ok: true });
    } catch (e) {
      io.to(codigo).emit('mestreDigitando', false);
      cb({ ok: false, erro: e.message });
    }
  });

  socket.on('acaoJogador', async ({ codigo, texto }, cb) => {
    try {
      gameManager.validarAcao({ codigo, socketId: socket.id });
      const roomAntes = gameManager.getRoom(codigo);
      io.to(codigo).emit('mestreDigitando', true);
      // Mostra a ação do jogador para todos já, antes da resposta da IA.
      const promessa = gameManager.sendPlayerAction({ codigo, socketId: socket.id, texto });
      io.to(codigo).emit('estadoAtualizado', gameManager.roomPublicState(roomAntes));
      await promessa;
      const room = gameManager.getRoom(codigo);
      io.to(codigo).emit('estadoAtualizado', gameManager.roomPublicState(room));
      cb({ ok: true });
    } catch (e) {
      const room = gameManager.getRoom(codigo);
      if (room) io.to(codigo).emit('estadoAtualizado', gameManager.roomPublicState(room));
      cb({ ok: false, erro: e.message });
    } finally {
      io.to(codigo).emit('mestreDigitando', false);
    }
  });

  socket.on('rolarDado', async ({ codigo, atributo }, cb) => {
    try {
      const room = gameManager.getRoom(codigo);
      if (!room) throw new Error('Jogo não encontrado.');
      const jogador = room.personagens.find((p) => p.socketId === socket.id);
      if (!jogador || !jogador.personagem) throw new Error('Escolha um personagem antes de rolar.');

      const rollResult = rollCheck(jogador.personagem, atributo);
      io.to(codigo).emit('mestreDigitando', true);
      await gameManager.sendRollResult({ codigo, socketId: socket.id, rollResult });
      const roomAfter = gameManager.getRoom(codigo);
      io.to(codigo).emit('estadoAtualizado', gameManager.roomPublicState(roomAfter));
      cb({ ok: true, rollResult });
    } catch (e) {
      cb({ ok: false, erro: e.message });
    } finally {
      io.to(codigo).emit('mestreDigitando', false);
    }
  });

  // --- Bate-papo de texto (geral e privado, não entra no histórico da IA) ---
  socket.on('chatTexto', ({ codigo, destino, texto }, cb) => {
    try {
      const room = gameManager.getRoom(codigo);
      if (!room) throw new Error('Jogo não encontrado.');
      const remetente = room.personagens.find((p) => p.socketId === socket.id);
      if (!remetente) throw new Error('Jogador não encontrado.');
      const autor = remetente.personagem ? remetente.personagem.nome : remetente.nome;

      if (!destino) {
        const msg = gameManager.addChatGeral(room, autor, texto);
        io.to(codigo).emit('chatMensagem', { ...msg, tipo: 'texto', escopo: 'geral' });
      } else {
        const destinoSocketId = gameManager.resolvePlayerSocket(room, destino);
        if (!destinoSocketId) throw new Error('Jogador de destino não encontrado ou offline.');
        const msg = { autor, tipo: 'texto', texto: String(texto).slice(0, 500), ts: Date.now(), escopo: 'privado', para: destino };
        io.to(destinoSocketId).emit('chatMensagem', msg);
        if (destinoSocketId !== socket.id) socket.emit('chatMensagem', msg); // eco para o remetente
      }
      cb && cb({ ok: true });
    } catch (e) {
      cb && cb({ ok: false, erro: e.message });
    }
  });

  // --- Mensagens de voz estilo WhatsApp: grava, envia como anexo, toca sob demanda ---
  socket.on('chatAudio', ({ codigo, destino, dados, mime, duracao }, cb) => {
    try {
      const room = gameManager.getRoom(codigo);
      if (!room) throw new Error('Jogo não encontrado.');
      const remetente = room.personagens.find((p) => p.socketId === socket.id);
      if (!remetente) throw new Error('Jogador não encontrado.');
      const autor = remetente.personagem ? remetente.personagem.nome : remetente.nome;
      if (!dados || dados.byteLength > 3 * 1024 * 1024) {
        throw new Error('Áudio inválido ou grande demais (máx. ~3MB, grave uma mensagem mais curta).');
      }

      const base = { autor, tipo: 'audio', mime, duracao, dados, ts: Date.now() };

      if (!destino) {
        io.to(codigo).emit('chatMensagem', { ...base, escopo: 'geral' });
      } else {
        const destinoSocketId = gameManager.resolvePlayerSocket(room, destino);
        if (!destinoSocketId) throw new Error('Jogador de destino não encontrado ou offline.');
        const msg = { ...base, escopo: 'privado', para: destino };
        io.to(destinoSocketId).emit('chatMensagem', msg);
        if (destinoSocketId !== socket.id) socket.emit('chatMensagem', msg);
      }
      cb && cb({ ok: true });
    } catch (e) {
      cb && cb({ ok: false, erro: e.message });
    }
  });

  socket.on('disconnect', () => {
    const info = gameManager.disconnectPlayer(socket.id);
    if (info) {
      io.to(info.room.codigo).emit('estadoAtualizado', gameManager.roomPublicState(info.room));
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`4EverRPG rodando em http://localhost:${PORT}`);
});
