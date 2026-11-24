import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLeadCapture } from '../hooks/useLeadCapture';
import { useRequiredFieldsValidation } from '../hooks/useRequiredFieldsValidation';
import { useQuoteAnalytics } from '../hooks/useQuoteAnalytics';
import { formatCurrency, formatDuration } from '../lib/utils';
import { ShoppingCart, Send, Lock, User, AlertCircle, Check, X, Trash2, MessageSquare, MessageCircle, Sparkles, ShieldCheck } from 'lucide-react';
import { checkAvailability, getOrCreateAgendaConfig, type AvailabilityResult } from '../services/availabilityService';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { ProductGalleryCarousel } from '../components/ui/ProductGalleryCarousel';
import { CookieBanner } from '../components/CookieBanner';
import { QuoteChatDrawer } from '../components/chat/QuoteChatDrawer';
import { RealtimeChatService, VendorOnlinePresence } from '../services/realtimeChatService';
import { MobileDatePicker } from '../components/MobileDatePicker';
import { AvailabilityIndicator } from '../components/AvailabilityIndicator';
import { generateWhatsAppMessage, generateWaLinkToPhotographer } from '../lib/whatsappMessageGenerator';
import { getTema, TemaType } from '../lib/themes'; // Remove unused theme helpers
import { getThemeInlineStyles } from '../lib/themeStyles';
import { PublicReviews } from '../components/PublicReviews';
import { FloatingTotalPanel } from '../components/FloatingTotalPanel';
import { QuoteHeaderRating } from '../components/QuoteHeaderRating';
import { BrindesCountdown } from '../components/BrindesCountdown';
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
import {
  EscalaoQuantidadeProduto,
  FaixaPrecoProduto,
  RegraPrecoDataProduto,
  resolveProductEffectivePrice,
  resolveProductQuantityPricing,
  calculateProgressiveDiscounts,
  resolveTierPrice,
} from '../lib/progressivePricing';

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
  quantidade_maxima?: number | null;
  destacar_produto?: boolean;
  destaque_texto?: string | null;
  keywords_upsell?: string | null;
  brindes_vinculados?: string[] | null;
  brindes_titulo_personalizado?: string | null;
  brindes_expira?: boolean;
  brindes_expira_tipo?: 'dias' | 'data';
  brindes_expira_dias?: number | null;
  brindes_expira_data?: string | null;
  brindes_mostrar_valores?: boolean;
  grupo_desconto?: string | null;
  faixas_preco?: FaixaPrecoProduto[] | null;
  escaloes_quantidade?: EscalaoQuantidadeProduto[] | null;
  regras_preco_data?: RegraPrecoDataProduto[] | null;
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
  const [leadCreatedAt, setLeadCreatedAt] = useState<string | null>(null);

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
  const [selectedTiers, setSelectedTiers] = useState<Record<string, string>>({});
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
  const [cupomTipoDesconto, setCupomTipoDesconto] = useState<'percentual' | 'valor_fixo'>('percentual');
  const [cupomValorFixo, setCupomValorFixo] = useState<number>(0);
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
  // Chat de Negociação Online PriceU$ (Passos 1, 2, 3 e 4)
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [chatConversationId, setChatConversationId] = useState('');
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [toastChatNotice, setToastChatNotice] = useState<string | null>(null);
  const [vendorPresence, setVendorPresence] = useState<VendorOnlinePresence>(() => {
    return RealtimeChatService.getVendorOnlinePresence(template?.user_id || profile?.id || '');
  });
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

  // 🔄 Template Alternativo / Exit-Intent Offer ("Monte seu Pacote")
  const [alternativeTemplate, setAlternativeTemplate] = useState<{ id: string; nome_template: string; slug_template?: string } | null>(null);
  const [showAlternativeModal, setShowAlternativeModal] = useState(false);

  // 📅 Sistema de Verificação de Disponibilidade
  const [disponibilidade, setDisponibilidade] = useState<AvailabilityResult | null>(null);
  const [horarioSelecionado, setHorarioSelecionado] = useState<string>('');
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [agendaConfig, setAgendaConfig] = useState<any>(null);
  const [_feriadosNacionais, _setFeriadosNacionais] = useState<string[]>([]); // Estado para feriados da API
  const [agendaFeriados, setAgendaFeriados] = useState<string[]>([]);
  const [datasBloqueadas, setDatasBloqueadas] = useState<string[]>([]);
  const [periodosBloqueados, setPeriodosBloqueados] = useState<{data_inicio: string, data_fim: string}[]>([]);

  const allCustomHolidays = useMemo(() => {
    const tplHolidays: string[] = Array.isArray(template?.feriados_personalizados)
      ? template.feriados_personalizados
      : [];
    return Array.from(new Set([...tplHolidays, ...agendaFeriados]));
  }, [template?.feriados_personalizados, agendaFeriados]);

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

        setLeadCreatedAt(leadData.data_orcamento || leadData.created_at || null);

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

  // Pre-popular dados do cliente caso venha de outro orçamento via query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nomeParam = params.get('nome') || params.get('nome_cliente');
    const emailParam = params.get('email') || params.get('email_cliente');
    const telParam = params.get('tel') || params.get('telefone') || params.get('telefone_cliente');
    const dataParam = params.get('data') || params.get('data_evento');
    const cidadeParam = params.get('cidade') || params.get('cidade_evento');

    if (nomeParam || emailParam || telParam) {
      setFormData(prev => ({
        ...prev,
        nome_cliente: nomeParam || prev.nome_cliente,
        email_cliente: emailParam || prev.email_cliente,
        telefone_cliente: telParam || prev.telefone_cliente,
      }));
    }

    if (dataParam) {
      setDataEvento(dataParam);
    }

    if (cidadeParam) {
      setCidadeSelecionada(cidadeParam);
    }
  }, []);

  const getAlternativeQuoteUrl = () => {
    if (!alternativeTemplate || !profile) return '#';
    const baseSlug = profile.slug_usuario;
    const targetSlug = alternativeTemplate.slug_template || alternativeTemplate.id;
    const baseUrl = baseSlug ? `/orcamento/${baseSlug}/${targetSlug}` : `/orcamento/${targetSlug}`;
    
    const params = new URLSearchParams();
    if (formData.nome_cliente) params.set('nome', formData.nome_cliente);
    if (formData.email_cliente) params.set('email', formData.email_cliente);
    if (formData.telefone_cliente) params.set('tel', formData.telefone_cliente);
    if (dataEvento) params.set('data', dataEvento);
    if (cidadeSelecionada) params.set('cidade', cidadeSelecionada);

    const qs = params.toString();
    return qs ? `${baseUrl}?${qs}` : baseUrl;
  };

  // 🚪 Exit Intent Listener para Resgate de Leads / Monte seu Pacote
  // Só dispara quando o cliente JÁ COTOU (selecionou produto), NÃO clicou no CTA
  // e está prestes a sair. Nunca na abertura da página (evita desconfiança/evasão).
  const hasQuotedProducts = Object.values(selectedProdutos).some((q) => q > 0);
  const pageOpenedAtRef = useRef(Date.now());

  useEffect(() => {
    if (!template?.template_alternativo_ativo || !alternativeTemplate || hasSubmitted) return;
    if (!hasQuotedProducts || isChatDrawerOpen || showAlternativeModal || showSummaryModal) return;

    const sessionKey = `dismissed_alt_modal_${template.id}`;
    if (sessionStorage.getItem(sessionKey)) return;

    const MIN_TIME_ON_PAGE_MS = 15000;
    const trigger = () => {
      if (Date.now() - pageOpenedAtRef.current < MIN_TIME_ON_PAGE_MS) return;
      setShowAlternativeModal(true);
    };

    // Desktop: cursor saindo pelo topo (rumo à aba/fechar)
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 15) trigger();
    };

    // Mobile: cliente trocou de aba/app; ao voltar, mostra a oferta
    let leftPage = false;
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') leftPage = true;
      else if (leftPage) trigger();
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [template, alternativeTemplate, hasSubmitted, hasQuotedProducts, isChatDrawerOpen, showAlternativeModal, showSummaryModal]);



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

      checkAvailability(
        template.user_id,
        dataEvento,
        activeDuration,
        0,
        Boolean(template?.permitir_escolha_horario)
      )
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
  }, [dataEvento, template?.user_id, template?.dias_semana_bloqueados, template?.permitir_escolha_horario, activeDuration]);

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

  const renderAlternativeExitModal = () => {
    if (!showAlternativeModal || !alternativeTemplate || !template?.template_alternativo_ativo) return null;

    const altUrl = getAlternativeQuoteUrl();
    const titulo = template.template_alternativo_titulo || '✨ Prefere montar um pacote personalizado?';
    const subtitulo = template.template_alternativo_subtitulo || 'Você pode escolher exatamente os itens e serviços que deseja para seu evento no seu próprio ritmo.';
    const botaoTexto = template.template_alternativo_botao_texto || 'Montar Pacote Sob Medida';

    const handleDismiss = () => {
      setShowAlternativeModal(false);
      if (template?.id) {
        sessionStorage.setItem(`dismissed_alt_modal_${template.id}`, 'true');
      }
    };

    return (
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '16px'
        }}
      >
        <div 
          style={{
            position: 'relative',
            maxWidth: '520px',
            width: '100%',
            backgroundColor: '#07101f',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 40px rgba(99, 102, 241, 0.2)',
            padding: '32px 24px',
            textAlign: 'center',
            overflow: 'hidden'
          }}
        >
          {/* Close button */}
          <button
            onClick={handleDismiss}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer'
            }}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Badge Icon */}
          <div 
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              margin: '0 auto 20px',
              boxShadow: '0 10px 25px rgba(99, 102, 241, 0.4)'
            }}
          >
            <ShoppingCart className="w-8 h-8" />
          </div>

          <h3 
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: '#ffffff',
              marginBottom: '10px',
              lineHeight: 1.3
            }}
          >
            {titulo}
          </h3>

          <p 
            style={{
              fontSize: '14px',
              color: 'rgba(255, 255, 255, 0.75)',
              lineHeight: 1.6,
              marginBottom: '24px',
              maxWidth: '420px',
              marginLeft: 'auto',
              marginRight: 'auto'
            }}
          >
            {subtitulo}
          </p>

          <div 
            style={{
              display: 'flex',
              gap: '12px',
              flexDirection: 'row',
              flexWrap: 'wrap'
            }}
          >
            <button
              type="button"
              onClick={handleDismiss}
              style={{
                flex: '1 1 120px',
                padding: '14px 20px',
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'rgba(255, 255, 255, 0.85)',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Continuar Neste
            </button>
            <a
              href={altUrl}
              style={{
                flex: '2 1 180px',
                padding: '14px 24px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: 'none',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                textDecoration: 'none',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
                cursor: 'pointer'
              }}
            >
              <span>{botaoTexto}</span>
              <Send className="w-4 h-4" />
            </a>
          </div>

          <p 
            style={{
              fontSize: '11px',
              color: 'rgba(255, 255, 255, 0.45)',
              marginTop: '16px'
            }}
          >
            ✓ Seus dados já preenchidos serão transferidos automaticamente.
          </p>
        </div>
      </div>
    );
  };

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
        {renderAlternativeExitModal()}
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

      // Salva dados pessoais do cliente em chave universal para preenchimento automático em qualquer link
      if (formData.nome_cliente || formData.email_cliente || formData.telefone_cliente) {
        localStorage.setItem(
          'priceus_saved_client_profile',
          JSON.stringify({
            nome_cliente: formData.nome_cliente,
            email_cliente: formData.email_cliente,
            telefone_cliente: formData.telefone_cliente,
            cidadeSelecionada: cidadeSelecionada || '',
          })
        );
      }
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

      // Buscar produtos de brindes (tanto os selecionados no template quanto os vinculados diretamente nos produtos)
      let brindesData: any[] = [];
      const brindesVinculadosIds = (produtosData || [])
        .flatMap((p: any) => p.brindes_vinculados || [])
        .filter((id: string) => id);
      
      const allBrindesIdsToFetch = Array.from(
        new Set([
          ...(templateData.brindes_produtos_ids || []),
          ...brindesVinculadosIds
        ])
      );

      if (allBrindesIdsToFetch.length > 0) {
        try {
          const { data: fetchedBrindes } = await supabase
            .from('produtos')
            .select('*')
            .in('id', allBrindesIdsToFetch)
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

      // Processar nomes dos produtos com a assinatura de parceria e mesclar grupo_desconto / faixas_preco / escaloes_quantidade
      const customThemeConfig = {
        ...(templateData.tema_personalizado || {}),
        ...(templateData.collab_valores_manuais || {}),
      };
      const prodExtrasMap: Record<string, any> = customThemeConfig.produtos_extras || {};

      const processedProdutos = (produtosData || []).map((p: any) => {
        const bq = p.brindes_quantidades || {};
        let finalP = {
          ...p,
          grupo_desconto: p.grupo_desconto ?? bq._grupo_desconto ?? prodExtrasMap[p.id]?.grupo_desconto ?? null,
          faixas_preco: p.faixas_preco ?? bq._faixas_preco ?? prodExtrasMap[p.id]?.faixas_preco ?? [],
          escaloes_quantidade: p.escaloes_quantidade ?? bq._escaloes_quantidade ?? prodExtrasMap[p.id]?.escaloes_quantidade ?? [],
          regras_preco_data: p.regras_preco_data ?? bq._regras_preco_data ?? prodExtrasMap[p.id]?.regras_preco_data ?? [],
        };
        if (templateData.collab_ativo && templateData.exibir_nome_parceiro && p.provedor_id && p.provedor_id !== templateData.user_id) {
          const partner = profileMap[p.provedor_id];
          const name = partner ? (partner.nome_profissional || partner.nome_admin || partner.nome) : '';
          if (name) {
            finalP = { ...finalP, nome: `${finalP.nome} (🤝 Parceria: ${name})` };
          }
        }
        return finalP;
      });

      const processedUpsell = upsellData.map((p: any) => {
        const bq = p.brindes_quantidades || {};
        let finalUp = {
          ...p,
          grupo_desconto: p.grupo_desconto ?? bq._grupo_desconto ?? prodExtrasMap[p.id]?.grupo_desconto ?? null,
          faixas_preco: p.faixas_preco ?? bq._faixas_preco ?? prodExtrasMap[p.id]?.faixas_preco ?? [],
          escaloes_quantidade: p.escaloes_quantidade ?? bq._escaloes_quantidade ?? prodExtrasMap[p.id]?.escaloes_quantidade ?? [],
          regras_preco_data: p.regras_preco_data ?? bq._regras_preco_data ?? prodExtrasMap[p.id]?.regras_preco_data ?? [],
        };
        if (templateData.collab_ativo && templateData.exibir_nome_parceiro && p.provedor_id && p.provedor_id !== templateData.user_id) {
          const partner = profileMap[p.provedor_id];
          const name = partner ? (partner.nome_profissional || partner.nome_admin || partner.nome) : '';
          if (name) {
            return { ...finalUp, nome: `${finalUp.nome} (🤝 Parceria: ${name})` };
          }
        }
        return finalUp;
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

      // 🔄 Buscar template alternativo vinculado se ativo e mesclar desconto progressivo / horários
      const isAltAtivo = templateData.template_alternativo_ativo ?? customThemeConfig.template_alternativo_ativo ?? false;
      const altId = templateData.template_alternativo_id ?? customThemeConfig.template_alternativo_id ?? null;
      
      templateData.template_alternativo_ativo = isAltAtivo;
      templateData.template_alternativo_id = altId;
      templateData.template_alternativo_titulo = templateData.template_alternativo_titulo ?? customThemeConfig.template_alternativo_titulo ?? '';
      templateData.template_alternativo_subtitulo = templateData.template_alternativo_subtitulo ?? customThemeConfig.template_alternativo_subtitulo ?? '';
      templateData.template_alternativo_botao_texto = templateData.template_alternativo_botao_texto ?? customThemeConfig.template_alternativo_botao_texto ?? '';
      templateData.regras_desconto_progressivo = templateData.regras_desconto_progressivo ?? customThemeConfig.regras_desconto_progressivo ?? null;
      templateData.permitir_escolha_horario = templateData.permitir_escolha_horario ?? customThemeConfig.permitir_escolha_horario ?? false;

      let altTemplateData: any = null;
      if (isAltAtivo && altId) {
        try {
          const { data: altRes } = await supabase
            .from('templates')
            .select('id, nome_template, slug_template')
            .eq('id', altId)
            .maybeSingle();
          altTemplateData = altRes;
        } catch (altErr) {
          console.warn('[QuotePage] Erro ao carregar template alternativo:', altErr);
        }
      }
      setAlternativeTemplate(altTemplateData);

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

      // Carregar feriados cadastrados na Agenda do profissional para sincronizar com regras de preço por data/feriado
      try {
        const { data: feriadosAgendaData } = await supabase
          .from('feriados')
          .select('nome, data')
          .eq('user_id', templateData.user_id);
        if (Array.isArray(feriadosAgendaData)) {
          setAgendaFeriados(
            feriadosAgendaData
              .filter((f: any) => f?.data)
              .map((f: any) => `${f.data}|${f.nome || 'Feriado Agenda'}`)
          );
        }
      } catch (ferErr) {
        console.warn('[QuotePage] Aviso ao carregar feriados da agenda:', ferErr);
      }

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
      const activeStorageKey = templateData?.id ? `priceus-quote-${templateData.id}` : storageKey;
      if (activeStorageKey) {
        try {
          const savedQuote = secureLocalStorage.getItem(activeStorageKey);
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

      // Preenchimento automático complementar pelo perfil salvo do cliente no navegador
      try {
        const savedProfile = localStorage.getItem('priceus_saved_client_profile');
        if (savedProfile) {
          const parsed = JSON.parse(savedProfile);
          setFormData((prev) => ({
            nome_cliente: prev.nome_cliente || parsed.nome_cliente || '',
            email_cliente: prev.email_cliente || parsed.email_cliente || '',
            telefone_cliente: prev.telefone_cliente || parsed.telefone_cliente || '',
          }));
          if (parsed.cidadeSelecionada && !cidadeSelecionada) {
            setCidadeSelecionada(parsed.cidadeSelecionada);
          }
        }
      } catch (e) {}

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
    const produto = produtos.find((p) => p.id === produtoId);
    if (quantity <= 0) {
      if (produto?.obrigatorio) {
        alert('⚠️ Este produto é obrigatório');
        return;
      }
      const newSelected = { ...selectedProdutos };
      delete newSelected[produtoId];
      setSelectedProdutos(newSelected);
    } else {
      if (produto?.quantidade_maxima && quantity > produto.quantidade_maxima) {
        quantity = produto.quantidade_maxima;
      }
      setSelectedProdutos({ ...selectedProdutos, [produtoId]: quantity });
    }
  };

  const progressiveSummary = useMemo(() => {
    return calculateProgressiveDiscounts(
      produtos,
      selectedProdutos,
      selectedTiers,
      template?.regras_desconto_progressivo,
      dataEvento,
      allCustomHolidays
    );
  }, [produtos, selectedProdutos, selectedTiers, template?.regras_desconto_progressivo, dataEvento, allCustomHolidays]);

  /**
   * Calcula subtotal dos produtos selecionados (já aplicando os escalões progressivos do botão "+" e regras de data)
   */
  const calculateSubtotal = () => {
    const subtotalProdutos = produtos.reduce((total, produto) => {
      const qty = selectedProdutos[produto.id] || 0;
      if (qty <= 0) return total;
      const { totalPrice } = resolveProductQuantityPricing(
        produto,
        qty,
        selectedTiers[produto.id],
        dataEvento,
        template?.regras_desconto_progressivo,
        allCustomHolidays
      );
      return total + totalPrice;
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

    // Desconto progressivo por grupo e ajuste por dia da semana
    let totalComAjustes = Math.max(
      0,
      subtotal - progressiveSummary.groupDiscountTotal + progressiveSummary.dayOfWeekAdjustment
    );
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

    // Aplicar desconto do cupom (% ou R$ fixo)
    if (cupomAtivo && (cupomDesconto > 0 || cupomValorFixo > 0)) {
      const descontoCupom =
        cupomTipoDesconto === 'valor_fixo'
          ? Math.min(totalComAjustes, cupomValorFixo)
          : (totalComAjustes * cupomDesconto) / 100;
      totalComAjustes -= descontoCupom;
    }

    return Math.max(0, totalComAjustes);
  };

  /**
   * Retorna breakdown detalhado do cálculo de preços para exibição
   */
  const getPriceBreakdown = () => {
    const subtotal = calculateSubtotal();
    const descontoProgressivo = progressiveSummary.groupDiscountTotal;
    const economiaQuantidadeProdutos = progressiveSummary.productQuantitySavingsTotal;
    const ajusteDiaSemana = progressiveSummary.dayOfWeekAdjustment;
    const subtotalAposProgressivo = Math.max(0, subtotal - descontoProgressivo + ajusteDiaSemana);

    const ajusteSazonal = template?.sistema_sazonal_ativo ? calculateSeasonalAdjustment(subtotalAposProgressivo) : 0;
    const geoAdjustment = template?.sistema_geografico_ativo ? calculateGeographicAdjustment(subtotalAposProgressivo + ajusteSazonal) : { percentual: 0, taxa: 0 };

    const formaPagamento = formasPagamento.find((f) => f.id === selectedFormaPagamento);
    const totalAntesFormaPagamento = subtotalAposProgressivo + ajusteSazonal + geoAdjustment.percentual + geoAdjustment.taxa;
    const acrescimoFormaPagamento = formaPagamento ? (totalAntesFormaPagamento * formaPagamento.acrescimo) / 100 : 0;

    const totalAntesCupom = totalAntesFormaPagamento + acrescimoFormaPagamento;
    const descontoCupom =
      cupomAtivo && (cupomDesconto > 0 || cupomValorFixo > 0)
        ? cupomTipoDesconto === 'valor_fixo'
          ? Math.min(totalAntesCupom, cupomValorFixo)
          : (totalAntesCupom * cupomDesconto) / 100
        : 0;

    const total = calculateTotal();
    const valorUpsell = upsellSubtotal;
    const valorBase = total - valorUpsell;

    const ocultarDeslocamento = template?.ocultar_taxa_deslocamento || false;
    return {
      subtotal,
      descontoProgressivo,
      economiaQuantidadeProdutos,
      ajusteDiaSemana,
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
    selectedTiers,
    progressiveSummary,
    selectedUpsellIds,
    selectedFormaPagamento,
    dataEvento,
    cidadeSelecionada,
    selectedEstado,
    selectedPais,
    cupomCodigo,
    cupomAtivo,
    cupomDesconto,
    cupomTipoDesconto,
    cupomValorFixo,
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
      // Identificar brindes vinculados aos produtos selecionados
      const activeBrindesList: any[] = [];
      const seenBrindeIds = new Set<string>();
      produtos
        .filter((p) => selectedProdutos[p.id] && selectedProdutos[p.id] > 0)
        .forEach((p) => {
          if (p.brindes_vinculados && Array.isArray(p.brindes_vinculados)) {
            p.brindes_vinculados.forEach((brindeId: string) => {
              if (!seenBrindeIds.has(brindeId)) {
                seenBrindeIds.add(brindeId);
                const brindeObj = brindesProdutos.find((b) => b.id === brindeId);
                if (brindeObj) {
                  activeBrindesList.push({
                    id: brindeObj.id,
                    produto_id: brindeObj.id,
                    nome: brindeObj.nome,
                    valor: brindeObj.valor,
                    imagem_url: brindeObj.imagem_url || '',
                    quantidade: 1,
                    provedor_id: brindeObj.provedor_id || null,
                  });
                }
              }
            });
          }
        });

      updateLead({
        templateId: template.id,
        userId: template.user_id,
        formData: {
          ...formData,
          ...camposExtrasData,
          data_evento: dataEvento || null,
          horario_evento: horarioSelecionado || null,
          cidade_evento: cidadeSelecionada || null,
          tipo_evento: template.nome_template || null,
        },
        orcamentoDetalhe: {
          selectedProdutos,
          selectedTiers,
          horario_evento: horarioSelecionado || null,
          selectedFormaPagamento,
          forma_pagamento_id: selectedFormaPagamento || null,
          produtos: produtos.map((p) => {
            const qty = selectedProdutos[p.id] || 1;
            const resolved = resolveProductEffectivePrice(
              p,
              selectedTiers[p.id],
              dataEvento,
              template?.regras_desconto_progressivo,
              allCustomHolidays,
              qty
            );
            return {
              ...p,
              nome: resolved.activeTier
                ? `${p.nome} (${resolved.activeTier.label})`
                : resolved.activeDateRule
                ? `${p.nome} (${resolved.activeDateRule.nome})`
                : p.nome,
              valor: resolved.unitPrice,
              faixa_selecionada: resolved.activeTier || null,
              regra_data_aplicada: resolved.activeDateRule?.nome || null,
            };
          }),
          paymentMethod: formasPagamentoProcessadas.find((f) => f.id === selectedFormaPagamento),
          formasPagamento: formasPagamentoProcessadas,
          priceBreakdown: priceBreakdown,
          upsell_produtos: filteredUpsellProdutos
            .filter((p) => selectedUpsellIds.has(p.id))
            .map((p) => ({
              id: p.id,
              produto_id: p.id,
              nome: p.nome,
              valor: p.valor,
              desconto_percentual: p.desconto_percentual ?? 0,
              quantidade: 1,
              imagem_url: p.imagem_url || '',
              provedor_id: p.provedor_id || null,
            })),
          brindes_produtos: activeBrindesList,
          customFields: camposExtras || [],
          customFieldsData: camposExtrasData || {},
          sistema_sazonal_ativo: template?.sistema_sazonal_ativo,
          sistema_geografico_ativo: template?.sistema_geografico_ativo,
          ocultar_valores_intermediarios: template?.ocultar_valores_intermediarios,
          cupomCodigo: cupomAtivo ? cupomCodigo : null,
          cupomAtivo,
          cupomDesconto: cupomAtivo ? cupomDesconto : 0,
          cupomTipoDesconto: cupomAtivo ? cupomTipoDesconto : 'percentual',
          cupomValorFixo: cupomAtivo ? cupomValorFixo : 0,
          valor_base: priceBreakdown?.subtotal || 0,
          valor_upsell: priceBreakdown?.valorUpsell || 0,
        },
        valorTotal: calculateTotal(),
      });
    }
  }, [template, produtos, selectedProdutos, selectedTiers, horarioSelecionado, selectedFormaPagamento, selectedUpsellIds, brindesProdutos, filteredUpsellProdutos, formData, camposExtrasData, dataEvento, cidadeSelecionada, formasPagamentoProcessadas, priceBreakdown, cupomAtivo, cupomCodigo, cupomDesconto, cupomTipoDesconto, cupomValorFixo]);



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
      const tipo = data.tipo_desconto === 'valor_fixo' ? 'valor_fixo' : 'percentual';
      setCupomTipoDesconto(tipo);
      if (tipo === 'valor_fixo') {
        const vFixo = Number(data.valor_fixo) || 0;
        setCupomValorFixo(vFixo);
        setCupomDesconto(0);
        setCupomMensagem(`✅ Cupom aplicado: R$ ${vFixo.toFixed(2).replace('.', ',')} de desconto!`);
      } else {
        setCupomDesconto(Number(data.porcentagem) || 0);
        setCupomValorFixo(0);
        setCupomMensagem(`✅ Cupom aplicado: ${data.porcentagem}% de desconto!`);
      }
    } catch (error) {
      console.error('Erro ao validar cupom:', error);
      setCupomMensagem('❌ Erro ao validar cupom');
      setCupomAtivo(false);
      setCupomDesconto(0);
      setCupomValorFixo(0);
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

      // Produtos (com faixa selecionada, regra de data e desconto progressivo no botão "+" resolvidos)
      products: produtos.map((p) => {
        const qty = selectedProdutos[p.id] || 1;
        const resolved = resolveProductEffectivePrice(
          p,
          selectedTiers[p.id],
          dataEvento,
          template?.regras_desconto_progressivo,
          allCustomHolidays,
          qty
        );
        return {
          ...p,
          nome: resolved.activeTier
            ? `${p.nome} (${resolved.activeTier.label})`
            : resolved.activeDateRule
            ? `${p.nome} (${resolved.activeDateRule.nome})`
            : p.nome,
          valor: resolved.originalUnitPrice,
          _progressiveTotal: resolved.totalPrice,
          _progressiveSavings: resolved.progressiveQuantitySavings,
        };
      }),
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
    const hasTieredProducts = produtos.some((p) => Array.isArray(p.faixas_preco) && p.faixas_preco.length > 0);
    const hasDateRulesProducts = produtos.some((p) => Array.isArray(p.regras_preco_data) && p.regras_preco_data.length > 0);
    const hasProgressiveOrTime = Boolean(
      template?.permitir_escolha_horario ||
      template?.regras_desconto_progressivo?.ativo ||
      hasTieredProducts ||
      hasDateRulesProducts
    );
    const isAgendaRequired = (agendaConfig?.agenda_ativa || hasProgressiveOrTime) && !template?.ignorar_agenda_global;
    
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
              description="Preços podem variar por temporada ou dia da semana"
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
                  checkAvailability(
                    template.user_id,
                    dataEvento,
                    activeDuration,
                    0,
                    Boolean(template?.permitir_escolha_horario)
                  )
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

  // Recupera sessão prévia do chat de negociação se houver ou abre via URL (?chat=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const chatParam = params.get('chat');
    if (chatParam) {
      setChatConversationId(chatParam);
      setIsChatDrawerOpen(true);
      return;
    }
    if (template?.id) {
      const stored = RealtimeChatService.getStoredSession(template.id);
      if (stored?.conversationId) {
        setChatConversationId(stored.conversationId);
      }
    }
  }, [template?.id]);

  // Sincroniza presença online do fornecedor em tempo real
  useEffect(() => {
    const vId = template?.user_id || profile?.id;
    if (!vId) return;
    setVendorPresence(RealtimeChatService.getVendorOnlinePresence(vId));
    const unsubscribe = RealtimeChatService.subscribeToVendorPresence(vId, (newPresence) => {
      setVendorPresence(newPresence);
    });
    return () => unsubscribe();
  }, [template?.user_id, profile?.id]);

  const handleStartOnlineChat = async (e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.preventDefault();
    if (isStartingChat) return;

    // Validação de formato de email e telefone
    const emailError = validateEmail(formData.email_cliente);
    const phoneError = validatePhone(formData.telefone_cliente);

    if (emailError || phoneError) {
      setFieldErrors({ email: emailError, telefone: phoneError });
      alert('⚠️ Opa! Por favor, preencha nome, email e WhatsApp corretamente para iniciarmos a conversa em tempo real.');
      const errorId = emailError ? 'email-cliente' : 'telefone-cliente';
      document.getElementById(errorId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!fieldsValidation.canUseWhatsApp) {
      alert(fieldsValidation.validationMessage);
      return;
    }

    const currentTemplate = templateRef.current || template;
    if (!currentTemplate?.user_id) {
      alert('Não foi possível identificar o profissional deste orçamento.');
      return;
    }

    setIsStartingChat(true);

    try {
      // Salva dados pessoais do cliente no navegador imediatamente para persistência
      try {
        if (formData.nome_cliente || formData.email_cliente || formData.telefone_cliente) {
          localStorage.setItem(
            'priceus_saved_client_profile',
            JSON.stringify({
              nome_cliente: formData.nome_cliente,
              email_cliente: formData.email_cliente,
              telefone_cliente: formData.telefone_cliente,
              cidadeSelecionada: cidadeSelecionada || '',
              dataEvento: dataEvento || '',
            })
          );
        }
      } catch (e) {}

      const selectedProductsList = produtos.filter((p) => selectedProdutos[p.id] > 0);
      const pkgName =
        selectedProductsList.length > 0
          ? selectedProductsList[0].nome + (selectedProductsList.length > 1 ? ` (+${selectedProductsList.length - 1} itens)` : '')
          : currentTemplate.nome_template || 'Proposta Personalizada';

      const paymentTerms =
        formasPagamento.find((f) => f.id === selectedFormaPagamento)?.nome ||
        'À vista ou parcelado';

      const session = await RealtimeChatService.initQuoteConversation({
        vendorId: currentTemplate.user_id,
        vendorName: profile?.nome_profissional || profile?.nome_empresa || 'Profissional',
        clientName: formData.nome_cliente.trim(),
        clientEmail: formData.email_cliente.trim(),
        clientPhone: formData.telefone_cliente.trim(),
        eventDate: dataEvento,
        eventCity: cidades.find((c) => c.id === cidadeSelecionada)?.nome || cidadeSelecionada || undefined,
        templateId: currentTemplate.id,
        templateName: currentTemplate.nome_template,
        selectedPackageName: pkgName,
        totalValue: calculateTotal(),
        paymentTerms,
      });

      setChatConversationId(session.conversationId);
      setIsChatDrawerOpen(true);
      setShowSummaryModal(false);
      analytics?.trackStage('negociar_chat_online');

      // Injeta ativamente o resumo estruturado da proposta (o mesmo do WhatsApp) dentro do chat
      try {
        const existingMsgs = await RealtimeChatService.fetchMessages(session.conversationId);
        if (!existingMsgs || existingMsgs.length === 0) {
          const structuredMessage = buildWhatsAppMessage();
          await RealtimeChatService.sendMessage({
            conversationId: session.conversationId,
            senderType: 'bride',
            senderName: formData.nome_cliente.trim() || 'Cliente',
            content: structuredMessage,
          });
        }
      } catch (e) {
        console.warn('Falha ao injetar mensagem inicial estruturada:', e);
      }
    } catch (err: any) {
      console.error('Erro ao iniciar chat online:', err);
      alert('Não foi possível iniciar o chat online no momento. Você pode prosseguir via WhatsApp!');
    } finally {
      setIsStartingChat(false);
    }
  };

  const handleOpenChatFromDock = () => {
    if (chatConversationId) {
      setIsChatDrawerOpen(true);
      return;
    }
    // Se o cliente já preencheu nome e telefone válidos, inicia o chat online instantaneamente
    if (formData.nome_cliente.trim().length >= 2 && formData.telefone_cliente.trim().length >= 8) {
      handleStartOnlineChat();
    } else {
      // Se ainda faltam dados, foca no formulário com aviso amigável
      const nameInput = document.getElementById('nome-cliente') || document.querySelector('input[name="nome_cliente"]');
      if (nameInput) {
        nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (nameInput as HTMLInputElement).focus();
      } else {
        const formEl = document.querySelector('form');
        formEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setToastChatNotice('👋 Informe seu nome e WhatsApp para iniciarmos sua negociação em tempo real!');
      setTimeout(() => setToastChatNotice(null), 4500);
    }
  };

  const renderChatEcosystem = () => (
    <>
      {/* Toast informativo flutuante ao acionar chat sem dados completos */}
      {toastChatNotice && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-950/95 text-white border border-emerald-500/50 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-bounce duration-1000 text-xs sm:text-sm font-semibold max-w-md text-center">
          <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastChatNotice}</span>
        </div>
      )}

      {/* Drawer de Negociação Online PriceU$ */}
      <QuoteChatDrawer
        isOpen={isChatDrawerOpen}
        onClose={() => setIsChatDrawerOpen(false)}
        conversationId={chatConversationId}
        clientName={formData.nome_cliente || 'Cliente'}
        vendorName={profile?.nome_profissional || profile?.nome_empresa || 'Profissional PriceU$'}
        vendorPhone={profile?.whatsapp_principal}
        vendorAvatar={profile?.logo_url || profile?.foto_perfil}
        packageName={
          produtos.filter((p) => selectedProdutos[p.id] > 0)[0]?.nome ||
          template?.nome_template ||
          'Proposta Personalizada'
        }
        totalValue={calculateTotal()}
        paymentTerms={
          formasPagamento.find((f) => f.id === selectedFormaPagamento)?.nome ||
          'À vista ou parcelado'
        }
        eventDate={dataEvento}
        quoteUrl={window.location.href}
      />
    </>
  );

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
            .map((p) => {
              const qty = selectedProdutos[p.id] || 1;
              const resolved = resolveProductEffectivePrice(
                p,
                selectedTiers[p.id],
                dataEvento,
                template?.regras_desconto_progressivo,
                allCustomHolidays,
                qty
              );
              return {
                name: resolved.activeTier
                  ? `${p.nome} (${resolved.activeTier.label})`
                  : resolved.activeDateRule
                  ? `${p.nome} (${resolved.activeDateRule.nome})`
                  : p.nome,
                quantity: qty,
                price: resolved.unitPrice,
                permite_multiplas_unidades: p.permite_multiplas_unidades,
              };
            }),
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

      // 3. DISPARAR O SALVAMENTO DO LEAD IMEDIATAMENTE (SEM DELAY)
      // Salva dados pessoais do cliente no navegador imediatamente para garantir persistência mesmo se sair
      try {
        if (formData.nome_cliente || formData.email_cliente || formData.telefone_cliente) {
          localStorage.setItem(
            'priceus_saved_client_profile',
            JSON.stringify({
              nome_cliente: formData.nome_cliente,
              email_cliente: formData.email_cliente,
              telefone_cliente: formData.telefone_cliente,
              cidadeSelecionada: cidadeSelecionada || '',
              dataEvento: dataEvento || '',
            })
          );
        }
      } catch (e) {}

      // Execução assíncrona imediata para capturar o lead no primeiro instante (IIFE)
      (async () => {
        try {
          console.log('🚀 [handleSubmit] Iniciando salvamento imediato do lead...');
          const currentTemplate = templateRef.current || template;
          if (!currentTemplate?.id || !currentTemplate?.user_id) {
            console.error('❌ [handleSubmit] Template ID ou User ID ausente ao salvar lead:', currentTemplate);
            return;
          }

          // Identificar brindes vinculados aos produtos selecionados
          const activeBrindesList: any[] = [];
          const seenBrindeIds = new Set<string>();
          produtos
            .filter((p) => selectedProdutos[p.id] && selectedProdutos[p.id] > 0)
            .forEach((p) => {
              if (p.brindes_vinculados && Array.isArray(p.brindes_vinculados)) {
                p.brindes_vinculados.forEach((brindeId: string) => {
                  if (!seenBrindeIds.has(brindeId)) {
                    seenBrindeIds.add(brindeId);
                    const brindeObj = brindesProdutos.find((b) => b.id === brindeId);
                    if (brindeObj) {
                      activeBrindesList.push({
                        id: brindeObj.id,
                        produto_id: brindeObj.id,
                        nome: brindeObj.nome,
                        valor: brindeObj.valor,
                        imagem_url: brindeObj.imagem_url || '',
                        quantidade: 1,
                        provedor_id: brindeObj.provedor_id || null,
                      });
                    }
                  }
                });
              }
            });

          // 🔥 PAYLOAD COMPLETO E RICO
          const payload = {
            templateId: currentTemplate.id,
            userId: currentTemplate.user_id,
            formData: { 
              ...formData, 
              ...camposExtrasData, 
              data_evento: dataEvento || null, 
              cidade_evento: cidadeSelecionada || null, 
              tipo_evento: currentTemplate.nome_template || null,
              horario_inicio: horarioSelecionado || null,
              duracao_minutos: activeDuration || null,
            },
            orcamentoDetalhe: {
              selectedProdutos,
              selectedFormaPagamento,
              forma_pagamento_id: selectedFormaPagamento || null,
              produtos: produtos,
              paymentMethod: formasPagamentoProcessadas.find((f) => f.id === selectedFormaPagamento),
              formasPagamento: formasPagamentoProcessadas,
              priceBreakdown: priceBreakdown,
              upsell_produtos: filteredUpsellProdutos
                .filter((p) => selectedUpsellIds.has(p.id))
                .map((p) => ({
                  id: p.id,
                  produto_id: p.id,
                  nome: p.nome,
                  valor: p.valor,
                  desconto_percentual: p.desconto_percentual ?? 0,
                  quantidade: 1,
                  imagem_url: p.imagem_url || '',
                  provedor_id: p.provedor_id || null,
                })),
              brindes_produtos: activeBrindesList,
              customFields: camposExtras || [],
              customFieldsData: camposExtrasData || {},
              sistema_sazonal_ativo: currentTemplate?.sistema_sazonal_ativo,
              sistema_geografico_ativo: currentTemplate?.sistema_geografico_ativo,
              ocultar_valores_intermediarios: currentTemplate?.ocultar_valores_intermediarios,
              cupomCodigo: cupomAtivo ? cupomCodigo : null,
              cupomAtivo,
              cupomDesconto: cupomAtivo ? cupomDesconto : 0,
              valor_base: priceBreakdown?.subtotal || 0,
              valor_upsell: priceBreakdown?.valorUpsell || 0,
            },
            valorTotal: calculateTotal(),
          };

          const { lead: leadData, error } = await saveFinalLead(payload);

          if (error || !leadData) {
            console.error('❌ [handleSubmit] Falha ao salvar o lead. Erro retornado:', error);
            return;
          }

          console.log('✅ [handleSubmit] Lead salvo com sucesso:', leadData);

          const leadId = leadData.id;
          if (leadId) {
            console.log('✅ [QuotePage] Lead salvo com id. Notificação criada com sucesso:', leadId);
          }
        } catch (err) {
          console.error('❌ [handleSubmit] Erro capturado no salvamento imediato do lead:', err);
        }
      })();


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
            {/* Aviso Informativo: Novas Regras da Meta/WhatsApp contra Bloqueio e Spam */}
            <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 text-amber-950 text-xs leading-relaxed space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Por que oferecemos a Negociação no Chat Oficial PriceU$?</span>
              </div>
              <p className="text-[11.5px] text-stone-600 leading-normal">
                Devido às novas regras da Meta/WhatsApp contra disparos comerciais e risco de bloqueio de contas por mensagens repetitivas de vendas, disponibilizamos este canal oficial seguro. Nele sua data fica pré-reservada na hora, o atendimento é prioritário e você pode simular descontos ao vivo. O WhatsApp tradicional continua 100% ativo e disponível com 1 clique abaixo caso você prefira!
              </p>
            </div>

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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Opção 1: Chat Oficial PriceU$ */}
                <button
                  type="button"
                  onClick={handleStartOnlineChat}
                  disabled={isStartingChat}
                  className="w-full p-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition-all shadow-md shadow-emerald-950/20 text-left flex flex-col justify-between space-y-1 cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold bg-emerald-950/60 px-2 py-0.5 rounded-full text-emerald-200 border border-emerald-400/30">
                      Recomendado • Sem Bloqueios
                    </span>
                    <Sparkles className="w-4 h-4 text-emerald-200 group-hover:rotate-12 transition-transform" />
                  </div>
                  <div className="font-black text-sm pt-1">
                    {isStartingChat ? 'Iniciando Conversa...' : 'Negociar no Chat Oficial PriceU$'}
                  </div>
                  <p className="text-[10px] text-emerald-100/90 font-normal">
                    Resposta prioritária, pré-reserva de data e desconto em 1 clique.
                  </p>
                </button>

                {/* Opção 2: WhatsApp Tradicional (Preservado como Ponto-Chave de Vendas) */}
                <a
                  href={summaryData.waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full p-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold transition-all shadow-md shadow-green-950/20 text-left flex flex-col justify-between space-y-1 cursor-pointer group"
                  onClick={() => {
                    analytics?.markAsConverted();
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold bg-green-900/60 px-2 py-0.5 rounded-full text-green-200 border border-green-400/30">
                      WhatsApp Tradicional
                    </span>
                    <Send className="w-4 h-4 text-green-100 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <div className="font-black text-sm pt-1">
                    Enviar via WhatsApp Oficial
                  </div>
                  <p className="text-[10px] text-green-100/90 font-normal">
                    Transfere este orçamento pronto para seu aplicativo do WhatsApp.
                  </p>
                </a>
              </div>

              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowSummaryModal(false);
                    setHasSubmitted(false);
                  }}
                  className="text-xs text-gray-500 hover:text-gray-800 font-medium transition-colors cursor-pointer py-1"
                >
                  ← Voltar e ajustar itens do orçamento
                </button>
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
      handleStartOnlineChat,
      isStartingChat,
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
      leadCreatedAt,
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
        {renderChatEcosystem()}
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
      handleStartOnlineChat,
      isStartingChat,
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
      leadCreatedAt,
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
        {renderChatEcosystem()}
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
      leadCreatedAt,
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
        {renderChatEcosystem()}
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
      leadCreatedAt,
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
        {renderChatEcosystem()}
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
      leadCreatedAt,
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
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: 16 }}
          >
            <div style={{ background: '#ffffff', border: '1px solid #e7e5e4', borderRadius: 24, boxShadow: '0 24px 64px rgba(0,0,0,.15)', maxWidth: 672, width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: 24, borderBottom: '1px solid #f5f5f4', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px' }}>Quase lá!</h2>
                  <p style={{ color: '#64748b', marginTop: 4, fontSize: 15 }}>
                    Confira o resumo e envie seu pedido para{' '}
                    <strong style={{ color: '#059669' }}>{summaryData.profileName}</strong>.
                  </p>
                </div>
                <button
                  onClick={() => { setShowSummaryModal(false); setHasSubmitted(false); }}
                  style={{ background: '#f5f5f4', border: 'none', color: '#64748b', padding: 8, borderRadius: '50%', cursor: 'pointer', transition: 'background .2s' }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: '#fafaf9', borderRadius: 16, padding: 16, border: '1px solid #f5f5f4' }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Seus Dados:</h3>
                  <p style={{ fontSize: 14, color: '#475569', marginBottom: 4 }}><strong style={{ color: '#0f172a' }}>Nome:</strong> {summaryData.clientData.nome}</p>
                  <p style={{ fontSize: 14, color: '#475569', marginBottom: 4 }}><strong style={{ color: '#0f172a' }}>Email:</strong> {summaryData.clientData.email}</p>
                  <p style={{ fontSize: 14, color: '#475569' }}><strong style={{ color: '#0f172a' }}>Telefone:</strong> {summaryData.clientData.telefone}</p>
                </div>

                <div style={{ background: '#fafaf9', borderRadius: 16, padding: 16, border: '1px solid #f5f5f4' }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Detalhes do Evento:</h3>
                  <p style={{ fontSize: 14, color: '#475569', marginBottom: 4 }}><strong style={{ color: '#0f172a' }}>Orçamento:</strong> {summaryData.eventData.tipo}</p>
                  <p style={{ fontSize: 14, color: '#475569', marginBottom: 4 }}><strong style={{ color: '#0f172a' }}>Data:</strong> {summaryData.eventData.data}</p>
                  <p style={{ fontSize: 14, color: '#475569' }}><strong style={{ color: '#0f172a' }}>Cidade:</strong> {summaryData.eventData.cidade}</p>
                </div>

                <div style={{ background: '#f0fdf4', borderRadius: 16, padding: 16, border: '1px solid #bbf7d0' }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Itens Selecionados:</h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {summaryData.quoteData.items.map((item: any, index: number) => (
                      <li key={index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#334155' }}>
                        <span>{item.permite_multiplas_unidades === false ? item.name : `${item.quantity}x ${item.name}`}</span>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{formatCurrency(item.price * item.quantity)}</span>
                      </li>
                    ))}
                  </ul>
                  <div style={{ borderTop: '1px solid #86efac', marginTop: 12, paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 900, color: '#059669' }}>
                    <span>{template?.usar_termo_investimento ? 'Investimento Total:' : 'Valor Total:'}</span>
                    <span>{formatCurrency(summaryData.quoteData.total)}</span>
                  </div>
                </div>
              </div>

              <div style={{ padding: 24, borderTop: '1px solid #f5f5f4', background: '#fafaf9', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => { setShowSummaryModal(false); setHasSubmitted(false); }}
                    style={{ flex: '1 1 100px', padding: '14px 20px', background: '#ffffff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'background .2s' }}
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={handleStartOnlineChat}
                    disabled={isStartingChat}
                    style={{ flex: '2 1 180px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 20px', background: 'linear-gradient(135deg,#059669,#10b981)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(16,185,129,.25)' }}
                  >
                    <MessageSquare className="w-5 h-5 flex-shrink-0" />
                    <span>{isStartingChat ? 'Abrindo Chat...' : 'Negociar no Chat PriceU$'}</span>
                  </button>
                  <a
                    href={summaryData.waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => analytics?.markAsConverted()}
                    style={{ flex: '2 1 180px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 20px', background: 'linear-gradient(135deg,#16a34a,#22c55e)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 16px rgba(22,163,74,.25)', cursor: 'pointer' }}
                  >
                    <Send className="w-5 h-5 flex-shrink-0" />
                    Enviar via WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
        {renderChatEcosystem()}
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
      handleStartOnlineChat,
      isStartingChat,
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
      leadCreatedAt,
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
        {renderChatEcosystem()}
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
      handleStartOnlineChat,
      isStartingChat,
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
      leadCreatedAt,
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
        {renderChatEcosystem()}
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
                  autoComplete="name"
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
                  autoComplete="email"
                  inputMode="email"
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
                  autoComplete="tel"
                  inputMode="tel"
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
            {((template?.sistema_sazonal_ativo && temporadas.length > 0) ||
              (template?.sistema_geografico_ativo && paises.length > 0) ||
              ((agendaConfig?.agenda_ativa ||
                template?.permitir_escolha_horario ||
                template?.regras_desconto_progressivo?.ativo ||
                produtos.some((p) => Array.isArray(p.faixas_preco) && p.faixas_preco.length > 0)) &&
                !template?.ignorar_agenda_global)) && (
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

              {/* Banners de Desconto Progressivo e Dicas de Próxima Faixa */}
              {(progressiveSummary.activeGroupBadges.length > 0 || progressiveSummary.nextTierHints.length > 0) && (
                <div className="mb-4 space-y-2">
                  {progressiveSummary.activeGroupBadges.map((b, bIdx) => (
                    <div
                      key={bIdx}
                      className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-semibold flex items-center justify-between gap-2"
                    >
                      <span>🎉 Desconto Progressivo Ativo: {b.descricao}</span>
                      <span className="font-bold whitespace-nowrap">-{formatCurrency(b.descontoAplicado)}</span>
                    </div>
                  ))}
                  {progressiveSummary.nextTierHints.map((h, hIdx) => (
                    <div
                      key={hIdx}
                      className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-700 dark:text-indigo-300 text-xs font-medium flex items-center gap-2"
                    >
                      <span>💡 {h.beneficioTexto}</span>
                    </div>
                  ))}
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
                          {produto.grupo_desconto && (
                            <span className="text-[11px] bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full whitespace-nowrap font-semibold">
                              🏷️ {produto.grupo_desconto}
                            </span>
                          )}
                        </h4>
                        {produto.resumo && (
                          <FormattedDescription text={produto.resumo} className="mt-2" />
                        )}

                        {/* 📸 Seletor de Faixas Progressivas (Ex: 10 fotos, 20 fotos, 30 fotos) */}
                        {Array.isArray(produto.faixas_preco) && produto.faixas_preco.length > 0 && (() => {
                          const activeTierId = selectedTiers[produto.id] || produto.faixas_preco[0].id;
                          const sampleResolved = resolveTierPrice(
                            produto.faixas_preco[0],
                            dataEvento,
                            template?.regras_desconto_progressivo
                          );
                          return (
                            <div className="mt-3 p-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-1">
                                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: inlineStyles.textColor }}>
                                  📸 Escolha a Opção / Quantidade:
                                </span>
                                {dataEvento && (
                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                    sampleResolved.isWeekendOrHoliday
                                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30'
                                      : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
                                  }`}>
                                    📅 {sampleResolved.isWeekendOrHoliday
                                      ? `Tabela ${sampleResolved.periodLabel || 'Fim de Semana / Feriado'}`
                                      : 'Tabela Dias de Semana'}
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {produto.faixas_preco.map((tier) => {
                                  const tierRes = resolveTierPrice(
                                    tier,
                                    dataEvento,
                                    template?.regras_desconto_progressivo
                                  );
                                  const isSelectedTier = activeTierId === tier.id;
                                  return (
                                    <button
                                      key={tier.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedTiers((prev) => ({ ...prev, [produto.id]: tier.id }));
                                        if (!selectedProdutos[produto.id]) {
                                          handleProdutoQuantityChange(produto.id, 1);
                                        }
                                      }}
                                      className={`p-2.5 rounded-xl border text-left transition-all ${
                                        isSelectedTier
                                          ? 'ring-2 ring-indigo-500/40 font-bold'
                                          : 'opacity-80 hover:opacity-100'
                                      }`}
                                      style={
                                        isSelectedTier
                                          ? {
                                              borderColor: inlineStyles.accentColor,
                                              background: `${inlineStyles.accentColor}18`,
                                              color: inlineStyles.textColor,
                                            }
                                          : {
                                              borderColor: `${inlineStyles.textColorSecondary}25`,
                                              color: inlineStyles.textColor,
                                            }
                                      }
                                    >
                                      <div className="text-xs font-bold truncate">{tier.label}</div>
                                      <div className="text-sm font-extrabold mt-0.5" style={{ color: inlineStyles.accentColor }}>
                                        {formatCurrency(tierRes.price)}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Brindes Vinculados em Sub-Cards */}
                        {produto.brindes_vinculados && Array.isArray(produto.brindes_vinculados) && produto.brindes_vinculados.length > 0 && (
                          <div className="mt-3.5 space-y-2 border-t border-dashed border-gray-250 dark:border-white/10 pt-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                                🎁 {produto.brindes_titulo_personalizado || 'Brinde(s) Incluso(s)'}:
                              </span>
                              <BrindesCountdown
                                brindesExpira={produto.brindes_expira}
                                brindesExpiraTipo={produto.brindes_expira_tipo}
                                brindesExpiraDias={produto.brindes_expira_dias}
                                brindesExpiraData={produto.brindes_expira_data}
                                leadCreatedAt={leadCreatedAt}
                              />
                            </div>
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
                          const currentQty = selectedProdutos[produto.id] || 0;
                          const effectiveQtyForCalc = currentQty > 0 ? currentQty : 1;
                          const qtyPricing = resolveProductQuantityPricing(
                            produto,
                            effectiveQtyForCalc,
                            selectedTiers[produto.id],
                            dataEvento,
                            template?.regras_desconto_progressivo,
                            allCustomHolidays
                          );
                          const valorFinalUnitarioBase = qtyPricing.baseUnitPrice;
                          const originalUnitPrice = qtyPricing.originalBaseUnitPrice;
                          const hasQuantitySteps = qtyPricing.resolvedSteps.length > 0;

                          return (
                            <div className="mt-3 space-y-2.5">
                              {/* Badge de Regra de Data Personalizada do Produto */}
                              {dataEvento && qtyPricing.activeDateRule && (
                                <div>
                                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                    📅 Tabela: {qtyPricing.periodLabel || qtyPricing.activeDateRule.nome}
                                  </span>
                                </div>
                              )}

                              <div className="flex items-center gap-2 flex-wrap">
                                {desconto > 0 && (
                                  <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${inlineStyles.accentColor}15`, color: inlineStyles.accentColor }}>
                                    🏷️ {desconto}% OFF
                                  </span>
                                )}
                                <div className="flex items-center gap-2 flex-wrap">
                                  {desconto > 0 && (
                                    <span className="text-sm text-gray-400 line-through">{formatCurrency(originalUnitPrice)}</span>
                                  )}
                                  <span className="text-lg sm:text-xl font-bold text-blue-600" style={inlineStyles.priceBadge}>
                                    {formatCurrency(valorFinalUnitarioBase)}
                                  </span>
                                  {(produto.permite_multiplas_unidades ?? true) && (
                                    <span className="text-xs opacity-70" style={{ color: inlineStyles.textColorSecondary }}>
                                      / 1 {produto.unidade || 'un.'}
                                    </span>
                                  )}
                                </div>
                                {desconto > 0 && (
                                  <span className="text-xs text-green-600">Economia de {formatCurrency(originalUnitPrice - valorFinalUnitarioBase)}</span>
                                )}
                              </div>

                              {/* Destaque do Valor Total Progressivo quando o cliente seleciona 2+ no botão "+" */}
                              {currentQty >= 2 && (
                                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex flex-wrap items-center justify-between gap-2">
                                  <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                                    ✨ Total para <strong>{currentQty}x {produto.unidade || 'un.'}</strong>:
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {qtyPricing.progressiveSavings > 0 && (
                                      <span className="text-xs text-gray-400 line-through">
                                        {formatCurrency(qtyPricing.normalTotal)}
                                      </span>
                                    )}
                                    <span className="text-sm sm:text-base font-extrabold text-emerald-700 dark:text-emerald-300">
                                      {formatCurrency(qtyPricing.totalPrice)}
                                    </span>
                                    {qtyPricing.progressiveSavings > 0 && (
                                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                                        🔥 -{formatCurrency(qtyPricing.progressiveSavings)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Pílulas interativas de Desconto Progressivo por Quantidade (+) */}
                              {hasQuantitySteps && (produto.permite_multiplas_unidades ?? true) && (
                                <div className="p-2.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-1.5">
                                  <div className="text-[11px] font-bold uppercase tracking-wider flex items-center justify-between" style={{ color: inlineStyles.textColor }}>
                                    <span>📉 Desconto Progressivo no &ldquo;+&rdquo;:</span>
                                    {produto.quantidade_maxima && (
                                      <span className="text-[10px] font-normal opacity-75">
                                        Máx: {produto.quantidade_maxima} {produto.unidade || 'un.'}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {/* Pílula de 1x */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!produto.obrigatorio && !fieldsValidation.canAddProducts) {
                                          alert(fieldsValidation.validationMessage);
                                          return;
                                        }
                                        handleProdutoQuantityChange(produto.id, 1);
                                      }}
                                      className={`px-2.5 py-1 rounded-lg border text-xs transition-all ${
                                        currentQty === 1 ? 'font-bold ring-2 ring-indigo-500/40' : 'opacity-80 hover:opacity-100'
                                      }`}
                                      style={
                                        currentQty === 1
                                          ? {
                                              borderColor: inlineStyles.accentColor,
                                              background: `${inlineStyles.accentColor}18`,
                                              color: inlineStyles.textColor,
                                            }
                                          : {
                                              borderColor: `${inlineStyles.textColorSecondary}25`,
                                              color: inlineStyles.textColor,
                                            }
                                      }
                                    >
                                      1x = {formatCurrency(valorFinalUnitarioBase)}
                                    </button>
                                    {qtyPricing.resolvedSteps.map((st) => {
                                      const isSelectedStep = currentQty === st.quantidade;
                                      return (
                                        <button
                                          key={st.quantidade}
                                          type="button"
                                          onClick={() => {
                                            if (!produto.obrigatorio && !fieldsValidation.canAddProducts) {
                                              alert(fieldsValidation.validationMessage);
                                              return;
                                            }
                                            handleProdutoQuantityChange(produto.id, st.quantidade);
                                          }}
                                          className={`px-2.5 py-1 rounded-lg border text-xs transition-all flex items-center gap-1 ${
                                            isSelectedStep ? 'font-bold ring-2 ring-emerald-500/40' : 'opacity-85 hover:opacity-100'
                                          }`}
                                          style={
                                            isSelectedStep
                                              ? {
                                                  borderColor: inlineStyles.accentColor,
                                                  background: `${inlineStyles.accentColor}20`,
                                                  color: inlineStyles.textColor,
                                                }
                                              : {
                                                  borderColor: `${inlineStyles.textColorSecondary}25`,
                                                  color: inlineStyles.textColor,
                                                }
                                          }
                                        >
                                          <span>
                                            {st.quantidade}x = <strong>{formatCurrency(st.totalPrice)}</strong>
                                          </span>
                                          {st.savings > 0 && (
                                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                              (-{formatCurrency(st.savings)})
                                            </span>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Controle: toggle simples ou +/- quantidade */}
                    {(produto.permite_multiplas_unidades ?? true) ? (
                      <div className="flex flex-col items-center justify-center gap-1.5 mt-4 pt-4 border-t border-gray-200" style={{ borderTopColor: `${inlineStyles.textColorSecondary}20` }}>
                        <div className="flex items-center justify-center gap-3">
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
                            disabled={
                              (!produto.obrigatorio && !fieldsValidation.canAddProducts) ||
                              Boolean(produto.quantidade_maxima && (selectedProdutos[produto.id] || 0) >= produto.quantidade_maxima)
                            }
                            className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-lg font-bold transition-colors"
                            style={{
                              background: inlineStyles.accentColor,
                              color: '#fff',
                            }}
                            title={
                              !produto.obrigatorio && !fieldsValidation.canAddProducts
                                ? 'Preencha os campos obrigatórios primeiro'
                                : produto.quantidade_maxima && (selectedProdutos[produto.id] || 0) >= produto.quantidade_maxima
                                ? `Limite máximo de ${produto.quantidade_maxima} unidades atingido`
                                : ''
                            }
                            aria-label="Aumentar quantidade"
                          >
                            {!produto.obrigatorio && !fieldsValidation.canAddProducts ? <Lock className="w-5 h-5" /> : '+'}
                          </button>
                        </div>
                        {produto.quantidade_maxima && (selectedProdutos[produto.id] || 0) >= produto.quantidade_maxima && (
                          <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                            Limite máximo de {produto.quantidade_maxima} {produto.unidade || 'unidades'} atingido
                          </span>
                        )}
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
                        <div className="flex items-center justify-between">
                          <div className={`font-semibold text-base ${tema.cores.textoPrincipal}`} style={{ color: inlineStyles.textColor }}>{forma.nome}</div>
                          {forma.is_default && (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-200 uppercase tracking-wider whitespace-nowrap">
                              ⭐ Recomendado
                            </span>
                          )}
                        </div>
                        {(() => {
                          const total = calculateTotal();
                          const maxParcelasCalculado = getDynamicMaxParcelas(forma);
                          const valorEntrada = forma.entrada_tipo === 'percentual'
                            ? (total * (forma.entrada_valor || 0)) / 100
                            : (forma.entrada_valor || 0);
                          const saldoRestante = Math.max(0, total - valorEntrada);
                          const valorParcela = maxParcelasCalculado > 0 ? saldoRestante / maxParcelasCalculado : 0;
                          const wasLimitedByDate = maxParcelasCalculado < forma.max_parcelas && Boolean(template?.limitar_parcelas_pelo_evento && dataEvento);

                          return (
                            <div className={`text-sm ${tema.cores.textoSecundario} leading-relaxed mt-1`} style={{ color: inlineStyles.textColorSecondary }}>
                              {valorEntrada > 0 && maxParcelasCalculado > 0 && saldoRestante > 0.01 ? (
                                <div className="font-medium text-xs sm:text-sm">
                                  <span>Entrada de <strong>{formatCurrency(valorEntrada)}</strong></span>
                                  <span className="mx-1">+</span>
                                  <span><strong>{maxParcelasCalculado}x</strong> de <strong>{formatCurrency(valorParcela)}</strong></span>
                                </div>
                              ) : maxParcelasCalculado > 1 && saldoRestante > 0.01 ? (
                                <div className="font-medium text-xs sm:text-sm">
                                  <strong>{maxParcelasCalculado}x</strong> de <strong>{formatCurrency(valorParcela)}</strong>
                                </div>
                              ) : (
                                <div className="font-medium text-xs sm:text-sm">
                                  Pagamento à vista de <strong>{formatCurrency(total)}</strong>
                                </div>
                              )}

                              {wasLimitedByDate && (
                                <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-1 flex items-center gap-1">
                                  <span>📅 Ajustado para {maxParcelasCalculado}x até o mês do evento</span>
                                </div>
                              )}

                              {forma.acrescimo > 0 && (
                                <div className="text-orange-600 mt-0.5 text-xs font-semibold" style={{ color: '#ea580c' }}>(+{forma.acrescimo}% acréscimo)</div>
                              )}
                            </div>
                          );
                        })()}
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
                  const wasLimitedByDate = maxParcelasCalculado < formaPagamento.max_parcelas && Boolean(template?.limitar_parcelas_pelo_evento && dataEvento);

                  return (
                    <div className="mt-4 bg-blue-50 rounded-lg p-4 sm:p-5 space-y-3" style={inlineStyles.totalSection}>
                      <div className="flex items-center justify-between">
                        <h4 className={`font-semibold text-base ${tema.cores.textoPrincipal}`} style={{ color: inlineStyles.textColor }}>💳 Detalhes do Pagamento Escolhido</h4>
                        {wasLimitedByDate && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-300">
                            Ajustado para o Evento
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="bg-white rounded-lg p-3" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.05)' }}>
                          <div className={`${tema.cores.textoSecundario} text-xs mb-1`} style={{ color: inlineStyles.textColorSecondary }}>Entrada:</div>
                          <div className="font-bold text-blue-600 text-lg" style={{ color: inlineStyles.accentColor }}>
                            {formatCurrency(valorEntrada)}
                          </div>
                          {formaPagamento.entrada_tipo === 'percentual' && (
                            <div className="text-xs text-gray-500 mt-1" style={{ color: inlineStyles.textColorSecondary }}>
                              ({formaPagamento.entrada_valor}% do valor total)
                            </div>
                          )}
                        </div>

                        {maxParcelasCalculado > 0 && saldoRestante > 0.01 && (
                          <div className="bg-white rounded-lg p-3" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.05)' }}>
                            <div className={`${tema.cores.textoSecundario} text-xs mb-1`} style={{ color: inlineStyles.textColorSecondary }}>Parcelas Mensais:</div>
                            <div className="font-bold text-blue-600 text-lg" style={{ color: inlineStyles.accentColor }}>
                              {maxParcelasCalculado}x de {formatCurrency(valorParcela)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1" style={{ color: inlineStyles.textColorSecondary }}>
                              {wasLimitedByDate ? `Calculado até o evento em ${dataEvento.split('-').reverse().join('/')}` : 'Saldo restante parcelado'}
                            </div>
                          </div>
                        )}
                      </div>

                      {wasLimitedByDate && (
                        <div className="bg-amber-50/80 border border-amber-200/80 rounded-lg p-2.5 text-xs text-amber-800 flex items-center gap-2">
                          <span>💡</span>
                          <span>O parcelamento foi calculado de acordo com a antecedência até a data do seu evento, garantindo a quitação antes da entrega final.</span>
                        </div>
                      )}

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

                          {(breakdown.economiaQuantidadeProdutos ?? 0) > 0 && (
                            <div className="flex items-start justify-between text-sm gap-2">
                              <span className={`${tema.cores.textoSecundario} flex-1`} style={{ color: inlineStyles.textColorSecondary }}>
                                ➕ Economia Progressiva nas Quantidades (já aplicada):
                              </span>
                              <span className="text-green-600 font-semibold text-right" style={{ color: '#16a34a' }}>
                                -{formatCurrency(breakdown.economiaQuantidadeProdutos || 0)}
                              </span>
                            </div>
                          )}

                          {(breakdown.descontoProgressivo ?? 0) > 0 && (
                            <div className="flex items-start justify-between text-sm gap-2">
                              <span className={`${tema.cores.textoSecundario} flex-1`} style={{ color: inlineStyles.textColorSecondary }}>
                                📊 Desconto Progressivo:
                              </span>
                              <span className="text-green-600 font-semibold text-right" style={{ color: '#16a34a' }}>
                                -{formatCurrency(breakdown.descontoProgressivo || 0)}
                              </span>
                            </div>
                          )}

                          {(breakdown.ajusteDiaSemana ?? 0) !== 0 && (
                            <div className="flex items-start justify-between text-sm gap-2">
                              <span className={`${tema.cores.textoSecundario} flex-1`} style={{ color: inlineStyles.textColorSecondary }}>
                                📅 {progressiveSummary.activeDayRuleLabel || 'Ajuste por Dia da Semana'}:
                              </span>
                              <span
                                className={`font-semibold text-right ${
                                  (breakdown.ajusteDiaSemana || 0) > 0 ? 'text-red-600' : 'text-green-600'
                                }`}
                                style={{ color: (breakdown.ajusteDiaSemana || 0) > 0 ? '#dc2626' : '#16a34a' }}
                              >
                                {(breakdown.ajusteDiaSemana || 0) > 0 ? '+' : ''}
                                {formatCurrency(breakdown.ajusteDiaSemana || 0)}
                              </span>
                            </div>
                          )}

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
                                {valorEntrada > 0 && (
                                  <div className="flex justify-between items-center">
                                    <span>Entrada:</span>
                                    <span className="font-semibold">{formatCurrency(valorEntrada)}</span>
                                  </div>
                                )}
                                {maxParcelasCalculado > 0 && saldoRestante > 0.01 ? (
                                  <div className="flex justify-between items-center">
                                    <span>Parcelamento:</span>
                                    <span className="font-semibold">{maxParcelasCalculado}x de {formatCurrency(valorParcela)}</span>
                                  </div>
                                ) : (
                                  <div className="flex justify-between items-center">
                                    <span>Pagamento:</span>
                                    <span className="font-semibold">À vista</span>
                                  </div>
                                )}
                                {maxParcelasCalculado < formaPagamento.max_parcelas && template?.limitar_parcelas_pelo_evento && dataEvento && (
                                  <div className="text-[11px] text-amber-600 font-medium pt-1">
                                    📅 Parcelas calculadas até a data do evento
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

            {/* CTA PRINCIPAL DE ENVIO & NEGOCIAÇÃO DA PROPOSTA */}
            <div className="space-y-3.5 pt-3">
              {/* Badge de Presença Online do Profissional */}
              {vendorPresence.showOnlineStatus !== false && vendorPresence.status !== 'invisible' && (
                <div className="flex items-center justify-center gap-2 p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      vendorPresence.status === 'online' ? 'bg-emerald-400' : 'bg-amber-400'
                    }`} />
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                      vendorPresence.status === 'online' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`} />
                  </span>
                  <span>
                    {profile?.nome_profissional || profile?.nome_empresa || 'Profissional'}{' '}
                    {vendorPresence.status === 'online' ? 'está Online Agora' : 'está em Atendimento'}
                    {vendorPresence.responseTimeText ? ` • ${vendorPresence.responseTimeText}` : ''}
                  </span>
                </div>
              )}

              {/* Botões de CTA: Envio (Resumo/WhatsApp) + Chat Oficial Direto */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  className={`flex-1 relative group overflow-hidden flex flex-col items-center justify-center bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] text-white px-6 py-4 sm:py-5 ${tema.estilos.borderRadius} font-bold transition-all shadow-xl shadow-emerald-950/40 border border-emerald-400/50 disabled:opacity-50 disabled:cursor-not-allowed min-h-[66px] touch-manipulation cursor-pointer ring-2 ring-emerald-400/20 hover:ring-emerald-400/60`}
                  style={inlineStyles.submitButton}
                  disabled={
                    isSubmitting ||
                    !fieldsValidation.canUseWhatsApp ||
                    (disponibilidade?.modo_aviso === 'restritivo' &&
                     (disponibilidade?.status === 'ocupada' || disponibilidade?.status === 'bloqueada'))
                  }
                  title={
                    isSubmitting
                      ? 'Salvando...'
                      : !fieldsValidation.canUseWhatsApp
                      ? 'Preencha os campos obrigatórios primeiro'
                      : 'Enviar orçamento'
                  }
                  data-fixed-button
                >
                  {/* Efeito de brilho animado */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                  
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-extrabold bg-emerald-950/80 text-emerald-200 border border-emerald-400/40 flex items-center gap-1 shadow-sm">
                      <ShieldCheck className="w-3 h-3 text-emerald-300" />
                      Canal Oficial Protegido • WhatsApp & Chat
                    </span>
                  </div>

                  <div className="flex items-center justify-center gap-2.5 sm:gap-3 text-base sm:text-lg leading-tight">
                    <Send className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                    <span>
                      {isSubmitting
                        ? 'Preparando Envio...'
                        : (template?.texto_botao_envio || 'Negociar Proposta no WhatsApp')}
                    </span>
                  </div>

                  <span className="text-[11px] sm:text-xs font-normal text-emerald-100/90 mt-1 text-center">
                    Conferir resumo e escolher entre envio direto pelo WhatsApp ou Chat Oficial PriceU$
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleStartOnlineChat}
                  disabled={
                    isStartingChat ||
                    !fieldsValidation.canUseWhatsApp ||
                    (disponibilidade?.modo_aviso === 'restritivo' &&
                     (disponibilidade?.status === 'ocupada' || disponibilidade?.status === 'bloqueada'))
                  }
                  className={`sm:w-64 relative group overflow-hidden flex flex-col items-center justify-center bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:to-blue-500 active:scale-[0.99] text-white px-5 py-4 ${tema.estilos.borderRadius} font-bold transition-all shadow-xl shadow-indigo-950/30 border border-indigo-400/40 disabled:opacity-50 disabled:cursor-not-allowed min-h-[66px] touch-manipulation cursor-pointer`}
                  title="Negociar ao vivo no Chat PriceU$"
                >
                  <div className="flex items-center gap-2 text-sm sm:text-base leading-tight">
                    <MessageSquare className="w-5 h-5 flex-shrink-0" />
                    <span>{isStartingChat ? 'Abrindo Chat...' : 'Negociar no Chat PriceU$'}</span>
                  </div>
                  <span className="text-[10px] font-normal text-indigo-100/90 mt-1 text-center">
                    Chat oficial em tempo real • Sem bloqueios
                  </span>
                </button>
              </div>
            </div>
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

      {/* Ecossistema de Chat e Negociação Online PriceU$ (Live Dock & Drawer) */}
      {renderChatEcosystem()}

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
