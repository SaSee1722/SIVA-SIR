import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/layout/Screen';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';

export default function ConfirmSuccessScreen() {
    const router = useRouter();

    return (
        <Screen role="student">
            <View style={styles.container}>
                <View style={styles.content}>
                    <View style={styles.iconCircle}>
                        <MaterialIcons name="mark-email-read" size={64} color={colors.common.white} />
                    </View>

                    <Text style={styles.title}>Email Verified!</Text>
                    <Text style={styles.message}>
                        Your email has been confirmed successfully. You can now log in to your account and access the portal.
                    </Text>

                    <Button
                        title="Go to Login"
                        onPress={() => router.replace('/role-select')}
                        role="student"
                        style={styles.button}
                    />
                </View>
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: spacing.xl,
    },
    content: {
        alignItems: 'center',
        backgroundColor: colors.common.white,
        padding: spacing.xl,
        borderRadius: borderRadius.xl,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#10B981', // Success green
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    title: {
        ...typography.h1,
        color: colors.student.text,
        marginBottom: spacing.sm,
    },
    message: {
        ...typography.body,
        color: colors.student.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: spacing.xl,
    },
    button: {
        width: '100%',
    },
});
