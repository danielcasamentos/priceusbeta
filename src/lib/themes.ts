/**
 * 🎨 SISTEMA DE TEMAS PARA QUOTEPAGE
 *
 * Define estilos visuais diferentes para a página de orçamento
 * sem afetar funcionalidades. Cada tema tem sua paleta e estilo único.
 */

export type TemaType = 'moderno' | 'classico' | 'romantico' | 'vibrante' | 'natural' | 'minimalista' | 'pretoebranco' | 'darkstudio';

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
