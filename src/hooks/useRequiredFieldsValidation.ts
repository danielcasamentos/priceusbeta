/**
 * 🔒 HOOK DE VALIDAÇÃO DE CAMPOS OBRIGATÓRIOS
 *
 * Gerencia bloqueio de funcionalidades até que todos
 * campos obrigatórios sejam preenchidos
 */

import { useMemo } from 'react';

interface FormData {
  nome_cliente?: string;
  email_cliente?: string;
  telefone_cliente?: string;
  [key: string]: any;
}

interface CampoExtra {
  id: string;
  obrigatorio: boolean;
  [key: string]: any;
}

interface ValidationOptions {
  formData: FormData;
  camposExtras: CampoExtra[];
  camposExtrasData: Record<string, string>;
  dataEvento?: string;
  cidadeSelecionada?: string;
  sistemaGeograficoAtivo?: boolean;
  sistemaSazonalAtivo?: boolean;
  bloquearCamposObrigatorios?: boolean;
}

interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
  canAddProducts: boolean;
  canUseWhatsApp: boolean;
  canSeeTotals: boolean;
  canUsePaymentMethods: boolean;
  canUseCoupons: boolean;
  validationMessage: string;
}

export function useRequiredFieldsValidation({
  formData,
  camposExtras,
  camposExtrasData,
  dataEvento,
  cidadeSelecionada,
  sistemaGeograficoAtivo,
  sistemaSazonalAtivo,
  bloquearCamposObrigatorios = false,
}: ValidationOptions): ValidationResult {
  return useMemo(() => {
    // Se bloqueio não está ativado, libera tudo
    if (!bloquearCamposObrigatorios) {
      return {
        isValid: true,
        missingFields: [],
        canAddProducts: true,
        canUseWhatsApp: true,
        canSeeTotals: true,
        canUsePaymentMethods: true,
        canUseCoupons: true,
        validationMessage: '',
      };
    }

    const missingFields: string[] = [];

    // 1. Validar campos padrão obrigatórios
    if (!formData.nome_cliente?.trim()) {
      missingFields.push('Nome completo');
    }
    if (!formData.email_cliente?.trim()) {
      missingFields.push('E-mail');
    }
    if (!formData.telefone_cliente?.trim()) {
      missingFields.push('WhatsApp');
    }

    // 2. Validar data do evento (se sistema sazonal ativo)
    if (sistemaSazonalAtivo && !dataEvento) {
      missingFields.push('Data');
    }

    // 3. Validar localização (se sistema geográfico ativo)
    if (sistemaGeograficoAtivo && !cidadeSelecionada) {
      missingFields.push('Cidade');
    }

    // 4. Validar campos extras obrigatórios
    const camposExtrasObrigatorios = camposExtras.filter((c) => c.obrigatorio);
    camposExtrasObrigatorios.forEach((campo) => {
      if (!camposExtrasData[campo.id]?.trim()) {
        missingFields.push(campo.label || 'Campo personalizado');
      }
    });

    const isValid = missingFields.length === 0;

    // Construir mensagem de validação
    let validationMessage = '';
    if (!isValid) {
      validationMessage = `⚠️ Preencha os campos obrigatórios para desbloquear todas as funcionalidades:\n\n${missingFields.map((f) => `• ${f}`).join('\n')}`;
    }

    return {
      isValid,
      missingFields,
      // Quando bloqueio ativo, só libera se todos campos preenchidos
      canAddProducts: isValid,
      canUseWhatsApp: isValid,
      canSeeTotals: isValid,
      canUsePaymentMethods: isValid,
      canUseCoupons: isValid,
      validationMessage,
    };
  }, [
    formData,
    camposExtras,
    camposExtrasData,
    dataEvento,
    cidadeSelecionada,
    sistemaGeograficoAtivo,
    sistemaSazonalAtivo,
    bloquearCamposObrigatorios,
  ]);
}
