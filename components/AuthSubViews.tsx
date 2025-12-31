
import React, { useState } from 'react';
import { FamilyTab } from '../types';

// --- Login View ---
interface LoginViewProps {
    onLogin: (user: string, pass: string) => Promise<void>;
    isLoading: boolean;
    error: string;
}
export const LoginView: React.FC<LoginViewProps> = ({ onLogin, isLoading, error }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async () => {
        await onLogin(username, password);
        setUsername('');
        setPassword('');
    };

    return (
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
            
            <button onClick={handleSubmit} disabled={isLoading} className="w-full bg-slate-800 text-white py-3 rounded-xl font-black hover:bg-slate-900 transition-all disabled:opacity-50">
                {isLoading ? 'در حال بررسی...' : 'ورود'}
            </button>
        </div>
    );
};

// --- Settings View ---
interface SettingsViewProps {
    currentUser: any;
    onChangePassword: (pass: string) => Promise<void>;
    marqueeText: string;
    onUpdateMarquee: (text: string) => void;
    onLogout: () => void;
    isLoading: boolean;
}
export const SettingsView: React.FC<SettingsViewProps> = ({ currentUser, onChangePassword, marqueeText, onUpdateMarquee, onLogout, isLoading }) => {
    const [localMarquee, setLocalMarquee] = useState(marqueeText);
    const [newPasswordInput, setNewPasswordInput] = useState('');

    const handleChangePass = async () => {
        if(!newPasswordInput) return alert("رمز عبور جدید را وارد کنید");
        await onChangePassword(newPasswordInput);
        setNewPasswordInput('');
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="text-center p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <p className="text-xs font-bold text-emerald-800">خوش آمدید، {currentUser?.username}</p>
                <p className="text-[10px] text-emerald-600 uppercase mt-1">نقش: {currentUser?.role}</p>
            </div>

            <div>
                <label className="text-xs font-bold text-slate-500 mb-2 block">تغییر رمز عبور:</label>
                <div className="flex gap-2">
                    <input type="text" placeholder="رمز جدید..." value={newPasswordInput} onChange={e => setNewPasswordInput(e.target.value)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm focus:border-amber-500 outline-none" dir="ltr"/>
                    <button onClick={handleChangePass} disabled={isLoading} className="bg-slate-800 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-900">تغییر</button>
                </div>
            </div>

            <div>
                <label className="text-xs font-bold text-slate-500 mb-2 block">متن نوار متحرک (اخبار):</label>
                <textarea rows={3} value={localMarquee} onChange={e => setLocalMarquee(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:border-amber-500 outline-none" />
                <button onClick={() => onUpdateMarquee(localMarquee)} className="mt-2 w-full py-2 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600">بروزرسانی متن</button>
            </div>

            <button onClick={onLogout} className="w-full py-3 border-2 border-red-100 text-red-500 rounded-xl font-bold hover:bg-red-50 transition-all">خروج از حساب</button>
        </div>
    );
};

// --- Users View ---
interface UsersViewProps {
    usersList: any[];
    currentUser: any;
    onCreateUser: (u: string, p: string, r: 'admin'|'user') => Promise<void>;
    onUpdateUser: (oldU: string, newU: string, p: string, r: 'admin'|'user') => Promise<void>;
    onDeleteUser: (u: string) => Promise<void>;
    isLoading: boolean;
}
export const UsersView: React.FC<UsersViewProps> = ({ usersList, currentUser, onCreateUser, onUpdateUser, onDeleteUser, isLoading }) => {
    const [newUser, setNewUser] = useState('');
    const [newPass, setNewPass] = useState('');
    const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
    
    const [editingUser, setEditingUser] = useState<any>(null);
    const [editUsername, setEditUsername] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [editRole, setEditRole] = useState<'admin' | 'user'>('user');

    const handleCreate = async () => {
        if (!newUser || !newPass) return alert("لطفا نام کاربری و رمز عبور را وارد کنید");
        await onCreateUser(newUser, newPass, newRole);
        setNewUser(''); setNewPass('');
    };

    const handleStartEdit = (u: any) => {
        setEditingUser(u);
        setEditUsername(u.username);
        setEditPassword(u.password || '');
        setEditRole(u.role);
    };

    const handleSaveEdit = async () => {
        if (!editingUser || !editUsername || !editPassword) return;
        await onUpdateUser(editingUser.username, editUsername, editPassword, editRole);
        setEditingUser(null);
    };

    const handleDelete = async (u: string) => {
        if(window.confirm(`حذف کاربر ${u}؟`)) await onDeleteUser(u);
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Create */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                <h4 className="text-xs font-black text-slate-700">تعریف کاربر جدید</h4>
                <input type="text" placeholder="نام کاربری جدید" value={newUser} onChange={e => setNewUser(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-left" dir="ltr" />
                <input type="text" placeholder="رمز عبور" value={newPass} onChange={e => setNewPass(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-left" dir="ltr" />
                <select value={newRole} onChange={(e: any) => setNewRole(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold">
                    <option value="user">کاربر عادی</option>
                    <option value="admin">مدیر (Admin)</option>
                </select>
                <button onClick={handleCreate} disabled={isLoading} className="w-full bg-indigo-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-indigo-700">{isLoading ? '...' : 'ایجاد کاربر'}</button>
            </div>

            {/* Edit */}
            {editingUser && (
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 space-y-3 animate-in fade-in">
                    <div className="flex justify-between items-center">
                        <h4 className="text-xs font-black text-amber-800">ویرایش: {editingUser.username}</h4>
                        <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                    <input type="text" placeholder="نام کاربری" value={editUsername} onChange={e => setEditUsername(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-amber-200 text-xs font-bold text-left" dir="ltr" />
                    <input type="text" placeholder="رمز عبور جدید" value={editPassword} onChange={e => setEditPassword(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-amber-200 text-xs font-bold text-left" dir="ltr" />
                    <select value={editRole} onChange={(e: any) => setEditRole(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-amber-200 text-xs font-bold">
                        <option value="user">کاربر عادی</option>
                        <option value="admin">مدیر (Admin)</option>
                    </select>
                    <button onClick={handleSaveEdit} disabled={isLoading} className="w-full bg-amber-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-amber-700">{isLoading ? '...' : 'ذخیره تغییرات'}</button>
                </div>
            )}

            {/* List */}
            <div>
                <h4 className="text-xs font-black text-slate-700 mb-2">لیست کاربران</h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                    {usersList.map((u, i) => (
                        <div key={i} className="flex justify-between items-center bg-white p-2 rounded border border-slate-100 text-xs font-bold text-slate-600">
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${u.username === currentUser?.username ? 'bg-green-500' : 'bg-red-400'}`}></span>
                                <div className="flex flex-col"><span>{u.username}</span><span className="text-[9px] text-slate-400">{u.role}</span></div>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => handleStartEdit(u)} className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                {u.username !== currentUser?.username && u.username !== '1' && (
                                    <button onClick={() => handleDelete(u.username)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- Backup View ---
interface BackupViewProps {
    onBackup: () => Promise<void>;
    onRestore: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isLoading: boolean;
}
export const BackupView: React.FC<BackupViewProps> = ({ onBackup, onRestore, isLoading }) => {
    return (
        <div className="space-y-6 animate-in fade-in text-center">
            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </div>
                <h4 className="font-bold text-blue-900 text-sm mb-1">دانلود نسخه پشتیبان</h4>
                <p className="text-[10px] text-blue-700 mb-3">کل دیتابیس (شامل کاربران و تمام خاندان‌ها) دانلود می‌شود.</p>
                <button onClick={onBackup} disabled={isLoading} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 w-full">
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
                    <input type="file" onChange={onRestore} accept=".json" className="hidden" disabled={isLoading} />
                </label>
            </div>
        </div>
    );
};

// --- Recycle View ---
interface RecycleViewProps {
    recycledTabs: FamilyTab[];
    usersList: any[];
    onRestoreTab: (id: string, owner?: string) => void;
    onPermanentDeleteTab: (id: string) => void;
}
export const RecycleView: React.FC<RecycleViewProps> = ({ recycledTabs, usersList, onRestoreTab, onPermanentDeleteTab }) => {
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [restoreOwnerSelections, setRestoreOwnerSelections] = useState<Record<string, string>>({});

    return (
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
                            
                            <div className="flex items-center gap-2 mt-1 mb-2">
                                <span className="text-[10px] text-slate-500 font-bold">بازگردانی برای:</span>
                                <select 
                                    className="flex-1 text-[10px] bg-slate-50 border border-slate-200 rounded p-1 font-bold"
                                    value={restoreOwnerSelections[tab.id] || tab.owner || 'admin'}
                                    onChange={(e) => setRestoreOwnerSelections(prev => ({ ...prev, [tab.id]: e.target.value }))}
                                >
                                    <option value={tab.owner || 'admin'}>مالک قبلی ({tab.owner})</option>
                                    {usersList.map((u: any) => (
                                        <option key={u.username} value={u.username}>{u.username}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-2">
                                <button 
                                    onClick={() => onRestoreTab(tab.id, restoreOwnerSelections[tab.id])}
                                    className="flex-1 bg-green-50 text-green-700 py-1.5 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors"
                                >
                                    بازیابی
                                </button>
                                <button 
                                    onClick={() => {
                                        if (deleteConfirmId === tab.id) {
                                            onPermanentDeleteTab(tab.id);
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
    );
};
