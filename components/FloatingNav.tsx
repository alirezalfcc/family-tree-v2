
import React from 'react';
import { ExtendedPerson, getFullIdentityLabel } from '../utils/genealogy';

interface FloatingNavProps {
  person: ExtendedPerson | null;
  onClose: () => void;
  onNavigate: (direction: 'parent' | 'next-sibling' | 'prev-sibling' | 'first-child') => void;
  isSidebarOpen: boolean;
  
  // Slideshow props
  slideshowActive: boolean;
  onToggleSlideshow: () => void;
  slideDelay: number;
  onDelayChange: (val: number) => void;
}

const FloatingNav: React.FC<FloatingNavProps> = ({ 
  person, 
  onClose, 
  onNavigate, 
  isSidebarOpen,
  slideshowActive,
  onToggleSlideshow,
  slideDelay,
  onDelayChange
}) => {
  if (!person) return null;

  return (
    <div className={`
        fixed z-40 flex items-center gap-2 md:gap-3 
        bg-white/95 backdrop-blur-md p-2 md:p-3 
        rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border-2 border-amber-100 
        animate-in slide-in-from-bottom-5 transition-all
        bottom-12 md:bottom-10
        left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto
        ${isSidebarOpen ? 'md:right-[520px]' : 'md:right-1/3'}
        w-max max-w-[95vw] overflow-x-auto no-scrollbar
    `}>
      <button onClick={onClose} className="p-1.5 md:p-2 text-slate-300 hover:text-red-500 transition-colors mr-1">
        <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      
      <button onClick={() => onNavigate('prev-sibling')} className="p-3 md:p-4 bg-slate-100 text-slate-700 rounded-full hover:bg-amber-500 hover:text-white transition-all shadow-sm group shrink-0" title="خواهر/برادر قبلی">
        <svg className="w-4 h-4 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
      </button>

      <div className="flex flex-col gap-1 shrink-0">
        <button onClick={() => onNavigate('parent')} className="p-2 md:p-3 bg-slate-800 text-white rounded-t-xl md:rounded-t-[1.5rem] hover:bg-amber-600 transition-all flex justify-center" title="والدین">
          <svg className="w-3.5 h-3.5 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
        </button>
        <button onClick={() => onNavigate('first-child')} className="p-2 md:p-3 bg-slate-800 text-white rounded-b-xl md:rounded-b-[1.5rem] hover:bg-amber-600 transition-all flex justify-center" title="فرزندان">
          <svg className="w-3.5 h-3.5 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
        </button>
      </div>

      <button onClick={() => onNavigate('next-sibling')} className="p-3 md:p-4 bg-slate-100 text-slate-700 rounded-full hover:bg-amber-500 hover:text-white transition-all shadow-sm group shrink-0" title="خواهر/برادر بعدی">
        <svg className="w-4 h-4 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
      </button>

      <div className="px-3 md:px-4 py-1 border-r border-slate-200 min-w-[130px] md:min-w-[160px] flex flex-col justify-center">
        <div className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-tighter">مرور هوشمند:</div>
        <div className="text-xs md:text-sm font-black text-slate-800 truncate max-w-[120px] md:max-w-[140px] mb-1">{person.name}</div>
        
        {/* بخش اسلاید شو با اسلایدر استاندارد */}
        <div className="pt-1 border-t border-slate-100 w-full">
           <div className="flex items-center justify-between mb-1">
              <span className="text-[8px] md:text-[9px] font-bold text-slate-500">تایمر اسلاید:</span>
              <button 
                onClick={onToggleSlideshow}
                className={`px-2 py-0.5 rounded text-[8px] md:text-[9px] font-bold transition-all ${slideshowActive ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'}`}
              >
                {slideshowActive ? "توقف" : "شروع"}
              </button>
           </div>
           
           <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
             <input 
               type="range" 
               min="1" 
               max="15" 
               step="1"
               value={slideDelay} 
               onChange={(e) => onDelayChange(parseInt(e.target.value) || 3)}
               className="flex-1 h-1 md:h-1.5 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-amber-500"
               title="تنظیم زمان (ثانیه)"
             />
             <span className="text-[9px] md:text-[10px] font-black text-slate-700 w-3 md:w-4 text-center">{slideDelay}</span>
             <span className="text-[7px] md:text-[8px] text-slate-400">ثانیه</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default FloatingNav;
