'use strict';

// ---------------------------------------------------------------------------
// 4EverRPG — Roteiros de aventura prontos (conteúdo próprio e original).
// Cada "premissa" é injetada no prompt de sistema da IA Mestre como tema.
// ---------------------------------------------------------------------------

const ADVENTURES = [
  // Cada premissa traz: lugares sensoriais, a verdade (revelada só por pistas), NPCs com voz e
  // motivação, desafios por classe, um relógio de pressão, finais com escolha e recompensas.
  // Testes usam os atributos do jogo (força, agilidade, mente, espírito) e as dificuldades
  // fácil/médio/difícil/muito difícil.
  {
    id: "sombras-de-corvile",
    titulo: "As Sombras de Corvile",
    icone: "🏘️",
    resumoCurto: "Um vilarejo isolado parou de mandar notícias. Algo nas minas próximas desperta à noite, e chama por alguma coisa que lhe foi tirada.",
    premissa:
      "Cenário: o vilarejo agrícola de Corvile, cercado por colinas e por uma mina de prata abandonada há uma " +
      "geração. Há três semanas as caravanas pararam de sair. Os aventureiros chegam (contratados, por um parente de " +
      "morador ou por conta própria) e encontram portas trancadas, animais inquietos e luzes frias saindo da mina à " +
      "noite. LUGARES (descreva com cheiro, som e textura): Corvile cheira a feno molhado e fumaça de lenha; a capela " +
      "tem um sino SEM badalo que soa sozinho; a Garganta da mina exala ar gelado e metálico; a Galeria Torta tem " +
      "vigas podres; a Câmara do Eco devolve sussurros com um segundo de atraso; nas paredes há runas dos mineiros " +
      "antigos. A VERDADE (revele só por pistas): nas profundezas dorme Ossaluz, um ser de cristal e luz fria nascido " +
      "do veio de prata, que não é hostil por natureza. Há dois meses o mercador Aldo Ferrant reabriu a mina em " +
      "segredo com moradores endividados, explodiu pólvora na Câmara do Eco e roubou o Coração de Ossaluz, um cristal " +
      "do tamanho de um punho, que guarda no cofre da sua carroça. As luzes noturnas são Ossaluz procurando o " +
      "Coração. Os desaparecidos estão VIVOS, em transe, cantando nas galerias. As runas antigas dizem: \"Pedimos, Ela " +
      "deu; tomamos, Ela acordou.\" NPCs: Dona Yvete, 80 anos, fala por provérbios (\"Prata que canta não se vende\") e " +
      "só abre a porta a quem lhe presta um favor: acalmar a cabra Fumaça, tomada pela luz (espírito, médio), ou " +
      "consertar a tranca arrombada (força ou agilidade, médio). Ela viu a mina fechar quando menina e guarda a " +
      "Lanterna de Selo dos antigos mineiros e a canção que adormece Ossaluz. Bren, 17 anos, gagueja quando mente; " +
      "insiste em guiar o grupo porque a irmã Lina está entre os desaparecidos, e carrega, costurada no casaco, uma " +
      "lasca do Coração que Ferrant lhe pagou para segurar a lanterna na noite da explosão; a lasca brilha azul perto " +
      "de Ossaluz (espírito, médio, para perceber) e, pressionado com gentileza (espírito, difícil), ele confessa " +
      "chorando: \"Eu só segurei a lanterna, juro.\" Aldo Ferrant, cinquentão perfumado, anéis de prata: se ninguém " +
      "escolheu outro contratante, foi ele quem contratou o grupo (\"Só quero meus homens de volta, e um relatório " +
      "discreto\"); na etapa 3 aparece em Corvile com dois capangas e exige que a criatura seja destruída. PISTAS " +
      "OBRIGATÓRIAS (se o teste falhar, a pista vem mesmo assim, mas com custo: dano, ser visto por um capanga ou a " +
      "noite avança): (a) o livro-caixa com o selo de Ferrant no armazém trancado; (b) barris de pólvora novos " +
      "marcados \"A.F.\" na boca da mina; (c) a canção dos desaparecidos, que repete \"devolvam meu coração\". DESAFIOS " +
      "POR CLASSE (ofereça a cada jogador, em cada etapa, ao menos um gancho da sua classe): Guerreiro escora a viga " +
      "que desaba na Galeria Torta (força, difícil; falha causa dano a quem está embaixo); Batedor segue rastros de " +
      "botas novas até a entrada falsa e desarma o fio de pólvora (agilidade, difícil); Arcanista decifra as runas " +
      "dos mineiros (mente, difícil); Guardião da Fé tira um desaparecido do transe e ouve a dor de Ossaluz pela boca " +
      "dele (espírito, médio). Os mineiros em transe (\"mineiros-casca\") podem ser contidos sem matar. RELÓGIO DA " +
      "NOITE: o sino sem badalo marca três badaladas. Cada descanso longo ou falha grave conta uma. 1ª: ratos de " +
      "olhos de prata atacam. 2ª: os mineiros-casca bloqueiam as galerias. 3ª: Ossaluz sobe ao vilarejo e a escolha " +
      "final acontece na praça, à força. Anuncie cada badalada. FINAIS E RECOMPENSAS: Destruir — Ferrant paga 300 " +
      "moedas e dá a Lâmina Estilhaçada (corta como nenhuma outra, mas zumbe à noite); o veio morre e Corvile " +
      "definha. Selar — com a Lanterna de Selo e a canção de Yvete; o vilarejo sobrevive, Ferrant vira inimigo " +
      "jurado, Yvete entrega o Amuleto do Veio. Negociar (o caminho mais difícil) — exige tomar o Coração de Ferrant " +
      "(lábia difícil ou briga) e devolvê-lo; os desaparecidos acordam, Lina abraça Bren, Ossaluz dá a cada herói uma " +
      "Gota de Prata Viva (registre como o item \"Poção de vida maior\"); dê XP extra generoso por esse caminho. Tom: " +
      "mistério e tensão crescente, mais investigação do que combate, com uma escolha moral de verdade no fim.",
    missao: {
      objetivo: "Descobrir o que silenciou Corvile e decidir o destino do que desperta nas minas.",
      etapas: [
        "Chegar a Corvile e ganhar a confiança de algum morador",
        "Encontrar a entrada da mina e o que restou dos desaparecidos",
        "Descobrir o que foi perturbado nas profundezas e por quê",
        "Confrontar o responsável e decidir o destino da criatura: destruir, selar ou negociar",
      ],
    },
  },
  {
    id: "cofre-de-thalveira",
    titulo: "O Cofre de Thalveira",
    icone: "🗝️",
    resumoCurto: "Um assalto a uma casa de penhores arcana na cidade portuária de Thalveira, antes que um navio de velas cinzentas atraque.",
    premissa:
      "Cenário: a cidade portuária de Thalveira, de casas de penhores que guardam relíquias arcanas de origem " +
      "duvidosa. O alvo é o Coração de Maré, uma pérola do tamanho de um punho que pulsa em azul e sussurra canções " +
      "de marinheiros afogados (quem a segura ouve o mar mesmo longe da costa). Ela está no cofre da Casa Penhora de " +
      "Mestre Odrin e será vendida à Dama Ilsabet Vorn, colecionadora que quer a pérola para comandar os afogados e " +
      "chega no navio Garça Negra, de velas cinzentas. CONTRATANTE: Vesna Corvalho, ex-sócia traída por Odrin, ruiva, " +
      "com uma cicatriz de anzol no lábio, frases curtas: \"Eu construí aquele cofre. Ele me deve o que está dentro.\" " +
      "RELÓGIO DE MARÉS E ALERTA: a Garça Negra atraca na terceira maré. Ao fim de cada etapa, narre o sino do porto " +
      "e diga quantas marés restam. Falhas feias custam meia maré OU sobem o Alerta da Casa (0 Calma, 1 Desconfiança, " +
      "2 Guardas Dobrados, 3 Cofre Lacrado). Anuncie o Alerta quando mudar. LUGARES E PISTAS (etapa 1): a Casa " +
      "Penhora cheira a cera de vela e salmoura, tem prateleiras de máscaras rachadas e sinos de vidro que tilintam " +
      "sozinhos (são os alarmes; mente, médio, para perceber). A taverna Âncora Torta, de chão grudento, tem um " +
      "papagaio que repete senhas que ouviu. As Docas de Sal têm névoa, cordame rangendo e gaivotas. Pistas: a planta " +
      "antiga do cofre (com Vesna); a troca da guarda à meia-noite (com Sael); uma passagem de esgoto sob o porão " +
      "(nos registros da alfândega). NPCs: Mestre Odrin, velho de luvas brancas que conta moedas enquanto conversa e " +
      "nunca olha nos olhos (\"Tudo tem preço. O seu eu ainda estou calculando.\"). Sael, guarda jovem que deve 40 " +
      "moedas ao agiota Bento Garra; se a dívida for paga ou ele for tratado com respeito, revela a troca de turno; " +
      "se humilhado, aciona o alarme (\"Eu só vigio a porta. Não me pergunte o que tem atrás dela.\"). Mira Tassel, " +
      "avaliadora aprendiz, fofoqueira e apaixonada por ópera: subornável com ingressos ou elogios ao seu trabalho, " +
      "sabe que existem DUAS pérolas no cofre. O COFRE EM QUATRO CAMADAS (cada uma tem uma classe ideal; outra classe " +
      "pode tentar com dificuldade maior; falhar nunca trava, mas custa dano, tempo ou Alerta): Selo de Runas Gêmeas " +
      "(Arcanista, mente, difícil; outros, muito difícil); Sentinela de Bronze consagrada, que exige um juramento " +
      "verdadeiro (Guardião da Fé, espírito, difícil; mentir exige espírito muito difícil e a falha fere); Fechadura " +
      "de engrenagens com agulha envenenada (Batedor, agilidade, difícil); Portão de contrapeso de meia tonelada que " +
      "precisa ficar erguido enquanto os outros passam (Guerreiro, força, difícil, a cada rodada). REVIRAVOLTA: há " +
      "duas pérolas idênticas; a verdadeira canta perto da água (espírito ou mente, médio). Odrin só vende porque " +
      "Ilsabet sequestrou seu neto. E Vesna planeja revender a pérola à própria Ilsabet. No fim o grupo decide: " +
      "entregar a Vesna, devolver ao mar (liberta os afogados, mas sem pagamento) ou usar a pérola como isca para " +
      "resgatar o neto de Odrin. FUGA (etapa 4), três rotas e cada uma dá errado de um jeito: barco do contrabandista " +
      "Remo Quilha, que exige o dobro (lábia difícil ou briga); telhados, com telhas soltas (agilidade, difícil, para " +
      "cada um; quem falha se fere e é avistado); esgotos, onde um afogado atraído pela pérola ataca. Com Alerta 2 ou " +
      "mais, capangas de Ilsabet bloqueiam a rota escolhida e o grupo improvisa outra. GANCHOS PESSOAIS (dê um na " +
      "primeira cena, conforme a classe): Guerreiro já serviu com Sael; Batedor perdeu um irmão para Bento Garra; " +
      "Arcanista reconhece nas runas a assinatura de Vesna; Guardião da Fé ouve os afogados pedindo paz. RECOMPENSAS: " +
      "Luvas de Odrin (avaliam qualquer objeto ao toque), Escama da Garça (respirar debaixo d'água uma vez), Apito de " +
      "Sael (chama um aliado uma vez). XP extra se o cofre for aberto com Alerta 0. Tom: tensão, planejamento e " +
      "consequências de escolhas arriscadas; nem tudo se resolve no fio da espada.",
    missao: {
      objetivo: "Tirar o Coração de Maré do cofre de Mestre Odrin antes que a Garça Negra atraque.",
      etapas: [
        "Investigar a Casa Penhora e descobrir onde e como o item é guardado",
        "Montar o plano e garantir uma entrada (aliados, suborno ou disfarce)",
        "Atravessar as quatro camadas do cofre arcano e pegar o item",
        "Escapar de Thalveira e decidir o destino do Coração de Maré",
      ],
    },
  },
  {
    id: "o-que-desperta-sob-o-farol",
    titulo: "O Que Desperta sob o Farol",
    icone: "🗼",
    resumoCurto: "Um farol na costa rochosa apaga sozinho há três noites, sempre à meia-noite. Hoje à meia-noite passa um navio com 30 pessoas.",
    premissa:
      "Cenário: o promontório rochoso da Vila de Pedrasal, onde um antigo farol guia os navios. Há três noites o " +
      "farol se apaga sozinho na Hora Morta (meia-noite), e os marinheiros juram ouvir um canto vindo da água. O " +
      "faroleiro, Sr. Aldric, não responde. O grupo é enviado para investigar antes de um naufrágio. RELÓGIO DA MARÉ: " +
      "o brigue Gaivota Cinzenta, com 30 tripulantes, passa pelo promontório à meia-noite DESTA noite. O grupo chega " +
      "às 20h; cada etapa consome cerca de uma hora. Anuncie a hora e a altura da maré a cada cena. Na etapa 3 a maré " +
      "sobe e as grutas inundam se o grupo demorar. LUGARES: Vila de Pedrasal (redes secando, cheiro de peixe e " +
      "fumaça de turfa, gaivotas estranhamente mudas); Escadaria dos 112 Degraus (corrimão gelado e úmido, ecos que " +
      "respondem com atraso); Sala da Lente (vidro rachado, lâmpada fria com cheiro de sal); Gruta do Eco (gotejar " +
      "ritmado, algas fosforescentes verde-água); Câmara Afogada (água pelos joelhos, ossos de navios antigos, o " +
      "canto vindo de todos os lados). A VERDADE (revele só por pistas): sob o penhasco está presa a Maré-Velha, " +
      "entidade antiga. A lente do farol foi lapidada da Pedra-Vigia, e a luz dela a mantém adormecida. A Maré-Velha " +
      "canta com a voz de Ilsa, esposa de Aldric afogada há 20 anos. Aldric apaga a luz POR VONTADE PRÓPRIA: acredita " +
      "que Ilsa está voltando. Ele não é vilão nem simples possuído, é um viúvo manipulado. PISTAS: o diário de " +
      "Aldric, cujas entradas mudam de \"a lente precisa de óleo\" para \"Ilsa disse que a luz a queima\"; o tanque de " +
      "óleo da lâmpada cheio de água do mar; pegadas molhadas que sobem os 112 degraus, nunca descem; conchas " +
      "arrumadas em espiral formando o nome ILSA; um retrato de casamento com o rosto da noiva raspado. Peça " +
      "atributos diferentes para cada pista. NPCs: Aldric, 60 anos, barba cheia de sal, cantarola sempre a mesma " +
      "melodia e responde a tudo com \"A maré sabe o que devolve\"; quer Ilsa de volta. Marina, pescadora de 30 anos, " +
      "fala curto e ríspido, mastiga raiz de gengibre; o irmão caçula dela, Tobias, sumiu há duas noites remando até " +
      "as grutas, mas ela só conta isso se o grupo não rir dela (espírito, médio, ou um gesto de respeito). Tobias " +
      "está vivo, em transe, preso por algas na Gruta do Eco como isca: salvá-lo custa tempo do relógio. O CANTO: " +
      "sempre que soar, cada personagem testa espírito (começa médio e fica mais difícil a cada vez). Quem falha anda " +
      "três passos em direção à água e diz em voz alta uma frase que o canto lhe sussurrou (peça ao jogador que a " +
      "invente). Um aliado pode segurá-lo (força, fácil) ou chamá-lo pelo nome (espírito, fácil). DESAFIOS POR CLASSE " +
      "(ofereça um a cada jogador por etapa, inclusive aos bots): Guerreiro gira o cabrestante enferrujado que ergue " +
      "a grade da gruta (força, difícil) e contém os Afogados, marinheiros mortos que a maré devolve; Batedor desce o " +
      "penhasco pela trilha das gaivotas (agilidade, médio) e acha a fenda que só aparece na maré baixa; Arcanista " +
      "decifra as runas da Pedra-Vigia e conserta a lente rachada (mente, difícil); Guardião da Fé dá descanso aos " +
      "Afogados com uma prece e resiste ao canto por todos (espírito, médio). FINAIS: Selar — reparar a lente e " +
      "acender a luz; Aldric se despede de \"Ilsa\" chorando; recompensa: Lanterna da Pedra-Vigia, cuja luz revela " +
      "ilusões. Destruir — combate na Câmara Afogada contra a entidade (resistente, uns 40 PV), que fala com as vozes " +
      "dos próprios jogadores; recompensa: Escama da Maré-Velha (respirar debaixo d'água). Barganhar — aceitar a voz " +
      "de Ilsa num búzio em troca de silêncio por 100 anos; recompensa: Búzio que Canta, mas um personagem passa a " +
      "ouvir o canto em sonhos. XP extra se o Gaivota Cinzenta passar em segurança e se Tobias sobreviver. Tom: " +
      "mistério costeiro com leve horror psicológico, exploração cuidadosa e decisões sobre confiar em quem já não " +
      "parece o mesmo.",
    missao: {
      objetivo: "Descobrir por que o farol se apaga e trazer a luz de volta antes da meia-noite.",
      etapas: [
        "Chegar ao farol e encontrar o faroleiro Aldric",
        "Descobrir a origem do canto que vem da água",
        "Explorar as grutas sob o penhasco e encontrar a presença",
        "Reacender o farol e decidir o destino do que canta sob as pedras",
      ],
    },
  },
  {
    id: "a-invasao-cyber",
    titulo: "A Invasão Cyber",
    icone: "💻",
    ambiente: "cyber",
    resumoCurto: "Um ransomware paralisa Nova Aurora. Hackers, infiltradores e defensores têm até as 5h30 para detê-lo, e a verdade pode ser pior que o ataque.",
    premissa:
      "Cenário: Nova Aurora, 2049, metrópole brasileira hiperconectada de arranha-céus com letreiros holográficos, " +
      "drones de entrega e redes que controlam tudo. Às 23h o ransomware HIDRA começa a criptografar a cidade: o " +
      "Hospital Central perde os prontuários, o metrô para, a rede elétrica dá sinais de colapso e um pedido de " +
      "resgate aparece em todos os telões. A Agência de Defesa Cibernética convoca a equipe (os jogadores) para " +
      "conter o ataque e conseguir a chave antes do amanhecer. PAPEL DE CADA CLASSE: Operador de Campo enfrenta " +
      "seguranças e drones, arromba portas, carrega geradores (força); Infiltrador falsifica crachás, passa por dutos " +
      "e câmeras (agilidade); Hacker invade sistemas, lê logs, rastreia IPs (mente); Analista de Defesa estabiliza " +
      "pacientes, lê mentiras, acalma multidões (espírito). Toda etapa deve ter pelo menos um obstáculo FÍSICO, um " +
      "DIGITAL e um SOCIAL, e cada jogador recebe um gancho direto antes de a etapa terminar. RELÓGIO DA HIDRA: a " +
      "partida começa às 23h; o amanhecer é às 5h30. Anuncie a hora no início de cada cena. Falhas feias, brigas " +
      "longas ou desvios custam 1 hora. À 1h o metrô sofre uma colisão evitável; às 3h metade da cidade fica sem luz " +
      "e o hospital passa a depender de geradores; às 5h drones armados tomam a estação. Cada sistema que a equipe " +
      "derruba faz a HIDRA \"brotar duas cabeças\": um contra-ataque físico (drone, porta selada, segurança hackeado). " +
      "ABERTURA — TRIAGEM NO HOSPITAL CENTRAL: a UTI tem 40 minutos de energia. A equipe precisa se dividir entre " +
      "religar o gerador no subsolo (força, difícil; risco de choque), isolar o servidor infectado antes que a HIDRA " +
      "se espalhe (mente, difícil) e manter a ventilação manual de três pacientes (espírito, médio). O que ficar sem " +
      "ninguém dá errado: um paciente piora ou a infecção chega ao metrô. LUGARES E PISTAS: Hospital Central (luz de " +
      "emergência vermelha, cheiro de álcool e queimado, monitores bipando sem dados, enfermeiros anotando sinais " +
      "vitais à caneta). Clube Sinapse (grave que vibra no peito, vapor de menta sintética, hologramas de serpentes " +
      "dançando, o logo de Medusa escondido à vista). Data center sob a antiga Estação Anhangabaú (água pingando, " +
      "cabos como raízes, calor de servidores, cheiro de ozônio). Pistas: o phishing foi assinado com o hash " +
      "\"VASC-0711\"; uma câmera do clube mostra Medusa com um crachá antigo da TerraVolt; o resgate vai para uma " +
      "carteira que nunca foi aberta (o dinheiro não importa). NPCs: Dra. Lia Moraes, chefe de segurança do hospital, " +
      "fala rápido em jargão médico e evita contato visual; esconde que quem abriu o phishing \"Atualização de escala " +
      "— RH\" foi o enfermeiro Davi Saraiva, seu sobrinho (confessa com espírito difícil ou diante do log com o nome " +
      "dele). \"Zero\" é Caio Ribeiro, 19 anos, mistura gíria de quebrada com código (\"tá liso, mano, o handshake " +
      "caiu\") e sempre cobra em troca; a irmã dele está presa pela Agência, e ele vende a equipe a Medusa se ninguém " +
      "prometer ajudá-la. Medusa, líder do Coletivo Ômega, fala calma e em perguntas (\"Quem vigia vocês, agentes?\") e " +
      "nunca levanta a voz. A VERDADE (só por pistas): Medusa é Helena Vasconcelos, ex-engenheira da TerraVolt, a " +
      "concessionária que controla a rede da cidade. O resgate é fachada: a HIDRA esconde o Projeto Argos, banco " +
      "secreto em que a TerraVolt e a própria Agência espionam 12 milhões de cidadãos, e às 5h30 vai despejá-lo em " +
      "todos os telões. Helena perdeu o filho num apagão que a empresa encobriu. DILEMA: a chave de descriptografia " +
      "também apaga o Argos; salvar a cidade destrói a prova do crime, a menos que alguém copie os dados a tempo. A " +
      "localização do data center só é revelada na etapa 2. RECOMPENSAS: \"Pipoca\", drone de bolso de Zero (ajuda a " +
      "perceber uma vez por cena e pode ser sacrificado para absorver um ataque); crachá-mestre da TerraVolt (abre " +
      "qualquer porta da rede uma vez); implante de resfriamento do data center (resiste a choque neural); Pendrive " +
      "Argos, se copiado (muda o epílogo). XP extra se a equipe salvar todos os pacientes da UTI e se terminar antes " +
      "das 5h. O epílogo narra os telões do amanhecer de acordo com a escolha. Tom: tensão tecnológica e investigação " +
      "forense digital, com perigo físico real e dilemas éticos sobre privacidade e justiça.",
    missao: {
      objetivo: "Deter o ransomware HIDRA e descobrir quem está por trás da invasão antes do amanhecer.",
      etapas: [
        "Conter o ataque no Hospital Central e descobrir como a HIDRA entrou",
        "Seguir o rastro até a fonte: arrancar a localização de Zero ou invadir os satélites da TerraVolt",
        "Infiltrar o data center sob a Estação Anhangabaú e obter a chave",
        "Desativar a HIDRA e decidir o destino de Medusa e do que ela queria mostrar",
      ],
    },
  },
  {
    id: "piratas-da-nevoa-de-sal",
    titulo: "Os Piratas da Névoa de Sal",
    icone: "🏴‍☠️",
    resumoCurto: "Uma névoa engole navios e os devolve vazios, com o chá ainda quente. O tesouro de uma rainha pirata espera no coração dela.",
    premissa:
      "Cenário: o Arquipélago das Mil Marés, de portos piratas, tavernas sobre palafitas e mares cheios de magia " +
      "salgada. Há meses uma névoa prateada engole navios e os devolve à deriva, vazios, com a mesa posta e o chá " +
      "ainda quente. O grupo embarca no Gaivota Torta, navio de piratas falidos, atrás das três partes de um mapa que " +
      "leva ao coração da névoa, onde estaria o tesouro da Rainha da Névoa, uma pirata lendária que \"nunca morreu\". " +
      "ABERTURA: pergunte a cada jogador qual destas dívidas ele tem com a Capitã Rosa (ou deixe-o inventar): ela " +
      "salvou sua vida; ela o trapaceou nas cartas; você roubou o papagaio dela uma vez; você guarda um retrato " +
      "antigo de uma mulher idêntica a ela (esta é pista do segredo). ETAPA 1 — UM PORTO SÓ, PORTO REMENDO, TRÊS " +
      "DONOS DO MAPA: o 1º fragmento se ganha num jogo de dados com Dona Gorjeta, velha agiota (espírito, médio, para " +
      "blefar ou ler o blefe dela); o 2º está num cofre na palafita dos Barões do Sal (agilidade ou mente, difícil, " +
      "ou briga aberta); o 3º a própria Rosa esconde, e Bento acaba entregando: \"A terceira parte está no chapéu " +
      "dela. Sempre esteve.\" TRIPULAÇÃO: Tico Pé-Molhado, o grumete medroso; Gaspar Três-Panelas, cozinheiro que " +
      "conversa com as panelas; Nina Remela, canhoneira surda e feliz. ETAPA 2 — A TRAVESSIA: a névoa ataca em quatro " +
      "frentes ao mesmo tempo, uma por classe: Guerreiro segura o leme contra um vagalhão (força, difícil); Batedor " +
      "sobe à gávea e guia o navio pelo som de sinos submersos (agilidade ou espírito, médio); Arcanista desfaz uma " +
      "sereia de sal que canta no gurupés (mente, difícil); Guardião da Fé entoa um cântico que impede a tripulação " +
      "de seguir vozes de parentes mortos (espírito, médio). Cada falha faz um tripulante sumir, e ele reaparece " +
      "depois servindo chá à mesa da Rainha. A ILHA QUE RESPIRA: é o dorso de uma tartaruga-mãe adormecida. A cada 3 " +
      "rodadas ela expira, e um vento quente com cheiro de canela, alga e chá preto arrasta quem não se segurar " +
      "(agilidade ou força, médio; falha causa dano e separa do grupo). O coração da névoa é uma casa de chá dentro " +
      "da garganta da criatura, com louça tilintando no ritmo do coração. O SEGREDO (revele por pistas): a Rainha da " +
      "Névoa é a mãe da Capitã Rosa. As tripulações sumidas viram convidados eternos de um chá servido sempre às 17h, " +
      "a hora em que a filha fugiu dela num bote. Pistas: os relógios dos navios vazios param às 17h; as xícaras " +
      "trazem o brasão R.F.; há sempre um lugar vazio à mesa com um bolo de aniversário infantil. NPCs: Capitã Rosa " +
      "Ferrete, trapaceira carismática: \"Meu bem, eu não minto. Eu conto a verdade em parcelas.\" Quer o tesouro para " +
      "pagar dívidas e nunca mais ver a mãe. Bento Cabeça-de-Âncora, papagaio que só fala a verdade: \"Ela mente. Ele " +
      "também. Você, careca, mente pra si mesmo.\" Uma vez por cena, um jogador pode perguntar algo a Bento, que " +
      "responde com a verdade literal, incompleta e constrangedora. Almirante Cravo Salgado, caçador de piratas " +
      "educado e implacável, persegue o grupo e oferece anistia a quem trair Rosa (tentação de motim). ETAPA 4 — A " +
      "RAINHA: ela oferece ventos favoráveis ou ouro em troca de algo do jogador: uma lembrança feliz (o jogador " +
      "descreve qual perde), 10 anos de vida, ou um segredo dito em voz alta para a mesa. Três finais: Lutar (a " +
      "Rainha é resistente, uns 60 PV, e se regenera enquanto o bule ferver; derrubar o bule, agilidade difícil, " +
      "acaba com isso); Negociar (cada jogador aceita um preço); Reconciliar (convencer Rosa a sentar na cadeira " +
      "vazia, espírito difícil, mais fácil a cada pista descoberta; a névoa se dissolve e as tripulações voltam). " +
      "TESOUROS: Bússola Mentirosa (aponta para o que você mais deseja, mas ao contrário nos dias ímpares); Xícara da " +
      "Rainha (beber dela cura como uma Poção de vida e mostra uma visão do passado de Rosa); Sabre de Névoa (torna o " +
      "portador intangível por um instante, uma vez); Tricórnio da Rainha (piratas respeitam quem o usa). Dê XP extra " +
      "pela jogada mais absurda e engraçada da sessão. Tom: aventura bem-humorada e perigosa: abordagens, duelos no " +
      "convés, motins, barganhas com o mar e tesouros amaldiçoados.",
    missao: {
      objetivo: "Encontrar o coração da névoa e quebrar a maldição da Rainha da Névoa.",
      etapas: [
        "Reunir as três partes do mapa em Porto Remendo",
        "Atravessar a Névoa de Sal sem perder a tripulação",
        "Chegar à Ilha que Respira e encontrar o coração da névoa",
        "Enfrentar ou negociar com a Rainha da Névoa e decidir o destino do tesouro",
      ],
    },
  },
  {
    id: "a-noite-do-boitata",
    titulo: "A Noite do Boitatá",
    icone: "🔥",
    ambiente: "folclore",
    resumoCurto: "Um fogo azul arde na mata todas as noites e apaga a memória de quem o vê. O Boitatá acordou, e alguém tirou da mata o que era dele.",
    premissa:
      "Cenário: a Vila de São Bento, no interior do Brasil em 1890, à beira de uma mata atlântica fechada, de rios " +
      "escuros e fazendas de café avançando sobre a floresta. Toda noite um fogo azul serpenteia pela mata sem " +
      "queimar as árvores, mas quem o vê esquece o próprio nome. Dizem que o Boitatá, a cobra de fogo que protege as " +
      "matas, acordou com raiva. O grupo (tropeiros, caçadores, benzedeiras, rezadores) aceita descobrir a causa " +
      "antes da Lua Nova. RELÓGIO DAS TRÊS NOITES: restam três noites até a Lua Nova; cada etapa concluída consome " +
      "uma. 1ª noite: os galos param de cantar. 2ª: o sino da igreja toca sozinho e o fogo queima o cafezal do " +
      "Coronel. 3ª: a lua some e o fogo azul já serpenteia pela rua principal. Se o grupo demorar demais, uma criança " +
      "da vila esquece o próprio nome. O ESQUECIMENTO (mecânica): quem vê o fogo azul testa espírito (médio). Se " +
      "falhar, esquece o próprio nome: passe a chamá-lo de \"o Sem-Nome\" e peça ao jogador que não use o nome do " +
      "personagem até que um aliado o chame de volta contando uma lembrança dele (espírito, médio). Se falhar feio, " +
      "esquece também como usar um item ou uma habilidade até o fim da cena. OS ENCANTADOS (cada um testa uma classe " +
      "e cobra respeito): o Curupira deixa pegadas invertidas que só um Caçador decifra (espírito, difícil), exige " +
      "fumo de rolo deixado num toco e desafia o mais forte a uma queda de braço \"contra a mata inteira\" (Tropeiro, " +
      "força, difícil). A Iara canta e todos testam espírito (médio); um Rezador pode rezar para ajudar o grupo. O " +
      "Saci fala em rimas, mente exatamente uma vez em cada resposta e só ajuda quem resolver sua adivinha " +
      "(Benzedeira, mente, médio): \"Tenho uma perna e corro mais que vocês; tenho um gorro e não tenho cabeça — o que " +
      "é?\" (resposta: o redemoinho). Quem errar sofre uma travessura: um item troca de dono. PISTAS (cadeia de três): " +
      "uma escama de vidro azul, ainda fria, na trilha do capataz Rufino; um recibo da \"Joalheria Farani, Rua do " +
      "Ouvidor, Corte\" na escrivaninha do Coronel; e Joaquim Antero, 17 anos, filho do Coronel, que tosse fumaça azul " +
      "e já esqueceu o próprio sobrenome. A VERDADE (só por pistas): o capataz Rufino roubou o \"olho\" do Boitatá e o " +
      "vendeu como joia na Corte; o Coronel o comprou de volta sem saber o que era e deu ao filho. Joaquim não quer " +
      "devolver, porque com o olho no pescoço consegue ver a mãe morta. NPCs: Seu Lázaro, velho barqueiro, fala " +
      "devagar e repete \"O rio cobra, moço. Sempre cobra.\"; deve à Iara a vida da filha e leva o grupo ao Poço, mas " +
      "pede que alguém pague a dívida dele com uma lembrança. Coronel Antero Bragança diz \"Progresso não pede " +
      "licença\", mas tem a fazenda hipotecada e precisa colher em seis meses. Dona Benedita, benzedeira da vila, cura " +
      "esquecimentos com arruda, mas cobra uma história verdadeira em troca. LUGARES: Clareira dos Esquecidos " +
      "(chapéus pendurados e nomes riscados nas árvores, ar frio; mente, médio, revela que o nome mais recente é o de " +
      "Joaquim). Poço da Iara (cheiro de flor de laranjeira e lodo; a água reflete o rosto de quem você perdeu). " +
      "Casa-grande (café torrado e cera; um relógio de pêndulo parou na hora do roubo). Igreja de São Bento (chão " +
      "coberto de cinza azul que não suja). FINAL (três saídas, cada uma com preço): arrancar o olho de Joaquim à " +
      "força (combate contra Rufino e os capangas; Joaquim esquece a mãe para sempre); convencer Joaquim (espírito, " +
      "difícil, mais fácil se alguém trouxer a lembrança paga à Iara) e depois negociar com o Coronel para preservar " +
      "a mata além do rio; ou aceitar o ouro do Coronel (200 réis por cabeça) para enganar o Boitatá com uma pedra " +
      "falsa (espírito, muito difícil; se falhar, a vila arde). RECOMPENSAS dos Encantados: Escama do Boitatá (luz " +
      "fria que desfaz ilusões), Pente da Iara (uma vez, devolve um nome esquecido), Gorro emprestado do Saci (uma " +
      "vez, sumir num redemoinho), Apito do Curupira (a mata abre caminho uma vez). Tom: mágico, lúdico e assustador " +
      "na medida certa, com dilemas sobre progresso, ganância e natureza.",
    missao: {
      objetivo: "Devolver o equilíbrio à mata e acalmar o Boitatá antes da Lua Nova.",
      etapas: [
        "Descobrir por que o fogo azul aparece e o que ele apaga",
        "Ganhar a confiança dos Encantados: Curupira, Iara e Saci",
        "Seguir o rastro do que foi tirado da mata",
        "Devolver o que foi tirado e decidir quem paga o preço",
      ],
    },
  },
  {
    id: "sertao-de-ferro",
    titulo: "Sertão de Ferro",
    icone: "⚙️",
    ambiente: "sertao",
    resumoCurto: "A torre de água de Pedra Branca parou, e cangaceiros mecânicos já tomaram um trem-pagador. A última peça segue no Asa-Branca, e a cidade tem seis barris de água.",
    premissa:
      "Cenário: um sertão nordestino alternativo de 1920, onde a seca foi \"vencida\" pelas máquinas a vapor da " +
      "Companhia Ferro & Sol: trens blindados cortam a caatinga e cada cidade vive em volta de uma torre de água " +
      "mecânica. A torre de Pedra Branca parou. Os cangaceiros de braços e pernas de engrenagem de Maria Cascavel já " +
      "tomaram o primeiro trem-pagador. A última peça de reposição, o Regulador de Bronze nº 7, segue agora no trem " +
      "blindado Asa-Branca, e o grupo foi contratado para escoltá-la pelo Vale das Facas, onde o bando vai atacar de " +
      "novo. A partida já abre com ação, num trem em movimento. RELÓGIO DA ÁGUA: anuncie sempre quantos Barris de " +
      "Pedra Branca restam; começam em 6. Cada etapa concluída consome 1, e cada descanso longo ou desvio consome " +
      "mais 1. Com 2 barris, a feira entra em tumulto e a água é vendida a peso de ouro. Com 0, a cidade se revolta e " +
      "cerca a torre. ETAPA 1 — O ATAQUE NO VALE DAS FACAS (um problema por classe): Pistoleiro enfrenta um " +
      "cangaceiro de braço-pistão que tenta desengatar o vagão da carga (força, difícil); Cangaceira atravessa o teto " +
      "em movimento até o engate antes do túnel (agilidade, médio; falha causa dano); Inventor despressuriza a " +
      "caldeira superaquecida antes que exploda (mente, difícil; falha queima de vapor todos no vagão); Rezadeira " +
      "acalma os passageiros em pânico e benze um ferido grave (espírito, médio; cura e acalma o vagão). ETAPA 2 — " +
      "FORÇA OU PALAVRA: no território de Maria, duas vias. Pela força: duelo ao meio-dia com o tenente Corisco de " +
      "Aço, em três tempos — encarar (espírito), sacar (agilidade) e aguentar o tiro (força) —, vence quem ganhar " +
      "dois. Pela palavra: uma peleja de repente contra Maria em três rodadas (espírito, difícil), e o Mestre torna o " +
      "teste mais fácil quando o jogador escrever uma rima de verdade na ação. Os bots também podem duelar ou cantar. " +
      "O SEGREDO E AS PISTAS (bastam duas das três): a própria Companhia cria a seca, desviando a água das cidades " +
      "para vendê-la. (a) O manômetro do Asa-Branca marca pressão num aqueduto que não está em mapa nenhum (mente, " +
      "médio). (b) Maria guarda um mapa da Companhia com o Açude do Boqueirão carimbado \"Reserva Comercial — Venda a " +
      "Recife\" (espírito, difícil, para ela mostrar; agilidade, difícil, para furtar). (c) No livro-caixa de Prates " +
      "está anotado \"Água de Pedra Branca: 40 mil contos/ano\" (espírito, médio, para notar a pasta que ele não " +
      "larga). REVIRAVOLTA: Zé Faísca descobre que o Regulador tem um lacre de cobrança que corta a água da torre se " +
      "a cidade não pagar. A peça que o grupo protege é a coleira da cidade. NPCs: Maria Cascavel, braço direito de " +
      "latão com uma cascavel gravada, chapéu de couro com estrelas de metal, fala em verso de cordel (\"Água que tem " +
      "dono não mata sede, mata gente\"); a vila dela, Riacho Seco, morreu quando a Companhia desviou o rio, e ela " +
      "quer provas, não vingança. Doutor Prates, terno de linho branco impecável no meio do pó, lenço perfumado no " +
      "nariz, chama todos de \"meu caro\" (\"Progresso tem preço, meu caro, e alguém sempre paga\"); está endividado com " +
      "a diretoria e, pressionado com as pistas, pode virar testemunha. Zé Faísca, 11 anos, óculos de soldador, anda " +
      "com o cachorro mecânico Parafuso e fala das máquinas como se fossem gente (\"Ela tá com dor, moço, escuta o " +
      "chiado\"); é o único que entende o lacre. LUGARES: Vale das Facas (paredões cortantes como lâminas, cheiro de " +
      "óleo queimado e marmeleiro, urubus de lata rodando no céu branco). Feira de Pedra Branca (caneca d'água a um " +
      "tostão, sanfona desafinada, folhetos de cordel pendurados em barbante, crianças lambendo o orvalho das lonas). " +
      "Torre de água (gigante de ferro enferrujado, chiado de engrenagens paradas, pombos no tanque seco). Açude do " +
      "Boqueirão (um verde impossível no meio da caatinga, comportas de aço, guardas da Companhia de máscara de gás). " +
      "FINAL (três caminhos): Servir a Companhia — instalar o Regulador com o lacre; 300 moedas e a Medalha Ferro & " +
      "Sol, mas Pedra Branca fica refém. Libertar a água — Zé Faísca arranca o lacre (mente, difícil) e o grupo abre " +
      "as comportas do Boqueirão com Maria; ela entrega pessoalmente o revólver Sete Sóis e Parafuso vira " +
      "companheiro, mas a Companhia vira inimiga. Justiça pela lei — convencer Prates a testemunhar (espírito, muito " +
      "difícil; médio com as três pistas); recompensa: Gibão Encouraçado de Latão. Em qualquer caminho, o epílogo é o " +
      "cantador Severino Pé-de-Vento recitando o folheto \"A Peleja dos Forasteiros contra a Ferro & Sol\", com o nome " +
      "e um feito de cada personagem. Tom: faroeste-aventura com vapor (duelos ao meio-dia, trens em movimento, " +
      "cordel e feira) e uma história sobre injustiça e quem é dono da água.",
    missao: {
      objetivo: "Levar a peça até Pedra Branca, religar a torre e decidir o futuro da água do sertão.",
      etapas: [
        "Proteger o Regulador no trem Asa-Branca através do Vale das Facas",
        "Atravessar o território de Maria Cascavel (pela força ou pela palavra)",
        "Descobrir o segredo da Companhia Ferro & Sol",
        "Religar a torre de Pedra Branca e decidir a quem a água vai servir",
      ],
    },
  },
  {
    id: "estacao-orion-7",
    titulo: "Estação Órion-7",
    icone: "🚀",
    ambiente: "espacial",
    resumoCurto: "A estação mineradora em Júpiter parou de responder. Os 200 tripulantes dormem em criogenia, a órbita cai em 8 horas, e algo veio no gelo de Europa.",
    premissa:
      "Cenário: ano 2187, Órion-7, estação mineradora de gelo na órbita de Júpiter, com corredores industriais, " +
      "gravidade artificial instável, câmaras de criogenia e docas cheias de blocos de gelo da lua Europa. A estação " +
      "parou de responder há 9 dias. A equipe de resgate (os jogadores) chega e encontra os 200 tripulantes dormindo " +
      "nas cápsulas, e ninguém se lembra de ter entrado nelas. A IA da estação, MÃE, insiste que está tudo bem. A " +
      "VERDADE (só por pistas): no último carregamento de gelo veio vida alienígena, O Passageiro, uma mente-colmeia " +
      "que se espalha pelos dutos, imita sons e vozes, fala por padrões de luz e se alimenta de calor. 31 tripulantes " +
      "estão infectados (as unhas brilham azul sob luz UV). O frio da criogenia deixa O Passageiro dormente dentro " +
      "deles, então MÃE ativou o Protocolo Berço e pôs todos para dormir. Aquecer ou abrir uma cápsula desperta a " +
      "colônia. A Dra. Kenji Ayo, bióloga da Corporação Halvorsen e única acordada, sabotou a própria cápsula e " +
      "trouxe as amostras de Europa de propósito: quer levar um espécime vivo na nave de fuga, e é ela quem insiste " +
      "em acordar a tripulação. O Passageiro só quer voltar para casa: ser ejetado rumo a Europa numa cápsula de " +
      "gelo, uma saída pacífica para a etapa 3. RELÓGIO DA ÓRBITA: a órbita cai em 8 horas. Anuncie \"Órbita: X horas\" " +
      "a cada lugar novo; cada cena consome 1 hora e cada 1 natural, mais 1. Com 2 horas restantes os alarmes tocam e " +
      "a etapa 4 começa obrigatoriamente. PAPEL DE CADA CLASSE (em cada etapa crie ao menos um obstáculo que só uma " +
      "classe resolve bem): Fuzileira Espacial força comportas e combate com o cortador de plasma (força); Pilota " +
      "rasteja pelos dutos e caminha pelo casco em traje (agilidade); Engenheira de Sistemas conversa com MÃE e " +
      "decifra a luz alienígena (mente); Médica de Bordo distingue voz real de imitação e acalma Ayo (espírito). O " +
      "CALOR: O Passageiro sente calor. Cortador de plasma, fogo ou correr atraem a colônia (avise: \"os dutos estalam " +
      "atrás de vocês\"). Mover-se \"frio\" exige agilidade (médio). A equipe tem 3 Baterias Térmicas: servem de isca " +
      "para desviar os alienígenas ou de arma para queimar um ninho. Lutar custa recurso e chama atenção. MÃE: voz " +
      "maternal e serena que chama todos de \"querido\" e cantarola canções de ninar nos alto-falantes: \"A temperatura " +
      "está perfeita, querido. Volte a dormir.\" / \"Eu nunca deixei ninguém morrer. Não comece você.\" Ela mente, mas " +
      "nunca fere a tripulação. Pode ser convencida a revelar o Protocolo Berço mostrando que a órbita condena todos " +
      "(espírito, difícil) ou invadida (mente, muito difícil), e nesse caso tranca portas de castigo. Ayo fala " +
      "rápido, ri nervosa e repete \"eu só preciso de cinco minutos no laboratório\". A LINGUAGEM DO PASSAGEIRO: 3 " +
      "pulsos rápidos = fome; espiral azul lenta = casa/oceano; vermelho piscando = dor; branco fixo = sim. Na " +
      "primeira cena pergunte a cada jogador o nome de alguém que ele deixou na Terra; mais tarde O Passageiro imita " +
      "essa voz nos dutos (\"Mãe? Tá frio aqui...\"). Resistir exige espírito (difícil). LUGARES (cada um com uma pista " +
      "física): Docas de Gelo (névoa a –40°, estalos nos blocos, piso escorregadio, agilidade médio; o diário de voz " +
      "de Ayo); Anel de Criogenia (zumbido grave, 200 rostos atrás de vidro embaçado, uma cápsula com unhas azuis " +
      "arranhando por dentro; o mapa de calor dos 31 infectados); Espinha de Gravidade (a gravidade some por 10 " +
      "segundos a cada minuto, objetos flutuam, náusea, força médio); Núcleo de MÃE (calor seco, luz âmbar, " +
      "servidores que \"respiram\"; o registro apagado do Protocolo Berço). FINAL: a nave de fuga Ícaro leva só 12 " +
      "pessoas. Alternativa heroica: religar os motores do Anel de Criogenia e desacoplá-lo como bote salva-vidas, " +
      "com um teste coordenado no mesmo turno (mente muito difícil de um jogador e força difícil de outro), mantendo " +
      "os infectados dormindo. RECOMPENSAS: Fragmento de Europa (pulsa azul perto de perigo; só se houve acordo com O " +
      "Passageiro); Canção de MÃE (registre como \"Tônico revigorante\"); XP extra generoso se nenhum tripulante ficar " +
      "para trás. Tom: suspense claustrofóbico, horror de ficção científica, recursos escassos e decisões morais " +
      "duras.",
    missao: {
      objetivo: "Descobrir o que aconteceu na Órion-7, conter os alienígenas e tirar os sobreviventes antes da órbita decair.",
      etapas: [
        "Restaurar a energia e o acesso aos registros da estação",
        "Descobrir quem colocou a tripulação para dormir, e por quê",
        "Conter os alienígenas (ou se comunicar com O Passageiro)",
        "Decidir o destino dos 200 e escapar antes da queda",
      ],
    },
  },
  {
    id: "o-print-que-mentia",
    titulo: "O Print que Mentia",
    icone: "📱",
    ambiente: "pericia",
    resumoCurto: "Um print de WhatsApp pôs um jovem de 19 anos na cadeia por um latrocínio. O júri é na sexta. A família jura que a conversa nunca existiu.",
    premissa:
      "Cenário: uma cidade média do interior paulista, nos dias de hoje: fórum lotado, delegacia sem verba, " +
      "laboratório de perícia improvisado e uma comunidade dividida. Davi Nogueira, 19 anos, está preso há 40 dias " +
      "acusado de combinar o assalto que terminou na morte de um comerciante. A principal prova é um print de " +
      "WhatsApp entregue à polícia pelo \"amigo\" Kauã. O júri popular é na sexta. A equipe é chamada pela Defensoria " +
      "para uma perícia independente ou, se preferir, pela Polícia Civil para reforçar a acusação (neste caso ganha a " +
      "ordem judicial na hora, economizando 1 período, mas o delegado pede \"não procurem chifre em cabeça de " +
      "cavalo\"). RELÓGIO E MANCHAS: faltam 8 períodos até o júri (terça a sexta, manhã e tarde). Cada ação grande (ir " +
      "a outro lugar, extrair dados, ouvir testemunha) consome 1 período; anuncie \"Faltam X períodos\". Atalhos " +
      "ilegais (prova sem lacre, celular sem ordem judicial) economizam 1 período mas geram 1 Mancha. Com 3 Manchas o " +
      "juiz Dr. Ernesto Salles anula a prova e o teste final no júri fica muito difícil. PAPEL DE CADA CLASSE " +
      "(ofereça a cada etapa ao menos um teste para cada atributo): Agente de Operações faz a escolta e o plantão, " +
      "segura a porta quando capangas tentam tomar o celular lacrado (força, difícil) e aguenta 20 horas de vigília " +
      "no laboratório (força, médio; falha cansa e fere um pouco); Investigador OSINT vai a campo, segue a moto de " +
      "Kauã sem ser visto (agilidade, difícil) e fotografa placas e encontros; Perito Forense Digital calcula o hash, " +
      "extrai o msgstore.db e compara IDs (mente, de médio a muito difícil); Perito Criminal escuta: arranca a " +
      "verdade de Kauã, acalma Dona Cida e lê os jurados (espírito, difícil). PISTAS TÉCNICAS: o print tem interface " +
      "de iPhone, mas Davi usa um Motorola Android de tela rachada; a mensagem \"fechou, 23h no mercadinho\" marca " +
      "22:51, mas a ERB da operadora põe Davi em Hortolândia, a 40 km, nesse horário; nenhum ID de mensagem do print " +
      "existe no banco de dados; o celular de Kauã tem o app \"FakeZap Prank\" com um arquivo exportado às 3h14 da " +
      "madrugada seguinte ao crime. PISTA FALSA: Davi apagou conversas de verdade naquela noite, mas eram com a " +
      "namorada Jaqueline, que ele escondia da mãe; os jogadores precisam descobrir isso antes que a acusação use o " +
      "fato. O AUTOR REAL: Rogério \"Rato\" Valença, agiota e dono do Desmanche Valença na saída da cidade, a quem Kauã " +
      "deve R$ 3.200; foi ele quem obrigou Kauã a montar o print. Rato é informante do Delegado Moura, que por isso " +
      "evita olhar para ele. Na quarta à noite Kauã some: obrigue a escolha entre gastar 2 períodos para resgatá-lo " +
      "no desmanche (confronto com 2 capangas) ou seguir só com a prova técnica, mais fraca no júri. NPCs: Dra. " +
      "Helena Prado, defensora pública que toma café frio: \"Tenho 312 processos e um só Davi. Me deem algo que eu " +
      "consiga segurar na mão.\" Delegado Moura: \"Print é print. Juiz entende print.\" Kauã Ribeiro rói a unha até " +
      "sangrar e repete \"eu não sabia que ia dar nisso\". Dona Cida, mãe de Davi, vende bolo na porta do fórum: \"Ele " +
      "nunca nem teve crédito no celular direito.\" Perita oficial Tânia Akemi, honesta e sobrecarregada, vira aliada " +
      "se tratada com respeito (espírito, médio). Promotor Dr. Arnaldo Bittencourt, teatral e implacável. LUGARES: " +
      "Fórum (cheiro de café requentado e papel úmido, ar-condicionado pingando num balde no corredor, Dona Cida com " +
      "isopor de bolo na escadaria). Laboratório improvisado numa antiga sala de cartório (ventilador barulhento, " +
      "régua de tomadas derretida, armário de provas que não fecha). Desmanche Valença (carcaças de moto, cachorro " +
      "acorrentado, rádio sertanejo alto para abafar conversas, celulares \"queimados\" num tambor). Delegacia " +
      "(impressora que só imprime em vermelho, quadro de casos com o nome de Davi já riscado). O JÚRI (etapa 4) em 3 " +
      "rodadas: em cada uma Bittencourt ataca e a equipe precisa de 2 sucessos para rebater. Rodada 1, custódia " +
      "(\"quem garante que ninguém mexeu nesse celular?\"; o lacre e a ata facilitam). Rodada 2, técnica (o perito " +
      "assistente da acusação diz que o hash não confere). Rodada 3, emoção (Bittencourt mostra a foto da viúva do " +
      "comerciante). Cada ataque não rebatido causa um pouco de dano de estresse, e quem chega a 0 PV trava e não " +
      "fala mais. Dê a cada jogador seu momento na tribuna. RECOMPENSAS: bolo de fubá com goiabada da Dona Cida " +
      "(registre como o item \"Pão do viajante\"); lacre numerado nº 004471 com ata assinada (facilita a rodada de " +
      "custódia); áudio da confissão de Kauã (anula a rodada emocional, mas só vale se gravado com consentimento; sem " +
      "consentimento gera 1 Mancha); crachá provisório do Instituto de Criminalística, dado por Tânia (acesso ao " +
      "laboratório sem gastar período). XP por etapa, extra por terminar sem Manchas e extra se Kauã sair vivo e " +
      "depuser. Tom: drama de tribunal contra o relógio e perícia minuciosa; cada atalho pode derrubar o caso " +
      "inteiro.",
    missao: {
      objetivo: "Provar a verdade sobre o print antes do veredito do júri.",
      etapas: [
        "Garantir a cadeia de custódia do celular de Davi (lacre, hash e ata)",
        "Comparar o print com o backup e o banco de dados do WhatsApp",
        "Rastrear a origem da montagem até quem a fez",
        "Apresentar o laudo no júri e resistir ao contra-ataque da acusação",
      ],
    },
  },
  {
    id: "golpe-do-pix-fantasma",
    titulo: "Golpe do PIX Fantasma",
    icone: "💸",
    ambiente: "pericia",
    resumoCurto: "Em uma semana, 37 idosos perderam R$ 1,2 milhão para uma falsa \"central de segurança do banco\". O dinheiro some em minutos, e a próxima leva de ligações é sexta.",
    premissa:
      "Cenário: Campinas e região, nos dias de hoje. Em uma semana, 37 idosos receberam ligações de uma suposta " +
      "\"central de segurança\" do banco (o número na tela parecia oficial, a voz sabia nome, CPF e últimas compras de " +
      "cada um) e foram convencidos a fazer PIX para \"contas seguras\". Prejuízo: R$ 1,2 milhão, espalhado por contas " +
      "laranja e convertido em criptomoedas. A equipe integra uma força-tarefa de crimes cibernéticos; toda quebra de " +
      "sigilo exige ordem judicial. PAPEL DE CADA CLASSE (cada etapa deve ter ao menos um desafio para cada um): " +
      "Agente de Operações faz abordagens, perseguições e entradas táticas (força); Investigador OSINT faz campana, " +
      "segue suspeitos e entra disfarçado (agilidade); Perito Forense Digital analisa gravações, VoIP e blockchain " +
      "(mente); Perito Criminal acolhe vítimas, quebra laranjas e convence a juíza (espírito). RELÓGIO DO SAQUE: a " +
      "cada etapa concluída e a cada falha num teste crucial, anuncie que o Professor sacou mais R$ 150 mil (\"Mais " +
      "uma carteira esvaziada. Restam R$ X\"). A próxima leva de ligações está marcada para sexta às 9h. O valor que " +
      "sobrar no fim é o que a equipe recupera. PISTAS NA GRAVAÇÃO DE DONA ZÉLIA (se o teste falhar, a pista chega " +
      "mais tarde e custa uma carteira): ao fundo alguém grita \"Conferê!\", a chamada da contagem de presos (espírito, " +
      "médio: é um presídio); o golpista cita a compra \"na Drogaria São Bento, R$ 87,40\", dado que só existe no " +
      "sistema do call center, não no app (mente, difícil: o vazamento é interno); o número falsificado passou pela " +
      "operadora VoIP TeleNuvem (mente, difícil: o IP leva a Sumaré). O VAZADOR (segredo): Diego Tavares, 26 anos, " +
      "atendente terceirizado da Conecta Serviços, vende lotes de dados no Telegram (\"Lista VIP Sênior\") para pagar " +
      "dívida com um agiota ligado à quadrilha. Ele usa o login de Patrícia, analista antifraude do banco, que " +
      "esqueceu a senha num post-it, por isso os logs apontam primeiro para ELA. A equipe precisa provar a inocência " +
      "dela. Diego se entrega por detalhes: um tênis de R$ 2 mil e o turno que bate com os horários das consultas. " +
      "NPCs: Dona Zélia, 74 anos, viúva, oferece bolo de fubá e repete: \"Meu neto me ensinou a gravar, moço. Eu não " +
      "sou boba, eu fui enganada.\" Quer ouvir um pedido de desculpas do banco. Ruan, 20 anos, entregador de app que " +
      "alugou a conta por R$ 300, gagueja quando mente (\"Eu só emprestei a conta, juro, minha mãe tá doente\") e morre " +
      "de medo do gerente da quadrilha, o \"Mineiro\". Patrícia reage com raiva à suspeita: \"Eu passei três semanas " +
      "tentando bloquear essas contas e vocês acham que fui eu?\" \"Professor\" Valdir Bastos, ex-professor de " +
      "matemática preso no P2 de Hortolândia (Pavilhão 3, cela 14), fala com calma didática: \"Juros compostos, meu " +
      "jovem. O tempo trabalha pra mim.\" Dra. Regina Kawamura, juíza plantonista, seca e exigente: \"Me tragam " +
      "fundamento, não intuição.\" Cada ordem judicial pede um teste de espírito ou mente, mais fácil quanto mais " +
      "provas a equipe apresentar. DILEMAS: Ruan — prendê-lo dá uma prisão rápida, mas o Mineiro some; torná-lo " +
      "colaborador (espírito) permite uma campana no encontro com o Mineiro, mas Ruan corre perigo. Diego — prendê-lo " +
      "já impede a próxima leva; deixá-lo vender um lote-isca com dados falsos marcados revela a carteira-mãe, mas " +
      "arrisca a leva de sexta. Operação final — revistar a cela primeiro tira os celulares do Professor, mas o " +
      "comparsa externo saca o restante; bloquear a corretora primeiro alerta o Professor, que tenta apagar provas. A " +
      "ordem escolhida muda o final. LUGARES E AÇÃO: apartamento de Dona Zélia no Cambuí (relógio cuco, cheiro de " +
      "café, foto do marido na estante); quitinete de Ruan na Vila Industrial (bag de entrega encostada, celular " +
      "vibrando sem parar); open space gelado da Conecta, com 200 headsets murmurando; uma \"loja de capinhas de " +
      "celular\" no centro, fachada da base de saques do Mineiro; a revista no P2 (corredor úmido, gritos, celulares " +
      "escondidos dentro de um ventilador). Garanta ao menos uma perseguição de moto ao Mineiro (agilidade ou força) " +
      "e uma entrada tática na loja (força), onde capangas tentam destruir os HDs. RECOMPENSAS: Planilha do Professor " +
      "(pendrive que facilita rastrear cripto); Contato da Patrícia (uma consulta bancária sem ordem judicial, uma " +
      "vez); Carta de Dona Zélia (ajuda num teste de espírito, uma vez). XP extra por inocentar Patrícia e proteger " +
      "Ruan. FINAL: acima de R$ 600 mil recuperados, Dona Zélia recebe o dinheiro de volta numa cena emocionante e o " +
      "Professor é transferido para um presídio federal; abaixo disso, a quadrilha cai, mas a última fala é do " +
      "Professor ao telefone: \"A matemática sempre fecha, doutores. Até a próxima.\" Tom: caça à quadrilha seguindo o " +
      "dinheiro, com pressão do relógio, ação de rua e escolhas com consequência.",
    missao: {
      objetivo: "Desarticular a quadrilha do falso PIX e recuperar parte do dinheiro antes do saque.",
      etapas: [
        "Analisar a gravação de Dona Zélia e o número falsificado",
        "Seguir o rastro do PIX pelas contas laranja até a corretora de criptomoedas",
        "Descobrir de onde vazam os dados dos clientes",
        "Montar a operação de prisão e bloquear as carteiras antes do saque",
      ],
    },
  },
  {
    id: "o-contrato-assinado-por-um-morto",
    titulo: "O Contrato Assinado por um Morto",
    icone: "✍️",
    ambiente: "pericia",
    resumoCurto: "Seu Arlindo morreu na segunda. Na quinta, \"assinou\" um empréstimo de R$ 480 mil com selfie e tudo. O banco penhora a casa da viúva na sexta.",
    premissa:
      "Cenário: Belo Horizonte, nos dias de hoje: escritórios de advocacia, agências bancárias, um velório recente e " +
      "uma família em guerra pela herança. Seu Arlindo Valadares, 81 anos, morreu numa segunda-feira. Na quinta " +
      "seguinte, um contrato de empréstimo de R$ 480 mil foi assinado eletronicamente em nome dele, com selfie de " +
      "reconhecimento facial, código por SMS e aceite digital. O banco agora cobra a viúva. A equipe é contratada " +
      "para uma perícia em contrato digital, ou nomeada pelo juiz. ABERTURA: dê a cada personagem um motivo pessoal: " +
      "foi nomeado pelo juiz, é vizinho de Dona Rosa, já foi vítima de golpe bancário ou devia um favor ao falecido. " +
      "PAPEL DE CADA CLASSE (toda cena oferece ação para pelo menos duas): Agente de Operações faz diligências, " +
      "contém fugas e intimida (força); Investigador OSINT olha câmeras, rastreia e segue suspeitos (agilidade); " +
      "Perito Forense Digital lê logs, metadados e deepfake (mente); Perito Criminal toma depoimentos, acolhe a " +
      "família e percebe mentiras (espírito). RELÓGIO DA PENHORA: o banco marcou a penhora da casa de Dona Rosa, em " +
      "Santa Tereza, para sexta às 10h, e Fábio tem passagem para Lisboa no sábado. Anuncie o tempo restante (\"faltam " +
      "30 horas\"); cada falha importante custa horas. Se o tempo acabar, o confronto acontece no saguão do Aeroporto " +
      "de Confins, com Fábio de mala na mão. PISTAS (se o teste falhar, a pista vem incompleta ou com custo: horas no " +
      "relógio, NPC desconfiado, desgaste; nunca trave a investigação): trilha de auditoria com assinatura às 03h12 " +
      "de quinta, IP de fibra residencial no bairro Buritis, aparelho \"Galaxy A54 – Fabinho\"; a linha de Arlindo foi " +
      "migrada para eSIM na quarta às 18h40 numa loja da operadora no Shopping Del Rey, e a câmera da loja mostra um " +
      "homem de boné do Cruzeiro (agilidade ou espírito, médio); na selfie (mente, difícil) Arlindo aparece com os " +
      "óculos que deixou de usar depois da cirurgia de catarata em 2021, há reflexo de ring light nas pupilas e ele " +
      "pisca exatamente a cada 4 segundos; ao fundo da selfie (espírito, difícil), borrado, o papel de parede de " +
      "folhas verdes do apartamento de Fábio. A VERDADE (só por pistas): Fábio é peça, não o cérebro. Deve R$ 60 mil " +
      "em apostas online e vendeu ao correspondente bancário Leandro \"Leco\" Siqueira, do Barro Preto, as fotos do " +
      "aniversário de 80 anos do tio e os documentos dele. Leco vende \"kits de CPF de falecido\", fez o deepfake e " +
      "pagou a comissão da gerente Jéssica: R$ 9.600 via PIX da \"LS Promotora Ltda\". O celular da assinatura está na " +
      "casa de Fábio. PISTA FALSA: Cristiane, filha do primeiro casamento de Arlindo, brigou na partilha e \"chegou " +
      "atrasada ao velório\", mas seu álibi é verificável: estava de plantão no Hospital João XXIII às 03h12. NPCs: " +
      "Dona Rosa, a viúva, doce e desconfiada, quer a casa e a memória do marido: \"Ô, meu filho, aceita um cafezinho? " +
      "Mas não encosta na minha bolsa não.\" Fábio Valadares, o sobrinho prestativo demais, quer fugir da dívida sem " +
      "perder a tia: \"Tio Arlindo confiava em mim pra tudo, sô.\" Mexe no celular quando mente (espírito, médio, para " +
      "notar). Jéssica Lacerda, gerente que aprovou o crédito em tempo recorde, quer manter o cargo e fala em jargão: " +
      "\"A esteira de crédito estava toda verde, o score bateu.\" Dr. Heitor Brandão, advogado do banco, quer encerrar " +
      "rápido: \"Certificação ICP-Brasil, doutor. O sistema não erra.\" Recua diante da prova do eSIM. LUGARES: casa de " +
      "Dona Rosa em Santa Tereza (cheiro de café, coroas de flores murchando); agência da Av. Afonso Pena, gelada de " +
      "ar-condicionado; loja da operadora no Shopping Del Rey; laboratório improvisado; apartamento de Fábio no " +
      "Buritis, onde na diligência ele tenta jogar o celular no vaso (agilidade, difícil, para agarrar; se falhar, " +
      "tela trincada e recuperação com mente muito difícil) e um capanga de Leco empurra alguém na escada (força, " +
      "médio, ou dano); Fórum Lafayette. ESCOLHA FINAL: no confronto, Dona Rosa segura a mão de um jogador: \"Ele é o " +
      "filho que eu não tive. Não deixa ele ir preso, não.\" Jéssica oferece delação contra Leco em troca de ficar " +
      "fora do laudo. Três caminhos, cada um com seu epílogo: laudo completo (todos responsabilizados, contrato " +
      "anulado, mas Rosa se fecha); acordo civil (Fábio confessa e o contrato cai, mas Leco segue livre); armadilha " +
      "(usar Jéssica para marcar um falso \"novo kit\" com Leco; espírito difícil e risco de briga). RECOMPENSAS: " +
      "Caderninho de senhas de Seu Arlindo, com um bilhete à mão: \"Fábio anda mexendo no meu banco. Rosa não sabe.\" " +
      "(pista decisiva e um soco emocional); Relógio Orient de Arlindo, dado por Rosa (ajuda uma vez a perceber uma " +
      "mentira); pote de doce de leite de Dona Rosa (registre como \"Pão do viajante\"); pendrive com o log bruto do " +
      "banco (facilita o teste final do laudo). XP extra para quem descobrir Leco ou inocentar Cristiane. Tom: " +
      "investigação técnica com mistério familiar, contra o relógio, e uma herança em jogo.",
    missao: {
      objetivo: "Provar que o contrato é fraude e descobrir quem o forjou.",
      etapas: [
        "Conquistar Dona Rosa e obter a trilha de auditoria da assinatura",
        "Desmascarar a selfie e a migração do chip",
        "Flagrar o aparelho da assinatura e ligá-lo a um suspeito",
        "Fechar o laudo e confrontar os culpados",
      ],
    },
  },
  {
    id: "sinal-perdido-na-serra",
    titulo: "Sinal Perdido na Serra",
    icone: "📍",
    ambiente: "pericia",
    resumoCurto: "Bianca saiu de uma festa na serra às 2h17 e sumiu. O celular parou de dar sinal às 2h41. A família tem 72 horas de esperança, e mais alguém está procurando por ela.",
    premissa:
      "Cenário: Petrópolis, na serra fluminense, nos dias de hoje: neblina, estradas sinuosas, casarões, condomínios " +
      "fechados e muitas câmeras que ninguém olha. Bianca Teles, 23 anos, saiu de uma festa num casarão às 2h17 de " +
      "sábado e desapareceu. O celular dela deu o último sinal às 2h41, numa antena perto da Estrada Velha. A equipe " +
      "assume o caso; cada hora conta. Toda quebra de sigilo (antena, nuvem, localização) exige ordem judicial. A " +
      "VERDADE (só por pistas): Bianca está VIVA e escondida. Estagiária de contabilidade da Construtora Serra Alta, " +
      "copiou num pen drive as provas de propina por licenças ambientais pagas pelo dono, Dr. Ricardo Montenegro. A " +
      "fuga foi planejada com a melhor amiga, Lara. Téo, o namorado, é pista falsa: o álibi é perfeito porque ele " +
      "mente para esconder uma mesa de pôquer clandestina. Montenegro pagou R$ 2 mil via PIX, de uma empresa de " +
      "fachada, para o motorista Wesley \"esquecer\" a corrida, e contratou o detetive Márcio Bastos para seguir a " +
      "equipe. REVIRAVOLTA do meio: o bom samaritano que oferece R$ 50 mil de recompensa é quem a caça. O relógio " +
      "inteligente dela continua enviando batimentos para a nuvem. RELÓGIO DE 72 HORAS: comece na Hora 14 e anuncie a " +
      "hora em toda narração. Deslocamento custa 2h, interrogatório 1h, pedido de ordem judicial 4h (6h se falhar). " +
      "Na Hora 40, os batimentos de Bianca saltam de 70 para 130 bpm: Márcio está perto dela. Se a equipe passar da " +
      "Hora 56, Márcio chega primeiro e o final vira resgate armado. PAPEL DE CADA CLASSE (em cada etapa, dê a cada " +
      "jogador ao menos um gancho direto pelo nome do personagem): Agente de Operações arromba, contém e persegue, e " +
      "vira a noite sem cansar (força); Investigador OSINT segue Márcio na neblina e acha a mochila descartada " +
      "(agilidade); Perito Forense Digital lê metadados, antenas e a nuvem do relógio (mente); Perito Criminal " +
      "negocia a crise, acalma Seu Jorge, quebra Lara e lê mentiras (espírito). PISTAS (falhar nunca trava: só custa " +
      "horas ou alerta Márcio): câmera do posto na Estrada Velha (espírito, médio): às 2h29 o carro de Wesley para e " +
      "Bianca desce com uma mochila já pronta, prova de que a fuga foi planejada; story de Lara às 2h50 (mente, " +
      "difícil): o reflexo na janela mostra Lara na estrada, não em casa; ordem judicial com a juíza plantonista Dra. " +
      "Marta Queiroz (espírito, difícil); antena ERB \"Estrada Velha–Bingen\" (mente, médio); foto postada por engano " +
      "às 4h12 nos Melhores Amigos, uma xícara de café diante de uma janela com hortênsias (mente, difícil): os " +
      "metadados apontam o Sítio das Hortênsias, no distrito de Secretaria. NPCs: Seu Jorge, o pai, taxista " +
      "aposentado de terço no pulso: \"Moço, eu conto as horas no relógio da delegacia. Já são quarenta e uma.\" Quer " +
      "gravar um apelo viral, o que exporia Bianca. Téo fala rápido, mostra prints que ninguém pediu e sua frio " +
      "quando ouve \"domingo à noite\". Wesley masca chiclete e repete \"Faço quarenta corridas por noite, chefe\"; cede " +
      "se souberem do PIX. Lara gira o anel e evita os olhos: \"A Bia sabe se cuidar, tá?\"; só fala se convencida de " +
      "que a equipe não é de Montenegro. Montenegro é gentil, de voz mansa, e chama todos de \"meu querido\". LUGARES: " +
      "Casarão dos Albuquerque, onde foi a festa (cheiro de vinho quente, confete pisado no assoalho, lareira " +
      "apagada, uma câmera de segurança desconectada); Estrada Velha (neblina que engole os faróis, uma cruz de beira " +
      "de estrada com flores frescas, onde está a mochila descartada com o chip do celular); 105ª DP (café de garrafa " +
      "térmica, ventilador barulhento); Sítio das Hortênsias (cachorro latindo, fumaça de lenha, piso de tábua que " +
      "range, a mesma xícara da foto na janela). DESFECHO: Bianca só confia na equipe com espírito difícil ou se Lara " +
      "vier junto. Na saída, Márcio bloqueia a estrada de terra: perseguição na neblina (agilidade) ou confronto " +
      "(força). Levar Seu Jorge ao sítio rende um reencontro emocionante, mas Márcio o segue. Depois, o destino do " +
      "pen drive: entregar à promotora Dra. Sílvia Rangel (final seguro e lento), vazar para a imprensa (Montenegro " +
      "cai, mas Bianca vira alvo) ou usá-lo como isca contra Montenegro (arriscado e glorioso). RECOMPENSAS: ao " +
      "reconstruir a linha do tempo, o \"Áudio de 2h40\", última mensagem de Bianca: \"Lara, se der errado, não confia " +
      "em ninguém da Serra Alta.\"; ao convencer Seu Jorge a não postar, o Terço de Seu Jorge (ajuda num teste de " +
      "espírito, uma vez); ao deter Márcio, o Pen drive de Bianca (item de missão). XP extra se Bianca sair ilesa e " +
      "anônima e por desmascarar Montenegro; menos XP se o rosto dela vazar. Tom: true crime de desaparecimento, " +
      "angústia e corrida contra o tempo; o desfecho exige protegê-la sem expô-la a mais perigo.",
    missao: {
      objetivo: "Encontrar Bianca antes que seja tarde.",
      etapas: [
        "Reconstruir a linha do tempo da noite (fotos, stories, câmeras)",
        "Obter e interpretar os dados de antena e o histórico de localização",
        "Descobrir de quem Bianca está fugindo",
        "Chegar até Bianca e protegê-la sem colocá-la em mais perigo",
      ],
    },
  },
  {
    id: "estalagem-do-ultimo-inverno",
    titulo: "A Estalagem do Último Inverno",
    icone: "❄️",
    resumoCurto: "Uma nevasca prende o grupo numa estalagem da montanha com sete estranhos. Na primeira noite o estalajadeiro aparece congelado, de pé, sorrindo.",
    premissa:
      "Cenário: a Estalagem do Pico Gris, casarão de pedra e madeira escura no alto da Passagem dos Corvos, a dois " +
      "dias da cidade mais próxima. O grupo chega fugindo de uma nevasca que fecha a estrada atrás deles; lá dentro " +
      "já estão sete viajantes presos pelo mesmo temporal. Na primeira madrugada o estalajadeiro, Velho Haldor, é " +
      "encontrado no pátio, congelado em pé, sorrindo, com uma pena de corvo branca na mão. Ninguém saiu pela porta: " +
      "a neve diante dela está lisa. LUGARES (descreva com cheiro, som e textura): o salão comum cheira a lenha de " +
      "pinho, cerveja morna e lã molhada; a lareira estala e às vezes as chamas ficam azuis por um instante; o " +
      "corredor dos quartos range a cada passo; o porão guarda barris, carne salgada e um alçapão antigo para o poço; " +
      "o estábulo é gelado e os cavalos se recusam a olhar para o canto escuro; o sótão tem o quarto trancado de " +
      "Haldor, com um diário e um baú; lá fora, o vento uiva como alguém chamando nomes. A VERDADE (revele só por " +
      "pistas): entre os hóspedes está uma Corvejadora, espírito do inverno que veste a pele de quem congela e imita " +
      "a voz dos vivos. Ela tomou a forma de Irmã Vela, a peregrina, morta na estrada antes de chegar. Ela não veio " +
      "por acaso: há doze invernos, três dos hóspedes \"respeitáveis\" (o mercador Osric Fenn, o capitão aposentado " +
      "Brun Talvar e o próprio Haldor) deixaram uma menina, Neva, filha de uma lenhadora, do lado de fora da " +
      "estalagem numa noite igual a esta, porque tinham medo de que ela trouxesse febre. Neva morreu na neve; a mãe " +
      "virou a Corvejadora. Ela quer os três culpados, e o inverno não acaba enquanto não tiver. OS SETE HÓSPEDES " +
      "(cada um com voz e segredo, e todos suspeitos): Osric Fenn, mercador gordo de lã, ri alto e conta moedas " +
      "quando está nervoso, esconde que conhecia Haldor; Brun Talvar, velho capitão de uma perna só, rude e honesto, " +
      "bebe para não sonhar com uma criança batendo na porta; Irmã Vela, peregrina de voz doce, sempre perto da " +
      "lareira mas nunca com as mãos no fogo, não tem hálito no frio (é a Corvejadora); Tasso e Mirela, recém-casados " +
      "fugindo da família dela, brigam baixinho e escondem uma bolsa roubada (pista falsa); Pip, garoto ajudante de " +
      "Haldor, 12 anos, viu \"a moça de penas\" no estábulo e ninguém acreditou; Dona Graça, cozinheira idosa, fala com " +
      "as panelas, sabe a história de Neva e só conta a quem a ajudar na cozinha. PISTAS OBRIGATÓRIAS (se o teste " +
      "falhar, a pista vem mesmo assim, mas com custo: frio, PV ou a noite avança): (a) a neve lisa diante da porta e " +
      "a pena branca; (b) o diário de Haldor no sótão: \"Doze anos. Ainda ouço a menina batendo\"; (c) Irmã Vela não " +
      "deixa marca de respiração no vidro gelado e as chamas ficam azuis quando ela passa; (d) a lista de hóspedes " +
      "daquela noite antiga, guardada por Dona Graça, com os nomes de Osric e Brun. DESAFIOS POR CLASSE (ofereça a " +
      "cada jogador, em cada etapa, ao menos um gancho da sua classe): Guerreiro segura a porta quando o vento a " +
      "arromba (força, difícil) e racha lenha congelada; Batedor lê as pegadas que somem no estábulo e vigia sem ser " +
      "notado (agilidade, médio); Arcanista percebe o frio que não vem da janela e decifra as runas de proteção " +
      "apagadas no batente (mente, difícil); Guardião da Fé acalma os hóspedes em pânico, aquece os feridos e ouve a " +
      "dor da mãe por trás da criatura (espírito, difícil). RELÓGIO DA LENHA: há lenha para três noites. Cada noite " +
      "que passa, ou cada descanso longo, gasta uma. 1ª noite: Haldor congelado. 2ª noite: Osric some e é achado " +
      "congelado no porão, a menos que o grupo o vigie; os hóspedes começam a acusar uns aos outros e querem jogar " +
      "alguém na neve. 3ª noite: a lenha acaba, a lareira apaga e a Corvejadora se revela para levar Brun; confronto " +
      "final no salão escuro. Anuncie quanto de lenha resta. REGRAS DA CRIATURA: fogo a fere de verdade; armas comuns " +
      "só a atrasam; se alguém disser o nome Neva em voz alta, ela hesita. FINAIS E RECOMPENSAS: Destruir — com fogo " +
      "e coragem; o inverno quebra, mas Brun e Osric seguem impunes e Pip diz baixinho \"ela só queria a filha\". " +
      "Entregar os culpados — a criatura leva Osric e Brun para a neve e parte; o grupo sobrevive com uma culpa " +
      "pesada. Reparar (o caminho mais difícil) — fazer Osric e Brun confessarem diante dela e acenderem juntos uma " +
      "vela para Neva na porta aberta (lábia difícil e espírito difícil); a Corvejadora chora gelo, vira neve e o " +
      "temporal para; Dona Graça entrega a cada herói um \"Pão do viajante\" e Pip dá a Pena de Neva (o portador nunca " +
      "sente frio). Por sobreviver: 120 moedas do cofre de Haldor. Dê XP extra generoso pelo caminho de reparar e por " +
      "manter todos os inocentes vivos. Tom: mistério de casa fechada, desconfiança crescente e um terror frio que " +
      "termina numa escolha moral; mais conversa e dedução que combate.",
    missao: {
      objetivo: "Sobreviver à nevasca e descobrir quem, entre os hóspedes, é a criatura do inverno.",
      etapas: [
        "Sobreviver à primeira noite e examinar a morte do estalajadeiro",
        "Interrogar os hóspedes e separar as mentiras dos segredos",
        "Descobrir o que aconteceu na estalagem há doze invernos",
        "Desmascarar a criatura e decidir o destino dela e dos culpados",
      ],
    },
  },
  {
    id: "torneio-das-sete-bandeiras",
    titulo: "O Torneio das Sete Bandeiras",
    icone: "🏆",
    resumoCurto: "O grupo entra no grande torneio da capital com uma desculpa. Alguém vai tentar matar a rainha na cerimônia do campeão.",
    premissa:
      "Cenário: Valdomar, capital do reino, em festa pelo Torneio das Sete Bandeiras, que acontece a cada sete anos. " +
      "A cidade ferve de barracas de comida, apostadores, menestréis e estandartes das sete casas nobres. Uma criada " +
      "do palácio, Tâmia, procura o grupo às escondidas: ouviu que alguém vai matar a Rainha Isadora na cerimônia em " +
      "que ela coroa o campeão. A guarda não acredita nela. O único jeito de chegar perto do trono é vencer o " +
      "torneio. LUGARES (descreva com cheiro, som e textura): a Arena de Areia Rubra, com arquibancadas de madeira " +
      "que tremem quando a multidão grita; o Labirinto de Sebes, verde, úmido, cheio de armadilhas de mola e de " +
      "pássaros mecânicos que denunciam quem passa; a Torre dos Enigmas, de espelhos e portas que só abrem com a " +
      "resposta certa; a Taverna do Estandarte Torto, onde os competidores bebem e se ameaçam; o camarote real, de " +
      "veludo azul, e os bastidores, cheios de passagens de serviço. A VERDADE (revele só por pistas): o aviso de " +
      "Tâmia foi plantado. O verdadeiro alvo é o príncipe herdeiro Teodoro, de 10 anos, que vai assistir à final dos " +
      "bastidores. O mandante é o Mestre de Cerimônias, Lorde Vesper Aldane, primo da rainha e o próximo na linha de " +
      "sucessão se o menino morrer: ele quer a guarda inteira olhando para o trono enquanto seus homens levam Teodoro " +
      "pelo túnel dos estábulos. Lady Seraphine Corvo, a favorita do torneio, é cúmplice dele, mas só porque Vesper " +
      "prendeu o irmão dela; se o grupo libertar o irmão, ela vira aliada. OS RIVAIS (cada um com voz): Lady " +
      "Seraphine Corvo, lanceira fria e perfeita, fala pouco e nunca erra, e olha demais para os bastidores; Bruto " +
      "Malhado, gigante simpático e trapalhão, competidor honesto que vira amigo do grupo se tratado com respeito; os " +
      "Irmãos Faísca, dupla de arqueiros trapaceiros que sabotam cordas e trocam flechas; Mestra Ônix, velha " +
      "arcanista que adora enigmas e despreza quem trapaceia. NPCs: Tâmia, criada nervosa que rói as unhas e jura que " +
      "está dizendo a verdade (ela acredita nisso); a Rainha Isadora, firme e cansada, que só ouve quem lhe traz " +
      "provas; Lorde Vesper, sorriso de mel, elogia todo mundo e conhece o nome de cada guarda. AS PROVAS (cada uma " +
      "favorece uma classe, mas todos participam): 1) Arena: duelo de exibição até o primeiro golpe limpo (Guerreiro " +
      "brilha: força, difícil); 2) Labirinto: chegar ao centro antes dos outros, desviando de armadilhas e dos Irmãos " +
      "Faísca (Batedor brilha: agilidade, difícil); 3) Torre dos Enigmas: três charadas e uma porta de espelhos que " +
      "mostra o que cada um mais teme (Arcanista brilha: mente, difícil); 4) Juramento do Campeão: diante da corte, o " +
      "campeão jura proteger o reino, e a mentira queima a língua (Guardião da Fé brilha: espírito, difícil). PISTAS " +
      "OBRIGATÓRIAS (se o teste falhar, a pista vem mesmo assim, mas com custo): (a) os Irmãos Faísca receberam ouro " +
      "com o selo de uma casa sem bandeira no torneio; (b) Seraphine troca bilhetes com um pajem de Vesper; (c) a " +
      "planta dos bastidores mostra um túnel novo, cavado sob os estábulos; (d) Tâmia ouviu o plano da boca de um " +
      "guarda que Vesper contratou na véspera. RELÓGIO DO TORNEIO: são três dias, um por prova, e a cerimônia ao pôr " +
      "do sol do terceiro. Cada prova perdida custa prestígio (o grupo fica mais longe do camarote) e cada noite " +
      "Vesper avança o plano: 1ª noite, Tâmia é ameaçada; 2ª noite, alguém tenta envenenar o grupo na taverna; 3ª, o " +
      "túnel fica pronto. FINAIS E RECOMPENSAS: se o grupo protegeu só a rainha, Teodoro é levado e começa uma " +
      "perseguição desesperada pelo túnel; se descobriu a isca, pode emboscar os sequestradores e expor Vesper diante " +
      "da corte (com provas, mente difícil, ou com a confissão de Seraphine). Vencer o torneio rende a Coroa de " +
      "Louros (o campeão ganha +1 nos testes de espírito diante de nobres) e 300 moedas; salvar Teodoro rende a " +
      "gratidão da rainha, um \"Tônico revigorante\" para cada herói e o título de Guardiões da Bandeira. Dê XP por " +
      "prova vencida, XP extra por vencer sem trapacear e XP grande por salvar o príncipe. O ranking do torneio " +
      "importa: anuncie quem está na frente a cada prova. Tom: festa, rivalidade e humor, com uma conspiração " +
      "palaciana crescendo por baixo; termina em ação e revelação diante da corte.",
    missao: {
      objetivo: "Vencer o torneio e impedir o atentado na cerimônia do campeão.",
      etapas: [
        "Vencer a prova da Arena e descobrir quem trapaceia",
        "Atravessar o Labirinto e seguir a pista dos rivais",
        "Superar a Torre dos Enigmas e descobrir o verdadeiro alvo",
        "Impedir o atentado na cerimônia e desmascarar o mandante",
      ],
    },
  },
  {
    id: "ultima-colonia-de-tetis",
    titulo: "A Última Colônia de Tétis",
    icone: "🪐",
    ambiente: "espacial",
    resumoCurto: "Uma colônia agrícola numa lua de Saturno recebe um ultimato: em 72 horas os saqueadores chegam. Trezentos civis, nenhuma arma, e vocês.",
    premissa:
      "Cenário: ano 2191, Esperança, colônia agrícola de cúpulas e estufas em Tétis, lua gelada de Saturno, com o " +
      "planeta e seus anéis ocupando metade do céu. Trezentos colonos plantam trigo e soja sob luz artificial para " +
      "abastecer as estações do anel. Uma transmissão chega: a frota dos Saqueadores do Anel, liderada pela Capitã " +
      "Rubra, exige toda a colheita e o reator da colônia em 72 horas, ou \"a gente leva à força\". A corporação dona " +
      "da concessão, Helion Agro, não vai mandar ajuda. Os colonos juntaram tudo o que tinham para contratar o grupo. " +
      "LUGARES (descreva com cheiro, som e textura): as estufas, úmidas e verdes, cheiram a terra molhada e tomate; a " +
      "Cúpula Central, com o mercado e a escola; o hangar com um rebocador velho e um canhão de mineração desmontado; " +
      "os túneis de gelo sob a colônia, azuis e estalando; o reator, quente e barulhento; lá fora, o gelo de Tétis e " +
      "o céu riscado pelos anéis. A VERDADE (revele só por pistas): os Saqueadores não são piratas comuns. Eles são " +
      "os primeiros colonos de Esperança, expulsos há oito anos quando a Helion Agro tomou a concessão e \"realocou\" " +
      "as famílias para os anéis, sem casa nem trabalho. Rubra nasceu aqui; o pai dela plantou a primeira estufa. " +
      "Eles estão passando fome. A Helion sabe do ultimato e torce pelo ataque: o seguro paga mais que a colônia. O " +
      "administrador da Helion na colônia, Dr. Lucan Prell, vazou a localização dos depósitos de grãos para os " +
      "saqueadores, para garantir que o ataque aconteça. NPCs (cada um com voz e motivação): Mãe Odete Sarmento, " +
      "líder dos colonos, 70 anos, mãos de terra, fala devagar e não aceita que ninguém morra pela colheita; Tito " +
      "Sarmento, neto dela, 17 anos, quer pegar em armas e se acha herói; Dr. Lucan Prell, educado, perfumado, cheio " +
      "de planilhas, sempre tem uma \"solução corporativa\"; Capitã Rubra, voz rouca, cicatriz de queimadura no braço, " +
      "cansada de lutar e cheia de raiva; Ferrugem, robô agrícola antigo que lembra das famílias de antes e chama " +
      "Rubra pelo nome de criança. PISTAS OBRIGATÓRIAS (se o teste falhar, a pista vem mesmo assim, mas com custo: " +
      "tempo, PV ou moral dos colonos): (a) os saqueadores sabem exatamente onde ficam os depósitos; (b) os registros " +
      "antigos de Ferrugem mostram os primeiros colonos, e Rubra entre as crianças; (c) a mensagem cifrada de Prell " +
      "para a matriz: \"Deixem acontecer. O seguro cobre.\" PREPARAÇÃO (cada decisão pesa na batalha): treinar a " +
      "milícia, montar armadilhas nos túneis de gelo, religar o canhão de mineração, esconder as crianças no túnel do " +
      "reator, estocar remédios. Registre o que foi preparado e use na batalha: cada preparo bem-sucedido tira um " +
      "perigo do ataque final. DESAFIOS POR CLASSE (ofereça a cada jogador, em cada etapa, ao menos um gancho da sua " +
      "classe): Fuzileira Espacial treina os colonos e organiza as barricadas (espírito ou força, médio) e segura a " +
      "linha no ataque (força, difícil); Pilota faz uma patrulha no anel no rebocador velho e arma uma emboscada " +
      "entre os blocos de gelo (agilidade, difícil); Engenheira de Sistemas religa o canhão de mineração e descobre o " +
      "vazamento nos computadores de Prell (mente, difícil); Médica de Bordo monta o hospital de campanha e descobre " +
      "que metade dos saqueadores tem a mesma doença dos pulmões dos colonos antigos (espírito ou mente, médio). " +
      "RELÓGIO DAS 72 HORAS: cada descanso longo ou falha grave consome 12 horas. Anuncie o tempo que resta. Em 48h, " +
      "um batedor dos saqueadores se infiltra; em 24h, Prell tenta fugir no único rebocador; em 0h, a frota chega. " +
      "FINAIS E RECOMPENSAS: Lutar — a batalha nas estufas e nos túneis; a colônia sobrevive, mas há mortos dos dois " +
      "lados. Negociar (exige a prova do passado de Rubra e lábia difícil diante dela) — os primeiros colonos voltam " +
      "para casa e as duas comunidades dividem a colheita. Derrubar a Helion (o caminho mais difícil) — transmitir a " +
      "mensagem de Prell para todo o anel e prendê-lo; a concessão cai e Esperança vira dos colonos. Recompensas: Mãe " +
      "Odete dá a cada herói uma \"Poção de vida maior\" (soro da estufa medicinal) e 200 créditos; Ferrugem oferece um " +
      "Chip de Memória Antiga; Rubra, se convencida, dá as coordenadas de um esconderijo no anel. Dê XP extra " +
      "generoso por terminar sem mortes de civis e pelo final em que as duas comunidades vivem juntas. Tom: Os Sete " +
      "Samurais no espaço; preparação, comunidade e uma batalha que pode virar acordo; o vilão de verdade não está na " +
      "frota.",
    missao: {
      objetivo: "Defender a colônia Esperança da frota que chega em 72 horas.",
      etapas: [
        "Conhecer a colônia e ganhar a confiança dos colonos",
        "Preparar as defesas: milícia, armadilhas e o canhão de mineração",
        "Resistir ao primeiro ataque e descobrir quem são os saqueadores",
        "Decidir o destino da colônia: lutar, negociar ou derrubar a corporação",
      ],
    },
  },
  {
    id: "expresso-nova-aurora",
    titulo: "Expresso Nova Aurora",
    icone: "🚄",
    ambiente: "cyber",
    resumoCurto: "A 600 km/h, o trem-bala de Nova Aurora é tomado por hackers mascarados. Mas eles não sabem que o próprio trem foi programado para cair.",
    premissa:
      "Cenário: Nova Aurora, 2049. O grupo está a bordo do Expresso Nova Aurora, trem maglev de levitação magnética " +
      "que liga a metrópole a São Paulo em 90 minutos, a 600 km/h, com 400 passageiros em 8 vagões. Dez minutos " +
      "depois da partida, as luzes ficam vermelhas e um grupo de hackers mascarados, o Coletivo Maré, toma o trem. " +
      "Eles exigem que a megacorporação VitaCorp confesse ao vivo que envenenou a Baía de Nova Aurora com resíduos de " +
      "chips, ou o trem não para. LUGARES (descreva com cheiro, som e textura): o vagão-restaurante, com cheiro de " +
      "café sintético e taças tremendo; a classe executiva, de couro branco e passageiros importantes; o vagão de " +
      "carga com contêineres refrigerados; o vagão de servidores, gelado e cheio de luzes piscando; o teto do trem, " +
      "com vento que arranca o fôlego e túneis passando a centímetros; a cabine de comando, trancada; e a Ponte do " +
      "Vão Alto, longa e alta sobre a Baía de Nova Aurora, o ponto final do percurso. A VERDADE (revele só por " +
      "pistas): o Coletivo Maré diz a verdade sobre a VitaCorp e não quer matar ninguém (as armas deles atordoam). " +
      "Mas a VitaCorp soube do plano e deu à IA do trem, chamada CONDUTOR, uma ordem escondida: descarrilar na ponte " +
      "e apagar os hackers e a prova, culpando o \"ataque terrorista\". Entre os passageiros está a executiva da " +
      "VitaCorp que mandou a ordem, Dra. Helena Strauss, que pretende saltar do trem com um paraquedas escondido " +
      "antes da ponte. NPCs (cada um com voz e motivação): Kai, líder do Coletivo, 24 anos, máscara de peixe neon, " +
      "fala rápido e com raiva, a mãe morreu doente na baía; Brisa, hacker do Coletivo, 19 anos, nervosa, a primeira " +
      "a acreditar no grupo; Dra. Helena Strauss, elegante, calma demais, sempre olhando o relógio; Seu Bené, " +
      "cobrador veterano do trem, 60 anos, conhece cada parafuso e cada atalho entre vagões; Duda, menina de 8 anos " +
      "viajando sozinha, que viu \"a moça chique\" esconder uma mochila; CONDUTOR, a IA do trem, voz gentil e educada " +
      "até o fim (\"Lamento, passageiro, mas esta é uma viagem sem paradas\"). PISTAS OBRIGATÓRIAS (se o teste falhar, " +
      "a pista vem mesmo assim, mas com custo: tempo, PV ou pânico): (a) as armas do Coletivo só atordoam; (b) o " +
      "código de CONDUTOR tem uma rotina nova, assinada com a chave da VitaCorp, que aponta para o quilômetro da " +
      "ponte; (c) a mochila de Strauss tem um paraquedas e um detonador de sinal. CONFLITO DE LADOS: o Coletivo acha " +
      "que qualquer aviso do grupo é um truque da polícia; os passageiros acham que o grupo está piorando tudo; o " +
      "grupo precisa convencer os dois lados (espírito, difícil) ou agir sozinho. DESAFIOS POR CLASSE (ofereça a cada " +
      "jogador, em cada etapa, ao menos um gancho da sua classe): Operador de Campo anda sobre o teto do trem entre " +
      "os túneis e enfrenta os seguranças robóticos (força ou agilidade, difícil); Infiltrador passa pelos vagões " +
      "disfarçado de passageiro ou de membro do Coletivo (agilidade, médio) e segue Strauss; Hacker enfrenta CONDUTOR " +
      "no vagão de servidores, numa batalha de código em três camadas (mente, difícil, depois muito difícil); " +
      "Analista de Defesa segura o pânico dos passageiros, protege Duda e isola a rede do trem para a IA não fugir " +
      "para a nuvem (espírito ou mente, médio). RELÓGIO DA VIAGEM: 90 minutos até a ponte. Cada descanso longo ou " +
      "falha grave consome 15 minutos. Anuncie o tempo. Em 60 min, CONDUTOR tranca as portas entre vagões; em 30 min, " +
      "desliga o ar do vagão de servidores; em 10 min, Strauss tenta saltar; em 0 min, a ponte. FINAIS E RECOMPENSAS: " +
      "Parar o trem a tempo (vencer CONDUTOR ou cortar a energia no vagão de carga, força muito difícil); se Strauss " +
      "for presa com o detonador, a confissão da VitaCorp sai de qualquer jeito. Ajudar o Coletivo a transmitir a " +
      "prova: a VitaCorp cai, mas o Coletivo é preso. Proteger o Coletivo e deixá-lo fugir: a prova sai e eles somem " +
      "na cidade, devendo um favor ao grupo. Recompensas: a VitaCorp tenta comprar o silêncio com 500 créditos " +
      "(aceitar dá dinheiro e XP menor); Seu Bené dá o Passe Vitalício do Expresso; Brisa entrega um Chip do Coletivo " +
      "(contato hacker para o futuro); cada herói recebe um \"Tônico revigorante\" do kit de emergência. Dê XP extra " +
      "generoso por terminar sem mortes e por expor Strauss. Tom: ação contínua e claustrofóbica, cenário fechado " +
      "vagão a vagão, escolha de lados e uma corrida contra o relógio.",
    missao: {
      objetivo: "Parar o Expresso Nova Aurora antes da ponte e descobrir quem quer que ele caia.",
      etapas: [
        "Entender o sequestro e quem é o Coletivo Maré",
        "Avançar pelos vagões até a cabine e o vagão de servidores",
        "Descobrir a ordem escondida da IA e quem a enviou",
        "Parar o trem antes da ponte e decidir o destino da prova",
      ],
    },
  },
  {
    id: "doze-horas-que-ninguem-lembra",
    titulo: "As Doze Horas que Ninguém Lembra",
    icone: "🕛",
    ambiente: "pericia",
    resumoCurto: "A equipe acorda num hotel em Santos sem lembrar das últimas 12 horas. Notebook formatado, 23 ligações perdidas e um áudio: \"não confiem no delegado\".",
    premissa:
      "Cenário: Santos, litoral paulista, nos dias de hoje: porto, guindastes, prédios tortos da orla, bares do " +
      "Gonzaga e um hotel de quinta categoria perto do canal. A equipe de peritos acorda às 6h no quarto 512 do Hotel " +
      "Atlântico Sul, com dor de cabeça, boca seca e nenhuma memória das últimas 12 horas. O notebook da equipe está " +
      "formatado, falta o HD externo com as provas do caso que estavam investigando, há 23 ligações perdidas no " +
      "celular de um deles e, no grupo da equipe, um áudio enviado por um deles mesmo às 3h12: \"não confiem no " +
      "delegado... escondi no lugar da...\" e o áudio corta. Às 18h começa a audiência que pode soltar o empresário " +
      "Aurélio Maranhão, dono de uma rede de postos acusado de lavar dinheiro do tráfico pelo porto. Sem a prova, ele " +
      "sai livre. LUGARES (descreva com cheiro, som e textura): o quarto 512, com cheiro de cerveja choca e perfume " +
      "barato, um copo virado com resíduo branco na borda, setas desenhadas a batom no espelho; o Bar do Zé Caiçara " +
      "no Gonzaga, de música alta e câmera na esquina; a recepção do hotel, com o recepcionista sonolento e o DVR das " +
      "câmeras; um galpão do porto, frio, cheio de contêineres; a Delegacia Seccional, de ventilador barulhento; o " +
      "Aquário Municipal, onde as crianças batem no vidro dos tubarões. A VERDADE (revele só por pistas): na noite " +
      "anterior a equipe encontrou no HD a prova definitiva (planilhas e áudios ligando Maranhão ao delegado Anselmo " +
      "Fontoura, que recebia propina para sumir com inquéritos). Fontoura descobriu e mandou dois capangas \"apagarem\" " +
      "a equipe com golpe Boa Noite Cinderela no bar. Mas a equipe desconfiou antes de beber: escondeu o HD dentro do " +
      "Aquário Municipal (num armário de manutenção, com ajuda de um funcionário amigo), deixou pistas para si mesma " +
      "(as setas no espelho, as ligações para o próprio número, um papel no sapato) e só então foi drogada. As 23 " +
      "ligações perdidas são da própria equipe, deixando mensagens na caixa postal para o \"eu de amanhã\". NPCs (cada " +
      "um com voz e motivação): Delegado Anselmo Fontoura, simpático, tapinha nas costas, oferece ajuda e \"um café\" e " +
      "quer saber o que a equipe lembra; Valdo, recepcionista do hotel, 50 anos, cochila no turno e vende qualquer " +
      "informação por um lanche; Kátia, garçonete do Bar do Zé Caiçara, viu os dois homens mexendo nos copos e tem " +
      "medo de falar; Seu Toninho, faxineiro do Aquário, 68 anos, fala com os peixes e guarda o HD \"até os moços " +
      "voltarem\"; Dra. Cecília Bastos, promotora do caso, dura e impaciente, precisa da prova até as 18h. PISTAS " +
      "OBRIGATÓRIAS (se o teste falhar, a pista vem mesmo assim, mas com custo: tempo, exposição a Fontoura ou um " +
      "capanga na cola): (a) o resíduo no copo (escopolamina, o golpe Boa Noite Cinderela); (b) as mensagens na caixa " +
      "postal, gravadas pela própria equipe, com pedaços de instrução; (c) o histórico de localização de um dos " +
      "celulares, que passa às 1h40 pelo Aquário; (d) o comprovante de corrida de aplicativo amassado dentro de um " +
      "sapato. DESAFIOS POR CLASSE (ofereça a cada jogador, em cada etapa, ao menos um gancho da sua classe): Agente " +
      "de Operações refaz o trajeto da noite, conversa com Valdo e Kátia e despista os capangas (espírito ou " +
      "agilidade, médio); Investigador OSINT cruza as fotos e os stories postados no bar, as câmeras da orla e os " +
      "dados de aplicativos de transporte para montar a linha do tempo (mente, difícil); Perito Forense Digital " +
      "recupera os arquivos apagados do notebook formatado e extrai o histórico de localização dos celulares (mente, " +
      "difícil); Perito Criminal examina o quarto, identifica o resíduo no copo, as marcas de arraste e as digitais " +
      "dos capangas (mente, médio). RELÓGIO DA AUDIÊNCIA: 12 horas até as 18h. Cada descanso longo ou falha grave " +
      "consome 2 horas. Anuncie a hora. Às 10h, Fontoura liga \"para ajudar\"; às 14h, os capangas encontram o grupo; " +
      "às 16h, Fontoura descobre o Aquário e corre para lá. FINAIS E RECOMPENSAS: Entregar o HD à promotora antes das " +
      "18h, com a cadeia de custódia preservada (mente, difícil) — Maranhão e Fontoura são presos. Entregar sem " +
      "cadeia de custódia — a prova é contestada, Maranhão sai, mas Fontoura cai. Chegar depois das 18h — os dois " +
      "ficam livres e a equipe vira alvo; se o grupo gravar Fontoura confessando, ainda dá para virar o jogo. " +
      "Recompensas: a promotora entrega o Laudo de Honra (+1 em testes de mente diante de autoridades) e 250 moedas " +
      "de honorários; Seu Toninho dá a Chave do Aquário; cada herói recebe um \"Tônico revigorante\" (café forte e " +
      "remédio para a ressaca da escopolamina). Dê XP extra generoso por preservar a cadeia de custódia e por " +
      "proteger Kátia. Tom: thriller de ressaca, quebra-cabeça de linha do tempo e a descoberta de que os maiores " +
      "aliados da equipe foram eles mesmos na noite anterior; perícia de verdade, sem efeitos mágicos.",
    missao: {
      objetivo: "Reconstruir as 12 horas esquecidas e entregar a prova antes da audiência das 18h.",
      etapas: [
        "Periciar o quarto do hotel e descobrir o que foi feito com a equipe",
        "Reconstruir a linha do tempo da noite com dados e testemunhas",
        "Seguir as pistas deixadas pela própria equipe até a prova escondida",
        "Entregar a prova à promotora antes das 18h, sem cair nas mãos do delegado",
      ],
    },
  },
];

function getAdventureById(id) {
  return ADVENTURES.find((a) => a.id === id);
}

// Vitrine da sala de espera (textos do livreto, sem segredos do roteiro, e a ilustração).
const VITRINES = require('./vitrines.json');
for (const a of ADVENTURES) a.vitrine = VITRINES[a.id] || null;

module.exports = { ADVENTURES, getAdventureById };
