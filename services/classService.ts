import { getSharedSupabaseClient } from '@/template/core/client';
import { Class } from '@/types';

export const classService = {
    // Create a new class
    async createClass(
        className: string,
        description: string,
        year: string,
        createdBy: string
    ): Promise<Class> {
        const supabase = getSharedSupabaseClient();

        const newClass = {
            class_name: className,
            description,
            year,
            created_by: createdBy,
            is_active: true,
        };

        const { data, error } = await supabase
            .from('classes')
            .insert([newClass])
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                throw new Error('A class with this name already exists');
            }
            throw error;
        }

        return {
            id: data.id,
            className: data.class_name,
            description: data.description,
            year: data.year,
            createdBy: data.created_by,
            isActive: data.is_active,
            createdAt: data.created_at,
        };
    },

    // Get all active classes
    async getAllClasses(): Promise<Class[]> {
        const supabase = getSharedSupabaseClient();

        const { data, error } = await supabase
            .from('classes')
            .select('*')
            .eq('is_active', true)
            .order('class_name', { ascending: true });

        if (error) throw error;

        return (data || []).map(c => ({
            id: c.id,
            className: c.class_name,
            description: c.description,
            year: c.year,
            createdBy: c.created_by,
            isActive: c.is_active,
            createdAt: c.created_at,
        }));
    },

    // Get classes created by a specific staff member
    async getClassesByStaff(staffId: string): Promise<Class[]> {
        const supabase = getSharedSupabaseClient();

        const { data, error } = await supabase
            .from('classes')
            .select('*')
            .eq('created_by', staffId)
            .order('class_name', { ascending: true });

        if (error) throw error;

        return (data || []).map(c => ({
            id: c.id,
            className: c.class_name,
            description: c.description,
            year: c.year,
            createdBy: c.created_by,
            isActive: c.is_active,
            createdAt: c.created_at,
        }));
    },

    // Update a class
    async updateClass(
        classId: string,
        updates: {
            className?: string;
            description?: string;
            year?: string;
            isActive?: boolean;
        }
    ): Promise<Class> {
        const supabase = getSharedSupabaseClient();

        const updateData: any = {};
        if (updates.className !== undefined) updateData.class_name = updates.className;
        if (updates.description !== undefined) updateData.description = updates.description;
        if (updates.year !== undefined) updateData.year = updates.year;
        if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

        const { data, error } = await supabase
            .from('classes')
            .update(updateData)
            .eq('id', classId)
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                throw new Error('A class with this name already exists');
            }
            throw error;
        }

        return {
            id: data.id,
            className: data.class_name,
            description: data.description,
            year: data.year,
            createdBy: data.created_by,
            isActive: data.is_active,
            createdAt: data.created_at,
        };
    },

    // Delete a class
    async deleteClass(classId: string, className: string): Promise<void> {
        const supabase = getSharedSupabaseClient();

        // 1. Attempt to remove this class from student profiles
        // We wrap this in a try-catch because staff might not have RLS permission 
        // to update all student profiles, and we don't want it to block the class deletion.
        try {
            await this.removeClassFromStudents(className);
        } catch (error) {
            console.warn('Note: Could not scrub class name from student profiles:', error);
        }

        // 2. Perform a hard delete
        // Using .delete() instead of .update({ is_active: false }) to avoid 
        // "new row violates RLS policy" errors which occur when a policy 
        // requires rows to remain 'active' during updates.
        const { error } = await supabase
            .from('classes')
            .delete()
            .eq('id', classId);

        if (error) throw error;
    },

    // Remove a specific class name from all student profiles
    async removeClassFromStudents(className: string): Promise<void> {
        const supabase = getSharedSupabaseClient();

        // Find all students who have this class in their list
        const { data: students, error: fetchError } = await supabase
            .from('profiles')
            .select('id, class')
            .eq('role', 'student')
            .ilike('class', `%${className}%`);

        if (fetchError) throw fetchError;
        if (!students || students.length === 0) return;

        // For each student, remove the class from their comma-separated list
        const updates = students.map(student => {
            const classes = student.class ? student.class.split(',').map((c: string) => c.trim()) : [];
            const filteredClasses = classes.filter((c: string) => c !== className);

            return supabase
                .from('profiles')
                .update({ class: filteredClasses.join(', ') })
                .eq('id', student.id);
        });

        await Promise.all(updates);
    },

    // Get student count for a class
    async getClassStudentCount(className: string): Promise<number> {
        const supabase = getSharedSupabaseClient();

        const { data, error } = await supabase
            .from('profiles')
            .select('class')
            .eq('role', 'student');

        if (error) throw error;

        // Precise matching in JS (case-insensitive & trimmed)
        const targetClass = className.trim().toLowerCase();
        const count = (data || []).filter(student => {
            if (!student.class) return false;
            const studentClasses = student.class.split(',').map((c: string) => c.trim().toLowerCase());
            return studentClasses.includes(targetClass);
        }).length;

        return count;
    },

    // Get students in a class
    async getClassStudents(className: string): Promise<any[]> {
        const supabase = getSharedSupabaseClient();

        const { data, error } = await supabase
            .from('profiles')
            .select('id, name, email, roll_number, class, year')
            .eq('role', 'student')
            .order('roll_number', { ascending: true });

        if (error) throw error;

        // Precise matching in JS (case-insensitive & trimmed)
        const targetClass = className.trim().toLowerCase();
        const matchedStudents = (data || []).filter(student => {
            if (!student.class) return false;
            const studentClasses = student.class.split(',').map((c: string) => c.trim().toLowerCase());
            return studentClasses.includes(targetClass);
        });

        return matchedStudents.map(s => ({
            id: s.id,
            name: s.name,
            email: s.email,
            rollNumber: s.roll_number,
            class: s.class,
            year: s.year,
        }));
    },

    // Get class statistics
    async getClassStats(className: string): Promise<any> {
        const supabase = getSharedSupabaseClient();

        // Get total students
        const { count: studentCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'student')
            .ilike('class', `%${className}%`);

        // Get total sessions for this class
        const { count: sessionCount } = await supabase
            .from('attendance_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('class_filter', className);

        // Get total attendance records for this class
        const { count: attendanceCount } = await supabase
            .from('attendance_records')
            .select('*', { count: 'exact', head: true })
            .eq('class', className);

        const totalStudents = studentCount || 0;
        const totalSessions = sessionCount || 0;
        const totalAttendance = attendanceCount || 0;

        const averageAttendance = totalSessions > 0 && totalStudents > 0
            ? (totalAttendance / (totalSessions * totalStudents)) * 100
            : 0;

        return {
            className,
            totalStudents,
            totalSessions,
            totalAttendance,
            averageAttendance: Math.round(averageAttendance * 10) / 10,
        };
    },

    // Add a student to a class
    async addStudentToClass(studentId: string, className: string): Promise<void> {
        const supabase = getSharedSupabaseClient();
        const targetClass = className.trim();

        // Get current class list for the student
        const { data, error } = await supabase
            .from('profiles')
            .select('class')
            .eq('id', studentId)
            .single();

        if (error) throw error;

        const currentClasses = data.class
            ? data.class.split(',').map((c: string) => c.trim()).filter((c: string) => c.length > 0)
            : [];

        if (!currentClasses.some((c: string) => c.toLowerCase() === targetClass.toLowerCase())) {
            currentClasses.push(targetClass);
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ class: currentClasses.join(', ') })
                .eq('id', studentId);

            if (updateError) throw updateError;
        }
    },

    // Remove a student from a class
    async removeStudentFromClass(studentId: string, className: string): Promise<void> {
        const supabase = getSharedSupabaseClient();
        const targetClass = className.trim();

        // Get current class list for the student
        const { data, error } = await supabase
            .from('profiles')
            .select('class')
            .eq('id', studentId)
            .single();

        if (error) throw error;

        if (data.class) {
            const currentClasses = data.class.split(',').map((c: string) => c.trim()).filter((c: string) => c.length > 0);
            const updatedClasses = currentClasses.filter((c: string) => c.toLowerCase() !== targetClass.toLowerCase());

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ class: updatedClasses.length > 0 ? updatedClasses.join(', ') : null })
                .eq('id', studentId);

            if (updateError) throw updateError;
        }
    },

    // Search students to enroll (those not already in the class)
    async searchStudentsToEnroll(queryText: string, excludeClassName: string): Promise<any[]> {
        const supabase = getSharedSupabaseClient();

        const { data, error } = await supabase
            .from('profiles')
            .select('id, name, email, roll_number, class')
            .eq('role', 'student')
            .or(`name.ilike.%${queryText}%,roll_number.ilike.%${queryText}%,email.ilike.%${queryText}%`)
            .limit(10);

        if (error) throw error;

        // Filter out those already in this class
        const targetClass = excludeClassName.trim().toLowerCase();
        return (data || []).filter(student => {
            if (!student.class) return true;
            const studentClasses = student.class.split(',').map((c: string) => c.trim().toLowerCase());
            return !studentClasses.includes(targetClass);
        }).map(s => ({
            id: s.id,
            name: s.name,
            email: s.email,
            rollNumber: s.roll_number,
            class: s.class
        }));
    }
};
