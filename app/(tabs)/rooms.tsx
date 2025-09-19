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
import TabScreenWrapper from "./components/TabScreenWrapper";
import { logError } from "@/utils/sentry/sentry"; // Added Sentry import
import { trackDebateJoined } from "@/lib/posthog/events";

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
  const [activeTab, setActiveTab] = useState("active");
  const [joiningRoomId, setJoiningRoomId] = useState(null);
  const router = useRouter();
  const [token, refreshToken] = useAuthToken();
  const retryCount = useRef(0);
  const maxRetries = 3;

  const [tabDataCache, setTabDataCache] = useState<{
    [key: string]: any;
  }>({
    active: null,
    ended: null,
    mine: null,
  });

  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (token) {
      const task = InteractionManager.runAfterInteractions(() => {
        if (isMountedRef.current && !tabDataCache[activeTab] && !refreshing) {
          fetchDebateRooms();
        }
      });
      return () => task.cancel();
    }
  }, [token]);

  useEffect(() => {
    if (token && !tabDataCache[activeTab]) {
      fetchDebateRooms();
    } else if (token && tabDataCache[activeTab]) {
      setRooms(tabDataCache[activeTab]);
      setLoading(false);
    }
  }, [activeTab, token]);

  const handleCreateDebate = useCallback(() => {
    router.push("/(create)/screen/screen");
  }, [router]);

  const joinDebateRoom = useCallback(
    async (roomId) => {
      if (!token || !roomId) return;
      setJoiningRoomId(roomId);
      try {
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_BASE_URL}/debate-participant`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ roomId }),
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            refreshToken();
            return;
          }
          const errorText = await response.text();
          throw new Error(`API error ${response.status}: ${errorText}`);
        }

        // Clear cache for 'mine' tab to refresh data
        setTabDataCache((prev) => ({ ...prev, mine: null }));

        // If we're on 'mine' tab, refresh the data
        if (activeTab === "mine") {
          fetchDebateRooms(false, true);
        }

        // Find the debate room data to navigate
        const debateToJoin = rooms.find((room) => room.id === roomId);

        if (debateToJoin) {
          // Navigate to the chat room instead of showing alert
          router.push({
            pathname: "/(chat-room)/screen",
            params: {
              clerkId: debateToJoin?.userId || debateToJoin?.creator_id,
              debateId: debateToJoin.id,
              debateImage: debateToJoin.image || "",
            },
          });
        }
      } catch (error: any) {
        console.error("Failed to join debate room:", error);
        // Log error to Sentry
        logError(error, {
          context: "Rooms.joinDebateRoom",
          roomId: roomId ? "[REDACTED_ROOM_ID]" : "undefined",
          activeTab,
        });
        Alert.alert("Error", "Failed to join the debate room.");
      } finally {
        setJoiningRoomId(null);
      }
    },
    [token, refreshToken, activeTab, rooms, router]
  );

  const fetchDebateRooms = useCallback(
    async (isRetry = false, forceRefresh = false) => {
      if (!token) return;

      if (!forceRefresh && tabDataCache[activeTab] && !isRetry) {
        setRooms(tabDataCache[activeTab]);
        setLoading(false);
        return;
      }

      let route;
      if (activeTab === "mine") {
        route = "get-user-created-rooms";
      } else if (activeTab === "active") {
        route = "get-user-participated-rooms";
      } else {
        route = "get-user-participated-rooms?status=ended";
      }

      if (!isRetry) {
        setFetchError(null);
        setLoading(true);
      }

      try {
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_BASE_URL}/debate-room/${route}`,
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
            refreshToken();
            fetchDebateRooms();
            return;
          }

          if (response.status === 404 && retryCount.current < maxRetries) {
            retryCount.current += 1;
            const backoffDelay = Math.min(
              1000 * Math.pow(2, retryCount.current - 1),
              8000
            );
            setTimeout(() => {
              if (isMountedRef.current) {
                fetchDebateRooms(true, forceRefresh);
              }
            }, backoffDelay);
            return;
          }

          const errorText = await response.text();
          throw new Error(`API error ${response.status}: ${errorText}`);
        }

        retryCount.current = 0;
        const data = await response.json();
        const roomsData =
          activeTab === "mine" ? data?.data || [] : data?.data || [];

        setTabDataCache((prev) => ({ ...prev, [activeTab]: roomsData }));
        setRooms(roomsData);
      } catch (error: any) {
        console.error("Failed to fetch debate rooms:", error);
        // Log error to Sentry
        logError(error, {
          context: "Rooms.fetchDebateRooms",
          activeTab,
          route,
        });
        setFetchError("Failed to load rooms. Pull down to retry.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, refreshToken, activeTab, tabDataCache]
  );

  const onRefresh = useCallback(() => {
    retryCount.current = 0;
    setRefreshing(true);
    setTabDataCache((prev) => ({ ...prev, [activeTab]: null }));

    if (token) {
      fetchDebateRooms(false, true);
    } else {
      setRefreshing(false);
    }
  }, [token, activeTab, fetchDebateRooms]);

  const handleTabChange = useCallback(
    (tab) => {
      if (tab === activeTab) return;

      setRooms([]);
      setActiveTab(tab);

      if (!tabDataCache[tab]) {
        setLoading(true);
        setFetchError(null);
      }
    },
    [activeTab, tabDataCache]
  );

  useEffect(() => {
    if (!token) return;
    if (rooms.length === 0 && !tabDataCache[activeTab]) {
      fetchDebateRooms();
    }
  }, [token]);

  const calculateTimeRemaining = (createdAt, durationHours) => {
    const creationDate = new Date(createdAt);
    const endDate = new Date(
      creationDate.getTime() + durationHours * 60 * 60 * 1000
    );
    const now = new Date();

    if (now > endDate) return "Ended";

    const remainingMs = endDate - now;
    const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
    const remainingMinutes = Math.floor(
      (remainingMs % (1000 * 60 * 60)) / (1000 * 60)
    );

    return remainingHours > 0
      ? `${remainingHours}h ${remainingMinutes}m left`
      : `${remainingMinutes}m left`;
  };

  const navigateToDebate = (debate, time, isJoined) => {
    if (!debate || !debate.id) {
      Alert.alert("Error", "Cannot open this debate room");
      return;
    }

    // If it's a 'mine' debate that hasn't been joined yet, join first
    if (activeTab === "mine" && !isJoined) {
      console.log(time);
      if (time == "Ended") {
        Alert.alert("Debate is Closed Cant join the debate");
        return;
      }
      joinDebateRoom(debate.id);
      return;
    }

    router.push({
      pathname: "/(chat-room)/screen",
      params: {
        clerkId: debate?.userId || debate?.creator_id,
        debateId: debate.id,
        debateImage: debate.image || "",
      },
    });
  };

  const processedRoomsData = useMemo(() => {
    if (!rooms || !Array.isArray(rooms)) return [];

    if (activeTab === "mine") {
      const processedData = [];
      const joinedRooms = rooms.filter((room) => room.joined === true);
      const notJoinedRooms = rooms.filter((room) => room.joined === false);

      if (joinedRooms.length > 0) {
        processedData.push({
          type: "section-header",
          id: "joined-header",
          title: "Joined Debates",
          subtitle: `${joinedRooms.length} debate${
            joinedRooms.length !== 1 ? "s" : ""
          }`,
          icon: "checkmark-circle",
        });

        joinedRooms.forEach((room) => {
          processedData.push({
            ...room,
            type: "room",
            isJoined: true,
            debateRoom: room,
          });
        });
      }

      if (notJoinedRooms.length > 0) {
        processedData.push({
          type: "section-header",
          id: "not-joined-header",
          title: "Not Joined",
          subtitle: `${notJoinedRooms.length} debate${
            notJoinedRooms.length !== 1 ? "s" : ""
          } waiting for you`,
          icon: "time-outline",
        });

        notJoinedRooms.forEach((room) => {
          processedData.push({
            ...room,
            type: "room",
            isJoined: false,
            debateRoom: room,
          });
        });
      }

      return processedData;
    }

    return rooms.map((item) => ({ ...item, type: "room" }));
  }, [rooms, activeTab]);

  const renderSectionHeader = ({ item }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderContent}>
        <View style={styles.sectionIconContainer}>
          <Ionicons
            name={item.icon}
            size={20}
            color={
              item.isJoined !== false
                ? THEME.colors.success
                : THEME.colors.warning
            }
          />
        </View>
        <View style={styles.sectionTextContainer}>
          <Text style={styles.sectionTitle}>{item.title}</Text>
          <Text style={styles.sectionSubtitle}>{item.subtitle}</Text>
        </View>
      </View>
      <View style={styles.sectionDivider} />
    </View>
  );

  const renderDebateRoom = ({ item }) => {
    if (item.type === "section-header") {
      return renderSectionHeader({ item });
    }

    if (!item || !item.debateRoom) return null;

    const debate = item.debateRoom;
    const joinedUsers = item.joinedUsers || debate.joinedUsers || 0;
    const timeRemaining = calculateTimeRemaining(
      debate.createdAt,
      debate.duration
    );
    const isJoined = activeTab === "mine" && item.isJoined;
    const isNotJoined = activeTab === "mine" && !item.isJoined;
    const isJoiningThis = joiningRoomId === debate.id;

    return (
      <TouchableOpacity
        style={[
          styles.debateCard,
          isJoined && styles.joinedCard,
          isNotJoined && styles.notJoinedCard,
        ]}
        onPress={() => navigateToDebate(debate, timeRemaining, isJoined)}
        activeOpacity={0.7}
        disabled={isJoiningThis}
      >
        {isJoined && <View style={styles.glowEffect} />}

        <Image
          source={{ uri: debate?.image || "https://placekitten.com/120/120  " }}
          style={[
            styles.debateImage,
            isJoined && styles.joinedImage,
            isNotJoined && styles.notJoinedImage,
          ]}
        />

        <View style={styles.debateInfo}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.debateTitle, isJoined && { color: "#FFFFFF" }]}
              numberOfLines={1}
            >
              {debate.title || "Untitled Debate"}
            </Text>

            {activeTab === "mine" && (
              <View
                style={[
                  styles.statusBadge,
                  item.isJoined ? styles.joinedBadge : styles.notJoinedBadge,
                ]}
              >
                {isJoiningThis ? (
                  <ActivityIndicator
                    size='small'
                    color={THEME.colors.primary}
                  />
                ) : (
                  <Text
                    style={[
                      styles.statusText,
                      item.isJoined ? styles.joinedText : styles.notJoinedText,
                    ]}
                  >
                    {item.isJoined ? "Joined" : "Join Now"}
                  </Text>
                )}
              </View>
            )}
          </View>

          <Text
            style={[styles.debateDescription, isNotJoined && { opacity: 0.7 }]}
            numberOfLines={2}
          >
            {debate.description || "No description available"}
          </Text>

          <View style={styles.debateStats}>
            <Text
              style={[styles.timeRemaining, isJoined && { fontWeight: "700" }]}
            >
              {timeRemaining}
            </Text>

            <View style={styles.usersCount}>
              <Ionicons
                name='people'
                size={16}
                color={isJoined ? THEME.colors.primary : THEME.colors.textMuted}
              />
              <Text
                style={[
                  styles.usersCountText,
                  isJoined && {
                    color: THEME.colors.primary,
                    fontWeight: "600",
                  },
                ]}
              >
                {joinedUsers} joined
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const TabBar = () => (
    <View style={styles.tabBar}>
      {["active", "ended", "mine"].map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tab, activeTab === tab && styles.activeTab]}
          onPress={() => handleTabChange(tab)}
          activeOpacity={0.7}
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

  if (loading && !refreshing && !tabDataCache[activeTab]) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Rooms</Text>
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

  if (loading && !token) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size='large' color={THEME.colors.primary} />
        <Text style={styles.loadingText}>Preparing your debate rooms...</Text>
      </View>
    );
  }

  return (
    <TabScreenWrapper>
      <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Rooms</Text>
        <TouchableOpacity
          style={styles.newDebateButton}
          onPress={handleCreateDebate}
        >
          <Ionicons
            name='add-circle'
            size={24}
            color={THEME.colors.primary}
          />
        </TouchableOpacity>
      </View>

      <TabBar />


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
      ) : processedRoomsData.length === 0 ? (
        <View className='flex-1 items-center justify-center px-6 py-12'>
          <Ionicons
            name='chatbubbles-outline'
            size={64}
            color={THEME.colors.textMuted}
          />
          <Text className='mt-6 text-xl text-gray-500'>
            No {activeTab} debate rooms found
          </Text>
          <Text className='mt-2 text-base text-gray-400 text-center'>
            {activeTab === "mine"
              ? "Create a debate to see rooms here"
              : activeTab === "active"
              ? "Join a debate to see active rooms"
              : "Participate in debates to see ended rooms"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={processedRoomsData}
          renderItem={renderDebateRoom}
          keyExtractor={(item, index) => {
            if (item.type === "section-header") return item.id;
            return item.debateRoom?.id || item.id || `room-${index}`;
          }}
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
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={8}
          getItemLayout={(data, index) => {
            const item = data[index];
            if (item && item.type === "section-header") {
              return { length: 60, offset: 60 * index, index };
            }
            return { length: 120, offset: 120 * index, index };
          }}
        />
      )}
      </View>
    </TabScreenWrapper>
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
    backgroundColor: "#f0f0f0", // light modern grey
    borderWidth: 1,
    borderColor: "#d0d0d0", // subtle grey border
    borderRadius: 8,
  },
  tabText: {
    color: "#6e6e6e", // soft muted grey text
    fontWeight: "500",
    fontSize: 14,
  },
  activeTabText: {
    color: "#000000", // solid black for emphasis
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
    borderColor: "#f0f0f0", // light modern grey border
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
    color: THEME.colors.textMuted,
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
    borderColor: "#f0f0f0", // light modern grey border,
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
  joinedCard: {
    borderColor: "#f0f0f0",
    backgroundColor: THEME.colors.background + "EE", // Slightly brighter
  },

  notJoinedCard: {
    borderColor: "#cccccc", // Soft red border
    backgroundColor: THEME.colors.background,
  },

  // Enhanced image styles
  joinedImage: {
    borderWidth: 2,
    shadowOffset: { width: 0, height: 2 },
  },

  notJoinedImage: {
    borderColor: "#FF6B6B33",
  },

  // Title row to accommodate status badge
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  // Status badges
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 8,
  },

  joinedBadge: {
    backgroundColor: THEME.colors.primary + "22",
    borderWidth: 1,
    borderColor: THEME.colors.primary + "55",
  },

  notJoinedBadge: {
    backgroundColor: "#FF6B6B22",
    borderWidth: 1,
    borderColor: "#FF6B6B55",
  },

  statusText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },

  joinedText: {
    color: "#FFFFFF",
  },

  notJoinedText: {
    color: "#FFFFFF",
  },

  // Join prompt arrow for not joined cards
  joinPrompt: {
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 8,
  },

  // Enhanced section headers
  sectionHeader: {
    marginBottom: 12,
    marginTop: 8,
  },

  sectionHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },

  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.primary + "22",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  sectionTextContainer: {
    flex: 1,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: THEME.colors.text,
    marginBottom: 2,
  },

  sectionSubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },

  sectionDivider: {
    height: 1,
    backgroundColor: THEME.colors.primary + "33",
    marginTop: 8,
    marginHorizontal: 4,
  },
});

export default Rooms;
