import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';
import { authService } from '@/services/authService';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, role?: 'student' | 'staff') => Promise<void>;
  signup: (email: string, password: string, role: 'student' | 'staff', additionalData: any) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initial user load
    loadUser();

    // Subscribe to auth state changes
    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
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
          console.log('[AuthContext] Profile result:', currentUser ? 'Success' : 'Missing');
          setUser(currentUser);
        } else {
          console.log('[AuthContext] No session user, clearing state');
          setUser(null);
        }
      } catch (error) {
        console.error('[AuthContext] Error in onAuthStateChange:', error);
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Initial load user error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, role?: 'student' | 'staff') => {
    const loggedInUser = await authService.login(email, password, role);
    setUser(loggedInUser);
  };

  const signup = async (
    email: string,
    password: string,
    role: 'student' | 'staff',
    additionalData: any
  ) => {
    const newUser = await authService.signup(email, password, role, additionalData);
    setUser(newUser);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return;
    const updatedUser = await authService.updateProfile(user.id, updates);
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
