
import React, { useState } from 'react';
import { FamilyTab } from '../types';

interface TabNavigationProps {
  tabs: FamilyTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onAddTab: (title: string, isPublic: boolean) => void;
  onRenameTab: (id: string, newTitle: string) => void;
  onDeleteTab: (id: string) => void;
  onTogglePrivacy: (id: string) => void;
  isAuthenticated: boolean;
  currentUser?: { username: string; role: 'admin' | 'user' } | null;
  usersList?: any[];
  onTransferTab?: (tabId: string, newOwner: string) => void;
  onCopyTab?: (tabId: string, targetUser: string) => void;
}

const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onAddTab,
  onRenameTab,
  onDeleteTab,
  onTogglePrivacy,
  isAuthenticated,
  currentUser,
  usersList = [],
  onTransferTab,
  onCopyTab
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTabTitle, setNewTabTitle] = useState('');
  const [newTabPublic, setNewTabPublic] = useState(false);
  
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Management Modal (Transfer/Copy)
  const [manageTabId, setManageTabId] = useState<string | null>(null);
  const [transferTarget, setTransferTarget] = useState('');
  const [copyTarget, setCopyTarget] = useState('');

  const handleAdd = () => {
    if (newTabTitle.trim()) {
      onAddTab(newTabTitle.trim(), newTabPublic);
      setNewTabTitle('');
      setIsAdding(false);
    }
  };

  const handleRename = (id: string) => {
    if (editTitle.trim()) {
      onRenameTab(id, editTitle.trim());
      setEditingTabId(null);
    }
  };

  const openManageModal = (tab: FamilyTab) => {
      setManageTabId(tab.id);
      setTransferTarget(tab.owner || 'admin');
      setCopyTarget(tab.owner || 'admin');
  };

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto no-scrollbar border-b border-slate-200/50 bg-white/50 backdrop-blur-sm">
        {tabs.map(tab => {
          // Can edit if admin OR if owner matches
          const canEdit = isAuthenticated && (currentUser?.role === 'admin' || currentUser?.username === tab.owner);
          const isAdmin = currentUser?.role === 'admin';

          return (
            <div 
              key={tab.id}
              className={`
                group relative flex items-center gap-2 px-4 py-2 rounded-t-xl transition-all min-w-[120px] justify-center cursor-pointer select-none
                ${activeTabId === tab.id 
                  ? 'bg-amber-500 text-white shadow-lg scale-105 z-10 font-bold' 
                  : 'bg-white text-slate-500 hover:bg-amber-50 border border-transparent hover:border-amber-100'}
              `}
              onClick={() => onSelectTab(tab.id)}
            >
              {/* Visibility Icon */}
              {tab.isPublic ? (
                  <svg className={`w-3 h-3 ${activeTabId === tab.id ? 'text-white/70' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <title>عمومی (Public)</title>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
              ) : (
                  <svg className={`w-3 h-3 ${activeTabId === tab.id ? 'text-white/70' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <title>خصوصی (Private)</title>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
              )}

              {editingTabId === tab.id ? (
                <input 
                  autoFocus
                  className="w-20 bg-white text-slate-800 px-1 rounded text-xs outline-none"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  onKeyDown={e => {
                      if(e.key === 'Enter') handleRename(tab.id);
                      if(e.key === 'Escape') setEditingTabId(null);
                  }}
                  onBlur={() => handleRename(tab.id)}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span className="text-sm truncate max-w-[150px]">{tab.title}</span>
              )}

              {canEdit && activeTabId === tab.id && (
                <div className="flex gap-1 mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Admin Management Button */}
                  {isAdmin && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); openManageModal(tab); }}
                        className="p-1 hover:bg-black/20 rounded text-white"
                        title="مدیریت (انتقال/کپی)"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      </button>
                  )}

                  {/* Toggle Visibility */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); onTogglePrivacy(tab.id); }}
                    className="p-1 hover:bg-black/20 rounded text-white"
                    title={tab.isPublic ? "خصوصی کردن" : "عمومی کردن"}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  </button>

                  <button 
                    onClick={(e) => { e.stopPropagation(); setEditingTabId(tab.id); setEditTitle(tab.title); }}
                    className="p-1 hover:bg-black/20 rounded text-white"
                    title="تغییر نام"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  
                  {tabs.length > 1 && (
                    <button 
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()} 
                      onClick={(e) => { 
                          e.stopPropagation();
                          setConfirmDeleteId(tab.id);
                      }}
                      className="p-1 hover:bg-red-500 rounded text-white z-20 cursor-pointer"
                      title="حذف (انتقال به بازیافت)"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {isAuthenticated && (
            isAdding ? (
              <div className="flex flex-col items-start gap-1 bg-white px-2 py-1.5 rounded-xl border border-dashed border-slate-300 z-50">
                <input 
                  autoFocus
                  className="w-24 text-xs bg-transparent outline-none border-b border-slate-200 mb-1"
                  placeholder="نام خاندان..."
                  value={newTabTitle}
                  onChange={e => setNewTabTitle(e.target.value)}
                  onKeyDown={e => {
                      if(e.key === 'Enter') handleAdd();
                      if(e.key === 'Escape') setIsAdding(false);
                  }}
                />
                <label className="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={newTabPublic} onChange={e => setNewTabPublic(e.target.checked)} className="w-3 h-3 rounded" />
                    <span className="text-[10px] text-slate-500">عمومی؟</span>
                </label>
                <div className="flex gap-1 w-full justify-end mt-1">
                  <button onClick={handleAdd} className="text-green-600 hover:bg-green-50 rounded p-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></button>
                  <button onClick={() => setIsAdding(false)} className="text-red-500 hover:bg-red-50 rounded p-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
              </div>
            ) : (
              <button 
                  onClick={() => setIsAdding(true)}
                  className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors border border-dashed border-slate-300"
              >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  خاندان جدید
              </button>
            )
        )}
      </div>

      {/* Management Modal */}
      {manageTabId && (
          <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setManageTabId(null)}>
              <div className="bg-white p-6 rounded-3xl shadow-2xl border border-slate-100 max-w-sm w-full animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                      <h3 className="font-black text-slate-800 text-lg">مدیریت مالکیت</h3>
                      <button onClick={() => setManageTabId(null)} className="text-slate-400 hover:text-slate-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                  </div>
                  
                  {/* Transfer Section */}
                  <div className="mb-6">
                      <label className="text-xs font-bold text-slate-500 mb-1 block">انتقال مالکیت به:</label>
                      <div className="flex gap-2">
                          <select 
                             className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-sm font-bold"
                             value={transferTarget}
                             onChange={e => setTransferTarget(e.target.value)}
                          >
                             {usersList.map(u => (
                                 <option key={u.username} value={u.username}>{u.username}</option>
                             ))}
                          </select>
                          <button 
                             onClick={() => {
                                 if (onTransferTab) {
                                     onTransferTab(manageTabId, transferTarget);
                                     setManageTabId(null);
                                 }
                             }}
                             className="bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-amber-600 transition-colors"
                          >
                              انتقال
                          </button>
                      </div>
                      <p className="text-[9px] text-amber-600 mt-1">مالک فعلی دسترسی خود را از دست خواهد داد.</p>
                  </div>

                  {/* Copy Section */}
                  <div>
                      <label className="text-xs font-bold text-slate-500 mb-1 block">ایجاد کپی برای:</label>
                      <div className="flex gap-2">
                          <select 
                             className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-sm font-bold"
                             value={copyTarget}
                             onChange={e => setCopyTarget(e.target.value)}
                          >
                             {usersList.map(u => (
                                 <option key={u.username} value={u.username}>{u.username}</option>
                             ))}
                          </select>
                          <button 
                             onClick={() => {
                                 if (onCopyTab) {
                                     onCopyTab(manageTabId, copyTarget);
                                     setManageTabId(null);
                                 }
                             }}
                             className="bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-600 transition-colors"
                          >
                              کپی
                          </button>
                      </div>
                      <p className="text-[9px] text-indigo-600 mt-1">یک نسخه جدید ایجاد می‌شود و اصل تب حفظ می‌شود.</p>
                  </div>

              </div>
          </div>
      )}

      {/* Custom Confirmation Modal (Delete) */}
      {confirmDeleteId && (
         <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setConfirmDeleteId(null)}>
            <div className="bg-white p-6 rounded-3xl shadow-2xl border border-red-100 max-w-xs w-full animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-2">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </div>
                    <div>
                        <h3 className="font-black text-slate-800 text-lg">حذف خاندان</h3>
                        <p className="text-xs text-slate-500 mt-2 font-bold leading-relaxed">
                           آیا مطمئن هستید که می‌خواهید خاندان 
                           <span className="text-red-600 mx-1 bg-red-50 px-1 rounded">"{tabs.find(t => t.id === confirmDeleteId)?.title}"</span>
                           را به سطل بازیافت منتقل کنید؟
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 w-full mt-2">
                        <button 
                            onClick={() => { onDeleteTab(confirmDeleteId); setConfirmDeleteId(null); }}
                            className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl text-sm font-black transition-colors shadow-lg shadow-red-200"
                        >
                            بله، حذف شود
                        </button>
                        <button 
                            onClick={() => setConfirmDeleteId(null)}
                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl text-sm font-bold transition-colors"
                        >
                            انصراف
                        </button>
                    </div>
                </div>
            </div>
         </div>
       )}
    </>
  );
};

export default TabNavigation;
