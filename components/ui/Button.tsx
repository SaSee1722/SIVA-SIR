import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, borderRadius, spacing, shadows } from '@/constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  role?: 'student' | 'staff';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textColor?: string;
  icon?: React.ReactNode;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  role = 'student',
  disabled = false,
  loading = false,
  style,
  textColor,
  icon,
}: ButtonProps) {
  const theme = role === 'student' ? colors.student : colors.staff;

  const getTextColor = () => {
    if (textColor) return textColor;
    if (variant === 'primary') return colors.common.white;
    return theme.primary;
  };

  if (variant === 'primary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        style={({ pressed }) => [
          styles.button,
          (disabled || loading) && styles.disabled,
          pressed && styles.pressed,
          style,
        ]}
      >
        <LinearGradient
          colors={style?.backgroundColor ? [style.backgroundColor as string, style.backgroundColor as string] : theme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {loading ? (
            <ActivityIndicator color={colors.common.white} />
          ) : (
            <>
              {icon}
              <Text style={[styles.text, { color: getTextColor() }]}>{title}</Text>
            </>
          )}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && { backgroundColor: theme.surfaceLight },
        variant === 'outline' && {
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: theme.primary,
        },
        style, // Allow custom style to override background
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.plainButton}>
        {loading ? (
          <ActivityIndicator color={theme.primary} />
        ) : (
          <>
            {icon}
            <Text
              style={[
                styles.text,
                { color: getTextColor() },
              ]}
            >
              {title}
            </Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    minHeight: 56,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  gradient: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  plainButton: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  text: {
    ...typography.button,
    fontSize: 17,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
