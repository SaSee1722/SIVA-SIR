import { getSharedSupabaseClient } from '@/template/core/client';
import { Notification, NotificationType } from '@/types';
import { RealtimeChannel } from '@supabase/supabase-js';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Configure how notifications look when app is in foreground
let activeSessionId: string | null = null;

// Register notification categories
Notifications.setNotificationCategoryAsync('session_created', [
    {
        identifier: 'join',
        buttonTitle: 'Join Now',
        options: { opensAppToForeground: true },
    },
]);

Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
        // Check if we should silence this notification
        const data = notification.request.content.data;
        if (activeSessionId && data?.sessionId === activeSessionId) {
            return {
                shouldShowAlert: false,
                shouldPlaySound: false,
                shouldSetBadge: false,
                shouldShowBanner: false,
                shouldShowList: false,
            };
        }

        return {
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
        };
    },
});

export const notificationService = {
    // --- Presence Logic ---
    setActiveSessionId(id: string | null) {
        activeSessionId = id;
    },

    // --- Token Registration ---
    async registerForPushNotificationsAsync(userId: string) {
        if (!Device.isDevice) {
            console.log('Must use physical device for push notifications');
            return null;
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification!');
            return null;
        }

        const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

        try {
            const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

            // Save token to Supabase profile
            const supabase = getSharedSupabaseClient();
            await supabase
                .from('profiles')
                .update({ push_token: token })
                .eq('id', userId);

            return token;
        } catch (e) {
            console.error('Error getting push token:', e);
            return null;
        }
    },

    // --- External Push API ---
    async sendPushNotification(targetTokens: string[], title: string, body: string, data: any = {}) {
        if (targetTokens.length === 0) return;

        const messages = targetTokens.map(token => ({
            to: token,
            sound: 'default',
            title: title,
            body: body,
            data: data,
        }));

        try {
            await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Accept-encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(messages),
            });
        } catch (error) {
            console.error('Error sending push notification:', error);
        }
    },

    // --- In-App Notifications (Supabase) ---
    async sendNotification(
        userId: string,
        title: string,
        message: string,
        type: NotificationType,
        metadata?: any
    ): Promise<Notification> {
        const supabase = getSharedSupabaseClient();

        const newNotification = {
            user_id: userId,
            title,
            message,
            type,
            is_read: false,
            metadata,
        };

        const { data, error } = await supabase
            .from('notifications')
            .insert([newNotification])
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            userId: data.user_id,
            title: data.title,
            message: data.message,
            type: data.type,
            isRead: data.is_read,
            createdAt: data.created_at,
            metadata: data.metadata,
        };
    },

    async sendBulkNotifications(
        userIds: string[],
        title: string,
        message: string,
        type: NotificationType,
        metadata?: any
    ): Promise<void> {
        if (userIds.length === 0) return;
        const supabase = getSharedSupabaseClient();

        const notifications = userIds.map((userId) => ({
            user_id: userId,
            title,
            message,
            type,
            is_read: false,
            metadata,
        }));

        const { error } = await supabase.from('notifications').insert(notifications);

        if (error) throw error;
    },

    async getNotifications(userId: string): Promise<Notification[]> {
        const supabase = getSharedSupabaseClient();
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((n) => ({
            id: n.id,
            userId: n.user_id,
            title: n.title,
            message: n.message,
            type: n.type,
            isRead: n.is_read,
            createdAt: n.created_at,
            metadata: n.metadata,
        }));
    },

    async markAsRead(notificationId: string): Promise<void> {
        const supabase = getSharedSupabaseClient();
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);

        if (error) throw error;
    },

    async markAllAsRead(userId: string): Promise<void> {
        const supabase = getSharedSupabaseClient();
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) throw error;
    },

    async getUnreadCount(userId: string): Promise<number> {
        const supabase = getSharedSupabaseClient();
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) throw error;
        return count || 0;
    },

    subscribeToNotifications(userId: string, callback: (payload: any) => void): RealtimeChannel {
        const supabase = getSharedSupabaseClient();
        const channelId = `notifications_${userId}_${Math.random().toString(36).slice(2, 9)}`;
        return supabase
            .channel(channelId)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => callback(payload)
            )
            .subscribe();
    },
};
