
import { useState, useCallback } from 'react';
import { productApi } from './api/productMode';
import { chatApi } from './api/chatMode';

export const useTreenetApi = () => {
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [offlineReason, setOfflineReason] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [dataETag, setDataETag] = useState<string | null>(null);

  const apiCall = useCallback(async (
      path: string, 
      method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', 
      body?: any, 
      retryCount = 0, 
      skipOfflineCheck = false, 
      extraHeaders: Record<string, string> = {}
  ): Promise<any> => {
      
      // Select Strategy
      const strategy = (isOfflineMode && !skipOfflineCheck) ? chatApi : productApi;

      try {
          const response = await strategy.execute(path, method, body, extraHeaders);
          
          if (response._headers && response._headers.get("ETag")) {
              setDataETag(response._headers.get("ETag"));
          }

          return response;

      } catch (error: any) {
          // Retry logic for Product Mode
          const isLogin = path.includes('login');
          const isSystem = path.startsWith('_system/');
          
          // Retry once for network glitches (GET only or specific cases)
          if (strategy === productApi && !isOfflineMode && !isLogin && !isSystem && retryCount < 1 && (error.name === 'AbortError' || error.message === "Failed to fetch")) {
              console.log(`Retrying API call (${retryCount + 1})...`);
              return apiCall(path, method, body, retryCount + 1, skipOfflineCheck, extraHeaders);
          }

          // DEVELOPMENT ONLY FALLBACK
          // In production, we MUST fail if the server is down to prevent security bypass or confusion.
          if (import.meta.env.DEV && strategy === productApi && !isOfflineMode) {
               console.warn("Development Mode: API unavailable, switching to Mock/Chat mode.");
               setIsOfflineMode(true);
               setOfflineReason("حالت توسعه (آفلاین/ماک)");
               return chatApi.execute(path, method, body, extraHeaders);
          }

          // In PRODUCTION, propagate error directly so the UI knows the server failed
          throw error;
      }
  }, [isOfflineMode]);

  return {
      isOfflineMode,
      setIsOfflineMode,
      offlineReason,
      setOfflineReason,
      isSaving,
      setIsSaving,
      dataETag,
      setDataETag,
      apiCall
  };
};
