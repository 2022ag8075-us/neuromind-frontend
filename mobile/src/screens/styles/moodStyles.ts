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

  // Emoji inside mood button
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
    color: "#0f172a", // dark background when active
    fontWeight: "bold",
  },

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
});

export default styles;