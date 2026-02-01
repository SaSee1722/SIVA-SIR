import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, RefreshControl, Modal, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/useAuth';
import { useFiles } from '@/hooks/useFiles';
import { useAttendance } from '@/hooks/useAttendance';
import { Screen } from '@/components/layout/Screen';
import { FileUploader } from '@/components/feature/FileUploader';
import { FileList } from '@/components/feature/FileList';
import { AttendanceStats } from '@/components/feature/AttendanceStats';
import { useNotifications } from '@/hooks/useNotifications';
import { StudentProfile, User, Class } from '@/types';
import { colors, typography, borderRadius, spacing, shadows } from '@/constants/theme';
import { useAlert } from '@/template';
import { useToast } from '@/components/ui/Toast';
import { StaffSelector } from '@/components/feature/StaffSelector';
import { classService } from '@/services/classService';
import { notificationService } from '@/services/notificationService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import * as FileSystem from 'expo-file-system';

export default function StudentDashboardScreen() {
  const { user, logout, updateProfile } = useAuth();
  const studentProfile = user as StudentProfile;
  const { files, uploadFile, deleteFile, refresh: refreshFiles } = useFiles(user?.id);
  const { records, sessions, refresh: refreshAttendance } = useAttendance();
  const { unreadCount, refresh: refreshNotifications } = useNotifications(user?.id);
  const router = useRouter();
  const { showAlert } = useAlert();
  const { showToast } = useToast();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<User | null>(null);

  // Edit Profile States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editYear, setEditYear] = useState('');
  const [editClasses, setEditClasses] = useState<string[]>([]);
  const [availableClasses, setAvailableClasses] = useState<Class[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<Class[]>([]);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [editSystemNumber, setEditSystemNumber] = useState('');
  const [updating, setUpdating] = useState(false);

  // Stats Detail States
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [statsModalType, setStatsModalType] = useState<'total' | 'present' | 'absent'>('total');

  const DEFAULT_YEARS = useMemo(() => ['I YEAR', 'II YEAR', 'III YEAR', 'IV YEAR'], []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshFiles(), refreshAttendance(), refreshNotifications()]);
    setRefreshing(false);
  };

  const loadAllClasses = useCallback(async () => {
    try {
      const classes = await classService.getAllClasses();
      setAvailableClasses(classes);
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      notificationService.registerForPushNotificationsAsync(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    if (showEditModal) {
      loadAllClasses();
      setEditYear(studentProfile?.year || '');
      setEditClasses(studentProfile?.class ? studentProfile.class.split(',').map(s => s.trim()) : []);
      setEditSystemNumber(studentProfile?.systemNumber || '');
    }
  }, [showEditModal, studentProfile, loadAllClasses]);

  useEffect(() => {
    if (editYear) {
      const filtered = availableClasses.filter(c => c.year === editYear);
      setFilteredClasses(filtered);
    } else {
      setFilteredClasses([]);
    }
  }, [editYear, availableClasses]);

  const handleYearSelect = (year: string) => {
    setEditYear(year);
    setEditClasses([]); // Clear classes when year changes
    setShowYearPicker(false);
  };

  const handleClassSelect = (className: string) => {
    setEditClasses(prev => {
      if (prev.includes(className)) {
        return prev.filter(c => c !== className);
      }
      return [...prev, className];
    });
  };

  const handleSaveProfile = async () => {
    if (!editYear || editClasses.length === 0 || !editSystemNumber) {
      showAlert('Error', 'Please select a year, at least one class, and enter system number');
      return;
    }

    setUpdating(true);
    try {
      await updateProfile({
        year: editYear,
        class: editClasses.join(', '),
        systemNumber: editSystemNumber,
      });
      setShowEditModal(false);
      setShowYearPicker(false); // Reset year picker state
      showToast('Profile updated successfully!', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to update profile', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpload = async (file: { fileName: string; fileType: string; fileSize: number; base64Data?: string; uri?: string }) => {
    if (!selectedStaff) {
      showAlert('No Staff Selected', 'Please select a staff member before uploading files');
      return;
    }

    try {
      let finalBase64 = file.base64Data;
      if (file.uri && !finalBase64) {
        const base64 = await FileSystem.readAsStringAsync(file.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        finalBase64 = `data:${file.fileType};base64,${base64}`;
      }

      await uploadFile({
        studentId: user!.id,
        studentName: user!.name,
        recipientId: selectedStaff?.id,
        recipientName: selectedStaff?.name,
        fileName: file.fileName,
        fileType: file.fileType,
        fileSize: file.fileSize,
        base64Data: finalBase64,
      });
      showToast('File uploaded successfully!', 'success');
    } catch (error: any) {
      showToast(`Upload failed: ${error.message}`, 'error');
    }
  };

  const handleDelete = async (fileId: string) => {
    showAlert('Confirm Delete', 'Are you sure you want to delete this file?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteFile(fileId);
            showToast('File deleted successfully', 'success');
          } catch (error: any) {
            showToast('Failed to delete file', 'error');
          }
        },
      },
    ]);
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

  // Filter data based on current classes
  const studentClasses = useMemo(() =>
    studentProfile?.class ? studentProfile.class.split(',').map(s => s.trim()) : []
    , [studentProfile?.class]);

  const relevantSessions = useMemo(() =>
    sessions.filter(s => s.classFilter && studentClasses.includes(s.classFilter))
    , [sessions, studentClasses]);

  const relevantSessionIds = useMemo(() => new Set(relevantSessions.map(s => s.id)), [relevantSessions]);

  const studentRecords = useMemo(() =>
    records.filter((r) => r.studentId === user?.id && relevantSessionIds.has(r.sessionId))
    , [records, user?.id, relevantSessionIds]);

  const totalSessionsCount = relevantSessions.length;
  const presentCount = studentRecords.length;
  const absentCount = totalSessionsCount - presentCount;

  const presentSessionIds = useMemo(() => new Set(studentRecords.map(r => r.sessionId)), [studentRecords]);

  const statsModalData = useMemo(() => {
    switch (statsModalType) {
      case 'present':
        return relevantSessions.filter(s => presentSessionIds.has(s.id));
      case 'absent':
        return relevantSessions.filter(s => !presentSessionIds.has(s.id));
      default:
        return relevantSessions;
    }
  }, [statsModalType, relevantSessions, presentSessionIds]);

  if (!user || !studentProfile) return null;

  if (!studentProfile.isApproved) {
    return (
      <Screen role="student">
        <View style={styles.pendingContainer}>
          <View style={styles.pendingCard}>
            <MaterialIcons name="pending" size={80} color={colors.student.primary} />
            <Text style={styles.pendingTitle}>Account Pending Approval</Text>
            <Text style={styles.pendingDesc}>
              Hello {studentProfile.name}, your account is currently being reviewed by our staff.
              You will be granted full access once verified.
            </Text>
            <View style={styles.pendingInfoRow}>
              <MaterialIcons name="info-outline" size={20} color={colors.student.textSecondary} />
              <Text style={styles.pendingInfoText}>This measure ensures the integrity of our attendance system.</Text>
            </View>
            <Button
              title="Refresh Status"
              onPress={handleRefresh}
              loading={refreshing}
              role="student"
              style={{ width: '100%', marginBottom: spacing.md }}
            />
            <Button
              title="Logout"
              onPress={handleLogout}
              variant="secondary"
              role="student"
              style={{ width: '100%' }}
            />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      role="student"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.container}>
        {/* Header Card */}
        <LinearGradient
          colors={colors.student.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerCard}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {studentProfile?.name?.charAt(0).toUpperCase() || 'S'}
                </Text>
              </View>
              <View style={styles.headerInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{studentProfile?.name}</Text>
                  <Pressable
                    onPress={() => setShowEditModal(true)}
                    style={styles.editProfileButton}
                  >
                    <MaterialIcons name="edit" size={16} color={colors.common.white} />
                  </Pressable>
                </View>
                <Text style={styles.greeting}>Welcome back, student</Text>
                <View style={styles.badgeContainer}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{studentProfile?.class || 'No Class'}</Text>
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{studentProfile?.year || 'No Year'}</Text>
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Roll: {studentProfile?.rollNumber}</Text>
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>System: {studentProfile?.systemNumber || 'N/A'}</Text>
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => router.push('/notifications')}
                style={styles.notificationIcon}
                hitSlop={8}
              >
                <MaterialIcons name="notifications" size={24} color={colors.common.white} />
                {unreadCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </Pressable>
              <Pressable onPress={handleLogout} style={styles.logoutButton} hitSlop={8}>
                <MaterialIcons name="logout" size={24} color={colors.common.white} />
              </Pressable>
            </View>
          </View>
        </LinearGradient>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Pressable
            onPress={() => router.push('/qr-scanner')}
            style={({ pressed }) => [
              styles.scanCard,
              { backgroundColor: colors.common.white },
              pressed && styles.pressed,
            ]}
          >
            <LinearGradient
              colors={['#3B82F6', '#2563EB'] as const}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.scanIconContainer}
            >
              <MaterialIcons name="qr-code-scanner" size={32} color={colors.common.white} />
            </LinearGradient>
            <View style={styles.scanTextContainer}>
              <Text style={[styles.scanTitle, { color: colors.student.text }]}>
                Scan QR Code
              </Text>
              <Text style={[styles.scanDesc, { color: colors.student.textSecondary }]}>
                Mark attendance now
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={28} color={colors.student.primary} />
          </Pressable>
        </View>

        {/* Attendance Overview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="insert-chart" size={24} color={colors.student.primary} />
            <Text style={[styles.sectionTitle, { color: colors.student.text }]}>
              Attendance Overview
            </Text>
          </View>
          <AttendanceStats
            totalSessions={totalSessionsCount}
            presentCount={presentCount}
            absentCount={absentCount}
            role="student"
            onPressStat={(type) => {
              setStatsModalType(type);
              setShowStatsModal(true);
            }}
          />
        </View>

        {/* Upload Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="cloud-upload" size={24} color={colors.student.primary} />
            <Text style={[styles.sectionTitle, { color: colors.student.text }]}>
              Upload Documents
            </Text>
          </View>
          <StaffSelector
            onSelect={setSelectedStaff}
            selectedStaffId={selectedStaff?.id || null}
          />
          {!selectedStaff && (
            <View style={styles.infoBox}>
              <MaterialIcons name="info-outline" size={20} color={colors.student.primary} />
              <Text style={[styles.infoText, { color: colors.student.textSecondary }]}>
                Please select a staff member above to upload files
              </Text>
            </View>
          )}
          <FileUploader onUpload={handleUpload} role="student" disabled={!selectedStaff} />
        </View>

        {/* Files Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="folder" size={24} color={colors.student.primary} />
            <Text style={[styles.sectionTitle, { color: colors.student.text }]}>
              My Uploads
            </Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{files.length}</Text>
            </View>
          </View>
          <FileList files={files} role="student" onDelete={handleDelete} />
        </View>
      </View>

      {/* Attendance Stats Detail Modal */}
      <Modal
        visible={showStatsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStatsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.common.white }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.student.text }]}>
                  {statsModalType.charAt(0).toUpperCase() + statsModalType.slice(1)} Sessions
                </Text>
                <Text style={{ color: colors.student.textSecondary, fontSize: 13, marginTop: 2 }}>
                  {statsModalData.length} sessions found
                </Text>
              </View>
              <Pressable onPress={() => setShowStatsModal(false)} hitSlop={8}>
                <MaterialIcons name="close" size={24} color={colors.student.text} />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <FlatList
                data={statsModalData}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 500 }}
                renderItem={({ item }) => {
                  const isPresent = presentSessionIds.has(item.id);
                  return (
                    <View style={[styles.sessionItem, { borderColor: colors.common.gray100 }]}>
                      <View style={[styles.sessionIcon, { backgroundColor: isPresent ? '#ECFDF5' : '#FEF2F2' }]}>
                        <MaterialIcons
                          name={isPresent ? "check-circle" : "cancel"}
                          size={24}
                          color={isPresent ? "#10B981" : "#EF4444"}
                        />
                      </View>
                      <View style={{ flex: 1, marginLeft: spacing.md }}>
                        <Text style={[styles.sessionName, { color: colors.student.text }]}>
                          {item.sessionName}
                        </Text>
                        <Text style={{ color: colors.student.textSecondary, fontSize: 12 }}>
                          {item.date} • {item.time}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: isPresent ? '#ECFDF5' : '#FEF2F2' }]}>
                        <Text style={[styles.statusText, { color: isPresent ? "#10B981" : "#EF4444" }]}>
                          {isPresent ? 'Present' : 'Absent'}
                        </Text>
                      </View>
                    </View>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <MaterialIcons name="event-busy" size={48} color={colors.common.gray300} />
                    <Text style={[styles.emptyText, { marginTop: spacing.md }]}>No sessions found in this category</Text>
                  </View>
                }
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.common.white }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.student.text }]}>
                Update Year & Classes
              </Text>
              <Pressable onPress={() => {
                setShowEditModal(false);
                setShowYearPicker(false);
              }} hitSlop={8}>
                <MaterialIcons name="close" size={24} color={colors.student.text} />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              {showYearPicker ? (
                <>
                  <Text style={styles.label}>Select Your Year</Text>
                  {DEFAULT_YEARS.map(y => {
                    const isSelected = editYear === y;
                    return (
                      <Pressable
                        key={y}
                        onPress={() => handleYearSelect(y)}
                        style={[
                          styles.yearItem,
                          {
                            backgroundColor: isSelected ? colors.student.surfaceLight : colors.common.white,
                            borderColor: isSelected ? colors.student.primary : colors.common.gray200,
                          }
                        ]}
                      >
                        <Text style={[styles.yearText, { color: isSelected ? colors.student.primary : colors.student.text }]}>
                          {y}
                        </Text>
                        {isSelected && (
                          <MaterialIcons name="check-circle" size={20} color={colors.student.primary} />
                        )}
                      </Pressable>
                    );
                  })}
                  <Button
                    title="Back"
                    onPress={() => setShowYearPicker(false)}
                    variant="secondary"
                    role="student"
                    style={{ marginTop: spacing.md }}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.label}>Academic Year</Text>
                  <Pressable
                    onPress={() => setShowYearPicker(true)}
                    style={styles.pickerTrigger}
                  >
                    <Text style={styles.pickerTriggerText}>{editYear || 'Select Year'}</Text>
                    <MaterialIcons name="arrow-drop-down" size={24} color={colors.student.textSecondary} />
                  </Pressable>

                  <Input
                    label="System Number"
                    value={editSystemNumber}
                    onChangeText={setEditSystemNumber}
                    placeholder="e.g., SYS-01"
                    role="student"
                  />

                  <Text style={[styles.label, { marginTop: spacing.lg }]}>
                    Your Classes ({editYear})
                  </Text>
                  {filteredClasses.length === 0 ? (
                    <Text style={styles.emptyText}>No classes found for this year. Please select year first.</Text>
                  ) : (
                    <FlatList
                      data={filteredClasses}
                      extraData={editClasses}
                      keyExtractor={(item) => item.id}
                      style={{ maxHeight: 300 }}
                      renderItem={({ item }) => {
                        const isSelected = editClasses.includes(item.className);
                        return (
                          <Pressable
                            onPress={() => handleClassSelect(item.className)}
                            style={[
                              styles.classItem,
                              {
                                backgroundColor: isSelected ? colors.student.surfaceLight : colors.common.white,
                                borderColor: isSelected ? colors.student.primary : colors.common.gray200,
                              }
                            ]}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.className, { color: colors.student.text }]}>{item.className}</Text>
                              <Text style={styles.classDesc}>{item.description}</Text>
                            </View>
                            {isSelected && (
                              <MaterialIcons name="check-circle" size={20} color={colors.student.primary} />
                            )}
                          </Pressable>
                        );
                      }}
                    />
                  )}

                  <View style={styles.modalFooter}>
                    <Button
                      title="Cancel"
                      onPress={() => setShowEditModal(false)}
                      variant="secondary"
                      role="student"
                      style={{ flex: 1 }}
                    />
                    <Button
                      title="Update Profile"
                      onPress={handleSaveProfile}
                      loading={updating}
                      role="student"
                      style={{ flex: 2 }}
                    />
                  </View>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  headerCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.lg,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.common.white,
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.common.white,
  },
  editProfileButton: {
    padding: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.common.white,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#3B82F6', // Border color matching gradient
  },
  notificationBadgeText: {
    color: colors.common.white,
    fontSize: 10,
    fontWeight: '700',
  },
  quickActions: {
    marginBottom: spacing.lg,
  },
  scanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    ...shadows.md,
  },
  scanIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanTextContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  scanTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scanDesc: {
    fontSize: 14,
    marginTop: 2,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  countBadge: {
    backgroundColor: colors.student.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    minWidth: 28,
    alignItems: 'center',
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.common.white,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.student.surfaceLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '85%',
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
    paddingBottom: spacing.xl,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.common.gray600,
    marginBottom: spacing.xs,
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.common.gray50,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.common.gray200,
  },
  pickerTriggerText: {
    fontSize: 16,
    color: colors.common.gray800,
  },
  yearItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  yearText: {
    fontSize: 16,
    fontWeight: '600',
  },
  classItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  className: {
    fontSize: 16,
    fontWeight: '600',
  },
  classDesc: {
    fontSize: 12,
    color: colors.common.gray500,
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.common.gray400,
    marginTop: spacing.xl,
    fontSize: 14,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  sessionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionName: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pendingContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.common.gray50,
  },
  pendingCard: {
    backgroundColor: colors.common.white,
    padding: spacing.xxl,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    ...shadows.lg,
  },
  pendingTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.student.text,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  pendingDesc: {
    fontSize: 15,
    color: colors.student.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 22,
  },
  pendingInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.student.surfaceLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginVertical: spacing.xl,
  },
  pendingInfoText: {
    flex: 1,
    fontSize: 13,
    color: colors.student.textSecondary,
    lineHeight: 18,
  },
});
