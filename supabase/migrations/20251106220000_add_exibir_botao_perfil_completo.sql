/*
  # Adicionar controle de exibição do botão "Ver Perfil Completo"

  1. Alterações na Tabela profiles
    - `exibir_botao_perfil_completo` (BOOLEAN, default true) - Controla se o botão "Ver Perfil Completo" aparece no cabeçalho dos orçamentos (QuotePage)

  2. Lógica
    - Por padrão, o botão será exibido (true)
    - O fotógrafo pode desativar a exibição através do editor de perfil
    - A exibição também depende de `perfil_publico` estar true e `slug_usuario` estar definido

  3. Segurança
    - Apenas o proprietário do perfil pode alterar este campo
    - Campo é opcional e não afeta funcionalidades críticas
*/

-- Adicionar coluna em profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'exibir_botao_perfil_completo'
  ) THEN
    ALTER TABLE profiles
    ADD COLUMN exibir_botao_perfil_completo BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Comentário explicativo
COMMENT ON COLUMN profiles.exibir_botao_perfil_completo IS 'Define se o botão "Ver Perfil Completo" aparece no cabeçalho dos orçamentos (QuotePage)';
