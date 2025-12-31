
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
      // Load local users just for listing in admin panel (if needed), but NOT for login validation fallback.
      const storedUsers = localStorage.getItem(LS_KEYS.USERS);
      if (storedUsers) {
          setLocalUsers(JSON.parse(storedUsers));
      } else {
          setLocalUsers([]); 
      }

      // Restore Session
      const session = localStorage.getItem(LS_KEYS.SESSION);
      if (session) {
          try {
              const userObj = JSON.parse(session);
              
              // SECURITY FIX: Invalidating mock session '1' if it exists in storage.
              if (userObj.username === '1') {
                  console.warn("Security: Invalidating mock session '1'.");
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
      setTimeout(() => onDataRefresh(), 0);
  };

  const handleLogin = async (username: string, pass: string) => {
      const safeUser = username.trim();
      const safePass = pass.trim();

      // SECURITY FIX: 'performLocalLogin' removed from execution flow when Online.
      // We only strictly rely on the API response.

      try {
          // Attempt Login via API
          // Even if api.isOfflineMode is false, we force it to try the network.
          // Since we removed the auto-offline switch in useTreenetApi, this will either succeed or fail with an error.
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
                 new Promise((_, reject) => setTimeout(() => reject(new Error("API_TIMEOUT")), 3000))
          ]);
      } catch (err: any) {
          // SECURITY FIX: Do NOT fallback to local storage if API fails.
          // Just throw the error to the UI.
          console.error("Login failed:", err.message);
          throw new Error("خطا در ورود: ارتباط با سرور برقرار نشد یا مشخصات اشتباه است.");
      }
  };

  const handleLogout = () => {
      setIsAuthenticated(false);
      setCurrentUser(null);
      localStorage.removeItem(LS_KEYS.SESSION);
      setTimeout(() => onDataRefresh(), 0); 
  };

  // Helper to execute API with timeout (Best Effort for CRUD operations)
  const executeBestEffortApi = async (fn: () => Promise<any>) => {
      if (api.isOfflineMode) return; 
      try {
          await Promise.race([
              fn(),
              new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), 2000))
          ]);
      } catch (err: any) {
          console.warn("API operation warning:", err.message);
      }
  };

  const handleCreateUser = async (user: string, pass: string, role: 'admin' | 'user') => {
      if (!currentUser || currentUser.role !== 'admin') throw new Error("Access Denied");
      
      const safeUser = user.trim();
      const safePass = pass.trim();

      // Call API first
      await executeBestEffortApi(() => 
          api.apiCall('_system/manage_user', 'POST', { targetUser: safeUser, password: safePass, role })
      );

      // Update local state for UI consistency
      const newLocalUsers = [...localUsers.filter(u => u.username !== safeUser), { username: safeUser, password: safePass, role }];
      setLocalUsers(newLocalUsers);
      localStorage.setItem(LS_KEYS.USERS, JSON.stringify(newLocalUsers));
  };

  const handleUpdateUser = async (oldUsername: string, newUsername: string, newPass: string, newRole: 'admin' | 'user') => {
      if (!currentUser || currentUser.role !== 'admin') throw new Error("Access Denied");
      
      const safeOld = oldUsername.trim();
      const safeNew = newUsername.trim();
      const safePass = newPass.trim();

      // Check duplicates locally first
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
      
      if (targetUser === '1') throw new Error("حساب مدیر پیش‌فرض قابل حذف نیست.");

      const newLocalUsers = localUsers.filter(u => u.username !== targetUser);
      setLocalUsers(newLocalUsers);
      localStorage.setItem(LS_KEYS.USERS, JSON.stringify(newLocalUsers));

      deleteCallback(targetUser);

      executeBestEffortApi(() => 
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
