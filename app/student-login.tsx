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

export default function StudentLoginScreen() {
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
      await login(email, password, 'student');
      router.replace('/student-dashboard');
    } catch (error: any) {
      showAlert('Login Failed', error.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen role="student">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.content}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={24} color={colors.student.text} />
          </Pressable>

          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: colors.student.surfaceLight }]}>
              <MaterialIcons name="person" size={48} color={colors.student.primary} />
            </View>
            <Text style={[styles.title, { color: colors.student.text }]}>Student Login</Text>
            <Text style={[styles.subtitle, { color: colors.student.textSecondary }]}>
              Welcome back! Sign in to continue
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="your.email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              role="student"
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
              role="student"
            />

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              role="student"
              style={{ marginTop: spacing.md }}
            />

            <Pressable
              onPress={() => router.push('/student-signup')}
              style={styles.linkButton}
            >
              <Text style={[styles.linkText, { color: colors.student.textSecondary }]}>
                Do not have an account?{' '}
                <Text style={{ color: colors.student.primary, fontWeight: '600' }}>
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
