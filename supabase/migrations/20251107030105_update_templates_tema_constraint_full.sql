/*
  # Update templates tema constraint to support all themes

  1. Changes
    - Drops existing templates_tema_check constraint
    - Adds new constraint supporting all 8 themes from themes.ts
    - Themes: 'moderno', 'classico', 'romantico', 'vibrante', 'escuro', 'natural', 'minimalista', 'studio'
  
  2. Notes
    - Existing templates are not affected
    - All themes from the themes.ts system are now supported
    - Default remains 'moderno' for new templates
*/

-- Remove existing constraint and add new one with all themes
DO $$
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE templates DROP CONSTRAINT IF EXISTS templates_tema_check;
  
  -- Add new constraint with all 8 themes
  ALTER TABLE templates 
  ADD CONSTRAINT templates_tema_check 
  CHECK (tema IN (
    'moderno',      -- Clean e minimalista com azul suave
    'classico',     -- Sofisticado com preto e dourado
    'romantico',    -- Delicado com rosa e lavanda
    'vibrante',     -- Criativo com cores vivas
    'escuro',       -- Sofisticado modo dark
    'natural',      -- Design natural e atemporal
    'minimalista',  -- Espaços amplos e foco nas imagens
    'studio'        -- Elegante com toques de bronze
  ));
  
END $$;

-- Update column comment with all themes
COMMENT ON COLUMN templates.tema IS 'Tema visual da página de orçamento: moderno (azul/clean), classico (preto/dourado), romantico (rosa/lavanda), vibrante (roxo/laranja), escuro (modo dark), natural (verde/âmbar), minimalista (cinza/espaços amplos), studio (rose/bronze)';
