import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, RefreshControl, Modal, TextInput } from 'react-native';
import { getSharedSupabaseClient } from '@/template/core/client';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useFiles } from '@/hooks/useFiles';
import { useAttendance } from '@/hooks/useAttendance';
import { Screen } from '@/components/layout/Screen';
import { FileList } from '@/components/feature/FileList';
import { QRCodeDisplay } from '@/components/feature/QRCodeDisplay';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AttendanceRecord } from '@/types';
import { colors, typography, borderRadius, spacing, shadows } from '@/constants/theme';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useAlert } from '@/template';
import DateTimePicker from '@react-native-community/datetimepicker';
import { pdfReportService } from '@/services/pdfReportService';
import { attendanceService } from '@/services/attendanceService';
import { classService } from '@/services/classService';
import { Class } from '@/types';

type ViewMode = 'files' | 'qr' | 'attendance' | 'classes';
type AttendanceViewMode = 'session' | 'date-range';

export default function StaffDashboardScreen() {
  const { user, logout } = useAuth();
  const { files, refresh: refreshFiles } = useFiles(undefined, user?.id);
  const {
    sessions,
    records,
    createSession,
    deactivateSession,
    getSessionRecords,
    getDateRangeRecords,
    refresh: refreshAttendance,
  } = useAttendance(user?.id);
  const router = useRouter();
  const { showAlert } = useAlert();

  const [viewMode, setViewMode] = useState<ViewMode>('files');
  const [attendanceViewMode, setAttendanceViewMode] = useState<AttendanceViewMode>('session');
  const [sessionName, setSessionName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);
  const [absentStudents, setAbsentStudents] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableClasses, setAvailableClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [classTotalStudents, setClassTotalStudents] = useState<number>(0);
  const [showEndSessionSummary, setShowEndSessionSummary] = useState(false);
  const [lastEndedSessionAbsentees, setLastEndedSessionAbsentees] = useState<any[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [globalStats, setGlobalStats] = useState({ sessions: 0, present: 0, absent: 0, uniqueStudents: 0 });
  const [rangeStats, setRangeStats] = useState({ sessions: 0, present: 0, absent: 0, uniqueStudents: 0 });

  const activeSession = sessions.find((s) => s.isActive);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshFiles(), refreshAttendance(), loadClasses()]);
    setRefreshing(false);
  };

  const loadClasses = async () => {
    if (user?.id) {
      try {
        const classes = await classService.getClassesByStaff(user.id);
        setAvailableClasses(classes);
      } catch (error) {
        console.error('Error loading classes:', error);
      }
    }
  };

  React.useEffect(() => {
    loadClasses();
  }, [user?.id]);

  React.useEffect(() => {
    if (activeSession?.classFilter) {
      classService.getClassStudentCount(activeSession.classFilter).then(setClassTotalStudents);
    }
  }, [activeSession?.id]);

  const handleCreateSession = async () => {
    if (!sessionName.trim()) {
      showAlert('Error', 'Please enter a session name');
      return;
    }

    if (!selectedClass) {
      showAlert('Error', 'Please select a class for this session');
      return;
    }

    try {
      await createSession(sessionName, user!.id, selectedClass);
      setSessionName('');
      const count = await classService.getClassStudentCount(selectedClass);
      setClassTotalStudents(count);
      showAlert('Success', 'QR Code generated successfully');
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to create session');
    }
  };

  const handleDeactivateSession = async () => {
    if (!activeSession) return;

    showAlert('End Session', 'Are you sure you want to end this attendance session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End',
        style: 'destructive',
        onPress: async () => {
          try {
            const absentees = await attendanceService.getAbsenteesBySession(activeSession.id, activeSession.classFilter);
            setLastEndedSessionAbsentees(absentees);
            await deactivateSession(activeSession.id);
            setShowEndSessionSummary(true);
          } catch (error: any) {
            showAlert('Error', error.message || 'Failed to end session');
          }
        },
      },
    ]);
  };

  const handleDownloadReport = async (reportType: string) => {
    try {
      const displayRecords = filteredRecords;

      // Fetch absent students based on report type
      let absentRecords: any[] = [];
      let totalStudents: number | undefined = undefined;

      if (reportType === 'Session' && selectedSessionId) {
        // For session reports, get absentees for that specific session
        const session = sessions.find(s => s.id === selectedSessionId);
        absentRecords = await attendanceService.getAbsenteesBySession(selectedSessionId, session?.classFilter);
        totalStudents = displayRecords.length + absentRecords.length;
      } else {
        // For "All" or "Date Range" reports, we can't easily determine absentees
        // But we can show the total unique students who attended
        const uniqueStudentIds = new Set(displayRecords.map(r => r.studentId));
        totalStudents = uniqueStudentIds.size;
      }

      // Allow report generation even if only absent records exist
      if (displayRecords.length === 0 && absentRecords.length === 0) {
        showAlert('No Data', 'There are no records to export');
        return;
      }

      const reportData: any = {
        records: displayRecords,
        absentRecords,
        totalStudents,
        reportType,
        sessionName: reportType === 'Session' && selectedSessionId
          ? sessions.find(s => s.id === selectedSessionId)?.sessionName
          : undefined,
        dateRange: reportType === 'Date Range' && startDate && endDate
          ? { start: startDate, end: endDate }
          : undefined,
      };

      // Special handling for Date Range: Group by session
      if (reportType === 'Date Range' && startDate && endDate) {
        const supabase = getSharedSupabaseClient();

        // 1. Fetch only sessions created by this staff in this date range
        const { data: rangeSessions, error: sessError } = await supabase
          .from('attendance_sessions')
          .select('*, profiles(name)')
          .eq('created_by', (user as any).id)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: true });

        if (sessError) throw sessError;

        if (rangeSessions && rangeSessions.length > 0) {
          const sessionGroups = await Promise.all(rangeSessions.map(async (s: any) => {
            // Get records for this session
            const { data: sessionRecs } = await supabase
              .from('attendance_records')
              .select('*')
              .eq('session_id', s.id);

            const present = (sessionRecs || []).map((r: any) => ({
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

            // Fetch absentees for this session
            const absentArr = await attendanceService.getAbsenteesBySession(s.id, s.class_filter);

            return {
              sessionName: s.session_name,
              staffName: s.profiles?.name || 'Staff',
              date: s.date,
              time: s.time,
              classFilter: s.class_filter || 'All Classes',
              present,
              absent: absentArr,
            };
          }));

          reportData.sessionGroups = sessionGroups;

          // Re-calculate overall stats for the date range
          const totalPresent = sessionGroups.reduce((acc: number, curr: any) => acc + curr.present.length, 0);
          const totalAbsent = sessionGroups.reduce((acc: number, curr: any) => acc + curr.absent.length, 0);
          reportData.totalStudents = totalPresent + totalAbsent;
          reportData.records = sessionGroups.flatMap((g: any) => g.present);
          reportData.absentRecords = []; // We use groups now
        }
      } else if (reportType === 'Session' && selectedSessionId) {
        // Enhance single session report with staff name
        const supabase = getSharedSupabaseClient();
        const currentSession = sessions.find(s => s.id === selectedSessionId);
        if (currentSession) {
          const { data: creator } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', currentSession.createdBy)
            .single();

          reportData.sessionGroups = [{
            sessionName: currentSession.sessionName,
            staffName: creator?.name || 'Staff',
            date: currentSession.date,
            time: currentSession.time,
            classFilter: currentSession.classFilter || 'All Classes',
            present: displayRecords,
            absent: absentRecords
          }];
        }
      }

      // Generate and share professional PDF report
      await pdfReportService.generateAttendanceReport(reportData);

    } catch (error: any) {
      console.error('Export error:', error);
      showAlert('Error', error.message || 'Failed to generate report');
    }
  };

  const handlePreviewSession = async (sessionId: string) => {
    try {
      const session = sessions.find(s => s.id === sessionId);
      if (!session) return;

      const sessionRecords = getSessionRecords(sessionId);
      const absentRecords = await attendanceService.getAbsenteesBySession(sessionId, session.classFilter);

      const total = sessionRecords.length + absentRecords.length;
      const rate = total > 0 ? ((sessionRecords.length / total) * 100).toFixed(1) : '0.0';

      const supabase = getSharedSupabaseClient();
      const { data: creator } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', session.createdBy)
        .single();

      setPreviewData({
        sessionName: session.sessionName,
        date: session.date,
        time: session.time,
        classFilter: session.classFilter || 'All Classes',
        staffName: creator?.name || 'Staff',
        total,
        presentCount: sessionRecords.length,
        absentCount: absentRecords.length,
        rate,
        present: sessionRecords,
        absent: absentRecords,
        id: sessionId
      });
      setShowPreviewModal(true);
    } catch (error: any) {
      showAlert('Error', 'Failed to load session preview');
    }
  };

  const handleDownloadSessionReport = async (sessionId: string, sessionName: string) => {
    try {
      // Get records for this specific session
      const sessionRecords = getSessionRecords(sessionId);

      // Fetch absent students for this session
      const session = sessions.find(s => s.id === sessionId);
      const absentRecords = await attendanceService.getAbsenteesBySession(sessionId, session?.classFilter);
      const totalStudents = sessionRecords.length + absentRecords.length;

      if (sessionRecords.length === 0 && absentRecords.length === 0) {
        showAlert('No Data', 'There are no records for this session');
        return;
      }

      // Prepare report data
      const supabase = getSharedSupabaseClient();
      const { data: creator } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', (user as any).id) // Use current staff ID
        .single();

      const reportData = {
        records: sessionRecords,
        absentRecords,
        totalStudents,
        reportType: 'Session',
        sessionName,
        sessionGroups: [{
          sessionName,
          staffName: creator?.name || 'Staff',
          date: sessions.find((s: any) => s.id === sessionId)?.date || '',
          time: sessions.find((s: any) => s.id === sessionId)?.time || '',
          classFilter: sessions.find((s: any) => s.id === sessionId)?.classFilter || 'All Classes',
          present: sessionRecords,
          absent: absentRecords
        }]
      };

      // Generate and share professional PDF report
      await pdfReportService.generateAttendanceReport(reportData);

    } catch (error: any) {
      console.error('Export error:', error);
      showAlert('Error', error.message || 'Failed to generate report');
    }
  };

  const handleLogout = () => {
    showAlert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/role-select');
        },
      },
    ]);
  };


  const handleViewSessionRecords = async (sessionId: string) => {
    setAttendanceViewMode('session');
    const sessionRecs = getSessionRecords(sessionId);
    setFilteredRecords(sessionRecs);

    try {
      const session = sessions.find(s => s.id === sessionId);
      const absentees = await attendanceService.getAbsenteesBySession(sessionId, session?.classFilter);
      setAbsentStudents(absentees);
    } catch (error) {
      console.error('Error fetching absentees:', error);
      setAbsentStudents([]);
    }
  };

  const handleViewDateRangeRecords = async () => {
    if (!startDate || !endDate) return;
    setAttendanceViewMode('date-range');
    const dateRecs = await getDateRangeRecords(startDate, endDate);
    setFilteredRecords(dateRecs);
    setAbsentStudents([]);
  };

  // Auto-load session records when selection changes
  React.useEffect(() => {
    if (selectedSessionId && attendanceViewMode === 'session') {
      handleViewSessionRecords(selectedSessionId);
    }
  }, [selectedSessionId, attendanceViewMode]);

  // Auto-load date range records when dates change
  React.useEffect(() => {
    if (attendanceViewMode === 'date-range' && startDate && endDate) {
      handleViewDateRangeRecords();
    }
  }, [startDate, endDate, attendanceViewMode]);

  // Calculate Global and Range Stats
  React.useEffect(() => {
    const calculateStats = async () => {
      // Global
      const totalPresent = records.length;

      // We calculate total absents by summing each session's absentees
      const sessionAbsentsPromises = sessions.map(s => attendanceService.getAbsenteesBySession(s.id, s.classFilter));
      const absentsResults = await Promise.all(sessionAbsentsPromises);
      const totalAbsent = absentsResults.reduce((acc, curr) => acc + curr.length, 0);

      const uniqueAttended = new Set(records.map(r => r.studentId));
      const uniqueAbsent = new Set(absentsResults.flat().map(a => a.studentId));
      const allUnique = new Set([...uniqueAttended, ...uniqueAbsent]);
      const uniqueStudents = allUnique.size;

      setGlobalStats({
        sessions: sessions.length,
        present: totalPresent,
        absent: totalAbsent,
        uniqueStudents
      });

      // Range
      if (startDate && endDate) {
        const rangeSessions = sessions.filter(s => s.date >= startDate && s.date <= endDate);
        const rangeRecords = records.filter(r => r.date >= startDate && r.date <= endDate);

        const rangeAbsentsPromises = rangeSessions.map(s => attendanceService.getAbsenteesBySession(s.id, s.classFilter));
        const rangeAbsentsResults = await Promise.all(rangeAbsentsPromises);
        const rangeAbsent = rangeAbsentsResults.reduce((acc, curr) => acc + curr.length, 0);

        const rangeUniqueAttended = new Set(rangeRecords.map(r => r.studentId));
        const rangeUniqueAbsent = new Set(rangeAbsentsResults.flat().map(a => a.studentId));
        const allRangeUnique = new Set([...rangeUniqueAttended, ...rangeUniqueAbsent]);
        const rangeUnique = allRangeUnique.size;
        setRangeStats({
          sessions: rangeSessions.length,
          present: rangeRecords.length,
          absent: rangeAbsent,
          uniqueStudents: rangeUnique
        });
      }
    };

    if (sessions.length > 0) {
      calculateStats();
    }
  }, [sessions, records, startDate, endDate]);

  // Auto-select first session if none selected
  React.useEffect(() => {
    if (viewMode === 'attendance' && attendanceViewMode === 'session' && sessions.length > 0 && !selectedSessionId) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [viewMode, attendanceViewMode, sessions]);

  const renderFilesView = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.staff.text }]}>
        Student Uploads ({files.length})
      </Text>
      <FileList files={files} role="staff" showStudentInfo />
    </View>
  );

  const renderQRView = () => {
    const sessionRecords = activeSession ? getSessionRecords(activeSession.id) : [];
    const presentCount = sessionRecords.length;
    const remainingCount = Math.max(0, classTotalStudents - presentCount);

    return (
      <View style={styles.section}>
        {!activeSession ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.staff.text }]}>
              Generate QR Code
            </Text>
            <Input
              label="Session Name"
              value={sessionName}
              onChangeText={setSessionName}
              placeholder="e.g., Morning Class - Math"
              role="staff"
            />
            <View style={styles.pickerContainer}>
              <Text style={[styles.label, { color: colors.staff.text }]}>Select Class</Text>
              <View style={styles.classGrid}>
                {availableClasses.length === 0 ? (
                  <Text style={styles.emptyText}>No classes found. Create one in Class Management.</Text>
                ) : (
                  availableClasses.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => setSelectedClass(item.className)}
                      style={[
                        styles.classSelectItem,
                        selectedClass === item.className && {
                          backgroundColor: colors.staff.surfaceLight,
                          borderColor: colors.staff.primary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.classSelectText,
                          {
                            color:
                              selectedClass === item.className
                                ? colors.staff.primary
                                : colors.staff.text,
                          },
                        ]}
                      >
                        {item.className}
                      </Text>
                      {selectedClass === item.className && (
                        <MaterialIcons name="check-circle" size={16} color={colors.staff.primary} />
                      )}
                    </Pressable>
                  ))
                )}
              </View>
            </View>
            <Button
              title="Generate QR Code"
              onPress={handleCreateSession}
              role="staff"
              style={{ marginTop: spacing.md }}
              disabled={availableClasses.length === 0}
            />
          </>
        ) : (
          <>
            <QRCodeDisplay
              value={activeSession.qrCode}
              sessionName={activeSession.sessionName}
              time={activeSession.time}
              role="staff"
            />
            <View style={styles.statBox}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.staff.primary }]}>{classTotalStudents}</Text>
                <Text style={[styles.statLabel, { color: colors.staff.textSecondary }]}>Total Students</Text>
              </View>
              <View style={[styles.statItem, styles.statDivider]}>
                <Text style={[styles.statValue, { color: '#10B981' }]}>{presentCount}</Text>
                <Text style={[styles.statLabel, { color: colors.staff.textSecondary }]}>Present</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#EF4444' }]}>{remainingCount}</Text>
                <Text style={[styles.statLabel, { color: colors.staff.textSecondary }]}>Remaining</Text>
              </View>
            </View>

            <Button
              title="End Session"
              onPress={handleDeactivateSession}
              variant="secondary"
              role="staff"
              textColor={colors.common.white}
              style={{ marginTop: spacing.md, backgroundColor: '#EF4444' }}
            />
          </>
        )}

        <Modal
          visible={showEndSessionSummary}
          transparent
          animationType="fade"
          onRequestClose={() => setShowEndSessionSummary(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.common.white }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.staff.text }]}>Session Summary</Text>
                <Pressable onPress={() => setShowEndSessionSummary(false)}>
                  <MaterialIcons name="close" size={24} color={colors.staff.text} />
                </Pressable>
              </View>
              <View style={styles.modalBody}>
                {lastEndedSessionAbsentees.length === 0 ? (
                  <View style={styles.allPresentContainer}>
                    <MaterialIcons name="check-circle" size={64} color="#10B981" />
                    <Text style={[styles.allPresentText, { color: colors.staff.text }]}>All students are present!</Text>
                  </View>
                ) : (
                  <>
                    <Text style={[styles.absenteeCountText, { color: colors.staff.textSecondary }]}>
                      {lastEndedSessionAbsentees.length} students were absent
                    </Text>
                    <FlatList
                      data={lastEndedSessionAbsentees}
                      keyExtractor={(item) => item.studentId}
                      style={{ maxHeight: 300, marginTop: spacing.md }}
                      renderItem={({ item }) => (
                        <View style={styles.absenteeItem}>
                          <View style={styles.absenteeIcon}>
                            <MaterialIcons name="person" size={20} color="#EF4444" />
                          </View>
                          <View style={{ flex: 1, marginLeft: spacing.sm }}>
                            <Text style={[styles.absenteeName, { color: colors.staff.text }]}>{item.studentName}</Text>
                            <Text style={[styles.absenteeDetails, { color: colors.staff.textSecondary }]}>Roll: {item.rollNumber}</Text>
                          </View>
                        </View>
                      )}
                    />
                  </>
                )}
                <Button
                  title="Close"
                  onPress={() => setShowEndSessionSummary(false)}
                  role="staff"
                  style={{ marginTop: spacing.xl }}
                />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  const renderAttendanceView = () => {
    // Determine which stats to show based on view mode
    const isRangeMode = attendanceViewMode === 'date-range';
    const activeStats = isRangeMode && (startDate && endDate) ? rangeStats : globalStats;

    const totalCount = activeStats.present + activeStats.absent;
    const presentRate = totalCount > 0 ? ((activeStats.present / totalCount) * 100).toFixed(1) : '0.0';
    const absentRate = totalCount > 0 ? ((activeStats.absent / totalCount) * 100).toFixed(1) : '0.0';

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.staff.text }]}>
            Attendance Overview
          </Text>
          <View style={styles.summaryBadge}>
            <Text style={styles.summaryBadgeText}>{activeStats.uniqueStudents} Total Students</Text>
          </View>
        </View>

        {/* Attendance Summary Cards */}
        <View style={styles.proStatsContainer}>
          <View style={[styles.proStatCard, { borderLeftColor: colors.staff.primary }]}>
            <Text style={styles.proStatValue}>{activeStats.sessions}</Text>
            <Text style={styles.proStatLabel}>Sessions</Text>
          </View>
          <View style={[styles.proStatCard, { borderLeftColor: colors.staff.success }]}>
            <Text style={styles.proStatValue}>{presentRate}%</Text>
            <Text style={styles.proStatLabel}>Present</Text>
          </View>
          <View style={[styles.proStatCard, { borderLeftColor: '#EF4444' }]}>
            <Text style={styles.proStatValue}>{absentRate}%</Text>
            <Text style={styles.proStatLabel}>Absent</Text>
          </View>
        </View>

        <View style={styles.filterButtons}>
          <Pressable
            onPress={() => setAttendanceViewMode('session')}
            style={({ pressed }) => [
              styles.filterButton,
              attendanceViewMode === 'session' && {
                backgroundColor: colors.staff.primary,
              },
              attendanceViewMode !== 'session' && {
                backgroundColor: colors.staff.surface,
                borderColor: colors.staff.border,
                borderWidth: 1,
              },
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.filterButtonText,
                attendanceViewMode === 'session'
                  ? { color: colors.common.white }
                  : { color: colors.staff.text },
              ]}
            >
              By Session
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setAttendanceViewMode('date-range')}
            style={({ pressed }) => [
              styles.filterButton,
              attendanceViewMode === 'date-range' && {
                backgroundColor: colors.staff.primary,
              },
              attendanceViewMode !== 'date-range' && {
                backgroundColor: colors.staff.surface,
                borderColor: colors.staff.border,
                borderWidth: 1,
              },
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.filterButtonText,
                attendanceViewMode === 'date-range'
                  ? { color: colors.common.white }
                  : { color: colors.staff.text },
              ]}
            >
              Date Range
            </Text>
          </Pressable>
        </View>

        {attendanceViewMode === 'session' && (
          <View style={styles.filterForm}>
            <View style={styles.pickerContainer}>
              <Text style={[styles.label, { color: colors.staff.text }]}>Select Session</Text>
              <FlatList
                data={sessions}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <View
                    style={[
                      styles.sessionItem,
                      {
                        backgroundColor:
                          selectedSessionId === item.id
                            ? colors.staff.surfaceLight
                            : colors.staff.surface,
                        borderColor: colors.staff.border,
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <Pressable
                      onPress={() => setSelectedSessionId(item.id)}
                      style={styles.sessionInfo}
                    >
                      <Text style={[styles.sessionName, { color: colors.staff.text }]}>
                        {item.sessionName}
                      </Text>
                      <Text style={[styles.sessionDate, { color: colors.staff.textSecondary }]}>
                        {item.date} • {item.time}
                      </Text>
                    </Pressable>
                    <View style={styles.sessionActions}>
                      <Pressable
                        onPress={() => handlePreviewSession(item.id)}
                        style={{ marginRight: spacing.sm }}
                      >
                        <MaterialIcons name="visibility" size={24} color={colors.staff.primary} />
                      </Pressable>
                      <Pressable
                        onPress={() => handleDownloadSessionReport(item.id, item.sessionName)}
                        style={({ pressed }) => [
                          styles.sessionDownloadButton,
                          { backgroundColor: colors.staff.primary },
                          pressed && styles.pressed,
                        ]}
                      >
                        <MaterialIcons name="download" size={18} color={colors.common.white} />
                      </Pressable>
                    </View>
                  </View>
                )}
                ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
              />
            </View>
          </View>
        )}

        {attendanceViewMode === 'date-range' && (
          <View style={styles.filterForm}>
            <View style={styles.dateRangeRow}>
              <View style={styles.dateInputWrapper}>
                <Pressable onPress={() => setShowStartDatePicker(true)}>
                  <View pointerEvents="none">
                    <Input
                      label="Start Date"
                      value={startDate}
                      placeholder="Select Date"
                      role="staff"
                      editable={false}
                    />
                  </View>
                </Pressable>
              </View>
              <View style={styles.dateInputWrapper}>
                <Pressable onPress={() => setShowEndDatePicker(true)}>
                  <View pointerEvents="none">
                    <Input
                      label="End Date"
                      value={endDate}
                      placeholder="Select Date"
                      role="staff"
                      editable={false}
                    />
                  </View>
                </Pressable>
              </View>
            </View>
            {showStartDatePicker && (
              <DateTimePicker
                value={startDate ? new Date(startDate) : new Date()}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowStartDatePicker(false);
                  if (date) setStartDate(date.toISOString().split('T')[0]);
                }}
              />
            )}
            {showEndDatePicker && (
              <DateTimePicker
                value={endDate ? new Date(endDate) : new Date()}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowEndDatePicker(false);
                  if (date) setEndDate(date.toISOString().split('T')[0]);
                }}
              />
            )}
          </View>
        )}

        {attendanceViewMode === 'date-range' && (
          <View style={styles.recordsContainer}>
            {startDate && endDate ? (
              <View style={styles.rangeReportCard}>
                <View style={styles.rangeReportHeader}>
                  <View style={styles.rangeIconContainer}>
                    <MaterialIcons name="assessment" size={32} color={colors.staff.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rangeReportTitle}>Consolidated Report</Text>
                    <Text style={styles.rangeReportPeriod}>
                      {startDate} — {endDate}
                    </Text>
                  </View>
                </View>

                <View style={styles.rangeSummaryGrid}>
                  <View style={styles.rangeSummaryItem}>
                    <Text style={styles.rangeSummaryValue}>
                      {sessions.filter(s => s.date >= startDate && s.date <= endDate).length}
                    </Text>
                    <Text style={styles.rangeSummaryLabel}>Sessions Found</Text>
                  </View>
                  <View style={[styles.rangeSummaryItem, { borderLeftWidth: 1, borderLeftColor: '#F1F5F9' }]}>
                    <Text style={styles.rangeSummaryValue}>
                      {filteredRecords.length}
                    </Text>
                    <Text style={styles.rangeSummaryLabel}>Total Present</Text>
                  </View>
                </View>

                <View style={styles.rangeActionSection}>
                  <Text style={styles.rangeActionHint}>
                    Download a comprehensive PDF report featuring all attendance sessions within this date range.
                  </Text>
                  <Button
                    title="Download Full Report"
                    onPress={() => handleDownloadReport('Date Range')}
                    role="staff"
                    icon={<MaterialIcons name="picture-as-pdf" size={20} color="white" />}
                    style={{ marginTop: spacing.md }}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.rangeHelpContainer}>
                <MaterialIcons name="date-range" size={48} color={colors.staff.border} />
                <Text style={styles.rangeHelpText}>
                  Select both a start and end date above to generate a consolidated report for that period.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Session Preview Modal */}
        <Modal
          visible={showPreviewModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPreviewModal(false)}
        >
          <View style={styles.previewModalOverlay}>
            <View style={[styles.previewModalContent, { backgroundColor: colors.common.white }]}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>{previewData?.sessionName}</Text>
                  <Text style={styles.modalSubtitle}>{previewData?.date} • {previewData?.time}</Text>
                </View>
                <Pressable onPress={() => setShowPreviewModal(false)} style={styles.closeButton}>
                  <MaterialIcons name="close" size={28} color={colors.staff.text} />
                </Pressable>
              </View>

              <View style={styles.previewScrollArea}>
                <View style={styles.previewBadgeRow}>
                  <View style={styles.previewMiniCard}>
                    <Text style={styles.previewMiniValue}>{previewData?.total}</Text>
                    <Text style={styles.previewMiniLabel}>Students</Text>
                  </View>
                  <View style={[styles.previewMiniCard, { borderLeftColor: colors.staff.success, borderLeftWidth: 4 }]}>
                    <Text style={[styles.previewMiniValue, { color: colors.staff.success }]}>{previewData?.presentCount}</Text>
                    <Text style={styles.previewMiniLabel}>Present</Text>
                  </View>
                  <View style={[styles.previewMiniCard, { borderLeftColor: '#EF4444', borderLeftWidth: 4 }]}>
                    <Text style={[styles.previewMiniValue, { color: '#EF4444' }]}>{previewData?.absentCount}</Text>
                    <Text style={styles.previewMiniLabel}>Absent</Text>
                  </View>
                </View>

                <View style={styles.previewRateSection}>
                  <Text style={styles.previewRateText}>Average Attendance Rate</Text>
                  <Text style={styles.previewRateValue}>{previewData?.rate}%</Text>
                  <Text style={styles.previewInfoText}>Class: {previewData?.classFilter} • Staff: {previewData?.staffName}</Text>
                </View>

                <View style={styles.previewListHeader}>
                  <Text style={styles.previewListTitle}>Attendance Details</Text>
                </View>

                <FlatList
                  data={[
                    ...(previewData?.present || []).map((p: any) => ({ ...p, type: 'present' })),
                    ...(previewData?.absent || []).map((a: any) => ({ ...a, type: 'absent' }))
                  ]}
                  keyExtractor={(item, index) => index.toString()}
                  renderItem={({ item }) => (
                    <View style={styles.previewListItem}>
                      <View style={[styles.previewDot, { backgroundColor: item.type === 'present' ? colors.staff.success : '#EF4444' }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.previewItemName}>{item.studentName}</Text>
                        <Text style={styles.previewItemRoll}>{item.rollNumber}</Text>
                      </View>
                      <Text style={[styles.previewItemStatus, { color: item.type === 'present' ? colors.staff.success : '#EF4444' }]}>
                        {item.type.toUpperCase()}
                      </Text>
                    </View>
                  )}
                  style={{ maxHeight: 400 }}
                />
              </View>

              <View style={styles.previewFooter}>
                <Button
                  title="Download PDF Report"
                  onPress={() => {
                    handleDownloadSessionReport(previewData?.id, previewData?.sessionName);
                  }}
                  role="staff"
                  icon={<MaterialIcons name="file-download" size={20} color="white" />}
                />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  const renderClassesView = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.staff.text }]}>
        Class Management
      </Text>
      <View style={[styles.infoCard, { backgroundColor: colors.staff.surface, borderColor: colors.staff.border }]}>
        <MaterialIcons name="school" size={48} color={colors.staff.primary} style={{ alignSelf: 'center', marginBottom: spacing.md }} />
        <Text style={[styles.infoText, { color: colors.staff.text }]}>
          Manage your classes, students, and academic year settings from here.
        </Text>
        <Button
          title="Go to Class Management"
          onPress={() => router.push('/class-management')}
          role="staff"
          style={{ marginTop: spacing.lg }}
        />
      </View>
    </View>
  );

  if (!user) return null;

  return (
    <Screen
      role="staff"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.staff.textSecondary }]}>
              Staff Portal
            </Text>
            <Text style={[styles.name, { color: colors.staff.text }]}>{user?.name}</Text>
            {(user as any)?.department && (
              <Text style={[styles.department, { color: colors.staff.textSecondary }]}>
                {(user as any).department} Department
              </Text>
            )}
          </View>
          <Pressable onPress={handleLogout} style={styles.logoutButton} hitSlop={8}>
            <MaterialIcons name="logout" size={24} color={colors.staff.text} />
          </Pressable>
        </View>

        <View style={styles.tabs}>
          <Pressable
            onPress={() => setViewMode('files')}
            style={[
              styles.tab,
              viewMode === 'files' && { borderBottomColor: colors.staff.primary },
            ]}
          >
            <MaterialIcons
              name="folder"
              size={20}
              color={viewMode === 'files' ? colors.staff.primary : colors.staff.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    viewMode === 'files' ? colors.staff.primary : colors.staff.textSecondary,
                },
              ]}
            >
              Files
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setViewMode('qr')}
            style={[
              styles.tab,
              viewMode === 'qr' && { borderBottomColor: colors.staff.primary },
            ]}
          >
            <MaterialIcons
              name="qr-code"
              size={20}
              color={viewMode === 'qr' ? colors.staff.primary : colors.staff.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                {
                  color: viewMode === 'qr' ? colors.staff.primary : colors.staff.textSecondary,
                },
              ]}
            >
              QR Code
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setViewMode('attendance');
            }}
            style={[
              styles.tab,
              viewMode === 'attendance' && { borderBottomColor: colors.staff.primary },
            ]}
          >
            <MaterialIcons
              name="people"
              size={20}
              color={
                viewMode === 'attendance' ? colors.staff.primary : colors.staff.textSecondary
              }
            />
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    viewMode === 'attendance'
                      ? colors.staff.primary
                      : colors.staff.textSecondary,
                },
              ]}
            >
              Attendance
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setViewMode('classes')}
            style={[
              styles.tab,
              viewMode === 'classes' && { borderBottomColor: colors.staff.primary },
            ]}
          >
            <MaterialIcons
              name="school"
              size={20}
              color={
                viewMode === 'classes' ? colors.staff.primary : colors.staff.textSecondary
              }
            />
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    viewMode === 'classes'
                      ? colors.staff.primary
                      : colors.staff.textSecondary,
                },
              ]}
            >
              Classes
            </Text>
          </Pressable>
        </View>

        {viewMode === 'files' && renderFilesView()}
        {viewMode === 'qr' && renderQRView()}
        {viewMode === 'attendance' && renderAttendanceView()}
        {viewMode === 'classes' && renderClassesView()}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  greeting: {
    ...typography.bodySmall,
  },
  name: {
    ...typography.h1,
    marginTop: spacing.xs,
  },
  department: {
    ...typography.bodySmall,
    fontWeight: '600',
    marginTop: 2,
  },
  logoutButton: {
    padding: spacing.xs,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.staff.surface,
    padding: spacing.xs,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.common.gray200,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: 4,
  },
  tabActive: {
    backgroundColor: colors.staff.primary + '15',
  },
  tabText: {
    ...typography.bodySmall,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h2,
    marginBottom: spacing.md,
  },
  classGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  classSelectItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.common.gray200,
    backgroundColor: colors.common.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  classSelectText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statBox: {
    flexDirection: 'row',
    backgroundColor: colors.staff.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.staff.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.staff.border,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  attendanceCount: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  filterButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonText: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  filterForm: {
    marginBottom: spacing.xs,
  },
  dateRangeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateInputWrapper: {
    flex: 1,
  },
  pickerContainer: {
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.bodySmall,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionName: {
    ...typography.body,
    fontWeight: '600',
  },
  sessionDate: {
    ...typography.caption,
    marginTop: 2,
  },
  sessionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionDownloadButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordsContainer: {
    marginTop: 0,
  },
  recordsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  recordsTitle: {
    ...typography.h3,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  summaryBadge: {
    backgroundColor: colors.staff.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.staff.border,
  },
  summaryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.staff.primary,
  },
  proStatsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  proStatCard: {
    flex: 1,
    backgroundColor: colors.common.white,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    ...shadows.sm,
  },
  proStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.staff.text,
  },
  proStatLabel: {
    fontSize: 10,
    color: colors.staff.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  searchContainer: {
    marginBottom: spacing.sm,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.common.white,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.staff.border,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 14,
  },
  recordCardPro: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.staff.border,
    ...shadows.sm,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.staff.primary,
  },
  recordContent: {
    flex: 1,
  },
  recordHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  recordNamePro: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.staff.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  recordDetailPro: {
    fontSize: 12,
    color: colors.staff.textSecondary,
    fontWeight: '500',
  },
  recordMetaPro: {
    fontSize: 11,
    color: colors.common.gray400,
    marginTop: 2,
  },
  sectionSubtitle: {
    ...typography.body,
    fontWeight: '700',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  downloadText: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    marginTop: spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
  infoCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  infoText: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    width: '100%',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h3,
    fontWeight: '700',
  },
  modalBody: {
    paddingBottom: spacing.md,
  },
  allPresentContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  allPresentText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: spacing.md,
  },
  absenteeCountText: {
    fontSize: 14,
    fontWeight: '500',
  },
  absenteeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.common.gray100,
  },
  absenteeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  absenteeName: {
    fontSize: 15,
    fontWeight: '600',
  },
  absenteeDetails: {
    fontSize: 12,
  },
  previewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  previewModalContent: {
    height: '92%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: spacing.xl,
    paddingBottom: 40,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.staff.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    padding: spacing.xs,
  },
  previewScrollArea: {
    flex: 1,
    marginTop: spacing.lg,
  },
  previewBadgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  previewMiniCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: spacing.md,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewMiniValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.staff.text,
  },
  previewMiniLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.staff.textSecondary,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  previewRateSection: {
    backgroundColor: colors.staff.primary + '10',
    padding: spacing.xl,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  previewRateText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.staff.primary,
  },
  previewRateValue: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.staff.primary,
    marginVertical: spacing.xs,
  },
  previewInfoText: {
    fontSize: 12,
    color: colors.staff.textSecondary,
    fontWeight: '500',
  },
  previewListHeader: {
    marginBottom: spacing.md,
  },
  previewListTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.staff.text,
  },
  previewListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  previewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.md,
  },
  previewItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.staff.text,
  },
  previewItemRoll: {
    fontSize: 12,
    color: colors.staff.textSecondary,
  },
  previewItemStatus: {
    fontSize: 11,
    fontWeight: '800',
  },
  previewFooter: {
    marginTop: spacing.xl,
  },
  rangeReportCard: {
    backgroundColor: colors.common.white,
    borderRadius: 24,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...shadows.md,
  },
  rangeReportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  rangeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.staff.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  rangeReportTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.staff.text,
  },
  rangeReportPeriod: {
    fontSize: 14,
    color: colors.staff.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  rangeSummaryGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  rangeSummaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  rangeSummaryValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.staff.primary,
  },
  rangeSummaryLabel: {
    fontSize: 12,
    color: colors.staff.textSecondary,
    fontWeight: '600',
    marginTop: 4,
  },
  rangeActionSection: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: spacing.xl,
  },
  rangeActionHint: {
    fontSize: 13,
    color: colors.staff.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  rangeHelpContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  rangeHelpText: {
    fontSize: 14,
    color: colors.staff.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    lineHeight: 22,
  },
});
