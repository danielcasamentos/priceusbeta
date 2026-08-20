import React, { useState } from 'react';
import {
  X,
  User,
  Calendar,
  MapPin,
  FileText,
  CreditCard,
  Image as ImageIcon,
  Tag,
  DollarSign,
  Send,
  Save,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

interface WhatsAppClientDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  phone: string;
  eventDate?: string;
  eventType?: string;
  city?: string;
  estimatedValue?: number;
  stage?: string;
  onSendQuoteCard?: () => void;
  onSendContractCard?: () => void;
  onSendPixCard?: () => void;
}

const SALES_STAGES = [
  { id: 'lead', label: '🟡 Novo Lead', color: '#f59e0b', bg: '#fef3c7' },
  { id: 'quote_sent', label: '🟠 Proposta Enviada', color: '#f97316', bg: '#ffedd5' },
  { id: 'negotiation', label: '🔵 Em Negociação', color: '#3b82f6', bg: '#dbeafe' },
  { id: 'won', label: '🟢 Contrato Fechado', color: '#10b981', bg: '#d1fae5' },
  { id: 'gallery', label: '🟣 Galeria Entregue', color: '#8b5cf6', bg: '#ede9fe' },
];

export function WhatsAppClientDrawer({
  isOpen,
  onClose,
  clientName,
  phone,
  eventDate = '15/11/2026',
  eventType = 'Casamento',
  city = 'São Paulo - SP',
  estimatedValue = 4500,
  stage = 'Em Negociação',
  onSendQuoteCard,
  onSendContractCard,
  onSendPixCard,
}: WhatsAppClientDrawerProps) {
  const [currentStage, setCurrentStage] = useState(stage);
  const [notes, setNotes] = useState(
    'Noiva prefere cerimônia ao ar livre no pôr do sol. Álbum 30x30 panorâmico incluso na proposta. Entrada de 30% via PIX.'
  );
  const [savedNotesToast, setSavedNotesToast] = useState(false);

  if (!isOpen) return null;

  const handleSaveNotes = () => {
    setSavedNotesToast(true);
    setTimeout(() => setSavedNotesToast(false), 2500);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-80 sm:w-96 shadow-2xl flex flex-col border-l border-[#2a3942] bg-[#111b21] text-[#e9edef] animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a3942] bg-[#202c33]">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-[#00a884]" />
          <h3 className="font-bold text-sm text-[#e9edef]">Dados do Cliente & Ensaio</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-full text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942] transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Profile Card */}
        <div className="p-4 rounded-2xl bg-[#202c33] border border-[#2a3942] text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-700 flex items-center justify-center text-xl font-bold text-white mx-auto shadow-lg">
            {clientName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h4 className="font-bold text-base text-[#e9edef]">{clientName}</h4>
            <p className="text-xs text-[#8696a0] font-mono">{phone}</p>
          </div>
        </div>

        {/* Funnel Stage Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#8696a0] flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-[#00a884]" /> Etapa no Funil de Vendas
          </label>
          <div className="grid grid-cols-1 gap-1.5">
            {SALES_STAGES.map((s) => (
              <button
                key={s.id}
                onClick={() => setCurrentStage(s.label)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                  currentStage === s.label
                    ? 'bg-[#00a884]/20 text-[#00a884] border border-[#00a884]/50'
                    : 'bg-[#202c33] text-[#8696a0] hover:text-[#e9edef] border border-transparent'
                }`}
              >
                <span>{s.label}</span>
                {currentStage === s.label && <CheckCircle2 className="w-3.5 h-3.5 text-[#00a884]" />}
              </button>
            ))}
          </div>
        </div>

        {/* Event Details */}
        <div className="p-3.5 rounded-2xl bg-[#202c33] border border-[#2a3942] space-y-2.5 text-xs">
          <h5 className="font-bold text-[#8696a0] uppercase tracking-wider text-[10px]">
            Detalhes do Evento
          </h5>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[#8696a0] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Data do Evento:
              </span>
              <span className="font-bold text-[#e9edef]">{eventDate}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#8696a0] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Tipo:
              </span>
              <span className="font-bold text-[#e9edef]">{eventType}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#8696a0] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-400" /> Local:
              </span>
              <span className="font-bold text-[#e9edef]">{city}</span>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="p-3.5 rounded-2xl bg-[#202c33] border border-[#2a3942] space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#8696a0] uppercase tracking-wider text-[10px] flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Proposta Comercial
            </span>
            <span className="text-emerald-400 font-extrabold text-sm">
              R$ {estimatedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Direct Action Buttons */}
          <div className="pt-2 grid grid-cols-3 gap-1.5">
            <button
              onClick={() => {
                if (onSendQuoteCard) onSendQuoteCard();
                onClose();
              }}
              className="px-2 py-2 rounded-xl bg-[#111b21] hover:bg-[#00a884]/20 border border-[#2a3942] text-[10px] font-bold text-center text-[#e9edef] hover:text-[#00a884] transition"
            >
              📋 Enviar Proposta
            </button>
            <button
              onClick={() => {
                if (onSendContractCard) onSendContractCard();
                onClose();
              }}
              className="px-2 py-2 rounded-xl bg-[#111b21] hover:bg-[#00a884]/20 border border-[#2a3942] text-[10px] font-bold text-center text-[#e9edef] hover:text-[#00a884] transition"
            >
              ✍️ Enviar Contrato
            </button>
            <button
              onClick={() => {
                if (onSendPixCard) onSendPixCard();
                onClose();
              }}
              className="px-2 py-2 rounded-xl bg-[#111b21] hover:bg-[#00a884]/20 border border-[#2a3942] text-[10px] font-bold text-center text-[#e9edef] hover:text-[#00a884] transition"
            >
              💳 Enviar PIX
            </button>
          </div>
        </div>

        {/* Private Notes */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#8696a0] flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-[#00a884]" /> Notas Internas do Estúdio
            </label>
            {savedNotesToast && (
              <span className="text-[10px] text-[#00a884] font-bold animate-in fade-in">
                ✓ Salvo!
              </span>
            )}
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Anotações internas que só a equipe do estúdio pode ver..."
            className="w-full rounded-xl p-3 bg-[#202c33] border border-[#2a3942] text-xs text-[#e9edef] outline-none resize-none focus:border-[#00a884] transition"
          />
          <button
            onClick={handleSaveNotes}
            className="w-full py-2 rounded-xl bg-[#00a884] text-[#111b21] font-bold text-xs flex items-center justify-center gap-1.5 hover:opacity-90 transition"
          >
            <Save className="w-3.5 h-3.5" /> Salvar Anotações
          </button>
        </div>
      </div>
    </div>
  );
}
