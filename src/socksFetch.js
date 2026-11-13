'use strict';

// ---------------------------------------------------------------------------
// 4EverRPG — POST HTTPS através de um proxy SOCKS5 (sem dependências externas)
//
// Usado quando RPG_AI_PROXY está definido (ex.: socks5h://127.0.0.1:1080, o
// túnel residencial via Tailscale). O fetch nativo do Node não suporta SOCKS,
// então fazemos o handshake SOCKS5 com `net`, envolvemos o socket em TLS e
// usamos https.request sobre ele. O DNS é resolvido pelo proxy (socks5h).
// ---------------------------------------------------------------------------

const net = require('net');
const tls = require('tls');
const https = require('https');

function socksConnect(proxyHost, proxyPort, destHost, destPort, timeoutMs) {
  return new Promise((resolve, reject) => {
    const sock = net.connect(proxyPort, proxyHost);
    let buf = Buffer.alloc(0);
    let stage = 'greeting';

    const fail = (err) => {
      sock.destroy();
      reject(err instanceof Error ? err : new Error(err));
    };
    sock.setTimeout(timeoutMs, () => fail('Timeout ao conectar no proxy SOCKS'));
    sock.once('error', fail);

    sock.on('connect', () => sock.write(Buffer.from([0x05, 0x01, 0x00]))); // sem autenticação

    sock.on('data', function onData(chunk) {
      buf = Buffer.concat([buf, chunk]);
      if (stage === 'greeting') {
        if (buf.length < 2) return;
        if (buf[0] !== 0x05 || buf[1] !== 0x00) return fail('Proxy SOCKS recusou o método de autenticação');
        buf = buf.subarray(2);
        stage = 'connect';
        const host = Buffer.from(destHost);
        const req = Buffer.concat([
          Buffer.from([0x05, 0x01, 0x00, 0x03, host.length]),
          host,
          Buffer.from([(destPort >> 8) & 0xff, destPort & 0xff]),
        ]);
        sock.write(req);
        return;
      }
      if (stage === 'connect') {
        if (buf.length < 5) return;
        if (buf[1] !== 0x00) return fail(`Proxy SOCKS falhou ao conectar no destino (código ${buf[1]})`);
        const atyp = buf[3];
        const addrLen = atyp === 0x01 ? 4 : atyp === 0x04 ? 16 : 1 + buf[4];
        if (buf.length < 4 + addrLen + 2) return;
        sock.removeListener('data', onData);
        sock.removeListener('error', fail);
        sock.setTimeout(0);
        resolve(sock);
      }
    });
  });
}

/**
 * POST JSON via SOCKS5. Retorna { ok, status, text() , json() } (subset de Response).
 */
async function socksPostJson(urlStr, headers, bodyStr, proxyUrl, timeoutMs = 120000) {
  const url = new URL(urlStr);
  const proxy = new URL(proxyUrl);
  if (url.protocol !== 'https:') throw new Error('socksPostJson só suporta https');
  const port = Number(url.port) || 443;

  const raw = await socksConnect(proxy.hostname, Number(proxy.port) || 1080, url.hostname, port, 15000);
  const tlsSock = tls.connect({ socket: raw, servername: url.hostname });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: url.hostname,
        port,
        path: url.pathname + url.search,
        method: 'POST',
        headers: { ...headers, 'content-length': Buffer.byteLength(bodyStr) },
        // Sem `agent`: com agent definido (inclusive `false`) o Node ignora createConnection.
        createConnection: () => tlsSock,
        timeout: timeoutMs,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            text: async () => text,
            json: async () => JSON.parse(text),
          });
        });
        res.on('error', reject);
      }
    );
    req.on('timeout', () => req.destroy(new Error('Timeout na chamada da IA via proxy')));
    req.on('error', reject);
    req.end(bodyStr);
  });
}

module.exports = { socksPostJson };
