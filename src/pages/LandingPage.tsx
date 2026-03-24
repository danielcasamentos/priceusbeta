import { useState } from 'react';
import {
  Check, Zap, Clock, Shield, Users, ArrowRight, Menu, X,
  FileText, Calendar, Star, MessageSquare, MapPin,
  Image, Sparkles, BarChart3, Globe, Smartphone
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppInstallBanner } from '../components/AppInstallBanner';

export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const mainFeatures = [
    {
      icon: FileText,
      title: 'Contratos Digitais',
      description: 'Crie contratos profissionais com assinatura eletrônica bilateral. Validade jurídica completa.',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Calendar,
      title: 'Agenda Inteligente',
      description: 'Sincronize com Google Calendar, bloqueie datas automaticamente e gerencie seus compromissos.',
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      icon: Star,
      title: 'Sistema de Avaliações',
      description: 'Colete reviews de clientes e exiba avaliações públicas em seu perfil. Aumente sua credibilidade.',
      gradient: 'from-yellow-500 to-orange-500',
    },
    {
      icon: MessageSquare,
      title: 'Chat de Suporte ao Vivo',
      description: 'Atendimento integrado com chat ao vivo. Tire dúvidas e receba suporte em tempo real.',
      gradient: 'from-purple-500 to-pink-500',
    },
  ];

  const benefits = [
    {
      icon: Zap,
      title: 'Orçamentos Instantâneos',
      description: 'Crie orçamentos profissionais em segundos com cálculos automáticos e precisos.',
    },
    {
      icon: FileText,
      title: 'Contratos Profissionais',
      description: 'Gere contratos com validade jurídica e assinatura eletrônica bilateral integrada.',
    },
    {
      icon: Calendar,
      title: 'Gestão de Agenda',
      description: 'Sincronize com Google Calendar e bloqueie datas automaticamente após confirmação.',
    },
    {
      icon: Star,
      title: 'Reputação Online',
      description: 'Sistema completo de avaliações e reviews públicos para aumentar sua credibilidade.',
    },
    {
      icon: MessageSquare,
      title: 'WhatsApp Personalizado',
      description: 'Templates customizáveis com 13 variáveis dinâmicas para mensagens automáticas.',
    },
    {
      icon: MapPin,
      title: 'Preços Geográficos',
      description: 'Configure preços por cidade, estado e temporada. Taxas de deslocamento automáticas.',
    },
    {
      icon: Image,
      title: 'Portfólio Visual',
      description: 'Faça upload de imagens dos seus serviços e exiba portfólio profissional.',
    },
    {
      icon: Users,
      title: 'Gestão de Leads',
      description: 'Capture e gerencie leads automaticamente com LGPD compliant.',
    },
    {
      icon: BarChart3,
      title: 'Analytics Poderoso',
      description: 'Acompanhe métricas, taxa de conversão e performance em tempo real.',
    },
    {
      icon: Clock,
      title: 'Economize Tempo',
      description: 'Automatize tarefas repetitivas e foque no que realmente importa: o seu negócio.',
    },
    {
      icon: Shield,
      title: 'Seguro e Confiável',
      description: 'Dados protegidos, backup automático e conformidade com LGPD.',
    },
    {
      icon: Sparkles,
      title: 'Automação Inteligente',
      description: 'Auto-save de leads, cálculos automáticos e sincronização em tempo real.',
    },
  ];

  const plan = {
    name: 'Professional',
    price: 'R$ 97',
    period: '/mês',
    description: 'Plataforma completa para gestão do seu negócio',
    features: [
      'Teste grátis por 30 dias',
      'Orçamentos ilimitados',
      'Contratos digitais com assinatura eletrônica',
      'Agenda sincronizada com Google Calendar',
      'Sistema de avaliações e reviews',
      'Templates WhatsApp personalizáveis',
      'Chat de suporte ao vivo integrado',
      'Preços sazonais e geográficos',
      'Upload de imagens e portfólio',
      'Gestão completa de leads',
      'Captura automática (LGPD compliant)',
      'Analytics e relatórios avançados',
      'Chat de suporte integrado',
      'Integração WhatsApp',
      'Cupons de desconto',
      'Templates personalizáveis',
      'Campos dinâmicos customizáveis',
      'Formas de pagamento flexíveis',
      'Autocompletar de cidades BR',
      'Atualizações gratuitas',
      'Suporte prioritário',
      'Cancele quando quiser',
    ],
    priceId: 'price_professional',
  };

  const allFeatures = [
    'Orçamentos profissionais ilimitados',
    'Contratos digitais com validade jurídica',
    'Assinatura eletrônica bilateral',
    'Agenda sincronizada com Google Calendar',
    'Sistema de avaliações públicas',
    'Chat de suporte ao vivo',
    'Templates WhatsApp com variáveis',
    'Preços sazonais automáticos',
    'Preços geográficos por região',
    'Upload de imagens em produtos',
    'Portfólio visual integrado',
    'Captura automática de leads',
    'Dashboard administrativo completo',
    'Analytics e métricas em tempo real',
    'Integração WhatsApp',
    'Chat de suporte ao vivo',
    'Sistema de cupons',
    'Formas de pagamento customizadas',
    'Campos extras dinâmicos',
    'Autocompletar de cidades',
    'Parcelamento inteligente',
    'Cálculos automáticos de valores',
    'Responsivo para todos os dispositivos',
    'LGPD compliant',
  ];

  const useCases = [
    {
      step: '1',
      title: 'Orçamento',
      description: 'Cliente recebe link, preenche dados e seleciona serviços. Sistema captura lead automaticamente.',
      icon: Zap,
    },
    {
      step: '2',
      title: 'Contrato',
      description: 'Após aceite, gera contrato profissional com assinatura eletrônica de ambas as partes.',
      icon: FileText,
    },
    {
      step: '3',
      title: 'Agenda',
      description: 'Data do evento é bloqueada automaticamente no calendário sincronizado.',
      icon: Calendar,
    },
    {
      step: '4',
      title: 'Avaliação',
      description: 'Após o evento, cliente recebe solicitação de avaliação que aparece em perfil público.',
      icon: Star,
    },
  ];

  const differentiators = [
    {
      title: 'Plataforma All-in-One',
      description: 'Do orçamento à avaliação, tudo integrado em um único sistema.',
    },
    {
      title: 'Automação Total',
      description: 'Economize horas com processos automáticos e inteligentes.',
    },
    {
      title: 'Validade Jurídica',
      description: 'Contratos com assinatura eletrônica reconhecida por lei.',
    },
    {
      title: 'Suporte Dedicado',
      description: 'Chat ao vivo integrado para tirar dúvidas e resolver problemas rapidamente.',
    },
    {
      title: 'Preços Inteligentes',
      description: 'Sistema único de preços sazonais e geográficos automáticos.',
    },
    {
      title: 'LGPD Compliant',
      description: 'Totalmente adequado à Lei Geral de Proteção de Dados.',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header/Navbar */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-sm shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img
                src="/Logo Price Us.png"
                alt="Price Us"
                className="h-12 w-auto"
              />
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <a href="#funcionalidades" className="text-gray-700 hover:text-green-600 transition">
                Funcionalidades
              </a>
              <a href="#beneficios" className="text-gray-700 hover:text-green-600 transition">
                Benefícios
              </a>
              <a href="#planos" className="text-gray-700 hover:text-green-600 transition">
                Planos
              </a>
              <a href="#como-funciona" className="text-gray-700 hover:text-green-600 transition">
                Como Funciona
              </a>
              <button
                onClick={() => navigate('/login')}
                className="text-green-600 hover:text-green-700 font-medium transition"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/login')}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition font-medium"
              >
                Começar Agora
              </button>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-gray-700"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t">
            <div className="px-4 pt-2 pb-4 space-y-2">
              <a
                href="#funcionalidades"
                className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded"
                onClick={() => setMobileMenuOpen(false)}
              >
                Funcionalidades
              </a>
              <a
                href="#beneficios"
                className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded"
                onClick={() => setMobileMenuOpen(false)}
              >
                Benefícios
              </a>
              <a
                href="#planos"
                className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded"
                onClick={() => setMobileMenuOpen(false)}
              >
                Planos
              </a>
              <a
                href="#como-funciona"
                className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded"
                onClick={() => setMobileMenuOpen(false)}
              >
                Como Funciona
              </a>
              <button
                onClick={() => navigate('/login')}
                className="w-full text-left px-3 py-2 text-green-600 hover:bg-gray-50 rounded font-medium"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition font-medium"
              >
                Começar Agora
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-br from-green-50 via-blue-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sparkles size={16} />
              <span>Plataforma All-in-One Completa</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Da cotação à avaliação:{' '}
              <span className="text-green-600">gerencie tudo em um só lugar</span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed">
              Orçamentos inteligentes, contratos digitais, agenda sincronizada,
              sistema de avaliações e muito mais. A plataforma completa para empreendedores e prestadores de serviço.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={() => navigate('/login')}
                className="bg-green-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-green-700 transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
              >
                Começar Gratuitamente
                <ArrowRight size={20} />
              </button>
              <a
                href="#funcionalidades"
                className="border-2 border-green-600 text-green-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-green-50 transition"
              >
                Ver Funcionalidades
              </a>
            </div>

            <p className="text-gray-500 mt-6 text-sm">
              ✓ 30 dias grátis • Sem cartão • Contratos digitais • Agenda inteligente
            </p>
          </div>

          <div className="mt-16 max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
              <div className="aspect-video bg-gradient-to-br from-green-100 via-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <img
                    src="/Logo Price Us.png"
                    alt="Price Us"
                    className="w-64 h-auto mx-auto mb-4"
                  />
                  <p className="text-gray-600 text-lg font-medium">
                    Plataforma Completa de Gestão
                  </p>
                  <p className="text-gray-500 text-sm mt-2">
                    Orçamentos • Contratos • Agenda • Avaliações
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-8">
              <AppInstallBanner />
            </div>
          </div>
        </div>
      </section>

      {/* Main Features Section */}
      <section id="funcionalidades" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Funcionalidades que transformam seu negócio
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Recursos premium desenvolvidos especialmente para profissionais que querem crescer
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {mainFeatures.map((feature, index) => (
              <div
                key={index}
                className="relative p-8 rounded-2xl border-2 border-gray-200 hover:border-transparent hover:shadow-2xl transition-all duration-300 group overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

                <div className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center mb-6 shadow-lg`}>
                  <feature.icon className="text-white" size={32} />
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>

                <p className="text-gray-600 leading-relaxed text-lg">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="beneficios" className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Tudo que você precisa em um só lugar
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Mais de 20 funcionalidades poderosas integradas para você vender mais e trabalhar menos
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="bg-white p-6 rounded-xl border border-gray-200 hover:border-green-500 hover:shadow-lg transition group"
              >
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-600 transition">
                  <benefit.icon className="text-green-600 group-hover:text-white transition" size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {benefit.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="como-funciona" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Como funciona o fluxo completo
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Do primeiro contato até a avaliação final, automatize todo o processo
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {useCases.map((useCase, index) => (
              <div key={index} className="relative">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <useCase.icon className="text-white" size={28} />
                  </div>
                  <div className="absolute top-8 left-1/2 w-full h-0.5 bg-green-200 -z-10 hidden md:block"
                       style={{ display: index === 3 ? 'none' : 'block' }} />

                  <div className="bg-green-600 text-white w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-3 text-sm font-bold">
                    {useCase.step}
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {useCase.title}
                  </h3>

                  <p className="text-gray-600 text-sm leading-relaxed">
                    {useCase.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Differentiators Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Por que o Price Us é diferente
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              A única plataforma que integra todas as etapas do seu negócio
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {differentiators.map((diff, index) => (
              <div
                key={index}
                className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center mb-4">
                  <Check className="text-white" size={24} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {diff.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {diff.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="planos" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Um plano, todas as funcionalidades
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Acesso completo a todos os recursos. Teste grátis por 30 dias, depois apenas R$ 97/mês
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="relative bg-white rounded-2xl shadow-2xl p-8 border-2 border-green-600">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-green-600 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-lg">
                  Plataforma Completa All-in-One
                </span>
              </div>

              <div className="text-center mb-8 mt-4">
                <h3 className="text-3xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <p className="text-gray-600 mb-6">{plan.description}</p>
                <div className="flex items-end justify-center gap-2 mb-2">
                  <span className="text-6xl font-bold text-green-600">
                    {plan.price}
                  </span>
                  <span className="text-2xl text-gray-600 mb-3">{plan.period}</span>
                </div>
                <p className="text-sm text-green-600 font-medium">
                  30 dias grátis para testar todas as funcionalidades
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-x-8 gap-y-3 mb-8">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <Check className="text-green-600 flex-shrink-0 mt-0.5" size={18} />
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate('/login')}
                className="w-full py-4 rounded-lg font-semibold text-lg bg-green-600 text-white hover:bg-green-700 transition shadow-lg hover:shadow-xl"
              >
                Começar Teste Grátis de 30 Dias
              </button>

              <p className="text-center text-sm text-gray-500 mt-4">
                Sem cartão de crédito necessário • Cancele quando quiser • Suporte em português
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-4 text-lg">
              Pagamento 100% seguro via Stripe
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
              <span className="flex items-center gap-2">
                <Shield size={16} className="text-green-600" />
                Sem taxas ocultas
              </span>
              <span className="flex items-center gap-2">
                <Check size={16} className="text-green-600" />
                Cancele a qualquer momento
              </span>
              <span className="flex items-center gap-2">
                <Globe size={16} className="text-green-600" />
                Suporte em português
              </span>
              <span className="flex items-center gap-2">
                <Smartphone size={16} className="text-green-600" />
                Funciona em todos os dispositivos
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* All Features List Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Mais de 24 recursos poderosos
              </h2>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Uma plataforma completa para gerenciar todo o ciclo de vendas,
                desde a captura do lead até a coleta de avaliações.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Check className="text-green-600" size={18} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Economize 15+ horas por semana</h4>
                    <p className="text-gray-600 text-sm">Automatize processos manuais e foque no que importa</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Check className="text-green-600" size={18} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Aumente conversões em 40%</h4>
                    <p className="text-gray-600 text-sm">Propostas profissionais convertem mais clientes</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Check className="text-green-600" size={18} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Organize 100% do seu negócio</h4>
                    <p className="text-gray-600 text-sm">Tudo integrado em uma única plataforma</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate('/login')}
                className="bg-green-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-green-700 transition shadow-lg hover:shadow-xl"
              >
                Experimentar Grátis por 30 Dias
              </button>
            </div>

            <div>
              <div className="grid grid-cols-2 gap-3">
                {allFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start gap-2 bg-white p-3 rounded-lg border border-gray-200">
                    <Check className="text-green-600 flex-shrink-0 mt-0.5" size={16} />
                    <span className="text-gray-700 text-sm leading-tight">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-green-600 to-green-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Pronto para transformar seu negócio?
          </h2>
          <p className="text-xl text-green-50 mb-8 leading-relaxed">
            Junte-se a milhares de profissionais que já automatizaram seus processos e aumentaram suas vendas
          </p>
          <button
            onClick={() => navigate('/login')}
            className="bg-white text-green-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition shadow-xl inline-flex items-center gap-2"
          >
            Começar Agora - 30 Dias Grátis
            <ArrowRight size={20} />
          </button>
          <p className="text-green-50 mt-6">
            ✓ Sem cartão de crédito • Acesso completo • Suporte incluído
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <img
                src="/Logo Price Us.png"
                alt="Price Us"
                className="h-12 w-auto mb-4 brightness-0 invert"
              />
              <p className="text-sm text-gray-400">
                Plataforma completa all-in-one para profissionais: orçamentos, contratos, agenda e avaliações.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Produto</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#funcionalidades" className="hover:text-green-400 transition">Funcionalidades</a></li>
                <li><a href="#beneficios" className="hover:text-green-400 transition">Benefícios</a></li>
                <li><a href="#planos" className="hover:text-green-400 transition">Planos</a></li>
                <li><a href="#como-funciona" className="hover:text-green-400 transition">Como Funciona</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Recursos</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-green-400 transition">Contratos Digitais</a></li>
                <li><a href="#" className="hover:text-green-400 transition">Agenda Inteligente</a></li>
                <li><a href="#" className="hover:text-green-400 transition">Sistema de Avaliações</a></li>
                <li><a href="#" className="hover:text-green-400 transition">Chat de Suporte</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Suporte</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-green-400 transition">Central de Ajuda</a></li>
                <li><a href="#" className="hover:text-green-400 transition">Chat ao Vivo</a></li>
                <li><a href="#" className="hover:text-green-400 transition">Contato</a></li>
                <li><a href="#" className="hover:text-green-400 transition">Status do Sistema</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-gray-400">
                © 2025 Price Us. Todos os direitos reservados.
              </p>
              <div className="flex gap-6 text-sm">
                <a href="#" className="text-gray-400 hover:text-green-400 transition">Privacidade</a>
                <a href="#" className="text-gray-400 hover:text-green-400 transition">Termos de Uso</a>
                <a href="#" className="text-gray-400 hover:text-green-400 transition">Cookies</a>
                <a href="#" className="text-gray-400 hover:text-green-400 transition">LGPD</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
