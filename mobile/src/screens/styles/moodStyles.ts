import { StyleSheet } from "react-native";
import { colors } from "../../styles/colors";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
  },

  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },

  subtitle: {
    color: colors.subtext,
    textAlign: "center",
    marginBottom: 24,
    fontSize: 14,
  },

  // Mood buttons row
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    marginBottom: 24,
  },

  moodBtn: {
    backgroundColor: colors.card,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: "center",
    minWidth: 80,
    borderWidth: 1,
    borderColor: colors.border,
  },

  activeMood: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  moodEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },

  moodText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "500",
  },

  activeMoodText: {
    color: "#0f172a",
    fontWeight: "bold",
  },

  // Save button (primary)
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 32,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 24,
  },

  submitText: {
    color: "#0f172a",
    fontWeight: "700",
    fontSize: 16,
  },

  // NEW: Action row (Save, Export, Delete)
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 10,
    marginBottom: 20,
  },

  // NEW: Secondary buttons (Export / Delete)
  secondaryBtn: {
    flex: 1,
    backgroundColor: "#1e293b",
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },

  secondaryBtnText: {
    color: "#e2e8f0",
    fontWeight: "600",
    fontSize: 14,
  },

  // NEW: Stats summary card
  statsCard: {
    backgroundColor: "#111827",
    borderRadius: 24,
    padding: 16,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: "#1f2a3a",
  },

  statsTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },

  statsAvg: {
    color: "#38bdf8",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },
  lastMoodBadge: {
  backgroundColor: "#1e293b",
  borderRadius: 20,
  paddingVertical: 6,
  paddingHorizontal: 12,
  alignSelf: "center",
  marginVertical: 8,
},
lastMoodText: {
  color: "#e2e8f0",
  fontSize: 12,
},
trendText: {
  color: "#38bdf8",
  fontSize: 14,
  marginBottom: 8,
  textAlign: "center",
},

  statsDistribution: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 4,
  },
});

export default styles;