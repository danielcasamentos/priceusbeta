import { Link } from 'react-router-dom';
import { MapPin, Instagram, Mail, MessageCircle, ExternalLink, Camera } from 'lucide-react';
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

interface PublicProfileMagazineProps {
  profile: Profile;
  templates: Template[];
  reviews: Review[];
  averageRating: number;
}

export function PublicProfileMagazine({ profile, templates, reviews, averageRating }: PublicProfileMagazineProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100 font-serif">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-8 sm:py-12 md:py-16">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden mb-12 border-4 border-amber-600">
          <div className="relative bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 h-32 flex items-center justify-center">
            <Camera className="w-16 h-16 text-white/20 absolute left-8 top-8" />
            <Camera className="w-16 h-16 text-white/20 absolute right-8 bottom-8" />
            <div className="absolute inset-0 bg-black/10"></div>
          </div>

          <div className="px-6 sm:px-8 md:px-12 pb-8 md:pb-12">
            <div className="flex flex-col items-center text-center gap-6 -mt-16 md:-mt-20">
              <div className="flex-shrink-0 relative">
                {profile.profile_image_url ? (
                  <div className="relative">
                    <div className="absolute inset-0 bg-amber-400 rounded-xl blur-lg opacity-50"></div>
                    <img
                      src={profile.profile_image_url}
                      alt={profile.nome_profissional}
                      className="relative w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-xl border-4 border-white shadow-2xl object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-xl border-4 border-white shadow-2xl bg-amber-100 flex items-center justify-center">
                    <span className="text-4xl sm:text-5xl text-amber-400">👤</span>
                  </div>
                )}
              </div>

              <div className="w-full max-w-3xl">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-amber-900 mb-4 md:mb-6 tracking-tight uppercase">
                  {profile.nome_profissional}
                </h1>

                {profile.tipo_fotografia && (
                  <div className="flex items-center justify-center gap-3 mb-4 md:mb-6">
                    <div className="h-px w-12 bg-amber-600"></div>
                    <div className="flex items-center gap-2 text-amber-700">
                      <MapPin className="w-5 h-5" />
                      <span className="font-bold text-lg uppercase tracking-widest">{profile.tipo_fotografia}</span>
                    </div>
                    <div className="h-px w-12 bg-amber-600"></div>
                  </div>
                )}

                <div className="flex items-center justify-center gap-3 mb-6 md:mb-8 flex-wrap bg-amber-50 py-3 px-6 rounded-lg inline-flex mx-auto">
                  <div className="flex items-center gap-1">
                    <StarRating rating={averageRating || 5.0} size="lg" />
                  </div>
                  <span className="text-xl font-black text-amber-900">
                    {(averageRating || 5.0).toFixed(1)}
                  </span>
                  {reviews.length > 0 && (
                    <span className="text-amber-700 font-bold">
                      ({reviews.length} {reviews.length === 1 ? 'avaliação' : 'avaliações'})
                    </span>
                  )}
                </div>

                {profile.apresentacao && (
                  <div className="relative mb-8 md:mb-10">
                    <div className="absolute top-0 left-0 text-6xl text-amber-200 font-serif">"</div>
                    <p className="text-base sm:text-lg text-gray-700 leading-loose max-w-2xl mx-auto pt-8 px-4 italic">
                      {profile.apresentacao}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
                  {profile.whatsapp_principal && (
                    <a
                      href={`https://wa.me/${profile.whatsapp_principal.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-6 py-3 bg-amber-700 text-white rounded-full hover:bg-amber-800 font-bold tracking-wide transition-all shadow-lg hover:shadow-xl uppercase"
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
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-600 to-orange-600 text-white rounded-full hover:from-pink-700 hover:to-orange-700 font-bold tracking-wide transition-all shadow-lg hover:shadow-xl uppercase"
                    >
                      <Instagram className="w-5 h-5" />
                      Instagram
                    </a>
                  )}

                  {profile.email_recebimento && (
                    <a
                      href={`mailto:${profile.email_recebimento}`}
                      className="flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-full hover:bg-amber-700 font-bold tracking-wide transition-all shadow-lg hover:shadow-xl uppercase"
                    >
                      <Mail className="w-5 h-5" />
                      E-mail
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {templates.length > 0 && (
          <div className="mb-12">
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-2xl sm:text-3xl font-black text-amber-900 mb-2 uppercase tracking-tight">
                Orçamentos Disponíveis
              </h2>
              <div className="h-1 w-32 bg-amber-600 mx-auto"></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {templates.map((template) => (
                <Link
                  key={template.id}
                  to={`/${profile.slug_usuario}/${template.slug_template}`}
                  className="bg-white rounded-3xl shadow-2xl hover:shadow-2xl transition-all overflow-hidden group border-4 border-amber-600 hover:border-amber-700"
                >
                  <div className="p-6 sm:p-8">
                    <h3 className="text-xl sm:text-2xl font-black text-amber-900 mb-1 group-hover:text-amber-700 transition-colors uppercase">
                      {template.nome_template}
                    </h3>
                    {template.titulo_template && (
                       <p className="text-sm font-bold text-amber-700 mb-3 uppercase tracking-wider">{template.titulo_template}</p>
                    )}
                    {template.descricao_perfil && (
                       <p className="text-sm text-gray-700 mb-4 line-clamp-3 leading-relaxed italic">
                         {template.descricao_perfil}
                       </p>
                    )}
                    <div className="flex items-center justify-between text-sm text-amber-800 font-bold mt-auto pt-2">
                      {!template.ocultar_data_criacao && (
                        <span className="text-xs text-amber-400 font-normal">{new Date(template.created_at).toLocaleDateString('pt-BR')}</span>
                      )}
                      <span className="flex items-center gap-1 group-hover:text-amber-900 transition-colors uppercase ml-auto">Acessar Portfólio <ExternalLink className="w-4 h-4 ml-1" /></span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-amber-600 to-orange-600 h-2"></div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {reviews.length > 0 && (
          <div className="mb-12">
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-2xl sm:text-3xl font-black text-amber-900 mb-2 uppercase tracking-tight">
                Avaliações de Clientes
              </h2>
              <div className="h-1 w-32 bg-amber-600 mx-auto"></div>
            </div>
            <div className="space-y-6">
              {reviews.map((review) => (
                <div key={review.id} className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border-4 border-amber-600">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-black text-xl text-amber-900 mb-2 uppercase">
                        {review.cliente_nome}
                      </h3>
                      <div className="flex items-center gap-3">
                        <StarRating rating={review.rating} />
                        <span className="text-sm text-amber-700 font-bold">
                          {new Date(review.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                  {review.comentario && (
                    <p className="text-gray-700 leading-loose italic">{review.comentario}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {templates.length === 0 && reviews.length === 0 && (
          <div className="bg-white rounded-3xl shadow-2xl p-12 sm:p-16 text-center border-4 border-amber-600">
            <p className="text-amber-700 font-bold text-lg uppercase tracking-wide">Nenhum conteúdo disponível no momento.</p>
          </div>
        )}
      </div>

      <footer className="bg-gradient-to-r from-amber-900 via-orange-900 to-amber-800 text-white py-10 mt-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-amber-200 font-bold">
            Powered by{' '}
            <Link to="/" className="text-amber-100 hover:text-white font-black">
              PriceU$
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
