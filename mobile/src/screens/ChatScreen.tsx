import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";

import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  LayoutAnimation,
  UIManager,
  Image,
  Alert,
  SafeAreaView,
} from "react-native";

import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as ImagePicker from "expo-image-picker";
import Markdown from 'react-native-markdown-display';

import API from "../services/api";
import ChatBubble from "../components/ChatBubble";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import OfflineBanner from '../components/OfflineBanner';

// Enable layout animations on Android
if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

// ---------- Types ----------
type Status = "sending" | "sent" | "error";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  time: string;
  status?: Status;
}

type ImageAsset = ImagePicker.ImagePickerAsset;

// ---------- Helpers ----------
const getTime = () =>
  new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const generateId = () =>
  `${Date.now()}_${Math.random().toString(36).slice(2)}`;

// ---------- Component ----------
export default function ChatScreen({ navigation }: any) {
  const { logout } = useAuth();
  const { activeSessionId, selectSession } = useChat();

  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [image, setImage] = useState<ImageAsset | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const isMounted = useRef(true);
  const currentSessionRef = useRef<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const safeSetChat = useCallback(
    (fn: (prev: Message[]) => Message[]) => {
      if (!isMounted.current) return;
      setChat(fn);
    },
    []
  );

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    });
  };

  // ---------- Load chat history ----------
  const loadMessages = useCallback(async () => {
    if (!activeSessionId) return;

    currentSessionRef.current = activeSessionId;
    setInitialLoading(true);

    try {
      const res = await API.get(`/chat/messages/${activeSessionId}`);
      if (currentSessionRef.current !== activeSessionId) return;

      const raw = Array.isArray(res.data?.data) ? res.data.data : [];

      const sorted = raw.sort(
        (a: any, b: any) =>
          new Date(a.createdAt || 0).getTime() -
          new Date(b.createdAt || 0).getTime()
      );

      const formatted: Message[] = sorted.map((m: any, index: number) => ({
        id: `${m.createdAt || Date.now()}_${index}`,
        text: m.content || "",
        isUser: m.role === "user",
        time: new Date(m.createdAt || Date.now()).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      }));

      safeSetChat(() => formatted);
    } catch (error) {
      console.error("Load messages error:", error);
      Alert.alert("Error", "Failed to load chat history");
    } finally {
      setInitialLoading(false);
    }
  }, [activeSessionId, safeSetChat]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (chat.length > 0) scrollToBottom();
  }, [chat]);

  // ---------- Image picker ----------
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });

      if (!result.canceled && result.assets?.length) {
        setImage(result.assets[0]);
      }
    } catch (error) {
      console.error("Image pick error:", error);
      Alert.alert("Error", "Could not pick image");
    }
  };

  // ---------- Send message (text, image) ----------
  const sendMessage = async (text: string, imageObj?: ImageAsset | null) => {
    if (loading) return;
    if (!text && !imageObj) return;

    const tempId = generateId();

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    safeSetChat((prev) => [
      ...prev,
      {
        id: tempId,
        text: text || (imageObj ? "📷 Image" : ""),
        isUser: true,
        time: getTime(),
        status: "sending",
      },
    ]);

    setLoading(true);

    try {
      const formData = new FormData();
      if (text) formData.append("message", text);
      if (activeSessionId) formData.append("sessionId", activeSessionId);

      if (imageObj) {
        formData.append("files", {
          uri: imageObj.uri,
          name: "image.jpg",
          type: "image/jpeg",
        } as any);
      }

      const response = await API.post("/ai/unified-chat", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const reply = response.data?.reply || "I'm here for you.";

      // Mark original message as sent
      safeSetChat((prev) =>
        prev.map((msg) => (msg.id === tempId ? { ...msg, status: "sent" } : msg))
      );

      // Add AI reply
      safeSetChat((prev) => [
        ...prev,
        {
          id: generateId(),
          text: reply,
          isUser: false,
          time: getTime(),
        },
      ]);

      // Sync session if backend returns a new one
      if (response.data?.sessionId) {
        selectSession(response.data.sessionId);
      }

      // Clear selected image after successful send
      setImage(null);
    } catch (error) {
      console.error("Send message error:", error);
      safeSetChat((prev) =>
        prev.map((msg) =>
          msg.id === tempId ? { ...msg, status: "error" } : msg
        )
      );
      Alert.alert("Error", "Message could not be sent");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    const trimmedText = message.trim();
    if (!trimmedText && !image) return;

    setMessage("");
    sendMessage(trimmedText, image);
  };

  // Markdown styles (fixed with const assertion)
  const markdownStyles = StyleSheet.create({
    body: { color: '#e2e8f0', fontSize: 16 },
    paragraph: { marginVertical: 0 },
    heading1: { color: '#f1f5f9', fontSize: 24, fontWeight: 'bold' as const },
    heading2: { color: '#f1f5f9', fontSize: 20, fontWeight: 'bold' as const },
    heading3: { color: '#f1f5f9', fontSize: 18, fontWeight: 'bold' as const },
    code_inline: { backgroundColor: '#0f172a', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, color: '#38bdf8' },
    code_block: { backgroundColor: '#0f172a', padding: 12, borderRadius: 8, color: '#e2e8f0' },
    link: { color: '#60a5fa' },
    list_item: { color: '#e2e8f0' },
  });

  // Custom renderer for messages with Markdown support
  const renderMessage = ({ item }: { item: Message }) => {
    if (item.isUser) {
      // Use existing ChatBubble for user messages
      return <ChatBubble {...item} />;
    } else {
      // AI messages – render with Markdown
      return (
        <View style={styles.aiMessageContainer}>
          <View style={styles.aiBubble}>
            <Markdown style={markdownStyles}>
              {item.text}
            </Markdown>
            <Text style={styles.timeText}>{item.time}</Text>
          </View>
        </View>
      );
    }
  };

  // ---------- Render ----------
  return (
    <LinearGradient colors={["#0f172a", "#1e293b"]} style={styles.gradient}>
      <OfflineBanner />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          {/* Header with Blur */}
          <BlurView intensity={50} tint="dark" style={styles.headerBlur}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.openDrawer()}>
                <Text style={styles.menu}>☰</Text>
              </TouchableOpacity>
              <Text style={styles.title}>NeuroMind</Text>
              <TouchableOpacity onPress={logout}>
                <Text style={styles.logout}>Logout</Text>
              </TouchableOpacity>
            </View>
          </BlurView>

          {/* Chat area */}
          {initialLoading ? (
            <View style={styles.centerLoader}>
              <ActivityIndicator size="large" color="#3b82f6" />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={chat}
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              contentContainerStyle={styles.chatContent}
              onContentSizeChange={scrollToBottom}
              keyboardDismissMode="interactive"
            />
          )}

          {/* Image preview */}
          {image && (
            <View style={styles.previewContainer}>
              <Image source={{ uri: image.uri }} style={styles.previewImage} />
              <TouchableOpacity onPress={() => setImage(null)}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Typing indicator */}
          {loading && (
            <View style={styles.typingIndicator}>
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text style={styles.typingText}>AI is thinking...</Text>
            </View>
          )}

          {/* Input bar with Blur */}
          <BlurView intensity={80} tint="dark" style={styles.inputBlur}>
            <View style={styles.inputContainer}>
              <TouchableOpacity onPress={pickImage}>
                <Text style={styles.icon}>🖼️</Text>
              </TouchableOpacity>

              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Type a message..."
                placeholderTextColor="#aaa"
                style={styles.input}
                multiline
              />

              <TouchableOpacity onPress={handleSend} disabled={loading}>
                <Text style={[styles.send, loading && styles.sendDisabled]}>➤</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ---------- Styles ----------
const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: "transparent" },
  flex: { flex: 1 },

  headerBlur: {
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 34,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  menu: { color: "#fff", fontSize: 24 },
  title: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  logout: { color: "#ef4444", fontWeight: "600" },

  chatContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 80,
  },

  centerLoader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  previewContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  previewImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  removeText: {
    color: "#ef4444",
    fontWeight: "600",
  },

  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 4,
  },
  typingText: {
    color: "#aaa",
    marginLeft: 8,
    fontSize: 13,
  },

  inputBlur: {
    borderTopWidth: 0.5,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "#1e293b",
    color: "#fff",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 8,
    maxHeight: 100,
  },
  send: {
    fontSize: 24,
    color: "#3b82f6",
    marginLeft: 4,
    paddingHorizontal: 4,
  },
  sendDisabled: {
    opacity: 0.5,
  },
  icon: {
    fontSize: 24,
    color: "#fff",
    paddingHorizontal: 4,
  },
  aiMessageContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginVertical: 8,
  },
  aiBubble: {
    maxWidth: '80%',
    backgroundColor: '#1e293b',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomLeftRadius: 4,
  },
  timeText: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 6,
    textAlign: 'right',
  },
});