import { StyleSheet } from "react-native";

export const markdownStyles = StyleSheet.create({
  body: { color: "#e2e8f0", fontSize: 16 },
  paragraph: { marginVertical: 0 },
  heading1: { color: "#f1f5f9", fontSize: 24, fontWeight: "bold" },
  heading2: { color: "#f1f5f9", fontSize: 20, fontWeight: "bold" },
  heading3: { color: "#f1f5f9", fontSize: 18, fontWeight: "bold" },
  code_inline: {
    backgroundColor: "#0f172a",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    color: "#38bdf8",
  },
  code_block: {
    backgroundColor: "#0f172a",
    padding: 12,
    borderRadius: 8,
    color: "#e2e8f0",
  },
  link: { color: "#60a5fa" },
  list_item: { color: "#e2e8f0" },
});