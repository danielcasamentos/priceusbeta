import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Estado em memória da conexão (Localhost Dev)
let connectionStatus = 'connected'; // 'connected' | 'qr' | 'disconnected'
let currentQrCode = '';

// Rotas da API REST do Servidor Sidecar
app.get('/api/status', (req, res) => {
  res.json({
    status: connectionStatus,
    qrCode: currentQrCode,
    service: 'Priceus WhatsApp Local Engine',
    port: PORT
  });
});

app.post('/api/send-message', (req, res) => {
  const { phone, message } = req.body;
  if (!phone || !message) {
    return res.status(400).json({ error: 'Telefone e mensagem são obrigatórios.' });
  }

  console.log(`[WhatsApp Local Engine] Mensagem enviada para ${phone}: "${message}"`);
  return res.json({
    success: true,
    messageId: `msg_${Date.now()}`,
    status: 'sent',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/disconnect', (req, res) => {
  connectionStatus = 'disconnected';
  console.log('[WhatsApp Local Engine] Sessão desconectada.');
  return res.json({ success: true, status: connectionStatus });
});

app.listen(PORT, () => {
  console.log(`🚀 [Priceus WhatsApp Service] Rodando em http://localhost:${PORT}`);
});
