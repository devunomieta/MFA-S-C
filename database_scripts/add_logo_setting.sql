-- Add logo_url to general settings if it doesn't exist (update JSON)
DO $$
DECLARE
    current_settings jsonb;
BEGIN
    SELECT value INTO current_settings FROM app_settings WHERE key = 'general';
    
    IF current_settings IS NOT NULL AND NOT (current_settings ? 'logo_url') THEN
        UPDATE app_settings 
        SET value = jsonb_set(current_settings, '{logo_url}', '""')
        WHERE key = 'general';
    END IF;
END $$;
