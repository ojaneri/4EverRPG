#!/usr/bin/env python3
"""
Diagnostico simples: consulta o endpoint /models de uma API (estilo
Anthropic e estilo OpenAI) e mostra o que cada um retorna.

So usa biblioteca padrao do Python (urllib), sem dependencias externas.

Uso:
    python check_api_models.py
    python check_api_models.py --base https://www.sixtysix.online/v1 --key sk-rt-...
"""

import argparse
import json
import os
import sys
import urllib.request
import urllib.error


def ler_env(caminho):
    """Le um arquivo .env simples (KEY=VALUE por linha) sem dependencias externas."""
    valores = {}
    if not os.path.exists(caminho):
        return valores
    with open(caminho, "r", encoding="utf-8") as f:
        for linha in f:
            linha = linha.strip()
            if not linha or linha.startswith("#") or "=" not in linha:
                continue
            chave, _, valor = linha.partition("=")
            valores[chave.strip()] = valor.strip()
    return valores


def chamar(url, headers, rotulo):
    print(f"\n=== {rotulo} ===")
    print(f"GET {url}")
    print(f"Headers: { {k: (v[:12] + '...' if k.lower() in ('authorization', 'x-api-key') else v) for k, v in headers.items()} }")
    req = urllib.request.Request(url, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            status = resp.status
            corpo = resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        status = e.code
        corpo = e.read().decode("utf-8", errors="replace")
    except Exception as e:
        print(f"ERRO de conexao: {e}")
        return

    print(f"HTTP {status}")
    try:
        dados = json.loads(corpo)
        print(json.dumps(dados, indent=2, ensure_ascii=False))
    except json.JSONDecodeError:
        print(corpo[:800])


def main():
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    env = ler_env(env_path)

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", default=env.get("ANTHROPIC_BASE_URL", "https://www.sixtysix.online/v1"),
                         help="URL base da API (default: valor do .env ou sixtysix)")
    parser.add_argument("--key", default=env.get("ANTHROPIC_API_KEY", os.environ.get("ANTHROPIC_API_KEY", "")),
                         help="Chave de API (default: valor do .env)")
    parser.add_argument("--api-version", default=env.get("ANTHROPIC_API_VERSION", "2023-06-01"))
    args = parser.parse_args()

    if not args.key:
        print("Nenhuma chave de API encontrada (nem em .env, nem em --key).")
        sys.exit(1)

    base = args.base.rstrip("/")

    # Testa algumas variantes de URL base (com e sem /v1 já incluso)
    candidatos_base = {base}
    if base.endswith("/v1"):
        candidatos_base.add(base[: -len("/v1")])
    else:
        candidatos_base.add(base + "/v1")

    for b in sorted(candidatos_base):
        url = f"{b}/models"

        chamar(
            url,
            {
                "Authorization": f"Bearer {args.key}",
                "content-type": "application/json",
            },
            f"Estilo OpenAI (Authorization: Bearer) -> {url}",
        )

        chamar(
            url,
            {
                "x-api-key": args.key,
                "anthropic-version": args.api_version,
                "content-type": "application/json",
            },
            f"Estilo Anthropic (x-api-key) -> {url}",
        )


if __name__ == "__main__":
    main()
