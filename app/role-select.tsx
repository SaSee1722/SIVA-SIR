import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, borderRadius, spacing, shadows } from '@/constants/theme';

export default function RoleSelectScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#3B82F6', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <LinearGradient
                  colors={[colors.common.white, '#F0F9FF']}
                  style={styles.logoCircle}
                >
                  <Image
                    source={require('@/assets/images/logo.png')}
                    style={{ width: 70, height: 70 }}
                    resizeMode="contain"
                  />
                </LinearGradient>
              </View>
              <Text style={styles.title}>EduPortal</Text>
              <Text style={styles.subtitle}>Smart Education Management</Text>
            </View>

            <View style={styles.cardsContainer}>
              <Pressable
                onPress={() => router.push('/student-login')}
                style={({ pressed }) => [styles.roleCard, pressed && styles.pressed]}
              >
                <LinearGradient
                  colors={['#FFFFFF', '#EFF6FF']}
                  style={styles.cardGradient}
                >
                  <View style={[styles.iconCircle, { backgroundColor: '#DBEAFE' }]}>
                    <MaterialIcons name="person" size={40} color={colors.student.primary} />
                  </View>
                  <Text style={[styles.roleTitle, { color: colors.student.primary }]}>
                    Student Portal
                  </Text>
                  <Text style={styles.roleDesc}>Upload documents and mark attendance</Text>
                  <View style={styles.arrowContainer}>
                    <MaterialIcons name="arrow-forward" size={24} color={colors.student.primary} />
                  </View>
                </LinearGradient>
              </Pressable>

              <Pressable
                onPress={() => router.push('/staff-login')}
                style={({ pressed }) => [styles.roleCard, pressed && styles.pressed]}
              >
                <LinearGradient
                  colors={['#FFFFFF', '#F5F3FF']}
                  style={styles.cardGradient}
                >
                  <View style={[styles.iconCircle, { backgroundColor: '#EDE9FE' }]}>
                    <MaterialIcons name="work" size={40} color={colors.staff.primary} />
                  </View>
                  <Text style={[styles.roleTitle, { color: colors.staff.primary }]}>
                    Staff Portal
                  </Text>
                  <Text style={styles.roleDesc}>Manage students and track attendance</Text>
                  <View style={styles.arrowContainer}>
                    <MaterialIcons name="arrow-forward" size={24} color={colors.staff.primary} />
                  </View>
                </LinearGradient>
              </Pressable>
            </View>

            <View style={styles.footer}>
              <MaterialIcons name="verified-user" size={16} color="rgba(255,255,255,0.7)" />
              <Text style={styles.footerText}>Secure • Fast • Reliable</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  logoContainer: {
    marginBottom: spacing.lg,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.xl,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: colors.common.white,
    marginBottom: spacing.xs,
    letterSpacing: -1,
  },
  subtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  cardsContainer: {
    gap: spacing.lg,
  },
  roleCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.xl,
  },
  cardGradient: {
    padding: spacing.xl,
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  roleTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  roleDesc: {
    ...typography.body,
    color: colors.common.gray600,
    marginBottom: spacing.md,
  },
  arrowContainer: {
    alignSelf: 'flex-end',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
  },
  footerText: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
