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
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';

import API from "../services/api";
import ChatBubble from "../components/ChatBubble";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import OfflineBanner from '../components/OfflineBanner';

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

type Status = "sending" | "sent" | "error";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  time: string;
  status?: Status;
  isRegenerating?: boolean;
  pinned?: boolean;
}

type ImageAsset = ImagePicker.ImagePickerAsset;

const getTime = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const generateId = () => `${Date.now()}_${Math.random().toString(36).slice(2)}`;
const PINNED_KEY = "@pinned_messages";

export default function ChatScreen({ navigation }: any) {
  const { logout } = useAuth();
  const { activeSessionId, selectSession, createNewSession, addSession } = useChat();

  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [image, setImage] = useState<ImageAsset | null>(null);
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const isMounted = useRef(true);
  const currentSessionRef = useRef<string | null>(null);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  const safeSetChat = useCallback((fn: (prev: Message[]) => Message[]) => {
    if (isMounted.current) setChat(fn);
  }, []);

  const scrollToBottom = () => requestAnimationFrame(() => flatListRef.current?.scrollToEnd({ animated: true }));

  const loadMessages = useCallback(async () => {
    if (!activeSessionId) return;
    currentSessionRef.current = activeSessionId;
    setInitialLoading(true);
    try {
      const res = await API.get(`/chat/messages/${activeSessionId}`);
      if (currentSessionRef.current !== activeSessionId) return;
      const raw = Array.isArray(res.data?.data) ? res.data.data : [];
      const sorted = raw.sort((a: any, b: any) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
      const formatted: Message[] = sorted.map((m: any, idx: number) => ({
        id: `${m.createdAt || Date.now()}_${idx}`,
        text: m.content || "",
        isUser: m.role === "user",
        time: new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }));
      // Load pinned status from local storage
      const pinnedMap = await loadPinnedMap();
      const withPins = formatted.map(msg => ({ ...msg, pinned: !!pinnedMap[msg.id] }));
      safeSetChat(() => withPins);
    } catch (error) {
      Alert.alert("Error", "Failed to load chat history");
    } finally {
      setInitialLoading(false);
    }
  }, [activeSessionId, safeSetChat]);

  const loadPinnedMap = async () => {
    try {
      const raw = await AsyncStorage.getItem(PINNED_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  };

  useEffect(() => { loadMessages(); }, [loadMessages]);
  useEffect(() => { if (chat.length) scrollToBottom(); }, [chat]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!result.canceled && result.assets?.length) setImage(result.assets[0]);
  };

  const sendMessage = async (text: string, imageObj?: ImageAsset | null, replaceAiMessageId?: string | null) => {
    if (loading) return;
    if (!text && !imageObj) return;
    const tempId = generateId();
    let userMessageAdded = false;
    if (!replaceAiMessageId) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      safeSetChat(prev => [...prev, { id: tempId, text: text || (imageObj ? "📷 Image" : ""), isUser: true, time: getTime(), status: "sending" }]);
      userMessageAdded = true;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      if (text) formData.append("message", text);
      if (activeSessionId) formData.append("sessionId", activeSessionId);
      if (imageObj) formData.append("files", { uri: imageObj.uri, name: "image.jpg", type: "image/jpeg" } as any);
      const response = await API.post("/ai/unified-chat", formData, { headers: { "Content-Type": "multipart/form-data" } });
      const reply = response.data?.reply || "I'm here for you.";
      if (userMessageAdded) {
        safeSetChat(prev => prev.map(msg => msg.id === tempId ? { ...msg, status: "sent" } : msg));
        safeSetChat(prev => [...prev, { id: generateId(), text: reply, isUser: false, time: getTime() }]);
      } else if (replaceAiMessageId) {
        safeSetChat(prev => prev.map(msg => msg.id === replaceAiMessageId ? { ...msg, text: reply, time: getTime(), isRegenerating: false } : msg));
        setRegeneratingMessageId(null);
      }
      if (response.data?.sessionId) selectSession(response.data.sessionId);
      if (userMessageAdded) setImage(null);
    } catch (error) {
      if (userMessageAdded) safeSetChat(prev => prev.map(msg => msg.id === tempId ? { ...msg, status: "error" } : msg));
      else if (replaceAiMessageId) {
        safeSetChat(prev => prev.map(msg => msg.id === replaceAiMessageId ? { ...msg, isRegenerating: false } : msg));
        setRegeneratingMessageId(null);
        Alert.alert("Error", "Could not regenerate");
      } else Alert.alert("Error", "Message could not be sent");
    } finally { setLoading(false); }
  };

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed && !image) return;
    setMessage("");
    sendMessage(trimmed, image);
  };

  // --- Clipboard ---
  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Copied', 'Message copied to clipboard');
  };

  // --- Delete message (local only) ---
  const deleteMessage = (messageId: string) => {
    Alert.alert("Delete message", "Are you sure? This only removes it from this device.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => safeSetChat(prev => prev.filter(m => m.id !== messageId)) }
    ]);
  };

  // --- Pin / Unpin message (local only) ---
  const togglePin = async (message: Message) => {
    const newPinned = !message.pinned;
    safeSetChat(prev => prev.map(m => m.id === message.id ? { ...m, pinned: newPinned } : m));
    try {
      const existing = await AsyncStorage.getItem(PINNED_KEY);
      let pinnedMap = existing ? JSON.parse(existing) : {};
      if (newPinned) pinnedMap[message.id] = true;
      else delete pinnedMap[message.id];
      await AsyncStorage.setItem(PINNED_KEY, JSON.stringify(pinnedMap));
      if (newPinned) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) { console.warn(e); }
  };

  // --- Regenerate ---
  const regenerateMessage = async (aiMessageId: string, aiIndex: number) => {
    let userMessageText = '';
    for (let i = aiIndex - 1; i >= 0; i--) {
      if (chat[i].isUser) { userMessageText = chat[i].text; break; }
    }
    if (!userMessageText) { Alert.alert('Cannot regenerate', 'No user message found'); return; }
    safeSetChat(prev => prev.map(msg => msg.id === aiMessageId ? { ...msg, isRegenerating: true } : msg));
    setRegeneratingMessageId(aiMessageId);
    await sendMessage(userMessageText, null, aiMessageId);
  };

  // --- Voice input (record and send to backend STT – placeholder) ---
  const startRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) { Alert.alert("Permission needed", "Microphone access required"); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (err) { console.error(err); Alert.alert("Error", "Could not start recording"); }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;
    setIsRecording(false);
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      // TODO: send URI to backend STT endpoint
      Alert.alert("Voice note", `Recorded audio. STT not integrated yet – you can implement it.`);
    } catch (err) { console.error(err); }
    recordingRef.current = null;
  };

  // --- Search filter ---
  const filteredChat = useMemo(() => {
    if (!searchQuery.trim()) return chat;
    const q = searchQuery.toLowerCase();
    return chat.filter(m => m.text.toLowerCase().includes(q));
  }, [chat, searchQuery]);

  // --- New Chat (using createNewSession from context) ---
  const handleNewChat = async () => {
    if (createNewSession) {
      const newId = await createNewSession();
      if (newId) {
        // Optionally navigate to the new session – already active because selectSession inside createNewSession
        // Just clear local messages (they will reload when activeSessionId changes)
        safeSetChat(() => []);
      }
    } else {
      // Fallback: direct session creation (for safety)
      const newId = `local_${Date.now()}`;
      addSession({ sessionId: newId, title: "New Chat", lastMessage: "", updatedAt: new Date().toISOString() });
      selectSession(newId);
      safeSetChat(() => []);
    }
  };

  // --- Render message with long‑press menu ---
  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    if (item.isUser) {
      return <ChatBubble text={item.text} isUser time={item.time} status={item.status} />;
    } else {
      const handleLongPress = () => {
        if (item.isRegenerating) return;
        Alert.alert(
          'Message options',
          '',
          [
            { text: 'Copy', onPress: () => copyToClipboard(item.text) },
            { text: item.pinned ? 'Unpin' : 'Pin', onPress: () => togglePin(item) },
            { text: 'Regenerate', onPress: () => regenerateMessage(item.id, index) },
            { text: 'Delete', onPress: () => deleteMessage(item.id), style: 'destructive' },
            { text: 'Cancel', style: 'cancel' },
          ],
          { cancelable: true }
        );
      };

      return (
        <TouchableOpacity onLongPress={handleLongPress} activeOpacity={0.7} disabled={item.isRegenerating}>
          <View style={styles.aiMessageContainer}>
            <View style={styles.aiBubble}>
              {item.pinned && <Text style={styles.pinIcon}>📌</Text>}
              {item.isRegenerating ? (
                <View style={styles.regeneratingContainer}>
                  <ActivityIndicator size="small" color="#3b82f6" />
                  <Text style={styles.regeneratingText}>Regenerating...</Text>
                </View>
              ) : (
                <Markdown style={markdownStyles}>{item.text}</Markdown>
              )}
              <Text style={styles.timeText}>{item.time}</Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }
  };

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

  return (
    <LinearGradient colors={["#0f172a", "#1e293b"]} style={styles.gradient}>
      <OfflineBanner />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}>
          <BlurView intensity={50} tint="dark" style={styles.headerBlur}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.openDrawer()}><Text style={styles.menu}>☰</Text></TouchableOpacity>
              <Text style={styles.title}>NeuroMind</Text>
              <View style={styles.headerActions}>
                {!showSearch ? (
                  <>
                    <TouchableOpacity onPress={() => setShowSearch(true)}><Text style={styles.searchIcon}>🔍</Text></TouchableOpacity>
                    <TouchableOpacity onPress={handleNewChat}><Text style={styles.newChatIcon}>➕</Text></TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.searchContainer}>
                    <TextInput autoFocus placeholder="Search messages..." value={searchQuery} onChangeText={setSearchQuery} style={styles.searchInput} placeholderTextColor="#aaa" />
                    <TouchableOpacity onPress={() => { setSearchQuery(""); setShowSearch(false); }}><Text style={styles.searchClose}>✖</Text></TouchableOpacity>
                  </View>
                )}
                <TouchableOpacity onPress={logout}><Text style={styles.logout}>Logout</Text></TouchableOpacity>
              </View>
            </View>
          </BlurView>

          {initialLoading ? (
            <View style={styles.centerLoader}><ActivityIndicator size="large" color="#3b82f6" /></View>
          ) : (
            <FlatList ref={flatListRef} data={filteredChat} keyExtractor={(item) => item.id} renderItem={renderMessage} contentContainerStyle={styles.chatContent} onContentSizeChange={scrollToBottom} keyboardDismissMode="interactive" />
          )}

          {image && (
            <View style={styles.previewContainer}>
              <Image source={{ uri: image.uri }} style={styles.previewImage} />
              <TouchableOpacity onPress={() => setImage(null)}><Text style={styles.removeText}>Remove</Text></TouchableOpacity>
            </View>
          )}

          {loading && (
            <View style={styles.typingIndicator}>
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text style={styles.typingText}>AI is thinking...</Text>
            </View>
          )}

          <BlurView intensity={80} tint="dark" style={styles.inputBlur}>
            <View style={styles.inputContainer}>
              <TouchableOpacity onPress={pickImage}><Text style={styles.icon}>🖼️</Text></TouchableOpacity>
              <TouchableOpacity onPressIn={startRecording} onPressOut={stopRecording} style={[styles.voiceBtn, isRecording && styles.recording]}><Text style={styles.icon}>🎤</Text></TouchableOpacity>
              <TextInput value={message} onChangeText={setMessage} placeholder="Type a message..." placeholderTextColor="#aaa" style={styles.input} multiline />
              <TouchableOpacity onPress={handleSend} disabled={loading}><Text style={[styles.send, loading && styles.sendDisabled]}>➤</Text></TouchableOpacity>
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
  headerBlur: { borderBottomWidth: 0.5, borderBottomColor: "rgba(255,255,255,0.1)" },
  header: { paddingHorizontal: 16, paddingVertical: 34, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  menu: { color: "#fff", fontSize: 24 },
  title: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  logout: { color: "#ef4444", fontWeight: "600" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  searchIcon: { color: "#fff", fontSize: 18 },
  newChatIcon: { color: "#fff", fontSize: 20 },
  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#1e293b", borderRadius: 20, paddingHorizontal: 8 },
  searchInput: { color: "#fff", width: 150, paddingVertical: 6 },
  searchClose: { color: "#fff", fontSize: 16 },
  chatContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 80 },
  centerLoader: { flex: 1, justifyContent: "center", alignItems: "center" },
  previewContainer: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "rgba(0,0,0,0.6)", marginHorizontal: 16, marginBottom: 8, borderRadius: 12 },
  previewImage: { width: 50, height: 50, borderRadius: 8, marginRight: 12 },
  removeText: { color: "#ef4444", fontWeight: "600" },
  typingIndicator: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 8, marginBottom: 4 },
  typingText: { color: "#aaa", marginLeft: 8, fontSize: 13 },
  inputBlur: { borderTopWidth: 0.5, borderTopColor: "rgba(255,255,255,0.1)" },
  inputContainer: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  input: { flex: 1, backgroundColor: "#1e293b", color: "#fff", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, maxHeight: 100 },
  send: { fontSize: 24, color: "#3b82f6" },
  sendDisabled: { opacity: 0.5 },
  icon: { fontSize: 24, color: "#fff", paddingHorizontal: 4 },
  voiceBtn: { padding: 4, borderRadius: 30 },
  recording: { backgroundColor: "#ef4444" },
  aiMessageContainer: { flexDirection: 'row', justifyContent: 'flex-start', marginVertical: 8 },
  aiBubble: { maxWidth: '80%', backgroundColor: '#1e293b', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, borderBottomLeftRadius: 4 },
  timeText: { fontSize: 10, color: '#94a3b8', marginTop: 6, textAlign: 'right' },
  regeneratingContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  regeneratingText: { color: '#94a3b8', fontSize: 14, marginLeft: 8 },
  pinIcon: { fontSize: 12, color: '#facc15', position: 'absolute', top: -6, right: -6 },
});