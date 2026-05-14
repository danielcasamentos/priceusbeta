import { useState, useEffect } from 'react';
import { supabase, Profile } from '../lib/supabase';
import { Save, Upload, User, Globe, Eye, Check, X, Link as LinkIcon, ExternalLink, Mail, Phone, Instagram as InstagramIcon } from 'lucide-react';
import { generateSlug, validateSlugFormat, checkUserSlugAvailability } from '../lib/slugUtils';

interface ProfileEditorMinimalistProps {
  userId: string;
}

export function ProfileEditorMinimalist({ userId }: ProfileEditorMinimalistProps) {
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!profile) {
    return <div>Erro ao carregar perfil</div>;
  }

  const completionPercentage = [
    profile.nome_profissional,
    profile.tipo_fotografia,
    profile.whatsapp_principal,
    profile.profile_image_url,
    profile.apresentacao,
    slugInput,
  ].filter(Boolean).length * (100 / 6);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light text-slate-900 tracking-tight">Perfil Profissional</h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie suas informações pessoais e configurações</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-500 mb-1">Perfil completo</div>
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-900 transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
            <span className="text-sm font-medium text-slate-900">{Math.round(completionPercentage)}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <aside className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="flex flex-col items-center">
              {profile.profile_image_url ? (
                <img
                  src={profile.profile_image_url}
                  alt="Foto de perfil"
                  className="w-32 h-32 rounded-full object-cover border-2 border-slate-900"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-slate-100 flex items-center justify-center border-2 border-slate-200">
                  <User className="w-16 h-16 text-slate-400" />
                </div>
              )}

              <label className="mt-4 flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800 cursor-pointer text-sm font-medium transition-colors">
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
              <p className="text-xs text-slate-500 text-center mt-2">
                PNG, JPG ou WEBP · Máximo 5MB
              </p>
            </div>

            {profile.visualizacoes_perfil !== undefined && (
              <div className="mt-6 pt-6 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Eye className="w-4 h-4" />
                    <span className="text-sm">Visualizações</span>
                  </div>
                  <span className="text-lg font-semibold text-slate-900">
                    {profile.visualizacoes_perfil || 0}
                  </span>
                </div>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Perfil Público</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.perfil_publico ?? false}
                    onChange={(e) => handleUpdateField('perfil_publico', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                </label>
              </div>
              <p className="text-xs text-slate-500">Torne seu perfil visível publicamente</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">Links Rápidos</h3>
            <div className="space-y-3">
              {slugInput && (
                <a
                  href={`https://priceus.com.br/${slugInput}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  Ver Perfil Público
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {profile.instagram && (
                <a
                  href={`https://instagram.com/${profile.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <InstagramIcon className="w-4 h-4" />
                  Instagram
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </aside>

        <main className="lg:col-span-2 space-y-6">
          <section className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Informações Básicas</h2>
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nome do Admin
                  </label>
                  <input
                    type="text"
                    value={profile.nome_admin || ''}
                    onChange={(e) => handleUpdateField('nome_admin', e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow"
                    placeholder="Seu nome"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nome Profissional
                  </label>
                  <input
                    type="text"
                    value={profile.nome_profissional || ''}
                    onChange={(e) => handleUpdateField('nome_profissional', e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow"
                    placeholder="Nome nos orçamentos"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tipo de Fotografia
                </label>
                <input
                  type="text"
                  value={profile.tipo_fotografia || ''}
                  onChange={(e) => handleUpdateField('tipo_fotografia', e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow"
                  placeholder="Ex: Casamentos, Eventos, Ensaios"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Apresentação
                </label>
                <textarea
                  value={profile.apresentacao || ''}
                  onChange={(e) => handleUpdateField('apresentacao', e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow resize-none"
                  rows={4}
                  placeholder="Conte um pouco sobre você e seu trabalho..."
                />
              </div>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Contato</h2>
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      value={profile.whatsapp_principal || ''}
                      onChange={(e) => handleUpdateField('whatsapp_principal', e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow"
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={profile.email_recebimento || ''}
                      onChange={(e) => handleUpdateField('email_recebimento', e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow"
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Instagram
                </label>
                <div className="relative">
                  <InstagramIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={profile.instagram || ''}
                    onChange={(e) => handleUpdateField('instagram', e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow"
                    placeholder="seu_instagram"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">URL Pública & SEO</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Username (URL Pública)
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={slugInput}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow pr-10"
                      placeholder="seu-username"
                      minLength={3}
                      maxLength={50}
                    />
                    {checkingSlug && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-900"></div>
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
                    className="px-4 py-2.5 bg-slate-900 text-white rounded-md hover:bg-slate-800 text-sm font-medium whitespace-nowrap transition-colors"
                  >
                    Gerar
                  </button>
                </div>
                {slugInput && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                    <LinkIcon className="w-3.5 h-3.5" />
                    <code className="text-slate-900 font-mono">priceus.com.br/{slugInput}</code>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Meta Description (SEO)
                </label>
                <textarea
                  value={profile.meta_description || ''}
                  onChange={(e) => handleUpdateField('meta_description', e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow resize-none"
                  rows={2}
                  maxLength={160}
                  placeholder="Descrição para buscadores (máx. 160 caracteres)"
                />
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-slate-500">
                    Otimização para Google e outros buscadores
                  </p>
                  <span className="text-xs text-slate-500">
                    {(profile.meta_description || '').length}/160
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <div>
                  <p className="text-sm font-medium text-slate-900">Botão "Ver Perfil Completo"</p>
                  <p className="text-xs text-slate-500">Mostrar nos orçamentos</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.exibir_botao_perfil_completo ?? true}
                    onChange={(e) => handleUpdateField('exibir_botao_perfil_completo', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                </label>
              </div>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Configurações de Avaliações</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-slate-200">
                <div>
                  <p className="text-sm font-medium text-slate-900">Aceitar Avaliações</p>
                  <p className="text-xs text-slate-500">Permitir que clientes avaliem seu trabalho</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.aceita_avaliacoes ?? true}
                    onChange={(e) => handleUpdateField('aceita_avaliacoes', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-slate-200">
                <div>
                  <p className="text-sm font-medium text-slate-900">Aprovação Automática</p>
                  <p className="text-xs text-slate-500">Aprovar sem revisão manual</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.aprovacao_automatica_avaliacoes ?? false}
                    onChange={(e) => handleUpdateField('aprovacao_automatica_avaliacoes', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-slate-200">
                <div>
                  <p className="text-sm font-medium text-slate-900">Exibir Publicamente</p>
                  <p className="text-xs text-slate-500">Mostrar na página de orçamento</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.exibir_avaliacoes_publico ?? true}
                    onChange={(e) => handleUpdateField('exibir_avaliacoes_publico', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                </label>
              </div>

              <div className="pt-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Rating Mínimo para Exibição
                </label>
                <select
                  value={profile.rating_minimo_exibicao ?? 1}
                  onChange={(e) => handleUpdateField('rating_minimo_exibicao', parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow"
                >
                  <option value={1}>1 estrela ou mais</option>
                  <option value={2}>2 estrelas ou mais</option>
                  <option value={3}>3 estrelas ou mais</option>
                  <option value={4}>4 estrelas ou mais</option>
                  <option value={5}>Apenas 5 estrelas</option>
                </select>
              </div>

              <div className="pt-2">
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    checked={profile.incentivo_avaliacao_ativo ?? false}
                    onChange={(e) => handleUpdateField('incentivo_avaliacao_ativo', e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <label className="text-sm font-medium text-slate-900">
                    Ativar Incentivo para Avaliações
                  </label>
                </div>
                {profile.incentivo_avaliacao_ativo && (
                  <textarea
                    value={profile.incentivo_avaliacao_texto || ''}
                    onChange={(e) => handleUpdateField('incentivo_avaliacao_texto', e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow resize-none"
                    rows={2}
                    placeholder="Ex: Ganhe 10% de desconto ao avaliar!"
                  />
                )}
              </div>
            </div>
          </section>

          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-md hover:bg-slate-800 font-medium transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Salvando...' : 'Salvar Perfil'}
          </button>
        </main>
      </div>
    </div>
  );
}
