import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, RefreshControl, Modal, FlatList, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
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
import { authService } from '@/services/authService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import * as FileSystem from 'expo-file-system';

export default function StudentDashboardScreen() {
  const { user, logout, updateProfile, refreshUser } = useAuth();
  const studentProfile = user as StudentProfile;
  const { files, isLoading: filesLoading, uploadFile, deleteFile, refresh: refreshFiles } = useFiles(user?.id);
  const { records, sessions, isLoading: attendanceLoading, refresh: refreshAttendance } = useAttendance();
  const { unreadCount, refresh: refreshNotifications } = useNotifications(user?.id);
  const router = useRouter();
  const { showAlert } = useAlert();
  const { showToast } = useToast();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'classes' | 'upload'>('home');

  // Edit Profile States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editYear, setEditYear] = useState('');
  const [editClasses, setEditClasses] = useState<string[]>([]);
  const [availableClasses, setAvailableClasses] = useState<Class[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<Class[]>([]);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [editSystemNumber, setEditSystemNumber] = useState('');
  const [updating, setUpdating] = useState(false);
  const [editDepartment, setEditDepartment] = useState('');
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);

  // Stats Detail States
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [statsModalType, setStatsModalType] = useState<'total' | 'present' | 'absent'>('total');

  const DEFAULT_YEARS = useMemo(() => ['I YEAR', 'II YEAR', 'III YEAR', 'IV YEAR'], []);
  const DEPARTMENTS = useMemo(() => ['CSE', 'EEE', 'ECE', 'IT', 'MECH', 'CIVIL'], []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refreshUser(),
      refreshFiles(),
      refreshAttendance(),
      refreshNotifications()
    ]);
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

  // Refresh notifications when dashboard comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        refreshNotifications();
      }
    }, [user?.id, refreshNotifications])
  );

  useEffect(() => {
    if (showEditModal) {
      loadAllClasses();
      setEditYear(studentProfile?.year || '');
      // Initialize with both approved and pending classes
      const approved = studentProfile?.class ? studentProfile.class.split(',').map(s => s.trim()) : [];
      const pending = studentProfile?.pendingClasses ? studentProfile.pendingClasses.split(',').map(s => s.trim()) : [];
      setEditClasses([...new Set([...approved, ...pending])]);
      setEditSystemNumber(studentProfile?.systemNumber || '');
      setEditDepartment(studentProfile?.department || '');
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
    if (!editYear || editClasses.length === 0 || !editSystemNumber || !editDepartment) {
      showAlert('Error', 'Please select year, department, at least one class, and enter system number');
      return;
    }

    setUpdating(true);
    try {
      const approvedClasses = studentProfile?.class ? studentProfile.class.split(',').map(s => s.trim()) : [];
      // New pending are those in editClasses but NOT in approvedClasses
      const newPendingClasses = editClasses.filter(c => !approvedClasses.includes(c));

      // Check if anything actually changed
      const currentPendingClasses = studentProfile?.pendingClasses ? studentProfile.pendingClasses.split(',').map(s => s.trim()) : [];
      const isYearChanged = editYear !== studentProfile?.year;
      const isSystemChanged = editSystemNumber !== studentProfile?.systemNumber;
      const isDepartmentChanged = editDepartment !== studentProfile?.department;
      const isPendingChanged = JSON.stringify(newPendingClasses.sort()) !== JSON.stringify(currentPendingClasses.sort());

      if (!isYearChanged && !isSystemChanged && !isPendingChanged && !isDepartmentChanged) {
        showToast('No changes detected', 'info');
        setShowEditModal(false);
        setUpdating(false);
        return;
      }

      await updateProfile({
        year: editYear,
        pendingClasses: newPendingClasses.join(', '),
        systemNumber: editSystemNumber,
        department: editDepartment,
      });
      setShowEditModal(false);
      setShowYearPicker(false);
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

      const uploadedFile = await uploadFile({
        studentId: user!.id,
        studentName: user!.name,
        recipientId: selectedStaff?.id,
        recipientName: selectedStaff?.name,
        fileName: file.fileName,
        fileType: file.fileType,
        fileSize: file.fileSize,
        base64Data: finalBase64,
      });

      // Send notification to staff
      try {
        await notificationService.sendNotification(
          selectedStaff.id,
          'New File Received',
          `${user?.name} shared a file: ${file.fileName}`,
          'general',
          { fileId: uploadedFile.id, studentId: user?.id }
        );

        // Fetch staff profile to get push token
        const staffProfile = await authService.getUserProfile(selectedStaff.id);
        if (staffProfile?.deviceId) { // deviceId is used for push token in some places, but push_token column exists
          // Assuming push_token column is available on profile
          const targetToken = (staffProfile as any).push_token;
          if (targetToken) {
            await notificationService.sendPushNotification(
              [targetToken],
              'New File Received',
              `${user?.name} shared a file: ${file.fileName}`,
              { screen: 'staff-dashboard', fileId: uploadedFile.id }
            );
          }
        }
      } catch (notifErr) {
        console.error('Failed to send notification to staff:', notifErr);
      }

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

  const isInitialLoading = (filesLoading || attendanceLoading) && !refreshing;

  return (
    <Screen
      role="student"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.student.primary}
          colors={[colors.student.primary]}
        />
      }
    >
      {isInitialLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.student.primary} />
        </View>
      ) : (
        <>
          <View style={styles.container}>
            {/* Header Card */}
            <LinearGradient
              colors={colors.student.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerCard}
            >
              <View style={styles.headerTop}>
                <View style={styles.profileBasicInfo}>
                  <View style={styles.nameContainer}>
                    <Text style={styles.studentNameText} numberOfLines={2}>{studentProfile?.name}</Text>
                    <Text style={styles.roleSubtitle}>
                      Student Profile • {studentProfile?.year || 'N/A'}
                    </Text>
                  </View>
                </View>
                <View style={styles.headerActionButtons}>
                  <Pressable
                    onPress={() => setShowEditModal(true)}
                    style={styles.actionIconCircle}
                    hitSlop={8}
                  >
                    <MaterialIcons name="edit" size={20} color={colors.common.white} />
                  </Pressable>
                  <Pressable
                    onPress={() => router.push('/notifications')}
                    style={styles.actionIconCircle}
                    hitSlop={8}
                  >
                    <MaterialIcons name="notifications" size={22} color={colors.common.white} />
                    {unreadCount > 0 && (
                      <View style={styles.notifBadgeSmall}>
                        <Text style={styles.notifBadgeTextSmall}>
                          {unreadCount > 9 ? '!' : unreadCount}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                  <Pressable onPress={handleLogout} style={styles.actionIconCircle} hitSlop={8}>
                    <MaterialIcons name="power-settings-new" size={22} color={colors.common.white} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.headerDetailsGrid}>
                <View style={styles.detailItem}>
                  <MaterialIcons name="assignment-ind" size={16} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.detailLabel}>Reg No</Text>
                  <Text style={styles.detailValue}>{studentProfile?.rollNumber}</Text>
                </View>
                <View style={styles.dividerVertical} />
                <View style={styles.detailItem}>
                  <MaterialIcons name="business" size={16} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.detailLabel}>Dept</Text>
                  <Text style={styles.detailValue}>{studentProfile?.department || 'N/A'}</Text>
                </View>
                <View style={styles.dividerVertical} />
                <View style={styles.detailItem}>
                  <MaterialIcons name="computer" size={16} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.detailLabel}>System</Text>
                  <Text style={styles.detailValue}>{studentProfile?.systemNumber || 'N/A'}</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Premium Tab Bar */}
            <View style={styles.tabBarContainer}>
              <Pressable
                onPress={() => setActiveTab('home')}
                style={[styles.tabItem, activeTab === 'home' && styles.activeTabItem]}
              >
                <MaterialIcons
                  name="dashboard"
                  size={24}
                  color={activeTab === 'home' ? colors.student.primary : colors.common.gray400}
                />
                <Text style={[styles.tabLabel, activeTab === 'home' && styles.activeTabLabel]}>Overview</Text>
                {activeTab === 'home' && <View style={styles.activeTabIndicator} />}
              </Pressable>

              <Pressable
                onPress={() => setActiveTab('classes')}
                style={[styles.tabItem, activeTab === 'classes' && styles.activeTabItem]}
              >
                <MaterialIcons
                  name="class"
                  size={24}
                  color={activeTab === 'classes' ? colors.student.primary : colors.common.gray400}
                />
                <Text style={[styles.tabLabel, activeTab === 'classes' && styles.activeTabLabel]}>Classes</Text>
                {activeTab === 'classes' && <View style={styles.activeTabIndicator} />}
              </Pressable>

              <Pressable
                onPress={() => setActiveTab('upload')}
                style={[styles.tabItem, activeTab === 'upload' && styles.activeTabItem]}
              >
                <MaterialIcons
                  name="cloud-upload"
                  size={24}
                  color={activeTab === 'upload' ? colors.student.primary : colors.common.gray400}
                />
                <Text style={[styles.tabLabel, activeTab === 'upload' && styles.activeTabLabel]}>Documents</Text>
                {activeTab === 'upload' && <View style={styles.activeTabIndicator} />}
              </Pressable>
            </View>

            {/* Tab Content */}
            {activeTab === 'home' && (
              <View>
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
              </View>
            )}

            {activeTab === 'classes' && (
              <View>
                {/* Class Enrollment Status Section */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <MaterialIcons name="bookmarks" size={22} color={colors.student.primary} />
                    <Text style={[styles.sectionTitle, { color: colors.student.text }]}>My Classes</Text>
                  </View>

                  <View style={styles.classesContainer}>
                    {studentProfile?.class ? (
                      <View style={styles.premiumClassCard}>
                        <View style={styles.classCardDecoration} />
                        <View style={styles.classCardContent}>
                          <View style={styles.classIconMain}>
                            <MaterialIcons name="verified" size={24} color={colors.student.primary} />
                          </View>
                          <View style={styles.classTextInfo}>
                            <Text style={styles.classLabelSmall}>ENROLLED CLASS</Text>
                            <Text style={styles.classNameLarge}>{studentProfile.class}</Text>
                          </View>
                          <View style={styles.activeBadgePremium}>
                            <View style={styles.pulseDot} />
                            <Text style={styles.activeBadgeText}>Active</Text>
                          </View>
                        </View>
                      </View>
                    ) : null}

                    {studentProfile?.pendingClasses ? (
                      <View style={[styles.premiumClassCard, { borderLeftColor: '#F59E0B' }]}>
                        <View style={[styles.classCardDecoration, { backgroundColor: '#FEF3C7' }]} />
                        <View style={styles.classCardContent}>
                          <View style={[styles.classIconMain, { backgroundColor: '#FEF3C7' }]}>
                            <MaterialIcons name="history" size={24} color="#D97706" />
                          </View>
                          <View style={styles.classTextInfo}>
                            <Text style={[styles.classLabelSmall, { color: '#B45309' }]}>PENDING APPROVAL</Text>
                            <Text style={styles.classNameLarge}>{studentProfile.pendingClasses}</Text>
                          </View>
                          <View style={styles.pendingBadgePremium}>
                            <Text style={styles.pendingBadgeText}>Waiting</Text>
                          </View>
                        </View>
                      </View>
                    ) : null}

                    {!studentProfile?.class && !studentProfile?.pendingClasses && (
                      <View style={styles.emptyClassState}>
                        <MaterialIcons name="class" size={40} color={colors.student.border} />
                        <Text style={[styles.emptyClassText, { color: colors.student.textSecondary }]}>
                          You haven't joined any classes yet.
                        </Text>
                        <Pressable onPress={() => setShowEditModal(true)}>
                          <Text style={{ color: colors.student.primary, fontWeight: '600', marginTop: 8 }}>
                            Join a Class
                          </Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            )}

            {activeTab === 'upload' && (
              <View>
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
                    department={studentProfile?.department}
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
            )}
          </View>

          {/* Department Picker Modal */}
          <Modal
            visible={showDepartmentPicker}
            transparent
            animationType="fade"
            onRequestClose={() => setShowDepartmentPicker(false)}
          >
            <Pressable
              style={styles.modalOverlay}
              onPress={() => setShowDepartmentPicker(false)}
            >
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerTitle}>Select Department</Text>
                {DEPARTMENTS.map((dept) => (
                  <Pressable
                    key={dept}
                    style={styles.pickerOption}
                    onPress={() => {
                      setEditDepartment(dept);
                      setShowDepartmentPicker(false);
                    }}
                  >
                    <Text style={[
                      styles.pickerOptionText,
                      editDepartment === dept && styles.pickerOptionActive
                    ]}>
                      {dept}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Pressable>
          </Modal>

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

          {/* Year Picker Modal (moved from Edit Profile Modal) */}
          <Modal
            visible={showYearPicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowYearPicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: colors.common.white }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.student.text }]}>
                    Select Your Year
                  </Text>
                  <Pressable onPress={() => setShowYearPicker(false)} hitSlop={8}>
                    <MaterialIcons name="close" size={24} color={colors.student.text} />
                  </Pressable>
                </View>
                <View style={styles.modalBody}>
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
                    Update Profile
                  </Text>
                  <Pressable onPress={() => {
                    setShowEditModal(false);
                    setShowYearPicker(false);
                  }} hitSlop={8}>
                    <MaterialIcons name="close" size={24} color={colors.student.text} />
                  </Pressable>
                </View>

                <View style={styles.modalBody}>
                  <Pressable onPress={() => setShowYearPicker(true)}>
                    <View pointerEvents="none">
                      <Input
                        label="Academic Year"
                        value={editYear}
                        placeholder="Select Year"
                        editable={false}
                        role="student"
                      />
                    </View>
                  </Pressable>

                  <Input
                    label="Department"
                    value={editDepartment}
                    onChangeText={setEditDepartment}
                    placeholder="e.g., CSE"
                    role="student"
                    style={{ marginTop: spacing.md }}
                    autoCapitalize="characters"
                  />

                  <Input
                    label="System Number"
                    value={editSystemNumber}
                    onChangeText={setEditSystemNumber}
                    placeholder="e.g., SYS-25"
                    role="student"
                    style={{ marginTop: spacing.md }}
                  />

                  <Text style={[styles.label, { marginTop: spacing.lg, marginBottom: spacing.xs }]}>
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
                        const isApproved = studentProfile?.class?.split(',').map(s => s.trim()).includes(item.className);

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
                              <View style={styles.nameRow}>
                                <Text style={[styles.className, { color: colors.student.text }]}>{item.className}</Text>
                                {isApproved && (
                                  <View style={styles.approvedBadgeSmall}>
                                    <Text style={styles.approvedBadgeTextSmall}>Already Enrolled</Text>
                                  </View>
                                )}
                              </View>
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
                </View>
              </View>
            </View>
          </Modal>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  headerCard: {
    padding: spacing.xl,
    paddingBottom: spacing.lg,
    borderRadius: 30,
    marginBottom: spacing.lg,
    ...shadows.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  profileBasicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  nameContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentNameText: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.common.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginRight: spacing.xs,
  },
  editIconSmall: {
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
  },
  roleSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    marginTop: 2,
  },
  headerActionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  notifBadgeSmall: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  notifBadgeTextSmall: {
    color: colors.common.white,
    fontSize: 10,
    fontWeight: '900',
  },
  headerDetailsGrid: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    padding: spacing.md,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  detailValue: {
    fontSize: 13,
    color: colors.common.white,
    fontWeight: '700',
    marginTop: 2,
  },
  dividerVertical: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  classesContainer: {
    gap: spacing.md,
  },
  premiumClassCard: {
    backgroundColor: colors.common.white,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.common.gray100,
    ...shadows.md,
  },
  classCardDecoration: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: '#3B82F6',
  },
  classCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    paddingLeft: spacing.xl,
  },
  classIconMain: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  classTextInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  classLabelSmall: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.student.primary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  classNameLarge: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.common.gray900,
  },
  activeBadgePremium: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DEF7EC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
    marginRight: 6,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#046C4E',
  },
  pendingBadgePremium: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pendingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  quickActions: {
    marginTop: spacing.sm,
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
    gap: spacing.sm,
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
  emptyClassState: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.common.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.common.gray100,
    ...shadows.sm,
  },
  emptyClassText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.sm,
    color: colors.common.gray500,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  card: {
    borderRadius: borderRadius.xl,
    ...shadows.md,
  },
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: colors.common.white,
    padding: spacing.xs,
    borderRadius: 20,
    marginBottom: spacing.lg,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.common.gray100,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
    borderRadius: 16,
    position: 'relative',
  },
  activeTabItem: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.common.gray500,
  },
  activeTabLabel: {
    color: colors.student.primary,
    fontWeight: '700',
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 6,
    width: 20,
    height: 3,
    backgroundColor: colors.student.primary,
    borderRadius: 2,
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
  },
  approvedBadgeSmall: {
    backgroundColor: '#DEF7EC',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: spacing.sm,
  },
  approvedBadgeTextSmall: {
    fontSize: 10,
    fontWeight: '700',
    color: '#046C4E',
  },
  pickerContainer: {
    backgroundColor: colors.common.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  pickerTitle: {
    ...typography.h3,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  pickerOption: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.common.gray100,
  },
  pickerOptionText: {
    ...typography.body,
    textAlign: 'center',
    color: colors.common.gray700,
  },
  pickerOptionActive: {
    color: colors.student.primary,
    fontWeight: '700',
  },
});
