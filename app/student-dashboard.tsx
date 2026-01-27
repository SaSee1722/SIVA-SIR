import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, RefreshControl } from 'react-native';
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
import { StudentProfile, User } from '@/types';
import { colors, typography, borderRadius, spacing, shadows } from '@/constants/theme';
import { useAlert } from '@/template';
import * as FileSystem from 'expo-file-system';
import { StaffSelector } from '@/components/feature/StaffSelector';

export default function StudentDashboardScreen() {
  const { user, logout } = useAuth();
  const studentProfile = user as StudentProfile;
  const { files, uploadFile, deleteFile, refresh: refreshFiles } = useFiles(user?.id);
  const { records, sessions, refresh: refreshAttendance } = useAttendance();
  const router = useRouter();
  const { showAlert } = useAlert();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<User | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshFiles(), refreshAttendance()]);
    setRefreshing(false);
  };

  const handleUpload = async (file: { fileName: string; fileType: string; fileSize: number; base64Data?: string; uri?: string }) => {
    if (!selectedStaff) {
      showAlert('No Staff Selected', 'Please select a staff member before uploading files');
      return;
    }

    try {
      let finalBase64 = file.base64Data;

      // If we have a URI but no base64Data (common for documents picked via DocumentPicker)
      if (file.uri && !finalBase64) {
        console.log('[Dashboard] Reading file from URI:', file.uri);
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
      console.log('[Dashboard] Upload success for:', file.fileName);
    } catch (error: any) {
      console.error('[Dashboard] Upload error:', error.message);
      showAlert('Error', `Failed to upload ${file.fileName}: ${error.message}`);
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
            showAlert('Success', 'File deleted');
          } catch (error: any) {
            showAlert('Error', 'Failed to delete file');
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

  const studentRecords = records.filter((r) => r.studentId === user?.id);
  const totalSessions = sessions.length;
  const presentCount = studentRecords.length;
  const absentCount = totalSessions - presentCount;

  if (!user || !studentProfile) return null;

  return (
    <Screen role="student" scrollable={false}>
      <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />

      <View style={[styles.container, { flex: 1 }]}>
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
                  {studentProfile.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.headerInfo}>
                <Text style={styles.greeting}>Welcome back,</Text>
                <Text style={styles.name}>{studentProfile.name}</Text>
                <View style={styles.badgeContainer}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{studentProfile.class}</Text>
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Roll: {studentProfile.rollNumber}</Text>
                  </View>
                </View>
              </View>
            </View>
            <Pressable onPress={handleLogout} style={styles.logoutButton} hitSlop={8}>
              <MaterialIcons name="logout" size={24} color={colors.common.white} />
            </Pressable>
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
            totalSessions={totalSessions}
            presentCount={presentCount}
            absentCount={absentCount}
            role="student"
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
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.common.white,
  },
  headerInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.common.white,
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: 12,
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
    width: 64,
    height: 64,
    borderRadius: 32,
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
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
