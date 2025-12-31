
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FamilyTab } from '../types';
import { useAuthContext } from '../context/AuthContext';
import TabManagementModal from './TabManagementModal';
import TabDropdownMenu from './TabDropdownMenu';

interface TabNavigationProps {
  tabs: FamilyTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onAddTab: (title: string, isPublic: boolean) => void;
  onRenameTab: (id: string, newTitle: string) => void;
  onDeleteTab: (id: string) => void;
  onTogglePrivacy: (id: string) => void;
  onTransferTab?: (tabId: string, newOwner: string) => void;
  onCopyTab?: (tabId: string, targetUser: string) => void;
  onUpdateLinkedTabs?: (tabId: string, linkedIds: string[]) => void;
  onShareTab?: (tabId: string, targetUser: string) => void;
  onUnshareTab?: (tabId: string, targetUser: string) => void;
}

const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onAddTab,
  onRenameTab,
  onDeleteTab,
  onTogglePrivacy,
  onTransferTab,
  onCopyTab,
  onUpdateLinkedTabs,
  onShareTab,
  onUnshareTab
}) => {
  const { isAuthenticated, currentUser, localUsers: usersList } = useAuthContext();
  const [isAdding, setIsAdding] = useState(false);
  const [newTabTitle, setNewTabTitle] = useState('');
  const [newTabPublic, setNewTabPublic] = useState(false);
  
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Gear Menu State
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{top: number, left: number} | null>(null);

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Management Modal ID
  const [manageTabId, setManageTabId] = useState<string | null>(null);

  // Scroll Ref
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'left' | 'right') => {
      if (scrollContainerRef.current) {
          const container = scrollContainerRef.current;
          const scrollAmount = direction === 'left' ? -container.clientWidth / 2 : container.clientWidth / 2;
          container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
  };

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

  const currentManagedTab = tabs.find(t => t.id === manageTabId);
  const activeMenuTab = tabs.find(t => t.id === openMenuId);

  // Calculate layout classes
  const listWidthClass = isAuthenticated ? "w-1/2 md:w-4/5" : "w-full";
  const addSectionClass = isAuthenticated ? "w-1/2 md:w-1/5" : "hidden";
  const tabItemWidthClass = isAuthenticated ? "w-full md:w-1/4" : "w-1/3 md:w-1/5"; // Show more items if full width

  return (
    <>
      <div className="flex w-full bg-white/50 backdrop-blur-sm border-b border-slate-200/50 py-1">
        
        {/* Left Section: Scrollable Existing Tabs */}
        <div className={`relative ${listWidthClass} flex items-center border-l border-slate-200 pl-1 transition-all duration-300`}>
            
            {/* Scroll Button (Left/Right) - Visual Left */}
            <button 
                onClick={() => handleScroll('right')} 
                className="absolute right-0 z-20 h-full px-1 bg-gradient-to-l from-white via-white to-transparent text-slate-400 hover:text-amber-600 transition-colors flex items-center justify-center"
                style={{ width: '24px' }}
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>

            <div 
                ref={scrollContainerRef}
                className="flex-1 flex overflow-x-auto scroll-smooth no-scrollbar px-6"
            >
                {tabs.map(tab => {
                    const isOwnerOrAdmin = isAuthenticated && (currentUser?.role === 'admin' || currentUser?.username === tab.owner);
                    const isSharedWithMe = isAuthenticated && tab.sharedWith?.includes(currentUser?.username || '');
                    const canManage = isOwnerOrAdmin; 
                    const isActive = activeTabId === tab.id;

                    return (
                        <div 
                            key={tab.id}
                            className={`flex-shrink-0 ${tabItemWidthClass} px-1 group relative flex items-center justify-center cursor-pointer select-none outline-none`}
                            onClick={() => onSelectTab(tab.id)}
                        >
                            <div className={`
                                w-full flex items-center gap-1.5 px-2 py-2 rounded-t-xl transition-all h-full relative
                                ${isActive 
                                ? 'bg-amber-500 text-white shadow-lg font-bold transform scale-[1.02] origin-bottom justify-start' 
                                : 'bg-white text-slate-500 hover:bg-amber-50 border border-transparent hover:border-amber-100 justify-center'}
                            `}>
                                {/* Icon */}
                                {isSharedWithMe ? (
                                    <svg className={`w-3 h-3 flex-shrink-0 ${isActive ? 'text-white/70' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                ) : tab.isPublic ? (
                                    <svg className={`w-3 h-3 flex-shrink-0 ${isActive ? 'text-white/70' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                ) : (
                                    <svg className={`w-3 h-3 flex-shrink-0 ${isActive ? 'text-white/70' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                )}

                                {/* Title / Edit Input */}
                                {editingTabId === tab.id ? (
                                    <input 
                                        autoFocus
                                        className="w-full bg-white text-slate-800 px-1 rounded text-xs outline-none min-w-0"
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
                                    <span className={`text-sm truncate w-full ${isActive ? 'text-right' : 'text-center'}`}>{tab.title}</span>
                                )}

                                {/* Settings Gear Icon (Active Only & Authorized) */}
                                {canManage && isActive && (
                                    <div className="relative">
                                        <button 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                setMenuPos({ top: rect.bottom, left: rect.left });
                                                setOpenMenuId(openMenuId === tab.id ? null : tab.id); 
                                            }}
                                            className="p-1 hover:bg-white/20 rounded-full transition-colors"
                                        >
                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Scroll Button (Visual Right) */}
            <button 
                onClick={() => handleScroll('left')} 
                className="absolute left-0 z-20 h-full px-1 bg-gradient-to-r from-white via-white to-transparent text-slate-400 hover:text-amber-600 transition-colors flex items-center justify-center"
                style={{ width: '24px' }}
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
        </div>

        {/* Right Section: Add New Tab (Visible Only When Authenticated) */}
        {isAuthenticated && (
            <div className={`flex-shrink-0 px-1 flex items-center justify-center border-r border-slate-100 ${addSectionClass}`}>
                {isAdding ? (
                    <div className="flex flex-col items-start gap-1 bg-white px-2 py-1.5 rounded-xl border border-dashed border-slate-300 w-full animate-in zoom-in-95">
                        <input 
                            autoFocus
                            className="w-full text-xs bg-transparent outline-none border-b border-slate-200 mb-1"
                            placeholder="نام خاندان..."
                            value={newTabTitle}
                            onChange={e => setNewTabTitle(e.target.value)}
                            onKeyDown={e => {
                                if(e.key === 'Enter') handleAdd();
                                if(e.key === 'Escape') setIsAdding(false);
                            }}
                        />
                        <div className="flex justify-between w-full items-center">
                            <label className="flex items-center gap-1 cursor-pointer">
                                <input type="checkbox" checked={newTabPublic} onChange={e => setNewTabPublic(e.target.checked)} className="w-3 h-3 rounded" />
                                <span className="text-[9px] text-slate-500">عمومی</span>
                            </label>
                            <div className="flex gap-1">
                                <button onClick={handleAdd} className="text-green-600 hover:bg-green-50 rounded p-0.5"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></button>
                                <button onClick={() => setIsAdding(false)} className="text-red-500 hover:bg-red-50 rounded p-0.5"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <button 
                        onClick={() => setIsAdding(true)}
                        className="w-full flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-dashed border-slate-300"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        خاندان جدید
                    </button>
                )}
            </div>
        )}

      </div>

      {/* Global Dropdown Menu (Portal) */}
      {activeMenuTab && menuPos && (
          <TabDropdownMenu 
              tab={activeMenuTab}
              position={menuPos}
              onClose={() => setOpenMenuId(null)}
              onRename={() => { setEditingTabId(activeMenuTab.id); setEditTitle(activeMenuTab.title); }}
              onTogglePrivacy={() => onTogglePrivacy(activeMenuTab.id)}
              onManage={() => setManageTabId(activeMenuTab.id)}
              onDelete={tabs.length > 1 ? () => setConfirmDeleteId(activeMenuTab.id) : undefined}
              showDelete={tabs.length > 1}
          />
      )}

      {/* Refactored Management Modal (Portal) */}
      <TabManagementModal 
          isOpen={!!manageTabId}
          onClose={() => setManageTabId(null)}
          tab={currentManagedTab}
          allTabs={tabs}
          currentUser={currentUser}
          usersList={usersList}
          onTransfer={onTransferTab}
          onCopy={onCopyTab}
          onShare={onShareTab}
          onUnshare={onUnshareTab}
          onUpdateLinks={onUpdateLinkedTabs}
      />

      {/* Custom Confirmation Modal (Delete) - Portal */}
      {confirmDeleteId && createPortal(
         <div className="fixed inset-0 bg-black/60 z-[10005] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in" onClick={() => setConfirmDeleteId(null)}>
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
         </div>,
         document.body
       )}
    </>
  );
};

export default TabNavigation;
