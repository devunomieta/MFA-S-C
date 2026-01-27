-- Add duration_weeks column to plans table
ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS duration_weeks INTEGER DEFAULT 52;

-- We already have description, but ensuring it exists
-- ALTER TABLE plans ADD COLUMN IF NOT EXISTS description TEXT;

-- Update data logic: 
-- If needed, we can set duration_weeks based on duration_months * 4 roughly, 
-- but for new plans admin will set it.

-- Ensure user_plans status can handle new states if it's an enum (unlikely, usually text)
-- If it is a check constraint, we might need to drop/update it.
-- Assuming text for now based on previous code.
