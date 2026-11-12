# Arte do jogo

Por enquanto o 4EverRPG usa **ícones vetoriais (SVG) desenhados à mão**, embutidos em
`public/js/app.js` (função `AVATARES`). Isso evita depender de downloads externos
(com licenças a verificar) ou de geração de imagem por IA (que tem custo por imagem)
enquanto o jogo ainda está em desenvolvimento inicial.

## Trocar por sprites/arte reais mais tarde

Quando quiser evoluir a arte, dois caminhos:

### 1. Sprites/pixel art prontos e gratuitos (CC0 / licença livre)
Bons bancos para RPG top-down e cartas, encontrados na pesquisa inicial:
- **Kenney.nl** — https://kenney.nl/assets — milhares de assets CC0 (personagens, cartas, UI, ícones).
- **Universal LPC Spritesheet Character Generator** — https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/
  — gera sprites de personagem customizáveis (roupa, cabelo, classe) prontos para jogos.
- **OpenGameArt.org** (tag LPC / RPG) — https://opengameart.org/content/lpc-medieval-fantasy-character-sprites
- **itch.io assets CC0** — https://itch.io/game-assets/assets-cc0/tag-top-down (personagens) e
  https://itch.io/game-assets/free/tag-card-game (cartas/UI de cartas).

Sempre confira a licença de cada pacote antes de usar (CC0 é livre; outras licenças
podem exigir atribuição).

Para integrar: baixe os PNGs em `public/assets/characters/<classe>.png` e
`public/assets/master.png`, depois troque a função `avatarHtml()` em `app.js` para
renderizar `<img>` em vez do SVG embutido quando o arquivo existir.

### 2. Geração de imagem por IA (sob demanda)
Decidimos manter isso para uma fase futura. Quando for integrar, será necessário:
1. Escolher um provedor (ex: Google Imagen/Gemini, OpenAI, Stability AI) — cada um com
   custo por imagem gerada.
2. Guardar a chave de API em `.env` (nunca no código-fonte).
3. Gerar as imagens uma vez (ex: um portrait por classe) e cachear como arquivo estático,
   em vez de gerar a cada partida — isso evita custo repetido e latência no meio do jogo.
