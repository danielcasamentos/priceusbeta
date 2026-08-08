import { useState, useEffect } from 'react';
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
  
  const [qrState, setQrState] = useState<'connected' | 'qr' | 'disconnected'>(() => {
    return localStorage.getItem('priceus_wa_connected') === 'true' ? 'connected' : 'qr';
  });

  const [realQrBase64, setRealQrBase64] = useState<string | null>(null);
  const [connectedPhone, setConnectedPhone] = useState<string | null>(null);
  const [isGatewayOnline, setIsGatewayOnline] = useState(false);

  // 👩‍💼 Nome da Persona de IA de Atendimento
  const [aiPersonaName, setAiPersonaName] = useState(() => {
    return localStorage.getItem('priceus_ai_persona_name') || 'Sofia';
  });

  const [saveToast, setSaveToast] = useState(false);

  const [isGeneratingQr, setIsGeneratingQr] = useState(false);

  // 🔄 Fetch em tempo real do Servidor Baileys (Somente quando necessário)
  useEffect(() => {
    let isMounted = true;

    const fetchStatus = async () => {
      try {
        let res = await fetch('/api/whatsapp/qr').catch(() => null);
        if (!res || !res.ok) {
          res = await fetch('http://localhost:3001/api/whatsapp/qr').catch(() => null);
        }
        if (res && res.ok) {
          const data = await res.json();
          if (!isMounted) return;
          setIsGatewayOnline(true);
          if (data.status === 'connected') {
            setQrState('connected');
            setConnectedPhone(data.connectedUser || 'Conectado');
            localStorage.setItem('priceus_wa_connected', 'true');
          } else {
            localStorage.removeItem('priceus_wa_connected');
            if (data.qrBase64) {
              setRealQrBase64(data.qrBase64);
              setQrState('qr');
            } else {
              setRealQrBase64(null);
              setQrState('disconnected');
            }
          }
        } else {
          if (isMounted) setIsGatewayOnline(false);
        }
      } catch {
        if (isMounted) setIsGatewayOnline(false);
      }
    };

    fetchStatus();
    // Polling inteligente: 3s quando aguardando QR Code, ou 12s quando em repouso
    const pollInterval = qrState === 'qr' ? 3000 : 12000;
    const interval = setInterval(fetchStatus, pollInterval);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [qrState]);

  const handleSaveSettings = () => {
    localStorage.setItem('priceus_ai_persona_name', aiPersonaName.trim());
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3500);
  };

  const handleGenerateQrCode = async () => {
    setIsGeneratingQr(true);
    setRealQrBase64(null);
    try {
      let res = await fetch('/api/whatsapp/connect', { method: 'POST' }).catch(() => null);
      if (!res || !res.ok) {
        res = await fetch('http://localhost:3001/api/whatsapp/connect', { method: 'POST' }).catch(() => null);
      }
      setQrState('qr');
    } catch (e) {
      console.warn('Erro ao solicitar QR Code:', e);
    } finally {
      setTimeout(() => setIsGeneratingQr(false), 2000);
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch('/api/whatsapp/disconnect', { method: 'POST' }).catch(() => null);
    } catch {
      // Fallback
    }
    localStorage.removeItem('priceus_wa_connected');
    localStorage.removeItem('priceus_wa_qr_base64');
    setRealQrBase64(null);
    setQrState('disconnected');
  };

  const activeQrImage = realQrBase64 || (typeof window !== 'undefined' ? localStorage.getItem('priceus_wa_qr_base64') : null);

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
        {/* 📱 Coluna Esquerda: Conexão WhatsApp Web via QR Code Real */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-bold text-slate-200 flex items-center gap-2 text-sm">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              Conexão com Seu Celular WhatsApp
            </h3>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20 font-medium">
              {qrState === 'connected' ? '● Conectado' : 'Aguardando Ativação'}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center p-6 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-4">
            {qrState === 'connected' ? (
              <>
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center border border-emerald-500/30">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-100 text-sm">WhatsApp Conectado & Operacional</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Sua conta {connectedPhone ? `(${connectedPhone})` : 'ativa'} está operacional. A IA responderá aos seus clientes no WhatsApp.
                  </p>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="text-xs text-rose-400 hover:text-rose-300 hover:underline pt-2 font-medium cursor-pointer"
                >
                  Desconectar Sessão do WhatsApp
                </button>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-200 text-sm flex items-center justify-center gap-2">
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    <span>Conexão de Atendimento do WhatsApp</span>
                  </h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Escaneie o QR Code no seu WhatsApp em Aparelhos Conectados:
                  </p>
                </div>

                {activeQrImage ? (
                  <div className="p-3.5 bg-white rounded-2xl shadow-xl border border-slate-700 hover:scale-105 transition-transform duration-200">
                    <img
                      src={activeQrImage}
                      alt="QR Code WhatsApp Real Baileys"
                      className="w-52 h-52 object-contain rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl max-w-xs space-y-2">
                    <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                      <QrCode className="w-6 h-6 animate-pulse text-emerald-400" />
                    </div>
                    <p className="text-xs font-semibold text-slate-200">
                      {isGatewayOnline ? 'Aguardando QR Code...' : 'Servidor Pronto para Conexão'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {isGatewayOnline ? 'Carregando código do canal Baileys...' : 'Ative a sessão para vincular seu celular no sistema'}
                    </p>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleGenerateQrCode}
                    disabled={isGeneratingQr}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-emerald-600/30 cursor-pointer flex items-center justify-center gap-2 mx-auto"
                  >
                    <QrCode className={`w-4 h-4 ${isGeneratingQr ? 'animate-spin' : ''}`} />
                    <span>{isGeneratingQr ? 'Gerando QR Code...' : '⚡ Gerar QR Code WhatsApp'}</span>
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
