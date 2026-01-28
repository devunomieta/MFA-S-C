-- Add whatsapp_link and start_date to plans table
ALTER TABLE plans ADD COLUMN IF NOT EXISTS whatsapp_link TEXT;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
