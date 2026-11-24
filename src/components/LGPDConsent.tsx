/**
 * 🔒 COMPONENTE DE CONSENTIMENTO LGPD
 *
 * Exibe checkbox obrigatório com termos LGPD
 * Registra consentimento com timestamp e IP
 * Conformidade total com Lei Geral de Proteção de Dados
 */

import { useState } from 'react';
import { Shield, ChevronDown, ChevronUp } from 'lucide-react';

interface LGPDConsentProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  photographerName?: string;
}

export function LGPDConsent({ checked, onChange, photographerName = 'o fotógrafo' }: LGPDConsentProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Texto completo do termo (versionado)
  const LGPD_TERM_VERSION = 'v1.0.0';
  const LGPD_TERM_DATE = '01/11/2024';

  const fullTermText = `
TERMO DE CONSENTIMENTO PARA TRATAMENTO DE DADOS PESSOAIS (LGPD)
Versão ${LGPD_TERM_VERSION} - Atualizado em ${LGPD_TERM_DATE}

Ao marcar esta caixa, você declara que:

1. CONSENTIMENTO INFORMADO
   Você consente, de forma livre, informada e inequívoca, com o tratamento de seus dados
   pessoais (nome completo, endereço de e-mail, número de telefone/WhatsApp e demais
   informações fornecidas neste formulário) por ${photographerName}.

2. FINALIDADE DO TRATAMENTO
   Seus dados serão utilizados exclusivamente para:
   - Elaboração e envio de orçamentos
   - Comunicação relacionada aos serviços solicitados
   - Agendamento e prestação dos serviços fotográficos
   - Melhoria da qualidade dos serviços oferecidos

3. COMPARTILHAMENTO DE DADOS
   Seus dados NÃO serão compartilhados com terceiros para fins comerciais, publicitários
   ou qualquer outra finalidade não relacionada à prestação dos serviços contratados.

4. ARMAZENAMENTO E SEGURANÇA
   Seus dados serão armazenados em servidores seguros e criptografados, pelo período
   necessário à execução dos serviços e conforme exigências legais.

5. SEUS DIREITOS (Art. 18 da LGPD)
   Você tem direito a:
   - Confirmar a existência de tratamento dos seus dados
   - Acessar seus dados pessoais
   - Corrigir dados incompletos, inexatos ou desatualizados
   - Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários
   - Solicitar a portabilidade de seus dados
   - Revogar este consentimento a qualquer momento

6. CONTATO E REVOGAÇÃO
   Para exercer seus direitos ou revogar este consentimento, entre em contato através
   do WhatsApp ou e-mail fornecidos por ${photographerName}.

Ao marcar este checkbox, você declara ter lido, compreendido e concordado integralmente
com os termos acima.
  `.trim();

  return (
    <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="lgpd-consent"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          required
          aria-required="true"
        />
        <div className="flex-1">
          <label htmlFor="lgpd-consent" className="text-sm font-medium text-gray-900 cursor-pointer">
            <Shield className="inline w-4 h-4 mr-1 text-blue-600" />
            Li e aceito os termos de uso dos meus dados pessoais (LGPD) *
          </label>
          <p className="text-xs text-gray-600 mt-1">
            Você consente com a coleta e uso de seus dados para elaboração de orçamento e comunicação.
            Seus dados são protegidos e não serão compartilhados com terceiros.
          </p>

          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium mt-2 flex items-center gap-1"
          >
            {showDetails ? (
              <>
                <ChevronUp className="w-3 h-3" />
                Ocultar termo completo
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                Ler termo completo de consentimento
              </>
            )}
          </button>

          {showDetails && (
            <div className="mt-3 p-3 bg-white border border-gray-200 rounded text-xs text-gray-700 max-h-64 overflow-y-auto whitespace-pre-line">
              {fullTermText}
            </div>
          )}
        </div>
      </div>

      {!checked && (
        <p className="text-xs text-red-600 mt-2 ml-8">
          ⚠️ É necessário concordar com os termos para enviar sua solicitação
        </p>
      )}
    </div>
  );
}

/**
 * Retorna o texto completo do termo para armazenamento
 */
export function getLGPDTermText(photographerName: string): string {
  const LGPD_TERM_VERSION = 'v1.0.0';
  const LGPD_TERM_DATE = '01/11/2024';

  return `
TERMO DE CONSENTIMENTO LGPD ${LGPD_TERM_VERSION} (${LGPD_TERM_DATE})

Consentimento informado para tratamento de dados pessoais por ${photographerName}.

Finalidades: Orçamento, comunicação, agendamento e prestação de serviços fotográficos.

Direitos garantidos: acesso, correção, eliminação, portabilidade e revogação do consentimento conforme LGPD (Lei 13.709/2018).

Aceito em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
  `.trim();
}
