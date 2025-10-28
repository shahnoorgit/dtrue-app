import axios from 'axios';
import { useState, useEffect } from 'react';

export interface SuggestedUser {
  id: string;
  clerkId: string;
  image: string;
  name: string;
  about: string;
  followersCount: number;
}

export interface SuggestedUsersResponse {
  success: boolean;
  data: SuggestedUser[];
  message?: string;
}

export const suggestedUsersApi = {
  async getSuggestedUsers(): Promise<SuggestedUser[]> {
    try {
      const response = await axios.get<SuggestedUsersResponse>(
        `${process.env.EXPO_PUBLIC_BASE_URL}/user/suggested`
      );
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Failed to fetch suggested users');
    } catch (error: any) {
      console.error('Error fetching suggested users:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch suggested users');
    }
  },
};

// Hook for React components
export const useSuggestedUsers = () => {
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestedUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const users = await suggestedUsersApi.getSuggestedUsers();
      setSuggestedUsers(users);
    } catch (err: any) {
      setError(err.message);
      console.error('Error in useSuggestedUsers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestedUsers();
  }, []);

  return {
    suggestedUsers,
    loading,
    error,
    refetch: fetchSuggestedUsers,
  };
};
