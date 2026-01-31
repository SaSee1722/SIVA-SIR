import React, { useState, useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '@/contexts/AuthContext';
import { AlertProvider } from '@/template';
import { ToastProvider } from '@/components/ui/Toast';
import * as Notifications from 'expo-notifications';

import { ProfessionalSplashScreen } from '@/components/ui/ProfessionalSplashScreen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading the app might cause some errors */
});

// Global flag to ensure splash only shows once per session
let hasShownSplashGlobal = false;

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(!hasShownSplashGlobal);

  const onAnimationComplete = React.useCallback(() => {
    hasShownSplashGlobal = true;
    setShowAnimatedSplash(false);
  }, []);

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load resources
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
        // Hide the native static splash screen immediately to reveal our animated one
        SplashScreen.hideAsync().catch(() => { });
      }
    }

    prepare();
  }, []);

  // Handle notification clicks for deep linking
  const router = useRouter();

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.action === 'join_session') {
        // Delay slightly to ensure app is ready to navigate
        setTimeout(() => {
          router.push('/qr-scanner');
        }, 500);
      }
    });

    return () => subscription.remove();
  }, [router]);

  if (!appIsReady) {
    return null;
  }

  return (
    <AlertProvider>
      <ToastProvider>
        <SafeAreaProvider>
          <AuthProvider>
            {showAnimatedSplash ? (
              <ProfessionalSplashScreen onAnimationComplete={onAnimationComplete} />
            ) : (
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="role-select" />
                <Stack.Screen name="student-login" />
                <Stack.Screen name="staff-login" />
                <Stack.Screen name="student-signup" />
                <Stack.Screen name="staff-signup" />
                <Stack.Screen name="student-dashboard" />
                <Stack.Screen name="staff-dashboard" />
                <Stack.Screen name="qr-scanner" options={{ presentation: 'modal' }} />
                <Stack.Screen name="notifications" />
              </Stack>
            )}
          </AuthProvider>
        </SafeAreaProvider>
      </ToastProvider>
    </AlertProvider>
  );
}
