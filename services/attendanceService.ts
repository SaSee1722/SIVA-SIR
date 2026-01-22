import { getSharedSupabaseClient } from '@/template/core/client';
import { AttendanceSession, AttendanceRecord } from '@/types';
import { RealtimeChannel } from '@supabase/supabase-js';

export const attendanceService = {
  async createSession(
    sessionName: string,
    createdBy: string
  ): Promise<AttendanceSession> {
    const supabase = getSharedSupabaseClient();

    const newSession = {
      session_name: sessionName,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      qr_code: `SESSION_${Date.now()}`,
      created_by: createdBy,
      is_active: true,
    };

    const { data, error } = await supabase
      .from('attendance_sessions')
      .insert([newSession])
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      sessionName: data.session_name,
      date: data.date,
      time: data.time,
      qrCode: data.qr_code,
      createdBy: data.created_by,
      isActive: data.is_active,
    };
  },

  async getAllSessions(): Promise<AttendanceSession[]> {
    const supabase = getSharedSupabaseClient();
    const { data, error } = await supabase
      .from('attendance_sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(s => ({
      id: s.id,
      sessionName: s.session_name,
      date: s.date,
      time: s.time,
      qrCode: s.qr_code,
      createdBy: s.created_by,
      isActive: s.is_active,
    }));
  },

  async getActiveSession(): Promise<AttendanceSession | null> {
    const supabase = getSharedSupabaseClient();
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('attendance_sessions')
      .select('*')
      .eq('is_active', true)
      .eq('date', today)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      sessionName: data.session_name,
      date: data.date,
      time: data.time,
      qrCode: data.qr_code,
      createdBy: data.created_by,
      isActive: data.is_active,
    };
  },

  async deactivateSession(sessionId: string): Promise<void> {
    const supabase = getSharedSupabaseClient();
    const { error } = await supabase
      .from('attendance_sessions')
      .update({ is_active: false })
      .eq('id', sessionId);

    if (error) throw error;
  },

  async markAttendance(
    sessionId: string,
    sessionName: string,
    studentId: string,
    studentName: string,
    rollNumber: string,
    studentClass: string
  ): Promise<AttendanceRecord> {
    const supabase = getSharedSupabaseClient();

    // Check if record already exists
    const { data: existing, error: checkError } = await supabase
      .from('attendance_records')
      .select('id')
      .eq('session_id', sessionId)
      .eq('student_id', studentId)
      .maybeSingle();

    if (checkError) throw checkError;
    if (existing) {
      throw new Error('Attendance already marked for this session');
    }

    const newRecord = {
      session_id: sessionId,
      session_name: sessionName,
      student_id: studentId,
      student_name: studentName,
      roll_number: rollNumber,
      class: studentClass,
      marked_at: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
    };

    const { data, error } = await supabase
      .from('attendance_records')
      .insert([newRecord])
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      sessionId: data.session_id,
      sessionName: data.session_name,
      studentId: data.student_id,
      studentName: data.student_name,
      rollNumber: data.roll_number,
      class: data.class,
      markedAt: data.marked_at,
      date: data.date,
    };
  },

  async getAllRecords(): Promise<AttendanceRecord[]> {
    const supabase = getSharedSupabaseClient();
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .order('marked_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(r => ({
      id: r.id,
      sessionId: r.session_id,
      sessionName: r.session_name,
      studentId: r.student_id,
      studentName: r.student_name,
      rollNumber: r.roll_number,
      class: r.class,
      markedAt: r.marked_at,
      date: r.date,
    }));
  },

  async getRecordsBySession(sessionId: string): Promise<AttendanceRecord[]> {
    const supabase = getSharedSupabaseClient();
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('session_id', sessionId);

    if (error) throw error;

    return (data || []).map(r => ({
      id: r.id,
      sessionId: r.session_id,
      sessionName: r.session_name,
      studentId: r.student_id,
      studentName: r.student_name,
      rollNumber: r.roll_number,
      class: r.class,
      markedAt: r.marked_at,
      date: r.date,
    }));
  },

  async getRecordsByDateRange(startDate: string, endDate: string): Promise<AttendanceRecord[]> {
    const supabase = getSharedSupabaseClient();
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) throw error;

    return (data || []).map(r => ({
      id: r.id,
      sessionId: r.session_id,
      sessionName: r.session_name,
      studentId: r.student_id,
      studentName: r.student_name,
      rollNumber: r.roll_number,
      class: r.class,
      markedAt: r.marked_at,
      date: r.date,
    }));
  },

  async getStudentAttendance(studentId: string): Promise<AttendanceRecord[]> {
    const supabase = getSharedSupabaseClient();
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('student_id', studentId);

    if (error) throw error;

    return (data || []).map(r => ({
      id: r.id,
      sessionId: r.session_id,
      sessionName: r.session_name,
      studentId: r.student_id,
      studentName: r.student_name,
      rollNumber: r.roll_number,
      class: r.class,
      markedAt: r.marked_at,
      date: r.date,
    }));
  },

  subscribeToSessions(callback: () => void): RealtimeChannel {
    const supabase = getSharedSupabaseClient();
    const channelId = `sessions_${Math.random().toString(36).slice(2, 9)}`;
    return supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance_sessions' },
        callback
      )
      .subscribe();
  },

  subscribeToRecords(callback: () => void): RealtimeChannel {
    const supabase = getSharedSupabaseClient();
    const channelId = `records_${Math.random().toString(36).slice(2, 9)}`;
    return supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance_records' },
        callback
      )
      .subscribe();
  },
};

