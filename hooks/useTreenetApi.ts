
import { useState, useCallback } from 'react';
import { productApi } from './api/productMode';
import { chatApi } from './api/chatMode';

export const useTreenetApi = () => {
  // In production/secured version, default is ALWAYS false and cannot be auto-switched by errors.
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
      // SECURITY FIX: Only use chatApi if isOfflineMode is explicitly true (e.g. set by developer tool, not by error fallback)
      const strategy = (isOfflineMode && !skipOfflineCheck) ? chatApi : productApi;

      try {
          const response = await strategy.execute(path, method, body, extraHeaders);
          
          if (response._headers && response._headers.get("ETag")) {
              setDataETag(response._headers.get("ETag"));
          }

          return response;

      } catch (error: any) {
          // SECURITY FIX: Removed the "Switch to Chat/Offline Mode" block.
          // If the network fails, we must FAIL securely, not fallback to an insecure mock mode.
          
          // Retry logic for Product Mode (unchanged)
          const isLogin = path.includes('login');
          const isSystem = path.startsWith('_system/');
          
          if (strategy === productApi && !isOfflineMode && !isLogin && !isSystem && retryCount < 1 && (error.name === 'AbortError' || error.message === "Failed to fetch")) {
              console.log(`Retrying API call (${retryCount + 1})...`);
              return apiCall(path, method, body, retryCount + 1, skipOfflineCheck, extraHeaders);
          }

          // Propagate the error to the UI
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
