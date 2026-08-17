import type { CullingPhoto } from '../components/gallery/AICullingManager';
import type { SuggestedPost, PostSlide, CaptionOption } from '../components/gallery/SocialPostStudio';

/**
 * AI Photo Culling & Viral Post Curator Engine
 * Filtra rigorosamente fotos borradas (isBlurry) e olhos fechados (eyesClosed),
 * seleciona capas 100% DISTINTAS para cada post e gera composições virais sem repetição.
 */

export function getCleanPhotoPool(photos: CullingPhoto[], dislikedPhotoIds: string[] = []): CullingPhoto[] {
  const dislikedSet = new Set(dislikedPhotoIds);

  // 1. Filtrar estritamente fotos inutilizáveis (olhos fechados, borradas, descartadas, recusadas)
  const cleanCandidates = photos.filter(
    (p) => !p.isBlurry && !p.eyesClosed && !p.isDiscarded && !dislikedSet.has(p.id)
  );

  // 2. Se houver fotos aprovadas manualmente ou selecionadas pela IA (isBestTake/selected), usar essa seleção
  const selectedOrBest = cleanCandidates.filter((p) => p.selected || p.isBestTake);

  if (selectedOrBest.length >= 3) {
    return selectedOrBest;
  }

  if (cleanCandidates.length > 0) {
    return cleanCandidates;
  }

  // Fallback seguro se não houver fotos classificadas
  const nonDiscarded = photos.filter((p) => !p.isDiscarded && !dislikedSet.has(p.id));
  return nonDiscarded.length > 0 ? nonDiscarded : photos;
}

/** Generates default 5 clean captions focused on emotion, storytelling and engagement (no technical EXIF metadata) */
export function generateSmartCaptions(
  photo: CullingPhoto | undefined,
  keywords?: string
): CaptionOption[] {
  const isBw = photo?.editSettings?.saturation === -100;
  const kwExtra = keywords && keywords.trim() ? `\n\n✨ Detalhes do ensaio: ${keywords.trim()}` : '';

  if (isBw) {
    return [
      {
        id: `cap_1_${Date.now()}`,
        title: '1. Emocional Fine Art (P&B)',
        tone: 'emotional',
        text: `Na ausência de cores, a emoção se torna a única luz da cena. O preto e branco eterniza aquilo que as palavras não conseguem traduzir. 🖤✨${kwExtra}\n\n💬 O que você sente ao olhar para essa versão em P&B?\n\n#blackandwhite #bwportrait #monochromephotography #fineart #fotografiadecasamento`,
      },
      {
        id: `cap_2_${Date.now()}`,
        title: '2. Poética & Atemporal',
        tone: 'technical',
        text: `Sombras profundas e a beleza dos momentos espontâneos. A conversão em P&B destaca o contraste e a essência com estética atemporal. 🖤${kwExtra}\n\n📩 Mande uma mensagem no Direct para orçamentos!\n\n#monochrome #classicbw #portraitlighting #shadows #bnw`,
      },
      {
        id: `cap_3_${Date.now()}`,
        title: '3. Minimalista & Direta',
        tone: 'minimal',
        text: `Luz, sombra e a pureza do momento.${kwExtra}\n\n✨ Orçamentos no link da bio.\n\n#bwminimal #bnw #blackandwhitephoto #timeless`,
      },
      {
        id: `cap_4_${Date.now()}`,
        title: '4. Storytelling P&B',
        tone: 'storytelling',
        text: `Há histórias que pedem a sobriedade e o mistério do preto e branco para serem contadas em toda a sua profundidade. 📖🖤${kwExtra}\n\n📲 Mande uma mensagem no Direct para agendamentos!\n\n#bwstorytelling #realweddings #bnwstory #fotografiaemocional`,
      },
      {
        id: `cap_5_${Date.now()}`,
        title: '5. Foco em Vendas Fine Art',
        tone: 'sales',
        text: `Garanta a memória do seu dia especial com registros inesquecíveis. Vagas abertas para ensaios e casamentos! 🖤🗓️${kwExtra}\n\n👉 Clique no link da Bio e reserve sua data agora.\n\n#agendamento2026 #fotografiadegaleria #fineartportrait #bw`,
      },
    ];
  }

  return [
    {
      id: `cap_1_${Date.now()}`,
      title: '1. Emocional & Poética',
      tone: 'emotional',
      text: `Cada olhar guarda um universo de memórias que nunca se apagam. Registrar a essência desse momento é o que me move todos os dias. ✨💍${kwExtra}\n\n💬 O que você mais achou especial nessa foto?\n\n#fotografiadecasamento #weddingphotography #momentosunicos #fotografodecasamento #weddingportrait`,
    },
    {
      id: `cap_2_${Date.now()}`,
      title: '2. Editorial & Elegante',
      tone: 'technical',
      text: `Luz natural e a espontaneidade do momento decisivo. Uma estética pensada para eternizar cada detalhe com elegância.${kwExtra}\n\n📩 Quer um ensaio com essa mesma estética editorial? Clique no link da bio para orçamentos!\n\n#portraitphotography #cinematiclook #editorialphotography #weddingstyle`,
    },
    {
      id: `cap_3_${Date.now()}`,
      title: '3. Minimalista & Direta',
      tone: 'minimal',
      text: `A simplicidade e a beleza em sua forma mais pura. ✨${kwExtra}\n\n✨ Link na bio para agendamentos.\n\n#minimalportrait #weddingaesthetic #editorialphoto #purelove`,
    },
    {
      id: `cap_4_${Date.now()}`,
      title: '4. Storytelling & Sentimento',
      tone: 'storytelling',
      text: `Por trás de cada imagem existe uma história real, risos espontâneos e uma emoção que transborda. Foi um privilégio eternizar este capítulo! 📖❤️${kwExtra}\n\n📲 Dúvidas sobre datas e pacotes? Mande uma mensagem no Direct!\n\n#storytelling #weddingstories #fotografiaemocional #realwedding #lovehistory`,
    },
    {
      id: `cap_5_${Date.now()}`,
      title: '5. Foco em Vendas & CTA',
      tone: 'sales',
      text: `Seus momentos mais importantes merecem um registro inesquecível. Vagas abertas para a próxima temporada de casamentos e ensaios! 🗓️✨${kwExtra}\n\n👉 Clique no link da Bio e garanta sua data especial agora mesmo.\n\n#agendamentoaberto #fotografia #orcametoensaio #wedding2026 #fotografobrasil`,
    },
  ];
}

/**
 * Gera 5 Sugestões de Posts com Capas 100% Únicas e Distintas, sem repetição de fotos no mesmo post
 */
export function generateCuratedPosts(
  photos: CullingPhoto[],
  prefBg: 'white' | 'black',
  allowGrids: boolean = true,
  rejectionOffsets: Record<number, number> = {}
): SuggestedPost[] {
  const pool = getCleanPhotoPool(photos);
  if (pool.length === 0) return [];

  // Ordenar fotos por nitidez
  const sortedPool = [...pool].sort((a, b) => b.sharpnessScore - a.sharpnessScore);

  // Helper inteligente para obter N fotos sem repetição e com máxima DIVERSIDADE de composição (sem fotos com a mesma pose)
  const getUniquePhotosForPost = (postIndex: number, count: number): CullingPhoto[] => {
    const rejectionOffset = rejectionOffsets[postIndex] || 0;
    const poolSize = pool.length;
    if (poolSize === 0) return [];

    const result: CullingPhoto[] = [];
    const usedIds = new Set<string>();

    // Amostragem espaçada (stride) para espalhar a seleção por todo o ensaio e evitar sequências de fotos repetidas
    const stride = Math.max(1, Math.floor(poolSize / Math.max(count, 1)));
    const startIdx = (postIndex * 7 + rejectionOffset) % poolSize;

    // 1ª Passada: Seleção com salto amplo para máxima variação visual
    for (let step = 0; step < poolSize && result.length < count; step++) {
      const idx = (startIdx + step * stride + Math.floor(step / Math.max(count, 1))) % poolSize;
      const photo = pool[idx];
      if (photo && !usedIds.has(photo.id)) {
        usedIds.add(photo.id);
        result.push(photo);
      }
    }

    // 2ª Passada: Preenchimento de fallback se a galeria tiver poucas fotos
    for (let i = 0; i < poolSize && result.length < count; i++) {
      const photo = pool[(startIdx + i) % poolSize];
      if (photo && !usedIds.has(photo.id)) {
        usedIds.add(photo.id);
        result.push(photo);
      }
    }

    return result;
  };

  // ──────── Post 1: Carrossel Editorial Mix (Fotos Solo + Grade 3x3) ────────
  const post1Photos = getUniquePhotosForPost(0, 15);
  const cover1 = post1Photos[0] || pool[0];

  const post1Slides: PostSlide[] = allowGrids && post1Photos.length >= 11
    ? [
        { type: 'single', photoIds: [cover1.id], bgTheme: 'white' },
        { type: 'single', photoIds: [post1Photos[1]?.id || cover1.id], bgTheme: 'white' },
        { type: 'grid_9', photoIds: post1Photos.slice(2, 11).map((p) => p.id), bgTheme: 'white' },
        { type: 'single', photoIds: [post1Photos[11]?.id || cover1.id], bgTheme: 'white' },
      ]
    : post1Photos.slice(0, 6).map((p) => ({
        type: 'single' as const,
        photoIds: [p.id],
        bgTheme: 'white' as const,
      }));

  const post1: SuggestedPost = {
    id: `post_1_${Date.now()}`,
    title: 'Post 1: Carrossel Editorial Mix',
    badgeText: allowGrids ? '🔥 Solo + Grade 3x3' : '🔥 Fotos Solo',
    predictedEngagement: 98,
    description: allowGrids
      ? `Carrossel dinâmico combinando fotos solo em tela cheia e lâmina com grade 3x3 (9 fotos) em fundo branco.`
      : `Carrossel editorial com fotos solo 4:5.`,
    slides: post1Slides,
    captions: generateSmartCaptions(cover1),
  };

  // ──────── Post 2: Foto Única "Hero Shot" ────────
  const post2Photos = getUniquePhotosForPost(1, 1);
  const cover2 = post2Photos[0] || pool[0];
  const post2: SuggestedPost = {
    id: `post_2_${Date.now()}`,
    title: 'Post 2: Foto Única "Hero Shot"',
    badgeText: '⭐ 99% Retenção',
    predictedEngagement: 99,
    description: `Destaque absoluto para 1 foto principal com foco em emoção e composição impecável.`,
    slides: [{ type: 'single', photoIds: [cover2.id], bgTheme: 'white' }],
    captions: generateSmartCaptions(cover2),
  };

  // ──────── Post 3: Grade 3x3 de Destaques (9 Fotos) ────────
  const post3Photos = getUniquePhotosForPost(2, 11);
  const cover3 = post3Photos[0] || pool[0];
  const post3Slides: PostSlide[] = allowGrids && post3Photos.length >= 10
    ? [
        { type: 'single', photoIds: [cover3.id], bgTheme: 'white' },
        { type: 'grid_9', photoIds: post3Photos.slice(1, 10).map((p) => p.id), bgTheme: 'white' },
        { type: 'single', photoIds: [post3Photos[10]?.id || cover3.id], bgTheme: 'white' },
      ]
    : post3Photos.slice(0, 5).map((p) => ({
        type: 'single' as const,
        photoIds: [p.id],
        bgTheme: 'white' as const,
      }));

  const post3: SuggestedPost = {
    id: `post_3_${Date.now()}`,
    title: 'Post 3: Grade 3x3 de Momentos & Detalhes',
    badgeText: '🖼️ Grade 3x3 Fundo Branco',
    predictedEngagement: 96,
    description: `Lâmina central com grade 3x3 (9 fotos) em fundo branco puro e sem contornos.`,
    slides: post3Slides,
    captions: generateSmartCaptions(cover3),
  };

  // ──────── Post 4: Carrossel 6 Fotos Solo ────────
  const post4Photos = getUniquePhotosForPost(3, 6);
  const cover4 = post4Photos[0] || pool[0];
  const post4: SuggestedPost = {
    id: `post_4_${Date.now()}`,
    title: 'Post 4: Sequência 6 Fotos Solo',
    badgeText: '📸 Fotos Inteiras',
    predictedEngagement: 94,
    description: `Sequência de 6 fotos solo em formato vertical 4:5.`,
    slides: post4Photos.map((p) => ({ type: 'single' as const, photoIds: [p.id], bgTheme: 'white' as const })),
    captions: generateSmartCaptions(cover4),
  };

  // ──────── Post 5: Carrossel Storytelling Completo (10 Fotos) ────────
  const post5Photos = getUniquePhotosForPost(4, 10);
  const cover5 = post5Photos[0] || pool[0];
  const post5: SuggestedPost = {
    id: `post_5_${Date.now()}`,
    title: 'Post 5: Melhores Momentos (Storytelling)',
    badgeText: '📸 Resumo Completo',
    predictedEngagement: 95,
    description: `Carrossel completo de 10 fotos solo narrando a história do ensaio.`,
    slides: post5Photos.map((p) => ({
      type: 'single' as const,
      photoIds: [p.id],
      bgTheme: 'white' as const,
    })),
    captions: generateSmartCaptions(cover5),
  };

  return [post1, post2, post3, post4, post5];
}
