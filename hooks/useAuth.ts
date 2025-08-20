import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, authClient, getCurrentUserProfile } from '@/lib/supabase';
import { minimalSupabase } from '@/lib/supabase-minimal';
import { mockAuth, getCurrentUserProfileMock } from '@/lib/mock-auth';
import { UserProfile } from '@/types/ticket';
import { toast } from '@/components/ui/use-toast';
import { securityService } from '@/lib/security';
import { auditService, AUDIT_ACTIONS, AUDIT_RESOURCES } from '@/lib/audit';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  initialized: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    initialized: false
  });

  useEffect(() => {
    let mounted = true;

    // Initialize security service
    securityService.initialize().catch(console.error);

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await mockAuth.getSession();
        
        if (error) {
          console.error('Error getting session:', {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            code: error?.code,
            status: error?.status,
            error: error
          });
          if (mounted) {
            setState(prev => ({ ...prev, loading: false, initialized: true }));
          }
          return;
        }

        if (session?.user && mounted) {
          const profile = await getCurrentUserProfileMock(session.user);
          setState({
            user: session.user,
            profile,
            loading: false,
            initialized: true
          });
        } else if (mounted) {
          setState({
            user: null,
            profile: null,
            loading: false,
            initialized: true
          });
        }
      } catch (error) {
        console.error('Error in getInitialSession:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          error: error
        });
        if (mounted) {
          setState({
            user: null,
            profile: null,
            loading: false,
            initialized: true
          });
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = mockAuth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('Auth state changed:', event, session?.user?.email);

        if (session?.user) {
          try {
            const profile = await getCurrentUserProfile(session.user);
            setState({
              user: session.user,
              profile,
              loading: false,
              initialized: true
            });
          } catch (error) {
            console.error('Error getting profile after auth change:', {
              message: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
              userId: session?.user?.id,
              userEmail: session?.user?.email,
              error: error
            });
            setState({
              user: session.user,
              profile: null,
              loading: false,
              initialized: true
            });
          }
        } else {
          setState({
            user: null,
            profile: null,
            loading: false,
            initialized: true
          });
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, loading: true }));

      // Add a small delay to prevent race conditions
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log('Using mock authentication system...');
      const { data, error } = await mockAuth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error details:', {
          message: error.message,
          status: error.status,
          name: error.name
        });
        throw error;
      }

      // Check if user is active
      if (data.user) {
        const profile = await getCurrentUserProfileMock(data.user);
        if (profile && !profile.is_active) {
          await supabase.auth.signOut();

          // Temporarily disabled audit logging to debug response body issue
          // await auditService.logEvent(
          //   AUDIT_ACTIONS.UNAUTHORIZED_ACCESS,
          //   AUDIT_RESOURCES.USER,
          //   { reason: 'inactive_account', email },
          //   profile.id,
          //   profile.id,
          //   email
          // );

          throw new Error('Your account has been deactivated. Please contact an administrator.');
        }

        // Start inactivity timer
        securityService.startInactivityTimer(() => {
          signOut();
          toast({
            title: 'Session expired',
            description: 'You have been logged out due to inactivity.',
            variant: 'default'
          });
        });

        // Temporarily disabled audit logging to debug response body issue
        // await auditService.logEvent(
        //   AUDIT_ACTIONS.USER_LOGIN,
        //   AUDIT_RESOURCES.USER,
        //   { success: true, userAgent: navigator.userAgent },
        //   profile?.id,
        //   profile?.id,
        //   email
        // );
      }

      toast({
        title: 'Welcome back!',
        description: 'You have been signed in successfully.',
      });

      return data;
    } catch (error: any) {
      console.error('Sign in error:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        code: error?.code,
        status: error?.status,
        email: email,
        error: error
      });
      setState(prev => ({ ...prev, loading: false }));

      toast({
        title: 'Sign in failed',
        description: error.message || 'An error occurred during sign in.',
        variant: 'destructive'
      });

      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      setState(prev => ({ ...prev, loading: true }));

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        // Audit failed signup attempt
        await auditService.logEvent(
          AUDIT_ACTIONS.USER_SIGNUP,
          AUDIT_RESOURCES.USER,
          { success: false, error: error.message, email },
          undefined,
          undefined,
          email
        );
        throw error;
      }

      // Audit successful signup
      if (data.user) {
        await auditService.logEvent(
          AUDIT_ACTIONS.USER_SIGNUP,
          AUDIT_RESOURCES.USER,
          { success: true, fullName },
          data.user.id,
          data.user.id,
          email
        );
      }

      toast({
        title: 'Account created!',
        description: 'Please check your email to verify your account.',
      });

      return data;
    } catch (error: any) {
      console.error('Sign up error:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        code: error?.code,
        status: error?.status,
        email: email,
        error: error
      });
      setState(prev => ({ ...prev, loading: false }));

      toast({
        title: 'Sign up failed',
        description: error.message || 'An error occurred during sign up.',
        variant: 'destructive'
      });

      throw error;
    }
  };

  /**
   * Signs out the user and optionally calls a callback function
   * @param {Function} [callback] - Optional callback to execute after successful sign out
   */
  const signOut = async (callback?: () => void) => {
    try {
      setState(prev => ({ ...prev, loading: true }));

      // Audit logout
      if (state.user && state.profile) {
        await auditService.logEvent(
          AUDIT_ACTIONS.USER_LOGOUT,
          AUDIT_RESOURCES.USER,
          { reason: 'user_initiated' },
          state.profile.id,
          state.profile.id,
          state.user.email
        );
      }

      // Stop inactivity timer
      securityService.stopInactivityTimer();

      // Clear secure storage
      securityService.clearSecureStorage();

      const { error } = await mockAuth.signOut();

      if (error) {
        throw error;
      }

      toast({
        title: 'Signed out',
        description: 'You have been signed out successfully.',
      });

      // Execute callback if provided (e.g., for navigation)
      if (callback) {
        callback();
      }
    } catch (error: any) {
      console.error('Sign out error:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userId: state.user?.id,
        userEmail: state.user?.email,
        error: error
      });
      setState(prev => ({ ...prev, loading: false }));

      toast({
        title: 'Sign out failed',
        description: error.message || 'An error occurred during sign out.',
        variant: 'destructive'
      });

      throw error;
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!state.user) throw new Error('No user logged in');
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', state.user.id)
        .select()
        .single();

      if (error) throw error;

      setState(prev => ({
        ...prev,
        profile: data
      }));

      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      });

      return data;
    } catch (error: any) {
      console.error('Profile update error:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userId: state.user?.id,
        updates: updates,
        error: error
      });
      
      toast({
        title: 'Update failed',
        description: error.message || 'Failed to update profile.',
        variant: 'destructive'
      });
      
      throw error;
    }
  };

  const refreshProfile = async () => {
    if (!state.user) return null;
    
    try {
      const profile = await getCurrentUserProfile();
      setState(prev => ({ ...prev, profile }));
      return profile;
    } catch (error) {
      console.error('Error refreshing profile:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userId: state.user?.id,
        error: error
      });
      return null;
    }
  };

  // Helper functions for role checking
  const isAdmin = state.profile?.role === 'admin';
  const isSupervisor = state.profile?.role === 'supervisor';
  const isFieldEngineer = state.profile?.role === 'field_engineer';
  const hasRole = (roles: string[]) => state.profile?.role && roles.includes(state.profile.role);

  return {
    user: state.user,
    profile: state.profile,
    loading: state.loading,
    initialized: state.initialized,
    isAuthenticated: !!state.user,
    isAdmin,
    isSupervisor,
    isFieldEngineer,
    hasRole,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshProfile,
  };
}
