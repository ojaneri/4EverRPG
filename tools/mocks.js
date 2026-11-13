'use strict';
// Mestre (IA) simulado no formato da Messages API + SMTP simulado que guarda os emails.
const http = require('http');
const net = require('net');
const fs = require('fs');
const [, , portaIA, portaSMTP, arquivoEmails] = process.argv;

let chamadas = 0;
http.createServer((req, res) => {
  let corpo = '';
  req.on('data', (c) => (corpo += c));
  req.on('end', () => {
    chamadas++;
    if (req.url.includes('/images/generations')) {
      // Gerador de imagens simulado: devolve um PNG mínimo.
      res.setHeader('content-type', 'application/json');
      return res.end(JSON.stringify({ data: [{ b64_json: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' }] }));
    }
    const b = JSON.parse(corpo || '{}');
    const ultima = (b.messages || []).slice(-1)[0]?.content || '';
    const sys = b.system || '';
    let t;
    if (/cronista/.test(sys)) t = '- O grupo explorou a vila.\n- Thalrik achou uma chave.';
    else if (/Inicie a aventura/.test(ultima) && /defina a missão/.test(ultima)) t = '[MISSAO: Salvar o vilarejo da névoa | Achar a pista do culpado | Vencer o vilão]\nUma névoa estranha cobre tudo.\n[CENA: Vila | névoa densa | noite]';
    else if (/vitoria/i.test(ultima.split('\n').pop())) t = 'O vilão cai e a névoa se dissipa. Fim glorioso!\n[MISSAO_CUMPRIDA]';
    else if (/concluo etapa (\d)/i.test(ultima)) t = `Muito bem, isso avança a missão.\n[ETAPA: ${ultima.match(/concluo etapa (\d)/i)[1]}]`;
    else if (/Inicie a aventura/.test(ultima)) t = 'A névoa cobre a vila. Thalrik, o que você faz?\n[CENA: Vila de Corvile | ruas vazias sob névoa | noite]\n[MUSICA: taverna]\n[BUSCAVEL: Baú velho | trancado | agilidade | facil]\n[BUSCAVEL: Gaveta da escrivaninha | livre]\n[SUGESTOES: Bater na porta | Examinar o poço | Seguir as pegadas]';
    else if (/Resultado do teste/.test(ultima)) {
      const nome = (ultima.match(/teste de ([^—]+?) —/) || [])[1] || 'Thalrik';
      t = `O golpe acerta, mas a criatura revida! <script>alert(1)</script>\n[ESTADO: ${nome} | pv -4 | +item: Chave de ferro | +item: Poção de vida | xp +120]\n[SUGESTOES: Avançar | Recuar | Gritar]`;
    } else if (/golpe forte|abismo/i.test(ultima)) {
      const linhaJ = ultima.split('\n').reverse().find((l) => /^[^[\s][^:[]*:/.test(l)) || '';
      const quem = (linhaJ.match(/^([^:]+):/) || [])[1] || 'Thalrik';
      t = /abismo/i.test(ultima) ? `${quem} escorrega e cai na escuridão.\n[MORTE: ${quem} | caiu no abismo]` : `Um golpe brutal atinge ${quem}!\n[ESTADO: ${quem} | pv -20]`;
    } else if (/ataco/i.test(ultima)) {
      const linhaJog = ultima.split('\n').reverse().find((l) => /^[^[\s][^:[]*:/.test(l)) || '';
      const nome = (linhaJog.match(/^([^:]+):/) || [])[1] || 'Thalrik';
      t = `A criatura se prepara. Role Força.\n[TESTE: ${nome} | Força | médio]\n[MUSICA: Batalha]\n[IMAGEM: uma criatura de névoa ergue as garras]`;
    } else if (/encerrar a sessão/.test(ultima)) t = 'E assim termina a lenda do grupo.\n[FIM]';
    else t = `O Mestre responde à ação. Ok.\n[SUGESTOES: Olhar em volta | Falar com o NPC | Descansar]`;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ content: [{ type: 'text', text: t }] }));
  });
}).listen(portaIA, '127.0.0.1');

net.createServer((s) => {
  let dados = false;
  let buf = '';
  s.write('220 mock ESMTP\r\n');
  s.on('data', (c) => {
    buf += c.toString();
    if (dados) {
      if (buf.includes('\r\n.\r\n')) {
        fs.appendFileSync(arquivoEmails, buf.split('\r\n.\r\n')[0] + '\n=====FIM=====\n');
        buf = buf.split('\r\n.\r\n')[1] || '';
        dados = false;
        s.write('250 OK\r\n');
      }
      return;
    }
    let i;
    while ((i = buf.indexOf('\r\n')) >= 0) {
      const linha = buf.slice(0, i);
      buf = buf.slice(i + 2);
      if (/^EHLO/i.test(linha)) s.write('250-mock\r\n250 8BITMIME\r\n');
      else if (/^(MAIL|RCPT)/i.test(linha)) s.write('250 OK\r\n');
      else if (/^DATA/i.test(linha)) { s.write('354 go\r\n'); dados = true; return; }
      else if (/^QUIT/i.test(linha)) { s.write('221 bye\r\n'); s.end(); }
    }
  });
}).listen(portaSMTP, '127.0.0.1');
console.log('mocks prontos');
