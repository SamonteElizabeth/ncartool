import React, { useState } from 'react';
import { ShieldCheck, Lock, ArrowRight } from 'lucide-react';
import { Role } from '../types';

interface LoginProps {
  onLogin: (role: Role) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [selectedRole, setSelectedRole] = useState<Role>('LEAD_AUDITOR');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      onLogin(selectedRole);
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#edf7ff] via-[#eaf5ff] to-[#e6f2ff] flex items-center justify-center p-4 md:p-8 [font-family:'Poppins',sans-serif] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[45%] h-[45%] bg-white/70 rounded-full blur-[140px]"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-white/60 rounded-full blur-[140px]"></div>
      </div>

      <div className="w-full max-w-5xl relative z-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div className="rounded-3xl border border-white/80 bg-white/45 backdrop-blur-xl shadow-2xl shadow-blue-100/40 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 min-h-[560px]">
            <div className="hidden md:flex relative items-center justify-center bg-[#00316E]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.24)_0%,transparent_45%)]"></div>
              <div className="absolute top-10 left-10 w-20 h-20 border border-white/25 rounded-2xl"></div>
              <div className="absolute bottom-14 right-12 w-16 h-16 border border-white/20 rounded-xl rotate-12"></div>
              <div className="relative z-10 w-full h-full flex items-center justify-center px-10">
                <img
                  src="/assets/loginpage.png"
                  alt=""
                  className="w-[150%] h-[150%] max-w-none max-h-none object-contain drop-shadow-xl"
                />
              </div>
            </div>

            <div className="p-8 md:p-10 lg:p-12 bg-white/60 backdrop-blur-2xl">
              <div className="mb-8 md:mb-10">
                <img
                  src="/assets/ncar2.png"
                  alt="NCAR Tool logo"
                  className="w-[240px] h-[64px] object-contain -ml-1"
                />
                <img
                  src="/assets/loginpage.png"
                  alt=""
                  className="w-[500px] h-[48px] object-contain -ml-1 md:hidden"
                />
                <h2 className="text-3xl font-black text-gray-900 tracking-tight mt-3 md:mt-0">Welcome Back</h2>
                <p className="text-gray-600 font-medium mt-1">Please select your access role to continue.</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest block ml-1">Access Role</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <ShieldCheck size={20} />
                    </div>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as Role)}
                      className="w-full bg-white/75 border border-white/70 focus:border-[#00316E] rounded-2xl py-4 pl-12 pr-4 font-bold text-gray-900 outline-none transition-all appearance-none cursor-pointer shadow-sm"
                    >
                      <option value="LEAD_AUDITOR">Lead Auditor</option>
                      <option value="AUDITOR">Auditor</option>
                      <option value="AUDITEE">Auditee</option>
                      <option value="DEV_ADMIN">Dev Admin</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <ArrowRight size={18} className="rotate-90" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest block ml-1">Password</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <Lock size={20} />
                    </div>
                    <input
                      type="password"
                      placeholder="********"
                      className="w-full bg-white/75 border border-white/70 focus:border-[#00316E] rounded-2xl py-4 pl-12 pr-4 font-bold text-gray-900 outline-none transition-all shadow-sm"
                      defaultValue="password123"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#00316E] text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-200 hover:bg-[#002A5F] transition-all uppercase tracking-widest flex items-center justify-center gap-3 group disabled:opacity-70"
                >
                  {isLoading ? (
                    <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
