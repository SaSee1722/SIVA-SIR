import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { Screen } from '@/components/layout/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { colors, typography, spacing } from '@/constants/theme';
import { useAlert } from '@/template';

export default function StaffLoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const { showAlert } = useAlert();

  const handleLogin = async () => {
    if (!email || !password) {
      showAlert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      router.replace('/staff-dashboard');
    } catch (error: any) {
      showAlert('Login Failed', error.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen role="staff" scrollable={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.content}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={24} color={colors.staff.text} />
          </Pressable>

          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: colors.staff.surfaceLight }]}>
              <MaterialIcons name="work" size={48} color={colors.staff.primary} />
            </View>
            <Text style={[styles.title, { color: colors.staff.text }]}>Staff Login</Text>
            <Text style={[styles.subtitle, { color: colors.staff.textSecondary }]}>
              Access your dashboard
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="staff@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              role="staff"
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
              role="staff"
            />

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              role="staff"
              style={{ marginTop: spacing.md }}
            />

            <Pressable
              onPress={() => router.push('/staff-signup')}
              style={styles.linkButton}
            >
              <Text style={[styles.linkText, { color: colors.staff.textSecondary }]}>
                Do not have an account?{' '}
                <Text style={{ color: colors.staff.primary, fontWeight: '600' }}>
                  Sign Up
                </Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
  },
  backButton: {
    marginBottom: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
  },
  subtitle: {
    ...typography.bodySmall,
    marginTop: spacing.xs,
  },
  form: {
    flex: 1,
  },
  linkButton: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  linkText: {
    ...typography.bodySmall,
  },
});
