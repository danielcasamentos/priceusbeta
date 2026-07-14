import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { usePlanLimits } from '../hooks/usePlanLimits';
import { UpgradeLimitModal } from './UpgradeLimitModal';
import { X, FileSignature, Send, Copy, Check, AlertCircle, Edit3, Save } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface ContractTemplate {
  id: string;
  name: string;
  content_text: string;
}

interface Lead {
  id: string;
  nome_cliente: string | null;
  email_cliente?: string | null;
  telefone_cliente?: string | null;
  email?: string;
  telefone?: string;
  tipo_evento?: string | null;
  data_evento?: string | null;
  cidade_evento?: string | null;
  cidade?: string;
  template_id?: string;
  orcamento_total?: number;
  valor_total?: number | string;
  orcamento_detalhe?: any;
}

interface ContractGeneratorProps {
  userId: string;
  lead: Lead;
  onClose: () => void;
  onSuccess: () => void;
}

export function ContractGenerator({ userId, lead, onClose, onSuccess }: ContractGeneratorProps) {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [contractContent, setContractContent] = useState(''); // 🔥 Novo estado para o conteúdo editável
  const [isEditing, setIsEditing] = useState(false); // 🔥 Novo estado para controlar o modo de edição
  const [expirationDays, setExpirationDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [generatedLeadData, setGeneratedLeadData] = useState<any>(null); // New state to store lead data
  const [shareMode, setShareMode] = useState<'completo' | 'simplificado' | 'so-link'>('completo');
  const [showSafariFallback, setShowSafariFallback] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState('');
  const planLimits = usePlanLimits();

  const orcamentoDetalhe = lead.orcamento_detalhe || {};
  const upsellProdutos = orcamentoDetalhe.upsell_produtos || [];
  const valorUpsell = typeof orcamentoDetalhe.valor_upsell === 'number'
    ? orcamentoDetalhe.valor_upsell
    : (typeof orcamentoDetalhe.valor_upsell === 'string' ? parseFloat(orcamentoDetalhe.valor_upsell) : 0);
  const totalVal = typeof lead.valor_total === 'number'
    ? lead.valor_total
    : (typeof lead.valor_total === 'string' ? parseFloat(lead.valor_total) : (orcamentoDetalhe.priceBreakdown?.total || lead.orcamento_total || 0));
  const valorBase = typeof orcamentoDetalhe.valor_base === 'number'
    ? orcamentoDetalhe.valor_base
    : (typeof orcamentoDetalhe.valor_base === 'string' ? parseFloat(orcamentoDetalhe.valor_base) : (totalVal - valorUpsell));

  useEffect(() => {
    loadTemplates();
  }, [userId]);

  // 🔥 Efeito para carregar o conteúdo do contrato quando um template é selecionado
  useEffect(() => {
    const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
    if (selectedTemplate) {
      setContractContent(selectedTemplate.content_text);
    }
  }, [selectedTemplateId, templates]);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('contract_templates')
        .select('id, name, content_text')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
      if (data && data.length > 0) {
        setSelectedTemplateId(data[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
    }
  };

  const handleGenerate = async () => {
    if (!selectedTemplateId) {
      alert('Selecione um contrato');
      return;
    }

    if (!planLimits.canGenerateContract) {
      setShowUpgradeModal(true);
      return;
    }

    setLoading(true);
    try {
      console.log('=== CONTRACT GENERATOR - LEAD DATA ===');
      console.log('Lead original:', JSON.stringify(lead, null, 2));

      const { data: businessSettings, error: businessError } = await supabase
        .from('user_business_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (businessError) throw businessError;

      if (!businessSettings?.signature_base64) {
        alert('Você precisa cadastrar sua assinatura digital antes de enviar contratos. Vá em "Dados Empresariais" e crie sua assinatura.');
        setLoading(false);
        return;
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expirationDays);

      const orcamentoDetalhe = lead.orcamento_detalhe || {};
      const selectedFormaPagamento = orcamentoDetalhe.selecoes?.paymentMethod || orcamentoDetalhe.selectedFormaPagamento || orcamentoDetalhe.forma_pagamento_id;
      const formaPagamentoCompleta = orcamentoDetalhe.formasPagamento?.find((fp: any) => fp.id === selectedFormaPagamento);

      let ocultarValoresIntermediarios = false;
      if (lead.template_id) {
        const { data: templateData } = await supabase
          .from('templates')
          .select('ocultar_valores_intermediarios')
          .eq('id', lead.template_id)
          .maybeSingle();

        if (templateData) {
          ocultarValoresIntermediarios = templateData.ocultar_valores_intermediarios || false;
        }
      }

      // Buscar nome da cidade
      const rawCityId = lead.cidade_evento || lead.cidade;
      let cityName = rawCityId;

      if (rawCityId) {
        // Tentar extrair um UUID da string, caso ela contenha outros dados
        const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
        const match = rawCityId.match(uuidRegex);
        const cityId = match ? match[0] : rawCityId; // Use o UUID extraído ou a string original

        if (cityId && cityId.length === 36) { // Um UUID tem 36 caracteres
          const { data: cityData, error: cityError } = await supabase
            .from('cidades_ajuste')
            .select('nome')
            .eq('id', cityId)
            .maybeSingle(); // Use maybeSingle para evitar erro se não encontrar

          if (cityError && cityError.code !== 'PGRST116') { // PGRST116 é "no rows found"
            console.error('Erro ao buscar nome da cidade:', cityError);
          }
          cityName = cityData?.nome || rawCityId; // Se não encontrar, mantém a string original
        }
      }


      let produtos: any[] = [];
      let formaPagamentoNome = '';
      let planoPagamentoDoCaixa: any = null;

      try {
        const { data: transacoes } = await supabase
          .from('company_transactions')
          .select('*')
          .eq('lead_id', lead.id)
          .order('data', { ascending: true });

        if (transacoes && transacoes.length > 0) {
          const entradaTx = transacoes.find((t: any) => !t.is_installment && t.descricao.toLowerCase().includes('entrada'));
          const parcelasTxs = transacoes.filter((t: any) => t.is_installment);
          const avistaTx = transacoes.find((t: any) => !t.is_installment && !t.descricao.toLowerCase().includes('entrada'));

          let modo: 'avista' | 'parcelado' | 'entrada_parcelas' = 'avista';
          if (entradaTx && parcelasTxs.length > 0) {
            modo = 'entrada_parcelas';
          } else if (parcelasTxs.length > 0) {
            modo = 'parcelado';
          }

          const fpNome = transacoes[0].forma_pagamento || lead.forma_pagamento || '';

          planoPagamentoDoCaixa = {
            modo,
            forma_pagamento_nome: fpNome,
            valor_total: transacoes.reduce((sum: number, t: any) => sum + Number(t.valor || 0), 0),
            entrada: entradaTx ? { valor: Number(entradaTx.valor), data: entradaTx.data, status: entradaTx.status } : null,
            parcelas: parcelasTxs.map((t: any, idx: number) => ({
              numero: t.installment_number || (idx + 1),
              valor: Number(t.valor),
              data: t.data,
              status: t.status
            }))
          };
        }
      } catch (txErr) {
        console.error('Erro ao buscar transacoes do caixa para o lead:', txErr);
      }

      const priceBreakdown = orcamentoDetalhe.priceBreakdown || {};

      // ── Normalização de produtos: suporta 3 formatos ──────────────────
      // Formato A (EditLeadQuoteModal snapshot): produtos = [{nome, valor, quantidade, ...}]
      // Formato B (QuotePage):                   produtos = [{produto_id, quantidade}]  ← sem nome!
      // Formato C (legado):                      selectedProdutos = { "id": quantidade }

      const produtosRaw = orcamentoDetalhe.produtos || [];

      const isSnapshotFormat  = produtosRaw.length > 0 && 'nome' in produtosRaw[0]; // Formato A
      const isProdutoIdFormat = produtosRaw.length > 0 && 'produto_id' in produtosRaw[0] && !('nome' in produtosRaw[0]); // Formato B

      const selectedMap: Record<string, number> =
          orcamentoDetalhe.selectedProdutos ||
          orcamentoDetalhe.selecoes?.produtos ||
          {};

      if (isSnapshotFormat) {
        // ✅ Formato A: snapshot completo — usa diretamente mas busca resumo/brindes mais recentes no banco se disponíveis
        const productIds = produtosRaw.map((p: any) => p.id).filter(Boolean);
        let dbProductsMap: Record<string, any> = {};
        if (productIds.length > 0) {
          const { data: dbProducts } = await supabase
            .from('produtos')
            .select('id, resumo, brindes_vinculados')
            .in('id', productIds);
          if (dbProducts) {
            dbProductsMap = Object.fromEntries(dbProducts.map(p => [p.id, p]));
          }
        }

        produtos = produtosRaw
          .filter((p: any) => Object.keys(selectedMap).length === 0 || (selectedMap[p.id] && selectedMap[p.id] > 0))
          .map((p: any) => {
            const dbProduct = dbProductsMap[p.id];
            return {
              id: p.id,
              nome: p.nome || 'Produto',
              preco: parseFloat(p.valor || p.preco || 0),
              quantidade: selectedMap[p.id] || p.quantidade || 1,
              permite_multiplas_unidades: p.permite_multiplas_unidades,
              resumo: dbProduct?.resumo || p.resumo || '',
              brindes_vinculados: dbProduct?.brindes_vinculados || p.brindes_vinculados || [],
            };
          });

      } else if (isProdutoIdFormat) {
        // ✅ Formato B: {produto_id, quantidade} — busca nomes no banco
        const produtoIds = produtosRaw.map((p: any) => p.produto_id).filter(Boolean);
        if (produtoIds.length > 0) {
          const { data: produtosData } = await supabase
            .from('produtos')
            .select('id, nome, valor, permite_multiplas_unidades, resumo, brindes_vinculados')
            .in('id', produtoIds);

          if (produtosData) {
            // Monta mapa id→dados para lookups O(1)
            const produtoMap = Object.fromEntries(produtosData.map((p) => [p.id, p]));
            produtos = produtosRaw
              .filter((p: any) => produtoMap[p.produto_id]) // ignora IDs não encontrados
              .map((p: any) => {
                const dbProduto = produtoMap[p.produto_id];
                return {
                  id: dbProduto.id,
                  nome: dbProduto.nome,
                  preco: parseFloat(dbProduto.valor || 0),
                  quantidade: p.quantidade || 1,
                  permite_multiplas_unidades: dbProduto.permite_multiplas_unidades,
                  resumo: dbProduto.resumo || '',
                  brindes_vinculados: dbProduto.brindes_vinculados || [],
                };
              });
          }
        }

      } else {
        // ✅ Formato C: legado selectedProdutos map { id: qty }

        if (Object.keys(selectedMap).length > 0) {
          const produtoIds = Object.keys(selectedMap);
          const { data: produtosData } = await supabase
            .from('produtos')
            .select('id, nome, valor, resumo, brindes_vinculados')
            .in('id', produtoIds);

          if (produtosData) {
            produtos = produtosData.map((p: any) => ({
              id: p.id,
              nome: p.nome,
              preco: parseFloat(p.valor || 0),
              quantidade: typeof selectedMap[p.id] === 'number' ? selectedMap[p.id] : 1,
              resumo: p.resumo || '',
              brindes_vinculados: p.brindes_vinculados || [],
            }));
          }
        }
      }


      if (selectedFormaPagamento) {
        const { data: formaPagamentoData } = await supabase
          .from('formas_pagamento')
          .select('nome, acrescimo')
          .eq('id', selectedFormaPagamento)
          .maybeSingle();

        if (formaPagamentoData) {
          formaPagamentoNome = formaPagamentoData.nome;
        }
      }

      const orcamentoTotal = typeof lead.valor_total === 'number' 
        ? lead.valor_total 
        : (typeof lead.valor_total === 'string' 
          ? parseFloat(lead.valor_total) 
          : (priceBreakdown.total || 0));

      const leadData = {
        nome_cliente: lead.nome_cliente,
        email: lead.email_cliente || lead.email,
        telefone: lead.telefone_cliente || lead.telefone,
        tipo_evento: lead.tipo_evento || null,
        data_evento: lead.data_evento || null,
        cidade: cityName,
        cidade_evento: cityName,
        subtotal: priceBreakdown.subtotal || 0,
        orcamento_total: orcamentoTotal,
        valor_total: orcamentoTotal,
        produtos: produtos,
        servicos: [],
        desconto_cupom: priceBreakdown.descontoCupom || 0,
        acrescimo_pagamento: priceBreakdown.acrescimoFormaPagamento || 0,
        ajuste_sazonal: priceBreakdown.ajusteSazonal || 0,
        ajuste_geografico: priceBreakdown.ajusteGeografico?.percentual || 0,
        forma_pagamento: formaPagamentoNome,
        forma_pagamento_detalhes: formaPagamentoCompleta || null,
        ocultar_valores_intermediarios: ocultarValoresIntermediarios,
        // Plano de pagamento final definido pelo usuário no ConvertLeadModal (se já existir)
        plano_pagamento: planoPagamentoDoCaixa || orcamentoDetalhe.plano_pagamento || null,
        upsell_produtos: upsellProdutos,
        valor_base: valorBase,
        valor_upsell: valorUpsell,
      };

      console.log('=== CONTRACT GENERATOR - LEAD DATA SALVO ===');
      console.log('leadData que será salvo:', JSON.stringify(leadData, null, 2));
      console.log('=== VALORES EXTRAÍDOS ===');
      console.log('data_evento:', lead.data_evento);
      console.log('cidade_evento:', lead.cidade_evento || lead.cidade);
      console.log('valor_total do lead:', lead.valor_total);
      console.log('orcamento_total calculado:', orcamentoTotal); // Corrigido: subtotal não estava definido
      console.log('subtotal:', priceBreakdown.subtotal);
      console.log('tipo_evento:', lead.tipo_evento);

      const userData = {
        business_name: businessSettings.business_name,
        person_type: businessSettings.person_type,
        cpf: businessSettings.cpf,
        cnpj: businessSettings.cnpj,
        email: businessSettings.email,
        phone: businessSettings.phone,
        address: businessSettings.address,
        city: businessSettings.city,
        state: businessSettings.state,
        zip_code: businessSettings.zip_code,
        pix_key: businessSettings.pix_key,
        bank_name: businessSettings.bank_name,
        bank_agency: businessSettings.bank_agency,
        bank_account: businessSettings.bank_account,
        bank_account_type: businessSettings.bank_account_type,
      };

      const { data, error } = await supabase
        .from('contracts')
        .insert({
          template_id: selectedTemplateId,
          content_override: contractContent, // 🔥 Salva o conteúdo personalizado
          lead_id: lead.id,
          user_id: userId,
          lead_data_json: leadData,
          user_data_json: userData,
          payment_details_json: formaPagamentoCompleta || null, // 🔥 Salva em uma coluna dedicada
          user_signature_base64: businessSettings.signature_base64,
          status: 'pending', // Status inicial do contrato
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Adicionar notificação de contrato gerado
      try {
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'info',
          title: 'Contrato Gerado',
          message: `Contrato gerado para ${leadData.nome_cliente}. Aguardando assinatura.`,
          link: '/dashboard/contratos',
          related_id: data.id,
        });
      } catch (notificationError) {
        console.error('Falha ao criar notificação de contrato gerado:', notificationError);
      }

      const contractLink = `${window.location.origin}/contrato/${data.token}`;
      setGeneratedLink(contractLink);
      setGeneratedLeadData(leadData);

      // ── Marca o lead como convertido automaticamente ao gerar o contrato ──
      try {
        const { data: updatedLead } = await supabase
          .from('leads')
          .update({ status: 'convertido' })
          .eq('id', lead.id)
          .neq('status', 'convertido')
          .select()
          .maybeSingle();

        if (updatedLead && lead.data_evento) {
           // A inserção na agenda agora é feita no modal financeiro (ConvertLeadModal)
        }
      } catch (statusError) {
        console.warn('[ContractGenerator] Não foi possível marcar lead como convertido:', statusError);
      }
    } catch (error) {
      console.error('Erro ao gerar contrato:', error);
      alert('Erro ao gerar contrato');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const sendViaWhatsApp = () => {
    if (!generatedLink) return;

    let message = '';
    const clientName = generatedLeadData?.nome_cliente || lead.nome_cliente || 'Cliente';
    const totalVal = typeof generatedLeadData?.valor_total === 'number'
      ? generatedLeadData.valor_total
      : (typeof lead.valor_total === 'number' ? lead.valor_total : parseFloat(lead.valor_total || '0'));

    if (shareMode === 'completo') {
      message = `Olá ${clientName}! 📄\n\n`;
      message += `Seu orçamento detalhado e contrato digital estão prontos para assinatura.\n\n`;
      message += `*Detalhes do Orçamento:*\n`;
      if (generatedLeadData?.produtos && generatedLeadData.produtos.length > 0) {
        message += generatedLeadData.produtos.map((p: any) => `- ${p.nome}: R$ ${p.preco.toFixed(2)}${p.permite_multiplas_unidades !== false ? ` x ${p.quantidade}` : ''}`).join('\n') + '\n';
      } else {
        message += 'Nenhum produto selecionado.\n';
      }
      if (generatedLeadData?.servicos && generatedLeadData.servicos.length > 0) {
        message += generatedLeadData.servicos.map((s: any) => `- ${s.nome}: R$ ${s.preco.toFixed(2)}`).join('\n') + '\n';
      }
      if (generatedLeadData?.desconto_cupom > 0) {
        message += `Desconto: R$ ${generatedLeadData.desconto_cupom.toFixed(2)}\n`;
      }
      if (generatedLeadData?.acrescimo_pagamento > 0) {
        message += `Acréscimo: R$ ${generatedLeadData.acrescimo_pagamento.toFixed(2)}\n`;
      }
      if (generatedLeadData?.upsell_produtos && generatedLeadData.upsell_produtos.length > 0) {
        message += `\n*Adicionais Contratados (Upsell):*\n`;
        message += generatedLeadData.upsell_produtos.map((p: any) => {
          const val = parseFloat(p.valor || p.preco || 0);
          const desc = p.desconto_percentual ? (1 - p.desconto_percentual / 100) : 1;
          const finalVal = val * desc;
          return `- ${p.nome || p.nome_produto}: R$ ${finalVal.toFixed(2)}${p.quantidade > 1 ? ` x ${p.quantidade}` : ''}`;
        }).join('\n') + '\n';
      }
      message += `*Valor Total: R$ ${totalVal.toFixed(2)}*\n\n`;
      message += `Acesse o link abaixo para revisar e assinar:\n${generatedLink}\n\n`;
      message += `Este link expira em ${expirationDays} dias.\n\n`;
      message += `Qualquer dúvida, estou à disposição!`;
    } else if (shareMode === 'simplificado') {
      message = `Olá ${clientName}! 📄\n\n`;
      message += `Seu contrato digital e proposta estão prontos.\n\n`;
      message += `*Valor Total: R$ ${totalVal.toFixed(2)}*\n\n`;
      message += `Acesse o link abaixo para revisar os detalhes e assinar:\n${generatedLink}\n\n`;
      message += `Este link expira em ${expirationDays} dias.`;
    } else {
      // so-link
      message = `Olá ${clientName}! Segue o link para assinatura do seu contrato:\n${generatedLink}`;
    }

    const phone = (lead.telefone_cliente || lead.telefone || '').replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
    
    const newWindow = window.open(whatsappUrl, '_blank');
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      setFallbackUrl(whatsappUrl);
      setShowSafariFallback(true);
    }
  };

  const sendViaEmail = async () => {
    if (!generatedLink) return;

    const subject = 'Seu Contrato Digital Está Pronto';
    const clientName = generatedLeadData?.nome_cliente || lead.nome_cliente || 'Cliente';
    const body = `Olá ${clientName},

Seu contrato digital está pronto para assinatura.

Acesse o link abaixo para revisar e assinar:
${generatedLink}

Este link expira em ${expirationDays} dias.

Atenciosamente`;

    const mailtoUrl = `mailto:${lead.email_cliente || lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const newWindow = window.open(mailtoUrl);
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      setFallbackUrl(mailtoUrl);
      setShowSafariFallback(true);
    }
  };

  if (generatedLink) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 relative">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Contrato Gerado!</h2>
                <p className="text-gray-600">Link de assinatura criado com sucesso</p>
              </div>
            </div>
            <button onClick={() => { onSuccess(); onClose(); }} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Link de Assinatura
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={generatedLink}
                  readOnly
                  className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm"
                />
                <button
                  onClick={copyLink}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>

            {/* Sharing Mode Selector */}
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">Escolha o formato da mensagem:</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'completo', label: 'Completo', desc: 'Produtos, valores e link' },
                  { id: 'simplificado', label: 'Simplificado', desc: 'Apenas total e link' },
                  { id: 'so-link', label: 'Só o Link', desc: 'Apenas a URL do contrato' }
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setShareMode(mode.id as any)}
                    className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all ${
                      shareMode === mode.id
                        ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <span className={`text-xs font-bold ${shareMode === mode.id ? 'text-blue-700' : 'text-gray-700'}`}>
                      {mode.label}
                    </span>
                    <span className="text-[10px] text-gray-500 mt-1 leading-tight">{mode.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Enviar para o cliente:</p>
              <div className="flex gap-3">
                <button
                  onClick={sendViaWhatsApp}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Enviar via WhatsApp
                </button>
                <button
                  onClick={sendViaEmail}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Enviar via Email
                </button>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                Este link expira em {expirationDays} dias. Após este período, será necessário gerar um novo contrato.
              </p>
            </div>
          </div>
        </div>

        {/* Safari / Mobile popup blocker fallback modal */}
        {showSafariFallback && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center gap-3 text-yellow-600">
                <AlertCircle className="w-6 h-6 shrink-0" />
                <h3 className="font-bold text-lg text-gray-900">Bloqueador de Popups Ativo</h3>
              </div>
              <p className="text-sm text-gray-600">
                Seu navegador (comum no Safari do iPhone) bloqueou a abertura automática do aplicativo. 
                Por favor, clique no botão abaixo para abrir diretamente.
              </p>
              <div className="flex flex-col gap-2">
                <a
                  href={fallbackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowSafariFallback(false)}
                  className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-center flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Abrir WhatsApp / Email
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(fallbackUrl.includes('wa.me') ? generatedLink || '' : fallbackUrl);
                    alert('Link copiado!');
                  }}
                  className="w-full px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-center"
                >
                  Copiar Link
                </button>
                <button
                  onClick={() => setShowSafariFallback(false)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium text-center"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FileSignature className="w-8 h-8 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Gerar Contrato</h2>
              <p className="text-gray-600">Cliente: {lead.nome_cliente}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {templates.length === 0 ? (
          <div className="text-center py-8 p-6">
            <FileSignature className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Você ainda não tem contratos cadastrados.</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Criar Contrato Primeiro
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Indicador de uso */}
            {!planLimits.loading && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileSignature className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    {planLimits.isPremium ? (
                      <>{planLimits.contractsSignedUsed} contratos enviados</>
                    ) : (
                      <>{planLimits.contractsSignedUsed} de {planLimits.contractsSignedLimit} contratos enviados</>
                    )}
                  </span>
                </div>
                {!planLimits.isPremium && (
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        planLimits.contractsSignedUsed >= planLimits.contractsSignedLimit
                          ? 'bg-red-500'
                          : planLimits.contractsSignedUsed >= planLimits.contractsSignedLimit * 0.8
                          ? 'bg-yellow-500'
                          : 'bg-blue-600'
                      }`}
                      style={{ width: `${Math.min((planLimits.contractsSignedUsed / planLimits.contractsSignedLimit) * 100, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Alerta quando próximo do limite */}
            {!planLimits.isPremium && planLimits.contractsSignedUsed >= planLimits.contractsSignedLimit - 2 && planLimits.contractsSignedUsed < planLimits.contractsSignedLimit && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-yellow-900 mb-1">
                      Você está próximo do limite
                    </h3>
                    <p className="text-sm text-yellow-800">
                      Restam apenas {planLimits.contractsSignedLimit - planLimits.contractsSignedUsed} contrato(s) disponível(is). Faça upgrade para contratos ilimitados.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecione o Contrato
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Validade do Link (dias)
              </label>
              <input
                type="number"
                value={expirationDays}
                onChange={(e) => setExpirationDays(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                max="30"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                O link expirará automaticamente após este período
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Dados que serão incluídos:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Nome: {lead.nome_cliente}</li>
                <li>• Email: {lead.email_cliente || lead.email}</li>
                <li>• Telefone: {lead.telefone_cliente || lead.telefone}</li>
                {lead.data_evento && <li>• Data do Evento: {lead.data_evento}</li>}
                {lead.cidade && <li>• Cidade: {lead.cidade}</li>}
                {lead.orcamento_total && (
                  <li>
                    • Valor: R$ {lead.orcamento_total.toFixed(2)}
                    {valorUpsell > 0 && ` (Base: R$ ${valorBase.toFixed(2)} + Adicionais: R$ ${valorUpsell.toFixed(2)})`}
                  </li>
                )}
                {upsellProdutos.length > 0 && (
                  <li>• Adicionais (Upsell): {upsellProdutos.map((p: any) => p.nome).join(', ')}</li>
                )}
              </ul>
            </div>

            {/* 🔥 Botão para entrar no modo de edição */}
            {!isEditing && (
              <div className="text-center my-4">
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center justify-center gap-2 mx-auto text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  <Edit3 className="w-4 h-4" />
                  Fazer ajustes pontuais no texto do contrato
                </button>
              </div>
            )}

            {/* 🔥 Editor de texto que aparece no modo de edição */}
            {isEditing && (
              <div className="my-6 p-4 border rounded-lg bg-gray-50">
                <h4 className="font-semibold text-gray-800 mb-2">Editor de Contrato</h4>
                <ReactQuill
                  theme="snow"
                  value={contractContent}
                  onChange={setContractContent}
                  className="bg-white"
                  placeholder="Edite o conteúdo do contrato aqui..."
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                  >
                    <Save className="w-4 h-4" />
                    Confirmar Edição
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-6 border-t">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading || !selectedTemplateId || !planLimits.canGenerateContract}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                title={!planLimits.canGenerateContract ? 'Limite de contratos atingido' : ''}
              >
                {loading ? (
                  <>Gerando...</>
                ) : (
                  <>
                    <FileSignature className="w-5 h-5" />
                    Gerar Contrato
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Upgrade */}
      {showUpgradeModal && (
        <UpgradeLimitModal
          type="templates"
          currentLimit={planLimits.contractsSignedLimit}
          premiumLimit="Ilimitado"
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </div>
  );
}
