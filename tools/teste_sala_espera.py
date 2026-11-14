#!/usr/bin/env python3
"""Navegador: sala de espera com vitrine da história, trilha do ambiente, som quando alguém entra
e som de início da partida (para todos). Uso: python3 tools/teste_sala_espera.py"""
import json, os, subprocess, tempfile, time, urllib.request
from playwright.sync_api import sync_playwright

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "http://127.0.0.1:3795/"
tmp = tempfile.mkdtemp(); em = os.path.join(tmp, "e.txt"); open(em, "w").close()
procs = [subprocess.Popen(["node", "tools/mocks.js", "3796", "3797", em], cwd=RAIZ, stdout=subprocess.DEVNULL)]
env = dict(os.environ, PORT="3795", HOST="127.0.0.1", RPG_AI_PROXY="", RPG_AI_BASE_URL="http://127.0.0.1:3796", RPG_AI_API_PATH="/v1/messages",
           SMTP_PORT="3797", PUBLIC_URL=BASE.rstrip("/"), RPG_TEMPO_TURNO_MS="600000", RPG_TEMPO_DADO_MS="600000",
           RPG_IMG_BASE_URL="http://127.0.0.1:3796/v1", RPG_IMG_API_KEY="teste", RPG_DATA_DIR=os.path.join(tmp, "data"), ADMIN_EMAILS="adm@t.local")
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
ESPIAO = "window.__efeitos = []; if (!window.__espiao) { window.__espiao = 1; const o = Musica.efeito; Musica.efeito = (n, v) => { window.__efeitos.push(n); return o(n, v); }; } true"
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        def pagina(nome, vp):
            pg = b.new_context(viewport={"width": vp[0], "height": vp[1]}).new_page()
            pg.goto(BASE); pg.evaluate("s => localStorage.setItem('4ever.sessao', JSON.stringify(s))", registrar(nome, f"{nome.lower()}@t.local")); pg.reload()
            pg.wait_for_selector("#grade-aventuras > *")
            pg.evaluate(ESPIAO)
            return pg
        ana = pagina("Ana", (1280, 900)); beto = pagina("Beto", (390, 844))
        ana.locator('#grade-aventuras [data-aventura-id="a-noite-do-boitata"]').click(); ana.locator("#form-criar button[type=submit]").click()
        ana.wait_for_selector("#codigo-exibido:not(:empty)")
        codigo = ana.text_content("#codigo-exibido").strip()
        ana.wait_for_selector("#vitrine-lobby .vitrine-titulo")
        checa("Boitatá" in ana.text_content(".vitrine-titulo") and ana.get_attribute("#vitrine-lobby", "data-amb") == "folclore", "vitrine mostra a história e o ambiente (folclore)")
        checa(ana.evaluate("Musica.atual()") == "folclore-calmo", f"trilha da sala de espera tocando: {ana.evaluate('Musica.atual()')}")
        checa(ana.is_visible("#controle-musica"), "controle de volume aparece na sala de espera")
        ana.wait_for_timeout(5000)
        checa(ana.text_content("#vitrine-gancho").endswith("nome."), "gancho termina de ser digitado")
        checa(len(ana.text_content("#dica-espera")) > 20, "dica girando embaixo do grupo")
        beto.goto(BASE + f"#/sala/{codigo}")
        beto.wait_for_selector("#vitrine-lobby .vitrine-titulo"); beto.evaluate(ESPIAO)
        checa(beto.is_visible("#controle-musica #btn-musica-mudo"), "no celular, o volume aparece no topo da sala de espera")
        ana.wait_for_function("document.querySelectorAll('#lista-grupo .item-grupo').length === 2", timeout=10000); ana.wait_for_timeout(400)
        checa(ana.evaluate("window.__efeitos").count("entrada") == 1, f"Ana ouve o som de entrada quando Beto chega: {ana.evaluate('window.__efeitos')}")
        checa("entrada" not in beto.evaluate("window.__efeitos"), "Beto não ouve a própria entrada")
        for pg, nome in ((ana, "Ana"), (beto, "Beto")):
            pg.wait_for_selector("#grade-classes > *"); pg.locator("#grade-classes > *").first.click(); pg.fill("#personagem-nome", nome); pg.click("#btn-confirmar-personagem")
        ana.wait_for_selector("#btn-iniciar-aventura:not(.escondido):not([disabled])", timeout=15000); ana.wait_for_timeout(1500)
        ana.evaluate("window.scrollTo(0,0)"); beto.evaluate("window.scrollTo(0,0)")
        ana.screenshot(path=f"{OUT}/sala-espera-desktop.png"); beto.screenshot(path=f"{OUT}/sala-espera-celular.png")
        beto.evaluate("document.getElementById('lista-grupo').scrollIntoView()"); beto.screenshot(path=f"{OUT}/sala-espera-celular-grupo.png")
        ana.click("#btn-iniciar-aventura")
        for pg, nome in ((ana, "Ana"), (beto, "Beto")):
            pg.wait_for_selector("#tela-jogo.tela-ativa", timeout=20000); pg.wait_for_timeout(500)
            if pg is beto: checa(beto.evaluate("document.getElementById('controle-musica').closest('#abas-extras') !== null"), "no celular, na mesa o volume volta para a linha das abas")
            checa(pg.evaluate("window.__efeitos").count("inicio") == 1, f"{nome} ouve o som de início da partida: {pg.evaluate('window.__efeitos')}")
finally:
    for pr in procs: pr.terminate()
print("FALHAS:", falhas)
