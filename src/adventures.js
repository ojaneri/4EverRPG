'use strict';

// ---------------------------------------------------------------------------
// 4EverRPG — Roteiros de aventura prontos (conteúdo próprio e original).
// Cada "premissa" é injetada no prompt de sistema da IA Mestre como tema.
// ---------------------------------------------------------------------------

const ADVENTURES = [
  {
    id: 'sombras-de-corvile',
    titulo: 'As Sombras de Corvile',
    icone: '🏘️',
    resumoCurto: 'Um vilarejo isolado parou de mandar notícias. Algo nas minas próximas desperta à noite.',
    premissa:
      'Cenário: o vilarejo agrícola de Corvile, cercado por colinas e por uma mina de prata ' +
      'abandonada há uma geração. Há três semanas, as caravanas de suprimentos que saíam de ' +
      'Corvile pararam de chegar à cidade vizinha. Os aventureiros são contratados (por um ' +
      'mercador preocupado, por um parente de um morador, ou por iniciativa própria) para ' +
      'descobrir o que houve. Ao chegar, encontram o vilarejo com poucos moradores, portas ' +
      'trancadas, animais inquietos e relatos de luzes estranhas vindas da mina à noite. ' +
      'NPCs-chave: Dona Yvete, a anciã que ainda recebe o grupo com desconfiança; Bren, um ' +
      'jovem que insiste em guiar o grupo até a mina escondendo um motivo pessoal; e algo nas ' +
      'profundezas da mina que não é hostil por natureza, mas foi perturbado. Tom: mistério e ' +
      'tensão crescente, mais investigação do que combate direto, com uma escolha moral ao final ' +
      '(destruir, selar ou negociar com o que foi encontrado nas minas).',
  },
  {
    id: 'cofre-de-thalveira',
    titulo: 'O Cofre de Thalveira',
    icone: '🗝️',
    resumoCurto: 'Um assalto a uma casa de penhores arcana na cidade portuária de Thalveira — se o grupo topar o risco.',
    premissa:
      'Cenário: a cidade portuária de Thalveira, conhecida por suas casas de penhores que guardam ' +
      'relíquias arcanas de origem duvidosa. O grupo é procurado (por um ex-sócio traído, por ' +
      'necessidade financeira desesperada, ou por vingança) para entrar na Casa Penhora de Mestre ' +
      'Odrin e recuperar um item específico de dentro do cofre reforçado por magia, antes que seja ' +
      'vendido a um comprador perigoso. O desafio é logístico e social tanto quanto de combate: ' +
      'guardas noturnos, um sistema de alarmes arcanos, funcionários subornáveis ou não, e ao menos ' +
      'uma rota de fuga que pode dar errado. NPCs-chave: Mestre Odrin, dono cauteloso e nada ingênuo; ' +
      'Sael, um guarda da casa que pode ser aliado ou obstáculo dependendo de como for tratado; e o ' +
      'comprador misterioso que já está a caminho da cidade. Tom: tensão, planejamento, consequências ' +
      'de escolhas arriscadas — nem tudo pode ser resolvido no fio da espada.',
  },
  {
    id: 'o-que-desperta-sob-o-farol',
    titulo: 'O Que Desperta sob o Farol',
    icone: '🗼',
    resumoCurto: 'Um farol na costa rochosa apaga sozinho há três noites, e os navios temem a passagem.',
    premissa:
      'Cenário: um promontório rochoso e isolado onde um antigo farol guia os navios que passam pela ' +
      'costa. Há três noites o farol se apaga sozinho, sempre à mesma hora, e nesses momentos os ' +
      'marinheiros juram ouvir um canto vindo da água. O faroleiro, Sr. Aldric, não responde às ' +
      'mensagens. O grupo é enviado para investigar antes que um naufrágio aconteça. Ao explorar o ' +
      'farol e as grutas na base do penhasco, encontram sinais de que o próprio Aldric anda agindo de ' +
      'forma estranha, e que algo embaixo das grutas vem influenciando sua mente aos poucos. NPCs-chave: ' +
      'o Sr. Aldric, cada vez mais evasivo e errático; Marina, uma pescadora local que percebeu os ' +
      'sinais antes de todo mundo mas tem medo de ser ridicularizada; e a presença nas grutas, que não ' +
      'se revela de uma vez. Tom: mistério costeiro com leve horror psicológico, exploração cuidadosa, ' +
      'decisões sobre confiar ou não em quem já não parece mais o mesmo.',
  },
];

function getAdventureById(id) {
  return ADVENTURES.find((a) => a.id === id);
}

module.exports = { ADVENTURES, getAdventureById };
