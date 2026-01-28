import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, RefreshControl, Modal } from 'react-native';
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
type AttendanceViewMode = 'all' | 'session' | 'date-range';

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
  } = useAttendance();
  const router = useRouter();
  const { showAlert } = useAlert();

  const [viewMode, setViewMode] = useState<ViewMode>('files');
  const [attendanceViewMode, setAttendanceViewMode] = useState<AttendanceViewMode>('all');
  const [sessionName, setSessionName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);
  const [absentStudents, setAbsentStudents] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [availableClasses, setAvailableClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [classTotalStudents, setClassTotalStudents] = useState<number>(0);
  const [showEndSessionSummary, setShowEndSessionSummary] = useState(false);
  const [lastEndedSessionAbsentees, setLastEndedSessionAbsentees] = useState<any[]>([]);

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
      const displayRecords =
        attendanceViewMode === 'all' && filteredRecords.length === 0 ? records : filteredRecords;

      // Fetch absent students based on report type
      let absentRecords: any[] = [];
      let totalStudents: number | undefined = undefined;

      if (reportType === 'Session' && selectedSessionId) {
        // For session reports, get absentees for that specific session
        absentRecords = await attendanceService.getAbsenteesBySession(selectedSessionId);
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

      // Prepare report data
      const reportData = {
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

      // Generate and share professional PDF report
      await pdfReportService.generateAttendanceReport(reportData);

    } catch (error: any) {
      console.error('Export error:', error);
      showAlert('Error', error.message || 'Failed to generate report');
    }
  };

  const handleDownloadSessionReport = async (sessionId: string, sessionName: string) => {
    try {
      // Get records for this specific session
      const sessionRecords = getSessionRecords(sessionId);

      // Fetch absent students for this session
      const absentRecords = await attendanceService.getAbsenteesBySession(sessionId);
      const totalStudents = sessionRecords.length + absentRecords.length;

      if (sessionRecords.length === 0 && absentRecords.length === 0) {
        showAlert('No Data', 'There are no records for this session');
        return;
      }

      // Prepare report data
      const reportData = {
        records: sessionRecords,
        absentRecords,
        totalStudents,
        reportType: 'Session',
        sessionName,
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

  const handleViewAllRecords = () => {
    setAttendanceViewMode('all');
    setFilteredRecords(records);
    setAbsentStudents([]); // Clear absent students for "all" view
  };

  const handleViewSessionRecords = async () => {
    if (!selectedSessionId) {
      showAlert('Error', 'Please select a session');
      return;
    }
    setAttendanceViewMode('session');
    const sessionRecs = getSessionRecords(selectedSessionId);
    setFilteredRecords(sessionRecs);

    // Fetch absent students for this session
    try {
      const absentees = await attendanceService.getAbsenteesBySession(selectedSessionId);
      setAbsentStudents(absentees);
    } catch (error) {
      console.error('Error fetching absentees:', error);
      setAbsentStudents([]);
    }
  };

  const handleViewDateRangeRecords = async () => {
    if (!startDate || !endDate) {
      showAlert('Error', 'Please enter both start and end dates');
      return;
    }
    setAttendanceViewMode('date-range');
    const dateRecs = await getDateRangeRecords(startDate, endDate);
    setFilteredRecords(dateRecs);
    setAbsentStudents([]); // Clear absent students for date range view
  };

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
    const displayRecords =
      attendanceViewMode === 'all' && filteredRecords.length === 0 ? records : filteredRecords;

    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.staff.text }]}>
          View Attendance
        </Text>

        <View style={styles.filterButtons}>
          <Pressable
            onPress={handleViewAllRecords}
            style={({ pressed }) => [
              styles.filterButton,
              attendanceViewMode === 'all' && {
                backgroundColor: colors.staff.primary,
              },
              !attendanceViewMode.includes('all') && {
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
                attendanceViewMode === 'all'
                  ? { color: colors.common.white }
                  : { color: colors.staff.text },
              ]}
            >
              All Records
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setAttendanceViewMode('session')}
            style={({ pressed }) => [
              styles.filterButton,
              attendanceViewMode === 'session' && {
                backgroundColor: colors.staff.primary,
              },
              !attendanceViewMode.includes('session') && {
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
              !attendanceViewMode.includes('date-range') && {
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
                      {selectedSessionId === item.id && (
                        <MaterialIcons name="check-circle" size={24} color={colors.staff.primary} style={{ marginRight: spacing.xs }} />
                      )}
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
            <Button
              title="View Session Records"
              onPress={handleViewSessionRecords}
              role="staff"
              style={{ marginTop: spacing.md }}
            />
          </View>
        )}

        {attendanceViewMode === 'date-range' && (
          <View style={styles.filterForm}>
            <Pressable onPress={() => setShowStartDatePicker(true)}>
              <View pointerEvents="none">
                <Input
                  label="Start Date"
                  value={startDate}
                  placeholder="Select Start Date"
                  role="staff"
                  editable={false}
                />
              </View>
            </Pressable>
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

            <Pressable onPress={() => setShowEndDatePicker(true)}>
              <View pointerEvents="none">
                <Input
                  label="End Date"
                  value={endDate}
                  placeholder="Select End Date"
                  role="staff"
                  editable={false}
                />
              </View>
            </Pressable>
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

            <Button
              title="View Date Range Records"
              onPress={handleViewDateRangeRecords}
              role="staff"
              style={{ marginTop: spacing.md }}
            />
          </View>
        )}

        <View style={styles.recordsContainer}>
          <View style={styles.recordsHeader}>
            <Text style={[styles.recordsTitle, { color: colors.staff.text }]}>
              Records ({displayRecords.length})
            </Text>
            <Pressable
              onPress={() =>
                handleDownloadReport(
                  attendanceViewMode === 'all'
                    ? 'All'
                    : attendanceViewMode === 'session'
                      ? 'Session'
                      : 'Date Range'
                )
              }
              style={({ pressed }) => [styles.downloadButton, pressed && styles.pressed]}
            >
              <MaterialIcons name="download" size={20} color={colors.staff.primary} />
              <Text style={[styles.downloadText, { color: colors.staff.primary }]}>
                Download PDF
              </Text>
            </Pressable>
          </View>


          {displayRecords.length === 0 && absentStudents.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="event-busy" size={64} color={colors.staff.border} />
              <Text style={[styles.emptyText, { color: colors.staff.textSecondary }]}>
                No attendance records found
              </Text>
            </View>
          ) : (
            <>
              {displayRecords.length > 0 && (
                <>
                  <Text style={[styles.sectionSubtitle, { color: colors.staff.text, marginBottom: spacing.sm }]}>
                    Present Students ({displayRecords.length})
                  </Text>
                  <FlatList
                    data={displayRecords}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                    renderItem={({ item }) => (
                      <View
                        style={[
                          styles.recordCard,
                          { backgroundColor: colors.staff.surface, borderColor: colors.staff.border },
                        ]}
                      >
                        <View style={styles.recordInfo}>
                          <Text style={[styles.recordName, { color: colors.staff.text }]}>
                            {item.studentName}
                          </Text>
                          <Text style={[styles.recordDetails, { color: colors.staff.textSecondary }]}>
                            Roll: {item.rollNumber} • Class: {item.class}
                          </Text>
                          <Text style={[styles.recordDetails, { color: colors.staff.textSecondary }]}>
                            {item.sessionName} • {item.date}
                          </Text>
                        </View>
                        <MaterialIcons name="check-circle" size={24} color={colors.staff.success} />
                      </View>
                    )}
                    ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
                  />
                </>
              )}

              {absentStudents.length > 0 && (
                <>
                  <Text style={[styles.sectionSubtitle, { color: colors.staff.text, marginTop: displayRecords.length > 0 ? spacing.lg : 0, marginBottom: spacing.sm }]}>
                    Absent Students ({absentStudents.length})
                  </Text>
                  <FlatList
                    data={absentStudents}
                    keyExtractor={(item) => item.studentId}
                    scrollEnabled={false}
                    renderItem={({ item }) => (
                      <View
                        style={[
                          styles.recordCard,
                          styles.absentCard,
                          { backgroundColor: '#FEF2F2', borderColor: '#EF4444' },
                        ]}
                      >
                        <View style={styles.recordInfo}>
                          <Text style={[styles.recordName, { color: colors.staff.text }]}>
                            {item.studentName}
                          </Text>
                          <Text style={[styles.recordDetails, { color: colors.staff.textSecondary }]}>
                            Roll: {item.rollNumber} • Class: {item.class}
                          </Text>
                        </View>
                        <MaterialIcons name="cancel" size={24} color="#EF4444" />
                      </View>
                    )}
                    ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
                  />
                </>
              )}
            </>
          )}
        </View>
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
              handleViewAllRecords();
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
    backgroundColor: colors.staff.primary + '15', // Subtle primary tint
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
    marginBottom: spacing.md,
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
    marginBottom: spacing.lg,
  },
  pickerContainer: {
    marginBottom: spacing.md,
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
    marginTop: spacing.lg,
  },
  recordsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  recordsTitle: {
    ...typography.h3,
  },
  sectionSubtitle: {
    ...typography.body,
    fontWeight: '700',
  },
  absentCard: {
    // Additional styling for absent cards (combined with recordCard)
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
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  recordInfo: {
    flex: 1,
  },
  recordName: {
    ...typography.body,
    fontWeight: '600',
  },
  recordDetails: {
    ...typography.caption,
    marginTop: 2,
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
});
