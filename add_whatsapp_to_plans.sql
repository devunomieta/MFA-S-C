-- Add WhatsApp group link column to plans table
ALTER TABLE plans ADD COLUMN IF NOT EXISTS whatsapp_link text;

-- Ensure RLS allows admins to manage plans
DROP POLICY IF EXISTS "Admins can insert plans" ON plans;
CREATE POLICY "Admins can insert plans" ON plans FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update plans" ON plans;
CREATE POLICY "Admins can update plans" ON plans FOR UPDATE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete plans" ON plans;
CREATE POLICY "Admins can delete plans" ON plans FOR DELETE TO authenticated USING (public.is_admin());
