-- Migration: Add download PIN protection to galleries table
-- Allows photographers to restrict photo downloads with a dedicated PIN/Password.

ALTER TABLE public.galleries
  ADD COLUMN IF NOT EXISTS require_download_pin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS download_pin         TEXT    DEFAULT NULL;
