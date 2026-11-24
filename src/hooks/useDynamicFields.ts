import { useMemo } from 'react';

interface CampoExtra {
  id?: string;
  label: string;
  tipo: string;
  placeholder: string;
  obrigatorio: boolean;
  ordem: number;
}

interface DynamicFieldVariable {
  variable: string;
  label: string;
  description: string;
}

/**
 * Hook para gerenciar variáveis dinâmicas baseadas em campos extras
 * Gera automaticamente variáveis no formato {{campoInserido01}}, {{campoInserido02}}, etc.
 */
export function useDynamicFields(camposExtras: CampoExtra[]) {
  // Gera variáveis dinâmicas para todos os campos extras
  const dynamicVariables = useMemo<DynamicFieldVariable[]>(() => {
    return camposExtras
      .sort((a, b) => a.ordem - b.ordem)
      .map((campo, index) => {
        const numero = String(index + 1).padStart(2, '0');
        return {
          variable: `{{campoInserido${numero}}}`,
          label: campo.label,
          description: `Valor do campo: ${campo.label}`
        };
      });
  }, [camposExtras]);

  // Gera texto formatado com todas as variáveis
  const generateWhatsAppFieldsText = useMemo(() => {
    if (dynamicVariables.length === 0) {
      return '';
    }

    return '\n\n' + dynamicVariables
      .map(v => `${v.label}: ${v.variable}`)
      .join('\n');
  }, [dynamicVariables]);

  // Valida se uma string contém variáveis dinâmicas
  const hasValidVariables = (text: string): boolean => {
    return dynamicVariables.some(v => text.includes(v.variable));
  };

  // Extrai todas as variáveis usadas em um texto
  const extractUsedVariables = (text: string): string[] => {
    const regex = /\{\{campoInserido\d{2}\}\}/g;
    return text.match(regex) || [];
  };

  // Sincroniza template com novas variáveis
  const syncTemplateWithFields = (currentTemplate: string): string => {
    // Remove campos antigos que estão no final do template
    let cleanedTemplate = currentTemplate;

    // Procura por bloco de campos inseridos existente
    const camposInsertedBlockRegex = /\n\n[\s\S]*?\{\{campoInserido\d{2}\}\}[\s\S]*?$/;
    cleanedTemplate = cleanedTemplate.replace(camposInsertedBlockRegex, '');

    // Adiciona novos campos se existirem
    if (generateWhatsAppFieldsText) {
      return cleanedTemplate + generateWhatsAppFieldsText;
    }

    return cleanedTemplate;
  };

  // Retorna mapa de substituição para preview
  const getVariableMap = (formData: Record<string, any>): Record<string, string> => {
    const map: Record<string, string> = {};

    camposExtras.forEach((campo, index) => {
      const numero = String(index + 1).padStart(2, '0');
      const variable = `{{campoInserido${numero}}}`;

      // Tenta pegar valor do formData
      const fieldKey = campo.id || campo.label.toLowerCase().replace(/\s+/g, '_');
      map[variable] = formData[fieldKey] || `[${campo.label}]`;
    });

    return map;
  };

  // Substitui variáveis por valores reais
  const replaceVariables = (text: string, formData: Record<string, any>): string => {
    let result = text;
    const variableMap = getVariableMap(formData);

    Object.entries(variableMap).forEach(([variable, value]) => {
      result = result.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), value);
    });

    return result;
  };

  return {
    dynamicVariables,
    generateWhatsAppFieldsText,
    hasValidVariables,
    extractUsedVariables,
    syncTemplateWithFields,
    getVariableMap,
    replaceVariables,
    totalFields: camposExtras.length
  };
}

/**
 * Variáveis padrão do sistema (não são campos extras)
 */
export const STANDARD_VARIABLES = [
  {
    variable: '{{nome}}',
    label: 'Nome do Cliente',
    description: 'Nome completo do cliente'
  },
  {
    variable: '{{email}}',
    label: 'E-mail',
    description: 'Endereço de e-mail do cliente'
  },
  {
    variable: '{{telefone}}',
    label: 'Telefone',
    description: 'Número de telefone do cliente'
  },
  {
    variable: '{{endereco}}',
    label: 'Endereço',
    description: 'Endereço completo do cliente'
  },
  {
    variable: '{{cidade}}',
    label: 'Cidade',
    description: 'Cidade do cliente'
  }
];

/**
 * Combina variáveis padrão com variáveis dinâmicas
 */
export function getAllVariables(camposExtras: CampoExtra[]): DynamicFieldVariable[] {
  const { dynamicVariables } = useDynamicFields(camposExtras);
  return [...STANDARD_VARIABLES, ...dynamicVariables];
}
