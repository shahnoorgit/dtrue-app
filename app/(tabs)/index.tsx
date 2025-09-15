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
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import axios from "axios";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { cyberpunkTheme } from "@/constants/theme";
import DebateCard from "@/components/tabs/debate_card/DebateCard";
import { useAuth } from "@clerk/clerk-expo";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { logError } from "@/utils/sentry/sentry";
import { posthog } from "@/lib/posthog/posthog";

const DEBATES_STORAGE_KEY = "cached_debates";
const DEBATES_TIMESTAMP_KEY = "cached_debates_timestamp";
const CURSOR_STORAGE_KEY = "cached_cursor";
const SCROLL_POSITION_KEY = "saved_scroll_offset";
const CACHE_EXPIRY = 1000 * 60 * 60; // 1 hour
const tabBarHeight = 70;
const screenHeight = Dimensions.get("window").height;
const HEADER_HEIGHT = 110;

export default function DebateFeed() {
  const [debates, setDebates] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [unseenCount, setUnseenCount] = useState(0); // 🔹 new state

  const { getToken } = useAuth();
  const router = useRouter();
  const tokenRef = useRef(null);
  const momentumRef = useRef(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  const scrollOffsetRef = useRef(0);
  const isInitialMount = useRef(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    posthog.screen("Debate Feed");
    posthog.capture("Viewed Debate Feed");
  }, []);

  useEffect(() => {
    const initialize = async () => {
      const cachedDebates = await loadCachedDebates();
      if (cachedDebates.length > 0) setDebates(cachedDebates);

      const cachedCursor = await AsyncStorage.getItem(CURSOR_STORAGE_KEY);
      if (cachedCursor) setCursor(cachedCursor);

      tokenRef.current = await getToken({ template: "lets_debate_jwt" });
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
    };
  }, []);

  useEffect(() => {
    if (isInitialMount.current && debates.length > 0 && flatListRef.current) {
      const restoreScroll = async () => {
        const savedOffset = await AsyncStorage.getItem(SCROLL_POSITION_KEY);
        if (savedOffset) {
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

  const cacheDebates = async (data) => {
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
      const { data } = await axios.get(url, {
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
      if (data?.success) {
        setUnseenCount(data.data.unseenCount);
      }
    } catch (error: any) {
      console.warn("Error fetching unseen count:", error);
      logError(error, { context: "DebateFeed.fetchUnseenCount" });
    }
  }, []);

  const fetchDebates = useCallback(
    async (fetchCursor = null, shouldRefresh = false) => {
      if (!tokenRef.current) return;
      fetchCursor === null ? setLoading(true) : setLoadingMore(true);

      try {
        const url = `${
          process.env.EXPO_PUBLIC_BASE_URL
        }/debate-room/feed?limit=10${
          fetchCursor ? `&cursor=${fetchCursor}` : ""
        }`;

        const { data } = await axios.get(url, {
          headers: { Authorization: `Bearer ${tokenRef.current}` },
        });

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
        logError(error, {
          context: "DebateFeed.fetchDebates",
          cursor: fetchCursor ? "[REDACTED_CURSOR]" : "null",
          shouldRefresh,
        });

        if (error.response?.status === 401) {
          try {
            tokenRef.current = await getToken({ template: "lets_debate_jwt" });
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
      }
    },
    [getToken]
  );

  const handleRefresh = useCallback(() => {
    if (!loading && !refreshing) {
      setRefreshing(true);
      fetchDebates(null, true);
      fetchUnseenCount(); // refresh unseen count too
    }
  }, [fetchDebates, loading, refreshing, fetchUnseenCount]);

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
    posthog.capture("Explore More Debates Pressed");

    router.push("/explore");
  }, [router]);

  const renderItem = useCallback(
    ({ item }) => (
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
            color: "#8F9BB3",
            fontSize: 16,
            textAlign: "center",
            lineHeight: 24,
            marginBottom: 32,
          }}
        >
          Looks like you've joined all debates in your selected categories.
          Explore more or create your own!
        </Text>

        <View style={{ width: "auto" }}>
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
      </View>
    );
  }, [loading, handleExplorePress, insets.bottom]);

  const keyExtractor = useCallback(
    (item, idx) => item?.id ?? idx.toString(),
    []
  );

  const headerTranslate = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [0, -120],
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
          transform: [{ translateY: headerTranslate }],
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
        }}
      >
        <LinearGradient
          colors={["rgba(0, 0, 0, 1)", "rgba(8, 15, 18, 0.95)"]}
          style={{
            paddingHorizontal: 20,
            paddingTop: Platform.OS === "ios" ? 12 : 24,
            paddingBottom: 16,
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
                width: 42,
                height: 42,
                borderRadius: 12,
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                justifyContent: "center",
                alignItems: "center",
                marginRight: 14,
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
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                }}
                resizeMode='contain'
              />
            </View>

            <View>
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 22,
                  fontWeight: "800",
                  letterSpacing: -0.5,
                  lineHeight: 26,
                }}
              >
                Dtrue
              </Text>
              <View
                style={{
                  width: 24,
                  height: 2,
                  backgroundColor: cyberpunkTheme.colors.primary,
                  borderRadius: 1,
                  marginTop: 2,
                  opacity: 0.8,
                }}
              />
            </View>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Pressable
              hitSlop={10}
              onPress={() => router.push("/(noti)/screen/screen")}
              style={({ pressed }) => ({
                width: 56,
                height: 56,
                borderRadius: 28,
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
                size={28}
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
                    {unseenCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </LinearGradient>
      </Animated.View>

      {loading && cursor === null ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <ActivityIndicator
            size='large'
            color={cyberpunkTheme.colors.primary}
          />
        </View>
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
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={cyberpunkTheme.colors.primary}
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
                  color: "#8F9BB3",
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
    </SafeAreaView>
  );
}
