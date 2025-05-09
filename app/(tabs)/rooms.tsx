import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  InteractionManager,
  Animated,
} from "react-native";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthToken } from "@/hook/clerk/useFetchjwtToken";

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

// Skeleton component for debate room card
const SkeletonDebateCard = () => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulseTiming = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulseTiming.start();

    return () => pulseTiming.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.debateCard}>
      <Animated.View style={[styles.skeletonImage, { opacity: pulseAnim }]} />
      <View style={styles.debateInfo}>
        <Animated.View style={[styles.skeletonTitle, { opacity: pulseAnim }]} />
        <Animated.View
          style={[styles.skeletonDescription, { opacity: pulseAnim }]}
        />
        <View style={styles.debateStats}>
          <Animated.View
            style={[styles.skeletonTime, { opacity: pulseAnim }]}
          />
          <Animated.View
            style={[styles.skeletonUsers, { opacity: pulseAnim }]}
          />
        </View>
      </View>
    </View>
  );
};

const SkeletonLoader = () => {
  return (
    <View style={styles.listContainer}>
      {[...Array(4)].map((_, index) => (
        <SkeletonDebateCard key={`skeleton-${index}`} />
      ))}
    </View>
  );
};

const Rooms = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const router = useRouter();
  const [token, refreshToken] = useAuthToken();
  const retryCount = useRef(0);
  const maxRetries = 3;

  // Add a debug console log for token changes
  useEffect(() => {
    console.log("Token changed or component mounted. Token exists:", !!token);
  }, [token]);

  // Fetch rooms after interactions are complete (layout, animations) to improve performance
  useEffect(() => {
    if (token) {
      const task = InteractionManager.runAfterInteractions(() => {
        if (isMountedRef.current && rooms.length === 0 && !refreshing) {
          console.log("Initial fetch after interactions complete");
          fetchDebateRooms();
        }
      });

      return () => task.cancel();
    }
  }, []);

  const fetchDebateRooms = useCallback(
    async (isRetry = false) => {
      // Don't attempt to fetch if token isn't available
      if (!token) {
        console.log("Token not available yet, skipping fetch");
        return;
      }

      if (!isRetry) {
        setFetchError(null);
      }

      try {
        console.log("Fetching debate rooms with token");
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_BASE_URL}/debate-room/get-user-participated-rooms`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            console.log("Token expired, refreshing...");
            // Instead of calling refreshToken which may trigger useEffect again
            // Just set an error and let the user retry
            setFetchError("Authentication expired. Please try again.");
            return;
          }

          // Handle 404 specifically - retry the request if under max retries
          if (response.status === 404 && retryCount.current < maxRetries) {
            retryCount.current += 1;
            console.log(
              `404 error, retrying (${retryCount.current}/${maxRetries})...`
            );

            // Exponential backoff for retries
            const backoffDelay = Math.min(
              1000 * Math.pow(2, retryCount.current - 1),
              8000
            );

            setTimeout(() => {
              if (isMountedRef.current) {
                fetchDebateRooms(true);
              }
            }, backoffDelay);
            return;
          }

          const errorText = await response.text();
          throw new Error(`API error ${response.status}: ${errorText}`);
        }

        // Reset retry count on success
        retryCount.current = 0;

        const data = await response.json();
        console.log("Fetched debate rooms:", data);

        if (data && data.data) {
          setRooms(data.data);
        } else {
          console.warn("Unexpected API response format:", data);
          setRooms([]);
        }
      } catch (error) {
        console.error("Failed to fetch debate rooms:", error);
        setFetchError("Failed to load rooms. Pull down to retry.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  const onRefresh = useCallback(() => {
    retryCount.current = 0; // Reset retry count on manual refresh
    setRefreshing(true);
    // Use a manual fetch instead of depending on the callback
    if (token) {
      console.log("Manual refresh triggered");
      fetchDebateRooms();
    } else {
      setRefreshing(false);
    }
  }, [token, fetchDebateRooms]);

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = React.useRef(true);

  // Set up cleanup when component unmounts
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Skip if no token or already loading
    if (!token || loading === false) return;

    console.log("Token available, fetching debate rooms");
    fetchDebateRooms();
  }, [token]); // Only depend on token, not fetchDebateRooms

  const calculateTimeRemaining = (createdAt, durationHours) => {
    const creationDate = new Date(createdAt);
    const endDate = new Date(
      creationDate.getTime() + durationHours * 60 * 60 * 1000
    );
    const now = new Date();

    // If the debate has ended
    if (now > endDate) {
      return "Ended";
    }

    const remainingMs = endDate - now;
    const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
    const remainingMinutes = Math.floor(
      (remainingMs % (1000 * 60 * 60)) / (1000 * 60)
    );

    if (remainingHours > 0) {
      return `${remainingHours}h ${remainingMinutes}m left`;
    } else {
      return `${remainingMinutes}m left`;
    }
  };

  const navigateToDebate = (debate) => {
    if (!debate || !debate.id) {
      console.error("Invalid debate object:", debate);
      Alert.alert("Error", "Cannot open this debate room");
      return;
    }

    router.push({
      pathname: "/(chat-room)/screen",
      params: {
        clerkId: debate?.userId,
        debateId: debate.id,
        debateImage: debate.image || "",
      },
    });
  };

  const renderDebateRoom = ({ item }) => {
    if (!item || !item.debateRoom) {
      console.warn("Invalid room item:", item);
      return null;
    }

    const debate = item.debateRoom;
    const timeRemaining = calculateTimeRemaining(
      debate.createdAt,
      debate.duration
    );

    return (
      <TouchableOpacity
        style={styles.debateCard}
        onPress={() => navigateToDebate(debate)}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: debate?.image || "https://placekitten.com/120/120" }}
          style={styles.debateImage}
        />
        <View style={styles.debateInfo}>
          <Text style={styles.debateTitle} numberOfLines={1}>
            {debate.title || "Untitled Debate"}
          </Text>
          <Text style={styles.debateDescription} numberOfLines={2}>
            {debate.description || "No description available"}
          </Text>
          <View style={styles.debateStats}>
            <Text style={styles.timeRemaining}>{timeRemaining}</Text>
            <View style={styles.usersCount}>
              <Ionicons name='people' size={16} color={THEME.colors.primary} />
              <Text style={styles.usersCountText}>
                {debate?.joinedUsers || 0} joined
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Show loading skeleton when fetching initial data
  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Debate Rooms</Text>
          <View style={styles.newDebateButton}>
            <Ionicons
              name='add-circle'
              size={24}
              color={THEME.colors.primary}
            />
          </View>
        </View>
        <SkeletonLoader />
      </View>
    );
  }

  // Show authentication loading (only when token is missing)
  if (loading && !token) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size='large' color={THEME.colors.primary} />
        <Text style={styles.loadingText}>Preparing your debate rooms...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Debate Rooms</Text>
        <TouchableOpacity
          style={styles.newDebateButton}
          onPress={() => router.push("/(debate)/create-debate")}
        >
          <Ionicons name='add-circle' size={24} color={THEME.colors.primary} />
        </TouchableOpacity>
      </View>

      {fetchError ? (
        <View style={styles.errorContainer}>
          <Ionicons
            name='alert-circle-outline'
            size={48}
            color={THEME.colors.secondary}
          />
          <Text style={styles.errorText}>{fetchError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : rooms.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name='chatbubbles-outline'
            size={64}
            color={THEME.colors.textMuted}
          />
          <Text style={styles.emptyText}>No debate rooms yet</Text>
          <Text style={styles.emptySubtext}>
            Join or create a debate to get started
          </Text>
        </View>
      ) : (
        <FlatList
          data={rooms}
          renderItem={renderDebateRoom}
          keyExtractor={(item, index) => item.debateRoom?.id || `room-${index}`}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[THEME.colors.primary]}
              tintColor={THEME.colors.primary}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#080F12",
    paddingHorizontal: 16,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  newDebateButton: {
    padding: 4,
  },
  listContainer: {
    paddingBottom: 16,
  },
  debateCard: {
    flexDirection: "row",
    backgroundColor: "#03120F",
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    elevation: 2,
    shadowColor: "#00FF94",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#00FF9455",
  },
  debateImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 14,
    backgroundColor: "#121A1F", // Background for when image is loading
  },
  debateInfo: {
    flex: 1,
    justifyContent: "space-between",
  },
  debateTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  debateDescription: {
    fontSize: 14,
    color: "#8F9BB3",
    marginBottom: 8,
  },
  debateStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timeRemaining: {
    fontSize: 12,
    fontWeight: "600",
    color: "#00FF94",
  },
  usersCount: {
    flexDirection: "row",
    alignItems: "center",
  },
  usersCountText: {
    fontSize: 12,
    marginLeft: 4,
    color: "#8F9BB3",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 50,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#8F9BB3",
    marginTop: 8,
    textAlign: "center",
  },
  loadingText: {
    marginTop: 16,
    color: THEME.colors.textMuted,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 50,
  },
  errorText: {
    fontSize: 16,
    color: "#FFFFFF",
    marginTop: 16,
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#00FF9433",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#00FF94",
  },
  retryButtonText: {
    color: "#00FF94",
    fontWeight: "600",
  },
  // Skeleton styles
  skeletonImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 14,
    backgroundColor: "#121A1F",
  },
  skeletonTitle: {
    height: 16,
    width: "80%",
    backgroundColor: "#121A1F",
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonDescription: {
    height: 14,
    width: "95%",
    backgroundColor: "#121A1F",
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonTime: {
    height: 12,
    width: 80,
    backgroundColor: "#121A1F",
    borderRadius: 4,
  },
  skeletonUsers: {
    height: 12,
    width: 60,
    backgroundColor: "#121A1F",
    borderRadius: 4,
  },
});

export default Rooms;
