'use strict';

// ---------------------------------------------------------------------------
// 4EverRPG — Persistência simples em arquivos JSON (data/).
// Escrita atômica (arquivo temporário + rename) e com debounce, para que
// reiniciar o servidor não apague partidas nem contas.
// ---------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.RPG_DATA_DIR || path.join(__dirname, '..', 'data');
const ROOMS_DIR = path.join(DATA_DIR, 'rooms');
fs.mkdirSync(ROOMS_DIR, { recursive: true });

function escreverAtomico(arquivo, conteudo) {
  const tmp = `${arquivo}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, conteudo);
  fs.renameSync(tmp, arquivo);
}

function lerJson(arquivo, padrao) {
  try {
    return JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  } catch {
    return padrao;
  }
}

// --- Salas -----------------------------------------------------------------
const pendentes = new Map(); // codigo -> timeout

function arquivoSala(codigo) {
  return path.join(ROOMS_DIR, `${codigo.replace(/[^A-Z0-9]/g, '')}.json`);
}

function salvarSala(room) {
  clearTimeout(pendentes.get(room.codigo));
  pendentes.set(
    room.codigo,
    setTimeout(() => {
      pendentes.delete(room.codigo);
      try {
        escreverAtomico(arquivoSala(room.codigo), JSON.stringify(room));
      } catch (e) {
        console.error('[storage] falha ao salvar sala', room.codigo, e.message);
      }
    }, 400)
  );
}

function carregarSalas() {
  return fs
    .readdirSync(ROOMS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => lerJson(path.join(ROOMS_DIR, f), null))
    .filter(Boolean);
}

function apagarSala(codigo) {
  clearTimeout(pendentes.get(codigo));
  pendentes.delete(codigo);
  fs.rmSync(arquivoSala(codigo), { force: true });
}

// --- Documentos únicos (contas, sessões) -----------------------------------
const pendentesDoc = new Map();
function salvarDoc(nome, dados) {
  clearTimeout(pendentesDoc.get(nome));
  pendentesDoc.set(
    nome,
    setTimeout(() => {
      pendentesDoc.delete(nome);
      try {
        escreverAtomico(path.join(DATA_DIR, `${nome}.json`), JSON.stringify(dados));
      } catch (e) {
        console.error('[storage] falha ao salvar', nome, e.message);
      }
    }, 300)
  );
}

function carregarDoc(nome, padrao) {
  return lerJson(path.join(DATA_DIR, `${nome}.json`), padrao);
}

// Garante que gravações pendentes sejam feitas antes de o processo sair.
function descarregarTudo() {
  for (const t of [...pendentes.values(), ...pendentesDoc.values()]) {
    t._onTimeout && t._onTimeout();
    clearTimeout(t);
  }
}

module.exports = { salvarSala, carregarSalas, apagarSala, salvarDoc, carregarDoc, descarregarTudo };
