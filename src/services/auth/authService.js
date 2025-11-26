import { supabase } from '../supabase/supabaseClient';

/**
 * Authentication Service
 * Handles user authentication and session management
 */
class AuthService {
  /**
   * Get the current authenticated user
   * @returns {Promise<Object|null>} User object or null if not authenticated
   */
  async getCurrentUser() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        // Handle network errors gracefully - don't log as error if it's a network issue
        if (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_NAME_NOT_RESOLVED')) {
          console.warn('Network error: Unable to connect to authentication service. Please check your internet connection.');
        } else {
          console.error('Error getting session:', error);
        }
        return null;
      }

      if (!session || !session.user) {
        return null;
      }

      // Get user profile from user_profiles table
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
      }

      // Merge profile data, ensuring avatar_url is properly extracted
      const avatarUrl = profile?.avatar_url || profile?.avatar || null;
      
      return {
        id: session.user.id,
        email: session.user.email,
        username: profile?.username || session.user.email?.split('@')[0] || 'User',
        avatar: avatarUrl,
        avatar_url: avatarUrl, // Ensure both properties are set
        ...profile, // Spread profile to include all other fields
        // Override with explicit values to ensure consistency
        avatar_url: avatarUrl
      };
    } catch (error) {
      console.error('Error in getCurrentUser:', error);
      return null;
    }
  }

  /**
   * Sign in with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<{user: Object|null, error: Error|null}>}
   */
  async signInWithPassword(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        // Handle network errors gracefully
        if (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_NAME_NOT_RESOLVED')) {
          const networkError = new Error('Network error: Unable to connect to authentication service. Please check your internet connection.');
          networkError.name = 'NetworkError';
          return { user: null, error: networkError };
        }
        return { user: null, error };
      }

      const user = await this.getCurrentUser();
      return { user, error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { user: null, error };
    }
  }

  /**
   * Sign up with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {string} username - Optional username
   * @returns {Promise<{user: Object|null, error: Error|null}>}
   */
  async signUp(email, password, username = null) {
    try {
      // Validate inputs
      if (!email || !password) {
        return { user: null, error: new Error('Email and password are required') };
      }

      if (password.length < 6) {
        return { user: null, error: new Error('Password must be at least 6 characters long') };
      }

      // Sign up user - don't include profile data in options to avoid trigger issues
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          // Remove data.username to avoid triggering database errors
          // Profile will be created separately if needed
          emailRedirectTo: window.location.origin
        }
      });

      if (error) {
        // Handle network errors gracefully
        if (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_NAME_NOT_RESOLVED')) {
          const networkError = new Error('Network error: Unable to connect to authentication service. Please check your internet connection.');
          networkError.name = 'NetworkError';
          return { user: null, error: networkError };
        }
        
        // Handle specific Supabase errors
        if (error.message?.includes('User already registered') || error.message?.includes('already exists')) {
          return { user: null, error: new Error('An account with this email already exists. Please sign in instead.') };
        }
        
        // Handle 500 errors with helpful message
        if (error.status === 500 || error.message?.includes('500') || error.message?.includes('Database error')) {
          return { 
            user: null, 
            error: new Error('Database error during signup. This may be due to a database trigger or constraint. Please check your Supabase configuration or contact support.') 
          };
        }
        
        // Return the error with a user-friendly message
        const friendlyError = new Error(error.message || 'Failed to create account. Please try again.');
        return { user: null, error: friendlyError };
      }

      // If user was created successfully, try to create profile (optional)
      // This is done separately to avoid triggering database errors during signup
      if (data.user) {
        // Wait a moment for any database triggers to complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Try to create profile, but don't fail signup if this fails
        try {
          // Check if profile already exists (might be created by trigger)
          const { data: existingProfile } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('id', data.user.id)
            .maybeSingle();
          
          // Only create if it doesn't exist
          if (!existingProfile) {
            const { error: profileError } = await supabase
              .from('user_profiles')
              .insert({
                id: data.user.id,
                username: username || email.split('@')[0],
                email: email.trim().toLowerCase()
              });

            if (profileError) {
              // Log but don't fail - profile might be created by trigger or later
              if (profileError.code === '23505' || profileError.message?.includes('duplicate')) {
                console.debug('Profile already exists (likely created by trigger)');
              } else {
                console.warn('Profile creation failed (non-critical):', profileError.message);
                // Profile can be created later - signup still succeeded
              }
            }
          }
        } catch (profileErr) {
          // Profile creation failed but signup succeeded - this is okay
          console.debug('Profile creation skipped (may be handled by trigger):', profileErr.message);
        }
      }

      // Return user data even if profile creation failed
      // The profile can be created on first login if needed
      if (data.user) {
        return { 
          user: {
            id: data.user.id,
            email: data.user.email,
            username: username || email.split('@')[0]
          }, 
          error: null 
        };
      }

      return { user: null, error: new Error('User creation failed') };
    } catch (error) {
      console.error('Sign up error:', error);
      
      // Provide user-friendly error message
      let errorMessage = error.message || 'An unexpected error occurred during sign up';
      if (error.status === 500 || error.message?.includes('500') || error.message?.includes('Database error')) {
        errorMessage = 'Database error: Please check your Supabase configuration. The issue may be with a database trigger or constraint.';
      }
      
      return { user: null, error: new Error(errorMessage) };
    }
  }

  /**
   * Sign in with OAuth provider
   * @param {string} provider - OAuth provider (e.g., 'google', 'github')
   * @returns {Promise<{error: Error|null}>}
   */
  async signInWithOAuth(provider) {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}`
        }
      });

      return { error };
    } catch (error) {
      console.error('OAuth sign in error:', error);
      return { error };
    }
  }

  /**
   * Sign out the current user
   * @returns {Promise<{error: Error|null}>}
   */
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error };
    }
  }

  /**
   * Get list of online users
   * @returns {Promise<Array>} Array of online user objects
   */
  async getOnlineUsers() {
    try {
      // Get users who were active in the last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, username, last_seen')
        .not('last_seen', 'is', null) // Exclude users with null last_seen
        .gte('last_seen', fiveMinutesAgo)
        .order('last_seen', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching online users:', error);
        // If error, try a simpler query without the null check
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('user_profiles')
          .select('id, username, last_seen')
          .gte('last_seen', fiveMinutesAgo)
          .order('last_seen', { ascending: false })
          .limit(50);
        
        if (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
          return [];
        }
        
        return (fallbackData || []).map(user => ({
          id: user.id,
          username: user.username || 'Anonymous',
          avatar: null,
          isOnline: true,
          lastSeen: user.last_seen,
          is_online: true,
          last_seen: user.last_seen
        }));
      }

      return (data || []).map(user => ({
        id: user.id,
        username: user.username || 'Anonymous',
        avatar: null, // avatar_url column doesn't exist in user_profiles table
        isOnline: true,
        lastSeen: user.last_seen,
        is_online: true,
        last_seen: user.last_seen
      }));
    } catch (error) {
      console.error('Error in getOnlineUsers:', error);
      return [];
    }
  }

  /**
   * Update user's last seen timestamp
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async updateLastSeen(userId) {
    try {
      await supabase
        .from('user_profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', userId);
    } catch (error) {
      console.error('Error updating last seen:', error);
    }
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updates - Profile updates
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async updateProfile(userId, updates) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { data: null, error };
    }
  }

  /**
   * Listen to auth state changes
   * @param {Function} callback - Callback function for auth state changes
   * @returns {Function} Unsubscribe function
   */
  onAuthStateChange(callback) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          const user = await this.getCurrentUser();
          callback(event, user);
        } else {
          callback(event, null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
