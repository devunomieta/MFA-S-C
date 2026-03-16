-- PERMANENT PROTECTION FOR ROOT SUPERADMIN
-- This script ensures that the primary superadmin account cannot be deleted or demoted.

CREATE OR REPLACE FUNCTION public.protect_root_superadmin()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Prevent deletion of the root superadmin
    IF (TG_OP = 'DELETE') THEN
        IF (OLD.email = 'marysthriftservice@gmail.com') THEN
            RAISE EXCEPTION 'CRITICAL SECURITY ERROR: The root superadmin account (marysthriftservice@gmail.com) cannot be deleted.';
        END IF;
    END IF;

    -- 2. Prevent demotion or email change of the root superadmin
    IF (TG_OP = 'UPDATE') THEN
        IF (OLD.email = 'marysthriftservice@gmail.com') THEN
            -- Prevent demotion
            IF (NEW.is_admin = false) THEN
                RAISE EXCEPTION 'CRITICAL SECURITY ERROR: The root superadmin status cannot be revoked.';
            END IF;
            
            -- Prevent email change (which would allow bypassing the check)
            IF (NEW.email != OLD.email) THEN
                RAISE EXCEPTION 'CRITICAL SECURITY ERROR: The root superadmin email cannot be changed.';
            END IF;
        END IF;
    END IF;

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply the trigger
DROP TRIGGER IF EXISTS ensure_root_superadmin_protected ON public.profiles;
CREATE TRIGGER ensure_root_superadmin_protected
    BEFORE UPDATE OR DELETE ON public.profiles
    FOR EACH ROW EXECUTE PROCEDURE public.protect_root_superadmin();

-- Verification Log
RAISE NOTICE 'Superadmin protection trigger applied for marysthriftservice@gmail.com';
