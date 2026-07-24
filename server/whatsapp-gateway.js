import express from 'express';
import cors from 'cors';
import QRCode from 'qrcode';
import baileys from '@whiskeysockets/baileys';
const makeWASocket = baileys.default || baileys;
const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = baileys;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const AUTH_FOLDER = path.join(__dirname, 'baileys_auth');

let sock = null;
let currentQrBase64 = null;
let currentRawQr = null;
let connectionStatus = 'disconnected';
let connectedUser = null;

async function startWhatsAppServer() {
  try {
    if (!fs.existsSync(AUTH_FOLDER)) {
      fs.mkdirSync(AUTH_FOLDER, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
    const { version } = await fetchLatestBaileysVersion();

    console.log(`[WhatsApp Gateway] Iniciando Baileys v${version.join('.')}...`);

    sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: true,
      browser: ['PriceU$ Sales AI', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        connectionStatus = 'qr';
        currentRawQr = qr;
        console.log('[WhatsApp Gateway] ⚡ Novo QR Code gerado pelo Baileys!');
        try {
          currentQrBase64 = await QRCode.toDataURL(qr, {
            errorCorrectionLevel: 'M',
            margin: 2,
            scale: 8
          });
        } catch (err) {
          console.error('[WhatsApp Gateway] Erro ao converter QR Code para Base64:', err);
        }
      }

      if (connection === 'open') {
        connectionStatus = 'connected';
        currentQrBase64 = null;
        currentRawQr = null;
        connectedUser = sock.user ? sock.user.id.split(':')[0] : 'Desconhecido';
        console.log(`[WhatsApp Gateway] ✅ Conectado com sucesso! Número: ${connectedUser}`);
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log(
          `[WhatsApp Gateway] Conexão fechada. Status: ${statusCode}, Reconectar: ${shouldReconnect}`
        );

        connectionStatus = 'disconnected';
        currentQrBase64 = null;
        currentRawQr = null;

        if (shouldReconnect && statusCode !== 401 && statusCode !== 403) {
          setTimeout(startWhatsAppServer, 3000);
        } else {
          console.log('[WhatsApp Gateway] Sessão encerrada ou não autorizada. Limpando credenciais...');
          if (fs.existsSync(AUTH_FOLDER)) {
            fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
          }
          setTimeout(startWhatsAppServer, 1500);
        }
      }
    });

    // 📩 Ouvinte de Mensagens Recebidas em Tempo Real
    sock.ev.on('messages.upsert', async (m) => {
      if (m.type === 'notify') {
        for (const msg of m.messages) {
          if (!msg.key.fromMe) {
            const senderJid = msg.key.remoteJid;
            const text =
              msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text ||
              '';

            console.log(`[WhatsApp Gateway] 📩 Mensagem recebida de ${senderJid}: "${text}"`);
          }
        }
      }
    });
  } catch (err) {
    console.error('[WhatsApp Gateway] Erro ao iniciar o servidor Baileys:', err);
  }
}

// 🟢 Endpoints REST

// 1. Status e QR Code em Tempo Real
app.get('/api/whatsapp/qr', (req, res) => {
  res.json({
    status: connectionStatus,
    qrBase64: currentQrBase64,
    rawQr: currentRawQr,
    connectedUser
  });
});

// 2. Status Geral da Conexão
app.get('/api/whatsapp/status', (req, res) => {
  res.json({
    connected: connectionStatus === 'connected',
    status: connectionStatus,
    userPhone: connectedUser
  });
});

// 3. Enviar Mensagem de Texto no WhatsApp
app.post('/api/whatsapp/send', async (req, res) => {
  const { phone, message } = req.body;

  if (!sock || connectionStatus !== 'connected') {
    return res.status(400).json({ error: 'WhatsApp não está conectado.' });
  }

  if (!phone || !message) {
    return res.status(400).json({ error: 'Campos phone e message são obrigatórios.' });
  }

  try {
    const formattedJid = phone.includes('@s.whatsapp.net')
      ? phone
      : `${phone.replace(/\D/g, '')}@s.whatsapp.net`;

    await sock.sendMessage(formattedJid, { text: message });
    res.json({ success: true, message: 'Mensagem enviada com sucesso!' });
  } catch (err) {
    console.error('[WhatsApp Gateway] Erro ao enviar mensagem:', err);
    res.status(500).json({ error: 'Falha ao enviar mensagem pelo WhatsApp.' });
  }
});

// 4. Desconectar Sessão
app.post('/api/whatsapp/disconnect', async (req, res) => {
  try {
    if (sock) {
      await sock.logout();
    }
    if (fs.existsSync(AUTH_FOLDER)) {
      fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
    }
    connectionStatus = 'disconnected';
    currentQrBase64 = null;
    connectedUser = null;
    setTimeout(startWhatsAppServer, 1000);
    res.json({ success: true, message: 'Sessão desconectada e resetada.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao desconectar sessão.' });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 [WhatsApp Gateway Baileys Real] Rodando na porta ${PORT}`);
  console.log(`👉 Endpoint QR: http://localhost:${PORT}/api/whatsapp/qr`);
  console.log(`👉 Status: http://localhost:${PORT}/api/whatsapp/status\n`);
  startWhatsAppServer();
});
