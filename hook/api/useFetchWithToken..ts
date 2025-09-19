import { useAuth } from "@clerk/clerk-expo";

let tokenCache: string | null = null;
let lastFetchedAt: number | null = null;

export const useFetchWithToken = () => {
  const { getToken } = useAuth();

  const fetchWithToken = async (url: string, options: RequestInit = {}) => {
    const now = Date.now();
    const isStale =
      !tokenCache || !lastFetchedAt || now - lastFetchedAt > 4 * 60 * 1000;

    if (isStale) {
      tokenCache = await getToken({
        template: process.env.EXPO_PUBLIC_JWT_TEMPLATE_NAME,
      });
      lastFetchedAt = now;
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

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Request failed: ${res.status} - ${errorText}`);
    }

    return res.json();
  };

  return { fetchWithToken };
};
