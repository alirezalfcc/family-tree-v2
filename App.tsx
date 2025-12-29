
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import FamilyTreeView from './components/FamilyTreeView';
import PersonDetails from './components/PersonDetails';
import Header from './components/Header';
import FloatingNav from './components/FloatingNav';
import TabNavigation from './components/TabNavigation';
import StatisticsDashboard from './components/StatisticsDashboard';
import RelationshipCalculator from './components/RelationshipCalculator';
import { familyData as initialData, aliMashallahData } from './data';
import { Person, FamilyTab, ViewMode, ListFilter } from './types';
import { 
  flattenTree, 
  ExtendedPerson, 
  updatePersonInTree, 
  addChildToTree, 
  movePersonInTree, 
  removePersonFromTree,
  filterTree
} from './utils/genealogy';
import { exportToSVG } from './utils/svgExporter';

// نسخه برنامه جهت اطمینان از آپدیت بودن بیلد
const APP_VERSION = "v2.3";

const App: React.FC = () => {
  // State for Tabs
  const [tabs, setTabs] = useState<FamilyTab[]>([
    { id: 'default', title: 'خاندان امین عرب', data: initialData },
    { id: 'alimashallah', title: 'خاندان علی ماشاءالله', data: aliMashallahData }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('default');

  // View States
  const [viewMode, setViewMode] = useState<ViewMode>('rich_tree'); 
  const [listFilter, setListFilter] = useState<ListFilter>('all');
  const [searchGlobal, setSearchGlobal] = useState(false);

  // General States
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false); 
  const [offlineReason, setOfflineReason] = useState<string>('');
  
  const [navigatingPerson, setNavigatingPerson] = useState<ExtendedPerson | null>(null);
  const [focusKey, setFocusKey] = useState(0);

  const [detailedPerson, setDetailedPerson] = useState<Person | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Slideshow States
  const [slideshowActive, setSlideshowActive] = useState(false);
  const [slideDelay, setSlideDelay] = useState(3); 

  // Settings & Auth & Stats & Calculator
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [adminCreds, setAdminCreds] = useState({ user: 'admin123', pass: 'ce245b118' });
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  // New Credentials State
  const [changePassMode, setChangePassMode] = useState(false);
  const [newUser, setNewUser] = useState('');
  const [newPass, setNewPass] = useState('');
  
  const [marqueeText, setMarqueeText] = useState("بسم الله الرحمن الرحیم  **************  ✨ به شجره نامه خاندان امین عرب خوش آمدید ✨  **************  راهنما: برای مشاهده جزئیات و ویرایش اطلاعات، روی کارت شخص کلیک کنید.  **************  جهت ثبت اطلاعات جدید با شماره 989196600545+ (علیرضا لباف) تماس بگیرید.");
  const [editingMarquee, setEditingMarquee] = useState('');

  // Layout Configuration (Custom Offsets)
  const [layoutConfig, setLayoutConfig] = useState<Record<string, any>>({ all: {}, male: {}, female: {} });

  // محاسبات
  const activeTab = useMemo(() => tabs.find(t => t.id === activeTabId) || tabs[0], [tabs, activeTabId]);
  
  const filteredTreeData = useMemo(() => {
     if (listFilter === 'all') return activeTab.data;
     const filtered = filterTree(activeTab.data, listFilter);
     return filtered || activeTab.data; 
  }, [activeTab.data, listFilter]);

  const activeMembersExtended = useMemo(() => {
    return flattenTree(activeTab.data);
  }, [activeTab.data]);

  const allTabsMembers = useMemo(() => {
    if (!searchGlobal) return [];
    let all: any[] = [];
    tabs.forEach(tab => {
        const members = flattenTree(tab.data);
        const labeledMembers = members.map(m => ({...m, tabId: tab.id, tabTitle: tab.title}));
        all = [...all, ...labeledMembers];
    });
    return all;
  }, [tabs, searchGlobal]);

  const searchResults = useMemo(() => {
    if (!searchTerm || searchTerm.trim().length < 2) return [];
    
    const term = searchTerm.trim().toLowerCase();
    const source = searchGlobal ? allTabsMembers : activeMembersExtended;

    return source.filter((person: any) => {
        const fullName = `${person.name} ${person.surname || ''}`.toLowerCase();
        return fullName.includes(term) || person.name.toLowerCase().includes(term);
    }).slice(0, 20);
  }, [searchTerm, searchGlobal, allTabsMembers, activeMembersExtended]);

  // --- توابع ارتباط با API ---
  const apiCall = async (path: string, method: 'GET' | 'POST' | 'PUT' = 'GET', body?: any) => {
      try {
          const options: RequestInit = {
              method,
              headers: { 'Content-Type': 'application/json' }
          };
          if (body) options.body = JSON.stringify(body);
          
          const response = await fetch(`/api/proxy?path=${encodeURIComponent(path)}`, options);
          
          if (response.status === 404) {
             throw new Error("API_NOT_FOUND");
          }

          if (!response.ok) {
              // تلاش برای خواندن متن خطا
              let errorMsg = `API Error: ${response.status}`;
              try {
                  const contentType = response.headers.get("content-type");
                  if (contentType && contentType.indexOf("application/json") !== -1) {
                      const errJson = await response.json();
                      if (errJson.detail) errorMsg = errJson.detail;
                      else if (errJson.error) errorMsg = errJson.error;
                  } else {
                      // اگر HTML برگشت یعنی احتمالا صفحه 404 پیش‌فرض است
                      const text = await response.text();
                      if (text.includes("<!DOCTYPE html>")) {
                          throw new Error("API_NOT_FOUND");
                      }
                  }
              } catch(e) {}
              throw new Error(errorMsg);
          }
          return await response.json();
      } catch (error) {
          throw error;
      }
  };

  const loadLocalData = () => {
      const savedData = localStorage.getItem('family_tree_data_v4');
      if (savedData) setTabs(JSON.parse(savedData));
      
      const savedCreds = localStorage.getItem('admin_creds');
      if (savedCreds) setAdminCreds(JSON.parse(savedCreds));

      const savedMarquee = localStorage.getItem('marquee_text');
      if (savedMarquee) setMarqueeText(savedMarquee);
      
      const savedMultiLayout = localStorage.getItem('tree_layout_multi');
      if (savedMultiLayout) setLayoutConfig(JSON.parse(savedMultiLayout));
  };

  const fetchData = async () => {
      try {
          setIsOfflineMode(false);
          const data = await apiCall(''); 
          
          if (data) {
              setOfflineReason('');
              let loadedTabs: FamilyTab[] = [];
              if (data.familyTabs) {
                  loadedTabs = data.familyTabs;
              } else if (data.familyTree) {
                  loadedTabs = [{ id: 'default', title: 'خاندان امین عرب', data: data.familyTree }];
              } else {
                  loadedTabs = [
                      { id: 'default', title: 'خاندان امین عرب', data: initialData },
                      { id: 'alimashallah', title: 'خاندان علی ماشاءالله', data: aliMashallahData }
                  ];
              }

              if (!loadedTabs.some(t => t.id === 'alimashallah')) {
                  loadedTabs.push({ id: 'alimashallah', title: 'خاندان علی ماشاءالله', data: aliMashallahData });
              }

              setTabs(loadedTabs);
              setActiveTabId(prev => loadedTabs.find((t: any) => t.id === prev) ? prev : loadedTabs[0].id);

              if (data.settings) {
                  setAdminCreds({ user: data.settings.user, pass: data.settings.pass });
                  setMarqueeText(data.settings.marquee || marqueeText);
              }
              
              if (data.layoutConfig) {
                  if (data.layoutConfig.all || data.layoutConfig.male || data.layoutConfig.female) {
                      setLayoutConfig(data.layoutConfig);
                  } else {
                      setLayoutConfig({ all: data.layoutConfig, male: {}, female: {} });
                  }
              }
          } else {
              console.warn("Database is empty or invalid structure.");
              loadLocalData(); 
          }
      } catch (error: any) {
          console.warn("Using Local Storage due to API error:", error);
          setIsOfflineMode(true);
          
          let reason = error.message;
          if (error.message.includes("Missing FIREBASE") || error.message.includes("Server Configuration Error")) {
              reason = "تنظیمات کلادفلر (Environment Variables) انجام نشده است.";
          } else if (error.message === "API_NOT_FOUND" || error.message.includes("404")) {
              // پیام دقیق‌تر برای کاربر
              reason = "فایل‌های سرور (پوشه functions) در کلادفلر پیدا نشد. لطفا مطمئن شوید فایل functions/api/proxy.js در گیت وجود دارد.";
          } else if (error.message.includes("401") || error.message.includes("permission_denied") || error.message.includes("Unauthorized")) {
              reason = "رمز دیتابیس (Secret) اشتباه است یا دسترسی مسدود شده است.";
          } else if (error.message.includes("Failed to fetch")) {
              reason = "خطای شبکه یا DNS. (آیا روی Localhost هستید؟)";
          }
          setOfflineReason(reason);

          loadLocalData();
      } finally {
          setIsLoaded(true);
      }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- ذخیره‌سازی اطلاعات ---
  
  const saveTabsToCloud = useCallback((newTabs: FamilyTab[]) => {
    setTabs(newTabs);
    localStorage.setItem('family_tree_data_v4', JSON.stringify(newTabs));

    if (!isOfflineMode) {
      setIsSaving(true);
      apiCall('familyTabs', 'PUT', newTabs)
        .then(() => setTimeout(() => setIsSaving(false), 500))
        .catch((err) => {
          setIsSaving(false);
          if (err.message === "API_NOT_FOUND") {
             console.info("Cloud save failed, offline mode.");
             setIsOfflineMode(true);
          } else {
             console.error("Save failed", err);
          }
        });
    }
  }, [isOfflineMode]);

  const handleSaveLayout = useCallback((newLayout: any) => {
      setLayoutConfig(prev => {
          const updatedFullConfig = { ...prev, [listFilter]: newLayout };
          localStorage.setItem('tree_layout_multi', JSON.stringify(updatedFullConfig));
          
          if (!isOfflineMode) {
              apiCall('layoutConfig', 'PUT', updatedFullConfig)
                .catch(err => console.error("Layout Save Failed", err));
          }
          return updatedFullConfig;
      });
  }, [isOfflineMode, listFilter]);

  // --- توابع مدیریتی ---
  
  const handleAddTab = (title: string) => {
    const newTab: FamilyTab = {
        id: `tab-${Date.now()}`,
        title,
        data: {
            id: `root-${Date.now()}`,
            name: title,
            children: []
        }
    };
    const newTabs = [...tabs, newTab];
    saveTabsToCloud(newTabs);
    setActiveTabId(newTab.id);
  };

  const handleRenameTab = (id: string, newTitle: string) => {
    const newTabs = tabs.map(t => t.id === id ? { ...t, title: newTitle } : t);
    saveTabsToCloud(newTabs);
  };

  const handleDeleteTab = (id: string) => {
    const newTabs = tabs.filter(t => t.id !== id);
    saveTabsToCloud(newTabs);
    if (activeTabId === id) setActiveTabId(newTabs[0]?.id || '');
  };

  const handleUpdateActiveTree = (newData: Person) => {
    const newTabs = tabs.map(t => t.id === activeTabId ? { ...t, data: newData } : t);
    saveTabsToCloud(newTabs);
  };

  const handleUpdatePerson = useCallback((id: string, fields: Partial<Person>) => {
    const updatedTree = updatePersonInTree(activeTab.data, id, fields);
    handleUpdateActiveTree(updatedTree);
  }, [activeTab.data, tabs]);

  const handleAddChild = useCallback((parentId: string, name: string) => {
    const updatedTree = addChildToTree(activeTab.data, parentId, name);
    handleUpdateActiveTree(updatedTree);
  }, [activeTab.data, tabs]);

  const handleAddExistingChild = useCallback((parentId: string, childId: string) => {
    try {
      const updatedTree = movePersonInTree(activeTab.data, parentId, childId);
      handleUpdateActiveTree(updatedTree);
    } catch (err: any) { alert(err.message); }
  }, [activeTab.data, tabs]);
  
  const handleMoveSubtree = useCallback((nodeId: string, newParentId: string) => {
      if (nodeId === activeTab.data.id) return alert("امکان جابجایی ریشه درخت وجود ندارد.");
      try {
          const updatedTree = movePersonInTree(activeTab.data, newParentId, nodeId);
          handleUpdateActiveTree(updatedTree);
          setDetailedPerson(null);
          alert("انتقال شاخه با موفقیت انجام شد");
      } catch (err: any) { alert(err.message); }
  }, [activeTab.data, tabs]);

  const handleDeletePerson = useCallback((id: string) => {
     if (id === activeTab.data.id) return alert("امکان حذف ریشه درخت وجود ندارد.");
     const updatedTree = removePersonFromTree(activeTab.data, id);
     if (updatedTree) {
        handleUpdateActiveTree(updatedTree);
        setDetailedPerson(null);
        if (navigatingPerson?.id === id) setNavigatingPerson(null);
     }
  }, [activeTab.data, tabs, navigatingPerson]);

  // --- جستجو و ناوبری ---
  const handlePersonNavigation = useCallback((person: ExtendedPerson | Person, keepSlideshow = false) => {
    if (searchGlobal && (person as any).tabId && (person as any).tabId !== activeTabId) {
        setActiveTabId((person as any).tabId);
        setTimeout(() => {
             const extended = flattenTree(tabs.find(t => t.id === (person as any).tabId)?.data || initialData).find(m => m.id === person.id) || null;
             setNavigatingPerson(extended);
             setFocusKey(prev => prev + 1);
        }, 100);
        return;
    }

    const extended = activeMembersExtended.find(m => m.id === person.id) || null;
    setNavigatingPerson(extended);
    if (!keepSlideshow) setSlideshowActive(false);
    setFocusKey(prev => prev + 1);
  }, [activeMembersExtended, searchGlobal, tabs, activeTabId]);

  const handleSelectByName = useCallback((name: string) => {
    const target = activeMembersExtended.find(m => m.name.trim() === name.trim());
    if (target) {
        handlePersonNavigation(target);
    } else {
        alert(`فردی با نام "${name}" در این خاندان یافت نشد.`);
    }
  }, [activeMembersExtended, handlePersonNavigation]);

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

  // --- ایمپورت و اکسپورت ---
  const exportData = () => {
    const dataStr = JSON.stringify(tabs, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `family-tree-backup-${new Date().toLocaleDateString('fa-IR')}.json`;
    link.click();
  };

  const handleExportSVG = () => {
     exportToSVG('family-tree-content', `family-tree-${activeTab.title}-${viewMode}`);
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
            if (window.confirm("آیا مطمئن هستید؟ تمام اطلاعات فعلی جایگزین خواهد شد.")) {
                saveTabsToCloud(json);
                setActiveTabId(json[0].id);
            }
        } else if (json.id && json.name) {
             if (window.confirm("فایل حاوی یک درخت تکی است. آیا به عنوان یک خاندان جدید اضافه شود؟")) {
                 const newTab = { id: `import-${Date.now()}`, title: json.name, data: json };
                 saveTabsToCloud([...tabs, newTab]);
                 setActiveTabId(newTab.id);
             }
        }
      } catch { alert("فایل نامعتبر است."); }
    };
    reader.readAsText(file);
  };
  
  // --- تنظیمات و لاگین ---
  const handleAdminLogin = () => {
    if (loginUser === adminCreds.user && loginPass === adminCreds.pass) {
        setIsAuthenticated(true);
        setLoginUser(''); setLoginPass('');
        setEditingMarquee(marqueeText); 
        setNewUser(adminCreds.user); setNewPass(adminCreds.pass);
    } else { alert("نام کاربری یا رمز عبور اشتباه است."); }
  };

  const saveSettings = () => {
    const finalUser = changePassMode && newUser ? newUser : adminCreds.user;
    const finalPass = changePassMode && newPass ? newPass : adminCreds.pass;
    
    if (changePassMode && (!newUser || !newPass)) {
        alert("لطفا نام کاربری و رمز عبور جدید را وارد کنید.");
        return;
    }

    const newCreds = { user: finalUser, pass: finalPass };
    setAdminCreds(newCreds);
    localStorage.setItem('admin_creds', JSON.stringify(newCreds));
    
    setMarqueeText(editingMarquee);
    localStorage.setItem('marquee_text', editingMarquee);

    if (!isOfflineMode) {
        setIsSaving(true);
        apiCall('settings', 'PUT', { user: finalUser, pass: finalPass, marquee: editingMarquee })
        .then(() => { setIsSaving(false); setShowSettings(false); alert("تنظیمات با موفقیت ذخیره شد."); })
        .catch(() => { setIsSaving(false); alert("خطا در ذخیره سازی در فایربیس."); });
    } else { setShowSettings(false); alert("تنظیمات بصورت محلی ذخیره شد."); }
  };

  const headerTitle = useMemo(() => {
    const title = activeTab.title;
    if (title.trim().startsWith('خاندان')) {
        return `شجره نامه ${title}`;
    }
    return `شجره نامه خاندان ${title}`;
  }, [activeTab.title]);

  if (!isLoaded) return <div className="flex items-center justify-center h-screen bg-[#f8f5f2]">در حال بارگذاری...</div>;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden text-right bg-[#f8f5f2]" dir="rtl" onClick={() => setDetailedPerson(null)}>
      {isSaving && <div className="fixed top-0 left-0 w-full h-1 bg-amber-200 z-[100]"><div className="h-full bg-amber-600 animate-pulse w-full"></div></div>}
      
      {isOfflineMode && (
          <div className="bg-amber-100 text-amber-800 text-xs py-2 px-4 flex justify-between items-center border-b border-amber-200">
             <div className="font-bold flex items-center gap-2">
                 <span>⚠️ حالت آفلاین: {offlineReason || "امکان ارتباط با سرور وجود ندارد."}</span>
             </div>
             <button onClick={() => fetchData()} className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded text-xs font-bold transition-colors">تلاش مجدد</button>
          </div>
      )}

      <Header 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        searchResults={searchResults}
        onSelectPerson={(p) => { handlePersonNavigation(p); setSearchTerm(''); }}
        onExport={exportData}
        onImport={importData}
        isAuthenticated={isAuthenticated}
        onExportImage={() => {}}
        onExportSVG={handleExportSVG}
        onOpenSettings={() => { setLoginUser(''); setLoginPass(''); setShowSettings(true); setChangePassMode(false); setEditingMarquee(marqueeText); }}
        onOpenStats={() => setShowStats(true)}
        onOpenCalculator={() => setShowCalculator(true)}
        searchGlobal={searchGlobal}
        setSearchGlobal={setSearchGlobal}
        title={headerTitle}
      />

      <div className="bg-white border-b border-slate-200 flex flex-col md:flex-row justify-between items-end md:items-center pr-1 md:pr-2 gap-1 md:gap-2 z-40">
        <div className="flex-1 overflow-x-auto w-full md:w-auto order-2 md:order-1">
            <TabNavigation 
                tabs={tabs} 
                activeTabId={activeTabId} 
                onSelectTab={setActiveTabId} 
                onAddTab={handleAddTab}
                onRenameTab={handleRenameTab}
                onDeleteTab={handleDeleteTab}
                isAuthenticated={isAuthenticated}
            />
        </div>
        
        <div className="flex items-center gap-2 p-1 md:p-2 shrink-0 order-1 md:order-2 self-center md:self-auto w-full md:w-auto justify-between md:justify-end border-b md:border-b-0 border-slate-100 pb-2 md:pb-0">
             <div className="flex bg-slate-100 rounded-lg p-1">
                <button onClick={() => setListFilter('all')} className={`px-2 md:px-3 py-1 text-[10px] md:text-xs rounded-md transition-all ${listFilter === 'all' ? 'bg-white shadow text-slate-800 font-bold' : 'text-slate-500'}`}>همه</button>
                <button onClick={() => setListFilter('male')} className={`px-2 md:px-3 py-1 text-[10px] md:text-xs rounded-md transition-all ${listFilter === 'male' ? 'bg-white shadow text-blue-600 font-bold' : 'text-slate-500'}`}>پسران</button>
                <button onClick={() => setListFilter('female')} className={`px-2 md:px-3 py-1 text-[10px] md:text-xs rounded-md transition-all ${listFilter === 'female' ? 'bg-white shadow text-pink-600 font-bold' : 'text-slate-500'}`}>دختران</button>
             </div>

             <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
                <button 
                    onClick={() => setViewMode('rich_tree')}
                    className={`flex items-center gap-1 px-2 md:px-3 py-1.5 rounded-lg transition-all ${viewMode === 'rich_tree' ? 'bg-white shadow-sm text-amber-600 font-bold' : 'text-slate-500'}`}
                    title="نمای کارتی (گرافیکی)"
                >
                    <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                    <span className="text-[10px] md:text-xs hidden xs:inline">کارت</span>
                </button>
                <button 
                    onClick={() => setViewMode('simple_tree')}
                    className={`flex items-center gap-1 px-2 md:px-3 py-1.5 rounded-lg transition-all ${viewMode === 'simple_tree' ? 'bg-white shadow-sm text-amber-600 font-bold' : 'text-slate-500'}`}
                    title="نمای چارت (افقی دست‌نویس)"
                >
                    <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <span className="text-[10px] md:text-xs hidden xs:inline">چارت</span>
                </button>
                 <button 
                    onClick={() => setViewMode('vertical_tree')}
                    className={`flex items-center gap-1 px-2 md:px-3 py-1.5 rounded-lg transition-all ${viewMode === 'vertical_tree' ? 'bg-white shadow-sm text-amber-600 font-bold' : 'text-slate-500'}`}
                    title="نمای عمودی (کپی چارت)"
                >
                    <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    <span className="text-[10px] md:text-xs hidden xs:inline">عمودی</span>
                </button>
             </div>
        </div>
      </div>

      <main className="flex-1 relative overflow-hidden mb-8">
         <div className="w-full h-full relative" key={`${viewMode}-${listFilter}`}>
             <FamilyTreeView 
                data={filteredTreeData} 
                onSelectDetails={setDetailedPerson} 
                onActivateNav={handlePersonNavigation}
                onSelectByName={handleSelectByName} 
                selectedPersonId={detailedPerson?.id}
                navigatingPersonId={navigatingPerson?.id}
                focusKey={focusKey}
                viewMode={viewMode}
                layoutConfig={layoutConfig[listFilter] || {}} 
                onSaveLayout={handleSaveLayout}
                isAuthenticated={isAuthenticated}
            />
             
             <div className="floating-nav">
                <FloatingNav 
                    person={navigatingPerson}
                    onClose={() => { setNavigatingPerson(null); setSlideshowActive(false); }}
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
          onClose={() => setDetailedPerson(null)} 
          onUpdate={handleUpdatePerson}
          onAddChild={handleAddChild}
          onAddExistingChild={handleAddExistingChild}
          onDelete={handleDeletePerson}
          onMoveSubtree={handleMoveSubtree}
          isAuthenticated={isAuthenticated}
          onLoginSuccess={() => setIsAuthenticated(true)}
          adminCreds={adminCreds} 
        />
        
        {showStats && (
            <StatisticsDashboard 
                members={activeMembersExtended} 
                onClose={() => setShowStats(false)} 
                title={headerTitle}
            />
        )}

        {showCalculator && (
            <RelationshipCalculator 
                allMembers={activeMembersExtended}
                onClose={() => setShowCalculator(false)}
                onSelectPersonForGraph={handlePersonNavigation}
            />
        )}
      </main>

      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
           <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl settings-modal animate-in zoom-in-95 border border-slate-200 overflow-y-auto max-h-[90vh]">
               <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3 border-b pb-4">
                   {isAuthenticated ? 'پنل مدیریت و تنظیمات' : 'ورود مدیر'}
               </h3>
               {!isAuthenticated ? (
                  <div className="space-y-4">
                     <input type="text" placeholder="نام کاربری" value={loginUser} onChange={e => setLoginUser(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none text-left font-bold" dir="ltr" />
                     <input type="password" placeholder="رمز عبور" value={loginPass} onChange={e => setLoginPass(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none text-left font-bold" dir="ltr" />
                     <div className="flex gap-2 mt-6">
                       <button onClick={handleAdminLogin} className="flex-1 bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-900 transition-colors">ورود</button>
                       <button onClick={() => setShowSettings(false)} className="px-5 bg-slate-100 text-slate-500 py-3 rounded-xl font-bold hover:bg-slate-200">لغو</button>
                     </div>
                  </div>
               ) : (
                  <div className="space-y-6">
                     <div>
                        <label className="text-xs font-bold text-slate-500 mb-2 block">متن نوار متحرک (اخبار):</label>
                        <textarea rows={3} value={editingMarquee} onChange={e => setEditingMarquee(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:border-amber-500 outline-none" placeholder="متن اخبار..." />
                     </div>
                     
                     <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <label className="flex items-center gap-2 cursor-pointer mb-3">
                            <input type="checkbox" checked={changePassMode} onChange={e => setChangePassMode(e.target.checked)} className="w-4 h-4 accent-amber-600" />
                            <span className="text-sm font-bold text-slate-800">تغییر نام کاربری و رمز عبور</span>
                        </label>
                        
                        {changePassMode && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                <input type="text" placeholder="نام کاربری جدید" value={newUser} onChange={e => setNewUser(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold text-left" dir="ltr" />
                                <input type="text" placeholder="رمز عبور جدید" value={newPass} onChange={e => setNewPass(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold text-left" dir="ltr" />
                                <p className="text-[10px] text-red-500 font-bold">* لطفا رمز جدید را حتما به خاطر بسپارید.</p>
                            </div>
                        )}
                     </div>

                     <div className="flex gap-2 mt-2 pt-4 border-t border-slate-100">
                       <button onClick={saveSettings} className="flex-1 bg-amber-600 text-white py-3 rounded-xl font-bold hover:bg-amber-700 shadow-lg shadow-amber-200">ذخیره تغییرات</button>
                       <button onClick={() => setShowSettings(false)} className="px-5 bg-slate-100 text-slate-500 py-3 rounded-xl font-bold hover:bg-slate-200">بستن</button>
                     </div>
                  </div>
               )}
           </div>
        </div>
      )}

      <footer className="fixed bottom-0 left-0 w-full bg-black text-white z-[60] border-t border-slate-800">
        <div className="flex items-center justify-between h-8 px-2">
            <div className="flex-1 overflow-hidden relative mx-2">
                <div className="animate-marquee whitespace-nowrap text-[11px] font-bold text-amber-400">{marqueeText}</div>
            </div>
            <div className="text-[9px] text-slate-500 flex items-center gap-2 whitespace-nowrap pl-2">
                <span>{APP_VERSION}</span>
                <span>علیرضا لباف</span>
                <span className={`w-2 h-2 rounded-full ${!isOfflineMode ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
