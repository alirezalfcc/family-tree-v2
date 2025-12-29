
import React, { useState } from 'react';
import { FamilyTab } from '../types';

interface TabNavigationProps {
  tabs: FamilyTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onAddTab: (title: string) => void;
  onRenameTab: (id: string, newTitle: string) => void;
  onDeleteTab: (id: string) => void;
  isAuthenticated: boolean;
}

const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onAddTab,
  onRenameTab,
  onDeleteTab,
  isAuthenticated
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTabTitle, setNewTabTitle] = useState('');
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleAdd = () => {
    if (newTabTitle.trim()) {
      onAddTab(newTabTitle.trim());
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

  return (
    <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto no-scrollbar border-b border-slate-200/50 bg-white/50 backdrop-blur-sm">
      {tabs.map(tab => (
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

          {isAuthenticated && activeTabId === tab.id && (
            <div className="flex gap-1 mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
               <button 
                 onClick={(e) => { e.stopPropagation(); setEditingTabId(tab.id); setEditTitle(tab.title); }}
                 className="p-1 hover:bg-black/20 rounded text-white"
                 title="تغییر نام"
               >
                 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
               </button>
               {tabs.length > 1 && (
                 <button 
                   onClick={(e) => { 
                       e.stopPropagation(); 
                       if(window.confirm('آیا از حذف این خاندان اطمینان دارید؟ تمام اطلاعات آن پاک خواهد شد.')) onDeleteTab(tab.id); 
                   }}
                   className="p-1 hover:bg-red-500 rounded text-white"
                   title="حذف خاندان"
                 >
                   <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
               )}
            </div>
          )}
        </div>
      ))}

      {isAuthenticated && (
          isAdding ? (
            <div className="flex items-center gap-1 bg-white px-2 py-1.5 rounded-xl border border-dashed border-slate-300">
               <input 
                 autoFocus
                 className="w-24 text-xs bg-transparent outline-none"
                 placeholder="نام خاندان..."
                 value={newTabTitle}
                 onChange={e => setNewTabTitle(e.target.value)}
                 onKeyDown={e => {
                     if(e.key === 'Enter') handleAdd();
                     if(e.key === 'Escape') setIsAdding(false);
                 }}
               />
               <button onClick={handleAdd} className="text-green-600 hover:bg-green-50 rounded p-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></button>
               <button onClick={() => setIsAdding(false)} className="text-red-500 hover:bg-red-50 rounded p-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
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
  );
};

export default TabNavigation;
