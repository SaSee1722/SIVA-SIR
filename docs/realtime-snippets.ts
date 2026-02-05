/**
 * Real-time Updates - Quick Implementation Snippets
 * Copy-paste these code blocks into your dashboards
 */

// =====================================================
// STAFF DASHBOARD - Real-time Subscriptions
// =====================================================

// 1. Add to imports (top of file)
import { realtimeService } from '@/services/realtimeService';

// 2. Add this useEffect hook (after existing useEffect hooks)
React.useEffect(() => {
  if (!user?.id) return;

  console.log('[StaffDashboard] Setting up real-time subscriptions');
  const subscriptions: any[] = [];

  // Profile changes (student approvals, class requests)
  const profileSub = realtimeService.subscribeToProfiles(() => {
    console.log('📝 Profile changed - refreshing students and classes');
    loadAllStudents();
    loadClasses();
  });
  subscriptions.push(profileSub);

  // File uploads
  const fileSub = realtimeService.subscribeToFiles(() => {
    console.log('📁 File uploaded - refreshing files');
    refreshFiles();
  }, user.id);
  subscriptions.push(fileSub);

  // Attendance sessions
  const sessionSub = realtimeService.subscribeToSessions(() => {
    console.log('📊 Session changed - refreshing attendance');
    refreshAttendance();
  }, user.id);
  subscriptions.push(sessionSub);

  // Attendance records
  const recordSub = realtimeService.subscribeToAttendanceRecords(() => {
    console.log('✅ Attendance marked - refreshing');
    refreshAttendance();
  });
  subscriptions.push(recordSub);

  // Class changes
  const classSub = realtimeService.subscribeToClasses(() => {
    console.log('🎓 Class changed - refreshing classes');
    loadClasses();
  });
  subscriptions.push(classSub);

  // Cleanup
  return () => {
    console.log('[StaffDashboard] Cleaning up real-time subscriptions');
    realtimeService.unsubscribeAll(subscriptions);
  };
}, [user?.id]);

// 3. Add this for live attendance counting during active sessions
React.useEffect(() => {
  if (!activeSession?.id) return;

  console.log('[StaffDashboard] Subscribing to active session attendance');
  
  const sessionRecordSub = realtimeService.subscribeToAttendanceRecords(
    () => {
      console.log('👥 Student marked present - updating count');
      refreshAttendance();
      
      // Update class total if filtering by class
      if (activeSession.classFilter) {
        classService.getClassStudentCount(activeSession.classFilter)
          .then(count => {
            setClassTotalStudents(count);
            console.log(`📊 Updated class total: ${count} students`);
          });
      }
    },
    activeSession.id
  );

  return () => {
    console.log('[StaffDashboard] Unsubscribing from active session');
    sessionRecordSub.unsubscribe();
  };
}, [activeSession?.id]);

// =====================================================
// STUDENT DASHBOARD - Real-time Subscriptions
// =====================================================

// 1. Add to imports (top of file)
import { realtimeService } from '@/services/realtimeService';

// 2. Add this useEffect hook (after existing useEffect hooks)
React.useEffect(() => {
  if (!user?.id) return;

  console.log('[StudentDashboard] Setting up real-time subscriptions');
  const subscriptions: any[] = [];

  // Profile changes (class approvals)
  const profileSub = realtimeService.subscribeToProfiles(() => {
    console.log('📝 Profile changed - refreshing user data');
    refreshUser();
  });
  subscriptions.push(profileSub);

  // File changes
  const fileSub = realtimeService.subscribeToFiles(() => {
    console.log('📁 File changed - refreshing files');
    refreshFiles();
  });
  subscriptions.push(fileSub);

  // Attendance sessions
  const sessionSub = realtimeService.subscribeToSessions(() => {
    console.log('📊 Session changed - refreshing attendance');
    refreshAttendance();
  });
  subscriptions.push(sessionSub);

  // Attendance records
  const recordSub = realtimeService.subscribeToAttendanceRecords(() => {
    console.log('✅ Attendance record changed - refreshing');
    refreshAttendance();
  });
  subscriptions.push(recordSub);

  // Cleanup
  return () => {
    console.log('[StudentDashboard] Cleaning up real-time subscriptions');
    realtimeService.unsubscribeAll(subscriptions);
  };
}, [user?.id]);

// =====================================================
// HELPER: Refresh Functions (if they don't exist)
// =====================================================

// Add these if your dashboard doesn't have them:

const refreshFiles = async () => {
  try {
    const files = await fileService.getFiles(user.id);
    setFiles(files);
  } catch (error) {
    console.error('Error refreshing files:', error);
  }
};

const refreshAttendance = async () => {
  try {
    const records = await attendanceService.getRecords(user.id);
    setAttendanceRecords(records);
  } catch (error) {
    console.error('Error refreshing attendance:', error);
  }
};

const refreshUser = async () => {
  try {
    const profile = await authService.getProfile(user.id);
    setUserProfile(profile);
  } catch (error) {
    console.error('Error refreshing user:', error);
  }
};

// =====================================================
// OPTIMISTIC UI UPDATES (Optional Enhancement)
// =====================================================

// For instant UI feedback before server confirmation:

const handleApproveStudent = async (studentId: string) => {
  // Optimistic update - update UI immediately
  setAllStudents(prev => 
    prev.map(s => s.id === studentId 
      ? { ...s, isApproved: true, pendingClasses: '' } 
      : s
    )
  );

  try {
    await authService.updateProfile(studentId, { isApproved: true });
    showToast('Student approved successfully', 'success');
  } catch (error) {
    // Revert on error
    loadAllStudents();
    showToast('Failed to approve student', 'error');
  }
};

const handleMarkAttendance = async (sessionId: string) => {
  // Optimistic update - increment count immediately
  setAttendanceCount(prev => prev + 1);

  try {
    await attendanceService.markPresent(sessionId, user.id);
    showToast('Attendance marked!', 'success');
  } catch (error) {
    // Revert on error
    setAttendanceCount(prev => prev - 1);
    showToast('Failed to mark attendance', 'error');
  }
};

// =====================================================
// DEBUGGING TIPS
// =====================================================

// Add this to see real-time connection status:
React.useEffect(() => {
  const supabase = getSharedSupabaseClient();
  
  supabase.realtime.onOpen(() => {
    console.log('🟢 Real-time connected');
  });
  
  supabase.realtime.onClose(() => {
    console.log('🔴 Real-time disconnected');
  });
  
  supabase.realtime.onError((error) => {
    console.error('❌ Real-time error:', error);
  });
}, []);
