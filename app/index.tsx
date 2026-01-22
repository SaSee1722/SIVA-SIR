import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

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
      {/* No content here to keep it perfectly dark blue during routing */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E3A8A', // Match splash screen background
  },
});
