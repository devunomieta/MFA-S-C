-- Add reference column to transactions table
-- This column is required by plan logic functions (Marathon, Sprint, etc.)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS reference TEXT;
