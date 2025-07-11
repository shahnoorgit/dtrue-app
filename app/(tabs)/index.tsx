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
import { theme } from "../(chat-room)/theme";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

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
  const router = useRouter();
  const tokenRef = useRef(null);
  const momentumRef = useRef(true);
  const scrollY = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  const scrollOffsetRef = useRef(0);
  const isInitialMount = useRef(true);

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

    return () => {
      AsyncStorage.multiSet([
        [CURSOR_STORAGE_KEY, cursor || ""],
        [SCROLL_POSITION_KEY, scrollOffsetRef.current.toString()],
      ]);
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
        if (error.response?.status === 404) {
          console.log("Got 404—refreshing token and retrying feed fetch");
          try {
            tokenRef.current = await getToken({ template: "lets_debate_jwt" });
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
    [getToken]
  );

  const handleRefresh = useCallback(() => {
    if (!loading && !refreshing) {
      setRefreshing(true);
      fetchDebates(null, true);
    }
  }, [fetchDebates, loading, refreshing]);

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/explore");
  }, []);

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
          paddingBottom: tabBarHeight,
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
          Looks like you’ve joined all debates in your selected categories.
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
  }, [loading, handleExplorePress]);

  const keyExtractor = useCallback((item, idx) => idx.toString(), []);

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "#080F12",
        height: screenHeight - tabBarHeight,
      }}
    >
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          paddingHorizontal: 16,
          paddingTop: Platform.OS === "ios" ? 10 : 20,
          paddingBottom: 8,
          backgroundColor: "#000",
          borderBottomWidth: 0.5,
          borderColor: theme.colors.backgroundDarker,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ width: 40, height: 40, marginRight: 10 }}>
            <Image
              source={require("@/assets/images/logo.png")}
              style={{ width: "100%", height: "100%" }}
              resizeMode='contain'
            />
          </View>
          <Text
            style={{
              color: "#FFF",
              fontSize: 20,
              fontWeight: "700",
              letterSpacing: 0.4,
            }}
          >
            Dtrue
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable
            onPress={() =>
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            }
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: pressed ? "#2a2a2a" : "#1a1a1a",
              justifyContent: "center",
              alignItems: "center",
              transform: [{ scale: pressed ? 0.95 : 1 }],
            })}
          >
            <Icon name='account-group-outline' size={18} color='#FFF' />
          </Pressable>
          <Pressable
            onPress={() =>
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            }
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: pressed ? "#2a2a2a" : "#1a1a1a",
              justifyContent: "center",
              alignItems: "center",
              transform: [{ scale: pressed ? 0.95 : 1 }],
            })}
          >
            <Icon name='bell-outline' size={18} color='#FFF' />
            <View
              style={{
                position: "absolute",
                top: 6,
                right: 6,
                width: 7,
                height: 7,
                borderRadius: 3.5,
                backgroundColor: "#FF4757",
                borderWidth: 1,
                borderColor: "#000",
              }}
            />
          </Pressable>
        </View>
      </View>
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
            paddingTop: 110,
            paddingBottom: tabBarHeight,
            flexGrow: 1,
          }}
        />
      )}
    </SafeAreaView>
  );
}
