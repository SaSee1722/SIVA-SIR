import { useState, useEffect } from 'react';
import { attendanceService } from '@/services/attendanceService';
import { AttendanceSession, AttendanceRecord } from '@/types';

export function useAttendance(staffId?: string) {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshCounter, setRefreshCounter] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        let loadedSessions: AttendanceSession[];
        let loadedRecords: AttendanceRecord[];

        if (staffId) {
          [loadedSessions, loadedRecords] = await Promise.all([
            attendanceService.getSessionsByStaff(staffId),
            attendanceService.getRecordsByStaff(staffId),
          ]);
        } else {
          [loadedSessions, loadedRecords] = await Promise.all([
            attendanceService.getAllSessions(),
            attendanceService.getAllRecords(),
          ]);
        }

        setSessions(loadedSessions);
        setRecords(loadedRecords);
      } catch (error) {
        console.error('Load attendance error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [refreshCounter, staffId]);

  useEffect(() => {
    // Subscribe to real-time changes
    const sessionSubscription = attendanceService.subscribeToSessions(() => {
      setRefreshCounter(prev => prev + 1);
    });

    const recordSubscription = attendanceService.subscribeToRecords(() => {
      setRefreshCounter(prev => prev + 1);
    });

    return () => {
      sessionSubscription.unsubscribe();
      recordSubscription.unsubscribe();
    };
  }, []);

  const createSession = async (sessionName: string, createdBy: string, classFilter?: string) => {
    const newSession = await attendanceService.createSession(sessionName, createdBy, classFilter);
    setSessions(prev => [newSession, ...prev]);
    return newSession;
  };

  const markAttendance = async (
    sessionId: string,
    sessionName: string,
    studentId: string,
    studentName: string,
    rollNumber: string,
    studentClass: string,
    systemNumber?: string,
    deviceId?: string
  ) => {
    const newRecord = await attendanceService.markAttendance(
      sessionId,
      sessionName,
      studentId,
      studentName,
      rollNumber,
      studentClass,
      systemNumber,
      deviceId
    );
    setRecords(prev => [newRecord, ...prev]);
    return newRecord;
  };

  const deactivateSession = async (sessionId: string) => {
    await attendanceService.deactivateSession(sessionId);
    setSessions(prev =>
      prev.map(s => s.id === sessionId ? { ...s, isActive: false } : s)
    );
  };

  const getSessionRecords = (sessionId: string) => {
    return records.filter((r) => r.sessionId === sessionId);
  };

  const getDateRangeRecords = async (startDate: string, endDate: string) => {
    const data = await attendanceService.getRecordsByDateRange(startDate, endDate);
    return data;
  };

  const refresh = () => {
    setRefreshCounter(prev => prev + 1);
  };

  return {
    sessions,
    records,
    isLoading,
    createSession,
    markAttendance,
    deactivateSession,
    getSessionRecords,
    getDateRangeRecords,
    refresh,
  };
}
