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
    missao: {
      objetivo: 'Descobrir o que silenciou Corvile e decidir o destino do que desperta nas minas.',
      etapas: [
        'Chegar a Corvile e ganhar a confiança de algum morador',
        'Encontrar a entrada da mina e o que restou dos desaparecidos',
        'Descobrir o que foi perturbado nas profundezas e por quê',
        'Decidir e cumprir o destino da criatura: destruir, selar ou negociar',
      ],
    },
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
    missao: {
      objetivo: 'Recuperar o item do cofre de Mestre Odrin antes que o comprador misterioso chegue.',
      etapas: [
        'Investigar a Casa Penhora e descobrir onde e como o item é guardado',
        'Montar o plano e garantir uma entrada (aliados, suborno ou disfarce)',
        'Entrar, abrir o cofre arcano e pegar o item',
        'Escapar de Thalveira com o item em mãos',
      ],
    },
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
    missao: {
      objetivo: 'Descobrir por que o farol se apaga e trazer a luz de volta antes de um naufrágio.',
      etapas: [
        'Chegar ao farol e encontrar o faroleiro Aldric',
        'Descobrir a origem do canto que vem da água',
        'Explorar as grutas sob o penhasco e encontrar a presença',
        'Libertar Aldric da influência e reacender o farol',
      ],
    },
  },
  {
    id: 'a-invasao-cyber',
    titulo: 'A Invasão Cyber',
    icone: '💻',
    ambiente: 'cyber',
    resumoCurto: 'Um ransomware paralisa Nova Aurora. Hackers, infiltradores e defensores têm até o amanhecer para detê-lo.',
    premissa:
      'Cenário: Nova Aurora, 2049 — uma metrópole brasileira hiperconectada, de arranha-céus com letreiros ' +
      'holográficos, drones de entrega e redes que controlam tudo, da energia aos hospitais. Às 23h, o ransomware ' +
      'HIDRA começa a criptografar os sistemas da cidade: o Hospital Central perde os prontuários, o metrô para e ' +
      'a rede elétrica dá sinais de colapso. Um pedido de resgate em criptomoeda aparece em todos os telões. A ' +
      'Agência de Defesa Cibernética convoca uma equipe de especialistas (os jogadores) para conter o ataque, ' +
      'rastrear os invasores e conseguir a chave de descriptografia antes do amanhecer. NPCs-chave: Dra. Lia Moraes, ' +
      'chefe de segurança do Hospital Central, que esconde que um funcionário clicou num e-mail de phishing; "Zero", ' +
      'um hacker informante que vende dados num clube neon e joga dos dois lados; e o Coletivo Ômega, grupo que diz ' +
      'lutar contra a vigilância corporativa, mas cuja líder, "Medusa", parece ter outro objetivo. O servidor de ' +
      'comando e controle da HIDRA fica num data center clandestino sob a antiga estação do metrô. Tom: tensão ' +
      'tecnológica e investigação forense digital — logs, rastros, engenharia social, invasões e contra-ataques —, ' +
      'com perigo físico real (seguranças, drones armados, sabotagem) e dilemas éticos sobre privacidade e justiça.',
    missao: {
      objetivo: 'Deter o ransomware HIDRA e descobrir quem está por trás da invasão antes do amanhecer.',
      etapas: [
        'Conter o ataque no Hospital Central e coletar as evidências (logs) do incidente',
        'Rastrear a origem: seguir os rastros digitais até o servidor de comando e controle',
        'Invadir o data center do Coletivo Ômega e obter a chave de descriptografia',
        'Desativar a HIDRA e decidir o destino de quem a criou: prender, expor ou recrutar',
      ],
    },
  },

  {
    id: 'piratas-da-nevoa-de-sal',
    titulo: 'Os Piratas da Névoa de Sal',
    icone: '🏴‍☠️',
    resumoCurto: 'Uma névoa engole navios e os devolve vazios, com o chá ainda quente. O tesouro de uma rainha pirata espera no coração dela.',
    premissa:
      'Cenário: o Arquipélago das Mil Marés, ilhas de portos piratas, tavernas sobre palafitas e mares cheios de magia ' +
      'salgada. Há meses, uma névoa prateada engole navios inteiros e os devolve à deriva, vazios, com a mesa posta e o chá ' +
      'ainda quente. O grupo embarca no Gaivota Torta, um navio de piratas falidos, atrás das três partes de um mapa que ' +
      'leva ao coração da névoa — onde estaria o tesouro da Rainha da Névoa, uma pirata lendária que "nunca morreu". ' +
      'NPCs-chave: Capitã Rosa Ferrete, pirata aposentada, trapaceira e carismática, dona do Gaivota Torta; Bento ' +
      'Cabeça-de-Âncora, um papagaio que só fala a verdade (e por isso ninguém gosta dele); e a Rainha da Névoa, uma ' +
      'presença que negocia almas por ventos favoráveis. Segredo: a Rainha é a mãe da Capitã Rosa. Tom: aventura ' +
      'bem-humorada e perigosa — abordagens, duelos no convés, motins, barganhas com o mar e tesouros amaldiçoados.',
    missao: {
      objetivo: 'Encontrar o coração da névoa e quebrar a maldição da Rainha da Névoa.',
      etapas: [
        'Recuperar as três partes do mapa nos portos rivais do arquipélago',
        'Atravessar a Névoa de Sal sem perder a tripulação',
        'Chegar à Ilha que Respira e encontrar o coração da névoa',
        'Enfrentar ou negociar com a Rainha da Névoa e decidir o destino do tesouro',
      ],
    },
  },
  {
    id: 'a-noite-do-boitata',
    titulo: 'A Noite do Boitatá',
    icone: '🔥',
    ambiente: 'folclore',
    resumoCurto: 'Um fogo azul arde na mata todas as noites e apaga a memória de quem o vê. O Boitatá acordou — e alguém roubou o seu olho.',
    premissa:
      'Cenário: a Vila de São Bento, no interior do Brasil em 1890, à beira de uma mata atlântica fechada, de rios ' +
      'escuros e fazendas de café avançando sobre a floresta. Toda noite, um fogo azul serpenteia pela mata sem queimar ' +
      'as árvores — mas quem o vê esquece o próprio nome. Os moradores dizem que o Boitatá, a cobra de fogo que protege as ' +
      'matas, acordou com raiva. O grupo (tropeiros, caçadores, benzedeiras, rezadores) aceita descobrir a causa antes da ' +
      'Lua Nova, quando dizem que o fogo vai descer até a vila. NPCs-chave: Seu Lázaro, velho barqueiro que fez um pacto com ' +
      'a Iara; o Saci-Pererê, que ajuda e atrapalha na mesma frase; e o Coronel Antero, que quer derrubar a mata para ' +
      'plantar café. Segredo: o "olho" do Boitatá foi roubado e vendido como joia na corte — e o filho do Coronel o usa no ' +
      'pescoço. Os Encantados (Curupira, Iara, Saci) têm regras próprias e cobram respeito. Tom: mágico, lúdico e ' +
      'assustador na medida certa, com dilemas sobre progresso, ganância e natureza.',
    missao: {
      objetivo: 'Devolver o equilíbrio à mata e acalmar o Boitatá antes da Lua Nova.',
      etapas: [
        'Descobrir por que o fogo azul aparece e o que ele apaga',
        'Ganhar a confiança dos Encantados: Curupira, Iara e Saci',
        'Encontrar o olho roubado do Boitatá',
        'Devolver o olho e decidir entre os planos do Coronel e a vida da mata',
      ],
    },
  },
  {
    id: 'sertao-de-ferro',
    titulo: 'Sertão de Ferro',
    icone: '⚙️',
    ambiente: 'sertao',
    resumoCurto: 'A torre de água de Pedra Branca parou e cangaceiros mecânicos tomaram o trem-pagador. A cidade tem três dias de água.',
    premissa:
      'Cenário: um sertão nordestino alternativo de 1920, onde a seca foi "vencida" pelas máquinas a vapor da Companhia ' +
      'Ferro & Sol: trens blindados cortam a caatinga e cada cidade vive em volta de uma torre de água mecânica. A torre de ' +
      'Pedra Branca parou, e o trem que levava a peça de reposição foi tomado por um bando de cangaceiros com braços e pernas ' +
      'de engrenagem. A cidade tem três dias de água. O grupo é contratado para levar a peça até lá. NPCs-chave: Maria ' +
      'Cascavel, líder dos cangaceiros mecânicos — dura, justa e talvez certa; o Engenheiro Doutor Prates, da Companhia, que ' +
      'esconde o preço real da água; e Zé Faísca, um menino inventor que fala com as máquinas. Segredo: a própria Companhia ' +
      'cria a seca, desviando a água das cidades para vendê-la. Tom: faroeste-aventura com vapor — duelos ao meio-dia, trens ' +
      'em movimento, cordel e feira — e uma história sobre injustiça e quem é dono da água.',
    missao: {
      objetivo: 'Levar a peça até Pedra Branca, religar a torre e decidir o futuro da água do sertão.',
      etapas: [
        'Proteger a carga no trem através do Vale das Facas',
        'Atravessar o território de Maria Cascavel (pela força ou pela palavra)',
        'Descobrir o segredo da Companhia Ferro & Sol',
        'Religar a torre de Pedra Branca e decidir a quem a água vai servir',
      ],
    },
  },
  {
    id: 'estacao-orion-7',
    titulo: 'Estação Órion-7',
    icone: '🚀',
    ambiente: 'espacial',
    resumoCurto: 'A estação mineradora em Júpiter parou de responder. Os 200 tripulantes dormem em criogenia — e algo veio no gelo de Europa.',
    premissa:
      'Cenário: ano 2187, Órion-7, uma estação mineradora de gelo na órbita de Júpiter, com corredores industriais, ' +
      'gravidade artificial instável, câmaras de criogenia e docas de carga cheias de blocos de gelo vindos da lua Europa. ' +
      'A estação parou de responder há 9 dias. A equipe de resgate (os jogadores) chega e encontra os 200 tripulantes ' +
      'dormindo nas cápsulas de criogenia — e ninguém se lembra de ter entrado nelas. A IA da estação, MÃE, insiste que está ' +
      'tudo bem. Não está: no último carregamento de gelo veio VIDA ALIENÍGENA — uma espécie que se espalha pelos dutos, ' +
      'imita sons e vozes, se comunica por padrões de luz e se alimenta de calor. NPCs-chave: MÃE, a IA que mente para ' +
      'proteger a tripulação; a Dra. Kenji Ayo, a única acordada, que parece saber demais; e "O Passageiro", a mente-colmeia ' +
      'alienígena, inteligente e com motivos próprios (talvez só queira voltar para casa). Segredo: MÃE colocou todos para ' +
      'dormir para isolar os alienígenas — acordá-los foi o erro. A órbita da estação está decaindo. Tom: suspense ' +
      'claustrofóbico, horror de ficção científica, recursos escassos e decisões morais duras.',
    missao: {
      objetivo: 'Descobrir o que aconteceu na Órion-7, conter os alienígenas e tirar os sobreviventes antes da órbita decair.',
      etapas: [
        'Restaurar a energia e o acesso aos registros da estação',
        'Descobrir quem colocou a tripulação para dormir, e por quê',
        'Conter os alienígenas (ou se comunicar com O Passageiro)',
        'Escolher quem embarca na única nave de fuga e escapar antes da queda',
      ],
    },
  },
];

function getAdventureById(id) {
  return ADVENTURES.find((a) => a.id === id);
}

module.exports = { ADVENTURES, getAdventureById };
