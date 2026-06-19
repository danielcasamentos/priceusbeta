import { useState } from 'react';
import { Star, MessageSquare, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RatePhotographerButtonProps {
  userId: string;
  templateId?: string;
  profileName: string;
  aceitaAvaliacoes?: boolean;
  aprovacaoAutomatica?: boolean;
  theme?: {
    primaryColor: string;
    buttonColor: string;
  };
}

export function RatePhotographerButton({
  userId,
  templateId,
  profileName,
  aceitaAvaliacoes = true,
  aprovacaoAutomatica = false,
  theme,
}: RatePhotographerButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [clienteNome, setClienteNome] = useState('');
  const [comentario, setComentario] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Não renderizar se o usuário não aceita avaliações
  if (!aceitaAvaliacoes) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0 || !clienteNome.trim()) {
      alert('Por favor, preencha seu nome e selecione uma avaliação.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('avaliacoes')
        .insert({
          user_id: userId,
          template_id: templateId || null,
          cliente_nome: clienteNome.trim(),
          rating,
          comentario: comentario.trim() || null,
          aprovado: aprovacaoAutomatica,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        setShowModal(false);
        setSuccess(false);
        setRating(0);
        setClienteNome('');
        setComentario('');
      }, 2000);
    } catch (error) {
      console.error('Erro ao enviar avaliação:', error);
      alert('Erro ao enviar avaliação. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`w-full flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-3.5 rounded-lg font-semibold text-sm sm:text-base transition-colors shadow-md hover:shadow-lg ${
          theme?.buttonColor || "bg-gray-200 hover:bg-gray-300 text-gray-800"
        }`}
        data-fixed-button
      >
        <Star className="w-4 h-4 sm:w-5 sm:h-5" />
        Avaliar {profileName}
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {success ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Star className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Obrigado!
                  </h3>
                  <p className="text-gray-600">
                    {aprovacaoAutomatica 
                      ? 'Sua avaliação foi publicada com sucesso!'
                      : 'Sua avaliação será analisada e publicada em breve.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-gray-900">
                      Avaliar {profileName}
                    </h3>
                    <button
                      onClick={() => setShowModal(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Seu Nome *
                      </label>
                      <input
                        type="text"
                        value={clienteNome}
                        onChange={(e) => setClienteNome(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Digite seu nome"
                        required
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                        Como foi sua experiência? *
                      </label>
                      <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="transition-transform hover:scale-110 focus:outline-none"
                            disabled={submitting}
                          >
                            <Star
                              className={`w-10 h-10 sm:w-12 sm:h-12 ${
                                star <= (hoverRating || rating)
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      {rating > 0 && (
                        <p className="text-center text-sm text-gray-600 mt-2">
                          {rating === 5 && '⭐ Excelente!'}
                          {rating === 4 && '👍 Muito bom!'}
                          {rating === 3 && '😊 Bom'}
                          {rating === 2 && '😐 Regular'}
                          {rating === 1 && '😞 Precisa melhorar'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Comentário (opcional)
                      </label>
                      <div className="relative">
                        <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <textarea
                          value={comentario}
                          onChange={(e) => setComentario(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          rows={4}
                          placeholder="Conte como foi sua experiência..."
                          disabled={submitting}
                          maxLength={500}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1 text-right">
                        {comentario.length}/500 caracteres
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                        disabled={submitting}
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={submitting || rating === 0}
                        className={`flex-1 px-6 py-3 text-white rounded-lg font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed ${
                          theme?.buttonColor ? theme.buttonColor.split(' ')[0] : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {submitting ? 'Enviando...' : 'Enviar Avaliação'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
