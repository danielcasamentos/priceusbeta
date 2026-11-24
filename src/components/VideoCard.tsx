import { Play, Clock } from 'lucide-react';

interface VideoCardProps {
  videoId: string;
  title: string;
  description: string;
  category: string;
  duration?: string;
  onPlay: () => void;
}

export function VideoCard({
  videoId,
  title,
  description,
  category,
  duration,
  onPlay
}: VideoCardProps) {
  const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

  const getCategoryColor = () => {
    switch (category) {
      case 'template':
        return 'bg-blue-600';
      case 'agenda':
        return 'bg-purple-600';
      case 'leads':
        return 'bg-green-600';
      default:
        return 'bg-gray-600';
    }
  };

  const getCategoryLabel = () => {
    switch (category) {
      case 'template':
        return 'Templates';
      case 'agenda':
        return 'Agenda';
      case 'leads':
        return 'Leads';
      default:
        return category;
    }
  };

  return (
    <div
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all cursor-pointer group"
      onClick={onPlay}
    >
      <div className="relative aspect-video bg-gray-200">
        <img
          src={thumbnailUrl}
          alt={title}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
          }}
        />
        <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center group-hover:bg-opacity-50 transition-all">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
            <Play className="w-8 h-8 text-white ml-1" fill="white" />
          </div>
        </div>
        <div className="absolute top-3 right-3 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {duration || '5-10 min'}
        </div>
        <div className={`absolute bottom-3 left-3 ${getCategoryColor()} text-white px-2 py-1 rounded text-xs font-medium`}>
          {getCategoryLabel()}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {title}
        </h3>
        <p className="text-sm text-gray-600 line-clamp-2">
          {description}
        </p>
      </div>
    </div>
  );
}
