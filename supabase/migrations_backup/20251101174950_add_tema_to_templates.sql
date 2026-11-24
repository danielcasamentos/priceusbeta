/*
  # Adicionar campo de tema aos templates

  1. Alterações
    - Adiciona coluna `tema` na tabela `templates`
    - Tipo: text com valores permitidos: 'moderno', 'classico', 'romantico', 'vibrante'
    - Valor padrão: 'moderno'
    - Permite que fotógrafos escolham o estilo visual da página de orçamento
  
  2. Notas
    - Não afeta funcionalidades existentes
    - Apenas controla o tema visual da QuotePage
    - Cada template pode ter seu próprio tema
*/

-- Adicionar coluna tema com valores permitidos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'templates' AND column_name = 'tema'
  ) THEN
    ALTER TABLE templates 
    ADD COLUMN tema text DEFAULT 'moderno' CHECK (tema IN ('moderno', 'classico', 'romantico', 'vibrante'));
    
    -- Adicionar comentário explicativo
    COMMENT ON COLUMN templates.tema IS 'Tema visual da página de orçamento: moderno (azul/clean), classico (preto/dourado), romantico (rosa/lavanda), vibrante (roxo/laranja)';
  END IF;
END $$;
