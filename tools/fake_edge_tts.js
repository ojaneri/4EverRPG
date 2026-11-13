'use strict';
// edge-tts falso para testes: grava no arquivo pedido qual voz/tom/velocidade foi usada.
const fs = require('fs');
const a = process.argv.slice(2);
if (a.includes('--help')) process.exit(0);
const val = (nome) => {
  const i = a.indexOf(nome);
  if (i >= 0) return a[i + 1];
  const igual = a.find((x) => x.startsWith(nome + '='));
  return igual ? igual.slice(nome.length + 1) : '';
};
fs.writeFileSync(val('--write-media'), `FAKE-EDGE:${val('--voice')}|${val('--pitch')}|${val('--rate')}`);
