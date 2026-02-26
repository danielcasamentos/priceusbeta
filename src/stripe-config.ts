export interface StripeProduct {
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
  price: number;
  currency: string;
}

export const stripeProducts: StripeProduct[] = [
  {
    priceId: 'price_1SnYpRJwpG82WWRabkukFNvc',
    name: 'Plano Mensal',
    description: 'Acesso completo com flexibilidade mensal.',
    mode: 'subscription',
    price: 97.00,
    currency: 'BRL'
  },
  {
    priceId: 'price_1SntymJwpG82WWRaqI7s9bCw',
    name: 'Plano Anual',
    description: 'Garanta 1 ano de PriceU$ com um desconto incrível',
    mode: 'subscription',
    price: 1000.00,
    currency: 'BRL'
  },
];

export const getProductByPriceId = (priceId: string): StripeProduct | undefined => {
  return stripeProducts.find(product => product.priceId === priceId);
};