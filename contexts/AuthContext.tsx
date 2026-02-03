import React, { createContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { User } from '@/types';
import { authService } from '@/services/authService';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, role?: 'student' | 'staff') => Promise<void>;
  signup: (email: string, password: string, role: 'student' | 'staff', additionalData: any) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const profileSubscriptionRef = useRef<any>(null);

  const setupProfileSubscription = useCallback((userId: string) => {
    const supabase = authService.getSupabaseClient();
    
    // Clean up existing if any
    if (profileSubscriptionRef.current) {
      profileSubscriptionRef.current.unsubscribe();
    }

    console.log('[AuthContext] Setting up real-time profile subscription for:', userId);
    
    const channel = supabase
      .channel(`profile-updates-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        async (payload: any) => {
          console.log('[AuthContext] Profile real-time update received:', payload.new);
          // Refresh user data with force refresh to clear cache
          const freshUser = await authService.getUserProfile(userId, null, true);
          if (freshUser) {
            setUser(prev => {
              // Only update if something changed
              if (JSON.stringify(prev) !== JSON.stringify(freshUser)) {
                return freshUser;
              }
              return prev;
            });
          }
        }
      )
      .subscribe();

    profileSubscriptionRef.current = channel;
  }, []);

  const loadUser = useCallback(async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      if (currentUser) {
        setupProfileSubscription(currentUser.id);
      }
    } catch (error) {
      console.error('Initial load user error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [setupProfileSubscription]);

  useEffect(() => {
    // Initial user load
    loadUser();

    // Subscribe to auth state changes
    const { data: { subscription: authSubscription } } = authService.onAuthStateChange(async (event, session) => {
      console.log('[AuthContext] Auth event:', event);
      try {
        if (session?.user) {
          if (!session.user.email_confirmed_at) {
            console.log('[AuthContext] User email not confirmed, clearing state');
            setUser(null);
            setIsLoading(false);
            return;
          }
          console.log('[AuthContext] Session user confirmed, fetching profile...');
          const currentUser = await authService.getUserProfile(session.user.id, session.user);
          setUser(currentUser);
          
          // Set up real-time subscription
          setupProfileSubscription(session.user.id);
        } else {
          console.log('[AuthContext] No session user, clearing state');
          setUser(null);
          // Cleanup subscription
          if (profileSubscriptionRef.current) {
            profileSubscriptionRef.current.unsubscribe();
            profileSubscriptionRef.current = null;
          }
        }
      } catch (error) {
        console.error('[AuthContext] Error in onAuthStateChange:', error);
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      authSubscription.unsubscribe();
      if (profileSubscriptionRef.current) {
        profileSubscriptionRef.current.unsubscribe();
      }
    };
  }, [loadUser, setupProfileSubscription]);

  const login = async (email: string, password: string, role?: 'student' | 'staff') => {
    const loggedInUser = await authService.login(email, password, role);
    setUser(loggedInUser);
    if (loggedInUser) {
      setupProfileSubscription(loggedInUser.id);
    }
  };

  const signup = async (
    email: string,
    password: string,
    role: 'student' | 'staff',
    additionalData: any
  ) => {
    const newUser = await authService.signup(email, password, role, additionalData);
    setUser(newUser);
    if (newUser) {
      setupProfileSubscription(newUser.id);
    }
  };

  const logout = async () => {
    if (profileSubscriptionRef.current) {
      profileSubscriptionRef.current.unsubscribe();
      profileSubscriptionRef.current = null;
    }
    await authService.logout();
    setUser(null);
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return;
    const updatedUser = await authService.updateProfile(user.id, updates);
    setUser(updatedUser);
  };

  const refreshUser = async () => {
    if (!user) return;
    try {
      const freshUser = await authService.getUserProfile(user.id, null, true);
      if (freshUser) {
        setUser(freshUser);
      }
    } catch (error) {
      console.error('Refresh user error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, updateProfile, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
