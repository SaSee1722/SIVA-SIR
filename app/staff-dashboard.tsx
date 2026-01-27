import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, RefreshControl } from 'react-native';
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
import { colors, typography, borderRadius, spacing } from '@/constants/theme';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useAlert } from '@/template';
import DateTimePicker from '@react-native-community/datetimepicker';
import { pdfReportService } from '@/services/pdfReportService';

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
  const [refreshing, setRefreshing] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const activeSession = sessions.find((s) => s.isActive);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshFiles(), refreshAttendance()]);
    setRefreshing(false);
  };

  const handleCreateSession = async () => {
    if (!sessionName.trim()) {
      showAlert('Error', 'Please enter a session name');
      return;
    }

    try {
      await createSession(sessionName, user!.id);
      setSessionName('');
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
          await deactivateSession(activeSession.id);
          showAlert('Session Ended', 'Attendance session has been closed');
        },
      },
    ]);
  };

  const handleDownloadReport = async (reportType: string) => {
    try {
      const displayRecords =
        attendanceViewMode === 'all' && filteredRecords.length === 0 ? records : filteredRecords;

      if (displayRecords.length === 0) {
        showAlert('No Data', 'There are no records to export');
        return;
      }

      // Prepare report data
      const reportData = {
        records: displayRecords,
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
  };

  const handleViewSessionRecords = () => {
    if (!selectedSessionId) {
      showAlert('Error', 'Please select a session');
      return;
    }
    setAttendanceViewMode('session');
    const sessionRecs = getSessionRecords(selectedSessionId);
    setFilteredRecords(sessionRecs);
  };

  const handleViewDateRangeRecords = async () => {
    if (!startDate || !endDate) {
      showAlert('Error', 'Please enter both start and end dates');
      return;
    }
    setAttendanceViewMode('date-range');
    const dateRecs = await getDateRangeRecords(startDate, endDate);
    setFilteredRecords(dateRecs);
  };

  const renderFilesView = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.staff.text }]}>
        Student Uploads ({files.length})
      </Text>
      <FileList files={files} role="staff" showStudentInfo />
    </View>
  );

  const renderQRView = () => (
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
          <Button
            title="Generate QR Code"
            onPress={handleCreateSession}
            role="staff"
            style={{ marginTop: spacing.md }}
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
          <Text style={[styles.attendanceCount, { color: colors.staff.textSecondary }]}>
            {getSessionRecords(activeSession.id).length} students marked present
          </Text>
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
    </View>
  );

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
                  <Pressable
                    onPress={() => setSelectedSessionId(item.id)}
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
                    <View style={styles.sessionInfo}>
                      <Text style={[styles.sessionName, { color: colors.staff.text }]}>
                        {item.sessionName}
                      </Text>
                      <Text style={[styles.sessionDate, { color: colors.staff.textSecondary }]}>
                        {item.date} • {item.time}
                      </Text>
                    </View>
                    {selectedSessionId === item.id && (
                      <MaterialIcons name="check-circle" size={24} color={colors.staff.primary} />
                    )}
                  </Pressable>
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

          {displayRecords.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="event-busy" size={64} color={colors.staff.border} />
              <Text style={[styles.emptyText, { color: colors.staff.textSecondary }]}>
                No attendance records found
              </Text>
            </View>
          ) : (
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
    <Screen role="staff" scrollable={false}>
      <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />

      <View style={[styles.container, { flex: 1 }]}>
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
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h2,
    marginBottom: spacing.md,
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
});
