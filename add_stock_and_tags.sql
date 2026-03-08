-- Migration: Add stock and tag columns to suq_products
-- Run this in Supabase Dashboard → SQL Editor

ALTER TABLE suq_products ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT NULL;
ALTER TABLE suq_products ADD COLUMN IF NOT EXISTS tag TEXT DEFAULT NULL;
