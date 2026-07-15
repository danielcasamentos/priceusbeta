import { Send, Lock, Tag, Flame, MessageCircle, Instagram, Mail, Star, Clock, Zap } from 'lucide-react';
import { formatCurrency, formatDuration } from '../../lib/utils';
import { ImageWithFallback } from '../ImageWithFallback';
import { ProductGalleryCarousel } from '../ui/ProductGalleryCarousel';
import { FormattedDescription } from '../ui/FormattedDescription';
import { QuoteHeaderRating } from '../QuoteHeaderRating';

interface QuoteOfertaProps {
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
  upsellProdutos?: any[];
}

export function QuoteOferta(props: QuoteOfertaProps) {
  const {
    template, profile, produtos, selectedProdutos, formData,
    calculateTotal, handleSubmit, fieldsValidation,
    camposExtras, camposExtrasData, fieldErrors,
    formasPagamento = [],
    selectedFormaPagamento = '',
    setSelectedFormaPagamento,
    firstProductRef,
    totalSectionRef,
    upsellProdutos = [],
  } = props;

  return (
    <div
      className="oferta-root"
      style={{
        fontFamily: "'Inter', sans-serif",
        background: '#fff3e0',
        // Laranja com textura dinâmica de marca d'água repetida da palavra "OFERTA"
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'><text x='30' y='80' fill='rgba(249, 115, 22, 0.055)' font-size='12' font-family='Inter, sans-serif' font-weight='900' transform='rotate(-40 80 80)'>OFERTA ESPECIAL</text></svg>")`,
        backgroundRepeat: 'repeat',
        color: '#1a1a1a',
        minHeight: '100vh',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes oferta-pulse { 0%,100% { box-shadow:0 0 0 0 rgba(234,88,12,.4); } 70% { box-shadow:0 0 0 12px rgba(234,88,12,0); } }
        @keyframes oferta-in { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes oferta-badge { 0%,100% { transform:rotate(-2deg) scale(1); } 50% { transform:rotate(2deg) scale(1.05); } }
        @keyframes oferta-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes swing-tag-page {
          0%, 100% { transform: rotate(-8deg); }
          50% { transform: rotate(8deg); }
        }
        .oferta-in { animation: oferta-in .5s ease both; }
        .oferta-in-1 { animation: oferta-in .5s ease .1s both; }
        .oferta-in-2 { animation: oferta-in .5s ease .2s both; }
        .oferta-card { transition: transform .2s, box-shadow .2s; }
        .oferta-card:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(234,88,12,.15); }
        .oferta-prod { transition: border-color .2s, background .2s, transform .15s; }
        .oferta-prod:hover { transform: translateY(-1px); }
        .oferta-prod.selected { border-color: #ea580c !important; background: #fffaf0 !important; }
        .oferta-input {
          background: #fff;
          border: 2px solid #ffedd5;
          border-radius: 10px;
          color: #1a1a1a;
          padding: 12px 16px;
          width: 100%;
          font-size: 15px;
          outline: none;
          transition: border-color .2s, box-shadow .2s;
          font-family: 'Inter', sans-serif;
        }
        .oferta-input::placeholder { color: #9ca3af; }
        .oferta-input:focus { border-color: #ea580c; box-shadow: 0 0 0 3px rgba(234,88,12,.12); }
        .oferta-qty-btn {
          width: 36px; height: 36px; border-radius: 8px;
          border: 2px solid #ffedd5;
          background: #fff;
          color: #ea580c; font-size: 18px; font-weight: 700;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background .15s, border-color .15s;
        }
        .oferta-qty-btn:hover:not(:disabled) { background: #ea580c; color: #fff; border-color: #ea580c; }
        .oferta-qty-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .oferta-shimmer-btn {
          background: linear-gradient(90deg, #ea580c, #ef4444, #f59e0b, #ef4444, #ea580c);
          background-size: 200% auto;
          animation: oferta-shimmer 2s linear infinite;
        }
        .oferta-urgency-badge {
          animation: oferta-badge 2s ease-in-out infinite;
        }
        .oferta-swing-tag {
          animation: swing-tag-page 2.5s infinite ease-in-out;
          transform-origin: top center;
        }
        @keyframes oferta-bg-drift {
          0%   { background-position: 0 0; }
          100% { background-position: 160px 160px; }
        }
        .oferta-root {
          animation: oferta-bg-drift 20s linear infinite;
        }
      `}</style>

      {/* ── NAV COM LOGO AMPLIAÇÃO ── */}
      <nav style={{
        background: 'rgba(255,255,255,.97)',
        backdropFilter: 'blur(20px)',
        borderBottom: '4px solid #ea580c',
        padding: '0 24px',
        height: 70,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 4px 20px rgba(234,88,12,.08)'
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'linear-gradient(135deg,#ea580c,#ef4444)',
          color: '#fff', padding: '6px 16px', borderRadius: 999,
          fontSize: 14, fontWeight: 900, letterSpacing: '0.8px',
          boxShadow: '0 2px 10px rgba(234,88,12,.25)'
        }}>
          <Flame size={14} className="animate-bounce" />
          SUPER OFERTA
        </div>
      </nav>

      {/* ── HERO BANNER AMPLIAÇÃO ── */}
      <div style={{
        background: 'linear-gradient(135deg, #ea580c 0%, #ef4444 50%, #f97316 100%)',
        padding: '14px 24px',
        textAlign: 'center',
        color: '#fff',
        fontSize: 15,
        fontWeight: 800,
        letterSpacing: '0.8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        boxShadow: 'inset 0 -2px 5px rgba(0,0,0,0.1)'
      }}>
        <Zap size={16} className="animate-pulse" />
        {template?.titulo_template ? `⚡ ${template.titulo_template}` : '⚡ Condição Exclusiva e por Tempo Limitado — Aproveite!'}
        <Zap size={16} className="animate-pulse" />
      </div>

      {/* ── HERO / PROFILE ── */}
      {profile && (
        <section
          className="oferta-in"
          style={{
            padding: '48px 24px 36px',
            background: 'linear-gradient(180deg, #fff3e0 0%, #ffffff 100%)',
            textAlign: 'center',
            borderBottom: '1px solid #ffedd5',
            position: 'relative'
          }}
        >
          <div style={{ maxWidth: 640, margin: '0 auto', position: 'relative' }}>
            {/* Swinging physical-looking offer tag on the page hero */}
            <div className="oferta-swing-tag" style={{ position: 'absolute', top: -10, right: 10, width: 44, height: 70, pointerEvents: 'none', zIndex: 10 }}>
              <div style={{ width: 2, height: 16, backgroundColor: '#d1d5db', margin: '0 auto' }} />
              <div style={{
                width: 44, height: 54,
                background: 'linear-gradient(135deg, #ef4444, #f97316)',
                borderRadius: '4px 4px 8px 8px',
                boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                position: 'relative', border: '1px solid #fee2e2'
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#fff', position: 'absolute', top: 4, left: 19 }} />
                <span style={{ color: '#fff', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 8, lineHeight: 1 }}>MEGA</span>
                <span style={{ color: '#fff', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1 }}>OFERTA</span>
              </div>
            </div>

            {/* Urgency badge */}
            <div
              className="oferta-urgency-badge"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'linear-gradient(135deg, #ea580c, #ef4444)', color: '#fff',
                borderRadius: 999, padding: '6px 16px',
                fontSize: 11, fontWeight: 900, letterSpacing: '1.5px', textTransform: 'uppercase',
                marginBottom: 20, boxShadow: '0 4px 12px rgba(234,88,12,0.2)'
              }}
            >
              <Tag size={12} /> Oportunidade Única
            </div>

            {profile.profile_image_url && (
              <div style={{ marginBottom: 16, display: 'inline-block', position: 'relative' }}>
                <div style={{
                  position: 'absolute', inset: -5, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ea580c, #f59e0b)',
                  animation: 'oferta-pulse 2.5s ease-out infinite',
                }} />
                <img
                  src={profile.profile_image_url}
                  alt={profile.nome_profissional}
                  style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', border: '4px solid #fff', position: 'relative', display: 'block' }}
                />
              </div>
            )}

            <h1 className="oferta-in-1" style={{ fontSize: 'clamp(26px,5.5vw,44px)', fontWeight: 900, letterSpacing: '-1.2px', marginBottom: 6, lineHeight: 1.1, color: '#1a1a1a' }}>
              {profile.nome_profissional}
            </h1>

            {profile.tipo_fotografia && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: '#fffaf0', border: '1px solid #fed7aa',
                borderRadius: 999, padding: '4px 14px', marginBottom: 16,
                fontSize: 12, fontWeight: 800, color: '#ea580c', letterSpacing: '0.5px',
              }}>
                <Star size={11} fill="#ea580c" />
                {profile.tipo_fotografia}
              </div>
            )}

            {profile.apresentacao && (
              <p className="oferta-in-2" style={{ fontSize: 16, color: '#4b5563', lineHeight: 1.7, maxWidth: 520, margin: '0 auto 24px' }}>
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

            <div className="oferta-in-2" style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              {profile.whatsapp_principal && (
                <a
                  href={`https://wa.me/${profile.whatsapp_principal.replace(/\D/g, '')}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#16a34a', color: '#fff', padding: '10px 22px', borderRadius: 12, fontSize: 14, fontWeight: 800, textDecoration: 'none', boxShadow: '0 4px 14px rgba(22,163,74,0.15)' }}
                >
                  <MessageCircle size={15} /> WhatsApp
                </a>
              )}
              {profile.instagram && (
                <a
                  href={`https://instagram.com/${profile.instagram.replace('@', '')}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#e1306c,#f77737)', color: '#fff', padding: '10px 22px', borderRadius: 12, fontSize: 14, fontWeight: 800, textDecoration: 'none', boxShadow: '0 4px 14px rgba(225,48,108,0.15)' }}
                >
                  <Instagram size={15} /> Instagram
                </a>
              )}
              {profile.email_recebimento && (
                <a
                  href={`mailto:${profile.email_recebimento}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#374151', padding: '10px 22px', borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}
                >
                  <Mail size={15} /> E-mail
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── FORM + PRODUTOS ── */}
      <section style={{ padding: '0 24px 80px', maxWidth: 780, margin: '0 auto' }}>

        {/* Título do template */}
        <div style={{ textAlign: 'center', padding: '48px 0 32px' }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '4px', color: '#ea580c', textTransform: 'uppercase', marginBottom: 8 }}>
            <Flame size={14} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
            OFERTA CHAMATIVA ATIVA
          </div>
          <h2 style={{ fontSize: 'clamp(22px,4.5vw,38px)', fontWeight: 900, letterSpacing: '-0.8px', lineHeight: 1.1, color: '#1a1a1a' }}>
            {template?.titulo_template || template?.nome_template}
          </h2>
          <div style={{
            width: 64, height: 5,
            background: 'linear-gradient(90deg, #ea580c, #ef4444)',
            borderRadius: 999, margin: '14px auto 0',
          }} />
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Dados do cliente */}
          <div
            className="oferta-card"
            style={{ background: '#fff', border: '2px solid #ffedd5', borderRadius: 18, padding: '28px', boxShadow: '0 6px 20px rgba(234,88,12,.05)' }}
          >
            <h3 style={{ fontSize: 12, fontWeight: 900, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={14} /> Confirme Seus Dados
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 14 }}>
              <div>
                <input
                  id="oferta-nome"
                  type="text"
                  placeholder="Nome Completo *"
                  value={formData.nome_cliente}
                  onChange={(e) => props.setFormData({ ...formData, nome_cliente: e.target.value })}
                  className="oferta-input"
                  required
                />
              </div>
              <div>
                <input
                  id="oferta-email"
                  type="email"
                  placeholder="E-mail *"
                  value={formData.email_cliente}
                  onChange={(e) => props.setFormData({ ...formData, email_cliente: e.target.value })}
                  className="oferta-input"
                  style={fieldErrors?.email ? { borderColor: '#ef4444' } : {}}
                  required
                />
                {fieldErrors?.email && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4, fontWeight: 600 }}>{fieldErrors.email}</p>}
              </div>
              <div>
                <input
                  id="oferta-telefone"
                  type="tel"
                  placeholder="WhatsApp (Ex: 11999999999) *"
                  value={formData.telefone_cliente}
                  onChange={(e) => props.setFormData({ ...formData, telefone_cliente: e.target.value })}
                  className="oferta-input"
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
              className="oferta-card"
              style={{ background: '#fff', border: '2px solid #ffedd5', borderRadius: 18, padding: '28px', boxShadow: '0 6px 20px rgba(234,88,12,.05)' }}
            >
              <h3 style={{ fontSize: 12, fontWeight: 900, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 18 }}>
                Informações de Local e Data
              </h3>
              {props.renderLocationDateFields()}
            </div>
          )}

          {/* Campos extras */}
          {camposExtras.length > 0 && (
            <div
              className="oferta-card"
              style={{ background: '#fff', border: '2px solid #ffedd5', borderRadius: 18, padding: '28px', boxShadow: '0 6px 20px rgba(234,88,12,.05)' }}
            >
              <h3 style={{ fontSize: 12, fontWeight: 900, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 18 }}>
                Mais Detalhes
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {camposExtras.map((campo) =>
                  campo.tipo === 'textarea' ? (
                    <textarea
                      key={campo.id}
                      placeholder={campo.placeholder}
                      value={camposExtrasData[campo.id] || ''}
                      onChange={(e) => props.setCamposExtrasData({ ...camposExtrasData, [campo.id]: e.target.value })}
                      required={campo.obrigatorio}
                      rows={3}
                      className="oferta-input"
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
                      className="oferta-input"
                    />
                  )
                )}
              </div>
            </div>
          )}

          {/* Produtos */}
          <div
            className="oferta-card"
            style={{ background: '#fff', border: '2px solid #ffedd5', borderRadius: 18, padding: '28px', boxShadow: '0 6px 20px rgba(234,88,12,.05)' }}
          >
            <h3 style={{ fontSize: 12, fontWeight: 900, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Tag size={14} /> Selecione Seus Serviços com Desconto
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {produtos.map((produto) => {
                const isSelected = !!selectedProdutos[produto.id];
                return (
                  <div
                    key={produto.id}
                    className={`oferta-prod${isSelected ? ' selected' : ''}`}
                    style={{
                      border: produto.destacar_produto ? '3px solid #ea580c' : '2px solid #ffedd5',
                      borderRadius: 14,
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 14,
                      background: '#fff',
                      ...(produto.destacar_produto
                        ? {
                            boxShadow: '0 8px 30px rgba(234,88,12,0.18)',
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
                        gap: 16 
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
                              borderRadius: 12, 
                              overflow: 'hidden', 
                              flexShrink: 0, 
                              border: '2px solid #fed7aa',
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
                            background: 'linear-gradient(135deg,#ea580c,#ef4444)',
                            borderRadius: 999,
                            padding: '2px 10px',
                            marginBottom: 6,
                            fontSize: 10,
                            fontWeight: 900,
                            color: '#fff',
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase',
                            boxShadow: '0 2px 10px rgba(234,88,12,.3)',
                          }}>
                            ⚡ {produto.destaque_texto}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap', justifyContent: 'space-between' }}>
                          <h4 style={{ fontSize: 16, fontWeight: 800, color: '#1a1a1a', marginBottom: 2, wordBreak: 'break-word', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                            <span>{produto.nome}</span>
                            {template?.exibir_duracao_produto && produto.duracao_minutos && produto.duracao_minutos > 0 && (
                              <span style={{ fontSize: 10, fontWeight: 400, color: '#4b5563', background: '#f3f4f6', padding: '1px 6px', borderRadius: 4, border: '1px solid #e5e7eb' }}>
                                ⏱️ {formatDuration(produto.duracao_minutos)}
                              </span>
                            )}
                          </h4>
                          {isSelected && (
                            <span style={{
                              background: 'linear-gradient(135deg,#ea580c,#ef4444)',
                              color: '#fff', fontSize: 10, fontWeight: 900,
                              padding: '3px 10px', borderRadius: 999,
                              whiteSpace: 'nowrap', flexShrink: 0,
                              boxShadow: '0 2px 6px rgba(234,88,12,0.2)'
                            }}>✔ Selecionado</span>
                          )}
                        </div>
                        {produto.resumo && (
                          <FormattedDescription text={produto.resumo} className="mt-2 text-xs" />
                        )}

                        {/* Brindes Vinculados em Sub-Cards */}
                        {produto.brindes_vinculados && Array.isArray(produto.brindes_vinculados) && produto.brindes_vinculados.length > 0 && (
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #e5e7eb' }}>
                            <span style={{ fontSize: 10, fontWeight: 800, color: '#ea580c', display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>
                              🎁 Brinde Incluso:
                            </span>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                              {produto.brindes_vinculados.map((brindeId: string) => {
                                const brinde = (upsellProdutos || []).find((u: any) => u.id === brindeId);
                                if (!brinde) return null;
                                return (
                                  <div
                                    key={brindeId}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 10,
                                      padding: '8px 10px',
                                      borderRadius: 8,
                                      border: '1px solid #ffedd5',
                                      background: '#fffaf5'
                                    }}
                                  >
                                    {brinde.imagem_url && (
                                      <img
                                        src={brinde.imagem_url}
                                        alt={brinde.nome}
                                        style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
                                      />
                                    )}
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                      <div style={{ fontSize: 11, fontWeight: 700, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {brinde.nome}
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                        <span style={{ fontSize: 9, color: '#9ca3af', textDecoration: 'line-through' }}>
                                          {formatCurrency(brinde.valor)}
                                        </span>
                                        <span style={{ fontSize: 9, fontWeight: 700, color: '#ea580c', background: '#ffedd5', padding: '1px 4px', borderRadius: 2 }}>
                                          Grátis
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {!template?.ocultar_valores_intermediarios && (() => {
                          const desconto = produto.desconto_percentual ?? 0;
                          const valorFinal = produto.valor * (1 - desconto / 100);
                          return (
                            <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              {desconto > 0 && (
                                <span style={{ background: '#ffedd5', color: '#ea580c', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>
                                  🏷️ {desconto}% OFF
                                </span>
                              )}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {desconto > 0 && (
                                  <span style={{ fontSize: 14, color: '#9ca3af', textDecoration: 'line-through' }}>{formatCurrency(produto.valor)}</span>
                                )}
                                <span style={{ fontSize: 19, fontWeight: 900, color: '#ea580c' }}>{formatCurrency(valorFinal)}</span>
                              </div>
                              {desconto > 0 && (
                                <span style={{ fontSize: 12, color: '#ea580c', fontWeight: 600 }}>Economia de {formatCurrency(produto.valor - valorFinal)}</span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Linha inferior: controle de quantidade ou toggle */}
                    {(produto.permite_multiplas_unidades ?? true) ? (
                      <div style={{
                        display: 'flex', alignItems: 'center',
                        background: '#fff7ed', borderRadius: 12, padding: '12px 16px',
                        justifyContent: 'space-between'
                      }}>
                        <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 600 }}>
                          {isSelected ? `${selectedProdutos[produto.id]}x selecionado${selectedProdutos[produto.id] > 1 ? 's' : ''}` : 'Não selecionado'}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <button
                            type="button"
                            className="oferta-qty-btn"
                            onClick={() => props.handleProdutoQuantityChange(produto.id, (selectedProdutos[produto.id] || 0) - 1)}
                            disabled={produto.obrigatorio && selectedProdutos[produto.id] === 1}
                          >
                            −
                          </button>
                          <span style={{ width: 28, textAlign: 'center', fontWeight: 900, fontSize: 18, color: '#1a1a1a' }}>
                            {selectedProdutos[produto.id] || 0}
                          </span>
                          <button
                            type="button"
                            className="oferta-qty-btn"
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
                      <div style={{
                        display: 'flex', alignItems: 'center',
                        background: '#fff7ed', borderRadius: 12, padding: '12px 16px',
                        justifyContent: 'center'
                      }}>
                        {produto.obrigatorio ? (
                          <div style={{ padding: '6px 16px', background: '#ffedd5', border: '1px solid #fed7aa', color: '#ea580c', borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
                            Incluído
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
                              width: '100%',
                              padding: '10px 16px',
                              background: selectedProdutos[produto.id] ? 'linear-gradient(135deg, #ea580c, #c2410c)' : '#fff',
                              border: selectedProdutos[produto.id] ? 'none' : '1px solid #fed7aa',
                              color: selectedProdutos[produto.id] ? '#fff' : '#ea580c',
                              borderRadius: 8,
                              fontSize: 13,
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all .2s'
                            }}
                          >
                            {selectedProdutos[produto.id] ? '✓ Selecionado' : 'Selecionar'}
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
              className="oferta-card"
              style={{ background: '#fff', border: '2px solid #ffedd5', borderRadius: 18, padding: '28px', boxShadow: '0 6px 20px rgba(234,88,12,.05)' }}
            >
              <h3 style={{ fontSize: 12, fontWeight: 900, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 18 }}>
                💳 Condições Especiais de Pagamento
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {formasPagamento.map((forma) => {
                  const total = calculateTotal();
                  const valorEntrada = forma.entrada_tipo === 'percentual'
                    ? (total * forma.entrada_valor) / 100
                    : forma.entrada_valor;

                  const isDefault = forma.is_default;
                  const isSelected = selectedFormaPagamento === forma.id;
                  
                  let borderStyle = '2px solid #ffedd5';
                  let bgStyle = '#fff';
                  
                  if (isSelected) {
                    borderStyle = '2px solid #ea580c';
                    bgStyle = '#fffaf0';
                  } else if (isDefault) {
                    borderStyle = '2px solid #fbd38d';
                    bgStyle = '#fefaf0';
                  }

                  return (
                    <label
                      key={forma.id}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                        padding: '16px 18px', borderRadius: 14,
                        border: borderStyle,
                        background: bgStyle,
                        cursor: 'pointer', transition: 'all .2s',
                      }}
                    >
                      <input
                        type="radio"
                        name="oferta-forma-pagamento"
                        value={forma.id}
                        checked={selectedFormaPagamento === forma.id}
                        onChange={() => setSelectedFormaPagamento?.(forma.id)}
                        style={{ marginTop: 4, accentColor: '#ea580c', width: 16, height: 16, flexShrink: 0 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: 16, color: '#1a1a1a', marginBottom: 4, display: 'flex', alignItems: 'center' }}>
                          {forma.nome}
                          {isDefault && (
                            <span style={{ display: 'inline-block', background: '#ea580c', color: '#fff', fontSize: 9, fontWeight: 900, padding: '2px 6px', borderRadius: 4, marginLeft: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              ⭐ Recomendado
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.6 }}>
                          <div>
                            {forma.entrada_tipo === 'percentual'
                              ? `Entrada de ${forma.entrada_valor}% (${formatCurrency(valorEntrada)})`
                              : `Entrada de ${formatCurrency(valorEntrada)}`}
                          </div>
                          {forma.max_parcelas > 0 && (
                            <div style={{ fontWeight: 600 }}>+ {forma.max_parcelas}x parcela{forma.max_parcelas > 1 ? 's' : ''}</div>
                          )}
                          {forma.acrescimo > 0 && (
                            <div style={{ color: '#ef4444', fontWeight: 600 }}>(+{forma.acrescimo}% acréscimo)</div>
                          )}
                          {forma.acrescimo < 0 && (
                            <div style={{ color: '#16a34a', fontWeight: 600 }}>({forma.acrescimo}% desconto)</div>
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
                  <div style={{ marginTop: 18, background: '#fffaf0', border: '1px solid #fed7aa', borderRadius: 14, padding: '18px' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#ea580c', marginBottom: 12 }}>Resumo de Parcelamento</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,140px),1fr))', gap: 12 }}>
                      <div style={{ background: '#fff', borderRadius: 10, padding: '12px 14px', border: '1px solid #ffe8cc' }}>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase', fontWeight: 700 }}>Entrada</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#ea580c' }}>{formatCurrency(valorEntrada)}</div>
                      </div>
                      {forma.max_parcelas > 0 && saldoRestante > 0.01 && (
                        <div style={{ background: '#fff', borderRadius: 10, padding: '12px 14px', border: '1px solid #ffe8cc' }}>
                          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase', fontWeight: 700 }}>Parcelas</div>
                          <div style={{ fontSize: 18, fontWeight: 900, color: '#ea580c' }}>{forma.max_parcelas}x de {formatCurrency(valorParcela)}</div>
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
              background: 'linear-gradient(135deg, #ea580c, #ef4444)',
              borderRadius: 18,
              padding: '32px 28px',
              textAlign: 'center',
              color: '#fff',
              boxShadow: '0 10px 36px rgba(234,88,12,.35)',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '4px', textTransform: 'uppercase', opacity: 0.9, marginBottom: 8 }}>
              🏷️ VALOR TOTAL COM DESCONTO
            </div>
            <p style={{ fontSize: 'clamp(40px,7.5vw,60px)', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1, marginBottom: 8 }}>
              {formatCurrency(calculateTotal())}
            </p>
            <p style={{ fontSize: 13, opacity: 0.9, fontWeight: 700 }}>Condições por tempo limitado garantidas para você!</p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!fieldsValidation.canUseWhatsApp}
            className={fieldsValidation.canUseWhatsApp ? 'oferta-shimmer-btn' : ''}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              background: fieldsValidation.canUseWhatsApp ? undefined : '#e5e7eb',
              border: 'none', color: '#fff',
              padding: '20px 36px', borderRadius: 16,
              fontSize: 18, fontWeight: 900, cursor: fieldsValidation.canUseWhatsApp ? 'pointer' : 'not-allowed',
              boxShadow: fieldsValidation.canUseWhatsApp ? '0 8px 32px rgba(234,88,12,.3)' : 'none',
              transition: 'opacity .2s',
              opacity: fieldsValidation.canUseWhatsApp ? 1 : 0.5,
              letterSpacing: '0.5px',
            }}
          >
            {!fieldsValidation.canUseWhatsApp ? <Lock size={20} /> : <Send size={20} />}
            {fieldsValidation.canUseWhatsApp ? (template?.texto_botao_envio || '⚡ Garantir Minha Oferta via WhatsApp') : 'Preencha os campos obrigatórios'}
          </button>

        </form>
      </section>

      {/* Rate Photographer Button removido */}

      {/* ── FOOTER ── */}
      {!(profile?.status_assinatura === 'active') && (
        <footer style={{ background: '#fff', borderTop: '2px solid #ffedd5', padding: '28px', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#9ca3af' }}>
            Powered by{' '}
            <a href="https://priceus.com.br" target="_blank" rel="noopener noreferrer" style={{ color: '#ea580c', fontWeight: 800, textDecoration: 'none' }}>PriceUs</a>
          </p>
        </footer>
      )}
    </div>
  );
}
