
import React, { useState } from 'react';
import { Building2, Shield, Trash2, Search, Pencil, X } from 'lucide-react';
import { User, Role } from '../types';

interface UserManagementProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  departments: string[];
  onNotify: (message: string, type: 'info' | 'success' | 'warning') => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, setUsers, departments, onNotify }) => {
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | ''>('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  const handleEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setUsers(prev => prev.map(user => user.id === editingUser.id ? editingUser : user));
    onNotify(`User ${editingUser.name} updated successfully.`, 'success');
    setEditingUser(null);
  };

  const handleDeleteUser = (id: string) => {
    const userToDelete = users.find(u => u.id === id);
    if (userToDelete?.role === 'DEV_ADMIN') {
      onNotify('Cannot delete Dev Admin user.', 'warning');
      return;
    }
    setUsers(prev => prev.filter(u => u.id !== id));
    onNotify('User deleted successfully.', 'info');
  };

  const filteredUsers = users.filter(u =>
    (u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.dept.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (!roleFilter || u.role === roleFilter) &&
    (!departmentFilter || u.dept === departmentFilter)
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight">USER MANAGEMENT</h1>
        </div>
        <p className="text-sm text-gray-500">Users are provisioned through SSO. Manage access and profile details here.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex flex-wrap items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Search by name, email, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-normal"
            />
          </div>
          <select aria-label="Filter by role" value={roleFilter} onChange={e => setRoleFilter(e.target.value as Role | '')} className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm">
            <option value="">All roles</option>
            <option value="DEV_ADMIN">Dev Admin</option><option value="LEAD_AUDITOR">Lead Auditor</option><option value="HEAD_MANAGER">Head Manager</option>
            <option value="AUDITOR">Auditor</option><option value="AUDITEE">Auditee</option><option value="GUEST">Guest</option>
          </select>
          <select aria-label="Filter by department" value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)} className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm">
            <option value="">All departments</option>{departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-blue-50 text-blue-900 border-b border-blue-100">
                <th className="px-6 py-4 text-left text-xs font-semibold text-blue-900 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-blue-900 uppercase tracking-wider">Department</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-blue-900 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-blue-900 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-[#4B5563]">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-[#172554] font-semibold">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{user.name}</p>
                        <p className="text-xs text-gray-500 font-normal">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Building2 size={16} />
                      <span className="text-sm font-normal text-gray-700">{user.dept}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${
                      user.role === 'DEV_ADMIN' ? 'bg-purple-100 text-purple-700' :
                      user.role === 'LEAD_AUDITOR' ? 'bg-blue-100 text-blue-700' :
                      user.role === 'HEAD_MANAGER' ? 'bg-amber-100 text-amber-700' :
                      user.role === 'AUDITOR' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-gray-100 text-[#4B5563]'
                    }`}>
                      <Shield size={12} />
                      {user.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-1">
                    <button onClick={() => setEditingUser({ ...user })} className="p-2 text-gray-400 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all" title="Edit User" aria-label={`Edit ${user.name}`}><Pencil size={18} /></button>
                    {user.role !== 'DEV_ADMIN' && (
                      <div className="relative group/tooltip inline-flex justify-center items-center">
                        <button 
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete User"
                          aria-label="Delete User"
                        >
                          <Trash2 size={18} />
                        </button>
                        <div className="pointer-events-none absolute bottom-full mb-2 right-0 hidden group-hover/tooltip:flex flex-col items-end z-30 transition-all duration-150">
                          <span className="px-2.5 py-1 text-xs font-medium text-blue-900 bg-blue-50 border border-blue-200 rounded-lg shadow-md whitespace-nowrap">
                            Delete User
                          </span>
                          <span className="w-1.5 h-1.5 bg-blue-50 border-r border-b border-blue-200 rotate-45 -mt-1 mr-3"></span>
                        </div>
                      </div>
                    )}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Edit User</h2>
              <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditUser} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4 text-sm text-[#4B5563] font-medium">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Full Name <span className="text-red-500">*</span></label>
                <input 
                  required
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-[#d9d4c8] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-normal text-gray-800"
                  placeholder="e.g. John Smith"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Email Address <span className="text-red-500">*</span></label>
                <input 
                  required
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-[#d9d4c8] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-normal text-gray-800"
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Department <span className="text-red-500">*</span></label>
                <select
                  required
                  value={editingUser.dept}
                  onChange={(e) => setEditingUser({...editingUser, dept: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-[#d9d4c8] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-normal text-gray-800"
                >
                  {!departments.includes(editingUser.dept) && <option value={editingUser.dept}>{editingUser.dept}</option>}
                  {departments.map(department => <option key={department} value={department}>{department}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Designation <span className="text-red-500">*</span></label>
                <select 
                  value={editingUser.designation}
                  onChange={(e) => setEditingUser({...editingUser, designation: e.target.value as User['designation']})}
                  className="w-full px-4 py-3 bg-white border border-[#d9d4c8] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none font-normal text-gray-800"
                >
                  <option value="Staff">Staff</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Assistant Manager">Assistant Manager</option>
                  <option value="Manager">Manager</option>
                  <option value="Department Head">Department Head</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">System Role <span className="text-red-500">*</span></label>
                <select 
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({...editingUser, role: e.target.value as Role})}
                  className="w-full px-4 py-3 bg-white border border-[#d9d4c8] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none font-normal text-gray-800"
                >
                  <option value="DEV_ADMIN">Dev Admin</option>
                  <option value="LEAD_AUDITOR">Lead Auditor</option>
                  <option value="HEAD_MANAGER">Head Manager</option>
                  <option value="AUDITOR">Auditor</option>
                  <option value="AUDITEE">Auditee</option>
                  <option value="GUEST">Guest</option>
                </select>
              </div>
              <button 
                type="submit"
                className="sm:col-span-2 w-full bg-[#172554] text-white py-3 rounded-lg font-semibold shadow-sm hover:bg-[#1E3268] transition-all mt-2"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;








