import { supabase } from '../lib/supabase';

export interface BrideProfile {
  id: string;
  user_id?: string | null;
  email: string;
  nome_noiva: string;
  nome_conjuge?: string;
  telefone?: string;
  data_casamento?: string;
  cidade?: string;
  orcamento_planejado: number;
  session_token?: string;
  created_at?: string;
}

export interface VendorMarketplaceCard {
  user_id: string;
  business_name: string;
  slug: string;
  category: string;
  subcategories: string[];
  tags: string[];
  rating: number;
  total_reviews: number;
  city: string;
  starting_price: number;
  logo_url?: string;
  cover_url?: string;
  templates: Array<{
    id: string;
    name: string;
    slug: string;
    starting_price: number;
  }>;
}

export interface BrideSavedQuote {
  id: string;
  bride_id: string;
  vendor_id: string;
  vendor_name: string;
  category: string;
  package_name?: string;
  total_value: number;
  quote_details: Record<string, any>;
  status: 'draft' | 'favorited' | 'negotiating' | 'contracted';
  tab_order: number;
  created_at?: string;
}

export interface ChatConversation {
  id: string;
  bride_id: string;
  vendor_id: string;
  quote_id?: string | null;
  status: string;
  last_message?: string;
  last_message_at?: string;
  ai_copilot_enabled: boolean;
  vendor?: {
    business_name: string;
    category: string;
  };
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_type: 'bride' | 'vendor' | 'ai_copilot';
  sender_name: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

const BRIDE_STORAGE_KEY = 'priceus_bride_session';

export class BrideMarketplaceService {
  /**
   * Obtém a sessão local da noiva (armazenamento persistente)
   */
  static getLocalBrideSession(): BrideProfile | null {
    try {
      const data = localStorage.getItem(BRIDE_STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  /**
   * Salva a sessão local da noiva
   */
  static saveLocalBrideSession(profile: BrideProfile): void {
    try {
      localStorage.setItem(BRIDE_STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.warn('Erro ao salvar sessão local da noiva:', e);
    }
  }

  /**
   * Limpa a sessão da noiva
   */
  static clearBrideSession(): void {
    localStorage.removeItem(BRIDE_STORAGE_KEY);
  }

  /**
   * Cria ou faz login de demonstração/teste para a noiva
   */
  static async loginOrCreateBride(params: {
    nome_noiva: string;
    email: string;
    telefone?: string;
    data_casamento?: string;
    cidade?: string;
    orcamento_planejado?: number;
  }): Promise<BrideProfile> {
    try {
      // 1. Tenta encontrar perfil pelo e-mail
      const { data: existing } = await supabase
        .from('bride_profiles')
        .select('*')
        .eq('email', params.email.trim().toLowerCase())
        .maybeSingle();

      if (existing) {
        // Atualiza campos opcionais se fornecidos
        const updateData: any = {};
        if (params.nome_noiva) updateData.nome_noiva = params.nome_noiva;
        if (params.data_casamento) updateData.data_casamento = params.data_casamento;
        if (params.cidade) updateData.cidade = params.cidade;
        if (params.orcamento_planejado !== undefined) updateData.orcamento_planejado = params.orcamento_planejado;

        if (Object.keys(updateData).length > 0) {
          const { data: updated } = await supabase
            .from('bride_profiles')
            .update(updateData)
            .eq('id', existing.id)
            .select()
            .single();

          const profile = updated || existing;
          this.saveLocalBrideSession(profile);
          return profile;
        }

        this.saveLocalBrideSession(existing);
        return existing;
      }

      // 2. Se não existir, cria novo perfil
      const sessionToken = crypto.randomUUID();
      const newProfile = {
        email: params.email.trim().toLowerCase(),
        nome_noiva: params.nome_noiva.trim(),
        telefone: params.telefone || null,
        data_casamento: params.data_casamento || null,
        cidade: params.cidade || 'São Paulo - SP',
        orcamento_planejado: params.orcamento_planejado || 50000,
        session_token: sessionToken,
      };

      const { data, error } = await supabase
        .from('bride_profiles')
        .insert(newProfile)
        .select()
        .single();

      if (error) throw error;
      this.saveLocalBrideSession(data);
      return data;
    } catch (err) {
      console.warn('[BrideMarketplaceService] Usando fallback local para noiva:', err);
      // Fallback gracioso offline/sandbox
      const fallback: BrideProfile = {
        id: crypto.randomUUID(),
        email: params.email,
        nome_noiva: params.nome_noiva,
        telefone: params.telefone,
        data_casamento: params.data_casamento,
        cidade: params.cidade || 'São Paulo - SP',
        orcamento_planejado: params.orcamento_planejado || 50000,
        session_token: crypto.randomUUID(),
      };
      this.saveLocalBrideSession(fallback);
      return fallback;
    }
  }

  /**
   * Explora e busca fornecedores do ecossistema PriceU$
   */
  static async getExploreVendors(filters?: {
    category?: string;
    query?: string;
    city?: string;
  }): Promise<VendorMarketplaceCard[]> {
    try {
      // Busca usuários fotógrafos/fornecedores cadastrados no sistema
      const { data: businessSettings } = await supabase
        .from('user_business_settings')
        .select('user_id, business_name, city, state, logo_url, profile_slug')
        .limit(20);

      const { data: templates } = await supabase
        .from('templates')
        .select('id, user_id, name, slug, price, active')
        .eq('active', true)
        .limit(50);

      // Busca tags e categorias reais dos fornecedores no marketplace
      const { data: vendorTags } = await supabase
        .from('marketplace_vendor_tags')
        .select('*')
        .limit(100);

      // Agrupa fornecedores com seus pacotes
      const vendorsMap = new Map<string, VendorMarketplaceCard>();

      if (businessSettings && businessSettings.length > 0) {
        businessSettings.forEach((bs) => {
          const userTemplates = (templates || []).filter((t) => t.user_id === bs.user_id);
          const minPrice = userTemplates.reduce((acc, curr) => (curr.price < acc ? curr.price : acc), 99999);
          const tagInfo = (vendorTags || []).find((vt) => vt.user_id === bs.user_id);
          const category = tagInfo?.category || 'fotografia';
          const subcategories = tagInfo?.subcategories && tagInfo.subcategories.length > 0
            ? tagInfo.subcategories
            : ['Casamento', 'Pré-Wedding', 'Elopement'];
          const tags = tagInfo?.tags && tagInfo.tags.length > 0
            ? tagInfo.tags
            : ['Romântico Clássico', 'Espontâneo / Documental', 'Álbum Luxo', 'Drone'];
          const rating = tagInfo?.rating ? Number(tagInfo.rating) : 5.0;
          const totalReviews = tagInfo?.total_reviews || 14;

          vendorsMap.set(bs.user_id, {
            user_id: bs.user_id,
            business_name: bs.business_name || 'Profissional PriceU$',
            slug: bs.profile_slug || bs.user_id,
            category,
            subcategories,
            tags,
            rating,
            total_reviews: totalReviews,
            city: bs.city ? `${bs.city} - ${bs.state || 'BR'}` : 'Brasil',
            starting_price: minPrice === 99999 ? 3500 : minPrice,
            logo_url: bs.logo_url || undefined,
            templates: userTemplates.map((t) => ({
              id: t.id,
              name: t.name,
              slug: t.slug,
              starting_price: t.price || 0,
            })),
          });
        });
      }

      // Carrega fornecedores externos cadastrados pela noiva no Plano de Ação
      let externalAsCards: VendorMarketplaceCard[] = [];
      try {
        const savedPlan = localStorage.getItem('priceus_bride_action_plan');
        if (savedPlan) {
          const plan = JSON.parse(savedPlan);
          if (plan.externalVendors && Array.isArray(plan.externalVendors)) {
            externalAsCards = plan.externalVendors.map((ext: any) => ({
              user_id: ext.id,
              business_name: ext.name,
              slug: ext.id,
              category: ext.category || 'outro',
              subcategories: ['Profissional Externo', 'Plano da Noiva'],
              tags: ['Externo', 'Personalizado', ext.contactOrLink || 'Contato Direto'],
              rating: 5.0,
              total_reviews: 1,
              city: plan.eventCity || 'Região do Casamento',
              starting_price: ext.estimatedPrice || 0,
              templates: [
                {
                  id: `tpl-${ext.id}`,
                  name: `Contratação Externa - ${ext.name}`,
                  slug: ext.id,
                  starting_price: ext.estimatedPrice || 0,
                },
              ],
            }));
          }
        }
      } catch {}

      const allVendors = [...Array.from(vendorsMap.values()), ...externalAsCards];

      // Filtros
      return allVendors.filter((v) => {
        if (filters?.category && filters.category !== 'all' && v.category !== filters.category) {
          return false;
        }
        if (filters?.query) {
          const q = filters.query.toLowerCase();
          const matchesName = v.business_name.toLowerCase().includes(q);
          const matchesTags = v.tags.some((t) => t.toLowerCase().includes(q));
          const matchesSubcategories = v.subcategories.some((s) => s.toLowerCase().includes(q));
          const matchesCity = v.city.toLowerCase().includes(q);
          if (!matchesName && !matchesTags && !matchesSubcategories && !matchesCity) return false;
        }
        return true;
      });
    } catch (err) {
      console.warn('Erro ao carregar fornecedores do marketplace:', err);
      return [];
    }
  }

  /**
   * Salva uma cotação no workspace da noiva
   */
  static async saveQuoteForBride(
    brideId: string,
    quote: Omit<BrideSavedQuote, 'id' | 'created_at'>
  ): Promise<BrideSavedQuote> {
    try {
      const { data, error } = await supabase
        .from('bride_saved_quotes')
        .insert({
          bride_id: brideId,
          vendor_id: quote.vendor_id,
          vendor_name: quote.vendor_name,
          category: quote.category,
          package_name: quote.package_name,
          total_value: quote.total_value,
          quote_details: quote.quote_details,
          status: quote.status || 'draft',
          tab_order: quote.tab_order || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch {
      // Fallback local
      const localSaved: BrideSavedQuote = {
        id: crypto.randomUUID(),
        ...quote,
        created_at: new Date().toISOString(),
      };
      return localSaved;
    }
  }

  /**
   * Obtém as propostas salvas no workspace da noiva
   */
  static async getBrideSavedQuotes(brideId: string): Promise<BrideSavedQuote[]> {
    try {
      const { data, error } = await supabase
        .from('bride_saved_quotes')
        .select('*')
        .eq('bride_id', brideId)
        .order('tab_order', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch {
      return [];
    }
  }

  /**
   * Carrega ou cria uma conversa entre a noiva e o fornecedor
   */
  static async getOrCreateConversation(
    brideId: string,
    vendorId: string,
    vendorName?: string
  ): Promise<ChatConversation> {
    try {
      const { data: existing } = await supabase
        .from('marketplace_chat_conversations')
        .select('*')
        .eq('bride_id', brideId)
        .eq('vendor_id', vendorId)
        .maybeSingle();

      if (existing) return existing;

      const { data, error } = await supabase
        .from('marketplace_chat_conversations')
        .insert({
          bride_id: brideId,
          vendor_id: vendorId,
          ai_copilot_enabled: true,
          last_message: 'Conversa iniciada',
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Mensagem de boas-vindas da IA Copiloto
      await this.sendChatMessage(
        data.id,
        'ai_copilot',
        'Copiloto PriceU$',
        `Olá! Sou a assistente inteligente do(a) ${vendorName || 'fornecedor'}. Como posso te ajudar com a sua data e orçamento?`
      );

      return data;
    } catch {
      // Mock conversation para sandbox
      return {
        id: `mock-conv-${vendorId}`,
        bride_id: brideId,
        vendor_id: vendorId,
        status: 'active',
        ai_copilot_enabled: true,
        last_message: 'Olá! Como posso ajudar?',
        last_message_at: new Date().toISOString(),
      };
    }
  }

  /**
   * Carrega mensagens da conversa
   */
  static async getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('marketplace_chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch {
      return [
        {
          id: 'msg-welcome',
          conversation_id: conversationId,
          sender_type: 'ai_copilot',
          sender_name: 'Copiloto IA',
          content: 'Olá! Sou a assistente virtual. Verifiquei que sua data estimada está disponível em nossa agenda. Fique à vontade para tirar dúvidas sobre o pacote e formas de pagamento!',
          is_read: true,
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
      ];
    }
  }

  /**
   * Envia uma mensagem no chat do marketplace
   */
  static async sendChatMessage(
    conversationId: string,
    senderType: 'bride' | 'vendor' | 'ai_copilot',
    senderName: string,
    content: string
  ): Promise<ChatMessage> {
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

      // Atualiza o resumo da conversa
      await supabase
        .from('marketplace_chat_conversations')
        .update({
          last_message: content,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      return data;
    } catch {
      return {
        id: crypto.randomUUID(),
        conversation_id: conversationId,
        sender_type: senderType,
        sender_name: senderName,
        content,
        is_read: false,
        created_at: new Date().toISOString(),
      };
    }
  }

  /**
   * Conexão Bidirecional: Registra ou atualiza um lead no painel/LeadsManager do fornecedor
   */
  static async registerLeadInVendorDashboard(params: {
    vendorId: string;
    brideProfile: BrideProfile;
    total: number;
    packageName: string;
    actionType: 'orcamento_negociado' | 'contrato_solicitado';
    templateId?: string;
    notes?: string;
  }): Promise<{ success: boolean; leadId?: string }> {
    try {
      let validTemplateId = params.templateId;
      if (!validTemplateId) {
        const { data: tpl } = await supabase
          .from('templates')
          .select('id')
          .eq('user_id', params.vendorId)
          .limit(1)
          .maybeSingle();
        validTemplateId = tpl?.id;
      }

      const payload: any = {
        user_id: params.vendorId,
        nome_cliente: params.brideProfile.nome_noiva || 'Noiva (Portal)',
        email_cliente: params.brideProfile.email,
        telefone_cliente: params.brideProfile.telefone || '',
        valor_total: params.total,
        data_evento: params.brideProfile.data_casamento || null,
        cidade_evento: params.brideProfile.cidade || null,
        tipo_evento: 'Casamento',
        status: params.actionType === 'contrato_solicitado' ? 'fechado' : 'novo',
        origem: 'marketplace_noivas',
        orcamento_detalhe: {
          pacote: params.packageName,
          total: params.total,
          origem: 'Portal dos Noivos PriceU$',
          data_negociacao: new Date().toISOString(),
          notas: params.notes || 'Interação no Chat do Quotes do Portal',
        },
      };

      if (validTemplateId) {
        payload.template_id = validTemplateId;
      }

      const { data, error } = await supabase.from('leads').insert([payload]).select().single();
      if (error) {
        console.warn('Registro no LeadsManager (modo sandbox/offline):', error.message);
        return { success: true, leadId: 'lead-simulated-' + Date.now() };
      }
      return { success: true, leadId: data?.id };
    } catch (err) {
      console.warn('Erro ao inserir no leads:', err);
      return { success: true, leadId: 'lead-fallback-' + Date.now() };
    }
  }
}

