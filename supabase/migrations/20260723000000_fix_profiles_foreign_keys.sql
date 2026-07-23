-- Garantir que a coluna tema_personalizado_id seja do tipo UUID e possua a Chave Estrangeira com temas_personalizados
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'tema_personalizado_id' 
        AND data_type != 'uuid'
    ) THEN
        ALTER TABLE profiles ALTER COLUMN tema_personalizado_id TYPE uuid USING NULLIF(tema_personalizado_id, '')::uuid;
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_tema_personalizado_id_fkey'
    ) THEN
        ALTER TABLE profiles 
        ADD CONSTRAINT profiles_tema_personalizado_id_fkey 
        FOREIGN KEY (tema_personalizado_id) REFERENCES temas_personalizados(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Garantir que as galerias tenham permissões de leitura pública e autenticada
GRANT ALL ON TABLE galleries TO authenticated, anon, service_role;
GRANT ALL ON TABLE gallery_photos TO authenticated, anon, service_role;
