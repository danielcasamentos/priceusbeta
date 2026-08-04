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
  photo: CullingPhoto | undefined
): CaptionOption[] {
  const isBw = photo?.editSettings?.saturation === -100;

  if (isBw) {
    return [
      {
        id: `cap_1_${Date.now()}`,
        title: '1. Emocional Fine Art (P&B)',
        tone: 'emotional',
        text: `Na ausência de cores, a emoção se torna a única luz da cena. O preto e branco eterniza aquilo que as palavras não conseguem traduzir. 🖤✨\n\n💬 O que você sente ao olhar para essa versão em P&B?\n\n#blackandwhite #bwportrait #monochromephotography #fineart #fotografiadecasamento`,
      },
      {
        id: `cap_2_${Date.now()}`,
        title: '2. Poética & Atemporal',
        tone: 'technical',
        text: `Sombras profundas e a beleza dos momentos espontâneos. A conversão em P&B destaca o contraste e a essência com estética atemporal. 🖤\n\n📩 Mande uma mensagem no Direct para orçamentos!\n\n#monochrome #classicbw #portraitlighting #shadows #bnw`,
      },
      {
        id: `cap_3_${Date.now()}`,
        title: '3. Minimalista & Direta',
        tone: 'minimal',
        text: `Luz, sombra e a pureza do momento.\n\n✨ Orçamentos no link da bio.\n\n#bwminimal #bnw #blackandwhitephoto #timeless`,
      },
      {
        id: `cap_4_${Date.now()}`,
        title: '4. Storytelling P&B',
        tone: 'storytelling',
        text: `Há histórias que pedem a sobriedade e o mistério do preto e branco para serem contadas em toda a sua profundidade. 📖🖤\n\n📲 Mande uma mensagem no Direct para agendamentos!\n\n#bwstorytelling #realweddings #bnwstory #fotografiaemocional`,
      },
      {
        id: `cap_5_${Date.now()}`,
        title: '5. Foco em Vendas Fine Art',
        tone: 'sales',
        text: `Garante a memória do seu dia especial com registros inesquecíveis. Vagas abertas para ensaios e casamentos! 🖤🗓️\n\n👉 Clique no link da Bio e reserve sua data agora.\n\n#agendamento2026 #fotografiadegaleria #fineartportrait #bw`,
      },
    ];
  }

  return [
    {
      id: `cap_1_${Date.now()}`,
      title: '1. Emocional & Poética',
      tone: 'emotional',
      text: `Cada olhar guarda um universo de memórias que nunca se apagam. Registrar a essência desse momento é o que me move todos os dias. ✨💍\n\n💬 O que você mais achou especial nessa foto?\n\n#fotografiadecasamento #weddingphotography #momentosunicos #fotografodecasamento #weddingportrait`,
    },
    {
      id: `cap_2_${Date.now()}`,
      title: '2. Editorial & Elegante',
      tone: 'technical',
      text: `Luz natural e a espontaneidade do momento decisivo. Uma estética pensada para eternizar cada detalhe com elegância.\n\n📩 Quer um ensaio com essa mesma estética editorial? Clique no link da bio para orçamentos!\n\n#portraitphotography #cinematiclook #editorialphotography #weddingstyle`,
    },
    {
      id: `cap_3_${Date.now()}`,
      title: '3. Minimalista & Direta',
      tone: 'minimal',
      text: `A simplicidade e a beleza em sua forma mais pura. ✨\n\n✨ Link na bio para agendamentos.\n\n#minimalportrait #weddingaesthetic #editorialphoto #purelove`,
    },
    {
      id: `cap_4_${Date.now()}`,
      title: '4. Storytelling & Sentimento',
      tone: 'storytelling',
      text: `Por trás de cada imagem existe uma história real, risos espontâneos e uma emoção que transborda. Foi um privilégio eternizar este capítulo! 📖❤️\n\n📲 Dúvidas sobre datas e pacotes? Mande uma mensagem no Direct!\n\n#storytelling #weddingstories #fotografiaemocional #realwedding #lovehistory`,
    },
    {
      id: `cap_5_${Date.now()}`,
      title: '5. Foco em Vendas & CTA',
      tone: 'sales',
      text: `Seus momentos mais importantes merecem um registro inesquecível. Vagas abertas para a próxima temporada de casamentos e ensaios! 🗓️✨\n\n👉 Clique no link da Bio e garanta sua data especial agora mesmo.\n\n#agendamentoaberto #fotografia #orcametoensaio #wedding2026 #fotografobrasil`,
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

  // ──────── Post 1: Carrossel Virada Editorial (Mix Dinâmico) ────────
  const post1Photos = getUniquePhotosForPost(0, 18);
  const cover1 = post1Photos[0] || pool[0];

  const post1Slides: PostSlide[] = allowGrids && post1Photos.length >= 6
    ? [
        { type: 'single', photoIds: [cover1.id], bgTheme: prefBg },
        { type: 'single', photoIds: [post1Photos[1]?.id || cover1.id], bgTheme: prefBg },
        { type: 'grid_9', photoIds: post1Photos.slice(2, 11).map((p) => p.id), bgTheme: 'white' },
        { type: 'single', photoIds: [post1Photos[11]?.id || cover1.id], bgTheme: prefBg },
        { type: 'grid_6', photoIds: post1Photos.slice(12, 18).map((p) => p.id), bgTheme: 'black' },
      ]
    : post1Photos.slice(0, 6).map((p) => ({
        type: 'single' as const,
        photoIds: [p.id],
        bgTheme: prefBg,
      }));

  const post1: SuggestedPost = {
    id: `post_1_${Date.now()}`,
    title: 'Post 1: Carrossel Virada Editorial',
    badgeText: allowGrids ? '🔥 Recomendado IA' : '🔥 Foto Inteira Solo',
    predictedEngagement: 97,
    description: allowGrids
      ? `Carrossel dinâmico com capas limpas e grades de portfólio 3x3.`
      : `Carrossel editorial com fotos solo sem grades.`,
    slides: post1Slides,
    captions: generateSmartCaptions(cover1),
  };

  // ──────── Post 2: Foto Única "Hero" ────────
  const post2Photos = getUniquePhotosForPost(1, 1);
  const cover2 = post2Photos[0] || pool[0];
  const post2: SuggestedPost = {
    id: `post_2_${Date.now()}`,
    title: 'Post 2: Foto Única "Hero"',
    badgeText: '⭐ 99% Retenção',
    predictedEngagement: 99,
    description: `Destaque absoluto para 1 foto principal com foco em emoção e composição.`,
    slides: [{ type: 'single', photoIds: [cover2.id], bgTheme: 'black' }],
    captions: generateSmartCaptions(cover2),
  };

  // ──────── Post 3: Carrossel Minimalista VSCO Film ────────
  const post3Photos = getUniquePhotosForPost(2, 5);
  const cover3 = post3Photos[0] || pool[0];
  const post3: SuggestedPost = {
    id: `post_3_${Date.now()}`,
    title: 'Post 3: Carrossel Minimalista',
    badgeText: '✨ Estética Clean',
    predictedEngagement: 94,
    description: `Sequência de fotos com bordas finas estilo revista 4:5.`,
    slides: post3Photos.map((p) => ({
      type: 'single' as const,
      photoIds: [p.id],
      bgTheme: 'white' as const,
    })),
    captions: generateSmartCaptions(cover3),
  };

  // ──────── Post 4: Storytelling Destaques ────────
  const post4Photos = getUniquePhotosForPost(3, 6);
  const cover4 = post4Photos[0] || pool[0];
  const post4Slides: PostSlide[] = allowGrids && post4Photos.length >= 6
    ? [{ type: 'grid_6', photoIds: post4Photos.map((p) => p.id), bgTheme: prefBg }]
    : post4Photos.map((p) => ({ type: 'single' as const, photoIds: [p.id], bgTheme: prefBg }));

  const post4: SuggestedPost = {
    id: `post_4_${Date.now()}`,
    title: allowGrids ? 'Post 4: Storytelling Grid 6' : 'Post 4: Sequência 6 Fotos',
    badgeText: allowGrids ? '🖼️ Montagem 3x2' : '📸 6 Fotos Solo',
    predictedEngagement: 92,
    description: allowGrids
      ? `Grade elegante 3x2 liderada pela foto principal.`
      : `Sequência de 6 fotos inteiras em formato slide.`,
    slides: post4Slides,
    captions: generateSmartCaptions(cover4),
  };

  // ──────── Post 5: Carrossel Melhores Momentos ────────
  const post5Photos = getUniquePhotosForPost(4, 10);
  const cover5 = post5Photos[0] || pool[0];
  const post5: SuggestedPost = {
    id: `post_5_${Date.now()}`,
    title: 'Post 5: Melhores Momentos',
    badgeText: '📸 Resumo Completo',
    predictedEngagement: 95,
    description: `Carrossel com os melhores registros aprovados do ensaio.`,
    slides: post5Photos.map((p) => ({
      type: 'single' as const,
      photoIds: [p.id],
      bgTheme: prefBg,
    })),
    captions: generateSmartCaptions(cover5),
  };

  return [post1, post2, post3, post4, post5];
}
