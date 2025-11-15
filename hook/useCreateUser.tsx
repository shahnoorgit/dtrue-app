import { useState } from "react";
import { useUser } from "@clerk/clerk-expo";
import { CategoryEnum } from "@/enums/boarding";
import { logError } from "@/utils/sentry/sentry";

export interface Profile {
  username: string;
  bio: string;
  profileImage: string | null;
}

export interface SubmissionData {
  categories: Partial<Record<CategoryEnum, string[]>>;
  profile: Profile;
}

export function useCreateUser() {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  console.log("number", user?.phoneNumbers.length);

  const addUser = async (data: SubmissionData) => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_BASE_URL}/user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categories: data.categories,
          name: data.profile.username.trim(),
          email: user.emailAddresses[0]?.emailAddress?.trim(),
          username: data.profile.username.trim(),
          clerkId: user.id,
          about: data.profile.bio.trim(),
          image: data.profile.profileImage,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to create user");
      }

      return result.data;
    } catch (err: any) {
      console.error("Error creating user:", err);
      
      // Log error to Sentry
      logError(err, {
        context: "useCreateUser.addUser",
        clerkId: user?.id,
        username: data.profile.username,
        email: user?.emailAddresses[0]?.emailAddress ? "[REDACTED_EMAIL]" : "undefined",
        hasProfileImage: !!data.profile.profileImage,
        categoriesCount: Object.keys(data.categories).length,
      });
      
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { addUser, loading, error };
}
