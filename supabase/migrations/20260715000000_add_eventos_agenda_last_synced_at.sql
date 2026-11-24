-- Add last_synced_at to eventos_agenda for Google Calendar synchronization optimization
ALTER TABLE eventos_agenda ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Create index for faster last_synced_at filtering
CREATE INDEX IF NOT EXISTS idx_eventos_agenda_last_synced_at ON eventos_agenda(last_synced_at);
