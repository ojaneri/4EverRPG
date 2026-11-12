'use strict';
// Teste de fumaça: simula 2 jogadores criando uma sala, escolhendo personagem
// e iniciando a aventura, contra um servidor já rodando em localhost.
// Uso: node tools/smoke_test.js [url]

const { io } = require('socket.io-client');

const URL = process.argv[2] || 'http://localhost:3000';

function conectar() {
  return io(URL, { transports: ['websocket'], reconnection: false });
}

function emitP(socket, evento, payload) {
  return new Promise((resolve, reject) => {
    socket.timeout(15000).emit(evento, payload, (err, resp) => {
      if (err) return reject(err);
      resolve(resp);
    });
  });
}

const personagemTeste = (nome) => ({
  nome,
  classeId: 'guerreiro',
  atributos: { forca: 14, agilidade: 10, mente: 10, espirito: 10 },
  historia: 'Teste automatizado.',
  avatarVariant: 1,
});

async function main() {
  console.log(`Conectando em ${URL} ...`);
  const host = conectar();
  const convidado = conectar();

  await Promise.all([
    new Promise((r) => host.on('connect', r)),
    new Promise((r) => convidado.on('connect', r)),
  ]);
  console.log('Ambos conectados.');

  const criar = await emitP(host, 'criarJogo', { nome: 'Host', tema: 'Teste automatizado' });
  if (!criar.ok) throw new Error('criarJogo falhou: ' + criar.erro);
  const codigo = criar.state.codigo;
  console.log('Sala criada:', codigo);

  const entrar = await emitP(convidado, 'entrarJogo', { codigo, nome: 'Convidado' });
  if (!entrar.ok) throw new Error('entrarJogo falhou: ' + entrar.erro);
  console.log('Convidado entrou.');

  const p1 = await emitP(host, 'escolherPersonagem', { codigo, personagem: personagemTeste('Thalrik') });
  if (!p1.ok) throw new Error('escolherPersonagem (host) falhou: ' + p1.erro);

  const p2 = await emitP(convidado, 'escolherPersonagem', { codigo, personagem: personagemTeste('Miriel') });
  if (!p2.ok) throw new Error('escolherPersonagem (convidado) falhou: ' + p2.erro);

  console.log('Personagens prontos. Iniciando aventura (isso chama a IA Mestre de verdade)...');
  const inicio = await emitP(host, 'iniciarAventura', { codigo });
  if (!inicio.ok) {
    console.error('\n❌ FALHA ao iniciar aventura:', inicio.erro);
    process.exit(1);
  }
  console.log('\n✅ Aventura iniciada com sucesso!');

  host.disconnect();
  convidado.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error('\n❌ ERRO no teste:', e.message || e);
  process.exit(1);
});
