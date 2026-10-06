import React, { useState } from 'react';
import { ShieldCheck, Lock, ArrowRight, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { Role } from '../types';

interface LoginProps {
  onLogin: (role: Role) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [selectedRole, setSelectedRole] = useState<Role>('LEAD_AUDITOR');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      onLogin(selectedRole);
      setIsLoading(false);
    }, 700);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F4F0] via-[#F1F0EB] to-[#EAE9E2] flex items-center justify-center p-4 md:p-8 [font-family:'Poppins',sans-serif] relative overflow-hidden">
      {/* Background Soft Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[15%] -left-[10%] w-[50%] h-[50%] bg-blue-200/20 rounded-full blur-[140px]" />
        <div className="absolute -bottom-[15%] -right-[10%] w-[50%] h-[50%] bg-blue-100/30 rounded-full blur-[140px]" />
      </div>

      {/* Main Centered Card matching the reference image */}
      <div className="w-full max-w-5xl relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="rounded-[32px] bg-white border border-gray-100/80 shadow-2xl shadow-blue-900/10 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[580px]">
            
            {/* Left Column: Vibrant Blue Illustration Section */}
            <div className="relative bg-gradient-to-br from-[#243B73] via-[#1E3268] to-[#172554] p-8 flex items-center justify-center overflow-hidden">
              {/* Subtle background curved arcs */}
              <div className="absolute inset-0 pointer-events-none opacity-20">
                <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full border-[40px] border-white/30" />
                <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full border-[50px] border-white/20" />
              </div>
              
              {/* Floating frosted card accent in top-left */}
              <div className="absolute top-8 left-8 w-16 h-16 border border-white/20 rounded-2xl bg-white/10 backdrop-blur-md pointer-events-none" />

              {/* 3D Audit Team Meeting Illustration */}
              <div className="relative z-10 w-full h-full flex items-center justify-center">
                <img
                  src="/assets/loginpage.png"
                  alt="Audit Team"
                  className="w-full max-h-[460px] object-contain drop-shadow-2xl hover:scale-[1.02] transition-transform duration-300"
                />
              </div>
            </div>

            {/* Right Column: Clean Login Form */}
            <div className="p-8 sm:p-10 lg:p-14 flex flex-col justify-center bg-white">
              
                          {/* Logo Header */}
<div className="flex justify-center mb-8">
  <img
    src="/Finallogo.png?v=2"
    alt="NCARTool"
    className="w-full max-w-[280px] h-auto object-contain"
  />
</div>


              {/* Title & Prompt */}
              <div className="mb-8">
                <h1 className="text-3xl lg:text-4xl font-extrabold text-[#0f172a] tracking-tight">
                  Welcome Back
                </h1>
                <p className="text-gray-500 font-normal mt-2 text-sm md:text-base">
                  Please select your access role to continue.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-6">
                
                {/* Access Role Field */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    ACCESS ROLE
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#172554] pointer-events-none">
                      <ShieldCheck size={20} />
                    </div>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as Role)}
                      className="w-full bg-white border border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 rounded-2xl py-3.5 pl-12 pr-10 text-sm font-medium text-gray-800 outline-none transition-all appearance-none cursor-pointer shadow-sm"
                    >
                      <option value="LEAD_AUDITOR">Lead Auditor</option>
                      <option value="AUDITOR">Auditor</option>
                      <option value="AUDITEE">Auditee</option>
                      <option value="DEV_ADMIN">Dev Admin</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <ChevronDown size={18} />
                    </div>
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    PASSWORD
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                      <Lock size={18} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="•••••••••"
                      className="w-full bg-white border border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 rounded-2xl py-3.5 pl-12 pr-12 text-sm font-medium text-gray-800 outline-none transition-all shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#172554] hover:bg-[#1E3268] active:bg-[#122044] text-white py-4 rounded-2xl font-bold text-sm tracking-wider uppercase transition-all shadow-lg shadow-[#172554]/25 flex items-center justify-center gap-2 group disabled:opacity-70 mt-2"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>SIGN IN</span>
                      <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
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







