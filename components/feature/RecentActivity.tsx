import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { notificationService } from '@/services/notificationService';
import { Notification } from '@/types';
import { colors, typography, borderRadius, spacing, shadows } from '@/constants/theme';
import { useToast } from '@/components/ui/Toast';

interface RecentActivityProps {
  userId: string;
  role: 'student' | 'staff';
  onNotificationPress?: (notification: Notification) => void;
  onBack?: () => void;
}

export function RecentActivity({ userId, role, onNotificationPress, onBack }: RecentActivityProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { showToast } = useToast();

  const roleColors = role === 'student' ? colors.student : colors.staff;

  const loadNotifications = async () => {
    try {
      const data = await notificationService.getNotifications(userId);
      setNotifications(data);
      const count = await notificationService.getUnreadCount(userId);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading notifications:', error);
      showToast('Failed to load activity', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();

    // Subscribe to real-time updates
    const subscription = notificationService.subscribeToNotifications(userId, () => {
      loadNotifications();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      await loadNotifications();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead(userId);
      await loadNotifications();
      showToast('All notifications marked as read', 'success');
    } catch (error) {
      console.error('Error marking all as read:', error);
      showToast('Failed to mark all as read', 'error');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'session_created':
        return 'qr-code-scanner';
      case 'class_approved':
        return 'check-circle';
      case 'class_request':
        return 'person-add';
      case 'attendance_marked':
        return 'event-available';
      case 'file_uploaded':
        return 'cloud-upload';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'session_created':
        return '#3B82F6';
      case 'class_approved':
        return '#10B981';
      case 'class_request':
        return '#F59E0B';
      case 'attendance_marked':
        return '#8B5CF6';
      case 'file_uploaded':
        return '#EC4899';
      default:
        return roleColors.primary;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => {
    const iconColor = getNotificationColor(item.type);
    const iconName = getNotificationIcon(item.type);

    return (
      <Pressable
        onPress={() => {
          if (!item.isRead) {
            handleMarkAsRead(item.id);
          }
          onNotificationPress?.(item);
        }}
        style={({ pressed }) => [
          styles.notificationItem,
          !item.isRead && styles.unreadItem,
          pressed && styles.pressedItem,
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${iconColor}15` }]}>
          <MaterialIcons name={iconName as any} size={24} color={iconColor} />
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.notificationHeaderRow}>
            <Text style={[styles.title, { color: roleColors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
          </View>

          <Text style={[styles.message, { color: roleColors.textSecondary }]} numberOfLines={2}>
            {item.message}
          </Text>

          {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: roleColors.primary }]} />}
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={roleColors.primary} />
        <Text style={[styles.loadingText, { color: roleColors.textSecondary }]}>
          Loading activity...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          {onBack && (
            <Pressable onPress={onBack} style={styles.backButton} hitSlop={8}>
              <MaterialIcons name="arrow-back" size={24} color={roleColors.text} />
            </Pressable>
          )}
          
          <View style={styles.headerContent}>
            <LinearGradient
              colors={roleColors.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerIconGradient}
            >
              <MaterialIcons name="history" size={24} color={colors.common.white} />
            </LinearGradient>
            <View style={styles.headerTextContainer}>
              <Text style={[styles.headerTitle, { color: roleColors.text }]}>Recent Activity</Text>
              <Text style={[styles.headerSubtitle, { color: roleColors.textSecondary }]}>
                {notifications.length} total • {unreadCount} unread
              </Text>
            </View>
          </View>

          {unreadCount > 0 && (
            <Pressable onPress={handleMarkAllAsRead} style={styles.markAllButton}>
              <Text style={[styles.markAllText, { color: roleColors.primary }]}>Mark all read</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Notifications List */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotificationItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={roleColors.primary}
            colors={[roleColors.primary]}
          />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="notifications-none" size={64} color={colors.common.gray300} />
            <Text style={[styles.emptyTitle, { color: roleColors.text }]}>No Activity Yet</Text>
            <Text style={[styles.emptyText, { color: roleColors.textSecondary }]}>
              Your recent notifications will appear here
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.common.white,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.common.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.common.gray100,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerIconGradient: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: typography.bold,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  markAllButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingVertical: spacing.sm,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: spacing.lg,
    backgroundColor: colors.common.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.common.gray100,
    gap: spacing.md,
  },
  unreadItem: {
    backgroundColor: '#F8FAFC',
  },
  pressedItem: {
    backgroundColor: colors.common.gray50,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    position: 'relative',
  },
  notificationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: typography.semiBold,
    marginRight: spacing.sm,
  },
  time: {
    fontSize: 12,
    color: colors.common.gray400,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  unreadDot: {
    position: 'absolute',
    top: 2,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl * 2,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
