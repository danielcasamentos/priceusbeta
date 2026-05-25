-- Adiciona campo para controlar se o número de parcelas deve ser limitado pela data do evento
ALTER TABLE templates
ADD COLUMN IF NOT EXISTS limitar_parcelas_pelo_evento BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN templates.limitar_parcelas_pelo_evento IS 
  'Quando ativo, o limite máximo de parcelas é dinamicamente reduzido de acordo com a quantidade de meses restantes até a data do evento selecionado.';
