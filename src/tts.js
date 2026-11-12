'use strict';

// ---------------------------------------------------------------------------
// 4EverRPG — Narração por voz (ElevenLabs TTS)
// Gera o MP3 de cada fala do Mestre uma única vez e guarda em cache na memória,
// para que vários jogadores ouvindo a mesma fala não gastem créditos repetidos.
// ---------------------------------------------------------------------------

const crypto = require('crypto');

const CACHE_MAX = 200; // nº máximo de falas em cache (MP3 de ~100-400 KB cada)
const cache = new Map(); // hash(texto) -> Buffer | Promise<Buffer>

function config() {
  return {
    apiKey: process.env.ELEVENLABS_API_KEY || '',
    // Padrão: "Conrado" — voz masculina pt-BR, calma, boa para narrador.
    voiceId: process.env.ELEVENLABS_VOICE_ID || 'jLIW7D3ar1H9coBmNcVS',
    modelId: process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2',
  };
}

function disponivel() {
  return Boolean(config().apiKey);
}

// Remove marcações de markdown que o TTS leria em voz alta ("asterisco...").
function limparParaFala(texto) {
  return String(texto || '')
    .replace(/[*_`#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2500);
}

async function gerar(texto) {
  const { apiKey, voiceId, modelId } = config();
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: texto,
      model_id: modelId,
      voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true },
    }),
  });
  if (!res.ok) {
    const corpo = await res.text().catch(() => '');
    throw new Error(`ElevenLabs HTTP ${res.status}: ${corpo.slice(0, 200)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function sintetizar(textoBruto) {
  if (!disponivel()) throw new Error('TTS não configurado (ELEVENLABS_API_KEY ausente).');
  const texto = limparParaFala(textoBruto);
  if (!texto) throw new Error('Texto vazio.');

  const chave = crypto.createHash('sha1').update(texto).digest('hex');
  if (cache.has(chave)) return cache.get(chave);

  // Guarda a Promise para que pedidos simultâneos da mesma fala esperem a mesma geração.
  const promessa = gerar(texto).then(
    (buf) => {
      cache.set(chave, buf);
      return buf;
    },
    (err) => {
      cache.delete(chave);
      throw err;
    }
  );
  cache.set(chave, promessa);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
  return promessa;
}

module.exports = { disponivel, sintetizar };
