'use strict';
// Testes do leitor de resposta da IA (SSE e JSON) e da regra de response_format das imagens.
// Uso: node tools/teste_ia_stream.js
const assert = require('assert');
const { lerResposta } = require('../src/aiMaster');
const { aceitaResponseFormat } = require('../src/imagens');

let ok = 0;
const teste = (nome, fn) => {
  fn();
  ok++;
  console.log(`  ✓ ${nome}`);
};

const ev = (tipo, dados) => `event: ${tipo}\ndata: ${JSON.stringify({ type: tipo, ...dados })}\n\n`;
const sse = (partes, stop = 'end_turn') =>
  ev('message_start', { message: { id: 'm', content: [], usage: { input_tokens: 12, output_tokens: 1 } } }) +
  partes.map((p, i) => ev('content_block_start', { index: i, content_block: p.tipo === 'thinking' ? { type: 'thinking', thinking: '' } : { type: 'text', text: '' } }) +
    (p.pedacos || []).map((t) => ev('content_block_delta', { index: i, delta: p.tipo === 'thinking' ? { type: 'thinking_delta', thinking: t } : { type: 'text_delta', text: t } })).join('') +
    ev('content_block_stop', { index: i })).join('') +
  ev('message_delta', { delta: { stop_reason: stop }, usage: { output_tokens: 42 } }) +
  ev('message_stop', {});

console.log('Leitor de resposta da IA:');
teste('junta os pedaços de texto do stream', () => {
  const r = lerResposta(sse([{ pedacos: ['A chuva ', 'caía ', 'forte.'] }]));
  assert.strictEqual(r.content[0].text, 'A chuva caía forte.');
  assert.strictEqual(r.stop_reason, 'end_turn');
  assert.strictEqual(r.usage.output_tokens, 42);
  assert.strictEqual(r.usage.input_tokens, 12);
});
teste('ignora o bloco de raciocínio e mantém só o texto', () => {
  const r = lerResposta(sse([{ tipo: 'thinking', pedacos: ['hmm'] }, { pedacos: ['Olá'] }]));
  const textos = r.content.filter((b) => b.type === 'text').map((b) => b.text);
  assert.deepStrictEqual(textos, ['Olá']);
});
teste('informa corte por limite de tokens', () => {
  assert.strictEqual(lerResposta(sse([{ pedacos: ['Era uma vez'] }], 'max_tokens')).stop_reason, 'max_tokens');
});
teste('aceita JSON comum quando o gateway ignora o stream', () => {
  const r = lerResposta(JSON.stringify({ content: [{ type: 'text', text: 'OK' }], stop_reason: 'end_turn' }));
  assert.strictEqual(r.content[0].text, 'OK');
});
teste('erro no meio do stream vira exceção', () => {
  assert.throws(() => lerResposta(ev('error', { error: { type: 'overloaded_error', message: 'Sobrecarregado' } })), /Sobrecarregado/);
});
teste('corpo vazio ou estranho vira exceção', () => {
  assert.throws(() => lerResposta(''), /sem eventos/);
  assert.throws(() => lerResposta('<html>502</html>'), /sem eventos/);
});

console.log('Imagens (response_format):');
teste('gpt-image não recebe response_format', () => {
  assert.strictEqual(aceitaResponseFormat('gpt-image-2.6-flare'), false);
  assert.strictEqual(aceitaResponseFormat('gpt-image-2.6-sunburst'), false);
  assert.strictEqual(aceitaResponseFormat('openai/gpt-image-1'), false);
});
teste('demais modelos continuam recebendo', () => {
  assert.strictEqual(aceitaResponseFormat('gemini-3-pro-image'), true);
  assert.strictEqual(aceitaResponseFormat('ag/gemini-3.1-flash-image'), true);
});

console.log(`OK: ${ok} testes do leitor da IA e das imagens.`);
