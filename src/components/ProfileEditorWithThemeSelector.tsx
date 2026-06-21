import { useState, useEffect } from 'react';
import { Palette, Sparkles, Camera, Check, ExternalLink, Eye, Moon, Type, Loader2, Trash2 } from 'lucide-react';
import { ProfileEditor } from './ProfileEditor';
import { supabase } from '../lib/supabase';

interface ProfileEditorWithThemeSelectorProps {
  userId: string;
}

type Theme = 'original' | 'minimalist' | 'modern' | 'magazine' | 'darkstudio' | 'pdf_elegante';

const FONT_OPTIONS = [
  { label: 'Inter (Padrão)', value: 'Inter' },
  { label: 'Roboto (Versátil)', value: 'Roboto' },
  { label: 'Open Sans (Limpo)', value: 'Open Sans' },
  { label: 'Playfair Display (Elegante)', value: 'Playfair Display' },
  { label: 'Montserrat (Moderno)', value: 'Montserrat' },
  { label: 'Lato (Clean)', value: 'Lato' },
  { label: 'Raleway (Sofisticado)', value: 'Raleway' },
  { label: 'Poppins (Amigável)', value: 'Poppins' },
  { label: 'Merriweather (Clássico)', value: 'Merriweather' },
  { label: 'Nunito (Arredondado)', value: 'Nunito' },
  { label: 'Oswald (Forte)', value: 'Oswald' },
  { label: 'DM Sans (Contemporâneo)', value: 'DM Sans' },
  { label: 'Josefin Sans (Geométrico)', value: 'Josefin Sans' },
  { label: 'Cormorant Garamond (Luxo)', value: 'Cormorant Garamond' },
  { label: 'Lora (Literário)', value: 'Lora' },
  { label: 'Cinzel (Imperial)', value: 'Cinzel' },
  { label: 'Outfit (Minimalista)', value: 'Outfit' },
  { label: 'Quicksand (Suave)', value: 'Quicksand' },
  { label: 'Playpen Sans (Manuscrito)', value: 'Playpen Sans' },
  { label: 'Great Vibes (Caligráfico)', value: 'Great Vibes' },
];

export function ProfileEditorWithThemeSelector({ userId }: ProfileEditorWithThemeSelectorProps) {
  const [selectedTheme, setSelectedTheme] = useState<Theme>('original');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [slugUsuario, setSlugUsuario] = useState<string | null>(null);

  // Estados de Personalização de Tema e Fontes
  const [customThemes, setCustomThemes] = useState<any[]>([]);
  const [selectedCustomThemeId, setSelectedCustomThemeId] = useState<string | null>(null);
  const [selectedFont, setSelectedFont] = useState<string>('Inter');
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [customThemeName, setCustomThemeName] = useState('');
  const [customColors, setCustomColors] = useState({
    bgPrincipal: '#f8fafc',
    bgCard: '#ffffff',
    primaria: '#2563eb',
    textoPrincipal: '#0f172a',
    textoSecundario: '#475569',
    borda: '#cbd5e1',
  });
  const [savingFont, setSavingFont] = useState(false);
  const [fontSaveMessage, setFontSaveMessage] = useState('');

  useEffect(() => {
    if (userId) {
      loadCurrentTheme();
      loadCustomThemes(userId);
    }
  }, [userId]);

  const loadCustomThemes = async (userUuid: string) => {
    try {
      const { data, error } = await supabase
        .from('temas_personalizados')
        .select('*')
        .eq('user_id', userUuid)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomThemes(data || []);
    } catch (err) {
      console.error('Erro ao carregar temas personalizados:', err);
    }
  };

  const loadCurrentTheme = async () => {
    try {
      console.log('🔍 [ThemeSelector] Carregando tema para userId:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('tema_perfil, slug_usuario, fonte_personalizada, tema_personalizado_id')
        .eq('id', userId)
        .maybeSingle();

      if (data) {
        if (data.tema_perfil) {
          setSelectedTheme(data.tema_perfil as Theme);
        }
        if (data.slug_usuario) {
          setSlugUsuario(data.slug_usuario);
        }
        if (data.fonte_personalizada) {
          setSelectedFont(data.fonte_personalizada);
        }
        if (data.tema_personalizado_id) {
          setSelectedCustomThemeId(data.tema_personalizado_id);
          // Buscar cores do tema personalizado ativo
          const { data: themeData } = await supabase
            .from('temas_personalizados')
            .select('cores')
            .eq('id', data.tema_personalizado_id)
            .maybeSingle();
          if (themeData?.cores) {
            setCustomColors(themeData.cores as any);
          }
        } else {
          setSelectedCustomThemeId(null);
        }
      }
    } catch (error) {
      console.error('❌ [ThemeSelector] Error loading theme:', error);
    }
  };

  const saveTheme = async (theme: Theme) => {
    setSaving(true);
    setSaveMessage('');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          tema_perfil: theme,
          tema_personalizado_id: null // limpa tema personalizado ao escolher padrão
        })
        .eq('id', userId);

      if (error) throw error;

      setSelectedTheme(theme);
      setSelectedCustomThemeId(null);
      setSaveMessage('Tema do perfil salvo com sucesso! Visite seu perfil público para ver as alterações.');
      setTimeout(() => setSaveMessage(''), 5000);
    } catch (error) {
      console.error('❌ [ThemeSelector] Error saving theme:', error);
      setSaveMessage('Erro ao salvar tema. Tente novamente.');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectCustomTheme = async (customTheme: any) => {
    setSaving(true);
    setSaveMessage('');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          tema_personalizado_id: customTheme.id,
          tema_perfil: customTheme.tema_base
        })
        .eq('id', userId);

      if (error) throw error;

      setSelectedCustomThemeId(customTheme.id);
      setSelectedTheme(customTheme.tema_base as Theme);
      setCustomColors(customTheme.cores);
      setSaveMessage(`Tema personalizado "${customTheme.nome}" ativado no perfil público!`);
      setTimeout(() => setSaveMessage(''), 5000);
    } catch (err) {
      console.error('Erro ao selecionar tema personalizado:', err);
      setSaveMessage('Erro ao ativar tema personalizado.');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCustomTheme = async () => {
    if (!customThemeName.trim()) {
      alert('Por favor, informe um nome para o seu tema personalizado.');
      return;
    }
    setSaving(true);
    setSaveMessage('');
    try {
      const { data: newTheme, error: insertError } = await supabase
        .from('temas_personalizados')
        .insert({
          user_id: userId,
          nome: customThemeName,
          tema_base: selectedTheme,
          cores: customColors
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          tema_personalizado_id: newTheme.id,
          tema_perfil: selectedTheme
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      setSelectedCustomThemeId(newTheme.id);
      setSaveMessage(`Tema personalizado "${customThemeName}" criado e ativado no perfil público!`);
      setIsCustomizing(false);
      setCustomThemeName('');
      loadCustomThemes(userId);
      setTimeout(() => setSaveMessage(''), 5000);
    } catch (err: any) {
      console.error('Erro ao criar tema personalizado:', err);
      alert(`Erro ao criar tema personalizado: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCustomTheme = async (themeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('⚠️ Tem certeza que deseja excluir este tema personalizado?')) return;

    try {
      const { error } = await supabase
        .from('temas_personalizados')
        .delete()
        .eq('id', themeId);

      if (error) throw error;

      if (selectedCustomThemeId === themeId) {
        await supabase
          .from('profiles')
          .update({ tema_personalizado_id: null })
          .eq('id', userId);
        setSelectedCustomThemeId(null);
      }

      loadCustomThemes(userId);
      setSaveMessage('Tema personalizado excluído.');
      setTimeout(() => setSaveMessage(''), 4000);
    } catch (err) {
      console.error('Erro ao deletar tema personalizado:', err);
      alert('Erro ao excluir tema personalizado.');
    }
  };

  const saveFont = async (font: string) => {
    setSavingFont(true);
    setFontSaveMessage('');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ fonte_personalizada: font })
        .eq('id', userId);

      if (error) throw error;
      setSelectedFont(font);
      setFontSaveMessage('Fonte do perfil salva com sucesso!');
      setTimeout(() => setFontSaveMessage(''), 4000);
    } catch (err) {
      console.error('❌ Erro ao salvar fonte:', err);
      setFontSaveMessage('Erro ao salvar fonte.');
      setTimeout(() => setFontSaveMessage(''), 3000);
    } finally {
      setSavingFont(false);
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
    {
      id: 'pdf_elegante' as Theme,
      name: 'PDF Elegante ✨',
      description: 'Clássico, minimalista e limpo',
      icon: Palette,
      color: 'from-neutral-400 to-neutral-800',
      textColor: 'text-neutral-900',
      bgColor: 'bg-white',
      borderColor: 'border-neutral-950',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-[#0a1628] rounded-xl shadow-lg dark:shadow-none p-6 border-2 border-gray-200 dark:border-[rgba(255,255,255,.08)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Escolha o Estilo do seu Perfil Público</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Selecione o design que melhor representa sua marca profissional. Este tema será exibido quando visitantes acessarem seu perfil público.
            </p>
          </div>
          
          <button
            type="button"
            onClick={() => {
              setIsCustomizing(!isCustomizing);
              if (!isCustomizing) {
                // Preencher com as cores do tema atual se disponível
                if (selectedCustomThemeId) {
                  const currentCustom = customThemes.find(t => t.id === selectedCustomThemeId);
                  if (currentCustom?.cores) {
                    setCustomColors(currentCustom.cores);
                  }
                } else {
                  setCustomThemeName('');
                }
              }
            }}
            className="px-4 py-2 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-750 transition-colors flex items-center gap-1.5 self-start md:self-center shrink-0"
          >
            <Palette className="w-4 h-4" />
            {isCustomizing ? 'Fechar Personalização' : '🎨 Personalizar Cores'}
          </button>
        </div>

        {/* Customização de Cores */}
        {isCustomizing && (
          <div className="mb-6 p-5 bg-gray-50 dark:bg-[#07101f] border-2 border-dashed border-violet-300 dark:border-violet-850/50 rounded-xl space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Palette className="w-5 h-5 text-violet-500" />
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">Ajustes de Cores do Tema Customizado para o Perfil</h4>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Cor do Plano de Fundo</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={customColors.bgPrincipal}
                    onChange={(e) => setCustomColors({ ...customColors, bgPrincipal: e.target.value })}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-gray-300 bg-white"
                  />
                  <input
                    type="text"
                    value={customColors.bgPrincipal}
                    onChange={(e) => setCustomColors({ ...customColors, bgPrincipal: e.target.value })}
                    className="flex-1 px-3 py-2 text-xs border border-gray-200 dark:border-white/10 rounded bg-white dark:bg-[#0c1b30] text-gray-800 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Cor dos Cards</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={customColors.bgCard}
                    onChange={(e) => setCustomColors({ ...customColors, bgCard: e.target.value })}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-gray-300 bg-white"
                  />
                  <input
                    type="text"
                    value={customColors.bgCard}
                    onChange={(e) => setCustomColors({ ...customColors, bgCard: e.target.value })}
                    className="flex-1 px-3 py-2 text-xs border border-gray-200 dark:border-white/10 rounded bg-white dark:bg-[#0c1b30] text-gray-800 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Cor Principal / Botões</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={customColors.primaria}
                    onChange={(e) => setCustomColors({ ...customColors, primaria: e.target.value })}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-gray-300 bg-white"
                  />
                  <input
                    type="text"
                    value={customColors.primaria}
                    onChange={(e) => setCustomColors({ ...customColors, primaria: e.target.value })}
                    className="flex-1 px-3 py-2 text-xs border border-gray-200 dark:border-white/10 rounded bg-white dark:bg-[#0c1b30] text-gray-800 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Texto Principal / Títulos</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={customColors.textoPrincipal}
                    onChange={(e) => setCustomColors({ ...customColors, textoPrincipal: e.target.value })}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-gray-300 bg-white"
                  />
                  <input
                    type="text"
                    value={customColors.textoPrincipal}
                    onChange={(e) => setCustomColors({ ...customColors, textoPrincipal: e.target.value })}
                    className="flex-1 px-3 py-2 text-xs border border-gray-200 dark:border-white/10 rounded bg-white dark:bg-[#0c1b30] text-gray-800 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Texto Secundário / Detalhes</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={customColors.textoSecundario}
                    onChange={(e) => setCustomColors({ ...customColors, textoSecundario: e.target.value })}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-gray-300 bg-white"
                  />
                  <input
                    type="text"
                    value={customColors.textoSecundario}
                    onChange={(e) => setCustomColors({ ...customColors, textoSecundario: e.target.value })}
                    className="flex-1 px-3 py-2 text-xs border border-gray-200 dark:border-white/10 rounded bg-white dark:bg-[#0c1b30] text-gray-800 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Cor das Bordas</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={customColors.borda}
                    onChange={(e) => setCustomColors({ ...customColors, borda: e.target.value })}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-gray-300 bg-white"
                  />
                  <input
                    type="text"
                    value={customColors.borda}
                    onChange={(e) => setCustomColors({ ...customColors, borda: e.target.value })}
                    className="flex-1 px-3 py-2 text-xs border border-gray-200 dark:border-white/10 rounded bg-white dark:bg-[#0c1b30] text-gray-800 dark:text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 pt-3 border-t border-gray-150 dark:border-white/5">
              <div className="flex-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Nome do Tema Customizado</label>
                <input
                  type="text"
                  placeholder="Ex: Minha Identidade Visual de Perfil"
                  value={customThemeName}
                  onChange={(e) => setCustomThemeName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded bg-white dark:bg-[#0c1b30] text-gray-800 dark:text-white font-medium"
                />
              </div>
              <button
                type="button"
                onClick={handleCreateCustomTheme}
                disabled={saving}
                className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Salvar como Tema do Perfil
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {themes.map((theme) => {
            const Icon = theme.icon;
            const isSelected = selectedTheme === theme.id && !selectedCustomThemeId;

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
                  className={`rounded-xl p-5 border-2 transition-all h-full ${
                    isSelected
                      ? `${theme.borderColor} shadow-xl bg-white dark:bg-dark-bg2`
                      : 'border-gray-200 dark:border-[rgba(255,255,255,.08)] hover:border-gray-300 dark:hover:border-[rgba(255,255,255,.2)] bg-gray-50 dark:bg-[#07101f]'
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-lg bg-gradient-to-br ${theme.color} flex items-center justify-center mb-4 mx-auto transition-transform ${
                      isSelected ? 'scale-110' : 'group-hover:scale-105'
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

        {/* Temas Personalizados do Usuário */}
        {customThemes.length > 0 && (
          <div className="mt-8 border-t border-gray-200 dark:border-[rgba(255,255,255,0.08)] pt-6">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Seus Temas Personalizados</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {customThemes.map((cTheme) => {
                const isSelected = selectedCustomThemeId === cTheme.id;
                return (
                  <button
                    key={cTheme.id}
                    onClick={() => handleSelectCustomTheme(cTheme)}
                    className={`relative rounded-xl p-4 border-2 text-left transition-all ${
                      isSelected
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                        : 'border-gray-200 dark:border-[rgba(255,255,255,.08)] hover:border-gray-300 dark:hover:border-[rgba(255,255,255,.2)] bg-gray-50 dark:bg-[#07101f]'
                    }`}
                  >
                    <p className="font-semibold text-gray-900 dark:text-white text-sm truncate pr-6">{cTheme.nome}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Base: {cTheme.tema_base}</p>
                    <div className="flex gap-1 mt-2">
                      <span className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: cTheme.cores.bgPrincipal }} title="Background" />
                      <span className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: cTheme.cores.bgCard }} title="Card" />
                      <span className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: cTheme.cores.primaria }} title="Destaque" />
                    </div>
                    <button
                      onClick={(e) => handleDeleteCustomTheme(cTheme.id, e)}
                      className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Excluir tema"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Seletor de Fontes / Tipografia do Perfil */}
        <div className="mt-8 border-t border-gray-200 dark:border-[rgba(255,255,255,0.08)] pt-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
              <Type className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">Tipografia do Perfil Público</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">Escolha a fonte que será usada em todo o seu perfil público</p>
            </div>
          </div>

          {/* Google Fonts link para preview */}
          <link
            rel="stylesheet"
            href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(selectedFont)}:wght@400;600;700;900&display=swap`}
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {FONT_OPTIONS.map((font) => {
              const isActive = selectedFont === font.value;
              return (
                <button
                  key={font.value}
                  type="button"
                  onClick={() => saveFont(font.value)}
                  disabled={savingFont}
                  className={`relative group rounded-xl p-3 border-2 text-left transition-all duration-200 ${
                    isActive
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                      : 'border-gray-200 dark:border-[rgba(255,255,255,.08)] hover:border-gray-300 dark:hover:border-[rgba(255,255,255,.2)] bg-gray-50 dark:bg-[#07101f]'
                  } ${savingFont ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <p
                    className="text-base font-semibold text-gray-800 dark:text-white truncate"
                    style={{ fontFamily: `'${font.value}', sans-serif` }}
                  >
                    Aa
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 truncate leading-tight">{font.label}</p>
                  {isActive && (
                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div
            className="mt-4 p-4 rounded-xl border border-gray-200 dark:border-[rgba(255,255,255,.08)] bg-gray-50 dark:bg-white/5"
            style={{ fontFamily: `'${selectedFont}', sans-serif` }}
          >
            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Preview da tipografia do perfil</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">Meu Nome Profissional</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Fotografia de Casamentos e Retratos Corporativos.</p>
          </div>

          {fontSaveMessage && (
            <div className={`mt-3 p-3 rounded-lg border ${
              fontSaveMessage.includes('sucesso')
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            } text-sm font-medium flex items-center gap-2`}>
              <Check className="w-4 h-4" />
              {fontSaveMessage}
            </div>
          )}
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
                O tema e fontes escolhidos serão aplicados automaticamente ao seu perfil público.
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Suas informações são preservadas ao trocar de tema. Apenas a aparência visual muda!
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0a1628] rounded-xl shadow-lg dark:shadow-none p-6 border-2 border-gray-200 dark:border-[rgba(255,255,255,.08)]">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Editar Informações do Perfil</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Configure suas informações profissionais, foto, biografia e links de contato.
          </p>
        </div>
        <ProfileEditor userId={userId} />
      </div>
    </div>
  );
}
