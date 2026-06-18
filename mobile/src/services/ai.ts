import { api } from "./api";
import { AIMessage, AIConversation } from "../types";

export const aiService = {
  /**
   * Post a user message to the AI locker assistant and retrieve its answer.
   */
  chat: async (payload: {
    message: string;
    conversation_id?: string;
  }): Promise<AIMessage> => {
    const response = await api.post<AIMessage>("/ai/chat", payload);
    return response.data;
  },

  /**
   * Fetch all active AI conversation threads.
   */
  getConversations: async (): Promise<AIConversation[]> => {
    const response = await api.get<AIConversation[]>("/ai/conversations");
    return response.data;
  },

  /**
   * Fetch the full message log for a specific chat session.
   */
  getConversationDetails: async (id: string): Promise<AIConversation> => {
    const response = await api.get<AIConversation>(`/ai/conversations/${id}`);
    return response.data;
  },
};
