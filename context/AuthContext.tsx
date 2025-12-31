
import { createContext, useContext } from 'react';

export interface AuthContextType {
    currentUser: { username: string; role: 'admin' | 'user' } | null;
    isAuthenticated: boolean;
    localUsers: any[];
    handleLogin: (user: string, pass: string) => Promise<void>;
    handleLogout: () => void;
    handleCreateUser: (user: string, pass: string, role: 'admin' | 'user') => Promise<void>;
    handleUpdateUser: (oldUsername: string, newUsername: string, newPass: string, newRole: 'admin' | 'user') => Promise<void>;
    handleDeleteUser: (targetUser: string, deleteCallback: (user: string) => void) => Promise<void>;
    handleChangePassword: (newPass: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuthContext must be used within an AuthProvider (wrapped in App.tsx)');
    }
    return context;
};

export default AuthContext;
