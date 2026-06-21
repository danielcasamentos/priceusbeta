/**
 * 📱 GERADOR DE MENSAGENS WHATSAPP
 *
 * Sistema completo e robusto para geração de mensagens WhatsApp
 * com suporte a campos dinâmicos, sazonais e geográficos
 */

import { formatCurrency } from './utils';

// ==========================================
// INTERFACES E TIPOS
// ==========================================

export interface Product {
  id: string;
  nome: string;
  valor: number;
  permite_multiplos?: boolean;
  permite_multiplas_unidades?: boolean;
  desconto_percentual?: number;
  desconto_ativo?: boolean;
  resumo?: string;
}

export interface PaymentMethod {
  id: string;
  nome: string;
  entrada_tipo: 'percentual' | 'fixo';
  entrada_valor: number;
  max_parcelas: number;
  acrescimo: number;
}

export interface CustomField {
  id: string;
  label: string;
  obrigatorio: boolean;
}

export interface Profile {
  nome_profissional?: string;
  email_recebimento?: string;
  whatsapp_principal?: string;
}

export interface Template {
  nome: string;
  texto_whatsapp?: string;
  sistema_sazonal_ativo?: boolean;
  sistema_geografico_ativo?: boolean;
  ocultar_valores_intermediarios?: boolean;
  ocultar_taxa_deslocamento?: boolean;
}

export interface PriceBreakdown {
  subtotal: number;
  ajusteSazonal: number;
  ajusteGeografico: {
    percentual: number;
    taxa: number;
  };
  descontoCupom: number;
  acrescimoFormaPagamento: number;
  total: number;
  valorBase?: number;
  valorUpsell?: number;
}

export interface WhatsAppMessageOptions {
  // Dados do cliente
  clientName: string;
  clientEmail: string;
  clientPhone: string;

  // Dados do fotógrafo/perfil
  profile: Profile;
  template: Template;

  // Produtos selecionados
  products: Product[];
  selectedProducts: Record<string, number>; // { productId: quantity }

  // Adicionais de upsell
  upsellProducts?: Product[];

  // Forma de pagamento
  paymentMethod?: PaymentMethod;
  lastInstallmentDate?: string; // YYYY-MM-DD

  // Preços
  priceBreakdown: PriceBreakdown;

  // Cupom
  couponCode?: string;
  couponDiscount?: number; // Percentual

  // Campos sazonais e geográficos (aparecem automaticamente se sistemas ativos)
  eventDate?: string; // YYYY-MM-DD
  eventTime?: string; // HH:MM
  eventCity?: string;
  availabilityStatus?: 'disponivel' | 'ocupada' | 'parcial' | 'bloqueada' | 'inativa';

  // Campos personalizados extras (aparece automaticamente se preenchidos)
  customFields: CustomField[];
  customFieldsData: Record<string, string>; // { fieldId: value }

  // Contexto de envio
  context: 'client-to-photographer' | 'photographer-to-client';
}

// ==========================================
// FUNÇÃO PRINCIPAL
// ==========================================

/**
 * Gera mensagem completa do WhatsApp com todos os dados dinâmicos
 */
export function generateWhatsAppMessage(options: WhatsAppMessageOptions): string {
  const {
    clientName,
    clientEmail,
    clientPhone,
    profile,
    template,
    products,
    selectedProducts,
    paymentMethod,
    lastInstallmentDate,
    priceBreakdown,
    couponCode,
    couponDiscount,
    eventDate,
    eventCity,
    availabilityStatus,
   
    context,
  } = options;

  // 1. USAR TEMPLATE PERSONALIZADO OU PADRÃO
  let message = template.texto_whatsapp || getDefaultTemplate(context);
  console.log('DEBUG_WA: Initial message (after template/default):', message);

  // 2. PREPARAR LISTA DE PRODUTOS
  let productsText = buildProductsList(
    products,
    selectedProducts,
    template.ocultar_valores_intermediarios || false
  );
  console.log('DEBUG_WA: Generated productsText:', productsText);

  // 2b. PREPARAR LISTA DE UPSELLS
  let upsellText = '';
  if (options.upsellProducts && options.upsellProducts.length > 0) {
    upsellText = options.upsellProducts
      .map((p) => {
        const valFinal = p.valor * (1 - (p.desconto_percentual ?? 0) / 100);
        if (template.ocultar_valores_intermediarios) {
          return `• 🎁 ${p.nome}`;
        }
        return `• 🎁 ${p.nome} - ${formatCurrency(valFinal)}`;
      })
      .join('\n');
  }

  // Se houver upsellText, e o template não contiver a tag {{UPSELL_LIST}}, anexar ao productsText
  if (upsellText && !template.texto_whatsapp?.includes('{{UPSELL_LIST}}')) {
    productsText += (productsText ? '\n' : '') + upsellText;
  }

  // 3. CALCULAR DETALHES DE PAGAMENTO
  const { entradaText, parcelasText } = calculatePaymentDetails(
    paymentMethod,
    priceBreakdown.total
  );

  // 4. FORMATAR DATA DA ÚLTIMA PARCELA
  const lastInstallmentDateFormatted = lastInstallmentDate // Corrigido: Esta variável não estava sendo usada
    ? formatDate(lastInstallmentDate)
    : '';

  // 5. FORMATAR DATA DO EVENTO
  let eventDateFormatted = eventDate ? formatDate(eventDate) : '';
  if (eventDateFormatted && availabilityStatus) {
    let statusText = '';
    switch (availabilityStatus) {
      case 'disponivel':
        statusText = '[Data Livre]';
        break;
      case 'parcial':
        statusText = '[Disponibilidade Parcial]';
        break;
      case 'ocupada':
        statusText = '[Data Ocupada]';
        break;
    }
    if (statusText) eventDateFormatted += ` ${statusText}`;
  }

  // 6. CRIAR MAPA DE SUBSTITUIÇÕES
  const replacements: Record<string, string> = {
    // Dados do cliente
    '{{CLIENT_NAME}}': clientName || '',
    '{{CLIENT_EMAIL}}': clientEmail || '',
    '{{CLIENT_PHONE}}': clientPhone || '',

    // Dados do fotógrafo
    '{{PHOTOGRAPHER_NAME}}': profile.nome_profissional || '',
    '{{PHOTOGRAPHER_EMAIL}}': profile.email_recebimento || '',
    '{{PHOTOGRAPHER_PHONE}}': profile.whatsapp_principal || '',
    '{{TEMPLATE_NAME}}': template.nome || '',

    // Produtos e valores
    '{{SERVICES_LIST}}': productsText,
    '{{UPSELL_LIST}}': upsellText,
    '{{SUBTOTAL_VALUE}}': formatCurrency(priceBreakdown.subtotal),
    '{{TOTAL_VALUE}}': formatCurrency(priceBreakdown.total),
    '{{BASE_TOTAL_VALUE}}': formatCurrency(priceBreakdown.valorBase ?? priceBreakdown.total),
    '{{UPSELL_TOTAL_VALUE}}': formatCurrency(priceBreakdown.valorUpsell ?? 0),

    // Forma de pagamento
    '{{PAYMENT_METHOD}}': paymentMethod?.nome || '',
    '{{DOWN_PAYMENT}}': entradaText ? `💳 *Entrada:* ${entradaText}` : '',
    '{{INSTALLMENTS}}': parcelasText ? `💳 *Parcelamento:* ${parcelasText}` : '',
    '{{INSTALLMENTS_COUNT}}': paymentMethod?.max_parcelas?.toString() || '',
    '{{LAST_INSTALLMENT_DATE}}': lastInstallmentDateFormatted,

    // Ajustes de preço
    '{{SEASONAL_ADJUSTMENT}}':
      priceBreakdown.ajusteSazonal !== 0
        ? formatCurrency(Math.abs(priceBreakdown.ajusteSazonal))
        : '',
    '{{GEOGRAPHIC_ADJUSTMENT}}':
      priceBreakdown.ajusteGeografico.percentual !== 0
        ? formatCurrency(Math.abs(priceBreakdown.ajusteGeografico.percentual))
        : '',
    '{{TRAVEL_FEE}}':
      priceBreakdown.ajusteGeografico.taxa !== 0 && !template.ocultar_taxa_deslocamento
        ? formatCurrency(priceBreakdown.ajusteGeografico.taxa)
        : '',
    '{{PAYMENT_ADJUSTMENT}}':
      priceBreakdown.acrescimoFormaPagamento !== 0
        ? formatCurrency(Math.abs(priceBreakdown.acrescimoFormaPagamento))
        : '',

    // Cupom
    '{{COUPON_CODE}}': couponCode || '',
    '{{COUPON_DISCOUNT}}':
      couponDiscount && couponDiscount > 0
        ? `-${couponDiscount}% (${formatCurrency(priceBreakdown.descontoCupom)})`
        : '',

    // 🔥 DADOS SAZONAIS E GEOGRÁFICOS (aparecem automaticamente)
    '{{EVENT_DATE}}': eventDateFormatted,
    '{{EVENT_TIME}}': options.eventTime || '',
    '{{EVENT_CITY}}': eventCity || '',
  };

  // 7. APLICAR SUBSTITUIÇÕES
  Object.entries(replacements).forEach(([key, value]) => {
    const regex = new RegExp(key.replace(/[{}]/g, '\\$&'), 'g');
    message = message.replace(regex, value);
  });
  console.log('DEBUG_WA: Message after replacements:', message);

  // 8. LIMPAR LINHAS VAZIAS OU INCOMPLETAS
  message = cleanEmptyLines(message);

  // 🔥 NOVO: Se SERVICES_LIST não foi incluído no template e há produtos, adicioná-los
  if (productsText && !message.includes(productsText) && !message.includes('SERVIÇOS SELECIONADOS')) {
    console.log('DEBUG_WA: Appending productsText as it was not found.');
    message += `\n\n📸 *SERVIÇOS SELECIONADOS:*\n${productsText}`;
  }
  console.log('DEBUG_WA: Message after productsText append logic:', message);

  // 🔥 NOVO: Se UPSELL_LIST não foi incluída e há adicionais, anexar
  if (upsellText && !message.includes(upsellText) && !message.includes('ADICIONAIS ESPECIAIS')) {
    message += `\n\n🎁 *ADICIONAIS ESPECIAIS:*\n${upsellText}`;
  }

  // 🔥 Resumo Financeiro detalhado se houver upsell e não houver um resumo no template
  if (upsellText && priceBreakdown.valorUpsell && priceBreakdown.valorUpsell > 0) {
    if (!message.includes('Pacote Base:') && !message.includes('Total Geral:')) {
      message += `\n\n💵 *Resumo Financeiro:*`;
      message += `\n• Pacote Base: ${formatCurrency(priceBreakdown.valorBase ?? (priceBreakdown.total - priceBreakdown.valorUpsell))}`;
      message += `\n• Opcionais (Upsell): ${formatCurrency(priceBreakdown.valorUpsell)}`;
      message += `\n• *Total Geral:* ${formatCurrency(priceBreakdown.total)}`;
    }
  }

  // 9. 🔥 ADICIONAR CAMPOS PERSONALIZADOS SE EXISTIREM
  const customFieldsSection = buildCustomFieldsSection(options.customFields, options.customFieldsData);
  if (customFieldsSection) {
    message += `\n\n${customFieldsSection}`;
  }

  // 10. 🔥 ADICIONAR DADOS SAZONAIS/GEOGRÁFICOS SE SISTEMAS ATIVOS E NÃO NO TEMPLATE
  const additionalDataSection = buildAdditionalDataSection({
    template,
    eventDate: eventDateFormatted,
    eventCity,
    priceBreakdown,
    eventTime: options.eventTime,
  });
  if (additionalDataSection) {
    message += `\n\n${additionalDataSection}`;
  }

  return message.trim();
}

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

/**
 * Constrói lista de produtos formatada
 */
function buildProductsList(
  products: Product[],
  selectedProducts: Record<string, number>,
  hideValues: boolean
): string {
  return products
    .filter((p) => selectedProducts[p.id] && selectedProducts[p.id] > 0)
    .map((p) => {
      const quantity = selectedProducts[p.id];
      const showQty = p.permite_multiplas_unidades !== false;
      const qtyText = showQty ? `${quantity}x ` : "";
      let productLine = hideValues
        ? `• ${qtyText}${p.nome}`
        : `• ${qtyText}${p.nome} - ${formatCurrency(p.valor)}`;
      if (p.resumo) {
        productLine += `\n   ${p.resumo.trim()}`;
      }
      return productLine;
    })
    .join('\n');
}

/**
 * Calcula detalhes de entrada e parcelas
 */
function calculatePaymentDetails(
  paymentMethod: PaymentMethod | undefined,
  total: number
): { entradaText: string; parcelasText: string } {
  if (!paymentMethod) {
    return { entradaText: '', parcelasText: '' };
  }

  let entradaText = '';
  let parcelasText = '';

  // Calcular entrada
  if (paymentMethod.entrada_tipo === 'percentual') {
    const entradaValor = (total * paymentMethod.entrada_valor) / 100;
    entradaText = `${paymentMethod.entrada_valor}% (${formatCurrency(entradaValor)})`;
  } else {
    entradaText = formatCurrency(paymentMethod.entrada_valor);
  }

  // Calcular parcelas
  if (paymentMethod.max_parcelas > 1) {
    const valorEntrada =
      paymentMethod.entrada_tipo === 'percentual'
        ? (total * paymentMethod.entrada_valor) / 100
        : paymentMethod.entrada_valor;
    const saldoRestante = total - valorEntrada;
    const valorParcela = saldoRestante / paymentMethod.max_parcelas;
    parcelasText = `${paymentMethod.max_parcelas}x de ${formatCurrency(valorParcela)}`;
  }

  return { entradaText, parcelasText };
}

/**
 * Constrói seção de campos personalizados
 */
function buildCustomFieldsSection(
  customFields: CustomField[],
  customFieldsData: Record<string, string>
): string {
  // Filtrar apenas campos que têm valor
  const fieldsWithData = customFields
    .filter((field) => customFieldsData[field.id]?.trim())
    .map((field) => {
      const value = customFieldsData[field.id];
      // Adicionar numeração automática (campoInserido01, campoInserido02...)
      return `📌 ${field.label}: ${value}`;
    });

  if (fieldsWithData.length === 0) return '';

  return `📝 *INFORMAÇÕES ADICIONAIS:*\n${fieldsWithData.join('\n')}`;
}

/**
 * Constrói seção de dados adicionais (sazonal/geográfico) se não estiverem no template
 */
function buildAdditionalDataSection(options: {
  template: Template;
  eventDate: string;
  eventCity?: string;
  priceBreakdown: PriceBreakdown;
  eventTime?: string;
}): string {
  const { template, eventDate, eventCity, priceBreakdown, eventTime } = options;
  const sections: string[] = [];

  // 🔥 RESPEITAR configuração de ocultar valores intermediários
  const ocultarValores = template.ocultar_valores_intermediarios || false;

  // Se sistema sazonal ativo e tem data, adicionar
  if (template.sistema_sazonal_ativo && eventDate) {
    let dateLine = `📅 *Data:* ${eventDate}`;
    if (eventTime) {
      dateLine += ` às ${eventTime}`;
    }
    sections.push(dateLine);

    // 🔥 Só mostrar ajuste sazonal se valores NÃO estiverem ocultos
    if (!ocultarValores && priceBreakdown.ajusteSazonal !== 0) {
      const signal = priceBreakdown.ajusteSazonal > 0 ? '+' : '';
      sections.push(
        `   └─ Ajuste Sazonal: ${signal}${formatCurrency(Math.abs(priceBreakdown.ajusteSazonal))}`
      );
    }
  }

  // Se sistema geográfico ativo e tem cidade, adicionar
  if (template.sistema_geografico_ativo && eventCity) {
    sections.push(`📍 *Cidade:* ${eventCity}`);

    // 🔥 Só mostrar ajustes geográficos se valores NÃO estiverem ocultos
    if (!ocultarValores) {
      if (
        priceBreakdown.ajusteGeografico.percentual !== 0 ||
        priceBreakdown.ajusteGeografico.taxa !== 0
      ) {
        if (priceBreakdown.ajusteGeografico.percentual !== 0) {
          const signal = priceBreakdown.ajusteGeografico.percentual > 0 ? '+' : '';
          sections.push(
            `   └─ Ajuste Regional: ${signal}${formatCurrency(Math.abs(priceBreakdown.ajusteGeografico.percentual))}`
          );
        }
        if (priceBreakdown.ajusteGeografico.taxa !== 0 && !template.ocultar_taxa_deslocamento) {
          sections.push(
            `   └─ Taxa de Deslocamento: ${formatCurrency(priceBreakdown.ajusteGeografico.taxa)}`
          );
        }
      }
    }
  }

  if (sections.length === 0) return '';

  return `🗓️ *DETALHES DO EVENTO:*\n${sections.join('\n')}`;
}

/**
 * Limpa linhas vazias ou apenas com labels sem valores
 */
function cleanEmptyLines(message: string): string {
  const lines = message.split('\n');
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Ignorar linhas completamente vazias que formam espaços duplos
    if (!trimmed) {
      // Só adiciona linha em branco se a linha anterior também não for em branco
      if (result.length > 0 && result[result.length - 1] !== '') {
        result.push('');
      }
      continue;
    }

    // Padrões de linhas sem valor (label: sem conteúdo)
    const emptyPatterns = [
      /^(Subtotal|Local|Data|Cidade|Cupom|Ajuste|Forma de Pagamento|Entrada|Parcelamento|Parcelas):?\s*$/i,
      /^[📅📍💳]\s*\*?(Data|Cidade|Forma de Pagamento|Entrada|Parcelamento|Parcelas)\*?:\s*$/i,   // emoji + label vazio
      /^(💳\s*)?[\*_]?Forma de Pagamento[\*_]?:?[\*_]?\s*$/i,
      /^(💳\s*)?[\*_]?Entrada[\*_]?:?[\*_]?\s*$/i,
      /^(💳\s*)?[\*_]?Parcelamento[\*_]?:?[\*_]?\s*$/i,
      /^(💳\s*)?[\*_]?Parcelas[\*_]?:?[\*_]?\s*$/i,
      /^[•\-]\s*$/,
    ];
    if (emptyPatterns.some((p) => p.test(trimmed))) continue;

    // Se a linha anterior foi um cabeçalho de seção (negrito) e esta linha
    // acabaria sendo a próxima não-vazia, verificar se o cabeçalho ficará
    // sozinho (sem filhos) — tratado após o loop.
    result.push(lines[i]);
  }

  // Remover cabeçalhos de seção que ficaram sem linhas de conteúdo abaixo
  const orphanSectionPattern = /^[🗓️📝📦💳].*\*[A-ZÁÀÃÉÊÍÓÔÕÚÜÇ ]+\*.*:?\s*$/;
  const cleaned: string[] = [];
  for (let i = 0; i < result.length; i++) {
    const line = result[i].trim();
    if (orphanSectionPattern.test(line)) {
      // Verifica se a próxima linha não-vazia existe e NÃO é outro cabeçalho
      const nextNonEmpty = result.slice(i + 1).find(l => l.trim() !== '');
      if (!nextNonEmpty || orphanSectionPattern.test(nextNonEmpty.trim())) {
        // Cabeçalho órfão — pular ele e a linha vazia que vem antes (se existir)
        if (cleaned.length > 0 && cleaned[cleaned.length - 1] === '') {
          cleaned.pop();
        }
        continue;
      }
    }
    cleaned.push(result[i]);
  }

  // Remover linhas em branco extras no início e fim
  return cleaned
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Formata data no padrão brasileiro
 */
function formatDate(dateString: string): string {
  try {
    // Assumindo formato YYYY-MM-DD
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
}

/**
 * Template padrão dependendo do contexto
 */
function getDefaultTemplate(context: 'client-to-photographer' | 'photographer-to-client'): string {
  if (context === 'client-to-photographer') {
    return `Olá! Gostaria de solicitar um orçamento:

📸 *SERVIÇOS SELECIONADOS:*
{{SERVICES_LIST}}

💰 *Valor Total:* {{TOTAL_VALUE}}

💳 *Forma de Pagamento:* {{PAYMENT_METHOD}}
{{DOWN_PAYMENT}}
{{INSTALLMENTS}}

*Meus Dados:*
👤 {{CLIENT_NAME}}
📧 {{CLIENT_EMAIL}}
📱 {{CLIENT_PHONE}}`;
  } else {
    return `Olá {{CLIENT_NAME}}, tudo bem?

Vi que você criou um orçamento em nosso site e gostaria de ajudá-lo(a) a finalizar!

📦 *SERVIÇOS SOLICITADOS:*
{{SERVICES_LIST}}

💰 *VALOR TOTAL:* {{TOTAL_VALUE}}
💳 *Forma de Pagamento:* {{PAYMENT_METHOD}}
{{DOWN_PAYMENT}}
{{INSTALLMENTS}}

Estou à disposição para esclarecer dúvidas e fechar o orçamento.

Como posso ajudar?`;
  }
}

// ==========================================
// FUNÇÕES PARA GERAR LINKS WA.ME
// ==========================================

/**
 * Gera link wa.me completo para cliente enviar ao fotógrafo
 */
export function generateWaLinkToPhotographer(
  photographerPhone: string | number | null | undefined,
  message: string
): string {
  const cleanPhone = cleanPhoneNumber(photographerPhone);
  if (!cleanPhone) {
    return '';
  }
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

/**
 * Gera link wa.me completo para fotógrafo enviar ao cliente (follow-up)
 */
export function generateWaLinkToClient(clientPhone: string | number | null | undefined, message: string): string {
  const cleanPhone = cleanPhoneNumber(clientPhone);
  if (!cleanPhone) {
    return '';
  }
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

/**
 * Limpa número de telefone removendo caracteres especiais
 * e adiciona código do país se necessário
 */
function cleanPhoneNumber(phone: string | number | null | undefined): string {
  if (!phone) {
    return '';
  }

  const phoneStr = String(phone);
  let cleaned = phoneStr.replace(/\D/g, '');

  if (cleaned.length === 11 && !cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }

  return cleaned;
}
