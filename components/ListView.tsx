
import React, { useState } from 'react';
import { Person } from '../types';

interface ListViewProps {
  data: Person;
  onSelectPerson: (person: Person) => void;
}

const ListViewItem: React.FC<{ person: Person; onSelect: (p: Person) => void; depth: number; isLast: boolean; parentHasNext: boolean[] }> = ({ person, onSelect, depth, isLast, parentHasNext }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // داده‌ها قبلاً در App.tsx فیلتر شده‌اند، بنابراین مستقیماً نمایش می‌دهیم
  const children = person.children || [];
  const hasChildren = children.length > 0;
  
  const isDeceased = person.status?.includes('مرحوم');
  const isShahid = person.status?.includes('شهید');

  return (
    <div className="relative">
      <div 
        className={`
          flex items-center gap-2 py-1.5 px-2 my-1 rounded-lg transition-all cursor-pointer border border-transparent hover:border-amber-200 hover:bg-amber-50
          ${depth === 0 ? 'bg-amber-100 text-amber-900 font-black text-lg mb-4' : ''}
        `}
        style={{ marginRight: depth === 0 ? 0 : '20px' }}
        onClick={(e) => {
            e.stopPropagation();
            onSelect(person);
        }}
      >
        {/* رسم خطوط اتصال */}
        {depth > 0 && (
            <div className="absolute right-[-20px] top-0 bottom-0 w-[20px] flex items-center">
                {/* خط افقی اتصال به آیتم */}
                <div className="w-full h-px bg-slate-300"></div>
                
                {/* خط عمودی بالا (همیشه هست چون از والد میاد) */}
                <div className="absolute right-0 top-0 h-1/2 w-px bg-slate-300"></div>
                
                {/* خط عمودی پایین (فقط اگر آخرین فرزند نباشد) */}
                {!isLast && <div className="absolute right-0 top-1/2 bottom-0 w-px bg-slate-300"></div>}
            </div>
        )}

        {/* خطوط عمودی مربوط به والدین قبلی برای حفظ ساختار درختی در عمق */}
        {depth > 1 && parentHasNext.slice(1, depth).map((hasNext, idx) => (
            hasNext && (
                <div 
                    key={idx} 
                    className="absolute top-0 bottom-0 w-px bg-slate-300" 
                    style={{ right: `${-20 - ((depth - 1 - idx) * 28)}px` }} // محاسبه دقیق فاصله خطوط
                ></div>
            )
        ))}

        {hasChildren && (
          <button 
            onClick={(e) => { e.stopPropagation(); setIsCollapsed(!isCollapsed); }}
            className={`w-5 h-5 flex items-center justify-center rounded-md text-xs font-bold border transition-colors z-10 ${isCollapsed ? 'bg-amber-500 text-white border-amber-600' : 'bg-white text-slate-400 border-slate-200 hover:border-amber-400'}`}
          >
            {isCollapsed ? '+' : '-'}
          </button>
        )}
        {!hasChildren && <span className="w-5 h-5 block"></span>}
        
        <div className="flex flex-col">
            <div className="flex items-center gap-2">
                <span className={`font-bold text-sm whitespace-nowrap ${isDeceased ? 'text-slate-500' : 'text-slate-800'}`}>
                    {person.name} {person.surname}
                </span>
                {person.title && <span className="text-[10px] text-slate-400 truncate max-w-[100px]">({person.title})</span>}
                {isShahid && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 rounded font-bold">شهید</span>}
            </div>
        </div>
      </div>

      {!isCollapsed && hasChildren && (
        <div className="pr-2 relative">
           {/* خط عمودی اصلی برای فرزندان */}
          <div className="absolute right-[9px] top-0 bottom-2 w-px bg-slate-300"></div>
          
          {children.map((child, index) => (
            <ListViewItem 
                key={child.id} 
                person={child} 
                onSelect={onSelect}
                depth={depth + 1}
                isLast={index === children.length - 1}
                parentHasNext={[...parentHasNext, index !== children.length - 1]}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ListView: React.FC<ListViewProps> = ({ data, onSelectPerson }) => {
  return (
    <div className="w-full h-full bg-white overflow-y-auto p-4 md:p-8 rounded-[2rem] shadow-[0_0_30px_rgba(0,0,0,0.05)] border-[4px] border-white" dir="rtl">
        <div className="max-w-3xl mx-auto pb-20">
            <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4 sticky top-0 bg-white/95 backdrop-blur-sm z-20 pt-2">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                </div>
                <div>
                    <h3 className="font-black text-slate-800 text-lg">لیست درختی (عمودی)</h3>
                    <p className="text-xs text-slate-400 font-bold">نمایش تمام اعضا در یک ستون با حفظ ساختار و خطوط اتصال</p>
                </div>
            </div>
            
            <div className="pr-4">
                <ListViewItem 
                    person={data} 
                    onSelect={onSelectPerson} 
                    depth={0} 
                    isLast={true} 
                    parentHasNext={[]} 
                />
            </div>
        </div>
    </div>
  );
};

export default ListView;
