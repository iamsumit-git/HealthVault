import React, { useState } from "react";
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
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { Spacing, Colors } from "../../constants/theme";
import { documentService } from "../../services/documents";
import { DocumentType } from "../../types";
import { useColorScheme } from "react-native";

export default function UploadScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState<DocumentType>("prescription");
  const [notes, setNotes] = useState("");
  const [docDate, setDocDate] = useState(new Date().toISOString().split("T")[0]); // YYYY-MM-DD
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    name: string;
    type: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  // Request permissions and open Camera
  const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Camera permission is required to capture documents.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const asset = result.assets[0];
      const uri = asset.uri;
      const filename = asset.fileName || uri.split("/").pop() || "photo.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const mime = match ? `image/${match[1]}` : `image/jpeg`;

      setSelectedFile({
        uri,
        name: filename,
        type: mime,
      });

      // Auto-populate title if empty
      if (!title) {
        setTitle(`Prescription - ${new Date().toLocaleDateString("en-IN")}`);
      }
    }
  };

  // Open Gallery
  const handleGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Gallery permission is required to select files.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const asset = result.assets[0];
      const uri = asset.uri;
      const filename = asset.fileName || uri.split("/").pop() || "photo.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const mime = match ? `image/${match[1]}` : `image/jpeg`;

      setSelectedFile({
        uri,
        name: filename,
        type: mime,
      });

      if (!title) {
        setTitle(`Image Record - ${new Date().toLocaleDateString("en-IN")}`);
      }
    }
  };

  // Pick PDF/documents
  const handleDocPicker = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || "application/pdf",
        });

        if (!title) {
          setTitle(asset.name.replace(/\.[^/.]+$/, ""));
        }
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to select document.");
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      Alert.alert("Error", "Please select a file or take a picture first.");
      return;
    }
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a title for the document.");
      return;
    }

    // Validate date format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (docDate && !dateRegex.test(docDate)) {
      Alert.alert("Error", "Please enter date in YYYY-MM-DD format.");
      return;
    }

    setLoading(true);
    try {
      await documentService.uploadDocument({
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.type,
        title: title.trim(),
        document_type: docType,
        notes: notes.trim() || undefined,
        document_date: docDate || undefined,
      });

      Alert.alert("Success", "Medical record uploaded and scheduled for AI indexing! 🎉", [
        {
          text: "OK",
          onPress: () => {
            // Navigate back to timeline and reset state
            setTitle("");
            setNotes("");
            setSelectedFile(null);
            router.replace("/(app)");
          },
        },
      ]);
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || "Upload failed. Please try again.";
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
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} disabled={Platform.OS === 'web'}>
        <ThemedView style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* File Selector Cards */}
            <ThemedText style={styles.sectionTitle}>Add Medical Record</ThemedText>
            <ThemedText style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Upload scan, prescription, or lab reports to index details in the secure AI locker.
            </ThemedText>

            <View style={styles.selectorGrid}>
              <TouchableOpacity
                style={[
                  styles.selectorCard,
                  {
                    backgroundColor: colors.backgroundElement,
                    borderColor: colors.backgroundSelected,
                  },
                ]}
                onPress={handleCamera}
              >
                <Ionicons name="camera" size={32} color="#0D9488" />
                <ThemedText style={styles.selectorLabel}>Camera</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.selectorCard,
                  {
                    backgroundColor: colors.backgroundElement,
                    borderColor: colors.backgroundSelected,
                  },
                ]}
                onPress={handleGallery}
              >
                <Ionicons name="images" size={32} color="#8B5CF6" />
                <ThemedText style={styles.selectorLabel}>Gallery</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.selectorCard,
                  {
                    backgroundColor: colors.backgroundElement,
                    borderColor: colors.backgroundSelected,
                  },
                ]}
                onPress={handleDocPicker}
              >
                <Ionicons name="document-attach" size={32} color="#F59E0B" />
                <ThemedText style={styles.selectorLabel}>PDF / File</ThemedText>
              </TouchableOpacity>
            </View>

            {/* Selected File Feedback */}
            {selectedFile ? (
              <ThemedView
                style={[
                  styles.fileFeedbackCard,
                  {
                    backgroundColor: colors.backgroundSelected,
                  },
                ]}
              >
                <Ionicons
                  name={selectedFile.type.includes("pdf") ? "document" : "image"}
                  size={24}
                  color="#0D9488"
                />
                <View style={{ flex: 1, backgroundColor: "transparent" }}>
                  <ThemedText numberOfLines={1} style={styles.fileName}>
                    {selectedFile.name}
                  </ThemedText>
                  <ThemedText style={[styles.fileType, { color: colors.textSecondary }]}>
                    {selectedFile.type}
                  </ThemedText>
                </View>
                <TouchableOpacity onPress={() => setSelectedFile(null)}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </ThemedView>
            ) : null}

            {/* Form Fields */}
            <View style={styles.form}>
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Record Title</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      backgroundColor: colors.backgroundElement,
                      borderColor: colors.backgroundSelected,
                    },
                  ]}
                  placeholder="e.g. Apollo Blood Test Report"
                  placeholderTextColor={colors.textSecondary}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Document Type</ThemedText>
                <View style={styles.typeRow}>
                  {(["prescription", "lab_report", "scan", "other"] as DocumentType[]).map(
                    (type) => {
                      const isSelected = docType === type;
                      return (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.typeChip,
                            {
                              backgroundColor: isSelected ? "#0D9488" : colors.backgroundElement,
                              borderColor: colors.backgroundSelected,
                            },
                          ]}
                          onPress={() => setDocType(type)}
                        >
                          <ThemedText
                            style={[
                              styles.typeChipText,
                              { color: isSelected ? "#FFFFFF" : colors.text },
                            ]}
                          >
                            {type.replace("_", " ")}
                          </ThemedText>
                        </TouchableOpacity>
                      );
                    }
                  )}
                </View>
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Document Date (YYYY-MM-DD)</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      backgroundColor: colors.backgroundElement,
                      borderColor: colors.backgroundSelected,
                    },
                  ]}
                  placeholder="2026-06-18"
                  placeholderTextColor={colors.textSecondary}
                  value={docDate}
                  onChangeText={setDocDate}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Notes / Observations (Optional)</ThemedText>
                <TextInput
                  style={[
                    styles.textArea,
                    {
                      color: colors.text,
                      backgroundColor: colors.backgroundElement,
                      borderColor: colors.backgroundSelected,
                    },
                  ]}
                  placeholder="Enter details like dosage directions, doctor recommendations, or symptoms..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={4}
                  value={notes}
                  onChangeText={setNotes}
                />
              </View>

              {/* Upload Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  {
                    backgroundColor: loading ? colors.backgroundSelected : "#0D9488",
                  },
                ]}
                onPress={handleUpload}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <ThemedText style={styles.submitButtonText}>Upload & Process</ThemedText>
                  </>
                )}
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  sectionSubtitle: {
    fontSize: 14,
    marginTop: Spacing.one,
    marginBottom: Spacing.three,
  },
  selectorGrid: {
    flexDirection: "row",
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  selectorCard: {
    flex: 1,
    height: 90,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.one,
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "capitalize",
  },
  fileFeedbackCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.three,
    borderRadius: 12,
    gap: Spacing.three,
    marginBottom: Spacing.three,
  },
  fileName: {
    fontSize: 14,
    fontWeight: "bold",
  },
  fileType: {
    fontSize: 12,
  },
  form: {
    gap: Spacing.three,
  },
  formGroup: {
    gap: Spacing.one,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
  },
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
    marginTop: 4,
  },
  typeChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: 16,
    borderWidth: 1,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  textArea: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    fontSize: 15,
    textAlignVertical: "top",
  },
  submitButton: {
    height: 52,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.three,
  },
  submitButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
});
