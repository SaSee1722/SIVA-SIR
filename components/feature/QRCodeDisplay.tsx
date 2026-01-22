import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors, typography, borderRadius, spacing } from '@/constants/theme';

interface QRCodeDisplayProps {
  value: string;
  sessionName: string;
  time: string;
  role?: 'student' | 'staff';
}

export function QRCodeDisplay({ value, sessionName, time, role = 'staff' }: QRCodeDisplayProps) {
  const theme = role === 'student' ? colors.student : colors.staff;

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.header}>
        <Text style={[styles.sessionName, { color: theme.text }]}>{sessionName}</Text>
        <Text style={[styles.time, { color: theme.textSecondary }]}>{time}</Text>
      </View>

      <View style={styles.qrContainer}>
        <QRCode value={value} size={220} backgroundColor={colors.common.white} />
      </View>

      <Text style={[styles.instruction, { color: theme.textSecondary }]}>
        Students scan this code to mark attendance
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sessionName: {
    ...typography.h2,
    textAlign: 'center',
  },
  time: {
    ...typography.bodySmall,
    marginTop: spacing.xs,
  },
  qrContainer: {
    padding: spacing.lg,
    backgroundColor: colors.common.white,
    borderRadius: borderRadius.md,
  },
  instruction: {
    ...typography.bodySmall,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
