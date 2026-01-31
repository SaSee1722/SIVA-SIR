import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { Screen } from '@/components/layout/Screen';
import { colors, typography, spacing } from '@/constants/theme';
import { format } from 'date-fns';

export default function NotificationsScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const { notifications, loading, refresh, markAsRead, markAllAsRead } = useNotifications(user?.id);
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = async () => {
        setRefreshing(true);
        await refresh();
        setRefreshing(false);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'session_created':
                return 'event-note';
            case 'absent':
                return 'notification-important';
            default:
                return 'notifications';
        }
    };

    const getIconColor = (type: string) => {
        switch (type) {
            case 'session_created':
                return '#3B82F6';
            case 'absent':
                return '#EF4444';
            default:
                return colors.student.primary;
        }
    };

    const getBackgroundColor = (type: string) => {
        switch (type) {
            case 'session_created':
                return '#DBEAFE';
            case 'absent':
                return '#FEE2E2';
            default:
                return colors.student.surfaceLight;
        }
    };

    if (!user) return null;

    return (
        <Screen role="student">
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.backButton}>
                        <MaterialIcons name="arrow-back" size={24} color={colors.student.text} />
                    </Pressable>
                    <Text style={styles.title}>Notifications</Text>
                    {notifications.some(n => !n.isRead) && (
                        <Pressable onPress={markAllAsRead} style={styles.markAllButton}>
                            <Text style={styles.markAllText}>Mark all as read</Text>
                        </Pressable>
                    )}
                </View>

                {loading && !refreshing ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={colors.student.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={notifications}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.student.primary} />
                        }
                        renderItem={({ item }) => (
                            <Pressable
                                onPress={() => markAsRead(item.id)}
                                style={[
                                    styles.notificationItem,
                                    !item.isRead && styles.unreadItem,
                                ]}
                            >
                                <View style={[styles.iconContainer, { backgroundColor: getBackgroundColor(item.type) }]}>
                                    <MaterialIcons name={getIcon(item.type)} size={24} color={getIconColor(item.type)} />
                                </View>
                                <View style={styles.content}>
                                    <View style={styles.row}>
                                        <Text style={[styles.itemTitle, !item.isRead && styles.unreadText]}>{item.title}</Text>
                                        {!item.isRead && <View style={styles.unreadDot} />}
                                    </View>
                                    <Text style={styles.message}>{item.message}</Text>
                                    <Text style={styles.time}>
                                        {format(new Date(item.createdAt), 'MMM d, h:mm a')}
                                    </Text>

                                    {item.type === 'session_created' && item.metadata?.action === 'join_session' && (
                                        <Pressable
                                            onPress={() => {
                                                markAsRead(item.id);
                                                router.push('/qr-scanner');
                                            }}
                                            style={styles.joinButton}
                                        >
                                            <MaterialIcons name="qr-code-scanner" size={18} color={colors.common.white} />
                                            <Text style={styles.joinButtonText}>Scan QR & Join</Text>
                                        </Pressable>
                                    )}
                                </View>
                            </Pressable>
                        )}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <View style={styles.emptyIconContainer}>
                                    <MaterialIcons name="notifications-none" size={64} color={colors.common.gray300} />
                                </View>
                                <Text style={styles.emptyTitle}>No notifications yet</Text>
                                <Text style={styles.emptySubtitle}>
                                    We&apos;ll notify you when session activities occur.
                                </Text>
                            </View>
                        }
                    />
                )}
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.common.white,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        paddingTop: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.common.gray100,
    },
    backButton: {
        padding: spacing.xs,
        marginRight: spacing.sm,
    },
    title: {
        ...typography.h3,
        fontWeight: '700',
        flex: 1,
        color: colors.student.text,
    },
    markAllButton: {
        padding: spacing.xs,
    },
    markAllText: {
        color: colors.student.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingBottom: spacing.xl,
    },
    notificationItem: {
        flexDirection: 'row',
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.common.gray50,
        backgroundColor: colors.common.white,
    },
    unreadItem: {
        backgroundColor: 'rgba(59, 130, 246, 0.03)',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    content: {
        flex: 1,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.student.text,
        flex: 1,
    },
    unreadText: {
        fontWeight: '700',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.student.primary,
        marginLeft: spacing.sm,
    },
    message: {
        fontSize: 14,
        color: colors.student.textSecondary,
        lineHeight: 20,
        marginBottom: 6,
    },
    time: {
        fontSize: 12,
        color: colors.common.gray400,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
        paddingHorizontal: spacing.xxl,
    },
    emptyIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.common.gray50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.student.text,
        marginBottom: spacing.xs,
    },
    emptySubtitle: {
        fontSize: 15,
        color: colors.student.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    joinButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.student.primary,
        alignSelf: 'flex-start',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginTop: 10,
        gap: 6,
    },
    joinButtonText: {
        color: colors.common.white,
        fontSize: 14,
        fontWeight: '600',
    },
});
