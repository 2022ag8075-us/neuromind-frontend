import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LineChart } from "react-native-chart-kit";
import API from "../services/api";
import styles from "./styles/moodStyles";

const screenWidth = Dimensions.get("window").width;

// Mood mapping: value -> emoji + numeric score
const MOODS = {
  happy: { emoji: "😊", score: 4, label: "Happy" },
  neutral: { emoji: "😐", score: 3, label: "Neutral" },
  sad: { emoji: "😔", score: 2, label: "Sad" },
  anxious: { emoji: "😰", score: 1, label: "Anxious" },
} as const;

type MoodKey = keyof typeof MOODS;
type MoodEntry = { id: string; mood: MoodKey; createdAt: string };

// Cache keys
const CACHE_KEY = "@mood_history";
const LAST_SUBMIT_KEY = "@last_mood_submit";

/**
 * 📌 FEATURE PURPOSE:
 * This screen allows users to track their emotional well-being over time.
 * It helps identify mood patterns, provides insights for mental health,
 * and encourages self-reflection. The data is stored on the backend
 * and displayed as a line chart for easy visualisation.
 */
export default function MoodScreen() {
  const [selectedMood, setSelectedMood] = useState<MoodKey>("happy");
  const [history, setHistory] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSubmit, setLastSubmit] = useState<number | null>(null);

  // Load cached history on mount
  useEffect(() => {
    loadCachedHistory();
    fetchHistory();
    loadLastSubmitTime();
  }, []);

  const loadCachedHistory = async () => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        setHistory(JSON.parse(cached));
      }
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

  // Fetch mood history from backend
  const fetchHistory = async (showLoading = false) => {
    if (showLoading) setRefreshing(true);
    try {
      const res = await API.get("/mood");
      const entries: MoodEntry[] = res.data?.data || [];
      // Sort newest first? We'll sort for chart display later
      setHistory(entries);
      saveCache(entries); // update cache
    } catch (err: any) {
      console.log("Fetch mood error:", err?.response?.data || err.message);
      // If network error, cached data remains
      if (!err.response) {
        Alert.alert("Offline", "Showing cached mood history.");
      } else {
        Alert.alert("Error", "Failed to load mood history");
      }
    } finally {
      if (showLoading) setRefreshing(false);
    }
  };

  // Submit mood to backend
  const submitMood = async () => {
    if (loading) return;

    // Optional: prevent duplicate submissions within 2 minutes
    const now = Date.now();
    if (lastSubmit && now - lastSubmit < 120000) {
      Alert.alert(
        "Too soon",
        "You can only record your mood once every 2 minutes."
      );
      return;
    }

    setLoading(true);
    try {
      await API.post("/mood", { mood: selectedMood });
      await AsyncStorage.setItem(LAST_SUBMIT_KEY, now.toString());
      setLastSubmit(now);
      Alert.alert("Saved", "Your mood has been recorded ✅");
      await fetchHistory(); // refresh data from server
    } catch (err: any) {
      console.log("Save mood error:", err?.response?.data);
      Alert.alert(
        "Error",
        err?.response?.data?.message || "Failed to save mood. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data – last 7 entries, sorted by date (oldest to newest)
  const prepareChartData = () => {
    if (!history.length) {
      return {
        labels: ["No data"],
        datasets: [{ data: [2] }],
      };
    }

    // Copy and sort by createdAt ascending
    const sorted = [...history].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const last7 = sorted.slice(-7);

    // Format date labels as "DD/MM" or "Mon"
    const labels = last7.map((entry) => {
      const date = new Date(entry.createdAt);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    });

    const data = last7.map((entry) => MOODS[entry.mood]?.score ?? 2);
    return { labels, datasets: [{ data }] };
  };

  const chartData = prepareChartData();
  const hasHistory = history.length > 0;

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

      {/* Mood selection buttons with emojis */}
      <View style={styles.row}>
        {(Object.keys(MOODS) as MoodKey[]).map((mood) => {
          const { emoji, label } = MOODS[mood];
          const isActive = selectedMood === mood;
          return (
            <TouchableOpacity
              key={mood}
              style={[styles.moodBtn, isActive && styles.activeMood]}
              onPress={() => setSelectedMood(mood)}
              activeOpacity={0.7}
            >
              <Text style={styles.moodEmoji}>{emoji}</Text>
              <Text style={[styles.moodText, isActive && styles.activeMoodText]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Save button */}
      <TouchableOpacity
        style={[styles.submitBtn, loading && { opacity: 0.7 }]}
        onPress={submitMood}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Save Mood</Text>
        )}
      </TouchableOpacity>

      {/* Mood History Chart */}
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
              propsForDots: {
                r: "5",
                strokeWidth: "2",
                stroke: "#38bdf8",
              },
            }}
            bezier
            style={{ borderRadius: 12, marginTop: 16 }}
            formatYLabel={(yValue) => {
              const score = parseInt(yValue, 10);
              for (const [key, val] of Object.entries(MOODS)) {
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