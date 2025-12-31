
import React, { useState, useEffect } from 'react';
import { FamilyTab } from '../types';
import { useAuthContext } from '../context/AuthContext';
import { LoginView, SettingsView, UsersView, BackupView, RecycleView } from './AuthSubViews';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackup?: () => Promise<any>;
  onRestore?: (data: any) => Promise<void>;
  marqueeText: string;
  onUpdateMarquee: (text: string) => void;
  recycledTabs?: FamilyTab[];
  onRestoreTab?: (id: string, newOwner?: string) => void;
  onPermanentDeleteTab?: (id: string) => void;
  onDeleteUser?: (user: string) => Promise<void>;
}

const AuthModal: React.FC<AuthModalProps> = ({
  isOpen, onClose,
  onBackup, onRestore,
  marqueeText, onUpdateMarquee,
  recycledTabs = [], onRestoreTab, onPermanentDeleteTab, onDeleteUser
}) => {
  const { 
      isAuthenticated, currentUser, localUsers: usersList, 
      handleLogin, handleLogout, 
      handleCreateUser, handleUpdateUser, 
      handleChangePassword 
  } = useAuthContext();

  const [activeTab, setActiveTab] = useState<'login' | 'settings' | 'users' | 'backup' | 'recycle'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Init
  useEffect(() => {
      if (isOpen) {
          if (isAuthenticated) setActiveTab('settings');
          else setActiveTab('login');
          setError('');
      }
  }, [isOpen, isAuthenticated]);

  const onLoginWrapper = async (user: string, pass: string) => {
      setIsLoading(true);
      setError('');
      try {
          await handleLogin(user, pass);
      } catch (err: any) {
          setError(err.message || "خطا در ورود");
      } finally {
          setIsLoading(false);
      }
  };

  const handleBackupWrapper = async () => {
      if (!onBackup) return;
      setIsLoading(true);
      try {
          const data = await onBackup();
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Full_Database_Backup_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.json`;
          link.click();
      } catch(err: any) {
          alert("Backup Failed: " + err.message);
      } finally {
          setIsLoading(false);
      }
  };

  const handleRestoreWrapper = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = '';

      if (!onRestore) return alert("تابع بازگردانی تعریف نشده است.");
      if (!window.confirm("هشدار جدی: \nتمام اطلاعات دیتابیس فعلی پاک شده و با فایل جدید جایگزین می‌شود. \nآیا کاملاً مطمئن هستید؟")) return;

      const reader = new FileReader();
      reader.onload = async (ev) => {
          try {
              const json = JSON.parse(ev.target?.result as string);
              setIsLoading(true);
              await onRestore(json);
              alert("بازیابی با موفقیت انجام شد. صفحه رفرش می‌شود.");
              window.location.reload();
          } catch (err: any) {
              alert("خطا در بازیابی: " + err.message);
              setIsLoading(false);
          }
      };
      reader.readAsText(file);
  };

  const withLoader = async (fn: () => Promise<void>) => {
      setIsLoading(true);
      try { await fn(); } 
      catch (err: any) { alert("خطا: " + err.message); } 
      finally { setIsLoading(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
       <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
           
           {/* Header Tabs */}
           <div className="flex bg-slate-100 p-1 border-b border-slate-200 overflow-x-auto no-scrollbar">
               {!isAuthenticated ? (
                   <button className="flex-1 py-3 rounded-xl bg-white shadow text-sm font-black text-slate-800">ورود به حساب</button>
               ) : (
                   <>
                       <button onClick={() => setActiveTab('settings')} className={`flex-1 min-w-[70px] py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'settings' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>تنظیمات</button>
                       {currentUser?.role === 'admin' && (
                           <>
                             <button onClick={() => setActiveTab('users')} className={`flex-1 min-w-[70px] py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'users' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>کاربران</button>
                             <button onClick={() => setActiveTab('backup')} className={`flex-1 min-w-[70px] py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'backup' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>پشتیبان</button>
                             <button onClick={() => setActiveTab('recycle')} className={`flex-1 min-w-[70px] py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'recycle' ? 'bg-white shadow text-red-600' : 'text-slate-500'}`}>بازیافت</button>
                           </>
                       )}
                   </>
               )}
           </div>

           {/* Content */}
           <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
               
               {!isAuthenticated && (
                   <LoginView onLogin={onLoginWrapper} isLoading={isLoading} error={error} />
               )}

               {isAuthenticated && activeTab === 'settings' && (
                   <SettingsView 
                       currentUser={currentUser} 
                       onChangePassword={(p) => withLoader(() => handleChangePassword(p))}
                       marqueeText={marqueeText}
                       onUpdateMarquee={onUpdateMarquee}
                       onLogout={handleLogout}
                       isLoading={isLoading}
                   />
               )}

               {isAuthenticated && activeTab === 'users' && currentUser?.role === 'admin' && (
                   <UsersView 
                       usersList={usersList}
                       currentUser={currentUser}
                       onCreateUser={(u, p, r) => withLoader(() => handleCreateUser(u, p, r))}
                       onUpdateUser={(o, n, p, r) => withLoader(() => handleUpdateUser(o, n, p, r))}
                       onDeleteUser={(u) => withLoader(() => onDeleteUser ? onDeleteUser(u) : Promise.resolve())}
                       isLoading={isLoading}
                   />
               )}

               {isAuthenticated && activeTab === 'backup' && currentUser?.role === 'admin' && (
                   <BackupView 
                       onBackup={handleBackupWrapper}
                       onRestore={handleRestoreWrapper}
                       isLoading={isLoading}
                   />
               )}

               {isAuthenticated && activeTab === 'recycle' && currentUser?.role === 'admin' && (
                  <RecycleView 
                      recycledTabs={recycledTabs}
                      usersList={usersList}
                      onRestoreTab={onRestoreTab || (() => {})}
                      onPermanentDeleteTab={onPermanentDeleteTab || (() => {})}
                  />
               )}

           </div>

           {/* Footer */}
           <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-center">
               <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xs font-bold">بستن پنجره</button>
           </div>
       </div>
    </div>
  );
};

export default AuthModal;
