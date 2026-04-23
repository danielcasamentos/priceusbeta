import { useState, useEffect } from 'react';
import { Palette, Sparkles, Minimize2, Camera, Check, ExternalLink, Eye, Moon, Leaf, Image, Video, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TemplateEditorWithThemeSelectorProps {
  templateId: string;
  onThemeChange?: (theme: QuoteTheme) => void;
}

export type QuoteTheme = 'moderno' | 'classico' | 'romantico' | 'vibrante' | 'natural' | 'minimalista' | 'darkstudio';

export function TemplateEditorWithThemeSelector({ templateId, onThemeChange }: TemplateEditorWithThemeSelectorProps) {
  const [selectedTheme, setSelectedTheme] = useState<QuoteTheme>('moderno');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [templateSlug, setTemplateSlug] = useState<string | null>(null);
  const [userSlug, setUserSlug] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentTheme();
  }, [templateId]);

  const loadCurrentTheme = async () => {
    try {
      console.log('🔍 [TemplateThemeSelector] Carregando tema para templateId:', templateId);

      const { data: templateData, error: templateError } = await supabase
        .from('templates')
        .select('tema, slug_template, user_id')
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

        if (templateData.user_id) {
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
      <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-200">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Escolha o Design da Página de Orçamento</h3>
          <p className="text-gray-600 text-sm">
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
                      ? `${theme.borderColor} shadow-xl bg-white`
                      : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                    }`}
                >
                  <div
                    className={`w-12 h-12 rounded-lg bg-gradient-to-br ${theme.color} flex items-center justify-center mb-4 mx-auto transition-transform ${isSelected ? 'scale-110' : 'group-hover:scale-105'
                      }`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  <h4 className={`text-lg font-bold mb-1 ${isSelected ? theme.textColor : 'text-gray-900'}`}>
                    {theme.name}
                  </h4>
                  <p className={`text-sm ${isSelected ? theme.textColor : 'text-gray-600'}`}>
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
