'use strict';

// ---------------------------------------------------------------------------
// 4Ever — Trilha sonora e efeitos (arquivos CC0 em public/musicas e public/sfx).
// - Música: o Mestre escolhe a trilha da cena; aqui só tocamos, em loop, com
//   troca suave (crossfade) entre as faixas.
// - Efeitos: sons curtos dos momentos do jogo (dado, baú, ataque...).
// Volume e mudo são de cada jogador e ficam salvos no navegador.
// ---------------------------------------------------------------------------

const Musica = (() => {
  const BASE = location.pathname.replace(/[^/]*$/, '');
  let catalogo = [];
  let atual = null; // { id, audio }
  let faixaDesejada = '';
  let liberado = false; // navegadores só tocam som depois de um gesto do usuário

  const ler = (k, padrao) => {
    try {
      const v = localStorage.getItem(k);
      return v === null ? padrao : JSON.parse(v);
    } catch {
      return padrao;
    }
  };
  const gravar = (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch { /* sem storage */ }
  };
  let volume = ler('4ever.musica.volume', 0.5);
  let mudo = ler('4ever.musica.mudo', false);
  const volumeMusica = () => (mudo ? 0 : volume * 0.55); // música fica abaixo da narração
  // Desligado = sem som nenhum. No iPhone o volume do <audio> é ignorado (toca sempre no
  // máximo), então desligar precisa PAUSAR e silenciar (muted), não só zerar o volume.
  const silencioso = () => mudo || volume === 0;

  // Rampa de volume (fade) num elemento <audio>.
  function rampa(audio, alvo, ms, aoTerminar) {
    const inicio = audio.volume;
    const t0 = performance.now();
    const passo = () => {
      if (alvo > 0 && silencioso()) { audio.volume = 0; return; } // desligaram no meio do fade
      const k = Math.min(1, (performance.now() - t0) / ms);
      audio.volume = Math.max(0, Math.min(1, inicio + (alvo - inicio) * k));
      if (k < 1) requestAnimationFrame(passo);
      else if (aoTerminar) aoTerminar();
    };
    requestAnimationFrame(passo);
  }

  function tocar(id) {
    faixaDesejada = id || '';
    if (atual && atual.id === faixaDesejada) return;
    // Sai a faixa anterior (fade out).
    if (atual) {
      const velha = atual.audio;
      rampa(velha, 0, 1500, () => velha.pause());
      atual = null;
    }
    const info = catalogo.find((m) => m.id === faixaDesejada);
    if (!info) return;
    const audio = new Audio(BASE + info.arquivo);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0;
    audio.muted = silencioso();
    atual = { id: info.id, audio };
    if (liberado && !silencioso()) iniciar(audio);
  }

  function iniciar(audio) {
    if (silencioso()) return;
    audio.muted = false;
    audio.play().then(() => rampa(audio, volumeMusica(), 2000)).catch(() => {});
  }

  function aplicarVolume() {
    if (!atual) return;
    const a = atual.audio;
    if (silencioso()) {
      a.volume = 0;
      a.muted = true;
      a.pause();
    } else {
      a.muted = false;
      if (a.paused && liberado) iniciar(a);
      else a.volume = volumeMusica();
    }
  }

  // Libera o áudio no primeiro clique/tecla (política de autoplay dos navegadores).
  function liberar() {
    if (liberado) return;
    liberado = true;
    if (atual && atual.audio.paused && !silencioso()) iniciar(atual.audio);
  }
  ['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, liberar, { passive: true }));

  // --- Efeitos ---
  const cacheSfx = new Map();
  function efeito(nome, vol = 1) {
    if (silencioso() || !liberado) return;
    let base = cacheSfx.get(nome);
    if (!base) {
      base = new Audio(`${BASE}sfx/${nome}.mp3`);
      base.preload = 'auto';
      cacheSfx.set(nome, base);
    }
    const a = base.cloneNode(); // permite o mesmo efeito sobreposto
    a.volume = Math.max(0, Math.min(1, volume * 0.9 * vol));
    a.play().catch(() => {});
  }

  return {
    definirCatalogo(lista) {
      catalogo = lista || [];
      if (faixaDesejada && !atual) tocar(faixaDesejada);
    },
    tocar,
    parar() {
      tocar('');
    },
    efeito,
    atual: () => (atual ? atual.id : ''),
    get volume() {
      return volume;
    },
    set volume(v) {
      volume = Math.max(0, Math.min(1, v));
      gravar('4ever.musica.volume', volume);
      aplicarVolume();
    },
    get mudo() {
      return mudo;
    },
    set mudo(m) {
      mudo = !!m;
      gravar('4ever.musica.mudo', mudo);
      aplicarVolume();
    },
  };
})();
