import { useState, useEffect } from 'react';
import { MessageCircle, X, Edit3, Sparkles } from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

interface CobrancaModalProps {
  isOpen: boolean;
  onClose: () => void;
  clienteNome: string;
  clienteTelefone: string;
  valor: number;
  dataVencimento: string;
  descricao: string;
  userId?: string;
}

export function CobrancaModal({
  isOpen,
  onClose,
  clienteNome,
  clienteTelefone,
  valor,
  dataVencimento,
  descricao,
  userId,
}: CobrancaModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('amigavel');
  const [mensagemEditada, setMensagemEditada] = useState<string>('');
  const [businessSettings, setBusinessSettings] = useState<any>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [cobrarAtraso, setCobrarAtraso] = useState(false);
  const [diasTolerancia, setDiasTolerancia] = useState(0);

  useEffect(() => {
    if (businessSettings) {
      const graceDays = businessSettings.additional_info?.grace_period_days ?? 0;
      setDiasTolerancia(graceDays);
      
      const fineRate = businessSettings.additional_info?.fine_rate ?? 0;
      const interestRate = businessSettings.additional_info?.interest_rate ?? 0;
      if (fineRate > 0 || interestRate > 0) {
        setCobrarAtraso(true);
      } else {
        setCobrarAtraso(false);
      }
    }
  }, [businessSettings]);

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
        console.error('Erro ao buscar configurações em CobrancaModal:', err);
      } finally {
        setLoadingSettings(false);
      }
    };
    fetchSettings();
  }, [userId, isOpen]);

  const nomeExibido = clienteNome || 'Cliente';
  const valorFormatado = formatCurrency(valor);
  const dataFormatada = dataVencimento ? formatDate(dataVencimento) : 'data agendada';

  // Calcular dias vencido
  const diasVencido = (() => {
    if (!dataVencimento) return 0;
    const tDate = new Date(dataVencimento + 'T12:00:00');
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const diff = today.getTime() - tDate.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  })();

  const diasVencidoText = diasVencido > 0 ? `há ${diasVencido} dia${diasVencido > 1 ? 's' : ''}` : 'hoje';

  // Juros e multa calculations
  const fineRate = businessSettings?.additional_info?.fine_rate || 0;
  const interestRate = businessSettings?.additional_info?.interest_rate || 0;
  
  const diasJurosEfetivos = Math.max(0, diasVencido - diasTolerancia);

  const multaValor = cobrarAtraso && fineRate > 0 && diasVencido > diasTolerancia
    ? valor * (fineRate / 100)
    : 0;

  const jurosValor = cobrarAtraso && interestRate > 0 && diasJurosEfetivos > 0
    ? valor * (interestRate / 100) * diasJurosEfetivos
    : 0;

  const valorTotalFinal = valor + multaValor + jurosValor;
  
  const valorExibidoText = cobrarAtraso && (multaValor > 0 || jurosValor > 0)
    ? `${formatCurrency(valorTotalFinal)} (sendo R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(valor)} original + ${formatCurrency(multaValor)} de multa por atraso${jurosValor > 0 ? ` + ${formatCurrency(jurosValor)} de juros de mora por ${diasJurosEfetivos} dias` : ''})`
    : valorFormatado;

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

  const suffix = formatPixSuffix(businessSettings);

  // Templates de Cobrança
  const templates = [
    {
      id: 'amigavel',
      titulo: '😊 Amigável',
      descricao: 'Lembrete leve e afetuoso, ideal para os primeiros dias de atraso.',
      texto: `Olá, ${nomeExibido}! Tudo bem? Passando para te lembrar com carinho do pagamento de ${valorExibidoText} referente a "${descricao}" que venceu ${diasVencidoText}. Se precisar de qualquer ajuda ou tiver alguma dúvida, estou por aqui! 😊${suffix}`,
    },
    {
      id: 'direto',
      titulo: '🤝 Direto',
      descricao: 'Mensagem objetiva e profissional, focada em resolver o pagamento.',
      texto: `Olá, ${nomeExibido}! Lembrete do vencimento da sua parcela de ${valorExibidoText} (referente a "${descricao}") que está pendente ${diasVencidoText}. Se precisar dos dados do Pix ou conta para pagamento, por favor me avise. Obrigado!${suffix}`,
    },
    {
      id: 'formal',
      titulo: '👔 Formal',
      descricao: 'Mensagem corporativa e estruturada para cobranças oficiais.',
      texto: `Prezado(a) ${nomeExibido}, gostaríamos de lembrar sobre o vencimento da parcela no valor de ${valorExibidoText}, referente ao serviço "${descricao}", vencida em ${dataFormatada}. Solicitamos a gentileza de realizar a liquidação do valor pendente assim que possível. Caso o pagamento já tenha sido efetuado, por favor desconsidere este aviso. Atenciosamente.${suffix}`,
    },
  ];

  // Sincronizar props com estado local se mudar de cliente/transação
  const currentPropsKey = `${clienteNome}-${valor}-${dataVencimento}-${descricao}`;

  useEffect(() => {
    if (loadingSettings) return;
    const activeTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];
    setMensagemEditada(activeTemplate.texto);
  }, [selectedTemplateId, currentPropsKey, businessSettings, loadingSettings]);

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
              Escolher Mensagem de Cobrança
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Selecione o tom de cobrança e personalize o texto para {nomeExibido}
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
          {/* Resumo da Pendência */}
          <div className="p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200/50 dark:border-orange-900/30 rounded-2xl flex flex-wrap gap-x-6 gap-y-2 justify-between items-center text-sm">
            <div>
              <p className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold uppercase tracking-wider">Item a cobrar</p>
              <p className="font-bold text-gray-800 dark:text-gray-200 mt-0.5">{descricao}</p>
            </div>
            <div>
              <p className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold uppercase tracking-wider">Valor devido</p>
              <p className="font-black text-gray-900 dark:text-white mt-0.5 text-lg">{valorFormatado}</p>
            </div>
            <div>
              <p className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold uppercase tracking-wider">Atraso</p>
              <p className="font-bold text-red-600 dark:text-red-400 mt-0.5">{diasVencidoText}</p>
            </div>
          </div>

          {/* Painel de Controle de Juros e Multas (se atrasado) */}
          {diasVencido > 0 && (
            <div className="p-4 bg-red-50/50 dark:bg-red-950/10 border border-red-200/40 dark:border-red-900/20 rounded-2xl space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  <span className="text-xs font-bold text-red-800 dark:text-red-400 uppercase tracking-wider">Atraso com Juros e Multas</span>
                </div>
                {(fineRate > 0 || interestRate > 0) ? (
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cobrarAtraso}
                      onChange={(e) => setCobrarAtraso(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Aplicar na Cobrança
                  </label>
                ) : (
                  <span className="text-[10px] text-gray-500">Nenhum juros/multa padrão configurado na empresa</span>
                )}
              </div>

              {cobrarAtraso && (fineRate > 0 || interestRate > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                  <div className="p-2.5 bg-white dark:bg-white/3 rounded-xl border dark:border-white/5">
                    <span className="text-gray-500 block mb-0.5">Multa ({fineRate}%)</span>
                    <strong className="text-gray-800 dark:text-gray-200 text-sm">{formatCurrency(multaValor)}</strong>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-white/3 rounded-xl border dark:border-white/5">
                    <span className="text-gray-500 block mb-0.5">Juros Diário ({interestRate}%)</span>
                    <strong className="text-gray-800 dark:text-gray-200 text-sm">{formatCurrency(jurosValor)} <span className="text-[10px] text-gray-500 font-normal">({diasJurosEfetivos} dias)</span></strong>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-white/3 rounded-xl border dark:border-white/5">
                    <span className="text-gray-500 block mb-0.5">Total Atualizado</span>
                    <strong className="text-indigo-600 dark:text-indigo-400 text-sm">{formatCurrency(valorTotalFinal)}</strong>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-4 pt-1 text-xs border-t border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Dias de tolerância/adiamento:</span>
                  <input
                    type="number"
                    min="0"
                    value={diasTolerancia}
                    onChange={(e) => setDiasTolerancia(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-16 px-2 py-1 text-center border border-gray-300 dark:border-white/10 dark:bg-[#07101f] dark:text-white rounded-lg text-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDiasTolerancia(prev => prev + 7)}
                    className="px-2.5 py-1 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors text-xs"
                  >
                    +7 dias (Adiar)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiasTolerancia(0)}
                    className="px-2.5 py-1 text-red-600 hover:text-red-700 font-semibold transition-colors text-xs"
                  >
                    Limpar Carência
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Cards de Opções / Tons */}
          <div>
            <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">
              1. Escolha o tom de cobrança
            </label>
            <div className="grid grid-cols-3 gap-2">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleSelectTemplate(tpl.id, tpl.texto)}
                  className={`flex flex-col items-center gap-0.5 p-3 rounded-2xl border text-center transition-all ${
                    selectedTemplateId === tpl.id
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                      : 'bg-gray-50 dark:bg-white/3 border-gray-200 dark:border-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                  }`}
                >
                  <span className="text-xs font-extrabold">{tpl.titulo}</span>
                  <span className={`text-[9px] ${selectedTemplateId === tpl.id ? 'text-white/80' : 'text-gray-400'}`}>
                    {tpl.id === 'amigavel' ? 'Suave' : tpl.id === 'direto' ? 'Direto' : 'Formal'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Área de Edição */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5" />
                2. Personalize a mensagem de cobrança
              </label>
              <span className="text-[10px] text-gray-400 font-medium">Caracteres: {mensagemEditada.length}</span>
            </div>
            <textarea
              value={mensagemEditada}
              onChange={(e) => setMensagemEditada(e.target.value)}
              rows={5}
              placeholder="Edite a mensagem..."
              className="w-full px-4 py-3 text-sm rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#07101f] text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all leading-relaxed"
            />
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50/50 dark:bg-indigo-950/15 p-2 rounded-xl border border-indigo-200/20">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Dica: Ajuste os detalhes da cobrança ou anexe chaves Pix alternativas diretamente no texto.</span>
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
