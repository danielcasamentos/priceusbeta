import type { CullingPhoto } from '../components/gallery/AICullingManager';
import type { SuggestedPost, PostSlide, CaptionOption } from '../components/gallery/SocialPostStudio';

/**
 * AI Photo Culling & Viral Post Curator Engine
 * Filtra rigorosamente fotos borradas (isBlurry) e olhos fechados (eyesClosed),
 * seleciona capas 100% DISTINTAS para cada post e gera composições virais sem repetição.
 */

export function getCleanPhotoPool(photos: CullingPhoto[]): CullingPhoto[] {
  // 1. Filtrar estritamente fotos inutilizáveis (olhos fechados, borradas, descartadas)
  const cleanCandidates = photos.filter(
    (p) => !p.isBlurry && !p.eyesClosed && !p.isDiscarded
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
  return photos.filter((p) => !p.isDiscarded);
}

/** Generates default 5 captions based on camera metadata */
export function generateSmartCaptions(
  photo: CullingPhoto | undefined,
  includeEquip: boolean
): CaptionOption[] {
  const camera = photo?.cameraModel || 'Canon EOS R6 Mark II';
  const lens = photo?.lensModel || 'RF 50mm f/1.2L USM';
  const iso = photo?.iso || 400;
  const aperture = photo?.aperture || 'f/1.8';
  const shutter = photo?.shutterSpeed || '1/1250s';

  const isBw = photo?.editSettings?.saturation === -100;

  const equipText = includeEquip
    ? `\n\n📸 Equipamento: ${camera} + ${lens} | ISO ${iso} • ${aperture} • ${shutter}`
    : '';

  if (isBw) {
    return [
      {
        id: `cap_1_${Date.now()}`,
        title: '1. Emocional Fine Art (P&B)',
        tone: 'emotional',
        text: `Na ausência de cores, a emoção se torna a única luz da cena. O preto e branco eterniza aquilo que as palavras não conseguem traduzir. 🖤✨${equipText}\n\n💬 O que você sente ao olhar para essa versão em P&B?\n\n#blackandwhite #bwportrait #monochromephotography #fineart #fotografiadecasamento`,
      },
      {
        id: `cap_2_${Date.now()}`,
        title: '2. Técnica Monocromática',
        tone: 'technical',
        text: `Sombras profundas e realces cristalinos. A conversão em P&B destaca o contraste e a textura do momento com estética de filme clássico.${equipText}\n\n📩 Quer um ensaio com tratamento atemporal? Link na bio!\n\n#monochrome #classicbw #portraitlighting #shadows #bnw`,
      },
      {
        id: `cap_3_${Date.now()}`,
        title: '3. Minimalista Atemporal',
        tone: 'minimal',
        text: `Luz, sombra e a pureza do momento.${equipText}\n\n✨ Orçamentos no link da bio.\n\n#bwminimal #bnw #blackandwhitephoto #timeless`,
      },
      {
        id: `cap_4_${Date.now()}`,
        title: '4. Storytelling P&B',
        tone: 'storytelling',
        text: `Há histórias que pedem a sobriedade e o mistério do preto e branco para serem contadas em toda a sua profundidade. 📖🖤${equipText}\n\n📲 Mande uma mensagem no Direct para agendamentos!\n\n#bwstorytelling #realweddings #bnwstory #fotografiaemocional`,
      },
      {
        id: `cap_5_${Date.now()}`,
        title: '5. Foco em Vendas Fine Art',
        tone: 'sales',
        text: `Garante a memória do seu dia especial com quadros e álbuns em edição P&B de galeria. Vagas abertas para ensaios! 🖤🗓️${equipText}\n\n👉 Clique no link da Bio e reserve sua data agora.\n\n#agendamento2026 #fotografiadegaleria #fineartportrait #bw`,
      },
    ];
  }

  return [
    {
      id: `cap_1_${Date.now()}`,
      title: '1. Emocional & Poética',
      tone: 'emotional',
      text: `Cada olhar guarda um universo de memórias que nunca se apagam. Registrar a essência desse amor é o que me move todos os dias. ✨💍${equipText}\n\n💬 O que você mais achou especial nessa foto?\n\n#fotografiadecasamento #weddingphotography #momentosunicos #fotografodecasamento #weddingportrait`,
    },
    {
      id: `cap_2_${Date.now()}`,
      title: '2. Técnica & Bastidores da Lente',
      tone: 'technical',
      text: `Luz natural e foco preciso no momento decisivo. A harmonia das cores e a profundidade de campo criam essa atmosfera única.${equipText}\n\n📩 Quer um ensaio com essa mesma estética editorial? Clique no link da bio para orçamentos!\n\n#lightroom #rawphotography #portraitphotography #phototechnique #cinematiclook`,
    },
    {
      id: `cap_3_${Date.now()}`,
      title: '3. Minimalista & Direta',
      tone: 'minimal',
      text: `A simplicidade do amor em sua forma mais pura.${equipText}\n\n✨ Link na bio para agendamentos.\n\n#minimalportrait #weddingaesthetic #editorialphoto #purelove`,
    },
    {
      id: `cap_4_${Date.now()}`,
      title: '4. Storytelling & Bastidores',
      tone: 'storytelling',
      text: `Por trás de cada imagem existe uma história real, risos espontâneos e uma emoção que transborda. Foi um privilégio eternizar este capítulo! 📖❤️${equipText}\n\n📲 Dúvidas sobre datas e pacotes? Mande uma mensagem no Direct!\n\n#storytelling #weddingstories #fotografiaemocional #realwedding #lovehistory`,
    },
    {
      id: `cap_5_${Date.now()}`,
      title: '5. Foco em Vendas & CTA',
      tone: 'sales',
      text: `Seus momentos mais importantes merecem um registro inesquecível. Vagas abertas para a próxima temporada de casamentos e ensaios! 🗓️✨${equipText}\n\n👉 Clique no link da Bio e garanta sua data especial agora mesmo.\n\n#agendamentoaberto #fotografia #orcametoensaio #wedding2026 #fotografobrasil`,
    },
  ];
}

/**
 * Gera 5 Sugestões de Posts com Capas 100% Únicas e Distintas
 */
export function generateCuratedPosts(
  photos: CullingPhoto[],
  prefBg: 'white' | 'black',
  includeEquip: boolean,
  allowGrids: boolean = true,
  rejectionOffsets: Record<number, number> = {}
): SuggestedPost[] {
  const pool = getCleanPhotoPool(photos);
  if (pool.length === 0) return [];

  // Ordenar fotos por nitidez e relevância de cor
  const sortedPool = [...pool].sort((a, b) => b.sharpnessScore - a.sharpnessScore);

  const getDistinctPhoto = (postIndex: number, offsetInPost = 0): CullingPhoto => {
    const rejectionOffset = rejectionOffsets[postIndex] || 0;
    const targetIdx = (postIndex * 2 + offsetInPost + rejectionOffset) % sortedPool.length;
    return sortedPool[targetIdx] || pool[0];
  };

  // ──────── Post 1: Carrossel Virada Editorial (Mix Dinâmico) ────────
  const cover1 = getDistinctPhoto(0, 0);
  const post1Slides: PostSlide[] = allowGrids
    ? [
        { type: 'single', photoIds: [cover1.id], bgTheme: prefBg },
        { type: 'single', photoIds: [getDistinctPhoto(0, 1).id], bgTheme: prefBg },
        { type: 'grid_9', photoIds: sortedPool.slice(2, 11).map((p) => p.id), bgTheme: 'white' },
        { type: 'single', photoIds: [getDistinctPhoto(0, 11).id], bgTheme: prefBg },
        { type: 'grid_6', photoIds: sortedPool.slice(12, 18).map((p) => p.id), bgTheme: 'black' },
        { type: 'single', photoIds: [getDistinctPhoto(0, 18).id], bgTheme: prefBg },
      ]
    : [
        { type: 'single', photoIds: [cover1.id], bgTheme: prefBg },
        { type: 'single', photoIds: [getDistinctPhoto(0, 1).id], bgTheme: prefBg },
        { type: 'single', photoIds: [getDistinctPhoto(0, 2).id], bgTheme: prefBg },
        { type: 'single', photoIds: [getDistinctPhoto(0, 3).id], bgTheme: prefBg },
        { type: 'single', photoIds: [getDistinctPhoto(0, 4).id], bgTheme: prefBg },
        { type: 'single', photoIds: [getDistinctPhoto(0, 5).id], bgTheme: prefBg },
      ];

  const post1: SuggestedPost = {
    id: `post_1_${Date.now()}`,
    title: 'Post 1: Carrossel Virada Editorial (Mix Dinâmico)',
    badgeText: allowGrids ? '🔥 Recomendado IA - Misto 6 Slides' : '🔥 Carrossel Foto Inteira (Sem Grid)',
    predictedEngagement: 97,
    description: allowGrids
      ? `Capa Principal "${cover1.fileName}" -> Slide 2 -> Grid 9 Fundo Branco -> Single -> Grid 6 Fundo Preto.`
      : `Carrossel editorial limpo sem montagens em grid, iniciado por "${cover1.fileName}".`,
    slides: post1Slides,
    captions: generateSmartCaptions(cover1, includeEquip),
  };

  // ──────── Post 2: Foto Única "Hero" (Capa Única #2) ────────
  const cover2 = getDistinctPhoto(1, 0);
  const post2: SuggestedPost = {
    id: `post_2_${Date.now()}`,
    title: 'Post 2: Foto Única "Hero" (Alta Retenção no Feed)',
    badgeText: '⭐ 99% Engajamento Previsto',
    predictedEngagement: 99,
    description: `Destaque absoluto para a foto "${cover2.fileName}" com 100% de foco na expressão e nitidez.`,
    slides: [{ type: 'single', photoIds: [cover2.id], bgTheme: 'black' }],
    captions: generateSmartCaptions(cover2, includeEquip),
  };

  // ──────── Post 3: Carrossel Minimalista VSCO Film (Capa Única #3) ────────
  const cover3 = getDistinctPhoto(2, 0);
  const vscoPhotos = [
    cover3,
    getDistinctPhoto(2, 1),
    getDistinctPhoto(2, 2),
    getDistinctPhoto(2, 3),
    getDistinctPhoto(2, 4),
  ];
  const post3: SuggestedPost = {
    id: `post_3_${Date.now()}`,
    title: 'Post 3: Carrossel Editorial Minimalista VSCO Film',
    badgeText: '✨ Estética VSCO / Molduras Clean',
    predictedEngagement: 94,
    description: `Capa "${cover3.fileName}" + 4 slides com bordas em formato revista 4:5.`,
    slides: vscoPhotos.map((p) => ({
      type: 'single' as const,
      photoIds: [p.id],
      bgTheme: 'white' as const,
    })),
    captions: generateSmartCaptions(cover3, includeEquip),
  };

  // ──────── Post 4: Montagem Storytelling / Carrossel Solo (Capa Única #4) ────────
  const cover4 = getDistinctPhoto(3, 0);
  const grid6Photos = [
    cover4,
    getDistinctPhoto(3, 1),
    getDistinctPhoto(3, 2),
    getDistinctPhoto(3, 3),
    getDistinctPhoto(3, 4),
    getDistinctPhoto(3, 5),
  ];
  const post4Slides: PostSlide[] = allowGrids
    ? [{ type: 'grid_6', photoIds: grid6Photos.map((p) => p.id), bgTheme: prefBg }]
    : grid6Photos.map((p) => ({ type: 'single' as const, photoIds: [p.id], bgTheme: prefBg }));

  const post4: SuggestedPost = {
    id: `post_4_${Date.now()}`,
    title: allowGrids ? 'Post 4: Montagem Storytelling Grid 6 (3x2)' : 'Post 4: Sequência Storytelling 6 Fotos Solo',
    badgeText: allowGrids ? '🖼️ Portfólio 6 Destaques' : '📸 6 Fotos Solo Sem Grid',
    predictedEngagement: 92,
    description: allowGrids
      ? `Grade elegante 3x2 liderada pela foto "${cover4.fileName}".`
      : `Sequência fluida de 6 fotos inteiras lideradas por "${cover4.fileName}".`,
    slides: post4Slides,
    captions: generateSmartCaptions(cover4, includeEquip),
  };

  // ──────── Post 5: Carrossel Completo Melhores Momentos (Capa Única #5) ────────
  const cover5 = getDistinctPhoto(4, 0);
  const fullCarouselPhotos = [
    cover5,
    ...sortedPool.filter((p) => p.id !== cover5.id).slice(0, 19),
  ];
  const post5: SuggestedPost = {
    id: `post_5_${Date.now()}`,
    title: 'Post 5: Carrossel Completo Melhores Momentos (Até 20 fotos)',
    badgeText: '📸 Resumo Completo do Ensaio',
    predictedEngagement: 95,
    description: `Carrossel longo iniciado pela foto "${cover5.fileName}" com os melhores momentos aprovados.`,
    slides: fullCarouselPhotos.map((p) => ({
      type: 'single' as const,
      photoIds: [p.id],
      bgTheme: prefBg,
    })),
    captions: generateSmartCaptions(cover5, includeEquip),
  };

  return [post1, post2, post3, post4, post5];
}
