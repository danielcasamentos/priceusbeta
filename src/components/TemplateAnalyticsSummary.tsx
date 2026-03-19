import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart3, TrendingUp, Users, Lightbulb } from 'lucide-react';

interface Props {
  templateId: string;
}

export function TemplateAnalyticsSummary({ templateId }: Props) {
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
      <div className="mt-4 p-4 bg-gray-50 rounded-lg animate-pulse border border-gray-100">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-blue-600" />
        <h4 className="text-sm font-bold text-gray-900">Desempenho Rastreável</h4>
      </div>
      
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
          <Users className="w-4 h-4 text-gray-500 mb-1" />
          <span className="text-xs text-gray-500 font-medium whitespace-nowrap overflow-hidden text-ellipsis w-[100%]">Acessos Tracking</span>
          <span className="font-bold text-gray-900 leading-tight">{stats.leads}</span>
        </div>
        <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
          <TrendingUp className="w-4 h-4 text-green-500 mb-1" />
          <span className="text-xs text-gray-500 font-medium">Conversão</span>
          <span className="font-bold text-green-600 leading-tight">{stats.conversion.toFixed(1)}%</span>
        </div>
        <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
          <span className="text-[10px] font-extrabold text-blue-500 mb-1 leading-none mt-1">R$</span>
          <span className="text-xs text-gray-500 font-medium">Lucro Líquido</span>
          <span className="font-bold text-gray-900 leading-tight truncate w-full" title={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.revenue)}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(stats.revenue)}
          </span>
        </div>
      </div>
      
      <div className="bg-blue-50/70 p-3 rounded-lg text-xs md:text-sm text-blue-900 flex items-start gap-2 border border-blue-100 shadow-inner">
        <Lightbulb className="w-5 h-5 shrink-0 text-yellow-500 drop-shadow-sm flex-none" />
        <p className="leading-snug"><strong>Insight do App:</strong> {getInsight()}</p>
      </div>
    </div>
  );
}
