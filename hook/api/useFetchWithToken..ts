import { useAuth } from "@clerk/clerk-expo";

let tokenCache: string | null = null;
let lastFetchedAt: number | null = null;

export const useFetchWithToken = () => {
  const { getToken } = useAuth();

  const refreshToken = async () => {
    tokenCache = await getToken({
      template: process.env.EXPO_PUBLIC_JWT_TEMPLATE_NAME,
    });
    lastFetchedAt = Date.now();
    return tokenCache;
  };

  const fetchWithToken = async (url: string, options: RequestInit = {}, isRetry = false) => {
    const now = Date.now();
    const isStale =
      !tokenCache || !lastFetchedAt || now - lastFetchedAt > 4 * 60 * 1000;

    if (isStale) {
      await refreshToken();
    }

    const isFormData = options.body instanceof FormData;

    const res = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${tokenCache}`,
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
      },
    });

    // Handle 401 - Unauthorized: Token expired or invalid
    if (res.status === 401 && !isRetry) {
      console.log("Token expired (401), refreshing token and retrying...");
      
      // Force refresh the token
      await refreshToken();
      
      // Retry the request with the new token
      return fetchWithToken(url, options, true);
    }

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Request failed: ${res.status} - ${errorText}`);
    }

    return res.json();
  };

  return { fetchWithToken };
};
