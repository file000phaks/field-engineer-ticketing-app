import { useState, useEffect } from 'react';
import { supabase, dbHelpers, subscribeToTickets } from '@/lib/supabase';
import { mockDbHelpers } from '@/lib/mock-data';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationSystem } from '@/hooks/useNotificationSystem';
import { Ticket, Activity, TicketMedia } from '@/types/ticket';
import { toast } from '@/components/ui/use-toast';

export const useTickets = () => {
  const { user, profile } = useAuth();
  const { notifyTicketCreated, notifyTicketResolved, notifyTicketAssigned } = useNotificationSystem();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load tickets on mount and when user changes
  useEffect(() => {
    if (user && profile) {
      loadTickets();
    } else {
      setTickets([]);
      setLoading(false);
    }
  }, [user, profile]);

  // Subscribe to real-time ticket updates
  useEffect(() => {
    if (!user) return;

    const subscription = subscribeToTickets(
      (payload) => {
        console.log('Real-time ticket update:', payload);
        
        // Reload tickets when changes occur
        loadTickets();
      },
      user.id
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const loadTickets = async () => {
    if (!user || !profile) return;

    try {
      setLoading(true);
      setError(null);

      // Try real Supabase first, fallback to mock data
      let data;
      try {
        data = await dbHelpers.getTicketsWithRelations(user.id, profile.role);
      } catch (supabaseError) {
        console.log('Supabase unavailable, using mock data');
        data = await mockDbHelpers.getTicketsWithRelations(user.id, profile.role);
      }
      
      // Transform database format to frontend format
      const transformedTickets: Ticket[] = data.map(ticket => ({
        ...ticket,
        created_at: new Date(ticket.created_at),
        updated_at: new Date(ticket.updated_at),
        assigned_at: ticket.assigned_at ? new Date(ticket.assigned_at) : undefined,
        resolved_at: ticket.resolved_at ? new Date(ticket.resolved_at) : undefined,
        verified_at: ticket.verified_at ? new Date(ticket.verified_at) : undefined,
        due_date: ticket.due_date ? new Date(ticket.due_date) : undefined,
      }));
      
      setTickets(transformedTickets);
    } catch (err: any) {
      console.error('Error loading tickets:', {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        userId: user?.id,
        userRole: profile?.role,
        error: err
      });
      setError(err.message);
      toast({
        title: 'Error loading tickets',
        description: err.message || 'Failed to load tickets',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createTicket = async (ticketData: {
    title: string;
    description: string;
    type?: string;
    priority?: string;
    location: string;
    latitude?: number;
    longitude?: number;
    equipment_id?: string;
    due_date?: Date;
    estimated_hours?: number;
  }) => {
    if (!user) throw new Error('User not authenticated');

    try {
      let transformedTicket: Ticket;

      // Try real Supabase first, fallback to mock data
      try {
        const { data, error } = await supabase
          .from('tickets')
          .insert({
            ...ticketData,
            created_by: user.id,
            due_date: ticketData.due_date?.toISOString(),
          })
          .select(`
            *,
            equipment(*),
            created_by_profile:user_profiles!tickets_created_by_fkey(*),
            assigned_to_profile:user_profiles!tickets_assigned_to_fkey(*),
            verified_by_profile:user_profiles!tickets_verified_by_fkey(*)
          `)
          .single();

        if (error) throw error;

        transformedTicket = {
          ...data,
          created_at: new Date(data.created_at),
          updated_at: new Date(data.updated_at),
          assigned_at: data.assigned_at ? new Date(data.assigned_at) : undefined,
          resolved_at: data.resolved_at ? new Date(data.resolved_at) : undefined,
          verified_at: data.verified_at ? new Date(data.verified_at) : undefined,
          due_date: data.due_date ? new Date(data.due_date) : undefined,
        };
      } catch (supabaseError) {
        console.log('Supabase unavailable for ticket creation, using mock data');

        // Use mock data creation
        const mockTicket = await mockDbHelpers.createTicket(ticketData, user.id);
        transformedTicket = mockTicket as Ticket;
      }

      setTickets(prev => [transformedTicket, ...prev]);

      // Send notifications to supervisors about new ticket
      try {
        await notifyTicketCreated(transformedTicket);
      } catch (notificationError) {
        console.warn('Failed to send ticket creation notifications:', notificationError);
        // Don't fail the ticket creation if notifications fail
      }

      toast({
        title: 'Ticket created',
        description: 'Your ticket has been created successfully.',
      });

      return transformedTicket;
    } catch (error: any) {
      console.error('Error creating ticket:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        ticketData: ticketData,
        userId: user?.id,
        error: error
      });
      toast({
        title: 'Failed to create ticket',
        description: error.message || 'An error occurred while creating the ticket.',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const updateTicket = async (ticketId: string, updates: Partial<Ticket>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Transform dates to ISO strings for database
      const dbUpdates: any = { ...updates };
      if (dbUpdates.due_date) {
        dbUpdates.due_date = dbUpdates.due_date.toISOString();
      }
      if (dbUpdates.assigned_at) {
        dbUpdates.assigned_at = dbUpdates.assigned_at.toISOString();
      }
      if (dbUpdates.resolved_at) {
        dbUpdates.resolved_at = dbUpdates.resolved_at.toISOString();
      }
      if (dbUpdates.verified_at) {
        dbUpdates.verified_at = dbUpdates.verified_at.toISOString();
      }

      // Set timestamps for status changes
      if (updates.status === 'assigned' && !updates.assigned_at) {
        dbUpdates.assigned_at = new Date().toISOString();
      }
      if (updates.status === 'resolved' && !updates.resolved_at) {
        dbUpdates.resolved_at = new Date().toISOString();
      }
      if (updates.status === 'verified' && !updates.verified_at) {
        dbUpdates.verified_at = new Date().toISOString();
        dbUpdates.verified_by = user.id;
      }

      let data;
      try {
        const result = await supabase
          .from('tickets')
          .update(dbUpdates)
          .eq('id', ticketId)
          .select(`
            *,
            equipment(*),
            created_by_profile:user_profiles!tickets_created_by_fkey(*),
            assigned_to_profile:user_profiles!tickets_assigned_to_fkey(*),
            verified_by_profile:user_profiles!tickets_verified_by_fkey(*)
          `)
          .single();

        if (result.error) throw result.error;
        data = result.data;
      } catch (supabaseError) {
        console.log('Using mock data for ticket update');
        data = await mockDbHelpers.updateTicket(ticketId, updates);
      }

      const transformedTicket: Ticket = {
        ...data,
        created_at: new Date(data.created_at),
        updated_at: new Date(data.updated_at),
        assigned_at: data.assigned_at ? new Date(data.assigned_at) : undefined,
        resolved_at: data.resolved_at ? new Date(data.resolved_at) : undefined,
        verified_at: data.verified_at ? new Date(data.verified_at) : undefined,
        due_date: data.due_date ? new Date(data.due_date) : undefined,
      };

      setTickets(prev => prev.map(t => t.id === ticketId ? transformedTicket : t));

      // Send notifications based on the type of update
      try {
        if (updates.status === 'resolved') {
          await notifyTicketResolved(transformedTicket, user.id);
        }
        if (updates.assigned_to && updates.assigned_to !== transformedTicket.created_by) {
          await notifyTicketAssigned(transformedTicket, updates.assigned_to, user.id);
        }
      } catch (notificationError) {
        console.warn('Failed to send ticket update notifications:', notificationError);
        // Don't fail the ticket update if notifications fail
      }

      toast({
        title: 'Ticket updated',
        description: 'The ticket has been updated successfully.',
      });

      return transformedTicket;
    } catch (error: any) {
      console.error('Error updating ticket:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        ticketId: ticketId,
        updates: updates,
        userId: user?.id,
        error: error
      });
      toast({
        title: 'Failed to update ticket',
        description: error.message || 'An error occurred while updating the ticket.',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const deleteTicket = async (ticketId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Try real Supabase first, fallback to mock data
      try {
        const { error } = await supabase
          .from('tickets')
          .delete()
          .eq('id', ticketId);

        if (error) throw error;
      } catch (supabaseError) {
        console.log('Using mock data for ticket deletion');
        await mockDbHelpers.deleteTicket(ticketId);
      }

      setTickets(prev => prev.filter(t => t.id !== ticketId));

      toast({
        title: 'Ticket deleted',
        description: 'The ticket has been deleted successfully.',
      });
    } catch (error: any) {
      console.error('Error deleting ticket:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        ticketId: ticketId,
        userId: user?.id,
        error: error
      });
      toast({
        title: 'Failed to delete ticket',
        description: error.message || 'An error occurred while deleting the ticket.',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const assignTicket = async (ticketId: string, assignedTo: string | null) => {
    return updateTicket(ticketId, { 
      assigned_to: assignedTo,
      status: assignedTo ? 'assigned' : 'open',
      assigned_at: assignedTo ? new Date() : undefined
    });
  };

  const addComment = async (ticketId: string, comment: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('ticket_activities')
        .insert({
          ticket_id: ticketId,
          user_id: user.id,
          type: 'comment',
          description: comment,
        });

      if (error) throw error;

      toast({
        title: 'Comment added',
        description: 'Your comment has been added to the ticket.',
      });
    } catch (error: any) {
      console.error('Error adding comment:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        ticketId: ticketId,
        comment: comment,
        userId: user?.id,
        error: error
      });
      toast({
        title: 'Failed to add comment',
        description: error.message || 'An error occurred while adding the comment.',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const getTicketActivities = async (ticketId: string): Promise<Activity[]> => {
    try {
      // Try real Supabase first, fallback to mock data
      let data;
      try {
        data = await dbHelpers.getTicketActivities(ticketId);
      } catch (supabaseError) {
        console.log('Using mock activities data');
        data = await mockDbHelpers.getTicketActivities(ticketId);
      }

      return data.map((activity: any) => ({
        ...activity,
        created_at: new Date(activity.created_at),
      }));
    } catch (error: any) {
      console.error('Error loading ticket activities:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        ticketId: ticketId,
        error: error
      });
      toast({
        title: 'Failed to load activities',
        description: error.message || 'An error occurred while loading ticket activities.',
        variant: 'destructive'
      });
      return [];
    }
  };

  const getTicketMedia = async (ticketId: string): Promise<TicketMedia[]> => {
    try {
      const data = await dbHelpers.getTicketMedia(ticketId);
      
      return data.map(media => ({
        ...media,
        created_at: new Date(media.created_at),
      }));
    } catch (error: any) {
      console.error('Error loading ticket media:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        ticketId: ticketId,
        error: error
      });
      toast({
        title: 'Failed to load media',
        description: error.message || 'An error occurred while loading ticket media.',
        variant: 'destructive'
      });
      return [];
    }
  };

  // Helper functions for role-based filtering
  const getMyTickets = () => {
    if (!user) return [];
    return tickets.filter(ticket => ticket.created_by === user.id);
  };

  const getAssignedTickets = () => {
    if (!user) return [];
    return tickets.filter(ticket => ticket.assigned_to === user.id);
  };

  const getUnassignedTickets = () => {
    return tickets.filter(ticket => !ticket.assigned_to && ticket.status === 'open');
  };

  const getTicketsByStatus = (status: string) => {
    return tickets.filter(ticket => ticket.status === status);
  };

  const getTicketsByPriority = (priority: string) => {
    return tickets.filter(ticket => ticket.priority === priority);
  };

  const getOverdueTickets = () => {
    const now = new Date();
    return tickets.filter(ticket => 
      ticket.due_date && 
      ticket.due_date < now && 
      !['resolved', 'verified', 'closed'].includes(ticket.status)
    );
  };

  return {
    tickets,
    loading,
    error,
    createTicket,
    updateTicket,
    deleteTicket,
    assignTicket,
    addComment,
    getTicketActivities,
    getTicketMedia,
    loadTickets,
    // Helper functions
    getMyTickets,
    getAssignedTickets,
    getUnassignedTickets,
    getTicketsByStatus,
    getTicketsByPriority,
    getOverdueTickets,
  };
};
