import { useState, useEffect } from 'react';
import { supabase, Profile } from '../lib/supabase';
import { Save, Upload, User, Globe, Eye, Check, X, Link as LinkIcon, ExternalLink, Star, Sparkles, Award, Zap } from 'lucide-react';
import { generateSlug, validateSlugFormat, checkUserSlugAvailability } from '../lib/slugUtils';

interface ProfileEditorModernProps {
  userId: string;
}

export function ProfileEditorModern({ userId }: ProfileEditorModernProps) {
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
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-cyan-500"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <Sparkles className="w-6 h-6 text-cyan-500 animate-pulse" />
          </div>
        </div>
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
    <div className="space-y-6">
      <div className="relative overflow-hidden bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 rounded-3xl p-8 shadow-2xl">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white opacity-10 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                <Sparkles className="w-8 h-8" />
                Meu Perfil
              </h1>
              <p className="text-cyan-100 text-lg">Configure sua presença profissional</p>
            </div>
            <div className="flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-4">
              <Award className="w-8 h-8 text-yellow-300" />
              <div>
                <div className="text-white text-sm font-medium">Perfil Completo</div>
                <div className="text-2xl font-bold text-white">{Math.round(completionPercentage)}%</div>
              </div>
            </div>
          </div>

          <div className="bg-white/20 backdrop-blur-sm rounded-2xl h-4 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-300 via-orange-400 to-pink-500 transition-all duration-700 ease-out"
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gradient-to-br from-orange-50 to-pink-50 rounded-3xl p-6 shadow-xl border-2 border-orange-200">
            <div className="flex flex-col items-center">
              <div className="relative group">
                {profile.profile_image_url ? (
                  <img
                    src={profile.profile_image_url}
                    alt="Foto de perfil"
                    className="w-36 h-36 rounded-full object-cover ring-4 ring-white shadow-xl"
                  />
                ) : (
                  <div className="w-36 h-36 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center ring-4 ring-white shadow-xl">
                    <User className="w-20 h-20 text-white" />
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
              </div>

              <label className="mt-6 flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-3 rounded-full hover:from-cyan-600 hover:to-blue-600 cursor-pointer text-sm font-bold transition-all transform hover:scale-105 shadow-lg">
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
              <p className="text-xs text-gray-600 text-center mt-3">
                PNG, JPG ou WEBP · Max 5MB
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-3xl p-6 shadow-xl border-2 border-green-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-teal-500 rounded-xl flex items-center justify-center">
                <Eye className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Estatísticas</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Visualizações</span>
                <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
                  {profile.visualizacoes_perfil || 0}
                </span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-green-200">
                <span className="text-sm text-gray-600">Status</span>
                <span className="px-3 py-1 bg-gradient-to-r from-green-400 to-teal-400 text-white text-xs font-bold rounded-full">
                  {profile.status_assinatura === 'trial' ? 'Trial' : 'Ativo'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl p-6 shadow-xl border-2 border-purple-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Visibilidade</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Perfil Público</p>
                  <p className="text-xs text-gray-600">Visível para todos</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.perfil_publico ?? false}
                    onChange={(e) => handleUpdateField('perfil_publico', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-8 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-pink-500"></div>
                </label>
              </div>
              {slugInput && (
                <a
                  href={`https://priceus.com.br/${slugInput}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-800 font-medium transition-colors"
                >
                  Ver Perfil <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-3xl p-8 shadow-xl border-2 border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-2xl flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Informações Básicas</h2>
            </div>
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                    Nome do Admin
                  </label>
                  <input
                    type="text"
                    value={profile.nome_admin || ''}
                    onChange={(e) => handleUpdateField('nome_admin', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-cyan-200 focus:border-cyan-500 transition-all"
                    placeholder="Seu nome"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                    Nome Profissional
                  </label>
                  <input
                    type="text"
                    value={profile.nome_profissional || ''}
                    onChange={(e) => handleUpdateField('nome_profissional', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-cyan-200 focus:border-cyan-500 transition-all"
                    placeholder="Nome nos orçamentos"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  Tipo de Fotografia
                </label>
                <input
                  type="text"
                  value={profile.tipo_fotografia || ''}
                  onChange={(e) => handleUpdateField('tipo_fotografia', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-cyan-200 focus:border-cyan-500 transition-all"
                  placeholder="Ex: Casamentos, Eventos, Ensaios"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  Apresentação
                </label>
                <textarea
                  value={profile.apresentacao || ''}
                  onChange={(e) => handleUpdateField('apresentacao', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-cyan-200 focus:border-cyan-500 transition-all resize-none"
                  rows={4}
                  placeholder="Conte sobre você e seu trabalho..."
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-xl border-2 border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Contato</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  WhatsApp
                </label>
                <input
                  type="tel"
                  value={profile.whatsapp_principal || ''}
                  onChange={(e) => handleUpdateField('whatsapp_principal', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all"
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  E-mail
                </label>
                <input
                  type="email"
                  value={profile.email_recebimento || ''}
                  onChange={(e) => handleUpdateField('email_recebimento', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all"
                  placeholder="seu@email.com"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  Instagram
                </label>
                <input
                  type="text"
                  value={profile.instagram || ''}
                  onChange={(e) => handleUpdateField('instagram', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all"
                  placeholder="seu_instagram"
                />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-3xl p-8 shadow-xl border-2 border-yellow-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center">
                <LinkIcon className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">URL & SEO</h2>
            </div>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  Username
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={slugInput}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-yellow-200 rounded-xl focus:ring-4 focus:ring-yellow-200 focus:border-yellow-500 transition-all pr-10 bg-white"
                      placeholder="seu-username"
                      minLength={3}
                      maxLength={50}
                    />
                    {checkingSlug && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-500"></div>
                      </div>
                    )}
                    {!checkingSlug && slugInput.length >= 3 && slugAvailable !== null && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {slugAvailable ? (
                          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                            <X className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateSlug}
                    className="px-5 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl hover:from-yellow-500 hover:to-orange-600 font-bold whitespace-nowrap transition-all transform hover:scale-105 shadow-lg"
                  >
                    Gerar
                  </button>
                </div>
                {slugInput && (
                  <div className="mt-3 p-3 bg-white rounded-lg border-2 border-yellow-200">
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="w-4 h-4 text-yellow-600" />
                      <code className="font-mono text-yellow-800 font-semibold">priceus.com.br/{slugInput}</code>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  Meta Description
                </label>
                <textarea
                  value={profile.meta_description || ''}
                  onChange={(e) => handleUpdateField('meta_description', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-yellow-200 rounded-xl focus:ring-4 focus:ring-yellow-200 focus:border-yellow-500 transition-all resize-none bg-white"
                  rows={2}
                  maxLength={160}
                  placeholder="Descrição para Google (máx. 160 caracteres)"
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-600">Para buscadores</span>
                  <span className="text-xs font-bold text-yellow-700">
                    {(profile.meta_description || '').length}/160
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-white rounded-xl border-2 border-yellow-200">
                <div>
                  <p className="text-sm font-bold text-gray-800">Botão "Ver Perfil"</p>
                  <p className="text-xs text-gray-600">Exibir nos orçamentos</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.exibir_botao_perfil_completo ?? true}
                    onChange={(e) => handleUpdateField('exibir_botao_perfil_completo', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-8 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-yellow-400 peer-checked:to-orange-500"></div>
                </label>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-xl border-2 border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-rose-500 rounded-2xl flex items-center justify-center">
                <Star className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Avaliações</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl border-2 border-pink-200">
                <div>
                  <p className="text-sm font-bold text-gray-800">Aceitar Avaliações</p>
                  <p className="text-xs text-gray-600">Clientes podem avaliar</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.aceita_avaliacoes ?? true}
                    onChange={(e) => handleUpdateField('aceita_avaliacoes', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-8 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-pink-500 peer-checked:to-rose-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200">
                <div>
                  <p className="text-sm font-bold text-gray-800">Aprovação Automática</p>
                  <p className="text-xs text-gray-600">Sem revisão manual</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.aprovacao_automatica_avaliacoes ?? false}
                    onChange={(e) => handleUpdateField('aprovacao_automatica_avaliacoes', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-8 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-cyan-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                <div>
                  <p className="text-sm font-bold text-gray-800">Exibir Publicamente</p>
                  <p className="text-xs text-gray-600">Mostrar nos orçamentos</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.exibir_avaliacoes_publico ?? true}
                    onChange={(e) => handleUpdateField('exibir_avaliacoes_publico', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-8 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-green-500 peer-checked:to-emerald-500"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  Rating Mínimo
                </label>
                <select
                  value={profile.rating_minimo_exibicao ?? 1}
                  onChange={(e) => handleUpdateField('rating_minimo_exibicao', parseInt(e.target.value))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-pink-200 focus:border-pink-500 transition-all bg-white font-medium"
                >
                  <option value={1}>⭐ 1+ estrelas</option>
                  <option value={2}>⭐⭐ 2+ estrelas</option>
                  <option value={3}>⭐⭐⭐ 3+ estrelas</option>
                  <option value={4}>⭐⭐⭐⭐ 4+ estrelas</option>
                  <option value={5}>⭐⭐⭐⭐⭐ Apenas 5 estrelas</option>
                </select>
              </div>

              <div className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl border-2 border-yellow-200">
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    checked={profile.incentivo_avaliacao_ativo ?? false}
                    onChange={(e) => handleUpdateField('incentivo_avaliacao_ativo', e.target.checked)}
                    className="w-5 h-5 rounded border-yellow-300 text-yellow-500 focus:ring-yellow-400"
                  />
                  <label className="text-sm font-bold text-gray-800">
                    Incentivo para Avaliações
                  </label>
                </div>
                {profile.incentivo_avaliacao_ativo && (
                  <textarea
                    value={profile.incentivo_avaliacao_texto || ''}
                    onChange={(e) => handleUpdateField('incentivo_avaliacao_texto', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-yellow-200 rounded-xl focus:ring-4 focus:ring-yellow-200 focus:border-yellow-500 transition-all resize-none bg-white"
                    rows={2}
                    placeholder="Ex: Ganhe 10% de desconto ao avaliar!"
                  />
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 text-white px-8 py-4 rounded-2xl hover:from-cyan-600 hover:via-blue-600 hover:to-purple-700 font-bold text-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-2xl"
          >
            <Save className="w-6 h-6" />
            {saving ? 'Salvando Perfil...' : 'Salvar Perfil'}
            <Sparkles className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
