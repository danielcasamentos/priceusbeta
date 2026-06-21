import { useState, useEffect } from 'react';
import {
  Sparkles,
  Palette,
  Bell,
  Zap,
  Star,
  X,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

// ─── Constante da versão atual ────────────────────────────────────────────────
const CURRENT_VERSION = '3.1.0';
const STORAGE_KEY = 'priceus_changelog_seen_version';

// ─── Dados do changelog ───────────────────────────────────────────────────────
const CHANGELOG_ENTRIES = [
  {
    icon: Sparkles,
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.12)',
    title: 'Calculadora Dinâmica de Valor por Hora',
    description:
      'Escolha entre o preenchimento manual ou o novo modo dinâmico, que calcula suas horas mensais consolidando automaticamente o tempo restante de workflows ativos, tarefas administrativas ("Meu Dia") e contratos fechados do mês.',
  },
  {
    icon: Zap,
    color: '#10b981',
    bg: 'rgba(16,185,129,0.12)',
    title: 'Painel de Upsell Inteligente & Deduplicado',
    description:
      'Para evitar dúvidas do cliente, a seção de Upsell fica oculta até que ele selecione uma forma de pagamento. Além disso, o sistema filtra e remove automaticamente ofertas de upsell cujas palavras-chave (ex: "álbum") já constem nos pacotes e itens selecionados no carrinho.',
  },
  {
    icon: Sparkles,
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.12)',
    title: 'Sincronização & Concorrência na Agenda',
    description:
      'Sincronize automaticamente etapas de workflows com a agenda. Regule se deseja bloquear a agenda a partir dos workflows ou se permite conflitos de horários em tarefas de ambiente interno (como edição no estúdio) e sessões de trabalho externas.',
  },
  {
    icon: Sparkles,
    color: '#ec4899',
    bg: 'rgba(236,72,153,0.12)',
    title: 'Duração nas Etapas de Workflows',
    description:
      'Agora você pode configurar horários de início, ambiente do trabalho (interno ou externo) e duração (em horas ou minutos) para cada etapa do workflow, permitindo um encaixe perfeito com a lógica do Google Calendar (iCal).',
  },
  {
    icon: Palette,
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.12)',
    title: 'Temas Personalizados',
    description:
      'Agora você pode criar seus próprios temas de orçamento! Personalize cores de fundo, cards, títulos, botões e texto. Salve com um nome exclusivo e ele aparecerá na lista com identidade própria.',
  },
  {
    icon: Bell,
    color: '#34d399',
    bg: 'rgba(52,211,153,0.12)',
    title: 'Notificação de Bom Dia Inteligente',
    description:
      'No primeiro acesso do dia você receberá um resumo personalizado: tarefas atrasadas, pagamentos a receber e follow-ups pendentes — tudo em uma única notificação elegante, sem poluição visual.',
  },
  {
    icon: Star,
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.12)',
    title: 'Botão de Avaliação Temático',
    description:
      'O botão de avaliação agora se adapta visualmente a cada tema de orçamento — com cores, bordas e estilo integrados ao design escolhido, para uma experiência coesa e profissional.',
  },
];

// ─── Componente ───────────────────────────────────────────────────────────────
export function ChangelogModal() {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const seenVersion = localStorage.getItem(STORAGE_KEY);
    if (seenVersion !== CURRENT_VERSION) {
      // Pequeno delay para não sobrepor o carregamento da página
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  const handleClose = () => {
    setClosing(true);
    localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
    setTimeout(() => {
      setVisible(false);
      setClosing(false);
    }, 350);
  };

  if (!visible) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          zIndex: 9998,
          opacity: closing ? 0 : 1,
          transition: 'opacity 0.35s ease',
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '580px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(167,139,250,0.15)',
            pointerEvents: 'auto',
            opacity: closing ? 0 : 1,
            transform: closing ? 'scale(0.96) translateY(8px)' : 'scale(1) translateY(0)',
            transition: 'opacity 0.35s ease, transform 0.35s ease',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '28px 28px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              position: 'relative',
              background:
                'linear-gradient(135deg, rgba(167,139,250,0.08) 0%, rgba(96,165,250,0.05) 100%)',
            }}
          >
            <button
              onClick={handleClose}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.5)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'rgba(255,255,255,0.15)';
                (e.currentTarget as HTMLButtonElement).style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'rgba(255,255,255,0.07)';
                (e.currentTarget as HTMLButtonElement).style.color =
                  'rgba(255,255,255,0.5)';
              }}
              aria-label="Fechar"
            >
              <X size={14} />
            </button>

            {/* Badge de versão */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                  borderRadius: '100px',
                  padding: '4px 12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#fff',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                v{CURRENT_VERSION}
              </div>
              <div
                style={{
                  background: 'rgba(52,211,153,0.15)',
                  border: '1px solid rgba(52,211,153,0.3)',
                  borderRadius: '100px',
                  padding: '4px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#34d399',
                  letterSpacing: '0.04em',
                }}
              >
                Novidades desta versão
              </div>
            </div>

            <h2
              style={{
                margin: 0,
                fontSize: '22px',
                fontWeight: 800,
                color: '#fff',
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
              }}
            >
              PriceUs está cada vez{' '}
              <span
                style={{
                  background: 'linear-gradient(90deg, #a78bfa, #60a5fa)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                melhor para você
              </span>{' '}
              ✨
            </h2>
            <p
              style={{
                margin: '8px 0 0',
                fontSize: '13px',
                color: 'rgba(255,255,255,0.45)',
                lineHeight: 1.5,
              }}
            >
              Confira tudo que preparamos nesta atualização antes de continuar.
            </p>
          </div>

          {/* Scrollable list */}
          <div
            style={{
              overflowY: 'auto',
              flex: 1,
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {CHANGELOG_ENTRIES.map((entry, idx) => {
              const Icon = entry.icon;
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    gap: '14px',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background =
                      'rgba(255,255,255,0.06)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background =
                      'rgba(255,255,255,0.03)';
                  }}
                >
                  {/* Icon */}
                  <div
                    style={{
                      flexShrink: 0,
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: entry.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: '2px',
                    }}
                  >
                    <Icon size={18} color={entry.color} />
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: '0 0 4px',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#fff',
                        lineHeight: 1.3,
                      }}
                    >
                      {entry.title}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '12px',
                        color: 'rgba(255,255,255,0.5)',
                        lineHeight: 1.55,
                      }}
                    >
                      {entry.description}
                    </p>
                  </div>

                  {/* Check */}
                  <CheckCircle2
                    size={16}
                    style={{ flexShrink: 0, marginTop: '3px', color: 'rgba(255,255,255,0.15)' }}
                  />
                </div>
              );
            })}
          </div>

          {/* Footer CTA */}
          <div
            style={{
              padding: '16px 20px 20px',
              borderTop: '1px solid rgba(255,255,255,0.07)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
              Mais novidades em breve. Obrigado por usar o PriceUs! 💜
            </p>
            <button
              onClick={handleClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#fff',
                cursor: 'pointer',
                transition: 'opacity 0.2s, transform 0.2s',
                boxShadow: '0 4px 16px rgba(124,58,237,0.4)',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.opacity = '0.9';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.opacity = '1';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              }}
            >
              Entendido, vamos lá!
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
