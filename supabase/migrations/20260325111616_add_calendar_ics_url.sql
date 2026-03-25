-- Add fields for automatic calendar synchronization
ALTER TABLE configuracao_agenda
ADD COLUMN IF NOT EXISTS calendar_ics_url TEXT,
ADD COLUMN IF NOT EXISTS last_calendar_sync TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auto_sync_enabled BOOLEAN DEFAULT false;
