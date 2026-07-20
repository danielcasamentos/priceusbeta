export interface BusinessSettings {
  business_name?: string;
  person_type?: string;
  cpf?: string;
  cnpj?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  email?: string;
  pix_key?: string;
  bank_name?: string;
  bank_agency?: string;
  bank_account?: string;
  bank_account_type?: string;
}

export interface ClientData {
  nome_completo?: string;
  cpf?: string;
  documento?: string; // campo real do formulário de assinatura (CPF ou CNPJ)
  rg?: string;
  endereco_completo?: string;
  cep?: string;
  telefone?: string;
  email?: string;
  data_evento?: string;
  local_evento?: string;
  endereco_evento?: string;
  cidade_evento?: string;
  horario_inicio?: string;
  observacoes?: string;
}

export interface LeadData {
  nome_cliente?: string;
  email?: string;
  telefone?: string;
  data_evento?: string;
  cidade?: string;
  cidade_evento?: string;
  orcamento_total?: number;
  valor_total?: number;
  produtos?: any[];
  servicos?: any[];
  desconto_cupom?: number;
  forma_pagamento?: string;
  forma_pagamento_detalhes?: any;
  acrescimo_pagamento?: number;
  ajuste_sazonal?: number;
  ajuste_geografico?: number;
  subtotal?: number;
  ocultar_valores_intermediarios?: boolean;
  plano_pagamento?: any;
  upsell_produtos?: any[];
  brindes_produtos?: any[];
  valor_base?: number;
  valor_upsell?: number;
}

/**
 * Remove emojis e outros caracteres especiais que não são bem renderizados em PDFs.
 */
const removeEmojis = (text: string | null | undefined): string => {
  if (!text) return '';
  return text.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim();
};

export function replaceContractVariables(
  template: string,
  businessSettings: BusinessSettings,
  clientData: ClientData,
  leadData: LeadData
): string {
  let result = template;

  console.log('=== REPLACE CONTRACT VARIABLES ===');
  console.log('Lead Data Received:', JSON.stringify(leadData, null, 2));
  console.log('Client Data Received:', JSON.stringify(clientData, null, 2));
  console.log('Business Settings:', JSON.stringify(businessSettings, null, 2));

  const cpfCnpjUsuario = businessSettings.person_type === 'fisica'
    ? (businessSettings.cpf || '')
    : (businessSettings.cnpj || '');

  const ocultarValores = leadData.ocultar_valores_intermediarios || false;

  const variables: Record<string, string> = {
    '{{NOME_USUARIO}}': businessSettings.business_name || '',
    '{{CPF_CNPJ_USUARIO}}': cpfCnpjUsuario,
    '{{ENDERECO_USUARIO}}': businessSettings.address || '',
    '{{CIDADE_USUARIO}}': businessSettings.city || '',
    '{{ESTADO_USUARIO}}': businessSettings.state || '',
    '{{CEP_USUARIO}}': businessSettings.zip_code || '',
    '{{TELEFONE_USUARIO}}': businessSettings.phone || '',
    '{{EMAIL_USUARIO}}': businessSettings.email || '',
    '{{PIX_USUARIO}}': businessSettings.pix_key || '',
    '{{BANCO_USUARIO}}': businessSettings.bank_name || '',
    '{{AGENCIA_USUARIO}}': businessSettings.bank_agency || '',
    '{{CONTA_USUARIO}}': businessSettings.bank_account || '',
    '{{PIX}}': (() => {
      const pixKey = businessSettings.pix_key || '';
      if (!pixKey) return '';
      
      let text = `• Chave PIX: ${pixKey}\n`;
      if (businessSettings.bank_name) text += `• Banco: ${businessSettings.bank_name}\n`;
      if (businessSettings.bank_agency) text += `• Agência: ${businessSettings.bank_agency}\n`;
      if (businessSettings.bank_account) text += `• Conta: ${businessSettings.bank_account}\n`;
      if (businessSettings.bank_account_type) text += `• Tipo de Conta: ${businessSettings.bank_account_type}\n`;
      
      return text.trim();
    })(),

    '{{NOME_CLIENTE}}': leadData.nome_cliente || '',
    '{{VALOR_BASE}}': leadData.valor_base !== undefined ? `R$ ${Number(leadData.valor_base).toFixed(2).replace('.', ',')}` : '',
    '{{VALOR_UPSELL}}': leadData.valor_upsell !== undefined ? `R$ ${Number(leadData.valor_upsell).toFixed(2).replace('.', ',')}` : '',
    '{{EMAIL_CLIENTE}}': leadData.email || clientData.email || '',
    '{{TELEFONE_CLIENTE}}': leadData.telefone || clientData.telefone || '',

    '{{NOME_COMPLETO_CLIENTE}}': clientData.nome_completo || leadData.nome_cliente || '',
    '{{CPF_CLIENTE}}': clientData.cpf || clientData.documento || '', // fallback para `documento` (campo real do formulário)
    '{{RG_CLIENTE}}': clientData.rg || '',
    '{{ENDERECO_COMPLETO_CLIENTE}}': clientData.endereco_completo || '',
    '{{CEP_CLIENTE}}': clientData.cep || '',

    '{{DATA_EVENTO}}': (() => {
      const dataEvento = clientData.data_evento || leadData.data_evento;
      if (!dataEvento) return '';
      try {
        return new Date(dataEvento + 'T00:00:00').toLocaleDateString('pt-BR');
      } catch (e) {
        console.error('Erro ao formatar data_evento:', dataEvento, e);
        return String(dataEvento);
      }
    })(),
    '{{CIDADE_EVENTO}}': clientData.cidade_evento || leadData.cidade_evento || leadData.cidade || '',
    '{{LOCAL_EVENTO}}': clientData.local_evento || '',
    '{{ENDERECO_EVENTO}}': clientData.endereco_evento || '',
    '{{HORARIO_INICIO}}': clientData.horario_inicio || '',
    '{{OBSERVACOES_CLIENTE}}': clientData.observacoes || '',

    '{{SUBTOTAL}}': ocultarValores ? '' : (() => {
      const subtotal = leadData.subtotal;
      if (!subtotal) return '';
      const valor = typeof subtotal === 'string' ? parseFloat(subtotal) : subtotal;
      return isNaN(valor) ? '' : `R$ ${valor.toFixed(2).replace('.', ',')}`;
    })(),
    '{{VALOR_TOTAL}}': (() => {
      const valorTotal = leadData.orcamento_total || leadData.valor_total;
      if (!valorTotal) return '';
      const valor = typeof valorTotal === 'string' ? parseFloat(valorTotal) : valorTotal;
      return isNaN(valor) ? '' : `R$ ${valor.toFixed(2).replace('.', ',')}`;
    })(),
    '{{DESCONTO_CUPOM}}': ocultarValores || !leadData.desconto_cupom
      ? ''
      : `R$ ${leadData.desconto_cupom.toFixed(2).replace('.', ',')}`,
    '{{ACRESCIMO_PAGAMENTO}}': ocultarValores || !leadData.acrescimo_pagamento
      ? ''
      : `R$ ${leadData.acrescimo_pagamento.toFixed(2).replace('.', ',')}`,
    '{{AJUSTE_SAZONAL}}': ocultarValores || !leadData.ajuste_sazonal
      ? ''
      : `R$ ${leadData.ajuste_sazonal.toFixed(2).replace('.', ',')}`,
    '{{AJUSTE_GEOGRAFICO}}': ocultarValores || !leadData.ajuste_geografico
      ? ''
      : `R$ ${leadData.ajuste_geografico.toFixed(2).replace('.', ',')}`,
    '{{FORMA_PAGAMENTO}}': (() => {
      let p = leadData.plano_pagamento;
      
      // Fallback: Gerar plano de pagamento caso não exista, mas tenhamos os detalhes do método selecionado
      if (!p && leadData.forma_pagamento_detalhes) {
        const fp = leadData.forma_pagamento_detalhes;
        const total = leadData.valor_total || 0;
        const maxParc = fp.max_parcelas || 1;
        const modo = maxParc > 1 
          ? (fp.entrada_valor > 0 ? 'entrada_parcelas' : 'parcelado')
          : 'avista';
          
        const valorEntrada = fp.entrada_valor > 0 
          ? (fp.entrada_tipo === 'percentual' ? (total * fp.entrada_valor) / 100 : fp.entrada_valor)
          : 0;
          
        const saldo = total - valorEntrada;
        const valorParcela = maxParc > 0 ? (saldo / maxParc) : saldo;
        
        // Calcular datas das parcelas (mensal a partir de hoje)
        const parcelas: any[] = [];
        const hj = new Date();
        
        for (let i = 1; i <= maxParc; i++) {
          const dt = new Date();
          dt.setMonth(hj.getMonth() + i);
          const dataStr = dt.toISOString().split('T')[0];
          parcelas.push({
            numero: i,
            valor: valorParcela,
            data: dataStr
          });
        }
        
        const dataEntradaStr = hj.toISOString().split('T')[0];
        
        p = {
          modo,
          forma_pagamento_nome: fp.nome,
          valor_total: total,
          entrada: fp.entrada_valor > 0 ? { valor: valorEntrada, data: dataEntradaStr } : null,
          parcelas
        };
      }

      if (p) {
        const formatCurrency = (val: number) => `R$ ${Number(val).toFixed(2).replace('.', ',')}`;
        const formatDate = (dtStr: string) => {
          if (!dtStr) return '';
          try {
            const parts = dtStr.split('-');
            if (parts.length === 3) {
              return `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
            return new Date(dtStr + 'T00:00:00').toLocaleDateString('pt-BR');
          } catch {
            return dtStr;
          }
        };

        const formaNome = p.forma_pagamento_nome || leadData.forma_pagamento || 'Não informado';
        let txt = `${formaNome}`;

        if (p.modo === 'avista') {
          txt += ` (À vista no valor de ${formatCurrency(p.valor_total || leadData.valor_total || 0)})`;
        } else if (p.modo === 'parcelado') {
          txt += ` (Parcelado em ${p.parcelas?.length || 0}x):\n`;
          if (p.parcelas && p.parcelas.length > 0) {
            p.parcelas.forEach((parc: any) => {
              txt += `• Parcela ${parc.numero}/${p.parcelas.length}: ${formatCurrency(parc.valor)} - Vencimento: ${formatDate(parc.data)}\n`;
            });
          }
        } else if (p.modo === 'entrada_parcelas') {
          txt += ` (Entrada + Parcelas):\n`;
          if (p.entrada) {
            txt += `• Entrada: ${formatCurrency(p.entrada?.valor || 0)} - Vencimento: ${formatDate(p.entrada?.data || '')}\n`;
          }
          if (p.parcelas && p.parcelas.length > 0) {
            p.parcelas.forEach((parc: any) => {
              txt += `• Parcela ${parc.numero}/${p.parcelas.length}: ${formatCurrency(parc.valor)} - Vencimento: ${formatDate(parc.data)}\n`;
            });
          }
        }
        return txt.trim();
      }
      return leadData.forma_pagamento || '';
    })(),
  };

  if (leadData.produtos && leadData.produtos.length > 0) {
    const produtosLista = leadData.produtos
      .map((p: any) => {
        const cleanNome = removeEmojis(p.nome);
        const showQty = p.permite_multiplas_unidades !== false;
        const qtyText = showQty ? `${p.quantidade}x ` : '';
        
        let line = '';
        if (ocultarValores) {
          line = `• ${qtyText}${cleanNome}`;
        } else {
          line = `• ${qtyText}${cleanNome} - R$ ${p.preco?.toFixed(2).replace('.', ',')}`;
        }
        
        if (p.resumo) {
          const formattedResumo = p.resumo
            .split('\n')
            .map((r: string) => {
              let rLine = r.trim();
              if (!rLine) return '';
              
              if (rLine.startsWith('#')) {
                rLine = rLine.replace(/^#+\s*/, '').toUpperCase();
              } else if (rLine === '---') {
                return '  ────────────────────';
              } else if (rLine.startsWith('-') || rLine.startsWith('*')) {
                rLine = '  • ' + rLine.replace(/^[-*]\s*/, '');
              } else {
                rLine = '  ' + rLine;
              }
              
              rLine = rLine.replace(/\*\*/g, '');
              return rLine;
            })
            .filter((r: string) => r !== '')
            .join('\n');
            
          if (formattedResumo) {
            line += `\n${formattedResumo}`;
          }
        }
        
        if (p.brindes_vinculados && Array.isArray(p.brindes_vinculados) && p.brindes_vinculados.length > 0) {
          // Look in brindes_produtos first, then fall back to upsell_produtos
          const brindesList = leadData.brindes_produtos || leadData.upsell_produtos || [];
          const tituloSecao = p.brindes_titulo_personalizado || 'Brinde Incluso';
          p.brindes_vinculados.forEach((brindeId: string) => {
            const brinde = brindesList.find((u: any) => (u.produto_id || u.id) === brindeId);
            const brindeNome = brinde ? (brinde.nome || brinde.nome_produto) : 'Brinde';
            line += `\n  🎁 ${tituloSecao}: ${removeEmojis(brindeNome)}`;
          });
        }
        
        return line;
      })
      .join('\n\n');
    variables['{{PRODUTOS_LISTA}}'] = produtosLista;
    variables['{{PRODUTO_LISTA}}'] = produtosLista;
  } else {
    variables['{{PRODUTOS_LISTA}}'] = '';
    variables['{{PRODUTO_LISTA}}'] = '';
  }

  if (leadData.upsell_produtos && leadData.upsell_produtos.length > 0) {
    const upsellLista = leadData.upsell_produtos
      .map((p: any) => {
        const cleanNome = removeEmojis(p.nome || p.nome_produto);
        const qtyText = p.quantidade > 1 ? `${p.quantidade}x ` : '';
        const precoVal = parseFloat(p.valor || p.preco || 0);
        const desc = p.desconto_percentual || 0;
        const precoFinal = precoVal * (1 - desc / 100);
        
        if (ocultarValores) {
          return `• ${qtyText}${cleanNome}`;
        } else {
          return `• ${qtyText}${cleanNome} - R$ ${precoFinal.toFixed(2).replace('.', ',')}`;
        }
      })
      .join('\n');
    variables['{{UPSELL_LISTA}}'] = upsellLista;
  } else {
    variables['{{UPSELL_LISTA}}'] = '';
  }

  if (leadData.servicos && leadData.servicos.length > 0) {
    const servicosLista = leadData.servicos
      .map((s: any) => {
        if (ocultarValores) {
          // Quando ocultar valores intermediários está ativo, mostrar apenas o nome do serviço
          return `- ${s.nome}`;
        } else {
          // Quando ocultar valores está desativado, mostrar nome e preço
          return `- ${s.nome}: R$ ${s.preco?.toFixed(2).replace('.', ',')}`;
        }
      })
      .join('\n');
    variables['{{SERVICOS_LISTA}}'] = servicosLista;
  } else {
    variables['{{SERVICOS_LISTA}}'] = '';
  }

  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    result = result.replace(regex, value);
  });

  console.log('=== VARIABLES GENERATED ===');
  console.log('{{DATA_EVENTO}}:', variables['{{DATA_EVENTO}}']);
  console.log('{{CIDADE_EVENTO}}:', variables['{{CIDADE_EVENTO}}']);
  console.log('{{VALOR_TOTAL}}:', variables['{{VALOR_TOTAL}}']);
  console.log('{{SUBTOTAL}}:', variables['{{SUBTOTAL}}']);
  console.log('{{PRODUTOS_LISTA}}:', variables['{{PRODUTOS_LISTA}}']);
  console.log('{{FORMA_PAGAMENTO}}:', variables['{{FORMA_PAGAMENTO}}']);
  console.log('=== ALL VARIABLES ===');
  Object.entries(variables).forEach(([key, value]) => {
    if (value) console.log(`${key}: ${value.substring(0, 100)}`);
  });

  return result;
}

export function getAvailableVariables(): { key: string; description: string; category: string }[] {
  return [
    { key: '{{NOME_USUARIO}}', description: 'Nome/Razão Social do usuário', category: 'Usuario' },
    { key: '{{CPF_CNPJ_USUARIO}}', description: 'CPF ou CNPJ do usuário', category: 'Usuario' },
    { key: '{{ENDERECO_USUARIO}}', description: 'Endereço do usuário', category: 'Usuario' },
    { key: '{{CIDADE_USUARIO}}', description: 'Cidade do usuário', category: 'Usuario' },
    { key: '{{ESTADO_USUARIO}}', description: 'Estado do usuário', category: 'Usuario' },
    { key: '{{CEP_USUARIO}}', description: 'CEP do usuário', category: 'Usuario' },
    { key: '{{TELEFONE_USUARIO}}', description: 'Telefone do usuário', category: 'Usuario' },
    { key: '{{EMAIL_USUARIO}}', description: 'Email do usuário', category: 'Usuario' },
    { key: '{{PIX_USUARIO}}', description: 'Chave PIX do usuário', category: 'Usuario' },
    { key: '{{BANCO_USUARIO}}', description: 'Nome do banco', category: 'Usuario' },
    { key: '{{AGENCIA_USUARIO}}', description: 'Agência bancária', category: 'Usuario' },
    { key: '{{CONTA_USUARIO}}', description: 'Conta bancária', category: 'Usuario' },
    { key: '{{PIX}}', description: 'Chave PIX e dados bancários consolidados', category: 'Usuario' },

    { key: '{{NOME_COMPLETO_CLIENTE}}', description: 'Nome completo do cliente', category: 'Cliente' },
    { key: '{{CPF_CLIENTE}}', description: 'CPF do cliente', category: 'Cliente' },
    { key: '{{RG_CLIENTE}}', description: 'RG do cliente', category: 'Cliente' },
    { key: '{{ENDERECO_COMPLETO_CLIENTE}}', description: 'Endereço completo do cliente', category: 'Cliente' },
    { key: '{{CEP_CLIENTE}}', description: 'CEP do cliente', category: 'Cliente' },
    { key: '{{TELEFONE_CLIENTE}}', description: 'Telefone do cliente', category: 'Cliente' },
    { key: '{{EMAIL_CLIENTE}}', description: 'Email do cliente', category: 'Cliente' },

    { key: '{{LOCAL_EVENTO}}', description: 'Nome do local do evento', category: 'Evento' },
    { key: '{{ENDERECO_EVENTO}}', description: 'Endereço do evento', category: 'Evento' },
    { key: '{{CIDADE_EVENTO}}', description: 'Cidade do evento', category: 'Evento' },
    { key: '{{DATA_EVENTO}}', description: 'Data do evento', category: 'Evento' },
    { key: '{{HORARIO_INICIO}}', description: 'Horário de início', category: 'Evento' },
    { key: '{{OBSERVACOES_CLIENTE}}', description: 'Observações do cliente', category: 'Evento' },

    { key: '{{SUBTOTAL}}', description: 'Subtotal (antes de ajustes)', category: 'Financeiro' },
    { key: '{{VALOR_TOTAL}}', description: 'Valor total do serviço', category: 'Financeiro' },
    { key: '{{DESCONTO_CUPOM}}', description: 'Desconto aplicado', category: 'Financeiro' },
    { key: '{{ACRESCIMO_PAGAMENTO}}', description: 'Acréscimo da forma de pagamento', category: 'Financeiro' },
    { key: '{{AJUSTE_SAZONAL}}', description: 'Ajuste sazonal (por data)', category: 'Financeiro' },
    { key: '{{AJUSTE_GEOGRAFICO}}', description: 'Ajuste geográfico (por localização)', category: 'Financeiro' },
    { key: '{{FORMA_PAGAMENTO}}', description: 'Forma de pagamento', category: 'Financeiro' },
    { key: '{{PRODUTOS_LISTA}}', description: 'Lista de produtos contratados (Plural)', category: 'Financeiro' },
    { key: '{{PRODUTO_LISTA}}', description: 'Lista de produtos contratados (Singular)', category: 'Financeiro' },
    { key: '{{SERVICOS_LISTA}}', description: 'Lista de serviços contratados', category: 'Financeiro' },
    { key: '{{UPSELL_LISTA}}', description: 'Lista de adicionais (upsell) contratados', category: 'Financeiro' },
    { key: '{{VALOR_BASE}}', description: 'Valor base (sem adicionais)', category: 'Financeiro' },
    { key: '{{VALOR_UPSELL}}', description: 'Valor total dos adicionais (upsell)', category: 'Financeiro' },
  ];
}
