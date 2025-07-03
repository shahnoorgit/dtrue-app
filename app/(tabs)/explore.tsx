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
  TextInput,
  Keyboard,
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
    searchBackground: "#1A2332",
  },
};

const { width } = Dimensions.get("window");

// Mock data for initial load
const mockDebates = [
  {
    id: "mock-1",
    score: 0.95,
    debate: {
      title: "Is artificial intelligence a threat to humanity?",
      content:
        "Exploring the potential risks and benefits of AI development and its impact on society.",
      summary:
        "A comprehensive discussion about AI's role in our future, covering both optimistic and pessimistic viewpoints.",
      image:
        "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=200&fit=crop",
      creator_id: "user-1",
      creator_image:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face",
    },
  },
  {
    id: "mock-2",
    score: 0.87,
    debate: {
      title: "Should social media platforms be regulated?",
      content:
        "Discussing the need for government oversight versus platform self-regulation.",
      summary:
        "An engaging debate about balancing free speech with content moderation and user safety.",
      image:
        "https://images.unsplash.com/photo-1611605698335-8b1569810432?w=400&h=200&fit=crop",
      creator_id: "user-2",
      creator_image:
        "https://images.unsplash.com/photo-1494790108755-2616b332c58c?w=40&h=40&fit=crop&crop=face",
    },
  },
  {
    id: "mock-3",
    score: 0.76,
    debate: {
      title: "Climate change: Individual vs Corporate responsibility",
      content:
        "Who bears the greater responsibility for addressing climate change?",
      summary:
        "A heated debate about whether individuals or corporations should lead climate action.",
      image:
        "https://images.unsplash.com/photo-1569163139394-de4e5f43e4e3?w=400&h=200&fit=crop",
      creator_id: "user-3",
      creator_image:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face",
    },
  },
];

const ExploreDebatesPage = () => {
  // Core state
  const [debates, setDebates] = useState(mockDebates);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [joiningDebateId, setJoiningDebateId] = useState<string | null>(null);

  // ← Added missing searchQuery
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

  // Initial mock display before token arrives
  useEffect(() => {
    if (token && !isSearching) {
      const task = InteractionManager.runAfterInteractions(() => {
        if (isMountedRef.current) setLoading(false);
      });
      return () => task.cancel();
    }
  }, [token, isSearching]);

  // Debounce searchQuery
  useEffect(() => {
    clearTimeout(searchTimeout.current!);
    if (searchQuery.trim()) {
      setSearchLoading(true);
      searchTimeout.current = setTimeout(
        () => performSearch(searchQuery.trim(), 1),
        500
      );
    } else {
      // reset to mock on clear
      setDebates(mockDebates);
      setCurrentPage(1);
      setHasMorePages(true);
      setIsSearching(false);
      setSearchLoading(false);
    }
    return () => clearTimeout(searchTimeout.current!);
  }, [searchQuery]);

  // Fetch/search function
  const performSearch = useCallback(
    async (query: string, page = 1) => {
      if (!token || !query) return;

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
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        if (!isMountedRef.current) return;

        if (json.success && json.data) {
          if (page === 1) {
            setDebates(json.data);
            setCurrentPage(1);
          } else {
            setDebates((prev) => [...prev, ...json.data]);
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
        if (retryCount.current < maxRetries) {
          retryCount.current++;
          setTimeout(
            () => performSearch(query, page),
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
    if (searchQuery.trim()) performSearch(searchQuery.trim(), 1);
    else {
      setDebates(mockDebates);
      setCurrentPage(1);
      setHasMorePages(true);
      setRefreshing(false);
    }
  }, [searchQuery, performSearch]);

  const handleLoadMore = useCallback(() => {
    if (
      hasMorePages &&
      !searchLoading &&
      searchQuery.trim() &&
      currentPage < Infinity
    ) {
      performSearch(searchQuery.trim(), currentPage + 1);
    }
  }, [hasMorePages, searchLoading, searchQuery, currentPage, performSearch]);

  const handleJoinDebate = useCallback(
    async (debate: any) => {
      if (!token || !debate?.id) return;
      setJoiningDebateId(debate.id);

      try {
        router.push({
          pathname: "/(chat-room)/screen",
          params: {
            clerkId: userId,
            debateId: debate.id,
            debateImage: debate.debate?.image || "",
          },
        });
      } catch (err) {
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
          placeholder='Search debates...'
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

  const renderDebateCard = ({ item }: { item: any }) => (
    <View style={styles.cardContainer}>
      <LinearGradient
        colors={[THEME.colors.backgroundDarker, THEME.colors.background]}
        style={styles.card}
      >
        <Image source={{ uri: item.debate.image }} style={styles.debateImage} />

        <View style={styles.cardContent}>
          <Text style={styles.debateTitle} numberOfLines={2}>
            {item.debate.title}
          </Text>
          <Text style={styles.debateDescription} numberOfLines={3}>
            {item.debate.content}
          </Text>

          <View style={styles.creatorContainer}>
            <Image
              source={{ uri: item.debate.creator_image }}
              style={styles.creatorImage}
            />
            <View>
              <Text style={styles.creatorName}>Debate Creator</Text>
              <Text style={styles.creatorHandle}>@creator</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleJoinDebate(item)}
            disabled={joiningDebateId === item.id}
          >
            {joiningDebateId === item.id ? (
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
          ? `No debates found for "${searchQuery}".`
          : "Search for debates on topics you're interested in!"}
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color={THEME.colors.primary} />
        <Text style={styles.loadingText}>Loading debates...</Text>
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
          ListEmptyComponent={!loading && !searchLoading && renderEmptyState}
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
    paddingVertical: 16,
    padding: 4,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: THEME.colors.text,
    marginLeft: 12,
  },
  searchContainer: {
    paddingHorizontal: 16,
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
    borderColor: "rgba(255, 255, 255, 0.1)",
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
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
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
});

export default ExploreDebatesPage;
