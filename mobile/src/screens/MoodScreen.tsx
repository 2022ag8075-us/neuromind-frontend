import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LineChart } from "react-native-chart-kit";

import * as Haptics from "expo-haptics";

import API from "../services/api";
import styles from "./styles/moodStyles";

const screenWidth = Dimensions.get("window").width;

// Mood mapping
const MOODS = {
  happy: { emoji: "😊", score: 4, label: "Happy" },
  neutral: { emoji: "😐", score: 3, label: "Neutral" },
  sad: { emoji: "😔", score: 2, label: "Sad" },
  anxious: { emoji: "😰", score: 1, label: "Anxious" },
} as const;

type MoodKey = keyof typeof MOODS;
type MoodEntry = { id: string; mood: MoodKey; createdAt: string };

const CACHE_KEY = "@mood_history";
const LAST_SUBMIT_KEY = "@last_mood_submit";

export default function MoodScreen() {
  const [selectedMood, setSelectedMood] = useState<MoodKey>("happy");
  const [history, setHistory] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSubmit, setLastSubmit] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Animated values for mood buttons
  const scaleAnims = useRef<Record<MoodKey, Animated.Value>>({
    happy: new Animated.Value(1),
    neutral: new Animated.Value(1),
    sad: new Animated.Value(1),
    anxious: new Animated.Value(1),
  }).current;

  const animatePress = (mood: MoodKey) => {
    Animated.sequence([
      Animated.timing(scaleAnims[mood], { toValue: 0.9, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnims[mood], { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // ---------- Daily reminder ----------
  
  // ---------- Caching ----------
  const loadCachedHistory = async () => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) setHistory(JSON.parse(cached));
    } catch (error) {
      console.warn("Failed to load cached mood history", error);
    }
  };

  const loadLastSubmitTime = async () => {
    try {
      const time = await AsyncStorage.getItem(LAST_SUBMIT_KEY);
      if (time) setLastSubmit(parseInt(time, 10));
    } catch (error) {
      console.warn("Failed to load last submit time", error);
    }
  };

  const saveCache = async (data: MoodEntry[]) => {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn("Failed to save mood cache", error);
    }
  };

  // ---------- Fetch from backend ----------
  const fetchHistory = async (showLoading = false) => {
    if (showLoading) setRefreshing(true);
    try {
      const res = await API.get("/mood");
      const entries: MoodEntry[] = res.data?.data || [];
      setHistory(entries);
      saveCache(entries);
    } catch (err: any) {
      console.log("Fetch mood error:", err?.response?.data || err.message);
      if (!err.response) Alert.alert("Offline", "Showing cached mood history.");
      else Alert.alert("Error", "Failed to load mood history");
    } finally {
      if (showLoading) setRefreshing(false);
    }
  };

  // ---------- Submit mood ----------
  const submitMood = async () => {
    if (loading) return;
    const now = Date.now();
    if (lastSubmit && now - lastSubmit < 120000) {
      Alert.alert("Too soon", "You can only record your mood once every 2 minutes.");
      return;
    }
    setLoading(true);
    try {
      await API.post("/mood", { mood: selectedMood });
      await AsyncStorage.setItem(LAST_SUBMIT_KEY, now.toString());
      setLastSubmit(now);
      Alert.alert("Saved", "Your mood has been recorded ✅");
      await fetchHistory();
    } catch (err: any) {
      console.log("Save mood error:", err?.response?.data);
      Alert.alert("Error", err?.response?.data?.message || "Failed to save mood.");
    } finally {
      setLoading(false);
    }
  };

  // ---------- Delete last entry ----------
  const deleteLastEntry = async () => {
    if (history.length === 0) {
      Alert.alert("Nothing to delete", "No mood entries yet.");
      return;
    }
    const lastEntry = history[history.length - 1];
    Alert.alert(
      "Delete last entry",
      `Remove mood "${MOODS[lastEntry.mood].label}" from ${new Date(
        lastEntry.createdAt
      ).toLocaleDateString()}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await API.delete(`/mood/${lastEntry.id}`);
              await fetchHistory();
              Alert.alert("Deleted", "Last mood entry removed.");
            } catch (err) {
              Alert.alert("Error", "Could not delete entry. Check your connection.");
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  // ---------- Stats (memoized) ----------
  const stats = useMemo(() => {
    if (history.length === 0) return null;
    let totalScore = 0;
    const counts = { happy: 0, neutral: 0, sad: 0, anxious: 0 };
    history.forEach((entry) => {
      totalScore += MOODS[entry.mood].score;
      counts[entry.mood]++;
    });
    const avg = totalScore / history.length;
    return { avg: avg.toFixed(1), counts, total: history.length };
  }, [history]);

  // ---------- Trend indicator ----------
  const trend = useMemo(() => {
    if (history.length < 2) return null;
    const recent = history.slice(-3);
    const older = history.slice(-6, -3);
    if (older.length === 0) return null;
    const recentAvg = recent.reduce((sum, e) => sum + MOODS[e.mood].score, 0) / recent.length;
    const olderAvg = older.reduce((sum, e) => sum + MOODS[e.mood].score, 0) / older.length;
    if (recentAvg > olderAvg + 0.5) return { emoji: "📈", text: "Improving" };
    if (olderAvg > recentAvg + 0.5) return { emoji: "📉", text: "Declining" };
    return { emoji: "📊", text: "Stable" };
  }, [history]);

  // ---------- Last mood display ----------
  const lastMood = history.length > 0 ? history[history.length - 1] : null;

  // ---------- Chart data (memoized) ----------
  const chartData = useMemo(() => {
    if (!history.length) {
      return { labels: ["No data"], datasets: [{ data: [2] }] };
    }
    const sorted = [...history].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const last7 = sorted.slice(-7);
    const labels = last7.map((entry) => {
      const date = new Date(entry.createdAt);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    });
    const data = last7.map((entry) => MOODS[entry.mood]?.score ?? 2);
    return { labels, datasets: [{ data }] };
  }, [history]);

  const hasHistory = history.length > 0;

  // ---------- Mount ----------
  useEffect(() => {
    loadCachedHistory();
    fetchHistory();
    loadLastSubmitTime();
    
  }, []);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => fetchHistory(true)} />
      }
    >
      <Text style={styles.title}>How are you feeling today?</Text>
      <Text style={styles.subtitle}>
        Track your emotional wellbeing and spot patterns over time.
      </Text>

      {/* Last mood badge */}
      {lastMood && (
        <View style={styles.lastMoodBadge}>
          <Text style={styles.lastMoodText}>
            Last mood: {MOODS[lastMood.mood].emoji} {MOODS[lastMood.mood].label} at{" "}
            {new Date(lastMood.createdAt).toLocaleTimeString()}
          </Text>
        </View>
      )}

      {/* Mood buttons with animation */}
      <View style={styles.row}>
        {(Object.keys(MOODS) as MoodKey[]).map((mood) => {
          const { emoji, label } = MOODS[mood];
          const isActive = selectedMood === mood;
          return (
            <Animated.View key={mood} style={{ transform: [{ scale: scaleAnims[mood] }] }}>
              <TouchableOpacity
                style={[styles.moodBtn, isActive && styles.activeMood]}
                onPress={() => {
                  setSelectedMood(mood);
                  animatePress(mood);
                }}
                activeOpacity={0.7}
                accessibilityLabel={`Select mood ${label}`}
              >
                <Text style={styles.moodEmoji}>{emoji}</Text>
                <Text style={[styles.moodText, isActive && styles.activeMoodText]}>
                  {label}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>

      {/* Action row (without Export) */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.submitBtn, loading && { opacity: 0.7 }]}
          onPress={submitMood}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Save Mood</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={deleteLastEntry} disabled={deleting}>
          {deleting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={[styles.secondaryBtnText, { color: "#f87171" }]}>🗑️ Delete last</Text>}
        </TouchableOpacity>
      </View>

      {/* Stats card with trend */}
      {stats && (
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>📊 Overall Mood</Text>
          <Text style={styles.statsAvg}>
            Average score: {stats.avg} / 4
            <Text style={{ fontSize: 14, color: "#94a3b8" }}>  (Based on {stats.total} entries)</Text>
          </Text>
          {trend && (
            <Text style={styles.trendText}>
              {trend.emoji} Trend: {trend.text}
            </Text>
          )}
          <View style={styles.statsDistribution}>
            <Text>😊 Happy: {stats.counts.happy}</Text>
            <Text>😐 Neutral: {stats.counts.neutral}</Text>
            <Text>😔 Sad: {stats.counts.sad}</Text>
            <Text>😰 Anxious: {stats.counts.anxious}</Text>
          </View>
        </View>
      )}

      {/* Chart */}
      {hasHistory ? (
        <>
          <Text style={styles.title}>📈 Your Mood History (last 7 entries)</Text>
          <LineChart
            data={chartData}
            width={screenWidth - 32}
            height={220}
            yAxisInterval={1}
            fromZero
            chartConfig={{
              backgroundColor: "#0f172a",
              backgroundGradientFrom: "#0f172a",
              backgroundGradientTo: "#0f172a",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(56, 189, 248, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
              propsForDots: { r: "5", strokeWidth: "2", stroke: "#38bdf8" },
            }}
            bezier
            style={{ borderRadius: 12, marginTop: 16 }}
            formatYLabel={(yValue) => {
              const score = parseInt(yValue, 10);
              for (const [, val] of Object.entries(MOODS)) {
                if (val.score === score) return val.emoji;
              }
              return yValue;
            }}
          />
          <View style={{ marginTop: 12, alignItems: "center" }}>
            <Text style={{ color: "#94a3b8", fontSize: 12 }}>
              😰 Anxious (1)  •  😔 Sad (2)  •  😐 Neutral (3)  •  😊 Happy (4)
            </Text>
          </View>
        </>
      ) : (
        <View style={{ marginTop: 32, alignItems: "center" }}>
          <Text style={{ color: "#94a3b8", textAlign: "center" }}>
            No mood data yet. Tap a mood and press "Save Mood" to get started.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}