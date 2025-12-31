
import { ApiStrategy } from './types';

// استراتژی محیط واقعی (Product Mode)
export const productApi: ApiStrategy = {
    execute: async (path, method, body, extraHeaders = {}) => {
        const controller = new AbortController();
        
        // Timeout configuration
        const isLogin = path === 'login' || path.includes('login');
        const isSystem = path.startsWith('_system/');
        const timeoutDuration = (isLogin || isSystem) ? 15000 : 20000;
        
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
            
            const proxyUrl = `/api/proxy?path=${encodeURIComponent(path)}&_t=${Date.now()}`;
            
            const response = await fetch(proxyUrl, options);
            clearTimeout(timeoutId);

            // 1. Check HTTP Status FIRST
            if (response.status === 404) {
                // Return a specific error code that useTreenetApi or useAuth can recognize
                throw new Error("API_ROUTE_NOT_FOUND"); 
            }
            if (response.status === 500) {
                throw new Error("API_SERVER_ERROR");
            }

            // 2. Check Content Type
            const contentType = response.headers.get("content-type");
            const isJson = contentType && contentType.includes("application/json");

            const text = await response.text();
            
            if (!text) {
                if (response.ok) return {}; 
                throw new Error("API_EMPTY_RESPONSE");
            }

            // 3. Parse JSON safely
            let json;
            if (isJson || (text.startsWith('{') || text.startsWith('['))) {
                try {
                    json = JSON.parse(text);
                } catch (e) {
                    console.error("JSON Parse Error. Body:", text.substring(0, 100));
                    throw new Error("API_INVALID_JSON");
                }
            } else {
                // If not JSON and error status, throw text
                if (!response.ok) throw new Error(text || `Error ${response.status}`);
                // If OK but not JSON (unexpected)
                console.warn("API returned non-JSON:", text.substring(0, 50));
                return { data: text }; 
            }

            // 4. Handle Logic Errors
            if (!response.ok) {
                if (response.status === 412 || json.status === 412) {
                    throw new Error("DATA_CONFLICT");
                }
                if (response.status === 401) {
                    const authError = new Error(json.message || "Unauthorized");
                    (authError as any).status = 401;
                    throw authError;
                }
                throw new Error(json.detail || json.error || json.message || `Error ${response.status}`);
            }

            return { ...json, _headers: response.headers };

        } catch (error: any) {
            clearTimeout(timeoutId);
            
            // Pass through specific auth errors
            if (error.status === 401) throw error;

            // Treat network errors, timeouts, and 500s as UNAVAILABLE
            if (
                error.name === 'AbortError' || 
                error.message === 'Failed to fetch' || 
                error.name === 'TypeError'
            ) {
                throw new Error("API_UNAVAILABLE");
            }
            
            // Allow API_ROUTE_NOT_FOUND to bubble up without modification
            // so useAuth can display a friendly message instead of "Critical..."
            
            throw error;
        }
    }
};
