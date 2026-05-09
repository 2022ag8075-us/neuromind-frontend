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
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Notifications from "expo-notifications";

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

  // ---------- Daily reminder ----------
  const setupDailyReminder = useCallback(async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return;
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🌈 Mood check-in",
        body: "How are you feeling today? Open NeuroMind to track your mood.",
      },
      trigger: {
        hour: 20,
        minute: 0,
        repeats: true,
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR, // ✅ FIX
      },
    });
  }, []);

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
            try {
              setLoading(true);
              await API.delete(`/mood/${lastEntry.id}`);
              await fetchHistory();
              Alert.alert("Deleted", "Last mood entry removed.");
            } catch (err) {
              Alert.alert("Error", "Could not delete entry. Check your connection.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // ---------- Export CSV ----------
  const exportToCSV = async () => {
    if (history.length === 0) {
      Alert.alert("No data", "No mood entries to export.");
      return;
    }
    let csv = "Date,Time,Mood,Score\n";
    history.forEach((entry) => {
      const date = new Date(entry.createdAt);
      const dateStr = date.toLocaleDateString();
      const timeStr = date.toLocaleTimeString();
      const moodLabel = MOODS[entry.mood].label;
      const score = MOODS[entry.mood].score;
      csv += `"${dateStr}","${timeStr}","${moodLabel}",${score}\n`;
    });
    // ✅ FIX: Use non-null assertion (documentDirectory exists in Expo)
    const docsDir = (FileSystem as any).documentDirectory || (FileSystem as any).cacheDirectory || '';
const fileUri = docsDir + "mood_export.csv";
    await FileSystem.writeAsStringAsync(fileUri, csv);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri);
    } else {
      Alert.alert("Export", "Sharing not available on this device");
    }
  };

  // ---------- Stats ----------
  const computeStats = () => {
    if (history.length === 0) return null;
    let totalScore = 0;
    const counts = { happy: 0, neutral: 0, sad: 0, anxious: 0 };
    history.forEach((entry) => {
      totalScore += MOODS[entry.mood].score;
      counts[entry.mood]++;
    });
    const avg = (totalScore / history.length).toFixed(1);
    return { avg, counts, total: history.length };
  };
  const stats = computeStats();

  // ---------- Chart data ----------
  const prepareChartData = () => {
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
  };
  const chartData = prepareChartData();
  const hasHistory = history.length > 0;

  // ---------- Mount ----------
  useEffect(() => {
    loadCachedHistory();
    fetchHistory();
    loadLastSubmitTime();
    setupDailyReminder();
  }, [setupDailyReminder]);

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

      {/* Mood buttons */}
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

      {/* Action row */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.submitBtn, loading && { opacity: 0.7 }]}
          onPress={submitMood}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Save Mood</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={exportToCSV}>
          <Text style={styles.secondaryBtnText}>📤 Export</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={deleteLastEntry}>
          <Text style={[styles.secondaryBtnText, { color: "#f87171" }]}>🗑️ Delete last</Text>
        </TouchableOpacity>
      </View>

      {/* Stats card */}
      {stats && (
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>📊 Overall Mood</Text>
          <Text style={styles.statsAvg}>
            Average score: {stats.avg} / 4
            <Text style={{ fontSize: 14, color: "#94a3b8" }}>  (Based on {stats.total} entries)</Text>
          </Text>
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