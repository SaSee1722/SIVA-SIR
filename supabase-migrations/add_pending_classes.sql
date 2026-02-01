-- Migration: Add pending_classes mapping to profiles
-- Purpose: Enable granular class-specific approval flow
-- ============================================
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS pending_classes TEXT;
COMMENT ON COLUMN profiles.pending_classes IS 'Comma-separated list of class names that the student has requested to join but are not yet approved.';