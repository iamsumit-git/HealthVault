import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  View,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { Spacing, Colors } from "../../constants/theme";
import { documentService } from "../../services/documents";
import { MedicalDocument, DocumentType } from "../../types";
import { useColorScheme } from "react-native";

const FILTER_TYPES: { label: string; value: DocumentType | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Prescriptions", value: "prescription" },
  { label: "Lab Reports", value: "lab_report" },
  { label: "Scans", value: "scan" },
  { label: "Discharges", value: "discharge_summary" },
  { label: "Others", value: "other" },
];

export default function TimelineScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<MedicalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<DocumentType | "all">("all");

  const fetchDocuments = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const docs = await documentService.getDocuments();
      setDocuments(docs);
      applyFilters(docs, searchQuery, selectedFilter);
    } catch (err: any) {
      console.error("Failed to load documents", err);
      // Don't alert if it's just background refresh and no token is present yet
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDocuments(documents.length === 0);
    }, [documents.length])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDocuments(false);
  }, []);

  const applyFilters = (
    allDocs: MedicalDocument[],
    query: string,
    filter: DocumentType | "all"
  ) => {
    let result = [...allDocs];

    // Filter by type
    if (filter !== "all") {
      result = result.filter((doc) => doc.document_type === filter);
    }

    // Filter by search query
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (doc) =>
          doc.title.toLowerCase().includes(q) ||
          (doc.notes && doc.notes.toLowerCase().includes(q))
      );
    }

    setFilteredDocs(result);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    applyFilters(documents, text, selectedFilter);
  };

  const handleFilterSelect = (filter: DocumentType | "all") => {
    setSelectedFilter(filter);
    applyFilters(documents, searchQuery, filter);
  };

  const getDocIcon = (type: DocumentType) => {
    switch (type) {
      case "prescription":
        return "document-text";
      case "lab_report":
        return "flask";
      case "scan":
        return "image";
      case "discharge_summary":
        return "clipboard";
      default:
        return "document";
    }
  };

  const getDocColor = (type: DocumentType) => {
    switch (type) {
      case "prescription":
        return "#0D9488"; // Teal
      case "lab_report":
        return "#8B5CF6"; // Violet
      case "scan":
        return "#F59E0B"; // Amber
      case "discharge_summary":
        return "#EF4444"; // Red
      default:
        return "#6B7280"; // Gray
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "No date";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Search Header */}
      <ThemedView style={styles.searchHeader}>
        <ThemedView
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.backgroundElement,
              borderColor: colors.backgroundSelected,
            },
          ]}
        >
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search reports or notes..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => handleSearch("")}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </ThemedView>
      </ThemedView>

      {/* Filter Chips list */}
      <View style={{ height: 50 }}>
        <FlatList
          horizontal
          data={FILTER_TYPES}
          keyExtractor={(item) => item.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
          renderItem={({ item }) => {
            const isSelected = selectedFilter === item.value;
            return (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? colors.text : colors.backgroundElement,
                    borderColor: colors.backgroundSelected,
                  },
                ]}
                onPress={() => handleFilterSelect(item.value)}
              >
                <ThemedText
                  style={[
                    styles.filterChipText,
                    { color: isSelected ? colors.background : colors.text },
                  ]}
                >
                  {item.label}
                </ThemedText>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Timeline List */}
      {loading ? (
        <ThemedView style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0D9488" />
        </ThemedView>
      ) : filteredDocs.length === 0 ? (
        <ThemedView style={styles.centerContainer}>
          <Ionicons name="folder-open-outline" size={64} color={colors.textSecondary} />
          <ThemedText style={styles.emptyTitle}>No documents found</ThemedText>
          <ThemedText style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {searchQuery || selectedFilter !== "all"
              ? "Try modifying your search query or filter chips."
              : "Upload prescriptions, lab reports, or scans to organize them here."}
          </ThemedText>
          {!(searchQuery || selectedFilter !== "all") && (
            <TouchableOpacity
              style={[styles.uploadButton, { backgroundColor: colors.text }]}
              onPress={() => router.push("/(app)/upload")}
            >
              <ThemedText style={{ color: colors.background, fontWeight: "bold" }}>
                Upload First Record
              </ThemedText>
            </TouchableOpacity>
          )}
        </ThemedView>
      ) : (
        <FlatList
          data={filteredDocs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#0D9488"
            />
          }
          renderItem={({ item }) => {
            const iconName = getDocIcon(item.document_type);
            const iconBg = getDocColor(item.document_type);

            return (
              <TouchableOpacity
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.backgroundElement,
                    borderColor: colors.backgroundSelected,
                  },
                ]}
                onPress={() => router.push(`/(app)/document/${item.id}`)}
              >
                <ThemedView
                  style={[styles.iconContainer, { backgroundColor: iconBg }]}
                >
                  <Ionicons name={iconName as any} size={24} color="#FFFFFF" />
                </ThemedView>

                <ThemedView style={styles.cardContent}>
                  <ThemedText style={styles.cardTitle} numberOfLines={1}>
                    {item.title}
                  </ThemedText>
                  <ThemedView style={styles.cardMeta}>
                    <ThemedText style={[styles.cardDate, { color: colors.textSecondary }]}>
                      {formatDate(item.document_date || item.uploaded_at)}
                    </ThemedText>
                    {item.tags && item.tags.length > 0 && (
                      <ThemedView style={styles.tagBadge}>
                        <ThemedText style={styles.tagText}>{item.tags[0]}</ThemedText>
                      </ThemedView>
                    )}
                  </ThemedView>
                  {item.notes && (
                    <ThemedText
                      style={[styles.cardNotes, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {item.notes}
                    </ThemedText>
                  )}
                </ThemedView>

                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textSecondary}
                  style={styles.chevron}
                />
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.text }]}
        onPress={() => router.push("/(app)/upload")}
      >
        <Ionicons name="add" size={30} color={colors.background} />
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchHeader: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  searchBar: {
    height: 48,
    borderWidth: 1,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: "100%",
  },
  filtersContainer: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.one,
    gap: Spacing.two,
  },
  filterChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.five,
    gap: Spacing.two,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: Spacing.two,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: Spacing.three,
  },
  uploadButton: {
    height: 48,
    paddingHorizontal: Spacing.four,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  listContainer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: 100,
    gap: Spacing.two,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.three,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    flex: 1,
    gap: 2,
    backgroundColor: "transparent",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    backgroundColor: "transparent",
  },
  cardDate: {
    fontSize: 13,
  },
  cardNotes: {
    fontSize: 13,
    marginTop: 2,
  },
  tagBadge: {
    backgroundColor: "rgba(13, 148, 136, 0.1)",
    paddingHorizontal: Spacing.one + 2,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    color: "#0D9488",
    fontSize: 11,
    fontWeight: "bold",
  },
  chevron: {
    marginLeft: Spacing.one,
  },
  fab: {
    position: "absolute",
    bottom: Spacing.four,
    right: Spacing.four,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
