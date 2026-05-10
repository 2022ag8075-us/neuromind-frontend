import React, { memo, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
} from "react-native";

// ==============================
// TYPES
// ==============================
interface Session {
  sessionId: string;
  title?: string;
  lastMessage?: string;
}

interface Props {
  sessions: Session[];
  activeSession: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;

  // ✅ NEW: optional search support from header (controlled externally)
  searchQuery?: string;
}

// ==============================
// HELPERS
// ==============================
const getTitle = (session: Session) => {
  if (session.title?.trim()) return session.title;
  if (session.lastMessage?.trim()) {
    return session.lastMessage.slice(0, 28);
  }
  return "New Chat";
};

// ==============================
// COMPONENT
// ==============================
function ChatSidebar({
  sessions,
  activeSession,
  onSelect,
  onNewChat,
  searchQuery = "",
}: Props) {
  // =========================
  // FILTER (HEADER SEARCH SUPPORT)
  // =========================
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;

    const q = searchQuery.toLowerCase();
    return sessions.filter(
      (s) =>
        s.title?.toLowerCase().includes(q) ||
        s.lastMessage?.toLowerCase().includes(q)
    );
  }, [sessions, searchQuery]);

  // =========================
  // SAFE NEW CHAT HANDLER (FIXED ISSUE)
  // =========================
  const handleNewChat = useCallback(() => {
    try {
      onNewChat?.();
    } catch (err) {
      console.warn("New chat failed:", err);
    }
  }, [onNewChat]);

  // =========================
  // RENDER ITEM (OPTIMIZED + MEMO STYLE)
  // =========================
  const renderItem = useCallback(
    ({ item }: { item: Session }) => {
      const isActive = activeSession === item.sessionId;

      return (
        <TouchableOpacity
          onPress={() => onSelect(item.sessionId)}
          activeOpacity={0.75}
          style={[
            styles.sessionItem,
            isActive && styles.activeSession,
          ]}
        >
          <Text
            style={[styles.title, isActive && styles.activeTitle]}
            numberOfLines={1}
          >
            {getTitle(item)}
          </Text>

          <Text style={styles.preview} numberOfLines={1}>
            {item.lastMessage?.trim() || "No messages yet"}
          </Text>
        </TouchableOpacity>
      );
    },
    [activeSession, onSelect]
  );

  // =========================
  // EMPTY STATE
  // =========================
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No conversations yet</Text>
      <Text style={styles.emptySub}>
        Tap “New Chat” to start your first conversation
      </Text>
    </View>
  );

  // =========================
  // UI
  // =========================
  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.heading}>Chats</Text>
      </View>

      {/* NEW CHAT BUTTON (FIXED RELIABILITY) */}
      <TouchableOpacity
        onPress={handleNewChat}
        activeOpacity={0.85}
        style={styles.newChatBtn}
      >
        <Text style={styles.newChatText}>＋ New Chat</Text>
      </TouchableOpacity>

      {/* LIST */}
      <FlatList
        data={filteredSessions}
        keyExtractor={(item) => item.sessionId}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.list,
          filteredSessions.length === 0 && { flex: 1 },
        ]}
        ListEmptyComponent={renderEmpty}
        initialNumToRender={12}
        windowSize={6}
        removeClippedSubviews
      />
    </SafeAreaView>
  );
}

// ==============================
// EXPORT
// ==============================
export default memo(ChatSidebar);

// ==============================
// STYLES (MODERNIZED)
// ==============================
const styles = StyleSheet.create({
  container: {
    width: 290,
    backgroundColor: "#0b1220",
    borderRightWidth: 1,
    borderRightColor: "#1e293b",
  },

  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.08)",
  },

  heading: {
    color: "#e2e8f0",
    fontSize: 17,
    fontWeight: "700",
  },

  newChatBtn: {
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#38bdf8",
    alignItems: "center",
  },

  newChatText: {
    color: "#0b1220",
    fontWeight: "800",
    fontSize: 14,
  },

  list: {
    paddingTop: 6,
    paddingBottom: 20,
  },

  sessionItem: {
    marginHorizontal: 10,
    marginVertical: 5,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "transparent",
  },

  activeSession: {
    backgroundColor: "#1e293b",
  },

  title: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  activeTitle: {
    color: "#38bdf8",
  },

  preview: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 4,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  emptyText: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "600",
  },

  emptySub: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 6,
    textAlign: "center",
  },
});