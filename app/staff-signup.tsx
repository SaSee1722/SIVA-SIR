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

export default function StaffSignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const router = useRouter();
  const { showAlert } = useAlert();

  const handleSignup = async () => {
    if (!name || !email || !password) {
      showAlert('Error', 'Please fill in required fields');
      return;
    }

    setLoading(true);
    try {
      await signup(email, password, 'staff', {
        name,
        department: department || undefined,
      });
      router.replace('/staff-dashboard');
    } catch (error: any) {
      if (error.message === 'verification_required') {
        showAlert(
          'Verification Required',
          'Account created! Please check your email and verify your identity before logging in.',
          [{ text: 'OK', onPress: () => router.replace('/staff-login') }]
        );
      } else {
        showAlert('Signup Failed', error.message || 'Could not create account');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen role="staff">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.content}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={24} color={colors.staff.text} />
          </Pressable>

          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.staff.text }]}>Create Staff Account</Text>
            <Text style={[styles.subtitle, { color: colors.staff.textSecondary }]}>
              Set up your profile to manage students
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Full Name"
              value={name}
              onChangeText={setName}
              placeholder="Jane Smith"
              role="staff"
            />
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
              placeholder="Create a strong password"
              secureTextEntry
              role="staff"
            />
            <Input
              label="Department (Optional)"
              value={department}
              onChangeText={setDepartment}
              placeholder="e.g., Computer Science"
              role="staff"
            />

            <Button
              title="Create Account"
              onPress={handleSignup}
              loading={loading}
              role="staff"
              style={{ marginTop: spacing.md }}
            />

            <Pressable
              onPress={() => router.back()}
              style={styles.linkButton}
            >
              <Text style={[styles.linkText, { color: colors.staff.textSecondary }]}>
                Already have an account?{' '}
                <Text style={{ color: colors.staff.primary, fontWeight: '600' }}>
                  Sign In
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
    padding: spacing.xl,
  },
  backButton: {
    marginBottom: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
  },
  subtitle: {
    ...typography.bodySmall,
    marginTop: spacing.xs,
  },
  form: {
    paddingBottom: spacing.xl,
  },
  linkButton: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  linkText: {
    ...typography.bodySmall,
  },
});
