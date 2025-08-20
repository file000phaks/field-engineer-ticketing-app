/**
 * @fileoverview Supabase client configuration and database helpers
 * @author Field Engineer Portal Team
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { config, envLog, isFeatureEnabled } from '@/config/environment';

// Validate Supabase configuration
if (!config.supabase.isConfigured) {
  if (config.isProduction) {
    throw new Error('Supabase configuration is required for production deployment. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
  } else {
    envLog('warn', 'Supabase not configured. Some features will use mock data.');
  }
}

// Global flag to track if Supabase is available
let supabaseAvailable = config.supabase.isConfigured;

/**
 * Function to check Supabase connectivity
 * @returns {Promise<boolean>} Whether Supabase is available
 */
const checkSupabaseConnection = async (): Promise<boolean> => {
  if (!config.supabase.isConfigured) {
    envLog('warn', 'Skipping Supabase connection check - not configured');
    return false;
  }

  try {
    const { data, error } = await supabase.from('user_profiles').select('count', { count: 'exact', head: true });
    if (error) throw error;
    envLog('log', 'Supabase connection verified');
    return true;
  } catch (error) {
    envLog('warn', 'Supabase connection failed, switching to fallback mode:', error);
    supabaseAvailable = false;
    return false;
  }
};

// Create Supabase clients only if configured
export const authClient = config.supabase.isConfigured ? createClient(config.supabase.url, config.supabase.anonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'field-engineer-portal-auth'
    }
  }
}) : null;

export const supabase = config.supabase.isConfigured ? createClient<Database>(config.supabase.url, config.supabase.anonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  }
}) : null;

// Check connection on module load only if configured
if (config.supabase.isConfigured) {
  checkSupabaseConnection();
} else {
  envLog('warn', 'Supabase client not initialized - configuration missing');
}

/**
 * Helper function to get current user profile
 * @param {any} [existingUser] - Existing user object to avoid redundant API calls
 * @returns {Promise<any|null>} User profile or null
 */
export const getCurrentUserProfile = async (existingUser?: any) => {
  if (!supabase) {
    envLog('warn', 'getCurrentUserProfile called but Supabase not configured');
    return null;
  }

  try {
    // Use existing user if provided to avoid redundant API calls
    let user = existingUser;

    if (!user) {
      const { data: { user: fetchedUser }, error } = await supabase.auth.getUser();
      if (error) {
        envLog('warn', 'Error fetching user:', error.message);
        return null;
      }
      user = fetchedUser;
    }

    if (!user) return null;

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      envLog('warn', 'Error fetching profile:', error.message);
      return null;
    }

    return profile;
  } catch (error) {
    envLog('warn', 'Error in getCurrentUserProfile:', error);
    return null;
  }
};

/**
 * Helper function to check if user has required role
 * @param {string[]} requiredRoles - Array of required roles
 * @returns {Promise<boolean>} Whether user has required role
 */
export const checkUserRole = async (requiredRoles: string[]): Promise<boolean> => {
  const profile = await getCurrentUserProfile();
  return profile && requiredRoles.includes(profile.role);
};

// Upload file to Supabase Storage
export const uploadFile = async (
  bucket: string,
  path: string,
  file: File,
  options?: { upsert?: boolean }
) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: options?.upsert || false,
    });

  if (error) throw error;
  return data;
};

// Get public URL for file
export const getFileUrl = (bucket: string, path: string) => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  
  return data.publicUrl;
};

// Delete file from storage
export const deleteFile = async (bucket: string, path: string) => {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) throw error;
};

// Subscribe to real-time changes
export const subscribeToTickets = (
  callback: (payload: any) => void,
  userId?: string
) => {
  let query = supabase
    .channel('tickets')
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'tickets' 
      }, 
      callback
    );

  return query.subscribe();
};

// Subscribe to notifications
export const subscribeToNotifications = (
  userId: string,
  callback: (payload: any) => void
) => {
  return supabase
    .channel('notifications')
    .on('postgres_changes', 
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, 
      callback
    )
    .subscribe();
};

// Import mock helpers for fallback
import { mockDbHelpers } from './mock-data';

/**
 * Wrapper function that automatically falls back to mock data when appropriate
 * @param {Function} supabaseOperation - Operation to try with Supabase
 * @param {Function} mockOperation - Fallback operation with mock data
 * @param {string} operationName - Name of the operation for logging
 * @returns {Promise<any>} Result from either Supabase or mock operation
 */
const withFallback = async (
  supabaseOperation: () => Promise<any>,
  mockOperation: () => Promise<any>,
  operationName: string
): Promise<any> => {
  // If Supabase is not configured or not available, use mock data
  if (!supabaseAvailable || !config.supabase.isConfigured) {
    if (isFeatureEnabled('enableMockFallback')) {
      envLog('log', `Using mock data for ${operationName} (Supabase unavailable)`);
      return await mockOperation();
    } else {
      throw new Error(`${operationName} failed: Supabase not available and mock fallback disabled`);
    }
  }

  try {
    return await supabaseOperation();
  } catch (error) {
    if (isFeatureEnabled('enableMockFallback')) {
      envLog('warn', `Supabase ${operationName} failed, falling back to mock data:`, error);
      supabaseAvailable = false; // Disable Supabase for future calls in this session
      return await mockOperation();
    } else {
      envLog('error', `Supabase ${operationName} failed and mock fallback disabled:`, error);
      throw error;
    }
  }
};

// Database helper functions
export const dbHelpers = {
  // Get tickets with full relations
  async getTicketsWithRelations(userId?: string, role?: string) {
    return await withFallback(
      async () => {
        let query = supabase
          .from('tickets')
          .select(`
            *,
            equipment(*),
            created_by_profile:user_profiles!tickets_created_by_fkey(*),
            assigned_to_profile:user_profiles!tickets_assigned_to_fkey(*),
            verified_by_profile:user_profiles!tickets_verified_by_fkey(*)
          `)
          .order('created_at', { ascending: false });

        // Apply role-based filtering (RLS will also apply)
        if (role === 'field_engineer' && userId) {
          query = query.or(`created_by.eq.${userId},assigned_to.eq.${userId}`);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
      },
      () => mockDbHelpers.getTicketsWithRelations(userId, role),
      'getTicketsWithRelations'
    );
  },

  // Get ticket activities
  async getTicketActivities(ticketId: string) {
    const { data, error } = await supabase
      .from('ticket_activities')
      .select(`
        *,
        user_profile:user_profiles(*)
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get ticket media
  async getTicketMedia(ticketId: string) {
    const { data, error } = await supabase
      .from('ticket_media')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get user notifications
  async getUserNotifications(userId: string, limit = 50) {
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        ticket:tickets(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  // Get dashboard stats
  async getDashboardStats(userId: string) {
    return await withFallback(
      async () => {
        const { data, error } = await supabase
          .rpc('get_dashboard_stats', { user_uuid: userId });

        if (error) throw error;
        return data?.[0];
      },
      () => mockDbHelpers.getDashboardStats(userId),
      'getDashboardStats'
    );
  },

  // Get equipment list
  async getEquipment() {
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data;
  },

  // Get users for assignment
  async getUsers(role?: string) {
    return await withFallback(
      async () => {
        let query = supabase
          .from('user_profiles')
          .select('*')
          .eq('is_active', true)
          .order('full_name');

        if (role) {
          query = query.eq('role', role);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
      },
      () => mockDbHelpers.getUsers(role),
      'getUsers'
    );
  },

  // Get user profile by ID
  async getUserProfile(userId: string) {
    return await withFallback(
      async () => {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) throw error;
        return data;
      },
      () => mockDbHelpers.getUserProfile(userId),
      'getUserProfile'
    );
  },

  // Update user profile
  async updateUserProfile(userId: string, updates: Partial<any>) {
    return await withFallback(
      async () => {
        const { data, error } = await supabase
          .from('user_profiles')
          .update(updates)
          .eq('id', userId)
          .select()
          .single();

        if (error) throw error;
        return data;
      },
      () => mockDbHelpers.updateUserProfile(userId, updates),
      'updateUserProfile'
    );
  },

  // Update user role
  async updateUserRole(userId: string, role: 'admin' | 'supervisor' | 'field_engineer') {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Deactivate user
  async deactivateUser(userId: string) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get user statistics
  async getUserStats(userId: string) {
    return await withFallback(
      async () => {
        console.log('Getting user stats for userId (Supabase):', userId);

        // Get tickets data
        const { data: ticketsData, error: ticketsError } = await supabase
          .from('tickets')
          .select('*')
          .or(`created_by.eq.${userId},assigned_to.eq.${userId}`);

        if (ticketsError) {
          console.error('Tickets query error:', {
            message: ticketsError instanceof Error ? ticketsError.message : String(ticketsError),
            stack: ticketsError instanceof Error ? ticketsError.stack : undefined,
            code: ticketsError?.code,
            details: ticketsError?.details,
            hint: ticketsError?.hint,
            userId: userId,
            error: ticketsError
          });
          throw ticketsError;
        }

        const tickets = ticketsData || [];
        console.log('Tickets fetched from Supabase:', tickets.length);

        const totalTickets = tickets.length;
        const completedTickets = tickets.filter(t =>
          ['resolved', 'verified', 'closed'].includes(t.status)
        ).length;

        // Calculate average resolution time
        const resolvedTickets = tickets.filter(t => t.resolved_at);
        const avgResolutionTime = resolvedTickets.length > 0
          ? resolvedTickets.reduce((acc, ticket) => {
              const resolutionTime = new Date(ticket.resolved_at!).getTime() - new Date(ticket.created_at).getTime();
              return acc + (resolutionTime / (1000 * 60 * 60)); // Convert to hours
            }, 0) / resolvedTickets.length
          : 0;

        // Get last activity
        let lastActivity = new Date().toISOString();
        try {
          const { data: activities, error: activitiesError } = await supabase
            .from('ticket_activities')
            .select('created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1);

          if (!activitiesError && activities?.[0]) {
            lastActivity = activities[0].created_at;
          }
        } catch (activitiesError) {
          console.log('Activities query failed, using current time');
        }

        console.log('User stats calculated from Supabase successfully');
        return {
          totalTickets,
          completedTickets,
          avgResolutionTime,
          lastActivity
        };
      },
      () => mockDbHelpers.getUserStats(userId),
      'getUserStats'
    );
  },

  // Time tracking functions
  async getTimeEntries(ticketId: string) {
    const { data, error } = await supabase
      .from('time_entries')
      .select(`
        *,
        user_profile:user_profiles(*)
      `)
      .eq('ticket_id', ticketId)
      .order('start_time', { ascending: false });

    if (error) throw error;
    return data;
  },

  async createTimeEntry(timeEntry: any) {
    const { data, error } = await supabase
      .from('time_entries')
      .insert(timeEntry)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateTimeEntry(entryId: string, updates: any) {
    const { data, error } = await supabase
      .from('time_entries')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', entryId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteTimeEntry(entryId: string) {
    const { error } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', entryId);

    if (error) throw error;
    return true;
  },

  async getUserTimeEntries(userId: string, limit = 50) {
    const { data, error } = await supabase
      .from('time_entries')
      .select(`
        *,
        ticket:tickets(title, status)
      `)
      .eq('user_id', userId)
      .order('start_time', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }
};

export default supabase;
