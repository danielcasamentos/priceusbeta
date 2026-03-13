
export const cleanDocument = (value: string) => value.replace(/\D/g, '');

export const formatDocument = (value: string) => {
  const cleaned = cleanDocument(value);
  if (cleaned.length <= 11) {
    // CPF: 000.000.000-00
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else {
    // CNPJ: 00.000.000/0000-00
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
};

export const isValidCpf = (str: string) => {
  const cpf = cleanDocument(str);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let sum = 0, remainder;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf.charAt(i)) * (10 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(9))) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf.charAt(i)) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  return remainder === parseInt(cpf.charAt(10));
};

export const isValidCnpj = (cnpj: string): boolean => {
  const cleanedCnpj = cleanDocument(cnpj);

  if (cleanedCnpj.length !== 14) {
    return false;
  }

  if (/^(\d)\1+$/.test(cleanedCnpj)) {
    return false;
  }

  let size = cleanedCnpj.length - 2;
  let numbers = cleanedCnpj.substring(0, size);
  const digits = cleanedCnpj.substring(size);
  let sum = 0;
  let pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i), 10) * pos--;
    if (pos < 2) {
      pos = 9;
    }
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);

  if (result !== parseInt(digits.charAt(0), 10)) {
    return false;
  }

  size = size + 1;
  numbers = cleanedCnpj.substring(0, size);
  sum = 0;
  pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i), 10) * pos--;
    if (pos < 2) {
      pos = 9;
    }
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);

  if (result !== parseInt(digits.charAt(1), 10)) {
    return false;
  }

  return true;
};

export const isValidDocument = (value: string) => {
  const cleaned = cleanDocument(value);
  return cleaned.length === 11 ? isValidCpf(value) : cleaned.length === 14 ? isValidCnpj(value) : false;
};

export const isCpf = (value: string) => cleanDocument(value).length === 11;
