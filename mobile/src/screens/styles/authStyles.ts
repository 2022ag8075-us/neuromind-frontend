import { StyleSheet } from "react-native";
import { colors } from "../../styles/colors";

export const authStyles = StyleSheet.create({
  // =========================
  // SCREEN CONTAINER
  // =========================
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    padding: 20,
  },

  // =========================
  // CARD (FIXES YOUR ERROR)
  // =========================
  card: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },

  // =========================
  // TITLE
  // =========================
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.primary,
    textAlign: "center",
    marginBottom: 20,
  },

  // =========================
  // INPUT
  // =========================
  input: {
    backgroundColor: "#0f172a",
    color: colors.text,
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // =========================
  // BUTTON
  // =========================
  button: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },

  // =========================
  // BUTTON TEXT
  // =========================
  buttonText: {
    color: "#0f172a",
    fontWeight: "700",
    fontSize: 16,
  },

  // =========================
  // LINK TEXT
  // =========================
  linkText: {
    color: colors.subtext,
    textAlign: "center",
    marginTop: 15,
    fontSize: 14,
  },

  // =========================
  // NEW STYLES FOR PASSWORD TOGGLE
  // =========================
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 12,
  },
  passwordInput: {
    flex: 1,
    marginRight: 8,
  },
  eyeIcon: {
    padding: 10,
  },
  eyeText: {
    fontSize: 20,
    color: "#94a3b8",
  },
});