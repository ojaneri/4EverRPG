'use strict';

// Caminho base relativo: o jogo funciona tanto na raiz (localhost:3000/) quanto
// atrás de um proxy num subcaminho (ex: janeri.com.br/4everrpg/).
const BASE = location.pathname.replace(/[^/]*$/, '');
const socket = io({ path: BASE + 'socket.io' });

const estado = {
  config: null,
  codigo: null,
  nomeJogador: null,
  souHost: false,
  classeEscolhida: null,
  atributos: null,
  roomState: null,
  chatMensagens: [],
  chatCarregado: false,
  aventuraId: null,
};

function meuNomeExibicao() {
  const eu = estado.roomState?.personagens.find((p) => p.nome === estado.nomeJogador);
  if (eu && eu.personagem) return eu.personagem.nome;
  return estado.meuPersonagemNome || estado.nomeJogador;
}

let mestreNarrando = false;
function atualizarControleTurno() {
  const rs = estado.roomState;
  if (!rs || rs.status !== 'em_jogo') return;
  const input = document.getElementById('input-acao');
  const botao = document.querySelector('#form-acao button');
  const aviso = document.getElementById('aviso-turno');
  const meuNome = meuNomeExibicao();

  let bloqueio = null;
  if (mestreNarrando) bloqueio = 'O Mestre está narrando — aguarde...';
  else if (rs.pendingTest) {
    bloqueio = rs.pendingTest.nomePersonagem.toLowerCase() === meuNome.toLowerCase()
      ? 'Role o dado acima para continuar.'
      : `Teste de ${rs.pendingTest.nomePersonagem} — Aguardando`;
  } else if (rs.turnoAtual && rs.turnoAtual !== meuNome) bloqueio = `Turno de ${rs.turnoAtual} — Aguardando`;

  input.disabled = !!bloqueio;
  botao.disabled = !!bloqueio;
  input.placeholder = bloqueio || 'Sua vez! O que você faz?';
  aviso.classList.toggle('escondido', !bloqueio);
  aviso.textContent = bloqueio || '';
}

function outrosJogadoresConectados() {
  if (!estado.roomState) return [];
  const meuNome = meuNomeExibicao();
  return estado.roomState.personagens
    .filter((p) => p.conectado)
    .map((p) => (p.personagem ? p.personagem.nome : p.nome))
    .filter((nome) => nome !== meuNome);
}

// ---------------------------------------------------------------------------
// Avatares (ícones vetoriais próprios — ver public/assets/README.md para
// trocar por sprites reais no futuro).
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
// Navegação entre telas
// ---------------------------------------------------------------------------
function mostrarTela(id) {
  document.querySelectorAll('.tela').forEach((t) => t.classList.remove('tela-ativa'));
  document.getElementById(id).classList.add('tela-ativa');
}

// ---------------------------------------------------------------------------
// Carrega configuração do servidor (classes, atributos, regras de pontos)
// ---------------------------------------------------------------------------
async function carregarConfig() {
  const res = await fetch(BASE + 'api/config');
  estado.config = await res.json();
  renderGradeClasses();
  renderGradeAventuras();
}

function renderGradeAventuras() {
  const grade = document.getElementById('grade-aventuras');
  grade.innerHTML = '';
  const opcoes = [
    ...estado.config.ADVENTURES,
    { id: 'personalizada', titulo: 'Personalizada', icone: '✍️', resumoCurto: 'Escreva você mesmo o tema da aventura.' },
  ];
  opcoes.forEach((a) => {
    const div = document.createElement('div');
    div.className = 'cartao-aventura';
    div.dataset.aventuraId = a.id;
    div.innerHTML = `
      <div class="aventura-icone">${a.icone}</div>
      <h3>${a.titulo}</h3>
      <p>${a.resumoCurto}</p>
    `;
    div.addEventListener('click', () => selecionarAventura(a.id));
    grade.appendChild(div);
  });
  if (opcoes.length) selecionarAventura(opcoes[0].id);
}

function selecionarAventura(id) {
  estado.aventuraId = id;
  document.querySelectorAll('.cartao-aventura').forEach((el) => {
    el.classList.toggle('selecionado', el.dataset.aventuraId === id);
  });
  document.getElementById('rotulo-tema-personalizado').classList.toggle('escondido', id !== 'personalizada');
}

function renderGradeClasses() {
  const grade = document.getElementById('grade-classes');
  grade.innerHTML = '';
  Object.values(estado.config.CLASSES).forEach((classe) => {
    const div = document.createElement('div');
    div.className = 'cartao-classe';
    div.style.setProperty('--cor-classe', classe.corTema);
    div.dataset.classeId = classe.id;
    div.innerHTML = `
      ${avatarHtml(classe.avatar, classe.corTema)}
      <h3>${classe.nome}</h3>
      <p>${classe.descricao}</p>
      <div class="detalhe">PV base: ${classe.hpBase} · ${classe.recurso.nome}: ${classe.recurso.base}</div>
    `;
    div.addEventListener('click', () => selecionarClasse(classe.id));
    grade.appendChild(div);
  });
}

function selecionarClasse(classeId) {
  estado.classeEscolhida = classeId;
  document.querySelectorAll('.cartao-classe').forEach((el) => {
    el.classList.toggle('selecionado', el.dataset.classeId === classeId);
  });

  estado.atributos = {};
  estado.config.ATTRIBUTES.forEach((a) => (estado.atributos[a] = estado.config.POINT_BUY.base));

  renderAtributosEditor();
  document.getElementById('ficha-personagem').classList.remove('escondido');
}

function renderAtributosEditor() {
  const container = document.getElementById('atributos-editor');
  container.innerHTML = '';
  estado.config.ATTRIBUTES.forEach((attr) => {
    const label = estado.config.ATTRIBUTE_LABELS[attr];
    const div = document.createElement('div');
    div.className = 'atributo-item';
    div.innerHTML = `
      <div>${label}</div>
      <div class="linha-botoes">
        <button type="button" data-attr="${attr}" data-delta="-1">−</button>
        <span class="valor" data-valor="${attr}">${estado.atributos[attr]}</span>
        <button type="button" data-attr="${attr}" data-delta="1">+</button>
      </div>
      <div class="mod" data-mod="${attr}"></div>
    `;
    container.appendChild(div);
  });

  container.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const attr = btn.dataset.attr;
      const delta = parseInt(btn.dataset.delta, 10);
      ajustarAtributo(attr, delta);
    });
  });

  atualizarAtributosUI();
}

function pontosGastos() {
  const base = estado.config.POINT_BUY.base;
  return estado.config.ATTRIBUTES.reduce((soma, a) => soma + (estado.atributos[a] - base), 0);
}

function ajustarAtributo(attr, delta) {
  const { min, max, extraPoints, base } = estado.config.POINT_BUY;
  const novo = estado.atributos[attr] + delta;
  if (novo < min || novo > max) return;
  if (delta > 0 && pontosGastos() >= extraPoints) return;
  estado.atributos[attr] = novo;
  atualizarAtributosUI();
}

function modificador(score) {
  return Math.floor((score - 10) / 2);
}

function atualizarAtributosUI() {
  estado.config.ATTRIBUTES.forEach((attr) => {
    const valor = estado.atributos[attr];
    document.querySelector(`[data-valor="${attr}"]`).textContent = valor;
    const mod = modificador(valor);
    document.querySelector(`[data-mod="${attr}"]`).textContent = `mod ${mod >= 0 ? '+' : ''}${mod}`;
  });
  const restantes = estado.config.POINT_BUY.extraPoints - pontosGastos();
  document.getElementById('pontos-restantes').textContent = restantes;
}

// ---------------------------------------------------------------------------
// Formulários da tela inicial
// ---------------------------------------------------------------------------
document.getElementById('form-criar').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const nome = document.getElementById('criar-nome').value.trim();
  const tema = document.getElementById('criar-tema').value.trim();
  if (!nome) return;

  const personalizada = estado.aventuraId === 'personalizada';
  socket.emit('criarJogo', { nome, aventuraId: personalizada ? null : estado.aventuraId, tema: personalizada ? tema : '' }, (resp) => {
    if (!resp.ok) {
      document.getElementById('erro-inicio').textContent = resp.erro;
      return;
    }
    estado.codigo = resp.state.codigo;
    estado.nomeJogador = nome;
    estado.souHost = true;
    entrarNaTelaPersonagem(resp.state);
  });
});

document.getElementById('form-entrar').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const codigo = document.getElementById('entrar-codigo').value.trim().toUpperCase();
  const nome = document.getElementById('entrar-nome').value.trim();
  if (!codigo || !nome) return;

  socket.emit('entrarJogo', { codigo, nome }, (resp) => {
    if (!resp.ok) {
      document.getElementById('erro-inicio').textContent = resp.erro;
      return;
    }
    estado.codigo = resp.state.codigo;
    estado.nomeJogador = nome;
    estado.souHost = false;
    entrarNaTelaPersonagem(resp.state);
  });
});

function entrarNaTelaPersonagem(roomState) {
  document.getElementById('codigo-exibido').textContent = roomState.codigo;
  renderEstado(roomState);
  mostrarTela('tela-personagem');
}

document.getElementById('btn-copiar-codigo').addEventListener('click', () => {
  navigator.clipboard?.writeText(estado.codigo || '');
  const btn = document.getElementById('btn-copiar-codigo');
  const original = btn.textContent;
  btn.textContent = 'Copiado!';
  setTimeout(() => (btn.textContent = original), 1500);
});

// ---------------------------------------------------------------------------
// Confirmar personagem
// ---------------------------------------------------------------------------
document.getElementById('btn-confirmar-personagem').addEventListener('click', () => {
  const nome = document.getElementById('personagem-nome').value.trim() || 'Aventureiro';
  const historia = document.getElementById('personagem-historia').value.trim();

  if (!estado.classeEscolhida) return;

  socket.emit(
    'escolherPersonagem',
    {
      codigo: estado.codigo,
      personagem: {
        nome,
        classeId: estado.classeEscolhida,
        atributos: estado.atributos,
        historia,
        avatarVariant: 1,
      },
    },
    (resp) => {
      if (!resp.ok) {
        document.getElementById('erro-personagem').textContent = resp.erro;
        return;
      }
      estado.meuPersonagemNome = nome;
      document.getElementById('ficha-personagem').classList.add('escondido');
      document.getElementById('erro-personagem').textContent = '';
      renderEstado(resp.state);
    }
  );
});

document.getElementById('btn-iniciar-aventura').addEventListener('click', () => {
  socket.emit('iniciarAventura', { codigo: estado.codigo }, (resp) => {
    if (!resp.ok) {
      document.getElementById('erro-personagem').textContent = resp.erro;
    }
  });
});

// ---------------------------------------------------------------------------
// Estado da sala (sincronizado pelo servidor)
// ---------------------------------------------------------------------------
socket.on('estadoAtualizado', (roomState) => {
  renderEstado(roomState);
});

socket.on('mestreDigitando', (ligado) => {
  mestreNarrando = ligado;
  document.getElementById('mestre-digitando').classList.toggle('escondido', !ligado);
  atualizarControleTurno();
});

function renderEstado(roomState) {
  estado.roomState = roomState;

  if (roomState.status === 'lobby') {
    renderSalaEspera(roomState);
  } else {
    if (!document.getElementById('tela-jogo').classList.contains('tela-ativa')) {
      mostrarTela('tela-jogo');
      document.getElementById('codigo-jogo-ativo').textContent = roomState.codigo;
    }
    renderPainelGrupo(roomState);
    renderPainelCena(roomState);
    renderChatLog(roomState.log);
    renderAreaTeste(roomState);
    atualizarSeletoresDestino();
    atualizarControleTurno();

    if (!estado.chatCarregado && roomState.chatGeral && roomState.chatGeral.length) {
      estado.chatMensagens = roomState.chatGeral.map((m) => ({ ...m, escopo: 'geral', tipo: 'texto' }));
      estado.chatCarregado = true;
      renderChatLateral();
    }
  }
}

function renderPainelCena(roomState) {
  const painel = document.getElementById('painel-cena');
  if (!roomState.cena) {
    painel.classList.add('escondido');
    return;
  }
  painel.classList.remove('escondido');
  const icones = { dia: '☀️', noite: '🌙', chuva: '🌧️', perigo: '⚠️', calmo: '🍃', tensao: '⚡' };
  document.getElementById('cena-icone').textContent = icones[roomState.cena.clima] || '🌄';
  document.getElementById('cena-local').textContent = roomState.cena.local;
  document.getElementById('cena-descricao').textContent = roomState.cena.descricao;

  const fichas = document.getElementById('cena-fichas');
  fichas.innerHTML = roomState.personagens
    .filter((p) => p.personagem && p.conectado)
    .map(
      (p) =>
        `<div class="ficha-token">${avatarHtml(p.personagem.avatar, p.personagem.corTema)}<span>${p.personagem.nome}</span></div>`
    )
    .join('');
}

function atualizarSeletoresDestino() {
  const destinoSelect = document.getElementById('chat-destino');
  const escopoSelect = document.getElementById('voz-escopo');
  const valorAtualChat = destinoSelect.value;
  const valorAtualVoz = escopoSelect.value;

  const nomes = outrosJogadoresConectados();
  const opcoes = nomes.map((n) => `<option value="${n}">${n}</option>`).join('');

  destinoSelect.innerHTML = `<option value="">Geral</option>${opcoes}`;
  escopoSelect.innerHTML = `<option value="">Geral (todos)</option>${opcoes}`;

  if (nomes.includes(valorAtualChat)) destinoSelect.value = valorAtualChat;
  if (nomes.includes(valorAtualVoz)) escopoSelect.value = valorAtualVoz;
}

// Renderização incremental (só acrescenta mensagens novas) — necessário para os
// áudios: recriar o DOM inteiro a cada mensagem reiniciaria/repetiria os players.
let chatRenderadas = 0;
function renderChatLateral() {
  const container = document.getElementById('chat-lateral-lista');
  const meuNome = meuNomeExibicao();
  const autoplayAtivo = document.getElementById('chk-autoplay-voz').checked;

  for (let i = chatRenderadas; i < estado.chatMensagens.length; i++) {
    const m = estado.chatMensagens[i];
    const privado = m.escopo === 'privado';
    const direcao = privado && m.autor === meuNome ? ` → ${m.para}` : '';

    const div = document.createElement('div');
    div.className = `msg-chat ${privado ? 'privado' : ''}`;
    div.innerHTML = `<div class="autor-chat">${m.autor}${direcao} ${privado ? '<span class="tag-privado">(privado)</span>' : ''}</div>`;

    if (m.tipo === 'audio') {
      const linha = document.createElement('div');
      linha.className = 'linha-audio';
      const bytes = m.dados instanceof ArrayBuffer ? m.dados : new Uint8Array(m.dados).buffer;
      const blob = new Blob([bytes], { type: m.mime || 'audio/webm' });
      const url = URL.createObjectURL(blob);
      const audioEl = document.createElement('audio');
      audioEl.controls = true;
      audioEl.src = url;
      audioEl.className = 'player-audio';
      linha.append('🎙️ ', audioEl);
      div.appendChild(linha);
      if (autoplayAtivo && m.autor !== meuNome) {
        audioEl.play().catch(() => {});
      }
    } else {
      const texto = document.createElement('div');
      texto.innerHTML = formatarTexto(m.texto);
      div.appendChild(texto);
    }

    container.appendChild(div);
  }
  chatRenderadas = estado.chatMensagens.length;
  container.scrollTop = container.scrollHeight;
}

socket.on('chatMensagem', (msg) => {
  estado.chatMensagens.push(msg);
  renderChatLateral();
});

document.getElementById('form-chat-lateral').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const input = document.getElementById('chat-lateral-texto');
  const texto = input.value.trim();
  if (!texto) return;
  const destino = document.getElementById('chat-destino').value || null;
  input.value = '';
  socket.emit('chatTexto', { codigo: estado.codigo, destino, texto }, (resp) => {
    if (resp && !resp.ok) alert(resp.erro);
  });
});

function renderSalaEspera(roomState) {
  const lista = document.getElementById('lista-grupo');
  lista.innerHTML = '';
  roomState.personagens.forEach((p) => {
    const div = document.createElement('div');
    div.className = 'item-grupo';
    let status;
    if (!p.conectado) status = '<span class="status-offline">desconectado</span>';
    else if (p.personagem) status = '<span class="status-ok">pronto ✓</span>';
    else status = '<span class="status-pendente">escolhendo...</span>';
    div.innerHTML = `<strong>${p.nome}</strong><br>${p.personagem ? p.personagem.nome + ' — ' + p.personagem.classeNome : ''}<br>${status}`;
    lista.appendChild(div);
  });

  const todosProntos = roomState.personagens.length > 0 && roomState.personagens.every((p) => p.personagem);
  const btn = document.getElementById('btn-iniciar-aventura');
  const msg = document.getElementById('msg-espera');

  if (estado.souHost) {
    btn.classList.remove('escondido');
    btn.disabled = !todosProntos;
    msg.textContent = todosProntos ? '' : 'Aguardando todos escolherem personagem...';
  } else {
    btn.classList.add('escondido');
    msg.textContent = todosProntos ? 'Aguardando o anfitrião iniciar a aventura...' : 'Aguardando todos escolherem personagem...';
  }
}

function renderPainelGrupo(roomState) {
  const painel = document.getElementById('painel-grupo');
  painel.innerHTML = '';
  roomState.personagens.forEach((p) => {
    const c = p.personagem;
    if (!c) return;
    const hpPct = Math.max(0, Math.round((c.hp.atual / c.hp.max) * 100));
    const recPct = Math.max(0, Math.round((c.recurso.atual / c.recurso.max) * 100));
    const div = document.createElement('div');
    div.className = 'cartao-personagem-mini';
    div.style.setProperty('--cor-classe', c.corTema);
    div.innerHTML = `
      <div class="topo">
        ${avatarHtml(c.avatar, c.corTema)}
        <div>
          <div class="nome">${c.nome}${p.conectado ? '' : ' (offline)'}</div>
          <div class="classe">${c.classeNome} · Nv ${c.nivel}</div>
        </div>
      </div>
      <div class="barra hp"><div style="width:${hpPct}%"></div></div>
      <div>PV ${c.hp.atual}/${c.hp.max}</div>
      <div class="barra recurso"><div style="width:${recPct}%"></div></div>
      <div>${c.recurso.nome} ${c.recurso.atual}/${c.recurso.max}</div>
    `;
    painel.appendChild(div);
  });
}

let ultimoLogRenderizado = 0;
function renderChatLog(log) {
  const container = document.getElementById('chat-log');
  if (log.length === ultimoLogRenderizado) return;
  const novasMensagens = log.slice(ultimoLogRenderizado);

  container.innerHTML = '';
  log.forEach((msg, idxMsg) => {
    const div = document.createElement('div');
    div.className = `msg ${msg.tipo}`;
    const avatarChave = msg.tipo === 'mestre' ? 'mestre' : msg.tipo === 'sistema' ? 'sistema' : personagemAvatarPorAutor(msg.autor);
    const cor = msg.tipo === 'jogador' ? corPorAutor(msg.autor) : null;
    div.innerHTML = `
      ${avatarHtml(avatarChave, cor)}
      <div class="conteudo">
        <div class="autor">${msg.autor}</div>
        <div class="texto">${formatarTexto(msg.texto)}</div>
      </div>
    `;
    if (msg.tipo === 'mestre') {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-ouvir';
      btn.textContent = '▶ Ouvir';
      btn.addEventListener('click', () => falarNarracao(msg.texto, idxMsg, btn));
      div.querySelector('.conteudo').appendChild(btn);
    }
    container.appendChild(div);
  });
  container.scrollTop = container.scrollHeight;
  ultimoLogRenderizado = log.length;

  if (document.getElementById('chk-narracao-voz').checked) {
    const inicio = log.length - novasMensagens.length;
    // Toca só a fala mais recente do Mestre (evita enfileirar o histórico ao entrar na sala).
    for (let i = novasMensagens.length - 1; i >= 0; i--) {
      if (novasMensagens[i].tipo === 'mestre') {
        const botoes = container.querySelectorAll('.msg')[inicio + i]?.querySelector('.btn-ouvir');
        falarNarracao(novasMensagens[i].texto, inicio + i, botoes);
        break;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Narração por voz (Web Speech API do navegador — sem custo, sem API externa)
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
function pararNarracao() {
  if (audioNarracao) { audioNarracao.pause(); audioNarracao = null; }
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  marcarBotao(botaoTocando, false);
  botaoTocando = null;
}
function falarNarracao(texto, idxLog, btn) {
  if (btn && btn === botaoTocando) { pararNarracao(); return; } // clique de novo = parar
  pararNarracao();
  botaoTocando = btn || null;
  marcarBotao(botaoTocando, true);

  if (estado.config?.ttsDisponivel && Number.isInteger(idxLog)) {
    const audio = new Audio(`${BASE}api/tts?codigo=${encodeURIComponent(estado.codigo)}&idx=${idxLog}`);
    audioNarracao = audio;
    audio.onended = () => { if (audioNarracao === audio) pararNarracao(); };
    audio.onerror = () => { if (audioNarracao === audio) falarNarracaoNavegador(texto); };
    audio.play().catch(() => { if (audioNarracao === audio) falarNarracaoNavegador(texto); });
    return;
  }
  falarNarracaoNavegador(texto);
}

function falarNarracaoNavegador(texto) {
  audioNarracao = null;
  if (!('speechSynthesis' in window)) { pararNarracao(); return; }
  speechSynthesis.cancel(); // evita sobrepor falas anteriores
  const utter = new SpeechSynthesisUtterance(texto.replace(/[*`_#]/g, ''));
  utter.onend = () => pararNarracao();
  const vozBr = vozesPt.find((v) => v.lang.toLowerCase() === 'pt-br') || vozesPt[0];
  if (vozBr) utter.voice = vozBr;
  utter.lang = vozBr ? vozBr.lang : 'pt-BR';
  utter.rate = 1;
  speechSynthesis.speak(utter);
}

function personagemAvatarPorAutor(nomeAutor) {
  const p = estado.roomState?.personagens.find((p) => p.personagem && p.personagem.nome === nomeAutor);
  return p ? p.personagem.avatar : 'sistema';
}
function corPorAutor(nomeAutor) {
  const p = estado.roomState?.personagens.find((p) => p.personagem && p.personagem.nome === nomeAutor);
  return p ? p.personagem.corTema : null;
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

// Markdown mínimo e seguro: escapa tudo primeiro, só depois converte **negrito**,
// *itálico* e `código` em tags — nunca interpreta HTML vindo do texto original.
function formatarTexto(s) {
  let seguro = escapeHtml(s || '');
  seguro = seguro
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
  return seguro;
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

function renderAreaTeste(roomState) {
  const area = document.getElementById('area-teste');
  const teste = roomState.pendingTest;
  if (!teste) {
    area.classList.add('escondido');
    clearInterval(intervaloDado);
    const el = document.getElementById('dado-visual');
    el.textContent = '?';
    el.classList.remove('critico-sucesso', 'critico-falha');
    return;
  }

  const meuPersonagem = roomState.personagens.find((p) => p.nome === estado.nomeJogador)?.personagem;
  const souEu = meuPersonagem && meuPersonagem.nome.toLowerCase() === teste.nomePersonagem.toLowerCase();
  const label = estado.config.ATTRIBUTE_LABELS[teste.atributo] || teste.atributo;

  area.classList.remove('escondido');
  document.getElementById('texto-teste').textContent = `Teste pedido: ${teste.nomePersonagem} precisa rolar ${label} (dificuldade: ${teste.dificuldade.replace('_', ' ')}).`;

  const btn = document.getElementById('btn-rolar-dado');
  btn.textContent = souEu ? `Rolar d20 de ${label}` : `Aguardando ${teste.nomePersonagem} rolar...`;
  btn.disabled = !souEu;
  btn.onclick = souEu
    ? () => {
        btn.disabled = true;
        animarDadoGirando();
        socket.emit('rolarDado', { codigo: estado.codigo, atributo: teste.atributo }, (resp) => {
          if (!resp.ok) {
            pararAnimacaoDado(null);
            alert(resp.erro);
            return;
          }
          pararAnimacaoDado(resp.rollResult);
        });
      }
    : null;
}

// ---------------------------------------------------------------------------
// Envio de ações
// ---------------------------------------------------------------------------
document.getElementById('form-acao').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const input = document.getElementById('input-acao');
  const texto = input.value.trim();
  if (!texto) return;
  input.value = '';
  socket.emit('acaoJogador', { codigo: estado.codigo, texto }, (resp) => {
    if (!resp.ok) {
      input.value = texto; // devolve o texto para não perder o que foi digitado
      alert(resp.erro);
    }
  });
});

// ---------------------------------------------------------------------------
// Mensagens de voz estilo WhatsApp: segure o microfone para gravar, solte para
// enviar. Aparecem como um áudio anexado no bate-papo (toque para ouvir, ou
// deixe o "tocar automaticamente" marcado).
// ---------------------------------------------------------------------------
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
    document.getElementById('btn-gravar-audio').classList.add('gravando');
  } catch (e) {
    alert('Não foi possível acessar o microfone: ' + e.message);
  }
}

function pararGravacao() {
  if (gravador && gravador.state !== 'inactive') gravador.stop();
  document.getElementById('btn-gravar-audio').classList.remove('gravando');
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

const btnGravarAudio = document.getElementById('btn-gravar-audio');
btnGravarAudio.addEventListener('mousedown', (ev) => { ev.preventDefault(); iniciarGravacao(); });
btnGravarAudio.addEventListener('touchstart', (ev) => { ev.preventDefault(); iniciarGravacao(); });
['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach((ev) => btnGravarAudio.addEventListener(ev, pararGravacao));

carregarConfig();
