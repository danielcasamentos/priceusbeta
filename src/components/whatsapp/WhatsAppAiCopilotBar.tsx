import React, { useState } from 'react';
import { Sparkles, Send, Edit3, RefreshCw, X, Check, Bot } from 'lucide-react';

interface WhatsAppAiCopilotBarProps {
  lastClientMessage?: string;
  clientName: string;
  onApplySuggestion: (text: string, sendImmediately: boolean) => void;
  onDismiss: () => void;
}

const SAMPLE_AI_SUGGESTIONS = [
  'Olá {name}! ✨ Que excelente notícia! Temos sim a data disponível na nossa agenda exclusiva. Vou te mandar a nossa proposta com todos os detalhes e valores dos pacotes com álbum incluso:',
  'Com certeza, {name}! Nosso ensaio pré-wedding pode ser feito tanto na praia quanto no campo. Quer que eu reserve a data prévia para vocês?',
  'Perfeito! O valor da entrada pode ser parcelado ou pago via PIX com 5% de desconto especial para fechamento hoje! Segue o link com o contrato:',
];

export function WhatsAppAiCopilotBar({
  lastClientMessage,
  clientName,
  onApplySuggestion,
  onDismiss,
}: WhatsAppAiCopilotBarProps) {
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const currentTemplate = SAMPLE_AI_SUGGESTIONS[suggestionIndex % SAMPLE_AI_SUGGESTIONS.length];
  const suggestionText = currentTemplate.replace('{name}', clientName.split(' ')[0] || 'cliente');

  const handleNextSuggestion = () => {
    setIsRegenerating(true);
    setTimeout(() => {
      setSuggestionIndex((prev) => prev + 1);
      setIsRegenerating(false);
    }, 300);
  };

  return (
    <div className="px-4 py-2 bg-[#111b21] border-t border-[#2a3942] animate-in slide-in-from-bottom-2 duration-200">
      <div className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-950/40 via-[#202c33] to-[#202c33] border border-[#00a884]/40 shadow-lg space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-bold text-[#00a884]">
            <Bot className="w-3.5 h-3.5 animate-pulse" />
            <span>Copiloto de Vendas IA (Sugestão de Resposta)</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleNextSuggestion}
              disabled={isRegenerating}
              className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#2a3942] hover:bg-[#2a3942]/80 text-[#8696a0] hover:text-[#e9edef] flex items-center gap-1 transition"
            >
              <RefreshCw className={`w-2.5 h-2.5 ${isRegenerating ? 'animate-spin' : ''}`} />
              <span>Outra opção</span>
            </button>
            <button
              onClick={onDismiss}
              className="p-1 rounded-full text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942] transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Suggestion Text */}
        <p className="text-xs text-[#e9edef] leading-relaxed italic bg-[#111b21]/60 p-2 rounded-lg border border-[#2a3942]">
          “{suggestionText}”
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={() => onApplySuggestion(suggestionText, false)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#8696a0] hover:text-[#e9edef] bg-[#2a3942] hover:bg-[#2a3942]/80 flex items-center gap-1.5 transition"
          >
            <Edit3 className="w-3 h-3" />
            <span>Editar no campo</span>
          </button>

          <button
            onClick={() => onApplySuggestion(suggestionText, true)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#00a884] hover:bg-[#00a884]/90 text-[#111b21] flex items-center gap-1.5 shadow transition"
          >
            <Send className="w-3 h-3" />
            <span>Enviar Agora</span>
          </button>
        </div>
      </div>
    </div>
  );
}
