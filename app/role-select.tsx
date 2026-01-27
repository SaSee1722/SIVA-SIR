import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Modal, TextInput, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, borderRadius, spacing, shadows } from '@/constants/theme';

export default function RoleSelectScreen() {
  const router = useRouter();
  const [showStaffKeyModal, setShowStaffKeyModal] = useState(false);
  const [accessKey, setAccessKey] = useState('');

  const handleStaffPortalAccess = () => {
    const correctKey = process.env.EXPO_PUBLIC_STAFF_ACCESS_KEY;
    if (accessKey === correctKey) {
      setShowStaffKeyModal(false);
      setAccessKey('');
      router.push('/staff-login');
    } else {
      Alert.alert('Access Denied', 'Invalid Staff Access Key');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#3B82F6', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>
              <View style={styles.header}>
                <View style={styles.logoContainer}>
                  <LinearGradient
                    colors={[colors.common.white, '#F0F9FF']}
                    style={styles.logoCircle}
                  >
                    <Image
                      source={require('@/assets/images/logo.png')}
                      style={{ width: 68, height: 68 }}
                      resizeMode="contain"
                    />
                  </LinearGradient>
                </View>
                <View style={styles.textGroup}>
                  <Text style={styles.title}>EduPortal</Text>
                  <View style={styles.divider} />
                  <Text style={styles.subtitle}>SMART EDUCATION MANAGEMENT</Text>
                </View>
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
                  </LinearGradient>
                </Pressable>

                <Pressable
                  onPress={() => setShowStaffKeyModal(true)}
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
                  </LinearGradient>
                </Pressable>
              </View>

              <View style={styles.footer}>
                <MaterialIcons name="verified-user" size={16} color="rgba(255,255,255,0.7)" />
                <Text style={styles.footerText}>Secure • Fast • Reliable</Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      {/* Staff Access Key Modal */}
      <Modal
        visible={showStaffKeyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStaffKeyModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.lockIconContainer}>
                <MaterialIcons name="lock" size={24} color={colors.staff.primary} />
              </View>
              <Text style={styles.modalTitle}>Staff Verification</Text>
              <Text style={styles.modalSubtitle}>Please enter the secret access key to continue to the Staff Portal</Text>
            </View>

            <TextInput
              style={styles.keyInput}
              placeholder="Enter Access Key"
              placeholderTextColor={colors.common.gray400}
              secureTextEntry
              value={accessKey}
              onChangeText={setAccessKey}
              autoCapitalize="characters"
            />

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  setShowStaffKeyModal(false);
                  setAccessKey('');
                }}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleStaffPortalAccess}
                style={styles.confirmButton}
              >
                <Text style={styles.confirmButtonText}>Verify Access</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    justifyContent: 'space-between',
  },
  scrollContent: {
    flexGrow: 1,
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
  textGroup: {
    alignItems: 'center',
  },
  title: {
    fontSize: 40,
    fontWeight: '900',
    color: colors.common.white,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  divider: {
    width: 40,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginVertical: spacing.sm,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 2.5,
  },
  cardsContainer: {
    gap: spacing.lg,
    marginTop: spacing.xl,
  },
  roleCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.xl,
  },
  cardGradient: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
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
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
    paddingBottom: spacing.lg,
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    width: '100%',
    backgroundColor: colors.common.white,
    borderRadius: borderRadius.xxl,
    padding: spacing.xl,
    ...shadows.xl,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  lockIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.staff.primary,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    ...typography.bodySmall,
    color: colors.common.gray600,
    textAlign: 'center',
  },
  keyInput: {
    width: '100%',
    height: 56,
    backgroundColor: colors.common.gray100,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    fontSize: 18,
    fontWeight: '600',
    color: colors.staff.primary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    letterSpacing: 4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    height: 50,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.common.gray300,
  },
  cancelButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.common.gray600,
  },
  confirmButton: {
    flex: 2,
    height: 50,
    backgroundColor: colors.staff.primary,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.common.white,
  },
});
