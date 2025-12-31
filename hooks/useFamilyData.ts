
import { useState, useEffect, useMemo, useCallback } from 'react';
import { FamilyTab, Person } from '../types';
import { 
  updatePersonInTree, 
  addChildToTree, 
  movePersonInTree, 
  removePersonFromTree,
  findNodeById
} from '../utils/genealogy';
import { useDataPersistence } from './useDataPersistence';

export const useFamilyData = (api: any, auth: any) => {
  const [tabs, setTabs] = useState<FamilyTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [marqueeText, setMarqueeText] = useState("خوش آمدید.");
  const [layoutConfig, setLayoutConfig] = useState<Record<string, any>>({ all: {}, male: {}, female: {} });

  const { isLoaded, fetchData, saveTabsToCloud, handleBackup, handleRestore } = useDataPersistence({
      api, auth, tabs, marqueeText, layoutConfig, setTabs, setActiveTabId, setMarqueeText, setLayoutConfig
  });

  const visibleTabs = useMemo(() => tabs.filter(t => !t.deleted), [tabs]);
  const recycledTabs = useMemo(() => tabs.filter(t => t.deleted), [tabs]);

  const activeTab = useMemo(() => visibleTabs.find(t => t.id === activeTabId) || visibleTabs[0] || { id: 'dummy', title: 'خالی', data: { id: 'root', name: 'خالی', children: [] } }, [visibleTabs, activeTabId]);

  // Initial Load
  useEffect(() => { fetchData(); }, []);

  // --- CRUD Operations ---
  const handleAddTab = (title: string, isPublic: boolean) => {
    if (!auth.currentUser) return alert("لطفا وارد شوید");
    const newTab: FamilyTab = {
        id: `tab-${Date.now()}`,
        title,
        data: { id: `root-${Date.now()}`, name: title, children: [] },
        owner: auth.currentUser.username,
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
    const remaining = newTabs.filter(t => !t.deleted && (t.isPublic || (auth.currentUser && (auth.currentUser.role === 'admin' || t.owner === auth.currentUser.username))));
    if (activeTabId === id) setActiveTabId(remaining[0]?.id || '');
  };

  const handleRestoreTab = (id: string, newOwner?: string) => {
      const newTabs = tabs.map(t => {
          if (t.id === id) {
              return { 
                  ...t, 
                  deleted: false, 
                  deletedAt: undefined,
                  owner: newOwner || t.owner
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

  const handleTransferTab = (tabId: string, newOwner: string) => {
      if (!auth.currentUser || auth.currentUser.role !== 'admin') return;
      const newTabs = tabs.map(t => t.id === tabId ? { ...t, owner: newOwner } : t);
      saveTabsToCloud(newTabs);
      alert(`مالکیت تب با موفقیت به ${newOwner} منتقل شد.`);
  };

  const handleCopyTabToUser = (tabId: string, targetUser: string) => {
      if (!auth.currentUser || auth.currentUser.role !== 'admin') return;
      const sourceTab = tabs.find(t => t.id === tabId);
      if (!sourceTab) return;
      
      const newTab: FamilyTab = {
          ...sourceTab,
          id: `tab-${Date.now()}`,
          title: `${sourceTab.title} (کپی)`,
          owner: targetUser,
          isPublic: false 
      };
      const newTabs = [...tabs, newTab];
      saveTabsToCloud(newTabs);
      alert(`کپی شجره نامه برای کاربر ${targetUser} ایجاد شد.`);
  };

  const handleShareTab = (tabId: string, targetUser: string) => {
      if (!auth.currentUser) return;
      const tab = tabs.find(t => t.id === tabId);
      if (!tab) return;
      if (auth.currentUser.role !== 'admin' && tab.owner !== auth.currentUser.username) return alert("شما اجازه اشتراک‌گذاری این خاندان را ندارید.");

      const currentShares = tab.sharedWith || [];
      if (currentShares.includes(targetUser)) return alert("این کاربر قبلاً دسترسی دارد.");

      const newTabs = tabs.map(t => t.id === tabId ? { ...t, sharedWith: [...currentShares, targetUser] } : t);
      saveTabsToCloud(newTabs);
      alert(`دسترسی ویرایش به کاربر ${targetUser} داده شد.`);
  };

  const handleUnshareTab = (tabId: string, targetUser: string) => {
      if (!auth.currentUser) return;
      const tab = tabs.find(t => t.id === tabId);
      if (!tab) return;
      if (auth.currentUser.role !== 'admin' && tab.owner !== auth.currentUser.username) return alert("شما اجازه مدیریت دسترسی‌های این خاندان را ندارید.");

      const newTabs = tabs.map(t => t.id === tabId ? { ...t, sharedWith: (t.sharedWith || []).filter(u => u !== targetUser) } : t);
      saveTabsToCloud(newTabs);
      alert(`دسترسی کاربر ${targetUser} حذف شد.`);
  };

  const handleExtractSubtree = (personId: string, canEdit: boolean) => {
      if (!canEdit) {
          alert("شما دسترسی ویرایش این خاندان را ندارید.");
          return;
      }
      
      const nodeToExtract = findNodeById(activeTab.data, personId);
      if (!nodeToExtract) {
          alert("خطا: اطلاعات فرد یافت نشد.");
          return;
      }

      const newTabName = `خاندان ${nodeToExtract.name} ${nodeToExtract.surname || ''}`;
      const clonedData = JSON.parse(JSON.stringify(nodeToExtract));
      
      const newTab: FamilyTab = {
          id: `tab-${Date.now()}`,
          title: newTabName,
          data: clonedData,
          owner: auth.currentUser?.username || 'admin',
          isPublic: activeTab.isPublic
      };
      
      const newTabs = [...tabs, newTab];
      saveTabsToCloud(newTabs);
      
      setActiveTabId(newTab.id);
      
      alert(`خاندان جدید "${newTabName}" با موفقیت ایجاد شد.`);
  };

  const handleCreateMergedTab = (selectedTabIds: string[]) => {
      if (selectedTabIds.length < 2) return alert("لطفا حداقل ۲ خاندان را انتخاب کنید.");
      
      const selectedTabs = tabs.filter(t => selectedTabIds.includes(t.id));
      if (selectedTabs.length === 0) return;

      const mergedRootId = `merged-${Date.now()}`;
      const tabTitle = `تلفیق: ${selectedTabs.map(t => t.title).join(" و ")}`;

      const mergedData: Person = {
          id: mergedRootId,
          name: "اتحاد خاندان‌ها",
          children: selectedTabs.map(t => {
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
          owner: auth.currentUser?.username || 'admin',
          isPublic: false 
      };

      const newTabs = [...tabs, newTab];
      saveTabsToCloud(newTabs);
      setActiveTabId(newTab.id);
      alert(`تب تلفیقی "${tabTitle}" ایجاد شد.`);
  };

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
      } catch (err: any) { alert(err.message); }
  }, [activeTab.data, tabs]);

  const handleDeletePerson = useCallback((id: string) => {
     if (id === activeTab.data.id) return alert("ریشه قابل حذف نیست");
     const updatedTree = removePersonFromTree(activeTab.data, id);
     if (updatedTree) {
        handleUpdateActiveTree(updatedTree);
     }
  }, [activeTab.data, tabs]);

  const handleSaveLayout = useCallback((newLayout: any, listFilter: string) => {
      setLayoutConfig(prev => {
          const updatedFullConfig = { ...prev, [listFilter]: newLayout };
          if (!api.isOfflineMode) api.apiCall('layoutConfig', 'PUT', updatedFullConfig).catch(() => {});
          return updatedFullConfig;
      });
  }, [api]);

  const handleUpdateMarquee = (text: string) => {
      setMarqueeText(text);
      if (!api.isOfflineMode) api.apiCall('settings', 'PUT', { marquee: text }).catch(() => {});
  };

  // Callback to delete user's data
  const deleteUserData = (targetUser: string) => {
      const newTabs = tabs.map(t => {
          if (t.owner === targetUser) {
              return { ...t, deleted: true, deletedAt: Date.now() }; 
          }
          return t;
      });
      saveTabsToCloud(newTabs);
  };

  return {
      tabs, setTabs,
      activeTabId, setActiveTabId,
      visibleTabs, recycledTabs, activeTab,
      isLoaded,
      marqueeText, handleUpdateMarquee,
      layoutConfig, handleSaveLayout,
      fetchData,
      handleAddTab,
      handleRenameTab,
      handleTogglePrivacy,
      handleDeleteTab,
      handleRestoreTab,
      handlePermanentDeleteTab,
      handleTransferTab,
      handleCopyTabToUser,
      handleShareTab,
      handleUnshareTab,
      handleExtractSubtree,
      handleCreateMergedTab,
      handleUpdateLinkedTabs,
      handleUpdatePerson,
      handleAddChild,
      handleAddExistingChild,
      handleMoveSubtree,
      handleDeletePerson,
      handleBackup,
      handleRestore,
      deleteUserData
  };
};
