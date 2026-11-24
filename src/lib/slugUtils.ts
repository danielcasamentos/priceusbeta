import { supabase } from './supabase';

export function generateSlug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
}

export function validateSlugFormat(slug: string): boolean {
  const slugRegex = /^[a-z0-9-]+$/;
  return slugRegex.test(slug) && slug.length >= 3 && slug.length <= 50;
}

const RESERVED_WORDS = [
  'admin', 'api', 'login', 'logout', 'signup', 'signin', 'dashboard',
  'profile', 'perfil', 'config', 'configuracoes', 'settings', 'user',
  'usuario', 'orcamento', 'quote', 'leads', 'contratos', 'contracts',
  'empresa', 'company', 'agenda', 'calendar', 'help', 'ajuda', 'faq',
  'videos', 'tutoriais', 'avaliacoes', 'reviews', 'pricing', 'preco',
  'about', 'sobre', 'contact', 'contato', 'terms', 'termos', 'privacy',
  'privacidade', 'legal', 'support', 'suporte', 'blog', 'news', 'docs',
  'documentation', 'home', 'index', 'sitemap', 'robots', 'public'
];

export function isReservedWord(slug: string): boolean {
  return RESERVED_WORDS.includes(slug.toLowerCase());
}

export async function checkUserSlugAvailability(slug: string, currentUserId?: string): Promise<boolean> {
  if (!slug || !validateSlugFormat(slug)) {
    return false;
  }

  if (isReservedWord(slug)) {
    return false;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('slug_usuario', slug)
    .maybeSingle();

  if (error) {
    console.error('Error checking slug availability:', error);
    return false;
  }

  if (!data) {
    return true;
  }

  return currentUserId ? data.id === currentUserId : false;
}

export async function checkTemplateSlugAvailability(
  slug: string,
  userId: string,
  currentTemplateId?: string
): Promise<boolean> {
  if (!slug || !validateSlugFormat(slug)) {
    return false;
  }

  const { data, error } = await supabase
    .from('templates')
    .select('id')
    .eq('user_id', userId)
    .eq('slug_template', slug)
    .maybeSingle();

  if (error) {
    console.error('Error checking template slug availability:', error);
    return false;
  }

  if (!data) {
    return true;
  }

  return currentTemplateId ? data.id === currentTemplateId : false;
}

export function suggestAlternativeSlug(baseSlug: string, count: number = 1): string {
  const slug = generateSlug(baseSlug);
  return count === 1 ? slug : `${slug}-${count}`;
}

export async function generateUniqueUserSlug(baseName: string, userId?: string): Promise<string> {
  let slug = generateSlug(baseName);
  let count = 1;

  while (!(await checkUserSlugAvailability(slug, userId))) {
    count++;
    slug = suggestAlternativeSlug(baseName, count);

    if (count > 100) {
      slug = `${slug}-${Date.now()}`;
      break;
    }
  }

  return slug;
}

export async function generateUniqueTemplateSlug(
  baseTitle: string,
  userId: string,
  templateId?: string
): Promise<string> {
  let slug = generateSlug(baseTitle);
  let count = 1;

  while (!(await checkTemplateSlugAvailability(slug, userId, templateId))) {
    count++;
    slug = suggestAlternativeSlug(baseTitle, count);

    if (count > 100) {
      slug = `${slug}-${Date.now()}`;
      break;
    }
  }

  return slug;
}

export function sanitizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}
