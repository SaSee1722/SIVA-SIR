import React, { useState, useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '@/contexts/AuthContext';
import { AlertProvider } from '@/template';

import { ProfessionalSplashScreen } from '@/components/ui/ProfessionalSplashScreen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading the app might cause some errors */
});

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);

  const onAnimationComplete = React.useCallback(() => {
    setShowAnimatedSplash(false);
  }, []);

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load resources if needed
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  if (!appIsReady) {
    return null;
  }

  return (
    <AlertProvider>
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
            </Stack>
          )}
        </AuthProvider>
      </SafeAreaProvider>
    </AlertProvider>
  );
}
