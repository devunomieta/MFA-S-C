-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- TRANSACTIONS POLICIES
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
CREATE POLICY "Users can insert own transactions" ON transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- USER PLANS POLICIES
DROP POLICY IF EXISTS "Users can view own plans" ON user_plans;
CREATE POLICY "Users can view own plans" ON user_plans
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own plans" ON user_plans;
CREATE POLICY "Users can update own plans" ON user_plans
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own plans" ON user_plans;
CREATE POLICY "Users can insert own plans" ON user_plans
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- PLANS POLICIES (Public Read)
DROP POLICY IF EXISTS "Authenticated users can view plans" ON plans;
CREATE POLICY "Authenticated users can view plans" ON plans
    FOR SELECT TO authenticated USING (true);
