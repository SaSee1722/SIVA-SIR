import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Text, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { typography, spacing, borderRadius, shadows } from '@/constants/theme';

type ToastType = 'success' | 'error' | 'info';

interface ToastOptions {
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const { width } = Dimensions.get('window');
// width is used for platform calculation if needed later

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toast, setToast] = useState<ToastOptions | null>(null);
    const [fadeAnim] = useState(new Animated.Value(0));
    const [translateY] = useState(new Animated.Value(-100));

    const hideToast = useCallback(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: -100,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => setToast(null));
    }, [fadeAnim, translateY]);

    const showToast = useCallback((message: string, type: ToastType = 'success', duration: number = 3000) => {
        setToast({ message, type, duration });

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.spring(translateY, {
                toValue: 50,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }),
        ]).start();

        setTimeout(hideToast, duration);
    }, [fadeAnim, translateY, hideToast]);

    const getToastStyles = () => {
        switch (toast?.type) {
            case 'error':
                return {
                    backgroundColor: '#FEE2E2',
                    borderColor: '#EF4444',
                    icon: 'error-outline' as const,
                    iconColor: '#EF4444',
                    textColor: '#991B1B',
                };
            case 'info':
                return {
                    backgroundColor: '#E0F2FE',
                    borderColor: '#0EA5E9',
                    icon: 'info-outline' as const,
                    iconColor: '#0EA5E9',
                    textColor: '#075985',
                };
            default: // success
                return {
                    backgroundColor: '#ECFDF5',
                    borderColor: '#10B981',
                    icon: 'check-circle-outline' as const,
                    iconColor: '#10B981',
                    textColor: '#065F46',
                };
        }
    };

    const toastStyles = getToastStyles();

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {toast && (
                <Animated.View
                    style={[
                        styles.toastContainer,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY }],
                            backgroundColor: toastStyles.backgroundColor,
                            borderColor: toastStyles.borderColor,
                        },
                    ]}
                >
                    <MaterialIcons name={toastStyles.icon} size={24} color={toastStyles.iconColor} />
                    <Text style={[styles.toastText, { color: toastStyles.textColor }]}>
                        {toast.message}
                    </Text>
                </Animated.View>
            )}
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

const styles = StyleSheet.create({
    toastContainer: {
        position: 'absolute',
        top: 50,
        left: spacing.lg,
        right: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        ...shadows.lg,
        zIndex: 9999,
        ...Platform.select({
            web: {
                maxWidth: 400,
                alignSelf: 'center',
                left: '50%',
                marginLeft: -200,
            }
        })
    },
    toastText: {
        ...typography.bodySmall,
        fontWeight: '600',
        marginLeft: spacing.sm,
        flex: 1,
    },
});
