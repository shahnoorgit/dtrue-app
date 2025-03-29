import { useEffect } from "react";
import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";

export function useRedirectIfSignedIn(redirectPath: string = "/(tabs)") {
  const { isSignedIn, userId } = useAuth();
  const router = useRouter();
  console.log(process.env.EXPO_PUBLIC_BASE_URL, userId);

  useEffect(() => {
    console.log(isSignedIn,userId)
    if (isSignedIn && userId) {
      fetch(`${process.env.EXPO_PUBLIC_BASE_URL}/user/${userId}`)
        .then((res) => res.json())
        .then((data) => {
          // Assuming your API always returns a JSON with a "statusCode" field
          if (data.statusCode === 200) {
            console.log("User exists:", data);
            router.replace(redirectPath);
          } else if (data.statusCode === 404) {
            console.log("User not found, redirecting to /boarding");
            router.replace("/boarding");
          } else {
            console.error(
              "Unexpected statusCode in response:",
              data.statusCode
            );
          }
        })
        .catch((error) => {
          console.error("Error checking user:", error);
        });
    }
  }, [isSignedIn, userId, router, redirectPath]);
}
