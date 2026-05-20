export interface VideoTutorial {
  id: string;
  title: string;
  description: string;
  youtubeUrl: string;
  youtubeId: string;
  category: 'template' | 'agenda' | 'leads' | 'financeiro' | 'contratos' | 'avaliacoes';
  tab?: 'produtos' | 'pagamentos' | 'cupons' | 'campos' | 'whatsapp' | 'precos' | 'aparencia' | 'analytics' | 'config' | 'agenda' | 'leads';
  order: number;
  duration?: string;
}

export const VIDEO_TUTORIALS: VideoTutorial[] = [
  {
    id: 'intro-priceus',
    title: 'Apresentação do Priceus',
    description: 'Conheça o Priceus e entenda como ele pode transformar a forma como você envia orçamentos para seus clientes.',
    youtubeUrl: 'https://youtu.be/5epUNCZcf3o',
    youtubeId: '5epUNCZcf3o',
    category: 'template',
    order: 1
  },
  {
    id: 'criar-template',
    title: 'Criando um Novo Template',
    description: 'Aprenda a criar seu primeiro template de orçamento do zero, configurando todas as informações básicas.',
    youtubeUrl: 'https://youtu.be/5zSkIkKTzHc',
    youtubeId: '5zSkIkKTzHc',
    category: 'template',
    order: 2
  },
  {
    id: 'produtos-servicos',
    title: 'Configurando Produtos e Serviços',
    description: 'Descubra como adicionar, editar e organizar os produtos e serviços que você oferece no seu orçamento.',
    youtubeUrl: 'https://youtu.be/Qbxf9s3EdfQ',
    youtubeId: 'Qbxf9s3EdfQ',
    category: 'template',
    tab: 'produtos',
    order: 3
  },
  {
    id: 'formas-pagamento',
    title: 'Configurando Formas de Pagamento',
    description: 'Configure as opções de pagamento disponíveis: entrada, parcelamento, acréscimos e descontos.',
    youtubeUrl: 'https://youtu.be/QPHyAmGQygs',
    youtubeId: 'QPHyAmGQygs',
    category: 'template',
    tab: 'pagamentos',
    order: 4
  },
  {
    id: 'cupons-desconto',
    title: 'Configurando Cupons de Desconto',
    description: 'Crie cupons promocionais para oferecer descontos especiais e atrair mais clientes.',
    youtubeUrl: 'https://youtu.be/8R9EDzAWBZM',
    youtubeId: '8R9EDzAWBZM',
    category: 'template',
    tab: 'cupons',
    order: 5
  },
  {
    id: 'campos-personalizados',
    title: 'Configurando Campos Extras Personalizados',
    description: 'Adicione campos customizados ao formulário para coletar informações específicas dos seus clientes.',
    youtubeUrl: 'https://youtu.be/xZ5KqnXAhkI',
    youtubeId: 'xZ5KqnXAhkI',
    category: 'template',
    tab: 'campos',
    order: 6
  },
  {
    id: 'mensagem-whatsapp',
    title: 'Configurando Mensagem do WhatsApp',
    description: 'Personalize a mensagem que seus clientes enviarão pelo WhatsApp com todas as informações do orçamento.',
    youtubeUrl: 'https://youtu.be/sV3f_7GBowU',
    youtubeId: 'sV3f_7GBowU',
    category: 'template',
    tab: 'whatsapp',
    order: 7
  },
  {
    id: 'precos-localidade',
    title: 'Configurando Preços por Localidade',
    description: 'Configure preços diferenciados baseados na localização geográfica do seu cliente.',
    youtubeUrl: 'https://youtu.be/15LK-PtkShs',
    youtubeId: '15LK-PtkShs',
    category: 'template',
    tab: 'precos',
    order: 8
  },
  {
    id: 'precos-sazonais',
    title: 'Configurando Preços Sazonais',
    description: 'Defina variações de preço para alta e baixa temporada, otimizando sua rentabilidade.',
    youtubeUrl: 'https://youtu.be/Lb7ktSRe2zs',
    youtubeId: 'Lb7ktSRe2zs',
    category: 'template',
    tab: 'precos',
    order: 9
  },
  {
    id: 'aparencia-template',
    title: 'Personalizando a Aparência do Orçamento',
    description: 'Aprenda a mudar cores, logotipos, fontes e estilo visual para que a página de orçamento tenha a identidade visual da sua marca.',
    youtubeUrl: 'https://youtu.be/placeholder-aparencia',
    youtubeId: 'placeholder-aparencia',
    category: 'template',
    tab: 'aparencia',
    order: 10
  },
  {
    id: 'analytics-template',
    title: 'Configurando Rastreamento e Analytics',
    description: 'Configure o Google Analytics, Facebook Pixel e outras tags de rastreamento para mensurar os acessos e conversões na sua página de orçamento.',
    youtubeUrl: 'https://youtu.be/placeholder-analytics',
    youtubeId: 'placeholder-analytics',
    category: 'template',
    tab: 'analytics',
    order: 11
  },
  {
    id: 'configuracoes-finais',
    title: 'Configurações Finais',
    description: 'Aprenda sobre personalização do template, bloqueio de campos obrigatórios e ocultação de valores intermediários.',
    youtubeUrl: 'https://youtu.be/seEPWxcO2tM',
    youtubeId: 'seEPWxcO2tM',
    category: 'template',
    tab: 'config',
    order: 12
  },
  {
    id: 'configurar-agenda',
    title: 'Configurando a Agenda',
    description: 'Gerencie sua disponibilidade e permita que clientes escolham datas disponíveis no orçamento.',
    youtubeUrl: 'https://youtu.be/mhe_AXqh6xo',
    youtubeId: 'mhe_AXqh6xo',
    category: 'agenda',
    tab: 'agenda',
    order: 13
  },
  {
    id: 'painel-leads',
    title: 'Entendendo o Painel Leads',
    description: 'Aprenda a usar o painel de leads para acompanhar e gerenciar todos os orçamentos recebidos.',
    youtubeUrl: 'https://youtu.be/RpFUSFFpdZY',
    youtubeId: 'RpFUSFFpdZY',
    category: 'leads',
    tab: 'leads',
    order: 14
  },
  {
    id: 'financeiro-receitas',
    title: 'Gerenciando Receitas e Faturamento',
    description: 'Entenda como registrar vendas, receber pagamentos e controlar as entradas financeiras da sua empresa no painel financeiro.',
    youtubeUrl: 'https://youtu.be/placeholder-receitas',
    youtubeId: 'placeholder-receitas',
    category: 'financeiro',
    order: 15,
    duration: '4:15'
  },
  {
    id: 'financeiro-despesas',
    title: 'Registrando Despesas e Custos',
    description: 'Saiba como categorizar e lançar todas as despesas da sua empresa, mantendo seu fluxo de caixa sempre atualizado.',
    youtubeUrl: 'https://youtu.be/placeholder-despesas',
    youtubeId: 'placeholder-despesas',
    category: 'financeiro',
    order: 16,
    duration: '3:50'
  },
  {
    id: 'financeiro-insights',
    title: 'Análise de Saúde Financeira e Insights',
    description: 'Aprenda a ler os gráficos de faturamento, exportar relatórios e usar os insights automatizados do sistema para expandir seu negócio.',
    youtubeUrl: 'https://youtu.be/placeholder-insights',
    youtubeId: 'placeholder-insights',
    category: 'financeiro',
    order: 17,
    duration: '5:10'
  },
  {
    id: 'contratos-modelos',
    title: 'Criando e Editando Modelos de Contratos',
    description: 'Descubra como estruturar seus contratos e utilizar as variáveis automáticas do sistema para preenchimento dinâmico de dados do cliente.',
    youtubeUrl: 'https://youtu.be/placeholder-modelos',
    youtubeId: 'placeholder-modelos',
    category: 'contratos',
    order: 18,
    duration: '6:30'
  },
  {
    id: 'contratos-assinatura',
    title: 'Fluxo de Assinatura Digital',
    description: 'Veja como o seu cliente assina o contrato de forma digital e como o sistema valida, arquiva e notifica ambas as partes.',
    youtubeUrl: 'https://youtu.be/placeholder-assinatura',
    youtubeId: 'placeholder-assinatura',
    category: 'contratos',
    order: 19,
    duration: '4:45'
  },
  {
    id: 'avaliacoes-gestao',
    title: 'Coleta Automática de Avaliações',
    description: 'Saiba como enviar solicitações de avaliações após o fechamento de um contrato e como exibi-las para conquistar novos clientes.',
    youtubeUrl: 'https://youtu.be/placeholder-avaliacoes',
    youtubeId: 'placeholder-avaliacoes',
    category: 'avaliacoes',
    order: 20,
    duration: '3:20'
  }
];

export const getVideoByTab = (tab: string): VideoTutorial | undefined => {
  return VIDEO_TUTORIALS.find(video => video.tab === tab);
};

export const getVideosByCategory = (category: 'template' | 'agenda' | 'leads' | 'financeiro' | 'contratos' | 'avaliacoes'): VideoTutorial[] => {
  return VIDEO_TUTORIALS.filter(video => video.category === category);
};

export const getVideoById = (id: string): VideoTutorial | undefined => {
  return VIDEO_TUTORIALS.find(video => video.id === id);
};
