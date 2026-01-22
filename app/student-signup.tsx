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

export default function StudentSignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [year, setYear] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const router = useRouter();
  const { showAlert } = useAlert();

  const handleSignup = async () => {
    if (!name || !email || !password || !studentClass || !year || !rollNumber) {
      showAlert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await signup(email, password, 'student', {
        name,
        class: studentClass,
        year,
        rollNumber,
      });
      router.replace('/student-dashboard');
    } catch (error: any) {
      if (error.message === 'verification_required') {
        showAlert(
          'Verification Required',
          'Account created! Please check your email and verify your account before logging in.',
          [{ text: 'OK', onPress: () => router.replace('/student-login') }]
        );
      } else {
        showAlert('Signup Failed', error.message || 'Could not create account');
      }
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
            <Text style={[styles.title, { color: colors.student.text }]}>Create Student Account</Text>
            <Text style={[styles.subtitle, { color: colors.student.textSecondary }]}>
              Set up your profile to get started
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Full Name"
              value={name}
              onChangeText={setName}
              placeholder="John Doe"
              role="student"
            />
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
              placeholder="Create a strong password"
              secureTextEntry
              role="student"
            />
            <Input
              label="Class"
              value={studentClass}
              onChangeText={setStudentClass}
              placeholder="e.g., 10-A"
              role="student"
            />
            <Input
              label="Year"
              value={year}
              onChangeText={setYear}
              placeholder="e.g., 2024"
              keyboardType="numeric"
              role="student"
            />
            <Input
              label="Roll Number"
              value={rollNumber}
              onChangeText={setRollNumber}
              placeholder="e.g., 101"
              role="student"
            />

            <Button
              title="Create Account"
              onPress={handleSignup}
              loading={loading}
              role="student"
              style={{ marginTop: spacing.md }}
            />

            <Pressable
              onPress={() => router.back()}
              style={styles.linkButton}
            >
              <Text style={[styles.linkText, { color: colors.student.textSecondary }]}>
                Already have an account?{' '}
                <Text style={{ color: colors.student.primary, fontWeight: '600' }}>
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
