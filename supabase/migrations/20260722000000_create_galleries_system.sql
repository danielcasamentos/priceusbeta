-- Migration: Create Galleries and Gallery Photos Tables, RLS and Storage Bucket

DO $$ 
BEGIN
    -- 1. Criar Tabela 'galleries'
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'galleries') THEN
        CREATE TABLE galleries (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            client_id UUID, -- Vinculado ao lead/cliente se houver
            title TEXT NOT NULL,
            slug TEXT NOT NULL UNIQUE,
            event_date DATE,
            cover_photo_id UUID,
            cover_photo_url TEXT,
            password_hash TEXT,
            is_public_portfolio BOOLEAN DEFAULT false,
            allow_low_res_download BOOLEAN DEFAULT true,
            allow_high_res_download BOOLEAN DEFAULT true,
            watermark_enabled BOOLEAN DEFAULT false,
            watermark_text TEXT,
            price_per_extra_photo NUMERIC(10,2) DEFAULT 0,
            google_drive_folder_id TEXT,
            status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        ALTER TABLE galleries ENABLE ROW LEVEL SECURITY;

        -- RLS Policies para galleries
        CREATE POLICY "Fotógrafos podem ver suas próprias galerias"
            ON galleries FOR SELECT
            USING (auth.uid() = user_id OR status = 'active');

        CREATE POLICY "Fotógrafos podem criar galerias"
            ON galleries FOR INSERT
            WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Fotógrafos podem atualizar suas galerias"
            ON galleries FOR UPDATE
            USING (auth.uid() = user_id);

        CREATE POLICY "Fotógrafos podem deletar suas galerias"
            ON galleries FOR DELETE
            USING (auth.uid() = user_id);

        CREATE INDEX idx_galleries_user_id ON galleries(user_id);
        CREATE INDEX idx_galleries_slug ON galleries(slug);
        CREATE INDEX idx_galleries_portfolio ON galleries(user_id, is_public_portfolio, status);
    END IF;

    -- 2. Criar Tabela 'gallery_photos'
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'gallery_photos') THEN
        CREATE TABLE gallery_photos (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            gallery_id UUID REFERENCES galleries(id) ON DELETE CASCADE NOT NULL,
            google_drive_file_id TEXT NOT NULL,
            supabase_thumb_path TEXT NOT NULL,
            supabase_web_path TEXT NOT NULL,
            file_name TEXT,
            file_size_bytes BIGINT,
            width INTEGER,
            height INTEGER,
            display_order INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        ALTER TABLE gallery_photos ENABLE ROW LEVEL SECURITY;

        -- RLS Policies para gallery_photos
        CREATE POLICY "Qualquer pessoa pode visualizar fotos de galerias ativas"
            ON gallery_photos FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM galleries g 
                    WHERE g.id = gallery_photos.gallery_id 
                    AND (g.user_id = auth.uid() OR g.status = 'active')
                )
            );

        CREATE POLICY "Fotógrafos podem inserir fotos em suas galerias"
            ON gallery_photos FOR INSERT
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM galleries g 
                    WHERE g.id = gallery_photos.gallery_id 
                    AND g.user_id = auth.uid()
                )
            );

        CREATE POLICY "Fotógrafos podem atualizar fotos em suas galerias"
            ON gallery_photos FOR UPDATE
            USING (
                EXISTS (
                    SELECT 1 FROM galleries g 
                    WHERE g.id = gallery_photos.gallery_id 
                    AND g.user_id = auth.uid()
                )
            );

        CREATE POLICY "Fotógrafos podem deletar fotos de suas galerias"
            ON gallery_photos FOR DELETE
            USING (
                EXISTS (
                    SELECT 1 FROM galleries g 
                    WHERE g.id = gallery_photos.gallery_id 
                    AND g.user_id = auth.uid()
                )
            );

        CREATE INDEX idx_gallery_photos_gallery_id ON gallery_photos(gallery_id, display_order);
    END IF;
END $$;

-- 3. Criar Bucket de Storage no Supabase 'gallery-assets' se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery-assets', 'gallery-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso ao bucket 'gallery-assets'
DROP POLICY IF EXISTS "Galeria pública - Leitura pública das imagens" ON storage.objects;
CREATE POLICY "Galeria pública - Leitura pública das imagens"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'gallery-assets');

DROP POLICY IF EXISTS "Fotógrafos autenticados podem fazer upload de imagens" ON storage.objects;
CREATE POLICY "Fotógrafos autenticados podem fazer upload de imagens"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'gallery-assets' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Fotógrafos autenticados podem deletar suas imagens" ON storage.objects;
CREATE POLICY "Fotógrafos autenticados podem deletar suas imagens"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'gallery-assets' AND auth.role() = 'authenticated');
