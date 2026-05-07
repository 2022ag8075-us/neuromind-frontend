import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
  useRef,
} from "react";
import { getToken, setToken, clearToken } from "../services/api";

// ===============================
// 🔐 TYPES
// ===============================
export interface AuthContextType {
  isAuth: boolean;
  loading: boolean;
  token: string | null;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  onAuthStateChange: (callback: (isAuthenticated: boolean) => void) => () => void;
}

// ===============================
// 🧠 CONTEXT
// ===============================
const AuthContext = createContext<AuthContextType | null>(null);

// ===============================
// 🧩 PROVIDER
// ===============================
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [token, setTokenState] = useState<string | null>(null);

  const isMounted = useRef(true);
  const authChangeListeners = useRef<Set<(isAuth: boolean) => void>>(new Set());

  const notifyAuthChange = useCallback((authState: boolean) => {
    authChangeListeners.current.forEach(listener => {
      try { listener(authState); } catch (e) { console.warn("Listener error", e); }
    });
  }, []);

  const onAuthStateChange = useCallback((callback: (isAuthenticated: boolean) => void) => {
    authChangeListeners.current.add(callback);
    callback(isAuth);
    return () => {
      authChangeListeners.current.delete(callback);
    };
  }, [isAuth]);

  const refreshAuth = useCallback(async () => {
    try {
      const storedToken = await getToken();
      if (!isMounted.current) return;

      if (storedToken) {
        setTokenState(storedToken);
        if (!isAuth) {
          setIsAuth(true);
          notifyAuthChange(true);
        }
      } else {
        setTokenState(null);
        if (isAuth) {
          setIsAuth(false);
          notifyAuthChange(false);
        }
      }
    } catch (error) {
      console.error("❌ Auth refresh error:", error);
      if (isMounted.current) {
        setTokenState(null);
        if (isAuth) {
          setIsAuth(false);
          notifyAuthChange(false);
        }
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [isAuth, notifyAuthChange]);

  const login = useCallback(async (newToken: string) => {
    try {
      await setToken(newToken);
      if (!isMounted.current) return;

      setTokenState(newToken);
      if (!isAuth) {
        setIsAuth(true);
        notifyAuthChange(true);
      }
    } catch (error) {
      console.error("❌ Login error:", error);
      throw error;
    }
  }, [isAuth, notifyAuthChange]);

  const logout = useCallback(async () => {
    try {
      await clearToken();
      if (!isMounted.current) return;

      setTokenState(null);
      if (isAuth) {
        setIsAuth(false);
        notifyAuthChange(false);
      }
    } catch (error) {
      console.error("❌ Logout error:", error);
    }
  }, [isAuth, notifyAuthChange]);

  useEffect(() => {
    isMounted.current = true;
    refreshAuth();

    // Use 'number' type for React Native / browser setTimeout
    let interval: number | undefined;

    if (token) {
      interval = setInterval(() => {
        refreshAuth();
      }, 5 * 60 * 1000) as unknown as number;
    }

    return () => {
      isMounted.current = false;
      if (interval) clearInterval(interval);
    };
  }, [refreshAuth, token]);

  const value = useMemo(
    () => ({
      isAuth,
      loading,
      token,
      login,
      logout,
      refreshAuth,
      onAuthStateChange,
    }),
    [isAuth, loading, token, login, logout, refreshAuth, onAuthStateChange]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};