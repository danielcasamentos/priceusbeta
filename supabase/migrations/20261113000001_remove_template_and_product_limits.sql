-- =============================================
-- Migration: Remove template and product quantity limits
-- =============================================
-- Drops the triggers and validation functions that enforced
-- maximum template counts (1 free / 10 premium) and maximum
-- product counts per template (7 free / unlimited premium).
-- Preserves all RLS policies and other plan limits (leads, contracts, etc.).

-- 1. Remove template quantity limit trigger and function
DROP TRIGGER IF EXISTS trigger_validate_template_limit ON templates;
DROP FUNCTION IF EXISTS validate_template_limit();

-- 2. Remove product quantity limit trigger and function
DROP TRIGGER IF EXISTS trigger_validate_product_limit ON produtos;
DROP FUNCTION IF EXISTS validate_product_limit();

