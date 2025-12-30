
import React, { useState, useEffect } from 'react';
import { FamilyTab } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  currentUser: { username: string; role: 'admin' | 'user' } | null;
  onLogin: (user: string, pass: string) => Promise<void>;
  onLogout: () => void;
  // Admin Actions
  onCreateUser?: (user: string, pass: string, role: 'admin' | 'user') => Promise<void>;
  onDeleteUser?: (user: string) => Promise<void>;
  onUpdateUser?: (oldUsername: string, newUsername: string, newPass: string, newRole: 'admin' | 'user') => Promise<void>; // New prop
  onChangePassword?: (newPass: string) => Promise<void>;
  usersList?: any[]; 
  onBackup?: () => Promise<any>;
  onRestore?: (data: any) => Promise<void>;
  marqueeText: string;
  onUpdateMarquee: (text: string) => void;
  // Recycle Bin
  recycledTabs?: FamilyTab[];
  onRestoreTab?: (id: string, newOwner?: string) => void;
  onPermanentDeleteTab?: (id: string) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({
  isOpen, onClose, isAuthenticated, currentUser,
  onLogin, onLogout, onCreateUser, onDeleteUser, onUpdateUser, onChangePassword, usersList = [],
  onBackup, onRestore,
  marqueeText, onUpdateMarquee,
  recycledTabs = [], onRestoreTab, onPermanentDeleteTab
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'settings' | 'users' | 'backup' | 'recycle'>('login');
  
  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Settings State
  const [localMarquee, setLocalMarquee] = useState(marqueeText);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // User Management State
  const [newUser, setNewUser] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
  
  // Edit User State
  const [editingUser, setEditingUser] = useState<{ username: string; role: 'admin' | 'user' } | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'user'>('user');

  // Recycle Bin State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [restoreOwnerSelections, setRestoreOwnerSelections] = useState<Record<string, string>>({});

  // Init
  useEffect(() => {
      if (isOpen) {
          if (isAuthenticated) setActiveTab('settings');
          else setActiveTab('login');
          setLocalMarquee(marqueeText);
      }
  }, [isOpen, isAuthenticated, marqueeText]);

  const handleLoginSubmit = async () => {
      setIsLoading(true);
      setError('');
      try {
          await onLogin(username, password);
          setUsername('');
          setPassword('');
      } catch (err: any) {
          setError(err.message || "خطا در ورود");
      } finally {
          setIsLoading(false);
      }
  };

  const handleCreateUser = async () => {
      if (!newUser || !newPass) return alert("لطفا نام کاربری و رمز عبور را وارد کنید");
      setIsLoading(true);
      try {
          if (onCreateUser) await onCreateUser(newUser, newPass, newRole);
          setNewUser('');
          setNewPass('');
          alert("کاربر با موفقیت ایجاد شد");
      } catch (err: any) {
          alert("خطا: " + err.message);
      } finally {
          setIsLoading(false);
      }
  };

  const handleStartEditUser = (user: any) => {
      setEditingUser(user);
      setEditUsername(user.username);
      setEditPassword(user.password || ''); // Assuming password might be locally available or blank for security
      setEditRole(user.role);
  };

  const handleSaveEditUser = async () => {
      if (!editingUser || !onUpdateUser) return;
      if (!editUsername || !editPassword) return alert("نام کاربری و رمز عبور الزامی است");
      
      setIsLoading(true);
      try {
          await onUpdateUser(editingUser.username, editUsername, editPassword, editRole);
          setEditingUser(null);
          setEditUsername('');
          setEditPassword('');
      } catch (err: any) {
          alert("خطا: " + err.message);
      } finally {
          setIsLoading(false);
      }
  };

  const handleDeleteUserClick = async (targetUser: string) => {
      if (!onDeleteUser) return;
      if (window.confirm(`آیا از حذف کاربر ${targetUser} اطمینان دارید؟ تمام خاندان‌های این کاربر به سطل بازیافت منتقل می‌شوند.`)) {
          setIsLoading(true);
          try {
              await onDeleteUser(targetUser);
          } catch(err: any) {
              alert("خطا: " + err.message);
          } finally {
              setIsLoading(false);
          }
      }
  };

  const handleChangePasswordClick = async () => {
      if (!newPasswordInput) return alert("لطفا رمز عبور جدید را وارد کنید");
      if (!onChangePassword) return;
      
      setIsLoading(true);
      try {
          await onChangePassword(newPasswordInput);
          setNewPasswordInput('');
      } catch (err: any) {
          alert("خطا: " + err.message);
      } finally {
          setIsLoading(false);
      }
  };

  const handleBackup = async () => {
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

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      // Reset input value to allow selecting the same file again if needed
      e.target.value = '';

      if (!onRestore) {
          alert("تابع بازگردانی تعریف نشده است.");
          return;
      }
      
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
               
               {/* LOGIN TAB */}
               {!isAuthenticated && (
                   <div className="space-y-4 animate-in fade-in">
                       <div className="text-center mb-6">
                           <div className="w-16 h-16 bg-amber-100 rounded-full mx-auto flex items-center justify-center text-amber-600 mb-2">
                               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                           </div>
                           <h3 className="text-lg font-black text-slate-800">ورود امن</h3>
                           <p className="text-xs text-slate-500">جهت مدیریت و ساخت خاندان وارد شوید</p>
                       </div>

                       {error && <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-100 text-center">{error}</div>}

                       <input type="text" placeholder="نام کاربری" value={username} onChange={e => setUsername(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-left text-sm font-bold outline-none focus:border-amber-500" dir="ltr" />
                       <input type="password" placeholder="رمز عبور" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-left text-sm font-bold outline-none focus:border-amber-500" dir="ltr" />
                       
                       <button onClick={handleLoginSubmit} disabled={isLoading} className="w-full bg-slate-800 text-white py-3 rounded-xl font-black hover:bg-slate-900 transition-all disabled:opacity-50">
                           {isLoading ? 'در حال بررسی...' : 'ورود'}
                       </button>
                   </div>
               )}

               {/* SETTINGS TAB */}
               {isAuthenticated && activeTab === 'settings' && (
                   <div className="space-y-6 animate-in fade-in">
                       <div className="text-center p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                           <p className="text-xs font-bold text-emerald-800">خوش آمدید، {currentUser?.username}</p>
                           <p className="text-[10px] text-emerald-600 uppercase mt-1">نقش: {currentUser?.role}</p>
                       </div>

                       <div>
                           <label className="text-xs font-bold text-slate-500 mb-2 block">تغییر رمز عبور:</label>
                           <div className="flex gap-2">
                               <input type="text" placeholder="رمز جدید..." value={newPasswordInput} onChange={e => setNewPasswordInput(e.target.value)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm focus:border-amber-500 outline-none" dir="ltr"/>
                               <button onClick={handleChangePasswordClick} className="bg-slate-800 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-900">تغییر</button>
                           </div>
                       </div>

                       <div>
                           <label className="text-xs font-bold text-slate-500 mb-2 block">متن نوار متحرک (اخبار):</label>
                           <textarea rows={3} value={localMarquee} onChange={e => setLocalMarquee(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:border-amber-500 outline-none" />
                           <button onClick={() => onUpdateMarquee(localMarquee)} className="mt-2 w-full py-2 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600">بروزرسانی متن</button>
                       </div>

                       <button onClick={onLogout} className="w-full py-3 border-2 border-red-100 text-red-500 rounded-xl font-bold hover:bg-red-50 transition-all">خروج از حساب</button>
                   </div>
               )}

               {/* USERS TAB */}
               {isAuthenticated && activeTab === 'users' && (
                   <div className="space-y-6 animate-in fade-in">
                       
                       {/* Create New User */}
                       <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                           <h4 className="text-xs font-black text-slate-700">تعریف کاربر جدید</h4>
                           <input type="text" placeholder="نام کاربری جدید" value={newUser} onChange={e => setNewUser(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-left" dir="ltr" />
                           <input type="text" placeholder="رمز عبور" value={newPass} onChange={e => setNewPass(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-left" dir="ltr" />
                           <select value={newRole} onChange={(e: any) => setNewRole(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold">
                               <option value="user">کاربر عادی</option>
                               <option value="admin">مدیر (Admin)</option>
                           </select>
                           <button onClick={handleCreateUser} disabled={isLoading} className="w-full bg-indigo-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-indigo-700">
                               {isLoading ? '...' : 'ایجاد کاربر'}
                           </button>
                       </div>

                        {/* Edit User Modal Area (Inline) */}
                        {editingUser && (
                           <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 space-y-3 animate-in fade-in">
                               <div className="flex justify-between items-center">
                                   <h4 className="text-xs font-black text-amber-800">ویرایش: {editingUser.username}</h4>
                                   <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600">
                                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                   </button>
                               </div>
                               <input type="text" placeholder="نام کاربری" value={editUsername} onChange={e => setEditUsername(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-amber-200 text-xs font-bold text-left" dir="ltr" />
                               <input type="text" placeholder="رمز عبور جدید" value={editPassword} onChange={e => setEditPassword(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-amber-200 text-xs font-bold text-left" dir="ltr" />
                               <select value={editRole} onChange={(e: any) => setEditRole(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-amber-200 text-xs font-bold">
                                   <option value="user">کاربر عادی</option>
                                   <option value="admin">مدیر (Admin)</option>
                               </select>
                               <button onClick={handleSaveEditUser} disabled={isLoading} className="w-full bg-amber-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-amber-700">
                                   {isLoading ? '...' : 'ذخیره تغییرات'}
                               </button>
                           </div>
                        )}

                       <div>
                           <h4 className="text-xs font-black text-slate-700 mb-2 flex justify-between">
                             <span>لیست کاربران</span>
                           </h4>
                           <div className="max-h-32 overflow-y-auto space-y-1">
                               {usersList.map((u, i) => {
                                   const isCurrentUser = u.username === currentUser?.username;
                                   return (
                                   <div key={i} className="flex justify-between items-center bg-white p-2 rounded border border-slate-100 text-xs font-bold text-slate-600">
                                       <div className="flex items-center gap-2">
                                            {/* Status Dot: Green for current user, Red for others */}
                                            <span className={`w-2 h-2 rounded-full ${isCurrentUser ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 'bg-red-400'}`}></span>
                                            <div className="flex flex-col">
                                                <span>{u.username}</span>
                                                <span className="text-[9px] text-slate-400">{u.role}</span>
                                            </div>
                                       </div>
                                       
                                       <div className="flex gap-1">
                                           <button 
                                              onClick={() => handleStartEditUser(u)}
                                              className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded"
                                              title="ویرایش"
                                           >
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                           </button>
                                           
                                           {u.username !== currentUser?.username && u.username !== '1' && (
                                               <button 
                                                  onClick={() => handleDeleteUserClick(u.username)}
                                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                  title="حذف کاربر"
                                               >
                                                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                               </button>
                                           )}
                                       </div>
                                   </div>
                               )})}
                               {usersList.length === 0 && <p className="text-center text-[10px] text-slate-400 py-2">کاربری یافت نشد</p>}
                           </div>
                       </div>
                   </div>
               )}

               {/* BACKUP TAB */}
               {isAuthenticated && activeTab === 'backup' && (
                   <div className="space-y-6 animate-in fade-in text-center">
                       <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                           <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                           </div>
                           <h4 className="font-bold text-blue-900 text-sm mb-1">دانلود نسخه پشتیبان</h4>
                           <p className="text-[10px] text-blue-700 mb-3">کل دیتابیس (شامل کاربران و تمام خاندان‌ها) دانلود می‌شود.</p>
                           <button onClick={handleBackup} disabled={isLoading} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 w-full">
                               {isLoading ? 'در حال دانلود...' : 'دریافت فایل بک‌آپ'}
                           </button>
                       </div>

                       <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                           <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-2">
                               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                           </div>
                           <h4 className="font-bold text-orange-900 text-sm mb-1">بازگردانی دیتابیس</h4>
                           <p className="text-[10px] text-orange-700 mb-3">هشدار: دیتابیس فعلی کاملاً حذف می‌شود.</p>
                           <label className="block w-full">
                               <span className="block w-full px-6 py-2 bg-white border border-orange-300 text-orange-600 rounded-xl text-xs font-bold hover:bg-orange-100 cursor-pointer">
                                   {isLoading ? 'در حال آپلود...' : 'انتخاب فایل و ریستور'}
                               </span>
                               <input type="file" onChange={handleRestore} accept=".json" className="hidden" disabled={isLoading} />
                           </label>
                       </div>
                   </div>
               )}

               {/* RECYCLE BIN TAB */}
               {isAuthenticated && activeTab === 'recycle' && (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="p-3 bg-red-50 rounded-xl border border-red-100 text-center mb-4">
                        <p className="text-xs font-bold text-red-800">سطل بازیافت (خاندان‌های حذف شده)</p>
                        <p className="text-[10px] text-red-600 mt-1">حذف در اینجا قطعی و غیرقابل بازگشت است.</p>
                    </div>

                    {recycledTabs.length === 0 ? (
                        <div className="text-center text-slate-400 py-8">
                            <svg className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            <p className="text-xs font-bold">سطل بازیافت خالی است</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                           {recycledTabs.map(tab => (
                               <div key={tab.id} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-2">
                                   <div className="flex justify-between items-center">
                                       <span className="font-black text-slate-800 text-sm">{tab.title}</span>
                                       <span className="text-[10px] text-slate-400">مالک قبلی: {tab.owner}</span>
                                   </div>
                                   
                                   {/* Restore Assignment UI */}
                                   <div className="flex items-center gap-2 mt-1 mb-2">
                                       <span className="text-[10px] text-slate-500 font-bold">بازگردانی برای:</span>
                                       <select 
                                         className="flex-1 text-[10px] bg-slate-50 border border-slate-200 rounded p-1 font-bold"
                                         value={restoreOwnerSelections[tab.id] || tab.owner || 'admin'}
                                         onChange={(e) => setRestoreOwnerSelections(prev => ({ ...prev, [tab.id]: e.target.value }))}
                                       >
                                           <option value={tab.owner || 'admin'}>مالک قبلی ({tab.owner})</option>
                                           {usersList.map(u => (
                                               <option key={u.username} value={u.username}>{u.username}</option>
                                           ))}
                                       </select>
                                   </div>

                                   <div className="flex gap-2">
                                       <button 
                                          onClick={() => onRestoreTab && onRestoreTab(tab.id, restoreOwnerSelections[tab.id])}
                                          className="flex-1 bg-green-50 text-green-700 py-1.5 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors"
                                       >
                                           بازیابی
                                       </button>
                                       <button 
                                          onClick={() => {
                                              if (deleteConfirmId === tab.id) {
                                                  onPermanentDeleteTab && onPermanentDeleteTab(tab.id);
                                                  setDeleteConfirmId(null);
                                              } else {
                                                  setDeleteConfirmId(tab.id);
                                                  setTimeout(() => setDeleteConfirmId(null), 3000);
                                              }
                                          }}
                                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 
                                            ${deleteConfirmId === tab.id 
                                                ? 'bg-red-600 text-white animate-pulse' 
                                                : 'bg-red-50 text-red-700 hover:bg-red-100'
                                            }`}
                                       >
                                           {deleteConfirmId === tab.id ? 'تایید حذف؟' : 'حذف قطعی'}
                                       </button>
                                   </div>
                               </div>
                           ))}
                        </div>
                    )}
                  </div>
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
