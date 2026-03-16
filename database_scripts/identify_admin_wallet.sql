-- FIND ADMIN USER ID
DO $$
DECLARE
    v_admin_id UUID;
BEGIN
    SELECT id INTO v_admin_id FROM profiles WHERE email = 'marysthriftservice@gmail.com';
    
    IF v_admin_id IS NOT NULL THEN
        -- Ensure this user IS an admin in profiles
        UPDATE profiles SET is_admin = true WHERE id = v_admin_id;

        -- Insert into app_settings for future central reference
        INSERT INTO app_settings (key, value, description)
        VALUES ('admin_wallet_id', to_jsonb(v_admin_id), 'The central wallet ID for platform service charges and revenue')
        ON CONFLICT (key) DO UPDATE SET value = to_jsonb(v_admin_id);
        
        RAISE NOTICE 'Admin Wallet ID set to: %', v_admin_id;
    ELSE
        RAISE NOTICE 'Admin marysthriftservice@gmail.com not found. Please set admin_wallet_id in app_settings manually.';
    END IF;
END $$;
