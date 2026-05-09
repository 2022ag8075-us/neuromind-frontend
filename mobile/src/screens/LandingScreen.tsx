import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  StatusBar,
  Dimensions,
  useWindowDimensions,
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

// ---------- Types ----------
type Feature = {
  icon: string;
  title: string;
  description: string;
};

type Step = {
  icon: string;
  title: string;
  description: string;
};

type Testimonial = {
  name: string;
  role: string;
  text: string;
};

// ---------- Data ----------
const FEATURES: Feature[] = [
  {
    icon: "💬",
    title: "AI Chat Therapy",
    description: "24/7 intelligent emotional support, always here for you.",
  },
  {
    icon: "📊",
    title: "Mood Tracking",
    description: "Visualise your emotional journey and identify patterns.",
  },
  {
    icon: "🧠",
    title: "Smart Memory",
    description: "Remembers past conversations for personalised care.",
  },
  {
    icon: "🔒",
    title: "Private & Secure",
    description: "Your data is encrypted and never shared.",
  },
  {
    icon: "🌙",
    title: "Dark Mode Love",
    description: "Beautiful UI that’s easy on the eyes any time.",
  },
  {
    icon: "⚡",
    title: "Fast & Offline",
    description: "Works great even with slow connection.",
  },
];

const STEPS: Step[] = [
  { icon: "👤", title: "Create Account", description: "Sign up in seconds with email." },
  { icon: "💬", title: "Start Chatting", description: "Talk about anything – no judgement." },
  { icon: "📈", title: "Track Progress", description: "See your mood history and insights." },
];

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Sarah J.",
    role: "Student",
    text: "NeuroMind helped me through a tough semester. The AI actually listens.",
  },
  {
    name: "Dr. Ahmed",
    role: "Psychologist",
    text: "A wonderful tool for patients to express emotions between sessions.",
  },
];

// ---------- Helper Component: FeatureCard (grid) ----------
const FeatureCard = ({ icon, title, description, index }: Feature & { index: number }) => {
  const width = useWindowDimensions().width;
  const cardWidth = width > 600 ? (width - 56) / 3 : (width - 48) / 2;
  return (
    <Animated.View
      entering={FadeInUp.delay(index * 80).springify().damping(12)}
      style={[styles.featureCard, { width: cardWidth }]}
    >
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDesc}>{description}</Text>
    </Animated.View>
  );
};

// ---------- Main Component ----------
export default function LandingScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const { width } = useWindowDimensions();

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
    const opacity = interpolate(
      scrollY.value,
      [0, 150],
      [1, 0.9],
      Extrapolate.CLAMP
    );
    return { transform: [{ translateY }], opacity };
  });

  const isLargeScreen = width > 600;

  return (
    <>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section with Parallax */}
        <Animated.View style={[styles.heroWrapper, heroStyle]}>
          <LinearGradient colors={["#0f172a", "#1e293b"]} style={styles.hero}>
            <Text style={styles.logo}>🧠</Text>
            <Text style={styles.title}>NeuroMind AI</Text>
            <Text style={styles.subtitle}>
              Your AI-powered mental wellness companion
            </Text>
            <Pressable
              style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
              onPress={() => navigation.navigate("Register")}
              accessibilityLabel="Get started"
              accessibilityRole="button"
            >
              <Text style={styles.primaryText}>Get Started →</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate("Login")}
              accessibilityLabel="Login to existing account"
              accessibilityRole="button"
            >
              <Text style={styles.linkText}>Already have an account? Login</Text>
            </Pressable>
          </LinearGradient>
        </Animated.View>

        {/* Features Section - Grid */}
        <View style={styles.section}>
          <Animated.Text entering={FadeInDown.delay(200)} style={styles.sectionTitle}>
            Why NeuroMind?
          </Animated.Text>
          <View style={[styles.featureGrid, isLargeScreen && styles.largeGrid]}>
            {FEATURES.map((feature, idx) => (
              <FeatureCard key={idx} {...feature} index={idx} />
            ))}
          </View>
        </View>

        {/* How It Works */}
        <View style={styles.section}>
          <Animated.Text entering={FadeInDown.delay(300)} style={styles.sectionTitle}>
            How It Works 🚀
          </Animated.Text>
          <View style={styles.stepsContainer}>
            {STEPS.map((step, idx) => (
              <Animated.View
                key={idx}
                entering={FadeInUp.delay(450 + idx * 100)}
                style={styles.stepCard}
              >
                <Text style={styles.stepIcon}>{step.icon}</Text>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDesc}>{step.description}</Text>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Testimonials */}
        <View style={styles.section}>
          <Animated.Text entering={FadeInDown.delay(600)} style={styles.sectionTitle}>
            What People Say 💬
          </Animated.Text>
          <View style={styles.testimonialsContainer}>
            {TESTIMONIALS.map((test, idx) => (
              <Animated.View
                key={idx}
                entering={FadeInUp.delay(750 + idx * 100)}
                style={styles.testimonialCard}
              >
                <Text style={styles.testimonialText}>“{test.text}”</Text>
                <Text style={styles.testimonialName}>{test.name}</Text>
                <Text style={styles.testimonialRole}>{test.role}</Text>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Final Call to Action */}
        <LinearGradient colors={["#1e293b", "#0f172a"]} style={styles.ctaSection}>
          <Text style={styles.ctaTitle}>Ready to feel better?</Text>
          <Text style={styles.ctaSub}>
            Join thousands who already trust NeuroMind AI.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.ctaButton, pressed && styles.buttonPressed]}
            onPress={() => navigation.navigate("Register")}
          >
            <Text style={styles.ctaButtonText}>Start Your Journey →</Text>
          </Pressable>
        </LinearGradient>

        {/* Footer */}
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
  heroWrapper: {
    width: "100%",
    minHeight: 500,
  },
  hero: {
    flex: 1,
    paddingHorizontal: 30,
    paddingVertical: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    fontSize: 70,
    marginBottom: 12,
  },
  title: {
    fontSize: 34,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  subtitle: {
    color: "#94a3b8",
    textAlign: "center",
    marginVertical: 12,
    fontSize: 16,
    paddingHorizontal: 20,
  },
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
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  primaryText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  linkText: {
    color: "#38bdf8",
    marginTop: 20,
    fontSize: 14,
    fontWeight: "500",
  },
  section: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 28,
    textAlign: "center",
  },
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 16,
  },
  largeGrid: {
    justifyContent: "flex-start",
  },
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
  featureIcon: {
    fontSize: 34,
    marginBottom: 8,
  },
  featureTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 17,
    marginBottom: 4,
  },
  featureDesc: {
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 18,
  },
  stepsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 20,
  },
  stepCard: {
    backgroundColor: "#111827",
    padding: 20,
    borderRadius: 24,
    width: 200,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1f2a3a",
  },
  stepIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  stepTitle: {
    color: "#38bdf8",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 6,
  },
  stepDesc: {
    color: "#94a3b8",
    fontSize: 13,
    textAlign: "center",
  },
  testimonialsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 20,
  },
  testimonialCard: {
    backgroundColor: "#0f172a",
    padding: 20,
    borderRadius: 24,
    width: 280,
    borderWidth: 1,
    borderColor: "#2d3a4a",
  },
  testimonialText: {
    color: "#e2e8f0",
    fontSize: 15,
    fontStyle: "italic",
    marginBottom: 12,
  },
  testimonialName: {
    color: "#38bdf8",
    fontWeight: "bold",
    fontSize: 16,
  },
  testimonialRole: {
    color: "#94a3b8",
    fontSize: 12,
  },
  ctaSection: {
    marginTop: 40,
    marginHorizontal: 24,
    paddingVertical: 48,
    borderRadius: 32,
    alignItems: "center",
  },
  ctaTitle: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 8,
  },
  ctaSub: {
    color: "#94a3b8",
    fontSize: 14,
    marginBottom: 24,
    textAlign: "center",
  },
  ctaButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 40,
  },
  ctaButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  footer: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
    marginTop: 40,
  },
  footerText: {
    color: "#e2e8f0",
    fontWeight: "bold",
    fontSize: 16,
  },
  footerSub: {
    color: "#94a3b8",
    marginTop: 6,
    fontSize: 13,
  },
  footerSmall: {
    color: "#64748b",
    marginTop: 8,
    fontSize: 11,
  },
  footerLinks: {
    flexDirection: "row",
    marginTop: 16,
    gap: 24,
  },
  footerLink: {
    color: "#38bdf8",
    fontSize: 12,
  },
});