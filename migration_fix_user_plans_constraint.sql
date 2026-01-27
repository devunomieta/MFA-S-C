-- Drop the restrictive check constraint on user_plans status
ALTER TABLE user_plans DROP CONSTRAINT IF EXISTS user_plans_status_check;

-- Optionally, add a new constraint that includes 'pending_activation'
-- OR just leave it open as text (more flexible for future statuses)
-- We will proceed with open text for now to avoid future migration friction for simple status additions.
