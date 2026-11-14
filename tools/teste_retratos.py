#!/usr/bin/env python3
"""Navegador: retratos ilustrados. Escolha do retrato na criação (filtro por gênero), carta na sala de
espera, cartão do grupo, chat, destaque da vez, dado e ranking final (vivos por XP, mortos por último).
Uso: python3 tools/teste_retratos.py   (SAIDA=pasta para guardar as capturas)"""
import json, os, subprocess, tempfile, time, urllib.request
from playwright.sync_api import sync_playwright

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "http://127.0.0.1:3985/"
tmp = tempfile.mkdtemp(); em = os.path.join(tmp, "e.txt"); open(em, "w").close()
procs = [subprocess.Popen(["node", "tools/mocks.js", "3986", "3987", em], cwd=RAIZ, stdout=subprocess.DEVNULL)]
env = dict(os.environ, PORT="3985", HOST="127.0.0.1", RPG_AI_PROXY="", RPG_AI_BASE_URL="http://127.0.0.1:3986", RPG_AI_API_PATH="/v1/messages",
           SMTP_PORT="3987", PUBLIC_URL=BASE.rstrip("/"), RPG_TEMPO_TURNO_MS="600000", RPG_TEMPO_DADO_MS="600000",
           RPG_IMG_BASE_URL="http://127.0.0.1:3986/v1", RPG_IMG_API_KEY="teste", RPG_IMG_RESERVA_URL="http://127.0.0.1:3986/v1",
           RPG_DATA_DIR=os.path.join(tmp, "data"), ADMIN_EMAILS="adm@t.local")
procs.append(subprocess.Popen(["node", "server.js"], cwd=RAIZ, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
for _ in range(100):
    try:
        urllib.request.urlopen(BASE + "api/config"); break
    except Exception:
        time.sleep(0.2)

def registrar(nome, email):
    req = urllib.request.Request(BASE + "api/registrar", data=json.dumps({"email": email, "nome": nome}).encode(), headers={"content-type": "application/json"})
    return json.loads(urllib.request.urlopen(req).read())

falhas = 0
def checa(cond, msg):
    global falhas
    print(("OK   " if cond else "FALHA ") + msg)
    if not cond: falhas += 1
OUT = os.environ.get("SAIDA", tmp)
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        def pagina(nome, vp):
            pg = b.new_context(viewport={"width": vp[0], "height": vp[1]}).new_page()
            pg.on("dialog", lambda d: d.accept())
            pg.goto(BASE); pg.evaluate("s => localStorage.setItem('4ever.sessao', JSON.stringify(s))", registrar(nome, f"{nome.lower()}@t.local")); pg.reload()
            pg.wait_for_selector("#grade-aventuras > *")
            return pg
        ana = pagina("Ana", (1280, 860)); beto = pagina("Beto", (390, 844))
        ana.locator("#grade-aventuras > *").first.click(); ana.locator("#form-criar button[type=submit]").click()
        ana.wait_for_selector("#codigo-exibido:not(:empty)"); codigo = ana.text_content("#codigo-exibido").strip()
        beto.goto(BASE + f"#/sala/{codigo}")
        # Ana: Arcanista, filtra Feminino e escolhe a 2ª opção.
        ana.wait_for_selector("#grade-classes > *"); ana.locator("#grade-classes > [data-classe-id=arcanista]").click()
        ana.wait_for_selector("#campo-retrato:not(.escondido) .opcao-retrato")
        checa(ana.locator("#seletor-retrato .opcao-retrato").count() == 6, "criação: 6 retratos da classe")
        ana.click("#filtro-retrato [data-genero=feminino]")
        checa(ana.locator("#seletor-retrato .opcao-retrato").count() == 3, "filtro Feminino mostra 3")
        ana.locator("#seletor-retrato .opcao-retrato").nth(1).click()
        escolhido = ana.get_attribute("#seletor-retrato .opcao-retrato.escolhido", "data-id")
        checa(escolhido == "arcanista-f2", f"Ana escolheu arcanista-f2 ({escolhido})")
        ana.screenshot(path=f"{OUT}/retrato-criacao.png", full_page=False)
        ana.fill("#personagem-nome", "Ana"); ana.click("#btn-confirmar-personagem")
        # Beto: Guerreiro com o retrato sugerido.
        beto.wait_for_selector("#grade-classes > *"); beto.locator("#grade-classes > [data-classe-id=guerreiro]").click()
        beto.wait_for_selector("#seletor-retrato .opcao-retrato.escolhido")
        beto.fill("#personagem-nome", "Beto"); beto.click("#btn-confirmar-personagem")
        ana.wait_for_selector("#lista-grupo .item-grupo.com-retrato .carta-retrato img", timeout=10000)
        ana.wait_for_timeout(700)
        checa(ana.locator("#lista-grupo .carta-retrato img").count() == 2, "sala de espera: carta com retrato para cada jogador")
        checa("arcanista-f2" in (ana.get_attribute("#lista-grupo .item-grupo.com-retrato .carta-retrato img", "src") or ""), "a carta da Ana usa o retrato escolhido")
        ana.screenshot(path=f"{OUT}/retrato-espera.png")
        ana.wait_for_selector("#btn-iniciar-aventura:not(.escondido):not([disabled])", timeout=15000); ana.wait_for_timeout(400); ana.click("#btn-iniciar-aventura")
        for pg in (ana, beto): pg.wait_for_selector("#tela-jogo.tela-ativa", timeout=20000)
        ana.wait_for_timeout(1200)
        checa(ana.locator("#painel-grupo .avatar.com-retrato img").count() == 2, "cartões do grupo com retrato")
        checa(ana.is_visible("#destaque-vez .avatar.com-retrato img"), "destaque da vez aparece com o retrato")
        vez = ana.text_content("#destaque-vez strong")
        checa(vez in ("Ana", "Beto"), f"destaque mostra quem tem a vez ({vez})")
        checa("compacto" not in ana.get_attribute("#destaque-vez", "class"), "destaque começa grande")
        ana.screenshot(path=f"{OUT}/retrato-destaque-grande.png")
        ana.wait_for_timeout(4300)
        checa("compacto" in ana.get_attribute("#destaque-vez", "class"), "depois de 4 s vira selo compacto")
        def quem_joga():
            return ana if ana.text_content("#destaque-vez strong") == "Ana" else beto
        def agir(pg, texto):
            pg.click("#abas-mesa [data-aba=mesa]", force=True) if pg is beto else None
            pg.wait_for_selector("#form-acao button[type=submit]:not([disabled])", timeout=15000)
            pg.fill("#input-acao", texto); pg.click("#form-acao button[type=submit]")
        primeiro = quem_joga(); segundo = beto if primeiro is ana else ana
        agir(primeiro, "Eu ataco a criatura")
        primeiro.wait_for_selector("#area-teste:not(.escondido)", timeout=15000)
        checa(primeiro.locator("#retrato-teste img").count() == 1, "área do teste mostra o retrato de quem rola")
        primeiro.click("#btn-rolar-dado")
        primeiro.wait_for_selector("#modal-dado-retrato:not(.escondido) img", timeout=10000)
        primeiro.wait_for_selector("#btn-fechar-dado:not([disabled])", timeout=20000)
        cls = primeiro.get_attribute("#modal-dado-retrato", "class")
        checa(any(k in cls for k in ("sucesso", "falha")), f"modal do dado: retrato reage ao resultado ({cls})")
        primeiro.screenshot(path=f"{OUT}/retrato-dado.png")
        primeiro.click("#btn-fechar-dado")
        ana.wait_for_selector("#chat-log .msg.jogador .avatar.com-retrato img", timeout=10000)
        checa(True, "chat: ação do jogador com o retrato")
        # Segundo jogador morre.
        segundo.wait_for_timeout(1500)
        agir(segundo, "Eu pulo no abismo")
        ana.wait_for_selector("#painel-grupo .cartao-personagem-mini.morto", timeout=15000)
        ana.screenshot(path=f"{OUT}/retrato-mesa.png")
        beto.screenshot(path=f"{OUT}/retrato-mesa-celular.png")
        # Encerrar: ranking com vivos por XP e mortos por último.
        ana.click("#btn-encerrar")
        ana.wait_for_selector("#modal-fim:not(.escondido) .rank-linha", timeout=20000)
        linhas = ana.locator("#xp-fim .rank-linha")
        checa(linhas.count() == 2, "fim: uma linha por personagem")
        checa("rank-destaque" in linhas.nth(0).get_attribute("class") and "rank-morto" in linhas.nth(1).get_attribute("class"), "fim: vivo em destaque no topo, morto por último")
        checa(ana.locator("#xp-fim .rank-titulo-mortos").count() == 1, "fim: seção dos tombados")
        checa(ana.locator("#xp-fim .avatar.com-retrato img").count() == 2, "fim: ranking com retratos")
        ana.locator("#modal-fim .modal-fim").screenshot(path=f"{OUT}/retrato-fim.png")
finally:
    for pr in procs: pr.terminate()
print("FALHAS:", falhas)
