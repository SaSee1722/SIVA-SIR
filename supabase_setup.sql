-- ============================================
-- EduPortal - Complete Supabase Setup Script
-- ============================================
-- Run this script in your Supabase SQL Editor
-- ============================================
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- ============================================
-- 1. PROFILES TABLE
-- ============================================
-- Stores user information for both students and staff
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('student', 'staff')),
    -- Student-specific fields (nullable for staff)
    class TEXT,
    year TEXT,
    roll_number TEXT,
    -- Staff-specific fields (nullable for students)
    department TEXT,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_roll_number ON public.profiles(roll_number);
-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- RLS Policies for profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR
SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR
INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR
UPDATE USING (auth.uid() = id);
-- ============================================
-- 2. ATTENDANCE SESSIONS TABLE
-- ============================================
-- Stores QR code sessions created by staff
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_name TEXT NOT NULL,
    date DATE NOT NULL,
    time TEXT NOT NULL,
    qr_code TEXT NOT NULL UNIQUE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sessions_date ON public.attendance_sessions(date);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON public.attendance_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_created_by ON public.attendance_sessions(created_by);
-- Enable Row Level Security
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
-- RLS Policies for attendance_sessions
DROP POLICY IF EXISTS "Anyone can view sessions" ON public.attendance_sessions;
CREATE POLICY "Anyone can view sessions" ON public.attendance_sessions FOR
SELECT USING (true);
DROP POLICY IF EXISTS "Staff can create sessions" ON public.attendance_sessions;
CREATE POLICY "Staff can create sessions" ON public.attendance_sessions FOR
INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = auth.uid()
                AND role = 'staff'
        )
    );
DROP POLICY IF EXISTS "Staff can update their own sessions" ON public.attendance_sessions;
CREATE POLICY "Staff can update their own sessions" ON public.attendance_sessions FOR
UPDATE USING (created_by = auth.uid());
-- ============================================
-- 3. ATTENDANCE RECORDS TABLE
-- ============================================
-- Stores individual attendance marks by students
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    session_name TEXT NOT NULL,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    roll_number TEXT NOT NULL,
    class TEXT NOT NULL,
    marked_at TIMESTAMPTZ DEFAULT NOW(),
    date DATE NOT NULL,
    -- Ensure a student can only mark attendance once per session
    UNIQUE(session_id, student_id)
);
-- Create indexes
CREATE INDEX IF NOT EXISTS idx_records_session ON public.attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_records_student ON public.attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_records_date ON public.attendance_records(date);
-- Enable Row Level Security
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
-- RLS Policies for attendance_records
DROP POLICY IF EXISTS "Anyone can view attendance records" ON public.attendance_records;
CREATE POLICY "Anyone can view attendance records" ON public.attendance_records FOR
SELECT USING (true);
DROP POLICY IF EXISTS "Students can mark their own attendance" ON public.attendance_records;
CREATE POLICY "Students can mark their own attendance" ON public.attendance_records FOR
INSERT WITH CHECK (student_id = auth.uid());
-- ============================================
-- 4. FILES TABLE
-- ============================================
-- Stores metadata for uploaded files
CREATE TABLE IF NOT EXISTS public.files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size NUMERIC NOT NULL,
    thumbnail_uri TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);
-- Create indexes
CREATE INDEX IF NOT EXISTS idx_files_student ON public.files(student_id);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_at ON public.files(uploaded_at);
-- Enable Row Level Security
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
-- RLS Policies for files
DROP POLICY IF EXISTS "Anyone can view files" ON public.files;
CREATE POLICY "Anyone can view files" ON public.files FOR
SELECT USING (true);
DROP POLICY IF EXISTS "Students can upload their own files" ON public.files;
CREATE POLICY "Students can upload their own files" ON public.files FOR
INSERT WITH CHECK (student_id = auth.uid());
DROP POLICY IF EXISTS "Students can delete their own files" ON public.files;
CREATE POLICY "Students can delete their own files" ON public.files FOR DELETE USING (student_id = auth.uid());
-- ============================================
-- 5. STORAGE BUCKETS
-- ============================================
-- Create storage bucket for files
INSERT INTO storage.buckets (id, name, public)
VALUES ('files', 'files', true) ON CONFLICT (id) DO NOTHING;
-- Storage policies for files bucket
DROP POLICY IF EXISTS "Anyone can view files" ON storage.objects;
CREATE POLICY "Anyone can view files" ON storage.objects FOR
SELECT USING (bucket_id = 'files');
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
CREATE POLICY "Authenticated users can upload files" ON storage.objects FOR
INSERT WITH CHECK (
        bucket_id = 'files'
        AND auth.role() = 'authenticated'
    );
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
CREATE POLICY "Users can delete their own files" ON storage.objects FOR DELETE USING (
    bucket_id = 'files'
    AND auth.uid()::text = (storage.foldername(name)) [1]
);
-- ============================================
-- ============================================
-- 6. FUNCTIONS & TRIGGERS
-- ============================================
-- Function to handle new user signup and create profile
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$ BEGIN
INSERT INTO public.profiles (
        id,
        email,
        name,
        role,
        class,
        year,
        roll_number,
        department
    )
VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
        NEW.raw_user_meta_data->>'class',
        NEW.raw_user_meta_data->>'year',
        NEW.raw_user_meta_data->>'roll_number',
        NEW.raw_user_meta_data->>'department'
    );
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER
INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Trigger for profiles table
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE
UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ============================================
-- 7. REALTIME SUBSCRIPTIONS
-- ============================================
-- Enable realtime for tables (idempotent way)
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
        AND tablename = 'profiles'
) THEN ALTER PUBLICATION supabase_realtime
ADD TABLE public.profiles;
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
        AND tablename = 'attendance_sessions'
) THEN ALTER PUBLICATION supabase_realtime
ADD TABLE public.attendance_sessions;
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
        AND tablename = 'attendance_records'
) THEN ALTER PUBLICATION supabase_realtime
ADD TABLE public.attendance_records;
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
        AND tablename = 'files'
) THEN ALTER PUBLICATION supabase_realtime
ADD TABLE public.files;
END IF;
END $$;
-- ============================================
-- 8. SAMPLE DATA (Optional - for testing)
-- ============================================
-- Uncomment below to insert sample data
/*
 -- Sample Staff User (you'll need to sign up first, then update this)
 -- INSERT INTO public.profiles (id, email, name, role, department)
 -- VALUES (
 --     'YOUR_AUTH_USER_ID_HERE',
 --     'staff@example.com',
 --     'John Staff',
 --     'staff',
 --     'Computer Science'
 -- );
 
 -- Sample Student User
 -- INSERT INTO public.profiles (id, email, name, role, class, year, roll_number)
 -- VALUES (
 --     'YOUR_AUTH_USER_ID_HERE',
 --     'student@example.com',
 --     'Jane Student',
 --     'student',
 --     '10-A',
 --     '2024',
 --     '101'
 -- );
 */
-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- Next steps:
-- 1. Run this script in Supabase SQL Editor
-- 2. Sign up users through your app
-- 3. Start using the application!
-- ============================================