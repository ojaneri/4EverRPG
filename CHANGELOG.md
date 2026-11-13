# Changelog

Versões do 4Ever (versionamento semântico). Cada versão tem uma tag `vX.Y.Z` no git.

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
