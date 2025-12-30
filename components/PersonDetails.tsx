
import React, { useState, useEffect, useRef } from 'react';
import { Person, SharedChild } from '../types';
import { ExtendedPerson, getFullIdentityLabel, calculatePersianAge, getDerivedGender } from '../utils/genealogy';

interface PersonDetailsProps {
  person: Person | null;
  allMembers: ExtendedPerson[];
  onClose: () => void;
  onUpdate: (id: string, updatedFields: Partial<Person>) => void;
  onAddChild: (parentId: string, childName: string) => void;
  onAddExistingChild: (parentId: string, childId: string) => void;
  onDelete?: (id: string) => void; 
  onMoveSubtree?: (nodeId: string, newParentId: string) => void;
  onExtractSubtree?: (personId: string) => void;
  isAuthenticated: boolean;
  onLoginSuccess: () => void;
  adminCreds?: { user: string; pass: string }; 
  canEdit?: boolean;
}

const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};

const stringToAvatarIndex = (str: string, max: number) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % max;
};

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300; 
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = scaleSize < 1 ? MAX_WIDTH : img.width;
        canvas.height = scaleSize < 1 ? img.height * scaleSize : img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const DefaultAvatars = [
  null,
  (className: string) => <svg className={className} style={{width: '100%', height: '100%'}} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>,
  (className: string) => <svg className={className} style={{width: '100%', height: '100%'}} viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>,
  (className: string) => <svg className={className} style={{width: '100%', height: '100%'}} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c-5.52 0-10 4.48-10 10s4.48 10 10 10 10-4.48 10-10-4.48-10-10-10zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" /></svg>,
  (className: string) => <svg className={className} style={{width: '100%', height: '100%'}} viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>
];

const SmartAvatar: React.FC<{ name: string; imageUrl?: string; avatarIndex?: number; size?: 'sm' | 'lg' | 'xl'; className?: string }> = ({ name, imageUrl, avatarIndex, size = 'lg', className = '' }) => {
  const sizeClasses = { sm: 'w-10 h-10 text-sm', lg: 'w-24 h-24 text-3xl', xl: 'w-32 h-32 text-5xl' };
  if (imageUrl) return <img src={imageUrl} alt={name} className={`rounded-full object-cover border-4 border-white shadow-lg ${sizeClasses[size]} ${className}`} />;
  const finalIndex = (avatarIndex !== undefined && avatarIndex !== null) ? avatarIndex : stringToAvatarIndex(name, 5);
  const AvatarIcon = DefaultAvatars[finalIndex];
  const bgColor = stringToColor(name);
  if (finalIndex > 0 && AvatarIcon) return <div className={`rounded-full flex items-center justify-center bg-slate-200 text-slate-500 border-4 border-white shadow-lg overflow-hidden ${sizeClasses[size]} ${className}`}>{AvatarIcon("w-2/3 h-2/3")}</div>;
  return <div className={`rounded-full flex items-center justify-center font-black text-white border-4 border-white shadow-lg ${sizeClasses[size]} ${className}`} style={{ backgroundColor: bgColor }}>{name.charAt(0)}</div>;
};

const PersonDetails: React.FC<PersonDetailsProps> = ({ 
  person, allMembers, onClose, onUpdate, onAddChild, onAddExistingChild, 
  onDelete, onMoveSubtree, onExtractSubtree, isAuthenticated, onLoginSuccess, adminCreds, canEdit = false 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [formData, setFormData] = useState<Partial<Person>>({});
  const [newChildName, setNewChildName] = useState('');
  const [existingChildSearch, setExistingChildSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    if (person) {
      setFormData({
        name: person.name, surname: person.surname || '', gender: person.gender || 'male', mobile: person.mobile || '', email: person.email || '', imageUrl: person.imageUrl || '', avatarIndex: person.avatarIndex, birthDate: person.birthDate || '', deathDate: person.deathDate || '', title: person.title || '', spouseName: person.spouseName || '', spouseId: person.spouseId, secondSpouseName: person.secondSpouseName || '', secondSpouseId: person.secondSpouseId, description: person.description || '', status: person.status || [], sharedChildren: person.sharedChildren || [], children: person.children || []
      });
      setIsEditing(false); setShowLogin(false); setNewChildName(''); setExistingChildSearch(''); setDeleteConfirm(false); 
    }
  }, [person]);

  const handleEditClick = () => {
    if (isAuthenticated) { if (canEdit) setIsEditing(true); else alert("شما دسترسی ویرایش این خاندان را ندارید."); } 
    else setShowLogin(true);
  };
  const handleSave = () => { onUpdate(person!.id, formData); setIsEditing(false); };

  if (!person) return null;

  return (
    <div className="person-details-sidebar fixed inset-y-0 right-0 w-full sm:w-[500px] bg-white/95 backdrop-blur-xl shadow-[-20px_0_50px_rgba(0,0,0,0.1)] z-50 transform transition-all duration-500 ease-out border-l border-slate-200 overflow-y-auto pb-20" dir="rtl" onClick={e => e.stopPropagation()}>
      <div className="p-8 pb-24"> 
        <header className="flex justify-between items-center mb-8 border-b pb-4">
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-amber-100 transition-all">
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          {!isEditing && !showLogin && canEdit && (
            <button onClick={handleEditClick} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition-all shadow-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              ویرایش پروفایل
            </button>
          )}
        </header>

        {showLogin ? (
          <div className="space-y-4 animate-in fade-in zoom-in-95">
             <div className="flex gap-3 pt-2"><button onClick={() => setShowLogin(false)} className="px-6 bg-slate-100 text-slate-600 py-3 rounded-2xl font-bold hover:bg-slate-200 transition-all w-full">لغو</button></div>
          </div>
        ) : isEditing ? (
          <EditForm 
            formData={formData} setFormData={setFormData} allMembers={allMembers} personId={person.id}
            onSave={handleSave} onCancel={() => setIsEditing(false)} onDelete={onDelete} onMoveSubtree={onMoveSubtree}
            deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm}
          />
        ) : (
          <ProfileView 
            person={person} allMembers={allMembers} newChildName={newChildName} setNewChildName={setNewChildName}
            existingChildSearch={existingChildSearch} setExistingChildSearch={setExistingChildSearch}
            onAddChild={onAddChild} onAddExistingChild={onAddExistingChild} isAuthenticated={isAuthenticated}
            canEdit={canEdit} onRequestEdit={() => isAuthenticated ? (canEdit ? setIsEditing(true) : alert("دسترسی ندارید")) : setShowLogin(true)}
            onExtractSubtree={onExtractSubtree}
          />
        )}
      </div>
    </div>
  );
};

const ProfileView: React.FC<any> = ({ 
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
              <h3 className="text-sm font-black text-indigo-800 flex items-center gap-2">انتساب از اعضای موجود</h3>
              <div className="flex gap-2">
                <input list="child-move-list" placeholder="جستجوی نسب کامل..." className="flex-1 px-4 py-2.5 rounded-xl border border-indigo-200 focus:border-indigo-500 outline-none text-sm font-bold bg-white" value={existingChildSearch} onChange={e => setExistingChildSearch(e.target.value)} />
                <datalist id="child-move-list">{allMembers.filter((m: any) => m.id !== person.id).map((m: any) => (<option key={m.id} value={getFullIdentityLabel(m)} />))}</datalist>
                <button onClick={() => { const selected = allMembers.find((m: any) => getFullIdentityLabel(m) === existingChildSearch.trim()); if(selected) onAddExistingChild(person.id, selected.id); setExistingChildSearch(''); }} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-black shadow-lg">انتصاب</button>
              </div>
            </section>

            {onExtractSubtree && (
                <section className="p-5 bg-purple-50 rounded-[2rem] border border-purple-100 space-y-4 shadow-inner">
                    <h3 className="text-sm font-black text-purple-800 flex items-center gap-2">عملیات پیشرفته</h3>
                    <button 
                        onClick={() => {
                            // No confirm here, direct action
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

const EditForm: React.FC<any> = ({ 
  formData, setFormData, allMembers, personId, onSave, onCancel, 
  onDelete, onMoveSubtree, deleteConfirm, setDeleteConfirm 
}) => {
  const [moveTargetName, setMoveTargetName] = useState('');
  const [showMoveConfirm, setShowMoveConfirm] = useState(false);
  const [moveTarget, setMoveTarget] = useState<any>(null);
  
  // State for Shared Child Search
  const [sharedChildSearch, setSharedChildSearch] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const selected = allMembers.find((m: any) => getFullIdentityLabel(m) === sharedChildSearch.trim());
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
      const match = allMembers.find((m: any) => getFullIdentityLabel(m) === val);
      
      setFormData((prev: any) => ({
          ...prev,
          [fieldName]: val,
          [idFieldName]: match ? match.id : undefined // Link ID if found, otherwise unlink
      }));
  };

  const handleMoveSubtreeClick = () => {
    if (!moveTargetName) return;
    const target = allMembers.find((m: any) => getFullIdentityLabel(m) === moveTargetName.trim());
    if (target) { setMoveTarget(target); setShowMoveConfirm(true); } else { alert("فرد مقصد یافت نشد."); }
  };

  const confirmMove = () => { if (onMoveSubtree && moveTarget) { onMoveSubtree(personId, moveTarget.id); setShowMoveConfirm(false); setMoveTarget(null); } };

  return (
    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200 pb-10 relative">
      {/* Suggestions Data List */}
      <datalist id="all-members-list-edit">
          {allMembers.map((m: any) => (
              <option key={m.id} value={getFullIdentityLabel(m)} />
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
              <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">همسر اول</label>
              <input type="text" list="all-members-list-edit" value={formData.spouseName} onChange={e => handleSmartInputChange(e, 'spouseName', 'spouseId')} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 outline-none text-sm font-bold" placeholder="نام همسر..." />
              {formData.spouseId && <span className="text-[9px] text-green-600 px-2 font-bold">✓ متصل به پروفایل</span>}
          </div>
          <div>
              <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">همسر دوم</label>
              <input type="text" list="all-members-list-edit" value={formData.secondSpouseName} onChange={e => handleSmartInputChange(e, 'secondSpouseName', 'secondSpouseId')} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 outline-none text-sm font-bold" placeholder="نام همسر..." />
              {formData.secondSpouseId && <span className="text-[9px] text-green-600 px-2 font-bold">✓ متصل به پروفایل</span>}
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
             <datalist id="child-share-list">{allMembers.filter((m: any) => m.id !== personId).map((m: any) => (<option key={m.id} value={getFullIdentityLabel(m)} />))}</datalist>
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

export default PersonDetails;
