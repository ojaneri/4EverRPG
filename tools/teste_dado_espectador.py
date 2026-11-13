#!/usr/bin/env python3
"""Navegador: quem assiste a rolagem de outro jogador (aqui, um bot) vê o modal fechar sozinho
quando o dono do dado continua. Uso: python3 tools/teste_dado_espectador.py"""
import json, os, subprocess, tempfile, time, urllib.request
from playwright.sync_api import sync_playwright
RAIZ = "/var/www/html/admin.janeri.com.br/4everrpg"; BASE = "http://127.0.0.1:3495/"
tmp = tempfile.mkdtemp(); em = os.path.join(tmp, "e.txt"); open(em, "w").close()
procs = [subprocess.Popen(["node", "tools/mocks.js", "3496", "3497", em], cwd=RAIZ, stdout=subprocess.DEVNULL, env=dict(os.environ, MOCK_ATRASO_MS="15000"))]
env = dict(os.environ, PORT="3495", HOST="127.0.0.1", RPG_AI_PROXY="", RPG_AI_BASE_URL="http://127.0.0.1:3496", RPG_AI_API_PATH="/v1/messages",
           SMTP_PORT="3497", PUBLIC_URL=BASE.rstrip("/"), RPG_TEMPO_TURNO_MS="600000", RPG_TEMPO_DADO_MS="600000",
           RPG_IMG_BASE_URL="http://127.0.0.1:3496/v1", RPG_IMG_API_KEY="teste", RPG_BOT_ESPERA_MS="500", RPG_BOT_ESPERA_DADO_MS="500",
           RPG_DATA_DIR=os.path.join(tmp, "data"))
procs.append(subprocess.Popen(["node", "server.js"], cwd=RAIZ, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
for _ in range(100):
    try: urllib.request.urlopen(BASE + "api/config"); break
    except Exception: time.sleep(0.2)
req = urllib.request.Request(BASE + "api/registrar", data=json.dumps({"email": "o@t.local", "nome": "Olho"}).encode(), headers={"content-type": "application/json"})
sessao = json.loads(urllib.request.urlopen(req).read())
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1280, "height": 800})
        pg.goto(BASE); pg.evaluate("s => localStorage.setItem('4ever.sessao', JSON.stringify(s))", sessao); pg.reload()
        pg.wait_for_selector("#grade-aventuras > *"); pg.locator("#grade-aventuras > *").first.click()
        pg.select_option("#criar-bots", "1"); pg.locator("#form-criar button[type=submit]").click()
        pg.wait_for_selector("#grade-classes > *"); pg.locator("#grade-classes > *").first.click(); pg.fill("#personagem-nome", "Olho")
        pg.click("#btn-confirmar-personagem")
        pg.wait_for_selector("#btn-iniciar-aventura:not(.escondido):not([disabled])", timeout=15000); pg.wait_for_timeout(800)
        pg.click("#btn-iniciar-aventura"); pg.wait_for_selector("#tela-jogo .msg.mestre", timeout=20000); pg.wait_for_timeout(800)
        pg.fill("#input-acao", "Eu sigo pela trilha"); pg.press("#input-acao", "Enter")
        # o bot ataca -> teste -> rola: modal abre aqui como espectador
        pg.wait_for_selector("#modal-dado:not(.escondido)", timeout=20000)
        t0 = time.time()
        pg.wait_for_function("document.getElementById('btn-fechar-dado').textContent === 'Fechar'", timeout=10000)
        print("espectador vê:", pg.text_content("#modal-dado-pausa"), "| botão:", pg.text_content("#btn-fechar-dado"))
        pg.screenshot(path=os.path.join(tmp, "espectador.png"))
        pg.wait_for_selector("#modal-dado.escondido", state="attached", timeout=15000)
        dt = time.time() - t0
        print(f"modal fechou sozinho após {dt:.1f}s (o Mestre leva 15 s para narrar; o bot continua ~6 s após rolar)")
        if dt > 10: raise SystemExit("FALHA: o modal esperou a narração do Mestre")
        print("Tudo certo.")
        b.close()
finally:
    for pr in procs: pr.kill()
