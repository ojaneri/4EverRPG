#!/usr/bin/env python3
"""Navegador: quem rolou o log ou o chat para cima não é puxado por mensagens novas; aparece
"⬇ N novas" e o clique leva ao fim. Quem está no fim continua acompanhando.
Uso: python3 tools/teste_mensagens_novas.py"""
import json, os, subprocess, tempfile, time, urllib.request
from playwright.sync_api import sync_playwright

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "http://127.0.0.1:4095/"
tmp = tempfile.mkdtemp(); em = os.path.join(tmp, "e.txt"); open(em, "w").close()
procs = [subprocess.Popen(["node", "tools/mocks.js", "4096", "4097", em], cwd=RAIZ, stdout=subprocess.DEVNULL)]
env = dict(os.environ, PORT="4095", HOST="127.0.0.1", RPG_AI_PROXY="", RPG_AI_BASE_URL="http://127.0.0.1:4096", RPG_AI_API_PATH="/v1/messages",
           SMTP_PORT="4097", PUBLIC_URL=BASE.rstrip("/"), RPG_TEMPO_TURNO_MS="600000", RPG_TEMPO_DADO_MS="600000",
           RPG_IMG_BASE_URL="http://127.0.0.1:4096/v1", RPG_IMG_API_KEY="teste", RPG_DATA_DIR=os.path.join(tmp, "data"), ADMIN_EMAILS="adm@t.local")
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
FIM = "(id => { const c = document.getElementById(id); return c.scrollHeight - c.scrollTop - c.clientHeight < 80; })"
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        def pagina(nome, vp):
            pg = b.new_context(viewport={"width": vp[0], "height": vp[1]}).new_page()
            pg.goto(BASE); pg.evaluate("s => localStorage.setItem('4ever.sessao', JSON.stringify(s))", registrar(nome, f"{nome.lower()}@t.local")); pg.reload()
            pg.wait_for_selector("#grade-aventuras > *")
            return pg
        ana = pagina("Ana", (1280, 800)); beto = pagina("Beto", (390, 470))
        ana.locator("#grade-aventuras > *").first.click(); ana.locator("#form-criar button[type=submit]").click()
        ana.wait_for_selector("#codigo-exibido:not(:empty)"); codigo = ana.text_content("#codigo-exibido").strip()
        beto.goto(BASE + f"#/sala/{codigo}")
        for pg, nome in ((ana, "Ana"), (beto, "Beto")):
            pg.wait_for_selector("#grade-classes > *"); pg.locator("#grade-classes > *").first.click(); pg.fill("#personagem-nome", nome); pg.click("#btn-confirmar-personagem")
        ana.wait_for_selector("#btn-iniciar-aventura:not(.escondido):not([disabled])", timeout=15000); ana.wait_for_timeout(500); ana.click("#btn-iniciar-aventura")
        for pg in (ana, beto): pg.wait_for_selector("#tela-jogo.tela-ativa", timeout=20000)
        ana.wait_for_timeout(1500)
        # Ana escreve várias mensagens no chat para a lista ficar comprida.
        for k in range(14):
            ana.fill("#chat-lateral-texto", f"mensagem antiga {k} com um texto um pouco maior para ocupar espaço"); ana.press("#chat-lateral-texto", "Enter"); ana.wait_for_timeout(60)
        ana.wait_for_timeout(800)
        # --- Log da mesa (Beto no celular) ---
        rolavel = beto.evaluate("(() => { const c = document.getElementById('chat-log'); return c.scrollHeight > c.clientHeight + 100; })()")
        checa(rolavel, "log do Beto tem conteúdo para rolar")
        beto.evaluate("document.getElementById('chat-log').scrollTop = 0"); beto.wait_for_timeout(300)
        ana.fill("#input-acao", "Eu bato na porta da anciã"); ana.press("#input-acao", "Enter")
        beto.wait_for_selector(".envoltorio-rolagem > .btn-novas:not(.escondido)", timeout=20000); beto.wait_for_timeout(1500)
        topo = beto.evaluate("document.getElementById('chat-log').scrollTop")
        rotulo = beto.text_content("#chat-log + .btn-novas")
        checa(topo < 5, f"Beto, lendo lá em cima, não é puxado (scrollTop={topo})")
        checa("nova" in rotulo, f"aparece o contador: {rotulo!r}")
        beto.screenshot(path=f"{OUT}/novas-log-celular.png")
        beto.click("#chat-log + .btn-novas"); beto.wait_for_timeout(1200)
        checa(beto.evaluate(FIM + "('chat-log')") and beto.is_hidden("#chat-log + .btn-novas"), "clicar no contador leva à última mensagem e o contador some")
        # Ana no fim acompanha sozinha (a ação do Beto é narrada).
        checa(ana.evaluate(FIM + "('chat-log')"), "Ana, que estava no fim, continua no fim")
        # --- Chat (Beto na aba Chat) ---
        beto.click("#abas-mesa [data-aba=chat]"); beto.wait_for_timeout(500)
        beto.evaluate("document.getElementById('chat-lateral-lista').scrollTop = 0"); beto.wait_for_timeout(300)
        for k in range(3):
            ana.fill("#chat-lateral-texto", f"nova {k}"); ana.press("#chat-lateral-texto", "Enter"); ana.wait_for_timeout(100)
        beto.wait_for_selector("#chat-lateral-lista + .btn-novas:not(.escondido)", timeout=5000); beto.wait_for_timeout(300)
        r = beto.text_content("#chat-lateral-lista + .btn-novas")
        checa(beto.evaluate("document.getElementById('chat-lateral-lista').scrollTop") < 5 and "3 novas" in r, f"no Chat, Beto lá em cima vê {r!r} sem ser puxado")
        beto.screenshot(path=f"{OUT}/novas-chat-celular.png")
        beto.fill("#chat-lateral-texto", "minha resposta"); beto.press("#chat-lateral-texto", "Enter"); beto.wait_for_timeout(1000)
        checa(beto.evaluate(FIM + "('chat-lateral-lista')") and beto.is_hidden("#chat-lateral-lista + .btn-novas"), "mandar mensagem leva quem mandou para o fim")
        ana.wait_for_timeout(300)
        checa(ana.evaluate(FIM + "('chat-lateral-lista')"), "Ana no fim do chat acompanha as novas")
finally:
    for pr in procs: pr.terminate()
print("FALHAS:", falhas)
