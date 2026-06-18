import { Platform } from "react-native";
import { api } from "./api";
import { MedicalDocument, DocumentType } from "../types";

export const documentService = {
  /**
   * Upload prescription/lab report using FormData (supports physical files).
   */
  uploadDocument: async (payload: {
    uri: string;
    name: string;
    type: string;
    title: string;
    document_type: DocumentType;
    notes?: string;
    document_date?: string;
  }): Promise<MedicalDocument> => {
    const formData = new FormData();
    
    if (Platform.OS === "web") {
      // On web, retrieve the file as a Blob before appending to FormData
      const response = await fetch(payload.uri);
      const blob = await response.blob();
      formData.append("file", blob, payload.name);
    } else {
      // Construct standard React Native file item
      const fileItem = {
        uri: payload.uri,
        name: payload.name,
        type: payload.type,
      } as any;
      formData.append("file", fileItem);
    }
    formData.append("title", payload.title);
    formData.append("document_type", payload.document_type);
    
    if (payload.notes) {
      formData.append("notes", payload.notes);
    }
    if (payload.document_date) {
      formData.append("document_date", payload.document_date);
    }

    const response = await api.post<MedicalDocument>("/documents/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  /**
   * Retrieve all medical documents, optionally filtered by type.
   */
  getDocuments: async (document_type?: DocumentType): Promise<MedicalDocument[]> => {
    const params = document_type ? { document_type } : {};
    const response = await api.get<MedicalDocument[]>("/documents", { params });
    return response.data;
  },

  /**
   * Retrieve single document metadata.
   */
  getDocumentDetails: async (id: string): Promise<MedicalDocument> => {
    const response = await api.get<MedicalDocument>(`/documents/${id}`);
    return response.data;
  },

  /**
   * Delete document by UUID.
   */
  deleteDocument: async (id: string): Promise<void> => {
    await api.delete(`/documents/${id}`);
  },
};
