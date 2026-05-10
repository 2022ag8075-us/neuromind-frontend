import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useMemo,
  useEffect,
} from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";

import API from "../services/api";
import { useAuth } from "./AuthContext";

/* ==============================
   TYPES
============================== */
export interface Session {
  sessionId: string;
  title: string;
  lastMessage: string;
  updatedAt?: string;
  pinned?: boolean;
}

interface OfflineMessage {
  id: string;
  payload: FormData;
  retries: number;
}

interface ChatContextType {
  sessions: Session[];
  activeSessionId: string | null;

  loading: boolean;
  error: string | null;

  fetchSessions: (silent?: boolean) => Promise<void>;
  selectSession: (sessionId: string | null) => void;
  createNewSession: () => Promise<string | null>;

  addSession: (session: Session) => void;
  updateSession: (sessionId: string, lastMessage: string) => void;

  removeSession: (sessionId: string) => void;
  togglePinSession: (sessionId: string) => void;

  enqueueOffline: (msg: OfflineMessage) => void;

  clearSessions: () => void;
}

/* ==============================
   CONSTANTS
============================== */
const STORAGE_KEY = "NEUROMIND_SESSIONS";
const QUEUE_KEY = "NEUROMIND_OFFLINE_QUEUE";

/* ==============================
   CONTEXT
============================== */
const ChatContext = createContext<ChatContextType | null>(null);

/* ==============================
   PROVIDER
============================== */
export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const { isAuth, logout } = useAuth();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMounted = useRef(true);
  const isFetching = useRef(false);
  const retryCount = useRef(0);
  const offlineQueue = useRef<OfflineMessage[]>([]);

  // ==============================
  // CACHE
  // ==============================
  const saveCache = useCallback(async (next: Session[], active: string | null) => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ sessions: next, activeSessionId: active })
      );
    } catch (e) {
      console.warn("Cache save failed", e);
    }
  }, []);

  const saveQueue = useCallback(async () => {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(offlineQueue.current));
    } catch (e) {
      console.warn("Queue save failed", e);
    }
  }, []);

  const loadCache = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw && isMounted.current) {
        const parsed = JSON.parse(raw);
        setSessions(parsed.sessions || []);
        setActiveSessionId(parsed.activeSessionId || null);
      }

      const queueRaw = await AsyncStorage.getItem(QUEUE_KEY);
      if (queueRaw) offlineQueue.current = JSON.parse(queueRaw);
    } catch (e) {
      console.warn("Cache load failed", e);
    }
  }, []);

  // ==============================
  // OFFLINE QUEUE (SAFE)
  // ==============================
  const processQueue = useCallback(async () => {
    const queue = [...offlineQueue.current];
    if (!queue.length) return;

    for (const item of queue) {
      try {
        await API.post("/ai/unified-chat", item.payload);
        offlineQueue.current = offlineQueue.current.filter(q => q.id !== item.id);
      } catch {
        item.retries += 1;
        if (item.retries > 3) {
          offlineQueue.current = offlineQueue.current.filter(q => q.id !== item.id);
        }
      }
    }

    await saveQueue();
  }, [saveQueue]);

  const enqueueOffline = useCallback(async (msg: OfflineMessage) => {
    offlineQueue.current.push(msg);
    await saveQueue();
  }, [saveQueue]);

  // ==============================
  // SORT
  // ==============================
  const sortSessions = (list: Session[]) =>
    [...list].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    });

  // ==============================
  // CLEAR
  // ==============================
  const clearSessions = useCallback(async () => {
    setSessions([]);
    setActiveSessionId(null);
    offlineQueue.current = [];
    await AsyncStorage.multiRemove([STORAGE_KEY, QUEUE_KEY]);
  }, []);

  // ==============================
  // FETCH SESSIONS (FIXED STALE BUG)
  // ==============================
  const fetchSessions = useCallback(async (silent = false) => {
    if (!isAuth || isFetching.current) return;

    isFetching.current = true;
    setError(null);
    if (!silent) setLoading(true);

    try {
      const res = await API.get("/chat/sessions");

      const incoming: Session[] = (res.data?.data || []).map((s: any) => ({
        sessionId: s.sessionId,
        title: s.title || "New Chat",
        lastMessage: s.lastMessage || "",
        updatedAt: s.updatedAt,
        pinned: s.pinned || false,
      }));

      retryCount.current = 0;

      setSessions(prev => {
        const map = new Map<string, Session>();

        [...prev, ...incoming].forEach(s =>
          map.set(s.sessionId, {
            ...map.get(s.sessionId),
            ...s,
          })
        );

        const sorted = sortSessions([...map.values()]);

        saveCache(sorted, activeSessionId);

        return sorted;
      });

      // SAFE ACTIVE SESSION LOGIC
      setActiveSessionId((prev) => {
  if (prev) return prev;
  return incoming[0]?.sessionId || null;
});

    } catch (err: any) {
      if (err?.response?.status === 401) {
        logout();
        return;
      }

      if (retryCount.current < 3) {
        retryCount.current++;
        setTimeout(() => fetchSessions(true), 1000 * retryCount.current);
      } else {
        setError("Failed to load chats");
      }
    } finally {
      isFetching.current = false;
      if (isMounted.current) setLoading(false);
    }
  }, [isAuth, logout, activeSessionId, saveCache]);

  // ==============================
  // SESSION ACTIONS (FIXED ORDER + SAFETY)
  // ==============================
  const selectSession = useCallback((id: string | null) => {
    setActiveSessionId(id);
  }, []);

  const addSession = useCallback((session: Session) => {
    setSessions(prev => {
      if (prev.some(s => s.sessionId === session.sessionId)) return prev;

      const next = sortSessions([
        { ...session, updatedAt: new Date().toISOString() },
        ...prev,
      ]);

      saveCache(next, session.sessionId);
      return next;
    });

    setActiveSessionId(session.sessionId);
  }, [saveCache]);

  // ==============================
  // CREATE SESSION (ROBUST)
  // ==============================
  const createNewSession = useCallback(async (): Promise<string | null> => {
    try {
      const res = await API.post("/chat/sessions");
      const data = res.data?.data;

      if (data?.sessionId) {
        addSession({
          sessionId: data.sessionId,
          title: "New Chat",
          lastMessage: "",
          updatedAt: new Date().toISOString(),
          pinned: false,
        });

        return data.sessionId;
      }

      throw new Error("Invalid response");
    } catch (e) {
      console.warn("Backend failed, fallback session created", e);

      const fallbackId = `local_${Date.now()}`;

      addSession({
        sessionId: fallbackId,
        title: "New Chat",
        lastMessage: "",
        updatedAt: new Date().toISOString(),
        pinned: false,
      });

      return fallbackId;
    }
  }, [addSession]);

  // ==============================
  // UPDATE SESSION
  // ==============================
  const updateSession = useCallback((id: string, msg: string) => {
    setSessions(prev => {
      const next = sortSessions(
        prev.map(s =>
          s.sessionId === id
            ? { ...s, lastMessage: msg, updatedAt: new Date().toISOString() }
            : s
        )
      );

      saveCache(next, activeSessionId);
      return next;
    });
  }, [activeSessionId, saveCache]);

  // ==============================
  // PIN / REMOVE
  // ==============================
  const togglePinSession = useCallback((id: string) => {
    setSessions(prev => {
      const next = sortSessions(
        prev.map(s =>
          s.sessionId === id ? { ...s, pinned: !s.pinned } : s
        )
      );

      saveCache(next, activeSessionId);
      return next;
    });
  }, [activeSessionId, saveCache]);

  const removeSession = useCallback((id: string) => {
    setSessions(prev => {
      const next = prev.filter(s => s.sessionId !== id);
      saveCache(next, activeSessionId);
      return next;
    });

    setActiveSessionId(prev => (prev === id ? null : prev));
  }, [activeSessionId, saveCache]);

  // ==============================
  // LIFECYCLE
  // ==============================
  useEffect(() => {
    isMounted.current = true;

    const init = async () => {
      await loadCache();
      if (isAuth) {
        await fetchSessions();
        await processQueue();
      } else {
        await clearSessions();
      }
    };

    init();

    return () => {
      isMounted.current = false;
      isFetching.current = false;
    };
  }, [isAuth, loadCache, fetchSessions, processQueue, clearSessions]);

  // ==============================
  // CONTEXT VALUE
  // ==============================
  const value = useMemo(() => ({
    sessions,
    activeSessionId,
    loading,
    error,

    fetchSessions,
    selectSession,
    createNewSession,

    addSession,
    updateSession,
    removeSession,
    togglePinSession,

    enqueueOffline,
    clearSessions,
  }), [
    sessions,
    activeSessionId,
    loading,
    error,
    fetchSessions,
    selectSession,
    createNewSession,
    addSession,
    updateSession,
    removeSession,
    togglePinSession,
    enqueueOffline,
    clearSessions,
  ]);

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

// ==============================
// HOOK
// ==============================
export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used inside ChatProvider");
  return ctx;
};