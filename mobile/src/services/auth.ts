import { api } from "./api";
import { User } from "../types";

export interface SendOtpResponse {
  message: string;
  otp_code?: string; // Returned in development sandbox
}

export interface VerifyOtpResponse {
  access_token: string;
  token_type: string;
}

export const authService = {
  /**
   * Request OTP verification code for email/SMS.
   */
  sendOtp: async (
    payload: { email?: string; phone_number?: string }
  ): Promise<SendOtpResponse> => {
    const response = await api.post<SendOtpResponse>("/auth/send-otp", payload);
    return response.data;
  },

  /**
   * Verify verification code and retrieve access token.
   */
  verifyOtp: async (
    payload: { email?: string; phone_number?: string; otp_code: string }
  ): Promise<VerifyOtpResponse> => {
    const response = await api.post<VerifyOtpResponse>("/auth/verify-otp", payload);
    return response.data;
  },

  /**
   * Retrieve active user demographic profile details.
   */
  getProfile: async (): Promise<User> => {
    const response = await api.get<User>("/users/me");
    return response.data;
  },

  /**
   * Update active user profile fields.
   */
  updateProfile: async (payload: Partial<User>): Promise<User> => {
    const response = await api.put<User>("/users/me", payload);
    return response.data;
  },
};
