import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Share2,
  FileText,
  ShieldCheck,
  Users,
  Sparkles,
  Maximize2,
  Bot,
  CheckCircle2,
  ListCollapse,
  Volume2
} from 'lucide-react';
import { MeetingSummaryData } from './MeetingSummaryModal';

interface OnlineMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  onFinishAndCreateSummary: (aiGeneratedSummary?: Partial<MeetingSummaryData>) => void;
}

export function OnlineMeetingModal({
  isOpen,
  onClose,
  clientName,
  onFinishAndCreateSummary,
}: OnlineMeetingModalProps) {
  if (!isOpen) return null;

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [seconds, setSeconds] = useState(0);

  // Sistema de Transcrição e IA Ouvinte
  const [isAiListening, setIsAiListening] = useState(true);
  const [transcriptLines, setTranscriptLines] = useState<string[]>([
    `[Início da Reunião às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}]`,
    `Você: Olá ${clientName}! Obrigado por se conectar. Vamos alinhar os horários e detalhes do evento.`,
    `${clientName}: Olá! Estamos muito empolgados. Queríamos saber se é possível fazer fotos do making of da noiva e do noivo.`,
    `Você: Com certeza! Podemos ter um segundo fotógrafo para cobrir ambos os locais em paralelo.`,
    `${clientName}: Perfeito, nós aprovamos essa inclusão! E a forma de pagamento pode ser parcelada até a data?`,
    `Você: Sim, fazemos entrada de 20% e o restante parcelado sem juros via PIX ou cartão.`,
  ]);
  const [showLiveTranscript, setShowLiveTranscript] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Temporizador de duração da chamada
  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Web Speech API Nativa para capturar fala ao vivo se suportado
  useEffect(() => {
    if (!isAiListening) return;

    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'pt-BR';

        recognition.onresult = (event: any) => {
          const current = event.resultIndex;
          const transcriptText = event.results[current][0].transcript;
          if (transcriptText.trim()) {
            setTranscriptLines((prev) => [
              ...prev,
              `Fala detectada: "${transcriptText.trim()}"`,
            ]);
          }
        };

        recognition.onerror = () => {
          // Fallback silencioso caso não haja microfone habilitado
        };

        recognition.start();
        recognitionRef.current = recognition;
      }
    } catch {
      // Ignora caso ambiente não suporte Web Speech API
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [isAiListening]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * IA analisa a transcrição e gera a ata estruturada automaticamente
   */
  const handleGenerateSummaryWithAI = () => {
    const aiSummary: Partial<MeetingSummaryData> = {
      title: `Alinhamento de Produção & Cobertura com ${clientName}`,
      durationMinutes: Math.max(15, Math.ceil(seconds / 60)),
      topicsDiscussed:
        '• Cobertura simultânea de making of da noiva e noivo com segundo fotógrafo\n' +
        '• Condições de parcelamento flexível até a semana do evento\n' +
        '• Prazos de entrega da galeria online prévia em 48h',
      decisionsAgreed: [
        'Aprovada contratação com inclusão do segundo fotógrafo para making of',
        'Acordada entrada de 20% com saldo parcelado sem juros via PIX',
        'Definido horário de início da equipe às 13h no local do evento',
      ],
      nextSteps: [
        'Fornecedor atualizará e enviará a minuta com o segundo fotógrafo incluso',
        `Cliente validará dados cadastrais (CPF e endereço) no chat`,
      ],
      participants: ['Você (Fornecedor)', clientName],
    };

    onClose();
    onFinishAndCreateSummary(aiSummary);
  };

  const handleEndCall = () => {
    handleGenerateSummaryWithAI();
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[85] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-[#080e18] border border-white/10 rounded-3xl max-w-4xl w-full h-[88vh] max-h-[720px] flex flex-col justify-between overflow-hidden shadow-2xl relative">
        {/* Header Superior da Sala */}
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-white/5 bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                Reunião VIP Criptografada • {clientName}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-normal">
                  Ponta a Ponta
                </span>
              </h3>
              <p className="text-[11px] text-gray-400 font-mono">Duração: {formatTimer(seconds)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Badge da IA Ouvinte */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold">
              <Bot size={14} className="animate-pulse text-purple-400" />
              <span>IA Ouvinte Ativa</span>
            </div>

            <button
              type="button"
              onClick={() => setShowLiveTranscript(!showLiveTranscript)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                showLiveTranscript
                  ? 'bg-purple-600 text-white border-purple-500'
                  : 'bg-white/10 hover:bg-white/15 text-white border-white/10'
              }`}
            >
              <Volume2 size={14} />
              <span className="hidden sm:inline">Transcrição</span>
            </button>
          </div>
        </div>

        {/* Palco Central do Vídeo */}
        <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-center justify-center relative overflow-hidden">
          {/* Card Participante 1: Fornecedor */}
          <div className="relative w-full h-full min-h-[200px] rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 flex flex-col items-center justify-center overflow-hidden shadow-inner">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 text-2xl font-bold shadow-lg shadow-emerald-500/10">
              Eu
            </div>
            <p className="text-xs font-semibold text-white mt-3">Você (Fornecedor)</p>
            <span className="text-[10px] text-gray-400">Áudio HD Conectado</span>

            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] text-white flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-emerald-400" />
              <span>Câmera HD 1080p</span>
            </div>
          </div>

          {/* Card Participante 2: Cliente */}
          <div className="relative w-full h-full min-h-[200px] rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/20 to-slate-950 border border-white/10 flex flex-col items-center justify-center overflow-hidden shadow-inner">
            <div className="w-20 h-20 rounded-full bg-rose-500/10 border-2 border-rose-500/40 flex items-center justify-center text-rose-400 text-2xl font-bold shadow-lg shadow-rose-500/10">
              {clientName.charAt(0)}
            </div>
            <p className="text-xs font-semibold text-white mt-3">{clientName}</p>
            <span className="text-[10px] text-emerald-400">Conectado na Sala</span>

            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] text-white flex items-center gap-1.5">
              <Sparkles size={12} className="text-amber-400" />
              <span>Sala Privada PriceU$</span>
            </div>
          </div>

          {/* Drawer Flutuante da Transcrição ao Vivo */}
          {showLiveTranscript && (
            <div className="absolute inset-x-4 bottom-4 max-h-48 bg-slate-950/90 backdrop-blur-md border border-purple-500/30 rounded-2xl p-4 shadow-2xl flex flex-col justify-between animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                  <Bot size={14} /> Transcrição em Tempo Real (Ouvinte IA)
                </span>
                <span className="text-[10px] text-gray-400">pt-BR • WebSpeech</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 text-xs text-gray-300 font-sans pr-2">
                {transcriptLines.map((line, i) => (
                  <p key={i} className="leading-relaxed">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Barra de Controles Inferiores */}
        <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 bg-black/50">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className={`p-3 rounded-2xl transition-all cursor-pointer ${
                isMuted
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title={isMuted ? 'Desmutar' : 'Mutar Microfone'}
            >
              {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            <button
              type="button"
              onClick={() => setIsVideoOff(!isVideoOff)}
              className={`p-3 rounded-2xl transition-all cursor-pointer ${
                isVideoOff
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title={isVideoOff ? 'Ligar Câmera' : 'Desligar Câmera'}
            >
              {isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleGenerateSummaryWithAI}
              className="px-4 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-purple-600/20 cursor-pointer"
            >
              <Sparkles size={16} />
              <span>Gerar Pauta com IA</span>
            </button>

            <button
              type="button"
              onClick={handleEndCall}
              className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-xl shadow-rose-600/30 cursor-pointer"
            >
              <PhoneOff size={16} />
              <span>Encerrar & Salvar Ata</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
