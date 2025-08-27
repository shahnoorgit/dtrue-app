import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
  StyleSheet,
  StatusBar,
} from "react-native";
import {
  RelativePathString,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthToken } from "@/hook/clerk/useFetchjwtToken";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

type Follower = {
  id: string;
  username: string;
  image: string | null;
  about: string | null;
  followersCount?: number;
  isVerified?: boolean;
};

type FollowersResponse = {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    items: Follower[];
    nextCursor: string | null;
    totalCount?: number;
  };
};

const THEME = {
  colors: {
    primary: "#00FF94",
    secondary: "#FF00E5",
    background: "#080F12",
    backgroundDarker: "#03120F",
    cardBackground: "#0F1419",
    text: "#FFFFFF",
    textMuted: "#8F9BB3",
    textSecondary: "#6B7280",
    border: "#1A1F24",
    accent: "#00D4FF",
  },
  gradients: {
    primary: ["#00FF94", "#00D4FF"],
    secondary: ["#FF00E5", "#9333EA"],
    card: ["rgba(15, 20, 25, 0.8)", "rgba(8, 15, 18, 0.9)"],
  },
};

export default function FollowersScreen() {
  const router = useRouter();
  const { id, backTo, username, followersCount, image } = useLocalSearchParams<{
    id: string;
    username: string;
    followersCount: string;
    image: string;
    backTo: string;
  }>();

  const [token, refreshToken] = useAuthToken();
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchFollowers = useCallback(
    async (loadMore = false, retry = false, refresh = false) => {
      if (!token) return;

      try {
        if (refresh) {
          setRefreshing(true);
        } else if (loadMore) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }

        const currentCursor = refresh ? null : cursor;
        const res = await fetch(
          `${process.env.EXPO_PUBLIC_BASE_URL}/user/followers/${id}?limit=20${
            currentCursor ? `&cursor=${currentCursor}` : ""
          }`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (res.status === 401 && !retry) {
          await refreshToken();
          return fetchFollowers(loadMore, true, refresh);
        }

        const data: FollowersResponse = await res.json();
        if (!res.ok)
          throw new Error(data.message || "Failed to fetch followers");

        if (refresh) {
          setFollowers(data.data.items);
          setCursor(data.data.nextCursor ?? null);
        } else {
          setFollowers((prev) =>
            loadMore ? [...prev, ...data.data.items] : data.data.items
          );
          setCursor(data.data.nextCursor ?? null);
        }

        setHasMore(!!data.data.nextCursor);
      } catch (err) {
        console.error("Failed fetching followers", err);
        Alert.alert("Error", "Could not load followers. Please try again.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [id, cursor, token, refreshToken]
  );

  useEffect(() => {
    fetchFollowers();
  }, [id, token]);

  const onRefresh = useCallback(() => {
    setCursor(null);
    fetchFollowers(false, false, true);
  }, [fetchFollowers]);

  const renderFollowerItem = ({ item }: { item: Follower }) => {
    return (
      <TouchableOpacity
        style={styles.followerItem}
        onPress={() => router.push(`/(tabs)/${item.id}/page`)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={THEME.gradients.card}
          style={styles.followerGradient}
        >
          <View style={styles.followerContent}>
            <View style={styles.avatarContainer}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Ionicons
                    name='person'
                    size={24}
                    color={THEME.colors.textMuted}
                  />
                </View>
              )}
              {item.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons
                    name='checkmark'
                    size={10}
                    color={THEME.colors.background}
                  />
                </View>
              )}
            </View>

            <View style={styles.userInfo}>
              <View style={styles.userHeader}>
                <Text style={styles.username} numberOfLines={1}>
                  {item.username}
                </Text>
                {item.followersCount && (
                  <Text style={styles.followersText}>
                    {item.followersCount} followers
                  </Text>
                )}
              </View>
              {item.about && (
                <Text style={styles.bio} numberOfLines={2}>
                  {item.about}
                </Text>
              )}
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name='people-outline'
        size={64}
        color={THEME.colors.textMuted}
      />
      <Text style={styles.emptyTitle}>No followers yet</Text>
      <Text style={styles.emptySubtitle}>
        When people follow {username}, they'll appear here
      </Text>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingState}>
      <ActivityIndicator size='large' color={THEME.colors.primary} />
      <Text style={styles.loadingText}>Loading followers...</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle='light-content'
        backgroundColor={THEME.colors.background}
      />

      {/* Header */}
      <LinearGradient colors={THEME.gradients.card} style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace(backTo as RelativePathString)}
          style={styles.backButton}
        >
          <Ionicons name='arrow-back' size={24} color={THEME.colors.text} />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          {image && (
            <Image source={{ uri: image }} style={styles.headerAvatar} />
          )}
          <View style={styles.headerText}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {username}
            </Text>
            <Text style={styles.headerSubtitle}>
              {followersCount} followers
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Content */}
      {loading ? (
        renderLoadingState()
      ) : (
        <FlatList
          data={followers}
          keyExtractor={(item) => item.id}
          renderItem={renderFollowerItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={THEME.colors.primary}
              colors={[THEME.colors.primary]}
            />
          }
          onEndReached={() => {
            if (!loadingMore && hasMore) {
              fetchFollowers(true);
            }
          }}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size='small' color={THEME.colors.primary} />
                <Text style={styles.loadMoreText}>Loading more...</Text>
              </View>
            ) : null
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    color: THEME.colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: THEME.colors.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  followerItem: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
  },
  followerGradient: {
    borderRadius: 16,
    padding: 1,
  },
  followerContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: THEME.colors.cardBackground,
    borderRadius: 15,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    backgroundColor: THEME.colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: THEME.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: THEME.colors.cardBackground,
  },
  userInfo: {
    flex: 1,
    marginRight: 12,
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  username: {
    color: THEME.colors.text,
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  followersText: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    marginLeft: 8,
  },
  bio: {
    color: THEME.colors.textMuted,
    fontSize: 14,
    lineHeight: 18,
  },
  separator: {
    height: 8,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyTitle: {
    color: THEME.colors.text,
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
  },
  emptySubtitle: {
    color: THEME.colors.textMuted,
    fontSize: 16,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 32,
    lineHeight: 22,
  },
  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  loadingText: {
    color: THEME.colors.textMuted,
    fontSize: 16,
    marginTop: 16,
  },
  loadMoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  loadMoreText: {
    color: THEME.colors.textMuted,
    fontSize: 14,
    marginLeft: 8,
  },
});
