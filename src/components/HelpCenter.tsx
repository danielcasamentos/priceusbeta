import { useState, useMemo } from 'react';
import { X, Search, ChevronDown, ChevronUp, MessageCircle, BookOpen, ShoppingCart, CreditCard, MessageSquare, Settings, Shield, AlertCircle, Play, Building2, Calendar, FileSignature, Star, Palette } from 'lucide-react';
import { VIDEO_TUTORIALS, VideoTutorial } from '../config/videoTutorials';
import { YouTubeEmbed } from './YouTubeEmbed';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
  videoId?: string;
}

interface HelpCenterProps {
  onClose: () => void;
}

const FAQ_DATA: FAQItem[] = [
  // PRIMEIROS PASSOS
  {
    category: 'Primeiros Passos',
    question: 'Como começar a usar o sistema?',
    answer: 'Clique em "Tutorial Guiado" no dashboard e siga os 6 passos: criar template, adicionar produtos, configurar pagamentos, campos extras, mensagem WhatsApp e compartilhar link.'
  },
  {
    category: 'Primeiros Passos',
    question: 'O que é um "Template de Orçamento"?',
    answer: 'É um modelo reutilizável com seus produtos, preços e formas de pagamento. Você cria 1 vez e usa infinitas vezes. Exemplo: "Casamento Premium", "Ensaio Infantil".'
  },
  {
    category: 'Primeiros Passos',
    question: 'Como compartilhar meu orçamento?',
    answer: 'Copie o link do template no dashboard e envie para o cliente por WhatsApp, email ou SMS. O cliente acessa, escolhe produtos e envia o pedido.'
  },
  {
    category: 'Primeiros Passos',
    question: 'Posso ter vários tipos de orçamentos?',
    answer: 'Sim! Crie templates diferentes para cada tipo de evento. Ex: Casamento, Formatura, Aniversário, Corporativo.'
  },

  // PRODUTOS
  {
    category: 'Produtos',
    question: 'Como adicionar produtos no orçamento?',
    answer: 'Vá na aba "Produtos" → botão "Adicionar Produto". Preencha nome, descrição, preço e unidade (hora/unidade). Marque se é obrigatório.',
    videoId: 'produtos-servicos'
  },
  {
    category: 'Produtos',
    question: 'Como adicionar foto nos produtos?',
    answer: 'Clique em "Adicionar Imagem" no produto. Arraste a imagem ou clique para selecionar. Aceita JPG, PNG, WebP até 5MB. A imagem é comprimida automaticamente.',
    videoId: 'produtos-servicos'
  },
  {
    category: 'Produtos',
    question: 'Por que minha imagem não aparece?',
    answer: 'Aguarde o upload completar (barra de progresso verde). Tamanho máximo: 5MB. Formatos aceitos: JPG, PNG, WebP, GIF. Se o erro persistir, tente uma imagem menor.'
  },
  {
    category: 'Produtos',
    question: 'Como remover ou trocar imagem de um produto?',
    answer: 'Clique no ícone de lixeira sobre a imagem e confirme a remoção. Depois adicione a nova imagem normalmente.'
  },
  {
    category: 'Produtos',
    question: 'O que é "produto obrigatório"?',
    answer: 'Cliente não pode desmarcar. Sempre incluído no orçamento. Use para itens essenciais como taxa de deslocamento.'
  },
  {
    category: 'Produtos',
    question: 'Como reordenar produtos?',
    answer: 'Use os campos "Ordem" com números. Produtos com ordem menor aparecem primeiro. Dica: use 10, 20, 30... facilita inserir no meio depois.'
  },

  // PREÇOS E PAGAMENTOS
  {
    category: 'Preços e Pagamentos',
    question: 'Como configurar formas de pagamento?',
    answer: 'Aba "Formas de Pagamento" → defina entrada (% ou valor fixo), parcelas e juros. Exemplo: 50% entrada, até 12x com 5% de acréscimo.',
    videoId: 'formas-pagamento'
  },
  {
    category: 'Preços e Pagamentos',
    question: 'O que é "entrada percentual vs valor fixo"?',
    answer: 'Percentual: 30% do total (muda conforme orçamento). Valor Fixo: R$ 500 sempre (não muda).'
  },
  {
    category: 'Preços e Pagamentos',
    question: 'Como aplicar desconto em orçamentos?',
    answer: 'Aba "Cupons de Desconto" → crie código único (ex: PROMO10). Escolha desconto % ou valor fixo. Defina validade e limite de usos.',
    videoId: 'cupons-desconto'
  },
  {
    category: 'Preços e Pagamentos',
    question: 'Como funciona preço sazonal (alta temporada)?',
    answer: 'Aba "Preços Dinâmicos" → Sistema Sazonal. Crie temporadas (ex: Dezembro +20%, Janeiro +15%). Cliente escolhe data e o preço ajusta automaticamente.'
  },
  {
    category: 'Preços e Pagamentos',
    question: 'Como cobrar diferente por cidade/região?',
    answer: 'Aba "Preços Dinâmicos" → Sistema Geográfico. Configure países, estados e cidades. Defina ajuste % e taxa deslocamento. Cliente escolhe local e o preço ajusta.'
  },
  {
    category: 'Preços e Pagamentos',
    question: 'Posso usar preço sazonal E geográfico juntos?',
    answer: 'Sim! Os ajustes são somados. Ex: +15% temporada + 10% cidade = +25% total.'
  },
  {
    category: 'Preços e Pagamentos',
    question: 'Como saber se cupom foi usado?',
    answer: 'Aba "Cupons" → coluna "Usos". Veja quantas vezes foi aplicado. Ative/desative cupons em tempo real.'
  },

  // WHATSAPP E LEADS
  {
    category: 'WhatsApp e Leads',
    question: 'Como o cliente me envia o pedido?',
    answer: 'Cliente preenche formulário no orçamento, clica "Enviar Pedido via WhatsApp". Abre WhatsApp dele com mensagem pronta contendo todos detalhes.'
  },
  {
    category: 'WhatsApp e Leads',
    question: 'Posso personalizar a mensagem do WhatsApp?',
    answer: 'Sim! Aba "Mensagem WhatsApp" → edite o texto do template. Use variáveis: {nome_cliente}, {total}, {produtos}. O preview mostra como ficará.',
    videoId: 'mensagem-whatsapp'
  },
  {
    category: 'WhatsApp e Leads',
    question: 'Onde vejo os clientes que pediram orçamento?',
    answer: 'Dashboard → Aba "Leads". Lista todos pedidos recebidos. Filtre por: Novo, Contatado, Convertido, Perdido.',
    videoId: 'painel-leads'
  },
  {
    category: 'WhatsApp e Leads',
    question: 'Como responder um lead?',
    answer: 'Clique no lead para ver detalhes. Botão "Responder no WhatsApp" abre conversa com mensagem já preenchida com resumo do pedido.'
  },
  {
    category: 'WhatsApp e Leads',
    question: 'Lead "Abandonado" - o que significa?',
    answer: 'Cliente preencheu mas não enviou WhatsApp. Sistema captura dados mesmo sem envio. Entre em contato proativamente!'
  },
  {
    category: 'WhatsApp e Leads',
    question: 'Como mudar status de um lead?',
    answer: 'Abra detalhes do lead → dropdown "Status" → escolha novo status. Organize seu funil de vendas.'
  },

  // CAMPOS PERSONALIZADOS
  {
    category: 'Campos Personalizados',
    question: 'O que são "Campos Extras"?',
    answer: 'Perguntas personalizadas no formulário. Ex: "Tipo de evento", "Horário", "Local". Você define quais campos quer coletar.'
  },
  {
    category: 'Campos Personalizados',
    question: 'Como adicionar campo personalizado?',
    answer: 'Aba "Campos do Formulário" → "Adicionar Campo". Escolha tipo: texto, número, data, seleção. Marque se é obrigatório.',
    videoId: 'campos-personalizados'
  },
  {
    category: 'Campos Personalizados',
    question: 'Tipos de campos disponíveis?',
    answer: 'Texto curto (nome, local), Texto longo (observações), Número (quantidade convidados), Data (data do evento), Seleção (opções pré-definidas).'
  },
  {
    category: 'Campos Personalizados',
    question: 'Cliente não consegue enviar - campo obrigatório?',
    answer: 'Verifique se todos campos obrigatórios estão preenchidos. Sistema bloqueia envio se faltar dados. Mensagem em vermelho indica o que falta.'
  },

  // CONFIGURAÇÕES
  {
    category: 'Configurações',
    question: 'Como editar meu perfil de fotógrafo?',
    answer: 'Dashboard → Aba "Perfil". Edite: nome, telefone, descrição. Esses dados aparecem no orçamento do cliente.'
  },
  {
    category: 'Configurações',
    question: 'Posso mudar URL do meu orçamento?',
    answer: 'Não, a URL é única e gerada automaticamente no formato /orcamento/[código-único] para evitar conflitos entre usuários.'
  },
  {
    category: 'Configurações',
    question: 'Como excluir um template?',
    answer: 'Dashboard → Aba "Meus Templates" → clique no ícone de lixeira. CUIDADO: ação não pode ser desfeita!'
  },
  {
    category: 'Configurações',
    question: 'Quantos templates posso criar?',
    answer: 'Ilimitado no plano atual. Crie quantos precisar para diferentes serviços.'
  },

  // SEGURANÇA
  {
    category: 'Segurança e LGPD',
    question: 'Meus dados estão seguros?',
    answer: 'Sim! Usamos criptografia SSL/TLS e banco de dados Supabase (segurança nível bancário). Senha criptografada com bcrypt.'
  },
  {
    category: 'Segurança e LGPD',
    question: 'O que é o aviso de cookies?',
    answer: 'Banner de consentimento LGPD. Cliente aceita coleta de dados básicos. Obrigatório por lei brasileira.'
  },
  {
    category: 'Segurança e LGPD',
    question: 'Como deletar dados de um cliente?',
    answer: 'Aba "Leads" → selecione lead → clique ícone lixeira → confirme. Dados removidos permanentemente (LGPD).'
  },

  // PROBLEMAS COMUNS
  {
    category: 'Problemas Comuns',
    question: 'Link do orçamento não funciona (404)?',
    answer: 'Verifique se copiou URL completo no formato: seu-site.com/orcamento/UUID. Template pode ter sido excluído.'
  },
  {
    category: 'Problemas Comuns',
    question: 'Cliente não vê produtos no orçamento?',
    answer: 'Verifique se adicionou produtos no template. Produtos precisam ter preço maior que zero. Salve alterações antes de compartilhar.'
  },
  {
    category: 'Problemas Comuns',
    question: 'Cálculo do orçamento está errado?',
    answer: 'Sistema soma: produtos + ajuste sazonal + ajuste geográfico - cupom. Acréscimo de parcelas é aplicado sobre valor final.'
  },
  {
    category: 'Problemas Comuns',
    question: 'Upload de imagem trava ou não sai de 0%?',
    answer: 'Verifique conexão internet. Tamanho máximo: 5MB. Feche e abra o editor do produto novamente.'
  },
  {
    category: 'Problemas Comuns',
    question: 'Não recebi o pedido do cliente no WhatsApp?',
    answer: 'Cliente precisa clicar "Enviar" no WhatsApp dele. Sistema não envia automático (apenas abre WhatsApp). Verifique aba "Leads" → pode estar como "Abandonado".'
  },

  // MÓDULO EMPRESA
  {
    category: 'Módulo Empresa',
    question: 'O que é o módulo "Empresa"?',
    answer: 'É o seu centro de controle financeiro. Ele permite que você gerencie todas as receitas e despesas do seu negócio, oferecendo uma visão clara da sua saúde financeira através de dashboards, relatórios e insights automáticos.'
  },
  {
    category: 'Módulo Empresa',
    question: 'Como adiciono uma nova venda ou despesa?',
    answer: 'Vá para a aba "Transações" dentro do módulo "Empresa". Lá, você encontrará os botões "Nova Receita" e "Nova Despesa". Preencha os detalhes como valor, data, categoria e forma de pagamento.'
  },
  {
    category: 'Módulo Empresa',
    question: 'O que são os "Insights"?',
    answer: 'A aba "Insights" analisa seus dados financeiros e gera recomendações automáticas. Ela pode te alertar sobre quedas na receita, parabenizar por um crescimento, apontar seu mês mais lucrativo e muito mais, ajudando você a tomar decisões mais inteligentes.'
  },

  // AGENDA
  {
    category: 'Agenda',
    question: 'Como funciona a Agenda?',
    answer: 'A Agenda permite que você visualize e gerencie todos os seus eventos e compromissos. Você pode adicionar novos eventos, bloquear datas específicas e ter uma visão clara da sua disponibilidade, evitando conflitos de agendamento.'
  },

  // CONTRATOS
  {
    category: 'Contratos',
    question: 'Como crio um modelo de contrato?',
    answer: 'Na seção "Contratos", você pode criar seus próprios modelos. Use as variáveis dinâmicas (ex: {{NOME_CLIENTE}}, {{VALOR_TOTAL}}) para que o sistema preencha os dados automaticamente ao gerar um contrato para um lead.'
  },

  // AVALIAÇÕES
  {
    category: 'Avaliações',
    question: 'Como peço uma avaliação para um cliente?',
    answer: 'Na sua "Gestão de Leads", após marcar um lead como "Convertido", você terá a opção de solicitar uma avaliação. O sistema gera um link único e uma mensagem de WhatsApp pronta para ser enviada ao seu cliente.'
  },

  // TEMAS E PERFIL
  {
    category: 'Temas e Perfil',
    question: 'Posso personalizar a aparência da minha página?',
    answer: 'Sim! Acesse "Meu Perfil" no menu. Lá, você encontrará o "Seletor de Tema", que permite escolher entre diferentes estilos visuais (claro, escuro, etc.) para a sua página pública de orçamentos, deixando-a com a cara da sua marca.'
  }
];

const CATEGORIES = [
  { id: 'all', name: 'Todas', icon: BookOpen },
  { id: 'Primeiros Passos', name: 'Primeiros Passos', icon: BookOpen },
  { id: 'Módulo Empresa', name: 'Módulo Empresa', icon: Building2 },
  { id: 'Agenda', name: 'Agenda', icon: Calendar },
  { id: 'Contratos', name: 'Contratos', icon: FileSignature },
  { id: 'Avaliações', name: 'Avaliações', icon: Star },
  { id: 'Temas e Perfil', name: 'Temas e Perfil', icon: Palette },
  { id: 'Produtos', name: 'Produtos', icon: ShoppingCart },
  { id: 'Preços e Pagamentos', name: 'Preços e Pagamentos', icon: CreditCard },
  { id: 'WhatsApp e Leads', name: 'WhatsApp e Leads', icon: MessageSquare },
  { id: 'Campos Personalizados', name: 'Campos Personalizados', icon: Settings },
  { id: 'Configurações', name: 'Configurações', icon: Settings },
  { id: 'Segurança e LGPD', name: 'Segurança e LGPD', icon: Shield },
  { id: 'Problemas Comuns', name: 'Problemas Comuns', icon: AlertCircle }
];

export function HelpCenter({ onClose }: HelpCenterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [selectedVideo, setSelectedVideo] = useState<VideoTutorial | null>(null);

  const filteredFAQ = useMemo(() => {
    let filtered = FAQ_DATA;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [searchQuery, selectedCategory]);

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Central de Ajuda</h2>
            <p className="text-sm text-gray-600 mt-1">Encontre respostas para suas dúvidas</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar dúvida... (ex: como adicionar produtos)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="px-6 py-4 border-b border-gray-200 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {CATEGORIES.map(category => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    selectedCategory === category.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {category.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* FAQ List */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredFAQ.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhuma dúvida encontrada com "{searchQuery}"</p>
              <p className="text-sm text-gray-500 mt-2">Tente buscar com outras palavras</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFAQ.map((item, index) => {
                const isExpanded = expandedItems.has(index);
                return (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg overflow-hidden hover:border-blue-300 transition-colors"
                  >
                    <button
                      onClick={() => toggleExpand(index)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                          {item.category}
                        </span>
                        <p className="font-medium text-gray-900 mt-1">{item.question}</p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 bg-gray-50 border-t border-gray-200 space-y-3">
                        <p className="text-gray-700 leading-relaxed">{item.answer}</p>
                        {item.videoId && (() => {
                          const video = VIDEO_TUTORIALS.find(v => v.id === item.videoId);
                          return video ? (
                            <button
                              onClick={() => setSelectedVideo(video)}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                            >
                              <Play className="w-4 h-4" />
                              Ver Tutorial em Vídeo
                            </button>
                          ) : null;
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with Chat */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Não encontrou sua dúvida?</p>
              <p className="text-xs text-gray-600 mt-1">Fale com nosso suporte em tempo real</p>
            </div>
            <button
              onClick={() => window.Tawk_API && typeof (window.Tawk_API as any).maximize === 'function' && (window.Tawk_API as any).maximize()}
              className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              <MessageCircle className="w-5 h-5" />
              Chat ao Vivo
            </button>
          </div>
        </div>
      </div>

      {/* Video Tutorial Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-xl font-bold text-gray-900">{selectedVideo.title}</h3>
              <button
                onClick={() => setSelectedVideo(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              <YouTubeEmbed
                videoId={selectedVideo.youtubeId}
                title={selectedVideo.title}
                showTitle={false}
                autoplay={true}
              />
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Sobre este tutorial:</h4>
                <p className="text-blue-800 text-sm leading-relaxed">{selectedVideo.description}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
