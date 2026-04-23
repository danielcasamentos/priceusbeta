import { useState, useEffect } from 'react';
import { Palette, Sparkles, Camera, Check, ExternalLink, Eye, Moon } from 'lucide-react';
import { ProfileEditor } from './ProfileEditor';
import { supabase } from '../lib/supabase';

interface ProfileEditorWithThemeSelectorProps {
  userId: string;
}

type Theme = 'original' | 'minimalist' | 'modern' | 'magazine' | 'darkstudio';

export function ProfileEditorWithThemeSelector({ userId }: ProfileEditorWithThemeSelectorProps) {
  const [selectedTheme, setSelectedTheme] = useState<Theme>('original');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [slugUsuario, setSlugUsuario] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentTheme();
  }, [userId]);

  const loadCurrentTheme = async () => {
    try {
      console.log('🔍 [ThemeSelector] Carregando tema para userId:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('tema_perfil, slug_usuario')
        .eq('id', userId)
        .maybeSingle();

      console.log('🔍 [ThemeSelector] Dados retornados:', data);
      console.log('🔍 [ThemeSelector] Erro:', error);
      console.log('🔍 [ThemeSelector] tema_perfil do banco:', data?.tema_perfil);
      console.log('🔍 [ThemeSelector] slug_usuario do banco:', data?.slug_usuario);

      if (data) {
        if (data.tema_perfil) {
          console.log('✅ [ThemeSelector] Tema carregado:', data.tema_perfil);
          setSelectedTheme(data.tema_perfil as Theme);
        } else {
          console.log('⚠️ [ThemeSelector] Nenhum tema encontrado, usando default: original');
        }
        if (data.slug_usuario) {
          setSlugUsuario(data.slug_usuario);
        }
      }
    } catch (error) {
      console.error('❌ [ThemeSelector] Error loading theme:', error);
    }
  };

  const saveTheme = async (theme: Theme) => {
    console.log('💾 [ThemeSelector] Iniciando salvamento do tema:', theme);
    console.log('💾 [ThemeSelector] userId:', userId);
    
    setSaving(true);
    setSaveMessage('');

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ tema_perfil: theme })
        .eq('id', userId)
        .select();

      console.log('💾 [ThemeSelector] Resposta do update:', data);
      console.log('💾 [ThemeSelector] Erro do update:', error);

      if (error) {
        console.error('❌ [ThemeSelector] Erro ao salvar:', error);
        throw error;
      }

      console.log('✅ [ThemeSelector] Tema salvo com sucesso!', theme);
      setSelectedTheme(theme);
      setSaveMessage('Tema salvo com sucesso! Visite seu perfil público para ver as alterações.');
      setTimeout(() => setSaveMessage(''), 5000);
    } catch (error) {
      console.error('❌ [ThemeSelector] Error saving theme:', error);
      setSaveMessage('Erro ao salvar tema. Tente novamente.');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const themes = [
    {
      id: 'original' as Theme,
      name: 'Original',
      description: 'Design padrão do sistema',
      icon: Palette,
      color: 'from-blue-500 to-green-600',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-500',
    },
    {
      id: 'minimalist' as Theme,
      name: 'Minimalista',
      description: 'Clean e profissional',
      icon: Palette,
      color: 'from-slate-700 to-slate-900',
      textColor: 'text-slate-600',
      bgColor: 'bg-slate-50',
      borderColor: 'border-slate-900',
    },
    {
      id: 'modern' as Theme,
      name: 'Moderno',
      description: 'Vibrante e colorido',
      icon: Sparkles,
      color: 'from-cyan-500 via-blue-500 to-purple-600',
      textColor: 'text-cyan-600',
      bgColor: 'bg-gradient-to-br from-cyan-50 to-purple-50',
      borderColor: 'border-cyan-500',
    },
    {
      id: 'magazine' as Theme,
      name: 'Magazine',
      description: 'Editorial e artístico',
      icon: Camera,
      color: 'from-amber-600 to-orange-600',
      textColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-600',
    },
    {
      id: 'darkstudio' as Theme,
      name: 'Dark Studio ✨',
      description: 'Premium dark com verde neon',
      icon: Moon,
      color: 'from-gray-900 to-green-600',
      textColor: 'text-green-500',
      bgColor: 'bg-gray-900',
      borderColor: 'border-green-500',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-200">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Escolha o Estilo do seu Perfil Público</h3>
          <p className="text-gray-600 text-sm">
            Selecione o design que melhor representa sua marca profissional. Este tema será exibido quando visitantes acessarem seu perfil público.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {themes.map((theme) => {
            const Icon = theme.icon;
            const isSelected = selectedTheme === theme.id;

            return (
              <button
                key={theme.id}
                onClick={() => saveTheme(theme.id)}
                disabled={saving}
                className={`relative group transition-all duration-300 ${
                  isSelected ? 'transform scale-105' : 'hover:scale-102'
                } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div
                  className={`rounded-xl p-5 border-2 transition-all ${
                    isSelected
                      ? `${theme.borderColor} shadow-xl bg-white`
                      : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-lg bg-gradient-to-br ${theme.color} flex items-center justify-center mb-4 mx-auto transition-transform ${
                      isSelected ? 'scale-110' : 'group-hover:scale-105'
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
          <div className={`mt-6 p-4 rounded-lg border-2 ${
            saveMessage.includes('sucesso')
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  saveMessage.includes('sucesso') ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  {saveMessage.includes('sucesso') ? (
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  ) : (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <p className={`text-sm font-medium ${
                  saveMessage.includes('sucesso') ? 'text-green-900' : 'text-red-900'
                }`}>
                  {saveMessage}
                </p>
              </div>
              {saveMessage.includes('sucesso') && slugUsuario && (
                <a
                  href={`/${slugUsuario}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium whitespace-nowrap"
                >
                  <Eye className="w-4 h-4" />
                  Ver Perfil
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-blue-900 font-medium">
                O tema escolhido será aplicado automaticamente ao seu perfil público.
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Suas informações são preservadas ao trocar de tema. Apenas a aparência visual muda!
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-200">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Editar Informações do Perfil</h3>
          <p className="text-gray-600 text-sm">
            Configure suas informações profissionais, foto, biografia e links de contato.
          </p>
        </div>
        <ProfileEditor userId={userId} />
      </div>
    </div>
  );
}
