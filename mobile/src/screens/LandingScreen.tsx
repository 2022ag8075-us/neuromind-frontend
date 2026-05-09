import React, { useCallback } from "react";
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

// ---------- Data ----------
const FEATURES = [
  { icon: "💬", title: "AI Chat Therapy", description: "24/7 intelligent emotional support, always here for you." },
  { icon: "📊", title: "Mood Tracking", description: "Visualise your emotional journey and identify patterns." },
  { icon: "🧠", title: "Smart Memory", description: "Remembers past conversations for personalised care." },
  { icon: "🔒", title: "Private & Secure", description: "Your data is encrypted and never shared." },
  { icon: "🌙", title: "Dark Mode Love", description: "Beautiful UI that’s easy on the eyes any time." },
  { icon: "⚡", title: "Fast & Offline", description: "Works great even with slow connection." },
];

const STEPS = [
  { icon: "👤", title: "Create Account", description: "Sign up in seconds with email." },
  { icon: "💬", title: "Start Chatting", description: "Talk about anything – no judgement." },
  { icon: "📈", title: "Track Progress", description: "See your mood history and insights." },
];

const TESTIMONIALS = [
  { name: "Sarah J.", role: "Student", text: "NeuroMind helped me through a tough semester. The AI actually listens." },
  { name: "Dr. Ahmed", role: "Psychologist", text: "A wonderful tool for patients to express emotions between sessions." },
];

// Social links – clean and verified (add 'as const' to each gradient array)
const SOCIAL_LINKS = [
  { name: "TikTok", url: "https://www.tiktok.com/@englishclub804", icon: "🎵", gradient: ["#000000", "#2a2a2a"] as const },
  { name: "Instagram", url: "https://www.instagram.com/thequiz_world/", icon: "📸", gradient: ["#833AB4", "#E4405F", "#F56040"] as const },
];

// ---------- Helper Components (memoized) ----------
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

const StepCard = React.memo(({ icon, title, description, index }: any) => (
  <Animated.View
    entering={FadeInUp.delay(400 + index * 100).springify()}
    style={styles.stepCard}
  >
    <LinearGradient colors={["#111827", "#0f172a"] as const} style={styles.stepGradient}>
      <Text style={styles.stepIcon}>{icon}</Text>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepDesc}>{description}</Text>
    </LinearGradient>
  </Animated.View>
));

const TestimonialCard = React.memo(({ name, role, text, index }: any) => (
  <Animated.View
    entering={FadeInUp.delay(600 + index * 100).springify()}
    style={styles.testimonialCard}
  >
    <LinearGradient colors={["#0f172a", "#020617"] as const} style={styles.testimonialGradient}>
      <Text style={styles.testimonialText}>“{text}”</Text>
      <Text style={styles.testimonialName}>{name}</Text>
      <Text style={styles.testimonialRole}>{role}</Text>
    </LinearGradient>
  </Animated.View>
));

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

  // Robust link opening – guaranteed to work
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

  return (
    <>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO SECTION – Vibrant Gradient */}
        <Animated.View style={[styles.heroWrapper, heroStyle]}>
          <LinearGradient
            colors={["#0f172a", "#1e1b4b", "#0f172a"] as const}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <Text style={styles.logo}>🧠</Text>
            <Text style={styles.title}>NeuroMind AI</Text>
            <Text style={styles.subtitle}>Your AI-powered mental wellness companion</Text>
            <Pressable
              style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
              onPress={() => navigation.navigate("Register")}
              accessibilityLabel="Get started"
              accessibilityRole="button"
            >
              <LinearGradient colors={["#6366F1", "#4F46E5"] as const} style={styles.buttonGradient}>
                <Text style={styles.primaryText}>Get Started →</Text>
              </LinearGradient>
            </Pressable>
            <Pressable onPress={() => navigation.navigate("Login")}>
              <Text style={styles.linkText}>Already have an account? Login</Text>
            </Pressable>
          </LinearGradient>
        </Animated.View>

        {/* FEATURES GRID */}
        <View style={styles.section}>
          <Animated.Text entering={FadeInDown.delay(200)} style={styles.sectionTitle}>
            Why NeuroMind?
          </Animated.Text>
          <View style={styles.featureGrid}>
            {FEATURES.map((f, idx) => (
              <FeatureCard key={idx} {...f} index={idx} cardWidth={cardWidth} />
            ))}
          </View>
        </View>

        {/* HOW IT WORKS */}
        <View style={styles.section}>
          <Animated.Text entering={FadeInDown.delay(350)} style={styles.sectionTitle}>
            How It Works 🚀
          </Animated.Text>
          <View style={styles.stepsContainer}>
            {STEPS.map((step, idx) => (
              <StepCard key={idx} {...step} index={idx} />
            ))}
          </View>
        </View>

        {/* TESTIMONIALS */}
        <View style={styles.section}>
          <Animated.Text entering={FadeInDown.delay(500)} style={styles.sectionTitle}>
            What People Say 💬
          </Animated.Text>
          <View style={styles.testimonialsContainer}>
            {TESTIMONIALS.map((t, idx) => (
              <TestimonialCard key={idx} {...t} index={idx} />
            ))}
          </View>
        </View>

        {/* DEVELOPER SECTION */}
        <View style={styles.section}>
          <Animated.Text entering={FadeInDown.delay(700)} style={styles.sectionTitle}>
            👨‍💻 Developer
          </Animated.Text>
          <Animated.View entering={FadeInUp.delay(800).springify()} style={styles.devCard}>
            <LinearGradient colors={["#111827", "#020617"] as const} style={styles.devGradient}>
              <Text style={styles.devName}>USAMA</Text>
              <Text style={styles.devRole}>Software Engineering Student</Text>
              <Text style={styles.devUni}>University of Agriculture Faisalabad (UAF)</Text>
              <Text style={styles.devDesc}>
                Passionate about building AI-powered applications focused on mental health,
                user experience, and real-world impact.
              </Text>
            </LinearGradient>
          </Animated.View>
        </View>

        {/* CALL TO ACTION */}
        <LinearGradient colors={["#4F46E5", "#0f172a"] as const} style={styles.ctaSection}>
          <Text style={styles.ctaTitle}>Ready to feel better?</Text>
          <Text style={styles.ctaSub}>Join thousands who already trust NeuroMind AI.</Text>
          <Pressable
            style={({ pressed }) => [styles.ctaButton, pressed && styles.buttonPressed]}
            onPress={() => navigation.navigate("Register")}
          >
            <LinearGradient colors={["#22D3EE", "#06B6D4"] as const} style={styles.ctaButtonGradient}>
              <Text style={styles.ctaButtonText}>Start Your Journey →</Text>
            </LinearGradient>
          </Pressable>
        </LinearGradient>

        {/* SOCIAL SECTION – Working links */}
        <View style={styles.socialSection}>
          <Animated.Text entering={FadeInDown.delay(900)} style={styles.sectionTitle}>
            🌐 Connect With Us
          </Animated.Text>
          <View style={styles.socialContainer}>
            {SOCIAL_LINKS.map((social, idx) => (
              <Pressable
                key={idx}
                onPress={() => openLink(social.url)}
                style={({ pressed }) => [styles.socialButton, pressed && styles.buttonPressed]}
              >
                <LinearGradient colors={social.gradient} style={styles.socialGradient}>
                  <Text style={styles.socialIcon}>{social.icon}</Text>
                  <Text style={styles.socialName}>{social.name}</Text>
                </LinearGradient>
              </Pressable>
            ))}
          </View>
        </View>

        {/* FOOTER */}
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

// ================= PRO-LEVEL STYLES =================
const styles = StyleSheet.create({
  heroWrapper: { width: "100%", minHeight: 540 },
  hero: { flex: 1, paddingHorizontal: 30, paddingVertical: 80, alignItems: "center", justifyContent: "center" },
  logo: { fontSize: 80, marginBottom: 12, textShadowColor: "#4F46E5", textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 15 },
  title: { fontSize: 40, fontWeight: "bold", color: "#449de6", textAlign: "center", letterSpacing: 1 },
  subtitle: { color: "#448adf", textAlign: "center", marginVertical: 12, fontSize: 16, paddingHorizontal: 20 },
  primaryButton: { marginTop: 28, borderRadius: 60, overflow: "hidden" },
  buttonGradient: { paddingVertical: 14, paddingHorizontal: 34, alignItems: "center" },
  primaryText: { color: "#327eef", fontWeight: "bold", fontSize: 18 },
  linkText: { color: "#22D3EE", marginTop: 24, fontSize: 15, fontWeight: "500" },
  buttonPressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
  section: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 32 },
  sectionTitle: { color: "#3581df", fontSize: 30, fontWeight: "bold", marginBottom: 32, textAlign: "center", letterSpacing: -0.5 },
  featureGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 16 },
  featureCard: { borderRadius: 32, overflow: "hidden", marginBottom: 16, shadowColor: "#4F46E5", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 10 },
  cardGradient: { padding: 22, alignItems: "center" },
  featureIcon: { fontSize: 44, marginBottom: 12 },
  featureTitle: { color: "#4f8bf1", fontWeight: "700", fontSize: 18, marginBottom: 6, textAlign: "center" },
  featureDesc: { color: "#558fdf", fontSize: 13, lineHeight: 18, textAlign: "center" },
  stepsContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 20 },
  stepCard: { borderRadius: 32, overflow: "hidden", width: 200, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 6 },
  stepGradient: { padding: 20, alignItems: "center" },
  stepIcon: { fontSize: 44, marginBottom: 12 },
  stepTitle: { color: "#38bdf8", fontSize: 18, fontWeight: "bold", marginBottom: 6 },
  stepDesc: { color: "#94a3b8", fontSize: 13, textAlign: "center" },
  testimonialsContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 20 },
  testimonialCard: { borderRadius: 32, overflow: "hidden", width: 280, shadowColor: "#22D3EE", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  testimonialGradient: { padding: 20 },
  testimonialText: { color: "#5992dc", fontSize: 15, fontStyle: "italic", marginBottom: 12, lineHeight: 22 },
  testimonialName: { color: "#3eb3e6", fontWeight: "bold", fontSize: 16 },
  testimonialRole: { color: "#94a3b8", fontSize: 12 },
  devCard: { borderRadius: 36, overflow: "hidden", shadowColor: "#4F46E5", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 14, elevation: 10 },
  devGradient: { padding: 28 },
  devName: { color: "#22D3EE", fontSize: 32, fontWeight: "bold", marginBottom: 6 },
  devRole: { color: "#e2e8f0", fontSize: 18, marginBottom: 4 },
  devUni: { color: "#94a3b8", fontSize: 15, marginBottom: 16 },
  devDesc: { color: "#cbd5f5", fontSize: 15, lineHeight: 22 },
  ctaSection: { marginTop: 48, marginHorizontal: 24, paddingVertical: 52, borderRadius: 40, alignItems: "center", shadowColor: "#4F46E5", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 12 },
  ctaTitle: { color: "#496ddb", fontSize: 28, fontWeight: "bold", marginBottom: 8 },
  ctaSub: { color: "#cbd5e1", fontSize: 15, marginBottom: 28, textAlign: "center" },
  ctaButton: { borderRadius: 60, overflow: "hidden" },
  ctaButtonGradient: { paddingVertical: 16, paddingHorizontal: 40, alignItems: "center" },
  ctaButtonText: { color: "#0f172a", fontWeight: "bold", fontSize: 18 },
  socialSection: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 32 },
  socialContainer: { flexDirection: "row", justifyContent: "center", gap: 20, flexWrap: "wrap" },
  socialButton: { borderRadius: 60, overflow: "hidden", width: 150, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 6 },
  socialGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, paddingHorizontal: 20, gap: 10 },
  socialIcon: { fontSize: 22, color: "#508cda" },
  socialName: { color: "#4559cd", fontWeight: "bold", fontSize: 16 },
  footer: { paddingVertical: 42, paddingHorizontal: 24, alignItems: "center", marginTop: 40 },
  footerText: { color: "#e2e8f0", fontWeight: "bold", fontSize: 18 },
  footerSub: { color: "#94a3b8", marginTop: 8, fontSize: 14 },
  footerSmall: { color: "#64748b", marginTop: 8, fontSize: 12 },
  footerLinks: { flexDirection: "row", marginTop: 20, gap: 28 },
  footerLink: { color: "#22D3EE", fontSize: 13, fontWeight: "500" },
});