import React, { useEffect } from 'react';
import { View, StyleSheet, Image, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
    withSequence,
    withDelay,
    runOnJS
} from 'react-native-reanimated';
import { colors, spacing } from '@/constants/theme';

const { width } = Dimensions.get('window');

interface SplashScreenProps {
    onAnimationComplete: () => void;
}

export function ProfessionalSplashScreen({ onAnimationComplete }: SplashScreenProps) {
    const scale = useSharedValue(0.3);
    const opacity = useSharedValue(0);
    const textOpacity = useSharedValue(0);
    const textTranslateY = useSharedValue(20);

    useEffect(() => {
        // Logo entrance animation
        scale.value = withSequence(
            withTiming(1.2, { duration: 800, easing: Easing.out(Easing.back(1.5)) }),
            withTiming(1, { duration: 400 })
        );
        opacity.value = withTiming(1, { duration: 800 });

        // Text entrance animation
        textOpacity.value = withDelay(600, withTiming(1, { duration: 600 }));
        textTranslateY.value = withDelay(600, withTiming(0, { duration: 600, easing: Easing.out(Easing.quad) }));

        // Complete animation and exit
        const timer = setTimeout(() => {
            opacity.value = withTiming(0, { duration: 500 }, (finished) => {
                if (finished) {
                    runOnJS(onAnimationComplete)();
                }
            });
        }, 2500);

        return () => clearTimeout(timer);
    }, []);

    const logoStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    const textStyle = useAnimatedStyle(() => ({
        opacity: textOpacity.value,
        transform: [{ translateY: textTranslateY.value }],
    }));

    const containerStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.content, containerStyle]}>
                <Animated.View style={[styles.logoContainer, logoStyle]}>
                    <Image
                        source={require('@/assets/images/logo.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </Animated.View>

                <Animated.View style={[styles.textContainer, textStyle]}>
                    <View style={styles.divider} />
                    <Animated.Text style={styles.title}>SIVA</Animated.Text>
                    <Animated.Text style={styles.subtitle}>EduPortal • Attendance & Learning</Animated.Text>
                </Animated.View>
            </Animated.View>

            <View style={styles.footer}>
                <View style={styles.dotContainer}>
                    <View style={[styles.dot, { backgroundColor: 'white' }]} />
                    <View style={styles.dot} />
                    <View style={styles.dot} />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#1E3A8A',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoContainer: {
        width: 150,
        height: 150,
        backgroundColor: 'white',
        borderRadius: 75,
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    logo: {
        width: '100%',
        height: '100%',
    },
    textContainer: {
        marginTop: spacing.xl,
        alignItems: 'center',
    },
    divider: {
        width: 40,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 2,
        marginBottom: spacing.md,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: 'white',
        letterSpacing: 4,
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        marginTop: spacing.xs,
        fontWeight: '500',
        letterSpacing: 1,
    },
    footer: {
        position: 'absolute',
        bottom: 60,
    },
    dotContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.2)',
    }
});
