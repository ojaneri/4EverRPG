#!/usr/bin/env python3
"""Navegador: o admin abre "Observar partidas", assiste uma mesa privada sem aparecer e sem controles.
Uso: python3 tools/teste_observador.py"""
import json, os, subprocess, tempfile, time, urllib.request
from playwright.sync_api import sync_playwright

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "http://127.0.0.1:3695/"
tmp = tempfile.mkdtemp(); em = os.path.join(tmp, "e.txt"); open(em, "w").close()
procs = [subprocess.Popen(["node", "tools/mocks.js", "3696", "3697", em], cwd=RAIZ, stdout=subprocess.DEVNULL)]
env = dict(os.environ, PORT="3695", HOST="127.0.0.1", RPG_AI_PROXY="", RPG_AI_BASE_URL="http://127.0.0.1:3696", RPG_AI_API_PATH="/v1/messages",
           SMTP_PORT="3697", PUBLIC_URL=BASE.rstrip("/"), RPG_TEMPO_TURNO_MS="600000", RPG_TEMPO_DADO_MS="600000",
           RPG_IMG_BASE_URL="http://127.0.0.1:3696/v1", RPG_IMG_API_KEY="teste", RPG_DATA_DIR=os.path.join(tmp, "data"), ADMIN_EMAILS="adm@t.local")
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
        sessoes = {}
        def pagina(nome, email, vp=(1280, 800)):
            pg = b.new_context(viewport={"width": vp[0], "height": vp[1]}).new_page()
            sessoes.setdefault(email, None) or sessoes.__setitem__(email, registrar(nome, email))
            pg.goto(BASE); pg.evaluate("s => localStorage.setItem('4ever.sessao', JSON.stringify(s))", sessoes[email]); pg.reload()
            pg.wait_for_selector("#grade-aventuras > *")
            return pg
        ana = pagina("Ana", "ana@t.local")
        checa(ana.is_hidden("#link-observar"), "jogadora comum não vê o menu Observar")
        ana.locator("#grade-aventuras > *").first.click(); ana.locator("#form-criar button[type=submit]").click()
        ana.wait_for_selector("#codigo-exibido:not(:empty)")
        codigo = ana.text_content("#codigo-exibido").strip()
        ana.wait_for_selector("#grade-classes > *"); ana.locator("#grade-classes > *").first.click(); ana.fill("#personagem-nome", "Ana"); ana.click("#btn-confirmar-personagem")
        ana.wait_for_selector("#btn-iniciar-aventura:not(.escondido):not([disabled])", timeout=15000); ana.wait_for_timeout(500)
        ana.click("#btn-iniciar-aventura"); ana.wait_for_selector("#tela-jogo .msg.mestre", timeout=20000)
        for nome, vp in (("desktop", (1280, 800)), ("celular", (390, 844))):
            adm = pagina("Chefe", "adm@t.local", vp)
            if vp[0] > 1000: checa(adm.is_visible("#link-observar"), "admin vê o menu 👁 Observar")
            adm.goto(BASE + "#/observar"); adm.wait_for_selector("#lista-observar .cartao-jogo")
            checa(codigo in adm.text_content("#lista-observar") and "privada" in adm.text_content("#lista-observar"), "lista mostra a mesa privada")
            adm.screenshot(path=f"{OUT}/observar-lista-{nome}.png")
            adm.locator("#lista-observar .cartao-jogo").first.click()
            adm.wait_for_selector("#tela-jogo.tela-ativa #chat-log .msg.mestre", timeout=10000); adm.wait_for_timeout(600)
            checa(adm.is_visible("#faixa-observando"), f"[{nome}] faixa de modo observador aparece")
            checa(adm.is_hidden("#form-acao") and adm.is_hidden("#form-chat-lateral") and adm.is_hidden(".linha-ferramentas"), f"[{nome}] sem campo de ação, chat ou ferramentas")
            checa(adm.evaluate("location.hash") == f"#/observar/{codigo}", f"[{nome}] rota fica em #/observar/{codigo}")
            adm.screenshot(path=f"{OUT}/observar-mesa-{nome}.png")
            ana.fill("#input-acao", f"Eu acendo uma tocha {nome}"); ana.press("#input-acao", "Enter")
            adm.wait_for_function(f"document.getElementById('chat-log').textContent.includes('tocha {nome}')", timeout=15000)
            checa(True, f"[{nome}] observador vê a ação da Ana ao vivo")
            ana.wait_for_function("!document.getElementById('mestre-digitando') || document.getElementById('mestre-digitando').classList.contains('escondido')", timeout=20000)
            ana.wait_for_timeout(1500)
            grupo = ana.text_content("#painel-grupo")
            checa("Chefe" not in grupo, "Ana não vê o admin no grupo")
            if nome == "celular":
                adm.on("dialog", lambda d: d.accept())
                adm.click("#faixa-observando [data-admin=encerrar]")
                ana.wait_for_selector("#faixa-encerrada:not(.escondido)", timeout=20000)
                checa("administração" in ana.text_content("#chat-log"), "admin encerra pela mesa observada; Ana vê a mesa encerrada")
                adm.goto(BASE + "#/observar"); adm.wait_for_timeout(800)
                checa(codigo not in adm.text_content("#lista-observar"), "mesa encerrada sai da lista de partidas em andamento")
                # nova mesa para apagar pela lista
                ana.goto(BASE + "#/"); ana.wait_for_selector("#grade-aventuras > *")
                ana.locator("#grade-aventuras > *").first.click(); ana.locator("#form-criar button[type=submit]").click()
                ana.wait_for_selector("#codigo-exibido:not(:empty)"); ana.wait_for_timeout(500)
                cod2 = ana.text_content("#codigo-exibido").strip()
                adm.reload(); adm.wait_for_selector(f'#lista-observar [data-admin=apagar][data-codigo="{cod2}"]')
                adm.click(f'#lista-observar [data-admin=apagar][data-codigo="{cod2}"]')
                ana.wait_for_function("location.hash === '#/'", timeout=10000); ana.wait_for_timeout(300)
                checa("apagada" in ana.text_content("#erro-inicio"), f"admin apaga pela lista; Ana volta ao início com aviso: {ana.text_content('#erro-inicio')!r}")
                adm.wait_for_timeout(500)
                checa(cod2 not in adm.text_content("#lista-observar") and adm.evaluate("location.hash") == "#/observar", "mesa apagada some da lista do admin")
            adm.context.close()
        ana.wait_for_timeout(500)
        if ana.is_visible("#modal-dado"): ana.click("#btn-fechar-dado")
finally:
    for pr in procs: pr.terminate()
print("FALHAS:", falhas)
