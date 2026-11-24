import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Lead } from '../pages/useLeadsManager';

export interface LeadAnalyticsMetrics {
  totalLeads: number;
  statusCounts: {
    novo: number;
    contatado: number;
    convertido: number;
    perdido: number;
    abandonado: number;
  };
  closingRate: number;
  abandonRate: number;
  potentialValue: number;
  closedValue: number;
  lostValue: number;
  ticketMedio: number;
  funnelData: Array<{ name: string; value: number; percentage: number }>;
  monthlyTrend: Array<{ month: string; recebidos: number; fechados: number }>;
}

export function useLeadAnalytics(userId: string) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterPeriod, setFilterPeriod] = useState<'tudo' | 'semana' | 'mes' | 'ano'>('tudo');

  const fetchLeadsForAnalytics = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      setLeads((data as Lead[]) || []);
    } catch (err: any) {
      console.error('[LeadAnalytics] Erro ao buscar leads:', err);
      setError('Erro ao carregar análise de leads.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchLeadsForAnalytics();
  }, [fetchLeadsForAnalytics]);

  // Real-time subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`leads-analytics-for-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads', filter: `user_id=eq.${userId}` },
        () => {
          fetchLeadsForAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchLeadsForAnalytics]);

  // Filtrar leads com base no período selecionado
  const filteredLeads = useMemo(() => {
    if (filterPeriod === 'tudo') return leads;

    const now = new Date();
    const cutoff = new Date();

    if (filterPeriod === 'semana') {
      cutoff.setDate(now.getDate() - 7);
    } else if (filterPeriod === 'mes') {
      cutoff.setDate(now.getDate() - 30);
    } else if (filterPeriod === 'ano') {
      cutoff.setDate(now.getDate() - 365);
    }

    return leads.filter((lead) => {
      if (!lead.created_at) return false;
      const date = new Date(lead.created_at);
      return date >= cutoff;
    });
  }, [leads, filterPeriod]);

  const metrics = useMemo((): LeadAnalyticsMetrics => {
    const totalLeads = filteredLeads.length;

    const statusCounts = {
      novo: 0,
      contatado: 0,
      convertido: 0,
      perdido: 0,
      abandonado: 0,
    };

    let potentialValue = 0;
    let closedValue = 0;
    let lostValue = 0;

    filteredLeads.forEach((lead) => {
      const status = lead.status || 'novo';
      if (status in statusCounts) {
        statusCounts[status as keyof typeof statusCounts]++;
      } else {
        statusCounts.novo++;
      }

      const valor = Number(lead.valor_total) || 0;
      if (status === 'convertido') {
        closedValue += valor;
      } else if (status === 'perdido' || status === 'abandonado') {
        lostValue += valor;
      } else {
        potentialValue += valor;
      }
    });

    const closingRate = totalLeads > 0 ? (statusCounts.convertido / totalLeads) * 100 : 0;
    const abandonRate = totalLeads > 0 ? ((statusCounts.abandonado + statusCounts.perdido) / totalLeads) * 100 : 0;
    const ticketMedio = statusCounts.convertido > 0 ? closedValue / statusCounts.convertido : 0;

    // Funil de Vendas:
    // Passos: 
    // 1. Leads Recebidos (100% dos leads)
    // 2. Leads Atendidos/Negociando (Contatado + Convertido + Perdido)
    // 3. Leads Convertidos (Convertido)
    const negociando = statusCounts.contatado + statusCounts.convertido + statusCounts.perdido;
    const convertidos = statusCounts.convertido;

    const funnelData = [
      {
        name: 'Leads Recebidos',
        value: totalLeads,
        percentage: totalLeads > 0 ? 100 : 0,
      },
      {
        name: 'Em Negociação',
        value: negociando,
        percentage: totalLeads > 0 ? (negociando / totalLeads) * 100 : 0,
      },
      {
        name: 'Contratos Fechados',
        value: convertidos,
        percentage: totalLeads > 0 ? (convertidos / totalLeads) * 100 : 0,
      },
    ];

    // Tendência Mensal
    const meses = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
    
    // Agrupar leads por mês de criação
    const monthlyGroups: Record<string, { recebidos: number; fechados: number }> = {};
    
    // Inicializar os últimos 6 meses
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyGroups[key] = { recebidos: 0, fechados: 0 };
    }

    filteredLeads.forEach((lead) => {
      const date = new Date(lead.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      // Só computamos se estiver no intervalo inicializado
      if (key in monthlyGroups) {
        monthlyGroups[key].recebidos++;
        if (lead.status === 'convertido') {
          monthlyGroups[key].fechados++;
        }
      }
    });

    const monthlyTrend = Object.entries(monthlyGroups).map(([key, data]) => {
      const [year, monthIndex] = key.split('-');
      const monthLabel = meses[parseInt(monthIndex, 10) - 1];
      return {
        month: `${monthLabel}/${year.substring(2)}`,
        recebidos: data.recebidos,
        fechados: data.fechados,
      };
    });

    return {
      totalLeads,
      statusCounts,
      closingRate,
      abandonRate,
      potentialValue,
      closedValue,
      lostValue,
      ticketMedio,
      funnelData,
      monthlyTrend,
    };
  }, [filteredLeads]);

  return {
    metrics,
    loading,
    error,
    filterPeriod,
    setFilterPeriod,
    refetch: fetchLeadsForAnalytics,
  };
}
