-- Add contribution logic to plans
ALTER TABLE plans 
ADD COLUMN contribution_type text NOT NULL DEFAULT 'flexible' CHECK (contribution_type IN ('fixed', 'flexible')),
ADD COLUMN fixed_amount numeric DEFAULT 0;

-- Optionally update existing plans
-- UPDATE plans SET contribution_type = 'flexible';
