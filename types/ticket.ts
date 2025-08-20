export interface Ticket {
  id: string;
  title: string;
  description: string;
  type: 'fault' | 'maintenance' | 'inspection' | 'upgrade';
  status: 'open' | 'assigned' | 'in_progress' | 'resolved' | 'verified' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  latitude?: number;
  longitude?: number;
  equipment_id?: string;

  // User references
  created_by: string;
  assigned_to?: string;
  verified_by?: string;

  // Timestamps
  created_at: Date;
  updated_at: Date;
  assigned_at?: Date;
  resolved_at?: Date;
  verified_at?: Date;
  due_date?: Date;

  // Additional fields
  estimated_hours?: number;
  actual_hours?: number;
  cost_estimate?: number;
  actual_cost?: number;

  // Relations
  equipment?: Equipment;
  created_by_profile?: UserProfile;
  assigned_to_profile?: UserProfile;
  verified_by_profile?: UserProfile;
  activities?: Activity[];
  media?: TicketMedia[];
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: 'admin' | 'supervisor' | 'field_engineer';
  department?: string;
  phone?: string;
  is_active: boolean;
  avatar_url?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Equipment {
  id: string;
  equipment_id: string;
  name: string;
  type?: string;
  location?: string;
  description?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TicketMedia {
  id: string;
  ticket_id: string;
  file_name: string;
  file_type: string;
  file_size?: number;
  storage_path: string;
  uploaded_by: string;
  created_at: Date;
}

export interface Activity {
  id: string;
  ticket_id: string;
  user_id: string;
  type: 'created' | 'assigned' | 'status_change' | 'comment' | 'media_upload' | 'verification';
  description: string;
  metadata?: Record<string, any>;
  created_at: Date;
  user_profile?: UserProfile;
}

export interface Notification {
  id: string;
  user_id: string;
  ticket_id?: string;
  type: 'ticket_assigned' | 'status_change' | 'overdue' | 'escalated' | 'verified';
  title: string;
  message: string;
  is_read: boolean;
  sent_email: boolean;
  sent_push: boolean;
  metadata?: Record<string, any>;
  created_at: Date;
  ticket?: Ticket;
}

export interface WorkSession {
  id: string;
  ticket_id: string;
  user_id: string;
  start_time: Date;
  end_time?: Date;
  description?: string;
  created_at: Date;
}
