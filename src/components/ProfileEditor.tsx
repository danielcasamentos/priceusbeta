import { useState, useEffect } from 'react';
import { supabase, Profile } from '../lib/supabase';
import { Save, Upload, User, Globe, Eye, Check, X, Link as LinkIcon, ExternalLink, CreditCard, Trash2 } from 'lucide-react';
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showSqlFallback, setShowSqlFallback] = useState(false);

  useEffect(() => {
    // Verificar se há erros de redirecionamento de OAuth na URL
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const errorCode = params.get('error_code');
    const errorDescription = params.get('error_description');

    if (error || errorCode) {
      console.warn('Erro de autenticação recebido na URL:', { error, errorCode, errorDescription });
      if (errorCode === 'identity_already_exists' || errorDescription?.includes('already linked')) {
        alert(
          'Erro de Vínculo: Esta conta do Google (Gmail) já está vinculada a outro usuário no sistema.\n\n' +
          'Para resolver:\n' +
          '1. Acesse o painel do seu Supabase -> Authentication -> Users.\n' +
          '2. Procure pela conta com o seu Gmail e clique em "Delete User" para excluí-la.\n' +
          '3. Volte aqui e tente vincular a conta do Google novamente.'
        );
      } else {
        alert(`Erro ao vincular: ${errorDescription || errorCode || error}`);
      }
      
      // Limpa os parâmetros da URL para evitar alertas duplicados
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    loadProfile();

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        loadProfile();
      }
    };
    
    document.addEventListener('visibilitychange', handleFocus);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleFocus);
      window.removeEventListener('focus', handleFocus);
    };
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

      const profileData: any = {
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
        updated_at: new Date().toISOString(),
      };

      // Apenas insere google_auth_data no insert inicial (se for novo perfil)
      // para evitar sobrescrever tokens salvos de forma assíncrona por outras abas
      if (!existingProfile) {
        profileData.google_auth_data = profile.google_auth_data || null;
      }

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
      // 1. Procurar se já existe identidade Google vinculada a este usuário no Auth.
      // Se existir, tentamos desvincular primeiro para garantir um vínculo limpo.
      const { data: identitiesData, error: identitiesError } = await supabase.auth.getUserIdentities();
      if (!identitiesError && identitiesData?.identities) {
        const googleIdentity = identitiesData.identities.find(
          (identity: any) => identity.provider === 'google'
        );
        if (googleIdentity) {
          console.log('🔄 Removendo identidade Google existente para este usuário...');
          const { error: unlinkError } = await supabase.auth.unlinkIdentity(googleIdentity);
          if (unlinkError) {
            console.warn('⚠️ Não foi possível desvincular identidade Google existente:', unlinkError);
          }
        }
      }

      // 2. Chamar o linkIdentity novamente para gerar novos tokens
      const { data, error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          scopes: 'https://www.googleapis.com/auth/calendar',
          skipBrowserRedirect: true
        }
      });

      if (error) {
        // Se ainda der erro de já vinculada (provavelmente a outro usuário), tentamos fallback ou alertamos
        if (error.message?.includes('identity_already_exists') || error.code === 'identity_already_exists') {
          console.log('⚠️ Identidade Google já existe. Tentando login direto para capturar tokens...');
          const { error: signInError } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: `${window.location.origin}/dashboard`,
              queryParams: {
                access_type: 'offline',
                prompt: 'consent',
              },
              scopes: 'https://www.googleapis.com/auth/calendar',
            }
          });
          if (signInError) throw signInError;
          return;
        }
        throw error;
      }

      if (data?.url) {
        window.location.href = data.url;
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
      // 1. Procurar e desvincular do Supabase Auth
      const { data: identitiesData, error: identitiesError } = await supabase.auth.getUserIdentities();
      if (!identitiesError && identitiesData?.identities) {
        const googleIdentity = identitiesData.identities.find(
          (identity: any) => identity.provider === 'google'
        );
        if (googleIdentity) {
          const { error: unlinkError } = await supabase.auth.unlinkIdentity(googleIdentity);
          if (unlinkError) {
            console.warn('⚠️ Não foi possível remover a identidade do Supabase Auth:', unlinkError);
          } else {
            console.log('✅ Identidade Google removida do Supabase Auth.');
          }
        }
      }

      // 2. Limpar google_auth_data da tabela profiles
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

  const handleDeleteAccount = async () => {
    if (deleteConfirmation.trim().toUpperCase() !== 'EXCLUIR') {
      alert('Por favor, digite EXCLUIR para confirmar.');
      return;
    }

    setDeletingAccount(true);
    try {
      const { error } = await supabase.rpc('delete_user');
      
      if (error) {
        if (error.code === 'PGRST501' || error.message?.includes('function') || error.message?.includes('does not exist')) {
          if (import.meta.env.DEV) {
            setShowSqlFallback(true);
          } else {
            alert('Não foi possível excluir a conta automaticamente. Por favor, entre em contato com o suporte técnico.');
          }
          setDeletingAccount(false);
          return;
        }
        throw error;
      }

      await supabase.auth.signOut();
      alert('Sua conta e todos os dados vinculados foram permanentemente excluídos.');
      window.location.href = '/';
    } catch (err: any) {
      console.error('Erro ao excluir conta:', err);
      alert(`Erro ao excluir conta: ${err.message || err}`);
      setDeletingAccount(false);
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

            <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-xs text-blue-800 dark:text-blue-200 border border-blue-100 dark:border-blue-900/30 flex flex-col gap-1.5">
              <span className="font-bold flex items-center gap-1">
                ⚠️ Dica para erros de vínculo:
              </span>
              <p className="leading-relaxed">
                Se você receber um erro como <strong>"Identity is already linked"</strong>, significa que o seu Gmail já possui uma conta criada separadamente no sistema (provavelmente porque você clicou no botão "Entrar com Google" no passado).
              </p>
              <p className="leading-relaxed">
                <strong>Como resolver:</strong> Saia da conta atual, faça login clicando em "Entrar com Google" com seu Gmail, vá até o final da página de Perfil e exclua essa conta vazia. Depois, faça login de volta na sua conta principal ({profile.email_recebimento || 'iCloud'}) e faça o vínculo novamente por aqui.
              </p>
            </div>
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Portfólio no Orçamento e Perfil Público
          </h3>
          
          <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800/40 space-y-3">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-xl bg-blue-600 text-white flex-shrink-0 mt-0.5 shadow-md">
                <Globe className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  Portfólio Automático com Galerias de Entregas Reais
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  As fotos de portfólio no seu perfil público agora são integradas diretamente ao seu <strong>Módulo de Entregas</strong>! Basta marcar a chave <em>"Exibir no Portfólio Público"</em> em qualquer galeria para ela aparecer automaticamente no seu perfil com foto de capa e link completo.
                </p>
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
        <div className="border-t border-red-200/50 dark:border-red-900/30 pt-6">
          <div className="p-4 rounded-xl border border-red-200 dark:border-red-950/30 bg-red-50/50 dark:bg-red-950/10">
            <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-1 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Zona de Perigo
            </h3>
            <p className="text-sm text-red-650/80 dark:text-red-400/70 mb-4">
              Exclua permanentemente sua conta e todos os dados do sistema. Esta ação não poderá ser desfeita.
            </p>
            
            {showDeleteModal ? (
              <div className="flex flex-col gap-3 max-w-md">
                <p className="text-xs font-semibold text-red-800 dark:text-red-300">
                  Para confirmar a exclusão permanente, digite EXCLUIR no campo abaixo:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="Digite EXCLUIR"
                    className="flex-1 px-3 py-1.5 bg-white dark:bg-[#07101f] border border-red-300 dark:border-red-900 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deletingAccount || deleteConfirmation.trim().toUpperCase() !== 'EXCLUIR'}
                    className="px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5"
                  >
                    {deletingAccount ? 'Excluindo...' : 'Confirmar Exclusão'}
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeleteConfirmation('');
                    }}
                    className="px-3 py-1.5 bg-gray-200 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/10 text-gray-700 dark:text-white rounded-lg text-sm font-semibold transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-950/20 dark:hover:bg-red-950/30 text-red-750 dark:text-red-450 rounded-lg text-sm font-semibold transition-colors"
              >
                Excluir Minha Conta
              </button>
            )}
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

      {showSqlFallback && import.meta.env.DEV && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0a1628] rounded-2xl shadow-2xl w-full max-w-lg p-6 border dark:border-[rgba(255,255,255,0.06)] flex flex-col gap-4">
            <h4 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              Habilitar Função de Exclusão
            </h4>
            <p className="text-sm text-gray-650 dark:text-gray-400 leading-relaxed">
              Como administrador deste projeto no Supabase, você precisa criar uma função SQL segura com privilégios de superusuário (SECURITY DEFINER) para permitir a exclusão do usuário a partir do cliente web:
            </p>
            <div className="relative bg-gray-900 text-green-400 p-3 rounded-lg text-xs font-mono select-all overflow-x-auto whitespace-pre border border-gray-800">
{`CREATE OR REPLACE FUNCTION delete_user()
RETURNS void AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`}
            </div>
            <p className="text-xs text-yellow-750 dark:text-yellow-450 bg-yellow-50 dark:bg-yellow-950/20 p-2.5 rounded-lg border border-yellow-250 dark:border-yellow-900/30 leading-relaxed">
              💡 <strong>Como aplicar:</strong> Vá no seu painel da <strong>Supabase -&gt; SQL Editor -&gt; New Query</strong>, cole o código acima e clique em <strong>Run</strong>. Depois disso, clique novamente no botão de exclusão e tudo funcionará de imediato.
            </p>
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setShowSqlFallback(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-800 dark:text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
