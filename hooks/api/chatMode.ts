
import { ApiStrategy } from './types';

const LS_KEYS = {
    DATA: 'family_tree_data_v4',
    USERS: 'family_tree_users_v1',
};

// استراتژی محیط چت/توسعه (Chat Mode)
// این فایل رفتار سرور را شبیه‌سازی می‌کند تا بدون نیاز به اینترنت یا سرور واقعی
// اپلیکیشن در محیط چت به درستی کار کند.
export const chatApi: ApiStrategy = {
    execute: async (path, method, body) => {
        // شبیه‌سازی تاخیر شبکه (خیلی کوتاه برای تجربه کاربری روان)
        await new Promise(resolve => setTimeout(resolve, 300));

        console.log(`[ChatMode API] ${method} ${path}`, body);

        // 1. شبیه‌سازی لاگین
        if (path === '_system/login' && method === 'POST') {
            const { username, password } = body;
            
            // بررسی ادمین پیش‌فرض
            if (username === '1' && password === '1') {
                return { success: true, role: 'admin', username: '1' };
            }

            // بررسی کاربران تعریف شده در لوکال استوریج
            const storedUsers = localStorage.getItem(LS_KEYS.USERS);
            if (storedUsers) {
                const users = JSON.parse(storedUsers);
                const found = users.find((u: any) => u.username === username && u.password === password);
                if (found) {
                    return { success: true, role: found.role, username: found.username };
                }
            }

            throw new Error("نام کاربری یا رمز عبور اشتباه است (محیط آزمایشی)");
        }

        // 2. دریافت کل اطلاعات (GET Root)
        if (path === '' && method === 'GET') {
            const localData = localStorage.getItem(LS_KEYS.DATA);
            return localData ? { familyTabs: JSON.parse(localData) } : null;
        }

        // 3. ذخیره اطلاعات (PUT familyTabs)
        if (path === 'familyTabs' && method === 'PUT') {
            localStorage.setItem(LS_KEYS.DATA, JSON.stringify(body));
            return { success: true };
        }

        // 4. مدیریت تنظیمات (Settings)
        if (path === 'settings' && method === 'PUT') {
            // در حالت چت، تنظیمات سراسری ذخیره نمی‌شوند یا در لوکال جداگانه مدیریت می‌شوند
            return { success: true };
        }

        // 5. مدیریت کاربران (Manage User)
        if (path === '_system/manage_user' && method === 'POST') {
            // عملیات واقعی روی لوکال استوریج در useAuth انجام می‌شود، اینجا فقط تایید می‌کنیم
            return { success: true };
        }

        // پیش‌فرض برای سایر درخواست‌ها
        console.warn(`[ChatMode] Route not handled: ${path}`);
        return {};
    }
};
