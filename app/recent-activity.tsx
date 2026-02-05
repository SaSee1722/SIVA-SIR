import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/layout/Screen';
import { RecentActivity } from '@/components/feature/RecentActivity';
import { useAuth } from '@/hooks/useAuth';
import { Notification } from '@/types';

export default function RecentActivityScreen() {
  const { user } = useAuth();
  const router = useRouter();

  if (!user) {
    return null;
  }

  const handleNotificationPress = (notification: Notification) => {
    // Handle notification actions based on type
    switch (notification.type) {
      case 'session_created':
        // Navigate to QR scanner
        router.push('/qr-scanner');
        break;
      case 'class_approved':
        // Could navigate to classes tab or show success
        break;
      case 'attendance_marked':
        // Could navigate to attendance history
        break;
      default:
        // Default action - just mark as read
        break;
    }
  };

  return (
    <Screen role={user.role as 'student' | 'staff'} scrollable={false}>
      <View style={styles.container}>
        <RecentActivity
          userId={user.id}
          role={user.role as 'student' | 'staff'}
          onNotificationPress={handleNotificationPress}
          onBack={() => router.back()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
