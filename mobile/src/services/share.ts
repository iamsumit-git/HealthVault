import { api } from "./api";
import { ShareLink, MedicalDocument } from "../types";

export const shareService = {
  /**
   * Create a temporary share access token link for selected document UUIDs.
   */
  createShare: async (payload: {
    document_ids: string[];
    expires_in_hours?: number;
  }): Promise<ShareLink> => {
    const response = await api.post<ShareLink>("/shares/create", payload);
    return response.data;
  },

  /**
   * Public fetch view to retrieve document list for a shared link token.
   */
  viewSharedDocs: async (token: string): Promise<MedicalDocument[]> => {
    // Note: uses public api route which does not require Bearer token
    const response = await api.get<MedicalDocument[]>(`/shares/view/${token}`);
    return response.data;
  },

  /**
   * Revoke/Deactivate a share link.
   */
  revokeShare: async (token: string): Promise<void> => {
    await api.post(`/shares/revoke/${token}`);
  },
};
