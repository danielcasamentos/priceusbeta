export const cleanDocument = (value: string) => value.replace(/\D/g, '');

export const formatDocument = (value: string) => {
  const cleaned = cleanDocument(value);
  if (cleaned.length <= 11) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else {
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
};

export const isValidCpf = (str: string) => {
  const cpf = cleanDocument(str);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf.charAt(i)) * (10 - i);
  let remainder = (sum * 10) % 11;
  remainder = remainder === 10 || remainder === 11 ? 0 : remainder;
  if (remainder !== parseInt(cpf.charAt(9))) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf.charAt(i)) * (11 - i);
  remainder = (sum * 10) % 11;
  remainder = remainder === 10 || remainder === 11 ? 0 : remainder;
  return remainder === parseInt(cpf.charAt(10));
};

export const isValidCnpj = (str: string) => {
  const cnpj = cleanDocument(str);
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  const weights1 = [6,5,4,3,2,9,8,7,6,5,4,3,2];
  const weights2 = [5,4,3,2,9,8,7,6,5,4,3,2,1];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(cnpj.charAt(i)) * weights1[i];
  let remainder = sum % 11;
  let digit1 = remainder < 2 ? 0 : 11 - remainder;
  sum = 0;
  for (let i = 0; i < 13; i++) sum += parseInt(cnpj.charAt(i)) * weights2[i];
  remainder = sum % 11;
  let digit2 = remainder < 2 ? 0 : 11 - remainder;
  return parseInt(cnpj.charAt(12)) === digit1 && parseInt(cnpj.charAt(13)) === digit2;
};

export const isValidDocument = (value: string) => {
  const cleaned = cleanDocument(value);
  return cleaned.length === 11 ? isValidCpf(value) : cleaned.length === 14 ? isValidCnpj(value) : false;
};
