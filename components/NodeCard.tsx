
import React, { useState } from 'react';
import { Person, SharedChild, ViewMode } from '../types';

interface NodeCardProps {
  person: Person;
  isRoot?: boolean;
  onSelectDetails: (person: Person) => void;
  onActivateNavigation: (person: Person) => void;
  onSelectSpouse: (spouseName: string, spouseId?: string) => void; 
  depth: number;
  isSelectedForNav?: boolean;
  isOverview?: boolean; 
  onExpand?: () => void;
  onSelectByName?: (name: string) => void;
  ancestors?: Person[]; 
  viewMode: ViewMode;
  isDragMode?: boolean; 
  fontSizeScale?: number;
  viewRootId?: string | null; // New Prop
  onToggleViewRoot?: (id: string) => void; // New Prop
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

// آیکون‌های پیش‌فرض SVG
const DefaultAvatars = [
  null, // Letter
  (className: string) => <svg className={className} style={{width: '100%', height: '100%'}} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>,
  (className: string) => <svg className={className} style={{width: '100%', height: '100%'}} viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>,
  (className: string) => <svg className={className} style={{width: '100%', height: '100%'}} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c-5.52 0-10 4.48-10 10s4.48 10 10 10 10-4.48 10-10-4.48-10-10-10zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" /></svg>,
  (className: string) => <svg className={className} style={{width: '100%', height: '100%'}} viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>
];

const NodeCard: React.FC<NodeCardProps> = ({ 
  person, 
  isRoot, 
  onSelectDetails, 
  onActivateNavigation, 
  onSelectSpouse, 
  depth,
  isSelectedForNav,
  isOverview,
  onExpand,
  onSelectByName,
  ancestors = [],
  viewMode,
  isDragMode = false,
  fontSizeScale = 1,
  viewRootId,
  onToggleViewRoot
}) => {
  const [showBreadcrumbs, setShowBreadcrumbs] = useState(false);

  const isDeceased = person.status?.includes('مرحوم');
  const isShahid = person.status?.includes('شهید');
  const isSingle = person.status?.includes('مجرد');
  const totalChildren = (person.children?.length || 0) + (person.sharedChildren?.length || 0);

  const isSimple = viewMode === 'simple_tree' || viewMode === 'vertical_tree';
  const isViewRoot = viewRootId === person.id;

  // Handle interactions based on Drag Mode
  const handleDetailsClick = (e: React.MouseEvent, p: Person) => {
      e.stopPropagation();
      if (!isDragMode) onSelectDetails(p);
  };

  const handleNavClick = (e: React.MouseEvent, p: Person) => {
      e.stopPropagation();
      if (!isDragMode) onActivateNavigation(p);
  };

  const handleAnchorClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onToggleViewRoot && !isDragMode) onToggleViewRoot(person.id);
  };

  // ***********************************************
  // حالت نمایش ساده (Simple Mode)
  // ***********************************************
  if (isSimple) {
      return (
        <div
          id={`node-${person.id}`}
          onClick={(e) => handleDetailsClick(e, person)}
          className={`tree-node-card
             flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105
             px-2 py-1 bg-white
             ${isSelectedForNav ? 'ring-2 ring-amber-400 rounded-lg' : ''}
             ${isViewRoot ? 'ring-4 ring-purple-500 rounded-lg shadow-lg shadow-purple-200' : ''}
             ${isDragMode ? 'pointer-events-none' : ''} 
          `}
        >
          {/* نام به صورت ساده و مشکی */}
          <div 
            className="font-bold text-black text-sm whitespace-nowrap leading-tight text-center border-b-2 border-black pb-0.5"
            style={{ fontSize: `${0.875 * fontSizeScale}rem` }}
          >
             {person.name}
          </div>
          {/* نام خانوادگی کوچکتر در زیر */}
          {person.surname && (
            <div 
                className="text-[9px] text-gray-700 font-medium mt-0.5"
                style={{ fontSize: `${0.6 * fontSizeScale}rem` }}
            >
                {person.surname}
            </div>
          )}
          
          {/* نشانگرهای متنی کوچک */}
          <div className="flex gap-1 mt-0.5">
              {isShahid && <span className="text-[8px] text-red-600 font-bold">(شهید)</span>}
              {isDeceased && <span className="text-[8px] text-gray-400">†</span>}
          </div>
          
          {/* Anchor Button for Simple Mode */}
          {!isDragMode && (
              <button 
                  onClick={handleAnchorClick}
                  className={`absolute -top-2 -right-2 p-1 rounded-full shadow-sm border transition-all z-10 ${isViewRoot ? 'bg-purple-600 text-white border-purple-700' : 'bg-white text-slate-400 border-slate-200 hover:text-purple-500'}`}
                  title={isViewRoot ? "حذف فیلتر نمایش" : "نمایش فقط این شاخه"}
              >
                  <span className="text-sm font-bold leading-none" style={{ fontFamily: 'sans-serif' }}>&#9875;</span>
              </button>
          )}
        </div>
      );
  }

  // ***********************************************
  // حالت نمایش گرافیکی (Rich Card)
  // ***********************************************
  
  const depthStyles = [
    'from-amber-700 to-amber-900 border-amber-500 text-white shadow-amber-900/20',
    'from-slate-700 to-slate-900 border-slate-500 text-white shadow-slate-900/20',
    'from-emerald-600 to-emerald-800 border-emerald-400 text-white shadow-emerald-900/10',
    'from-blue-600 to-blue-800 border-blue-400 text-white shadow-blue-900/10',
    'from-indigo-500 to-indigo-700 border-indigo-300 text-white shadow-indigo-900/10',
    'from-purple-500 to-purple-700 border-purple-300 text-white shadow-purple-900/10',
    'from-white to-slate-100 border-slate-200 text-slate-800 shadow-slate-200',
  ];

  const currentStyle = depthStyles[Math.min(depth, depthStyles.length - 1)];
  const isLight = depth >= 6;

  if (isOverview) {
    return (
      <div 
        id={`node-${person.id}`}
        className={`tree-node-card
          flex items-center justify-center cursor-pointer
          w-20 h-20 rounded-full border-2 shadow-lg
          transition-all duration-300 hover:scale-110 hover:z-50
          bg-gradient-to-br ${currentStyle}
          ${isRoot ? 'w-28 h-28 ring-4 ring-amber-500/30' : ''}
          ${isSelectedForNav ? 'ring-2 ring-amber-400 border-amber-400' : ''}
          ${isViewRoot ? 'ring-4 ring-purple-500 border-purple-500 scale-110' : ''}
        `}
        onClick={(e) => {
          e.stopPropagation();
          if (!isDragMode && onExpand) onExpand();
        }}
        title={person.name}
      >
        <div className={`text-center px-1 flex flex-col items-center justify-center h-full w-full overflow-hidden ${isLight ? 'text-slate-800' : 'text-white'}`}>
           <span className="text-[10px] font-bold leading-tight line-clamp-2">{person.name}</span>
           <div className="flex gap-1 mt-1">
             {isShahid && <span className="w-1.5 h-1.5 rounded-full bg-red-500 border border-white"></span>}
             {isDeceased && <span className="w-1.5 h-1.5 rounded-full bg-slate-400 border border-white"></span>}
           </div>
        </div>
      </div>
    );
  }

  const reversedAncestors = [...ancestors].reverse();
  const hasAncestors = reversedAncestors.length > 0;
  const finalAvatarIndex = (person.avatarIndex !== undefined && person.avatarIndex !== null)
    ? person.avatarIndex
    : stringToAvatarIndex(person.name, 5);
  const AvatarIcon = DefaultAvatars[finalAvatarIndex];
  const bgColor = stringToColor(person.name);
  const hasTwoSpouses = person.spouseName && person.secondSpouseName;
  const spouse1Label = hasTwoSpouses ? "همسر اول" : "همسر";

  return (
    <div
      id={`node-${person.id}`}
      className={`tree-node-card
        relative flex flex-col items-center justify-center
        w-[240px] min-h-[160px] p-6 rounded-[2.5rem] border-2 shadow-2xl
        transition-all duration-500
        bg-gradient-to-br ${currentStyle}
        ${isRoot ? 'ring-8 ring-amber-500/20 scale-105' : ''}
        ${isSelectedForNav ? 'ring-4 ring-amber-400 border-amber-400' : ''}
        ${isViewRoot ? 'ring-4 ring-purple-500 border-purple-500 shadow-purple-500/30' : ''}
        ${isDragMode ? 'cursor-move' : ''}
      `}
    >
      {/* Anchor Icon */}
      {!isDragMode && (
          <button 
              onClick={handleAnchorClick}
              className={`absolute top-4 right-4 p-1.5 rounded-full backdrop-blur-md transition-all z-30 shadow-sm border
                  ${isViewRoot 
                      ? 'bg-purple-600 text-white border-purple-400 hover:bg-purple-700' 
                      : `bg-white/20 text-white border-white/30 hover:bg-white/40 ${isLight ? 'text-slate-500 hover:text-purple-600' : ''}`}
              `}
              title={isViewRoot ? "حذف فیلتر نمایش" : "تمرکز فقط روی این شاخه"}
          >
              {isViewRoot ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                  <span className="text-xl leading-none" style={{ fontFamily: 'sans-serif' }}>&#9875;</span>
              )}
          </button>
      )}

      <div className="absolute top-3 left-3 z-20">
        {person.imageUrl ? (
          <img src={person.imageUrl} alt={person.name} className="w-10 h-10 rounded-full border-2 border-white/50 object-cover shadow-md" />
        ) : (finalAvatarIndex > 0 && AvatarIcon) ? (
          <div className="w-10 h-10 rounded-full border-2 border-white/50 shadow-md flex items-center justify-center bg-slate-200 text-slate-500 overflow-hidden">
             {AvatarIcon("w-2/3 h-2/3")}
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full border-2 border-white/50 shadow-md flex items-center justify-center font-bold text-white text-xs" style={{ backgroundColor: bgColor }}>
             {person.name.charAt(0)}
          </div>
        )}
      </div>

      <div className={`absolute bottom-3 right-3 flex flex-col gap-2 z-20 ${isDragMode ? 'hidden' : ''}`}>
        <button 
          onClick={(e) => handleDetailsClick(e, person)}
          className="p-1.5 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full transition-all text-white border border-white/30 shadow-md active:scale-90 touch-manipulation"
          title="مشاهده جزئیات و ویرایش"
        >
          <svg className={`w-4 h-4 ${isLight ? 'text-slate-800' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
        <button 
          onClick={(e) => handleNavClick(e, person)}
          className="p-1.5 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full transition-all text-white border border-white/30 shadow-md active:scale-90 touch-manipulation"
          title="فوکوس و مسیریابی روی این فرد"
        >
          <svg className={`w-4 h-4 ${isLight ? 'text-slate-800' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </button>
      </div>

      <div className="absolute -top-3 flex flex-wrap justify-center gap-1.5 w-full pointer-events-none">
        {isShahid && <span className="bg-red-600 text-white text-[8px] px-2.5 py-1 rounded-full font-black border border-white shadow-sm">شهید</span>}
        {isDeceased && <span className="bg-slate-500 text-white text-[8px] px-2.5 py-1 rounded-full font-black border border-white shadow-sm">مرحوم</span>}
        {isSingle && <span className="bg-cyan-600 text-white text-[8px] px-2.5 py-1 rounded-full font-black border border-white shadow-sm">مجرد</span>}
      </div>

      <div className="mt-2"></div>
      
      <div 
        className={`font-black text-center leading-tight mb-1 flex flex-wrap items-center justify-center gap-1 px-8 ${isLight ? 'text-slate-900' : 'text-white'}`}
        style={{ fontSize: `${1.125 * fontSizeScale}rem` }}
      >
        <span>{person.name}</span>
        {person.title && <span className="opacity-90 font-bold whitespace-nowrap" style={{ fontSize: `${0.875 * fontSizeScale}rem` }}>({person.title})</span>}
      </div>
      
      {person.surname && (
        <div 
            className={`font-bold opacity-80 mb-3 ${isLight ? 'text-slate-600' : 'text-amber-200'}`}
            style={{ fontSize: `${0.75 * fontSizeScale}rem` }}
        >
          {person.surname}
        </div>
      )}

      {person.spouseName && (
        <div 
          onClick={(e) => {
            if (person.spouseId && !isDragMode) {
                e.stopPropagation();
                onSelectSpouse(person.spouseName!, person.spouseId);
            }
          }}
          className={`mt-1 text-[10px] py-1.5 px-3 rounded-xl border flex items-center gap-2 transition-all group 
             ${(person.spouseId && !isDragMode) ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default opacity-90'}
             ${isLight ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-white/10 border-white/20 text-amber-200'}
          `}
        >
          {person.spouseId && <div className="w-1.5 h-1.5 bg-amber-400 rounded-full group-hover:bg-white animate-pulse"></div>}
          <span className="font-bold truncate max-w-[140px]">{spouse1Label}: {person.spouseName}</span>
        </div>
      )}

      {person.secondSpouseName && (
        <div 
          onClick={(e) => {
            if (person.secondSpouseId && !isDragMode) {
                e.stopPropagation();
                onSelectSpouse(person.secondSpouseName!, person.secondSpouseId);
            }
          }}
          className={`mt-1 text-[10px] py-1.5 px-3 rounded-xl border flex items-center gap-2 transition-all group 
             ${(person.secondSpouseId && !isDragMode) ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default opacity-90'}
             ${isLight ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-white/10 border-white/20 text-amber-200'}
          `}
        >
          {person.secondSpouseId && <div className="w-1.5 h-1.5 bg-amber-400 rounded-full group-hover:bg-white animate-pulse"></div>}
          <span className="font-bold truncate max-w-[140px]">همسر دوم: {person.secondSpouseName}</span>
        </div>
      )}

      {person.sharedChildren && person.sharedChildren.length > 0 && (
         <div className={`mt-2 text-[9px] text-center leading-relaxed px-2 font-bold ${isLight ? 'text-slate-500' : 'text-amber-100/80'}`}>
           <span className="opacity-60 block text-[8px] mb-0.5">فرزندان (دیگر):</span>
           <div className="flex flex-wrap justify-center gap-1">
             {person.sharedChildren.map((child: string | SharedChild, idx: number) => {
               const name = typeof child === 'string' ? child : child.name;
               const id = typeof child === 'object' ? child.id : undefined;
               
               return (
                  <span 
                      key={idx} 
                      className={`inline-block ${(id || onSelectByName) && !isDragMode ? 'cursor-pointer hover:underline hover:text-amber-400' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isDragMode) {
                            if (id) {
                               onActivateNavigation({ id, name } as Person);
                            } else if (onSelectByName) {
                               onSelectByName(name);
                            }
                        }
                      }}
                  >
                    {name}{idx < (person.sharedChildren!.length - 1) ? '،' : ''}
                  </span>
               );
             })}
           </div>
         </div>
      )}

      {totalChildren > 0 && (
        <div className={`mt-3 flex items-center gap-1.5 text-[10px] px-4 py-1.5 rounded-full font-black ${isLight ? 'bg-slate-200 text-slate-600' : 'bg-white/20 text-white'}`}>
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
          {totalChildren} فرزند
        </div>
      )}

      <div 
        className="relative mt-3 group"
        onMouseEnter={() => { if (hasAncestors && !isDragMode) setShowBreadcrumbs(true); }}
        onMouseLeave={() => setShowBreadcrumbs(false)}
      >
        <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              if (hasAncestors && !isDragMode) setShowBreadcrumbs(!showBreadcrumbs); 
            }}
            className={`flex items-center gap-1 text-[10px] px-3 py-1.5 rounded-full font-black transition-all 
              ${isLight ? 'bg-slate-200 text-slate-600 hover:bg-slate-300' : 'bg-white/20 text-white hover:bg-white/30'}
              ${(!hasAncestors || isDragMode) ? 'cursor-default opacity-90' : 'cursor-pointer'}
            `}
        >
            {hasAncestors && (
              <span className="opacity-40 text-[8px]">▲</span>
            )}
            {depth === 0 ? 'بزرگ خاندان' : `نسل ${depth}`}
        </button>
        
        {hasAncestors && (
            <div className={`
              absolute bottom-[calc(100%+0.5rem)] left-1/2 -translate-x-1/2 w-max max-w-[200px] 
              p-3 rounded-xl shadow-2xl z-50 transition-all duration-300 transform origin-bottom
              ${showBreadcrumbs ? 'opacity-100 scale-100 translate-y-0 visible' : 'opacity-0 scale-95 translate-y-2 invisible'}
              bg-slate-800 text-white border border-slate-600
            `}>
              <div className="absolute top-full left-0 w-full h-4 bg-transparent"></div>
              <div className="flex flex-col gap-1 text-[10px] font-bold">
                  <div className="text-[9px] opacity-50 mb-1 border-b border-slate-600 pb-1 text-center">از پایین به بالا</div>
                  {reversedAncestors.map((anc, idx) => (
                      <div key={anc.id} className="flex items-center justify-center gap-1 whitespace-nowrap">
                          {idx > 0 && <span className="opacity-40 text-[8px]">▲</span>}
                          <button 
                              onClick={(e) => {
                                  e.stopPropagation();
                                  onActivateNavigation(anc);
                              }}
                              className="hover:text-amber-400 transition-colors w-full text-center py-0.5 cursor-pointer block"
                          >
                              {anc.name} {anc.title ? `(${anc.title})` : ''}
                          </button>
                      </div>
                  ))}
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
            </div>
        )}
      </div>

    </div>
  );
};

export default NodeCard;
