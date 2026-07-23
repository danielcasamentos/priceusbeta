import { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  User,
  HelpCircle,
  BookOpen
} from 'lucide-react';
import { callPriHelpAssistant } from '../services/priHelpAssistantService';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  suggestedActions?: { label: string; actionId: string }[];
}

const PRI_KNOWLEDGE_SUGGESTIONS = [
  { label: 'Pri, como configurar a Secretária Virtual do WhatsApp?', actionId: 'whatsapp' },
  { label: 'Pri, como criar um Template de Proposta Interativa?', actionId: 'templates' },
  { label: 'Pri, como cadastrar Taxas de Deslocamento por Cidade?', actionId: 'pricing' },
  { label: 'Pri, como funcionam os Contratos com Assinatura Digital?', actionId: 'contracts' }
];

export function PriceusAssistantDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: 'Olá! Sou a **Pri** 💖, sua assistente oficial de suporte e ajuda do Priceus!\n\nEstou aqui para te ajudar a configurar seu estúdio, cadastrar produtos, criar templates de propostas, ajustar taxas de deslocamento e ativar sua secretária de WhatsApp.\n\nComo posso te ajudar hoje?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedActions: PRI_KNOWLEDGE_SUGGESTIONS
    }
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || isLoading) return;

    const userMsg: Message = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    // Chamada à API da Pri (Assistente de Ajuda ao Usuário do Priceus)
    callPriHelpAssistant(query)
      .then((res) => {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai_${Date.now()}`,
            sender: 'ai',
            text: res.replyText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      })
      .catch(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai_${Date.now()}`,
            sender: 'ai',
            text: 'Ocorreu um pequeno erro ao consultar o suporte da Pri. Verifique se suas chaves de API estão ativas.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <>
      {/* 🔮 BOTÃO DA PRI NO MENU SUPERIOR AO LADO DAS NOTIFICAÇÕES */}
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2.5 rounded-xl text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition flex items-center gap-2 group shadow-sm"
        title="Pri - Ajuda e Suporte do Priceus"
      >
        <Sparkles className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
        <span className="hidden md:inline text-xs font-bold text-amber-300">
          Ajuda Pri
        </span>
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></span>
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
      </button>

      {/* 📐 DRAWER SLIDE-OVER DA DIREITA */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Header do Drawer */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-rose-500 text-slate-950 rounded-xl flex items-center justify-center font-black text-sm shadow-md">
                  Pri
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm flex items-center gap-1.5">
                    Pri — Suporte Priceus
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-semibold border border-emerald-500/30">Online</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Sua assistente de configuração e dúvidas da plataforma</p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Feed de Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/60">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed max-w-[92%] whitespace-pre-wrap ${
                      m.sender === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-none shadow-md'
                        : 'bg-slate-800 text-slate-100 border border-slate-700/80 rounded-tl-none shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-1.5 text-[10px] opacity-75 pb-1 border-b border-slate-700/40">
                      <span className="font-bold flex items-center gap-1 text-amber-300">
                        {m.sender === 'ai' ? (
                          <span className="w-4 h-4 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center font-black text-[9px]">Pri</span>
                        ) : (
                          <User className="w-3 h-3 text-indigo-300" />
                        )}
                        {m.sender === 'ai' ? 'Pri (Suporte Priceus)' : 'Você'}
                      </span>
                      <span>{m.timestamp}</span>
                    </div>

                    <div className="whitespace-pre-wrap leading-relaxed space-y-1">
                      {m.text.split(/(\*\*[^*]+\*\*)/g).map((part, idx) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                          return <strong key={idx} className="font-bold text-amber-200 bg-amber-500/10 px-1 py-0.5 rounded">{part.slice(2, -2)}</strong>;
                        }
                        return <span key={idx}>{part}</span>;
                      })}
                    </div>

                    {/* Botões de Ações Sugeridas */}
                    {m.suggestedActions && (
                      <div className="mt-3 pt-2.5 border-t border-slate-700/60 space-y-1.5">
                        <span className="text-[10px] text-amber-300/80 block font-semibold flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          Dúvidas Frequentes da Plataforma:
                        </span>
                        {m.suggestedActions.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => handleSend(s.label)}
                            className="w-full text-left p-2 rounded-xl bg-slate-900 hover:bg-slate-950 border border-slate-700/80 text-[11px] text-slate-200 hover:text-amber-300 transition block font-medium"
                          >
                            💡 {s.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-amber-400 p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20 animate-pulse">
                  <HelpCircle className="w-4 h-4 animate-spin text-amber-400" />
                  <span>A Pri está consultando a arquitetura do Priceus para te responder...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de Pergunta */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Pergunte à Pri qualquer dúvida sobre o Priceus..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={() => handleSend()}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold p-2.5 rounded-xl transition shadow-md"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
