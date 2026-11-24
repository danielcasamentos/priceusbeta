import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface QuoteHeaderRatingProps {
  userId: string;
  ratingMinimo?: number;
  exibirAvaliacoes?: boolean;
  className?: string;
}

export function QuoteHeaderRating({
  userId,
  ratingMinimo = 1,
  exibirAvaliacoes = true,
  className = ''
}: QuoteHeaderRatingProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRating();
  }, [userId, ratingMinimo]);

  const loadRating = async () => {
    try {
      const { data, error } = await supabase
        .from('avaliacoes')
        .select('rating')
        .eq('profile_id', userId)
        .eq('visivel', true)
        .gte('rating', ratingMinimo);

      if (error) throw error;

      if (data && data.length > 0) {
        const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
        setRating(avg);
        setTotalReviews(data.length);
      }
    } catch (error) {
      console.error('Erro ao carregar avaliações:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!exibirAvaliacoes || loading) {
    return null;
  }

  const displayRating = rating || 5.0;
  const displayReviews = totalReviews || 0;

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 sm:w-5 sm:h-5 ${
              star <= Math.round(displayRating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
      <span className="text-sm sm:text-base font-semibold text-gray-900">
        {displayRating.toFixed(1)}
      </span>
      {displayReviews > 0 && (
        <span className="text-xs sm:text-sm text-gray-600">
          ({displayReviews} {displayReviews === 1 ? 'avaliação' : 'avaliações'})
        </span>
      )}
    </div>
  );
}
