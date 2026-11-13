#!/usr/bin/env python3
"""Gera o livreto do 4Ever (HTML + PDF A4) para enviar aos jogadores.

Uso: python3 gerar_livreto.py
Ilustrações em img/*.png (geradas com `gerar-imagem`); viram JPG leves aqui.
Saída: public/4Ever-livreto.pdf (baixado pela página inicial do jogo)
Os textos não trazem segredos dos roteiros: são para os jogadores.
"""
import html
import pathlib
import subprocess

AQUI = pathlib.Path(__file__).resolve().parent
IMG = AQUI / "img"
URL = "4ever.janeri.com.br"
PDF = AQUI.parent.parent / "public" / "4Ever-livreto.pdf"

HISTORIAS = [
    dict(img="corvile", icone="🏘️", titulo="As Sombras de Corvile", genero="Fantasia · Mistério",
         cor="#7fb6ff", cor2="#1a2a4a",
         gancho="Há três semanas, nenhuma caravana sai de Corvile. À noite, luzes estranhas piscam na boca da velha mina de prata.",
         texto="Um vilarejo agrícola cercado de colinas, portas trancadas, animais inquietos e moradores que mal abrem a janela. Alguém precisa descobrir o que aconteceu com quem sumiu, e o caminho passa pelas galerias de uma mina abandonada há uma geração. Mais investigação que espada, e uma escolha difícil no fim.",
         npcs=[("Dona Yvete", "a anciã que recebe forasteiros com desconfiança"),
               ("Bren", "um jovem ansioso demais para guiar o grupo até a mina")],
         objetivo="Descobrir o que silenciou Corvile e decidir o destino do que desperta nas minas.",
         classes=None, clima=["Mistério", "Tensão", "Escolha moral"]),
    dict(img="thalveira", icone="🗝️", titulo="O Cofre de Thalveira", genero="Fantasia · Assalto",
         cor="#f2c14e", cor2="#3a2a10",
         gancho="Dentro do cofre de Mestre Odrin está algo que não pode ser vendido. O comprador já está a caminho.",
         texto="Thalveira é uma cidade portuária de casas de penhores cheias de relíquias de origem duvidosa. Guardas noturnos, alarmes arcanos, funcionários que talvez aceitem uma moeda e uma rota de fuga que pode dar errado. Planeje, convença, engane e, se tudo falhar, corra.",
         npcs=[("Mestre Odrin", "dono da Casa Penhora, cauteloso e nada ingênuo"),
               ("Sael", "o guarda da casa: aliado ou obstáculo, depende de você")],
         objetivo="Recuperar o item do cofre antes que o comprador misterioso chegue.",
         classes=None, clima=["Planejamento", "Lábia", "Fuga"]),
    dict(img="farol", icone="🗼", titulo="O Que Desperta sob o Farol", genero="Fantasia · Horror costeiro",
         cor="#6fe3c1", cor2="#0e2e2a",
         gancho="Há três noites o farol se apaga sozinho, sempre à mesma hora. E os marinheiros juram ouvir um canto vindo da água.",
         texto="Um promontório de pedra batido pelo mar, um farol antigo e grutas escuras na base do penhasco. O faroleiro não responde às mensagens, e quando aparece já não parece o mesmo. Explore com cuidado, escolha em quem confiar e devolva a luz antes do primeiro naufrágio.",
         npcs=[("Sr. Aldric", "o faroleiro, cada vez mais evasivo"),
               ("Marina", "uma pescadora que viu os sinais antes de todo mundo")],
         objetivo="Descobrir por que o farol se apaga e trazer a luz de volta antes de um naufrágio.",
         classes=None, clima=["Exploração", "Horror leve", "Confiança"]),
    dict(img="cyber", icone="💻", titulo="A Invasão Cyber", genero="Cyberpunk · Hackers",
         cor="#00e5ff", cor2="#2a0a3a",
         gancho="23h. O ransomware HIDRA tomou Nova Aurora: o hospital sem prontuários, o metrô parado e um pedido de resgate em todos os telões.",
         texto="Nova Aurora, 2049: uma metrópole brasileira hiperconectada de letreiros holográficos e drones. A Agência de Defesa Cibernética convoca a sua equipe para conter o ataque, seguir os rastros digitais e conseguir a chave antes do amanhecer. Logs, engenharia social, invasões e contra-ataques, com perigo real fora da tela também.",
         npcs=[("Dra. Lia Moraes", "chefe de segurança do Hospital Central"),
               ("“Zero”", "hacker informante de um clube neon que joga dos dois lados"),
               ("Coletivo Ômega", "ativistas contra a vigilância corporativa… ou não?")],
         objetivo="Deter o ransomware HIDRA e descobrir quem está por trás da invasão antes do amanhecer.",
         classes="cyber", clima=["Investigação forense", "Ação", "Dilemas éticos"]),
    dict(img="piratas", icone="🏴‍☠️", titulo="Os Piratas da Névoa de Sal", genero="Fantasia · Aventura pirata",
         cor="#ff8a5c", cor2="#10283a",
         gancho="Uma névoa prateada engole navios e os devolve vazios, com a mesa posta e o chá ainda quente.",
         texto="O Arquipélago das Mil Marés tem portos piratas, tavernas sobre palafitas e mares cheios de magia salgada. A bordo do Gaivota Torta, um navio de piratas falidos, o grupo caça as três partes de um mapa que leva ao coração da névoa e ao tesouro de uma rainha pirata que “nunca morreu”. Abordagens, duelos no convés, motins e barganhas com o mar.",
         npcs=[("Capitã Rosa Ferrete", "pirata aposentada, trapaceira e carismática"),
               ("Bento Cabeça-de-Âncora", "um papagaio que só fala a verdade (por isso ninguém gosta dele)"),
               ("A Rainha da Névoa", "dizem que troca almas por ventos favoráveis")],
         objetivo="Encontrar o coração da névoa e quebrar a maldição da Rainha da Névoa.",
         classes=None, clima=["Humor", "Duelos", "Tesouros amaldiçoados"]),
    dict(img="boitata", icone="🔥", titulo="A Noite do Boitatá", genero="Folclore brasileiro",
         cor="#5fb4ff", cor2="#0c2a18",
         gancho="Toda noite um fogo azul serpenteia pela mata sem queimar as árvores. E quem o vê esquece o próprio nome.",
         texto="Vila de São Bento, 1890, à beira de uma mata atlântica fechada e de rios escuros, com cafezais avançando sobre a floresta. O Boitatá, a cobra de fogo que protege as matas, acordou com raiva, e dizem que na Lua Nova o fogo desce até a vila. Os Encantados têm regras próprias e cobram respeito.",
         npcs=[("Seu Lázaro", "velho barqueiro com um pacto antigo com a Iara"),
               ("Saci-Pererê", "ajuda e atrapalha na mesma frase"),
               ("Coronel Antero", "quer derrubar a mata para plantar café")],
         objetivo="Devolver o equilíbrio à mata e acalmar o Boitatá antes da Lua Nova.",
         classes="folclore", clima=["Mágico", "Assombrado", "Natureza × ganância"]),
    dict(img="sertao", icone="⚙️", titulo="Sertão de Ferro", genero="Steampunk sertanejo",
         cor="#ffb347", cor2="#3a1e08",
         gancho="A torre de água de Pedra Branca parou. O trem com a peça de reposição foi tomado por cangaceiros de braços de engrenagem. A cidade tem três dias de água.",
         texto="Um sertão de 1920 onde a seca foi “vencida” pelas máquinas a vapor da Companhia Ferro & Sol: trens blindados cortam a caatinga e cada cidade vive em volta de uma torre de água mecânica. Duelos ao meio-dia, trens em movimento, cordel e feira, e uma pergunta que ninguém quer responder: de quem é a água?",
         npcs=[("Maria Cascavel", "líder dos cangaceiros mecânicos: dura, justa e talvez certa"),
               ("Doutor Prates", "o engenheiro da Companhia Ferro & Sol"),
               ("Zé Faísca", "menino inventor que conversa com as máquinas")],
         objetivo="Levar a peça até Pedra Branca, religar a torre e decidir o futuro da água do sertão.",
         classes="sertao", clima=["Faroeste", "Vapor", "Justiça"]),
    dict(img="orion", icone="🚀", titulo="Estação Órion-7", genero="Ficção científica · Alienígenas",
         cor="#b48bff", cor2="#0a0f2a",
         gancho="A estação mineradora em órbita de Júpiter parou de responder há 9 dias. Os 200 tripulantes dormem em criogenia, e ninguém se lembra de ter entrado nas cápsulas.",
         texto="Ano 2187. Corredores industriais, gravidade artificial instável e docas cheias de blocos de gelo vindos da lua Europa. A IA da estação insiste que está tudo bem. Não está: algo veio no gelo. Algo que se espalha pelos dutos, imita vozes e fala por padrões de luz. Suspense claustrofóbico, recursos escassos e decisões duras.",
         npcs=[("MÃE", "a IA da estação, calma demais"),
               ("Dra. Kenji Ayo", "a única acordada, que parece saber demais"),
               ("O Passageiro", "inteligente, estranho… e com motivos próprios")],
         objetivo="Descobrir o que aconteceu na Órion-7, conter os alienígenas e tirar os sobreviventes antes que a órbita decaia.",
         classes="espacial", clima=["Suspense", "Horror sci-fi", "Sobrevivência"]),
    dict(img="print", icone="📱", titulo="O Print que Mentia", genero="Perícia · Tribunal",
         cor="#4cc9f0", cor2="#0b2233",
         gancho="Um print de WhatsApp pôs um jovem de 19 anos na cadeia. O júri é na sexta. A família jura que a conversa nunca existiu.",
         texto="Uma cidade do interior paulista, um fórum lotado e um laboratório de perícia improvisado. A sua equipe tem poucos dias para examinar o celular, o backup e cada pixel daquela conversa. Mas atenção: prova sem lacre, sem cadeia de custódia ou sem ordem judicial cai no tribunal. Drama de júri contra o relógio.",
         npcs=[("Dra. Helena Prado", "defensora pública exausta e brilhante"),
               ("Delegado Moura", "quer o caso encerrado, custe o que custar"),
               ("Kauã", "o amigo nervoso que entregou o print")],
         objetivo="Provar a verdade sobre o print antes do veredito do júri.",
         classes="pericia", clima=["Perícia digital", "Tribunal", "Contra o relógio"]),
    dict(img="pix", icone="💸", titulo="Golpe do PIX Fantasma", genero="Perícia · Crime financeiro",
         cor="#7ae582", cor2="#0d2a17",
         gancho="Em uma semana, 37 idosos perderam R$ 1,2 milhão para uma falsa central do banco. O dinheiro some em minutos.",
         texto="Uma força-tarefa de crimes cibernéticos em Campinas. Uma voz que sabia nome, CPF e últimas compras de cada vítima, um número que parecia oficial e dezenas de contas laranja levando tudo para as criptomoedas. Siga o dinheiro, descubra de onde vazam os dados e chegue antes do saque.",
         npcs=[("Dona Cida", "74 anos, gravou a ligação inteira"),
               ("Ruan", "alugou a conta por R$ 300 e está apavorado"),
               ("“Professor”", "comanda o golpe de dentro de um presídio")],
         objetivo="Desarticular a quadrilha e recuperar parte do dinheiro antes do saque.",
         classes="pericia", clima=["Rastro do dinheiro", "Operação", "Caça à quadrilha"]),
    dict(img="contrato", icone="✍️", titulo="O Contrato Assinado por um Morto", genero="Perícia · Fraude digital",
         cor="#f4a261", cor2="#2e1a0c",
         gancho="Seu Arlindo morreu na segunda. Na quinta, “assinou” um empréstimo de R$ 480 mil, com selfie e tudo.",
         texto="Belo Horizonte, um velório recente e uma família em guerra pela herança. O banco jura que a assinatura eletrônica é infalível e cobra a viúva. Trilha de auditoria, IP, aparelho, horários e uma selfie que não deveria existir: a perícia vai mostrar quem esteve do outro lado da tela.",
         npcs=[("Dona Rosa", "a viúva, doce e desconfiada de todos"),
               ("Fábio", "o sobrinho prestativo demais"),
               ("Jéssica", "a gerente que aprovou o crédito num piscar de olhos")],
         objetivo="Provar que o contrato é fraude e descobrir quem o forjou.",
         classes="pericia", clima=["Mistério familiar", "Assinatura digital", "Herança"]),
    dict(img="serra", icone="📍", titulo="Sinal Perdido na Serra", genero="Perícia · Desaparecimento",
         cor="#e5989b", cor2="#2a1218",
         gancho="Bianca saiu de uma festa na serra às 2h17 e sumiu. O celular parou de dar sinal às 2h41. Cada hora conta.",
         texto="Petrópolis, neblina, estradas sinuosas e câmeras que ninguém olha. Reconstrua a linha do tempo da noite com fotos, stories, câmeras, dados de antena e histórico de localização (com ordem judicial, sempre). Um caso de desaparecimento contra o relógio, em que encontrar não basta: é preciso proteger.",
         npcs=[("Seu Jorge", "o pai, que não sai da porta da delegacia"),
               ("Téo", "o namorado, com um álibi perfeito demais"),
               ("Wesley", "o motorista de aplicativo que “não lembra” da corrida")],
         objetivo="Encontrar Bianca antes que seja tarde.",
         classes="pericia", clima=["True crime", "Linha do tempo", "Corrida contra o tempo"]),
]

CLASSES = {
    None: [("⚔️", "Guerreiro", "Linha de frente, força bruta."), ("🏹", "Batedor", "Ágil, furtivo, certeiro."),
           ("🔮", "Arcanista", "Magia que dobra a realidade."), ("✨", "Guardião da Fé", "Protege, cura e repele as trevas.")],
    "cyber": [("🛡️", "Operador de Campo", "Segurança tática no mundo físico."), ("🕶️", "Infiltrador", "Engenharia social e fechaduras."),
              ("💻", "Hacker", "Red team: exploits como arma."), ("🧬", "Analista de Defesa", "Blue team: contém e restaura.")],
    "folclore": [("🐂", "Tropeiro", "Facão na cintura e coragem."), ("🐾", "Caçador", "Lê pegadas, some na mata."),
                 ("🌿", "Benzedeira", "Reza, erva e os Encantados."), ("📿", "Rezador", "Reza forte contra assombração.")],
    "sertao": [("🔫", "Pistoleiro", "Mão rápida, coração duro."), ("🌵", "Cangaceira", "Ágil e livre na caatinga."),
               ("⚙️", "Inventor", "Fala a língua das engrenagens."), ("🕯️", "Rezadeira", "Fé e remédio do mato.")],
    "espacial": [("🪖", "Fuzileira Espacial", "Combate em gravidade zero."), ("🛰️", "Pilota", "Reflexos e plano de fuga."),
                 ("🔧", "Engenheira de Sistemas", "A estação obedece a ela."), ("🩺", "Médica de Bordo", "Mantém todos vivos.")],
    "pericia": [("🚔", "Agente de Operações", "Mandados, buscas e proteção."), ("🕵️", "Investigador OSINT", "Campana e fontes abertas."),
                ("💾", "Perito Forense Digital", "Celulares, logs e metadados."), ("🔬", "Perito Criminal", "Local de crime e custódia.")],
}

e = html.escape


def preparar_imagens():
    for png in IMG.glob("*.png"):
        jpg = png.with_suffix(".jpg")
        if not jpg.exists() or jpg.stat().st_mtime < png.stat().st_mtime:
            subprocess.run(["ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-i", str(png),
                            "-vf", "scale=1240:-2", "-q:v", "5", str(jpg)], check=True)


def foto(nome):
    return f"img/{nome}.jpg" if (IMG / f"{nome}.jpg").exists() else ""


def pagina_historia(i, h):
    classes = "".join(
        f'<div class="classe"><span class="ci">{ic}</span><b>{e(n)}</b><small>{e(d)}</small></div>'
        for ic, n, d in CLASSES[h["classes"]])
    npcs = "".join(f"<li><b>{e(n)}</b> — {e(d)}</li>" for n, d in h["npcs"])
    clima = "".join(f"<span>{e(c)}</span>" for c in h["clima"])
    bg = foto(h["img"])
    return f"""
<section class="pagina historia" style="--cor:{h['cor']};--cor2:{h['cor2']}">
  <div class="arte" style="background-image:url('{bg}')"></div>
  <div class="arte-sombra"></div>
  <div class="num">{i:02d}<small>/{len(HISTORIAS):02d}</small></div>
  <div class="conteudo">
    <div class="genero">{h['icone']} {e(h['genero'])}</div>
    <h2>{e(h['titulo'])}</h2>
    <p class="gancho">{e(h['gancho'])}</p>
    <div class="clima">{clima}</div>
    <div class="cols">
      <div>
        <p class="texto">{e(h['texto'])}</p>
        <h4>Quem você vai encontrar</h4>
        <ul class="npcs">{npcs}</ul>
      </div>
      <div class="lado">
        <div class="missao"><h4>🎯 A missão</h4><p>{e(h['objetivo'])}</p></div>
        <h4>Quem você pode ser</h4>
        <div class="classes">{classes}</div>
      </div>
    </div>
  </div>
  <div class="rodape"><span>4EVER</span><span>{URL}</span></div>
</section>"""


def montar():
    qr = (IMG / "qr.svg").read_text().split("?>", 1)[-1]
    historias = "".join(pagina_historia(i + 1, h) for i, h in enumerate(HISTORIAS))
    sumario = "".join(
        f'<div class="mini" style="--cor:{h["cor"]}"><div class="mini-img" style="background-image:url(\'{foto(h["img"])}\')"></div>'
        f'<div><b>{h["icone"]} {e(h["titulo"])}</b><small>{e(h["genero"])}</small></div></div>' for h in HISTORIAS)
    return f"""<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>4Ever — Livreto do Jogador</title>
<link href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=Cinzel:wght@600;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="livreto.css"></head><body>

<section class="pagina capa">
  <div class="arte" style="background-image:url('{foto('capa')}')"></div>
  <div class="capa-sombra"></div>
  <div class="capa-topo">RPG online · Mestre de Inteligência Artificial</div>
  <div class="capa-centro">
    <h1>4EVER</h1>
    <p class="capa-sub">Doze histórias, seis mundos. Um Mestre que nunca cansa.<br>A história é sua e dos seus amigos.</p>
  </div>
  <div class="capa-base">
    <div><small>Livreto do jogador</small><b>{URL}</b></div>
    <div class="qr">{qr}</div>
  </div>
</section>

<section class="pagina intro">
  <div class="intro-topo">
    <div class="tag">Bem-vindo à mesa</div>
    <h2>O que é o 4Ever?</h2>
    <p class="lead">Um RPG de mesa que acontece no navegador. Você e seus amigos criam personagens, entram numa sala e uma <b>IA Mestre</b> narra a aventura, interpreta cada personagem do mundo e reage a tudo o que vocês decidem fazer. Não tem roteiro fixo, não tem resposta certa: <b>vale o que você imaginar</b>.</p>
  </div>
  <div class="passos">
    <div class="passo"><span>1</span><b>Entre e crie a sala</b><small>Cadastre seu e-mail, escolha a história e convide os amigos com um link.</small></div>
    <div class="passo"><span>2</span><b>Monte seu herói</b><small>Escolha nome, classe e distribua os atributos: Força, Agilidade, Mente e Espírito.</small></div>
    <div class="passo"><span>3</span><b>Diga o que faz</b><small>Na sua vez, escreva (ou fale) a ação. O Mestre narra o que acontece.</small></div>
    <div class="passo"><span>4</span><b>Role o d20</b><small>Ações arriscadas pedem um dado de 20 faces. A sorte e o seu atributo decidem.</small></div>
  </div>
  <div class="recursos">
    <div><i>🎭</i><b>Mestre com voz</b><small>Narração em áudio, humor e personalidade ajustáveis.</small></div>
    <div><i>🎲</i><b>Dados de verdade</b><small>Críticos, falhas épicas e testes em tempo real.</small></div>
    <div><i>🗝️</i><b>Baús e tesouros</b><small>Procure gavetas, abra baús, ache armas e artefatos.</small></div>
    <div><i>🎯</i><b>Missões</b><small>Cada história tem um objetivo e etapas a cumprir.</small></div>
    <div><i>🎵</i><b>Trilha sonora</b><small>O Mestre escolhe a música e os efeitos de cada cena.</small></div>
    <div><i>💀</i><b>Perigo real</b><small>Personagens podem morrer. Cuidado com o abismo.</small></div>
    <div><i>🤖</i><b>Bots com personalidade</b><small>Até 3 jogadores da IA, cada um com seu jeito e sua voz.</small></div>
    <div><i>🎙️</i><b>Chat da mesa</b><small>Converse com o grupo por texto ou áudio.</small></div>
  </div>
  <h3 class="sec">As doze histórias</h3>
  <div class="sumario">{sumario}</div>
  <p class="dica">💡 <b>Dica de ouro:</b> descreva <i>como</i> você faz, não só <i>o que</i> faz. “Me esgueiro pela sombra do muro, de olho no guarda” rende muito mais que “passo pelo guarda”.</p>
  <div class="rodape"><span>4EVER</span><span>{URL}</span></div>
</section>
{historias}
<section class="pagina final">
  <div class="arte" style="background-image:url('{foto('capa')}')"></div>
  <div class="final-sombra"></div>
  <div class="final-centro">
    <div class="d20">⬢</div>
    <h2>Sua mesa está esperando.</h2>
    <p>Junte o grupo, escolha um mundo e role o primeiro dado.</p>
    <div class="qr grande">{qr}</div>
    <b class="url">{URL}</b>
    <small>Grátis · no navegador · computador ou celular</small>
  </div>
</section>
</body></html>"""


def main():
    preparar_imagens()
    (AQUI / "livreto.html").write_text(montar(), encoding="utf-8")
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        pg.goto((AQUI / "livreto.html").as_uri(), wait_until="networkidle")
        pg.wait_for_timeout(800)
        pg.pdf(path=str(PDF), format="A4", print_background=True,
               margin=dict(top="0", right="0", bottom="0", left="0"))
        b.close()
    print("ok:", PDF)


if __name__ == "__main__":
    main()
