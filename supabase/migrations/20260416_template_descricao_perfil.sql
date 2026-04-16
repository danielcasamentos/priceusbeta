-- 1. Adiconando novo campo de descrição para exibição restrita no Perfil Público (Vitrines)
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS descricao_perfil varchar(200);
