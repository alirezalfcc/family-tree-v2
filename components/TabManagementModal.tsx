
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FamilyTab } from '../types';

interface TabManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  tab: FamilyTab | undefined;
  allTabs: FamilyTab[];
  currentUser: any;
  usersList: any[];
  onTransfer?: (tabId: string, newOwner: string) => void;
  onCopy?: (tabId: string, targetUser: string) => void;
  onShare?: (tabId: string, targetUser: string) => void;
  onUnshare?: (tabId: string, targetUser: string) => void;
  onUpdateLinks?: (tabId: string, linkedIds: string[]) => void;
}

const TabManagementModal: React.FC<TabManagementModalProps> = ({
  isOpen, onClose, tab, allTabs, currentUser, usersList,
  onTransfer, onCopy, onShare, onUnshare, onUpdateLinks
}) => {
  if (!isOpen || !tab) return null;

  // Local states for inputs
  const [transferTarget, setTransferTarget] = useState(tab.owner || 'admin');
  const [copyTarget, setCopyTarget] = useState(tab.owner || 'admin');
  const [shareTarget, setShareTarget] = useState(usersList[0]?.username || '');
  const [selectedLinks, setSelectedLinks] = useState<Set<string>>(new Set(tab.linkedTabIds || []));

  // Reset states when tab changes
  useEffect(() => {
      setTransferTarget(tab.owner || 'admin');
      setCopyTarget(tab.owner || 'admin');
      setShareTarget(usersList[0]?.username || '');
      setSelectedLinks(new Set(tab.linkedTabIds || []));
  }, [tab]);

  const toggleLink = (id: string) => {
      setSelectedLinks(prev => {
          const newSet = new Set(prev);
          if (newSet.has(id)) newSet.delete(id);
          else newSet.add(id);
          return newSet;
      });
  };

  const saveLinks = () => {
      if (onUpdateLinks) {
          onUpdateLinks(tab.id, Array.from(selectedLinks));
          alert("ارتباطات بروزرسانی شد.");
      }
  };

  return createPortal(
      <div className="fixed inset-0 bg-black/60 z-[10005] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
          <div className="bg-white p-6 rounded-3xl shadow-2xl border border-slate-100 max-w-sm w-full animate-in zoom-in-95 duration-200 flex flex-col gap-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h3 className="font-black text-slate-800 text-lg">مدیریت خاندان</h3>
                  <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              
              {/* Share */}
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                  <label className="text-xs font-bold text-blue-800 mb-2 block flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                      اشتراک‌گذاری (همکاری):
                  </label>
                  <div className="flex gap-2 mb-2">
                      <select 
                         className="flex-1 bg-white border border-blue-200 rounded-xl px-2 py-2 text-sm font-bold"
                         value={shareTarget}
                         onChange={e => setShareTarget(e.target.value)}
                      >
                         {usersList.filter((u: any) => u.username !== currentUser?.username && u.username !== tab.owner).map((u: any) => (
                             <option key={u.username} value={u.username}>{u.username}</option>
                         ))}
                      </select>
                      <button 
                         onClick={() => onShare && shareTarget && onShare(tab.id, shareTarget)}
                         className="bg-blue-600 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors"
                      >
                          اشتراک
                      </button>
                  </div>
                  
                  {tab.sharedWith && tab.sharedWith.length > 0 && (
                      <div className="space-y-1 mt-2">
                          <p className="text-[10px] text-blue-600 font-bold mb-1">دسترسی‌های فعال:</p>
                          {tab.sharedWith.map(user => (
                              <div key={user} className="flex justify-between items-center bg-white px-2 py-1 rounded border border-blue-100">
                                  <span className="text-xs text-slate-600">{user}</span>
                                  <button onClick={() => onUnshare && onUnshare(tab.id, user)} className="text-red-500 hover:bg-red-50 rounded p-0.5">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                  </button>
                              </div>
                          ))}
                      </div>
                  )}
              </div>

              {/* Links */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <label className="text-xs font-bold text-slate-700 mb-2 block flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                      خاندان‌های مرتبط (لینک شده):
                  </label>
                  <div className="max-h-32 overflow-y-auto space-y-1 mb-2">
                      {allTabs.filter(t => t.id !== tab.id && !t.deleted).map(t => (
                          <label key={t.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-100 rounded cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={selectedLinks.has(t.id)} 
                                onChange={() => toggleLink(t.id)}
                                className="w-3.5 h-3.5 rounded text-amber-500"
                              />
                              <span className="text-xs font-bold text-slate-600 truncate">{t.title}</span>
                          </label>
                      ))}
                  </div>
                  <button onClick={saveLinks} className="w-full bg-amber-500 text-white py-1.5 rounded-lg text-xs font-bold hover:bg-amber-600">ذخیره ارتباطات</button>
                  <p className="text-[9px] text-slate-400 mt-1">با لینک کردن، هنگام جستجوی همسر/فرزند، این خاندان‌ها هم جستجو می‌شوند.</p>
              </div>

              {/* Admin Actions */}
              {currentUser?.role === 'admin' && (
                <>
                  <div className="border-t border-slate-100 pt-2">
                      <label className="text-xs font-bold text-slate-500 mb-1 block">انتقال مالکیت به:</label>
                      <div className="flex gap-2">
                          <select 
                             className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-sm font-bold"
                             value={transferTarget}
                             onChange={e => setTransferTarget(e.target.value)}
                          >
                             {usersList.map((u: any) => (
                                 <option key={u.username} value={u.username}>{u.username}</option>
                             ))}
                          </select>
                          <button 
                             onClick={() => {
                                 if (onTransfer) {
                                     onTransfer(tab.id, transferTarget);
                                     onClose();
                                 }
                             }}
                             className="bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors"
                          >
                              انتقال
                          </button>
                      </div>
                  </div>

                  <div>
                      <label className="text-xs font-bold text-slate-500 mb-1 block">ایجاد کپی برای:</label>
                      <div className="flex gap-2">
                          <select 
                             className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-sm font-bold"
                             value={copyTarget}
                             onChange={e => setCopyTarget(e.target.value)}
                          >
                             {usersList.map((u: any) => (
                                 <option key={u.username} value={u.username}>{u.username}</option>
                             ))}
                          </select>
                          <button 
                             onClick={() => {
                                 if (onCopy) {
                                     onCopy(tab.id, copyTarget);
                                     onClose();
                                 }
                             }}
                             className="bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-600 transition-colors"
                          >
                              کپی
                          </button>
                      </div>
                  </div>
                </>
              )}
          </div>
      </div>,
      document.body
  );
};

export default TabManagementModal;
