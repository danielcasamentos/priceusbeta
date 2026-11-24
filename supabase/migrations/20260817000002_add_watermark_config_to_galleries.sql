-- Migration: Add full watermark configuration columns to galleries table
-- Adds position, type, opacity, scale, and logo_url for the watermark system.

ALTER TABLE public.galleries
  ADD COLUMN IF NOT EXISTS watermark_type     TEXT    DEFAULT 'text'
    CHECK (watermark_type IN ('text', 'image')),
  ADD COLUMN IF NOT EXISTS watermark_position TEXT    DEFAULT 'bottom-right'
    CHECK (watermark_position IN (
      'top-left', 'top-center', 'top-right',
      'center-left', 'center', 'center-right',
      'bottom-left', 'bottom-center', 'bottom-right'
    )),
  ADD COLUMN IF NOT EXISTS watermark_opacity  NUMERIC(3,2) DEFAULT 0.70,
  ADD COLUMN IF NOT EXISTS watermark_scale    NUMERIC(4,3) DEFAULT 0.180,
  ADD COLUMN IF NOT EXISTS watermark_logo_url TEXT    DEFAULT NULL;
