#!/usr/bin/env python3
"""Navegador: falas entre aspas nas ações dos jogadores ficam em destaque (negrito serifado na cor
do personagem, com aspas curvas). Uso: python3 tools/teste_falas.py"""
import json, os, subprocess, tempfile, time, urllib.request
from playwright.sync_api import sync_playwright

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "http://127.0.0.1:4195/"
tmp = tempfile.mkdtemp(); em = os.path.join(tmp, "e.txt"); open(em, "w").close()
procs = [subprocess.Popen(["node", "tools/mocks.js", "4196", "4197", em], cwd=RAIZ, stdout=subprocess.DEVNULL)]
env = dict(os.environ, PORT="4195", HOST="127.0.0.1", RPG_AI_PROXY="", RPG_AI_BASE_URL="http://127.0.0.1:4196", RPG_AI_API_PATH="/v1/messages",
           SMTP_PORT="4197", PUBLIC_URL=BASE.rstrip("/"), RPG_TEMPO_TURNO_MS="600000", RPG_TEMPO_DADO_MS="600000",
           RPG_IMG_BASE_URL="http://127.0.0.1:4196/v1", RPG_IMG_API_KEY="teste", RPG_DATA_DIR=os.path.join(tmp, "data"), ADMIN_EMAILS="adm@t.local")
procs.append(subprocess.Popen(["node", "server.js"], cwd=RAIZ, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
for _ in range(100):
    try:
        urllib.request.urlopen(BASE + "api/config"); break
    except Exception:
        time.sleep(0.2)

def registrar(nome, email):
    req = urllib.request.Request(BASE + "api/registrar", data=json.dumps({"email": email, "nome": nome}).encode(), headers={"content-type": "application/json"})
    return json.loads(urllib.request.urlopen(req).read())


SAIDA = os.environ.get("SAIDA", tmp)
nonlocal_f = [0]
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        def pagina(nome, vp):
            pg = b.new_context(viewport={"width": vp[0], "height": vp[1]}, device_scale_factor=2).new_page()
            pg.goto(BASE); pg.evaluate("s => localStorage.setItem('4ever.sessao', JSON.stringify(s))", registrar(nome, f"{nome.lower()}@t.local")); pg.reload()
            pg.wait_for_selector("#grade-aventuras > *")
            return pg
        ana = pagina("Ana", (1280, 800)); beto = pagina("Beto", (390, 760))
        ana.locator("#grade-aventuras > *").first.click(); ana.locator("#form-criar button[type=submit]").click()
        ana.wait_for_selector("#codigo-exibido:not(:empty)"); codigo = ana.text_content("#codigo-exibido").strip()
        beto.goto(BASE + f"#/sala/{codigo}")
        for pg, nome, cls in ((ana, "Kiti Kura", 2), (beto, "Mendigo Heroi", 0)):
            pg.wait_for_selector("#grade-classes > *"); pg.locator("#grade-classes > *").nth(cls).click(); pg.fill("#personagem-nome", nome); pg.click("#btn-confirmar-personagem")
        ana.wait_for_selector("#btn-iniciar-aventura:not(.escondido):not([disabled])", timeout=15000); ana.wait_for_timeout(500); ana.click("#btn-iniciar-aventura")
        for pg in (ana, beto): pg.wait_for_selector("#tela-jogo.tela-ativa", timeout=20000)
        ana.wait_for_timeout(1500)
        def fecha(pg):
            if pg.is_visible("#modal-dado"):
                pg.wait_for_selector("#btn-fechar-dado:not([disabled])", timeout=15000); pg.click("#btn-fechar-dado")
        ana.fill("#input-acao", 'Eu olho pra todos e falo "Agora vamos quebrar o pau!" e saco o cajado'); ana.press("#input-acao", "Enter")
        beto.wait_for_function("!document.getElementById('input-acao').disabled && document.querySelector('#form-acao button[type=submit]') && !document.querySelector('#form-acao button[type=submit]').disabled", timeout=25000)
        fecha(ana); fecha(beto)
        beto.fill("#input-acao", 'Coço a barba e respondo “Calma, gente. Primeiro a gente conversa.” enquanto olho a porta'); beto.press("#input-acao", "Enter")
        ana.wait_for_timeout(4000); fecha(ana); fecha(beto)
        falhas = 0
        def checa(cond, msg):
            nonlocal_f[0] += 0 if cond else 1
            print(("OK   " if cond else "FALHA ") + msg)
        for pg, disp in ((ana, "desktop"), (beto, "celular")):
            if disp == "celular": pg.click("#abas-mesa [data-aba=mesa]", force=True)
            pg.evaluate("rolarLogParaFim()"); pg.wait_for_timeout(600)
            falas = pg.evaluate("""[...document.querySelectorAll('#chat-log .msg.jogador .fala')].map(f => ({ t: f.textContent, cor: getComputedStyle(f).color, antes: getComputedStyle(f, '::before').content, peso: getComputedStyle(f).fontWeight }))""")
            print(disp, falas)
            checa(len(falas) == 2 and falas[0]["t"] == "Agora vamos quebrar o pau!" and falas[1]["t"] == "Calma, gente. Primeiro a gente conversa.", f"[{disp}] as duas falas (aspas retas e curvas) são reconhecidas")
            checa(len(falas) == 2 and falas[0]["cor"] != falas[1]["cor"] and all(int(f["peso"]) >= 700 for f in falas), f"[{disp}] cada fala em negrito na cor do seu personagem")
            checa(all("“" in f["antes"] for f in falas), f"[{disp}] aspas curvas desenhadas antes da fala")
            mestre = pg.evaluate("document.querySelectorAll('#chat-log .msg.mestre .fala').length")
            checa(mestre == 0, f"[{disp}] narração do Mestre não muda")
            pg.locator("#chat-log").screenshot(path=f"{SAIDA}/falas-{disp}.png")
finally:
    for pr in procs: pr.terminate()
print("FALHAS:", nonlocal_f[0])
