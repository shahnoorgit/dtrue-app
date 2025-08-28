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

const DEBATES_STORAGE_KEY = "cached_debates";
const DEBATES_TIMESTAMP_KEY = "cached_debates_timestamp";
const CURSOR_STORAGE_KEY = "cached_cursor";
const SCROLL_POSITION_KEY = "saved_scroll_offset";
const CACHE_EXPIRY = 1000 * 60 * 60; // 1 hour
const tabBarHeight = 70;
const screenHeight = Dimensions.get("window").height;
const HEADER_HEIGHT = 110; // keep same visual spacing as before

export default function DebateFeed() {
  const [debates, setDebates] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { getToken } = useAuth();
  const router = useRouter();
  const tokenRef = useRef(null);
  const momentumRef = useRef(false); // updated logic: true while momentum scroll is happening
  const scrollY = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  const scrollOffsetRef = useRef(0);
  const isInitialMount = useRef(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const initialize = async () => {
      const cachedDebates = await loadCachedDebates();
      if (cachedDebates.length > 0) setDebates(cachedDebates);

      const cachedCursor = await AsyncStorage.getItem(CURSOR_STORAGE_KEY);
      if (cachedCursor) setCursor(cachedCursor);

      tokenRef.current = await getToken({ template: "lets_debate_jwt" });
      fetchDebates(null, true);
    };
    initialize();

    // persist scroll offset when component unmounts
    return () => {
      try {
        AsyncStorage.setItem(
          SCROLL_POSITION_KEY,
          scrollOffsetRef.current.toString()
        );
      } catch (e) {
        /* ignore */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // restore scroll position once we have data
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

  // cache debates after changes (preserve your previous behaviour)
  useEffect(() => {
    if (debates.length > 0 && !refreshing && !loadingMore && !loading) {
      cacheDebates(debates);
    }
  }, [debates, refreshing, loadingMore, loading]);

  // save cursor whenever it changes to avoid stale writes on unmount
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
    } catch (error) {
      console.warn("Error loading cached debates:", error);
      return [];
    }
  };

  const cacheDebates = async (data) => {
    try {
      await AsyncStorage.multiSet([
        [DEBATES_STORAGE_KEY, JSON.stringify(data)],
        [DEBATES_TIMESTAMP_KEY, Date.now().toString()],
      ]);
    } catch (error) {
      console.warn("Error caching debates:", error);
    }
  };

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
      } catch (error) {
        if (error.response?.status === 401) {
          // 🔑 Handle expired/invalid token
          console.log("Got 401 — refreshing token and retrying feed fetch");
          try {
            tokenRef.current = await getToken({ template: "lets_debate_jwt" });
            return fetchDebates(fetchCursor, shouldRefresh);
          } catch (tokenErr) {
            console.error("Error refreshing token:", tokenErr);
          }
        } else if (error.response?.status === 404) {
          // 🎯 404 likely means empty feed
          console.log("Feed not found — no debates available for this query");
        } else {
          console.error("Error fetching debates:", error);
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
    }
  }, [fetchDebates, loading, refreshing]);

  const onEndReachedCallback = useCallback(() => {
    // only load more if we are NOT in momentum scrolling, to prevent duplicate triggers
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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

  // header translate animation
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
      {/* Animated header — visually same as before but slides up on scroll */}
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
        {/* Subtle gradient overlay for depth */}
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
          {/* Left side - Logo and Brand */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flex: 1,
            }}
          >
            {/* Modern logo container with subtle glow effect */}
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

            {/* Brand name with modern typography */}
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
              onPress={() =>
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              }
              style={({ pressed }) => ({
                width: 56, // larger hit area
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
                // subtle shadow so the badge pops more
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
                size={28} // bigger icon
                color='rgba(255, 255, 255, 0.95)'
              />

              {/* Modern notification badge */}
              <View
                style={{
                  position: "absolute",
                  top: 4, // sit a bit more on top of the bell
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
                  // badge shadow
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
                    paddingHorizontal: 0,
                  }}
                >
                  8
                </Text>
              </View>
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
            // update Animated.Value and also keep track of offset for saving
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
            paddingTop: HEADER_HEIGHT, // keep visual spacing as before
            paddingBottom: insets.bottom + tabBarHeight,
            flexGrow: 1,
          }}
        />
      )}
    </SafeAreaView>
  );
}
