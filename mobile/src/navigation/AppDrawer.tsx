import React from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import ChatScreen from "../screens/ChatScreen";
import { clearToken } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";

const Drawer = createDrawerNavigator();

// ==============================
// 🎯 CUSTOM DRAWER CONTENT
// ==============================
function CustomDrawerContent({ navigation }: any) {
  const { logout } = useAuth();
  const { sessions, fetchSessions, createNewSession, selectSession, loading } =
    useChat();

  // Refresh sessions when drawer is opened
  useFocusEffect(
    React.useCallback(() => {
      fetchSessions();
    }, [fetchSessions])
  );

  // Handle new chat creation
  const handleNewChat = async () => {
    try {
      const newSessionId = await createNewSession();
      if (newSessionId) {
        // Navigate to the new chat session
        navigation.navigate("Chat", { sessionId: newSessionId });
        navigation.closeDrawer();
      } else {
        Alert.alert("Error", "Could not create new chat. Please try again.");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to create new chat.");
    }
  };

  // Handle opening an existing session
  const openSession = (sessionId: string) => {
    selectSession(sessionId);
    navigation.navigate("Chat", { sessionId });
    navigation.closeDrawer();
  };

  // Handle logout
  const handleLogout = async () => {
    await clearToken();
    logout(); // optional: clears auth state
    navigation.replace("Login");
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.title}>🧠 NeuroMind</Text>

      {/* New Chat Button */}
      <TouchableOpacity onPress={handleNewChat} style={styles.newChat}>
        <Text style={styles.newChatText}>+ New Chat</Text>
      </TouchableOpacity>

      {/* Chat History List */}
      {loading && sessions.length === 0 ? (
        <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.sessionId}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.empty}>No chats yet. Tap + New Chat to start.</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => openSession(item.sessionId)}
              style={styles.session}
              activeOpacity={0.7}
            >
              <Text style={styles.sessionTitle} numberOfLines={1}>
                {item.title || "New Chat"}
              </Text>
              {!!item.lastMessage && (
                <Text style={styles.preview} numberOfLines={1}>
                  {item.lastMessage}
                </Text>
              )}
            </TouchableOpacity>
          )}
        />
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={() => navigation.navigate("Mood")} style={styles.footerButton}>
          <Text style={styles.footerItem}>😊 Mood Tracker</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleLogout} style={styles.footerButton}>
          <Text style={styles.logout}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ==============================
// 🧭 DRAWER NAVIGATOR
// ==============================
export default function AppDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: "#0f172a",
          width: 280,
        },
        drawerType: "front",
        overlayColor: "rgba(0,0,0,0.5)",
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen name="Chat" component={ChatScreen} />
    </Drawer.Navigator>
  );
}

// ==============================
// 🎨 STYLES
// ==============================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#0f172a",
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
  },
  newChat: {
    backgroundColor: "#4F46E5",
    paddingVertical: 12,
    borderRadius: 30,
    marginBottom: 24,
    alignItems: "center",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  newChatText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  session: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  sessionTitle: {
    color: "#e2e8f0",
    fontWeight: "600",
    fontSize: 15,
  },
  preview: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 4,
  },
  empty: {
    color: "#64748b",
    textAlign: "center",
    marginTop: 40,
    fontSize: 14,
  },
  footer: {
    marginTop: "auto",
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    paddingTop: 16,
  },
  footerButton: {
    paddingVertical: 8,
  },
  footerItem: {
    color: "#94a3b8",
    fontSize: 16,
  },
  logout: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "600",
  },
});