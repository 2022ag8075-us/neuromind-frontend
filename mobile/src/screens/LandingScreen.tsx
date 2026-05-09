import React from "react";
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

// ---------- Social Links ----------
const SOCIAL_LINKS = [
  {
    name: "TikTok",
    url: "https://www.tiktok.com/@englishclub804",
    icon: "🎵",
    color: "#000000",
  },
  {
    name: "Instagram",
    url: "https://www.instagram.com/thequiz_world/",
    icon: "📸",
    color: "#E4405F",
  },
];

// ---------- Helper Components ----------
const FeatureCard = ({ icon, title, description, index, cardWidth }: any) => (
  <Animated.View
    entering={FadeInUp.delay(index * 80).springify().damping(12)}
    style={[styles.featureCard, { width: cardWidth }]}
  >
    <Text style={styles.featureIcon}>{icon}</Text>
    <Text style={styles.featureTitle}>{title}</Text>
    <Text style={styles.featureDesc}>{description}</Text>
  </Animated.View>
);

const StepCard = ({ icon, title, description, index }: any) => (
  <Animated.View
    entering={FadeInUp.delay(400 + index * 100).springify()}
    style={styles.stepCard}
  >
    <Text style={styles.stepIcon}>{icon}</Text>
    <Text style={styles.stepTitle}>{title}</Text>
    <Text style={styles.stepDesc}>{description}</Text>
  </Animated.View>
);

const TestimonialCard = ({ name, role, text, index }: any) => (
  <Animated.View
    entering={FadeInUp.delay(600 + index * 100).springify()}
    style={styles.testimonialCard}
  >
    <Text style={styles.testimonialText}>“{text}”</Text>
    <Text style={styles.testimonialName}>{name}</Text>
    <Text style={styles.testimonialRole}>{role}</Text>
  </Animated.View>
);

// ---------- Main Component ----------
export default function LandingScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const heroStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [0, 200],
      [0, -40],
      Extrapolate.CLAMP
    );
    return { transform: [{ translateY }] };
  });

  const cardWidth = width > 600 ? (width - 56) / 3 : (width - 48) / 2;

  const openLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "Cannot open this link");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open link");
    }
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
          <LinearGradient colors={["#0f172a", "#1e293b"]} style={styles.hero}>
            <Text style={styles.logo}>🧠</Text>
            <Text style={styles.title}>NeuroMind AI</Text>
            <Text style={styles.subtitle}>Your AI-powered mental wellness companion</Text>
            <Pressable
              style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
              onPress={() => navigation.navigate("Register")}
              accessibilityLabel="Get started"
              accessibilityRole="button"
            >
              <Text style={styles.primaryText}>Get Started →</Text>
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
            <Text style={styles.devName}>USAMA</Text>
            <Text style={styles.devRole}>Software Engineering Student</Text>
            <Text style={styles.devUni}>University of Agriculture Faisalabad (UAF)</Text>
            <Text style={styles.devDesc}>
              Passionate about building AI-powered applications focused on mental health,
              user experience, and real-world impact.
            </Text>
          </Animated.View>
        </View>

        {/* CALL TO ACTION */}
        <LinearGradient colors={["#1e293b", "#0f172a"]} style={styles.ctaSection}>
          <Text style={styles.ctaTitle}>Ready to feel better?</Text>
          <Text style={styles.ctaSub}>Join thousands who already trust NeuroMind AI.</Text>
          <Pressable
            style={({ pressed }) => [styles.ctaButton, pressed && styles.buttonPressed]}
            onPress={() => navigation.navigate("Register")}
          >
            <Text style={styles.ctaButtonText}>Start Your Journey →</Text>
          </Pressable>
        </LinearGradient>

        {/* SOCIAL MEDIA SECTION (NEW) */}
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
                <LinearGradient
                  colors={[social.color, social.color + "cc"]}
                  style={styles.socialGradient}
                >
                  <Text style={styles.socialIcon}>{social.icon}</Text>
                  <Text style={styles.socialName}>{social.name}</Text>
                </LinearGradient>
              </Pressable>
            ))}
          </View>
        </View>

        {/* FOOTER */}
        <LinearGradient colors={["#020617", "#0f172a"]} style={styles.footer}>
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

// ================= STYLES =================
const styles = StyleSheet.create({
  heroWrapper: { width: "100%", minHeight: 500 },
  hero: { flex: 1, paddingHorizontal: 30, paddingVertical: 80, alignItems: "center", justifyContent: "center" },
  logo: { fontSize: 70, marginBottom: 12 },
  title: { fontSize: 34, fontWeight: "bold", color: "#fff", textAlign: "center" },
  subtitle: { color: "#94a3b8", textAlign: "center", marginVertical: 12, fontSize: 16, paddingHorizontal: 20 },
  primaryButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 40,
    marginTop: 24,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonPressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
  primaryText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  linkText: { color: "#38bdf8", marginTop: 20, fontSize: 14, fontWeight: "500" },
  section: { paddingHorizontal: 24, paddingTop: 48, paddingBottom: 24 },
  sectionTitle: { color: "#fff", fontSize: 26, fontWeight: "bold", marginBottom: 28, textAlign: "center" },
  featureGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 16 },
  featureCard: {
    backgroundColor: "#1e293b",
    padding: 18,
    borderRadius: 24,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  featureIcon: { fontSize: 34, marginBottom: 8 },
  featureTitle: { color: "#fff", fontWeight: "700", fontSize: 17, marginBottom: 4 },
  featureDesc: { color: "#94a3b8", fontSize: 13, lineHeight: 18 },
  stepsContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 20 },
  stepCard: {
    backgroundColor: "#111827",
    padding: 20,
    borderRadius: 24,
    width: 200,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1f2a3a",
  },
  stepIcon: { fontSize: 40, marginBottom: 12 },
  stepTitle: { color: "#38bdf8", fontSize: 18, fontWeight: "bold", marginBottom: 6 },
  stepDesc: { color: "#94a3b8", fontSize: 13, textAlign: "center" },
  testimonialsContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 20 },
  testimonialCard: {
    backgroundColor: "#0f172a",
    padding: 20,
    borderRadius: 24,
    width: 280,
    borderWidth: 1,
    borderColor: "#2d3a4a",
  },
  testimonialText: { color: "#e2e8f0", fontSize: 15, fontStyle: "italic", marginBottom: 12 },
  testimonialName: { color: "#38bdf8", fontWeight: "bold", fontSize: 16 },
  testimonialRole: { color: "#94a3b8", fontSize: 12 },
  devCard: {
    backgroundColor: "#111827",
    padding: 24,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#1f2a3a",
    shadowColor: "#4F46E5",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  devName: { color: "#38bdf8", fontSize: 28, fontWeight: "bold", marginBottom: 6 },
  devRole: { color: "#e2e8f0", fontSize: 17, marginBottom: 4 },
  devUni: { color: "#94a3b8", fontSize: 15, marginBottom: 16 },
  devDesc: { color: "#cbd5f5", fontSize: 15, lineHeight: 22 },
  ctaSection: { marginTop: 40, marginHorizontal: 24, paddingVertical: 48, borderRadius: 32, alignItems: "center" },
  ctaTitle: { color: "#fff", fontSize: 26, fontWeight: "bold", marginBottom: 8 },
  ctaSub: { color: "#94a3b8", fontSize: 14, marginBottom: 24, textAlign: "center" },
  ctaButton: { backgroundColor: "#4F46E5", paddingVertical: 14, paddingHorizontal: 32, borderRadius: 40 },
  ctaButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  socialSection: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24 },
  socialContainer: { flexDirection: "row", justifyContent: "center", gap: 20, flexWrap: "wrap" },
  socialButton: {
    width: 140,
    borderRadius: 40,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  socialGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  socialIcon: { fontSize: 20, color: "#fff" },
  socialName: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  footer: { paddingVertical: 32, paddingHorizontal: 24, alignItems: "center", marginTop: 40 },
  footerText: { color: "#e2e8f0", fontWeight: "bold", fontSize: 16 },
  footerSub: { color: "#94a3b8", marginTop: 6, fontSize: 13 },
  footerSmall: { color: "#64748b", marginTop: 8, fontSize: 11 },
  footerLinks: { flexDirection: "row", marginTop: 16, gap: 24 },
  footerLink: { color: "#38bdf8", fontSize: 12 },
});