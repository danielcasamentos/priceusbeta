import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  FileText,
  X,
  Sparkles,
  Share2,
  Plus,
  Trash2,
  AlertCircle
} from 'lucide-react';

export interface MeetingSummaryData {
  id: string;
  title: string;
  date: string;
  durationMinutes: number;
  participants: string[];
  topicsDiscussed: string;
  decisionsAgreed: string[];
  nextSteps: string[];
  createdBy: string;
  createdAt: string;
}

interface MeetingSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  eventDate?: string;
  onSaveMeetingSummary: (summary: MeetingSummaryData) => void;
  initialData?: MeetingSummaryData | null;
}

export function MeetingSummaryModal({
  isOpen,
  onClose,
  clientName,
  eventDate,
  onSaveMeetingSummary,
  initialData,
}: MeetingSummaryModalProps) {
  if (!isOpen) return null;

  const [title, setTitle] = useState(initialData?.title || `Alinhamento de Evento com ${clientName}`);
  const [meetingDate, setMeetingDate] = useState(
    initialData?.date || new Date().toISOString().slice(0, 16)
  );
  const [duration, setDuration] = useState<number>(initialData?.durationMinutes || 45);
  const [participantsText, setParticipantsText] = useState(
    initialData?.participants?.join(', ') || `${clientName}, Eu (Fornecedor)`
  );
  const [topics, setTopics] = useState(
    initialData?.topicsDiscussed ||
      '• Alinhamento do cronograma de horários\n• Escolha do estilo visual e referências\n• Definição de pacotes e entregáveis'
  );
  const [decisions, setDecisions] = useState<string[]>(
    initialData?.decisionsAgreed || [
      'Confirmado início da cobertura 2 horas antes da cerimônia',
      'Acordada inclusão de ensaio prévio como cortesia de fechamento',
      'Parcelamento ajustado em 6x fixas sem juros',
    ]
  );
  const [newDecision, setNewDecision] = useState('');

  const [nextSteps, setNextSteps] = useState<string[]>(
    initialData?.nextSteps || [
      'Enviar minuta de contrato com as novas cláusulas até amanhã',
      'Cliente enviará lista de músicas e pessoas-chave do evento',
    ]
  );
  const [newStep, setNewStep] = useState('');

  const handleAddDecision = () => {
    if (!newDecision.trim()) return;
    setDecisions([...decisions, newDecision.trim()]);
    setNewDecision('');
  };

  const handleRemoveDecision = (index: number) => {
    setDecisions(decisions.filter((_, i) => i !== index));
  };

  const handleAddStep = () => {
    if (!newStep.trim()) return;
    setNextSteps([...nextSteps, newStep.trim()]);
    setNewStep('');
  };

  const handleRemoveStep = (index: number) => {
    setNextSteps(nextSteps.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const summary: MeetingSummaryData = {
      id: initialData?.id || 'meet-' + Date.now(),
      title: title.trim(),
      date: meetingDate,
      durationMinutes: Number(duration) || 30,
      participants: participantsText.split(',').map((p) => p.trim()).filter(Boolean),
      topicsDiscussed: topics.trim(),
      decisionsAgreed: decisions,
      nextSteps: nextSteps,
      createdBy: 'Fornecedor',
      createdAt: new Date().toISOString(),
    };

    onSaveMeetingSummary(summary);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[80] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0c1626] border border-gray-200 dark:border-white/10 rounded-3xl max-w-2xl w-full p-6 sm:p-7 space-y-6 shadow-2xl max-h-[92vh] overflow-y-auto no-scrollbar">
        {/* Header do Modal */}
        <div className="flex items-start justify-between border-b border-gray-100 dark:border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center">
              <FileText size={22} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                Ata de Reunião & Assuntos Decididos
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Registre os pontos acordados para segurança jurídica e clareza com o cliente.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Formulário */}
        <div className="space-y-4 text-xs">
          {/* Título & Pauta */}
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Pauta Principal da Reunião
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500/30 focus:outline-hidden"
              placeholder="Ex: Alinhamento de Detalhes, Apresentação de Orçamento, Prévia..."
            />
          </div>

          {/* Data, Duração e Participantes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                <Calendar size={13} className="text-emerald-500" /> Data e Hora
              </label>
              <input
                type="datetime-local"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500/30 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                <Clock size={13} className="text-emerald-500" /> Duração (minutos)
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                min={5}
                step={5}
                className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500/30 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                <Users size={13} className="text-emerald-500" /> Participantes
              </label>
              <input
                type="text"
                value={participantsText}
                onChange={(e) => setParticipantsText(e.target.value)}
                placeholder="Separados por vírgula"
                className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500/30 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Tópicos Abordados */}
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Assuntos Discutidos / Pauta Detalhada
            </label>
            <textarea
              rows={3}
              value={topics}
              onChange={(e) => setTopics(e.target.value)}
              placeholder="Descreva o que foi conversado..."
              className="w-full p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500/30 focus:outline-hidden leading-relaxed resize-none"
            />
          </div>

          {/* Assuntos Decididos / Alinhamentos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500" /> Assuntos Decididos & Acordos
              </label>
              <span className="text-[10px] text-gray-400">{decisions.length} decisão(ões)</span>
            </div>

            <div className="space-y-2">
              {decisions.map((decision, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-gray-800 dark:text-gray-200"
                >
                  <span className="flex-1 font-medium leading-snug">✓ {decision}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveDecision(index)}
                    className="text-gray-400 hover:text-rose-500 p-1 rounded-lg transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newDecision}
                onChange={(e) => setNewDecision(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDecision())}
                placeholder="Adicionar acordo ou decisão tomada na reunião..."
                className="flex-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500/30 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleAddDecision}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer"
              >
                <Plus size={14} /> Adicionar
              </button>
            </div>
          </div>

          {/* Próximos Passos & Tarefas */}
          <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-white/5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-gray-700 dark:text-gray-300">
                Próximos Passos & Prazos
              </label>
              <span className="text-[10px] text-gray-400">{nextSteps.length} item(ns)</span>
            </div>

            <div className="space-y-2">
              {nextSteps.map((step, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-200"
                >
                  <span className="flex-1 leading-snug">➡️ {step}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveStep(index)}
                    className="text-gray-400 hover:text-rose-500 p-1 rounded-lg transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newStep}
                onChange={(e) => setNewStep(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddStep())}
                placeholder="Adicionar próximo passo ou prazo..."
                className="flex-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500/30 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleAddStep}
                className="px-3 py-2 rounded-xl bg-gray-800 dark:bg-white/10 hover:bg-gray-700 dark:hover:bg-white/20 text-white font-semibold text-xs flex items-center gap-1 transition-all cursor-pointer"
              >
                <Plus size={14} /> Adicionar
              </button>
            </div>
          </div>
        </div>

        {/* Footer do Modal */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-white/5">
          <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
            <Sparkles size={13} className="text-emerald-500" />
            Esta ata será publicada na conversa para consulta mútua.
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-600/20 cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 size={15} /> Salvar e Publicar na Conversa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
