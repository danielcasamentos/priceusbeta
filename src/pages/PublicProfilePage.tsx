import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabase';
import { PublicProfileOriginal } from '../components/PublicProfileOriginal';
import { PublicProfileMinimalist } from '../components/PublicProfileMinimalist';
import { PublicProfileModern } from '../components/PublicProfileModern';
import { PublicProfileMagazine } from '../components/PublicProfileMagazine';
import { PublicProfileDarkStudio } from '../components/PublicProfileDarkStudio';
import { PublicProfilePdfElegante } from '../components/PublicProfilePdfElegante';

interface Profile {
  id: string;
  nome_profissional: string;
  tipo_fotografia: string;
  profile_image_url: string;
  apresentacao: string;
  instagram: string;
  whatsapp_principal: string;
  email_recebimento: string;
  slug_usuario: string;
  meta_description: string;
  tema_perfil?: string;
  fonte_personalizada?: string;
  tema_personalizado_id?: string;
  tema_personalizado?: {
    id: string;
    nome: string;
    cores: {
      bgPrincipal: string;
      bgCard: string;
      primaria: string;
      textoPrincipal: string;
      textoSecundario: string;
      borda: string;
    };
  };
  portfolio_link?: string | null;
  portfolio_fotos?: string[] | null;
}

interface Template {
  id: string;
  nome_template: string;
  titulo_template?: string;
  descricao_perfil?: string;
  ocultar_data_criacao?: boolean;
  slug_template: string;
  created_at: string;
  tema?: string;
}

interface Review {
  id: string;
  cliente_nome: string;
  rating: number;
  comentario: string;
  created_at: string;
}

interface PublicGallery {
  id: string;
  title: string;
  slug: string;
  cover_photo_url?: string | null;
  event_date?: string | null;
}

export function PublicProfilePage() {
  const { slugUsuario } = useParams<{ slugUsuario: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [galleries, setGalleries] = useState<PublicGallery[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (slugUsuario) {
      loadPublicProfile();
    }
  }, [slugUsuario]);

  const loadPublicProfile = async () => {
    setLoading(true);
    try {
      const timestamp = new Date().getTime();
      console.log('🔄 [PublicProfilePage] Carregando perfil às:', new Date().toLocaleTimeString());
      console.log('🔄 [PublicProfilePage] Cache bust timestamp:', timestamp);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*, tema_personalizado:temas_personalizados(*)')
        .eq('slug_usuario', slugUsuario)
        .eq('perfil_publico', true)
        .maybeSingle();

      console.log('🎨 [PublicProfilePage] Dados do perfil carregados:', profileData);
      console.log('🎨 [PublicProfilePage] tema_perfil do banco:', profileData?.tema_perfil);
      console.log('🎨 [PublicProfilePage] Tipo do tema_perfil:', typeof profileData?.tema_perfil);

      if (profileError || !profileData) {
        console.error('❌ [PublicProfilePage] Erro ao carregar perfil:', profileError);
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile(profileData);

      await supabase.rpc('increment_profile_views', { profile_slug: slugUsuario });

      // Buscar galerias marcadas para exibição no portfólio público
      const { data: galleriesData } = await supabase
        .from('galleries')
        .select('id, title, slug, cover_photo_url, event_date')
        .eq('user_id', profileData.id)
        .eq('is_public_portfolio', true)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      setGalleries(galleriesData || []);

      const { data: templatesData } = await supabase
        .from('templates')
        .select('id, nome_template, titulo_template, slug_template, created_at, ordem_exibicao, descricao_perfil, ocultar_data_criacao, tema')
        .eq('user_id', profileData.id)
        .eq('exibir_no_perfil', true)
        .not('slug_template', 'is', null)
        .order('ordem_exibicao', { ascending: true })
        .order('created_at', { ascending: false });

      // Filter out any templates with null or empty slug_template
      const validTemplates = (templatesData || []).filter(t => t.slug_template && t.slug_template.trim() !== '');
      setTemplates(validTemplates);

      const { data: reviewsData } = await supabase
        .from('avaliacoes')
        .select('*')
        .eq('profile_id', profileData.id)
        .eq('visivel', true)
        .gte('rating', profileData.rating_minimo_exibicao || 1)
        .order('rating', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      setReviews(reviewsData || []);

      if (reviewsData && reviewsData.length > 0) {
        const avg = reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length;
        setAverageRating(avg);
      }
    } catch (error) {
      console.error('❌ [PublicProfilePage] Error loading public profile:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Perfil não encontrado</h1>
          <p className="text-gray-600 mb-6">Este perfil não existe ou não está público.</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Voltar para início
          </Link>
        </div>
      </div>
    );
  }

  const pageTitle = profile ? `${profile.nome_profissional}${profile.tipo_fotografia ? ` - ${profile.tipo_fotografia}` : ''} | PriceU$` : 'PriceU$';
  const pageDescription = profile?.meta_description || profile?.apresentacao?.substring(0, 160) || `Confira os serviços e orçamentos de ${profile?.nome_profissional}`;
  const pageUrl = `https://priceus.com.br/${slugUsuario}`;

  const renderProfileTheme = () => {
    const tema = profile?.tema_perfil || 'original';
    const commonProps = { profile, templates, reviews, averageRating, galleries };

    console.log('========================================');
    console.log('🎨 [RENDER] Iniciando renderização do tema');
    console.log('🎨 [RENDER] Tema selecionado:', tema);
    console.log('🎨 [RENDER] profile.tema_perfil:', profile?.tema_perfil);
    console.log('🎨 [RENDER] Valores possíveis: original, minimalist, modern, magazine');
    console.log('========================================');

    switch (tema) {
      case 'minimalist':
        console.log('✅ [RENDER] Componente: PublicProfileMinimalist');
        return <PublicProfileMinimalist {...commonProps} />;
      case 'modern':
        console.log('✅ [RENDER] Componente: PublicProfileModern');
        return <PublicProfileModern {...commonProps} />;
      case 'magazine':
        console.log('✅ [RENDER] Componente: PublicProfileMagazine');
        return <PublicProfileMagazine {...commonProps} />;
      case 'darkstudio':
        console.log('✅ [RENDER] Componente: PublicProfileDarkStudio');
        return <PublicProfileDarkStudio {...commonProps} />;
      case 'pdf_elegante':
        console.log('✅ [RENDER] Componente: PublicProfilePdfElegante');
        return <PublicProfilePdfElegante {...commonProps} />;
      case 'original':
        console.log('✅ [RENDER] Componente: PublicProfileOriginal');
        return <PublicProfileOriginal {...commonProps} />;
      default:
        console.log('⚠️ [RENDER] Tema desconhecido "' + tema + '", usando Original');
        return <PublicProfileOriginal {...commonProps} />;
    }
  };

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:type" content="profile" />
        {profile?.profile_image_url && (
          <meta property="og:image" content={profile.profile_image_url} />
        )}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        {profile?.profile_image_url && (
          <meta name="twitter:image" content={profile.profile_image_url} />
        )}
        <link rel="canonical" href={pageUrl} />
        {profile.fonte_personalizada && (
          <link
            rel="stylesheet"
            href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(profile.fonte_personalizada)}:wght@300;400;500;600;700;800;900&display=swap`}
          />
        )}
      </Helmet>

      {profile.fonte_personalizada && (
        <style>{`
          .public-profile-root,
          .public-profile-root *,
          .public-profile-root p,
          .public-profile-root h1,
          .public-profile-root h2,
          .public-profile-root h3,
          .public-profile-root h4,
          .public-profile-root span,
          .public-profile-root a,
          .public-profile-root button {
            font-family: '${profile.fonte_personalizada}', sans-serif !important;
          }
        `}</style>
      )}

      {profile.tema_personalizado && (
        <style>{`
          ${profile.tema_personalizado.cores.bgPrincipal ? `
            .public-profile-root,
            .public-profile-root .min-h-screen {
              background: ${profile.tema_personalizado.cores.bgPrincipal} !important;
              background-image: none !important;
            }
          ` : ''}
          ${profile.tema_personalizado.cores.bgCard ? `
            .public-profile-root .bg-white,
            .public-profile-root .bg-gray-50,
            .public-profile-root .bg-slate-50,
            .public-profile-root .bg-amber-50,
            .public-profile-root .bg-[#07101f],
            .public-profile-root .bg-[#0a1628],
            .public-profile-root [class*="bg-white"],
            .public-profile-root .bg-white\\/5,
            .public-profile-root .rounded-3xl,
            .public-profile-root .shadow-2xl {
              background-color: ${profile.tema_personalizado.cores.bgCard} !important;
              background-image: none !important;
            }
          ` : ''}
          ${profile.tema_personalizado.cores.primaria ? `
            .public-profile-root a.bg-blue-600,
            .public-profile-root a.bg-green-600,
            .public-profile-root a.bg-gradient-to-r,
            .public-profile-root button.border-blue-600,
            .public-profile-root .bg-blue-600,
            .public-profile-root .bg-green-600,
            .public-profile-root .bg-gradient-to-r,
            .public-profile-root .bg-blue-500,
            .public-profile-root .bg-green-500 {
              background: ${profile.tema_personalizado.cores.primaria} !important;
              background-image: none !important;
              border-color: ${profile.tema_personalizado.cores.primaria} !important;
              color: #ffffff !important;
            }
            .public-profile-root .text-blue-600,
            .public-profile-root .text-blue-750,
            .public-profile-root .text-blue-700,
            .public-profile-root .text-green-600,
            .public-profile-root .text-green-700,
            .public-profile-root .group-hover\\:text-blue-600 {
              color: ${profile.tema_personalizado.cores.primaria} !important;
            }
          ` : ''}
          ${profile.tema_personalizado.cores.textoPrincipal ? `
            .public-profile-root h1,
            .public-profile-root h2,
            .public-profile-root h3,
            .public-profile-root h4,
            .public-profile-root h5,
            .public-profile-root h6,
            .public-profile-root strong,
            .public-profile-root .text-gray-900,
            .public-profile-root .text-slate-900,
            .public-profile-root .text-neutral-900 {
              color: ${profile.tema_personalizado.cores.textoPrincipal} !important;
            }
          ` : ''}
          ${profile.tema_personalizado.cores.textoSecundario ? `
            .public-profile-root p,
            .public-profile-root span,
            .public-profile-root label,
            .public-profile-root .text-gray-700,
            .public-profile-root .text-slate-700,
            .public-profile-root .text-neutral-700,
            .public-profile-root .text-gray-600,
            .public-profile-root .text-slate-600,
            .public-profile-root .text-neutral-600 {
              color: ${profile.tema_personalizado.cores.textoSecundario} !important;
            }
          ` : ''}
          ${profile.tema_personalizado.cores.borda ? `
            .public-profile-root .border-2,
            .public-profile-root .border-4,
            .public-profile-root .border,
            .public-profile-root .border-blue-200,
            .public-profile-root .border-gray-200 {
              border-color: ${profile.tema_personalizado.cores.borda} !important;
            }
          ` : ''}
        `}</style>
      )}

      <div className="public-profile-root">
        {renderProfileTheme()}
      </div>
    </>
  );
}
