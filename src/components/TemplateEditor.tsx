import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, MessageSquare, DollarSign, MapPin, Ticket, BookOpen, Video, X, Link as LinkIcon, Check, Copy, Palette, BarChart3, Image, Send, Loader2 } from 'lucide-react';
import { generateSlug, validateSlugFormat, checkTemplateSlugAvailability } from '../lib/slugUtils';
import { ProductList } from './ProductList';
import { PaymentMethodEditor } from './PaymentMethodEditor';
import { WhatsAppTemplateEditor, DEFAULT_WHATSAPP_TEMPLATE } from './WhatsAppTemplateEditor';
import { SeasonalPricingManager } from './SeasonalPricingManager';
import { CouponsManager } from './CouponsManager';
import { TutorialGuide } from './TutorialGuide';
import { getVideoByTab } from '../config/videoTutorials';
import { YouTubeEmbed } from './YouTubeEmbed';
import { TemplateEditorWithThemeSelector } from './TemplateEditorWithThemeSelector';
import { QuoteAnalytics } from './QuoteAnalytics';

interface Produto {
  id?: string;
  nome: string;
  resumo: string;
  valor: number;
  unidade: string;
  obrigatorio: boolean;
  ordem: number;
  imagem_url?: string;
  mostrar_imagem: boolean;
  imagens?: string[];
  carrossel_automatico?: boolean;
}

interface FormaPagamento {
  id?: string;
  nome: string;
  entrada_tipo: 'percentual' | 'fixo';
  entrada_valor: number;
  max_parcelas: number;
  acrescimo: number;
}

interface CampoExtra {
  id?: string;
  label: string;
  tipo: string;
  placeholder: string;
  obrigatorio: boolean;
  ordem: number;
}

interface Template {
  id: string;
  user_id: string;
  nome_template: string;
  slug_template: string;
  texto_whatsapp: string;
  sistema_sazonal_ativo: boolean;
  sistema_geografico_ativo: boolean;
  bloquear_campos_obrigatorios: boolean;
  layout_produtos_desktop: 'linha' | 'quadro';
  tamanho_imagem_grid: 'pequeno' | 'medio' | 'grande';
  texto_botao_envio: string;
  ocultar_valores_intermediarios: boolean;
  forma_pagamento_obrigatoria: boolean;
  exibir_no_perfil: boolean;
  ignorar_agenda_global?: boolean;
  exibir_painel_flutuante?: boolean;
  descricao_perfil?: string;
  ocultar_data_criacao?: boolean;
}

interface TemplateEditorProps {
  templateId: string;
  onBack: () => void;
}

export function TemplateEditor({ templateId, onBack }: TemplateEditorProps) {
  const [activeTab, setActiveTab] = useState<'produtos' | 'pagamentos' | 'cupons' | 'campos' | 'whatsapp' | 'precos' | 'aparencia' | 'analytics' | 'config'>('produtos');
  const [template, setTemplate] = useState<Template | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
  const [camposExtras, setCamposExtras] = useState<CampoExtra[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const [showTutorial, setShowTutorial] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [slugInput, setSlugInput] = useState('');
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [userSlug, setUserSlug] = useState('');
  const [configSaveStatus, setConfigSaveStatus] = useState<{
    saving: boolean;
    message: string | null;
    type: 'success' | 'error' | 'info' | null;
  }>({ saving: false, message: null, type: null });
  const [copiedLink, setCopiedLink] = useState(false);

  // ── Estados locais para campos de texto livre (sem salvar a cada tecla) ──
  const [localTextoBtn, setLocalTextoBtn] = useState('');
  const [localDescricao, setLocalDescricao] = useState('');
  const [textoBtnSaveStatus, setTextoBtnSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [descricaoSaveStatus, setDescricaoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    loadTemplateData();
    getUserId();
  }, [templateId]);

  // Sincronizar estados locais quando o template carrega
  useEffect(() => {
    if (template) {
      setLocalTextoBtn(template.texto_botao_envio || '');
      setLocalDescricao(template.descricao_perfil || '');
    }
  }, [template?.id]);

  const getUserId = async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) setUserId(data.user.id);
  };

  const loadTemplateData = async () => {
    setLoading(true);
    try {
      const { data: templateData } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .single();

      const { data: produtosData } = await supabase
        .from('produtos')
        .select('*')
        .eq('template_id', templateId)
        .order('ordem');

      const { data: pagamentosData } = await supabase
        .from('formas_pagamento')
        .select('*')
        .eq('template_id', templateId);

      const { data: camposData } = await supabase
        .from('campos')
        .select('*')
        .eq('template_id', templateId)
        .order('ordem');

      setTemplate(templateData);
      setProdutos(produtosData || []);
      setFormasPagamento(pagamentosData || []);
      setCamposExtras(camposData || []);
      setSlugInput(templateData?.slug_template || '');

      const { data: profileData } = await supabase
        .from('profiles')
        .select('slug_usuario')
        .eq('id', templateData?.user_id)
        .maybeSingle();

      if (profileData?.slug_usuario) {
        setUserSlug(profileData.slug_usuario);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const reloadProducts = async () => {
    try {
      const scrollPosition = window.scrollY;

      const { data: produtosData } = await supabase
        .from('produtos')
        .select('*')
        .eq('template_id', templateId)
        .order('ordem');

      if (produtosData) {
        setProdutos(produtosData);

        setTimeout(() => {
          window.scrollTo({ top: scrollPosition, behavior: 'auto' });
        }, 50);
      }
    } catch (error) {
      console.error('❌ Erro ao recarregar produtos:', error);
    }
  };

  const calculateTotalValue = () => {
    return produtos.reduce((sum, p) => sum + p.valor, 0);
  };

  // PRODUTOS
  const handleAddProduto = () => {
    setProdutos([
      ...produtos,
      {
        nome: '',
        resumo: '',
        valor: 0,
        unidade: 'unidade',
        obrigatorio: false,
        ordem: produtos.length,
        mostrar_imagem: true,
        imagens: [],
        carrossel_automatico: false,
      },
    ]);
  };

  const handleUpdateProduto = (index: number, field: keyof Produto, value: any) => {
    const newProdutos = [...produtos];
    newProdutos[index] = { ...newProdutos[index], [field]: value };
    setProdutos(newProdutos);
  };

  const handleProductSaved = (index: number, productId: string) => {
    const newProdutos = [...produtos];
    newProdutos[index] = { ...newProdutos[index], id: productId };
    setProdutos(newProdutos);
  };

  const handleRemoveProduto = async (index: number) => {
    const produto = produtos[index];
    if (produto.id) {
      await supabase.from('produtos').delete().eq('id', produto.id);
    }
    setProdutos(produtos.filter((_, i) => i !== index));
  };

  const handleDuplicateProduto = (index: number) => {
    const produtoOriginal = produtos[index];
    const novoProduto: Produto = {
      nome: `${produtoOriginal.nome} (Cópia)`,
      resumo: produtoOriginal.resumo,
      valor: produtoOriginal.valor,
      unidade: produtoOriginal.unidade,
      obrigatorio: produtoOriginal.obrigatorio,
      ordem: index + 1,
      imagem_url: produtoOriginal.imagem_url,
      mostrar_imagem: produtoOriginal.mostrar_imagem,
      imagens: produtoOriginal.imagens || [],
      carrossel_automatico: produtoOriginal.carrossel_automatico || false,
    };

    const novosProdutos = [...produtos];
    novosProdutos.splice(index + 1, 0, novoProduto);

    const produtosReordenados = novosProdutos.map((p, i) => ({
      ...p,
      ordem: i,
    }));

    setProdutos(produtosReordenados);
  };

  const handleSaveProdutos = async () => {
    try {
      for (const produto of produtos) {
        const produtoData = {
          template_id: templateId,
          nome: produto.nome,
          resumo: produto.resumo,
          valor: produto.valor,
          unidade: produto.unidade,
          obrigatorio: produto.obrigatorio,
          ordem: produto.ordem,
          imagem_url: produto.imagem_url,
          mostrar_imagem: produto.mostrar_imagem,
          imagens: produto.imagens || [],
          carrossel_automatico: produto.carrossel_automatico || false,
        };

        if (produto.id) {
          await supabase.from('produtos').update(produtoData).eq('id', produto.id);
        } else {
          await supabase.from('produtos').insert(produtoData);
        }
      }
      alert('✅ Produtos salvos com sucesso!');
      loadTemplateData();
    } catch (error) {
      console.error('Erro ao salvar produtos:', error);
      alert('❌ Erro ao salvar produtos');
    }
  };

  // FORMAS DE PAGAMENTO
  const handleAddFormaPagamento = () => {
    setFormasPagamento([
      ...formasPagamento,
      {
        nome: '',
        entrada_tipo: 'fixo',
        entrada_valor: 0,
        max_parcelas: 1,
        acrescimo: 0,
      },
    ]);
  };

  const handleUpdateFormaPagamento = (index: number, field: keyof FormaPagamento, value: any) => {
    const newFormas = [...formasPagamento];
    newFormas[index] = { ...newFormas[index], [field]: value };
    setFormasPagamento(newFormas);
  };

  const handleRemoveFormaPagamento = async (index: number) => {
    const forma = formasPagamento[index];
    if (forma.id) {
      await supabase.from('formas_pagamento').delete().eq('id', forma.id);
    }
    setFormasPagamento(formasPagamento.filter((_, i) => i !== index));
  };

  const handleSaveFormasPagamento = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      for (const forma of formasPagamento) {
        const formaData = {
          template_id: templateId,
          user_id: userData.user.id,
          nome: forma.nome,
          entrada_tipo: forma.entrada_tipo,
          entrada_valor: forma.entrada_valor,
          max_parcelas: forma.max_parcelas,
          acrescimo: forma.acrescimo,
        };

        if (forma.id) {
          await supabase.from('formas_pagamento').update(formaData).eq('id', forma.id);
        } else {
          await supabase.from('formas_pagamento').insert(formaData);
        }
      }
      alert('✅ Formas de pagamento salvas com sucesso!');
      loadTemplateData();
    } catch (error) {
      console.error('Erro ao salvar formas de pagamento:', error);
      alert('❌ Erro ao salvar formas de pagamento');
    }
  };

  // CAMPOS EXTRAS
  const handleAddCampoExtra = () => {
    setCamposExtras([
      ...camposExtras,
      {
        label: '',
        tipo: 'text',
        placeholder: '',
        obrigatorio: false,
        ordem: camposExtras.length,
      },
    ]);
  };

  const handleUpdateCampoExtra = (index: number, field: keyof CampoExtra, value: any) => {
    const newCampos = [...camposExtras];
    newCampos[index] = { ...newCampos[index], [field]: value };
    setCamposExtras(newCampos);
  };

  const handleRemoveCampoExtra = async (index: number) => {
    const campo = camposExtras[index];
    if (campo.id) {
      await supabase.from('campos').delete().eq('id', campo.id);
    }
    setCamposExtras(camposExtras.filter((_, i) => i !== index));
  };

  const handleSaveCamposExtras = async () => {
    try {
      // Validar que todos os campos têm label
      const camposSemLabel = camposExtras.filter(c => !c.label || c.label.trim() === '');
      if (camposSemLabel.length > 0) {
        alert('❌ Todos os campos precisam ter um rótulo');
        return;
      }

      for (const campo of camposExtras) {
        // Gerar nome_campo baseado no label
        const nomeCampo = campo.label
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remove acentos
          .replace(/[^a-z0-9]/g, '_') // Substitui não-alfanuméricos por _
          .replace(/_+/g, '_') // Remove _ duplicados
          .replace(/^_|_$/g, ''); // Remove _ do início/fim

        const campoData = {
          template_id: templateId,
          nome_campo: nomeCampo,
          label: campo.label,
          tipo: campo.tipo,
          placeholder: campo.placeholder || '',
          obrigatorio: campo.obrigatorio || false,
          ordem: campo.ordem,
        };

        if (campo.id) {
          const { error } = await supabase.from('campos').update(campoData).eq('id', campo.id);
          if (error) {
            console.error('Erro ao atualizar campo:', error);
            alert(`❌ Erro ao atualizar campo: ${error.message}`);
            return;
          }
        } else {
          const { error } = await supabase.from('campos').insert(campoData);
          if (error) {
            console.error('Erro ao inserir campo:', error);
            alert(`❌ Erro ao inserir campo: ${error.message}`);
            return;
          }
        }
      }
      alert('✅ Campos extras salvos com sucesso!');
      loadTemplateData();
    } catch (error) {
      console.error('Erro ao salvar campos extras:', error);
      alert('❌ Erro ao salvar campos extras');
    }
  };

  const handleUpdateTemplateConfig = async (field: string, value: any) => {
    setConfigSaveStatus({ saving: true, message: 'Salvando...', type: 'info' });
    try {
      const { error } = await supabase
        .from('templates')
        .update({ [field]: value })
        .eq('id', templateId);

      if (error) throw error;

      setTemplate({ ...template, [field]: value });
      setConfigSaveStatus({
        saving: false,
        message: 'Salvo com sucesso!',
        type: 'success',
      });
    } catch (error) {
      console.error('Erro ao atualizar configuração:', error);
      setConfigSaveStatus({
        saving: false,
        message: 'Erro ao salvar',
        type: 'error',
      });
    }

    setTimeout(() => setConfigSaveStatus({ saving: false, message: null, type: null }), 3000);
  };

  const handleSaveWhatsAppTemplate = async () => {
    await handleUpdateTemplateConfig('texto_whatsapp', template?.texto_whatsapp || DEFAULT_WHATSAPP_TEMPLATE);
  };

  const handleToggleSistemaSazonal = async (ativo: boolean) => {
    await handleUpdateTemplateConfig('sistema_sazonal_ativo', ativo);
  };

  const handleToggleSistemaGeografico = async (ativo: boolean) => {
    await handleUpdateTemplateConfig('sistema_geografico_ativo', ativo);
  };

  const handleToggleBloquearCampos = async (ativo: boolean) => {
    await handleUpdateTemplateConfig('bloquear_campos_obrigatorios', ativo);
  };

  const handleSlugChange = async (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlugInput(sanitized);
    setSlugAvailable(null);

    if (sanitized.length < 3) return;

    setCheckingSlug(true);
    const available = await checkTemplateSlugAvailability(sanitized, userId, templateId);
    setSlugAvailable(available);
    setCheckingSlug(false);
  };

  const handleGenerateSlug = async () => {
    if (!template?.nome_template) {
      alert('Nome do template não encontrado');
      return;
    }
    const slug = generateSlug(template.nome_template);
    handleSlugChange(slug);
  };

  const handleSaveSlug = async () => {
    if (!slugInput || !validateSlugFormat(slugInput)) {
      alert('Slug inválido! Use apenas letras minúsculas, números e hífens.');
      return;
    }

    if (slugAvailable === false) {
      alert('Este slug já está em uso!');
      return;
    }

    await handleUpdateTemplateConfig('slug_template', slugInput);
  };

  const handleCopyPublicLink = async () => {
    if (!userSlug || !slugInput) {
      alert('Configure o username no perfil e o slug do orçamento primeiro');
      return;
    }

    const publicUrl = `https://priceus.com.br/${userSlug}/${slugInput}`;
    await navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'produtos', label: 'Produtos/Serviços', icon: null },
    { id: 'pagamentos', label: 'Formas de Pagamento', icon: DollarSign },
    { id: 'cupons', label: 'Cupons', icon: Ticket },
    { id: 'campos', label: 'Campos Extras', icon: null },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { id: 'precos', label: 'Preços', icon: MapPin },
    { id: 'aparencia', label: 'Aparência', icon: Palette },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'config', label: 'Configurações', icon: null },
  ];

  const currentVideo = getVideoByTab(activeTab);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <button
            onClick={onBack}
            className="flex-shrink-0 mt-1 flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{template?.nome_template}</h2>
            <p className="text-gray-600">Configure todos os aspectos do seu template</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {currentVideo && (
            <button
              onClick={() => setShowVideoModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors shadow-md text-sm"
            >
              <Video className="w-5 h-5" />
              Ver Tutorial em Vídeo
            </button>
          )}
          <button
            onClick={() => setShowTutorial(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-md text-sm"
          >
            <BookOpen className="w-5 h-5" />
            Tutorial Completo
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0a1628] rounded-lg shadow dark:shadow-none dark:border dark:border-[rgba(255,255,255,.08)]">
        <div className="border-b border-gray-200 dark:border-[rgba(255,255,255,.08)]">
          <nav className="flex gap-1 sm:gap-2 px-2 sm:px-6 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 sm:py-4 px-2 sm:px-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.icon && <tab.icon className="w-4 h-4" />}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'produtos' && (
            <ProductList
              products={produtos}
              onUpdate={handleUpdateProduto}
              onRemove={handleRemoveProduto}
              onDuplicate={handleDuplicateProduto}
              onAdd={handleAddProduto}
              onSave={handleSaveProdutos}
              userId={userId}
              templateId={templateId}
              onReloadProducts={reloadProducts}
              onProductSaved={handleProductSaved}
            />
          )}

          {activeTab === 'pagamentos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold dark:text-white">Formas de Pagamento</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Configure as opções de pagamento</p>
                </div>
                <button
                  onClick={handleAddFormaPagamento}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  <DollarSign className="w-4 h-4" />
                  Adicionar Forma
                </button>
              </div>

              {formasPagamento.map((forma, index) => (
                <PaymentMethodEditor
                  key={index}
                  paymentMethod={forma}
                  onChange={(field, value) => handleUpdateFormaPagamento(index, field, value)}
                  onRemove={() => handleRemoveFormaPagamento(index)}
                  totalValue={calculateTotalValue()}
                />
              ))}

              {formasPagamento.length === 0 && (
                <div className="text-center py-12 bg-gray-50 dark:bg-[#07101f] border-2 border-dashed border-gray-300 dark:border-[rgba(255,255,255,.08)] rounded-lg">
                  <DollarSign className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Nenhuma forma de pagamento
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Adicione formas de pagamento para seus clientes
                  </p>
                </div>
              )}

              {formasPagamento.length > 0 && (
                <button
                  onClick={handleSaveFormasPagamento}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 font-medium"
                >
                  Salvar Formas de Pagamento
                </button>
              )}
            </div>
          )}

          {activeTab === 'cupons' && (
            <CouponsManager templateId={templateId} />
          )}

          {activeTab === 'campos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold dark:text-white">Campos Extras do Formulário</h3>
                <button
                  onClick={handleAddCampoExtra}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Adicionar Campo
                </button>
              </div>

              {camposExtras.map((campo, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rótulo do Campo *
                      </label>
                      <input
                        type="text"
                        value={campo.label}
                        onChange={(e) => handleUpdateCampoExtra(index, 'label', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: Local do Evento"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo de Campo
                      </label>
                      <select
                        value={campo.tipo}
                        onChange={(e) => handleUpdateCampoExtra(index, 'tipo', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="text">Texto</option>
                        <option value="email">E-mail</option>
                        <option value="tel">Telefone</option>
                        <option value="date">Data</option>
                        <option value="number">Número</option>
                        <option value="textarea">Texto Longo</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Placeholder
                    </label>
                    <input
                      type="text"
                      value={campo.placeholder}
                      onChange={(e) => handleUpdateCampoExtra(index, 'placeholder', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={campo.obrigatorio}
                        onChange={(e) => handleUpdateCampoExtra(index, 'obrigatorio', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-700">Campo obrigatório</span>
                    </label>

                    <button
                      onClick={() => handleRemoveCampoExtra(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}

              {camposExtras.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Nenhum campo extra. Campos padrão: Nome, Email, Telefone.
                </div>
              )}

              <button
                onClick={handleSaveCamposExtras}
                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 font-medium"
              >
                Salvar Campos Extras
              </button>
            </div>
          )}

          {activeTab === 'whatsapp' && (
            <WhatsAppTemplateEditor
              value={template?.texto_whatsapp || DEFAULT_WHATSAPP_TEMPLATE}
              onChange={(value) => setTemplate({ ...template, texto_whatsapp: value })}
              onSave={handleSaveWhatsAppTemplate}
              camposExtras={camposExtras}
            />
          )}

          {activeTab === 'precos' && (
            <SeasonalPricingManager
              templateId={templateId}
              userId={userId}
              sistemaGeograficoAtivo={template?.sistema_geografico_ativo ?? false}
              sistemaSazonalAtivo={template?.sistema_sazonal_ativo ?? false}
              onToggleSistemaGeografico={handleToggleSistemaGeografico}
              onToggleSistemaSazonal={handleToggleSistemaSazonal}
            />
          )}

          {activeTab === 'aparencia' && (
            <TemplateEditorWithThemeSelector templateId={templateId} />
          )}

          {activeTab === 'analytics' && (
            <QuoteAnalytics templateId={templateId} />
          )}

          {activeTab === 'config' && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-4">
                <h3 className="text-lg font-semibold dark:text-white">Configurações do Template</h3>
                {configSaveStatus.message && (
                  <div
                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-opacity ${
                      configSaveStatus.type === 'success'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                        : configSaveStatus.type === 'error'
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                    }`}
                  >
                    {configSaveStatus.saving && (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    )}
                    {configSaveStatus.message}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="border border-gray-200 dark:border-[rgba(255,255,255,.08)] bg-white dark:bg-[#07101f] rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 dark:text-gray-400"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                    Apresentação no Perfil Público (Vitrine)
                  </h4>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Descrição do Pacote
                  </label>
                  <textarea
                    value={localDescricao}
                    onChange={(e) => {
                      if (e.target.value.length <= 150) setLocalDescricao(e.target.value);
                    }}
                    onBlur={async () => {
                      if (localDescricao === (template?.descricao_perfil || '')) return;
                      setDescricaoSaveStatus('saving');
                      try {
                        await handleUpdateTemplateConfig('descricao_perfil', localDescricao);
                        setDescricaoSaveStatus('saved');
                      } catch {
                        setDescricaoSaveStatus('error');
                      }
                      setTimeout(() => setDescricaoSaveStatus('idle'), 2500);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-[rgba(255,255,255,.08)] bg-white dark:bg-[#0a1628] text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 dark:placeholder:text-gray-600"
                    placeholder="Ex: Cobertura completa para casamentos intimistas com mini álbum incluso..."
                    rows={2}
                  />
                  <div className="flex justify-between items-center mt-1">
                     <p className="text-xs text-gray-500">Exibido nos cartões do seu portfólio (priceus.com.br/usuário)</p>
                     <div className="flex items-center gap-2">
                       {descricaoSaveStatus === 'saving' && <span className="text-xs text-blue-500 animate-pulse">Salvando...</span>}
                       {descricaoSaveStatus === 'saved' && <span className="text-xs text-green-600 font-medium">✓ Salvo</span>}
                       {descricaoSaveStatus === 'error' && <span className="text-xs text-red-500">✗ Erro ao salvar</span>}
                       <p className="text-xs text-gray-500">{localDescricao.length}/150</p>
                     </div>
                  </div>

                  {/* Toggle ocultar data */}
                  <label className="flex items-center gap-3 mt-3 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={template?.ocultar_data_criacao || false}
                        onChange={(e) => handleUpdateTemplateConfig('ocultar_data_criacao', e.target.checked)}
                      />
                      <div className={`w-10 h-6 rounded-full transition-colors ${
                        template?.ocultar_data_criacao ? 'bg-blue-600' : 'bg-gray-300'
                      }`}></div>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        template?.ocultar_data_criacao ? 'translate-x-5' : 'translate-x-1'
                      }`}></div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Ocultar data de criação</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Quando ativado, a data do orçamento não aparece no seu perfil público</p>
                    </div>
                  </label>
                </div>
                <div className="border border-blue-200 dark:border-blue-900/30 bg-blue-50 dark:bg-blue-900/10 rounded-lg p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={template?.bloquear_campos_obrigatorios || false}
                      onChange={(e) =>
                        handleUpdateTemplateConfig('bloquear_campos_obrigatorios', e.target.checked)
                      }
                      className="w-5 h-5 text-blue-600 rounded mt-1"
                    />
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        🔒 Bloquear Campos Obrigatórios
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                        Quando ativado, o cliente <strong>não poderá</strong>:
                      </div>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1 list-disc list-inside">
                        <li>Adicionar produtos/serviços extras</li>
                        <li>Ver valores totais e formas de pagamento</li>
                        <li>Usar cupons de desconto</li>
                        <li>Enviar orçamento via WhatsApp</li>
                      </ul>
                      <div className="text-sm text-gray-700 dark:text-gray-300 mt-2 font-medium">
                        ✅ Funcionalidades desbloqueiam somente após preencher:
                      </div>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 mt-1 space-y-1 list-disc list-inside">
                        <li>Nome, e-mail e WhatsApp</li>
                        <li>Data (se sistema sazonal ativo)</li>
                        <li>Cidade (se sistema geográfico ativo)</li>
                        <li>Todos os campos personalizados obrigatórios</li>
                      </ul>
                    </div>
                  </label>
                </div>

                <div className="border border-purple-200 dark:border-purple-900/30 bg-purple-50 dark:bg-purple-900/10 rounded-lg p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={template?.ignorar_agenda_global || false}
                      onChange={(e) =>
                        handleUpdateTemplateConfig('ignorar_agenda_global', e.target.checked)
                      }
                      className="w-5 h-5 text-purple-600 rounded mt-1"
                    />
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        📅 Ignorar Agenda Global (Não pedir data)
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                        Ative isso para orçamentos como álbuns ou produtos físicos onde a data do evento não é necessária. Isso removerá o campo de data do formulário, mesmo que a sua agenda global esteja ativa.
                      </div>
                    </div>
                  </label>
                </div>

                <div className="border border-green-200 dark:border-green-900/30 bg-green-50 dark:bg-green-900/10 rounded-lg p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={template?.exibir_painel_flutuante !== false} // Default true
                      onChange={(e) =>
                        handleUpdateTemplateConfig('exibir_painel_flutuante', e.target.checked)
                      }
                      className="w-5 h-5 text-green-600 rounded mt-1"
                    />
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        📱 Exibir Painel Flutuante de Total
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                        Mostra um botão flutuante com o totalizador na tela, acompanhando o cliente. O painel agora aparecerá inteligentemente apenas após o primeiro produto ser exibido e seu formato seguirá automaticamente o design do tema escolhido.
                      </div>
                    </div>
                  </label>
                </div>

                <div className="border border-gray-200 dark:border-[rgba(255,255,255,.08)] bg-gray-50 dark:bg-[#07101f] rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 dark:text-gray-400"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                    Layout dos Produtos (Desktop)
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Escolha como os produtos são exibidos em telas grandes. Em celulares, o layout é sempre em "Quadro".
                  </p>
                  <select
                    value={template?.layout_produtos_desktop || 'linha'}
                    onChange={(e) => handleUpdateTemplateConfig('layout_produtos_desktop', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-[rgba(255,255,255,.08)] bg-white dark:bg-[#0a1628] text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="linha">Linha (imagem à esquerda)</option>
                    <option value="quadro">Quadro (imagem acima)</option>
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Esta opção afeta apenas a visualização em computadores e tablets.
                  </p>
                </div>

                <div className="border border-gray-200 dark:border-[rgba(255,255,255,.08)] bg-gray-50 dark:bg-[#07101f] rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Image className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    Tamanho da Imagem
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Escolha o tamanho das imagens dos produtos.
                  </p>
                  <select
                    value={template?.tamanho_imagem_grid || 'medio'}
                    onChange={(e) => handleUpdateTemplateConfig('tamanho_imagem_grid', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-[rgba(255,255,255,.08)] bg-white dark:bg-[#0a1628] text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pequeno">Pequeno</option>
                    <option value="medio">Médio</option>
                    <option value="grande">Grande</option>
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Esta opção afeta a visualização em todas as telas (celulares e desktop).
                  </p>
                </div>

                <div className="border border-gray-200 dark:border-[rgba(255,255,255,.08)] bg-gray-50 dark:bg-[#07101f] rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Send className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    Texto do Botão de Envio
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Personalize o texto do botão principal de envio do orçamento.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={localTextoBtn}
                      onChange={(e) => setLocalTextoBtn(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      }}
                      onBlur={async () => {
                        if (localTextoBtn === (template?.texto_botao_envio || '')) return;
                        setTextoBtnSaveStatus('saving');
                        try {
                          await handleUpdateTemplateConfig('texto_botao_envio', localTextoBtn);
                          setTextoBtnSaveStatus('saved');
                        } catch {
                          setTextoBtnSaveStatus('error');
                        }
                        setTimeout(() => setTextoBtnSaveStatus('idle'), 2500);
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-[rgba(255,255,255,.08)] bg-white dark:bg-[#0a1628] text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 dark:placeholder:text-gray-600"
                      placeholder="Ex: Negociar no WhatsApp"
                      maxLength={30}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (localTextoBtn === (template?.texto_botao_envio || '')) return;
                        setTextoBtnSaveStatus('saving');
                        try {
                          await handleUpdateTemplateConfig('texto_botao_envio', localTextoBtn);
                          setTextoBtnSaveStatus('saved');
                        } catch {
                          setTextoBtnSaveStatus('error');
                        }
                        setTimeout(() => setTextoBtnSaveStatus('idle'), 2500);
                      }}
                      disabled={textoBtnSaveStatus === 'saving' || localTextoBtn === (template?.texto_botao_envio || '')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium transition-colors min-w-[80px]"
                    >
                      {textoBtnSaveStatus === 'saving' ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                  <div className="mt-1 h-4">
                    {textoBtnSaveStatus === 'saved' && <p className="text-xs text-green-600 font-medium">✓ Texto do botão salvo com sucesso!</p>}
                    {textoBtnSaveStatus === 'error' && <p className="text-xs text-red-500">✗ Erro ao salvar. Tente novamente.</p>}
                    {textoBtnSaveStatus === 'idle' && <p className="text-xs text-gray-400">Pressione Enter ou clique em Salvar para confirmar.</p>}
                  </div>
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={template?.ocultar_valores_intermediarios || false}
                    onChange={(e) =>
                      handleUpdateTemplateConfig('ocultar_valores_intermediarios', e.target.checked)
                    }
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      Ocultar valores intermediários
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Mostra apenas o valor total final
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={template?.forma_pagamento_obrigatoria || false}
                    onChange={(e) =>
                      handleUpdateTemplateConfig('forma_pagamento_obrigatoria', e.target.checked)
                    }
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      💳 Forma de pagamento obrigatória
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      O cliente precisa escolher uma forma de pagamento antes de enviar o orçamento
                    </div>
                  </div>
                </label>

                <div className="border border-green-200 dark:border-green-900/30 bg-green-50 dark:bg-green-900/10 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <LinkIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                    URL Amigável e Perfil Público
                  </h4>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        URL do Orçamento
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            value={slugInput}
                            onChange={(e) => handleSlugChange(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-[rgba(255,255,255,.08)] bg-white dark:bg-[#0a1628] text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 pr-10 placeholder:text-gray-400 dark:placeholder:text-gray-600"
                            placeholder="nome-do-orcamento"
                            minLength={3}
                            maxLength={100}
                          />
                          {checkingSlug && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                            </div>
                          )}
                          {!checkingSlug && slugInput.length >= 3 && slugAvailable !== null && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              {slugAvailable ? (
                                <Check className="w-5 h-5 text-green-600" />
                              ) : (
                                <X className="w-5 h-5 text-red-600" />
                              )}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleGenerateSlug}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium whitespace-nowrap"
                        >
                          Gerar Auto
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveSlug}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                        >
                          Salvar
                        </button>
                      </div>
                      {userSlug && slugInput && (
                        <div className="mt-2 p-3 bg-white dark:bg-[#07101f] rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,.08)]">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-sm flex-1 min-w-0">
                              <LinkIcon className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                              <span className="text-gray-600 dark:text-gray-400 flex-shrink-0">Link público:</span>
                              <code className="text-green-600 dark:text-green-400 font-mono truncate">priceus.com.br/{userSlug}/{slugInput}</code>
                            </div>
                            <button
                              type="button"
                              onClick={handleCopyPublicLink}
                              className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-medium flex-shrink-0"
                            >
                              {copiedLink ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  Copiado!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  Copiar
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                      {!userSlug && (
                        <p className="text-xs text-yellow-600 mt-1">
                          Configure seu username no perfil para gerar o link público
                        </p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Mínimo 3 caracteres. Use apenas letras minúsculas, números e hífens.
                      </p>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white dark:bg-[#07101f] rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,.08)]">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Exibir no Perfil Público</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Mostrar este orçamento no seu perfil público</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={template?.exibir_no_perfil ?? true}
                          onChange={(e) => handleUpdateTemplateConfig('exibir_no_perfil', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tutorial Guide Modal */}
      {showTutorial && (
        <TutorialGuide
          onClose={() => setShowTutorial(false)}
          onNavigateToTab={(tab) => setActiveTab(tab as any)}
          currentTab={activeTab}
        />
      )}

      {/* Video Tutorial Modal */}
      {showVideoModal && currentVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0a1628] rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[rgba(255,255,255,.08)]">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{currentVideo.title}</h3>
              <button
                onClick={() => setShowVideoModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              <YouTubeEmbed
                videoId={currentVideo.youtubeId}
                title={currentVideo.title}
                showTitle={false}
                autoplay={true}
              />
              <div className="mt-6 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 dark:text-blue-400 mb-2">Sobre este tutorial:</h4>
                <p className="text-blue-800 dark:text-blue-300 text-sm leading-relaxed">{currentVideo.description}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
