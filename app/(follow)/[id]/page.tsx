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
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  RelativePathString,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthToken } from "@/hook/clerk/useFetchjwtToken";
import { LinearGradient } from "expo-linear-gradient";
import { logError } from "@/utils/sentry/sentry";

const { width } = Dimensions.get("window");

type User = {
  id: string;
  username: string;
  image: string | null;
  about: string | null;
  followersCount?: number;
  isVerified?: boolean;
};

type UsersResponse = {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    items: User[];
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
    primary: ["#00FF94", "#00D4FF"] as const,
    secondary: ["#FF00E5", "#9333EA"] as const,
    card: ["rgba(15, 20, 25, 0.8)", "rgba(8, 15, 18, 0.9)"] as const,
  },
};

type TabType = "followers" | "following";

export default function FollowScreen() {
  const router = useRouter();
  const { 
    id, 
    backTo, 
    username, 
    followersCount, 
    followingsCount, 
    image,
    initialTab = "followers" 
  } = useLocalSearchParams<{
    id: string;
    username: string;
    followersCount: string;
    followingsCount: string;
    image: string;
    backTo: string;
    initialTab?: string;
  }>();

  const [token, refreshToken] = useAuthToken();
  const insets = useSafeAreaInsets();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>(initialTab as TabType || "followers");
  const [tabAnimation] = useState(new Animated.Value(initialTab === "following" ? 1 : 0));
  
  // Followers state
  const [followers, setFollowers] = useState<User[]>([]);
  const [followersCursor, setFollowersCursor] = useState<string | null>(null);
  const [followersLoading, setFollowersLoading] = useState(true);
  const [followersLoadingMore, setFollowersLoadingMore] = useState(false);
  const [followersRefreshing, setFollowersRefreshing] = useState(false);
  const [followersHasMore, setFollowersHasMore] = useState(true);
  
  // Following state
  const [followings, setFollowings] = useState<User[]>([]);
  const [followingsCursor, setFollowingsCursor] = useState<string | null>(null);
  const [followingsLoading, setFollowingsLoading] = useState(true);
  const [followingsLoadingMore, setFollowingsLoadingMore] = useState(false);
  const [followingsRefreshing, setFollowingsRefreshing] = useState(false);
  const [followingsHasMore, setFollowingsHasMore] = useState(true);

  const fetchFollowers = useCallback(
    async (loadMore = false, retry = false, refresh = false) => {
      if (!token || !id) return;

      try {
        if (refresh) {
          setFollowersRefreshing(true);
        } else if (loadMore) {
          setFollowersLoadingMore(true);
        } else {
          setFollowersLoading(true);
        }

        const currentCursor = refresh ? null : followersCursor;
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

        const data: UsersResponse = await res.json();
        if (!res.ok)
          throw new Error(data.message || "Failed to fetch followers");

        if (refresh) {
          setFollowers(data.data.items);
          setFollowersCursor(data.data.nextCursor ?? null);
        } else {
          setFollowers((prev) =>
            loadMore ? [...prev, ...data.data.items] : data.data.items
          );
          setFollowersCursor(data.data.nextCursor ?? null);
        }

        setFollowersHasMore(!!data.data.nextCursor);
      } catch (err: any) {
        console.error("Failed fetching followers", err);
        logError(err, {
          context: "FollowScreen.fetchFollowers",
          userId: id ? "[REDACTED_USER_ID]" : "undefined",
          loadMore,
          refresh,
        });
        Alert.alert("Error", "Could not load followers. Please try again.");
      } finally {
        setFollowersLoading(false);
        setFollowersLoadingMore(false);
        setFollowersRefreshing(false);
      }
    },
    [id, followersCursor, token, refreshToken]
  );

  const fetchFollowings = useCallback(
    async (loadMore = false, retry = false, refresh = false) => {
      if (!token || !id) return;

      try {
        if (refresh) {
          setFollowingsRefreshing(true);
        } else if (loadMore) {
          setFollowingsLoadingMore(true);
        } else {
          setFollowingsLoading(true);
        }

        const currentCursor = refresh ? null : followingsCursor;
        const res = await fetch(
          `${process.env.EXPO_PUBLIC_BASE_URL}/user/followings/${id}?limit=20${
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
          return fetchFollowings(loadMore, true, refresh);
        }

        const data: UsersResponse = await res.json();
        if (!res.ok)
          throw new Error(data.message || "Failed to fetch followings");

        if (refresh) {
          setFollowings(data.data.items);
          setFollowingsCursor(data.data.nextCursor ?? null);
        } else {
          setFollowings((prev) =>
            loadMore ? [...prev, ...data.data.items] : data.data.items
          );
          setFollowingsCursor(data.data.nextCursor ?? null);
        }

        setFollowingsHasMore(!!data.data.nextCursor);
      } catch (err: any) {
        console.error("Failed fetching followings", err);
        logError(err, {
          context: "FollowScreen.fetchFollowings",
          userId: id ? "[REDACTED_USER_ID]" : "undefined",
          loadMore,
          refresh,
        });
        Alert.alert("Error", "Could not load followings. Please try again.");
      } finally {
        setFollowingsLoading(false);
        setFollowingsLoadingMore(false);
        setFollowingsRefreshing(false);
      }
    },
    [id, followingsCursor, token, refreshToken]
  );

  useEffect(() => {
    if (activeTab === "followers") {
      fetchFollowers();
    } else {
      fetchFollowings();
    }
  }, [id, token, activeTab]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    Animated.spring(tabAnimation, {
      toValue: tab === "following" ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
    }).start();
  };

  const onRefreshFollowers = useCallback(() => {
    setFollowersCursor(null);
    fetchFollowers(false, false, true);
  }, [fetchFollowers]);

  const onRefreshFollowings = useCallback(() => {
    setFollowingsCursor(null);
    fetchFollowings(false, false, true);
  }, [fetchFollowings]);

  const renderUserItem = ({ item, index }: { item: User; index: number }) => {
    return (
      <TouchableOpacity
        style={[
          styles.gridItem,
          index % 2 === 0 ? styles.gridItemLeft : styles.gridItemRight,
        ]}
        onPress={() => router.push(`/(tabs)/${item.id}/page`)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={THEME.gradients.card}
          style={styles.gridGradient}
        >
          <View style={styles.gridCardContent}>
            <View style={styles.avatarContainer}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.gridAvatar} />
              ) : (
                <View style={[styles.gridAvatar, styles.avatarPlaceholder]}>
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
                    size={9}
                    color={THEME.colors.background}
                  />
                </View>
              )}
            </View>

            <Text 
              style={styles.gridUsername} 
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.username}
            </Text>

            {item.about ? (
              <Text 
                style={styles.gridBio} 
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {item.about}
              </Text>
            ) : null}

            {item.followersCount !== undefined && (
              <View style={styles.gridFollowersContainer}>
                <Ionicons
                  name='people'
                  size={11}
                  color={THEME.colors.textSecondary}
                />
                <Text style={styles.gridFollowersText}>
                  {item.followersCount >= 1000
                    ? `${(item.followersCount / 1000).toFixed(1)}k`
                    : item.followersCount}
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = (type: TabType) => (
    <View style={styles.emptyState}>
      <Ionicons
        name='people-outline'
        size={64}
        color={THEME.colors.textMuted}
      />
      <Text style={styles.emptyTitle}>
        {type === "followers" ? "No followers yet" : "Not following anyone yet"}
      </Text>
      <Text style={styles.emptySubtitle}>
        {type === "followers"
          ? `When people follow ${username}, they'll appear here`
          : `When ${username} follows people, they'll appear here`}
      </Text>
    </View>
  );

  const renderLoadingState = (type: TabType) => (
    <View style={styles.loadingState}>
      <ActivityIndicator size='large' color={THEME.colors.primary} />
      <Text style={styles.loadingText}>
        Loading {type}...
      </Text>
    </View>
  );

  const tabIndicatorPosition = tabAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width / 2],
  });

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle='light-content'
        backgroundColor={THEME.colors.background}
      />

      {/* Header */}
      <LinearGradient 
        colors={THEME.gradients.card} 
        style={[styles.header, { paddingTop: insets.top }]}
      >
        <TouchableOpacity
          onPress={() => {
            if (backTo) {
              router.replace(backTo as RelativePathString);
            } else {
              router.back();
            }
          }}
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
              {followersCount} followers · {followingsCount} following
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => handleTabChange("followers")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "followers" && styles.tabTextActive,
            ]}
          >
            Followers
          </Text>
          <Text
            style={[
              styles.tabCount,
              activeTab === "followers" && styles.tabCountActive,
            ]}
          >
            {followersCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => handleTabChange("following")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "following" && styles.tabTextActive,
            ]}
          >
            Following
          </Text>
          <Text
            style={[
              styles.tabCount,
              activeTab === "following" && styles.tabCountActive,
            ]}
          >
            {followingsCount}
          </Text>
        </TouchableOpacity>

        <Animated.View
          style={[
            styles.tabIndicator,
            {
              transform: [{ translateX: tabIndicatorPosition }],
            },
          ]}
        />
      </View>

      {/* Content */}
      {activeTab === "followers" ? (
        followersLoading ? (
          renderLoadingState("followers")
        ) : (
          <FlatList
            data={followers}
            keyExtractor={(item) => item.id}
            renderItem={renderUserItem}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={followersRefreshing}
                onRefresh={onRefreshFollowers}
                tintColor={THEME.colors.primary}
                colors={[THEME.colors.primary]}
              />
            }
            onEndReached={() => {
              if (!followersLoadingMore && followersHasMore) {
                fetchFollowers(true);
              }
            }}
            onEndReachedThreshold={0.3}
            ListEmptyComponent={() => renderEmptyState("followers")}
            ListFooterComponent={
              followersLoadingMore ? (
                <View style={styles.loadMoreContainer}>
                  <ActivityIndicator size='small' color={THEME.colors.primary} />
                  <Text style={styles.loadMoreText}>Loading more...</Text>
                </View>
              ) : null
            }
          />
        )
      ) : (
        followingsLoading ? (
          renderLoadingState("following")
        ) : (
          <FlatList
            data={followings}
            keyExtractor={(item) => item.id}
            renderItem={renderUserItem}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={followingsRefreshing}
                onRefresh={onRefreshFollowings}
                tintColor={THEME.colors.primary}
                colors={[THEME.colors.primary]}
              />
            }
            onEndReached={() => {
              if (!followingsLoadingMore && followingsHasMore) {
                fetchFollowings(true);
              }
            }}
            onEndReachedThreshold={0.3}
            ListEmptyComponent={() => renderEmptyState("following")}
            ListFooterComponent={
              followingsLoadingMore ? (
                <View style={styles.loadMoreContainer}>
                  <ActivityIndicator size='small' color={THEME.colors.primary} />
                  <Text style={styles.loadMoreText}>Loading more...</Text>
                </View>
              ) : null
            }
          />
        )
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
    paddingTop: 0,
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
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    position: "relative",
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: {
    color: THEME.colors.textMuted,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  tabTextActive: {
    color: THEME.colors.text,
  },
  tabCount: {
    color: THEME.colors.textSecondary,
    fontSize: 13,
    fontWeight: "500",
  },
  tabCountActive: {
    color: THEME.colors.primary,
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    width: width / 2,
    height: 3,
    backgroundColor: THEME.colors.primary,
  },
  // Grid Layout Styles
  gridContent: {
    padding: 10,
    paddingBottom: 40,
  },
  gridRow: {
    justifyContent: "space-between",
    marginBottom: 10,
  },
  gridItem: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    height: 160,
  },
  gridItemLeft: {
    marginRight: 5,
  },
  gridItemRight: {
    marginLeft: 5,
  },
  gridGradient: {
    borderRadius: 16,
    padding: 1,
    height: "100%",
  },
  gridCardContent: {
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    backgroundColor: THEME.colors.cardBackground,
    borderRadius: 15,
    height: "100%",
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 6,
  },
  gridAvatar: {
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
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: THEME.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: THEME.colors.cardBackground,
  },
  gridUsername: {
    color: THEME.colors.text,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 3,
    paddingHorizontal: 4,
  },
  gridBio: {
    color: THEME.colors.textMuted,
    fontSize: 10,
    lineHeight: 13,
    textAlign: "center",
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  gridFollowersContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: THEME.colors.border,
    borderRadius: 8,
  },
  gridFollowersText: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 3,
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
    marginTop: 8,
  },
  loadMoreText: {
    color: THEME.colors.textMuted,
    fontSize: 14,
    marginLeft: 8,
  },
});

