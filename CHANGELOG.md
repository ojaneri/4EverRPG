# Changelog

Versões do 4Ever (versionamento semântico). Cada versão tem uma tag `vX.Y.Z` no git.














## v0.19.2 — 2026-11-14
- **Monitor do gateway sem alarme falso:** uma sonda que responde 429 (gateway ocupado), 502/503/504 ou fica sem conexão não conta mais como mudança. Ela mantém a última situação firme, então não sai e-mail nem na hora do 429 nem na volta para o normal. Na madrugada de 14/11 foram 3 e-mails de "o gateway mudou" só por causa disso.
- Pelo mesmo motivo, um 429 no modelo de imagem ativo não faz mais o monitor tentar trocar de modelo.
- Modelos que entram ou saem da lista e sondas que mudam de verdade (ex.: indisponível → liberado) continuam avisando.
- Testes: `tools/teste_monitor.js` (6 verificações), incluído na bateria.

## v0.19.1 — 2026-11-14
- **Mestre em streaming:** as chamadas à IA agora usam `stream: true` (SSE). O gateway sixtysix corta respostas sem streaming que passam de ~30s (HTTP 504), o que acontecia nos dias de gateway lento. A resposta continua sendo montada inteira antes de ir para a mesa; se o gateway ignorar o stream, o JSON comum segue funcionando. `RPG_AI_STREAM=0` desliga.
- Tempo máximo de espera pela IA passou de 60s para 120s (`RPG_AI_TIMEOUT_MS`), porque com streaming a resposta não é mais cortada pelo gateway.
- Erro no meio do stream conta como falha temporária: tenta de novo e, na última tentativa, usa o modelo reserva.
- **Ilustrações com gpt-image:** `response_format` só é enviado para modelos que o aceitam. Os `gpt-image-2.6-flare` e `gpt-image-2.6-sunburst` recusavam o pedido (HTTP 400), então, se o monitor ativasse um deles, todas as ilustrações falhariam.
- Testes: `tools/teste_ia_stream.js` (leitor de SSE/JSON e regra do response_format, 8 verificações); o Mestre simulado responde em SSE quando recebe `stream: true` e recusa `response_format` nos gpt-image, como o gateway real; a bateria confere que o Mestre chamou a IA em streaming.

## v0.19.0 — 2026-11-14
- **As 12 histórias reescritas** a partir de uma análise de cada uma feita pelo próprio modelo do Mestre (fable), com as melhorias aprovadas: lugares com cheiro, som e textura; o segredo de cada história definido e revelado só por pistas (com custo quando o teste falha, sem travar); NPCs com nome, fala e motivação; um desafio para cada classe em cada etapa; um relógio de pressão anunciado na narração (badaladas, marés, horas, barris de água, períodos até o júri, dinheiro sacado); finais com escolha e consequência; recompensas com nome.
- Testes e recompensas usam o sistema do jogo (força, agilidade, mente, espírito; fácil, médio, difícil, muito difícil). Nomes repetidos entre histórias foram trocados.
- Correções de enredo: em Sertão de Ferro, o trem tomado era o primeiro e o grupo escolta a última peça; na Estação Órion-7, o segredo da criogenia ficou coerente; em Sinal Perdido na Serra, o segredo deixou de ficar "em aberto".
- Etapas da missão reescritas onde entregavam o segredo na tela (Boitatá, Cyber, Contrato). Vitrines do Boitatá e de Sinal Perdido ganharam uma frase de gancho.
- Mesas já criadas mantêm a premissa antiga; as novas mesas usam as novas.

## v0.18.0 — 2026-11-13
- **Ilustração automática a cada lugar novo:** quando a cena muda de local e o Mestre não pediu imagem, o jogo ilustra o lugar sozinho, desde que a última ilustração tenha mais de 4 minutos (`RPG_IMG_AUTO_MS`). Antes procura na biblioteca uma imagem do mesmo lugar da mesma aventura (sai na hora, sem custo). Continuam valendo o limite de 12 imagens por mesa e o intervalo de 3 minutos entre gerações.
- **Instrução do Mestre:** em vez de "de vez em quando, no máximo uma a cada várias cenas", pede ilustração sempre que o grupo chegar a um lugar novo, começar um combate ou viver um momento visual marcante. A lista de imagens prontas não desencoraja mais pedir uma nova quando nenhuma serve.
- Testes: 2 verificações novas (lugar novo ilustrado sozinho; outra partida reaproveita a imagem do lugar).
## v0.17.6 — 2026-11-13
- **Falas do jogador também na narração:** quando o Mestre repete a fala que o jogador escreveu na ação, ela aparece em destaque na cor desse personagem. A comparação ignora acentos, pontuação, maiúsculas e letras esticadas ("frenteeeee"). Falas dos personagens do Mestre continuam em itálico normal.
- Falas com itálico ou negrito dentro ou fora das aspas (`"*fala*"` e `*"fala"*`) também são reconhecidas.
## v0.17.5 — 2026-11-13
- Falas em destaque também com aspas simples ('...' e ‘...’), comuns nas ações dos bots. Apóstrofos como "d'água", "d'olho" e "rock'n'roll" continuam como texto normal.
## v0.17.4 — 2026-11-13
- **Falas em destaque:** nas ações dos jogadores (e dos bots), o que está entre aspas ("...", “...” ou «...») aparece como diálogo de livro: negrito serifado na cor do personagem, com aspas curvas. Só muda a tela; o texto enviado ao Mestre e o diário continuam iguais.
- Teste de navegador `tools/teste_falas.py`.
## v0.17.3 — 2026-11-13
- Cutucada mais forte para quem recebe: a tela toda treme por 3 s (com vibração mais longa no celular) e, logo a seguir, o cartão de quem cutucou balança com 👉 por 5 s. Quem cutucou continua vendo só o cartão do outro balançando.
## v0.17.2 — 2026-11-13
- Balão "⬇ N novas": quando a conexão volta (queda de internet ou reinício do servidor) e o log é redesenhado, quem estava lendo lá em cima continua no mesmo ponto, e o balão mostra as mensagens que chegaram. Antes pulava para o fim.
## v0.17.1 — 2026-11-13
- **Mensagens novas sem puxar quem está lendo:** no log da mesa e no Chat, quem rolou para cima não é mais levado para o fim quando chega mensagem. Aparece um botão "⬇ N novas" no rodapé da lista; o clique desce até a última. Quem já está no fim continua acompanhando, e quem manda uma mensagem vai para o fim.
- Teste de navegador `tools/teste_mensagens_novas.py`.
## v0.17.0 — 2026-11-13
- **Biblioteca de ilustrações compartilhada entre partidas:** toda imagem gerada vai para `data/imagens/biblioteca/<ambiente>/` com nome fácil de lembrar (ex.: `as-sombras-de-corvile--vila-de-corvile.jpg`, `as-sombras-de-corvile--uma-criatura-de-nevoa-ergue-as-garras.jpg`) e entra no índice com aventura, lugar e descrição.
- **Antes de gerar, o jogo procura na biblioteca:** a abertura automática reaproveita a imagem da mesma aventura e do mesmo lugar; um pedido do Mestre reaproveita uma imagem de descrição parecida (limiar em `RPG_IMG_LIMIAR_REUSO`, padrão 0,5). Reaproveitar não gasta nada e não conta no limite de imagens da mesa.
- **O Mestre vê a lista das imagens prontas** do ambiente (as da mesma aventura primeiro) e pode pedir uma direto com `[IMAGEM: usar <nome>]`. Só descreve uma nova se nenhuma servir.
- Apagar uma mesa não apaga as imagens da biblioteca.
- `tools/migrar_imagens.js` copia para a biblioteca as imagens geradas antes (os originais ficam).
- Testes: 5 verificações novas (nome legível, reuso da abertura e da descrição sem gerar, cache longo, caminho malicioso).
## v0.16.0 — 2026-11-13
- **Cutucada:** clicar no cartão de outro jogador (painel do grupo) cutuca a pessoa. Quem cutucou vê o cartão do outro balançando com 👉 por 5 s; quem foi cutucado vê o cartão de quem cutucou balançando, recebe o aviso "Fulano cutucou você!" e o celular vibra.
- Limite: cada jogador cutuca uma pessoa por rodada completa. Não dá para cutucar a si mesmo, bots ou quem está offline.
- Testes: 6 verificações novas no servidor e `tools/teste_cutucada.py` no navegador.
## v0.15.1 — 2026-11-13
- Avisos curtos do sistema em sequência (XP, moedas, itens...) aparecem lado a lado numa faixa, quebrando linha só quando não cabem, em vez de um embaixo do outro. Um só ícone "!" por faixa; avisos longos e os que vêm depois de uma narração continuam separados.
- Teste de navegador `tools/teste_avisos_inline.py`.
- Publicado sem reiniciar o servidor (só arquivos do site), para não cortar partidas em andamento.
## v0.15.0 — 2026-11-13
- **Admin encerra ou apaga mesas:** botões "🏁 Encerrar" e "🗑️ Apagar" em cada mesa da lista "Observar partidas" e na faixa do modo observador, sempre com confirmação.
  - Encerrar: se a aventura está rolando, o Mestre narra um epílogo curto e a mesa fica encerrada para todos, com o aviso "A administração do 4Ever encerrou esta mesa". No lobby, encerra na hora.
  - Apagar: tira a mesa do servidor e do disco (com as ilustrações). Quem estava nela volta ao início com o aviso de que a mesa foi apagada.
- **Chat de texto na sala de espera:** conversa do grupo enquanto todos montam os personagens. Quem chega depois vê as mensagens antigas (o servidor guarda as últimas 200), e a conversa continua na aba Chat durante a aventura.
- Uma narração que termina depois de a mesa ser apagada não recria mais o arquivo da mesa.
## v0.14.0 — 2026-11-13
- **Sala de espera viva:** vitrine da história no topo, com a ilustração do livreto em movimento lento, partículas do ambiente (brasas, vaga-lumes, chuva de dados, poeira, estrelas), o gancho digitado letra por letra, a apresentação e o clima da aventura. Sem segredos do roteiro (mesmos textos do livreto).
- **Música na sala de espera:** cada ambiente tem sua trilha enquanto o grupo se monta (ex.: Viola ao Luar no folclore, Clube no cyber). No celular, o volume aparece no topo da sala de espera.
- Dicas de jogo girando embaixo do grupo, reticências animadas no "Aguardando", cartões de quem chega entrando com animação e o botão "Iniciar aventura" pulsando quando está liberado.
- **Sons:** efeito de porta e acorde quando alguém novo entra na mesa (quem entrou não ouve), e uma fanfarra de início de partida para todos quando a aventura começa. Créditos em `public/musicas/CREDITOS.md`.
- Teste de navegador `tools/teste_sala_espera.py`.
## v0.13.0 — 2026-11-13
- **Observar partidas (admin):** novo menu "👁 Observar", visível só para os emails de `ADMIN_EMAILS`. Lista todas as mesas em andamento, públicas e privadas, com pessoas online, bots e personagens.
- O admin assiste a mesa ao vivo (narração, ações, dados e bate-papo geral) sem aparecer no grupo e sem poder agir: o servidor recusa qualquer ação vinda do observador.
- Testes: bateria do servidor (11 verificações novas) e `tools/teste_observador.py` no navegador (computador e celular).
## v0.12.0 — 2026-11-13

### Cor de cada personagem
- Na ficha, o jogador escolhe uma entre 10 cores. Cores em uso por outro personagem vivo da mesa ficam bloqueadas, e bots e personagens antigos ganham uma cor livre automaticamente.
- Onde a cor aparece:
  - nos balões das ações do personagem (borda, fundo tingido e nome);
  - numa faixa lateral nas narrações do Mestre sobre a ação dele e nos avisos do sistema que o citam;
  - no cartão do grupo e no avatar;
  - no nome no bate-papo e no lobby.
- Dá para trocar a cor depois em "🎨 Cor", no próprio cartão do grupo. Uma folha de estilo gerada na hora liga nome e cor, então até as mensagens antigas acompanham a troca.
- Servidor: paleta em `CORES_PERSONAGEM`, evento `mudarCor`, a narração do Mestre guarda quem agiu (`ator`), e há testes.

### Livreto do jogador
- O livreto foi atualizado com 12 histórias: 4 páginas novas das histórias de perícia, com ilustrações próprias, a seção "As doze histórias" e o card "Bots com personalidade".
- O link de download do PDF fica na página inicial, junto da escolha da história. O PDF agora é gerado direto em `public/4Ever-livreto.pdf`.

## v0.11.0 — 2026-11-13

### Histórias de perícia e investigação (agora são 12 roteiros)
- Ambiente novo **Perícia** (Brasil atual, estilo true crime e totalmente fictício):
  - classes: Agente de Operações, Investigador OSINT, Perito Forense Digital e Perito Criminal;
  - poderes: Entrada Tática, Rastro Digital, Extração Completa, Análise de Metadados, Briefing...;
  - itens: café da delegacia, ordem judicial, bolsa de Faraday...;
  - o Mestre segue regras de cadeia de custódia e de ordem judicial;
  - ilustrações em fotografia noir realista e trilhas eletrônicas de suspense.
- Novos roteiros, cada um com missão em 4 etapas:
  - 📱 **O Print que Mentia**: um print de WhatsApp forjado e um júri na sexta;
  - 💸 **Golpe do PIX Fantasma**: a falsa central do banco e o rastro do dinheiro até as criptomoedas;
  - ✍️ **O Contrato Assinado por um Morto**: empréstimo digital com selfie de quem já tinha morrido;
  - 📍 **Sinal Perdido na Serra**: um desaparecimento, com dados de antena e uma corrida contra o tempo.

## v0.10.2 — 2026-11-13

### Bate-papo
- O recado de voz de um bot agora chega também como mensagem de texto logo em seguida, no lugar da legenda. O texto fica salvo no histórico do bate-papo, então continua lá depois de recarregar a página.

## v0.10.1 — 2026-11-13

### Correção
- A narração do Mestre agora sai sempre em terceira pessoa, começando pelo nome de quem agiu ("Samira passa o scanner..."), e não "Você passa o scanner...". Antes, na ação de outro jogador ou de um bot, parecia que tinha sido você.
- Há uma regra nova no prompt do Mestre e um lembrete a cada rodada com o nome do personagem. A única exceção é a pergunta final ao próximo jogador ("Rex, o que você faz?").

## v0.10.0 — 2026-11-13

### Personalidade dos bots
- Ao criar cada bot, a IA escolhe 2 traços de uma lista fixa: brincalhão, malvado, benevolente, misterioso, sincero, covarde, corajoso, ganancioso, impulsivo, cauteloso, sarcástico, leal, orgulhoso, curioso, rabugento, otimista e desconfiado.
- Os traços não se repetem entre bots da mesma mesa e ficam fixos o jogo todo.
- Eles guiam as ações e os recados de voz (um covarde hesita, um malvado intimida...). O Mestre também os recebe, para reagir nas cenas.
- Bots criados antes desta versão ganham 2 traços sorteados na primeira jogada.
- Os traços aparecem no lobby (🎭) e no cartão do grupo.

## v0.9.0 — 2026-11-13

### Voz reserva grátis
- Quando o ElevenLabs falha (sem crédito, sem chave ou fora do ar), a narração do Mestre e os recados dos bots passam a usar o edge-tts. Ele é grátis e usa as vozes neurais do "ler em voz alta" do Edge: Antonio, Francisca e Thalita (pt-BR) e Duarte e Raquel (pt-PT).
- Sem crédito, o ElevenLabs fica pausado por 30 min; em outras falhas, por 2 min. Falas já geradas pelo ElevenLabs continuam saindo do cache.
- Vozes reserva fixas:
  - o narrador usa o Antonio;
  - cada bot ganha uma voz reserva do mesmo gênero, sem repetir na mesa, usando tom e velocidade para diferenciar quem compartilha a mesma voz.
- Testes: `tools/teste_tts.js`, com ElevenLabs "sem crédito" e edge-tts falsos, roda junto da bateria.

## v0.8.0 — 2026-11-13

### Bots que conversam
- De vez em quando, depois de jogar, um bot grava um recado de voz no bate-papo: um comentário curto, criado pela IA, sobre o momento do jogo e o próximo passo, no jeito do personagem. A transcrição aparece como legenda do áudio.
- Grupo travado: quando a mesa passa 3 rodadas ou mais sem avançar na missão, a chance de recado sobe e a fala vira uma dica concreta para destravar a etapa (pista esquecida, NPC, lugar, outra abordagem). É uma dica por travada.
- Voz fixa por bot: cada bot recebe uma voz do ElevenLabs ao ser criado, de acordo com o gênero do personagem e diferente dos outros bots da mesa, e fala sempre com ela. As vozes brasileiras têm prioridade. A do narrador e vozes pessoais ficam de fora.
- Sem exagero: no máximo 1 recado a cada 2 min na mesa e 1 a cada 5 min por bot (configurável no `.env`).
- Sem créditos de voz, ou com o áudio do chat desligado pelo anfitrião, o recado vai como texto.
- O TTS aceita voz por fala e `ELEVENLABS_BASE_URL` (para testes). O Mestre simulado imita o ElevenLabs e os testes conferem voz fixa e diferente por bot.

## v0.7.0 — 2026-11-13

### Mesa
- Escrever antes da vez: o campo da ação fica liberado mesmo fora da sua vez, para você ir escrevendo enquanto os outros jogam. O Enviar (e o Enter) só libera na sua vez, e o texto fica guardado até lá.
- A dica no campo avisa: "Vez de X · você já pode ir escrevendo".
- O campo só trava quando não dá para jogar: aventura encerrada, personagem morto ou jogador Afastado.
- Digitar fora da vez não estende o relógio de ninguém.
- `tools/teste_som_vez.py` passou a testar também a escrita adiantada.

## v0.6.1 — 2026-11-13

### Correção
- O dado rolado por um bot agora fecha sozinho para todos cerca de 6 s depois da rolagem. Antes, o bot só "continuava" depois que o Mestre terminava de narrar o resultado (20 a 30 s com a IA real), e o modal ficava aberto na tela dos humanos.
- O Mestre simulado ganhou `MOCK_ATRASO_MS`, que imita a demora da narração. `tools/teste_dado_espectador.py` agora testa com 15 s de narração.

## v0.6.0 — 2026-11-13

### Som e preferências
- Som de "sua vez" (`public/sfx/sua-vez.mp3`, sininho de duas notas feito para o 4Ever). Toca só no aparelho de quem recebeu a vez, a cada início de vez, inclusive na primeira da aventura. Os outros jogadores não ouvem. Respeita o som desligado.
- As caixas "Tocar narração automaticamente" e "Tocar áudios recebidos automaticamente" ficam salvas no navegador: sobrevivem a recarregar a página e a fechar e abrir o navegador, como já acontecia com "Música e efeitos" e o volume.
- Teste no navegador com 2 jogadores: `tools/teste_som_vez.py`.

## v0.5.1 — 2026-11-13

### Dado
- Quem assiste à rolagem de outro jogador (ou de um bot) não precisa mais clicar em Continuar: o modal fecha sozinho quando o dono do dado continua, ou quando a pausa do dado expira.
- O espectador vê "Fecha sozinho quando X continuar." e um botão discreto "Fechar", para fechar antes se quiser.
- Teste no navegador: `tools/teste_dado_espectador.py`.

## v0.5.0 — 2026-11-13

### Bots controlados pela IA
- Ao criar a mesa, o anfitrião escolhe de 0 a 3 bots. Cada bot é um jogador a mais: você + 2 bots = 3 personagens.
- A IA cria o personagem de cada bot: nome, classe (de preferência diferente das já escolhidas), atributos, história e personalidade, de acordo com a aventura e o ambiente. Se a IA falhar, entra um personagem padrão válido.
- Na vez do bot, a IA decide a ação a partir da cena recente, da missão, da ficha, das habilidades disponíveis e das sugestões. Ela pode usar uma habilidade ou atacar com a arma em mãos.
- Quando o Mestre pede um teste, o bot rola o dado sozinho; o resultado fica alguns segundos na tela de todos.
- Os bots só jogam enquanto houver um humano conectado, para não gastar IA à toa. Não ficam "Afastados", nunca viram anfitrião e não aparecem como destino do bate-papo.
- Na interface: seletor "🤖 Bots" ao criar o jogo, 🤖 no lobby com "a IA está criando o personagem...", selo "🤖 IA" no cartão do grupo e explicação em "Como Jogar".
- Testes com o Mestre simulado: criação, limite de 3, ação, rolagem, retorno da vez ao humano e pausa sem humanos.

## v0.4.0 — 2026-11-13

### Aventura personalizada
- O modelo de aventura em .txt (`public/modelo-aventura.txt`) traz uma aventura completa e original, "O Relógio de Kael-Dur", no formato dos roteiros prontos e sem spoiler deles. Tem cenário, tom, começo, personagens, criaturas e perigos, segredo, missão com etapas e final.
- O link de download fica em "Como Jogar" e ao lado do campo da Personalizada.
- As linhas que começam com `#` são dicas: o jogo as remove antes de enviar ao Mestre.
- O limite do texto subiu para 4.000 caracteres, sem contar as dicas.

## v0.3.1 — 2026-11-13

### Correções
- Moedas narradas pelo Mestre agora contam na ficha. O [ESTADO] aceita `moedas +N` / `moedas -N` (e `+item: 3 moedas`). O prompt manda o Mestre registrar todo ganho, pagamento ou roubo de dinheiro, e ninguém paga mais do que tem: o saldo nunca fica negativo. Antes, só baús e gavetas mexiam nas moedas.
- Som desligado não toca mais nada. Desligar agora pausa e silencia a música em vez de só zerar o volume, que o iPhone ignora. A troca de trilha pelo Mestre (por exemplo, ao subir de nível) e os efeitos ficam mudos até religar.

## v0.3.0 — 2026-11-13

### Jogo
- Desistir do teste: antes de rolar o d20, quem foi chamado ao teste pode tocar em 🏳️ Desistir. Não há rolagem, a vez passa adiante (sem contar como pulo por inatividade) e o Mestre narra o recuo e as consequências que a situação pedir, ou nenhuma.
  - Um ataque declarado é cancelado.
  - Se o Mestre falhar ao responder, o teste volta a valer.
- "Como Jogar" explica a regra nova; as estatísticas da mesa contam as desistências.
- Testes automáticos de desistência: recusa sem teste pendente, recusa do teste alheio, passagem da vez e pulos.

## v0.2.1 — 2026-11-13

### Celular
- Uma linha única no topo da mesa reúne as abas Mesa / Grupo / Chat e, rolando para o lado: código da sala (toque para copiar o convite), Diário, Objetivos, Encerrar, Ajustes, narração, música, volume e 🏠 início. O cabeçalho do site some na mesa.
- Textos mais curtos no celular:
  - avisos de vez e de dado;
  - caixa do teste numa faixa só;
  - "Procurar" e "trancado" viram ícones;
  - "Cena ilustrada";
  - mensagens do sistema sem rótulo;
  - chat sem título, com destino e mensagem na mesma linha.
- O desktop continua igual.

## v0.2.0 — 2026-11-13

### Contas e mesas
- Cadastro por email, sessão local de 30 dias e login por link mágico (SMTP local).
- Cabeçalho do site: Home, Jogos Abertos, Minhas Partidas, Como Jogar, Minha conta.
- Mesas privadas por padrão, com opção de pública; convite por link e por email.
- Configurações do anfitrião: tempo da vez, tempo do dado, áudio no chat, imagens de cenário e humor do Mestre (sliders, travados por 2 rodadas).

### Jogo
- Turnos de 60 s; quem não age é pulado, e 3 pulos deixam o jogador "Afastado".
- Modal do d20 com relógio próprio (sem rolar = falha automática).
- Recarga de recurso por rodada, itens, artefatos, armas utilizáveis, baús e gavetas para procurar.
- Missões com objetivo e 4 etapas, botão Objetivos e um Mestre que conduz ao objetivo final.
- Personagens podem morrer.
- Ajuda "?" em cada poder; clicar num poder ou arma preenche a ação.

### Mundos
- Ambientes com figurinos próprios: fantasia, cyber, folclore brasileiro, steampunk sertanejo e ficção científica espacial.
- 8 roteiros. Novos nesta versão: A Invasão Cyber, Os Piratas da Névoa de Sal, A Noite do Boitatá, Sertão de Ferro e Estação Órion-7.

### Som e imagem
- Trilhas CC0 escolhidas pelo Mestre para cada cena, efeitos sonoros e controle de volume/mudo.
- Cache das narrações em áudio.
- Ilustrações de cena no fundo da mesa, com quadros translúcidos. Ficam ligadas quando o gateway liberar modelos de imagem.

### Celular
- Mesa em tela cheia com abas Mesa / Grupo / Chat no topo.
- A altura acompanha a área realmente visível e o teclado virtual.
- Página de diagnóstico de tela: `/diag.html`.

### Ferramentas
- Testes com Mestre, SMTP e imagens simulados: `tools/rodar_testes.sh`.
- Capturas e checagens de layout no celular: `tools/capturas_mobile.py`.
- Monitor de hora em hora dos modelos do gateway, com aviso por email: `tools/monitor-gateway.js`.
- Livreto do jogador em PDF: `docs/livreto`.

## v0.1.0
- Primeira versão: mesa multiplayer com IA Mestre, turnos e narração ElevenLabs.
