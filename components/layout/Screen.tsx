import React, { ReactNode } from 'react';
import { View, ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';

interface ScreenProps {
  children: ReactNode;
  role?: 'student' | 'staff';
  scrollable?: boolean;
  style?: ViewStyle;
}

export function Screen({ children, role = 'student', scrollable = true, style }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const theme = role === 'student' ? colors.student : colors.staff;

  const containerStyle = [
    styles.container,
    { backgroundColor: theme.background, paddingTop: insets.top },
    style,
  ];

  if (scrollable) {
    return (
      <ScrollView
        style={containerStyle}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    );
  }

  return <View style={[containerStyle, { flex: 1 }]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
