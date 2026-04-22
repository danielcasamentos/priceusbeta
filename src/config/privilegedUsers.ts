/**
 * Lista de usuários com acesso premium vitalício
 * Estes emails têm bypass completo da Stripe e limites
 */
export const PRIVILEGED_EMAILS = [
  'odanielfotografo@icloud.com',
  'danielazevedofotografia@gmail.com',
  'lorrane.jaibe@icloud.com',
  'daniel@danielazevedofotografia.com',
  'arthurcarvalho2317@gmail.com',
  'wesllem_photos2024@hotmail.com'
] as const;

export const isPrivilegedUser = (email: string | undefined): boolean => {
  if (!email) return false;
  return PRIVILEGED_EMAILS.includes(email.toLowerCase() as any);
};
