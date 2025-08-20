import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTickets } from '@/hooks/useTickets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  Timer,
  TrendingUp,
  Award,
  Clock,
  CheckCircle,
  AlertTriangle,
  Search,
  Filter,
  Calendar,
  MapPin,
  BarChart3,
  UserCheck,
  Activity,
  Target
} from 'lucide-react';
import { dbHelpers } from '@/lib/supabase';
import { mockDbHelpers } from '@/lib/mock-data';
import { UserProfile } from '@/types/ticket';
import { cn } from '@/lib/utils';

interface EngineerPerformance {
  engineer: UserProfile;
  totalAssigned: number;
  activeTickets: number;
  completedTickets: number;
  avgResolutionTime: number;
  totalTimeSpent: number;
  completionRate: number;
  workload: 'low' | 'medium' | 'high' | 'overloaded';
  weeklyPerformance: {
    week: string;
    completed: number;
    timeSpent: number;
  }[];
}

interface TimeEntry {
  id: string;
  ticket_id: string;
  engineer_id: string;
  start_time: string;
  end_time?: string;
  description?: string;
  duration_minutes?: number;
}

export default function EngineersPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { tickets } = useTickets();
  const [engineers, setEngineers] = useState<UserProfile[]>([]);
  const [engineerPerformance, setEngineerPerformance] = useState<EngineerPerformance[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWorkload, setFilterWorkload] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');

  const isAdmin = profile?.role === 'admin';
  const isSupervisor = profile?.role === 'supervisor';
  const isFieldEngineer = profile?.role === 'field_engineer';
  const canViewAll = isAdmin || isSupervisor;

  const loadEngineersData = useCallback(async () => {
    try {
      console.log('Loading engineers data...');

      // Load engineers
      console.log('Fetching field engineers...');
      let engineersData;
      try {
        engineersData = await dbHelpers.getUsers('field_engineer');
        console.log('Engineers loaded from Supabase:', engineersData?.length || 0);
      } catch (supabaseError) {
        console.log('Supabase failed, falling back to mock data:', supabaseError);
        engineersData = await mockDbHelpers.getUsers('field_engineer');
        console.log('Engineers loaded from mock:', engineersData?.length || 0);
      }
      setEngineers(engineersData || []);

      // Load time entries (mock for now)
      console.log('Creating mock time entries...');
      const mockTimeEntries: TimeEntry[] = tickets.flatMap(ticket => 
        ticket.assigned_to ? [{
          id: `time_${ticket.id}`,
          ticket_id: ticket.id,
          engineer_id: ticket.assigned_to,
          start_time: ticket.created_at,
          end_time: ticket.resolved_at || undefined,
          description: `Work on ${ticket.title}`,
          duration_minutes: ticket.resolved_at 
            ? Math.round((new Date(ticket.resolved_at).getTime() - new Date(ticket.created_at).getTime()) / (1000 * 60))
            : undefined
        }] : []
      );
      setTimeEntries(mockTimeEntries);
      console.log('Time entries created:', mockTimeEntries.length);

      // Calculate performance metrics
      console.log('Calculating performance metrics...');
      const performance = (engineersData || []).map(engineer => {
        const assignedTickets = tickets.filter(t => t.assigned_to === engineer.id);
        const completedTickets = assignedTickets.filter(t => ['resolved', 'verified', 'closed'].includes(t.status));
        const activeTickets = assignedTickets.filter(t => ['assigned', 'in_progress'].includes(t.status));
        
        const engineerTimeEntries = mockTimeEntries.filter(te => te.engineer_id === engineer.id);
        const totalTimeSpent = engineerTimeEntries.reduce((acc, entry) => acc + (entry.duration_minutes || 0), 0);
        
        const avgResolutionTime = completedTickets.length > 0
          ? completedTickets.reduce((acc, ticket) => {
              if (ticket.resolved_at) {
                const resolutionTime = new Date(ticket.resolved_at).getTime() - new Date(ticket.created_at).getTime();
                return acc + (resolutionTime / (1000 * 60 * 60)); // Convert to hours
              }
              return acc;
            }, 0) / completedTickets.length
          : 0;

        const completionRate = assignedTickets.length > 0 ? (completedTickets.length / assignedTickets.length) * 100 : 0;

        // Determine workload
        let workload: 'low' | 'medium' | 'high' | 'overloaded' = 'low';
        if (activeTickets.length > 8) workload = 'overloaded';
        else if (activeTickets.length > 5) workload = 'high';
        else if (activeTickets.length > 2) workload = 'medium';

        // Generate weekly performance (last 4 weeks)
        const weeklyPerformance = Array.from({ length: 4 }, (_, i) => {
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 7);

          const weekCompleted = completedTickets.filter(t => 
            t.resolved_at && 
            new Date(t.resolved_at) >= weekStart && 
            new Date(t.resolved_at) < weekEnd
          ).length;

          const weekTimeEntries = engineerTimeEntries.filter(te => 
            te.end_time && 
            new Date(te.end_time) >= weekStart && 
            new Date(te.end_time) < weekEnd
          );
          const weekTimeSpent = weekTimeEntries.reduce((acc, entry) => acc + (entry.duration_minutes || 0), 0);

          return {
            week: `Week ${i + 1}`,
            completed: weekCompleted,
            timeSpent: weekTimeSpent
          };
        }).reverse();

        return {
          engineer,
          totalAssigned: assignedTickets.length,
          activeTickets: activeTickets.length,
          completedTickets: completedTickets.length,
          avgResolutionTime,
          totalTimeSpent,
          completionRate,
          workload,
          weeklyPerformance
        };
      });

      setEngineerPerformance(performance);
      console.log('Performance metrics calculated:', performance.length);
      console.log('Engineers data loading completed successfully');
    } catch (error) {
      console.error('Error loading engineers data:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        error: error
      });
    } finally {
      setLoading(false);
    }
  }, [tickets]);

  useEffect(() => {
    loadEngineersData();
  }, [loadEngineersData]);

  // Check permissions after all hooks
  if (!profile || !['admin', 'supervisor'].includes(profile.role)) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6 text-center">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">Only administrators and supervisors can view engineer performance.</p>
        <Button onClick={() => navigate('/')} className="mt-4">
          Return to Dashboard
        </Button>
      </div>
    );
  }

  // Filter and sort engineers
  const filteredEngineers = engineerPerformance.filter(ep => {
    const matchesSearch = ep.engineer.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ep.engineer.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesWorkload = filterWorkload === 'all' || ep.workload === filterWorkload;
    return matchesSearch && matchesWorkload;
  });

  const sortedEngineers = [...filteredEngineers].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return (a.engineer.full_name || a.engineer.email).localeCompare(b.engineer.full_name || b.engineer.email);
      case 'workload':
        return b.activeTickets - a.activeTickets;
      case 'performance':
        return b.completionRate - a.completionRate;
      case 'time':
        return b.totalTimeSpent - a.totalTimeSpent;
      default:
        return 0;
    }
  });

  const getWorkloadColor = (workload: string) => {
    switch (workload) {
      case 'low': return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200';
      case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-200';
      case 'overloaded': return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-8 bg-muted rounded mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 pb-20">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6" />
          Engineer Performance
        </h1>
        <p className="text-muted-foreground">
          Track engineer workloads, performance metrics, and time management
        </p>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search engineers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterWorkload} onValueChange={setFilterWorkload}>
              <SelectTrigger className="w-full md:w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workloads</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="overloaded">Overloaded</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Sort by Name</SelectItem>
                <SelectItem value="workload">Sort by Workload</SelectItem>
                <SelectItem value="performance">Sort by Performance</SelectItem>
                <SelectItem value="time">Sort by Time Spent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold">{engineers.length}</div>
            <div className="text-sm text-muted-foreground">Total Engineers</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Activity className="w-6 h-6 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold">
              {engineers.filter(e => e.is_active).length}
            </div>
            <div className="text-sm text-muted-foreground">Active</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-red-600" />
            <div className="text-2xl font-bold">
              {engineerPerformance.filter(ep => ep.workload === 'overloaded').length}
            </div>
            <div className="text-sm text-muted-foreground">Overloaded</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Timer className="w-6 h-6 mx-auto mb-2 text-purple-600" />
            <div className="text-2xl font-bold">
              {formatTime(engineerPerformance.reduce((acc, ep) => acc + ep.totalTimeSpent, 0))}
            </div>
            <div className="text-sm text-muted-foreground">Total Time</div>
          </CardContent>
        </Card>
      </div>

      {/* Engineers List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sortedEngineers.map((ep) => (
          <Card key={ep.engineer.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {ep.engineer.full_name 
                        ? ep.engineer.full_name.substring(0, 2).toUpperCase() 
                        : ep.engineer.email.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{ep.engineer.full_name || ep.engineer.email}</h3>
                    <p className="text-sm text-muted-foreground">{ep.engineer.department || 'Field Engineer'}</p>
                  </div>
                </div>
                <Badge className={cn("text-xs", getWorkloadColor(ep.workload))}>
                  {ep.workload}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-600">{ep.activeTickets}</div>
                  <div className="text-xs text-muted-foreground">Active Tickets</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-green-600">{ep.completedTickets}</div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-purple-600">{ep.completionRate.toFixed(0)}%</div>
                  <div className="text-xs text-muted-foreground">Success Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-orange-600">{ep.avgResolutionTime.toFixed(1)}h</div>
                  <div className="text-xs text-muted-foreground">Avg Resolution</div>
                </div>
              </div>

              {/* Time Tracking */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium flex items-center gap-1">
                    <Timer className="w-4 h-4" />
                    Time Spent
                  </span>
                  <span className="text-sm font-bold">{formatTime(ep.totalTimeSpent)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Avg: {ep.completedTickets > 0 ? formatTime(Math.round(ep.totalTimeSpent / ep.completedTickets)) : '0m'} per ticket
                </div>
              </div>

              {/* Weekly Performance */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Weekly Performance</h4>
                <div className="grid grid-cols-4 gap-2">
                  {ep.weeklyPerformance.map((week, index) => (
                    <div key={index} className="text-center p-2 bg-muted/30 rounded">
                      <div className="text-xs text-muted-foreground">{week.week}</div>
                      <div className="text-sm font-semibold">{week.completed}</div>
                      <div className="text-xs text-muted-foreground">{formatTime(week.timeSpent)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/tickets?assigned_to=${ep.engineer.id}`)}
                  className="flex-1"
                >
                  <Target className="w-4 h-4 mr-1" />
                  View Tickets
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/profile/${ep.engineer.id}`)}
                  className="flex-1"
                >
                  <UserCheck className="w-4 h-4 mr-1" />
                  Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEngineers.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Engineers Found</h3>
          <p className="text-muted-foreground">Try adjusting your search or filter criteria.</p>
        </div>
      )}
    </div>
  );
}
