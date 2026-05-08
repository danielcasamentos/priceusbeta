-- Migration: Novas features de produto
-- 1. permite_multiplas_unidades: toggle vs contador de quantidade no quote
-- 2. desconto_percentual: desconto por produto (badge + preço riscado)

ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS permite_multiplas_unidades BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS desconto_percentual NUMERIC(5,2) DEFAULT 0
    CHECK (desconto_percentual >= 0 AND desconto_percentual <= 100);

-- Garante que produtos existentes herdam o comportamento atual (multiplas unidades)
UPDATE produtos SET permite_multiplas_unidades = TRUE WHERE permite_multiplas_unidades IS NULL;
UPDATE produtos SET desconto_percentual = 0 WHERE desconto_percentual IS NULL;
