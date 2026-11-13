'use strict';

// ---------------------------------------------------------------------------
// 4EverRPG — Salas, turnos e regras da mesa
//
// Toda mudança de estado chama `tocar(room)`, que agenda a gravação em disco e
// emite `eventos.on('mudou', room)` — o server.js escuta e transmite às mesas.
// ---------------------------------------------------------------------------

const EventEmitter = require('events');
const { customAlphabet } = require('nanoid');
const {
  createCharacter,
  rollCheck,
  getHabilidade,
  aplicarXp,
  ATTRIBUTES,
  ATTRIBUTE_LABELS,
  DIFFICULTIES,
  rollDie,
  ITENS,
  RARIDADES,
  MAX_EQUIPADOS,
  TABELAS_BUSCA,
  tipoDeBusca,
  sortearSaque,
  criarItem,
  itemPorNome,
  normalizarPersonagem,
  descricaoItem,
  equipados,
  armaEmpunhada,
  rolarDano,
  regenPorArtefatos,
  aplicarPassivo,
  CLASSES,
  HABILIDADES,
  CORES_PERSONAGEM,
  COR_PADRAO_CLASSE,
} = require('./characterSystem');
const { callMaster, resumirHistorico, criarPersonagemBot, decidirAcaoBot, comentarioBot, TRACOS_BOT } = require('./aiMaster');
const tts = require('./tts');
const storage = require('./storage');
const { MUSICAS, MUSICA_POR_CLIMA } = require('./musicas');
const imagens = require('./imagens');
const { getAmbiente } = require('./ambientes');

const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 5);
const novoIdJogador = customAlphabet('abcdefghijkmnpqrstuvwxyz23456789', 10);

const TEMPO_TURNO_MS = Number(process.env.RPG_TEMPO_TURNO_MS) || 60000;
// Teste de dado tem relógio próprio; o da vez fica pausado. Sem rolar a tempo = falha automática.
const TEMPO_DADO_MS = Number(process.env.RPG_TEMPO_DADO_MS) || 60000;
const FOLEGO_DIGITANDO_MS = 15000; // quem está digitando ganha pelo menos esse tempo
const MAX_PULOS = 3;
const PAUSA_DADO_MAX_MS = 45000; // modal do dado aberto: tempo da vez fica parado (no máximo isso)
const LIMITE_HISTORICO = 30; // acima disso, as mensagens antigas viram "diário"
const MANTER_HISTORICO = 12;
const INATIVIDADE_SALA_MS = 24 * 60 * 60 * 1000;
const MAX_LOG = 1500;

const eventos = new EventEmitter();
const rooms = new Map(); // codigo -> room (só dados serializáveis)
const timers = new Map(); // codigo -> timeout do turno
const resumindo = new Set(); // codigos com resumo em andamento

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
const semAcento = (s) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Tema da aventura personalizada: linhas que começam com # são dicas do modelo
// (public/modelo-aventura.txt) e não vão para o Mestre.
function limparTema(t) {
  return String(t || '')
    .split(/\r?\n/)
    .filter((l) => !/^\s*#/.test(l))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

function sanitizar(s, max) {
  return String(s || '').replace(/[\u0000-\u0009\u000b-\u001f<>]/g, '').trim().slice(0, max);
}

function tocar(room) {
  room.atualizadoEm = Date.now();
  if (room.logPublico.length > MAX_LOG) room.logPublico.splice(0, room.logPublico.length - MAX_LOG);
  storage.salvarSala(room);
  eventos.emit('mudou', room);
  agendarBot(room);
}

// efemero: aviso passageiro (conexão etc.) — some da tela em 3s e fica fora do diário.
function logSistema(room, texto, { efemero = false } = {}) {
  room.logPublico.push({ autor: 'Sistema', tipo: 'sistema', texto, ts: Date.now(), ...(efemero ? { efemero: true } : {}) });
}

function nomeExibicao(p) {
  return p.personagem ? p.personagem.nome : p.nome;
}

function getRoom(codigo) {
  return rooms.get(String(codigo || '').toUpperCase().trim());
}

function exigirSala(codigo) {
  const room = getRoom(codigo);
  if (!room) throw new Error('Jogo não encontrado.');
  return room;
}

function jogadorDoUsuario(room, userId) {
  return room.personagens.find((p) => p.userId === userId) || null;
}

function exigirJogador(room, userId) {
  const p = jogadorDoUsuario(room, userId);
  if (!p) throw new Error('Você não está nesta sala.');
  return p;
}

function jogadorPorNomePersonagem(room, nome) {
  const alvo = semAcento(nome);
  return (
    room.personagens.find((p) => p.personagem && semAcento(p.personagem.nome) === alvo) ||
    room.personagens.find((p) => semAcento(p.nome) === alvo) ||
    null
  );
}

// Nome único na sala (jogadores e personagens), sem diferenciar maiúsculas/acentos.
function nomeEmUso(room, nome, exceto) {
  const alvo = semAcento(nome);
  return room.personagens.some(
    (p) => p !== exceto && (semAcento(p.nome) === alvo || (p.personagem && semAcento(p.personagem.nome) === alvo))
  );
}

// Anfitrião efetivo: o criador; se ele estiver offline/afastado, o primeiro jogador ativo.
function hostEfetivo(room) {
  const dono = room.personagens.find((p) => p.userId === room.hostUserId);
  if (dono && dono.conectado && !dono.afastado) return dono;
  return room.personagens.find((p) => !p.bot && p.conectado && !p.afastado) || dono || null;
}

function exigirHost(room, userId) {
  const h = hostEfetivo(room);
  if (!h || h.userId !== userId) throw new Error('Só o anfitrião da mesa pode fazer isso.');
}

function ativo(p) {
  return p.conectado && !p.afastado && p.personagem && !p.personagem.morto;
}

// ---------------------------------------------------------------------------
// Queda e morte: com 0 PV o personagem cai e fica morrendo; sem socorro em
// RODADAS_PARA_MORRER rodadas, morre. Dano enquanto caído (ou um golpe que
// passa da vida máxima abaixo de zero) mata na hora.
// ---------------------------------------------------------------------------
const RODADAS_PARA_MORRER = 2;

function morrer(room, c, motivo) {
  if (c.morto) return;
  c.morto = true;
  c.caido = false;
  c.hp.atual = 0;
  delete c.ataquePendente;
  logSistema(room, `☠️ ${c.nome} morreu${motivo ? ` (${motivo})` : ''}. O jogador pode criar um novo personagem para voltar à aventura.`);
  room.notasPendentes.push(`${c.nome} MORREU (${motivo || 'morte'}). Narre a morte com peso e consequência; o personagem não volta.`);
  eventos.emit('aviso', room, { icone: '☠️', texto: `${c.nome} morreu` });
}

function cair(room, c) {
  c.caido = true;
  c.rodadasCaido = 0;
  logSistema(room, `💀 ${c.nome} caiu e está MORRENDO! Precisa ser curado em até ${RODADAS_PARA_MORRER} rodadas.`);
  room.notasPendentes.push(`${c.nome} caiu com 0 PV e está morrendo: se ninguém o curar em até ${RODADAS_PARA_MORRER} rodadas, morre.`);
}

function levantar(c) {
  if (!c.caido) return false;
  c.caido = false;
  c.rodadasCaido = 0;
  return true;
}

// ---------------------------------------------------------------------------
// Configurações da mesa (o anfitrião ajusta)
// ---------------------------------------------------------------------------
const OPCOES_TEMPO_TURNO = [30, 45, 60, 90, 120, 180, 300].map((s) => s * 1000);
const OPCOES_TEMPO_DADO = [30, 45, 60, 90, 120].map((s) => s * 1000);

// Humor do Mestre: 0 a 100 em cada eixo (50 = equilibrado).
const EIXOS_HUMOR = ['humor', 'benevolencia', 'temperamento', 'detalhe'];
const RODADAS_ENTRE_MUDANCAS_HUMOR = 2;

function configPadrao() {
  return {
    tempoTurnoMs: TEMPO_TURNO_MS,
    tempoDadoMs: TEMPO_DADO_MS,
    audioChat: true,
    imagens: true, // ilustrações de cenário (geradas pela IA; têm custo)
    musica: '',
    humor: { humor: 50, benevolencia: 50, temperamento: 50, detalhe: 50 },
    humorRodada: null, // rodada em que o humor mudou durante a aventura
  };
}

// Rodada a partir da qual o humor pode mudar de novo (null = já pode).
function humorLiberadoEm(room) {
  const c = cfg(room);
  if (room.status !== 'em_jogo' || c.humorRodada == null) return null;
  const libera = c.humorRodada + RODADAS_ENTRE_MUDANCAS_HUMOR;
  return (room.rodada || 1) >= libera ? null : libera;
}

// Completa a configuração com os padrões SEM trocar o objeto (quem já tem a
// referência continua alterando a configuração de verdade).
function cfg(room) {
  const padrao = configPadrao();
  if (!room.config) room.config = padrao;
  for (const [k, v] of Object.entries(padrao)) if (room.config[k] === undefined) room.config[k] = v;
  for (const [k, v] of Object.entries(padrao.humor)) if (room.config.humor[k] === undefined) room.config.humor[k] = v;
  return room.config;
}

function configurarSala({ codigo, userId, ajustes }) {
  const room = exigirSala(codigo);
  exigirHost(room, userId);
  const c = cfg(room);
  const a = ajustes || {};
  const mudancas = [];
  const seg = (ms) => (ms >= 60000 ? `${ms / 60000} min` : `${ms / 1000}s`);
  if (a.tempoTurnoMs !== undefined && a.tempoTurnoMs !== c.tempoTurnoMs) {
    if (!OPCOES_TEMPO_TURNO.includes(a.tempoTurnoMs)) throw new Error('Tempo de vez inválido.');
    c.tempoTurnoMs = a.tempoTurnoMs;
    mudancas.push(`tempo da vez ${seg(c.tempoTurnoMs)}`);
  }
  if (a.tempoDadoMs !== undefined && a.tempoDadoMs !== c.tempoDadoMs) {
    if (!OPCOES_TEMPO_DADO.includes(a.tempoDadoMs)) throw new Error('Tempo do dado inválido.');
    c.tempoDadoMs = a.tempoDadoMs;
    mudancas.push(`tempo do dado ${seg(c.tempoDadoMs)}`);
  }
  if (a.imagens !== undefined && !!a.imagens !== c.imagens) {
    c.imagens = !!a.imagens;
    mudancas.push(c.imagens ? 'imagens de cenário ligadas' : 'imagens de cenário desligadas');
  }
  if (a.audioChat !== undefined && !!a.audioChat !== c.audioChat) {
    c.audioChat = !!a.audioChat;
    mudancas.push(c.audioChat ? 'áudio no bate-papo liberado' : 'bate-papo só com texto');
  }
  // A música não é mais configurada: o Mestre escolhe conforme a cena.
  if (a.humor && typeof a.humor === 'object') {
    const novo = {};
    for (const eixo of EIXOS_HUMOR) {
      const v = Number(a.humor[eixo]);
      novo[eixo] = Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : c.humor[eixo];
    }
    if (EIXOS_HUMOR.some((e) => novo[e] !== c.humor[e])) {
      const libera = humorLiberadoEm(room);
      if (libera) throw new Error(`O humor do Mestre só pode mudar de novo na rodada ${libera} (2 rodadas completas depois da última mudança).`);
      c.humor = novo;
      if (room.status === 'em_jogo') c.humorRodada = room.rodada || 1;
      mudancas.push('humor do Mestre');
      room.notasPendentes.push('O anfitrião ajustou a personalidade do Mestre (veja PERSONALIDADE DO MESTRE): mude o tom a partir de agora, de forma natural.');
    }
  }
  if (mudancas.length) logSistema(room, `⚙️ O anfitrião ajustou a mesa: ${mudancas.join(' · ')}.`, { efemero: true });
  tocar(room);
}

// ---------------------------------------------------------------------------
// Salas
// ---------------------------------------------------------------------------
function createRoom({ usuario, socketId, tema, aventuraTitulo, publica, missao, ambiente, bots }) {
  let codigo;
  do codigo = nanoid();
  while (rooms.has(codigo));

  const room = {
    codigo,
    tema: sanitizar(limparTema(tema), 4000),
    aventuraTitulo: aventuraTitulo || null,
    ambiente: getAmbiente(ambiente).id, // figurino: fantasia (padrão) ou cyber
    publica: publica === true, // padrão: privado
    hostUserId: usuario.id,
    status: 'lobby', // lobby | em_jogo | encerrada
    personagens: [],
    historico: [], // mensagens enviadas à IA: {role, content}
    resumo: '', // diário condensado das mensagens antigas
    logPublico: [], // {autor, tipo, texto, ts}
    chatGeral: [],
    pendingTest: null, // { nomePersonagem, atributo, dificuldade, rolagem? }
    cena: null,
    turnoAtual: null, // nome de exibição de quem age agora
    turnoExpiraEm: null,
    sugestoes: [],
    // Missão: roteiros prontos já trazem; na personalizada o Mestre define na abertura.
    missao: missao ? novaMissao(missao.objetivo, missao.etapas, 'roteiro') : null,
    estatisticas: { inicio: null, fim: null, testes: 0, sucessos: 0, falhas: 0, criticos: 0, falhasCriticas: 0, itens: 0, moedas: 0 },
    resultado: null, // cumprida | falhou | interrompida
    config: configPadrao(),
    notasPendentes: [], // avisos do sistema a anexar na próxima mensagem à IA
    processando: false,
    criadoEm: Date.now(),
    atualizadoEm: Date.now(),
  };
  room.personagens.push(novoJogador(usuario, socketId));
  const nBots = Math.max(0, Math.min(3, Math.floor(Number(bots) || 0)));
  for (let i = 1; i <= nBots; i++) room.personagens.push(novoBot(room, i));
  rooms.set(codigo, room);
  tocar(room);
  if (nBots) criarPersonagensBots(room); // em segundo plano: a IA escolhe os personagens
  return room;
}

function novoJogador(usuario, socketId) {
  return {
    id: novoIdJogador(),
    userId: usuario.id,
    socketId,
    nome: usuario.nome,
    personagem: null,
    conectado: true,
    afastado: false,
    pulos: 0,
  };
}

// Entra na sala — ou volta para ela, se a conta já é jogadora desta mesa.
function joinRoom({ codigo, usuario, socketId }) {
  const room = getRoom(codigo);
  if (!room) throw new Error('Código de jogo não encontrado.');

  const existente = jogadorDoUsuario(room, usuario.id);
  if (existente) {
    existente.socketId = socketId;
    const voltou = !existente.conectado;
    existente.conectado = true;
    sincronizarBots(room);
    if (voltou && room.status === 'em_jogo' && existente.personagem) {
      logSistema(room, `${nomeExibicao(existente)} se reconectou.`, { efemero: true });
      garantirTurno(room);
    }
    tocar(room);
    return { room, jogador: existente };
  }

  if (room.status === 'encerrada') throw new Error('Esta aventura já foi encerrada.');
  if (room.personagens.length >= 8) throw new Error('Esta mesa já está cheia (máximo 8 jogadores).');
  if (nomeEmUso(room, usuario.nome)) {
    throw new Error(`Já existe alguém chamado "${usuario.nome}" nesta mesa. Mude seu nome em "Minha conta" e tente de novo.`);
  }
  const jogador = novoJogador(usuario, socketId);
  room.personagens.push(jogador);
  sincronizarBots(room);
  tocar(room);
  return { room, jogador };
}

// Marca o jogador como offline. Com `codigo`, só naquela mesa (troca de mesa na mesma aba).
function disconnectSocket(socketId, codigo) {
  for (const room of rooms.values()) {
    if (codigo && room.codigo !== codigo) continue;
    const p = room.personagens.find((x) => x.socketId === socketId);
    if (!p) continue;
    p.conectado = false;
    p.socketId = null;
    sincronizarBots(room);
    // Se era a vez dele, passa adiante (sem contar como pulo).
    const ator = atorAtual(room);
    if (room.status === 'em_jogo' && ator === p && !room.processando) {
      pularAtor(room, 'desconectou', false);
    }
    tocar(room);
  }
}

// ---------------------------------------------------------------------------
// Bots: jogadores controlados pela IA. O anfitrião escolhe 0 a 3 ao criar a
// mesa; a IA cria o personagem de cada um e decide as ações na vez deles.
// Só jogam enquanto houver pelo menos um humano conectado (sem gasto à toa).
// ---------------------------------------------------------------------------
const BOT_ESPERA_ACAO_MS = Number(process.env.RPG_BOT_ESPERA_MS) || 4000; // pausa para os humanos lerem
const BOT_ESPERA_DADO_MS = Number(process.env.RPG_BOT_ESPERA_DADO_MS) || 2500;
// Contado a partir da rolagem (não do fim da narração): o dado gira ~3 s na tela e fica uns segundos parado.
const BOT_FECHA_DADO_MS = Number(process.env.RPG_BOT_FECHA_DADO_MS) || 6000;
const botTimers = new Map(); // codigo -> { chave, t }
const botOcupado = new Set(); // codigos em que um bot está decidindo/agindo

function novoBot(room, n) {
  return {
    id: novoIdJogador(),
    userId: `bot:${room.codigo}:${n}`,
    socketId: null,
    nome: `Bot ${n}`,
    bot: true,
    botPersona: '',
    personagem: null,
    conectado: true,
    afastado: false,
    pulos: 0,
  };
}

const humanoOnline = (room) => room.personagens.some((p) => !p.bot && p.conectado);

// Bots ficam "conectados" só enquanto algum humano estiver na mesa.
function sincronizarBots(room) {
  const online = humanoOnline(room);
  for (const p of room.personagens) if (p.bot) p.conectado = online;
}

// Distribuição válida de atributos (6 pontos) favorecendo o atributo principal.
function atributosPadrao(classeId) {
  const principal = (CLASSES[classeId] || {}).atributoPrincipal || 'forca';
  const a = { forca: 10, agilidade: 10, mente: 10, espirito: 10 };
  a[principal] += 4;
  const segundo = ATTRIBUTES.find((x) => x !== principal && x !== 'forca') || 'espirito';
  a[segundo] += 2;
  return a;
}

const NOMES_RESERVA = ['Aurora', 'Bento', 'Cora', 'Davi', 'Elis', 'Faísca', 'Gaia', 'Heitor', 'Iara', 'Joca'];

async function criarPersonagensBots(room) {
  for (const bot of room.personagens.filter((p) => p.bot && !p.personagem)) {
    const amb = getAmbiente(room.ambiente);
    const classes = Object.keys(CLASSES).map((id) => ({
      id,
      nome: ((amb.classes || {})[id] || {}).nome || CLASSES[id].nome,
      descricao: ((amb.classes || {})[id] || {}).descricao || CLASSES[id].descricao,
    }));
    const usados = room.personagens.filter((p) => p.personagem);
    const classesOcupadas = usados.map((p) => p.personagem.classeId);
    let dados = null;
    try {
      dados = await criarPersonagemBot({
        tema: room.tema,
        aventuraTitulo: room.aventuraTitulo,
        ambiente: room.ambiente,
        classes,
        nomesOcupados: room.personagens.flatMap((p) => [p.nome, p.personagem && p.personagem.nome]).filter(Boolean),
        classesOcupadas: classesOcupadas.map((id) => classes.find((c) => c.id === id)?.nome || id),
        tracosOcupados: room.personagens.flatMap((p) => p.botTracos || []),
      });
    } catch (e) {
      console.warn(`[bot ${room.codigo}] IA não criou o personagem (${e.message}); usando um padrão.`);
    }
    if (!rooms.has(room.codigo) || bot.personagem) continue;
    const livre = Object.keys(CLASSES).find((id) => !classesOcupadas.includes(id)) || 'guerreiro';
    const classeId = dados && CLASSES[dados.classeId] ? dados.classeId : livre;
    let nome = sanitizar(dados && dados.nome, 20) || NOMES_RESERVA.find((n) => !nomeEmUso(room, n, bot)) || bot.nome;
    for (let k = 2; nomeEmUso(room, nome, bot); k++) nome = `${nome.replace(/ \d+$/, '')} ${k}`;
    const historia = sanitizar(dados && dados.historia, 300);
    let personagem;
    try {
      personagem = createCharacter({ nome, classeId, atributos: dados && dados.atributos, historia }, room.ambiente);
    } catch {
      personagem = createCharacter({ nome, classeId, atributos: atributosPadrao(classeId), historia }, room.ambiente);
    }
    bot.personagem = personagem;
    personagem.cor = escolherCor(room, bot, null);
    bot.botPersona = sanitizar(dados && dados.personalidade, 200);
    bot.botGenero = /^f/i.test(String((dados && dados.genero) || '')) ? 'feminino' : /^m/i.test(String((dados && dados.genero) || '')) ? 'masculino' : '';
    const deOutros = new Set(room.personagens.filter((p) => p !== bot).flatMap((p) => p.botTracos || []));
    bot.botTracos = tracosValidos(dados && dados.tracos).filter((t) => !deOutros.has(t)); // nada repetido entre bots
    garantirTracos(room, bot); // personalidade fixa: escolhida agora e mantida o jogo todo
    vozDoBot(room, bot); // a voz fica fixa: o mesmo bot sempre fala com a mesma voz
    vozReservaDoBot(room, bot);
    if (room.status === 'em_jogo') {
      logSistema(room, `🤖 ${personagem.nome} (${personagem.classeNome}, bot) entrou na aventura!`);
      room.notasPendentes.push(`${personagem.nome}, ${personagem.classeNome}, acabou de se juntar ao grupo — apresente-o na cena.`);
      garantirTurno(room);
    }
    tocar(room);
  }
}

// Agenda a jogada do bot quando é a vez dele (chamada a cada mudança da mesa).
function agendarBot(room) {
  if (!room || botOcupado.has(room.codigo)) return;
  const ator = room.status === 'em_jogo' && !room.processando && !room.pausaDado ? atorAtual(room) : null;
  const precisa = ator && ator.bot && ativo(ator) && humanoOnline(room) && !(room.pendingTest && room.pendingTest.rolagem);
  const atual = botTimers.get(room.codigo);
  if (!precisa) {
    if (atual) {
      clearTimeout(atual.t);
      botTimers.delete(room.codigo);
    }
    return;
  }
  const chave = `${ator.id}|${room.pendingTest ? 'teste' : 'vez'}|${room.turnoAtual}`;
  if (atual && atual.chave === chave) return;
  if (atual) clearTimeout(atual.t);
  const t = setTimeout(() => {
    botTimers.delete(room.codigo);
    botAgir(room.codigo).catch((e) => console.error(`[bot ${room.codigo}]`, e.message));
  }, room.pendingTest ? BOT_ESPERA_DADO_MS : BOT_ESPERA_ACAO_MS);
  botTimers.set(room.codigo, { chave, t });
}

// Últimas falas da mesa, para o bot saber o que está acontecendo.
function cenaRecenteParaBot(room) {
  return room.logPublico
    .filter((m) => !m.efemero && ['mestre', 'jogador', 'sistema', 'missao'].includes(m.tipo))
    .slice(-8)
    .map((m) => `${m.tipo === 'mestre' ? 'MESTRE' : m.autor}: ${String(m.texto || '').replace(/\[[A-Z_]+[^\]]*\]/g, '').slice(0, 700)}`)
    .join('\n');
}

async function botAgir(codigo) {
  const room = getRoom(codigo);
  if (!room || botOcupado.has(codigo)) return;
  const bot = room.status === 'em_jogo' && !room.processando && !room.pausaDado ? atorAtual(room) : null;
  if (!bot || !bot.bot || !ativo(bot) || !humanoOnline(room)) return;
  botOcupado.add(codigo);
  try {
    if (room.pendingTest) {
      if (room.pendingTest.rolagem) return;
      // O bot "clica em Continuar" alguns segundos depois de rolar, como um jogador —
      // sem esperar o Mestre terminar de narrar. Isso fecha o modal de todos.
      const fechar = setTimeout(() => fecharDado({ codigo, userId: bot.userId }), BOT_FECHA_DADO_MS);
      try {
        await sendRollResult({ codigo, userId: bot.userId });
      } catch (e) {
        clearTimeout(fechar);
        throw e;
      }
      return;
    }
    garantirTracos(room, bot);
    const c = bot.personagem;
    const habilidades = (HABILIDADES[c.classeId] || [])
      .map((h) => getHabilidade(c.classeId, h.id, room.ambiente))
      .filter((h) => h && c.recurso.atual >= h.custo);
    const arma = armaEmpunhada(c);
    let decisao = null;
    try {
      decisao = await decidirAcaoBot({ room, bot, cenaRecente: cenaRecenteParaBot(room), habilidades, arma });
    } catch (e) {
      console.warn(`[bot ${codigo}] IA não decidiu a ação (${e.message}).`);
    }
    // A vez ainda é do bot? (alguém pode ter mexido na mesa enquanto ele pensava)
    if (atorAtual(room) !== bot || room.processando || room.pendingTest || room.status !== 'em_jogo') return;
    const texto = sanitizar(decisao && decisao.acao, 300) || (room.sugestoes && room.sugestoes[0]) || 'Observo com atenção e sigo o grupo.';
    const habilidadeId = decisao && habilidades.some((h) => h.id === decisao.habilidade) ? decisao.habilidade : undefined;
    const armaUid = decisao && decisao.atacar === true && arma && !habilidadeId ? arma.uid : undefined;
    try {
      await sendPlayerAction({ codigo, userId: bot.userId, texto, habilidadeId, armaUid });
      talvezComentarBot(room, bot).catch((e) => console.error(`[bot ${codigo}] recado:`, e.message));
    } catch (e) {
      // Habilidade/arma recusada: tenta só com o texto.
      if ((habilidadeId || armaUid) && atorAtual(room) === bot && !room.processando) {
        await sendPlayerAction({ codigo, userId: bot.userId, texto });
      } else throw e;
    }
  } catch (e) {
    console.error(`[bot ${codigo}] não conseguiu jogar: ${e.message}`);
    if (atorAtual(room) === bot && !room.processando && !room.pendingTest) {
      try {
        passarVez({ codigo, userId: bot.userId });
      } catch { /* a vez já mudou */ }
    }
  } finally {
    botOcupado.delete(codigo);
    agendarBot(room);
  }
}

// ---------------------------------------------------------------------------
// Recados de voz dos bots no bate-papo: de vez em quando (e com mais vontade
// quando o grupo está travado numa etapa), o bot grava um comentário curto
// sobre o jogo com dicas do próximo passo. Cada bot tem uma voz fixa.
// ---------------------------------------------------------------------------
// Vozes do ElevenLabs: primeiro as brasileiras, depois as multilíngues padrão.
// (Fora: a do narrador e vozes pessoais/clonadas.) Dá para trocar no .env.
const lista = (env, padrao) => (process.env[env] ? process.env[env].split(',').map((x) => x.trim()).filter(Boolean) : padrao);
const VOZES_BOT = {
  masculino: lista('RPG_BOT_VOZES_M', ['BjWEjIzWMha6iBp2DkXb', 'ETf5cmpNIbpSiXmBaR2m', 'SOYHLrjzK2X1ezoPC6cr', 'N2lVS1w4EtoT3dr4eOWO', 'IKne3meq5aSn9XLyUdCD']),
  feminino: lista('RPG_BOT_VOZES_F', ['bMKc4ZGchGYTMCov8eMG', 'cgSgspJ2msm6clMCkdW9', 'FGY2WhTYpPnrIDTdsKH5', 'EXAVITQu4vr4xnSDxMaL', 'pFZP5JQG7iQjIQuC4Bku']),
};
// Vozes reserva (edge-tts, grátis) quando o ElevenLabs falha: "voz|tom|velocidade".
// Poucas vozes pt-BR existem, então o tom/velocidade diferencia bots da mesma voz
// (e do narrador, que usa o Antonio no tom normal).
const VOZES_BOT_RESERVA = {
  masculino: lista('RPG_BOT_VOZES_RESERVA_M', ['pt-BR-AntonioNeural|-12Hz|+4%', 'pt-PT-DuarteNeural|+0Hz|+0%', 'pt-BR-AntonioNeural|+14Hz|+8%']),
  feminino: lista('RPG_BOT_VOZES_RESERVA_F', ['pt-BR-FranciscaNeural|+0Hz|+0%', 'pt-BR-ThalitaMultilingualNeural|+0Hz|+0%', 'pt-BR-FranciscaNeural|-12Hz|+6%']),
};
const BOT_FALA_INTERVALO_MESA_MS = Number(process.env.RPG_BOT_FALA_MESA_MS) || 2 * 60 * 1000; // entre recados de qualquer bot
const BOT_FALA_INTERVALO_BOT_MS = Number(process.env.RPG_BOT_FALA_BOT_MS) || 5 * 60 * 1000; // entre recados do mesmo bot
const BOT_FALA_CHANCE = Number(process.env.RPG_BOT_FALA_CHANCE) || 0.25; // depois de uma jogada normal
const BOT_FALA_CHANCE_TRAVADO = Number(process.env.RPG_BOT_FALA_CHANCE_TRAVADO) || 0.7; // grupo travado
const RODADAS_TRAVADO = 3;

// Traços de personalidade: só os da lista (sem acento/maiúscula), no máximo 2, sem repetir.
function tracosValidos(lista) {
  const nomes = Object.keys(TRACOS_BOT);
  const achados = (Array.isArray(lista) ? lista : [])
    .map((t) => nomes.find((n) => semAcento(n) === semAcento(String(t || ''))))
    .filter(Boolean);
  return [...new Set(achados)].slice(0, 2);
}

// Bot sem traços (IA falhou, ou mesa criada antes desta versão): sorteia 2 que ninguém na mesa usa.
function garantirTracos(room, bot) {
  const atuais = (bot.botTracos || []).slice(0, 2);
  if (atuais.length >= 2) return atuais;
  const usados = new Set(room.personagens.flatMap((p) => p.botTracos || []));
  let pool = Object.keys(TRACOS_BOT).filter((t) => !usados.has(t) && !atuais.includes(t));
  if (!pool.length) pool = Object.keys(TRACOS_BOT).filter((t) => !atuais.includes(t));
  while (atuais.length < 2 && pool.length) {
    const t = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    atuais.push(t);
  }
  bot.botTracos = atuais;
  return atuais;
}

function vozDoBot(room, bot) {
  if (bot.vozId) return bot.vozId;
  const usadas = new Set(room.personagens.map((p) => p.vozId).filter(Boolean));
  const idx = room.personagens.filter((p) => p.bot).indexOf(bot);
  const genero = bot.botGenero || (idx % 2 ? 'feminino' : 'masculino');
  const pool = [...VOZES_BOT[genero], ...VOZES_BOT[genero === 'feminino' ? 'masculino' : 'feminino']];
  bot.vozId = pool.find((v) => !usadas.has(v)) || pool[0];
  return bot.vozId;
}

// Voz reserva fixa do bot (mesmo gênero da voz principal, sem repetir na mesa).
function vozReservaDoBot(room, bot) {
  if (bot.vozReserva) return bot.vozReserva;
  vozDoBot(room, bot);
  const genero = VOZES_BOT.feminino.includes(bot.vozId) ? 'feminino' : 'masculino';
  const usadas = new Set(room.personagens.map((p) => p.vozReserva).filter(Boolean));
  const pool = [...VOZES_BOT_RESERVA[genero], ...VOZES_BOT_RESERVA[genero === 'feminino' ? 'masculino' : 'feminino']];
  bot.vozReserva = pool.find((v) => !usadas.has(v)) || pool[0];
  return bot.vozReserva;
}

function grupoTravado(room) {
  if (!room.missao || !room.missao.etapas.some((e) => !e.concluida)) return false;
  return (room.rodada || 1) - (room.missao.ultimoAvancoRodada || 1) >= RODADAS_TRAVADO;
}

async function talvezComentarBot(room, bot) {
  if (room.status !== 'em_jogo' || !humanoOnline(room) || !bot.personagem || bot.personagem.morto) return;
  const agora = Date.now();
  if (agora - (room.botFalaEm || 0) < BOT_FALA_INTERVALO_MESA_MS) return;
  if (agora - (bot.botFalaEm || 0) < BOT_FALA_INTERVALO_BOT_MS) return;
  garantirTracos(room, bot);
  const travado = grupoTravado(room);
  // Uma dica por "travada": depois de dar a dica, só volta a insistir se continuar parado mais um tempo.
  const marcaTravada = travado ? `${room.missao.etapas.findIndex((e) => !e.concluida)}:${Math.floor(((room.rodada || 1) - (room.missao.ultimoAvancoRodada || 1)) / RODADAS_TRAVADO)}` : '';
  const chance = travado && room.botDicaMarca !== marcaTravada ? BOT_FALA_CHANCE_TRAVADO : BOT_FALA_CHANCE;
  if (Math.random() >= chance) return;
  room.botFalaEm = agora; // reserva a vez de falar (evita dois bots ao mesmo tempo)
  bot.botFalaEm = agora;
  if (travado) room.botDicaMarca = marcaTravada;
  let texto;
  try {
    texto = await comentarioBot({ room, bot, cenaRecente: cenaRecenteParaBot(room), travado });
  } catch (e) {
    console.warn(`[bot ${room.codigo}] recado não gerado: ${e.message}`);
    return;
  }
  if (!texto || !rooms.has(room.codigo)) return;
  const autor = bot.personagem.nome;
  let audio = null;
  if (cfg(room).audioChat !== false && tts.disponivel()) {
    try {
      audio = await tts.sintetizar(texto, vozDoBot(room, bot), vozReservaDoBot(room, bot));
    } catch (e) {
      console.warn(`[bot ${room.codigo}] TTS falhou (${e.message}); vai como texto.`);
    }
  }
  addChatGeral(room, autor, texto); // o recado sempre vai também em texto (fica no histórico do chat)
  eventos.emit('chatBot', room, { autor, texto, audio });
  tocar(room);
}

// ---------------------------------------------------------------------------
// Cores dos personagens: cada personagem vivo da mesa tem uma cor própria
// (balões no log, cartão do grupo, nome no bate-papo).
// ---------------------------------------------------------------------------
const corValida = (cor) => CORES_PERSONAGEM.find((c) => c.hex === cor || c.id === cor) || null;

function coresEmUso(room, exceto) {
  return new Set(room.personagens.filter((p) => p !== exceto && p.personagem && !p.personagem.morto && p.personagem.cor).map((p) => p.personagem.cor));
}

// Primeira cor livre, começando pela pedida (ou pela cor padrão da classe).
function escolherCor(room, jogador, pedida) {
  const usadas = coresEmUso(room, jogador);
  const desejada = corValida(pedida);
  if (desejada && !usadas.has(desejada.hex)) return desejada.hex;
  const inicio = Math.max(0, CORES_PERSONAGEM.findIndex((c) => c.id === COR_PADRAO_CLASSE[jogador.personagem?.classeId]));
  for (let i = 0; i < CORES_PERSONAGEM.length; i++) {
    const c = CORES_PERSONAGEM[(inicio + i) % CORES_PERSONAGEM.length];
    if (!usadas.has(c.hex)) return c.hex;
  }
  return CORES_PERSONAGEM[inicio].hex; // mais de 10 personagens: repete
}

// Personagens antigos (antes das cores) ganham uma automaticamente.
function garantirCores(room) {
  for (const p of room.personagens) {
    if (p.personagem && !p.personagem.morto && !p.personagem.cor) p.personagem.cor = escolherCor(room, p, null);
  }
}

function mudarCor({ codigo, userId, cor }) {
  const room = exigirSala(codigo);
  const jogador = exigirJogador(room, userId);
  if (!jogador.personagem) throw new Error('Crie seu personagem primeiro.');
  const c = corValida(cor);
  if (!c) throw new Error('Cor inválida.');
  if (coresEmUso(room, jogador).has(c.hex)) throw new Error('Outro personagem já usa essa cor.');
  jogador.personagem.cor = c.hex;
  tocar(room);
  return { cor: c.hex };
}

function setCharacter({ codigo, userId, dados }) {
  const room = exigirSala(codigo);
  const jogador = exigirJogador(room, userId);
  if (room.status === 'encerrada') throw new Error('Esta aventura já foi encerrada.');
  if (jogador.personagem && !jogador.personagem.morto && room.status !== 'lobby') throw new Error('Seu personagem já está na aventura.');
  // Sem nome de personagem: usa o nome que o jogador escolheu na conta.
  const personagem = createCharacter({ ...(dados || {}), nome: String((dados && dados.nome) || '').trim() || jogador.nome }, room.ambiente);
  if (nomeEmUso(room, personagem.nome, jogador)) {
    throw new Error(`Já existe alguém chamado "${personagem.nome}" nesta mesa. Escolha outro nome.`);
  }
  jogador.personagem = personagem;
  personagem.cor = escolherCor(room, jogador, dados && dados.cor);
  if (room.status === 'em_jogo') {
    logSistema(room, `${personagem.nome} (${personagem.classeNome}) entrou na aventura!`);
    eventos.emit('aviso', room, { icone: '🆕', texto: `${personagem.nome} entrou na aventura` });
    room.notasPendentes.push(`${personagem.nome}, ${personagem.classeNome}, acabou de se juntar ao grupo — apresente-o na cena.`);
    garantirTurno(room);
  }
  tocar(room);
  return room;
}

function addChatGeral(room, autor, texto) {
  const msg = { autor, texto: sanitizar(texto, 500), ts: Date.now() };
  if (!msg.texto) throw new Error('Mensagem vazia.');
  room.chatGeral.push(msg);
  if (room.chatGeral.length > 200) room.chatGeral.shift();
  storage.salvarSala(room);
  return msg;
}

function resolvePlayerSocket(room, nome) {
  const p = room.personagens.find(
    (x) => x.conectado && (x.nome === nome || (x.personagem && x.personagem.nome === nome))
  );
  return p ? p.socketId : null;
}

// ---------------------------------------------------------------------------
// Turnos, tempo limite e Afastado
// ---------------------------------------------------------------------------

// Próximo jogador ativo (conectado, não afastado, com personagem), em rodízio.
function proximoTurno(room, indiceAtual) {
  const n = room.personagens.length;
  for (let i = 1; i <= n; i++) {
    const idx = (((indiceAtual + i) % n) + n) % n;
    if (ativo(room.personagens[idx])) return nomeExibicao(room.personagens[idx]);
  }
  return null;
}

function indiceDe(room, nome) {
  return nome ? room.personagens.findIndex((p) => nomeExibicao(p) === nome) : -1;
}

function avancarTurno(room) {
  mudarTurno(room, proximoTurno(room, indiceDe(room, room.turnoAtual)));
}

// Troca a vez; quando o rodízio dá a volta, é uma nova rodada (recarga de recursos).
function mudarTurno(room, novo) {
  const antes = indiceDe(room, room.turnoAtual);
  const depois = indiceDe(room, novo);
  room.turnoAtual = novo;
  if (room.status === 'em_jogo' && antes >= 0 && depois >= 0 && depois <= antes) fimDeRodada(room);
}

// Recarga por rodada: Mana e Fé +1 (e artefatos como o Talismã da aurora).
function fimDeRodada(room) {
  room.rodada = (room.rodada || 1) + 1;
  const ganhos = [];
  for (const p of room.personagens) {
    const c = p.personagem;
    if (!c || !ativo(p)) continue;
    const ganho = (c.classeId === 'arcanista' || c.classeId === 'guardiao' ? 1 : 0) + regenPorArtefatos(c);
    const antes = c.recurso.atual;
    c.recurso.atual = Math.min(c.recurso.max, antes + ganho);
    if (c.recurso.atual > antes) ganhos.push(`${c.nome} +${c.recurso.atual - antes} ${c.recurso.nome}`);
  }
  if (ganhos.length) logSistema(room, `🔄 Rodada ${room.rodada}: ${ganhos.join(' · ')}`);
  for (const p of room.personagens) {
    const c = p.personagem;
    if (!c || !c.caido || c.morto) continue;
    c.rodadasCaido = (c.rodadasCaido || 0) + 1;
    if (c.rodadasCaido >= RODADAS_PARA_MORRER) morrer(room, c, 'não foi socorrido a tempo');
    else logSistema(room, `⏳ ${c.nome} continua morrendo (${c.rodadasCaido}/${RODADAS_PARA_MORRER}). Alguém precisa curá-lo!`);
  }
}

function ganharRecurso(c, n) {
  const antes = c.recurso.atual;
  c.recurso.atual = Math.min(c.recurso.max, antes + n);
  return c.recurso.atual - antes;
}

// Quem precisa agir agora: quem deve rolar o teste pendente, ou quem tem a vez.
function atorAtual(room) {
  if (room.pendingTest) return jogadorPorNomePersonagem(room, room.pendingTest.nomePersonagem);
  return room.personagens.find((p) => room.turnoAtual && nomeExibicao(p) === room.turnoAtual) || null;
}

// Se ninguém tem a vez (todos estavam fora), entrega para o primeiro ativo.
function garantirTurno(room) {
  if (room.status !== 'em_jogo') return;
  const ator = atorAtual(room);
  if (!room.pendingTest && (!ator || !ativo(ator))) avancarTurno(room);
  reiniciarTimer(room);
}

function pararTimer(room) {
  clearTimeout(timers.get(room.codigo));
  timers.delete(room.codigo);
}

function agendar(room, ms) {
  clearTimeout(timers.get(room.codigo));
  timers.set(room.codigo, setTimeout(() => expirarTurno(room.codigo), Math.max(ms, 0) + 150));
}

function reiniciarTimer(room) {
  pararTimer(room);
  room.turnoExpiraEm = null;
  if (room.status !== 'em_jogo' || room.processando) return;

  // Quem rolou o dado ainda está vendo o resultado: o relógio espera ele fechar o modal.
  if (room.pausaDado) {
    const falta = room.pausaDado.ate - Date.now();
    if (falta > 0) {
      timers.set(room.codigo, setTimeout(() => {
        timers.delete(room.codigo);
        room.pausaDado = null;
        reiniciarTimer(room);
        tocar(room);
      }, falta));
      return;
    }
    room.pausaDado = null;
  }

  const ator = atorAtual(room);
  if (!ator || !ativo(ator)) {
    // Teste pedido a um personagem inexistente/ausente: não trava a mesa.
    if (room.pendingTest) {
      const nome = room.pendingTest.nomePersonagem;
      room.pendingTest = null;
      room.notasPendentes.push(`${nome} não pôde fazer o teste pedido; a vez passou adiante.`);
      avancarTurno(room);
      return reiniciarTimer(room);
    }
    if (!room.turnoAtual) return; // ninguém ativo: mesa pausada até alguém voltar
    avancarTurno(room);
    if (!room.turnoAtual) return;
  }
  if (room.pendingTest) {
    // Relógio do dado (o da vez fica parado). O prazo fica no próprio teste,
    // então reconexões e atualizações não o reiniciam.
    if (!room.pendingTest.prazo) room.pendingTest.prazo = Date.now() + cfg(room).tempoDadoMs;
    agendarDado(room, room.pendingTest.prazo - Date.now());
    return;
  }
  room.turnoExpiraEm = Date.now() + cfg(room).tempoTurnoMs;
  agendar(room, cfg(room).tempoTurnoMs);
}

function expirarTurno(codigo) {
  const room = getRoom(codigo);
  timers.delete(codigo);
  if (!room || room.status !== 'em_jogo' || room.processando || !room.turnoExpiraEm) return;
  const falta = room.turnoExpiraEm - Date.now();
  if (falta > 100) return agendar(room, falta); // prazo foi estendido (jogador digitando)
  pularAtor(room, 'tempo', true);
  tocar(room);
}

function agendarDado(room, ms) {
  clearTimeout(timers.get(room.codigo));
  timers.set(room.codigo, setTimeout(() => expirarDado(room.codigo), Math.max(ms, 0) + 150));
}

// Ninguém rolou dentro do prazo do dado: falha automática e o jogo segue.
async function expirarDado(codigo) {
  const room = getRoom(codigo);
  timers.delete(codigo);
  if (!room || room.status !== 'em_jogo' || room.processando || !room.pendingTest) return;
  const teste = room.pendingTest;
  const falta = (teste.prazo || 0) - Date.now();
  if (falta > 100) return agendarDado(room, falta);
  const jogador = atorAtual(room);
  if (!jogador || !jogador.personagem) {
    reiniciarTimer(room); // trata teste pedido a alguém que não está na mesa
    return tocar(room);
  }
  try {
    if (teste.rolagem) {
      await resolverTeste(room, jogador, teste, teste.rolagem); // já tinha rolado; só reenvia ao Mestre
    } else {
      contarPulo(room, jogador, `⏱️ ${nomeExibicao(jogador)} não rolou o dado a tempo`);
      await resolverTeste(room, jogador, teste, null, { automatico: true });
    }
  } catch (e) {
    console.error('[dado] falha automática não pôde ser narrada:', e.message);
  }
}

// Conta um pulo por inatividade; no terceiro, o jogador fica Afastado.
function contarPulo(room, ator, mensagem) {
  if (ator.bot) return logSistema(room, `${mensagem}.`); // bots não ficam Afastados
  ator.pulos = (ator.pulos || 0) + 1;
  if (ator.pulos >= MAX_PULOS) {
    ator.afastado = true;
    logSistema(room, `${mensagem} e ficou ${MAX_PULOS} vezes sem agir: agora está Afastado. Ao voltar, é só confirmar na tela.`);
  } else {
    logSistema(room, `${mensagem} (pulos ${ator.pulos}/${MAX_PULOS}).`);
  }
}

// Pula quem deveria agir. `contar` = conta como pulo por inatividade.
function pularAtor(room, motivo, contar) {
  const ator = atorAtual(room);
  const nome = ator ? nomeExibicao(ator) : room.pendingTest?.nomePersonagem || room.turnoAtual || 'Alguém';

  if (ator && contar) {
    contarPulo(room, ator, `⏱️ Tempo esgotado: ${nome} foi pulado`);
  } else if (motivo === 'passou') {
    logSistema(room, `${nome} passou a vez.`);
  } else if (motivo === 'desconectou') {
    logSistema(room, `${nome} se desconectou; a vez passou adiante.`, { efemero: true });
  }

  if (room.pendingTest) {
    const label = ATTRIBUTE_LABELS[room.pendingTest.atributo] || room.pendingTest.atributo;
    room.notasPendentes.push(`${nome} não fez o teste de ${label} a tempo — trate como uma oportunidade perdida (falha).`);
    room.pendingTest = null;
  } else if (motivo === 'passou') {
    room.notasPendentes.push(`${nome} preferiu não agir agora e passou a vez.`);
  } else {
    room.notasPendentes.push(`${nome} hesitou e não agiu a tempo; a vez passou adiante.`);
  }

  room.sugestoes = [];
  mudarTurno(room, proximoTurno(room, ator ? room.personagens.indexOf(ator) : indiceDe(room, room.turnoAtual)));
  reiniciarTimer(room);
}

// Jogador digitando: garante um fôlego mínimo antes de ser pulado.
function registrarAtividade({ codigo, userId }) {
  const room = getRoom(codigo);
  if (!room || !room.turnoExpiraEm) return;
  const ator = atorAtual(room);
  if (!ator || ator.userId !== userId) return;
  const minimo = Date.now() + FOLEGO_DIGITANDO_MS;
  if (room.turnoExpiraEm < minimo) {
    room.turnoExpiraEm = minimo;
    agendar(room, FOLEGO_DIGITANDO_MS);
    eventos.emit('mudou', room);
  }
}

function passarVez({ codigo, userId }) {
  const room = exigirSala(codigo);
  const jogador = exigirJogador(room, userId);
  if (room.status !== 'em_jogo') throw new Error('A aventura não está em andamento.');
  if (room.processando) throw new Error('O Mestre ainda está narrando. Aguarde.');
  if (atorAtual(room) !== jogador) throw new Error('Não é sua vez.');
  jogador.pulos = 0;
  pularAtor(room, 'passou', false);
  tocar(room);
}

// Quem rolou fechou o modal do dado: o tempo da vez volta a correr.
function fecharDado({ codigo, userId }) {
  const room = getRoom(codigo);
  if (!room || !room.pausaDado || room.pausaDado.userId !== userId) return;
  room.pausaDado = null;
  reiniciarTimer(room);
  tocar(room);
}

function confirmarVolta({ codigo, userId }) {
  const room = exigirSala(codigo);
  const jogador = exigirJogador(room, userId);
  if (!jogador.afastado) return room;
  jogador.afastado = false;
  jogador.pulos = 0;
  logSistema(room, `${nomeExibicao(jogador)} voltou à mesa!`, { efemero: true });
  garantirTurno(room);
  tocar(room);
  return room;
}

// ---------------------------------------------------------------------------
// Tags de controle na resposta do Mestre
// ---------------------------------------------------------------------------
const RE_TESTE = /\[TESTE:\s*([^|\]]+)\|\s*([^|\]]+)\|\s*([^|\]]+)\]/i;
const RE_CENA = /\[CENA:\s*([^|\]]+)\|\s*([^|\]]+)\|\s*([^|\]]+)\]/i;
const RE_ESTADO = /\[ESTADO:\s*([^|\]]+)((?:\|[^|\]]*)+)\]/gi;
const RE_SUGESTOES = /\[SUGEST(?:OES|ÕES|OÊS)?:\s*([^\]]+)\]/i;
const RE_FIM = /\[FIM\]/i;
const RE_BUSCAVEL = /\[BUSC[AÁ]VEL:\s*([^|\]]+)(?:\|([^|\]]*))?(?:\|([^|\]]*))?(?:\|([^|\]]*))?\]/gi;
const RE_TODAS_TAGS = /\[(?:TESTE|CENA|ESTADO|SUGEST\w*|FIM|BUSC[AÁ]VEL|MISS[AÃ]O\w*|ETAPA|M[UÚ]SICA|IMAGEM|MORTE)\b[^\]]*\]/gi;
const RE_MUSICA = /\[M[UÚ]SICA:\s*([^\]]+)\]/i;
const RE_IMAGEM = /\[IMAGEM:\s*([^\]]+)\]/i;
const RE_MORTE = /\[MORTE:\s*([^|\]]+)(?:\|\s*([^\]]*))?\]/gi;
const RE_MISSAO = /\[MISS[AÃ]O:\s*([^\]]+)\]/i;
const RE_ETAPA = /\[ETAPA:\s*(\d+)\s*\]/gi;
const RE_MISSAO_CUMPRIDA = /\[MISS[AÃ]O_CUMPRIDA\]/i;
const RE_MISSAO_FALHOU = /\[MISS[AÃ]O_FALHOU\]/i;

function limparTags(texto) {
  return texto.replace(RE_TODAS_TAGS, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function normalizarAtributo(s, personagem) {
  const a = semAcento(s);
  if (ATTRIBUTES.includes(a)) return a;
  const achado = ATTRIBUTES.find((x) => a.startsWith(x.slice(0, 3)));
  return achado || (personagem ? Object.keys(personagem.modificadores)[0] : 'mente');
}

function normalizarDificuldade(s) {
  const d = semAcento(s).replace(/[\s-]+/g, '_');
  return DIFFICULTIES[d] ? d : 'medio';
}

// Rede de segurança: o Mestre escreveu "Role Mente..." mas esqueceu a tag [TESTE].
// Deduz o atributo, a dificuldade (pelo número citado) e quem rola.
const RE_ROLE = /\b(?:role|rolem|rolar|faça um teste|teste)\b[^.\n]{0,40}?\b(for[cç]a|agilidade|mente|esp[ií]rito)\b/i;
function deduzirTeste(room, texto, atorPadrao) {
  const m = texto.match(RE_ROLE);
  if (!m) return null;
  const atributo = normalizarAtributo(m[1]);
  const depois = texto.slice(m.index, m.index + 300);
  const n = depois.match(/\b(\d{1,2})\s*(?:ou mais|\+|pra cima|para cima)/i);
  let dificuldade = 'medio';
  if (n) {
    const alvo = parseInt(n[1], 10);
    dificuldade = Object.entries(DIFFICULTIES).sort((a, b) => Math.abs(a[1] - alvo) - Math.abs(b[1] - alvo))[0][0];
  }
  // Quem rola: um personagem citado logo antes do "Role", senão quem acabou de agir.
  const antes = semAcento(texto.slice(Math.max(0, m.index - 160), m.index + 10));
  const citado = room.personagens.find((p) => p.personagem && antes.includes(semAcento(p.personagem.nome)));
  const jogador = citado || jogadorPorNomePersonagem(room, atorPadrao || room.turnoAtual || '');
  if (!jogador || !jogador.personagem) return null;
  return { nomePersonagem: nomeExibicao(jogador), atributo, dificuldade };
}

function detectarTeste(room, texto, atorPadrao) {
  const m = texto.match(RE_TESTE);
  if (!m) {
    room.pendingTest = deduzirTeste(room, texto, atorPadrao);
    if (room.pendingTest) console.warn(`[mestre] ${room.codigo}: teste deduzido sem tag →`, JSON.stringify(room.pendingTest));
    return;
  }
  const jogador = jogadorPorNomePersonagem(room, m[1]);
  room.pendingTest = {
    nomePersonagem: jogador ? nomeExibicao(jogador) : m[1].trim().slice(0, 40),
    atributo: normalizarAtributo(m[2], jogador && jogador.personagem),
    dificuldade: normalizarDificuldade(m[3]),
  };
}

function detectarCena(room, texto) {
  const m = texto.match(RE_CENA);
  if (!m) return;
  // Mudou de lugar: os pontos de busca da cena anterior ficam para trás.
  if (!room.cena || semAcento(room.cena.local) !== semAcento(sanitizar(m[1], 60))) room.buscaveis = [];
  room.cena = {
    local: sanitizar(m[1], 60),
    descricao: sanitizar(m[2], 160),
    clima: semAcento(m[3]).replace(/[^a-z_]/g, '').slice(0, 20),
  };
}

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const numero = (s) => parseInt(String(s).replace(/\s+/g, ''), 10);

// Aplica [ESTADO: Nome | pv -3 | recurso +2 | +item: X | -item: Y | xp +20]
function aplicarEstados(room, texto) {
  const avisos = [];
  const mortes = [];
  const quedas = [];
  for (const m of texto.matchAll(RE_ESTADO)) {
    const jogador = jogadorPorNomePersonagem(room, m[1]);
    const c = jogador && jogador.personagem;
    if (!c) continue;
    const partes = m[2].split('|').map((x) => x.trim()).filter(Boolean);
    const mudancas = [];
    const pvAntes = c.hp.atual;
    const morrerDepois = [];

    for (const parte of partes) {
      let r;
      if ((r = parte.match(/^(?:pv|hp|vida)\s*([+-]\s*\d+)$/i))) {
        if (c.morto) continue;
        const d = clamp(numero(r[1]), -50, 50);
        if (d < 0 && (c.caido || c.hp.atual + d <= -c.hp.max)) {
          morrerDepois.push(c.caido ? 'levou dano enquanto estava caído' : 'golpe fatal');
        }
        c.hp.atual = clamp(c.hp.atual + d, 0, c.hp.max);
        if (d) mudancas.push(`${d > 0 ? '+' : '−'}${Math.abs(d)} PV (${c.hp.atual}/${c.hp.max})`);
        // Fúria: o Guerreiro fica mais forte quanto mais apanha.
        if (d < 0 && c.classeId === 'guerreiro' && ganharRecurso(c, 1)) mudancas.push(`+1 ${c.recurso.nome} (${c.recurso.atual}/${c.recurso.max})`);
      } else if ((r = parte.match(/^(?:recurso|mana|f[uú]ria|foco|f[eé])\s*([+-]\s*\d+)$/i))) {
        const d = clamp(numero(r[1]), -50, 50);
        c.recurso.atual = clamp(c.recurso.atual + d, 0, c.recurso.max);
        if (d) mudancas.push(`${d > 0 ? '+' : '−'}${Math.abs(d)} ${c.recurso.nome} (${c.recurso.atual}/${c.recurso.max})`);
      } else if ((r = parte.match(/^(?:moedas?|dinheiro|ouro|r[eé]is|cr[eé]ditos?|tost[oõ]es)\s*([+-]\s*\d+)$/i)) ||
                 (r = parte.match(/^([+-])\s*item\s*:\s*(\d+)\s*(?:moedas?|r[eé]is|tost[oõ]es|cr[eé]ditos?)\s*$/i))) {
        // Moedas: "moedas +3" / "moedas -1" (e "+item: 3 moedas", que a IA às vezes usa).
        const d = clamp(r.length > 2 && r[2] ? Number(r[1] + r[2]) : numero(r[1]), -9999, 9999);
        const antes = c.moedas || 0;
        c.moedas = Math.max(0, antes + d);
        const real = c.moedas - antes;
        if (real > 0) stats(room).moedas += real;
        if (real) mudancas.push(`🪙 ${real > 0 ? '+' : '−'}${Math.abs(real)} moeda${Math.abs(real) === 1 ? '' : 's'} (${c.moedas})`);
        if (d < 0 && -d > antes) mudancas.push(`(só tinha ${antes})`);
      } else if ((r = parte.match(/^\+\s*item\s*:\s*(.+)$/i))) {
        const nomeItem = sanitizar(r[1], 60);
        if (nomeItem && c.inventario.length < 30) {
          const item = itemPorNome(nomeItem, room.ambiente); // nome do catálogo vira item usável de verdade
          c.inventario.push(item);
          mudancas.push(`ganhou ${item.icone !== '•' ? item.icone + ' ' : ''}${item.nome}`);
        }
      } else if ((r = parte.match(/^-\s*item\s*:\s*(.+)$/i))) {
        const alvo = semAcento(r[1]);
        const idx = c.inventario.findIndex((i) => semAcento(i.nome) === alvo || semAcento(i.nome).includes(alvo));
        if (idx >= 0) {
          const [item] = c.inventario.splice(idx, 1);
          if (item.equipado) aplicarPassivo(c, item, false);
          mudancas.push(`perdeu ${item.nome}`);
        }
      } else if ((r = parte.match(/^xp\s*\+?\s*(\d+)$/i))) {
        const xp = clamp(numero(r[1]), 0, 200);
        if (xp) {
          mudancas.push(`+${xp} XP`);
          for (const nivel of aplicarXp(c, xp)) avisos.push(`🎉 ${c.nome} subiu para o nível ${nivel}! PV e ${c.recurso.nome} restaurados.`);
        }
      }
    }

    if (mudancas.length) avisos.unshift(`${c.nome}: ${mudancas.join(' · ')}`);
    if (morrerDepois.length) {
      mortes.push([c, morrerDepois[0]]);
    } else if (c.hp.atual === 0 && pvAntes > 0) {
      quedas.push(c);
    } else if (c.hp.atual > 0 && levantar(c)) {
      avisos.push(`${c.nome} se levanta de novo!`);
    }
  }
  // Mortes e quedas entram no log depois do resumo das mudanças.
  aplicarEstados.pendentes = { mortes, quedas };
  return avisos;
}

// Faixa a tocar: a variante do ambiente (ex.: cyber-batalha), se existir.
function musicaDoAmbiente(room) {
  if (!room.musica) return null;
  const prefixo = getAmbiente(room.ambiente).musicaPrefixo;
  return prefixo && MUSICAS.some((m) => m.id === prefixo + room.musica) ? prefixo + room.musica : room.musica;
}

// Trilha sonora: o Mestre escolhe com [MUSICA: id]; se não escolher e o clima
// da cena mudar (ou ainda não houver trilha), usa a trilha do clima.
function detectarMusica(room, texto, climaAntes) {
  const m = texto.match(RE_MUSICA);
  if (m) {
    const alvo = semAcento(m[1]).replace(/[^a-z]/g, '');
    const musica = MUSICAS.find((x) => !x.ambiente && (x.id === alvo || semAcento(x.nome).replace(/[^a-z]/g, '') === alvo));
    if (musica) return (room.musica = musica.id);
  }
  const clima = room.cena && room.cena.clima;
  if (clima && (clima !== climaAntes || !room.musica) && MUSICA_POR_CLIMA[clima]) room.musica = MUSICA_POR_CLIMA[clima];
  if (!room.musica) room.musica = 'exploracao';
}

// Ilustração da cena: o Mestre pede com [IMAGEM: descrição]. A primeira cena ganha
// uma automaticamente. Limites para controlar o custo.
// Lê um número do .env aceitando 0 (o "|| padrão" trataria 0 como ausente).
const numeroEnv = (nome, padrao) => (process.env[nome] !== undefined && process.env[nome] !== '' && Number.isFinite(Number(process.env[nome])) ? Number(process.env[nome]) : padrao);
const MAX_IMAGENS_POR_SALA = numeroEnv('RPG_IMG_MAX_POR_SALA', 12);
const INTERVALO_IMAGENS_MS = numeroEnv('RPG_IMG_INTERVALO_MS', 3 * 60 * 1000);
const gerandoImagem = new Set();

function detectarImagem(room, texto) {
  if (!imagens.disponivel() || cfg(room).imagens === false) return; // desligado nas configurações da mesa
  const m = texto.match(RE_IMAGEM);
  let descricao = m ? sanitizar(m[1], 400) : '';
  if (!descricao && !room.imagensGeradas && room.cena) {
    descricao = `${room.cena.local}: ${room.cena.descricao}`; // abertura sem pedido do Mestre
  }
  if (!descricao) return;
  const n = room.imagensGeradas || 0;
  if (n >= MAX_IMAGENS_POR_SALA || gerandoImagem.has(room.codigo)) return;
  if (room.ultimaImagemEm && Date.now() - room.ultimaImagemEm < INTERVALO_IMAGENS_MS) return;
  room.imagensGeradas = n + 1;
  room.ultimaImagemEm = Date.now();
  gerandoImagem.add(room.codigo);
  const local = room.cena ? room.cena.local : '';
  // Em segundo plano: o jogo não espera a imagem ficar pronta.
  imagens
    .gerar(room.codigo, getAmbiente(room.ambiente).estiloImagem, `${descricao}${room.tema ? ` (Setting: ${room.tema.slice(0, 300)})` : ''}`)
    .then((arquivo) => {
      const url = `imagens/${room.codigo}/${arquivo}`;
      room.logPublico.push({ autor: 'Mestre', tipo: 'imagem', texto: m ? sanitizar(m[1], 200) : local, imagem: url, ts: Date.now() });
      if (room.cena && (!local || room.cena.local === local)) room.cena.imagem = url;
      tocar(room);
    })
    .catch((e) => {
      room.imagensGeradas = Math.max(0, (room.imagensGeradas || 1) - 1);
      console.error(`[imagem] ${room.codigo}: falhou —`, e.message);
    })
    .finally(() => gerandoImagem.delete(room.codigo));
}

// [BUSCAVEL: Baú velho | trancado | agilidade | medio] → botão "Procurar" na cena.
function detectarBuscaveis(room, texto) {
  room.buscaveis = room.buscaveis || [];
  for (const m of texto.matchAll(RE_BUSCAVEL)) {
    const nome = sanitizar(m[1], 40);
    if (!nome) continue;
    if (room.buscaveis.filter((b) => !b.aberto).length >= 3) break;
    if (room.buscaveis.some((b) => semAcento(b.nome) === semAcento(nome) && !b.aberto)) continue;
    const e = semAcento(m[2]);
    const estado = e.startsWith('trancad') ? 'trancado' : e.startsWith('armadilh') ? 'armadilha' : 'livre';
    room.buscaveis.push({
      id: novoIdJogador(),
      nome,
      tipo: tipoDeBusca(nome),
      estado,
      atributo: m[3] && m[3].trim() ? normalizarAtributo(m[3]) : estado === 'armadilha' ? 'mente' : 'agilidade',
      dificuldade: m[4] && m[4].trim() ? normalizarDificuldade(m[4]) : 'medio',
      aberto: false,
      abertoPor: null,
    });
  }
}

function detectarSugestoes(room, texto) {
  const m = texto.match(RE_SUGESTOES);
  room.sugestoes = m
    ? m[1].split('|').map((s) => sanitizar(s, 80)).filter(Boolean).slice(0, 3)
    : [];
}

// Registra a resposta do Mestre e aplica todos os efeitos das tags.
function processarResposta(room, resposta, ator) {
  room.historico.push({ role: 'assistant', content: resposta });
  // Missão definida agora (aventura personalizada): o cartão vem antes da narração.
  const tinhaMissao = !!room.missao;
  const mm = resposta.match(RE_MISSAO);
  if (mm && !room.missao) {
    const partes = mm[1].split('|').map((x) => x.trim()).filter(Boolean);
    room.missao = novaMissao(partes[0], partes.slice(1), 'ia');
  }
  if (!tinhaMissao && room.missao) cartaoMissao(room);
  room.logPublico.push({ autor: 'Mestre', tipo: 'mestre', texto: limparTags(resposta), ts: Date.now(), ...(ator ? { ator } : {}) });
  detectarTeste(room, resposta, ator);
  const climaAntes = room.cena && room.cena.clima;
  detectarCena(room, resposta);
  detectarMusica(room, resposta, climaAntes);
  detectarImagem(room, resposta);
  detectarBuscaveis(room, resposta);
  detectarSugestoes(room, resposta);
  for (const aviso of aplicarEstados(room, resposta)) logSistema(room, aviso);
  const { mortes = [], quedas = [] } = aplicarEstados.pendentes || {};
  aplicarEstados.pendentes = null;
  for (const c of quedas) cair(room, c);
  for (const [c, motivo] of mortes) morrer(room, c, motivo);
  // [MORTE: nome | motivo] — morte narrativa direta (queda num abismo, sacrifício...).
  for (const mm of resposta.matchAll(RE_MORTE)) {
    const j = jogadorPorNomePersonagem(room, mm[1]);
    if (j && j.personagem) morrer(room, j.personagem, sanitizar(mm[2] || '', 80) || 'destino narrado pelo Mestre');
  }
  processarMissao(room, resposta);
  if (room.status === 'em_jogo' && RE_FIM.test(resposta)) finalizar(room, 'interrompida');
}

// Cartão "📜 Sua missão" no log.
function cartaoMissao(room) {
  const m = room.missao;
  const etapas = m.etapas.length ? `\nPrimeiro passo: ${m.etapas[0].texto}` : '';
  room.logPublico.push({ autor: 'Missão', tipo: 'missao', texto: `📜 ${m.objetivo}${etapas}`, ts: Date.now() });
}

function finalizar(room, resultado = 'interrompida') {
  room.resultado = room.resultado || resultado;
  room.musica = room.resultado === 'cumprida' ? 'epico' : 'calmo';
  stats(room).fim = Date.now();
  room.status = 'encerrada';
  room.pendingTest = null;
  room.turnoAtual = null;
  room.turnoExpiraEm = null;
  room.sugestoes = [];
  pararTimer(room);
  const textoFim = {
    cumprida: '🏆 Missão cumprida! Obrigado por jogar. Você pode exportar o diário da aventura.',
    falhou: '💀 A missão falhou… mas toda lenda tem uma revanche. Você pode exportar o diário da aventura.',
    interrompida: '🏁 Aventura encerrada. Obrigado por jogar. Você pode exportar o diário da aventura.',
  };
  logSistema(room, textoFim[room.resultado] || textoFim.interrompida);
  eventos.emit('fim', room);
}

// Conteúdo da próxima mensagem "user" à IA: avisos do sistema + fala/ação.
function montarMensagem(room, texto) {
  const notas = room.notasPendentes.map((n) => `[Sistema: ${n}]`);
  return [...notas, texto].filter(Boolean).join('\n');
}

function instrucaoProximo(nomeProximo) {
  if (!nomeProximo) return '';
  return `TURNO: ao terminar esta narração (se não pedir nenhum TESTE), termine dirigindo-se a ${nomeProximo}, perguntando o que ${nomeProximo} faz — é a vez dessa pessoa agir.`;
}

// Executa uma chamada ao Mestre com trava, rollback em caso de falha e timer.
async function rodadaDoMestre(room, { conteudo, sistemaAdicional, aoFalhar, ator }) {
  const snapshot = JSON.stringify({
    personagens: room.personagens.map((p) => p.personagem),
    pendingTest: room.pendingTest,
    notasPendentes: room.notasPendentes,
  });
  room.processando = true;
  pararTimer(room);
  room.turnoExpiraEm = null;
  room.historico.push({ role: 'user', content: conteudo });
  room.notasPendentes = [];
  tocar(room);

  try {
    // Lembrete a cada rodada: a mesa é coletiva, então a ação é narrada em 3ª pessoa com o nome.
    const lembretePessoa = ator
      ? `Narre o que ${ator} fez em TERCEIRA PESSOA, começando pelo nome ("${ator} ..."), nunca com "você".`
      : '';
    const resposta = await callMaster({ room, history: room.historico, sistemaAdicional: [sistemaAdicional, lembretePessoa].filter(Boolean).join('\n') });
    processarResposta(room, resposta, ator);
    return resposta;
  } catch (e) {
    // Desfaz tudo o que esta rodada mudou: a mesa volta exatamente ao estado anterior.
    room.historico.pop();
    const antes = JSON.parse(snapshot);
    room.personagens.forEach((p, i) => (p.personagem = antes.personagens[i] ?? p.personagem));
    room.pendingTest = antes.pendingTest;
    room.notasPendentes = antes.notasPendentes;
    if (aoFalhar) aoFalhar(e);
    throw e;
  } finally {
    room.processando = false;
    if (room.status === 'em_jogo') reiniciarTimer(room);
    tocar(room);
    talvezResumir(room);
  }
}

async function talvezResumir(room) {
  if (room.historico.length <= LIMITE_HISTORICO || resumindo.has(room.codigo)) return;
  resumindo.add(room.codigo);
  try {
    let corte = room.historico.length - MANTER_HISTORICO;
    while (corte < room.historico.length && room.historico[corte].role !== 'user') corte++;
    const antigas = room.historico.slice(0, corte);
    const novo = await resumirHistorico({ resumoAnterior: room.resumo, mensagens: antigas, tema: room.tema });
    if (novo) {
      room.resumo = novo.slice(0, 4000);
      room.historico.splice(0, corte); // só acrescentamos no fim; as primeiras `corte` são as resumidas
      storage.salvarSala(room);
    }
  } catch (e) {
    console.error('[resumo]', room.codigo, e.message);
  } finally {
    resumindo.delete(room.codigo);
  }
}


// ---------------------------------------------------------------------------
// Missão: objetivo + etapas em ordem. O Mestre marca com tags; o servidor valida.
// ---------------------------------------------------------------------------
const XP_POR_ETAPA = 30;
const XP_MISSAO_CUMPRIDA = 50;

function novaMissao(objetivo, etapas, origem) {
  return {
    objetivo: sanitizar(objetivo, 200) || 'Cumprir a missão do grupo',
    etapas: (etapas || []).map((t) => ({ texto: sanitizar(t, 140), concluida: false, ts: null })).filter((e) => e.texto).slice(0, 5),
    origem,
  };
}

function proximaEtapa(room) {
  return room.missao ? room.missao.etapas.findIndex((e) => !e.concluida) : -1;
}

function stats(room) {
  room.estatisticas = room.estatisticas || { inicio: null, fim: null, testes: 0, sucessos: 0, falhas: 0, criticos: 0, falhasCriticas: 0, itens: 0, moedas: 0 };
  return room.estatisticas;
}

function darXpGrupo(room, xp, motivo) {
  const avisos = [];
  for (const p of room.personagens) {
    const c = p.personagem;
    if (!c || !p.conectado) continue;
    for (const nivel of aplicarXp(c, xp)) avisos.push(`🎉 ${c.nome} subiu para o nível ${nivel}! PV e ${c.recurso.nome} restaurados.`);
  }
  logSistema(room, `${motivo} +${xp} XP para o grupo.`);
  avisos.forEach((a) => logSistema(room, a));
}

// Conclui a próxima etapa pendente (n = número da etapa, 1-based; só a próxima vale).
function concluirEtapa(room, n, porAnfitriao = false) {
  const idx = proximaEtapa(room);
  if (idx < 0 || n - 1 !== idx) return false;
  const etapa = room.missao.etapas[idx];
  etapa.concluida = true;
  etapa.ts = Date.now();
  room.missao.ultimoAvancoRodada = room.rodada || 1;
  const total = room.missao.etapas.length;
  logSistema(room, `✅ Etapa ${idx + 1}/${total} concluída${porAnfitriao ? ' (marcada pelo anfitrião)' : ''}: ${etapa.texto}`);
  darXpGrupo(room, XP_POR_ETAPA, '⭐ Progresso na missão:');
  const prox = proximaEtapa(room);
  eventos.emit('etapa', room, { numero: idx + 1, total, texto: etapa.texto, proxima: prox >= 0 ? room.missao.etapas[prox].texto : null });
  return true;
}

function todosCaidos(room) {
  const ativos = room.personagens.filter((p) => p.personagem && p.conectado && !p.afastado);
  return ativos.length > 0 && ativos.every((p) => p.personagem.caido || p.personagem.morto);
}

function todosMortos(room) {
  const comFicha = room.personagens.filter((p) => p.personagem);
  return comFicha.length > 0 && comFicha.every((p) => p.personagem.morto);
}

function concluirEtapaPeloAnfitriao({ codigo, userId }) {
  const room = exigirSala(codigo);
  exigirHost(room, userId);
  if (room.status !== 'em_jogo') throw new Error('A aventura não está em andamento.');
  if (room.processando) throw new Error('Aguarde o Mestre terminar de narrar.');
  const idx = proximaEtapa(room);
  if (idx < 0) throw new Error('Não há etapa pendente.');
  concluirEtapa(room, idx + 1, true);
  room.notasPendentes.push(`O anfitrião marcou como concluída a etapa ${idx + 1} da missão ("${room.missao.etapas[idx].texto}"). Considere isso na história.`);
  tocar(room);
}

// Lê as tags de missão da resposta do Mestre e aplica as travas.
function processarMissao(room, texto) {
  const m = texto.match(RE_MISSAO);
  if (m && !room.missao) {
    const partes = m[1].split('|').map((x) => x.trim()).filter(Boolean);
    room.missao = novaMissao(partes[0], partes.slice(1), 'ia');
  }
  for (const e of texto.matchAll(RE_ETAPA)) concluirEtapa(room, parseInt(e[1], 10));

  if (RE_MISSAO_CUMPRIDA.test(texto)) {
    const pendente = proximaEtapa(room);
    if (pendente >= 0) {
      // Vitória antes da hora: ignora e orienta o Mestre.
      room.notasPendentes.push(`A missão ainda NÃO está cumprida: falta a etapa ${pendente + 1} ("${room.missao.etapas[pendente].texto}"). Não encerre a missão ainda.`);
      console.warn(`[missao] ${room.codigo}: [MISSAO_CUMPRIDA] ignorada (etapa ${pendente + 1} pendente)`);
    } else {
      darXpGrupo(room, XP_MISSAO_CUMPRIDA, '🏆 Missão cumprida!');
      finalizar(room, 'cumprida');
      return;
    }
  }
  if (RE_MISSAO_FALHOU.test(texto)) {
    if (todosCaidos(room)) {
      finalizar(room, 'falhou');
      return;
    }
    room.notasPendentes.push('A missão só pode falhar se o grupo inteiro for derrotado. O grupo ainda está de pé: continue a história.');
    console.warn(`[missao] ${room.codigo}: [MISSAO_FALHOU] ignorada (grupo de pé)`);
  }
  // Todos os personagens mortos: a missão falhou.
  if (room.status === 'em_jogo' && todosMortos(room)) {
    finalizar(room, 'falhou');
    return;
  }
  // Grupo inteiro caído: o Mestre decide entre a derrota e um resgate improvável.
  if (room.status === 'em_jogo' && todosCaidos(room) && !room.avisouQueda) {
    room.avisouQueda = true;
    room.notasPendentes.push('TODO o grupo está caído. Narre a derrota (e inclua [MISSAO_FALHOU]) ou um resgate improvável que custe caro.');
  } else if (!todosCaidos(room)) room.avisouQueda = false;
}

// Tenta tirar o objetivo da seção "-- DESCREVA A MISSÃO" do texto do anfitrião.
function missaoDoTema(tema) {
  const m = String(tema || '').match(/miss[aã]o[^\n]*\n([\s\S]+?)(?:\n\s*--|$)/i);
  return novaMissao((m ? m[1] : tema).trim().split('\n')[0].replace(/^ex:\s*/i, ''), [], 'tema');
}

// ---------------------------------------------------------------------------
// Fluxo do jogo
// ---------------------------------------------------------------------------
async function startAdventure({ codigo, userId }) {
  const room = exigirSala(codigo);
  exigirHost(room, userId);
  if (room.status !== 'lobby') throw new Error('A aventura já começou.');
  if (room.processando) throw new Error('O Mestre já está preparando a aventura. Aguarde.');
  if (!room.personagens.some((p) => p.personagem)) throw new Error('Ninguém escolheu personagem ainda.');
  if (room.personagens.some((p) => p.bot && !p.personagem)) {
    throw new Error('Os bots ainda estão criando os personagens deles. Aguarde alguns segundos.');
  }
  if (room.personagens.some((p) => p.conectado && !p.personagem)) {
    throw new Error('Nem todos os jogadores escolheram um personagem ainda.');
  }

  const turnoInicial = proximoTurno(room, -1);
  const pedirMissao = room.missao
    ? `Deixe claro na narração qual é a missão do grupo: "${room.missao.objetivo}". `
    : 'ANTES da narração, na primeira linha, defina a missão do grupo a partir do tema, no formato exato [MISSAO: objetivo em uma frase | etapa 1 | etapa 2 | etapa 3] com 3 ou 4 etapas claras, verificáveis e em ordem. Depois narre a abertura deixando a missão clara para os jogadores. ';
  const abertura =
    `Inicie a aventura agora: ${pedirMissao}Descreva a cena de abertura, o local onde o grupo se encontra e um gancho inicial que os convide a agir. O jogo é por turnos: termine perguntando a ${turnoInicial} o que faz primeiro.`;

  // A sala só passa para "em_jogo" depois que a IA responder: se ela estiver fora do
  // ar, continua no lobby e o anfitrião pode tentar de novo sem efeitos colaterais.
  room.processando = true;
  tocar(room);
  let resposta;
  try {
    resposta = await callMaster({ room, history: [{ role: 'user', content: abertura }] });
  } finally {
    room.processando = false;
  }
  room.status = 'em_jogo';
  room.turnoAtual = turnoInicial;
  room.historico.push({ role: 'user', content: abertura });
  stats(room).inicio = Date.now();
  if (room.missao) cartaoMissao(room); // roteiro pronto: cartão antes da primeira narração
  processarResposta(room, resposta, turnoInicial);
  if (!room.missao) {
    // O Mestre não definiu a missão: usa o que o anfitrião escreveu.
    room.missao = missaoDoTema(room.tema);
    const idxMestre = room.logPublico.length - 1;
    cartaoMissao(room);
    room.logPublico.splice(idxMestre, 0, room.logPublico.pop());
  }
  reiniciarTimer(room);
  tocar(room);
}

function validarAcao(room, userId) {
  const jogador = exigirJogador(room, userId);
  if (room.status !== 'em_jogo') throw new Error('A aventura não está em andamento.');
  if (jogador.afastado) throw new Error('Você está como Afastado. Confirme que voltou para jogar.');
  if (jogador.personagem && jogador.personagem.morto) throw new Error('Seu personagem morreu. Crie um novo personagem para voltar à aventura.');
  if (room.processando) throw new Error('O Mestre ainda está narrando. Aguarde.');
  if (room.pendingTest) throw new Error(`Aguardando o teste de ${room.pendingTest.nomePersonagem}.`);
  const nome = nomeExibicao(jogador);
  if (room.turnoAtual !== nome) throw new Error(room.turnoAtual ? `Não é sua vez. Turno de ${room.turnoAtual}.` : 'Não é sua vez.');
  return jogador;
}

// Aplica o efeito de uma habilidade de classe e devolve o texto para o Mestre.
function usarHabilidade(room, jogador, habilidadeId) {
  const c = jogador.personagem;
  const h = getHabilidade(c.classeId, habilidadeId, room.ambiente);
  if (!h) throw new Error('Habilidade inválida para sua classe.');
  if (c.recurso.atual < h.custo) throw new Error(`${c.recurso.nome} insuficiente para ${h.nome} (custa ${h.custo}).`);
  c.recurso.atual -= h.custo;
  const efeitos = [];

  if (h.bonus) {
    c.bonusProximoTeste = Math.min((c.bonusProximoTeste || 0) + h.bonus, 5);
    efeitos.push(`+${h.bonus} no próximo teste de ${c.nome}`);
  }
  if (h.bonusGrupo) {
    for (const p of room.personagens) {
      if (p !== jogador && p.personagem) p.personagem.bonusProximoTeste = Math.min((p.personagem.bonusProximoTeste || 0) + h.bonusGrupo, 5);
    }
    efeitos.push(`+${h.bonusGrupo} no próximo teste de cada aliado`);
  }
  if (h.cura) {
    const alvo = room.personagens
      .filter((p) => p.personagem && !p.personagem.morto && p.personagem.hp.atual < p.personagem.hp.max)
      .sort((a, b) => a.personagem.hp.atual / a.personagem.hp.max - b.personagem.hp.atual / b.personagem.hp.max)[0];
    if (alvo) {
      const pc = alvo.personagem;
      const cura = rollDie(6) + h.cura;
      pc.hp.atual = Math.min(pc.hp.max, pc.hp.atual + cura);
      if (pc.hp.atual > 0) levantar(pc);
      efeitos.push(`${pc.nome} recuperou ${cura} PV (${pc.hp.atual}/${pc.hp.max})`);
    } else {
      efeitos.push('ninguém estava ferido');
    }
  }

  const resumo = `✨ ${c.nome} usou ${h.nome} (−${h.custo} ${c.recurso.nome}): ${efeitos.join('; ')}.`;
  return { resumo, paraIA: `[Sistema: ${c.nome} usou a habilidade de classe "${h.nome}" (${h.descricao}). Efeito já aplicado pelo sistema: ${efeitos.join('; ')}. Narre o uso da habilidade; não aplique o efeito de novo.]` };
}

async function sendPlayerAction({ codigo, userId, texto, habilidadeId, itemUid, alvoId, descansar, armaUid }) {
  const room = exigirSala(codigo);
  const jogador = validarAcao(room, userId);
  const nome = nomeExibicao(jogador);
  delete jogador.personagem.ataquePendente; // ataque anterior não usado expira
  const acao = sanitizar(texto, 500);
  if (!acao && !habilidadeId && !itemUid && !descansar && !armaUid) throw new Error('Descreva sua ação.');

  const logAntes = room.logPublico.length;
  const personagemAntes = JSON.stringify(jogador.personagem);
  const outrosAntes = room.personagens.map((p) => JSON.stringify(p.personagem));
  const descansoAntes = room.descansoCena;

  // Efeitos aplicados pelo sistema antes da narração (desfeitos se a IA falhar).
  const efeitos = [];
  if (habilidadeId) efeitos.push(usarHabilidade(room, jogador, habilidadeId));
  if (itemUid) efeitos.push(usarItem(room, jogador, itemUid, alvoId));
  if (armaUid) efeitos.push(declararAtaque(jogador, armaUid));
  if (descansar) efeitos.push(descansarGrupo(room, jogador));

  jogador.pulos = 0;
  if (acao) room.logPublico.push({ autor: nome, tipo: 'jogador', texto: acao, ts: Date.now() });
  for (const e of efeitos) logSistema(room, e.resumo);
  // Foco: o Batedor recupera quando age sem gastar habilidade.
  const c = jogador.personagem;
  if (c.classeId === 'batedor' && !habilidadeId && ganharRecurso(c, 1)) logSistema(room, `${c.nome} +1 ${c.recurso.nome} (${c.recurso.atual}/${c.recurso.max})`);

  const idxAtual = room.personagens.indexOf(jogador);
  const proximo = proximoTurno(room, idxAtual);
  const conteudo = montarMensagem(room, [acao ? `${nome}: ${acao}` : `${nome} age.`, ...efeitos.map((e) => e.paraIA)].join('\n'));

  try {
    await rodadaDoMestre(room, { conteudo, sistemaAdicional: instrucaoProximo(proximo), ator: nome });
  } catch (e) {
    // A habilidade usada também é desfeita (o snapshot cobre só o que a rodada mudou).
    jogador.personagem = JSON.parse(personagemAntes);
    room.personagens.forEach((p, i) => {
      if (p !== jogador && outrosAntes[i] !== 'null') p.personagem = JSON.parse(outrosAntes[i]);
    });
    room.descansoCena = descansoAntes;
    room.logPublico.splice(logAntes);
    logSistema(room, 'O Mestre não conseguiu responder agora. Tente enviar sua ação de novo.');
    tocar(room);
    throw e;
  }
  if (room.status === 'em_jogo' && !room.pendingTest) {
    mudarTurno(room, proximoTurno(room, idxAtual));
    reiniciarTimer(room);
    tocar(room);
  }
}

async function sendRollResult({ codigo, userId }) {
  const room = exigirSala(codigo);
  const jogador = exigirJogador(room, userId);
  if (room.status !== 'em_jogo') throw new Error('A aventura não está em andamento.');
  if (room.processando) throw new Error('O Mestre ainda está narrando. Aguarde.');
  const teste = room.pendingTest;
  if (!teste) throw new Error('Não há nenhum teste pendente.');
  if (atorAtual(room) !== jogador) throw new Error(`Este teste é de ${teste.nomePersonagem}.`);
  if (jogador.afastado) throw new Error('Você está como Afastado. Confirme que voltou para jogar.');

  const c = jogador.personagem;
  // Se a IA falhou depois de uma rolagem, reaproveita o mesmo resultado (sem "rolar de novo").
  const roll = teste.rolagem || rollCheck(c, teste.atributo, teste.dificuldade);
  if (!teste.rolagem) {
    c.bonusProximoTeste = 0;
    teste.rolagem = roll;
  }
  jogador.pulos = 0;
  return resolverTeste(room, jogador, teste, roll);
}

const NOMES_DIFICULDADE = { facil: 'fácil', medio: 'médio', dificil: 'difícil', muito_dificil: 'muito difícil' };

// O jogador desiste da ação antes de rolar: não há rolagem, a vez passa adiante e o
// Mestre narra a desistência e as consequências que a situação pedir (ou nenhuma).
async function desistirTeste({ codigo, userId }) {
  const room = exigirSala(codigo);
  const jogador = exigirJogador(room, userId);
  if (room.status !== 'em_jogo') throw new Error('A aventura não está em andamento.');
  if (room.processando) throw new Error('O Mestre ainda está narrando. Aguarde.');
  const teste = room.pendingTest;
  if (!teste) throw new Error('Não há nenhum teste pendente.');
  if (atorAtual(room) !== jogador) throw new Error(`Este teste é de ${teste.nomePersonagem}.`);
  if (jogador.afastado) throw new Error('Você está como Afastado. Confirme que voltou para jogar.');
  if (teste.rolagem) throw new Error('O dado já foi rolado; não dá mais para desistir.');

  const c = jogador.personagem;
  const label = ATTRIBUTE_LABELS[teste.atributo] || teste.atributo;
  const dif = NOMES_DIFICULDADE[teste.dificuldade] || teste.dificuldade;
  const ataqueAntes = c.ataquePendente;
  delete c.ataquePendente; // o ataque declarado não acontece
  jogador.pulos = 0; // desistir é uma escolha, não inatividade

  const st = stats(room);
  st.desistencias = (st.desistencias || 0) + 1;
  const logAntes = room.logPublico.length;
  logSistema(room, `🏳️ ${c.nome} desistiu da ação (teste de ${label}, ${dif}) e passou a vez.`);
  room.pendingTest = null;
  const conteudo = montarMensagem(room,
    `[Sistema: ${c.nome} DESISTIU da ação que pedia o teste de ${label} (dificuldade ${dif}), antes de rolar o dado. ` +
    'Narre a desistência e, se a situação pedir, as consequências de recuar (o perigo avança, um inimigo aproveita a brecha, ' +
    'uma oportunidade se perde, alguém se decepciona...) — ou nenhuma, se recuar era seguro. ' +
    `Não peça outro teste a ${c.nome} agora: a vez passa ao próximo jogador.]`);
  try {
    await rodadaDoMestre(room, {
      conteudo,
      sistemaAdicional: instrucaoProximo(proximoTurno(room, indiceDe(room, room.turnoAtual))),
      ator: c.nome,
    });
  } catch (e) {
    room.pendingTest = teste;
    if (ataqueAntes) c.ataquePendente = ataqueAntes;
    st.desistencias -= 1;
    room.logPublico.splice(logAntes);
    logSistema(room, 'O Mestre não conseguiu responder agora; o teste continua valendo (role ou desista de novo).');
    reiniciarTimer(room);
    tocar(room);
    throw e;
  }
  if (room.status === 'em_jogo' && !room.pendingTest) {
    avancarTurno(room);
    reiniciarTimer(room);
    tocar(room);
  }
  return { ok: true };
}

// Envia o resultado de um teste ao Mestre. `automatico` = o jogador não rolou a tempo (falha).
async function resolverTeste(room, jogador, teste, roll, { automatico = false } = {}) {
  const c = jogador.personagem;
  const label = ATTRIBUTE_LABELS[teste.atributo] || teste.atributo;
  const dif = NOMES_DIFICULDADE[teste.dificuldade] || teste.dificuldade;
  const dc = DIFFICULTIES[teste.dificuldade] || DIFFICULTIES.medio;
  let veredito;
  let textoLog;
  let textoIA;

  if (automatico) {
    delete c.ataquePendente;
    veredito = 'FALHA';
    textoLog = `🎲 ${c.nome} não rolou ${label} a tempo → FALHA automática`;
    textoIA = `[Resultado do teste de ${c.nome} — ${label}, dificuldade ${dif} (${dc}): o jogador não rolou o dado a tempo → FALHA automática. Narre a falha e siga com a cena.]`;
  } else {
    veredito =
      roll.resultado === 'critico_sucesso' ? 'SUCESSO CRÍTICO' :
      roll.resultado === 'critico_falha' ? 'FALHA CRÍTICA' :
      roll.sucesso ? 'SUCESSO' : 'FALHA';
    const conta = `dado ${roll.die} ${roll.mod >= 0 ? '+' : '−'} ${Math.abs(roll.mod)}${roll.bonus ? ` + bônus ${roll.bonus}` : ''} = ${roll.total}`;
    textoLog = `🎲 ${c.nome} rolou ${label} (${dif}, precisa ${roll.dc}): ${conta} → ${veredito}`;
    textoIA = `[Resultado do teste de ${c.nome} — ${label}, dificuldade ${dif} (${roll.dc}): ${conta} → ${veredito}]`;

    // Ataque com arma: dano rolado pelo servidor (uma vez só; reenvios reaproveitam).
    if (c.ataquePendente && !teste.ataqueResolvido) {
      const atk = c.ataquePendente;
      const item = c.inventario.find((i) => i.uid === atk.uid);
      if (item && roll.sucesso) {
        const dano = rolarDano(c, item, roll.resultado === 'critico_sucesso');
        teste.dano = { arma: item.nome, icone: item.icone, ...dano };
        teste.textoAtaque = `o ataque com ${item.nome} acertou: ${dano.total} de dano (${dano.formula}${dano.critico ? ', crítico: dados dobrados' : ''}). Narre o efeito proporcional ao dano (inimigos comuns aguentam uns 6 a 12; chefes, 20 a 40).`;
      } else if (item) {
        teste.textoAtaque = `o ataque com ${item.nome} errou o alvo.`;
      }
      teste.ataqueResolvido = true;
      delete c.ataquePendente;
    }
    if (teste.dano) textoLog += ` · ${teste.dano.icone} ${teste.dano.arma}: ${teste.dano.total} de dano`;
    if (teste.textoAtaque) textoIA += `\n[Sistema: ${teste.textoAtaque}]`;

    // Anuncia a rolagem na hora (antes da IA): todos veem o dado no modal.
    room.pausaDado = { userId: jogador.userId, ate: Date.now() + PAUSA_DADO_MAX_MS };
    eventos.emit('dado', room, {
      id: `${room.codigo}-${room.historico.length}-${roll.die}-${roll.total}`,
      jogadorId: jogador.id,
      personagem: c.nome,
      atributo: label,
      dificuldade: dif,
      dc: roll.dc,
      die: roll.die,
      mod: roll.mod,
      bonus: roll.bonus,
      total: roll.total,
      resultado: roll.resultado,
      sucesso: roll.sucesso,
      veredito,
      dano: teste.dano || null,
    });
  }

  const st = stats(room);
  if (!teste.contado) {
    teste.contado = true; // reenvios do mesmo resultado não contam de novo
    st.testes += 1;
    if (automatico || !roll.sucesso) st.falhas += 1;
    else st.sucessos += 1;
    if (!automatico && roll.resultado === 'critico_sucesso') st.criticos += 1;
    if (!automatico && roll.resultado === 'critico_falha') st.falhasCriticas += 1;
  }
  const logAntes = room.logPublico.length;
  logSistema(room, textoLog);
  // Teste de abrir baú/gaveta: resolve a busca uma única vez (reenvios reaproveitam).
  if (teste.busca && !teste.buscaResolvida) {
    teste.textoBusca = resolverBusca(room, jogador, teste, !automatico && roll.sucesso);
    teste.buscaResolvida = true;
  }
  if (teste.textoBusca) textoIA += `\n[Sistema: ${teste.textoBusca} Narre isso; não dê itens além dos listados.]`;
  room.pendingTest = null;
  const conteudo = montarMensagem(room, textoIA);

  try {
    await rodadaDoMestre(room, {
      conteudo,
      sistemaAdicional: instrucaoProximo(proximoTurno(room, indiceDe(room, room.turnoAtual))),
      ator: c.nome,
    });
  } catch (e) {
    // Volta o teste (com prazo novo); se já tinha rolado, guarda a rolagem para reenviar.
    room.pendingTest = { ...teste, rolagem: automatico ? undefined : roll, prazo: null };
    room.logPublico.splice(logAntes);
    logSistema(room, automatico
      ? 'O Mestre não conseguiu responder agora; o teste continua valendo.'
      : 'O Mestre não conseguiu responder agora. Clique em rolar de novo para reenviar o mesmo resultado.');
    reiniciarTimer(room);
    tocar(room);
    throw e;
  }
  if (room.status === 'em_jogo' && !room.pendingTest) {
    avancarTurno(room);
    reiniciarTimer(room);
    tocar(room);
  }
  return roll;
}


// ---------------------------------------------------------------------------
// Itens, descanso e pontos de busca
// ---------------------------------------------------------------------------
function juntarLista(partes) {
  if (partes.length <= 1) return partes.join('');
  return `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}`;
}

function rolarCura([n, faces, base]) {
  let v = base;
  for (let i = 0; i < n; i++) v += rollDie(faces);
  return v;
}

function usarItem(room, jogador, uid, alvoId) {
  const c = jogador.personagem;
  const idx = c.inventario.findIndex((i) => i.uid === uid);
  if (idx < 0) throw new Error('Item não encontrado no seu inventário.');
  const item = c.inventario[idx];
  const def = ITENS[item.id];
  if (!def || def.tipo !== 'consumivel') throw new Error('Só itens consumíveis podem ser usados (artefatos se equipam).');
  const alvo = alvoId ? room.personagens.find((p) => p.id === alvoId && p.personagem) : jogador;
  if (!alvo) throw new Error('Escolha um aliado válido.');
  if (alvo.personagem.morto) throw new Error(`${alvo.personagem.nome} está morto; nenhum item o traz de volta.`);
  const pc = alvo.personagem;
  const ef = def.efeito;
  const efeitos = [];

  if (ef.levantar) {
    if (pc.hp.atual < ef.levantar) {
      const antes = pc.hp.atual;
      pc.hp.atual = Math.min(pc.hp.max, ef.levantar);
      efeitos.push(`+${pc.hp.atual - antes} PV (${pc.hp.atual}/${pc.hp.max})`);
    } else efeitos.push('já estava de pé');
  }
  if (ef.cura) {
    const antes = pc.hp.atual;
    pc.hp.atual = Math.min(pc.hp.max, antes + rolarCura(ef.cura));
    efeitos.push(`+${pc.hp.atual - antes} PV (${pc.hp.atual}/${pc.hp.max})`);
  }
  if (ef.recurso) efeitos.push(`+${ganharRecurso(pc, ef.recurso)} ${pc.recurso.nome} (${pc.recurso.atual}/${pc.recurso.max})`);
  if (ef.bonus) {
    pc.bonusProximoTeste = Math.min((pc.bonusProximoTeste || 0) + ef.bonus, 5);
    efeitos.push(`+${ef.bonus} no próximo teste`);
  }
  if (pc.hp.atual > 0 && levantar(pc)) efeitos.push(`${pc.nome} se levanta`);
  c.inventario.splice(c.inventario.indexOf(item), 1);
  // Fé: o Guardião recupera ao cuidar de um aliado.
  if (c.classeId === 'guardiao' && alvo !== jogador && ganharRecurso(c, 1)) efeitos.push(`${c.nome} +1 ${c.recurso.nome}`);

  const quem = alvo === jogador ? '' : ` em ${pc.nome}`;
  return {
    resumo: `${item.icone} ${c.nome} usou ${item.nome}${quem}: ${efeitos.join(', ')}.`,
    paraIA: `[Sistema: ${c.nome} usou o item "${item.nome}"${quem} (${descricaoItem(item.id, ambienteDoJogador(jogador))}). Efeito já aplicado pelo sistema: ${efeitos.join(', ')}. Narre o uso; não aplique o efeito de novo.]`,
  };
}

function ambienteDoJogador(jogador) {
  for (const r of rooms.values()) if (r.personagens.includes(jogador)) return r.ambiente;
  return 'fantasia';
}

// Ataque com arma: o próximo teste do jogador ganha o bônus da arma (no atributo
// dela) e, se acertar, o servidor rola o dano.
function declararAtaque(jogador, uid) {
  const c = jogador.personagem;
  const item = c.inventario.find((i) => i.uid === uid);
  if (!item || item.tipo !== 'arma' || !ITENS[item.id]) throw new Error('Arma não encontrada no seu inventário.');
  if (!item.equipado) {
    c.inventario.forEach((i) => i.tipo === 'arma' && (i.equipado = false));
    item.equipado = true; // atacar com uma arma já a empunha
  }
  const a = ITENS[item.id].arma;
  c.ataquePendente = { uid: item.uid, id: item.id, nome: item.nome, atributo: a.atributo, bonus: a.bonus };
  const label = ATTRIBUTE_LABELS[a.atributo];
  return {
    resumo: `${item.icone} ${c.nome} ataca com ${item.nome} (${label} +${a.bonus}, dano ${a.dano[0]}d${a.dano[1]}).`,
    paraIA: `[Sistema: ${c.nome} ataca com a arma "${item.nome}" (${descricaoItem(item.id, ambienteDoJogador(jogador))}${a.distancia ? ' Arma de distância.' : ''}). Peça um TESTE de ${label} para o ataque; o sistema soma o bônus da arma e, se acertar, rola o dano e informa o valor.]`,
  };
}

// Descanso: uma vez por cena; o grupo ativo recupera metade de PV e recurso.
function descansarGrupo(room, jogador) {
  const chave = semAcento(room.cena ? room.cena.local : 'inicio');
  if (room.descansoCena === chave) throw new Error('O grupo já descansou nesta cena. Mudem de lugar para descansar de novo.');
  room.descansoCena = chave;
  const ganhos = [];
  for (const p of room.personagens) {
    const pc = p.personagem;
    if (!pc || !ativo(p)) continue; // ativo() já exclui os mortos
    const hpAntes = pc.hp.atual;
    pc.hp.atual = Math.min(pc.hp.max, pc.hp.atual + Math.ceil(pc.hp.max / 2));
    const rec = ganharRecurso(pc, Math.ceil(pc.recurso.max / 2));
    if (pc.hp.atual > 0) levantar(pc);
    const partes = [];
    if (pc.hp.atual > hpAntes) partes.push(`+${pc.hp.atual - hpAntes} PV`);
    if (rec) partes.push(`+${rec} ${pc.recurso.nome}`);
    if (partes.length) ganhos.push(`${pc.nome} ${partes.join(' ')}`);
  }
  const lista = ganhos.join(' · ') || 'todos já estavam inteiros';
  return {
    resumo: `🏕️ ${jogador.personagem.nome} propôs um descanso. ${lista}.`,
    paraIA: `[Sistema: o grupo parou para descansar (recuperação já aplicada pelo sistema: ${lista}). Narre o descanso; se o lugar não for seguro, pode terminar com uma interrupção, sem desfazer a recuperação.]`,
  };
}

function iconeBusca(room, tipo) {
  const vestes = (getAmbiente(room.ambiente).busca || {})[tipo];
  return vestes ? vestes[1] : (TABELAS_BUSCA[tipo] || TABELAS_BUSCA.bau).icone;
}

// Abre um ponto de busca: o servidor sorteia o conteúdo e entrega ao jogador.
function abrirBuscavel(room, jogador, b) {
  const c = jogador.personagem;
  const saque = sortearSaque(b.tipo);
  const itens = saque.itens.map((id) => criarItem(id, room.ambiente)).slice(0, Math.max(0, 30 - c.inventario.length));
  c.inventario.push(...itens);
  c.moedas = (c.moedas || 0) + saque.moedas;
  stats(room).itens += itens.length;
  stats(room).moedas += saque.moedas;
  b.aberto = true;
  b.abertoPor = c.nome;
  const partes = itens.map((i) => `${i.nome}${i.raridade !== 'comum' ? ` (${RARIDADES[i.raridade].nome.toLowerCase()})` : ''}`);
  if (saque.moedas) partes.push(`${saque.moedas} moedas`);
  const lista = partes.length ? juntarLista(partes) : 'nada de valor';
  const icone = iconeBusca(room, b.tipo);
  logSistema(room, `${icone} ${c.nome} abriu ${b.nome}: ${lista}.`);
  eventos.emit('saque', room, {
    jogadorId: jogador.id,
    personagem: c.nome,
    local: b.nome,
    icone,
    itens: itens.map((i) => ({ nome: i.nome, raridade: i.raridade, icone: i.icone, tipo: i.tipo, descricao: descricaoItem(i.id, room.ambiente) })),
    moedas: saque.moedas,
  });
  return `encontrou ${lista} (já adicionado ao inventário pelo sistema)`;
}

// Procurar num ponto de busca: livre abre na hora; trancado/armadilha pede um teste.
async function procurar({ codigo, userId, buscavelId }) {
  const room = exigirSala(codigo);
  const jogador = validarAcao(room, userId);
  const b = (room.buscaveis || []).find((x) => x.id === buscavelId);
  if (!b) throw new Error('Esse lugar não está mais na cena.');
  if (b.aberto) throw new Error(`${b.nome} já foi revistado por ${b.abertoPor}.`);
  const nome = nomeExibicao(jogador);
  jogador.pulos = 0;

  if (b.estado !== 'livre') {
    const label = ATTRIBUTE_LABELS[b.atributo] || b.atributo;
    room.pendingTest = { nomePersonagem: nome, atributo: b.atributo, dificuldade: b.dificuldade, busca: b.id };
    logSistema(room, `🔍 ${nome} tenta ${b.estado === 'armadilha' ? 'desarmar e abrir' : 'abrir'} ${b.nome}: teste de ${label} (${NOMES_DIFICULDADE[b.dificuldade]}).`);
    reiniciarTimer(room);
    tocar(room);
    return;
  }

  const logAntes = room.logPublico.length;
  const personagemAntes = JSON.stringify(jogador.personagem);
  const achado = abrirBuscavel(room, jogador, b);
  const idxAtual = room.personagens.indexOf(jogador);
  const conteudo = montarMensagem(room, `${nome} procura em ${b.nome}.\n[Sistema: ${nome} ${achado}. Narre a descoberta; não dê itens além dos listados.]`);
  try {
    await rodadaDoMestre(room, { conteudo, sistemaAdicional: instrucaoProximo(proximoTurno(room, idxAtual)), ator: nome });
  } catch (e) {
    jogador.personagem = JSON.parse(personagemAntes);
    b.aberto = false;
    b.abertoPor = null;
    room.logPublico.splice(logAntes);
    logSistema(room, 'O Mestre não conseguiu responder agora. Tente procurar de novo.');
    tocar(room);
    throw e;
  }
  if (room.status === 'em_jogo' && !room.pendingTest) {
    mudarTurno(room, proximoTurno(room, idxAtual));
    reiniciarTimer(room);
    tocar(room);
  }
}

// Resultado do teste de abrir um ponto de busca (texto para o Mestre narrar).
function resolverBusca(room, jogador, teste, sucesso) {
  const b = (room.buscaveis || []).find((x) => x.id === teste.busca);
  const c = jogador.personagem;
  if (!b || b.aberto) return '';
  if (sucesso) return `${c.nome} conseguiu abrir ${b.nome} e ${abrirBuscavel(room, jogador, b)}.`;
  if (b.estado === 'armadilha') {
    const dano = rollDie(4) + 1;
    c.hp.atual = Math.max(0, c.hp.atual - dano);
    logSistema(room, `💥 A armadilha de ${b.nome} disparou: ${c.nome} −${dano} PV (${c.hp.atual}/${c.hp.max}).`);
    if (c.hp.atual === 0 && !c.caido) cair(room, c);
    return `A armadilha de ${b.nome} disparou e feriu ${c.nome} (−${dano} PV), mas o conteúdo ficou acessível: ${c.nome} ${abrirBuscavel(room, jogador, b)}.`;
  }
  logSistema(room, `🔒 ${b.nome} continua trancado (dá para tentar de novo depois).`);
  return `${c.nome} não conseguiu abrir ${b.nome}; continua trancado e pode ser tentado de novo depois.`;
}

// Ações livres (não gastam a vez): dar, descartar, equipar.
function exigirLivre(room, userId) {
  const j = exigirJogador(room, userId);
  if (room.status !== 'em_jogo') throw new Error('A aventura não está em andamento.');
  if (room.processando) throw new Error('Aguarde o Mestre terminar de narrar.');
  if (!j.personagem) throw new Error('Você ainda não tem personagem.');
  return j;
}

function pegarItem(c, uid) {
  const idx = c.inventario.findIndex((i) => i.uid === uid);
  if (idx < 0) throw new Error('Item não encontrado no seu inventário.');
  return idx;
}

function darItem({ codigo, userId, uid, alvoId }) {
  const room = exigirSala(codigo);
  const j = exigirLivre(room, userId);
  const alvo = room.personagens.find((p) => p.id === alvoId && p.personagem && p !== j);
  if (!alvo) throw new Error('Escolha um aliado para receber o item.');
  if (alvo.personagem.inventario.length >= 30) throw new Error(`O inventário de ${alvo.personagem.nome} está cheio.`);
  const c = j.personagem;
  const [item] = c.inventario.splice(pegarItem(c, uid), 1);
  if (item.equipado) {
    aplicarPassivo(c, item, false);
    item.equipado = false;
  }
  alvo.personagem.inventario.push(item);
  let extra = '';
  if (c.classeId === 'guardiao' && ganharRecurso(c, 1)) extra = ` (${c.nome} +1 ${c.recurso.nome})`;
  logSistema(room, `🤝 ${c.nome} deu ${item.nome} para ${alvo.personagem.nome}.${extra}`);
  eventos.emit('aviso', room, { icone: '🤝', texto: `${c.nome} deu ${item.icone !== '•' ? item.icone + ' ' : ''}${item.nome} para ${alvo.personagem.nome}` });
  tocar(room);
}

function descartarItem({ codigo, userId, uid }) {
  const room = exigirSala(codigo);
  const c = exigirLivre(room, userId).personagem;
  const [item] = c.inventario.splice(pegarItem(c, uid), 1);
  if (item.equipado) aplicarPassivo(c, item, false);
  logSistema(room, `🗑️ ${c.nome} descartou ${item.nome}.`);
  eventos.emit('aviso', room, { icone: '🗑️', texto: `${c.nome} descartou ${item.nome}` });
  tocar(room);
}

function equiparItem({ codigo, userId, uid }) {
  const room = exigirSala(codigo);
  const c = exigirLivre(room, userId).personagem;
  const item = c.inventario[pegarItem(c, uid)];
  if (item.tipo === 'arma' && ITENS[item.id]) {
    // Uma arma por vez: empunhar troca a anterior.
    if (item.equipado) {
      item.equipado = false;
      logSistema(room, `${c.nome} guardou ${item.icone} ${item.nome}.`);
    } else {
      c.inventario.forEach((i) => i.tipo === 'arma' && (i.equipado = false));
      item.equipado = true;
      logSistema(room, `${c.nome} empunhou ${item.icone} ${item.nome} (${descricaoItem(item.id, room.ambiente)})`);
    }
    return tocar(room);
  }
  if (item.tipo !== 'artefato' || !ITENS[item.id]) throw new Error('Só artefatos e armas podem ser equipados.');
  if (item.equipado) {
    aplicarPassivo(c, item, false);
    item.equipado = false;
    logSistema(room, `${c.nome} guardou ${item.icone} ${item.nome}.`);
  } else {
    if (equipados(c).length >= MAX_EQUIPADOS) throw new Error(`Você já tem ${MAX_EQUIPADOS} artefatos equipados. Guarde um antes.`);
    item.equipado = true;
    aplicarPassivo(c, item, true);
    logSistema(room, `${c.nome} equipou ${item.icone} ${item.nome}: ${descricaoItem(item.id, room.ambiente)}`);
  }
  tocar(room);
}

async function encerrarAventura({ codigo, userId }) {
  const room = exigirSala(codigo);
  exigirHost(room, userId);
  if (room.status !== 'em_jogo') throw new Error('A aventura não está em andamento.');
  if (room.processando) throw new Error('O Mestre ainda está narrando. Aguarde.');
  room.pendingTest = null;
  await rodadaDoMestre(room, {
    conteudo: montarMensagem(room, '[Sistema: o grupo decidiu encerrar a sessão aqui, sem concluir a missão. Narre agora um epílogo curto e marcante, amarrando o que aconteceu e o destino de cada personagem, e inclua a tag [FIM].]'),
  });
  if (room.status !== 'encerrada') finalizar(room, 'interrompida');
  tocar(room);
}

// ---------------------------------------------------------------------------
// Estado público e listagens
// ---------------------------------------------------------------------------
function roomPublicState(room, { comLog = false } = {}) {
  garantirCores(room);
  const host = hostEfetivo(room);
  const estado = {
    codigo: room.codigo,
    tema: room.tema,
    aventuraTitulo: room.aventuraTitulo,
    publica: room.publica,
    status: room.status,
    hostId: host ? host.id : null,
    processando: room.processando,
    pendingTest: room.pendingTest
      ? { nomePersonagem: room.pendingTest.nomePersonagem, atributo: room.pendingTest.atributo, dificuldade: room.pendingTest.dificuldade, jaRolado: !!room.pendingTest.rolagem }
      : null,
    cena: room.cena,
    turnoAtual: room.turnoAtual,
    turnoRestanteMs: room.turnoExpiraEm ? Math.max(0, room.turnoExpiraEm - Date.now()) : null,
    dadoRestanteMs: room.pendingTest && room.pendingTest.prazo ? Math.max(0, room.pendingTest.prazo - Date.now()) : null,
    pausadoPorDado: !!room.pausaDado,
    sugestoes: room.sugestoes,
    rodada: room.rodada || 1,
    config: cfg(room),
    musica: musicaDoAmbiente(room),
    ambiente: room.ambiente || 'fantasia',
    humorLiberadoEm: humorLiberadoEm(room),
    missao: room.missao,
    resultado: room.resultado || null,
    estatisticas: room.status === 'encerrada' ? stats(room) : null,
    descansoDisponivel: room.descansoCena !== semAcento(room.cena ? room.cena.local : 'inicio'),
    buscaveis: (room.buscaveis || []).map((b) => ({
      id: b.id, nome: b.nome, tipo: b.tipo, estado: b.estado, atributo: b.atributo,
      dificuldade: b.dificuldade, aberto: b.aberto, abertoPor: b.abertoPor,
      icone: iconeBusca(room, b.tipo),
    })),
    personagens: room.personagens.map((p) => ({
      id: p.id,
      nome: p.nome,
      conectado: p.conectado,
      afastado: p.afastado,
      pulos: p.pulos,
      bot: !!p.bot,
      tracos: p.bot ? p.botTracos || [] : undefined,
      personagem: p.personagem,
    })),
    logTamanho: room.logPublico.length,
  };
  if (comLog) {
    estado.log = room.logPublico;
    estado.chatGeral = room.chatGeral;
  }
  return estado;
}

function resumoSala(room) {
  const host = room.personagens.find((p) => p.userId === room.hostUserId);
  return {
    codigo: room.codigo,
    titulo: room.aventuraTitulo || 'Aventura personalizada',
    tema: room.aventuraTitulo ? '' : room.tema.slice(0, 160),
    status: room.status,
    anfitriao: host ? host.nome : '?',
    jogadores: room.personagens.length,
    online: room.personagens.filter((p) => p.conectado).length,
    objetivo: room.missao ? room.missao.objetivo : null,
    etapasFeitas: room.missao ? room.missao.etapas.filter((e) => e.concluida).length : 0,
    etapasTotal: room.missao ? room.missao.etapas.length : 0,
    resultado: room.resultado || null,
    atualizadoEm: room.atualizadoEm,
  };
}

function listarJogosAbertos() {
  return [...rooms.values()]
    .filter((r) => r.publica && r.status !== 'encerrada' && r.personagens.length < 8 && r.personagens.some((p) => p.conectado))
    .sort((a, b) => b.atualizadoEm - a.atualizadoEm)
    .slice(0, 50)
    .map(resumoSala);
}

function listarMinhasPartidas(userId) {
  return [...rooms.values()]
    .filter((r) => r.personagens.some((p) => p.userId === userId))
    .sort((a, b) => b.atualizadoEm - a.atualizadoEm)
    .slice(0, 50)
    .map((r) => {
      const eu = r.personagens.find((p) => p.userId === userId);
      return { ...resumoSala(r), meuPersonagem: eu.personagem ? `${eu.personagem.nome} — ${eu.personagem.classeNome} Nv ${eu.personagem.nivel}` : null };
    });
}

// ---------------------------------------------------------------------------
// Carga do disco e limpeza
// ---------------------------------------------------------------------------
function carregarDoDisco() {
  for (const room of storage.carregarSalas()) {
    if (!room || !room.codigo) continue;
    if (Date.now() - (room.atualizadoEm || 0) > INATIVIDADE_SALA_MS) {
      storage.apagarSala(room.codigo);
      continue;
    }
    room.processando = false;
    room.turnoExpiraEm = null;
    room.pausaDado = null;
    if (room.pendingTest) room.pendingTest.prazo = null; // relógio do dado recomeça quando alguém voltar
    room.notasPendentes = room.notasPendentes || [];
    room.buscaveis = room.buscaveis || [];
    for (const p of room.personagens) {
      p.conectado = false;
      p.socketId = null;
      normalizarPersonagem(p.personagem, room.ambiente); // fichas antigas: inventário em texto vira itens
    }
    rooms.set(room.codigo, room);
  }
  console.log(`[salas] ${rooms.size} sala(s) restaurada(s) do disco.`);
}

setInterval(() => {
  const agora = Date.now();
  for (const room of rooms.values()) {
    const alguemOnline = room.personagens.some((p) => p.conectado);
    if (!alguemOnline && agora - room.atualizadoEm > INATIVIDADE_SALA_MS) {
      pararTimer(room);
      rooms.delete(room.codigo);
      storage.apagarSala(room.codigo);
      imagens.apagarSala(room.codigo);
    }
  }
}, 60 * 60 * 1000).unref();

carregarDoDisco();

module.exports = {
  mudarCor,
  _botAgir: (codigo) => botAgir(codigo),
  _limparTema: limparTema,
  desistirTeste,
  eventos,
  TEMPO_TURNO_MS,
  TEMPO_DADO_MS,
  MAX_PULOS,
  createRoom,
  getRoom,
  joinRoom,
  disconnectSocket,
  setCharacter,
  addChatGeral,
  resolvePlayerSocket,
  jogadorDoUsuario,
  startAdventure,
  sendPlayerAction,
  sendRollResult,
  encerrarAventura,
  passarVez,
  confirmarVolta,
  fecharDado,
  procurar,
  configurarSala,
  OPCOES_TEMPO_TURNO,
  OPCOES_TEMPO_DADO,
  concluirEtapaPeloAnfitriao,
  darItem,
  descartarItem,
  equiparItem,
  registrarAtividade,
  roomPublicState,
  listarJogosAbertos,
  listarMinhasPartidas,
  limparTags,
  _detectarTeste: detectarTeste,
  _usarItem: usarItem,
  aplicarEstados,
};
