#!/usr/bin/env python3
"""Navegador: avisos curtos do sistema em sequência (XP etc.) ficam lado a lado no log.
Uso: python3 tools/teste_avisos_inline.py"""
import json, os, subprocess, tempfile, time, urllib.request
from playwright.sync_api import sync_playwright

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "http://127.0.0.1:3895/"
tmp = tempfile.mkdtemp(); em = os.path.join(tmp, "e.txt"); open(em, "w").close()
procs = [subprocess.Popen(["node", "tools/mocks.js", "3896", "3897", em], cwd=RAIZ, stdout=subprocess.DEVNULL)]
env = dict(os.environ, PORT="3895", HOST="127.0.0.1", RPG_AI_PROXY="", RPG_AI_BASE_URL="http://127.0.0.1:3896", RPG_AI_API_PATH="/v1/messages",
           SMTP_PORT="3897", PUBLIC_URL=BASE.rstrip("/"), RPG_TEMPO_TURNO_MS="600000", RPG_TEMPO_DADO_MS="600000",
           RPG_IMG_BASE_URL="http://127.0.0.1:3896/v1", RPG_IMG_API_KEY="teste", RPG_DATA_DIR=os.path.join(tmp, "data"), ADMIN_EMAILS="adm@t.local")
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
AVISOS = """(() => {
  const ts = Date.now();
  const s = (texto) => ({ autor: 'Sistema', tipo: 'sistema', texto, ts });
  const msgs = [s('Ana: +20 XP'), s('Beto: +20 XP'), s('Cida: +20 XP'), s('Davi: +20 XP'), s('Eva: +20 XP'), s('Fabio: +20 XP'), s('Gil: +20 XP'),
    s('✅ Etapa 1/4 concluída: Chegar a Corvile e ganhar a confiança de algum morador, uma frase bem longa que não cabe'),
    { autor: 'Mestre', tipo: 'mestre', texto: 'A névoa se abre.', ts }, s('Ana: +5 moedas')];
  receberLog(estado.log.length, msgs);
  return true;
})()"""
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        sess = registrar("Ana", "ana@t.local")
        cod = None
        for nome, vp in (("desktop", (1280, 800)), ("celular", (390, 844))):
            pg = b.new_context(viewport={"width": vp[0], "height": vp[1]}).new_page()
            pg.goto(BASE); pg.evaluate("s => localStorage.setItem('4ever.sessao', JSON.stringify(s))", sess); pg.reload()
            pg.wait_for_selector("#grade-aventuras > *")
            if cod is None:
                pg.locator("#grade-aventuras > *").first.click(); pg.locator("#form-criar button[type=submit]").click()
                pg.wait_for_selector("#codigo-exibido:not(:empty)"); cod = pg.text_content("#codigo-exibido").strip()
                pg.wait_for_selector("#grade-classes > *"); pg.locator("#grade-classes > *").first.click(); pg.fill("#personagem-nome", "Ana"); pg.click("#btn-confirmar-personagem")
                pg.wait_for_selector("#btn-iniciar-aventura:not(.escondido):not([disabled])", timeout=15000); pg.click("#btn-iniciar-aventura")
            else:
                pg.goto(BASE + f"#/sala/{cod}")
            pg.wait_for_selector("#tela-jogo .msg.mestre", timeout=20000); pg.wait_for_timeout(800)
            pg.evaluate(AVISOS); pg.wait_for_timeout(500)
            info = pg.evaluate("""(() => { const g = [...document.querySelectorAll('#chat-log .grupo-sistema')];
              return g.map(x => ({ n: x.children.length, tops: [...new Set([...x.children].map(c => Math.round(c.getBoundingClientRect().top)))].length })); })()""")
            print(nome, info)
            checa(len(info) == 1 and info[0]["n"] == 7, f"[{nome}] os 7 avisos de XP ficam num grupo só (o longo e o depois do Mestre ficam fora)")
            checa(info and info[0]["tops"] < 7, f"[{nome}] avisos lado a lado: {info[0]['tops'] if info else '-'} linha(s) para 7 avisos")
            larg = pg.evaluate("document.getElementById('chat-log').scrollWidth <= document.getElementById('chat-log').clientWidth + 1")
            checa(larg, f"[{nome}] sem estourar a largura do log")
            pg.evaluate("document.querySelector('#chat-log .grupo-sistema').scrollIntoView({block:'center'})"); pg.wait_for_timeout(300)
            pg.screenshot(path=f"{OUT}/avisos-inline-{nome}.png")
            pg.evaluate("pedirLogCompleto && 0")
            pg.context.close()
finally:
    for pr in procs: pr.terminate()
print("FALHAS:", falhas)
