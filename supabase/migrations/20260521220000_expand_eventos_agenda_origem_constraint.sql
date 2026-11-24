-- Expand the origem CHECK constraint on eventos_agenda to include all values
-- currently used in the codebase (sync, lead conversion, ICS import, etc.)
--
-- Original constraint only allowed: 'manual', 'csv_import', 'lead_confirmado'
-- This caused 400 errors when inserting events via iCalendar sync.

ALTER TABLE eventos_agenda
  DROP CONSTRAINT IF EXISTS eventos_agenda_origem_check;

ALTER TABLE eventos_agenda
  ADD CONSTRAINT eventos_agenda_origem_check
  CHECK (origem IN (
    'manual',            -- Criado manualmente pelo usuário
    'csv_import',        -- Importado via arquivo CSV
    'lead_confirmado',   -- Legado: gerado via conversão de lead (nome antigo)
    'lead_convertido',   -- Gerado via conversão de lead no painel Clientes
    'ics_sync',          -- Sincronizado via link iCalendar (iPhone, Google, etc.)
    'google-calendar-sync' -- Alias legado para ics_sync (manter compatibilidade)
  ));

-- Also add uid_externo column if not yet applied (idempotent)
ALTER TABLE eventos_agenda
  ADD COLUMN IF NOT EXISTS uid_externo TEXT;

CREATE INDEX IF NOT EXISTS idx_eventos_agenda_uid_externo
  ON eventos_agenda(uid_externo);

-- Add data_nascimento to profiles if not yet applied (idempotent)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS data_nascimento DATE;
