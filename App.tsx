
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import FamilyTreeView from './components/FamilyTreeView';
import PersonDetails from './components/PersonDetails';
import Header from './components/Header';
import FloatingNav from './components/FloatingNav';
import TabNavigation from './components/TabNavigation';
import StatisticsDashboard from './components/StatisticsDashboard';
import RelationshipCalculator from './components/RelationshipCalculator';
import AuthModal from './components/AuthModal';
import TabRelationshipMap from './components/TabRelationshipMap';
import { Person, ViewMode, ListFilter } from './types';
import { 
  flattenTree, 
  ExtendedPerson, 
  filterTree,
  findNodeById,
  getFullIdentityLabel
} from './utils/genealogy';
import { exportToSVG } from './utils/svgExporter';

// Hooks & Context
import { useTreenetApi } from './hooks/useTreenetApi';
import { useAuth } from './hooks/useAuth';
import { useFamilyData } from './hooks/useFamilyData';
import AuthContext from './context/AuthContext';

const APP_VERSION = "v6.1 Final Polish";

const Preloader = () => (
  <div className="flex flex-col items-center justify-center h-screen bg-[#f8f5f2] text-slate-800 space-y-6 relative overflow-hidden">
    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] opacity-10"></div>
    
    <div className="relative w-32 h-32 z-10">
       <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
       <div className="absolute inset-0 border-4 border-amber-500 rounded-full border-t-transparent animate-spin"></div>
       <div className="absolute inset-0 flex items-center justify-center text-amber-600">
          <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19.5v-15c0 0-6 3-6 9 0 4 6 6 6 6z" />
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19.5v-15c0 0 6 3 6 9 0 4-6 6-6 6z" />
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l-3-3" />
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l3-3" />
          </svg>
       </div>
    </div>
    
    <div className="text-center z-10">
        <h1 className="text-3xl font-black tracking-tight text-slate-800 mb-2 font-sans">Family Tree</h1>
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">By Alireza Labbaf</p>
    </div>
    
    <div className="absolute bottom-10 text-[10px] text-slate-400 font-mono font-bold">
        © {new Date().getFullYear()} All Rights Reserved
    </div>
  </div>
);

const App: React.FC = () => {
  // --- Custom Hooks ---
  const api = useTreenetApi();
  // We pass a refresh callback to Auth to trigger data re-fetch if needed
  const auth = useAuth(api, () => data.fetchData(auth.currentUser));
  const data = useFamilyData(api, auth);

  // --- UI States ---
  const [viewMode, setViewMode] = useState<ViewMode>('rich_tree'); 
  const [listFilter, setListFilter] = useState<ListFilter>('all');
  const [viewRootId, setViewRootId] = useState<string | null>(null); 
  const [searchGlobal, setSearchGlobal] = useState(false);
  
  const [navigatingPerson, setNavigatingPerson] = useState<ExtendedPerson | null>(null);
  const [focusKey, setFocusKey] = useState(0);
  const [detailedPerson, setDetailedPerson] = useState<Person | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Race condition fix state
  const [pendingPersonId, setPendingPersonId] = useState<string | null>(null);

  const [slideshowActive, setSlideshowActive] = useState(false);
  const [slideDelay, setSlideDelay] = useState(3); 

  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showMap, setShowMap] = useState(false);
  
  // --- Computed UI Values ---
  const canEditActiveTab = useMemo(() => {
      if (!auth.isAuthenticated || !auth.currentUser) return false;
      if (auth.currentUser.role === 'admin') return true;
      if (!data.activeTab || data.activeTab.id === 'dummy') return false;
      return data.activeTab.owner === auth.currentUser.username || data.activeTab.sharedWith?.includes(auth.currentUser.username);
  }, [auth.isAuthenticated, auth.currentUser, data.activeTab]);

  const filteredTreeData = useMemo(() => {
     let baseData = data.activeTab.data;
     if (viewRootId) {
         const foundNode = findNodeById(baseData, viewRootId);
         if (foundNode) baseData = foundNode;
     }
     if (listFilter === 'all') return baseData;
     const filtered = filterTree(baseData, listFilter);
     return filtered || baseData; 
  }, [data.activeTab.data, listFilter, viewRootId]);

  const activeMembersExtended = useMemo(() => {
    return flattenTree(data.activeTab.data);
  }, [data.activeTab.data]);

  const allTabsMembers = useMemo(() => {
    let targetTabs = data.visibleTabs;
    if (!searchGlobal && data.activeTab.linkedTabIds) {
        targetTabs = data.visibleTabs.filter(t => t.id === data.activeTab.id || data.activeTab.linkedTabIds?.includes(t.id));
    } else if (!searchGlobal) {
        targetTabs = [data.activeTab];
    }

    return targetTabs.flatMap(tab => {
        const members = flattenTree(tab.data);
        return members.map(m => ({...m, tabId: tab.id, tabTitle: tab.title}));
    });
  }, [data.visibleTabs, searchGlobal, data.activeTab]);

  const searchScopeMembers = useMemo(() => {
      let targetTabs = [data.activeTab];
      if (data.activeTab.linkedTabIds) {
          const linked = data.visibleTabs.filter(t => data.activeTab.linkedTabIds?.includes(t.id));
          targetTabs = [...targetTabs, ...linked];
      }
      return targetTabs.flatMap(tab => {
          const members = flattenTree(tab.data);
          return members.map(m => ({...m, tabId: tab.id, tabTitle: tab.title}));
      });
  }, [data.visibleTabs, data.activeTab]);

  const searchResults = useMemo(() => {
    if (!searchTerm || searchTerm.trim().length < 2) return [];
    const term = searchTerm.trim().toLowerCase();
    return allTabsMembers.filter((person: any) => {
        const fullName = `${person.name} ${person.surname || ''}`.toLowerCase();
        return fullName.includes(term) || person.name.toLowerCase().includes(term);
    }).slice(0, 20);
  }, [searchTerm, allTabsMembers]);

  // --- Navigation Handlers ---
  const handlePersonNavigation = useCallback((person: ExtendedPerson | Person, keepSlideshow = false) => {
    let targetTabId = data.activeTabId;
    let personId = person.id;

    if ((person as any).tabId && (person as any).tabId !== data.activeTabId) {
        targetTabId = (person as any).tabId;
    } else {
        const foundTab = data.visibleTabs.find(t => {
             const members = flattenTree(t.data);
             return members.some(m => m.id === person.id);
        });
        if (foundTab) targetTabId = foundTab.id;
    }

    if (targetTabId !== data.activeTabId) {
        setPendingPersonId(personId); // Set flag to find person after tab switch
        data.setActiveTabId(targetTabId);
    } else {
        const extended = activeMembersExtended.find(m => m.id === personId) || null;
        setNavigatingPerson(extended);
        setFocusKey(prev => prev + 1);
    }

    if (!keepSlideshow) setSlideshowActive(false);
  }, [activeMembersExtended, data.tabs, data.activeTabId, data.visibleTabs]);

  // Effect to handle pending navigation after tab switch (fixes race condition)
  useEffect(() => {
      if (pendingPersonId && data.activeTabId && data.isLoaded) {
          const extended = activeMembersExtended.find(m => m.id === pendingPersonId) || null;
          if (extended) {
              setNavigatingPerson(extended);
              setFocusKey(prev => prev + 1);
          }
          setPendingPersonId(null);
      }
  }, [data.activeTabId, pendingPersonId, activeMembersExtended, data.isLoaded]);

  const handleNavigate = useCallback((direction: 'parent' | 'next-sibling' | 'prev-sibling' | 'first-child') => {
    if (!navigatingPerson) return;
    let targetId: string | null = null;
    switch (direction) {
      case 'parent': targetId = navigatingPerson.parentId; break;
      case 'first-child': targetId = navigatingPerson.children?.[0]?.id || null; break;
      case 'next-sibling':
      case 'prev-sibling':
        const siblings = activeMembersExtended.filter(m => m.parentId === navigatingPerson.parentId);
        if (siblings.length > 1) {
          const currentIndex = siblings.findIndex(m => m.id === navigatingPerson.id);
          const nextIndex = direction === 'next-sibling' 
            ? (currentIndex + 1) % siblings.length 
            : (currentIndex - 1 + siblings.length) % siblings.length;
          targetId = siblings[nextIndex].id;
        }
        break;
    }
    if (targetId) {
      const target = activeMembersExtended.find(m => m.id === targetId);
      if (target) handlePersonNavigation(target);
    }
  }, [navigatingPerson, activeMembersExtended, handlePersonNavigation]);

  useEffect(() => {
    let interval: any;
    if (slideshowActive) {
      interval = setInterval(() => {
        const members = searchGlobal ? allTabsMembers : activeMembersExtended;
        if (members.length === 0) return;
        
        let nextIndex = 0;
        if (navigatingPerson) {
            const currentIndex = members.findIndex(m => m.id === navigatingPerson.id);
            if (currentIndex !== -1) {
                nextIndex = (currentIndex + 1) % members.length;
            }
        }
        
        handlePersonNavigation(members[nextIndex], true);
      }, slideDelay * 1000);
    }
    return () => clearInterval(interval);
  }, [slideshowActive, slideDelay, activeMembersExtended, allTabsMembers, searchGlobal, navigatingPerson, handlePersonNavigation]);

  const handleToggleViewRoot = (id: string) => {
      if (viewRootId === id) setViewRootId(null);
      else setViewRootId(id);
  };

  const headerTitle = data.activeTab.title.startsWith('خاندان') ? `شجره نامه ${data.activeTab.title}` : `شجره نامه خاندان ${data.activeTab.title}`;

  if (!data.isLoaded) return <Preloader />;

  return (
    <AuthContext.Provider value={auth}>
      <div className="flex flex-col h-screen w-screen overflow-hidden text-right bg-[#f8f5f2]" dir="rtl" onClick={() => { setDetailedPerson(null); setShowFilterMenu(false); }}>
        {api.isSaving && <div className="fixed top-0 left-0 w-full h-1 bg-amber-200 z-[100]"><div className="h-full bg-amber-600 animate-pulse w-full"></div></div>}
        
        {api.isOfflineMode && (
            <div className="bg-amber-100 text-amber-800 text-xs py-2 px-4 flex justify-between items-center border-b border-amber-200">
              <span>⚠️ حالت آفلاین (پیش‌نمایش): {api.offlineReason}</span>
              <button onClick={() => data.fetchData(auth.currentUser)} className="bg-amber-500 text-white px-2 py-1 rounded">تلاش مجدد</button>
            </div>
        )}

        <Header 
          searchTerm={searchTerm} setSearchTerm={setSearchTerm} searchResults={searchResults}
          onSelectPerson={handlePersonNavigation}
          onExport={() => {}} 
          onImport={(e) => {}} 
          onExportImage={() => {}} onExportSVG={() => exportToSVG('family-tree-content', 'tree')}
          onOpenSettings={() => setShowSettings(true)}
          onOpenStats={() => setShowStats(true)}
          onOpenCalculator={() => setShowCalculator(true)}
          onOpenMap={() => setShowMap(true)}
          searchGlobal={searchGlobal} setSearchGlobal={setSearchGlobal}
          title={headerTitle}
        />

        <div className="bg-white border-b border-slate-200 flex flex-col md:flex-row justify-between items-stretch gap-1 md:gap-2 z-40 relative shadow-sm">
          
          {/* Tab Navigation Container with Proper Overflow Handling */}
          <div className="flex-1 min-w-0 w-full md:w-auto order-2 md:order-1 relative">
              <TabNavigation 
                  tabs={data.visibleTabs} activeTabId={data.activeTabId} 
                  onSelectTab={data.setActiveTabId} 
                  onAddTab={data.handleAddTab}
                  onRenameTab={data.handleRenameTab}
                  onDeleteTab={data.handleDeleteTab}
                  onTogglePrivacy={data.handleTogglePrivacy}
                  onTransferTab={data.handleTransferTab}
                  onCopyTab={data.handleCopyTabToUser}
                  onUpdateLinkedTabs={data.handleUpdateLinkedTabs}
                  onShareTab={data.handleShareTab}
                  onUnshareTab={data.handleUnshareTab}
              />
          </div>
          
          {/* Controls (Filters/View Mode) - Prevent Shrinking */}
          <div className="flex items-center gap-2 p-1.5 order-1 md:order-2 shrink-0 border-b md:border-b-0 border-slate-100 bg-white/50 justify-between md:justify-end">
              <div className="relative">
                  <button 
                      onClick={(e) => { e.stopPropagation(); setShowFilterMenu(!showFilterMenu); }} 
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all border ${showFilterMenu ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-100 hover:border-slate-300'} text-slate-600 text-xs font-bold whitespace-nowrap`}
                  >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                      فیلترها
                      {(listFilter !== 'all' || viewRootId) && <span className="w-2 h-2 rounded-full bg-amber-500"></span>}
                  </button>

                  {showFilterMenu && (
                      <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95 origin-top-right" onClick={e => e.stopPropagation()}>
                          <div className="space-y-1 mb-3">
                              <p className="text-[10px] text-slate-400 font-bold mb-1 px-1">جنسیت</p>
                              <button onClick={() => setListFilter('all')} className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${listFilter === 'all' ? 'bg-slate-100 text-slate-800' : 'hover:bg-slate-50 text-slate-600'}`}>
                                  <span>نمایش همه</span>
                                  {listFilter === 'all' && <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                              </button>
                              <button onClick={() => setListFilter('male')} className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${listFilter === 'male' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-600'}`}>
                                  <span>فقط مردان</span>
                                  {listFilter === 'male' && <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                              </button>
                              <button onClick={() => setListFilter('female')} className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${listFilter === 'female' ? 'bg-pink-50 text-pink-700' : 'hover:bg-slate-50 text-slate-600'}`}>
                                  <span>فقط زنان</span>
                                  {listFilter === 'female' && <svg className="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                              </button>
                          </div>
                          
                          {viewRootId && (
                              <div className="border-t border-slate-100 pt-2 space-y-1">
                                  <p className="text-[10px] text-slate-400 font-bold mb-1 px-1">محدوده نمایش</p>
                                  <button 
                                      onClick={() => { setViewRootId(null); setShowFilterMenu(false); }}
                                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold hover:bg-red-50 text-red-600 transition-all mt-1"
                                  >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                      <span>حذف فیلتر شاخه (نمایش کامل)</span>
                                  </button>
                              </div>
                          )}
                      </div>
                  )}
              </div>
              
              <div className="w-px h-6 bg-slate-200 mx-1"></div>

              <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
                  <button onClick={() => setViewMode('rich_tree')} className={`p-2 rounded-lg transition-all ${viewMode === 'rich_tree' ? 'bg-white shadow text-amber-600' : 'text-slate-400 hover:text-amber-500'}`} title="نمایش کارتی">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  </button>
                  <button onClick={() => setViewMode('simple_tree')} className={`p-2 rounded-lg transition-all ${viewMode === 'simple_tree' ? 'bg-white shadow text-amber-600' : 'text-slate-400 hover:text-amber-500'}`} title="نمایش چارت سازمانی">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
                  </button>
                  <button onClick={() => setViewMode('vertical_tree')} className={`p-2 rounded-lg transition-all ${viewMode === 'vertical_tree' ? 'bg-white shadow text-amber-600' : 'text-slate-400 hover:text-amber-500'}`} title="نمایش عمودی">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                  </button>
              </div>
          </div>
        </div>

        <main className="flex-1 relative overflow-hidden mb-8">
          <div className="w-full h-full relative" key={`${viewMode}-${listFilter}-${viewRootId}`}>
              <FamilyTreeView 
                  data={filteredTreeData} 
                  onSelectDetails={setDetailedPerson} 
                  onActivateNav={handlePersonNavigation}
                  selectedPersonId={detailedPerson?.id}
                  navigatingPersonId={navigatingPerson?.id}
                  focusKey={focusKey}
                  viewMode={viewMode}
                  layoutConfig={data.layoutConfig[listFilter] || {}} 
                  onSaveLayout={(layout) => data.handleSaveLayout(layout, listFilter)}
                  viewRootId={viewRootId}
                  onToggleViewRoot={handleToggleViewRoot}
              />
              <div className="floating-nav">
                  <FloatingNav 
                      person={navigatingPerson}
                      onClose={() => setNavigatingPerson(null)}
                      onNavigate={handleNavigate}
                      isSidebarOpen={!!detailedPerson}
                      slideshowActive={slideshowActive}
                      onToggleSlideshow={() => setSlideshowActive(!slideshowActive)}
                      slideDelay={slideDelay}
                      onDelayChange={setSlideDelay}
                  />
              </div>
          </div>

          <PersonDetails 
            person={detailedPerson} 
            allMembers={activeMembersExtended}
            searchScopeMembers={searchScopeMembers} 
            onClose={() => setDetailedPerson(null)} 
            onUpdate={data.handleUpdatePerson}
            onAddChild={data.handleAddChild}
            onAddExistingChild={data.handleAddExistingChild}
            onDelete={data.handleDeletePerson}
            onMoveSubtree={data.handleMoveSubtree}
            onExtractSubtree={(id) => data.handleExtractSubtree(id, canEditActiveTab)}
            onLoginSuccess={() => setShowSettings(true)}
            canEdit={canEditActiveTab} 
          />
          
          {showStats && <StatisticsDashboard members={activeMembersExtended} onClose={() => setShowStats(false)} title={headerTitle} />}
          {showCalculator && <RelationshipCalculator allMembers={activeMembersExtended} onClose={() => setShowCalculator(false)} onSelectPersonForGraph={handlePersonNavigation} />}
          {showMap && <TabRelationshipMap tabs={data.visibleTabs} onClose={() => setShowMap(false)} onSelectTab={data.setActiveTabId} onCreateMergedTab={data.handleCreateMergedTab} />}
        </main>

        <AuthModal 
          isOpen={showSettings} 
          onClose={() => setShowSettings(false)}
          onBackup={data.handleBackup}
          onRestore={data.handleRestore}
          marqueeText={data.marqueeText}
          onUpdateMarquee={data.handleUpdateMarquee}
          recycledTabs={data.recycledTabs}
          onRestoreTab={data.handleRestoreTab}
          onPermanentDeleteTab={data.handlePermanentDeleteTab}
          onDeleteUser={(u) => auth.handleDeleteUser(u, data.deleteUserData)}
        />

        <footer className="fixed bottom-0 left-0 w-full bg-black text-white z-[60] border-t border-slate-800">
          <div className="flex items-center justify-between h-8 px-2">
              <div className="flex-1 overflow-hidden relative mx-2">
                  <div className="animate-marquee whitespace-nowrap text-[11px] font-bold text-amber-400">{data.marqueeText}</div>
              </div>
              <div className="text-[9px] text-slate-500 flex items-center gap-2 whitespace-nowrap pl-2">
                  {auth.currentUser && (
                      <span className="text-white font-bold hidden sm:inline-block">{auth.currentUser.username}</span>
                  )}
                  {/* Status Circle: Green for Current User */}
                  <span className={`w-2 h-2 rounded-full ${auth.currentUser ? 'bg-green-500' : (!api.isOfflineMode ? 'bg-emerald-500' : 'bg-red-500')}`}></span>
                  <span>{APP_VERSION}</span>
              </div>
          </div>
        </footer>
      </div>
    </AuthContext.Provider>
  );
};

export default App;
