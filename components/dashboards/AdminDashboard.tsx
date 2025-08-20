import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTickets } from '@/hooks/useTickets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Settings, 
  BarChart3, 
  AlertTriangle,
  TrendingUp,
  Shield,
  Database,
  UserCog,
  Building,
  Activity,
  Calendar,
  Clock,
  CheckCircle
} from 'lucide-react';
import { dbHelpers, supabase } from '@/lib/supabase';
import { mockDbHelpers, mockUsers } from '@/lib/mock-data';
import { UserProfile } from '@/types/ticket';
import { cn } from '@/lib/utils';
import EngineersOverview from '@/components/EngineersOverview';

interface SystemStats {
  total_users: number;
  active_users: number;
  total_tickets: number;
  tickets_this_month: number;
  resolved_tickets: number;
  avg_resolution_time: number;
  system_uptime: number;
}

interface DepartmentStats {
  department: string;
  user_count: number;
  active_tickets: number;
  completion_rate: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tickets } = useTickets();
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSystemData();
  }, [user]);

  const loadSystemData = async () => {
    if (!user) return;

    try {
      // Load all users with fallback to mock data
      let allUsers;
      try {
        allUsers = await dbHelpers.getUsers();
      } catch (supabaseError) {
        console.log('Using mock users data');
        allUsers = await mockDbHelpers.getUsers();
      }
      setUsers(allUsers || []);

      // Load dashboard stats with fallback to mock data
      let dashboardData;
      try {
        dashboardData = await dbHelpers.getDashboardStats(user.id);
      } catch (supabaseError) {
        console.log('Using mock dashboard data');
        dashboardData = await mockDbHelpers.getDashboardStats(user.id);
      }
      
      // Calculate system statistics
      const thisMonth = new Date();
      thisMonth.setDate(1);
      
      const ticketsThisMonth = tickets.filter(t => new Date(t.created_at) >= thisMonth).length;
      const resolvedTickets = tickets.filter(t => ['resolved', 'verified', 'closed'].includes(t.status)).length;
      
      // Calculate average resolution time
      const resolvedWithTime = tickets.filter(t => t.resolved_at);
      const avgResolutionTime = resolvedWithTime.length > 0 
        ? resolvedWithTime.reduce((acc, ticket) => {
            const resolutionTime = new Date(ticket.resolved_at!).getTime() - new Date(ticket.created_at).getTime();
            return acc + (resolutionTime / (1000 * 60 * 60)); // Convert to hours
          }, 0) / resolvedWithTime.length
        : 0;

      setSystemStats({
        total_users: allUsers?.length || 0,
        active_users: allUsers?.filter(u => u.is_active).length || 0,
        total_tickets: tickets.length,
        tickets_this_month: ticketsThisMonth,
        resolved_tickets: resolvedTickets,
        avg_resolution_time: avgResolutionTime,
        system_uptime: 99.9 // Mock uptime
      });

      // Calculate department statistics
      const departments = [...new Set(allUsers?.map(u => u.department).filter(Boolean))];
      const deptStats: DepartmentStats[] = departments.map(dept => {
        const deptUsers = allUsers?.filter(u => u.department === dept) || [];
        const deptTickets = tickets.filter(t => 
          deptUsers.some(u => u.id === t.assigned_to || u.id === t.created_by)
        );
        const completedDeptTickets = deptTickets.filter(t => 
          ['resolved', 'verified', 'closed'].includes(t.status)
        );
        
        return {
          department: dept,
          user_count: deptUsers.length,
          active_tickets: deptTickets.filter(t => !['resolved', 'verified', 'closed'].includes(t.status)).length,
          completion_rate: deptTickets.length > 0 ? (completedDeptTickets.length / deptTickets.length) * 100 : 0
        };
      });
      
      setDepartmentStats(deptStats);
    } catch (error) {
      console.error('Error loading system data:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        component: 'AdminDashboard',
        operation: 'loadSystemData',
        error: error
      });
    } finally {
      setLoading(false);
    }
  };

  const usersByRole = {
    admin: users.filter(u => u.role === 'admin').length,
    supervisor: users.filter(u => u.role === 'supervisor').length,
    field_engineer: users.filter(u => u.role === 'field_engineer').length
  };

  const recentUsers = users
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const criticalTickets = tickets.filter(t => t.priority === 'critical').length;
  const overdueTickets = tickets.filter(t => 
    t.due_date && 
    new Date(t.due_date) < new Date() && 
    !['resolved', 'verified', 'closed'].includes(t.status)
  ).length;

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
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
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6" />
          System Administration
        </h1>
        <p className="text-muted-foreground">
          System overview and management
        </p>
      </div>

      {/* System Health */}
      <Card className="border-green-200 dark:border-green-800">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-green-600">
            <Activity className="w-5 h-5" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{systemStats?.system_uptime}%</div>
              <div className="text-sm text-muted-foreground">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{systemStats?.active_users}</div>
              <div className="text-sm text-muted-foreground">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{systemStats?.tickets_this_month}</div>
              <div className="text-sm text-muted-foreground">Tickets This Month</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{systemStats?.avg_resolution_time?.toFixed(1)}h</div>
              <div className="text-sm text-muted-foreground">Avg Resolution</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{systemStats?.total_users || 0}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Database className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{systemStats?.total_tickets || 0}</p>
                <p className="text-sm text-muted-foreground">Total Tickets</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-2xl font-bold">{systemStats?.resolved_tickets || 0}</p>
                <p className="text-sm text-muted-foreground">Resolved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={cn(
          "hover:shadow-md transition-shadow",
          criticalTickets > 0 && "border-red-200 dark:border-red-800"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className={cn(
                "w-5 h-5",
                criticalTickets > 0 ? "text-red-600" : "text-gray-400"
              )} />
              <div>
                <p className="text-2xl font-bold">{criticalTickets}</p>
                <p className="text-sm text-muted-foreground">Critical</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={cn(
          "hover:shadow-md transition-shadow",
          overdueTickets > 0 && "border-orange-200 dark:border-orange-800"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className={cn(
                "w-5 h-5",
                overdueTickets > 0 ? "text-orange-600" : "text-gray-400"
              )} />
              <div>
                <p className="text-2xl font-bold">{overdueTickets}</p>
                <p className="text-sm text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">
                  {systemStats?.total_tickets ? Math.round((systemStats.resolved_tickets / systemStats.total_tickets) * 100) : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Role Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserCog className="w-5 h-5" />
            User Role Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-red-600">{usersByRole.admin}</div>
                <div className="text-sm text-muted-foreground">Admins</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{usersByRole.supervisor}</div>
                <div className="text-sm text-muted-foreground">Supervisors</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{usersByRole.field_engineer}</div>
                <div className="text-sm text-muted-foreground">Engineers</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Admins</span>
                  <span>{usersByRole.admin}/{systemStats?.total_users}</span>
                </div>
                <Progress value={(usersByRole.admin / (systemStats?.total_users || 1)) * 100} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Supervisors</span>
                  <span>{usersByRole.supervisor}/{systemStats?.total_users}</span>
                </div>
                <Progress value={(usersByRole.supervisor / (systemStats?.total_users || 1)) * 100} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Field Engineers</span>
                  <span>{usersByRole.field_engineer}/{systemStats?.total_users}</span>
                </div>
                <Progress value={(usersByRole.field_engineer / (systemStats?.total_users || 1)) * 100} className="h-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Department Performance */}
      {departmentStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building className="w-5 h-5" />
              Department Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {departmentStats.map((dept) => (
                <div key={dept.department} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{dept.department}</p>
                    <p className="text-sm text-muted-foreground">
                      {dept.user_count} users • {dept.active_tickets} active tickets
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-lg font-bold">{dept.completion_rate.toFixed(0)}%</p>
                    <p className="text-xs text-muted-foreground">Completion Rate</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick System Management */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              User Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => navigate('/engineers')}
              variant="outline"
              className="w-full justify-start h-10"
            >
              <Users className="w-4 h-4 mr-3" />
              Field Engineers ({usersByRole.field_engineer})
            </Button>
            <Button
              onClick={() => navigate('/admin/supervisors')}
              variant="outline"
              className="w-full justify-start h-10"
            >
              <Shield className="w-4 h-4 mr-3" />
              Supervisors ({usersByRole.supervisor})
            </Button>
            <Button
              onClick={() => navigate('/admin/users')}
              className="w-full justify-start h-10"
            >
              <UserCog className="w-4 h-4 mr-3" />
              All Users & Roles
            </Button>
          </CardContent>
        </Card>

        {/* System Operations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="w-5 h-5" />
              System Operations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              onClick={() => navigate('/tickets')}
              className="w-full justify-start h-10"
            >
              <Database className="w-4 h-4 mr-3" />
              All Tickets ({systemStats?.total_tickets || 0})
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/admin/system')}
              className="w-full justify-start h-10"
            >
              <Activity className="w-4 h-4 mr-3" />
              System Tools
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/admin/settings')}
              className="w-full justify-start h-10"
            >
              <Settings className="w-4 h-4 mr-3" />
              System Settings
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Analytics & Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Analytics & Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/admin/resolved-tickets')}
              className="h-20 flex-col gap-2"
            >
              <Archive className="w-6 h-6" />
              <span className="text-sm">Resolved Tickets</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/?view=analytics')}
              className="h-20 flex-col gap-2"
            >
              <TrendingUp className="w-6 h-6" />
              <span className="text-sm">Performance</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/tickets?priority=critical')}
              className="h-20 flex-col gap-2"
            >
              <AlertTriangle className="w-6 h-6" />
              <span className="text-sm">Critical Issues</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/map')}
              className="h-20 flex-col gap-2"
            >
              <Activity className="w-6 h-6" />
              <span className="text-sm">Field Activity</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Engineers Overview */}
      <EngineersOverview />

      {/* Recent User Activity */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Recent User Registrations</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/users')}>
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentUsers.length > 0 ? recentUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{user.full_name || user.email}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(user.created_at).toLocaleDateString()}</span>
                    {user.department && (
                      <>
                        <span>•</span>
                        <span>{user.department}</span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={user.role === 'admin' ? 'destructive' : user.role === 'supervisor' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {user.role.replace('_', ' ')}
                  </Badge>
                  <Badge 
                    variant={user.is_active ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {user.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent users</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
