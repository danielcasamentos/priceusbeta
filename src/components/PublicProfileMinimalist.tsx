import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Instagram, Mail, MessageCircle, ExternalLink } from 'lucide-react';
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

interface PublicProfileMinimalistProps {
  profile: Profile;
  templates: Template[];
  reviews: Review[];
  averageRating: number;
}

export function PublicProfileMinimalist({ profile, templates, reviews, averageRating }: PublicProfileMinimalistProps) {
  const [showAllReviews, setShowAllReviews] = useState(false);

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3);

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-200 via-gray-200 to-slate-300">
      <style>{`
        @keyframes swing {
          0%, 100% { transform: rotate(-8deg); }
          50% { transform: rotate(8deg); }
        }
        @keyframes border-glow-orange {
          0%, 100% { border-color: #ea580c; box-shadow: 0 0 10px rgba(234, 88, 12, 0.3); }
          50% { border-color: #ef4444; box-shadow: 0 0 20px rgba(239, 68, 68, 0.6); }
        }
        .oferta-chamativa-card {
          animation: border-glow-orange 3s infinite ease-in-out;
          border-width: 4px;
        }
        .oferta-swing-tag {
          animation: swing 2.5s infinite ease-in-out;
          transform-origin: top center;
        }
      `}</style>
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-8 sm:py-12 md:py-16">
        <div className="bg-slate-50 rounded-3xl shadow-2xl overflow-hidden mb-12 border-4 border-slate-400">
          <div className="bg-slate-800 h-32"></div>

          <div className="px-6 sm:px-8 md:px-12 pb-8 md:pb-12">
            <div className="flex flex-col items-center text-center gap-6 -mt-16 md:-mt-20">
              <div className="flex-shrink-0">
                {profile.profile_image_url ? (
                  <img
                    src={profile.profile_image_url}
                    alt={profile.nome_profissional}
                    className="w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-full border-4 border-white shadow-2xl object-cover"
                  />
                ) : (
                  <div className="w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-full border-4 border-white shadow-2xl bg-slate-300 flex items-center justify-center">
                    <span className="text-4xl sm:text-5xl text-slate-500">👤</span>
                  </div>
                )}
              </div>

              <div className="w-full max-w-3xl">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extralight tracking-wide text-slate-900 mb-4 md:mb-6">
                  {profile.nome_profissional}
                </h1>

                {profile.tipo_fotografia && (
                  <div className="flex items-center justify-center gap-2 text-slate-700 mb-4 md:mb-6">
                    <MapPin className="w-5 h-5" />
                    <span className="font-light text-lg tracking-wide">{profile.tipo_fotografia}</span>
                  </div>
                )}

                <div className="flex items-center justify-center gap-3 mb-6 md:mb-8 flex-wrap">
                  <div className="flex items-center gap-1">
                    <StarRating rating={averageRating || 5.0} size="lg" />
                  </div>
                  <span className="text-xl font-light text-slate-900">
                    {(averageRating || 5.0).toFixed(1)}
                  </span>
                  {reviews.length > 0 && (
                    <span className="text-slate-700 font-light">
                      ({reviews.length} {reviews.length === 1 ? 'avaliação' : 'avaliações'})
                    </span>
                  )}
                </div>

                {profile.apresentacao && (
                  <p className="text-base sm:text-lg text-slate-700 mb-8 md:mb-10 leading-loose font-light max-w-2xl mx-auto">
                    {profile.apresentacao}
                  </p>
                )}

                <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
                  {profile.whatsapp_principal && (
                    <a
                      href={`https://wa.me/${profile.whatsapp_principal.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-full hover:bg-slate-900 font-light tracking-wide transition-all shadow-lg hover:shadow-xl"
                    >
                      <MessageCircle className="w-5 h-5" />
                      WhatsApp
                    </a>
                  )}

                  {profile.instagram && (
                    <a
                      href={`https://instagram.com/${profile.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-6 py-3 bg-slate-700 text-white rounded-full hover:bg-slate-800 font-light tracking-wide transition-all shadow-lg hover:shadow-xl"
                    >
                      <Instagram className="w-5 h-5" />
                      Instagram
                    </a>
                  )}

                  {profile.email_recebimento && (
                    <a
                      href={`mailto:${profile.email_recebimento}`}
                      className="flex items-center gap-2 px-6 py-3 bg-slate-600 text-white rounded-full hover:bg-slate-700 font-light tracking-wide transition-all shadow-lg hover:shadow-xl"
                    >
                      <Mail className="w-5 h-5" />
                      E-mail
                    </a>
                  )}
                </div>

                <PortfolioSection
                  portfolioLink={profile.portfolio_link || null}
                  portfolioFotos={profile.portfolio_fotos || null}
                />
              </div>
            </div>
          </div>
        </div>

        {templates.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl sm:text-3xl font-extralight tracking-wide text-slate-900 mb-6 sm:mb-8 text-center">
              Orçamentos Disponíveis
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
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
                    className={`bg-slate-50 rounded-3xl shadow-2xl hover:shadow-3xl transition-all overflow-hidden group border-4 relative ${
                      isOferta
                        ? 'oferta-chamativa-card scale-[1.02] md:scale-105'
                        : isPromo 
                          ? 'border-red-500 hover:border-orange-500 scale-[1.02] md:scale-105' 
                          : 'border-slate-400 hover:border-slate-500'
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
                      <div className="absolute top-3 right-3 text-white text-[10px] font-black px-2.5 py-1 rounded-full animate-pulse shadow-md tracking-wider flex items-center gap-1 z-10"
                        style={{ background: `linear-gradient(135deg, ${temaStyles.accentColor || '#dc2626'}, ${temaStyles.accentColor || '#ea580c'})` }}>
                        {themeEmoji} {themeName}
                      </div>
                    )}
                    <div className="p-6 sm:p-8">
                      <h3 className={`text-xl sm:text-2xl font-light tracking-wide mb-1 transition-colors ${
                        isPromo ? 'text-red-600 group-hover:text-orange-600 font-bold' : 'text-slate-900 group-hover:text-slate-800'
                      }`}>
                        {template.nome_template}
                      </h3>
                      {template.titulo_template && (
                         <p className={`text-sm font-medium mb-3 ${isPromo ? 'text-orange-600' : 'text-slate-600'}`}>{template.titulo_template}</p>
                      )}
                      {template.descricao_perfil && (
                         <p className="text-sm text-slate-600 mb-4 line-clamp-3 font-light leading-relaxed">
                           {template.descricao_perfil}
                         </p>
                      )}
                      <div className="flex items-center justify-between text-sm text-slate-700 font-light mt-auto pt-2">
                        {!template.ocultar_data_criacao && (
                          <span className="text-xs text-slate-400">{new Date(template.created_at).toLocaleDateString('pt-BR')}</span>
                        )}
                        <span className={`flex items-center gap-1 transition-colors ml-auto ${isPromo ? 'group-hover:text-orange-600 text-red-600' : 'group-hover:text-slate-800'}`}>Detalhes do Pacote <ExternalLink className="w-4 h-4 ml-1" /></span>
                      </div>
                    </div>
                    <div className={`h-2 ${isPromo ? 'bg-gradient-to-r from-red-600 to-orange-500' : 'bg-slate-800'}`}></div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {reviews.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl sm:text-3xl font-extralight tracking-wide text-slate-900 mb-6 sm:mb-8 text-center">
              Avaliações de Clientes
            </h2>
            <div className="space-y-6">
              {displayedReviews.map((review) => (
                <div key={review.id} className="bg-slate-50 rounded-3xl shadow-2xl p-6 sm:p-8 border-4 border-slate-400">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-light text-xl text-slate-900 mb-2">
                        {review.cliente_nome}
                      </h3>
                      <div className="flex items-center gap-3">
                        <StarRating rating={review.rating} />
                        <span className="text-sm text-slate-700 font-light">
                          {new Date(review.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                  {review.comentario && (
                    <p className="text-slate-700 leading-loose font-light">{review.comentario}</p>
                  )}
                </div>
              ))}
            </div>

            {reviews.length > 3 && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => setShowAllReviews(!showAllReviews)}
                  className="px-8 py-3 border-2 border-slate-800 text-slate-800 rounded-full font-light tracking-wide hover:bg-slate-100 transition-all shadow-md hover:shadow-lg active:scale-95"
                >
                  {showAllReviews ? 'Ver menos' : 'Ver mais'}
                </button>
              </div>
            )}
          </div>
        )}

        {templates.length === 0 && reviews.length === 0 && (
          <div className="bg-slate-50 rounded-3xl shadow-2xl p-12 sm:p-16 text-center border-4 border-slate-400">
            <p className="text-slate-700 font-light text-lg">Nenhum conteúdo disponível no momento.</p>
          </div>
        )}
      </div>

      {!(profile.status_assinatura === 'active') && (
        <footer className="bg-slate-900 text-white py-10 mt-16">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <p className="text-slate-400 font-light">
              Powered by{' '}
              <a href="https://priceus.com.br" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-white font-normal">
                PriceU$
              </a>
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}
