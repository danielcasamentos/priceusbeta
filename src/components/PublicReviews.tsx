import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { StarRating } from './StarRating';
import { Star, Calendar, MessageSquare, ChevronDown } from 'lucide-react';

interface Review {
  id: string;
  rating: number;
  comentario: string;
  nome_cliente: string;
  data_evento: string | null;
  tipo_evento: string | null;
  resposta_fornecedor: string | null;
  respondido_em: string | null;
  created_at: string;
}

interface PublicReviewsProps {
  userId: string;
  ratingMinimo?: number;
  maxVisible?: number;
}

export function PublicReviews({ userId, ratingMinimo = 1, maxVisible = 6 }: PublicReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    loadReviews();
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('media_avaliacoes, total_avaliacoes_visiveis, exibir_avaliacoes_publico')
        .eq('id', userId)
        .maybeSingle();

      setProfile(data);
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
    }
  };

  const loadReviews = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('avaliacoes')
        .select('*')
        .eq('profile_id', userId)
        .eq('visivel', true)
        .gte('rating', ratingMinimo)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReviews(data || []);
    } catch (err) {
      console.error('Erro ao carregar avaliações:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!profile?.exibir_avaliacoes_publico || reviews.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const visibleReviews = showAll ? reviews : reviews.slice(0, maxVisible);

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-yellow-400 to-orange-400 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Avaliações de Clientes</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                <Star className="w-6 h-6 fill-white" />
                <span className="text-2xl font-bold">
                  {profile.media_avaliacoes?.toFixed(1) || '0.0'}
                </span>
              </div>
              <span className="text-white/90">
                {profile.total_avaliacoes_visiveis} avaliações
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {visibleReviews.map((review) => (
          <div key={review.id} className="p-6 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <StarRating rating={review.rating} readonly size="sm" />
                  <span className="font-semibold text-gray-900">{review.nome_cliente}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  {review.tipo_evento && (
                    <>
                      <span>{review.tipo_evento}</span>
                      <span>•</span>
                    </>
                  )}
                  {review.data_evento && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(review.data_evento).toLocaleDateString('pt-BR')}</span>
                    </div>
                  )}
                </div>
              </div>
              <span className="text-xs text-gray-400">
                {new Date(review.created_at).toLocaleDateString('pt-BR')}
              </span>
            </div>

            <p className="text-gray-700 mb-4 leading-relaxed whitespace-pre-wrap">
              {review.comentario}
            </p>

            {review.resposta_fornecedor && (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-900">
                    Resposta do Fornecedor
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {review.resposta_fornecedor}
                </p>
                {review.respondido_em && (
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(review.respondido_em).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {reviews.length > maxVisible && (
        <div className="p-4 bg-gray-50 border-t border-gray-200 text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-2 mx-auto text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            {showAll ? 'Ver Menos' : `Ver Todas (${reviews.length})`}
            <ChevronDown className={`w-5 h-5 transition-transform ${showAll ? 'rotate-180' : ''}`} />
          </button>
        </div>
      )}
    </div>
  );
}
