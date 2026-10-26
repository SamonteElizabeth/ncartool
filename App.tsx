
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  ClipboardList, 
  AlertCircle, 
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
  Trash2,
  Settings2
} from 'lucide-react';
import { 
  Role, 
  AuditPlan, 
  NCAR, 
  ActionPlan, 
  AuditStatus, 
  NCARStatus,
  Notification,
  User,
  AuditReport
} from './types';
import { ALWAYS_LOADED_DEMO_NCAR_IDS, INITIAL_AUDIT_PLANS, INITIAL_AUDIT_REPORTS, INITIAL_NCARS, INITIAL_ACTION_PLANS, INITIAL_USERS } from './mockData';
import AuditPlanning from './views/AuditPlanning';
import NCARModule from './views/NCARModule';
import ValidationModule from './views/ValidationModule';
import UserManualModule from './views/UserManualModule';
import UserManagement from './views/UserManagement';
import MaintenanceTableModule from './views/MaintenanceTableModule';
import AnalyticsModule from './views/AnalyticsModule';
import Login from './views/Login';
import AuditReportModule from './views/AuditReportModule';
import OFIModule from './views/OFIModule';
import { getConfiguredPhilippineHolidays, getPhilippineDateKey, getResponseSlaStatus, hasSubmittedNCARResponse, makeResponseSla } from './utils/ncarSla';
import { finalApproveReport, reportFindingIds } from './utils/auditReportApproval';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeModule, setActiveModule] = useState<string>('dashboard');
  const [currentRole, setCurrentRole] = useState<Role>('LEAD_AUDITOR');
  const [auditPlans, setAuditPlans] = useState<AuditPlan[]>(INITIAL_AUDIT_PLANS);
  const [ncars, setNcars] = useState<NCAR[]>(() => {
    try {
      const storedNCARs = localStorage.getItem('ncartool-ncars');
      const savedNCARs = storedNCARs ? JSON.parse(storedNCARs) as NCAR[] : [];
      const savedOFIs = localStorage.getItem('ncartool-ofi-records');
      const savedOFIRecords = savedOFIs ? JSON.parse(savedOFIs) as NCAR[] : [];
      const demoNCARs = INITIAL_NCARS.filter(ncar => ALWAYS_LOADED_DEMO_NCAR_IDS.includes(ncar.id));
      const recordsById = new Map<string, NCAR>([...(storedNCARs ? [...demoNCARs, ...savedNCARs] : INITIAL_NCARS), ...savedOFIRecords].map(ncar => [ncar.id, ncar] as const));
      return [...recordsById.values()];
    } catch {
      return INITIAL_NCARS;
    }
  });
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>(INITIAL_ACTION_PLANS);
  const [auditReports, setAuditReports] = useState<AuditReport[]>(() => {
    try {
      const storedReports = localStorage.getItem('ncartool-audit-reports');
      const savedReports = storedReports ? JSON.parse(storedReports) as AuditReport[] : [];
      const reportsById = new Map<string, AuditReport>([...INITIAL_AUDIT_REPORTS, ...savedReports].map(report => [report.id, report] as const));
      return [...reportsById.values()];
    } catch {
      return INITIAL_AUDIT_REPORTS;
    }
  });
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
  const [departments, setDepartments] = useState<string[]>(() => {
    const initialDepartments = INITIAL_USERS.map(user => user.dept).filter(Boolean);
    try {
      const saved = localStorage.getItem('ncartool-departments');
      const parsed = saved ? JSON.parse(saved) as unknown : [];
      return [...new Set([...initialDepartments, ...(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [])])].sort();
    } catch {
      return [...new Set(initialDepartments)].sort();
    }
  });
  const [executiveRecipients, setExecutiveRecipients] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ncartool-executive-recipients');
      const parsed = saved ? JSON.parse(saved) as unknown : ['executive@example.com'];
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
    } catch {
      return [];
    }
  });
  const handledSlaNotifications = useRef(new Set<string>());

  useEffect(() => {
    localStorage.setItem('ncar-notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('ncartool-executive-recipients', JSON.stringify(executiveRecipients));
  }, [executiveRecipients]);

  useEffect(() => {
    localStorage.setItem('ncartool-audit-reports', JSON.stringify(auditReports));
  }, [auditReports]);

  useEffect(() => {
    localStorage.setItem('ncartool-ncars', JSON.stringify(ncars));
    localStorage.setItem('ncartool-ofi-records', JSON.stringify(ncars.filter(ncar => ncar.findingType === 'OFI')));
  }, [ncars]);

  useEffect(() => {
    const readyReports = auditReports.filter(report => report.status === 'Awaiting Auditee Responses' && [...report.ncarIds, ...report.ofiIds].every(id => {
      const finding = ncars.find(ncar => ncar.id === id);
      return Boolean(finding && hasSubmittedNCARResponse(finding));
    }));
    if (readyReports.length) {
      const readyIds = new Set(readyReports.map(report => report.id));
      setAuditReports(current => current.map(report => readyIds.has(report.id) ? { ...report, status: 'Pending Lead Review', updatedAt: new Date().toISOString() } : report));
    }
    const leadAuditor = users.find(user => user.role === 'LEAD_AUDITOR')?.name;
    const headManager = users.find(user => user.role === 'HEAD_MANAGER')?.name;
    const reviewNotifications = [
      ...readyReports.map(report => ({
        id: `report-cap-review-${report.id}`,
        message: `All NCAR and OFI responses for ${report.reportTitle || report.referenceNumber || report.id} are submitted. The report is ready for Lead Auditor review.`,
        type: 'info' as const,
        timestamp: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }),
        ...(leadAuditor ? { recipientName: leadAuditor } : {}),
        relatedRecordId: report.id
      })),
      ...auditReports.filter(report => report.status === 'Pending Final Approval').map(report => ({
        id: `report-head-review-${report.id}`,
        message: `${report.reportTitle || report.referenceNumber || report.id} was approved by the Lead Auditor and is awaiting your final approval.`,
        type: 'info' as const,
        timestamp: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }),
        ...(headManager ? { recipientName: headManager } : {}),
        relatedRecordId: report.id
      })),
      ...ncars.filter(ncar => ncar.status === NCARStatus.CAP_LEAD_APPROVED).map(ncar => ({
        id: `ncar-head-review-${ncar.id}`,
        message: `NCAR ${ncar.id} was approved by the Lead Auditor and is awaiting your final approval in Pending Review.`,
        type: 'info' as const,
        timestamp: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }),
        ...(headManager ? { recipientName: headManager } : {}),
        relatedRecordId: ncar.id
      })),
      // Keyed by submittedAt so a resubmission after a return notifies again.
      ...ncars.filter(ncar => ncar.findingType === 'OFI' && ['PENDING_LEAD', 'PENDING_HEAD'].includes(ncar.ofiResponse?.implementationReview?.stage || '')).map(ofi => {
        const review = ofi.ofiResponse!.implementationReview!;
        const forLead = review.stage === 'PENDING_LEAD';
        const recipient = forLead ? leadAuditor : headManager;
        return {
          id: `ofi-implementation-${review.stage}-${ofi.id}-${review.submittedAt}`,
          message: forLead
            ? `OFI ${ofi.id} was marked Implemented by ${ofi.managerResponsible || ofi.auditee} and is awaiting your approval in the OFI screen.`
            : `OFI ${ofi.id} implementation was approved by the Lead Auditor and is awaiting your verification in the OFI screen.`,
          type: 'info' as const,
          timestamp: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }),
          ...(recipient ? { recipientName: recipient } : {}),
          relatedRecordId: ofi.id
        };
      })
    ];
    if (reviewNotifications.length) setNotifications(current => [
      ...reviewNotifications.filter(notification => !current.some(item => item.id === notification.id)),
      ...current
    ]);
  }, [auditReports, ncars, users]);

  useEffect(() => {
    const checkResponseSLAs = () => {
      const now = new Date();
      const today = getPhilippineDateKey(now);
      const holidays = getConfiguredPhilippineHolidays();
      const notificationsToAdd: Notification[] = [];
      const updatedNCARs = ncars.map(ncar => {
        if (!ncar.assignedAt) return ncar;
        let responseSla = ncar.responseSla || makeResponseSla(ncar.assignedAt, holidays);
        const dueDate = responseSla.dueDate || ncar.deadline;
        if (!dueDate) return ncar;
        const submitted = hasSubmittedNCARResponse(ncar);
        const slaStatus = submitted ? 'Submitted' : getResponseSlaStatus({ ...ncar, responseSla }, now, holidays) || 'On Track';
        let notificationHistory = responseSla.notificationHistory || [];
        let didNotify = false;
        const auditee = ncar.managerResponsible || ncar.auditee;
        const createNotification = (type: 'due-soon' | 'overdue') => {
          const key = `${ncar.id}:${type}`;
          if (handledSlaNotifications.current.has(key) || notificationHistory.some(entry => entry.type === type)) return;
          handledSlaNotifications.current.add(key);
          const findingLabel = ncar.findingType === 'OFI' ? 'OFI' : 'NCAR';
          const message = type === 'due-soon'
            ? `${findingLabel} ${ncar.id} Corrective Action Plan (CAP) is ${today === dueDate ? 'due today' : 'due in one working day'} (${dueDate}).`
            : `${findingLabel} ${ncar.id} Corrective Action Plan (CAP) is overdue. The due date was ${dueDate}.`;
          const timestamp = now.toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
          notificationsToAdd.push({ id: `ncar-sla-${ncar.id}-${type}`, message, type: 'warning', timestamp, recipientName: auditee, relatedRecordId: ncar.id });
          notificationHistory = [...notificationHistory, { type, notifiedAt: now.toISOString() }];
          didNotify = true;
        };

        if (!submitted && slaStatus === 'Due Soon') createNotification('due-soon');
        if (!submitted && slaStatus === 'Overdue') createNotification('overdue');
        responseSla = { ...responseSla, dueDate, status: slaStatus, notificationHistory };
        if (!ncar.responseSla || ncar.deadline !== dueDate || ncar.responseSla.status !== slaStatus || didNotify) {
          return { ...ncar, deadline: dueDate, responseSla };
        }
        return ncar;
      });

      if (updatedNCARs.some((ncar, index) => ncar !== ncars[index])) setNcars(updatedNCARs);
      if (notificationsToAdd.length) {
        setNotifications(current => {
          const existingIds = new Set(current.map(notification => notification.id));
          return [...notificationsToAdd.filter(notification => !existingIds.has(notification.id)), ...current];
        });
      }
    };

    checkResponseSLAs();
    const interval = window.setInterval(checkResponseSLAs, 60_000);
    return () => window.clearInterval(interval);
  }, [ncars, setNcars]);

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

  // Used by the NCAR and OFI screens when the Head Manager answers "Yes" after approving a report's last finding.
  const finalApproveReportAndSend = (reportId: string) => {
    const report = auditReports.find(item => item.id === reportId);
    if (!report || report.status !== 'Pending Final Approval' || currentRole !== 'HEAD_MANAGER') return;
    const approvedReport = finalApproveReport(report, currentUser?.name || 'Head Manager', executiveRecipients);
    const findingIds = reportFindingIds(report);
    setAuditReports(current => current.map(item => item.id === reportId ? approvedReport : item));
    setNcars(current => current.map(ncar => findingIds.includes(ncar.id) ? { ...ncar, status: NCARStatus.CLOSED } : ncar));
    notify(`Head Manager gave final approval to ${report.reportTitle || report.referenceNumber || report.id}.`, 'success');
    if (approvedReport.executiveEmail) notify(`Full Audit Report emailed to Executives: ${approvedReport.executiveEmail.recipients.join(', ')}.`, 'success');
    else notify('No Executive recipients are set in Maintenance Table, so the Audit Report was not emailed.', 'warning');
  };

  const handleLogin = (role: Role) => {
    // Find a user from mock data that matches the role, or default to a generic one
    const user = users.find(u => u.role === role) || {
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
    { id: 'dashboard', label: 'Analytics', icon: LayoutDashboard, roles: ['LEAD_AUDITOR', 'HEAD_MANAGER', 'AUDITOR', 'AUDITEE'] },
    // AUDITEE removed from roles for planning module
    { id: 'planning', label: 'Audit Plan ', icon: ClipboardList, roles: ['LEAD_AUDITOR', 'HEAD_MANAGER', 'AUDITOR'] },
    { id: 'audit-reports', label: 'Audit Report', icon: FileText, roles: ['LEAD_AUDITOR', 'AUDITOR', 'HEAD_MANAGER'] },
    { id: 'ncar', label: 'NCAR', icon: AlertCircle, roles: ['LEAD_AUDITOR', 'HEAD_MANAGER', 'AUDITOR', 'AUDITEE'] },
    { id: 'ofi', label: 'OFI', icon: TrendingUp, roles: ['LEAD_AUDITOR', 'HEAD_MANAGER', 'AUDITOR', 'AUDITEE'] },
    { id: 'validation', label: 'CAP Validation', icon: ShieldCheck, roles: ['LEAD_AUDITOR', 'HEAD_MANAGER', 'AUDITOR', 'AUDITEE'] },
    { id: 'users', label: 'User Management', icon: UserPlus, roles: ['DEV_ADMIN'] },
    { id: 'maintenance-tables', label: 'Maintenance Table', icon: Settings2, roles: ['DEV_ADMIN'] },
    { id: 'manual', label: 'User Manual', icon: FileText, roles: ['LEAD_AUDITOR', 'HEAD_MANAGER', 'AUDITOR', 'AUDITEE', 'DEV_ADMIN'] },
  ];

  // Access Guard: If user switches role to one that doesn't have access to current module, redirect to dashboard
  useEffect(() => {
    const currentItem = navItems.find(item => item.id === activeModule);
    if (currentItem && !currentItem.roles.includes(currentRole)) {
      setActiveModule('dashboard');
    }
  }, [currentRole, activeModule]);

  const filteredNavItems = navItems.filter(item => item.roles.includes(currentRole));
  const userNotifications = notifications.filter(notification => !notification.recipientName || notification.recipientName.toLowerCase() === (currentUser?.name || '').toLowerCase());
  const unreadCount = userNotifications.filter(notification => !notification.read).length;
  const visibleNotifications = userNotifications.filter(notification => notificationFilter === 'all' || !notification.read);

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
          users={users}
          issuingAuditor={currentUser?.name || ''}
          reports={auditReports}
          executiveRecipients={executiveRecipients}
          onFinalApproveReport={finalApproveReportAndSend}
          onNotify={notify}
          setActiveModule={setActiveModule}
        />
      );
      case 'audit-reports': return (
        <AuditReportModule
          reports={auditReports}
          setReports={setAuditReports}
          setNcars={setNcars}
          auditPlans={auditPlans}
          ncars={ncars}
          users={users}
          actionPlans={actionPlans}
          role={currentRole}
          currentUserName={currentUser?.name || ''}
          executiveRecipients={executiveRecipients}
          onNotify={notify}
        />
      );
      case 'ofi': return (
        <OFIModule
          ncars={ncars}
          setNcars={setNcars}
          reports={auditReports}
          role={currentRole}
          currentUserName={currentUser?.name || ''}
          executiveRecipients={executiveRecipients}
          onFinalApproveReport={finalApproveReportAndSend}
          onNotify={notify}
        />
      );
      case 'validation': return (
        <ValidationModule 
          ncars={ncars} 
          actionPlans={actionPlans} 
          setNcars={setNcars}
          setActionPlans={setActionPlans}
          role={currentRole} 
          currentUserName={currentUser?.name || ''}
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
          departments={departments}
          onNotify={notify}
        />
      );
      case 'maintenance-tables': return (
        <MaintenanceTableModule
          departments={departments}
          setDepartments={setDepartments}
          executiveRecipients={executiveRecipients}
          setExecutiveRecipients={setExecutiveRecipients}
          setNcars={setNcars}
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
                    ? 'bg-[#DCE8F8] text-[#172554] shadow-md ring-1 ring-white/40 font-semibold'
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
                  <button onClick={() => setNotifications(prev => prev.map(notification => !notification.recipientName || notification.recipientName.toLowerCase() === (currentUser?.name || '').toLowerCase() ? { ...notification, read: true } : notification))} disabled={!unreadCount} className="text-xs font-medium text-gray-600 hover:text-[#172554] disabled:opacity-40 disabled:cursor-default">Mark all as read</button>
                  <button onClick={() => setNotifications(prev => prev.filter(notification => !((!notification.recipientName || notification.recipientName.toLowerCase() === (currentUser?.name || '').toLowerCase()) && notification.read)))} disabled={!userNotifications.some(notification => notification.read)} aria-label="Delete read notifications" title="Delete read notifications" className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md disabled:opacity-40 disabled:cursor-default"><Trash2 size={15} /></button>
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
              <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-100 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 transform origin-top-right scale-95 group-hover:scale-100 p-2">
                <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 mb-1">
                  Switch Role
                </div>
                {(['LEAD_AUDITOR', 'HEAD_MANAGER', 'AUDITOR', 'AUDITEE'] as Role[]).map(r => (
                  <button
                    key={r}
                    onClick={() => handleLogin(r)}
                    className={`w-full text-left px-3 py-1.5 text-xs rounded-xl transition ${
                      currentRole === r ? 'bg-blue-50 text-[#172554] font-semibold' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {r.toLowerCase().replace('_', ' ')}
                  </button>
                ))}
                <div className="border-t border-gray-100 mt-1 pt-1">
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <LogOut size={15} />
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
