import { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Calendar,
  MapPin,
  ArrowRight,
  X,
  LayoutGrid,
  Columns,
  Bot,
  User,
  Sparkles
} from 'lucide-react';

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
  stage: 'Novo Lead' | 'Orçamento Enviado' | 'Em Negociação' | 'Aguardando Assinatura';
  estimatedValue: number;
  messages: {
    id: string;
    sender: 'client' | 'ai' | 'user';
    text: string;
    timestamp: string;
    aiMetadata?: {
      toolsUsed?: string[];
      priceCalculated?: number;
      quoteLinkGenerated?: boolean;
    };
  }[];
}

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
      { id: 'm1', sender: 'client', text: 'Olá! Gostaria de saber disponibilidade para casamento no dia 15/11/2026 em SP.', timestamp: '14:18' },
      {
        id: 'm2',
        sender: 'ai',
        text: 'Olá Mariana e Lucas! ✨ Que alegria falar com vocês! Verifiquei aqui na nossa agenda e o dia 15/11/2026 está livre para atendimento exclusivo. Temos 3 pacotes principais. Vou te enviar o link com a proposta completa ajustada para São Paulo:',
        timestamp: '14:19',
        aiMetadata: { toolsUsed: ['check_calendar_availability', 'calculate_custom_quote'], priceCalculated: 4500, quoteLinkGenerated: true }
      },
      { id: 'm3', sender: 'client', text: 'Qual o valor do Pacote Ouro com o álbum incluso?', timestamp: '14:22' }
    ]
  },
  {
    id: '2',
    clientName: 'Fernanda Souza',
    phone: '+55 21 99123-8877',
    eventDate: '20/09/2026',
    eventType: 'Ensaio Gestante',
    city: 'Rio de Janeiro - RJ',
    lastMessage: 'Quais as opções de parcelamento sem juros?',
    lastMessageTime: '13:05',
    aiStatus: 'copilot',
    unreadCount: 0,
    stage: 'Orçamento Enviado',
    estimatedValue: 950,
    messages: [
      { id: 'm4', sender: 'client', text: 'Boa tarde! Vocês fazem ensaio em estúdio?', timestamp: '13:00' },
      { id: 'm5', sender: 'ai', text: 'Boa tarde Fernanda! Fazemos sim! Temos estúdio completo climatizado e com figurinos inclusos. Posso te enviar as fotos do portfólio?', timestamp: '13:01' },
      { id: 'm6', sender: 'client', text: 'Quais as opções de parcelamento sem juros?', timestamp: '13:05' }
    ]
  },
  {
    id: '3',
    clientName: 'Rodrigo & Beatriz',
    phone: '+55 31 97766-5544',
    eventDate: '10/10/2026',
    eventType: 'Casamento',
    city: 'Belo Horizonte - MG',
    lastMessage: 'Preciso falar com o gerente sobre um desconto especial.',
    lastMessageTime: '11:40',
    aiStatus: 'paused',
    unreadCount: 2,
    stage: 'Em Negociação',
    estimatedValue: 5200,
    messages: [
      { id: 'm7', sender: 'client', text: 'Preciso falar com o gerente sobre um desconto especial.', timestamp: '11:40' },
      { id: 'm8', sender: 'ai', text: '🤖 Handoff ativado: Palavra-chave "gerente" identificada. Atendimento transferido para a equipe humana.', timestamp: '11:40' }
    ]
  },
  {
    id: '4',
    clientName: 'Camila & Gustavo',
    phone: '+55 19 98822-1133',
    eventDate: '05/12/2026',
    eventType: 'Casamento',
    city: 'Campinas - SP',
    lastMessage: 'Vou conversar com o noivo e te aviso até amanhã!',
    lastMessageTime: '09:15',
    aiStatus: 'auto',
    unreadCount: 0,
    stage: 'Aguardando Assinatura',
    estimatedValue: 6800,
    messages: [
      { id: 'm9', sender: 'client', text: 'Adoramos a proposta! Como faço para reservar a data?', timestamp: '09:10' },
      { id: 'm10', sender: 'ai', text: 'Que incrível Camila! Para reservar a data basta preencher o contrato no link abaixo e realizar a entrada de 30% via PIX.', timestamp: '09:12' },
      { id: 'm11', sender: 'client', text: 'Vou conversar com o noivo e te aviso até amanhã!', timestamp: '09:15' }
    ]
  }
];

export function WhatsAppLiveCommandCenter() {
  const [conversations, setConversations] = useState<ConversationMock[]>(INITIAL_CONVERSATIONS);
  const [viewMode, setViewMode] = useState<'grid' | 'split'>('grid');
  const [selectedId, setSelectedId] = useState<string>('1');
  const [activeModalId, setActiveModalId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find((c) => c.id === (viewMode === 'split' ? selectedId : activeModalId));

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, activeModalId, selectedId]);

  const handleToggleStatus = (id: string, status: 'auto' | 'copilot' | 'paused') => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, aiStatus: status } : c))
    );
  };

  const handleSendMessage = (id: string) => {
    if (!inputText.trim()) return;
    const newMsg = {
      id: `m_${Date.now()}`,
      sender: 'user' as const,
      text: inputText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              aiStatus: 'paused',
              messages: [...c.messages, newMsg],
              lastMessage: inputText,
              lastMessageTime: newMsg.timestamp
            }
          : c
      )
    );
    setInputText('');
  };

  return (
    <div className="space-y-6">
      {/* Header com resumo visual e Alternador de Modo de Visualização */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <h3 className="font-bold text-slate-100 text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            Central de Comando ao Vivo
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Escolha como prefere visualizar suas conversas ativas no WhatsApp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Alternador Grid vs Chat Split */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'grid'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Modo Cards (Grid)</span>
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'split'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Modo Chat (Split)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-lg border border-emerald-500/20 font-semibold">
              {conversations.filter((c) => c.aiStatus === 'auto').length} IA Ativa
            </span>
            <span className="text-xs bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-lg border border-amber-500/20 font-semibold">
              {conversations.filter((c) => c.aiStatus === 'copilot').length} Copiloto
            </span>
            <span className="text-xs bg-rose-500/10 text-rose-400 px-2.5 py-1 rounded-lg border border-rose-500/20 font-semibold">
              {conversations.filter((c) => c.aiStatus === 'paused').length} Assumidos
            </span>
          </div>
        </div>
      </div>

      {/* 🎴 VISUALIZAÇÃO 1: MODO CARDS (GRID) */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-5">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`bg-slate-900 border rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-all hover:shadow-2xl hover:border-slate-700 ${
                conv.aiStatus === 'auto'
                  ? 'border-emerald-500/40 shadow-emerald-950/20'
                  : conv.aiStatus === 'copilot'
                  ? 'border-amber-500/40 shadow-amber-950/20'
                  : 'border-rose-500/40 shadow-rose-950/20'
              }`}
            >
              {/* Header do Card */}
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-slate-100 text-base">{conv.clientName}</h4>
                    <span className="text-xs text-slate-400">{conv.eventType}</span>
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                      conv.aiStatus === 'auto'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : conv.aiStatus === 'copilot'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {conv.aiStatus === 'auto' ? '🤖 IA Ativa' : conv.aiStatus === 'copilot' ? '👨‍💻 Copiloto' : '⏸️ Assumido'}
                  </span>
                </div>

                {/* Informações Rápidas */}
                <div className="space-y-1 text-xs text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Data: <strong className="text-slate-200">{conv.eventDate}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="truncate">{conv.city}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                    <span className="text-emerald-400 font-semibold font-mono">R$ {conv.estimatedValue.toLocaleString('pt-BR')}</span>
                    <span className="text-[11px] bg-slate-900 text-slate-300 px-2 py-0.5 rounded">{conv.stage}</span>
                  </div>
                </div>
              </div>

              {/* Preview da Última Mensagem */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/50 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Última mensagem</span>
                  <span>{conv.lastMessageTime}</span>
                </div>
                <p className="text-xs text-slate-300 italic line-clamp-2">"{conv.lastMessage}"</p>
              </div>

              {/* Controles do Card (Botões de Ação) */}
              <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                <div className="grid grid-cols-3 gap-1 flex-1">
                  <button
                    onClick={() => handleToggleStatus(conv.id, 'auto')}
                    className={`py-1.5 text-[11px] font-medium rounded-lg transition ${
                      conv.aiStatus === 'auto' ? 'bg-emerald-600 text-slate-950 font-bold' : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                    title="Modo Automático com Gemini"
                  >
                    🤖 Auto
                  </button>
                  <button
                    onClick={() => handleToggleStatus(conv.id, 'copilot')}
                    className={`py-1.5 text-[11px] font-medium rounded-lg transition ${
                      conv.aiStatus === 'copilot' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                    title="IA sugere, você aprova"
                  >
                    👨‍💻 Copiloto
                  </button>
                  <button
                    onClick={() => handleToggleStatus(conv.id, 'paused')}
                    className={`py-1.5 text-[11px] font-medium rounded-lg transition ${
                      conv.aiStatus === 'paused' ? 'bg-rose-600 text-white font-bold' : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                    title="Pausar IA e assumir conversa"
                  >
                    ⏸️ Pausar
                  </button>
                </div>

                <button
                  onClick={() => setActiveModalId(conv.id)}
                  className="p-2 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white rounded-lg transition"
                  title="Abrir Chat Completo ao Vivo"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 💬 VISUALIZAÇÃO 2: MODO CHAT SPLIT (DUAS COLUNAS COMO ANTES) */}
      {viewMode === 'split' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[680px] bg-slate-900 rounded-2xl border border-slate-800 text-slate-100 overflow-hidden shadow-2xl">
          {/* Coluna Esquerda: Lista de Conversas */}
          <div className="lg:col-span-4 border-r border-slate-800 bg-slate-950 flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <span className="font-semibold text-slate-200 text-sm">Todas as Conversas</span>
              <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-medium">
                {conversations.length} Ativas
              </span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left p-4 transition-all hover:bg-slate-900/80 flex flex-col gap-2 ${
                    selectedId === c.id ? 'bg-slate-900 border-l-4 border-emerald-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-200 text-sm truncate">{c.clientName}</span>
                    <span className="text-xs text-slate-400">{c.lastMessageTime}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{c.eventType} • {c.city}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                        c.aiStatus === 'auto'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : c.aiStatus === 'copilot'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {c.aiStatus === 'auto' ? '🤖 IA Ativa' : c.aiStatus === 'copilot' ? '👨‍💻 Copiloto' : '⏸️ Pausado'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 truncate">"{c.lastMessage}"</p>
                </button>
              ))}
            </div>
          </div>

          {/* Coluna Direita: Painel do Chat Selecionado */}
          {activeConv && (
            <div className="lg:col-span-8 flex flex-col bg-slate-900">
              {/* Header do Chat Selecionado */}
              <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-100">{activeConv.clientName}</h3>
                  <p className="text-xs text-slate-400">
                    {activeConv.phone} | Data: <span className="text-emerald-400 font-medium">{activeConv.eventDate}</span> | {activeConv.city}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
                    <button
                      onClick={() => handleToggleStatus(activeConv.id, 'auto')}
                      className={`px-2.5 py-1 text-xs rounded-md font-medium transition ${
                        activeConv.aiStatus === 'auto'
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      🤖 Auto
                    </button>
                    <button
                      onClick={() => handleToggleStatus(activeConv.id, 'copilot')}
                      className={`px-2.5 py-1 text-xs rounded-md font-medium transition ${
                        activeConv.aiStatus === 'copilot'
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      👨‍💻 Copiloto
                    </button>
                    <button
                      onClick={() => handleToggleStatus(activeConv.id, 'paused')}
                      className={`px-2.5 py-1 text-xs rounded-md font-medium transition ${
                        activeConv.aiStatus === 'paused'
                          ? 'bg-rose-500 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      ⏸️ Assumir
                    </button>
                  </div>
                </div>
              </div>

              {/* Feed de Mensagens */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/60">
                {activeConv.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'client' ? 'items-start' : 'items-end'}`}
                  >
                    <div
                      className={`max-w-md p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        msg.sender === 'client'
                          ? 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700'
                          : msg.sender === 'ai'
                          ? 'bg-emerald-950/80 text-emerald-100 border border-emerald-500/30 rounded-tr-none'
                          : 'bg-indigo-600 text-white rounded-tr-none'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4 mb-1 text-[11px] opacity-75">
                        <span className="font-semibold flex items-center gap-1">
                          {msg.sender === 'client' && <User className="w-3 h-3 text-slate-400" />}
                          {msg.sender === 'ai' && <Bot className="w-3 h-3 text-emerald-400" />}
                          {msg.sender === 'user' && <User className="w-3 h-3 text-indigo-200" />}
                          {msg.sender === 'client' ? activeConv.clientName : msg.sender === 'ai' ? 'Priceus Sales AI' : 'Você (Humano)'}
                        </span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <div className="whitespace-pre-wrap text-sm leading-relaxed space-y-1">
                        {msg.text.split(/(\*\*[^*]+\*\*)/g).map((part, idx) => {
                          if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={idx} className="font-bold text-white bg-white/10 px-1 py-0.5 rounded">{part.slice(2, -2)}</strong>;
                          }
                          return <span key={idx}>{part}</span>;
                        })}
                      </div>
                      {msg.aiMetadata && (
                        <div className="mt-2 pt-2 border-t border-emerald-500/20 text-[11px] text-emerald-300/80 space-y-1">
                          <div className="flex items-center gap-1 font-mono">
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            <span>Ferramentas: {msg.aiMetadata.toolsUsed?.join(', ')}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input de Resposta */}
              <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center gap-3">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(activeConv.id)}
                  placeholder="Digite para responder manualmente (a IA será pausada automaticamente)..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => handleSendMessage(activeConv.id)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm transition"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 💬 MODAL DE CHAT NO MODO CARDS (GRID) QUANDO CLICADO */}
      {viewMode === 'grid' && activeConv && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col h-[600px]">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-100 text-base">{activeConv.clientName}</h3>
                <p className="text-xs text-slate-400">
                  {activeConv.eventType} • {activeConv.city} • <strong className="text-emerald-400">{activeConv.eventDate}</strong>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-emerald-400">R$ {activeConv.estimatedValue.toLocaleString('pt-BR')}</span>
                <button
                  onClick={() => setActiveModalId(null)}
                  className="p-1 text-slate-400 hover:text-slate-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-900/60">
              {activeConv.messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.sender === 'client' ? 'items-start' : 'items-end'}`}
                >
                  <div
                    className={`p-3 rounded-2xl text-xs max-w-md leading-relaxed ${
                      m.sender === 'client'
                        ? 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700'
                        : m.sender === 'ai'
                        ? 'bg-emerald-950/80 text-emerald-100 border border-emerald-500/30 rounded-tr-none'
                        : 'bg-indigo-600 text-white rounded-tr-none'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-1 text-[10px] opacity-75">
                      <span className="font-semibold">
                        {m.sender === 'client' ? activeConv.clientName : m.sender === 'ai' ? 'Priceus Sales AI' : 'Você'}
                      </span>
                      <span>{m.timestamp}</span>
                    </div>
                    <div className="whitespace-pre-wrap text-xs leading-relaxed space-y-1">
                      {m.text.split(/(\*\*[^*]+\*\*)/g).map((part, idx) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                          return <strong key={idx} className="font-bold text-white bg-white/10 px-1 py-0.5 rounded">{part.slice(2, -2)}</strong>;
                        }
                        return <span key={idx}>{part}</span>;
                      })}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(activeConv.id)}
                placeholder="Intervir manualmente no chat (a IA será pausada automaticamente)..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={() => handleSendMessage(activeConv.id)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-xl text-xs flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
