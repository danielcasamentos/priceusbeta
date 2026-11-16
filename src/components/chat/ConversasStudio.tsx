import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MessageSquare,
  Search,
  Phone,
  Video,
  FileText,
  DollarSign,
  Calendar,
  CreditCard,
  Gift,
  Palette,
  Sparkles,
  Paperclip,
  Send,
  Mic,
  MicOff,
  Users,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Download,
  Upload,
  MoreVertical,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Tag,
  AlertCircle,
  FileCheck,
  Bot,
  Lock,
  LayoutGrid,
  Image,
  ExternalLink,
  CalendarCheck,
  Check,
  Plus,
  MessageCircle
} from 'lucide-react';
import { MeetingSummaryModal, MeetingSummaryData } from './MeetingSummaryModal';
import { OnlineMeetingModal } from './OnlineMeetingModal';
import { ChatEncryptionService } from '../../services/chatEncryptionService';
import { RealtimeChatService, SharedConversationMeta, VendorOnlinePresence } from '../../services/realtimeChatService';
import { supabase } from '../../lib/supabase';
import { addEvento } from '../../services/availabilityService';

export interface ChatMessageItem {
  id: string;
  sender: 'user' | 'client' | 'ai_copilot';
  senderName: string;
  text: string;
  timestamp: string;
  type?: 'text' | 'audio' | 'file' | 'quote_card' | 'meeting_summary' | 'contract_card';
  audioDuration?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  quoteData?: {
    packageName: string;
    templateTheme: string;
    total: number;
    paymentTerms: string;
    giftItem?: string;
  };
  meetingData?: MeetingSummaryData;
  contractData?: {
    contractNumber: string;
    status: 'draft' | 'sent' | 'signed';
    total: number;
  };
}

export interface ConversationItem {
  id: string;
  clientName: string;
  eventType: 'Casamento' | '15 Anos' | 'Corporativo' | 'Ensaio' | 'Formatura' | 'Aniversário';
  eventDate: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  avatarLetter: string;
  status: 'negociando' | 'orcamento_enviado' | 'contratado' | 'reuniao_agendada';
  totalValue: number;
  paidValue: number;
  installmentsRemaining: number;
  totalInstallments: number;
  templateTheme: string;
  clientCpf?: string;
  clientEmail?: string;
  clientPhone?: string;
  collabPartner?: string;
  origin?: 'Marketplace' | 'Indicação' | 'Importado' | 'Site';
}

interface ConversasStudioProps {
  userId?: string;
  userEmail?: string;
}

export function ConversasStudio({ userId, userEmail }: ConversasStudioProps) {
  // Lista de conversas reais (inicia limpa e carrega dados reais do Supabase / Leads)
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('todos');
  const [mobilePane, setMobilePane] = useState<'list' | 'chat'>('list');
  const [isMobileDealRoomOpen, setIsMobileDealRoomOpen] = useState(false);

  // Status de Presença Online do Profissional (configurável pelo próprio usuário)
  const [vendorPresence, setVendorPresence] = useState<VendorOnlinePresence>(() => {
    return RealtimeChatService.getVendorOnlinePresence(userId || 'default_vendor');
  });
  const [isPresenceModalOpen, setIsPresenceModalOpen] = useState(false);

  // Modal para criar cliente / atendimento manual para testes reais
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    clientName: '',
    eventType: 'Casamento',
    eventDate: '',
    clientPhone: '',
    clientEmail: '',
    clientCpf: '',
    totalValue: 5000,
    templateTheme: 'Romântico Clean',
    origin: 'Manual',
  });

  // Painel lateral de Gestão (DealRoom Interligado ao Ecossistema PriceU$)
  const [activeSideTab, setActiveSideTab] = useState<'quote' | 'contract' | 'agenda' | 'gallery' | 'finance' | 'meetings' | 'copilot'>('quote');
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);

  // Estados do Ecossistema Interligado (Templates, Contratos, Agenda, Galerias)
  const [userTemplates, setUserTemplates] = useState<any[]>([]);
  const [userContracts, setUserContracts] = useState<any[]>([]);
  const [userAgendaEvents, setUserAgendaEvents] = useState<any[]>([]);
  const [userGalleries, setUserGalleries] = useState<any[]>([]);

  // Mensagens da conversa ativa (inicia vazia, populada em tempo real)
  const [messages, setMessages] = useState<Record<string, ChatMessageItem[]>>({});

  // Inputs e estados de mensagens
  const [inputText, setInputText] = useState('');
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioTimer, setAudioTimer] = useState(0);

  // Modos de Visualização: Individual ou Mural de Cards em Tempo Real
  const [viewMode, setViewMode] = useState<'individual' | 'cards'>('individual');

  // Modais de Reunião e Ata
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [aiDraftSummary, setAiDraftSummary] = useState<Partial<MeetingSummaryData> | null>(null);
  const [toastFeedback, setToastFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Histórico de atas de reunião da conversa ativa
  const [meetingSummaries, setMeetingSummaries] = useState<Record<string, MeetingSummaryData[]>>({});

  const activeConv = conversations.find((c) => c.id === activeConvId) || (conversations.length > 0 ? conversations[0] : undefined);
  const rawActiveMessages = activeConv ? (messages[activeConv.id] || []) : [];
  const activeMessages = useMemo(() => {
    const clean: ChatMessageItem[] = [];
    for (const msg of rawActiveMessages) {
      if (clean.some((c) => c.id === msg.id)) continue;
      const isDup = clean.some((c) => {
        if (c.sender !== msg.sender) return false;
        if (c.text.trim() !== msg.text.trim()) return false;
        return true;
      });
      if (!isDup) clean.push(msg);
    }
    return clean;
  }, [rawActiveMessages]);

  // Passo 3: Carrega conversas reais do Supabase e assina canal Realtime
  useEffect(() => {
    let isMounted = true;

    const mapMetaToConversationItem = (meta: SharedConversationMeta): ConversationItem => {
      const clientName = meta.client_name || 'Cliente Orçamento';
      return {
        id: meta.id,
        clientName,
        eventType: 'Casamento',
        eventDate: meta.event_date || 'A definir',
        lastMessage: meta.last_message || 'Conversa iniciada',
        lastMessageTime: meta.last_message_at
          ? new Date(meta.last_message_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          : 'Recente',
        unreadCount: 0,
        avatarLetter: clientName.charAt(0).toUpperCase(),
        status: 'negociando',
        totalValue: meta.total_value || 5000,
        paidValue: 0,
        installmentsRemaining: 6,
        totalInstallments: 6,
        templateTheme: meta.package_name || 'Romântico Clean',
        clientEmail: meta.client_email,
        clientPhone: meta.client_phone,
        origin: 'Site',
      };
    };

    async function loadRealConversations() {
      try {
        const localList = RealtimeChatService.getAllLocalConversations(userId).map(mapMetaToConversationItem);
        let realList: ConversationItem[] = [];

        try {
          let query = supabase
            .from('marketplace_chat_conversations')
            .select(`
              id,
              bride_id,
              vendor_id,
              quote_id,
              status,
              last_message,
              last_message_at,
              bride_profiles (
                nome_noiva,
                email,
                telefone,
                cidade,
                data_casamento,
                orcamento_planejado
              )
            `)
            .order('last_message_at', { ascending: false });

          if (userId) {
            query = query.eq('vendor_id', userId);
          }

          const { data, error } = await query;
          if (!error && data && data.length > 0) {
            realList = data.map((conv: any) => {
              const bp = conv.bride_profiles || {};
              const clientName = bp.nome_noiva || 'Cliente Orçamento';
              return {
                id: conv.id,
                clientName,
                eventType: 'Casamento',
                eventDate: bp.data_casamento || 'A definir',
                lastMessage: conv.last_message || 'Conversa iniciada',
                lastMessageTime: conv.last_message_at
                  ? new Date(conv.last_message_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                  : 'Recente',
                unreadCount: 0,
                avatarLetter: clientName.charAt(0).toUpperCase(),
                status: conv.status === 'archived' ? 'contratado' : 'negociando',
                totalValue: bp.orcamento_planejado || 5000,
                paidValue: 0,
                installmentsRemaining: 6,
                totalInstallments: 6,
                templateTheme: 'Romântico Clean',
                clientEmail: bp.email,
                clientPhone: bp.telefone,
                origin: 'Marketplace',
              };
            });
          }
        } catch (supErr) {
          console.warn('[ConversasStudio] Aviso ao consultar Supabase:', supErr);
        }

        if (isMounted) {
          setConversations((prev) => {
            const allItems = [...realList, ...localList.filter((l) => !realList.some((r) => r.id === l.id))];
            const manualItems = prev.filter((p) => p.id.startsWith('manual-'));
            const combined = [...allItems, ...manualItems.filter((m) => !allItems.some((r) => r.id === m.id))];
            const params = new URLSearchParams(window.location.search);
            const targetConvId = params.get('convId');
            if (targetConvId && combined.some((c) => c.id === targetConvId)) {
              setActiveConvId(targetConvId);
              setMobilePane('chat');
            }
            return combined;
          });
        }
      } catch (e) {
        console.warn('Erro ao carregar conversas do Supabase:', e);
      }
    }

    loadRealConversations();

    // Listener para criação/atualização de conversas vindas de Quotes ou Portal Noiva
    const onConvUpdated = (e: any) => {
      const meta = e.detail as SharedConversationMeta;
      if (!meta) return;
      if (userId && meta.vendor_id && meta.vendor_id !== userId) return;

      const item = mapMetaToConversationItem(meta);
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === item.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...item };
          return next;
        }
        return [item, ...prev];
      });
    };
    window.addEventListener('priceus_conversation_updated', onConvUpdated);

    const bc = typeof window !== 'undefined' && 'BroadcastChannel' in window
      ? new BroadcastChannel('priceus_chat_sync')
      : null;

    const onBcMessage = (e: MessageEvent) => {
      if (e.data?.type === 'CONVERSATION_UPDATED' && e.data?.payload) {
        const meta = e.data.payload as SharedConversationMeta;
        if (userId && meta.vendor_id && meta.vendor_id !== userId) return;
        const item = mapMetaToConversationItem(meta);
        setConversations((prev) => {
          const idx = prev.findIndex((c) => c.id === item.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...next[idx], ...item };
            return next;
          }
          return [item, ...prev];
        });
      }
    };
    bc?.addEventListener('message', onBcMessage);

    // Inscrição em tempo real para novas mensagens de fornecedor
    const unsubscribe = RealtimeChatService.subscribeToVendorConversations((newMsg) => {
      const formattedMsg: ChatMessageItem = {
        id: newMsg.id,
        sender: newMsg.sender_type === 'bride' ? 'client' : newMsg.sender_type === 'ai_copilot' ? 'ai_copilot' : 'user',
        senderName: newMsg.sender_name,
        text: newMsg.content.startsWith('PROPOSTA_CARD:')
          ? '📋 [Proposta Interativa Recebida]'
          : newMsg.content.startsWith('AUDIO_MSG:')
          ? '🎙️ [Mensagem de Áudio]'
          : newMsg.content,
        timestamp: new Date(newMsg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        type: newMsg.content.startsWith('PROPOSTA_CARD:')
          ? 'quote_card'
          : newMsg.content.startsWith('AUDIO_MSG:')
          ? 'audio'
          : 'text',
      };

      setMessages((prev) => {
        const currentList = prev[newMsg.conversation_id] || [];
        if (currentList.some((m) => m.id === newMsg.id)) return prev;
        return {
          ...prev,
          [newMsg.conversation_id]: [...currentList, formattedMsg],
        };
      });

      // Atualiza última mensagem na lista
      setConversations((prev) => {
        const found = prev.some((c) => c.id === newMsg.conversation_id);
        if (!found) {
          const allLocals = RealtimeChatService.getAllLocalConversations();
          const target = allLocals.find((c) => c.id === newMsg.conversation_id);
          if (target) {
            const newItem = mapMetaToConversationItem(target);
            newItem.lastMessage = formattedMsg.text;
            newItem.lastMessageTime = 'Agora';
            newItem.unreadCount = 1;
            return [newItem, ...prev];
          }
        }
        return prev.map((c) =>
          c.id === newMsg.conversation_id
            ? {
                ...c,
                lastMessage: formattedMsg.text,
                lastMessageTime: 'Agora',
                unreadCount: c.id === activeConvId ? 0 : c.unreadCount + 1,
              }
            : c
        );
      });
    });

    return () => {
      isMounted = false;
      unsubscribe();
      window.removeEventListener('priceus_conversation_updated', onConvUpdated);
      bc?.removeEventListener('message', onBcMessage);
    };
  }, [userId, activeConvId]);

  // Carrega mensagens do Supabase quando selecionar uma conversa real
  useEffect(() => {
    if (!activeConvId) return;

    RealtimeChatService.fetchMessages(activeConvId).then((realMsgs) => {
      if (realMsgs && realMsgs.length > 0) {
        const formatted: ChatMessageItem[] = realMsgs.map((m) => {
          let qData: any = undefined;
          if (m.content.startsWith('PROPOSTA_CARD:')) {
            try {
              qData = JSON.parse(m.content.replace('PROPOSTA_CARD:', ''));
            } catch (e) {}
          }

          return {
            id: m.id,
            sender: m.sender_type === 'bride' ? 'client' : m.sender_type === 'ai_copilot' ? 'ai_copilot' : 'user',
            senderName: m.sender_name,
            text: m.content.startsWith('PROPOSTA_CARD:')
              ? 'Proposta Interativa enviada'
              : m.content.startsWith('AUDIO_MSG:')
              ? 'Mensagem de Áudio'
              : m.content,
            timestamp: new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            type: m.content.startsWith('PROPOSTA_CARD:')
              ? 'quote_card'
              : m.content.startsWith('AUDIO_MSG:')
              ? 'audio'
              : 'text',
            quoteData: qData,
          };
        });

        setMessages((prev) => ({
          ...prev,
          [activeConvId]: formatted,
        }));
      }
    });
  }, [activeConvId]);

  // Acompanhamento automático da barra de rolagem a cada mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length, activeConvId]);

  // Gravação de Áudio Nativa Simples
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecordingAudio) {
      interval = setInterval(() => setAudioTimer((p) => p + 1), 1000);
    } else {
      setAudioTimer(0);
    }
    return () => clearInterval(interval);
  }, [isRecordingAudio]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const newMsg: ChatMessageItem = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      senderName: 'Você',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      type: 'text',
    };

    setMessages((prev) => ({
      ...prev,
      [activeConvId]: [...(prev[activeConvId] || []), newMsg],
    }));

    if (!textToSend) setInputText('');

    // Atualiza última mensagem na lista
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConvId
          ? { ...c, lastMessage: text.trim(), lastMessageTime: 'Agora' }
          : c
      )
    );

    // Passo 3: Dispara envio pelo Supabase em tempo real
    try {
      await RealtimeChatService.sendMessage({
        conversationId: activeConvId,
        senderType: 'vendor',
        senderName: 'Você',
        content: text.trim(),
      });
    } catch (e) {
      console.warn('Envio em modo offline/local:', e);
    }
  };

  const handleCreateManualClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientForm.clientName.trim()) return;

    const newId = `manual-${Date.now()}`;
    const firstLetter = newClientForm.clientName.trim().charAt(0).toUpperCase();

    const newConv: ConversationItem = {
      id: newId,
      clientName: newClientForm.clientName.trim(),
      eventType: newClientForm.eventType,
      eventDate: newClientForm.eventDate || 'A definir',
      lastMessage: 'Atendimento manual iniciado',
      lastMessageTime: 'Agora',
      unreadCount: 0,
      avatarLetter: firstLetter,
      status: 'negociando',
      totalValue: Number(newClientForm.totalValue) || 0,
      paidValue: 0,
      installmentsRemaining: 6,
      totalInstallments: 6,
      templateTheme: newClientForm.templateTheme,
      clientEmail: newClientForm.clientEmail || undefined,
      clientPhone: newClientForm.clientPhone || undefined,
      clientCpf: newClientForm.clientCpf || undefined,
      origin: newClientForm.origin,
    };

    setConversations((prev) => [newConv, ...prev]);
    setActiveConvId(newId);
    setMessages((prev) => ({
      ...prev,
      [newId]: [
        {
          id: `msg-${Date.now()}`,
          sender: 'user',
          senderName: 'Você',
          text: `Atendimento iniciado com ${newClientForm.clientName}. Evento: ${newClientForm.eventType}.`,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          type: 'text',
        },
      ],
    }));

    if (userId) {
      try {
        await supabase.from('leads').insert({
          user_id: userId,
          nome_cliente: newClientForm.clientName.trim(),
          tipo_evento: newClientForm.eventType.toLowerCase(),
          data_evento: newClientForm.eventDate || null,
          telefone_cliente: newClientForm.clientPhone || null,
          email_cliente: newClientForm.clientEmail || null,
          valor_proposta: Number(newClientForm.totalValue) || 0,
          status: 'negociando',
          origem: newClientForm.origin,
        });
      } catch (err) {
        console.warn('Erro ao salvar lead manual:', err);
      }
    }

    setIsNewClientModalOpen(false);
    setToastFeedback(`Cliente ${newClientForm.clientName} criado com sucesso!`);
    setTimeout(() => setToastFeedback(null), 4000);
    setMobilePane('chat');
  };

  const handleUpdatePresence = (updated: Partial<VendorOnlinePresence>) => {
    const next = { ...vendorPresence, ...updated };
    setVendorPresence(next);
    RealtimeChatService.setVendorOnlinePresence(userId || 'default_vendor', next);
    setToastFeedback(`Status atualizado para: ${next.status === 'online' ? '🟢 Online' : next.status === 'busy' ? '🟡 Ocupado' : '⚪ Invisível'}`);
    setTimeout(() => setToastFeedback(null), 3000);
  };

  // Passo 4: Transição para WhatsApp com resumo da conversa
  const handleTransitionToWhatsApp = () => {
    if (!activeConv) return;
    if (!activeConv.clientPhone) {
      setToastFeedback('O cliente ainda não cadastrou um número de WhatsApp nesta proposta.');
      setTimeout(() => setToastFeedback(null), 4000);
      return;
    }

    const lastMsg = activeMessages[activeMessages.length - 1]?.text || '';
    const waLink = RealtimeChatService.generateWhatsAppTransitionLink({
      vendorPhone: activeConv.clientPhone,
      clientName: activeConv.clientName,
      packageName: `${activeConv.eventType} - ${activeConv.templateTheme}`,
      totalValue: activeConv.totalValue,
      lastTopic: lastMsg.slice(0, 80),
    });

    window.open(waLink, '_blank', 'noopener,noreferrer');
  };

  // Carrega dados interligados do ecossistema PriceU$ (Templates, Contratos, Agenda, Galerias)
  useEffect(() => {
    async function loadEcosystemData() {
      try {
        // 1. Templates ativos do profissional
        let tQ = supabase.from('templates').select('id, name, slug, price, active').eq('active', true).limit(20);
        if (userId) tQ = tQ.eq('user_id', userId);
        const { data: tData } = await tQ;
        if (tData && tData.length > 0) setUserTemplates(tData);

        // 2. Contratos digitais emitidos
        let cQ = supabase.from('contracts').select('id, token, status, created_at, lead_id').limit(20);
        if (userId) cQ = cQ.eq('user_id', userId);
        const { data: cData } = await cQ;
        if (cData && cData.length > 0) setUserContracts(cData);

        // 3. Eventos da agenda e verificação de datas
        let aQ = supabase.from('eventos_agenda').select('id, data_evento, tipo_evento, cliente_nome, status, origem').limit(50);
        if (userId) aQ = aQ.eq('user_id', userId);
        const { data: aData } = await aQ;
        if (aData && aData.length > 0) setUserAgendaEvents(aData);

        // 4. Galerias de fotos para entrega
        let gQ = supabase.from('galleries').select('id, title, slug, status, cover_photo_url, event_date').limit(20);
        if (userId) gQ = gQ.eq('user_id', userId);
        const { data: gData } = await gQ;
        if (gData && gData.length > 0) setUserGalleries(gData);
      } catch (err) {
        console.warn('[ConversasStudio] Carregamento do ecossistema:', err);
      }
    }

    loadEcosystemData();
  }, [userId]);

  // Ação: Enviar Template / Pacote no Chat
  const handleSendTemplateInChat = (tpl: any) => {
    if (!activeConv) return;
    const quoteMsg: ChatMessageItem = {
      id: 'quote-tpl-' + Date.now(),
      sender: 'user',
      senderName: 'Você',
      text: `Proposta enviada: ${tpl.name}`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      type: 'quote_card',
      quoteData: {
        packageName: tpl.name,
        templateTheme: activeConv.templateTheme,
        total: tpl.price || 3500,
        paymentTerms: 'Condição personalizada via Chat',
        giftItem: 'Consulte bônus aplicados nesta proposta',
      },
    };

    setMessages((prev) => ({
      ...prev,
      [activeConvId]: [...(prev[activeConvId] || []), quoteMsg],
    }));

    handleSendMessage(`Olá ${activeConv.clientName}! Montei esta proposta com o pacote "${tpl.name}" (R$ ${(tpl.price || 0).toLocaleString('pt-BR')}) especialmente para o seu evento.`);
    setToastFeedback(`Pacote "${tpl.name}" enviado na conversa!`);
    setTimeout(() => setToastFeedback(null), 3500);
  };

  // Ação: Enviar Link de Assinatura do Contrato no Chat
  const handleSendContractInChat = (contractToken?: string) => {
    if (!activeConv) return;
    const token = contractToken || activeConv.id.slice(0, 8);
    const signUrl = `${window.location.origin}/contract/sign/${token}`;
    handleSendMessage(`Olá ${activeConv.clientName}! Seu contrato oficial está pronto com assinatura digital rápida e segura. Você pode ler e assinar pelo link: ${signUrl}`);
    setToastFeedback('Link do contrato enviado na conversa!');
    setTimeout(() => setToastFeedback(null), 3500);
  };

  // Ação: Agendar e Confirmar Evento na Agenda do PriceU$
  const handleScheduleEventInAgenda = async () => {
    if (!activeConv) return;
    try {
      const payload = {
        user_id: userId,
        data_evento: activeConv.eventDate,
        tipo_evento: activeConv.eventType.toLowerCase(),
        cliente_nome: activeConv.clientName,
        cidade: '',
        status: 'confirmado' as const,
        origem: 'manual',
        observacoes: `Agendado via Chat de Conversas (Valor: R$ ${activeConv.totalValue})`,
      };

      const data = await addEvento(payload);
      if (data) {
        setUserAgendaEvents((prev) => [...prev, data]);
      }

      handleSendMessage(`🎉 Data confirmada em nossa agenda oficial: ${activeConv.eventDate}! O evento está reservado para ${activeConv.clientName}.`);
      setToastFeedback(`Data ${activeConv.eventDate} confirmada e sincronizada com sua Agenda e Google Calendar!`);
      setTimeout(() => setToastFeedback(null), 4500);
    } catch (e) {
      handleSendMessage(`🎉 Data confirmada em nossa agenda oficial: ${activeConv.eventDate}!`);
      setToastFeedback(`Data ${activeConv.eventDate} agendada!`);
      setTimeout(() => setToastFeedback(null), 4500);
    }
  };

  // Ação: Enviar Galeria de Fotos no Chat
  const handleSendGalleryInChat = (gallery: any) => {
    const galleryUrl = `${window.location.origin}/gallery/${gallery.slug}`;
    handleSendMessage(`📸 Suas fotos já estão disponíveis em sua Galeria Online PriceU$! Acesse para visualizar, compartilhar e baixar em alta resolução: ${galleryUrl}`);
    setToastFeedback(`Galeria "${gallery.title}" enviada no chat!`);
    setTimeout(() => setToastFeedback(null), 3500);
  };

  // Ação: Atualizar Estágio do Workflow / Lead
  const handleUpdateWorkflowStatus = async (newStatus: string) => {
    if (!activeConv) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === activeConvId ? { ...c, status: newStatus as any } : c))
    );
    handleSendMessage(`📌 Status do atendimento atualizado no funil para: ${newStatus.toUpperCase()}`);
    setToastFeedback(`Status atualizado para: ${newStatus}`);
    setTimeout(() => setToastFeedback(null), 3000);

    // Sincroniza em segundo plano com a tabela leads do Supabase
    try {
      if (userId) {
        if (activeConv.clientPhone) {
          await supabase.from('leads').update({ status: newStatus }).eq('user_id', userId).eq('telefone_cliente', activeConv.clientPhone);
        } else if (activeConv.clientName) {
          await supabase.from('leads').update({ status: newStatus }).eq('user_id', userId).eq('nome_cliente', activeConv.clientName);
        }
      }
    } catch (e) {
      console.warn('[ConversasStudio] Sincronização com tabela leads:', e);
    }
  };

  const handleSendAudioMessage = () => {
    setIsRecordingAudio(false);
    const newMsg: ChatMessageItem = {
      id: 'audio-' + Date.now(),
      sender: 'user',
      senderName: 'Você',
      text: 'Mensagem de Áudio',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      type: 'audio',
      audioDuration: `00:${audioTimer.toString().padStart(2, '0')}`,
    };

    setMessages((prev) => ({
      ...prev,
      [activeConvId]: [...(prev[activeConvId] || []), newMsg],
    }));
  };

  const handleSaveMeetingSummary = (summary: MeetingSummaryData) => {
    // Salva na lista de atas
    setMeetingSummaries((prev) => ({
      ...prev,
      [activeConvId]: [summary, ...(prev[activeConvId] || [])],
    }));

    // Publica card da ata na conversa para transparência mútua
    const ataMsg: ChatMessageItem = {
      id: 'ata-' + Date.now(),
      sender: 'user',
      senderName: 'Você',
      text: `📋 Ata de Reunião: ${summary.title}`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      type: 'meeting_summary',
      meetingData: summary,
    };

    setMessages((prev) => ({
      ...prev,
      [activeConvId]: [...(prev[activeConvId] || []), ataMsg],
    }));
  };

  // Funções do Orçamento Vivo
  const handleUpdateQuoteTheme = (themeName: string) => {
    if (!activeConv) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === activeConvId ? { ...c, templateTheme: themeName } : c))
    );
  };

  const handleSendUpdatedQuote = () => {
    if (!activeConv) return;
    const quoteMsg: ChatMessageItem = {
      id: 'quote-' + Date.now(),
      sender: 'user',
      senderName: 'Você',
      text: 'Orçamento atualizado enviado diretamente na conversa',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      type: 'quote_card',
      quoteData: {
        packageName: 'Pacote Atualizado Personalizado',
        templateTheme: activeConv.templateTheme,
        total: activeConv.totalValue,
        paymentTerms: `Em até ${activeConv.totalInstallments}x sem juros via PIX/Cartão`,
        giftItem: 'Brinde Especial de Alinhamento Aplicado',
      },
    };

    setMessages((prev) => ({
      ...prev,
      [activeConvId]: [...(prev[activeConvId] || []), quoteMsg],
    }));
  };

  const handleConfirmPixPayment = () => {
    if (!activeConv || activeConv.installmentsRemaining <= 0) return;
    const installmentAmount = Math.round(activeConv.totalValue / activeConv.totalInstallments);

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConvId
          ? {
              ...c,
              paidValue: c.paidValue + installmentAmount,
              installmentsRemaining: Math.max(0, c.installmentsRemaining - 1),
            }
          : c
      )
    );

    // Envia recibo no chat
    const receiptMsg: ChatMessageItem = {
      id: 'rec-' + Date.now(),
      sender: 'user',
      senderName: 'Sistema Financeiro PriceU$',
      text: `✅ Pagamento de parcela de R$ ${installmentAmount.toLocaleString('pt-BR')} confirmado com sucesso via PIX!`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      type: 'text',
    };

    setMessages((prev) => ({
      ...prev,
      [activeConvId]: [...(prev[activeConvId] || []), receiptMsg],
    }));
  };

  const handleExportChat = async () => {
    if (!activeConv) {
      setToastFeedback('Selecione uma conversa para exportar.');
      setTimeout(() => setToastFeedback(null), 3000);
      return;
    }
    try {
      const exportData = {
        conversation: activeConv,
        messages: activeMessages,
        meetingSummaries: meetingSummaries[activeConvId] || [],
        exportedAt: new Date().toISOString(),
      };

      const encryptedBlob = await ChatEncryptionService.exportEncryptedChat(exportData);
      const url = URL.createObjectURL(encryptedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversa-${activeConv.clientName.replace(/\s+/g, '_')}.priceus-chat`;
      a.click();
      URL.revokeObjectURL(url);

      setToastFeedback(`Conversa criptografada com sucesso! Arquivo .priceus-chat protegido com chave exclusiva PriceU$.`);
      setTimeout(() => setToastFeedback(null), 5000);
    } catch (err: any) {
      alert('Erro ao exportar conversa: ' + err.message);
    }
  };

  const handleImportChat = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importedData = await ChatEncryptionService.importEncryptedChat(file);
      if (!importedData || !importedData.conversation) {
        throw new Error('Estrutura de dados corrompida ou inválida no cofre.');
      }

      const importedConv: ConversationItem = importedData.conversation;
      const importedMessages: ChatMessageItem[] = importedData.messages || [];
      const importedMeetings: MeetingSummaryData[] = importedData.meetingSummaries || [];

      // Adiciona ou substitui na lista de conversas
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === importedConv.id);
        if (exists) {
          return prev.map((c) => (c.id === importedConv.id ? importedConv : c));
        }
        return [importedConv, ...prev];
      });

      setMessages((prev) => ({
        ...prev,
        [importedConv.id]: importedMessages,
      }));

      setMeetingSummaries((prev) => ({
        ...prev,
        [importedConv.id]: importedMeetings,
      }));

      setActiveConvId(importedConv.id);
      setToastFeedback(`🎉 Conversa com ${importedConv.clientName} importada e autenticada com sucesso!`);
      setTimeout(() => setToastFeedback(null), 5000);
    } catch (err: any) {
      alert('Erro na importação: ' + err.message);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      c.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.eventType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.eventDate.includes(searchQuery);

    if (filterType === 'todos') return matchesSearch;
    if (filterType === 'contratado') return matchesSearch && c.status === 'contratado';
    if (filterType === 'negociando') return matchesSearch && c.status === 'negociando';
    return matchesSearch;
  });

  return (
    <div className="h-[calc(100dvh-75px)] sm:h-[calc(100vh-80px)] flex flex-col bg-gray-50 dark:bg-[#060c16] text-gray-900 dark:text-gray-100 rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden shadow-xl">
      {/* 🚀 Header Principal da Central de Conversas */}
      <div className="px-5 py-3.5 bg-white dark:bg-[#0a1424] border-b border-gray-200 dark:border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center font-bold">
            <MessageSquare size={20} />
          </div>
          <div>
            <h1 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
              Conversas & Atendimento
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-semibold">
                Plataforma Nativa
              </span>
            </h1>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Negociações, propostas vivas, atas de reuniões e contratos em um só lugar.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end">
          {/* Seletor de Status Online / Presença */}
          <button
            type="button"
            onClick={() => setIsPresenceModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 text-xs font-semibold transition-colors cursor-pointer"
            title="Configurar seu status online, tempo de resposta e botão de negociação"
          >
            <span
              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                vendorPresence.status === 'online'
                  ? 'bg-emerald-500 animate-pulse'
                  : vendorPresence.status === 'busy'
                  ? 'bg-amber-500'
                  : 'bg-gray-400'
              }`}
            />
            <span className="text-gray-700 dark:text-gray-300">
              {vendorPresence.status === 'online'
                ? 'Online Agora'
                : vendorPresence.status === 'busy'
                ? 'Ocupado'
                : 'Invisível'}
            </span>
            <ChevronDown size={13} className="text-gray-400" />
          </button>

          {/* Botão de Criação de Atendimento Manual para Testes Reais */}
          <button
            type="button"
            onClick={() => setIsNewClientModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shadow-emerald-600/20 cursor-pointer"
            title="Cadastrar cliente ou atendimento para testes"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Novo Atendimento</span>
          </button>

          {/* Alternância de Modo: Individual vs Mural de Cards */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 p-1 rounded-2xl border border-gray-200 dark:border-white/10">
            <button
              type="button"
              onClick={() => setViewMode('individual')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'individual'
                  ? 'bg-white dark:bg-emerald-600 text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <MessageSquare size={13} />
              <span>Individual</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-emerald-600 text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid size={13} />
              <span>Mural de Cards</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-bold">
                {filteredConversations.length}
              </span>
            </button>
          </div>

          {/* Input oculto para carregar arquivo .priceus-chat */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportChat}
            accept=".priceus-chat"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-gray-200 dark:border-white/10"
            title="Importar cofre criptografado exclusivo (.priceus-chat)"
          >
            <Upload size={14} />
            <span className="hidden sm:inline">Importar</span>
          </button>

          <button
            type="button"
            onClick={handleExportChat}
            className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-gray-200 dark:border-white/10"
            title="Exportar cofre criptografado exclusivo (.priceus-chat)"
          >
            <Lock size={13} className="text-emerald-500" />
            <span className="hidden sm:inline">Exportar</span>
          </button>
        </div>
      </div>

      {/* Toast Flutuante de Feedback */}
      {toastFeedback && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white border border-emerald-500/40 p-3.5 px-4 rounded-2xl shadow-2xl flex items-center gap-3 text-xs max-w-md animate-in slide-in-from-right duration-200">
          <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
          <span className="leading-snug">{toastFeedback}</span>
          <button
            type="button"
            onClick={() => setToastFeedback(null)}
            className="text-gray-400 hover:text-white ml-auto cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {viewMode === 'cards' ? (
        /* 🎛️ MURAL DE CONVERSAS EM CARDS (TEMPO REAL) */
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5 bg-gray-50/50 dark:bg-[#070e1b]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#091424] p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-white/5 shadow-xs">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <LayoutGrid size={18} className="text-emerald-500" />
                Mural de Atendimentos em Tempo Real
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Acompanhe o andamento de todos os clientes, orçamentos e eventos simultaneamente. Clique em qualquer card para entrar na conversa.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-500 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                ● {conversations.length} Atendimentos Ativos
              </span>
            </div>
          </div>

          {filteredConversations.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center rounded-2xl bg-white dark:bg-[#0a1424] border border-gray-200 dark:border-white/10 space-y-3">
              <div className="w-14 h-14 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                <LayoutGrid size={26} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Mural Vazio de Atendimentos</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-md leading-relaxed">
                  Nenhum atendimento ativo. Crie seu primeiro atendimento manual para testar o envio de propostas, formalização de contratos e atas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewClientModalOpen(true)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm shadow-emerald-600/20"
              >
                <Plus size={15} />
                <span>Novo Atendimento Manual</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredConversations.map((conv) => {
              const lastMsg = (messages[conv.id] || [])[(messages[conv.id] || []).length - 1];
              const atas = meetingSummaries[conv.id] || [];

              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    setActiveConvId(conv.id);
                    setMobilePane('chat');
                    setViewMode('individual');
                  }}
                  className="group rounded-2xl bg-white dark:bg-[#0a1424] border border-gray-200 dark:border-white/10 hover:border-emerald-500/50 p-5 space-y-4 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-base shadow-sm">
                            {conv.avatarLetter}
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0a1424]" />
                        </div>

                        <div>
                          <h3 className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                            {conv.clientName}
                          </h3>
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                            <span className="px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-white/5 font-semibold text-gray-700 dark:text-gray-300">
                              {conv.eventType}
                            </span>
                            <span>• {conv.eventDate}</span>
                          </div>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          conv.status === 'contratado'
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        }`}
                      >
                        {conv.status === 'contratado' ? 'Contratado' : 'Negociando'}
                      </span>
                    </div>

                    {/* Prévia da Última Mensagem */}
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-gray-400">
                        <span className="font-semibold text-gray-500 dark:text-gray-400">Última Mensagem</span>
                        <span>{conv.lastMessageTime}</span>
                      </div>
                      <p className="text-xs text-gray-700 dark:text-gray-300 truncate leading-snug">
                        "{conv.lastMessage}"
                      </p>
                    </div>

                    {/* Resumo do Orçamento & Parcelas */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                        <span className="text-[10px] text-gray-400 block">Proposta Total</span>
                        <strong className="text-sm font-black text-gray-900 dark:text-white">
                          R$ {conv.totalValue.toLocaleString('pt-BR')}
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                        <span className="text-[10px] text-gray-400 block">Parcelas</span>
                        <strong className="text-xs font-bold text-emerald-500">
                          {conv.totalInstallments - conv.installmentsRemaining}/{conv.totalInstallments} quitadas
                        </strong>
                      </div>
                    </div>

                    {/* Indicador de Ata de Reunião se houver */}
                    {atas.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px] text-indigo-400 font-medium bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-xl">
                        <FileText size={12} />
                        <span className="truncate">Ata: {atas[0].title}</span>
                      </div>
                    )}
                  </div>

                  {/* Rodapé do Card com Ação */}
                  <div className="pt-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-gray-400">
                      Origem: {conv.origin || 'Plataforma'}
                    </span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Abrir Atendimento ➔
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      ) : (
        /* 🧩 Corpo em 3 Colunas: [1. Lista] [2. Chat Central] [3. DealRoom Lateral] */
        <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* ═══ COLUNA 1: INBOX DE CONVERSAS (Estilo Moderno) ═══ */}
        <div className={`${mobilePane === 'list' ? 'flex w-full' : 'hidden md:flex'} md:w-80 lg:w-88 border-r border-gray-200 dark:border-white/5 bg-white dark:bg-[#08101d] flex-col flex-shrink-0`}>
          {/* Busca & Filtros */}
          <div className="p-3.5 space-y-2 border-b border-gray-100 dark:border-white/5">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar cliente, evento ou data..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-100 dark:bg-white/5 border border-transparent focus:border-emerald-500 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-1">
              {['todos', 'negociando', 'contratado'].map((ft) => (
                <button
                  key={ft}
                  type="button"
                  onClick={() => setFilterType(ft)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize whitespace-nowrap transition-colors cursor-pointer ${
                    filterType === ft
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                  }`}
                >
                  {ft}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de Conversas */}
          <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-gray-100 dark:divide-white/5">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center h-64 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/5 text-gray-400 flex items-center justify-center">
                  <MessageCircle size={22} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                    Nenhum atendimento na lista
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1 max-w-[200px] leading-relaxed">
                    Crie um atendimento manual para testar orçamentos, contratos e atas.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewClientModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Plus size={13} />
                  <span>Criar Atendimento</span>
                </button>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = conv.id === activeConvId;
                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setActiveConvId(conv.id);
                      setMobilePane('chat');
                    }}
                    className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 border-l-4 border-emerald-500'
                        : 'hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                        {conv.avatarLetter}
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-xs text-gray-900 dark:text-white truncate">
                          {conv.clientName}
                        </p>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {conv.lastMessageTime}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400">
                        <span className="px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-white/5 font-semibold text-gray-700 dark:text-gray-300">
                          {conv.eventType}
                        </span>
                        <span>• {conv.eventDate}</span>
                      </div>

                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate leading-snug">
                        {conv.lastMessage}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ═══ COLUNA 2: CHAT CENTRAL EM TEMPO REAL ═══ */}
        <div className={`${mobilePane === 'chat' ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-white dark:bg-[#070e1b] overflow-hidden min-w-0`}>
          {!activeConv ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-[#070e1b]">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4 border border-emerald-500/20">
                <MessageCircle size={32} />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Nenhum atendimento selecionado
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mt-1.5 leading-relaxed">
                Selecione um cliente na lista à esquerda ou inicie um novo atendimento manual para negociar propostas, emitir contratos e atas de reuniões.
              </p>
              <button
                type="button"
                onClick={() => setIsNewClientModalOpen(true)}
                className="mt-6 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <Plus size={15} />
                <span>Iniciar Novo Atendimento</span>
              </button>
            </div>
          ) : (
            <>
              {/* Header da Conversa Ativa */}
          <div className="p-3 sm:p-3.5 px-3 sm:px-5 border-b border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-[#091222] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobilePane('list')}
                className="md:hidden p-1.5 -ml-1 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors flex-shrink-0 cursor-pointer"
                title="Voltar para a lista de conversas"
              >
                <ChevronLeft size={22} />
              </button>

              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-xs sm:text-sm flex-shrink-0">
                {activeConv.avatarLetter}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h2 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                    {activeConv.clientName}
                  </h2>
                  <span className="hidden sm:inline text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold border border-emerald-500/20 whitespace-nowrap">
                    {activeConv.eventType}
                  </span>
                  <select
                    value={activeConv.status}
                    onChange={(e) => handleUpdateWorkflowStatus(e.target.value)}
                    className="text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 focus:outline-none cursor-pointer truncate max-w-[110px] sm:max-w-none"
                    title="Etapa do Funil / Workflow do Cliente"
                  >
                    <option value="negociando">💬 Negociando</option>
                    <option value="orcamento_enviado">📄 Orçamento Enviado</option>
                    <option value="reuniao_agendada">📅 Reunião Agendada</option>
                    <option value="contratado">✍️ Contratado / Fechado</option>
                  </select>
                  {activeConv.collabPartner && (
                    <span className="hidden md:inline-flex text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-semibold border border-indigo-500/20 items-center gap-1">
                      <Users size={11} /> {activeConv.collabPartner}
                    </span>
                  )}
                </div>
                <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5 sm:gap-2 truncate">
                  <span>📅 {activeConv.eventDate}</span>
                  <span>•</span>
                  <span>💰 R$ {activeConv.totalValue.toLocaleString('pt-BR')}</span>
                </p>
              </div>
            </div>

            {/* Ações Rápidas do Header */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsMeetingModalOpen(true)}
                className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                title="Iniciar Reunião Online com Áudio e Vídeo Seguros"
              >
                <Video size={14} />
                <span className="hidden sm:inline">Reunião Online</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSummaryModalOpen(true)}
                className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-700 dark:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-gray-200 dark:border-white/10"
                title="Anotar ou Registrar Nova Ata com Pauta e Decisões"
              >
                <FileText size={14} className="text-emerald-500" />
                <span className="hidden sm:inline">Nova Ata</span>
              </button>

              {/* Botão de Transição WhatsApp com Resumo da Proposta (Passo 4) */}
              {activeConv.clientPhone && (
                <button
                  type="button"
                  onClick={handleTransitionToWhatsApp}
                  className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Continuar ou migrar atendimento para WhatsApp com resumo compilado"
                >
                  <MessageSquare size={13} />
                  <span className="hidden sm:inline">WhatsApp</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                    setIsMobileDealRoomOpen(true);
                  } else {
                    setIsSidePanelOpen(!isSidePanelOpen);
                  }
                }}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  (isSidePanelOpen || isMobileDealRoomOpen)
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400'
                }`}
                title="Alternar Painel do Evento & Orçamento"
              >
                <DollarSign size={17} />
              </button>
            </div>
          </div>

          {/* Feed de Mensagens */}
          <div className="flex-1 min-h-0 p-4 sm:p-6 overflow-y-auto space-y-4 bg-gray-50/40 dark:bg-[#060c16]/60">
            {activeMessages.map((msg) => {
              const isMe = msg.sender === 'user';

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                >
                  <span className="text-[10px] text-gray-400 px-1 font-medium">
                    {msg.senderName} • {msg.timestamp}
                  </span>

                  {/* Renderização pelo tipo da mensagem */}
                  {msg.type === 'quote_card' && msg.quoteData ? (
                    /* Card de Proposta/Orçamento Interativo */
                    <div className="max-w-md w-full p-4 rounded-2xl bg-white dark:bg-[#0c182a] border border-emerald-500/30 shadow-lg space-y-3">
                      <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-2">
                        <span className="text-xs font-bold text-emerald-500 flex items-center gap-1.5">
                          <DollarSign size={14} /> Proposta Viva PriceU$
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                          Tema: {msg.quoteData.templateTheme}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                          {msg.quoteData.packageName}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Condições: {msg.quoteData.paymentTerms}
                        </p>
                        {msg.quoteData.giftItem && (
                          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 dark:text-amber-400 text-xs flex items-center gap-2 mt-2 font-medium">
                            <Gift size={14} />
                            <span>Bônus Especial: {msg.quoteData.giftItem}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-white/5">
                        <span className="text-xs text-gray-400">Investimento:</span>
                        <span className="text-base font-black text-gray-900 dark:text-white">
                          R$ {msg.quoteData.total.toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  ) : msg.type === 'meeting_summary' && msg.meetingData ? (
                    /* Card de Ata de Reunião */
                    <div className="max-w-md w-full p-4 rounded-2xl bg-white dark:bg-[#0c182a] border border-indigo-500/30 shadow-lg space-y-3">
                      <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-2">
                        <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                          <FileText size={14} /> Ata de Reunião Oficial
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {msg.meetingData.durationMinutes} min
                        </span>
                      </div>

                      <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                        {msg.meetingData.title}
                      </h4>

                      <div className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
                        <p className="font-semibold text-emerald-500">Decisões Acordadas:</p>
                        <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                          {msg.meetingData.decisionsAgreed.map((dec, i) => (
                            <li key={i}>{dec}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-[11px] text-gray-400">
                        <span>Participantes: {msg.meetingData.participants.join(', ')}</span>
                        <ShieldCheck size={14} className="text-emerald-400" />
                      </div>
                    </div>
                  ) : msg.type === 'audio' ? (
                    /* Mensagem de Áudio com Player Simples */
                    <div
                      className={`p-3 rounded-2xl flex items-center gap-3 ${
                        isMe
                          ? 'bg-emerald-600 text-white rounded-br-xs'
                          : 'bg-white dark:bg-[#0d1a2d] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-bl-xs'
                      }`}
                    >
                      <button
                        type="button"
                        className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs"
                      >
                        ▶
                      </button>
                      <div className="w-32 sm:w-44 h-1.5 bg-white/30 rounded-full" />
                      <span className="text-xs font-mono">{msg.audioDuration || '00:15'}</span>
                    </div>
                  ) : (
                    /* Mensagem de Texto Normal */
                    <div
                      className={`p-3.5 max-w-lg rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs whitespace-pre-wrap ${
                        isMe
                          ? 'bg-emerald-600 text-white rounded-br-xs'
                          : 'bg-white dark:bg-[#0d1a2d] border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-100 rounded-bl-xs'
                      }`}
                    >
                      {msg.text}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Barra de Input estilo WhatsApp com Gravador Nativo (Fixa, nunca empurra a tela) */}
          <div className="p-3.5 bg-white dark:bg-[#091222] border-t border-gray-200 dark:border-white/5 flex-shrink-0">
            {isRecordingAudio ? (
              <div className="flex items-center justify-between gap-3 p-2 bg-rose-500/10 border border-rose-500/30 rounded-2xl animate-pulse">
                <div className="flex items-center gap-2 text-rose-500 text-xs font-semibold">
                  <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                  <span>Gravando Áudio: {audioTimer}s</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRecordingAudio(false)}
                    className="px-3 py-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-white text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSendAudioMessage}
                    className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
                  >
                    Enviar Áudio
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => alert('Anexar arquivo: selecione PDFs, fotos ou vídeos')}
                  className="p-2.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  title="Anexar arquivo ou foto"
                >
                  <Paperclip size={18} />
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Escreva uma mensagem para o cliente..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-white/5 border border-transparent focus:border-emerald-500 text-[15px] sm:text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden"
                />

                <button
                  type="button"
                  onClick={() => setIsRecordingAudio(true)}
                  className="p-2.5 rounded-xl text-gray-400 hover:text-emerald-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  title="Gravar mensagem de voz"
                >
                  <Mic size={18} />
                </button>

                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                  title="Enviar mensagem"
                >
                  <Send size={18} />
                </button>
              </div>
            )}
          </div>
            </>
          )}
        </div>

        {/* ═══ COLUNA 3: DEALROOM & PAINEL DO EVENTO (Gaveta Lateral / Mobile Drawer) ═══ */}
        {activeConv && (isMobileDealRoomOpen || isSidePanelOpen) && (
          <div
            className={`
              ${isMobileDealRoomOpen ? 'fixed inset-0 z-50 flex justify-end lg:static lg:z-auto' : 'hidden lg:flex'}
              ${!isSidePanelOpen ? 'lg:hidden' : ''}
              flex-shrink-0
            `}
          >
            {/* Backdrop escuro no mobile */}
            {isMobileDealRoomOpen && (
              <div
                className="fixed inset-0 bg-black/60 backdrop-blur-xs lg:hidden animate-in fade-in"
                onClick={() => setIsMobileDealRoomOpen(false)}
              />
            )}

            <div className="relative w-full sm:max-w-md lg:max-w-none lg:w-80 xl:w-96 h-full bg-white dark:bg-[#08101d] border-l border-gray-200 dark:border-white/5 flex flex-col z-10 shadow-2xl lg:shadow-none flex-shrink-0 animate-in slide-in-from-right duration-200">
              {/* Header do DealRoom no Mobile com botão de fechar */}
              <div className="lg:hidden p-3.5 px-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-gray-50 dark:bg-[#0a1424]">
                <div className="flex items-center gap-2">
                  <DollarSign size={18} className="text-emerald-500" />
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">DealRoom & Painel do Evento</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileDealRoomOpen(false)}
                  className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Seletor de Abas do DealRoom */}
            <div className="flex items-center border-b border-gray-200 dark:border-white/5 p-2 gap-1 overflow-x-auto no-scrollbar">
              {[
                { id: 'quote', label: 'Orçamento', icon: DollarSign },
                { id: 'contract', label: 'Contrato', icon: FileCheck },
                { id: 'agenda', label: 'Agenda & Datas', icon: Calendar },
                { id: 'gallery', label: 'Galerias', icon: Image },
                { id: 'finance', label: 'Financeiro', icon: CreditCard },
                { id: 'meetings', label: 'Atas Reunião', icon: FileText },
                { id: 'copilot', label: 'Copiloto IA', icon: Bot },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeSideTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSideTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <Icon size={13} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Conteúdo Dinâmico da Aba Selecionada */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
              {activeSideTab === 'quote' && (
                /* 📑 ABA: ORÇAMENTO VIVO */
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 space-y-2">
                    <span className="font-semibold text-gray-500">Valor Acordado Atual</span>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">
                      R$ {activeConv.totalValue.toLocaleString('pt-BR')}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      Evento: {activeConv.eventType} • {activeConv.eventDate}
                    </p>
                  </div>

                  {/* Seletor de Tema / Template do Orçamento */}
                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                      <Palette size={13} className="text-emerald-500" /> Tema Visual do Orçamento
                    </label>
                    <select
                      value={activeConv.templateTheme}
                      onChange={(e) => handleUpdateQuoteTheme(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500/30 focus:outline-hidden"
                    >
                      <option value="Romântico Clean">Romântico Clean (Casamentos)</option>
                      <option value="Dark Studio Luxo">Dark Studio Luxo</option>
                      <option value="Moderno Corporativo">Moderno Corporativo</option>
                      <option value="Minimalista">Minimalista Editorial</option>
                    </select>
                  </div>

                  {/* Ações Rápidas de Negociação */}
                  <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-white/5">
                    <p className="font-semibold text-gray-700 dark:text-gray-300">Ações Rápidas</p>
                    <button
                      type="button"
                      onClick={() => {
                        setConversations((prev) =>
                          prev.map((c) =>
                            c.id === activeConvId ? { ...c, totalValue: Math.round(c.totalValue * 0.93) } : c
                          )
                        );
                        handleSendMessage('Apliquei um desconto exclusivo de 7% para quitação à vista!');
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 font-semibold text-xs transition-colors flex items-center justify-between"
                    >
                      <span>Aplicar 7% OFF à Vista / PIX</span>
                      <span>✓</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleSendMessage('Acrescentei o Ensaio Pré-Evento como brinde de cortesia no pacote!');
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-semibold text-xs transition-colors flex items-center justify-between"
                    >
                      <span>🎁 Oferecer Ensaio Cortesia</span>
                      <span>+</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSendUpdatedQuote}
                      className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-600/20 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Send size={13} /> Enviar Proposta Atualizada no Chat
                    </button>
                  </div>

                  {/* Templates Reais do Fotógrafo */}
                  <div className="pt-3 border-t border-gray-100 dark:border-white/5 space-y-2">
                    <p className="font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                      <span>Outros Pacotes Cadastrados</span>
                      <span className="text-[10px] text-gray-400">({userTemplates.length})</span>
                    </p>
                    {userTemplates.length === 0 ? (
                      <p className="text-[11px] text-gray-400 italic">Nenhum template adicional encontrado.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-44 overflow-y-auto no-scrollbar">
                        {userTemplates.map((tpl) => (
                          <div
                            key={tpl.id}
                            className="p-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 dark:text-white truncate text-[11px]">
                                {tpl.name}
                              </p>
                              <span className="text-[10px] text-emerald-500 font-bold">
                                R$ {(tpl.price || 0).toLocaleString('pt-BR')}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSendTemplateInChat(tpl)}
                              className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 transition-colors flex-shrink-0 cursor-pointer"
                              title="Enviar este pacote no chat"
                            >
                              <Send size={10} /> Enviar
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeSideTab === 'contract' && (
                /* ✍️ ABA: CONTRATO & JURÍDICO */
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-500">Status do Contrato</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold border border-emerald-500/20">
                        {activeConv.status === 'contratado' ? 'Assinado' : 'Minuta Pronta'}
                      </span>
                    </div>
                    <p className="font-mono text-xs text-gray-400">CTR-2027-{activeConv.id.slice(0, 6)}</p>
                  </div>

                  <div className="space-y-3">
                    <p className="font-semibold text-gray-700 dark:text-gray-300">
                      Dados do Contratante (Edição sem sair do chat)
                    </p>
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1">Nome Completo</label>
                      <input
                        type="text"
                        value={activeConv.clientName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setConversations((p) =>
                            p.map((c) => (c.id === activeConvId ? { ...c, clientName: val } : c))
                          );
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1">CPF</label>
                      <input
                        type="text"
                        value={activeConv.clientCpf || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setConversations((p) =>
                            p.map((c) => (c.id === activeConvId ? { ...c, clientCpf: val } : c))
                          );
                        }}
                        placeholder="000.000.000-00"
                        className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSendContractInChat()}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <FileCheck size={14} /> Enviar Link de Assinatura Digital no Chat
                  </button>

                  {/* Contratos Digitais do Banco */}
                  {userContracts.length > 0 && (
                    <div className="pt-2 border-t border-gray-100 dark:border-white/5 space-y-2">
                      <p className="font-semibold text-gray-700 dark:text-gray-300 text-[11px]">
                        Contratos Registrados ({userContracts.length})
                      </p>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar">
                        {userContracts.map((ctr) => (
                          <div
                            key={ctr.id}
                            className="p-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 flex items-center justify-between text-[11px]"
                          >
                            <div>
                              <span className="font-bold text-gray-900 dark:text-white block">
                                CTR-{ctr.id.slice(0, 6)}
                              </span>
                              <span className="text-[10px] text-gray-400 capitalize">
                                {ctr.status || 'Pendente'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSendContractInChat(ctr.token)}
                              className="px-2 py-1 rounded-lg bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600 hover:text-white text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              Enviar
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeSideTab === 'agenda' && (
                /* 📅 ABA: AGENDA, DATAS & AGENDAMENTOS */
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 space-y-2">
                    <span className="font-semibold text-gray-500">Data do Evento do Cliente</span>
                    <p className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                      <Calendar className="text-emerald-500 w-5 h-5" />
                      {activeConv.eventDate}
                    </p>
                    {/* Verificação automática de disponibilidade */}
                    {(() => {
                      const isBooked = userAgendaEvents.some(
                        (e) => e.data_evento === activeConv.eventDate && e.status !== 'cancelado'
                      );
                      return isBooked ? (
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 font-semibold text-xs flex items-center gap-2">
                          <AlertCircle size={14} />
                          <span>Já existe compromisso nesta data!</span>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-semibold text-xs flex items-center gap-2">
                          <CheckCircle2 size={14} />
                          <span>Data 100% Livre na sua Agenda!</span>
                        </div>
                      );
                    })()}
                  </div>

                  <button
                    type="button"
                    onClick={handleScheduleEventInAgenda}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-600/20 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CalendarCheck size={14} /> Confirmar & Bloquear Data na Agenda
                  </button>

                  <div className="pt-2 border-t border-gray-100 dark:border-white/5 space-y-2">
                    <p className="font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                      <span>Próximos Eventos Agendados</span>
                      <span className="text-[10px] text-gray-400">({userAgendaEvents.length})</span>
                    </p>
                    {userAgendaEvents.length === 0 ? (
                      <p className="text-[11px] text-gray-400 italic">Nenhum evento futuro registrado.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
                        {userAgendaEvents.slice(0, 8).map((evt) => (
                          <div
                            key={evt.id}
                            className="p-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 flex items-center justify-between text-[11px]"
                          >
                            <div>
                              <span className="font-bold text-gray-900 dark:text-white block">
                                {evt.data_evento}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {evt.cliente_nome || evt.tipo_evento || 'Evento'}
                              </span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
                              {evt.status || 'Confirmado'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeSideTab === 'gallery' && (
                /* 🖼️ ABA: GALERIAS DE ENTREGA DE FOTOS */
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 space-y-1">
                    <span className="font-semibold text-gray-500">Entrega de Fotos & Seleção</span>
                    <p className="text-[11px] text-gray-400">
                      Envie o link da galeria diretamente na conversa para a noiva/cliente aprovar ou baixar.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                      <span>Suas Galerias Criadas</span>
                      <span className="text-[10px] text-gray-400">({userGalleries.length})</span>
                    </p>

                    {userGalleries.length === 0 ? (
                      <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-dashed border-gray-300 dark:border-white/10 text-center text-[11px] text-gray-400">
                        Nenhuma galeria cadastrada ainda. Crie uma galeria no módulo de Galerias.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
                        {userGalleries.map((gal) => (
                          <div
                            key={gal.id}
                            className="p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 flex items-center justify-between gap-2.5"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {gal.cover_photo_url ? (
                                <img
                                  src={gal.cover_photo_url}
                                  alt={gal.title}
                                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center flex-shrink-0">
                                  <Image size={18} />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-bold text-gray-900 dark:text-white truncate text-xs">
                                  {gal.title}
                                </p>
                                <span className="text-[10px] text-gray-400 block truncate">
                                  /{gal.slug}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSendGalleryInChat(gal)}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 transition-all flex-shrink-0 cursor-pointer shadow-xs"
                              title="Enviar link da galeria no chat"
                            >
                              <Send size={11} /> Enviar
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeSideTab === 'finance' && (
                /* 💳 ABA: FINANCEIRO & PARCELAS */
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                      <span className="text-[10px] text-emerald-500 block font-semibold">Total Pago</span>
                      <strong className="text-sm text-emerald-600 dark:text-emerald-400 font-black">
                        R$ {activeConv.paidValue.toLocaleString('pt-BR')}
                      </strong>
                    </div>
                    <div className="p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                      <span className="text-[10px] text-gray-400 block font-semibold">Saldo a Receber</span>
                      <strong className="text-sm text-gray-900 dark:text-white font-black">
                        R$ {(activeConv.totalValue - activeConv.paidValue).toLocaleString('pt-BR')}
                      </strong>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        Controle de Parcelas
                      </span>
                      <span className="text-[10px] text-emerald-500 font-bold">
                        {activeConv.totalInstallments - activeConv.installmentsRemaining} /{' '}
                        {activeConv.totalInstallments} pagas
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-400">
                      Restam {activeConv.installmentsRemaining} parcelas de R${' '}
                      {Math.round(activeConv.totalValue / activeConv.totalInstallments).toLocaleString('pt-BR')}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmPixPayment}
                    disabled={activeConv.installmentsRemaining <= 0}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-600/20 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle2 size={14} /> Confirmar Recebimento (PIX / Cartão)
                  </button>
                </div>
              )}

              {activeSideTab === 'meetings' && (
                /* 📅 ABA: HISTÓRICO DE ATAS DE REUNIÃO */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      Atas & Alinhamentos
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsSummaryModalOpen(true)}
                      className="text-xs text-emerald-500 font-bold hover:underline"
                    >
                      + Nova Ata
                    </button>
                  </div>

                  {(meetingSummaries[activeConvId] || []).map((meet) => (
                    <div
                      key={meet.id}
                      className="p-3.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <strong className="text-gray-900 dark:text-white font-bold text-xs">
                          {meet.title}
                        </strong>
                        <span className="text-[10px] text-gray-400">{meet.durationMinutes}m</span>
                      </div>

                      <div className="text-[11px] text-gray-600 dark:text-gray-400 space-y-1">
                        <p className="font-semibold text-emerald-500">Decisões:</p>
                        <ul className="list-disc pl-4 space-y-0.5">
                          {meet.decisionsAgreed.map((dec, i) => (
                            <li key={i}>{dec}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}

                  {(!meetingSummaries[activeConvId] || meetingSummaries[activeConvId].length === 0) && (
                    <p className="text-xs text-gray-400 py-3 text-center">
                      Nenhuma ata de reunião registrada para este evento ainda.
                    </p>
                  )}
                </div>
              )}

              {activeSideTab === 'copilot' && (
                /* 🤖 ABA: COPILOTO IA MULTI-JANELA */
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold flex items-center gap-2">
                    <Sparkles size={16} />
                    <span>Copiloto de Vendas & Negociação PriceU$</span>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    A IA analisou as últimas mensagens deste cliente e recomenda:
                  </p>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleSendMessage(
                          'Conseguimos fazer a entrada em 2x no PIX e o restante em até 8x sem juros! O que acham?'
                        )
                      }
                      className="w-full text-left p-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-emerald-500/10 border border-gray-200 dark:border-white/10 text-xs transition-colors"
                    >
                      💡 <strong>Sugerir parcelamento da entrada:</strong> "Conseguimos fazer a entrada em 2x no PIX e o restante em até 8x sem juros!"
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleSendMessage(
                          'Caso prefiram fechar nesta semana, consigo segurar o valor da tabela antiga sem o reajuste de 2027!'
                        )
                      }
                      className="w-full text-left p-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-emerald-500/10 border border-gray-200 dark:border-white/10 text-xs transition-colors"
                    >
                      ⚡ <strong>Gatilho de urgência:</strong> "Consigo segurar a tabela antiga sem o reajuste de 2027 se confirmarmos nesta semana!"
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
      )}

      {/* Modal de Reunião Online */}
      <OnlineMeetingModal
        isOpen={isMeetingModalOpen}
        onClose={() => setIsMeetingModalOpen(false)}
        clientName={activeConv?.clientName || 'Cliente'}
        onFinishAndCreateSummary={(aiDraft) => {
          if (aiDraft) setAiDraftSummary(aiDraft);
          setIsMeetingModalOpen(false);
          setIsSummaryModalOpen(true);
        }}
      />

      {/* Modal de Ata de Reunião com Pauta e Assuntos Decididos */}
      <MeetingSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => {
          setIsSummaryModalOpen(false);
          setAiDraftSummary(null);
        }}
        clientName={activeConv?.clientName || 'Cliente'}
        eventDate={activeConv?.eventDate || 'A definir'}
        onSaveMeetingSummary={handleSaveMeetingSummary}
        initialData={aiDraftSummary as any}
      />

      {/* 🚀 Modal de Novo Atendimento Manual para Testes Reais */}
      {isNewClientModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[70] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#091424] border border-gray-200 dark:border-white/10 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">Novo Atendimento Manual</h3>
                  <p className="text-[11px] text-gray-400">Cadastre um cliente para testar todo o ecossistema</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewClientModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateManualClient} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Nome do Cliente / Noivos *
                </label>
                <input
                  type="text"
                  required
                  value={newClientForm.clientName}
                  onChange={(e) => setNewClientForm({ ...newClientForm, clientName: e.target.value })}
                  placeholder="Ex: Camila & Leonardo"
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Tipo de Evento
                  </label>
                  <select
                    value={newClientForm.eventType}
                    onChange={(e) => setNewClientForm({ ...newClientForm, eventType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-xs focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Casamento">💍 Casamento</option>
                    <option value="15 Anos">👑 15 Anos</option>
                    <option value="Ensaio">📸 Ensaio</option>
                    <option value="Corporativo">🏢 Corporativo</option>
                    <option value="Aniversário">🎂 Aniversário</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Data do Evento
                  </label>
                  <input
                    type="date"
                    value={newClientForm.eventDate}
                    onChange={(e) => setNewClientForm({ ...newClientForm, eventDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    WhatsApp / Celular
                  </label>
                  <input
                    type="text"
                    value={newClientForm.clientPhone}
                    onChange={(e) => setNewClientForm({ ...newClientForm, clientPhone: e.target.value })}
                    placeholder="(11) 99999-9999"
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={newClientForm.clientEmail}
                    onChange={(e) => setNewClientForm({ ...newClientForm, clientEmail: e.target.value })}
                    placeholder="cliente@email.com"
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Valor Inicial (R$)
                  </label>
                  <input
                    type="number"
                    value={newClientForm.totalValue}
                    onChange={(e) => setNewClientForm({ ...newClientForm, totalValue: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Origem
                  </label>
                  <select
                    value={newClientForm.origin}
                    onChange={(e) => setNewClientForm({ ...newClientForm, origin: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-xs focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Manual">Manual</option>
                    <option value="Marketplace">Marketplace Noiva</option>
                    <option value="Indicação">Indicação</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Site">Site Próprio</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setIsNewClientModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-500 hover:text-gray-700 dark:hover:text-white text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer transition-all shadow-md shadow-emerald-600/20"
                >
                  Criar Atendimento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🟢 Modal de Presença Online & Tempo de Resposta */}
      {isPresenceModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[70] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#091424] border border-gray-200 dark:border-white/10 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">Presença & Status Online</h3>
                  <p className="text-[11px] text-gray-400">Defina como você aparece para noivas e clientes</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPresenceModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Opções de Status */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Status de Atendimento
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'online', label: 'Online Agora', color: 'bg-emerald-500', desc: 'Ao vivo' },
                    { id: 'busy', label: 'Ocupado', color: 'bg-amber-500', desc: 'Em breve' },
                    { id: 'invisible', label: 'Invisível', color: 'bg-gray-400', desc: 'Oculto' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => handleUpdatePresence({ status: st.id as any })}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                        vendorPresence.status === st.id
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                          : 'border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${st.color} mb-1.5`} />
                      <p className="text-xs font-bold">{st.label}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{st.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tempo Médio de Resposta */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Tempo Médio de Resposta Exibido aos Clientes
                </label>
                <select
                  value={vendorPresence.responseTimeText || 'Responde em poucos minutos'}
                  onChange={(e) => handleUpdatePresence({ responseTimeText: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-xs focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Responde em poucos minutos">⚡ Responde em poucos minutos</option>
                  <option value="Responde em até 15 minutos">⏱️ Responde em até 15 minutos</option>
                  <option value="Responde em até 1 hora">🕒 Responde em até 1 hora</option>
                  <option value="Responde no mesmo dia">📅 Responde no mesmo dia</option>
                </select>
              </div>

              {/* Horário de Atendimento */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Texto de Atendimento / Horário
                </label>
                <input
                  type="text"
                  value={vendorPresence.workingHoursText || 'Disponível agora'}
                  onChange={(e) => handleUpdatePresence({ workingHoursText: e.target.value })}
                  placeholder="Ex: Atendimento ativo hoje até às 21h"
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Texto Personalizado do Botão de Negociação no Quote */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Texto do Botão de Negociação na Proposta
                </label>
                <input
                  type="text"
                  value={vendorPresence.customNegotiationBtnText || 'Negociar Proposta Online'}
                  onChange={(e) => handleUpdatePresence({ customNegotiationBtnText: e.target.value })}
                  placeholder="Ex: Negociar Condição Especial ao Vivo"
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Exibir ou Não Status Online */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                <div>
                  <p className="font-bold text-xs text-gray-900 dark:text-white">Exibir badge de status online</p>
                  <p className="text-[10px] text-gray-400">Mostrar indicador verde/tempo de resposta nas propostas</p>
                </div>
                <input
                  type="checkbox"
                  checked={vendorPresence.showOnlineStatus}
                  onChange={(e) => handleUpdatePresence({ showOnlineStatus: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsPresenceModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white hover:bg-slate-800 text-white dark:text-slate-900 font-bold text-xs cursor-pointer transition-all"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
