
import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, AlertTriangle, CheckCircle, Clock, Users, Building2, 
  ChevronRight, ArrowUpRight, ArrowDownRight, Filter, Download, Settings,
  BarChart3, PieChart as PieChartIcon, Activity, Info
} from 'lucide-react';
import { NCAR, ActionPlan, User, AuditType, NCARStatus } from '../types';

interface AnalyticsModuleProps {
  ncars: NCAR[];
  actionPlans: ActionPlan[];
  users: User[];
  onNotify: (message: string, type: 'info' | 'success' | 'warning') => void;
}

const COLORS = ['#00316E', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const AnalyticsModule: React.FC<AnalyticsModuleProps> = ({ ncars, actionPlans, users, onNotify }) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'departments' | 'managers' | 'config'>('summary');
  const [tatThreshold, setTatThreshold] = useState(5);
  const [selectedAuditType, setSelectedAuditType] = useState<AuditType | 'All'>('All');

  // Filtered data based on audit type
  const filteredNCARs = useMemo(() => {
    if (selectedAuditType === 'All') return ncars;
    return ncars.filter(n => n.auditType === selectedAuditType);
  }, [ncars, selectedAuditType]);

  // KPI Calculations
  const stats = useMemo(() => {
    const total = filteredNCARs.length;
    const open = filteredNCARs.filter(n => n.status === NCARStatus.PENDING || n.status === NCARStatus.REOPENED).length;
    const closed = filteredNCARs.filter(n => n.status === NCARStatus.CLOSED).length;
    const ofis = filteredNCARs.filter(n => n.findingType === 'OFI').length;
    const ncarsOnly = filteredNCARs.filter(n => n.findingType !== 'OFI').length;

    // Overdue calculation (based on TAT threshold)
    const overdue = filteredNCARs.filter(n => {
      if (n.status === NCARStatus.CLOSED) return false;
      const created = new Date(n.createdAt);
      const now = new Date();
      const diffDays = Math.ceil((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays > tatThreshold;
    }).length;

    return { total, open, closed, ofis, ncarsOnly, overdue };
  }, [filteredNCARs, tatThreshold]);

  // Department Performance Data
  const deptData = useMemo(() => {
    const targetDepts = ['DISD', 'TSD', 'TASS', 'IA', 'MSP', 'CSS', 'DCFI', 'BTSG', 'EEM'];
    return targetDepts.map(dept => {
      const deptNCARs = filteredNCARs.filter(n => n.area === dept);
      return {
        name: dept,
        NCARs: deptNCARs.filter(n => n.findingType !== 'OFI').length,
        OFIs: deptNCARs.filter(n => n.findingType === 'OFI').length,
        Closed: deptNCARs.filter(n => n.status === NCARStatus.CLOSED).length,
      };
    });
  }, [filteredNCARs]);

  // Manager Performance Data (Cascading)
  const managerData = useMemo(() => {
    const managers = users.filter(u => u.designation === 'Manager');
    return managers.map(manager => {
      const managedNCARs = filteredNCARs.filter(n => n.auditee === manager.name);
      
      // Response TAT calculation
      const responseTimes = managedNCARs
        .filter(n => n.responseAt)
        .map(n => {
          const created = new Date(n.createdAt);
          const responded = new Date(n.responseAt!);
          return Math.ceil((responded.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        });
      
      const avgResponseTAT = responseTimes.length > 0 
        ? (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(1)
        : 'N/A';

      // CAP Timeliness
      const managerActionPlans = actionPlans.filter(ap => ap.responsiblePerson === manager.name);
      const timelyCAPs = managerActionPlans.filter(ap => {
        if (!ap.completedAt) return false;
        return new Date(ap.completedAt) <= new Date(ap.dueDate);
      }).length;

      const capTimeliness = managerActionPlans.length > 0
        ? Math.round((timelyCAPs / managerActionPlans.length) * 100)
        : 100;

      return {
        id: manager.id,
        name: manager.name,
        dept: manager.dept,
        reportsTo: manager.reportsTo,
        totalNCARs: managedNCARs.length,
        escalated: managedNCARs.filter(n => n.isEscalated).length,
        avgResponseTAT,
        capTimeliness,
        score: Math.max(0, 100 - (managedNCARs.filter(n => n.isEscalated).length * 20) - (managedNCARs.filter(n => n.status !== NCARStatus.CLOSED).length * 5))
      };
    });
  }, [filteredNCARs, actionPlans, users]);

  // Department Head Data (Cascading from Managers)
  const deptHeadData = useMemo(() => {
    const heads = users.filter(u => u.designation === 'Department Head');
    return heads.map(head => {
      const reportingManagers = managerData.filter(m => m.reportsTo === head.id);
      const avgScore = reportingManagers.length > 0
        ? Math.round(reportingManagers.reduce((acc, m) => acc + m.score, 0) / reportingManagers.length)
        : 100;
      
      return {
        name: head.name,
        dept: head.dept,
        avgManagerScore: avgScore,
        totalEscalated: reportingManagers.reduce((acc, m) => acc + m.escalated, 0)
      };
    });
  }, [managerData, users]);

  // Process Noncompliance Data
  const processData = useMemo(() => {
    const processes = Array.from(new Set(filteredNCARs.map(n => n.processName)));
    return processes.map(proc => {
      const procNCARs = filteredNCARs.filter(n => n.processName === proc);
      return {
        name: proc || 'Unknown',
        Major: procNCARs.filter(n => n.findingType === 'Major').length,
        Minor: procNCARs.filter(n => n.findingType === 'Minor').length,
        OFI: procNCARs.filter(n => n.findingType === 'OFI').length,
      };
    }).sort((a, b) => (b.Major + b.Minor + b.OFI) - (a.Major + a.Minor + a.OFI)).slice(0, 5);
  }, [filteredNCARs]);

  // TAT by Audit Type Data
  const tatByAuditTypeData = useMemo(() => {
    const types: AuditType[] = ['Quality/InfoSec', 'Financial', 'Special Request'];
    return types.map(type => {
      const typeNCARs = ncars.filter(n => n.auditType === type && n.responseAt);
      const responseTimes = typeNCARs.map(n => {
        const created = new Date(n.createdAt);
        const responded = new Date(n.responseAt!);
        return Math.ceil((responded.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      });
      const avg = responseTimes.length > 0 
        ? Number((responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(1))
        : 0;
      return { name: type, avgTAT: avg };
    });
  }, [ncars]);

  const renderSummary = () => (
    <div className="space-y-5 animate-in fade-in duration-500">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Total Findings', value: stats.total, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Open NCARs', value: stats.open, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Overdue (TAT)', value: stats.overdue, icon: Clock, color: 'text-red-600', bg: 'bg-red-50' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-5">
            <div className={`p-4 ${kpi.bg} rounded-2xl`}>
              <kpi.icon className={kpi.color} size={24} />
            </div>
            <div>
              <p className="text-sm font-black text-gray-400 uppercase tracking-widest">{kpi.label}</p>
              <p className="text-2xl font-black text-gray-800">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Finding Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-gray-800 uppercase tracking-tight">Finding Distribution</h3>
            <PieChartIcon className="text-gray-400" size={20} />
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Major NCAR', value: filteredNCARs.filter(n => n.findingType === 'Major').length },
                    { name: 'Minor NCAR', value: filteredNCARs.filter(n => n.findingType === 'Minor').length },
                    { name: 'OFI', value: stats.ofis },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {COLORS.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Compliance Trend */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-gray-800 uppercase tracking-tight">Compliance Trend</h3>
            <TrendingUp className="text-gray-400" size={20} />
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={[
                  { month: 'Sep', compliance: 85 },
                  { month: 'Oct', compliance: 82 },
                  { month: 'Nov', compliance: 88 },
                  { month: 'Dec', compliance: 92 },
                  { month: 'Jan', compliance: 90 },
                  { month: 'Feb', compliance: 94 },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} domain={[0, 100]} />
                <Tooltip />
                <Area type="monotone" dataKey="compliance" stroke="#00316E" fillOpacity={1} fill="url(#colorComp)" />
                <defs>
                  <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00316E" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#00316E" stopOpacity={0}/>
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 Non-compliant Processes */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-gray-800 uppercase tracking-tight">Top 5 Non-compliant Processes</h3>
            <Activity className="text-gray-400" size={20} />
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} width={120} />
                <Tooltip cursor={{fill: '#f9fafb'}} />
                <Legend />
                <Bar dataKey="Major" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Minor" stackId="a" fill="#00316E" radius={[0, 0, 0, 0]} />
                <Bar dataKey="OFI" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Avg Response TAT by Audit Type */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-gray-800 uppercase tracking-tight">Avg Response TAT by Audit Type</h3>
            <Clock className="text-gray-400" size={20} />
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tatByAuditTypeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <Tooltip cursor={{fill: '#f9fafb'}} />
                <Bar dataKey="avgTAT" fill="#8b5cf6" radius={[8, 8, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-gray-800 uppercase tracking-tight">Recent Compliance Activities</h3>
            <Activity className="text-gray-400" size={20} />
          </div>
          <div className="space-y-6">
            {ncars.slice(0, 5).map((ncar, i) => (
              <div key={i} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-all border border-transparent hover:border-gray-100">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${ncar.status === NCARStatus.CLOSED ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                    {ncar.status === NCARStatus.CLOSED ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                  </div>
                  <div>
                    <p className="text-sm font-normal text-gray-800">{ncar.statement.substring(0, 60)}...</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm font-bold text-blue-500 uppercase tracking-widest">{ncar.id}</span>
                      <span className="text-sm font-bold text-gray-400">•</span>
                      <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">{ncar.area}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-800 capitalize">{ncar.status.toLowerCase().replace('_', ' ')}</p>
                  <p className="text-sm font-bold text-gray-400 mt-1">{new Date(ncar.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-8 py-4 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-2xl transition-all uppercase tracking-widest">
            View All Activities
          </button>
        </div>
      </div>
    </div>
  );

  const renderDepartments = () => (
    <div className="space-y-5 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="text-xl font-bold text-gray-800 uppercase tracking-tight mb-8">Departmental Performance Comparison</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={deptData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
              <Tooltip cursor={{fill: '#f9fafb'}} />
              <Legend />
              <Bar dataKey="NCARs" fill="#00316E" radius={[4, 4, 0, 0]} />
              <Bar dataKey="OFIs" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-5 py-4 text-sm font-black text-gray-400 uppercase tracking-widest">Department</th>
              <th className="px-5 py-4 text-sm font-black text-gray-400 uppercase tracking-widest">Total NCARs</th>
              <th className="px-5 py-4 text-sm font-black text-gray-400 uppercase tracking-widest">Total OFIs</th>
              <th className="px-5 py-4 text-sm font-black text-gray-400 uppercase tracking-widest">Closure Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-[#4B5563]">
            {deptData.map((dept, i) => (
              <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                <td className="px-5 py-4 font-bold text-[#4B5563]">{dept.name}</td>
                <td className="px-5 py-4 font-bold text-blue-600">{dept.NCARs}</td>
                <td className="px-5 py-4 font-bold text-emerald-600">{dept.OFIs}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500" 
                        style={{ width: `${dept.NCARs + dept.OFIs > 0 ? (dept.Closed / (dept.NCARs + dept.OFIs)) * 100 : 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-black text-gray-600">
                      {dept.NCARs + dept.OFIs > 0 ? Math.round((dept.Closed / (dept.NCARs + dept.OFIs)) * 100) : 100}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderManagers = () => (
    <div className="space-y-5 animate-in fade-in duration-500">
      {/* Cascading KPI Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {deptHeadData.map((head, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Department Head</p>
                <h3 className="text-xl font-black text-gray-800">{head.name}</h3>
                <p className="text-sm font-bold text-blue-600">{head.dept}</p>
              </div>
              <div className={`px-4 py-2 rounded-2xl font-black text-lg ${head.avgManagerScore >= 90 ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                {head.avgManagerScore}%
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold text-gray-500">Aggregate Manager KPI</span>
                <span className="font-black text-gray-800">{head.avgManagerScore}%</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${head.avgManagerScore >= 90 ? 'bg-emerald-500' : 'bg-orange-500'}`} 
                  style={{ width: `${head.avgManagerScore}%` }}
                />
              </div>
              <p className="text-sm text-gray-400 italic">
                * This score is a weighted average of all reporting managers' compliance and TAT performance.
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Manager Detailed Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 bg-gray-50/50">
          <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Manager Performance Index</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/30">
                <th className="px-5 py-4 text-sm font-black text-gray-400 uppercase tracking-widest">Manager</th>
                <th className="px-5 py-4 text-sm font-black text-gray-400 uppercase tracking-widest">NCARs</th>
                <th className="px-5 py-4 text-sm font-black text-gray-400 uppercase tracking-widest">Escalated</th>
                <th className="px-5 py-4 text-sm font-black text-gray-400 uppercase tracking-widest">Avg Response TAT</th>
                <th className="px-5 py-4 text-sm font-black text-gray-400 uppercase tracking-widest">CAP Timeliness</th>
                <th className="px-5 py-4 text-sm font-black text-gray-400 uppercase tracking-widest">KPI Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-[#4B5563]">
              {managerData.map((manager, i) => (
                <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-bold text-[#4B5563]">{manager.name}</p>
                    <p className="text-sm text-gray-500">{manager.dept}</p>
                  </td>
                  <td className="px-5 py-4 font-bold text-[#4B5563]">{manager.totalNCARs}</td>
                  <td className="px-5 py-4">
                    <span className={`font-bold ${manager.escalated > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {manager.escalated}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`font-bold ${Number(manager.avgResponseTAT) > tatThreshold ? 'text-orange-600' : 'text-emerald-600'}`}>
                      {manager.avgResponseTAT} days
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${manager.capTimeliness < 80 ? 'text-orange-600' : 'text-emerald-600'}`}>
                        {manager.capTimeliness}%
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-black uppercase tracking-widest ${
                      manager.score >= 90 ? 'bg-emerald-50 text-emerald-600' :
                      manager.score >= 70 ? 'bg-orange-50 text-orange-600' : 'bg-red-50 text-red-600'
                    }`}>
                      {manager.score >= 90 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      {manager.score}%
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderConfig = () => (
    <div className="max-w-2xl mx-auto space-y-5 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
            <Settings size={24} />
          </div>
          <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Analytics Configuration</h3>
        </div>
        
        <div className="space-y-5">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-sm text-[#4B5563] font-bold uppercase tracking-widest">Response TAT Threshold (Working Days)</label>
              <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg font-black">{tatThreshold} Days</span>
            </div>
            <input 
              type="range" min="1" max="15" step="1" 
              value={tatThreshold} 
              onChange={(e) => setTatThreshold(Number(e.target.value))}
              className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600 font-normal"
            />
            <p className="text-xs text-gray-400 font-medium">NCARs and OFIs not responded to within this period will be flagged as overdue.</p>
          </div>

          <div className="pt-8 border-t border-gray-100">
            <button 
              onClick={() => {
                onNotify('Configuration saved successfully.', 'success');
              }}
              className="w-full bg-[#00316E] text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all uppercase tracking-widest"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
          <h3 className="text-2xl font-bold text-gray-800 tracking-tight">Analytics</h3>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm">
            <Filter size={18} className="text-gray-400" />
            <select 
              value={selectedAuditType} 
              onChange={(e) => setSelectedAuditType(e.target.value as any)}
              className="bg-transparent border-none text-l text-[#4B5563] outline-none cursor-pointer appearance-none pr-8 font-normal"
            >
              <option value="All">All Audit Types</option>
              <option value="Quality/InfoSec">Quality/InfoSec</option>
              <option value="Financial">Financial</option>
              <option value="Special Request">Special Request</option>
            </select>
          </div>
          <button className="p-3 bg-white text-gray-400 hover:text-blue-600 rounded-2xl border border-gray-100 shadow-sm transition-all">
            <Download size={20} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 bg-gray-100 rounded-[2rem] w-fit">
        {[
          { id: 'summary', label: 'Summary', icon: BarChart3 },
          { id: 'departments', label: 'Departments', icon: Building2 },
          { id: 'managers', label: 'Manager KPIs', icon: Users },
          { id: 'config', label: 'Config', icon: Settings },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-[1.5rem] text-l font-bold transition-all ${
              activeTab === tab.id 
                ? 'bg-white text-blue-600 shadow-md' 
                : 'text-gray-500 hover:text-[#4B5563]'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="pb-10">
        {activeTab === 'summary' && renderSummary()}
        {activeTab === 'departments' && renderDepartments()}
        {activeTab === 'managers' && renderManagers()}
        {activeTab === 'config' && renderConfig()}
      </div>
    </div>
  );
};

export default AnalyticsModule;








