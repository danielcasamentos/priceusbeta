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
  const planLimits = usePlanLimits();

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
      const selectedProdutos = orcamentoDetalhe.selecoes?.produtos || orcamentoDetalhe.selectedProdutos || {};
      const selectedFormaPagamento = orcamentoDetalhe.selecoes?.paymentMethod || orcamentoDetalhe.selectedFormaPagamento;
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
      const priceBreakdown = orcamentoDetalhe.priceBreakdown || {};
      

      if (Object.keys(selectedProdutos).length > 0) {
        const produtoIds = Object.keys(selectedProdutos);
        const { data: produtosData } = await supabase
          .from('produtos')
          .select('id, nome, valor')
          .in('id', produtoIds); // Corrigido para buscar da tabela 'produtos'

        if (produtosData) {
          produtos = produtosData.map((p: any) => ({
            nome: p.nome,
            preco: parseFloat(p.valor || 0),
            quantidade: typeof selectedProdutos[p.id] === 'number' ? selectedProdutos[p.id] : 1,
          }));
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
        servicos: [], // Mantido para compatibilidade, mas produtos agora é a fonte principal
        desconto_cupom: priceBreakdown.descontoCupom || 0,
        acrescimo_pagamento: priceBreakdown.acrescimoFormaPagamento || 0,
        ajuste_sazonal: priceBreakdown.ajusteSazonal || 0,
        ajuste_geografico: priceBreakdown.ajusteGeografico?.percentual || 0,
        forma_pagamento: formaPagamentoNome,
        forma_pagamento_detalhes: formaPagamentoCompleta || null, // Salva o objeto completo
        ocultar_valores_intermediarios: ocultarValoresIntermediarios,
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
          type: 'contract_generated',
          message: `Contrato gerado para ${leadData.nome_cliente}. Aguardando assinatura.`,
          link: '/dashboard?page=contratos',
          related_id: data.id,
        });
      } catch (notificationError) {
        console.error('Falha ao criar notificação de contrato gerado:', notificationError);
      }

      const contractLink = `${window.location.origin}/contrato/${data.token}`;
      setGeneratedLink(contractLink);
      setGeneratedLeadData(leadData); // Store the generated lead data
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

    const message = `Olá ${generatedLeadData.nome_cliente}! 📄

Seu orçamento detalhado e contrato digital estão prontos para assinatura.

*Detalhes do Orçamento:*
${generatedLeadData.produtos && generatedLeadData.produtos.length > 0 ?
      generatedLeadData.produtos.map((p: any) => `- ${p.nome}: R$ ${p.preco.toFixed(2)} x ${p.quantidade}`).join('\n') :
      'Nenhum produto selecionado.'
    }
${generatedLeadData.servicos && generatedLeadData.servicos.length > 0 ?
      generatedLeadData.servicos.map((s: any) => `- ${s.nome}: R$ ${s.preco.toFixed(2)}`).join('\n') :
      ''
    }
${generatedLeadData.desconto_cupom > 0 ? `Desconto: R$ ${generatedLeadData.desconto_cupom.toFixed(2)}\n` : ''}
${generatedLeadData.acrescimo_pagamento > 0 ? `Acréscimo (${generatedLeadData.acrescimo_pagamento}%): R$ ${(generatedLeadData.valor_total - (generatedLeadData.valor_total / (1 + generatedLeadData.acrescimo_pagamento / 100))).toFixed(2)}\n` : ''}
*Valor Total: R$ ${generatedLeadData.valor_total.toFixed(2)}*

Acesse o link abaixo para revisar e assinar:
${generatedLink}

Este link expira em ${expirationDays} dias.

Qualquer dúvida, estou à disposição!`;

    const phone = (lead.telefone_cliente || lead.telefone || '').replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
    window.location.href = whatsappUrl;
  };

  const sendViaEmail = async () => {
    if (!generatedLink) return;

    const subject = 'Seu Contrato Digital Está Pronto';
    const body = `Olá ${lead.nome_cliente},

Seu contrato digital está pronto para assinatura.

Acesse o link abaixo para revisar e assinar:
${generatedLink}

Este link expira em ${expirationDays} dias.

Atenciosamente`;

    window.location.href = `mailto:${lead.email_cliente || lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  if (generatedLink) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
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
                {lead.orcamento_total && <li>• Valor: R$ {lead.orcamento_total.toFixed(2)}</li>}
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
