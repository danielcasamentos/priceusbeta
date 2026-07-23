import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Copy,
  ExternalLink,
  Edit,
  Trash2,
  HardDrive,
  Globe,
  Lock,
  Image as ImageIcon,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowLeft,
  QrCode,
} from 'lucide-react';
import { Gallery, GalleryPhoto, FileUploadProgress, GalleryFormData } from '../../types/gallery';
import { GalleryService } from '../../services/galleryService';
import { GalleryEditor } from './GalleryEditor';
import { GalleryUploader } from './GalleryUploader';
import { GalleryPhotoGrid } from './GalleryPhotoGrid';
import { GoogleDriveSettingsModal } from './GoogleDriveSettingsModal';
import { GalleryQrCodeModal } from './GalleryQrCodeModal';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

export function GalleriesManager() {
  const { user } = useAuth();
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Perfil do fotógrafo (slugUsuario)
  const [photographerSlug, setPhotographerSlug] = useState<string>('');

  // Modais e edição
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [selectedGallery, setSelectedGallery] = useState<Gallery | null>(null);

  // Gerenciamento de Fotos dentro da Galeria Selecionada
  const [managingGallery, setManagingGallery] = useState<Gallery | null>(null);
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([]);
  const [uploadProgressMap, setUploadProgressMap] = useState<Record<string, FileUploadProgress>>({});

  // Token do Google Drive com persistência no localStorage
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(() => {
    return localStorage.getItem('priceus_google_drive_token') || null;
  });

  const handleSaveGoogleToken = (token: string) => {
    const trimmed = token.trim();
    if (trimmed) {
      localStorage.setItem('priceus_google_drive_token', trimmed);
      setGoogleAccessToken(trimmed);
    } else {
      localStorage.removeItem('priceus_google_drive_token');
      setGoogleAccessToken(null);
    }
  };
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const [isTableMissing, setIsTableMissing] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const MIGRATION_SQL = `-- 1. Criar Tabela galleries
CREATE TABLE IF NOT EXISTS galleries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    client_id UUID,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    event_date DATE,
    cover_photo_id UUID,
    cover_photo_url TEXT,
    password_hash TEXT,
    is_public_portfolio BOOLEAN DEFAULT false,
    allow_low_res_download BOOLEAN DEFAULT true,
    allow_high_res_download BOOLEAN DEFAULT true,
    watermark_enabled BOOLEAN DEFAULT false,
    watermark_text TEXT,
    price_per_extra_photo NUMERIC(10,2) DEFAULT 0,
    google_drive_folder_id TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE galleries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Fotógrafos podem ver suas próprias galerias" ON galleries;
CREATE POLICY "Fotógrafos podem ver suas próprias galerias" ON galleries FOR SELECT USING (auth.uid() = user_id OR status = 'active');
DROP POLICY IF EXISTS "Fotógrafos podem criar galerias" ON galleries;
CREATE POLICY "Fotógrafos podem criar galerias" ON galleries FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Fotógrafos podem atualizar suas galerias" ON galleries;
CREATE POLICY "Fotógrafos podem atualizar suas galerias" ON galleries FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Fotógrafos podem deletar suas galerias" ON galleries;
CREATE POLICY "Fotógrafos podem deletar suas galerias" ON galleries FOR DELETE USING (auth.uid() = user_id);

-- 2. Criar Tabela gallery_photos
CREATE TABLE IF NOT EXISTS gallery_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gallery_id UUID REFERENCES galleries(id) ON DELETE CASCADE NOT NULL,
    google_drive_file_id TEXT NOT NULL,
    supabase_thumb_path TEXT NOT NULL,
    supabase_web_path TEXT NOT NULL,
    file_name TEXT,
    file_size_bytes BIGINT,
    width INTEGER,
    height INTEGER,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gallery_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Qualquer pessoa pode visualizar fotos de galerias ativas" ON gallery_photos;
CREATE POLICY "Qualquer pessoa pode visualizar fotos de galerias ativas" ON gallery_photos FOR SELECT USING (EXISTS (SELECT 1 FROM galleries g WHERE g.id = gallery_photos.gallery_id AND (g.user_id = auth.uid() OR g.status = 'active')));
DROP POLICY IF EXISTS "Fotógrafos podem inserir fotos em suas galerias" ON gallery_photos;
CREATE POLICY "Fotógrafos podem inserir fotos em suas galerias" ON gallery_photos FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM galleries g WHERE g.id = gallery_photos.gallery_id AND g.user_id = auth.uid()));
DROP POLICY IF EXISTS "Fotógrafos podem atualizar fotos em suas galerias" ON gallery_photos;
CREATE POLICY "Fotógrafos podem atualizar fotos em suas galerias" ON gallery_photos FOR UPDATE USING (EXISTS (SELECT 1 FROM galleries g WHERE g.id = gallery_photos.gallery_id AND g.user_id = auth.uid()));
DROP POLICY IF EXISTS "Fotógrafos podem deletar fotos de suas galerias" ON gallery_photos;
CREATE POLICY "Fotógrafos podem deletar fotos de suas galerias" ON gallery_photos FOR DELETE USING (EXISTS (SELECT 1 FROM galleries g WHERE g.id = gallery_photos.gallery_id AND g.user_id = auth.uid()));

-- 3. Criar Bucket gallery-assets
INSERT INTO storage.buckets (id, name, public) VALUES ('gallery-assets', 'gallery-assets', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Galeria pública - Leitura pública das imagens" ON storage.objects;
CREATE POLICY "Galeria pública - Leitura pública das imagens" ON storage.objects FOR SELECT USING (bucket_id = 'gallery-assets');
DROP POLICY IF EXISTS "Fotógrafos autenticados podem fazer upload de imagens" ON storage.objects;
CREATE POLICY "Fotógrafos autenticados podem fazer upload de imagens" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'gallery-assets' AND auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Fotógrafos autenticados podem deletar suas imagens" ON storage.objects;
CREATE POLICY "Fotógrafos autenticados podem deletar suas imagens" ON storage.objects FOR DELETE USING (bucket_id = 'gallery-assets' AND auth.role() = 'authenticated');`;

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // Buscar perfil do usuário para o slugUsuario
      const { data: profile } = await supabase
        .from('profiles')
        .select('slug_usuario, nome_profissional')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.slug_usuario) {
        setPhotographerSlug(profile.slug_usuario);
      } else {
        setPhotographerSlug(user.id.substring(0, 8));
      }

      // Verificar se a tabela galleries existe no banco
      const { error: testErr } = await supabase.from('galleries').select('id').limit(1);
      if (testErr && (testErr.code === '42P01' || testErr.message?.includes('does not exist') || testErr.message?.includes('404'))) {
        setIsTableMissing(true);
        setGalleries([]);
        setLoading(false);
        return;
      }

      setIsTableMissing(false);
      // Buscar galerias
      const list = await GalleryService.getUserGalleries(user.id);
      setGalleries(list);
    } catch (err) {
      console.error('Erro ao carregar galerias:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyMigrationSql = () => {
    navigator.clipboard.writeText(MIGRATION_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const [qrCodeModalGallery, setQrCodeModalGallery] = useState<Gallery | null>(null);

  const handleCreateOrUpdateGallery = async (formData: GalleryFormData) => {
    if (!user?.id) return;
    if (selectedGallery) {
      const updated = await GalleryService.updateGallery(selectedGallery.id, formData);
      setGalleries((prev) => prev.map((g) => (g.id === updated.id ? { ...g, ...updated } : g)));
    } else {
      const created = await GalleryService.createGallery(user.id, formData);
      setGalleries((prev) => [created, ...prev]);
    }
  };

  const handleDeleteGallery = async (galleryId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta galeria?')) return;
    try {
      await GalleryService.deleteGallery(galleryId);
      setGalleries((prev) => prev.filter((g) => g.id !== galleryId));
      if (managingGallery?.id === galleryId) {
        setManagingGallery(null);
      }
    } catch (err) {
      console.error('Erro ao excluir galeria:', err);
    }
  };

  const handleOpenPhotoManager = async (gallery: Gallery) => {
    setManagingGallery(gallery);
    setUploadProgressMap({});
    // Carregar fotos da galeria
    const { data } = await supabase
      .from('gallery_photos')
      .select('*')
      .eq('gallery_id', gallery.id)
      .order('display_order', { ascending: true });
    setGalleryPhotos(data || []);
  };

  const handleUploadBatch = async (files: File[]) => {
    if (!managingGallery) return;

    const uploaded = await GalleryService.uploadBatchPhotos(
      managingGallery,
      files,
      googleAccessToken,
      (progressUpdates) => {
        setUploadProgressMap((prev) => ({ ...prev, ...progressUpdates }));
      }
    );

    if (uploaded.length > 0) {
      setGalleryPhotos((prev) => [...prev, ...uploaded]);
      // Recarregar contagem de fotos
      loadData();
    }
  };

  const handleSetCoverPhoto = async (photo: GalleryPhoto) => {
    if (!managingGallery) return;
    try {
      await GalleryService.setCoverPhoto(managingGallery.id, photo.id, photo.supabase_web_path);
      setManagingGallery((prev) => (prev ? { ...prev, cover_photo_id: photo.id, cover_photo_url: photo.supabase_web_path } : null));
      setGalleries((prev) =>
        prev.map((g) => (g.id === managingGallery.id ? { ...g, cover_photo_id: photo.id, cover_photo_url: photo.supabase_web_path } : g))
      );
    } catch (err) {
      console.error('Erro ao definir foto de capa:', err);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!window.confirm('Excluir esta foto permanentemente?')) return;
    try {
      await GalleryService.deletePhoto(photoId);
      setGalleryPhotos((prev) => prev.filter((p) => p.id !== photoId));
      loadData();
    } catch (err) {
      console.error('Erro ao excluir foto:', err);
    }
  };

  const copyGalleryLink = (gallery: Gallery) => {
    const domain = window.location.origin;
    const url = `${domain}/${photographerSlug}/g/${gallery.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(gallery.slug);
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  const filteredGalleries = galleries.filter((g) => {
    const matchesSearch = g.title.toLowerCase().includes(searchQuery.toLowerCase()) || g.slug.includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || g.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Visualização de Gerenciamento de Fotos de uma Galeria Especifica */}
      {managingGallery ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setManagingGallery(null)}
                className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                  <span>{managingGallery.title}</span>
                  {managingGallery.password_hash && <Lock className="w-4 h-4 text-amber-400" />}
                </h2>
                <p className="text-xs text-slate-400">
                  {galleryPhotos.length} fotos • Link: <code className="text-blue-400">/{photographerSlug}/g/{managingGallery.slug}</code>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setQrCodeModalGallery(managingGallery)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors flex items-center space-x-2 border border-slate-700"
              >
                <QrCode className="w-4 h-4 text-blue-400" />
                <span>QR Code</span>
              </button>

              <button
                onClick={() => copyGalleryLink(managingGallery)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors flex items-center space-x-2"
              >
                {copiedSlug === managingGallery.slug ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Link Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Link</span>
                  </>
                )}
              </button>

              <a
                href={`/${photographerSlug}/g/${managingGallery.slug}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center space-x-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Ver Galeria Pública</span>
              </a>
            </div>
          </div>

          {/* Uploader de fotos */}
          <GalleryUploader onUploadFiles={handleUploadBatch} progressMap={uploadProgressMap} />

          {/* Grid de Fotos */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Fotos da Galeria ({galleryPhotos.length})
            </h3>
            <GalleryPhotoGrid
              photos={galleryPhotos}
              coverPhotoId={managingGallery.cover_photo_id}
              onSetCoverPhoto={handleSetCoverPhoto}
              onDeletePhoto={handleDeletePhoto}
            />
          </div>
        </div>
      ) : (
        /* Listagem de Galerias Principal */
        <div className="space-y-6">
          {/* Header Principal */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center space-x-3">
                <ImageIcon className="w-7 h-7 text-blue-500" />
                <span>Entregas de Fotos & Galerias</span>
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Crie galerias virtuais personalizadas, entregue fotos em alta e baixa resolução e expor seu portfólio.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsDriveModalOpen(true)}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all flex items-center space-x-2 ${
                  googleAccessToken
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                <HardDrive className="w-4 h-4" />
                <span>{googleAccessToken ? 'Google Drive Conectado' : 'Conectar Google Drive'}</span>
              </button>

              <button
                onClick={() => {
                  setSelectedGallery(null);
                  setIsEditorOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 transition-all flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Galeria</span>
              </button>
            </div>
          </div>

          {/* Cards de Métricas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center space-x-4">
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total de Galerias</p>
                <p className="text-2xl font-bold text-white mt-0.5">{galleries.length}</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center space-x-4">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Galerias Ativas</p>
                <p className="text-2xl font-bold text-white mt-0.5">
                  {galleries.filter((g) => g.status === 'active').length}
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center space-x-4">
              <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">No Portfólio Público</p>
                <p className="text-2xl font-bold text-white mt-0.5">
                  {galleries.filter((g) => g.is_public_portfolio).length}
                </p>
              </div>
            </div>
          </div>

          {/* Barra de Pesquisa e Filtros */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por título ou slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              {['all', 'active', 'draft', 'archived'].map((statusKey) => (
                <button
                  key={statusKey}
                  onClick={() => setStatusFilter(statusKey)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    statusFilter === statusKey
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {statusKey === 'all'
                    ? 'Todas'
                    : statusKey === 'active'
                    ? 'Ativas'
                    : statusKey === 'draft'
                    ? 'Rascunhos'
                    : 'Arquivadas'}
                </button>
              ))}
            </div>
          </div>

          {/* Banner de Migração SQL se as tabelas ainda não existirem */}
          {isTableMissing && (
            <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-4 shadow-xl">
              <div className="flex items-start space-x-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 mt-0.5">
                  <Copy className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">Ativação do Módulo de Entregas (Banco Supabase)</h3>
                  <p className="text-xs text-amber-200/80 leading-relaxed">
                    As tabelas <code className="text-white font-mono">galleries</code> e <code className="text-white font-mono">gallery_photos</code> ainda não foram criadas no seu banco de dados do Supabase (<code className="text-white font-mono">vkwpcyahwzzeyesyytpa</code>).
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Passo a Passo de Ativação:</span>
                  <button
                    onClick={copyMigrationSql}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors flex items-center space-x-1.5 shadow-md"
                  >
                    {copiedSql ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-slate-950" />
                        <span>SQL Copiado para a Área de Transferência!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar Código SQL (1-Clique)</span>
                      </>
                    )}
                  </button>
                </div>

                <ol className="text-xs text-slate-300 space-y-1.5 list-decimal pl-4">
                  <li>Clique no botão acima para copiar o código SQL completo.</li>
                  <li>
                    Acesse o{' '}
                    <a
                      href="https://supabase.com/dashboard/project/vkwpcyahwzzeyesyytpa/sql/new"
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-400 underline font-bold inline-flex items-center space-x-1"
                    >
                      <span>Supabase SQL Editor</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>Cole o código SQL e clique em <strong>Run</strong>. Pronto! O sistema ativará automaticamente.</li>
                </ol>
              </div>
            </div>
          )}

          {/* Lista de Galerias */}
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm">Carregando galerias...</div>
          ) : filteredGalleries.length === 0 ? (
            <div className="p-16 text-center border border-slate-800 rounded-2xl bg-slate-900/50 space-y-4">
              <div className="p-4 w-14 h-14 rounded-2xl bg-slate-800 text-slate-500 mx-auto flex items-center justify-center">
                <ImageIcon className="w-8 h-8" />
              </div>
              <p className="text-base font-bold text-white">Nenhuma galeria encontrada</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Crie sua primeira galeria online para entregar fotos aos clientes com proteção por senha e portfólio.
              </p>
              <button
                onClick={() => {
                  setSelectedGallery(null);
                  setIsEditorOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 transition-all inline-flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Criar Primeira Galeria</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGalleries.map((gallery) => (
                <div
                  key={gallery.id}
                  className="group bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    {/* Imagem de Capa */}
                    <div
                      onClick={() => handleOpenPhotoManager(gallery)}
                      className="aspect-video bg-slate-950 relative overflow-hidden cursor-pointer"
                    >
                      {gallery.cover_photo_url ? (
                        <img
                          src={gallery.cover_photo_url}
                          alt={gallery.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-gradient-to-br from-slate-900 to-slate-950">
                          <ImageIcon className="w-10 h-10 mb-1 opacity-50" />
                          <span className="text-xs font-medium">Clique para gerenciar fotos</span>
                        </div>
                      )}

                      {/* Badges de Status */}
                      <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                        {gallery.password_hash && (
                          <span className="bg-amber-500/90 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center space-x-1 shadow-md backdrop-blur-sm">
                            <Lock className="w-3 h-3" />
                            <span>Com Senha</span>
                          </span>
                        )}
                        {gallery.is_public_portfolio && (
                          <span className="bg-purple-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center space-x-1 shadow-md backdrop-blur-sm">
                            <Globe className="w-3 h-3" />
                            <span>Portfólio</span>
                          </span>
                        )}
                      </div>

                      <div className="absolute bottom-3 right-3 bg-slate-950/80 text-white text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-sm border border-slate-800">
                        {gallery.photo_count || 0} fotos
                      </div>
                    </div>

                    {/* Conteúdo */}
                    <div className="p-5 space-y-3">
                      <div>
                        <h3 className="text-base font-bold text-white truncate group-hover:text-blue-400 transition-colors">
                          {gallery.title}
                        </h3>
                        {gallery.event_date && (
                          <p className="text-xs text-slate-400 flex items-center space-x-1.5 mt-1">
                            <Calendar className="w-3.5 h-3.5 text-blue-400" />
                            <span>{new Date(gallery.event_date).toLocaleDateString('pt-BR')}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Rodapé de Ações */}
                  <div className="p-4 border-t border-slate-800/80 bg-slate-900/50 flex items-center justify-between">
                    <button
                      onClick={() => copyGalleryLink(gallery)}
                      title="Copiar Link"
                      className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                    >
                      {copiedSlug === gallery.slug ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleOpenPhotoManager(gallery)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                      >
                        Fotos
                      </button>

                      <button
                        onClick={() => {
                          setSelectedGallery(gallery);
                          setIsEditorOpen(true);
                        }}
                        className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteGallery(gallery.id)}
                        className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modais */}
      <GalleryEditor
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleCreateOrUpdateGallery}
        gallery={selectedGallery}
      />

      <GoogleDriveSettingsModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        currentToken={googleAccessToken}
        onSaveToken={handleSaveGoogleToken}
      />

      {qrCodeModalGallery && (
        <GalleryQrCodeModal
          isOpen={!!qrCodeModalGallery}
          onClose={() => setQrCodeModalGallery(null)}
          galleryTitle={qrCodeModalGallery.title}
          galleryUrl={`${window.location.origin}/${photographerSlug}/g/${qrCodeModalGallery.slug}`}
          photographerName={photographerSlug}
        />
      )}
    </div>
  );
}
