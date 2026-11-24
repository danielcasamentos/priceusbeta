-- Migration: Add photo_sort_order column to galleries table
-- Adds the column that controls the default photo ordering shown to clients in the public gallery view.

ALTER TABLE galleries
  ADD COLUMN IF NOT EXISTS photo_sort_order TEXT DEFAULT 'capture_asc'
    CHECK (photo_sort_order IN ('capture_asc', 'capture_desc', 'name_asc', 'name_desc', 'order_asc'));
