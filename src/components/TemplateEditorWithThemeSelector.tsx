import { useState, useEffect } from 'react';
import { Palette, Sparkles, Check, ExternalLink, Eye, Moon, Leaf, Image, Flame, BookOpen, Upload, Trash2, Loader2, Type } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ImageUploadService, UploadProgress } from '../services/imageUploadService';
import { ImageWithFallback } from './ImageWithFallback';

interface TemplateEditorWithThemeSelectorProps {
  templateId: string;
  onThemeChange?: (theme: QuoteTheme) => void;
}

export type QuoteTheme = 'moderno' | 'classico' | 'romantico' | 'vibrante' | 'natural' | 'minimalista' | 'darkstudio' | 'promocional' | 'oferta' | 'pdf-elegante' | 'pdf-elegante-2' | 'ferias' | 'carnaval' | 'mes-da-mulher' | 'mes-do-consumidor' | 'pascoa' | 'dia-das-maes' | 'mes-das-noivas' | 'dia-dos-namorados' | 'sao-joao' | 'orgulho-lgbt' | 'dia-do-amigo' | 'dia-dos-avos' | 'dia-dos-pais' | 'dia-do-irmao' | 'dia-do-cliente' | 'dia-das-criancas' | 'halloween' | 'black-friday' | 'natal' | 'revellon' | 'oferta-primavera' | 'oferta-verao' | 'oferta-outono' | 'oferta-inverno';

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

  // ── Font selector state ──
  const [selectedFont, setSelectedFont] = useState<string>('Inter');
  const [savingFont, setSavingFont] = useState(false);
  const [fontSaveMessage, setFontSaveMessage] = useState('');

  // ── Custom theme states ──
  const [customThemes, setCustomThemes] = useState<any[]>([]);
  const [selectedCustomThemeId, setSelectedCustomThemeId] = useState<string | null>(null);
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

  useEffect(() => {
    loadCurrentTheme();
  }, [templateId]);

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
      console.log('🔍 [TemplateThemeSelector] Carregando tema para templateId:', templateId);

      const { data: templateData, error: templateError } = await supabase
        .from('templates')
        .select('tema, slug_template, user_id, cover_image_url, footer_image_url, fonte_personalizada, tema_personalizado_id')
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

        if (templateData.tema_personalizado_id) {
          setSelectedCustomThemeId(templateData.tema_personalizado_id);
        } else {
          setSelectedCustomThemeId(null);
        }

        if (templateData.fonte_personalizada) {
          setSelectedFont(templateData.fonte_personalizada);
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
          loadCustomThemes(templateData.user_id);
          
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
        .update({ 
          tema: theme,
          tema_personalizado_id: null // clear custom theme when selecting standard theme
        })
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
      setSelectedCustomThemeId(null);
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

  const handleSelectCustomTheme = async (customTheme: any) => {
    setSaving(true);
    setSaveMessage('');
    try {
      const { error } = await supabase
        .from('templates')
        .update({
          tema_personalizado_id: customTheme.id,
          tema: customTheme.tema_base
        })
        .eq('id', templateId);

      if (error) throw error;

      setSelectedCustomThemeId(customTheme.id);
      setSelectedTheme(customTheme.tema_base as QuoteTheme);
      setSaveMessage(`Tema personalizado "${customTheme.nome}" ativado com sucesso!`);

      if (onThemeChange) {
        onThemeChange(customTheme.tema_base as QuoteTheme);
      }

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
        .from('templates')
        .update({
          tema_personalizado_id: newTheme.id,
          tema: selectedTheme
        })
        .eq('id', templateId);

      if (updateError) throw updateError;

      setSelectedCustomThemeId(newTheme.id);
      setSaveMessage(`Tema personalizado "${customThemeName}" criado e ativado!`);
      setIsCustomizing(false);
      setCustomThemeName('');
      
      if (userId) {
        loadCustomThemes(userId);
      }

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
          .from('templates')
          .update({ tema_personalizado_id: null })
          .eq('id', templateId);
        setSelectedCustomThemeId(null);
      }

      if (userId) {
        loadCustomThemes(userId);
      }
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
        .from('templates')
        .update({ fonte_personalizada: font })
        .eq('id', templateId);

      if (error) throw error;
      setSelectedFont(font);
      setFontSaveMessage('Fonte salva com sucesso!');
      setTimeout(() => setFontSaveMessage(''), 4000);
    } catch (err) {
      console.error('❌ Erro ao salvar fonte:', err);
      setFontSaveMessage('Erro ao salvar fonte.');
      setTimeout(() => setFontSaveMessage(''), 3000);
    } finally {
      setSavingFont(false);
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
        maxSizeMB: 5,
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

  const classicThemes = [
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
    {
      id: 'pdf-elegante-2' as QuoteTheme,
      name: 'PDF Elegante 2 📸',
      description: 'Variação sem barra preta — imagem de capa full-bleed com "PROPOSTA" em contraste automático',
      icon: BookOpen,
      color: 'from-zinc-800 to-stone-500',
      textColor: 'text-stone-700 dark:text-stone-300',
      bgColor: 'bg-zinc-800',
      borderColor: 'border-stone-500',
    },
  ];

  const specialThemes = [
    { id: 'natal' as QuoteTheme, name: '🎄 Natal', description: 'Natalino tradicional sofisticado com vermelho e verde', icon: Sparkles, color: 'from-red-700 to-emerald-600', textColor: 'text-red-650', bgColor: 'bg-red-50', borderColor: 'border-red-500' },
    { id: 'revellon' as QuoteTheme, name: '🎆 Réveillon', description: 'Tema luxuoso de virada do ano com dourado e prata', icon: Sparkles, color: 'from-amber-500 to-slate-200', textColor: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-500' },
    { id: 'ferias' as QuoteTheme, name: '☀️ Férias', description: 'Visual ensolarado e alegre em tons quentes de praia', icon: Leaf, color: 'from-yellow-500 to-orange-500', textColor: 'text-orange-650', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-500' },
    { id: 'carnaval' as QuoteTheme, name: '🎉 Carnaval', description: 'Explosão de cores vibrantes, alegria e purpurina', icon: Palette, color: 'from-purple-600 to-pink-500', textColor: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-500' },
    { id: 'mes-da-mulher' as QuoteTheme, name: '♀️ Mês da Mulher', description: 'Inspirador e elegante em tons de roxo e lavanda', icon: Palette, color: 'from-violet-600 to-fuchsia-500', textColor: 'text-violet-600', bgColor: 'bg-violet-50', borderColor: 'border-violet-500' },
    { id: 'mes-do-consumidor' as QuoteTheme, name: '🛒 Mês do Consumidor', description: 'Chamativo e moderno com cores focadas em conversão', icon: Flame, color: 'from-blue-600 to-amber-500', textColor: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-500' },
    { id: 'pascoa' as QuoteTheme, name: '🐰 Páscoa', description: 'Design acolhedor e doce em tons pastéis e chocolate', icon: Sparkles, color: 'from-amber-850 to-yellow-600', textColor: 'text-amber-800', bgColor: 'bg-amber-50', borderColor: 'border-amber-500' },
    { id: 'dia-das-maes' as QuoteTheme, name: '🌸 Dia das Mães', description: 'Design amoroso e sensível em tons de rosa e lavanda', icon: Sparkles, color: 'from-pink-500 to-rose-400', textColor: 'text-pink-650', bgColor: 'bg-pink-50', borderColor: 'border-pink-500' },
    { id: 'mes-das-noivas' as QuoteTheme, name: '👰 Mês das Noivas', description: 'Romantismo e sofisticação clássica em branco e cinza suave', icon: BookOpen, color: 'from-stone-800 to-stone-500', textColor: 'text-stone-700', bgColor: 'bg-stone-50', borderColor: 'border-stone-500' },
    { id: 'dia-dos-namorados' as QuoteTheme, name: '❤️ Dia dos Namorados', description: 'Apaixonado e intenso em tons de vermelho escarlate', icon: Sparkles, color: 'from-red-600 to-rose-500', textColor: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-500' },
    { id: 'sao-joao' as QuoteTheme, name: '🔥 São João', description: 'Tons de fogueira quentes e alegres de Festa Junina', icon: Flame, color: 'from-amber-600 to-orange-500', textColor: 'text-orange-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-500' },
    { id: 'orgulho-lgbt' as QuoteTheme, name: '🏳️‍🌈 Orgulho LGBT', description: 'Celebrando o amor com cores vibrantes do arco-íris', icon: Palette, color: 'from-pink-500 to-indigo-500', textColor: 'text-indigo-600', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-500' },
    { id: 'dia-do-amigo' as QuoteTheme, name: '🤝 Dia do Amigo', description: 'Acolhedor e amigável em tons de azul e amarelo', icon: Sparkles, color: 'from-sky-600 to-yellow-500', textColor: 'text-sky-600', bgColor: 'bg-sky-50', borderColor: 'border-sky-500' },
    { id: 'dia-dos-avos' as QuoteTheme, name: '👵 Dia dos Avós', description: 'Estilo clássico, aconchegante e afetuoso', icon: Leaf, color: 'from-emerald-700 to-emerald-600', textColor: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-500' },
    { id: 'dia-dos-pais' as QuoteTheme, name: '👔 Dia dos Pais', description: 'Elegante e corporativo em tons sóbrios de azul escuro', icon: BookOpen, color: 'from-slate-800 to-slate-650', textColor: 'text-slate-800', bgColor: 'bg-slate-50', borderColor: 'border-slate-500' },
    { id: 'dia-do-irmao' as QuoteTheme, name: '🧑‍🤝‍🧑 Dia do Irmão', description: 'Divertido, moderno e dinâmico com tons de teal e laranja', icon: Palette, color: 'from-teal-600 to-orange-500', textColor: 'text-teal-600', bgColor: 'bg-teal-50', borderColor: 'border-teal-500' },
    { id: 'dia-do-cliente' as QuoteTheme, name: '👑 Dia do Cliente', description: 'Visual premium, focado em prestígio e dourado', icon: Sparkles, color: 'from-zinc-900 to-amber-500', textColor: 'text-amber-500', bgColor: 'bg-zinc-900', borderColor: 'border-zinc-800' },
    { id: 'dia-das-criancas' as QuoteTheme, name: '🎈 Dia das Crianças', description: 'Lúdico, divertido e muito colorido em tons pastéis alegres', icon: Palette, color: 'from-sky-500 to-pink-400', textColor: 'text-sky-600', bgColor: 'bg-sky-50', borderColor: 'border-sky-500' },
    { id: 'halloween' as QuoteTheme, name: '🎃 Halloween', description: 'Estilo dark temático com tons de laranja e roxo', icon: Moon, color: 'from-orange-600 to-purple-500', textColor: 'text-orange-400', bgColor: 'bg-zinc-900', borderColor: 'border-zinc-850' },
    { id: 'black-friday' as QuoteTheme, name: '🏷️ Black Friday', description: 'Minimalista escuro de altíssimo impacto com amarelo neon', icon: Flame, color: 'from-yellow-500 to-black', textColor: 'text-yellow-400', bgColor: 'bg-zinc-900', borderColor: 'border-zinc-850' },
    { id: 'oferta-primavera' as QuoteTheme, name: '🌸 Oferta de Primavera', description: 'Visual fresco e vibrante com tons florais e coloridos', icon: Leaf, color: 'from-emerald-600 to-pink-500', textColor: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-500' },
    { id: 'oferta-verao' as QuoteTheme, name: '☀️ Oferta de Verão', description: 'Energia solar e calorosa em tons de amarelo e laranja', icon: Leaf, color: 'from-yellow-500 to-orange-500', textColor: 'text-orange-650', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-500' },
    { id: 'oferta-outono' as QuoteTheme, name: '🍁 Oferta de Outono', description: 'Visual sofisticado e sóbrio em tons terrosos e âmbar', icon: Leaf, color: 'from-amber-700 to-amber-500', textColor: 'text-amber-800', bgColor: 'bg-amber-50', borderColor: 'border-amber-500' },
    { id: 'oferta-inverno' as QuoteTheme, name: '❄️ Oferta de Inverno', description: 'Estilo aconchegante e elegante em tons de azul e cinza frio', icon: Moon, color: 'from-sky-700 to-slate-500', textColor: 'text-sky-750', bgColor: 'bg-sky-50', borderColor: 'border-sky-500' },
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
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Escolha o Design da Página de Orçamento</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Selecione o estilo visual que melhor representa sua marca. Cada tema tem um layout completamente diferente.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsCustomizing(!isCustomizing);
              if (!isCustomizing) {
                // Prefill colors with current selected theme colors if possible
                const activeCustom = customThemes.find(t => t.id === selectedCustomThemeId);
                if (activeCustom) {
                  setCustomColors(activeCustom.cores || {});
                  setCustomThemeName(activeCustom.nome);
                } else {
                  setCustomColors({
                    bgPrincipal: '#f8fafc',
                    bgCard: '#ffffff',
                    primaria: '#2563eb',
                    textoPrincipal: '#0f172a',
                    textoSecundario: '#475569',
                    borda: '#cbd5e1',
                  });
                  setCustomThemeName('');
                }
              }
            }}
            className="px-4 py-2 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-750 transition-colors flex items-center gap-1.5 self-start md:self-center"
          >
            <Palette className="w-4 h-4" />
            {isCustomizing ? 'Fechar Personalização' : '🎨 Personalizar Cores'}
          </button>
        </div>

        {isCustomizing && (
          <div className="mb-6 p-5 bg-gray-50 dark:bg-[#07101f] border-2 border-dashed border-violet-300 dark:border-violet-850/50 rounded-xl space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Palette className="w-5 h-5 text-violet-500" />
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">Ajustes de Cores do Tema Customizado</h4>
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
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Cor do Botão de Envio</label>
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
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Texto Secundário / Labels</label>
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
                  placeholder="Ex: Minha Identidade Visual"
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
                Salvar como Tema Customizado
              </button>
            </div>
          </div>
        )}

        <div className="space-y-8 max-h-[500px] overflow-y-auto p-2 border border-gray-100 dark:border-white/5 rounded-xl">
          {/* Meus Temas Personalizados */}
          {customThemes.length > 0 && (
            <div className="border-b border-gray-150 dark:border-[rgba(255,255,255,0.06)] pb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4 flex items-center gap-1.5">
                <span>🎨 Meus Temas Personalizados</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {customThemes.map((theme) => {
                  const isSelected = selectedCustomThemeId === theme.id;
                  return (
                    <div
                      key={theme.id}
                      onClick={() => handleSelectCustomTheme(theme)}
                      className={`relative group rounded-xl p-5 border-2 transition-all text-left h-full flex flex-col justify-between cursor-pointer ${isSelected
                          ? 'border-violet-500 shadow-lg bg-white dark:bg-[#0c1b30]'
                          : 'border-gray-200 dark:border-[rgba(255,255,255,.08)] hover:border-gray-300 dark:hover:border-[rgba(255,255,255,.2)] bg-gray-50 dark:bg-[#07101f]'
                        }`}
                    >
                      <div>
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-2xl shadow-inner border border-gray-200 dark:border-white/10"
                          style={{ backgroundColor: theme.cores?.bgPrincipal || '#f1f5f9' }}
                        >
                          🎨
                        </div>
                        <h4 className={`text-sm font-bold mb-1 truncate ${isSelected ? 'text-violet-600 dark:text-violet-400' : 'text-gray-900 dark:text-white'}`}>
                          {theme.nome}
                        </h4>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          Base: {theme.tema_base}
                        </p>
                      </div>
                      <div className="mt-4 pt-2 border-t border-gray-150 dark:border-white/5 flex items-center justify-between">
                        <span className="text-[9px] text-gray-400">{new Date(theme.created_at).toLocaleDateString()}</span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteCustomTheme(theme.id, e)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          title="Excluir tema personalizado"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {isSelected && (
                        <div className="absolute top-3 right-3">
                          <div className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Estilos Clássicos */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4 flex items-center gap-1.5">
              <span>🌟 Estilos Clássicos</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {classicThemes.map((theme) => {
                const Icon = theme.icon;
                const isSelected = selectedTheme === theme.id;

                return (
                  <button
                    key={theme.id}
                    onClick={() => saveTheme(theme.id)}
                    disabled={saving}
                    className={`relative group transition-all duration-300 ${isSelected ? 'transform scale-102' : 'hover:scale-102'
                      } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div
                      className={`rounded-xl p-5 border-2 transition-all text-left h-full flex flex-col justify-between ${isSelected
                          ? `${theme.borderColor} shadow-lg bg-white dark:bg-[#0c1b30]`
                          : 'border-gray-200 dark:border-[rgba(255,255,255,.08)] hover:border-gray-300 dark:hover:border-[rgba(255,255,255,.2)] bg-gray-50 dark:bg-[#07101f]'
                        }`}
                    >
                      <div>
                        <div
                          className={`w-12 h-12 rounded-lg bg-gradient-to-br ${theme.color} flex items-center justify-center mb-4 transition-transform ${isSelected ? 'scale-105' : 'group-hover:scale-105'
                            }`}
                        >
                          <Icon className="w-6 h-6 text-white" />
                        </div>

                        <h4 className={`text-sm font-bold mb-1 ${isSelected ? theme.textColor : 'text-gray-900 dark:text-white'}`}>
                          {theme.name}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {theme.description}
                        </p>
                      </div>

                      {isSelected && (
                        <div className="absolute top-3 right-3">
                          <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${theme.color} flex items-center justify-center`}>
                            <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Temas Especiais */}
          <div className="border-t border-gray-100 dark:border-[rgba(255,255,255,0.06)] pt-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4 flex items-center gap-1.5">
              <span>🎉 Temas Especiais (Sazonais &amp; Festivos)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {specialThemes.map((theme) => {
                const Icon = theme.icon;
                const isSelected = selectedTheme === theme.id;

                return (
                  <button
                    key={theme.id}
                    onClick={() => saveTheme(theme.id)}
                    disabled={saving}
                    className={`relative group transition-all duration-300 ${isSelected ? 'transform scale-102' : 'hover:scale-102'
                      } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div
                      className={`rounded-xl p-5 border-2 transition-all text-left h-full flex flex-col justify-between ${isSelected
                          ? `${theme.borderColor} shadow-lg bg-white dark:bg-[#0c1b30]`
                          : 'border-gray-200 dark:border-[rgba(255,255,255,.08)] hover:border-gray-300 dark:hover:border-[rgba(255,255,255,.2)] bg-gray-50 dark:bg-[#07101f]'
                        }`}
                    >
                      <div>
                        <div
                          className={`w-12 h-12 rounded-lg bg-gradient-to-br ${theme.color} flex items-center justify-center mb-4 transition-transform ${isSelected ? 'scale-105' : 'group-hover:scale-105'
                            }`}
                        >
                          <Icon className="w-6 h-6 text-white" />
                        </div>

                        <h4 className={`text-sm font-bold mb-1 ${isSelected ? theme.textColor : 'text-gray-900 dark:text-white'}`}>
                          {theme.name}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {theme.description}
                        </p>
                      </div>

                      {isSelected && (
                        <div className="absolute top-3 right-3">
                          <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${theme.color} flex items-center justify-center`}>
                            <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Seção específica de imagens para o tema PDF Elegante */}
        {/* ── FONT SELECTOR ── */}
        <div className="mt-8 border-t border-gray-200 dark:border-[rgba(255,255,255,0.08)] pt-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
              <Type className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">Tipografia da Página</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">Escolha a fonte que será usada em todo o seu orçamento</p>
            </div>
          </div>

          {/* Google Fonts link for preview */}
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

          {/* Live preview */}
          <div
            className="mt-4 p-4 rounded-xl border border-gray-200 dark:border-[rgba(255,255,255,.08)] bg-gray-50 dark:bg-white/5"
            style={{ fontFamily: `'${selectedFont}', sans-serif` }}
          >
            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Preview da fonte</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">Orçamento Profissional</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Serviços e valores personalizados para você.</p>
          </div>

          {fontSaveMessage && (
            <div className={`mt-3 p-3 rounded-lg border ${
              fontSaveMessage.includes('sucesso')
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            } text-sm font-medium flex items-center gap-2`}>
              {savingFont
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : fontSaveMessage.includes('sucesso') ? <Check className="w-4 h-4" /> : null
              }
              {fontSaveMessage}
            </div>
          )}
        </div>

        {(selectedTheme === 'pdf-elegante' || selectedTheme === 'pdf-elegante-2') && (
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
