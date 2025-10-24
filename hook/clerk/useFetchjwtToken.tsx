import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-expo";
import AsyncStorage from "@react-native-async-storage/async-storage";

export function useAuthToken(
  template = process.env.EXPO_PUBLIC_JWT_TEMPLATE_NAME
): [string | null, () => Promise<void>] {
  const { getToken } = useAuth();
  const [token, setToken] = useState<string | null>(null);

  const fetchToken = useCallback(async () => {
    try {
      const newToken = await getToken({ template });
      if (newToken) {
        await AsyncStorage.removeItem("authToken");
        await AsyncStorage.setItem("authToken", newToken);
        setToken(newToken);
      }
    } catch (e) {
      console.error("Error fetching auth token", e);
    }
  }, [getToken, template]);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  return [token, fetchToken];
}
