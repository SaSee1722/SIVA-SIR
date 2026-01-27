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

    // Delete (deactivate) a class
    async deleteClass(classId: string): Promise<void> {
        const supabase = getSharedSupabaseClient();

        // Soft delete by setting is_active to false
        const { error } = await supabase
            .from('classes')
            .update({ is_active: false })
            .eq('id', classId);

        if (error) throw error;
    },

    // Get student count for a class
    async getClassStudentCount(className: string): Promise<number> {
        const supabase = getSharedSupabaseClient();

        const { count, error } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'student')
            .eq('class', className);

        if (error) throw error;

        return count || 0;
    },

    // Get students in a class
    async getClassStudents(className: string): Promise<any[]> {
        const supabase = getSharedSupabaseClient();

        const { data, error } = await supabase
            .from('profiles')
            .select('id, name, email, roll_number, class, year')
            .eq('role', 'student')
            .eq('class', className)
            .order('roll_number', { ascending: true });

        if (error) throw error;

        return (data || []).map(s => ({
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
            .eq('class', className);

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
};
