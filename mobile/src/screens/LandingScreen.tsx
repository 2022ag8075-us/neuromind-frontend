import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  StatusBar,
  Dimensions,
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

const { width, height } = Dimensions.get("window");

// ---------- Types ----------
interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  index: number;
}

interface DeveloperCardProps {
  name: string;
  role: string;
  university: string;
  description: string;
}

// ---------- Reusable Components ----------
const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, index }) => {
  return (
    <Animated.View
      entering={FadeInUp.delay(index * 150).springify()}
      style={styles.card}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDesc}>{description}</Text>
    </Animated.View>
  );
};

const DeveloperCard: React.FC<DeveloperCardProps> = ({
  name,
  role,
  university,
  description,
}) => {
  return (
    <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.devCard}>
      <Text style={styles.devName}>{name}</Text>
      <Text style={styles.devRole}>{role}</Text>
      <Text style={styles.devUni}>{university}</Text>
      <Text style={styles.devDesc}>{description}</Text>
    </Animated.View>
  );
};

// ---------- Main Component ----------
export default function LandingScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  // Parallax scroll value
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const heroAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [0, 200],
      [0, -50],
      Extrapolate.CLAMP
    );
    return {
      transform: [{ translateY }],
    };
  });

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
      >
        {/* ================= HERO with Parallax ================= */}
        <Animated.View style={[styles.heroContainer, heroAnimatedStyle]}>
          <LinearGradient colors={["#0f172a", "#1e293b"]} style={styles.hero}>
            <Text style={styles.logo}>🧠</Text>
            <Text style={styles.title}>NeuroMind AI</Text>
            <Text style={styles.subtitle}>
              Your AI-powered mental wellness companion
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => navigation.navigate("Register")}
              accessibilityLabel="Get started"
              accessibilityRole="button"
            >
              <Text style={styles.primaryText}>Get Started</Text>
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate("Login")}
              accessibilityLabel="Login to existing account"
              accessibilityRole="button"
            >
              <Text style={styles.linkText}>
                Already have an account? Login
              </Text>
            </Pressable>
          </LinearGradient>
        </Animated.View>

        {/* ================= FEATURES ================= */}
        <View style={styles.section}>
          <Animated.Text entering={FadeInDown.delay(200)} style={styles.sectionTitle}>
            Why NeuroMind?
          </Animated.Text>

          <FeatureCard
            icon="💬"
            title="AI Chat Therapy"
            description="Talk anytime with an intelligent emotional assistant"
            index={0}
          />
          <FeatureCard
            icon="😊"
            title="Mood Tracking"
            description="Track emotions and improve mental health patterns"
            index={1}
          />
          <FeatureCard
            icon="🧠"
            title="Smart Memory"
            description="AI remembers your past conversations for better support"
            index={2}
          />
        </View>

        {/* ================= DEVELOPER ================= */}
        <View style={styles.section}>
          <Animated.Text entering={FadeInDown.delay(300)} style={styles.sectionTitle}>
            👨‍💻 Developer
          </Animated.Text>
          <DeveloperCard
            name="USAMA"
            role="Software Engineering Student"
            university="University of Agriculture Faisalabad (UAF)"
            description="Passionate about building AI-powered applications focused on mental health, user experience, and real-world impact."
          />
        </View>

        {/* ================= FOOTER ================= */}
        <LinearGradient colors={["#020617", "#0f172a"]} style={styles.footer}>
          <Text style={styles.footerText}>© 2026 NeuroMind AI</Text>
          <Text style={styles.footerSub}>Built with ❤️ for mental wellness</Text>
          <Text style={styles.footerSmall}>Designed & Developed by USAMA</Text>
        </LinearGradient>
      </Animated.ScrollView>
    </>
  );
}

// ================= STYLES =================
const styles = StyleSheet.create({
  scrollContent: {
    backgroundColor: "#020617",
  },
  heroContainer: {
    width,
    minHeight: height * 0.6,
  },
  hero: {
    flex: 1,
    paddingHorizontal: 30,
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    fontSize: 70,
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
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
    marginTop: 20,
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
    marginTop: 16,
    fontSize: 14,
    fontWeight: "500",
  },
  section: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 16,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  card: {
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
  icon: {
    fontSize: 32,
    marginBottom: 8,
  },
  cardTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
    marginBottom: 4,
  },
  cardDesc: {
    color: "#94a3b8",
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
  },
  devCard: {
    backgroundColor: "#111827",
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#1f2a3a",
  },
  devName: {
    color: "#38bdf8",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  devRole: {
    color: "#e2e8f0",
    fontSize: 16,
    marginBottom: 2,
  },
  devUni: {
    color: "#94a3b8",
    fontSize: 14,
    marginBottom: 12,
  },
  devDesc: {
    color: "#cbd5f5",
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
    marginTop: 20,
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
});