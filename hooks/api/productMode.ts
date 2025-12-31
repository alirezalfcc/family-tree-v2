
import { ApiStrategy } from './types';

// استراتژی محیط واقعی (Product Mode)
// این فایل مسئول ارتباط با سرور واقعی و پروکسی است.
export const productApi: ApiStrategy = {
    execute: async (path, method, body, extraHeaders = {}) => {
        const controller = new AbortController();
        
        // اگر درخواست لاگین یا سیستمی است، تایم‌آوت را کوتاه (2 ثانیه) در نظر بگیر
        const isLogin = path.includes('login');
        const isSystem = path.startsWith('_system/');
        const timeoutDuration = (isLogin || isSystem) ? 2000 : 8000;
        
        const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

        try {
            const options: RequestInit = {
                method,
                headers: { 
                    'Content-Type': 'application/json',
                    ...extraHeaders
                },
                cache: 'no-store',
                signal: controller.signal
            };
            
            if (body) options.body = JSON.stringify(body);
            
            // استفاده از تایم‌استمپ برای جلوگیری از کش شدن
            const proxyUrl = `/api/proxy?path=${encodeURIComponent(path)}&_t=${Date.now()}`;
            
            const response = await fetch(proxyUrl, options);
            clearTimeout(timeoutId);

            // بررسی نوع محتوا برای تشخیص خطاهای HTML (مثل صفحه 404 سرورهای SPA)
            const contentType = response.headers.get("content-type");
            if (contentType && (contentType.includes("text/html") || contentType.includes("text/plain"))) {
                throw new Error("API_UNAVAILABLE");
            }

            const text = await response.text();
            if (!text) {
                if (response.ok) return {}; 
                throw new Error("API_UNAVAILABLE");
            }

            let json;
            try {
                json = JSON.parse(text);
            } catch (e) {
                throw new Error("API_UNAVAILABLE");
            }

            if (response.status === 404) throw new Error("API Route Not Found");
            
            if (!response.ok) {
                // مدیریت خطای تداخل داده (Optimistic Locking)
                if (response.status === 412 || json.status === 412) {
                    throw new Error("DATA_CONFLICT");
                }
                throw new Error(json.detail || json.error || `Error ${response.status}`);
            }

            // بازگرداندن پاسخ به همراه هدرها (برای ETag)
            return { ...json, _headers: response.headers };

        } catch (error: any) {
            clearTimeout(timeoutId);
            // هرگونه خطای شبکه یا تایم اوت را به عنوان عدم دسترسی تلقی کن
            if (error.name === 'AbortError' || error.message === 'Failed to fetch' || error.name === 'TypeError') {
                throw new Error("API_UNAVAILABLE");
            }
            throw error;
        }
    }
};
