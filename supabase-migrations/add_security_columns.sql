-- Migration: Add security columns to profiles and attendance_records tables
-- Created: 2026-01-31
-- Purpose: Enable student approval workflow and device binding security
-- ============================================
-- 1. Add columns to profiles table
-- ============================================
-- Add is_approved column (for student approval workflow)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;
-- Add device_id column (for device binding security)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS device_id TEXT;
-- ============================================
-- 2. Add columns to attendance_records table
-- ============================================
-- Add status column (for manual attendance: 'present' or 'on_duty')
ALTER TABLE attendance_records
ADD COLUMN IF NOT EXISTS status TEXT;
-- Add marked_by column (to track which staff member manually marked attendance)
ALTER TABLE attendance_records
ADD COLUMN IF NOT EXISTS marked_by TEXT;
-- ============================================
-- 3. Update existing data
-- ============================================
-- Set all existing students to approved (legacy students)
UPDATE profiles
SET is_approved = true
WHERE role = 'student'
    AND is_approved IS NULL;
-- Set all existing staff to approved
UPDATE profiles
SET is_approved = true
WHERE role = 'staff'
    AND is_approved IS NULL;
-- ============================================
-- 4. Add indexes for better performance
-- ============================================
-- Index on is_approved for faster filtering of pending students
CREATE INDEX IF NOT EXISTS idx_profiles_is_approved ON profiles(is_approved)
WHERE role = 'student';
-- Index on device_id for faster device binding checks
CREATE INDEX IF NOT EXISTS idx_profiles_device_id ON profiles(device_id)
WHERE device_id IS NOT NULL;
-- Index on marked_by for tracking manual attendance
CREATE INDEX IF NOT EXISTS idx_attendance_marked_by ON attendance_records(marked_by)
WHERE marked_by IS NOT NULL;
-- ============================================
-- 5. Add comments for documentation
-- ============================================
COMMENT ON COLUMN profiles.is_approved IS 'Whether the student account has been approved by staff. New students default to false and must be approved.';
COMMENT ON COLUMN profiles.device_id IS 'Unique device identifier for device binding security. Students can only mark attendance from their registered device.';
COMMENT ON COLUMN attendance_records.status IS 'Attendance status: present (normal) or on_duty (student on official duty). Used for manual marking.';
COMMENT ON COLUMN attendance_records.marked_by IS 'Staff user ID who manually marked this attendance. NULL for QR-scanned attendance.';
-- ============================================
-- Migration Complete
-- ============================================