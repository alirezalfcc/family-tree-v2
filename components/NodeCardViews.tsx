
import React, { useState } from 'react';
import { Person, SharedChild } from '../types';
import { stringToColor, stringToAvatarIndex, DefaultAvatars } from './PersonCommon';

// --- Simple View ---
interface SimpleNodeProps {
    person: Person;
    fontSizeScale: number;
    isSelectedForNav?: boolean;
    isViewRoot?: boolean;
    isLinkedFamilyRoot?: boolean;
    isDragMode?: boolean;
    isShahid?: boolean;
    isDeceased?: boolean;
    onDetails: (e: React.MouseEvent) => void;
    onAnchor: (e: React.MouseEvent) => void;
}
export const SimpleNodeView: React.FC<SimpleNodeProps> = ({ 
    person, fontSizeScale, isSelectedForNav, isViewRoot, isLinkedFamilyRoot, isDragMode, isShahid, isDeceased, onDetails, onAnchor 
}) => {
    return (
        <div
          id={`node-${person.id}`}
          onClick={onDetails}
          className={`tree-node-card relative
             flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105
             px-2 py-1 bg-white
             ${isSelectedForNav ? 'ring-2 ring-amber-400 rounded-lg' : ''}
             ${isViewRoot ? 'ring-4 ring-purple-500 rounded-lg shadow-lg shadow-purple-200' : ''}
             ${isLinkedFamilyRoot ? 'border-2 border-emerald-400' : ''}
             ${isDragMode ? 'pointer-events-none' : ''} 
          `}
        >
          {isLinkedFamilyRoot && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-100 text-emerald-700 text-[7px] px-1 rounded border border-emerald-200 whitespace-nowrap z-20">
                  {person.originalTabTitle}
              </div>
          )}

          <div 
            className="font-bold text-black text-sm whitespace-nowrap leading-tight text-center border-b-2 border-black pb-0.5"
            style={{ fontSize: `${0.875 * fontSizeScale}rem` }}
          >
             {person.name}
          </div>
          {person.surname && (
            <div 
                className="text-[9px] text-gray-700 font-medium mt-0.5"
                style={{ fontSize: `${0.6 * fontSizeScale}rem` }}
            >
                {person.surname}
            </div>
          )}
          
          <div className="flex gap-1 mt-0.5">
              {isShahid && <span className="text-[8px] text-red-600 font-bold">(شهید)</span>}
              {isDeceased && <span className="text-[8px] text-gray-400">†</span>}
          </div>
          
          {!isDragMode && (
              <button 
                  onClick={onAnchor}
                  className={`absolute -top-4 -right-4 p-1 rounded-full shadow-sm border transition-all z-10 no-export ${isViewRoot ? 'bg-purple-600 text-white border-purple-700' : 'bg-white text-slate-400 border-slate-200 hover:text-purple-500'}`}
                  title={isViewRoot ? "حذف فیلتر نمایش" : "نمایش فقط این شاخه"}
              >
                  <span className="text-sm font-bold leading-none" style={{ fontFamily: 'sans-serif' }}>&#9875;</span>
              </button>
          )}
        </div>
    );
};

// --- Overview View ---
interface OverviewNodeProps {
    person: Person;
    styleClass: string;
    isRoot?: boolean;
    isSelectedForNav?: boolean;
    isViewRoot?: boolean;
    isLinkedFamilyRoot?: boolean;
    isDragMode?: boolean;
    isShahid?: boolean;
    isDeceased?: boolean;
    isLight?: boolean;
    onExpand?: () => void;
}
export const OverviewNodeView: React.FC<OverviewNodeProps> = ({ 
    person, styleClass, isRoot, isSelectedForNav, isViewRoot, isLinkedFamilyRoot, isDragMode, isShahid, isDeceased, isLight, onExpand 
}) => {
    return (
      <div 
        id={`node-${person.id}`}
        className={`tree-node-card
          flex items-center justify-center cursor-pointer
          w-20 h-20 rounded-full border-2 shadow-lg
          transition-all duration-300 hover:scale-110 hover:z-50
          bg-gradient-to-br ${styleClass}
          ${isRoot ? 'w-28 h-28 ring-4 ring-amber-500/30' : ''}
          ${isSelectedForNav ? 'ring-2 ring-amber-400 border-amber-400' : ''}
          ${isViewRoot ? 'ring-4 ring-purple-500 border-purple-500 scale-110' : ''}
          ${isLinkedFamilyRoot ? 'ring-4 ring-emerald-400 border-emerald-400' : ''}
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
};

// --- Rich View ---
interface RichNodeProps {
    person: Person;
    styleClass: string;
    isRoot?: boolean;
    isSelectedForNav?: boolean;
    isViewRoot?: boolean;
    isLinkedFamilyRoot?: boolean;
    isDragMode?: boolean;
    isShahid?: boolean;
    isDeceased?: boolean;
    isSingle?: boolean;
    isLight?: boolean;
    fontSizeScale: number;
    depth: number;
    ancestors: Person[];
    onDetails: (e: React.MouseEvent) => void;
    onNav: (e: React.MouseEvent, p: Person) => void;
    onAnchor: (e: React.MouseEvent) => void;
    onSelectSpouse: (name: string, id?: string) => void;
    onSelectByName?: (name: string) => void;
}
export const RichNodeView: React.FC<RichNodeProps> = ({ 
    person, styleClass, isRoot, isSelectedForNav, isViewRoot, isLinkedFamilyRoot, isDragMode, isShahid, isDeceased, isSingle, isLight, fontSizeScale, depth, ancestors, onDetails, onNav, onAnchor, onSelectSpouse, onSelectByName 
}) => {
    const [showBreadcrumbs, setShowBreadcrumbs] = useState(false);
    const reversedAncestors = [...ancestors].reverse();
    const hasAncestors = reversedAncestors.length > 0;
    
    const finalAvatarIndex = (person.avatarIndex !== undefined && person.avatarIndex !== null) ? person.avatarIndex : stringToAvatarIndex(person.name, 5);
    const AvatarIcon = DefaultAvatars[finalAvatarIndex];
    const bgColor = stringToColor(person.name);
    const hasTwoSpouses = person.spouseName && person.secondSpouseName;
    const totalChildren = (person.children?.length || 0) + (person.sharedChildren?.length || 0);

    return (
        <div
          id={`node-${person.id}`}
          className={`tree-node-card
            relative flex flex-col items-center justify-center
            w-[240px] min-h-[160px] p-6 rounded-[2.5rem] border-2 shadow-2xl
            transition-all duration-500
            bg-gradient-to-br ${styleClass}
            ${isRoot ? 'ring-8 ring-amber-500/20 scale-105' : ''}
            ${isSelectedForNav ? 'ring-4 ring-amber-400 border-amber-400' : ''}
            ${isViewRoot ? 'ring-4 ring-purple-500 border-purple-500 shadow-purple-500/30' : ''}
            ${isLinkedFamilyRoot ? 'ring-4 ring-emerald-400 border-emerald-400' : ''}
            ${isDragMode ? 'cursor-move' : ''}
          `}
        >
          {/* Anchor Icon */}
          {!isDragMode && (
              <button 
                  onClick={onAnchor}
                  className={`absolute top-4 right-4 p-1.5 rounded-full backdrop-blur-md transition-all z-30 shadow-sm border no-export
                      ${isViewRoot ? 'bg-purple-600 text-white border-purple-400 hover:bg-purple-700' : `bg-white/20 text-white border-white/30 hover:bg-white/40 ${isLight ? 'text-slate-500 hover:text-purple-600' : ''}`}
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
    
          {/* Linked Family Badge */}
          {isLinkedFamilyRoot && (
             <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg border border-emerald-400 z-40">
                 {person.originalTabTitle}
             </div>
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
              onClick={onDetails}
              className="p-1.5 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full transition-all text-white border border-white/30 shadow-md active:scale-90 touch-manipulation"
              title="مشاهده جزئیات و ویرایش"
            >
              <svg className={`w-4 h-4 ${isLight ? 'text-slate-800' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
            <button 
              onClick={(e) => onNav(e, person)}
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
              <span className="font-bold truncate max-w-[140px]">{hasTwoSpouses ? "همسر اول" : "همسر"}: {person.spouseName}</span>
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
                                   onNav(e, { id, name } as Person);
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
                                      onNav(e, anc);
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
