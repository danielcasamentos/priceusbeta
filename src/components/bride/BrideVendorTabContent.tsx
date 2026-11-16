import React, { useState, useEffect, useRef } from 'react';
import {
  Check,
  Star,
  Sparkles,
  Send,
  MessageCircle,
  FileCheck,
  MapPin,
  Tag,
  ShieldCheck,
  DollarSign,
  Heart,
  Bot,
  Calendar,
  CreditCard,
  Percent,
  Clock,
  ArrowRight,
  ChevronLeft,
  Phone
} from 'lucide-react';
import { VendorMarketplaceCard, BrideProfile } from '../../services/brideMarketplaceService';
import { RealtimeChatService, VendorOnlinePresence } from '../../services/realtimeChatService';

interface BrideVendorTabContentProps {
  vendor: VendorMarketplaceCard;
  brideProfile: BrideProfile;
  onUpdateQuoteTotal: (vendorId: string, total: number, packageName: string) => void;
  onOpenContractModal: (vendor: VendorMarketplaceCard, total: number) => void;
}

export interface QuoteCardData {
  title: string;
  packageName: string;
  items: string[];
  originalPrice?: number;
  finalPrice: number;
  discountBadge?: string;
  paymentTerms: string;
  applied?: boolean;
}

export interface ChatMessage {
  id?: string;
  sender: 'bride' | 'vendor' | 'ai';
  text: string;
  time: string;
  quoteCard?: QuoteCardData;
}

export function BrideVendorTabContent({
  vendor,
  brideProfile,
  onUpdateQuoteTotal,
  onOpenContractModal,
}: BrideVendorTabContentProps) {
  // Estado de seleção de pacote do fornecedor
  const defaultPackage = vendor.templates[0] || { id: 'padrao', name: 'Pacote Principal', starting_price: vendor.starting_price };
  const [selectedPackageId, setSelectedPackageId] = useState<string>(defaultPackage.id);
  const [selectedUpsells, setSelectedUpsells] = useState<string[]>([]);
  const [isFavorited, setIsFavorited] = useState(false);
  const [activeView, setActiveView] = useState<'proposal' | 'chat'>('proposal');

  // Status de presença online do profissional em tempo real
  const [vendorPresence, setVendorPresence] = useState<VendorOnlinePresence>(() => {
    return RealtimeChatService.getVendorOnlinePresence(vendor.user_id);
  });

  // Lista de upsells demonstrativos do fornecedor
  const upsellOptions = [
    { id: 'up1', name: 'Horas Extras de Cobertura', price: 400, desc: 'Mais 2 horas de festa sem pressa' },
    { id: 'up2', name: 'Álbum Panorâmico Luxo 30x30', price: 800, desc: 'Capa em linho nobre com estojo magnético' },
    { id: 'up3', name: 'Ensaio Pré-Wedding Externo', price: 600, desc: 'Sessão de fotos antes do casamento na praia ou serra' },
  ];

  const currentPackage = vendor.templates.find((t) => t.id === selectedPackageId) || defaultPackage;

  // Cálculo total da proposta ativa
  const packagePrice = currentPackage.starting_price || vendor.starting_price;
  const upsellsTotal = selectedUpsells.reduce((acc, upId) => {
    const item = upsellOptions.find((o) => o.id === upId);
    return acc + (item ? item.price : 0);
  }, 0);
  const totalCalculated = packagePrice + upsellsTotal;

  // Identificador da conversa conectada com o Dashboard do Fornecedor
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mensagens do chat do quotes integrado nesta aba (inicia limpo ou carrega histórico real)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTypingAi, setIsTypingAi] = useState(false);

  // Inicializa sessão no RealtimeChatService conectando esta aba ao Dashboard do Fornecedor
  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | null = null;

    async function initRealtimeChat() {
      try {
        const session = await RealtimeChatService.initQuoteConversation({
          vendorId: vendor.user_id,
          vendorName: vendor.business_name,
          clientName: brideProfile.nome_noiva,
          clientEmail: brideProfile.email,
          clientPhone: brideProfile.telefone,
          eventDate: brideProfile.data_casamento,
          eventCity: brideProfile.cidade,
          templateId: currentPackage.id,
          templateName: currentPackage.name,
          selectedPackageName: currentPackage.name,
          totalValue: totalCalculated,
        });

        if (!isMounted) return;
        setConversationId(session.conversationId);

        // Carrega histórico existente
        const history = await RealtimeChatService.fetchMessages(session.conversationId);
        if (isMounted && history && history.length > 0) {
          const formattedHistory: ChatMessage[] = history.map((m) => {
            let quoteCard: QuoteCardData | undefined = undefined;
            if (m.content.startsWith('PROPOSTA_CARD:')) {
              try {
                const parsed = JSON.parse(m.content.replace('PROPOSTA_CARD:', ''));
                quoteCard = {
                  title: 'Proposta Interativa',
                  packageName: parsed.packageName || currentPackage.name,
                  items: [
                    `Investimento Total: R$ ${(parsed.total || 0).toLocaleString('pt-BR')}`,
                    `Pagamento: ${parsed.paymentTerms || 'Facilitado'}`,
                    `Data do Evento: ${parsed.eventDate || 'A combinar'}`,
                  ],
                  finalPrice: parsed.total || totalCalculated,
                  paymentTerms: parsed.paymentTerms || '30% entrada + parcelado',
                };
              } catch (e) {}
            }

            return {
              id: m.id,
              sender: m.sender_type === 'bride' ? 'bride' : m.sender_type === 'vendor' ? 'vendor' : 'ai',
              text: m.content.startsWith('PROPOSTA_CARD:')
                ? '📋 [Proposta Interativa Enviada]'
                : m.content.startsWith('AUDIO_MSG:')
                ? '🎙️ [Mensagem de Áudio]'
                : m.content,
              time: new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              quoteCard,
            };
          });

          setChatMessages(formattedHistory);
        }

        // Assina mensagens em tempo real enviadas pelo Dashboard do Fornecedor ou IA
        unsubscribe = RealtimeChatService.subscribeToConversation(session.conversationId, (newMsg) => {
          if (!isMounted) return;

          let quoteCard: QuoteCardData | undefined = undefined;
          if (newMsg.content.startsWith('PROPOSTA_CARD:')) {
            try {
              const parsed = JSON.parse(newMsg.content.replace('PROPOSTA_CARD:', ''));
              quoteCard = {
                title: 'Proposta Interativa',
                packageName: parsed.packageName || currentPackage.name,
                items: [
                  `Investimento Total: R$ ${(parsed.total || 0).toLocaleString('pt-BR')}`,
                  `Pagamento: ${parsed.paymentTerms || 'Facilitado'}`,
                  `Data do Evento: ${parsed.eventDate || 'A combinar'}`,
                ],
                finalPrice: parsed.total || totalCalculated,
                paymentTerms: parsed.paymentTerms || '30% entrada + parcelado',
              };
            } catch (e) {}
          }

          const incoming: ChatMessage = {
            id: newMsg.id,
            sender: newMsg.sender_type === 'bride' ? 'bride' : newMsg.sender_type === 'vendor' ? 'vendor' : 'ai',
            text: newMsg.content.startsWith('PROPOSTA_CARD:')
              ? '📋 [Proposta Interativa Enviada]'
              : newMsg.content.startsWith('AUDIO_MSG:')
              ? '🎙️ [Mensagem de Áudio]'
              : newMsg.content,
            time: new Date(newMsg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            quoteCard,
          };

          setChatMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, incoming];
          });
        });
      } catch (err) {
        console.warn('[BrideVendorTabContent] Falha ao conectar chat em tempo real:', err);
      }
    }

    initRealtimeChat();

    // Assina atualizações em tempo real do status de presença online do profissional
    const unsubPresence = RealtimeChatService.subscribeToVendorPresence(vendor.user_id, (newPres) => {
      if (isMounted) setVendorPresence(newPres);
    });

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
      unsubPresence();
    };
  }, [vendor.user_id, brideProfile.id]);

  // Transição suave para o WhatsApp formatando o pacote e valores selecionados
  const handleOpenWhatsApp = () => {
    const waLink = RealtimeChatService.generateWhatsAppTransitionLink({
      vendorPhone: vendor.phone || '(11) 99999-9999',
      clientName: brideProfile.nome_noiva || 'Noiva',
      packageName: `${currentPackage.name}${selectedUpsells.length > 0 ? ` (+ ${selectedUpsells.length} adicionais)` : ''}`,
      totalValue: totalCalculated,
      lastTopic: 'Negociação de proposta personalizada no Portal PriceU$',
    });
    window.open(waLink, '_blank', 'noopener,noreferrer');
  };

  // Acompanhamento suave do scroll da conversa
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  const toggleUpsell = (upId: string) => {
    const nextUpsells = selectedUpsells.includes(upId)
      ? selectedUpsells.filter((id) => id !== upId)
      : [...selectedUpsells, upId];

    setSelectedUpsells(nextUpsells);
    const nextTotal = packagePrice + nextUpsells.reduce((acc, id) => {
      const item = upsellOptions.find((o) => o.id === id);
      return acc + (item ? item.price : 0);
    }, 0);

    onUpdateQuoteTotal(vendor.user_id, nextTotal, currentPackage.name);
  };

  const handleSelectPackage = (pkgId: string) => {
    setSelectedPackageId(pkgId);
    const chosen = vendor.templates.find((t) => t.id === pkgId) || defaultPackage;
    const nextTotal = (chosen.starting_price || vendor.starting_price) + upsellsTotal;
    onUpdateQuoteTotal(vendor.user_id, nextTotal, chosen.name);
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim()) return;

    const userText = textToSend;
    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    setChatMessages((prev) => [...prev, { sender: 'bride', text: userText, time: nowTime }]);
    if (!customText) setInputMessage('');
    setIsTypingAi(true);

    // Envia mensagem em tempo real para o Dashboard do Fornecedor / Studio!
    if (conversationId) {
      try {
        await RealtimeChatService.sendMessage({
          conversationId,
          senderType: 'bride',
          senderName: brideProfile.nome_noiva || 'Noiva',
          content: userText,
        });
      } catch (e) {
        console.warn('[BrideVendorTabContent] Falha ao enviar mensagem em tempo real:', e);
      }
    }

    // Resposta contextual inteligente do Copiloto IA caso o fornecedor não responda imediatamente
    setTimeout(() => {
      let aiReply = `Perfeito, ${brideProfile.nome_noiva}! Anotei sua consideração sobre "${userText}". Podemos ajustar todos os itens contratuais de forma transparente!`;
      let generatedQuote: QuoteCardData | undefined = undefined;

      const lower = userText.toLowerCase();

      if (lower.includes('desconto') || lower.includes('vista') || lower.includes('pix')) {
        const discountedPrice = Math.round(totalCalculated * 0.93); // 7% de desconto
        aiReply = `Excelente notícia! Para quitação à vista ou via PIX, conseguimos conceder 7% de desconto imediato em todo o contrato. Veja a simulação atualizada:`;
        generatedQuote = {
          title: 'Cotação com Desconto Especial à Vista',
          packageName: `${currentPackage.name} + Adicionais Selecionados`,
          items: [
            'Todos os itens da cobertura acordada',
            'Desconto exclusivo de 7% aplicado',
            'Garantia de reserva prioritária imediata'
          ],
          originalPrice: totalCalculated,
          finalPrice: discountedPrice,
          discountBadge: 'Economia de R$ ' + (totalCalculated - discountedPrice).toLocaleString('pt-BR'),
          paymentTerms: 'À vista via PIX ou 50% entrada + 50% na semana do evento'
        };
      } else if (lower.includes('ensaio') || lower.includes('pré-wedding') || lower.includes('pre-wedding')) {
        // Se ainda não tem o ensaio nos upsells, adiciona
        if (!selectedUpsells.includes('up3')) {
          setSelectedUpsells((prev) => [...prev, 'up3']);
          onUpdateQuoteTotal(vendor.user_id, totalCalculated + 600, currentPackage.name);
        }
        aiReply = `O ensaio pré-wedding é uma das experiências mais marcantes! Pode ser realizado no litoral, campos ou cidades históricas. Já incluí o ensaio no seu orçamento:`;
        generatedQuote = {
          title: 'Cotação com Ensaio Pré-Wedding Incluso',
          packageName: `${currentPackage.name} + Ensaio Pré-Wedding`,
          items: [
            'Sessão externa de 3 a 4 horas com troca de looks',
            '50 fotos tratadas em altíssima resolução',
            'Vídeo teaser para projeção no dia do casamento'
          ],
          finalPrice: totalCalculated + (selectedUpsells.includes('up3') ? 0 : 600),
          discountBadge: 'Adicional VIP Bonificado',
          paymentTerms: 'Parcelado junto com o contrato em até 10x sem juros'
        };
      } else if (lower.includes('data') || lower.includes('dia') || lower.includes('disponib')) {
        aiReply = `Consultei a agenda principal de ${vendor.business_name}: a data de ${brideProfile.data_casamento || 'seu casamento'} está DISPONÍVEL! Sugiro travar a data para evitar choque de reservas:`;
        generatedQuote = {
          title: 'Pré-Reserva de Data Confirmada',
          packageName: currentPackage.name,
          items: [
            `Data Reservada: ${brideProfile.data_casamento || 'Data a confirmar'}`,
            `Local: ${brideProfile.cidade || 'Região Metropolitana'}`,
            'Bloqueio de agenda com assinatura digital PriceU$'
          ],
          finalPrice: totalCalculated,
          discountBadge: 'Agenda Aberta - Bloqueio por 48h',
          paymentTerms: 'Sinal de reserva 20% + saldo facilitado'
        };
      } else if (lower.includes('parcel') || lower.includes('10x') || lower.includes('pagamento')) {
        const parcela = Math.round((totalCalculated * 0.7) / 10);
        const entrada = Math.round(totalCalculated * 0.3);
        aiReply = `Trabalhamos com flexibilidade máxima para seu planejamento financeiro. Segue a simulação detalhada em 10 vezes sem juros:`;
        generatedQuote = {
          title: 'Plano de Pagamento Parcelado',
          packageName: currentPackage.name,
          items: [
            `Entrada facilitada (30%): R$ ${entrada.toLocaleString('pt-BR')}`,
            `10x fixas sem juros de: R$ ${parcela.toLocaleString('pt-BR')}`,
            'Sem consultas burocráticas ou juros ocultos'
          ],
          finalPrice: totalCalculated,
          discountBadge: '10x Sem Juros',
          paymentTerms: 'Entrada + boletos ou cartão recorrente sem travar limite'
        };
      }

      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: aiReply,
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          quoteCard: generatedQuote,
        },
      ]);
      setIsTypingAi(false);
    }, 1100);
  };

  const handleApplyQuoteFromChat = (card: QuoteCardData) => {
    onUpdateQuoteTotal(vendor.user_id, card.finalPrice, card.packageName);
    alert(`Orçamento de R$ ${card.finalPrice.toLocaleString('pt-BR')} sincronizado com seu resumo de casamento!`);
  };

  return (
    <div className="space-y-6">
      {/* Seletor Segmentado Sofisticado (Proposta & Pacotes vs Negociação Direta) */}
      <div className="sticky top-14 z-20 bg-stone-100/95 backdrop-blur-md p-1.5 rounded-2xl border border-stone-200/90 shadow-sm flex items-center gap-2 max-w-lg mx-auto">
        <button
          type="button"
          onClick={() => setActiveView('proposal')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeView === 'proposal'
              ? 'bg-white text-slate-900 shadow-sm border border-stone-200/80'
              : 'text-stone-500 hover:text-slate-900'
          }`}
        >
          <Sparkles size={14} className={activeView === 'proposal' ? 'text-rose-500' : 'text-stone-400'} />
          <span>Proposta & Pacotes</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveView('chat')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer relative ${
            activeView === 'chat'
              ? 'bg-white text-slate-900 shadow-sm border border-stone-200/80'
              : 'text-stone-500 hover:text-slate-900'
          }`}
        >
          <MessageCircle size={14} className={activeView === 'chat' ? 'text-emerald-500' : 'text-stone-400'} />
          <span>Negociação Direta</span>
          {vendorPresence.showOnlineStatus !== false && vendorPresence.status === 'online' && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </span>
          )}
        </button>
      </div>

      {activeView === 'proposal' ? (
        /* VISUALIZAÇÃO 1: PROPOSTA & PACOTES (LIMPA, ELEGANTE E COM CARD DE NEGOCIAÇÃO EM DESTAQUE) */
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
          {/* Banner do Fornecedor Clean & Chique */}
          <div className="rounded-3xl bg-white border border-stone-200/80 p-6 sm:p-7 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-600 via-pink-600 to-rose-700 flex items-center justify-center text-white font-serif text-2xl font-bold shadow-md shadow-rose-500/20">
                  {vendor.business_name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{vendor.business_name}</h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                      <ShieldCheck size={12} className="text-emerald-600" /> Verificado
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-stone-500 mt-1">
                    <span className="flex items-center gap-1 text-amber-500 font-bold">
                      <Star size={13} className="fill-amber-400" /> {vendor.rating.toFixed(1)} ({vendor.total_reviews} avaliações)
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-stone-600">
                      <MapPin size={12} className="text-stone-400" /> {vendor.city}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsFavorited(!isFavorited)}
                className={`p-2.5 px-4 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-semibold self-start sm:self-center cursor-pointer ${
                  isFavorited
                    ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-xs'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100 hover:text-slate-900'
                }`}
              >
                <Heart size={14} className={isFavorited ? 'fill-rose-600 text-rose-600' : 'text-stone-400'} />
                <span>{isFavorited ? 'Salvo nos Favoritos' : 'Favoritar'}</span>
              </button>
            </div>

            {/* Tags de Estilo */}
            <div className="flex flex-wrap gap-1.5 pt-1 border-t border-stone-100">
              {vendor.tags.map((tag, i) => (
                <span key={i} className="px-2.5 py-1 rounded-lg bg-stone-50 border border-stone-200/80 text-stone-600 text-xs font-medium">
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Escolha de Pacotes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                <Sparkles size={14} className="text-rose-500" />
                1. Selecione o Pacote Principal
              </h3>
              <span className="text-[11px] text-stone-400 font-medium">Personalizável a qualquer momento</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {vendor.templates.map((tpl) => {
                const isSelected = selectedPackageId === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => handleSelectPackage(tpl.id)}
                    className={`p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-rose-50/50 border-rose-500 shadow-sm'
                        : 'bg-white border-stone-200 hover:border-stone-300 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-sm text-slate-900">{tpl.name}</p>
                        <p className="text-[11px] text-stone-500 mt-0.5">Cobertura completa e equipe técnica especializada</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'border-rose-500 bg-rose-500 text-white' : 'border-stone-300'}`}>
                        {isSelected && <Check size={12} />}
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-baseline justify-between">
                      <span className="text-[11px] text-stone-500 font-medium">Investimento</span>
                      <p className="text-slate-900 font-black text-lg">
                        R$ {(tpl.starting_price || vendor.starting_price).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Adicionais & Opcionais (Upsell) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
              <Tag size={14} className="text-rose-500" />
              2. Personalize com Itens Opcionais
            </h3>

            <div className="space-y-2.5">
              {upsellOptions.map((up) => {
                const isChecked = selectedUpsells.includes(up.id);
                return (
                  <div
                    key={up.id}
                    onClick={() => toggleUpsell(up.id)}
                    className={`p-4 rounded-2xl border cursor-pointer flex items-center justify-between gap-3 transition-all ${
                      isChecked
                        ? 'bg-rose-50/40 border-rose-400 shadow-xs'
                        : 'bg-white border-stone-200 hover:bg-stone-50/70'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center ${isChecked ? 'bg-rose-600 border-rose-600 text-white' : 'border-stone-300 bg-white'}`}>
                        {isChecked && <Check size={12} />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{up.name}</p>
                        <p className="text-[11px] text-stone-500">{up.desc}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 whitespace-nowrap bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      + R$ {up.price.toLocaleString('pt-BR')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Resumo da Cotação desta Aba */}
          <div className="rounded-3xl bg-slate-900 text-white p-6 sm:p-7 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-xl shadow-slate-900/10">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-rose-300 font-bold flex items-center gap-1.5">
                <Sparkles size={12} /> Resumo do Investimento
              </span>
              <div className="text-3xl font-black text-white mt-1">
                R$ {totalCalculated.toLocaleString('pt-BR')}
              </div>
              <p className="text-xs text-stone-400 mt-1">
                Plano de entrada facilitada 30% + saldo até o casamento sem juros
              </p>
            </div>

            <button
              type="button"
              onClick={() => onOpenContractModal(vendor, totalCalculated)}
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all scale-100 hover:scale-[1.02] cursor-pointer"
            >
              <FileCheck size={16} />
              <span>Emitir Contrato Oficial</span>
            </button>
          </div>

          {/* CARD DE DESTAQUE DE NEGOCIAÇÃO: DUAL OPTION (CHAT ATIVO VS WHATSAPP) */}
          <div className="rounded-3xl bg-gradient-to-br from-stone-900 via-slate-900 to-stone-950 text-white p-6 sm:p-8 shadow-xl shadow-slate-950/20 border border-stone-800 space-y-6 relative overflow-hidden">
            {/* Brilhos decorativos sutis */}
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Cabeçalho do Card com Presença Online em Tempo Real */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-5">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5">
                  <Sparkles size={12} className="text-emerald-400 animate-pulse" /> Atendimento & Negociação Direta
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">
                  Deseja personalizar esta proposta?
                </h3>
                <p className="text-xs text-stone-300 mt-1 max-w-xl">
                  Converse em tempo real para solicitar descontos para pagamento à vista, incluir ensaios ou simular parcelamento especial.
                </p>
              </div>

              {/* Badge de Presença Online */}
              {vendorPresence.showOnlineStatus !== false && vendorPresence.status !== 'invisible' && (
                <div className="self-start sm:self-center px-4 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center gap-3">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      vendorPresence.status === 'online' ? 'bg-emerald-400' : 'bg-amber-400'
                    }`} />
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                      vendorPresence.status === 'online' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`} />
                  </span>
                  <div className="text-left">
                    <p className="text-[11px] font-bold text-white flex items-center gap-1">
                      {vendorPresence.status === 'online' ? 'Online Agora' : 'Em Atendimento'}
                    </p>
                    <p className="text-[10px] text-stone-300">
                      {vendorPresence.responseTimeText || 'Responde em poucos minutos'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* DUAL ACTION BUTTONS: Destaque Principal (Personalizável) + WhatsApp */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Opção 1: NEGOCIAÇÃO ATIVA NO CHAT (HERO / DESTAQUE MÁXIMO) */}
              <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 border border-emerald-400/40 shadow-lg shadow-emerald-950/40 flex flex-col justify-between space-y-4 transition-all scale-100 hover:scale-[1.01] group">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-400/40 text-[10px] font-extrabold uppercase tracking-wider text-emerald-200 flex items-center gap-1 shadow-sm">
                      <Sparkles size={11} className="text-emerald-300" /> Mais Rápido & Interativo
                    </span>
                    <span className="text-[10px] text-emerald-100/90 font-semibold">Sem sair do painel</span>
                  </div>
                  <h4 className="text-lg font-bold text-white">
                    Negociação Direta no Sistema
                  </h4>
                  <p className="text-xs text-emerald-100/90 leading-relaxed">
                    Converse em tempo real com {vendor.business_name} e o Copiloto IA. Receba orçamentos interativos com descontos aplicáveis em 1 clique.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveView('chat')}
                  className="w-full py-3.5 px-5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <MessageCircle size={16} className="text-emerald-700" />
                  <span>{vendorPresence.customNegotiationBtnText || 'Negociar Proposta Online'}</span>
                  <ArrowRight size={14} className="text-emerald-700 ml-1 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Opção 2: ENVIAR VIA WHATSAPP (ALTERNATIVA PRÁTICA) */}
              <div className="p-5 sm:p-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 flex flex-col justify-between space-y-4 transition-all">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-[10px] font-bold uppercase tracking-wider text-stone-300 flex items-center gap-1">
                      <Phone size={10} /> Canal Externo
                    </span>
                    <span className="text-[10px] text-stone-400 font-medium">WhatsApp Oficial</span>
                  </div>
                  <h4 className="text-lg font-bold text-white">
                    Enviar via WhatsApp
                  </h4>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    Prefere o WhatsApp? Nós geramos uma mensagem formatada com o pacote <span className="text-white font-semibold">{currentPackage.name}</span> e o investimento total para seu envio imediato.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenWhatsApp}
                  className="w-full py-3.5 px-5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-white/15 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Phone size={14} className="text-emerald-400" />
                  <span>Enviar Escolhas no WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* VISUALIZAÇÃO 2: NEGOCIAÇÃO DIRETA NO CHAT PRICEU$ */
        <div className="max-w-4xl mx-auto flex flex-col rounded-3xl bg-white border border-stone-200/90 overflow-hidden shadow-xl shadow-stone-200/50 h-[700px] animate-in fade-in duration-300">
          {/* Header do Chat com Botão de Voltar para Proposta */}
          <div className="p-4 sm:p-5 border-b border-stone-200/80 bg-stone-50/90 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveView('proposal')}
                className="p-2 sm:px-3 rounded-xl bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 transition-all flex items-center gap-1.5 text-xs font-bold shadow-2xs cursor-pointer"
                title="Voltar para a Proposta e Pacotes"
              >
                <ChevronLeft size={16} />
                <span>Ver Proposta</span>
              </button>

              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-600 flex items-center justify-center text-white font-bold font-serif text-sm shadow-sm">
                  {vendor.business_name.charAt(0)}
                </div>
                {vendorPresence.showOnlineStatus !== false && vendorPresence.status === 'online' && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                )}
              </div>

              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-[180px] sm:max-w-xs">{vendor.business_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {vendorPresence.showOnlineStatus !== false && vendorPresence.status !== 'invisible' ? (
                    <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {vendorPresence.status === 'online' ? 'Online Agora' : 'Em Atendimento'}
                      {vendorPresence.responseTimeText && ` • ${vendorPresence.responseTimeText}`}
                    </span>
                  ) : (
                    <span className="text-[10px] text-stone-500 font-semibold flex items-center gap-1">
                      <Bot size={11} className="text-emerald-600" /> Copiloto do Quotes Ativo
                    </span>
                  )}
                  <span className="text-[10px] text-stone-400">• Proposta: R$ {totalCalculated.toLocaleString('pt-BR')}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 border border-stone-200 hover:border-emerald-200 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Continuar negociação no WhatsApp se preferir"
              >
                <Phone size={13} />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Área de Mensagens do Chat */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#fafaf9]">
            {chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-3 my-auto py-16">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 border border-rose-100 flex items-center justify-center shadow-xs">
                  <MessageCircle size={26} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Canal Direto com {vendor.business_name}</p>
                  <p className="text-xs text-stone-500 mt-1 max-w-xs leading-relaxed">
                    Envie uma mensagem abaixo para tirar dúvidas, negociar valores do pacote ou solicitar ajustes personalizados.
                  </p>
                </div>
              </div>
            ) : (
              chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${msg.sender === 'bride' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs leading-relaxed space-y-2.5 ${
                      msg.sender === 'bride'
                        ? 'bg-slate-900 text-white rounded-br-none shadow-md shadow-slate-900/10'
                        : 'bg-white text-slate-800 border border-stone-200/90 rounded-bl-none shadow-sm'
                    }`}
                  >
                    {msg.sender === 'vendor' && (
                      <p className="text-[10px] font-bold text-emerald-700 flex items-center gap-1.5 border-b border-stone-100 pb-1.5">
                        <ShieldCheck size={11} className="text-emerald-600" /> {vendor.business_name} (Profissional)
                      </p>
                    )}

                    {msg.sender === 'ai' && (
                      <p className="text-[10px] font-bold text-rose-600 flex items-center gap-1.5 border-b border-stone-100 pb-1.5">
                        <Sparkles size={11} /> Concierge Inteligente PriceU$
                      </p>
                    )}

                    <p className="whitespace-pre-line text-xs">{msg.text}</p>

                    {/* Card de Orçamento Interativo dentro da Mensagem */}
                    {msg.quoteCard && (
                      <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-3.5 space-y-2.5 text-slate-900 text-xs shadow-xs mt-2">
                        <div className="flex items-center justify-between border-b border-rose-200/70 pb-2">
                          <span className="font-bold text-[11px] text-slate-900 flex items-center gap-1">
                            <FileCheck size={13} className="text-rose-600" /> {msg.quoteCard.title}
                          </span>
                          {msg.quoteCard.discountBadge && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-200">
                              {msg.quoteCard.discountBadge}
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 text-[11px] text-stone-600">
                          <p className="font-semibold text-slate-800">{msg.quoteCard.packageName}</p>
                          <ul className="space-y-0.5 pl-1">
                            {msg.quoteCard.items.map((item, idx) => (
                              <li key={idx} className="flex items-center gap-1.5 text-[10.5px]">
                                <Check size={11} className="text-emerald-600 flex-shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="pt-2 border-t border-rose-200/70 flex items-baseline justify-between">
                          <div>
                            {msg.quoteCard.originalPrice && (
                              <span className="text-[10px] text-stone-400 line-through mr-1.5">
                                R$ {msg.quoteCard.originalPrice.toLocaleString('pt-BR')}
                              </span>
                            )}
                            <span className="text-sm font-black text-slate-900">
                              R$ {msg.quoteCard.finalPrice.toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <span className="text-[10px] text-stone-500 font-medium">
                            {msg.quoteCard.paymentTerms}
                          </span>
                        </div>

                        {/* Ações Rápidas no Próprio Card do Chat */}
                        <div className="pt-1.5 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleApplyQuoteFromChat(msg.quoteCard!)}
                            className="flex-1 py-2 px-2.5 rounded-lg bg-white border border-rose-300 hover:bg-rose-100/60 text-rose-800 font-bold text-[10px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Check size={11} />
                            <span>Aplicar no Painel</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenContractModal(vendor, msg.quoteCard!.finalPrice)}
                            className="flex-1 py-2 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                          >
                            <FileCheck size={11} />
                            <span>Fechar Contrato</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-stone-400 mt-1 px-1.5">{msg.time}</span>
                </div>
              ))
            )}

            {isTypingAi && (
              <div className="flex items-center gap-2 bg-white border border-stone-200/90 px-3.5 py-2.5 rounded-2xl w-fit text-stone-500 text-xs shadow-xs animate-pulse">
                <Sparkles size={13} className="text-rose-500 animate-spin" />
                <span>Copiloto calculando condições...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Pílulas de Sugestões de Proposta (Ações Rápidas de Negociação) */}
          <div className="px-3 py-2 bg-stone-50/80 border-t border-stone-200/70 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { label: '🏷️ Pedir Desconto à Vista (-7%)', text: 'Vocês conseguem um desconto especial para pagamento à vista no PIX?' },
              { label: '📸 Incluir Ensaio Pré-Wedding', text: 'Gostaria de incluir o ensaio pré-wedding externo na proposta.' },
              { label: '📅 Consultar Disponibilidade da Data', text: 'Vocês têm disponibilidade oficial para a data do meu casamento?' },
              { label: '💳 Simular 10x Sem Juros', text: 'Como fica a simulação do valor parcelado em 10 vezes sem juros?' },
            ].map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(prompt.text)}
                className="text-[10px] font-semibold whitespace-nowrap px-3 py-1.5 rounded-full bg-white hover:bg-rose-50 hover:text-rose-700 text-stone-600 border border-stone-200/90 shadow-2xs transition-all cursor-pointer flex-shrink-0"
              >
                {prompt.label}
              </button>
            ))}
          </div>

          {/* Input de Mensagem */}
          <div className="p-3 sm:p-4 border-t border-stone-200/80 bg-white flex items-center gap-2">
            <input
              type="text"
              placeholder={`Negociar ou tirar dúvidas com ${vendor.business_name}...`}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1 bg-stone-50 border border-stone-200/90 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-stone-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all"
            />
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim()}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white transition-all shadow-md shadow-slate-900/10 cursor-pointer"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
