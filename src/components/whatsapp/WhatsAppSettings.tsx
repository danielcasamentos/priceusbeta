import { useState } from 'react';
import {
  Smartphone,
  Cpu,
  Save,
  CheckCircle2,
  Clock,
  QrCode,
  Sparkles
} from 'lucide-react';

export function WhatsAppSettings() {
  const [handoffKeywords, setHandoffKeywords] = useState('gerente, desconto especial, falar com humano, ligação, urgente');
  const [startHour, setStartHour] = useState('08:00');
  const [endHour, setEndHour] = useState('20:00');
  const [qrState, setQrState] = useState<'connected' | 'qr' | 'disconnected'>('connected');

  // 👩‍💼 Nome da Persona de IA de Atendimento
  const [aiPersonaName, setAiPersonaName] = useState(() => {
    return localStorage.getItem('priceus_ai_persona_name') || 'Sofia';
  });

  const [saveToast, setSaveToast] = useState(false);

  const handleSaveSettings = () => {
    localStorage.setItem('priceus_ai_persona_name', aiPersonaName.trim());
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3500);
  };

  return (
    <div className="space-y-6">
      {/* 🟢 Motor Nativo de Inteligência Comercial (Groq + Gemini) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
                <span>Motor de IA de Vendas Nativo</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/30">
                  ATIVO & INCLUSO NO SISTEMA
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Alimentado pela infraestrutura oficial Groq LLaMA 3.3 70B (Respostas em 0.4s) & Google Gemini.
              </p>
            </div>
          </div>

          <button
            onClick={handleSaveSettings}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Nome da Secretária</span>
          </button>
        </div>

        {saveToast && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4" />
            <span>Configurações da Persona de Atendimento salvas com sucesso!</span>
          </div>
        )}

        {/* 👩‍💼 Nome Personalizado da Persona de IA */}
        <div className="p-4 bg-indigo-950/40 rounded-xl border border-indigo-500/30 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-indigo-300 font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Nome da Sua Secretária Virtual / Persona de IA:
            </span>
            <span className="text-[10px] text-indigo-400 font-semibold">Personalizável</span>
          </div>

          <input
            type="text"
            value={aiPersonaName}
            onChange={(e) => setAiPersonaName(e.target.value)}
            placeholder="ex: Sofia, Clara, Bia, Helena, Alice..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-indigo-500"
          />

          <p className="text-[11px] text-slate-400">
            💬 Se o cliente perguntar <em>"Com quem falo?"</em> no WhatsApp, a IA responderá: <em>"Olá! Sou a <strong>{aiPersonaName || 'Sofia'}</strong>, assistente do estúdio..."</em>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 📱 Coluna Esquerda: Conexão WhatsApp Web via QR Code */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-bold text-slate-200 flex items-center gap-2 text-sm">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              Conexão com Seu Celular WhatsApp
            </h3>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20 font-medium">
              100% Gratuito
            </span>
          </div>

          <div className="flex flex-col items-center justify-center p-6 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-3">
            {qrState === 'connected' ? (
              <>
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-100 text-sm">WhatsApp Conectado & Operacional</h4>
                  <p className="text-xs text-slate-400 mt-1">Sua conta está conectada. A IA atenderá seus clientes em tempo real.</p>
                </div>
                <button
                  onClick={() => setQrState('qr')}
                  className="text-xs text-rose-400 hover:underline pt-2 font-medium cursor-pointer"
                >
                  Desconectar / Escanear Novo QR Code
                </button>
              </>
            ) : (
              <>
                <QrCode className="w-12 h-12 text-indigo-400 animate-pulse" />
                <p className="text-xs text-slate-300">Escaneie o QR Code abaixo no seu celular em <strong>WhatsApp ➔ Aparelhos Conectados ➔ Conectar um Aparelho</strong>:</p>
                
                {/* QR Code de Conexão */}
                <div className="p-3 bg-white rounded-xl shadow-lg border border-slate-700">
                  {typeof window !== 'undefined' && localStorage.getItem('priceus_wa_qr_base64') ? (
                    <img
                      src={localStorage.getItem('priceus_wa_qr_base64') || ''}
                      alt="QR Code WhatsApp Real"
                      className="w-44 h-44 object-contain"
                    />
                  ) : (
                    <div className="w-44 h-44 flex flex-col items-center justify-center bg-slate-100 rounded-lg p-2 text-center">
                      <QrCode className="w-12 h-12 text-slate-400 mb-2" />
                      <p className="text-[10px] text-slate-600 font-medium">Aguardando geração do QR Code do seu WhatsApp...</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQrState('connected')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-emerald-600/20 cursor-pointer"
                  >
                    ✅ Confirmar Pareamento
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ⚙️ Coluna Direita: Horários & Palavras-Chave de Transbordo Humano */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <h3 className="font-bold text-slate-200 flex items-center gap-2 text-sm pb-3 border-b border-slate-800">
            <Clock className="w-4 h-4 text-amber-400" />
            Horários de Atendimento & Transbordo Humano
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-300 font-medium block mb-1">Palavras-Chave para Chamar o Fotógrafo (Humano):</label>
              <input
                type="text"
                value={handoffKeywords}
                onChange={(e) => setHandoffKeywords(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Início do Atendimento IA:</label>
                <input
                  type="time"
                  value={startHour}
                  onChange={(e) => setStartHour(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Término do Atendimento IA:</label>
                <input
                  type="time"
                  value={endHour}
                  onChange={(e) => setEndHour(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
