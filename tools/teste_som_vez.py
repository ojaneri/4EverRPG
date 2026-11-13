#!/usr/bin/env python3
"""Navegador, 2 jogadores: o som de "sua vez" toca só no aparelho de quem recebe a vez, e dá para
escrever a ação antes da vez (o Enviar só libera na vez).
Uso: python3 tools/teste_som_vez.py"""
import json, os, subprocess, tempfile, time, urllib.request
from playwright.sync_api import sync_playwright

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "http://127.0.0.1:3595/"
tmp = tempfile.mkdtemp(); em = os.path.join(tmp, "e.txt"); open(em, "w").close()
procs = [subprocess.Popen(["node", "tools/mocks.js", "3596", "3597", em], cwd=RAIZ, stdout=subprocess.DEVNULL)]
env = dict(os.environ, PORT="3595", HOST="127.0.0.1", RPG_AI_PROXY="", RPG_AI_BASE_URL="http://127.0.0.1:3596", RPG_AI_API_PATH="/v1/messages",
           SMTP_PORT="3597", PUBLIC_URL=BASE.rstrip("/"), RPG_TEMPO_TURNO_MS="600000", RPG_TEMPO_DADO_MS="600000",
           RPG_IMG_BASE_URL="http://127.0.0.1:3596/v1", RPG_IMG_API_KEY="teste", RPG_DATA_DIR=os.path.join(tmp, "data"))
procs.append(subprocess.Popen(["node", "server.js"], cwd=RAIZ, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
for _ in range(100):
    try:
        urllib.request.urlopen(BASE + "api/config"); break
    except Exception:
        time.sleep(0.2)

def registrar(nome, email):
    req = urllib.request.Request(BASE + "api/registrar", data=json.dumps({"email": email, "nome": nome}).encode(), headers={"content-type": "application/json"})
    return json.loads(urllib.request.urlopen(req).read())

ESPIAO = "window.__efeitos = []; const o = Musica.efeito; Musica.efeito = (n, v) => { window.__efeitos.push(n); return o(n, v); }; true"
falhas = 0
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        pags = []
        for nome in ("Ana", "Beto"):
            pg = b.new_context(viewport={"width": 1280, "height": 800}).new_page()
            pg.goto(BASE); pg.evaluate("s => localStorage.setItem('4ever.sessao', JSON.stringify(s))", registrar(nome, f"{nome.lower()}@t.local")); pg.reload()
            pg.wait_for_selector("#grade-aventuras > *")
            pags.append(pg)
        ana, beto = pags
        ana.locator("#grade-aventuras > *").first.click(); ana.locator("#form-criar button[type=submit]").click()
        ana.wait_for_selector("#codigo-exibido:not(:empty)")
        codigo = ana.text_content("#codigo-exibido").strip()
        beto.goto(BASE + f"#/sala/{codigo}")
        for pg, nome in ((ana, "Ana"), (beto, "Beto")):
            pg.wait_for_selector("#grade-classes > *"); pg.locator("#grade-classes > *").first.click(); pg.fill("#personagem-nome", nome); pg.click("#btn-confirmar-personagem")
        ana.wait_for_selector("#btn-iniciar-aventura:not(.escondido):not([disabled])", timeout=15000); ana.wait_for_timeout(800)
        for pg in (ana, beto): pg.evaluate(ESPIAO)
        ana.click("#btn-iniciar-aventura"); ana.wait_for_selector("#tela-jogo .msg.mestre", timeout=20000); ana.wait_for_timeout(1500)
        ana.fill("#input-acao", "Eu olho em volta"); ana.press("#input-acao", "Enter")
        beto.wait_for_function("!document.getElementById('input-acao').disabled", timeout=20000); beto.wait_for_timeout(800)
        e_ana, e_beto = ana.evaluate("window.__efeitos"), beto.evaluate("window.__efeitos")
        print("efeitos Ana:", e_ana, "| efeitos Beto:", e_beto)
        if e_beto.count("sua-vez") != 1: falhas += 1; print("FALHA: Beto deveria ouvir 'sua-vez' uma vez")
        if e_ana.count("sua-vez") != 1: falhas += 1; print("FALHA: Ana ouve só no começo da vez dela (1x), não na vez do Beto")
        # Fora da vez: Ana pode ir escrevendo, mas não consegue enviar.
        estado_ana = ana.evaluate("[document.getElementById('input-acao').disabled, document.querySelector('#form-acao button[type=submit]').disabled, document.getElementById('input-acao').placeholder]")
        print("Ana fora da vez → campo desabilitado?", estado_ana[0], "| Enviar desabilitado?", estado_ana[1], "|", estado_ana[2])
        if estado_ana[0] or not estado_ana[1]: falhas += 1; print("FALHA: campo deveria estar liberado e o Enviar travado")
        ana.fill("#input-acao", "Vou abrir o baú"); ana.press("#input-acao", "Enter"); ana.wait_for_timeout(1200)
        enviou = ana.evaluate("[...document.querySelectorAll('#chat-log .msg.jogador .texto')].some(e => e.textContent.includes('Vou abrir o baú'))")
        if enviou or ana.input_value("#input-acao") != "Vou abrir o baú": falhas += 1; print("FALHA: enviou fora da vez ou perdeu o texto")
        else: print("Ana escreveu adiantado: nada enviado, texto guardado no campo")
        beto.fill("#input-acao", "Eu sigo a Ana"); beto.press("#input-acao", "Enter")
        ana.wait_for_function("!document.getElementById('input-acao').disabled", timeout=20000); ana.wait_for_timeout(800)
        e_ana, e_beto = ana.evaluate("window.__efeitos"), beto.evaluate("window.__efeitos")
        print("depois da vez do Beto → Ana:", e_ana.count("sua-vez"), "x | Beto:", e_beto.count("sua-vez"), "x")
        if e_ana.count("sua-vez") != 2 or e_beto.count("sua-vez") != 1: falhas += 1; print("FALHA: contagem errada")
        if ana.input_value("#input-acao") != "Vou abrir o baú": falhas += 1; print("FALHA: o texto adiantado sumiu quando a vez chegou")
        ana.press("#input-acao", "Enter"); ana.wait_for_timeout(1500)
        if not ana.evaluate("[...document.querySelectorAll('#chat-log .msg.jogador .texto')].some(e => e.textContent.includes('Vou abrir o baú'))"): falhas += 1; print("FALHA: na vez dela, o texto adiantado não foi enviado")
        else: print("na vez da Ana, o texto adiantado foi enviado com Enter")
        b.close()
finally:
    for pr in procs: pr.kill()
print("Tudo certo." if not falhas else f"{falhas} FALHA(S)")
