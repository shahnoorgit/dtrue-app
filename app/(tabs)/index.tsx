import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  RefreshControl,
  Pressable,
  Platform,
  Animated,
  Image,
  Modal,
  TouchableOpacity,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { cyberpunkTheme } from "@/constants/theme";
import DebateCard from "@/components/tabs/debate_card/DebateCard";
import FeedCardSkeleton from "@/components/tabs/debate_card/FeedCardSkeleton";
import { useAuth } from "@clerk/clerk-expo";
import { useAuthAxios } from "@/utils/axiosInstance";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { logError } from "@/utils/sentry/sentry";
import { trackDebateJoined, trackContentShared } from "@/lib/posthog/events";
import { useSimpleNetworkStatus } from "@/hook/useSimpleNetworkStatus";
import { useFetchWithAutoRetry } from "@/utils/fetchWithAutoRetry";
import { useDelayedLoading } from "@/hook/useDelayedLoading";

const DEBATES_STORAGE_KEY = "cached_debates";
const DEBATES_TIMESTAMP_KEY = "cached_debates_timestamp";
const CURSOR_STORAGE_KEY = "cached_cursor";
const SCROLL_POSITION_KEY = "saved_scroll_offset";
const CACHE_EXPIRY = 1000 * 60 * 60; // 1 hour
const tabBarHeight = 70;
const screenHeight = Dimensions.get("window").height;
const HEADER_HEIGHT = 85;

export default function DebateFeed() {
  const [debates, setDebates] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [unseenCount, setUnseenCount] = useState(0); // 🔹 new state
  const [refreshTimeout, setRefreshTimeout] = useState<NodeJS.Timeout | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [showActionModal, setShowActionModal] = useState(false);

  const { getToken } = useAuth();
  const authAxios = useAuthAxios();
  const { networkStatus } = useSimpleNetworkStatus();
  const router = useRouter();
  const tokenRef = useRef<string | null>(null);
  const momentumRef = useRef(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const scrollOffsetRef = useRef(0);
  const isInitialMount = useRef(true);
  const insets = useSafeAreaInsets();

  // Apply 100ms grace delay for initial load only
  const showDelayedLoading = useDelayedLoading(loading && cursor === null && debates.length === 0, 100);

  useEffect(() => {
    const initialize = async () => {
      const cachedDebates = await loadCachedDebates();
      if (cachedDebates.length > 0) setDebates(cachedDebates);

      const cachedCursor = await AsyncStorage.getItem(CURSOR_STORAGE_KEY);
      if (cachedCursor) setCursor(cachedCursor);

      tokenRef.current = await getToken({
        template: process.env.EXPO_PUBLIC_JWT_TEMPLATE_NAME,
      });
      fetchDebates(null, true);
      fetchUnseenCount(); // 🔹 fetch unseen count
    };
    initialize();

    return () => {
      try {
        AsyncStorage.setItem(
          SCROLL_POSITION_KEY,
          scrollOffsetRef.current.toString()
        );
      } catch (e) {}
      
      // Clear any pending refresh timeout
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
    };
  }, []);

  useEffect(() => {
        if (isInitialMount.current && debates.length > 0 && flatListRef.current) {
          const restoreScroll = async () => {
            const savedOffset = await AsyncStorage.getItem(SCROLL_POSITION_KEY);
            if (savedOffset && flatListRef.current) {
              flatListRef.current.scrollToOffset({
                offset: parseFloat(savedOffset),
                animated: false,
              });
            }
          };
          restoreScroll();
          isInitialMount.current = false;
        }
  }, [debates]);

  useEffect(() => {
    if (debates.length > 0 && !refreshing && !loadingMore && !loading) {
      cacheDebates(debates);
    }
  }, [debates, refreshing, loadingMore, loading]);

  useEffect(() => {
    if (cursor !== null && cursor !== undefined) {
      AsyncStorage.setItem(CURSOR_STORAGE_KEY, cursor).catch(() => {});
    }
  }, [cursor]);

  // Handle network status changes
  useEffect(() => {
    if (networkStatus.isOffline) {
      // If going offline, stop any ongoing refresh
      setRefreshing(false);
      setLoading(false);
      setLoadingMore(false);
      
      // Clear any pending timeout
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
        setRefreshTimeout(null);
      }
    }
  }, [networkStatus.isOffline, refreshTimeout]);

  const loadCachedDebates = async () => {
    try {
      const timestamp = parseInt(
        (await AsyncStorage.getItem(DEBATES_TIMESTAMP_KEY)) || "0"
      );
      if (Date.now() - timestamp > CACHE_EXPIRY) return [];

      const cachedData = await AsyncStorage.getItem(DEBATES_STORAGE_KEY);
      return cachedData ? JSON.parse(cachedData) : [];
    } catch (error: any) {
      console.warn("Error loading cached debates:", error);
      logError(error, { context: "DebateFeed.loadCachedDebates" });
      return [];
    }
  };

  const cacheDebates = async (data: any[]) => {
    try {
      await AsyncStorage.multiSet([
        [DEBATES_STORAGE_KEY, JSON.stringify(data)],
        [DEBATES_TIMESTAMP_KEY, Date.now().toString()],
      ]);
    } catch (error: any) {
      console.warn("Error caching debates:", error);
      logError(error, {
        context: "DebateFeed.cacheDebates",
        debatesCount: data.length,
      });
    }
  };

  const fetchUnseenCount = useCallback(async () => {
    if (!tokenRef.current) return;
    try {
      const url = `${process.env.EXPO_PUBLIC_BASE_URL}/notifications/unseen-count`;
      const { data } = await authAxios.get(url);
      if (data?.success) {
        setUnseenCount(data.data.unseenCount);
      }
    } catch (error: any) {
      console.warn("Error fetching unseen count:", error);
      logError(error, { context: "DebateFeed.fetchUnseenCount" });
    }
  }, [authAxios]);

  const fetchDebates = useCallback(
    async (fetchCursor: string | null = null, shouldRefresh = false) => {
      if (!tokenRef.current) return;
      
      // If offline, don't attempt to fetch but reset loading states
      if (networkStatus.isOffline) {
        console.log("Offline: Skipping fetch request");
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
        return;
      }
      
      fetchCursor === null ? setLoading(true) : setLoadingMore(true);

      try {
        const url = `${
          process.env.EXPO_PUBLIC_BASE_URL
        }/debate-room/feed?limit=10${
          fetchCursor ? `&cursor=${fetchCursor}` : ""
        }`;

        const { data } = await authAxios.get(url);

        if (data?.success) {
          const newDebates = data.data.data;
          const nextCursor = data.data.nextCursor;
          const hasNext = data.data.pagination?.hasNextPage;

          setDebates((prev) =>
            shouldRefresh ? newDebates : [...prev, ...newDebates]
          );
          setCursor(nextCursor);
          setHasNextPage(hasNext);

          if (nextCursor) {
            await AsyncStorage.setItem(CURSOR_STORAGE_KEY, nextCursor);
          }
        }
      } catch (error: any) {
        // Log network error for debugging
        if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
          console.log('Network error during fetch:', error.message);
        }

        logError(error, {
          context: "DebateFeed.fetchDebates",
          cursor: fetchCursor ? "[REDACTED_CURSOR]" : "null",
          shouldRefresh,
        });

        if (error.response?.status === 401) {
          try {
            tokenRef.current = await getToken({
              template: process.env.EXPO_PUBLIC_JWT_TEMPLATE_NAME,
            });
            return fetchDebates(fetchCursor, shouldRefresh);
          } catch (tokenErr: any) {
            logError(tokenErr, {
              context: "DebateFeed.fetchDebates.tokenRefresh",
            });
          }
        } else if (error.response?.status === 404) {
          console.log("Feed not found — no debates available for this query");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
        
        // Clear the refresh timeout
        if (refreshTimeout) {
          clearTimeout(refreshTimeout);
          setRefreshTimeout(null);
        }
      }
    },
    [authAxios, getToken, networkStatus.isOffline, refreshTimeout]
  );

  const handleRefresh = useCallback(() => {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTime;
    
    // Prevent multiple simultaneous refresh attempts
    if (loading || refreshing || networkStatus.isOffline) {
      if (networkStatus.isOffline) {
        setRefreshing(false);
      }
      return;
    }
    
    // Debounce: prevent refresh if called within 2 seconds of last refresh
    if (timeSinceLastRefresh < 2000) {
      console.log('Refresh debounced, too soon since last refresh');
      return;
    }
    
    setLastRefreshTime(now);
    setRefreshing(true);
    
    // Set a timeout to prevent infinite refresh
    const timeout = setTimeout(() => {
      console.log('Refresh timeout reached, stopping refresh');
      setRefreshing(false);
      setLoading(false);
      setLoadingMore(false);
    }, 10000); // 10 second timeout
    
    setRefreshTimeout(timeout);
    
    fetchDebates(null, true);
    fetchUnseenCount(); // refresh unseen count too
  }, [fetchDebates, loading, refreshing, fetchUnseenCount, networkStatus.isOffline, lastRefreshTime]);

  const onEndReachedCallback = useCallback(() => {
    if (
      !momentumRef.current &&
      hasNextPage &&
      !loading &&
      !loadingMore &&
      !refreshing
    ) {
      fetchDebates(cursor);
      momentumRef.current = true;
    }
  }, [fetchDebates, cursor, hasNextPage, loading, loadingMore, refreshing]);

  const handleExplorePress = useCallback(() => {
    setShowActionModal(true);
  }, []);

  const handleExploreDebates = useCallback(() => {
    setShowActionModal(false);
    router.push("/explore");
  }, [router]);

  const handleCreateDebate = useCallback(() => {
    Haptics.selectionAsync();
    setShowActionModal(false);
    router.push("/(create)/screen/screen");
  }, [router]);

  const handleOpenNotifications = useCallback(() => {
    Haptics.selectionAsync();
    router.push("/(noti)/screen/screen");
  }, [router]);

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <DebateCard
        debate={item}
        onJoinPress={() => console.log("Join:", item.id)}
      />
    ),
    []
  );

  const renderEmptyComponent = useCallback(() => {
    if (loading) return null;
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 32,
          backgroundColor: "#080F12",
          paddingBottom: tabBarHeight + insets.bottom,
        }}
      >
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: "#1A1A1A",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <Icon
            name='forum-outline'
            size={40}
            color={cyberpunkTheme.colors.primary}
          />
        </View>

        <Text
          style={{
            color: "#FFF",
            fontSize: 24,
            fontWeight: "700",
            textAlign: "center",
            marginBottom: 12,
          }}
        >
          All Caught Up!
        </Text>

        <Text
          style={{
            color: cyberpunkTheme.colors.text.muted,
            fontSize: 16,
            textAlign: "center",
            lineHeight: 24,
            marginBottom: 32,
          }}
        >
          Looks like you've joined all debates in your selected categories.
          Explore more or create your own!
        </Text>

        <Pressable onPress={handleExplorePress}>
          {({ pressed }) => (
            <LinearGradient
              colors={["#2c2c2c", "#000"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 25,
                flexDirection: "row",
                alignItems: "center",
                opacity: pressed ? 0.8 : 1,
              }}
            >
              <Icon
                name='compass-outline'
                size={20}
                color='#FFF'
                style={{ marginRight: 8 }}
              />
              <Text
                style={{
                  color: "#FFF",
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                Explore More Debates
              </Text>
            </LinearGradient>
          )}
        </Pressable>
      </View>
    );
  }, [loading, handleExplorePress, insets.bottom]);

  const keyExtractor = useCallback(
    (item: any, idx: number) => item?.id ?? idx.toString(),
    []
  );

  // Header opacity and background animation on scroll
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0.95],
    extrapolate: "clamp",
  });

  const headerBackgroundOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0.7],
    extrapolate: "clamp",
  });

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "#080F12",
      }}
    >
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          opacity: headerOpacity,
        }}
      >
        <Animated.View
          style={{
            opacity: headerBackgroundOpacity,
          }}
        >
          <LinearGradient
            colors={["rgba(0, 0, 0, 1)", "rgba(8, 15, 18, 0.95)"]}
            style={{
              paddingHorizontal: 20,
              paddingTop: Platform.OS === "ios" ? 8 : 16,
              paddingBottom: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "#000000",
              borderBottomWidth: 1,
              borderBottomColor: "rgba(255, 255, 255, 0.08)",
            }}
          >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flex: 1,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                justifyContent: "center",
                alignItems: "center",
                marginRight: 12,
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.1)",
                shadowColor: cyberpunkTheme.colors.primary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 8,
              }}
            >
              <Image
                source={require("@/assets/images/logo.png")}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 5,
                }}
                resizeMode='contain'
              />
            </View>

            <View>
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 20,
                  fontWeight: "800",
                  letterSpacing: -0.5,
                  lineHeight: 24,
                }}
              >
                Dtrue
              </Text>
              <View
                style={{
                  width: 22,
                  height: 2,
                  backgroundColor: cyberpunkTheme.colors.primary,
                  borderRadius: 1,
                  marginTop: 1,
                  opacity: 0.8,
                }}
              />
            </View>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Pressable
              hitSlop={10}
              onPress={handleOpenNotifications}
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: pressed
                  ? "rgba(255, 255, 255, 0.12)"
                  : "rgba(255, 255, 255, 0.06)",
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 1,
                borderColor: pressed
                  ? "rgba(255, 255, 255, 0.16)"
                  : "rgba(255, 255, 255, 0.06)",
                transform: [{ scale: pressed ? 0.96 : 1 }],
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.12,
                shadowRadius: 2,
                elevation: 2,
                overflow: "visible",
              })}
            >
              <Icon
                name='bell-outline'
                size={20}
                color='rgba(255, 255, 255, 0.95)'
              />

              {unseenCount > 0 && (
                <View
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    minWidth: 10,
                    height: 12,
                    paddingHorizontal: 3,
                    borderRadius: 10,
                    backgroundColor: "#FF4757",
                    justifyContent: "center",
                    alignItems: "center",
                    borderWidth: 1.25,
                    borderColor: "rgba(0,0,0,0.65)",
                    shadowColor: "#FF4757",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.35,
                    shadowRadius: 3,
                    elevation: 6,
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 8,
                      fontWeight: "700",
                      lineHeight: 8,
                    }}
                  >
                    {unseenCount > 10 ? "10+" : unseenCount}
                  </Text>
                </View>
              )}
            </Pressable>
            <TouchableOpacity
              onPress={handleCreateDebate}
              activeOpacity={0.8}
              style={{
                borderRadius: 20,
                overflow: "hidden",
                shadowColor: cyberpunkTheme.colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 6,
                elevation: 6,
              }}
            >
              <LinearGradient
                colors={[cyberpunkTheme.colors.primary, "#00CC77"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 18,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name='add' size={16} color={cyberpunkTheme.colors.text.inverse} style={{ marginRight: 3 }} />
                  <Text style={{ color: cyberpunkTheme.colors.text.inverse, fontSize: 12, fontWeight: '600' }}>Create</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          </LinearGradient>
        </Animated.View>
      </Animated.View>

      {showDelayedLoading ? (
        <FeedCardSkeleton />
      ) : (
        <FlatList
          ref={flatListRef}
          data={debates}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListEmptyComponent={renderEmptyComponent}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          onScroll={(event) => {
            Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: false }
            )(event);
            scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
          }}
          onMomentumScrollBegin={() => (momentumRef.current = true)}
          onMomentumScrollEnd={() => (momentumRef.current = false)}
          onEndReached={onEndReachedCallback}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing && !networkStatus.isOffline}
              onRefresh={handleRefresh}
              tintColor={cyberpunkTheme.colors.primary}
              enabled={!networkStatus.isOffline}
            />
          }
          removeClippedSubviews={Platform.OS === "android"}
          initialNumToRender={10}
          maxToRenderPerBatch={8}
          windowSize={10}
          ListFooterComponent={() =>
            loadingMore ? (
              <ActivityIndicator
                size='small'
                color={cyberpunkTheme.colors.primary}
                style={{ marginVertical: 16 }}
              />
            ) : !hasNextPage && debates.length > 0 ? (
              <Text
                style={{
                  textAlign: "center",
                  color: "#9CA3AB",
                  marginVertical: 16,
                }}
              >
                You've reached the end of the debates
              </Text>
            ) : null
          }
          contentContainerStyle={{
            paddingTop: HEADER_HEIGHT,
            paddingBottom: insets.bottom + tabBarHeight,
            flexGrow: 1,
          }}
        />
      )}

      {/* Action Modal */}
      <Modal
        visible={showActionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowActionModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 20,
        }}>
          <View style={{
            backgroundColor: '#1A1A1A',
            borderRadius: 20,
            padding: 24,
            width: '100%',
            maxWidth: 320,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.1)',
          }}>
            <Text style={{
              color: '#FFFFFF',
              fontSize: 20,
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: 8,
            }}>
              What would you like to do?
            </Text>
            
            <Text style={{
              color: '#9CA3AB',
              fontSize: 14,
              textAlign: 'center',
              marginBottom: 24,
            }}>
              Choose an action to continue
            </Text>

            <TouchableOpacity
              onPress={handleExploreDebates}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.1)',
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Icon
                name='compass-outline'
                size={24}
                color={cyberpunkTheme.colors.primary}
                style={{ marginRight: 12 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 16,
                  fontWeight: '600',
                  marginBottom: 2,
                }}>
                  Explore Debates
                </Text>
                <Text style={{
                  color: '#9CA3AB',
                  fontSize: 12,
                }}>
                  Discover and join existing debates
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCreateDebate}
              style={{
                backgroundColor: 'rgba(0, 255, 148, 0.1)',
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: cyberpunkTheme.colors.primary,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Icon
                name='plus'
                size={24}
                color={cyberpunkTheme.colors.primary}
                style={{ marginRight: 12 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 16,
                  fontWeight: '600',
                  marginBottom: 2,
                }}>
                  Create Debate
                </Text>
                <Text style={{
                  color: '#9CA3AB',
                  fontSize: 12,
                }}>
                  Start your own debate topic
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowActionModal(false)}
              style={{
                marginTop: 16,
                paddingVertical: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{
                color: '#9CA3AB',
                fontSize: 14,
                fontWeight: '500',
              }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
