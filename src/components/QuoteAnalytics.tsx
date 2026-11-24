import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  TrendingUp,
  Eye,
  MousePointerClick,
  CheckCircle,
  Clock,
  Smartphone,
  Monitor,
  Tablet,
  AlertTriangle,
  TrendingDown,
  Target,
  Lightbulb,
  Info,
  BarChart2,
} from 'lucide-react';

interface AnalyticsData {
  id: string;
  template_id: string;
  data_acesso: string;
  origem: string;
  device_type: string;
  ultima_etapa: string;
  orcamento_enviado: boolean;
  abandonou: boolean;
  tempo_permanencia: number;
  tempo_ate_abandono: number | null;
  interacoes: number;
  scroll_profundidade: number;
  campos_preenchidos: Record<string, boolean>;
  produtos_selecionados: Record<string, number>; // Alterado de produtos_visualizados para produtos_selecionados
}

interface QuoteAnalyticsProps {
  templateId: string;
}

interface Metrics {
  totalVisualizacoes: number;
  totalConversoes: number;
  taxaConversao: number;
  totalAbandonos: number;
  taxaAbandono: number;
  tempoMedio: number;
  interacoesMedias: number;
  scrollMedio: number;
}

interface FunnelStage {
  nome: string;
  total: number;
  percentual: number;
}

interface DeviceStats {
  mobile: number;
  desktop: number;
  tablet: number;
}

interface Insight {
  tipo: 'success' | 'warning' | 'error' | 'info';
  titulo: string;
  descricao: string;
  sugestao: string;
  icon: any;
}

interface PopularProduct {
  nome: string;
  quantidade: number;
}

export function QuoteAnalytics({ templateId }: QuoteAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<7 | 30 | 90>(30);

  useEffect(() => {
    loadAnalytics();
  }, [templateId, periodo]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const dataInicio = new Date();
      dataInicio.setDate(dataInicio.getDate() - periodo);

      const { data, error } = await supabase
        .from('analytics_orcamentos')
        .select('*')
        .eq('template_id', templateId)
        .gte('data_acesso', dataInicio.toISOString())
        .order('data_acesso', { ascending: false });

      if (error) throw error;

      setAnalytics(data || []);
    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (): Metrics => {
    const totalVisualizacoes = analytics.length;
    const totalConversoes = analytics.filter((a) => a.orcamento_enviado).length;
    const totalAbandonos = analytics.filter((a) => a.abandonou && !a.orcamento_enviado).length;

    const taxaConversao = totalVisualizacoes > 0 ? (totalConversoes / totalVisualizacoes) * 100 : 0;
    const taxaAbandono = totalVisualizacoes > 0 ? (totalAbandonos / totalVisualizacoes) * 100 : 0;

    const tempoMedio =
      analytics.length > 0
        ? analytics.reduce((acc, a) => acc + (a.tempo_permanencia || 0), 0) / analytics.length
        : 0;

    const interacoesMedias =
      analytics.length > 0
        ? analytics.reduce((acc, a) => acc + (a.interacoes || 0), 0) / analytics.length
        : 0;

    const scrollMedio =
      analytics.length > 0
        ? analytics.reduce((acc, a) => acc + (a.scroll_profundidade || 0), 0) / analytics.length
        : 0;

    return {
      totalVisualizacoes,
      totalConversoes,
      taxaConversao,
      totalAbandonos,
      taxaAbandono,
      tempoMedio,
      interacoesMedias,
      scrollMedio,
    };
  };

  const calculateFunnel = (): FunnelStage[] => {
    const total = analytics.length;

    if (total === 0)
      return [
        { nome: 'Visualizações', total: 0, percentual: 0 },
        { nome: 'Produtos', total: 0, percentual: 0 },
        { nome: 'Pagamento', total: 0, percentual: 0 },
        { nome: 'Conversão', total: 0, percentual: 0 },
      ];

    const comProdutos = analytics.filter(
      (a) => a.ultima_etapa && ['produtos_selecionados', 'forma_pagamento_selecionada', 'cupom_aplicado', 'tentativa_envio', 'enviado'].includes(a.ultima_etapa)
    ).length;

    const comPagamento = analytics.filter(
      (a) => a.ultima_etapa && ['forma_pagamento_selecionada', 'cupom_aplicado', 'tentativa_envio', 'enviado'].includes(a.ultima_etapa)
    ).length;

    const conversoes = analytics.filter((a) => a.orcamento_enviado).length;

    return [
      { nome: 'Visualizações', total, percentual: 100 },
      { nome: 'Produtos Selecionados', total: comProdutos, percentual: (comProdutos / total) * 100 },
      { nome: 'Forma de Pagamento', total: comPagamento, percentual: (comPagamento / total) * 100 },
      { nome: 'Conversão', total: conversoes, percentual: (conversoes / total) * 100 },
    ];
  };

  const calculateDeviceStats = (): DeviceStats => {
    return {
      mobile: analytics.filter((a) => a.device_type === 'mobile').length,
      desktop: analytics.filter((a) => a.device_type === 'desktop').length,
      tablet: analytics.filter((a) => a.device_type === 'tablet').length,
    };
  };

  const calculateProductPopularity = (): PopularProduct[] => {
    const productCounts = new Map<string, number>();

    analytics.forEach((a) => {
      if (a.produtos_selecionados) {
        for (const [productName, quantity] of Object.entries(a.produtos_selecionados)) {
          productCounts.set(productName, (productCounts.get(productName) || 0) + quantity);
        }
      }
    });

    return Array.from(productCounts.entries())
      .map(([nome, quantidade]) => ({ nome, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5); // Retorna o top 5
  };

  const generateInsights = (): Insight[] => {
    const metrics = calculateMetrics();
    const popularProducts = calculateProductPopularity();
    const insights: Insight[] = [];

    // A conversão é o clique no WhatsApp, então a lógica de `orcamento_enviado` está correta.
    // A lógica de `tentativa_envio` no funil também ajuda a entender o drop-off.
    if (metrics.taxaConversao < 5) {
      insights.push({
        tipo: 'error',
        titulo: 'Taxa de Conversão Baixa',
        descricao: `Apenas ${metrics.taxaConversao.toFixed(1)}% dos visitantes estão enviando orçamento.`,
        sugestao: 'Simplifique o formulário, reduza campos obrigatórios e melhore a apresentação dos produtos.',
        icon: TrendingDown,
      });
    } else if (metrics.taxaConversao >= 15) {
      insights.push({
        tipo: 'success',
        titulo: 'Excelente Taxa de Conversão!',
        descricao: `${metrics.taxaConversao.toFixed(1)}% dos visitantes estão convertendo.`,
        sugestao: 'Continue com a estratégia atual. Considere aumentar o tráfego para este orçamento.',
        icon: Target,
      });
    }

    if (metrics.tempoMedio < 30) {
      insights.push({
        tipo: 'warning',
        titulo: 'Tempo Muito Curto na Página',
        descricao: `Usuários ficam apenas ${Math.floor(metrics.tempoMedio)}s na página.`,
        sugestao: 'Melhore o design visual, adicione descrições mais detalhadas dos produtos e use imagens de qualidade.',
        icon: Clock,
      });
    }

    if (metrics.scrollMedio < 40) {
      insights.push({
        tipo: 'warning',
        titulo: 'Baixo Engajamento com Conteúdo',
        descricao: `Usuários scrollam apenas ${metrics.scrollMedio.toFixed(0)}% da página.`,
        sugestao: 'Reorganize o conteúdo, coloque informações importantes no topo e use CTAs mais visíveis.',
        icon: MousePointerClick,
      });
    }

    const funnel = calculateFunnel();
    const dropoffProdutos = funnel[0].total > 0 ? ((funnel[0].total - funnel[1].total) / funnel[0].total) * 100 : 0;

    if (dropoffProdutos > 60) {
      insights.push({
        tipo: 'error',
        titulo: 'Alto Abandono na Seleção de Produtos',
        descricao: `${dropoffProdutos.toFixed(0)}% dos usuários saem antes de selecionar produtos.`,
        sugestao: 'Facilite a visualização dos produtos, adicione imagens e simplifique a seleção de quantidade.',
        icon: AlertTriangle,
      });
    }

    const deviceStats = calculateDeviceStats();
    const mobilePercentage = analytics.length > 0 ? (deviceStats.mobile / analytics.length) * 100 : 0;

    if (mobilePercentage > 60) {
      insights.push({
        tipo: 'info',
        titulo: 'Maioria dos Acessos por Mobile',
        descricao: `${mobilePercentage.toFixed(0)}% dos acessos são de dispositivos móveis.`,
        sugestao: 'Otimize ainda mais a experiência mobile: botões maiores, textos legíveis e formulário simplificado.',
        icon: Smartphone,
      });
    }

    if (popularProducts.length > 0) {
      const mostPopular = popularProducts[0];
      insights.push({
        tipo: 'info',
        titulo: 'Produto Popular Identificado',
        descricao: `O produto "${mostPopular.nome}" é o mais escolhido pelos seus clientes.`,
        sugestao: `Considere destacá-lo na página, criar um pacote promocional com ele ou usá-lo em campanhas de marketing.`,
        icon: Lightbulb,
      });
    }

    if (insights.length === 0) {
      insights.push({
        tipo: 'success',
        titulo: 'Orçamento Bem Otimizado',
        descricao: 'Suas métricas estão boas! Continue monitorando para manter a performance.',
        sugestao: 'Experimente pequenos ajustes e compare os resultados ao longo do tempo.',
        icon: CheckCircle,
      });
    }

    return insights;
  };

  const metrics = calculateMetrics();
  const funnel = calculateFunnel();
  const deviceStats = calculateDeviceStats();
  const popularProducts = calculateProductPopularity();
  const insights = generateInsights();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Analytics do Orçamento</h3>
          <p className="text-sm text-gray-600">Métricas e insights para otimizar conversões</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPeriodo(7)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              periodo === 7 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            7 dias
          </button>
          <button
            onClick={() => setPeriodo(30)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              periodo === 30 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            30 dias
          </button>
          <button
            onClick={() => setPeriodo(90)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              periodo === 90 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            90 dias
          </button>
        </div>
      </div>

      {analytics.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-900 mb-2">Nenhum dado ainda</h4>
          <p className="text-gray-600">
            Compartilhe seu orçamento para começar a coletar dados de analytics.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-blue-700">Visualizações</p>
                <Eye className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-900">{metrics.totalVisualizacoes}</p>
              <p className="text-xs text-blue-600 mt-1">Total de acessos</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-green-700">Taxa de Conversão</p>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-900">{metrics.taxaConversao.toFixed(1)}%</p>
              <p className="text-xs text-green-600 mt-1">{metrics.totalConversoes} conversões</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-orange-700">Tempo Médio</p>
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-3xl font-bold text-orange-900">
                {Math.floor(metrics.tempoMedio / 60)}:{String(Math.floor(metrics.tempoMedio % 60)).padStart(2, '0')}
              </p>
              <p className="text-xs text-orange-600 mt-1">Minutos na página</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-purple-700">Engajamento</p>
                <MousePointerClick className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-purple-900">{metrics.interacoesMedias.toFixed(0)}</p>
              <p className="text-xs text-purple-600 mt-1">Interações médias</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Funil de Conversão
              </h4>
              <div className="space-y-3">
                {funnel.map((stage, index) => {
                  const dropoff =
                    index > 0 ? ((funnel[index - 1].total - stage.total) / funnel[index - 1].total) * 100 : 0;

                  return (
                    <div key={stage.nome}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{stage.nome}</span>
                        <span className="text-sm text-gray-600">
                          {stage.total} ({stage.percentual.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 relative overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all"
                          style={{ width: `${stage.percentual}%` }}
                        />
                      </div>
                      {index > 0 && dropoff > 0 && (
                        <p className="text-xs text-red-600 mt-1">⚠ {dropoff.toFixed(0)}% de abandono nesta etapa</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="lg:col-span-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900">O que é uma Conversão?</h4>
                  <p className="text-sm text-blue-800 mt-1">Uma "Conversão" é registrada sempre que um cliente clica no botão "Enviar via WhatsApp" na tela de resumo do orçamento. Isso representa a intenção real de iniciar o contato, fornecendo a métrica mais precisa do sucesso do seu template.</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-indigo-600" />
                Produtos Mais Populares
              </h4>
              {popularProducts.length > 0 ? (
                <div className="space-y-3">
                  {popularProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800 truncate" title={product.nome}>
                        {index + 1}. {product.nome}
                      </span>
                      <span className="text-sm font-bold text-indigo-700 bg-indigo-100 px-2 py-1 rounded-md">
                        {product.quantidade}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">Nenhum produto selecionado no período.</p>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Dispositivos</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Smartphone className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Mobile</p>
                      <p className="text-xs text-gray-500">
                        {analytics.length > 0 ? ((deviceStats.mobile / analytics.length) * 100).toFixed(0) : 0}% do
                        total
                      </p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{deviceStats.mobile}</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <Monitor className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Desktop</p>
                      <p className="text-xs text-gray-500">
                        {analytics.length > 0 ? ((deviceStats.desktop / analytics.length) * 100).toFixed(0) : 0}% do
                        total
                      </p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{deviceStats.desktop}</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <Tablet className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Tablet</p>
                      <p className="text-xs text-gray-500">
                        {analytics.length > 0 ? ((deviceStats.tablet / analytics.length) * 100).toFixed(0) : 0}% do
                        total
                      </p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{deviceStats.tablet}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-lg border border-yellow-200">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-600" />
              Insights e Recomendações
            </h4>
            <div className="space-y-3">
              {insights.map((insight, index) => {
                const Icon = insight.icon;
                const colors = {
                  success: 'bg-green-50 border-green-200 text-green-900',
                  warning: 'bg-orange-50 border-orange-200 text-orange-900',
                  error: 'bg-red-50 border-red-200 text-red-900',
                  info: 'bg-blue-50 border-blue-200 text-blue-900',
                };
                const iconColors = {
                  success: 'text-green-600',
                  warning: 'text-orange-600',
                  error: 'text-red-600',
                  info: 'text-blue-600',
                };

                return (
                  <div key={index} className={`p-4 rounded-lg border ${colors[insight.tipo]}`}>
                    <div className="flex items-start gap-3">
                      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColors[insight.tipo]}`} />
                      <div className="flex-1">
                        <p className="font-semibold mb-1">{insight.titulo}</p>
                        <p className="text-sm mb-2">{insight.descricao}</p>
                        <p className="text-sm font-medium">💡 Sugestão: {insight.sugestao}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
