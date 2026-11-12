'use strict';
// Teste de fumaça: simula 2 jogadores criando uma sala, escolhendo personagem,
// iniciando a aventura e verificando o sistema de turnos e a narração (TTS),
// contra um servidor já rodando.
// Uso: node tools/smoke_test.js [url]   (ex: http://localhost:3000/)

const { io } = require('socket.io-client');

const URL_BASE = (process.argv[2] || 'http://localhost:3000/').replace(/\/?$/, '/');
const u = new URL(URL_BASE);

function conectar() {
  return io(u.origin, { path: u.pathname + 'socket.io', transports: ['websocket'], reconnection: false });
}

function emitP(socket, evento, payload, timeoutMs = 90000) {
  return new Promise((resolve, reject) => {
    socket.timeout(timeoutMs).emit(evento, payload, (err, resp) => (err ? reject(err) : resolve(resp)));
  });
}

const personagemTeste = (nome) => ({
  nome,
  classeId: 'guerreiro',
  atributos: { forca: 14, agilidade: 10, mente: 10, espirito: 10 },
  historia: 'Teste automatizado.',
  avatarVariant: 1,
});

let ultimoEstado = null;

async function main() {
  console.log(`Conectando em ${URL_BASE} ...`);
  const host = conectar();
  const convidado = conectar();
  host.on('estadoAtualizado', (s) => (ultimoEstado = s));
  await Promise.all([new Promise((r) => host.on('connect', r)), new Promise((r) => convidado.on('connect', r))]);

  const criar = await emitP(host, 'criarJogo', { nome: 'Host', aventuraId: 'sombras-de-corvile' });
  if (!criar.ok) throw new Error('criarJogo: ' + criar.erro);
  const codigo = criar.state.codigo;
  console.log('Sala criada:', codigo);

  const entrar = await emitP(convidado, 'entrarJogo', { codigo, nome: 'Convidado' });
  if (!entrar.ok) throw new Error('entrarJogo: ' + entrar.erro);

  for (const [s, nome] of [[host, 'Thalrik'], [convidado, 'Miriel']]) {
    const r = await emitP(s, 'escolherPersonagem', { codigo, personagem: personagemTeste(nome) });
    if (!r.ok) throw new Error('escolherPersonagem: ' + r.erro);
  }

  console.log('Iniciando aventura (chamada real à IA)...');
  const inicio = await emitP(host, 'iniciarAventura', { codigo });
  if (!inicio.ok) throw new Error('iniciarAventura: ' + inicio.erro);
  await new Promise((r) => setTimeout(r, 300));
  console.log('✅ Aventura iniciada. Turno de:', ultimoEstado.turnoAtual);
  if (ultimoEstado.turnoAtual !== 'Thalrik') throw new Error('Esperava turno de Thalrik');

  // Fora da vez: deve ser recusado.
  const foraDaVez = await emitP(convidado, 'acaoJogador', { codigo, texto: 'Eu ataco tudo!' });
  if (foraDaVez.ok) throw new Error('Ação fora da vez foi aceita!');
  console.log('✅ Ação fora da vez recusada:', foraDaVez.erro);

  // Na vez: aceita e passa o turno (se não houver teste pendente).
  const naVez = await emitP(host, 'acaoJogador', { codigo, texto: 'Eu observo o vilarejo com atenção.' });
  if (!naVez.ok) throw new Error('Ação na vez falhou: ' + naVez.erro);
  await new Promise((r) => setTimeout(r, 300));
  console.log('✅ Ação aceita. Turno agora:', ultimoEstado.turnoAtual, '| teste pendente:', JSON.stringify(ultimoEstado.pendingTest));

  // TTS da primeira fala do Mestre.
  const idxMestre = ultimoEstado.log.findIndex((m) => m.tipo === 'mestre');
  const res = await fetch(`${URL_BASE}api/tts?codigo=${codigo}&idx=${idxMestre}`);
  const buf = Buffer.from(await res.arrayBuffer());
  console.log(`${res.ok ? '✅' : '⚠️'} TTS: HTTP ${res.status}, ${res.headers.get('content-type')}, ${buf.length} bytes`);

  host.disconnect();
  convidado.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error('\n❌ ERRO no teste:', e.message || e);
  process.exit(1);
});
