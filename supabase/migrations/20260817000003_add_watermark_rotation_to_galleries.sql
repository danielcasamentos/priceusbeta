-- Migration: Add watermark_rotation column to galleries table
-- Stores the rotation angle (in degrees) for the watermark. Default is 0 (horizontal).

ALTER TABLE public.galleries
  ADD COLUMN IF NOT EXISTS watermark_rotation NUMERIC(5,1) DEFAULT 0;
