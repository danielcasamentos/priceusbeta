import { Send, Lock, MapPin, ExternalLink, Sparkles, MessageCircle, Instagram, Mail } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { ImageWithFallback } from '../ImageWithFallback';
import { ProductGalleryCarousel } from '../ui/ProductGalleryCarousel';

interface QuoteDarkStudioProps {
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
}

export function QuoteDarkStudio(props: QuoteDarkStudioProps) {
  const {
    template, profile, produtos, selectedProdutos, formData,
    calculateTotal, handleSubmit, fieldsValidation,
    camposExtras, camposExtrasData,
  } = props;

  return (
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        background: '#07101f',
        color: '#fff',
        minHeight: '100vh',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes dsIn { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes dsGlow { 0%,100% { box-shadow:0 0 20px rgba(34,197,94,.15); } 50% { box-shadow:0 0 40px rgba(34,197,94,.35); } }
        .ds-in { animation: dsIn .55s ease both; }
        .ds-in-1 { animation: dsIn .55s ease .1s both; }
        .ds-in-2 { animation: dsIn .55s ease .2s both; }
        .ds-in-3 { animation: dsIn .55s ease .3s both; }
        .ds-card { transition: transform .25s ease, box-shadow .25s ease; }
        .ds-card:hover { transform: translateY(-3px); box-shadow: 0 16px 48px rgba(0,0,0,.5), 0 0 0 1px rgba(34,197,94,.15); }
        .ds-prod { transition: border-color .2s, background .2s; }
        .ds-prod.selected { border-color: rgba(34,197,94,.5) !important; background: rgba(34,197,94,.06) !important; }
        .ds-input { background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); border-radius: 10px; color: #fff; padding: 12px 16px; width: 100%; font-size: 15px; outline: none; transition: border-color .2s; }
        .ds-input::placeholder { color: rgba(255,255,255,.35); }
        .ds-input:focus { border-color: rgba(34,197,94,.5); box-shadow: 0 0 0 3px rgba(34,197,94,.1); }
        .ds-qty-btn { width: 36px; height: 36px; border-radius: 8px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.06); color: #fff; font-size: 18px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .2s; }
        .ds-qty-btn:hover:not(:disabled) { background: rgba(34,197,94,.15); border-color: rgba(34,197,94,.3); }
        .ds-qty-btn:disabled { opacity: 0.35; cursor: not-allowed; }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{
        background: 'rgba(7,16,31,.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,.07)',
        padding: '0 24px',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/Logo Price Us.png" alt="PriceUs" style={{ height: 28 }} />
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
          Orçamento Profissional
        </div>
      </nav>

      {/* ── HERO / PROFILE ── */}
      {profile && (
        <section
          className="ds-in"
          style={{
            padding: '60px 24px 48px',
            background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(22,163,74,.10), transparent 55%), #07101f',
            position: 'relative',
            overflow: 'hidden',
            textAlign: 'center',
          }}
        >
          {/* grid bg */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px)',
            backgroundSize: '64px 64px', zIndex: 0,
          }} />

          <div style={{ position: 'relative', zIndex: 1, maxWidth: 640, margin: '0 auto' }}>
            {profile.profile_image_url && (
              <div style={{ marginBottom: 20, display: 'inline-block', position: 'relative' }}>
                <div style={{
                  position: 'absolute', inset: -6, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#16a34a,#22c55e)',
                  opacity: 0.4, filter: 'blur(10px)', animation: 'dsGlow 3s ease infinite',
                }} />
                <img
                  src={profile.profile_image_url}
                  alt={profile.nome_profissional}
                  style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(34,197,94,.5)', position: 'relative', display: 'block' }}
                />
              </div>
            )}

            <h1 className="ds-in-1" style={{ fontSize: 'clamp(24px,5vw,42px)', fontWeight: 900, letterSpacing: '-1px', marginBottom: 6, lineHeight: 1.1 }}>
              {profile.nome_profissional}
            </h1>

            {profile.tipo_fotografia && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(34,197,94,.12)', border: '1px solid rgba(34,197,94,.25)',
                borderRadius: 999, padding: '4px 14px', marginBottom: 16,
                fontSize: 12, fontWeight: 700, color: '#22c55e', letterSpacing: '1px', textTransform: 'uppercase',
              }}>
                <MapPin size={12} />
                {profile.tipo_fotografia}
              </div>
            )}

            {profile.apresentacao && (
              <p className="ds-in-2" style={{ fontSize: 15, color: 'rgba(255,255,255,.55)', lineHeight: 1.7, maxWidth: 500, margin: '0 auto 24px' }}>
                {profile.apresentacao}
              </p>
            )}

            <div className="ds-in-3" style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              {profile.whatsapp_principal && (
                <a
                  href={`https://wa.me/${profile.whatsapp_principal.replace(/\D/g, '')}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#16a34a,#22c55e)', color: '#fff', padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
                >
                  <MessageCircle size={14} /> WhatsApp
                </a>
              )}
              {profile.instagram && (
                <a
                  href={`https://instagram.com/${profile.instagram.replace('@', '')}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#e1306c,#f77737)', color: '#fff', padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
                >
                  <Instagram size={14} /> Instagram
                </a>
              )}
              {profile.email_recebimento && (
                <a
                  href={`mailto:${profile.email_recebimento}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.12)', color: '#fff', padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
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
        <div style={{ textAlign: 'center', padding: '48px 0 32px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '3px', color: '#22c55e', textTransform: 'uppercase', marginBottom: 10 }}>
            <Sparkles size={12} style={{ display: 'inline', marginRight: 6 }} />
            Orçamento
          </div>
          <h2 style={{ fontSize: 'clamp(22px,4vw,36px)', fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1.1 }}>
            {template?.titulo_template || template?.nome_template}
          </h2>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Dados do cliente */}
          <div
            className="ds-card"
            style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, padding: '24px' }}
          >
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 16 }}>
              Seus Dados
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <input
                id="ds-nome"
                type="text"
                placeholder="Nome Completo *"
                value={formData.nome_cliente}
                onChange={(e) => props.setFormData({ ...formData, nome_cliente: e.target.value })}
                className="ds-input"
                required
              />
              <input
                id="ds-email"
                type="email"
                placeholder="E-mail *"
                value={formData.email_cliente}
                onChange={(e) => props.setFormData({ ...formData, email_cliente: e.target.value })}
                className="ds-input"
                required
              />
              <input
                id="ds-tel"
                type="tel"
                placeholder="WhatsApp *"
                value={formData.telefone_cliente}
                onChange={(e) => props.setFormData({ ...formData, telefone_cliente: e.target.value })}
                className="ds-input"
                required
              />
            </div>
          </div>

          {/* Location / Date fields */}
          {props.renderLocationDateFields && (
            <div
              className="ds-card"
              style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, padding: '24px' }}
            >
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 16 }}>
                Evento
              </h3>
              <div style={{ color: 'rgba(255,255,255,.85)' }}>
                {props.renderLocationDateFields()}
              </div>
            </div>
          )}

          {/* Campos extras */}
          {camposExtras.length > 0 && (
            <div
              className="ds-card"
              style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, padding: '24px' }}
            >
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 16 }}>
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
                      className="ds-input"
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
                      className="ds-input"
                    />
                  )
                )}
              </div>
            </div>
          )}

          {/* Produtos */}
          <div
            className="ds-card"
            style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, padding: '24px' }}
          >
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 20 }}>
              <Sparkles size={13} style={{ display: 'inline', marginRight: 6 }} />
              Serviços Disponíveis
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {produtos.map((produto) => {
                const isSelected = !!selectedProdutos[produto.id];
                return (
                  <div
                    key={produto.id}
                    className={`ds-prod${isSelected ? ' selected' : ''}`}
                    style={{
                      border: '1px solid rgba(255,255,255,.09)',
                      borderRadius: 12,
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                    }}
                  >
                    {/* Image */}
                    {produto.mostrar_imagem && (produto.imagem_url || produto.imagens?.length > 0) && (
                      <div style={{ width: 72, height: 72, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
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
                    )}
                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{produto.nome}</h4>
                      {produto.resumo && (
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', lineHeight: 1.5 }}>{produto.resumo}</p>
                      )}
                      {!template?.ocultar_valores_intermediarios && (
                        <p style={{ fontSize: 17, fontWeight: 800, color: '#22c55e', marginTop: 4 }}>
                          {formatCurrency(produto.valor)}
                        </p>
                      )}
                    </div>
                    {/* Qty control */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <button
                        type="button"
                        className="ds-qty-btn"
                        onClick={() => props.handleProdutoQuantityChange(produto.id, (selectedProdutos[produto.id] || 0) - 1)}
                        disabled={produto.obrigatorio && selectedProdutos[produto.id] === 1}
                      >
                        −
                      </button>
                      <span style={{ width: 28, textAlign: 'center', fontWeight: 800, fontSize: 17 }}>
                        {selectedProdutos[produto.id] || 0}
                      </span>
                      <button
                        type="button"
                        className="ds-qty-btn"
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
                );
              })}
            </div>
          </div>

          {/* Total */}
          <div style={{
            background: 'rgba(34,197,94,.07)',
            border: '1px solid rgba(34,197,94,.2)',
            borderRadius: 16,
            padding: '24px',
            textAlign: 'center',
            animation: 'dsGlow 3s ease infinite',
          }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(34,197,94,.7)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 8 }}>
              Valor Total
            </p>
            <p style={{ fontSize: 'clamp(32px,6vw,52px)', fontWeight: 900, color: '#22c55e', letterSpacing: '-1px', lineHeight: 1 }}>
              {formatCurrency(calculateTotal())}
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!fieldsValidation.canUseWhatsApp}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              background: fieldsValidation.canUseWhatsApp
                ? 'linear-gradient(135deg,#16a34a,#22c55e)'
                : 'rgba(255,255,255,.1)',
              border: 'none',
              color: '#fff',
              padding: '16px 32px',
              borderRadius: 14,
              fontSize: 16,
              fontWeight: 800,
              cursor: fieldsValidation.canUseWhatsApp ? 'pointer' : 'not-allowed',
              boxShadow: fieldsValidation.canUseWhatsApp ? '0 4px 24px rgba(22,163,74,.35)' : 'none',
              transition: 'all .2s',
              opacity: fieldsValidation.canUseWhatsApp ? 1 : 0.5,
            }}
          >
            {!fieldsValidation.canUseWhatsApp ? <Lock size={20} /> : <Send size={20} />}
            Enviar Orçamento via WhatsApp
          </button>
        </form>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#04090f', padding: '28px 24px', borderTop: '1px solid rgba(255,255,255,.06)', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,.25)' }}>
          Powered by{' '}
          <a href="/" style={{ color: '#22c55e', fontWeight: 700, textDecoration: 'none' }}>PriceUs</a>
        </p>
      </footer>
    </div>
  );
}
