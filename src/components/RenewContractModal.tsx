import React, { useState, useEffect } from 'react';
import { X, Clock, RotateCcw, Check, Share2, Copy, AlertTriangle, ExternalLink, Calendar, MessageCircle, Sparkles } from 'lucide-react';
import { format, addDays, isPast, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../lib/supabase';

export interface RenewContractModalProps {
  contract: {
    id: string;
    token: string;
    status: string;
    expires_at: string;
    created_at?: string;
    lead_data_json?: {
      nome_cliente?: string;
      data_evento?: string;
      valor_total?: number;
      telefone?: string;
      celular?: string;
      [key: string]: any;
    };
    client_data_json?: {
      nome_completo?: string;
      telefone?: string;
      email?: string;
      [key: string]: any;
    };
    contract_templates?: {
      name?: string;
    };
    [key: string]: any;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedContract: any) => void;
}

export function RenewContractModal({
  contract,
  isOpen,
  onClose,
  onSuccess,
}: RenewContractModalProps) {
  if (!isOpen || !contract) return null;

  const [selectedDays, setSelectedDays] = useState<number | 'custom'>(7);
  const [customDate, setCustomDate] = useState<string>(() => {
    const d = addDays(new Date(), 7);
    return format(d, 'yyyy-MM-dd');
  });
  const [generateNewToken, setGenerateNewToken] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [renewedSuccess, setRenewedSuccess] = useState<{
    link: string;
    expiresAt: string;
    contract: any;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Calcula a data de expiração selecionada
  const calculateNewExpiresAt = (): Date => {
    if (selectedDays === 'custom' && customDate) {
      const [year, month, day] = customDate.split('-').map(Number);
      const d = new Date(year, month - 1, day, 23, 59, 59);
      return d;
    }
    const daysToAdd = typeof selectedDays === 'number' ? selectedDays : 7;
    const target = addDays(new Date(), daysToAdd);
    target.setHours(23, 59, 59, 999);
    return target;
  };

  const newExpiresAt = calculateNewExpiresAt();

  const currentExpiresDate = new Date(contract.expires_at);
  const isAlreadyExpired = isPast(currentExpiresDate);
  const daysDiff = Math.abs(differenceInDays(new Date(), currentExpiresDate));

  const clientName =
    contract.lead_data_json?.nome_cliente ||
    contract.client_data_json?.nome_completo ||
    'Cliente';

  const clientPhone =
    contract.lead_data_json?.celular ||
    contract.lead_data_json?.telefone ||
    contract.client_data_json?.telefone ||
    '';

  const handleRenew = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const expiresAtIso = newExpiresAt.toISOString();
      const updatePayload: Record<string, any> = {
        expires_at: expiresAtIso,
        status: 'pending', // Reativa o contrato para pendente de assinatura
      };

      if (generateNewToken) {
        // Gerar novo UUID para o token
        updatePayload.token = crypto.randomUUID();
      }

      const { data, error } = await supabase
        .from('contracts')
        .update(updatePayload)
        .eq('id', contract.id)
        .select('*, client_ip, contract_templates!inner(id, name)')
        .single();

      if (error) throw error;

      const activeToken = updatePayload.token || contract.token;
      const signatureLink = `${window.location.origin}/contrato/${activeToken}`;

      setRenewedSuccess({
        link: signatureLink,
        expiresAt: expiresAtIso,
        contract: data,
      });

      // Notifica o componente pai sobre a atualização
      onSuccess(data);
    } catch (err: any) {
      console.error('Erro ao renovar contrato:', err);
      setErrorMessage(
        err?.message || 'Falha ao renovar o link do contrato. Verifique a conexão e tente novamente.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (!renewedSuccess) return;
    navigator.clipboard.writeText(renewedSuccess.link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    if (!renewedSuccess) return;
    const cleanPhone = clientPhone.replace(/\D/g, '');
    const formattedExpires = format(new Date(renewedSuccess.expiresAt), 'dd/MM/yyyy', { locale: ptBR });
    const text = `Olá, ${clientName}! Prorroguei o prazo de validade do seu contrato até ${formattedExpires}. Você já pode revisar e assinar diretamente pelo link:\n\n${renewedSuccess.link}`;
    const encodedMsg = encodeURIComponent(text);

    const waUrl = cleanPhone
      ? `https://wa.me/55${cleanPhone}?text=${encodedMsg}`
      : `https://wa.me/?text=${encodedMsg}`;

    window.open(waUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0a1628] border border-gray-200 dark:border-[rgba(255,255,255,0.08)] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-[rgba(255,255,255,0.07)] bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-purple-50/40 dark:from-[rgba(59,130,246,0.05)] dark:to-[rgba(99,102,241,0.05)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Renovar Link do Contrato
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Prorrogue o prazo para que o cliente possa assinar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl flex items-start gap-2.5 text-xs text-red-700 dark:text-red-400">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!renewedSuccess ? (
            <>
              {/* Card Resumo do Contrato */}
              <div className="bg-gray-50 dark:bg-[#07101f] border border-gray-200 dark:border-[rgba(255,255,255,0.06)] rounded-xl p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Cliente
                  </span>
                  {isAlreadyExpired ? (
                    <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/40 flex items-center gap-1">
                      <Clock size={11} /> Expirado há {daysDiff === 0 ? 'algumas horas' : `${daysDiff} dia(s)`}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 flex items-center gap-1">
                      <Clock size={11} /> Válido até {format(currentExpiresDate, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </span>
                  )}
                </div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {clientName}
                </p>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex flex-wrap gap-x-3">
                  <span>Template: <strong>{contract.contract_templates?.name || 'Contrato'}</strong></span>
                  {contract.lead_data_json?.data_evento && (
                    <span>Evento: <strong>{format(new Date(contract.lead_data_json.data_evento + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}</strong></span>
                  )}
                </div>
              </div>

              {/* Seletor de Extensão de Prazo */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  Escolha quanto tempo adicionar ao prazo:
                </label>

                <div className="grid grid-cols-4 gap-2">
                  {[
                    { days: 3, label: '+3 Dias' },
                    { days: 7, label: '+7 Dias', badge: 'Recomendado' },
                    { days: 15, label: '+15 Dias' },
                    { days: 30, label: '+30 Dias' },
                  ].map((option) => (
                    <button
                      key={option.days}
                      type="button"
                      onClick={() => setSelectedDays(option.days)}
                      className={`relative p-3 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center transition-all ${
                        selectedDays === option.days
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                          : 'border-gray-200 dark:border-[rgba(255,255,255,0.08)] bg-white dark:bg-[#07101f] text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-white/20'
                      }`}
                    >
                      {option.badge && (
                        <span className="absolute -top-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold shadow-xs">
                          {option.badge}
                        </span>
                      )}
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>

                {/* Opção de Data Personalizada */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedDays('custom')}
                    className={`w-full py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-between transition-all ${
                      selectedDays === 'custom'
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-[rgba(255,255,255,0.08)] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <span>📅 Definir uma data limite personalizada</span>
                    <span className="text-[11px] underline">Selecionar</span>
                  </button>

                  {selectedDays === 'custom' && (
                    <div className="mt-2 p-3 bg-gray-50 dark:bg-[#07101f] border border-blue-200 dark:border-blue-800/40 rounded-xl">
                      <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                        Novo prazo limite para assinatura:
                      </label>
                      <input
                        type="date"
                        min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-[#0a1628] border border-gray-300 dark:border-[rgba(255,255,255,0.1)] rounded-lg text-sm text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Informação do Novo Prazo */}
              <div className="p-3.5 bg-blue-50/80 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/30 rounded-xl text-xs text-blue-900 dark:text-blue-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <span>
                    Novo vencimento: <strong>{format(newExpiresAt, "dd 'de' MMMM 'de' yyyy 'às' 23:59", { locale: ptBR })}</strong>
                  </span>
                </div>
              </div>

              {/* Configuração do Link */}
              <div className="space-y-2 pt-1 border-t border-gray-100 dark:border-[rgba(255,255,255,0.06)]">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                  Opções do Link de Assinatura:
                </label>
                <div className="space-y-2">
                  <label
                    onClick={() => setGenerateNewToken(false)}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      !generateNewToken
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 text-gray-900 dark:text-white'
                        : 'border-gray-200 dark:border-[rgba(255,255,255,0.08)] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <input
                      type="radio"
                      name="link_mode"
                      checked={!generateNewToken}
                      onChange={() => setGenerateNewToken(false)}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <p className="text-xs font-bold">Manter o mesmo link (Recomendado)</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        O link que você já enviou pelo WhatsApp/E-mail volta a funcionar na mesma hora. O cliente só precisa abrir novamente.
                      </p>
                    </div>
                  </label>

                  <label
                    onClick={() => setGenerateNewToken(true)}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      generateNewToken
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 text-gray-900 dark:text-white'
                        : 'border-gray-200 dark:border-[rgba(255,255,255,0.08)] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <input
                      type="radio"
                      name="link_mode"
                      checked={generateNewToken}
                      onChange={() => setGenerateNewToken(true)}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <p className="text-xs font-bold">Gerar um novo link de segurança</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        Cria um endereço novinho e invalida qualquer link anterior. Útil caso precise redefinir o acesso.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </>
          ) : (
            /* Tela de Sucesso */
            <div className="py-4 text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-md">
                <Check className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Link Renovado com Sucesso!
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Válido até <strong>{format(new Date(renewedSuccess.expiresAt), "dd/MM/yyyy 'às' 23:59", { locale: ptBR })}</strong>
                </p>
              </div>

              {/* Caixa de Copiar Link */}
              <div className="bg-gray-50 dark:bg-[#07101f] border border-gray-200 dark:border-[rgba(255,255,255,0.08)] rounded-xl p-3 flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={renewedSuccess.link}
                  className="bg-transparent text-xs text-gray-700 dark:text-gray-300 w-full focus:outline-hidden font-mono truncate"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all flex-shrink-0 ${
                    copiedLink
                      ? 'bg-emerald-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {copiedLink ? <Check size={13} /> : <Copy size={13} />}
                  {copiedLink ? 'Copiado!' : 'Copiar'}
                </button>
              </div>

              {/* Botões de Ação Imediata */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleOpenWhatsApp}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  Enviar no WhatsApp
                </button>
                <a
                  href={renewedSuccess.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-4 border border-gray-300 dark:border-[rgba(255,255,255,0.12)] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir Contrato
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 dark:bg-[#07101f] border-t border-gray-100 dark:border-[rgba(255,255,255,0.07)] flex items-center justify-end gap-2.5">
          {!renewedSuccess ? (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/5 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRenew}
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Renovando...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    Salvar e Ativar Link
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-xs font-bold bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 text-white rounded-xl transition-colors"
            >
              Concluir
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
