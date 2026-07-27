import { useState, useRef, useEffect } from 'react';
import {
  Send, X, Bot, User, Sparkles, Plus, Search, Smile,
  Paperclip, Mic, FileText, Zap, CheckCheck, CreditCard,
  Edit2, Check, Power, Play, Radio, Clock, BarChart2,
  MessageSquare, Phone, MoreVertical,
  Image as ImageIcon
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  sender: 'client' | 'ai' | 'user';
  text: string;
  timestamp: string;
  rawTimestamp?: number;
  mediaType?: 'image' | 'video' | 'audio' | 'document';
  mediaUrl?: string;
}

interface ConversationMock {
  id: string;
  clientName: string;
  phone: string;
  eventDate: string;
  eventType: string;
  city: string;
  lastMessage: string;
  lastMessageTime: string;
  aiStatus: 'auto' | 'copilot' | 'paused';
  unreadCount: number;
  stage?: string;
  estimatedValue?: number;
  messages: Message[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_CONVERSATIONS: ConversationMock[] = [
  {
    id: '1',
    clientName: 'Mariana & Lucas',
    phone: '+55 11 98765-4321',
    eventDate: '15/11/2026',
    eventType: 'Casamento',
    city: 'São Paulo - SP',
    lastMessage: 'Qual o valor do Pacote Ouro com o álbum incluso?',
    lastMessageTime: '14:22',
    aiStatus: 'auto',
    unreadCount: 1,
    stage: 'Em Negociação',
    estimatedValue: 4500,
    messages: [
      { id: 'm1', sender: 'client', text: 'Olá! Gostaria de saber disponibilidade para casamento no dia 15/11/2026 em SP.', timestamp: '14:18', rawTimestamp: 1000 },
      { id: 'm2', sender: 'ai', text: 'Olá Mariana e Lucas! ✨ Que alegria falar com vocês! Verifiquei aqui na nossa agenda e o dia 15/11/2026 está livre para atendimento exclusivo. Temos 3 pacotes principais. Vou te enviar o link com a proposta completa ajustada para São Paulo:', timestamp: '14:19', rawTimestamp: 2000 },
      { id: 'm3', sender: 'client', text: 'Qual o valor do Pacote Ouro com o álbum incluso?', timestamp: '14:22', rawTimestamp: 3000 }
    ]
  }
];

const QUICK_EMOJIS = ['😊','📸','✨','🗓️','💍','📋','👍','❤️','🙏','🚀','💬','🛍️','🎁','📍','💳','📅'];

const QUICK_REPLIES = [
  { label: '📋 Proposta Interativa', text: '✨ Aqui está o link com a proposta comercial completa e interativa do nosso estúdio: https://priceus.app/odanielfotografo/casamentos' },
  { label: '✍️ Modelo de Contrato', text: '📄 Para garantir a sua data na agenda, você pode visualizar e assinar o contrato digital no link: https://priceus.app/contrato/modelo-casamento' },
  { label: '💳 Chave PIX Pagamento', text: '💳 Segue os dados bancários para depósito da entrada:\nChave PIX (CNPJ): 12.345.678/0001-90\nFavorecido: PriceU$ Fotografia' },
  { label: '📷 Link do Portfólio', text: '🖼️ Confira o nosso portfólio completo de trabalhos recentes: https://priceus.app/odanielfotografo/portfolio' },
  { label: '🗓️ Confirmar Agenda', text: '📅 Data verificada! O dia desejado está disponível para atendimento exclusivo do nosso estúdio.' }
];

const STUDIO_STICKERS = [
  { title: 'Data Garantida', sticker: '🌟 DATA GARANTIDA NA AGENDA! 🌟' },
  { title: 'Contrato Assinado', sticker: '🎉 CONTRATO ASSINADO COM SUCESSO! 🎉' },
  { title: 'Ansioso pelo Ensaio', sticker: '📸 ANSIOSO PARA O NOSSO ENSAIO! 📸' },
  { title: 'Felicidades', sticker: '💍 PARABÉNS AO CASAL! 💍' }
];

// Avatar color palette — deterministic from name
const AVATAR_COLORS = [
  '#d9fdd3', '#ffd7ba', '#e8d5f5', '#c8e6f5', '#ffeeba',
  '#f5c6cb', '#c3e6cb', '#bee5eb', '#d6d8db', '#cce5ff'
];
const AVATAR_TEXT_COLORS = [
  '#075e54', '#7c4a00', '#4a0072', '#004080', '#856404',
  '#721c24', '#155724', '#0c5460', '#383d41', '#004085'
];

function getAvatarStyle(name: string) {
  const idx = (name || 'WA').charCodeAt(0) % AVATAR_COLORS.length;
  return { bg: AVATAR_COLORS[idx], fg: AVATAR_TEXT_COLORS[idx] };
}

function getInitials(name: string) {
  if (!name) return 'WA';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── WhatsApp Web CSS tokens ─────────────────────────────────────────────
const WA = {
  sidebarBg: '#111b21',
  chatBg: '#0b141a',
  toolbar: '#202c33',
  inputBg: '#2a3942',
  sentBubble: '#005c4b',
  receivedBubble: '#202c33',
  aiBubble: '#1a2e25',
  green: '#00a884',
  textPrimary: '#e9edef',
  textSecondary: '#8696a0',
  divider: '#2a373f',
  unreadBadge: '#00a884',
  selectedRow: '#2a3942',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function WhatsAppLiveCommandCenter() {
  const [conversations, setConversations] = useState<ConversationMock[]>(INITIAL_CONVERSATIONS);
  const [selectedId, setSelectedId] = useState<string>('1');
  const [inputText, setInputText] = useState('');
  const [isLiveConnection, setIsLiveConnection] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'auto' | 'copilot' | 'paused'>('all');
  const [showControls, setShowControls] = useState(false);

  // Rename contact
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  // Modals & Popovers
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [newMsgText, setNewMsgText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  // Diagnostics
  const [diagnostics, setDiagnostics] = useState({ totalChats: 0, aiActive: 0, unread: 0, responded: 0, connectedSince: '' });
  const diagnosticsInitialized = useRef(false);

  // Bulk send
  const [showBulkSendModal, setShowBulkSendModal] = useState(false);
  const [bulkMessage, setBulkMessage] = useState('');
  const [bulkMinDelay, setBulkMinDelay] = useState(8);
  const [bulkMaxDelay, setBulkMaxDelay] = useState(25);
  const [bulkTargetStatus, setBulkTargetStatus] = useState<'all' | 'auto' | 'paused'>('all');
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ sent: number; total: number; currentName: string } | null>(null);

  const chatFeedRef = useRef<HTMLDivElement>(null);
  const popoverContainerRef = useRef<HTMLDivElement>(null);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);

  const activeConv = conversations.find((c) => c.id === selectedId) || conversations[0];

  // ── Live polling ──────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchLiveChats = async () => {
      try {
        let res = await fetch('/api/whatsapp/chats').catch(() => null);
        if (!res || !res.ok) res = await fetch('http://localhost:3001/api/whatsapp/chats').catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          if (data.chats && data.chats.length > 0) {
            const wasConnected = isLiveConnection;
            setIsLiveConnection(true);
            setConversations(data.chats);
            setSelectedId((prev) => {
              const exists = data.chats.some((c: ConversationMock) => c.id === prev);
              return exists ? prev : data.chats[0].id;
            });
            if (!diagnosticsInitialized.current && !wasConnected) {
              diagnosticsInitialized.current = true;
              setDiagnostics({
                totalChats: data.chats.length,
                aiActive: data.chats.filter((c: ConversationMock) => c.aiStatus === 'auto').length,
                unread: data.chats.reduce((s: number, c: ConversationMock) => s + (c.unreadCount || 0), 0),
                responded: 0,
                connectedSince: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              });
            } else if (diagnosticsInitialized.current) {
              setDiagnostics(prev => ({
                ...prev,
                totalChats: data.chats.length,
                aiActive: data.chats.filter((c: ConversationMock) => c.aiStatus === 'auto').length,
                unread: data.chats.reduce((s: number, c: ConversationMock) => s + (c.unreadCount || 0), 0),
              }));
            }
          } else if (data.connected) {
            setIsLiveConnection(true);
          }
        } else {
          setIsLiveConnection(false);
          diagnosticsInitialized.current = false;
        }
      } catch {
        setIsLiveConnection(false);
        diagnosticsInitialized.current = false;
      }
    };
    fetchLiveChats();
    const interval = setInterval(fetchLiveChats, 2000);
    return () => clearInterval(interval);
  }, [isLiveConnection]);

  // ── Click outside to close popovers ──────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverContainerRef.current && !popoverContainerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
        setShowQuickReplies(false);
        setShowStickers(false);
        setShowAttachMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Scroll management ─────────────────────────────────────────────────────
  const handleFeedScroll = () => {
    if (!chatFeedRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatFeedRef.current;
    setIsUserScrolledUp(scrollHeight - scrollTop - clientHeight > 80);
  };

  useEffect(() => {
    if (chatFeedRef.current && !isUserScrolledUp) {
      chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight;
    }
  }, [selectedId]);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filteredConversations = conversations.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = c.clientName.toLowerCase().includes(q) || c.phone.includes(q);
    const matchStatus = statusFilter === 'all' || c.aiStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleMarkAllRead = async () => {
    setConversations(prev => prev.map(c => ({ ...c, unreadCount: 0 })));
    await fetch('/api/whatsapp/chats/mark-all-read', { method: 'POST' }).catch(() => null);
  };

  const handleBulkStatusChange = async (mode: 'auto' | 'copilot' | 'paused' | 'first_contact') => {
    setConversations(prev => prev.map(c => ({ ...c, aiStatus: mode === 'first_contact' ? 'paused' : mode })));
    await fetch('/api/whatsapp/chats/bulk-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode })
    }).catch(() => null);
  };

  const handleToggleStatus = async (id: string, status: 'auto' | 'copilot' | 'paused') => {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, aiStatus: status } : c));
    await fetch('/api/whatsapp/chat/toggle-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: id, aiStatus: status })
    }).catch(() => null);
  };

  const handleBulkSend = async () => {
    if (!bulkMessage.trim()) return;
    const targets = conversations.filter(c => bulkTargetStatus === 'all' || c.aiStatus === bulkTargetStatus);
    if (!targets.length) return;
    setBulkSending(true);
    setBulkProgress({ sent: 0, total: targets.length, currentName: targets[0].clientName });
    for (let i = 0; i < targets.length; i++) {
      const conv = targets[i];
      setBulkProgress({ sent: i, total: targets.length, currentName: conv.clientName });
      await fetch('/api/whatsapp/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: conv.id, message: bulkMessage })
      }).catch(() => null);
      setConversations(prev => prev.map(c => c.id === conv.id
        ? { ...c, lastMessage: bulkMessage, lastMessageTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
        : c));
      setDiagnostics(prev => ({ ...prev, responded: prev.responded + 1 }));
      if (i < targets.length - 1) {
        const delay = (bulkMinDelay + Math.random() * (bulkMaxDelay - bulkMinDelay)) * 1000;
        await new Promise(r => setTimeout(r, delay));
      }
    }
    setBulkProgress({ sent: targets.length, total: targets.length, currentName: 'Concluído!' });
    setBulkSending(false);
    setTimeout(() => { setBulkProgress(null); setShowBulkSendModal(false); setBulkMessage(''); }, 3000);
  };

  const handleSaveContactName = async () => {
    if (!activeConv || !editedName.trim()) return;
    const name = editedName.trim();
    setIsEditingName(false);
    setConversations(prev => prev.map(c => c.id === activeConv.id ? { ...c, clientName: name } : c));
    await fetch('/api/whatsapp/chat/rename', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: activeConv.id, newName: name })
    }).catch(() => null);
  };

  const handleSendMessage = async (id: string, customText?: string, mediaType?: 'image' | 'document' | 'audio') => {
    const text = customText || inputText;
    if (!text.trim() && !mediaType) return;
    if (!customText) setInputText('');
    setShowEmojiPicker(false); setShowQuickReplies(false); setShowStickers(false); setShowAttachMenu(false);
    const msg: Message = {
      id: `m_${Date.now()}`, sender: 'user', text, mediaType,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      rawTimestamp: Date.now()
    };
    setConversations(prev => prev.map(c => c.id === id
      ? { ...c, aiStatus: 'paused', messages: [...c.messages, msg], lastMessage: text, lastMessageTime: msg.timestamp }
      : c));
    // Auto-scroll on new message
    setTimeout(() => {
      if (chatFeedRef.current) chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight;
    }, 50);
    await fetch('/api/whatsapp/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: id, message: text, mediaType })
    }).catch(() => null);
  };

  const handleCreateNewChat = async () => {
    if (!newPhone.trim()) return;
    try {
      const res = await fetch('/api/whatsapp/chats/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: newPhone, clientName: newName || undefined, initialMessage: newMsgText || undefined })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.chat) { setConversations(prev => [data.chat, ...prev.filter(c => c.id !== data.chat.id)]); setSelectedId(data.chat.id); }
      }
    } catch { /**/ }
    setShowNewChatModal(false); setNewPhone(''); setNewName(''); setNewMsgText('');
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">

      {/* ── Commercial Controls Bar (collapsed by default) ── */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: WA.toolbar, borderColor: WA.divider }}>
        <button
          onClick={() => setShowControls(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-bold"
          style={{ color: WA.textPrimary }}
        >
          <span className="flex items-center gap-2">
            <Zap className="w-4 h-4" style={{ color: WA.green }} />
            Controles Comerciais PriceU$
            {isLiveConnection && (
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold animate-pulse"
                style={{ background: `${WA.green}25`, color: WA.green, border: `1px solid ${WA.green}50` }}>
                ● AO VIVO
              </span>
            )}
          </span>
          <span style={{ color: WA.textSecondary, fontSize: 11 }}>{showControls ? '▲ recolher' : '▼ expandir'}</span>
        </button>

        {showControls && (
          <div className="px-5 pb-4 space-y-3 border-t" style={{ borderColor: WA.divider }}>
            {/* AI Global Controls */}
            <div className="flex flex-wrap items-center gap-2 pt-3">
              <span className="text-xs font-bold" style={{ color: WA.textSecondary }}>IA em Massa:</span>
              {[
                { label: '⚡ Só Primeiros Contatos', mode: 'first_contact' as const, color: '#7c3aed' },
                { label: '🤖 Ativar em Todas', mode: 'auto' as const, color: WA.green },
                { label: '👨‍💻 Copiloto em Todas', mode: 'copilot' as const, color: '#d97706' },
                { label: '⏸ Desativar Todas', mode: 'paused' as const, color: '#e53e3e' },
              ].map(btn => (
                <button key={btn.mode} onClick={() => handleBulkStatusChange(btn.mode)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-80"
                  style={{ background: `${btn.color}20`, color: btn.color, border: `1px solid ${btn.color}40` }}>
                  {btn.label}
                </button>
              ))}
              <button onClick={() => setShowBulkSendModal(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-80"
                style={{ background: '#7c3aed20', color: '#a78bfa', border: '1px solid #7c3aed40' }}>
                <Radio className="w-3 h-3 inline mr-1" />Disparo em Massa
              </button>
              <button onClick={handleMarkAllRead}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-80"
                style={{ background: '#2a373f', color: WA.textSecondary, border: `1px solid ${WA.divider}` }}>
                <CheckCheck className="w-3 h-3 inline mr-1" style={{ color: WA.green }} />Marcar Lidas
              </button>
              <button onClick={() => setShowNewChatModal(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-80"
                style={{ background: `${WA.green}20`, color: WA.green, border: `1px solid ${WA.green}40` }}>
                <Plus className="w-3 h-3 inline mr-1" />Nova Conversa
              </button>
            </div>

            {/* Diagnostics */}
            {isLiveConnection && diagnostics.connectedSince && (
              <div className="flex flex-wrap gap-3 text-[11px] pt-1 border-t" style={{ borderColor: WA.divider }}>
                <span style={{ color: WA.textSecondary }} className="flex items-center gap-1">
                  <BarChart2 className="w-3 h-3" /> Desde {diagnostics.connectedSince}:
                </span>
                <span style={{ color: WA.textPrimary }}>💬 <b>{diagnostics.totalChats}</b> conversas</span>
                <span style={{ color: WA.green }}>🤖 <b>{diagnostics.aiActive}</b> IA ativa</span>
                <span style={{ color: '#d97706' }}>📬 <b>{diagnostics.unread}</b> não lidas</span>
                <span style={{ color: '#818cf8' }}>✅ <b>{diagnostics.responded}</b> respondidas</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Main WhatsApp Web Interface ── */}
      <div className="flex rounded-2xl overflow-hidden shadow-2xl" style={{ height: '680px', border: `1px solid ${WA.divider}` }}>

        {/* ══ LEFT SIDEBAR ════════════════════════════════════════════════════ */}
        <div className="flex flex-col w-[360px] shrink-0 h-full" style={{ background: WA.sidebarBg, borderRight: `1px solid ${WA.divider}` }}>

          {/* Sidebar Header */}
          <div className="flex items-center justify-between px-4 py-3" style={{ background: WA.toolbar }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: WA.green, color: '#111b21' }}>P$</div>
              <span className="font-semibold text-sm" style={{ color: WA.textPrimary }}>PriceU$ WhatsApp</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowNewChatModal(true)}
                className="p-2 rounded-full hover:opacity-70 transition"
                style={{ color: WA.textSecondary }}>
                <Plus className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-full hover:opacity-70 transition" style={{ color: WA.textSecondary }}>
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="px-3 py-2" style={{ background: WA.sidebarBg }}>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: WA.inputBg }}>
              <Search className="w-4 h-4 shrink-0" style={{ color: WA.textSecondary }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Pesquisar ou começar nova conversa"
                className="bg-transparent flex-1 text-sm outline-none"
                style={{ color: WA.textPrimary }}
              />
            </div>
          </div>

          {/* Status filter tabs */}
          <div className="flex items-center gap-1 px-3 pb-2 overflow-x-auto no-scrollbar">
            {[
              { key: 'all', label: 'Todas' },
              { key: 'auto', label: '🤖 IA' },
              { key: 'copilot', label: '👨‍💻 Copiloto' },
              { key: 'paused', label: '⏸ Humano' }
            ].map(tab => (
              <button key={tab.key}
                onClick={() => setStatusFilter(tab.key as any)}
                className="whitespace-nowrap text-xs px-3 py-1 rounded-full font-medium transition-all"
                style={statusFilter === tab.key
                  ? { background: `${WA.green}30`, color: WA.green, border: `1px solid ${WA.green}60` }
                  : { color: WA.textSecondary, border: '1px solid transparent' }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-sm" style={{ color: WA.textSecondary }}>
                {isLiveConnection ? 'Nenhuma conversa encontrada.' : '📱 Conecte ao WhatsApp para ver as conversas.'}
              </div>
            ) : (
              filteredConversations.map(c => {
                const isSelected = selectedId === c.id;
                const av = getAvatarStyle(c.clientName);
                const initials = getInitials(c.clientName);
                return (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedId(c.id); setIsEditingName(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:opacity-90"
                    style={{
                      background: isSelected ? WA.selectedRow : 'transparent',
                      borderBottom: `1px solid ${WA.divider}`
                    }}
                  >
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
                      style={{ background: av.bg, color: av.fg }}>
                      {initials}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate" style={{ color: WA.textPrimary }}>{c.clientName}</span>
                        <span className="text-xs shrink-0 ml-2"
                          style={{ color: c.unreadCount > 0 ? WA.green : WA.textSecondary }}>
                          {c.lastMessageTime}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-xs truncate flex-1" style={{ color: WA.textSecondary }}>
                          {c.aiStatus === 'auto' ? '🤖 ' : c.aiStatus === 'copilot' ? '👨‍💻 ' : '⏸ '}
                          {c.lastMessage}
                        </span>
                        {c.unreadCount > 0 && (
                          <span className="ml-2 shrink-0 w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center"
                            style={{ background: WA.green, color: '#111b21' }}>
                            {c.unreadCount > 9 ? '9+' : c.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ══ RIGHT CHAT PANEL ════════════════════════════════════════════════ */}
        {activeConv ? (
          <div className="flex-1 flex flex-col h-full relative" style={{ background: WA.chatBg }}>

            {/* Wallpaper subtle dot pattern */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
              style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

            {/* Chat Header */}
            <div className="flex items-center justify-between px-4 py-2.5 z-10 relative shrink-0"
              style={{ background: WA.toolbar, borderBottom: `1px solid ${WA.divider}` }}>
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: getAvatarStyle(activeConv.clientName).bg, color: getAvatarStyle(activeConv.clientName).fg }}>
                  {getInitials(activeConv.clientName)}
                </div>

                {/* Name + status */}
                <div>
                  {isEditingName ? (
                    <div className="flex items-center gap-1.5">
                      <input type="text" value={editedName} onChange={e => setEditedName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSaveContactName()}
                        className="bg-transparent border-b text-sm outline-none font-semibold"
                        style={{ color: WA.textPrimary, borderColor: WA.green }} autoFocus />
                      <button onClick={handleSaveContactName}
                        className="p-1 rounded-full" style={{ background: WA.green, color: '#111b21' }}>
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => { setIsEditingName(true); setEditedName(activeConv.clientName); }}
                      className="flex items-center gap-1.5 hover:opacity-70 transition text-left">
                      <span className="font-semibold text-sm" style={{ color: WA.textPrimary }}>{activeConv.clientName}</span>
                      <Edit2 className="w-3 h-3" style={{ color: WA.textSecondary }} />
                    </button>
                  )}
                  <p className="text-xs flex items-center gap-1.5" style={{ color: WA.textSecondary }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{ background: activeConv.aiStatus === 'auto' ? WA.green : activeConv.aiStatus === 'copilot' ? '#d97706' : '#e53e3e' }} />
                    {activeConv.phone}
                  </p>
                </div>
              </div>

              {/* Right: AI mode toggle + icons */}
              <div className="flex items-center gap-2">
                {/* AI Status Toggle */}
                <div className="flex items-center rounded-full p-0.5" style={{ background: WA.sidebarBg }}>
                  {[
                    { mode: 'auto' as const, label: '🤖', title: 'IA Automática' },
                    { mode: 'copilot' as const, label: '👨‍💻', title: 'Copiloto' },
                    { mode: 'paused' as const, label: '⏸', title: 'Humano' },
                  ].map(btn => (
                    <button key={btn.mode} onClick={() => handleToggleStatus(activeConv.id, btn.mode)}
                      title={btn.title}
                      className="px-2.5 py-1 rounded-full text-xs font-bold transition-all"
                      style={activeConv.aiStatus === btn.mode
                        ? { background: btn.mode === 'auto' ? WA.green : btn.mode === 'copilot' ? '#d97706' : '#e53e3e', color: '#fff' }
                        : { color: WA.textSecondary }}>
                      {btn.label}
                    </button>
                  ))}
                </div>
                <button className="p-2 rounded-full hover:opacity-70" style={{ color: WA.textSecondary }}>
                  <Phone className="w-5 h-5" />
                </button>
                <button className="p-2 rounded-full hover:opacity-70" style={{ color: WA.textSecondary }}>
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Message Feed */}
            <div ref={chatFeedRef} onScroll={handleFeedScroll}
              className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5 relative z-10">
              {[...activeConv.messages]
                .sort((a, b) => ((a as any).rawTimestamp || 0) - ((b as any).rawTimestamp || 0))
                .map(msg => {
                  const isOutgoing = msg.sender !== 'client';
                  const isAI = msg.sender === 'ai';
                  return (
                    <div key={msg.id} className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} mb-1`}>
                      <div
                        className="relative max-w-[70%] px-3 py-2 rounded-lg shadow-sm"
                        style={{
                          background: isOutgoing ? (isAI ? WA.aiBubble : WA.sentBubble) : WA.receivedBubble,
                          borderRadius: isOutgoing ? '12px 12px 0 12px' : '12px 12px 12px 0',
                        }}
                      >
                        {/* AI badge */}
                        {isAI && (
                          <span className="text-[10px] font-bold block mb-0.5" style={{ color: WA.green }}>
                            🤖 PriceU$ AI
                          </span>
                        )}

                        {/* Media */}
                        {msg.mediaType === 'image' && (
                          <div className="mb-2 rounded-lg overflow-hidden">
                            <img src={msg.mediaUrl || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=400&q=80'}
                              alt="Foto" className="w-full h-44 object-cover" />
                          </div>
                        )}
                        {msg.mediaType === 'audio' && (
                          <div className="mb-2 flex items-center gap-2 py-1"
                            style={{ color: WA.green }}>
                            <Mic className="w-4 h-4 animate-pulse" />
                            <span className="text-xs font-mono" style={{ color: WA.textPrimary }}>Áudio de voz (0:24)</span>
                          </div>
                        )}
                        {msg.mediaType === 'document' && (
                          <div className="mb-2 flex items-center gap-2 py-1">
                            <FileText className="w-4 h-4" style={{ color: '#818cf8' }} />
                            <span className="text-xs" style={{ color: WA.textPrimary }}>Documento PDF</span>
                          </div>
                        )}

                        {/* Text */}
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words"
                          style={{ color: WA.textPrimary }}>
                          {msg.text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
                            part.startsWith('**') && part.endsWith('**')
                              ? <strong key={i}>{part.slice(2, -2)}</strong>
                              : <span key={i}>{part}</span>
                          )}
                        </p>

                        {/* Time + read receipt */}
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-[11px]" style={{ color: `${WA.textSecondary}cc` }}>{msg.timestamp}</span>
                          {isOutgoing && <CheckCheck className="w-3.5 h-3.5" style={{ color: WA.green }} />}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* ── Input Toolbar ── */}
            <div ref={popoverContainerRef} className="shrink-0 relative z-10"
              style={{ background: WA.toolbar, borderTop: `1px solid ${WA.divider}` }}>

              {/* Commercial quick action bar */}
              <div className="flex items-center gap-1.5 px-4 pt-2 pb-1 overflow-x-auto no-scrollbar">
                <button onClick={() => setShowQuickReplies(v => !v)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all hover:opacity-80"
                  style={{ background: `${WA.green}20`, color: WA.green, border: `1px solid ${WA.green}30` }}>
                  ⚡ Respostas Rápidas
                </button>
                <button onClick={() => setShowStickers(v => !v)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all hover:opacity-80"
                  style={{ background: '#d9770620', color: '#d97706', border: '1px solid #d9770630' }}>
                  🎭 Figurinhas
                </button>
                <button onClick={() => handleSendMessage(activeConv.id, '💳 Chave PIX: 12.345.678/0001-90 | PriceU$ Fotografia')}
                  className="px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all hover:opacity-80"
                  style={{ background: '#818cf820', color: '#818cf8', border: '1px solid #818cf830' }}>
                  💳 Enviar PIX
                </button>
              </div>

              {/* Emoji picker */}
              {showEmojiPicker && (
                <div className="absolute bottom-20 left-4 rounded-2xl p-3 shadow-2xl z-30 grid grid-cols-8 gap-1.5 w-64"
                  style={{ background: WA.sidebarBg, border: `1px solid ${WA.divider}` }}>
                  {QUICK_EMOJIS.map(e => (
                    <button key={e} onClick={() => setInputText(p => p + e)}
                      className="text-base p-1.5 rounded-lg hover:opacity-70 transition text-center">{e}</button>
                  ))}
                </div>
              )}

              {/* Quick replies popover */}
              {showQuickReplies && (
                <div className="absolute bottom-20 left-4 rounded-2xl p-3 shadow-2xl z-30 space-y-1.5 w-80"
                  style={{ background: WA.sidebarBg, border: `1px solid ${WA.divider}` }}>
                  <p className="text-[11px] font-bold px-2 uppercase tracking-wider mb-1" style={{ color: WA.textSecondary }}>
                    Respostas Rápidas Comerciais
                  </p>
                  {QUICK_REPLIES.map(qr => (
                    <button key={qr.label} onClick={() => { handleSendMessage(activeConv.id, qr.text); setShowQuickReplies(false); }}
                      className="w-full text-left p-2.5 rounded-xl flex items-center justify-between transition-all hover:opacity-80"
                      style={{ background: WA.receivedBubble, border: `1px solid ${WA.divider}` }}>
                      <span className="text-xs font-medium" style={{ color: WA.textPrimary }}>{qr.label}</span>
                      <Send className="w-3 h-3 shrink-0" style={{ color: WA.green }} />
                    </button>
                  ))}
                </div>
              )}

              {/* Stickers popover */}
              {showStickers && (
                <div className="absolute bottom-20 left-40 rounded-2xl p-3 shadow-2xl z-30 space-y-2 w-72"
                  style={{ background: WA.sidebarBg, border: `1px solid ${WA.divider}` }}>
                  <p className="text-[11px] font-bold px-2 uppercase tracking-wider" style={{ color: WA.textSecondary }}>
                    Stickers do Estúdio
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {STUDIO_STICKERS.map(s => (
                      <button key={s.title} onClick={() => { handleSendMessage(activeConv.id, s.sticker); setShowStickers(false); }}
                        className="p-2.5 rounded-xl text-center text-xs font-bold transition-all hover:opacity-80"
                        style={{ background: WA.receivedBubble, border: `1px solid ${WA.divider}`, color: '#d97706' }}>
                        {s.sticker}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Attachment menu */}
              {showAttachMenu && (
                <div className="absolute bottom-20 left-14 rounded-2xl p-2 shadow-2xl z-30 space-y-1 w-48"
                  style={{ background: WA.sidebarBg, border: `1px solid ${WA.divider}` }}>
                  {[
                    { icon: <ImageIcon className="w-4 h-4" style={{ color: WA.green }} />, label: 'Foto / Imagem', type: 'image' as const },
                    { icon: <FileText className="w-4 h-4" style={{ color: '#818cf8' }} />, label: 'Documento PDF', type: 'document' as const },
                    { icon: <Mic className="w-4 h-4" style={{ color: '#d97706' }} />, label: 'Áudio de Voz', type: 'audio' as const },
                  ].map(item => (
                    <button key={item.label}
                      onClick={() => { handleSendMessage(activeConv.id, `[${item.label} enviado]`, item.type); setShowAttachMenu(false); }}
                      className="w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 text-xs font-medium transition-all hover:opacity-80"
                      style={{ color: WA.textPrimary }}>
                      {item.icon} {item.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Main input row */}
              <div className="flex items-center gap-2 px-4 pb-3 pt-1">
                <button onClick={() => setShowEmojiPicker(v => !v)}
                  className="p-2 rounded-full hover:opacity-70 transition"
                  style={{ color: WA.textSecondary }}>
                  <Smile className="w-5 h-5" />
                </button>
                <button onClick={() => setShowAttachMenu(v => !v)}
                  className="p-2 rounded-full hover:opacity-70 transition"
                  style={{ color: WA.textSecondary }}>
                  <Paperclip className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage(activeConv.id)}
                  placeholder="Digite uma mensagem"
                  className="flex-1 rounded-full px-4 py-2.5 text-sm outline-none"
                  style={{ background: WA.inputBg, color: WA.textPrimary }}
                />
                {inputText.trim() ? (
                  <button onClick={() => handleSendMessage(activeConv.id)}
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition hover:opacity-80"
                    style={{ background: WA.green }}>
                    <Send className="w-5 h-5" style={{ color: '#111b21' }} />
                  </button>
                ) : (
                  <button onClick={() => handleSendMessage(activeConv.id, '🎙️ [Áudio de voz (0:15)]', 'audio')}
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition hover:opacity-80"
                    style={{ background: WA.green }}>
                    <Mic className="w-5 h-5" style={{ color: '#111b21' }} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* No conversation selected — WhatsApp Web placeholder */
          <div className="flex-1 flex flex-col items-center justify-center" style={{ background: WA.chatBg }}>
            <div className="w-24 h-24 rounded-full flex items-center justify-center mb-4"
              style={{ background: WA.toolbar }}>
              <MessageSquare className="w-10 h-10" style={{ color: WA.green }} />
            </div>
            <h2 className="text-xl font-light mb-2" style={{ color: WA.textPrimary }}>PriceU$ WhatsApp Web</h2>
            <p className="text-sm text-center max-w-xs" style={{ color: WA.textSecondary }}>
              Selecione uma conversa ao lado para começar o atendimento.
            </p>
          </div>
        )}
      </div>

      {/* ══ BULK SEND MODAL ═════════════════════════════════════════════════ */}
      {showBulkSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-5 shadow-2xl"
            style={{ background: WA.toolbar, border: `1px solid ${WA.divider}` }}>
            <div className="flex items-center justify-between pb-3" style={{ borderBottom: `1px solid ${WA.divider}` }}>
              <h3 className="font-bold text-base flex items-center gap-2" style={{ color: WA.textPrimary }}>
                <Radio className="w-5 h-5" style={{ color: '#a78bfa' }} />Disparo em Massa Anti-Bot
              </h3>
              {!bulkSending && (
                <button onClick={() => setShowBulkSendModal(false)} style={{ color: WA.textSecondary }}>
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {bulkProgress && (
              <div className="rounded-xl p-4 space-y-2" style={{ background: WA.sidebarBg }}>
                <div className="flex justify-between text-xs font-semibold" style={{ color: WA.textPrimary }}>
                  <span className="flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 animate-pulse" style={{ color: '#a78bfa' }} />
                    {bulkProgress.sent < bulkProgress.total ? `Enviando para: ${bulkProgress.currentName}` : '✅ Concluído!'}
                  </span>
                  <span style={{ color: '#a78bfa' }}>{bulkProgress.sent}/{bulkProgress.total}</span>
                </div>
                <div className="w-full rounded-full h-2" style={{ background: WA.inputBg }}>
                  <div className="h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(bulkProgress.sent / bulkProgress.total) * 100}%`, background: '#7c3aed' }} />
                </div>
              </div>
            )}

            {!bulkSending && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={{ color: WA.textPrimary }}>Mensagem</label>
                  <textarea value={bulkMessage} onChange={e => setBulkMessage(e.target.value)} rows={4}
                    placeholder="Ex: Oi! Promoção especial disponível... 📸"
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
                    style={{ background: WA.inputBg, color: WA.textPrimary, border: `1px solid ${WA.divider}` }} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={{ color: WA.textPrimary }}>Enviar Para</label>
                  <div className="flex gap-2">
                    {(['all', 'paused', 'auto'] as const).map(opt => (
                      <button key={opt} onClick={() => setBulkTargetStatus(opt)}
                        className="flex-1 px-3 py-1.5 rounded-xl text-xs font-bold transition"
                        style={bulkTargetStatus === opt
                          ? { background: '#7c3aed', color: '#fff' }
                          : { background: WA.inputBg, color: WA.textSecondary, border: `1px solid ${WA.divider}` }}>
                        {opt === 'all' ? '📋 Todas' : opt === 'paused' ? '⏸ Humano' : '🤖 IA Ativa'}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px]" style={{ color: WA.textSecondary }}>
                    {conversations.filter(c => bulkTargetStatus === 'all' || c.aiStatus === bulkTargetStatus).length} conversa(s)
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold flex items-center gap-1.5" style={{ color: WA.textPrimary }}>
                    <Clock className="w-3.5 h-3.5 text-amber-400" />Delay Aleatório (Anti-Bot)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Mínimo (segundos)', value: bulkMinDelay, set: setBulkMinDelay, min: 3, max: 60 },
                      { label: 'Máximo (segundos)', value: bulkMaxDelay, set: setBulkMaxDelay, min: 5, max: 120 },
                    ].map(f => (
                      <div key={f.label}>
                        <label className="text-[10px] block mb-1" style={{ color: WA.textSecondary }}>{f.label}</label>
                        <input type="number" min={f.min} max={f.max} value={f.value}
                          onChange={e => f.set(Number(e.target.value))}
                          className="w-full rounded-xl px-3 py-1.5 text-xs outline-none"
                          style={{ background: WA.inputBg, color: WA.textPrimary, border: `1px solid ${WA.divider}` }} />
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-amber-400">⚠️ Recomendado: mín 8s / máx 25s para parecer natural</p>
                </div>

                <button onClick={handleBulkSend} disabled={!bulkMessage.trim()}
                  className="w-full font-bold py-2.5 rounded-xl text-sm transition flex items-center justify-center gap-2 disabled:opacity-40"
                  style={{ background: '#7c3aed', color: '#fff' }}>
                  <Radio className="w-4 h-4" />
                  Iniciar Disparo ({conversations.filter(c => bulkTargetStatus === 'all' || c.aiStatus === bulkTargetStatus).length} contatos)
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ══ NEW CHAT MODAL ══════════════════════════════════════════════════ */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl"
            style={{ background: WA.toolbar, border: `1px solid ${WA.divider}` }}>
            <div className="flex items-center justify-between pb-3" style={{ borderBottom: `1px solid ${WA.divider}` }}>
              <h3 className="font-bold text-base flex items-center gap-2" style={{ color: WA.textPrimary }}>
                <MessageSquare className="w-5 h-5" style={{ color: WA.green }} />Nova Conversa
              </h3>
              <button onClick={() => setShowNewChatModal(false)} style={{ color: WA.textSecondary }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {[
                { label: 'Número do Celular (com DDD):', value: newPhone, set: setNewPhone, placeholder: 'ex: 5534999998888', type: 'text', mono: true },
                { label: 'Nome do Cliente / Casal (Opcional):', value: newName, set: setNewName, placeholder: 'ex: Camila & Bruno', type: 'text', mono: false },
              ].map(f => (
                <div key={f.label}>
                  <label className="block font-medium mb-1" style={{ color: WA.textSecondary }}>{f.label}</label>
                  <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                    className={`w-full rounded-xl px-3.5 py-2.5 text-xs outline-none ${f.mono ? 'font-mono' : ''}`}
                    style={{ background: WA.inputBg, color: WA.textPrimary, border: `1px solid ${WA.divider}` }} />
                </div>
              ))}
              <div>
                <label className="block font-medium mb-1" style={{ color: WA.textSecondary }}>Mensagem Inicial (Opcional):</label>
                <textarea value={newMsgText} onChange={e => setNewMsgText(e.target.value)} rows={3}
                  placeholder="Olá! Tudo bem? Sou fotógrafo..."
                  className="w-full rounded-xl px-3.5 py-2.5 text-xs outline-none resize-none"
                  style={{ background: WA.inputBg, color: WA.textPrimary, border: `1px solid ${WA.divider}` }} />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2" style={{ borderTop: `1px solid ${WA.divider}` }}>
              <button onClick={() => setShowNewChatModal(false)}
                className="px-4 py-2 text-xs font-semibold" style={{ color: WA.textSecondary }}>Cancelar</button>
              <button onClick={handleCreateNewChat}
                className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition hover:opacity-80"
                style={{ background: WA.green, color: '#111b21' }}>
                <Send className="w-3.5 h-3.5" />Iniciar Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
