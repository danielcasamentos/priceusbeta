export interface StripeProduct {
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
  price: number;
  currency: string;
  adTier?: string;
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
  {
    priceId: 'price_ads_basic_placeholder',
    name: 'Ads Básico — Destaque no Marketplace',
    description: 'Badge Destaque + posição top 10 nas buscas do marketplace.',
    mode: 'subscription',
    price: 97.00,
    currency: 'BRL',
    adTier: 'basic',
  },
  {
    priceId: 'price_ads_pro_placeholder',
    name: 'Ads Pro — Destaque Premium',
    description: 'Posição garantida top 5 + badge Pro nas buscas.',
    mode: 'subscription',
    price: 197.00,
    currency: 'BRL',
    adTier: 'pro',
  },
  {
    priceId: 'price_ads_premium_placeholder',
    name: 'Ads Premium — Topo do Marketplace',
    description: 'Posição #1 garantida + banner exclusivo na categoria.',
    mode: 'subscription',
    price: 397.00,
    currency: 'BRL',
    adTier: 'premium',
  },
];

export const getProductByPriceId = (priceId: string): StripeProduct | undefined => {
  return stripeProducts.find(product => product.priceId === priceId);
};