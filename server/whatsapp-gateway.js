import crypto from 'node:crypto';
if (!globalThis.crypto) {
  globalThis.crypto = crypto;
}
import express from 'express';
import cors from 'cors';
import QRCode from 'qrcode';
import baileys from '@whiskeysockets/baileys';
const makeWASocket = baileys.default || baileys;
const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, downloadMediaMessage } = baileys;
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
const DB_FILE = path.join(__dirname, 'chats_db.json');
const CONTACTS_FILE = path.join(__dirname, 'contacts_db.json');
const MEDIA_FOLDER = path.join(__dirname, 'media');

if (!fs.existsSync(MEDIA_FOLDER)) {
  fs.mkdirSync(MEDIA_FOLDER, { recursive: true });
}

app.use('/media', express.static(MEDIA_FOLDER));

// Endpoint de Checagem e Atualizações Automáticas do Plugin do Lightroom Classic
app.get('/api/plugin/version', (req, res) => {
  res.json({
    name: 'PriceU$ Lightroom Plugin',
    version: '2.1.0',
    build: 105,
    downloadUrl: 'http://localhost:5173/downloads/PriceUS.lrplugin.zip',
    autoUpdate: true,
    releaseNotes: 'Adicionado suporte a Serviços de Publicação (Publishing Services panel) e auto-update sem reinstalação.',
  });
});

let sock = null;
let currentQrBase64 = null;
let currentRawQr = null;
let connectionStatus = 'disconnected';
let connectedUser = null;
let firstContactOnlyMode = false;

// 🤖 Groq AI API Key
const GROQ_API_KEY = process.env.VITE_GROQ_API_KEY || 'REMOVED';

const SYSTEM_PROMPT = `
Você é a Secretária Virtual e Assistente de Vendas do estúdio de fotografia PriceU$.
Sua missão é atender os clientes no WhatsApp de forma calorosa, profissional, rápida e objetiva.

DIRETRIZES DE RESPOSTA:
1. Responda em português do Brasil com simpatia e uso moderado de emojis.
2. Esclareça dúvidas sobre os serviços de fotografia (casamentos, ensaios, eventos, corporativo, aniversários).
3. Incentive o cliente a conferir os orçamentos interativos e agendar uma reunião ou ensaio.
4. Se o cliente mencionar que quer falar com um humano/gerente ou pedir um desconto especial, avise gentilmente que o fotógrafo foi notificado e entrará em contato direto em instantes.
5. Mantenha respostas sucintas e adequadas para o formato de mensagens do WhatsApp (parágrafos curtos).
`;

// 💬 Armazém persistente de conversas reais e lista de contatos salvos da agenda
const liveConversationsMap = new Map();
const contactsMap = new Map();

function loadStorage() {
  try {
    if (fs.existsSync(CONTACTS_FILE)) {
      const data = fs.readFileSync(CONTACTS_FILE, 'utf-8');
      const json = JSON.parse(data);
      Object.entries(json).forEach(([jid, name]) => contactsMap.set(jid, name));
      console.log(`[WhatsApp Gateway] 📇 ${contactsMap.size} contatos salvos carregados da agenda.`);
    }
  } catch (e) {
    console.warn('[WhatsApp Gateway] Erro ao carregar contacts_db.json:', e);
  }

  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const json = JSON.parse(data);
      if (Array.isArray(json)) {
        json.forEach(c => {
          if (c.id && !c.id.includes('@lid') && !c.id.includes('status')) {
            // Migrar mensagens antigas sem rawTimestamp
            if (Array.isArray(c.messages)) {
              c.messages = c.messages.map((msg, idx) => {
                if (!msg.rawTimestamp) {
                  // Extrair timestamp do id (formato msg_<timestamp>_<random>)
                  const parts = (msg.id || '').split('_');
                  const ts = parts.length >= 2 ? parseInt(parts[1]) : 0;
                  return { ...msg, rawTimestamp: ts || (Date.now() - (c.messages.length - idx) * 1000) };
                }
                return msg;
              });
              // Garantir ordem cronológica ao carregar
              c.messages.sort((a, b) => (a.rawTimestamp || 0) - (b.rawTimestamp || 0));
            }
            liveConversationsMap.set(c.id, c);
          }
        });
        console.log(`[WhatsApp Gateway] 💾 ${liveConversationsMap.size} conversas salvas carregadas.`);
      }
    }
  } catch (e) {
    console.warn('[WhatsApp Gateway] Erro ao carregar chats_db.json:', e);
  }
}

function saveStorage() {
  try {
    const list = Array.from(liveConversationsMap.values());
    fs.writeFileSync(DB_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[WhatsApp Gateway] Erro ao salvar chats_db.json:', e);
  }

  try {
    const contactsObj = Object.fromEntries(contactsMap.entries());
    fs.writeFileSync(CONTACTS_FILE, JSON.stringify(contactsObj, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[WhatsApp Gateway] Erro ao salvar contacts_db.json:', e);
  }
}

function formatPhoneDisplay(jid) {
  const cleanPhone = jid.split('@')[0].split(':')[0];
  if (cleanPhone.startsWith('55') && cleanPhone.length >= 12) {
    const ddd = cleanPhone.slice(2, 4);
    const num1 = cleanPhone.slice(4, 9);
    const num2 = cleanPhone.slice(9);
    return `+55 ${ddd} ${num1}-${num2}`;
  }
  return `+${cleanPhone}`;
}

function getBestName(jid, pushName) {
  const savedName = contactsMap.get(jid);
  if (savedName && savedName.trim() !== '') return savedName;
  if (pushName && pushName.trim() !== '' && !pushName.includes('@')) return pushName;
  return formatPhoneDisplay(jid);
}

function recordLiveMessage({ jid, pushName, sender, text, mediaUrl, mediaType, msgTimestamp }) {
  if (!jid || jid.includes('@lid') || jid.includes('status') || jid.endsWith('@g.us')) return null;

  const formattedPhone = formatPhoneDisplay(jid);
  const clientName = getBestName(jid, pushName);
  const timeStr = msgTimestamp
    ? new Date(msgTimestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  let chat = liveConversationsMap.get(jid);
  if (!chat) {
    chat = {
      id: jid,
      clientName,
      phone: formattedPhone,
      eventDate: 'A definir',
      eventType: 'Fotografia',
      city: 'Brasil',
      lastMessage: text || (mediaType ? `[${mediaType.toUpperCase()}]` : ''),
      lastMessageTime: timeStr,
      aiStatus: firstContactOnlyMode ? 'auto' : 'auto',
      unreadCount: sender === 'client' ? 1 : 0,
      stage: 'Novo Lead',
      estimatedValue: 0,
      messages: []
    };
    liveConversationsMap.set(jid, chat);
  }

  if (clientName !== formattedPhone) {
    chat.clientName = clientName;
  }

  chat.lastMessage = text || (mediaType ? `[${mediaType.toUpperCase()}]` : '');
  chat.lastMessageTime = timeStr;
  if (sender === 'client') {
    chat.unreadCount += 1;
  }

  const nowMs = msgTimestamp ? msgTimestamp * 1000 : Date.now();
  const msgId = `msg_${nowMs}_${Math.random().toString(36).substring(2, 6)}`;
  chat.messages.push({
    id: msgId,
    sender,
    text,
    mediaUrl,
    mediaType,
    timestamp: timeStr,
    rawTimestamp: nowMs
  });

  // Manter mensagens em ordem cronológica (mais antigas primeiro, mais novas por último)
  chat.messages.sort((a, b) => (a.rawTimestamp || 0) - (b.rawTimestamp || 0));

  if (chat.messages.length > 100) {
    chat.messages = chat.messages.slice(-100);
  }

  saveStorage();
  return chat;
}

loadStorage();

async function startWhatsAppServer() {
  try {
    if (!fs.existsSync(AUTH_FOLDER)) {
      fs.mkdirSync(AUTH_FOLDER, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
    const { version } = await fetchLatestBaileysVersion();

    console.log(`[WhatsApp Gateway Baileys Real] Iniciando Baileys v${version.join('.')}...`);

    sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: true,
      syncFullHistory: true,
      browser: ['PriceU$ Sales AI', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('contacts.set', ({ contacts }) => {
      if (contacts) {
        for (const c of contacts) {
          if (c.id && (c.name || c.notify || c.verifiedName)) {
            const name = c.name || c.notify || c.verifiedName;
            contactsMap.set(c.id, name);
            if (liveConversationsMap.has(c.id)) {
              liveConversationsMap.get(c.id).clientName = name;
            }
          }
        }
        console.log(`[WhatsApp Gateway] 📇 ${contactsMap.size} contatos importados da agenda do celular.`);
        saveStorage();
      }
    });

    // 📥 Restaurar Lista de Conversas do Baileys ao Reconectar (chats.set)
    sock.ev.on('chats.set', ({ chats }) => {
      if (!chats || chats.length === 0) return;
      let newCount = 0;
      for (const chat of chats) {
        const jid = chat.id;
        if (!jid || jid.endsWith('@g.us') || jid.includes('@lid') || jid.includes('status')) continue;
        if (!liveConversationsMap.has(jid)) {
          const formattedPhone = formatPhoneDisplay(jid);
          const clientName = getBestName(jid, chat.name || '');
          const lastMsgText = chat.messages?.[0]?.message?.conversation
            || chat.messages?.[0]?.message?.extendedTextMessage?.text
            || '';
          const lastMsgTs = chat.messages?.[0]?.messageTimestamp;
          const lastTime = lastMsgTs
            ? new Date(Number(lastMsgTs) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '';
          liveConversationsMap.set(jid, {
            id: jid,
            clientName,
            phone: formattedPhone,
            eventDate: 'A definir',
            eventType: 'Fotografia',
            city: 'Brasil',
            lastMessage: lastMsgText || '...',
            lastMessageTime: lastTime,
            aiStatus: 'auto',
            unreadCount: chat.unreadCount || 0,
            stage: 'Lead',
            estimatedValue: 0,
            messages: []
          });
          newCount++;
        }
      }
      if (newCount > 0) {
        console.log(`[WhatsApp Gateway] 🔄 ${newCount} conversas restauradas do histórico do WhatsApp.`);
        saveStorage();
      }
    });

    sock.ev.on('contacts.upsert', (contacts) => {
      if (contacts) {
        for (const c of contacts) {
          if (c.id && (c.name || c.notify || c.verifiedName)) {
            const name = c.name || c.notify || c.verifiedName;
            contactsMap.set(c.id, name);
            if (liveConversationsMap.has(c.id)) {
              liveConversationsMap.get(c.id).clientName = name;
            }
          }
        }
        saveStorage();
      }
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        connectionStatus = 'qr';
        currentRawQr = qr;
        try {
          currentQrBase64 = await QRCode.toDataURL(qr, {
            errorCorrectionLevel: 'M',
            margin: 2,
            scale: 8
          });
        } catch (err) {
          console.error('[WhatsApp Gateway] Erro ao converter QR:', err);
        }
      }

      if (connection === 'open') {
        connectionStatus = 'connected';
        currentQrBase64 = null;
        currentRawQr = null;
        connectedUser = sock.user ? sock.user.id.split(':')[0] : 'Conectado';
        console.log(`\n==================================================`);
        console.log(`[WhatsApp Gateway] ✅ WHATSAPP CONECTADO COM SUCESSO!`);
        console.log(`📱 Número Conectado: ${connectedUser}`);
        console.log(`📜 Conversas Carregadas: ${liveConversationsMap.size}`);
        console.log(`==================================================\n`);
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        connectionStatus = 'disconnected';
        currentQrBase64 = null;

        if (shouldReconnect && statusCode !== 401 && statusCode !== 403) {
          setTimeout(startWhatsAppServer, 3000);
        } else {
          if (fs.existsSync(AUTH_FOLDER)) {
            fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
          }
          setTimeout(startWhatsAppServer, 1500);
        }
      }
    });

    // 📩 Ouvinte de Mensagens e Mídias Reais em Tempo Real
    sock.ev.on('messages.upsert', async (m) => {
      for (const msg of m.messages) {
        const senderJid = msg.key.remoteJid;
        if (!senderJid || senderJid.endsWith('@g.us') || senderJid.includes('status') || senderJid.includes('@lid')) continue;

        let text =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          msg.message?.videoMessage?.caption ||
          '';

        let mediaType = undefined;
        let mediaUrl = undefined;

        if (msg.message?.imageMessage || msg.message?.videoMessage || msg.message?.audioMessage || msg.message?.stickerMessage) {
          try {
            const buffer = await downloadMediaMessage(
              msg,
              'buffer',
              {},
              { logger: console, reuploadRequest: sock.updateMediaMessage }
            );

            let ext = 'jpg';
            if (msg.message?.videoMessage) { ext = 'mp4'; mediaType = 'video'; }
            else if (msg.message?.audioMessage) { ext = 'mp3'; mediaType = 'audio'; }
            else if (msg.message?.stickerMessage) { ext = 'webp'; mediaType = 'image'; }
            else { mediaType = 'image'; }

            const filename = `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
            const filePath = path.join(MEDIA_FOLDER, filename);
            fs.writeFileSync(filePath, buffer);
            mediaUrl = `/media/${filename}`;

            if (!text) {
              text = mediaType === 'image' ? '📷 [Foto do WhatsApp]' : mediaType === 'video' ? '🎥 [Vídeo]' : '🎙️ [Áudio de voz]';
            }
          } catch (err) {
            console.warn('[WhatsApp Gateway] Erro ao descriptografar mídia:', err);
          }
        }

        if (!text || text.trim() === '') continue;
        const pushName = msg.pushName || '';

        const isNewContact = !liveConversationsMap.has(senderJid);

        const chat = recordLiveMessage({
          jid: senderJid,
          pushName,
          sender: msg.key.fromMe ? 'user' : 'client',
          text,
          mediaUrl,
          mediaType,
          msgTimestamp: msg.messageTimestamp
        });

        if (!chat) continue;

        // Se o modo "Só nos Primeiros Contatos" estiver ativo e a conversa for de um novo contato, ativa a IA!
        if (isNewContact && firstContactOnlyMode) {
          chat.aiStatus = 'auto';
          saveStorage();
        }

        if (m.type === 'append' || msg.key.fromMe) continue;
        if (chat.aiStatus === 'paused') continue;

        const lowerText = text.toLowerCase();
        const handoffTerms = ['gerente', 'desconto especial', 'falar com humano', 'ligação', 'urgente', 'falar com fotografo'];
        const isHandoff = handoffTerms.some(term => lowerText.includes(term));

        if (isHandoff) {
          chat.aiStatus = 'paused';
          const handoffMsg = '🤖 Entendido! Notifiquei o fotógrafo e a nossa equipe humana sobre a sua solicitação. Em breve entraremos em contato direto por aqui!';
          recordLiveMessage({ jid: senderJid, pushName, sender: 'ai', text: handoffMsg });
          await sock.sendMessage(senderJid, { text: handoffMsg });
          continue;
        }

        const groqHistory = chat.messages.map(m => ({
          role: m.sender === 'client' ? 'user' : 'assistant',
          content: m.text
        })).slice(-10);

        try {
          const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                ...groqHistory
              ],
              temperature: 0.7
            })
          });

          const groqData = await groqResponse.json();
          if (groqResponse.ok && groqData.choices?.[0]?.message?.content) {
            const aiReply = groqData.choices[0].message.content.trim();
            recordLiveMessage({ jid: senderJid, pushName, sender: 'ai', text: aiReply });
            await sock.sendMessage(senderJid, { text: aiReply });
          }
        } catch (err) {
          console.error('[WhatsApp Gateway Groq Exception]:', err);
        }
      }
    });
  } catch (err) {
    console.error('[WhatsApp Gateway] Erro ao iniciar servidor:', err);
  }
}

// 🟢 Endpoints REST

app.get('/api/whatsapp/qr', (req, res) => {
  res.json({
    status: connectionStatus,
    qrBase64: currentQrBase64,
    rawQr: currentRawQr,
    connectedUser
  });
});

app.get('/api/whatsapp/status', (req, res) => {
  res.json({
    connected: connectionStatus === 'connected',
    status: connectionStatus,
    userPhone: connectedUser
  });
});

app.get('/api/whatsapp/chats', (req, res) => {
  const validChats = Array.from(liveConversationsMap.values())
    .filter(c => c.id && !c.id.includes('@lid') && !c.id.includes('status'))
    .map(c => ({
      ...c,
      clientName: getBestName(c.id, c.clientName)
    }));

  res.json({
    chats: validChats,
    connected: connectionStatus === 'connected'
  });
});

// Alterar Status da IA para um Chat Específico
app.post('/api/whatsapp/chat/toggle-ai', (req, res) => {
  const { chatId, aiStatus } = req.body;
  const chat = liveConversationsMap.get(chatId);
  if (chat) {
    chat.aiStatus = aiStatus;
    saveStorage();
    res.json({ success: true, chat });
  } else {
    res.status(404).json({ error: 'Chat não encontrado.' });
  }
});

// Alterar Status Global em Massa
app.post('/api/whatsapp/chats/bulk-status', (req, res) => {
  const { mode } = req.body; // 'auto' | 'copilot' | 'paused' | 'first_contact'

  if (mode === 'first_contact') {
    firstContactOnlyMode = true;
    // Pausa a IA em todas as conversas existentes até o momento!
    liveConversationsMap.forEach((chat) => {
      chat.aiStatus = 'paused';
    });
  } else {
    firstContactOnlyMode = false;
    liveConversationsMap.forEach((chat) => {
      chat.aiStatus = mode;
    });
  }

  saveStorage();
  res.json({ success: true, message: `Status alterado globalmente para: ${mode}` });
});

// ✉️ Marcar TODAS as conversas como lidas
app.post('/api/whatsapp/chats/mark-all-read', (req, res) => {
  liveConversationsMap.forEach((chat) => {
    chat.unreadCount = 0;
  });
  saveStorage();
  res.json({ success: true, message: 'Todas as conversas foram marcadas como lidas.' });
});

// Renomear Contato na Agenda
app.post('/api/whatsapp/chat/rename', (req, res) => {
  const { chatId, newName } = req.body;
  if (!chatId || !newName) return res.status(400).json({ error: 'Parâmetros inválidos' });

  contactsMap.set(chatId, newName);
  const chat = liveConversationsMap.get(chatId);
  if (chat) {
    chat.clientName = newName;
  }
  saveStorage();
  res.json({ success: true, clientName: newName });
});

// Criar Nova Conversa
app.post('/api/whatsapp/chats/create', async (req, res) => {
  const { phone, clientName, initialMessage } = req.body;
  if (!phone) return res.status(400).json({ error: 'Número obrigatório.' });

  const cleanDigits = phone.replace(/\D/g, '');
  if (!cleanDigits) return res.status(400).json({ error: 'Número inválido.' });

  const jid = `${cleanDigits.startsWith('55') ? cleanDigits : '55' + cleanDigits}@s.whatsapp.net`;
  if (clientName) {
    contactsMap.set(jid, clientName);
  }

  const defaultMsg = initialMessage || 'Olá! Tudo bem? Entro em contato sobre o seu orçamento de fotografia.';

  const chat = recordLiveMessage({
    jid,
    pushName: clientName || formatPhoneDisplay(jid),
    sender: 'user',
    text: defaultMsg
  });

  if (sock && connectionStatus === 'connected') {
    try {
      await sock.sendMessage(jid, { text: defaultMsg });
    } catch (e) {
      console.warn('[WhatsApp Gateway] Erro ao enviar mensagem inicial:', e);
    }
  }

  saveStorage();
  res.json({ success: true, chat });
});

// Enviar Mensagem de Texto ou Mídia
app.post('/api/whatsapp/send', async (req, res) => {
  const { phone, chatId, message, mediaType, mediaUrl } = req.body;

  if (!sock || connectionStatus !== 'connected') {
    return res.status(400).json({ error: 'WhatsApp não está conectado.' });
  }

  if (!message && !mediaUrl) {
    return res.status(400).json({ error: 'Mensagem ou mídia obrigatória.' });
  }

  const targetJid = chatId || (phone.includes('@s.whatsapp.net') ? phone : `${phone.replace(/\D/g, '')}@s.whatsapp.net`);

  try {
    await sock.sendMessage(targetJid, { text: message });

    recordLiveMessage({
      jid: targetJid,
      pushName: '',
      sender: 'user',
      text: message,
      mediaType,
      mediaUrl
    });

    res.json({ success: true, message: 'Mensagem enviada com sucesso!' });
  } catch (err) {
    console.error('[WhatsApp Gateway] Erro ao enviar:', err);
    res.status(500).json({ error: 'Falha ao enviar mensagem.' });
  }
});

// Desconectar Sessão
// Desconectar Sessão (preserva histórico de conversas e contatos)
app.post('/api/whatsapp/disconnect', async (req, res) => {
  try {
    if (sock) {
      try { await sock.logout(); } catch (e) { /* ignora erro de logout */ }
    }
    // ✅ Apaga APENAS as credenciais de autenticação — histórico de conversas preservado!
    if (fs.existsSync(AUTH_FOLDER)) fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
    connectionStatus = 'disconnected';
    currentQrBase64 = null;
    connectedUser = null;
    sock = null;
    setTimeout(startWhatsAppServer, 1000);
    res.json({ success: true, message: 'Sessão desconectada. Histórico de conversas mantido.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao desconectar.' });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 [WhatsApp Gateway Baileys Real] Rodando na porta ${PORT}`);
  console.log(`👉 Endpoint QR: http://localhost:${PORT}/api/whatsapp/qr`);
  console.log(`👉 Endpoint Chats: http://localhost:${PORT}/api/whatsapp/chats\n`);
  startWhatsAppServer();
});

// 🛡️ Handlers globais para evitar crashes por exceções não tratadas
process.on('uncaughtException', (err) => {
  console.error('[WhatsApp Gateway] ⚠️ Exceção não tratada (mantendo servidor vivo):', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('[WhatsApp Gateway] ⚠️ Promise rejeitada não tratada (mantendo servidor vivo):', reason);
});
