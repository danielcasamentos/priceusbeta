import { useState, useEffect } from 'react';
import { Send, Lock, Tag, Flame, MessageCircle, Instagram, Mail, Star, Clock, Zap } from 'lucide-react';
import { formatCurrency, formatDuration } from '../../lib/utils';
import { ImageWithFallback } from '../ImageWithFallback';
import { ProductGalleryCarousel } from '../ui/ProductGalleryCarousel';
import { RatePhotographerButton } from '../RatePhotographerButton';
import { QuoteHeaderRating } from '../QuoteHeaderRating';

interface QuotePromocionalProps {
  template: any;
  profile: any;
  produtos: any[];
  selectedProdutos: Record<string, number>;
  formData: any;
  calculateTotal: () => number;
  handleProdutoQuantityChange: (id: string, qty: number) => void;
  handleSubmit: (e: React.FormEvent) => void;
  setFormData: (data: any) => void;
  fieldsValidation: any;
  camposExtras: any[];
  camposExtrasData: Record<string, string>;
  setCamposExtrasData: (data: any) => void;
  renderLocationDateFields?: () => React.ReactNode;
  formasPagamento?: any[];
  selectedFormaPagamento?: string;
  setSelectedFormaPagamento?: (id: string) => void;
  firstProductRef?: React.RefObject<HTMLDivElement>;
  totalSectionRef?: React.RefObject<HTMLDivElement>;
  breakdown?: any;
  fieldErrors?: { email?: string; telefone?: string };
  upsellSection?: React.ReactNode;
}

export function QuotePromocional(props: QuotePromocionalProps) {
  const {
    template, profile, produtos, selectedProdutos, formData,
    calculateTotal, handleSubmit, fieldsValidation,
    camposExtras, camposExtrasData, fieldErrors,
    formasPagamento = [],
    selectedFormaPagamento = '',
    setSelectedFormaPagamento,
    firstProductRef,
    totalSectionRef,
  } = props;

  const [timeLeft, setTimeLeft] = useState(900); // 15 minutos em segundos

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 900));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="promo-root"
      style={{
        fontFamily: "'Inter', sans-serif",
        background: '#fff7f0',
        // Diagonal stripe pattern aplicado diretamente — sem elemento extra, sem z-index conflict
        backgroundImage: [
          'repeating-linear-gradient(-45deg, rgba(234,88,12,.045) 0px, rgba(234,88,12,.045) 1px, transparent 1px, transparent 14px)',
          'repeating-linear-gradient(45deg, rgba(251,191,36,.03) 0px, rgba(251,191,36,.03) 1px, transparent 1px, transparent 28px)',
        ].join(', '),
        backgroundSize: '28px 28px, 56px 56px',
        color: '#1a1a1a',
        minHeight: '100vh',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes promo-pulse { 0%,100% { box-shadow:0 0 0 0 rgba(220,38,38,.4); } 70% { box-shadow:0 0 0 12px rgba(220,38,38,0); } }
        @keyframes promo-in { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes promo-badge { 0%,100% { transform:rotate(-2deg) scale(1); } 50% { transform:rotate(2deg) scale(1.05); } }
        @keyframes promo-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .promo-in { animation: promo-in .5s ease both; }
        .promo-in-1 { animation: promo-in .5s ease .1s both; }
        .promo-in-2 { animation: promo-in .5s ease .2s both; }
        .promo-card { transition: transform .2s, box-shadow .2s; }
        .promo-card:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(220,38,38,.12); }
        .promo-prod { transition: border-color .2s, background .2s, transform .15s; }
        .promo-prod:hover { transform: translateY(-1px); }
        .promo-prod.selected { border-color: #dc2626 !important; background: #fff5f5 !important; }
        .promo-input {
          background: #fff;
          border: 2px solid #fed7aa;
          border-radius: 10px;
          color: #1a1a1a;
          padding: 12px 16px;
          width: 100%;
          font-size: 15px;
          outline: none;
          transition: border-color .2s, box-shadow .2s;
          font-family: 'Inter', sans-serif;
        }
        .promo-input::placeholder { color: #9ca3af; }
        .promo-input:focus { border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220,38,38,.12); }
        .promo-qty-btn {
          width: 36px; height: 36px; border-radius: 8px;
          border: 2px solid #fecaca;
          background: #fff;
          color: #dc2626; font-size: 18px; font-weight: 700;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background .15s, border-color .15s;
        }
        .promo-qty-btn:hover:not(:disabled) { background: #dc2626; color: #fff; border-color: #dc2626; }
        .promo-qty-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .promo-shimmer-btn {
          background: linear-gradient(90deg, #dc2626, #ea580c, #f59e0b, #ea580c, #dc2626);
          background-size: 200% auto;
          animation: promo-shimmer 2.5s linear infinite;
        }
        .promo-urgency-badge {
          animation: promo-badge 2s ease-in-out infinite;
        }
        @keyframes promo-bg-drift {
          0%   { background-position: 0 0, 0 0; }
          100% { background-position: 56px 56px, -56px 56px; }
        }
        /* Padrão de fundo da página promocional — aplicado na raiz */
        .promo-root {
          animation: promo-bg-drift 14s linear infinite;
        }
      `}</style>

      {/* Não há div de overlay — o fundo está inline na .promo-root abaixo */}

      {/* ── NAV ── */}
      <nav style={{
        background: 'rgba(255,255,255,.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '3px solid #dc2626',
        padding: '0 24px',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'linear-gradient(135deg,#dc2626,#ea580c)',
          color: '#fff', padding: '4px 12px', borderRadius: 999,
          fontSize: 12, fontWeight: 800, letterSpacing: '0.5px',
        }}>
          <Flame size={12} />
          OFERTA ESPECIAL
        </div>
      </nav>

      {/* ── HERO BANNER ── */}
      <div style={{
        background: 'linear-gradient(135deg, #dc2626 0%, #ea580c 50%, #f59e0b 100%)',
        padding: '10px 24px',
        textAlign: 'center',
        color: '#fff',
        fontSize: 14,
        fontWeight: 800,
        letterSpacing: '0.5px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: 12,
        boxShadow: '0 2px 10px rgba(220,38,38,0.2)'
      }}>
        <Zap size={15} className="animate-pulse" />
        <span>{template?.titulo_template ? `🔥 ${template.titulo_template}` : '🔥 Oferta por Tempo Limitado — Aproveite Agora!'}</span>
        <span style={{
          background: 'rgba(0,0,0,0.25)',
          padding: '3px 10px',
          borderRadius: 8,
          fontWeight: 900,
          fontFamily: 'monospace',
          border: '1px solid rgba(255,255,255,0.2)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6
        }}>
          <Clock size={13} className="animate-spin" style={{ animationDuration: '4s' }} />
          {formatTime(timeLeft)}
        </span>
        <Zap size={15} className="animate-pulse" />
      </div>

      {/* ── HERO / PROFILE ── */}
      {profile && (
        <section
          className="promo-in"
          style={{
            padding: '48px 24px 36px',
            background: 'linear-gradient(180deg, #fff7f0 0%, #ffffff 100%)',
            textAlign: 'center',
            borderBottom: '1px solid #fed7aa',
          }}
        >
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            {/* Urgency badge */}
            <div
              className="promo-urgency-badge"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#dc2626', color: '#fff',
                borderRadius: 999, padding: '4px 14px',
                fontSize: 11, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase',
                marginBottom: 20,
              }}
            >
              <Tag size={11} /> Condições Especiais
            </div>

            {profile.profile_image_url && (
              <div style={{ marginBottom: 16, display: 'inline-block', position: 'relative' }}>
                <div style={{
                  position: 'absolute', inset: -4, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #dc2626, #f59e0b)',
                  animation: 'promo-pulse 2s ease-out infinite',
                }} />
                <img
                  src={profile.profile_image_url}
                  alt={profile.nome_profissional}
                  style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', border: '3px solid #fff', position: 'relative', display: 'block' }}
                />
              </div>
            )}

            <h1 className="promo-in-1" style={{ fontSize: 'clamp(24px,5vw,40px)', fontWeight: 900, letterSpacing: '-1px', marginBottom: 4, lineHeight: 1.1, color: '#1a1a1a' }}>
              {profile.nome_profissional}
            </h1>

            {profile.tipo_fotografia && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: '#fff7f0', border: '1px solid #fecaca',
                borderRadius: 999, padding: '3px 12px', marginBottom: 14,
                fontSize: 12, fontWeight: 700, color: '#dc2626', letterSpacing: '0.5px',
              }}>
                <Star size={11} fill="#dc2626" />
                {profile.tipo_fotografia}
              </div>
            )}

            {profile.apresentacao && (
              <p className="promo-in-2" style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.7, maxWidth: 480, margin: '0 auto 20px' }}>
                {profile.apresentacao}
              </p>
            )}

            <div style={{ marginBottom: 20 }}>
              <QuoteHeaderRating
                userId={template.user_id}
                ratingMinimo={profile.rating_minimo_exibicao || 1}
                exibirAvaliacoes={profile.exibir_avaliacoes_publico ?? true}
              />
            </div>

            <div className="promo-in-2" style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              {profile.whatsapp_principal && (
                <a
                  href={`https://wa.me/${profile.whatsapp_principal.replace(/\D/g, '')}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#16a34a', color: '#fff', padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
                >
                  <MessageCircle size={14} /> WhatsApp
                </a>
              )}
              {profile.instagram && (
                <a
                  href={`https://instagram.com/${profile.instagram.replace('@', '')}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#e1306c,#f77737)', color: '#fff', padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
                >
                  <Instagram size={14} /> Instagram
                </a>
              )}
              {profile.email_recebimento && (
                <a
                  href={`mailto:${profile.email_recebimento}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#374151', padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
                >
                  <Mail size={14} /> E-mail
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── FORM + PRODUTOS ── */}
      <section style={{ padding: '0 24px 80px', maxWidth: 760, margin: '0 auto' }}>

        {/* Título do template */}
        <div style={{ textAlign: 'center', padding: '40px 0 28px' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '3px', color: '#dc2626', textTransform: 'uppercase', marginBottom: 8 }}>
            <Flame size={12} style={{ display: 'inline', marginRight: 5 }} />
            Orçamento Promocional
          </div>
          <h2 style={{ fontSize: 'clamp(20px,4vw,34px)', fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1.1, color: '#1a1a1a' }}>
            {template?.titulo_template || template?.nome_template}
          </h2>
          <div style={{
            width: 48, height: 4,
            background: 'linear-gradient(90deg, #dc2626, #f59e0b)',
            borderRadius: 999, margin: '12px auto 0',
          }} />
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Dados do cliente */}
          <div
            className="promo-card"
            style={{ background: '#fff', border: '2px solid #fecaca', borderRadius: 16, padding: '24px', boxShadow: '0 4px 16px rgba(220,38,38,.06)' }}
          >
            <h3 style={{ fontSize: 12, fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={13} /> Seus Dados
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 12 }}>
              <div>
                <input
                  id="promo-nome"
                  type="text"
                  placeholder="Nome Completo *"
                  value={formData.nome_cliente}
                  onChange={(e) => props.setFormData({ ...formData, nome_cliente: e.target.value })}
                  className="promo-input"
                  required
                />
              </div>
              <div>
                <input
                  id="promo-email"
                  type="email"
                  placeholder="E-mail *"
                  value={formData.email_cliente}
                  onChange={(e) => props.setFormData({ ...formData, email_cliente: e.target.value })}
                  className="promo-input"
                  style={fieldErrors?.email ? { borderColor: '#ef4444' } : {}}
                  required
                />
                {fieldErrors?.email && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4, fontWeight: 600 }}>{fieldErrors.email}</p>}
              </div>
              <div>
                <input
                  id="promo-telefone"
                  type="tel"
                  placeholder="WhatsApp (Ex: 11999999999) *"
                  value={formData.telefone_cliente}
                  onChange={(e) => props.setFormData({ ...formData, telefone_cliente: e.target.value })}
                  className="promo-input"
                  style={fieldErrors?.telefone ? { borderColor: '#ef4444' } : {}}
                  required
                />
                {fieldErrors?.telefone && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4, fontWeight: 600 }}>{fieldErrors.telefone}</p>}
              </div>
            </div>
          </div>

          {/* Location / Date fields */}
          {props.renderLocationDateFields && (
            <div
              className="promo-card"
              style={{ background: '#fff', border: '2px solid #fecaca', borderRadius: 16, padding: '24px', boxShadow: '0 4px 16px rgba(220,38,38,.06)' }}
            >
              <h3 style={{ fontSize: 12, fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 16 }}>
                Evento
              </h3>
              {props.renderLocationDateFields()}
            </div>
          )}

          {/* Campos extras */}
          {camposExtras.length > 0 && (
            <div
              className="promo-card"
              style={{ background: '#fff', border: '2px solid #fecaca', borderRadius: 16, padding: '24px', boxShadow: '0 4px 16px rgba(220,38,38,.06)' }}
            >
              <h3 style={{ fontSize: 12, fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 16 }}>
                Informações Adicionais
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {camposExtras.map((campo) =>
                  campo.tipo === 'textarea' ? (
                    <textarea
                      key={campo.id}
                      placeholder={campo.placeholder}
                      value={camposExtrasData[campo.id] || ''}
                      onChange={(e) => props.setCamposExtrasData({ ...camposExtrasData, [campo.id]: e.target.value })}
                      required={campo.obrigatorio}
                      rows={3}
                      className="promo-input"
                      style={{ resize: 'none' }}
                    />
                  ) : (
                    <input
                      key={campo.id}
                      type={campo.tipo}
                      placeholder={`${campo.label}${campo.obrigatorio ? ' *' : ''}`}
                      value={camposExtrasData[campo.id] || ''}
                      onChange={(e) => props.setCamposExtrasData({ ...camposExtrasData, [campo.id]: e.target.value })}
                      required={campo.obrigatorio}
                      className="promo-input"
                    />
                  )
                )}
              </div>
            </div>
          )}

          {/* Produtos */}
          <div
            className="promo-card"
            style={{ background: '#fff', border: '2px solid #fecaca', borderRadius: 16, padding: '24px', boxShadow: '0 4px 16px rgba(220,38,38,.06)' }}
          >
            <h3 style={{ fontSize: 12, fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Tag size={13} /> Serviços da Oferta
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {produtos.map((produto) => {
                const isSelected = !!selectedProdutos[produto.id];
                return (
                  <div
                    key={produto.id}
                    className={`promo-prod${isSelected ? ' selected' : ''}`}
                    style={{
                      border: produto.destacar_produto ? '3px solid #dc2626' : '2px solid #fee2e2',
                      borderRadius: 12,
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      background: '#fff',
                      ...(produto.destacar_produto
                        ? {
                            boxShadow: '0 8px 30px rgba(220,38,38,0.18)',
                            transform: 'scale(1.01)',
                            position: 'relative' as const,
                          }
                        : {}),
                    }}
                  >
                    <div 
                      ref={produtos.indexOf(produto) === 0 ? firstProductRef : undefined} 
                      style={{ 
                        display: 'flex', 
                        flexDirection: template?.layout_produtos_desktop === 'quadro' ? 'column' : 'row', 
                        alignItems: template?.layout_produtos_desktop === 'quadro' ? 'center' : 'flex-start', 
                        gap: 14 
                      }}
                    >
                      {produto.mostrar_imagem && (produto.imagem_url || produto.imagens?.length > 0) && (
                        (() => {
                          const isQuadro = template?.layout_produtos_desktop === 'quadro';
                          const size = template?.tamanho_imagem_grid || 'medio';
                          const sizes = {
                            pequeno: { w: isQuadro ? 96 : 56, h: isQuadro ? 96 : 56 },
                            medio: { w: isQuadro ? 144 : 80, h: isQuadro ? 144 : 80 },
                            grande: { w: isQuadro ? '100%' : 120, h: isQuadro ? 180 : 120 }
                          };
                          const currentSize = sizes[size as keyof typeof sizes] || sizes.medio;
                          return (
                            <div style={{ 
                              width: currentSize.w, 
                              height: currentSize.h, 
                              borderRadius: 10, 
                              overflow: 'hidden', 
                              flexShrink: 0, 
                              border: '2px solid #fecaca',
                              maxWidth: size === 'grande' && isQuadro ? '100%' : undefined
                            }}>
                              {produto.imagens?.length > 0 ? (
                                <ProductGalleryCarousel
                                  images={[produto.imagem_url, ...produto.imagens].filter(Boolean)}
                                  autoPlay={produto.carrossel_automatico}
                                  productName={produto.nome}
                                />
                              ) : (
                                <ImageWithFallback
                                  src={produto.imagem_url}
                                  alt={produto.nome}
                                  className="w-full h-full object-cover"
                                  fallbackClassName="w-full h-full"
                                />
                              )}
                            </div>
                          );
                        })()
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {produto.destacar_produto && produto.destaque_texto && (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            background: 'linear-gradient(135deg,#dc2626,#f59e0b)',
                            borderRadius: 999,
                            padding: '2px 10px',
                            marginBottom: 6,
                            fontSize: 10,
                            fontWeight: 900,
                            color: '#fff',
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase',
                            boxShadow: '0 2px 10px rgba(220,38,38,.3)',
                          }}>
                            🔥 {produto.destaque_texto}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                          <h4 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', marginBottom: 2, wordBreak: 'break-word', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span>{produto.nome}</span>
                            {template?.exibir_duracao_produto && produto.duracao_minutos && produto.duracao_minutos > 0 && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.05)', color: '#4b5563', fontSize: 10, fontWeight: 400, padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(0,0,0,0.1)' }}>
                                ⏱️ {formatDuration(produto.duracao_minutos)}
                              </span>
                            )}
                          </h4>
                          {isSelected && (
                            <span style={{
                              background: 'linear-gradient(135deg,#dc2626,#ea580c)',
                              color: '#fff', fontSize: 10, fontWeight: 800,
                              padding: '2px 8px', borderRadius: 999,
                              whiteSpace: 'nowrap', flexShrink: 0,
                            }}>✔ Selecionado</span>
                          )}
                        </div>
                        {produto.resumo && (
                          <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>{produto.resumo}</p>
                        )}
                        {!template?.ocultar_valores_intermediarios && (() => {
                          const desconto = produto.desconto_percentual ?? 0;
                          const valorFinal = produto.valor * (1 - desconto / 100);
                          return (
                            <div style={{ marginTop: 6 }}>
                              {desconto > 0 && (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#dc2626,#ea580c)', borderRadius: 999, padding: '2px 10px', marginBottom: 4, fontSize: 11, fontWeight: 900, color: '#fff', letterSpacing: '0.5px' }}>
                                  🏷️ {desconto}% OFF
                                </div>
                              )}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {desconto > 0 && (
                                  <span style={{ fontSize: 13, color: '#9ca3af', textDecoration: 'line-through', fontWeight: 500 }}>{formatCurrency(produto.valor)}</span>
                                )}
                                <p style={{ fontSize: 18, fontWeight: 900, color: '#dc2626' }}>
                                  {formatCurrency(valorFinal)}
                                </p>
                              </div>
                              {desconto > 0 && (
                                <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>Economia de {formatCurrency(produto.valor - valorFinal)}</span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Controle: toggle simples ou +/- quantidade */}
                    {(produto.permite_multiplas_unidades ?? true) ? (
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: '#fff7f0', borderRadius: 10, padding: '10px 14px',
                      }}>
                        <span style={{ fontSize: 13, color: '#9ca3af', fontWeight: 500 }}>
                          {isSelected ? `${selectedProdutos[produto.id]}x selecionado${selectedProdutos[produto.id] > 1 ? 's' : ''}` : 'Não selecionado'}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <button
                            type="button"
                            className="promo-qty-btn"
                            onClick={() => props.handleProdutoQuantityChange(produto.id, (selectedProdutos[produto.id] || 0) - 1)}
                            disabled={produto.obrigatorio && selectedProdutos[produto.id] === 1}
                          >
                            −
                          </button>
                          <span style={{ width: 28, textAlign: 'center', fontWeight: 800, fontSize: 17, color: '#1a1a1a' }}>
                            {selectedProdutos[produto.id] || 0}
                          </span>
                          <button
                            type="button"
                            className="promo-qty-btn"
                            onClick={() => {
                              if (!produto.obrigatorio && !fieldsValidation.canAddProducts) {
                                alert(fieldsValidation.validationMessage);
                                return;
                              }
                              props.handleProdutoQuantityChange(produto.id, (selectedProdutos[produto.id] || 0) + 1);
                            }}
                            disabled={!produto.obrigatorio && !fieldsValidation.canAddProducts}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', background: '#fff7f0', borderRadius: 10, padding: '10px 14px' }}>
                        {produto.obrigatorio ? (
                          <div style={{ padding: '6px 16px', background: 'linear-gradient(135deg,#dc2626,#ea580c)', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 800 }}>
                            ✔ Incluído
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (!fieldsValidation.canAddProducts && !selectedProdutos[produto.id]) {
                                alert(fieldsValidation.validationMessage);
                                return;
                              }
                              props.handleProdutoQuantityChange(
                                produto.id,
                                selectedProdutos[produto.id] ? 0 : 1
                              );
                            }}
                            style={{
                              padding: '8px 20px',
                              borderRadius: 8,
                              fontSize: 13,
                              fontWeight: 800,
                              border: 'none',
                              cursor: 'pointer',
                              transition: 'all .15s',
                              background: isSelected ? 'linear-gradient(135deg,#dc2626,#ea580c)' : '#f3f4f6',
                              color: isSelected ? '#fff' : '#374151',
                            }}
                          >
                            {isSelected ? '✔ Selecionado' : 'Selecionar'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {props.upsellSection}

          {/* Formas de Pagamento */}
          {formasPagamento.length > 0 && (
            <div
              className="promo-card"
              style={{ background: '#fff', border: '2px solid #fecaca', borderRadius: 16, padding: '24px', boxShadow: '0 4px 16px rgba(220,38,38,.06)' }}
            >
              <h3 style={{ fontSize: 12, fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 16 }}>
                💳 Forma de Pagamento
              </h3>
              {!selectedFormaPagamento && (
                <div style={{
                  marginBottom: 16, padding: '12px 16px', borderRadius: 10,
                  fontSize: 13, background: template?.forma_pagamento_obrigatoria ? '#fef2f2' : '#fffbeb',
                  color: template?.forma_pagamento_obrigatoria ? '#991b1b' : '#92400e',
                  border: `1.5px solid ${template?.forma_pagamento_obrigatoria ? '#fee2e2' : '#fef3c7'}`,
                  display: 'flex', alignItems: 'center', gap: 8
                }}>
                  <span>⚠️</span>
                  <span>
                    <strong>{template?.forma_pagamento_obrigatoria ? 'Escolha Obrigatória:' : 'Atenção:'}</strong> Selecione uma das opções abaixo para prosseguir.
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {formasPagamento.map((forma) => {
                  const total = calculateTotal();
                  const valorEntrada = forma.entrada_tipo === 'percentual'
                    ? (total * forma.entrada_valor) / 100
                    : forma.entrada_valor;
                  return (
                    <label
                      key={forma.id}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                        padding: '14px 16px', borderRadius: 12,
                        border: selectedFormaPagamento === forma.id ? '2px solid #dc2626' : '2px solid #fee2e2',
                        background: selectedFormaPagamento === forma.id ? '#fff5f5' : '#fff',
                        cursor: 'pointer', transition: 'all .2s',
                      }}
                    >
                      <input
                        type="radio"
                        name="promo-forma-pagamento"
                        value={forma.id}
                        checked={selectedFormaPagamento === forma.id}
                        onChange={() => setSelectedFormaPagamento?.(forma.id)}
                        style={{ marginTop: 3, accentColor: '#dc2626', width: 16, height: 16, flexShrink: 0 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a1a', marginBottom: 4 }}>{forma.nome}</div>
                        <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
                          <div>
                            {forma.entrada_tipo === 'percentual'
                              ? `Entrada de ${forma.entrada_valor}% (${formatCurrency(valorEntrada)})`
                              : `Entrada de ${formatCurrency(valorEntrada)}`}
                          </div>
                          {forma.max_parcelas > 0 && (
                            <div>+ {forma.max_parcelas}x parcela{forma.max_parcelas > 1 ? 's' : ''}</div>
                          )}
                          {forma.acrescimo > 0 && (
                            <div style={{ color: '#dc2626' }}>(+{forma.acrescimo}% acréscimo)</div>
                          )}
                          {forma.acrescimo < 0 && (
                            <div style={{ color: '#16a34a' }}>({forma.acrescimo}% desconto)</div>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              {selectedFormaPagamento && (() => {
                const forma = formasPagamento.find((f) => f.id === selectedFormaPagamento);
                if (!forma) return null;
                const total = calculateTotal();
                const valorEntrada = forma.entrada_tipo === 'percentual' ? (total * forma.entrada_valor) / 100 : forma.entrada_valor;
                const saldoRestante = Math.max(0, total - valorEntrada);
                const valorParcela = forma.max_parcelas > 0 ? saldoRestante / forma.max_parcelas : 0;
                return (
                  <div style={{ marginTop: 16, background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 12, padding: '16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', marginBottom: 12 }}>Detalhes do Parcelamento</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,140px),1fr))', gap: 10 }}>
                      <div style={{ background: '#fff', borderRadius: 10, padding: '12px 14px', border: '1px solid #fee2e2' }}>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase' }}>Entrada</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#dc2626' }}>{formatCurrency(valorEntrada)}</div>
                      </div>
                      {forma.max_parcelas > 0 && saldoRestante > 0.01 && (
                        <div style={{ background: '#fff', borderRadius: 10, padding: '12px 14px', border: '1px solid #fee2e2' }}>
                          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase' }}>Parcelas</div>
                          <div style={{ fontSize: 18, fontWeight: 900, color: '#dc2626' }}>{forma.max_parcelas}x de {formatCurrency(valorParcela)}</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Total */}
          <div
            ref={totalSectionRef}
            style={{
              background: 'linear-gradient(135deg, #dc2626, #ea580c)',
              borderRadius: 16,
              padding: '28px 24px',
              textAlign: 'center',
              color: '#fff',
              boxShadow: '0 8px 32px rgba(220,38,38,.3)',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '3px', textTransform: 'uppercase', opacity: 0.8, marginBottom: 8 }}>
              🏷️ Valor Total da Oferta
            </div>
            <p style={{ fontSize: 'clamp(36px,7vw,56px)', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1, marginBottom: 8 }}>
              {formatCurrency(calculateTotal())}
            </p>
            <p style={{ fontSize: 12, opacity: 0.75, fontWeight: 600 }}>Condições especiais por tempo limitado</p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!fieldsValidation.canUseWhatsApp}
            className={fieldsValidation.canUseWhatsApp ? 'promo-shimmer-btn' : ''}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              background: fieldsValidation.canUseWhatsApp ? undefined : '#e5e7eb',
              border: 'none', color: '#fff',
              padding: '18px 32px', borderRadius: 14,
              fontSize: 17, fontWeight: 800, cursor: fieldsValidation.canUseWhatsApp ? 'pointer' : 'not-allowed',
              boxShadow: fieldsValidation.canUseWhatsApp ? '0 6px 28px rgba(220,38,38,.4)' : 'none',
              transition: 'opacity .2s',
              opacity: fieldsValidation.canUseWhatsApp ? 1 : 0.5,
              letterSpacing: '0.3px',
            }}
          >
            {!fieldsValidation.canUseWhatsApp ? <Lock size={20} /> : <Send size={20} />}
            {fieldsValidation.canUseWhatsApp ? (template?.texto_botao_envio || '🔥 Garantir Minha Oferta via WhatsApp') : 'Preencha os campos obrigatórios'}
          </button>

        </form>
      </section>

      {/* Rate Photographer Button */}
      {profile && (
        <div style={{ padding: '0 24px 32px', maxWidth: 760, margin: '0 auto' }}>
          <RatePhotographerButton
            userId={template.user_id}
            templateId={template.id}
            profileName={profile.nome_profissional}
            aceitaAvaliacoes={profile.aceita_avaliacoes ?? true}
            aprovacaoAutomatica={profile.aprovacao_automatica_avaliacoes ?? false}
            theme={{
              primaryColor: 'red',
              buttonColor: 'bg-red-600 hover:bg-red-700 text-white'
            }}
          />
        </div>
      )}

      {/* ── FOOTER ── */}
      {!(profile?.status_assinatura === 'active') && (
        <footer style={{ background: '#fff', borderTop: '2px solid #fee2e2', padding: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: '#9ca3af' }}>
            Powered by{' '}
            <a href="https://priceus.com.br" target="_blank" rel="noopener noreferrer" style={{ color: '#dc2626', fontWeight: 700, textDecoration: 'none' }}>PriceUs</a>
          </p>
        </footer>
      )}
    </div>
  );
}
