/*
  # Adicionar campo entrada_tipo em formas_pagamento

  1. Alterações
    - Adiciona coluna `entrada_tipo` (percentual ou fixo)
    - Define valor padrão como 'fixo' para manter compatibilidade
    - Atualiza registros existentes
*/

-- Adicionar coluna entrada_tipo
ALTER TABLE formas_pagamento 
ADD COLUMN IF NOT EXISTS entrada_tipo text DEFAULT 'fixo' CHECK (entrada_tipo IN ('percentual', 'fixo'));

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_formas_pagamento_entrada_tipo ON formas_pagamento(entrada_tipo);

-- Comentários
COMMENT ON COLUMN formas_pagamento.entrada_tipo IS 'Tipo de entrada: percentual (% do total) ou fixo (valor em R$)';
