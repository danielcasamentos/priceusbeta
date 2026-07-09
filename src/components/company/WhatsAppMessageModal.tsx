import { useState, useEffect } from 'react';
import { MessageCircle, X, Edit3, Sparkles } from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

interface WhatsAppMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  clienteNome: string;
  clienteTelefone: string;
  tipo: 'cobranca' | 'remarketing';
  dados: {
    valor?: number;
    dataVencimento?: string;
    descricao?: string;
    tipoEvento?: string;
    dataEvento?: string;
    diasPassados?: number;
    tag?: string;
  };
  userId?: string;
}

export function WhatsAppMessageModal({
  isOpen,
  onClose,
  clienteNome,
  clienteTelefone,
  tipo,
  dados,
  userId,
}: WhatsAppMessageModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [mensagemEditada, setMensagemEditada] = useState<string>('');
  const [businessSettings, setBusinessSettings] = useState<any>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    const fetchSettings = async () => {
      setLoadingSettings(true);
      try {
        let resolvedUserId = userId;
        if (!resolvedUserId) {
          const { data: { user } } = await supabase.auth.getUser();
          resolvedUserId = user?.id;
        }
        if (!resolvedUserId) return;

        const { data } = await supabase
          .from('user_business_settings')
          .select('*')
          .eq('user_id', resolvedUserId)
          .maybeSingle();

        if (data) {
          setBusinessSettings(data);
        }
      } catch (err) {
        console.error('Erro ao buscar configurações em WhatsAppMessageModal:', err);
      } finally {
        setLoadingSettings(false);
      }
    };
    fetchSettings();
  }, [userId, isOpen]);

  const nomeExibido = clienteNome || 'Cliente';
  const valorFormatado = dados.valor ? formatCurrency(dados.valor) : '';
  const dataFormatada = dados.dataVencimento ? formatDate(dados.dataVencimento) : '';
  const dataEventoFormatada = dados.dataEvento ? formatDate(dados.dataEvento) : '';
  const diasAtraso = (() => {
    if (!dados.dataVencimento) return 0;
    const tDate = new Date(dados.dataVencimento + 'T12:00:00');
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const diff = today.getTime() - tDate.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  })();
  const diasAtrasoText = diasAtraso > 0 ? `há ${diasAtraso} dia${diasAtraso > 1 ? 's' : ''}` : 'hoje';

  const formatPixSuffix = (settings: any) => {
    if (!settings?.pix_key) return '';
    
    const parts = [];
    const pixType = settings.additional_info?.pix_type || 'Chave';
    parts.push(`Chave PIX: ${settings.pix_key} (${pixType})`);
    
    const holderName = settings.additional_info?.pix_holder || settings.business_name || '';
    if (holderName) {
      parts.push(`Titular: ${holderName}`);
    }
    
    if (settings.bank_name) {
      let bankInfo = `Banco: ${settings.bank_name}`;
      if (settings.bank_agency) bankInfo += ` | Ag: ${settings.bank_agency}`;
      if (settings.bank_account) bankInfo += ` | CC: ${settings.bank_account}`;
      if (settings.bank_account_type) bankInfo += ` (${settings.bank_account_type})`;
      parts.push(bankInfo);
    }
    
    return `\n\n*Dados para Pagamento via PIX:*\n${parts.join('\n')}`;
  };

  const suffix = tipo === 'cobranca' ? formatPixSuffix(businessSettings) : '';

  // ── DEFINIÇÃO DOS TEMPLATES DISPONÍVEIS ──────────────────────────
  const templates = tipo === 'cobranca'
    ? [
        {
          id: 'amigavel',
          titulo: '😊 Amigável',
          descricao: 'Lembrete leve e afetuoso, ideal para os primeiros dias de atraso.',
          texto: `Oi, ${nomeExibido}! Tudo bem? Passando para te lembrar de forma super leve que temos uma parcela em aberto de ${valorFormatado} referente a "${dados.descricao || 'nosso contrato'}" que venceu ${diasAtrasoText}. Se precisar de uma nova via do Pix ou boleto, me avisa por aqui! Obrigado pela parceria. ❤️${suffix}`,
        },
        {
          id: 'comercial',
          titulo: '🤝 Comercial / Formal',
          descricao: 'Mensagem objetiva e profissional, focada em resolver o pagamento.',
          texto: `Olá, ${nomeExibido}, tudo bem? Constatamos em nosso sistema que a parcela no valor de ${valorFormatado} com vencimento em ${dataFormatada} (referente a "${dados.descricao || 'serviços fotográficos'}") está em aberto. Segue a chave Pix para regularização. Caso já tenha efetuado o pagamento, por favor envie o comprovante para darmos baixa. Obrigado!${suffix}`,
        },
        {
          id: 'urgente',
          titulo: '🚨 Urgente / Facilitadora',
          descricao: 'Mensagem flexível oferecendo opções de parcelamento ou ajuda.',
          texto: `Oi, ${nomeExibido}! Sei que a rotina é corrida e pode ter passado despercebido, mas a sua parcela de ${valorFormatado} venceu ${diasAtrasoText}. Quer que eu parcele o valor restante ou prefere pagar via Pix? Me avisa como fica melhor para você para mantermos tudo certinho! 🙏${suffix}`,
        },
      ]
    : [
        {
          id: 'desconto',
          titulo: '🎁 Oferta / Desconto',
          descricao: 'Vantagem comercial exclusiva para incentivar o fechamento.',
          texto: `Oi, ${nomeExibido}! Tudo bem? Estava lembrando das nossas fotos do evento de ${dados.tipoEvento || 'ensaio'} e preparei uma surpresa especial: neste mês, clientes queridos têm 15% de desconto exclusivo para garantir nosso novo ensaio de temporada ou presentear alguém especial! Que tal aproveitarmos essa oferta imperdível? 🎁`,
        },
        {
          id: 'emocional',
          titulo: '❤️ Emocional / Nostálgico',
          descricao: 'Mensagem calorosa baseada no aniversário do ensaio/evento.',
          texto: `Oi, ${nomeExibido}! Como o tempo voa... Passaram-se dias desde aquele dia maravilhoso das fotos do seu ${dados.tipoEvento || 'evento'}! ❤️ Recordar é viver, e eu adoraria registrar essa nova fase de vocês. O que acha de fazermos um ensaio comemorativo para atualizar as fotos da família? Seria um prazer enorme rever vocês!`,
        },
        {
          id: 'album',
          titulo: '📖 Álbum Premium',
          descricao: 'Oferecer diagramação de álbum físico a partir das fotos digitais.',
          texto: `Oi, ${nomeExibido}! Como estão as coisas? ❤️ Suas fotos digitais do ${dados.tipoEvento || 'evento'} estão salvas, mas sabia que fotos no papel ganham vida? 📖 Montei um layout inicial super lindo para um álbum físico premium das suas fotos. Quer dar uma olhada digital sem compromisso no catálogo de capas de couro e linho que preparei para você?`,
        },
      ];

  // Iniciar o primeiro template por padrão
  useEffect(() => {
    if (loadingSettings) return;
    if (templates.length > 0) {
      const activeTemplate = templates.find(t => t.id === (selectedTemplateId || templates[0].id)) || templates[0];
      setSelectedTemplateId(activeTemplate.id);
      setMensagemEditada(activeTemplate.texto);
    }
  }, [tipo, dados.valor, dados.dataVencimento, clienteNome, selectedTemplateId, businessSettings, loadingSettings]);

  if (!isOpen) return null;

  const handleSelectTemplate = (id: string, texto: string) => {
    setSelectedTemplateId(id);
    setMensagemEditada(texto);
  };

  const handleSend = () => {
    let cleanPhone = clienteTelefone.replace(/\D/g, '');
    if (cleanPhone.length === 11 && !cleanPhone.startsWith('55')) {
      cleanPhone = '55' + cleanPhone;
    }
    const encoded = encodeURIComponent(mensagemEditada);
    const url = `https://wa.me/${cleanPhone || ''}?text=${encoded}`;
    window.open(url, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#0a1628] w-full max-w-2xl rounded-3xl border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02]">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-indigo-500" />
              {tipo === 'cobranca' ? 'Escolher Lembrete de Cobrança' : 'Enviar Campanha de Remarketing'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Selecione o tom ideal e personalize a mensagem antes de enviar para {nomeExibido}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Resumo da Pendência/Contexto */}
          <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-200/30 dark:border-indigo-900/20 rounded-2xl flex flex-wrap gap-x-6 gap-y-2 justify-between items-center text-sm">
            {tipo === 'cobranca' ? (
              <>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Item a cobrar</p>
                  <p className="font-bold text-gray-800 dark:text-gray-200 mt-0.5">{dados.descricao}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Valor devido</p>
                  <p className="font-black text-gray-900 dark:text-white mt-0.5 text-lg">{valorFormatado}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Atraso</p>
                  <p className="font-bold text-red-600 dark:text-red-400 mt-0.5">{diasAtrasoText}</p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Evento anterior</p>
                  <p className="font-bold text-gray-800 dark:text-gray-200 mt-0.5">{dados.tipoEvento}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Data do evento</p>
                  <p className="font-bold text-gray-800 dark:text-gray-200 mt-0.5">{dataEventoFormatada || 'Não informada'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Passaram-se</p>
                  <p className="font-black text-indigo-600 dark:text-indigo-400 mt-0.5 text-base">{dados.diasPassados} dias</p>
                </div>
              </>
            )}
          </div>

          {/* Seletor de Tons (Botoes) */}
          <div>
            <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2.5">
              1. Selecione o tom da mensagem
            </label>
            <div className="grid grid-cols-3 gap-2">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleSelectTemplate(tpl.id, tpl.texto)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-2xl border text-center transition-all ${
                    selectedTemplateId === tpl.id
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                      : 'bg-gray-50 dark:bg-white/3 border-gray-200 dark:border-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                  }`}
                >
                  <span className="text-xs font-bold">{tpl.titulo}</span>
                  <span className={`text-[9px] leading-tight ${selectedTemplateId === tpl.id ? 'text-white/80' : 'text-gray-400'}`}>
                    {tpl.id === 'desconto' || tpl.id === 'amigavel' ? 'Leve' : tpl.id === 'emocional' || tpl.id === 'comercial' ? 'Médio' : 'Foco comercial'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Área de Edição Livre */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5" />
                2. Personalize a mensagem
              </label>
              <span className="text-[10px] text-gray-400 font-medium">Caracteres: {mensagemEditada.length}</span>
            </div>
            <textarea
              value={mensagemEditada}
              onChange={(e) => setMensagemEditada(e.target.value)}
              rows={5}
              placeholder="Digite sua mensagem personalizada..."
              className="w-full px-4 py-3 text-sm rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#07101f] text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all leading-relaxed"
            />
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50/50 dark:bg-indigo-950/15 p-2 rounded-xl border border-indigo-200/20">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Dica: Use emojis amigáveis e coloque links Pix ou catálogos direto no texto se necessário.</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 flex justify-between bg-gray-50 dark:bg-white/[0.02]">
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-gray-300 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSend}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-green-500/20 transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            Enviar via WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
