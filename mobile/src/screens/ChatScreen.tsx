import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  TextInput,
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
  Pressable,
  Animated,
  SectionList,
  SectionListData,
  Dimensions,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as ImagePicker from "expo-image-picker";
import Markdown from "react-native-markdown-display";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect } from "@react-navigation/native";

import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import OfflineBanner from "../components/OfflineBanner";

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type Status = "sending" | "sent" | "error";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  time: string;
  status?: Status;
  isRegenerating?: boolean;
  pinned?: boolean;
  streamingText?: string;
  isStreaming?: boolean;
}

type ImageAsset = ImagePicker.ImagePickerAsset;
type ChatSection = {
  title: string;
  data: Message[];
};

const getTime = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const generateId = () => `${Date.now()}_${Math.random().toString(36).slice(2)}`;
const PINNED_KEY = "@pinned_messages";

// Typing Dots Component
const TypingDots = () => {
  const [dot1] = useState(new Animated.Value(0));
  const [dot2] = useState(new Animated.Value(0));
  const [dot3] = useState(new Animated.Value(0));

  useEffect(() => {
    const animate = (value: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: 1,
            duration: 300,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };
    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
  }, [dot1, dot2, dot3]);

  const opacity = (value: Animated.Value) =>
    value.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    });

  return (
    <View style={styles.typingDotsContainer}>
      <Animated.Text style={[styles.dot, { opacity: opacity(dot1) }]}>
        •
      </Animated.Text>
      <Animated.Text style={[styles.dot, { opacity: opacity(dot2) }]}>
        •
      </Animated.Text>
      <Animated.Text style={[styles.dot, { opacity: opacity(dot3) }]}>
        •
      </Animated.Text>
    </View>
  );
};

// Memoized Message Item
const MessageItem = React.memo(
  ({
    item,
    index,
    onLongPress,
  }: {
    item: Message;
    index: number;
    onLongPress: (message: Message) => void;
  }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;

    useEffect(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          delay: Math.min(index * 50, 500),
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          tension: 50,
          friction: 7,
          delay: Math.min(index * 50, 500),
          useNativeDriver: true,
        }),
      ]).start();
    }, [fadeAnim, translateY, index]);

    if (item.isUser) {
      return (
        <Animated.View
          style={[
            styles.userMessageWrapper,
            {
              opacity: fadeAnim,
              transform: [{ translateY }],
            },
          ]}
        >
          <Pressable
            onLongPress={() => onLongPress(item)}
            delayLongPress={200}
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
          >
            <View style={styles.userBubble}>
              <Markdown
                style={{
                  body: { color: "#fff", fontSize: 16 },
                  paragraph: { marginVertical: 0 },
                }}
              >
                {item.text}
              </Markdown>
              <View style={styles.messageFooter}>
                <Text style={styles.timeTextUser}>{item.time}</Text>
                {item.status === "sending" && (
                  <ActivityIndicator size="small" color="#fff" />
                )}
                {item.status === "error" && (
                  <Text style={styles.errorIcon}>⚠️</Text>
                )}
              </View>
            </View>
          </Pressable>
        </Animated.View>
      );
    }

    return (
      <Animated.View
        style={[
          styles.aiMessageWrapper,
          {
            opacity: fadeAnim,
            transform: [{ translateY }],
          },
        ]}
      >
        <Pressable
          onLongPress={() => onLongPress(item)}
          delayLongPress={200}
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <BlurView intensity={25} tint="dark" style={styles.aiBubble}>
            {item.pinned && <Text style={styles.pinIcon}>📌</Text>}
            {item.isRegenerating ? (
              <View style={styles.regeneratingContainer}>
                <ActivityIndicator size="small" color="#3b82f6" />
                <Text style={styles.regeneratingText}>Regenerating...</Text>
              </View>
            ) : item.isStreaming && item.streamingText ? (
              <Markdown
                style={{
                  body: { color: "#e2e8f0", fontSize: 16 },
                  paragraph: { marginVertical: 0 },
                  code_inline: {
                    backgroundColor: "#0f172a",
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                    color: "#38bdf8",
                  },
                  code_block: {
                    backgroundColor: "#0f172a",
                    padding: 12,
                    borderRadius: 8,
                    color: "#e2e8f0",
                  },
                  link: { color: "#60a5fa" },
                }}
              >
                {item.streamingText}
              </Markdown>
            ) : (
              <Markdown
                style={{
                  body: { color: "#e2e8f0", fontSize: 16 },
                  paragraph: { marginVertical: 0 },
                  code_inline: {
                    backgroundColor: "#0f172a",
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                    color: "#38bdf8",
                  },
                  code_block: {
                    backgroundColor: "#0f172a",
                    padding: 12,
                    borderRadius: 8,
                    color: "#e2e8f0",
                  },
                  link: { color: "#60a5fa" },
                }}
              >
                {item.text}
              </Markdown>
            )}
            <Text style={styles.timeTextAi}>{item.time}</Text>
          </BlurView>
        </Pressable>
      </Animated.View>
    );
  }
);

// Empty State Component
const EmptyState = ({ onSuggestionPress }: { onSuggestionPress: (text: string) => void }) => {
  const gradientAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(gradientAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: false,
        }),
        Animated.timing(gradientAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: false,
        }),
      ])
    ).start();
    Animated.spring(titleAnim, {
      toValue: 1,
      tension: 40,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [gradientAnim, titleAnim]);

  const suggestions = [
    { emoji: "💡", text: "Explain quantum physics" },
    { emoji: "🧠", text: "Mental health support" },
    { emoji: "📚", text: "Help me study" },
    { emoji: "💻", text: "Write code" },
  ];

  const backgroundColor = gradientAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#0f172a", "#1e1b4b"],
  });

  return (
    <Animated.View style={[styles.emptyContainer, { backgroundColor }]}>
      <Animated.View
        style={[
          styles.emptyContent,
          {
            transform: [{ scale: titleAnim }],
          },
        ]}
      >
        <Text style={styles.emptyTitle}>✨ NeuroMind AI</Text>
        <Text style={styles.emptySubtitle}>
          Start a conversation with NeuroMind AI
        </Text>
        <View style={styles.suggestionsGrid}>
          {suggestions.map((suggestion) => (
            <TouchableOpacity
              key={suggestion.text}
              style={styles.suggestionChip}
              onPress={() => onSuggestionPress(suggestion.text)}
              activeOpacity={0.7}
            >
              <Text style={styles.suggestionEmoji}>{suggestion.emoji}</Text>
              <Text style={styles.suggestionText}>{suggestion.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
};

export default function ChatScreen({ navigation }: any) {
  const { logout } = useAuth();
  const { activeSessionId, selectSession, createNewSession, addSession } =
    useChat();

  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [image, setImage] = useState<ImageAsset | null>(null);
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [inputHeight, setInputHeight] = useState(40);

  const sectionListRef = useRef<SectionList<Message, ChatSection>>(null);
  const isMounted = useRef(true);
  const currentSessionRef = useRef<string | null>(null);
  const lastLoadedSessionRef = useRef<string | null>(null);
  const loadingMessagesRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  const safeSetChat = useCallback((fn: (prev: Message[]) => Message[]) => {
    if (isMounted.current) setChat(fn);
  }, []);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (sectionListRef.current) {
        // simple scroll to end using SectionList – we rely on onContentSizeChange
        sectionListRef.current.scrollToLocation({
          sectionIndex: sections.length - 1,
          itemIndex: (sections[sections.length - 1]?.data.length || 0) - 1,
          animated: true,
          viewPosition: 1,
        });
      }
    });
  };

  const loadPinnedMap = async () => {
    try {
      const raw = await AsyncStorage.getItem(PINNED_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const loadMessages = useCallback(async (force = false) => {
    if (!activeSessionId) return;
    if (!force && lastLoadedSessionRef.current === activeSessionId) return;
    if (loadingMessagesRef.current) return;

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    loadingMessagesRef.current = true;
    currentSessionRef.current = activeSessionId;
    setInitialLoading(true);

    try {
      const res = await API.get(`/chat/messages/${activeSessionId}`, {
        signal: abortControllerRef.current.signal,
      });
      if (currentSessionRef.current !== activeSessionId) return;
      if (!isMounted.current) return;

      const raw = Array.isArray(res.data?.data) ? res.data.data : [];
      const sorted = raw.sort(
        (a: any, b: any) =>
          new Date(a.createdAt || 0).getTime() -
          new Date(b.createdAt || 0).getTime()
      );
      const formatted: Message[] = sorted.map((m: any, idx: number) => ({
        id: `${m.createdAt || Date.now()}_${idx}`,
        text: m.content || "",
        isUser: m.role === "user",
        time: new Date(m.createdAt || Date.now()).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      }));
      const pinnedMap = await loadPinnedMap();
      const withPins = formatted.map((msg) => ({
        ...msg,
        pinned: !!pinnedMap[msg.id],
      }));
      safeSetChat(() => withPins);
      lastLoadedSessionRef.current = activeSessionId;
    } catch (error: any) {
      if (error.name === "AbortError") return;
      if (isMounted.current) {
        Alert.alert("Error", "Failed to load chat history");
      }
    } finally {
      if (isMounted.current) {
        setInitialLoading(false);
        setRefreshing(false);
      }
      loadingMessagesRef.current = false;
      if (abortControllerRef.current?.signal.aborted) {
        abortControllerRef.current = null;
      }
    }
  }, [activeSessionId, safeSetChat]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useFocusEffect(
    useCallback(() => {
      if (activeSessionId) {
        loadMessages();
      }
    }, [activeSessionId, loadMessages])
  );

  const handleRefresh = useCallback(() => {
    if (!activeSessionId || refreshing) return;
    setRefreshing(true);
    lastLoadedSessionRef.current = null;
    loadMessages(true);
  }, [activeSessionId, refreshing, loadMessages]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.length) setImage(result.assets[0]);
  };

  const simulateStreaming = useCallback(
    async (messageId: string, fullText: string) => {
      const words = fullText.split(" ");
      let currentText = "";
      for (let i = 0; i < words.length; i++) {
        if (!isMounted.current) break;
        currentText += (i === 0 ? "" : " ") + words[i];
        safeSetChat((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? { ...msg, streamingText: currentText, isStreaming: true }
              : msg
          )
        );
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      safeSetChat((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, text: fullText, streamingText: undefined, isStreaming: false }
            : msg
        )
      );
    },
    [safeSetChat]
  );

  const sendMessage = async (
    text: string,
    imageObj?: ImageAsset | null,
    replaceAiMessageId?: string | null
  ) => {
    if (loading) return;
    if (!text && !imageObj) return;

    if (!replaceAiMessageId) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      safeSetChat((prev) => [
        ...prev,
        {
          id: generateId(),
          text: text || (imageObj ? "📷 Image" : ""),
          isUser: true,
          time: getTime(),
          status: "sending",
        },
      ]);
    }

    setLoading(true);
    setIsTyping(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

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

      setIsTyping(false);

      if (!replaceAiMessageId) {
        safeSetChat((prev) =>
          prev.map((msg) =>
            msg.status === "sending" ? { ...msg, status: "sent" } : msg
          )
        );
        const newAiId = generateId();
        safeSetChat((prev) => [
          ...prev,
          {
            id: newAiId,
            text: "",
            streamingText: "",
            isUser: false,
            time: getTime(),
            isStreaming: true,
          },
        ]);
        await simulateStreaming(newAiId, reply);
      } else if (replaceAiMessageId) {
        safeSetChat((prev) =>
          prev.map((msg) =>
            msg.id === replaceAiMessageId
              ? { ...msg, isRegenerating: false }
              : msg
          )
        );
        safeSetChat((prev) =>
          prev.map((msg) =>
            msg.id === replaceAiMessageId
              ? { ...msg, text: reply, time: getTime(), isRegenerating: false }
              : msg
          )
        );
        setRegeneratingMessageId(null);
      }

      if (response.data?.sessionId) selectSession(response.data.sessionId);
      if (!replaceAiMessageId) setImage(null);
      scrollToBottom();
    } catch (error) {
      setIsTyping(false);
      if (!replaceAiMessageId) {
        safeSetChat((prev) =>
          prev.map((msg) =>
            msg.status === "sending" ? { ...msg, status: "error" } : msg
          )
        );
        Alert.alert("Error", "Message could not be sent");
      } else if (replaceAiMessageId) {
        safeSetChat((prev) =>
          prev.map((msg) =>
            msg.id === replaceAiMessageId
              ? { ...msg, isRegenerating: false }
              : msg
          )
        );
        setRegeneratingMessageId(null);
        Alert.alert("Error", "Could not regenerate");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed && !image) return;
    setMessage("");
    sendMessage(trimmed, image);
  };

  const handleSuggestionPress = (suggestionText: string) => {
    sendMessage(suggestionText, null);
  };

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Copied", "Message copied");
  };

  const deleteMessage = (messageId: string) => {
    Alert.alert("Delete message", "Remove from this device only?", [
      { text: "Cancel", style: "cancel" as const },
      {
        text: "Delete",
        style: "destructive" as const,
        onPress: () => safeSetChat((prev) => prev.filter((m) => m.id !== messageId)),
      },
    ]);
  };

  const togglePin = async (message: Message) => {
    const newPinned = !message.pinned;
    safeSetChat((prev) =>
      prev.map((m) => (m.id === message.id ? { ...m, pinned: newPinned } : m))
    );
    try {
      const existing = await AsyncStorage.getItem(PINNED_KEY);
      let pinnedMap = existing ? JSON.parse(existing) : {};
      if (newPinned) pinnedMap[message.id] = true;
      else delete pinnedMap[message.id];
      await AsyncStorage.setItem(PINNED_KEY, JSON.stringify(pinnedMap));
      if (newPinned)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.warn(e);
    }
  };

  const regenerateMessage = async (aiMessageId: string, aiIndex: number) => {
    let userMessageText = "";
    for (let i = aiIndex - 1; i >= 0; i--) {
      if (chat[i].isUser) {
        userMessageText = chat[i].text;
        break;
      }
    }
    if (!userMessageText) {
      Alert.alert("Cannot regenerate", "No user message found");
      return;
    }
    safeSetChat((prev) =>
      prev.map((msg) =>
        msg.id === aiMessageId ? { ...msg, isRegenerating: true } : msg
      )
    );
    setRegeneratingMessageId(aiMessageId);
    await sendMessage(userMessageText, null, aiMessageId);
  };

  const handleLongPress = (message: Message) => {
    if (message.isRegenerating) return;
    const options: any[] = [
      { text: "Copy", onPress: () => copyToClipboard(message.text) },
      { text: message.pinned ? "Unpin" : "Pin", onPress: () => togglePin(message) },
      { text: "Delete", onPress: () => deleteMessage(message.id), style: "destructive" as const },
      { text: "Cancel", style: "cancel" as const },
    ];
    if (!message.isUser) {
      const index = chat.findIndex((m) => m.id === message.id);
      options.splice(2, 0, {
        text: "Regenerate",
        onPress: () => regenerateMessage(message.id, index),
      });
    }
    Alert.alert("Message options", "", options, { cancelable: true });
  };

  // Create a new chat session (used by header button & sidebar)
  const handleNewChat = async () => {
    if (createNewSession) {
      const newId = await createNewSession();
      if (newId) {
        safeSetChat(() => []);
        lastLoadedSessionRef.current = null;
      }
    } else {
      const newId = `local_${Date.now()}`;
      addSession({
        sessionId: newId,
        title: "New Chat",
        lastMessage: "",
        updatedAt: new Date().toISOString(),
      });
      selectSession(newId);
      safeSetChat(() => []);
      lastLoadedSessionRef.current = null;
    }
  };

  // Pinned + regular messages
  const pinnedMessages = chat.filter((m) => m.pinned);
  const regularMessages = chat.filter((m) => !m.pinned);

  const sections = useMemo<ChatSection[]>(() => {
    const secs: ChatSection[] = [];
    if (pinnedMessages.length > 0) {
      secs.push({ title: "📌 Pinned", data: pinnedMessages });
    }
    secs.push({ title: "Chat History", data: regularMessages });
    return secs;
  }, [pinnedMessages, regularMessages]);

  const renderSectionHeader = ({ section }: { section: SectionListData<Message, ChatSection> }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  );

  const renderItem = ({ item, index }: { item: Message; index: number }) => (
    <MessageItem item={item} index={index} onLongPress={handleLongPress} />
  );

  const keyExtractor = (item: Message) => item.id;

  // Initial loading state
  if (initialLoading) {
    return (
      <LinearGradient colors={["#0f172a", "#020617"]} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerLoader}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Empty state (no messages)
  if (chat.length === 0 && !loading && !initialLoading) {
    return (
      <LinearGradient colors={["#0f172a", "#020617"]} style={styles.gradient}>
        <StatusBar style="light" />
        <OfflineBanner />
        <SafeAreaView style={styles.safeArea}>
          <BlurView intensity={50} tint="dark" style={styles.headerBlur}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.openDrawer()}>
                <Text style={styles.menu}>☰</Text>
              </TouchableOpacity>
              <Text style={styles.title}>NeuroMind</Text>
              <View style={styles.headerActions}>
                <TouchableOpacity onPress={handleRefresh}>
                  <Text style={styles.refreshIcon}>⟳</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleNewChat}>
                  <Text style={styles.newChatIcon}>➕</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={logout}>
                  <Text style={styles.logout}>Logout</Text>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
          <EmptyState onSuggestionPress={handleSuggestionPress} />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Main chat view
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
          <BlurView intensity={50} tint="dark" style={styles.headerBlur}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.openDrawer()}>
                <Text style={styles.menu}>☰</Text>
              </TouchableOpacity>
              <Text style={styles.title}>NeuroMind</Text>
              <View style={styles.headerActions}>
                <TouchableOpacity onPress={handleRefresh}>
                  <Text style={styles.refreshIcon}>⟳</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleNewChat}>
                  <Text style={styles.newChatIcon}>➕</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={logout}>
                  <Text style={styles.logout}>Logout</Text>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>

          <SectionList
            ref={sectionListRef}
            sections={sections}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator={false}
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            windowSize={5}
            onContentSizeChange={scrollToBottom}
            keyboardDismissMode="interactive"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#3b82f6"
                colors={["#3b82f6"]}
              />
            }
          />

          {image && (
            <View style={styles.previewContainer}>
              <Image source={{ uri: image.uri }} style={styles.previewImage} />
              <TouchableOpacity onPress={() => setImage(null)}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}

          {isTyping && (
            <View style={styles.typingIndicatorWrapper}>
              <BlurView intensity={40} tint="dark" style={styles.typingBlur}>
                <TypingDots />
                <Text style={styles.typingText}>AI is thinking...</Text>
              </BlurView>
            </View>
          )}

          <BlurView intensity={80} tint="dark" style={styles.inputBlur}>
            <View style={styles.inputContainer}>
              <TouchableOpacity onPress={pickImage} style={styles.iconButton}>
                <Text style={styles.icon}>🖼️</Text>
              </TouchableOpacity>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Type a message..."
                placeholderTextColor="#aaa"
                style={[styles.input, { height: Math.min(100, Math.max(40, inputHeight)) }]}
                multiline
                onContentSizeChange={(e) =>
                  setInputHeight(e.nativeEvent.contentSize.height)
                }
              />
              <TouchableOpacity
                onPress={handleSend}
                disabled={loading}
                style={styles.sendButton}
                activeOpacity={0.7}
              >
                <Animated.Text
                  style={[
                    styles.send,
                    loading && styles.sendDisabled,
                  ]}
                >
                  ➤
                </Animated.Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

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
  headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  refreshIcon: { color: "#fff", fontSize: 18, transform: [{ scaleX: -1 }] },
  newChatIcon: { color: "#fff", fontSize: 20 },
  chatContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 80 },
  centerLoader: { flex: 1, justifyContent: "center", alignItems: "center" },
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
  previewImage: { width: 50, height: 50, borderRadius: 8, marginRight: 12 },
  removeText: { color: "#ef4444", fontWeight: "600" },
  inputBlur: {
    borderTopWidth: 0.5,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#1e293b",
    color: "#fff",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  send: { fontSize: 24, color: "#3b82f6" },
  sendDisabled: { opacity: 0.5 },
  icon: { fontSize: 24, color: "#fff" },
  iconButton: { padding: 4 },
  sendButton: { padding: 4 },
  userMessageWrapper: {
    alignItems: "flex-end",
    marginVertical: 6,
  },
  userBubble: {
    maxWidth: "80%",
    backgroundColor: "#3b82f6",
    borderRadius: 22,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  aiMessageWrapper: {
    alignItems: "flex-start",
    marginVertical: 6,
  },
  aiBubble: {
    maxWidth: "85%",
    borderRadius: 22,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    overflow: "hidden",
    backgroundColor: "rgba(30, 41, 59, 0.7)",
  },
  messageFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 4,
    gap: 6,
  },
  timeTextUser: { fontSize: 10, color: "rgba(255,255,255,0.7)" },
  timeTextAi: { fontSize: 10, color: "#94a3b8", marginTop: 6, textAlign: "right" },
  errorIcon: { fontSize: 12, color: "#ef4444" },
  regeneratingContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  regeneratingText: { color: "#94a3b8", fontSize: 14, marginLeft: 8 },
  pinIcon: {
    fontSize: 12,
    color: "#facc15",
    position: "absolute",
    top: -6,
    right: -6,
  },
  typingIndicatorWrapper: {
    alignItems: "flex-start",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  typingBlur: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: "hidden",
    gap: 8,
  },
  typingDotsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  dot: {
    fontSize: 24,
    color: "#3b82f6",
    lineHeight: 20,
  },
  typingText: { color: "#aaa", fontSize: 13, marginLeft: 4 },
  sectionHeader: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  sectionHeaderText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyContent: {
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 18,
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 40,
  },
  suggestionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    marginTop: 20,
  },
  suggestionChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(30, 41, 59, 0.8)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    gap: 8,
    borderWidth: 0.5,
    borderColor: "rgba(59, 130, 246, 0.5)",
  },
  suggestionEmoji: { fontSize: 18 },
  suggestionText: { color: "#e2e8f0", fontSize: 14, fontWeight: "500" },
});