import { useAuth } from "@clerk/clerk-expo";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Token cache to avoid fetching token on every request
 */
let tokenCache: string | null = null;
let lastFetchedAt: number | null = null;

/**
 * Centralized fetch utility with automatic 401 handling and token refresh
 * 
 * @param getToken - Clerk's getToken function
 * @param url - API endpoint URL
 * @param options - Fetch options
 * @param isRetry - Internal flag to prevent infinite retry loops
 * @returns Response data as JSON
 */
export const fetchWithAutoRetry = async (
  getToken: ReturnType<typeof useAuth>["getToken"],
  url: string,
  options: RequestInit = {},
  isRetry = false
): Promise<any> => {
  // Refresh token if cache is stale (older than 4 minutes)
  const now = Date.now();
  const isStale =
    !tokenCache || !lastFetchedAt || now - lastFetchedAt > 4 * 60 * 1000;

  if (isStale) {
    try {
      tokenCache = await getToken({
        template: process.env.EXPO_PUBLIC_JWT_TEMPLATE_NAME,
      });
      lastFetchedAt = now;
      
      // Also update AsyncStorage for consistency
      if (tokenCache) {
        await AsyncStorage.setItem("authToken", tokenCache);
      }
    } catch (error) {
      console.error("Error fetching token:", error);
      throw new Error("Failed to authenticate");
    }
  }

  // Determine if body is FormData
  const isFormData = options.body instanceof FormData;

  // Make the API request
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${tokenCache}`,
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
    },
  });

  // Handle 401 - Token expired or invalid
  if (response.status === 401 && !isRetry) {
    console.log("🔄 Token expired (401), refreshing and retrying...");

    try {
      // Force refresh the token
      tokenCache = await getToken({
        template: process.env.EXPO_PUBLIC_JWT_TEMPLATE_NAME,
      });
      lastFetchedAt = Date.now();

      if (tokenCache) {
        await AsyncStorage.setItem("authToken", tokenCache);
      }

      // Retry the request with the new token (only once)
      return fetchWithAutoRetry(getToken, url, options, true);
    } catch (error) {
      console.error("Error refreshing token:", error);
      throw new Error("Authentication failed. Please sign in again.");
    }
  }

  // Handle other error responses
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Request failed: ${response.status} - ${errorText}`);
  }

  return response.json();
};

/**
 * Hook version of fetchWithAutoRetry for use in React components
 */
export const useFetchWithAutoRetry = () => {
  const { getToken } = useAuth();

  const fetchWithToken = async (
    url: string,
    options: RequestInit = {}
  ): Promise<any> => {
    return fetchWithAutoRetry(getToken, url, options);
  };

  return { fetchWithToken };
};

/**
 * Clear token cache (useful for logout)
 */
export const clearTokenCache = () => {
  tokenCache = null;
  lastFetchedAt = null;
};

