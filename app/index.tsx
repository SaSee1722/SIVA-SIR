import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { colors, typography, spacing } from '@/constants/theme';

export default function IndexScreen() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('[IndexScreen] State changed - isLoading:', isLoading, 'user:', !!user);
    if (!isLoading) {
      if (user) {
        console.log('[IndexScreen] Routing to dashboard for role:', user.role);
        if (user.role === 'student') {
          router.replace('/student-dashboard');
        } else {
          router.replace('/staff-dashboard');
        }
      } else {
        console.log('[IndexScreen] No user found, routing to role-select');
        router.replace('/role-select');
      }
    }
  }, [user, isLoading]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.student.primary} />
      <Text style={styles.text}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.common.gray50,
  },
  text: {
    ...typography.body,
    color: colors.common.gray600,
    marginTop: spacing.md,
  },
});
