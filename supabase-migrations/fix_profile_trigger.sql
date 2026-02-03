-- Migration: Fix profile creation trigger to include all metadata fields
-- Created: 2026-02-03
-- Purpose: Ensure system_number, pending_classes, and is_approved are copied from auth to profiles

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$ 
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        name,
        role,
        class,
        year,
        roll_number,
        system_number,
        department,
        is_approved,
        pending_classes
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
        NEW.raw_user_meta_data->>'class',
        NEW.raw_user_meta_data->>'year',
        NEW.raw_user_meta_data->>'roll_number',
        NEW.raw_user_meta_data->>'system_number',
        NEW.raw_user_meta_data->>'department',
        COALESCE((NEW.raw_user_meta_data->>'is_approved')::boolean, (COALESCE(NEW.raw_user_meta_data->>'role', 'student') = 'staff')),
        NEW.raw_user_meta_data->>'pending_classes'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-drop and re-create trigger just in case
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users 
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
