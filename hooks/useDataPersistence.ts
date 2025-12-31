import React, { useState, useCallback } from 'react';
import { FamilyTab } from '../types';
import { 
  updatePersonInTree, 
  addChildToTree, 
  movePersonInTree, 
  removePersonFromTree,
  findNodeById
} from '../utils/genealogy';

const LS_KEYS = {
    DATA: 'family_tree_data_v4',
    SESSION: 'auth_session'
};

interface UseDataPersistenceParams {
    api: any;
    auth: any;
    setTabs: React.Dispatch<React.SetStateAction<FamilyTab[]>>;
    setActiveTabId: React.Dispatch<React.SetStateAction<string>>;
    setMarqueeText: React.Dispatch<React.SetStateAction<string>>;
    setLayoutConfig: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    tabs: FamilyTab[];
    marqueeText: string;
    layoutConfig: Record<string, any>;
}

export const useDataPersistence = ({
    api, auth, setTabs, setActiveTabId, setMarqueeText, setLayoutConfig, tabs, marqueeText, layoutConfig
}: UseDataPersistenceParams) => {
    
    const [isLoaded, setIsLoaded] = useState(false);

    // Helper to process raw data from API or LocalStorage
    const processFetchedData = useCallback((data: any, userOverride?: { username: string; role: 'admin' | 'user' } | null) => {
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
            loadedTabs = []; 
        }
        
        if (data.settings?.marquee) setMarqueeText(data.settings.marquee);
        if (data.layoutConfig) setLayoutConfig(data.layoutConfig);

        let effectiveUser = userOverride;
        if (effectiveUser === undefined) {
           if (auth.currentUser) {
               effectiveUser = auth.currentUser;
           } else {
               const session = localStorage.getItem(LS_KEYS.SESSION);
               if (session) {
                   effectiveUser = JSON.parse(session);
                   if (!auth.currentUser) {
                       auth.setCurrentUser(effectiveUser);
                       auth.setIsAuthenticated(true);
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
    }, [auth, setTabs, setActiveTabId, setMarqueeText, setLayoutConfig]);

    const fetchData = useCallback(async (userOverride?: { username: string; role: 'admin' | 'user' } | null) => {
        try {
            let data;
            try {
                 const shouldForce = api.isOfflineMode; 
                 data = await api.apiCall('', 'GET', undefined, 0, shouldForce); 
                 
                 if (api.isOfflineMode) {
                     api.setIsOfflineMode(false);
                     api.setOfflineReason('');
                 }
            } catch (e) { throw e; }

            if (!data) throw new Error("Fetching local");
            processFetchedData(data, userOverride);
        } catch (error: any) {
            console.warn("Loading Offline Data:", error);
            if (!api.isOfflineMode) {
                api.setIsOfflineMode(true);
                api.setOfflineReason("اتصال به سرور برقرار نیست (حالت پیش‌نمایش)");
            }
            const localData = localStorage.getItem(LS_KEYS.DATA);
            if (localData) {
                const parsed = JSON.parse(localData);
                processFetchedData({ familyTabs: parsed }, userOverride);
            } else {
                // Lazy Load Default Data
                try {
                    const module = await import('../data');
                    processFetchedData({ 
                        familyTabs: [{ 
                            id: 'default', 
                            title: 'خاندان پیش‌فرض', 
                            data: module.familyData, 
                            isPublic: true, 
                            owner: 'admin' 
                        }] 
                    }, userOverride);
                } catch (e) {
                    console.error("Failed to load default data", e);
                }
            }
        } finally {
            setIsLoaded(true);
        }
    }, [api, processFetchedData]);

    const saveTabsToCloud = useCallback((newTabs: FamilyTab[]) => {
      setTabs(newTabs);
      localStorage.setItem(LS_KEYS.DATA, JSON.stringify(newTabs));
      if (!api.isOfflineMode) {
        api.setIsSaving(true);
        
        // Use ETag for Optimistic Locking
        const headers = api.dataETag ? { 'If-Match': api.dataETag } : {};
        
        api.apiCall('familyTabs', 'PUT', newTabs, 0, false, headers)
          .then(() => setTimeout(() => api.setIsSaving(false), 500))
          .catch((err: any) => { 
              api.setIsSaving(false);
              if (err.message === "DATA_CONFLICT") {
                  alert("هشدار: اطلاعات روی سرور توسط مدیر دیگری تغییر کرده است. تغییرات شما ذخیره نشد. لطفا صفحه را رفرش کنید تا آخرین تغییرات را دریافت کنید.");
              } else {
                  console.error("Save failed", err);
              }
          });
      }
    }, [api, setTabs]);

    const handleBackup = async () => {
        if (!auth.currentUser || auth.currentUser.role !== 'admin') throw new Error("Access Denied");
        try {
           return await api.apiCall('_system/backup', 'GET');
        } catch (err: any) {
           if (err.message === "API_UNAVAILABLE") {
               return { familyTabs: tabs, settings: { marquee: marqueeText }, layoutConfig, users: auth.localUsers };
           }
           throw err;
        }
    };

    const handleRestore = async (data: any) => {
        if (!auth.currentUser || auth.currentUser.role !== 'admin') throw new Error("Access Denied");
        
        const restoreLocalState = (dataToRestore: any) => {
            if (dataToRestore.familyTabs) setTabs(dataToRestore.familyTabs);
            if (dataToRestore.settings?.marquee) setMarqueeText(dataToRestore.settings.marquee);
            if (dataToRestore.users) {
                auth.setLocalUsers(dataToRestore.users);
                localStorage.setItem(LS_KEYS.SESSION.replace('auth_session', 'family_tree_users_v1'), JSON.stringify(dataToRestore.users));
            }
            localStorage.setItem(LS_KEYS.DATA, JSON.stringify(dataToRestore.familyTabs || tabs));
        };

        try {
            if (!api.isOfflineMode) {
               await api.apiCall('_system/restore', 'POST', data);
            }
            restoreLocalState(data);
        } catch (err: any) {
            if (err.message === "API_UNAVAILABLE") {
                restoreLocalState(data);
                return;
            }
            throw err;
        }
    };

    return {
        isLoaded,
        fetchData,
        saveTabsToCloud,
        handleBackup,
        handleRestore
    };
};