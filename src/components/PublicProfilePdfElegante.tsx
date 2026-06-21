import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Instagram, Mail, MessageCircle, ExternalLink, Award } from 'lucide-react';
import { StarRating } from './StarRating';
import { getThemeInlineStyles } from '../lib/themeStyles';
import { PortfolioSection } from './PortfolioSection';

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
  status_assinatura?: string | null;
  exibir_avaliacoes_publico?: boolean;
  portfolio_link?: string | null;
  portfolio_fotos?: string[] | null;
}

interface Template {
  id: string;
  nome_template: string;
  slug_template: string;
  titulo_template?: string;
  descricao_perfil?: string;
  ocultar_data_criacao?: boolean;
  created_at: string;
  tema?: string;
}

interface Review {
  id: string;
  cliente_nome: string;
  rating: number;
  comentario: string;
  created_at: string;
}

interface PublicProfilePdfEleganteProps {
  profile: Profile;
  templates: Template[];
  reviews: Review[];
  averageRating: number;
}

export function PublicProfilePdfElegante({ profile, templates, reviews, averageRating }: PublicProfilePdfEleganteProps) {
  const [showAllReviews, setShowAllReviews] = useState(false);

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3);
  const isPremium = profile?.status_assinatura === 'active';

  return (
    <div
      style={{
        fontFamily: "'Montserrat', sans-serif",
        background: '#ffffff',
        color: '#1a1a1a',
        minHeight: '100vh',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap');
        
        .pdf-sans {
          font-family: 'Montserrat', sans-serif;
        }

        .pdf-profile-card {
          border: 1px solid #e2e8f0;
          transition: all 0.3s ease;
          border-radius: 8px;
          background: #ffffff;
        }

        .pdf-profile-card:hover {
          border-color: #1a1a1a;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
        }

        @keyframes swing {
          0%, 100% { transform: rotate(-8deg); }
          50% { transform: rotate(8deg); }
        }
        @keyframes border-glow-orange {
          0%, 100% { border-color: #ea580c; box-shadow: 0 0 10px rgba(234, 88, 12, 0.2); }
          50% { border-color: #ef4444; box-shadow: 0 0 20px rgba(239, 68, 68, 0.4); }
        }
        .oferta-chamativa-card {
          animation: border-glow-orange 3s infinite ease-in-out;
          border-width: 2px !important;
        }
        .oferta-swing-tag {
          animation: swing 2.5s infinite ease-in-out;
          transform-origin: top center;
        }
      `}</style>

      {/* HEADER TOP STRIP */}
      {!isPremium && (
        <nav style={{
          background: '#121212',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '0 24px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}>
          <div className="pdf-sans" style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' }}>
            PERFIL PROFISSIONAL
          </div>
        </nav>
      )}

      <div className="max-w-xl mx-auto px-4 py-8 space-y-8">
        {/* Profile Card & Avatar */}
        <div className="flex flex-col items-center text-center pb-6 border-b border-neutral-100">
          {profile.profile_image_url ? (
            <div className="mb-4">
              <img
                src={profile.profile_image_url}
                alt={profile.nome_profissional}
                style={{ width: 88, height: 88, borderRadius: '0px', objectFit: 'cover', border: '2px solid #e2e8f0' }}
              />
            </div>
          ) : (
            <div className="w-[88px] h-[88px] mb-4 border-2 border-neutral-200 bg-neutral-50 flex items-center justify-center">
              <span className="text-3xl text-neutral-400">👤</span>
            </div>
          )}

          <h2 className="text-xl font-semibold text-neutral-900 tracking-tight leading-snug">{profile.nome_profissional}</h2>
          
          {profile.tipo_fotografia && (
            <p className="pdf-sans text-xs text-neutral-500 uppercase tracking-widest mt-1">
              {profile.tipo_fotografia}
            </p>
          )}

          {/* Average Rating */}
          {profile.exibir_avaliacoes_publico !== false && (
            <div className="flex items-center justify-center gap-2 mt-2">
              <StarRating rating={averageRating || 5.0} size="sm" />
              <span className="text-xs font-semibold text-neutral-800">
                {(averageRating || 5.0).toFixed(1)}
              </span>
              {reviews.length > 0 && (
                <span className="text-[10px] text-neutral-400 pdf-sans">
                  ({reviews.length} {reviews.length === 1 ? 'avaliação' : 'avaliações'})
                </span>
              )}
            </div>
          )}

          {profile.apresentacao && (
            <p className="text-xs text-neutral-500 mt-4 leading-relaxed max-w-md mx-auto">
              {profile.apresentacao}
            </p>
          )}

          {/* Social Connections */}
          <div className="flex flex-wrap gap-4 mt-6 pdf-sans justify-center">
            {profile.whatsapp_principal && (
              <a
                href={`https://wa.me/${profile.whatsapp_principal.replace(/\D/g, '')}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-950 transition-colors"
              >
                <MessageCircle size={13} className="text-neutral-400" /> WhatsApp
              </a>
            )}
            {profile.instagram && (
              <a
                href={`https://instagram.com/${profile.instagram.replace('@', '')}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-950 transition-colors"
              >
                <Instagram size={13} className="text-neutral-400" /> Instagram
              </a>
            )}
            {profile.email_recebimento && (
              <a
                href={`mailto:${profile.email_recebimento}`}
                className="flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-950 transition-colors"
              >
                <Mail size={13} className="text-neutral-400" /> E-mail
              </a>
            )}
          </div>

          <PortfolioSection
            portfolioLink={profile.portfolio_link || null}
            portfolioFotos={profile.portfolio_fotos || null}
          />
        </div>

        {/* Templates (Budgets) Section */}
        {templates.length > 0 && (
          <div className="space-y-4">
            <h3 className="pdf-sans text-xs font-bold uppercase tracking-wider text-neutral-700 border-b border-neutral-100 pb-1.5">
              Propostas & Orçamentos Disponíveis
            </h3>

            <div className="flex flex-col gap-3">
              {templates.map((template) => {
                const CLASSIC_THEMES = ['moderno', 'classico', 'romantico', 'vibrante', 'natural', 'minimalista', 'darkstudio', 'pretoebranco', 'escuro', 'studio', 'pdf-elegante', 'pdf-elegante-2'];
                const isPromo = !!template.tema && !CLASSIC_THEMES.includes(template.tema);
                const isOferta = template.tema === 'oferta';
                const temaStyles = getThemeInlineStyles(template.tema || 'moderno');
                const themeEmoji = temaStyles.themeEmoji || '✨';
                const themeName = template.tema ? template.tema.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Especial';

                return (
                  <Link
                    key={template.id}
                    to={`/${profile.slug_usuario}/${template.slug_template}`}
                    className={`pdf-profile-card p-4 block relative group ${
                      isOferta ? 'oferta-chamativa-card' : ''
                    }`}
                  >
                    {isOferta && (
                      <div className="absolute -top-1 right-6 z-10 oferta-swing-tag" style={{ width: 44, height: 70, pointerEvents: 'none' }}>
                        <div style={{ width: 2, height: 16, backgroundColor: '#ea580c', margin: '0 auto' }} />
                        <div style={{
                          width: 44,
                          height: 54,
                          background: 'linear-gradient(135deg, #ea580c, #ef4444)',
                          borderRadius: '4px 4px 8px 8px',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          border: '1px solid #fed7aa'
                        }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#fff', position: 'absolute', top: 4, left: 19 }} />
                          <span style={{ color: '#fff', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 8, lineHeight: 1 }}>SUPER</span>
                          <span style={{ color: '#fff', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1 }}>OFERTA</span>
                        </div>
                      </div>
                    )}
                    {isPromo && !isOferta && (
                      <div className="absolute top-3 right-3 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-sm tracking-wider flex items-center gap-1 z-10"
                        style={{ background: `linear-gradient(135deg, ${temaStyles.accentColor || '#dc2626'}, ${temaStyles.accentColor || '#ea580c'})` }}>
                        {themeEmoji} {themeName}
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5 pr-12">
                      <h4 className="text-base font-semibold text-neutral-900 tracking-tight leading-snug group-hover:text-neutral-800">
                        {template.nome_template}
                      </h4>
                      {template.titulo_template && (
                        <p className="pdf-sans text-xs font-semibold text-neutral-700">
                          {template.titulo_template}
                        </p>
                      )}
                      {template.descricao_perfil && (
                        <p className="pdf-sans text-xs text-neutral-500 leading-relaxed line-clamp-2 mt-0.5">
                          {template.descricao_perfil}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-neutral-400 font-medium mt-4 pt-2 border-t border-neutral-50">
                      {!template.ocultar_data_criacao && (
                        <span>Criado em: {new Date(template.created_at).toLocaleDateString('pt-BR')}</span>
                      )}
                      <span className="flex items-center gap-1 text-neutral-600 group-hover:text-neutral-950 transition-colors ml-auto font-semibold uppercase tracking-wider text-[10px]">
                        Ver Proposta <ExternalLink size={11} />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Reviews Section */}
        {profile.exibir_avaliacoes_publico !== false && reviews.length > 0 && (
          <div className="space-y-4">
            <h3 className="pdf-sans text-xs font-bold uppercase tracking-wider text-neutral-700 border-b border-neutral-100 pb-1.5">
              Depoimentos de Clientes
            </h3>

            <div className="flex flex-col gap-3">
              {displayedReviews.map((review) => (
                <div key={review.id} className="pdf-profile-card p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-950">{review.cliente_nome}</h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <StarRating rating={review.rating} size="xs" />
                        <span className="text-[10px] text-neutral-400 font-medium">
                          {new Date(review.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                  {review.comentario && (
                    <p className="pdf-sans text-xs text-neutral-600 leading-relaxed">{review.comentario}</p>
                  )}
                </div>
              ))}
            </div>

            {reviews.length > 3 && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setShowAllReviews(!showAllReviews)}
                  className="pdf-sans px-5 py-2.5 border border-neutral-300 text-neutral-700 hover:text-neutral-950 hover:border-neutral-800 transition-colors text-xs font-bold uppercase tracking-widest rounded-md"
                >
                  {showAllReviews ? 'Ver menos depoimentos' : 'Ver mais depoimentos'}
                </button>
              </div>
            )}
          </div>
        )}

        {templates.length === 0 && reviews.length === 0 && (
          <div className="p-8 border border-neutral-200 text-center rounded-lg">
            <p className="pdf-sans text-xs text-neutral-500">Nenhum conteúdo disponível no momento.</p>
          </div>
        )}
      </div>

      {/* Powered by PriceUs Branding Footer */}
      {!isPremium && (
        <footer style={{ background: '#fafafa', padding: '24px', borderTop: '1px solid #e2e8f0', textAlign: 'center', marginTop: '32px' }}>
          <p className="pdf-sans" style={{ fontSize: 11, color: '#94a3b8' }}>
            Powered by{' '}
            <a href="https://priceus.com.br" target="_blank" rel="noopener noreferrer" style={{ color: '#1a1a1a', fontWeight: 600, textDecoration: 'none' }}>PriceUs</a>
          </p>
        </footer>
      )}
    </div>
  );
}
