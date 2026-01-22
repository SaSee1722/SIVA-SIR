import React from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { colors, typography, borderRadius, spacing, shadows } from '@/constants/theme';

interface InputProps extends Omit<TextInputProps, 'role'> {
  label: string;
  error?: string;
  role?: 'student' | 'staff';
}

export function Input({ label, error, role = 'student', style, ...props }: InputProps) {
  const theme = role === 'student' ? colors.student : colors.staff;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.surface,
            borderColor: error ? theme.error : theme.border,
            color: theme.text,
          },
          style,
        ]}
        placeholderTextColor={theme.textSecondary}
        {...props}
      />
      {error ? <Text style={[styles.error, { color: theme.error }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.bodySmall,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  input: {
    height: 56,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    paddingHorizontal: spacing.md,
    ...typography.body,
    fontSize: 16,
    ...shadows.sm,
  },
  error: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});
