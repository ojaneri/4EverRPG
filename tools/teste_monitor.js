'use strict';
// Testes do monitor do gateway: instabilidade (429/503/sem conexão) não vira alerta.
// Uso: node tools/teste_monitor.js
const assert = require('assert');
const { situacao, manterSituacaoFirme, diferencas } = require('./monitor-gateway');

let ok = 0;
const teste = (nome, fn) => {
  fn();
  ok++;
  console.log(`  ✓ ${nome}`);
};
const leitura = (sondas, modelos = ['argon-4']) => ({ modelos, rotas: { '/models/video': 'HTTP 404' }, sondas });
// Simula uma hora do monitor: herda a situação firme e compara.
const hora = (antes, agora) => {
  manterSituacaoFirme(antes, agora);
  return diferencas(antes, agora);
};

console.log('Monitor do gateway:');
teste('classifica as respostas das sondas', () => {
  assert.strictEqual(situacao({ status: 400, texto: 'Pedido inválido' }), 'LIBERADO? (HTTP 400)');
  assert.strictEqual(situacao({ status: 429, texto: 'Muitas chamadas agora' }), 'ocupado (429)');
  assert.strictEqual(situacao({ status: 503, texto: 'temporariamente indisponível' }), 'instável (503)');
  assert.strictEqual(situacao({ status: 504, texto: '' }), 'instável (504)');
  assert.strictEqual(situacao({ status: 404, texto: 'modelo não está disponível' }), 'indisponível');
  assert.strictEqual(situacao({ status: 0, texto: '' }), 'sem conexão');
});
teste('400 → 429 → 400 não gera alerta em nenhuma das horas', () => {
  const h1 = leitura({ 'imagem:gemini': 'LIBERADO? (HTTP 400)' });
  const h2 = leitura({ 'imagem:gemini': 'ocupado (429)' });
  assert.deepStrictEqual(hora(h1, h2), []);
  assert.strictEqual(h2.sondas['imagem:gemini'], 'LIBERADO? (HTTP 400)', 'mantém a situação firme');
  assert.strictEqual(h2.passageiras['imagem:gemini'], 'ocupado (429)', 'guarda a leitura real');
  const h3 = leitura({ 'imagem:gemini': 'LIBERADO? (HTTP 400)' });
  assert.deepStrictEqual(hora(h2, h3), []);
});
teste('várias horas seguidas de 429 também não', () => {
  let antes = leitura({ 'imagem:flare': 'LIBERADO? (HTTP 400)' });
  for (let i = 0; i < 3; i++) {
    const agora = leitura({ 'imagem:flare': 'ocupado (429)' });
    assert.deepStrictEqual(hora(antes, agora), []);
    antes = agora;
  }
  assert.strictEqual(antes.sondas['imagem:flare'], 'LIBERADO? (HTTP 400)');
});
teste('modelo liberado de verdade continua avisando', () => {
  const linhas = hora(leitura({ 'video:veo-3': 'indisponível' }), leitura({ 'video:veo-3': 'LIBERADO? (HTTP 400)' }));
  assert.strictEqual(linhas.length, 1);
  assert.match(linhas[0], /video:veo-3: indisponível → LIBERADO\? \(HTTP 400\)/);
});
teste('modelo que entra ou sai da lista continua avisando, mesmo com 429 nas sondas', () => {
  const linhas = hora(leitura({ 'imagem:x': 'LIBERADO? (HTTP 400)' }, ['argon-4']), leitura({ 'imagem:x': 'ocupado (429)' }, ['argon-4', 'novo-modelo']));
  assert.deepStrictEqual(linhas, ['➕ Modelos novos: novo-modelo']);
  const saiu = hora(leitura({}, ['argon-4', 'gpt-6-astra']), leitura({}, ['argon-4']));
  assert.deepStrictEqual(saiu, ['➖ Modelos removidos: gpt-6-astra']);
});
teste('sonda nova que já nasce instável fica como está (sem alerta)', () => {
  const agora = leitura({ 'imagem:novo': 'ocupado (429)' });
  assert.deepStrictEqual(hora(leitura({}), agora), []);
  assert.strictEqual(agora.sondas['imagem:novo'], 'ocupado (429)');
});

console.log(`OK: ${ok} testes do monitor do gateway.`);
