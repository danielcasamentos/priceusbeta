import { useState, useEffect } from 'react';
import { supabase, Profile } from '../lib/supabase';
import { Save, Upload, User, Globe, Eye, Check, X, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { generateSlug, validateSlugFormat, checkUserSlugAvailability } from '../lib/slugUtils';

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
        setProfile(data);
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
          status_assinatura: 'trial',
          data_expiracao_trial: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
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

  const handleUploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('❌ Arquivo muito grande! Máximo: 5MB');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

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
    } finally {
      setUploading(false);
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
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Status da Assinatura</h3>
              <p className="text-sm text-gray-600 dark:text-[rgba(255,255,255,0.6)]">
                Plano atual:{' '}
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  {profile.status_assinatura === 'trial' ? 'Período de Teste' : 'Ativo'}
                </span>
              </p>
            </div>
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
