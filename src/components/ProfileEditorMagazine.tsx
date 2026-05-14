import { useState, useEffect } from 'react';
import { supabase, Profile } from '../lib/supabase';
import { Save, Upload, Globe, Check, X, Link as LinkIcon, ExternalLink, Camera, Palette, Mail, Phone, Instagram as InstagramIcon, Star, Award } from 'lucide-react';
import { generateSlug, validateSlugFormat, checkUserSlugAvailability } from '../lib/slugUtils';

interface ProfileEditorMagazineProps {
  userId: string;
}

export function ProfileEditorMagazine({ userId }: ProfileEditorMagazineProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [slugInput, setSlugInput] = useState('');
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('basics');

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

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="relative w-24 h-24">
          <Camera className="w-24 h-24 text-amber-600 animate-pulse" />
        </div>
        <p className="mt-4 text-amber-600 font-serif text-lg italic">Carregando seu perfil...</p>
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
    <div className="max-w-6xl mx-auto">
      <div className="relative mb-12">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-100 via-orange-50 to-rose-100 transform -skew-y-2"></div>
        <div className="relative px-8 py-12">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-1 h-16 bg-amber-600"></div>
                <h1 className="text-6xl font-serif font-bold text-gray-900 italic leading-tight">
                  Seu Portfólio
                </h1>
              </div>
              <p className="text-xl text-gray-600 font-serif ml-4">
                A arte de contar sua história profissional
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-gray-500 uppercase tracking-wider font-sans mb-1">Conclusão</div>
                <div className="text-4xl font-bold text-amber-600">{Math.round(completionPercentage)}%</div>
              </div>
              <div className="w-3 h-24 bg-gradient-to-b from-amber-600 to-orange-600 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-4">
          <div className="sticky top-8 space-y-6">
            <div className="relative bg-white rounded-none shadow-2xl overflow-hidden border-l-8 border-amber-600">
              <div className="aspect-square bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center relative group">
                {profile.profile_image_url ? (
                  <>
                    <img
                      src={profile.profile_image_url}
                      alt="Foto de perfil"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
                      <Camera className="w-16 h-16 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center">
                    <Camera className="w-32 h-32 text-amber-300" />
                    <p className="mt-4 text-gray-400 font-serif italic">Sua foto aqui</p>
                  </div>
                )}
              </div>

              <div className="p-6">
                <label className="flex items-center justify-center gap-2 bg-amber-600 text-white px-6 py-3 hover:bg-amber-700 cursor-pointer font-sans font-semibold uppercase tracking-wider text-sm transition-colors">
                  <Upload className="w-4 h-4" />
                  {uploading ? 'Enviando...' : 'Alterar Imagem'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadImage}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-center text-gray-500 mt-3 font-sans">
                  PNG, JPG ou WEBP · Máximo 5MB
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 shadow-2xl border-l-8 border-amber-600">
              <div className="flex items-center gap-3 mb-4">
                <Award className="w-6 h-6 text-amber-400" />
                <h3 className="text-lg font-serif italic">Métricas</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-gray-400 uppercase tracking-wide font-sans">Visualizações</span>
                  <span className="text-3xl font-bold text-amber-400">{profile.visualizacoes_perfil || 0}</span>
                </div>
                <div className="h-px bg-gray-700"></div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400 uppercase tracking-wide font-sans">Status</span>
                  <span className="px-3 py-1 bg-amber-600 text-white text-xs font-bold uppercase tracking-wider">
                    {profile.status_assinatura === 'trial' ? 'Trial' : 'Ativo'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 shadow-2xl border-l-8 border-rose-500">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-serif italic text-gray-900">Perfil Público</h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.perfil_publico ?? false}
                    onChange={(e) => handleUpdateField('perfil_publico', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-8 bg-gray-300 rounded-full peer peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-rose-600"></div>
                </label>
              </div>
              <p className="text-sm text-gray-600 font-sans mb-4">
                Torne seu trabalho visível para o mundo
              </p>
              {slugInput && (
                <a
                  href={`https://priceus.com.br/${slugInput}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-rose-600 hover:text-rose-800 font-semibold transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  Ver Perfil Público
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8 space-y-8">
          <div className="bg-white shadow-2xl border-l-8 border-emerald-600">
            <button
              onClick={() => toggleSection('basics')}
              className="w-full px-8 py-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <Palette className="w-7 h-7 text-emerald-600" />
                <h2 className="text-3xl font-serif italic text-gray-900">Informações Essenciais</h2>
              </div>
              <div className={`transform transition-transform ${expandedSection === 'basics' ? 'rotate-180' : ''}`}>
                <div className="w-8 h-1 bg-emerald-600"></div>
              </div>
            </button>

            {expandedSection === 'basics' && (
              <div className="px-8 py-6 border-t-2 border-gray-100 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-sans font-bold text-gray-700 mb-2 uppercase tracking-wider">
                      Nome Pessoal
                    </label>
                    <input
                      type="text"
                      value={profile.nome_admin || ''}
                      onChange={(e) => handleUpdateField('nome_admin', e.target.value)}
                      className="w-full px-4 py-3 border-b-2 border-gray-300 focus:border-emerald-600 outline-none transition-colors bg-transparent font-serif text-lg"
                      placeholder="Seu nome"
                    />
                  </div>

                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-sans font-bold text-gray-700 mb-2 uppercase tracking-wider">
                      Nome Artístico
                    </label>
                    <input
                      type="text"
                      value={profile.nome_profissional || ''}
                      onChange={(e) => handleUpdateField('nome_profissional', e.target.value)}
                      className="w-full px-4 py-3 border-b-2 border-gray-300 focus:border-emerald-600 outline-none transition-colors bg-transparent font-serif text-lg"
                      placeholder="Nome profissional"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-sans font-bold text-gray-700 mb-2 uppercase tracking-wider">
                    Especialização
                  </label>
                  <input
                    type="text"
                    value={profile.tipo_fotografia || ''}
                    onChange={(e) => handleUpdateField('tipo_fotografia', e.target.value)}
                    className="w-full px-4 py-3 border-b-2 border-gray-300 focus:border-emerald-600 outline-none transition-colors bg-transparent font-serif text-lg"
                    placeholder="Casamentos, Eventos, Retratos..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-sans font-bold text-gray-700 mb-2 uppercase tracking-wider">
                    Manifesto Criativo
                  </label>
                  <textarea
                    value={profile.apresentacao || ''}
                    onChange={(e) => handleUpdateField('apresentacao', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 focus:border-emerald-600 outline-none transition-colors resize-none font-serif text-lg leading-relaxed"
                    rows={5}
                    placeholder="Conte sua história, sua visão, sua arte..."
                  />
                </div>
              </div>
            )}
          </div>

          <div className="bg-white shadow-2xl border-l-8 border-blue-600">
            <button
              onClick={() => toggleSection('contact')}
              className="w-full px-8 py-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <Phone className="w-7 h-7 text-blue-600" />
                <h2 className="text-3xl font-serif italic text-gray-900">Canais de Contato</h2>
              </div>
              <div className={`transform transition-transform ${expandedSection === 'contact' ? 'rotate-180' : ''}`}>
                <div className="w-8 h-1 bg-blue-600"></div>
              </div>
            </button>

            {expandedSection === 'contact' && (
              <div className="px-8 py-6 border-t-2 border-gray-100 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-sans font-bold text-gray-700 mb-2 uppercase tracking-wider">
                      WhatsApp
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-0 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-600" />
                      <input
                        type="tel"
                        value={profile.whatsapp_principal || ''}
                        onChange={(e) => handleUpdateField('whatsapp_principal', e.target.value)}
                        className="w-full pl-8 pr-4 py-3 border-b-2 border-gray-300 focus:border-blue-600 outline-none transition-colors bg-transparent font-mono"
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                  </div>

                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-sans font-bold text-gray-700 mb-2 uppercase tracking-wider">
                      E-mail
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-0 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-600" />
                      <input
                        type="email"
                        value={profile.email_recebimento || ''}
                        onChange={(e) => handleUpdateField('email_recebimento', e.target.value)}
                        className="w-full pl-8 pr-4 py-3 border-b-2 border-gray-300 focus:border-blue-600 outline-none transition-colors bg-transparent font-mono"
                        placeholder="seu@email.com"
                      />
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-sans font-bold text-gray-700 mb-2 uppercase tracking-wider">
                      Instagram
                    </label>
                    <div className="relative">
                      <InstagramIcon className="absolute left-0 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-600" />
                      <input
                        type="text"
                        value={profile.instagram || ''}
                        onChange={(e) => handleUpdateField('instagram', e.target.value)}
                        className="w-full pl-8 pr-4 py-3 border-b-2 border-gray-300 focus:border-blue-600 outline-none transition-colors bg-transparent font-mono"
                        placeholder="@seu_instagram"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white shadow-2xl border-l-8 border-amber-600">
            <button
              onClick={() => toggleSection('web')}
              className="w-full px-8 py-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <Globe className="w-7 h-7 text-amber-600" />
                <h2 className="text-3xl font-serif italic text-gray-900">Presença Digital</h2>
              </div>
              <div className={`transform transition-transform ${expandedSection === 'web' ? 'rotate-180' : ''}`}>
                <div className="w-8 h-1 bg-amber-600"></div>
              </div>
            </button>

            {expandedSection === 'web' && (
              <div className="px-8 py-6 border-t-2 border-gray-100 space-y-6">
                <div>
                  <label className="block text-sm font-sans font-bold text-gray-700 mb-2 uppercase tracking-wider">
                    Username Público
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={slugInput}
                        onChange={(e) => handleSlugChange(e.target.value)}
                        className="w-full px-4 py-3 border-b-2 border-gray-300 focus:border-amber-600 outline-none transition-colors bg-transparent font-mono pr-10"
                        placeholder="seu-username"
                        minLength={3}
                        maxLength={50}
                      />
                      {checkingSlug && (
                        <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-600"></div>
                        </div>
                      )}
                      {!checkingSlug && slugInput.length >= 3 && slugAvailable !== null && (
                        <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
                          {slugAvailable ? (
                            <Check className="w-6 h-6 text-green-600" />
                          ) : (
                            <X className="w-6 h-6 text-red-600" />
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateSlug}
                      className="px-5 py-3 bg-amber-600 text-white hover:bg-amber-700 font-sans font-semibold uppercase tracking-wider text-sm transition-colors"
                    >
                      Gerar
                    </button>
                  </div>
                  {slugInput && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                      <LinkIcon className="w-4 h-4" />
                      <code className="font-mono text-amber-800 font-semibold">priceus.com.br/{slugInput}</code>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-sans font-bold text-gray-700 mb-2 uppercase tracking-wider">
                    Descrição SEO
                  </label>
                  <textarea
                    value={profile.meta_description || ''}
                    onChange={(e) => handleUpdateField('meta_description', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 focus:border-amber-600 outline-none transition-colors resize-none font-sans text-sm"
                    rows={3}
                    maxLength={160}
                    placeholder="Como seu trabalho aparecerá nos resultados do Google..."
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-500 italic">Otimização para buscadores</span>
                    <span className="text-xs font-bold text-amber-700 font-mono">
                      {(profile.meta_description || '').length}/160
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-4 border-t-2 border-gray-100">
                  <div>
                    <p className="font-sans font-bold text-gray-900">Botão de Perfil nos Orçamentos</p>
                    <p className="text-sm text-gray-600">Exibir link para seu portfólio</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile.exibir_botao_perfil_completo ?? true}
                      onChange={(e) => handleUpdateField('exibir_botao_perfil_completo', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-8 bg-gray-300 rounded-full peer peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white shadow-2xl border-l-8 border-rose-600">
            <button
              onClick={() => toggleSection('reviews')}
              className="w-full px-8 py-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <Star className="w-7 h-7 text-rose-600" />
                <h2 className="text-3xl font-serif italic text-gray-900">Sistema de Avaliações</h2>
              </div>
              <div className={`transform transition-transform ${expandedSection === 'reviews' ? 'rotate-180' : ''}`}>
                <div className="w-8 h-1 bg-rose-600"></div>
              </div>
            </button>

            {expandedSection === 'reviews' && (
              <div className="px-8 py-6 border-t-2 border-gray-100 space-y-5">
                <div className="flex items-center justify-between py-4 border-b border-gray-200">
                  <div>
                    <p className="font-sans font-bold text-gray-900">Receber Avaliações</p>
                    <p className="text-sm text-gray-600">Permitir feedback dos clientes</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile.aceita_avaliacoes ?? true}
                      onChange={(e) => handleUpdateField('aceita_avaliacoes', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-8 bg-gray-300 rounded-full peer peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-rose-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between py-4 border-b border-gray-200">
                  <div>
                    <p className="font-sans font-bold text-gray-900">Aprovação Automática</p>
                    <p className="text-sm text-gray-600">Publicar sem moderação</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile.aprovacao_automatica_avaliacoes ?? false}
                      onChange={(e) => handleUpdateField('aprovacao_automatica_avaliacoes', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-8 bg-gray-300 rounded-full peer peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-rose-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between py-4 border-b border-gray-200">
                  <div>
                    <p className="font-sans font-bold text-gray-900">Exibição Pública</p>
                    <p className="text-sm text-gray-600">Mostrar nas páginas de orçamento</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile.exibir_avaliacoes_publico ?? true}
                      onChange={(e) => handleUpdateField('exibir_avaliacoes_publico', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-8 bg-gray-300 rounded-full peer peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-rose-600"></div>
                  </label>
                </div>

                <div className="pt-2">
                  <label className="block text-sm font-sans font-bold text-gray-700 mb-2 uppercase tracking-wider">
                    Rating Mínimo para Exibir
                  </label>
                  <select
                    value={profile.rating_minimo_exibicao ?? 1}
                    onChange={(e) => handleUpdateField('rating_minimo_exibicao', parseInt(e.target.value))}
                    className="w-full px-4 py-3 border-2 border-gray-300 focus:border-rose-600 outline-none transition-colors bg-white font-sans"
                  >
                    <option value={1}>⭐ Uma estrela ou mais</option>
                    <option value={2}>⭐⭐ Duas estrelas ou mais</option>
                    <option value={3}>⭐⭐⭐ Três estrelas ou mais</option>
                    <option value={4}>⭐⭐⭐⭐ Quatro estrelas ou mais</option>
                    <option value={5}>⭐⭐⭐⭐⭐ Apenas cinco estrelas</option>
                  </select>
                </div>

                <div className="pt-4 border-t-2 border-gray-100">
                  <div className="flex items-center gap-3 mb-4">
                    <input
                      type="checkbox"
                      checked={profile.incentivo_avaliacao_ativo ?? false}
                      onChange={(e) => handleUpdateField('incentivo_avaliacao_ativo', e.target.checked)}
                      className="w-5 h-5 rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                    />
                    <label className="font-sans font-bold text-gray-900">
                      Ativar Programa de Incentivo
                    </label>
                  </div>
                  {profile.incentivo_avaliacao_ativo && (
                    <textarea
                      value={profile.incentivo_avaliacao_texto || ''}
                      onChange={(e) => handleUpdateField('incentivo_avaliacao_texto', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 focus:border-rose-600 outline-none transition-colors resize-none font-sans text-sm"
                      rows={2}
                      placeholder="Ofereça um benefício aos clientes que avaliarem..."
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="sticky bottom-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-6 shadow-2xl border-t-4 border-amber-600">
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="w-full flex items-center justify-center gap-3 bg-amber-600 text-white px-8 py-4 hover:bg-amber-700 font-sans font-bold uppercase tracking-widest text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
            >
              <Save className="w-6 h-6" />
              {saving ? 'Salvando Suas Informações...' : 'Salvar Perfil'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
