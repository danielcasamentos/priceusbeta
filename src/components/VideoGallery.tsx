import { useState } from 'react';
import { Video, X } from 'lucide-react';
import { VIDEO_TUTORIALS, VideoTutorial, getVideosByCategory } from '../config/videoTutorials';
import { VideoCard } from './VideoCard';
import { YouTubeEmbed } from './YouTubeEmbed';

export function VideoGallery() {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'template' | 'agenda' | 'leads' | 'financeiro' | 'contratos' | 'avaliacoes'>('all');
  const [selectedVideo, setSelectedVideo] = useState<VideoTutorial | null>(null);

  const categories = [
    { id: 'all', name: 'Todos os Vídeos', count: VIDEO_TUTORIALS.length },
    { id: 'template', name: 'Templates de Orçamento', count: getVideosByCategory('template').length },
    { id: 'agenda', name: 'Agenda e Reservas', count: getVideosByCategory('agenda').length },
    { id: 'leads', name: 'Gestão de Leads', count: getVideosByCategory('leads').length },
    { id: 'financeiro', name: 'Controle Financeiro', count: getVideosByCategory('financeiro').length },
    { id: 'contratos', name: 'Contratos Digitais', count: getVideosByCategory('contratos').length },
    { id: 'avaliacoes', name: 'Avaliações de Clientes', count: getVideosByCategory('avaliacoes').length },
  ];

  const filteredVideos = selectedCategory === 'all'
    ? VIDEO_TUTORIALS
    : getVideosByCategory(selectedCategory);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-blue-100 p-3 rounded-lg">
          <Video className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tutoriais em Vídeo</h2>
          <p className="text-gray-600">Aprenda a usar o Priceus com nossos tutoriais em vídeo</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id as any)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              selectedCategory === category.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {category.name}
            <span className="ml-2 text-xs opacity-75">({category.count})</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVideos.map((video) => (
          <VideoCard
            key={video.id}
            videoId={video.youtubeId}
            title={video.title}
            description={video.description}
            category={video.category}
            duration={video.duration}
            onPlay={() => setSelectedVideo(video)}
          />
        ))}
      </div>

      {filteredVideos.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Nenhum vídeo encontrado nesta categoria</p>
        </div>
      )}

      {selectedVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedVideo.title}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedVideo.category === 'template' ? 'Templates de Orçamento' :
                   selectedVideo.category === 'agenda' ? 'Agenda e Reservas' :
                   selectedVideo.category === 'leads' ? 'Gestão de Leads' :
                   selectedVideo.category === 'financeiro' ? 'Controle Financeiro' :
                   selectedVideo.category === 'contratos' ? 'Contratos Digitais' :
                   'Avaliações de Clientes'}
                </p>
              </div>
              <button
                onClick={() => setSelectedVideo(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              <YouTubeEmbed
                videoId={selectedVideo.youtubeId}
                title={selectedVideo.title}
                showTitle={false}
                autoplay={true}
              />
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Sobre este vídeo:</h4>
                <p className="text-blue-800 text-sm leading-relaxed">{selectedVideo.description}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
