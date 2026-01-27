-- ============================================
-- CLASS MANAGEMENT SYSTEM
-- ============================================
-- Run this script in your Supabase SQL Editor
-- This adds class management functionality
-- ============================================
-- 1. CREATE CLASSES TABLE
-- ============================================
-- Stores classes created by staff
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_name TEXT NOT NULL UNIQUE,
    description TEXT,
    year TEXT,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Create indexes
CREATE INDEX IF NOT EXISTS idx_classes_name ON public.classes(class_name);
CREATE INDEX IF NOT EXISTS idx_classes_active ON public.classes(is_active);
CREATE INDEX IF NOT EXISTS idx_classes_created_by ON public.classes(created_by);
-- Enable Row Level Security
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
-- RLS Policies for classes
DROP POLICY IF EXISTS "Anyone can view active classes" ON public.classes;
CREATE POLICY "Anyone can view active classes" ON public.classes FOR
SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Staff can create classes" ON public.classes;
CREATE POLICY "Staff can create classes" ON public.classes FOR
INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = auth.uid()
                AND role = 'staff'
        )
    );
DROP POLICY IF EXISTS "Staff can update their own classes" ON public.classes;
CREATE POLICY "Staff can update their own classes" ON public.classes FOR
UPDATE USING (created_by = auth.uid());
DROP POLICY IF EXISTS "Staff can delete their own classes" ON public.classes;
CREATE POLICY "Staff can delete their own classes" ON public.classes FOR DELETE USING (created_by = auth.uid());
-- ============================================
-- 2. UPDATE PROFILES TABLE
-- ============================================
-- Add foreign key constraint to link class to classes table
-- Note: This is optional if you want strict referential integrity
-- Uncomment if you want to enforce that class must exist in classes table
-- ALTER TABLE public.profiles
-- ADD CONSTRAINT fk_profiles_class
-- FOREIGN KEY (class) REFERENCES public.classes(class_name)
-- ON DELETE SET NULL;
-- ============================================
-- 3. ADD CLASS FILTER TO ATTENDANCE SESSIONS
-- ============================================
-- Add class_filter column to attendance_sessions to specify which class(es) the session is for
ALTER TABLE public.attendance_sessions
ADD COLUMN IF NOT EXISTS class_filter TEXT;
-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_sessions_class_filter ON public.attendance_sessions(class_filter);
-- ============================================
-- 4. TRIGGER FOR CLASSES TABLE
-- ============================================
-- Trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS update_classes_updated_at ON public.classes;
CREATE TRIGGER update_classes_updated_at BEFORE
UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ============================================
-- 5. ENABLE REALTIME FOR CLASSES TABLE
-- ============================================
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
        AND tablename = 'classes'
) THEN ALTER PUBLICATION supabase_realtime
ADD TABLE public.classes;
END IF;
END $$;
-- ============================================
-- 6. SAMPLE DATA (Optional - for testing)
-- ============================================
-- Uncomment to insert sample classes
/*
 -- Sample classes (you'll need to replace 'YOUR_STAFF_ID' with actual staff user ID)
 INSERT INTO public.classes (class_name, description, year, created_by)
 VALUES 
 ('10-A', 'Class 10 Section A', '2024', 'YOUR_STAFF_ID'),
 ('10-B', 'Class 10 Section B', '2024', 'YOUR_STAFF_ID'),
 ('11-Science', 'Class 11 Science Stream', '2024', 'YOUR_STAFF_ID'),
 ('11-Commerce', 'Class 11 Commerce Stream', '2024', 'YOUR_STAFF_ID'),
 ('12-A', 'Class 12 Section A', '2024', 'YOUR_STAFF_ID')
 ON CONFLICT (class_name) DO NOTHING;
 */
-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- Next steps:
-- 1. Run this script in Supabase SQL Editor
-- 2. Staff can now create classes through the app
-- 3. Students will select from available classes during signup
-- ============================================