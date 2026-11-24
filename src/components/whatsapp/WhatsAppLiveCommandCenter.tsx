import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  X,
  Bot,
  User,
  Sparkles,
  Plus,
  Search,
  Smile,
  Paperclip,
  Mic,
  FileText,
  Zap,
  CheckCheck,
  CreditCard,
  Edit2,
  Check,
  Power,
  Play,
  Radio,
  Clock,
  BarChart2,
  MessageSquare,
  Phone,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Reply,
  Copy,
  Star,
  Pin,
  Trash2,
  ExternalLink,
  DollarSign,
  Sun,
  Moon,
  Volume2,
  Square,
} from 'lucide-react';
import { WhatsAppAudioPlayer } from './WhatsAppAudioPlayer';
import { WhatsAppStickerDrawer } from './WhatsAppStickerDrawer';
import { WhatsAppClientDrawer } from './WhatsAppClientDrawer';
import { WhatsAppAiCopilotBar } from './WhatsAppAiCopilotBar';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  sender: 'client' | 'ai' | 'user';
  text: string;
  timestamp: string;
  rawTimestamp?: number;
  mediaType?: 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'card_quote' | 'card_contract' | 'card_pix';
  mediaUrl?: string;
  replyTo?: { id: string; sender: string; text: string };
  reaction?: string;
  cardData?: {
    title?: string;
    value?: number;
    url?: string;
    statusText?: string;
    pixKey?: string;
  };
}

export interface ConversationMock {
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
  isPinned?: boolean;
  messages: Message[];
}

// ─── Initial High-Converting Photography Mock Conversations ─────────────────

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
    aiStatus: 'copilot',
    unreadCount: 1,
    stage: 'Em Negociação',
    estimatedValue: 4500,
    isPinned: true,
    messages: [
      {
        id: 'm1',
        sender: 'client',
        text: 'Olá! Gostaria de saber disponibilidade para casamento no dia 15/11/2026 em SP.',
        timestamp: '14:18',
        rawTimestamp: 1000,
      },
      {
        id: 'm2',
        sender: 'ai',
        text: 'Olá Mariana e Lucas! ✨ Que alegria falar com vocês! Verifiquei aqui na nossa agenda e o dia 15/11/2026 está livre para atendimento exclusivo. Temos 3 pacotes principais. Vou te enviar a nossa proposta comercial completa:',
        timestamp: '14:19',
        rawTimestamp: 2000,
      },
      {
        id: 'm_card_1',
        sender: 'user',
        text: '📋 Proposta Comercial Interativa — Casamento Mariana & Lucas',
        timestamp: '14:20',
        rawTimestamp: 2500,
        mediaType: 'card_quote',
        cardData: {
          title: 'Pacote Ouro + Álbum Fine Art 30x30',
          value: 4500,
          url: 'https://priceus.app/odanielfotografo/proposta-mariana-lucas',
          statusText: '🟢 Noiva visualizou há 2 min',
        },
      },
      {
        id: 'm3',
        sender: 'client',
        text: 'Qual o valor do Pacote Ouro com o álbum incluso?',
        timestamp: '14:22',
        rawTimestamp: 3000,
      },
    ],
  },
  {
    id: '2',
    clientName: 'Camila & Bruno',
    phone: '+55 34 99123-4567',
    eventDate: '20/12/2026',
    eventType: 'Ensaio Pré-Wedding',
    city: 'Uberlândia - MG',
    lastMessage: '🎙️ [Áudio de voz]',
    lastMessageTime: '13:45',
    aiStatus: 'auto',
    unreadCount: 0,
    stage: 'Contrato Fechado',
    estimatedValue: 1800,
    messages: [
      {
        id: 'cb_1',
        sender: 'client',
        text: 'Adoramos as fotos do portfólio! Como funciona o ensaio externo?',
        timestamp: '13:40',
        rawTimestamp: 1000,
      },
      {
        id: 'cb_2',
        sender: 'client',
        text: 'Áudio sobre a preferência de local',
        timestamp: '13:45',
        rawTimestamp: 2000,
        mediaType: 'audio',
      },
    ],
  },
  {
    id: '3',
    clientName: 'Beatriz — 15 Anos',
    phone: '+55 21 98877-6655',
    eventDate: '05/09/2026',
    eventType: 'Festa de 15 Anos',
    city: 'Rio de Janeiro - RJ',
    lastMessage: 'Perfeito! Já fizemos o pagamento do sinal!',
    lastMessageTime: '11:10',
    aiStatus: 'paused',
    unreadCount: 0,
    stage: 'Contrato Fechado',
    estimatedValue: 3200,
    messages: [
      {
        id: 'b1',
        sender: 'client',
        text: 'Perfeito! Já fizemos o pagamento do sinal!',
        timestamp: '11:10',
        rawTimestamp: 1000,
      },
      {
        id: 'b_pix',
        sender: 'user',
        text: '💳 Chave PIX de Confirmação',
        timestamp: '11:12',
        rawTimestamp: 1500,
        mediaType: 'card_pix',
        cardData: {
          title: 'Entrada 30% — Reserva de Data',
          value: 960,
          pixKey: '12.345.678/0001-90',
          statusText: '✅ Sinal de R$ 960,00 confirmado',
        },
      },
    ],
  },
];

const QUICK_ACTIONS = [
  { label: '📋 Proposta Interativa', shortcut: '/proposta', type: 'card_quote' },
  { label: '✍️ Contrato Digital', shortcut: '/contrato', type: 'card_contract' },
  { label: '💳 Chave PIX', shortcut: '/pix', type: 'card_pix' },
  { label: '🖼️ Galeria de Fotos', shortcut: '/galeria', type: 'text' },
  { label: '🗓️ Confirmar Data', shortcut: '/agenda', type: 'text' },
];

export function WhatsAppLiveCommandCenter() {
  const [conversations, setConversations] = useState<ConversationMock[]>(INITIAL_CONVERSATIONS);
  const [selectedId, setSelectedId] = useState<string>('1');
  const [inputText, setInputText] = useState('');
  const [isLiveConnection, setIsLiveConnection] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'auto' | 'copilot' | 'paused'>('all');
  const [showControls, setShowControls] = useState(false);

  // CRM & Client Drawer
  const [showClientDrawer, setShowClientDrawer] = useState(false);

  // In-chat Search
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [inChatSearchQuery, setInChatSearchQuery] = useState('');
  const [inChatMatchIndex, setInChatMatchIndex] = useState(0);

  // Replying Quote state
  const [replyingMessage, setReplyingMessage] = useState<Message | null>(null);

  // Floating Context Menu on Hover
  const [activeContextMenuMsgId, setActiveContextMenuMsgId] = useState<string | null>(null);

  // Voice recording state simulation
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Modals & Drawers
  const [showStickersDrawer, setShowStickersDrawer] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showCopilotBar, setShowCopilotBar] = useState(true);
  const [copiedToast, setCopiedToast] = useState<string | null>(null);

  // New Chat Modal
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [newMsgText, setNewMsgText] = useState('');

  const chatFeedRef = useRef<HTMLDivElement>(null);
  const recordingTimerRef = useRef<any>(null);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);

  const activeConv = conversations.find((c) => c.id === selectedId) || conversations[0];

  // ── Live polling with real Gateway ─────────────────────────────────────────
  useEffect(() => {
    const fetchLiveChats = async () => {
      try {
        let res = await fetch('/api/whatsapp/chats').catch(() => null);
        if (!res || !res.ok) {
          res = await fetch('http://localhost:3001/api/whatsapp/chats').catch(() => null);
        }
        if (res && res.ok) {
          const data = await res.json();
          if (data.chats && data.chats.length > 0) {
            setIsLiveConnection(true);
            setConversations(data.chats);
          } else if (data.connected) {
            setIsLiveConnection(true);
          }
        } else {
          setIsLiveConnection(false);
        }
      } catch {
        setIsLiveConnection(false);
      }
    };

    fetchLiveChats();
    const interval = setInterval(fetchLiveChats, 2500);
    return () => clearInterval(interval);
  }, []);

  // Voice recording timer simulation
  useEffect(() => {
    if (isRecordingVoice) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(recordingTimerRef.current);
      setRecordingSeconds(0);
    }
    return () => clearInterval(recordingTimerRef.current);
  }, [isRecordingVoice]);

  // Auto scroll on new messages
  const scrollToBottom = (smooth = true) => {
    if (chatFeedRef.current) {
      chatFeedRef.current.scrollTo({
        top: chatFeedRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
      setIsUserScrolledUp(false);
    }
  };

  useEffect(() => {
    if (!isUserScrolledUp) {
      scrollToBottom(false);
    }
  }, [selectedId, activeConv?.messages?.length]);

  const handleFeedScroll = () => {
    if (!chatFeedRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatFeedRef.current;
    setIsUserScrolledUp(scrollHeight - scrollTop - clientHeight > 100);
  };

  // ── Filtered conversations list ───────────────────────────────────────────
  const filteredConversations = conversations.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = c.clientName.toLowerCase().includes(q) || c.phone.includes(q);
    if (!matchSearch) return false;

    if (statusFilter === 'unread') return c.unreadCount > 0;
    if (statusFilter === 'auto') return c.aiStatus === 'auto';
    if (statusFilter === 'copilot') return c.aiStatus === 'copilot';
    if (statusFilter === 'paused') return c.aiStatus === 'paused';
    return true;
  });

  // ── Send Handlers ──────────────────────────────────────────────────────────
  const handleSendMessage = async (
    customText?: string,
    mediaType?: Message['mediaType'],
    mediaUrl?: string,
    cardData?: Message['cardData']
  ) => {
    const text = customText !== undefined ? customText : inputText;
    if (!text.trim() && !mediaType && !mediaUrl) return;

    if (customText === undefined) setInputText('');
    setShowStickersDrawer(false);
    setShowQuickActions(false);
    setShowAttachMenu(false);

    const newMsg: Message = {
      id: `m_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      rawTimestamp: Date.now(),
      mediaType,
      mediaUrl,
      replyTo: replyingMessage
        ? {
            id: replyingMessage.id,
            sender: replyingMessage.sender === 'client' ? activeConv.clientName : 'Você',
            text: replyingMessage.text,
          }
        : undefined,
      cardData,
    };

    setReplyingMessage(null);

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConv.id
          ? {
              ...c,
              messages: [...c.messages, newMsg],
              lastMessage: text || (mediaType === 'audio' ? '🎙️ [Áudio de voz]' : '📷 [Mídia]'),
              lastMessageTime: newMsg.timestamp,
            }
          : c
      )
    );

    setTimeout(() => scrollToBottom(true), 50);

    // Call real gateway if live
    await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: activeConv.id,
        message: text,
        mediaType,
        mediaUrl,
      }),
    }).catch(() => null);
  };

  const handleSendVoiceNote = () => {
    setIsRecordingVoice(false);
    handleSendMessage('', 'audio');
  };

  const handleSendCard = (type: 'quote' | 'contract' | 'pix') => {
    if (type === 'quote') {
      handleSendMessage(
        '📋 Proposta Comercial Interativa PriceU$',
        'card_quote',
        undefined,
        {
          title: 'Pacote Fotografia — Mariana & Lucas',
          value: activeConv.estimatedValue || 4500,
          url: 'https://priceus.app/odanielfotografo/proposta-mariana-lucas',
          statusText: '🟢 Enviada para o cliente',
        }
      );
    } else if (type === 'contract') {
      handleSendMessage(
        '✍️ Contrato Digital para Assinatura',
        'card_contract',
        undefined,
        {
          title: 'Contrato de Prestação de Serviços Fotográficos',
          value: activeConv.estimatedValue || 4500,
          url: 'https://priceus.app/contrato/modelo-casamento',
          statusText: '⏳ Aguardando assinatura',
        }
      );
    } else if (type === 'pix') {
      handleSendMessage('💳 Dados Bancários para Sinal PIX', 'card_pix', undefined, {
        title: 'Sinal de Entrada (Reserva de Data)',
        value: (activeConv.estimatedValue || 4500) * 0.3,
        pixKey: '12.345.678/0001-90',
        statusText: '💳 Chave PIX (CNPJ)',
      });
    }
  };

  const handleReactToMessage = (msgId: string, emoji: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConv.id
          ? {
              ...c,
              messages: c.messages.map((m) =>
                m.id === msgId ? { ...m, reaction: m.reaction === emoji ? undefined : emoji } : m
              ),
            }
          : c
      )
    );
    setActiveContextMenuMsgId(null);
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToast('📋 Mensagem copiada!');
    setTimeout(() => setCopiedToast(null), 2500);
    setActiveContextMenuMsgId(null);
  };

  const handleToggleAiStatus = async (status: 'auto' | 'copilot' | 'paused') => {
    setConversations((prev) =>
      prev.map((c) => (c.id === activeConv.id ? { ...c, aiStatus: status } : c))
    );
    await fetch('/api/whatsapp/chat/toggle-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: activeConv.id, aiStatus: status }),
    }).catch(() => null);
  };

  const handleCreateNewChat = async () => {
    if (!newPhone.trim()) return;
    try {
      const res = await fetch('/api/whatsapp/chats/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: newPhone,
          clientName: newName || undefined,
          initialMessage: newMsgText || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.chat) {
          setConversations((prev) => [data.chat, ...prev.filter((c) => c.id !== data.chat.id)]);
          setSelectedId(data.chat.id);
        }
      }
    } catch {}
    setShowNewChatModal(false);
    setNewPhone('');
    setNewName('');
    setNewMsgText('');
  };

  return (
    <div className="space-y-3 font-sans">
      {/* Toast Notification */}
      {copiedToast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-[#00a884] text-[#111b21] font-bold text-xs shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom duration-200">
          <Check className="w-4 h-4" />
          <span>{copiedToast}</span>
        </div>
      )}

      {/* ── Main WhatsApp Web Container ───────────────────────────────────── */}
      <div
        className="flex rounded-2xl overflow-hidden shadow-2xl relative border"
        style={{
          height: '720px',
          background: '#0b141a',
          borderColor: '#2a3942',
        }}
      >
        {/* ══ LEFT SIDEBAR (CONVERSATIONS) ══════════════════════════════════ */}
        <div
          className="w-80 sm:w-96 shrink-0 h-full flex flex-col border-r z-20"
          style={{ background: '#111b21', borderColor: '#2a3942' }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b shrink-0"
            style={{ background: '#202c33', borderColor: '#2a3942' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-700 flex items-center justify-center font-extrabold text-white text-sm shadow">
                P$
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#e9edef] flex items-center gap-1.5">
                  <span>PriceU$ Vendas</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isLiveConnection ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                    }`}
                  />
                </h2>
                <p className="text-[10px] text-[#8696a0]">
                  {isLiveConnection ? '● WhatsApp Conectado' : '⚡ Modo Demonstração'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowNewChatModal(true)}
                className="p-2 rounded-full text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942] transition"
                title="Nova Conversa"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-2.5">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#202c33] border border-[#2a3942]">
              <Search className="w-4 h-4 text-[#8696a0] shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar conversa ou número..."
                className="w-full bg-transparent text-xs text-[#e9edef] placeholder-[#8696a0] outline-none"
              />
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 px-3 pb-2 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'Tudo' },
              { id: 'unread', label: 'Não lidas' },
              { id: 'copilot', label: '🧠 Copiloto' },
              { id: 'auto', label: '🤖 100% IA' },
              { id: 'paused', label: '⏸ Manual' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${
                  statusFilter === tab.id
                    ? 'bg-[#00a884] text-[#111b21]'
                    : 'bg-[#202c33] text-[#8696a0] hover:text-[#e9edef]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#2a3942]/40">
            {filteredConversations.map((c) => {
              const isSelected = selectedId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all relative ${
                    isSelected ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]/70 bg-[#111b21]'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-slate-700 to-slate-800 border border-[#2a3942] flex items-center justify-center font-bold text-white text-sm shadow">
                      {c.clientName.slice(0, 2).toUpperCase()}
                    </div>
                    {c.aiStatus === 'auto' && (
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#00a884] text-[#111b21] flex items-center justify-center text-[9px] font-extrabold shadow"
                        title="IA Ativa"
                      >
                        🤖
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm text-[#e9edef] truncate">
                        {c.clientName}
                      </h4>
                      <span className="text-[10px] text-[#8696a0] shrink-0 ml-1">
                        {c.lastMessageTime}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-[#8696a0] truncate flex-1">
                        {c.lastMessage}
                      </p>
                      {c.unreadCount > 0 && (
                        <span className="w-4 h-4 rounded-full bg-[#00a884] text-[#111b21] font-bold text-[10px] flex items-center justify-center shrink-0 ml-1.5 shadow">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ══ RIGHT CHAT AREA ═══════════════════════════════════════════════ */}
        {activeConv ? (
          <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#0b141a]">
            {/* Authentic SVG Doodle Wallpaper */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.06]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ffffff' fill-rule='evenodd'/%3E%3C/svg%3E")`,
                backgroundSize: '240px 240px',
              }}
            />

            {/* Chat Header */}
            <div
              className="px-4 py-2.5 border-b flex items-center justify-between shrink-0 z-10"
              style={{ background: '#202c33', borderColor: '#2a3942' }}
            >
              {/* Click contact opens CRM Drawer */}
              <button
                onClick={() => setShowClientDrawer(true)}
                className="flex items-center gap-3 text-left group transition"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-800 flex items-center justify-center font-bold text-white text-sm shadow">
                  {activeConv.clientName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-[#e9edef] group-hover:text-[#00a884] transition flex items-center gap-1.5">
                    <span>{activeConv.clientName}</span>
                    <span className="text-[10px] bg-[#111b21] px-1.5 py-0.5 rounded text-[#8696a0]">
                      {activeConv.stage || 'Em Negociação'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#8696a0] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{activeConv.phone}</span>
                    <span>• {activeConv.eventType}</span>
                  </p>
                </div>
              </button>

              {/* Actions on Top Right */}
              <div className="flex items-center gap-1.5">
                {/* AI Toggle Buttons */}
                <div className="flex items-center p-0.5 rounded-full bg-[#111b21] border border-[#2a3942]">
                  {[
                    { key: 'copilot', label: '🧠 Copiloto', title: 'IA sugere e você aprova' },
                    { key: 'auto', label: '🤖 Auto', title: 'IA responde 100% automático' },
                    { key: 'paused', label: '⏸ Manual', title: 'Atendimento 100% humano' },
                  ].map((btn) => (
                    <button
                      key={btn.key}
                      onClick={() => handleToggleAiStatus(btn.key as any)}
                      title={btn.title}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                        activeConv.aiStatus === btn.key
                          ? 'bg-[#00a884] text-[#111b21] shadow'
                          : 'text-[#8696a0] hover:text-[#e9edef]'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setShowInChatSearch(!showInChatSearch)}
                  className="p-2 rounded-full text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942] transition"
                  title="Buscar na conversa"
                >
                  <Search className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setShowClientDrawer(true)}
                  className="p-2 rounded-full text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942] transition"
                  title="Abrir Painel do Cliente (CRM)"
                >
                  <User className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* In-Chat Search Bar (Slide down) */}
            {showInChatSearch && (
              <div className="px-4 py-2 bg-[#202c33] border-b border-[#2a3942] flex items-center justify-between z-20 animate-in slide-in-from-top-2">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <Search className="w-4 h-4 text-[#8696a0]" />
                  <input
                    type="text"
                    value={inChatSearchQuery}
                    onChange={(e) => setInChatSearchQuery(e.target.value)}
                    placeholder="Buscar na conversa..."
                    className="w-full bg-transparent text-xs text-[#e9edef] outline-none"
                    autoFocus
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowInChatSearch(false)}
                    className="p-1 rounded-full text-[#8696a0] hover:text-[#e9edef]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Messages Feed */}
            <div
              ref={chatFeedRef}
              onScroll={handleFeedScroll}
              className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3 relative z-10"
            >
              {activeConv.messages.map((msg) => {
                const isOutgoing = msg.sender !== 'client';
                const isAI = msg.sender === 'ai';

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} group relative`}
                    onMouseEnter={() => setActiveContextMenuMsgId(msg.id)}
                    onMouseLeave={() => setActiveContextMenuMsgId(null)}
                  >
                    {/* The Message Bubble with Authentic Speech Tails */}
                    <div
                      className={`relative max-w-[85%] sm:max-w-[70%] p-2.5 rounded-2xl shadow-sm space-y-1.5 transition-all ${
                        isOutgoing ? 'bg-[#005c4b] text-[#e9edef]' : 'bg-[#202c33] text-[#e9edef]'
                      }`}
                      style={{
                        borderRadius: isOutgoing ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      }}
                    >
                      {/* Quoted Message if Replying */}
                      {msg.replyTo && (
                        <div className="p-2 rounded-xl bg-black/20 border-l-4 border-[#00a884] text-xs space-y-0.5">
                          <span className="font-bold text-[#00a884] block text-[10px]">
                            {msg.replyTo.sender}
                          </span>
                          <p className="line-clamp-1 italic text-slate-300">{msg.replyTo.text}</p>
                        </div>
                      )}

                      {/* AI Badge if message was sent by AI */}
                      {isAI && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-[#00a884] pb-0.5">
                          <Bot className="w-3 h-3" />
                          <span>PriceU$ Sales AI</span>
                        </div>
                      )}

                      {/* 1. Audio Message */}
                      {msg.mediaType === 'audio' && (
                        <WhatsAppAudioPlayer
                          mediaUrl={msg.mediaUrl}
                          isOutgoing={isOutgoing}
                          senderName={isOutgoing ? 'Você' : activeConv.clientName}
                        />
                      )}

                      {/* 2. Interactive Card: Quote / Proposal */}
                      {msg.mediaType === 'card_quote' && msg.cardData && (
                        <div className="p-3 rounded-xl bg-[#111b21]/80 border border-[#00a884]/40 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#00a884] flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5" /> Proposta Comercial
                            </span>
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                              {msg.cardData.statusText || '🟢 Visualizada'}
                            </span>
                          </div>
                          <h4 className="font-bold text-white text-sm">{msg.cardData.title}</h4>
                          <div className="flex items-center justify-between pt-1 border-t border-[#2a3942]">
                            <span className="text-emerald-400 font-extrabold text-sm">
                              R$ {msg.cardData.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            <a
                              href={msg.cardData.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-lg bg-[#00a884] text-[#111b21] font-bold text-[11px] flex items-center gap-1 shadow hover:opacity-90 transition"
                            >
                              <span>Abrir Proposta</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      )}

                      {/* 3. Interactive Card: PIX */}
                      {msg.mediaType === 'card_pix' && msg.cardData && (
                        <div className="p-3 rounded-xl bg-[#111b21]/80 border border-amber-500/40 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-amber-400 flex items-center gap-1.5">
                              <CreditCard className="w-3.5 h-3.5" /> Chave PIX Estúdio
                            </span>
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                              {msg.cardData.statusText || 'Aguardando Pagamento'}
                            </span>
                          </div>
                          <p className="font-bold text-white text-sm">{msg.cardData.title}</p>
                          <div className="p-2 rounded-lg bg-black/40 font-mono text-center text-amber-300 text-xs select-all">
                            {msg.cardData.pixKey}
                          </div>
                          <button
                            onClick={() => handleCopyText(msg.cardData?.pixKey || '')}
                            className="w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] flex items-center justify-center gap-1 shadow transition"
                          >
                            <Copy className="w-3 h-3" /> Copiar Chave PIX
                          </button>
                        </div>
                      )}

                      {/* Regular Text Message */}
                      {msg.text && (
                        <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                          {msg.text}
                        </p>
                      )}

                      {/* Footer: Timestamp & Delivery Checks */}
                      <div className="flex items-center justify-end gap-1 text-[10px] text-[#8696a0] pt-0.5">
                        <span>{msg.timestamp}</span>
                        {isOutgoing && (
                          <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                        )}
                      </div>

                      {/* Message Reaction badge if any */}
                      {msg.reaction && (
                        <div className="absolute -bottom-2.5 right-2 px-1.5 py-0.5 rounded-full bg-[#202c33] border border-[#2a3942] text-xs shadow-md">
                          {msg.reaction}
                        </div>
                      )}
                    </div>

                    {/* Hover Dropdown Action on Message */}
                    {activeContextMenuMsgId === msg.id && (
                      <div
                        className={`absolute top-0 ${
                          isOutgoing ? '-left-28' : '-right-28'
                        } z-30 p-1 rounded-xl bg-[#202c33] border border-[#2a3942] shadow-xl flex items-center gap-1 animate-in fade-in duration-150`}
                      >
                        <button
                          onClick={() => setReplyingMessage(msg)}
                          title="Responder"
                          className="p-1.5 rounded-lg text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942] transition"
                        >
                          <Reply className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleReactToMessage(msg.id, '❤️')}
                          title="Reagir ❤️"
                          className="p-1.5 rounded-lg hover:scale-125 transition-transform"
                        >
                          ❤️
                        </button>
                        <button
                          onClick={() => handleReactToMessage(msg.id, '👍')}
                          title="Reagir 👍"
                          className="p-1.5 rounded-lg hover:scale-125 transition-transform"
                        >
                          👍
                        </button>
                        <button
                          onClick={() => handleCopyText(msg.text)}
                          title="Copiar"
                          className="p-1.5 rounded-lg text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942] transition"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Scroll to bottom button */}
            {isUserScrolledUp && (
              <button
                onClick={() => scrollToBottom(true)}
                className="absolute bottom-20 right-6 z-20 w-10 h-10 rounded-full bg-[#202c33] hover:bg-[#2a3942] border border-[#2a3942] text-[#00a884] flex items-center justify-center shadow-2xl transition-all animate-bounce"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            )}

            {/* Replying Box above Input Bar */}
            {replyingMessage && (
              <div className="px-4 py-2 bg-[#202c33] border-t border-[#2a3942] flex items-center justify-between z-20">
                <div className="flex items-center gap-2 border-l-4 border-[#00a884] pl-2 text-xs">
                  <Reply className="w-3.5 h-3.5 text-[#00a884]" />
                  <div>
                    <span className="font-bold text-[#00a884] block text-[10px]">
                      Respondendo a {replyingMessage.sender === 'client' ? activeConv.clientName : 'Você'}
                    </span>
                    <p className="line-clamp-1 text-[#8696a0] italic">{replyingMessage.text}</p>
                  </div>
                </div>
                <button
                  onClick={() => setReplyingMessage(null)}
                  className="p-1 rounded-full text-[#8696a0] hover:text-[#e9edef]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Floating AI Copilot Bar */}
            {showCopilotBar && activeConv.aiStatus !== 'auto' && (
              <WhatsAppAiCopilotBar
                clientName={activeConv.clientName}
                onApplySuggestion={(text, sendImmediately) => {
                  if (sendImmediately) {
                    handleSendMessage(text);
                  } else {
                    setInputText(text);
                  }
                }}
                onDismiss={() => setShowCopilotBar(false)}
              />
            )}

            {/* Sticker Drawer Popup */}
            {showStickersDrawer && (
              <div className="z-30">
                <WhatsAppStickerDrawer
                  onSelectEmoji={(emoji) => {
                    setInputText((prev) => prev + emoji);
                  }}
                  onSelectSticker={(url, caption) => {
                    handleSendMessage(caption || '', 'image', url);
                    setShowStickersDrawer(false);
                  }}
                  onClose={() => setShowStickersDrawer(false)}
                />
              </div>
            )}

            {/* Quick Actions Shortcuts Popover */}
            {showQuickActions && (
              <div className="px-4 py-2 bg-[#202c33] border-t border-[#2a3942] grid grid-cols-3 sm:grid-cols-5 gap-2 z-20 animate-in slide-in-from-bottom-2">
                <button
                  onClick={() => {
                    handleSendCard('quote');
                    setShowQuickActions(false);
                  }}
                  className="p-2 rounded-xl bg-[#111b21] hover:bg-[#00a884]/20 border border-[#2a3942] text-[11px] font-bold text-[#e9edef] hover:text-[#00a884] transition text-center"
                >
                  📋 Proposta Interativa
                </button>
                <button
                  onClick={() => {
                    handleSendCard('contract');
                    setShowQuickActions(false);
                  }}
                  className="p-2 rounded-xl bg-[#111b21] hover:bg-[#00a884]/20 border border-[#2a3942] text-[11px] font-bold text-[#e9edef] hover:text-[#00a884] transition text-center"
                >
                  ✍️ Contrato Digital
                </button>
                <button
                  onClick={() => {
                    handleSendCard('pix');
                    setShowQuickActions(false);
                  }}
                  className="p-2 rounded-xl bg-[#111b21] hover:bg-[#00a884]/20 border border-[#2a3942] text-[11px] font-bold text-[#e9edef] hover:text-[#00a884] transition text-center"
                >
                  💳 Chave PIX
                </button>
                <button
                  onClick={() => {
                    handleSendMessage('🖼️ Segue o link da sua galeria de fotos exclusiva: https://priceus.app/odanielfotografo/galeria-mariana-lucas');
                    setShowQuickActions(false);
                  }}
                  className="p-2 rounded-xl bg-[#111b21] hover:bg-[#00a884]/20 border border-[#2a3942] text-[11px] font-bold text-[#e9edef] hover:text-[#00a884] transition text-center"
                >
                  🖼️ Galeria de Fotos
                </button>
                <button
                  onClick={() => {
                    handleSendMessage('📅 Data confirmada na agenda exclusiva do estúdio!');
                    setShowQuickActions(false);
                  }}
                  className="p-2 rounded-xl bg-[#111b21] hover:bg-[#00a884]/20 border border-[#2a3942] text-[11px] font-bold text-[#e9edef] hover:text-[#00a884] transition text-center"
                >
                  🗓️ Confirmar Data
                </button>
              </div>
            )}

            {/* ══ BOTTOM INPUT BAR (WHATSAPP WEB OFFICIAL) ══════════════════ */}
            <div
              className="px-3 sm:px-4 py-3 border-t flex items-center gap-2 shrink-0 z-20"
              style={{ background: '#202c33', borderColor: '#2a3942' }}
            >
              {isRecordingVoice ? (
                /* Voice Recording Live Simulation */
                <div className="flex-1 flex items-center justify-between px-4 py-2 rounded-2xl bg-[#111b21] border border-rose-500/40">
                  <div className="flex items-center gap-2 text-rose-400 text-xs font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                    <span>Gravando áudio de voz... {recordingSeconds}s</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsRecordingVoice(false)}
                      className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 transition"
                      title="Cancelar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleSendVoiceNote}
                      className="px-3 py-1 rounded-xl bg-[#00a884] text-[#111b21] font-bold text-xs flex items-center gap-1 shadow"
                    >
                      <Send className="w-3.5 h-3.5" /> Enviar Áudio
                    </button>
                  </div>
                </div>
              ) : (
                /* Regular Text Input & Action Buttons */
                <>
                  {/* Emoji & Sticker Drawer Button */}
                  <button
                    onClick={() => setShowStickersDrawer(!showStickersDrawer)}
                    className="p-2 rounded-full text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942] transition"
                    title="Emojis e Figurinhas"
                  >
                    <Smile className="w-5 h-5" />
                  </button>

                  {/* Quick Studio Shortcuts Button */}
                  <button
                    onClick={() => setShowQuickActions(!showQuickActions)}
                    className="p-2 rounded-full text-[#00a884] hover:bg-[#2a3942] transition"
                    title="Ações Rápidas PriceU$ (/proposta, /pix, /contrato)"
                  >
                    <Zap className="w-5 h-5" />
                  </button>

                  {/* Input Box */}
                  <div className="flex-1 rounded-2xl bg-[#2a3942] px-4 py-2.5 flex items-center">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Digite uma mensagem ou digite / para atalhos..."
                      className="w-full bg-transparent text-sm text-[#e9edef] placeholder-[#8696a0] outline-none"
                    />
                  </div>

                  {/* Microphone or Send Button */}
                  {inputText.trim() ? (
                    <button
                      onClick={() => handleSendMessage()}
                      className="w-10 h-10 rounded-full bg-[#00a884] text-[#111b21] flex items-center justify-center shadow-lg transition-transform active:scale-95 hover:opacity-90"
                      title="Enviar Mensagem"
                    >
                      <Send className="w-5 h-5 ml-0.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsRecordingVoice(true)}
                      className="w-10 h-10 rounded-full bg-[#2a3942] text-[#8696a0] hover:text-[#00a884] flex items-center justify-center transition-all"
                      title="Gravar Áudio"
                    >
                      <Mic className="w-5 h-5" />
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Sliding CRM Client Drawer */}
            <WhatsAppClientDrawer
              isOpen={showClientDrawer}
              onClose={() => setShowClientDrawer(false)}
              clientName={activeConv.clientName}
              phone={activeConv.phone}
              eventDate={activeConv.eventDate}
              eventType={activeConv.eventType}
              city={activeConv.city}
              estimatedValue={activeConv.estimatedValue}
              stage={activeConv.stage}
              onSendQuoteCard={() => handleSendCard('quote')}
              onSendContractCard={() => handleSendCard('contract')}
              onSendPixCard={() => handleSendCard('pix')}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#8696a0]">
            <MessageSquare className="w-12 h-12 text-[#00a884] mb-3" />
            <h3 className="text-lg font-bold text-[#e9edef]">WhatsApp Web PriceU$</h3>
            <p className="text-xs max-w-sm mt-1">
              Selecione uma conversa ao lado para começar o atendimento com o Copiloto IA e atalhos de vendas.
            </p>
          </div>
        )}
      </div>

      {/* ══ NEW CHAT MODAL ══════════════════════════════════════════════════ */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl p-6 bg-[#202c33] border border-[#2a3942] shadow-2xl space-y-4 text-[#e9edef]">
            <div className="flex items-center justify-between pb-3 border-b border-[#2a3942]">
              <h3 className="font-bold text-base flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#00a884]" /> Nova Conversa WhatsApp
              </h3>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="p-1 rounded-lg text-[#8696a0] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1 text-[#8696a0]">
                  Número do Celular (com DDD):
                </label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="ex: 5511987654321"
                  className="w-full rounded-xl px-3.5 py-2.5 bg-[#111b21] border border-[#2a3942] font-mono text-[#e9edef] outline-none"
                />
              </div>

              <div>
                <label className="block font-medium mb-1 text-[#8696a0]">
                  Nome do Cliente / Casal (Opcional):
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="ex: Jéssica & Gabriel"
                  className="w-full rounded-xl px-3.5 py-2.5 bg-[#111b21] border border-[#2a3942] text-[#e9edef] outline-none"
                />
              </div>

              <div>
                <label className="block font-medium mb-1 text-[#8696a0]">
                  Mensagem Inicial (Opcional):
                </label>
                <textarea
                  value={newMsgText}
                  onChange={(e) => setNewMsgText(e.target.value)}
                  rows={3}
                  placeholder="Olá! Sou o fotógrafo e gostaria de conversar sobre o seu orçamento..."
                  className="w-full rounded-xl px-3.5 py-2.5 bg-[#111b21] border border-[#2a3942] text-[#e9edef] outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-[#2a3942]">
              <button
                onClick={() => setShowNewChatModal(false)}
                className="px-4 py-2 text-xs font-semibold text-[#8696a0] hover:text-[#e9edef]"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateNewChat}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#00a884] text-[#111b21] flex items-center gap-1.5 shadow hover:opacity-90 transition"
              >
                <Send className="w-3.5 h-3.5" /> Iniciar Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
