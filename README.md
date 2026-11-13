# 4EverRPG

RPG online multiplayer, conduzido por uma **IA Mestre de Jogo**, jogável em grupo via
navegador: um jogador cria uma partida e recebe um **código de 5 letras/números** para
compartilhar com os amigos, que entram na mesma sala e jogam juntos em tempo real.

## Como funciona

1. O jogador **cria uma conta** com nome + email (entra na hora; a sessão fica salva no
   navegador por 30 dias). Para entrar de novo em outro aparelho, recebe um **magic
   link** por email (válido por 15 min, uso único) — enviado pelo SMTP local
   (`localhost:2525`).
2. Cria uma mesa (roteiro pronto ou personalizado, pública ou privada) e compartilha o
   **link de convite** ou o **código de 5 letras**. Mesas públicas aparecem em
   **Jogos Abertos**; as suas ficam em **Minhas Partidas**.
3. Cada jogador escolhe uma **classe** e distribui pontos de atributo.
4. O anfitrião clica em **Iniciar aventura**. Se a IA estiver fora do ar, aparece um erro
   claro com "Tentar novamente" (tempo máximo de espera: 60s).
5. A IA narra, reage às ações e pede testes de d20. Cada jogador tem **1 minuto por vez**
   (quem está digitando ganha fôlego); quem não age é pulado, e após **3 pulos** fica
   **Afastado** até confirmar na tela que voltou.

A conta é a identidade do jogador: recarregar a página, perder a conexão ou trocar de
aparelho leva de volta ao mesmo personagem.

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
- **Suspense na rolagem**: o Mestre pede o teste sem antecipar o que acontece em cada resultado;
  depois da rolagem, narra só o desfecho (proporcional à margem de sucesso ou falha).
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

## Mecânicas da mesa

- **Ficha viva**: o Mestre usa a tag `[ESTADO: Nome | pv -3 | recurso -2 | +item: X | -item: Y | xp +20]`
  e o servidor aplica de verdade (PV, recurso, inventário, XP). Com 0 PV o personagem cai
  inconsciente. A cada nível (nível × 100 XP): +3 PV, +2 recurso, tudo restaurado.
- **Testes**: o servidor rola d20 + modificador + bônus contra a dificuldade (fácil 10, médio 13,
  difícil 16, muito difícil 19) e informa SUCESSO/FALHA. Só quem foi chamado pode rolar, e
  sempre o atributo pedido.
- **Habilidades de classe** (2 por classe) gastam Fúria/Foco/Mana/Fé e dão bônus ou cura.
- **Sugestões de ação** clicáveis (tag `[SUGESTOES: a | b | c]`), **passar a vez**,
  **encerrar aventura** (epílogo, tag `[FIM]`) e **exportar o diário** em .txt.
- **Diário**: acima de 30 mensagens, as antigas são resumidas pela IA, para o custo e a
  demora não crescerem sem limite.

## Persistência

Contas, sessões e mesas ficam em `data/` (JSON, escrita atômica). Reiniciar o servidor não
apaga partidas; mesas sem ninguém online por 24h são removidas.

## Testes

```bash
bash tools/rodar_testes.sh
```

Sobe um Mestre (IA) e um SMTP simulados — não gasta créditos nem envia emails — e testa
cadastro, magic link, validações, ficha viva, habilidades, tempo de vez/Afastado,
reconexão, encerramento, resumo do histórico e persistência após reiniciar.

## Estrutura

```
server.js                servidor HTTP + Socket.IO, rotas de conta e magic link
src/auth.js              contas, sessões de 30 dias, magic link
src/mailer.js            cliente SMTP mínimo (localhost:2525)
src/storage.js           persistência em data/
src/characterSystem.js   classes, atributos, habilidades, XP, dados
src/aiMaster.js          chamada à IA (Mestre) e resumo do histórico
src/gameManager.js       salas, turnos, tempo de vez, tags do Mestre
src/socksFetch.js        chamada à IA via proxy SOCKS5 (Tailscale)
public/                  front-end (HTML/CSS/JS puro, sem build)
tools/                   testes com IA e SMTP simulados
```
