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
  StyleSheet,
  TextInput,
  Keyboard,
  Share,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuthToken } from "@/hook/clerk/useFetchjwtToken";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { logError } from "@/utils/sentry/sentry";
import {
  trackSearchPerformed,
  trackDebateJoined,
  trackContentShared,
} from "@/lib/posthog/events";
import ExploreSkeleton from "@/components/explore/ExploreSkeleton";

const THEME = {
  colors: {
    primary: "#00FF94",
    secondary: "#FF00E5",
    background: "#080F12",
    backgroundDarker: "#03120F",
    text: "#FFFFFF",
    textMuted: "#8F9BB3",
    searchBackground: "#1A2332",
  },
};

const ExploreDebatesPage = () => {
  // Core state
  const [debates, setDebates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [joiningDebateId, setJoiningDebateId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  const [token, refreshToken] = useAuthToken();
  const { userId } = useAuth();
  const router = useRouter();

  const retryCount = useRef(0);
  const maxRetries = 3;
  const isMountedRef = useRef(true);
  const searchTimeout = useRef<NodeJS.Timeout>();
  const limit = 5;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      clearTimeout(searchTimeout.current!);
    };
  }, []);

  // Helper function to normalize debate data structure
  const normalizeDebateData = (debate: any, isApiFormat: boolean = false) => {
    if (isApiFormat) {
      // Convert API format to component format
      return {
        id: debate.debateRoomId,
        title: debate.title,
        description: debate.title, // Use title as description if no description field
        debate: {
          image: debate.image,
        },
        creatorName: debate.creatorName,
        creatorImage: debate.creatorImage,
        // Store original API data for potential future use
        apiData: debate,
      };
    } else {
      // Convert search format to component format
      return {
        id: debate.id,
        title: debate.debate.title,
        description: debate.debate.content, // Use content as description
        debate: {
          image: debate.debate.image,
        },
        creatorName: debate.debate.creator_name || "Unknown Creator", // Handle missing creator_name
        creatorImage: debate.debate.creator_image || "", // Handle missing creator_image
        // Store original search data for potential future use
        searchData: debate,
      };
    }
  };

  // Fetch explore debates (default feed)
  const fetchExploreDebates = useCallback(async () => {
    if (!token || searchQuery.trim()) return;

    setLoading(true);
    setFetchError(null);

    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_BASE_URL}/explore`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.status === 401) {
        refreshToken();
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      if (!isMountedRef.current) return;

      if (json.success && json.data?.data) {
        const normalizedDebates = json.data.data.map((debate: any) =>
          normalizeDebateData(debate, true)
        );
        setDebates(normalizedDebates);
        setCurrentPage(1);
        setHasMorePages(json.data.next === true);
      } else {
        setDebates([]);
        setHasMorePages(false);
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      setFetchError(err.message || "Failed to load explore feed");
      logError(err, {
        context: "ExploreDebatesPage.fetchExploreDebates",
      });
    } finally {
      if (!isMountedRef.current) return;
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, refreshToken]);

  // Initial load effect - only run when token changes and no search query
  useEffect(() => {
    if (token && !searchQuery.trim()) {
      fetchExploreDebates();
    }
  }, [token]); // Remove fetchExploreDebates from dependencies to prevent infinite loop

  // Handle search query changes
  useEffect(() => {
    clearTimeout(searchTimeout.current!);
    if (searchQuery.trim()) {
      setSearchLoading(true);
      searchTimeout.current = setTimeout(
        () => performDebateSearch(searchQuery.trim(), 1),
        500
      );
    } else {
      // Reset to API debates on clear - fetch fresh data
      setIsSearching(false);
      setSearchLoading(false);
      if (token) {
        fetchExploreDebates();
      }
    }
    return () => clearTimeout(searchTimeout.current!);
  }, [searchQuery, token]); // Remove fetchExploreDebates from dependencies

  // Search for debates
  const performDebateSearch = useCallback(
    async (query: string, page = 1) => {
      if (!token || !query) return;

      trackSearchPerformed({
        query: query,
        type: "debates",
        resultsCount: 0,
      });

      setFetchError(null);
      setIsSearching(true);
      if (page === 1) setSearchLoading(true);

      try {
        const res = await fetch(
          `${
            process.env.EXPO_PUBLIC_BASE_URL
          }/debate-room/search/${encodeURIComponent(
            query
          )}?page=${page}&limit=${limit}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (res.status === 401) {
          refreshToken();
          return;
        }
        
        // Handle 500 errors gracefully - treat as no results
        if (res.status === 500) {
          console.warn("Search API returned 500, treating as no results");
          if (page === 1) setDebates([]);
          setHasMorePages(false);
          retryCount.current = 0;
          return;
        }
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        if (!isMountedRef.current) return;

        if (json.success && json.data) {
          const normalizedDebates = json.data.map((debate: any) =>
            normalizeDebateData(debate, false)
          );

          if (page === 1) {
            setDebates(normalizedDebates);
            setCurrentPage(1);
          } else {
            setDebates((prev: any[]) => [...prev, ...normalizedDebates]);
          }
          setHasMorePages(json.data.length === limit);
          setCurrentPage(page);
          retryCount.current = 0;
        } else {
          if (page === 1) setDebates([]);
          setHasMorePages(false);
        }
      } catch (err: any) {
        if (!isMountedRef.current) return;
        setFetchError(err.message || "Search failed");
        logError(err, {
          context: "ExploreDebatesPage.performDebateSearch",
          query: query ? "[REDACTED_QUERY]" : "undefined",
          page,
        });
        if (retryCount.current < maxRetries) {
          retryCount.current++;
          setTimeout(
            () => performDebateSearch(query, page),
            2000 * retryCount.current
          );
        }
      } finally {
        if (!isMountedRef.current) return;
        setSearchLoading(false);
        setRefreshing(false);
        setIsSearching(false);
      }
    },
    [token, refreshToken]
  );


  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    retryCount.current = 0;
    if (searchQuery.trim()) {
      performDebateSearch(searchQuery.trim(), 1);
    } else {
      // Refresh API debates - call the fetch function directly
      fetchExploreDebates();
    }
  }, [searchQuery, performDebateSearch, fetchExploreDebates]);

  const handleLoadMore = useCallback(() => {
    if (
      hasMorePages &&
      !searchLoading &&
      searchQuery.trim() &&
      currentPage < Infinity
    ) {
      performDebateSearch(searchQuery.trim(), currentPage + 1);
    }
  }, [
    hasMorePages,
    searchLoading,
    searchQuery,
    currentPage,
    performDebateSearch,
  ]);

  const handleJoinDebate = useCallback(
    async (debate: any) => {
      if (!token || !debate?.id) return;
      setJoiningDebateId(debate.id);
      trackDebateJoined({
        debateId: debate.id,
        source: "explore",
        debateTitle: debate.title,
      });
      try {
        router.push({
          pathname: "/(chat-room)/screen",
          params: {
            clerkId: userId,
            debateId: debate.id,
            debateImage: debate.debate?.image || "",
          },
        });
      } catch (err: any) {
        console.error("Error joining debate:", err);
        // Log error to Sentry
        logError(err, {
          context: "ExploreDebatesPage.handleJoinDebate",
          debateId: debate.id ? "[REDACTED_DEBATE_ID]" : "undefined",
          userId: userId ? "[REDACTED_USER_ID]" : "undefined",
        });
        Alert.alert("Error", "Unable to join. Please try again.");
      } finally {
        setJoiningDebateId(null);
      }
    },
    [token, router, userId, refreshToken]
  );


  const renderSearchHeader = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputContainer}>
        <Ionicons name='search' size={20} color={THEME.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search debates..."
          placeholderTextColor={THEME.colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType='search'
          onSubmitEditing={Keyboard.dismiss}
        />
        {searchLoading ? (
          <ActivityIndicator
            size='small'
            color={THEME.colors.primary}
            style={styles.searchLoadingIcon}
          />
        ) : (
          searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles.clearButton}
            >
              <Ionicons
                name='close-circle'
                size={20}
                color={THEME.colors.textMuted}
              />
            </TouchableOpacity>
          )
        )}
      </View>
    </View>
  );

  // inside your screen/component
  const renderDebateCard = ({ item }: { item: any }) => {
    const joining = joiningDebateId === item.id;

    const participantCount = item.debate?.participantCount ?? 0;
    const base =
      process.env.EXPO_PUBLIC_SHARE_URL || "https://links-dev.dtrue.online  ";
    const shareUrl = `${base}/debate/${item.debate?.id ?? item.id}`;

    const handleShare = async (e?: any) => {
      // try to stop parent press (web / pressable-friendly)
      e?.stopPropagation?.();

      try {
        trackContentShared({
          type: "debate",
          contentId: item.id,
          method: "native",
        });
        await Share.share({
          title: item?.title ?? "Debate",
          message: `${item?.title ?? "Join this debate"}\n\n${shareUrl}`,
          url: shareUrl,
        });
      } catch (err: any) {
        console.warn("Share failed", err);
        // Log error to Sentry
        logError(err, {
          context: "ExploreDebatesPage.handleShare",
          debateId: item.id ? "[REDACTED_DEBATE_ID]" : "undefined",
        });
      }
    };

    return (
      <View style={styles.cardContainer}>
        <LinearGradient
          colors={[THEME.colors.backgroundDarker, THEME.colors.background]}
          style={styles.card}
        >
          <Image
            source={{ uri: item.debate.image }}
            style={styles.debateImage}
          />

          <View style={styles.cardContent}>
            <Text style={styles.debateTitle} numberOfLines={2}>
              {item?.title}
            </Text>
            <Text style={styles.debateDescription} numberOfLines={3}>
              {item?.description}
            </Text>

            <Pressable
              onPress={() => {
                router.push({
                  pathname: "/(tabs)/[id]/page",
                  params: { id: item.apiData.creatorId },
                });
              }}
              style={styles.creatorContainer}
            >
              <Image
                source={{ uri: item.creatorImage }}
                style={styles.creatorImage}
              />
              <View>
                <Text style={styles.creatorName}>Debate Creator</Text>
                <Text style={styles.creatorHandle}>{item?.creatorName}</Text>
              </View>

              {/* Right side: joined pill + share button */}
              <View style={styles.metaRight}>
                <View style={styles.joinedPill}>
                  <Ionicons name='people' size={14} color='#E6E6E6' />
                  <Text style={styles.joinedText}>
                    {participantCount} Joined
                  </Text>
                </View>

                <Pressable
                  onPress={(e) => handleShare(e)}
                  style={styles.shareButton}
                  accessibilityLabel={`Share debate ${item?.title}`}
                >
                  <Ionicons name='share-social' size={18} color='#BDBDBD' />
                </Pressable>
              </View>
            </Pressable>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleJoinDebate(item)}
              disabled={joining}
            >
              {joining ? (
                <ActivityIndicator size='small' color={THEME.colors.text} />
              ) : (
                <>
                  <Ionicons
                    name='add-circle'
                    size={20}
                    color={THEME.colors.text}
                  />
                  <Text style={styles.actionButtonText}>ENTER DEBATE</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name={searchQuery.trim() ? "search" : "compass"}
        size={64}
        color={THEME.colors.textMuted}
      />
      <Text style={styles.emptyStateTitle}>
        {searchQuery.trim() ? "No Results Found" : "Explore Debates"}
      </Text>
      <Text style={styles.emptyStateText}>
        {searchQuery.trim()
          ? `No debates found for "${searchQuery}". Try a different search term.`
          : "Discover trending debates and join the conversation!"}
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

  const renderFooter = () =>
    hasMorePages && searchQuery.trim() ? (
      <View style={styles.footerLoader}>
        <ActivityIndicator size='small' color={THEME.colors.primary} />
        <Text style={styles.footerText}>Loading more debates...</Text>
      </View>
    ) : null;

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[THEME.colors.backgroundDarker, THEME.colors.background]}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Explore</Text>
          {renderSearchHeader()}
        </LinearGradient>
        <ExploreSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[THEME.colors.backgroundDarker, THEME.colors.background]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Explore</Text>
        {renderSearchHeader()}
      </LinearGradient>

      {fetchError && !loading ? (
        renderError()
      ) : searchLoading && debates.length === 0 ? (
        <ExploreSkeleton />
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
          ListEmptyComponent={!loading && !searchLoading ? renderEmptyState : null}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.1}
          contentContainerStyle={[
            styles.listContent,
            debates.length === 0 && { flex: 1 },
          ]}
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
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: THEME.colors.text,
    marginBottom: 16,
  },
  searchContainer: {
    paddingHorizontal: 0,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.colors.searchBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: THEME.colors.text,
    fontSize: 16,
    height: "100%",
  },
  searchLoadingIcon: {
    marginLeft: 8,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  cardContainer: {
    marginBottom: 20,
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  scoreBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 16,
  },
  scoreText: {
    color: THEME.colors.primary,
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 4,
  },
  debateImage: {
    width: "100%",
    height: 200,
    backgroundColor: THEME.colors.backgroundDarker,
  },
  cardContent: {
    padding: 16,
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

  joinedText: {
    color: "#E6E6E6", // light grey text
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: THEME.colors.primary,
    minHeight: 44,
    backgroundColor: THEME.colors.backgroundDarker,
  },
  actionButtonText: {
    color: THEME.colors.text,
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 8,
  },
  footerLoader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  footerText: {
    color: THEME.colors.textMuted,
    fontSize: 14,
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
  shareButton: {
    marginLeft: 10,
    backgroundColor: "#111", // near-black
    padding: 8,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  metaRight: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
  },

  joinedPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#000", // modern black
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    marginLeft: 8,
  },
});

export default ExploreDebatesPage;