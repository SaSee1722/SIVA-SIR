import { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
    message: string;
    title?: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toast, setToast] = useState<ToastOptions | null>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(-100)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;
    const timeoutRef = useRef<any>(null);

    const hideToast = useCallback(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: -120,
                duration: 400,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setToast(null);
            progressAnim.setValue(0);
        });
    }, [fadeAnim, translateY, progressAnim]);

    const showToast = useCallback((message: string, type: ToastType = 'success', title?: string, duration: number = 4000) => {
        // Clear existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        const defaultTitles = {
            success: 'Success',
            error: 'Error',
            info: 'Information',
            warning: 'Warning'
        };

        setToast({ message, title: title || defaultTitles[type], type, duration });
        
        // Reset and animate
        progressAnim.setValue(0);
        
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.spring(translateY, {
                toValue: Platform.OS === 'ios' ? 60 : 40,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }),
            Animated.timing(progressAnim, {
                toValue: 1,
                duration: duration,
                useNativeDriver: false, // Cannot use native driver for width
            })
        ]).start();

        timeoutRef.current = setTimeout(hideToast, duration);
    }, [fadeAnim, translateY, progressAnim, hideToast]);

    const getToastColors = () => {
        switch (toast?.type) {
            case 'error':
                return {
                    primary: '#EF4444',
                    secondary: '#FCA5A5',
                    bg: ['#FFFFFF', '#FFF1F1'],
                    icon: 'error-outline' as const,
                };
            case 'warning':
                return {
                    primary: '#F59E0B',
                    secondary: '#FCD34D',
                    bg: ['#FFFFFF', '#FFFBEB'],
                    icon: 'warning' as const,
                };
            case 'info':
                return {
                    primary: '#3B82F6',
                    secondary: '#93C5FD',
                    bg: ['#FFFFFF', '#EFF6FF'],
                    icon: 'info-outline' as const,
                };
            default: // success
                return {
                    primary: '#10B981',
                    secondary: '#6EE7B7',
                    bg: ['#FFFFFF', '#F0FDF4'],
                    icon: 'check-circle-outline' as const,
                };
        }
    };

    const tColors = getToastColors();

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {toast && (
                <Animated.View
                    style={[
                        styles.toastWrapper,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY }],
                        },
                    ]}
                >
                    <Pressable style={styles.toastCard} onPress={hideToast}>
                        <LinearGradient
                            colors={tColors.bg as [string, string]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.gradient}
                        >
                            <View style={[styles.indicator, { backgroundColor: tColors.primary }]} />
                            <View style={styles.contentContainer}>
                                <View style={[styles.iconContainer, { backgroundColor: `${tColors.primary}15` }]}>
                                    <MaterialIcons name={tColors.icon} size={24} color={tColors.primary} />
                                </View>
                                <View style={styles.textContainer}>
                                    <Text style={[styles.title, { color: colors.common.gray900 }]}>
                                        {toast.title}
                                    </Text>
                                    <Text style={[styles.message, { color: colors.common.gray600 }]}>
                                        {toast.message}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.progressTrack}>
                                <Animated.View 
                                    style={[
                                        styles.progressBar, 
                                        { 
                                            backgroundColor: tColors.primary,
                                            width: progressAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: ['0%', '100%']
                                            })
                                        }
                                    ]} 
                                />
                            </View>
                        </LinearGradient>
                    </Pressable>
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
    toastWrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        alignItems: 'center',
        paddingHorizontal: spacing.md,
    },
    toastCard: {
        width: '100%',
        maxWidth: 500,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        backgroundColor: colors.common.white,
        ...shadows.xl,
        marginTop: Platform.OS === 'ios' ? 0 : 20,
    },
    gradient: {
        padding: spacing.md,
        flexDirection: 'column',
    },
    indicator: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
    },
    contentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    message: {
        fontSize: 14,
        lineHeight: 18,
    },
    progressTrack: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    progressBar: {
        height: '100%',
    },
});
