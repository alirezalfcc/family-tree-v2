
import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Person, ViewMode } from '../types';
import NodeCard from './NodeCard';

interface FamilyTreeViewProps {
  data: Person;
  onSelectDetails: (person: Person) => void;
  onActivateNav: (person: Person) => void;
  selectedPersonId?: string | null;
  navigatingPersonId?: string | null;
  onSelectByName?: (name: string) => void;
  focusKey?: number;
  viewMode: ViewMode;
  layoutConfig?: Record<string, any>; // برای دریافت چیدمان ذخیره شده
  onSaveLayout?: (layout: any) => void; // برای ذخیره چیدمان
  isAuthenticated?: boolean; // برای بررسی دسترسی
}

// اینترفیس برای ذخیره آفست‌های دستی و تنظیمات خطوط هر نود
interface NodeOffsets {
    [id: string]: { 
        x: number; 
        y: number; 
        elbow?: number; // مقدار اختصاصی زانو (ارتفاع خط افقی)
        entryX?: number; // مقدار جابجایی خط عمودی اتصال به نود (چپ و راست)
    };
}

// چیدمان پیش‌فرض خالی (محاسبه توسط الگوریتم)
const DEFAULT_VERTICAL_LAYOUT: NodeOffsets = {};

const FamilyTreeView: React.FC<FamilyTreeViewProps> = ({ 
  data, 
  onSelectDetails, 
  onActivateNav, 
  selectedPersonId, 
  navigatingPersonId,
  onSelectByName,
  focusKey = 0,
  viewMode,
  layoutConfig = {},
  onSaveLayout,
  isAuthenticated = false
}) => {
  const transformWrapperRef = useRef<any>(null);
  const [isOverview, setIsOverview] = useState(false); 
  
  // تنظیمات دستی (Drag & Drop)
  const [customOffsets, setCustomOffsets] = useState<NodeOffsets>(layoutConfig || {});
  const [isDragMode, setIsDragMode] = useState(false);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  
  // انتخاب چندگانه
  const [multiSelectedIds, setMultiSelectedIds] = useState<Set<string>>(new Set());

  // تنظیمات عمومی
  const [fontSizeScale, setFontSizeScale] = useState(1);
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false); // New state for panel visibility

  // نود انتخاب شده برای ویرایش تنظیمات (مثل خط اتصال)
  const [configNodeId, setConfigNodeId] = useState<string | null>(null);
  
  // وضعیت دکمه بازنشانی
  const [resetConfirmMode, setResetConfirmMode] = useState(false);

  // رفرنس‌ها برای مدیریت درگ بدون مشکل کلوژر
  const customOffsetsRef = useRef<NodeOffsets>(customOffsets);
  const dragState = useRef<{
      startX: number;
      startY: number;
      initialOffsets: NodeOffsets;
      draggedIds: string[]; // لیست آی‌دی‌هایی که در حال جابجایی هستند
  } | null>(null);

  // همگام‌سازی رفرنس با استیت
  useEffect(() => {
    customOffsetsRef.current = customOffsets;
  }, [customOffsets]);

  // لود کردن تنظیمات
  useEffect(() => {
    // اولویت با کانفیگ دریافتی از App (دیتابیس) است که حالا بر اساس فیلتر (all, male, female) ارسال می‌شود
    if (layoutConfig) {
        setCustomOffsets(layoutConfig);
    } 

    const savedFont = localStorage.getItem('tree_font_size');
    if (savedFont) {
        setFontSizeScale(Number(savedFont));
    }
    
    // Auto-open settings panel on desktop, close on mobile
    if (window.innerWidth > 768) {
        setIsSettingsPanelOpen(true);
    }
  }, [layoutConfig]);

  // تغییر سایز فونت
  const handleFontSizeChange = (val: number) => {
      setFontSizeScale(val);
      localStorage.setItem('tree_font_size', String(val));
  };

  // تغییر موقعیت زانو (ارتفاع خط افقی)
  const handleNodeElbowChange = (val: number) => {
      if (!configNodeId) return;
      if (!isAuthenticated) return alert("برای تغییر ساختار باید وارد حساب مدیریت شوید.");
      
      const currentOffset = customOffsets[configNodeId] || { x: 0, y: 0 };
      const newOffsets = {
          ...customOffsets,
          [configNodeId]: { ...currentOffset, elbow: val }
      };
      
      setCustomOffsets(newOffsets);
      if(onSaveLayout) onSaveLayout(newOffsets);
  };

  // تغییر موقعیت اتصال عمودی (جابجایی چپ و راست خط ورودی)
  const handleNodeEntryXChange = (val: number) => {
      if (!configNodeId) return;
      if (!isAuthenticated) return alert("برای تغییر ساختار باید وارد حساب مدیریت شوید.");

      const currentOffset = customOffsets[configNodeId] || { x: 0, y: 0 };
      const newOffsets = {
          ...customOffsets,
          [configNodeId]: { ...currentOffset, entryX: val }
      };
      
      setCustomOffsets(newOffsets);
      if(onSaveLayout) onSaveLayout(newOffsets);
  };

  // بازنشانی کامل به حالت استاندارد (بهینه)
  const handleResetCustomLayout = () => {
      if (!isAuthenticated) return alert("برای بازنشانی ساختار باید وارد حساب مدیریت شوید.");

      if (resetConfirmMode) {
          // بازگشت به لی‌اوت پیش‌فرض محاسباتی
          setCustomOffsets({});
          customOffsetsRef.current = {};
          if (onSaveLayout) onSaveLayout({});
          
          setMultiSelectedIds(new Set());
          setFontSizeScale(1);
          localStorage.removeItem('tree_font_size');
          setResetConfirmMode(false);
          setConfigNodeId(null);
      } else {
          setResetConfirmMode(true);
          setTimeout(() => setResetConfirmMode(false), 3000);
      }
  };
  
  // انتخاب نود برای تنظیمات هنگام کلیک
  const handleNodeClickForConfig = (e: React.MouseEvent, person: Person) => {
      e.stopPropagation(); 
      if (viewMode === 'vertical_tree') {
          // اگر دکمه کنترل نگه داشته شده باشد، تنظیمات تکی باز نمی‌شود تا تداخل با انتخاب چندگانه ایجاد نشود
          if (!e.ctrlKey && !e.shiftKey) {
             setConfigNodeId(person.id);
             // در موبایل اگر کاربر روی نود کلیک کرد و پنل بسته بود، پیشنهاد باز کردن پنل داده شود (اختیاری)
             // فعلاً برای شلوغ نشدن UI خودکار باز نمی‌کنیم
          }
      }
  };

  const isSimple = viewMode === 'simple_tree' || viewMode === 'vertical_tree';
  
  const hierarchy = useMemo(() => d3.hierarchy(data), [data]);
  
  const treeLayout = useMemo(() => {
    const tree = d3.tree<Person>();
    
    if (viewMode === 'vertical_tree') {
       // مقادیر استاندارد برای نمای عمودی (مشابه چارت)
       const vGap = 200; 
       const hGap = 280; 
       tree.nodeSize([hGap, vGap]);
    } else {
       const defaultW = isSimple ? 140 : 280;
       const defaultH = isSimple ? 150 : 300;
       tree.nodeSize([defaultW, defaultH]);
    }
    
    const root = tree(hierarchy);
    return root;
  }, [hierarchy, viewMode, isSimple]);

  // محاسبه موقعیت نودها
  const nodes = useMemo(() => {
      const descendants = treeLayout.descendants();
      if (viewMode === 'vertical_tree') {
          return descendants.map(d => {
              const offset = customOffsets[d.data.id] || { x: 0, y: 0 };
              return {
                  ...d,
                  x: d.x + offset.x,
                  y: d.y + offset.y
              };
          });
      }
      return descendants;
  }, [treeLayout, customOffsets, viewMode]);

  // محاسبه لینک‌ها
  const links = useMemo(() => {
      const nodeMap = new Map(nodes.map(n => [n.data.id, n]));
      
      const computedLinks: Array<{source: typeof nodes[0], target: typeof nodes[0]}> = [];
      nodes.forEach(node => {
          if (node.children) {
              const children = (node.data.children || []) as Person[];
              children.forEach(childData => {
                  const targetNode = nodeMap.get(childData.id);
                  if (targetNode) {
                      computedLinks.push({ source: node, target: targetNode });
                  }
              });
          }
      });
      return computedLinks;
  }, [nodes]);

  const CANVAS_CENTER_X = 5000;
  const CANVAS_CENTER_Y = 1500; 
  const ZOOM_THRESHOLD = 0.65;

  // --- Drag & Drop & Multi-Select ---
  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
      if (!isDragMode || viewMode !== 'vertical_tree') {
          // حتی اگر درگ خاموش باشد، انتخاب تکی برای تنظیمات انجام شود
          setConfigNodeId(nodeId);
          return;
      }
      
      // بررسی احراز هویت برای درگ کردن
      if (!isAuthenticated) {
          alert("برای تغییر چیدمان باید وارد حساب مدیریت شوید.");
          setIsDragMode(false);
          return;
      }
      
      e.preventDefault();
      e.stopPropagation();

      // مدیریت انتخاب چندگانه با Ctrl یا Shift
      const isMultiSelectModifier = e.ctrlKey || e.shiftKey;
      let newSelectedIds = new Set<string>(multiSelectedIds);

      if (isMultiSelectModifier) {
          if (newSelectedIds.has(nodeId)) {
              newSelectedIds.delete(nodeId);
          } else {
              newSelectedIds.add(nodeId);
          }
          setMultiSelectedIds(newSelectedIds);
          // وقتی چندگانه انتخاب می‌کنیم، تنظیمات تکی را می‌بندیم
          setConfigNodeId(null);
      } else {
          // اگر روی آیتمی کلیک شد که در لیست انتخاب شده‌ها نیست، انتخاب‌ها ریست شود
          // مگر اینکه آیتم از قبل انتخاب شده باشد (برای درگ کردن گروهی)
          if (!newSelectedIds.has(nodeId)) {
              newSelectedIds.clear();
              newSelectedIds.add(nodeId);
              setMultiSelectedIds(newSelectedIds);
              setConfigNodeId(nodeId);
          } else {
              // اگر روی یکی از اعضای گروه کلیک شد، تنظیمات همان را نشان بده
              setConfigNodeId(nodeId);
          }
      }

      // --- CALCULATE SUBTREE (Include descendants in drag) ---
      const allTreeNodes = treeLayout.descendants() as d3.HierarchyPointNode<Person>[];
      // Explicitly type the Map to prevent inference as Map<any, any> which causes node to be unknown
      const nodeMap = new Map<string, d3.HierarchyPointNode<Person>>();
      allTreeNodes.forEach(n => nodeMap.set(n.data.id, n));
      
      const affectedIds = new Set<string>();

      newSelectedIds.forEach((selectedId: string) => {
          const node = nodeMap.get(selectedId);
          if (node) {
              // اضافه کردن نود و تمام زیرمجموعه‌هایش به لیست جابجایی
              affectedIds.add(node.data.id);
              node.descendants().forEach(d => {
                  const p = d.data as Person;
                  affectedIds.add(p.id);
              });
          }
      });

      const draggedIds: string[] = Array.from(affectedIds);
      if (draggedIds.length === 0) return;

      const initialOffsets: NodeOffsets = {};
      // ذخیره آفست اولیه برای همه نودهای درگیر
      draggedIds.forEach(id => {
          const existing = customOffsetsRef.current[id] || { x: 0, y: 0 };
          initialOffsets[id] = { ...existing };
      });

      dragState.current = {
          startX: e.clientX,
          startY: e.clientY,
          initialOffsets: initialOffsets,
          draggedIds: draggedIds
      };

      setDraggingNodeId(nodeId); // فقط برای استایل دهی
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
      if (!dragState.current) return;
      e.preventDefault();

      const { startX, startY, initialOffsets, draggedIds } = dragState.current;
      
      let scale = 1;
      if (transformWrapperRef.current) {
          const { state } = transformWrapperRef.current;
          if (state && state.scale) scale = state.scale;
      }

      const totalDx = (e.clientX - startX) / scale;
      const totalDy = (e.clientY - startY) / scale;

      const nextOffsets = { ...customOffsetsRef.current };

      // اعمال تغییر مکان برای همه نودهای انتخاب شده
      draggedIds.forEach(id => {
          const init = initialOffsets[id];
          if (init) {
            nextOffsets[id] = {
                ...init, // حفظ elbow و entryX
                x: init.x + totalDx,
                y: init.y + totalDy,
            };
          }
      });

      setCustomOffsets(nextOffsets);
  }, []);

  const handleMouseUp = useCallback(() => {
      if (dragState.current) {
          dragState.current = null;
          setDraggingNodeId(null);
          // ذخیره نهایی در دیتابیس
          if (onSaveLayout) {
              onSaveLayout(customOffsetsRef.current);
          }
      }
  }, [onSaveLayout]);

  useEffect(() => {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
  }, [handleMouseMove, handleMouseUp]);


  const handleFocus = (id?: string, scale: number = 0.85) => {
    setTimeout(() => {
      if (transformWrapperRef.current) {
        const { zoomToElement } = transformWrapperRef.current;
        const targetId = id || `node-container-${data.id}`;
        const element = document.getElementById(targetId);
        if (element) {
          zoomToElement(element, scale, 800, 'easeOutCubic');
        }
      }
    }, 50);
  };

  const handleFitToView = () => {
    if (transformWrapperRef.current) {
      const rootElement = document.getElementById(`node-container-${data.id}`);
      if (rootElement) {
        transformWrapperRef.current.zoomToElement(rootElement, isSimple ? 0.8 : 0.4, 1000, 'easeOutCubic');
      }
    }
  };

  const findSpouseAndFocus = (spouseName: string, spouseId?: string) => {
    if (spouseId) {
        const spouse = nodes.find(n => n.data.id === spouseId);
        if (spouse) {
            onActivateNav(spouse.data);
            return;
        }
    }
    const spouse = nodes.find(n => {
      const fullName = `${n.data.name} ${n.data.surname || ''}`.trim();
      return fullName === spouseName || spouseName.includes(fullName);
    });
    if (spouse) {
      onActivateNav(spouse.data);
    } else {
      if(spouseId) alert(`همسر با شناسه مشخص شده در درخت بارگذاری شده یافت نشد.`);
    }
  };

  useEffect(() => {
    if (navigatingPersonId) {
      handleFocus(`node-container-${navigatingPersonId}`);
    }
  }, [navigatingPersonId, focusKey]);

  const configNodeName = useMemo(() => {
      if (!configNodeId) return null;
      const node = nodes.find(n => n.data.id === configNodeId);
      return node ? node.data.name : null;
  }, [configNodeId, nodes]);

  const currentElbowValue = configNodeId && customOffsets[configNodeId]?.elbow !== undefined 
      ? customOffsets[configNodeId].elbow 
      : 0.5;

  const currentEntryXValue = configNodeId && customOffsets[configNodeId]?.entryX !== undefined
      ? customOffsets[configNodeId].entryX
      : 0;

  return (
    <div className="w-full h-full relative bg-[#f8f5f2] flex flex-col">
      <div 
        className={`flex-1 m-2 sm:m-4 rounded-[2rem] border-[4px] sm:border-[8px] border-white shadow-[0_0_30px_rgba(0,0,0,0.05)] overflow-hidden relative ${isSimple ? 'bg-white' : 'bg-[#fdfcfb]'}`} 
        onClick={() => {
            setConfigNodeId(null);
            setMultiSelectedIds(new Set()); // لغو انتخاب چندگانه با کلیک روی صفحه خالی
        }} 
      >
        
        {/* پنل تنظیمات پیشرفته - فقط در حالت عمودی */}
        {viewMode === 'vertical_tree' && (
            <div className={`
                 absolute top-2 right-2 md:top-6 md:right-6 z-40 
                 bg-white/95 backdrop-blur shadow-xl border border-slate-200 
                 rounded-2xl flex flex-col transition-all duration-300
                 ${isSettingsPanelOpen ? 'w-64 md:w-72 p-4 max-h-[85vh] overflow-y-auto' : 'w-10 h-10 p-0 items-center justify-center overflow-hidden'}
                 animate-in fade-in slide-in-from-right-4
            `} onClick={(e) => e.stopPropagation()}>
                
                {/* دکمه باز/بسته کردن پنل */}
                <button 
                   onClick={() => setIsSettingsPanelOpen(!isSettingsPanelOpen)}
                   className={`
                      ${isSettingsPanelOpen ? 'absolute top-3 left-3' : 'w-full h-full flex items-center justify-center'}
                      text-slate-500 hover:text-amber-500 transition-colors
                   `}
                   title={isSettingsPanelOpen ? "بستن پنل" : "باز کردن تنظیمات"}
                >
                   {isSettingsPanelOpen ? (
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                   ) : (
                       <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                   )}
                </button>

                {isSettingsPanelOpen && (
                    <>
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
                            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                            <span className="text-sm font-bold text-slate-800">تنظیمات ساختار</span>
                        </div>
                        
                        <div className="space-y-4">
                            {/* تنظیم سایز فونت */}
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <label className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                                    <span>اندازه نوشته‌ها</span>
                                    <span className="text-amber-600">{Math.round(fontSizeScale * 100)}%</span>
                                </label>
                                <input 
                                    type="range" min="0.5" max="3" step="0.1"
                                    value={fontSizeScale}
                                    onChange={(e) => handleFontSizeChange(Number(e.target.value))}
                                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                />
                            </div>

                            {/* تنظیمات اختصاصی نود انتخاب شده */}
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
                                            value={currentElbowValue as number}
                                            onChange={(e) => handleNodeElbowChange(Number(e.target.value))}
                                            className="w-14 px-1 py-0.5 text-[10px] font-bold border border-slate-200 rounded text-center bg-white disabled:opacity-50 outline-none focus:border-indigo-500 font-mono text-indigo-600"
                                            dir="ltr"
                                        />
                                    </div>
                                    <input 
                                        type="range" min="-2" max="2" step="0.001"
                                        disabled={!configNodeId || !isAuthenticated}
                                        value={currentElbowValue as number}
                                        onChange={(e) => handleNodeElbowChange(Number(e.target.value))}
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
                                            value={currentEntryXValue as number}
                                            onChange={(e) => handleNodeEntryXChange(Number(e.target.value))}
                                            className="w-14 px-1 py-0.5 text-[10px] font-bold border border-slate-200 rounded text-center bg-white disabled:opacity-50 outline-none focus:border-pink-500 font-mono text-pink-600"
                                            dir="ltr"
                                        />
                                    </div>
                                    <input 
                                        type="range" min="-150" max="150" step="1"
                                        disabled={!configNodeId || !isAuthenticated}
                                        value={currentEntryXValue as number}
                                        onChange={(e) => handleNodeEntryXChange(Number(e.target.value))}
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
                                        if (!e.target.checked) setIsDragMode(false);
                                        else if (!isAuthenticated) alert("برای تغییر چیدمان باید وارد حساب مدیریت شوید.");
                                        else setIsDragMode(true);
                                    }} className="sr-only peer" />
                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                                </div>
                            </label>

                            {isAuthenticated && Object.keys(customOffsets).length > 0 && (
                                <button 
                                    onClick={handleResetCustomLayout}
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
        )}

        <TransformWrapper
          ref={transformWrapperRef}
          initialScale={isSimple ? 0.9 : 0.85} 
          minScale={0.1}
          maxScale={3}
          limitToBounds={false}
          centerOnInit={false}
          panning={{ disabled: draggingNodeId !== null }} 
          onTransformed={(ref) => {
             const scale = ref.state.scale;
             if (scale < ZOOM_THRESHOLD && !isOverview) {
               setIsOverview(true);
             } else if (scale >= ZOOM_THRESHOLD && isOverview) {
               setIsOverview(false);
             }
          }}
          onInit={(ref) => {
             setTimeout(() => {
               const rootElement = document.getElementById(`node-container-${data.id}`);
               if (rootElement) {
                 ref.zoomToElement(rootElement, isSimple ? 0.9 : 0.85, 1000, 'easeOutCubic');
               }
             }, 100);
          }}
        >
          <TransformComponent wrapperClass="!w-full !h-full grab-cursor" contentClass="!w-full !h-full grab-cursor">
            <div id="family-tree-content" className="relative" style={{ width: '10000px', height: '10000px' }}>
              <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
                <g transform={`translate(${CANVAS_CENTER_X}, ${CANVAS_CENTER_Y})`}>
                  {links.map((link, i) => {
                    const sX = link.source.x;
                    const sY = link.source.y;
                    const tX = link.target.x;
                    const tY = link.target.y;

                    let pathData;
                    if (viewMode === 'vertical_tree') {
                        // تنظیمات اختصاصی لینک
                        const targetId = link.target.data.id;
                        const elbowRatio = customOffsets[targetId]?.elbow ?? 0.5;
                        const entryX = customOffsets[targetId]?.entryX ?? 0;
                        
                        // محاسبه نقاط
                        const midY = sY + (tY - sY) * elbowRatio;
                        const finalTX = tX + entryX; 

                        pathData = `M${sX},${sY} V${midY} H${finalTX} V${tY}`;
                    } else if (viewMode === 'simple_tree') {
                        const parentStub = 50;
                        pathData = `M${sX},${sY} V${sY + parentStub} H${tX} V${tY}`;
                    } else {
                        pathData = `M${sX},${sY} C${sX},${(sY + tY) / 2} ${tX},${(sY + tY) / 2} ${tX},${tY}`;
                    }
                    
                    const isSelectedLine = configNodeId === link.target.data.id;

                    return (
                      <path 
                        key={i} 
                        d={pathData} 
                        fill="none" 
                        stroke={isSelectedLine ? "#6366f1" : (isSimple ? "#94a3b8" : (isOverview ? "#cbd5e1" : "#e2e8f0"))} 
                        strokeWidth={isSelectedLine ? "4" : (isSimple ? "2" : (isOverview ? "6" : "4"))} 
                        className={`transition-all duration-300 ${isSelectedLine ? 'z-50' : ''}`}
                        strokeDasharray={(!isSimple && !isOverview) ? "8,8" : "0"} 
                      />
                    );
                  })}
                </g>
              </svg>

              <div className="absolute top-0 left-0 w-full h-full" style={{ transform: `translate(${CANVAS_CENTER_X}px, ${CANVAS_CENTER_Y}px)` }}>
                {nodes.map((node) => {
                  const ancestors: Person[] = [];
                  let current: d3.HierarchyPointNode<Person> | null = node.parent;
                  while(current) {
                      ancestors.unshift(current.data);
                      current = current.parent;
                  }
                  
                  const nX = node.x;
                  const nY = node.y;
                  const isDragging = draggingNodeId === node.data.id;
                  const isConfigSelected = configNodeId === node.data.id;
                  const isMultiSelected = multiSelectedIds.has(node.data.id);

                  return (
                  <div
                    id={`node-container-${node.data.id}`}
                    key={node.data.id}
                    onMouseDown={(e) => handleMouseDown(e, node.data.id)}
                    onClick={(e) => handleNodeClickForConfig(e, node.data)}
                    style={{
                      position: 'absolute',
                      left: `${nX}px`,
                      top: `${nY}px`,
                      transform: 'translate(-50%, -50%)',
                      zIndex: (isDragging || selectedPersonId === node.data.id || navigatingPersonId === node.data.id) ? 100 : 10,
                      transition: isDragging ? 'none' : 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)', 
                      cursor: isDragMode ? 'move' : 'default'
                    }}
                    className={isDragMode ? 'hover:brightness-110' : ''}
                  >
                     {/* نشانگر حالت انتخاب برای تنظیمات */}
                     {isConfigSelected && viewMode === 'vertical_tree' && (
                        <div className="absolute -inset-4 border-2 border-indigo-500 rounded-[3rem] opacity-50 pointer-events-none animate-pulse"></div>
                     )}
                     
                     {/* نشانگر انتخاب چندگانه */}
                     {isMultiSelected && viewMode === 'vertical_tree' && (
                        <div className="absolute -inset-2 border-4 border-orange-400 rounded-[2.8rem] opacity-80 pointer-events-none"></div>
                     )}

                     {/* نشانگر حالت درگ */}
                    {isDragMode && (
                        <div className={`absolute -inset-2 border-2 border-dashed rounded-[2.8rem] pointer-events-none transition-colors ${isDragging ? 'border-amber-500 bg-amber-500/10' : 'border-slate-300 hover:border-amber-300'}`}></div>
                    )}

                    <NodeCard 
                      person={node.data} 
                      isRoot={node.depth === 0} 
                      depth={node.depth} 
                      onSelectDetails={onSelectDetails}
                      onActivateNavigation={onActivateNav}
                      onSelectSpouse={findSpouseAndFocus}
                      isSelectedForNav={navigatingPersonId === node.data.id}
                      isOverview={isOverview}
                      onExpand={() => handleFocus(node.data.id)}
                      onSelectByName={onSelectByName} 
                      ancestors={ancestors}
                      viewMode={viewMode}
                      isDragMode={isDragMode}
                      fontSizeScale={viewMode === 'vertical_tree' ? fontSizeScale : 1}
                    />
                  </div>
                )})}
              </div>
            </div>
          </TransformComponent>
        </TransformWrapper>
      </div>

      <div className="fixed bottom-24 left-4 md:bottom-12 md:left-6 flex flex-col gap-2 z-30 pointer-events-auto">
        <button
          onClick={() => handleFitToView()}
          className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-all hover:scale-110 active:scale-90 border border-indigo-500"
          title="نمای کلی ساختار"
        >
           <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
        </button>

        <button
          onClick={() => handleFocus()}
          className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 bg-amber-600 hover:bg-amber-700 text-white rounded-full shadow-xl transition-all hover:scale-110 active:scale-90 border-2 border-amber-400 animate-bounce-slow"
          title="تمرکز بر ریشه"
        >
          <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default FamilyTreeView;
