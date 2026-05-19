import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  View,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated,
  SectionList,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";
import Markdown from "react-native-markdown-display";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import OfflineBanner from "../components/OfflineBanner";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import API from "../services/api";
import { generateId, getTime } from "../utils/chatHelpers";
import { MessageStatus, Message } from "../types/chat";
import { markdownStyles } from "../utils/markdownStyles";

// ==================== OFFLINE QUEUE KEYS ====================
const OFFLINE_QUEUE_KEY = "@offline_queue";

// ==================== INLINE MOOD DETECTION ====================
interface MoodAnalysis {
  label: string;
  emoji: string;
  color: string;
  confidence: number;
}

const detectMood = (text: string): MoodAnalysis => {
  const lower = text.toLowerCase();
  const patterns: Record<string, string[]> = {
    happy: ["happy", "great", "awesome", "good", "fantastic", "amazing", "joy", "smile", "love", "wonderful"],
    sad: ["sad", "cry", "depressed", "hurt", "broken", "upset", "pain", "lonely"],
    angry: ["angry", "mad", "furious", "hate", "annoyed", "rage"],
    anxious: ["anxious", "worried", "panic", "fear", "scared", "nervous", "overwhelmed"],
    stressed: ["stress", "overwhelmed", "burnout", "pressure", "tired", "exhausted"],
    excited: ["excited", "can't wait", "thrilled", "hyped", "pumped", "awesome"],
    lonely: ["alone", "lonely", "isolated", "nobody", "ignored", "abandoned"],
  };
  const scores: Record<string, number> = { happy: 0, sad: 0, angry: 0, anxious: 0, stressed: 0, excited: 0, lonely: 0 };
  Object.entries(patterns).forEach(([mood, words]) => {
    words.forEach((word) => {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      const matches = lower.match(regex);
      if (matches) scores[mood] += matches.length;
    });
  });
  const highest = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  if (!highest || highest[1] === 0) {
    return { label: "Neutral", emoji: "😐", color: "#64748b", confidence: 0.4 };
  }
  const config: Record<string, Omit<MoodAnalysis, "confidence">> = {
    happy: { label: "Happy", emoji: "😊", color: "#22c55e" },
    sad: { label: "Sad", emoji: "😢", color: "#3b82f6" },
    angry: { label: "Angry", emoji: "😡", color: "#ef4444" },
    anxious: { label: "Anxious", emoji: "😟", color: "#f59e0b" },
    stressed: { label: "Stressed", emoji: "😩", color: "#fb7185" },
    excited: { label: "Excited", emoji: "🤩", color: "#8b5cf6" },
    lonely: { label: "Lonely", emoji: "🥺", color: "#06b6d4" },
  };
  const mood = highest[0];
  return { ...config[mood], confidence: Math.min(0.95, 0.5 + highest[1] * 0.1) };
};

// ==================== TYPING DOTS ====================
const TypingDots = () => {
  const [dot1] = useState(new Animated.Value(0));
  const [dot2] = useState(new Animated.Value(0));
  const [dot3] = useState(new Animated.Value(0));
  useEffect(() => {
    const animate = (value: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, { toValue: 1, duration: 300, delay, useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      ).start();
    };
    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
  }, []);
  const opacity = (value: Animated.Value) => value.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
  return (
    <View style={styles.typingDots}>
      <Animated.Text style={[styles.dot, { opacity: opacity(dot1) }]}>•</Animated.Text>
      <Animated.Text style={[styles.dot, { opacity: opacity(dot2) }]}>•</Animated.Text>
      <Animated.Text style={[styles.dot, { opacity: opacity(dot3) }]}>•</Animated.Text>
    </View>
  );
};

// ==================== MOOD INDICATOR ====================
const MoodIndicator = ({ mood }: { mood: any }) => (
  <View style={[styles.moodChip, { backgroundColor: mood.color }]}>
    <Text style={styles.moodText}>{mood.emoji} {mood.label}</Text>
  </View>
);

// ==================== MESSAGE ITEM ====================
const MessageItem = React.memo(({ item, onLongPress }: { item: Message; onLongPress: (msg: Message) => void }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();
  }, []);
  if (item.isUser) {
    return (
      <Animated.View style={[styles.userWrapper, { opacity: fadeAnim, transform: [{ translateY }] }]}>
        <TouchableOpacity onLongPress={() => onLongPress(item)} delayLongPress={200} activeOpacity={0.8}>
          <View style={styles.userBubble}>
            <Markdown style={markdownStyles}>{item.text}</Markdown>
            {item.mood && <MoodIndicator mood={item.mood} />}
            <View style={styles.messageFooter}>
              <Text style={styles.userTime}>{item.time}</Text>
              {item.status === MessageStatus.SENDING && <ActivityIndicator size="small" color="#fff" />}
              {item.status === MessageStatus.ERROR && <Text style={styles.errorIcon}>⚠️</Text>}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }
  return (
    <Animated.View style={[styles.aiWrapper, { opacity: fadeAnim, transform: [{ translateY }] }]}>
      <TouchableOpacity onLongPress={() => onLongPress(item)} delayLongPress={200} activeOpacity={0.85}>
        <BlurView intensity={25} tint="dark" style={styles.aiBubble}>
          {item.pinned && <Text style={styles.pinIcon}>📌</Text>}
          {item.isRegenerating ? (
            <View style={styles.regenerating}>
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text style={styles.regeneratingText}>Regenerating...</Text>
            </View>
          ) : item.isStreaming && item.streamingText ? (
            <>
              <Markdown style={markdownStyles}>{item.streamingText}</Markdown>
              <Text style={styles.cursor}>▋</Text>
            </>
          ) : (
            <Markdown style={markdownStyles}>{item.text}</Markdown>
          )}
          <Text style={styles.aiTime}>{item.time}</Text>
        </BlurView>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ==================== OFFLINE QUEUE HELPERS ====================
interface QueuedMessage {
  id: string;
  text: string;
  imageUri?: string;
  sessionId: string;
  retryCount: number;
  timestamp: number;
}

const addToOfflineQueue = async (message: QueuedMessage) => {
  try {
    const existing = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    const queue: QueuedMessage[] = existing ? JSON.parse(existing) : [];
    queue.push(message);
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error("Failed to add to offline queue", error);
  }
};

const processOfflineQueue = async (
  activeSessionId: string,
  sendMessageFn: (text: string, imageUri?: string, replaceAiMessageId?: string) => Promise<void>,
  setRefreshing: (val: boolean) => void
) => {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return;
    const queue: QueuedMessage[] = JSON.parse(raw);
    if (queue.length === 0) return;
    setRefreshing(true);
    for (let i = 0; i < queue.length; i++) {
      const msg = queue[i];
      if (msg.sessionId !== activeSessionId) continue;
      try {
        await sendMessageFn(msg.text, msg.imageUri);
        queue.splice(i, 1);
        i--;
      } catch (error) {
        msg.retryCount = (msg.retryCount || 0) + 1;
        if (msg.retryCount >= 3) {
          queue.splice(i, 1);
          i--;
          Alert.alert("Message failed", `"${msg.text.substring(0, 30)}..." could not be sent after 3 attempts.`);
        }
      }
    }
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error("Failed to process offline queue", error);
  } finally {
    setRefreshing(false);
  }
};

// ==================== MAIN CHAT SCREEN ====================
export default function ChatScreen({ navigation }: any) {
  const { logout } = useAuth();
  const { activeSessionId, createNewSession, addSession, selectSession } = useChat();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [inputText, setInputText] = useState("");
  const [image, setImage] = useState<{ uri: string } | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const sectionListRef = useRef<SectionList>(null);
  const currentSessionRef = useRef<string | null>(null);
  const lastLoadedRef = useRef<string | null>(null);
  const loadingMessagesRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const sendScale = useRef(new Animated.Value(1)).current;

  // Responsive values based on screen width
  const isTablet = screenWidth >= 768;
  const bubbleMaxWidth = isTablet ? "70%" : "85%";
  const headerPaddingTop = insets.top + 34;
  const inputPaddingBottom = insets.bottom + 10;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && activeSessionId) {
        processOfflineQueue(activeSessionId, sendMessage, setRefreshing);
      }
    });
    return () => unsubscribe();
  }, [activeSessionId]);

  useEffect(() => {
    if (activeSessionId) {
      processOfflineQueue(activeSessionId, sendMessage, setRefreshing);
    }
  }, [activeSessionId]);

  const pinnedMessages = messages.filter(m => m.pinned);
  const regularMessages = messages.filter(m => !m.pinned);
  const sections = [
    ...(pinnedMessages.length ? [{ title: "📌 Pinned", data: pinnedMessages }] : []),
    { title: "Chat History", data: regularMessages },
  ];

  const scrollToBottom = () => {
    const lastSection = sections.length - 1;
    const lastItem = (sections[lastSection]?.data.length || 0) - 1;
    if (lastItem >= 0) {
      sectionListRef.current?.scrollToLocation({ sectionIndex: lastSection, itemIndex: lastItem, animated: true });
    }
  };

  const loadMessages = useCallback(async (force = false) => {
    if (!activeSessionId) return;
    if (!force && lastLoadedRef.current === activeSessionId) return;
    if (loadingMessagesRef.current) return;
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    loadingMessagesRef.current = true;
    currentSessionRef.current = activeSessionId;
    setInitialLoading(true);
    try {
      const res = await API.get(`/chat/messages/${activeSessionId}`, { signal: abortControllerRef.current.signal });
      if (currentSessionRef.current !== activeSessionId) return;
      const raw = Array.isArray(res.data?.data) ? res.data.data : [];
      const sorted = raw.sort((a: any, b: any) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
      const formatted: Message[] = sorted.map((m: any, idx: number) => ({
        id: `${m.createdAt || Date.now()}_${idx}`,
        text: m.content || "",
        isUser: m.role === "user",
        time: new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        createdAt: new Date(m.createdAt || Date.now()).getTime(),
      }));
      const pinnedRaw = await AsyncStorage.getItem("@pinned_messages");
      const pinnedMap = pinnedRaw ? JSON.parse(pinnedRaw) : {};
      const withPins = formatted.map(msg => ({ ...msg, pinned: !!pinnedMap[msg.id] }));
      setMessages(withPins);
      lastLoadedRef.current = activeSessionId;
    } catch (err: any) {
      if (err.name !== "AbortError") console.error(err);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
      loadingMessagesRef.current = false;
    }
  }, [activeSessionId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);
  useFocusEffect(useCallback(() => { if (activeSessionId) loadMessages(); }, [activeSessionId, loadMessages]));

  const sendMessage = useCallback(async (text: string, imageUri?: string, replaceAiMessageId?: string) => {
    if (!activeSessionId) return;
    const optimisticId = generateId();
    const mood = detectMood(text);
    if (!replaceAiMessageId) {
      setMessages(prev => [...prev, {
        id: optimisticId, text, isUser: true, time: getTime(), status: MessageStatus.SENDING, mood, createdAt: Date.now(),
      }]);
    }
    setLoading(true);
    setIsTyping(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const formData = new FormData();
      formData.append("message", text);
      formData.append("sessionId", activeSessionId);
      if (imageUri) {
        formData.append("files", { uri: imageUri, name: "image.jpg", type: "image/jpeg" } as any);
      }
      const response = await API.post("/ai/unified-chat", formData, { headers: { "Content-Type": "multipart/form-data" } });
      const reply = response.data?.reply || "I'm here for you.";
      setIsTyping(false);
      if (!replaceAiMessageId) {
        setMessages(prev => prev.map(msg => msg.id === optimisticId ? { ...msg, status: MessageStatus.SENT } : msg));
        const aiId = generateId();
        setMessages(prev => [...prev, { id: aiId, text: "", isUser: false, time: getTime(), isStreaming: true, streamingText: "" }]);
        const words = reply.split(" ");
        let current = "";
        for (let i = 0; i < words.length; i++) {
          current += (i === 0 ? "" : " ") + words[i];
          setMessages(prev => prev.map(msg => msg.id === aiId ? { ...msg, streamingText: current, isStreaming: true } : msg));
          await new Promise(r => setTimeout(r, 30));
        }
        setMessages(prev => prev.map(msg => msg.id === aiId ? { ...msg, text: reply, streamingText: undefined, isStreaming: false } : msg));
      } else {
        setMessages(prev => prev.map(msg => msg.id === replaceAiMessageId ? { ...msg, isRegenerating: false, text: reply, time: getTime() } : msg));
      }
      if (response.data?.sessionId) selectSession(response.data.sessionId);
      if (!replaceAiMessageId) setImage(null);
      scrollToBottom();
    } catch (err) {
      setIsTyping(false);
      if (!replaceAiMessageId) {
        setMessages(prev => prev.map(msg => msg.id === optimisticId ? { ...msg, status: MessageStatus.ERROR } : msg));
        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected) {
          await addToOfflineQueue({
            id: optimisticId,
            text,
            imageUri,
            sessionId: activeSessionId,
            retryCount: 0,
            timestamp: Date.now(),
          });
          Alert.alert("Offline", "Message saved. Will send when connection is restored.");
        } else {
          Alert.alert("Error", "Message could not be sent.");
        }
      } else {
        setMessages(prev => prev.map(msg => msg.id === replaceAiMessageId ? { ...msg, isRegenerating: false } : msg));
        Alert.alert("Error", "Could not regenerate message.");
      }
    } finally {
      setLoading(false);
    }
  }, [activeSessionId, selectSession]);

  const onSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed && !image) return;
    sendMessage(trimmed, image?.uri);
    setInputText("");
    setImage(null);
    Animated.sequence([
      Animated.timing(sendScale, { toValue: 0.8, duration: 100, useNativeDriver: true }),
      Animated.spring(sendScale, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!result.canceled && result.assets?.[0]) setImage({ uri: result.assets[0].uri });
  };

  const copyMessage = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Copied", "Message copied");
  };

  const togglePin = async (msg: Message) => {
    const newPinned = !msg.pinned;
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...msg, pinned: newPinned } : m));
    const pinnedRaw = await AsyncStorage.getItem("@pinned_messages");
    const pinnedMap = pinnedRaw ? JSON.parse(pinnedRaw) : {};
    if (newPinned) pinnedMap[msg.id] = true;
    else delete pinnedMap[msg.id];
    await AsyncStorage.setItem("@pinned_messages", JSON.stringify(pinnedMap));
  };

  const deleteMessage = (id: string) => {
    Alert.alert("Delete", "Remove this message?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => setMessages(prev => prev.filter(m => m.id !== id)) },
    ]);
  };

  const regenerateMessage = async (aiMsg: Message, index: number) => {
    let userMsg = "";
    for (let i = index - 1; i >= 0; i--) {
      if (messages[i].isUser) { userMsg = messages[i].text; break; }
    }
    if (!userMsg) { Alert.alert("Cannot regenerate", "No user message found"); return; }
    setMessages(prev => prev.map(m => m.id === aiMsg.id ? { ...m, isRegenerating: true } : m));
    await sendMessage(userMsg, undefined, aiMsg.id);
  };

  const handleLongPress = (msg: Message) => {
    const idx = messages.findIndex(m => m.id === msg.id);
    const options: any[] = [
      { text: "Copy", onPress: () => copyMessage(msg.text) },
      { text: msg.pinned ? "Unpin" : "Pin", onPress: () => togglePin(msg) },
      { text: "Delete", onPress: () => deleteMessage(msg.id), style: "destructive" },
    ];
    if (!msg.isUser) options.splice(2, 0, { text: "Regenerate", onPress: () => regenerateMessage(msg, idx) });
    Alert.alert("Message options", "", options, { cancelable: true });
  };

  const newChat = async () => {
    if (createNewSession) {
      const newId = await createNewSession();
      if (newId) { setMessages([]); lastLoadedRef.current = null; }
    } else {
      const newId = `local_${Date.now()}`;
      addSession({ sessionId: newId, title: "New Chat", lastMessage: "", updatedAt: new Date().toISOString() });
      selectSession(newId);
      setMessages([]);
      lastLoadedRef.current = null;
    }
  };

  const renderItem = ({ item }: { item: Message }) => <MessageItem item={item} onLongPress={handleLongPress} />;
  const renderSectionHeader = ({ section }: any) => (
    <View style={styles.sectionHeader}><Text style={styles.sectionHeaderText}>{section.title}</Text></View>
  );

  if (initialLoading) {
    return (
      <LinearGradient colors={["#0f172a", "#020617"]} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}><View style={styles.centerLoader}><ActivityIndicator size="large" color="#3b82f6" /></View></SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#0f172a", "#020617"]} style={styles.gradient}>
      <StatusBar style="light" />
      <OfflineBanner />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <BlurView intensity={50} tint="dark" style={[styles.headerBlur, { paddingTop: headerPaddingTop }]}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.openDrawer()}><Text style={styles.menu}>☰</Text></TouchableOpacity>
              <Text style={[styles.title, { fontSize: isTablet ? 22 : 18 }]}>NeuroMind</Text>
              <View style={styles.headerActions}>
                <TouchableOpacity onPress={() => loadMessages(true)}><Text style={styles.refreshIcon}>⟳</Text></TouchableOpacity>
                <TouchableOpacity onPress={newChat}><Text style={styles.newChatIcon}>➕</Text></TouchableOpacity>
                <TouchableOpacity onPress={logout}><Text style={styles.logout}>Logout</Text></TouchableOpacity>
              </View>
            </View>
          </BlurView>

          <SectionList
            ref={sectionListRef}
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            contentContainerStyle={[styles.chatContent, { paddingBottom: isTablet ? 100 : 80 }]}
            onScroll={({ nativeEvent }) => setShowScrollButton(nativeEvent.contentOffset.y > 400)}
            scrollEventThrottle={16}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadMessages(true)} tintColor="#3b82f6" />}
          />

          {showScrollButton && (
            <TouchableOpacity style={[styles.scrollFab, { bottom: isTablet ? 100 : 90, right: isTablet ? 30 : 20 }]} onPress={scrollToBottom}>
              <Text style={styles.scrollFabText}>↓</Text>
            </TouchableOpacity>
          )}

          {image && (
            <View style={styles.previewContainer}>
              <Image source={{ uri: image.uri }} style={styles.previewImage} />
              <TouchableOpacity onPress={() => setImage(null)}><Text style={styles.removeText}>Remove</Text></TouchableOpacity>
            </View>
          )}

          {isTyping && (
            <View style={styles.typingWrapper}>
              <BlurView intensity={40} tint="dark" style={styles.typingBlur}>
                <TypingDots />
                <Text style={styles.typingText}>AI is thinking...</Text>
              </BlurView>
            </View>
          )}

          <BlurView intensity={80} tint="dark" style={styles.inputBlur}>
            <View style={[styles.inputContainer, { paddingBottom: inputPaddingBottom }]}>
              <TouchableOpacity onPress={pickImage}><Text style={styles.icon}>🖼️</Text></TouchableOpacity>
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type a message..."
                placeholderTextColor="#aaa"
                style={[styles.input, { fontSize: isTablet ? 18 : 16 }]}
                multiline
              />
              <TouchableOpacity onPress={onSend} disabled={loading} style={styles.sendButton}>
                <Animated.Text style={[styles.send, loading && styles.sendDisabled, { transform: [{ scale: sendScale }] }]}>➤</Animated.Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: "transparent" },
  flex: { flex: 1 },
  headerBlur: { borderBottomWidth: 0.5, borderBottomColor: "rgba(255,255,255,0.1)" },
  header: { paddingHorizontal: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  menu: { color: "#fff", fontSize: 24 },
  title: { color: "#fff", fontWeight: "bold" },
  logout: { color: "#ef4444", fontWeight: "600" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  refreshIcon: { color: "#fff", fontSize: 18, transform: [{ scaleX: -1 }] },
  newChatIcon: { color: "#fff", fontSize: 20 },
  chatContent: { paddingHorizontal: 16, paddingTop: 16 },
  centerLoader: { flex: 1, justifyContent: "center", alignItems: "center" },
  inputBlur: { borderTopWidth: 0.5, borderTopColor: "rgba(255,255,255,0.1)" },
  inputContainer: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  input: { flex: 1, backgroundColor: "#1e293b", color: "#fff", borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100 },
  send: { fontSize: 24, color: "#3b82f6" },
  sendDisabled: { opacity: 0.5 },
  icon: { fontSize: 24, color: "#fff" },
  sendButton: { padding: 4 },
  previewContainer: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "rgba(0,0,0,0.6)", marginHorizontal: 16, marginBottom: 8, borderRadius: 12 },
  previewImage: { width: 50, height: 50, borderRadius: 8, marginRight: 12 },
  removeText: { color: "#ef4444", fontWeight: "600" },
  userWrapper: { alignItems: "flex-end", marginVertical: 6 },
  userBubble: { maxWidth: "80%", backgroundColor: "#3b82f6", borderRadius: 22, borderBottomRightRadius: 4, paddingHorizontal: 16, paddingVertical: 10 },
  aiWrapper: { alignItems: "flex-start", marginVertical: 6 },
  aiBubble: { maxWidth: "85%", borderRadius: 22, borderBottomLeftRadius: 4, paddingHorizontal: 16, paddingVertical: 12, overflow: "hidden", backgroundColor: "rgba(30,41,59,0.7)" },
  messageFooter: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginTop: 4, gap: 6 },
  userTime: { fontSize: 10, color: "rgba(255,255,255,0.7)" },
  aiTime: { fontSize: 10, color: "#94a3b8", marginTop: 6, textAlign: "right" },
  errorIcon: { fontSize: 12, color: "#ef4444" },
  regenerating: { flexDirection: "row", alignItems: "center", gap: 8 },
  regeneratingText: { color: "#94a3b8", fontSize: 14, marginLeft: 8 },
  pinIcon: { fontSize: 12, color: "#facc15", position: "absolute", top: -6, right: -6 },
  cursor: { fontSize: 18, color: "#3b82f6", marginLeft: 2 },
  typingWrapper: { alignItems: "flex-start", paddingHorizontal: 16, marginBottom: 8 },
  typingBlur: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, overflow: "hidden", gap: 8 },
  typingDots: { flexDirection: "row", alignItems: "center", gap: 2 },
  dot: { fontSize: 24, color: "#3b82f6", lineHeight: 20 },
  typingText: { color: "#aaa", fontSize: 13, marginLeft: 4 },
  sectionHeader: { paddingVertical: 8, paddingHorizontal: 12, marginTop: 8, marginBottom: 4, backgroundColor: "rgba(15,23,42,0.8)", borderRadius: 8, alignSelf: "flex-start" },
  sectionHeaderText: { color: "#94a3b8", fontSize: 12, fontWeight: "600", letterSpacing: 0.5 },
  scrollFab: { position: "absolute", backgroundColor: "#3b82f6", width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, elevation: 5 },
  scrollFabText: { color: "#fff", fontSize: 24 },
  moodChip: { alignSelf: "flex-start", borderRadius: 16, paddingHorizontal: 8, paddingVertical: 2, marginTop: 6 },
  moodText: { fontSize: 11, color: "#fff", fontWeight: "600" },
});