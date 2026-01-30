import { useState, useEffect, useCallback } from 'react';
import { notificationService } from '@/services/notificationService';
import { Notification } from '@/types';
import * as Notifications from 'expo-notifications';

// Configure how notifications look when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export function useNotifications(userId: string | undefined) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchNotifications = useCallback(async () => {
        if (!userId) return;
        try {
            setLoading(true);
            const [data, count] = await Promise.all([
                notificationService.getNotifications(userId),
                notificationService.getUnreadCount(userId),
            ]);
            setNotifications(data);
            setUnreadCount(count);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch notifications');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const markAsRead = async (notificationId: string) => {
        try {
            await notificationService.markAsRead(notificationId);
            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    };

    const markAllAsRead = async () => {
        if (!userId) return;
        try {
            await notificationService.markAllAsRead(userId);
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Error marking all notifications as read:', err);
        }
    };

    useEffect(() => {
        if (userId) {
            fetchNotifications();

            // Subscribe to real-time notifications
            const subscription = notificationService.subscribeToNotifications(userId, (payload: any) => {
                // If a new notification is inserted, show a local system alert
                if (payload?.eventType === 'INSERT' && payload?.new) {
                    const newNotify = payload.new;
                    Notifications.scheduleNotificationAsync({
                        content: {
                            title: newNotify.title,
                            body: newNotify.message,
                            data: newNotify.metadata,
                        },
                        trigger: null, // show immediately
                    });
                }

                // Refresh the list and count
                fetchNotifications();
            });

            return () => {
                subscription.unsubscribe();
            };
        }
    }, [userId, fetchNotifications]);

    return {
        notifications,
        unreadCount,
        loading,
        error,
        refresh: fetchNotifications,
        markAsRead,
        markAllAsRead,
    };
}
