-- Adiciona campo para controlar se a forma de pagamento é obrigatória no orçamento
ALTER TABLE templates
ADD COLUMN IF NOT EXISTS forma_pagamento_obrigatoria BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN templates.forma_pagamento_obrigatoria IS 
  'Quando ativo, o cliente é obrigado a selecionar uma forma de pagamento antes de enviar o orçamento. Só tem efeito se o template tiver formas de pagamento cadastradas.';
