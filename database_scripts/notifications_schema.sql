-- Create Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL, -- 'transaction', 'loan', 'plan', 'help', 'profile', 'reminder'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for faster fetching
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications(created_at DESC);

-- Create Notification Settings table
CREATE TABLE IF NOT EXISTS public.notification_settings (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email_enabled BOOLEAN DEFAULT TRUE,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    marketing_enabled BOOLEAN DEFAULT FALSE,
    reminder_frequency TEXT DEFAULT 'daily' -- 'daily', 'weekly', 'none'
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Policies for Notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" ON public.notifications
    FOR DELETE USING (auth.uid() = user_id);

-- Policies for Notification Settings
DROP POLICY IF EXISTS "Users can view own notification settings" ON public.notification_settings;
CREATE POLICY "Users can view own notification settings" ON public.notification_settings
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notification settings" ON public.notification_settings;
CREATE POLICY "Users can update own notification settings" ON public.notification_settings
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own notification settings" ON public.notification_settings;
CREATE POLICY "Users can insert own notification settings" ON public.notification_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger to create default settings for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_notification_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notification_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_notification_settings ON auth.users;
CREATE TRIGGER on_auth_user_created_notification_settings
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_notification_settings();

-- Trigger to create notification on transaction updates
CREATE OR REPLACE FUNCTION public.notify_on_transaction_update()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status != NEW.status) THEN
        INSERT INTO public.notifications (user_id, type, title, message, data)
        VALUES (
            NEW.user_id,
            'transaction',
            'Transaction ' || INITCAP(NEW.status),
            'Your ' || NEW.type || ' of N' || NEW.amount || ' has been ' || NEW.status || '.',
            jsonb_build_object('transaction_id', NEW.id, 'status', NEW.status)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_transaction_updated_notify ON public.transactions;
CREATE TRIGGER on_transaction_updated_notify
    AFTER UPDATE ON public.transactions
    FOR EACH ROW EXECUTE PROCEDURE public.notify_on_transaction_update();

-- Trigger for loan status changes
CREATE OR REPLACE FUNCTION public.notify_on_loan_status_update()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status != NEW.status) THEN
        INSERT INTO public.notifications (user_id, type, title, message, data)
        VALUES (
            NEW.user_id,
            'loan',
            'Loan Application ' || INITCAP(NEW.status),
            'Your loan application for N' || NEW.amount || ' has been ' || NEW.status || '.',
            jsonb_build_object('loan_id', NEW.id, 'status', NEW.status)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_loan_status_updated_notify ON public.loans;
CREATE TRIGGER on_loan_status_updated_notify
    AFTER UPDATE ON public.loans
    FOR EACH ROW EXECUTE PROCEDURE public.notify_on_loan_status_update();

-- Trigger for new user plans
CREATE OR REPLACE FUNCTION public.notify_on_plan_activation()
RETURNS TRIGGER AS $$
DECLARE
    plan_name TEXT;
BEGIN
    SELECT name INTO plan_name FROM public.plans WHERE id = NEW.plan_id;
    
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
        NEW.user_id,
        'plan',
        'Plan Activated!',
        'You have successfully joined the ' || plan_name || ' plan.',
        jsonb_build_object('user_plan_id', NEW.id, 'plan_id', NEW.plan_id)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_plan_inserted_notify ON public.user_plans;
CREATE TRIGGER on_user_plan_inserted_notify
    AFTER INSERT ON public.user_plans
    FOR EACH ROW EXECUTE PROCEDURE public.notify_on_plan_activation();
