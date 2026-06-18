import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { Spacing, Colors } from "../../constants/theme";
import { authService } from "../../services/auth";
import { useAuthStore } from "../../state/useAuthStore";
import { useColorScheme } from "react-native";

export default function ProfileScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  const { user, setUser, logout } = useAuthStore();

  const [fullName, setFullName] = useState(user?.full_name || "");
  const [dob, setDob] = useState(user?.date_of_birth || "");
  const [gender, setGender] = useState(user?.gender || "");
  const [bloodGroup, setBloodGroup] = useState(user?.blood_group || "");
  const [emergName, setEmergName] = useState(user?.emergency_contact_name || "");
  const [emergPhone, setEmergPhone] = useState(user?.emergency_contact_phone || "");
  const [allergies, setAllergies] = useState(user?.allergies || "");
  const [chronicConditions, setChronicConditions] = useState(user?.chronic_conditions || "");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setDob(user.date_of_birth || "");
      setGender(user.gender || "");
      setBloodGroup(user.blood_group || "");
      setEmergName(user.emergency_contact_name || "");
      setEmergPhone(user.emergency_contact_phone || "");
      setAllergies(user.allergies || "");
      setChronicConditions(user.chronic_conditions || "");
    }
  }, [user]);

  const handleSave = async () => {
    if (dob) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dob)) {
        Alert.alert("Invalid Date", "Date of Birth must be in YYYY-MM-DD format.");
        return;
      }
    }

    setSaving(true);
    try {
      const updated = await authService.updateProfile({
        full_name: fullName.trim() || null,
        date_of_birth: dob.trim() || null,
        gender: gender.trim() || null,
        blood_group: bloodGroup.trim() || null,
        emergency_contact_name: emergName.trim() || null,
        emergency_contact_phone: emergPhone.trim() || null,
        allergies: allergies.trim() || null,
        chronic_conditions: chronicConditions.trim() || null,
      });

      setUser(updated);
      Alert.alert("Success", "Profile updated successfully! ❤️");
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || "Failed to update profile. Please try again.";
      Alert.alert("Error", errMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to log out of PostCare India?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: () => {
            logout();
            router.replace("/(auth)/login");
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ThemedView style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* User Identity Banner */}
            <ThemedView
              style={[
                styles.identityCard,
                {
                  backgroundColor: colors.backgroundElement,
                  borderColor: colors.backgroundSelected,
                },
              ]}
            >
              <View style={styles.avatar}>
                <Ionicons name="person" size={36} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, backgroundColor: "transparent" }}>
                <ThemedText style={styles.nameHeader}>
                  {fullName || "Add Your Name"}
                </ThemedText>
                <ThemedText style={[styles.identifierHeader, { color: colors.textSecondary }]}>
                  {user?.email || user?.phone_number || "Indian Health Vault"}
                </ThemedText>
              </View>
            </ThemedView>

            {/* Demographics Card */}
            <ThemedText style={styles.sectionHeader}>Demographics</ThemedText>
            <ThemedView
              style={[
                styles.card,
                {
                  backgroundColor: colors.backgroundElement,
                  borderColor: colors.backgroundSelected,
                },
              ]}
            >
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Full Name</ThemedText>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.backgroundSelected }]}
                  placeholder="Sumit Vijay"
                  placeholderTextColor={colors.textSecondary}
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <ThemedText style={styles.label}>Date of Birth</ThemedText>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.backgroundSelected }]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textSecondary}
                    value={dob}
                    onChangeText={setDob}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <ThemedText style={styles.label}>Gender</ThemedText>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.backgroundSelected }]}
                    placeholder="e.g. Male"
                    placeholderTextColor={colors.textSecondary}
                    value={gender}
                    onChangeText={setGender}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Blood Group</ThemedText>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.backgroundSelected }]}
                  placeholder="e.g. O+ / B+"
                  placeholderTextColor={colors.textSecondary}
                  value={bloodGroup}
                  onChangeText={setBloodGroup}
                />
              </View>
            </ThemedView>

            {/* Emergency Contacts */}
            <ThemedText style={styles.sectionHeader}>Emergency Contacts</ThemedText>
            <ThemedView
              style={[
                styles.card,
                {
                  backgroundColor: colors.backgroundElement,
                  borderColor: colors.backgroundSelected,
                },
              ]}
            >
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Contact Person Name</ThemedText>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.backgroundSelected }]}
                  placeholder="Guardian / Spouse Name"
                  placeholderTextColor={colors.textSecondary}
                  value={emergName}
                  onChangeText={setEmergName}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Contact Phone Number</ThemedText>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.backgroundSelected }]}
                  placeholder="+91 99999 99999"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                  value={emergPhone}
                  onChangeText={setEmergPhone}
                />
              </View>
            </ThemedView>

            {/* Medical Context */}
            <ThemedText style={styles.sectionHeader}>Critical Medical Details</ThemedText>
            <ThemedView
              style={[
                styles.card,
                {
                  backgroundColor: colors.backgroundElement,
                  borderColor: colors.backgroundSelected,
                },
              ]}
            >
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Allergies</ThemedText>
                <TextInput
                  style={[styles.textArea, { color: colors.text, borderColor: colors.backgroundSelected }]}
                  placeholder="List medications, food items, or pollen allergies (if any)"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                  value={allergies}
                  onChangeText={setAllergies}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Chronic Conditions</ThemedText>
                <TextInput
                  style={[styles.textArea, { color: colors.text, borderColor: colors.backgroundSelected }]}
                  placeholder="e.g. Hypertension, Diabetes, Thyroid, Asthma"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                  value={chronicConditions}
                  onChangeText={setChronicConditions}
                />
              </View>
            </ThemedView>

            {/* Save Buttons & Logout */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: saving ? colors.backgroundSelected : "#0D9488" }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="save" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <ThemedText style={styles.saveButtonText}>Save Profile</ThemedText>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
                <ThemedText style={styles.logoutButtonText}>Sign Out</ThemedText>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </ThemedView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
  },
  identityCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.four,
    borderRadius: 16,
    borderWidth: 1,
    gap: Spacing.three,
    marginBottom: Spacing.four,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#0D9488",
    alignItems: "center",
    justifyContent: "center",
  },
  nameHeader: {
    fontSize: 18,
    fontWeight: "bold",
  },
  identifierHeader: {
    fontSize: 13,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: "bold",
    marginLeft: 4,
    marginBottom: Spacing.two,
    marginTop: Spacing.two,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    opacity: 0.8,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.three,
    marginBottom: Spacing.four,
  },
  formGroup: {
    gap: Spacing.one,
  },
  formRow: {
    flexDirection: "row",
    gap: Spacing.three,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.9,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
  },
  textArea: {
    minHeight: 80,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    fontSize: 15,
    textAlignVertical: "top",
  },
  actionsContainer: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  saveButton: {
    height: 52,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  logoutButton: {
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EF4444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  logoutButtonText: {
    fontSize: 16,
    color: "#EF4444",
    fontWeight: "bold",
  },
});
