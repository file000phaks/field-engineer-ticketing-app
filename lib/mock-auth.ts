// Mock authentication system for development when Supabase is not available
interface MockUser {
  id: string;
  email: string;
  created_at: string;
}

interface MockProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'supervisor' | 'field_engineer';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Mock users database (using lowercase keys for case-insensitive lookup)
const mockUsers = new Map<string, { user: MockUser; profile: MockProfile; password: string }>([
  ['admin@test.com', {
    user: {
      id: '1',
      email: 'admin@test.com',
      created_at: new Date().toISOString()
    },
    profile: {
      id: '1',
      email: 'admin@test.com',
      full_name: 'Admin User',
      role: 'admin',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    password: 'admin123'
  }],
  ['supervisor@test.com', {
    user: {
      id: '2',
      email: 'supervisor@test.com',
      created_at: new Date().toISOString()
    },
    profile: {
      id: '2',
      email: 'supervisor@test.com',
      full_name: 'Supervisor User',
      role: 'supervisor',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    password: 'supervisor123'
  }],
  ['engineer@test.com', {
    user: {
      id: '3',
      email: 'engineer@test.com',
      created_at: new Date().toISOString()
    },
    profile: {
      id: '3',
      email: 'engineer@test.com',
      full_name: 'Field Engineer',
      role: 'field_engineer',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    password: 'engineer123'
  }]
]);

// Mock session storage
let currentSession: { user: MockUser; access_token: string } | null = null;

export const mockAuth = {
  async signInWithPassword(credentials: { email: string; password: string }) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('Mock auth attempt:', {
      originalEmail: credentials.email,
      normalizedEmail: credentials.email.toLowerCase().trim(),
      availableEmails: Array.from(mockUsers.keys()),
      availableNormalized: Array.from(mockUsers.keys()).map(k => k.toLowerCase())
    });

    // Make email lookup case-insensitive
    const email = credentials.email.toLowerCase().trim();

    // Find user with case-insensitive email matching
    let mockUser = null;
    for (const [key, user] of mockUsers.entries()) {
      if (key.toLowerCase() === email) {
        mockUser = user;
        break;
      }
    }

    if (!mockUser) {
      console.log('Available test accounts:', Array.from(mockUsers.keys()));
      throw new Error(`Invalid email. Available test accounts: ${Array.from(mockUsers.keys()).join(', ')}`);
    }

    if (mockUser.password !== credentials.password) {
      console.log('Password mismatch for', email, 'expected:', mockUser.password);
      throw new Error('Invalid password');
    }
    
    if (!mockUser.profile.is_active) {
      throw new Error('Account is deactivated');
    }
    
    const session = {
      user: mockUser.user,
      access_token: `mock_token_${Date.now()}`
    };
    
    currentSession = session;
    localStorage.setItem('mock_session', JSON.stringify(session));
    
    return {
      data: {
        user: mockUser.user,
        session
      },
      error: null
    };
  },

  async signOut() {
    currentSession = null;
    localStorage.removeItem('mock_session');
    return { error: null };
  },

  async getSession() {
    if (currentSession) {
      return { data: { session: currentSession }, error: null };
    }
    
    const stored = localStorage.getItem('mock_session');
    if (stored) {
      currentSession = JSON.parse(stored);
      return { data: { session: currentSession }, error: null };
    }
    
    return { data: { session: null }, error: null };
  },

  async getUser() {
    const session = await this.getSession();
    return {
      data: { user: session.data.session?.user || null },
      error: null
    };
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    // Simple implementation - in reality you'd want proper event handling
    return {
      data: {
        subscription: {
          unsubscribe: () => {}
        }
      }
    };
  }
};

export const getCurrentUserProfileMock = async (existingUser?: MockUser) => {
  const user = existingUser || currentSession?.user;
  if (!user) return null;
  
  const mockUser = mockUsers.get(user.email);
  return mockUser?.profile || null;
};
