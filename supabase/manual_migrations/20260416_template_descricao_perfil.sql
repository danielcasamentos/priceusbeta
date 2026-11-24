-- 1. Campo de descrição curta exibida no perfil público (vitrine)
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS descricao_perfil varchar(200);

-- 2. Toggle para ocultar a data de criação nos cards do perfil público
ALTER TABLE templates
ADD COLUMN IF NOT EXISTS ocultar_data_criacao boolean DEFAULT false;
