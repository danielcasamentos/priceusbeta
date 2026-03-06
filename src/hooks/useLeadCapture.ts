import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

interface LeadData {
  templateId: string;
  userId: string;
  formData: Record<string, any>;
  orcamentoDetalhe: any;
  valorTotal: number;
}

export function useLeadCapture() {
  const [startTime] = useState(Date.now());
  const [sessionId] = useState(() => {
    let sid = sessionStorage.getItem('priceus_session_id');
    if (!sid) {
      sid = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('priceus_session_id', sid);
    }
    return sid;
  });

  const lastSaveRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto-save otimizado - apenas quando há dados significativos
  const autoSaveLead = async (data: Partial<LeadData>, status: string = 'abandonado') => {
    // 🔥 OTIMIZAÇÃO: Validar que há dados mínimos antes de salvar
    if (!data.formData || Object.keys(data.formData).length === 0) return;

    // Verificar se tem pelo menos nome OU email OU telefone preenchido
    const hasMinimumData =
      data.formData?.nome_cliente ||
      data.formData?.nomeCliente ||
      data.formData?.email_cliente ||
      data.formData?.emailCliente ||
      data.formData?.telefone_cliente ||
      data.formData?.telefoneCliente;

    if (!hasMinimumData) return; // Não salva se não tem dados de contato

    const currentData = JSON.stringify(data);
    if (currentData === lastSaveRef.current) return; // Sem mudanças

    lastSaveRef.current = currentData;

    const tempoPreenchimento = Math.floor((Date.now() - startTime) / 1000);

    // 🔥 CORREÇÃO: Payload ajustado para bater com o Zod Schema da Edge Function (camelCase e aninhado)
    const leadPayload = {
      templateId: data.templateId,
      userId: data.userId,
      formData: data.formData || {},
      orcamentoDetalhe: data.orcamentoDetalhe || {},
      valorTotal: data.valorTotal || 0,
      status: status,
      sessionId: sessionId,
      urlOrigem: window.location.href,
      userAgent: navigator.userAgent,
      tempoPreenchimento: tempoPreenchimento,
    };

    try {
      console.log('🚀 Invocando a Edge Function "create-lead"...');
      // ✅ NOVA LÓGICA: Invoca a Edge Function em vez de acessar o banco diretamente.
      const { data: savedLead, error } = await supabase.functions.invoke('create-lead', {
        body: leadPayload,
      });

      if (error) {
        // O erro pode ser de rede ou um erro retornado pela própria função.
        throw error || new Error('Erro desconhecido na Edge Function');
      }

      console.log('✅ Lead salvo com sucesso via Edge Function:', status);
      return savedLead; // A Edge Function deve retornar os dados do lead salvo.
    } catch (error) {
      console.error('❌ Erro ao invocar a Edge Function "create-lead":', error);

      // Tratamento específico para erro de RLS ou autenticação, comum em in-app browsers
      if (error.message?.includes('RLS') || error.message?.includes('JWT')) {
        alert(
          '❌ Erro de permissão. Isso pode acontecer em navegadores de aplicativos (como Instagram). Por favor, abra o link em um navegador externo (Chrome, Safari) e tente novamente.'
        );
      }

      // 🔥 IMPORTANTE: Relançar o erro para que quem chamou (saveFinalLead) saiba que falhou
      throw error;
    }
  };

  // Salva quando o usuário sai da página (abandonado)
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Salva de forma síncrona usando navigator.sendBeacon se possível
      const data = sessionStorage.getItem('priceus_current_lead');
      if (data) {
        try {
          const leadData = JSON.parse(data);
          // Aqui você poderia usar sendBeacon para garantir o envio
          autoSaveLead(leadData, 'abandonado');
        } catch (e) {
          console.error('Erro ao salvar lead no beforeunload', e);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Salva o lead com status "completo"
  const saveFinalLead = async (data: LeadData): Promise<{ lead: any; error: any }> => {
    // Limpa o timeout de auto-save para evitar condições de corrida
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    try {
      console.log('🚀 Invocando a Edge Function "create-lead" para lead final...');
      
      const tempoPreenchimento = Math.floor((Date.now() - startTime) / 1000);
      
      // 🔥 CORREÇÃO: Enviando payload aninhado correto (camelCase)
      const payload = {
        templateId: data.templateId,
        userId: data.userId,
        formData: data.formData,
        orcamentoDetalhe: data.orcamentoDetalhe,
        valorTotal: data.valorTotal,
        status: 'novo',
        sessionId: sessionId,
        urlOrigem: window.location.href,
        userAgent: navigator.userAgent,
        tempoPreenchimento: tempoPreenchimento,
      };

      const { data: lead, error: invokeError } = await supabase.functions.invoke('create-lead', {
        body: payload,
      });

      if (invokeError) {
        throw invokeError;
      }

      lastSaveRef.current = ''; // Reseta para permitir novas capturas
      return { lead, error: null };
    } catch (error) {
      console.error('❌ Erro crítico ao salvar lead final:', error);
      // Retorna o erro explicitamente
      return { lead: null, error: error || new Error('Falha ao salvar lead') };
    }
  };

  // Atualiza o lead em tempo real (debounced)
  const updateLead = (data: Partial<LeadData>) => {
    // Salva no sessionStorage para recuperação
    sessionStorage.setItem('priceus_current_lead', JSON.stringify(data));

    // 🔥 OTIMIZAÇÃO: Debounce aumentado para 30 segundos
    // Reduz salvamentos excessivos durante preenchimento
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      autoSaveLead(data, 'abandonado');
    }, 30000); // 30 segundos ao invés de 5
  };

  // Limpa o timeout ao desmontar
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    saveFinalLead,
    updateLead,
    sessionId,
  };
}

// Hook para tracking de interação com o formulário
export function useFormTracking() {
  const [interactions, setInteractions] = useState({
    fieldsVisited: new Set<string>(),
    timeSpentOnFields: {} as Record<string, number>,
    currentField: null as string | null,
    fieldStartTime: null as number | null,
  });

  const trackFieldFocus = (fieldName: string) => {
    setInteractions((prev) => {
      const newInteractions = { ...prev };
      newInteractions.fieldsVisited.add(fieldName);
      newInteractions.currentField = fieldName;
      newInteractions.fieldStartTime = Date.now();
      return newInteractions;
    });
  };

  const trackFieldBlur = (fieldName: string) => {
    setInteractions((prev) => {
      if (prev.currentField === fieldName && prev.fieldStartTime) {
        const timeSpent = Date.now() - prev.fieldStartTime;
        const newInteractions = { ...prev };
        newInteractions.timeSpentOnFields[fieldName] =
          (newInteractions.timeSpentOnFields[fieldName] || 0) + timeSpent;
        newInteractions.currentField = null;
        newInteractions.fieldStartTime = null;
        return newInteractions;
      }
      return prev;
    });
  };

  const getInteractionSummary = () => ({
    fieldsVisited: Array.from(interactions.fieldsVisited),
    averageTimePerField:
      Object.values(interactions.timeSpentOnFields).reduce((a, b) => a + b, 0) /
      Object.keys(interactions.timeSpentOnFields).length || 0,
    totalFields: interactions.fieldsVisited.size,
  });

  return {
    trackFieldFocus,
    trackFieldBlur,
    getInteractionSummary,
  };
}
