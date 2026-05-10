import React, { useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { useChat } from "../context/ChatContext";
import { useAuth } from "../context/AuthContext";

export default function CustomDrawer({ navigation }: any) {
  const { sessions, fetchSessions, createNewSession, selectSession, loading } =
    useChat();
  const { logout } = useAuth();

  // Refresh sessions when drawer opens
  useFocusEffect(
    useCallback(() => {
      fetchSessions();
    }, [fetchSessions])
  );

  // New chat from drawer
  const handleNewChat = async () => {
    try {
      const newId = await createNewSession();
      if (newId) {
        // createNewSession already calls selectSession internally
        navigation.navigate("Chat", { sessionId: newId });
        navigation.closeDrawer();
      } else {
        alert("Could not create new chat");
      }
    } catch (error) {
      console.error("New chat error:", error);
      alert("Failed to create new chat");
    }
  };

  const handleSelectSession = (sessionId: string) => {
    selectSession(sessionId);
    navigation.navigate("Chat", { sessionId });
    navigation.closeDrawer();
  };

  const handleLogout = async () => {
    await logout();
    navigation.replace("Login");
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.newChat} onPress={handleNewChat}>
        <Text style={styles.newChatText}>+ New Chat</Text>
      </TouchableOpacity>

      {loading && sessions.length === 0 ? (
        <ActivityIndicator size="large" color="#38bdf8" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.sessionId}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleSelectSession(item.sessionId)}
              style={styles.item}
            >
              <Text style={styles.title} numberOfLines={1}>
                {item.title || "New Chat"}
              </Text>
              {item.lastMessage ? (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {item.lastMessage}
                </Text>
              ) : null}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No chats yet. Tap + New Chat to start.</Text>
          }
        />
      )}

      <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
        <Text style={styles.logoutText}>🚪 Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", paddingTop: 50, paddingHorizontal: 12 },
  newChat: {
    backgroundColor: "#38bdf8",
    paddingVertical: 12,
    borderRadius: 30,
    marginBottom: 20,
    alignItems: "center",
    shadowColor: "#38bdf8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  newChatText: { color: "#0f172a", fontWeight: "bold", fontSize: 16 },
  item: { paddingVertical: 14, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#1e293b" },
  title: { color: "#e2e8f0", fontWeight: "600", fontSize: 15 },
  subtitle: { color: "#94a3b8", fontSize: 12, marginTop: 4 },
  emptyText: { color: "#64748b", textAlign: "center", marginTop: 40, fontSize: 14 },
  logoutButton: { marginTop: "auto", marginBottom: 20, paddingVertical: 12, alignItems: "center", borderTopWidth: 1, borderTopColor: "#1e293b", paddingTop: 16 },
  logoutText: { color: "#ef4444", fontWeight: "600", fontSize: 16 },
});