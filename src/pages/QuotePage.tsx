import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLeadCapture } from '../hooks/useLeadCapture';
import { useRequiredFieldsValidation, ValidationResult } from '../hooks/useRequiredFieldsValidation';
import { useQuoteAnalytics } from '../hooks/useQuoteAnalytics';
import { formatCurrency } from '../lib/utils';
import { ShoppingCart, Send, Lock, User, AlertCircle, Check, CheckCircle, Copy, X, Trash2 } from 'lucide-react';
import { checkAvailability, getOrCreateAgendaConfig, type AvailabilityResult } from '../services/availabilityService';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { CookieBanner } from '../components/CookieBanner';
import { MobileDatePicker } from '../components/MobileDatePicker';
import { AvailabilityIndicator } from '../components/AvailabilityIndicator';
import { generateWhatsAppMessage, generateWaLinkToPhotographer } from '../lib/whatsappMessageGenerator';
import { getTema, TemaType } from '../lib/themes'; // Remove unused theme helpers
import { PublicReviews } from '../components/PublicReviews';
import { RatePhotographerButton } from '../components/RatePhotographerButton';
import { FloatingTotalPanel } from '../components/FloatingTotalPanel';
import { QuoteHeaderRating } from '../components/QuoteHeaderRating';
import { detectBrowser, getReferrer, logBrowserInfo, isInAppBrowser } from '../lib/browserDetection';

interface Produto {
  id: string;
  nome: string;
  resumo: string;
  valor: number;
  unidade: string;
  obrigatorio: boolean;
  imagem_url?: string;
  mostrar_imagem?: boolean;
}

interface FormaPagamento {
  id: string;
  nome: string;
  entrada_tipo: 'percentual' | 'fixo';
  entrada_valor: number;
  max_parcelas: number;
  acrescimo: number;
}

interface CampoExtra {
  id: string;
  label: string;
  tipo: string;
  placeholder: string;
  obrigatorio: boolean;
}

/**
 * 🔥 FUNÇÃO ADICIONADA
 * Converte uma string de data 'YYYY-MM-DD' para um objeto Date
 * em UTC, evitando problemas de fuso horário.
 */
function parseLocalYMD(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function QuotePage() {
  const { templateUuid, slugUsuario, slugTemplate } = useParams<{ templateUuid?: string; slugUsuario?: string; slugTemplate?: string }>();
  const { saveFinalLead, updateLead } = useLeadCapture();
 
  const [template, setTemplate] = useState<any>(null);
  const templateRef = useRef<any>(null);
  useEffect(() => { templateRef.current = template; }, [template]);
 
  const [profile, setProfile] = useState<any>(null);
  const profileRef = useRef<any>(null);
  useEffect(() => { profileRef.current = profile; }, [profile]);
 
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
  const [camposExtras, setCamposExtras] = useState<CampoExtra[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // 🎨 Sistema de Temas
  const tema = getTema((template?.tema as TemaType) || 'moderno');

  // DEBUG: Ver qual tema está sendo usado
  useEffect(() => {
    if (template?.tema) {
      console.log('🎨 TEMA DO BANCO DE DADOS:', template.tema);
      console.log('🎨 BACKGROUND APLICADO:', tema.cores.bgPrincipal);
      console.log('🎨 NOME DO TEMA:', tema.nome);
    }
  }, [template?.tema, tema]);

  const [selectedProdutos, setSelectedProdutos] = useState<Record<string, number>>({});
  const [formData, setFormData] = useState({
    nome_cliente: '',
    email_cliente: '',
    telefone_cliente: '',
  });
  const [camposExtrasData, setCamposExtrasData] = useState<Record<string, string>>({});
  const [selectedFormaPagamento, setSelectedFormaPagamento] = useState<string>('');
  const [dataUltimaParcela] = useState<string>(''); // Removed unused setDataUltimaParcela

  // Cupom de desconto
  const [cupomCodigo, setCupomCodigo] = useState<string>('');
  const [cupomAtivo, setCupomAtivo] = useState<boolean>(false);
  const [cupomDesconto, setCupomDesconto] = useState<number>(0);
  const [cupomMensagem, setCupomMensagem] = useState<string>('');

  // Campos para preços dinâmicos
  const [dataEvento, setDataEvento] = useState<string>('');
  const [cidadeSelecionada, setCidadeSelecionada] = useState<string>('');
  const [paises, setPaises] = useState<any[]>([]);
  const [estados, setEstados] = useState<any[]>([]);
  const [cidades, setCidades] = useState<any[]>([]);
  const [temporadas, setTemporadas] = useState<any[]>([]);
  const [selectedPais, setSelectedPais] = useState<string>('');
  const [selectedEstado, setSelectedEstado] = useState<string>('');

  // Modal de Resumo e Envio
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryData, setSummaryData] = useState({
    waLink: '',
    message: '',
    profileName: '',
    clientData: { nome: '', email: '', telefone: '' },
    eventData: { tipo: '', data: '', cidade: '' },
    quoteData: {
      total: 0,
      items: [] as { name: string; quantity: number; price: number }[],
      paymentMethod: ''
    }
  });
  const [copied, setCopied] = useState(false);

  // Estado para o contador de redirecionamento automático
  const [countdown, setCountdown] = useState(5);
  const [autoRedirectActive, setAutoRedirectActive] = useState(true);

  // 📅 Sistema de Verificação de Disponibilidade
  const [disponibilidade, setDisponibilidade] = useState<AvailabilityResult | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [agendaConfig, setAgendaConfig] = useState<any>(null);
  const [feriadosNacionais, setFeriadosNacionais] = useState<string[]>([]); // Estado para feriados da API
  const [datasBloqueadas, setDatasBloqueadas] = useState<string[]>([]);
  const [periodosBloqueados, setPeriodosBloqueados] = useState<{data_inicio: string, data_fim: string}[]>([]);

  // 📌 Ref para o rodapé
  const produtosSectionRef = useRef<HTMLDivElement>(null);
  const totalSectionRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null); // Mantido caso seja usado em outro lugar

  // � Hook de validação de campos obrigatórios
  const fieldsValidation = useRequiredFieldsValidation({
    formData,
    camposExtras,
    camposExtrasData,
    dataEvento,
    cidadeSelecionada,
    sistemaGeograficoAtivo: template?.sistema_geografico_ativo,
    sistemaSazonalAtivo: template?.sistema_sazonal_ativo,
    bloquearCamposObrigatorios: template?.bloquear_campos_obrigatorios,
  });

  // 📊 Session ID único para analytics
  const sessionId = useMemo(() => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // 📊 Hook de analytics para tracking
  const analytics = useQuoteAnalytics(
    template && profile
      ? {
          templateId: template.id,
          userId: template.user_id,
          sessionId,
          origem: document.referrer || 'direct',
        }
      : null
  );

  useEffect(() => {
    logBrowserInfo();

    if (templateUuid || (slugUsuario && slugTemplate)) {
      loadTemplateData();
    }
  }, [templateUuid, slugUsuario, slugTemplate]);

  useEffect(() => {
    if (template && produtos.length > 0) {
      updateLead({
        templateId: template.id,
        userId: template.user_id,
        formData: {
          ...formData,
          ...camposExtrasData,
          data_evento: dataEvento || null,
          cidade_evento: cidadeSelecionada || null,
          tipo_evento: template.nome_template || null,
        },
        orcamentoDetalhe: {
          // ANTES: Apenas IDs eram salvos, o que quebrava a geração da mensagem.
          // AGORA: Salvamos os objetos completos para reconstrução posterior.
          selectedProdutos,
          selectedFormaPagamento,
          produtos: produtos,
          paymentMethod: formasPagamento.find(f => f.id === selectedFormaPagamento),
          formasPagamento: formasPagamento,
          priceBreakdown: getPriceBreakdown(),
          // Campos necessários para o LeadsManager reconstruir a mensagem
          sistema_sazonal_ativo: template?.sistema_sazonal_ativo,
          sistema_geografico_ativo: template?.sistema_geografico_ativo,
          ocultar_valores_intermediarios: template?.ocultar_valores_intermediarios,
        },
        valorTotal: calculateTotal(),
      });
    }
  }, [formData, selectedProdutos, selectedFormaPagamento, camposExtrasData, dataEvento, cidadeSelecionada]);

  useEffect(() => {
    let isCancelled = false;

    if (dataEvento && template?.user_id) {
      console.log('[QuotePage] 🔄 Iniciando verificação de disponibilidade', {
        dataEvento,
        userId: template.user_id,
        timestamp: new Date().toISOString(),
      });

      setDisponibilidade(null);
      setCheckingAvailability(true);

      checkAvailability(template.user_id, dataEvento)
        .then((result) => {
          if (!isCancelled) {
            console.log('[QuotePage] ✅ Disponibilidade recebida', {
              dataEvento,
              status: result.status,
              disponivel: result.disponivel,
            });
            setDisponibilidade(result);
          }
        })
        .catch((error) => {
          if (!isCancelled) {
            console.error('[QuotePage] ❌ Erro ao verificar disponibilidade', error);
          }
        })
        .finally(() => {
          if (!isCancelled) {
            setCheckingAvailability(false);
          }
        });
    } else {
      setDisponibilidade(null);
      setCheckingAvailability(false);
    }

    return () => {
      isCancelled = true;
    };
  }, [dataEvento, template?.user_id]);

  useEffect(() => {
    if (formData.nome_cliente) analytics?.trackFieldFilled('nome_cliente', true);
  }, [formData.nome_cliente]);

  useEffect(() => {
    if (formData.email_cliente) analytics?.trackFieldFilled('email_cliente', true);
  }, [formData.email_cliente]);

  useEffect(() => {
    if (formData.telefone_cliente) analytics?.trackFieldFilled('telefone_cliente', true);
  }, [formData.telefone_cliente]);

  useEffect(() => {
    if (dataEvento) {
      analytics?.trackFieldFilled('data_evento', true);
      analytics?.trackStage('data_selecionada');
    }
  }, [dataEvento]);

  useEffect(() => {
    if (cidadeSelecionada) {
      analytics?.trackFieldFilled('cidade_evento', true);
      analytics?.trackStage('cidade_selecionada');
    }
  }, [cidadeSelecionada]);

  useEffect(() => {
    if (Object.keys(selectedProdutos).length > 0) {
      analytics?.trackStage('produtos_selecionados');
      Object.keys(selectedProdutos).forEach(produtoId => {
        analytics?.trackProductViewed(produtoId);
      });
    }
  }, [selectedProdutos]);

  useEffect(() => {
    if (selectedFormaPagamento) {
      analytics?.trackStage('forma_pagamento_selecionada');
    }
  }, [selectedFormaPagamento]);

  useEffect(() => {
    if (cupomAtivo) {
      analytics?.trackStage('cupom_aplicado');
    }
  }, [cupomAtivo]);

  // Verifica se há algum progresso no orçamento para exibir o botão "Limpar Orçamento"
  const hasQuoteInProgress = useMemo(() => {
    // Verifica campos do formulário principal
    if (formData.nome_cliente || formData.email_cliente || formData.telefone_cliente) return true;

    // Verifica campos extras
    if (Object.values(camposExtrasData).some(value => value !== '')) return true;

    // Verifica seleção de produtos
    const initialMandatoryProductsCount = produtos.filter(p => p.obrigatorio).length;
    const currentSelectedProductsCount = Object.keys(selectedProdutos).length;

    // Se mais produtos foram selecionados do que os obrigatórios iniciais
    if (currentSelectedProductsCount > initialMandatoryProductsCount) return true;

    // Se algum produto obrigatório tem quantidade maior que 1
    if (produtos.some(p => p.obrigatorio && selectedProdutos[p.id] > 1)) return true;

    // Se algum produto não obrigatório foi selecionado
    if (produtos.some(p => !p.obrigatorio && selectedProdutos[p.id] > 0)) return true;

    // Verifica forma de pagamento
    if (selectedFormaPagamento) return true;

    // Verifica data e cidade do evento
    if (dataEvento || cidadeSelecionada) return true;

    // Verifica cupom
    if (cupomCodigo) return true;

    return false;
  }, [formData, camposExtrasData, selectedProdutos, produtos, selectedFormaPagamento, dataEvento, cidadeSelecionada, cupomCodigo]);


  // Chave para salvar/carregar o orçamento do localStorage
  const storageKey = useMemo(() => (template ? `priceus-quote-${template.id}` : null), [template]);

  // Efeito para SALVAR o estado do orçamento no localStorage sempre que algo mudar
  useEffect(() => {
    // Não salva se não tiver a chave (template não carregado) ou se estiver carregando dados
    if (!storageKey || loading) return;

    const quoteStateToSave = {
      selectedProdutos,
      formData,
      camposExtrasData,
      selectedFormaPagamento,
      dataEvento,
      cidadeSelecionada,
      selectedEstado,
      selectedPais,
      cupomCodigo,
      cupomAtivo,
      cupomDesconto,
      cupomMensagem,
    };

    try {
      // Salva o objeto como uma string JSON
      localStorage.setItem(storageKey, JSON.stringify(quoteStateToSave));
    } catch (error) {
      console.error('Falha ao salvar orçamento no localStorage:', error);
    }
  }, [storageKey, loading, selectedProdutos, formData, camposExtrasData, selectedFormaPagamento, dataEvento, cidadeSelecionada, selectedEstado, selectedPais, cupomCodigo, cupomAtivo, cupomDesconto, cupomMensagem]);


  // Efeito para exibir alerta ao tentar fechar a aba com orçamento em andamento
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Condições para mostrar o alerta:
      // 1. O modal de resumo NÃO foi exibido (ou seja, o orçamento não foi "enviado")
      // 2. O usuário preencheu algum dado (nome, etc.) OU selecionou algum produto
      const hasUserData = formData.nome_cliente || formData.email_cliente || formData.telefone_cliente;
      const hasQuoteData = Object.keys(selectedProdutos).length > 0;

      if (!showSummaryModal && (hasUserData || hasQuoteData)) {
        event.preventDefault();
        // A maioria dos navegadores modernos ignora a string retornada e exibe uma mensagem padrão.
        event.returnValue = 'Você tem um orçamento em andamento. Tem certeza que deseja sair?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData, selectedProdutos, showSummaryModal]);

  // Efeito para controlar o contador de redirecionamento automático
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (showSummaryModal && autoRedirectActive && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (showSummaryModal && autoRedirectActive && countdown === 0) {
      // Redireciona quando o contador chega a zero
      if (summaryData.waLink) {
        window.open(summaryData.waLink, '_blank');
      }
      setAutoRedirectActive(false); // Impede redirecionamentos futuros na mesma sessão do modal
      setShowSummaryModal(false); // Fecha o modal
    }

    return () => {
      clearTimeout(timer);
    };
  }, [showSummaryModal, autoRedirectActive, countdown, summaryData.waLink]);

  const loadPricingData = async (userId: string, templateId: string) => {
    try {
      // Carregar países
      const { data: paisesData } = await supabase
        .from('paises')
        .select('*')
        .eq('user_id', userId)
        .eq('ativo', true)
        .order('nome');

      // Carregar estados
      const { data: estadosData } = await supabase
        .from('estados')
        .select('*')
        .eq('user_id', userId)
        .eq('ativo', true)
        .order('nome');

      // Carregar cidades
      const { data: cidadesData } = await supabase
        .from('cidades_ajuste')
        .select('*')
        .eq('user_id', userId)
        .eq('ativo', true)
        .order('nome');

      // Carregar temporadas do template
      const { data: temporadasData } = await supabase
        .from('temporadas')
        .select('*')
        .eq('template_id', templateId)
        .eq('ativo', true)
        .order('data_inicio');

      setPaises(paisesData || []);
      setEstados(estadosData || []);
      setCidades(cidadesData || []);
      setTemporadas(temporadasData || []);
    } catch (error) {
      console.error('Erro ao carregar dados de preços:', error);
    }
  };

  const loadTemplateData = async () => {
    setLoading(true);
    setLoadError(null);

    const maxRetries = 3;
    const retryDelay = 1000;

    try {
      console.log('[QuotePage] 🔄 Loading template data', {
        templateUuid,
        slugUsuario,
        slugTemplate,
        attempt: retryCount + 1,
        browser: detectBrowser(),
        timestamp: new Date().toISOString(),
      });

      let templateData: any = null;

      if (templateUuid) {
        console.log('[QuotePage] 📋 Loading by UUID:', templateUuid);
        const { data, error } = await supabase
          .from('templates')
          .select('*')
          .eq('uuid', templateUuid)
          .maybeSingle();

        if (error) {
          console.error('[QuotePage] ❌ Error loading template by UUID:', error);
          throw new Error(`Erro ao carregar template: ${error.message}`);
        }

        templateData = data;
      } else if (slugUsuario && slugTemplate) {
        console.log('[QuotePage] 🔗 Loading by slugs:', { slugUsuario, slugTemplate });

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('slug_usuario', slugUsuario)
          .maybeSingle();

        if (profileError) {
          console.error('[QuotePage] ❌ Error loading profile:', profileError);
          throw new Error(`Erro ao carregar perfil: ${profileError.message}`);
        }

        if (!profileData) {
          console.error('[QuotePage] ❌ Profile not found for slug:', slugUsuario);
          throw new Error('Perfil não encontrado');
        }

        const { data, error: templateError } = await supabase
          .from('templates')
          .select('*')
          .eq('user_id', profileData.id)
          .eq('slug_template', slugTemplate)
          .maybeSingle();

        if (templateError) {
          console.error('[QuotePage] ❌ Error loading template by slug:', templateError);
          throw new Error(`Erro ao carregar template: ${templateError.message}`);
        }

        templateData = data;

        if (data) {
          const referrer = getReferrer();
          console.log('[QuotePage] 📊 Saving analytics with referrer:', referrer);

          try {
            await supabase
              .from('analytics_orcamentos')
              .insert({
                template_id: data.id,
                user_id: profileData.id,
                origem: referrer
              });
          } catch (analyticsError) {
            console.warn('[QuotePage] ⚠️ Analytics insert failed (non-critical):', analyticsError);
          }
        }
      }

      if (!templateData) {
        console.error('[QuotePage] ❌ Template not found');
        setLoadError('Orçamento não encontrado. Verifique o link e tente novamente.');
        return;
      }

      console.log('[QuotePage] ✅ Template loaded successfully:', templateData.id);

      const { data: profileData, error: profileError2 } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', templateData.user_id)
        .maybeSingle();

      if (profileError2) {
        console.error('[QuotePage] ❌ Error loading profile details:', profileError2);
        throw new Error(`Erro ao carregar dados do perfil: ${profileError2.message}`);
      }

      console.log('[QuotePage] 📦 Loading products...');
      const { data: produtosData, error: produtosError } = await supabase
        .from('produtos')
        .select('*')
        .eq('template_id', templateData.id)
        .order('ordem');

      if (produtosError) {
        console.error('[QuotePage] ❌ Error loading products:', produtosError);
      }

      console.log('[QuotePage] 💳 Loading payment methods...');
      const { data: pagamentosData, error: pagamentosError } = await supabase
        .from('formas_pagamento')
        .select('*')
        .eq('template_id', templateData.id);

      if (pagamentosError) {
        console.error('[QuotePage] ❌ Error loading payment methods:', pagamentosError);
      }

      console.log('[QuotePage] 📝 Loading custom fields...');
      const { data: camposData, error: camposError } = await supabase
        .from('campos')
        .select('*')
        .eq('template_id', templateData.id)
        .order('ordem');

      if (camposError) {
        console.error('[QuotePage] ❌ Error loading custom fields:', camposError);
      }

      console.log('[QuotePage] ✅ All data loaded successfully');

      setTemplate(templateData);
      setProfile(profileData);
      setProdutos(produtosData || []);
      setFormasPagamento(pagamentosData || []);
      setCamposExtras(camposData || []);
      setRetryCount(0);

      // Carregar configuração da agenda para verificação de disponibilidade
      const config = await getOrCreateAgendaConfig(templateData.user_id);
      setAgendaConfig(config);
      console.log('[QuotePage] 📅 Configuração da agenda carregada', config);

      // Carregar dados de preços dinâmicos se qualquer sistema estiver ativo
      if (templateData.sistema_sazonal_ativo || templateData.sistema_geografico_ativo) {
        await loadPricingData(templateData.user_id, templateData.id);
      }      

      // Carregar períodos bloqueados se as regras em massa estiverem ativas
      if (config?.regras_massa_ativas) {
        const { data: periodosData } = await supabase
          .from('periodos_bloqueados')
          .select('data_inicio, data_fim')
          .eq('user_id', templateData.user_id);

        setPeriodosBloqueados(periodosData || []);
      } else {
        // Se as regras não estiverem ativas, carrega apenas os bloqueios individuais
        // 🔥 CORREÇÃO: Usar uma RPC (Remote Procedure Call) para buscar as datas bloqueadas.
        // Isso contorna problemas de RLS para usuários não autenticados.
        const { data: bloqueadasData, error: rpcError } = await supabase.rpc('get_blocked_dates', { p_user_id: templateData.user_id });
        if (rpcError) {
          console.error('❌ Erro ao chamar RPC get_blocked_dates:', rpcError);
        }
        setDatasBloqueadas(bloqueadasData || []);
      }

      const initialSelected: Record<string, number> = {};
      produtosData?.forEach((produto) => {
        if (produto.obrigatorio) {
          initialSelected[produto.id] = 1;
        }
      });
      setSelectedProdutos(initialSelected);
    } catch (error: any) {
      // Lógica para carregar o orçamento salvo do localStorage
      if (storageKey) {
        try {
          const savedQuote = localStorage.getItem(storageKey);
          if (savedQuote) {
            console.log('✅ [QuotePage] Orçamento encontrado no localStorage. Carregando...');
            const parsedState = JSON.parse(savedQuote);

            // Restaura o estado do componente com os dados salvos
            setSelectedProdutos(parsedState.selectedProdutos || {});
            setFormData(parsedState.formData || { nome_cliente: '', email_cliente: '', telefone_cliente: '' });
            setCamposExtrasData(parsedState.camposExtrasData || {});
            setSelectedFormaPagamento(parsedState.selectedFormaPagamento || '');
            setDataEvento(parsedState.dataEvento || '');
            setSelectedPais(parsedState.selectedPais || '');
            setSelectedEstado(parsedState.selectedEstado || '');
            setCidadeSelecionada(parsedState.cidadeSelecionada || '');
            setCupomCodigo(parsedState.cupomCodigo || '');
            setCupomAtivo(parsedState.cupomAtivo || false);
            setCupomDesconto(parsedState.cupomDesconto || 0);
            setCupomMensagem(parsedState.cupomMensagem || '');
          }
        } catch (e) {
          console.error('Falha ao carregar orçamento do localStorage:', e);
        }
      }
      console.error('[QuotePage] ❌ Critical error loading template:', error);

      const errorMessage = error?.message || 'Erro desconhecido ao carregar orçamento';
      setLoadError(errorMessage);

      if (retryCount < maxRetries) {
        console.log(`[QuotePage] 🔄 Retrying... (${retryCount + 1}/${maxRetries})`);
        setTimeout(() => {
          setRetryCount(retryCount + 1);
          loadTemplateData();
        }, retryDelay * (retryCount + 1));
      } else {
        console.error('[QuotePage] ❌ Max retries reached. Giving up.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProdutoQuantityChange = (produtoId: string, quantity: number) => {
    if (quantity <= 0) {
      const produto = produtos.find((p) => p.id === produtoId);
      if (produto?.obrigatorio) {
        alert('⚠️ Este produto é obrigatório');
        return;
      }
      const newSelected = { ...selectedProdutos };
      delete newSelected[produtoId];
      setSelectedProdutos(newSelected);
    } else {
      setSelectedProdutos({ ...selectedProdutos, [produtoId]: quantity });
    }
  };

  /**
   * Calcula subtotal dos produtos selecionados (sem ajustes)
   */
  const calculateSubtotal = () => {
    return produtos.reduce((total, produto) => {
      const qty = selectedProdutos[produto.id] || 0;
      return total + produto.valor * qty;
    }, 0);
  };

  /**
   * Calcula ajuste sazonal baseado na data do evento
   */
  const calculateSeasonalAdjustment = (subtotal: number): number => {
    if (!dataEvento || temporadas.length === 0) return 0;

    const eventoDate = parseLocalYMD(dataEvento);

    // Encontrar temporada ativa que contém a data do evento
    const temporadaAtiva = temporadas.find((temp) => {
      const inicio = parseLocalYMD(temp.data_inicio);
      const fim = parseLocalYMD(temp.data_fim);
      return eventoDate >= inicio && eventoDate <= fim;
    });

    if (temporadaAtiva) {
      // 🔥 CORREÇÃO: Usar multiplicador ao invés de ajuste_percentual
      // multiplicador = 1.15 significa +15%, 0.90 significa -10%
      const multiplicador = temporadaAtiva.multiplicador || 1;
      return subtotal * (multiplicador - 1);
    }

    return 0;
  };

  /**
   * Calcula ajuste geográfico baseado na cidade selecionada
   */
  const calculateGeographicAdjustment = (subtotal: number): { percentual: number; taxa: number } => {
    if (!cidadeSelecionada) return { percentual: 0, taxa: 0 };

    const cidade = cidades.find((c) => c.id === cidadeSelecionada);

    if (cidade) {
      const ajustePercentual = (subtotal * cidade.ajuste_percentual) / 100;
      return {
        percentual: ajustePercentual,
        taxa: cidade.taxa_deslocamento || 0,
      };
    }

    return { percentual: 0, taxa: 0 };
  };

  /**
   * Calcula total com todos os ajustes aplicados
   * Ordem de aplicação:
   * 1. Subtotal (produtos)
   * 2. Ajuste sazonal (%)
   * 3. Ajuste geográfico (%)
   * 4. Taxa de deslocamento (fixo)
   * 5. Acréscimo/desconto forma de pagamento (%)
   */
  const calculateTotal = () => {
    const subtotal = calculateSubtotal();

    // Ajuste sazonal (se sistema ativo)
    let totalComAjustes = subtotal;
    let ajusteSazonal = 0;
    let ajusteGeografico = 0;
    let taxaDeslocamento = 0;

    // Aplicar ajuste sazonal se ativo
    if (template?.sistema_sazonal_ativo) {
      ajusteSazonal = calculateSeasonalAdjustment(totalComAjustes);
      totalComAjustes += ajusteSazonal;
    }

    // Aplicar ajuste geográfico se ativo
    if (template?.sistema_geografico_ativo) {
      const geoAdjustment = calculateGeographicAdjustment(totalComAjustes);
      ajusteGeografico = geoAdjustment.percentual;
      taxaDeslocamento = geoAdjustment.taxa;
      totalComAjustes += ajusteGeografico + taxaDeslocamento;
    }

    // Acréscimo/desconto da forma de pagamento
    const formaPagamento = formasPagamento.find((f) => f.id === selectedFormaPagamento);
    if (formaPagamento) {
      const acrescimo = (totalComAjustes * formaPagamento.acrescimo) / 100;
      totalComAjustes += acrescimo;
    }

    // Aplicar desconto do cupom
    if (cupomAtivo && cupomDesconto > 0) {
      const descontoCupom = (totalComAjustes * cupomDesconto) / 100;
      totalComAjustes -= descontoCupom;
    }

    return totalComAjustes;
  };

  /**
   * Retorna breakdown detalhado do cálculo de preços para exibição
   */
  const getPriceBreakdown = () => {
    const subtotal = calculateSubtotal();
    const ajusteSazonal = template?.sistema_sazonal_ativo ? calculateSeasonalAdjustment(subtotal) : 0;
    const geoAdjustment = template?.sistema_geografico_ativo ? calculateGeographicAdjustment(subtotal + ajusteSazonal) : { percentual: 0, taxa: 0 };

    const formaPagamento = formasPagamento.find((f) => f.id === selectedFormaPagamento);
    const totalAntesFormaPagamento = subtotal + ajusteSazonal + geoAdjustment.percentual + geoAdjustment.taxa;
    const acrescimoFormaPagamento = formaPagamento ? (totalAntesFormaPagamento * formaPagamento.acrescimo) / 100 : 0;

    const totalAntesCupom = totalAntesFormaPagamento + acrescimoFormaPagamento;
    const descontoCupom = cupomAtivo && cupomDesconto > 0 ? (totalAntesCupom * cupomDesconto) / 100 : 0;

    return {
      subtotal,
      ajusteSazonal,
      ajusteGeografico: {
        percentual: geoAdjustment.percentual,
        taxa: geoAdjustment.taxa,
      },
      taxaDeslocamento: geoAdjustment.taxa,
      acrescimoFormaPagamento,
      descontoCupom,
      total: calculateTotal(),
    };
  };

  /**
   * Valida cupom de desconto
   */
  const handleValidarCupom = async () => {
    if (!cupomCodigo.trim()) {
      setCupomMensagem('Digite um código de cupom');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('cupons')
        .select('*')
        .eq('codigo', cupomCodigo.toUpperCase())
        .eq('template_id', template.id)
        .eq('ativo', true)
        .maybeSingle();

      if (error || !data) {
        setCupomMensagem('❌ Cupom inválido ou expirado');
        setCupomAtivo(false);
        setCupomDesconto(0);
        return;
      }

      // Validar data de validade
      if (data.validade) {
        const hoje = new Date();
        const validade = new Date(data.validade);
        if (hoje > validade) {
          setCupomMensagem('❌ Cupom expirado');
          setCupomAtivo(false);
          setCupomDesconto(0);
          return;
        }
      }

      setCupomAtivo(true);
      setCupomDesconto(data.porcentagem);
      setCupomMensagem(`✅ Cupom aplicado: ${data.porcentagem}% de desconto!`);
    } catch (error) {
      console.error('Erro ao validar cupom:', error);
      setCupomMensagem('❌ Erro ao validar cupom');
      setCupomAtivo(false);
      setCupomDesconto(0);
    }
  };

  const handleResetQuote = () => {
    if (window.confirm('Tem certeza que deseja limpar todo o orçamento e recomeçar? Seu progresso será perdido.')) {
      // 1. Resetar seleção de produtos para apenas os obrigatórios
      const initialSelected: Record<string, number> = {};
      produtos.forEach((produto) => {
        if (produto.obrigatorio) {
          initialSelected[produto.id] = 1;
        }
      });
      setSelectedProdutos(initialSelected);

      // 2. Resetar dados do formulário
      setFormData({
        nome_cliente: '',
        email_cliente: '',
        telefone_cliente: '',
      });
      setCamposExtrasData({});

      // 3. Resetar pagamento, localização e data
      setSelectedFormaPagamento('');
      setDataEvento('');
      setSelectedPais('');
      setSelectedEstado('');
      setCidadeSelecionada('');

      // 4. Resetar cupom
      setCupomCodigo('');
      setCupomAtivo(false);
      setCupomDesconto(0);
      setCupomMensagem('');

      // 5. Limpar localStorage
      if (storageKey) {
        localStorage.removeItem(storageKey);
      }
    }
  };

  const buildWhatsAppMessage = () => {
    const breakdown = getPriceBreakdown();
    const formaPagamento = formasPagamento.find((f) => f.id === selectedFormaPagamento);
    const cidadeNome = cidadeSelecionada
      ? cidades.find((c) => c.id === cidadeSelecionada)?.nome || ''
      : '';

    // 🔥 USAR GERADOR ROBUSTO E COMPLETO
    console.log('DEBUG: buildWhatsAppMessage - cidadeSelecionada:', cidadeSelecionada);
    console.log('DEBUG: buildWhatsAppMessage - cidadeNome:', cidadeNome);
    console.log('DEBUG: buildWhatsAppMessage - produtos:', produtos);
    console.log('DEBUG: buildWhatsAppMessage - selectedProducts:', selectedProdutos);
    console.log('DEBUG: buildWhatsAppMessage - selectedFormaPagamento:', selectedFormaPagamento);
    console.log('DEBUG: buildWhatsAppMessage - formaPagamento:', formaPagamento);
    console.log('DEBUG: buildWhatsAppMessage - template:', template);
    return generateWhatsAppMessage({
      // Dados do cliente
      clientName: formData.nome_cliente || '',
      clientEmail: formData.email_cliente || '',
      clientPhone: formData.telefone_cliente || '',

      // Dados do fotógrafo
      profile: {
        nome_profissional: profile?.nome_profissional,
        email_recebimento: profile?.email_recebimento,
        whatsapp_principal: profile?.whatsapp_principal,
      },

      // Template
      template: {
        nome: template?.nome || '',
        texto_whatsapp: template?.texto_whatsapp,
        sistema_sazonal_ativo: template?.sistema_sazonal_ativo,
        sistema_geografico_ativo: template?.sistema_geografico_ativo,
        ocultar_valores_intermediarios: template?.ocultar_valores_intermediarios,
      },

      // Produtos
      products: produtos,
      selectedProducts: selectedProdutos,

      // Forma de pagamento
      paymentMethod: formaPagamento,
      lastInstallmentDate: dataUltimaParcela,

      // Breakdown de preços
      priceBreakdown: breakdown,

      // Cupom
      couponCode: cupomAtivo ? cupomCodigo : undefined,
      couponDiscount: cupomAtivo ? cupomDesconto : undefined,

      // 🔥 Dados sazonais e geográficos (automáticos)
      eventDate: dataEvento,
      eventCity: cidadeNome,

      // 🔥 Campos personalizados (automáticos)
      customFields: camposExtras,
      customFieldsData: camposExtrasData,

      // Contexto: cliente enviando para fotógrafo
      context: 'client-to-photographer',
    });
  };

  // FUNÇÃO COMPLETA: Desabilita datas no calendário com base nas regras do agendaConfig
  const isDateDisabled = (date: Date): boolean => {
    if (!agendaConfig) return false;

    // **MELHORIA**: Verifica se a data selecionada é a mesma que está sendo checada.
    // Se for, usa o resultado da verificação de disponibilidade em tempo real.
    if (dataEvento && parseLocalYMD(dataEvento).toDateString() === date.toDateString() && disponibilidade) {
      return !disponibilidade.disponivel;
    }

    const dayOfMonth = date.getDate();
    const dayOfWeek = date.getDay(); // 0 (Dom) a 6 (Sáb)
  
    // Se as regras em massa estiverem desativadas, não aplique as regras abaixo.
    if (!agendaConfig.regras_massa_ativas) {
      // Mesmo com regras desativadas, verifica bloqueios individuais
      const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      return datasBloqueadas.includes(dateString);
    }

    // 2. Bloqueio por Períodos (Férias)
    for (const periodo of periodosBloqueados) {
      const inicio = parseLocalYMD(periodo.data_inicio);
      const fim = parseLocalYMD(periodo.data_fim);
      if (date >= inicio && date <= fim) {
        return true;
      }
    }

    // 1. Bloqueio por dias da semana (ex: Domingos e Sábados)
    if (agendaConfig.dias_semana_bloqueados?.includes(dayOfWeek)) {
      return true;
    }
  
    // 2. Bloqueio por dias pares/ímpares
    if (agendaConfig.regra_par_impar === 'pares' && dayOfMonth % 2 === 0) {
      return true;
    }
    if (agendaConfig.regra_par_impar === 'impares' && dayOfMonth % 2 !== 0) {
      return true;
    }
  
    // 3. Bloqueio de semana sim, semana não
    if (agendaConfig.regra_semanal === 'trabalha_pares' || agendaConfig.regra_semanal === 'trabalha_impares') {      // Função para obter o número da semana relativo a uma data de início
      const getWeekNumber = (d: Date) => {
        // Usa a data de início configurada, ou o início do ano como padrão
        const startDate = agendaConfig.regra_semanal_inicio ? new Date(agendaConfig.regra_semanal_inicio) : new Date(d.getFullYear(), 0, 1);
        // Normaliza para o início da semana (domingo)
        startDate.setDate(startDate.getDate() - startDate.getDay());
        const targetDate = new Date(d);
        targetDate.setHours(0, 0, 0, 0);
        // @ts-ignore
        // Calcula o número de semanas desde a data de início
        const weekNo = Math.floor((targetDate - startDate) / (7 * 24 * 60 * 60 * 1000)) + 1;
        return weekNo;
      };

      const weekNumber = getWeekNumber(date);
      // Exemplo: Bloqueia se a semana for ímpar (trabalha nas pares)
      if (weekNumber % 2 !== 0) {
        return true;
      }
    }
  
    // Adicione outras lógicas aqui, como "somente feriados", etc.
    return false;
  };

  const renderLocationDateFields = () => {
    if (!((template.sistema_sazonal_ativo && temporadas.length > 0) || (template.sistema_geografico_ativo && paises.length > 0) || agendaConfig?.agenda_ativa)) {
      return null;
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Data do Evento */}
        {(temporadas.length > 0 || agendaConfig?.agenda_ativa) && (
          <div>
            <MobileDatePicker
              value={dataEvento}
              onChange={(newDate) => {
                console.log('[QuotePage] 📅 Data alterada:', newDate);
                setDataEvento(newDate);
              }}
              min={new Date().toISOString().split('T')[0]}
              required
              label="Selecione a data que deseja *"
              description="Preços podem variar por temporada"
              disabledDate={isDateDisabled} // Passando a função para o componente
              tema={tema}
              className="touch-manipulation"
            />

            <AvailabilityIndicator
              availability={disponibilidade}
              isChecking={checkingAvailability}
              onRefresh={() => {
                if (template?.user_id && dataEvento) {
                  console.log('[QuotePage] 🔄 Atualizando disponibilidade manualmente');
                  setDisponibilidade(null);
                  setCheckingAvailability(true);
                  checkAvailability(template.user_id, dataEvento)
                    .then(setDisponibilidade)
                    .finally(() => setCheckingAvailability(false));
                }
              }}
              onContactPhotographer={() => {
                if (profile?.whatsapp_principal) {
                  const waLink = generateWaLinkToPhotographer(
                    profile.whatsapp_principal,
                    `Olá! Gostaria de verificar a disponibilidade para a data ${new Date(dataEvento + 'T00:00:00').toLocaleDateString('pt-BR')}`
                  );
      window.location.href = waLink;
                }
              }}
              photographerName={profile?.nome_completo || profile?.nome_empresa}
              showRefreshButton={true}
            />
          </div>
        )}

        {/* Seleção de Localização */}
        {paises.length > 0 && (
          <>
            <div>
              <label htmlFor="select-pais" className={`block text-sm font-medium ${tema.cores.textoSecundario} mb-2`}>
                País
              </label>
                              <select
                                id="select-pais"
                                name="pais"
                                value={selectedPais}
                                onChange={(e) => {
                                  setSelectedPais(e.target.value);
                                  setSelectedEstado('');
                                  setCidadeSelecionada('');
                                }}
                                className={`w-full px-4 py-3 text-base border ${tema.cores.borda} ${tema.cores.bgCard} ${tema.cores.textoPrincipal} rounded-lg focus:ring-2 focus:ring-opacity-50 touch-manipulation appearance-none`}
                              >                <option value="">Selecione o país</option>
                {paises.map((pais) => (
                  <option key={pais.id} value={pais.id}>
                    {pais.nome}
                  </option>
                ))}
              </select>
            </div>

            {selectedPais && (
              <div>
                <label htmlFor="select-estado" className={`block text-sm font-medium ${tema.cores.textoSecundario} mb-2`}>
                  Estado
                </label>
                <select
                  id="select-estado"
                  name="estado"
                  value={selectedEstado}
                  onChange={(e) => {
                    setSelectedEstado(e.target.value);
                    setCidadeSelecionada('');
                  }}
                  className={`w-full px-4 py-3 text-base border ${tema.cores.borda} ${tema.cores.bgCard} ${tema.cores.textoPrincipal} rounded-lg focus:ring-2 focus:ring-opacity-50 touch-manipulation appearance-none`}
                >
                  <option value="">Selecione o estado</option>
                  {estados
                    .filter((e) => e.pais_id === selectedPais)
                    .map((estado) => (
                      <option key={estado.id} value={estado.id}>
                        {estado.nome} ({estado.sigla})
                      </option>
                    ))}
                </select>
              </div>
            )}

            {selectedEstado && (
              <div className="md:col-span-2">
                <label className={`block text-sm font-medium ${tema.cores.textoSecundario} mb-2`}>
                  Cidade *
                </label>
                <select
                  value={cidadeSelecionada}
                  onChange={(e) => setCidadeSelecionada(e.target.value)}
                  required
                  className={`w-full px-4 py-3 text-base border ${tema.cores.borda} ${tema.cores.bgCard} ${tema.cores.textoPrincipal} rounded-lg focus:ring-2 focus:ring-opacity-50 touch-manipulation appearance-none`}
                >
                  <option value="">Selecione a cidade</option>
                  {cidades
                    .filter((c) => c.estado_id === selectedEstado)
                    .map((cidade) => (
                      <option key={cidade.id} value={cidade.id}>
                        {cidade.nome}
                        {!template?.ocultar_valores_intermediarios && (
                          <>
                            {cidade.ajuste_percentual !== 0 &&
                              ` (${cidade.ajuste_percentual > 0 ? '+' : ''}${cidade.ajuste_percentual}%)`}
                            {cidade.taxa_deslocamento > 0 &&
                              ` + R$ ${cidade.taxa_deslocamento.toFixed(2)}`}
                          </>
                        )}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  Valores podem incluir ajuste de preço e taxa de deslocamento
                </p>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    console.log('🚀 [handleSubmit] Botão clicado. Priorizando abertura do modal...');

    try {
      // Validação final antes de prosseguir
      if (!fieldsValidation.canUseWhatsApp) {
        alert(fieldsValidation.validationMessage);
        setIsSubmitting(false); // Reativa se a validação falhar
        return;
      }

      analytics?.trackStage('tentativa_envio');

      // 1. AÇÃO IMEDIATA: PREPARAR DADOS E EXIBIR O MODAL
      console.log('✅ [handleSubmit] Preparando dados para o modal de resumo...');
      const whatsappMessage = buildWhatsAppMessage();
      const waLink = profileRef.current?.whatsapp_principal
        ? generateWaLinkToPhotographer(profileRef.current.whatsapp_principal, whatsappMessage)
        : '';

      const summaryClientData = {
        nome: formData.nome_cliente,
        email: formData.email_cliente,
        telefone: formData.telefone_cliente,
      };

      const summaryEventData = {
        tipo: templateRef.current?.nome_template || '',
        data: dataEvento
          ? `${parseLocalYMD(dataEvento).toLocaleDateString('pt-BR')} [${
              disponibilidade?.status === 'disponivel'
                ? 'Data Livre'
                : 'Verificar Disponibilidade'
            }]`
          : 'Não informada',
        cidade:
          cidades.find((c) => c.id === cidadeSelecionada)?.nome ||
          cidadeSelecionada ||
          'Não informada',
      };

      const summaryQuoteData = {
        total: calculateTotal(),
        items: produtos
          .filter((p) => selectedProdutos[p.id] > 0)
          .map((p) => ({
            name: p.nome,
            quantity: selectedProdutos[p.id],
            price: p.valor,
          })),
        paymentMethod:
          formasPagamento.find((f) => f.id === selectedFormaPagamento)?.nome ||
          'Não selecionada',
      };

      setSummaryData({
        waLink,
        message: whatsappMessage,
        profileName: profileRef.current?.nome_profissional || 'o profissional',
        clientData: summaryClientData,
        eventData: summaryEventData,
        quoteData: summaryQuoteData,
      });

      setShowSummaryModal(true);
      // Reseta o contador e ativa o redirecionamento sempre que o modal abrir
      setCountdown(5);
      setAutoRedirectActive(true);
      console.log('✅ [handleSubmit] Modal de resumo pronto para ser exibido.');

      // 2. AÇÃO EM SEGUNDO PLANO: AGENDAR O SALVAMENTO DO LEAD
      // O setTimeout desacopla a requisição de rede da ação do usuário,
      // dando tempo para a UI (modal) renderizar sem ser bloqueada.
      setTimeout(async () => {
        // Limpa o orçamento salvo no navegador após o envio bem-sucedido
        try {
          console.log('🚀 [setTimeout] Iniciando salvamento do lead em segundo plano...');

          // 🔥 CORREÇÃO CRÍTICA DO PAYLOAD
          const payload = {
            templateId: templateRef.current.id,
            userId: templateRef.current.user_id,
            formData: { ...formData, ...camposExtrasData, data_evento: dataEvento || null, cidade_evento: cidadeSelecionada || null, tipo_evento: templateRef.current.nome_template || null },
            orcamentoDetalhe: {
              // O objeto 'selectedProdutos' é convertido para um array, que é o que a Edge Function espera.
              produtos: Object.entries(selectedProdutos).map(([produto_id, quantidade]) => ({
                produto_id,
                quantidade: Number(quantidade),
              })),
              forma_pagamento_id: selectedFormaPagamento,
              priceBreakdown: getPriceBreakdown(),
            },
            valorTotal: calculateTotal(),
          };

          const { lead: leadData, error } = await saveFinalLead(payload);

          // O hook agora retorna um objeto { lead, error }.
          if (error || !leadData) {
            console.error('❌ [setTimeout] Falha ao salvar o lead. A resposta foi vazia ou continha um erro. Erro retornado:', error);
            return;
          }

          console.log('✅ [setTimeout] Lead salvo com sucesso:', leadData);

          // Limpa o orçamento do navegador APENAS se o lead foi salvo com sucesso.
          if (storageKey) {
            localStorage.removeItem(storageKey);
            console.log('✅ [setTimeout] Orçamento salvo no navegador foi limpo.');
          }

          const leadId = leadData.id;

          if (leadId) { // A notificação só será criada se o leadId for encontrado.
            console.log('🔔 [QuotePage] Tentando criar notificação para o lead ID:', leadId);
            // Tenta criar a notificação após salvar o lead
            const { error: notificationError } = await supabase.from('notifications').insert({
              user_id: templateRef.current.user_id,
              type: 'new_lead',
              message: `Novo orçamento recebido de ${formData.nome_cliente || 'um cliente'}.`,
              link: '/dashboard?page=leads',
              related_id: leadId,
            });
            if (notificationError) {
              console.error('❌ [QuotePage] Erro ao criar notificação:', notificationError);
            } else {
              console.log('✅ [QuotePage] Notificação criada com sucesso no banco de dados.');
            }
          }
        } catch (err) {
          // Captura erros da chamada `saveFinalLead` ou da notificação
          console.error('❌ [setTimeout] Erro capturado no bloco CATCH da QuotePage:', err);
        }
      }, 500); // Delay de 500ms para garantir a renderização do modal


    } catch (error) {
      // Este bloco captura erros na preparação síncrona dos dados do modal.
      console.error('❌ [handleSubmit] Erro crítico ao preparar o resumo do orçamento:', error);
      alert('Ocorreu um erro ao preparar seu orçamento. Por favor, tente novamente.');
    } finally {
      // 4. REATIVAR O BOTÃO
      // O botão é reativado rapidamente, pois a UI não está mais bloqueada.
      setIsSubmitting(false);
      console.log('✅ [handleSubmit] Fluxo principal finalizado, botão reativado.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Carregando orçamento...</p>
          {retryCount > 0 && (
            <p className="text-sm text-gray-500 mt-2">
              Tentativa {retryCount + 1} de 4
            </p>
          )}
          <p className="text-xs text-gray-400 mt-4">
            Se estiver demorando muito, verifique sua conexão
          </p>
        </div>
      </div>
    );
  }

  if (loadError || !template) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {loadError ? 'Erro ao Carregar' : 'Orçamento Não Encontrado'}
          </h1>
          <p className="text-gray-600 mb-6">
            {loadError || 'Verifique o link e tente novamente'}
          </p>
          <button
            onClick={() => {
              setRetryCount(0);
              setLoadError(null);
              loadTemplateData();
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Tentar Novamente
          </button>
          <p className="text-sm text-gray-500 mt-4">
            Dica: Se o problema persistir, tente abrir o link no navegador padrão
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <CookieBanner />
      <div className={`min-h-screen ${tema.cores.bgPrincipal} py-4 sm:py-8 px-4`}>
        <div className="max-w-4xl mx-auto pb-6">
        {profile && (
          <div className={`${tema.cores.bgCard} ${tema.estilos.borderRadius} ${tema.estilos.shadow} p-5 sm:p-6 mb-6 text-center border ${tema.cores.borda}`}>
            {profile.profile_image_url && (
              <img
                src={profile.profile_image_url}
                alt={profile.nome_profissional}
                className={`w-32 h-32 sm:w-36 sm:h-36 rounded-full mx-auto mb-4 object-cover border-4 ${tema.cores.textoDestaque.replace('text-', 'border-')}`}
              />
            )}
            <h1 className={`text-2xl sm:text-3xl ${tema.estilos.fontHeading} ${tema.cores.textoPrincipal} mb-2 leading-tight`}>
              {profile.nome_profissional || 'Fotógrafo Profissional'}
            </h1>
            {profile.tipo_fotografia && (
              <p className="text-gray-600 mb-2 text-sm sm:text-base">{profile.tipo_fotografia}</p>
            )}
            {profile.apresentacao && (
              <p className="text-gray-700 mt-3 mb-4 text-sm sm:text-base leading-relaxed px-2">{profile.apresentacao}</p>
            )}

            {/* Rating Display */}
            <div className="mb-4">
              <QuoteHeaderRating
                userId={template.user_id}
                ratingMinimo={profile.rating_minimo_exibicao || 1}
                exibirAvaliacoes={profile.exibir_avaliacoes_publico ?? true}
                className="justify-center"
              />
            </div>

            {profile.slug_usuario && profile.perfil_publico && (profile.exibir_botao_perfil_completo ?? true) && (
              <div className="mb-4">
                <Link
                  to={`/${profile.slug_usuario}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-all shadow-sm hover:shadow"
                >
                  <User className="w-5 h-5" />
                  Ver Perfil Completo
                </Link>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mt-4 text-sm">
              {profile.whatsapp_principal && (
                <a
                  href={`https://wa.me/${profile.whatsapp_principal.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 hover:text-green-700 active:text-green-800 font-medium py-1 px-2 rounded touch-manipulation break-all"
                >
                  📱 {profile.whatsapp_principal}
                </a>
              )}
              {profile.email_recebimento && (
                <a
                  href={`mailto:${profile.email_recebimento}`}
                  className="text-blue-600 hover:text-blue-700 active:text-blue-800 font-medium py-1 px-2 rounded touch-manipulation break-all"
                >
                  ✉️ {profile.email_recebimento}
                </a>
              )}
              {profile.instagram && (
                <a
                  href={`https://instagram.com/${profile.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pink-600 hover:text-pink-700 active:text-pink-800 font-medium py-1 px-2 rounded touch-manipulation"
                >
                  📷 @{profile.instagram.replace('@', '')}
                </a>
              )}
            </div>
          </div>
        )}

        <div className={`${tema.cores.bgCard} ${tema.estilos.borderRadius} ${tema.estilos.shadow} p-4 sm:p-6 mb-6 border ${tema.cores.borda}`}>
          <h2 className={`text-xl sm:text-2xl ${tema.estilos.fontHeading} ${tema.cores.textoPrincipal} mb-4 leading-tight`}>
            {template.titulo_template || template.nome_template}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="nome-cliente" className={`block text-sm font-medium ${tema.cores.textoSecundario} mb-2`}>
                  Nome Completo *
                </label>
                <input
                  type="text"
                  id="nome-cliente"
                  name="nome_cliente"
                  value={formData.nome_cliente}
                  onChange={(e) =>
                    setFormData({ ...formData, nome_cliente: e.target.value })
                  }
                  className={`w-full px-4 py-3 text-base border ${tema.cores.borda} ${tema.cores.bgCard} ${tema.cores.textoPrincipal} rounded-lg focus:ring-2 focus:ring-opacity-50 touch-manipulation`}
                  required
                  aria-required="true"
                />
              </div>

              <div>
                <label htmlFor="email-cliente" className={`block text-sm font-medium ${tema.cores.textoSecundario} mb-2`}>
                  E-mail *
                </label>
                <input
                  type="email"
                  id="email-cliente"
                  name="email_cliente"
                  value={formData.email_cliente}
                  onChange={(e) =>
                    setFormData({ ...formData, email_cliente: e.target.value })
                  }
                  className={`w-full px-4 py-3 text-base border ${tema.cores.borda} ${tema.cores.bgCard} ${tema.cores.textoPrincipal} rounded-lg focus:ring-2 focus:ring-opacity-50 touch-manipulation`}
                  required
                  aria-required="true"
                />
              </div>

              <div>
                <label htmlFor="telefone-cliente" className={`block text-sm font-medium ${tema.cores.textoSecundario} mb-2`}>
                  Telefone/WhatsApp *
                </label>
                <input
                  type="tel"
                  id="telefone-cliente"
                  name="telefone_cliente"
                  value={formData.telefone_cliente}
                  onChange={(e) =>
                    setFormData({ ...formData, telefone_cliente: e.target.value })
                  }
                  className={`w-full px-4 py-3 text-base border ${tema.cores.borda} ${tema.cores.bgCard} ${tema.cores.textoPrincipal} rounded-lg focus:ring-2 focus:ring-opacity-50 touch-manipulation`}
                  required
                  aria-required="true"
                />
              </div>
            </div>

            {/* Campos de Localização e Data para Preços Dinâmicos */}
            {((template.sistema_sazonal_ativo && temporadas.length > 0) || (template.sistema_geografico_ativo && paises.length > 0) || agendaConfig?.agenda_ativa) && (
              <div className="border-t pt-6 mt-6">
                <h3 className={`text-lg font-semibold ${tema.cores.textoPrincipal} mb-4`}>
                  📍 Localização e Data
                </h3>

                {renderLocationDateFields()}
              </div>
            )}

            {camposExtras.map((campo) => (
              <div key={campo.id}>
                <label className={`block text-sm font-medium ${tema.cores.textoSecundario} mb-2`}>
                  {campo.label} {campo.obrigatorio && '*'}
                </label>
                {campo.tipo === 'textarea' ? (
                  <textarea
                    value={camposExtrasData[campo.id] || ''}
                    onChange={(e) =>
                      setCamposExtrasData({ ...camposExtrasData, [campo.id]: e.target.value })
                    }
                    placeholder={campo.placeholder}
                    required={campo.obrigatorio}
                    className={`w-full px-4 py-3 text-base border ${tema.cores.borda} ${tema.cores.bgCard} ${tema.cores.textoPrincipal} rounded-lg focus:ring-2 focus:ring-opacity-50 touch-manipulation`}
                    rows={4}
                  />
                ) : (
                  <input
                    type={campo.tipo}
                    value={camposExtrasData[campo.id] || ''}
                    onChange={(e) =>
                      setCamposExtrasData({ ...camposExtrasData, [campo.id]: e.target.value })
                    }
                    placeholder={campo.placeholder}
                    required={campo.obrigatorio}
                    className={`w-full px-4 py-3 text-base border ${tema.cores.borda} ${tema.cores.bgCard} ${tema.cores.textoPrincipal} rounded-lg focus:ring-2 focus:ring-opacity-50 touch-manipulation`}
                  />
                )}
              </div>
            ))}

            <div className="border-t pt-6" data-produtos-section>
              <div className="flex justify-between items-center mb-4"><h3 className={`text-xl font-semibold ${tema.cores.textoPrincipal} flex items-center gap-2`}><ShoppingCart className="w-6 h-6" />Selecione os Serviços</h3><button
                  type="button"
                  onClick={handleResetQuote}
                  className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Limpar Orçamento
                </button>
              </div>

              {/* Aviso de campos obrigatórios bloqueados */}
              {template?.bloquear_campos_obrigatorios && !fieldsValidation.canAddProducts && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex gap-3">
                    <Lock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-900 mb-1">
                        Campos obrigatórios devem ser preenchidos
                      </p>
                      <p className="text-sm text-yellow-800">
                        Complete os dados acima para liberar a seleção de produtos, valores e formas de pagamento.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* MODIFICAÇÃO: Layout dinâmico para produtos (Grid vs. Lista) */}
              <div
                className={
                  template?.layout_produtos === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 gap-4'
                    : 'space-y-4'
                }
                ref={produtosSectionRef} // 🔥 CORREÇÃO: A ref foi movida para este contêiner
              >
                {produtos.map((produto) => (
                  <div
                    key={produto.id}
                    className={`border ${tema.estilos.borderRadius} p-4 sm:p-5 transition-all ${tema.estilos.shadow} ${
                      selectedProdutos[produto.id]
                        ? `${tema.cores.textoDestaque.replace('text-', 'border-')} ${tema.cores.secundaria}`
                        : `${tema.cores.borda} ${tema.cores.bgHover}`
                    }`}
                  > 
                    {/* Layout dinâmico: 'linha' (sm:flex-row) ou 'quadro' (flex-col) para desktop */}
                    <div className={`flex flex-col gap-4 ${
                      template?.layout_produtos_desktop === 'quadro'
                        ? 'sm:items-center' // Layout Quadro: mantém flex-col e centraliza
                        : 'sm:flex-row sm:items-start' // Layout Linha: muda para flex-row
                    }`}>
                      {produto.mostrar_imagem && produto.imagem_url && (
                        (() => {
                          const sizeClasses = {
                            pequeno: 'w-32 h-32 sm:w-48 sm:h-48',
                            medio: 'w-48 h-48 sm:w-80 sm:h-80',
                            grande: 'w-full h-auto sm:w-96 sm:h-96',
                          };
                           const imageSize = template?.tamanho_imagem_grid || 'medio';
                           const finalClass = sizeClasses[imageSize as keyof typeof sizeClasses] || sizeClasses.medio;
                           return (
                             <div className="mx-auto sm:mx-0">
                               <ImageWithFallback
                                 src={produto.imagem_url}
                                 alt={produto.nome}
                                 className={`object-cover rounded-lg ${finalClass}`}
                                 fallbackClassName={`rounded-lg ${finalClass}`}
                                 retries={2}
                               />
                             </div>
                           );
                        })()
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-semibold text-base sm:text-lg ${tema.cores.textoPrincipal} flex flex-wrap items-center gap-2`}>
                          {produto.nome}
                          {produto.obrigatorio && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full whitespace-nowrap">
                              Obrigatório
                            </span>
                          )}
                        </h4>
                        {produto.resumo && (
                          <p className={`text-sm ${tema.cores.textoSecundario} mt-2 leading-relaxed`}>{produto.resumo}</p>
                        )}
                        {!template.ocultar_valores_intermediarios && (
                          <p className="text-lg sm:text-xl font-bold text-blue-600 mt-3">
                            {formatCurrency(produto.valor)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() =>
                          handleProdutoQuantityChange(
                            produto.id,
                            (selectedProdutos[produto.id] || 0) - 1
                          )
                        }
                        disabled={produto.obrigatorio && selectedProdutos[produto.id] === 1}
                        className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center bg-gray-200 hover:bg-gray-300 active:bg-gray-400 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-lg font-bold transition-colors"
                        aria-label="Diminuir quantidade"
                      >
                        -
                      </button>
                      <span className={`min-w-[60px] text-center font-bold text-xl ${tema.cores.textoPrincipal}`}>
                        {selectedProdutos[produto.id] || 0}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (!produto.obrigatorio && !fieldsValidation.canAddProducts) {
                            alert(fieldsValidation.validationMessage);
                            return;
                          }
                          handleProdutoQuantityChange(
                            produto.id,
                            (selectedProdutos[produto.id] || 0) + 1
                          );
                        }}
                        disabled={!produto.obrigatorio && !fieldsValidation.canAddProducts}
                        className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-lg font-bold transition-colors"
                        title={!produto.obrigatorio && !fieldsValidation.canAddProducts ? 'Preencha os campos obrigatórios primeiro' : ''}
                        aria-label="Aumentar quantidade"
                      >
                        {!produto.obrigatorio && !fieldsValidation.canAddProducts ? <Lock className="w-5 h-5" /> : '+'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {formasPagamento.length > 0 && fieldsValidation.canUsePaymentMethods && (
              <div className="border-t pt-6" data-pagamento-section>
                <h3 className={`text-xl font-semibold ${tema.cores.textoPrincipal} mb-4`}>
                  Forma de Pagamento
                </h3>

                <div className="space-y-3">
                  {formasPagamento.map((forma) => (
                    <label
                      key={forma.id}
                      className={`flex items-start gap-3 p-4 sm:p-5 border rounded-lg cursor-pointer transition-all touch-manipulation ${
                        selectedFormaPagamento === forma.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 active:border-gray-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="formaPagamento"
                        value={forma.id}
                        checked={selectedFormaPagamento === forma.id}
                        onChange={(e) => setSelectedFormaPagamento(e.target.value)}
                        className="w-5 h-5 mt-0.5 text-blue-600 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className={`font-semibold text-base ${tema.cores.textoPrincipal} mb-1`}>{forma.nome}</div>
                        <div className={`text-sm ${tema.cores.textoSecundario} leading-relaxed`}>
                          <div>
                            {forma.entrada_tipo === 'percentual'
                              ? `Entrada de ${forma.entrada_valor}%`
                              : `Entrada de ${formatCurrency(forma.entrada_valor)}`}
                          </div>
                          {forma.max_parcelas > 0 && (
                            <div className="mt-0.5">+ {forma.max_parcelas}x parcela{forma.max_parcelas > 1 ? 's' : ''}</div>
                          )}
                          {forma.acrescimo > 0 && (
                            <div className="text-orange-600 mt-0.5">(+{forma.acrescimo}% acréscimo)</div>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                {selectedFormaPagamento && (() => {
                  const formaPagamento = formasPagamento.find((f) => f.id === selectedFormaPagamento);
                  if (!formaPagamento) return null;

                  const total = calculateTotal();
                  const valorEntrada = formaPagamento.entrada_tipo === 'percentual'
                    ? (total * formaPagamento.entrada_valor) / 100
                    : formaPagamento.entrada_valor;
                  const saldoRestante = Math.max(0, total - valorEntrada);
                  const valorParcela = formaPagamento.max_parcelas > 0 ? saldoRestante / formaPagamento.max_parcelas : 0;

                  return (
                    <div className="mt-4 bg-blue-50 rounded-lg p-4 sm:p-5 space-y-3">
                      <h4 className={`font-semibold text-base ${tema.cores.textoPrincipal}`}>💳 Detalhes do Parcelamento</h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="bg-white rounded-lg p-3">
                          <div className={`${tema.cores.textoSecundario} text-xs mb-1`}>Entrada:</div>
                          <div className="font-bold text-blue-600 text-lg">
                            {formatCurrency(valorEntrada)}
                          </div>
                          {formaPagamento.entrada_tipo === 'percentual' && (
                            <div className="text-xs text-gray-500 mt-1">
                              ({formaPagamento.entrada_valor}% do total)
                            </div>
                          )}
                        </div>

                        {formaPagamento.max_parcelas > 0 && saldoRestante > 0.01 && (
                          <div className="bg-white rounded-lg p-3">
                            <div className={`${tema.cores.textoSecundario} text-xs mb-1`}>Parcelas:</div>
                            <div className="font-bold text-blue-600 text-lg">
                              {formaPagamento.max_parcelas}x de {formatCurrency(valorParcela)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Saldo restante
                            </div>
                          </div>
                        )}
                      </div>

                      {formaPagamento.acrescimo !== 0 && (
                        <div className="bg-white rounded-lg p-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">
                              {formaPagamento.acrescimo > 0 ? 'Acréscimo' : 'Desconto'} aplicado:
                            </span>
                            <span className={`font-bold ${formaPagamento.acrescimo > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                              {formaPagamento.acrescimo > 0 ? '+' : ''}{formaPagamento.acrescimo}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Cupom de Desconto */}
            {fieldsValidation.canUseCoupons && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  🎟️ Cupom de Desconto
                </h3>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label htmlFor="cupom-codigo" className="sr-only">
                    Código do cupom
                  </label>
                  <input
                    type="text"
                    id="cupom-codigo"
                    name="cupom_codigo"
                    value={cupomCodigo}
                    onChange={(e) => setCupomCodigo(e.target.value.toUpperCase())}
                    placeholder="Digite o código do cupom"
                    disabled={cupomAtivo}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed uppercase"
                    aria-describedby="cupom-mensagem"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (cupomAtivo) {
                      setCupomAtivo(false);
                      setCupomDesconto(0);
                      setCupomCodigo('');
                      setCupomMensagem('');
                    } else {
                      handleValidarCupom();
                    }
                  }}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    cupomAtivo
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {cupomAtivo ? 'Remover' : 'Aplicar'}
                </button>
              </div>

              {cupomMensagem && (
                <p
                  id="cupom-mensagem"
                  className={`text-sm mt-2 ${
                    cupomAtivo ? 'text-green-600' : 'text-red-600'
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  {cupomMensagem}
                </p>
              )}
              </div>
            )}

            {fieldsValidation.canSeeTotals && (
              <div className="border-t pt-6">
              <div className="bg-gray-50 rounded-lg p-4 sm:p-6 space-y-3">
                {(() => {
                  const breakdown = getPriceBreakdown();
                  const ocultarIntermediarios = template?.ocultar_valores_intermediarios;

                  return (
                    <>
                      {!ocultarIntermediarios && (
                        <>
                          <div className="flex items-start justify-between text-sm gap-2">
                            <span className={`${tema.cores.textoSecundario} flex-1`}>Subtotal (Produtos):</span>
                            <span className={`${tema.cores.textoPrincipal} font-semibold text-right`}>
                              {formatCurrency(breakdown.subtotal)}
                            </span>
                          </div>

                          {breakdown.ajusteSazonal !== 0 && (
                            <div className="flex items-start justify-between text-sm gap-2">
                              <span className={`${tema.cores.textoSecundario} flex-1`}>
                                Ajuste Sazonal ({breakdown.ajusteSazonal > 0 ? '+' : ''}
                                {((breakdown.ajusteSazonal / breakdown.subtotal) * 100).toFixed(1)}%):
                              </span>
                              <span
                                className={`font-semibold text-right ${
                                  breakdown.ajusteSazonal > 0 ? 'text-red-600' : 'text-green-600'
                                }`}
                              >
                                {breakdown.ajusteSazonal > 0 ? '+' : ''}
                                {formatCurrency(breakdown.ajusteSazonal)}
                              </span>
                            </div>
                          )}

                          {breakdown.ajusteGeografico.percentual !== 0 && (
                            <div className="flex items-start justify-between text-sm gap-2">
                              <span className={`${tema.cores.textoSecundario} flex-1`}>Ajuste Geográfico:</span>
                              <span
                                className={`font-semibold text-right ${
                                  breakdown.ajusteGeografico.percentual > 0 ? 'text-red-600' : 'text-green-600'
                                }`}
                              >
                                {breakdown.ajusteGeografico.percentual > 0 ? '+' : ''}
                                {formatCurrency(breakdown.ajusteGeografico.percentual)}
                              </span>
                            </div>
                          )}

                          {breakdown.taxaDeslocamento > 0 && (
                            <div className="flex items-start justify-between text-sm gap-2">
                              <span className={`${tema.cores.textoSecundario} flex-1`}>Taxa de Deslocamento:</span>
                              <span className="text-red-600 font-semibold text-right">
                                +{formatCurrency(breakdown.taxaDeslocamento)}
                              </span>
                            </div>
                          )}

                          {breakdown.acrescimoFormaPagamento !== 0 && (
                            <div className="flex items-start justify-between text-sm gap-2">
                              <span className={`${tema.cores.textoSecundario} flex-1`}>
                                {breakdown.acrescimoFormaPagamento > 0 ? 'Acréscimo' : 'Desconto'} Forma de Pagamento:
                              </span>
                              <span
                                className={`font-semibold text-right ${
                                  breakdown.acrescimoFormaPagamento > 0 ? 'text-red-600' : 'text-green-600'
                                }`}
                              >
                                {breakdown.acrescimoFormaPagamento > 0 ? '+' : ''}
                                {formatCurrency(breakdown.acrescimoFormaPagamento)}
                              </span>
                            </div>
                          )}

                          {breakdown.descontoCupom > 0 && (
                            <div className="flex items-start justify-between text-sm gap-2">
                              <span className={`${tema.cores.textoSecundario} flex-1`}>Desconto Cupom ({cupomDesconto}%):</span>
                              <span className="text-green-600 font-semibold text-right">
                                -{formatCurrency(breakdown.descontoCupom)}
                              </span>
                            </div>
                          )}
                        </>
                      )}

                      <div className="border-t pt-3 mt-3" ref={totalSectionRef} data-total-section>
                        <div className="flex items-center justify-between gap-2">
                          <span className={`${tema.cores.textoPrincipal} text-lg sm:text-xl md:text-2xl font-bold flex-1`}>Valor Total:</span>
                          <span className="text-blue-600 text-xl sm:text-2xl md:text-3xl font-bold text-right">{formatCurrency(calculateTotal())}</span>
                        </div>
                        {ocultarIntermediarios && (
                          <p className="text-xs text-gray-500 mt-2 text-center leading-relaxed">
                            Valor final já inclui todos os ajustes aplicáveis
                          </p>
                        )}
                        {selectedFormaPagamento && (() => {
                          const formaPagamento = formasPagamento.find((f) => f.id === selectedFormaPagamento);
                          if (!formaPagamento) return null;

                          const total = calculateTotal();
                          const valorEntrada = formaPagamento.entrada_tipo === 'percentual'
                            ? (total * formaPagamento.entrada_valor) / 100
                            : formaPagamento.entrada_valor;
                          const saldoRestante = Math.max(0, total - valorEntrada);
                          const valorParcela = formaPagamento.max_parcelas > 0 ? saldoRestante / formaPagamento.max_parcelas : 0;

                          return (
                            <div className="mt-3 pt-3 border-t border-gray-300">
                              <div className="text-sm text-gray-700 space-y-1"> 
                                <div className="flex justify-between items-center">
                                  <span className="font-medium">Forma de Pagamento:</span>
                                  <span className="font-semibold text-blue-600">{formaPagamento.nome}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span>Entrada:</span>
                                  <span className="font-semibold">{formatCurrency(valorEntrada)}</span>
                                </div>
                                {formaPagamento.max_parcelas > 0 && saldoRestante > 0.01 && (
                                  <div className="flex justify-between items-center">
                                    <span>Parcelas:</span>
                                    <span className="font-semibold">{formaPagamento.max_parcelas}x de {formatCurrency(valorParcela)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </>
                  );
                })()}
              </div>
              </div>
            )}

            <button
              type="submit"
              className={`w-full flex items-center justify-center gap-2 sm:gap-3 bg-green-600 hover:bg-green-700 active:opacity-90 text-white px-6 py-4 sm:py-5 ${tema.estilos.borderRadius} font-semibold text-base sm:text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${tema.estilos.shadow} ${tema.estilos.shadowHover} min-h-[56px] touch-manipulation`}
              disabled={
                isSubmitting ||
                !profile?.whatsapp_principal ||
                !fieldsValidation.canUseWhatsApp ||
                (disponibilidade?.modo_aviso === 'restritivo' &&
                 (disponibilidade?.status === 'ocupada' || disponibilidade?.status === 'bloqueada'))
              }
              title={
                isSubmitting
                  ? 'Salvando...'
                  : !profile?.whatsapp_principal
                  ? 'O fotógrafo não configurou um número para negociação via WhatsApp.'
                  : !fieldsValidation.canUseWhatsApp
                  ? 'Preencha todos os campos obrigatórios primeiro'
                  : (disponibilidade?.modo_aviso === 'restritivo' &&
                     (disponibilidade?.status === 'ocupada' || disponibilidade?.status === 'bloqueada'))
                  ? 'Esta data não está disponível. Por favor, escolha outra data.'
                  : 'Prosseguir para o envio'
              }
              data-fixed-button
            >
              {(!fieldsValidation.canUseWhatsApp ||
                isSubmitting ||
                (disponibilidade?.modo_aviso === 'restritivo' &&
                 (disponibilidade?.status === 'ocupada' || disponibilidade?.status === 'bloqueada')))
                ? <Lock className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" /> // Mantém o ícone de bloqueio quando desabilitado
                : <Send className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />}
              <span className="leading-tight">
                {isSubmitting ? 'Salvando e Finalizando...' : (template?.texto_botao_envio || 'Negociar no WhatsApp')}
              </span>
            </button>
          </form>

          {/* Rate Photographer Button */}
          {profile && (
            <div className="mt-4">
              <RatePhotographerButton
                userId={template.user_id}
                templateId={template.id}
                profileName={profile.nome_profissional || 'Fotógrafo'}
                aceitaAvaliacoes={profile.aceita_avaliacoes ?? true}
                aprovacaoAutomatica={profile.aprovacao_automatica_avaliacoes ?? false}
                theme={{
                  primaryColor: 'yellow',
                  buttonColor: `${tema.cores.secundaria || 'bg-yellow-500'} hover:bg-yellow-600`
                }}
              />
            </div>
          )}
        </div>

        {template && profile && (
          <div className="mt-8">
            <PublicReviews
              userId={template.user_id}
              ratingMinimo={profile.rating_minimo_exibicao || 1}
              maxVisible={6}
            />
          </div>
        )}
      </div>

      <FloatingTotalPanel
        calculateTotal={calculateTotal}
        selectedProdutos={selectedProdutos}
        produtos={produtos}
        tema={tema}
        ocultarValoresIntermediarios={template?.ocultar_valores_intermediarios || false}
        produtosSectionRef={produtosSectionRef}
        totalSectionRef={totalSectionRef}
      />

      {/* Modal de Resumo e Envio */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Quase lá!</h2>
                  <p className="text-gray-600 mt-1">
                    Confira o resumo e envie seu pedido para{' '}
                    <strong>{summaryData.profileName}</strong>.
                  </p>
                </div>
                <button
                  onClick={() => setShowSummaryModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 border">
                <h3 className="font-semibold text-gray-800 mb-2">Seus Dados:</h3>
                <p className="text-sm">
                  <strong>Nome:</strong> {summaryData.clientData.nome}
                </p>
                <p className="text-sm">
                  <strong>Email:</strong> {summaryData.clientData.email}
                </p>
                <p className="text-sm">
                  <strong>Telefone:</strong> {summaryData.clientData.telefone}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border">
                <h3 className="font-semibold text-gray-800 mb-2">Detalhes do Evento:</h3>
                <p className="text-sm">
                  <strong>Orçamento:</strong> {summaryData.eventData.tipo}
                </p>
                <p className="text-sm">
                  <strong>Data:</strong> {summaryData.eventData.data}
                </p>
                <p className="text-sm">
                  <strong>Cidade:</strong> {summaryData.eventData.cidade}
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">Itens Selecionados:</h3>
                <ul className="space-y-1 text-sm">
                  {summaryData.quoteData.items.map((item, index) => (
                    <li key={index} className="flex justify-between">
                      <span>
                        {item.quantity}x {item.name}
                      </span>
                      <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                    </li>
                  ))}
                </ul>
                <div className="border-t mt-3 pt-3 flex justify-between font-bold text-lg text-blue-800">
                  <span>Valor Total:</span>
                  <span>{formatCurrency(summaryData.quoteData.total)}</span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setAutoRedirectActive(false); // Para o contador se o usuário decidir voltar
                      setShowSummaryModal(false);
                    }}
                    className="w-full sm:w-auto px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Voltar
                  </button>
                  <a
                    href={summaryData.waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex-1 flex items-center justify-center gap-3 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-md"
                    onClick={() => {
                      analytics?.markAsConverted(); // 🔥 CORREÇÃO: Conversão marcada no clique real!
                      setAutoRedirectActive(false); // Para o contador
                      // Não precisa fechar o modal aqui, pois o clique no link já navega para outra aba
                    }}
                  >
                    <Send className="w-6 h-6" />
                    Enviar via WhatsApp {autoRedirectActive && `(${countdown}s)`}
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAutoRedirectActive(false);
                  }}
                  className="w-full text-sm text-gray-600 hover:text-gray-800"
                  disabled={!autoRedirectActive}
                >
                  {autoRedirectActive ? 'Cancelar envio automático' : 'Envio automático cancelado'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rodapé */}
      <footer ref={footerRef} className="bg-gray-100 py-8 text-center text-sm text-gray-500"></footer>
    </div>
    </>
  );
}
