-- Add updated_at column to user_plans table
ALTER TABLE user_plans 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
