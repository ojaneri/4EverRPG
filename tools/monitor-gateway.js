'use strict';

// ---------------------------------------------------------------------------
// Monitor do gateway da IA (sixtysix): lê os modelos liberados para a chave do
// jogo e testa as rotas de imagem/vídeo. Se algo mudar desde a última leitura,
// manda um email (MONITOR_EMAIL). Feito para rodar de hora em hora pelo cron.
//
// Não gera nada: os modelos de imagem/vídeo são sondados com um pedido SEM
// prompt — "modelo não disponível" (404) vs. erro de validação (400) já diz se
// o modelo foi liberado, sem gastar créditos.
//
// Os modelos de texto (os da lista + o principal e o reserva do Mestre, mesmo
// que tenham saído da lista) recebem um pedido de 1 token: assim o log mostra,
// hora a hora, quando cada um parou e voltou. Se o Mestre ficar sem nenhum
// modelo que responda (ou voltar a ter), o email avisa no assunto.
//
// Uso: node tools/monitor-gateway.js [--forcar-email]
// ---------------------------------------------------------------------------

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const { socksPostJson } = require('../src/socksFetch');
const { enviarEmail } = require('../src/mailer');

const BASE = (process.env.RPG_AI_BASE_URL || '').replace(/\/+$/, '');
const CHAVE = process.env.RPG_AI_API_KEY || '';
const PROXY = process.env.RPG_AI_PROXY || '';
const DESTINO = process.env.MONITOR_EMAIL || '';
const PASTA_DADOS = process.env.RPG_DATA_DIR || path.join(__dirname, '..', 'data');
const ARQUIVO = path.join(PASTA_DADOS, 'monitor-gateway.json');
const PUBLIC_URL = (process.env.PUBLIC_URL || 'https://4ever.janeri.com.br').replace(/\/+$/, '');
const MODELO_PRINCIPAL = process.env.RPG_AI_MODEL || '';
const MODELO_RESERVA = process.env.RPG_AI_MODEL_RESERVA || '';
const RE_MIDIA = /image|imagen|banana|dall|flux|stable|diffusion|veo|sora|kling|video|tts|audio|embed|whisper/i;

// Modelos de imagem/vídeo que já apareceram ou são prováveis no gateway.
const SONDAS_IMAGEM = ['gemini-3-pro-image', 'gpt-image-2.6-flare', 'gpt-image-2.6-sunburst', 'gpt-image-2', 'gpt-image-1.5', 'nano-banana', 'imagen-4'];
const SONDAS_VIDEO = ['veo-3', 'veo-3.1', 'sora-2', 'kling-2'];

const cabecalhos = () => ({ 'content-type': 'application/json', 'x-api-key': CHAVE, authorization: `Bearer ${CHAVE}`, 'anthropic-version': '2023-06-01' });

// POST pelo proxy usa o socksFetch do jogo; GET pelo proxy usa o curl do sistema.
async function requisitar(metodo, rota, corpo) {
  const url = `${BASE}${rota}`;
  try {
    if (PROXY && metodo === 'POST') {
      const r = await socksPostJson(url, cabecalhos(), JSON.stringify(corpo || {}), PROXY, 60000);
      return { status: r.status, texto: await r.text() };
    }
    if (PROXY) return await getViaProxy(url);
    const r = await fetch(url, { method: metodo, headers: cabecalhos(), body: metodo === 'POST' ? JSON.stringify(corpo || {}) : undefined, signal: AbortSignal.timeout(60000) });
    return { status: r.status, texto: await r.text() };
  } catch (e) {
    return { status: 0, texto: `falha de conexão: ${e.message}` };
  }
}

// GET pelo proxy SOCKS usando o curl do sistema (simples e confiável).
function getViaProxy(url) {
  const { execFile } = require('child_process');
  const proxy = PROXY.replace(/^socks5h?:\/\//, '');
  return new Promise((resolve) => {
    execFile('curl', ['-s', '-m', '60', '--socks5-hostname', proxy, '-H', `x-api-key: ${CHAVE}`, '-H', `authorization: Bearer ${CHAVE}`, '-w', '\n%{http_code}', url],
      { maxBuffer: 5 * 1024 * 1024 }, (erro, saida) => {
        if (erro && !saida) return resolve({ status: 0, texto: `falha de conexão: ${erro.message}` });
        const i = saida.lastIndexOf('\n');
        resolve({ status: Number(saida.slice(i + 1)) || 0, texto: saida.slice(0, i) });
      });
  });
}

// Classifica a resposta de uma sonda de modelo.
function situacao(r) {
  if (r.status === 0) return 'sem conexão';
  if (/não está disponível|nao esta disponivel|not available/i.test(r.texto)) return 'indisponível';
  if (/Endereço não disponível/i.test(r.texto)) return 'rota inexistente';
  if (r.status === 429) return 'ocupado (429)';
  if ([502, 503, 504].includes(r.status)) return `instável (${r.status})`;
  return `LIBERADO? (HTTP ${r.status})`;
}

// Classifica a resposta de uma sonda de texto (pedido de 1 token). Aqui o 503 é
// justamente o que se quer registrar (o modelo parou), então não é "passageiro".
function situacaoTexto(r) {
  if (r.status === 200) return 'responde';
  if (r.status === 0) return 'sem conexão';
  if (r.status === 429) return 'ocupado (429)';
  if (r.status === 404 || /não está disponível|nao esta disponivel|not available/i.test(r.texto)) return 'indisponível';
  if ([502, 503, 504].includes(r.status)) return `fora (${r.status})`;
  if (r.status === 401 || r.status === 402 || r.status === 403) return `chave recusada (${r.status})`;
  return `erro (HTTP ${r.status})`;
}

// Modelos de texto a sondar: os da lista (menos imagem/vídeo) + os do Mestre.
function modelosTexto(lista) {
  const todos = [...lista.filter((m) => !RE_MIDIA.test(m)), MODELO_PRINCIPAL, MODELO_RESERVA].filter(Boolean);
  return [...new Set(todos)];
}

// O Mestre tem IA se o principal ou o reserva responde. null = não deu para saber
// (só instabilidade passageira nos dois).
function estadoMestre(sondas, principal = MODELO_PRINCIPAL, reserva = MODELO_RESERVA) {
  const vs = [principal, reserva].filter(Boolean).map((m) => sondas[`texto:${m}`]).filter(Boolean);
  if (!vs.length) return null;
  if (vs.includes('responde')) return 'com IA';
  if (vs.every((v) => passageiro(v))) return null;
  return 'sem IA';
}

// Gateway ocupado (429), fora do ar (502/503/504) ou sem conexão: diz nada sobre
// o modelo estar liberado, então não conta como mudança.
const passageiro = (v) => /^(ocupado|instável|sem conexão)/.test(v || '');

// Sonda que caiu numa instabilidade herda a última situação firme, para não
// gerar alerta agora nem "mudança de volta" na hora seguinte, e para não
// desligar o modelo de imagem ativo por causa de um 429. A leitura real fica
// em `passageiras`.
function manterSituacaoFirme(antes, agora) {
  if (!antes || !antes.sondas) return;
  for (const [k, v] of Object.entries(agora.sondas)) {
    const a = antes.sondas[k];
    if (passageiro(v) && a && !passageiro(a)) {
      agora.sondas[k] = a;
      (agora.passageiras = agora.passageiras || {})[k] = v;
    }
  }
}

async function ler() {
  const leitura = { quando: new Date().toISOString(), modelos: [], rotas: {}, sondas: {} };
  const m = await requisitar('GET', '/models');
  try {
    leitura.modelos = (JSON.parse(m.texto).data || []).map((x) => x.id).sort();
  } catch {
    leitura.erroModelos = `HTTP ${m.status}`;
  }
  for (const rota of ['/models/image', '/models/video']) {
    const r = await requisitar('GET', rota);
    leitura.rotas[rota] = r.status === 200 ? 'existe' : `HTTP ${r.status}`;
  }
  for (const modelo of SONDAS_IMAGEM) leitura.sondas[`imagem:${modelo}`] = situacao(await requisitar('POST', '/images/generations', { model: modelo }));
  for (const modelo of SONDAS_VIDEO) leitura.sondas[`video:${modelo}`] = situacao(await requisitar('POST', '/videos', { model: modelo }));
  leitura.tempos = {};
  for (const modelo of modelosTexto(leitura.modelos)) {
    const t0 = Date.now();
    const r = await requisitar('POST', '/messages', { model: modelo, max_tokens: 1, messages: [{ role: 'user', content: 'OK' }] });
    leitura.sondas[`texto:${modelo}`] = situacaoTexto(r);
    leitura.tempos[modelo] = Date.now() - t0;
  }
  return leitura;
}

function diferencas(antes, agora) {
  const linhas = [];
  if (!antes) return linhas;
  const novos = agora.modelos.filter((x) => !antes.modelos.includes(x));
  const saiu = antes.modelos.filter((x) => !agora.modelos.includes(x));
  if (novos.length) linhas.push(`➕ Modelos novos: ${novos.join(', ')}`);
  if (saiu.length) linhas.push(`➖ Modelos removidos: ${saiu.join(', ')}`);
  for (const [k, v] of Object.entries(agora.rotas)) if (antes.rotas[k] !== v) linhas.push(`🔀 Rota ${k}: ${antes.rotas[k] || '?'} → ${v}`);
  for (const [k, v] of Object.entries(agora.sondas)) {
    const a = antes.sondas[k];
    if (a === undefined && k.startsWith('texto:')) continue; // primeira sonda do modelo: vira linha de base
    if (a !== v && !passageiro(v) && !passageiro(a)) linhas.push(`🔀 ${k}: ${a || '?'} → ${v}`);
  }
  return linhas;
}

// Quando um modelo de imagem é liberado: gera UMA imagem de teste com ele e, se
// funcionar, ativa no 4Ever (data/imagens-config.json; o servidor lê sem reiniciar).
async function tentarAtivarImagens(agora, antes) {
  const imagens = require('../src/imagens');
  let ativo = null;
  try {
    ativo = JSON.parse(fs.readFileSync(imagens.ARQ_ATIVACAO, 'utf8'));
  } catch { /* ainda não ativado */ }
  const liberados = Object.entries(agora.sondas)
    .filter(([k, v]) => k.startsWith('imagem:') && v.startsWith('LIBERADO'))
    .map(([k]) => k.slice('imagem:'.length));
  const novosNaLista = agora.modelos.filter((m) => /image|imagen|banana|dall|flux|stable|diffusion/i.test(m) && !liberados.includes(m));
  const candidatos = [...liberados, ...novosNaLista];
  if (!candidatos.length) return null;
  if (ativo && candidatos.includes(ativo.modelo)) return null; // já ativo e funcionando

  const falhas = [];
  for (const modelo of candidatos) {
    try {
      const arquivo = await imagens.gerar('TESTE', null, 'a lone adventurer at a crossroads at dawn, mountains and an old stone signpost', modelo);
      fs.writeFileSync(imagens.ARQ_ATIVACAO, JSON.stringify({ modelo, ativadoEm: Date.now(), teste: `imagens/TESTE/${arquivo}` }, null, 2));
      return { ok: true, modelo, url: `${PUBLIC_URL}/imagens/TESTE/${arquivo}` };
    } catch (e) {
      falhas.push(`${modelo}: ${e.message.slice(0, 160)}`);
    }
  }
  const resumo = falhas.join(' | ');
  // Só avisa uma falha se ela for diferente da última (sem encher a caixa de entrada).
  const repetida = antes && antes.ultimaFalhaAtivacao === resumo;
  agora.ultimaFalhaAtivacao = resumo;
  return { ok: false, falhas, repetida };
}

async function main() {
  if (!BASE || !CHAVE) throw new Error('RPG_AI_BASE_URL/RPG_AI_API_KEY ausentes no .env');
  let antes = null;
  try {
    antes = JSON.parse(fs.readFileSync(ARQUIVO, 'utf8'));
  } catch { /* primeira leitura */ }
  const agora = await ler();
  if (agora.erroModelos && antes) {
    console.log(`${agora.quando} gateway não respondeu a lista de modelos (${agora.erroModelos}); mantendo a leitura anterior.`);
    return;
  }
  manterSituacaoFirme(antes, agora);
  const mudou = diferencas(antes, agora);
  agora.mestre = estadoMestre(agora.sondas) || (antes && antes.mestre) || null;
  const mestreMudou = antes && antes.mestre && agora.mestre && antes.mestre !== agora.mestre;
  if (mestreMudou) {
    mudou.unshift(agora.mestre === 'sem IA'
      ? `🚨 O MESTRE FICOU SEM IA: nem o principal (${MODELO_PRINCIPAL || '—'}) nem o reserva (${MODELO_RESERVA || '—'}) respondem.`
      : `✅ O Mestre voltou a ter IA (${[MODELO_PRINCIPAL, MODELO_RESERVA].filter((m) => agora.sondas[`texto:${m}`] === 'responde').join(', ')} responde).`);
  }
  const ativacao = await tentarAtivarImagens(agora, antes);
  if (ativacao && ativacao.ok) {
    mudou.unshift(`🖼️ GERAÇÃO DE IMAGENS ATIVADA no 4Ever com o modelo "${ativacao.modelo}". Imagem de teste: ${ativacao.url}`);
  } else if (ativacao && !ativacao.repetida) {
    mudou.unshift(`⚠️ Um modelo de imagem apareceu, mas o teste de geração falhou (as imagens seguem desligadas; tento de novo na próxima hora): ${ativacao.falhas.join(' | ')}`);
  }
  fs.mkdirSync(path.dirname(ARQUIVO), { recursive: true });
  fs.writeFileSync(ARQUIVO, JSON.stringify(agora, null, 2));
  const resumo = `modelos: ${agora.modelos.join(', ') || '(nenhum)'}`;
  console.log(`${agora.quando} ${antes ? (mudou.length ? 'MUDOU' : 'sem mudanças') : 'linha de base'} — ${resumo}`);
  mudou.forEach((l) => console.log('   ', l));
  const textos = Object.entries(agora.sondas).filter(([k]) => k.startsWith('texto:'))
    .map(([k, v]) => `${k.slice(6)} ${v === 'responde' ? `ok ${((agora.tempos || {})[k.slice(6)] / 1000).toFixed(1)}s` : (agora.passageiras || {})[k] || v}`);
  if (textos.length) console.log(`    texto (Mestre ${agora.mestre || '?'}): ${textos.join(' · ')}`);
  if (agora.passageiras) console.log('    (instável agora, ignorado:', Object.entries(agora.passageiras).map(([k, v]) => `${k} ${v}`).join(', ') + ')');

  const forcar = process.argv.includes('--forcar-email');
  if ((mudou.length || forcar) && DESTINO) {
    const corpo = [
      mudou.length ? 'O gateway da IA (sixtysix) mudou para a chave do 4Ever:' : 'Teste do monitor do gateway (nada mudou):',
      '',
      ...mudou,
      '',
      `Modelos liberados agora (${agora.modelos.length}): ${agora.modelos.join(', ') || '(nenhum)'}`,
      `Rotas: ${Object.entries(agora.rotas).map(([k, v]) => `${k} ${v}`).join(' · ')}`,
      `Mestre: ${agora.mestre || '?'} (principal ${MODELO_PRINCIPAL || '—'}, reserva ${MODELO_RESERVA || '—'})`,
      'Sondas (texto: pedido de 1 token; imagem/vídeo: pedido sem prompt):',
      ...Object.entries(agora.sondas).map(([k, v]) => `  - ${k}: ${v}`),
      '',
      `Leitura: ${agora.quando} (verificado de hora em hora pelo servidor do 4Ever).`,
    ].join('\n');
    await enviarEmail({
      to: DESTINO,
      subject: mestreMudou
        ? (agora.mestre === 'sem IA' ? '4Ever: o Mestre ficou SEM IA (gateway)' : '4Ever: o Mestre voltou a ter IA')
        : ativacao && ativacao.ok
        ? `4Ever: imagens de cena ATIVADAS (${ativacao.modelo})`
        : mudou.length ? '4Ever: o gateway da IA mudou (modelos/rotas)' : '4Ever: teste do monitor do gateway',
      text: corpo,
      html: `<pre style="font-family:Consolas,monospace;font-size:13px;white-space:pre-wrap">${corpo.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c])}</pre>`,
    });
    console.log(`   email enviado para ${DESTINO.replace(/(^.).*(@.*$)/, '$1***$2')}`);
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(new Date().toISOString(), 'ERRO', e.message);
    process.exit(1);
  });
}

module.exports = { situacao, situacaoTexto, modelosTexto, estadoMestre, passageiro, manterSituacaoFirme, diferencas };
