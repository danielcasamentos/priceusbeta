-- ============================================================
-- Migração: Forma de Pagamento Padrão (Pré-selecionada)
-- Data: 2026-05-29
-- Objetivo: Permite ao fotógrafo marcar uma forma de pagamento
--           como "padrão", que será pré-selecionada para o cliente
--           ao abrir o orçamento.
-- ============================================================

ALTER TABLE formas_pagamento
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

-- Garante que apenas 1 forma por template pode ser marcada como padrão.
-- A constraint é do tipo CHECK parcial via trigger (Postgres não suporta
-- unique parcial em booleanos de forma nativa, então usamos um índice).
CREATE UNIQUE INDEX IF NOT EXISTS formas_pagamento_one_default_per_template
  ON formas_pagamento (template_id)
  WHERE is_default = true;

COMMENT ON COLUMN formas_pagamento.is_default IS
  'Quando true, esta forma de pagamento é pré-selecionada automaticamente para o cliente ao abrir o orçamento.';
