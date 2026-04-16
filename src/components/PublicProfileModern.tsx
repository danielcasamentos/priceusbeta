import { Link } from 'react-router-dom';
import { MapPin, Instagram, Mail, MessageCircle, ExternalLink, Sparkles } from 'lucide-react';
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
  created_at: string;
}

interface Review {
  id: string;
  cliente_nome: string;
  rating: number;
  comentario: string;
  created_at: string;
}

interface PublicProfileModernProps {
  profile: Profile;
  templates: Template[];
  reviews: Review[];
  averageRating: number;
}

export function PublicProfileModern({ profile, templates, reviews, averageRating }: PublicProfileModernProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-purple-100">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-8 sm:py-12 md:py-16">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden mb-12 relative border-4 border-cyan-200">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-cyan-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl"></div>

          <div className="relative bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 h-32 flex items-center justify-center">
            <Sparkles className="w-12 h-12 text-white/30 animate-pulse" />
          </div>

          <div className="relative px-6 sm:px-8 md:px-12 pb-8 md:pb-12">
            <div className="flex flex-col items-center text-center gap-6 -mt-16 md:-mt-20">
              <div className="flex-shrink-0 relative group">
                {profile.profile_image_url ? (
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                    <img
                      src={profile.profile_image_url}
                      alt={profile.nome_profissional}
                      className="relative w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-full border-4 border-white shadow-2xl object-cover transform group-hover:scale-105 transition-transform"
                    />
                  </div>
                ) : (
                  <div className="w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-full border-4 border-white shadow-2xl bg-gradient-to-br from-cyan-200 to-purple-200 flex items-center justify-center">
                    <span className="text-4xl sm:text-5xl">👤</span>
                  </div>
                )}
              </div>

              <div className="w-full max-w-3xl">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 bg-clip-text text-transparent mb-4 md:mb-6">
                  {profile.nome_profissional}
                </h1>

                {profile.tipo_fotografia && (
                  <div className="flex items-center justify-center gap-2 text-blue-700 mb-4 md:mb-6">
                    <MapPin className="w-5 h-5" />
                    <span className="font-semibold text-lg">{profile.tipo_fotografia}</span>
                  </div>
                )}

                <div className="flex items-center justify-center gap-3 mb-6 md:mb-8 flex-wrap">
                  <div className="flex items-center gap-1 bg-gradient-to-r from-cyan-50 to-purple-50 px-4 py-2 rounded-full">
                    <StarRating rating={averageRating || 5.0} size="lg" />
                  </div>
                  <span className="text-xl font-bold bg-gradient-to-r from-cyan-600 to-purple-600 bg-clip-text text-transparent">
                    {(averageRating || 5.0).toFixed(1)}
                  </span>
                  {reviews.length > 0 && (
                    <span className="text-blue-700 font-semibold">
                      ({reviews.length} {reviews.length === 1 ? 'avaliação' : 'avaliações'})
                    </span>
                  )}
                </div>

                {profile.apresentacao && (
                  <p className="text-base sm:text-lg text-gray-700 mb-8 md:mb-10 leading-relaxed max-w-2xl mx-auto">
                    {profile.apresentacao}
                  </p>
                )}

                <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
                  {profile.whatsapp_principal && (
                    <a
                      href={`https://wa.me/${profile.whatsapp_principal.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full hover:from-green-600 hover:to-emerald-700 font-semibold transition-all shadow-lg hover:shadow-xl"
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
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white rounded-full hover:from-pink-600 hover:via-purple-600 hover:to-blue-600 font-semibold transition-all shadow-lg hover:shadow-xl"
                    >
                      <Instagram className="w-5 h-5" />
                      Instagram
                    </a>
                  )}

                  {profile.email_recebimento && (
                    <a
                      href={`mailto:${profile.email_recebimento}`}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full hover:from-cyan-600 hover:to-blue-700 font-semibold transition-all shadow-lg hover:shadow-xl"
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
            <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-600 to-purple-600 bg-clip-text text-transparent mb-6 sm:mb-8 text-center">
              Orçamentos Disponíveis
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {templates.map((template) => (
                <Link
                  key={template.id}
                  to={`/${profile.slug_usuario}/${template.slug_template}`}
                  className="bg-white rounded-3xl shadow-2xl hover:shadow-2xl transition-all overflow-hidden group border-4 border-cyan-200 hover:border-purple-300"
                >
                  <div className="p-6 sm:p-8">
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 group-hover:bg-gradient-to-r group-hover:from-cyan-600 group-hover:to-purple-600 group-hover:bg-clip-text group-hover:text-transparent transition-all">
                      {template.nome_template}
                    </h3>
                    {template.titulo_template && (
                       <p className="text-sm font-semibold text-cyan-600 mb-3">{template.titulo_template}</p>
                    )}
                    {template.descricao_perfil && (
                       <p className="text-sm text-gray-600 mb-4 line-clamp-3 leading-relaxed">
                         {template.descricao_perfil}
                       </p>
                    )}
                    <div className="flex items-center justify-end text-sm text-gray-700 font-semibold mt-auto pt-2">
                       <span className="flex items-center gap-1 group-hover:text-purple-600 transition-colors">Visualizar Orçamento <ExternalLink className="w-4 h-4 ml-1" /></span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 h-2"></div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {reviews.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-600 to-purple-600 bg-clip-text text-transparent mb-6 sm:mb-8 text-center">
              Avaliações de Clientes
            </h2>
            <div className="space-y-6">
              {reviews.map((review) => (
                <div key={review.id} className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border-4 border-cyan-200">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-xl text-gray-900 mb-2">
                        {review.cliente_nome}
                      </h3>
                      <div className="flex items-center gap-3">
                        <StarRating rating={review.rating} />
                        <span className="text-sm text-gray-700 font-semibold">
                          {new Date(review.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                  {review.comentario && (
                    <p className="text-gray-700 leading-loose">{review.comentario}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {templates.length === 0 && reviews.length === 0 && (
          <div className="bg-white rounded-3xl shadow-2xl p-12 sm:p-16 text-center border-4 border-cyan-200">
            <p className="text-gray-700 font-semibold text-lg">Nenhum conteúdo disponível no momento.</p>
          </div>
        )}
      </div>

      <footer className="bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 text-white py-10 mt-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-gray-300">
            Powered by{' '}
            <Link to="/" className="text-cyan-300 hover:text-cyan-200 font-semibold">
              PriceU$
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
