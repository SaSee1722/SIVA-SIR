import { getSharedSupabaseClient } from '@/template/core/client';
import { User, StudentProfile, StaffProfile } from '@/types';

export const authService = {
  async signup(
    email: string,
    password: string,
    role: 'student' | 'staff',
    additionalData: any
  ): Promise<User> {
    const supabase = getSharedSupabaseClient();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: additionalData.name,
          role: role,
          class: additionalData.class,
          year: additionalData.year,
          roll_number: additionalData.rollNumber,
          system_number: additionalData.systemNumber,
          department: additionalData.department,
        }
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Signup failed');

    // If session is null, email confirmation is required by Supabase settings
    if (!authData.session) {
      console.log('[AuthService] Signup successful, but verification required');
      throw new Error('verification_required');
    }

    // Profile is now created automatically by the database trigger
    // We return the user object
    return {
      id: authData.user.id,
      email,
      role,
      name: additionalData.name,
      ...additionalData,
      createdAt: new Date().toISOString(),
    } as User;
  },

  async login(email: string, password: string): Promise<User> {
    const supabase = getSharedSupabaseClient();

    console.log('[AuthService] Attempting login for:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[AuthService] Login error:', error.message);
      throw error;
    }

    if (!data.user) {
      throw new Error('Login failed: No user data returned');
    }

    console.log('[AuthService] Login successful, fetching profile for:', data.user.id);
    const user = await this.getUserProfile(data.user.id, data.user);
    if (!user) throw new Error('Profile not found');

    return user;
  },

  // Simple cache to prevent redundant profile fetches during login/auth events
  _profileCache: {} as Record<string, { data: User, timestamp: number }>,

  async getUserProfile(userId: string, authUser?: any): Promise<User | null> {
    const supabase = getSharedSupabaseClient();

    // Return from cache if recent (last 10 seconds)
    const cached = this._profileCache[userId];
    if (cached && Date.now() - cached.timestamp < 10000) {
      console.log('[AuthService] Returning cached profile for:', userId);
      return cached.data;
    }

    try {
      console.log('[AuthService] Fetching profile for ID:', userId);

      // Safety timeout of 3 seconds for the DB query
      const dbPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)
      );

      try {
        const result = await Promise.race([dbPromise, timeoutPromise]) as any;
        const { data: profile, error: profileError } = result;

        if (profile) {
          console.log('[AuthService] Profile found successfully. Name:', profile.name);
          const userObj = {
            ...profile,
            rollNumber: profile.roll_number,
            systemNumber: profile.system_number,
            createdAt: profile.created_at,
          } as User;

          // Cache the result
          this._profileCache[userId] = { data: userObj, timestamp: Date.now() };
          return userObj;
        }

        if (profileError) {
          console.warn('[AuthService] Profile fetch error:', profileError.message);
        }
      } catch (raceError) {
        console.warn('[AuthService] Profile fetch timed out or failed, using fallback:', raceError instanceof Error ? raceError.message : String(raceError));
      }

      // Fallback: Try to get data from user metadata (which is immediately available in the session)
      console.log('[AuthService] Using user metadata as fallback for user details');

      let userToUse = authUser;
      if (!userToUse) {
        const { data: { user } } = await supabase.auth.getUser();
        userToUse = user;
      }

      if (!userToUse || userToUse.id !== userId) {
        console.error('[AuthService] No fallback user found');
        return null;
      }

      const meta = userToUse.user_metadata || {};
      console.log('[AuthService] Recovered details from metadata:', meta.name || 'Unknown');

      const fallbackUser = {
        id: userToUse.id,
        email: userToUse.email || '',
        role: meta.role || 'student',
        name: meta.name || 'User',
        class: meta.class,
        year: meta.year,
        rollNumber: meta.roll_number,
        systemNumber: meta.system_number,
        department: meta.department,
        createdAt: userToUse.created_at,
      } as User;

      // Cache the fallback too
      this._profileCache[userId] = { data: fallbackUser, timestamp: Date.now() };
      return fallbackUser;

    } catch (err: any) {
      console.error('[AuthService] Unexpected error in getUserProfile:', err.message);
      return null;
    }
  },

  async getCurrentUser(): Promise<User | null> {
    const supabase = getSharedSupabaseClient();

    try {
      console.log('[AuthService] Checking for current session (with safety timeout)...');

      // Safety timeout of 5 seconds
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Session fetch timeout')), 5000)
      );

      const sessionPromise = supabase.auth.getSession();

      const sessionResult = await Promise.race([sessionPromise, timeoutPromise]) as any;
      const { data: { session }, error: sessionError } = sessionResult;

      if (sessionError) {
        console.error('[AuthService] Session error:', sessionError.message);
        return null;
      }

      if (!session?.user) {
        console.log('[AuthService] No active session found');
        return null;
      }

      // If email verification is required, don't return a user if unconfirmed
      if (!session.user.email_confirmed_at) {
        console.log('[AuthService] User session exists but email is not confirmed');
        return null;
      }

      return await this.getUserProfile(session.user.id, session.user);
    } catch (err) {
      console.warn('[AuthService] Session check skipped or failed:', err instanceof Error ? err.message : String(err));
      return null;
    }
  },

  async logout(): Promise<void> {
    const supabase = getSharedSupabaseClient();
    await supabase.auth.signOut();
  },

  async getAllUsers(): Promise<User[]> {
    const supabase = getSharedSupabaseClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*');

    if (error) throw error;
    return data.map(profile => ({
      ...profile,
      rollNumber: profile.roll_number,
      systemNumber: profile.system_number,
      createdAt: profile.created_at
    })) as User[];
  },

  async updateProfile(userId: string, updates: any): Promise<User> {
    const supabase = getSharedSupabaseClient();

    const mappedUpdates = { ...updates };
    if (mappedUpdates.rollNumber) {
      mappedUpdates.roll_number = mappedUpdates.rollNumber;
      delete mappedUpdates.rollNumber;
    }
    if (mappedUpdates.systemNumber) {
      mappedUpdates.system_number = mappedUpdates.systemNumber;
      delete mappedUpdates.systemNumber;
    }
    if (mappedUpdates.createdAt) {
      mappedUpdates.created_at = mappedUpdates.createdAt;
      delete mappedUpdates.createdAt;
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(mappedUpdates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    return {
      ...data,
      rollNumber: data.roll_number,
      systemNumber: data.system_number,
      createdAt: data.created_at
    } as User;
  },

  onAuthStateChange(callback: (event: any, session: any) => void) {
    const supabase = getSharedSupabaseClient();
    return supabase.auth.onAuthStateChange(callback);
  },
};

