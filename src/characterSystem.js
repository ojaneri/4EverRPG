'use strict';

// ---------------------------------------------------------------------------
// 4EverRPG — Sistema de Personagens
// Sistema próprio, leve, baseado em d20 (teste = d20 + modificador de atributo).
// ---------------------------------------------------------------------------

const { getAmbiente, AMBIENTES } = require('./ambientes');

const ATTRIBUTES = ['forca', 'agilidade', 'mente', 'espirito'];

const ATTRIBUTE_LABELS = {
  forca: 'Força',
  agilidade: 'Agilidade',
  mente: 'Mente',
  espirito: 'Espírito',
};

const POINT_BUY = {
  base: 10,
  min: 8,
  max: 16,
  extraPoints: 6, // pontos extras para distribuir entre os 4 atributos
};

const CLASSES = {
  guerreiro: {
    id: 'guerreiro',
    nome: 'Guerreiro',
    descricao: 'Um combatente robusto, treinado para enfrentar o perigo na linha de frente.',
    atributoPrincipal: 'forca',
    recurso: { nome: 'Fúria', base: 6 },
    hpBase: 16,
    itensIniciais: ['Espada longa', 'Escudo de madeira', 'Armadura de couro batido'],
    corTema: '#c0463f',
    avatar: 'guerreiro',
  },
  batedor: {
    id: 'batedor',
    nome: 'Batedor',
    descricao: 'Ágil e discreto, resolve problemas com velocidade, furtividade e uma lâmina rápida.',
    atributoPrincipal: 'agilidade',
    recurso: { nome: 'Foco', base: 8 },
    hpBase: 12,
    itensIniciais: ['Duas adagas', 'Arco curto', 'Kit de arrombamento'],
    corTema: '#2f9e5e',
    avatar: 'batedor',
  },
  arcanista: {
    id: 'arcanista',
    nome: 'Arcanista',
    descricao: 'Estudioso dos mistérios arcanos, canaliza a mente para dobrar a realidade.',
    atributoPrincipal: 'mente',
    recurso: { nome: 'Mana', base: 10 },
    hpBase: 10,
    itensIniciais: ['Cajado entalhado', 'Grimório pessoal', 'Componentes arcanos'],
    corTema: '#4169d6',
    avatar: 'arcanista',
  },
  guardiao: {
    id: 'guardiao',
    nome: 'Guardião da Fé',
    descricao: 'Protetor devoto, cura feridas e repele as trevas com uma fé inabalável.',
    atributoPrincipal: 'espirito',
    recurso: { nome: 'Fé', base: 10 },
    hpBase: 13,
    itensIniciais: ['Maça abençoada', 'Símbolo sagrado', 'Kit de cura'],
    corTema: '#d6a925',
    avatar: 'guardiao',
  },
};

function attributeModifier(score) {
  return Math.floor((score - 10) / 2);
}

function validateAttributes(attrs) {
  if (!attrs || typeof attrs !== 'object') return false;
  let spent = 0;
  for (const attr of ATTRIBUTES) {
    const v = attrs[attr];
    if (typeof v !== 'number' || !Number.isInteger(v)) return false;
    if (v < POINT_BUY.min || v > POINT_BUY.max) return false;
    spent += v - POINT_BUY.base;
  }
  return spent <= POINT_BUY.extraPoints && spent >= 0;
}

// Retratos ilustrados por ambiente e classe: 3 masculinos (m1–m3) e 3 femininos (f1–f3).
// Arquivos em public/img/retratos/<ambiente>/<classe>-<m|f><n>.jpg.
const RETRATOS = {};
for (const amb of ['fantasia']) {
  RETRATOS[amb] = {};
  for (const classeId of ['guerreiro', 'batedor', 'arcanista', 'guardiao']) {
    RETRATOS[amb][classeId] = ['m1', 'm2', 'm3', 'f1', 'f2', 'f3'].map((v) => ({ id: `${classeId}-${v}`, genero: v[0] === 'f' ? 'feminino' : 'masculino' }));
  }
}
function retratosDe(ambiente, classeId) {
  return ((RETRATOS[getAmbiente(ambiente).id] || {})[classeId]) || [];
}
function retratoValido(ambiente, classeId, id) {
  return retratosDe(ambiente, classeId).some((r) => r.id === id) ? id : null;
}

function createCharacter({ nome, classeId, atributos, historia, avatarVariant, retrato }, ambiente) {
  const classe = CLASSES[classeId];
  const vestes = (getAmbiente(ambiente).classes || {})[classeId] || {};
  if (!classe) throw new Error('Classe inválida: ' + classeId);
  if (!validateAttributes(atributos)) throw new Error('Distribuição de atributos inválida.');

  const mods = {};
  for (const attr of ATTRIBUTES) mods[attr] = attributeModifier(atributos[attr]);

  const hp = classe.hpBase + mods.forca * 2;
  const recursoMax = classe.recurso.base + mods[classe.atributoPrincipal] * 2;

  return {
    nome: String(nome || 'Aventureiro').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 30) || 'Aventureiro',
    classeId,
    classeNome: vestes.nome || classe.nome,
    atributos,
    modificadores: mods,
    hp: { atual: hp, max: hp },
    recurso: { nome: vestes.recurso || classe.recurso.nome, atual: recursoMax, max: recursoMax },
    nivel: 1,
    xp: 0,
    caido: false,
    bonusProximoTeste: 0,
    inventario: inventarioInicial(vestes.itensIniciais || classe.itensIniciais, ambiente),
    moedas: 0,
    historia: String(historia || '').slice(0, 500),
    avatar: classe.avatar,
    avatarVariant: avatarVariant || 1,
    retrato: retratoValido(ambiente, classeId, retrato),
    corTema: classe.corTema,
  };
}


// Habilidades de classe: gastam o recurso da classe (Fúria/Foco/Mana/Fé).
//  bonus      → +N no próximo teste do próprio personagem
//  bonusGrupo → +N no próximo teste de cada aliado
//  cura       → cura 1d6+N PV no aliado mais ferido (inclusive o próprio)
const HABILIDADES = {
  guerreiro: [
    { id: 'golpe_furioso', nome: 'Golpe Furioso', custo: 3, bonus: 3, descricao: '+3 no próximo teste. Um ataque brutal e imprudente.' },
    { id: 'grito_guerra', nome: 'Grito de Guerra', custo: 2, bonusGrupo: 1, descricao: '+1 no próximo teste de cada aliado.' },
  ],
  batedor: [
    { id: 'ataque_preciso', nome: 'Ataque Preciso', custo: 3, bonus: 3, descricao: '+3 no próximo teste. Mira no ponto fraco.' },
    { id: 'sumir_sombras', nome: 'Sumir nas Sombras', custo: 2, bonus: 2, descricao: '+2 no próximo teste; se esconde e se reposiciona.' },
  ],
  arcanista: [
    { id: 'raio_arcano', nome: 'Raio Arcano', custo: 3, bonus: 3, descricao: '+3 no próximo teste. Energia arcana pura.' },
    { id: 'clarividencia', nome: 'Clarividência', custo: 2, bonus: 2, descricao: '+2 no próximo teste; revela um detalhe oculto da cena.' },
  ],
  guardiao: [
    { id: 'cura_sagrada', nome: 'Cura Sagrada', custo: 3, cura: 2, descricao: 'Cura 1d6+2 PV do aliado mais ferido.' },
    { id: 'bencao', nome: 'Bênção', custo: 2, bonusGrupo: 1, descricao: '+1 no próximo teste de cada aliado.' },
  ],
};

// Habilidade com nome/descrição do ambiente (números iguais).
function getHabilidade(classeId, habilidadeId, ambiente) {
  const h = (HABILIDADES[classeId] || []).find((x) => x.id === habilidadeId);
  if (!h) return null;
  const extra = (getAmbiente(ambiente).habilidades || {})[habilidadeId];
  return extra ? { ...h, ...extra } : h;
}

function descricaoItem(itemId, ambiente) {
  const def = ITENS[itemId];
  if (!def) return '';
  return (getAmbiente(ambiente).trocasDescricao || []).reduce((t, [de, para]) => t.split(de).join(para), def.descricao);
}

// XP: cada nível pede nivel × 100 XP. Subir de nível: +3 PV máx., +2 recurso máx., recupera tudo.
function xpParaProximoNivel(nivel) {
  return nivel * 100;
}

function aplicarXp(character, quantidade) {
  const eventos = [];
  character.xp = (character.xp || 0) + quantidade;
  character.xpTotal = (character.xpTotal || 0) + quantidade; // para o resumo final
  while (character.xp >= xpParaProximoNivel(character.nivel)) {
    character.xp -= xpParaProximoNivel(character.nivel);
    character.nivel += 1;
    character.hp.max += 3;
    character.hp.atual = character.hp.max;
    character.recurso.max += 2;
    character.recurso.atual = character.recurso.max;
    character.caido = false;
    eventos.push(character.nivel);
  }
  return eventos; // níveis alcançados
}


// ---------------------------------------------------------------------------
// Itens: consumíveis (botão Usar) e artefatos (equipáveis, efeito passivo).
// Itens que o Mestre dá com nomes fora do catálogo viram itens "narrativos".
// ---------------------------------------------------------------------------
const RARIDADES = {
  comum: { nome: 'Comum', peso: 0 },
  incomum: { nome: 'Incomum', peso: 1 },
  raro: { nome: 'Raro', peso: 2 },
  lendario: { nome: 'Lendário', peso: 3 },
};

const ITENS = {
  // Consumíveis
  pocao_vida: { nome: 'Poção de vida', tipo: 'consumivel', raridade: 'comum', icone: '🧪', efeito: { cura: [2, 4, 2] }, descricao: 'Cura 2d4+2 PV.' },
  elixir_energia: { nome: 'Elixir de energia', tipo: 'consumivel', raridade: 'comum', icone: '🔷', efeito: { recurso: 4 }, descricao: 'Recupera 4 do recurso da classe.' },
  pao_viajante: { nome: 'Pão do viajante', tipo: 'consumivel', raridade: 'comum', icone: '🍞', efeito: { cura: [0, 0, 3] }, descricao: 'Recupera 3 PV.' },
  pedra_afiar: { nome: 'Pedra de afiar', tipo: 'consumivel', raridade: 'incomum', icone: '🪨', efeito: { bonus: 2 }, descricao: '+2 no próximo teste.' },
  pergaminho_protecao: { nome: 'Pergaminho de proteção', tipo: 'consumivel', raridade: 'incomum', icone: '📜', efeito: { bonus: 3 }, descricao: '+3 no próximo teste do alvo.' },
  tonico_revigorante: { nome: 'Tônico revigorante', tipo: 'consumivel', raridade: 'incomum', icone: '💚', efeito: { levantar: 5 }, descricao: 'Levanta um aliado caído (ou garante 5 PV).' },
  pocao_vida_maior: { nome: 'Poção de vida maior', tipo: 'consumivel', raridade: 'raro', icone: '⚗️', efeito: { cura: [4, 4, 4] }, descricao: 'Cura 4d4+4 PV.' },
  elixir_superior: { nome: 'Elixir superior', tipo: 'consumivel', raridade: 'raro', icone: '💠', efeito: { recurso: 8, cura: [0, 0, 4] }, descricao: '+8 de recurso e 4 PV.' },
  // Artefatos (máximo 2 equipados)
  anel_arcano: { nome: 'Anel arcano', tipo: 'artefato', raridade: 'raro', icone: '💍', passivo: { recursoMax: 2 }, descricao: '+2 de recurso máximo.' },
  botas_elficas: { nome: 'Botas élficas', tipo: 'artefato', raridade: 'raro', icone: '👢', passivo: { atributo: 'agilidade', bonus: 1 }, descricao: '+1 em testes de Agilidade.' },
  talisma_aurora: { nome: 'Talismã da aurora', tipo: 'artefato', raridade: 'raro', icone: '🌅', passivo: { regenRodada: 1 }, descricao: '+1 de recurso a cada rodada.' },
  amuleto_vida: { nome: 'Amuleto de vida', tipo: 'artefato', raridade: 'raro', icone: '📿', passivo: { hpMax: 4 }, descricao: '+4 PV máximo.' },
  manopla_tita: { nome: 'Manopla do titã', tipo: 'artefato', raridade: 'lendario', icone: '🧤', passivo: { atributo: 'forca', bonus: 2 }, descricao: '+2 em testes de Força.' },
  coroa_estrelas: { nome: 'Coroa das estrelas', tipo: 'artefato', raridade: 'lendario', icone: '👑', passivo: { recursoMax: 3, regenRodada: 1 }, descricao: '+3 de recurso máximo e +1 por rodada.' },
  // Armas (uma empunhada por vez): bônus no teste de ataque do atributo + dado de dano.
  espada_longa: { nome: 'Espada longa', tipo: 'arma', raridade: 'comum', icone: '🗡️', arma: { atributo: 'forca', bonus: 1, dano: [1, 8] }, descricao: 'Ataque de Força +1 · dano 1d8.' },
  duas_adagas: { nome: 'Duas adagas', tipo: 'arma', raridade: 'comum', icone: '🔪', arma: { atributo: 'agilidade', bonus: 1, dano: [2, 4] }, descricao: 'Ataque de Agilidade +1 · dano 2d4 (golpe duplo).' },
  arco_curto: { nome: 'Arco curto', tipo: 'arma', raridade: 'comum', icone: '🏹', arma: { atributo: 'agilidade', bonus: 1, dano: [1, 6], distancia: true }, descricao: 'Ataque à distância de Agilidade +1 · dano 1d6.' },
  cajado_entalhado: { nome: 'Cajado entalhado', tipo: 'arma', raridade: 'comum', icone: '🪄', arma: { atributo: 'mente', bonus: 1, dano: [1, 6], distancia: true }, descricao: 'Ataque arcano de Mente +1 · dano 1d6.' },
  maca_abencoada: { nome: 'Maça abençoada', tipo: 'arma', raridade: 'comum', icone: '🔨', arma: { atributo: 'forca', bonus: 1, dano: [1, 6], extra: 'brilha contra mortos-vivos' }, descricao: 'Ataque de Força +1 · dano 1d6 · forte contra mortos-vivos.' },
  machado_guerra: { nome: 'Machado de guerra', tipo: 'arma', raridade: 'incomum', icone: '🪓', arma: { atributo: 'forca', bonus: 1, dano: [1, 10] }, descricao: 'Ataque de Força +1 · dano 1d10.' },
  besta_leve: { nome: 'Besta leve', tipo: 'arma', raridade: 'incomum', icone: '🎯', arma: { atributo: 'agilidade', bonus: 2, dano: [1, 8], distancia: true }, descricao: 'Ataque à distância de Agilidade +2 · dano 1d8.' },
  varinha_faiscas: { nome: 'Varinha de faíscas', tipo: 'arma', raridade: 'incomum', icone: '✨', arma: { atributo: 'mente', bonus: 2, dano: [2, 4], distancia: true }, descricao: 'Ataque arcano de Mente +2 · dano 2d4.' },
  espada_runica: { nome: 'Espada rúnica', tipo: 'arma', raridade: 'raro', icone: '⚔️', arma: { atributo: 'forca', bonus: 2, dano: [2, 6] }, descricao: 'Ataque de Força +2 · dano 2d6.' },
  arco_elfico: { nome: 'Arco élfico', tipo: 'arma', raridade: 'raro', icone: '🏹', arma: { atributo: 'agilidade', bonus: 2, dano: [1, 10], distancia: true }, descricao: 'Ataque à distância de Agilidade +2 · dano 1d10.' },
  martelo_sagrado: { nome: 'Martelo sagrado', tipo: 'arma', raridade: 'raro', icone: '🔨', arma: { atributo: 'espirito', bonus: 2, dano: [2, 6], extra: 'luz sagrada' }, descricao: 'Ataque de Espírito +2 · dano 2d6 de luz sagrada.' },
  lamina_sombria: { nome: 'Lâmina sombria', tipo: 'arma', raridade: 'lendario', icone: '🌑', arma: { atributo: 'agilidade', bonus: 3, dano: [2, 8] }, descricao: 'Ataque de Agilidade +3 · dano 2d8.' },
  cetro_tempestade: { nome: 'Cetro da tempestade', tipo: 'arma', raridade: 'lendario', icone: '⚡', arma: { atributo: 'mente', bonus: 3, dano: [3, 6], distancia: true }, descricao: 'Ataque arcano de Mente +3 · dano 3d6 de raio.' },
  olho_vidente: { nome: 'Olho do vidente', tipo: 'artefato', raridade: 'lendario', icone: '🔮', passivo: { atributo: 'mente', bonus: 2 }, descricao: '+2 em testes de Mente.' },
};
const MAX_EQUIPADOS = 2;

// O que cada tipo de lugar pode conter.
const TABELAS_BUSCA = {
  gaveta: { nome: 'Gaveta', icone: '🗄️', itens: [0, 1], raridade: { comum: 85, incomum: 15 }, moedas: [0, 6], chanceArtefato: 0, chanceArma: 0 },
  bolsa: { nome: 'Bolsa', icone: '👝', itens: [1, 1], raridade: { comum: 75, incomum: 25 }, moedas: [3, 12], chanceArtefato: 0.03, chanceArma: 0.08 },
  bau: { nome: 'Baú', icone: '🧰', itens: [2, 3], raridade: { comum: 50, incomum: 33, raro: 15, lendario: 2 }, moedas: [5, 25], chanceArtefato: 0.12, chanceArma: 0.18 },
  estante: { nome: 'Estante', icone: '📚', itens: [1, 2], raridade: { comum: 30, incomum: 55, raro: 15 }, moedas: [0, 0], chanceArtefato: 0.15, chanceArma: 0.05 },
};

const semAcentoCS = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

function tipoDeBusca(nome) {
  const n = semAcentoCS(nome);
  if (/gaveta|armario|comoda|criado|arquivo/.test(n)) return 'gaveta';
  if (/bolsa|saco|mochila|algibeira|bolsinha|cadaver|corpo|maleta|bolso/.test(n)) return 'bolsa';
  if (/estante|prateleira|altar|biblioteca|livro|santuario|terminal|servidor|computador|notebook|rack|console|painel/.test(n)) return 'estante';
  return 'bau';
}

const aleatorio = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
function sortearPeso(pesos) {
  const total = Object.values(pesos).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [k, p] of Object.entries(pesos)) if ((r -= p) < 0) return k;
  return Object.keys(pesos)[0];
}

// Sorteia o conteúdo de um lugar. O servidor decide (a IA só narra).
function sortearSaque(tipo) {
  const t = TABELAS_BUSCA[tipo] || TABELAS_BUSCA.bau;
  const itens = [];
  const qtd = aleatorio(t.itens[0], t.itens[1]);
  for (let i = 0; i < qtd; i++) {
    if (Math.random() < t.chanceArtefato) {
      const rar = Math.random() < 0.85 ? 'raro' : 'lendario';
      const opcoes = Object.keys(ITENS).filter((id) => ITENS[id].tipo === 'artefato' && ITENS[id].raridade === rar);
      itens.push(opcoes[aleatorio(0, opcoes.length - 1)]);
      continue;
    }
    if (Math.random() < (t.chanceArma || 0)) {
      // Armas de baú são sempre melhores que as iniciais (incomum ou acima).
      const rarArma = sortearPeso({ incomum: 65, raro: 28, lendario: 7 });
      const armas = Object.keys(ITENS).filter((id) => ITENS[id].tipo === 'arma' && ITENS[id].raridade === rarArma);
      itens.push(armas[aleatorio(0, armas.length - 1)]);
      continue;
    }
    const rar = sortearPeso(t.raridade);
    let opcoes = Object.keys(ITENS).filter((id) => ITENS[id].tipo === 'consumivel' && ITENS[id].raridade === rar);
    if (!opcoes.length) opcoes = Object.keys(ITENS).filter((id) => ITENS[id].tipo === 'consumivel' && ITENS[id].raridade === 'raro');
    itens.push(opcoes[aleatorio(0, opcoes.length - 1)]);
  }
  return { itens, moedas: aleatorio(t.moedas[0], t.moedas[1]) };
}

const novoUid = () => Math.random().toString(36).slice(2, 10);

function criarItem(itemId, ambiente) {
  const d = ITENS[itemId];
  const [nome, icone] = (getAmbiente(ambiente).itens || {})[itemId] || [d.nome, d.icone];
  return { uid: novoUid(), id: itemId, nome, tipo: d.tipo, raridade: d.raridade, icone, equipado: false };
}

function itemNarrativo(nome) {
  return { uid: novoUid(), id: null, nome: String(nome).slice(0, 60), tipo: 'narrativo', raridade: null, icone: '•', equipado: false };
}

// Item dado pelo Mestre: se o nome bate com o catálogo, vira o item real.
// Reconhece o nome base do catálogo ou o nome em qualquer ambiente.
function itemPorNome(nome, ambiente) {
  const alvo = semAcentoCS(nome);
  const id = Object.keys(ITENS).find(
    (k) => semAcentoCS(ITENS[k].nome) === alvo ||
      Object.values(AMBIENTES).some((a) => a.itens && a.itens[k] && semAcentoCS(a.itens[k][0]) === alvo)
  );
  return id ? criarItem(id, ambiente) : itemNarrativo(nome);
}

function inventarioInicial(nomes, ambiente) {
  const itens = nomes.map((n) => itemPorNome(n, ambiente));
  const arma = itens.find((i) => i.tipo === 'arma');
  if (arma) arma.equipado = true; // já começa empunhando a arma da classe
  return itens;
}

// Compatibilidade: fichas antigas (inventário em texto, ou itens do catálogo que
// ficaram como "narrativos" antes de existirem) viram os itens reais.
function normalizarPersonagem(c, ambiente) {
  if (!c) return c;
  c.inventario = (c.inventario || []).map((i) => {
    if (typeof i === 'string') return itemPorNome(i, ambiente);
    if (i.tipo === 'narrativo') {
      const real = itemPorNome(i.nome, ambiente);
      if (real.tipo !== 'narrativo') return real;
    }
    return i;
  });
  if (!c.inventario.some((i) => i.tipo === 'arma' && i.equipado)) {
    const arma = c.inventario.find((i) => i.tipo === 'arma');
    if (arma) arma.equipado = true;
  }
  if (typeof c.moedas !== 'number') c.moedas = 0;
  return c;
}

function armaEmpunhada(c) {
  return (c.inventario || []).find((i) => i.tipo === 'arma' && i.equipado && ITENS[i.id]) || null;
}

// Dano da arma: dados + modificador do atributo; crítico dobra os dados.
function rolarDano(c, item, critico) {
  const a = ITENS[item.id].arma;
  const n = a.dano[0] * (critico ? 2 : 1);
  let soma = 0;
  const dados = [];
  for (let i = 0; i < n; i++) {
    const d = rollDie(a.dano[1]);
    dados.push(d);
    soma += d;
  }
  const mod = Math.max(0, (c.modificadores && c.modificadores[a.atributo]) || 0);
  return { total: soma + mod, dados, mod, formula: `${n}d${a.dano[1]}${mod ? ` + ${mod}` : ''}`, critico: !!critico };
}

function equipados(c) {
  return (c.inventario || []).filter((i) => i.tipo === 'artefato' && i.equipado && ITENS[i.id]);
}

// Bônus passivo dos artefatos equipados num atributo.
function bonusEquipamento(c, atributo) {
  return equipados(c).reduce((soma, i) => soma + (ITENS[i.id].passivo.atributo === atributo ? ITENS[i.id].passivo.bonus : 0), 0);
}

function regenPorArtefatos(c) {
  return equipados(c).reduce((soma, i) => soma + (ITENS[i.id].passivo.regenRodada || 0), 0);
}

// Liga/desliga o efeito de máximo (PV/recurso) ao equipar ou tirar um artefato.
function aplicarPassivo(c, item, ligar) {
  const p = (ITENS[item.id] || {}).passivo || {};
  const sinal = ligar ? 1 : -1;
  if (p.recursoMax) {
    c.recurso.max += sinal * p.recursoMax;
    c.recurso.atual = Math.min(c.recurso.max, c.recurso.atual + (ligar ? p.recursoMax : 0));
  }
  if (p.hpMax) {
    c.hp.max += sinal * p.hpMax;
    c.hp.atual = Math.max(ligar ? 1 : 0, Math.min(c.hp.max, c.hp.atual + (ligar ? p.hpMax : 0)));
  }
}

function rollDie(sides) {
  return 1 + Math.floor(Math.random() * sides);
}

function rollD20() {
  return rollDie(20);
}

const DIFFICULTIES = {
  facil: 10,
  medio: 13,
  dificil: 16,
  muito_dificil: 19,
};

// Teste: d20 + modificador do atributo + bônus de habilidade, contra a dificuldade.
// 20 natural é sempre sucesso; 1 natural é sempre falha.
function rollCheck(character, attribute, dificuldade) {
  const die = rollD20();
  const mod = (character.modificadores && character.modificadores[attribute]) || 0;
  const ataque = character.ataquePendente;
  const bonusArma = ataque && ataque.atributo === attribute ? ataque.bonus : 0;
  const bonus = (character.bonusProximoTeste || 0) + bonusEquipamento(character, attribute) + bonusArma;
  const total = die + mod + bonus;
  const dc = DIFFICULTIES[dificuldade] || DIFFICULTIES.medio;
  let sucesso = total >= dc;
  let resultado = sucesso ? 'sucesso' : 'falha';
  if (die === 20) { sucesso = true; resultado = 'critico_sucesso'; }
  if (die === 1) { sucesso = false; resultado = 'critico_falha'; }
  return { die, mod, bonus, total, dc, dificuldade, sucesso, resultado, atributo: attribute };
}

// Cores que o jogador pode escolher para o personagem (legíveis no fundo escuro).
// Cada personagem vivo da mesa tem uma cor diferente.
const CORES_PERSONAGEM = [
  { id: 'vermelho', nome: 'Vermelho', hex: '#e5534b' },
  { id: 'laranja', nome: 'Laranja', hex: '#f0883e' },
  { id: 'ambar', nome: 'Âmbar', hex: '#d4a72c' },
  { id: 'verde', nome: 'Verde', hex: '#3fb950' },
  { id: 'turquesa', nome: 'Turquesa', hex: '#2bb3a3' },
  { id: 'azul', nome: 'Azul', hex: '#4c8ef7' },
  { id: 'indigo', nome: 'Índigo', hex: '#8b7cf6' },
  { id: 'roxo', nome: 'Roxo', hex: '#c060f0' },
  { id: 'rosa', nome: 'Rosa', hex: '#e85aad' },
  { id: 'ardosia', nome: 'Ardósia', hex: '#9aa7b8' },
];
// Cor inicial sugerida por classe (a primeira livre a partir dela).
const COR_PADRAO_CLASSE = { guerreiro: 'vermelho', batedor: 'verde', arcanista: 'azul', guardiao: 'ambar' };

module.exports = {
  CORES_PERSONAGEM,
  COR_PADRAO_CLASSE,
  ATTRIBUTES,
  ATTRIBUTE_LABELS,
  POINT_BUY,
  CLASSES,
  DIFFICULTIES,
  HABILIDADES,
  getHabilidade,
  descricaoItem,
  RARIDADES,
  ITENS,
  MAX_EQUIPADOS,
  TABELAS_BUSCA,
  tipoDeBusca,
  sortearSaque,
  criarItem,
  itemPorNome,
  normalizarPersonagem,
  equipados,
  armaEmpunhada,
  rolarDano,
  regenPorArtefatos,
  aplicarPassivo,
  xpParaProximoNivel,
  aplicarXp,
  attributeModifier,
  validateAttributes,
  createCharacter,
  RETRATOS,
  retratosDe,
  rollDie,
  rollD20,
  rollCheck,
};
