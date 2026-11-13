# Changelog

Versões do 4Ever (versionamento semântico). Cada versão tem uma tag `vX.Y.Z` no git.

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
