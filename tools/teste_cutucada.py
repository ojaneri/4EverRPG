#!/usr/bin/env python3
"""Navegador: cutucada. Clicar no cartão de outro jogador faz o cartão dele balançar com 👉 (para quem
cutucou) e o cartão de quem cutucou balançar para quem foi cutucado, por 5 s; 1 por rodada.
Uso: python3 tools/teste_cutucada.py"""
import json, os, subprocess, tempfile, time, urllib.request
from playwright.sync_api import sync_playwright

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "http://127.0.0.1:3995/"
tmp = tempfile.mkdtemp(); em = os.path.join(tmp, "e.txt"); open(em, "w").close()
procs = [subprocess.Popen(["node", "tools/mocks.js", "3996", "3997", em], cwd=RAIZ, stdout=subprocess.DEVNULL)]
env = dict(os.environ, PORT="3995", HOST="127.0.0.1", RPG_AI_PROXY="", RPG_AI_BASE_URL="http://127.0.0.1:3996", RPG_AI_API_PATH="/v1/messages",
           SMTP_PORT="3997", PUBLIC_URL=BASE.rstrip("/"), RPG_TEMPO_TURNO_MS="600000", RPG_TEMPO_DADO_MS="600000",
           RPG_IMG_BASE_URL="http://127.0.0.1:3996/v1", RPG_IMG_API_KEY="teste", RPG_DATA_DIR=os.path.join(tmp, "data"), ADMIN_EMAILS="adm@t.local")
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
            pg.goto(BASE); pg.evaluate("s => localStorage.setItem('4ever.sessao', JSON.stringify(s))", registrar(nome, f"{nome.lower()}@t.local")); pg.reload()
            pg.wait_for_selector("#grade-aventuras > *")
            return pg
        ana = pagina("Ana", (1280, 800)); beto = pagina("Beto", (390, 844))
        ana.locator("#grade-aventuras > *").first.click(); ana.locator("#form-criar button[type=submit]").click()
        ana.wait_for_selector("#codigo-exibido:not(:empty)"); codigo = ana.text_content("#codigo-exibido").strip()
        beto.goto(BASE + f"#/sala/{codigo}")
        for pg, nome in ((ana, "Ana"), (beto, "Beto")):
            pg.wait_for_selector("#grade-classes > *"); pg.locator("#grade-classes > *").first.click(); pg.fill("#personagem-nome", nome); pg.click("#btn-confirmar-personagem")
        ana.wait_for_selector("#btn-iniciar-aventura:not(.escondido):not([disabled])", timeout=15000); ana.wait_for_timeout(500); ana.click("#btn-iniciar-aventura")
        for pg in (ana, beto): pg.wait_for_selector("#tela-jogo.tela-ativa", timeout=20000)
        ana.wait_for_timeout(1500)
        if ana.is_visible("#modal-dado"): ana.click("#btn-fechar-dado")
        checa(ana.locator("#painel-grupo .cartao-personagem-mini.cutucavel").count() == 1, "só o cartão do outro jogador é clicável para cutucar")
        ana.locator("#painel-grupo .cartao-personagem-mini.cutucavel .topo").click()
        ana.wait_for_selector("#painel-grupo .cartao-personagem-mini.cutucado .dedo-cutucada", timeout=5000)
        checa("Beto" in ana.text_content("#painel-grupo .cutucado"), "Ana vê o cartão do Beto balançando com 👉")
        beto.click("#abas-mesa [data-aba=grupo]")
        beto.wait_for_selector("#painel-grupo .cartao-personagem-mini.cutucado .dedo-cutucada", timeout=5000)
        checa("Ana" in beto.text_content("#painel-grupo .cutucado"), "Beto vê o cartão da Ana balançando com 👉")
        checa("cutucou você" in beto.text_content("#pilha-avisos"), "Beto recebe o aviso de que foi cutucado")
        ana.screenshot(path=f"{OUT}/cutucada-desktop.png"); beto.screenshot(path=f"{OUT}/cutucada-celular.png")
        ana.wait_for_timeout(5600)
        checa(ana.locator(".cutucado").count() == 0 and beto.locator(".cutucado").count() == 0, "o balanço some depois de 5 s nos dois lados")
        ana.locator("#painel-grupo .cartao-personagem-mini.cutucavel .topo").click(); ana.wait_for_timeout(600)
        checa("nesta rodada" in ana.text_content("#pilha-avisos") and ana.locator(".cutucado").count() == 0, "segunda cutucada na mesma rodada mostra aviso e não balança")
finally:
    for pr in procs: pr.terminate()
print("FALHAS:", falhas)
