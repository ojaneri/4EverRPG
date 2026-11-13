'use strict';

// ---------------------------------------------------------------------------
// 4EverRPG — Ambientes: o mesmo sistema de regras com "figurinos" diferentes.
// Um ambiente troca só NOMES, ÍCONES e TEXTOS (classes, recursos, poderes,
// itens, armas, locais de busca, trilha e estilo das ilustrações); números e
// regras continuam idênticos. 'fantasia' é o padrão (nomes do catálogo base).
// ---------------------------------------------------------------------------

const AMBIENTES = {
  fantasia: {
    id: 'fantasia',
    nome: 'Fantasia medieval',
    estiloImagem:
      'Painterly fantasy tabletop RPG illustration, cinematic wide shot, rich atmospheric lighting, ' +
      'detailed environment, family-friendly, no text, no letters, no captions, no watermark, no UI. Scene: ',
  },

  cyber: {
    id: 'cyber',
    nome: 'Cyber / hacker',
    estiloImagem:
      'Cyberpunk digital illustration, near-future neon-lit city, holographic interfaces, server rooms, ' +
      'cinematic wide shot, moody lighting, detailed, no text, no letters, no captions, no watermark, no UI. Scene: ',
    musicaPrefixo: 'cyber-',
    classes: {
      guerreiro: {
        nome: 'Operador de Campo',
        descricao: 'Segurança tática e linha de frente: protege a equipe no mundo físico quando o ataque sai da tela.',
        recurso: 'Adrenalina',
        itensIniciais: ['Bastão de choque', 'Colete tático', 'Rádio criptografado'],
      },
      batedor: {
        nome: 'Infiltrador',
        descricao: 'Pentester de campo: engenharia social, fechaduras eletrônicas e câmeras que nunca o veem.',
        recurso: 'Foco',
        itensIniciais: ['Lâminas retráteis', 'Pistola de dardos', 'Kit de lockpick eletrônico'],
      },
      arcanista: {
        nome: 'Hacker',
        descricao: 'Red team: invade sistemas, escreve exploits e transforma linhas de código em armas.',
        recurso: 'Processamento',
        itensIniciais: ['Deck de hacking', 'Notebook blindado', 'Pendrive com exploits'],
      },
      guardiao: {
        nome: 'Analista de Defesa',
        descricao: 'Blue team: monitora, contém incidentes, restaura sistemas e mantém a equipe de pé.',
        recurso: 'Firewall',
        itensIniciais: ['Taser', 'Tablet de monitoramento', 'Kit de primeiros socorros'],
      },
    },
    habilidades: {
      golpe_furioso: { nome: 'Investida Tática', descricao: '+3 no próximo teste. Um avanço brutal e calculado.' },
      grito_guerra: { nome: 'Comando de Equipe', descricao: '+1 no próximo teste de cada aliado.' },
      ataque_preciso: { nome: 'Exploit Preciso', descricao: '+3 no próximo teste. Mira na vulnerabilidade exata.' },
      sumir_sombras: { nome: 'Modo Fantasma', descricao: '+2 no próximo teste; some das câmeras e se reposiciona.' },
      raio_arcano: { nome: 'Injeção de Código', descricao: '+3 no próximo teste. Código malicioso direto no alvo.' },
      clarividencia: { nome: 'Varredura de Rede', descricao: '+2 no próximo teste; revela um detalhe oculto do sistema.' },
      cura_sagrada: { nome: 'Primeiros Socorros', descricao: 'Cura 1d6+2 PV do aliado mais ferido.' },
      bencao: { nome: 'Patch de Segurança', descricao: '+1 no próximo teste de cada aliado.' },
    },
    // id do catálogo → [nome, ícone]
    itens: {
      pocao_vida: ['Kit médico', '🩹'],
      elixir_energia: ['Energético', '🥤'],
      pao_viajante: ['Barra de proteína', '🍫'],
      pedra_afiar: ['Script otimizado', '💾'],
      pergaminho_protecao: ['Firewall portátil', '🛡️'],
      tonico_revigorante: ['Desfibrilador portátil', '⚡'],
      pocao_vida_maior: ['Nanomédico', '💉'],
      elixir_superior: ['Estimulante neural', '🧠'],
      anel_arcano: ['Implante de memória', '🔌'],
      botas_elficas: ['Botas de impulso', '👟'],
      talisma_aurora: ['Bateria de fusão', '🔋'],
      amuleto_vida: ['Colete balístico', '🦺'],
      manopla_tita: ['Exoesqueleto', '🦾'],
      coroa_estrelas: ['Coroa neural', '👑'],
      olho_vidente: ['Óculos de realidade aumentada', '🥽'],
      espada_longa: ['Bastão de choque', '⚡'],
      duas_adagas: ['Lâminas retráteis', '🔪'],
      arco_curto: ['Pistola de dardos', '🔫'],
      cajado_entalhado: ['Deck de hacking', '💻'],
      maca_abencoada: ['Taser', '⚡'],
      machado_guerra: ['Martelo hidráulico', '🔨'],
      besta_leve: ['Rifle de pulso', '🔫'],
      varinha_faiscas: ['Emissor EMP', '📡'],
      espada_runica: ['Lâmina de plasma', '🗡️'],
      arco_elfico: ['Rifle de precisão', '🎯'],
      martelo_sagrado: ['Canhão de íons', '💥'],
      lamina_sombria: ['Lâmina monomolecular', '🌑'],
      cetro_tempestade: ['Núcleo de IA ofensiva', '🤖'],
    },
    // Ajustes de texto nas descrições do catálogo ([de, para], texto simples).
    trocasDescricao: [
      ['Ataque arcano', 'Ataque digital'],
      ['forte contra mortos-vivos', 'forte contra drones e robôs'],
      ['brilha contra mortos-vivos', 'atordoa drones e robôs'],
      ['de luz sagrada', 'de pulso elétrico'],
      ['de raio', 'de sobrecarga'],
      ['Energia arcana pura', 'Código puro'],
    ],
    busca: { bau: ['Cofre', '🔐'], gaveta: ['Gaveta', '🗄️'], bolsa: ['Mochila', '🎒'], estante: ['Terminal', '🖥️'] },
    instrucoes:
      'AMBIENTE TECNOLÓGICO (near-future / cyberpunk): não existe magia. Tudo é tecnologia: poderes são ' +
      'habilidades técnicas, "criaturas" são drones, robôs, seguranças, IAs e hackers rivais. Use termos reais ' +
      'de cibersegurança de forma acessível (phishing, ransomware, engenharia social, firewall, logs, servidor ' +
      'de comando e controle, honeypot, backdoor, criptografia, zero-day). Testes de Mente cobrem invasões e ' +
      'defesa digital; Agilidade cobre infiltração física; Força cobre confronto físico; Espírito cobre ' +
      'resistir a pressão, manipulação e engenharia social.',
  },

  folclore: {
    id: 'folclore',
    nome: 'Folclore brasileiro',
    estiloImagem:
      'Painterly illustration of Brazilian folklore, 19th-century rural Brazil, Atlantic rainforest, ' +
      'colonial village, magical realism, warm and mysterious lighting, no text, no letters, no watermark, no UI. Scene: ',
    musicaPrefixo: 'folclore-',
    classes: {
      guerreiro: { nome: 'Tropeiro', descricao: 'Homem ou mulher da estrada: força bruta, facão na cintura e coragem de quem atravessa o sertão.', recurso: 'Brio', itensIniciais: ['Facão de tropeiro', 'Gibão de couro', 'Cabaça d\'água'] },
      batedor: { nome: 'Caçador', descricao: 'Conhece cada trilha da mata, lê pegadas e some entre as árvores sem fazer barulho.', recurso: 'Faro', itensIniciais: ['Facas de caça', 'Espingarda de caça', 'Armadilha de cipó'] },
      arcanista: { nome: 'Benzedeira', descricao: 'Reza, erva e sabedoria antiga: conversa com os Encantados e desfaz quebrantos.', recurso: 'Axé', itensIniciais: ['Galho de arruda', 'Terço de sementes', 'Ervas de benzer'] },
      guardiao: { nome: 'Rezador', descricao: 'Guardião da fé do povo: protege, cura e afasta assombrações com reza forte.', recurso: 'Fé', itensIniciais: ['Cajado de rezador', 'Patuá', 'Garrafada'] },
    },
    habilidades: {
      golpe_furioso: { nome: 'Golpe de Facão', descricao: '+3 no próximo teste. Um golpe com toda a força do braço.' },
      grito_guerra: { nome: 'Aboio', descricao: '+1 no próximo teste de cada aliado. O canto do vaqueiro que levanta o ânimo.' },
      ataque_preciso: { nome: 'Tiro Certeiro', descricao: '+3 no próximo teste. Mira de quem caça desde menino.' },
      sumir_sombras: { nome: 'Passo de Onça', descricao: '+2 no próximo teste; some na mata e reaparece onde ninguém espera.' },
      raio_arcano: { nome: 'Reza Forte', descricao: '+3 no próximo teste. Uma reza que dobra o mundo.' },
      clarividencia: { nome: 'Ler a Fumaça', descricao: '+2 no próximo teste; a fumaça do cachimbo revela um segredo.' },
      cura_sagrada: { nome: 'Benzimento', descricao: 'Cura 1d6+2 PV do aliado mais ferido.' },
      bencao: { nome: 'Proteção dos Santos', descricao: '+1 no próximo teste de cada aliado.' },
    },
    itens: {
      pocao_vida: ['Garrafada de ervas', '🍶'], elixir_energia: ['Café forte', '☕'], pao_viajante: ['Paçoca de carne', '🥩'],
      pedra_afiar: ['Pedra de amolar', '🪨'], pergaminho_protecao: ['Oração escrita', '📜'], tonico_revigorante: ['Chá de jurema', '🍵'],
      pocao_vida_maior: ['Unguento da mata', '🌿'], elixir_superior: ['Mel de jataí', '🍯'],
      anel_arcano: ['Anel de capim dourado', '💍'], botas_elficas: ['Alpercatas encantadas', '👡'], talisma_aurora: ['Figa de guiné', '🪬'],
      amuleto_vida: ['Escapulário', '📿'], manopla_tita: ['Braçadeira de couro de anta', '🦬'], coroa_estrelas: ['Cocar dos antigos', '🪶'], olho_vidente: ['Olho de vidro do pajé', '👁️'],
      espada_longa: ['Facão de tropeiro', '🔪'], duas_adagas: ['Facas de caça', '🔪'], arco_curto: ['Espingarda de caça', '🔫'], cajado_entalhado: ['Galho de arruda', '🌿'],
      maca_abencoada: ['Cajado de rezador', '🪵'], machado_guerra: ['Machado de lenhador', '🪓'], besta_leve: ['Bodoque de mestre', '🎯'], varinha_faiscas: ['Tição encantado', '🔥'],
      espada_runica: ['Peixeira do cangaço', '🗡️'], arco_elfico: ['Arco dos antigos', '🏹'], martelo_sagrado: ['Cruz de ferro bento', '✝️'],
      lamina_sombria: ['Faca do Saci', '🌪️'], cetro_tempestade: ['Cajado do Boitatá', '🔥'],
    },
    trocasDescricao: [
      ['Ataque arcano', 'Ataque de reza'], ['forte contra mortos-vivos', 'forte contra assombrações'],
      ['brilha contra mortos-vivos', 'espanta assombrações'], ['de luz sagrada', 'de fé'], ['de raio', 'de fogo-fátuo'], ['Energia arcana pura', 'Reza pura'],
    ],
    busca: { bau: ['Baú de madeira', '🧰'], gaveta: ['Gaveta', '🗄️'], bolsa: ['Embornal', '👝'], estante: ['Oratório', '🕯️'] },
    instrucoes:
      'AMBIENTE FOLCLORE BRASILEIRO (interior do Brasil, fim do século XIX): o sobrenatural vem das lendas brasileiras ' +
      '(Boitatá, Curupira, Saci, Iara, Mula sem Cabeça, Lobisomem, Mapinguari, Encantados). "Magia" é reza, benzimento, ' +
      'ervas e pactos. Use linguagem e costumes do interior com respeito (sem caricatura), cenários de mata, rios, vilas, ' +
      'fazendas e engenhos. Os Encantados não são simplesmente monstros: têm regras, querem respeito e podem ajudar ou cobrar caro.',
  },

  sertao: {
    id: 'sertao',
    nome: 'Steampunk sertanejo',
    estiloImagem:
      'Steampunk western illustration set in the Brazilian sertão (arid backlands), 1920s retrofuturism, steam trains, ' +
      'brass machines, water towers, cacti and red earth, dramatic sun, cinematic, no text, no letters, no watermark, no UI. Scene: ',
    musicaPrefixo: 'sertao-',
    classes: {
      guerreiro: { nome: 'Pistoleiro', descricao: 'Mão rápida e coração duro: resolve na bala e na coragem.', recurso: 'Sangue-quente', itensIniciais: ['Revólver de pressão', 'Chapéu de couro', 'Cantil de metal'] },
      batedor: { nome: 'Cangaceira', descricao: 'Ágil, estrategista e livre: conhece cada atalho da caatinga.', recurso: 'Malícia', itensIniciais: ['Punhais de cangaço', 'Bacamarte curto', 'Mapa da caatinga'] },
      arcanista: { nome: 'Inventor', descricao: 'Fala a língua das engrenagens: conserta, sabota e inventa no meio do caos.', recurso: 'Vapor', itensIniciais: ['Chave-inglesa elétrica', 'Caixa de ferramentas', 'Óculos de solda'] },
      guardiao: { nome: 'Rezadeira', descricao: 'Fé, remédio do mato e ciência do povo: segura o grupo inteiro de pé.', recurso: 'Fé', itensIniciais: ['Bengala de ferro', 'Rosário', 'Bornal de remédios'] },
    },
    habilidades: {
      golpe_furioso: { nome: 'Saque Rápido', descricao: '+3 no próximo teste. Mais rápido que o pensamento.' },
      grito_guerra: { nome: 'Grito de Arribada', descricao: '+1 no próximo teste de cada aliado.' },
      ataque_preciso: { nome: 'Tocaia', descricao: '+3 no próximo teste. Espera o momento certo e ataca.' },
      sumir_sombras: { nome: 'Sumir na Caatinga', descricao: '+2 no próximo teste; some entre os mandacarus.' },
      raio_arcano: { nome: 'Sobrecarga de Vapor', descricao: '+3 no próximo teste. A máquina faz o impossível (por um instante).' },
      clarividencia: { nome: 'Ouvir as Engrenagens', descricao: '+2 no próximo teste; descobre o defeito ou o segredo da máquina.' },
      cura_sagrada: { nome: 'Remédio do Mato', descricao: 'Cura 1d6+2 PV do aliado mais ferido.' },
      bencao: { nome: 'Novena', descricao: '+1 no próximo teste de cada aliado.' },
    },
    itens: {
      pocao_vida: ['Lambedor de mel', '🍯'], elixir_energia: ['Garrafa de óleo de vapor', '🛢️'], pao_viajante: ['Carne de sol', '🥩'],
      pedra_afiar: ['Pólvora fina', '🧂'], pergaminho_protecao: ['Placa de latão', '🛡️'], tonico_revigorante: ['Cachaça de alambique', '🍶'],
      pocao_vida_maior: ['Bálsamo do boticário', '⚗️'], elixir_superior: ['Elixir do Doutor Prates', '🧪'],
      anel_arcano: ['Válvula de pressão', '⚙️'], botas_elficas: ['Esporas de mola', '🥾'], talisma_aurora: ['Caldeira de bolso', '🔥'],
      amuleto_vida: ['Colete de couro e aço', '🦺'], manopla_tita: ['Braço mecânico', '🦾'], coroa_estrelas: ['Chapéu do Rei do Cangaço', '🤠'], olho_vidente: ['Luneta de latão', '🔭'],
      espada_longa: ['Revólver de pressão', '🔫'], duas_adagas: ['Punhais de cangaço', '🔪'], arco_curto: ['Bacamarte curto', '🔫'], cajado_entalhado: ['Chave-inglesa elétrica', '🔧'],
      maca_abencoada: ['Bengala de ferro', '🦯'], machado_guerra: ['Marreta a vapor', '🔨'], besta_leve: ['Rifle de ar comprimido', '🎯'], varinha_faiscas: ['Bobina de Tesla', '⚡'],
      espada_runica: ['Peixeira de aço fino', '🗡️'], arco_elfico: ['Rifle de luneta', '🎯'], martelo_sagrado: ['Canhão de mão', '💥'],
      lamina_sombria: ['Facão de Lampião de Ferro', '🗡️'], cetro_tempestade: ['Lança-raios do Doutor', '⚡'],
    },
    trocasDescricao: [
      ['Ataque arcano', 'Ataque elétrico'], ['forte contra mortos-vivos', 'forte contra autômatos'],
      ['brilha contra mortos-vivos', 'amassa autômatos'], ['de luz sagrada', 'de impacto'], ['de raio', 'de eletricidade'], ['Energia arcana pura', 'Pressão pura'],
    ],
    busca: { bau: ['Baú de ferro', '🧰'], gaveta: ['Gaveta', '🗄️'], bolsa: ['Bornal', '👝'], estante: ['Bancada de oficina', '🛠️'] },
    instrucoes:
      'AMBIENTE STEAMPUNK SERTANEJO (um 1920 alternativo no sertão nordestino): não há magia, há máquinas a vapor, ' +
      'eletricidade experimental, autômatos, trens blindados e torres de água mecânicas. Misture faroeste (duelos, ' +
      'trens, cidades poeirentas) com a cultura do sertão (cangaço, coronéis, romeiros, feira, cordel), com respeito. ' +
      '"Criaturas" são autômatos, jagunços com próteses, animais da caatinga e máquinas descontroladas.',
  },

  espacial: {
    id: 'espacial',
    nome: 'Ficção científica espacial',
    estiloImagem:
      'Hard science fiction illustration, deep space mining station orbiting Jupiter, industrial corridors, ' +
      'cold lighting, alien bioluminescence, cinematic, tense atmosphere, no text, no letters, no watermark, no UI. Scene: ',
    musicaPrefixo: 'espacial-',
    classes: {
      guerreiro: { nome: 'Fuzileira Espacial', descricao: 'Treinada para combate em gravidade zero: escudo humano da equipe.', recurso: 'Adrenalina', itensIniciais: ['Rifle de plasma', 'Armadura de combate', 'Lanterna de capacete'] },
      batedor: { nome: 'Pilota', descricao: 'Reflexos de quem desvia de asteroides: rápida, precisa e sempre com um plano de fuga.', recurso: 'Reflexo', itensIniciais: ['Pistolas de agulha', 'Pistola sinalizadora', 'Kit de abertura de escotilhas'] },
      arcanista: { nome: 'Engenheira de Sistemas', descricao: 'Reprograma, religa e sabota: a estação obedece a quem fala a língua dela.', recurso: 'Energia', itensIniciais: ['Ferramenta multiuso', 'Tablet de diagnóstico', 'Drone de reparo'] },
      guardiao: { nome: 'Médica de Bordo', descricao: 'Mantém todos vivos — e é quem primeiro entende o que é a criatura.', recurso: 'Suprimentos', itensIniciais: ['Bisturi a laser', 'Scanner biológico', 'Maleta médica'] },
    },
    habilidades: {
      golpe_furioso: { nome: 'Rajada Sustentada', descricao: '+3 no próximo teste. Fogo contínuo sem piscar.' },
      grito_guerra: { nome: 'Formação Tática', descricao: '+1 no próximo teste de cada aliado.' },
      ataque_preciso: { nome: 'Disparo Calculado', descricao: '+3 no próximo teste. Um tiro só, no ponto exato.' },
      sumir_sombras: { nome: 'Manobra Evasiva', descricao: '+2 no próximo teste; sai da linha de fogo e se reposiciona.' },
      raio_arcano: { nome: 'Sobrecarga de Sistema', descricao: '+3 no próximo teste. Leva a máquina ao limite.' },
      clarividencia: { nome: 'Varredura de Sensores', descricao: '+2 no próximo teste; detecta sinais de vida e falhas ocultas.' },
      cura_sagrada: { nome: 'Atendimento de Emergência', descricao: 'Cura 1d6+2 PV do aliado mais ferido.' },
      bencao: { nome: 'Estimulante de Combate', descricao: '+1 no próximo teste de cada aliado.' },
    },
    itens: {
      pocao_vida: ['Medigel', '🩹'], elixir_energia: ['Célula de energia', '🔋'], pao_viajante: ['Ração de bordo', '🥫'],
      pedra_afiar: ['Mira calibrada', '🎯'], pergaminho_protecao: ['Escudo de energia portátil', '🛡️'], tonico_revigorante: ['Injeção de adrenalina', '💉'],
      pocao_vida_maior: ['Nanorreparo', '🧬'], elixir_superior: ['Soro de combate', '🧪'],
      anel_arcano: ['Bateria auxiliar', '🔋'], botas_elficas: ['Botas magnéticas', '🥾'], talisma_aurora: ['Mini-reator', '⚛️'],
      amuleto_vida: ['Traje reforçado', '🧑‍🚀'], manopla_tita: ['Exotraje de carga', '🦾'], coroa_estrelas: ['Interface neural', '🧠'], olho_vidente: ['Visor térmico', '🥽'],
      espada_longa: ['Rifle de plasma', '🔫'], duas_adagas: ['Pistolas de agulha', '🔫'], arco_curto: ['Pistola sinalizadora', '🔦'], cajado_entalhado: ['Ferramenta multiuso', '🔧'],
      maca_abencoada: ['Bisturi a laser', '🔦'], machado_guerra: ['Cortador de plasma', '🪚'], besta_leve: ['Fuzil de pregos', '🔫'], varinha_faiscas: ['Granada de pulso', '💣'],
      espada_runica: ['Lâmina vibratória', '🗡️'], arco_elfico: ['Fuzil de precisão', '🎯'], martelo_sagrado: ['Lança-chamas criogênico', '❄️'],
      lamina_sombria: ['Lâmina de fase', '🌌'], cetro_tempestade: ['Canhão de partículas', '☄️'],
    },
    trocasDescricao: [
      ['Ataque arcano', 'Ataque tecnológico'], ['forte contra mortos-vivos', 'forte contra criaturas alienígenas'],
      ['brilha contra mortos-vivos', 'queima tecido alienígena'], ['de luz sagrada', 'de radiação'], ['de raio', 'de partículas'], ['Energia arcana pura', 'Energia pura'],
    ],
    busca: { bau: ['Contêiner de carga', '📦'], gaveta: ['Armário de equipamentos', '🗄️'], bolsa: ['Mochila de tripulante', '🎒'], estante: ['Terminal da estação', '🖥️'] },
    instrucoes:
      'AMBIENTE FICÇÃO CIENTÍFICA ESPACIAL (ano 2187, estação mineradora na órbita de Júpiter): não há magia, há tecnologia ' +
      'plausível — gravidade artificial, trajes, câmaras de descompressão, criogenia, IA de bordo — e VIDA ALIENÍGENA real e ' +
      'perigosa. Os alienígenas são inteligentes, estranhos e com motivações próprias (não apenas monstros): use biologia ' +
      'alienígena, mimetismo, colmeia, parasitas e comunicação por padrões de luz. Tensão claustrofóbica: oxigênio, energia e ' +
      'tempo são recursos escassos; corredores escuros, sons no duto de ventilação, sinais vitais que somem no monitor.',
  },
  pericia: {
    id: 'pericia',
    nome: 'Perícia e investigação (Brasil atual)',
    estiloImagem:
      'Realistic cinematic crime-drama photograph, contemporary Brazil, moody noir lighting, police station, forensic lab, ' +
      'city streets at night, evidence boards, shallow depth of field, no gore, no text, no letters, no logos, no watermark, no UI. Scene: ',
    musicaPrefixo: 'cyber-', // trilhas eletrônicas de suspense combinam com investigação
    classes: {
      guerreiro: { nome: 'Agente de Operações', descricao: 'Polícia tática: entra primeiro, cumpre mandados e protege a equipe em campo.', recurso: 'Adrenalina', itensIniciais: ['Pistola .40', 'Colete balístico', 'Algemas'] },
      batedor: { nome: 'Investigador OSINT', descricao: 'Campana, fontes abertas e redes sociais: encontra qualquer pessoa e qualquer rastro.', recurso: 'Faro', itensIniciais: ['Canivete tático', 'Pistola compacta', 'Notebook de OSINT'] },
      arcanista: { nome: 'Perito Forense Digital', descricao: 'Extrai celulares, lê logs e metadados e transforma vestígio digital em prova.', recurso: 'Análise', itensIniciais: ['Taser', 'Extrator forense', 'Bolsa de Faraday'] },
      guardiao: { nome: 'Perito Criminal', descricao: 'Local de crime, cadeia de custódia e entrevistas: garante que a prova vale no tribunal.', recurso: 'Método', itensIniciais: ['Lanterna tática', 'Kit de coleta de vestígios', 'Luz forense'] },
    },
    habilidades: {
      golpe_furioso: { nome: 'Entrada Tática', descricao: '+3 no próximo teste. Arromba, domina o ambiente e garante a cena.' },
      grito_guerra: { nome: 'Voz de Comando', descricao: '+1 no próximo teste de cada aliado.' },
      ataque_preciso: { nome: 'Rastro Digital', descricao: '+3 no próximo teste. Cruza perfis, fotos e horários até achar o alvo.' },
      sumir_sombras: { nome: 'Campana', descricao: '+2 no próximo teste; observa sem ser visto.' },
      raio_arcano: { nome: 'Extração Completa', descricao: '+3 no próximo teste. Recupera do aparelho o que parecia apagado.' },
      clarividencia: { nome: 'Análise de Metadados', descricao: '+2 no próximo teste; descobre quando, onde e com o que algo foi feito.' },
      cura_sagrada: { nome: 'Primeiros Socorros', descricao: 'Cura 1d6+2 PV do aliado mais ferido.' },
      bencao: { nome: 'Briefing', descricao: '+1 no próximo teste de cada aliado.' },
    },
    itens: {
      pocao_vida: ['Kit de primeiros socorros', '🩹'], elixir_energia: ['Café da delegacia', '☕'], pao_viajante: ['Marmita', '🍱'],
      pedra_afiar: ['Ordem judicial', '📜'], pergaminho_protecao: ['Dica de informante', '🗒️'], tonico_revigorante: ['Desfibrilador portátil', '❤️‍🩹'],
      pocao_vida_maior: ['Atendimento do SAMU', '🚑'], elixir_superior: ['Madrugada de cafeína', '🥤'],
      anel_arcano: ['Servidor de análise', '🖥️'], botas_elficas: ['Tênis de campana', '👟'], talisma_aurora: ['Fonte da imprensa', '📰'],
      amuleto_vida: ['Colete nível III', '🦺'], manopla_tita: ['Aríete', '🔨'], coroa_estrelas: ['Acesso ao sistema do tribunal', '⚖️'], olho_vidente: ['Lupa de perito', '🔍'],
      espada_longa: ['Pistola .40', '🔫'], duas_adagas: ['Canivete tático', '🔪'], arco_curto: ['Pistola compacta', '🔫'], cajado_entalhado: ['Taser', '⚡'],
      maca_abencoada: ['Lanterna tática', '🔦'], machado_guerra: ['Escopeta calibre 12', '💥'], besta_leve: ['Carabina', '🎯'], varinha_faiscas: ['Taser de longo alcance', '⚡'],
      espada_runica: ['Fuzil da equipe tática', '🔫'], arco_elfico: ['Rifle de precisão', '🎯'], martelo_sagrado: ['Escudo balístico', '🛡️'],
      lamina_sombria: ['Faca de combate', '🗡️'], cetro_tempestade: ['Arma de choque da tática', '⚡'],
    },
    trocasDescricao: [
      ['Ataque arcano', 'Ataque de choque'], ['forte contra mortos-vivos', 'imobiliza suspeitos'],
      ['brilha contra mortos-vivos', 'imobiliza suspeitos'], ['de luz sagrada', 'de impacto'], ['de raio', 'elétrico'], ['Energia arcana pura', 'Foco total'],
    ],
    busca: { bau: ['Cofre', '🔐'], gaveta: ['Gaveta', '🗄️'], bolsa: ['Mochila', '🎒'], estante: ['Computador', '💻'] },
    instrucoes:
      'AMBIENTE DE PERÍCIA E INVESTIGAÇÃO (Brasil atual, estilo true crime, tudo FICTÍCIO — não cite casos, pessoas, empresas ' +
      'ou marcas reais): não existe magia. O grupo é uma equipe de investigação: agentes, investigadores, peritos digitais e ' +
      'peritos criminais. Use termos reais de forma acessível: cadeia de custódia (lacre, ata, hash SHA-256), extração forense ' +
      'de celular, bloqueador de escrita, bolsa de Faraday, backup e banco de dados do WhatsApp, metadados EXIF, logs, IP, ' +
      'geolocalização, dados de antena (ERB), trilha de auditoria de assinatura eletrônica, prova de vida em selfie, deepfake, ' +
      'quebra de sigilo bancário/telemático (sempre com ORDEM JUDICIAL), laudo pericial. Regras de ouro: prova mal coletada ' +
      'ou obtida sem ordem judicial pode ser derrubada no tribunal (e isso é uma consequência real da cena); suspeitos mentem, ' +
      'testemunhas se contradizem, e todo vestígio digital tem data, hora e origem. Testes de Mente cobrem análises técnicas; ' +
      'Espírito, entrevistas e interrogatórios; Agilidade, campana e perseguições; Força, operações e buscas. Violência sem ' +
      'detalhes gráficos; o foco é a investigação.',
  },
};

function getAmbiente(id) {
  return AMBIENTES[id] || AMBIENTES.fantasia;
}

module.exports = { AMBIENTES, getAmbiente };
