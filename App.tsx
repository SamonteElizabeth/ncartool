
import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ClipboardList, 
  AlertCircle, 
  CheckSquare, 
  ShieldCheck, 
  Bell, 
  ChevronDown,
  Menu,
  X,
  Plus,
  ChevronRight,
  Filter,
  ArrowRight,
  TrendingUp,
  Clock,
  Briefcase,
  FileText,
  UserPlus,
  LogOut,
  Check,
  Trash2
} from 'lucide-react';
import { 
  Role, 
  AuditPlan, 
  NCAR, 
  ActionPlan, 
  AuditStatus, 
  NCARStatus,
  Notification,
  User
} from './types';
import { INITIAL_AUDIT_PLANS, INITIAL_NCARS, INITIAL_ACTION_PLANS, INITIAL_USERS } from './mockData';
import AuditPlanning from './views/AuditPlanning';
import NCARModule from './views/NCARModule';
import ActionPlanModule from './views/ActionPlanModule';
import ValidationModule from './views/ValidationModule';
import UserManualModule from './views/UserManualModule';
import UserManagement from './views/UserManagement';
import AnalyticsModule from './views/AnalyticsModule';
import Login from './views/Login';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeModule, setActiveModule] = useState<string>('dashboard');
  const [currentRole, setCurrentRole] = useState<Role>('LEAD_AUDITOR');
  const [auditPlans, setAuditPlans] = useState<AuditPlan[]>(INITIAL_AUDIT_PLANS);
  const [ncars, setNcars] = useState<NCAR[]>(INITIAL_NCARS);
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>(INITIAL_ACTION_PLANS);
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    try {
      const savedNotifications = localStorage.getItem('ncar-notifications');
      if (savedNotifications) return JSON.parse(savedNotifications) as Notification[];
    } catch {
      // Use the initial notifications if stored data is unavailable or invalid.
    }
    return [
      { id: '1', message: 'New Audit Plan Assigned: Q3 Financial', type: 'info', timestamp: '2 mins ago' },
      { id: '2', message: 'NCAR Deadline Approaching: NC-2023-001', type: 'warning', timestamp: '1 hour ago' }
    ];
  });
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread'>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userManualFile, setUserManualFile] = useState<{ name: string, url: string, uploadedAt: string } | null>(null);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);

  useEffect(() => {
    localStorage.setItem('ncar-notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Helper to add toast notifications
  const notify = (message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const newNotif: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      message,
      type,
      timestamp: 'Just now'
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const handleLogin = (role: Role) => {
    // Find a user from mock data that matches the role, or default to a generic one
    const user = INITIAL_USERS.find(u => u.role === role) || {
      id: '999',
      name: 'Alex Johnson',
      role: role,
      dept: 'DISD',
      email: 'alex.johnson@example.com',
      designation: role === 'AUDITEE' ? 'Manager' : 'Staff'
    };
    
    setCurrentUser(user);
    setCurrentRole(role);
    setIsLoggedIn(true);
    notify(`Successfully logged in as ${user.name}`, 'success');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    notify('Logged out successfully', 'info');
  };

  const navItems = [
    { id: 'dashboard', label: 'Analytics', icon: LayoutDashboard, roles: ['LEAD_AUDITOR', 'AUDITOR', 'AUDITEE'] },
    // AUDITEE removed from roles for planning module
    { id: 'planning', label: 'Audit Plan ', icon: ClipboardList, roles: ['LEAD_AUDITOR', 'AUDITOR'] },
    { id: 'ncar', label: 'NCAR ', icon: AlertCircle, roles: ['LEAD_AUDITOR', 'AUDITOR', 'AUDITEE'] },
    { id: 'actions', label: 'Action Plans', icon: CheckSquare, roles: ['LEAD_AUDITOR', 'AUDITOR', 'AUDITEE'] },
    { id: 'validation', label: 'Validation', icon: ShieldCheck, roles: ['LEAD_AUDITOR', 'AUDITOR', 'AUDITEE'] },
    { id: 'users', label: 'User Management', icon: UserPlus, roles: ['DEV_ADMIN'] },
    { id: 'manual', label: 'User Manual', icon: FileText, roles: ['LEAD_AUDITOR', 'AUDITOR', 'AUDITEE', 'DEV_ADMIN'] },
  ];

  // Access Guard: If user switches role to one that doesn't have access to current module, redirect to dashboard
  useEffect(() => {
    const currentItem = navItems.find(item => item.id === activeModule);
    if (currentItem && !currentItem.roles.includes(currentRole)) {
      setActiveModule('dashboard');
    }
  }, [currentRole, activeModule]);

  const filteredNavItems = navItems.filter(item => item.roles.includes(currentRole));
  const unreadCount = notifications.filter(notification => !notification.read).length;
  const visibleNotifications = notifications.filter(notification => notificationFilter === 'all' || !notification.read);

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(notification => notification.id === id ? { ...notification, read: true } : notification));
  };

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard': return <AnalyticsModule ncars={ncars} actionPlans={actionPlans} users={users} onNotify={notify} />;
      case 'planning': 
        if (currentRole === 'AUDITEE') return <AnalyticsModule ncars={ncars} actionPlans={actionPlans} users={users} onNotify={notify} />;
        return (
          <AuditPlanning 
            plans={auditPlans} 
            setPlans={setAuditPlans} 
            role={currentRole} 
            onNotify={notify}
          />
        );
      case 'ncar': return (
        <NCARModule 
          ncars={ncars} 
          setNcars={setNcars} 
          actionPlans={actionPlans}
          setActionPlans={setActionPlans}
          role={currentRole} 
          onNotify={notify} 
          setActiveModule={setActiveModule}
        />
      );
      case 'actions': return (
        <ActionPlanModule 
          ncars={ncars} 
          actionPlans={actionPlans} 
          setActionPlans={setActionPlans} 
          setNcars={setNcars}
          role={currentRole} 
          onNotify={notify}
        />
      );
      case 'validation': return (
        <ValidationModule 
          ncars={ncars} 
          actionPlans={actionPlans} 
          setNcars={setNcars}
          role={currentRole} 
          onNotify={notify}
        />
      );
      case 'manual': return (
        <UserManualModule 
          role={currentRole}
          userManualFile={userManualFile}
          setUserManualFile={setUserManualFile}
          onNotify={notify}
        />
      );
      case 'users': return (
        <UserManagement 
          users={users}
          setUsers={setUsers}
          onNotify={notify}
        />
      );
      default: return <AnalyticsModule ncars={ncars} actionPlans={actionPlans} users={users} onNotify={notify} />;
    }
  };

  // System logo from assets folder (ncarlogo.png) placed in center of sidebar
  const Logo = ({ collapsed }: { collapsed: boolean }) => (
    <div className="flex items-center justify-center w-full">
      <div
        className={`${
          collapsed ? 'w-11 h-11' : 'w-20 h-20'
        } flex items-center justify-center transition-all duration-300`}
      >
        <img
          src="/assets/ncarlogo.png"
          alt="NCAR Logo"
          className="w-full h-full object-contain drop-shadow-md hover:scale-105 transition-transform"
        />
      </div>
    </div>
  );

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-[#F5F4F0] overflow-hidden text-base">
      {/* Sidebar - solid blue (#172554) */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-[#172554] transition-all duration-300 ease-in-out flex flex-col h-full z-30 shadow-2xl shrink-0`}>
        {/* Header with Centered Logo and Collapse Toggle */}
        <div className="px-3 pt-4 pb-2 flex flex-col items-center justify-center w-full">
          <div className={`w-full flex items-center ${isSidebarOpen ? 'justify-end mb-1' : 'justify-center mb-2'}`}>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors shrink-0"
              title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              <Menu size={18} />
            </button>
          </div>
          <div className="w-full flex justify-center pb-2">
            <Logo collapsed={!isSidebarOpen} />
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-3 space-y-1.5 overflow-y-auto custom-scrollbar">
          {filteredNavItems.map((item) => {
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveModule(item.id)}
                title={item.label}
                className={`w-full flex items-center gap-3.5 py-3 px-3 rounded-xl transition-all duration-150 group relative ${
                  isActive 
                    ? 'bg-white text-[#172554] shadow-md font-semibold'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white font-medium'
                } ${!isSidebarOpen ? 'justify-center px-0' : ''}`}
              >
                <item.icon 
                  size={22} 
                  className={`shrink-0 transition-transform duration-150 ${
                    isActive ? 'text-[#172554]' : 'text-blue-100 group-hover:text-white'
                  }`} 
                />
                {isSidebarOpen && (
                  <span className="text-sm tracking-normal whitespace-nowrap truncate">
                    {item.label}
                  </span>
                )}
                {/* Tooltip for collapsed state */}
                {!isSidebarOpen && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 bg-blue-50 text-blue-900 border border-blue-200 text-xs font-semibold rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50 pointer-events-none">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Topbar */}
        <header className="h-20 bg-[#FAF9F6] border-b border-[#E7E4DC] px-8 flex items-center justify-end z-20 sticky top-0 shrink-0">
          <div className="flex items-center gap-8">
            <div className="relative">
              <button onClick={() => setIsNotificationsOpen(open => !open)} aria-label="Open notifications" aria-expanded={isNotificationsOpen} className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-full transition-colors relative">
                <Bell size={24} />
                {unreadCount > 0 && <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-[#172554] text-white text-[9px] leading-4 font-semibold rounded-full border border-white">{unreadCount}</span>}
              </button>
              {/* Notifications Dropdown */}
              <div className={`absolute right-0 mt-3 w-[min(24rem,calc(100vw-2rem))] bg-[#FFFEF8] border border-[#E7E4DC] rounded-2xl shadow-xl z-50 origin-top-right transition-all duration-150 ${isNotificationsOpen ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95 pointer-events-none'}`}>
                <div className="px-4 py-4 border-b border-[#EAE7DF] flex justify-between items-start bg-[#FAF9F6] rounded-t-2xl">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">Notifications</h2>
                    <p className="mt-0.5 text-xs text-gray-500">{unreadCount ? `${unreadCount} unread` : 'You’re all caught up'}</p>
                  </div>
                  <button onClick={() => setIsNotificationsOpen(false)} aria-label="Close notifications" className="p-1 text-gray-500 hover:bg-gray-200 rounded-md"><X size={16} /></button>
                </div>
                <div className="flex gap-1 p-2.5 border-b border-[#EAE7DF]">
                  {(['all', 'unread'] as const).map(filter => <button key={filter} onClick={() => setNotificationFilter(filter)} className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium capitalize transition-colors ${notificationFilter === filter ? 'bg-white text-[#172554] shadow-sm' : 'text-gray-600 hover:bg-white/70'}`}>{filter === 'all' ? 'All' : `Unread${unreadCount ? ` (${unreadCount})` : ''}`}</button>)}
                </div>
                <div className="px-4 py-2.5 flex items-center justify-between border-b border-[#EAE7DF]">
                  <button onClick={() => setNotifications(prev => prev.map(notification => ({ ...notification, read: true })))} disabled={!unreadCount} className="text-xs font-medium text-gray-600 hover:text-[#172554] disabled:opacity-40 disabled:cursor-default">Mark all as read</button>
                  <button onClick={() => setNotifications(prev => prev.filter(notification => !notification.read))} disabled={!notifications.some(notification => notification.read)} aria-label="Delete read notifications" title="Delete read notifications" className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md disabled:opacity-40 disabled:cursor-default"><Trash2 size={15} /></button>
                </div>
                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                  {visibleNotifications.length ? visibleNotifications.map(n => (
                    <div key={n.id} className={`px-4 py-3 border-b border-[#F0EEE8] transition-colors ${n.read ? 'bg-transparent' : 'bg-[#F7F6F0]'} hover:bg-[#F0EFE9]`}>
                      <div className="flex items-start gap-3">
                        <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${n.read ? 'bg-transparent' : 'bg-[#172554]'}`} />
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs leading-relaxed ${n.read ? 'text-gray-600' : 'text-gray-800 font-medium'}`}>{n.message}</p>
                          <span className="mt-1 block text-[10px] text-gray-500">{n.timestamp}</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {!n.read && <button onClick={() => markNotificationRead(n.id)} aria-label="Mark notification as read" title="Mark as read" className="p-1.5 text-gray-400 hover:text-[#172554] hover:bg-white rounded-md"><Check size={14} /></button>}
                          <button onClick={() => setNotifications(prev => prev.filter(notification => notification.id !== n.id))} aria-label="Delete notification" title="Delete notification" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-white rounded-md"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </div>
                  )) : <p className="px-4 py-8 text-center text-xs text-gray-500">No {notificationFilter === 'unread' ? 'unread ' : ''}notifications.</p>}
                </div>
                <div className="px-4 py-2.5 bg-[#FAF9F6] rounded-b-2xl text-[10px] text-gray-500">
                  {notifications.length} {notifications.length === 1 ? 'notification' : 'notifications'}
                </div>
              </div>
            </div>

            {/* User Profile */}
            <div className="relative group">
              <button aria-label="Open user menu" className="flex min-w-[170px] items-center justify-between gap-3 px-4 py-2.5 bg-gradient-to-r from-[#F2EFFA] to-[#F8EEF4] rounded-xl hover:from-[#ECE7F6] hover:to-[#F5E7EF] transition-colors">
                <div className="flex min-w-0 flex-col items-start gap-0.5">
                  <span className="max-w-[150px] truncate text-sm font-bold text-[#172554] leading-tight">{currentUser?.name || 'Alex Johnson'}</span>
                  <span className="text-xs font-semibold text-violet-700 capitalize">
                    {currentRole.toLowerCase().replace('_', ' ')}
                  </span>
                </div>
                <ChevronDown size={17} className="shrink-0 text-violet-700" />
              </button>
              
              {/* Profile Dropdown */}
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 transform origin-top-right scale-95 group-hover:scale-100">
                <div className="p-2">
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <LogOut size={18} />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic View */}
        <section className="flex-1 overflow-y-auto p-5 md:p-6 custom-scrollbar bg-[#F5F4F0]">
          {renderModule()}
        </section>
      </main>
    </div>
  );
};

export default App;
