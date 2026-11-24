/**
 * Text Normalization Utilities
 *
 * Funções para normalização de texto, úteis para:
 * - Busca e matching de strings
 * - Comparação case-insensitive
 * - Remoção de acentos e caracteres especiais
 */

/**
 * Normaliza texto removendo acentos, convertendo para minúsculas e removendo espaços extras
 *
 * @param text - Texto a ser normalizado
 * @returns Texto normalizado
 *
 * @example
 * normalizeText('São Paulo')  // 'sao paulo'
 * normalizeText('  Rio de Janeiro  ')  // 'rio de janeiro'
 * normalizeText('Brasília')  // 'brasilia'
 */
export function normalizeText(text: string): string {
  if (!text) return '';

  return text
    .normalize('NFD') // Decompõe caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '') // Remove diacríticos (acentos)
    .toLowerCase() // Converte para minúsculas
    .trim() // Remove espaços no início e fim
    .replace(/\s+/g, ' '); // Substitui múltiplos espaços por um único espaço
}

/**
 * Verifica se um texto contém outro (case-insensitive e sem acentos)
 *
 * @param haystack - Texto onde buscar
 * @param needle - Texto a ser buscado
 * @returns true se encontrado, false caso contrário
 *
 * @example
 * textIncludes('São Paulo', 'paulo')  // true
 * textIncludes('São Paulo', 'PAULO')  // true
 * textIncludes('São Paulo', 'rio')    // false
 */
export function textIncludes(haystack: string, needle: string): boolean {
  return normalizeText(haystack).includes(normalizeText(needle));
}

/**
 * Verifica se dois textos são iguais (case-insensitive e sem acentos)
 *
 * @param text1 - Primeiro texto
 * @param text2 - Segundo texto
 * @returns true se iguais, false caso contrário
 *
 * @example
 * textEquals('São Paulo', 'sao paulo')  // true
 * textEquals('Rio', 'RIO')              // true
 * textEquals('São Paulo', 'Brasília')   // false
 */
export function textEquals(text1: string, text2: string): boolean {
  return normalizeText(text1) === normalizeText(text2);
}

/**
 * Filtra array de objetos por um campo de texto
 *
 * @param items - Array de objetos a serem filtrados
 * @param searchText - Texto de busca
 * @param fieldGetter - Função para extrair o campo de texto do objeto
 * @returns Array filtrado
 *
 * @example
 * const cities = [
 *   { name: 'São Paulo', state: 'SP' },
 *   { name: 'Rio de Janeiro', state: 'RJ' }
 * ];
 *
 * filterByText(cities, 'paulo', item => item.name)
 * // [{ name: 'São Paulo', state: 'SP' }]
 */
export function filterByText<T>(
  items: T[],
  searchText: string,
  fieldGetter: (item: T) => string
): T[] {
  const normalized = normalizeText(searchText);

  if (!normalized) return items;

  return items.filter(item => {
    const fieldValue = fieldGetter(item);
    return normalizeText(fieldValue).includes(normalized);
  });
}

/**
 * Ordena array de objetos por relevância de texto
 *
 * @param items - Array de objetos a serem ordenados
 * @param searchText - Texto de busca
 * @param fieldGetter - Função para extrair o campo de texto do objeto
 * @returns Array ordenado por relevância
 *
 * @example
 * const cities = [
 *   { name: 'São Paulo' },
 *   { name: 'Paulínia' },
 *   { name: 'São José' }
 * ];
 *
 * sortByRelevance(cities, 'paulo', item => item.name)
 * // [{ name: 'São Paulo' }, { name: 'Paulínia' }, { name: 'São José' }]
 */
export function sortByRelevance<T>(
  items: T[],
  searchText: string,
  fieldGetter: (item: T) => string
): T[] {
  const normalized = normalizeText(searchText);

  if (!normalized) return items;

  return [...items].sort((a, b) => {
    const aText = normalizeText(fieldGetter(a));
    const bText = normalizeText(fieldGetter(b));

    // Exata match primeiro
    if (aText === normalized) return -1;
    if (bText === normalized) return 1;

    // Começa com segundo
    const aStarts = aText.startsWith(normalized);
    const bStarts = bText.startsWith(normalized);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;

    // Ordem alfabética para o resto
    return aText.localeCompare(bText);
  });
}
