
import React from 'react';
import { Person } from '../types';
import { ExtendedPerson, getFullIdentityLabel, getDerivedGender } from '../utils/genealogy';
import { calculatePersianAge } from '../utils/relationshipLogic';
import { SmartAvatar } from './PersonCommon';

interface ProfileViewProps {
  person: Person;
  allMembers: ExtendedPerson[];
  newChildName: string;
  setNewChildName: (val: string) => void;
  existingChildSearch: string;
  setExistingChildSearch: (val: string) => void;
  onAddChild: (parentId: string, childName: string) => void;
  onAddExistingChild: (parentId: string, childId: string) => void;
  isAuthenticated: boolean;
  canEdit: boolean;
  onRequestEdit: () => void;
  onExtractSubtree?: (personId: string) => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ 
  person, allMembers, newChildName, setNewChildName, existingChildSearch, setExistingChildSearch,
  onAddChild, onAddExistingChild, isAuthenticated, canEdit, onRequestEdit, onExtractSubtree
}) => {
  const currentExt = allMembers.find((m: any) => m.id === person.id);
  const isFemale = getDerivedGender(person) === 'female';
  const isDeceased = person.status?.includes('مرحوم');
  const isSingle = person.status?.includes('مجرد');
  const isShahid = person.status?.includes('شهید');
  const totalKids = (person.children?.length || 0) + (person.sharedChildren?.length || 0);
  const calculatedAge = calculatePersianAge(person.birthDate, person.deathDate, person.status);

  // Helper to format suggestion text with Tab Name
  const getSuggestionLabel = (m: any) => {
      let label = getFullIdentityLabel(m);
      if (m.tabTitle) {
          label += ` [${m.tabTitle}]`;
      }
      return label;
  };

  return (
    <div className="space-y-6">
      <div className="text-center pb-6 relative flex flex-col items-center">
        <SmartAvatar name={person.name} imageUrl={person.imageUrl} avatarIndex={person.avatarIndex} size="xl" className="mb-4" />
        <h2 className="text-2xl font-black text-slate-900">{person.name} {person.surname}{person.title && <span className="block text-sm font-bold text-slate-500 mt-1">({person.title})</span>}</h2>
        <div className="flex justify-center gap-2 mt-3 flex-wrap">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${isFemale ? 'bg-pink-50 text-pink-600' : 'bg-blue-50 text-blue-600'}`}>{isFemale ? 'زن' : 'مرد'}</span>
            {isShahid ? <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-md">شهید</span> : 
             (isDeceased ? <span className="text-[10px] font-bold bg-slate-600 text-white px-2 py-0.5 rounded-md">مرحوم</span> : <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-md">در قید حیات</span>)}
            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">{isSingle ? 'مجرد' : 'متاهل'}</span>
            {calculatedAge && <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">{calculatedAge}</span>}
        </div>
        <p className="text-[10px] text-slate-400 font-bold mt-3 border border-slate-100 py-1 px-3 inline-block rounded-full bg-slate-50">{getFullIdentityLabel(currentExt)}</p>
      </div>

      <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-4">
        <div className="grid grid-cols-2 gap-4">
           {person.birthDate && <div className="py-2 border-b border-slate-200"><span className="text-xs text-slate-400 font-bold block">تاریخ تولد:</span><span className="text-sm font-black text-slate-800" dir="ltr">{person.birthDate}</span>{calculatedAge && !isDeceased && <span className="text-[10px] text-emerald-600 block mt-1 font-bold">({calculatedAge})</span>}</div>}
           {person.deathDate && <div className="py-2 border-b border-slate-200"><span className="text-xs text-slate-400 font-bold block">تاریخ وفات:</span><span className="text-sm font-black text-slate-800" dir="ltr">{person.deathDate}</span></div>}
           
           {person.mobile && <div className="py-2 border-b border-slate-200"><span className="text-xs text-slate-400 font-bold block">موبایل:</span><a href={`tel:${person.mobile}`} className="text-sm font-black text-indigo-600 hover:underline" dir="ltr">{person.mobile}</a></div>}
           {person.email && <div className="py-2 border-b border-slate-200"><span className="text-xs text-slate-400 font-bold block">ایمیل:</span><a href={`mailto:${person.email}`} className="text-sm font-black text-indigo-600 hover:underline break-words" dir="ltr">{person.email}</a></div>}
        </div>

        {(person.spouseName || person.secondSpouseName) && (
            <div className="py-2 border-b border-slate-200">
                <span className="text-xs text-slate-400 font-bold block mb-1">همسران:</span>
                {person.spouseName && <div className="text-sm font-bold text-slate-800">1. {person.spouseName}</div>}
                {person.secondSpouseName && <div className="text-sm font-bold text-slate-800">2. {person.secondSpouseName}</div>}
            </div>
        )}

        <div className="flex justify-between items-center py-2"><span className="text-xs text-slate-400 font-bold">مجموع فرزندان:</span><span className="text-sm font-black text-slate-800">{totalKids} نفر</span></div>
        {person.description && <div className="pt-2"><span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">توضیحات:</span><p className="text-sm text-slate-600 leading-relaxed font-medium">{person.description}</p></div>}
      </div>

      <div className="space-y-6 pt-4">
        {isAuthenticated && canEdit ? (
          <>
            <section className="p-5 bg-emerald-50 rounded-[2rem] border border-emerald-100 space-y-4 shadow-inner">
              <h3 className="text-sm font-black text-emerald-800 flex items-center gap-2">ثبت فرزند جدید (ایجاد شاخه)</h3>
              <div className="flex gap-2">
                <input type="text" placeholder="نام فرزند..." className="flex-1 px-4 py-2.5 rounded-xl border border-emerald-200 focus:border-emerald-500 outline-none text-sm font-bold bg-white" value={newChildName} onChange={e => setNewChildName(e.target.value)} />
                <button onClick={() => { if(newChildName) onAddChild(person.id, newChildName); setNewChildName(''); }} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-black shadow-lg">ثبت</button>
              </div>
            </section>

            <section className="p-5 bg-indigo-50 rounded-[2rem] border border-indigo-100 space-y-4 shadow-inner">
              <h3 className="text-sm font-black text-indigo-800 flex items-center gap-2">انتساب از اعضای موجود (هوشمند)</h3>
              <div className="flex gap-2">
                <input list="child-move-list" placeholder="جستجوی نسب کامل..." className="flex-1 px-4 py-2.5 rounded-xl border border-indigo-200 focus:border-indigo-500 outline-none text-sm font-bold bg-white" value={existingChildSearch} onChange={e => setExistingChildSearch(e.target.value)} />
                <datalist id="child-move-list">{allMembers.filter((m: any) => m.id !== person.id).map((m: any) => (<option key={m.id} value={getSuggestionLabel(m)} />))}</datalist>
                <button onClick={() => { 
                    // Normalize search input to find match
                    const selected = allMembers.find((m: any) => getSuggestionLabel(m) === existingChildSearch.trim() || getFullIdentityLabel(m) === existingChildSearch.trim()); 
                    if(selected) onAddExistingChild(person.id, selected.id); 
                    else alert("فرد یافت نشد.");
                    setExistingChildSearch(''); 
                }} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-black shadow-lg">انتساب</button>
              </div>
              <p className="text-[9px] text-indigo-400">شامل جستجو در خاندان‌های مرتبط</p>
            </section>

            {onExtractSubtree && (
                <section className="p-5 bg-purple-50 rounded-[2rem] border border-purple-100 space-y-4 shadow-inner">
                    <h3 className="text-sm font-black text-purple-800 flex items-center gap-2">عملیات پیشرفته</h3>
                    <button 
                        onClick={() => {
                            onExtractSubtree(person.id);
                        }} 
                        className="w-full px-5 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all font-black shadow-lg flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                        کپی این شاخه در تب جدید
                    </button>
                    <p className="text-[9px] text-purple-600 px-1">یک خاندان جدید از این نقطه به پایین ایجاد می‌شود. اصل داده‌ها حفظ خواهد شد.</p>
                </section>
            )}
          </>
        ) : (
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl text-center space-y-3">
             <p className="text-slate-500 text-sm font-bold">{isAuthenticated ? "شما دسترسی ویرایش این خاندان را ندارید." : "برای افزودن فرزند یا ویرایش ساختار، باید وارد حساب مدیریت شوید."}</p>
             {!isAuthenticated && <button onClick={onRequestEdit} className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-sm transition-all">ورود مدیر</button>}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileView;
