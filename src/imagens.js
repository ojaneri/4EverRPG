'use strict';

// ---------------------------------------------------------------------------
// 4EverRPG — Ilustrações de cena geradas por IA (API compatível com OpenAI
// /v1/images/generations; por padrão, o 9Router local).
// Cada imagem é gerada uma vez, convertida para JPG e guardada em
// data/imagens/<sala>/ — o servidor a entrega com cache longo.
// Sem RPG_IMG_API_KEY, o recurso fica desligado (o jogo segue normalmente).
// ---------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { socksPostJson } = require('./socksFetch');

const PASTA = path.join(process.env.RPG_DATA_DIR || path.join(__dirname, '..', 'data'), 'imagens');
fs.mkdirSync(PASTA, { recursive: true });

// Modelo ativado automaticamente pelo monitor do gateway (tools/monitor-gateway.js):
// lido a cada uso, então ativar não exige reiniciar o servidor.
const ARQ_ATIVACAO = path.join(path.dirname(PASTA), 'imagens-config.json');
function ativacao() {
  try {
    return JSON.parse(fs.readFileSync(ARQ_ATIVACAO, 'utf8'));
  } catch {
    return null;
  }
}

function config() {
  const ativo = ativacao();
  return {
    baseUrl: (process.env.RPG_IMG_BASE_URL || 'http://127.0.0.1:20128/v1').replace(/\/+$/, ''),
    // Por padrão usa a mesma chave/proxy do Mestre (gateway sixtysix).
    apiKey: process.env.RPG_IMG_API_KEY || process.env.RPG_AI_API_KEY || '',
    proxy: process.env.RPG_IMG_PROXY !== undefined ? process.env.RPG_IMG_PROXY : process.env.RPG_AI_PROXY || '',
    modelo: (ativo && ativo.modelo) || process.env.RPG_IMG_MODEL || 'ag/gemini-3.1-flash-image',
    tamanho: process.env.RPG_IMG_SIZE || '1536x1024',
    timeoutMs: Number(process.env.RPG_IMG_TIMEOUT_MS) || 180000,
  };
}

// Se o modelo não estiver liberado (404/403), pausa as tentativas por um tempo.
let pausadoAte = 0;
let pausadoEm = 0;
function disponivel() {
  // Uma ativação nova (depois da pausa) libera na hora.
  const ativo = ativacao();
  if (pausadoAte && ativo && ativo.ativadoEm > pausadoEm) pausadoAte = 0;
  return Boolean(config().apiKey) && Date.now() > pausadoAte;
}

const ESTILO =
  'Painterly fantasy tabletop RPG illustration, cinematic wide shot, rich atmospheric lighting, ' +
  'detailed environment, family-friendly, no text, no letters, no captions, no watermark, no UI. Scene: ';

function pastaSala(codigo) {
  return path.join(PASTA, String(codigo).replace(/[^A-Z0-9]/g, ''));
}

// Converte para JPG (mais leve); se o ffmpeg falhar, guarda o PNG original.
function salvar(codigo, id, buffer) {
  const pasta = pastaSala(codigo);
  fs.mkdirSync(pasta, { recursive: true });
  const png = path.join(pasta, `${id}.png`);
  const jpg = path.join(pasta, `${id}.jpg`);
  fs.writeFileSync(png, buffer);
  return new Promise((resolve) => {
    execFile('ffmpeg', ['-nostdin', '-loglevel', 'error', '-y', '-i', png, '-vf', 'scale=1280:-2', '-q:v', '4', jpg], (erro) => {
      if (erro) return resolve(`${id}.png`);
      fs.rm(png, { force: true }, () => {});
      resolve(`${id}.jpg`);
    });
  });
}

// Gera a ilustração e devolve o nome do arquivo salvo.
// `modelo` força um modelo específico (usado pelo monitor para testar antes de ativar).
async function gerar(codigo, estilo, descricao, modelo) {
  const cfg = config();
  if (modelo) cfg.modelo = modelo;
  if (!cfg.apiKey) throw new Error('Geração de imagens desligada (RPG_IMG_API_KEY ausente).');
  const url = `${cfg.baseUrl}/images/generations`;
  const headers = { 'content-type': 'application/json', authorization: `Bearer ${cfg.apiKey}`, 'x-api-key': cfg.apiKey };
  const corpoReq = JSON.stringify({ model: cfg.modelo, prompt: (estilo || ESTILO) + descricao, n: 1, size: cfg.tamanho, response_format: 'b64_json' });
  const res = cfg.proxy
    ? await socksPostJson(url, headers, corpoReq, cfg.proxy, cfg.timeoutMs)
    : await fetch(url, { method: 'POST', headers, body: corpoReq, signal: AbortSignal.timeout(cfg.timeoutMs) });
  const corpo = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 404 || res.status === 403 || res.status === 401) {
      pausadoEm = Date.now();
      pausadoAte = pausadoEm + 30 * 60 * 1000;
    }
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(corpo).slice(0, 200)}`);
  }
  const item = corpo.data && corpo.data[0];
  let buffer;
  if (item && item.b64_json) buffer = Buffer.from(item.b64_json, 'base64');
  else if (item && item.url) {
    const img = await fetch(item.url, { signal: AbortSignal.timeout(60000) });
    buffer = Buffer.from(await img.arrayBuffer());
  } else throw new Error('Resposta sem imagem.');
  const id = crypto.randomBytes(6).toString('hex');
  return salvar(codigo, id, buffer);
}

function caminhoArquivo(codigo, arquivo) {
  if (!/^[a-f0-9]{12}\.(jpg|png)$/.test(arquivo)) return null;
  const p = path.join(pastaSala(codigo), arquivo);
  return fs.existsSync(p) ? p : null;
}

function apagarSala(codigo) {
  fs.rm(pastaSala(codigo), { recursive: true, force: true }, () => {});
}

module.exports = { disponivel, gerar, caminhoArquivo, apagarSala, ARQ_ATIVACAO };
