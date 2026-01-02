
import React from 'react';
import { createPortal } from 'react-dom';
import { FamilyTab } from '../types';

interface TabDropdownMenuProps {
  tab: FamilyTab;
  position: { top: number, left: number };
  onClose: () => void;
  onRename: () => void;
  onTogglePrivacy: () => void;
  onManage: () => void;
  onDelete?: () => void;
  showDelete: boolean;
}

const TabDropdownMenu: React.FC<TabDropdownMenuProps> = ({
  tab,
  position,
  onClose,
  onRename,
  onTogglePrivacy,
  onManage,
  onDelete,
  showDelete
}) => {
  // Calculate adjusted left position to prevent overflow
  const MENU_WIDTH = 180; // Estimated width of w-44 plus margin
  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
  
  let leftPos = position.left;
  // If menu goes off the right edge
  if (leftPos + MENU_WIDTH > windowWidth) {
      leftPos = windowWidth - MENU_WIDTH - 16; // 16px padding from edge
  }
  // Ensure it doesn't go off left edge
  if (leftPos < 16) leftPos = 16;

  // Render via Portal to body to ensure it sits on top of everything (headers, sticky elements)
  return createPortal(
    <>
      {/* Invisible backdrop to handle click outside */}
      <div 
        className="fixed inset-0 z-[9990] cursor-default" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Menu Container */}
      <div 
          className="fixed bg-white rounded-xl shadow-2xl border border-slate-100 z-[9999] overflow-hidden animate-in fade-in zoom-in-95 text-slate-700 w-44"
          style={{ top: position.top + 8, left: leftPos }}
          onClick={(e) => e.stopPropagation()} // Prevent clicks inside menu from closing it
      >
          <button 
              onClick={() => { onRename(); onClose(); }}
              className="w-full text-right px-4 py-3 hover:bg-slate-50 text-xs font-bold border-b border-slate-50 flex items-center gap-2 transition-colors"
          >
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              تغییر نام
          </button>
          
          <button 
              onClick={() => { onTogglePrivacy(); onClose(); }}
              className="w-full text-right px-4 py-3 hover:bg-slate-50 text-xs font-bold border-b border-slate-50 flex items-center gap-2 transition-colors"
          >
              {tab.isPublic ? (
                  <><svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> خصوصی‌سازی</>
              ) : (
                  <><svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> عمومی‌سازی</>
              )}
          </button>
          
          <button 
              onClick={() => { onManage(); onClose(); }}
              className="w-full text-right px-4 py-3 hover:bg-slate-50 text-xs font-bold border-b border-slate-50 flex items-center gap-2 transition-colors"
          >
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              مدیریت پیشرفته
          </button>
          
          {showDelete && onDelete && (
              <button 
                  onClick={() => { onDelete(); onClose(); }}
                  className="w-full text-right px-4 py-3 hover:bg-red-50 text-red-600 text-xs font-bold flex items-center gap-2 transition-colors"
              >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  حذف خاندان
              </button>
          )}
      </div>
    </>,
    document.body
  );
};

export default TabDropdownMenu;
