-- Recalculate and update current_balance for all user_plans based on transaction history
-- For each user_plan, sum the 'amount' of all transactions linked to that plan_id (deposits and transfers in)

UPDATE user_plans up
SET current_balance = (
  SELECT COALESCE(SUM(amount), 0)
  FROM transactions t
  WHERE t.plan_id = up.plan_id
    AND t.user_id = up.user_id
    AND t.status = 'completed'
);
