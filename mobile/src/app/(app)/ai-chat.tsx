import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
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
import { aiService } from "../../services/ai";
import { documentService } from "../../services/documents";
import { AIMessage, AIConversation, MedicalDocument } from "../../types";
import { useColorScheme } from "react-native";

export default function AIChatScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [documentsMap, setDocumentsMap] = useState<Record<string, MedicalDocument>>({});

  const flatListRef = useRef<FlatList>(null);

  // Fetch conversations and documents for citation mapping
  useEffect(() => {
    loadThreads();
    loadDocuments();
  }, []);

  const loadThreads = async () => {
    try {
      const threads = await aiService.getConversations();
      setConversations(threads);
      if (threads.length > 0 && !activeConvId) {
        // Load the latest thread by default
        setActiveConvId(threads[0].id);
        loadThreadDetails(threads[0].id);
      }
    } catch (err) {
      console.error("Failed to load AI conversations", err);
    }
  };

  const loadDocuments = async () => {
    try {
      const docs = await documentService.getDocuments();
      const map: Record<string, MedicalDocument> = {};
      docs.forEach((d) => {
        map[d.id] = d;
      });
      setDocumentsMap(map);
    } catch (err) {
      console.error("Failed to load documents mapping", err);
    }
  };

  const loadThreadDetails = async (id: string) => {
    setLoadingHistory(true);
    try {
      const details = await aiService.getConversationDetails(id);
      setMessages(details.messages || []);
      setActiveConvId(id);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      Alert.alert("Error", "Failed to load chat history.");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleStartNewChat = () => {
    setActiveConvId(undefined);
    setMessages([]);
    setShowHistory(false);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userText = inputMessage.trim();
    setInputMessage("");
    Keyboard.dismiss();

    // Optimistically insert user message
    const tempUserMsg: AIMessage = {
      id: Math.random().toString(),
      role: "user",
      content: userText,
      referenced_document_ids: null,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const response = await aiService.chat({
        message: userText,
        conversation_id: activeConvId,
      });

      // Update messages with actual database result (contains reference IDs and conversation context)
      setMessages((prev) => {
        // Remove optimistic user message and replace with actual back-and-forth or append assistant
        const filtered = prev.filter((m) => m.id !== tempUserMsg.id);
        // We append user message and assistant message
        const finalUserMsg: AIMessage = {
          id: Math.random().toString(),
          role: "user",
          content: userText,
          referenced_document_ids: null,
          created_at: new Date().toISOString(),
        };
        return [...filtered, finalUserMsg, response];
      });

      // If this was a new conversation, reload threads to capture it
      if (!activeConvId) {
        await loadThreads();
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || "AI failed to respond. Please try again.";
      Alert.alert("Error", errMsg);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      {/* Disclaimer Banner */}
      <ThemedView
        style={[
          styles.disclaimerBanner,
          {
            backgroundColor: scheme === "dark" ? "rgba(245, 158, 11, 0.15)" : "#FEF3C7",
            borderBottomColor: "#F59E0B",
          },
        ]}
      >
        <Ionicons name="warning-outline" size={18} color="#D97706" />
        <ThemedText style={[styles.disclaimerText, { color: "#B45309" }]}>
          PostCare AI is an informational tool, not a doctor. Ask a qualified physician for clinical decisions.
        </ThemedText>
      </ThemedView>

      {/* Header bar for Threads / New Chat */}
      <ThemedView
        style={[
          styles.headerBar,
          {
            backgroundColor: colors.backgroundElement,
            borderBottomColor: colors.backgroundSelected,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setShowHistory(!showHistory)}
        >
          <Ionicons name="chatbubbles" size={20} color="#0D9488" />
          <ThemedText style={styles.headerButtonText}>
            {showHistory ? "Hide Threads" : "Recent Chats"}
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerButton} onPress={handleStartNewChat}>
          <Ionicons name="add-circle" size={20} color="#0D9488" />
          <ThemedText style={styles.headerButtonText}>New Chat</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      {/* Thread list dropdown */}
      {showHistory && (
        <ThemedView
          style={[
            styles.historyDropdown,
            {
              backgroundColor: colors.backgroundElement,
              borderBottomColor: colors.backgroundSelected,
            },
          ]}
        >
          {conversations.length === 0 ? (
            <ThemedText style={styles.emptyHistory}>No previous conversations</ThemedText>
          ) : (
            <FlatList
              data={conversations}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: Spacing.two, padding: Spacing.two }}
              renderItem={({ item }) => {
                const isActive = item.id === activeConvId;
                return (
                  <TouchableOpacity
                    style={[
                      styles.historyChip,
                      {
                        backgroundColor: isActive ? "#0D9488" : colors.backgroundSelected,
                      },
                    ]}
                    onPress={() => {
                      loadThreadDetails(item.id);
                      setShowHistory(false);
                    }}
                  >
                    <ThemedText
                      numberOfLines={1}
                      style={[
                        styles.historyChipText,
                        { color: isActive ? "#FFFFFF" : colors.text },
                      ]}
                    >
                      {item.session_title}
                    </ThemedText>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </ThemedView>
      )}

      {/* Message Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {loadingHistory ? (
          <ThemedView style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#0D9488" />
          </ThemedView>
        ) : messages.length === 0 ? (
          <ThemedView style={styles.centerContainer}>
            <Ionicons name="pulse" size={60} color="#0D9488" />
            <ThemedText style={styles.welcomeTitle}>Explain report with AI</ThemedText>
            <ThemedText style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>
              Ask questions about your uploaded prescriptions or lab reports. The AI locker pulls matching sections to explain them.
            </ThemedText>
            <View style={styles.sampleQuestions}>
              {[
                "Explain the medication instructions on my prescription",
                "Are my CBC lab results normal?",
                "What instructions should I follow post-discharge?",
              ].map((q) => (
                <TouchableOpacity
                  key={q}
                  style={[
                    styles.sampleQuestionCard,
                    {
                      backgroundColor: colors.backgroundElement,
                      borderColor: colors.backgroundSelected,
                    },
                  ]}
                  onPress={() => {
                    setInputMessage(q);
                  }}
                >
                  <ThemedText style={styles.sampleQuestionText}>{q}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </ThemedView>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            renderItem={({ item }) => {
              const isUser = item.role === "user";
              return (
                <ThemedView
                  style={[
                    styles.messageBubbleContainer,
                    { justifyContent: isUser ? "flex-end" : "flex-start" },
                  ]}
                >
                  <ThemedView
                    style={[
                      styles.messageBubble,
                      isUser
                        ? {
                            backgroundColor: "#0D9488",
                            borderBottomRightRadius: 2,
                          }
                        : {
                            backgroundColor: colors.backgroundElement,
                            borderColor: colors.backgroundSelected,
                            borderWidth: 1,
                            borderBottomLeftRadius: 2,
                          },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.messageText,
                        { color: isUser ? "#FFFFFF" : colors.text },
                      ]}
                    >
                      {item.content}
                    </ThemedText>

                    {/* Citations / Referenced Documents */}
                    {!isUser &&
                      item.referenced_document_ids &&
                      item.referenced_document_ids.length > 0 && (
                        <View style={styles.citationsContainer}>
                          <ThemedText style={[styles.citationsTitle, { color: colors.textSecondary }]}>
                            RAG Sources:
                          </ThemedText>
                          <View style={styles.citationRow}>
                            {item.referenced_document_ids.map((docId: string) => {
                              const doc = documentsMap[docId];
                              if (!doc) return null;
                              return (
                                <TouchableOpacity
                                  key={docId}
                                  style={[
                                    styles.citationBadge,
                                    { backgroundColor: colors.backgroundSelected },
                                  ]}
                                  onPress={() => router.push(`/(app)/document/${docId}`)}
                                >
                                  <Ionicons name="document-text" size={12} color="#0D9488" />
                                  <ThemedText numberOfLines={1} style={styles.citationBadgeText}>
                                    {doc.title}
                                  </ThemedText>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      )}
                  </ThemedView>
                </ThemedView>
              );
            }}
          />
        )}

        {/* Input Bar */}
        <ThemedView
          style={[
            styles.inputContainer,
            {
              backgroundColor: colors.backgroundElement,
              borderTopColor: colors.backgroundSelected,
            },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              {
                color: colors.text,
                backgroundColor: colors.background,
                borderColor: colors.backgroundSelected,
              },
            ]}
            placeholder="Ask AI Locker..."
            placeholderTextColor={colors.textSecondary}
            value={inputMessage}
            onChangeText={setInputMessage}
            multiline
            maxLength={1000}
            editable={!loading}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: loading || !inputMessage.trim() ? colors.backgroundSelected : "#0D9488",
              },
            ]}
            onPress={handleSendMessage}
            disabled={loading || !inputMessage.trim()}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </ThemedView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  disclaimerBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: 1,
    gap: Spacing.two,
  },
  disclaimerText: {
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  headerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    padding: Spacing.one,
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0D9488",
  },
  historyDropdown: {
    borderBottomWidth: 1,
  },
  emptyHistory: {
    padding: Spacing.three,
    textAlign: "center",
    fontSize: 14,
    opacity: 0.5,
  },
  historyChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
  },
  historyChipText: {
    fontSize: 12,
    fontWeight: "600",
    maxWidth: 150,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.five,
    gap: Spacing.two,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: Spacing.two,
  },
  welcomeSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: Spacing.three,
  },
  sampleQuestions: {
    alignSelf: "stretch",
    gap: Spacing.two,
  },
  sampleQuestionCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.three,
  },
  sampleQuestionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  messageList: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.three,
    paddingBottom: Spacing.five,
  },
  messageBubbleContainer: {
    flexDirection: "row",
    backgroundColor: "transparent",
  },
  messageBubble: {
    maxWidth: "85%",
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  citationsContainer: {
    marginTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.1)",
    paddingTop: Spacing.one,
    backgroundColor: "transparent",
  },
  citationsTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 4,
  },
  citationRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    backgroundColor: "transparent",
  },
  citationBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    maxWidth: 160,
  },
  citationBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  inputContainer: {
    flexDirection: "row",
    padding: Spacing.three,
    borderTopWidth: 1,
    alignItems: "flex-end",
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: Spacing.four,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
});
