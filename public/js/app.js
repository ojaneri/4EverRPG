'use strict';

// ---------------------------------------------------------------------------
// 4Ever — cliente
// Rotas por hash: #/ (home), #/jogos, #/minhas, #/como-jogar, #/conta,
// #/entrar, #/sala/CODIGO. A conta (email) é a identidade do jogador; a sessão
// fica no navegador por 30 dias e o socket reconecta sozinho à mesa atual.
// ---------------------------------------------------------------------------

// Caminho base relativo: funciona na raiz ou atrás de um proxy num subcaminho.
const BASE = location.pathname.replace(/[^/]*$/, '');
const CHAVE_SESSAO = '4ever.sessao';

const estado = {
  config: null,
  sessao: null, // { token, usuario }
  codigo: null, // mesa atual
  meuId: null, // meu id de jogador na mesa atual
  observando: false, // admin assistindo a mesa (invisível, sem agir)
  roomState: null,
  log: [],
  chatMensagens: [],
  aventuraId: null,
  classeEscolhida: null,
  atributos: null,
  turnoPrazo: null, // timestamp local em que o turno expira
};

let socket = null;
let mestreNarrando = false;

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
const $ = (id) => document.getElementById(id);

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function lerSessao() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_SESSAO) || 'null');
  } catch {
    return null;
  }
}
function gravarSessao(s) {
  try {
    if (s) localStorage.setItem(CHAVE_SESSAO, JSON.stringify(s));
    else localStorage.removeItem(CHAVE_SESSAO);
  } catch { /* navegador sem storage: sessão dura só esta aba */ }
  estado.sessao = s;
}

async function api(caminho, { metodo = 'GET', corpo } = {}) {
  const res = await fetch(BASE + caminho, {
    method: metodo,
    headers: {
      'content-type': 'application/json',
      ...(estado.sessao ? { authorization: `Bearer ${estado.sessao.token}` } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const dados = await res.json().catch(() => ({}));
  if (res.status === 401) {
    sairLocalmente();
    throw new Error(dados.erro || 'Sessão expirada. Entre de novo.');
  }
  if (!res.ok) throw new Error(dados.erro || `Erro ${res.status}`);
  return dados;
}

function emitir(evento, payload = {}, timeoutMs = 75000) {
  return new Promise((resolve, reject) => {
    if (!socket) return reject(new Error('Sem conexão com o servidor.'));
    socket.timeout(timeoutMs).emit(evento, { codigo: estado.codigo, ...payload }, (err, resp) => {
      if (err) return reject(new Error('O servidor não respondeu a tempo. Verifique sua conexão e tente novamente.'));
      if (!resp || !resp.ok) return reject(new Error((resp && resp.erro) || 'Algo deu errado.'));
      resolve(resp);
    });
  });
}

// --- Ambiente da mesa (figurino: fantasia ou cyber) ---
function ambAtual() {
  return (estado.config?.AMBIENTES || {})[estado.roomState?.ambiente] || {};
}
function classeVestida(classeId) {
  const base = estado.config.CLASSES[classeId];
  const v = (ambAtual().classes || {})[classeId] || {};
  return { ...base, nome: v.nome || base.nome, descricao: v.descricao || base.descricao, recurso: { ...base.recurso, nome: v.recurso || base.recurso.nome } };
}
function habilidadesDe(classeId) {
  const extra = ambAtual().habilidades || {};
  return (estado.config.HABILIDADES[classeId] || []).map((h) => ({ ...h, ...(extra[h.id] || {}) }));
}
function descItem(id) {
  const def = estado.config.ITENS[id];
  if (!def) return '';
  return (ambAtual().trocasDescricao || []).reduce((t, [de, para]) => t.split(de).join(para), def.descricao);
}

function meuJogador() {
  return estado.roomState?.personagens.find((p) => p.id === estado.meuId) || null;
}
function meuNomeExibicao() {
  const eu = meuJogador();
  return eu ? (eu.personagem ? eu.personagem.nome : eu.nome) : '';
}
function souHost() {
  return !!estado.roomState && estado.roomState.hostId === estado.meuId;
}
function linkConvite(codigo) {
  return `${location.origin}${BASE}#/sala/${codigo}`;
}

// ---------------------------------------------------------------------------
// Avatares (ícones vetoriais próprios)
// ---------------------------------------------------------------------------
const AVATARES = {
  guerreiro: `<svg viewBox="0 0 100 100"><path d="M50 8 L86 22 V48 C86 72 70 88 50 94 C30 88 14 72 14 48 V22 Z" fill="currentColor" opacity="0.18"/><path d="M50 8 L86 22 V48 C86 72 70 88 50 94 C30 88 14 72 14 48 V22 Z" fill="none" stroke="currentColor" stroke-width="4"/><path d="M50 28 V74 M34 42 H66" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg>`,
  batedor: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="currentColor" opacity="0.18"/><circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" stroke-width="4"/><path d="M50 18 L58 46 L50 82 L42 46 Z" fill="currentColor"/><path d="M38 46 H62" stroke="currentColor" stroke-width="4"/></svg>`,
  arcanista: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="currentColor" opacity="0.18"/><circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" stroke-width="4"/><path d="M50 14 L56 40 L82 46 L56 52 L50 78 L44 52 L18 46 L44 40 Z" fill="currentColor"/></svg>`,
  guardiao: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="currentColor" opacity="0.18"/><circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="50" cy="50" r="14" fill="currentColor"/><g stroke="currentColor" stroke-width="4" stroke-linecap="round"><path d="M50 16 V26 M50 74 V84 M16 50 H26 M74 50 H84 M27 27 L34 34 M73 27 L66 34 M27 73 L34 66 M73 73 L66 66"/></g></svg>`,
  mestre: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#1b1430"/><path d="M50 10 C26 10 14 34 14 56 C14 78 30 92 50 92 C70 92 86 78 86 56 C86 34 74 10 50 10 Z" fill="#2c2150" stroke="#9b7bd1" stroke-width="2"/><ellipse cx="50" cy="52" rx="14" ry="9" fill="#f2d675"/><ellipse cx="50" cy="52" rx="5" ry="9" fill="#1b1430"/></svg>`,
  sistema: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="#444"/><text x="50" y="62" font-size="46" text-anchor="middle" fill="#ccc">!</text></svg>`,
};
function avatarHtml(chave, cor) {
  const svg = AVATARES[chave] || AVATARES.sistema;
  const estilo = cor ? ` style="color:${cor}"` : '';
  return `<div class="avatar"${estilo}>${svg}</div>`;
}

// ---------------------------------------------------------------------------
// Navegação: telas e rotas
// ---------------------------------------------------------------------------
function mostrarTela(id) {
  document.querySelectorAll('.tela').forEach((t) => t.classList.toggle('tela-ativa', t.id === id));
  document.body.classList.toggle('em-mesa', id === 'tela-jogo');
  document.documentElement.classList.toggle('em-mesa', id === 'tela-jogo');
  try { arrumarBarraMesa(); } catch { /* ainda carregando o script */ }
}

function marcarNav(rota) {
  document.querySelectorAll('[data-rota]').forEach((a) => a.classList.toggle('ativo', a.dataset.rota === rota));
}

function rotaAtual() {
  const h = location.hash.replace(/^#\/?/, '');
  const [nome, param] = h.split('/');
  return { nome: nome || 'home', param: param || '' };
}

let atualizarListaTimer = null;
async function aplicarRota() {
  const { nome, param } = rotaAtual();
  clearInterval(atualizarListaTimer);
  marcarNav(nome === 'sala' ? '' : nome);

  // Saiu da mesa? Avisa o servidor (a vez passa para o próximo).
  if (estado.codigo && !((nome === 'sala' || nome === 'observar') && param.toUpperCase() === estado.codigo)) {
    sairDaMesaAtual();
  }

  if (nome === 'como-jogar') return mostrarTela('tela-como-jogar');
  if (!estado.sessao) {
    if (nome !== 'entrar' && nome !== 'home') sessionStorage.setItem('4ever.destino', location.hash);
    return mostrarTela('tela-entrar');
  }

  switch (nome) {
    case 'entrar':
    case 'home':
      $('ola-nome').textContent = estado.sessao.usuario.nome;
      return mostrarTela('tela-inicio');
    case 'jogos':
      mostrarTela('tela-jogos');
      carregarJogosAbertos();
      atualizarListaTimer = setInterval(carregarJogosAbertos, 10000);
      return;
    case 'minhas':
      mostrarTela('tela-minhas');
      return carregarMinhasPartidas();
    case 'conta':
      $('conta-nome').value = estado.sessao.usuario.nome;
      $('conta-email').value = estado.sessao.usuario.email;
      $('ok-conta').textContent = '';
      $('erro-conta').textContent = '';
      return mostrarTela('tela-conta');
    case 'sala':
      return entrarNaMesa(param.toUpperCase());
    case 'observar':
      if (!estado.sessao.usuario.admin) return (location.hash = '#/');
      if (param) return observarMesa(param.toUpperCase());
      mostrarTela('tela-observar');
      carregarObservar();
      atualizarListaTimer = setInterval(carregarObservar, 10000);
      return;
    default:
      location.hash = '#/';
  }
}

window.addEventListener('hashchange', aplicarRota);

// Saída de mesa durante a partida pede confirmação.
document.addEventListener('click', (ev) => {
  const a = ev.target.closest('a[href^="#/"]');
  if (!a || !estado.codigo || estado.roomState?.status !== 'em_jogo') return;
  if (a.getAttribute('href') === `#/sala/${estado.codigo}`) return;
  if (!confirm('Sair da mesa? Sua vez será passada adiante enquanto você estiver fora (você pode voltar por "Minhas Partidas").')) {
    ev.preventDefault();
  }
});

function atualizarTopo() {
  const logado = !!estado.sessao;
  $('link-conta').classList.toggle('escondido', !logado);
  $('link-entrar').classList.toggle('escondido', logado);
  if (logado) $('link-conta').textContent = `👤 ${estado.sessao.usuario.nome}`;
  $('link-observar').classList.toggle('escondido', !(logado && estado.sessao.usuario.admin));
}

// ---------------------------------------------------------------------------
// Conta: cadastro, magic link, sair
// ---------------------------------------------------------------------------
function destinoPosLogin() {
  const d = sessionStorage.getItem('4ever.destino');
  sessionStorage.removeItem('4ever.destino');
  return d && d.startsWith('#/') ? d : '#/';
}

$('form-registrar').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  $('erro-entrar').textContent = '';
  $('ok-entrar').textContent = '';
  const botao = ev.submitter;
  botao.disabled = true;
  try {
    const r = await api('api/registrar', {
      metodo: 'POST',
      corpo: { nome: $('reg-nome').value, email: $('reg-email').value, destino: sessionStorage.getItem('4ever.destino') || '' },
    });
    if (r.linkEnviado) {
      $('ok-entrar').textContent = 'Este email já tem conta. Enviamos um link de acesso para ele — abra seu email para entrar.';
      return;
    }
    iniciarSessao({ token: r.token, usuario: r.usuario });
    location.hash = destinoPosLogin();
  } catch (e) {
    $('erro-entrar').textContent = e.message;
  } finally {
    botao.disabled = false;
  }
});

$('form-login').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  $('erro-entrar').textContent = '';
  $('ok-entrar').textContent = '';
  const botao = ev.submitter;
  botao.disabled = true;
  try {
    await api('api/login', { metodo: 'POST', corpo: { email: $('login-email').value, destino: sessionStorage.getItem('4ever.destino') || '' } });
    $('ok-entrar').textContent = 'Pronto! Enviamos um link de acesso para o seu email (vale por 15 minutos). Pode fechar esta aba.';
  } catch (e) {
    $('erro-entrar').textContent = e.message;
  } finally {
    botao.disabled = false;
  }
});

$('form-conta').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  $('ok-conta').textContent = '';
  $('erro-conta').textContent = '';
  try {
    const r = await api('api/eu', { metodo: 'POST', corpo: { nome: $('conta-nome').value } });
    gravarSessao({ ...estado.sessao, usuario: r.usuario });
    atualizarTopo();
    $('ok-conta').textContent = 'Nome atualizado (vale para as próximas mesas em que você entrar).';
  } catch (e) {
    $('erro-conta').textContent = e.message;
  }
});

$('btn-sair').addEventListener('click', async () => {
  await api('api/sair', { metodo: 'POST' }).catch(() => {});
  sairLocalmente();
  location.hash = '#/';
});

function sairLocalmente() {
  gravarSessao(null);
  if (socket) socket.disconnect();
  socket = null;
  estado.codigo = null;
  estado.roomState = null;
  atualizarTopo();
  mostrarTela('tela-entrar');
}

function iniciarSessao(sessao) {
  gravarSessao(sessao);
  atualizarTopo();
  conectarSocket();
}

// ---------------------------------------------------------------------------
// Conexão em tempo real
// ---------------------------------------------------------------------------
function conectarSocket() {
  if (socket) socket.disconnect();
  socket = io({ path: BASE + 'socket.io', auth: { token: estado.sessao.token } });

  socket.on('connect', () => {
    $('faixa-conexao').classList.add('escondido');
    // Reconectou no meio de uma partida: volta para a mesma mesa automaticamente.
    if (estado.codigo) (estado.observando ? observarMesa : entrarNaMesa)(estado.codigo, { silencioso: true });
  });
  socket.on('disconnect', () => {
    if (estado.sessao) $('faixa-conexao').classList.remove('escondido');
  });
  socket.on('connect_error', (err) => {
    if (err && err.message === 'nao_autenticado') {
      sairLocalmente();
      $('erro-entrar').textContent = 'Sua sessão expirou. Entre de novo com seu email.';
    } else {
      $('faixa-conexao').classList.remove('escondido');
    }
  });

  socket.on('estadoAtualizado', (rs) => {
    if (rs.codigo !== estado.codigo) return;
    renderEstado(rs);
  });
  socket.on('logNovo', ({ inicio, msgs }) => {
    receberLog(inicio, msgs);
  });
  socket.on('dadoRolado', receberRolagem);
  socket.on('saqueAberto', receberSaque);
  socket.on('etapaConcluida', avisarEtapa);
  socket.on('avisoMesa', mostrarAvisoMesa);
  // Quem é cutucado: a tela toda treme por 3 s e, logo a seguir, o cartão de quem
  // cutucou balança com 👉 por 5 s.
  socket.on('cutucada', ({ deId, deNome }) => {
    mostrarAvisoMesa({ icone: '👉', texto: `${deNome} cutucou você!` });
    try { navigator.vibrate && navigator.vibrate([200, 80, 200, 80, 200]); } catch { /* sem vibração */ }
    const corpo = document.body;
    corpo.classList.remove('tela-tremendo');
    void corpo.offsetWidth; // reinicia a animação se vier outra cutucada
    corpo.classList.add('tela-tremendo');
    clearTimeout(tremorTimer);
    tremorTimer = setTimeout(() => {
      corpo.classList.remove('tela-tremendo');
      marcarCutucada(deId);
    }, TREMOR_MS);
  });
  socket.on('mesaApagada', ({ codigo }) => {
    if (codigo !== estado.codigo) return;
    const observando = estado.observando;
    sairDaMesaAtual();
    if (observando) return (location.hash = '#/observar');
    location.hash = '#/';
    setTimeout(() => ($('erro-inicio').textContent = 'Esta mesa foi apagada pela administração do 4Ever.'), 50);
  });
  socket.on('chatMensagem', (msg) => {
    estado.chatMensagens.push(msg);
    renderChatLateral();
    renderChatEspera();
  });
}

// ---------------------------------------------------------------------------
// Listas: Jogos Abertos e Minhas Partidas
// ---------------------------------------------------------------------------
const NOMES_STATUS = { lobby: 'Montando o grupo', em_jogo: 'Em andamento', encerrada: 'Encerrada' };

function tempoRelativo(ts) {
  const min = Math.round((Date.now() - ts) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  return `há ${Math.round(min / 60)} h`;
}

function cartaoJogo(j, extra = '') {
  return `<a class="cartao-jogo" href="#/sala/${esc(j.codigo)}">
    <div class="cartao-jogo-topo"><strong>${esc(j.titulo)}</strong><span class="selo selo-${esc(j.status)}">${NOMES_STATUS[j.status] || esc(j.status)}</span></div>
    ${j.objetivo ? `<p>📜 ${esc(j.objetivo)}${j.etapasTotal ? ` <span class="selo">${j.etapasFeitas}/${j.etapasTotal} etapas</span>` : ''}${j.resultado ? ` <span class="selo">${{ cumprida: '🏆 cumprida', falhou: '💀 falhou', interrompida: '🏁 interrompida' }[j.resultado]}</span>` : ''}</p>` : j.tema ? `<p>${esc(j.tema)}</p>` : ''}
    ${extra}
    <div class="cartao-jogo-rodape">Anfitrião: ${esc(j.anfitriao)} · ${j.jogadores} jogador(es), ${j.online} online · ${tempoRelativo(j.atualizadoEm)} · código <code>${esc(j.codigo)}</code></div>
  </a>`;
}

async function carregarJogosAbertos() {
  const lista = $('lista-jogos');
  try {
    const { jogos } = await api('api/jogos-abertos');
    lista.innerHTML = jogos.length
      ? jogos.map((j) => cartaoJogo(j)).join('')
      : '<p class="vazio">Nenhuma mesa aberta agora. Que tal <a href="#/">criar uma</a>?</p>';
  } catch (e) {
    lista.innerHTML = `<p class="erro">${esc(e.message)}</p>`;
  }
}

// Admin: todas as mesas em andamento, para assistir sem aparecer.
async function carregarObservar() {
  const lista = $('lista-observar');
  try {
    const { jogos } = await api('api/observar');
    lista.innerHTML = jogos.length
      ? jogos.map((j) => cartaoJogo(j,
        `<p class="meu-personagem">${j.publica ? '🌐 pública' : '🔒 privada'} · rodada ${j.rodada} · ${j.humanosOnline} pessoa(s) online${j.bots ? ` · 🤖 ${j.bots} bot(s)` : ''}${j.personagens.length ? ` · ${j.personagens.map(esc).join(', ')}` : ''}</p>
        <div class="acoes-admin"><button type="button" class="botao-mini" data-admin="encerrar" data-codigo="${esc(j.codigo)}">🏁 Encerrar</button><button type="button" class="botao-mini botao-perigo" data-admin="apagar" data-codigo="${esc(j.codigo)}">🗑️ Apagar</button></div>`
      ).replace(`href="#/sala/${esc(j.codigo)}"`, `href="#/observar/${esc(j.codigo)}"`)).join('')
      : '<p class="vazio">Nenhuma partida em andamento agora.</p>';
  } catch (e) {
    lista.innerHTML = `<p class="erro">${esc(e.message)}</p>`;
  }
}

// Admin: encerrar (o Mestre narra um epílogo) ou apagar a mesa de vez.
document.addEventListener('click', async (ev) => {
  const btn = ev.target.closest('[data-admin]');
  if (!btn) return;
  ev.preventDefault();
  ev.stopPropagation();
  const codigo = btn.dataset.codigo || estado.codigo;
  const apagar = btn.dataset.admin === 'apagar';
  const pergunta = apagar
    ? `Apagar a mesa ${codigo} de vez? Os jogadores saem da mesa e o histórico some. Não dá para desfazer.`
    : `Encerrar a mesa ${codigo}? Se a aventura estiver rolando, o Mestre narra um epílogo e a mesa fica encerrada para todos.`;
  if (!confirm(pergunta)) return;
  btn.disabled = true;
  try {
    await emitir(apagar ? 'adminApagar' : 'adminEncerrar', { codigo }, 120000);
    if (!estado.codigo) carregarObservar();
  } catch (e) {
    alert(e.message);
  } finally {
    btn.disabled = false;
  }
}, true);

async function carregarMinhasPartidas() {
  const lista = $('lista-minhas');
  lista.innerHTML = '<p class="vazio">Carregando...</p>';
  try {
    const { jogos } = await api('api/minhas-partidas');
    lista.innerHTML = jogos.length
      ? jogos.map((j) => cartaoJogo(j, j.meuPersonagem ? `<p class="meu-personagem">Seu personagem: ${esc(j.meuPersonagem)}</p>` : '')).join('')
      : '<p class="vazio">Você ainda não participa de nenhuma mesa.</p>';
  } catch (e) {
    lista.innerHTML = `<p class="erro">${esc(e.message)}</p>`;
  }
}

// ---------------------------------------------------------------------------
// Configuração (classes, atributos, aventuras, habilidades)
// ---------------------------------------------------------------------------
async function carregarConfig() {
  const res = await fetch(BASE + 'api/config');
  estado.config = await res.json();
  Musica.definirCatalogo(estado.config.MUSICAS);
  renderCreditosAudio();
  renderGradeClasses();
  renderGradeAventuras();
}

function renderCreditosAudio() {
  const el = $('creditos-audio');
  if (!el) return;
  const musicas = estado.config.MUSICAS.map((m) =>
    `<li>${esc(m.icone)} <strong>${esc(m.nome)}</strong> (${esc(m.uso)}): <a href="${esc(m.fonte)}" target="_blank" rel="noopener">${esc(m.titulo)}</a>, de ${esc(m.autor)}</li>`).join('');
  const sfx = (estado.config.CREDITOS_SFX || []).map((c) =>
    `<li><a href="${esc(c.fonte)}" target="_blank" rel="noopener">${esc(c.pacote)}</a>, de ${esc(c.autor)}</li>`).join('');
  el.innerHTML = `<h3>🎵 Trilha sonora e efeitos</h3>
    <p>O Mestre escolhe a música de acordo com a cena. Todas as músicas e efeitos são CC0 (domínio público), do OpenGameArt.org. Obrigado aos autores!</p>
    <ul>${musicas}</ul><p>Efeitos sonoros:</p><ul>${sfx}</ul>`;
}

function renderGradeAventuras() {
  const grade = $('grade-aventuras');
  grade.innerHTML = '';
  const opcoes = [
    ...estado.config.ADVENTURES,
    { id: 'personalizada', titulo: 'Personalizada', icone: '✍️', resumoCurto: 'Escreva você mesmo o tema da aventura.' },
  ];
  opcoes.forEach((a) => {
    const div = document.createElement('div');
    div.className = 'cartao-aventura';
    div.dataset.aventuraId = a.id;
    div.innerHTML = `<div class="aventura-icone">${esc(a.icone)}</div><h3>${esc(a.titulo)}</h3><p>${esc(a.resumoCurto)}</p>`;
    div.addEventListener('click', () => selecionarAventura(a.id));
    grade.appendChild(div);
  });
  if (opcoes.length) selecionarAventura(opcoes[0].id);
}

function selecionarAventura(id) {
  estado.aventuraId = id;
  document.querySelectorAll('.cartao-aventura').forEach((el) => el.classList.toggle('selecionado', el.dataset.aventuraId === id));
  $('rotulo-tema-personalizado').classList.toggle('escondido', id !== 'personalizada');
  $('dica-modelo').classList.toggle('escondido', id !== 'personalizada');
}

function renderGradeClasses() {
  const grade = $('grade-classes');
  grade.innerHTML = '';
  Object.keys(estado.config.CLASSES).map(classeVestida).forEach((classe) => {
    const div = document.createElement('div');
    div.className = 'cartao-classe';
    div.style.setProperty('--cor-classe', classe.corTema);
    div.dataset.classeId = classe.id;
    div.innerHTML = `
      ${avatarHtml(classe.avatar, classe.corTema)}
      <h3>${esc(classe.nome)}</h3>
      <p>${esc(classe.descricao)}</p>
      <div class="detalhe">PV base: ${classe.hpBase} · ${esc(classe.recurso.nome)}: ${classe.recurso.base}</div>`;
    div.addEventListener('click', () => selecionarClasse(classe.id));
    grade.appendChild(div);
  });
}

function selecionarClasse(classeId) {
  estado.classeEscolhida = classeId;
  estado.corEscolhida = null; // sugere a cor padrão da classe (se estiver livre)
  renderSeletorCor();
  document.querySelectorAll('.cartao-classe').forEach((el) => el.classList.toggle('selecionado', el.dataset.classeId === classeId));
  estado.atributos = {};
  estado.config.ATTRIBUTES.forEach((a) => (estado.atributos[a] = estado.config.POINT_BUY.base));
  renderAtributosEditor();
  // Sugere o nome do jogador como nome do personagem (pode trocar).
  if (!$('personagem-nome').value.trim()) $('personagem-nome').value = estado.sessao?.usuario?.nome || '';
  const classe = classeVestida(classeId);
  const habs = habilidadesDe(classeId);
  const caixa = $('habilidades-classe');
  caixa.innerHTML = `<div class="titulo-habilidades">Habilidades de ${esc(classe.nome)} (gastam ${esc(classe.recurso.nome)})</div>`;
  habs.forEach((h) => {
    const div = document.createElement('div');
    div.className = 'habilidade-item';
    div.innerHTML = `<strong>${esc(h.nome)}</strong> <span class="custo">${h.custo} ${esc(classe.recurso.nome)}</span> `;
    // Usa os atributos que a pessoa está distribuindo agora.
    div.appendChild(botaoAjuda(() => {
      const mods = {};
      estado.config.ATTRIBUTES.forEach((a) => (mods[a] = modificador(estado.atributos[a])));
      return ajudaHabilidade(classeId, h, { mods });
    }));
    div.insertAdjacentHTML('beforeend', `<br><small>${esc(h.descricao)}</small>`);
    caixa.appendChild(div);
  });
  $('ficha-personagem').classList.remove('escondido');
}

function renderAtributosEditor() {
  const container = $('atributos-editor');
  container.innerHTML = '';
  estado.config.ATTRIBUTES.forEach((attr) => {
    const div = document.createElement('div');
    div.className = 'atributo-item';
    div.innerHTML = `
      <div>${esc(estado.config.ATTRIBUTE_LABELS[attr])}</div>
      <div class="linha-botoes">
        <button type="button" data-attr="${attr}" data-delta="-1">−</button>
        <span class="valor" data-valor="${attr}">${estado.atributos[attr]}</span>
        <button type="button" data-attr="${attr}" data-delta="1">+</button>
      </div>
      <div class="mod" data-mod="${attr}"></div>`;
    container.appendChild(div);
  });
  container.querySelectorAll('button').forEach((btn) =>
    btn.addEventListener('click', () => ajustarAtributo(btn.dataset.attr, parseInt(btn.dataset.delta, 10)))
  );
  atualizarAtributosUI();
}

function pontosGastos() {
  const base = estado.config.POINT_BUY.base;
  return estado.config.ATTRIBUTES.reduce((soma, a) => soma + (estado.atributos[a] - base), 0);
}

function ajustarAtributo(attr, delta) {
  const { min, max, extraPoints } = estado.config.POINT_BUY;
  const novo = estado.atributos[attr] + delta;
  if (novo < min || novo > max) return;
  if (delta > 0 && pontosGastos() >= extraPoints) return;
  estado.atributos[attr] = novo;
  atualizarAtributosUI();
}

const modificador = (score) => Math.floor((score - 10) / 2);

function atualizarAtributosUI() {
  estado.config.ATTRIBUTES.forEach((attr) => {
    const valor = estado.atributos[attr];
    document.querySelector(`[data-valor="${attr}"]`).textContent = valor;
    const mod = modificador(valor);
    document.querySelector(`[data-mod="${attr}"]`).textContent = `mod ${mod >= 0 ? '+' : ''}${mod}`;
  });
  $('pontos-restantes').textContent = estado.config.POINT_BUY.extraPoints - pontosGastos();
}

// ---------------------------------------------------------------------------
// Criar / entrar / sair de mesas
// ---------------------------------------------------------------------------
$('form-criar').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const personalizada = estado.aventuraId === 'personalizada';
  const tema = $('criar-tema').value.trim();
  if (personalizada && tema.length < 10) {
    $('erro-inicio').textContent = 'Descreva sua aventura personalizada (cenário, criaturas e missão).';
    return;
  }
  try {
    const r = await emitir('criarJogo', {
      aventuraId: personalizada ? null : estado.aventuraId,
      tema: personalizada ? tema : '',
      publica: $('criar-publica').checked,
      bots: Number($('criar-bots').value) || 0,
    }, 15000);
    $('erro-inicio').textContent = '';
    abrirMesa(r);
    location.hash = `#/sala/${r.state.codigo}`;
  } catch (e) {
    $('erro-inicio').textContent = e.message;
  }
});

$('form-entrar').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const codigo = $('entrar-codigo').value.trim().toUpperCase();
  if (codigo) location.hash = `#/sala/${codigo}`;
});

async function entrarNaMesa(codigo, { silencioso = false } = {}) {
  if (!socket) return;
  if (!socket.connected) {
    estado.codigo = codigo; // o 'connect' chama de novo quando a conexão subir
    return;
  }
  try {
    const r = await new Promise((resolve, reject) =>
      socket.timeout(15000).emit('entrarJogo', { codigo }, (err, resp) =>
        err ? reject(new Error('O servidor não respondeu.')) : resp.ok ? resolve(resp) : reject(new Error(resp.erro))
      )
    );
    abrirMesa(r);
  } catch (e) {
    if (silencioso) return;
    estado.codigo = null;
    $('erro-inicio').textContent = e.message;
    location.hash = '#/';
  }
}

async function observarMesa(codigo, { silencioso = false } = {}) {
  if (!socket) return;
  estado.observando = true;
  if (!socket.connected) {
    estado.codigo = codigo;
    return;
  }
  try {
    const r = await emitir('observarJogo', { codigo }, 15000);
    abrirMesa(r);
  } catch (e) {
    if (silencioso) return;
    estado.codigo = null;
    estado.observando = false;
    alert(e.message);
    location.hash = '#/observar';
  }
}

function abrirMesa({ state, meuId, observando = false }) {
  const trocouDeMesa = estado.codigo !== state.codigo || estado.observando !== observando;
  estado.observando = observando;
  document.body.classList.toggle('observando', observando);
  $('faixa-observando').classList.toggle('escondido', !observando);
  estado.codigo = state.codigo;
  estado.meuId = meuId;
  if (trocouDeMesa || !estado.roomState) {
    estado.chatMensagens = (state.chatGeral || []).map((m) => ({ ...m, escopo: 'geral', tipo: 'texto' }));
    chatRenderadas = 0;
    chatPrimeiraCarga = true;
    eraMinhaVez = null;
    trocarAbaMesa('mesa');
    $('chat-lateral-lista').innerHTML = '';
    estado.classeEscolhida = null;
    $('ficha-personagem').classList.add('escondido');
    document.querySelectorAll('.cartao-classe').forEach((el) => el.classList.remove('selecionado'));
    renderChatLateral();
  }
  // Reconexão na mesma mesa com a pessoa lendo lá em cima: não pula para o fim.
  const lendo = !trocouDeMesa && estado.log.length && !seguidorLog().estaNoFim()
    ? { topo: $('chat-log').scrollTop, antes: estado.log.filter((m) => !m.efemero).length }
    : null;
  estado.log = [];
  logRenderizado = 0;
  $('chat-log').innerHTML = '';
  receberLog(0, state.log || [], { inicial: true });
  if (lendo) seguidorLog().manter(lendo.topo, (state.log || []).filter((m) => !m.efemero).length - lendo.antes);
  $('codigo-exibido').textContent = state.codigo;
  $('codigo-jogo-ativo').textContent = state.codigo;
  renderEstado(state);
}

function sairDaMesaAtual() {
  Musica.parar();
  $('controle-musica').classList.add('escondido');
  if (socket && socket.connected) socket.emit('sairDaSala', { codigo: estado.codigo }, () => {});
  pararNarracao();
  estado.codigo = null;
  estado.meuId = null;
  estado.roomState = null;
  estado.observando = false;
  document.body.classList.remove('observando');
}

function copiar(texto, botao) {
  navigator.clipboard?.writeText(texto);
  const original = botao.textContent;
  botao.textContent = 'Copiado!';
  setTimeout(() => (botao.textContent = original), 1500);
}
$('btn-copiar-codigo').addEventListener('click', (ev) => copiar(estado.codigo || '', ev.currentTarget));
$('btn-copiar-link').addEventListener('click', (ev) => copiar(linkConvite(estado.codigo || ''), ev.currentTarget));

// ---------------------------------------------------------------------------
// Personagem e início da aventura
// ---------------------------------------------------------------------------
$('btn-confirmar-personagem').addEventListener('click', async () => {
  if (!estado.classeEscolhida) return;
  try {
    await emitir('escolherPersonagem', {
      personagem: {
        nome: $('personagem-nome').value.trim(), // vazio = o servidor usa o nome do jogador
        classeId: estado.classeEscolhida,
        atributos: estado.atributos,
        historia: $('personagem-historia').value.trim(),
        avatarVariant: 1,
        cor: estado.corEscolhida || null,
      },
    }, 15000);
    $('ficha-personagem').classList.add('escondido');
    $('erro-personagem').textContent = '';
  } catch (e) {
    $('erro-personagem').textContent = e.message;
  }
});

let iniciandoAventura = false;
$('btn-iniciar-aventura').addEventListener('click', async () => {
  if (iniciandoAventura) return;
  const btn = $('btn-iniciar-aventura');
  iniciandoAventura = true;
  btn.disabled = true;
  btn.textContent = 'O Mestre está preparando a aventura...';
  $('erro-personagem').textContent = '';
  try {
    await emitir('iniciarAventura');
    btn.textContent = 'Iniciar aventura';
  } catch (e) {
    btn.textContent = 'Tentar novamente';
    $('erro-personagem').textContent = e.message;
  } finally {
    iniciandoAventura = false;
    btn.disabled = false;
  }
});

// ---------------------------------------------------------------------------
// Estado da mesa
// ---------------------------------------------------------------------------
function renderEstado(rs) {
  estado.roomState = rs;
  mestreNarrando = !!rs.processando;
  estado.turnoPrazo = rs.turnoRestanteMs != null ? Date.now() + rs.turnoRestanteMs : null;
  estado.dadoPrazo = rs.dadoRestanteMs != null ? Date.now() + rs.dadoRestanteMs : null;
  if (rs.logTamanho > estado.log.length) pedirLogCompleto();

  sonsDaMesa(rs);
  const eu = meuJogador();
  if (!eu && !estado.observando) return;
  const rota = `#/${estado.observando ? 'observar' : 'sala'}/${rs.codigo}`;
  if (location.hash !== rota) history.replaceState(null, '', rota);
  aplicarConfigSala(rs);

  if (estado.ambienteGrade !== (rs.ambiente || 'fantasia')) {
    estado.ambienteGrade = rs.ambiente || 'fantasia';
    renderGradeClasses(); // classes com os nomes do ambiente da mesa
    estado.classeEscolhida = null;
    $('ficha-personagem').classList.add('escondido');
  }
  const morto = !!(eu && eu.personagem && eu.personagem.morto);
  if (!morto) estado.criandoNovo = false;
  if (estado.observando) {
    // observador vai direto para a mesa (no lobby, vê a montagem do grupo pelo painel)
  } else if (!eu.personagem || rs.status === 'lobby' || (morto && estado.criandoNovo)) {
    mostrarTela('tela-personagem');
    marcarNav('');
    $('bloco-criar-personagem').classList.toggle('escondido', !!eu.personagem && !morto);
    const ml = $('missao-lobby');
    ml.classList.toggle('escondido', !rs.missao);
    if (rs.missao) ml.innerHTML = `<strong>📜 Missão:</strong> ${esc(rs.missao.objetivo)}`;
    atualizarCoresCss(rs);
    if (!$('ficha-personagem').classList.contains('escondido')) renderSeletorCor(); // outro jogador pode ter pego a cor
    renderSalaEspera(rs);
    return;
  }

  const acabouDeAbrir = !$('tela-jogo').classList.contains('tela-ativa');
  mostrarTela('tela-jogo');
  if (acabouDeAbrir) {
    rolarLogParaFim();
    rolarChatParaFim();
  }
  $('mestre-digitando').classList.toggle('escondido', !mestreNarrando);
  $('btn-encerrar').classList.toggle('escondido', !(souHost() && rs.status === 'em_jogo'));
  $('faixa-encerrada').classList.toggle('escondido', rs.status !== 'encerrada');
  $('faixa-morto').classList.toggle('escondido', !(morto && rs.status === 'em_jogo'));
  $('sobreposicao-afastado').classList.toggle('escondido', !(eu && eu.afastado && rs.status === 'em_jogo'));
  renderPainelGrupo(rs);
  renderPainelMissao(rs);
  renderPainelCena(rs);
  talvezMostrarFim(rs);
  atualizarCoresCss(rs);
  renderAreaTeste(rs);
  sincronizarModalDadoObservador(rs);
  renderInventario();
  atualizarSeletoresDestino();
  atualizarControleTurno();
}

// ---------------------------------------------------------------------------
// Sala de espera: vitrine da história (arte animada, gancho digitado, clima),
// trilha do ambiente, dicas girando e quem chega entra com animação.
// ---------------------------------------------------------------------------
const DICAS_ESPERA = [
  '🎲 Em ações arriscadas o Mestre pede um teste: role o d20 e some o seu atributo.',
  '🏳️ Na hora do dado dá para desistir da ação. Você perde a vez, e o Mestre decide as consequências.',
  '💬 O Chat não entra na história: use para combinar o plano com o grupo (dá para mandar áudio).',
  '🎨 Cada personagem tem uma cor. Suas falas e seu cartão ficam nela.',
  '🎒 Itens e armas ficam no Inventário. Usar um item gasta a sua vez.',
  '🏕️ Uma vez por cena o grupo pode descansar e recuperar metade da vida.',
  '📜 Os Objetivos mostram a missão e as etapas. O Mestre marca cada etapa cumprida.',
  '✍️ Descreva o que seu personagem faz e como faz. Detalhes rendem narrações melhores.',
  '🤝 Ajudar um aliado também é uma ação: cure, proteja, distraia o inimigo.',
];
let vitrineCodigo = null;
let vitrineTimers = [];
const reduzMovimento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function escreverDevagar(el, texto) {
  if (reduzMovimento()) { el.textContent = texto; return; }
  el.textContent = '';
  el.classList.add('digitando');
  let i = 0;
  const t = setInterval(() => {
    i += 1;
    el.textContent = texto.slice(0, i);
    if (i >= texto.length) {
      clearInterval(t);
      el.classList.remove('digitando');
    }
  }, 32);
  vitrineTimers.push(t);
}

function renderVitrine(rs) {
  if (vitrineCodigo === rs.codigo) return;
  vitrineCodigo = rs.codigo;
  vitrineTimers.forEach(clearInterval);
  vitrineTimers = [];
  const av = (estado.config.ADVENTURES || []).find((a) => a.titulo === rs.aventuraTitulo);
  const v = av && av.vitrine;
  const el = $('vitrine-lobby');
  el.dataset.amb = rs.ambiente || 'fantasia';
  el.style.setProperty('--cor-v', (v && v.cor) || '#b08cff');
  const particulas = Array.from({ length: 26 }, () => {
    const r = Math.random;
    return `<i style="left:${(r() * 100).toFixed(1)}%;top:${(r() * 100).toFixed(1)}%;--tam:${(2 + r() * 4).toFixed(1)}px;--dur:${(7 + r() * 9).toFixed(1)}s;animation-delay:-${(r() * 16).toFixed(1)}s"></i>`;
  }).join('');
  const titulo = rs.aventuraTitulo || 'Aventura personalizada';
  el.innerHTML = `
    <div class="vitrine-arte" style="background-image:url('${v ? v.imagem : 'img/aventuras/personalizada.jpg'}')"></div>
    <div class="vitrine-sombra"></div>
    <div class="vitrine-particulas" aria-hidden="true">${particulas}</div>
    <div class="vitrine-conteudo">
      <span class="vitrine-genero">${esc(v ? v.genero : 'Aventura personalizada')}</span>
      <h2 class="vitrine-titulo">${av ? `${esc(av.icone)} ` : '✨ '}${esc(titulo)}</h2>
      <p class="vitrine-gancho" id="vitrine-gancho"></p>
      <p class="vitrine-texto">${esc(v ? v.texto : 'Uma história escrita pelo anfitrião. Ninguém sabe o que vem por aí: monte seu personagem e espere o grupo.')}</p>
      ${v ? `<div class="vitrine-clima">${v.clima.map((c, i) => `<span style="animation-delay:${1.2 + i * 0.25}s">${esc(c)}</span>`).join('')}</div>` : ''}
    </div>`;
  escreverDevagar($('vitrine-gancho'), v ? v.gancho : 'O Mestre já está lendo o roteiro...');
  // Dicas girando embaixo do grupo.
  const dica = $('dica-espera');
  let n = Math.floor(Math.random() * DICAS_ESPERA.length);
  const trocar = () => {
    dica.classList.remove('aparece');
    void dica.offsetWidth; // reinicia a animação
    dica.textContent = DICAS_ESPERA[n++ % DICAS_ESPERA.length];
    dica.classList.add('aparece');
  };
  trocar();
  vitrineTimers.push(setInterval(trocar, 8000));
}

// Sons da mesa: alguém novo entrou / a aventura começou.
let somMesa = { codigo: null, ids: [], status: null };
function sonsDaMesa(rs) {
  const ids = rs.personagens.map((p) => p.id);
  if (somMesa.codigo === rs.codigo) {
    if (ids.some((id) => !somMesa.ids.includes(id) && id !== estado.meuId)) Musica.efeito('entrada', 0.8);
    if (somMesa.status === 'lobby' && rs.status === 'em_jogo') Musica.efeito('inicio');
  }
  somMesa = { codigo: rs.codigo, ids, status: rs.status };
}

// Chat da sala de espera: as mesmas mensagens do chat geral (o servidor guarda as
// últimas 200, então quem chega depois vê a conversa).
function renderChatEspera() {
  const lista = $('chat-espera-lista');
  if (!lista) return;
  const msgs = estado.chatMensagens.filter((m) => m.tipo === 'texto' || m.tipo === 'audio');
  const chave = `${estado.codigo}:${msgs.length}`;
  if (lista.dataset.chave === chave) return; // nada novo: não redesenha (nem repete a animação)
  lista.dataset.chave = chave;
  const pertoDoFim = lista.scrollHeight - lista.scrollTop - lista.clientHeight < 60;
  const meuNome = meuNomeExibicao();
  lista.innerHTML = msgs.length
    ? msgs.map((m) => {
      const privado = m.escopo === 'privado';
      const corpo = m.tipo === 'audio' ? '<em>🎙️ mensagem de voz (ouça na aba Chat da mesa)</em>' : formatarTexto(m.texto);
      const hora = new Date(m.ts || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return `<div class="fala-espera${m.autor === meuNome ? ' minha' : ''}${privado ? ' privado' : ''}">
        <span class="autor-chat" data-pers="${slugPers(m.autor)}">${m.bot ? '🤖 ' : ''}${esc(m.autor)}${privado ? ` <span class="tag-privado">(privado${m.autor === meuNome ? ` → ${esc(m.para)}` : ''})</span>` : ''}</span>
        <span class="hora-chat">${hora}</span><div>${corpo}</div></div>`;
    }).join('')
    : '<p class="vazio">Ninguém falou ainda. Que tal dar um oi?</p>';
  if (pertoDoFim || msgs.length && msgs[msgs.length - 1].autor === meuNome) lista.scrollTop = lista.scrollHeight;
}
$('form-chat-espera').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const campo = $('chat-espera-texto');
  const texto = campo.value.trim();
  if (!texto) return;
  campo.value = '';
  try {
    await emitir('chatTexto', { texto }, 15000);
  } catch (e) {
    campo.value = texto;
    $('erro-personagem').textContent = e.message;
  }
});

const jaVistosLobby = new Set();
function renderSalaEspera(rs) {
  eraMinhaVez = false; // no lobby ninguém tem a vez: a primeira vez da aventura toca o som
  renderVitrine(rs);
  renderChatEspera();
  const lista = $('lista-grupo');
  lista.innerHTML = '';
  rs.personagens.forEach((p) => {
    const div = document.createElement('div');
    const chave = `${rs.codigo}:${p.id}`;
    div.className = `item-grupo${jaVistosLobby.has(chave) ? '' : ' chegou'}${p.personagem ? ' pronto' : ''}`;
    jaVistosLobby.add(chave);
    let status;
    if (!p.conectado) status = '<span class="status-offline">offline</span>';
    else if (p.personagem) status = '<span class="status-ok">pronto ✓</span>';
    else status = `<span class="status-pendente">${p.bot ? 'a IA está criando o personagem...' : 'escolhendo...'}</span>`;
    const coroa = p.id === rs.hostId ? ' 👑' : '';
    const tracos = p.bot && p.tracos && p.tracos.length ? `<br><small class="tracos-bot">🎭 ${p.tracos.map((t) => esc(t)).join(' · ')}</small>` : '';
    div.innerHTML = `<strong>${p.bot ? '🤖 ' : ''}${esc(p.nome)}${coroa}</strong><br>${p.personagem ? `<span class="nome-colorido" data-pers="${slugPers(p.personagem.nome)}">● ${esc(p.personagem.nome)}</span> — ${esc(p.personagem.classeNome)}` : ''}${tracos}<br>${status}`;
    lista.appendChild(div);
  });

  const conectados = rs.personagens.filter((p) => p.conectado);
  const todosProntos = conectados.length > 0 && conectados.every((p) => p.personagem);
  const btn = $('btn-iniciar-aventura');
  const msg = $('msg-espera');
  if (rs.status !== 'lobby') {
    btn.classList.add('escondido');
    msg.textContent = 'A aventura já começou — crie seu personagem para entrar na história.';
  } else if (souHost()) {
    btn.classList.remove('escondido');
    btn.disabled = !todosProntos || iniciandoAventura || rs.processando;
    msg.textContent = todosProntos ? 'Compartilhe o link de convite ou inicie quando o grupo estiver pronto.' : 'Aguardando todos escolherem personagem...';
  } else {
    btn.classList.add('escondido');
    msg.textContent = rs.processando ? 'O Mestre está preparando a aventura...' : todosProntos ? 'Aguardando o anfitrião iniciar a aventura...' : 'Aguardando todos escolherem personagem...';
  }  // Reticências animadas no lugar do "..." fixo.
  const esperando = /\.\.\.$/.test(msg.textContent);
  msg.classList.toggle('aguardando', esperando);
  if (esperando) msg.textContent = msg.textContent.slice(0, -3);
}

// Cutucadas: o cartão do outro balança com um dedo apontando por 5 s
// (para quem cutucou e para quem foi cutucado).
const CUTUCADA_MS = 5000;
const TREMOR_MS = 3000; // quem foi cutucado: a tela toda treme antes
let tremorTimer = null;
const cutucadas = new Map(); // jogadorId -> até quando o cartão balança
function marcarCutucada(jogadorId) {
  cutucadas.set(jogadorId, Date.now() + CUTUCADA_MS);
  if (estado.roomState) renderPainelGrupo(estado.roomState);
  setTimeout(() => {
    if ((cutucadas.get(jogadorId) || 0) <= Date.now()) {
      cutucadas.delete(jogadorId);
      if (estado.roomState) renderPainelGrupo(estado.roomState);
    }
  }, CUTUCADA_MS + 50);
}
async function cutucarJogador(id, nome) {
  try {
    await emitir('cutucar', { alvoId: id }, 10000);
    marcarCutucada(id);
    mostrarAvisoMesa({ icone: '👉', texto: `Você cutucou ${nome}.` });
  } catch (e) {
    mostrarAvisoMesa({ icone: '✋', texto: e.message });
  }
}

let corAberta = false; // o seletor de cor do cartão continua aberto entre atualizações
function renderPainelGrupo(rs) {
  const painel = $('painel-grupo');
  painel.innerHTML = '';
  rs.personagens.forEach((p) => {
    const c = p.personagem;
    if (!c) return;
    const pct = (a, b) => Math.max(0, Math.min(100, Math.round((a / b) * 100)));
    const xpProximo = c.nivel * 100;
    const selos = [];
    if (p.bot) selos.push('<span class="selo selo-bot">🤖 IA</span>');
    if (p.bot && p.tracos && p.tracos.length) selos.push(`<span class="selo selo-tracos" title="Personalidade do bot (fixa)">🎭 ${p.tracos.map((t) => esc(t[0].toUpperCase() + t.slice(1))).join(' · ')}</span>`);
    if (p.afastado) selos.push('<span class="selo selo-afastado">Afastado</span>');
    else if (!p.conectado) selos.push('<span class="selo selo-offline">offline</span>');
    if (c.morto) selos.push('<span class="selo selo-caido">☠️ morto</span>');
    else if (c.caido) selos.push(`<span class="selo selo-caido">💀 morrendo ${c.rodadasCaido || 0}/2</span>`);
    if (c.bonusProximoTeste) selos.push(`<span class="selo selo-bonus">+${c.bonusProximoTeste} no teste</span>`);
    if (p.pulos && !p.afastado) selos.push(`<span class="selo selo-pulos">pulos ${p.pulos}/${estado.config.maxPulos}</span>`);
    const vez = rs.status === 'em_jogo' && (rs.pendingTest ? rs.pendingTest.nomePersonagem === c.nome : rs.turnoAtual === c.nome);

    const div = document.createElement('div');
    const cutucado = (cutucadas.get(p.id) || 0) > Date.now();
    const outro = p.id !== estado.meuId && !p.bot && meuJogador()?.personagem && rs.status === 'em_jogo';
    div.className = `cartao-personagem-mini${vez ? ' na-vez' : ''}${p.afastado || !p.conectado ? ' inativo' : ''}${c.morto ? ' morto' : ''}${cutucado ? ' cutucado' : ''}${outro ? ' cutucavel' : ''}`;
    div.dataset.id = p.id;
    if (outro) div.title = `Clique para cutucar ${c.nome} (1 vez por rodada)`;
    div.style.setProperty('--cor-classe', c.cor || c.corTema);
    div.innerHTML = `
      <div class="topo">
        ${avatarHtml(c.avatar, c.cor || c.corTema)}
        <div>
          <div class="nome">${esc(c.nome)}${p.id === estado.meuId ? ' (você)' : ''}</div>
          <div class="classe">${esc(c.classeNome)} · Nv ${c.nivel} · ${esc(p.nome)}</div>
        </div>
      </div>
      ${selos.length ? `<div class="selos">${selos.join('')}</div>` : ''}
      <div class="barra hp"><div style="width:${pct(c.hp.atual, c.hp.max)}%"></div></div>
      <div>PV ${c.hp.atual}/${c.hp.max}</div>
      <div class="barra recurso"><div style="width:${pct(c.recurso.atual, c.recurso.max)}%"></div></div>
      <div>${esc(c.recurso.nome)} ${c.recurso.atual}/${c.recurso.max}</div>
      <div class="barra xp"><div style="width:${pct(c.xp || 0, xpProximo)}%"></div></div>
      <div>XP ${c.xp || 0}/${xpProximo}</div>
      ${(() => { const a = c.inventario.find((i) => i.tipo === 'arma' && i.equipado); return a ? `<div class="arma-card">${itemHtml({ ...a, equipado: false })}</div>` : ''; })()}
      <div class="moedas">🪙 ${c.moedas || 0}</div>
      <details class="inventario"><summary>Inventário (${c.inventario.length})</summary><ul>${c.inventario.map((i) => `<li>${itemHtml(i)}</li>`).join('')}</ul></details>
      ${cutucado ? '<span class="dedo-cutucada" aria-hidden="true">👉</span>' : ''}
      ${p.id === estado.meuId && !c.morto ? '<details class="trocar-cor"><summary>🎨 Cor</summary><div class="seletor-cor"></div></details>' : ''}`;
    const trocar = div.querySelector('.trocar-cor');
    if (trocar) {
      if (corAberta) trocar.open = true;
      trocar.addEventListener('toggle', () => (corAberta = trocar.open));
      bolinhasCor(trocar.querySelector('.seletor-cor'), c.cor, (hex) => emitir('mudarCor', { cor: hex }).catch((e) => alert(e.message)));
    }
    if (outro) {
      div.addEventListener('click', (ev) => {
        if (ev.target.closest('details, summary, button, a, input')) return; // inventário, cor etc.
        cutucarJogador(p.id, c.nome);
      });
    }
    painel.appendChild(div);
    if (p.id === estado.meuId) {
      // Abas do celular: PV no botão "Grupo" e um aviso em "Mesa" quando é a sua vez.
      $('aba-grupo-pv').textContent = c.morto ? '☠️' : `❤️${c.hp.atual}`;
      $('aba-mesa-vez').classList.toggle('escondido', !vez || abaMesa === 'mesa');
    }
  });
}

// ---------------------------------------------------------------------------
// Celular: a mesa em abas (Mesa / Grupo / Chat). No desktop as abas ficam ocultas
// e os três painéis aparecem lado a lado.
// ---------------------------------------------------------------------------
let abaMesa = 'mesa';
function trocarAbaMesa(aba) {
  abaMesa = aba;
  $('tela-jogo').dataset.aba = aba;
  document.querySelectorAll('#abas-mesa button').forEach((b) => b.classList.toggle('ativa', b.dataset.aba === aba));
  if (aba === 'chat') {
    $('aba-chat-novas').classList.add('escondido');
    rolarChatParaFim();
  }
  if (aba === 'mesa') {
    $('aba-mesa-vez').classList.add('escondido');
    const cab = document.querySelector('.jogo-cabecalho');
    if (cab) cab.scrollLeft = 0; // mostra "Sala XXXXX" de novo
    const log = $('chat-log');
    requestAnimationFrame(() => (log.scrollTop = log.scrollHeight));
  }
}
$('abas-mesa').addEventListener('click', (ev) => {
  const b = ev.target.closest('button[data-aba]');
  if (b) trocarAbaMesa(b.dataset.aba);
});
trocarAbaMesa('mesa');

// Celular: os controles da sala (código, diário, objetivos, encerrar, ajustes, som) e o
// volume da música saem do cabeçalho e entram na linha das abas, rolando para o lado.
// No desktop eles voltam aos lugares originais. Os elementos são movidos (não copiados),
// então os eventos continuam valendo.
const mqCelular = window.matchMedia('(max-width: 1000px)');
const ehCelular = () => mqCelular.matches;
const itensCabecalhoMesa = [...document.querySelector('.jogo-cabecalho').children];
function arrumarBarraMesa() {
  const extras = $('abas-extras');
  const cab = document.querySelector('.jogo-cabecalho');
  const musica = $('controle-musica');
  const noTopo = () => document.querySelector('.topo-site').insertBefore(musica, document.querySelector('.conta-topo'));
  if (ehCelular()) {
    itensCabecalhoMesa.forEach((el) => extras.appendChild(el));
    // Na mesa o volume vai para a linha das abas; fora dela (sala de espera) fica no topo.
    if (document.body.classList.contains('em-mesa')) extras.appendChild(musica);
    else noTopo();
  } else {
    itensCabecalhoMesa.forEach((el) => cab.appendChild(el));
    noTopo();
  }
}
mqCelular.addEventListener('change', () => {
  arrumarBarraMesa();
  sugestoesDesenhadas = null; // redesenha os textos na versão certa
  buscaveisDesenhados = null;
});
arrumarBarraMesa();
$('rotulo-sala').addEventListener('click', () => {
  if (!estado.codigo) return;
  navigator.clipboard?.writeText(linkConvite(estado.codigo)).catch(() => {});
  mostrarAvisoMesa({ icone: '🔗', texto: `Link de convite da sala ${estado.codigo} copiado` });
});

// Altura útil da tela no celular: a barra do navegador e o teclado virtual mudam
// o espaço visível; a mesa acompanha para o campo de envio nunca ficar escondido.
(() => {
  const vv = window.visualViewport;
  let maior = 0;
  function ajustar() {
    // O menor valor informado: alguns navegadores contam a área sob a própria barra.
    const altura = Math.min(vv ? vv.height : Infinity, window.innerHeight, document.documentElement.clientHeight || Infinity);
    maior = Math.max(maior, altura);
    document.documentElement.style.setProperty('--altura-util', `${Math.round(altura)}px`);
    const campo = document.activeElement;
    const digitando = campo && /^(INPUT|TEXTAREA|SELECT)$/.test(campo.tagName) && campo.type !== 'checkbox' && campo.type !== 'range';
    document.body.classList.toggle('teclado-aberto', Boolean(digitando && altura < maior * 0.8));
    // iOS rola a página para mostrar o campo; com a mesa em tela cheia, volta ao topo.
    if (document.body.classList.contains('em-mesa') && window.scrollY) window.scrollTo(0, 0);
  }
  (vv || window).addEventListener('resize', ajustar);
  window.addEventListener('orientationchange', () => { maior = 0; setTimeout(ajustar, 300); });
  document.addEventListener('focusin', () => setTimeout(ajustar, 350));
  document.addEventListener('focusout', () => setTimeout(ajustar, 350));
  ajustar();
})();

function renderPainelCena(rs) {
  const painel = $('painel-cena');
  if (!rs.cena) {
    painel.classList.add('escondido');
    return;
  }
  painel.classList.remove('escondido');
  const icones = { dia: '☀️', noite: '🌙', chuva: '🌧️', perigo: '⚠️', calmo: '🍃', tensao: '⚡' };
  const iconeCena = $('cena-icone');
  if (rs.cena.imagem) {
    if (iconeCena.dataset.imagem !== rs.cena.imagem) {
      iconeCena.dataset.imagem = rs.cena.imagem;
      iconeCena.innerHTML = `<img src="${esc(BASE + rs.cena.imagem)}" alt="${esc(rs.cena.local)}" />`;
      iconeCena.onclick = () => ampliarImagem(BASE + rs.cena.imagem, rs.cena.local);
    }
  } else {
    delete iconeCena.dataset.imagem;
    iconeCena.onclick = null;
    iconeCena.textContent = icones[rs.cena.clima] || '🌄';
  }
  $('cena-local').textContent = rs.cena.local;
  $('cena-descricao').textContent = rs.cena.descricao;
  $('cena-fichas').innerHTML = rs.personagens
    .filter((p) => p.personagem && p.conectado && !p.afastado)
    .map((p) => `<div class="ficha-token">${avatarHtml(p.personagem.avatar, p.personagem.corTema)}<span>${esc(p.personagem.nome)}</span></div>`)
    .join('');
}

// ---------------------------------------------------------------------------
// Turno: quem age, contagem regressiva, sugestões e habilidades
// ---------------------------------------------------------------------------
// Preferências do jogador (caixas com data-lembrar) ficam salvas no navegador:
// sobrevivem a recarregar a página e a fechar e abrir o navegador.
document.querySelectorAll('input[type=checkbox][data-lembrar]').forEach((chk) => {
  try {
    const salvo = localStorage.getItem(chk.dataset.lembrar);
    if (salvo !== null) chk.checked = salvo === '1';
  } catch { /* sem storage: fica o padrão */ }
  chk.addEventListener('change', () => {
    try {
      localStorage.setItem(chk.dataset.lembrar, chk.checked ? '1' : '0');
    } catch { /* sem storage */ }
  });
});

let eraMinhaVez = null; // null = ainda não avaliado nesta mesa (entrar já na sua vez não toca)
function minhaVez() {
  const rs = estado.roomState;
  if (!rs || rs.status !== 'em_jogo' || mestreNarrando) return false;
  const eu = meuJogador();
  if (!eu || eu.afastado || !eu.personagem) return false;
  return !rs.pendingTest && rs.turnoAtual === eu.personagem.nome;
}

function formatarSegundos(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function atualizarControleTurno() {
  const rs = estado.roomState;
  if (!rs || !meuJogador()?.personagem) return;
  const input = $('input-acao');
  const aviso = $('aviso-turno');
  const meuNome = meuNomeExibicao();
  const restante = estado.turnoPrazo ? estado.turnoPrazo - Date.now() : null;
  const cel = ehCelular();
  const relogio = rs.pausadoPorDado ? (cel ? ' ⏸' : ' ⏸ tempo pausado (rolagem de dado)') : restante != null ? ` ⏱ ${formatarSegundos(restante)}` : '';

  let bloqueio = null;
  let destaque = false;
  if (rs.status === 'encerrada') bloqueio = 'Aventura encerrada.';
  else if (mestreNarrando) bloqueio = cel ? '✍️ Mestre narrando…' : 'O Mestre está narrando — aguarde...';
  else if (rs.pendingTest) {
    const meu = rs.pendingTest.nomePersonagem.toLowerCase() === meuNome.toLowerCase();
    const restDado = estado.dadoPrazo ? estado.dadoPrazo - Date.now() : null;
    const relDado = restDado != null ? ` 🎲 ${formatarSegundos(restDado)}` : '';
    bloqueio = meu
      ? (cel ? `🎲 Role o dado${relDado}` : `Role o dado acima para continuar.${relDado} · relógio da vez pausado`)
      : (cel ? `🎲 ${rs.pendingTest.nomePersonagem} rolando${relDado}` : `Teste de ${rs.pendingTest.nomePersonagem} — aguardando${relDado}`);
    destaque = meu;
    const el = $('relogio-dado');
    el.textContent = restDado != null
      ? (cel ? `⏳ ${formatarSegundos(restDado)} · sem rolar = falha` : `🎲 ${formatarSegundos(restDado)} para rolar — se não rolar a tempo, conta como falha.`)
      : '';
    el.classList.toggle('urgente', restDado != null && restDado < 15000);
  } else if (!rs.turnoAtual) bloqueio = cel ? 'Mesa pausada' : 'Mesa pausada: ninguém ativo no momento.';
  else if (rs.turnoAtual !== meuNome) bloqueio = `Vez de ${rs.turnoAtual}${relogio}`;

  const vez = minhaVez();
  // Som de "sua vez": toca só aqui, no aparelho de quem recebeu a vez.
  if (eraMinhaVez === false && vez) Musica.efeito('sua-vez', 0.9);
  eraMinhaVez = vez;
  // O campo fica liberado para ir escrevendo antes da vez; só o Enviar espera a vez.
  const eu = meuJogador();
  const podeEscrever = rs.status === 'em_jogo' && !!eu && !!eu.personagem && !eu.personagem.morto && !eu.afastado;
  input.disabled = !podeEscrever;
  document.querySelector('#form-acao button[type=submit]').disabled = !vez;
  $('btn-passar-vez').disabled = !vez;
  input.placeholder = vez
    ? (cel ? 'O que você faz?' : 'Sua vez! O que você faz?')
    : podeEscrever && bloqueio
      ? `${bloqueio}${cel ? ' · já pode escrever' : ' · você já pode ir escrevendo'}`
      : bloqueio || '';
  aviso.classList.remove('escondido');
  aviso.classList.toggle('aviso-minha-vez', vez || destaque);
  const restanteDado = rs.pendingTest && estado.dadoPrazo ? estado.dadoPrazo - Date.now() : null;
  aviso.classList.toggle('aviso-urgente', (vez || destaque) && ((restante != null && restante < 15000) || (restanteDado != null && restanteDado < 15000)));
  aviso.textContent = vez ? `🎯 Sua vez!${relogio}` : bloqueio || '';

  renderSugestoes(vez);
  renderHabilidades(vez);
  renderBuscaveis(vez);
  $('btn-descansar').disabled = !vez || !rs.descansoDisponivel;
  $('btn-descansar').title = rs.descansoDisponivel
    ? 'Uma vez por cena: o grupo recupera metade de PV e recurso (gasta a vez)'
    : 'O grupo já descansou nesta cena';
}

// Relógio da vez: atualiza a contagem regressiva sem esperar o servidor.
setInterval(() => {
  if ((estado.turnoPrazo || estado.dadoPrazo) && $('tela-jogo').classList.contains('tela-ativa')) atualizarControleTurno();
}, 500);

let sugestoesDesenhadas = '';
function renderSugestoes(vez) {
  const box = $('sugestoes');
  const lista = vez ? estado.roomState.sugestoes || [] : [];
  const chave = lista.join('|');
  box.classList.toggle('escondido', !lista.length);
  if (chave === sugestoesDesenhadas) return;
  sugestoesDesenhadas = chave;
  box.innerHTML = '<span class="rotulo-sugestoes">Sugestões:</span>';
  lista.forEach((s) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip-sugestao';
    b.textContent = s;
    b.addEventListener('click', () => enviarAcao(s));
    box.appendChild(b);
  });
}

// ---------------------------------------------------------------------------
// Ajuda "?" das habilidades: explica o poder, o custo e quanto tirar no dado.
// Abre ao passar o mouse e fica fixa ao clicar (útil no celular).
// ---------------------------------------------------------------------------
const popoverAjuda = document.createElement('div');
popoverAjuda.className = 'popover-ajuda escondido';
popoverAjuda.setAttribute('role', 'tooltip');
document.body.appendChild(popoverAjuda);
let ajudaFixadaEm = null;

function mostrarAjuda(alvo, html) {
  popoverAjuda.innerHTML = html;
  popoverAjuda.classList.remove('escondido');
  const r = alvo.getBoundingClientRect();
  const largura = popoverAjuda.offsetWidth;
  const altura = popoverAjuda.offsetHeight;
  const esquerda = Math.min(Math.max(8, r.left + r.width / 2 - largura / 2), window.innerWidth - largura - 8);
  let topo = r.top - altura - 8; // prefere em cima (os botões ficam no rodapé da mesa)
  if (topo < 8) topo = r.bottom + 8;
  popoverAjuda.style.left = `${esquerda}px`;
  popoverAjuda.style.top = `${topo}px`;
}
function esconderAjuda() {
  popoverAjuda.classList.add('escondido');
  ajudaFixadaEm = null;
}
document.addEventListener('click', (ev) => {
  if (ajudaFixadaEm && !ev.target.closest('.ajuda-hab') && !ev.target.closest('.popover-ajuda')) esconderAjuda();
});
document.addEventListener('keydown', (ev) => ev.key === 'Escape' && esconderAjuda());

function botaoAjuda(gerarHtml) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'ajuda-hab';
  b.textContent = '?';
  b.setAttribute('aria-label', 'O que esta habilidade faz?');
  b.addEventListener('mouseenter', () => !ajudaFixadaEm && mostrarAjuda(b, gerarHtml()));
  b.addEventListener('mouseleave', () => !ajudaFixadaEm && esconderAjuda());
  b.addEventListener('focus', () => !ajudaFixadaEm && mostrarAjuda(b, gerarHtml()));
  b.addEventListener('blur', () => !ajudaFixadaEm && esconderAjuda());
  b.addEventListener('click', (ev) => {
    ev.stopPropagation();
    if (ajudaFixadaEm === b) return esconderAjuda();
    ajudaFixadaEm = b;
    mostrarAjuda(b, gerarHtml());
  });
  return b;
}

const RECARGA_CLASSE = {
  guerreiro: '{R}: volta +1 cada vez que você leva dano.',
  batedor: '{R}: volta +1 em cada vez que você age sem usar habilidade.',
  arcanista: '{R}: volta +1 a cada rodada da mesa.',
  guardiao: '{R}: volta +1 a cada rodada e +1 quando você cura ou ajuda um aliado.',
};
const DIFS = [['fácil', 10], ['médio', 13], ['difícil', 16], ['muito difícil', 19]];

// Quanto precisa tirar no d20 para cada dificuldade.
function tabelaDado(mod, bonus) {
  const linhas = DIFS.map(([nome, dc]) => {
    const precisa = dc - mod - bonus;
    const txt = precisa <= 2 ? '2+ (só falha no 1)' : precisa > 20 ? 'só com 20 natural' : `${precisa}+`;
    return `<tr><td>${nome} (${dc})</td><td><strong>${txt}</strong></td></tr>`;
  });
  return `<table class="tabela-dado"><tr><th>Dificuldade</th><th>Tirar no d20</th></tr>${linhas.join('')}</table>`;
}

function ajudaHabilidade(classeId, h, { mods, recursoAtual, bonusAtual = 0 }) {
  const classe = classeVestida(classeId);
  const attr = classe.atributoPrincipal;
  const label = estado.config.ATTRIBUTE_LABELS[attr];
  const mod = (mods && mods[attr]) || 0;
  const sinal = (n) => (n >= 0 ? `+${n}` : `${n}`);
  const partes = [`<div class="ajuda-titulo">✨ ${esc(h.nome)}</div>`,
    `<p>${esc(h.descricao)}</p>`,
    `<p class="ajuda-custo">Custa <strong>${h.custo} ${esc(classe.recurso.nome)}</strong>${recursoAtual != null ? ` · você tem ${recursoAtual}` : ''}. Usar gasta a sua vez; o que você digitar no campo descreve como usa.</p>`];

  if (h.bonus) {
    const total = Math.min(5, bonusAtual + h.bonus);
    partes.push(`<p>Dá <strong>+${h.bonus}</strong> no seu próximo teste (qualquer atributo; bônus acumulado no máximo +5).
      No dado: <strong>d20 ${sinal(mod)} (${esc(label)}) +${total}</strong> contra a dificuldade.</p>`);
    partes.push(`<div class="ajuda-sub">Num teste de ${esc(label)}, com este poder:</div>${tabelaDado(mod, total)}`);
    const semPoder = 13 - mod - bonusAtual;
    partes.push(`<div class="ajuda-sub">Sem o poder, no médio, precisaria de ${semPoder <= 2 ? '2+' : semPoder > 20 ? '20 natural' : semPoder + '+'}.</div>`);
  } else if (h.bonusGrupo) {
    partes.push(`<p>Cada <strong>aliado</strong> ganha <strong>+${h.bonusGrupo}</strong> no próximo teste dele (você não recebe). Não precisa rolar dado para usar.</p>`);
  } else if (h.cura) {
    partes.push(`<p>Cura <strong>1d6+${h.cura} PV</strong> (de ${1 + h.cura} a ${6 + h.cura}) no aliado com a menor porcentagem de PV, que pode ser você. Também levanta quem estiver caído. Não precisa rolar dado.</p>`);
  }
  partes.push(`<p class="ajuda-rodape">🎲 20 natural é sempre sucesso; 1 natural é sempre falha crítica.<br>🔄 ${(RECARGA_CLASSE[classeId] || '').replace('{R}', classe.recurso.nome)}</p>`);
  return partes.join('');
}

// Clicar num poder escreve `Usar "Raio Arcano" ` no campo para o jogador completar;
// a habilidade só é usada quando ele envia a ação.
let habilidadePendente = null;
const prefixoHabilidade = (h) => `Usar "${h.nome}" `;
function habilidadeDef(id) {
  const c = meuJogador()?.personagem;
  return c ? habilidadesDe(c.classeId).find((h) => h.id === id) : null;
}
let armaPendente = null; // uid da arma do ataque sendo escrito
const prefixoArma = (i) => `Atacar com "${i.nome}" `;
function armaDef(uid) {
  return meuJogador()?.personagem?.inventario.find((i) => i.uid === uid) || null;
}
// Tira do campo o prefixo da seleção atual (poder ou arma) e devolve o resto.
function textoSemPrefixo() {
  const input = $('input-acao');
  const h = habilidadePendente && habilidadeDef(habilidadePendente);
  const a = armaPendente && armaDef(armaPendente);
  const prefixo = h ? prefixoHabilidade(h) : a ? prefixoArma(a) : '';
  return prefixo && input.value.startsWith(prefixo) ? input.value.slice(prefixo.length) : input.value;
}
function selecionarArma(item) {
  const input = $('input-acao');
  const resto = textoSemPrefixo();
  const mesma = armaPendente === item.uid;
  habilidadePendente = null;
  armaPendente = mesma ? null : item.uid;
  input.value = mesma ? resto : prefixoArma(item) + resto;
  habilidadesDesenhadas = '';
  atualizarControleTurno();
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
}
function selecionarHabilidade(h) {
  const input = $('input-acao');
  const resto = textoSemPrefixo();
  armaPendente = null;
  if (habilidadePendente === h.id) {
    habilidadePendente = null; // clicou de novo: desfaz
    input.value = resto;
  } else {
    habilidadePendente = h.id;
    input.value = prefixoHabilidade(h) + resto;
  }
  habilidadesDesenhadas = '';
  atualizarControleTurno();
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
}
$('input-acao').addEventListener('input', () => {
  const h = habilidadePendente && habilidadeDef(habilidadePendente);
  const a = armaPendente && armaDef(armaPendente);
  const valor = $('input-acao').value;
  if ((h && !valor.startsWith(prefixoHabilidade(h).trim())) || (a && !valor.startsWith(prefixoArma(a).trim()))) {
    habilidadePendente = null; // apagou o "Usar ..."/"Atacar com ...": volta a ser uma ação comum
    armaPendente = null;
    habilidadesDesenhadas = '';
    atualizarControleTurno();
  }
});

function ajudaArma(c, item) {
  const def = estado.config.ITENS[item.id];
  const a = def.arma;
  const label = estado.config.ATTRIBUTE_LABELS[a.atributo];
  const mod = (c.modificadores && c.modificadores[a.atributo]) || 0;
  const bonusTotal = Math.min(99, a.bonus + (c.bonusProximoTeste || 0));
  const modDano = Math.max(0, mod);
  const medio = Math.round(a.dano[0] * (a.dano[1] + 1) / 2 + modDano);
  return [
    `<div class="ajuda-titulo">${esc(item.icone)} ${esc(item.nome)}</div>`,
    `<p>${esc(descItem(item.id))}${a.distancia ? ' Ataca à distância.' : ''}</p>`,
    `<p class="ajuda-custo">Não gasta recurso. Atacar gasta a sua vez: o Mestre pede um teste de ataque e, se acertar, o sistema rola o dano.</p>`,
    `<p>No dado: <strong>d20 ${mod >= 0 ? '+' : ''}${mod} (${esc(label)}) +${a.bonus} (arma)${c.bonusProximoTeste ? ` +${c.bonusProximoTeste} (bônus)` : ''}</strong>.</p>`,
    `<div class="ajuda-sub">Num ataque de ${esc(label)}:</div>${tabelaDado(mod, bonusTotal)}`,
    `<p>💥 Dano ao acertar: <strong>${a.dano[0]}d${a.dano[1]}${modDano ? ` + ${modDano}` : ''}</strong> (média ${medio}). No 20 natural, os dados de dano dobram.</p>`,
    `<p class="ajuda-rodape">Inimigos comuns aguentam uns 6 a 12 de dano; chefes, 20 a 40. Troque de arma no 🎒 Inventário.</p>`,
  ].join('');
}

let habilidadesDesenhadas = '';
function renderHabilidades(vez) {
  const barra = $('barra-habilidades');
  const c = meuJogador()?.personagem;
  if (!c) return;
  const habs = habilidadesDe(c.classeId);
  const arma = c.inventario.find((i) => i.tipo === 'arma' && i.equipado);
  const chave = `${vez}|${c.recurso.atual}|${c.bonusProximoTeste || 0}|${estado.roomState.status}|${habilidadePendente}|${armaPendente}|${arma && arma.uid}`;
  if (chave === habilidadesDesenhadas) return;
  habilidadesDesenhadas = chave;
  barra.innerHTML = '';
  if (estado.roomState.status !== 'em_jogo') return;
  if (arma && estado.config.ITENS[arma.id]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `botao-habilidade botao-ataque${armaPendente === arma.uid ? ' selecionada' : ''}`;
    b.disabled = !vez;
    b.innerHTML = `⚔️ Atacar <span class="custo">${esc(arma.icone)} ${esc(arma.nome)}</span>`;
    b.addEventListener('click', () => selecionarArma(arma));
    const grupo = document.createElement('span');
    grupo.className = 'grupo-habilidade';
    grupo.append(b, botaoAjuda(() => ajudaArma(meuJogador()?.personagem || c, arma)));
    barra.appendChild(grupo);
  }
  habs.forEach((h) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'botao-habilidade';
    b.disabled = !vez || c.recurso.atual < h.custo;
    b.innerHTML = `✨ ${esc(h.nome)} <span class="custo">${h.custo} ${esc(c.recurso.nome)}</span>`;
    b.classList.toggle('selecionada', habilidadePendente === h.id);
    b.addEventListener('click', () => selecionarHabilidade(h));
    const grupo = document.createElement('span');
    grupo.className = 'grupo-habilidade';
    grupo.append(b, botaoAjuda(() => {
      const atual = meuJogador()?.personagem || c;
      return ajudaHabilidade(atual.classeId, h, { mods: atual.modificadores, recursoAtual: atual.recurso.atual, bonusAtual: atual.bonusProximoTeste || 0 });
    }));
    barra.appendChild(grupo);
  });
}

let enviandoAcao = false;
// extras: { habilidadeId } | { itemUid, alvoId } | { descansar: true }
async function enviarAcao(texto, extras = {}) {
  if (enviandoAcao) return;
  if (!texto && !Object.keys(extras).length) return;
  const input = $('input-acao');
  enviandoAcao = true;
  input.value = '';
  try {
    await emitir('acaoJogador', { texto, ...extras });
    return true;
  } catch (e) {
    input.value = texto; // devolve o texto para não perder o que foi digitado
    alert(e.message);
  } finally {
    enviandoAcao = false;
  }
}

$('form-acao').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  if (!minhaVez()) return; // dá para escrever antes, mas só envia na sua vez
  const texto = $('input-acao').value.trim();
  const extras = habilidadePendente ? { habilidadeId: habilidadePendente } : armaPendente ? { armaUid: armaPendente } : {};
  const ok = await enviarAcao(texto, extras);
  if (ok) {
    habilidadePendente = null;
    armaPendente = null;
    habilidadesDesenhadas = '';
  }
});

$('btn-passar-vez').addEventListener('click', () => emitir('passarVez').catch((e) => alert(e.message)));

// Digitando na sua vez = está jogando: o servidor dá um fôlego antes de pular.
let ultimaAtividade = 0;
$('input-acao').addEventListener('input', () => {
  if (Date.now() - ultimaAtividade < 4000 || !socket || !minhaVez()) return;
  ultimaAtividade = Date.now();
  socket.emit('atividade', { codigo: estado.codigo });
});

$('btn-voltei').addEventListener('click', () => emitir('voltei').catch((e) => alert(e.message)));

$('btn-encerrar').addEventListener('click', async () => {
  if (!confirm('Encerrar a aventura agora? O Mestre vai narrar o epílogo e a mesa será fechada.')) return;
  const btn = $('btn-encerrar');
  btn.disabled = true;
  try {
    await emitir('encerrarAventura');
  } catch (e) {
    alert(e.message);
  } finally {
    btn.disabled = false;
  }
});

$('btn-exportar').addEventListener('click', () => {
  const rs = estado.roomState;
  const linhas = [
    `4Ever — Diário da aventura: ${rs?.aventuraTitulo || 'Aventura personalizada'} (sala ${estado.codigo})`,
    `Exportado em ${new Date().toLocaleString('pt-BR')}`,
    '',
    ...(rs?.missao ? [`MISSÃO: ${rs.missao.objetivo}${rs.resultado ? ` — ${{ cumprida: 'CUMPRIDA', falhou: 'FALHOU', interrompida: 'INTERROMPIDA' }[rs.resultado]}` : ''}`,
      ...rs.missao.etapas.map((e, i) => `  ${e.concluida ? '[x]' : '[ ]'} ${i + 1}. ${e.texto}`), ''] : []),
    'GRUPO:',
    ...(rs?.personagens || []).filter((p) => p.personagem).map((p) => `- ${p.personagem.nome} (${p.personagem.classeNome}, nível ${p.personagem.nivel}) — jogador: ${p.nome}`),
    '',
    ...estado.log.filter((m) => !m.efemero).map((m) => `[${new Date(m.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}] ${m.autor}: ${m.texto}\n`),
  ];
  const blob = new Blob([linhas.join('\n')], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `4ever-diario-${estado.codigo}.txt`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
});


// ---------------------------------------------------------------------------
// Itens, pontos de busca, descanso e baú
// ---------------------------------------------------------------------------
function itemHtml(i) {
  if (typeof i === 'string') return esc(i);
  const rar = i.raridade || 'narrativo';
  const titulo = i.id && estado.config.ITENS[i.id] ? ` title="${esc(descItem(i.id))}"` : '';
  const marca = i.equipado ? (i.tipo === 'arma' ? ' <em>(empunhada)</em>' : ' <em>(equipado)</em>') : '';
  return `<span class="rar-${rar}"${titulo}>${esc(i.icone || '•')} ${esc(i.nome)}${marca}</span>`;
}

let buscaveisDesenhados = '';
function renderBuscaveis(vez) {
  const box = $('buscaveis');
  const lista = (estado.roomState.status === 'em_jogo' && estado.roomState.buscaveis) || [];
  const chave = JSON.stringify([vez, lista]);
  box.classList.toggle('escondido', !lista.length);
  if (chave === buscaveisDesenhados) return;
  buscaveisDesenhados = chave;
  box.innerHTML = '';
  lista.forEach((b) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'botao-busca';
    if (b.aberto) {
      btn.disabled = true;
      btn.innerHTML = `✓ ${esc(b.icone)} ${esc(b.nome)} <span class="estado-busca">revistado por ${esc(b.abertoPor)}</span>`;
    } else {
      btn.disabled = !vez;
      const estadoTxt = b.estado === 'trancado' ? '🔒<span class="rotulo-longo"> trancado</span>' : b.estado === 'armadilha' ? '❓<span class="rotulo-longo"> algo estranho</span>' : '';
      btn.innerHTML = `🔍 <span class="rotulo-longo">Procurar: </span>${esc(b.icone)} ${esc(b.nome)}${estadoTxt ? ` <span class="estado-busca">${estadoTxt}</span>` : ''}`;
      btn.title = b.estado === 'livre' ? 'Revistar (gasta a vez)' : `Precisa de um teste de ${estado.config.ATTRIBUTE_LABELS[b.atributo] || b.atributo} para abrir (gasta a vez)`;
      btn.addEventListener('click', () => emitir('procurar', { buscavelId: b.id }).catch((e) => alert(e.message)));
    }
    box.appendChild(btn);
  });
}

$('btn-descansar').addEventListener('click', () => {
  if (!confirm('Descansar agora? O grupo recupera metade de PV e recurso (uma vez por cena) e isso gasta a sua vez.')) return;
  enviarAcao($('input-acao').value.trim(), { descansar: true });
});

// --- Inventário ---
$('btn-inventario').addEventListener('click', () => {
  inventarioDesenhado = ''; // abre sempre com a lista atualizada
  $('modal-inventario').classList.remove('escondido');
  renderInventario();
});
$('btn-fechar-inventario').addEventListener('click', () => $('modal-inventario').classList.add('escondido'));

function opcoesAliados({ incluirEu }) {
  return (estado.roomState?.personagens || [])
    .filter((p) => p.personagem && (incluirEu || p.id !== estado.meuId))
    .map((p) => `<option value="${esc(p.id)}">${esc(p.personagem.nome)}${p.id === estado.meuId ? ' (você)' : ''}</option>`)
    .join('');
}

let inventarioDesenhado = '';
function renderInventario() {
  if ($('modal-inventario').classList.contains('escondido')) return;
  const c = meuJogador()?.personagem;
  const lista = $('lista-inventario');
  if (!c) return;
  $('inventario-moedas').textContent = `🪙 ${c.moedas || 0} moedas`;
  const vez = minhaVez();
  const livre = !mestreNarrando && estado.roomState.status === 'em_jogo';
  const temAliados = estado.roomState.personagens.some((p) => p.personagem && p.id !== estado.meuId);
  // Só redesenha se algo do inventário mudou: redesenhar a cada atualização da mesa
  // mudava a lista de lugar entre a mira e o clique (e o clique caía em outro item).
  const chave = JSON.stringify([c.inventario.map((i) => [i.uid, i.nome, i.equipado]), c.moedas, vez, livre,
    estado.roomState.personagens.filter((p) => p.personagem).map((p) => p.id + p.personagem.nome)]);
  if (chave === inventarioDesenhado) return;
  inventarioDesenhado = chave;
  lista.innerHTML = c.inventario.length ? '' : '<p class="vazio">Inventário vazio. Procure em baús, gavetas e bolsas pelo caminho!</p>';

  c.inventario.forEach((i) => {
    const def = i.id ? estado.config.ITENS[i.id] : null;
    const div = document.createElement('div');
    div.className = `item-inv${i.equipado ? ' equipado' : ''}`;
    let acoes = '';
    if (i.tipo === 'consumivel') {
      acoes += `<select data-alvo-usar>${opcoesAliados({ incluirEu: true })}</select>
        <button type="button" data-acao="usar" ${vez ? '' : 'disabled title="Só na sua vez"'}>Usar (gasta a vez)</button>`;
    }
    if (i.tipo === 'artefato') {
      acoes += `<button type="button" data-acao="equipar" ${livre ? '' : 'disabled'}>${i.equipado ? 'Guardar' : 'Equipar'}</button>`;
    }
    if (i.tipo === 'arma') {
      acoes += `<button type="button" data-acao="atacar" ${vez ? '' : 'disabled title="Só na sua vez"'}>⚔️ Atacar (gasta a vez)</button>
        <button type="button" data-acao="equipar" class="botao-secundario" ${livre ? '' : 'disabled'}>${i.equipado ? 'Guardar' : 'Empunhar'}</button>`;
    }
    if (temAliados) {
      acoes += `<select data-alvo-dar>${opcoesAliados({ incluirEu: false })}</select>
        <button type="button" data-acao="dar" class="botao-secundario" ${livre ? '' : 'disabled'}>Dar</button>`;
    }
    acoes += `<button type="button" data-acao="descartar" class="botao-secundario" ${livre ? '' : 'disabled'}>Descartar</button>`;
    const rar = i.raridade ? ` · ${estado.config.RARIDADES[i.raridade]?.nome || ''}` : '';
    div.innerHTML = `
      <div class="nome-item">${itemHtml(i)}</div>
      <div class="desc-item">${def ? esc(descItem(i.id)) + esc(rar) : 'Item da história (o Mestre decide como ele pode ajudar).'}</div>
      <div class="acoes-item">${acoes}</div>`;
    div.querySelectorAll('button[data-acao]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        const acao = btn.dataset.acao;
        try {
          if (acao === 'usar') {
            $('modal-inventario').classList.add('escondido');
            await enviarAcao($('input-acao').value.trim(), { itemUid: i.uid, alvoId: div.querySelector('[data-alvo-usar]').value });
          } else if (acao === 'atacar') {
            $('modal-inventario').classList.add('escondido');
            selecionarArma(i);
          } else if (acao === 'equipar') await emitir('equiparItem', { uid: i.uid });
          else if (acao === 'dar') await emitir('darItem', { uid: i.uid, alvoId: div.querySelector('[data-alvo-dar]').value });
          else if (acao === 'descartar' && confirm(`Descartar ${i.nome}?`)) await emitir('descartarItem', { uid: i.uid });
        } catch (e) {
          alert(e.message);
        }
      })
    );
    lista.appendChild(div);
  });
}

// --- Baú/gaveta aberto: animação para toda a mesa ---
const filaSaque = [];
let saqueAberto = false;

function receberSaque(saque) {
  filaSaque.push(saque);
  mostrarProximoSaque();
}

function mostrarProximoSaque() {
  if (saqueAberto || !filaSaque.length || modalDado.aberto) return; // espera o modal do dado fechar
  const s = filaSaque.shift();
  saqueAberto = true;
  const souEu = s.jogadorId === estado.meuId;
  $('titulo-saque').textContent = `${souEu ? 'Você abriu' : `${s.personagem} abriu`}: ${s.local}`;
  const icone = $('saque-icone');
  icone.textContent = s.icone;
  icone.className = 'saque-icone tremendo';
  const itens = $('saque-itens');
  itens.innerHTML = '';
  const btn = $('btn-fechar-saque');
  btn.disabled = true;
  btn.textContent = 'Abrindo...';
  $('modal-saque').classList.remove('escondido');
  Musica.efeito('bau-abrir');

  setTimeout(() => {
    icone.className = 'saque-icone aberto';
    icone.textContent = '✨';
    if (s.itens.some((i) => i.raridade === 'lendario' || i.raridade === 'raro')) Musica.efeito('critico');
    if (s.moedas) setTimeout(() => Musica.efeito('moedas'), 250 + s.itens.length * 300);
    const entradas = [
      ...s.itens.map((i) => `<div class="saque-item rar-${esc(i.raridade)}"><span class="rar-${esc(i.raridade)}">${esc(i.icone)} ${esc(i.nome)}</span>
        <small>${esc(estado.config.RARIDADES[i.raridade]?.nome || '')} · ${esc(i.descricao || '')}</small></div>`),
      ...(s.moedas ? [`<div class="saque-item"><span class="moedas">🪙 ${s.moedas} moedas</span></div>`] : []),
    ];
    if (!entradas.length) entradas.push('<div class="saque-item"><span class="rar-narrativo">Nada de valor… só poeira.</span></div>');
    entradas.forEach((html, k) => setTimeout(() => {
      itens.insertAdjacentHTML('beforeend', html);
      if (k < s.itens.length) Musica.efeito('item', 0.6);
    }, 250 + k * 300));
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = souEu ? 'Guardar no inventário' : 'Continuar';
      btn.focus();
    }, 350 + entradas.length * 300);
  }, 950);
}

$('btn-fechar-saque').addEventListener('click', () => {
  $('modal-saque').classList.add('escondido');
  saqueAberto = false;
  mostrarProximoSaque();
});



// ---------------------------------------------------------------------------
// Configurações da mesa (anfitrião) e música de fundo
// ---------------------------------------------------------------------------
const EIXOS_HUMOR = [
  ['humor', 'Sério', 'Bem-humorado'],
  ['benevolencia', 'Implacável', 'Benevolente'],
  ['temperamento', 'Calmo', 'Bravo'],
  ['detalhe', 'Conciso', 'Descritivo'],
];
let configAberta = false;

function aplicarConfigSala(rs) {
  const c = rs.config || {};
  // Ilustração mais recente como fundo da área das narrações/ações.
  const ultimaImagem = (rs.cena && rs.cena.imagem) || [...estado.log].reverse().find((m) => m.tipo === 'imagem')?.imagem;
  const log = $('chat-log');
  const usarFundo = c.imagens !== false && !!ultimaImagem;
  log.classList.toggle('com-fundo', usarFundo);
  if (usarFundo) log.style.setProperty('--fundo-cena', `url("${BASE}${ultimaImagem.replace(/"/g, '')}")`);
  else log.style.removeProperty('--fundo-cena');

  // Trilha da cena (escolhida pelo Mestre).
  Musica.tocar(rs.musica || '');
  const info = (estado.config.MUSICAS || []).find((m) => m.id === rs.musica);
  $('controle-musica').classList.toggle('escondido', !info);
  if (info) $('musica-nome').textContent = `${info.icone} ${info.nome}`;
  $('btn-musica-mudo').textContent = Musica.mudo ? '🔇' : '🔊';
  $('musica-volume').value = Math.round(Musica.volume * 100);
  // Áudio no bate-papo.
  $('btn-gravar-audio').classList.toggle('escondido', c.audioChat === false);
  // Botões de configuração só para o anfitrião.
  const host = souHost();
  $('btn-config').classList.toggle('escondido', !host);
  $('btn-config-lobby').classList.toggle('escondido', !host);
}

// Liga/desliga música e efeitos (checkbox da mesa e botão do topo ficam sincronizados).
function definirSom(ligado) {
  Musica.mudo = !ligado;
  $('btn-musica-mudo').textContent = ligado ? '🔊' : '🔇';
  $('chk-som').checked = ligado;
}
$('btn-musica-mudo').addEventListener('click', () => definirSom(Musica.mudo));
$('chk-som').addEventListener('change', (ev) => definirSom(ev.target.checked));
$('chk-som').checked = !Musica.mudo;
$('musica-volume').addEventListener('input', (ev) => {
  Musica.volume = ev.target.value / 100;
  if (Musica.mudo && Musica.volume > 0) definirSom(true);
});

function rotuloTempo(ms) {
  return ms >= 60000 ? `${ms / 60000} min` : `${ms / 1000} segundos`;
}

function abrirConfig() {
  const rs = estado.roomState;
  if (!rs) return;
  const c = rs.config;
  configAberta = true;
  $('cfg-erro').textContent = '';
  $('cfg-convite-status').textContent = '';
  $('cfg-tempo-turno').innerHTML = estado.config.opcoesTempoTurno.map((ms) => `<option value="${ms}">${rotuloTempo(ms)}</option>`).join('');
  $('cfg-tempo-turno').value = c.tempoTurnoMs;
  $('cfg-tempo-dado').innerHTML = estado.config.opcoesTempoDado.map((ms) => `<option value="${ms}">${rotuloTempo(ms)}</option>`).join('');
  $('cfg-tempo-dado').value = c.tempoDadoMs;
  $('cfg-audio-chat').checked = c.audioChat !== false;
  $('cfg-imagens').checked = c.imagens !== false;

  const travado = rs.humorLiberadoEm;
  $('cfg-humor').innerHTML = EIXOS_HUMOR.map(([eixo, esq, dir]) => `
    <div class="linha-humor">
      <span>${esq}</span>
      <input type="range" min="0" max="100" step="5" data-eixo="${eixo}" value="${c.humor[eixo]}" ${travado ? 'disabled' : ''} aria-label="${esq} a ${dir}" />
      <span>${dir}</span>
    </div>`).join('');
  $('cfg-humor-aviso').textContent = travado
    ? `🔒 O humor mudou há pouco. Liberado de novo na rodada ${travado} (agora: rodada ${rs.rodada}).`
    : rs.status === 'em_jogo'
      ? 'Depois de mudar, só dá para ajustar de novo após 2 rodadas completas (cada jogador joga 2 vezes).'
      : 'Ajuste à vontade antes de começar. Durante a aventura, cada mudança trava os sliders por 2 rodadas.';
  $('cfg-link').value = linkConvite(rs.codigo);
  $('modal-config').classList.remove('escondido');
}

function fecharConfig() {
  configAberta = false;
  $('modal-config').classList.add('escondido');
  const cab = document.querySelector('.jogo-cabecalho');
  if (cab) cab.scrollTo({ left: 0, behavior: 'smooth' });
}

$('btn-config').addEventListener('click', abrirConfig);
$('btn-config-lobby').addEventListener('click', abrirConfig);
$('cfg-fechar').addEventListener('click', fecharConfig);
$('cfg-copiar').addEventListener('click', (ev) => copiar($('cfg-link').value, ev.currentTarget));

$('cfg-salvar').addEventListener('click', async () => {
  const rs = estado.roomState;
  const humor = {};
  document.querySelectorAll('#cfg-humor input[data-eixo]').forEach((r) => (humor[r.dataset.eixo] = Number(r.value)));
  const mudouHumor = EIXOS_HUMOR.some(([e]) => humor[e] !== rs.config.humor[e]);
  try {
    await emitir('configurarSala', {
      ajustes: {
        tempoTurnoMs: Number($('cfg-tempo-turno').value),
        tempoDadoMs: Number($('cfg-tempo-dado').value),
        audioChat: $('cfg-audio-chat').checked,
        imagens: $('cfg-imagens').checked,
        ...(mudouHumor ? { humor } : {}),
      },
    }, 15000);
    configAberta = false;
    $('modal-config').classList.add('escondido');
  } catch (e) {
    $('cfg-erro').textContent = e.message;
  }
});

$('form-convite').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const email = $('cfg-email-convite').value.trim();
  if (!email) return;
  const status = $('cfg-convite-status');
  status.textContent = 'Enviando...';
  try {
    await emitir('convidarPorEmail', { email }, 30000);
    status.textContent = `✅ Convite enviado para ${email}.`;
    $('cfg-email-convite').value = '';
  } catch (e) {
    status.textContent = `❌ ${e.message}`;
  }
});

// ---------------------------------------------------------------------------
// Missão: painel de etapas, comemoração e tela final
// ---------------------------------------------------------------------------
function htmlEtapas(missao) {
  const prox = missao.etapas.findIndex((e) => !e.concluida);
  return missao.etapas
    .map((e, i) => {
      const cls = e.concluida ? 'feita' : i === prox ? 'atual' : 'futura';
      const icone = e.concluida ? '✅' : i === prox ? '➡️' : '⬜';
      return `<li class="etapa-${cls}">${icone} ${esc(e.texto)}</li>`;
    })
    .join('');
}

// Botão "📜 Objetivos" (todos os jogadores) abre a missão com as etapas.
function renderPainelMissao(rs) {
  const btn = $('btn-objetivos');
  if (!rs.missao) return btn.classList.add('escondido');
  btn.classList.remove('escondido');
  const feitas = rs.missao.etapas.filter((e) => e.concluida).length;
  const total = rs.missao.etapas.length;
  btn.textContent = total ? `📜 Objetivos ${feitas}/${total}` : '📜 Objetivos';
  $('obj-objetivo').textContent = `📜 ${rs.missao.objetivo}`;
  $('lista-etapas').innerHTML = htmlEtapas(rs.missao);
  const prox = rs.missao.etapas.find((e) => !e.concluida);
  $('obj-progresso').textContent = total
    ? `${feitas} de ${total} etapas concluídas · rodada ${rs.rodada || 1}${prox ? ` · próximo passo: ${prox.texto}` : ''}`
    : `Rodada ${rs.rodada || 1}`;
  $('btn-concluir-etapa').classList.toggle('escondido', !(souHost() && rs.status === 'em_jogo' && feitas < total));
  $('btn-concluir-etapa').disabled = mestreNarrando;
}

$('btn-novo-personagem').addEventListener('click', () => {
  estado.criandoNovo = true;
  estado.classeEscolhida = null;
  $('ficha-personagem').classList.add('escondido');
  $('personagem-nome').value = '';
  document.querySelectorAll('.cartao-classe').forEach((el) => el.classList.remove('selecionado'));
  renderEstado(estado.roomState);
});

$('btn-objetivos').addEventListener('click', () => $('modal-objetivos').classList.remove('escondido'));
$('btn-fechar-objetivos').addEventListener('click', () => $('modal-objetivos').classList.add('escondido'));

$('btn-concluir-etapa').addEventListener('click', async () => {
  const rs = estado.roomState;
  const prox = rs.missao.etapas.findIndex((e) => !e.concluida);
  if (!confirm(`Marcar como concluída a etapa "${rs.missao.etapas[prox].texto}"? Use só se o Mestre esqueceu de marcar.`)) return;
  emitir('concluirEtapa').catch((e) => alert(e.message));
});

// Avisos flutuantes para toda a mesa (ex.: "Fulano deu Poção para Ciclano").
function mostrarAvisoMesa({ icone, texto }) {
  let pilha = $('pilha-avisos');
  if (!pilha) {
    pilha = document.createElement('div');
    pilha.id = 'pilha-avisos';
    pilha.className = 'pilha-avisos';
    pilha.setAttribute('role', 'status');
    document.body.appendChild(pilha);
  }
  const div = document.createElement('div');
  div.className = 'aviso-mesa';
  div.textContent = `${icone} ${texto}`;
  pilha.appendChild(div);
  setTimeout(() => div.classList.add('saindo'), 4000);
  setTimeout(() => div.remove(), 4700);
}

let timerAvisoEtapa = null;
function avisarEtapa({ numero, total, texto, proxima }) {
  const el = $('aviso-etapa');
  el.innerHTML = `<div class="aviso-etapa-titulo">✅ Etapa ${numero}/${total} concluída! <span>+30 XP</span></div><div>${esc(texto)}</div>${proxima ? `<div class="aviso-etapa-prox">➡️ Próximo: ${esc(proxima)}</div>` : ''}`;
  el.classList.remove('escondido');
  el.classList.remove('animar');
  void el.offsetWidth; // reinicia a animação
  el.classList.add('animar');
  Musica.efeito('etapa');
  clearTimeout(timerAvisoEtapa);
  timerAvisoEtapa = setTimeout(() => el.classList.add('escondido'), 6000);
}

const fimMostrado = new Set();
function talvezMostrarFim(rs) {
  if (rs.status !== 'encerrada' || fimMostrado.has(rs.codigo)) return;
  fimMostrado.add(rs.codigo);
  // Espera o epílogo chegar no log e os outros modais fecharem.
  setTimeout(() => mostrarFim(estado.roomState), 1200);
}

function formatarDuracao(ms) {
  const min = Math.max(1, Math.round(ms / 60000));
  return min >= 60 ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}` : `${min} min`;
}

function mostrarFim(rs) {
  if (!rs || rs.status !== 'encerrada') return;
  const r = rs.resultado || 'interrompida';
  const conf = {
    cumprida: ['🏆', 'Missão cumprida!'],
    falhou: ['💀', 'A missão falhou'],
    interrompida: ['🏁', 'Aventura encerrada'],
  }[r];
  $('icone-fim').textContent = conf[0];
  $('titulo-fim').textContent = conf[1];
  $('modal-fim').querySelector('.modal-fim').className = `cartao-acao modal-fim fim-${r}`;
  $('objetivo-fim').innerHTML = rs.missao ? `📜 ${esc(rs.missao.objetivo)}` : '';
  $('etapas-fim').innerHTML = rs.missao ? htmlEtapas(rs.missao) : '';
  const epilogo = [...estado.log].reverse().find((m) => m.tipo === 'mestre');
  $('epilogo-fim').innerHTML = epilogo ? `<div class="autor">Epílogo do Mestre</div>${formatarTexto(epilogo.texto)}` : '';
  const st = rs.estatisticas || {};
  const itens = [
    ['⏱️', 'Duração', st.inicio ? formatarDuracao((st.fim || Date.now()) - st.inicio) : '—'],
    ['🔄', 'Rodadas', rs.rodada || 1],
    ['🎲', 'Testes', `${st.testes || 0} (${st.sucessos || 0} ✓ · ${st.falhas || 0} ✗)`],
    ['✨', 'Críticos', `${st.criticos || 0} sucessos · ${st.falhasCriticas || 0} falhas`],
    ['🧰', 'Itens achados', st.itens || 0],
    ['🪙', 'Moedas', st.moedas || 0],
  ];
  $('stats-fim').innerHTML = itens.map(([i, n, v]) => `<div class="stat"><span>${i} ${n}</span><strong>${esc(String(v))}</strong></div>`).join('');
  $('xp-fim').innerHTML = rs.personagens
    .filter((p) => p.personagem)
    .map((p) => `<div class="xp-linha">${avatarHtml(p.personagem.avatar, p.personagem.corTema)}<span>${esc(p.personagem.nome)}</span><span>Nv ${p.personagem.nivel} · +${p.personagem.xpTotal || 0} XP</span></div>`)
    .join('');
  $('modal-fim').classList.remove('escondido');
  if (r === 'cumprida') Musica.efeito('vitoria');
  else if (r === 'falhou') Musica.efeito('derrota');
}

$('btn-fechar-fim').addEventListener('click', () => $('modal-fim').classList.add('escondido'));
$('btn-exportar-fim').addEventListener('click', () => $('btn-exportar').click());

// ---------------------------------------------------------------------------
// Log da aventura (incremental: o servidor manda só as entradas novas)
// ---------------------------------------------------------------------------
let logRenderizado = 0;
let pedindoLog = false;

// Efeito sonoro para acontecimentos que chegam pelo log.
const EFEITOS_LOG = [

  [/subiu para o nível/, 'nivel'],
  [/^✨ .* usou /, 'magia'],
  [/usou (Poção|Elixir|Tônico|Pão|Pergaminho|Pedra)/, 'pocao'],
  [/empunhou /, 'empunhar'],
  [/armadilha .*disparou|está MORRENDO/, 'dano'],
  [/^☠️ .* morreu/, 'derrota'],
  [/^🏕️/, 'porta'],
];
function efeitoDoLog(m) {
  if (m.tipo === 'missao') return Musica.efeito('missao');
  if (m.tipo !== 'sistema') return;
  const achado = EFEITOS_LOG.find(([re]) => re.test(m.texto));
  if (achado) Musica.efeito(achado[1]);
}

function receberLog(inicio, msgs, { inicial = false } = {}) {
  if (inicio > estado.log.length) return pedirLogCompleto(); // perdemos um pedaço
  const novas = msgs.slice(estado.log.length - inicio);
  if (!novas.length) return;
  estado.log.push(...novas);
  renderLogNovo({ tocarNarracao: !inicial });
  if (!inicial) novas.forEach(efeitoDoLog);
}

async function pedirLogCompleto() {
  if (pedindoLog || !estado.codigo) return;
  pedindoLog = true;
  try {
    const r = await emitir('pedirLog', {}, 15000);
    const lendo = estado.log.length && !seguidorLog().estaNoFim()
      ? { topo: $('chat-log').scrollTop, antes: estado.log.filter((m) => !m.efemero).length }
      : null;
    estado.log = [];
    logRenderizado = 0;
    $('chat-log').innerHTML = '';
    receberLog(0, r.state.log || [], { inicial: true });
    if (lendo) seguidorLog().manter(lendo.topo, (r.state.log || []).filter((m) => !m.efemero).length - lendo.antes);
  } catch { /* tenta de novo na próxima atualização */ }
  pedindoLog = false;
}

const AVISO_CURTO_MAX = 70; // caracteres
function renderLogNovo({ tocarNarracao }) {
  const container = $('chat-log');
  let ultimaFalaMestre = null;
  let contadas = 0;
  let minha = false;
  const meuNome = meuNomeExibicao();

  for (let i = logRenderizado; i < estado.log.length; i++) {
    const msg = estado.log[i];
    // Aviso passageiro (ex.: "fulano se reconectou"): só aparece se for recente e some em 3s.
    if (msg.efemero && Date.now() - msg.ts > 3000) continue;
    if (!msg.efemero) contadas++;
    if (msg.tipo === 'jogador' && msg.autor === meuNome) minha = true;
    if (msg.tipo === 'imagem') {
      container.appendChild(linhaImagem(msg));
      continue;
    }
    const div = document.createElement('div');
    div.className = `msg ${msg.tipo}`;
    // De quem é a mensagem (cor do personagem): ação do jogador, narração da ação dele, avisos sobre ele.
    const dono = msg.tipo === 'jogador' ? msg.autor : msg.tipo === 'mestre' ? msg.ator : msg.tipo === 'sistema' ? personagemNoTexto(msg.texto) : null;
    if (dono) div.dataset.pers = slugPers(dono);
    const avatarChave = msg.tipo === 'mestre' ? 'mestre' : msg.tipo === 'sistema' || msg.tipo === 'missao' ? 'sistema' : personagemAvatarPorAutor(msg.autor);
    const cor = msg.tipo === 'jogador' ? corPorAutor(msg.autor) : null;
    div.innerHTML = `
      ${avatarHtml(avatarChave, cor)}
      <div class="conteudo">
        <div class="autor">${esc(msg.autor)}</div>
        <div class="texto">${msg.tipo === 'jogador' ? marcarFalas(formatarTexto(msg.texto)) : formatarTexto(msg.texto)}</div>
      </div>`;
    if (msg.tipo === 'mestre') {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-ouvir';
      btn.textContent = '▶ Ouvir';
      const idx = i;
      btn.addEventListener('click', () => falarNarracao(msg.texto, idx, btn));
      div.querySelector('.conteudo').appendChild(btn);
      ultimaFalaMestre = { texto: msg.texto, idx, btn };
    }
    // Avisos curtos do sistema em sequência (XP, itens, dano...) ficam lado a lado
    // numa mesma faixa, quebrando linha só quando não cabem.
    const curta = msg.tipo === 'sistema' && !msg.efemero && String(msg.texto || '').length <= AVISO_CURTO_MAX;
    if (curta) {
      div.classList.add('curta');
      const ultimo = container.lastElementChild;
      if (ultimo && ultimo.classList.contains('grupo-sistema')) {
        ultimo.appendChild(div);
      } else if (ultimo && ultimo.classList.contains('curta')) {
        const grupo = document.createElement('div');
        grupo.className = 'grupo-sistema';
        container.insertBefore(grupo, ultimo);
        grupo.append(ultimo, div);
      } else {
        container.appendChild(div);
      }
    } else {
      container.appendChild(div);
    }
    if (msg.efemero) {
      div.classList.add('efemero');
      setTimeout(() => div.classList.add('evaporando'), Math.max(0, 3000 - (Date.now() - msg.ts)));
      div.addEventListener('transitionend', () => div.remove());
    }
  }
  logRenderizado = estado.log.length;
  seguidorLog().chegaram(contadas, { forcar: !tocarNarracao || minha });

  // Toca só a fala mais recente do Mestre (nunca o histórico ao entrar na sala).
  if (tocarNarracao && ultimaFalaMestre && $('chk-narracao-voz').checked) {
    const f = ultimaFalaMestre;
    tocarOuEnfileirar(() => falarNarracao(f.texto, f.idx, f.btn));
  }
}

// Rolagem estilo app de mensagens: quem está no fim acompanha as novas; quem rolou
// para cima para ler não é puxado. Aparece "⬇ N novas" e o clique leva ao fim.
function seguidorRolagem(lista) {
  const env = document.createElement('div');
  env.className = 'envoltorio-rolagem';
  lista.parentNode.insertBefore(env, lista);
  env.appendChild(lista);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn-novas escondido';
  env.appendChild(btn);
  let novas = 0;
  let noFim = true;
  const zerar = () => {
    novas = 0;
    btn.classList.add('escondido');
  };
  const irAoFim = (suave = false) => {
    noFim = true;
    zerar();
    requestAnimationFrame(() => lista.scrollTo({ top: lista.scrollHeight, behavior: suave ? 'smooth' : 'auto' }));
  };
  lista.addEventListener('scroll', () => {
    if (!lista.clientHeight) return; // aba escondida (celular)
    noFim = lista.scrollHeight - lista.scrollTop - lista.clientHeight < 80;
    if (noFim) zerar();
  }, { passive: true });
  btn.addEventListener('click', () => irAoFim(true));
  const mostrarNovas = (n) => {
    if (n <= 0) return;
    novas += n;
    btn.textContent = `⬇ ${novas} nova${novas > 1 ? 's' : ''}`;
    btn.classList.remove('escondido');
  };
  return {
    irAoFim,
    estaNoFim: () => noFim,
    // A lista foi redesenhada (reconexão): volta para onde a pessoa lia e conta as novas.
    manter(topo, n) {
      noFim = false;
      requestAnimationFrame(() => requestAnimationFrame(() => (lista.scrollTop = topo)));
      mostrarNovas(n);
    },
    // Depois de acrescentar `n` mensagens. `forcar`: carga inicial ou mensagem minha.
    chegaram(n, { forcar = false } = {}) {
      if (forcar || noFim) return irAoFim();
      mostrarNovas(n);
    },
    // A altura mudou (imagem ou áudio carregou): segue no fim só se já estava lá.
    ajustar() {
      if (noFim) irAoFim();
    },
  };
}
let segLog = null;
let segChat = null;
const seguidorLog = () => segLog || (segLog = seguidorRolagem($('chat-log')));
const seguidorChat = () => segChat || (segChat = seguidorRolagem($('chat-lateral-lista')));

// Leva o log até as mensagens mais recentes (ao abrir a mesa ou trocar de aba).
function rolarLogParaFim() {
  seguidorLog().irAoFim();
}

// Ilustração no histórico: linha discreta (a imagem fica no fundo da mesa).
function linhaImagem(msg) {
  const div = document.createElement('button');
  div.type = 'button';
  div.className = 'msg-imagem-linha';
  div.textContent = ehCelular() ? '🖼️ Cena ilustrada (ver)' : `🖼️ O Mestre ilustrou a cena${msg.texto ? `: ${msg.texto}` : ''} (ver)`;
  div.addEventListener('click', () => ampliarImagem(BASE + msg.imagem, msg.texto));
  return div;
}

// (cartão grande antigo — mantido para referência/uso futuro)
function cartaoImagem(msg) {
  const fig = document.createElement('figure');
  fig.className = 'msg-imagem';
  const img = document.createElement('img');
  img.src = BASE + msg.imagem;
  img.alt = msg.texto || 'Ilustração da cena';
  img.loading = 'lazy';
  img.addEventListener('load', () => seguidorLog().ajustar()); // a altura muda quando a imagem carrega
  img.addEventListener('click', () => ampliarImagem(img.src, msg.texto));
  fig.appendChild(img);
  if (msg.texto) {
    const cap = document.createElement('figcaption');
    cap.textContent = `🖼️ ${msg.texto}`;
    fig.appendChild(cap);
  }
  return fig;
}

function ampliarImagem(src, legenda) {
  let caixa = $('caixa-imagem');
  if (!caixa) {
    caixa = document.createElement('div');
    caixa.id = 'caixa-imagem';
    caixa.className = 'sobreposicao caixa-imagem';
    caixa.innerHTML = '<figure><img alt="" /><figcaption></figcaption></figure>';
    caixa.addEventListener('click', () => caixa.classList.add('escondido'));
    document.body.appendChild(caixa);
  }
  caixa.querySelector('img').src = src;
  caixa.querySelector('img').alt = legenda || '';
  caixa.querySelector('figcaption').textContent = legenda || '';
  caixa.classList.remove('escondido');
}

// ---------------------------------------------------------------------------
// Cores dos personagens. Uma folha de estilo gerada a cada atualização liga o
// nome (data-pers) à cor: se alguém troca de cor, até as mensagens antigas mudam.
// ---------------------------------------------------------------------------
const slugPers = (nome) => String(nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
function coresOcupadas(excetoMeu = true) {
  const meuId = estado.meuId;
  return new Set((estado.roomState?.personagens || [])
    .filter((p) => p.personagem && !p.personagem.morto && p.personagem.cor && !(excetoMeu && p.id === meuId))
    .map((p) => p.personagem.cor));
}
function corSugerida() {
  const lista = estado.config?.CORES_PERSONAGEM || [];
  const ocupadas = coresOcupadas();
  const padrao = estado.config?.COR_PADRAO_CLASSE?.[estado.classeEscolhida];
  const inicio = Math.max(0, lista.findIndex((c) => c.id === padrao));
  for (let i = 0; i < lista.length; i++) {
    const c = lista[(inicio + i) % lista.length];
    if (!ocupadas.has(c.hex)) return c.hex;
  }
  return lista[0]?.hex || null;
}
// Bolinhas de cor (ficha e "trocar cor" no cartão). `aoEscolher(hex)`.
function bolinhasCor(container, atual, aoEscolher) {
  const ocupadas = coresOcupadas();
  container.innerHTML = '';
  (estado.config?.CORES_PERSONAGEM || []).forEach((c) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `bolinha-cor${c.hex === atual ? ' marcada' : ''}`;
    b.style.setProperty('--c', c.hex);
    b.title = ocupadas.has(c.hex) ? `${c.nome} (já em uso)` : c.nome;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', c.hex === atual ? 'true' : 'false');
    b.setAttribute('aria-label', b.title);
    b.disabled = ocupadas.has(c.hex);
    b.addEventListener('click', () => aoEscolher(c.hex));
    container.appendChild(b);
  });
}
function renderSeletorCor() {
  const caixa = $('seletor-cor');
  if (!caixa) return;
  if (!estado.corEscolhida || coresOcupadas().has(estado.corEscolhida)) estado.corEscolhida = corSugerida();
  bolinhasCor(caixa, estado.corEscolhida, (hex) => {
    estado.corEscolhida = hex;
    renderSeletorCor();
  });
}
let cssCoresAtual = '';
function atualizarCoresCss(rs) {
  const regras = (rs.personagens || [])
    .filter((p) => p.personagem && p.personagem.cor)
    .map((p) => `[data-pers="${slugPers(p.personagem.nome)}"]{--cor-p:${p.personagem.cor}}`)
    .join('\n');
  if (regras === cssCoresAtual) return;
  cssCoresAtual = regras;
  let el = document.getElementById('cores-personagens');
  if (!el) {
    el = document.createElement('style');
    el.id = 'cores-personagens';
    document.head.appendChild(el);
  }
  el.textContent = regras;
}
// Personagem mencionado numa mensagem do sistema (o nome mais longo primeiro).
function personagemNoTexto(texto) {
  const nomes = (estado.roomState?.personagens || []).filter((p) => p.personagem).map((p) => p.personagem.nome).sort((a, b) => b.length - a.length);
  return nomes.find((n) => String(texto || '').includes(n)) || null;
}

function personagemAvatarPorAutor(nomeAutor) {
  const p = estado.roomState?.personagens.find((x) => x.personagem && x.personagem.nome === nomeAutor);
  return p ? p.personagem.avatar : 'sistema';
}
function corPorAutor(nomeAutor) {
  const p = estado.roomState?.personagens.find((x) => x.personagem && x.personagem.nome === nomeAutor);
  return p ? p.personagem.cor || p.personagem.corTema : null;
}

// ---------------------------------------------------------------------------
// Teste de dado
// ---------------------------------------------------------------------------
function renderAreaTeste(rs) {
  const area = $('area-teste');
  const teste = rs.pendingTest;
  if (!teste || rs.status !== 'em_jogo') {
    area.classList.add('escondido');
    if (!rolando) {
      clearInterval(intervaloDado);
      const el = $('dado-visual');
      el.textContent = '?';
      el.classList.remove('critico-sucesso', 'critico-falha', 'girando');
    }
    return;
  }
  const eu = meuJogador();
  const souEu = eu?.personagem && eu.personagem.nome.toLowerCase() === teste.nomePersonagem.toLowerCase() && !eu.afastado;
  const label = estado.config.ATTRIBUTE_LABELS[teste.atributo] || teste.atributo;
  const dc = { facil: 10, medio: 13, dificil: 16, muito_dificil: 19 }[teste.dificuldade];
  const nomeDif = { facil: 'fácil', medio: 'médio', dificil: 'difícil', muito_dificil: 'muito difícil' }[teste.dificuldade] || teste.dificuldade;
  const bonus = eu?.personagem?.bonusProximoTeste;

  area.classList.remove('escondido');
  $('texto-teste').textContent = ehCelular()
    ? `🎲 ${teste.nomePersonagem} · ${label} · ${nomeDif} (${dc}+)${souEu && bonus ? ` · +${bonus}` : ''}`
    : `Teste: ${teste.nomePersonagem} rola ${label} — dificuldade ${nomeDif} (precisa ${dc}+)` +
      (souEu && bonus ? ` · você tem +${bonus} de bônus` : '');

  const btn = $('btn-rolar-dado');
  btn.textContent = souEu
    ? (teste.jaRolado ? (ehCelular() ? 'Reenviar' : 'Reenviar resultado ao Mestre') : (ehCelular() ? 'Rolar d20' : `Rolar d20 de ${label}`))
    : (ehCelular() ? 'Aguardando…' : `Aguardando ${teste.nomePersonagem} rolar...`);
  btn.disabled = !souEu || mestreNarrando || rolando;
  btn.onclick = souEu ? rolarDado : null;
  // Desistir: só quem vai rolar, e só antes de rolar.
  const desistir = $('btn-desistir-teste');
  desistir.classList.toggle('escondido', !souEu || !!teste.jaRolado);
  desistir.disabled = mestreNarrando || rolando || desistindo;
}

let desistindo = false;
$('btn-desistir-teste').addEventListener('click', async () => {
  if (desistindo || rolando) return;
  if (!confirm('Desistir desta ação?\n\nVocê não rola o dado, perde a vez, e o Mestre pode narrar consequências de recuar.')) return;
  desistindo = true;
  $('btn-desistir-teste').disabled = true;
  $('btn-rolar-dado').disabled = true;
  try {
    await emitir('desistirTeste', {}, 90000);
  } catch (e) {
    alert(e.message);
  } finally {
    desistindo = false;
  }
});

// ---------------------------------------------------------------------------
// Modal do dado: abre no meio da tela, rola até parar, mostra o veredito e só
// então deixa fechar. Enquanto quem rolou não fecha, o tempo da vez fica pausado.
// ---------------------------------------------------------------------------
const modalDado = { aberto: false, souEu: false, rolagem: null, revelado: false, inicio: 0, giro: null, mestre: null, viuPausa: false, fecharAoRevelar: false, dono: '' };
const GIRO_MINIMO_MS = 1600;

function abrirModalDado({ titulo, sub, souEu }) {
  clearTimeout(modalDado.giro);
  Object.assign(modalDado, { aberto: true, souEu, rolagem: null, revelado: false, inicio: Date.now(), mestre: null, viuPausa: false, fecharAoRevelar: false });
  $('modal-dado-titulo').textContent = titulo;
  $('modal-dado-sub').textContent = sub;
  $('modal-dado-veredito').textContent = '';
  $('modal-dado-veredito').className = 'modal-dado-veredito';
  $('modal-dado-conta').textContent = 'Rolando o d20...';
  $('modal-dado-dano').classList.add('escondido');
  $('modal-dado-mestre').classList.add('escondido');
  $('modal-dado-mestre').innerHTML = '';
  $('modal-dado-pausa').classList.add('escondido');
  const btn = $('btn-fechar-dado');
  btn.disabled = true;
  btn.classList.remove('botao-secundario');
  btn.textContent = 'Rolando...';
  $('d20').className = 'd20 rolando';
  $('modal-dado').classList.remove('escondido');
  Musica.efeito('dado-agitar');
  girarNumeros(70);
}

// Troca o número exibido enquanto o dado gira (com o "tic" do dado batendo).
function girarNumeros(intervalo) {
  if (!modalDado.aberto || modalDado.revelado || modalDado.rolagem) return;
  $('d20-numero').textContent = String(1 + Math.floor(Math.random() * 20));
  modalDado.giro = setTimeout(() => girarNumeros(intervalo), intervalo);
}

// Desacelera até parar no resultado real.
function revelarDado(rolagem) {
  if (modalDado.rolagem) return;
  modalDado.rolagem = rolagem;
  clearTimeout(modalDado.giro);
  const espera = Math.max(0, GIRO_MINIMO_MS - (Date.now() - modalDado.inicio));
  const passos = [90, 120, 160, 210, 280, 360];
  let t = espera;
  passos.forEach((ms, i) => {
    t += ms;
    setTimeout(() => {
      if (modalDado.rolagem !== rolagem) return;
      $('d20-numero').textContent = i === passos.length - 1 ? String(rolagem.die) : String(1 + Math.floor(Math.random() * 20));
      if (i === 1) Musica.efeito('dado-lancar');
      if (i === passos.length - 1) mostrarVeredito(rolagem);
    }, t);
  });
  // Mantém o giro rápido até começar a desacelerar.
  const rapido = setInterval(() => {
    if (Date.now() - modalDado.inicio >= GIRO_MINIMO_MS || modalDado.rolagem !== rolagem) return clearInterval(rapido);
    $('d20-numero').textContent = String(1 + Math.floor(Math.random() * 20));
  }, 70);
}

function mostrarVeredito(r) {
  modalDado.revelado = true;
  const d20 = $('d20');
  d20.className = `d20 parou ${r.resultado}`;
  if (r.resultado === 'critico_sucesso') Musica.efeito('critico');
  else if (r.resultado === 'critico_falha') Musica.efeito('derrota');
  if (r.dano) setTimeout(() => Musica.efeito('ataque'), 250);
  const v = $('modal-dado-veredito');
  v.className = `modal-dado-veredito ${r.resultado}`;
  v.textContent =
    r.resultado === 'critico_sucesso' ? '✨ SUCESSO CRÍTICO! ✨' :
    r.resultado === 'critico_falha' ? '💥 FALHA CRÍTICA!' :
    r.sucesso ? 'SUCESSO!' : 'FALHA';
  const sinal = (n) => (n >= 0 ? `+ ${n}` : `− ${Math.abs(n)}`);
  $('modal-dado-conta').textContent =
    `${r.die} ${sinal(r.mod)} (${r.atributo})${r.bonus ? ` + ${r.bonus} (bônus)` : ''} = ${r.total} · precisava ${r.dc}`;
  const danoEl = $('modal-dado-dano');
  danoEl.classList.toggle('escondido', !r.dano);
  if (r.dano) danoEl.innerHTML = `${esc(r.dano.icone)} <strong>${r.dano.total}</strong> de dano com ${esc(r.dano.arma)} <small>(${esc(r.dano.formula)}${r.dano.critico ? ' · crítico!' : ''})</small>`;
  // Mini-dado da área de teste mostra o último resultado.
  const mini = $('dado-visual');
  mini.textContent = r.die;
  mini.classList.toggle('critico-sucesso', r.resultado === 'critico_sucesso');
  mini.classList.toggle('critico-falha', r.resultado === 'critico_falha');

  // O texto do Mestre fica na tela principal (o modal mostra só o resultado).
  const pausa = $('modal-dado-pausa');
  pausa.classList.remove('escondido');
  pausa.textContent = modalDado.souEu
    ? '⏸ O relógio da mesa fica pausado até você clicar em Continuar.'
    : `Fecha sozinho quando ${r.personagem} continuar.`;
  const btn = $('btn-fechar-dado');
  btn.disabled = false;
  btn.textContent = modalDado.souEu ? 'Continuar' : 'Fechar';
  btn.classList.toggle('botao-secundario', !modalDado.souEu); // espectador não precisa clicar
  if (modalDado.souEu) btn.focus();
  // Quem rolou já fechou enquanto o dado ainda girava aqui: fecha logo após mostrar.
  if (!modalDado.souEu && modalDado.fecharAoRevelar) setTimeout(fecharModalDado, 1500);
}

// Quem só assiste à rolagem de outro jogador não precisa clicar: o modal fecha
// quando o dono do dado clica em Continuar (o servidor tira a pausa da mesa).
function sincronizarModalDadoObservador(rs) {
  if (!modalDado.aberto || modalDado.souEu) return;
  if (rs.pausadoPorDado) {
    modalDado.viuPausa = true;
    return;
  }
  if (!modalDado.viuPausa) return; // o estado com a pausa ainda não chegou
  if (modalDado.revelado) fecharModalDado();
  else modalDado.fecharAoRevelar = true;
}

function erroNoModalDado(msg) {
  clearTimeout(modalDado.giro);
  if (!modalDado.revelado) {
    modalDado.revelado = true;
    $('d20').className = 'd20';
    $('d20-numero').textContent = '!';
    $('modal-dado-conta').textContent = '';
  }
  const box = $('modal-dado-mestre');
  box.classList.remove('escondido');
  box.innerHTML = `<div class="autor">Sistema</div>${esc(msg)}`;
  const btn = $('btn-fechar-dado');
  btn.disabled = false;
  btn.textContent = 'Fechar';
}

function fecharModalDado() {
  if (!modalDado.aberto || !modalDado.revelado) return;
  clearTimeout(modalDado.giro);
  modalDado.aberto = false;
  $('modal-dado').classList.add('escondido');
  if (modalDado.souEu && socket) socket.emit('fecharDado', { codigo: estado.codigo }, () => {});
  mostrarProximoSaque(); // baú aberto pelo teste aparece depois do dado
}

$('btn-fechar-dado').addEventListener('click', fecharModalDado);

// Rolagem anunciada pelo servidor (a minha ou a de outro jogador).
function receberRolagem(r) {
  const souEu = r.jogadorId === estado.meuId;
  if (!(modalDado.aberto && modalDado.souEu && souEu && !modalDado.rolagem)) {
    abrirModalDado({ titulo: `Teste de ${r.atributo}`, sub: `${r.personagem} — dificuldade ${r.dificuldade} (precisa ${r.dc}+)`, souEu });
  }
  revelarDado(r);
}

let rolando = false;
async function rolarDado() {
  if (rolando) return;
  const teste = estado.roomState?.pendingTest;
  if (!teste) return;
  rolando = true;
  $('btn-rolar-dado').disabled = true;
  const label = estado.config.ATTRIBUTE_LABELS[teste.atributo] || teste.atributo;
  const dc = { facil: 10, medio: 13, dificil: 16, muito_dificil: 19 }[teste.dificuldade];
  const nomeDif = { facil: 'fácil', medio: 'médio', dificil: 'difícil', muito_dificil: 'muito difícil' }[teste.dificuldade];
  abrirModalDado({ titulo: `Teste de ${label}`, sub: `${teste.nomePersonagem} — dificuldade ${nomeDif} (precisa ${dc}+)`, souEu: true });
  try {
    await emitir('rolarDado'); // responde depois da narração; o resultado chega antes via 'dadoRolado'
  } catch (e) {
    erroNoModalDado(e.message);
  } finally {
    rolando = false;
  }
}

// --- Som do dado (sintetizado via Web Audio API — sem arquivo de áudio externo) ---
let audioCtxDado = null;
function getAudioCtxDado() {
  if (!audioCtxDado) audioCtxDado = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtxDado;
}
function tocarBipe(freq, duracao, tipo, volume) {
  try {
    const ctx = getAudioCtxDado();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = tipo || 'square';
    osc.frequency.value = freq;
    gain.gain.value = volume ?? 0.07;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duracao);
    osc.stop(ctx.currentTime + duracao);
  } catch (e) {
    /* contexto de áudio indisponível/bloqueado — segue sem som */
  }
}
function tocarTicDado() {
  tocarBipe(160 + Math.random() * 140, 0.045, 'square', 0.05);
}
function tocarResultadoDado(resultado) {
  if (resultado === 'critico_sucesso') {
    tocarBipe(660, 0.12, 'triangle', 0.09);
    setTimeout(() => tocarBipe(880, 0.2, 'triangle', 0.09), 100);
  } else if (resultado === 'critico_falha') {
    tocarBipe(180, 0.28, 'sawtooth', 0.08);
  } else {
    tocarBipe(420, 0.12, 'triangle', 0.07);
  }
}

let intervaloDado = null;
function animarDadoGirando() {
  const el = document.getElementById('dado-visual');
  el.classList.remove('critico-sucesso', 'critico-falha');
  el.classList.add('girando');
  clearInterval(intervaloDado);
  intervaloDado = setInterval(() => {
    el.textContent = String(1 + Math.floor(Math.random() * 20));
    tocarTicDado();
  }, 70);
}
function pararAnimacaoDado(rollResult) {
  clearInterval(intervaloDado);
  const el = document.getElementById('dado-visual');
  el.classList.remove('girando');
  if (rollResult) {
    el.textContent = rollResult.die;
    el.classList.toggle('critico-sucesso', rollResult.resultado === 'critico_sucesso');
    el.classList.toggle('critico-falha', rollResult.resultado === 'critico_falha');
    tocarResultadoDado(rollResult.resultado);
  }
}

// ---------------------------------------------------------------------------
// Narração por voz (ElevenLabs no servidor, com a voz do navegador de reserva)
// ---------------------------------------------------------------------------
let vozesPt = [];
function carregarVozesPt() {
  if (!('speechSynthesis' in window)) return;
  vozesPt = speechSynthesis.getVoices().filter((v) => v.lang && v.lang.toLowerCase().startsWith('pt'));
}
if ('speechSynthesis' in window) {
  carregarVozesPt();
  speechSynthesis.onvoiceschanged = carregarVozesPt;
}

// Narração preferencial: voz ElevenLabs gerada no servidor (com cache).
// Se o servidor não tiver TTS configurado ou der erro, cai na voz do navegador.
let audioNarracao = null;
let botaoTocando = null;
function marcarBotao(btn, tocando) {
  if (!btn) return;
  btn.textContent = tocando ? '⏸ Parar' : '▶ Ouvir';
  btn.classList.toggle('tocando', tocando);
}
// Canal único de áudio: narração do Mestre e mensagens de voz nunca tocam juntas.
// O que chega enquanto algo toca entra numa fila e toca em seguida.
let narrando = false;
const filaAudio = [];
function audioChatTocando() {
  return [...document.querySelectorAll('#chat-lateral-lista audio')].find((a) => !a.paused && !a.ended) || null;
}
function audioOcupado() {
  return narrando || !!audioChatTocando();
}
function tocarOuEnfileirar(fn) {
  if (audioOcupado()) filaAudio.push(fn);
  else fn();
}
function proximoDaFila() {
  if (audioOcupado()) return;
  const fn = filaAudio.shift();
  if (fn) fn();
}
function pausarAudiosChat(exceto) {
  document.querySelectorAll('#chat-lateral-lista audio').forEach((a) => a !== exceto && !a.paused && a.pause());
}

function pararNarracao() {
  if (audioNarracao) { audioNarracao.pause(); audioNarracao = null; }
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  marcarBotao(botaoTocando, false);
  botaoTocando = null;
  narrando = false;
}
// Narração terminou sozinha: libera o canal para o próximo da fila.
function fimNarracao() {
  pararNarracao();
  proximoDaFila();
}
function falarNarracao(texto, idxLog, btn) {
  if (btn && btn === botaoTocando) { fimNarracao(); return; } // clique de novo = parar
  pararNarracao();
  pausarAudiosChat();
  narrando = true;
  botaoTocando = btn || null;
  marcarBotao(botaoTocando, true);

  if (estado.config?.ttsDisponivel && Number.isInteger(idxLog)) {
    const audio = new Audio(`${BASE}api/tts?codigo=${encodeURIComponent(estado.codigo)}&idx=${idxLog}`);
    audioNarracao = audio;
    audio.onended = () => { if (audioNarracao === audio) fimNarracao(); };
    audio.onerror = () => { if (audioNarracao === audio) falarNarracaoNavegador(texto); };
    audio.play().catch(() => { if (audioNarracao === audio) falarNarracaoNavegador(texto); });
    return;
  }
  falarNarracaoNavegador(texto);
}
function falarNarracaoNavegador(texto) {
  audioNarracao = null;
  if (!('speechSynthesis' in window)) { fimNarracao(); return; }
  speechSynthesis.cancel(); // evita sobrepor falas anteriores
  const utter = new SpeechSynthesisUtterance(texto.replace(/[*`_#]/g, ''));
  utter.onend = () => fimNarracao();
  const vozBr = vozesPt.find((v) => v.lang.toLowerCase() === 'pt-br') || vozesPt[0];
  if (vozBr) utter.voice = vozBr;
  utter.lang = vozBr ? vozBr.lang : 'pt-BR';
  utter.rate = 1;
  speechSynthesis.speak(utter);
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

// Markdown mínimo e seguro: escapa tudo primeiro, só depois converte **negrito**,
// *itálico* e `código` em tags — nunca interpreta HTML vindo do texto original.
// Falas entre aspas ("...", “...”, «...») nas ações dos jogadores viram destaque
// na cor do personagem (as aspas curvas vêm do CSS). Recebe HTML já escapado.
function marcarFalas(html) {
  return html.replace(/(["“«])([^"“”«»\n<>]{1,300}?)(["”»])/g, (_m, _a, fala) => `<span class="fala">${fala}</span>`);
}

function formatarTexto(s) {
  let seguro = escapeHtml(s || '');
  seguro = seguro
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
  return seguro;
}

// ---------------------------------------------------------------------------
// Bate-papo lateral (texto e áudio, fora da IA)
// ---------------------------------------------------------------------------
function outrosJogadoresConectados() {
  if (!estado.roomState) return [];
  const meuNome = meuNomeExibicao();
  return estado.roomState.personagens
    .filter((p) => p.conectado)
    .map((p) => (p.personagem ? p.personagem.nome : p.nome))
    .filter((nome) => nome !== meuNome);
}

function atualizarSeletoresDestino() {
  const select = $('chat-destino');
  const atual = select.value;
  const bots = new Set((estado.roomState?.personagens || []).filter((p) => p.bot && p.personagem).map((p) => p.personagem.nome));
  const nomes = outrosJogadoresConectados().filter((n) => !bots.has(n)); // bots não leem o bate-papo
  select.innerHTML = `<option value="">Geral</option>${nomes.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join('')}`;
  if (nomes.includes(atual)) select.value = atual;
}

let chatRenderadas = 0;
let chatPrimeiraCarga = true; // o histórico ao entrar na sala não acende o aviso da aba Chat
function renderChatLateral() {
  const container = $('chat-lateral-lista');
  const meuNome = meuNomeExibicao();
  const autoplayAtivo = $('chk-autoplay-voz').checked;

  for (let i = chatRenderadas; i < estado.chatMensagens.length; i++) {
    const m = estado.chatMensagens[i];
    const privado = m.escopo === 'privado';
    const direcao = privado && m.autor === meuNome ? ` → ${m.para}` : '';
    const div = document.createElement('div');
    div.className = `msg-chat ${privado ? 'privado' : ''}`;
    div.innerHTML = `<div class="autor-chat" data-pers="${slugPers(m.autor)}">${m.bot ? '🤖 ' : ''}${esc(m.autor + direcao)} ${privado ? '<span class="tag-privado">(privado)</span>' : ''}</div>`;

    if (m.tipo === 'audio') {
      const linha = document.createElement('div');
      linha.className = 'linha-audio';
      const bytes = m.dados instanceof ArrayBuffer ? m.dados : new Uint8Array(m.dados).buffer;
      const audioEl = document.createElement('audio');
      audioEl.controls = true;
      audioEl.src = URL.createObjectURL(new Blob([bytes], { type: m.mime || 'audio/webm' }));
      audioEl.className = 'player-audio';
      audioEl.addEventListener('loadedmetadata', () => seguidorChat().ajustar()); // o player muda a altura ao carregar
      // Play manual: para o que estiver tocando (outro áudio ou a narração).
      audioEl.addEventListener('play', () => {
        pausarAudiosChat(audioEl);
        if (narrando) pararNarracao();
      });
      audioEl.addEventListener('ended', proximoDaFila);
      linha.append('🎙️ ', audioEl);
      div.appendChild(linha);
      if (m.legenda) {
        const leg = document.createElement('div');
        leg.className = 'legenda-audio';
        leg.textContent = m.legenda; // transcrição (recados dos bots)
        div.appendChild(leg);
      }
      if (autoplayAtivo && m.autor !== meuNome) tocarOuEnfileirar(() => audioEl.play().catch(proximoDaFila));
    } else {
      const texto = document.createElement('div');
      texto.innerHTML = formatarTexto(m.texto);
      div.appendChild(texto);
    }
    container.appendChild(div);
  }
  const novasDeOutros = estado.chatMensagens.slice(chatRenderadas).some((m) => m.autor !== meuNome);
  if (novasDeOutros && !chatPrimeiraCarga && abaMesa !== 'chat') $('aba-chat-novas').classList.remove('escondido');
  const recemChegadas = estado.chatMensagens.slice(chatRenderadas);
  seguidorChat().chegaram(recemChegadas.length, { forcar: chatPrimeiraCarga || recemChegadas.some((m) => m.autor === meuNome) });
  chatPrimeiraCarga = false;
  chatRenderadas = estado.chatMensagens.length;
}

function rolarChatParaFim() {
  seguidorChat().irAoFim();
}

$('form-chat-lateral').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const input = $('chat-lateral-texto');
  const texto = input.value.trim();
  if (!texto) return;
  input.value = '';
  emitir('chatTexto', { destino: $('chat-destino').value || null, texto }, 15000).catch((e) => alert(e.message));
});

let gravador = null;
let pedacosGravacao = [];
let inicioGravacao = 0;

async function iniciarGravacao() {
  if (gravador && gravador.state !== 'inactive') return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    pedacosGravacao = [];
    inicioGravacao = Date.now();
    gravador = new MediaRecorder(stream);
    gravador.ondataavailable = (ev) => {
      if (ev.data.size > 0) pedacosGravacao.push(ev.data);
    };
    gravador.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      enviarGravacao();
    };
    gravador.start();
    btnGravarAudio.classList.add('gravando');
    btnGravarAudio.title = 'Gravando… clique para parar e enviar';
    const atualizar = () => {
      const s = Math.round((Date.now() - inicioGravacao) / 1000);
      btnGravarAudio.textContent = `⏹ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      if (s >= MAX_GRAVACAO_S) pararGravacao();
    };
    atualizar();
    relogioGravacao = setInterval(atualizar, 500);
  } catch (e) {
    alert('Não foi possível acessar o microfone: ' + e.message);
  }
}

function pararGravacao() {
  if (gravador && gravador.state !== 'inactive') gravador.stop();
  clearInterval(relogioGravacao);
  btnGravarAudio.classList.remove('gravando');
  btnGravarAudio.textContent = '🎤';
  btnGravarAudio.title = 'Clique para gravar um áudio';
}

async function enviarGravacao() {
  if (pedacosGravacao.length === 0) return;
  const duracao = Math.round((Date.now() - inicioGravacao) / 1000);
  if (duracao < 1) return; // ignora cliques acidentais curtos demais
  const blob = new Blob(pedacosGravacao, { type: gravador.mimeType || 'audio/webm' });
  const dados = await blob.arrayBuffer();
  const destino = document.getElementById('chat-destino').value || null;
  socket.emit('chatAudio', { codigo: estado.codigo, destino, dados, mime: blob.type, duracao }, (resp) => {
    if (resp && !resp.ok) alert(resp.erro);
  });
}

// Clique para começar a gravar; clique de novo para parar e enviar (máx. 60s).
const btnGravarAudio = document.getElementById('btn-gravar-audio');
const MAX_GRAVACAO_S = 60;
let relogioGravacao = null;
btnGravarAudio.addEventListener('click', () => {
  if (gravador && gravador.state === 'recording') pararGravacao();
  else iniciarGravacao();
});

// ---------------------------------------------------------------------------
// Início
// ---------------------------------------------------------------------------
(async function iniciar() {
  // Convites antigos no formato ?sala=CODIGO viram a rota #/sala/CODIGO.
  const salaQuery = new URLSearchParams(location.search).get('sala');
  if (salaQuery) history.replaceState(null, '', `${location.pathname}#/sala/${salaQuery.toUpperCase()}`);

  await carregarConfig();
  estado.sessao = lerSessao();
  atualizarTopo();
  if (estado.sessao) {
    conectarSocket();
    // Confere se a sessão ainda vale e atualiza o nome (pode ter mudado em outro aparelho).
    api('api/eu').then((r) => {
      gravarSessao({ ...estado.sessao, usuario: r.usuario });
      atualizarTopo();
    }).catch(() => {});
  }
  aplicarRota();
})();
