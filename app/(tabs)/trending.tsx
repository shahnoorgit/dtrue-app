import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
  InteractionManager,
  Dimensions,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuthToken } from "@/hook/clerk/useFetchjwtToken";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";

// Define theme as a constant outside the component to avoid recreation on re-render
const THEME = {
  colors: {
    primary: "#00FF94",
    secondary: "#FF00E5",
    background: "#080F12",
    backgroundDarker: "#03120F",
    text: "#FFFFFF",
    textMuted: "#8F9BB3",
  },
};

const { width } = Dimensions.get("window");

const TrendingDebatesPage = () => {
  const [debates, setDebates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [joiningDebateId, setJoiningDebateId] = useState(null);
  const [token, refreshToken] = useAuthToken();
  const { userId } = useAuth();
  const router = useRouter();

  const retryCount = useRef(0);
  const maxRetries = 3;
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (token) {
      const task = InteractionManager.runAfterInteractions(() => {
        if (isMountedRef.current) {
          fetchTrendingDebates();
        }
      });
      return () => task.cancel();
    }
  }, [token]);

  const fetchTrendingDebates = useCallback(async () => {
    if (!token) return;

    setFetchError(null);
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BASE_URL}/trending/debates`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status == 401) {
        refreshToken();
        fetchTrendingDebates();
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (isMountedRef.current) {
        if (data.success && data.data && data.data.debates) {
          setDebates(data.data.debates);
          retryCount.current = 0;
        } else {
          setFetchError("Invalid response format");
        }
      }
    } catch (error) {
      console.error("Error fetching trending debates:", error);
      if (isMountedRef.current) {
        setFetchError(error.message || "Failed to fetch debates");

        if (retryCount.current < maxRetries) {
          retryCount.current += 1;
          setTimeout(() => {
            if (isMountedRef.current) {
              fetchTrendingDebates();
            }
          }, 2000 * retryCount.current);
        }
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [token]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    retryCount.current = 0;
    fetchTrendingDebates();
  }, [fetchTrendingDebates]);

  const handleJoinDebate = useCallback(
    async (debate) => {
      if (!token || !debate) return;

      setJoiningDebateId(debate.id);

      try {
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_BASE_URL}/debate-participant`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ roomId: debate.id }),
          }
        );

        if (response.status === 401) {
          refreshToken();
          return;
        }

        if (response.ok) {
          if (response.status == 201) {
            console.log(debate.id, debate.image, userId, "Flaggerrrrrr");
            router.push({
              pathname: "/(chat-room)/screen",
              params: {
                clerkId: userId,
                debateId: debate.id,
                debateImage: debate.image || "",
              },
            });
          }
        } else {
          throw new Error("Failed to join debate");
        }
      } catch (error) {
        console.error("Error joining debate:", error);
        Alert.alert("Error", "Failed to join the debate. Please try again.");
      } finally {
        setJoiningDebateId(null);
      }
    },
    [token, router]
  );

  const openDebate = useCallback(async (debate) => {
    if (!debate) return;
    router.push({
      pathname: "/(chat-room)/screen",
      params: {
        clerkId: userId,
        debateId: debate.id,
        debateImage: debate.image || "",
      },
    });
  }, []);

  const getCategoryColor = (category) => {
    const colors = {
      SPORTS_AND_LEISURE: THEME.colors.primary,
      SOCIAL_ISSUES: THEME.colors.secondary,
      POLITICS: "#FF6B6B",
      TECHNOLOGY: "#4ECDC4",
      EDUCATION: "#45B7D1",
      HEALTH: "#96CEB4",
    };
    return colors[category] || THEME.colors.textMuted;
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const created = new Date(dateString);
    const diffInHours = Math.floor((now - created) / (1000 * 60 * 60));

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const renderDebateCard = ({ item, index }) => (
    <View style={styles.cardContainer}>
      <LinearGradient
        colors={[THEME.colors.backgroundDarker, THEME.colors.background]}
        style={styles.card}
      >
        {/* Trending Rank Badge */}
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>Rank {item.rank}</Text>
        </View>

        {/* Debate Image */}
        <Image source={{ uri: item.image }} style={styles.debateImage} />

        {/* Content */}
        <View style={styles.cardContent}>
          {/* Categories */}
          <View style={styles.categoriesContainer}>
            {item.categories.slice(0, 2).map((category, idx) => (
              <View
                key={idx}
                style={[
                  styles.categoryTag,
                  { backgroundColor: getCategoryColor(category) + "20" },
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    { color: getCategoryColor(category) },
                  ]}
                >
                  {category.replace("_", " ")}
                </Text>
              </View>
            ))}
          </View>

          {/* Title */}
          <Text style={styles.debateTitle} numberOfLines={2}>
            {item.title}
          </Text>

          {/* Description */}
          <Text style={styles.debateDescription} numberOfLines={3}>
            {item.description}
          </Text>

          {/* Creator Info */}
          <View style={styles.creatorContainer}>
            <Image
              source={{ uri: item.creator.image }}
              style={styles.creatorImage}
            />
            <View style={styles.creatorInfo}>
              <Text style={styles.creatorName}>{item.creator.name}</Text>
              <Text style={styles.creatorHandle}>@{item.creator.username}</Text>
            </View>
            <Text style={styles.timeAgo}>{formatTimeAgo(item.createdAt)}</Text>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Ionicons
                name='people'
                size={16}
                color={THEME.colors.textMuted}
              />
              <Text style={styles.statText}>{item.participantCount}</Text>
            </View>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              item.joined ? styles.viewButton : styles.joinButton,
            ]}
            onPress={() => {
              if (item.joined) {
                openDebate(item);
              } else {
                handleJoinDebate(item);
              }
            }}
            disabled={joiningDebateId === item.id}
          >
            {joiningDebateId === item.id ? (
              <ActivityIndicator size='small' color={THEME.colors.text} />
            ) : (
              <>
                <Ionicons
                  name={item.joined ? "eye" : "add-circle"}
                  size={20}
                  color={THEME.colors.text}
                />
                <Text style={styles.actionButtonText}>
                  {item.joined ? "VIEW DEBATE" : "JOIN NOW"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name='trending-up' size={64} color={THEME.colors.textMuted} />
      <Text style={styles.emptyStateTitle}>No Trending Debates</Text>
      <Text style={styles.emptyStateText}>
        Check back later for hot debates that are trending!
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorState}>
      <Ionicons name='alert-circle' size={64} color={THEME.colors.secondary} />
      <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
      <Text style={styles.errorText}>{fetchError}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color={THEME.colors.primary} />
        <Text style={styles.loadingText}>Loading trending debates...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[THEME.colors.backgroundDarker, THEME.colors.background]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Trending</Text>
        </View>
      </LinearGradient>

      {/* Content */}
      {fetchError && !loading ? (
        renderError()
      ) : (
        <FlatList
          data={debates}
          renderItem={renderDebateCard}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[THEME.colors.primary]}
              tintColor={THEME.colors.primary}
            />
          }
          ListEmptyComponent={!loading ? renderEmptyState : null}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    paddingBottom: 72,
    padding: 4,
  },
  header: {
    paddingVertical: 16,
    padding: 4,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: THEME.colors.text,
    marginLeft: 12,
  },
  headerRight: {
    padding: 8,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  cardContainer: {
    marginBottom: 20,
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "white",
  },
  rankBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    zIndex: 1,
    backgroundColor: "black",
    padding: 12,
    borderRadius: 20,
  },
  rankText: {
    color: THEME.colors.text,
    fontSize: 12,
    fontWeight: "bold",
  },
  debateImage: {
    width: "100%",
    height: 200,
    backgroundColor: THEME.colors.backgroundDarker,
  },
  cardContent: {
    padding: 16,
  },
  categoriesContainer: {
    flexDirection: "row",
    marginBottom: 12,
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  debateTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: THEME.colors.text,
    marginBottom: 8,
    lineHeight: 24,
  },
  debateDescription: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    lineHeight: 20,
    marginBottom: 16,
  },
  creatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  creatorImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  creatorInfo: {
    flex: 1,
  },
  creatorName: {
    fontSize: 14,
    fontWeight: "600",
    color: THEME.colors.text,
  },
  creatorHandle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  timeAgo: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  statsContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  statText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginLeft: 4,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    minHeight: 44,
  },
  joinButton: {
    backgroundColor: THEME.colors.primary,
  },
  viewButton: {
    backgroundColor: THEME.colors.backgroundDarker,
    borderWidth: 1,
    borderColor: THEME.colors.primary,
  },
  actionButtonText: {
    color: THEME.colors.text,
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: THEME.colors.background,
  },
  loadingText: {
    color: THEME.colors.textMuted,
    fontSize: 16,
    marginTop: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: THEME.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  errorState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: THEME.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: THEME.colors.text,
    fontSize: 14,
    fontWeight: "bold",
  },
});

export default TrendingDebatesPage;
