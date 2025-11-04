import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  Keyboard,
  SafeAreaView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthToken } from "@/hook/clerk/useFetchjwtToken";
import ProfileCard from "@/components/explore/profiles/profile-cards";
import { logError } from "@/utils/sentry/sentry";
import {
  trackSearchPerformed,
  trackProfileViewed,
} from "@/lib/posthog/events";
import { useError } from "@/contexts/ErrorContext";

const THEME = {
  colors: {
    primary: "#00FF94",
    secondary: "#FF00E5",
    background: "#080F12",
    backgroundDarker: "#03120F",
    text: "#FFFFFF",
    textMuted: "#9CA3AB",
    searchBackground: "#1A2332",
  },
};

const SearchScreen = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchTimeout = useRef<NodeJS.Timeout>();

  const [token, refreshToken] = useAuthToken();
  const router = useRouter();
  const { showError } = useError();

  // Profile search functionality
  const performProfileSearch = useCallback(
    async (query: string) => {
      if (!token || !query.trim()) {
        setSearchResults([]);
        return;
      }

      setSearchError(null);
      setSearchLoading(true);

      try {
        trackSearchPerformed({
          query: query,
          type: "profiles",
          resultsCount: 0,
        });

        const response = await fetch(
          `${process.env.EXPO_PUBLIC_BASE_URL}/user/account/${encodeURIComponent(query)}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.status === 401) {
          refreshToken();
          return;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const json = await response.json();
        if (json.success && json.data) {
          setSearchResults(json.data);
        } else {
          setSearchResults([]);
        }
      } catch (err: any) {
        console.error("Profile search error:", err);
        setSearchError(err.message || "Profile search failed");
        logError(err, {
          context: "SearchScreen.performProfileSearch",
          query: query ? "[REDACTED_QUERY]" : "undefined",
        });
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    },
    [token, refreshToken]
  );

  // Handle search query changes with debounce
  useEffect(() => {
    clearTimeout(searchTimeout.current!);
    if (searchQuery.trim()) {
      searchTimeout.current = setTimeout(() => {
        performProfileSearch(searchQuery.trim());
      }, 500);
    } else {
      setSearchResults([]);
      setSearchError(null);
    }
    return () => clearTimeout(searchTimeout.current!);
  }, [searchQuery]);

  const handleProfilePress = useCallback((profile: any) => {
    if (!profile?.id) return;
    trackProfileViewed({
      profileId: profile.id,
      source: "search_screen",
      isOwnProfile: false,
    });
    router.push({
      pathname: "/(tabs)/[id]/page",
      params: { id: profile.id },
    });
  }, [router]);

  const handleBackPress = () => {
    router.back();
  };

  const renderSearchHeader = () => (
    <LinearGradient
      colors={[THEME.colors.backgroundDarker, THEME.colors.background]}
      style={styles.header}
    >
      <View style={styles.headerContent}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <Ionicons name="arrow-back" size={24} color={THEME.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search People</Text>
        <View style={styles.placeholder} />
      </View>
      
      <View style={styles.searchInputContainer}>
        <Ionicons name='search' size={20} color={THEME.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by username..."
          placeholderTextColor={THEME.colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType='search'
          onSubmitEditing={Keyboard.dismiss}
          autoFocus
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
    </LinearGradient>
  );

  const renderEmptyState = () => {
    if (searchQuery.trim()) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name='search' size={64} color={THEME.colors.textMuted} />
          <Text style={styles.emptyStateTitle}>No Results Found</Text>
          <Text style={styles.emptyStateText}>
            No profiles found for "{searchQuery}". Try a different username.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Ionicons name='people' size={64} color={THEME.colors.textMuted} />
        <Text style={styles.emptyStateTitle}>Search People</Text>
        <Text style={styles.emptyStateText}>
          Enter a username to find and connect with other users.
        </Text>
      </View>
    );
  };

  const renderError = () => (
    <View style={styles.errorState}>
      <Ionicons name='alert-circle' size={64} color={THEME.colors.secondary} />
      <Text style={styles.errorTitle}>Search Error</Text>
      <Text style={styles.errorText}>{searchError}</Text>
      <TouchableOpacity 
        style={styles.retryButton} 
        onPress={() => performProfileSearch(searchQuery)}
      >
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderSearchHeader()}
      
      {searchError ? (
        renderError()
      ) : (
        <FlatList
          data={searchResults}
          renderItem={({ item }) => (
            <ProfileCard item={item} onPress={handleProfilePress} />
          )}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={[
            styles.listContent,
            searchResults.length === 0 && { flex: 1 },
          ]}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.searchBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: THEME.colors.text,
  },
  placeholder: {
    width: 40,
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
  searchInput: {
    flex: 1,
    color: THEME.colors.text,
    fontSize: 16,
    height: "100%",
    marginLeft: 8,
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
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
    paddingHorizontal: 32,
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
    lineHeight: 20,
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

export default SearchScreen;

