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
  TouchableWithoutFeedback,
} from "react-native";
import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthToken } from "@/hook/clerk/useFetchjwtToken";
import { Modal } from "react-native";

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

const ActiveDebateModal = ({ visible, onClose }) => {
  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType='fade'
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContainer}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                hitSlop={{ top: 15, right: 15, bottom: 15, left: 15 }}
              >
                <Ionicons
                  name='close-circle'
                  size={24}
                  color={THEME.colors.textMuted}
                />
              </TouchableOpacity>

              <View style={styles.contentContainer}>
                <Text style={styles.title}>Debate Room Still Active</Text>

                <Text style={styles.message}>
                  Your previous debate room is still active. Please wait until
                  it finishes before creating a new one.
                </Text>

                <TouchableOpacity
                  style={styles.button}
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
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
  const [createRoomLoading, setCreateRoomLoading] = useState(false);
  const [showNotEligible, setShowNotEligible] = useState(false);
  const [activeTab, setActiveTab] = useState("active"); // Add state for active tab
  const router = useRouter();
  const [token, refreshToken] = useAuthToken();
  const retryCount = useRef(0);
  const maxRetries = 3;

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Add a debug console log for token changes
  useEffect(() => {
    console.log("Token changed or component mounted. Token exists:", !!token);
  }, [token]);

  // Set up cleanup when component unmounts
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
  }, [token]);

  const getCreateRoomEligibility = useCallback(async () => {
    // Don't attempt to fetch if token isn't available
    if (!token) {
      console.log("Token not available yet, skipping fetch");
      return;
    }

    setFetchError(null);

    try {
      setCreateRoomLoading(true);
      console.log("Checking create room eligibility with token");
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BASE_URL}/debate-room/get-user-debate-create-eligible`,
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
          refreshToken();
          return;
        }

        const errorText = await response.text();
        throw new Error(`API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log("Eligibility check response:", data);

      if (data && data.data == true) {
        router.push("/(create)/screen/screen");
      } else {
        // User is not eligible, show modal
        setShowNotEligible(true);
      }
    } catch (error) {
      console.error("Failed to check eligibility:", error);
      Alert.alert("Error", "Unable to check if you can create a debate room.");
    } finally {
      setCreateRoomLoading(false);
    }
  }, [token, router, refreshToken]);

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
            refreshToken();
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
        console.log("Fetched debate hiii rooms:", data.data);

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
    [token, refreshToken]
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

  // Filter rooms based on active tab
  const filteredRooms = useMemo(() => {
    if (!rooms || rooms.length === 0) return [];

    return rooms.filter((item) => {
      if (!item || !item.debateRoom) return false;

      const debate = item.debateRoom;
      const creationDate = new Date(debate.createdAt);
      const endDate = new Date(
        creationDate.getTime() + debate.duration * 60 * 60 * 1000
      );
      const now = new Date();
      const isEnded = now > endDate;
      const isCreator = debate.userId === token; // Assuming userId on debate matches token

      switch (activeTab) {
        case "active":
          return !isEnded;
        case "ended":
          return isEnded;
        case "mine":
          return isCreator;
        default:
          return true;
      }
    });
  }, [rooms, activeTab, token]);

  const renderDebateRoom = ({ item }) => {
    if (!item || !item.debateRoom) {
      console.warn("Invalid room item:", item);
      return null;
    }

    const joinedUsers = item.joinedUsers;
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
                {joinedUsers || 0} joined
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Tab rendering component
  const TabBar = () => (
    <View style={styles.tabBar}>
      {["active", "ended", "mine"].map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tab, activeTab === tab && styles.activeTab]}
          onPress={() => setActiveTab(tab)}
        >
          <Text
            style={[styles.tabText, activeTab === tab && styles.activeTabText]}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

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
        <TabBar />
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
          onPress={getCreateRoomEligibility}
          disabled={createRoomLoading}
        >
          {createRoomLoading ? (
            <ActivityIndicator size='small' color={THEME.colors.primary} />
          ) : (
            <Ionicons
              name='add-circle'
              size={24}
              color={THEME.colors.primary}
            />
          )}
        </TouchableOpacity>
      </View>

      <TabBar />

      {/* Modal for when user is not eligible to create a room */}
      <ActiveDebateModal
        visible={showNotEligible}
        onClose={() => setShowNotEligible(false)}
      />

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
      ) : filteredRooms.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name='chatbubbles-outline'
            size={64}
            color={THEME.colors.textMuted}
          />
          <Text style={styles.emptyText}>
            No {activeTab} debate rooms found
          </Text>
          <Text style={styles.emptySubtext}>
            {activeTab === "mine"
              ? "Create a debate to see rooms here"
              : activeTab === "active"
              ? "Join a debate to see active rooms"
              : "Participate in debates to see ended rooms"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredRooms}
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
    backgroundColor: THEME.colors.background,
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
    color: THEME.colors.text,
  },
  newDebateButton: {
    padding: 4,
  },
  // Tab bar styles
  tabBar: {
    flexDirection: "row",
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: THEME.colors.backgroundDarker,
    padding: 4,
    justifyContent: "space-between",
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: THEME.colors.primary + "22",
    borderWidth: 1,
    borderColor: THEME.colors.primary + "55",
  },
  tabText: {
    color: THEME.colors.textMuted,
    fontWeight: "500",
    fontSize: 14,
  },
  activeTabText: {
    color: THEME.colors.primary,
    fontWeight: "600",
  },
  listContainer: {
    paddingBottom: 16,
  },
  debateCard: {
    flexDirection: "row",
    backgroundColor: THEME.colors.backgroundDarker,
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    elevation: 2,
    shadowColor: THEME.colors.primary,
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
    color: THEME.colors.text,
    marginBottom: 4,
  },
  debateDescription: {
    fontSize: 14,
    color: THEME.colors.textMuted,
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
    color: THEME.colors.primary,
  },
  usersCount: {
    flexDirection: "row",
    alignItems: "center",
  },
  usersCountText: {
    fontSize: 12,
    marginLeft: 4,
    color: THEME.colors.textMuted,
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
    color: THEME.colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: THEME.colors.textMuted,
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
    color: THEME.colors.text,
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
    borderColor: THEME.colors.primary,
  },
  retryButtonText: {
    color: THEME.colors.primary,
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
  // Modal styles
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContainer: {
    width: "80%",
    backgroundColor: THEME.colors.backgroundDarker,
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: THEME.colors.primary + "55",
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 1,
  },
  contentContainer: {
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: THEME.colors.text,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    color: THEME.colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  button: {
    backgroundColor: THEME.colors.primary + "33",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.colors.primary,
    marginTop: 8,
  },
  buttonText: {
    color: THEME.colors.primary,
    fontWeight: "600",
    fontSize: 16,
  },
});

export default Rooms;
