import { getSharedSupabaseClient } from '@/template/core/client';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Real-time Service
 * Provides centralized real-time subscriptions for all app data
 */

export const realtimeService = {
  /**
   * Subscribe to profile changes (student approvals, class requests, etc.)
   */
  subscribeToProfiles(callback: (payload: any) => void): RealtimeChannel {
    const supabase = getSharedSupabaseClient();
    const channelId = `profiles_${Math.random().toString(36).slice(2, 9)}`;
    
    return supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          console.log('[RealtimeService] Profile change:', payload.eventType);
          callback(payload);
        }
      )
      .subscribe();
  },

  /**
   * Subscribe to file uploads
   */
  subscribeToFiles(callback: (payload: any) => void, staffId?: string): RealtimeChannel {
    const supabase = getSharedSupabaseClient();
    const channelId = `files_${Math.random().toString(36).slice(2, 9)}`;
    
    const channel = supabase.channel(channelId);
    
    if (staffId) {
      // Staff: only files sent to them
      return channel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'files',
            filter: `recipient_id=eq.${staffId}`,
          },
          (payload) => {
            console.log('[RealtimeService] File change (staff):', payload.eventType);
            callback(payload);
          }
        )
        .subscribe();
    } else {
      // All files
      return channel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'files',
          },
          (payload) => {
            console.log('[RealtimeService] File change:', payload.eventType);
            callback(payload);
          }
        )
        .subscribe();
    }
  },

  /**
   * Subscribe to attendance sessions
   */
  subscribeToSessions(callback: (payload: any) => void, staffId?: string): RealtimeChannel {
    const supabase = getSharedSupabaseClient();
    const channelId = `sessions_${Math.random().toString(36).slice(2, 9)}`;
    
    const channel = supabase.channel(channelId);
    
    if (staffId) {
      // Staff: only their sessions
      return channel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'attendance_sessions',
            filter: `created_by=eq.${staffId}`,
          },
          (payload) => {
            console.log('[RealtimeService] Session change (staff):', payload.eventType);
            callback(payload);
          }
        )
        .subscribe();
    } else {
      // All sessions
      return channel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'attendance_sessions',
          },
          (payload) => {
            console.log('[RealtimeService] Session change:', payload.eventType);
            callback(payload);
          }
        )
        .subscribe();
    }
  },

  /**
   * Subscribe to attendance records
   */
  subscribeToAttendanceRecords(callback: (payload: any) => void, sessionId?: string): RealtimeChannel {
    const supabase = getSharedSupabaseClient();
    const channelId = `attendance_${Math.random().toString(36).slice(2, 9)}`;
    
    const channel = supabase.channel(channelId);
    
    if (sessionId) {
      // Specific session
      return channel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'attendance_records',
            filter: `session_id=eq.${sessionId}`,
          },
          (payload) => {
            console.log('[RealtimeService] Attendance record change (session):', payload.eventType);
            callback(payload);
          }
        )
        .subscribe();
    } else {
      // All records
      return channel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'attendance_records',
          },
          (payload) => {
            console.log('[RealtimeService] Attendance record change:', payload.eventType);
            callback(payload);
          }
        )
        .subscribe();
    }
  },

  /**
   * Subscribe to class changes
   */
  subscribeToClasses(callback: (payload: any) => void): RealtimeChannel {
    const supabase = getSharedSupabaseClient();
    const channelId = `classes_${Math.random().toString(36).slice(2, 9)}`;
    
    return supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'classes',
        },
        (payload) => {
          console.log('[RealtimeService] Class change:', payload.eventType);
          callback(payload);
        }
      )
      .subscribe();
  },

  /**
   * Subscribe to notifications
   */
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
        (payload) => {
          console.log('[RealtimeService] Notification change:', payload.eventType);
          callback(payload);
        }
      )
      .subscribe();
  },

  /**
   * Subscribe to multiple tables at once
   */
  subscribeToMultiple(
    tables: Array<{
      table: string;
      filter?: string;
      callback: (payload: any) => void;
    }>
  ): RealtimeChannel {
    const supabase = getSharedSupabaseClient();
    const channelId = `multi_${Math.random().toString(36).slice(2, 9)}`;
    
    let channel = supabase.channel(channelId);
    
    tables.forEach(({ table, filter, callback }) => {
      const config: any = {
        event: '*',
        schema: 'public',
        table,
      };
      
      if (filter) {
        config.filter = filter;
      }
      
      channel = channel.on('postgres_changes', config, (payload) => {
        console.log(`[RealtimeService] ${table} change:`, payload.eventType);
        callback(payload);
      });
    });
    
    return channel.subscribe();
  },

  /**
   * Unsubscribe from a channel
   */
  async unsubscribe(channel: RealtimeChannel): Promise<void> {
    await channel.unsubscribe();
  },

  /**
   * Unsubscribe from multiple channels
   */
  async unsubscribeAll(channels: RealtimeChannel[]): Promise<void> {
    await Promise.all(channels.map(channel => channel.unsubscribe()));
  },
};
