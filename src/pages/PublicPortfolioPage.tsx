import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { GalleryService } from '../services/galleryService';
import { Gallery } from '../types/gallery';
import { Camera, Calendar, Image as ImageIcon, Loader2, Globe, ExternalLink } from 'lucide-react';

export function PublicPortfolioPage() {
  const { slugUsuario } = useParams<{ slugUsuario: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    photographer: { nome_profissional?: string; profile_image_url?: string; bio?: string; slug: string };
    galleries: Gallery[];
  } | null>(null);

  useEffect(() => {
    if (!slugUsuario) return;
    setLoading(true);
    GalleryService.getPublicPortfolio(slugUsuario)
      .then((res) => {
        setData(res);
        if (res?.photographer) {
          document.title = `Portfólio de Fotos | ${res.photographer.nome_profissional || 'Fotógrafo'}`;
        }
      })
      .catch((err) => console.error('Erro ao carregar portfólio público:', err))
      .finally(() => setLoading(false));
  }, [slugUsuario]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-400">Carregando portfólio...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md text-center space-y-4">
          <Globe className="w-12 h-12 text-slate-600 mx-auto" />
          <h1 className="text-xl font-bold text-white">Portfólio não encontrado</h1>
          <p className="text-xs text-slate-400">O perfil solicitado não foi localizado.</p>
        </div>
      </div>
    );
  }

  const { photographer, galleries } = data;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500 selection:text-white">
      {/* Header do Fotógrafo */}
      <header className="bg-slate-900/80 border-b border-slate-800/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {photographer.profile_image_url ? (
              <img
                src={photographer.profile_image_url}
                alt={photographer.nome_profissional || 'Fotógrafo'}
                className="w-12 h-12 rounded-full border-2 border-blue-500 object-cover shadow-lg"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-lg">
                <Camera className="w-6 h-6" />
              </div>
            )}

            <div>
              <h1 className="text-xl font-black text-white">{photographer.nome_profissional || 'Fotógrafo PriceU$'}</h1>
              <p className="text-xs text-slate-400 font-medium">Portfólio de Galerias de Fotos</p>
            </div>
          </div>

          <Link
            to={`/${photographer.slug}`}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors flex items-center space-x-2"
          >
            <span>Ver Perfil Principal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="text-3xl font-black text-white tracking-tight">Galerias em Destaque</h2>
          <p className="text-sm text-slate-400">
            Explore os últimos trabalhos e ensaios fotográficos publicados por {photographer.nome_profissional}.
          </p>
        </div>

        {galleries.length === 0 ? (
          <div className="p-16 text-center border border-slate-900 rounded-3xl bg-slate-900/30">
            <ImageIcon className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 font-semibold text-sm">Nenhuma galeria pública no portfólio ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {galleries.map((gallery) => (
              <Link
                key={gallery.id}
                to={`/${photographer.slug}/g/${gallery.slug}`}
                className="group bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl overflow-hidden transition-all duration-300 hover:-translate-y-1 shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-video bg-slate-950 relative overflow-hidden">
                    {gallery.cover_photo_url ? (
                      <img
                        src={gallery.cover_photo_url}
                        alt={gallery.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-slate-950">
                        <ImageIcon className="w-10 h-10 mb-1 opacity-50" />
                        <span className="text-xs">Ver galeria</span>
                      </div>
                    )}
                  </div>

                  <div className="p-6 space-y-2">
                    <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                      {gallery.title}
                    </h3>
                    {gallery.event_date && (
                      <p className="text-xs text-slate-400 flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        <span>{new Date(gallery.event_date).toLocaleDateString('pt-BR')}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-4 border-t border-slate-800/80 bg-slate-900/50 flex items-center justify-between text-xs font-semibold text-blue-400 group-hover:text-blue-300">
                  <span>Acessar Galeria</span>
                  <ExternalLink className="w-4 h-4" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
