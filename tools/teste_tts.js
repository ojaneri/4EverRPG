'use strict';
// Voz: quando o ElevenLabs falha por falta de crédito, usa a reserva (edge-tts) com a voz pedida,
// e pausa o ElevenLabs em vez de insistir a cada fala. Uso: node tools/teste_tts.js
const http = require('http');
const os = require('os');
const path = require('path');
const fs = require('fs');

let chamadasEleven = 0;
const servidor = http.createServer((req, res) => {
  chamadasEleven++;
  res.statusCode = 401;
  res.end(JSON.stringify({ detail: { code: 'quota_exceeded', message: 'This request exceeds your quota' } }));
}).listen(0, '127.0.0.1', async () => {
  process.env.ELEVENLABS_API_KEY = 'teste';
  process.env.ELEVENLABS_BASE_URL = `http://127.0.0.1:${servidor.address().port}`;
  process.env.EDGE_TTS_CMD = `node ${path.join(__dirname, 'fake_edge_tts.js')}`;
  process.env.RPG_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), '4ever-tts-'));
  const tts = require('../src/tts');
  let falhas = 0;
  const ok = (c, m) => { console.log(`${c ? '✅' : '❌'} ${m}`); if (!c) falhas++; };
  try {
    const a = String(await tts.sintetizar('Olá, grupo! Vamos para a enfermaria.', 'vozElevenDoBot', 'pt-BR-FranciscaNeural|-12Hz|+6%'));
    ok(a === 'FAKE-EDGE:pt-BR-FranciscaNeural|-12Hz|+6%', `sem crédito no ElevenLabs, usa a voz reserva do bot (${a})`);
    const b = String(await tts.sintetizar('Narração do Mestre: a porta range.'));
    ok(b === 'FAKE-EDGE:pt-BR-AntonioNeural|+0Hz|+0%', `narração do Mestre usa a reserva do narrador (${b})`);
    ok(chamadasEleven === 1, `depois da falta de crédito, o ElevenLabs fica pausado (chamadas: ${chamadasEleven})`);
    const c = String(await tts.sintetizar('Olá, grupo! Vamos para a enfermaria.', 'vozElevenDoBot', 'pt-BR-FranciscaNeural|-12Hz|+6%'));
    ok(c === a, 'a mesma fala vem do cache, com a mesma voz');
  } catch (e) {
    ok(false, `erro: ${e.message}`);
  }
  servidor.close();
  console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTudo certo.');
  process.exit(falhas ? 1 : 0);
});
