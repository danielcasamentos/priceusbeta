-- Migration: Add enable_downloads and enable_sales to galleries table
-- Allows toggling extra photos sales and client downloads per gallery.

ALTER TABLE public.galleries
  ADD COLUMN IF NOT EXISTS enable_downloads BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_sales     BOOLEAN DEFAULT false;
