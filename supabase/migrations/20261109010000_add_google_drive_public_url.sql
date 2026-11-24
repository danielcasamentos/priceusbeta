-- Migration: Add google_drive_public_url to galleries for direct high-res downloads without Google login
ALTER TABLE IF EXISTS public.galleries
  ADD COLUMN IF NOT EXISTS google_drive_public_url text;

-- Populate automatically for existing galleries that already have a google_drive_folder_id
UPDATE public.galleries
SET google_drive_public_url = 'https://drive.google.com/drive/folders/' || google_drive_folder_id || '?usp=sharing'
WHERE google_drive_folder_id IS NOT NULL
  AND google_drive_folder_id <> ''
  AND google_drive_public_url IS NULL;

