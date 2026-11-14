'use strict';
// Reserva de imagem: se o modelo principal falhar, tenta o modelo reserva (9router).
const http = require('http');
const os = require('os');
const path = require('path');
const fs = require('fs');

const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
let falhas = 0;
const ok = (c, m) => { console.log(`${c ? '✅' : '❌'} ${m}`); if (!c) falhas++; };

function servidor(responder) {
  const pedidos = [];
  const s = http.createServer((req, res) => {
    let corpo = '';
    req.on('data', (d) => (corpo += d));
    req.on('end', () => {
      const p = JSON.parse(corpo || '{}');
      pedidos.push({ ...p, chave: req.headers.authorization });
      const [status, json] = responder(p);
      res.statusCode = status;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(json));
    });
  });
  return new Promise((r) => s.listen(0, '127.0.0.1', () => r({ s, pedidos, url: `http://127.0.0.1:${s.address().port}/v1` })));
}

(async () => {
  let principalStatus = 503;
  const principal = await servidor(() => (principalStatus === 200 ? [200, { data: [{ b64_json: PNG }] }] : [principalStatus, { error: { message: 'fora do ar' } }]));
  const reserva = await servidor(() => [200, { data: [{ b64_json: PNG }] }]);
  Object.assign(process.env, {
    RPG_DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'img-reserva-')),
    RPG_IMG_BASE_URL: principal.url, RPG_IMG_API_KEY: 'principal', RPG_IMG_MODEL: 'gemini-3-pro-image',
    RPG_IMG_RESERVA_URL: reserva.url, RPG_9ROUTER_KEY: 'chave-9router', RPG_IMG_TIMEOUT_MS: '5000',
  });
  delete process.env.RPG_IMG_RESERVA_MODEL;
  delete process.env.RPG_IMG_RESERVA_KEY;
  const imagens = require('../src/imagens');

  const a1 = await imagens.gerar('TST', null, 'uma vila');
  ok(/\.(jpg|png)$/.test(a1), 'principal com 503: imagem sai pela reserva');
  ok(reserva.pedidos.length === 1 && reserva.pedidos[0].model === 'ss/gpt-image-2.6-flare' && !('response_format' in reserva.pedidos[0]), 'reserva usa ss/gpt-image-2.6-flare, sem response_format');
  ok(reserva.pedidos[0].chave === 'Bearer chave-9router', 'reserva usa a chave do 9router');

  principalStatus = 200;
  await imagens.gerar('TST', null, 'uma ponte');
  ok(principal.pedidos.length === 2 && reserva.pedidos.length === 1, 'principal no ar: a reserva não é chamada');

  principalStatus = 403;
  await imagens.gerar('TST', null, 'uma torre');
  const antes = principal.pedidos.length;
  await imagens.gerar('TST', null, 'um rio');
  ok(principal.pedidos.length === antes && reserva.pedidos.length === 3, 'principal negado (403) fica em pausa e as próximas vão direto à reserva');
  ok(imagens.disponivel(), 'com a reserva, o recurso continua disponível durante a pausa');

  let erro = null;
  try { await imagens.gerar('TST', null, 'x', 'modelo-de-teste'); } catch (e) { erro = e; }
  ok(erro && reserva.pedidos.length === 3, 'teste do monitor (modelo forçado) não usa a reserva');

  principal.s.close(); reserva.s.close();
  if (falhas) { console.log(`\n${falhas} falha(s).`); process.exit(1); }
  console.log('Reserva de imagem: tudo certo.');
})();
