import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getReferrer, detectBrowser } from '../lib/browserDetection';

interface QuoteAnalyticsData {
  templateId: string;
  userId: string;
  sessionId: string;
  origem?: string;
  referrer?: string;
  utmSource?: string;
  utmCampaign?: string;
}

interface TrackingState {
  ultimaEtapa: string;
  camposPreenchidos: Record<string, boolean>;
  produtosVisualizados: string[];
  interacoes: number;
  scrollProfundidade: number;
  startTime: number;
}

export function useQuoteAnalytics(data: QuoteAnalyticsData | null) {
  const [analyticsId, setAnalyticsId] = useState<string | null>(null);
  const trackingState = useRef<TrackingState>({
    ultimaEtapa: 'inicio',
    camposPreenchidos: {},
    produtosVisualizados: [],
    interacoes: 0,
    scrollProfundidade: 0,
    startTime: Date.now(),
  });
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitialized = useRef(false);

  const getDeviceType = (): string => {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
      return 'mobile';
    }
    return 'desktop';
  };

  const getUtmParams = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source') || data?.utmSource,
      utm_campaign: params.get('utm_campaign') || data?.utmCampaign,
    };
  };

  const createAnalyticsSession = async () => {
    if (!data || hasInitialized.current) return;
    hasInitialized.current = true;

    try {
      const utmParams = getUtmParams();
      const referrer = getReferrer();
      const browserInfo = detectBrowser();

      // ✅ NOVO: Invoca a Edge Function para criar a sessão de analytics
      const { data: edgeFunctionData, error } = await supabase.functions.invoke('create-analytics-session', {
        body: {
          template_id: data.templateId,
          user_id: data.userId,
          session_id: data.sessionId,
          origem: data.origem || referrer,
          referrer: referrer !== 'direct' ? referrer : null,
          device_type: getDeviceType(),
          user_agent: navigator.userAgent,
          ultima_etapa: 'inicio',
          ...utmParams,
        },
      });

      if (error) {
        throw error; // Lança o erro para ser capturado pelo catch
      }

      console.log('[Analytics] Session created with browser:', browserInfo);

      if (edgeFunctionData?.id) {
        setAnalyticsId(edgeFunctionData.id);
      }
    } catch (error) {
      console.error('Erro ao inicializar analytics:', error);
    }
  };

  const scheduleUpdate = () => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      updateAnalytics();
    }, 2000);
  };

  const updateAnalytics = async (_forceUpdate = false) => {
    if (!analyticsId) return;

    try {
      const tempoPermanencia = Math.floor((Date.now() - trackingState.current.startTime) / 1000);

      await supabase
        .from('analytics_orcamentos')
        .update({
          ultima_etapa: trackingState.current.ultimaEtapa,
          campos_preenchidos: trackingState.current.camposPreenchidos,
          produtos_visualizados: trackingState.current.produtosVisualizados,
          interacoes: trackingState.current.interacoes,
          scroll_profundidade: trackingState.current.scrollProfundidade,
          tempo_permanencia: tempoPermanencia,
        })
        .eq('id', analyticsId);
    } catch (error) {
      console.error('Erro ao atualizar analytics:', error);
    }
  };

  const trackStage = (stage: string) => {
    trackingState.current.ultimaEtapa = stage;
    trackingState.current.interacoes += 1;
    scheduleUpdate();
  };

  const trackFieldFilled = (fieldName: string, filled: boolean) => {
    trackingState.current.camposPreenchidos[fieldName] = filled;
    trackingState.current.interacoes += 1;
    scheduleUpdate();
  };

  const trackProductViewed = (productId: string) => {
    if (!trackingState.current.produtosVisualizados.includes(productId)) {
      trackingState.current.produtosVisualizados.push(productId);
      trackingState.current.interacoes += 1;
      scheduleUpdate();
    }
  };

  const trackInteraction = () => {
    trackingState.current.interacoes += 1;
  };

  const trackScroll = () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = Math.round((scrollTop / docHeight) * 100);

    if (scrollPercent > trackingState.current.scrollProfundidade) {
      trackingState.current.scrollProfundidade = scrollPercent;
    }
  };

  const markAsAbandoned = async () => {
    if (!analyticsId) return;

    try {
      const tempoAteAbandono = Math.floor((Date.now() - trackingState.current.startTime) / 1000);

      await supabase
        .from('analytics_orcamentos')
        .update({
          abandonou: true,
          tempo_ate_abandono: tempoAteAbandono,
          ultima_etapa: trackingState.current.ultimaEtapa,
          campos_preenchidos: trackingState.current.camposPreenchidos,
          produtos_visualizados: trackingState.current.produtosVisualizados,
          interacoes: trackingState.current.interacoes,
          scroll_profundidade: trackingState.current.scrollProfundidade,
          tempo_permanencia: tempoAteAbandono,
        })
        .eq('id', analyticsId);
    } catch (error) {
      console.error('Erro ao marcar como abandonado:', error);
    }
  };

  const markAsConverted = async () => {
    if (!analyticsId) return;

    try {
      await supabase
        .from('analytics_orcamentos')
        .update({
          orcamento_enviado: true,
          abandonou: false,
          ultima_etapa: 'enviado',
        })
        .eq('id', analyticsId);
    } catch (error) {
      console.error('Erro ao marcar como convertido:', error);
    }
  };

  useEffect(() => {
    if (!data) return;

    createAnalyticsSession();

    const handleScroll = () => {
      trackScroll();
      scheduleUpdate();
    };

    const handleClick = () => {
      trackInteraction();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateAnalytics(true);
        markAsAbandoned();
      }
    };

    const handleBeforeUnload = () => {
      if (analyticsId) {
        updateAnalytics(true);
        markAsAbandoned();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('click', handleClick);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    const updateInterval = setInterval(() => {
      updateAnalytics();
    }, 30000);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('click', handleClick);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(updateInterval);
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      updateAnalytics(true);
    };
  }, [data?.templateId, data?.userId, data?.sessionId]);

  return {
    trackStage,
    trackFieldFilled,
    trackProductViewed,
    trackInteraction,
    markAsConverted,
    markAsAbandoned,
    analyticsId,
  };
}
