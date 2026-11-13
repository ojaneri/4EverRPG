'use strict';

// ---------------------------------------------------------------------------
// 4EverRPG — Trilhas e efeitos sonoros. Todos CC0 (domínio público), do
// OpenGameArt.org; créditos listados na página "Como Jogar" (não obrigatórios).
// O Mestre escolhe a trilha de cada cena com a tag [MUSICA: id].
// ---------------------------------------------------------------------------

const MUSICAS = [
  { id: 'exploracao', nome: 'Exploração', icone: '🧭', arquivo: 'musicas/exploracao.mp3', uso: 'viagens, estradas, florestas, cidades de dia', autor: 'RandomMind', titulo: 'Medieval: Exploration', fonte: 'https://opengameart.org/content/medieval-exploration' },
  { id: 'taverna', nome: 'Taverna', icone: '🍺', arquivo: 'musicas/taverna.mp3', uso: 'tavernas, festas, mercados, conversas alegres', autor: 'RandomMind', titulo: "Medieval: King's Feast", fonte: 'https://opengameart.org/content/medieval-kings-feast' },
  { id: 'calmo', nome: 'Calmo', icone: '🍃', arquivo: 'musicas/calmo.mp3', uso: 'descanso, acampamento, momentos tranquilos ou tristes', autor: 'RandomMind', titulo: 'Medieval: The Old Tower Inn', fonte: 'https://opengameart.org/content/medieval-the-old-tower-inn' },
  { id: 'masmorra', nome: 'Masmorra', icone: '🕯️', arquivo: 'musicas/masmorra.mp3', uso: 'cavernas, minas, ruínas, criptas, lugares escuros', autor: 'yd', titulo: 'Dungeon Ambience', fonte: 'https://opengameart.org/content/dungeon-ambience' },
  { id: 'misterio', nome: 'Mistério', icone: '🔍', arquivo: 'musicas/misterio.mp3', uso: 'investigação, suspense, algo estranho acontecendo', autor: 'isaiah658', titulo: 'Unsolved Investigation', fonte: 'https://opengameart.org/content/unsolved-investigation' },
  { id: 'batalha', nome: 'Batalha', icone: '⚔️', arquivo: 'musicas/batalha.mp3', uso: 'combates, perseguições, perigo imediato', autor: 'Emma_MA', titulo: 'Determined Pursuit', fonte: 'https://opengameart.org/content/determined-pursuit-epic-orchestra-loop' },
  { id: 'epico', nome: 'Épico', icone: '🏰', arquivo: 'musicas/epico.mp3', uso: 'grandes revelações, chefes, vitórias, finais', autor: 'nene', titulo: 'New Sunrise', fonte: 'https://opengameart.org/node/69912' },
  // Ambiente cyber (usadas automaticamente nas mesas desse ambiente).
  { id: 'cyber-exploracao', ambiente: 'cyber', nome: 'Cidade Neon', icone: '🌃', arquivo: 'musicas/cyber-exploracao.mp3', uso: 'ruas, deslocamentos, cidade à noite', autor: 'mintodog', titulo: 'Space City', fonte: 'https://opengameart.org/node/169155' },
  { id: 'cyber-taverna', ambiente: 'cyber', nome: 'Clube', icone: '🍸', arquivo: 'musicas/cyber-taverna.mp3', uso: 'bares, clubes, encontros com informantes', autor: 'tricksntraps', titulo: 'Night Club Chill (T&T Free Cyberpunk Pack 2)', fonte: 'https://opengameart.org/content/t-t-free-cyberpunk-pack-2' },
  { id: 'cyber-calmo', ambiente: 'cyber', nome: 'Esconderijo', icone: '🛋️', arquivo: 'musicas/cyber-calmo.mp3', uso: 'descanso, esconderijo, planejamento', autor: 'vitalezzz', titulo: 'Singularity (calm)', fonte: 'https://opengameart.org/content/singularity-0' },
  { id: 'cyber-masmorra', ambiente: 'cyber', nome: 'Data Center', icone: '🗄️', arquivo: 'musicas/cyber-masmorra.mp3', uso: 'data centers, subsolos, laboratórios', autor: 'tricksntraps', titulo: 'Strange Experiments (T&T Free Cyberpunk Pack 2)', fonte: 'https://opengameart.org/content/t-t-free-cyberpunk-pack-2' },
  { id: 'cyber-misterio', ambiente: 'cyber', nome: 'Invasão', icone: '🕵️', arquivo: 'musicas/cyber-misterio.mp3', uso: 'investigação, infiltração, invasão de sistemas', autor: 'vitalezzz', titulo: 'Net Infiltration', fonte: 'https://opengameart.org/node/150672' },
  { id: 'cyber-batalha', ambiente: 'cyber', nome: 'Confronto', icone: '⚔️', arquivo: 'musicas/cyber-batalha.mp3', uso: 'combates, perseguições, contra-ataques', autor: 'tricksntraps', titulo: 'AI Fight (T&T Free Cyberpunk Pack 2)', fonte: 'https://opengameart.org/content/t-t-free-cyberpunk-pack-2' },
  { id: 'cyber-epico', ambiente: 'cyber', nome: 'Clímax', icone: '🚀', arquivo: 'musicas/cyber-epico.mp3', uso: 'revelações, chefes, vitórias, finais', autor: 'vitalezzz', titulo: 'Virtual Rush', fonte: 'https://opengameart.org/content/virtual-rush' },
  // Steampunk sertanejo
  { id: 'sertao-exploracao', ambiente: 'sertao', nome: 'Estrada de Ferro', icone: '🚂', arquivo: 'musicas/sertao-exploracao.mp3', uso: 'viagens, trens, estradas', autor: 'johnclark', titulo: 'Exploration', fonte: 'https://opengameart.org/node/190290' },
  { id: 'sertao-taverna', ambiente: 'sertao', nome: 'Bodega', icone: '🍶', arquivo: 'musicas/sertao-taverna.mp3', uso: 'bodegas, feiras, cidades', autor: 'Spring Spring', titulo: 'Spaghetti Western', fonte: 'https://opengameart.org/content/spaghetti-western' },
  { id: 'sertao-calmo', ambiente: 'sertao', nome: 'Caatinga', icone: '🌵', arquivo: 'musicas/sertao-calmo.mp3', uso: 'descanso, solidão, deserto', autor: 'Loyalty Freak Music (Komiku)', titulo: 'Un désert', fonte: 'https://opengameart.org/node/82247' },
  // Folclore brasileiro
  { id: 'folclore-exploracao', ambiente: 'folclore', nome: 'Trilha da Mata', icone: '🌳', arquivo: 'musicas/folclore-exploracao.mp3', uso: 'mata, rios, vilas, estradas', autor: 'Tarush Singhal', titulo: 'Forest', fonte: 'https://opengameart.org/node/146519' },
  { id: 'folclore-calmo', ambiente: 'folclore', nome: 'Viola ao Luar', icone: '🎸', arquivo: 'musicas/folclore-calmo.mp3', uso: 'descanso, fogueira, conversas', autor: 'Kistol', titulo: 'Etirwer', fonte: 'https://opengameart.org/content/etirwer' },
  { id: 'folclore-misterio', ambiente: 'folclore', nome: 'Mata Escura', icone: '🌑', arquivo: 'musicas/folclore-misterio.mp3', uso: 'assombrações, mistério, mata à noite', autor: 'cynicmusic', titulo: 'Dark Forest Theme', fonte: 'https://opengameart.org/node/80219' },
  // Ficção científica espacial
  { id: 'espacial-exploracao', ambiente: 'espacial', nome: 'Setor Desconhecido', icone: '🛰️', arquivo: 'musicas/espacial-exploracao.mp3', uso: 'explorar a estação, corredores', autor: 'SRG774', titulo: 'Sector (Dark Sci-Fi Audio Pack)', fonte: 'https://opengameart.org/content/dark-sci-fi-audio-pack' },
  { id: 'espacial-misterio', ambiente: 'espacial', nome: 'Pulso Alienígena', icone: '👽', arquivo: 'musicas/espacial-misterio.mp3', uso: 'algo se move nos dutos, investigação', autor: 'SRG774', titulo: 'Pulse (Dark Sci-Fi Audio Pack)', fonte: 'https://opengameart.org/content/dark-sci-fi-audio-pack' },
  { id: 'espacial-batalha', ambiente: 'espacial', nome: 'Alerta Vermelho', icone: '🚨', arquivo: 'musicas/espacial-batalha.mp3', uso: 'ataques, fugas, contagem regressiva', autor: 'SRG774', titulo: 'Urgent (Dark Sci-Fi Audio Pack)', fonte: 'https://opengameart.org/content/dark-sci-fi-audio-pack' },
  { id: 'espacial-calmo', ambiente: 'espacial', nome: 'Órbita', icone: '🪐', arquivo: 'musicas/espacial-calmo.mp3', uso: 'descanso, vista de Júpiter', autor: 'wipics', titulo: 'Outer Space Loop', fonte: 'https://opengameart.org/content/outer-space-loop' },
  { id: 'espacial-masmorra', ambiente: 'espacial', nome: 'Casco Abandonado', icone: '🛸', arquivo: 'musicas/espacial-masmorra.mp3', uso: 'setores escuros, docas, criogenia', autor: 'TinyWorlds', titulo: 'Space Graveyard', fonte: 'https://opengameart.org/content/space-graveyard-ambient-track' },
];

// Clima da cena → trilha (reserva para quando o Mestre não escolhe).
const MUSICA_POR_CLIMA = { perigo: 'batalha', tensao: 'misterio', calmo: 'calmo', noite: 'misterio', dia: 'exploracao', chuva: 'exploracao' };

const CREDITOS_SFX = [
  { pacote: '50 RPG sound effects', autor: 'Kenney', fonte: 'https://opengameart.org/content/50-rpg-sound-effects' },
  { pacote: '54 Casino sound effects (dados)', autor: 'Kenney', fonte: 'https://opengameart.org/node/12742' },
  { pacote: '85 short music jingles', autor: 'Kenney', fonte: 'https://opengameart.org/content/85-short-music-jingles' },
  { pacote: 'RPG Sound Pack', autor: 'artisticdude', fonte: 'https://opengameart.org/content/rpg-sound-pack' },
];

module.exports = { MUSICAS, MUSICA_POR_CLIMA, CREDITOS_SFX };
