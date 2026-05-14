import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { StarRating } from '../components/StarRating';
import { CheckCircle, AlertCircle, Star } from 'lucide-react';

export function ReviewPage() {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [leadData, setLeadData] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [rating, setRating] = useState(0);
  const [comentario, setComentario] = useState('');
  const [nomeCliente, setNomeCliente] = useState('');
  const [usarAnonimo, setUsarAnonimo] = useState(false);

  useEffect(() => {
    if (token) {
      loadLeadData();
    }
  }, [token]);

  const loadLeadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*, templates(nome_template), profiles(*)')
        .eq('token_avaliacao', token)
        .eq('pode_avaliar', true)
        .maybeSingle();

      if (leadError) throw leadError;

      if (!lead) {
        setError('Link inválido ou expirado. Entre em contato com o fornecedor.');
        return;
      }

      if (lead.avaliacao_id) {
        setError('Você já avaliou este serviço. Obrigado pelo seu feedback!');
        return;
      }

      setLeadData(lead);
      setProfileData(lead.profiles);
      setNomeCliente(lead.nome_cliente || '');
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError('Erro ao carregar informações. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      alert('Por favor, selecione uma classificação de 1 a 5 estrelas.');
      return;
    }

    if (!comentario.trim()) {
      alert('Por favor, escreva um comentário sobre sua experiência.');
      return;
    }

    setSubmitting(true);

    try {
      const tokenValidacao = `${token}_${Date.now()}`;
      const nomeParaSalvar = usarAnonimo ? 'Anônimo' : (nomeCliente.trim() || 'Cliente');

      const { data: avaliacaoData, error: avaliacaoError } = await supabase
        .from('avaliacoes')
        .insert({
          profile_id: leadData.user_id,
          lead_id: leadData.id,
          rating,
          comentario: comentario.trim(),
          nome_cliente: nomeParaSalvar,
          data_evento: leadData.data_evento,
          tipo_evento: leadData.tipo_evento || leadData.templates?.nome_template,
          token_validacao: tokenValidacao,
          visivel: profileData?.aprovacao_automatica_avaliacoes || false,
        })
        .select()
        .single();

      if (avaliacaoError) throw avaliacaoError;

      await supabase
        .from('leads')
        .update({
          avaliacao_id: avaliacaoData.id,
          pode_avaliar: false,
        })
        .eq('id', leadData.id);

      setSuccess(true);
    } catch (err) {
      console.error('Erro ao enviar avaliação:', err);
      alert('Erro ao enviar sua avaliação. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Ops!</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Avaliação Enviada!</h2>
          <p className="text-gray-600 mb-6">
            Obrigado pelo seu feedback! Sua avaliação foi recebida e será analisada pelo fornecedor.
          </p>
          {profileData?.aprovacao_automatica_avaliacoes && (
            <p className="text-sm text-green-600 mb-4">
              Sua avaliação já está visível publicamente!
            </p>
          )}
          {profileData?.incentivo_avaliacao_ativo && profileData?.incentivo_avaliacao_texto && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <Star className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <p className="text-sm text-gray-700">{profileData.incentivo_avaliacao_texto}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
            <h1 className="text-3xl font-bold mb-2">Avalie sua Experiência</h1>
            <p className="text-blue-100">
              {profileData?.nome_profissional || 'Fornecedor'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-3">
                Como você avalia o serviço?
              </label>
              <div className="flex justify-center">
                <StarRating
                  rating={rating}
                  onRatingChange={setRating}
                  size="lg"
                />
              </div>
              {rating > 0 && (
                <p className="text-center mt-2 text-gray-600">
                  {rating === 1 && 'Muito insatisfeito'}
                  {rating === 2 && 'Insatisfeito'}
                  {rating === 3 && 'Neutro'}
                  {rating === 4 && 'Satisfeito'}
                  {rating === 5 && 'Muito satisfeito'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conte-nos sobre sua experiência *
              </label>
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={6}
                placeholder="Fale sobre o trabalho, atendimento, qualidade, pontualidade..."
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Mínimo 10 caracteres
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seu nome (opcional)
              </label>
              <input
                type="text"
                value={nomeCliente}
                onChange={(e) => setNomeCliente(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Como você gostaria de ser identificado?"
                disabled={usarAnonimo}
              />
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={usarAnonimo}
                  onChange={(e) => setUsarAnonimo(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-600">Avaliar anonimamente</span>
              </label>
            </div>

            {profileData?.incentivo_avaliacao_ativo && profileData?.incentivo_avaliacao_texto && (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Star className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Incentivo Especial</h3>
                    <p className="text-sm text-gray-700">{profileData.incentivo_avaliacao_texto}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="border-t pt-6">
              <button
                type="submit"
                disabled={submitting || rating === 0 || comentario.trim().length < 10}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-lg font-semibold text-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
              >
                {submitting ? 'Enviando...' : 'Enviar Avaliação'}
              </button>
            </div>

            <p className="text-xs text-center text-gray-500">
              Ao enviar, você concorda que sua avaliação pode ser exibida publicamente após aprovação do fornecedor.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
