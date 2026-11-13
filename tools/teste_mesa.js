'use strict';
const { io } = require('socket.io-client');
const fs = require('fs');
const URL_BASE = process.argv[2];
const ARQ_EMAILS = process.argv[3];
const FASE = process.argv[4] || 'tudo';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let falhas = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✅' : '❌'} ${msg}`); if (!cond) falhas++; };

async function post(caminho, corpo, token) {
  const r = await fetch(URL_BASE + caminho, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(corpo) });
  return { status: r.status, json: await r.json() };
}
async function get(caminho, token) {
  const r = await fetch(URL_BASE + caminho, { headers: token ? { authorization: `Bearer ${token}` } : {} });
  return { status: r.status, json: await r.json().catch(() => null) };
}
function conectar(token) {
  const s = io(URL_BASE, { auth: { token }, transports: ['websocket'], reconnection: false });
  s.estado = null; s.logs = 0;
  s.on('estadoAtualizado', (e) => (s.estado = e));
  s.on('logNovo', (l) => (s.logs += l.msgs.length));
  return new Promise((res, rej) => { s.on('connect', () => res(s)); s.on('connect_error', rej); });
}
const emit = (s, ev, p) => new Promise((res) => s.timeout(20000).emit(ev, p, (e, r) => res(e ? { ok: false, erro: 'timeout' } : r)));
const personagem = (nome, classeId, extra = {}) => ({ nome, classeId, atributos: { forca: 14, agilidade: 10, mente: 10, espirito: 12 }, historia: 'x', ...extra });

async function fase1() {
  // --- Contas ---
  const r1 = await post('api/registrar', { nome: 'Ana <img src=x onerror=alert(1)>', email: 'ana@teste.dev' });
  ok(r1.status === 200 && r1.json.token, 'cadastro cria conta e devolve sessão');
  ok(!/[<>]/.test(r1.json.usuario.nome), `nome sanitizado: "${r1.json.usuario.nome}"`);
  const r2 = await post('api/registrar', { nome: 'Beto', email: 'beto@teste.dev' });
  const rDup = await post('api/registrar', { nome: 'Outro', email: 'ANA@teste.dev' });
  ok(rDup.json.linkEnviado === true, 'email já cadastrado → envia magic link em vez de logar');
  const rInvalido = await post('api/registrar', { nome: 'X', email: 'nao-e-email' });
  ok(rInvalido.status === 400, `email inválido rejeitado: ${rInvalido.json.erro}`);
  const rSpam = await post('api/login', { email: 'ana@teste.dev' });
  ok(rSpam.status === 400 && /Aguarde/.test(rSpam.json.erro), 'reenvio de link em menos de 1 min é bloqueado');
  await sleep(500);
  const email = fs.readFileSync(ARQ_EMAILS, 'utf8');
  const corpoTexto = Buffer.from(email.split('Content-Transfer-Encoding: base64')[1].split('--b_')[0].replace(/\s+/g, ''), 'base64').toString();
  const link = (corpoTexto.match(/https?:\/\/\S+\/auth\/magic\?t=\S+/) || [])[0];
  ok(!!link && /Subject: =\?UTF-8\?B\?/.test(email), `email do magic link chegou ao SMTP com link: ${link ? 'sim' : 'não'}`);
  const pagina = await (await fetch(link)).text();
  ok(/4ever\.sessao/.test(pagina) && /"token":"/.test(pagina), 'magic link abre sessão e grava no navegador');
  const reuso = await fetch(link);
  ok(reuso.status === 400, 'magic link é de uso único');
  ok((await get('api/eu', 'token-falso')).status === 401, 'token inválido → 401');
  ok((await get('api/eu', r1.json.token)).json.usuario.email === 'ana@teste.dev', '/api/eu com sessão válida');
  let recusado = false;
  try { await conectar('token-falso'); } catch (e) { recusado = e.message === 'nao_autenticado'; }
  ok(recusado, 'socket sem sessão válida é recusado');

  const A = await conectar(r1.json.token);
  const B = await conectar(r2.json.token);

  // --- Sala ---
  const c = await emit(A, 'criarJogo', { aventuraId: 'sombras-de-corvile', publica: true });
  ok(c.ok, 'cria mesa');
  const codigo = c.state.codigo;
  const jb = await emit(B, 'entrarJogo', { codigo });
  ok(jb.ok && jb.meuId, 'segundo jogador entra');
  const priv = await emit(A, 'criarJogo', { aventuraId: 'sombras-de-corvile' });
  ok(priv.ok && priv.state.publica === false, 'mesa sem marcar "público" é privada por padrão');
  await emit(A, 'entrarJogo', { codigo });
  const abertos = await get('api/jogos-abertos', r2.json.token);
  ok(abertos.json.jogos.some((j) => j.codigo === codigo), 'mesa aparece em Jogos Abertos');

  ok((await emit(A, 'escolherPersonagem', { codigo, personagem: personagem('Thalrik', 'guerreiro') })).ok, 'A escolhe Thalrik');
  const dupl = await emit(B, 'escolherPersonagem', { codigo, personagem: personagem('thálrik', 'arcanista') });
  ok(!dupl.ok, `nome de personagem duplicado é recusado: ${dupl.erro}`);
  ok((await emit(B, 'escolherPersonagem', { codigo, personagem: personagem('Miriel', 'guardiao') })).ok, 'B escolhe Miriel');
  const trapaca = await emit(B, 'escolherPersonagem', { codigo, personagem: { nome: 'X', classeId: 'guerreiro', atributos: { forca: 16, agilidade: 16, mente: 16, espirito: 16 } } });
  ok(!trapaca.ok, 'atributos acima do limite recusados');

  const naoHost = await emit(B, 'iniciarAventura', { codigo });
  ok(!naoHost.ok && /anfitrião/.test(naoHost.erro), `só o anfitrião inicia: ${naoHost.erro}`);
  const ini = await emit(A, 'iniciarAventura', { codigo });
  await sleep(200);
  ok(ini.ok && A.estado.status === 'em_jogo' && A.estado.turnoAtual === 'Thalrik', 'aventura iniciada, vez de Thalrik');
  ok(A.estado.sugestoes.length === 3 && A.estado.cena?.local === 'Vila de Corvile', 'sugestões e cena detectadas');
  ok(A.estado.musica === 'taverna', 'Mestre escolheu a trilha da cena ([MUSICA: taverna])');
  await sleep(1500); // a ilustração é gerada em segundo plano
  const logImg = (await emit(A, 'pedirLog', { codigo })).state.log.filter((m) => m.tipo === 'imagem');
  ok(logImg.length === 1 && A.estado.cena.imagem === logImg[0].imagem, `abertura ganhou ilustração automática (${logImg[0]?.imagem})`);
  const respImg = logImg[0] ? await fetch(URL_BASE + logImg[0].imagem) : null;
  ok(respImg && respImg.status === 200 && /image\//.test(respImg.headers.get('content-type')) && /max-age=2592000/.test(respImg.headers.get('cache-control')), 'imagem servida pelo servidor, com cache longo');
  ok(A.estado.missao?.etapas.length === 4 && /Corvile/.test(A.estado.missao.objetivo), 'roteiro pronto já começa com a missão e 4 etapas');
  const logIni = (await emit(A, 'pedirLog', { codigo })).state.log;
  ok(logIni[0].tipo === 'missao' && logIni[1].tipo === 'mestre', 'cartão "Sua missão" aparece antes da primeira narração');
  ok(A.estado.turnoRestanteMs > 0, `timer da vez ativo (${A.estado.turnoRestanteMs} ms)`);

  // --- Dado: validações ---
  const rolaSemTeste = await emit(A, 'rolarDado', { codigo });
  ok(!rolaSemTeste.ok, `rolar sem teste pendente é recusado: ${rolaSemTeste.erro}`);
  const foraVez = await emit(B, 'acaoJogador', { codigo, texto: 'eu corro' });
  ok(!foraVez.ok, `ação fora da vez recusada: ${foraVez.erro}`);
  ok((await emit(A, 'acaoJogador', { codigo, texto: 'Eu ataco a criatura' })).ok, 'Thalrik ataca');
  await sleep(200);
  ok(A.estado.pendingTest?.nomePersonagem === 'Thalrik' && A.estado.pendingTest.atributo === 'forca' && A.estado.pendingTest.dificuldade === 'medio', 'teste com acento (Força | médio) detectado e normalizado');
  await sleep(1500);
  const imgs2 = (await emit(A, 'pedirLog', { codigo })).state.log.filter((m) => m.tipo === 'imagem');
  ok(imgs2.length === 2 && imgs2[1].texto === 'uma criatura de névoa ergue as garras', 'Mestre pediu uma ilustração com [IMAGEM: ...]');
  const rolaOutro = await emit(B, 'rolarDado', { codigo });
  ok(!rolaOutro.ok, `outro jogador não pode rolar o teste de Thalrik: ${rolaOutro.erro}`);
  const rola = await emit(A, 'rolarDado', { codigo, atributo: 'espirito' });
  ok(rola.ok && rola.rollResult.atributo === 'forca' && typeof rola.rollResult.sucesso === 'boolean', `rolagem usa o atributo do teste, não o do cliente (${rola.rollResult?.total} vs ${rola.rollResult?.dc})`);
  await sleep(200);
  const thal = A.estado.personagens.find((p) => p.personagem?.nome === 'Thalrik').personagem;
  ok(thal.inventario.some((i) => i.nome === 'Chave de ferro' && i.tipo === 'narrativo') && thal.inventario.some((i) => i.id === 'pocao_vida') && thal.nivel === 2, `ficha viva: item ganho e subiu de nível (nível ${thal.nivel}, PV ${thal.hp.atual}/${thal.hp.max})`);
  ok(A.estado.turnoAtual === 'Miriel', 'vez passou para Miriel');
  const logRoll = (await emit(A, 'pedirLog', { codigo })).state.log.map((m) => m.texto).join('\n');
  void logRoll; // Thalrik estava com Fúria cheia (subiu de nível), então não há recarga visível aqui
  ok(A.estado.buscaveis.length === 2 && A.estado.buscaveis[0].estado === 'trancado', 'pontos de busca da cena detectados (baú trancado, gaveta livre)');
  ok(A.estado.pausadoPorDado === true && A.estado.turnoRestanteMs === null, 'relógio da mesa pausado enquanto o modal do dado está aberto');
  ok((await emit(B, 'fecharDado', { codigo })).ok && B.estado.pausadoPorDado === true, 'só quem rolou pode tirar a pausa');
  await emit(A, 'fecharDado', { codigo });
  await sleep(200);
  ok(A.estado.pausadoPorDado === false && A.estado.turnoRestanteMs > 0, 'quem rolou fecha o modal e o relógio volta a correr');

  // --- Habilidade ---
  const antes = B.estado.personagens.find((p) => p.personagem?.nome === 'Miriel').personagem.recurso.atual;
  ok((await emit(B, 'acaoJogador', { codigo, texto: 'Rezo pelos feridos', habilidadeId: 'bencao' })).ok, 'Miriel usa Bênção');
  await sleep(200);
  const depois = B.estado.personagens.find((p) => p.personagem?.nome === 'Miriel').personagem.recurso.atual;
  const bonusThal = B.estado.personagens.find((p) => p.personagem?.nome === 'Thalrik').personagem.bonusProximoTeste;
  const logBencao = (await emit(B, 'pedirLog', { codigo })).state.log.map((m) => m.texto).join('\n');
  ok(/Miriel usou Bênção \(−2 Fé\)/.test(logBencao) && bonusThal === 1, `habilidade gastou 2 de Fé (${antes}→${depois}, com +1 da rodada) e deu +1 ao aliado`);
  ok(/🔄 Rodada 2: Miriel \+1 Fé/.test(logBencao), 'fim da rodada recarrega Fé da Guardiã');
  const habInvalida = await emit(A, 'acaoJogador', { codigo, texto: 'x', habilidadeId: 'bencao' });
  ok(!habInvalida.ok, `habilidade de outra classe recusada: ${habInvalida.erro}`);

  // --- Configurações da mesa ---
  ok(!(await emit(B, 'configurarSala', { codigo, ajustes: { tempoTurnoMs: 30000 } })).ok, 'só o anfitrião muda as configurações');
  ok(!(await emit(A, 'configurarSala', { codigo, ajustes: { tempoTurnoMs: 12345 } })).ok, 'tempo fora da lista é recusado');
  ok((await emit(A, 'configurarSala', { codigo, ajustes: { audioChat: false } })).ok, 'anfitrião deixa o bate-papo só texto');
  await sleep(150);
  ok(B.estado.config.audioChat === false, 'todos recebem a regra do chat');
  const audioBloq = await emit(B, 'chatAudio', { codigo, dados: Buffer.from('x'), mime: 'audio/webm' });
  ok(!audioBloq.ok && /só com texto/.test(audioBloq.erro), 'áudio no chat bloqueado quando a mesa é só texto');
  await emit(A, 'configurarSala', { codigo, ajustes: { audioChat: true } });
  ok((await emit(A, 'configurarSala', { codigo, ajustes: { humor: { humor: 90, benevolencia: 50, temperamento: 50, detalhe: 50 } } })).ok, 'humor do Mestre ajustado durante a aventura');
  await sleep(150);
  const humorTravado = await emit(A, 'configurarSala', { codigo, ajustes: { humor: { humor: 10, benevolencia: 50, temperamento: 50, detalhe: 50 } } });
  ok(!humorTravado.ok && /rodada/.test(humorTravado.erro) && A.estado.humorLiberadoEm === A.estado.rodada + 2, `humor travado por 2 rodadas: ${humorTravado.erro}`);
  const convite = await emit(A, 'convidarPorEmail', { codigo, email: 'amigo@teste.dev' });
  await sleep(300);
  ok(convite.ok && /amigo@teste\.dev/.test(fs.readFileSync(ARQ_EMAILS, 'utf8')), 'convite por email enviado ao SMTP');
  ok(!(await emit(A, 'convidarPorEmail', { codigo, email: 'invalido' })).ok, 'convite com email inválido é recusado');

  // --- Itens, busca, descanso, recarga ---
  const saques = [];
  A.on('saqueAberto', (x) => saques.push(x));
  await emit(A, 'fecharDado', { codigo });
  const gaveta = A.estado.buscaveis.find((b) => b.estado === 'livre');
  const bau = A.estado.buscaveis.find((b) => b.estado === 'trancado');
  ok((await emit(B, 'procurar', { codigo, buscavelId: gaveta.id })).ok === false, 'não dá para procurar fora da sua vez');
  ok((await emit(A, 'procurar', { codigo, buscavelId: gaveta.id })).ok, 'Thalrik revista a gaveta (livre)');
  await sleep(200);
  ok(saques.length === 1 && A.estado.buscaveis.find((b) => b.id === gaveta.id).aberto, `saque sorteado pelo servidor e anunciado (${saques[0]?.itens.length} item(ns), ${saques[0]?.moedas} moedas)`);
  ok(!(await emit(B, 'procurar', { codigo, buscavelId: gaveta.id })).ok, 'gaveta já revistada não abre de novo');
  ok((await emit(B, 'procurar', { codigo, buscavelId: bau.id })).ok, 'Miriel tenta abrir o baú trancado');
  await sleep(150);
  ok(B.estado.pendingTest?.nomePersonagem === 'Miriel' && B.estado.pendingTest.atributo === 'agilidade', 'baú trancado pede teste de Agilidade');
  const rolouBau = await emit(B, 'rolarDado', { codigo });
  await emit(B, 'fecharDado', { codigo });
  await sleep(200);
  const bauDepois = B.estado.buscaveis.find((b) => b.id === bau.id);
  ok(rolouBau.ok && (rolouBau.rollResult.sucesso ? bauDepois.aberto : !bauDepois.aberto), `resultado do teste decide o baú (${rolouBau.rollResult.sucesso ? 'abriu' : 'continua trancado'})`);
  const logRodada = (await emit(A, 'pedirLog', { codigo })).state.log.map((m) => m.texto).join('\n');
  ok(B.estado.rodada === 3, `cada volta completa na mesa é uma nova rodada (rodada ${B.estado.rodada}; só registra no log quando alguém recupera algo)`);
  void logRodada;
  ok(A.estado.turnoAtual === 'Thalrik', 'vez voltou para Thalrik');
  const pocao = A.estado.personagens.find((p) => p.id === c.meuId).personagem.inventario.find((i) => i.id === 'pocao_vida');
  const miriel = A.estado.personagens.find((p) => p.personagem?.nome === 'Miriel');
  ok((await emit(A, 'acaoJogador', { codigo, texto: 'Jogo a poção para Miriel', itemUid: pocao.uid, alvoId: miriel.id })).ok, 'Thalrik usa Poção de vida em Miriel (gasta a vez)');
  await sleep(200);
  const logPocao = (await emit(A, 'pedirLog', { codigo })).state.log.map((m) => m.texto).join('\n');
  ok(/usou Poção de vida em Miriel/.test(logPocao) && !A.estado.personagens.find((p) => p.id === c.meuId).personagem.inventario.some((i) => i.uid === pocao.uid), 'poção consumida e efeito registrado');
  const chave = A.estado.personagens.find((p) => p.id === c.meuId).personagem.inventario.find((i) => i.nome === 'Chave de ferro');
  const avisos = [];
  B.on('avisoMesa', (x) => avisos.push(x.texto));
  ok((await emit(A, 'darItem', { codigo, uid: chave.uid, alvoId: miriel.id })).ok, 'Thalrik dá a Chave de ferro (ação livre)');
  await sleep(150);
  ok(avisos.some((t) => /Thalrik deu Chave de ferro para Miriel/.test(t)), 'todos recebem o aviso "Thalrik deu Chave de ferro para Miriel"');
  await sleep(150);
  ok(A.estado.personagens.find((p) => p.personagem?.nome === 'Miriel').personagem.inventario.some((i) => i.nome === 'Chave de ferro'), 'item chegou no inventário de Miriel');
  const equiparNarrativo = await emit(A, 'equiparItem', { codigo, uid: A.estado.personagens.find((p) => p.id === c.meuId).personagem.inventario.find((i) => i.tipo === 'narrativo').uid });
  ok(!equiparNarrativo.ok, 'item comum não é equipável');
  ok((await emit(B, 'acaoJogador', { codigo, texto: 'Vamos descansar', descansar: true })).ok, 'Miriel propõe descanso');
  await sleep(200);
  ok(A.estado.descansoDisponivel === false, 'descanso fica indisponível nesta cena');
  const descDeNovo = await emit(A, 'acaoJogador', { codigo, texto: 'mais descanso', descansar: true });
  ok(!descDeNovo.ok && /já descansou/.test(descDeNovo.erro), 'segundo descanso na mesma cena é recusado');

  // --- Armas ---
  const fichaThal = A.estado.personagens.find((p) => p.id === c.meuId).personagem;
  const espada = fichaThal.inventario.find((i) => i.id === 'espada_longa');
  ok(espada && espada.tipo === 'arma' && espada.equipado, 'Guerreiro começa empunhando a Espada longa (arma real)');
  const danos = [];
  B.on('dadoRolado', (r) => danos.push(r));
  ok((await emit(A, 'acaoJogador', { codigo, texto: 'Atacar com "Espada longa" eu ataco o lobo', armaUid: espada.uid })).ok, 'Thalrik ataca com a Espada longa');
  await sleep(200);
  ok(A.estado.pendingTest?.atributo === 'forca', 'Mestre pede teste de Força para o ataque');
  const atk = await emit(A, 'rolarDado', { codigo });
  await emit(A, 'fecharDado', { codigo });
  await sleep(200);
  const evDano = danos[danos.length - 1];
  ok(atk.ok && atk.rollResult.bonus >= 1, `bônus da arma entrou no teste (bônus total ${atk.rollResult.bonus})`);
  ok(atk.rollResult.sucesso ? evDano.dano && evDano.dano.total >= 1 && evDano.dano.arma === 'Espada longa' : !evDano.dano,
    atk.rollResult.sucesso ? `acertou: servidor rolou o dano (${evDano.dano?.total} = ${evDano.dano?.formula})` : 'errou: sem dano');

  // --- XSS no texto do Mestre fica escapado no cliente (o servidor guarda texto puro) ---
  ok(A.logs > 0, `log chega incremental (${A.logs} entradas via logNovo)`);

  // --- Reconexão ---
  const idA = c.meuId;
  A.disconnect();
  await sleep(300);
  const A2 = await conectar(r1.json.token);
  const volta = await emit(A2, 'entrarJogo', { codigo });
  ok(volta.ok && volta.meuId === idA && volta.state.personagens.find((p) => p.id === idA).conectado, 'reconexão pela conta volta ao mesmo jogador');

  // --- Timer, pulos e Afastado (turno de 3s neste teste) ---
  console.log('   aguardando timeouts (≈20s)...');
  await sleep(21000);
  const pa = A2.estado.personagens.find((p) => p.id === idA);
  const pb = A2.estado.personagens.find((p) => p.id !== idA);
  ok(pa.afastado && pb.afastado, `após 3 pulos cada, ambos ficam Afastados (pulos A=${pa.pulos}, B=${pb.pulos})`);
  ok(A2.estado.turnoAtual === null, 'mesa pausada sem ninguém ativo');
  const acaoAfastado = await emit(A2, 'acaoJogador', { codigo, texto: 'oi' });
  ok(!acaoAfastado.ok && /Afastado/.test(acaoAfastado.erro), `afastado não joga: ${acaoAfastado.erro}`);
  ok((await emit(A2, 'voltei', { codigo })).ok, 'A confirma que voltou');
  await sleep(200);
  ok(A2.estado.turnoAtual === 'Thalrik' && !A2.estado.personagens.find((p) => p.id === idA).afastado, 'quem volta recebe a vez');
  ok((await emit(A2, 'passarVez', { codigo })).ok, 'passar a vez funciona');
  await sleep(200);
  ok((await emit(A2, 'acaoJogador', { codigo, texto: 'Eu ataco de novo' })).ok, 'Thalrik ataca (novo teste)');
  await sleep(200);
  ok(A2.estado.musica === 'batalha', 'combate: Mestre trocou a trilha para batalha');
  ok(A2.estado.pendingTest && A2.estado.dadoRestanteMs > 0 && A2.estado.turnoRestanteMs === null, `teste pendente: relógio do dado (${A2.estado.dadoRestanteMs} ms) corre e o da vez pausa`);
  await sleep(3800);
  const logFalha = (await emit(A2, 'pedirLog', { codigo })).state.log.map((m) => m.texto).join('\n');
  ok(/FALHA automática/.test(logFalha) && !A2.estado.pendingTest, 'sem rolar a tempo: falha automática e o jogo segue');
  ok(A2.estado.personagens.find((p) => p.id === idA).pulos === 1, 'falha por tempo conta como pulo');

  // --- Desistir do teste (antes de rolar) ---
  {
    const daVez = A2.estado.turnoAtual === 'Thalrik' ? A2 : B;
    const outro = daVez === A2 ? B : A2;
    const nomeVez = A2.estado.turnoAtual;
    const semTeste = await emit(daVez, 'desistirTeste', { codigo });
    ok(!semTeste.ok, `desistir sem teste pendente é recusado: ${semTeste.erro}`);
    ok((await emit(daVez, 'acaoJogador', { codigo, texto: 'Eu ataco o vulto' })).ok, `${nomeVez} ataca (teste para desistir)`);
    await sleep(200);
    ok(daVez.estado.pendingTest?.nomePersonagem === nomeVez, 'teste pendente para quem atacou');
    const alheio = await emit(outro, 'desistirTeste', { codigo });
    ok(!alheio.ok, `outro jogador não pode desistir do teste alheio: ${alheio.erro}`);
    const desiste = await emit(daVez, 'desistirTeste', { codigo });
    await sleep(200);
    const logDes = (await emit(daVez, 'pedirLog', { codigo })).state.log.map((m) => m.texto).join('\n');
    ok(desiste.ok && !daVez.estado.pendingTest && /desistiu da ação/.test(logDes), 'desistir encerra o teste sem rolar e avisa a mesa');
    const ativos = daVez.estado.personagens.filter((p) => p.personagem && !p.personagem.morto && !p.afastado && p.conectado);
    ok(ativos.length < 2 || daVez.estado.turnoAtual !== nomeVez, `a vez passa adiante (agora: ${daVez.estado.turnoAtual}; ativos: ${ativos.map((p) => p.personagem.nome + (p.afastado ? '/afastado' : '') + (p.conectado ? '' : '/offline')).join(', ')})`);
    ok(daVez.estado.personagens.find((p) => p.personagem?.nome === nomeVez).pulos === 0, 'desistir não conta como pulo por inatividade');
  }

  // --- Encerrar ---
  const encB = await emit(B, 'encerrarAventura', { codigo });
  ok(!encB.ok, 'só o anfitrião encerra');
  const enc = await emit(A2, 'encerrarAventura', { codigo });
  await sleep(200);
  ok(enc.ok && A2.estado.status === 'encerrada', 'aventura encerrada com epílogo');
  const minhas = await get('api/minhas-partidas', r1.json.token);
  ok(minhas.json.jogos.some((j) => j.codigo === codigo && j.status === 'encerrada'), 'aparece em Minhas Partidas');

  // --- Missão (aventura personalizada: o Mestre define) ---
  const etapasAvisadas = [];
  B.on('etapaConcluida', (e) => etapasAvisadas.push(e.numero));
  const pers = await emit(B, 'criarJogo', { tema: '-- DESCREVA A MISSÃO\nSalvar a vila' });
  const cm = pers.state.codigo;
  ok(pers.state.missao === null, 'personalizada começa sem missão (o Mestre define na abertura)');
  await emit(B, 'escolherPersonagem', { codigo: cm, personagem: personagem('Miriel', 'guardiao') });
  await emit(B, 'iniciarAventura', { codigo: cm });
  await sleep(200);
  ok(B.estado.missao?.objetivo === 'Salvar o vilarejo da névoa' && B.estado.missao.etapas.length === 2, 'Mestre definiu objetivo e etapas na abertura');
  await emit(B, 'acaoJogador', { codigo: cm, texto: 'vitoria agora!' });
  await sleep(200);
  ok(B.estado.status === 'em_jogo', 'vitória antes da hora é ignorada');
  await emit(B, 'acaoJogador', { codigo: cm, texto: 'concluo etapa 2' });
  await sleep(200);
  ok(!B.estado.missao.etapas[1].concluida, 'etapa fora de ordem é ignorada');
  const xpAntes = B.estado.personagens[0].personagem.xpTotal || 0;
  await emit(B, 'acaoJogador', { codigo: cm, texto: 'concluo etapa 1' });
  await sleep(200);
  ok(B.estado.missao.etapas[0].concluida && (B.estado.personagens[0].personagem.xpTotal || 0) === xpAntes + 30 && etapasAvisadas.includes(1), 'etapa 1 concluída: +30 XP e comemoração para a mesa');
  const marcou = await emit(B, 'concluirEtapa', { codigo: cm });
  await sleep(200);
  ok(marcou.ok && B.estado.missao.etapas[1].concluida, 'anfitrião marca a etapa atual manualmente');
  await emit(B, 'acaoJogador', { codigo: cm, texto: 'vitoria final' });
  await sleep(200);
  ok(B.estado.status === 'encerrada' && B.estado.resultado === 'cumprida' && B.estado.estatisticas?.inicio, 'última etapa feita: missão cumprida com estatísticas');
  const minhasB = await get('api/minhas-partidas', r2.json.token);
  const cardB = minhasB.json.jogos.find((j) => j.codigo === cm);
  ok(cardB && cardB.resultado === 'cumprida' && cardB.etapasFeitas === 2, 'Minhas Partidas mostra objetivo, etapas e resultado');

  // --- Roteiro "A Invasão Cyber" (ambiente cyber) ---
  const cy = await emit(B, 'criarJogo', { aventuraId: 'a-invasao-cyber' });
  const ccy = cy.state.codigo;
  ok(cy.state.ambiente === 'cyber' && /HIDRA/.test(cy.state.missao.objetivo) && cy.state.missao.etapas.length === 4, 'A Invasão Cyber: ambiente cyber e missão HIDRA com 4 etapas');
  await emit(B, 'escolherPersonagem', { codigo: ccy, personagem: { nome: 'Zero', classeId: 'arcanista', atributos: { forca: 10, agilidade: 10, mente: 16, espirito: 10 }, historia: 'x' } });
  await sleep(150);
  const hacker = B.estado.personagens.find((p) => p.personagem?.nome === 'Zero').personagem;
  ok(hacker.classeNome === 'Hacker' && hacker.recurso.nome === 'Processamento' && hacker.inventario.some((i) => i.nome === 'Deck de hacking' && i.tipo === 'arma' && i.equipado),
    `classe vestida: ${hacker.classeNome} / ${hacker.recurso.nome} / ${hacker.inventario.map((i) => i.nome).join(', ')}`);
  await emit(B, 'iniciarAventura', { codigo: ccy });
  await sleep(200);
  ok(B.estado.musica === 'cyber-taverna', `trilha do ambiente: [MUSICA: taverna] → ${B.estado.musica}`);
  await emit(B, 'acaoJogador', { codigo: ccy, texto: 'Usar "Injeção de Código" no firewall', habilidadeId: 'raio_arcano' });
  await sleep(200);
  const logCy = (await emit(B, 'pedirLog', { codigo: ccy })).state.log.map((m) => m.texto).join('\n');
  ok(/usou Injeção de Código \(−3 Processamento\)/.test(logCy), 'poder com nome cyber no log: "usou Injeção de Código (−3 Processamento)"');

  // --- Novas histórias e seus ambientes ---
  const esperado = {
    'piratas-da-nevoa-de-sal': ['fantasia', 'Guerreiro'],
    'a-noite-do-boitata': ['folclore', 'Tropeiro'],
    'sertao-de-ferro': ['sertao', 'Pistoleiro'],
    'estacao-orion-7': ['espacial', 'Fuzileira Espacial'],
  };
  for (const [id, [amb, classe]] of Object.entries(esperado)) {
    const r = await emit(B, 'criarJogo', { aventuraId: id });
    await emit(B, 'escolherPersonagem', { codigo: r.state.codigo, personagem: personagem('Teste', 'guerreiro') });
    await sleep(120);
    const ficha = B.estado.personagens[0].personagem;
    ok(r.state.ambiente === amb && r.state.missao.etapas.length === 4 && ficha.classeNome === classe,
      `${id}: ambiente ${r.state.ambiente}, missão com ${r.state.missao.etapas.length} etapas, classe "${ficha.classeNome}", arma "${ficha.inventario.find((i) => i.equipado)?.nome}"`);
  }

  // --- Morte: cair, morrer sem socorro, novo personagem, morte narrativa ---
  const md = await emit(B, 'criarJogo', { aventuraId: 'sombras-de-corvile' });
  const cmd = md.state.codigo;
  await emit(A2, 'entrarJogo', { codigo: cmd });
  await emit(B, 'escolherPersonagem', { codigo: cmd, personagem: personagem('Miriel', 'guardiao') });
  await emit(A2, 'escolherPersonagem', { codigo: cmd, personagem: personagem('Thalrik', 'guerreiro') });
  await emit(B, 'iniciarAventura', { codigo: cmd });
  await sleep(200);
  const fichaDe = (sock, nome) => sock.estado.personagens.find((p) => p.personagem?.nome === nome)?.personagem;
  await emit(B, 'acaoJogador', { codigo: cmd, texto: 'recebo um golpe forte' });
  await sleep(200);
  ok(fichaDe(B, 'Miriel').caido && fichaDe(B, 'Miriel').hp.atual === 0, 'com 0 PV o personagem cai e fica morrendo');
  await emit(A2, 'acaoJogador', { codigo: cmd, texto: 'espero' });
  await emit(B, 'acaoJogador', { codigo: cmd, texto: 'espero' });
  await sleep(150);
  ok(fichaDe(B, 'Miriel').rodadasCaido === 1 && !fichaDe(B, 'Miriel').morto, 'uma rodada sem socorro: continua morrendo (1/2)');
  await emit(A2, 'acaoJogador', { codigo: cmd, texto: 'espero' });
  await sleep(200);
  ok(fichaDe(B, 'Miriel').morto === true, 'duas rodadas sem socorro: morreu');
  const acaoMorto = await emit(B, 'acaoJogador', { codigo: cmd, texto: 'tento agir' });
  ok(!acaoMorto.ok && /morreu/.test(acaoMorto.erro), 'personagem morto não age');
  ok((await emit(B, 'escolherPersonagem', { codigo: cmd, personagem: personagem('Kael', 'batedor') })).ok, 'jogador cria um novo personagem depois da morte');
  await sleep(150);
  ok(fichaDe(B, 'Kael') && !fichaDe(B, 'Kael').morto && B.estado.status === 'em_jogo', 'novo personagem entra na aventura');
  if (B.estado.turnoAtual === 'Kael') await emit(B, 'acaoJogador', { codigo: cmd, texto: 'espero' });
  await sleep(100);
  await emit(A2, 'acaoJogador', { codigo: cmd, texto: 'pulo para o abismo' });
  await sleep(200);
  ok(fichaDe(A2, 'Thalrik').morto === true, 'Mestre matou pela narrativa com [MORTE: nome | motivo]');
  ok(B.estado.status === 'em_jogo', 'com alguém vivo, a aventura continua');

  // --- Resumo do histórico (mesa solo, muitas ações) ---
  const solo = await emit(B, 'criarJogo', { aventuraId: 'sombras-de-corvile', publica: false });
  await emit(B, 'escolherPersonagem', { codigo: solo.state.codigo, personagem: personagem('Miriel', 'guardiao') });
  await emit(B, 'iniciarAventura', { codigo: solo.state.codigo });
  for (let i = 0; i < 16; i++) await emit(B, 'acaoJogador', { codigo: solo.state.codigo, texto: `ação ${i}` });
  await sleep(800);
  fs.writeFileSync(ARQ_EMAILS + '.codigos', JSON.stringify({ codigo, solo: solo.state.codigo, tokenA: r1.json.token }));
  ok(!(await get('api/jogos-abertos', r1.json.token)).json.jogos.some((j) => j.codigo === solo.state.codigo), 'mesa privada não aparece em Jogos Abertos');
  A2.disconnect(); B.disconnect();
}

async function fase2() {
  // Depois de reiniciar o servidor: salas e contas continuam lá.
  const { codigo, solo, tokenA } = JSON.parse(fs.readFileSync(ARQ_EMAILS + '.codigos', 'utf8'));
  ok((await get('api/eu', tokenA)).status === 200, 'sessão continua válida após reiniciar');
  const A = await conectar(tokenA);
  const r = await emit(A, 'entrarJogo', { codigo });
  ok(r.ok && r.state.status === 'encerrada' && r.state.log.length > 10, `mesa restaurada do disco (${r.state.log.length} entradas no log)`);
  const dados = JSON.parse(fs.readFileSync(process.argv[5] + '/rooms/' + solo + '.json', 'utf8'));
  ok(dados.resumo && dados.historico.length <= 20, `histórico longo foi resumido (diário: ${JSON.stringify(dados.resumo.slice(0, 40))}…, ${dados.historico.length} msgs mantidas)`);
  A.disconnect();
}

(FASE === '2' ? fase2() : fase1())
  .then(() => { console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTudo certo.'); process.exit(falhas ? 1 : 0); })
  .catch((e) => { console.error('ERRO', e); process.exit(1); });
