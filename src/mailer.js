'use strict';

// ---------------------------------------------------------------------------
// 4EverRPG — Envio de email via SMTP local (Postfix em localhost:2525, que
// repassa pelo relay configurado no servidor). Cliente SMTP mínimo, sem
// dependências: EHLO → MAIL FROM → RCPT TO → DATA. Sem autenticação/TLS,
// porque a conexão é só no loopback.
// ---------------------------------------------------------------------------

const net = require('net');
const crypto = require('crypto');

function config() {
  return {
    host: process.env.SMTP_HOST || '127.0.0.1',
    port: Number(process.env.SMTP_PORT) || 2525,
    from: process.env.MAIL_FROM || 'noreply@janeri.com.br',
    fromName: process.env.MAIL_FROM_NAME || '4Ever RPG',
  };
}

function encodeHeader(s) {
  return `=?UTF-8?B?${Buffer.from(s, 'utf8').toString('base64')}?=`;
}

function base64Linhas(s) {
  return Buffer.from(s, 'utf8').toString('base64').replace(/.{1,76}/g, '$&\r\n');
}

function montarMensagem({ from, fromName, to, subject, text, html }) {
  const fronteira = 'b_' + crypto.randomBytes(12).toString('hex');
  const dominio = from.split('@')[1] || 'localhost';
  return [
    `From: ${encodeHeader(fromName)} <${from}>`,
    `To: <${to}>`,
    `Subject: ${encodeHeader(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomBytes(16).toString('hex')}@${dominio}>`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${fronteira}"`,
    '',
    `--${fronteira}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    base64Linhas(text),
    `--${fronteira}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    base64Linhas(html),
    `--${fronteira}--`,
    '',
  ].join('\r\n');
}

function enviarEmail({ to, subject, text, html }) {
  const cfg = config();
  if (!/^[^\s@<>]+@[^\s@<>]+$/.test(to)) return Promise.reject(new Error('Email de destino inválido.'));
  const mensagem = montarMensagem({ ...cfg, to, subject, text, html });

  // Sequência de comandos e o código esperado de cada resposta.
  const passos = [
    { cmd: null, espera: 220 },
    { cmd: 'EHLO 4ever.local', espera: 250 },
    { cmd: `MAIL FROM:<${cfg.from}>`, espera: 250 },
    { cmd: `RCPT TO:<${to}>`, espera: 250 },
    { cmd: 'DATA', espera: 354 },
    { cmd: mensagem + '\r\n.', espera: 250 },
    { cmd: 'QUIT', espera: 221 },
  ];

  return new Promise((resolve, reject) => {
    const sock = net.connect(cfg.port, cfg.host);
    let buf = '';
    let passo = 0;
    const falhar = (err) => {
      sock.destroy();
      reject(err instanceof Error ? err : new Error(err));
    };
    sock.setTimeout(20000, () => falhar('Timeout no servidor SMTP'));
    sock.on('error', falhar);
    sock.on('data', (chunk) => {
      buf += chunk.toString('utf8');
      // Uma resposta termina numa linha "NNN texto" (sem hífen após o código).
      const linhas = buf.split('\r\n');
      const ultimaCompleta = linhas.slice(0, -1).reverse().find((l) => /^\d{3} /.test(l));
      if (!ultimaCompleta) return;
      buf = '';
      const codigo = parseInt(ultimaCompleta.slice(0, 3), 10);
      if (codigo !== passos[passo].espera) return falhar(`SMTP respondeu "${ultimaCompleta}"`);
      passo += 1;
      if (passo >= passos.length) {
        sock.end();
        return resolve();
      }
      sock.write(passos[passo].cmd + '\r\n');
    });
  });
}

module.exports = { enviarEmail };
