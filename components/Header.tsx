
import React, { useRef, useState } from 'react';
import { ExtendedPerson, getFullIdentityLabel } from '../utils/genealogy';

interface HeaderProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  searchResults: ExtendedPerson[];
  onSelectPerson: (person: ExtendedPerson) => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isAuthenticated: boolean;
  onExportImage: () => void;
  onExportPDF?: () => void;
  onExportSVG?: () => void; 
  onOpenSettings?: () => void;
  onOpenStats?: () => void; 
  onOpenCalculator?: () => void; 
  searchGlobal: boolean;
  setSearchGlobal: (val: boolean) => void;
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ 
  searchTerm, 
  setSearchTerm, 
  searchResults, 
  onSelectPerson, 
  onExport, 
  onImport,
  isAuthenticated,
  onExportImage,
  onExportPDF,
  onExportSVG,
  onOpenSettings,
  onOpenStats,
  onOpenCalculator,
  searchGlobal,
  setSearchGlobal,
  title = "شجره نامه خاندان امین عرب"
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAbout, setShowAbout] = useState(false);

  return (
    <div className="flex-none flex flex-col shadow-sm z-50">
      <header className="bg-white/95 backdrop-blur-xl border-b border-slate-200 px-3 py-2 md:px-6 md:py-4 flex flex-col md:flex-row justify-between items-center gap-2 md:gap-4 transition-all">
        <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
             <button 
                onClick={() => setShowAbout(true)}
                className="bg-amber-600 text-white p-1.5 rounded-xl shadow-lg hover:bg-amber-700 transition-all cursor-pointer flex items-center justify-center"
                title="درباره برنامه"
             >
               {/* Leaf Icon - Size Increased to w-8 h-8 */}
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19.5v-15c0 0-6 3-6 9 0 4 6 6 6 6z" />
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19.5v-15c0 0 6 3 6 9 0 4-6 6-6 6z" />
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l-3-3" />
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l3-3" />
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9l-2-2" />
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9l2-2" />
               </svg>
             </button>
             <div className="text-right">
               <h1 className="text-sm md:text-lg font-black text-slate-900 leading-tight">{title}</h1>
               <p className="text-[9px] md:text-[10px] text-slate-500 font-bold mt-0.5 md:mt-1 bg-slate-100 px-2 py-0.5 rounded-md inline-block">
                 Alireza Labaf
               </p>
             </div>
          </div>
        </div>

        <div className="flex-1 max-w-xl relative flex flex-col gap-1 w-full md:w-auto">
          <div className="relative flex gap-2">
            <input
              type="text"
              placeholder={searchGlobal ? "جستجو در کل..." : "جستجو در این خاندان..."}
              className={`w-full px-3 py-1.5 md:px-5 md:py-3 pr-10 md:pr-12 rounded-xl md:rounded-2xl border-2 ${searchGlobal ? 'border-amber-200 bg-amber-50 focus:border-amber-500' : 'border-slate-100 bg-slate-50 focus:border-indigo-500'} outline-none transition-all text-xs md:text-sm font-bold shadow-inner`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
             <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>

            {searchResults.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 max-h-60 md:max-h-80 overflow-y-auto p-2 border-t-4 border-t-amber-500 animate-in fade-in slide-in-from-top-2">
                {searchResults.map((p: any) => (
                  <button 
                    key={p.id} 
                    className="w-full text-right px-3 py-2 md:px-4 md:py-3 hover:bg-amber-50 rounded-xl flex flex-col gap-1 transition-colors border-b last:border-0 border-slate-50 group" 
                    onClick={() => { onSelectPerson(p); setSearchTerm(''); }}
                  >
                    <div className="flex justify-between items-center w-full">
                        <span className="font-black text-slate-800 text-xs md:text-sm group-hover:text-amber-700">{p.name} {p.surname}</span>
                        {p.tabTitle && <span className="text-[8px] md:text-[9px] bg-slate-100 text-slate-500 px-2 rounded-full">{p.tabTitle}</span>}
                    </div>
                    <span className="text-[9px] md:text-[10px] text-slate-400 font-bold">{getFullIdentityLabel(p)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 pr-1 md:pr-2">
              <label className="flex items-center gap-1.5 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={searchGlobal}
                    onChange={(e) => setSearchGlobal(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 border-gray-300"
                  />
                  <span className={`text-[9px] md:text-[10px] font-bold transition-colors ${searchGlobal ? 'text-amber-700' : 'text-slate-400 group-hover:text-slate-600'}`}>جستجو در همه تب‌ها</span>
              </label>
          </div>
        </div>
          
          <div className="flex gap-1.5 md:gap-2 self-end md:self-center">
             {onOpenCalculator && (
                <button onClick={onOpenCalculator} className="p-2 md:p-3 bg-pink-50 border-2 border-pink-100 rounded-xl md:rounded-2xl text-pink-600 hover:border-pink-300 hover:text-pink-800 transition-all shadow-sm" title="محاسبه نسبت فامیلی">
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                </button>
             )}

             {onOpenSettings && (
                <button onClick={onOpenSettings} className="p-2 md:p-3 bg-slate-100 border-2 border-slate-200 rounded-xl md:rounded-2xl text-slate-600 hover:border-slate-400 hover:text-slate-800 transition-all shadow-sm" title="تنظیمات امنیتی و اخبار">
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </button>
             )}

             {onOpenStats && (
                <button onClick={onOpenStats} className="p-2 md:p-3 bg-indigo-50 border-2 border-indigo-100 rounded-xl md:rounded-2xl text-indigo-600 hover:border-indigo-300 hover:text-indigo-800 transition-all shadow-sm" title="داشبورد آمار و اطلاعات">
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </button>
             )}

             {onExportSVG && (
                <button onClick={onExportSVG} className="p-2 md:p-3 bg-white border-2 border-slate-100 rounded-xl md:rounded-2xl text-slate-600 hover:border-purple-500 hover:text-purple-600 transition-all shadow-sm" title="ذخیره وکتور (SVG) - کیفیت بالا">
                   <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                </button>
             )}

            {isAuthenticated && (
              <>
                <button onClick={onExport} className="p-2 md:p-3 bg-white border-2 border-slate-100 rounded-xl md:rounded-2xl text-slate-600 hover:border-amber-500 hover:text-amber-600 transition-all shadow-sm" title="خروجی جیسون (پشتیبان)">
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="p-2 md:p-3 bg-white border-2 border-slate-100 rounded-xl md:rounded-2xl text-slate-600 hover:border-emerald-500 hover:text-emerald-600 transition-all shadow-sm" title="بارگذاری جیسون">
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                </button>
                <input type="file" ref={fileInputRef} onChange={onImport} accept=".json" className="hidden" />
              </>
            )}
          </div>
      </header>

      {/* About Modal */}
      {showAbout && (
        <div className="fixed inset-0 bg-black/50 z-[120] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowAbout(false)}>
           <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center space-y-4 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600 mb-2">
                 <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19.5v-15c0 0-6 3-6 9 0 4 6 6 6 6z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19.5v-15c0 0 6 3 6 9 0 4-6 6-6 6z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l-3-3" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l3-3" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9l-2-2" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9l2-2" />
                 </svg>
              </div>
              <h2 className="text-xl font-black text-slate-800">Alireza Labaf</h2>
              <div className="text-sm font-bold text-slate-600 space-y-2">
                 <p>توسعه دهنده: <span className="text-amber-600">علیرضا لباف</span></p>
                 <p>نسخه برنامه: <span className="text-slate-400">v3.5 Final</span></p>
                 <div className="border-t border-slate-100 pt-3 mt-3">
                    <p className="flex items-center justify-center gap-2" dir="ltr">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                        <span>+989196600545</span>
                    </p>
                    <p className="flex items-center justify-center gap-2 mt-1" dir="ltr">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        <span>alirezalf@gmail.com</span>
                    </p>
                 </div>
              </div>
              <button onClick={() => setShowAbout(false)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold mt-4">بستن</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default Header;
