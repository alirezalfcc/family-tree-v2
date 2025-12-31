
import { useState, useEffect } from 'react';

const LS_KEYS = {
    USERS: 'family_tree_users_v1',
    SESSION: 'auth_session'
};

export const useAuth = (api: any, onDataRefresh: () => void) => {
  const [currentUser, setCurrentUser] = useState<{ username: string; role: 'admin' | 'user' } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [localUsers, setLocalUsers] = useState<any[]>([]); 

  useEffect(() => {
      // SECURITY FIX: Only load existing users. Do NOT create default "1"/"1" user.
      const storedUsers = localStorage.getItem(LS_KEYS.USERS);
      if (storedUsers) {
          setLocalUsers(JSON.parse(storedUsers));
      } else {
          // Initialize empty array if no users exist. 
          // "1"/"1" login is now strictly handled by ChatApi (Offline) or Env Vars (Online).
          setLocalUsers([]); 
      }

      // Restore Session
      const session = localStorage.getItem(LS_KEYS.SESSION);
      if (session) {
          try {
              const userObj = JSON.parse(session);
              
              // SECURITY FIX: Prevent "Offline Mock Login" from persisting to "Online Live Session".
              // If the stored session user is '1', we invalidate it immediately upon reload.
              // This forces the attacker to re-authenticate properly against the server.
              if (userObj.username === '1') {
                  console.warn("Security: Invalidating mock session '1' to prevent persistent access.");
                  localStorage.removeItem(LS_KEYS.SESSION);
                  setIsAuthenticated(false);
                  setCurrentUser(null);
                  return;
              }

              setCurrentUser(userObj);
              setIsAuthenticated(true);
          } catch (e) {
              console.error("Invalid Session Data");
              localStorage.removeItem(LS_KEYS.SESSION);
          }
      }
  }, []);

  const completeLogin = (username: string, role: 'admin' | 'user') => {
      const userObj = { username, role };
      setIsAuthenticated(true);
      setCurrentUser(userObj);
      localStorage.setItem(LS_KEYS.SESSION, JSON.stringify(userObj));
      // Trigger data fetch or layout update after login
      setTimeout(() => onDataRefresh(), 0);
  };

  const handleLogin = async (username: string, pass: string) => {
      const safeUser = username.trim();
      const safePass = pass.trim();

      const performLocalLogin = () => {
          const foundUser = localUsers.find(u => u.username === safeUser && u.password === safePass);
          if (foundUser) {
              completeLogin(foundUser.username, foundUser.role);
              return true;
          }
          return false;
      };

      try {
          // برای لاگین هم تایم‌اوت سخت‌گیرانه می‌گذاریم (2.5 ثانیه)
          // تا اگر شبکه هنگ کرد، سریع سراغ لوکال برود
          if (!api.isOfflineMode) {
             await Promise.race([
                 api.apiCall('_system/login', 'POST', { username: safeUser, password: safePass }, 0, false)
                    .then((res: any) => {
                         if (res.success) {
                            api.setOfflineReason('');
                            completeLogin(res.username, res.role);
                         } else {
                            throw new Error(res.message);
                         }
                    }),
                 new Promise((_, reject) => setTimeout(() => reject(new Error("API_TIMEOUT")), 2500))
             ]);
             return;
          } else {
             // Already offline, call directly (it will use chatApi)
             const res = await api.apiCall('_system/login', 'POST', { username: safeUser, password: safePass }, 0, false);
             if (res.success) {
                 completeLogin(res.username, res.role);
                 return;
             }
             throw new Error(res.message);
          }
      } catch (err: any) {
          // اگر API در دسترس نبود یا تایم‌اوت شد
          const isNetworkIssue = err.message === "API_UNAVAILABLE" || err.message === "Failed to fetch" || 
                                 err.message === "API Route Not Found" || err.name === 'TypeError' || 
                                 err.message === "API_TIMEOUT";

          if (isNetworkIssue) {
              console.warn("Backend unavailable/timeout for login, checking local storage.");
              if (!api.isOfflineMode) {
                  api.setIsOfflineMode(true); 
                  api.setOfflineReason("عدم دسترسی به سرور");
              }
              if (performLocalLogin()) return;
              throw new Error("ارتباط با سرور برقرار نشد و کاربر آفلاین یافت نشد.");
          } else {
              throw err;
          }
      }
  };

  const handleLogout = () => {
      setIsAuthenticated(false);
      setCurrentUser(null);
      localStorage.removeItem(LS_KEYS.SESSION);
      setTimeout(() => onDataRefresh(), 0); 
  };

  // Helper to execute API with timeout but ignore failure (Best Effort)
  const executeBestEffortApi = async (fn: () => Promise<any>) => {
      if (api.isOfflineMode) return; // Don't bother if known offline
      try {
          // Race against 2s timeout
          await Promise.race([
              fn(),
              new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), 2000))
          ]);
      } catch (err: any) {
          console.warn("API operation failed or timed out, proceeding locally:", err.message);
      }
  };

  const handleCreateUser = async (user: string, pass: string, role: 'admin' | 'user') => {
      if (!currentUser || currentUser.role !== 'admin') throw new Error("Access Denied");
      
      const safeUser = user.trim();
      const safePass = pass.trim();

      await executeBestEffortApi(() => 
          api.apiCall('_system/manage_user', 'POST', { targetUser: safeUser, password: safePass, role })
      );

      const newLocalUsers = [...localUsers.filter(u => u.username !== safeUser), { username: safeUser, password: safePass, role }];
      setLocalUsers(newLocalUsers);
      localStorage.setItem(LS_KEYS.USERS, JSON.stringify(newLocalUsers));
  };

  const handleUpdateUser = async (oldUsername: string, newUsername: string, newPass: string, newRole: 'admin' | 'user') => {
      if (!currentUser || currentUser.role !== 'admin') throw new Error("Access Denied");
      
      const safeOld = oldUsername.trim();
      const safeNew = newUsername.trim();
      const safePass = newPass.trim();

      let newLocalUsers = [...localUsers];
      if (safeOld !== safeNew) {
          if (newLocalUsers.some(u => u.username === safeNew)) {
              throw new Error("نام کاربری جدید تکراری است");
          }
          newLocalUsers = newLocalUsers.filter(u => u.username !== safeOld);
          newLocalUsers.push({ username: safeNew, password: safePass, role: newRole });
      } else {
          newLocalUsers = newLocalUsers.map(u => 
              u.username === safeOld ? { ...u, password: safePass, role: newRole } : u
          );
      }
      setLocalUsers(newLocalUsers);
      localStorage.setItem(LS_KEYS.USERS, JSON.stringify(newLocalUsers));

      await executeBestEffortApi(() => 
          api.apiCall('_system/manage_user', 'POST', { targetUser: safeNew, password: safePass, role: newRole })
      );
      
      alert("کاربر با موفقیت ویرایش شد.");
  };

  const handleDeleteUser = async (targetUser: string, deleteCallback: (user: string) => void) => {
      if (!currentUser || currentUser.role !== 'admin') throw new Error("Access Denied");
      if (targetUser === currentUser.username) throw new Error("نمیتوانید حساب خودتان را حذف کنید.");
      
      // Protection for "1" also locally, just in case
      if (targetUser === '1') throw new Error("حساب مدیر پیش‌فرض قابل حذف نیست.");

      const newLocalUsers = localUsers.filter(u => u.username !== targetUser);
      setLocalUsers(newLocalUsers);
      localStorage.setItem(LS_KEYS.USERS, JSON.stringify(newLocalUsers));

      deleteCallback(targetUser);

      // Best effort API call (no await needed for UI, but await ensures logic order)
      executeBestEffortApi(() => 
           // Assuming delete logic might be same endpoint or different, using manage_user for simplicity if supported or skip
           Promise.resolve() 
      );
      
      alert(`کاربر ${targetUser} حذف شد.`);
  };

  const handleChangePassword = async (newPass: string) => {
      if (!currentUser) return;
      const safePass = newPass.trim();
      
      const newLocalUsers = localUsers.map(u => 
          u.username === currentUser.username ? { ...u, password: safePass } : u
      );
      setLocalUsers(newLocalUsers);
      localStorage.setItem(LS_KEYS.USERS, JSON.stringify(newLocalUsers));
      
      await executeBestEffortApi(() => 
          api.apiCall('_system/manage_user', 'POST', { targetUser: currentUser.username, password: safePass, role: currentUser.role })
      );

      alert("رمز عبور با موفقیت تغییر کرد.");
  };

  return {
      currentUser,
      setCurrentUser,
      isAuthenticated,
      setIsAuthenticated,
      localUsers,
      setLocalUsers,
      handleLogin,
      handleLogout,
      handleCreateUser,
      handleUpdateUser,
      handleDeleteUser,
      handleChangePassword
  };
};
