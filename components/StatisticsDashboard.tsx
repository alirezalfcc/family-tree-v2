
import React, { useMemo } from 'react';
import { ExtendedPerson, getDerivedGender, calculatePersianAge } from '../utils/genealogy';

interface StatisticsDashboardProps {
  members: ExtendedPerson[];
  onClose: () => void;
  title: string;
}

const StatisticsDashboard: React.FC<StatisticsDashboardProps> = ({ members, onClose, title }) => {
  
  // محاسبه آمار
  const stats = useMemo(() => {
    let totalMales = 0;
    let totalFemales = 0;
    let deceasedCount = 0;
    let livingCount = 0;
    let maxDepth = 0;
    
    // شمارش نام‌ها برای پیدا کردن پرتکرارترین‌ها
    const maleNames: Record<string, number> = {};
    const femaleNames: Record<string, number> = {};
    const surnameCounts: Record<string, number> = {};
    
    // والدین با بیشترین فرزند
    const prolificParents: { name: string; count: number }[] = [];

    members.forEach(m => {
        const gender = getDerivedGender(m);
        if (gender === 'male') totalMales++; else totalFemales++;
        
        const isDeceased = m.status?.includes('مرحوم');
        if (isDeceased) deceasedCount++; else livingCount++;
        
        if (m.depth > maxDepth) maxDepth = m.depth;

        // شمارش نام (بدون پیشوند و پسوند)
        const cleanName = m.name.trim();
        if (gender === 'male') {
            maleNames[cleanName] = (maleNames[cleanName] || 0) + 1;
        } else {
            femaleNames[cleanName] = (femaleNames[cleanName] || 0) + 1;
        }

        // شمارش نام خانوادگی
        if (m.surname) {
            const sn = m.surname.trim();
            if (sn) surnameCounts[sn] = (surnameCounts[sn] || 0) + 1;
        }

        // شمارش فرزندان
        const childrenCount = (m.children?.length || 0) + (m.sharedChildren?.length || 0);
        if (childrenCount > 0) {
            prolificParents.push({
                name: `${m.name} ${m.surname || ''}`.trim(),
                count: childrenCount
            });
        }
    });

    // مرتب‌سازی نام‌ها
    const topMaleNames = Object.entries(maleNames)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
        
    const topFemaleNames = Object.entries(femaleNames)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    // مرتب‌سازی فامیلی‌ها
    const topSurnames = Object.entries(surnameCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    // مرتب‌سازی تعداد فرزندان
    const topParents = prolificParents.sort((a, b) => b.count - a.count).slice(0, 5);

    return {
        total: members.length,
        totalMales,
        totalFemales,
        deceasedCount,
        livingCount,
        maxDepth, 
        topMaleNames,
        topFemaleNames,
        topParents,
        topSurnames
    };
  }, [members]);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div 
        className="bg-[#f8f9fa] w-full max-w-5xl rounded-[2.5rem] shadow-2xl border border-white/50 flex flex-col max-h-[90vh] overflow-hidden relative animate-in zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* هدر */}
        <div className="p-6 md:p-8 bg-white border-b border-slate-100 flex justify-between items-center sticky top-0 z-10">
            <div>
                <h2 className="text-2xl font-black text-slate-800 mb-1 flex items-center gap-2">
                    <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    داشبورد آمار و اطلاعات
                </h2>
                <p className="text-sm font-bold text-slate-400">{title}</p>
            </div>
            <button onClick={onClose} className="p-3 bg-slate-100 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        {/* محتوا */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar">
            
            {/* کارت‌های خلاصه وضعیت */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-1">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    </div>
                    <span className="text-3xl font-black text-slate-800">{stats.total}</span>
                    <span className="text-xs font-bold text-slate-400">کل اعضای ثبت شده</span>
                </div>
                
                <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-1">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
                    </div>
                    <span className="text-3xl font-black text-slate-800">{stats.totalMales}</span>
                    <span className="text-xs font-bold text-slate-400">تعداد مردان</span>
                </div>

                <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-pink-50 text-pink-500 flex items-center justify-center mb-1">
                         <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2c-5.52 0-10 4.48-10 10s4.48 10 10 10 10-4.48 10-10-4.48-10-10-10zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" /></svg>
                    </div>
                    <span className="text-3xl font-black text-slate-800">{stats.totalFemales}</span>
                    <span className="text-xs font-bold text-slate-400">تعداد زنان</span>
                </div>

                 <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                    </div>
                    <span className="text-3xl font-black text-slate-800">{stats.maxDepth + 1}</span>
                    <span className="text-xs font-bold text-slate-400">نسل شناسایی شده</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* وضعیت حیات */}
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                    <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                        <span className="w-2 h-6 bg-amber-400 rounded-full"></span>
                        وضعیت حیات خاندان
                    </h3>
                    <div className="flex items-center gap-4">
                        <div className="flex-1 bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-3">
                             <div className="bg-green-100 text-green-600 p-2 rounded-xl"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                             <div>
                                 <div className="text-2xl font-black text-slate-800">{stats.livingCount}</div>
                                 <div className="text-xs font-bold text-slate-400">در قید حیات</div>
                             </div>
                        </div>
                        <div className="flex-1 bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-3">
                             <div className="bg-slate-200 text-slate-600 p-2 rounded-xl"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg></div>
                             <div>
                                 <div className="text-2xl font-black text-slate-800">{stats.deceasedCount}</div>
                                 <div className="text-xs font-bold text-slate-400">آسمانی شده</div>
                             </div>
                        </div>
                    </div>
                </div>

                {/* پرجمعیت ترین ها */}
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                     <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                        <span className="w-2 h-6 bg-emerald-400 rounded-full"></span>
                        پرجمعیت‌ترین خانواده‌ها (بیشترین فرزند)
                    </h3>
                    <div className="space-y-3">
                        {stats.topParents.length > 0 ? stats.topParents.map((p, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">{idx + 1}</span>
                                    <span className="font-bold text-slate-700 text-sm">{p.name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="font-black text-emerald-600 text-sm">{p.count}</span>
                                    <span className="text-[10px] text-slate-400 font-bold">فرزند</span>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center text-slate-400 text-sm py-4">اطلاعاتی یافت نشد.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* نام های پرتکرار */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                     <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                        <span className="w-2 h-6 bg-blue-400 rounded-full"></span>
                        محبوب‌ترین نام‌ها
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {stats.topMaleNames.slice(0, 3).map(([name, count], idx) => (
                            <div key={name} className="flex-1 min-w-[80px] bg-blue-50 border border-blue-100 p-2 rounded-xl flex flex-col items-center">
                                <span className="text-xl font-black text-blue-600 mb-1">{count}</span>
                                <span className="text-[10px] font-bold text-slate-600">{name}</span>
                            </div>
                        ))}
                         {stats.topFemaleNames.slice(0, 3).map(([name, count], idx) => (
                            <div key={name} className="flex-1 min-w-[80px] bg-pink-50 border border-pink-100 p-2 rounded-xl flex flex-col items-center">
                                <span className="text-xl font-black text-pink-600 mb-1">{count}</span>
                                <span className="text-[10px] font-bold text-slate-600">{name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                     <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                        <span className="w-2 h-6 bg-indigo-400 rounded-full"></span>
                        پرتکرارترین نام‌های خانوادگی
                    </h3>
                    <div className="space-y-2">
                        {stats.topSurnames.map(([name, count], idx) => (
                            <div key={name} className="flex justify-between items-center px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl">
                                <span className="text-xs font-bold text-slate-700">{name}</span>
                                <span className="text-sm font-black text-indigo-600">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
        </div>
      </div>
    </div>
  );
};

export default StatisticsDashboard;
