
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import FamilyTreeView from './components/FamilyTreeView';
import PersonDetails from './components/PersonDetails';
import Header from './components/Header';
import FloatingNav from './components/FloatingNav';
import TabNavigation from './components/TabNavigation';
import StatisticsDashboard from './components/StatisticsDashboard';
import RelationshipCalculator from './components/RelationshipCalculator';
import AuthModal from './components/AuthModal';
import TabRelationshipMap from './components/TabRelationshipMap'; // New
import { familyData as initialData } from './data';
import { Person, FamilyTab, ViewMode, ListFilter, User } from './types';
import { 
  flattenTree, 
  ExtendedPerson, 
  updatePersonInTree, 
  addChildToTree, 
  movePersonInTree, 
  removePersonFromTree,
  filterTree,
  findNodeById
} from './utils/genealogy';
import { exportToSVG } from './utils/svgExporter';

const APP_VERSION = "v4.2 Mobile Fix";

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
  const [viewRootId, setViewRootId] = useState<string | null>(null); // For "Show from this person down"
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
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showMap, setShowMap] = useState(false); // New Map State
  
  const [marqueeText, setMarqueeText] = useState("خوش آمدید. نسخه پیش‌نمایش (بدون سرور).");
  
  const [layoutConfig, setLayoutConfig] = useState<Record<string, any>>({ all: {}, male: {}, female: {} });

  // --- Computed ---
  // Filter out soft-deleted tabs for the main view
  const visibleTabs = useMemo(() => tabs.filter(t => !t.deleted), [tabs]);
  
  // Get recycled tabs (for admin)
  const recycledTabs = useMemo(() => tabs.filter(t => t.deleted), [tabs]);

  const activeTab = useMemo(() => visibleTabs.find(t => t.id === activeTabId) || visibleTabs[0] || { id: 'dummy', title: 'خالی', data: { id: 'root', name: 'خالی', children: [] } }, [visibleTabs, activeTabId]);
  
  // **PERMISSION LOGIC**: Can edit ONLY if isAuthenticated AND (Admin OR Owner OR SharedWith)
  const canEditActiveTab = useMemo(() => {
      if (!isAuthenticated || !currentUser) return false;
      if (currentUser.role === 'admin') return true;
      if (!activeTab || activeTab.id === 'dummy') return false;
      // Check ownership or sharing
      return activeTab.owner === currentUser.username || activeTab.sharedWith?.includes(currentUser.username);
  }, [isAuthenticated, currentUser, activeTab]);

  const filteredTreeData = useMemo(() => {
     let baseData = activeTab.data;
     
     // 1. Apply View Root Filter (Show from specific person down)
     if (viewRootId) {
         const foundNode = findNodeById(baseData, viewRootId);
         if (foundNode) {
             baseData = foundNode;
         }
     }

     // 2. Apply Gender Filter
     if (listFilter === 'all') return baseData;
     const filtered = filterTree(baseData, listFilter);
     return filtered || baseData; 
  }, [activeTab.data, listFilter, viewRootId]);

  const activeMembersExtended = useMemo(() => {
    return flattenTree(activeTab.data);
  }, [activeTab.data]);

  // Combined Members for Global Search (Consider Linked Tabs prioritization)
  const allTabsMembers = useMemo(() => {
    // If Global Search is ON, return everything.
    // If OFF, return Active + Linked Tabs
    
    let targetTabs = visibleTabs;
    if (!searchGlobal && activeTab.linkedTabIds) {
        targetTabs = visibleTabs.filter(t => t.id === activeTab.id || activeTab.linkedTabIds?.includes(t.id));
    } else if (!searchGlobal) {
        targetTabs = [activeTab];
    }

    return targetTabs.flatMap(tab => {
        const members = flattenTree(tab.data);
        return members.map(m => ({...m, tabId: tab.id, tabTitle: tab.title}));
    });
  }, [visibleTabs, searchGlobal, activeTab]);

  // Special computed property for Auto-Complete in PersonDetails
  // This always includes connected tabs even if global search is off, to find spouses etc.
  const searchScopeMembers = useMemo(() => {
      let targetTabs = [activeTab];
      if (activeTab.linkedTabIds) {
          const linked = visibleTabs.filter(t => activeTab.linkedTabIds?.includes(t.id));
          targetTabs = [...targetTabs, ...linked];
      }
      return targetTabs.flatMap(tab => {
          const members = flattenTree(tab.data);
          return members.map(m => ({...m, tabId: tab.id, tabTitle: tab.title}));
      });
  }, [visibleTabs, activeTab]);

  const searchResults = useMemo(() => {
    if (!searchTerm || searchTerm.trim().length < 2) return [];
    const term = searchTerm.trim().toLowerCase();
    
    return allTabsMembers.filter((person: any) => {
        const fullName = `${person.name} ${person.surname || ''}`.toLowerCase();
        return fullName.includes(term) || person.name.toLowerCase().includes(term);
    }).slice(0, 20);
  }, [searchTerm, allTabsMembers]);

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

  // --- API Functions (Optimized for Mobile/Preview) ---
  const apiCall = async (path: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', body?: any, retryCount = 0): Promise<any> => {
      // 1. FAST EXIT: If we already detected offline mode, don't even try fetch.
      if (isOfflineMode) {
          throw new Error("API_UNAVAILABLE");
      }

      const controller = new AbortController();
      // Increased timeout to 20s to allow for serverless cold starts & slow mobile networks
      const timeoutId = setTimeout(() => controller.abort(), 20000); 

      try {
          const options: RequestInit = {
              method,
              headers: { 
                  'Content-Type': 'application/json',
                  'Cache-Control': 'no-cache', // Mobile browser force fresh
                  'Pragma': 'no-cache'
              },
              cache: 'no-store', // Prevent mobile caching of API responses
              signal: controller.signal
          };
          if (body) options.body = JSON.stringify(body);
          
          const response = await fetch(`/api/proxy?path=${encodeURIComponent(path)}`, options);
          clearTimeout(timeoutId);
          
          // Check content type
          const contentType = response.headers.get("content-type");
          if (contentType && (contentType.includes("text/html") || contentType.includes("text/plain"))) {
             // Treat HTML responses (often 404/500 from hosting) as API unavailability
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
          
          // Retry Logic for Network Errors (Once)
          if (retryCount < 1 && (error.name === 'AbortError' || error.message === "Failed to fetch" || error.message === "API_UNAVAILABLE")) {
              console.log(`Retrying API call (${retryCount + 1})...`);
              return apiCall(path, method, body, retryCount + 1);
          }

          if (error.name === 'AbortError') {
              throw new Error("API_UNAVAILABLE"); // Timeout treated as offline/unavailable
          }
          if (error.message === "API_UNAVAILABLE" || error.message.includes("JSON") || error.message.includes("Unexpected token")) {
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
          if (err.message === "API_UNAVAILABLE" || err.message === "Failed to fetch" || err.name === 'TypeError') {
              console.warn("Backend unavailable or timeout, checking local storage.");
              setIsOfflineMode(true); 
              setOfflineReason("عدم دسترسی به سرور");
              
              if (performLocalLogin()) {
                  return;
              }
              throw new Error("ارتباط با سرور برقرار نشد و کاربر آفلاین یافت نشد. (لطفا اتصال اینترنت را بررسی کنید)");
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
      
      // Fallback for offline mode or full JSON restore
      const restoreLocalState = (dataToRestore: any) => {
          if (dataToRestore.familyTabs) setTabs(dataToRestore.familyTabs);
          if (dataToRestore.settings?.marquee) setMarqueeText(dataToRestore.settings.marquee);
          if (dataToRestore.users) {
              setLocalUsers(dataToRestore.users);
              localStorage.setItem(LS_KEYS.USERS, JSON.stringify(dataToRestore.users));
          }
          // Save tab data to local storage
          localStorage.setItem(LS_KEYS.DATA, JSON.stringify(dataToRestore.familyTabs || tabs));
      };

      try {
          // If online, try to restore to server
          if (!isOfflineMode) {
             await apiCall('_system/restore', 'POST', data);
          }
          
          // Also update local state regardless of online status to show immediate change
          // Note: API restore overwrites the DB, but we need to update React state too.
          restoreLocalState(data);

      } catch (err: any) {
          if (err.message === "API_UNAVAILABLE") {
              restoreLocalState(data);
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
                  // Check admin, owner, or sharedWith list
                  return effectiveUser.role === 'admin' || 
                         t.owner === effectiveUser.username || 
                         t.sharedWith?.includes(effectiveUser.username);
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

  // --- Admin Tab Management (Transfer & Copy & Share) ---
  const handleTransferTab = (tabId: string, newOwner: string) => {
      if (!currentUser || currentUser.role !== 'admin') return;
      const newTabs = tabs.map(t => t.id === tabId ? { ...t, owner: newOwner } : t);
      saveTabsToCloud(newTabs);
      alert(`مالکیت تب با موفقیت به ${newOwner} منتقل شد.`);
  };

  const handleCopyTabToUser = (tabId: string, targetUser: string) => {
      if (!currentUser || currentUser.role !== 'admin') return;
      const sourceTab = tabs.find(t => t.id === tabId);
      if (!sourceTab) return;
      
      const newTab: FamilyTab = {
          ...sourceTab,
          id: `tab-${Date.now()}`,
          title: `${sourceTab.title} (کپی)`,
          owner: targetUser,
          isPublic: false // Default to private for copies
      };
      const newTabs = [...tabs, newTab];
      saveTabsToCloud(newTabs);
      alert(`کپی شجره نامه برای کاربر ${targetUser} ایجاد شد.`);
  };

  const handleShareTab = (tabId: string, targetUser: string) => {
      if (!currentUser) return;
      // Only Admin or Owner can share
      const tab = tabs.find(t => t.id === tabId);
      if (!tab) return;
      if (currentUser.role !== 'admin' && tab.owner !== currentUser.username) return alert("شما اجازه اشتراک‌گذاری این خاندان را ندارید.");

      const currentShares = tab.sharedWith || [];
      if (currentShares.includes(targetUser)) return alert("این کاربر قبلاً دسترسی دارد.");

      const newTabs = tabs.map(t => t.id === tabId ? { ...t, sharedWith: [...currentShares, targetUser] } : t);
      saveTabsToCloud(newTabs);
      alert(`دسترسی ویرایش به کاربر ${targetUser} داده شد.`);
  };

  const handleUnshareTab = (tabId: string, targetUser: string) => {
      if (!currentUser) return;
      const tab = tabs.find(t => t.id === tabId);
      if (!tab) return;
      if (currentUser.role !== 'admin' && tab.owner !== currentUser.username) return alert("شما اجازه مدیریت دسترسی‌های این خاندان را ندارید.");

      const newTabs = tabs.map(t => t.id === tabId ? { ...t, sharedWith: (t.sharedWith || []).filter(u => u !== targetUser) } : t);
      saveTabsToCloud(newTabs);
      alert(`دسترسی کاربر ${targetUser} حذف شد.`);
  };

  const handleExtractSubtree = (personId: string) => {
      if (!canEditActiveTab) {
          alert("شما دسترسی ویرایش این خاندان را ندارید.");
          return;
      }
      
      const nodeToExtract = findNodeById(activeTab.data, personId);
      if (!nodeToExtract) {
          alert("خطا: اطلاعات فرد یافت نشد.");
          return;
      }

      const newTabName = `خاندان ${nodeToExtract.name} ${nodeToExtract.surname || ''}`;
      
      // Deep clone using JSON serialization
      const clonedData = JSON.parse(JSON.stringify(nodeToExtract));
      
      const newTab: FamilyTab = {
          id: `tab-${Date.now()}`,
          title: newTabName,
          data: clonedData,
          owner: currentUser?.username || 'admin',
          isPublic: activeTab.isPublic
      };
      
      const newTabs = [...tabs, newTab];
      saveTabsToCloud(newTabs);
      
      // Switch to new tab and clear details
      setActiveTabId(newTab.id);
      setDetailedPerson(null);
      
      alert(`خاندان جدید "${newTabName}" با موفقیت ایجاد شد.`);
  };

  // --- Merged Tab Creation (Super Tree) ---
  const handleCreateMergedTab = (selectedTabIds: string[]) => {
      if (selectedTabIds.length < 2) return alert("لطفا حداقل ۲ خاندان را انتخاب کنید.");
      
      const selectedTabs = tabs.filter(t => selectedTabIds.includes(t.id));
      if (selectedTabs.length === 0) return;

      const mergedRootId = `merged-${Date.now()}`;
      const tabTitle = `تلفیق: ${selectedTabs.map(t => t.title).join(" و ")}`;

      // Create a super root containing the roots of selected tabs as children
      const mergedData: Person = {
          id: mergedRootId,
          name: "اتحاد خاندان‌ها",
          children: selectedTabs.map(t => {
              // We tag the root of each tree with original info
              return {
                  ...t.data,
                  originalTabId: t.id,
                  originalTabTitle: t.title
              };
          })
      };

      const newTab: FamilyTab = {
          id: `tab-merged-${Date.now()}`,
          title: tabTitle,
          data: mergedData,
          owner: currentUser?.username || 'admin',
          isPublic: false // Default private
      };

      const newTabs = [...tabs, newTab];
      saveTabsToCloud(newTabs);
      setActiveTabId(newTab.id);
      setShowMap(false); // Close map
      alert(`تب تلفیقی "${tabTitle}" ایجاد شد.`);
  };

  // --- Link Updating ---
  const handleUpdateLinkedTabs = (tabId: string, linkedIds: string[]) => {
      const newTabs = tabs.map(t => t.id === tabId ? { ...t, linkedTabIds: linkedIds } : t);
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

  // --- Navigation & Tab Switching ---
  const handlePersonNavigation = useCallback((person: ExtendedPerson | Person, keepSlideshow = false) => {
    // Check if the person belongs to a different tab (e.g. from search or spouse click)
    let targetTabId = activeTabId;
    let personId = person.id;

    if ((person as any).tabId && (person as any).tabId !== activeTabId) {
        targetTabId = (person as any).tabId;
    } else {
        // Fallback: search in all tabs if not explicitly tagged
        // This is important for "linked spouses" who might just have an ID
        const foundTab = visibleTabs.find(t => {
             const members = flattenTree(t.data);
             return members.some(m => m.id === person.id);
        });
        if (foundTab) targetTabId = foundTab.id;
    }

    if (targetTabId !== activeTabId) {
        setActiveTabId(targetTabId);
        // Delay to allow render and tree construction
        setTimeout(() => {
             const targetTab = tabs.find(t => t.id === targetTabId);
             if(targetTab) {
                 const extended = flattenTree(targetTab.data).find(m => m.id === personId) || null;
                 if(extended) {
                     setNavigatingPerson(extended);
                     setFocusKey(prev => prev + 1);
                 }
             }
        }, 150);
    } else {
        const extended = activeMembersExtended.find(m => m.id === personId) || null;
        setNavigatingPerson(extended);
        setFocusKey(prev => prev + 1);
    }

    if (!keepSlideshow) setSlideshowActive(false);
  }, [activeMembersExtended, tabs, activeTabId, visibleTabs]);

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

  // --- Slideshow Logic ---
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

  // Toggle Scope Focus
  const handleToggleViewRoot = (id: string) => {
      if (viewRootId === id) {
          setViewRootId(null);
      } else {
          setViewRootId(id);
      }
  };

  const headerTitle = activeTab.title.startsWith('خاندان') ? `شجره نامه ${activeTab.title}` : `شجره نامه خاندان ${activeTab.title}`;

  // TARGET FOR FOCUS: Use Detailed Person OR Navigating Person
  const targetFocusPerson = detailedPerson || navigatingPerson;

  if (!isLoaded) return <div className="flex items-center justify-center h-screen bg-[#f8f5f2]">در حال بارگذاری...</div>;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden text-right bg-[#f8f5f2]" dir="rtl" onClick={() => { setDetailedPerson(null); setShowFilterMenu(false); }}>
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
        onOpenMap={() => setShowMap(true)}
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
                usersList={localUsers}
                onTransferTab={handleTransferTab}
                onCopyTab={handleCopyTabToUser}
                onUpdateLinkedTabs={handleUpdateLinkedTabs}
                onShareTab={handleShareTab}
                onUnshareTab={handleUnshareTab}
            />
        </div>
        
        <div className="flex items-center gap-2 p-1 order-1 md:order-2">
             
             {/* New Filter Dropdown */}
             <div className="relative">
                 <button 
                    onClick={(e) => { e.stopPropagation(); setShowFilterMenu(!showFilterMenu); }} 
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all border ${showFilterMenu ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-100 hover:border-slate-300'} text-slate-600 text-xs font-bold`}
                 >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                    فیلترها
                    {(listFilter !== 'all' || viewRootId) && <span className="w-2 h-2 rounded-full bg-amber-500"></span>}
                 </button>

                 {showFilterMenu && (
                     <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95 origin-top-left" onClick={e => e.stopPropagation()}>
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
                layoutConfig={layoutConfig[listFilter] || {}} 
                onSaveLayout={handleSaveLayout}
                isAuthenticated={isAuthenticated}
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
          onUpdate={handleUpdatePerson}
          onAddChild={handleAddChild}
          onAddExistingChild={handleAddExistingChild}
          onDelete={handleDeletePerson}
          onMoveSubtree={handleMoveSubtree}
          onExtractSubtree={handleExtractSubtree}
          isAuthenticated={isAuthenticated}
          onLoginSuccess={() => setShowSettings(true)}
          canEdit={canEditActiveTab} 
        />
        
        {showStats && <StatisticsDashboard members={activeMembersExtended} onClose={() => setShowStats(false)} title={headerTitle} />}
        {showCalculator && <RelationshipCalculator allMembers={activeMembersExtended} onClose={() => setShowCalculator(false)} onSelectPersonForGraph={handlePersonNavigation} />}
        {showMap && <TabRelationshipMap tabs={visibleTabs} onClose={() => setShowMap(false)} onSelectTab={setActiveTabId} onCreateMergedTab={handleCreateMergedTab} />}
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
