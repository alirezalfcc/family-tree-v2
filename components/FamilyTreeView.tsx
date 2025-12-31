
import React, { useMemo, useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Person, ViewMode } from '../types';
import NodeCard from './NodeCard';
import TreeSettingsPanel from './TreeSettingsPanel';
import { useAuthContext } from '../context/AuthContext';
import TreeLinksLayer from './TreeLinksLayer';
import { useTreeDragAndSelect } from '../hooks/useTreeDragAndSelect';

interface FamilyTreeViewProps {
  data: Person;
  onSelectDetails: (person: Person) => void;
  onActivateNav: (person: Person) => void;
  selectedPersonId?: string | null;
  navigatingPersonId?: string | null;
  onSelectByName?: (name: string) => void;
  focusKey?: number;
  viewMode: ViewMode;
  layoutConfig?: Record<string, any>; 
  onSaveLayout?: (layout: any) => void; 
  viewRootId?: string | null;
  onToggleViewRoot?: (id: string) => void;
}

interface NodeOffsets {
    [id: string]: { 
        x: number; 
        y: number; 
        elbow?: number; 
        entryX?: number; 
    };
}

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
  viewRootId,
  onToggleViewRoot
}) => {
  const { isAuthenticated } = useAuthContext();
  const transformWrapperRef = useRef<any>(null);
  const [isOverview, setIsOverview] = useState(false); 
  
  // تنظیمات دستی (Drag & Drop)
  const [customOffsets, setCustomOffsets] = useState<NodeOffsets>(layoutConfig || {});
  const [isDragMode, setIsDragMode] = useState(false);
  
  // تنظیمات عمومی
  const [fontSizeScale, setFontSizeScale] = useState(1);
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false); 

  // نود انتخاب شده برای ویرایش تنظیمات (مثل خط اتصال)
  const [configNodeId, setConfigNodeId] = useState<string | null>(null);
  
  // وضعیت دکمه بازنشانی
  const [resetConfirmMode, setResetConfirmMode] = useState(false);

  // لود کردن تنظیمات
  useEffect(() => {
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
    
    return tree(hierarchy);
  }, [hierarchy, viewMode, isSimple]);

  // Use the Drag Hook
  const { handleMouseDown, draggingNodeId, multiSelectedIds, setMultiSelectedIds } = useTreeDragAndSelect({
      isDragMode,
      viewMode,
      isAuthenticated,
      setIsDragMode,
      customOffsets,
      setCustomOffsets,
      setConfigNodeId,
      onSaveLayout,
      treeLayout,
      transformWrapperRef
  });

  // بازنشانی کامل به حالت استاندارد (بهینه)
  const handleResetCustomLayout = () => {
      if (!isAuthenticated) return alert("برای بازنشانی ساختار باید وارد حساب مدیریت شوید.");

      if (resetConfirmMode) {
          // بازگشت به لی‌اوت پیش‌فرض محاسباتی
          setCustomOffsets({});
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
          }
      }
  };

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

  // محاسبه لینک‌ها (والد-فرزند) و لینک‌های همسری (برای تب تلفیقی)
  const allLinks = useMemo(() => {
      const nodeMap = new Map<string, typeof nodes[0]>();
      nodes.forEach(n => nodeMap.set(n.data.id, n));
      
      const links: Array<{source: typeof nodes[0], target: typeof nodes[0], type: 'parent-child' | 'spouse'}> = [];
      
      // 1. Parent-Child Links
      nodes.forEach(node => {
          if (node.children) {
              const children = (node.data.children || []) as Person[];
              children.forEach(childData => {
                  const targetNode = nodeMap.get(childData.id);
                  if (targetNode) {
                      links.push({ source: node, target: targetNode, type: 'parent-child' });
                  }
              });
          }
      });

      // 2. Spouse Links (Cross-Connectors)
      const processedSpousePairs = new Set<string>();
      
      nodes.forEach(node => {
          const spouseId = node.data.spouseId;
          const secondSpouseId = node.data.secondSpouseId;
          
          const checkAndAddSpouseLink = (sId: string | undefined) => {
              if (sId && nodeMap.has(sId)) {
                  const targetNode = nodeMap.get(sId)!;
                  // جلوگیری از تکرار (A-B و B-A)
                  const pairId = [node.data.id, sId].sort().join('-');
                  if (!processedSpousePairs.has(pairId)) {
                      processedSpousePairs.add(pairId);
                      links.push({ source: node, target: targetNode, type: 'spouse' });
                  }
              }
          };

          checkAndAddSpouseLink(spouseId);
          checkAndAddSpouseLink(secondSpouseId);
      });

      return links;
  }, [nodes]);

  const CANVAS_CENTER_X = 5000;
  const CANVAS_CENTER_Y = 1500; 
  const ZOOM_THRESHOLD = 0.65;

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
    if (!transformWrapperRef.current || nodes.length === 0) return;

    // 1. محاسبه محدوده کل نودها (Bounding Box)
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    nodes.forEach(node => {
        if (node.x < minX) minX = node.x;
        if (node.x > maxX) maxX = node.x;
        if (node.y < minY) minY = node.y;
        if (node.y > maxY) maxY = node.y;
    });

    // اضافه کردن حاشیه (Padding) بر اساس نوع نمایش
    // نودها ابعاد دارند، پس باید فضای خالی اضافه کنیم تا لبه‌ها بریده نشوند
    const hPadding = isSimple ? 100 : 200;
    const vPadding = isSimple ? 100 : 200;
    
    minX -= hPadding;
    maxX += hPadding;
    minY -= vPadding;
    maxY += vPadding;

    const boundsWidth = maxX - minX;
    const boundsHeight = maxY - minY;

    // 2. دریافت ابعاد صفحه نمایش
    // اگر کامپوننت رپ‌کننده در دسترس نیست از ویندو استفاده می‌کنیم
    const wrapperNode = document.querySelector('.react-transform-wrapper');
    const wrapperWidth = wrapperNode ? wrapperNode.clientWidth : window.innerWidth;
    const wrapperHeight = wrapperNode ? wrapperNode.clientHeight : window.innerHeight;

    // 3. محاسبه ضریب بزرگنمایی (Scale)
    // باید کل محدوده در صفحه جا شود
    const scaleX = wrapperWidth / boundsWidth;
    const scaleY = wrapperHeight / boundsHeight;
    const scale = Math.min(scaleX, scaleY, 1); // زوم بیشتر از 1 (بزرگتر از اندازه واقعی) نشود

    // 4. محاسبه نقطه مرکز
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // 5. اعمال تنظیمات به react-zoom-pan-pinch
    // فرمول: موقعیت جدید = (نصف صفحه) - (مرکز محتوا * ضریب)
    // محتوا در مختصات (CANVAS_CENTER_X, CANVAS_CENTER_Y) قرار دارد
    const newX = (wrapperWidth / 2) - ((CANVAS_CENTER_X + centerX) * scale);
    const newY = (wrapperHeight / 2) - ((CANVAS_CENTER_Y + centerY) * scale);

    transformWrapperRef.current.setTransform(newX, newY, scale, 1000, 'easeOutCubic');
  };

  const findSpouseAndFocus = (spouseName: string, spouseId?: string) => {
    if (spouseId) {
        const spouse = nodes.find(n => n.data.id === spouseId);
        if (spouse) {
            onActivateNav(spouse.data);
            return;
        } else {
            onActivateNav({ id: spouseId, name: spouseName } as Person);
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
            setMultiSelectedIds(new Set()); 
        }} 
      >
        
        {viewMode === 'vertical_tree' && (
            <TreeSettingsPanel 
                isOpen={isSettingsPanelOpen}
                onToggle={() => setIsSettingsPanelOpen(!isSettingsPanelOpen)}
                configNodeId={configNodeId}
                configNodeName={configNodeName}
                isAuthenticated={isAuthenticated}
                fontSizeScale={fontSizeScale}
                onFontSizeChange={handleFontSizeChange}
                elbowValue={currentElbowValue as number}
                onElbowChange={handleNodeElbowChange}
                entryXValue={currentEntryXValue as number}
                onEntryXChange={handleNodeEntryXChange}
                isDragMode={isDragMode}
                onToggleDrag={(val) => setIsDragMode(val)}
                onResetLayout={handleResetCustomLayout}
                resetConfirmMode={resetConfirmMode}
            />
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
                  <TreeLinksLayer 
                      links={allLinks} 
                      viewMode={viewMode}
                      isSimple={isSimple}
                      isOverview={isOverview}
                      configNodeId={configNodeId}
                      customOffsets={customOffsets}
                  />
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
                     {isConfigSelected && viewMode === 'vertical_tree' && (
                        <div className="absolute -inset-4 border-2 border-indigo-500 rounded-[3rem] opacity-50 pointer-events-none animate-pulse"></div>
                     )}
                     
                     {isMultiSelected && viewMode === 'vertical_tree' && (
                        <div className="absolute -inset-2 border-4 border-orange-400 rounded-[2.8rem] opacity-80 pointer-events-none"></div>
                     )}

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
                      viewRootId={viewRootId}
                      onToggleViewRoot={onToggleViewRoot}
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
          title="نمای کلی ساختار (تمام صفحه)"
        >
           <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
        </button>

        <button
          onClick={() => handleFocus()}
          className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 bg-amber-600 hover:bg-amber-700 text-white rounded-full shadow-xl transition-all hover:scale-110 active:scale-90 border-2 border-amber-400 animate-bounce-slow"
          title="تمرکز بر ریشه"
        >
          <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 01 1 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default FamilyTreeView;
