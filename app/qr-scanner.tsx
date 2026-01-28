import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, Camera } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useAttendance } from '@/hooks/useAttendance';
import { StudentProfile } from '@/types';
import { colors, typography, borderRadius, spacing } from '@/constants/theme';
import { useAlert } from '@/template';

export default function QRScannerScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const { user } = useAuth();
  const { sessions, markAttendance } = useAttendance();
  const router = useRouter();
  const { showAlert } = useAlert();
  const studentProfile = user as StudentProfile;

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    const activeSession = sessions.find(
      (s) => s.qrCode === data && s.isActive
    );

    if (!activeSession) {
      showAlert('Invalid QR Code', 'This QR code is not valid or has expired', [
        { text: 'Scan Again', onPress: () => setScanned(false) },
        { text: 'Close', onPress: () => router.back() },
      ]);
      return;
    }

    try {
      await markAttendance(
        activeSession.id,
        activeSession.sessionName,
        user!.id,
        user!.name,
        studentProfile.rollNumber,
        studentProfile.class,
        studentProfile.systemNumber
      );

      showAlert('Success', 'Attendance marked successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to mark attendance', [
        { text: 'Scan Again', onPress: () => setScanned(false) },
        { text: 'Close', onPress: () => router.back() },
      ]);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.message}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.centerContainer}>
        <MaterialIcons name="camera-alt" size={64} color={colors.common.gray400} />
        <Text style={styles.message}>Camera permission denied</Text>
        <Pressable onPress={() => router.back()} style={styles.button}>
          <Text style={styles.buttonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />

      <View style={styles.overlay}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={8}>
            <MaterialIcons name="close" size={32} color={colors.common.white} />
          </Pressable>
        </View>

        <View style={styles.scanArea}>
          <View style={[styles.corner, styles.cornerTopLeft]} />
          <View style={[styles.corner, styles.cornerTopRight]} />
          <View style={[styles.corner, styles.cornerBottomLeft]} />
          <View style={[styles.corner, styles.cornerBottomRight]} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.instruction}>
            Position the QR code within the frame
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.common.black,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.common.gray50,
    padding: spacing.xl,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  header: {
    padding: spacing.xl,
    paddingTop: spacing.xxl + spacing.lg,
  },
  closeButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    alignSelf: 'center',
    width: 280,
    height: 280,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: colors.common.white,
    borderWidth: 4,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: borderRadius.lg,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: borderRadius.lg,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: borderRadius.lg,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: borderRadius.lg,
  },
  footer: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl + spacing.lg,
    alignItems: 'center',
  },
  instruction: {
    ...typography.body,
    color: colors.common.white,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: colors.common.gray600,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.student.primary,
    borderRadius: borderRadius.md,
  },
  buttonText: {
    ...typography.button,
    color: colors.common.white,
  },
});
