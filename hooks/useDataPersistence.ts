
import React, { useState, useCallback } from 'react';
import { FamilyTab } from '../types';

const LS_KEYS = {
    DATA: 'family_tree_data_v6_4', // Key preserved
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

        // IMPORTANT FIX: 
        // We do NOT filter tabs here based on access anymore. 
        // We load ALL tabs into state to ensure that when a user saves data, 
        // they don't accidentally delete other users' private tabs that were filtered out.
        // Visibility filtering is now handled in useFamilyData -> visibleTabs.
        setTabs(loadedTabs);
        
        // However, for setting the *initial active tab*, we should pick one that is likely visible/public
        // We make a best guess here, checking for public tabs first.
        const candidates = loadedTabs.filter(t => !t.deleted);
        const publicTab = candidates.find(t => t.isPublic);
        
        if (publicTab) {
             setActiveTabId(prev => candidates.some(t => t.id === prev) ? prev : publicTab.id);
        } else if (candidates.length > 0) {
             setActiveTabId(prev => candidates.some(t => t.id === prev) ? prev : candidates[0].id);
        }

    }, [setTabs, setActiveTabId, setMarqueeText, setLayoutConfig]);

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

            // Check if API returned effectively empty data
            let isEmpty = false;
            if (!data.familyTabs && !data.id && Array.isArray(data) && data.length === 0) isEmpty = true;
            if (data.familyTabs && data.familyTabs.length === 0) isEmpty = true;
            if (Object.keys(data).length === 0) isEmpty = true;

            if (isEmpty) {
                 // 1. Try loading local storage first (unsaved work)
                 const localData = localStorage.getItem(LS_KEYS.DATA);
                 if (localData) {
                     const parsed = JSON.parse(localData);
                     if (parsed && parsed.length > 0) {
                         data = { familyTabs: parsed, ...data };
                     }
                 }
                 
                 // 2. If still empty, seed with hardcoded DEFAULT DATA
                 let stillEmpty = false; 
                 if (!data.familyTabs || data.familyTabs.length === 0) stillEmpty = true;
                 
                 if (stillEmpty) {
                     try {
                        const module: any = await import('../data');
                        if (module.defaultFamilyTabs) {
                            data = {
                                familyTabs: module.defaultFamilyTabs,
                                layoutConfig: module.defaultLayoutConfig,
                                settings: module.defaultSettings
                            };
                        } else {
                            data = { 
                                familyTabs: [{ 
                                    id: 'default', 
                                    title: 'خاندان پیش‌فرض', 
                                    data: module.familyData, 
                                    isPublic: true, 
                                    owner: 'admin' 
                                }],
                                ...data
                            };
                        }
                     } catch(e) { console.error("Failed to load default seed data", e); }
                 }
            }

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
                try {
                    const module: any = await import('../data');
                    if (module.defaultFamilyTabs) {
                         processFetchedData({ 
                            familyTabs: module.defaultFamilyTabs,
                            layoutConfig: module.defaultLayoutConfig,
                            settings: module.defaultSettings
                         }, userOverride);
                    } else {
                        processFetchedData({ 
                            familyTabs: [{ 
                                id: 'default', 
                                title: 'خاندان پیش‌فرض', 
                                data: module.familyData, 
                                isPublic: true, 
                                owner: 'admin' 
                            }] 
                        }, userOverride);
                    }
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
