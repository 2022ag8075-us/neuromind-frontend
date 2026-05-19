import React, { useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  StatusBar,
  useWindowDimensions,
  Linking,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedScrollHandler,
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ---------- Feature data (matching the image) ----------
const FEATURES = [
  { icon: "💬", title: "AI Therapy Support", description: "Empathetic conversations whenever you need them." },
  { icon: "📚", title: "Smart Study Assistant", description: "Boost productivity with AI‑powered learning tips." },
  { icon: "😊", title: "Mood Detection", description: "Recognize emotional patterns and get insights." },
  { icon: "🎤", title: "AI Voice Conversations", description: "Talk naturally using voice input." },
  { icon: "⚡", title: "Productivity Coach", description: "Stay focused with personalised coaching." },
  { icon: "🔒", title: "Secure Private Chats", description: "End‑to‑end encrypted conversations." },
];

// ---------- Main Component ----------
export default function LandingScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const heroStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scrollY.value, [0, 200], [0, -40], Extrapolate.CLAMP) }],
    opacity: interpolate(scrollY.value, [0, 150], [1, 0.95], Extrapolate.CLAMP),
  }));

  const cardWidth = width > 600 ? (width - 56) / 3 : (width - 48) / 2;

  // Social links (kept from original – optional)
  const openLink = useCallback(async (url: string) => {
    if (!url.startsWith("http")) {
      Alert.alert("Invalid link", "The URL is not properly formatted.");
      return;
    }
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Cannot open", "Please install the respective app or check your connection.");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open the link. Please try again manually.");
    }
  }, []);

  const handleStartConversation = () => {
    navigation.navigate("Register");
  };

  const handleContinueAsGuest = () => {
    // Guest mode: you can implement a guest session or simply show a message.
    // For now, we'll navigate to Register (users can skip signup later if needed).
    Alert.alert("Guest Mode", "Please create an account to start chatting.");
    navigation.navigate("Register");
  };

  const handleLogin = () => {
    navigation.navigate("Login");
  };

  return (
    <>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO SECTION */}
        <Animated.View style={[styles.heroWrapper, heroStyle]}>
          <LinearGradient colors={["#0f172a", "#1e1b4b", "#0f172a"] as const} style={styles.hero}>
            <Text style={styles.logo}>🧠</Text>
            <Text style={styles.title}>NeuroMind AI</Text>
            <Text style={styles.subtitle}>Your Intelligent Mental Wellness Companion</Text>
            <Text style={styles.tagline}>Start small. Speak openly.</Text>
            <View style={styles.onlineStatus}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Online AI Status</Text>
            </View>

            {/* Smart Preview (Chat simulation) */}
            <View style={styles.smartPreview}>
              <LinearGradient colors={["#1e293b", "#0f172a"] as const} style={styles.previewCard}>
                <Text style={styles.previewUser}>I feel stressed today.</Text>
                <Text style={styles.previewAI}>I understand. Let’s work through it together.</Text>
                <View style={styles.previewTyping}>
                  <Text style={styles.typingDots}>Typing...</Text>
                </View>
                <View style={styles.previewLabels}>
                  <Text style={styles.label}>Stressed</Text>
                  <Text style={styles.label}>Calming wave</Text>
                </View>
              </LinearGradient>
            </View>

            {/* Action Buttons */}
            <Pressable
              style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
              onPress={handleStartConversation}
            >
              <LinearGradient colors={["#6366F1", "#4F46E5"] as const} style={styles.buttonGradient}>
                <Text style={styles.primaryText}>Start Conversation →</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
              onPress={handleContinueAsGuest}
            >
              <Text style={styles.secondaryText}>Continue as Guest</Text>
            </Pressable>

            <Pressable onPress={handleLogin}>
              <Text style={styles.linkText}>Already have an account? Login</Text>
            </Pressable>
          </LinearGradient>
        </Animated.View>

        {/* FEATURES GRID */}
        <View style={styles.section}>
          <Animated.Text entering={FadeInDown.delay(200)} style={styles.sectionTitle}>
            Features
          </Animated.Text>
          <View style={styles.featureGrid}>
            {FEATURES.map((f, idx) => (
              <FeatureCard key={idx} {...f} index={idx} cardWidth={cardWidth} />
            ))}
          </View>
        </View>

        {/* Optional Footer */}
        <LinearGradient colors={["#020617", "#000000"] as const} style={styles.footer}>
          <Text style={styles.footerText}>© 2026 NeuroMind AI</Text>
          <Text style={styles.footerSub}>Built with ❤️ for mental wellness</Text>
          <Text style={styles.footerSmall}>Designed & Developed by USAMA</Text>
          <View style={styles.footerLinks}>
            <Text style={styles.footerLink}>Privacy</Text>
            <Text style={styles.footerLink}>Terms</Text>
            <Text style={styles.footerLink}>Contact</Text>
          </View>
        </LinearGradient>
      </Animated.ScrollView>
    </>
  );
}

// Feature Card Component (memoized)
const FeatureCard = React.memo(({ icon, title, description, index, cardWidth }: any) => (
  <Animated.View
    entering={FadeInUp.delay(index * 80).springify().damping(12)}
    style={[styles.featureCard, { width: cardWidth }]}
  >
    <LinearGradient colors={["#1e293b", "#0f172a"] as const} style={styles.cardGradient}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDesc}>{description}</Text>
    </LinearGradient>
  </Animated.View>
));

const styles = StyleSheet.create({
  heroWrapper: { width: "100%", minHeight: 600 },
  hero: { flex: 1, paddingHorizontal: 30, paddingVertical: 60, alignItems: "center", justifyContent: "center" },
  logo: { fontSize: 80, marginBottom: 12, textShadowColor: "#4F46E5", textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 15 },
  title: { fontSize: 40, fontWeight: "bold", color: "#449de6", textAlign: "center", letterSpacing: 1 },
  subtitle: { color: "#448adf", textAlign: "center", fontSize: 18, marginTop: 4 },
  tagline: { color: "#94a3b8", textAlign: "center", fontSize: 14, marginTop: 6 },
  onlineStatus: { flexDirection: "row", alignItems: "center", marginTop: 20, gap: 8 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#22c55e" },
  onlineText: { color: "#22c55e", fontSize: 12, fontWeight: "500" },

  smartPreview: { width: "100%", marginVertical: 24, paddingHorizontal: 10 },
  previewCard: { padding: 16, borderRadius: 24, gap: 12 },
  previewUser: { color: "#e2e8f0", fontSize: 15, backgroundColor: "#334155", padding: 12, borderRadius: 20, alignSelf: "flex-end", maxWidth: "80%" },
  previewAI: { color: "#e2e8f0", fontSize: 15, backgroundColor: "#1e293b", padding: 12, borderRadius: 20, alignSelf: "flex-start", maxWidth: "80%" },
  previewTyping: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  typingDots: { color: "#94a3b8", fontSize: 13, fontStyle: "italic" },
  previewLabels: { flexDirection: "row", justifyContent: "flex-start", gap: 10, marginTop: 8 },
  label: { backgroundColor: "#0f172a", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, color: "#38bdf8", fontSize: 12 },

  primaryButton: { marginTop: 16, borderRadius: 60, overflow: "hidden", width: "100%", maxWidth: 280 },
  buttonGradient: { paddingVertical: 14, paddingHorizontal: 34, alignItems: "center" },
  primaryText: { color: "#fff", fontWeight: "bold", fontSize: 18 },
  secondaryButton: { marginTop: 12, borderRadius: 60, borderWidth: 1, borderColor: "#4F46E5", paddingVertical: 12, paddingHorizontal: 24, width: "100%", maxWidth: 280, alignItems: "center" },
  secondaryText: { color: "#4F46E5", fontWeight: "600", fontSize: 16 },
  linkText: { color: "#22D3EE", marginTop: 20, fontSize: 14, fontWeight: "500" },
  buttonPressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },

  section: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 32 },
  sectionTitle: { color: "#3581df", fontSize: 30, fontWeight: "bold", marginBottom: 32, textAlign: "center" },
  featureGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 16 },
  featureCard: { borderRadius: 32, overflow: "hidden", marginBottom: 16, shadowColor: "#4F46E5", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 10 },
  cardGradient: { padding: 22, alignItems: "center" },
  featureIcon: { fontSize: 44, marginBottom: 12 },
  featureTitle: { color: "#4f8bf1", fontWeight: "700", fontSize: 18, marginBottom: 6, textAlign: "center" },
  featureDesc: { color: "#558fdf", fontSize: 13, lineHeight: 18, textAlign: "center" },

  footer: { paddingVertical: 42, paddingHorizontal: 24, alignItems: "center", marginTop: 40 },
  footerText: { color: "#e2e8f0", fontWeight: "bold", fontSize: 18 },
  footerSub: { color: "#94a3b8", marginTop: 8, fontSize: 14 },
  footerSmall: { color: "#64748b", marginTop: 8, fontSize: 12 },
  footerLinks: { flexDirection: "row", marginTop: 20, gap: 28 },
  footerLink: { color: "#22D3EE", fontSize: 13, fontWeight: "500" },
});