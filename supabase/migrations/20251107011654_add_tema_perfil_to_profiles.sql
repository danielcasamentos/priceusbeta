/*
  # Add tema_perfil column to profiles table

  1. Changes
    - Add `tema_perfil` column to store user's chosen public profile theme
    - Default value is 'original' for backwards compatibility
    - Valid values: 'original', 'minimalist', 'modern', 'magazine'

  2. Notes
    - Existing profiles will automatically get 'original' theme
    - No data loss - purely additive migration
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'tema_perfil'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN tema_perfil text DEFAULT 'original' CHECK (tema_perfil IN ('original', 'minimalist', 'modern', 'magazine'));
  END IF;
END $$;