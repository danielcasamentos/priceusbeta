import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readonly?: boolean;
  showNumber?: boolean;
}

export function StarRating({
  rating,
  onRatingChange,
  size = 'md',
  readonly = false,
  showNumber = false
}: StarRatingProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const stars = [1, 2, 3, 4, 5];

  const handleClick = (value: number) => {
    if (!readonly && onRatingChange) {
      onRatingChange(value);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => handleClick(star)}
          disabled={readonly}
          className={`
            ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}
            transition-transform
            ${!readonly && 'hover:opacity-80'}
          `}
          aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
        >
          <Star
            className={`
              ${sizeClasses[size]}
              ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
              transition-colors
            `}
          />
        </button>
      ))}
      {showNumber && (
        <span className="ml-2 text-sm font-medium text-gray-700">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
