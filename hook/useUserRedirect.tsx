import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";

export function useRedirectIfSignedIn(redirectPath: string = "/(tabs)") {
  const { isSignedIn, userId } = useAuth();
  const router = useRouter();
  const hasNavigatedRef = useRef(false);
  
  console.log(process.env.EXPO_PUBLIC_BASE_URL, userId);

  useEffect(() => {
    console.log("useUserRedirect - isSignedIn:", isSignedIn, "userId:", userId);
    
    // Reset navigation flag when auth state changes
    if (!isSignedIn) {
      hasNavigatedRef.current = false;
      return;
    }
    
    if (isSignedIn && userId && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      
      // Use the same endpoint as the main layout for consistency
      const base = process.env.EXPO_PUBLIC_BASE_URL || "https://your-api.com";
      fetch(`${base.replace(/\/$/, "")}/user/find/${userId}`)
        .then((res) => {
          console.log("useUserRedirect API response:", res.status, res.statusText);
          if (res.status === 404) {
            console.log("User not found in database, redirecting to /boarding");
            router.replace("/(auth)/(boarding)/boarding");
          } else if (res.ok) {
            console.log("User exists in database, redirecting to tabs");
            router.replace(redirectPath as any);
          } else {
            console.error("Unexpected API response:", res.status, res.statusText);
            // Reset flag to allow retry
            hasNavigatedRef.current = false;
          }
        })
        .catch((error) => {
          console.error("Error checking user in useUserRedirect:", error);
          // Reset flag to allow retry
          hasNavigatedRef.current = false;
        });
    }
  }, [isSignedIn, userId, router, redirectPath]);
}
