import { useState, useEffect } from 'react';
import { supabase, Profile } from '../lib/supabase';
import { Save, Upload, User, Globe, Eye, Check, X, Link as LinkIcon, ExternalLink, CreditCard } from 'lucide-react';
import { generateSlug, validateSlugFormat, checkUserSlugAvailability } from '../lib/slugUtils';
import { useSubscription } from '../hooks/useSubscription';

interface ProfileEditorProps {
  userId: string;
}

export function ProfileEditor({ userId }: ProfileEditorProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [slugInput, setSlugInput] = useState('');
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const { manageSubscription, loading: subLoading } = useSubscription();

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setProfile(data as any);
        setSlugInput(data.slug_usuario || '');
      } else {
        setProfile({
          id: userId,
          nome_admin: null,
          nome_profissional: null,
          tipo_fotografia: null,
          instagram: null,
          whatsapp_principal: null,
          email_recebimento: null,
          profile_image_url: null,
          apresentacao: null,
          portfolio_link: null,
          portfolio_fotos: null,
          status_assinatura: 'trial',
          data_expiracao_trial: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any);
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateField = (field: keyof Profile, value: any) => {
    if (!profile) return;
    setProfile({ ...profile, [field]: value });
  };

  const handleSlugChange = async (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlugInput(sanitized);
    setSlugAvailable(null);

    if (sanitized.length < 3) return;

    setCheckingSlug(true);
    const available = await checkUserSlugAvailability(sanitized, userId);
    setSlugAvailable(available);
    setCheckingSlug(false);
  };

  const handleGenerateSlug = async () => {
    if (!profile?.nome_profissional) {
      alert('Preencha o Nome Profissional primeiro');
      return;
    }
    const slug = generateSlug(profile.nome_profissional);
    handleSlugChange(slug);
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    if (slugInput && !validateSlugFormat(slugInput)) {
      alert('Username inválido! Use apenas letras minúsculas, números e hífens.');
      return;
    }

    if (slugInput && slugAvailable === false) {
      alert('Este username já está em uso!');
      return;
    }

    setSaving(true);
    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      const profileData = {
        id: userId,
        nome_admin: profile.nome_admin,
        nome_profissional: profile.nome_profissional,
        tipo_fotografia: profile.tipo_fotografia,
        instagram: profile.instagram,
        whatsapp_principal: profile.whatsapp_principal,
        email_recebimento: profile.email_recebimento,
        profile_image_url: profile.profile_image_url,
        apresentacao: profile.apresentacao,
        slug_usuario: slugInput || null,
        perfil_publico: profile.perfil_publico || false,
        exibir_botao_perfil_completo: profile.exibir_botao_perfil_completo ?? true,
        meta_description: profile.meta_description || null,
        aceita_avaliacoes: profile.aceita_avaliacoes ?? true,
        aprovacao_automatica_avaliacoes: profile.aprovacao_automatica_avaliacoes ?? false,
        exibir_avaliacoes_publico: profile.exibir_avaliacoes_publico ?? true,
        rating_minimo_exibicao: profile.rating_minimo_exibicao ?? 1,
        incentivo_avaliacao_ativo: profile.incentivo_avaliacao_ativo ?? false,
        incentivo_avaliacao_texto: profile.incentivo_avaliacao_texto || null,
        portfolio_link: profile.portfolio_link || null,
        portfolio_fotos: profile.portfolio_fotos || null,
        dias_adiar_tarefas: profile.dias_adiar_tarefas ?? 7,
        google_auth_data: profile.google_auth_data || null,
        updated_at: new Date().toISOString(),
      };

      if (existingProfile) {
        const { error } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('profiles').insert({
          ...profileData,
          status_assinatura: 'trial',
        });
        if (error) throw error;
      }

      alert('✅ Perfil atualizado com sucesso!');
      loadProfile();
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      alert('❌ Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleLinkGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: {
          redirectTo: window.location.href,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          scopes: 'https://www.googleapis.com/auth/calendar',
          skipBrowserRedirect: true
        }
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err: any) {
      alert(`Erro ao vincular conta do Google: ${err.message || err}`);
    }
  };

  const handleUnlinkGoogle = async () => {
    if (!confirm('Deseja realmente desconectar sua conta do Google? Isso desativará a sincronização com a sua agenda.')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ google_auth_data: null })
        .eq('id', userId);
        
      if (error) throw error;
      
      handleUpdateField('google_auth_data', null);
      alert('Conta do Google desconectada com sucesso.');
    } catch (err: any) {
      alert(`Erro ao desconectar: ${err.message || err}`);
    }
  };

  const handleUploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('❌ Arquivo muito grande! Máximo: 5MB');
      return;
    }

    const originalUrl = profile?.profile_image_url;
    // Criar um preview local instantâneo
    const localPreviewUrl = URL.createObjectURL(file);
    handleUpdateField('profile_image_url', localPreviewUrl);

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `profile/${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);

      handleUpdateField('profile_image_url', publicUrlData.publicUrl);
      alert('✅ Imagem carregada! Clique em "Salvar Perfil" para confirmar.');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('❌ Erro ao fazer upload da imagem');
      // Reverter para a imagem original em caso de erro
      if (originalUrl) {
        handleUpdateField('profile_image_url', originalUrl);
      }
    } finally {
      setUploading(false);
      // Liberar memória do preview local
      URL.revokeObjectURL(localPreviewUrl);
    }
  };

  const [uploadingPortfolioIdx, setUploadingPortfolioIdx] = useState<number | null>(null);

  const handleUploadPortfolioImage = async (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('❌ Arquivo muito grande! Máximo: 5MB');
      return;
    }

    setUploadingPortfolioIdx(index);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `profile/${userId}/portfolio-${index}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);

      const currentFotos = [...(profile?.portfolio_fotos || [])];
      currentFotos[index] = publicUrlData.publicUrl;
      handleUpdateField('portfolio_fotos', currentFotos);
      alert('✅ Foto de portfólio carregada! Clique em "Salvar Perfil" para confirmar.');
    } catch (error) {
      console.error('Erro ao fazer upload da foto de portfólio:', error);
      alert('❌ Erro ao fazer upload da imagem');
    } finally {
      setUploadingPortfolioIdx(null);
    }
  };

  const handleRemovePortfolioImage = (index: number) => {
    if (!profile?.portfolio_fotos) return;
    const currentFotos = [...profile.portfolio_fotos];
    currentFotos.splice(index, 1);
    handleUpdateField('portfolio_fotos', currentFotos.filter(Boolean));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!profile) {
    return <div>Erro ao carregar perfil</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Meu Perfil</h2>
        <p className="text-gray-600 dark:text-[rgba(255,255,255,0.6)]">
          Configure suas informações profissionais e dados de contato
        </p>
      </div>

      <div className="bg-white dark:bg-[#0a1628] rounded-lg shadow dark:shadow-none border border-transparent dark:border-[rgba(255,255,255,.05)] p-6 space-y-6">
        <div className="flex items-start gap-6">
          <div className="flex flex-col items-center gap-3">
            {profile.profile_image_url ? (
              <img
                src={profile.profile_image_url}
                alt="Foto de perfil"
                className="w-32 h-32 rounded-full object-cover border-4 border-blue-600"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-300">
                <User className="w-16 h-16 text-gray-400" />
              </div>
            )}

            <label className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer text-sm font-medium">
              <Upload className="w-4 h-4" />
              {uploading ? 'Enviando...' : 'Alterar Foto'}
              <input
                type="file"
                accept="image/*"
                onChange={handleUploadImage}
                disabled={uploading}
                className="hidden"
              />
            </label>
            <p className="text-xs text-gray-500 text-center">
              PNG, JPG ou WEBP
              <br />
              Máximo 5MB
            </p>
          </div>

          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-[rgba(255,255,255,0.8)] mb-1">
                  Nome do Admin
                </label>
                <input
                  type="text"
                  value={profile.nome_admin || ''}
                  onChange={(e) => handleUpdateField('nome_admin', e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-[#07101f] border border-gray-300 dark:border-[rgba(255,255,255,.08)] text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Seu nome"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-[rgba(255,255,255,0.8)] mb-1">
                  Nome Profissional
                </label>
                <input
                  type="text"
                  value={profile.nome_profissional || ''}
                  onChange={(e) => handleUpdateField('nome_profissional', e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-[#07101f] border border-gray-300 dark:border-[rgba(255,255,255,.08)] text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome que aparecerá nos orçamentos"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[rgba(255,255,255,0.8)] mb-1">
                Tipo de Fotografia
              </label>
              <input
                type="text"
                value={profile.tipo_fotografia || ''}
                onChange={(e) => handleUpdateField('tipo_fotografia', e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-[#07101f] border border-gray-300 dark:border-[rgba(255,255,255,.08)] text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Casamentos, Eventos, Ensaios"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[rgba(255,255,255,0.8)] mb-1">
                Apresentação
              </label>
              <textarea
                value={profile.apresentacao || ''}
                onChange={(e) => handleUpdateField('apresentacao', e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-[#07101f] border border-gray-300 dark:border-[rgba(255,255,255,.08)] text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Breve apresentação sobre você e seu trabalho..."
              />
            </div>
          </div>
        </div>

        <div className="border-t dark:border-[rgba(255,255,255,0.08)] pt-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Perfil Público e SEO
          </h3>

          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-[rgba(59,130,246,0.1)] dark:to-[rgba(34,197,94,0.1)] rounded-lg border border-blue-200 dark:border-[rgba(59,130,246,0.2)]">
              <div>
                <p className="font-medium text-gray-900 dark:text-blue-300">Ativar Perfil Público</p>
                <p className="text-sm text-gray-600 dark:text-blue-200 opacity-80">Seu perfil será acessível publicamente com seus orçamentos</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.perfil_publico ?? false}
                  onChange={(e) => handleUpdateField('perfil_publico', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[rgba(255,255,255,0.05)] rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.1)]">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Exibir Botão "Ver Perfil Completo"</p>
                <p className="text-sm text-gray-600 dark:text-[rgba(255,255,255,0.5)]">Mostrar link para seu perfil no cabeçalho dos orçamentos</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.exibir_botao_perfil_completo ?? true}
                  onChange={(e) => handleUpdateField('exibir_botao_perfil_completo', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[rgba(255,255,255,0.8)] mb-2">
                Seu Username (URL Pública)
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={slugInput}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-[#07101f] border border-gray-300 dark:border-[rgba(255,255,255,.08)] text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 pr-10"
                    placeholder="seu-username"
                    minLength={3}
                    maxLength={50}
                  />
                  {checkingSlug && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                  {!checkingSlug && slugInput.length >= 3 && slugAvailable !== null && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {slugAvailable ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <X className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleGenerateSlug}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium whitespace-nowrap"
                >
                  Gerar Auto
                </button>
              </div>
              {slugInput && (
                <div className="mt-2 p-3 bg-gray-50 dark:bg-[rgba(255,255,255,0.05)] rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.1)]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm flex-1">
                      <LinkIcon className="w-4 h-4 text-gray-500 dark:text-[rgba(255,255,255,0.5)]" />
                      <span className="text-gray-600 dark:text-[rgba(255,255,255,0.6)]">URL do seu perfil:</span>
                      <code className="text-blue-600 dark:text-blue-400 font-mono">priceus.com.br/{slugInput}</code>
                    </div>
                    <a
                      href={`https://priceus.com.br/${slugInput}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium whitespace-nowrap transition-colors"
                    >
                      Ver Perfil
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-500 dark:text-[rgba(255,255,255,0.4)] mt-1">
                Mínimo 3 caracteres. Use apenas letras minúsculas, números e hífens.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[rgba(255,255,255,0.8)] mb-1">
                Meta Description (SEO)
              </label>
              <textarea
                value={profile.meta_description || ''}
                onChange={(e) => handleUpdateField('meta_description', e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-[#07101f] border border-gray-300 dark:border-[rgba(255,255,255,.08)] text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={2}
                maxLength={160}
                placeholder="Descrição curta para aparecer nos resultados do Google (máx. 160 caracteres)"
              />
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-gray-500 dark:text-[rgba(255,255,255,0.4)]">
                  Descrição otimizada para buscadores (Google, Bing, etc)
                </p>
                <span className="text-xs text-gray-500 dark:text-[rgba(255,255,255,0.4)]">
                  {(profile.meta_description || '').length}/160
                </span>
              </div>
            </div>

            {profile.visualizacoes_perfil !== undefined && (
              <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-[rgba(168,85,247,0.1)] dark:to-[rgba(236,72,153,0.1)] rounded-lg border border-purple-200 dark:border-[rgba(168,85,247,0.2)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <span className="font-medium text-gray-900 dark:text-purple-300">Visualizações do Perfil</span>
                  </div>
                  <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {profile.visualizacoes_perfil || 0}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Integração Google */}
        <div className="border-t dark:border-[rgba(255,255,255,0.08)] pt-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582l3.51-3.51C17.745 1.09 14.981 0 12 0 7.354 0 3.307 2.665 1.299 6.554l3.967 3.211z"
              />
              <path
                fill="#4285F4"
                d="M23.64 12.273c0-.818-.073-1.609-.208-2.373H12v4.582h6.536a5.58 5.58 0 0 1-2.427 3.663l3.8 2.945c2.227-2.054 3.731-5.072 3.731-8.817z"
              />
              <path
                fill="#FBBC05"
                d="M5.266 14.235A7.09 7.09 0 0 1 4.909 12c0-.79.136-1.545.357-2.235L1.3 6.554A11.96 11.96 0 0 0 0 12c0 1.92.455 3.736 1.258 5.355l4.008-3.12z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.97-1.073 7.96-2.918l-3.8-2.945c-1.055.709-2.409 1.136-4.16 1.136-3.21 0-5.928-2.164-6.897-5.091L1.135 17.3A11.967 11.967 0 0 0 12 24z"
              />
            </svg>
            Integração Google Calendar
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Conecte sua conta do Google para dar permissão de escrita de eventos na sua agenda.
          </p>

          <div className="p-4 rounded-xl border border-gray-200 dark:border-[rgba(255,255,255,0.08)] bg-gray-50 dark:bg-white/5">
            {profile.google_auth_data ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="font-semibold text-gray-900 dark:text-white">Conectado ao Google Calendar</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Credenciais atualizadas: {profile.google_auth_data.updated_at ? new Date(profile.google_auth_data.updated_at).toLocaleString('pt-BR') : 'Sem registro'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleUnlinkGoogle}
                  className="px-4 py-2 border border-red-200 hover:border-red-300 text-red-600 hover:text-red-700 bg-white dark:bg-transparent rounded-lg text-sm font-semibold transition-colors"
                >
                  Desconectar Google
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-700 dark:text-[rgba(255,255,255,0.8)]">Conta não vinculada</p>
                  <p className="text-xs text-gray-500 mt-1">Vincule para permitir que o sistema escreva novos eventos na sua agenda do Google.</p>
                </div>
                <button
                  type="button"
                  onClick={handleLinkGoogle}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-gray-300 dark:border-[rgba(255,255,255,0.08)] text-gray-700 dark:text-white rounded-lg text-sm font-bold shadow-sm hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582l3.51-3.51C17.745 1.09 14.981 0 12 0 7.354 0 3.307 2.665 1.299 6.554l3.967 3.211z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.64 12.273c0-.818-.073-1.609-.208-2.373H12v4.582h6.536a5.58 5.58 0 0 1-2.427 3.663l3.8 2.945c2.227-2.054 3.731-5.072 3.731-8.817z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.266 14.235A7.09 7.09 0 0 1 4.909 12c0-.79.136-1.545.357-2.235L1.3 6.554A11.96 11.96 0 0 0 0 12c0 1.92.455 3.736 1.258 5.355l4.008-3.12z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.97-1.073 7.96-2.918l-3.8-2.945c-1.055.709-2.409 1.136-4.16 1.136-3.21 0-5.928-2.164-6.897-5.091L1.135 17.3A11.967 11.967 0 0 0 12 24z"
                    />
                  </svg>
                  Vincular Conta Google
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="border-t dark:border-[rgba(255,255,255,0.08)] pt-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Informações de Contato</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[rgba(255,255,255,0.8)] mb-1">
                WhatsApp Principal *
              </label>
              <input
                type="tel"
                value={profile.whatsapp_principal || ''}
                onChange={(e) => handleUpdateField('whatsapp_principal', e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-[#07101f] border border-gray-300 dark:border-[rgba(255,255,255,.08)] text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="(11) 99999-9999"
              />
              <p className="text-xs text-gray-500 dark:text-[rgba(255,255,255,0.4)] mt-1">
                Usado para receber mensagens dos clientes
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[rgba(255,255,255,0.8)] mb-1">
                E-mail de Recebimento
              </label>
              <input
                type="email"
                value={profile.email_recebimento || ''}
                onChange={(e) => handleUpdateField('email_recebimento', e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-[#07101f] border border-gray-300 dark:border-[rgba(255,255,255,.08)] text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="contato@seuemail.com"
              />
              <p className="text-xs text-gray-500 dark:text-[rgba(255,255,255,0.4)] mt-1">
                Para notificações e contato dos clientes
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[rgba(255,255,255,0.8)] mb-1">
                Instagram
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-[rgba(255,255,255,0.4)]">@</span>
                <input
                  type="text"
                  value={profile.instagram || ''}
                  onChange={(e) => handleUpdateField('instagram', e.target.value)}
                  className="flex-1 px-4 py-2 bg-white dark:bg-[#07101f] border border-gray-300 dark:border-[rgba(255,255,255,.08)] text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="seu_instagram"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[rgba(255,255,255,0.8)] mb-1">
                Dias Padrão para Adiar Tarefas no Workflow
              </label>
              <input
                type="number"
                min={1}
                max={90}
                value={profile.dias_adiar_tarefas ?? 7}
                onChange={(e) => handleUpdateField('dias_adiar_tarefas', parseInt(e.target.value) || 7)}
                className="w-full px-4 py-2 bg-white dark:bg-[#07101f] border border-gray-300 dark:border-[rgba(255,255,255,.08)] text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="7"
              />
              <p className="text-xs text-gray-500 dark:text-[rgba(255,255,255,0.4)] mt-1">
                Quantidade de dias adicionados por padrão ao clicar em "Adiar" no workflow
              </p>
            </div>
          </div>
        </div>

        <div className="border-t dark:border-[rgba(255,255,255,0.08)] pt-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Configurações de Avaliações</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[rgba(255,255,255,0.05)] rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Aceitar Avaliações</p>
                <p className="text-sm text-gray-600 dark:text-[rgba(255,255,255,0.5)]">Permitir que clientes avaliem seu trabalho</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.aceita_avaliacoes ?? true}
                  onChange={(e) => handleUpdateField('aceita_avaliacoes', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[rgba(255,255,255,0.05)] rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Aprovação Automática</p>
                <p className="text-sm text-gray-600 dark:text-[rgba(255,255,255,0.5)]">Aprovar avaliações automaticamente sem revisão</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.aprovacao_automatica_avaliacoes ?? false}
                  onChange={(e) => handleUpdateField('aprovacao_automatica_avaliacoes', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[rgba(255,255,255,0.05)] rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Exibir Publicamente</p>
                <p className="text-sm text-gray-600 dark:text-[rgba(255,255,255,0.5)]">Mostrar avaliações na página de orçamento</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.exibir_avaliacoes_publico ?? true}
                  onChange={(e) => handleUpdateField('exibir_avaliacoes_publico', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[rgba(255,255,255,0.8)] mb-2">
                Rating Mínimo para Exibição
              </label>
              <select
                value={profile.rating_minimo_exibicao ?? 1}
                onChange={(e) => handleUpdateField('rating_minimo_exibicao', parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-white dark:bg-[#07101f] border border-gray-300 dark:border-[rgba(255,255,255,.08)] text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>1 estrela ou mais</option>
                <option value={2}>2 estrelas ou mais</option>
                <option value={3}>3 estrelas ou mais</option>
                <option value={4}>4 estrelas ou mais</option>
                <option value={5}>Apenas 5 estrelas</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-[rgba(255,255,255,0.4)] mt-1">
                Apenas avaliações com este rating ou superior serão exibidas
              </p>
            </div>

            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-[rgba(234,179,8,0.1)] dark:to-[rgba(249,115,22,0.1)] rounded-lg border border-yellow-200 dark:border-[rgba(234,179,8,0.2)]">
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-yellow-300 mb-1">Incentivo para Avaliações</p>
                <p className="text-sm text-gray-600 dark:text-yellow-100 opacity-80 mb-3">Mostre uma mensagem incentivando avaliações</p>

                <label className="flex items-center gap-2 mb-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.incentivo_avaliacao_ativo ?? false}
                    onChange={(e) => handleUpdateField('incentivo_avaliacao_ativo', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-yellow-200">Ativar incentivo</span>
                </label>

                {profile.incentivo_avaliacao_ativo && (
                  <textarea
                    value={profile.incentivo_avaliacao_texto || ''}
                    onChange={(e) => handleUpdateField('incentivo_avaliacao_texto', e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-[#07101f] border border-gray-300 dark:border-[rgba(255,255,255,.08)] text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Ex: Ganhe 10% de desconto no próximo serviço ao avaliar!"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t dark:border-[rgba(255,255,255,0.08)] pt-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Portfólio no Orçamento
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Adicione um link para seu portfólio completo e até 3 fotos de destaque para serem exibidas no cabeçalho do seu orçamento.
          </p>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[rgba(255,255,255,0.8)] mb-1">
                Link do Portfólio Completo (Site, Behance, etc.)
              </label>
              <input
                type="url"
                value={profile.portfolio_link || ''}
                onChange={(e) => handleUpdateField('portfolio_link', e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-[#07101f] border border-gray-300 dark:border-[rgba(255,255,255,.08)] text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="https://seuportfoliomassa.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[rgba(255,255,255,0.8)] mb-2">
                Fotos de Destaque (Máx. 3 fotos)
              </label>
              <div className="grid grid-cols-3 gap-4">
                {[0, 1, 2].map((idx) => {
                  const fotoUrl = profile.portfolio_fotos?.[idx];
                  const isUploading = uploadingPortfolioIdx === idx;

                  return (
                    <div key={idx} className="relative aspect-video rounded-lg border-2 border-dashed border-gray-300 dark:border-[rgba(255,255,255,0.12)] flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-white/5">
                      {fotoUrl ? (
                        <>
                          <img src={fotoUrl} alt={`Portfólio ${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemovePortfolioImage(idx)}
                            className="absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-700 text-white rounded shadow"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <div className="w-full h-full">
                          <input
                            type="file"
                            id={`portfolio-upload-${idx}`}
                            accept="image/*"
                            onChange={(e) => handleUploadPortfolioImage(e, idx)}
                            className="hidden"
                            disabled={isUploading}
                          />
                          <label
                            htmlFor={`portfolio-upload-${idx}`}
                            className="flex flex-col items-center justify-center w-full h-full p-2 text-center cursor-pointer hover:text-blue-500 transition-colors"
                          >
                            {isUploading ? (
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                            ) : (
                              <>
                                <Upload className="w-5 h-5 text-gray-400 mb-1" />
                                <span className="text-[10px] text-gray-500">Foto {idx + 1}</span>
                              </>
                            )}
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t dark:border-[rgba(255,255,255,0.08)] pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Assinatura e Cobrança</h3>
              <p className="text-sm text-gray-600 dark:text-[rgba(255,255,255,0.6)] flex items-center gap-2">
                Status atual:{' '}
                <span className={`font-medium px-2 py-0.5 rounded text-xs ${
                  profile.status_assinatura === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                  profile.status_assinatura === 'trial' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                  profile.status_assinatura === 'canceled' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                }`}>
                  {profile.status_assinatura === 'active' ? 'Ativa' :
                   profile.status_assinatura === 'trial' ? 'Período de Teste' :
                   profile.status_assinatura === 'canceled' ? 'Cancelada' :
                   profile.status_assinatura === 'past_due' ? 'Pagamento Pendente' :
                   'Expirada'}
                </span>
              </p>
            </div>
            
            <button
              onClick={manageSubscription}
              disabled={subLoading}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-[rgba(255,255,255,0.05)] text-gray-700 dark:text-white border border-gray-200 dark:border-[rgba(255,255,255,0.1)] rounded-lg hover:bg-gray-200 dark:hover:bg-[rgba(255,255,255,0.1)] text-sm font-medium transition-colors disabled:opacity-50"
            >
              <CreditCard className="w-4 h-4" />
              {subLoading ? 'Carregando...' : 'Gerenciar Assinatura'}
            </button>
          </div>
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Salvando...' : 'Salvar Perfil'}
        </button>
      </div>
    </div>
  );
}
