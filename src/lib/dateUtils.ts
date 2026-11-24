/**
 * Helper para parsear uma string no formato YYYY-MM-DD como um objeto Date local,
 * evitando problemas comuns de fuso horário (timezone).
 * 
 * @param ymdString A string de data no formato 'YYYY-MM-DD'.
 * @returns Um objeto Date representando a data local. Retorna uma data inválida se a string for nula ou vazia.
 */
export const parseLocalYMD = (ymdString: string): Date => {
  if (!ymdString) {
    // Retorna uma data inválida para que as checagens subsequentes (ex: isNaN(date.getTime())) falhem.
    return new Date(NaN);
  }
  
  const parts = ymdString.split('-');
  if (parts.length !== 3) {
    return new Date(NaN);
  }

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  // Validação básica dos componentes da data
  if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    return new Date(NaN);
  }

  // Cria a data no fuso horário local
  return new Date(year, month - 1, day);
};
