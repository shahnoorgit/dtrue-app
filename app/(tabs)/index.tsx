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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import axios from "axios";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { cyberpunkTheme } from "@/constants/theme";
import DebateCard from "@/components/tabs/debate_card/DebateCard";
import { useAuth } from "@clerk/clerk-expo";

// Constants for caching and layout
const DEBATES_STORAGE_KEY = "cached_debates";
const DEBATES_TIMESTAMP_KEY = "cached_debates_timestamp";
const CURSOR_STORAGE_KEY = "cached_cursor";
const SCROLL_POSITION_KEY = "saved_scroll_offset";
const CACHE_EXPIRY = 1000 * 60 * 60; // 1 hour
const tabBarHeight = 70;
const screenHeight = Dimensions.get("window").height;

export default function DebateFeed() {
  const [debates, setDebates] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { getToken } = useAuth();
  const tokenRef = useRef(null);
  const momentumRef = useRef(true); // Tracks if scroll is momentum-based
  const scrollY = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  const scrollOffsetRef = useRef(0);
  const isInitialMount = useRef(true);

  // Initialize: load cached debates and fetch fresh data
  useEffect(() => {
    const initialize = async () => {
      const cachedDebates = await loadCachedDebates();
      if (cachedDebates.length > 0) setDebates(cachedDebates);

      const cachedCursor = await AsyncStorage.getItem(CURSOR_STORAGE_KEY);
      if (cachedCursor) setCursor(cachedCursor);

      tokenRef.current = await getToken({ template: "lets_debate_jwt" });
      fetchDebates(null, true); // Fetch without cursor for initial load
    };
    initialize();

    // Cleanup: save scroll position and cursor on unmount
    return () => {
      AsyncStorage.multiSet([
        [CURSOR_STORAGE_KEY, cursor || ""],
        [SCROLL_POSITION_KEY, scrollOffsetRef.current.toString()],
      ]);
    };
  }, []);

  // Restore scroll position after initial load
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

  // Cache debates when updated
  useEffect(() => {
    if (debates.length > 0 && !refreshing && !loadingMore && !loading) {
      cacheDebates(debates);
    }
  }, [debates, refreshing, loadingMore, loading]);

  // Load cached debates from storage
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

  // Save debates to cache
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

  // Fetch debates with cursor-based pagination
  const fetchDebates = useCallback(
    async (fetchCursor: string | null = null, shouldRefresh = false) => {
      if (!tokenRef.current) return;

      // flip the loading flags
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

          // persist the new cursor
          if (nextCursor) {
            await AsyncStorage.setItem(CURSOR_STORAGE_KEY, nextCursor);
          }
        }
      } catch (error: any) {
        // if it was a 404, assume token expired: grab a fresh one and retry once
        if (error.response?.status === 404) {
          console.log("Got 404—refreshing token and retrying feed fetch");
          try {
            // re-fetch the JWT
            tokenRef.current = await getToken({ template: "lets_debate_jwt" });
            // retry the exact same request
            return fetchDebates(fetchCursor, shouldRefresh);
          } catch (tokeErr) {
            console.error("Error refreshing token:", tokeErr);
          }
        } else {
          console.error("Error fetching debates:", error);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [getToken] // make sure getToken is in your dependency array
  );

  // Handle pull-to-refresh
  const handleRefresh = useCallback(() => {
    if (!loading && !refreshing) {
      setRefreshing(true);
      fetchDebates(null, true); // Fetch without cursor for refresh
    }
  }, [fetchDebates, loading, refreshing]);

  // Handle infinite scroll
  const onEndReachedCallback = useCallback(() => {
    if (
      !momentumRef.current &&
      hasNextPage &&
      !loading &&
      !loadingMore &&
      !refreshing
    ) {
      fetchDebates(cursor); // Use current cursor to fetch next page
      momentumRef.current = true;
    }
  }, [fetchDebates, cursor, hasNextPage, loading, loadingMore, refreshing]);

  // Render debate card
  const renderItem = useCallback(
    ({ item }) => (
      <DebateCard
        debate={item}
        onJoinPress={() => console.log("Join:", item.id)}
      />
    ),
    []
  );

  const keyExtractor = useCallback((item) => item.id.toString(), []);

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "#080F12",
        height: screenHeight - tabBarHeight,
      }}
    >
      {/* Fixed Transparent Header */}
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          paddingHorizontal: 24,
          paddingTop: 32,
          paddingBottom: 16,
        }}
      >
        <BlurView
          intensity={142}
          tint='dark'
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderBottomWidth: 1,
            borderColor: "rgba(0,255,148,0.2)",
          }}
        >
          <LinearGradient
            colors={["rgba(8, 15, 18, 0.85)", "rgba(0, 255, 148, 0.05)"]}
            style={{ flex: 1 }}
          />
        </BlurView>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: cyberpunkTheme.colors.primary,
              fontSize: 18,
              fontWeight: "bold",
            }}
          >
            Let's Debate
          </Text>
          <View style={{ flexDirection: "row" }}>
            <Pressable
              onPress={() =>
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              }
              style={{ marginRight: 16 }}
            >
              <Icon
                name='account-group-outline'
                size={22}
                color={cyberpunkTheme.colors.text.muted}
              />
            </Pressable>
            <Pressable
              onPress={() =>
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              }
            >
              <Icon
                name='bell-outline'
                size={22}
                color={cyberpunkTheme.colors.text.muted}
              />
            </Pressable>
          </View>
        </View>
      </Animated.View>

      {/* Debate List */}
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
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />} // Vertical gap between cards
          onScroll={(event) => {
            Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: false }
            )(event);
            scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
          }}
          onMomentumScrollBegin={() => (momentumRef.current = false)}
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
            paddingTop: 90,
            paddingBottom: tabBarHeight,
          }}
        />
      )}
    </SafeAreaView>
  );
}
