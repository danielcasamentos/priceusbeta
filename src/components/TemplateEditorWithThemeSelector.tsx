import { useState, useEffect } from 'react';
import { Palette, Sparkles, Check, ExternalLink, Eye, Moon, Leaf, Image, Flame, BookOpen, Upload, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ImageUploadService, UploadProgress } from '../services/imageUploadService';
import { ImageWithFallback } from './ImageWithFallback';

interface TemplateEditorWithThemeSelectorProps {
  templateId: string;
  onThemeChange?: (theme: QuoteTheme) => void;
}

export type QuoteTheme = 'moderno' | 'classico' | 'romantico' | 'vibrante' | 'natural' | 'minimalista' | 'darkstudio' | 'promocional' | 'oferta' | 'pdf-elegante';

export function TemplateEditorWithThemeSelector({ templateId, onThemeChange }: TemplateEditorWithThemeSelectorProps) {
  const [selectedTheme, setSelectedTheme] = useState<QuoteTheme>('moderno');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [templateSlug, setTemplateSlug] = useState<string | null>(null);
  const [userSlug, setUserSlug] = useState<string | null>(null);

  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [footerImageUrl, setFooterImageUrl] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingFooter, setUploadingFooter] = useState(false);
  const [progressCover, setProgressCover] = useState<UploadProgress | null>(null);
  const [progressFooter, setProgressFooter] = useState<UploadProgress | null>(null);

  useEffect(() => {
    loadCurrentTheme();
  }, [templateId]);

  const loadCurrentTheme = async () => {
    try {
      console.log('🔍 [TemplateThemeSelector] Carregando tema para templateId:', templateId);

      const { data: templateData, error: templateError } = await supabase
        .from('templates')
        .select('tema, slug_template, user_id, cover_image_url, footer_image_url')
        .eq('id', templateId)
        .maybeSingle();

      console.log('🔍 [TemplateThemeSelector] Dados do template:', templateData);
      console.log('🔍 [TemplateThemeSelector] Erro:', templateError);

      if (templateData) {
        if (templateData.tema) {
          console.log('✅ [TemplateThemeSelector] Tema carregado:', templateData.tema);
          setSelectedTheme(templateData.tema as QuoteTheme);
        } else {
          console.log('⚠️ [TemplateThemeSelector] Nenhum tema encontrado, usando default: moderno');
        }

        if (templateData.slug_template) {
          setTemplateSlug(templateData.slug_template);
        }

        if (templateData.cover_image_url) {
          setCoverImageUrl(templateData.cover_image_url);
        } else {
          setCoverImageUrl(null);
        }

        if (templateData.footer_image_url) {
          setFooterImageUrl(templateData.footer_image_url);
        } else {
          setFooterImageUrl(null);
        }

        if (templateData.user_id) {
          setUserId(templateData.user_id);
          const { data: profileData } = await supabase
            .from('profiles')
            .select('slug_usuario')
            .eq('id', templateData.user_id)
            .maybeSingle();

          if (profileData?.slug_usuario) {
            setUserSlug(profileData.slug_usuario);
          }
        }
      }
    } catch (error) {
      console.error('❌ [TemplateThemeSelector] Error loading theme:', error);
    }
  };

  const saveTheme = async (theme: QuoteTheme) => {
    console.log('💾 [TemplateThemeSelector] Iniciando salvamento do tema:', theme);
    console.log('💾 [TemplateThemeSelector] templateId:', templateId);

    setSaving(true);
    setSaveMessage('');

    try {
      const { data, error } = await supabase
        .from('templates')
        .update({ tema: theme })
        .eq('id', templateId)
        .select();

      console.log('💾 [TemplateThemeSelector] Resposta do update:', data);
      console.log('💾 [TemplateThemeSelector] Erro do update:', error);

      if (error) {
        console.error('❌ [TemplateThemeSelector] Erro ao salvar:', error);
        throw error;
      }

      console.log('✅ [TemplateThemeSelector] Tema salvo com sucesso!', theme);
      setSelectedTheme(theme);
      setSaveMessage('Tema salvo com sucesso! Visite sua página de orçamento para ver as alterações.');

      if (onThemeChange) {
        onThemeChange(theme);
      }

      setTimeout(() => setSaveMessage(''), 5000);
    } catch (error) {
      console.error('❌ [TemplateThemeSelector] Error saving theme:', error);
      setSaveMessage('Erro ao salvar tema. Tente novamente.');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file: File, type: 'cover' | 'footer') => {
    if (!userId) {
      alert('Usuário não identificado.');
      return;
    }
    
    if (type === 'cover') {
      setUploadingCover(true);
    } else {
      setUploadingFooter(true);
    }

    try {
      const uploadService = new ImageUploadService((progressData) => {
        if (type === 'cover') {
          setProgressCover(progressData);
        } else {
          setProgressFooter(progressData);
        }
      });

      const result = await uploadService.uploadImage(file, userId, {
        maxSizeMB: 2,
        maxWidthPx: 1920,
        maxHeightPx: 1080,
        quality: 0.85,
        allowedFormats: ['image/jpeg', 'image/png'],
        folder: 'uploads',
      });

      if (!result.success) {
        alert(`Erro no upload: ${result.error}`);
        return;
      }

      const updateData = type === 'cover' 
        ? { cover_image_url: result.url } 
        : { footer_image_url: result.url };

      const { error } = await supabase
        .from('templates')
        .update(updateData)
        .eq('id', templateId);

      if (error) throw error;

      if (type === 'cover') {
        setCoverImageUrl(result.url || null);
      } else {
        setFooterImageUrl(result.url || null);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar imagem no banco de dados.');
    } finally {
      if (type === 'cover') {
        setUploadingCover(false);
        setProgressCover(null);
      } else {
        setUploadingFooter(false);
        setProgressFooter(null);
      }
    }
  };

  const handleRemoveImage = async (type: 'cover' | 'footer') => {
    const imageUrl = type === 'cover' ? coverImageUrl : footerImageUrl;
    if (!imageUrl) return;

    if (!confirm('⚠️ Deseja remover esta imagem?')) return;

    try {
      const uploadService = new ImageUploadService();
      await uploadService.deleteImage(imageUrl);

      const updateData = type === 'cover' 
        ? { cover_image_url: null } 
        : { footer_image_url: null };

      const { error } = await supabase
        .from('templates')
        .update(updateData)
        .eq('id', templateId);

      if (error) throw error;

      if (type === 'cover') {
        setCoverImageUrl(null);
      } else {
        setFooterImageUrl(null);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao remover imagem.');
    }
  };

  const themes = [
    {
      id: 'moderno' as QuoteTheme,
      name: 'Moderno',
      description: 'Clean e minimalista com azul suave',
      icon: Sparkles,
      color: 'from-blue-500 to-blue-700',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-500',
    },
    {
      id: 'classico' as QuoteTheme,
      name: 'Clássico Elegante',
      description: 'Sofisticado com preto e dourado',
      icon: Palette,
      color: 'from-gray-900 to-amber-500',
      textColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-600',
    },
    {
      id: 'romantico' as QuoteTheme,
      name: 'Romântico',
      description: 'Delicado com rosa e lavanda',
      icon: Sparkles,
      color: 'from-pink-400 to-purple-400',
      textColor: 'text-pink-600',
      bgColor: 'bg-pink-50',
      borderColor: 'border-pink-500',
    },
    {
      id: 'vibrante' as QuoteTheme,
      name: 'Vibrante',
      description: 'Criativo com cores vivas',
      icon: Palette,
      color: 'from-purple-600 to-orange-500',
      textColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-500',
    },
    {
      id: 'natural' as QuoteTheme,
      name: 'Natural Clean',
      description: 'Design natural e atemporal',
      icon: Leaf,
      color: 'from-emerald-600 to-amber-500',
      textColor: 'text-emerald-700',
      bgColor: 'bg-amber-50',
      borderColor: 'border-emerald-600',
    },
    {
      id: 'minimalista' as QuoteTheme,
      name: 'Fotografia Minimalista',
      description: 'Espaços amplos e foco nas imagens',
      icon: Image,
      color: 'from-slate-500 to-slate-800',
      textColor: 'text-slate-700',
      bgColor: 'bg-slate-100',
      borderColor: 'border-slate-600',
    },
    {
      id: 'darkstudio' as QuoteTheme,
      name: 'Dark Studio ✨',
      description: 'Premium dark com acentos verdes neon',
      icon: Moon,
      color: 'from-gray-900 to-green-600',
      textColor: 'text-green-500',
      bgColor: 'bg-gray-900',
      borderColor: 'border-green-500',
    },
    {
      id: 'promocional' as QuoteTheme,
      name: '🔥 Oferta Especial',
      description: 'Alta conversão com cores de urgência e promoção',
      icon: Flame,
      color: 'from-red-600 to-amber-500',
      textColor: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-500',
    },
    {
      id: 'oferta' as QuoteTheme,
      name: '⚡ Oferta Chamativa',
      description: 'Design ultra chamativo em tons de laranja para alta conversão',
      icon: Flame,
      color: 'from-orange-500 to-red-600',
      textColor: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-500',
    },
    {
      id: 'pdf-elegante' as QuoteTheme,
      name: 'PDF Elegante 📖',
      description: 'Livreto premium de 3 páginas (Capa, Proposta, Rodapé) com fundo branco e tons sóbrios',
      icon: BookOpen,
      color: 'from-zinc-950 to-amber-600',
      textColor: 'text-amber-800 dark:text-amber-200',
      bgColor: 'bg-zinc-950',
      borderColor: 'border-amber-600',
    },
  ];

  const getPreviewUrl = () => {
    if (userSlug && templateSlug) {
      return `/${userSlug}/${templateSlug}`;
    }
    return null;
  };

  const previewUrl = getPreviewUrl();

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#0a1628] rounded-xl shadow-lg dark:shadow-none p-6 border-2 border-gray-200 dark:border-[rgba(255,255,255,.08)]">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Escolha o Design da Página de Orçamento</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Selecione o estilo visual que melhor representa sua marca. Cada tema tem um layout completamente diferente.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto p-2">
          {themes.map((theme) => {
            const Icon = theme.icon;
            const isSelected = selectedTheme === theme.id;

            return (
              <button
                key={theme.id}
                onClick={() => saveTheme(theme.id)}
                disabled={saving}
                className={`relative group transition-all duration-300 ${isSelected ? 'transform scale-105' : 'hover:scale-102'
                  } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div
                  className={`rounded-xl p-5 border-2 transition-all ${isSelected
                      ? `${theme.borderColor} shadow-xl bg-white dark:bg-dark-bg2`
                      : 'border-gray-200 dark:border-[rgba(255,255,255,.08)] hover:border-gray-300 dark:hover:border-[rgba(255,255,255,.2)] bg-gray-50 dark:bg-[#07101f]'
                    }`}
                >
                  <div
                    className={`w-12 h-12 rounded-lg bg-gradient-to-br ${theme.color} flex items-center justify-center mb-4 mx-auto transition-transform ${isSelected ? 'scale-110' : 'group-hover:scale-105'
                      }`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  <h4 className={`text-lg font-bold mb-1 ${isSelected ? theme.textColor : 'text-gray-900 dark:text-white'}`}>
                    {theme.name}
                  </h4>
                  <p className={`text-sm ${isSelected ? theme.textColor : 'text-gray-600 dark:text-gray-400'}`}>
                    {theme.description}
                  </p>

                  {isSelected && (
                    <div className="absolute top-3 right-3">
                      <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${theme.color} flex items-center justify-center`}>
                        <Check className="w-4 h-4 text-white" strokeWidth={3} />
                      </div>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Seção específica de imagens para o tema PDF Elegante */}
        {selectedTheme === 'pdf-elegante' && (
          <div className="mt-8 border-t border-gray-200 dark:border-[rgba(255,255,255,0.08)] pt-6 space-y-6">
            <div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-600" />
                Imagens do Orçamento (Tema PDF Elegante)
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Este tema exibe uma imagem de capa elegante no início (Página 1) e uma imagem de encerramento no rodapé (Página 3).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Imagem de Capa */}
              <div className="border border-gray-200 dark:border-[rgba(255,255,255,0.08)] rounded-xl p-4 bg-gray-50 dark:bg-white/5 space-y-4">
                <div>
                  <h5 className="font-semibold text-sm text-gray-900 dark:text-white">Imagem de Capa (Página 1)</h5>
                  <p className="text-xs text-gray-500 mt-0.5">Exibida no topo/capa da proposta comercial.</p>
                </div>

                {coverImageUrl ? (
                  <div className="relative">
                    <ImageWithFallback
                      src={coverImageUrl}
                      alt="Capa do orçamento"
                      className="w-full h-40 object-cover rounded-lg border border-gray-300 dark:border-[rgba(255,255,255,0.08)]"
                      fallbackClassName="w-full h-40 rounded-lg border border-gray-300 dark:border-[rgba(255,255,255,0.08)]"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage('cover')}
                      className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-lg transition-colors"
                      title="Remover imagem"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      id="pdf-cover-upload"
                      accept="image/jpeg,image/png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, 'cover');
                      }}
                      className="hidden"
                      disabled={uploadingCover}
                    />
                    <label
                      htmlFor="pdf-cover-upload"
                      className={`border-2 border-dashed border-gray-300 dark:border-[rgba(255,255,255,0.12)] rounded-lg p-6 text-center cursor-pointer hover:border-amber-600 dark:hover:border-amber-500 transition-colors flex flex-col items-center justify-center gap-2 ${
                        uploadingCover ? 'opacity-65 cursor-not-allowed' : ''
                      }`}
                    >
                      {uploadingCover ? (
                        <div className="space-y-2 text-center">
                          <Loader2 className="w-8 h-8 text-amber-600 animate-spin mx-auto" />
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            {progressCover ? progressCover.message : 'Enviando imagem de capa...'}
                          </p>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            <span className="font-semibold text-amber-600 hover:text-amber-700">Selecione uma imagem</span> de capa
                            <p className="text-[10px] text-gray-400 mt-1">JPG, PNG até 2MB</p>
                          </div>
                        </>
                      )}
                    </label>
                  </div>
                )}
              </div>

              {/* Imagem de Rodapé */}
              <div className="border border-gray-200 dark:border-[rgba(255,255,255,0.08)] rounded-xl p-4 bg-gray-50 dark:bg-white/5 space-y-4">
                <div>
                  <h5 className="font-semibold text-sm text-gray-900 dark:text-white">Imagem de Rodapé (Página 3)</h5>
                  <p className="text-xs text-gray-500 mt-0.5">Exibida no encerramento da proposta comercial.</p>
                </div>

                {footerImageUrl ? (
                  <div className="relative">
                    <ImageWithFallback
                      src={footerImageUrl}
                      alt="Rodapé do orçamento"
                      className="w-full h-40 object-cover rounded-lg border border-gray-300 dark:border-[rgba(255,255,255,0.08)]"
                      fallbackClassName="w-full h-40 rounded-lg border border-gray-300 dark:border-[rgba(255,255,255,0.08)]"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage('footer')}
                      className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-lg transition-colors"
                      title="Remover imagem"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      id="pdf-footer-upload"
                      accept="image/jpeg,image/png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, 'footer');
                      }}
                      className="hidden"
                      disabled={uploadingFooter}
                    />
                    <label
                      htmlFor="pdf-footer-upload"
                      className={`border-2 border-dashed border-gray-300 dark:border-[rgba(255,255,255,0.12)] rounded-lg p-6 text-center cursor-pointer hover:border-amber-600 dark:hover:border-amber-500 transition-colors flex flex-col items-center justify-center gap-2 ${
                        uploadingFooter ? 'opacity-65 cursor-not-allowed' : ''
                      }`}
                    >
                      {uploadingFooter ? (
                        <div className="space-y-2 text-center">
                          <Loader2 className="w-8 h-8 text-amber-600 animate-spin mx-auto" />
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            {progressFooter ? progressFooter.message : 'Enviando imagem de rodapé...'}
                          </p>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            <span className="font-semibold text-amber-600 hover:text-amber-700">Selecione uma imagem</span> de rodapé
                            <p className="text-[10px] text-gray-400 mt-1">JPG, PNG até 2MB</p>
                          </div>
                        </>
                      )}
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {saveMessage && (
          <div className={`mt-6 p-4 rounded-lg border-2 ${saveMessage.includes('sucesso')
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
            }`}>
            <div className="flex items-start gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${saveMessage.includes('sucesso') ? 'bg-green-500' : 'bg-red-500'
                }`}>
                {saveMessage.includes('sucesso') ? (
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                ) : (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <p className={`text-sm font-medium ${saveMessage.includes('sucesso') ? 'text-green-900' : 'text-red-900'
                }`}>
                {saveMessage}
              </p>
            </div>
          </div>
        )}

        {/* Botão fixo – sempre visível quando o template tem slug configurado */}
        {previewUrl ? (
          <div className="mt-4 flex items-center justify-between gap-4 p-4 bg-gray-50 border-2 border-gray-200 rounded-lg">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800">Link público do orçamento</p>
              <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">priceus.com.br{previewUrl}</p>
            </div>
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium whitespace-nowrap flex-shrink-0"
            >
              <Eye className="w-4 h-4" />
              Ver Orçamento
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ) : (
          <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 font-medium">
              ⚠️ Configure um <strong>Slug (URL amigável)</strong> na aba <strong>Configurações</strong> para ver o link público aqui.
            </p>
          </div>
        )}

        <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-blue-900 font-medium">
                O tema escolhido altera completamente o design da página de orçamento.
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Seus produtos, preços e configurações são preservados ao trocar de tema. Apenas a aparência visual muda!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
