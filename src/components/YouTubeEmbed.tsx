import { useState } from 'react';
import { Play, Maximize2, X } from 'lucide-react';

interface YouTubeEmbedProps {
  videoId: string;
  title: string;
  autoplay?: boolean;
  showTitle?: boolean;
  className?: string;
}

export function YouTubeEmbed({
  videoId,
  title,
  autoplay = false,
  showTitle = true,
  className = ''
}: YouTubeEmbedProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasStarted, setHasStarted] = useState(autoplay);
  const [imageError, setImageError] = useState(false);

  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&showinfo=0&modestbranding=1&enablejsapi=1${autoplay ? '&autoplay=1' : ''}`;
  const thumbnailUrl = imageError
    ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    : `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

  const handlePlayClick = () => {
    setHasStarted(true);
  };

  const handleFullscreen = () => {
    setIsFullscreen(true);
  };

  const handleCloseFullscreen = () => {
    setIsFullscreen(false);
  };

  return (
    <>
      <div className={`relative w-full ${className}`}>
        {showTitle && (
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
          </div>
        )}

        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          {!hasStarted ? (
            <div className="absolute inset-0 bg-gray-200 rounded-lg overflow-hidden cursor-pointer group">
              <img
                src={thumbnailUrl}
                alt={title}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
              <div
                className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center group-hover:bg-opacity-50 transition-all"
                onClick={handlePlayClick}
              >
                <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <Play className="w-10 h-10 text-white ml-1" fill="white" />
                </div>
              </div>
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFullscreen();
                    handlePlayClick();
                  }}
                  className="bg-gray-900 bg-opacity-75 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-opacity-90 transition-all"
                >
                  <Maximize2 className="w-4 h-4" />
                  Tela Cheia
                </button>
              </div>
            </div>
          ) : (
            <>
              <iframe
                className="absolute inset-0 w-full h-full rounded-lg"
                src={embedUrl}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              <button
                onClick={handleFullscreen}
                className="absolute bottom-4 right-4 bg-gray-900 bg-opacity-75 text-white p-2 rounded-lg hover:bg-opacity-90 transition-all"
                title="Abrir em tela cheia"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

      </div>

      {isFullscreen && (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col">
          <div className="bg-gray-900 px-4 py-3 flex items-center justify-between">
            <h3 className="text-white font-semibold">{title}</h3>
            <button
              onClick={handleCloseFullscreen}
              className="text-white hover:text-gray-300 transition-colors p-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="w-full h-full max-w-7xl">
              <iframe
                className="w-full h-full"
                src={`${embedUrl}&autoplay=1`}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
