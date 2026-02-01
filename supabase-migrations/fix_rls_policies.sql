-- Fix Row Level Security for attendance_records table
-- Run this in Supabase Dashboard → SQL Editor
-- Drop existing policies if any
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON attendance_records;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON attendance_records;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON attendance_records;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON attendance_records;
-- Allow staff to insert attendance records
CREATE POLICY "Staff can insert attendance records" ON attendance_records FOR
INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE profiles.id = auth.uid()
                AND profiles.role = 'staff'
        )
    );
-- Allow staff to read all attendance records
CREATE POLICY "Staff can read attendance records" ON attendance_records FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE profiles.id = auth.uid()
                AND profiles.role = 'staff'
        )
    );
-- Allow students to read their own attendance records
CREATE POLICY "Students can read their own attendance" ON attendance_records FOR
SELECT TO authenticated USING (
        student_id = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM profiles
            WHERE profiles.id = auth.uid()
                AND profiles.role = 'staff'
        )
    );
-- Allow staff to update attendance records
CREATE POLICY "Staff can update attendance records" ON attendance_records FOR
UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE profiles.id = auth.uid()
                AND profiles.role = 'staff'
        )
    );
-- Allow staff to delete attendance records
CREATE POLICY "Staff can delete attendance records" ON attendance_records FOR DELETE TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM profiles
        WHERE profiles.id = auth.uid()
            AND profiles.role = 'staff'
    )
);
-- Verify policies were created
SELECT schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'attendance_records';