import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
  View,
  Clipboard,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";

import { ThemedText } from "../../../components/themed-text";
import { ThemedView } from "../../../components/themed-view";
import { Spacing, Colors } from "../../../constants/theme";
import { documentService } from "../../../services/documents";
import { shareService } from "../../../services/share";
import { MedicalDocument, ShareLink } from "../../../types";
import { useColorScheme } from "react-native";
import { useAuthStore } from "../../../state/useAuthStore";

export default function DocumentDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [document, setDocument] = useState<MedicalDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharingLoading, setSharingLoading] = useState(false);
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [selectedExpiryHours, setSelectedExpiryHours] = useState<number>(24);
  const [showShareModal, setShowShareModal] = useState(false);

  const fetchDetails = async () => {
    if (!id || id === "[id]" || !isAuthenticated) {
      return;
    }
    try {
      setLoading(true);
      const doc = await documentService.getDocumentDetails(id as string);
      setDocument(doc);
    } catch (err: any) {
      console.error(err);
      Alert.alert("Error", "Failed to fetch document details.");
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(app)");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id, isAuthenticated]);


  const handleOpenOriginal = async () => {
    if (!document?.pre_signed_url) {
      Alert.alert("Unavailable", "The document file URL is not available.");
      return;
    }
    try {
      await WebBrowser.openBrowserAsync(document.pre_signed_url);
    } catch (err) {
      Alert.alert("Error", "Unable to open document file.");
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to permanently delete this medical record and all its indexed AI vectors? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await documentService.deleteDocument(id as string);
              Alert.alert("Deleted", "Medical record has been deleted.");
              router.replace("/(app)");
            } catch (err) {
              Alert.alert("Error", "Failed to delete document.");
            }
          },
        },
      ]
    );
  };

  const handleGenerateShare = async () => {
    setSharingLoading(true);
    try {
      const link = await shareService.createShare({
        document_ids: [id as string],
        expires_in_hours: selectedExpiryHours,
      });

      // Construct shared URL
      const hostUrl = Platform.OS === "web" ? window.location.origin : "http://localhost:8000";
      // We expose the token in the final S3 portal path
      const publicLink = `${hostUrl}/api/v1/shares/view/${link.share_token}`;

      setShareLink({
        ...link,
        share_url: publicLink,
      });
    } catch (err) {
      Alert.alert("Error", "Failed to generate share link.");
    } finally {
      setSharingLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (shareLink?.share_url) {
      Clipboard.setString(shareLink.share_url);
      Alert.alert("Link Copied", "The secure viewer link has been copied to your clipboard.");
    }
  };

  const handleRevokeShare = async () => {
    if (!shareLink) return;
    try {
      await shareService.revokeShare(shareLink.share_token);
      Alert.alert("Revoked", "This share link has been successfully deactivated.");
      setShareLink(null);
      setShowShareModal(false);
    } catch (err) {
      Alert.alert("Error", "Failed to revoke share link.");
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0D9488" />
      </ThemedView>
    );
  }

  if (!document) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ThemedText>Document not found.</ThemedText>
      </ThemedView>
    );
  }

  const isProcessed = document.extracted_data !== null;
  const structuredData = document.extracted_data;
  const medicines = structuredData?.key_values_json?.medicines || [];
  const tests = structuredData?.key_values_json?.tests || [];
  const alerts = structuredData?.abnormal_flags_json?.alerts || [];

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      {/* Top Header Navigation */}
      <ThemedView
        style={[
          styles.topHeader,
          {
            backgroundColor: colors.backgroundElement,
            borderBottomColor: colors.backgroundSelected,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle} numberOfLines={1}>
          {document.title}
        </ThemedText>
        <TouchableOpacity onPress={handleDelete} style={styles.headerTrashBtn}>
          <Ionicons name="trash-outline" size={22} color="#EF4444" />
        </TouchableOpacity>
      </ThemedView>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Document Metadata Card */}
        <ThemedView
          style={[
            styles.metaCard,
            {
              backgroundColor: colors.backgroundElement,
              borderColor: colors.backgroundSelected,
            },
          ]}
        >
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <ThemedText style={[styles.metaLabel, { color: colors.textSecondary }]}>Type</ThemedText>
              <ThemedText style={styles.metaValue}>{document.document_type.replace("_", " ")}</ThemedText>
            </View>
            <View style={styles.metaItem}>
              <ThemedText style={[styles.metaLabel, { color: colors.textSecondary }]}>Date</ThemedText>
              <ThemedText style={styles.metaValue}>
                {document.document_date ? new Date(document.document_date).toLocaleDateString("en-IN") : "No Date"}
              </ThemedText>
            </View>
          </View>

          {document.notes && (
            <View style={styles.notesSection}>
              <ThemedText style={[styles.metaLabel, { color: colors.textSecondary }]}>Notes</ThemedText>
              <ThemedText style={styles.notesValue}>{document.notes}</ThemedText>
            </View>
          )}

          <TouchableOpacity
            style={[styles.openFileBtn, { backgroundColor: colors.backgroundSelected }]}
            onPress={handleOpenOriginal}
          >
            <Ionicons name="eye" size={18} color="#0D9488" style={{ marginRight: 8 }} />
            <ThemedText style={{ color: "#0D9488", fontWeight: "bold" }}>View Original Report</ThemedText>
          </TouchableOpacity>
        </ThemedView>

        {/* AI Report Analysis Section */}
        <ThemedText style={styles.sectionTitle}>✨ AI HealthVault Locker Analysis</ThemedText>

        {!isProcessed ? (
          <ThemedView style={[styles.loadingOcrCard, { backgroundColor: colors.backgroundElement }]}>
            <ActivityIndicator size="small" color="#0D9488" />
            <ThemedText style={styles.loadingOcrText}>
              AI is currently transcribing and indexing your medical document. Check back in a few seconds...
            </ThemedText>
          </ThemedView>
        ) : (
          <View style={{ gap: Spacing.four }}>
            {/* AI Summary */}
            {structuredData?.extracted_text ? (
              <ThemedView
                style={[
                  styles.infoCard,
                  {
                    backgroundColor: colors.backgroundElement,
                    borderColor: colors.backgroundSelected,
                  },
                ]}
              >
                <ThemedText style={styles.infoCardTitle}>🔬 Report Summary</ThemedText>
                <ThemedText style={styles.infoCardBody}>
                  {structuredData?.extracted_text?.split("\n\n")[0] || "Summary is unavailable."}
                </ThemedText>
              </ThemedView>
            ) : null}

            {/* Abnormal Flags Banner */}
            {alerts.length > 0 ? (
              <ThemedView
                style={[
                  styles.alertCard,
                  {
                    backgroundColor: scheme === "dark" ? "rgba(239, 68, 68, 0.15)" : "#FEE2E2",
                    borderColor: "#EF4444",
                  },
                ]}
              >
                <View style={styles.alertHeader}>
                  <Ionicons name="alert-circle" size={22} color="#EF4444" />
                  <ThemedText style={{ color: "#B91C1C", fontWeight: "bold", fontSize: 15 }}>
                    Attention Indicators
                  </ThemedText>
                </View>
                {alerts.map((alert, i) => (
                  <ThemedText key={i} style={{ color: "#991B1B", fontSize: 13, marginTop: 4 }}>
                    • {alert}
                  </ThemedText>
                ))}
              </ThemedView>
            ) : null}

            {/* Medicines List */}
            {medicines.length > 0 ? (
              <ThemedView
                style={[
                  styles.infoCard,
                  {
                    backgroundColor: colors.backgroundElement,
                    borderColor: colors.backgroundSelected,
                  },
                ]}
              >
                <ThemedText style={styles.infoCardTitle}>💊 Prescribed Medications</ThemedText>
                <View style={styles.medicinesList}>
                  {medicines.map((med, i) => (
                    <View
                      key={i}
                      style={[
                        styles.medRow,
                        {
                          borderBottomColor: i === medicines.length - 1 ? "transparent" : colors.backgroundSelected,
                        },
                      ]}
                    >
                      <View style={styles.medTitleCol}>
                        <ThemedText style={styles.medName}>{med.name}</ThemedText>
                        <ThemedText style={[styles.medSubText, { color: colors.textSecondary }]}>
                          Dosage: {med.dosage || "Not specified"}
                        </ThemedText>
                      </View>
                      <View style={styles.medDetailsCol}>
                        <ThemedText style={styles.medDetailsText}>{med.frequency}</ThemedText>
                        {med.duration && (
                          <ThemedText style={[styles.medSubText, { color: colors.textSecondary }]}>
                            Duration: {med.duration}
                          </ThemedText>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </ThemedView>
            ) : null}

            {/* Lab Test Results */}
            {tests.length > 0 ? (
              <ThemedView
                style={[
                  styles.infoCard,
                  {
                    backgroundColor: colors.backgroundElement,
                    borderColor: colors.backgroundSelected,
                  },
                ]}
              >
                <ThemedText style={styles.infoCardTitle}>📊 Lab Metrics</ThemedText>
                <View style={styles.testsList}>
                  {tests.map((test, i) => {
                    const isAbnormal = test.status?.toLowerCase().includes("high") || test.status?.toLowerCase().includes("low") || test.status?.toLowerCase().includes("abnormal");
                    return (
                      <View
                        key={i}
                        style={[
                          styles.testRow,
                          {
                            borderBottomColor: i === tests.length - 1 ? "transparent" : colors.backgroundSelected,
                          },
                        ]}
                      >
                        <View style={{ flex: 2, backgroundColor: "transparent" }}>
                          <ThemedText style={styles.testName}>{test.name}</ThemedText>
                          <ThemedText style={[styles.testRange, { color: colors.textSecondary }]}>
                            Ref Range: {test.reference_range} {test.unit}
                          </ThemedText>
                        </View>
                        <View style={{ flex: 1.2, alignItems: "flex-end", backgroundColor: "transparent" }}>
                          <ThemedText style={[styles.testValue, { color: isAbnormal ? "#EF4444" : "#0D9488" }]}>
                            {test.value} {test.unit}
                          </ThemedText>
                          <View
                            style={[
                              styles.statusBadge,
                              {
                                backgroundColor: isAbnormal ? "rgba(239, 68, 68, 0.1)" : "rgba(13, 148, 136, 0.1)",
                              },
                            ]}
                          >
                            <ThemedText style={[styles.statusText, { color: isAbnormal ? "#EF4444" : "#0D9488" }]}>
                              {test.status || "Normal"}
                            </ThemedText>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ThemedView>
            ) : null}
          </View>
        )}

        {/* Action Shares Button */}
        <TouchableOpacity
          style={[styles.shareToggleBtn, { backgroundColor: "#0D9488" }]}
          onPress={() => setShowShareModal(!showShareModal)}
        >
          <Ionicons name="share-social" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <ThemedText style={styles.shareToggleText}>
            {showShareModal ? "Hide Sharing Settings" : "Share Secure Report Link"}
          </ThemedText>
        </TouchableOpacity>

        {/* Secure Sharing Panel */}
        {showShareModal && (
          <ThemedView
            style={[
              styles.sharePanel,
              {
                backgroundColor: colors.backgroundElement,
                borderColor: colors.backgroundSelected,
              },
            ]}
          >
            <ThemedText style={styles.shareTitle}>Temporary Secure Link Sharing</ThemedText>
            <ThemedText style={[styles.shareDesc, { color: colors.textSecondary }]}>
              Generate a temporary public URL for this report. Doctors can view it without registering.
            </ThemedText>

            {!shareLink ? (
              <View style={styles.sharingSetup}>
                <ThemedText style={styles.expiryLabel}>Select Link Expiration:</ThemedText>
                <View style={styles.expiryRow}>
                  {[1, 12, 24, 168].map((hours) => (
                    <TouchableOpacity
                      key={hours}
                      style={[
                        styles.expiryChip,
                        {
                          backgroundColor: selectedExpiryHours === hours ? "#0D9488" : colors.backgroundSelected,
                        },
                      ]}
                      onPress={() => setSelectedExpiryHours(hours)}
                    >
                      <ThemedText
                        style={[
                          styles.expiryChipText,
                          { color: selectedExpiryHours === hours ? "#FFFFFF" : colors.text },
                        ]}
                      >
                        {hours === 168 ? "1 Wk" : `${hours} Hrs`}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.generateShareBtn, { backgroundColor: colors.text }]}
                  onPress={handleGenerateShare}
                  disabled={sharingLoading}
                >
                  {sharingLoading ? (
                    <ActivityIndicator color={colors.background} />
                  ) : (
                    <ThemedText style={[styles.generateShareText, { color: colors.background }]}>
                      Generate Share Link
                    </ThemedText>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.activeShare}>
                <View style={styles.shareUrlRow}>
                  <ThemedText numberOfLines={1} style={[styles.shareUrlText, { color: colors.textSecondary }]}>
                    {shareLink.share_url}
                  </ThemedText>
                  <TouchableOpacity style={styles.copyBtn} onPress={handleCopyLink}>
                    <Ionicons name="copy" size={20} color="#0D9488" />
                  </TouchableOpacity>
                </View>

                <ThemedText style={styles.expiresAtText}>
                  Expires At: {new Date(shareLink.expires_at).toLocaleString("en-IN")}
                </ThemedText>

                <TouchableOpacity style={styles.revokeBtn} onPress={handleRevokeShare}>
                  <Ionicons name="close-circle" size={16} color="#EF4444" style={{ marginRight: 6 }} />
                  <ThemedText style={{ color: "#EF4444", fontWeight: "bold", fontSize: 13 }}>
                    Revoke/Disable URL
                  </ThemedText>
                </TouchableOpacity>
              </View>
            )}
          </ThemedView>
        )}

        {/* Disclaimer Card */}
        <ThemedView
          style={[
            styles.disclaimerCard,
            {
              backgroundColor: colors.backgroundSelected,
            },
          ]}
        >
          <ThemedText style={[styles.disclaimerContent, { color: colors.textSecondary }]}>
            Disclaimer: PostCare India AI locker analysis parses structured text values automatically. AI explanations and metrics are provided for general educational purposes. Always consult a physician or hospital emergency team for medical symptoms or decisions.
          </ThemedText>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    paddingHorizontal: Spacing.four,
    borderBottomWidth: 1,
  },
  headerBackBtn: {
    padding: Spacing.one,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "bold",
    marginHorizontal: Spacing.two,
  },
  headerTrashBtn: {
    padding: Spacing.one,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
  },
  metaCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.four,
    marginBottom: Spacing.four,
  },
  metaRow: {
    flexDirection: "row",
    gap: Spacing.four,
    marginBottom: Spacing.three,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  metaValue: {
    fontSize: 15,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  notesSection: {
    marginTop: Spacing.one,
    marginBottom: Spacing.three,
  },
  notesValue: {
    fontSize: 14,
    lineHeight: 19,
  },
  openFileBtn: {
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: Spacing.one,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: Spacing.two,
  },
  loadingOcrCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.four,
    borderRadius: 12,
    gap: Spacing.three,
    marginBottom: Spacing.four,
  },
  loadingOcrText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  infoCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.four,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: Spacing.two,
    color: "#0D9488",
  },
  infoCardBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  alertCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.four,
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    marginBottom: Spacing.one,
  },
  medicinesList: {
    gap: Spacing.two,
    backgroundColor: "transparent",
  },
  medRow: {
    flexDirection: "row",
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: "transparent",
  },
  medTitleCol: {
    flex: 1.5,
    backgroundColor: "transparent",
  },
  medName: {
    fontSize: 15,
    fontWeight: "bold",
  },
  medSubText: {
    fontSize: 12,
    marginTop: 2,
  },
  medDetailsCol: {
    flex: 1.2,
    alignItems: "flex-end",
    backgroundColor: "transparent",
  },
  medDetailsText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "right",
  },
  testsList: {
    gap: Spacing.two,
    backgroundColor: "transparent",
  },
  testRow: {
    flexDirection: "row",
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  testName: {
    fontSize: 14,
    fontWeight: "bold",
  },
  testRange: {
    fontSize: 11,
    marginTop: 2,
  },
  testValue: {
    fontSize: 14,
    fontWeight: "bold",
  },
  statusBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  shareToggleBtn: {
    height: 48,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.four,
    marginBottom: Spacing.three,
  },
  shareToggleText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "bold",
  },
  sharePanel: {
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  shareTitle: {
    fontSize: 15,
    fontWeight: "bold",
  },
  shareDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: Spacing.one,
  },
  sharingSetup: {
    gap: Spacing.two,
  },
  expiryLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  expiryRow: {
    flexDirection: "row",
    gap: Spacing.two,
    marginTop: 2,
  },
  expiryChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
  },
  expiryChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  generateShareBtn: {
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.two,
  },
  generateShareText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  activeShare: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  shareUrlRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    borderWidth: 1,
    borderColor: "#0D9488",
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  shareUrlText: {
    flex: 1,
    fontSize: 13,
  },
  copyBtn: {
    padding: Spacing.one,
  },
  expiresAtText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#D97706",
  },
  revokeBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.one,
    padding: Spacing.one,
  },
  disclaimerCard: {
    padding: Spacing.three,
    borderRadius: 8,
    marginTop: Spacing.four,
  },
  disclaimerContent: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: "justify",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
