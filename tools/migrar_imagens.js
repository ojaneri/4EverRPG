'use strict';
// Leva para a biblioteca compartilhada as ilustrações geradas antes dela existir
// (copia; os originais das mesas ficam onde estão). Pode rodar mais de uma vez.
// Uso: node tools/migrar_imagens.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const imagens = require('../src/imagens');
const PASTA_SALAS = path.join(process.env.RPG_DATA_DIR || path.join(__dirname, '..', 'data'), 'rooms');
let n = 0;
for (const f of fs.readdirSync(PASTA_SALAS).filter((x) => x.endsWith('.json'))) {
  const room = JSON.parse(fs.readFileSync(path.join(PASTA_SALAS, f), 'utf8'));
  for (const m of room.logPublico || []) {
    const r = m.tipo === 'imagem' && String(m.imagem || '').match(/^imagens\/([A-Z0-9]+)\/([a-f0-9]{12}\.(?:jpg|png))$/);
    if (!r || !imagens.caminhoArquivo(r[1], r[2])) continue;
    const todas = ['fantasia', 'cyber', 'pericia', 'folclore', 'sertao', 'espacial'].flatMap((a) => imagens.bibliotecaPara({ ambiente: a }));
    if (todas.some((e) => e.origem === m.imagem)) continue;
    const e = imagens.guardarNaBiblioteca({ codigo: r[1], arquivo: r[2], ambiente: room.ambiente || 'fantasia', aventura: room.aventuraTitulo, local: m.texto, descricao: m.texto, copiar: true, origem: m.imagem });
    console.log(`${m.imagem} → ${imagens.urlBiblioteca(e)}`);
    n++;
  }
}
console.log(`${n} imagem(ns) levada(s) para a biblioteca.`);
