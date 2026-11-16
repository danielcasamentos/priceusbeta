-- Add Progressive Discounts, Quantity Steps (+), Custom Date/Period Pricing, and Time Slot toggle
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS grupo_desconto text,
  ADD COLUMN IF NOT EXISTS faixas_preco jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS escaloes_quantidade jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS regras_preco_data jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS regras_desconto_progressivo jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS permitir_escolha_horario boolean DEFAULT false;

COMMENT ON COLUMN public.produtos.grupo_desconto IS 'Group identifier for multi-product progressive discounts (e.g. Ensaios, Álbuns)';
COMMENT ON COLUMN public.produtos.faixas_preco IS 'Tiered package pricing (e.g. 10 fotos, 20 fotos, 30 fotos) with weekday vs weekend/holiday price rules';
COMMENT ON COLUMN public.produtos.escaloes_quantidade IS 'Progressive pricing by quantity when clicking + (e.g. 1h = R$ 200, 2h = R$ 300, 3h = R$ 400)';
COMMENT ON COLUMN public.produtos.regras_preco_data IS 'Custom date, day-of-week, and holiday pricing rules per product with optional progressive quantity steps';
COMMENT ON COLUMN public.templates.regras_desconto_progressivo IS 'Progressive discount rules (% or R$) by product group and day-of-week/period adjustments';
COMMENT ON COLUMN public.templates.permitir_escolha_horario IS 'Whether clients can select an available time slot on the chosen date consulting the linked agenda';


