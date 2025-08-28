import { useState } from "react";
import { useUser } from "@clerk/clerk-expo";
import { CategoryEnum } from "@/enums/boarding";

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
          name: data.profile.username,
          email: user.emailAddresses[0]?.emailAddress,
          username: data.profile.username,
          clerkId: user.id,
          about: data.profile.bio,
          image: data.profile.profileImage,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to create user");
      }

      return result.data;
    } catch (err) {
      console.error("Error creating user:", err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { addUser, loading, error };
}
