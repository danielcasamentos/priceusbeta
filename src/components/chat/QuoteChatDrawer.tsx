import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Send,
  Mic,
  MicOff,
  Phone,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Sparkles,
  CheckCircle2,
  Lock,
  Play,
  Square,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import { RealtimeChatService, ChatMessageRecord } from '../../services/realtimeChatService';

interface QuoteChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  clientName: string;
  vendorName: string;
  vendorPhone?: string;
  vendorAvatar?: string;
  packageName: string;
  totalValue: number;
  paymentTerms?: string;
  eventDate?: string;
  quoteUrl?: string;
}

export function QuoteChatDrawer({
  isOpen,
  onClose,
  conversationId,
  clientName,
  vendorName,
  vendorPhone,
  vendorAvatar,
  packageName,
  totalValue,
  paymentTerms,
  eventDate,
  quoteUrl,
}: QuoteChatDrawerProps) {
  const [messages, setMessages] = useState<ChatMessageRecord[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isQuoteCardExpanded, setIsQuoteCardExpanded] = useState(true);

  // Áudio nativo com MediaRecorder
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Carrega mensagens e assina canal Realtime
  useEffect(() => {
    if (!isOpen || !conversationId) return;

    let isMounted = true;
    setIsLoading(true);

    RealtimeChatService.fetchMessages(conversationId).then((data) => {
      if (isMounted) {
        setMessages(data);
        setIsLoading(false);
      }
    });

    // Inscrição em tempo real no canal do Supabase e BroadcastChannel
    const unsubscribe = RealtimeChatService.subscribeToConversation(
      conversationId,
      (newMsg) => {
        setMessages((prev) => {
          // Se já existe com esse ID exato, ignora
          if (prev.some((m) => m.id === newMsg.id)) return prev;

          // Se existe uma mensagem otimista idêntica (mesmo remetente e mesmo texto), substitui sem duplicar
          const optIndex = prev.findIndex(
            (m) =>
              m.id.startsWith('opt-') &&
              m.sender_type === newMsg.sender_type &&
              m.content.trim() === newMsg.content.trim()
          );

          if (optIndex >= 0) {
            const updated = [...prev];
            updated[optIndex] = newMsg;
            return updated;
          }

          // Se já existe mensagem equivalente nos últimos 20 segundos, ignora para evitar duplicidade de broadcast
          const isDup = prev.some((m) => {
            if (m.sender_type !== newMsg.sender_type) return false;
            if (m.content.trim() !== newMsg.content.trim()) return false;
            const t1 = new Date(m.created_at).getTime();
            const t2 = new Date(newMsg.created_at).getTime();
            return Math.abs(t1 - t2) < 20000;
          });

          if (isDup) return prev;

          return [...prev, newMsg];
        });
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [isOpen, conversationId]);

  // Deduplicação estrita em tempo de renderização (Garantia de 0 bolhas repetidas no chat)
  const deduplicatedMessages = useMemo(() => {
    const result: ChatMessageRecord[] = [];
    for (const msg of messages) {
      if (result.some((m) => m.id === msg.id)) continue;

      const isDuplicate = result.some((m) => {
        if (m.sender_type !== msg.sender_type) return false;
        if (m.content.trim() !== msg.content.trim()) return false;
        const t1 = new Date(m.created_at).getTime();
        const t2 = new Date(msg.created_at).getTime();
        return Math.abs(t1 - t2) < 20000; // tolerância para round-trip de rede e otimista
      });

      if (isDuplicate) continue;
      result.push(msg);
    }
    return result;
  }, [messages]);

  // Scroll automático para a última mensagem
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [deduplicatedMessages, isOpen]);

  // Auto-foco no input ao abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Envio de texto sem duplicações
  const handleSendTextMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || !conversationId) return;

    setInputText('');

    const optimisticId = `opt-${Date.now()}`;
    const optimisticMsg: ChatMessageRecord = {
      id: optimisticId,
      conversation_id: conversationId,
      sender_type: 'bride',
      sender_name: clientName,
      content: text,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const sentMsg = await RealtimeChatService.sendMessage({
        conversationId,
        senderType: 'bride',
        senderName: clientName,
        content: text,
      });

      if (sentMsg) {
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticId ? sentMsg : m))
        );
      }
    } catch (err) {
      console.warn('Erro ao enviar mensagem:', err);
    }
  };

  // Gravação de áudio nativa
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          const audioContent = `AUDIO_MSG:${JSON.stringify({
            duration: recordSeconds,
            dataUrl: base64Audio,
          })}`;

          await RealtimeChatService.sendMessage({
            conversationId,
            senderType: 'bride',
            senderName: clientName,
            content: audioContent,
          });
        };
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      recordIntervalRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      alert('Não foi possível acessar seu microfone. Verifique as permissões do navegador.');
    }
  };

  const stopRecordingAndSend = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordIntervalRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordIntervalRef.current);
      audioChunksRef.current = [];
    }
  };

  // Transição suave para WhatsApp (Passo 4)
  const handleTransitionToWhatsApp = () => {
    if (!vendorPhone) {
      alert('O número de WhatsApp do profissional não está disponível no momento.');
      return;
    }

    const lastMsg = messages[messages.length - 1]?.content || '';
    const cleanLastTopic = lastMsg.startsWith('PROPOSTA_CARD:')
      ? 'Alinhamento de pacote'
      : lastMsg.slice(0, 80);

    const waLink = RealtimeChatService.generateWhatsAppTransitionLink({
      vendorPhone,
      clientName,
      packageName,
      totalValue,
      quoteUrl: quoteUrl || window.location.href,
      lastTopic: cleanLastTopic,
    });

    window.open(waLink, '_blank', 'noopener,noreferrer');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop suave */}
      <div
        className="fixed inset-0 bg-stone-900/30 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer Container (Fundo Branco Luxo) */}
      <div className="relative w-full max-w-lg bg-white text-slate-900 h-full flex flex-col shadow-2xl border-l border-stone-200/80 z-10 animate-in slide-in-from-right duration-300">
        {/* Top Header Chique */}
        <div className="p-4 bg-white/95 backdrop-blur-md border-b border-stone-200/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex-shrink-0">
              {vendorAvatar ? (
                <img
                  src={vendorAvatar}
                  alt={vendorName}
                  className="w-10 h-10 rounded-full object-cover border border-stone-200 shadow-xs"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-stone-900 text-white font-bold flex items-center justify-center shadow-xs">
                  {vendorName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
            </div>

            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 truncate">
                {vendorName}
              </h3>
              <p className="text-[11px] text-emerald-800 flex items-center gap-1 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Negociação Online PriceU$
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Botão de Transição Suave para WhatsApp */}
            {vendorPhone && (
              <button
                type="button"
                onClick={handleTransitionToWhatsApp}
                title="Continuar negociação no WhatsApp com resumo"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 text-xs font-semibold transition-all shadow-xs"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Security & End-to-End Encryption Banner */}
        <div className="px-4 py-1.5 bg-stone-50/90 border-b border-stone-200/70 flex items-center justify-between text-[11px] text-stone-500">
          <span className="flex items-center gap-1.5 font-medium">
            <Lock className="w-3 h-3 text-emerald-700" />
            Negociação protegida com criptografia ponta a ponta
          </span>
          <span className="text-stone-400 font-mono text-[10px]">PriceU$ Chat</span>
        </div>

        {/* Pinned Quote Summary Card (Chique e Limpo) */}
        <div className="p-3.5 bg-stone-50/70 border-b border-stone-200/80">
          <div
            className="flex items-center justify-between cursor-pointer select-none"
            onClick={() => setIsQuoteCardExpanded(!isQuoteCardExpanded)}
          >
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-stone-200/70 text-stone-800">
                <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
              </span>
              <span className="text-xs font-bold text-slate-900">
                Proposta: {packageName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-slate-900">
                R$ {totalValue.toLocaleString('pt-BR')}
              </span>
              {isQuoteCardExpanded ? (
                <ChevronUp className="w-3.5 h-3.5 text-stone-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
              )}
            </div>
          </div>

          {isQuoteCardExpanded && (
            <div className="mt-2.5 pt-2 border-t border-stone-200/80 text-xs space-y-1 text-slate-600">
              <div className="flex justify-between text-[11px]">
                <span className="text-stone-500">Condições de Pagamento:</span>
                <span className="text-slate-900 font-semibold">{paymentTerms || 'Personalizado'}</span>
              </div>
              {eventDate && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-stone-500">Data Prevista:</span>
                  <span className="text-slate-900 font-semibold">{eventDate}</span>
                </div>
              )}
              <div className="text-[10px] text-emerald-800 font-medium pt-1">
                💬 Todas as alterações e brindes combinados aqui serão atualizados na proposta.
              </div>
            </div>
          )}
        </div>

        {/* Message Feed (Off-White Atelier) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#fafaf9]">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-xs text-stone-400">
              <div className="w-5 h-5 border-2 border-stone-400 border-t-transparent rounded-full animate-spin mr-2" />
              Conectando à sala de atendimento...
            </div>
          ) : deduplicatedMessages.length === 0 ? (
            <div className="text-center py-10 text-xs text-stone-400">
              Nenhuma mensagem ainda. Digite sua dúvida ou proposta abaixo!
            </div>
          ) : (
            deduplicatedMessages.map((msg) => {
              const isMe = msg.sender_type === 'bride';
              const isCopilot = msg.sender_type === 'ai_copilot';

              // Formato especial de Proposta
              if (msg.content.startsWith('PROPOSTA_CARD:')) {
                let cardData: any = {};
                try {
                  cardData = JSON.parse(msg.content.replace('PROPOSTA_CARD:', ''));
                } catch (e) {}

                return (
                  <div key={msg.id} className="flex justify-center my-2">
                    <div className="w-full max-w-sm p-4 rounded-2xl bg-white border border-stone-200 shadow-md text-xs space-y-2">
                      <div className="flex items-center justify-between text-emerald-800 font-bold">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          Proposta Comercial
                        </span>
                        <span className="text-[10px] text-stone-400 font-normal">
                          {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="text-sm font-extrabold text-slate-900">
                        {cardData.packageName || packageName}
                      </div>
                      <div className="flex justify-between items-baseline pt-2 border-t border-stone-100">
                        <span className="text-stone-500 text-xs">Investimento:</span>
                        <span className="text-base font-black text-slate-900">
                          R$ {(cardData.total || totalValue).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600">
                        💳 {cardData.paymentTerms || paymentTerms || 'Pagamento Facilitado'}
                      </div>
                    </div>
                  </div>
                );
              }

              // Formato especial de Áudio
              if (msg.content.startsWith('AUDIO_MSG:')) {
                let audioData: any = {};
                try {
                  audioData = JSON.parse(msg.content.replace('AUDIO_MSG:', ''));
                } catch (e) {}

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <span className="text-[10px] text-stone-400 mb-1 px-1">
                      {isMe ? 'Você' : msg.sender_name}
                    </span>
                    <div
                      className={`p-3 rounded-2xl max-w-[85%] flex items-center gap-3 border shadow-xs ${
                        isMe
                          ? 'bg-stone-900 text-white border-stone-900 rounded-br-none'
                          : 'bg-white border-stone-200 text-slate-900 rounded-bl-none'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (audioData.dataUrl) {
                            const audio = new Audio(audioData.dataUrl);
                            audio.play();
                          }
                        }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                          isMe ? 'bg-white text-stone-900' : 'bg-stone-900 text-white'
                        }`}
                      >
                        <Play className="w-4 h-4 ml-0.5" />
                      </button>
                      <div className="flex-1 min-w-[120px]">
                        <div className={`h-1.5 rounded-full overflow-hidden ${isMe ? 'bg-white/30' : 'bg-stone-200'}`}>
                          <div className={`h-full w-1/3 ${isMe ? 'bg-white' : 'bg-stone-900'}`} />
                        </div>
                        <div className={`flex justify-between text-[10px] mt-1 ${isMe ? 'text-stone-300' : 'text-stone-500'}`}>
                          <span>Mensagem de voz</span>
                          <span>00:{audioData.duration?.toString().padStart(2, '0') || '05'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    isCopilot
                      ? 'items-center'
                      : isMe
                      ? 'items-end'
                      : 'items-start'
                  }`}
                >
                  {!isCopilot && (
                    <span className="text-[10px] text-stone-400 mb-1 px-1">
                      {isMe ? 'Você' : msg.sender_name}
                    </span>
                  )}

                  <div
                    className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm max-w-[85%] leading-relaxed ${
                      isCopilot
                        ? 'bg-amber-50/90 text-amber-950 border border-amber-200/80 rounded-xl w-full max-w-sm text-center shadow-xs'
                        : isMe
                        ? 'bg-stone-900 text-white rounded-br-none shadow-xs'
                        : 'bg-white text-slate-900 border border-stone-200/90 rounded-bl-none shadow-xs'
                    }`}
                  >
                    {isCopilot && (
                      <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-amber-900 mb-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        Assistente PriceU$
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <div
                      className={`text-[9px] mt-1 text-right ${
                        isMe ? 'text-stone-400' : 'text-stone-400'
                      }`}
                    >
                      {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input Area Chique */}
        <div className="p-3.5 bg-white border-t border-stone-200">
          {isRecording ? (
            <div className="flex items-center justify-between gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-2.5">
              <div className="flex items-center gap-2 text-rose-700 text-xs font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                Gravando áudio: 00:{recordSeconds.toString().padStart(2, '0')}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="px-2.5 py-1 text-xs text-stone-500 hover:text-stone-800 rounded-lg hover:bg-stone-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={stopRecordingAndSend}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Square className="w-3 h-3 fill-white" />
                  Enviar Áudio
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSendTextMessage} className="flex items-center gap-2">
              <button
                type="button"
                onClick={startRecording}
                title="Gravar áudio"
                className="p-2.5 rounded-xl bg-stone-100 text-stone-700 hover:text-stone-900 hover:bg-stone-200 border border-stone-200 transition-colors flex-shrink-0"
              >
                <Mic className="w-4 h-4" />
              </button>

              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Negocie parcelas, bônus, datas e tire dúvidas..."
                className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-400 transition-colors"
              />

              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors flex-shrink-0 shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Sugestões rápidas de negociação */}
          <div className="flex items-center gap-2 overflow-x-auto pt-2 text-[10px] text-stone-500 no-scrollbar">
            <span className="text-stone-400 font-medium flex-shrink-0">Sugestões:</span>
            <button
              type="button"
              onClick={() => setInputText('Consigo parcelar em até quantas vezes sem juros?')}
              className="px-2.5 py-1 rounded-full bg-stone-100 hover:bg-stone-200 hover:text-stone-900 border border-stone-200 whitespace-nowrap transition-colors"
            >
              💳 Condições de parcelas
            </button>
            <button
              type="button"
              onClick={() => setInputText('Se fecharmos hoje, tem cortesia de ensaio ou brinde?')}
              className="px-2.5 py-1 rounded-full bg-stone-100 hover:bg-stone-200 hover:text-stone-900 border border-stone-200 whitespace-nowrap transition-colors"
            >
              🎁 Condição especial / brinde
            </button>
            <button
              type="button"
              onClick={() => setInputText('A data ainda está confirmada na sua agenda?')}
              className="px-2.5 py-1 rounded-full bg-stone-100 hover:bg-stone-200 hover:text-stone-900 border border-stone-200 whitespace-nowrap transition-colors"
            >
              📅 Confirmação de data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
