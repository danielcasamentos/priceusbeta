-- Add data_nascimento to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS data_nascimento DATE;

-- Add uid_externo to eventos_agenda
ALTER TABLE eventos_agenda ADD COLUMN IF NOT EXISTS uid_externo TEXT;

-- Create index for faster sync lookups
CREATE INDEX IF NOT EXISTS idx_eventos_agenda_uid_externo ON eventos_agenda(uid_externo);
