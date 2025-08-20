// Mock data for demonstration when Supabase is unavailable
import { Ticket, UserProfile } from '@/types/ticket';

// Mock tickets data
export const mockTickets: Ticket[] = [
  {
    id: '1',
    ticket_number: 'TKT-001',
    title: 'Air Conditioning Unit Repair',
    description: 'HVAC unit in Building A is not cooling properly. Temperature readings show 28°C when should be 22°C.',
    type: 'maintenance',
    priority: 'high',
    status: 'open',
    created_by: '1',
    assigned_to: '3',
    equipment_id: '1',
    location: 'Building A - Floor 2',
    created_at: new Date('2024-01-15T09:00:00Z'),
    updated_at: new Date('2024-01-15T09:00:00Z'),
    due_date: new Date('2024-01-17T17:00:00Z'),
    estimated_hours: 4,
    actual_hours: 0,
    notes: 'Customer reports room too warm since yesterday',
    created_by_profile: {
      id: '1',
      email: 'admin@test.com',
      full_name: 'Admin User',
      role: 'admin',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    assigned_to_profile: {
      id: '3',
      email: 'engineer@test.com',
      full_name: 'Field Engineer',
      role: 'field_engineer',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    equipment: {
      id: '1',
      name: 'HVAC Unit A-2',
      type: 'air_conditioning',
      model: 'Carrier 30XA',
      serial_number: 'CAR-2024-001',
      location: 'Building A - Floor 2',
      installation_date: new Date('2023-03-15'),
      warranty_expiry: new Date('2026-03-15'),
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  },
  {
    id: '2',
    ticket_number: 'TKT-002',
    title: 'Elevator Inspection',
    description: 'Monthly safety inspection for elevator in Building B',
    type: 'inspection',
    priority: 'medium',
    status: 'in_progress',
    created_by: '2',
    assigned_to: '3',
    equipment_id: '2',
    location: 'Building B - Lobby',
    created_at: new Date('2024-01-14T10:30:00Z'),
    updated_at: new Date('2024-01-15T08:30:00Z'),
    assigned_at: new Date('2024-01-14T11:00:00Z'),
    due_date: new Date('2024-01-16T15:00:00Z'),
    estimated_hours: 2,
    actual_hours: 1.5,
    notes: 'Routine monthly inspection as per safety regulations',
    created_by_profile: {
      id: '2',
      email: 'supervisor@test.com',
      full_name: 'Supervisor User',
      role: 'supervisor',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    assigned_to_profile: {
      id: '3',
      email: 'engineer@test.com',
      full_name: 'Field Engineer',
      role: 'field_engineer',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    equipment: {
      id: '2',
      name: 'Elevator B-1',
      type: 'elevator',
      model: 'Otis Gen2',
      serial_number: 'OTIS-2023-002',
      location: 'Building B - Lobby',
      installation_date: new Date('2023-06-20'),
      warranty_expiry: new Date('2025-06-20'),
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  },
  {
    id: '3',
    ticket_number: 'TKT-003',
    title: 'Fire Safety System Check',
    description: 'Quarterly fire safety system inspection and testing',
    type: 'inspection',
    priority: 'high',
    status: 'resolved',
    created_by: '1',
    assigned_to: '3',
    verified_by: '2',
    equipment_id: '3',
    location: 'Building C - All Floors',
    created_at: new Date('2024-01-10T14:00:00Z'),
    updated_at: new Date('2024-01-12T16:30:00Z'),
    assigned_at: new Date('2024-01-10T14:30:00Z'),
    resolved_at: new Date('2024-01-12T15:00:00Z'),
    verified_at: new Date('2024-01-12T16:30:00Z'),
    due_date: new Date('2024-01-15T17:00:00Z'),
    estimated_hours: 6,
    actual_hours: 5.5,
    notes: 'All systems functioning properly. Minor sensor calibration performed.',
    created_by_profile: {
      id: '1',
      email: 'admin@test.com',
      full_name: 'Admin User',
      role: 'admin',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    assigned_to_profile: {
      id: '3',
      email: 'engineer@test.com',
      full_name: 'Field Engineer',
      role: 'field_engineer',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    verified_by_profile: {
      id: '2',
      email: 'supervisor@test.com',
      full_name: 'Supervisor User',
      role: 'supervisor',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    equipment: {
      id: '3',
      name: 'Fire Safety System C',
      type: 'fire_safety',
      model: 'Honeywell FS90',
      serial_number: 'HON-2023-003',
      location: 'Building C - All Floors',
      installation_date: new Date('2023-01-10'),
      warranty_expiry: new Date('2028-01-10'),
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }
];

// Mock users data
export const mockUsers: UserProfile[] = [
  {
    id: '1',
    email: 'admin@test.com',
    full_name: 'Admin User',
    role: 'admin',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    email: 'supervisor@test.com',
    full_name: 'Supervisor User',
    role: 'supervisor',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '3',
    email: 'engineer@test.com',
    full_name: 'Field Engineer',
    role: 'field_engineer',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Mock dashboard stats
export const mockDashboardStats = {
  total_tickets: mockTickets.length,
  open_tickets: mockTickets.filter(t => t.status === 'open').length,
  in_progress_tickets: mockTickets.filter(t => t.status === 'in_progress').length,
  resolved_tickets: mockTickets.filter(t => t.status === 'resolved').length,
  overdue_tickets: mockTickets.filter(t => t.due_date && new Date(t.due_date) < new Date() && !['resolved', 'verified', 'closed'].includes(t.status)).length
};

// Store tickets in memory for mock operations
let currentMockTickets = [...mockTickets];
let nextTicketId = 4;

// Mock data helper functions
export const mockDbHelpers = {
  async getTicketsWithRelations(userId?: string, role?: string) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // Filter tickets based on role
    if (role === 'field_engineer' && userId) {
      return currentMockTickets.filter(t => t.created_by === userId || t.assigned_to === userId);
    }

    return currentMockTickets;
  },

  async createTicket(ticketData: any, userId: string) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 400));

    const currentUser = mockUsers.find(u => u.id === userId);
    if (!currentUser) {
      throw new Error('User not found');
    }

    const newTicket = {
      id: String(nextTicketId++),
      ticket_number: `TKT-${String(nextTicketId - 1).padStart(3, '0')}`,
      title: ticketData.title,
      description: ticketData.description,
      type: ticketData.type || 'maintenance',
      priority: ticketData.priority || 'medium',
      status: 'open' as const,
      created_by: userId,
      assigned_to: null,
      equipment_id: ticketData.equipment_id || null,
      location: ticketData.location,
      created_at: new Date(),
      updated_at: new Date(),
      due_date: ticketData.due_date || null,
      estimated_hours: ticketData.estimated_hours || null,
      actual_hours: 0,
      notes: null,
      created_by_profile: currentUser,
      assigned_to_profile: null,
      verified_by_profile: null,
      equipment: ticketData.equipment_id ? {
        id: ticketData.equipment_id,
        name: 'Mock Equipment',
        type: 'general',
        model: 'Generic Model',
        serial_number: 'MOCK-001',
        location: ticketData.location,
        installation_date: new Date(),
        warranty_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } : null
    };

    currentMockTickets.unshift(newTicket);
    return newTicket;
  },

  async getTicketActivities(ticketId: string) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));

    // Mock activities for tickets
    const activities = [
      {
        id: `act-${ticketId}-1`,
        ticket_id: ticketId,
        user_id: '1',
        type: 'created' as const,
        description: 'Ticket created',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        user_profile: mockUsers[0]
      },
      {
        id: `act-${ticketId}-2`,
        ticket_id: ticketId,
        user_id: '2',
        type: 'assigned' as const,
        description: 'Ticket assigned to Field Engineer',
        created_at: new Date(Date.now() - 23 * 60 * 60 * 1000), // 23 hours ago
        user_profile: mockUsers[1]
      },
      {
        id: `act-${ticketId}-3`,
        ticket_id: ticketId,
        user_id: '3',
        type: 'comment' as const,
        description: 'Started investigating the issue',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        user_profile: mockUsers[2]
      }
    ];

    return activities;
  },

  async deleteTicket(ticketId: string) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const initialLength = currentMockTickets.length;
    currentMockTickets = currentMockTickets.filter(t => t.id !== ticketId);

    if (currentMockTickets.length === initialLength) {
      throw new Error('Ticket not found');
    }

    return { success: true };
  },

  async updateTicket(ticketId: string, updates: any) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));

    const ticketIndex = currentMockTickets.findIndex(t => t.id === ticketId);
    if (ticketIndex === -1) {
      throw new Error('Ticket not found');
    }

    // Update the ticket
    const updatedTicket = {
      ...currentMockTickets[ticketIndex],
      ...updates,
      updated_at: new Date()
    };

    // If assigning to someone, fetch the profile
    if (updates.assigned_to) {
      const assignedProfile = mockUsers.find(u => u.id === updates.assigned_to);
      if (assignedProfile) {
        updatedTicket.assigned_to_profile = assignedProfile;
      }
    }

    currentMockTickets[ticketIndex] = updatedTicket;
    return updatedTicket;
  },

  async assignTicket(ticketId: string, assignedTo: string | null) {
    return this.updateTicket(ticketId, {
      assigned_to: assignedTo,
      status: assignedTo ? 'assigned' : 'open',
      assigned_at: assignedTo ? new Date() : null
    });
  },

  async getDashboardStats(userId: string) {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockDashboardStats;
  },

  async getUsers(role?: string) {
    await new Promise(resolve => setTimeout(resolve, 200));
    if (role) {
      return mockUsers.filter(u => u.role === role);
    }
    return mockUsers;
  },

  async getEquipment() {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockTickets.map(t => t.equipment).filter(e => e);
  },

  async getUserProfile(userId: string) {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockUsers.find(u => u.id === userId) || null;
  },

  async updateUserProfile(userId: string, updates: Partial<any>) {
    await new Promise(resolve => setTimeout(resolve, 200));
    const userIndex = mockUsers.findIndex(u => u.id === userId);
    if (userIndex >= 0) {
      mockUsers[userIndex] = { ...mockUsers[userIndex], ...updates };
      return mockUsers[userIndex];
    }
    return null;
  },

  async getUserStats(userId: string) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));

    console.log('Getting user stats from mock data for userId:', userId);

    // Filter tickets for this user
    const userTickets = currentMockTickets.filter(t =>
      t.created_by === userId || t.assigned_to === userId
    );

    const totalTickets = userTickets.length;
    const completedTickets = userTickets.filter(t =>
      ['resolved', 'verified', 'closed'].includes(t.status)
    ).length;

    // Calculate average resolution time
    const resolvedTickets = userTickets.filter(t => t.status === 'resolved' || t.status === 'verified' || t.status === 'closed');
    const avgResolutionTime = resolvedTickets.length > 0
      ? resolvedTickets.reduce((acc, ticket) => {
          // Mock resolution time calculation (2-24 hours)
          const mockResolutionHours = Math.random() * 22 + 2;
          return acc + mockResolutionHours;
        }, 0) / resolvedTickets.length
      : 0;

    const lastActivity = new Date().toISOString();

    console.log('Mock user stats calculated:', { totalTickets, completedTickets, avgResolutionTime });

    return {
      totalTickets,
      completedTickets,
      avgResolutionTime,
      lastActivity
    };
  }
};
