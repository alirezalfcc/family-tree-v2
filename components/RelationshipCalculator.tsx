
import React, { useState, useMemo } from 'react';
import { ExtendedPerson, getFullIdentityLabel, findRelationship } from '../utils/genealogy';

interface RelationshipCalculatorProps {
  allMembers: ExtendedPerson[];
  onClose: () => void;
  onSelectPersonForGraph: (person: ExtendedPerson) => void;
}

const RelationshipCalculator: React.FC<RelationshipCalculatorProps> = ({ allMembers, onClose, onSelectPersonForGraph }) => {
  const [person1Id, setPerson1Id] = useState<string>('');
  const [person2Id, setPerson2Id] = useState<string>('');
  const [search1, setSearch1] = useState('');
  const [search2, setSearch2] = useState('');

  const person1 = useMemo(() => allMembers.find(m => m.id === person1Id), [person1Id, allMembers]);
  const person2 = useMemo(() => allMembers.find(m => m.id === person2Id), [person2Id, allMembers]);

  const result = useMemo(() => {
    if (!person1 || !person2) return null;
    return findRelationship(person1, person2, allMembers);
  }, [person1, person2, allMembers]);

  const filteredMembers1 = useMemo(() => {
      if(search1.length < 2) return [];
      return allMembers.filter(m => m.name.includes(search1) || (m.surname && m.surname.includes(search1))).slice(0, 10);
  }, [search1, allMembers]);

  const filteredMembers2 = useMemo(() => {
      if(search2.length < 2) return [];
      return allMembers.filter(m => m.name.includes(search2) || (m.surname && m.surname.includes(search2))).slice(0, 10);
  }, [search2, allMembers]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden relative animate-in zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-indigo-600 p-6 text-white text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
                </svg>
            </div>
            <h2 className="text-xl font-black relative z-10 flex items-center justify-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                محاسبه نسبت فامیلی
            </h2>
            <p className="text-indigo-100 text-xs mt-1 relative z-10 font-bold">چه نسبتی با هم دارند؟</p>
            <button onClick={onClose} type="button" className="absolute top-4 left-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-all z-20">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        <div className="p-6 space-y-6">
            
            {/* Person 1 Selector */}
            <div className="relative z-20">
                <label className="text-xs font-black text-slate-500 mb-2 block pr-1">نفر اول (مبنا):</label>
                <div className={`flex items-center gap-2 p-2 border-2 rounded-xl transition-all ${person1 ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-slate-50'}`}>
                    {person1 ? (
                        <div className="flex-1 flex items-center justify-between">
                            <span className="font-bold text-indigo-900 text-sm truncate">{person1.name} {person1.surname}</span>
                            <button onClick={() => { setPerson1Id(''); setSearch1(''); }} className="text-indigo-400 hover:text-red-500 p-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    ) : (
                        <input 
                            type="text" 
                            className="flex-1 bg-transparent outline-none text-sm font-bold text-slate-800 placeholder-slate-400"
                            placeholder="جستجوی نام..."
                            value={search1}
                            onChange={e => setSearch1(e.target.value)}
                            autoFocus
                        />
                    )}
                </div>
                {/* Search Results 1 */}
                {!person1 && search1.length >= 2 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-30">
                        {filteredMembers1.map(m => (
                            <button key={m.id} onClick={() => { setPerson1Id(m.id); setSearch1(''); }} className="w-full text-right px-4 py-2 hover:bg-indigo-50 border-b border-slate-50 text-xs font-bold text-slate-700 flex flex-col">
                                <span>{m.name} {m.surname}</span>
                                <span className="text-[9px] text-slate-400 font-normal">{getFullIdentityLabel(m)}</span>
                            </button>
                        ))}
                        {filteredMembers1.length === 0 && <div className="p-3 text-center text-xs text-slate-400">یافت نشد</div>}
                    </div>
                )}
            </div>

            <div className="flex justify-center -my-3 relative z-10">
                <div className="bg-slate-100 p-2 rounded-full border-4 border-white">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                </div>
            </div>

            {/* Person 2 Selector */}
            <div className="relative z-10">
                <label className="text-xs font-black text-slate-500 mb-2 block pr-1">نفر دوم (هدف):</label>
                <div className={`flex items-center gap-2 p-2 border-2 rounded-xl transition-all ${person2 ? 'border-pink-500 bg-pink-50' : 'border-slate-200 bg-slate-50'}`}>
                    {person2 ? (
                        <div className="flex-1 flex items-center justify-between">
                            <span className="font-bold text-pink-900 text-sm truncate">{person2.name} {person2.surname}</span>
                            <button onClick={() => { setPerson2Id(''); setSearch2(''); }} className="text-pink-400 hover:text-red-500 p-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    ) : (
                        <input 
                            type="text" 
                            className="flex-1 bg-transparent outline-none text-sm font-bold text-slate-800 placeholder-slate-400"
                            placeholder="جستجوی نام..."
                            value={search2}
                            onChange={e => setSearch2(e.target.value)}
                        />
                    )}
                </div>
                 {/* Search Results 2 */}
                 {!person2 && search2.length >= 2 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-30">
                        {filteredMembers2.map(m => (
                            <button key={m.id} onClick={() => { setPerson2Id(m.id); setSearch2(''); }} className="w-full text-right px-4 py-2 hover:bg-pink-50 border-b border-slate-50 text-xs font-bold text-slate-700 flex flex-col">
                                <span>{m.name} {m.surname}</span>
                                <span className="text-[9px] text-slate-400 font-normal">{getFullIdentityLabel(m)}</span>
                            </button>
                        ))}
                        {filteredMembers2.length === 0 && <div className="p-3 text-center text-xs text-slate-400">یافت نشد</div>}
                    </div>
                )}
            </div>

            {/* Result Area */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 min-h-[100px] flex flex-col items-center justify-center text-center transition-all duration-500">
                {person1 && person2 ? (
                    <div className="animate-in fade-in slide-in-from-bottom-2">
                        <p className="text-[10px] text-slate-400 mb-1">نتیجه محاسبه:</p>
                        <div className="text-sm font-black text-slate-800 mb-2">
                            <span className="text-pink-600">{person2.name}</span>
                            <span className="mx-1 text-slate-400">،</span>
                            <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded mx-1">{result}</span>
                            <span className="text-indigo-600">{person1.name}</span>
                            <span className="mx-1">است.</span>
                        </div>
                        
                        <div className="flex gap-2 mt-4 justify-center">
                            <button onClick={() => { onClose(); onSelectPersonForGraph(person1); }} className="text-[9px] bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-200 transition-colors">
                                مشاهده {person1.name} در نمودار
                            </button>
                            <button onClick={() => { onClose(); onSelectPersonForGraph(person2); }} className="text-[9px] bg-pink-100 text-pink-700 px-3 py-1.5 rounded-lg hover:bg-pink-200 transition-colors">
                                مشاهده {person2.name} در نمودار
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-slate-300 flex flex-col items-center gap-2">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="text-xs font-bold">برای مشاهده نسبت، هر دو نفر را انتخاب کنید</span>
                    </div>
                )}
            </div>

        </div>
      </div>
    </div>
  );
};

export default RelationshipCalculator;
