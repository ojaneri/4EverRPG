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

// ---------------------------------------------------------------------------
// Biblioteca compartilhada: toda imagem gerada também vira uma entrada com nome
// legível (ex.: fantasia/as-sombras-de-corvile--vila-de-corvile.jpg) e descrição,
// para outras partidas reaproveitarem em vez de gerar de novo.
// ---------------------------------------------------------------------------
const PASTA_BIB = path.join(PASTA, 'biblioteca');
const ARQ_INDICE = path.join(PASTA_BIB, 'indice.json');
fs.mkdirSync(PASTA_BIB, { recursive: true });
let indice = null;
function lerIndice() {
  if (!indice) {
    try {
      indice = JSON.parse(fs.readFileSync(ARQ_INDICE, 'utf8'));
    } catch {
      indice = [];
    }
  }
  return indice;
}
function gravarIndice() {
  const tmp = `${ARQ_INDICE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(indice, null, 1));
  fs.renameSync(tmp, ARQ_INDICE);
}

const semAcento = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function slug(t, max = 40) {
  const s = semAcento(t).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (s.length <= max) return s || 'cena';
  const corte = s.lastIndexOf('-', max); // termina numa palavra inteira
  return s.slice(0, corte > 10 ? corte : max).replace(/-+$/, '');
}
const PARADAS = new Set('de da do das dos com uma um que para por sob sobre entre ate pela pelo pelas pelos nas nos num numa ao aos the and with uma seu sua seus suas onde muito mais menos como esta este essa esse isso aquele aquela ela ele eles elas ha tem cena'.split(' '));
const palavras = (t) => new Set(semAcento(t).split(/[^a-z0-9]+/).filter((p) => p.length >= 3 && !PARADAS.has(p)));
function parecido(a, b) {
  if (!a.size || !b.size) return 0;
  let comum = 0;
  for (const p of a) if (b.has(p)) comum++;
  return comum / (a.size + b.size - comum);
}

// Entradas da biblioteca para um ambiente (as da mesma aventura primeiro).
function bibliotecaPara({ ambiente, aventura }) {
  const amb = ambiente || 'fantasia';
  const av = aventura ? slug(aventura) : null;
  return lerIndice()
    .filter((e) => e.ambiente === amb)
    .sort((x, y) => (y.aventura === av) - (x.aventura === av) || (y.usos || 0) - (x.usos || 0));
}

// Procura uma imagem já pronta:
// - `nome`: pedido explícito do Mestre ([IMAGEM: usar <nome>]);
// - `abertura`: ilustração automática da 1ª cena → mesma aventura e mesmo lugar;
// - senão, a descrição pedida precisa ser parecida com a de uma imagem guardada.
const LIMIAR_PARECIDA = Number(process.env.RPG_IMG_LIMIAR_REUSO) || 0.5;
function procurarNaBiblioteca({ ambiente, aventura, local, descricao, nome, abertura = false }) {
  const lista = bibliotecaPara({ ambiente, aventura });
  if (nome) {
    const n = slug(nome, 120);
    const e = lista.find((x) => x.nome === n || x.nome.endsWith(`--${n}`) || slug(x.local || '') === n);
    if (e) return e;
  }
  if (nome) return null;
  const av = aventura ? slug(aventura) : null;
  if (abertura) {
    const lugar = slug(local || '');
    return av && lista.find((e) => e.abertura && e.aventura === av && slug(e.local || '') === lugar) || null;
  }
  const pal = palavras(descricao);
  let melhor = null;
  let nota = 0;
  for (const e of lista) {
    let n = parecido(pal, palavras(e.descricao));
    if (n > 0 && av && e.aventura === av) n += 0.15;
    if (n > nota) {
      nota = n;
      melhor = e;
    }
  }
  return nota >= LIMIAR_PARECIDA ? melhor : null;
}

function registrarUso(entrada) {
  entrada.usos = (entrada.usos || 0) + 1;
  entrada.usadoEm = Date.now();
  try { gravarIndice(); } catch (e) { console.error('[imagem] índice:', e.message); }
}

// Copia uma imagem recém-gerada para a biblioteca, com nome legível.
function guardarNaBiblioteca({ codigo, arquivo, ambiente, aventura, local, descricao, copiar = false, origem, abertura = false }) {
  const fonte = path.join(pastaSala(codigo), arquivo);
  const amb = slug(ambiente || 'fantasia');
  // Abertura: nome do lugar; pedido do Mestre: o que aparece na cena.
  const base = `${aventura ? slug(aventura) : 'personalizada'}--${slug(abertura ? local || descricao : descricao || local, 50)}`;
  lerIndice();
  let nome = base;
  for (let i = 2; indice.some((e) => e.ambiente === amb && e.nome === nome); i++) nome = `${base}-${i}`;
  const ext = path.extname(arquivo);
  fs.mkdirSync(path.join(PASTA_BIB, amb), { recursive: true });
  // Sai da pasta da sala (vale para todas as partidas); `copiar` mantém o original (migração).
  (copiar ? fs.copyFileSync : fs.renameSync)(fonte, path.join(PASTA_BIB, amb, `${nome}${ext}`));
  const entrada = { nome, arquivo: `${nome}${ext}`, ambiente: amb, aventura: aventura ? slug(aventura) : null, local: local || '', descricao: String(descricao || '').slice(0, 300), criadoEm: Date.now(), usos: 1, ...(origem ? { origem } : {}), ...(abertura ? { abertura: true } : {}) };
  indice.push(entrada);
  gravarIndice();
  return entrada;
}

const urlBiblioteca = (e) => `imagens/biblioteca/${e.ambiente}/${e.arquivo}`;
function caminhoBiblioteca(ambiente, arquivo) {
  if (!/^[a-z0-9-]+$/.test(ambiente) || !/^[a-z0-9-]+\.(jpg|png)$/.test(arquivo)) return null;
  const p = path.join(PASTA_BIB, ambiente, arquivo);
  return fs.existsSync(p) ? p : null;
}

function caminhoArquivo(codigo, arquivo) {
  if (!/^[a-f0-9]{12}\.(jpg|png)$/.test(arquivo)) return null;
  const p = path.join(pastaSala(codigo), arquivo);
  return fs.existsSync(p) ? p : null;
}

function apagarSala(codigo) {
  fs.rm(pastaSala(codigo), { recursive: true, force: true }, () => {});
}

module.exports = {
  disponivel, gerar, caminhoArquivo, apagarSala, ARQ_ATIVACAO,
  bibliotecaPara, procurarNaBiblioteca, guardarNaBiblioteca, registrarUso, urlBiblioteca, caminhoBiblioteca, slug,
};
