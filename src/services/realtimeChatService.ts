import { supabase } from '../lib/supabase';
import { BrideMarketplaceService, BrideProfile } from './brideMarketplaceService';

export interface ChatMessageRecord {
  id: string;
  conversation_id: string;
  sender_type: 'bride' | 'vendor' | 'ai_copilot';
  sender_name: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface QuoteConversationSession {
  conversationId: string;
  brideProfile: BrideProfile;
  vendorId: string;
}

export interface SharedConversationMeta {
  id: string;
  vendor_id: string;
  bride_id: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  event_date?: string;
  event_city?: string;
  package_name: string;
  total_value: number;
  last_message: string;
  last_message_at: string;
  session_token?: string;
  template_id?: string;
}

export class RealtimeChatService {
  private static broadcastChannel: BroadcastChannel | null =
    typeof window !== 'undefined' && 'BroadcastChannel' in window
      ? new BroadcastChannel('priceus_chat_sync')
      : null;

  /**
   * Obtém chave de persistência local da sessão de chat da proposta
   */
  private static getStorageKey(templateId: string): string {
    return `priceus_quote_chat_${templateId}`;
  }

  /**
   * Recupera a sessão de chat ativa armazenada no navegador (se existir)
   */
  static getStoredSession(templateId: string): QuoteConversationSession | null {
    try {
      const saved = localStorage.getItem(this.getStorageKey(templateId));
      if (!saved) return null;
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }

  /**
   * Salva a sessão de chat ativa no navegador
   */
  static saveStoredSession(templateId: string, session: QuoteConversationSession): void {
    try {
      localStorage.setItem(this.getStorageKey(templateId), JSON.stringify(session));
    } catch (e) {
      console.warn('[RealtimeChatService] Não foi possível salvar sessão no localStorage:', e);
    }
  }

  /**
   * Recupera todas as conversas compartilhadas salvas localmente
   */
  static getAllLocalConversations(vendorId?: string): SharedConversationMeta[] {
    try {
      const data = localStorage.getItem('priceus_all_conversations');
      const list: SharedConversationMeta[] = data ? JSON.parse(data) : [];
      if (!vendorId) return list;
      return list.filter((c) => c.vendor_id === vendorId);
    } catch {
      return [];
    }
  }

  /**
   * Salva ou atualiza uma conversa na lista compartilhada e emite broadcast
   */
  static saveLocalConversation(conv: SharedConversationMeta): void {
    try {
      const all = this.getAllLocalConversations();
      const index = all.findIndex((c) => c.id === conv.id);
      if (index >= 0) {
        all[index] = { ...all[index], ...conv };
      } else {
        all.unshift(conv);
      }
      localStorage.setItem('priceus_all_conversations', JSON.stringify(all));

      // Emite evento no mesmo frame/janela
      window.dispatchEvent(new CustomEvent('priceus_conversation_updated', { detail: conv }));

      // Emite no BroadcastChannel para outras abas (ex: Studio do Fornecedor <-> Quote ou Portal Noiva)
      this.broadcastChannel?.postMessage({ type: 'CONVERSATION_UPDATED', payload: conv });
    } catch (e) {
      console.warn('[RealtimeChatService] Erro ao salvar conversa local:', e);
    }
  }

  /**
   * Inicia ou recupera uma conversa de negociação vinculada à proposta
   * Cria perfil de lead/cliente, registra lead no dashboard do fornecedor e envia resumo inicial da proposta
   */
  static async initQuoteConversation(params: {
    vendorId: string;
    vendorName?: string;
    clientName: string;
    clientEmail: string;
    clientPhone?: string;
    eventDate?: string;
    eventCity?: string;
    templateId: string;
    templateName: string;
    selectedPackageName?: string;
    totalValue: number;
    quoteDetails?: Record<string, any>;
    itemsList?: string[];
    paymentTerms?: string;
  }): Promise<QuoteConversationSession> {
    const {
      vendorId,
      vendorName,
      clientName,
      clientEmail,
      clientPhone,
      eventDate,
      eventCity,
      templateId,
      templateName,
      selectedPackageName,
      totalValue,
      paymentTerms,
    } = params;

    // 1. Verifica se já existe sessão válida salva localmente
    const existingSession = this.getStoredSession(templateId);
    if (existingSession && existingSession.conversationId) {
      // Confirma se a conversa ainda existe no banco
      const { data: convCheck } = await supabase
        .from('marketplace_chat_conversations')
        .select('id')
        .eq('id', existingSession.conversationId)
        .maybeSingle();

      if (convCheck) {
        return existingSession;
      }
    }

    // 2. Cria ou recupera o perfil de lead/noiva (com session token)
    const brideProfile = await BrideMarketplaceService.loginOrCreateBride({
      nome_noiva: clientName,
      email: clientEmail,
      telefone: clientPhone,
      data_casamento: eventDate,
      cidade: eventCity,
      orcamento_planejado: totalValue,
    });

    // 3. Cria a conversa vinculada ao fornecedor
    let conversationId = '';
    try {
      const { data: conv, error: convError } = await supabase
        .from('marketplace_chat_conversations')
        .insert({
          bride_id: brideProfile.id,
          vendor_id: vendorId,
          status: 'active',
          ai_copilot_enabled: true,
          last_message: `Proposta aberta: ${selectedPackageName || templateName} (R$ ${totalValue.toLocaleString('pt-BR')})`,
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (convError) throw convError;
      conversationId = conv.id;
    } catch (err) {
      console.warn('[RealtimeChatService] Fallback de criação de conversa:', err);
      conversationId = `conv-fallback-${Date.now()}`;
    }

    // 4. Salva a proposta no workspace da noiva
    try {
      await BrideMarketplaceService.saveQuoteForBride({
        bride_id: brideProfile.id,
        vendor_id: vendorId,
        vendor_name: vendorName || 'Fornecedor PriceU$',
        category: 'fotografia',
        package_name: selectedPackageName || templateName,
        total_value: totalValue,
        quote_details: {
          templateId,
          templateName,
          paymentTerms: paymentTerms || 'À vista ou parcelado',
          createdAt: new Date().toISOString(),
        },
        status: 'negotiating',
        tab_order: 1,
      });
    } catch (e) {
      console.warn('[RealtimeChatService] Aviso ao salvar quote no workspace:', e);
    }

    // 5. Registra lead no dashboard do fornecedor (para aparecer na coluna de Leads/Funil)
    try {
      await BrideMarketplaceService.registerLeadInVendorDashboard({
        vendorId,
        brideProfile,
        total: totalValue,
        packageName: selectedPackageName || templateName,
        actionType: 'orcamento_negociado',
        templateId,
        notes: `Iniciou chat online direto pela página de orçamento (${templateName}).`,
      });
    } catch (e) {
      console.warn('[RealtimeChatService] Aviso ao registrar lead no dashboard:', e);
    }

    // 6. Envia mensagem inaugural estruturada com a proposta e boas-vindas do Copiloto
    try {
      const packageCardContent = JSON.stringify({
        type: 'quote_card',
        packageName: selectedPackageName || templateName,
        total: totalValue,
        paymentTerms: paymentTerms || 'À vista ou parcelado',
        eventDate: eventDate || 'A definir',
      });

      // Card da proposta selecionada
      await this.sendMessage({
        conversationId,
        senderType: 'bride',
        senderName: clientName,
        content: `PROPOSTA_CARD:${packageCardContent}`,
      });

      // Boas-vindas amigáveis do Copiloto PriceU$
      await this.sendMessage({
        conversationId,
        senderType: 'ai_copilot',
        senderName: 'Copiloto PriceU$',
        content: `Olá, ${clientName}! 👋 Recebemos a sua proposta para ${selectedPackageName || templateName}. O profissional já foi notificado e você pode conversar e tirar dúvidas por aqui em tempo real.`,
      });
    } catch (e) {
      console.warn('[RealtimeChatService] Falha ao enviar mensagens iniciais:', e);
    }

    const session: QuoteConversationSession = {
      conversationId,
      brideProfile,
      vendorId,
    };

    this.saveStoredSession(templateId, session);

    // Salva na lista compartilhada de conversas para o Dashboard do Fornecedor / Studio
    this.saveLocalConversation({
      id: conversationId,
      vendor_id: vendorId,
      bride_id: brideProfile.id,
      client_name: clientName,
      client_email: clientEmail,
      client_phone: clientPhone,
      event_date: eventDate,
      event_city: eventCity,
      package_name: selectedPackageName || templateName,
      total_value: totalValue,
      last_message: `Proposta aberta: ${selectedPackageName || templateName}`,
      last_message_at: new Date().toISOString(),
      session_token: brideProfile.session_token,
      template_id: templateId,
    });

    return session;
  }

  /**
   * Armazenamento local de fallback para mensagens (sandbox/offline)
   */
  private static getLocalMessages(conversationId: string): ChatMessageRecord[] {
    try {
      const data = localStorage.getItem(`priceus_chat_msgs_${conversationId}`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private static saveLocalMessage(msg: ChatMessageRecord): void {
    try {
      const msgs = this.getLocalMessages(msg.conversation_id);
      // Evita duplicar no localStorage se já tiver mesmo id OU mesmo sender+content nos últimos 15s
      const isAlreadyInLocal = msgs.some((m) => {
        if (m.id === msg.id) return true;
        if (m.sender_type === msg.sender_type && m.content.trim() === msg.content.trim()) {
          const t1 = new Date(m.created_at).getTime();
          const t2 = new Date(msg.created_at).getTime();
          return Math.abs(t1 - t2) < 15000;
        }
        return false;
      });

      if (!isAlreadyInLocal) {
        msgs.push(msg);
        localStorage.setItem(`priceus_chat_msgs_${msg.conversation_id}`, JSON.stringify(msgs));
      }

      // Atualiza a conversa na lista compartilhada
      const previewText = msg.content.startsWith('PROPOSTA_CARD:')
        ? '📋 [Proposta Interativa Enviada]'
        : msg.content.startsWith('AUDIO_MSG:')
        ? '🎙️ [Mensagem de Áudio]'
        : msg.content;

      const allConvs = this.getAllLocalConversations();
      const targetConv = allConvs.find((c) => c.id === msg.conversation_id);
      if (targetConv) {
        targetConv.last_message = previewText;
        targetConv.last_message_at = msg.created_at;
        localStorage.setItem('priceus_all_conversations', JSON.stringify(allConvs));
        window.dispatchEvent(new CustomEvent('priceus_conversation_updated', { detail: targetConv }));
      }

      window.dispatchEvent(new CustomEvent('priceus_chat_message', { detail: msg }));
      this.broadcastChannel?.postMessage({ type: 'NEW_MESSAGE', payload: msg });
    } catch (e) {
      console.warn('Erro ao salvar mensagem local:', e);
    }
  }

  /**
   * Busca mensagens históricas de uma conversa com deduplicação de segurança
   */
  static async fetchMessages(conversationId: string): Promise<ChatMessageRecord[]> {
    try {
      const { data, error } = await supabase
        .from('marketplace_chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      let list: ChatMessageRecord[] = [];
      if (!error && data && data.length > 0) {
        list = data;
      } else {
        list = this.getLocalMessages(conversationId);
      }

      // Deduplica rigorosamente a lista para evitar qualquer duplicação histórica
      const cleanList: ChatMessageRecord[] = [];
      for (const m of list) {
        const isDup = cleanList.some((c) => {
          if (c.id === m.id) return true;
          if (c.sender_type === m.sender_type && c.content.trim() === m.content.trim()) {
            const t1 = new Date(c.created_at).getTime();
            const t2 = new Date(m.created_at).getTime();
            return Math.abs(t1 - t2) < 15000;
          }
          return false;
        });

        if (!isDup) {
          cleanList.push(m);
        }
      }

      // Sincroniza cache local limpo
      try {
        localStorage.setItem(`priceus_chat_msgs_${conversationId}`, JSON.stringify(cleanList));
      } catch (e) {}

      return cleanList;
    } catch (err) {
      const raw = this.getLocalMessages(conversationId);
      const cleanList: ChatMessageRecord[] = [];
      for (const m of raw) {
        const isDup = cleanList.some((c) => {
          if (c.id === m.id) return true;
          if (c.sender_type === m.sender_type && c.content.trim() === m.content.trim()) {
            const t1 = new Date(c.created_at).getTime();
            const t2 = new Date(m.created_at).getTime();
            return Math.abs(t1 - t2) < 15000;
          }
          return false;
        });
        if (!isDup) cleanList.push(m);
      }
      return cleanList;
    }
  }

  /**
   * Envia uma mensagem e atualiza o timestamp da conversa
   */
  static async sendMessage(params: {
    conversationId: string;
    senderType: 'bride' | 'vendor' | 'ai_copilot';
    senderName: string;
    content: string;
  }): Promise<ChatMessageRecord> {
    const { conversationId, senderType, senderName, content } = params;

    try {
      const { data, error } = await supabase
        .from('marketplace_chat_messages')
        .insert({
          conversation_id: conversationId,
          sender_type: senderType,
          sender_name: senderName,
          content,
          is_read: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Atualiza a última mensagem na conversa
      const previewText = content.startsWith('PROPOSTA_CARD:')
        ? '📋 [Proposta Interativa Enviada]'
        : content.startsWith('AUDIO_MSG:')
        ? '🎙️ [Mensagem de Áudio]'
        : content;

      await supabase
        .from('marketplace_chat_conversations')
        .update({
          last_message: previewText,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      this.saveLocalMessage(data);
      return data;
    } catch (err) {
      const localMsg: ChatMessageRecord = {
        id: `local-msg-${Date.now()}`,
        conversation_id: conversationId,
        sender_type: senderType,
        sender_name: senderName,
        content,
        is_read: false,
        created_at: new Date().toISOString(),
      };
      this.saveLocalMessage(localMsg);
      return localMsg;
    }
  }

  /**
   * Assina atualizações em tempo real de mensagens de uma conversa específica
   */
  static subscribeToConversation(
    conversationId: string,
    onMessage: (message: ChatMessageRecord) => void
  ): () => void {
    const channelName = `realtime_chat_${conversationId}_${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'marketplace_chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (payload.new) {
            onMessage(payload.new as ChatMessageRecord);
          }
        }
      )
      .subscribe();

    const localHandler = (e: any) => {
      const msg = e.detail as ChatMessageRecord;
      if (msg && msg.conversation_id === conversationId) {
        onMessage(msg);
      }
    };
    window.addEventListener('priceus_chat_message', localHandler);

    const bcHandler = (e: MessageEvent) => {
      if (e.data?.type === 'NEW_MESSAGE' && e.data?.payload) {
        const msg = e.data.payload as ChatMessageRecord;
        if (msg.conversation_id === conversationId) {
          onMessage(msg);
        }
      }
    };
    this.broadcastChannel?.addEventListener('message', bcHandler);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('priceus_chat_message', localHandler);
      this.broadcastChannel?.removeEventListener('message', bcHandler);
    };
  }

  /**
   * Assina todas as mensagens novas enviadas para as conversas de um fornecedor
   */
  static subscribeToVendorConversations(
    onMessage: (message: ChatMessageRecord) => void
  ): () => void {
    const channelName = `realtime_vendor_chat_${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'marketplace_chat_messages',
        },
        (payload) => {
          if (payload.new) {
            onMessage(payload.new as ChatMessageRecord);
          }
        }
      )
      .subscribe();

    const localHandler = (e: any) => {
      const msg = e.detail as ChatMessageRecord;
      if (msg) {
        onMessage(msg);
      }
    };
    window.addEventListener('priceus_chat_message', localHandler);

    const bcHandler = (e: MessageEvent) => {
      if (e.data?.type === 'NEW_MESSAGE' && e.data?.payload) {
        const msg = e.data.payload as ChatMessageRecord;
        onMessage(msg);
      }
    };
    this.broadcastChannel?.addEventListener('message', bcHandler);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('priceus_chat_message', localHandler);
      this.broadcastChannel?.removeEventListener('message', bcHandler);
    };
  }

  /**
   * Passo 4: Gera link de transição suave para o WhatsApp com resumo da proposta e conversa
   */
  static generateWhatsAppTransitionLink(params: {
    vendorPhone: string;
    clientName: string;
    packageName: string;
    totalValue: number;
    quoteUrl?: string;
    lastTopic?: string;
  }): string {
    const cleanPhone = params.vendorPhone.replace(/\D/g, '');
    const formattedValue = params.totalValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    const lines = [
      `Olá! Estava negociando com você pelo Chat Online do PriceU$!`,
      ``,
      `*Cliente:* ${params.clientName}`,
      `*Pacote Escolhido:* ${params.packageName}`,
      `*Investimento:* ${formattedValue}`,
    ];

    if (params.lastTopic) {
      lines.push(`*Último Alinhamento:* ${params.lastTopic}`);
    }

    if (params.quoteUrl) {
      lines.push(``);
      lines.push(`🔗 *Link da Proposta:* ${params.quoteUrl}`);
    }

    lines.push(``);
    lines.push(`Gostaria de continuar nossa conversa por aqui no WhatsApp!`);

    const encodedText = encodeURIComponent(lines.join('\n'));
    return `https://wa.me/55${cleanPhone.replace(/^55/, '')}?text=${encodedText}`;
  }

  /**
   * Obtém status de presença online configurado pelo fornecedor
   */
  static getVendorOnlinePresence(vendorId: string): VendorOnlinePresence {
    try {
      const saved = localStorage.getItem(`priceus_vendor_presence_${vendorId}`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    // Padrão: online e com resposta rápida
    return {
      status: 'online',
      responseTimeText: 'Responde em poucos minutos',
      workingHoursText: 'Disponível agora',
      showOnlineStatus: true,
      customNegotiationBtnText: 'Negociar Proposta Online',
      lastActiveAt: new Date().toISOString(),
    };
  }

  /**
   * Atualiza status de presença online do fornecedor e notifica clientes via broadcast
   */
  static setVendorOnlinePresence(vendorId: string, presence: VendorOnlinePresence): void {
    try {
      const payload = {
        ...presence,
        lastActiveAt: new Date().toISOString(),
      };
      localStorage.setItem(`priceus_vendor_presence_${vendorId}`, JSON.stringify(payload));

      // Emite evento local
      window.dispatchEvent(
        new CustomEvent('priceus_presence_updated', {
          detail: { vendorId, presence: payload },
        })
      );

      // Emite broadcast multi-abas
      this.broadcastChannel?.postMessage({
        type: 'PRESENCE_UPDATED',
        payload: { vendorId, presence: payload },
      });
    } catch (e) {
      console.warn('[RealtimeChatService] Erro ao salvar presença do fornecedor:', e);
    }
  }

  /**
   * Assina atualizações em tempo real do status de presença do fornecedor
   */
  static subscribeToVendorPresence(
    vendorId: string,
    onUpdate: (presence: VendorOnlinePresence) => void
  ): () => void {
    const localHandler = (e: any) => {
      if (e.detail?.vendorId === vendorId && e.detail?.presence) {
        onUpdate(e.detail.presence);
      }
    };
    window.addEventListener('priceus_presence_updated', localHandler);

    const bcHandler = (e: MessageEvent) => {
      if (
        e.data?.type === 'PRESENCE_UPDATED' &&
        e.data?.payload?.vendorId === vendorId &&
        e.data?.payload?.presence
      ) {
        onUpdate(e.data.payload.presence);
      }
    };
    this.broadcastChannel?.addEventListener('message', bcHandler);

    return () => {
      window.removeEventListener('priceus_presence_updated', localHandler);
      this.broadcastChannel?.removeEventListener('message', bcHandler);
    };
  }
}

export interface VendorOnlinePresence {
  status: 'online' | 'busy' | 'offline' | 'invisible';
  responseTimeText?: string;
  workingHoursText?: string;
  showOnlineStatus: boolean;
  customNegotiationBtnText?: string;
  lastActiveAt?: string;
}

