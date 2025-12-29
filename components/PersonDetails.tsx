
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
  isAuthenticated: boolean;
  onLoginSuccess: () => void;
  adminCreds?: { user: string; pass: string }; 
}

// --- توابع کمکی ---

// تولید رنگ بر اساس نام
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};

// تولید عدد تصادفی ثابت بر اساس نام برای انتخاب آواتار پیش‌فرض
const stringToAvatarIndex = (str: string, max: number) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % max;
};

// فشرده‌سازی تصویر در سمت کلاینت (حجم بسیار کم)
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // کاهش سایز به 150 پیکسل
        const MAX_WIDTH = 150; 
        const scaleSize = MAX_WIDTH / img.width;
        
        canvas.width = scaleSize < 1 ? MAX_WIDTH : img.width;
        canvas.height = scaleSize < 1 ? img.height * scaleSize : img.height;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // خروجی JPEG با کیفیت 50 درصد
        const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

// آیکون‌های پیش‌فرض SVG
const DefaultAvatars = [
  null, // Letter
  // 1: Generic Man
  (className: string) => <svg className={className} style={{width: '100%', height: '100%'}} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>,
  // 2: Generic Person
  (className: string) => <svg className={className} style={{width: '100%', height: '100%'}} viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>,
  // 3: Woman
  (className: string) => <svg className={className} style={{width: '100%', height: '100%'}} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c-5.52 0-10 4.48-10 10s4.48 10 10 10 10-4.48 10-10-4.48-10-10-10zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" /></svg>,
  // 4: Smile
  (className: string) => <svg className={className} style={{width: '100%', height: '100%'}} viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>
];

// کامپوننت آواتار هوشمند
const SmartAvatar: React.FC<{ name: string; imageUrl?: string; avatarIndex?: number; size?: 'sm' | 'lg' | 'xl'; className?: string }> = ({ name, imageUrl, avatarIndex, size = 'lg', className = '' }) => {
  const sizeClasses = {
    sm: 'w-10 h-10 text-sm',
    lg: 'w-24 h-24 text-3xl',
    xl: 'w-32 h-32 text-5xl'
  };

  if (imageUrl) {
    return (
      <img 
        src={imageUrl} 
        alt={name} 
        className={`rounded-full object-cover border-4 border-white shadow-lg ${sizeClasses[size]} ${className}`} 
      />
    );
  }

  const finalIndex = (avatarIndex !== undefined && avatarIndex !== null) 
    ? avatarIndex 
    : stringToAvatarIndex(name, 5);
  
  const AvatarIcon = DefaultAvatars[finalIndex];
  const bgColor = stringToColor(name);

  if (finalIndex > 0 && AvatarIcon) {
      return (
        <div className={`rounded-full flex items-center justify-center bg-slate-200 text-slate-500 border-4 border-white shadow-lg overflow-hidden ${sizeClasses[size]} ${className}`}>
             {AvatarIcon("w-2/3 h-2/3")}
        </div>
      );
  }

  return (
    <div 
      className={`rounded-full flex items-center justify-center font-black text-white border-4 border-white shadow-lg ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      {name.charAt(0)}
    </div>
  );
};

const PersonDetails: React.FC<PersonDetailsProps> = ({ 
  person, 
  allMembers, 
  onClose, 
  onUpdate, 
  onAddChild, 
  onAddExistingChild, 
  onDelete,
  onMoveSubtree,
  isAuthenticated,
  onLoginSuccess,
  adminCreds = { user: 'admin123', pass: 'ce245b118' }
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Person>>({});
  const [newChildName, setNewChildName] = useState('');
  const [existingChildSearch, setExistingChildSearch] = useState('');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    if (person) {
      setFormData({
        name: person.name,
        surname: person.surname || '',
        gender: person.gender || 'male',
        mobile: person.mobile || '',
        email: person.email || '',
        imageUrl: person.imageUrl || '',
        avatarIndex: person.avatarIndex,
        birthDate: person.birthDate || '',
        deathDate: person.deathDate || '',
        title: person.title || '',
        spouseName: person.spouseName || '',
        spouseId: person.spouseId,
        secondSpouseName: person.secondSpouseName || '',
        secondSpouseId: person.secondSpouseId,
        description: person.description || '',
        status: person.status || [],
        sharedChildren: person.sharedChildren || [],
        children: person.children || []
      });
      setIsEditing(false);
      setShowLogin(false);
      setNewChildName('');
      setExistingChildSearch('');
      setDeleteConfirm(false); 
    }
  }, [person]);

  const handleLogin = () => {
    if (username === adminCreds.user && password === adminCreds.pass) {
      onLoginSuccess();
      setShowLogin(false);
      setIsEditing(true);
      setLoginError('');
      setUsername('');
      setPassword('');
    } else {
      setLoginError('نام کاربری یا رمز عبور اشتباه است.');
    }
  };

  const handleEditClick = () => {
    if (isAuthenticated) {
      setIsEditing(true);
    } else {
      setShowLogin(true);
    }
  };

  if (!person) return null;

  const handleSave = () => {
    onUpdate(person.id, formData);
    setIsEditing(false);
  };

  return (
    <div className="person-details-sidebar fixed inset-y-0 right-0 w-full sm:w-[500px] bg-white/95 backdrop-blur-xl shadow-[-20px_0_50px_rgba(0,0,0,0.1)] z-50 transform transition-all duration-500 ease-out border-l border-slate-200 overflow-y-auto pb-20" dir="rtl" onClick={e => e.stopPropagation()}>
      <div className="p-8 pb-24"> 
        <header className="flex justify-between items-center mb-8 border-b pb-4">
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-amber-100 transition-all">
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          {!isEditing && !showLogin && (
            <button onClick={handleEditClick} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition-all shadow-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              ویرایش پروفایل
            </button>
          )}
        </header>

        {showLogin ? (
          <div className="space-y-4 animate-in fade-in zoom-in-95">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto flex items-center justify-center mb-2">
                <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <h3 className="font-black text-slate-800">احراز هویت مدیر</h3>
              <p className="text-xs text-slate-500 mt-1">برای ویرایش اطلاعات لطفا وارد شوید</p>
            </div>

            {loginError && (
              <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl border border-red-100 text-center">
                {loginError}
              </div>
            )}

            <div>
              <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">نام کاربری</label>
              <input 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-amber-500 outline-none text-sm font-bold bg-slate-50 text-left"
                dir="ltr"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">رمز عبور</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-amber-500 outline-none text-sm font-bold bg-slate-50 text-left"
                dir="ltr"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={handleLogin} className="flex-1 bg-slate-800 text-white py-3 rounded-2xl font-black shadow-lg hover:bg-slate-900 transition-all">ورود</button>
              <button onClick={() => setShowLogin(false)} className="px-6 bg-slate-100 text-slate-600 py-3 rounded-2xl font-bold hover:bg-slate-200 transition-all">لغو</button>
            </div>
          </div>
        ) : isEditing ? (
          <EditForm 
            formData={formData} 
            setFormData={setFormData} 
            allMembers={allMembers} 
            personId={person.id}
            onSave={handleSave} 
            onCancel={() => setIsEditing(false)}
            onDelete={onDelete}
            onMoveSubtree={onMoveSubtree}
            deleteConfirm={deleteConfirm}
            setDeleteConfirm={setDeleteConfirm}
          />
        ) : (
          <ProfileView 
            person={person} 
            allMembers={allMembers} 
            newChildName={newChildName}
            setNewChildName={setNewChildName}
            existingChildSearch={existingChildSearch}
            setExistingChildSearch={setExistingChildSearch}
            onAddChild={onAddChild}
            onAddExistingChild={onAddExistingChild}
            isAuthenticated={isAuthenticated}
            onRequestEdit={() => isAuthenticated ? setIsEditing(true) : setShowLogin(true)}
          />
        )}
      </div>
    </div>
  );
};

const ProfileView: React.FC<any> = ({ 
  person, 
  allMembers, 
  newChildName, 
  setNewChildName, 
  existingChildSearch, 
  setExistingChildSearch,
  onAddChild,
  onAddExistingChild,
  isAuthenticated,
  onRequestEdit,
}) => {
  const currentExt = allMembers.find((m: any) => m.id === person.id);
  
  const isFemale = getDerivedGender(person) === 'female';
  
  const isDeceased = person.status?.includes('مرحوم');
  const isSingle = person.status?.includes('مجرد');
  const totalKids = (person.children?.length || 0) + (person.sharedChildren?.length || 0);
  
  const calculatedAge = calculatePersianAge(person.birthDate, person.deathDate, person.status);
  const hasTwoSpouses = person.spouseName && person.secondSpouseName;
  const spouse1Label = hasTwoSpouses ? "همسر اول" : "همسر";
  
  return (
    <div className="space-y-6">
      <div className="text-center pb-6 relative flex flex-col items-center">
        <SmartAvatar name={person.name} imageUrl={person.imageUrl} avatarIndex={person.avatarIndex} size="xl" className="mb-4" />
        
        <h2 className="text-2xl font-black text-slate-900">
           {person.name} {person.surname}
           {person.title && <span className="block text-sm font-bold text-slate-500 mt-1">({person.title})</span>}
        </h2>
        <div className="flex justify-center gap-2 mt-3 flex-wrap">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${isFemale ? 'bg-pink-50 text-pink-600' : 'bg-blue-50 text-blue-600'}`}>
                {isFemale ? 'زن' : 'مرد'}
            </span>
            {isDeceased ? (
               <span className="text-[10px] font-bold bg-slate-600 text-white px-2 py-0.5 rounded-md">مرحوم</span>
            ) : (
               <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-md">در قید حیات</span>
            )}
            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                {isSingle ? 'مجرد' : 'متاهل'}
            </span>
            {calculatedAge && (
               <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">{calculatedAge}</span>
            )}
        </div>
        
        <p className="text-[10px] text-slate-400 font-bold mt-3 border border-slate-100 py-1 px-3 inline-block rounded-full bg-slate-50">
          {getFullIdentityLabel(currentExt)}
        </p>
      </div>

      <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-4">
        <div className="grid grid-cols-2 gap-4">
           {person.birthDate && (
              <div className="py-2 border-b border-slate-200">
                <span className="text-xs text-slate-400 font-bold block">تاریخ تولد:</span>
                <span className="text-sm font-black text-slate-800" dir="ltr">{person.birthDate}</span>
                {calculatedAge && !isDeceased && <span className="text-[10px] text-emerald-600 block mt-1 font-bold">({calculatedAge})</span>}
              </div>
           )}
           {person.deathDate && (
              <div className="py-2 border-b border-slate-200">
                <span className="text-xs text-slate-400 font-bold block">تاریخ وفات:</span>
                <span className="text-sm font-black text-slate-800" dir="ltr">{person.deathDate}</span>
              </div>
           )}
        </div>

        {person.mobile && (
          <div className="flex justify-between items-center py-2 border-b border-slate-200">
            <span className="text-xs text-slate-400 font-bold">شماره موبایل:</span>
            <span className="text-sm font-black text-slate-800" dir="ltr">{person.mobile}</span>
          </div>
        )}

        {person.email && (
          <div className="flex justify-between items-center py-2 border-b border-slate-200">
            <span className="text-xs text-slate-400 font-bold">ایمیل:</span>
            <span className="text-sm font-black text-slate-800 truncate max-w-[200px]" dir="ltr">{person.email}</span>
          </div>
        )}

        {person.spouseName && (
          <div className="flex justify-between items-center py-2 border-b border-slate-200">
            <span className="text-xs text-slate-400 font-bold">{spouse1Label}:</span>
            <span className="text-sm font-black text-slate-800">{person.spouseName}</span>
          </div>
        )}

        {person.secondSpouseName && (
          <div className="flex justify-between items-center py-2 border-b border-slate-200">
            <span className="text-xs text-slate-400 font-bold">همسر دوم:</span>
            <span className="text-sm font-black text-slate-800">{person.secondSpouseName}</span>
          </div>
        )}
        
        {person.sharedChildren && person.sharedChildren.length > 0 && (
          <div className="py-2 border-b border-slate-200">
            <span className="text-xs text-slate-400 font-bold block mb-1">فرزندان (مشترک):</span>
            <span className="text-sm font-medium text-slate-700 leading-relaxed">
              {person.sharedChildren.map((child: string | SharedChild, idx: number) => {
                 const name = typeof child === 'string' ? child : child.name;
                 return (
                   <span key={idx}>{name}{idx < person.sharedChildren.length - 1 ? '، ' : ''}</span>
                 );
              })}
            </span>
          </div>
        )}

        <div className="flex justify-between items-center py-2">
          <span className="text-xs text-slate-400 font-bold">مجموع فرزندان:</span>
          <span className="text-sm font-black text-slate-800">{totalKids} نفر</span>
        </div>

        {person.description && (
          <div className="pt-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">توضیحات:</span>
            <p className="text-sm text-slate-600 leading-relaxed font-medium">{person.description}</p>
          </div>
        )}
      </div>

      <div className="space-y-6 pt-4">
        {isAuthenticated ? (
          <>
            <section className="p-5 bg-emerald-50 rounded-[2rem] border border-emerald-100 space-y-4 shadow-inner">
              <h3 className="text-sm font-black text-emerald-800 flex items-center gap-2">ثبت فرزند جدید (ایجاد شاخه)</h3>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="نام فرزند..." 
                  className="flex-1 px-4 py-2.5 rounded-xl border border-emerald-200 focus:border-emerald-500 outline-none text-sm font-bold bg-white"
                  value={newChildName}
                  onChange={e => setNewChildName(e.target.value)}
                />
                <button onClick={() => { if(newChildName) onAddChild(person.id, newChildName); setNewChildName(''); }} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-black shadow-lg">ثبت</button>
              </div>
            </section>

            <section className="p-5 bg-indigo-50 rounded-[2rem] border border-indigo-100 space-y-4 shadow-inner">
              <h3 className="text-sm font-black text-indigo-800 flex items-center gap-2">انتساب از اعضای موجود</h3>
              <div className="flex gap-2">
                <input 
                  list="child-move-list"
                  placeholder="جستجوی نسب کامل..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-indigo-200 focus:border-indigo-500 outline-none text-sm font-bold bg-white"
                  value={existingChildSearch}
                  onChange={e => setExistingChildSearch(e.target.value)}
                />
                <datalist id="child-move-list">
                  {allMembers.filter((m: any) => m.id !== person.id).map((m: any) => (
                    <option key={m.id} value={getFullIdentityLabel(m)} />
                  ))}
                </datalist>
                <button onClick={() => {
                  const selected = allMembers.find((m: any) => getFullIdentityLabel(m) === existingChildSearch.trim());
                  if(selected) onAddExistingChild(person.id, selected.id);
                  setExistingChildSearch('');
                }} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-black shadow-lg">انتصاب</button>
              </div>
            </section>
          </>
        ) : (
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl text-center space-y-3">
             <p className="text-slate-500 text-sm font-bold">برای افزودن فرزند یا ویرایش ساختار، باید وارد حساب مدیریت شوید.</p>
             <button onClick={onRequestEdit} className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-sm transition-all">ورود مدیر</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ... EditForm ...
const EditForm: React.FC<any> = ({ 
  formData, setFormData, allMembers, personId, onSave, onCancel, 
  onDelete, onMoveSubtree, deleteConfirm, setDeleteConfirm 
}) => {
  const [childInput, setChildInput] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [moveTargetName, setMoveTargetName] = useState('');
  
  // Custom Confirmation State for Move Subtree
  const [showMoveConfirm, setShowMoveConfirm] = useState(false);
  const [moveTarget, setMoveTarget] = useState<any>(null);

  const [spouseSuggestions, setSpouseSuggestions] = useState<any[]>([]);
  const [showSpouseSuggestions, setShowSpouseSuggestions] = useState(false);
  const [secondSpouseSuggestions, setSecondSpouseSuggestions] = useState<any[]>([]);
  const [showSecondSpouseSuggestions, setShowSecondSpouseSuggestions] = useState(false);

  const [moveSuggestions, setMoveSuggestions] = useState<any[]>([]);
  const [showMoveSuggestions, setShowMoveSuggestions] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateStatus = (key: string, value: boolean) => {
      let currentStatus = formData.status || [];
      if (key === 'مرحوم') {
          if (value) { if (!currentStatus.includes('مرحوم')) currentStatus.push('مرحوم'); }
          else { currentStatus = currentStatus.filter((s: string) => s !== 'مرحوم'); }
      }
      if (key === 'مجرد') {
           currentStatus = currentStatus.filter((s: string) => s !== 'مجرد' && s !== 'متاهل');
           if (value) currentStatus.push('مجرد');
      }
      if (key === 'متاهل') {
           currentStatus = currentStatus.filter((s: string) => s !== 'مجرد' && s !== 'متاهل');
           if (value) currentStatus.push('متاهل');
      }
      setFormData({ ...formData, status: currentStatus });
  };

  const isDeceased = formData.status?.includes('مرحوم');
  const isSingle = formData.status?.includes('مجرد');

  useEffect(() => {
    if (childInput.length >= 1) { 
       const found = allMembers.filter((m: any) => 
         m.id !== personId && 
         (m.name.includes(childInput) || (m.surname && m.surname.includes(childInput)))
       ).slice(0, 50);
       setSuggestions(found);
       setShowSuggestions(true);
    } else {
       setShowSuggestions(false);
    }
  }, [childInput, allMembers, personId]);

  const addSharedChild = (name: string, id?: string) => {
    const currentList = formData.sharedChildren || [];
    const exists = currentList.some((c: string | SharedChild) => {
        if (typeof c === 'string') return c === name;
        return c.name === name || (id && c.id === id);
    });

    if (!exists) {
      const payload = id ? { id, name } : name; 
      setFormData({ ...formData, sharedChildren: [...currentList, payload] });
    }
    setChildInput('');
    setShowSuggestions(false);
  };

  const removeSharedChild = (index: number) => {
    const currentList = formData.sharedChildren || [];
    const newList = [...currentList];
    newList.splice(index, 1);
    setFormData({ ...formData, sharedChildren: newList });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (childInput.trim()) {
        addSharedChild(childInput.trim());
      }
    }
  };

  const handleSpouseInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setFormData({ ...formData, spouseName: val, spouseId: undefined });
      
      if (val.length >= 1) {
         const found = allMembers.filter((m: any) => 
           m.id !== personId && 
           (m.name.includes(val) || (m.surname && m.surname.includes(val)))
         ).slice(0, 20);
         setSpouseSuggestions(found);
         setShowSpouseSuggestions(true);
      } else {
         setShowSpouseSuggestions(false);
      }
  };

  const selectSpouse = (m: any) => {
      const fullName = `${m.name} ${m.surname || ''}`.trim();
      setFormData({ ...formData, spouseName: fullName, spouseId: m.id });
      setShowSpouseSuggestions(false);
  };

  const handleSecondSpouseInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setFormData({ ...formData, secondSpouseName: val, secondSpouseId: undefined });
      
      if (val.length >= 1) {
         const found = allMembers.filter((m: any) => 
           m.id !== personId && 
           (m.name.includes(val) || (m.surname && m.surname.includes(val)))
         ).slice(0, 20);
         setSecondSpouseSuggestions(found);
         setShowSecondSpouseSuggestions(true);
      } else {
         setShowSecondSpouseSuggestions(false);
      }
  };

  const selectSecondSpouse = (m: any) => {
      const fullName = `${m.name} ${m.surname || ''}`.trim();
      setFormData({ ...formData, secondSpouseName: fullName, secondSpouseId: m.id });
      setShowSecondSpouseSuggestions(false);
  };

  const handleMoveInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setMoveTargetName(val);
      
      if (val.length >= 1) {
         const found = allMembers.filter((m: any) => 
           m.id !== personId && 
           (m.name.includes(val) || (m.surname && m.surname.includes(val)))
         ).slice(0, 20);
         setMoveSuggestions(found);
         setShowMoveSuggestions(true);
      } else {
         setShowMoveSuggestions(false);
      }
  };

  const selectMoveTarget = (m: any) => {
      setMoveTargetName(getFullIdentityLabel(m));
      setShowMoveSuggestions(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedBase64 = await compressImage(file);
      setFormData({ ...formData, imageUrl: compressedBase64 });
    } catch (error) {
      alert("خطا در پردازش تصویر");
      console.error(error);
    }
  };

  const handleAvatarSelection = (idx: number) => {
      setFormData({ ...formData, avatarIndex: idx });
  };

  // Modified to use Custom Confirmation instead of window.confirm
  const handleMoveSubtreeClick = () => {
    if (!moveTargetName) return;
    const target = allMembers.find((m: any) => getFullIdentityLabel(m) === moveTargetName.trim());
    if (target) {
        setMoveTarget(target);
        setShowMoveConfirm(true);
    } else {
        alert("فرد مقصد یافت نشد. لطفا از لیست انتخاب کنید.");
    }
  };

  const confirmMove = () => {
      if (onMoveSubtree && moveTarget) {
          onMoveSubtree(personId, moveTarget.id);
          setShowMoveConfirm(false);
          setMoveTarget(null);
      }
  };
  
  const moveChild = (index: number, direction: 'up' | 'down') => {
    if (!formData.children) return;
    const newChildren = [...formData.children];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newChildren.length) {
        [newChildren[index], newChildren[targetIndex]] = [newChildren[targetIndex], newChildren[index]];
        setFormData({ ...formData, children: newChildren });
    }
  };

  const currentPersonExt = allMembers.find((m: any) => m.id === personId);
  const currentParent = currentPersonExt?.parentId 
    ? allMembers.find((m: any) => m.id === currentPersonExt.parentId) 
    : null;

  return (
    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200 pb-10 relative">
      
      {/* Custom Confirmation Modal */}
      {showMoveConfirm && moveTarget && (
         <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4 rounded-3xl animate-in fade-in">
            <div className="bg-white border-2 border-orange-200 shadow-2xl p-6 rounded-3xl text-center max-w-xs w-full">
               <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
               </div>
               <h4 className="font-black text-slate-800 text-base mb-2">تایید انتقال شاخه</h4>
               <p className="text-xs text-slate-600 mb-6 font-medium leading-relaxed">
                  آیا اطمینان دارید که 
                  <span className="font-black text-slate-900 mx-1">"{formData.name}"</span>
                  و تمام زیرمجموعه آن به زیرمجموعه
                  <span className="font-black text-slate-900 mx-1">"{moveTarget.name} {moveTarget.surname}"</span>
                  منتقل شوند؟
               </p>
               <div className="flex flex-col gap-2">
                  <button onClick={confirmMove} className="w-full bg-orange-500 text-white py-2.5 rounded-xl font-black text-xs hover:bg-orange-600 transition-all shadow-lg shadow-orange-200">بله، منتقل شود</button>
                  <button onClick={() => setShowMoveConfirm(false)} className="w-full bg-slate-100 text-slate-500 py-2.5 rounded-xl font-bold text-xs hover:bg-slate-200 transition-all">لغو عملیات</button>
               </div>
            </div>
         </div>
      )}

      <div className="flex flex-col items-center gap-3 mb-6 bg-slate-50 p-4 rounded-3xl border border-slate-100">
        <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">تصویر پروفایل</label>
        
        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          <SmartAvatar name={formData.name || '?'} imageUrl={formData.imageUrl} avatarIndex={formData.avatarIndex} size="lg" />
          <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
        </div>
        
        <div className="flex gap-2">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs text-amber-600 font-bold bg-white border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-50">آپلود عکس</button>
            {formData.imageUrl && (
                <button type="button" onClick={() => setFormData({...formData, imageUrl: ''})} className="text-xs text-red-500 font-bold bg-white border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50">حذف عکس</button>
            )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

        {!formData.imageUrl && (
            <div className="mt-3 w-full">
                <label className="text-[9px] font-bold text-slate-400 block mb-2 text-center">یا انتخاب آواتار پیش‌فرض:</label>
                <div className="flex justify-center gap-2 flex-wrap">
                    {[0, 1, 2, 3, 4].map((idx) => (
                        <div 
                            key={idx} 
                            onClick={() => handleAvatarSelection(idx)}
                            className={`cursor-pointer p-1 rounded-full border-2 transition-all ${formData.avatarIndex === idx ? 'border-amber-500 scale-110' : 'border-transparent hover:border-slate-300'}`}
                        >
                            <SmartAvatar name={formData.name || '?'} avatarIndex={idx} size="sm" />
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>

      {onMoveSubtree && (
        <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 mb-6 shadow-sm overflow-visible z-10 relative">
           <h4 className="text-xs font-black text-orange-800 mb-2 flex items-center gap-1">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
             انتقال کامل شاخه (جابجایی والد)
           </h4>
           <div className="text-[10px] text-orange-700 mb-3 font-medium leading-relaxed bg-orange-100/50 p-2 rounded-lg">
             {currentParent && (
                <div className="mb-1 pb-1 border-b border-orange-200">
                    والد فعلی: <b>{currentParent.name} {currentParent.surname}</b>
                </div>
             )}
             این فرد ({formData.name}) و تمام زیرمجموعه او از والد فعلی جدا شده و به زیرمجموعه والد جدید منتقل می‌شوند.
           </div>
           <div className="flex gap-2 relative">
             <div className="flex-1 relative">
                 <input 
                   type="text"
                   className="w-full px-3 py-2 rounded-lg border border-orange-200 text-xs font-bold focus:border-orange-500 outline-none bg-white"
                   placeholder="جستجوی والد جدید..."
                   value={moveTargetName}
                   onChange={handleMoveInputChange}
                   onFocus={() => { if(moveTargetName) handleMoveInputChange({target: {value: moveTargetName}} as any); }}
                 />
                 {showMoveSuggestions && moveSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-40 overflow-y-auto">
                       {moveSuggestions.map((m: any) => (
                         <div 
                           key={m.id} 
                           onClick={() => selectMoveTarget(m)} 
                           className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-xs font-bold border-b border-slate-50 last:border-0"
                         >
                           {m.name} {m.surname} <span className="text-slate-400 text-[9px]">({getFullIdentityLabel(m)})</span>
                         </div>
                       ))}
                    </div>
                 )}
             </div>
             <button 
                type="button"
                onClick={handleMoveSubtreeClick}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg text-xs font-black hover:bg-orange-700 transition-colors shadow-md"
             >
                انتقال
             </button>
           </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-1">
          <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">نام</label>
          <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 outline-none text-sm font-bold" />
        </div>
        <div className="col-span-1">
          <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">نام خانوادگی</label>
          <input type="text" value={formData.surname} onChange={e => setFormData({...formData, surname: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 outline-none text-sm font-bold" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-1">
           <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">جنسیت</label>
           <select value={formData.gender || 'male'} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 outline-none text-sm font-bold bg-white">
             <option value="male">مرد</option>
             <option value="female">زن</option>
           </select>
        </div>
        <div className="col-span-1">
          <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">لقب یا پیشوند (نمایش در پرانتز)</label>
          <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 outline-none text-sm font-bold" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-1">
           <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">تاریخ تولد (شمسی)</label>
           <input type="text" placeholder="13XX/XX/XX" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 outline-none text-sm font-bold bg-white text-center" dir="ltr" />
        </div>
        <div className="col-span-1">
           <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">تاریخ وفات (شمسی)</label>
           <input type="text" placeholder="14XX/XX/XX" value={formData.deathDate} onChange={e => setFormData({...formData, deathDate: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 outline-none text-sm font-bold bg-white text-center" dir="ltr" />
        </div>
      </div>

      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-2 gap-4">
         <div>
            <label className="text-[10px] font-black text-slate-400 mb-2 block uppercase">وضعیت حیات</label>
            <div className="flex gap-2">
                <label className="flex items-center gap-1 cursor-pointer">
                    <input type="radio" name="lifeStatus" checked={!isDeceased} onChange={() => updateStatus('مرحوم', false)} className="accent-green-600" />
                    <span className="text-xs font-bold">زنده</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                    <input type="radio" name="lifeStatus" checked={isDeceased} onChange={() => updateStatus('مرحوم', true)} className="accent-slate-600" />
                    <span className="text-xs font-bold">مرحوم</span>
                </label>
            </div>
         </div>
         <div>
            <label className="text-[10px] font-black text-slate-400 mb-2 block uppercase">وضعیت تاهل</label>
            <div className="flex gap-2">
                <label className="flex items-center gap-1 cursor-pointer">
                    <input type="radio" name="maritalStatus" checked={isSingle} onChange={() => updateStatus('مجرد', true)} className="accent-cyan-600" />
                    <span className="text-xs font-bold">مجرد</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                    <input type="radio" name="maritalStatus" checked={!isSingle} onChange={() => updateStatus('متاهل', true)} className="accent-indigo-600" />
                    <span className="text-xs font-bold">متاهل</span>
                </label>
            </div>
         </div>
      </div>
      
      <div>
          <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">شماره موبایل</label>
          <input type="tel" dir="ltr" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 outline-none text-sm font-bold text-left" placeholder="0912..." />
      </div>

      <div>
          <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">ایمیل</label>
          <input type="email" dir="ltr" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 outline-none text-sm font-bold text-left" placeholder="example@gmail.com" />
      </div>

      <div className="relative">
        <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">نام همسر اول</label>
        <input 
            type="text"
            value={formData.spouseName} 
            onChange={handleSpouseInputChange} 
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 outline-none text-sm font-bold" 
            placeholder="نام همسر اول (جستجو یا تایپ)..." 
        />
        {showSpouseSuggestions && spouseSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-40 overflow-y-auto">
               {spouseSuggestions.map((s: any) => (
                 <div 
                   key={s.id} 
                   onClick={() => selectSpouse(s)} 
                   className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-xs font-bold border-b border-slate-50 last:border-0"
                 >
                   {s.name} {s.surname} <span className="text-slate-400 text-[9px]">({getFullIdentityLabel(s)})</span>
                 </div>
               ))}
            </div>
        )}
      </div>

      <div className="relative">
        <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">نام همسر دوم (اختیاری)</label>
        <input 
            type="text"
            value={formData.secondSpouseName} 
            onChange={handleSecondSpouseInputChange} 
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 outline-none text-sm font-bold" 
            placeholder="نام همسر دوم (جستجو یا تایپ)..." 
        />
        {showSecondSpouseSuggestions && secondSpouseSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-40 overflow-y-auto">
               {secondSpouseSuggestions.map((s: any) => (
                 <div 
                   key={s.id} 
                   onClick={() => selectSecondSpouse(s)} 
                   className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-xs font-bold border-b border-slate-50 last:border-0"
                 >
                   {s.name} {s.surname} <span className="text-slate-400 text-[9px]">({getFullIdentityLabel(s)})</span>
                 </div>
               ))}
            </div>
        )}
      </div>

      {formData.children && formData.children.length > 0 && (
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 shadow-sm">
              <h4 className="text-xs font-black text-blue-800 mb-2 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                  ترتیب فرزندان (نمایش در درخت)
              </h4>
              <p className="text-[9px] text-blue-600 mb-3 font-medium">با جابجایی آیتم‌ها، اولویت نمایش فرزندان در نمودار (از راست به چپ یا بالا به پایین) تغییر می‌کند.</p>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {formData.children.map((child, idx) => (
                      <div key={child.id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-blue-100 shadow-sm">
                         <div className="flex items-center gap-2">
                             <span className="bg-blue-100 text-blue-700 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold">{idx + 1}</span>
                             <span className="text-xs font-bold text-slate-700">{child.name}</span>
                         </div>
                         <div className="flex gap-1">
                             <button 
                                type="button" 
                                onClick={() => moveChild(idx, 'up')} 
                                disabled={idx === 0} 
                                className="p-1.5 bg-slate-100 rounded-md hover:bg-blue-100 text-slate-600 disabled:opacity-30 disabled:hover:bg-slate-100"
                                title="جابجایی به بالا"
                             >
                                 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
                             </button>
                             <button 
                                type="button" 
                                onClick={() => moveChild(idx, 'down')} 
                                disabled={idx === (formData.children?.length || 0) - 1} 
                                className="p-1.5 bg-slate-100 rounded-md hover:bg-blue-100 text-slate-600 disabled:opacity-30 disabled:hover:bg-slate-100"
                                title="جابجایی به پایین"
                             >
                                 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                             </button>
                         </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 relative">
        <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">لیست فرزندان (متنی/انتصابی)</label>
        <div className="text-[9px] text-amber-600 mb-2">* برای اضافه کردن نام را تایپ کرده و Enter بزنید یا از لیست انتخاب کنید.</div>
        
        <div className="flex flex-wrap gap-2 mb-2">
          {formData.sharedChildren && formData.sharedChildren.map((child: string | SharedChild, idx: number) => {
            const name = typeof child === 'string' ? child : child.name;
            const hasLink = typeof child !== 'string' && child.id;
            return (
              <span key={idx} className={`text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1 ${hasLink ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' : 'bg-amber-100 text-amber-800'}`}>
                {name}
                <button onClick={() => removeSharedChild(idx)} className="hover:text-red-500">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </span>
            );
          })}
        </div>

        <div className="relative flex gap-2">
          <input 
            ref={inputRef}
            type="text" 
            value={childInput}
            onChange={e => setChildInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="نام فرزند را تایپ کنید..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 outline-none text-sm font-bold bg-white" 
          />
          <button 
             onClick={() => { if(childInput.trim()) addSharedChild(childInput.trim()); }}
             className="px-4 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors shadow-md"
             title="افزودن نام"
          >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
          </button>

          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-12 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-40 overflow-y-auto">
               {suggestions.map((s: any) => (
                 <div 
                   key={s.id} 
                   onClick={() => addSharedChild(`${s.name} ${s.surname || ''}`.trim(), s.id)} 
                   className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-xs font-bold border-b border-slate-50 last:border-0"
                 >
                   {s.name} {s.surname} <span className="text-slate-400 text-[9px]">({getFullIdentityLabel(s)})</span>
                 </div>
               ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="text-[10px] font-black text-slate-400 mb-1 block uppercase">توضیحات تکمیلی</label>
        <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 outline-none text-sm font-medium" />
      </div>

      <div className="flex gap-3 pt-4 border-t items-center flex-wrap">
        <button onClick={onSave} className="flex-1 bg-amber-600 text-white py-3 rounded-2xl font-black shadow-lg hover:bg-amber-700 transition-all">ذخیره تغییرات</button>
        <button onClick={onCancel} className="px-6 bg-slate-100 text-slate-600 py-3 rounded-2xl font-bold hover:bg-slate-200 transition-all">انصراف</button>
      </div>

      {onDelete && (
        <div className="mt-8 pt-6 border-t border-slate-200 text-center">
            <button 
                type="button" 
                onClick={() => {
                if(deleteConfirm) {
                    onDelete(personId);
                } else {
                    setDeleteConfirm(true);
                    setTimeout(() => setDeleteConfirm(false), 3000);
                }
                }} 
                className={`w-full py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${deleteConfirm ? 'bg-red-500 text-white animate-pulse' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}
            >
                {deleteConfirm ? 'برای حذف کامل کلیک کنید (غیر قابل بازگشت)' : (
                <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    حذف این فرد از درخت
                </>
                )}
            </button>
        </div>
      )}
    </div>
  );
};

export default PersonDetails;
