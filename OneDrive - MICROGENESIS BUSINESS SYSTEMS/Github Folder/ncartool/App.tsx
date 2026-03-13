
import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ClipboardList, 
  AlertCircle, 
  CheckSquare, 
  ShieldCheck, 
  Bell, 
  UserCircle,
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
  LogOut
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
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: '1', message: 'New Audit Plan Assigned: Q3 Financial', type: 'info', timestamp: '2 mins ago' },
    { id: '2', message: 'NCAR Deadline Approaching: NC-2023-001', type: 'warning', timestamp: '1 hour ago' }
  ]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userManualFile, setUserManualFile] = useState<{ name: string, url: string, uploadedAt: string } | null>(null);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);

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
    { id: 'manual', label: 'User Manual', icon: FileText, roles: ['LEAD_AUDITOR', 'AUDITOR', 'AUDITEE', 'DEV_ADMIN'] },
    { id: 'users', label: 'User Management', icon: UserPlus, roles: ['DEV_ADMIN'] },
  ];

  // Access Guard: If user switches role to one that doesn't have access to current module, redirect to dashboard
  useEffect(() => {
    const currentItem = navItems.find(item => item.id === activeModule);
    if (currentItem && !currentItem.roles.includes(currentRole)) {
      setActiveModule('dashboard');
    }
  }, [currentRole, activeModule]);

  const filteredNavItems = navItems.filter(item => item.roles.includes(currentRole));

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

  // Use exact logo file from public assets.
  const Logo = ({ collapsed }: { collapsed: boolean }) => (
    <div
      className={`flex items-center justify-center overflow-hidden mx-auto ${
        collapsed ? 'w-14 h-14' : 'w-64 h-20'
      }`}
    >
      <img
        src="/assets/ncar2.png"
        className={`transition-all duration-200 ${
          collapsed ? 'w-full h-full object-cover scale-[1.25]' : 'w-full h-full object-cover scale-[1.20]'
        }`}
        style={{ objectPosition: '50% 50%' }}
      />
    </div>
  );

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden text-base">
      {/* Sidebar - solid blue (#00316E) */}
      <aside className={`${isSidebarOpen ? 'w-72' : 'w-24'} bg-[#00316E] transition-all duration-300 flex flex-col h-full z-30 shadow-2xl [font-family:'Poppins',sans-serif]`}>
        <div className="px-4 pt-5 pb-4 flex flex-col items-center border-b border-white/10 relative">
          <div className="w-full flex justify-end lg:flex hidden absolute top-3 right-3">
             <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/10 rounded-md transition-colors">
               <Menu size={20} className="text-blue-50" />
             </button>
          </div>
          
          <Logo collapsed={!isSidebarOpen} />
        </div>

        <nav className="flex-1 p-4 mt-3 space-y-2 overflow-y-auto custom-scrollbar">
          {filteredNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveModule(item.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${
                activeModule === item.id 
                  ? 'bg-white text-[#00316E] shadow-lg border border-white/20' 
                  : 'text-white hover:bg-white/10'
              } ${!isSidebarOpen && 'justify-center'}`}
            >
              <item.icon size={24} className={activeModule === item.id ? 'text-[#00316E]' : 'text-blue-50'} />
              {isSidebarOpen && <span className="font-bold text-sm">{item.label}</span>}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Topbar */}
        <header className="h-15 bg-white border-b border-gray-200 px-6 flex items-center justify-end z-20 sticky top-0">
          
          <div className="flex items-center gap-6">
            <div className="relative group">
              <button className="p-2.5 text-gray-400 hover:bg-gray-100 rounded-full transition-colors relative">
                <Bell size={24} />
                <span className="absolute top-1.5 right-1.5 w-3 h-3 bg-[#00316E] rounded-full border-2 border-white"></span>
              </button>
              {/* Notifications Dropdown */}
              <div className="absolute right-0 mt-3 w-96 bg-white border border-gray-200 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 transform origin-top-right scale-95 group-hover:scale-100">
                <div className="p-5 border-b border-gray-50 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
                  <span className="font-black text-xs uppercase tracking-widest text-gray-400">Notifications</span>
                  <span className="text-xs bg-[#00316E] text-white px-2.5 py-1 rounded-full font-bold">New</span>
                </div>
                <div className="max-h-96 overflow-y-auto custom-scrollbar">
                  {notifications.map(n => (
                    <div key={n.id} className="p-5 hover:bg-blue-50/30 border-b border-gray-50 transition-colors">
                      <div className="flex items-start gap-5">
                        <div className={`mt-2 w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          n.type === 'success' ? 'bg-green-500' : 
                          n.type === 'warning' ? 'bg-orange-500' : 'bg-[#00316E]'
                        }`} />
                        <div>
                          <p className="text-base text-gray-800 font-bold leading-tight mb-1.5">{n.message}</p>
                          <span className="text-xs text-gray-400 uppercase font-black tracking-widest">{n.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 text-center bg-gray-50/50 rounded-b-2xl border-t border-gray-50">
                  <button className="text-sm font-black text-[#00316E] hover:text-blue-800 uppercase tracking-widest">Mark All as Read</button>
                </div>
              </div>
            </div>

            {/* User Profile */}
            <div className="relative group">
              <button className="flex items-center gap-4 hover:bg-gray-50 p-2 rounded-2xl transition-all">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-black text-gray-900 leading-tight">{currentUser?.name || 'Alex Johnson'}</span>
                  <span className="text-xs font-bold text-blue-600 capitalize">
                    {currentRole.toLowerCase().replace('_', ' ')}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <UserCircle size={24} />
                </div>
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
        <section className="flex-1 overflow-y-auto p-5 md:p-6 custom-scrollbar bg-gray-50/50">
          {renderModule()}
        </section>
      </main>
    </div>
  );
};

export default App;
