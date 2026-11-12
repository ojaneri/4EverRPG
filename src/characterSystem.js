'use strict';

// ---------------------------------------------------------------------------
// 4EverRPG — Sistema de Personagens
// Sistema próprio, leve, baseado em d20 (teste = d20 + modificador de atributo).
// ---------------------------------------------------------------------------

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

function createCharacter({ nome, classeId, atributos, historia, avatarVariant }) {
  const classe = CLASSES[classeId];
  if (!classe) throw new Error('Classe inválida: ' + classeId);
  if (!validateAttributes(atributos)) throw new Error('Distribuição de atributos inválida.');

  const mods = {};
  for (const attr of ATTRIBUTES) mods[attr] = attributeModifier(atributos[attr]);

  const hp = classe.hpBase + mods.forca * 2;
  const recursoMax = classe.recurso.base + mods[classe.atributoPrincipal] * 2;

  return {
    nome: (nome || 'Aventureiro').slice(0, 40),
    classeId,
    classeNome: classe.nome,
    atributos,
    modificadores: mods,
    hp: { atual: hp, max: hp },
    recurso: { nome: classe.recurso.nome, atual: recursoMax, max: recursoMax },
    nivel: 1,
    inventario: [...classe.itensIniciais],
    historia: (historia || '').slice(0, 500),
    avatar: classe.avatar,
    avatarVariant: avatarVariant || 1,
    corTema: classe.corTema,
  };
}

function rollDie(sides) {
  return 1 + Math.floor(Math.random() * sides);
}

function rollD20() {
  return rollDie(20);
}

function rollCheck(character, attribute) {
  const die = rollD20();
  const mod = (character.modificadores && character.modificadores[attribute]) || 0;
  const total = die + mod;
  let resultado = 'normal';
  if (die === 20) resultado = 'critico_sucesso';
  if (die === 1) resultado = 'critico_falha';
  return { die, mod, total, resultado, atributo: attribute };
}

const DIFFICULTIES = {
  facil: 10,
  medio: 13,
  dificil: 16,
  muito_dificil: 19,
};

module.exports = {
  ATTRIBUTES,
  ATTRIBUTE_LABELS,
  POINT_BUY,
  CLASSES,
  DIFFICULTIES,
  attributeModifier,
  validateAttributes,
  createCharacter,
  rollDie,
  rollD20,
  rollCheck,
};
