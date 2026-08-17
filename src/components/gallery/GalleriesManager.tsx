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
  Download,
  Settings,
  Users,
  CheckSquare,
  RefreshCw,
} from 'lucide-react';
import { Gallery, GalleryPhoto, FileUploadProgress, GalleryFormData } from '../../types/gallery';
import { GalleryService } from '../../services/galleryService';
import { GalleryEditor } from './GalleryEditor';
import { GalleryUploader } from './GalleryUploader';
import { GalleryPhotoGrid } from './GalleryPhotoGrid';
import { GoogleDriveSettingsModal } from './GoogleDriveSettingsModal';
import { GalleryQrCodeModal } from './GalleryQrCodeModal';
import { LightroomPluginModal } from './LightroomPluginModal';
import { SocialPostStudio } from './SocialPostStudio';
import { GalleryVisitorsModal } from './GalleryVisitorsModal';
import type { CullingPhoto } from './AICullingManager';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

export function GalleriesManager() {
  const { user } = useAuth();
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedGalleryIds, setSelectedGalleryIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Perfil do fotógrafo (slugUsuario)
  const [photographerSlug, setPhotographerSlug] = useState<string>('');

  // Modais e edição
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isLightroomModalOpen, setIsLightroomModalOpen] = useState(false);
  const [selectedGallery, setSelectedGallery] = useState<Gallery | null>(null);

  // Gerenciamento de Fotos dentro da Galeria Selecionada
  const [managingGallery, setManagingGallery] = useState<Gallery | null>(null);
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([]);
  const [uploadProgressMap, setUploadProgressMap] = useState<Record<string, FileUploadProgress>>({});

  // Token do Google Drive com persistência no localStorage
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(() => {
    return localStorage.getItem('priceus_google_drive_token') || null;
  });

  const handleSaveGoogleToken = async (token: string) => {
    const trimmed = token.trim();
    if (trimmed) {
      localStorage.setItem('priceus_google_drive_token', trimmed);
      setGoogleAccessToken(trimmed);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ google_auth_data: { access_token: trimmed, updated_at: new Date().toISOString() } })
          .eq('id', user.id);
      }
    } else {
      localStorage.removeItem('priceus_google_drive_token');
      setGoogleAccessToken(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ google_auth_data: null })
          .eq('id', user.id);
      }
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
      // Buscar perfil do usuário para o slugUsuario e token do Google OAuth
      const { data: profile } = await supabase
        .from('profiles')
        .select('slug_usuario, nome_profissional, google_auth_data')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.google_auth_data?.access_token) {
        const autoToken = profile.google_auth_data.access_token;
        localStorage.setItem('priceus_google_drive_token', autoToken);
        setGoogleAccessToken(autoToken);
      }

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
  const [visitorsModalGallery, setVisitorsModalGallery] = useState<Gallery | null>(null);
  const [offloading, setOffloading] = useState(false);
  const [offloadStatus, setOffloadStatus] = useState<string | null>(null);
  const [isSyncingFromDrive, setIsSyncingFromDrive] = useState(false);

  const handleSyncFromDrive = async () => {
    if (!managingGallery) return;
    const token = googleAccessToken || localStorage.getItem('priceus_google_drive_token');
    if (!token) {
      setIsDriveModalOpen(true);
      return;
    }

    try {
      setIsSyncingFromDrive(true);
      setOffloadStatus('Sincronizando fotos existentes da pasta do Google Drive...');
      const result = await GalleryService.syncPhotosFromDriveFolder(
        managingGallery,
        token,
        (synced, total) => {
          setOffloadStatus(`Importando fotos do Google Drive: ${synced}/${total}...`);
        }
      );

      if (result.addedCount > 0) {
        alert(`✅ Sucesso! ${result.addedCount} fotos novas foram importadas da pasta do Google Drive.`);
        // Recarregar fotos da galeria superando a trava de 1000 linhas
        const allPhotos = await GalleryService.getAllPhotosForGallery(managingGallery.id);
        setGalleryPhotos(allPhotos);
        loadData();
      } else {
        alert(`Sua galeria já está 100% atualizada! Encontradas ${result.totalInDrive} fotos no Google Drive.`);
      }
    } catch (err: any) {
      console.error('Erro ao sincronizar do Drive:', err);
      alert(`Erro ao sincronizar do Google Drive: ${err?.message || 'Falha na conexão'}`);
    } finally {
      setIsSyncingFromDrive(false);
      setOffloadStatus(null);
    }
  };

  const handleOffloadToDrive = async () => {
    if (!managingGallery) return;
    if (!googleAccessToken) {
      setIsDriveModalOpen(true);
      return;
    }

    setOffloading(true);
    setOffloadStatus('Iniciando cópia para o Google Drive...');

    try {
      const res = await GalleryService.offloadGalleryPhotosToDrive(
        managingGallery,
        googleAccessToken,
        (current, total, fileName) => {
          setOffloadStatus(`Transferindo foto ${current}/${total}: ${fileName} e liberando espaço...`);
        }
      );

      if (res.transferredCount > 0) {
        const freedMb = (res.freedBytes / (1024 * 1024)).toFixed(1);
        alert(`✅ Sucesso! ${res.transferredCount} foto(s) foram salvas no Google Drive e ${freedMb} MB foram liberados no Supabase Storage!`);
        handleOpenPhotoManager(managingGallery);
      } else {
        alert('Todas as fotos desta galeria já estão armazenadas no Google Drive!');
      }
    } catch (err: any) {
      console.error('Erro ao transferir fotos para o Google Drive:', err);
      alert(err.message || 'Falha ao mover fotos para o Google Drive');
    } finally {
      setOffloading(false);
      setOffloadStatus(null);
    }
  };

  const handleCreateOrUpdateGallery = async (formData: GalleryFormData) => {
    if (!user?.id) return;
    if (selectedGallery) {
      const updated = await GalleryService.updateGallery(selectedGallery.id, formData);
      setGalleries((prev) => prev.map((g) => (g.id === updated.id ? { ...g, ...updated } : g)));
      if (managingGallery?.id === updated.id) {
        setManagingGallery((prev) => (prev ? { ...prev, ...updated } : null));
      }
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
      setSelectedGalleryIds((prev) => prev.filter((id) => id !== galleryId));
      if (managingGallery?.id === galleryId) {
        setManagingGallery(null);
      }
    } catch (err) {
      console.error('Erro ao excluir galeria:', err);
    }
  };

  const toggleGallerySelection = (galleryId: string) => {
    setSelectedGalleryIds((prev) =>
      prev.includes(galleryId)
        ? prev.filter((id) => id !== galleryId)
        : [...prev, galleryId]
    );
  };

  const handleSelectAllGalleries = () => {
    if (selectedGalleryIds.length === filteredGalleries.length) {
      setSelectedGalleryIds([]);
    } else {
      setSelectedGalleryIds(filteredGalleries.map((g) => g.id));
    }
  };

  const handleBulkDeleteGalleries = async () => {
    if (selectedGalleryIds.length === 0) return;
    const count = selectedGalleryIds.length;
    if (
      !window.confirm(
        `Tem certeza que deseja excluir as ${count} galerias selecionadas e todas as suas fotos? Esta ação não pode ser desfeita.`
      )
    ) {
      return;
    }

    try {
      await GalleryService.deleteMultipleGalleries(selectedGalleryIds);
      setGalleries((prev) => prev.filter((g) => !selectedGalleryIds.includes(g.id)));
      if (managingGallery && selectedGalleryIds.includes(managingGallery.id)) {
        setManagingGallery(null);
      }
      setSelectedGalleryIds([]);
      setIsSelectionMode(false);
    } catch (err) {
      console.error('Erro ao excluir galerias em lote:', err);
      alert('Erro ao excluir galerias em lote. Tente novamente.');
    }
  };

  const handleOpenPhotoManager = async (gallery: Gallery) => {
    setManagingGallery(gallery);
    setUploadProgressMap({});
    // Carregar todas as fotos da galeria (superando a trava de 1000 linhas do PostgREST)
    const initialPhotos = await GalleryService.getAllPhotosForGallery(gallery.id);
    setGalleryPhotos(initialPhotos);

    // 🛡️ AUTO-HEALER INVISÍVEL EM BACKGROUND:
    // Se a galeria estiver com 0 fotos no banco, sincroniza automaticamente do Google Drive em background
    const token = googleAccessToken || localStorage.getItem('priceus_google_drive_token');
    if (token && initialPhotos.length === 0) {
      console.log(`[Auto-Healer 🛡️] Galeria vazia detectada. Importando fotos do Google Drive em background...`);
      GalleryService.syncPhotosFromDriveFolder(gallery, token).then(async (res) => {
        if (res.addedCount > 0) {
          console.log(`[Auto-Healer 🛡️] ⚡ Detectadas e importadas +${res.addedCount} fotos do Google Drive!`);
          const refreshed = await GalleryService.getAllPhotosForGallery(gallery.id);
          setGalleryPhotos(refreshed);
          loadData();
        }
      }).catch((err) => {
        console.warn('[Auto-Healer 🛡️] Aviso de verificação Drive:', err?.message || err);
      });
    }
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

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleSyncFromDrive}
                disabled={isSyncingFromDrive}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-all flex items-center space-x-2 disabled:opacity-50 cursor-pointer shadow-sm"
                title="Puxa todas as fotos que já estão na pasta do Google Drive para dentro da galeria sem precisar fazer upload"
              >
                <RefreshCw className={`w-4 h-4 text-amber-400 ${isSyncingFromDrive ? 'animate-spin' : ''}`} />
                <span>{isSyncingFromDrive ? 'Importando do Google Drive...' : '🔄 Sincronizar Fotos do Google Drive'}</span>
              </button>

              <button
                onClick={handleOffloadToDrive}
                disabled={offloading}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-all flex items-center space-x-2 disabled:opacity-50"
              >
                <HardDrive className={`w-4 h-4 text-emerald-400 ${offloading ? 'animate-spin' : ''}`} />
                <span>{offloading ? 'Movendo...' : 'Mover Fotos p/ Google Drive (Liberar Supabase)'}</span>
              </button>

              <button
                onClick={() => {
                  setSelectedGallery(managingGallery);
                  setIsEditorOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition-all flex items-center space-x-2"
              >
                <Settings className="w-4 h-4 text-blue-400" />
                <span>Editar Configurações</span>
              </button>

              <button
                onClick={() => setVisitorsModalGallery(managingGallery)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-all flex items-center space-x-2"
              >
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Visitantes & Compras</span>
              </button>

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

          {/* Banner de status de transferência para o Google Drive */}
          {offloadStatus && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center space-x-3 animate-in fade-in">
              <HardDrive className="w-4 h-4 animate-spin text-emerald-400" />
              <span>{offloadStatus}</span>
            </div>
          )}

          {/* Uploader de fotos */}
          <GalleryUploader onUploadFiles={handleUploadBatch} progressMap={uploadProgressMap} />

          {/* Grid de Fotos */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <ImageIcon className="w-4 h-4 text-blue-400" />
                <span>Fotos da Galeria ({galleryPhotos.length})</span>
              </h3>
            </div>
            <GalleryPhotoGrid
              photos={galleryPhotos}
              coverPhotoId={managingGallery.cover_photo_id}
              onSetCoverPhoto={handleSetCoverPhoto}
              onDeletePhoto={handleDeletePhoto}
            />
          </div>

          {/* Gerador Inteligente de Posts Virais & Legendas Anexado à Galeria Entregue */}
          {galleryPhotos.length > 0 && (
            <div className="pt-6 border-t border-slate-800">
              <SocialPostStudio
                photos={galleryPhotos.map((gp, i) => {
                  const driveId = (gp.google_drive_file_id && gp.google_drive_file_id !== 'LOCAL_ONLY') ? gp.google_drive_file_id : null;
                  const driveThumbnail = driveId ? `https://drive.google.com/thumbnail?id=${driveId}&sz=w1200` : '';
                  const driveCdn = driveId ? `https://lh3.googleusercontent.com/d/${driveId}=w1200` : '';
                  const supabaseUrl = gp.supabase_web_path || gp.supabase_thumb_path || (gp as any).low_res_url || (gp as any).original_url || '';
                  const resolvedUrl = supabaseUrl || driveThumbnail || driveCdn;

                  return {
                    id: gp.id,
                    fileName: gp.file_name || `foto_${i + 1}.jpg`,
                    previewUrl: resolvedUrl,
                    format: 'JPG',
                    isRaw: false,
                    rotation: 0,
                    sharpnessScore: 92,
                    isBlurry: false,
                    eyesClosed: false,
                    isBestTake: true,
                    sceneGroup: 'Galeria Entregue',
                    selected: true,
                    isDiscarded: false,
                    starRating: 5,
                    colorLabel: 'none',
                    editSettings: {
                      exposure: 0, contrast: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0,
                      temp: 5500, tint: 0, vibrance: 10, saturation: 0, sharpness: 25, presetIntensity: 100
                    }
                  };
                })}
                projectTitle={managingGallery.title}
              />
            </div>
          )}
        </div>
      ) : (
        /* Listagem de Galerias Principal */
        <div className="space-y-6">
          {/* Header Principal */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl text-white">
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
                onClick={() => setIsLightroomModalOpen(true)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 transition-all flex items-center space-x-2 cursor-pointer"
              >
                <Download className="w-4 h-4 text-purple-400" />
                <span>Plugin Lightroom</span>
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

          {/* Barra de Pesquisa, Seleção Múltipla e Filtros */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center space-x-3 w-full md:w-auto flex-1">
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

              {/* Botão de Modo Seleção Múltipla */}
              <button
                onClick={() => {
                  setIsSelectionMode(!isSelectionMode);
                  if (isSelectionMode) setSelectedGalleryIds([]);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                  isSelectionMode || selectedGalleryIds.length > 0
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/60'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                <span>{isSelectionMode ? 'Cancelar Seleção' : 'Selecionar Várias'}</span>
              </button>
            </div>

            <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
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

          {/* Barra Flutuante de Ações em Lote quando há galerias selecionadas */}
          {(isSelectionMode || selectedGalleryIds.length > 0) && (
            <div className="p-4 rounded-2xl bg-slate-900 border border-blue-500/40 flex items-center justify-between animate-in fade-in slide-in-from-top-2 shadow-xl shadow-blue-950/30">
              <div className="flex items-center space-x-3">
                <span className="text-xs font-bold text-white bg-blue-600/30 border border-blue-500/40 px-3 py-1.5 rounded-xl">
                  {selectedGalleryIds.length} de {filteredGalleries.length} galerias selecionadas
                </span>
                <button
                  onClick={handleSelectAllGalleries}
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                >
                  {selectedGalleryIds.length === filteredGalleries.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                </button>
              </div>

              {selectedGalleryIds.length > 0 && (
                <button
                  onClick={handleBulkDeleteGalleries}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20 transition-all flex items-center space-x-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Excluir Selecionadas ({selectedGalleryIds.length})</span>
                </button>
              )}
            </div>
          )}

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
              {filteredGalleries.map((gallery) => {
                const isSelected = selectedGalleryIds.includes(gallery.id);

                return (
                  <div
                    key={gallery.id}
                    className={`group bg-slate-900 border rounded-2xl overflow-hidden transition-all duration-200 flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-950/10'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      {/* Imagem de Capa */}
                      <div
                        onClick={() => {
                          if (isSelectionMode || selectedGalleryIds.length > 0) {
                            toggleGallerySelection(gallery.id);
                          } else {
                            handleOpenPhotoManager(gallery);
                          }
                        }}
                        className="aspect-video bg-slate-950 relative overflow-hidden cursor-pointer"
                      >
                        {/* Checkbox de Seleção Múltipla */}
                        {(isSelectionMode || selectedGalleryIds.length > 0) && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleGallerySelection(gallery.id);
                            }}
                            className="absolute top-3 left-3 z-20 p-1 rounded-lg bg-slate-950/90 backdrop-blur-md cursor-pointer hover:scale-110 transition-transform border border-slate-700/80"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-700 bg-slate-900 cursor-pointer block"
                            />
                          </div>
                        )}

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
                        <div className={`absolute top-3 flex flex-wrap gap-2 ${isSelectionMode || selectedGalleryIds.length > 0 ? 'left-11' : 'left-3'}`}>
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
                          onClick={() => setVisitorsModalGallery(gallery)}
                          title="Ver Visitantes & Vendas"
                          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors flex items-center space-x-1"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>Visitantes</span>
                        </button>

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
                          title="Editar Galeria"
                          className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {/* Botão de Excluir Galeria Individual */}
                        <button
                          onClick={() => handleDeleteGallery(gallery.id)}
                          title="Excluir esta Galeria"
                          className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/30 transition-all cursor-pointer shadow-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
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

      <LightroomPluginModal
        isOpen={isLightroomModalOpen}
        onClose={() => setIsLightroomModalOpen(false)}
        userId={user?.id}
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

      {visitorsModalGallery && (
        <GalleryVisitorsModal
          isOpen={!!visitorsModalGallery}
          onClose={() => setVisitorsModalGallery(null)}
          galleryId={visitorsModalGallery.id}
          galleryTitle={visitorsModalGallery.title}
        />
      )}
    </div>
  );
}
