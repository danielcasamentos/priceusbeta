import { Link } from 'react-router-dom';
import { MapPin, Instagram, Mail, MessageCircle, ExternalLink, Sparkles, Star } from 'lucide-react';
import { StarRating } from './StarRating';

interface Profile {
  id: string;
  nome_profissional: string;
  tipo_fotografia: string;
  profile_image_url: string;
  apresentacao: string;
  instagram: string;
  whatsapp_principal: string;
  email_recebimento: string;
  slug_usuario: string;
  meta_description: string;
}

interface Template {
  id: string;
  nome_template: string;
  slug_template: string;
  titulo_template?: string;
  descricao_perfil?: string;
  ocultar_data_criacao?: boolean;
  created_at: string;
}

interface Review {
  id: string;
  cliente_nome: string;
  rating: number;
  comentario: string;
  created_at: string;
}

interface PublicProfileDarkStudioProps {
  profile: Profile;
  templates: Template[];
  reviews: Review[];
  averageRating: number;
}

export function PublicProfileDarkStudio({ profile, templates, reviews, averageRating }: PublicProfileDarkStudioProps) {
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
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes glow { 0%,100% { box-shadow:0 0 20px rgba(34,197,94,.2); } 50% { box-shadow:0 0 40px rgba(34,197,94,.4); } }
        @keyframes pulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.03); } }
        .ds-card { transition: transform .25s ease, box-shadow .25s ease; }
        .ds-card:hover { transform: translateY(-4px); box-shadow: 0 24px 60px rgba(0,0,0,.6), 0 0 0 1px rgba(34,197,94,.2); }
        .ds-badge { animation: fadeUp .5s ease both; }
        .ds-hero { animation: fadeUp .6s ease .1s both; }
        .ds-name { animation: fadeUp .6s ease .2s both; }
        .ds-bio { animation: fadeUp .6s ease .35s both; }
        .ds-btns { animation: fadeUp .6s ease .45s both; }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ background: 'rgba(7,16,31,.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,.07)', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <img src="/Logo Price Us.png" alt="PriceUs" style={{ height: 30 }} />
        </Link>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' }}>
          Portfólio Profissional
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ padding: '80px 24px 60px', background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(22,163,74,.12), transparent 60%), #07101f', position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
        {/* Grid background */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px)', backgroundSize: '64px 64px', zIndex: 0 }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 760, margin: '0 auto' }} className="ds-hero">
          {/* Avatar */}
          <div style={{ marginBottom: 24, display: 'inline-block', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: -6, borderRadius: '50%', background: 'linear-gradient(135deg,#16a34a,#22c55e)', opacity: 0.5, filter: 'blur(12px)', animation: 'glow 3s ease infinite' }} />
            {profile.profile_image_url ? (
              <img
                src={profile.profile_image_url}
                alt={profile.nome_profissional}
                style={{ width: 128, height: 128, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(34,197,94,.6)', position: 'relative', display: 'block' }}
              />
            ) : (
              <div style={{ width: 128, height: 128, borderRadius: '50%', background: 'rgba(34,197,94,.1)', border: '3px solid rgba(34,197,94,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, position: 'relative' }}>
                📷
              </div>
            )}
          </div>

          {/* Nome */}
          <h1 className="ds-name" style={{ fontSize: 'clamp(28px,5vw,52px)', fontWeight: 900, letterSpacing: '-1.5px', marginBottom: 8, lineHeight: 1.1 }}>
            {profile.nome_profissional}
          </h1>

          {/* Tipo */}
          {profile.tipo_fotografia && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(34,197,94,.12)', border: '1px solid rgba(34,197,94,.3)', borderRadius: 999, padding: '5px 16px', marginBottom: 20, fontSize: 13, fontWeight: 700, color: '#22c55e', letterSpacing: '1px', textTransform: 'uppercase' }}>
              <MapPin size={13} />
              {profile.tipo_fotografia}
            </div>
          )}

          {/* Rating */}
          {averageRating > 0 && (
            <div className="ds-badge" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
              <StarRating rating={averageRating} size="lg" />
              <span style={{ fontSize: 22, fontWeight: 900, color: '#22c55e' }}>{averageRating.toFixed(1)}</span>
              {reviews.length > 0 && (
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,.45)' }}>({reviews.length} avaliações)</span>
              )}
            </div>
          )}

          {/* Bio */}
          {profile.apresentacao && (
            <p className="ds-bio" style={{ fontSize: 'clamp(14px,1.8vw,18px)', color: 'rgba(255,255,255,.6)', lineHeight: 1.7, maxWidth: 560, margin: '0 auto 32px' }}>
              {profile.apresentacao}
            </p>
          )}

          {/* CTAs */}
          <div className="ds-btns" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {profile.whatsapp_principal && (
              <a
                href={`https://wa.me/${profile.whatsapp_principal.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#16a34a,#22c55e)', border: 'none', color: '#fff', padding: '12px 28px', borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 20px rgba(22,163,74,.35)', animation: 'pulse 2.5s ease infinite' }}
              >
                <MessageCircle size={18} /> WhatsApp
              </a>
            )}
            {profile.instagram && (
              <a
                href={`https://instagram.com/${profile.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#e1306c,#f77737)', border: 'none', color: '#fff', padding: '12px 28px', borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}
              >
                <Instagram size={18} /> Instagram
              </a>
            )}
            {profile.email_recebimento && (
              <a
                href={`mailto:${profile.email_recebimento}`}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.15)', color: '#fff', padding: '12px 28px', borderRadius: 12, fontSize: 15, fontWeight: 600, textDecoration: 'none' }}
              >
                <Mail size={18} /> E-mail
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ── PACOTES ── */}
      {templates.length > 0 && (
        <section style={{ padding: '80px 24px', background: '#07101f', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 50% at 80% 50%, rgba(99,102,241,.05), transparent 55%)' }} />
          <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
            <div style={{ textAlign: 'center', marginBottom: 52 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '3px', color: '#22c55e', textTransform: 'uppercase', marginBottom: 12 }}>
                <Sparkles size={13} style={{ display: 'inline', marginRight: 6 }} />
                Orçamentos Disponíveis
              </div>
              <h2 style={{ fontSize: 'clamp(24px,4vw,42px)', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1.1 }}>
                Escolha seu <span style={{ color: '#22c55e' }}>pacote ideal</span>
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
              {templates.map((template, i) => (
                <Link
                  key={template.id}
                  to={`/${profile.slug_usuario}/${template.slug_template}`}
                  style={{ textDecoration: 'none', animation: `fadeUp .5s ease ${i * .1 + .2}s both` }}
                >
                  <div
                    className="ds-card"
                    style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.09)', borderRadius: 20, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}
                  >
                    <div style={{ flex: 1, padding: '24px 24px 20px' }}>
                      <h3 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 4, lineHeight: 1.2 }}>
                        {template.nome_template}
                      </h3>
                      {template.titulo_template && (
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>
                          {template.titulo_template}
                        </p>
                      )}
                      {template.descricao_perfil && (
                        <p style={{ fontSize: 14, color: 'rgba(255,255,255,.5)', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                          {template.descricao_perfil}
                        </p>
                      )}
                    </div>
                    <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      {!template.ocultar_data_criacao && (
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.25)' }}>
                          {new Date(template.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                      <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: '#22c55e' }}>
                        Ver Orçamento <ExternalLink size={14} />
                      </span>
                    </div>
                    {/* green bottom accent */}
                    <div style={{ height: 3, background: 'linear-gradient(90deg, #16a34a, #22c55e)' }} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── AVALIAÇÕES ── */}
      {reviews.length > 0 && (
        <section style={{ padding: '80px 24px', background: 'linear-gradient(180deg,#07101f 0%,#0a1628 100%)' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '3px', color: '#22c55e', textTransform: 'uppercase', marginBottom: 12 }}>
                ⭐ Avaliações de Clientes
              </div>
              <h2 style={{ fontSize: 'clamp(24px,4vw,38px)', fontWeight: 900, letterSpacing: '-1px' }}>
                O que dizem sobre mim
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {reviews.map((review, i) => (
                <div
                  key={review.id}
                  style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, padding: '20px 24px', animation: `fadeUp .5s ease ${i * .12}s both` }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{review.cliente_nome}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <StarRating rating={review.rating} />
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.35)' }}>
                          {new Date(review.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#22c55e' }}>{review.rating.toFixed(1)}</div>
                  </div>
                  {review.comentario && (
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,.55)', lineHeight: 1.7, fontStyle: 'italic' }}>
                      "{review.comentario}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {templates.length === 0 && reviews.length === 0 && (
        <section style={{ padding: '80px 24px', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 16 }}>Nenhum conteúdo disponível no momento.</p>
        </section>
      )}

      {/* ── FOOTER ── */}
      <footer style={{ background: '#04090f', padding: '32px 24px', borderTop: '1px solid rgba(255,255,255,.06)', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,.3)' }}>
          Powered by{' '}
          <Link to="/" style={{ color: '#22c55e', fontWeight: 700, textDecoration: 'none' }}>
            PriceUs
          </Link>
        </p>
      </footer>
    </div>
  );
}
