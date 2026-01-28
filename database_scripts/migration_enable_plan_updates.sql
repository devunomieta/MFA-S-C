-- Enable RLS on user_plans if not already (it likely is)
ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;

-- Drop existing update policy if any to avoid conflicts
DROP POLICY IF EXISTS "Users can update own plans" ON user_plans;

-- Create policy to allow users to update their own plan records
CREATE POLICY "Users can update own plans"
ON user_plans
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
