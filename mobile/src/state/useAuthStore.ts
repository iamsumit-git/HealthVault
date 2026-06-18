import { create } from "zustand";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";
import { Platform } from "react-native";

export interface UserProfile {
  id: string;
  phone_number: string | null;
  email: string | null;
  full_name: string | null;
  date_of_birth: string | null;
  age: number | null;
  gender: string | null;
  blood_group: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  allergies: string | null;
  chronic_conditions: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setToken: (token: string | null) => void;
  setUser: (user: UserProfile | null) => void;
  setLoading: (isLoading: boolean) => void;
  logout: () => void;
}

const customStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (Platform.OS === "web") {
      try {
        return localStorage.getItem(name);
      } catch {
        return null;
      }
    }
    try {
      const AsyncStorage = require("@react-native-async-storage/async-storage").default;
      return await AsyncStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (Platform.OS === "web") {
      try {
        localStorage.setItem(name, value);
      } catch {}
      return;
    }
    try {
      const AsyncStorage = require("@react-native-async-storage/async-storage").default;
      await AsyncStorage.setItem(name, value);
    } catch {}
  },
  removeItem: async (name: string): Promise<void> => {
    if (Platform.OS === "web") {
      try {
        localStorage.removeItem(name);
      } catch {}
      return;
    }
    try {
      const AsyncStorage = require("@react-native-async-storage/async-storage").default;
      await AsyncStorage.removeItem(name);
    } catch {}
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: true, // Start as loading until rehydration completes
      setToken: (token) =>
        set({
          token,
          isAuthenticated: token !== null,
        }),
      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () =>
        set({
          token: null,
          user: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => customStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setLoading(false);
      },
    }
  )
);

