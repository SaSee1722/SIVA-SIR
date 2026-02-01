-- Allow staff members to update student profiles (to manage classes)
-- Run this in Supabase Dashboard -> SQL Editor
-- Check if policy exists and drop it to recreate
DROP POLICY IF EXISTS "Staff can update student profiles" ON profiles;
CREATE POLICY "Staff can update student profiles" ON profiles FOR
UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE id = auth.uid()
                AND role = 'staff'
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE id = auth.uid()
                AND role = 'staff'
        )
    );
-- Also ensure staff can read all profiles to search for students
DROP POLICY IF EXISTS "Staff can read all profiles" ON profiles;
CREATE POLICY "Staff can read all profiles" ON profiles FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE id = auth.uid()
                AND role = 'staff'
        )
        OR id = auth.uid()
    );