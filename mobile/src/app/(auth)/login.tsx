import React, { useState } from "react";
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { Spacing, Colors } from "../../constants/theme";
import { authService } from "../../services/auth";
import { useAuthStore } from "../../state/useAuthStore";
import { useColorScheme } from "react-native";

export default function LoginScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  const [inputVal, setInputVal] = useState("");
  const [isEmail, setIsEmail] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!inputVal.trim()) {
      Alert.alert("Error", "Please enter an email address or phone number.");
      return;
    }

    setLoading(true);
    try {
      const payload = isEmail
        ? { email: inputVal.trim() }
        : { phone_number: inputVal.trim() };

      const res = await authService.sendOtp(payload);

      // In sandbox mode, show the generated OTP code in an alert for immediate login testing
      const developerHint = res.otp_code
        ? `\n\n(Dev Sandbox Mock Code: ${res.otp_code})`
        : "";

      Alert.alert(
        "Verification Code Sent",
        `A 6-digit code has been sent to your ${isEmail ? "email" : "phone"}.${developerHint}`,
        [
          {
            text: "OK",
            onPress: () => {
              // Redirect to OTP verification screen passing parameters
              router.push({
                pathname: "/(auth)/verify",
                params: {
                  identifier: inputVal.trim(),
                  type: isEmail ? "email" : "phone",
                },
              });
            },
          },
        ]
      );
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || "Something went wrong. Please try again.";
      Alert.alert("Failed", errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ThemedView style={styles.container}>
          <SafeAreaView style={styles.content}>
            {/* Brand Logo & Header */}
            <ThemedView style={styles.header}>
              <ThemedText style={styles.logo}>❤️ PostCare</ThemedText>
              <ThemedText type="title" style={styles.title}>
                Indian Family Medical Locker
              </ThemedText>
              <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
                Store reports securely and understand prescriptions in plain language using AI
              </ThemedText>
            </ThemedView>

            {/* Toggle Tabs */}
            <ThemedView style={styles.tabsContainer}>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  isEmail && { borderBottomColor: colors.text, borderBottomWidth: 2 },
                ]}
                onPress={() => {
                  setIsEmail(true);
                  setInputVal("");
                }}
              >
                <ThemedText style={[styles.tabLabel, isEmail && styles.activeTabLabel]}>
                  Email
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  !isEmail && { borderBottomColor: colors.text, borderBottomWidth: 2 },
                ]}
                onPress={() => {
                  setIsEmail(false);
                  setInputVal("");
                }}
              >
                <ThemedText style={[styles.tabLabel, !isEmail && styles.activeTabLabel]}>
                  Phone Number
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>

            {/* Input Form */}
            <ThemedView style={styles.form}>
              <ThemedText style={styles.label}>
                {isEmail ? "Enter Email Address" : "Enter Phone Number"}
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.backgroundElement,
                    borderColor: colors.backgroundSelected,
                  },
                ]}
                placeholder={
                  isEmail ? "name@email.com" : "+91 99999 99999"
                }
                placeholderTextColor={colors.textSecondary}
                keyboardType={isEmail ? "email-address" : "phone-pad"}
                autoCapitalize="none"
                value={inputVal}
                onChangeText={setInputVal}
              />

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { backgroundColor: loading ? colors.backgroundSelected : colors.text },
                ]}
                onPress={handleSendOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <ThemedText
                    style={[styles.submitButtonText, { color: colors.background }]}
                  >
                    Get Verification Code
                  </ThemedText>
                )}
              </TouchableOpacity>
            </ThemedView>

            <ThemedText style={[styles.footerText, { color: colors.textSecondary }]}>
              By signing in, you agree to our Terms of Service & Privacy Policy.
            </ThemedText>
          </SafeAreaView>
        </ThemedView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    justifyContent: "space-between",
    paddingVertical: Spacing.five,
  },
  header: {
    alignItems: "center",
    marginTop: Spacing.four,
    gap: Spacing.one,
  },
  logo: {
    fontSize: 32,
    fontWeight: "bold",
    letterSpacing: -1,
  },
  title: {
    fontSize: 22,
    textAlign: "center",
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: Spacing.three,
    marginTop: Spacing.one,
  },
  tabsContainer: {
    flexDirection: "row",
    marginTop: Spacing.five,
    borderBottomWidth: 1,
    borderBottomColor: "#cccccc",
  },
  tabButton: {
    flex: 1,
    paddingVertical: Spacing.two,
    alignItems: "center",
  },
  tabLabel: {
    fontSize: 15,
    opacity: 0.6,
  },
  activeTabLabel: {
    fontWeight: "bold",
    opacity: 1,
  },
  form: {
    flex: 2,
    marginTop: Spacing.five,
    gap: Spacing.two,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  submitButton: {
    height: 52,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.three,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  footerText: {
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: Spacing.four,
  },
});
