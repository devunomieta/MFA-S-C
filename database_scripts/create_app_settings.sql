-- Create App Settings Table
CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid references auth.users(id)
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Only Admins can view and update settings
DROP POLICY IF EXISTS "Admins can manage settings" ON app_settings;
CREATE POLICY "Admins can manage settings" ON app_settings
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Seed Default Settings
INSERT INTO app_settings (key, value, description)
VALUES
  (
    'general', 
    '{"withdrawals_enabled": true, "otp_enabled": false, "loan_interest_rate": 5, "referral_bonus": 10}', 
    'Global toggles and core values'
  ),
  (
    'smtp', 
    '{"host": "smtp.gmail.com", "port": 587, "user": "", "pass": "", "secure": false, "from_email": "noreply@marysthrift.com"}', 
    'SMTP Server Configuration for sending emails'
  ),
  (
    'email_templates', 
    '{"welcome": {"subject": "Welcome to AjoSave", "body": "Hello {name}, Welcome to AjoSave!"}, "loan_approved": {"subject": "Loan Approved", "body": "Your loan of ${amount} has been approved."}}', 
    'Editable email templates'
  )
ON CONFLICT (key) DO NOTHING;
