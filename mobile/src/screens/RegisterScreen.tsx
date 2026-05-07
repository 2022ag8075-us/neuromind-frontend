import React, { useState } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  View,
} from "react-native";

import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext"; // import chat hook
import { authStyles as styles } from "./styles/authStyles";

export default function RegisterScreen({ navigation }: any) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { clearSessions } = useChat(); // reset chat sessions on new signup

  const handleRegister = async () => {
    if (loading) return;

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Validation
    if (!cleanName || !cleanEmail || !password || !confirmPassword) {
      Alert.alert("Error", "All fields are required");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    try {
      setLoading(true);

      // 1. Register API call
      const res = await API.post("/auth/register", {
        name: cleanName,
        email: cleanEmail,
        password,
      });

      // 2. Save token via AuthContext (triggers auth state update)
      const newToken = res.data?.token;
      if (newToken) {
        await login(newToken);
      } else {
        throw new Error("No token returned from server");
      }

      // 3. Clear any cached chat data (old sessions) – critical for new account
      await clearSessions();

      Alert.alert("Success 🎉", "Account created successfully");

      // 4. Navigate to main app (e.g., Home) – not back to login
      navigation.reset({
        index: 0,
        routes: [{ name: "Home" }], // or your main screen name
      });
    } catch (err: any) {
      console.log("Registration error:", err?.response?.data || err.message);
      const message =
        err?.response?.data?.message ||
        err.message ||
        "Network error. Please try again.";
      Alert.alert("Registration Failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Create Account 🚀</Text>

        <TextInput
          placeholder="Full Name"
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholderTextColor="#94a3b8"
        />

        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor="#94a3b8"
        />

        <TextInput
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          placeholderTextColor="#94a3b8"
        />

        <TextInput
          placeholder="Confirm Password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          style={styles.input}
          placeholderTextColor="#94a3b8"
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Register</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Login")}>
          <Text style={styles.linkText}>
            Already have an account? Login
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}