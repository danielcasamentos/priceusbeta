/*
  # Adicionar tema 'escuro' às opções disponíveis

  1. Alterações
    - Atualiza constraint CHECK da coluna `tema` na tabela `templates`
    - Adiciona 'escuro' como opção válida
    - Mantém valores existentes: 'moderno', 'classico', 'romantico', 'vibrante'
  
  2. Notas
    - Templates existentes não são afetados
    - Novo tema: Modo escuro sofisticado com paleta dark
*/

-- Remove constraint antigo e adiciona novo com 'escuro'
DO $$
BEGIN
  -- Remove constraint existente se houver
  ALTER TABLE templates DROP CONSTRAINT IF EXISTS templates_tema_check;
  
  -- Adiciona novo constraint com 'escuro' incluído
  ALTER TABLE templates 
  ADD CONSTRAINT templates_tema_check 
  CHECK (tema IN ('moderno', 'classico', 'romantico', 'vibrante', 'escuro'));
  
END $$;

-- Atualiza comentário da coluna
COMMENT ON COLUMN templates.tema IS 'Tema visual da página de orçamento: moderno (azul/clean), classico (preto/dourado), romantico (rosa/lavanda), vibrante (roxo/laranja), escuro (modo dark sofisticado)';
