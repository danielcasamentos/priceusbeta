/*
  # Adicionar campo mostrar_imagem em produtos

  1. Alterações
    - Adiciona coluna `mostrar_imagem` para controlar exibição da imagem no orçamento
    - Define valor padrão como true
*/

-- Adicionar coluna mostrar_imagem
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS mostrar_imagem boolean DEFAULT true;

-- Comentário
COMMENT ON COLUMN produtos.mostrar_imagem IS 'Define se a imagem do produto será exibida no orçamento para o cliente';
