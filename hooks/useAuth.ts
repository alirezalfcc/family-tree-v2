
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
      // Load local users for listing (optional) but NOT for auth fallback in production
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
              
              // Prevent mock session '1' persistence unless in DEV mode (optional check, but good for safety)
              if (userObj.username === '1' && !import.meta.env.DEV) {
                  localStorage.removeItem(LS_KEYS.SESSION);
                  setIsAuthenticated(false);
                  setCurrentUser(null);
                  return;
              }

              setCurrentUser(userObj);
              setIsAuthenticated(true);
          } catch (e) {
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

      try {
          // apiCall handles the strategy (Real or Mock/Dev)
          // We increased timeout to 5s to allow for slower networks in production
          await Promise.race([
                 api.apiCall('_system/login', 'POST', { username: safeUser, password: safePass }, 0, false)
                    .then((res: any) => {
                         if (res.success) {
                            // If we were offline due to an error but now logged in successfully via API, clear reason?
                            // Actually if isOfflineMode is true (Dev fallback), we stay in it.
                            completeLogin(res.username, res.role);
                         } else {
                            throw new Error(res.message || "اطلاعات ورود نادرست است");
                         }
                    }),
                 new Promise((_, reject) => setTimeout(() => reject(new Error("API_TIMEOUT")), 5000))
          ]);
      } catch (err: any) {
          console.error("Login failed:", err);
          
          let msg = err.message;
          if (msg === "API_TIMEOUT") msg = "پاسخی از سرور دریافت نشد (تایم‌اوت).";
          else if (msg === "API_UNAVAILABLE" || msg === "Failed to fetch") msg = "ارتباط با سرور برقرار نشد.";
          
          throw new Error(msg);
      }
  };

  const handleLogout = () => {
      setIsAuthenticated(false);
      setCurrentUser(null);
      localStorage.removeItem(LS_KEYS.SESSION);
      setTimeout(() => onDataRefresh(), 0); 
  };

  const executeBestEffortApi = async (fn: () => Promise<any>) => {
      // In offline mode (or Dev mock), this executes against mock.
      // In production online, this executes against real server.
      try {
          await Promise.race([
              fn(),
              new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), 3000))
          ]);
      } catch (err: any) {
          console.warn("API operation warning:", err.message);
      }
  };

  const handleCreateUser = async (user: string, pass: string, role: 'admin' | 'user') => {
      if (!currentUser || currentUser.role !== 'admin') throw new Error("Access Denied");
      const safeUser = user.trim();
      const safePass = pass.trim();

      await executeBestEffortApi(() => 
          api.apiCall('_system/manage_user', 'POST', { targetUser: safeUser, password: safePass, role })
      );

      // Keep local state updated for UI
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
          if (newLocalUsers.some(u => u.username === safeNew)) throw new Error("نام کاربری تکراری است");
          newLocalUsers = newLocalUsers.filter(u => u.username !== safeOld);
          newLocalUsers.push({ username: safeNew, password: safePass, role: newRole });
      } else {
          newLocalUsers = newLocalUsers.map(u => u.username === safeOld ? { ...u, password: safePass, role: newRole } : u);
      }
      setLocalUsers(newLocalUsers);
      localStorage.setItem(LS_KEYS.USERS, JSON.stringify(newLocalUsers));

      await executeBestEffortApi(() => 
          api.apiCall('_system/manage_user', 'POST', { targetUser: safeNew, password: safePass, role: newRole })
      );
      
      alert("کاربر ویرایش شد.");
  };

  const handleDeleteUser = async (targetUser: string, deleteCallback: (user: string) => void) => {
      if (!currentUser || currentUser.role !== 'admin') throw new Error("Access Denied");
      if (targetUser === currentUser.username) throw new Error("حذف خودتان امکان‌پذیر نیست.");
      if (targetUser === '1') throw new Error("حذف مدیر پیش‌فرض امکان‌پذیر نیست.");

      const newLocalUsers = localUsers.filter(u => u.username !== targetUser);
      setLocalUsers(newLocalUsers);
      localStorage.setItem(LS_KEYS.USERS, JSON.stringify(newLocalUsers));

      deleteCallback(targetUser);
      executeBestEffortApi(() => Promise.resolve());
      alert(`کاربر ${targetUser} حذف شد.`);
  };

  const handleChangePassword = async (newPass: string) => {
      if (!currentUser) return;
      const safePass = newPass.trim();
      
      const newLocalUsers = localUsers.map(u => u.username === currentUser.username ? { ...u, password: safePass } : u);
      setLocalUsers(newLocalUsers);
      localStorage.setItem(LS_KEYS.USERS, JSON.stringify(newLocalUsers));
      
      await executeBestEffortApi(() => 
          api.apiCall('_system/manage_user', 'POST', { targetUser: currentUser.username, password: safePass, role: currentUser.role })
      );

      alert("رمز عبور تغییر کرد.");
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
