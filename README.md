# 4EverRPG

RPG online multiplayer, conduzido por uma **IA Mestre de Jogo**, jogável em grupo via
navegador: um jogador cria uma partida e recebe um **código de 5 letras/números** para
compartilhar com os amigos, que entram na mesma sala e jogam juntos em tempo real.

## Como funciona

1. Um jogador clica em **Criar jogo** (dá um nome e, opcionalmente, um tema de aventura)
   → recebe um código da sala (ex: `AB12C`).
2. Compartilha o código com os amigos, que clicam em **Entrar em um jogo** e digitam o
   código + o nome deles.
3. Cada jogador escolhe uma **classe** e distribui pontos de atributo na ficha do
   personagem.
4. Quando todos estiverem prontos, o anfitrião clica em **Iniciar aventura**.
5. A partir daí, a IA assume o papel de Mestre: narra a cena, reage às ações de cada
   jogador (digitadas em texto livre) e pede rolagens de dado (d20) quando uma ação tem
   chance real de falhar.

Tudo roda em tempo real via WebSocket (Socket.IO) — todos na sala veem a narração e as
ações uns dos outros ao vivo.

## Sistema de RPG (próprio, leve)

- 4 atributos: **Força, Agilidade, Mente, Espírito** (sistema de "compra de pontos":
  todos começam em 10, cada jogador distribui 6 pontos extras, entre 8 e 16).
- 4 classes: **Guerreiro, Batedor, Arcanista, Guardião da Fé** — cada uma com HP,
  recurso especial (Fúria/Foco/Mana/Fé) e inventário inicial diferentes.
- Testes: **d20 + modificador do atributo**, contra uma dificuldade que a IA Mestre
  define narrativamente (fácil / médio / difícil / muito difícil).

Veja `src/characterSystem.js` para a definição completa.

## Rodando localmente

Requisitos: **Node.js 18+** (usa `fetch` nativo).

```bash
npm install
# copie .env.example para .env e configure sua chave de API, se ainda não tiver um .env
npm start
```

Abra `http://localhost:3000` no navegador. Para jogar com amigos na mesma rede local,
use o IP da sua máquina (ex: `http://192.168.0.10:3000`); para jogar pela internet,
será necessário publicar no VPS (ver abaixo) ou usar um túnel temporário.

### Configuração da IA Mestre (`.env`)

```
RPG_AI_API_KEY=...         # chave de API (Anthropic oficial ou um proxy compatível)
RPG_AI_BASE_URL=...        # endereço base da API
RPG_AI_API_PATH=/messages  # caminho do endpoint, ajustável conforme o provedor
RPG_AI_API_VERSION=2023-06-01
RPG_AI_MODEL=claude-fable-5.2
```

Este projeto já está configurado para usar o proxy `sixtysix.online` (credenciais em
`.env`, que **não é versionado** — veja `.gitignore`).

**Por que `RPG_AI_*` e não `ANTHROPIC_*`?** O Claude Code (CLI) usa variáveis
`ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` / `ANTHROPIC_BASE_URL` no ambiente do sistema
(trocadas pelo comando `/model`). Essas variáveis vazam para processos filhos — e como
`dotenv` não sobrescreve uma variável já existente no ambiente, elas calavam
silenciosamente os valores do `.env` deste projeto. Usar um prefixo próprio evita essa
colisão de uma vez por todas.

## Bate-papo e voz entre jogadores

Além da narrativa com a IA, os jogadores têm um canal próprio de comunicação (painel
à direita na tela de jogo), que **não passa pela IA**:

- **Texto**: geral (todos veem) ou privado (escolha um jogador no seletor "Falar com").
  Suporta **negrito** (`**texto**`), *itálico* (`*texto*`) e `código` (`` `texto` ``).
- **Voz, estilo WhatsApp**: segure o botão 🎤 para gravar, solte para enviar — o áudio
  aparece como uma mensagem no bate-papo, com um player para tocar sob demanda. A
  caixa "tocar áudios recebidos automaticamente" (marcada por padrão) toca na hora os
  áudios que chegam de outras pessoas.
  - Simples e sem as dores de NAT/STUN/TURN de uma chamada ao vivo — boa escolha para
    testar com poucos jogadores.
  - Limite de ~3 MB por áudio (alguns segundos de fala); mensagens de voz não ficam
    salvas no histórico da sala (se recarregar a página, as antigas somem).

## Cena, dados e narração

- **Painel de cena** (tabuleiro simples): mostra o local atual, uma descrição curta e
  os personagens presentes, atualizado pela própria IA Mestre via uma tag interna
  (`[CENA: local | descrição | clima]`) que ela inclui quando a cena muda — invisível
  para os jogadores, só aparece a interpretação visual.
- **Dado visual**: ao rolar, o dado gira com números aleatórios e sons sintetizados
  (Web Audio API, sem arquivo de áudio externo) até travar no resultado real, com cor
  diferente em crítico (verde) e crítico falho (vermelho).
- **Faixas de resultado narrativas**: antes de pedir uma rolagem, o Mestre descreve o
  que cada faixa de resultado significa para aquela cena específica (ex: "15+ você
  mata; 10-14 ela se defende e reduz o dano; 5-9 ela se defende totalmente; abaixo de
  5 ela contra-ataca"), e depois narra o desfecho de acordo com o total obtido.
- **Narração por voz (TTS)**: marque "🔊 Narração por voz" no topo da tela de jogo para
  a fala do Mestre ser lida em voz alta em português, usando a Web Speech API do
  próprio navegador (sem custo, sem API externa — qualidade da voz depende do
  sistema operacional/navegador de quem está jogando).

## Roteiros de aventura

Ao criar um jogo, o anfitrião escolhe entre roteiros prontos (conteúdo original, ver
`src/adventures.js`) ou uma aventura "Personalizada" com tema livre:

1. **As Sombras de Corvile** — mistério/resgate num vilarejo isolado perto de uma mina.
2. **O Cofre de Thalveira** — assalto a uma casa de penhores arcana numa cidade portuária.
3. **O Que Desperta sob o Farol** — mistério costeiro com leve horror psicológico.

## Arte do jogo

Avatares de classe e do Mestre são ícones SVG próprios por enquanto (sem custo, sem
downloads externos). Veja `public/assets/README.md` para as opções de evolução
(sprites prontos gratuitos ou geração de imagem por IA).

## Próximos passos / roadmap

- [ ] Persistência em banco de dados (hoje as salas vivem só em memória — reiniciar o
      servidor apaga as partidas em andamento).
- [ ] Deploy no VPS `janeri2.janeri.com.br` (Node + processo gerenciado com PM2 +
      proxy reverso Nginx + HTTPS).
- [ ] Reconexão mais robusta (hoje um jogador que atualiza a página perde o personagem
      já escolhido se o nome não bater exatamente).
- [ ] Combate com mais profundidade (iniciativa, turnos, dano por arma).
- [ ] Trocar os avatares SVG por sprites reais ou arte gerada por IA.

## Estrutura

```
server.js              servidor HTTP + Socket.IO
src/characterSystem.js  classes, atributos, dados
src/aiMaster.js          chamada à IA (Mestre de Jogo)
src/gameManager.js       salas, estado, fluxo de turnos
public/                  front-end (HTML/CSS/JS puro, sem build)
```
