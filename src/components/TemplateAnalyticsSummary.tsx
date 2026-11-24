import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart3, TrendingUp, Users, Lightbulb } from 'lucide-react';

interface Props {
  templateId: string;
  viewMode?: 'grid' | 'list';
}

export function TemplateAnalyticsSummary({ templateId, viewMode = 'list' }: Props) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    leads: 0,
    sales: 0,
    conversion: 0,
    revenue: 0
  });

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const { data, error } = await supabase
          .from('leads')
          .select('status, valor_total')
          .eq('template_id', templateId);

        if (error) throw error;

        if (data && data.length > 0) {
          const totalLeads = data.length;
          const convertedLeads = data.filter(l => l.status === 'convertido');
          const salesCount = convertedLeads.length;
          
          const conversionRate = (salesCount / totalLeads) * 100;
          
          let revenue = 0;
          convertedLeads.forEach(lead => {
            if (lead.valor_total) revenue += Number(lead.valor_total);
          });

          setStats({
            leads: totalLeads,
            sales: salesCount,
            conversion: conversionRate,
            revenue: revenue
          });
        }
      } catch (err) {
        console.error('Erro ao buscar analytics do template', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [templateId]);

  const getInsight = () => {
    if (stats.leads === 0) {
      return "0 acessos rastreados? Espalhe o link desse template no seu WhatsApp ou na Link na Bio do Instagram para aumentar as visualizações!";
    }
    if (stats.conversion === 0 && stats.leads > 4) {
      return "O link está sendo bastante clicado, mas poucos clientes assinam de fato. Que tal criar um combo mais barato ou oferecer um desconto exclusivo neste pacote?";
    }
    if (stats.conversion > 30) {
      return "Fantástico! Este template está com ótima conversão. Promova-o com confiança no WhatsApp para fechar mais negócios rápidos!";
    }
    if (stats.sales > 0) {
      return "Este template já se provou lucrativo! Continue divulgando exatamente este link nas suas redes diretas e nos orçamentos.";
    }
    return "Continue compartilhando seu link orçamentário para gerar mais inteligência e métricas sobre ele.";
  };

  if (loading) {
    return (
      <div className="mt-4 p-4 bg-gray-50 dark:bg-[rgba(255,255,255,0.02)] rounded-lg animate-pulse border border-gray-100 dark:border-[rgba(255,255,255,0.06)]">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div className="mt-4 p-4 bg-gray-50 dark:bg-[rgba(255,255,255,0.02)] rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">Desempenho Rastreável</h4>
        </div>
        
        <div className="space-y-2 mb-3">
          <div className="bg-white dark:bg-[#0c1a30] p-2.5 rounded-lg border border-gray-100 dark:border-[rgba(255,255,255,0.05)] shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Acessos Tracking</span>
            </div>
            <span className="font-bold text-gray-900 dark:text-white text-sm">{stats.leads}</span>
          </div>
          
          <div className="bg-white dark:bg-[#0c1a30] p-2.5 rounded-lg border border-gray-100 dark:border-[rgba(255,255,255,0.05)] shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500 shrink-0" />
              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Conversão</span>
            </div>
            <span className="font-bold text-green-600 dark:text-green-400 text-sm">{stats.conversion.toFixed(1)}%</span>
          </div>
          
          <div className="bg-white dark:bg-[#0c1a30] p-2.5 rounded-lg border border-gray-100 dark:border-[rgba(255,255,255,0.05)] shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-4 text-center text-[10px] font-extrabold text-blue-500 shrink-0">R$</span>
              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Lucro Líquido</span>
            </div>
            <span className="font-bold text-gray-900 dark:text-white text-sm truncate max-w-[120px] text-right" title={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.revenue)}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(stats.revenue)}
            </span>
          </div>
        </div>
        
        <div className="bg-blue-50/70 dark:bg-[rgba(59,130,246,0.04)] p-3 rounded-lg text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2 border border-blue-100 dark:border-[rgba(59,130,246,0.15)] shadow-inner">
          <Lightbulb className="w-5 h-5 shrink-0 text-yellow-500 drop-shadow-sm flex-none" />
          <p className="leading-snug"><strong>Insight do App:</strong> {getInsight()}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 bg-gray-50 dark:bg-[rgba(255,255,255,0.02)] rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.06)]">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <h4 className="text-sm font-bold text-gray-900 dark:text-white">Desempenho Rastreável</h4>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
        <div className="bg-white dark:bg-[#0c1a30] p-2 rounded-lg border border-gray-100 dark:border-[rgba(255,255,255,0.05)] shadow-sm flex flex-col items-center justify-center text-center">
          <Users className="w-4 h-4 text-gray-500 dark:text-gray-400 mb-1" />
          <span className="text-xs text-gray-500 dark:text-[rgba(255,255,255,0.6)] font-medium whitespace-nowrap overflow-hidden text-ellipsis w-[100%]">Acessos Tracking</span>
          <span className="font-bold text-gray-900 dark:text-white leading-tight">{stats.leads}</span>
        </div>
        <div className="bg-white dark:bg-[#0c1a30] p-2 rounded-lg border border-gray-100 dark:border-[rgba(255,255,255,0.05)] shadow-sm flex flex-col items-center justify-center text-center">
          <TrendingUp className="w-4 h-4 text-green-500 mb-1" />
          <span className="text-xs text-gray-500 dark:text-[rgba(255,255,255,0.6)] font-medium">Conversão</span>
          <span className="font-bold text-green-600 dark:text-green-400 leading-tight">{stats.conversion.toFixed(1)}%</span>
        </div>
        <div className="bg-white dark:bg-[#0c1a30] p-2 rounded-lg border border-gray-100 dark:border-[rgba(255,255,255,0.05)] shadow-sm flex flex-col items-center justify-center text-center">
          <span className="text-[10px] font-extrabold text-blue-500 mb-1 leading-none mt-1">R$</span>
          <span className="text-xs text-gray-500 dark:text-[rgba(255,255,255,0.6)] font-medium">Lucro Líquido</span>
          <span className="font-bold text-gray-900 dark:text-white leading-tight truncate w-full" title={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.revenue)}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(stats.revenue)}
          </span>
        </div>
      </div>
      
      <div className="bg-blue-50/70 dark:bg-[rgba(59,130,246,0.04)] p-3 rounded-lg text-xs md:text-sm text-blue-900 dark:text-blue-300 flex items-start gap-2 border border-blue-100 dark:border-[rgba(59,130,246,0.15)] shadow-inner">
        <Lightbulb className="w-5 h-5 shrink-0 text-yellow-500 drop-shadow-sm flex-none" />
        <p className="leading-snug"><strong>Insight do App:</strong> {getInsight()}</p>
      </div>
    </div>
  );
}
