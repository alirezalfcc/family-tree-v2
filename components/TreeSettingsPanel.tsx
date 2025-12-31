
import React from 'react';

interface TreeSettingsPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  configNodeId: string | null;
  configNodeName: string | null;
  isAuthenticated: boolean;
  fontSizeScale: number;
  onFontSizeChange: (val: number) => void;
  elbowValue: number;
  onElbowChange: (val: number) => void;
  entryXValue: number;
  onEntryXChange: (val: number) => void;
  isDragMode: boolean;
  onToggleDrag: (val: boolean) => void;
  onResetLayout: () => void;
  resetConfirmMode: boolean;
}

const TreeSettingsPanel: React.FC<TreeSettingsPanelProps> = ({
  isOpen,
  onToggle,
  configNodeId,
  configNodeName,
  isAuthenticated,
  fontSizeScale,
  onFontSizeChange,
  elbowValue,
  onElbowChange,
  entryXValue,
  onEntryXChange,
  isDragMode,
  onToggleDrag,
  onResetLayout,
  resetConfirmMode
}) => {
  return (
    <div className={`
         absolute top-2 right-2 md:top-6 md:right-6 z-40 
         bg-white/95 backdrop-blur shadow-xl border border-slate-200 
         rounded-2xl flex flex-col transition-all duration-300
         ${isOpen ? 'w-64 md:w-72 p-4 max-h-[85vh] overflow-y-auto' : 'w-10 h-10 p-0 items-center justify-center overflow-hidden'}
         animate-in fade-in slide-in-from-right-4
    `} onClick={(e) => e.stopPropagation()}>
        <button 
           onClick={onToggle}
           className={`
              ${isOpen ? 'absolute top-3 left-3' : 'w-full h-full flex items-center justify-center'}
              text-slate-500 hover:text-amber-500 transition-colors
           `}
           title={isOpen ? "بستن پنل" : "باز کردن تنظیمات"}
        >
           {isOpen ? (
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
           ) : (
               <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15a3 3 0 100-6 3 3 0 000 6z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
           )}
        </button>

        {isOpen && (
            <>
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
                    <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                    <span className="text-sm font-bold text-slate-800">تنظیمات ساختار</span>
                </div>
                <div className="space-y-4">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <label className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                            <span>اندازه نوشته‌ها</span>
                            <span className="text-amber-600">{Math.round(fontSizeScale * 100)}%</span>
                        </label>
                        <input 
                            type="range" min="0.5" max="10" step="0.1"
                            value={fontSizeScale}
                            onChange={(e) => onFontSizeChange(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                    </div>
                    
                    <div className={`p-3 rounded-xl border transition-all ${configNodeId ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                        <div className="flex items-center gap-2 mb-4 border-b border-indigo-100 pb-2">
                            <span className={`w-2 h-2 rounded-full ${configNodeId ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300'}`}></span>
                            <span className="text-[11px] font-black text-slate-700 truncate">
                                {configNodeId ? `تنظیم خطوط: ${configNodeName}` : 'یک آیتم را انتخاب کنید'}
                            </span>
                        </div>

                        <div className="mb-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-bold text-slate-500" title="موقعیت خط افقی اتصال نسبت به والد و فرزند">
                                    موقعیت زانو (ارتفاع)
                                </span>
                                <input 
                                    type="number"
                                    min="-5" max="5" step="0.001"
                                    disabled={!configNodeId || !isAuthenticated}
                                    value={elbowValue}
                                    onChange={(e) => onElbowChange(Number(e.target.value))}
                                    className="w-20 px-1 py-0.5 text-[10px] font-bold border border-slate-200 rounded text-center bg-white disabled:opacity-50 outline-none focus:border-indigo-500 font-mono text-indigo-600"
                                    dir="ltr"
                                />
                            </div>
                            <input 
                                type="range" min="-2" max="2" step="0.001"
                                disabled={!configNodeId || !isAuthenticated}
                                value={elbowValue}
                                onChange={(e) => onElbowChange(Number(e.target.value))}
                                className="w-full h-1.5 bg-white rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:cursor-not-allowed"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-bold text-slate-500" title="موقعیت اتصال خط عمودی به نود">
                                    جابجایی نقطه اتصال (افقی)
                                </span>
                                <input 
                                    type="number"
                                    min="-200" max="200" step="1"
                                    disabled={!configNodeId || !isAuthenticated}
                                    value={entryXValue}
                                    onChange={(e) => onEntryXChange(Number(e.target.value))}
                                    className="w-20 px-1 py-0.5 text-[10px] font-bold border border-slate-200 rounded text-center bg-white disabled:opacity-50 outline-none focus:border-pink-500 font-mono text-pink-600"
                                    dir="ltr"
                                />
                            </div>
                            <input 
                                type="range" min="-150" max="150" step="1"
                                disabled={!configNodeId || !isAuthenticated}
                                value={entryXValue}
                                onChange={(e) => onEntryXChange(Number(e.target.value))}
                                className="w-full h-1.5 bg-white rounded-lg appearance-none cursor-pointer accent-pink-600 disabled:cursor-not-allowed"
                            />
                        </div>
                    </div>
                </div>

                <div className="border-t border-slate-100 pt-3 mt-auto space-y-2">
                    <label className="flex items-center justify-between cursor-pointer group">
                        <span className="text-xs font-bold text-slate-700">جابجایی دستی (Drag)</span>
                        <div className="relative">
                            <input type="checkbox" checked={isDragMode} onChange={e => {
                                if (!isAuthenticated && e.target.checked) alert("برای تغییر چیدمان باید وارد حساب مدیریت شوید.");
                                else onToggleDrag(e.target.checked);
                            }} className="sr-only peer" />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                        </div>
                    </label>

                    {isAuthenticated && (
                        <button 
                            onClick={onResetLayout}
                            className={`w-full py-2 text-[10px] font-bold border rounded-lg transition-all flex items-center justify-center gap-1
                                ${resetConfirmMode 
                                    ? 'bg-red-500 text-white border-red-600 hover:bg-red-600 animate-pulse' 
                                    : 'text-red-500 border-red-200 hover:bg-red-50'
                                }`}
                        >
                            {resetConfirmMode ? (
                                <span>تایید بازنشانی؟ (کلیک کنید)</span>
                            ) : (
                                <>
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                    <span>بازنشانی به حالت استاندارد</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </>
        )}
    </div>
  );
};

export default TreeSettingsPanel;
