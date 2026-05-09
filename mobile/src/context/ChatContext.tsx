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
  createNewSession: () => Promise<string | null>;   // NEW

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

  // ---------- Cache Helpers ----------
  const saveCache = useCallback(async (nextSessions: Session[], nextActive: string | null) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions: nextSessions, activeSessionId: nextActive }));
    } catch (error) { console.warn("Failed to save sessions cache", error); }
  }, []);

  const saveQueue = useCallback(async () => {
    try { await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(offlineQueue.current)); } 
    catch (error) { console.warn("Failed to save offline queue", error); }
  }, []);

  const loadCache = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isMounted.current) {
          setSessions(parsed.sessions || []);
          setActiveSessionId(parsed.activeSessionId || null);
        }
      }
      const queueRaw = await AsyncStorage.getItem(QUEUE_KEY);
      if (queueRaw && isMounted.current) offlineQueue.current = JSON.parse(queueRaw);
    } catch (error) { console.warn("Failed to load cache", error); }
  }, []);

  // ---------- Offline Queue ----------
  const processQueue = useCallback(async () => {
    if (!offlineQueue.current.length) return;
    const queueCopy = [...offlineQueue.current];
    for (const item of queueCopy) {
      try {
        await API.post("/ai/unified-chat", item.payload);
        offlineQueue.current = offlineQueue.current.filter((q) => q.id !== item.id);
      } catch {
        item.retries++;
        if (item.retries > 3) offlineQueue.current = offlineQueue.current.filter((q) => q.id !== item.id);
      }
    }
    await saveQueue();
  }, [saveQueue]);

  const enqueueOffline = useCallback(async (msg: OfflineMessage) => {
    offlineQueue.current.push(msg);
    await saveQueue();
  }, [saveQueue]);

  // ---------- Sorting ----------
  const sortSessions = (list: Session[]) =>
    [...list].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    });

  // ---------- Clear Everything ----------
  const clearSessions = useCallback(async () => {
    setSessions([]);
    setActiveSessionId(null);
    offlineQueue.current = [];
    await AsyncStorage.multiRemove([STORAGE_KEY, QUEUE_KEY]);
  }, []);

  // ---------- Fetch Sessions ----------
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
      if (!isMounted.current) return;
      setSessions((prev) => {
        const map = new Map<string, Session>();
        [...prev, ...incoming].forEach((s) => map.set(s.sessionId, { ...map.get(s.sessionId), ...s }));
        const final = sortSessions(Array.from(map.values()));
        saveCache(final, activeSessionId);
        return final;
      });
      setActiveSessionId((prev) => prev || incoming[0]?.sessionId || null);
    } catch (err: any) {
      if (err?.response?.status === 401) { logout(); return; }
      if (retryCount.current < 3) {
        retryCount.current++;
        setTimeout(() => fetchSessions(true), 1000 * retryCount.current);
      } else setError("Failed to load chats");
    } finally {
      isFetching.current = false;
      if (isMounted.current) setLoading(false);
    }
  }, [isAuth, logout, activeSessionId, saveCache]);

  // ---------- Session Actions (ORDER IS IMPORTANT) ----------
  const selectSession = useCallback((id: string | null) => setActiveSessionId(id), []);

  const addSession = useCallback((session: Session) => {
    setSessions((prev) => {
      if (prev.some((s) => s.sessionId === session.sessionId)) return prev;
      const next = sortSessions([{ ...session, updatedAt: new Date().toISOString() }, ...prev]);
      saveCache(next, session.sessionId);
      return next;
    });
    setActiveSessionId(session.sessionId);
  }, [saveCache]);

  // ✅ createNewSession MUST come AFTER addSession
  const createNewSession = useCallback(async (): Promise<string | null> => {
    try {
      const res = await API.post("/chat/sessions", {}); // backend endpoint
      const newSession = res.data?.data;
      if (newSession?.sessionId) {
        addSession({
          sessionId: newSession.sessionId,
          title: "New Chat",
          lastMessage: "",
          updatedAt: new Date().toISOString(),
          pinned: false,
        });
        return newSession.sessionId;
      } else throw new Error("No sessionId from backend");
    } catch (err) {
      console.warn("Backend session creation failed, using local fallback", err);
      const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      addSession({
        sessionId: localId,
        title: "New Chat",
        lastMessage: "",
        updatedAt: new Date().toISOString(),
        pinned: false,
      });
      return localId;
    }
  }, [addSession]);

  const updateSession = useCallback((sessionId: string, lastMessage: string) => {
    setSessions((prev) => {
      const next = sortSessions(prev.map((s) =>
        s.sessionId === sessionId ? { ...s, lastMessage, updatedAt: new Date().toISOString() } : s
      ));
      saveCache(next, activeSessionId);
      return next;
    });
  }, [activeSessionId, saveCache]);

  const togglePinSession = useCallback((sessionId: string) => {
    setSessions((prev) => {
      const next = sortSessions(prev.map((s) => s.sessionId === sessionId ? { ...s, pinned: !s.pinned } : s));
      saveCache(next, activeSessionId);
      return next;
    });
  }, [activeSessionId, saveCache]);

  const removeSession = useCallback((sessionId: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.sessionId !== sessionId);
      saveCache(next, activeSessionId);
      return next;
    });
    setActiveSessionId((prev) => (prev === sessionId ? null : prev));
  }, [activeSessionId, saveCache]);

  // ---------- Effects ----------
  useEffect(() => {
    isMounted.current = true;
    const init = async () => {
      await loadCache();
      if (isAuth) {
        await fetchSessions();
        await processQueue();
      } else await clearSessions();
    };
    init();
    return () => { isMounted.current = false; isFetching.current = false; };
  }, [isAuth, loadCache, fetchSessions, processQueue, clearSessions]);

  // ---------- Memoized Context ----------
  const value = useMemo(() => ({
    sessions, activeSessionId, loading, error,
    fetchSessions, selectSession, createNewSession, addSession,
    updateSession, removeSession, togglePinSession, enqueueOffline, clearSessions,
  }), [
    sessions, activeSessionId, loading, error,
    fetchSessions, selectSession, createNewSession, addSession,
    updateSession, removeSession, togglePinSession, enqueueOffline, clearSessions,
  ]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used inside ChatProvider");
  return ctx;
};