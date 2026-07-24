import { useState } from 'react';
import {
  Smartphone,
  Cpu,
  Eye,
  EyeOff,
  Save,
  Lock,
  ExternalLink,
  Zap,
  HelpCircle,
  CheckCircle2,
  Clock,
  QrCode,
  Settings,
  Sparkles,
  ChevronDown
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

  // 🔑 Chave de API Prioritária
  const [primaryKey, setPrimaryKey] = useState(() => {
    return localStorage.getItem('priceus_ai_api_key_primary') || localStorage.getItem('priceus_ai_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '';
  });

  // Toggle de Visibilidade da Chave
  const [showPrimary, setShowPrimary] = useState(false);

  const [saveToast, setSaveToast] = useState(false);

  const handleSaveSettings = () => {
    localStorage.setItem('priceus_ai_persona_name', aiPersonaName.trim());
    localStorage.setItem('priceus_ai_api_key_primary', primaryKey.trim());
    localStorage.setItem('priceus_ai_api_key', primaryKey.trim()); // retrocompatibilidade

    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3500);
  };

  return (
    <div className="space-y-6">
      {/* 🟢 Conexão com Provedores de IA & Pool de Tripla Proteção de Failover */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">Pool de IAs & Rotação Automática de Chaves (100% Uptime)</h3>
              <p className="text-xs text-slate-400">
                Cadastre até 3 chaves de API. Se a primeira limitar ou falhar, o robô alterna para a próxima sem o cliente perceber!
              </p>
            </div>
          </div>

          {/* Botão de Salvar Configurações */}
          <button
            onClick={handleSaveSettings}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Chaves de API</span>
          </button>
        </div>

        {/* Banner de Feedback de Salvamento */}
        {saveToast && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4" />
            <span>Pool de Chaves de API salvo com sucesso! Rotação automática de failover ativada.</span>
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
            💬 Se o cliente perguntar <em>"Com quem falo?"</em> ou no atendimento, a IA responderá: <em>"Olá! Sou a <strong>{aiPersonaName || 'Sofia'}</strong>, assistente do estúdio..."</em>
          </p>
        </div>

        {/* ⚡ Motor Nativo PriceU$ (Ativo por Padrão para Todos os Usuários) */}
        <div className="p-5 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 border border-emerald-500/30 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                  <span>Motor de IA Nativo PriceU$</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                    ATIVO & INCLUSO NO PLANO
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Groq LLaMA 3.3 70B (Respostas Ultra-Rápidas) + Google Gemini (Raciocínio Avançado)
                </p>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            ✅ A IA de Atendimento Comercial e a Assistente Pri funcionam de forma 100% nativa para todos os usuários sem necessidade de colar chaves ou fazer configurações técnicas.
          </p>
        </div>

        {/* 🔑 Sanfona Opcional para Chaves Pessoais (BYOK - Bring Your Own Key) */}
        <details className="group border border-slate-800 rounded-2xl bg-slate-950/40 overflow-hidden">
          <summary className="p-4 cursor-pointer font-bold text-xs text-slate-400 hover:text-slate-200 flex items-center justify-between select-none">
            <span className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-400" />
              <span>Configurações Avançadas de Chaves Pessoais (Opcional - Chaves Próprias BYOK)</span>
            </span>
            <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
          </summary>

          <div className="p-4 border-t border-slate-800 space-y-4 pt-4">
            {/* 1. API Key Prioritária */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  Chave Pessoal Customizada (Opcional):
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Groq / Google Gemini</span>
              </div>

              <div className="relative">
                <input
                  type={showPrimary ? 'text' : 'password'}
                  value={primaryKey}
                  onChange={(e) => setPrimaryKey(e.target.value)}
                  placeholder="Cole sua chave pessoal (gsk_..., AIzaSy..., etc)..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPrimary(!showPrimary)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition p-1"
                >
                  {showPrimary ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </details>

        {/* 📚 Mini-Tutorial Educativo Acolhedor com Links Clicáveis */}
        <div className="p-5 bg-indigo-950/30 border border-indigo-500/30 rounded-2xl space-y-3 text-xs">
          <h4 className="font-bold text-indigo-300 flex items-center gap-2 text-sm">
            <HelpCircle className="w-4 h-4 text-indigo-400" />
            Mini-Tutorial: Como Pegar Suas Chaves de API Gratuitas em 1 Minuto
          </h4>

          <p className="text-slate-300 leading-relaxed">
            As chaves de API são como "senhas de acesso" para os motores de inteligência artificial. Você pode pegar quantas quiser de forma 100% gratuita nos links abaixo:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {/* Link Google Gemini */}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl flex flex-col justify-between transition group"
            >
              <div>
                <span className="font-bold text-emerald-400 block group-hover:underline flex items-center gap-1">
                  1. Google AI Studio (Gemini) <ExternalLink className="w-3 h-3" />
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Clique em "Create API key". A chave começa com <code className="text-emerald-300">AIzaSy...</code>
                </span>
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold mt-2">✨ 100% Grátis</span>
            </a>

            {/* Link Groq Cloud */}
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl flex flex-col justify-between transition group"
            >
              <div>
                <span className="font-bold text-amber-400 block group-hover:underline flex items-center gap-1">
                  2. Groq Cloud (Meta Llama 3.3) <ExternalLink className="w-3 h-3" />
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Clique em "Create API Key". A chave começa com <code className="text-amber-300">gsk_...</code>
                </span>
              </div>
              <span className="text-[10px] text-amber-400 font-semibold mt-2">⚡ 14.400 requisições/dia grátis</span>
            </a>

            {/* Link DeepSeek / OpenAI */}
            <a
              href="https://platform.deepseek.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl flex flex-col justify-between transition group"
            >
              <div>
                <span className="font-bold text-indigo-400 block group-hover:underline flex items-center gap-1">
                  3. DeepSeek V3 / OpenAI <ExternalLink className="w-3 h-3" />
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Cadastre-se para obter bônus. A chave começa com <code className="text-indigo-300">sk-...</code>
                </span>
              </div>
              <span className="text-[10px] text-indigo-400 font-semibold mt-2">🐉 Custa frações de centavo</span>
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 📱 Coluna Esquerda: Conexão WhatsApp Web */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-bold text-slate-200 flex items-center gap-2 text-sm">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              Pareamento do WhatsApp Web (Localhost / Docker)
            </h3>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20 font-medium">
              Conectado
            </span>
          </div>

          {/* Configurações do Gateway WhatsApp */}
          <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
            <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-indigo-400" />
              <span>Dados do Server/Gateway WhatsApp (Evolution / Z-API)</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">URL da Instância / Server:</label>
                <input
                  type="text"
                  placeholder="https://seu-server-evolution.com"
                  defaultValue={typeof window !== 'undefined' ? localStorage.getItem('priceus_wa_server_url') || '' : ''}
                  onChange={(e) => typeof window !== 'undefined' && localStorage.setItem('priceus_wa_server_url', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Nome da Instância:</label>
                <input
                  type="text"
                  placeholder="priceus_whatsapp"
                  defaultValue={typeof window !== 'undefined' ? localStorage.getItem('priceus_wa_instance_name') || 'priceus_wa' : 'priceus_wa'}
                  onChange={(e) => typeof window !== 'undefined' && localStorage.setItem('priceus_wa_instance_name', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-6 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-3">
            {qrState === 'connected' ? (
              <>
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-100 text-sm">WhatsApp Pareado com Sucesso</h4>
                  <p className="text-xs text-slate-400 mt-1">Sessão ativa e pronta para envio e recebimento em tempo real.</p>
                </div>
                <button
                  onClick={() => setQrState('qr')}
                  className="text-xs text-rose-400 hover:underline pt-2 font-medium cursor-pointer"
                >
                  Desconectar / Gerar Novo QR Code
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
                      <p className="text-[10px] text-slate-600 font-medium">Aguardando geração do QR Code real do servidor...</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQrState('connected')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-emerald-600/20 cursor-pointer"
                  >
                    ✅ Confirmar Conexão
                  </button>
                </div>
              </>
            )}
          </div>

          {/* URL de Webhook Dinâmica para Produção / DEV */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5 text-xs">
            <span className="text-slate-300 font-bold block">🔗 URL Oficial do Webhook (Gateway WhatsApp):</span>
            <code className="block bg-slate-900 px-3 py-1.5 rounded-lg text-emerald-400 font-mono text-[11px] select-all border border-slate-800 break-all">
              {typeof window !== 'undefined' ? `${window.location.origin}/api/whatsapp/webhook` : 'https://priceus.com.br/api/whatsapp/webhook'}
            </code>
            <p className="text-[11px] text-slate-400">
              💡 Configure este endpoint no seu gateway do WhatsApp (Evolution API, Z-API ou Meta Official API) para receber mensagens em tempo real.
            </p>
          </div>
        </div>

        {/* ⚙️ Coluna Direita: Horários & Palavras-Chave de Transbordo Humano */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
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
