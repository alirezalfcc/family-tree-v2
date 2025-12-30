
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import FamilyTreeView from './components/FamilyTreeView';
import PersonDetails from './components/PersonDetails';
import Header from './components/Header';
import FloatingNav from './components/FloatingNav';
import TabNavigation from './components/TabNavigation';
import StatisticsDashboard from './components/StatisticsDashboard';
import RelationshipCalculator from './components/RelationshipCalculator';
import AuthModal from './components/AuthModal';
import { familyData as initialData } from './data';
import { Person, FamilyTab, ViewMode, ListFilter, User } from './types';
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

const APP_VERSION = "v3.5 Final";

// Local Storage Keys
const LS_KEYS = {
    DATA: 'family_tree_data_v4',
    USERS: 'family_tree_users_v1',
    SESSION: 'auth_session'
};

const App: React.FC = () => {
  // --- Data States ---
  const [tabs, setTabs] = useState<FamilyTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');

  // --- Auth States ---
  const [currentUser, setCurrentUser] = useState<{ username: string; role: 'admin' | 'user' } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [localUsers, setLocalUsers] = useState<any[]>([]); // Manage users locally for offline mode
  
  // --- UI States ---
  const [viewMode, setViewMode] = useState<ViewMode>('rich_tree'); 
  const [listFilter, setListFilter] = useState<ListFilter>('all');
  const [searchGlobal, setSearchGlobal] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false); 
  const [offlineReason, setOfflineReason] = useState<string>('');
  
  const [navigatingPerson, setNavigatingPerson] = useState<ExtendedPerson | null>(null);
  const [focusKey, setFocusKey] = useState(0);
  const [detailedPerson, setDetailedPerson] = useState<Person | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [slideshowActive, setSlideshowActive] = useState(false);
  const [slideDelay, setSlideDelay] = useState(3); 

  const [showSettings, setShowSettings] = useState(false); // Used for AuthModal
  const [showStats, setShowStats] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  
  const [marqueeText, setMarqueeText] = useState("خوش آمدید. نسخه پیش‌نمایش (بدون سرور).");
  
  const [layoutConfig, setLayoutConfig] = useState<Record<string, any>>({ all: {}, male: {}, female: {} });

  // --- Computed ---
  // Filter out soft-deleted tabs for the main view
  const visibleTabs = useMemo(() => tabs.filter(t => !t.deleted), [tabs]);
  
  // Get recycled tabs (for admin)
  const recycledTabs = useMemo(() => tabs.filter(t => t.deleted), [tabs]);

  const activeTab = useMemo(() => visibleTabs.find(t => t.id === activeTabId) || visibleTabs[0] || { id: 'dummy', title: 'خالی', data: { id: 'root', name: 'خالی', children: [] } }, [visibleTabs, activeTabId]);
  
  // **PERMISSION LOGIC**: Can edit ONLY if isAuthenticated AND (Admin OR Owner)
  // Public tabs are viewable by all, but editable only by owner/admin.
  const canEditActiveTab = useMemo(() => {
      if (!isAuthenticated || !currentUser) return false;
      if (currentUser.role === 'admin') return true;
      // If it's a dummy tab or undefined, no edit
      if (!activeTab || activeTab.id === 'dummy') return false;
      return activeTab.owner === currentUser.username;
  }, [isAuthenticated, currentUser, activeTab]);

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
    return visibleTabs.flatMap(tab => {
        const members = flattenTree(tab.data);
        return members.map(m => ({...m, tabId: tab.id, tabTitle: tab.title}));
    });
  }, [visibleTabs, searchGlobal]);

  const searchResults = useMemo(() => {
    if (!searchTerm || searchTerm.trim().length < 2) return [];
    const term = searchTerm.trim().toLowerCase();
    const source = searchGlobal ? allTabsMembers : activeMembersExtended;
    return source.filter((person: any) => {
        const fullName = `${person.name} ${person.surname || ''}`.toLowerCase();
        return fullName.includes(term) || person.name.toLowerCase().includes(term);
    }).slice(0, 20);
  }, [searchTerm, searchGlobal, allTabsMembers, activeMembersExtended]);

  // Load Local Users on Mount
  useEffect(() => {
      const storedUsers = localStorage.getItem(LS_KEYS.USERS);
      if (storedUsers) {
          setLocalUsers(JSON.parse(storedUsers));
      } else {
          // Default Admin for offline mode
          const defaultAdmin = { username: '1', password: '1', role: 'admin' };
          setLocalUsers([defaultAdmin]);
          localStorage.setItem(LS_KEYS.USERS, JSON.stringify([defaultAdmin]));
      }
  }, []);

  // --- API Functions (Optimized for Preview) ---
  const apiCall = async (path: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', body?: any) => {
      // 1. FAST EXIT: If we already detected offline mode, don't even try fetch.
      if (isOfflineMode) {
          throw new Error("API_UNAVAILABLE");
      }

      const controller = new AbortController();
      // Reduced timeout to 1.5s to fail faster in preview if backend is missing
      const timeoutId = setTimeout(() => controller.abort(), 1500); 

      try {
          const options: RequestInit = {
              method,
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal
          };
          if (body) options.body = JSON.stringify(body);
          
          const response = await fetch(`/api/proxy?path=${encodeURIComponent(path)}`, options);
          clearTimeout(timeoutId);
          
          // Check content type
          const contentType = response.headers.get("content-type");
          if (contentType && (contentType.includes("text/html") || contentType.includes("text/plain"))) {
             throw new Error("API_UNAVAILABLE");
          }

          const text = await response.text();
          if (!text) throw new Error("API_UNAVAILABLE"); // Empty response

          let json;
          try {
             json = JSON.parse(text);
          } catch (e) {
             console.warn("JSON Parse Error (likely preview mode):", e);
             throw new Error("API_UNAVAILABLE");
          }

          if (response.status === 404) throw new Error("API Route Not Found");
          
          if (!response.ok) {
             throw new Error(json.detail || json.error || `Error ${response.status}`);
          }
          return json;
      } catch (error: any) {
          clearTimeout(timeoutId);
          if (error.name === 'AbortError' || error.message === "API_UNAVAILABLE" || error.message.includes("JSON") || error.message.includes("Unexpected token")) {
              throw new Error("API_UNAVAILABLE");
          }
          throw error;
      }
  };

  // --- Auth Handlers (Hybrid: Server -> Local Fallback) ---
  const handleLogin = async (username: string, pass: string) => {
      // Offline / Local Login Logic
      const performLocalLogin = () => {
          const foundUser = localUsers.find(u => u.username === username && u.password === pass);
          if (foundUser) {
              completeLogin(foundUser.username, foundUser.role);
              return true;
          }
          return false;
      };

      if (isOfflineMode) {
          if (performLocalLogin()) return;
          throw new Error("نام کاربری یا رمز عبور اشتباه است (آفلاین)");
      }

      try {
          const res = await apiCall('_system/login', 'POST', { username, password: pass });
          if (res.success) {
              completeLogin(res.username, res.role);
          } else {
              throw new Error(res.message);
          }
      } catch (err: any) {
          if (err.message === "API_UNAVAILABLE" || err.message === "Failed to fetch") {
              console.warn("Backend unavailable, checking local storage.");
              setIsOfflineMode(true); 
              setOfflineReason("عدم دسترسی به سرور");
              
              if (performLocalLogin()) {
                  alert("توجه: شما در حالت پیش‌نمایش (آفلاین) وارد شدید.");
                  return;
              }
              throw new Error("ارتباط با سرور برقرار نشد و کاربر آفلاین یافت نشد.");
          } else {
              throw err;
          }
      }
  };

  const completeLogin = (username: string, role: 'admin' | 'user') => {
      const userObj = { username, role };
      setIsAuthenticated(true);
      setCurrentUser(userObj);
      localStorage.setItem(LS_KEYS.SESSION, JSON.stringify(userObj));
      setShowSettings(false);
      // Re-process tabs visibility with new user
      fetchData(userObj); 
  };

  const handleLogout = () => {
      setIsAuthenticated(false);
      setCurrentUser(null);
      localStorage.removeItem(LS_KEYS.SESSION);
      setShowSettings(false);
      // Immediately re-process data to hide private tabs
      fetchData(null); 
  };

  const handleCreateUser = async (user: string, pass: string, role: 'admin' | 'user') => {
      if (!currentUser || currentUser.role !== 'admin') throw new Error("Access Denied");
      
      if (!isOfflineMode) {
        try {
            await apiCall('_system/manage_user', 'POST', { targetUser: user, password: pass, role });
        } catch (err: any) {
            if (err.message !== "API_UNAVAILABLE") throw err;
        }
      }

      const newLocalUsers = [...localUsers.filter(u => u.username !== user), { username: user, password: pass, role }];
      setLocalUsers(newLocalUsers);
      localStorage.setItem(LS_KEYS.USERS, JSON.stringify(newLocalUsers));
  };

  const handleUpdateUser = async (oldUsername: string, newUsername: string, newPass: string, newRole: 'admin' | 'user') => {
      if (!currentUser || currentUser.role !== 'admin') throw new Error("Access Denied");
      
      // Update Local State First
      let newLocalUsers = [...localUsers];
      
      // Check if username is changing
      if (oldUsername !== newUsername) {
          if (newLocalUsers.some(u => u.username === newUsername)) {
              throw new Error("نام کاربری جدید تکراری است");
          }
          // Remove old, add new
          newLocalUsers = newLocalUsers.filter(u => u.username !== oldUsername);
          newLocalUsers.push({ username: newUsername, password: newPass, role: newRole });
      } else {
          // Just update password/role
          newLocalUsers = newLocalUsers.map(u => 
              u.username === oldUsername ? { ...u, password: newPass, role: newRole } : u
          );
      }
      
      setLocalUsers(newLocalUsers);
      localStorage.setItem(LS_KEYS.USERS, JSON.stringify(newLocalUsers));

      // Attempt API sync
      if (!isOfflineMode) {
          try {
              await apiCall('_system/manage_user', 'POST', { targetUser: newUsername, password: newPass, role: newRole });
          } catch(e) {}
      }
      
      alert("کاربر با موفقیت ویرایش شد.");
  };

  const handleDeleteUser = async (targetUser: string) => {
      if (!currentUser || currentUser.role !== 'admin') throw new Error("Access Denied");
      if (targetUser === currentUser.username) throw new Error("نمیتوانید حساب خودتان را حذف کنید.");
      // PROTECT ROOT ADMIN
      if (targetUser === '1') throw new Error("حساب مدیر اصلی سیستم (1) قابل حذف نیست.");

      const newLocalUsers = localUsers.filter(u => u.username !== targetUser);
      setLocalUsers(newLocalUsers);
      localStorage.setItem(LS_KEYS.USERS, JSON.stringify(newLocalUsers));

      const newTabs = tabs.map(t => {
          if (t.owner === targetUser) {
              return { ...t, deleted: true, deletedAt: Date.now() }; 
          }
          return t;
      });
      saveTabsToCloud(newTabs);

      if (!isOfflineMode) {
          try {
              // API call if exists
          } catch (e) { console.warn("Delete user API failed", e); }
      }
      
      alert(`کاربر ${targetUser} حذف شد و خاندان‌های او به سطل بازیافت منتقل شدند.`);
  };

  const handleChangePassword = async (newPass: string) => {
      if (!currentUser) return;
      
      // Update local state
      const newLocalUsers = localUsers.map(u => 
          u.username === currentUser.username ? { ...u, password: newPass } : u
      );
      setLocalUsers(newLocalUsers);
      localStorage.setItem(LS_KEYS.USERS, JSON.stringify(newLocalUsers));
      
      // API Call
      if (!isOfflineMode) {
          try {
              // Note: using manage_user for self update if API supports it, otherwise fallback
              await apiCall('_system/manage_user', 'POST', { targetUser: currentUser.username, password: newPass, role: currentUser.role });
          } catch(e) {}
      }
      alert("رمز عبور با موفقیت تغییر کرد.");
  };

  const handleBackup = async () => {
      if (!currentUser || currentUser.role !== 'admin') throw new Error("Access Denied");
      try {
         return await apiCall('_system/backup', 'GET');
      } catch (err: any) {
         if (err.message === "API_UNAVAILABLE") {
             return { familyTabs: tabs, settings: { marquee: marqueeText }, layoutConfig, users: localUsers };
         }
         throw err;
      }
  };

  const handleRestore = async (data: any) => {
      if (!currentUser || currentUser.role !== 'admin') throw new Error("Access Denied");
      try {
          return await apiCall('_system/restore', 'POST', data);
      } catch (err: any) {
          if (err.message === "API_UNAVAILABLE") {
              if (data.familyTabs) setTabs(data.familyTabs);
              if (data.settings?.marquee) setMarqueeText(data.settings.marquee);
              if (data.users) {
                  setLocalUsers(data.users);
                  localStorage.setItem(LS_KEYS.USERS, JSON.stringify(data.users));
              }
              localStorage.setItem(LS_KEYS.DATA, JSON.stringify(data.familyTabs || tabs));
              return;
          }
          throw err;
      }
  };

  // --- Data Loading ---
  const fetchData = async (userOverride?: { username: string; role: 'admin' | 'user' } | null) => {
      try {
          let data;
          if (!isOfflineMode) {
            try {
               data = await apiCall(''); 
               setIsOfflineMode(false);
            } catch (e) { throw e; }
          }
          if (!data) throw new Error("Fetching local");
          processFetchedData(data, userOverride);
      } catch (error: any) {
          console.warn("Offline/Mock Mode Active:", error);
          if (!isOfflineMode) {
              setIsOfflineMode(true);
              setOfflineReason("اتصال به سرور برقرار نیست (حالت پیش‌نمایش)");
          }
          const localData = localStorage.getItem(LS_KEYS.DATA);
          if (localData) {
              const parsed = JSON.parse(localData);
              processFetchedData({ familyTabs: parsed }, userOverride);
          } else {
              processFetchedData({ 
                  familyTabs: [{ 
                      id: 'default', 
                      title: 'خاندان پیش‌فرض', 
                      data: initialData, 
                      isPublic: true, 
                      owner: 'admin' 
                  }] 
              }, userOverride);
          }
      } finally {
          setIsLoaded(true);
      }
  };

  const processFetchedData = (data: any, userOverride?: { username: string; role: 'admin' | 'user' } | null) => {
      if (!data) return;
      let loadedTabs: FamilyTab[] = [];
      if (Array.isArray(data)) {
          loadedTabs = data.map((t: any) => ({ ...t, isPublic: true, owner: 'admin' }));
      } else if (data.familyTabs) {
          loadedTabs = data.familyTabs.map((t: any) => ({
              ...t, 
              isPublic: t.isPublic ?? true, 
              owner: t.owner ?? 'admin'
          }));
      } else if (data.id && data.name) {
          loadedTabs = [{ 
              id: 'default', 
              title: 'خاندان اصلی', 
              data: data, 
              isPublic: true, 
              owner: 'admin' 
          }];
      } else {
          loadedTabs = [{ id: 'default', title: 'خاندان پیش‌فرض', data: initialData, isPublic: true, owner: 'admin' }];
      }
      
      if (data.settings?.marquee) setMarqueeText(data.settings.marquee);
      if (data.layoutConfig) setLayoutConfig(data.layoutConfig);

      let effectiveUser = userOverride;
      if (effectiveUser === undefined) {
         if (currentUser) {
             effectiveUser = currentUser;
         } else {
             const session = localStorage.getItem(LS_KEYS.SESSION);
             if (session) {
                 effectiveUser = JSON.parse(session);
                 if (!currentUser) {
                     setCurrentUser(effectiveUser);
                     setIsAuthenticated(true);
                 }
             } else {
                 effectiveUser = null;
             }
         }
      }

      const accessibleTabs = loadedTabs.filter(t => {
          if (t.deleted) {
              return effectiveUser && effectiveUser.role === 'admin';
          }
          if (!t.isPublic) {
              if (effectiveUser) {
                  return effectiveUser.role === 'admin' || t.owner === effectiveUser.username;
              }
              return false; 
          }
          return true; 
      });

      setTabs(accessibleTabs);
      
      const nonDeleted = accessibleTabs.filter(t => !t.deleted);
      if (nonDeleted.length > 0) {
          setActiveTabId(prev => nonDeleted.some(t => t.id === prev) ? prev : nonDeleted[0].id);
      }
  };

  useEffect(() => { fetchData(); }, []);

  // --- CRUD Operations ---
  const saveTabsToCloud = useCallback((newTabs: FamilyTab[]) => {
    setTabs(newTabs);
    localStorage.setItem(LS_KEYS.DATA, JSON.stringify(newTabs));
    if (!isOfflineMode) {
      setIsSaving(true);
      apiCall('familyTabs', 'PUT', newTabs)
        .then(() => setTimeout(() => setIsSaving(false), 500))
        .catch((err) => { setIsSaving(false); });
    }
  }, [isOfflineMode]);

  const handleAddTab = (title: string, isPublic: boolean) => {
    if (!currentUser) return alert("لطفا وارد شوید");
    const newTab: FamilyTab = {
        id: `tab-${Date.now()}`,
        title,
        data: { id: `root-${Date.now()}`, name: title, children: [] },
        owner: currentUser.username,
        isPublic
    };
    const newTabs = [...tabs, newTab];
    saveTabsToCloud(newTabs);
    setActiveTabId(newTab.id);
  };

  const handleRenameTab = (id: string, newTitle: string) => {
    const newTabs = tabs.map(t => t.id === id ? { ...t, title: newTitle } : t);
    saveTabsToCloud(newTabs);
  };

  const handleTogglePrivacy = (id: string) => {
      const newTabs = tabs.map(t => t.id === id ? { ...t, isPublic: !t.isPublic } : t);
      saveTabsToCloud(newTabs);
  };

  const handleDeleteTab = (id: string) => {
    const newTabs = tabs.map(t => t.id === id ? { ...t, deleted: true, deletedAt: Date.now() } : t);
    saveTabsToCloud(newTabs);
    const remaining = newTabs.filter(t => !t.deleted && (t.isPublic || (currentUser && (currentUser.role === 'admin' || t.owner === currentUser.username))));
    if (activeTabId === id) setActiveTabId(remaining[0]?.id || '');
  };

  // Restore with optional new owner assignment
  const handleRestoreTab = (id: string, newOwner?: string) => {
      const newTabs = tabs.map(t => {
          if (t.id === id) {
              return { 
                  ...t, 
                  deleted: false, 
                  deletedAt: undefined,
                  owner: newOwner || t.owner // Assign new owner if provided
              };
          }
          return t;
      });
      saveTabsToCloud(newTabs);
      alert(newOwner ? `خاندان بازیابی شد و به کاربر ${newOwner} انتقال یافت.` : "خاندان بازیابی شد.");
  };

  const handlePermanentDeleteTab = (id: string) => {
      const newTabs = tabs.filter(t => t.id !== id);
      saveTabsToCloud(newTabs);
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
      if (nodeId === activeTab.data.id) return alert("ریشه قابل جابجایی نیست");
      try {
          const updatedTree = movePersonInTree(activeTab.data, newParentId, nodeId);
          handleUpdateActiveTree(updatedTree);
          setDetailedPerson(null);
      } catch (err: any) { alert(err.message); }
  }, [activeTab.data, tabs]);

  const handleDeletePerson = useCallback((id: string) => {
     if (id === activeTab.data.id) return alert("ریشه قابل حذف نیست");
     const updatedTree = removePersonFromTree(activeTab.data, id);
     if (updatedTree) {
        handleUpdateActiveTree(updatedTree);
        setDetailedPerson(null);
     }
  }, [activeTab.data, tabs]);

  // --- Navigation ---
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

  const handleSaveLayout = useCallback((newLayout: any) => {
      setLayoutConfig(prev => {
          const updatedFullConfig = { ...prev, [listFilter]: newLayout };
          if (!isOfflineMode) apiCall('layoutConfig', 'PUT', updatedFullConfig).catch(() => {});
          return updatedFullConfig;
      });
  }, [isOfflineMode, listFilter]);

  const handleUpdateMarquee = (text: string) => {
      setMarqueeText(text);
      if (!isOfflineMode) apiCall('settings', 'PUT', { marquee: text }).catch(() => {});
  };

  const headerTitle = activeTab.title.startsWith('خاندان') ? `شجره نامه ${activeTab.title}` : `شجره نامه خاندان ${activeTab.title}`;

  if (!isLoaded) return <div className="flex items-center justify-center h-screen bg-[#f8f5f2]">در حال بارگذاری...</div>;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden text-right bg-[#f8f5f2]" dir="rtl" onClick={() => setDetailedPerson(null)}>
      {isSaving && <div className="fixed top-0 left-0 w-full h-1 bg-amber-200 z-[100]"><div className="h-full bg-amber-600 animate-pulse w-full"></div></div>}
      
      {isOfflineMode && (
          <div className="bg-amber-100 text-amber-800 text-xs py-2 px-4 flex justify-between items-center border-b border-amber-200">
             <span>⚠️ حالت آفلاین (پیش‌نمایش): {offlineReason}</span>
             <button onClick={() => fetchData()} className="bg-amber-500 text-white px-2 py-1 rounded">تلاش مجدد</button>
          </div>
      )}

      <Header 
        searchTerm={searchTerm} setSearchTerm={setSearchTerm} searchResults={searchResults}
        onSelectPerson={handlePersonNavigation}
        onExport={() => {}} 
        onImport={(e) => {}} 
        isAuthenticated={isAuthenticated}
        onExportImage={() => {}} onExportSVG={() => exportToSVG('family-tree-content', 'tree')}
        onOpenSettings={() => setShowSettings(true)}
        onOpenStats={() => setShowStats(true)}
        onOpenCalculator={() => setShowCalculator(true)}
        searchGlobal={searchGlobal} setSearchGlobal={setSearchGlobal}
        title={headerTitle}
      />

      <div className="bg-white border-b border-slate-200 flex flex-col md:flex-row justify-between items-end md:items-center pr-1 md:pr-2 gap-1 md:gap-2 z-40">
        <div className="flex-1 overflow-x-auto w-full md:w-auto order-2 md:order-1">
            <TabNavigation 
                tabs={visibleTabs} activeTabId={activeTabId} 
                onSelectTab={setActiveTabId} 
                onAddTab={handleAddTab}
                onRenameTab={handleRenameTab}
                onDeleteTab={handleDeleteTab}
                onTogglePrivacy={handleTogglePrivacy}
                isAuthenticated={isAuthenticated}
                currentUser={currentUser}
            />
        </div>
        
        <div className="flex items-center gap-2 p-1 order-1 md:order-2">
             <div className="flex bg-slate-100 rounded-lg p-1">
                <button onClick={() => setListFilter('all')} className={`p-2 rounded-md transition-all ${listFilter === 'all' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`} title="نمایش همه">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                </button>
                <button onClick={() => setListFilter('male')} className={`p-2 rounded-md transition-all ${listFilter === 'male' ? 'bg-white shadow' : 'hover:bg-slate-200'} text-black`} title="فقط مردان">
                   {/* Male Person Icon (Black) */}
                   <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                     <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                     <circle cx="12" cy="7" r="4" />
                   </svg>
                </button>
                <button onClick={() => setListFilter('female')} className={`p-2 rounded-md transition-all ${listFilter === 'female' ? 'bg-white shadow' : 'hover:bg-slate-200'} text-pink-500`} title="فقط زنان">
                   {/* Female Person Icon (Pink) */}
                   <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                     <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                     <circle cx="12" cy="7" r="4" />
                   </svg>
                </button>
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
         <div className="w-full h-full relative" key={`${viewMode}-${listFilter}`}>
             <FamilyTreeView 
                data={filteredTreeData} 
                onSelectDetails={setDetailedPerson} 
                onActivateNav={handlePersonNavigation}
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
          onClose={() => setDetailedPerson(null)} 
          onUpdate={handleUpdatePerson}
          onAddChild={handleAddChild}
          onAddExistingChild={handleAddExistingChild}
          onDelete={handleDeletePerson}
          onMoveSubtree={handleMoveSubtree}
          isAuthenticated={isAuthenticated}
          onLoginSuccess={() => setShowSettings(true)}
          canEdit={canEditActiveTab} // Pass the calculated permission
        />
        
        {showStats && <StatisticsDashboard members={activeMembersExtended} onClose={() => setShowStats(false)} title={headerTitle} />}
        {showCalculator && <RelationshipCalculator allMembers={activeMembersExtended} onClose={() => setShowCalculator(false)} onSelectPersonForGraph={handlePersonNavigation} />}
      </main>

      <AuthModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)}
        isAuthenticated={isAuthenticated}
        currentUser={currentUser}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onCreateUser={handleCreateUser}
        onDeleteUser={handleDeleteUser}
        onUpdateUser={handleUpdateUser} 
        onChangePassword={handleChangePassword} 
        usersList={localUsers} 
        onBackup={handleBackup}
        onRestore={handleRestore}
        marqueeText={marqueeText}
        onUpdateMarquee={handleUpdateMarquee}
        // Recycle Bin Props
        recycledTabs={recycledTabs}
        onRestoreTab={handleRestoreTab}
        onPermanentDeleteTab={handlePermanentDeleteTab}
      />

      <footer className="fixed bottom-0 left-0 w-full bg-black text-white z-[60] border-t border-slate-800">
        <div className="flex items-center justify-between h-8 px-2">
            <div className="flex-1 overflow-hidden relative mx-2">
                <div className="animate-marquee whitespace-nowrap text-[11px] font-bold text-amber-400">{marqueeText}</div>
            </div>
            <div className="text-[9px] text-slate-500 flex items-center gap-2 whitespace-nowrap pl-2">
                {currentUser && (
                    <span className="text-white font-bold hidden sm:inline-block">{currentUser.username}</span>
                )}
                {/* Status Circle: Green for Current User */}
                <span className={`w-2 h-2 rounded-full ${currentUser ? 'bg-green-500' : (!isOfflineMode ? 'bg-emerald-500' : 'bg-red-500')}`}></span>
                <span>{APP_VERSION}</span>
            </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
