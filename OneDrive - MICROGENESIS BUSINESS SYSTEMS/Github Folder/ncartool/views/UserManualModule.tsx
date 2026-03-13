
import React, { useState, useRef } from 'react';
import { FileText, Upload, Download, Trash2, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Role } from '../types';

interface UserManualModuleProps {
  role: Role;
  userManualFile: { name: string, url: string, uploadedAt: string } | null;
  setUserManualFile: (file: { name: string, url: string, uploadedAt: string } | null) => void;
  onNotify: (message: string, type: 'info' | 'success' | 'warning') => void;
}

const UserManualModule: React.FC<UserManualModuleProps> = ({ 
  role, 
  userManualFile, 
  setUserManualFile, 
  onNotify 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const uploadFile = (file: File) => {
    // Simulate upload
    const newFile = {
      name: file.name,
      url: URL.createObjectURL(file),
      uploadedAt: new Date().toLocaleString()
    };
    setUserManualFile(newFile);
    onNotify(`User Manual "${file.name}" uploaded successfully.`, 'success');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const removeFile = () => {
    setUserManualFile(null);
    onNotify('User Manual removed.', 'info');
  };

  const isDevAdmin = role === 'DEV_ADMIN';

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-blue-50 rounded-2xl">
            <FileText className="text-blue-600" size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">User Manual</h1>
          </div>
        </div>

        {isDevAdmin ? (
          <div className="space-y-6">
            {!userManualFile ? (
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-4 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center transition-all cursor-pointer ${
                  isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden font-normal" 
                  accept=".pdf,.doc,.docx"
                />
                <div className="p-6 bg-blue-100 rounded-full mb-6">
                  <Upload className="text-blue-600" size={48} />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Upload User Manual</h3>
                <p className="text-gray-500 text-center max-w-xs">
                  Drag and drop the manual here, or click to browse files.
                  <br />
                  <span className="text-xs font-bold uppercase tracking-widest mt-4 block">Supported: PDF, DOCX</span>
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-white rounded-2xl shadow-sm">
                    <FileText className="text-blue-600" size={40} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{userManualFile.name}</h3>
                    <p className="text-sm text-gray-500 font-medium">Uploaded on {userManualFile.uploadedAt}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <CheckCircle size={16} className="text-green-500" />
                      <span className="text-xs font-bold text-green-600 uppercase tracking-widest">Active Manual</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <a 
                    href={userManualFile.url} 
                    download={userManualFile.name}
                    className="p-4 bg-white text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center gap-2 font-bold"
                  >
                    <Download size={20} />
                    Download
                  </a>
                  <button 
                    onClick={removeFile}
                    className="p-4 bg-white text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-sm flex items-center gap-2 font-bold"
                  >
                    <Trash2 size={20} />
                    Remove
                  </button>
                </div>
              </div>
            )}
            
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 flex items-start gap-4">
              <Info className="text-gray-400 mt-1" size={20} />
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  As a <span className="font-bold text-gray-800">Dev Admin</span>, you are responsible for maintaining the system documentation. 
                  Uploading a new file will replace the current manual for all users.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {userManualFile ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-blue-50 rounded-2xl">
                    <FileText className="text-blue-600" size={40} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{userManualFile.name}</h3>
                    <p className="text-sm text-gray-500 font-medium">Version updated: {userManualFile.uploadedAt}</p>
                  </div>
                </div>
                <a 
                  href={userManualFile.url} 
                  download={userManualFile.name}
                  className="w-full md:w-auto px-8 py-4 bg-[#00316E] text-white rounded-2xl hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center gap-3 font-bold text-lg"
                >
                  <Download size={24} />
                  Download Manual
                </a>
              </div>
            ) : (
              <div className="bg-orange-50 rounded-2xl p-12 border border-orange-100 flex flex-col items-center text-center">
                <div className="p-6 bg-white rounded-full mb-6 shadow-sm">
                  <AlertCircle className="text-orange-500" size={48} />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Manual Not Available</h3>
                <p className="text-gray-600 max-w-md">
                  The system administrator has not uploaded the user manual yet. 
                  Please check back later or contact IT support.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: 'Navigation', desc: 'Learn how to move between modules' },
                { title: 'NCAR Lifecycle', desc: 'Understand the flow of non-conformities' },
                { title: 'Role Permissions', desc: 'What you can and cannot do' }
              ].map((item, i) => (
                <div key={i} className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                  <h4 className="font-bold text-gray-800 mb-1">{item.title}</h4>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManualModule;








