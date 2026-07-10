/*
  # Adicionar campo de bloqueio de campos obrigatórios

  ## Objetivo
  Permite que fotógrafos bloqueiem funcionalidades até que 
  campos obrigatórios sejam preenchidos pelo cliente

  ## Mudanças
  1. Adiciona coluna `bloquear_campos_obrigatorios` aos templates
  2. Quando TRUE, bloqueia:
     - Adição de produtos extras
     - Botão WhatsApp
     - Campos de cupom
     - Totais e formas de pagamento
  3. Só desbloqueia após preencher todos campos obrigatórios

  ## Comportamento
  - FALSE (padrão): Funciona como antes
  - TRUE: Validação rigorosa ativada
*/

-- Adicionar campo de bloqueio
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'templates' 
    AND column_name = 'bloquear_campos_obrigatorios'
  ) THEN
    ALTER TABLE templates 
    ADD COLUMN bloquear_campos_obrigatorios boolean DEFAULT false;
  END IF;
END $$;

-- Comentário para documentação
COMMENT ON COLUMN templates.bloquear_campos_obrigatorios IS 
  'Quando TRUE, bloqueia produtos extras e WhatsApp até preencher campos obrigatórios';