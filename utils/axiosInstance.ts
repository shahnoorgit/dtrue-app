import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuth } from "@clerk/clerk-expo";
import AsyncStorage from "@react-native-async-storage/async-storage";

let tokenCache: string | null = null;
let lastFetchedAt: number | null = null;
let getTokenFunction: ReturnType<typeof useAuth>["getToken"] | null = null;

/**
 * Creates an axios instance with automatic 401 handling and token refresh
 */
export const createAuthAxiosInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: process.env.EXPO_PUBLIC_BASE_URL,
  });

  // Request interceptor to add auth token
  instance.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      // Check if token is stale (older than 4 minutes)
      const now = Date.now();
      const isStale =
        !tokenCache || !lastFetchedAt || now - lastFetchedAt > 4 * 60 * 1000;

      if (isStale && getTokenFunction) {
        try {
          tokenCache = await getTokenFunction({
            template: process.env.EXPO_PUBLIC_JWT_TEMPLATE_NAME,
          });
          lastFetchedAt = now;

          if (tokenCache) {
            await AsyncStorage.setItem("authToken", tokenCache);
          }
        } catch (error) {
          console.error("Error fetching token in interceptor:", error);
        }
      }

      // Add token to headers
      if (tokenCache) {
        config.headers.Authorization = `Bearer ${tokenCache}`;
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor to handle 401 errors
  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };

      // If error is 401 and we haven't retried yet
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        console.log("🔄 Token expired (401), refreshing and retrying...");

        try {
          // Force refresh the token
          if (getTokenFunction) {
            tokenCache = await getTokenFunction({
              template: process.env.EXPO_PUBLIC_JWT_TEMPLATE_NAME,
            });
            lastFetchedAt = Date.now();

            if (tokenCache) {
              await AsyncStorage.setItem("authToken", tokenCache);
              // Update the authorization header with new token
              originalRequest.headers.Authorization = `Bearer ${tokenCache}`;
            }

            // Retry the original request with new token
            return instance(originalRequest);
          }
        } catch (refreshError) {
          console.error("Error refreshing token:", refreshError);
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );

  return instance;
};

/**
 * Set the getToken function for the axios instance
 * Call this from your component/hook that has access to useAuth
 */
export const setAxiosTokenGetter = (
  getToken: ReturnType<typeof useAuth>["getToken"]
) => {
  getTokenFunction = getToken;
};

/**
 * Clear token cache (useful for logout)
 */
export const clearAxiosTokenCache = () => {
  tokenCache = null;
  lastFetchedAt = null;
};

/**
 * Hook to use the authenticated axios instance
 */
export const useAuthAxios = () => {
  const { getToken } = useAuth();

  // Set the token getter function
  setAxiosTokenGetter(getToken);

  return createAuthAxiosInstance();
};

