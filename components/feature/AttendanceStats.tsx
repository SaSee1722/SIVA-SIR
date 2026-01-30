import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, spacing, shadows } from '@/constants/theme';

interface AttendanceStatsProps {
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  role?: 'student' | 'staff';
  onPressStat?: (type: 'total' | 'present' | 'absent') => void;
}

export function AttendanceStats({
  totalSessions,
  presentCount,
  absentCount,
  role = 'student',
  onPressStat,
}: AttendanceStatsProps) {
  const theme = role === 'student' ? colors.student : colors.staff;
  const attendanceRate = totalSessions > 0 ? (presentCount / totalSessions) * 100 : 0;

  const stats = [
    { label: 'Total', value: totalSessions, icon: 'event-note', gradient: ['#60A5FA', '#3B82F6'] as const, type: 'total' as const },
    { label: 'Present', value: presentCount, icon: 'check-circle', gradient: ['#34D399', '#10B981'] as const, type: 'present' as const },
    { label: 'Absent', value: absentCount, icon: 'cancel', gradient: ['#F87171', '#EF4444'] as const, type: 'absent' as const },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={theme.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.rateCard}
      >
        <MaterialIcons name="show-chart" size={32} color={colors.common.white} />
        <Text style={styles.rateValue}>{attendanceRate.toFixed(1)}%</Text>
        <Text style={styles.rateLabel}>Attendance Rate</Text>
      </LinearGradient>

      <View style={styles.statsRow}>
        {stats.map((stat) => (
          <Pressable
            key={stat.label}
            onPress={() => onPressStat?.(stat.type)}
            style={({ pressed }) => [
              styles.statCard,
              { backgroundColor: colors.common.white },
              shadows.sm,
              pressed && styles.pressedCard
            ]}
          >
            <LinearGradient
              colors={stat.gradient}
              style={styles.iconCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialIcons name={stat.icon as any} size={24} color={colors.common.white} />
            </LinearGradient>
            <Text style={[styles.statValue, { color: theme.text }]}>{stat.value}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
              {stat.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  rateCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    ...shadows.lg,
  },
  rateValue: {
    fontSize: 56,
    fontWeight: '800',
    color: colors.common.white,
    marginTop: spacing.xs,
    letterSpacing: -2,
  },
  rateLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginTop: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  pressedCard: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
});
