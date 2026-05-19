-- Backfill existing transactions with documento_fiscal from contracts and leads
-- 1. Backfill from contracts
UPDATE company_transactions t
SET documento_fiscal = COALESCE(
  c.client_data_json->>'cpf',
  c.client_data_json->>'documento'
)
FROM contracts c
WHERE t.contract_id = c.id
  AND (t.documento_fiscal IS NULL OR t.documento_fiscal = '');

-- 2. Backfill from leads
UPDATE company_transactions t
SET documento_fiscal = COALESCE(
  l.dados_formulario->>'cpf',
  l.dados_formulario->>'documento'
)
FROM leads l
WHERE t.lead_id = l.id
  AND (t.documento_fiscal IS NULL OR t.documento_fiscal = '');
