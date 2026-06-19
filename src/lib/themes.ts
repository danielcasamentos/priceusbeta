/**
 * 🎨 SISTEMA DE TEMAS PARA QUOTEPAGE
 *
 * Define estilos visuais diferentes para a página de orçamento
 * sem afetar funcionalidades. Cada tema tem sua paleta e estilo único.
 */

export type TemaType = 'moderno' | 'classico' | 'romantico' | 'vibrante' | 'natural' | 'minimalista' | 'pretoebranco' | 'darkstudio' | 'escuro' | 'studio' | 'promocional' | 'oferta' | 'pdf-elegante' | 'pdf-elegante-2' | 'ferias' | 'carnaval' | 'mes-da-mulher' | 'mes-do-consumidor' | 'pascoa' | 'dia-das-maes' | 'mes-das-noivas' | 'dia-dos-namorados' | 'sao-joao' | 'orgulho-lgbt' | 'dia-do-amigo' | 'dia-dos-avos' | 'dia-dos-pais' | 'dia-do-irmao' | 'dia-do-cliente' | 'dia-das-criancas' | 'halloween' | 'black-friday' | 'natal' | 'revellon' | 'oferta-primavera' | 'oferta-verao' | 'oferta-outono' | 'oferta-inverno';

export interface TemaConfig {
  nome: string;
  descricao: string;
  emoji: string;
  cores: {
    // Cores principais
    primaria: string;
    primariaHover: string;
    primariaDark: string;
    secundaria: string;
    secundariaHover: string;
    acento: string;
    acentoHover: string;

    // Backgrounds
    bgPrincipal: string;
    bgSecundario: string;
    bgCard: string;
    bgHover: string;

    // Textos
    textoPrincipal: string;
    textoSecundario: string;
    textoDestaque: string;

    // Bordas e divisores
    borda: string;
    divisor: string;
  };
  estilos: {
    // Bordas e cantos
    borderRadius: string;
    borderWidth: string;

    // Sombras
    shadow: string;
    shadowHover: string;

    // Fontes
    fontFamily: string;
    fontHeading: string;
  };
}

export const TEMAS: Record<TemaType, TemaConfig> = {
  moderno: {
    nome: 'Moderno',
    descricao: 'Clean e minimalista com azul suave',
    emoji: '🌟',
    cores: {
      primaria: 'bg-blue-600',
      primariaHover: 'hover:bg-blue-700',
      primariaDark: 'bg-blue-800',
      secundaria: 'bg-gray-100',
      secundariaHover: 'hover:bg-gray-200',
      acento: 'bg-blue-500',
      acentoHover: 'hover:bg-blue-600',

      bgPrincipal: 'bg-gradient-to-br from-blue-50 via-white to-gray-50',
      bgSecundario: 'bg-gray-50',
      bgCard: 'bg-white',
      bgHover: 'hover:bg-blue-50',

      textoPrincipal: 'text-gray-900',
      textoSecundario: 'text-gray-600',
      textoDestaque: 'text-blue-600',

      borda: 'border-gray-200',
      divisor: 'divide-gray-200',
    },
    estilos: {
      borderRadius: 'rounded-lg',
      borderWidth: 'border',
      shadow: 'shadow-sm',
      shadowHover: 'hover:shadow-md',
      fontFamily: 'font-sans',
      fontHeading: 'font-bold',
    },
  },

  classico: {
    nome: 'Clássico Elegante',
    descricao: 'Sofisticado com preto e dourado',
    emoji: '💼',
    cores: {
      primaria: 'bg-gray-900',
      primariaHover: 'hover:bg-black',
      primariaDark: 'bg-black',
      secundaria: 'bg-amber-50',
      secundariaHover: 'hover:bg-amber-100',
      acento: 'bg-amber-500',
      acentoHover: 'hover:bg-amber-600',

      bgPrincipal: 'bg-gradient-to-br from-gray-50 via-amber-50 to-gray-100',
      bgSecundario: 'bg-gray-50',
      bgCard: 'bg-white',
      bgHover: 'hover:bg-amber-50',

      textoPrincipal: 'text-gray-900',
      textoSecundario: 'text-gray-700',
      textoDestaque: 'text-amber-600',

      borda: 'border-gray-300',
      divisor: 'divide-gray-300',
    },
    estilos: {
      borderRadius: 'rounded',
      borderWidth: 'border-2',
      shadow: 'shadow',
      shadowHover: 'hover:shadow-lg',
      fontFamily: 'font-serif',
      fontHeading: 'font-semibold',
    },
  },

  romantico: {
    nome: 'Romântico',
    descricao: 'Delicado com rosa e lavanda',
    emoji: '🌸',
    cores: {
      primaria: 'bg-pink-500',
      primariaHover: 'hover:bg-pink-600',
      primariaDark: 'bg-pink-700',
      secundaria: 'bg-pink-50',
      secundariaHover: 'hover:bg-pink-100',
      acento: 'bg-purple-400',
      acentoHover: 'hover:bg-purple-500',

      bgPrincipal: 'bg-gradient-to-br from-pink-50 via-purple-50 to-pink-100',
      bgSecundario: 'bg-pink-50',
      bgCard: 'bg-white',
      bgHover: 'hover:bg-pink-50',

      textoPrincipal: 'text-gray-800',
      textoSecundario: 'text-gray-600',
      textoDestaque: 'text-pink-600',

      borda: 'border-pink-200',
      divisor: 'divide-pink-200',
    },
    estilos: {
      borderRadius: 'rounded-2xl',
      borderWidth: 'border',
      shadow: 'shadow-md',
      shadowHover: 'hover:shadow-xl',
      fontFamily: 'font-sans',
      fontHeading: 'font-semibold',
    },
  },

  vibrante: {
    nome: 'Vibrante',
    descricao: 'Criativo com cores vivas',
    emoji: '🎨',
    cores: {
      primaria: 'bg-purple-600',
      primariaHover: 'hover:bg-purple-700',
      primariaDark: 'bg-purple-800',
      secundaria: 'bg-orange-50',
      secundariaHover: 'hover:bg-orange-100',
      acento: 'bg-orange-500',
      acentoHover: 'hover:bg-orange-600',

      bgPrincipal: 'bg-gradient-to-br from-purple-50 via-orange-50 to-green-50',
      bgSecundario: 'bg-purple-50',
      bgCard: 'bg-white',
      bgHover: 'hover:bg-purple-50',

      textoPrincipal: 'text-gray-900',
      textoSecundario: 'text-gray-700',
      textoDestaque: 'text-purple-600',

      borda: 'border-purple-300',
      divisor: 'divide-purple-300',
    },
    estilos: {
      borderRadius: 'rounded-xl',
      borderWidth: 'border-2',
      shadow: 'shadow-lg',
      shadowHover: 'hover:shadow-2xl',
      fontFamily: 'font-sans',
      fontHeading: 'font-bold',
    },
  },

  escuro: {
    nome: 'Escuro',
    descricao: 'Sofisticado modo dark',
    emoji: '🌙',
    cores: {
      primaria: 'bg-slate-700',
      primariaHover: 'hover:bg-slate-600',
      primariaDark: 'bg-slate-800',
      secundaria: 'bg-zinc-800',
      secundariaHover: 'hover:bg-zinc-700',
      acento: 'bg-zinc-600',
      acentoHover: 'hover:bg-zinc-500',

      bgPrincipal: 'bg-gradient-to-br from-zinc-950 via-slate-950 to-black',
      bgSecundario: 'bg-zinc-900',
      bgCard: 'bg-zinc-900',
      bgHover: 'hover:bg-zinc-800',

      textoPrincipal: 'text-gray-100',
      textoSecundario: 'text-gray-400',
      textoDestaque: 'text-gray-200',

      borda: 'border-zinc-800',
      divisor: 'divide-zinc-800',
    },
    estilos: {
      borderRadius: 'rounded-lg',
      borderWidth: 'border',
      shadow: 'shadow-xl',
      shadowHover: 'hover:shadow-2xl',
      fontFamily: 'font-sans',
      fontHeading: 'font-bold',
    },
  },

  natural: {
    nome: 'Natural Clean',
    descricao: 'Design natural e atemporal',
    emoji: '📸',
    cores: {
      primaria: 'bg-emerald-700',
      primariaHover: 'hover:bg-emerald-800',
      primariaDark: 'bg-emerald-900',
      secundaria: 'bg-amber-100',
      secundariaHover: 'hover:bg-amber-200',
      acento: 'bg-teal-600',
      acentoHover: 'hover:bg-teal-700',

      bgPrincipal: 'bg-gradient-to-br from-amber-100 via-orange-100 to-yellow-100',
      bgSecundario: 'bg-amber-50',
      bgCard: 'bg-white',
      bgHover: 'hover:bg-amber-100',

      textoPrincipal: 'text-emerald-900',
      textoSecundario: 'text-emerald-700',
      textoDestaque: 'text-teal-700',

      borda: 'border-amber-300',
      divisor: 'divide-amber-300',
    },
    estilos: {
      borderRadius: 'rounded-2xl',
      borderWidth: 'border-2',
      shadow: 'shadow-xl',
      shadowHover: 'hover:shadow-2xl',
      fontFamily: 'font-serif',
      fontHeading: 'font-bold',
    },
  },

  minimalista: {
    nome: 'Fotografia Minimalista',
    descricao: 'Espaços amplos e foco nas imagens',
    emoji: '⚪',
    cores: {
      primaria: 'bg-slate-800',
      primariaHover: 'hover:bg-slate-900',
      primariaDark: 'bg-slate-950',
      secundaria: 'bg-slate-200',
      secundariaHover: 'hover:bg-slate-300',
      acento: 'bg-slate-600',
      acentoHover: 'hover:bg-slate-700',

      bgPrincipal: 'bg-gradient-to-br from-slate-200 via-gray-200 to-slate-300',
      bgSecundario: 'bg-slate-100',
      bgCard: 'bg-slate-50',
      bgHover: 'hover:bg-slate-100',

      textoPrincipal: 'text-slate-900',
      textoSecundario: 'text-slate-700',
      textoDestaque: 'text-slate-800',

      borda: 'border-slate-400',
      divisor: 'divide-slate-400',
    },
    estilos: {
      borderRadius: 'rounded-3xl',
      borderWidth: 'border-4',
      shadow: 'shadow-2xl',
      shadowHover: 'hover:shadow-2xl',
      fontFamily: 'font-sans',
      fontHeading: 'font-extralight tracking-wide text-3xl',
    },
  },

  studio: {
    nome: 'Studio Professional',
    descricao: 'Elegante com toques de bronze',
    emoji: '🎬',
    cores: {
      primaria: 'bg-rose-700',
      primariaHover: 'hover:bg-rose-800',
      primariaDark: 'bg-rose-900',
      secundaria: 'bg-rose-100',
      secundariaHover: 'hover:bg-rose-200',
      acento: 'bg-amber-500',
      acentoHover: 'hover:bg-amber-600',

      bgPrincipal: 'bg-gradient-to-br from-rose-100 via-pink-100 to-amber-100',
      bgSecundario: 'bg-rose-50',
      bgCard: 'bg-white',
      bgHover: 'hover:bg-rose-100',

      textoPrincipal: 'text-rose-950',
      textoSecundario: 'text-rose-700',
      textoDestaque: 'text-amber-700',

      borda: 'border-rose-400',
      divisor: 'divide-rose-400',
    },
    estilos: {
      borderRadius: 'rounded-xl',
      borderWidth: 'border-4',
      shadow: 'shadow-2xl',
      shadowHover: 'hover:shadow-2xl',
      fontFamily: 'font-serif',
      fontHeading: 'font-black text-4xl',
    },
  },

  pretoebranco: {
    nome: 'Preto e Branco',
    descricao: 'Um tema escuro e elegante com alto contraste.',
    emoji: '🎬',
    cores: {
      primaria: 'bg-blue-600',
      primariaHover: 'hover:bg-blue-700',
      primariaDark: 'bg-blue-800',
      secundaria: 'bg-gray-800',
      secundariaHover: 'hover:bg-gray-700',
      acento: 'bg-gray-700',
      acentoHover: 'hover:bg-gray-600',

      bgPrincipal: 'bg-black',
      bgSecundario: 'bg-gray-900',
      bgCard: 'bg-gray-900',
      bgHover: 'hover:bg-gray-800',

      textoPrincipal: 'text-white',
      textoSecundario: 'text-gray-400',
      textoDestaque: 'text-blue-500',

      borda: 'border-gray-700',
      divisor: 'divide-gray-700',
    },
    estilos: {
      borderRadius: 'rounded-xl',
      borderWidth: 'border',
      shadow: 'shadow-lg',
      shadowHover: 'hover:shadow-xl',
      fontFamily: 'font-sans',
      fontHeading: 'font-bold',
    },
  },

  promocional: {
    nome: '🔥 Oferta Especial',
    descricao: 'Tema de alta conversão com cores de urgência e promoção',
    emoji: '🔥',
    cores: {
      primaria: 'bg-red-600',
      primariaHover: 'hover:bg-red-700',
      primariaDark: 'bg-red-800',
      secundaria: 'bg-orange-50',
      secundariaHover: 'hover:bg-orange-100',
      acento: 'bg-amber-500',
      acentoHover: 'hover:bg-amber-600',

      bgPrincipal: 'bg-gradient-to-br from-red-50 via-orange-50 to-amber-50',
      bgSecundario: 'bg-orange-50',
      bgCard: 'bg-white',
      bgHover: 'hover:bg-red-50',

      textoPrincipal: 'text-gray-900',
      textoSecundario: 'text-gray-700',
      textoDestaque: 'text-red-600',

      borda: 'border-red-200',
      divisor: 'divide-red-200',
    },
    estilos: {
      borderRadius: 'rounded-xl',
      borderWidth: 'border-2',
      shadow: 'shadow-lg',
      shadowHover: 'hover:shadow-xl',
      fontFamily: 'font-sans',
      fontHeading: 'font-bold',
    },
  },

  oferta: {
    nome: '⚡ Oferta Chamativa',
    descricao: 'Tema ultra chamativo em tons de laranja vibrante para alta conversão',
    emoji: '⚡',
    cores: {
      primaria: 'bg-orange-600',
      primariaHover: 'hover:bg-orange-700',
      primariaDark: 'bg-orange-800',
      secundaria: 'bg-orange-50',
      secundariaHover: 'hover:bg-orange-100',
      acento: 'bg-orange-500',
      acentoHover: 'hover:bg-orange-600',

      bgPrincipal: 'bg-gradient-to-br from-orange-500 via-amber-500 to-red-500',
      bgSecundario: 'bg-orange-50',
      bgCard: 'bg-white',
      bgHover: 'hover:bg-orange-50',

      textoPrincipal: 'text-gray-900',
      textoSecundario: 'text-gray-700',
      textoDestaque: 'text-orange-600',

      borda: 'border-orange-200',
      divisor: 'divide-orange-200',
    },
    estilos: {
      borderRadius: 'rounded-2xl',
      borderWidth: 'border-2',
      shadow: 'shadow-xl',
      shadowHover: 'hover:shadow-2xl',
      fontFamily: 'font-sans',
      fontHeading: 'font-extrabold',
    },
  },

  darkstudio: {
    nome: 'Dark Studio ✨',
    descricao: 'Premium dark com acentos verdes neon',
    emoji: '🌑',
    cores: {
      primaria: 'bg-green-600',
      primariaHover: 'hover:bg-green-500',
      primariaDark: 'bg-green-700',
      secundaria: 'bg-white/5',
      secundariaHover: 'hover:bg-white/10',
      acento: 'bg-green-500',
      acentoHover: 'hover:bg-green-400',

      bgPrincipal: 'bg-dark-bg',
      bgSecundario: 'bg-dark-bg2',
      bgCard: 'bg-dark-bg2',
      bgHover: 'hover:bg-dark-bg3',

      textoPrincipal: 'text-white',
      textoSecundario: 'text-gray-400',
      textoDestaque: 'text-green-400',

      borda: 'border-white/10',
      divisor: 'divide-white/10',
    },
    estilos: {
      borderRadius: 'rounded-xl',
      borderWidth: 'border',
      shadow: 'shadow-2xl',
      shadowHover: 'hover:shadow-2xl',
      fontFamily: 'font-sans',
      fontHeading: 'font-bold',
    },
  },

  'pdf-elegante': {
    nome: 'PDF Elegante 📖',
    descricao: 'Livreto premium de 3 páginas (Capa, Proposta, Rodapé) em tons de carvão e dourado suave',
    emoji: '📖',
    cores: {
      primaria: 'bg-neutral-900',
      primariaHover: 'hover:bg-neutral-800',
      primariaDark: 'bg-black',
      secundaria: 'bg-neutral-100',
      secundariaHover: 'hover:bg-neutral-200',
      acento: 'bg-amber-600',
      acentoHover: 'hover:bg-amber-700',

      bgPrincipal: 'bg-white',
      bgSecundario: 'bg-neutral-50',
      bgCard: 'bg-white',
      bgHover: 'hover:bg-neutral-50',

      textoPrincipal: 'text-neutral-900',
      textoSecundario: 'text-neutral-500',
      textoDestaque: 'text-amber-800',

      borda: 'border-neutral-200',
      divisor: 'divide-neutral-200',
    },
    estilos: {
      borderRadius: 'rounded-none',
      borderWidth: 'border',
      shadow: 'shadow-md',
      shadowHover: 'hover:shadow-lg',
      fontFamily: 'font-serif',
      fontHeading: 'font-bold font-serif',
    },
  },

  'pdf-elegante-2': {
    nome: 'PDF Elegante 2 📸',
    descricao: 'Livreto premium sem barra preta — imagem de capa full-bleed com "PROPOSTA" sobreposta em contraste automático',
    emoji: '📸',
    cores: {
      primaria: 'bg-neutral-900',
      primariaHover: 'hover:bg-neutral-800',
      primariaDark: 'bg-black',
      secundaria: 'bg-neutral-100',
      secundariaHover: 'hover:bg-neutral-200',
      acento: 'bg-amber-600',
      acentoHover: 'hover:bg-amber-700',

      bgPrincipal: 'bg-white',
      bgSecundario: 'bg-neutral-50',
      bgCard: 'bg-white',
      bgHover: 'hover:bg-neutral-50',

      textoPrincipal: 'text-neutral-900',
      textoSecundario: 'text-neutral-500',
      textoDestaque: 'text-amber-800',

      borda: 'border-neutral-200',
      divisor: 'divide-neutral-200',
    },
    estilos: {
      borderRadius: 'rounded-none',
      borderWidth: 'border',
      shadow: 'shadow-md',
      shadowHover: 'hover:shadow-lg',
      fontFamily: 'font-serif',
      fontHeading: 'font-bold font-serif',
    },
  },

  'ferias': {
    nome: '☀️ Férias',
    descricao: 'Visual ensolarado e alegre em tons quentes de praia',
    emoji: '☀️',
    cores: {
      primaria: 'bg-yellow-500', primariaHover: 'hover:bg-yellow-600', primariaDark: 'bg-yellow-700',
      secundaria: 'bg-yellow-50', secundariaHover: 'hover:bg-yellow-100',
      acento: 'bg-orange-500', acentoHover: 'hover:bg-orange-600',
      bgPrincipal: 'bg-gradient-to-br from-yellow-50 via-white to-orange-50',
      bgSecundario: 'bg-yellow-50', bgCard: 'bg-white', bgHover: 'hover:bg-yellow-50',
      textoPrincipal: 'text-gray-900', textoSecundario: 'text-gray-600', textoDestaque: 'text-orange-600',
      borda: 'border-yellow-200', divisor: 'divide-yellow-200',
    },
    estilos: { borderRadius: 'rounded-xl', borderWidth: 'border', shadow: 'shadow-md', shadowHover: 'hover:shadow-lg', fontFamily: 'font-sans', fontHeading: 'font-bold' },
  },

  'carnaval': {
    nome: '🎉 Carnaval',
    descricao: 'Explosão de cores vibrantes, alegria e purpurina',
    emoji: '🎉',
    cores: {
      primaria: 'bg-purple-600', primariaHover: 'hover:bg-purple-700', primariaDark: 'bg-purple-800',
      secundaria: 'bg-pink-100', secundariaHover: 'hover:bg-pink-200',
      acento: 'bg-pink-500', acentoHover: 'hover:bg-pink-600',
      bgPrincipal: 'bg-gradient-to-br from-purple-100 via-white to-pink-100',
      bgSecundario: 'bg-purple-50', bgCard: 'bg-white', bgHover: 'hover:bg-purple-50',
      textoPrincipal: 'text-gray-900', textoSecundario: 'text-gray-600', textoDestaque: 'text-purple-600',
      borda: 'border-purple-200', divisor: 'divide-purple-200',
    },
    estilos: { borderRadius: 'rounded-xl', borderWidth: 'border', shadow: 'shadow-md', shadowHover: 'hover:shadow-lg', fontFamily: 'font-sans', fontHeading: 'font-bold' },
  },

  'mes-da-mulher': {
    nome: '♀️ Mês da Mulher',
    descricao: 'Inspirador e elegante em tons de roxo e lavanda',
    emoji: '♀️',
    cores: {
      primaria: 'bg-violet-600', primariaHover: 'hover:bg-violet-700', primariaDark: 'bg-violet-850',
      secundaria: 'bg-violet-50', secundariaHover: 'hover:bg-violet-100',
      acento: 'bg-fuchsia-500', acentoHover: 'hover:bg-fuchsia-600',
      bgPrincipal: 'bg-gradient-to-br from-violet-50 via-white to-fuchsia-50',
      bgSecundario: 'bg-violet-50', bgCard: 'bg-white', bgHover: 'hover:bg-violet-50',
      textoPrincipal: 'text-gray-900', textoSecundario: 'text-gray-600', textoDestaque: 'text-violet-600',
      borda: 'border-violet-200', divisor: 'divide-violet-200',
    },
    estilos: { borderRadius: 'rounded-xl', borderWidth: 'border', shadow: 'shadow-md', shadowHover: 'hover:shadow-lg', fontFamily: 'font-sans', fontHeading: 'font-bold' },
  },

  'mes-do-consumidor': {
    nome: '🛒 Mês do Consumidor',
    descricao: 'Chamativo e moderno com cores focadas em conversão',
    emoji: '🛒',
    cores: {
      primaria: 'bg-blue-600', primariaHover: 'hover:bg-blue-700', primariaDark: 'bg-blue-850',
      secundaria: 'bg-amber-100', secundariaHover: 'hover:bg-amber-200',
      acento: 'bg-amber-500', acentoHover: 'hover:bg-amber-600',
      bgPrincipal: 'bg-gradient-to-br from-blue-50 via-white to-amber-50',
      bgSecundario: 'bg-blue-50', bgCard: 'bg-white', bgHover: 'hover:bg-blue-50',
      textoPrincipal: 'text-gray-900', textoSecundario: 'text-gray-600', textoDestaque: 'text-blue-600',
      borda: 'border-blue-200', divisor: 'divide-blue-200',
    },
    estilos: { borderRadius: 'rounded-xl', borderWidth: 'border', shadow: 'shadow-md', shadowHover: 'hover:shadow-lg', fontFamily: 'font-sans', fontHeading: 'font-bold' },
  },

  'pascoa': {
    nome: '🐰 Páscoa',
    descricao: 'Design acolhedor e doce em tons pastéis e chocolate',
    emoji: '🐰',
    cores: {
      primaria: 'bg-amber-800', primariaHover: 'hover:bg-amber-900', primariaDark: 'bg-amber-950',
      secundaria: 'bg-amber-50', secundariaHover: 'hover:bg-amber-100',
      acento: 'bg-yellow-600', acentoHover: 'hover:bg-yellow-700',
      bgPrincipal: 'bg-gradient-to-br from-amber-50 via-white to-orange-50',
      bgSecundario: 'bg-amber-55', bgCard: 'bg-white', bgHover: 'hover:bg-amber-50',
      textoPrincipal: 'text-amber-950', textoSecundario: 'text-amber-800', textoDestaque: 'text-amber-900',
      borda: 'border-amber-200', divisor: 'divide-amber-200',
    },
    estilos: { borderRadius: 'rounded-xl', borderWidth: 'border', shadow: 'shadow-md', shadowHover: 'hover:shadow-lg', fontFamily: 'font-sans', fontHeading: 'font-bold' },
  },

  'dia-das-maes': {
    nome: '🌸 Dia das Mães',
    descricao: 'Design amoroso e sensível em tons de rosa e lavanda',
    emoji: '🌸',
    cores: {
      primaria: 'bg-pink-500', primariaHover: 'hover:bg-pink-600', primariaDark: 'bg-pink-700',
      secundaria: 'bg-pink-50', secundariaHover: 'hover:bg-pink-100',
      acento: 'bg-rose-400', acentoHover: 'hover:bg-rose-500',
      bgPrincipal: 'bg-gradient-to-br from-pink-50 via-white to-purple-50',
      bgSecundario: 'bg-pink-50', bgCard: 'bg-white', bgHover: 'hover:bg-pink-50',
      textoPrincipal: 'text-gray-900', textoSecundario: 'text-gray-600', textoDestaque: 'text-pink-600',
      borda: 'border-pink-200', divisor: 'divide-pink-200',
    },
    estilos: { borderRadius: 'rounded-xl', borderWidth: 'border', shadow: 'shadow-md', shadowHover: 'hover:shadow-lg', fontFamily: 'font-sans', fontHeading: 'font-bold' },
  },

  'mes-das-noivas': {
    nome: '👰 Mês das Noivas',
    descricao: 'Romantismo e sofisticação clássica em branco e cinza suave',
    emoji: '👰',
    cores: {
      primaria: 'bg-stone-800', primariaHover: 'hover:bg-stone-900', primariaDark: 'bg-stone-950',
      secundaria: 'bg-stone-50', secundariaHover: 'hover:bg-stone-100',
      acento: 'bg-stone-500', acentoHover: 'hover:bg-stone-600',
      bgPrincipal: 'bg-gradient-to-br from-stone-50 via-white to-stone-100',
      bgSecundario: 'bg-stone-50', bgCard: 'bg-white', bgHover: 'hover:bg-stone-50',
      textoPrincipal: 'text-stone-900', textoSecundario: 'text-stone-600', textoDestaque: 'text-stone-700',
      borda: 'border-stone-200', divisor: 'divide-stone-200',
    },
    estilos: { borderRadius: 'rounded-none', borderWidth: 'border', shadow: 'shadow-sm', shadowHover: 'hover:shadow-md', fontFamily: 'font-serif', fontHeading: 'font-serif font-bold' },
  },

  'dia-dos-namorados': {
    nome: '❤️ Dia dos Namorados',
    descricao: 'Apaixonado e intenso em tons de vermelho escarlate',
    emoji: '❤️',
    cores: {
      primaria: 'bg-red-600', primariaHover: 'hover:bg-red-700', primariaDark: 'bg-red-800',
      secundaria: 'bg-red-50', secundariaHover: 'hover:bg-red-100',
      acento: 'bg-rose-500', acentoHover: 'hover:bg-rose-600',
      bgPrincipal: 'bg-gradient-to-br from-red-50 via-white to-rose-50',
      bgSecundario: 'bg-red-50', bgCard: 'bg-white', bgHover: 'hover:bg-red-50',
      textoPrincipal: 'text-gray-900', textoSecundario: 'text-gray-600', textoDestaque: 'text-red-600',
      borda: 'border-red-200', divisor: 'divide-red-200',
    },
    estilos: { borderRadius: 'rounded-xl', borderWidth: 'border', shadow: 'shadow-md', shadowHover: 'hover:shadow-lg', fontFamily: 'font-sans', fontHeading: 'font-bold' },
  },

  'sao-joao': {
    nome: '🔥 São João',
    descricao: 'Tons de fogueira quentes e alegres de Festa Junina',
    emoji: '🔥',
    cores: {
      primaria: 'bg-amber-600', primariaHover: 'hover:bg-amber-700', primariaDark: 'bg-amber-800',
      secundaria: 'bg-orange-50', secundariaHover: 'hover:bg-orange-100',
      acento: 'bg-orange-500', acentoHover: 'hover:bg-orange-600',
      bgPrincipal: 'bg-gradient-to-br from-amber-50 via-white to-orange-50',
      bgSecundario: 'bg-amber-50', bgCard: 'bg-white', bgHover: 'hover:bg-amber-50',
      textoPrincipal: 'text-gray-900', textoSecundario: 'text-gray-600', textoDestaque: 'text-orange-600',
      borda: 'border-amber-200', divisor: 'divide-amber-200',
    },
    estilos: { borderRadius: 'rounded-xl', borderWidth: 'border', shadow: 'shadow-md', shadowHover: 'hover:shadow-lg', fontFamily: 'font-sans', fontHeading: 'font-bold' },
  },

  'orgulho-lgbt': {
    nome: '🏳️‍🌈 Orgulho LGBT',
    descricao: 'Celebrando o amor com cores vibrantes do arco-íris',
    emoji: '🏳️‍🌈',
    cores: {
      primaria: 'bg-pink-500', primariaHover: 'hover:bg-pink-650', primariaDark: 'bg-pink-700',
      secundaria: 'bg-indigo-50', secundariaHover: 'hover:bg-indigo-100',
      acento: 'bg-indigo-500', acentoHover: 'hover:bg-indigo-650',
      bgPrincipal: 'bg-gradient-to-br from-pink-50 via-white to-blue-50',
      bgSecundario: 'bg-indigo-50', bgCard: 'bg-white', bgHover: 'hover:bg-pink-50',
      textoPrincipal: 'text-gray-900', textoSecundario: 'text-gray-600', textoDestaque: 'text-indigo-600',
      borda: 'border-pink-200', divisor: 'divide-pink-200',
    },
    estilos: { borderRadius: 'rounded-xl', borderWidth: 'border', shadow: 'shadow-md', shadowHover: 'hover:shadow-lg', fontFamily: 'font-sans', fontHeading: 'font-bold' },
  },

  'dia-do-amigo': {
    nome: '🤝 Dia do Amigo',
    descricao: 'Acolhedor e amigável em tons de azul e amarelo',
    emoji: '🤝',
    cores: {
      primaria: 'bg-sky-600', primariaHover: 'hover:bg-sky-700', primariaDark: 'bg-sky-850',
      secundaria: 'bg-yellow-50', secundariaHover: 'hover:bg-yellow-100',
      acento: 'bg-yellow-500', acentoHover: 'hover:bg-yellow-600',
      bgPrincipal: 'bg-gradient-to-br from-sky-50 via-white to-yellow-50',
      bgSecundario: 'bg-sky-50', bgCard: 'bg-white', bgHover: 'hover:bg-sky-50',
      textoPrincipal: 'text-gray-900', textoSecundario: 'text-gray-600', textoDestaque: 'text-sky-600',
      borda: 'border-sky-200', divisor: 'divide-sky-200',
    },
    estilos: { borderRadius: 'rounded-xl', borderWidth: 'border', shadow: 'shadow-md', shadowHover: 'hover:shadow-lg', fontFamily: 'font-sans', fontHeading: 'font-bold' },
  },

  'dia-dos-avos': {
    nome: '👵 Dia dos Avós',
    descricao: 'Estilo clássico, aconchegante e afetuoso',
    emoji: '👵',
    cores: {
      primaria: 'bg-emerald-700', primariaHover: 'hover:bg-emerald-800', primariaDark: 'bg-emerald-950',
      secundaria: 'bg-emerald-50', secundariaHover: 'hover:bg-emerald-100',
      acento: 'bg-emerald-600', acentoHover: 'hover:bg-emerald-700',
      bgPrincipal: 'bg-gradient-to-br from-emerald-50 via-white to-stone-50',
      bgSecundario: 'bg-emerald-50', bgCard: 'bg-white', bgHover: 'hover:bg-emerald-50',
      textoPrincipal: 'text-gray-900', textoSecundario: 'text-gray-600', textoDestaque: 'text-emerald-750',
      borda: 'border-emerald-200', divisor: 'divide-emerald-200',
    },
    estilos: { borderRadius: 'rounded-xl', borderWidth: 'border', shadow: 'shadow-md', shadowHover: 'hover:shadow-lg', fontFamily: 'font-sans', fontHeading: 'font-bold' },
  },

  'dia-dos-pais': {
    nome: '👔 Dia dos Pais',
    descricao: 'Homenagem sofisticada ao herói da família — Navy profundo e dourado nobre',
    emoji: '👔',
    cores: {
      primaria: 'bg-amber-600', primariaHover: 'hover:bg-amber-700', primariaDark: 'bg-amber-800',
      secundaria: 'bg-slate-800', secundariaHover: 'hover:bg-slate-700',
      acento: 'bg-amber-500', acentoHover: 'hover:bg-amber-600',
      bgPrincipal: 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800',
      bgSecundario: 'bg-slate-800', bgCard: 'bg-slate-800', bgHover: 'hover:bg-slate-700',
      textoPrincipal: 'text-white', textoSecundario: 'text-slate-300', textoDestaque: 'text-amber-400',
      borda: 'border-amber-500/30', divisor: 'divide-amber-500/20',
    },
    estilos: { borderRadius: 'rounded-2xl', borderWidth: 'border', shadow: 'shadow-xl', shadowHover: 'hover:shadow-2xl', fontFamily: 'font-sans', fontHeading: 'font-bold' },
  },

  'dia-do-irmao': {
    nome: '🧑‍🤝‍🧑 Dia do Irmão',
    descricao: 'Divertido, moderno e dinâmico com tons de teal e laranja',
    emoji: '🧑‍🤝‍🧑',
    cores: {
      primaria: 'bg-teal-600', primariaHover: 'hover:bg-teal-700', primariaDark: 'bg-teal-850',
      secundaria: 'bg-orange-50', secundariaHover: 'hover:bg-orange-100',
      acento: 'bg-orange-500', acentoHover: 'hover:bg-orange-600',
      bgPrincipal: 'bg-gradient-to-br from-teal-50 via-white to-orange-50',
      bgSecundario: 'bg-teal-50', bgCard: 'bg-white', bgHover: 'hover:bg-teal-50',
      textoPrincipal: 'text-gray-900', textoSecundario: 'text-gray-600', textoDestaque: 'text-teal-600',
      borda: 'border-teal-200', divisor: 'divide-teal-200',
    },
    estilos: { borderRadius: 'rounded-xl', borderWidth: 'border', shadow: 'shadow-md', shadowHover: 'hover:shadow-lg', fontFamily: 'font-sans', fontHeading: 'font-bold' },
  },

  'dia-do-cliente': {
    nome: '👑 Dia do Cliente',
    descricao: 'Visual premium, focado em prestígio e dourado',
    emoji: '👑',
    cores: {
      primaria: 'bg-zinc-850', primariaHover: 'hover:bg-black', primariaDark: 'bg-black',
      secundaria: 'bg-amber-50', secundariaHover: 'hover:bg-amber-100',
      acento: 'bg-amber-500', acentoHover: 'hover:bg-amber-600',
      bgPrincipal: 'bg-gradient-to-br from-zinc-900 via-zinc-800 to-black',
      bgSecundario: 'bg-zinc-800', bgCard: 'bg-zinc-900', bgHover: 'hover:bg-zinc-800',
      textoPrincipal: 'text-white', textoSecundario: 'text-zinc-400', textoDestaque: 'text-amber-400',
      borda: 'border-zinc-800', divisor: 'divide-zinc-800',
    },
    estilos: { borderRadius: 'rounded-lg', borderWidth: 'border', shadow: 'shadow-xl', shadowHover: 'hover:shadow-2xl', fontFamily: 'font-sans', fontHeading: 'font-bold' },
  },

  'dia-das-criancas': {
    nome: '🎈 Dia das Crianças',
    descricao: 'Lúdico, divertido e muito colorido em tons pastéis alegres',
    emoji: '🎈',
    cores: {
      primaria: 'bg-sky-500', primariaHover: 'hover:bg-sky-600', primariaDark: 'bg-sky-700',
      secundaria: 'bg-yellow-50', secundariaHover: 'hover:bg-yellow-100',
      acento: 'bg-pink-400', acentoHover: 'hover:bg-pink-500',
      bgPrincipal: 'bg-gradient-to-br from-sky-50 via-white to-pink-50',
      bgSecundario: 'bg-sky-50', bgCard: 'bg-white', bgHover: 'hover:bg-sky-50',
      textoPrincipal: 'text-gray-900', textoSecundario: 'text-gray-600', textoDestaque: 'text-sky-650',
      borda: 'border-sky-200', divisor: 'divide-sky-200',
    },
    estilos: { borderRadius: 'rounded-3xl', borderWidth: 'border-2', shadow: 'shadow-md', shadowHover: 'hover:shadow-lg', fontFamily: 'font-sans', fontHeading: 'font-extrabold' },
  },

  'halloween': {
    nome: '🎃 Halloween',
    descricao: 'Estilo dark temático com tons de laranja abóbora e roxo misterioso',
    emoji: '🎃',
    cores: {
      primaria: 'bg-orange-600', primariaHover: 'hover:bg-orange-500', primariaDark: 'bg-orange-700',
      secundaria: 'bg-purple-900/40', secundariaHover: 'hover:bg-purple-900/60',
      acento: 'bg-purple-500', acentoHover: 'hover:bg-purple-400',
      bgPrincipal: 'bg-zinc-950',
      bgSecundario: 'bg-zinc-900', bgCard: 'bg-zinc-900', bgHover: 'hover:bg-zinc-800',
      textoPrincipal: 'text-white', textoSecundario: 'text-zinc-400', textoDestaque: 'text-orange-400',
      borda: 'border-zinc-800', divisor: 'divide-zinc-800',
    },
    estilos: { borderRadius: 'rounded-xl', borderWidth: 'border', shadow: 'shadow-2xl', shadowHover: 'hover:shadow-2xl', fontFamily: 'font-sans', fontHeading: 'font-bold' },
  },

  'black-friday': {
    nome: '🏷️ Black Friday',
    descricao: 'Minimalista escuro de altíssimo impacto com amarelo neon',
    emoji: '🏷️',
    cores: {
      primaria: 'bg-yellow-500', primariaHover: 'hover:bg-yellow-450', primariaDark: 'bg-yellow-600',
      secundaria: 'bg-zinc-800', secundariaHover: 'hover:bg-zinc-700',
      acento: 'bg-yellow-500', acentoHover: 'hover:bg-yellow-450',
      bgPrincipal: 'bg-black',
      bgSecundario: 'bg-zinc-900', bgCard: 'bg-zinc-900', bgHover: 'hover:bg-zinc-850',
      textoPrincipal: 'text-white', textoSecundario: 'text-zinc-400', textoDestaque: 'text-yellow-400',
      borda: 'border-zinc-800', divisor: 'divide-zinc-800',
    },
    estilos: { borderRadius: 'rounded-md', borderWidth: 'border', shadow: 'shadow-2xl', shadowHover: 'hover:shadow-2xl', fontFamily: 'font-sans', fontHeading: 'font-black' },
  },

  'natal': {
    nome: '🎄 Natal',
    descricao: 'Clássico natalino sofisticado em tons de vermelho, verde e dourado',
    emoji: '🎄',
    cores: {
      primaria: 'bg-red-700', primariaHover: 'hover:bg-red-800', primariaDark: 'bg-red-900',
      secundaria: 'bg-emerald-50', secundariaHover: 'hover:bg-emerald-100',
      acento: 'bg-emerald-600', acentoHover: 'hover:bg-emerald-700',
      bgPrincipal: 'bg-gradient-to-br from-red-50 via-white to-emerald-50',
      bgSecundario: 'bg-emerald-50', bgCard: 'bg-white', bgHover: 'hover:bg-red-50',
      textoPrincipal: 'text-gray-900', textoSecundario: 'text-gray-600', textoDestaque: 'text-red-700',
      borda: 'border-red-200', divisor: 'divide-red-200',
    },
    estilos: { borderRadius: 'rounded-xl', borderWidth: 'border', shadow: 'shadow-md', shadowHover: 'hover:shadow-lg', fontFamily: 'font-sans', fontHeading: 'font-bold' },
  },

  'revellon': {
    nome: '🎆 Réveillon',
    descricao: 'Brilhante e elegante com tons de dourado e champagne',
    emoji: '🎆',
    cores: {
      primaria: 'bg-amber-600', primariaHover: 'hover:bg-amber-700', primariaDark: 'bg-amber-850',
      secundaria: 'bg-amber-50', secundariaHover: 'hover:bg-amber-100',
      acento: 'bg-amber-500', acentoHover: 'hover:bg-amber-600',
      bgPrincipal: 'bg-gradient-to-br from-amber-50 via-white to-gray-50',
      bgSecundario: 'bg-amber-50', bgCard: 'bg-white', bgHover: 'hover:bg-amber-50',
      textoPrincipal: 'text-gray-900', textoSecundario: 'text-gray-650', textoDestaque: 'text-amber-600',
      borda: 'border-amber-250', divisor: 'divide-amber-250',
    },
    estilos: { borderRadius: 'rounded-xl', borderWidth: 'border', shadow: 'shadow-md', shadowHover: 'hover:shadow-lg', fontFamily: 'font-sans', fontHeading: 'font-bold' },
  },

  'oferta-primavera': {
    nome: '🌸 Oferta de Primavera',
    descricao: 'Visual fresco e vibrante com tons florais e coloridos',
    emoji: '🌸',
    cores: {
      primaria: 'bg-emerald-600', primariaHover: 'hover:bg-emerald-700', primariaDark: 'bg-emerald-800',
      secundaria: 'bg-pink-50', secundariaHover: 'hover:bg-pink-100',
      acento: 'bg-pink-500', acentoHover: 'hover:bg-pink-650',
      bgPrincipal: 'bg-gradient-to-br from-emerald-50 via-white to-pink-50',
      bgSecundario: 'bg-emerald-50', bgCard: 'bg-white', bgHover: 'hover:bg-emerald-50',
      textoPrincipal: 'text-gray-900', textoSecundario: 'text-gray-600', textoDestaque: 'text-emerald-600',
      borda: 'border-emerald-200', divisor: 'divide-emerald-200',
    },
    estilos: { borderRadius: 'rounded-xl', borderWidth: 'border', shadow: 'shadow-md', shadowHover: 'hover:shadow-lg', fontFamily: 'font-sans', fontHeading: 'font-bold' },
  },

  'oferta-verao': {
    nome: '☀️ Oferta de Verão',
    descricao: 'Energia solar e calorosa em tons de amarelo e laranja',
    emoji: '☀️',
    cores: {
      primaria: 'bg-orange-500', primariaHover: 'hover:bg-orange-600', primariaDark: 'bg-orange-700',
      secundaria: 'bg-yellow-50', secundariaHover: 'hover:bg-yellow-100',
      acento: 'bg-yellow-500', acentoHover: 'hover:bg-yellow-600',
      bgPrincipal: 'bg-gradient-to-br from-yellow-50 via-white to-orange-50',
      bgSecundario: 'bg-yellow-50', bgCard: 'bg-white', bgHover: 'hover:bg-yellow-50',
      textoPrincipal: 'text-gray-900', textoSecundario: 'text-gray-600', textoDestaque: 'text-orange-650',
      borda: 'border-yellow-200', divisor: 'divide-yellow-200',
    },
    estilos: { borderRadius: 'rounded-xl', borderWidth: 'border', shadow: 'shadow-md', shadowHover: 'hover:shadow-lg', fontFamily: 'font-sans', fontHeading: 'font-bold' },
  },

  'oferta-outono': {
    nome: '🍁 Oferta de Outono',
    descricao: 'Visual sofisticado e sóbrio em tons terrosos e âmbar',
    emoji: '🍁',
    cores: {
      primaria: 'bg-amber-700', primariaHover: 'hover:bg-amber-800', primariaDark: 'bg-amber-900',
      secundaria: 'bg-amber-50', secundariaHover: 'hover:bg-amber-100',
      acento: 'bg-amber-650', acentoHover: 'hover:bg-amber-700',
      bgPrincipal: 'bg-gradient-to-br from-amber-100 via-white to-amber-50',
      bgSecundario: 'bg-amber-50', bgCard: 'bg-white', bgHover: 'hover:bg-amber-50',
      textoPrincipal: 'text-amber-950', textoSecundario: 'text-amber-850', textoDestaque: 'text-amber-800',
      borda: 'border-amber-200', divisor: 'divide-amber-200',
    },
    estilos: { borderRadius: 'rounded-xl', borderWidth: 'border', shadow: 'shadow-md', shadowHover: 'hover:shadow-lg', fontFamily: 'font-sans', fontHeading: 'font-bold' },
  },

  'oferta-inverno': {
    nome: '❄️ Oferta de Inverno',
    descricao: 'Estilo aconchegante e elegante em tons de azul e cinza frio',
    emoji: '❄️',
    cores: {
      primaria: 'bg-sky-700', primariaHover: 'hover:bg-sky-800', primariaDark: 'bg-sky-950',
      secundaria: 'bg-sky-50', secundariaHover: 'hover:bg-sky-100',
      acento: 'bg-sky-600', acentoHover: 'hover:bg-sky-700',
      bgPrincipal: 'bg-gradient-to-br from-sky-50 via-white to-slate-50',
      bgSecundario: 'bg-sky-50', bgCard: 'bg-white', bgHover: 'hover:bg-sky-50',
      textoPrincipal: 'text-gray-900', textoSecundario: 'text-gray-650', textoDestaque: 'text-sky-750',
      borda: 'border-sky-200', divisor: 'divide-sky-200',
    },
    estilos: { borderRadius: 'rounded-xl', borderWidth: 'border', shadow: 'shadow-md', shadowHover: 'hover:shadow-lg', fontFamily: 'font-sans', fontHeading: 'font-bold' },
  },
};

/**
 * Obtém a configuração de um tema
 */
export function getTema(tipo: TemaType | string = 'moderno'): TemaConfig {
  // Alias para compatibilidade com templates antigos
  const aliasMap: Record<string, TemaType> = {
    'aloha': 'natural',
  };

  const temaFinal = aliasMap[tipo] || tipo as TemaType;

  return TEMAS[temaFinal] || TEMAS.moderno;
}

/**
 * Gera classes CSS combinadas para um elemento baseado no tema
 */
export function getThemeClasses(tema: TemaConfig, tipo: 'button' | 'card' | 'input' | 'badge' | 'header') {
  const baseClasses = {
    button: [
      tema.cores.primaria,
      tema.cores.primariaHover,
      'text-white',
      'font-medium',
      'px-6 py-3',
      tema.estilos.borderRadius,
      tema.estilos.shadow,
      tema.estilos.shadowHover,
      'transition-all duration-200',
    ],
    card: [
      tema.cores.bgCard,
      tema.estilos.borderRadius,
      tema.estilos.shadow,
      tema.estilos.shadowHover,
      'border',
      tema.cores.borda,
      'transition-all duration-200',
    ],
    input: [
      tema.cores.bgCard,
      'border',
      tema.cores.borda,
      tema.estilos.borderRadius,
      'px-4 py-2',
      'focus:ring-2',
      tema.cores.textoDestaque.replace('text-', 'focus:ring-'),
      'focus:border-transparent',
    ],
    badge: [
      tema.cores.secundaria,
      tema.cores.textoDestaque,
      'px-3 py-1',
      tema.estilos.borderRadius,
      'font-medium text-sm',
    ],
    header: [
      tema.cores.bgCard,
      'border-b',
      tema.cores.borda,
      tema.estilos.shadow,
    ],
  };

  return baseClasses[tipo].join(' ');
}

/**
 * Helper para aplicar tema em textos
 */
export function getTextClass(tema: TemaConfig, tipo: 'principal' | 'secundario' | 'destaque') {
  const classes = {
    principal: tema.cores.textoPrincipal,
    secundario: tema.cores.textoSecundario,
    destaque: tema.cores.textoDestaque,
  };
  return classes[tipo];
}
