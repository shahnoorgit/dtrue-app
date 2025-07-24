import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAuthToken } from "@/hook/clerk/useFetchjwtToken";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useClerk } from "@clerk/clerk-expo";
import * as Haptics from "expo-haptics";

const THEME = {
  colors: {
    primary: "#00FF94",
    background: "#03120F",
    backgroundSecondary: "#1a1a1a",
    cardBackground: "#262626",
    surface: "#333333",
    text: "#FFFFFF",
    textSecondary: "#a3a3a3",
    textMuted: "#8F9BB3",
    border: "#404040",
    success: "#10b981",
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  borderRadius: { sm: 8, md: 12, lg: 16, xl: 24 },
};

interface User {
  id: string;
  name: string;
  username: string;
  about: string;
  image: string;
  createdAt: string;
  following: any[];
  followers: any[];
  created_debates: Array<{
    _count: { participants: number; upvoted_by: number };
  }>;
}

interface Debate {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  image: string;
  duration: number;
  active: boolean;
  keywords: string[];
  upvotes: number;
  joinedUsers: number;
}

const DebateCard: React.FC<{
  item: Debate;
  onJoin: (item: Debate) => void;
  loading: boolean;
}> = ({ item, onJoin, loading }) => (
  <View style={styles.debateCard}>
    <Image source={{ uri: item.image }} style={styles.debateImage} />

    <View style={styles.debateStatus}>
      <View
        style={[
          styles.statusBadge,
          {
            backgroundColor: item.active
              ? THEME.colors.success
              : THEME.colors.textMuted,
          },
        ]}
      >
        <Text style={styles.statusText}>
          {item.active ? "Active" : "Ended"}
        </Text>
      </View>
    </View>

    <View style={styles.debateInfo}>
      <Text style={styles.debateTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={styles.debateDescription} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.debateMetrics}>
        <View style={styles.metricItem}>
          <Ionicons name='people' size={14} color={THEME.colors.textMuted} />
          <Text style={styles.metricText}>{item.joinedUsers}</Text>
        </View>
        <View style={styles.metricItem}>
          <Ionicons name='arrow-up' size={14} color={THEME.colors.textMuted} />
          <Text style={styles.metricText}>{item.upvotes}</Text>
        </View>
        <View style={styles.metricItem}>
          <Ionicons name='time' size={14} color={THEME.colors.textMuted} />
          <Text style={styles.metricText}>{item.duration}h</Text>
        </View>
      </View>

      <View style={styles.keywordsContainer}>
        {item.keywords.slice(0, 3).map((keyword, index) => (
          <View key={index} style={styles.keywordTag}>
            <Text style={styles.keywordText}>{keyword}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.enterButton}
        onPress={() => onJoin(item)}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size='small' color={THEME.colors.text} />
        ) : (
          <Text style={styles.enterButtonText}>Enter</Text>
        )}
      </TouchableOpacity>
    </View>
  </View>
);

const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [debates, setDebates] = useState<Debate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  const [joiningDebateId, setJoiningDebateId] = useState<string | null>(null);

  const [token, fetchToken] = useAuthToken();
  const route = useRoute();
  const navigation = useNavigation();
  const router = useRouter();
  const clerk = useClerk();
  const { username, userId } =
    (route.params as { username: string; userId: string }) || {};

  const fetchWithAuthRetry = useCallback(
    async (url: string): Promise<Response> => {
      let currentToken = token;

      if (!currentToken) {
        currentToken = await AsyncStorage.getItem("authToken");
        if (!currentToken) {
          await fetchToken();
          currentToken = await AsyncStorage.getItem("authToken");
        }
      }

      if (!currentToken) throw new Error("No authentication token available");

      let response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${currentToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401) {
        await fetchToken();
        currentToken = await AsyncStorage.getItem("authToken");
        if (!currentToken) throw new Error("Token refresh failed");

        response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${currentToken}`,
            "Content-Type": "application/json",
          },
        });
      }

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      return response;
    },
    [token, fetchToken]
  );

  const fetchProfileData = useCallback(async () => {
    if (!token && !dataFetched) return;

    setLoading(true);
    try {
      const [profileResponse, debatesResponse] = await Promise.all([
        fetchWithAuthRetry(`${process.env.EXPO_PUBLIC_BASE_URL}/user/profile`),
        fetchWithAuthRetry(
          `${process.env.EXPO_PUBLIC_BASE_URL}/debate-room/get-user-created-rooms`
        ),
      ]);

      const profileData = await profileResponse.json();
      const debatesData = await debatesResponse.json();

      if (profileData.success) setUser(profileData.data);
      if (debatesData.success) setDebates(debatesData.data);

      setDataFetched(true);
    } catch (error) {
      console.error("Error fetching profile data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchWithAuthRetry, token, dataFetched]);

  useEffect(() => {
    if (token && !dataFetched) {
      fetchProfileData();
    }
  }, [token, dataFetched, fetchProfileData]);

  const onRefresh = () => {
    setRefreshing(true);
    setDataFetched(false);
    fetchProfileData();
  };

  const handleJoinPress = useCallback(
    async (debate: Debate) => {
      if (!token || !debate?.id) return;
      setJoiningDebateId(debate.id);

      try {
        router.push({
          pathname: "/(chat-room)/screen",
          params: {
            clerkId: userId,
            debateId: debate.id,
            debateImage: debate.image || "",
          },
        });
      } catch (err) {
        Alert.alert("Error", "Unable to join debate. Please try again.");
      } finally {
        setJoiningDebateId(null);
      }
    },
    [token, router, userId]
  );

  const handleLogout = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await clerk.signOut();
      router.replace("/onboarding");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color={THEME.colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons
          name='person-outline'
          size={48}
          color={THEME.colors.textMuted}
        />
        <Text style={styles.errorText}>User not found</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setDataFetched(false);
            fetchProfileData();
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderHeader = () => (
    <View>
      <View style={styles.headerSection}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name='chevron-back' size={24} color={THEME.colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          accessibilityLabel='Logout'
        >
          <Ionicons
            name='log-out-outline'
            size={24}
            color={THEME.colors.text}
          />
        </TouchableOpacity>
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            <Image source={{ uri: user.image }} style={styles.profileImage} />
            <View style={styles.profileImageBorder} />
          </View>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {user.followers?.length || 0}
              </Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {user.following?.length || 0}
              </Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {user.created_debates?.length || 0}
              </Text>
              <Text style={styles.statLabel}>Debates</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.followButton, isFollowing && styles.followingButton]}
            onPress={() => setIsFollowing((prev) => !prev)}
          >
            <Text
              style={[
                styles.followButtonText,
                isFollowing && styles.followingButtonText,
              ]}
            >
              {isFollowing ? "Following" : "Follow"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.bioSection}>
        <Text style={styles.username}>@{user.username}</Text>
        <Text style={styles.name}>{user.name}</Text>
        {user.about && <Text style={styles.bio}>{user.about}</Text>}
        <View style={styles.additionalStatItem}>
          <Ionicons name='calendar' size={16} color={THEME.colors.textMuted} />
          <Text style={styles.additionalStatText}>
            Joined {new Date(user.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <View style={styles.debatesHeader}>
        <Text style={styles.debatesTitle}>Debates ({debates.length})</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={debates}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DebateCard
            item={item}
            onJoin={handleJoinPress}
            loading={joiningDebateId === item.id}
          />
        )}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[THEME.colors.primary]}
            tintColor={THEME.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name='chatbubbles-outline'
              size={64}
              color={THEME.colors.textMuted}
            />
            <Text style={styles.emptyText}>No debates created yet</Text>
            <Text style={styles.emptySubText}>
              Start your first debate to see it here
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: THEME.colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: THEME.colors.textSecondary,
    fontWeight: "500",
    marginTop: THEME.spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: THEME.colors.background,
    paddingHorizontal: THEME.spacing.xl,
  },
  errorText: {
    fontSize: 18,
    color: THEME.colors.textSecondary,
    fontWeight: "600",
    marginTop: THEME.spacing.md,
    marginBottom: THEME.spacing.lg,
  },
  retryButton: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
  },
  retryButtonText: {
    color: THEME.colors.text,
    fontWeight: "600",
    fontSize: 16,
  },
  scrollContent: {
    paddingBottom: 20,
    padding: THEME.spacing.md,
  },
  headerSection: {
    paddingTop: 50,
    paddingBottom: THEME.spacing.md,
    backgroundColor: THEME.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.text,
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: THEME.spacing.md,
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.background,
    borderWidth: 1,
    borderColor: THEME.colors.text,
    justifyContent: "center",
    alignItems: "center",
  },
  logoutButton: {
    position: "absolute",
    top: 50,
    right: THEME.spacing.md,
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.background,
    borderWidth: 1,
    borderColor: THEME.colors.text,
    justifyContent: "center",
    alignItems: "center",
  },
  profileSection: {
    alignItems: "center",
    paddingHorizontal: THEME.spacing.md,
  },
  profileImageContainer: {
    position: "relative",
    marginBottom: THEME.spacing.md,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  profileImageBorder: {
    position: "absolute",
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 64,
    borderWidth: 3,
    borderColor: THEME.colors.text,
  },
  statsContainer: {
    flexDirection: "row",
    marginBottom: THEME.spacing.lg,
    gap: THEME.spacing.xl,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: THEME.colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    fontWeight: "500",
  },
  followButton: {
    backgroundColor: THEME.colors.text,
    paddingHorizontal: THEME.spacing.xl,
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.xl,
    minWidth: 120,
  },
  followingButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: THEME.colors.text,
  },
  followButtonText: {
    color: THEME.colors.background,
    fontWeight: "700",
    fontSize: 16,
    textAlign: "center",
  },
  followingButtonText: {
    color: THEME.colors.text,
  },
  bioSection: {
    backgroundColor: THEME.colors.background,
    padding: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.text,
  },
  username: {
    fontSize: 16,
    color: THEME.colors.textMuted,
    marginBottom: 4,
    fontWeight: "500",
  },
  name: {
    fontSize: 28,
    fontWeight: "bold",
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },
  bio: {
    fontSize: 16,
    color: THEME.colors.textSecondary,
    lineHeight: 24,
    marginBottom: THEME.spacing.md,
  },
  additionalStatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: THEME.spacing.sm,
  },
  additionalStatText: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    fontWeight: "500",
  },
  debatesHeader: {
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.md,
    backgroundColor: THEME.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.text,
  },
  debatesTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: THEME.colors.text,
  },
  debateCard: {
    marginVertical: THEME.spacing.sm,
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.text,
    overflow: "hidden",
    position: "relative",
  },
  debateImage: {
    width: "100%",
    height: 200,
  },
  debateStatus: {
    position: "absolute",
    top: THEME.spacing.sm,
    right: THEME.spacing.sm,
    zIndex: 1,
  },
  statusBadge: {
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.sm,
  },
  statusText: {
    color: THEME.colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  debateInfo: {
    padding: THEME.spacing.md,
  },
  debateTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
    lineHeight: 24,
  },
  debateDescription: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
    marginBottom: THEME.spacing.sm,
  },
  debateMetrics: {
    flexDirection: "row",
    gap: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
  },
  metricItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metricText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontWeight: "600",
  },
  keywordsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: THEME.spacing.xs,
    marginBottom: THEME.spacing.md,
  },
  keywordTag: {
    backgroundColor: THEME.colors.background,
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.text,
  },
  keywordText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontWeight: "500",
  },
  enterButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: THEME.colors.primary,
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.lg,
    borderRadius: THEME.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  enterButtonText: {
    color: THEME.colors.primary,
    fontWeight: "700",
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: THEME.spacing.xl,
  },
  emptyText: {
    fontSize: 18,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.md,
    fontWeight: "600",
    textAlign: "center",
  },
  emptySubText: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    marginTop: THEME.spacing.sm,
    textAlign: "center",
    lineHeight: 20,
  },
});

export default ProfilePage;
