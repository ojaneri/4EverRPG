#!/usr/bin/env python3
"""Captura as telas do 4Ever em tamanho de celular (e verifica rolagem horizontal).

Sobe um servidor isolado com Mestre/SMTP simulados (tools/mocks.js), percorre
cadastro → início → criar mesa → personagem → mesa → modais, e salva PNGs.
Uso: python3 tools/capturas_mobile.py <pasta-saida> [largura] [altura]
"""
import json
import os
import pathlib
import subprocess
import sys
import tempfile
import time
import urllib.request

from playwright.sync_api import sync_playwright

RAIZ = pathlib.Path(__file__).resolve().parent.parent
SAIDA = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "capturas")
LARG = int(sys.argv[2]) if len(sys.argv) > 2 else 390
ALT = int(sys.argv[3]) if len(sys.argv) > 3 else 844
SAIDA.mkdir(parents=True, exist_ok=True)
BASE = "http://127.0.0.1:3195/"

tmp = tempfile.mkdtemp()
emails = os.path.join(tmp, "emails.txt")
open(emails, "w").close()
procs = [subprocess.Popen(["node", "tools/mocks.js", "3196", "3197", emails], cwd=RAIZ, stdout=subprocess.DEVNULL)]
env = dict(os.environ, PORT="3195", HOST="127.0.0.1", RPG_AI_PROXY="", RPG_AI_BASE_URL="http://127.0.0.1:3196",
           RPG_AI_API_PATH="/v1/messages", SMTP_PORT="3197", PUBLIC_URL=BASE.rstrip("/"),
           RPG_TEMPO_TURNO_MS="600000", RPG_TEMPO_DADO_MS="600000", RPG_IMG_BASE_URL="http://127.0.0.1:3196/v1",
           RPG_IMG_API_KEY="teste", RPG_IMG_INTERVALO_MS="0", RPG_DATA_DIR=os.path.join(tmp, "data"))
procs.append(subprocess.Popen(["node", "server.js"], cwd=RAIZ, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))


def api(rota, corpo):
    req = urllib.request.Request(BASE + rota.lstrip("/"), data=json.dumps(corpo).encode(), headers={"content-type": "application/json"})
    return json.loads(urllib.request.urlopen(req).read())


for _ in range(100):
    try:
        urllib.request.urlopen(BASE + "api/config")
        break
    except Exception:
        time.sleep(0.2)

problemas = []
try:
    sessao = api("api/registrar", {"email": "mobile@teste.local", "nome": "Celular"})
    with sync_playwright() as p:
        nav = p.chromium.launch()
        ctx = nav.new_context(viewport={"width": LARG, "height": ALT}, device_scale_factor=2, is_mobile=True, has_touch=True)
        pg = ctx.new_page()
        pg.on("pageerror", lambda e: problemas.append(f"erro JS: {e}"))

        def foto(nome, inteira=True):
            pg.wait_for_timeout(400)
            larg = pg.evaluate("document.documentElement.scrollWidth")
            if larg > LARG + 1:
                largos = pg.evaluate("""(L) => [...document.querySelectorAll('body *')].filter(e => {
                    const r = e.getBoundingClientRect(); return r.width && r.right > L + 1 && getComputedStyle(e).position !== 'fixed';
                  }).slice(0, 8).map(e => (e.id ? '#' + e.id : e.tagName.toLowerCase() + '.' + [...e.classList].join('.')) + ' → ' + Math.round(e.getBoundingClientRect().right))""", LARG)
                problemas.append(f"{nome}: rolagem horizontal ({larg}px) — {largos}")
            pg.screenshot(path=str(SAIDA / f"{nome}.png"), full_page=inteira)

        pg.goto(BASE + "#/entrar")
        foto("01-entrar")
        pg.evaluate("s => localStorage.setItem('4ever.sessao', JSON.stringify(s))", sessao)
        pg.goto(BASE + "#/")
        pg.reload()
        pg.wait_for_selector("#grade-aventuras > *")
        foto("02-inicio")
        pg.goto(BASE + "#/jogos"); foto("03-jogos")
        pg.goto(BASE + "#/como-jogar"); foto("04-como-jogar")
        pg.goto(BASE + "#/conta"); foto("05-conta")
        pg.goto(BASE + "#/")
        pg.wait_for_selector("#grade-aventuras > *")
        pg.locator("#grade-aventuras > *").first.click()
        pg.locator("#form-criar button[type=submit]").click()
        pg.wait_for_selector("#grade-classes > *")
        foto("06-lobby")
        pg.locator("#grade-classes > *").first.click()
        pg.fill("#personagem-nome", "Thalrik")
        foto("07-ficha")
        pg.click("#btn-confirmar-personagem")
        pg.wait_for_selector("#btn-iniciar-aventura:not(.escondido)")
        pg.click("#btn-iniciar-aventura")
        pg.wait_for_selector("#tela-jogo .msg.mestre", timeout=20000)
        pg.wait_for_timeout(1200)
        foto("08-mesa", inteira=False)
        foto("08b-mesa-inteira")
        pg.fill("#input-acao", "ataco a criatura")
        pg.press("#input-acao", "Enter")
        pg.wait_for_selector("#area-teste:not(.escondido), #modal-dado:not(.escondido)", timeout=20000)
        pg.wait_for_timeout(800)
        foto("09-teste", inteira=False)
        if pg.locator("#btn-rolar-dado").is_visible():
            pg.click("#btn-rolar-dado")
        pg.wait_for_selector("#modal-dado:not(.escondido)")
        pg.wait_for_timeout(3500)
        foto("10-modal-dado", inteira=False)
        pg.click("#btn-fechar-dado")
        pg.wait_for_timeout(1500)
        pg.click("#btn-inventario"); foto("11-inventario", inteira=False); pg.click("#btn-fechar-inventario")
        if pg.locator("#btn-objetivos").is_visible():
            pg.click("#btn-objetivos"); foto("12-objetivos", inteira=False); pg.click("#btn-fechar-objetivos")
        if pg.locator("#btn-config").is_visible():
            pg.click("#btn-config"); foto("13-config", inteira=False); foto("13b-config-inteira"); pg.click("#cfg-fechar")
        if pg.locator("#abas-mesa").is_visible():
            pg.click("#abas-mesa [data-aba=grupo]"); foto("14-aba-grupo", inteira=False)
            pg.click("#abas-mesa [data-aba=chat]")
            pg.fill("#chat-lateral-texto", "Bora abrir o baú?"); pg.press("#chat-lateral-texto", "Enter")
            foto("15-aba-chat", inteira=False)
            pg.click("#abas-mesa [data-aba=mesa]")

            # Nada pode ficar coberto pelas abas nem fora da tela — também com o teclado aberto.
            def checar(nome, seletores):
                for sel in seletores:
                    r = pg.evaluate("""(sel) => {
                        const e = document.querySelector(sel); const b = e.getBoundingClientRect();
                        if (!b.width) return 'invisível';
                        if (b.bottom > window.innerHeight + 0.5 || b.top < 0) return `fora da tela (${Math.round(b.top)}–${Math.round(b.bottom)} de ${window.innerHeight})`;
                        const t = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
                        return t && (t === e || e.contains(t)) ? '' : 'coberto por ' + (t ? (t.id || t.className || t.tagName) : 'nada');
                      }""", sel)
                    if r:
                        problemas.append(f"{nome}: {sel} {r}")

            # O cabeçalho do site não pode cobrir o começo de nenhuma aba (nem se a página rolar).
            def checar_topo(nome, primeiro):
                for rolagem in (0, 300):
                    pg.evaluate(f"window.scrollTo(0, {rolagem})"); pg.wait_for_timeout(150)
                    r = pg.evaluate("""(sel) => {
                        const topo = document.querySelector('.topo-site').getBoundingClientRect();
                        const e = document.querySelector(sel).getBoundingClientRect();
                        const doc = document.scrollingElement;
                        return { topo: Math.round(topo.bottom), item: Math.round(e.top), rolou: doc.scrollTop, sobra: doc.scrollHeight - innerHeight };
                      }""", primeiro)
                    if r["item"] < r["topo"] or r["rolou"] or r["sobra"] > 0:
                        problemas.append(f"{nome} (rolagem {rolagem}): cabeçalho termina em {r['topo']}, conteúdo começa em {r['item']}, página rolou {r['rolou']}px, sobra {r['sobra']}px")
                pg.evaluate("window.scrollTo(0, 0)")

            pg.click("#abas-mesa [data-aba=grupo]"); checar_topo("aba grupo", "#painel-grupo > :first-child")
            pg.click("#abas-mesa [data-aba=chat]"); checar_topo("aba chat", ".caixa-chat")
            pg.click("#abas-mesa [data-aba=mesa]"); checar_topo("aba mesa", ".jogo-cabecalho")

            alvos_mesa = ["#abas-mesa [data-aba=grupo]", "#abas-mesa [data-aba=chat]", "#input-acao", "#form-acao button[type=submit]", "#btn-passar-vez", "#btn-inventario"]
            alvos_chat = ["#chat-lateral-texto", "#form-chat-lateral button[type=submit]", "#btn-gravar-audio"]
            checar("mesa", alvos_mesa)
            pg.click("#abas-mesa [data-aba=chat]"); checar("chat", alvos_chat)
            # Teclado virtual: o espaço visível encolhe para ~55%.
            pg.focus("#chat-lateral-texto"); pg.set_viewport_size({"width": LARG, "height": int(ALT * 0.55)}); pg.wait_for_timeout(600)
            checar("chat+teclado", alvos_chat); foto("16-chat-teclado", inteira=False)
            pg.set_viewport_size({"width": LARG, "height": ALT}); pg.click("#abas-mesa [data-aba=mesa]")
            pg.focus("#input-acao"); pg.set_viewport_size({"width": LARG, "height": int(ALT * 0.55)}); pg.wait_for_timeout(600)
            checar("mesa+teclado", alvos_mesa[2:5]); foto("17-mesa-teclado", inteira=False)
            pg.set_viewport_size({"width": LARG, "height": ALT}); pg.wait_for_timeout(600)
            pg.evaluate("document.activeElement.blur()"); pg.wait_for_timeout(600)
            checar("mesa após fechar teclado", alvos_mesa)
            foto("18-mesa-final", inteira=False)

            # Barra do navegador simulada: no celular a área visível é menor que 100vh.
            # Com a área útil em 80% da janela, tudo precisa caber acima dessa linha.
            util = int(ALT * 0.8)
            pg.evaluate(f"""() => {{
                Object.defineProperty(window, 'innerHeight', {{ get: () => {util}, configurable: true }});
                window.dispatchEvent(new Event('resize'));
                if (window.visualViewport) window.visualViewport.dispatchEvent(new Event('resize'));
              }}"""); pg.wait_for_timeout(300)
            for aba, alvos in (("mesa", ["#input-acao", "#form-acao button[type=submit]", "#btn-inventario"]),
                               ("chat", ["#chat-lateral-texto", "#btn-gravar-audio", "#form-chat-lateral button[type=submit]"])):
                pg.click(f"#abas-mesa [data-aba={aba}]"); pg.wait_for_timeout(200)
                for sel in alvos:
                    fundo = pg.evaluate("(s) => document.querySelector(s).getBoundingClientRect().bottom", sel)
                    if fundo > util:
                        problemas.append(f"barra do navegador ({aba}): {sel} termina em {round(fundo)}px, área visível {util}px")
            foto("19-com-barra-navegador", inteira=False)
            pg.click("#abas-mesa [data-aba=mesa]")
        nav.close()
finally:
    for pr in procs:
        pr.kill()

print("\n".join(problemas) or "sem rolagem horizontal nem erros JS")
