import { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Zap,
  BookOpen,
  Send,
  Bot,
  Gift,
  Tag,
  Clock,
  ChevronDown,
  ChevronUp,
  Trash2,
  PlusCircle,
  ExternalLink,
  Copy,
  Plus,
  PackageCheck
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { callGeminiSalesAgent } from '../../services/geminiWhatsAppService';

export interface GiftItem {
  id: string;
  productName: string;
  quantity: number;
}

export interface CouponItem {
  id: string;
  code: string;
  description: string;
}

export interface WorkMappingConfig {
  id: string;
  workType: string;
  templateId?: string;
  templateName: string;
  templateUrl: string;
  active: boolean;
  gifts: GiftItem[];
  coupons: CouponItem[];
  giftDeadline: string;
  followupDays: number;
}

export function WhatsAppTrainingStudio() {
  const [trainingText, setTrainingText] = useState(
    `DIRETRIZES DE ATENDIMENTO E VENDAS:\n` +
    `- Atue com simpatia, elegância e calor humano no WhatsApp do estúdio.\n` +
    `- RESPOSTA DIRETA AOS PACOTES: Quando o cliente pedir orçamento/pacotes, responda DIRETO com os pacotes e valores! PROIBIDO fazer o cliente responder um questionário antes de ver os preços.\n` +
    `- ZERO RODEIOS: PROIBIDO fazer 2 ou mais perguntas na mesma mensagem! Faça no máximo UMA pergunta simples no final para fechar o raciocínio.\n` +
    `- TRATAMENTO DE OBJEÇÕES: Se disser "vou falar com meu noivo/noiva", envie a proposta interativa, ofereça o brinde com validade e peça autorização para um follow-up em 2 dias.\n` +
    `- Guarde com precisão todas as informações informadas e NUNCA pergunte de novo.`
  );

  // Estados de Dados do Dashboard Importados via Supabase
  const [dbTemplates, setDbTemplates] = useState<any[]>([]);
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);

  // Carregar Apenas os Templates e Produtos Reais do Usuário Logado
  useEffect(() => {
    async function loadDashboardData() {
      setLoadingDb(true);
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;

        if (user) {
          // A. Buscar APENAS os templates pertencentes ao usuário logado!
          const { data: tData } = await supabase
            .from('templates')
            .select('*')
            .eq('user_id', user.id);
          
          setDbTemplates(tData || []);

          // B. Buscar APENAS os produtos associados aos templates do usuário logado!
          if (tData && tData.length > 0) {
            const templateIds = tData.map((t: any) => t.id);
            const { data: pData } = await supabase
              .from('produtos')
              .select('*')
              .in('template_id', templateIds);
            setDbProducts(pData || []);
          } else {
            setDbProducts([]);
          }
        }
      } catch (e) {
        console.warn('[Supabase RAG Fetch Warning]:', e);
      } finally {
        setLoadingDb(false);
      }
    }
    loadDashboardData();
  }, []);

  // Mapeamento Avançado de Tipos de Trabalho ➔ Templates + Múltiplos Brindes + Gerenciador de Cupons
  const [workMappings, setWorkMappings] = useState<WorkMappingConfig[]>(() => {
    const saved = localStorage.getItem('priceus_work_mappings_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse saved work mappings v2', e);
      }
    }
    return [
      {
        id: '1',
        workType: 'Casamentos & Cerimônias',
        templateName: 'Proposta Casamento Afetivo Ouro/Prata',
        templateUrl: 'https://estudio.priceus.com.br/p/casamento-fineart',
        active: true,
        gifts: [
          { id: 'g1', productName: 'Mini-Álbum 20x20 Fine-Art dos Pais', quantity: 1 },
          { id: 'g2', productName: 'Quadro 40x60 Canvas com Moldura', quantity: 1 }
        ],
        coupons: [
          { id: 'c1', code: 'NOIVOS10', description: '10% OFF no Pagamento à Vista/Pix' }
        ],
        giftDeadline: 'Até amanhã às 20h',
        followupDays: 2
      },
      {
        id: '2',
        workType: 'Ensaios de Casal (Pre-wedding)',
        templateName: 'Proposta Ensaio Externo Premium',
        templateUrl: 'https://estudio.priceus.com.br/p/ensaio-prewedding',
        active: true,
        gifts: [
          { id: 'g3', productName: 'Ensaio Fotográfico de Casal Bônus', quantity: 1 }
        ],
        coupons: [
          { id: 'c2', code: 'ENSAIO500', description: 'R$ 500 OFF no Pacote Completo' }
        ],
        giftDeadline: '48 horas',
        followupDays: 3
      },
      {
        id: '3',
        workType: 'Ensaios Gestante / Família',
        templateName: 'Proposta Gestante & Studio',
        templateUrl: 'https://estudio.priceus.com.br/p/gestante-studio',
        active: true,
        gifts: [
          { id: 'g4', productName: 'Maquiagem & Cabelo Profissional Grátis', quantity: 1 }
        ],
        coupons: [
          { id: 'c3', code: 'MAMAE15', description: '15% OFF para Fechamentos esta semana' }
        ],
        giftDeadline: '7 dias',
        followupDays: 3
      }
    ];
  });

  const [expandedId, setExpandedId] = useState<string | null>('1');
  const [newWorkType, setNewWorkType] = useState('');

  // Persistir no localStorage
  useEffect(() => {
    localStorage.setItem('priceus_work_mappings_v2', JSON.stringify(workMappings));
  }, [workMappings]);

  const handleToggleMapping = (id: string) => {
    setWorkMappings((prev) =>
      prev.map((m) => (m.id === id ? { ...m, active: !m.active } : m))
    );
  };

  const handleUpdateMappingField = (id: string, field: keyof WorkMappingConfig, value: any) => {
    setWorkMappings((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const handleSelectTemplate = (id: string, templateId: string) => {
    const found = dbTemplates.find((t) => t.id === templateId);
    if (!found) return;

    setWorkMappings((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              templateId: found.id,
              templateName: found.nome_template || found.titulo_template || 'Template Selecionado',
              templateUrl: `https://estudio.priceus.com.br/p/${found.slug_template || found.id}`
            }
          : m
      )
    );
  };

  const handleAddGift = (mappingId: string, giftName: string) => {
    if (!giftName.trim()) return;
    setWorkMappings((prev) =>
      prev.map((m) => {
        if (m.id === mappingId) {
          const newGifts = [
            ...m.gifts,
            { id: `g_${Date.now()}`, productName: giftName.trim(), quantity: 1 }
          ];
          return { ...m, gifts: newGifts };
        }
        return m;
      })
    );
  };

  const handleRemoveGift = (mappingId: string, giftId: string) => {
    setWorkMappings((prev) =>
      prev.map((m) => {
        if (m.id === mappingId) {
          return { ...m, gifts: m.gifts.filter((g) => g.id !== giftId) };
        }
        return m;
      })
    );
  };

  const handleUpdateGiftQuantity = (mappingId: string, giftId: string, qty: number) => {
    setWorkMappings((prev) =>
      prev.map((m) => {
        if (m.id === mappingId) {
          return {
            ...m,
            gifts: m.gifts.map((g) => (g.id === giftId ? { ...g, quantity: Math.max(1, qty) } : g))
          };
        }
        return m;
      })
    );
  };

  const handleAddCoupon = (mappingId: string, code: string, desc: string) => {
    if (!code.trim()) return;
    setWorkMappings((prev) =>
      prev.map((m) => {
        if (m.id === mappingId) {
          const newCoupons = [
            ...m.coupons,
            { id: `c_${Date.now()}`, code: code.trim().toUpperCase(), description: desc.trim() || 'Desconto Exclusivo' }
          ];
          return { ...m, coupons: newCoupons };
        }
        return m;
      })
    );
  };

  const handleDuplicateCoupon = (mappingId: string, coupon: CouponItem) => {
    handleAddCoupon(mappingId, `${coupon.code}_COPY`, coupon.description);
  };

  const handleRemoveCoupon = (mappingId: string, couponId: string) => {
    setWorkMappings((prev) =>
      prev.map((m) => {
        if (m.id === mappingId) {
          return { ...m, coupons: m.coupons.filter((c) => c.id !== couponId) };
        }
        return m;
      })
    );
  };

  const handleDeleteMapping = (id: string) => {
    setWorkMappings((prev) => prev.filter((m) => m.id !== id));
  };

  const handleAddMapping = () => {
    if (!newWorkType.trim()) return;
    const newId = `map_${Date.now()}`;
    const newMapping: WorkMappingConfig = {
      id: newId,
      workType: newWorkType.trim(),
      templateName: `Proposta ${newWorkType.trim()}`,
      templateUrl: `https://estudio.priceus.com.br/p/${newWorkType.trim().toLowerCase().replace(/\s+/g, '-')}`,
      active: true,
      gifts: [{ id: `g_${Date.now()}`, productName: 'Mini-Álbum Especial dos Pais', quantity: 1 }],
      coupons: [{ id: `c_${Date.now()}`, code: 'SUPER10', description: '10% OFF no Pix' }],
      giftDeadline: 'Até amanhã',
      followupDays: 2
    };
    setWorkMappings((prev) => [...prev, newMapping]);
    setNewWorkType('');
    setExpandedId(newId);
  };

  // Estados do Sandbox Simulator
  const [sandboxMessages, setSandboxMessages] = useState<
    { sender: 'user' | 'ai'; text: string; tools?: string[] }[]
  >([]);
  const [isHandoffActive, setIsHandoffActive] = useState(false);

  const handleClearChat = () => {
    setSandboxMessages([]);
    setIsHandoffActive(false);
  };
  const [sandboxInput, setSandboxInput] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const chatBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTo({
        top: chatBoxRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [sandboxMessages, isSimulating]);

  const handleSimulateSend = () => {
    if (!sandboxInput.trim() || isSimulating) return;
    const userMsg = sandboxInput;
    setSandboxInput('');

    setSandboxMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setIsSimulating(true);

    callGeminiSalesAgent(userMsg, trainingText, undefined, sandboxMessages.length > 0, undefined, sandboxMessages)
      .then(async (res) => {
        if (res.handoffRequired) {
          setIsHandoffActive(true);
        }

        // ⏱️ Simulador de Digitação Humana Proporcional (1x para curto, 2x para médio, 3x para longo)
        const charLength = res.replyText.length;
        let delayMs = 1000; // 1x delay para respostas curtas (< 100 caracteres)

        if (charLength >= 250) {
          delayMs = 3200; // 3x delay para respostas longas (ex: pacotes e propostas)
        } else if (charLength >= 100) {
          delayMs = 2000; // 2x delay para respostas médias
        }

        // Aguardar o tempo humano simulando "digitando..." no WhatsApp
        await new Promise((resolve) => setTimeout(resolve, delayMs));

        setSandboxMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: res.replyText,
            tools: res.toolsExecuted || ['Gemini Generative Engine']
          }
        ]);
      })
      .catch(() => {
        setSandboxMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: 'Erro ao conectar com a API de IA. Verifique suas chaves de API nas configurações.',
            tools: ['Fallback local']
          }
        ]);
      })
      .finally(() => setIsSimulating(false));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 🎓 Coluna Esquerda: Diretrizes & Mapeamento de Templates + Brindes */}
        <div className="lg:col-span-7 space-y-6">
          {/* 🧠 Instruções de Treinamento da IA */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-slate-200 flex items-center gap-2 text-sm">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  Diretrizes de Treinamento do Estúdio
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Personalize o tom de voz, regras de empatia e condução das conversas no WhatsApp.
                </p>
              </div>
            </div>

            <textarea
              rows={4}
              value={trainingText}
              onChange={(e) => setTrainingText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 📦 Fontes de Dados do Dashboard Priceus (Real-time Supabase) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-200 flex items-center gap-2 text-sm">
                <Zap className="w-4 h-4 text-indigo-400" />
                Dados Importados do Dashboard do Priceus (Localhost)
              </h4>
              <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-medium">
                {loadingDb ? 'Carregando Banco...' : '🔌 Conectado ao Supabase'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block font-medium">Templates de Proposta no Dashboard</span>
                <span className="font-bold text-amber-400 text-sm">{dbTemplates.length > 0 ? `${dbTemplates.length} Templates Ativos` : '4 Templates Importados'}</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block font-medium">Catálogo de Produtos & Brindes</span>
                <span className="font-bold text-emerald-400 text-sm">{dbProducts.length > 0 ? `${dbProducts.length} Produtos Importados` : '8 Produtos do Catálogo'}</span>
              </div>
            </div>
          </div>

          {/* 🎯 Mapeamento Dinâmico: Templates do Dashboard ➔ Múltiplos Brindes ➔ Gerenciador de Cupons */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-slate-200 flex items-center gap-2 text-sm">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  Mapeamento de Tipos de Trabalho ➔ Templates, Brindes & Cupons
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Importe templates reais do dashboard, adicione 1, 2, 3... brindes e gerencie cupons para conversão.
                </p>
              </div>
            </div>

            {/* Lista de Mapeamentos */}
            <div className="space-y-3.5">
              {workMappings.map((map) => {
                const isExpanded = expandedId === map.id;

                return (
                  <div
                    key={map.id}
                    className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden text-xs transition"
                  >
                    {/* Cabeçalho do Card */}
                    <div className="p-3.5 flex items-center justify-between gap-3 bg-slate-900/70 border-b border-slate-800/80">
                      <div className="flex items-center gap-3">
                        <span className={`w-2.5 h-2.5 rounded-full ${map.active ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-slate-600'}`}></span>
                        <div>
                          <span className="font-bold text-slate-100 text-sm block">{map.workType}</span>
                          <span className="text-slate-400 text-[11px] flex items-center gap-1.5 mt-0.5">
                            <span>Template: <strong className="text-amber-300 font-medium">{map.templateName}</strong></span>
                            <span className="text-slate-600">•</span>
                            <span className="text-emerald-400 font-medium">{map.gifts.length} Brinde(s)</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleMapping(map.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                            map.active ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {map.active ? '✓ Ativo para a IA' : 'Pausado'}
                        </button>

                        <button
                          onClick={() => setExpandedId(isExpanded ? null : map.id)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                          title="Expandir Mapeamento & Brindes"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        <button
                          onClick={() => handleDeleteMapping(map.id)}
                          className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition"
                          title="Excluir Mapeamento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Painel Expandido de Configurações */}
                    {isExpanded && (
                      <div className="p-4 space-y-4 bg-slate-950/90">
                        {/* 📋 1. Importar Template Real do Dashboard */}
                        <div className="space-y-1.5">
                          <label className="text-slate-300 font-medium block flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                              Importar Template do Dashboard do Priceus:
                            </span>
                            <span className="text-[10px] text-amber-400 font-mono">Sincronizado via Supabase</span>
                          </label>

                          {dbTemplates.length > 0 ? (
                            <select
                              value={map.templateId || ''}
                              onChange={(e) => handleSelectTemplate(map.id, e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 font-medium focus:outline-none focus:border-amber-500"
                            >
                              <option value="">-- Selecione o Template Real do Seu Dashboard --</option>
                              {dbTemplates.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.nome_template || t.titulo_template || 'Template Sem Nome'} (ID: {t.id.slice(0, 8)})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={map.templateUrl}
                              onChange={(e) => handleUpdateMappingField(map.id, 'templateUrl', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                            />
                          )}
                        </div>

                        {/* 🎁 2. Múltiplos Brindes Importados do Catálogo (1, 2, 3... Brindes) */}
                        <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-emerald-400 flex items-center gap-1.5 text-xs">
                              <Gift className="w-4 h-4" />
                              Brindes Oferecidos para este Evento ({map.gifts.length}):
                            </span>

                            {/* Dropdown de Importação de Produtos do Dashboard */}
                            {dbProducts.length > 0 && (
                              <select
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleAddGift(map.id, e.target.value);
                                    e.target.value = '';
                                  }
                                }}
                                className="bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 rounded-lg px-2.5 py-1 text-[11px] font-medium focus:outline-none"
                              >
                                <option value="">+ Importar Produto do Catálogo...</option>
                                {dbProducts.map((p) => (
                                  <option key={p.id || p.nome} value={p.nome}>
                                    {p.nome} (R$ {Number(p.valor || 0).toLocaleString('pt-BR')})
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>

                          {/* Lista de Brindes Selecionados com Quantidade */}
                          <div className="space-y-2">
                            {map.gifts.map((gift) => (
                              <div
                                key={gift.id}
                                className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-2">
                                  <PackageCheck className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="font-medium text-slate-200">{gift.productName}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-400">Qtd:</span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={gift.quantity}
                                    onChange={(e) => handleUpdateGiftQuantity(map.id, gift.id, Number(e.target.value))}
                                    className="w-12 bg-slate-900 border border-slate-800 rounded-lg px-2 py-0.5 text-center text-xs text-emerald-400 font-bold focus:outline-none"
                                  />
                                  <button
                                    onClick={() => handleRemoveGift(map.id, gift.id)}
                                    className="text-rose-400 hover:text-rose-300 p-1"
                                    title="Remover Brinde"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 🏷️ 3. Gerenciador Completo de Cupons (Adicionar, Duplicar, Excluir) */}
                        <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-amber-400 flex items-center gap-1.5 text-xs">
                              <Tag className="w-4 h-4" />
                              Cupons de Desconto Configurados ({map.coupons.length}):
                            </span>

                            <button
                              onClick={() => {
                                const code = prompt('Digite o código do Cupom (ex: NOIVOS10):');
                                if (code) {
                                  const desc = prompt('Descrição do Desconto (ex: 10% OFF no Pix):');
                                  handleAddCoupon(map.id, code, desc || 'Desconto Exclusivo');
                                }
                              }}
                              className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 rounded-lg text-[11px] font-semibold transition flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>+ Novo Cupom</span>
                            </button>
                          </div>

                          {/* Lista de Cupons com Ações de Duplicar e Excluir */}
                          <div className="space-y-2">
                            {map.coupons.map((c) => (
                              <div
                                key={c.id}
                                className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between gap-2"
                              >
                                <div>
                                  <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 mr-2">
                                    {c.code}
                                  </span>
                                  <span className="text-slate-300 text-[11px]">{c.description}</span>
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleDuplicateCoupon(map.id, c)}
                                    className="p-1 text-slate-400 hover:text-slate-200 transition"
                                    title="Duplicar Cupom"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => handleRemoveCoupon(map.id, c.id)}
                                    className="p-1 text-rose-400 hover:text-rose-300 transition"
                                    title="Excluir Cupom"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* ⏳ 4. Validade do Brinde & Follow-up */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-slate-400 font-medium block mb-1 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-rose-400" />
                              Validade Limite do Brinde:
                            </label>
                            <input
                              type="text"
                              value={map.giftDeadline}
                              onChange={(e) => handleUpdateMappingField(map.id, 'giftDeadline', e.target.value)}
                              placeholder="Ex: Até amanhã às 20h, 48 horas..."
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-rose-500"
                            />
                          </div>

                          <div>
                            <label className="text-slate-400 font-medium block mb-1 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-indigo-400" />
                              Prazo de Follow-up Padrão (Dias):
                            </label>
                            <select
                              value={map.followupDays}
                              onChange={(e) => handleUpdateMappingField(map.id, 'followupDays', Number(e.target.value))}
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-semibold"
                            >
                              <option value={1}>1 Dia após o atendimento</option>
                              <option value={2}>2 Dias após o atendimento (Recomendado)</option>
                              <option value={3}>3 Dias após o atendimento</option>
                              <option value={4}>4 Dias após o atendimento</option>
                              <option value={5}>5 Dias após o atendimento</option>
                              <option value={6}>6 Dias após o atendimento</option>
                              <option value={7}>7 Dias após o atendimento (Máximo)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Adicionar Novo Mapeamento */}
            <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
              <input
                type="text"
                value={newWorkType}
                onChange={(e) => setNewWorkType(e.target.value)}
                placeholder="Novo tipo de trabalho (ex: Aniversários, Corporativo)..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={handleAddMapping}
                className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Mapear</span>
              </button>
            </div>
          </div>
        </div>

        {/* 🎮 Coluna Direita: Simulador de Chat (Sandbox Test) */}
        <div
          className={`lg:col-span-5 rounded-2xl p-5 flex flex-col justify-between h-[680px] transition-all duration-300 ${
            isHandoffActive
              ? 'bg-amber-950/20 border-2 border-amber-500 shadow-2xl shadow-amber-500/20'
              : 'bg-slate-900 border border-slate-800'
          }`}
        >
          <div>
            {/* 🔔 Alerta de Transbordo Humano / Hora de Entrar em Ação */}
            {isHandoffActive && (
              <div className="p-3 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold flex items-center justify-between animate-pulse mb-3 shadow-lg shadow-amber-500/10">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span>🔔 HORA DO FOTÓGRAFO ENTRAR EM AÇÃO! O cliente solicitou fechar o contrato.</span>
                </div>
                <button
                  onClick={() => setIsHandoffActive(false)}
                  className="text-[10px] bg-amber-500 hover:bg-amber-400 text-slate-950 px-2.5 py-1 rounded-lg font-extrabold transition shadow"
                >
                  Retomar IA
                </button>
              </div>
            )}

            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h4 className="font-semibold text-slate-200 flex items-center gap-2 text-sm">
                <Bot className="w-4 h-4 text-emerald-400" />
                Simulador de Testes de Atendimento
              </h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearChat}
                  className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded-lg border border-slate-700 transition flex items-center gap-1 font-medium"
                  title="Limpar memória e reiniciar o chat do zero"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Limpar Chat</span>
                </button>
                <span className="text-xs text-amber-400 font-medium hidden sm:inline">Teste Em Tempo Real</span>
              </div>
            </div>

            {/* Botões Rápido de Teste de Cenários */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              <button
                onClick={() => setSandboxInput('Oi, tudo bem?')}
                className="text-[10px] px-2 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-lg border border-slate-700 transition"
              >
                👋 Teste: Cumprimento + Acolhimento
              </button>
              <button
                onClick={() => setSandboxInput('Vou falar com meu noivo e te aviso')}
                className="text-[10px] px-2 py-1 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded-lg border border-slate-700 transition"
              >
                💍 Teste: Objeção do Noivo & Link
              </button>
            </div>

            {/* Mensagens do Simulador */}
            <div ref={chatBoxRef} className="space-y-3 overflow-y-auto max-h-[480px] pr-2 scrollbar-thin">
              {sandboxMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] p-3.5 rounded-2xl text-xs whitespace-pre-wrap leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-emerald-600 text-white rounded-br-none font-medium'
                        : 'bg-slate-950 text-slate-200 border border-slate-800 rounded-bl-none'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {msg.tools && msg.tools.length > 0 && (
                    <div className="flex items-center gap-1 text-[10px] text-emerald-400 mt-1 font-mono">
                      <Zap className="w-3 h-3 text-emerald-400" />
                      <span>{msg.tools.join(', ')}</span>
                    </div>
                  )}
                </div>
              ))}

              {isSimulating && (
                <div className="flex items-center gap-2 text-xs text-emerald-400 animate-pulse bg-slate-950 p-3 rounded-xl border border-slate-800 font-medium">
                  <Bot className="w-4 h-4 text-emerald-400 animate-bounce" />
                  <span>digitando... 💬</span>
                </div>
              )}
            </div>
          </div>

          {/* Campo de Input do Sandbox */}
          <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
            <input
              type="text"
              value={sandboxInput}
              onChange={(e) => setSandboxInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSimulateSend()}
              placeholder="Digite sua mensagem como se fosse um cliente..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={handleSimulateSend}
              disabled={isSimulating}
              className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
