
import React, { useState, useRef } from 'react';
import { Person } from '../types';
import { ExtendedPerson, getFullIdentityLabel } from '../utils/genealogy';
import { SmartAvatar, compressImage } from './PersonCommon';

interface EditFormProps {
  formData: Partial<Person>;
  setFormData: (data: Partial<Person> | ((prev: Partial<Person>) => Partial<Person>)) => void;
  allMembers: ExtendedPerson[];
  personId: string;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
  onMoveSubtree?: (nodeId: string, newParentId: string) => void;
  deleteConfirm: boolean;
  setDeleteConfirm: (val: boolean) => void;
}

const EditForm: React.FC<EditFormProps> = ({ 
  formData, setFormData, allMembers, personId, onSave, onCancel, 
  onDelete, onMoveSubtree, deleteConfirm, setDeleteConfirm 
}) => {
  const [moveTargetName, setMoveTargetName] = useState('');
  const [showMoveConfirm, setShowMoveConfirm] = useState(false);
  const [moveTarget, setMoveTarget] = useState<any>(null);
  
  // State for Shared Child Search
  const [sharedChildSearch, setSharedChildSearch] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper for display label with Tab Name
  const getSuggestionLabel = (m: any) => {
      let label = getFullIdentityLabel(m);
      if (m.tabTitle) {
          label += ` [${m.tabTitle}]`;
      }
      return label;
  };

  const updateStatus = (key: string, value: boolean) => {
      let currentStatus = formData.status || [];
      if (key === 'مرحوم') { if (value) { if (!currentStatus.includes('مرحوم')) currentStatus.push('مرحوم'); } else { currentStatus = currentStatus.filter((s: string) => s !== 'مرحوم'); } }
      if (key === 'شهید') { if (value) { if (!currentStatus.includes('شهید')) currentStatus.push('شهید'); } else { currentStatus = currentStatus.filter((s: string) => s !== 'شهید'); } }
      if (key === 'مجرد') { currentStatus = currentStatus.filter((s: string) => s !== 'مجرد' && s !== 'متاهل'); if (value) currentStatus.push('مجرد'); }
      if (key === 'متاهل') { currentStatus = currentStatus.filter((s: string) => s !== 'مجرد' && s !== 'متاهل'); if (value) currentStatus.push('متاهل'); }
      setFormData({ ...formData, status: currentStatus });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { const compressedBase64 = await compressImage(file); setFormData({ ...formData, imageUrl: compressedBase64 }); } catch (error) { alert("خطا در پردازش تصویر"); }
  };

  const moveChild = (index: number, direction: 'up' | 'down') => {
      const children = [...(formData.children || [])];
      if (direction === 'up' && index > 0) {
          [children[index], children[index - 1]] = [children[index - 1], children[index]];
      } else if (direction === 'down' && index < children.length - 1) {
          [children[index], children[index + 1]] = [children[index + 1], children[index]];
      }
      setFormData({ ...formData, children });
  };

  const unlinkChild = (childId: string) => {
      if(!window.confirm("آیا اتصال این فرزند قطع شود؟ (اطلاعات فرزند حذف نمی‌شود، فقط از لیست خارج می‌شود)")) return;
      const children = (formData.children || []).filter((c: any) => c.id !== childId);
      setFormData({ ...formData, children });
  };

  const removeSharedChild = (index: number) => {
      const sharedChildren = [...(formData.sharedChildren || [])];
      sharedChildren.splice(index, 1);
      setFormData({ ...formData, sharedChildren });
  };

  const addSharedChild = () => {
      if (!sharedChildSearch.trim()) return;
      const selected = allMembers.find((m: any) => getSuggestionLabel(m) === sharedChildSearch.trim() || getFullIdentityLabel(m) === sharedChildSearch.trim());
      if (selected) {
          if (selected.id === personId) return alert("نمی‌توانید خود شخص را به عنوان فرزند اضافه کنید.");
          const currentShared = formData.sharedChildren || [];
          // Check for duplicates
          const exists = currentShared.some((sc: any) => (typeof sc === 'string' ? sc === selected.id : sc.id === selected.id));
          if (exists) return alert("این فرزند قبلاً اضافه شده است.");

          setFormData({
              ...formData,
              sharedChildren: [...currentShared, { id: selected.id, name: selected.name }]
          });
          setSharedChildSearch('');
      } else {
          alert("فردی با این مشخصات یافت نشد.");
      }
  };

  // Smart Handler for Spouse and Move Target inputs to link IDs automatically
  const handleSmartInputChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'spouseName' | 'secondSpouseName', idFieldName: 'spouseId' | 'secondSpouseId') => {
      const val = e.target.value;
      
      // Attempt to find exact match in suggestions
      const match = allMembers.find((m: any) => getSuggestionLabel(m) === val || getFullIdentityLabel(m) === val);
      
      // Use clean name for display, store ID internally
      let displayName = val;
      let linkedId = undefined;

      if (match) {
          // If match found, use their Name + Surname for display, but keep ID for link
          // We strip the [Tab Name] for the text input display usually, or keep it if user prefers clarity.
          // Let's keep it simple: Use user input as name, store ID if matched.
          linkedId = match.id;
      }

      setFormData((prev: any) => ({
          ...prev,
          [fieldName]: displayName,
          [idFieldName]: linkedId 
      }));
  };

  const handleMoveSubtreeClick = () => {
    if (!moveTargetName) return;
    const target = allMembers.find((m: any) => getSuggestionLabel(m) === moveTargetName.trim() || getFullIdentityLabel(m) === moveTargetName.trim());
    if (target) { setMoveTarget(target); setShowMoveConfirm(true); } else { alert("فرد مقصد یافت نشد."); }
  };

  const confirmMove = () => { if (onMoveSubtree && moveTarget) { onMoveSubtree(personId, moveTarget.id); setShowMoveConfirm(false); setMoveTarget(null); } };

  return (
    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200 pb-10 relative">
      {/* Suggestions Data List with Family Source */}
      <datalist id="all-members-list-edit">
          {allMembers.map((m: any) => (
              <option key={m.id} value={getSuggestionLabel(m)} />
          ))}
      </datalist>

      {showMoveConfirm && moveTarget && (
         <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4 rounded-3xl animate-in fade-in">
            <div className="bg-white border-2 border-orange-200 shadow-2xl p-6 rounded-3xl text-center max-w-xs w-full">
               <h4 className="font-black text-slate-800 text-base mb-2">تایید انتقال شاخه</h4>
               <div className="flex flex-col gap-2 mt-4">
                  <button onClick={confirmMove} className="w-full bg-orange-500 text-white py-2.5 rounded-xl font-black text-xs">بله، منتقل شود</button>
                  <button onClick={() => setShowMoveConfirm(false)} className="w-full bg-slate-100 text-slate-500 py-2.5 rounded-xl font-bold text-xs">لغو</button>
               </div>
            </div>
         </div>
      )}
      
      <div className="flex flex-col items-center gap-3 mb-6 bg-slate-50 p-4 rounded-3xl border border-slate-100">
        <SmartAvatar name={formData.name || '?'} imageUrl={formData.imageUrl} avatarIndex={formData.avatarIndex} size="lg" />
        <div className="flex gap-2">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs text-amber-600 font-bold bg-white border border-amber-200 px-3 py-1.5 rounded-lg">آپلود عکس</button>
            {formData.imageUrl && <button type="button" onClick={() => setFormData({...formData, imageUrl: ''})} className="text-xs text-red-500 font-bold bg-white border border-red-200 px-3 py-1.5 rounded-lg">حذف عکس</button>}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-1"><label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">نام</label><input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 outline-none text-sm font-bold" /></div>
        <div className="col-span-1"><label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">نام خانوادگی</label><input type="text" value={formData.surname} onChange={e => setFormData({...formData, surname: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 outline-none text-sm font-bold" /></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
         <div><label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">لقب / اسم مستعار</label><input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 outline-none text-sm font-bold" /></div>
         <div>
             <label className="text-[10px] font-black text-slate-400 mb-2 block uppercase">جنسیت</label>
             <div className="flex bg-slate-100 p-1 rounded-xl">
                 <button onClick={() => setFormData({...formData, gender: 'male'})} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${formData.gender === 'male' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>مرد</button>
                 <button onClick={() => setFormData({...formData, gender: 'female'})} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${formData.gender === 'female' ? 'bg-white shadow text-pink-600' : 'text-slate-500'}`}>زن</button>
             </div>
         </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
         <div><label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">موبایل</label><input type="text" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 outline-none text-sm font-bold" dir="ltr" /></div>
         <div><label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">ایمیل</label><input type="text" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 outline-none text-xs font-bold" dir="ltr" /></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
         <div><label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">تاریخ تولد</label><input type="text" placeholder="13XX/XX/XX" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 outline-none text-sm font-bold" dir="ltr" /></div>
         <div><label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">تاریخ وفات</label><input type="text" placeholder="1XXX/XX/XX" value={formData.deathDate} onChange={e => setFormData({...formData, deathDate: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 outline-none text-sm font-bold" dir="ltr" /></div>
      </div>

      <div className="space-y-2">
          <div>
              <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">همسر اول (جستجو در همه خاندان‌های مرتبط)</label>
              <input type="text" list="all-members-list-edit" value={formData.spouseName} onChange={e => handleSmartInputChange(e, 'spouseName', 'spouseId')} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 outline-none text-sm font-bold" placeholder="نام همسر..." />
              {formData.spouseId && <span className="text-[9px] text-green-600 px-2 font-bold flex items-center gap-1">✓ متصل به پروفایل <span className="opacity-50 text-[8px]">(شناسه: {formData.spouseId.substring(0,6)}...)</span></span>}
          </div>
          <div>
              <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">همسر دوم (جستجو در همه خاندان‌های مرتبط)</label>
              <input type="text" list="all-members-list-edit" value={formData.secondSpouseName} onChange={e => handleSmartInputChange(e, 'secondSpouseName', 'secondSpouseId')} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 outline-none text-sm font-bold" placeholder="نام همسر..." />
              {formData.secondSpouseId && <span className="text-[9px] text-green-600 px-2 font-bold flex items-center gap-1">✓ متصل به پروفایل <span className="opacity-50 text-[8px]">(شناسه: {formData.secondSpouseId.substring(0,6)}...)</span></span>}
          </div>
      </div>
      
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-1 gap-4">
         <div>
             <label className="text-[10px] font-black text-slate-400 mb-2 block uppercase">وضعیت حیات و تاهل</label>
             <div className="flex flex-wrap gap-4">
                 <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={formData.status?.includes('مرحوم')} onChange={(e) => updateStatus('مرحوم', e.target.checked)} className="w-4 h-4" /><span className="text-xs font-bold">مرحوم</span></label>
                 <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={formData.status?.includes('شهید')} onChange={(e) => updateStatus('شهید', e.target.checked)} className="w-4 h-4" /><span className="text-xs font-bold">شهید</span></label>
                 <div className="w-px h-4 bg-slate-300 mx-2"></div>
                 <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={!formData.status?.includes('مجرد') && !formData.status?.includes('متاهل')} onChange={() => setFormData({...formData, status: formData.status?.filter(s => s !== 'مجرد' && s !== 'متاهل')})} /><span className="text-xs font-bold">نامشخص</span></label>
                 <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={!!formData.status?.includes('مجرد')} onChange={() => updateStatus('مجرد', true)} /><span className="text-xs font-bold">مجرد</span></label>
                 <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={!!formData.status?.includes('متاهل')} onChange={() => updateStatus('متاهل', true)} /><span className="text-xs font-bold">متاهل</span></label>
             </div>
         </div>
      </div>

      <div>
          <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">توضیحات</label>
          <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-amber-500 outline-none text-sm font-medium" placeholder="توضیحات تکمیلی..." />
      </div>

      {/* Children Reordering */}
      {formData.children && formData.children.length > 0 && (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="text-[10px] font-black text-slate-400 mb-2 block uppercase">مدیریت فرزندان (ترتیب)</label>
              <div className="space-y-2">
                  {formData.children.map((child: Person, idx: number) => (
                      <div key={child.id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 text-xs font-bold">
                          <span>{idx + 1}. {child.name}</span>
                          <div className="flex gap-1">
                              <button type="button" onClick={() => moveChild(idx, 'up')} disabled={idx === 0} className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg></button>
                              <button type="button" onClick={() => moveChild(idx, 'down')} disabled={idx === formData.children!.length - 1} className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>
                              <button type="button" onClick={() => unlinkChild(child.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* Shared Children Management */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <label className="text-[10px] font-black text-slate-400 mb-2 block uppercase">فرزندان مشترک (متصل شده)</label>
          
          <div className="flex gap-2 mb-3">
             <input list="child-share-list" placeholder="جستجو برای اتصال فرزند..." className="flex-1 px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none text-xs font-bold bg-white" value={sharedChildSearch} onChange={e => setSharedChildSearch(e.target.value)} />
             <datalist id="child-share-list">{allMembers.filter((m: any) => m.id !== personId).map((m: any) => (<option key={m.id} value={getSuggestionLabel(m)} />))}</datalist>
             <button type="button" onClick={addSharedChild} className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700">افزودن</button>
          </div>

          <div className="flex flex-wrap gap-2">
              {formData.sharedChildren && formData.sharedChildren.map((child: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200 text-xs font-bold">
                      <span>{typeof child === 'string' ? child : child.name}</span>
                      <button type="button" onClick={() => removeSharedChild(idx)} className="text-red-500 hover:bg-red-50 rounded-full p-0.5"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                  </div>
              ))}
              {(!formData.sharedChildren || formData.sharedChildren.length === 0) && (
                  <p className="text-[10px] text-slate-400">هیچ فرزند مشترکی اضافه نشده است.</p>
              )}
          </div>
      </div>

      <div className="flex gap-3 pt-4 border-t items-center flex-wrap">
        <button onClick={onSave} className="flex-1 bg-amber-600 text-white py-3 rounded-2xl font-black shadow-lg hover:bg-amber-700 transition-all">ذخیره تغییرات</button>
        <button onClick={onCancel} className="px-6 bg-slate-100 text-slate-600 py-3 rounded-2xl font-bold hover:bg-slate-200 transition-all">انصراف</button>
      </div>

      {onMoveSubtree && (
        <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 mb-6 mt-4 shadow-sm">
           <h4 className="text-xs font-black text-orange-800 mb-2">انتقال کامل شاخه</h4>
           <div className="flex gap-2">
             <input type="text" list="all-members-list-edit" className="w-full px-3 py-2 rounded-lg border border-orange-200 text-xs font-bold" placeholder="جستجوی والد جدید..." value={moveTargetName} onChange={e => setMoveTargetName(e.target.value)} />
             <button type="button" onClick={handleMoveSubtreeClick} className="bg-orange-600 text-white px-4 py-2 rounded-lg text-xs font-black hover:bg-orange-700">انتقال</button>
           </div>
        </div>
      )}

      {onDelete && (
        <div className="mt-8 pt-6 border-t border-slate-200 text-center">
            <button type="button" onClick={() => { if(deleteConfirm) { onDelete(personId); } else { setDeleteConfirm(true); setTimeout(() => setDeleteConfirm(false), 3000); } }} className={`w-full py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${deleteConfirm ? 'bg-red-500 text-white animate-pulse' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}>
                {deleteConfirm ? 'برای حذف کامل کلیک کنید' : 'حذف این فرد از درخت'}
            </button>
        </div>
      )}
    </div>
  );
};

export default EditForm;
