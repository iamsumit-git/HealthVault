import axios from "axios";
import { Platform } from "react-native";
import { useAuthStore } from "../state/useAuthStore";

// Resolve host address based on emulator/platform type for local debugging
const getBaseURL = () => {
  if (__DEV__) {
    // Android Emulator bridges to host loopback on 10.0.2.2
    if (Platform.OS === "android") {
      return "http://10.0.2.2:8000/api/v1";
    }
    // Web and iOS Simulators bridge on localhost
    return "http://localhost:8000/api/v1";
  }
  return "http://localhost:8000/api/v1"; // Update to production server URL
};

export const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to dynamically inject the active JWT token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to catch unauthorized states and force logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and bounce user to login
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);
