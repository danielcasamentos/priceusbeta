import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { StarRating } from './StarRating';
import {
  Star,
  Eye,
  EyeOff,
  MessageSquare,
  Trash2,
  TrendingUp,
  Users,
  Calendar,
  Filter,
  Send
} from 'lucide-react';

interface Review {
  id: string;
  rating: number;
  comentario: string;
  nome_cliente: string;
  data_evento: string | null;
  tipo_evento: string | null;
  visivel: boolean;
  aprovado_em: string | null;
  resposta_fornecedor: string | null;
  respondido_em: string | null;
  created_at: string;
}

interface ReviewsManagerProps {
  userId: string;
}

export function ReviewsManager({ userId }: ReviewsManagerProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    media: 0,
    total: 0,
    visiveis: 0,
    distribuicao: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });
  const [filter, setFilter] = useState<'todas' | 'visiveis' | 'pendentes'>('todas');
  const [respondendoId, setRespondendoId] = useState<string | null>(null);
  const [respostaTexto, setRespostaTexto] = useState('');

  useEffect(() => {
    loadReviews();
  }, [userId]);

  const loadReviews = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('avaliacoes')
        .select('*')
        .eq('profile_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReviews(data || []);
      calculateStats(data || []);
    } catch (err) {
      console.error('Erro ao carregar avaliações:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (reviewsData: Review[]) => {
    const total = reviewsData.length;
    const visiveis = reviewsData.filter(r => r.visivel).length;
    const somaRatings = reviewsData.reduce((acc, r) => acc + r.rating, 0);
    const media = total > 0 ? somaRatings / total : 0;

    const distribuicao = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviewsData.forEach(r => {
      distribuicao[r.rating as keyof typeof distribuicao]++;
    });

    setStats({ media, total, visiveis, distribuicao });
  };

  const toggleVisibilidade = async (reviewId: string, currentVisivel: boolean) => {
    try {
      const { error } = await supabase
        .from('avaliacoes')
        .update({
          visivel: !currentVisivel,
          aprovado_em: !currentVisivel ? new Date().toISOString() : null
        })
        .eq('id', reviewId);

      if (error) throw error;

      loadReviews();
    } catch (err) {
      console.error('Erro ao atualizar visibilidade:', err);
      alert('Erro ao atualizar visibilidade');
    }
  };

  const enviarResposta = async (reviewId: string) => {
    if (!respostaTexto.trim()) {
      alert('Digite uma resposta antes de enviar');
      return;
    }

    try {
      const { error } = await supabase
        .from('avaliacoes')
        .update({
          resposta_fornecedor: respostaTexto.trim(),
          respondido_em: new Date().toISOString()
        })
        .eq('id', reviewId);

      if (error) throw error;

      setRespondendoId(null);
      setRespostaTexto('');
      loadReviews();
    } catch (err) {
      console.error('Erro ao enviar resposta:', err);
      alert('Erro ao enviar resposta');
    }
  };

  const deletarAvaliacao = async (reviewId: string) => {
    if (!confirm('Tem certeza que deseja deletar esta avaliação? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('avaliacoes')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;

      loadReviews();
    } catch (err) {
      console.error('Erro ao deletar avaliação:', err);
      alert('Erro ao deletar avaliação');
    }
  };

  const filteredReviews = reviews.filter(review => {
    if (filter === 'visiveis') return review.visivel;
    if (filter === 'pendentes') return !review.visivel;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <Star className="w-5 h-5 text-yellow-400" />
            <span className="text-3xl font-bold text-gray-900">
              {stats.media.toFixed(1)}
            </span>
          </div>
          <p className="text-sm text-gray-600">Média Geral</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-blue-500" />
            <span className="text-3xl font-bold text-gray-900">{stats.total}</span>
          </div>
          <p className="text-sm text-gray-600">Total de Avaliações</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <Eye className="w-5 h-5 text-green-500" />
            <span className="text-3xl font-bold text-gray-900">{stats.visiveis}</span>
          </div>
          <p className="text-sm text-gray-600">Visíveis Publicamente</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-purple-500" />
            <span className="text-3xl font-bold text-gray-900">
              {stats.total > 0 ? ((stats.visiveis / stats.total) * 100).toFixed(0) : 0}%
            </span>
          </div>
          <p className="text-sm text-gray-600">Taxa de Aprovação</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribuição de Estrelas</h3>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map(star => {
            const count = stats.distribuicao[star as keyof typeof stats.distribuicao];
            const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-4">
                <div className="flex items-center gap-1 w-20">
                  <span className="text-sm font-medium">{star}</span>
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-yellow-400 h-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Gerenciar Avaliações</h2>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="todas">Todas</option>
                <option value="visiveis">Visíveis</option>
                <option value="pendentes">Pendentes</option>
              </select>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredReviews.length === 0 ? (
            <div className="p-12 text-center">
              <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma avaliação encontrada</p>
            </div>
          ) : (
            filteredReviews.map((review) => (
              <div key={review.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <StarRating rating={review.rating} readonly size="sm" />
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        review.visivel
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {review.visivel ? 'Visível' : 'Pendente'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <span className="font-medium">{review.nome_cliente}</span>
                      {review.tipo_evento && (
                        <>
                          <span>•</span>
                          <span>{review.tipo_evento}</span>
                        </>
                      )}
                      {review.data_evento && (
                        <>
                          <span>•</span>
                          <Calendar className="w-4 h-4 inline" />
                          <span>{new Date(review.data_evento).toLocaleDateString('pt-BR')}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleVisibilidade(review.id, review.visivel)}
                      className={`p-2 rounded-lg transition-colors ${
                        review.visivel
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      title={review.visivel ? 'Ocultar' : 'Tornar visível'}
                    >
                      {review.visivel ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => setRespondendoId(respondendoId === review.id ? null : review.id)}
                      className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                      title="Responder"
                    >
                      <MessageSquare className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => deletarAvaliacao(review.id)}
                      className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                      title="Deletar"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <p className="text-gray-700 mb-4 whitespace-pre-wrap">{review.comentario}</p>

                {review.resposta_fornecedor && (
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                    <p className="text-sm font-semibold text-blue-900 mb-1">Sua Resposta:</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{review.resposta_fornecedor}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Respondido em {new Date(review.respondido_em!).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                )}

                {respondendoId === review.id && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <textarea
                      value={respostaTexto}
                      onChange={(e) => setRespostaTexto(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="Escreva sua resposta ao cliente..."
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => enviarResposta(review.id)}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Send className="w-4 h-4" />
                        Enviar Resposta
                      </button>
                      <button
                        onClick={() => {
                          setRespondendoId(null);
                          setRespostaTexto('');
                        }}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                <p className="text-xs text-gray-400 mt-4">
                  Recebida em {new Date(review.created_at).toLocaleDateString('pt-BR')} às{' '}
                  {new Date(review.created_at).toLocaleTimeString('pt-BR')}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
