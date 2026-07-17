import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLeadCapture } from '../hooks/useLeadCapture';
import { useRequiredFieldsValidation } from '../hooks/useRequiredFieldsValidation';
import { useQuoteAnalytics } from '../hooks/useQuoteAnalytics';
import { formatCurrency, formatDuration } from '../lib/utils';
import { ShoppingCart, Send, Lock, User, AlertCircle, Check, X, Trash2 } from 'lucide-react';
import { checkAvailability, getOrCreateAgendaConfig, type AvailabilityResult } from '../services/availabilityService';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { ProductGalleryCarousel } from '../components/ui/ProductGalleryCarousel';
import { CookieBanner } from '../components/CookieBanner';
import { MobileDatePicker } from '../components/MobileDatePicker';
import { AvailabilityIndicator } from '../components/AvailabilityIndicator';
import { generateWhatsAppMessage, generateWaLinkToPhotographer } from '../lib/whatsappMessageGenerator';
import { getTema, TemaType } from '../lib/themes'; // Remove unused theme helpers
import { getThemeInlineStyles } from '../lib/themeStyles';
import { PublicReviews } from '../components/PublicReviews';
import { FloatingTotalPanel } from '../components/FloatingTotalPanel';
import { QuoteHeaderRating } from '../components/QuoteHeaderRating';
import { FormattedDescription } from '../components/ui/FormattedDescription';
import { detectBrowser, getReferrer, logBrowserInfo } from '../lib/browserDetection';
import { QuoteDarkStudio } from '../components/quote-themes/QuoteDarkStudio';
import { QuotePromocional } from '../components/quote-themes/QuotePromocional';
import { QuoteOferta } from '../components/quote-themes/QuoteOferta';
import { QuotePdfElegante } from '../components/quote-themes/QuotePdfElegante';
import { QuotePdfElegante2 } from '../components/quote-themes/QuotePdfElegante2';
import { QuoteNatal } from '../components/quote-themes/QuoteNatal';
import { QuoteRevellon } from '../components/quote-themes/QuoteRevellon';
import { secureLocalStorage } from '../lib/secureStorage';

interface Produto {
  id: string;
  provedor_id?: string | null;
  nome: string;
  resumo: string;
  descricao?: string;
  valor: number;
  unidade: string;
  obrigatorio: boolean;
  imagem_url?: string;
  mostrar_imagem?: boolean;
  imagens?: string[];
  carrossel_automatico?: boolean;
  /** false = botão toggle em vez de +/- quantidade */
  permite_multiplas_unidades?: boolean;
  /** 0–100. Desconto aplicado ao valor unitário */
  desconto_percentual?: number;
  duracao_minutos?: number | null;
  destacar_produto?: boolean;
  destaque_texto?: string | null;
  keywords_upsell?: string | null;
  brindes_vinculados?: string[] | null;
}

interface FormaPagamento {
  id: string;
  nome: string;
  entrada_tipo: 'percentual' | 'fixo';
  entrada_valor: number;
  max_parcelas: number;
  acrescimo: number;
  is_default?: boolean;
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

  // Black Friday countdown timer state
  const [blackFridayTime, setBlackFridayTime] = useState(10800); // 3 horas em segundos
  useEffect(() => {
    if (template?.tema === 'black-friday') {
      const interval = setInterval(() => {
        setBlackFridayTime((prev) => (prev > 0 ? prev - 1 : 10800));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [template?.tema]);

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
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; telefone?: string }>({});
  const [camposExtrasData, setCamposExtrasData] = useState<Record<string, string>>({});
  const [selectedFormaPagamento, setSelectedFormaPagamento] = useState<string>('');

  // Não auto-selecionamos a forma de pagamento por padrão para permitir que o cliente escolha ativamente.

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
      items: [] as { name: string; quantity: number; price: number; permite_multiplas_unidades?: boolean }[],
      paymentMethod: ''
    }
  });
  const [_copied, _setCopied] = useState(false);

  const [hasSubmitted, setHasSubmitted] = useState(false);

  // 📅 Sistema de Verificação de Disponibilidade
  const [disponibilidade, setDisponibilidade] = useState<AvailabilityResult | null>(null);
  const [horarioSelecionado, setHorarioSelecionado] = useState<string>('');
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [agendaConfig, setAgendaConfig] = useState<any>(null);
  const [_feriadosNacionais, _setFeriadosNacionais] = useState<string[]>([]); // Estado para feriados da API
  const [datasBloqueadas, setDatasBloqueadas] = useState<string[]>([]);
  const [periodosBloqueados, setPeriodosBloqueados] = useState<{data_inicio: string, data_fim: string}[]>([]);

  // 📌 Ref para o rodapé
  const produtosSectionRef = useRef<HTMLDivElement>(null);
  const totalSectionRef = useRef<HTMLDivElement>(null);
  const firstProductRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null); // Mantido caso seja usado em outro lugar

  // 🎁 Upselling
  const [upsellProdutos, setUpsellProdutos] = useState<Produto[]>([]);
  const [brindesProdutos, setBrindesProdutos] = useState<Produto[]>([]);
  const [selectedUpsellIds, setSelectedUpsellIds] = useState<Set<string>>(new Set());
  const upsellScrollRef = useRef<HTMLDivElement>(null);
  const [upsellCanScrollRight, setUpsellCanScrollRight] = useState(false);

  const normalizeText = (text: string) => {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  };

  const getSignificantWords = (text: string) => {
    const stopWords = new Set(['de', 'do', 'da', 'o', 'a', 'e', 'com', 'para', 'em', 'um', 'uma', 'os', 'as', 'dos', 'das']);
    const normalized = normalizeText(text);
    return normalized
      .split(/\s+/)
      .map(w => w.replace(/[^a-z0-9]/g, ''))
      .filter(w => w.length > 2 && !stopWords.has(w));
  };

  const filteredUpsellProdutos = useMemo(() => {
    const cartTextNormalized = normalizeText(
      produtos
        .filter(p => selectedProdutos[p.id] > 0)
        .map(p => `${p.nome} ${p.resumo || p.descricao || ''}`)
        .join(' ')
    );

    return upsellProdutos.filter(produto => {
      // 1. Se o produto de upsell estiver selecionado como brinde em algum pacote selecionado,
      // ele é ocultado da vitrine de upsells.
      const isIncludedAsBrinde = produtos
        .filter(p => selectedProdutos[p.id] > 0)
        .some(p => {
          const brindes = p.brindes_vinculados;
          return Array.isArray(brindes) && brindes.includes(produto.id);
        });

      if (isIncludedAsBrinde) return false;

      // 2. Correspondência automática e inteligente de palavras-chave
      const activationTerms = getSignificantWords(produto.nome);
      const isRedundant = activationTerms.some(term => {
        // Ignorar termos muito genéricos para evitar falsos positivos
        const genericTerms = new Set(['extra', 'combo', 'pacote', 'adicional', 'premium', 'simples', 'completo']);
        if (genericTerms.has(term)) return false;
        return cartTextNormalized.includes(term);
      });

      return !isRedundant;
    });
  }, [upsellProdutos, produtos, selectedProdutos]);

  const handleToggleUpsell = (id: string) => {
    setSelectedUpsellIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const upsellSubtotal = filteredUpsellProdutos
    .filter(p => selectedUpsellIds.has(p.id))
    .reduce((acc, p) => {
      const d = p.desconto_percentual ?? 0;
      return acc + p.valor * (1 - d / 100);
    }, 0);

  // Detectar se o carrossel pode rolar para a direita
  const checkUpsellScroll = () => {
    const el = upsellScrollRef.current;
    if (!el) return;
    setUpsellCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    checkUpsellScroll();
    const el = upsellScrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkUpsellScroll, { passive: true });
    window.addEventListener('resize', checkUpsellScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', checkUpsellScroll);
      window.removeEventListener('resize', checkUpsellScroll);
    };
  }, [filteredUpsellProdutos]);

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

  // Hook para carregar dados de um lead existente se estiver em modo de edição
  useEffect(() => {
    const loadEditLeadData = async () => {
      const editLeadId = new URLSearchParams(window.location.search).get('editLead');
      if (!editLeadId || !template || loading) return;
      
      try {
        const { data: leadData, error } = await supabase
          .from('leads')
          .select('*')
          .eq('id', editLeadId)
          .maybeSingle();

        if (error || !leadData) {
          console.error("Erro ao carregar o lead para edição", error);
          return;
        }

        // Populando dados do formulário principal
        setFormData(prev => ({
          ...prev,
          nome_cliente: leadData.nome_cliente || prev.nome_cliente,
          email_cliente: leadData.email_cliente || prev.email_cliente,
          telefone_cliente: leadData.telefone_cliente || prev.telefone_cliente,
        }));

        // Recuperar opções do orcamento_detalhe
        const detalhes = leadData.orcamento_detalhe || {};
        
        if (detalhes.selectedProdutos && Object.keys(detalhes.selectedProdutos).length > 0) {
          setSelectedProdutos(detalhes.selectedProdutos);
        } else if (detalhes.produtos && Array.isArray(detalhes.produtos)) {
          const preSelected: Record<string, number> = {};
          detalhes.produtos.forEach((p: any) => {
            preSelected[p.produto_id || p.id] = p.quantidade || 1;
          });
          if (Object.keys(preSelected).length > 0) setSelectedProdutos(preSelected);
        }

        if (detalhes.customFieldsData) {
          setCamposExtrasData(detalhes.customFieldsData);
        }

        if (detalhes.selectedFormaPagamento || detalhes.forma_pagamento_id || detalhes.paymentMethod?.id) {
          setSelectedFormaPagamento(detalhes.selectedFormaPagamento || detalhes.forma_pagamento_id || detalhes.paymentMethod?.id);
        }

        if (leadData.data_evento) setDataEvento(leadData.data_evento);

        if (leadData.cidade_evento) {
           const cidadeId = leadData.cidade_evento;
           setCidadeSelecionada(cidadeId);
           const cidadeObj = cidades.find(c => c.id === cidadeId || c.nome === cidadeId);
           if (cidadeObj) {
             setCidadeSelecionada(cidadeObj.id);
             setSelectedEstado(cidadeObj.estado_id);
             const estadoObj = estados.find(e => e.id === cidadeObj.estado_id);
             if (estadoObj) {
               setSelectedPais(estadoObj.pais_id);
             }
           }
        }
      } catch (err) {
        console.error("Erro no loadEditLeadData", err);
      }
    };

    loadEditLeadData();
  }, [template, loading, cidades, estados]);



  // ⏱️ Cálculo de Duração Total dos Produtos Selecionados
  const activeDuration = useMemo(() => {
    const totalDuration = Object.entries(selectedProdutos).reduce((acc, [produtoId, quantity]) => {
      if (quantity <= 0) return acc;
      const prod = produtos.find(p => p.id === produtoId);
      if (prod && prod.duracao_minutos) {
        return acc + (prod.duracao_minutos * quantity);
      }
      return acc;
    }, 0);
    return totalDuration > 0 ? totalDuration : 60;
  }, [selectedProdutos, produtos]);

  useEffect(() => {
    setHorarioSelecionado('');
  }, [dataEvento]);

  useEffect(() => {
    let isCancelled = false;

    if (dataEvento && template?.user_id) {
      console.log('[QuotePage] 🔄 Iniciando verificação de disponibilidade', {
        dataEvento,
        userId: template.user_id,
        duration: activeDuration,
        timestamp: new Date().toISOString(),
      });

      // Interceptar e evitar chamadas desnecessárias se o dia da semana estiver bloqueado no template
      const dateObj = parseLocalYMD(dataEvento);
      const dayOfWeek = dateObj.getDay();
      if (template?.dias_semana_bloqueados?.includes(dayOfWeek)) {
        console.log('[QuotePage] 🚫 Dia da semana bloqueado localmente no template:', dayOfWeek);
        setDisponibilidade({
          disponivel: false,
          status: 'bloqueada',
          eventos_atual: 0,
          eventos_max: 0,
          modo_aviso: 'restritivo',
          bloqueada: true,
          mensagem: 'Este dia da semana não está disponível para este orçamento.',
          cor_status: 'bg-red-500 text-white'
        });
        setCheckingAvailability(false);
        return;
      }

      setDisponibilidade(null);
      setCheckingAvailability(true);

      checkAvailability(template.user_id, dataEvento, activeDuration)
        .then((result) => {
          if (!isCancelled) {
            console.log('[QuotePage] ✅ Disponibilidade recebida', {
              dataEvento,
              status: result.status,
              disponivel: result.disponivel,
              slotsCount: result.slots?.length || 0,
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
  }, [dataEvento, template?.user_id, template?.dias_semana_bloqueados, activeDuration]);

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
  const _hasQuoteInProgress = useMemo(() => {
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
  void _hasQuoteInProgress;



  // Chave para salvar/carregar o orçamento do localStorage
  const storageKey = useMemo(() => (template ? `priceus-quote-${template.id}` : null), [template]);

  const customFont = template?.fonte_personalizada || 'Inter';
  const customFontFamily = `'${customFont}', sans-serif`;

  const inlineStyles = useMemo(() => {
    const baseThemeName = template?.tema_personalizado?.tema_base || template?.tema || 'moderno';
    const baseStyles = getThemeInlineStyles(baseThemeName);
    
    if (template?.tema_personalizado) {
      const customCores = template.tema_personalizado.cores || {};
      const overrides: any = {};
      
      if (customCores.bgPrincipal) {
        overrides.pageWrapper = {
          ...baseStyles.pageWrapper,
          background: customCores.bgPrincipal,
          backgroundImage: 'none'
        };
      }
      if (customCores.bgCard) {
        overrides.profileCard = { ...baseStyles.profileCard, background: customCores.bgCard };
        overrides.quoteCard = { ...baseStyles.quoteCard, background: customCores.bgCard };
        overrides.productCard = { ...baseStyles.productCard, background: customCores.bgCard };
      }
      if (customCores.primaria) {
        overrides.submitButton = {
          ...baseStyles.submitButton,
          background: customCores.primaria,
          backgroundImage: 'none'
        };
        overrides.avatarBorder = {
          ...baseStyles.avatarBorder,
          borderColor: customCores.primaria
        };
      }
      if (customCores.textoPrincipal) {
        overrides.heading1 = { ...baseStyles.heading1, color: customCores.textoPrincipal };
        overrides.heading2 = { ...baseStyles.heading2, color: customCores.textoPrincipal };
        overrides.textColor = customCores.textoPrincipal;
      }
      if (customCores.textoSecundario) {
        overrides.textColorSecondary = customCores.textoSecundario;
        overrides.label = { ...baseStyles.label, color: customCores.textoSecundario };
      }
      if (customCores.borda) {
        overrides.profileCard = { ...overrides.profileCard, ...baseStyles.profileCard, borderColor: customCores.borda };
        overrides.quoteCard = { ...overrides.quoteCard, ...baseStyles.quoteCard, borderColor: customCores.borda };
        overrides.productCard = { ...overrides.productCard, ...baseStyles.productCard, borderColor: customCores.borda };
      }
      
      return {
        ...baseStyles,
        ...overrides,
        accentColor: customCores.primaria || baseStyles.accentColor,
      };
    }
    
    return baseStyles;
  }, [template, template?.tema_personalizado]);

  const wrapWithFonts = (children: React.ReactNode) => {
    let customStyleBlock = '';
    if (template?.tema_personalizado) {
      const customCores = template.tema_personalizado.cores || {};
      customStyleBlock = `
        ${customCores.bgPrincipal ? `
          .quote-page-root,
          .quote-page-root .min-h-screen,
          .quote-page-root .promo-root,
          .quote-page-root .oferta-root,
          .quote-page-root .nt-root,
          .quote-page-root .rv-root {
            background: ${customCores.bgPrincipal} !important;
            background-image: none !important;
          }
        ` : ''}
        ${customCores.bgCard ? `
          .quote-page-root .promo-card,
          .quote-page-root .oferta-card,
          .quote-page-root .nt-card,
          .quote-page-root .rv-card,
          .quote-page-root .pdf-prod-card,
          .quote-page-root [className*="bgCard"],
          .quote-page-root [class*="bgCard"],
          .quote-page-root div[style*="background"] {
            background-color: ${customCores.bgCard} !important;
            background-image: none !important;
          }
        ` : ''}
        ${customCores.primaria ? `
          .quote-page-root button[type="submit"],
          .quote-page-root .promo-shimmer-btn,
          .quote-page-root .oferta-submit-btn,
          .quote-page-root button[data-fixed-button],
          .quote-page-root .submit-button,
          .quote-page-root button:not([type="button"]) {
            background: ${customCores.primaria} !important;
            background-image: none !important;
            color: #ffffff !important;
            box-shadow: 0 4px 14px ${customCores.primaria}40 !important;
          }
          .quote-page-root .avatar-border,
          .quote-page-root [class*="avatar"] {
            border-color: ${customCores.primaria} !important;
          }
        ` : ''}
        ${customCores.textoPrincipal ? `
          .quote-page-root h1,
          .quote-page-root h2,
          .quote-page-root h3,
          .quote-page-root h4,
          .quote-page-root h5,
          .quote-page-root h6,
          .quote-page-root strong,
          .quote-page-root .text-gray-900,
          .quote-page-root .text-slate-900,
          .quote-page-root .text-neutral-900 {
            color: ${customCores.textoPrincipal} !important;
          }
        ` : ''}
        ${customCores.textoSecundario ? `
          .quote-page-root p,
          .quote-page-root span,
          .quote-page-root label,
          .quote-page-root .text-gray-500,
          .quote-page-root .text-gray-600,
          .quote-page-root .text-slate-600,
          .quote-page-root .text-neutral-500 {
            color: ${customCores.textoSecundario} !important;
          }
        ` : ''}
        ${customCores.borda ? `
          .quote-page-root .border,
          .quote-page-root [class*="border-"],
          .quote-page-root hr,
          .quote-page-root div[style*="border"] {
            border-color: ${customCores.borda} !important;
          }
        ` : ''}
      `;
    }

    return (
      <div className="quote-page-root" style={{ fontFamily: customFontFamily, minHeight: '100vh' }}>
        {/* Preload custom font */}
        <link
          rel="stylesheet"
          href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(customFont)}:wght@300;400;500;600;700;800;900&display=swap`}
        />
        <style>{`
          .quote-page-root,
          .quote-page-root * {
            font-family: '${customFont}', sans-serif !important;
          }
          /* Preserve icons */
          .quote-page-root [class*="lucide"],
          .quote-page-root svg,
          .quote-page-root svg *,
          .quote-page-root [class*="lucide"] * {
            font-family: inherit !important;
          }
          /* Preserve monospace for code/countdown/etc */
          .quote-page-root .font-mono,
          .quote-page-root .font-mono *,
          .quote-page-root [style*="monospace"],
          .quote-page-root [style*="monospace"] * {
            font-family: monospace, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
          }
          ${customStyleBlock}
        `}</style>
        {children}
      </div>
    );
  };

  // Efeito para SALVAR o estado do orçamento no localStorage sempre que algo mudar
  useEffect(() => {
    // Não salva se não tiver a chave (template não carregado) ou se estiver carregando dados
    if (!storageKey || loading) return;

    const quoteStateToSave = {
      selectedProdutos,
      selectedUpsellIds: Array.from(selectedUpsellIds),
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
      secureLocalStorage.setItem(storageKey, JSON.stringify(quoteStateToSave));
    } catch (error) {
      console.error('Falha ao salvar orçamento no localStorage:', error);
    }
  }, [storageKey, loading, selectedProdutos, selectedUpsellIds, formData, camposExtrasData, selectedFormaPagamento, dataEvento, cidadeSelecionada, selectedEstado, selectedPais, cupomCodigo, cupomAtivo, cupomDesconto, cupomMensagem]);


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
          .select('*, tema_personalizado:temas_personalizados(*)')
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
          .select('*, tema_personalizado:temas_personalizados(*)')
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

      // 🤝 Collab: Buscar perfis de parceiros se houver provedor_id
      const allProductList = [
        ...(produtosData || []),
      ];

      // Buscar produtos de upsell antes para unificar a busca de perfis de collab
      let upsellData: any[] = [];
      if (
        templateData.upsell_ativo &&
        templateData.upsell_template_id &&
        Array.isArray(templateData.upsell_produtos_ids) &&
        templateData.upsell_produtos_ids.length > 0
      ) {
        try {
          const { data: fetchedUpsell } = await supabase
            .from('produtos')
            .select('*')
            .in('id', templateData.upsell_produtos_ids)
            .order('ordem');
          upsellData = fetchedUpsell || [];
        } catch (e) {
          console.warn('[QuotePage] ⚠️ Erro ao carregar produtos upsell:', e);
        }
      }

      // Buscar produtos de brindes
      let brindesData: any[] = [];
      if (
        templateData.brindes_ativo &&
        templateData.brindes_template_id &&
        Array.isArray(templateData.brindes_produtos_ids) &&
        templateData.brindes_produtos_ids.length > 0
      ) {
        try {
          const { data: fetchedBrindes } = await supabase
            .from('produtos')
            .select('*')
            .in('id', templateData.brindes_produtos_ids)
            .order('ordem');
          brindesData = fetchedBrindes || [];
        } catch (e) {
          console.warn('[QuotePage] ⚠️ Erro ao carregar produtos brindes:', e);
        }
      }

      const uniqueProviderIds = Array.from(
        new Set(
          [
            ...allProductList.map(p => p.provedor_id),
            ...upsellData.map(p => p.provedor_id),
            ...brindesData.map(p => p.provedor_id)
          ].filter(id => id && id !== templateData.user_id)
        )
      );

      const profileMap: Record<string, any> = {};
      if (uniqueProviderIds.length > 0) {
        try {
          const { data: colabs } = await supabase
            .from('profiles')
            .select('id, nome_profissional, nome_admin, nome')
            .in('id', uniqueProviderIds);
          colabs?.forEach(p => {
            profileMap[p.id] = p;
          });
        } catch (err) {
          console.error('Erro ao carregar perfis de collab:', err);
        }
      }

      // Processar nomes dos produtos com a assinatura de parceria
      const processedProdutos = (produtosData || []).map((p: any) => {
        if (templateData.collab_ativo && templateData.exibir_nome_parceiro && p.provedor_id && p.provedor_id !== templateData.user_id) {
          const partner = profileMap[p.provedor_id];
          const name = partner ? (partner.nome_profissional || partner.nome_admin || partner.nome) : '';
          if (name) {
            return { ...p, nome: `${p.nome} (🤝 Parceria: ${name})` };
          }
        }
        return p;
      });

      const processedUpsell = upsellData.map((p: any) => {
        if (templateData.collab_ativo && templateData.exibir_nome_parceiro && p.provedor_id && p.provedor_id !== templateData.user_id) {
          const partner = profileMap[p.provedor_id];
          const name = partner ? (partner.nome_profissional || partner.nome_admin || partner.nome) : '';
          if (name) {
            return { ...p, nome: `${p.nome} (🤝 Parceria: ${name})` };
          }
        }
        return p;
      });

      const processedBrindes = brindesData.map((p: any) => {
        if (templateData.collab_ativo && templateData.exibir_nome_parceiro && p.provedor_id && p.provedor_id !== templateData.user_id) {
          const partner = profileMap[p.provedor_id];
          const name = partner ? (partner.nome_profissional || partner.nome_admin || partner.nome) : '';
          if (name) {
            return { ...p, nome: `${p.nome} (🤝 Parceria: ${name})` };
          }
        }
        return p;
      });

      // Deduplicação do upsell
      const mainNames = processedProdutos.map((p: any) => p.nome.toLowerCase().trim());
      const filteredUpsell = processedUpsell.filter((p: any) => !mainNames.includes(p.nome.toLowerCase().trim()));

      setTemplate(templateData);
      setProfile(profileData);
      setProdutos(processedProdutos);
      setFormasPagamento(pagamentosData || []);
      setCamposExtras(camposData || []);
      setUpsellProdutos(filteredUpsell);
      setBrindesProdutos(processedBrindes);
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

      let loadedFromStorage = false;
      if (storageKey) {
        try {
          const savedQuote = secureLocalStorage.getItem(storageKey);
          if (savedQuote) {
            console.log('✅ [QuotePage] Orçamento encontrado no localStorage. Carregando...');
            const parsedState = JSON.parse(savedQuote);

            // Restaura o estado do componente com os dados salvos
            setSelectedProdutos(parsedState.selectedProdutos || {});
            setSelectedUpsellIds(new Set(parsedState.selectedUpsellIds || []));
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
            loadedFromStorage = true;
          }
        } catch (e) {
          console.error('Falha ao carregar orçamento do localStorage:', e);
        }
      }

      if (!loadedFromStorage) {
        const initialSelected: Record<string, number> = {};
        produtosData?.forEach((produto) => {
          if (produto.obrigatorio) {
            initialSelected[produto.id] = 1;
          }
        });
        setSelectedProdutos(initialSelected);
      }
    } catch (error: any) {
      // Lógica para carregar o orçamento salvo do localStorage
      if (storageKey) {
        try {
          const savedQuote = secureLocalStorage.getItem(storageKey);
          if (savedQuote) {
            console.log('✅ [QuotePage] Orçamento encontrado no localStorage. Carregando...');
            const parsedState = JSON.parse(savedQuote);

            // Restaura o estado do componente com os dados salvos
            setSelectedProdutos(parsedState.selectedProdutos || {});
            setSelectedUpsellIds(new Set(parsedState.selectedUpsellIds || []));
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
    const subtotalProdutos = produtos.reduce((total, produto) => {
      const qty = selectedProdutos[produto.id] || 0;
      const desconto = produto.desconto_percentual ?? 0;
      const valorComDesconto = produto.valor * (1 - desconto / 100);
      return total + valorComDesconto * qty;
    }, 0);
    // Adicionar produtos de upsell selecionados
    const subtotalUpsell = filteredUpsellProdutos
      .filter(p => selectedUpsellIds.has(p.id))
      .reduce((acc, p) => {
        const d = p.desconto_percentual ?? 0;
        return acc + p.valor * (1 - d / 100);
      }, 0);
    return subtotalProdutos + subtotalUpsell;
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

    const total = calculateTotal();
    const valorUpsell = upsellSubtotal;
    const valorBase = total - valorUpsell;

    const ocultarDeslocamento = template?.ocultar_taxa_deslocamento || false;
    return {
      subtotal,
      ajusteSazonal,
      ajusteGeografico: {
        percentual: geoAdjustment.percentual,
        taxa: ocultarDeslocamento ? 0 : geoAdjustment.taxa,
      },
      taxaDeslocamento: ocultarDeslocamento ? 0 : geoAdjustment.taxa,
      acrescimoFormaPagamento,
      descontoCupom,
      total,
      valorBase,
      valorUpsell,
    };
  };

  const priceBreakdown = useMemo(() => {
    return getPriceBreakdown();
  }, [
    selectedProdutos,
    selectedUpsellIds,
    selectedFormaPagamento,
    dataEvento,
    cidadeSelecionada,
    selectedEstado,
    selectedPais,
    cupomCodigo,
    cupomAtivo,
    cupomDesconto,
    template,
    formasPagamento,
    upsellSubtotal
  ]);

  const getDynamicMaxParcelas = (forma: any) => {
    if (!forma) return 0;
    let max = forma.max_parcelas;
    if (template?.limitar_parcelas_pelo_evento && dataEvento) {
      // Cartão de crédito: fotógrafo recebe normalmente, sem risco de calote.
      // Ignora o limite de data para formas de pagamento com "cartão" ou "credit" no nome.
      const normalizedNome = (forma.nome || '').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // remove acentos
      const isCartao =
        normalizedNome.includes('cartao') ||
        normalizedNome.includes('credit') ||
        normalizedNome.includes('cartao de credito') ||
        normalizedNome.includes('parcelado no cartao');

      if (!isCartao) {
        const hoje = new Date();
        const [year, month, day] = dataEvento.split('-');
        const dataEv = new Date(Number(year), Number(month) - 1, Number(day));
        const diffAnos = dataEv.getFullYear() - hoje.getFullYear();
        const diffMeses = dataEv.getMonth() - hoje.getMonth();
        const mesesRestantes = diffAnos * 12 + diffMeses;
        max = Math.min(max, Math.max(1, mesesRestantes));
      }
    }
    return max;
  };

  const formasPagamentoProcessadas = formasPagamento.map((forma) => ({
    ...forma,
    max_parcelas: getDynamicMaxParcelas(forma),
  }));

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
          paymentMethod: formasPagamentoProcessadas.find(f => f.id === selectedFormaPagamento),
          formasPagamento: formasPagamentoProcessadas,
          priceBreakdown: priceBreakdown,
          // Campos necessários para o LeadsManager reconstruir a mensagem
          sistema_sazonal_ativo: template?.sistema_sazonal_ativo,
          sistema_geografico_ativo: template?.sistema_geografico_ativo,
          ocultar_valores_intermediarios: template?.ocultar_valores_intermediarios,
        },
        valorTotal: calculateTotal(),
      });
    }
  }, [template, produtos, selectedProdutos, selectedFormaPagamento, formData, camposExtrasData, dataEvento, cidadeSelecionada, formasPagamentoProcessadas, priceBreakdown]);



  // ── Validações de formato de Email e Telefone ─────────────────────────
  const validateEmail = (email: string): string => {
    if (!email.trim()) return '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    return emailRegex.test(email.trim()) ? '' : 'E-mail inválido. Use o formato: nome@exemplo.com';
  };

  const validatePhone = (phone: string): string => {
    if (!phone.trim()) return '';
    const digits = phone.replace(/\D/g, '');
    // Brasil: DDD (2 dígitos) + número (8 ou 9 dígitos) = 10 ou 11 dígitos
    if (digits.length < 10 || digits.length > 11) {
      return 'Número inválido. Informe DDD + número (ex: 11987654321)';
    }
    // Celular brasileiro deve começar com 9 após o DDD para números de 11 dígitos
    if (digits.length === 11 && digits[2] !== '9') {
      return 'Celular inválido. O número deve começar com 9 após o DDD';
    }
    return '';
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
        secureLocalStorage.removeItem(storageKey);
      }
    }
  };

  const buildWhatsAppMessage = () => {
    const breakdown = priceBreakdown;
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
        ocultar_taxa_deslocamento: template?.ocultar_taxa_deslocamento,
      },

      // Produtos
      products: produtos,
      selectedProducts: selectedProdutos,

      // Adicionais de upsell
      upsellProducts: filteredUpsellProdutos.filter(p => selectedUpsellIds.has(p.id)),

      // Forma de pagamento
      paymentMethod: formaPagamento ? {
        ...formaPagamento,
        max_parcelas: getDynamicMaxParcelas(formaPagamento)
      } : undefined,
      lastInstallmentDate: (() => {
        const maxP = getDynamicMaxParcelas(formaPagamento);
        if (maxP <= 1) return '';
        const date = new Date();
        date.setMonth(date.getMonth() + maxP);
        return date.toISOString().split('T')[0];
      })(),

      // Breakdown de preços
      priceBreakdown: breakdown,

      // Cupom
      couponCode: cupomAtivo ? cupomCodigo : undefined,
      couponDiscount: cupomAtivo ? cupomDesconto : undefined,

      // 🔥 Dados sazonais e geográficos (automáticos)
      eventDate: dataEvento,
      eventTime: horarioSelecionado || undefined,
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
    const dayOfWeek = date.getDay(); // 0 (Dom) a 6 (Sáb)

    // Bloqueio específico do template
    if (template?.dias_semana_bloqueados?.includes(dayOfWeek)) {
      return true;
    }

    if (!agendaConfig) return false;

    // **MELHORIA**: Verifica se a data selecionada é a mesma que está sendo checada.
    // Se for, usa o resultado da verificação de disponibilidade em tempo real.
    if (dataEvento && parseLocalYMD(dataEvento).toDateString() === date.toDateString() && disponibilidade) {
      return !disponibilidade.disponivel;
    }

    const dayOfMonth = date.getDate();
  
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
    const isAgendaRequired = agendaConfig?.agenda_ativa && !template?.ignorar_agenda_global;
    
    if (!((template?.sistema_sazonal_ativo && temporadas.length > 0) || (template?.sistema_geografico_ativo && paises.length > 0) || isAgendaRequired)) {
      return null;
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Data do Evento */}
        {(temporadas.length > 0 || isAgendaRequired) && (
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
                  checkAvailability(template.user_id, dataEvento, activeDuration)
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
              photographerName={profile?.nome_profissional || profile?.nome_admin || profile?.nome}
              showRefreshButton={true}
            />

            {/* Grid de Horários / Slots */}
            {disponibilidade?.modo_agendamento === 'hora' && disponibilidade.slots && disponibilidade.slots.length > 0 && (
              <div className="mt-4 border-t pt-4 border-gray-100/10">
                <label className={`block text-sm font-semibold ${tema.cores.textoPrincipal} mb-2`}>
                  🕒 Horários Disponíveis ({activeDuration} min)
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {disponibilidade.slots.map((slot) => {
                    const isSelected = horarioSelecionado === slot.horario;
                    const isAvailable = slot.disponivel;
                    
                    return (
                      <button
                        key={slot.horario}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => setHorarioSelecionado(slot.horario)}
                        className={`
                          py-2 px-1 text-center rounded-lg border font-medium text-xs sm:text-sm transition-all duration-200
                          ${!isAvailable
                            ? 'bg-red-500/5 border-red-500/10 text-gray-400 cursor-not-allowed opacity-40'
                            : isSelected
                              ? `${tema.cores.textoDestaque.replace('text-', 'border-')} ${tema.cores.secundaria || 'bg-amber-500 text-white'} ring-2 ring-amber-500/20`
                              : `${tema.cores.borda} ${tema.cores.bgCard} ${tema.cores.textoPrincipal} hover:border-amber-500/50 hover:bg-amber-500/5`
                          }
                        `}
                      >
                        {slot.horario}
                      </button>
                    );
                  })}
                </div>
                {!horarioSelecionado && (
                  <p className="text-xs text-red-500 mt-2 font-medium">
                    * Por favor, escolha um horário acima para o seu trabalho.
                  </p>
                )}
              </div>
            )}
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
                            {cidade.taxa_deslocamento > 0 && !template?.ocultar_taxa_deslocamento &&
                              ` + R$ ${cidade.taxa_deslocamento.toFixed(2)}`}
                          </>
                        )}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  {template?.ocultar_taxa_deslocamento
                    ? 'Valores podem incluir ajuste de preço'
                    : 'Valores podem incluir ajuste de preço e taxa de deslocamento'}
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
    if (isSubmitting || hasSubmitted) return;
    
    setIsSubmitting(true);
    setHasSubmitted(true);
    console.log('🚀 [handleSubmit] Botão clicado. Priorizando abertura do modal...');

    try {
      // ── Validação de formato de email e telefone ──────────────────────
      const emailError = validateEmail(formData.email_cliente);
      const phoneError = validatePhone(formData.telefone_cliente);

      if (emailError || phoneError) {
        setFieldErrors({ email: emailError, telefone: phoneError });
        setIsSubmitting(false);
        setHasSubmitted(false);
        
        // Mensagem explícita para o cliente
        alert('⚠️ Opa! Alguns campos de contato parecem incorretos. Por favor, verifique o campo que está marcado em vermelho para podermos prosseguir com o envio!');
        
        // Scroll suave para o campo com erro
        const errorId = emailError ? 'email-cliente' : 'telefone-cliente';
        document.getElementById(errorId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      // Validação final antes de prosseguir
      if (!fieldsValidation.canUseWhatsApp) {
        alert(fieldsValidation.validationMessage);
        setIsSubmitting(false); // Reativa se a validação falhar
        setHasSubmitted(false);
        return;
      }

      // Validação de forma de pagamento: só bloqueia se o fotógrafo ativou a opção no template
      if (formasPagamento.length > 0 && template?.forma_pagamento_obrigatoria && !selectedFormaPagamento) {
        alert('⚠️ Por favor, selecione uma forma de pagamento antes de enviar o orçamento.');
        const paymentSection = document.querySelector('[data-pagamento-section]');
        if (paymentSection) {
          paymentSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        setIsSubmitting(false);
        setHasSubmitted(false);
        return;
      }
      // Validação de horário de agendamento se estiver em modo horário
      const isHoraAgendamento = disponibilidade?.modo_agendamento === 'hora';
      if (isHoraAgendamento && !horarioSelecionado) {
        alert('⚠️ Por favor, selecione um horário para o seu agendamento antes de prosseguir.');
        setIsSubmitting(false);
        setHasSubmitted(false);
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
          ? `${parseLocalYMD(dataEvento).toLocaleDateString('pt-BR')}${
              horarioSelecionado ? ` às ${horarioSelecionado}` : ''
            } [${
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
        items: [
          ...produtos
            .filter((p) => selectedProdutos[p.id] > 0)
            .map((p) => ({
              name: p.nome,
              quantity: selectedProdutos[p.id],
              price: p.valor * (1 - (p.desconto_percentual ?? 0) / 100),
              permite_multiplas_unidades: p.permite_multiplas_unidades,
            })),
          ...filteredUpsellProdutos
            .filter((p) => selectedUpsellIds.has(p.id))
            .map((p) => ({
              name: `🎁 ${p.nome} (Adicional)`,
              quantity: 1,
              price: p.valor * (1 - (p.desconto_percentual ?? 0) / 100),
              permite_multiplas_unidades: false,
            }))
        ],
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
            formData: { 
              ...formData, 
              ...camposExtrasData, 
              data_evento: dataEvento || null, 
              cidade_evento: cidadeSelecionada || null, 
              tipo_evento: templateRef.current.nome_template || null,
              horario_inicio: horarioSelecionado || null,
              duracao_minutos: activeDuration || null,
            },
            orcamentoDetalhe: {
              // O objeto 'selectedProdutos' é convertido para um array, que é o que a Edge Function espera.
              produtos: Object.entries(selectedProdutos).map(([produto_id, quantidade]) => ({
                produto_id,
                quantidade: Number(quantidade),
              })),
              upsell_produtos: filteredUpsellProdutos
                .filter(p => selectedUpsellIds.has(p.id))
                .map(p => ({ produto_id: p.id, nome: p.nome, valor: p.valor, desconto_percentual: p.desconto_percentual ?? 0 })),
              forma_pagamento_id: selectedFormaPagamento || null,
              priceBreakdown: priceBreakdown,
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
            secureLocalStorage.removeItem(storageKey);
            console.log('✅ [setTimeout] Orçamento salvo no navegador foi limpo.');
          }

          const leadId = leadData.id;

          if (leadId) {
            console.log('✅ [QuotePage] Lead salvo com id. (A notificação correspondente será criada pelo Backend para evitar duplicação).', leadId);
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
      setHasSubmitted(false); // Libera o clique se deu erro sincrono apenas
    } finally {
      // 4. REATIVAR O BOTÃO
      // O botão é reativado rapidamente, pois a UI não está mais bloqueada.
      setIsSubmitting(false);
      console.log('✅ [handleSubmit] Fluxo principal finalizado, botão reativado.');
    }
  };

  // ── HELPER DE MODAL DE CONFIRMAÇÃO E ENVIO ────────────────────────────
  const renderSummaryModal = () => {
    if (!showSummaryModal) return null;

    return (
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
                onClick={() => {
                  setShowSummaryModal(false);
                  setHasSubmitted(false);
                }}
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
                {summaryData.quoteData.items.map((item: any, index: number) => (
                  <li key={index} className="flex justify-between">
                    <span>
                      {item.permite_multiplas_unidades === false ? item.name : `${item.quantity}x ${item.name}`}
                    </span>
                    {!template?.ocultar_valores_intermediarios && (
                      <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                    )}
                  </li>
                ))}
              </ul>
              <div className="border-t mt-3 pt-3 flex justify-between font-bold text-lg text-blue-800">
                <span>{template?.usar_termo_investimento ? 'Investimento Total:' : 'Valor Total:'}</span>
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
                    setShowSummaryModal(false);
                    setHasSubmitted(false);
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
                    analytics?.markAsConverted();
                  }}
                >
                  <Send className="w-6 h-6" />
                  Enviar via WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
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

  if (template && template.ativo === false) {
    const estilo = template.estilo_mensagem_pausada || 'amigavel';
    const msg = template.mensagem_pausada || 'Este orçamento está temporariamente pausado. Por favor, entre em contato direto com o profissional para mais informações.';
    
    let containerStyle = "min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-[#07101f]";
    let cardStyle = "bg-white dark:bg-[#0a1628] rounded-xl shadow-2xl border dark:border-white/5 max-w-lg w-full overflow-hidden text-center animate-fade-in";
    let bannerStyle = "";
    let titleText = "";
    
    if (estilo === 'formal') {
      bannerStyle = "bg-slate-800 text-white py-3 px-4 text-xs font-bold tracking-wider uppercase";
      titleText = "Orçamento Indisponível";
    } else if (estilo === 'divertido') {
      bannerStyle = "bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-4 text-xs font-bold uppercase";
      titleText = "Ops! Pausamos por aqui!";
    } else if (estilo === 'urgente') {
      bannerStyle = "bg-red-600 text-white py-3 px-4 text-xs font-bold uppercase tracking-wider animate-pulse";
      titleText = "Aviso Importante";
    } else { // amigavel
      bannerStyle = "bg-amber-500 text-white py-3 px-4 text-xs font-bold uppercase";
      titleText = "Agenda Temporariamente Pausada";
    }
    
    return (
      <div className={containerStyle}>
        <div className={cardStyle}>
          <div className={bannerStyle}>
            {estilo === 'amigavel' && '😊 Mensagem do Profissional'}
            {estilo === 'formal' && '👔 Comunicado Oficial'}
            {estilo === 'divertido' && '🎉 Novidades em Breve!'}
            {estilo === 'urgente' && '⚠️ Atenção'}
          </div>
          
          <div className="p-8 space-y-6">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto">
              {estilo === 'amigavel' && <span className="text-3xl">👋</span>}
              {estilo === 'formal' && <span className="text-3xl">💼</span>}
              {estilo === 'divertido' && <span className="text-3xl">🥳</span>}
              {estilo === 'urgente' && <span className="text-3xl">🚨</span>}
            </div>
            
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white leading-tight">
              {titleText}
            </h1>
            
            <p className="text-gray-650 dark:text-gray-300 text-sm md:text-base leading-relaxed whitespace-pre-line">
              {msg}
            </p>
            
            <div className="pt-4 border-t dark:border-white/5 text-xs text-gray-400 dark:text-gray-500">
              Caso precise de ajuda imediata, entre em contato direto pelo WhatsApp ou redes sociais.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Função de seção de upsell (carrossel) ─────────────────────────────
  const renderUpsellSection = () => {
    if (!template?.upsell_ativo || filteredUpsellProdutos.length === 0) return null;

    const titulo = template?.upsell_titulo || '🎁 Aproveite e adicione ao seu pacote';
    const subtitulo = template?.upsell_subtitulo || 'Itens especiais com condições exclusivas para você';

    return (
      <div
        style={{
          marginTop: 32,
          paddingTop: 24,
          borderTop: '1px solid rgba(0,0,0,0.08)',
        }}
      >
        {/* Cabeçalho */}
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: tema.cores.textoPrincipal?.includes('white') || tema.cores.textoPrincipal?.includes('gray-100') ? '#fff' : '#111827', margin: 0, marginBottom: 4 }}>
            {titulo}
          </h3>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>{subtitulo}</p>
        </div>

        {/* Carrossel */}
        <div style={{ position: 'relative' }}>
          <div
            ref={upsellScrollRef}
            onScroll={checkUpsellScroll}
            style={{
              display: 'flex',
              gap: 12,
              overflowX: 'auto',
              scrollBehavior: 'smooth',
              paddingBottom: 8,
              scrollbarWidth: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {filteredUpsellProdutos.map((produto) => {
              const selecionado = selectedUpsellIds.has(produto.id);
              const desconto = produto.desconto_percentual ?? 0;
              const valorFinal = produto.valor * (1 - desconto / 100);
              const imgUrl = produto.imagem_url || (produto.imagens?.[0]);

              return (
                <div
                  key={produto.id}
                  onClick={() => handleToggleUpsell(produto.id)}
                  style={{
                    flex: '0 0 200px',
                    minWidth: 200,
                    maxWidth: 200,
                    border: selecionado ? '2px solid #2563eb' : '1.5px solid #e5e7eb',
                    borderRadius: 14,
                    background: selecionado ? '#eff6ff' : '#fff',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    boxShadow: selecionado ? '0 4px 16px rgba(37,99,235,0.15)' : '0 1px 4px rgba(0,0,0,0.06)',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    userSelect: 'none',
                  }}
                  role="checkbox"
                  aria-checked={selecionado}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') handleToggleUpsell(produto.id); }}
                >
                  {/* Badge selecionado */}
                  {selecionado && (
                    <div style={{
                      position: 'absolute', top: 8, right: 8, zIndex: 2,
                      background: '#2563eb', color: '#fff', borderRadius: '50%',
                      width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, boxShadow: '0 2px 6px rgba(37,99,235,0.4)',
                    }}>✓</div>
                  )}

                  {/* Badge de desconto */}
                  {desconto > 0 && (template?.exibir_valores_upsell !== false) && (
                    <div style={{
                      position: 'absolute', top: 8, left: 8, zIndex: 2,
                      background: '#dc2626', color: '#fff', borderRadius: 6,
                      padding: '2px 7px', fontSize: 11, fontWeight: 700,
                    }}>-{desconto}%</div>
                  )}

                  {/* Imagem */}
                  {imgUrl ? (
                    <div style={{ height: 110, overflow: 'hidden', background: '#f3f4f6' }}>
                      <img
                        src={imgUrl}
                        alt={produto.nome}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div style={{ height: 70, background: 'linear-gradient(135deg,#dbeafe,#ede9fe)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                      🎁
                    </div>
                  )}

                  {/* Conteúdo */}
                  <div style={{ padding: '10px 12px 12px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 4, lineHeight: 1.3 }}>
                      {produto.nome}
                    </div>
                    {produto.resumo && (
                      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8, lineHeight: 1.4,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {produto.resumo}
                      </div>
                    )}
                    {template?.exibir_valores_upsell !== false && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: selecionado ? '#2563eb' : '#059669' }}>
                          {formatCurrency(valorFinal)}
                        </span>
                        {desconto > 0 && (
                          <span style={{ fontSize: 11, color: '#9ca3af', textDecoration: 'line-through' }}>
                            {formatCurrency(produto.valor)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Indicador de scroll à direita */}
          {upsellCanScrollRight && (
            <div
              style={{
                position: 'absolute', right: 0, top: 0, bottom: 8,
                width: 56,
                background: 'linear-gradient(to left, rgba(255,255,255,0.95) 40%, transparent)',
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                paddingRight: 8,
                pointerEvents: 'none',
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: '#fff', border: '1.5px solid #e5e7eb',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, color: '#374151',
              }}>›</div>
            </div>
          )}
        </div>

        {/* Resumo do upsell selecionado */}
        {selectedUpsellIds.size > 0 && (
          <div style={{
            marginTop: 12,
            padding: '10px 14px',
            background: '#eff6ff',
            borderRadius: 10,
            border: '1px solid #bfdbfe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}>
            <span style={{ fontSize: 13, color: '#1d4ed8', fontWeight: 600 }}>
              🎁 {selectedUpsellIds.size} adicional{selectedUpsellIds.size > 1 ? 'is' : ''} selecionado{selectedUpsellIds.size > 1 ? 's' : ''}
            </span>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#1d4ed8' }}>
              +{formatCurrency(upsellSubtotal)}
            </span>
          </div>
        )}
      </div>
    );
  };

  // ── Dark Studio: componente premium dedicado ──────────────────────────
  if (template?.tema === 'promocional' && !loading && template && profile) {
    const commonProps = {
      template,
      profile,
      produtos,
      selectedProdutos,
      formData,
      calculateTotal,
      handleProdutoQuantityChange,
      handleSubmit,
      setFormData,
      fieldsValidation,
      fieldErrors,
      camposExtras,
      camposExtrasData,
      setCamposExtrasData,
      renderLocationDateFields,
      formasPagamento: formasPagamentoProcessadas,
      selectedFormaPagamento,
      setSelectedFormaPagamento,
      firstProductRef,
      totalSectionRef,
      breakdown: priceBreakdown,
      upsellSection: renderUpsellSection(),
      upsellProdutos,
      brindesProdutos,
    };
    return wrapWithFonts(
      <>
        <CookieBanner accentColor={inlineStyles.accentColor} backgroundColor={inlineStyles.quoteCard?.background || inlineStyles.pageWrapper?.background} textColor={inlineStyles.textColor} />
        <QuotePromocional {...commonProps} />
        {template?.exibir_painel_flutuante !== false && (
          <FloatingTotalPanel
            calculateTotal={calculateTotal}
            selectedProdutos={selectedProdutos}
            produtos={produtos}
            tema={tema}
            ocultarValoresIntermediarios={template?.ocultar_valores_intermediarios || false}
            firstProductRef={firstProductRef}
            totalSectionRef={totalSectionRef}
            temaNome="promocional"
            breakdown={priceBreakdown}
          />
        )}
        {renderSummaryModal()}
      </>
    );
  }

  if (template?.tema === 'oferta' && !loading && template && profile) {
    const commonProps = {
      template,
      profile,
      produtos,
      selectedProdutos,
      formData,
      calculateTotal,
      handleProdutoQuantityChange,
      handleSubmit,
      setFormData,
      fieldsValidation,
      fieldErrors,
      camposExtras,
      camposExtrasData,
      setCamposExtrasData,
      renderLocationDateFields,
      formasPagamento: formasPagamentoProcessadas,
      selectedFormaPagamento,
      setSelectedFormaPagamento,
      firstProductRef,
      totalSectionRef,
      breakdown: priceBreakdown,
      upsellSection: renderUpsellSection(),
      upsellProdutos,
      brindesProdutos,
    };
    return wrapWithFonts(
      <>
        <CookieBanner accentColor={inlineStyles.accentColor} backgroundColor={inlineStyles.quoteCard?.background || inlineStyles.pageWrapper?.background} textColor={inlineStyles.textColor} />
        <QuoteOferta {...commonProps} />
        {template?.exibir_painel_flutuante !== false && (
          <FloatingTotalPanel
            calculateTotal={calculateTotal}
            selectedProdutos={selectedProdutos}
            produtos={produtos}
            tema={tema}
            ocultarValoresIntermediarios={template?.ocultar_valores_intermediarios || false}
            firstProductRef={firstProductRef}
            totalSectionRef={totalSectionRef}
            temaNome="oferta"
            breakdown={priceBreakdown}
          />
        )}
        {renderSummaryModal()}
      </>
    );
  }
  if (template?.tema === 'pdf-elegante' && !loading && template && profile) {
    const commonProps = {
      template,
      profile,
      produtos,
      selectedProdutos,
      formData,
      calculateTotal,
      handleProdutoQuantityChange,
      handleSubmit,
      setFormData,
      fieldsValidation,
      fieldErrors,
      camposExtras,
      camposExtrasData,
      setCamposExtrasData,
      renderLocationDateFields,
      formasPagamento: formasPagamentoProcessadas,
      selectedFormaPagamento,
      setSelectedFormaPagamento,
      firstProductRef,
      totalSectionRef,
      breakdown: priceBreakdown,
      upsellSection: renderUpsellSection(),
      upsellProdutos,
      brindesProdutos,
    };
    return wrapWithFonts(
      <>
        <CookieBanner accentColor={inlineStyles.accentColor} backgroundColor={inlineStyles.quoteCard?.background || inlineStyles.pageWrapper?.background} textColor={inlineStyles.textColor} />
        <QuotePdfElegante {...commonProps} />
        {template?.exibir_painel_flutuante !== false && (
          <FloatingTotalPanel
            calculateTotal={calculateTotal}
            selectedProdutos={selectedProdutos}
            produtos={produtos}
            tema={tema}
            ocultarValoresIntermediarios={template?.ocultar_valores_intermediarios || false}
            firstProductRef={firstProductRef}
            totalSectionRef={totalSectionRef}
            temaNome="pdf-elegante"
            breakdown={priceBreakdown}
          />
        )}
        {renderSummaryModal()}
      </>
    );
  }
  if (template?.tema === 'pdf-elegante-2' && !loading && template && profile) {
    const commonProps = {
      template,
      profile,
      produtos,
      selectedProdutos,
      formData,
      calculateTotal,
      handleProdutoQuantityChange,
      handleSubmit,
      setFormData,
      fieldsValidation,
      fieldErrors,
      camposExtras,
      camposExtrasData,
      setCamposExtrasData,
      renderLocationDateFields,
      formasPagamento: formasPagamentoProcessadas,
      selectedFormaPagamento,
      setSelectedFormaPagamento,
      firstProductRef,
      totalSectionRef,
      breakdown: priceBreakdown,
      upsellSection: renderUpsellSection(),
      upsellProdutos,
      brindesProdutos,
    };
    return wrapWithFonts(
      <>
        <CookieBanner accentColor={inlineStyles.accentColor} backgroundColor={inlineStyles.quoteCard?.background || inlineStyles.pageWrapper?.background} textColor={inlineStyles.textColor} />
        <QuotePdfElegante2 {...commonProps} />
        {template?.exibir_painel_flutuante !== false && (
          <FloatingTotalPanel
            calculateTotal={calculateTotal}
            selectedProdutos={selectedProdutos}
            produtos={produtos}
            tema={tema}
            ocultarValoresIntermediarios={template?.ocultar_valores_intermediarios || false}
            firstProductRef={firstProductRef}
            totalSectionRef={totalSectionRef}
            temaNome="pdf-elegante-2"
            breakdown={priceBreakdown}
          />
        )}
        {renderSummaryModal()}
      </>
    );
  }
  if (template?.tema === 'darkstudio' && !loading && template && profile) {
    const commonProps = {
      template,
      profile,
      produtos,
      selectedProdutos,
      formData,
      calculateTotal,
      handleProdutoQuantityChange,
      handleSubmit,
      setFormData,
      fieldsValidation,
      fieldErrors,
      camposExtras,
      camposExtrasData,
      setCamposExtrasData,
      renderLocationDateFields,
      // Formas de pagamento (obrigatório para validação correta)
      formasPagamento: formasPagamentoProcessadas,
      selectedFormaPagamento,
      setSelectedFormaPagamento,
      // Refs e dados para o FloatingTotalPanel padrão
      firstProductRef,
      totalSectionRef,
      breakdown: priceBreakdown,
      upsellSection: renderUpsellSection(),
      upsellProdutos,
      brindesProdutos,
    };
    return wrapWithFonts(
      <>
        <CookieBanner accentColor={inlineStyles.accentColor} backgroundColor={inlineStyles.quoteCard?.background || inlineStyles.pageWrapper?.background} textColor={inlineStyles.textColor} />
        <QuoteDarkStudio {...commonProps} />
        {/* FloatingTotalPanel com as mesmas regras de todos os outros temas */}
        {template?.exibir_painel_flutuante !== false && (
          <FloatingTotalPanel
            calculateTotal={calculateTotal}
            selectedProdutos={selectedProdutos}
            produtos={produtos}
            tema={tema}
            ocultarValoresIntermediarios={template?.ocultar_valores_intermediarios || false}
            firstProductRef={firstProductRef}
            totalSectionRef={totalSectionRef}
            temaNome="darkstudio"
            breakdown={priceBreakdown}
          />
        )}
        {/* ── Modal de Resumo e Envio (igual todos os outros temas) ── */}
        {/* ── Modal de Resumo e Envio Dark Studio ── */}
        {showSummaryModal && (
          <div
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: 16 }}
          >
            <div style={{ background: '#07101f', border: '1px solid rgba(255,255,255,.08)', borderRadius: 24, boxShadow: '0 24px 64px rgba(0,0,0,.6)', maxWidth: 672, width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: 24, borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>Quase lá!</h2>
                  <p style={{ color: 'rgba(255,255,255,.6)', marginTop: 4, fontSize: 15 }}>
                    Confira o resumo e envie seu pedido para{' '}
                    <strong style={{ color: '#22c55e' }}>{summaryData.profileName}</strong>.
                  </p>
                </div>
                <button
                  onClick={() => { setShowSummaryModal(false); setHasSubmitted(false); }}
                  style={{ background: 'rgba(255,255,255,.05)', border: 'none', color: '#fff', padding: 8, borderRadius: '50%', cursor: 'pointer', transition: 'background .2s' }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: 'rgba(255,255,255,.03)', borderRadius: 12, padding: 16, border: '1px solid rgba(255,255,255,.05)' }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Seus Dados:</h3>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,.8)', marginBottom: 4 }}><strong style={{ color: '#fff' }}>Nome:</strong> {summaryData.clientData.nome}</p>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,.8)', marginBottom: 4 }}><strong style={{ color: '#fff' }}>Email:</strong> {summaryData.clientData.email}</p>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,.8)' }}><strong style={{ color: '#fff' }}>Telefone:</strong> {summaryData.clientData.telefone}</p>
                </div>

                <div style={{ background: 'rgba(255,255,255,.03)', borderRadius: 12, padding: 16, border: '1px solid rgba(255,255,255,.05)' }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Detalhes do Evento:</h3>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,.8)', marginBottom: 4 }}><strong style={{ color: '#fff' }}>Orçamento:</strong> {summaryData.eventData.tipo}</p>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,.8)', marginBottom: 4 }}><strong style={{ color: '#fff' }}>Data:</strong> {summaryData.eventData.data}</p>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,.8)' }}><strong style={{ color: '#fff' }}>Cidade:</strong> {summaryData.eventData.cidade}</p>
                </div>

                <div style={{ background: 'rgba(34,197,94,.05)', borderRadius: 12, padding: 16, border: '1px solid rgba(34,197,94,.15)' }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Itens Selecionados:</h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {summaryData.quoteData.items.map((item: any, index: number) => (
                      <li key={index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'rgba(255,255,255,.8)' }}>
                        <span>{item.permite_multiplas_unidades === false ? item.name : `${item.quantity}x ${item.name}`}</span>
                        <span style={{ fontWeight: 600, color: '#fff' }}>{formatCurrency(item.price * item.quantity)}</span>
                      </li>
                    ))}
                  </ul>
                  <div style={{ borderTop: '1px solid rgba(34,197,94,.2)', marginTop: 12, paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 900, color: '#22c55e' }}>
                    <span>{template?.usar_termo_investimento ? 'Investimento Total:' : 'Valor Total:'}</span>
                    <span>{formatCurrency(summaryData.quoteData.total)}</span>
                  </div>
                </div>
              </div>

              <div style={{ padding: 24, borderTop: '1px solid rgba(255,255,255,.06)', background: 'rgba(0,0,0,.2)', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => { setShowSummaryModal(false); setHasSubmitted(false); }}
                    style={{ flex: '1 1 120px', padding: '14px 24px', background: 'rgba(255,255,255,.05)', color: '#fff', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', transition: 'background .2s' }}
                  >
                    Voltar
                  </button>
                  <a
                    href={summaryData.waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => analytics?.markAsConverted()}
                    style={{ flex: '2 1 200px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 24px', background: 'linear-gradient(135deg,#16a34a,#22c55e)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 20px rgba(22,163,74,.3)', cursor: 'pointer' }}
                  >
                    <Send className="w-5 h-5" />
                    Enviar via WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  if (template?.tema === 'natal' && !loading && template && profile) {
    const commonProps = {
      template,
      profile,
      produtos,
      selectedProdutos,
      formData,
      calculateTotal,
      handleProdutoQuantityChange,
      handleSubmit,
      setFormData,
      fieldsValidation,
      fieldErrors,
      camposExtras,
      camposExtrasData,
      setCamposExtrasData,
      renderLocationDateFields,
      formasPagamento: formasPagamentoProcessadas,
      selectedFormaPagamento,
      setSelectedFormaPagamento,
      firstProductRef,
      totalSectionRef,
      breakdown: priceBreakdown,
      upsellSection: renderUpsellSection(),
      upsellProdutos,
      brindesProdutos,
    };
    return wrapWithFonts(
      <>
        <CookieBanner accentColor={inlineStyles.accentColor} backgroundColor={inlineStyles.quoteCard?.background || inlineStyles.pageWrapper?.background} textColor={inlineStyles.textColor} />
        <QuoteNatal {...commonProps} />
        {template?.exibir_painel_flutuante !== false && (
          <FloatingTotalPanel
            calculateTotal={calculateTotal}
            selectedProdutos={selectedProdutos}
            produtos={produtos}
            tema={tema}
            ocultarValoresIntermediarios={template?.ocultar_valores_intermediarios || false}
            firstProductRef={firstProductRef}
            totalSectionRef={totalSectionRef}
            temaNome="natal"
            breakdown={priceBreakdown}
          />
        )}
        {renderSummaryModal()}
      </>
    );
  }

  if (template?.tema === 'revellon' && !loading && template && profile) {
    const commonProps = {
      template,
      profile,
      produtos,
      selectedProdutos,
      formData,
      calculateTotal,
      handleProdutoQuantityChange,
      handleSubmit,
      setFormData,
      fieldsValidation,
      fieldErrors,
      camposExtras,
      camposExtrasData,
      setCamposExtrasData,
      renderLocationDateFields,
      formasPagamento: formasPagamentoProcessadas,
      selectedFormaPagamento,
      setSelectedFormaPagamento,
      firstProductRef,
      totalSectionRef,
      breakdown: priceBreakdown,
      upsellSection: renderUpsellSection(),
      upsellProdutos,
      brindesProdutos,
    };
    return wrapWithFonts(
      <>
        <CookieBanner accentColor={inlineStyles.accentColor} backgroundColor={inlineStyles.quoteCard?.background || inlineStyles.pageWrapper?.background} textColor={inlineStyles.textColor} />
        <QuoteRevellon {...commonProps} />
        {template?.exibir_painel_flutuante !== false && (
          <FloatingTotalPanel
            calculateTotal={calculateTotal}
            selectedProdutos={selectedProdutos}
            produtos={produtos}
            tema={tema}
            ocultarValoresIntermediarios={template?.ocultar_valores_intermediarios || false}
            firstProductRef={firstProductRef}
            totalSectionRef={totalSectionRef}
            temaNome="revellon"
            breakdown={priceBreakdown}
          />
        )}
        {renderSummaryModal()}
      </>
    );
  }


  const renderThemeOverlay = () => {
    const temaNome = template?.tema;
    if (!temaNome) return null;

    // 1. Neve para Inverno/Natal
    if (temaNome === 'oferta-inverno' || temaNome === 'natal') {
      const snowflakes = ['❄️', '❅', '❆', '✧'];
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" style={{ height: '100%', minHeight: '100vh', width: '100%' }}>
          {Array.from({ length: 25 }).map((_, i) => {
            const size = Math.random() * 12 + 8;
            const left = Math.random() * 100;
            const duration = Math.random() * 8 + 5;
            const delay = Math.random() * 6;
            const flake = snowflakes[i % snowflakes.length];
            return (
              <span
                key={i}
                style={{
                  position: 'absolute',
                  left: `${left}%`,
                  top: '-20px',
                  fontSize: `${size}px`,
                  color: 'rgba(255, 255, 255, 0.7)',
                  animation: `snowFall ${duration}s linear infinite`,
                  animationDelay: `${delay}s`,
                  pointerEvents: 'none',
                }}
              >
                {flake}
              </span>
            );
          })}
        </div>
      );
    }

    // 2. Confete para Carnaval
    if (temaNome === 'carnaval') {
      const colors = ['#f43f5e', '#3b82f6', '#eab308', '#22c55e', '#a855f7', '#ec4899'];
      const shapes = ['🎉', '✨', '🎈', '•', '▫️'];
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" style={{ height: '100%', minHeight: '100vh', width: '100%' }}>
          {Array.from({ length: 30 }).map((_, i) => {
            const size = Math.random() * 14 + 10;
            const left = Math.random() * 100;
            const duration = Math.random() * 6 + 4;
            const delay = Math.random() * 5;
            const shape = shapes[i % shapes.length];
            const color = colors[i % colors.length];
            return (
              <span
                key={i}
                style={{
                  position: 'absolute',
                  left: `${left}%`,
                  top: '-20px',
                  fontSize: `${size}px`,
                  color: shape === '•' || shape === '▫️' ? color : undefined,
                  animation: `snowFall ${duration}s linear infinite`,
                  animationDelay: `${delay}s`,
                  pointerEvents: 'none',
                }}
              >
                {shape}
              </span>
            );
          })}
        </div>
      );
    }

    // 3. Corações para Dia dos Namorados / Valentine's Day
    if (temaNome === 'dia-dos-namorados' || temaNome === 'valentines-day') {
      const hearts = ['❤️', '💖', '💕', '💘', '🌸'];
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" style={{ height: '100%', minHeight: '100vh', width: '100%' }}>
          {Array.from({ length: 15 }).map((_, i) => {
            const size = Math.random() * 16 + 12;
            const left = Math.random() * 100;
            const duration = Math.random() * 9 + 6;
            const delay = Math.random() * 8;
            const heart = hearts[i % hearts.length];
            return (
              <span
                key={i}
                style={{
                  position: 'absolute',
                  left: `${left}%`,
                  bottom: '-20px',
                  fontSize: `${size}px`,
                  animation: `driftUp ${duration}s linear infinite`,
                  animationDelay: `${delay}s`,
                  pointerEvents: 'none',
                }}
              >
                {heart}
              </span>
            );
          })}
        </div>
      );
    }

    // 4. Flores/Pétalas para Mês da Mulher / Dia das Mães / Oferta Primavera
    if (temaNome === 'mes-da-mulher' || temaNome === 'dia-das-maes' || temaNome === 'oferta-primavera') {
      const petals = ['🌸', '🌺', '🌹', '🌷', '🍃'];
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" style={{ height: '100%', minHeight: '100vh', width: '100%' }}>
          {Array.from({ length: 15 }).map((_, i) => {
            const size = Math.random() * 14 + 10;
            const left = Math.random() * 100;
            const duration = Math.random() * 8 + 6;
            const delay = Math.random() * 6;
            const petal = petals[i % petals.length];
            return (
              <span
                key={i}
                style={{
                  position: 'absolute',
                  left: `${left}%`,
                  top: '-20px',
                  fontSize: `${size}px`,
                  animation: `snowFall ${duration}s linear infinite`,
                  animationDelay: `${delay}s`,
                  pointerEvents: 'none',
                }}
              >
                {petal}
              </span>
            );
          })}
        </div>
      );
    }

    // 5. Morcegos e Fantasmas para Halloween
    if (temaNome === 'halloween') {
      const spooky = ['🦇', '👻', '🎃', '🕷️'];
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" style={{ height: '100%', minHeight: '100vh', width: '100%' }}>
          {Array.from({ length: 20 }).map((_, i) => {
            const size = Math.random() * 20 + 16;
            const left = Math.random() * 100;
            const duration = Math.random() * 10 + 7;
            const delay = Math.random() * 8;
            const item = spooky[i % spooky.length];
            return (
              <span
                key={i}
                style={{
                  position: 'absolute',
                  left: `${left}%`,
                  bottom: '-30px',
                  fontSize: `${size}px`,
                  animation: `driftUp ${duration}s linear infinite`,
                  animationDelay: `${delay}s`,
                  pointerEvents: 'none',
                }}
              >
                {item}
              </span>
            );
          })}
        </div>
      );
    }

    // 6. Brasas e Fagulhas para São João
    if (temaNome === 'sao-joao') {
      const fireParticles = ['🔥', '✨', '🔥', '✦', '✧'];
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" style={{ height: '100%', minHeight: '100vh', width: '100%' }}>
          {Array.from({ length: 25 }).map((_, i) => {
            const size = Math.random() * 10 + 6;
            const left = Math.random() * 100;
            const duration = Math.random() * 5 + 4;
            const delay = Math.random() * 5;
            const spark = fireParticles[i % fireParticles.length];
            return (
              <span
                key={i}
                style={{
                  position: 'absolute',
                  left: `${left}%`,
                  bottom: '-10px',
                  fontSize: `${size}px`,
                  color: spark === '✨' || spark === '✦' || spark === '✧' ? '#f59e0b' : undefined,
                  animation: `driftUp ${duration}s linear infinite`,
                  animationDelay: `${delay}s`,
                  pointerEvents: 'none',
                }}
              >
                {spark}
              </span>
            );
          })}
        </div>
      );
    }

    // 7. Bolhas Champagne para Réveillon / Ano Novo / Dia do Cliente
    if (temaNome === 'revellon' || temaNome === 'ano-novo' || temaNome === 'dia-do-cliente') {
      const items = temaNome === 'dia-do-cliente' ? ['👑', '✨', '⭐', '💎'] : ['🥂', '✨', '🍾', '🫧'];
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" style={{ height: '100%', minHeight: '100vh', width: '100%' }}>
          {Array.from({ length: 20 }).map((_, i) => {
            const size = Math.random() * 14 + 10;
            const left = Math.random() * 100;
            const duration = Math.random() * 8 + 5;
            const delay = Math.random() * 7;
            const val = items[i % items.length];
            return (
              <span
                key={i}
                style={{
                  position: 'absolute',
                  left: `${left}%`,
                  bottom: '-20px',
                  fontSize: `${size}px`,
                  animation: `driftUp ${duration}s linear infinite`,
                  animationDelay: `${delay}s`,
                  pointerEvents: 'none',
                }}
              >
                {val}
              </span>
            );
          })}
        </div>
      );
    }

    // 8. Sol e Emojis de Verão/Férias
    if (temaNome === 'ferias' || temaNome === 'oferta-verao') {
      const summer = ['☀️', '🌴', '🕶️', '🌊', '🍹'];
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" style={{ height: '100%', minHeight: '100vh', width: '100%' }}>
          {Array.from({ length: 12 }).map((_, i) => {
            const size = Math.random() * 18 + 12;
            const left = Math.random() * 100;
            const duration = Math.random() * 11 + 8;
            const delay = Math.random() * 9;
            const item = summer[i % summer.length];
            return (
              <span
                key={i}
                style={{
                  position: 'absolute',
                  left: `${left}%`,
                  bottom: '-30px',
                  fontSize: `${size}px`,
                  animation: `driftUp ${duration}s linear infinite`,
                  animationDelay: `${delay}s`,
                  pointerEvents: 'none',
                }}
              >
                {item}
              </span>
            );
          })}
        </div>
      );
    }

    return null;
  };

  return wrapWithFonts(
    <>
      <CookieBanner accentColor={inlineStyles.accentColor} backgroundColor={inlineStyles.quoteCard?.background || inlineStyles.pageWrapper?.background} textColor={inlineStyles.textColor} />
      {/* Preload custom font */}
      <link
        rel="stylesheet"
        href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(customFont)}:wght@400;500;600;700;800;900&display=swap`}
      />
      
      <style>{`
        @keyframes driftUp {
          0% { transform: translateY(100vh) translateX(0) scale(0.8); opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.8; }
          100% { transform: translateY(-10vh) translateX(20px) scale(1.2); opacity: 0; }
        }
        @keyframes snowFall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
        }
        @keyframes pulseBorderNeon {
          0%, 100% { box-shadow: 0 0 8px rgba(234,179,8,0.4), inset 0 0 4px rgba(234,179,8,0.2); border-color: #eab308; }
          50% { box-shadow: 0 0 20px rgba(234,179,8,0.8), inset 0 0 10px rgba(234,179,8,0.4); border-color: #fef08a; }
        }
        @keyframes bf-marquee-anim {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-100%, 0, 0); }
        }
        @keyframes sway {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }
        .bf-marquee {
          white-space: nowrap;
          overflow: hidden;
          background: #eab308;
          color: #000;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 2px;
          padding: 6px 0;
          font-size: 11px;
          border-bottom: 2px solid #000;
        }
        .bf-marquee-inner {
          display: inline-block;
          padding-left: 100%;
          animation: bf-marquee-anim 20s linear infinite;
        }
        .saojoao-bandeirinhas {
          display: flex;
          justify-content: space-between;
          width: 100%;
          padding: 0 8px;
          margin-top: -12px;
          margin-bottom: 16px;
          overflow: hidden;
          pointer-events: none;
        }
        .bandeirinha {
          width: 14px;
          height: 20px;
          background-color: #ef4444;
          clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 50% 70%, 0% 100%);
          animation: sway 2s ease-in-out infinite alternate;
        }
        .bandeirinha:nth-child(2n) { background-color: #3b82f6; animation-delay: 0.3s; }
        .bandeirinha:nth-child(3n) { background-color: #eab308; animation-delay: 0.6s; }
        .bandeirinha:nth-child(4n) { background-color: #22c55e; animation-delay: 0.9s; }
        .bandeirinha:nth-child(5n) { background-color: #ec4899; animation-delay: 1.2s; }
      `}</style>

      <div className={`min-h-screen ${tema.cores.bgPrincipal} py-4 sm:py-8 px-4 relative overflow-hidden`} style={{ ...inlineStyles.pageWrapper, fontFamily: customFontFamily }}>
        {renderThemeOverlay()}
        <div className="max-w-4xl mx-auto pb-6 relative z-10">
        
        {/* Letreiro Black Friday */}
        {template?.tema === 'black-friday' && (
          <div className="bf-marquee mb-4 rounded-lg overflow-hidden border border-zinc-800">
            <div className="bf-marquee-inner">
              🏷️ BLACK FRIDAY PRICEUS • OFERTA DE IMPACTO MÁXIMO • BLACK FRIDAY PRICEUS • OFERTA DE IMPACTO MÁXIMO • BLACK FRIDAY PRICEUS • OFERTA DE IMPACTO MÁXIMO
            </div>
          </div>
        )}

        {/* Temporizador Black Friday */}
        {template?.tema === 'black-friday' && (
          <div style={{
            background: 'linear-gradient(90deg, #ca8a04, #eab308, #ca8a04)',
            color: '#000',
            padding: '10px 24px',
            textAlign: 'center',
            fontSize: '13px',
            fontWeight: 900,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            boxShadow: '0 4px 15px rgba(234,179,8,0.35)',
            borderRadius: '12px',
            marginBottom: '20px',
            flexWrap: 'wrap',
          }}>
            <span>⚡ OFERTA EXCLUSIVA BLACK FRIDAY — EXPIRA EM:</span>
            <span style={{
              background: '#000',
              color: '#eab308',
              padding: '4px 12px',
              borderRadius: '6px',
              fontFamily: 'monospace',
              fontSize: '16px',
              fontWeight: 'bold',
              border: '1px solid #eab308'
            }}>
              {Math.floor(blackFridayTime / 3600).toString().padStart(2, '0')}:
              {Math.floor((blackFridayTime % 3600) / 60).toString().padStart(2, '0')}:
              {(blackFridayTime % 60).toString().padStart(2, '0')}
            </span>
          </div>
        )}

        {inlineStyles.topBanner && inlineStyles.topBannerText && (
          <div style={inlineStyles.topBanner}>
            {inlineStyles.themeEmoji && <span className="mr-2">{inlineStyles.themeEmoji}</span>}
            {inlineStyles.topBannerText}
          </div>
        )}
        
        {/* Bandeirinhas São João */}
        {template?.tema === 'sao-joao' && (
          <div className="saojoao-bandeirinhas">
            {Array.from({ length: 24 }).map((_, idx) => (
              <div key={idx} className="bandeirinha" />
            ))}
          </div>
        )}
        {profile && (
          <div className={`${tema.cores.bgCard} ${tema.estilos.borderRadius} ${tema.estilos.shadow} p-5 sm:p-6 mb-6 text-center border ${tema.cores.borda}`} style={inlineStyles.profileCard}>
            {profile.profile_image_url && (
              <img
                src={profile.profile_image_url}
                alt={profile.nome_profissional}
                className={`w-32 h-32 sm:w-36 sm:h-36 rounded-full mx-auto mb-4 object-cover border-4 ${tema.cores.textoDestaque.replace('text-', 'border-')}`}
                style={inlineStyles.avatarBorder}
                fetchPriority="high"
              />
            )}
            <h1 className={`text-2xl sm:text-3xl ${tema.estilos.fontHeading} ${tema.cores.textoPrincipal} mb-2 leading-tight`} style={inlineStyles.heading1}>
              {profile.nome_profissional || 'Fotógrafo Profissional'}
            </h1>
            {profile.tipo_fotografia && (
              <p className="text-gray-600 mb-2 text-sm sm:text-base" style={{ color: inlineStyles.textColorSecondary }}>{profile.tipo_fotografia}</p>
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

        <div className={`${tema.cores.bgCard} ${tema.estilos.borderRadius} ${tema.estilos.shadow} p-4 sm:p-6 mb-6 border ${tema.cores.borda}`} style={inlineStyles.quoteCard}>
          <h2 className={`text-xl sm:text-2xl ${tema.estilos.fontHeading} ${tema.cores.textoPrincipal} mb-4 leading-tight`} style={inlineStyles.heading2}>
            {template.titulo_template || template.nome_template}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="nome-cliente" className={`block text-sm font-medium ${tema.cores.textoSecundario} mb-2`} style={inlineStyles.label}>
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
                  style={inlineStyles.input}
                  required
                  aria-required="true"
                />
              </div>

              <div>
                <label htmlFor="email-cliente" className={`block text-sm font-medium ${tema.cores.textoSecundario} mb-2`} style={inlineStyles.label}>
                  E-mail *
                </label>
                <input
                  type="email"
                  id="email-cliente"
                  name="email_cliente"
                  value={formData.email_cliente}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, email_cliente: val });
                    setFieldErrors(prev => ({ ...prev, email: validateEmail(val) }));
                  }}
                  onBlur={(e) => {
                    setFieldErrors(prev => ({ ...prev, email: validateEmail(e.target.value) }));
                  }}
                  className={`w-full px-4 py-3 text-base border ${fieldErrors.email ? 'border-red-500 ring-1 ring-red-400' : tema.cores.borda} ${tema.cores.bgCard} ${tema.cores.textoPrincipal} rounded-lg focus:ring-2 focus:ring-opacity-50 touch-manipulation`}
                  style={{ ...inlineStyles.input, ...(fieldErrors.email ? { borderColor: '#ef4444', borderWidth: '1.5px' } : {}) }}
                  placeholder="seu@email.com"
                  required
                  aria-required="true"
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="telefone-cliente" className={`block text-sm font-medium ${tema.cores.textoSecundario} mb-2`} style={inlineStyles.label}>
                  Telefone/WhatsApp *
                </label>
                <input
                  type="tel"
                  id="telefone-cliente"
                  name="telefone_cliente"
                  value={formData.telefone_cliente}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, telefone_cliente: val });
                    setFieldErrors(prev => ({ ...prev, telefone: validatePhone(val) }));
                  }}
                  onBlur={(e) => {
                    setFieldErrors(prev => ({ ...prev, telefone: validatePhone(e.target.value) }));
                  }}
                  className={`w-full px-4 py-3 text-base border ${fieldErrors.telefone ? 'border-red-500 ring-1 ring-red-400' : tema.cores.borda} ${tema.cores.bgCard} ${tema.cores.textoPrincipal} rounded-lg focus:ring-2 focus:ring-opacity-50 touch-manipulation`}
                  style={{ ...inlineStyles.input, ...(fieldErrors.telefone ? { borderColor: '#ef4444', borderWidth: '1.5px' } : {}) }}
                  placeholder="(11) 98765-4321"
                  required
                  aria-required="true"
                />
                {fieldErrors.telefone && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    {fieldErrors.telefone}
                  </p>
                )}
              </div>
            </div>

            {/* Campos de Localização e Data para Preços Dinâmicos */}
            {((template?.sistema_sazonal_ativo && temporadas.length > 0) || (template?.sistema_geografico_ativo && paises.length > 0) || (agendaConfig?.agenda_ativa && !template?.ignorar_agenda_global)) && (
              <div className="border-t pt-6 mt-6">
                <h3 className={`text-lg font-semibold ${tema.cores.textoPrincipal} mb-4`} style={{ ...inlineStyles.heading2, fontSize: '1.25rem', borderBottom: 'none', paddingBottom: 0 }}>
                  📍 Localização e Data
                </h3>

                {renderLocationDateFields()}
              </div>
            )}

            {camposExtras.map((campo) => (
              <div key={campo.id}>
                <label className={`block text-sm font-medium ${tema.cores.textoSecundario} mb-2`} style={inlineStyles.label}>
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
                    style={inlineStyles.input}
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
                    style={inlineStyles.input}
                  />
                )}
              </div>
            ))}

            <div className="border-t pt-6" data-produtos-section style={{ borderTopColor: `${inlineStyles.textColorSecondary}20` }}>
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-xl font-semibold ${tema.cores.textoPrincipal} flex items-center gap-2`} style={{ ...inlineStyles.heading2, fontSize: '1.25rem', borderBottom: 'none', paddingBottom: 0 }}>
                  <ShoppingCart className="w-6 h-6" style={{ color: inlineStyles.accentColor }} />
                  Selecione os Serviços
                </h3>
                <button
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
                {produtos.map((produto, index) => {
                  const isHighlighted = produto.destacar_produto;
                  let highlightStyles = {};
                  if (isHighlighted) {
                    const tName = template?.tema;
                    if (tName === 'halloween') {
                      highlightStyles = {
                        border: '2px solid #ea580c',
                        boxShadow: '0 0 25px rgba(234, 88, 12, 0.4)',
                        background: 'rgba(234, 88, 12, 0.12)',
                        transform: 'scale(1.02)',
                        position: 'relative',
                        zIndex: 2,
                      };
                    } else if (tName === 'black-friday') {
                      highlightStyles = {
                        border: '2px solid #eab308',
                        boxShadow: '0 0 20px #eab308, inset 0 0 10px rgba(234,179,8,0.2)',
                        background: 'rgba(254, 240, 138, 0.04)',
                        transform: 'scale(1.02)',
                        position: 'relative',
                        zIndex: 2,
                        animation: 'pulseBorderNeon 2s infinite',
                      };
                    } else if (tName === 'sao-joao') {
                      highlightStyles = {
                        border: '2px solid #ea580c',
                        boxShadow: '0 0 20px rgba(234, 88, 12, 0.35)',
                        background: 'rgba(251, 146, 60, 0.08)',
                        transform: 'scale(1.02)',
                        position: 'relative',
                        zIndex: 2,
                      };
                    } else if (tName === 'natal') {
                      highlightStyles = {
                        border: '2px solid #dc2626',
                        boxShadow: '0 0 20px rgba(220, 38, 38, 0.35)',
                        background: 'rgba(220, 38, 38, 0.06)',
                        transform: 'scale(1.02)',
                        position: 'relative',
                        zIndex: 2,
                      };
                    } else if (tName === 'revellon' || tName === 'ano-novo') {
                      highlightStyles = {
                        border: '2px solid #d4a853',
                        boxShadow: '0 0 20px rgba(212, 168, 83, 0.35)',
                        background: 'rgba(212, 168, 83, 0.08)',
                        transform: 'scale(1.02)',
                        position: 'relative',
                        zIndex: 2,
                      };
                    } else if (tName === 'dia-do-cliente') {
                      highlightStyles = {
                        border: '2.5px double #d4a853',
                        boxShadow: '0 0 25px rgba(212, 168, 83, 0.4)',
                        background: 'rgba(212, 168, 83, 0.07)',
                        transform: 'scale(1.02)',
                        position: 'relative',
                        zIndex: 2,
                      };
                    } else if (tName === 'dia-dos-pais') {
                      highlightStyles = {
                        border: '2px solid #38bdf8',
                        boxShadow: '0 0 15px rgba(56, 189, 248, 0.25)',
                        background: 'rgba(56, 189, 248, 0.05)',
                        transform: 'scale(1.01)',
                        position: 'relative',
                        zIndex: 2,
                      };
                    } else {
                      highlightStyles = {
                        border: '2px solid #f59e0b',
                        boxShadow: '0 8px 25px rgba(245,158,11,0.25)',
                        background: 'rgba(245, 158, 11, 0.04)',
                        transform: 'scale(1.02)',
                        position: 'relative',
                        zIndex: 2,
                      };
                    }
                  }

                  return (
                    <div
                      key={produto.id}
                      ref={index === 0 ? firstProductRef : null}
                      className={`border ${tema.estilos.borderRadius} p-4 sm:p-5 transition-all ${tema.estilos.shadow} ${
                        selectedProdutos[produto.id]
                          ? `${tema.cores.textoDestaque.replace('text-', 'border-')} ${tema.cores.secundaria}`
                          : `${tema.cores.borda} ${tema.cores.bgHover}`
                      }`}
                      style={{
                        ...inlineStyles.productCard,
                        ...(selectedProdutos[produto.id]
                          ? {
                              borderColor: inlineStyles.accentColor,
                              boxShadow: `0 0 0 2px ${inlineStyles.accentColor}1a, ${inlineStyles.productCard.boxShadow || ''}`,
                            }
                          : {}),
                        ...highlightStyles,
                      }}
                    > 
                      {/* Layout dinâmico: 'linha' (sm:flex-row) ou 'quadro' (flex-col) para desktop */}
                      <div className={`flex flex-col gap-4 ${
                        template?.layout_produtos_desktop === 'quadro'
                          ? 'sm:items-center' // Layout Quadro: mantém flex-col e centraliza
                          : 'sm:flex-row sm:items-start' // Layout Linha: muda para flex-row
                      }`}>
                        {produto.mostrar_imagem && (produto.imagem_url || (produto.imagens && produto.imagens.length > 0)) && (
                          (() => {
                            const sizeClasses = {
                              pequeno: 'w-32 h-32 sm:w-48 sm:h-48',
                              medio: 'w-48 h-48 sm:w-80 sm:h-80',
                              grande: 'w-full h-auto sm:w-96 sm:h-96',
                            };
                             const imageSize = template?.tamanho_imagem_grid || 'medio';
                             const finalClass = sizeClasses[imageSize as keyof typeof sizeClasses] || sizeClasses.medio;
                             return (
                               <div className={`mx-auto sm:mx-0 rounded-lg overflow-hidden ${finalClass}`}>
                                 {produto.imagens && produto.imagens.length > 0 ? (
                                   <ProductGalleryCarousel
                                     images={[produto.imagem_url, ...(produto.imagens || [])].filter(Boolean) as string[]}
                                     autoPlay={produto.carrossel_automatico}
                                     productName={produto.nome}
                                   />
                                 ) : (
                                   <ImageWithFallback
                                     src={produto.imagem_url || ''}
                                     alt={produto.nome}
                                     className="w-full h-full object-cover"
                                     fallbackClassName="w-full h-full"
                                     retries={2}
                                   />
                                 )}
                               </div>
                             );
                          })()
                        )}
                        <div className="flex-1 min-w-0">
                          {/* Highlight badge */}
                          {produto.destacar_produto && produto.destaque_texto && (
                            <div className="mb-2">
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                background:
                                  template?.tema === 'halloween'
                                    ? 'linear-gradient(135deg, #a855f7, #ea580c)'
                                    : template?.tema === 'black-friday'
                                    ? 'linear-gradient(135deg, #ca8a04, #ca8a04)'
                                    : template?.tema === 'sao-joao'
                                    ? 'linear-gradient(135deg, #ea580c, #ef4444)'
                                    : template?.tema === 'natal'
                                    ? 'linear-gradient(135deg, #dc2626, #16a34a)'
                                    : template?.tema === 'dia-dos-pais'
                                    ? 'linear-gradient(135deg, #0284c7, #0369a1)'
                                    : template?.tema === 'dia-do-cliente'
                                    ? 'linear-gradient(135deg, #d4a853, #1e1b4b)'
                                    : 'linear-gradient(135deg,#f59e0b,#ef4444)',
                                borderRadius: 999,
                                padding: '2px 10px',
                                fontSize: 10,
                                fontWeight: 900,
                                color: template?.tema === 'black-friday' ? '#000' : '#fff',
                                letterSpacing: '0.5px',
                                textTransform: 'uppercase',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                              }}>
                                {template?.tema === 'halloween' ? '🎃' : template?.tema === 'black-friday' ? '🏷️' : template?.tema === 'sao-joao' ? '🔥' : template?.tema === 'natal' ? '🎁' : template?.tema === 'dia-do-cliente' ? '👑' : template?.tema === 'dia-dos-pais' ? '👔' : '⭐'}{' '}
                                {produto.destaque_texto}
                              </span>
                            </div>
                          )}
                        <h4 className={`font-semibold text-base sm:text-lg ${tema.cores.textoPrincipal} flex flex-wrap items-center gap-2`} style={{ color: inlineStyles.textColor }}>
                          <span>{produto.nome}</span>
                          {produto.obrigatorio && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full whitespace-nowrap">
                              Obrigatório
                            </span>
                          )}
                          {template?.exibir_duracao_produto && produto.duracao_minutos && produto.duracao_minutos > 0 && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full whitespace-nowrap flex items-center gap-1">
                              ⏱️ {formatDuration(produto.duracao_minutos)}
                            </span>
                          )}
                        </h4>
                        {produto.resumo && (
                          <FormattedDescription text={produto.resumo} className="mt-2" />
                        )}

                        {/* Brindes Vinculados em Sub-Cards */}
                        {produto.brindes_vinculados && Array.isArray(produto.brindes_vinculados) && produto.brindes_vinculados.length > 0 && (
                          <div className="mt-3.5 space-y-2 border-t border-dashed border-gray-250 dark:border-white/10 pt-3">
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                              🎁 {produto.brindes_titulo_personalizado || 'Brinde(s) Incluso(s)'}:
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5">
                              {produto.brindes_vinculados.map((brindeId: string) => {
                                const brinde = brindesProdutos.find(u => u.id === brindeId);
                                if (!brinde) return null;
                                const mostrarValores = produto.brindes_mostrar_valores ?? true;
                                return (
                                  <div
                                    key={brindeId}
                                    className="flex items-center gap-3 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/15 dark:bg-emerald-950/5 shadow-sm"
                                  >
                                    {brinde.imagem_url && (
                                      <img
                                        src={brinde.imagem_url}
                                        alt={brinde.nome}
                                        className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
                                      />
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <div className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
                                        {brinde.nome}
                                      </div>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        {mostrarValores && brinde.valor > 0 && (
                                          <span className="text-[10px] text-gray-400 line-through">
                                            {formatCurrency(brinde.valor)}
                                          </span>
                                        )}
                                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-350 px-1.5 py-0.5 rounded font-bold">
                                          Grátis
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {!template.ocultar_valores_intermediarios && (() => {
                          const desconto = produto.desconto_percentual ?? 0;
                          const valorFinal = produto.valor * (1 - desconto / 100);
                          return (
                            <div className="mt-3 flex items-center gap-2 flex-wrap">
                              {desconto > 0 && (
                                <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${inlineStyles.accentColor}15`, color: inlineStyles.accentColor }}>
                                  🏷️ {desconto}% OFF
                                </span>
                              )}
                              <div className="flex items-center gap-2">
                                {desconto > 0 && (
                                  <span className="text-sm text-gray-400 line-through">{formatCurrency(produto.valor)}</span>
                                )}
                                <span className="text-lg sm:text-xl font-bold text-blue-600" style={inlineStyles.priceBadge}>{formatCurrency(valorFinal)}</span>
                              </div>
                              {desconto > 0 && (
                                <span className="text-xs text-green-600">Economia de {formatCurrency(produto.valor - valorFinal)}</span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Controle: toggle simples ou +/- quantidade */}
                    {(produto.permite_multiplas_unidades ?? true) ? (
                      <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-gray-200" style={{ borderTopColor: `${inlineStyles.textColorSecondary}20` }}>
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
                        style={{
                          background: `${inlineStyles.textColorSecondary}15`,
                          color: inlineStyles.textColor,
                        }}
                        aria-label="Diminuir quantidade"
                      >
                        -
                      </button>
                      <span className={`min-w-[60px] text-center font-bold text-xl ${tema.cores.textoPrincipal}`} style={{ color: inlineStyles.textColor }}>
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
                        style={{
                          background: inlineStyles.accentColor,
                          color: '#fff',
                        }}
                        title={!produto.obrigatorio && !fieldsValidation.canAddProducts ? 'Preencha os campos obrigatórios primeiro' : ''}
                        aria-label="Aumentar quantidade"
                      >
                        {!produto.obrigatorio && !fieldsValidation.canAddProducts ? <Lock className="w-5 h-5" /> : '+'}
                      </button>
                    </div>
                    ) : (
                      // Modo toggle — selecionar/desselecionar (qty sempre 0 ou 1)
                      <div className="mt-4 pt-4 border-t border-gray-200" style={{ borderTopColor: `${inlineStyles.textColorSecondary}20` }}>
                        {produto.obrigatorio ? (
                          <div className="flex items-center justify-center gap-2 py-2 px-4 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold" style={{ background: `${inlineStyles.accentColor}15`, color: inlineStyles.accentColor }}>
                            <Check className="w-4 h-4" /> Incluído
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (!fieldsValidation.canAddProducts && !selectedProdutos[produto.id]) {
                                alert(fieldsValidation.validationMessage);
                                return;
                              }
                              handleProdutoQuantityChange(
                                produto.id,
                                selectedProdutos[produto.id] ? 0 : 1
                              );
                            }}
                            className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
                              selectedProdutos[produto.id]
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                            style={
                              selectedProdutos[produto.id]
                                ? { background: inlineStyles.accentColor, color: '#fff' }
                                : { background: `${inlineStyles.textColorSecondary}15`, color: inlineStyles.textColor }
                            }
                          >
                            {selectedProdutos[produto.id] ? '✓ Selecionado' : 'Selecionar'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            </div>

            {/* 🎁 Upselling – acima das formas de pagamento */}
            {renderUpsellSection()}

            {formasPagamentoProcessadas.length > 0 && (
              <div className="border-t pt-6" data-pagamento-section style={{ borderTopColor: `${inlineStyles.textColorSecondary}20` }}>
                <h3 className={`text-xl font-semibold ${tema.cores.textoPrincipal} mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2`} style={{ ...inlineStyles.heading2, fontSize: '1.25rem', borderBottom: 'none', paddingBottom: 0 }}>
                  <span>Forma de Pagamento</span>
                  {!selectedFormaPagamento && (
                    <span className="text-xs px-3 py-1 bg-amber-50 text-amber-800 font-medium rounded-full animate-pulse border border-amber-200">
                      {template?.forma_pagamento_obrigatoria ? '⚠️ Escolha obrigatória para enviar' : 'ℹ️ Por favor, selecione uma opção'}
                    </span>
                  )}
                </h3>

                {!selectedFormaPagamento && (
                  <div className={`mb-4 p-4 rounded-xl text-sm flex items-start gap-2.5 transition-all ${
                    template?.forma_pagamento_obrigatoria 
                      ? 'bg-red-50 text-red-800 border border-red-200' 
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-semibold mb-0.5">
                        {template?.forma_pagamento_obrigatoria ? 'Escolha Obrigatória' : 'Escolha uma Forma de Pagamento'}
                      </strong>
                      <span className="opacity-90">
                        {template?.forma_pagamento_obrigatoria 
                          ? 'Selecione uma das opções abaixo para liberar o envio do orçamento via WhatsApp.' 
                          : 'Selecione uma das opções abaixo para prosseguir com o orçamento.'}
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {formasPagamentoProcessadas.map((forma) => (
                    <label
                      key={forma.id}
                      className={`flex items-start gap-3 p-4 sm:p-5 border rounded-lg cursor-pointer transition-all touch-manipulation ${
                        selectedFormaPagamento === forma.id
                          ? 'border-blue-600 bg-blue-50'
                          : forma.is_default
                          ? 'border-amber-400 bg-amber-50/10 shadow-[0_4px_12px_rgba(245,158,11,0.06)]'
                          : 'border-gray-200 hover:border-gray-300 active:border-gray-400'
                      }`}
                      style={{
                        ...inlineStyles.productCard,
                        ...(selectedFormaPagamento === forma.id
                          ? {
                              borderColor: inlineStyles.accentColor,
                              background: `${inlineStyles.accentColor}08`,
                              boxShadow: `0 0 0 2px ${inlineStyles.accentColor}1a`,
                            }
                          : forma.is_default
                          ? {
                              borderColor: '#fbbf24',
                            }
                          : {
                              borderColor: `${inlineStyles.textColorSecondary}30`,
                            }),
                      }}
                    >
                      <input
                        type="radio"
                        name="formaPagamento"
                        value={forma.id}
                        checked={selectedFormaPagamento === forma.id}
                        onChange={(e) => setSelectedFormaPagamento(e.target.value)}
                        className="w-5 h-5 mt-0.5 text-blue-600 flex-shrink-0"
                        style={{ accentColor: inlineStyles.accentColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <div className={`font-semibold text-base ${tema.cores.textoPrincipal}`} style={{ color: inlineStyles.textColor }}>{forma.nome}</div>
                          {forma.is_default && (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-200 uppercase tracking-wider whitespace-nowrap">
                              ⭐ Recomendado
                            </span>
                          )}
                        </div>
                        <div className={`text-sm ${tema.cores.textoSecundario} leading-relaxed`} style={{ color: inlineStyles.textColorSecondary }}>
                          <div>
                            {forma.entrada_tipo === 'percentual'
                              ? `Entrada de ${forma.entrada_valor}%`
                              : `Entrada de ${formatCurrency(forma.entrada_valor)}`}
                          </div>
                          {(() => {
                            const maxParcelasCalculado = getDynamicMaxParcelas(forma);
                            return maxParcelasCalculado > 0 && (
                              <div className="mt-0.5">+ {maxParcelasCalculado}x parcela{maxParcelasCalculado > 1 ? 's' : ''}</div>
                            );
                          })()}
                          {forma.acrescimo > 0 && (
                            <div className="text-orange-600 mt-0.5" style={{ color: '#ea580c' }}>(+{forma.acrescimo}% acréscimo)</div>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                {selectedFormaPagamento && (() => {
                  const formaPagamento = formasPagamentoProcessadas.find((f) => f.id === selectedFormaPagamento);
                  if (!formaPagamento) return null;

                  const total = calculateTotal();
                  const valorEntrada = formaPagamento.entrada_tipo === 'percentual'
                    ? (total * formaPagamento.entrada_valor) / 100
                    : formaPagamento.entrada_valor;
                  const saldoRestante = Math.max(0, total - valorEntrada);
                  const maxParcelasCalculado = getDynamicMaxParcelas(formaPagamento);
                  const valorParcela = maxParcelasCalculado > 0 ? saldoRestante / maxParcelasCalculado : 0;

                  return (
                    <div className="mt-4 bg-blue-50 rounded-lg p-4 sm:p-5 space-y-3" style={inlineStyles.totalSection}>
                      <h4 className={`font-semibold text-base ${tema.cores.textoPrincipal}`} style={{ color: inlineStyles.textColor }}>💳 Detalhes do Parcelamento</h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="bg-white rounded-lg p-3" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.05)' }}>
                          <div className={`${tema.cores.textoSecundario} text-xs mb-1`} style={{ color: inlineStyles.textColorSecondary }}>Entrada:</div>
                          <div className="font-bold text-blue-600 text-lg" style={{ color: inlineStyles.accentColor }}>
                            {formatCurrency(valorEntrada)}
                          </div>
                          {formaPagamento.entrada_tipo === 'percentual' && (
                            <div className="text-xs text-gray-500 mt-1" style={{ color: inlineStyles.textColorSecondary }}>
                              ({formaPagamento.entrada_valor}% do total)
                            </div>
                          )}
                        </div>

                        {maxParcelasCalculado > 0 && saldoRestante > 0.01 && (
                          <div className="bg-white rounded-lg p-3" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.05)' }}>
                            <div className={`${tema.cores.textoSecundario} text-xs mb-1`} style={{ color: inlineStyles.textColorSecondary }}>Parcelas:</div>
                            <div className="font-bold text-blue-600 text-lg" style={{ color: inlineStyles.accentColor }}>
                              {maxParcelasCalculado}x de {formatCurrency(valorParcela)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1" style={{ color: inlineStyles.textColorSecondary }}>
                              Saldo restante
                            </div>
                          </div>
                        )}
                      </div>

                      {formaPagamento.acrescimo !== 0 && (
                        <div className="bg-white rounded-lg p-3 text-sm" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.05)' }}>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600" style={{ color: inlineStyles.textColorSecondary }}>
                              {formaPagamento.acrescimo > 0 ? 'Acréscimo' : 'Desconto'} aplicado:
                            </span>
                            <span className={`font-bold ${formaPagamento.acrescimo > 0 ? 'text-orange-600' : 'text-green-600'}`} style={{ color: formaPagamento.acrescimo > 0 ? '#ea580c' : '#16a34a' }}>
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
              <div className="border-t pt-6" style={{ borderTopColor: `${inlineStyles.textColorSecondary}20` }}>
                <h3 className="text-lg font-semibold text-gray-900 mb-4" style={{ ...inlineStyles.heading2, fontSize: '1.25rem', borderBottom: 'none', paddingBottom: 0 }}>
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
                    style={inlineStyles.input}
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
                  style={{
                    background: cupomAtivo ? '#dc2626' : inlineStyles.accentColor,
                    color: '#fff',
                  }}
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
              <div className="border-t pt-6" style={{ borderTopColor: `${inlineStyles.textColorSecondary}20` }}>
              <div className="bg-gray-50 rounded-lg p-4 sm:p-6 space-y-3" style={inlineStyles.totalSection}>
                {(() => {
                  const breakdown = getPriceBreakdown();
                  const ocultarIntermediarios = template?.ocultar_valores_intermediarios;

                  return (
                    <>
                      {!ocultarIntermediarios && (
                        <>
                          <div className="flex items-start justify-between text-sm gap-2">
                            <span className={`${tema.cores.textoSecundario} flex-1`} style={{ color: inlineStyles.textColorSecondary }}>Subtotal (Produtos):</span>
                            <span className={`${tema.cores.textoPrincipal} font-semibold text-right`} style={{ color: inlineStyles.textColor }}>
                              {formatCurrency(breakdown.subtotal)}
                            </span>
                          </div>

                          {breakdown.ajusteSazonal !== 0 && (
                            <div className="flex items-start justify-between text-sm gap-2">
                              <span className={`${tema.cores.textoSecundario} flex-1`} style={{ color: inlineStyles.textColorSecondary }}>
                                Ajuste Sazonal ({breakdown.ajusteSazonal > 0 ? '+' : ''}
                                {((breakdown.ajusteSazonal / breakdown.subtotal) * 100).toFixed(1)}%):
                              </span>
                              <span
                                className={`font-semibold text-right ${
                                  breakdown.ajusteSazonal > 0 ? 'text-red-600' : 'text-green-600'
                                }`}
                                style={{ color: breakdown.ajusteSazonal > 0 ? '#dc2626' : '#16a34a' }}
                              >
                                {breakdown.ajusteSazonal > 0 ? '+' : ''}
                                {formatCurrency(breakdown.ajusteSazonal)}
                              </span>
                            </div>
                          )}

                          {breakdown.ajusteGeografico.percentual !== 0 && (
                            <div className="flex items-start justify-between text-sm gap-2">
                              <span className={`${tema.cores.textoSecundario} flex-1`} style={{ color: inlineStyles.textColorSecondary }}>Ajuste Geográfico:</span>
                              <span
                                className={`font-semibold text-right ${
                                  breakdown.ajusteGeografico.percentual > 0 ? 'text-red-600' : 'text-green-600'
                                }`}
                                style={{ color: breakdown.ajusteGeografico.percentual > 0 ? '#dc2626' : '#16a34a' }}
                              >
                                {breakdown.ajusteGeografico.percentual > 0 ? '+' : ''}
                                {formatCurrency(breakdown.ajusteGeografico.percentual)}
                              </span>
                            </div>
                          )}

                          {breakdown.taxaDeslocamento > 0 && (
                            <div className="flex items-start justify-between text-sm gap-2">
                              <span className={`${tema.cores.textoSecundario} flex-1`} style={{ color: inlineStyles.textColorSecondary }}>Taxa de Deslocamento:</span>
                              <span className="text-red-600 font-semibold text-right" style={{ color: '#dc2626' }}>
                                +{formatCurrency(breakdown.taxaDeslocamento)}
                              </span>
                            </div>
                          )}

                          {breakdown.acrescimoFormaPagamento !== 0 && (
                            <div className="flex items-start justify-between text-sm gap-2">
                              <span className={`${tema.cores.textoSecundario} flex-1`} style={{ color: inlineStyles.textColorSecondary }}>
                                {breakdown.acrescimoFormaPagamento > 0 ? 'Acréscimo' : 'Desconto'} Forma de Pagamento:
                              </span>
                              <span
                                className={`font-semibold text-right ${
                                  breakdown.acrescimoFormaPagamento > 0 ? 'text-red-600' : 'text-green-600'
                                }`}
                                style={{ color: breakdown.acrescimoFormaPagamento > 0 ? '#dc2626' : '#16a34a' }}
                              >
                                {breakdown.acrescimoFormaPagamento > 0 ? '+' : ''}
                                {formatCurrency(breakdown.acrescimoFormaPagamento)}
                              </span>
                            </div>
                          )}

                          {breakdown.descontoCupom > 0 && (
                            <div className="flex items-start justify-between text-sm gap-2">
                              <span className={`${tema.cores.textoSecundario} flex-1`} style={{ color: inlineStyles.textColorSecondary }}>Desconto Cupom ({cupomDesconto}%):</span>
                              <span className="text-green-600 font-semibold text-right" style={{ color: '#16a34a' }}>
                                -{formatCurrency(breakdown.descontoCupom)}
                              </span>
                            </div>
                          )}
                        </>
                      )}

                      <div className="border-t pt-3 mt-3" ref={totalSectionRef} data-total-section style={{ borderTopColor: `${inlineStyles.textColorSecondary}30` }}>
                        <div className="flex items-center justify-between gap-2">
                          <span className={`${tema.cores.textoPrincipal} text-lg sm:text-xl md:text-2xl font-bold flex-1`} style={{ color: inlineStyles.textColor }}>{template?.usar_termo_investimento ? 'Investimento Total:' : 'Valor Total:'}</span>
                          <span className="text-blue-600 text-xl sm:text-2xl md:text-3xl font-bold text-right" style={{ color: inlineStyles.accentColor }}>{formatCurrency(calculateTotal())}</span>
                        </div>
                        {ocultarIntermediarios && (
                          <p className="text-xs text-gray-500 mt-2 text-center leading-relaxed" style={{ color: inlineStyles.textColorSecondary }}>
                            Valor final já inclui todos os ajustes aplicáveis
                          </p>
                        )}
                        {selectedFormaPagamento && (() => {
                          const formaPagamento = formasPagamentoProcessadas.find((f) => f.id === selectedFormaPagamento);
                          if (!formaPagamento) return null;

                          const total = calculateTotal();
                          const valorEntrada = formaPagamento.entrada_tipo === 'percentual'
                            ? (total * formaPagamento.entrada_valor) / 100
                            : formaPagamento.entrada_valor;
                          const saldoRestante = Math.max(0, total - valorEntrada);
                          const maxParcelasCalculado = getDynamicMaxParcelas(formaPagamento);
                          const valorParcela = maxParcelasCalculado > 0 ? saldoRestante / maxParcelasCalculado : 0;

                          return (
                            <div className="mt-3 pt-3 border-t border-gray-300" style={{ borderTopColor: `${inlineStyles.textColorSecondary}30` }}>
                              <div className="text-sm text-gray-700 space-y-1" style={{ color: inlineStyles.textColor }}> 
                                <div className="flex justify-between items-center">
                                  <span className="font-medium">Forma de Pagamento:</span>
                                  <span className="font-semibold text-blue-600" style={{ color: inlineStyles.accentColor }}>{formaPagamento.nome}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span>Entrada:</span>
                                  <span className="font-semibold">{formatCurrency(valorEntrada)}</span>
                                </div>
                                {maxParcelasCalculado > 0 && saldoRestante > 0.01 && (
                                  <div className="flex justify-between items-center">
                                    <span>Parcelas:</span>
                                    <span className="font-semibold">{maxParcelasCalculado}x de {formatCurrency(valorParcela)}</span>
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
              style={{
                ...inlineStyles.submitButton,
                ...((isSubmitting ||
                  !profile?.whatsapp_principal ||
                  !fieldsValidation.canUseWhatsApp ||
                  (disponibilidade?.modo_aviso === 'restritivo' &&
                   (disponibilidade?.status === 'ocupada' || disponibilidade?.status === 'bloqueada')))
                  ? { opacity: 0.5, cursor: 'not-allowed', background: '#9ca3af', border: 'none', boxShadow: 'none' }
                  : {})
              }}
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

          {/* Rate Photographer Button removido de propostas públicas */}
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

      {template?.exibir_painel_flutuante !== false && (
        <FloatingTotalPanel
          calculateTotal={calculateTotal}
          selectedProdutos={selectedProdutos}
          produtos={produtos}
          tema={tema}
          ocultarValoresIntermediarios={template?.ocultar_valores_intermediarios || false}
          firstProductRef={firstProductRef}
          totalSectionRef={totalSectionRef}
          temaNome={template?.tema || 'padrao'}
          breakdown={priceBreakdown}
        />
      )}

      {/* Modal de Resumo e Envio */}
      {renderSummaryModal()}

      {/* Rodapé */}
      {!(profile?.status_assinatura === 'active') && (
        <footer ref={footerRef} className="py-8 text-center text-sm text-gray-500 border-t border-gray-200 mt-8">
          Powered by <a href="https://priceus.com.br" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:text-amber-600 font-bold">PriceUs</a>
        </footer>
      )}
    </div>
    </>
  );
}
