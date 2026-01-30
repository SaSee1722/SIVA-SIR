import { getSharedSupabaseClient } from '@/template/core/client';
import { AttendanceSession, AttendanceRecord } from '@/types';
import { RealtimeChannel } from '@supabase/supabase-js';
import { notificationService } from './notificationService';

export const attendanceService = {
  async createSession(
    sessionName: string,
    createdBy: string,
    classFilter?: string
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
      class_filter: classFilter,
    };

    const { data, error } = await supabase
      .from('attendance_sessions')
      .insert([newSession])
      .select()
      .single();

    if (error) throw error;

    const session: AttendanceSession = {
      id: data.id,
      sessionName: data.session_name,
      date: data.date,
      time: data.time,
      qrCode: data.qr_code,
      createdBy: data.created_by,
      isActive: data.is_active,
      classFilter: data.class_filter,
    };

    // Send notifications to students in the class
    if (classFilter) {
      try {
        const { data: students } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'student')
          .ilike('class', `%${classFilter}%`);

        if (students && students.length > 0) {
          const studentIds = students.map(s => s.id);

          // Create in-app internal records (The Database Trigger will handle the Push Notification)
          await notificationService.sendBulkNotifications(
            studentIds,
            'New Session Created',
            `A new session "${sessionName}" has been created for your class.`,
            'session_created',
            { sessionId: session.id }
          );
        }
      } catch (notifyError) {
        console.error('Error sending session creation notifications:', notifyError);
      }
    }

    return session;
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
      classFilter: s.class_filter,
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
      classFilter: data.class_filter,
    };
  },

  async deactivateSession(sessionId: string): Promise<void> {
    const supabase = getSharedSupabaseClient();

    // Get session details before deactivating to know the class and name
    const { data: sessionData } = await supabase
      .from('attendance_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    const { error } = await supabase
      .from('attendance_sessions')
      .update({ is_active: false })
      .eq('id', sessionId);

    if (error) throw error;

    // Send "absent" notifications to students who didn't attend
    if (sessionData) {
      try {
        const absentees = await this.getAbsenteesBySession(sessionId, sessionData.class_filter);
        if (absentees && absentees.length > 0) {
          const absenteeIds = absentees.map(a => a.studentId);

          // Create in-app internal records (The Database Trigger will handle the Push Notification)
          await notificationService.sendBulkNotifications(
            absenteeIds,
            'Absent Alert',
            `You are absent to this session: "${sessionData.session_name}".`,
            'absent',
            { sessionId }
          );
        }
      } catch (notifyError) {
        console.error('Error sending absent notifications:', notifyError);
      }
    }
  },

  async markAttendance(
    sessionId: string,
    sessionName: string,
    studentId: string,
    studentName: string,
    rollNumber: string,
    studentClass: string,
    systemNumber?: string
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
      system_number: systemNumber,
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
      systemNumber: data.system_number,
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
      systemNumber: r.system_number,
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
      systemNumber: r.system_number,
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
      systemNumber: r.system_number,
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
      systemNumber: r.system_number,
      class: r.class,
      markedAt: r.marked_at,
      date: r.date,
    }));
  },

  async getAbsenteesBySession(sessionId: string, className?: string): Promise<any[]> {
    const supabase = getSharedSupabaseClient();

    // Get all students who attended this session
    const { data: attendedStudents, error: attendanceError } = await supabase
      .from('attendance_records')
      .select('student_id')
      .eq('session_id', sessionId);

    if (attendanceError) throw attendanceError;

    const attendedIds = (attendedStudents || []).map(s => s.student_id);

    // Get all students (optionally filtered by class)
    let query = supabase
      .from('profiles')
      .select('id, name, roll_number, system_number, class')
      .eq('role', 'student');

    if (className) {
      query = query.ilike('class', `%${className}%`);
    }

    const { data: allStudents, error: studentsError } = await query;

    if (studentsError) throw studentsError;

    // Filter out students who attended
    const absentees = (allStudents || [])
      .filter(student => !attendedIds.includes(student.id))
      .map(student => ({
        studentId: student.id,
        studentName: student.name,
        rollNumber: student.roll_number,
        systemNumber: student.system_number,
        class: student.class,
      }));

    return absentees;
  },

  async getAbsenteesByClass(className: string, startDate?: string, endDate?: string): Promise<any> {
    const supabase = getSharedSupabaseClient();

    // Get all students in the class
    const { data: allStudents, error: studentsError } = await supabase
      .from('profiles')
      .select('id, name, roll_number, class')
      .eq('role', 'student')
      .eq('class', className);

    if (studentsError) throw studentsError;

    // Get all sessions in the date range (or all sessions)
    let sessionsQuery = supabase
      .from('attendance_sessions')
      .select('*')
      .order('date', { ascending: false });

    if (startDate && endDate) {
      sessionsQuery = sessionsQuery.gte('date', startDate).lte('date', endDate);
    }

    const { data: sessions, error: sessionsError } = await sessionsQuery;

    if (sessionsError) throw sessionsError;

    // For each student, calculate their attendance
    const studentStats = await Promise.all(
      (allStudents || []).map(async (student) => {
        const { data: attendanceRecords } = await supabase
          .from('attendance_records')
          .select('session_id')
          .eq('student_id', student.id);

        const attendedSessionIds = new Set(
          (attendanceRecords || []).map(r => r.session_id)
        );

        const totalSessions = sessions?.length || 0;
        const attendedSessions = (sessions || []).filter(s =>
          attendedSessionIds.has(s.id)
        ).length;
        const absentSessions = totalSessions - attendedSessions;
        const attendanceRate = totalSessions > 0
          ? (attendedSessions / totalSessions) * 100
          : 0;

        return {
          studentId: student.id,
          studentName: student.name,
          rollNumber: student.roll_number,
          class: student.class,
          totalSessions,
          attendedSessions,
          absentSessions,
          attendanceRate: Math.round(attendanceRate * 10) / 10,
        };
      })
    );

    return {
      className,
      totalStudents: allStudents?.length || 0,
      totalSessions: sessions?.length || 0,
      students: studentStats.sort((a, b) => a.rollNumber.localeCompare(b.rollNumber)),
    };
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
