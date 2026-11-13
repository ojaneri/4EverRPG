'use strict';

// ---------------------------------------------------------------------------
// 4EverRPG — Voz (narração do Mestre e recados dos bots)
// 1º ElevenLabs (vozes melhores, pago). Se faltar crédito, a chave ou o serviço
// cair, usa a reserva grátis: edge-tts (vozes neurais do "ler em voz alta" do
// Edge, via `python3 -m edge_tts`). Cada fala é gerada uma vez e fica em cache
// em disco, para vários jogadores (e reinícios) não gerarem de novo.
// ---------------------------------------------------------------------------

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile, execFileSync } = require('child_process');

const PASTA_CACHE = path.join(process.env.RPG_DATA_DIR || path.join(__dirname, '..', 'data'), 'tts');
fs.mkdirSync(PASTA_CACHE, { recursive: true });

const CACHE_MAX = 200; // nº máximo de falas em memória (MP3 de ~100-400 KB cada)
const cache = new Map(); // chave -> Buffer | Promise<Buffer>

function config() {
  return {
    apiKey: process.env.ELEVENLABS_API_KEY || '',
    // Padrão: "Conrado" — voz masculina pt-BR, calma, boa para narrador.
    voiceId: process.env.ELEVENLABS_VOICE_ID || 'jLIW7D3ar1H9coBmNcVS',
    modelId: process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2',
    // Voz reserva do narrador no edge-tts: "voz|tom|velocidade".
    reservaNarrador: process.env.TTS_RESERVA_VOZ || 'pt-BR-AntonioNeural|+0Hz|+0%',
  };
}

// --- Reserva grátis (edge-tts) ---
const comandoEdge = () => (process.env.EDGE_TTS_CMD || 'python3 -m edge_tts').split(/\s+/).filter(Boolean);
let edgeOk = null;
function edgeDisponivel() {
  if (process.env.TTS_RESERVA === '0') return false;
  if (edgeOk === null) {
    try {
      const [cmd, ...args] = comandoEdge();
      execFileSync(cmd, [...args, '--help'], { stdio: 'ignore', timeout: 15000 });
      edgeOk = true;
    } catch {
      edgeOk = false;
      console.warn('[tts] edge-tts indisponível (sem reserva grátis de voz).');
    }
  }
  return edgeOk;
}

// ElevenLabs sem crédito/fora do ar: pausa um tempo e usa a reserva direto.
let elevenPausadoAte = 0;
const elevenAtivo = () => Boolean(config().apiKey) && Date.now() > elevenPausadoAte;

function disponivel() {
  return Boolean(config().apiKey) || edgeDisponivel();
}

// Remove marcações de markdown que o TTS leria em voz alta ("asterisco...").
function limparParaFala(texto) {
  return String(texto || '')
    .replace(/[*_`#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2500);
}

async function gerarEleven(texto, voiceId) {
  const { apiKey, modelId } = config();
  const base = (process.env.ELEVENLABS_BASE_URL || 'https://api.elevenlabs.io').replace(/\/+$/, '');
  const res = await fetch(`${base}/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text: texto,
      model_id: modelId,
      voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true },
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) {
    const corpo = await res.text().catch(() => '');
    const erro = new Error(`ElevenLabs HTTP ${res.status}: ${corpo.slice(0, 200)}`);
    erro.status = res.status;
    erro.semCredito = /quota|credit/i.test(corpo) || res.status === 401 || res.status === 402;
    throw erro;
  }
  return Buffer.from(await res.arrayBuffer());
}

// `spec` = "voz|tom|velocidade", ex.: "pt-BR-FranciscaNeural|-10Hz|+5%".
function gerarEdge(texto, spec) {
  const [voz, tom = '+0Hz', velocidade = '+0%'] = String(spec).split('|');
  const saida = path.join(os.tmpdir(), `4ever-tts-${crypto.randomBytes(6).toString('hex')}.mp3`);
  const [cmd, ...args] = comandoEdge();
  return new Promise((resolve, reject) => {
    execFile(cmd, [...args, '--voice', voz, `--pitch=${tom}`, `--rate=${velocidade}`, '--text', texto, '--write-media', saida],
      { timeout: 90000 }, (erro, _out, stderr) => {
        try {
          if (erro) throw new Error(`edge-tts: ${String(stderr || erro.message).slice(-200)}`);
          const buf = fs.readFileSync(saida);
          if (!buf.length) throw new Error('edge-tts: áudio vazio');
          resolve(buf);
        } catch (e) {
          reject(e);
        } finally {
          fs.rm(saida, { force: true }, () => {});
        }
      });
  });
}

// Busca no cache (memória → disco) ou gera uma vez só (pedidos simultâneos esperam a mesma geração).
function comCache(chaveTexto, gerador) {
  const chave = crypto.createHash('sha1').update(chaveTexto).digest('hex');
  if (cache.has(chave)) return Promise.resolve(cache.get(chave));
  const arquivo = path.join(PASTA_CACHE, `${chave}.mp3`);
  try {
    const buf = fs.readFileSync(arquivo);
    cache.set(chave, buf);
    if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
    return Promise.resolve(buf);
  } catch { /* ainda não existe */ }
  const promessa = gerador().then(
    (buf) => {
      cache.set(chave, buf);
      fs.writeFile(arquivo, buf, (e) => e && console.error('[tts] falha ao salvar cache:', e.message));
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

const existeNoDisco = (chaveTexto) =>
  fs.existsSync(path.join(PASTA_CACHE, `${crypto.createHash('sha1').update(chaveTexto).digest('hex')}.mp3`));

// `voz`: id de voz do ElevenLabs (sem ela, a do narrador).
// `vozReserva`: voz do edge-tts usada se o ElevenLabs falhar (sem ela, a reserva do narrador).
async function sintetizar(textoBruto, voz, vozReserva) {
  if (!disponivel()) throw new Error('Voz não configurada (sem ELEVENLABS_API_KEY e sem edge-tts).');
  const texto = limparParaFala(textoBruto);
  if (!texto) throw new Error('Texto vazio.');
  const cfg = config();
  const chaveEleven = `${voz || cfg.voiceId}|${cfg.modelId}|${texto}`;

  // Fala já gerada pelo ElevenLabs antes: usa mesmo se ele estiver pausado agora.
  if (cfg.apiKey && (elevenAtivo() || existeNoDisco(chaveEleven) || cache.has(crypto.createHash('sha1').update(chaveEleven).digest('hex')))) {
    try {
      return await comCache(chaveEleven, () => {
        if (!elevenAtivo()) throw new Error('ElevenLabs pausado');
        return gerarEleven(texto, voz || cfg.voiceId);
      });
    } catch (e) {
      if (e.status || /fetch|timeout|abort/i.test(e.message)) {
        const minutos = e.semCredito ? 30 : 2;
        elevenPausadoAte = Date.now() + minutos * 60 * 1000;
        console.warn(`[tts] ElevenLabs falhou (${e.message.slice(0, 120)}); usando a voz reserva por ${minutos} min.`);
      }
      if (!edgeDisponivel()) throw e;
    }
  }
  const spec = vozReserva || cfg.reservaNarrador;
  return comCache(`edge|${spec}|${texto}`, () => gerarEdge(texto, spec));
}

module.exports = { disponivel, sintetizar, edgeDisponivel };
