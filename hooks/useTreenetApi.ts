
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
      
      // انتخاب استراتژی
      const strategy = (isOfflineMode && !skipOfflineCheck) ? chatApi : productApi;

      try {
          const response = await strategy.execute(path, method, body, extraHeaders);
          
          if (response._headers && response._headers.get("ETag")) {
              setDataETag(response._headers.get("ETag"));
          }

          return response;

      } catch (error: any) {
          // شناسایی خطاهای شبکه برای سوئیچ به حالت چت/آفلاین
          const isNetworkError = error.message === "API_UNAVAILABLE" || error.message === "Failed to fetch" || error.message === "API Route Not Found";
          
          // اگر استراتژی فعلی Product بود و خطا داد:
          if (strategy === productApi && isNetworkError) {
              console.warn("Switching to Chat/Offline Mode due to error:", error.message);
              
              // 1. سوئیچ وضعیت به آفلاین
              setIsOfflineMode(true);
              setOfflineReason("عدم دسترسی به سرور (حالت چت/آفلاین)");

              // 2. بلافاصله درخواست را با Chat API اجرا کن (Failover)
              // این باعث می‌شود کاربر اصلا متوجه خطا نشود و مستقیما لاگین لوکال انجام شود
              return chatApi.execute(path, method, body, extraHeaders);
          }

          // مدیریت تلاش مجدد (Retry) فقط برای Product Mode
          // نکته مهم: برای لاگین (login) و درخواست‌های سیستمی (_system) تلاش مجدد نمی‌کنیم تا سریع فیل شود
          const isLogin = path.includes('login');
          const isSystem = path.startsWith('_system/');
          
          if (strategy === productApi && !isOfflineMode && !isLogin && !isSystem && retryCount < 1 && (error.name === 'AbortError' || error.message === "Failed to fetch")) {
              console.log(`Retrying API call (${retryCount + 1})...`);
              return apiCall(path, method, body, retryCount + 1, skipOfflineCheck, extraHeaders);
          }

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
