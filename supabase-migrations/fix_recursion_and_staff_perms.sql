-- Fix for infinite recursion in profiles table policies
-- This occurs when a policy on "profiles" queries "profiles" in its check.
-- We use a SECURITY DEFINER function to break the recursion.
-- 1. Helper function to check staff status (bypasses RLS)
CREATE OR REPLACE FUNCTION public.check_is_staff() RETURNS boolean AS $$ BEGIN RETURN EXISTS (
        SELECT 1
        FROM profiles
        WHERE id = auth.uid()
            AND role = 'staff'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- 2. Clean up old problematic policies
DROP POLICY IF EXISTS "Staff can update student profiles" ON profiles;
DROP POLICY IF EXISTS "Staff can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by owner or staff" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
-- 3. Create fresh, non-recursive policies
CREATE POLICY "Profiles are viewable by owner or staff" ON profiles FOR
SELECT TO authenticated USING (
        id = auth.uid()
        OR public.check_is_staff()
    );
CREATE POLICY "Users can update own profile" ON profiles FOR
UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Staff can update student profiles" ON profiles FOR
UPDATE TO authenticated USING (public.check_is_staff()) WITH CHECK (public.check_is_staff());