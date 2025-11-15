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
  Pressable,
  SafeAreaView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthToken } from "@/hook/clerk/useFetchjwtToken";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { logError } from "@/utils/sentry/sentry";
import { useError } from "@/contexts/ErrorContext";

// Theme (keeps your palette)
const THEME = {
  colors: {
    primary: "#00FF94",
    secondary: "#FF00E5",
    background: "#080F12",
    backgroundDarker: "#03120F",
    text: "#FFFFFF",
    textMuted: "#9CA3AB",
    textSecondary: "#6B7280",
    cardBorder: "#2A2D33",
    cardBackground: "#0F1419",
    unreadAccent: "#374151",
  },
};

interface Notification {
  id: string;
  userId: string;
  actorUserId: string | null;
  debateRoomId: string | null;
  title: string;
  body: string;
  data?: {
    deeplink?: string;
  } | null;
  image: string | null;
  isSeen: boolean;
  readAt: string | null;
  pushStatus: string | null;
  createdAt: string;
  actorUser?: {
    id: string;
    username?: string;
    image?: string;
  } | null;
  debateRoom?: {
    title?: string;
    id?: string;
    image?: string;
  } | null;
}

// Skeleton loader (unchanged)
const SkeletonCard = () => (
  <View style={styles.skeletonCard}>
    <View style={styles.skeletonImage} />
    <View style={styles.skeletonContent}>
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonDot} />
      </View>
      <View style={styles.skeletonBody} />
      <View style={styles.skeletonBodySecond} />
      <View style={styles.skeletonTime} />
    </View>
  </View>
);

const formatShort = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

const Header: React.FC<{ 
  onBack: () => void; 
  onReadAll: () => void;
  hasUnread: boolean;
  isMarkingAllAsRead: boolean;
}> = ({ onBack, onReadAll, hasUnread, isMarkingAllAsRead }) => {
  return (
    <SafeAreaView style={styles.headerSafe}>
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          style={styles.backButton}
          android_ripple={{ color: "rgba(255,255,255,0.06)", borderless: true }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel='Go back'
        >
          <Ionicons name='chevron-back' size={40} color={THEME.colors.text} />
        </Pressable>

        <Text style={styles.headerTitle}>Notifications</Text>

        {hasUnread && (
          <Pressable
            onPress={onReadAll}
            style={[styles.readAllButton, isMarkingAllAsRead && styles.readAllButtonDisabled]}
            disabled={isMarkingAllAsRead}
            android_ripple={{ color: "rgba(255,255,255,0.1)", borderless: true }}
          >
            {isMarkingAllAsRead ? (
              <ActivityIndicator size="small" color={THEME.colors.text} />
            ) : (
              <Text style={styles.readAllText}>Read All</Text>
            )}
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
};

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null);
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [token, refreshToken] = useAuthToken();
  const router = useRouter();
  const { userId } = useAuth() as unknown as { userId?: string | null };
  const { showError } = useError();

  const isMountedRef = useRef(true);
  const limit = 10;

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchNotifications = useCallback(
    async (page: number, isInitialLoad = false) => {
      if (!token) return;
      if (!hasMorePages && !isInitialLoad) return;

      if (isInitialLoad) {
        setLoading(true);
        setNotifications([]);
        setCurrentPage(1);
        setHasMorePages(true);
      } else {
        setLoadingMore(true);
      }
      setFetchError(null);

      try {
        const res = await fetch(
          `${process.env.EXPO_PUBLIC_BASE_URL}/notifications?page=${page}&limit=${limit}&isSeen=false`,
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

        if (json.success && json.data?.data) {
          setNotifications((prev) =>
            page === 1 ? json.data.data : [...prev, ...json.data.data]
          );
          setHasMorePages(Boolean(json.data.meta?.hasNextPage));
          setCurrentPage(page);
        } else {
          if (page === 1) setNotifications([]);
          setHasMorePages(false);
        }
      } catch (err: any) {
        if (!isMountedRef.current) return;
        setFetchError(err.message || "Failed to load notifications");
        logError(err, {
          context: "NotificationsPage.fetchNotifications",
          page,
        });
      } finally {
        if (!isMountedRef.current) return;
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [token, refreshToken, hasMorePages]
  );

  useEffect(() => {
    fetchNotifications(1, true);
  }, [token]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications(1, true);
  }, [fetchNotifications]);

  const handleLoadMore = useCallback(() => {
    if (hasMorePages && !loadingMore && !loading) {
      fetchNotifications(currentPage + 1);
    }
  }, [hasMorePages, loadingMore, loading, currentPage, fetchNotifications]);

  const markAsRead = useCallback(
    async (notificationId: string, event?: any) => {
      // Prevent event from bubbling to the card press
      if (event) {
        event.stopPropagation();
      }

      if (!token || markingAsRead === notificationId) return;

      setMarkingAsRead(notificationId);

      try {
        const res = await fetch(
          `${process.env.EXPO_PUBLIC_BASE_URL}/notifications/${notificationId}/seen`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (res.ok) {
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === notificationId
                ? { ...n, isSeen: true, readAt: new Date().toISOString() }
                : n
            )
          );
        } else {
          throw new Error(`Failed to mark as read: ${res.status}`);
        }
      } catch (error) {
        logError(error, {
          context: "NotificationsPage.markAsRead",
          notificationId,
        });
        console.warn("Failed to mark notification as read:", error);
        showError("Error", "Failed to mark notification as read", { type: 'error' });
      } finally {
        setMarkingAsRead(null);
      }
    },
    [token]
  );

  const markAllAsRead = useCallback(async () => {
    if (!token || markingAllAsRead) return;

    // Get all unread notification IDs
    const unreadNotificationIds = notifications
      .filter(notification => !notification.isSeen)
      .map(notification => notification.id);

    if (unreadNotificationIds.length === 0) return;

    setMarkingAllAsRead(true);

    try {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_BASE_URL}/notifications/mark-all-read`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            notificationIds: unreadNotificationIds,
          }),
        }
      );

      if (res.status === 401) {
        refreshToken();
        return;
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();
      if (json.success) {
        // Update all notifications to be marked as read
        setNotifications(prev =>
          prev.map(notification => ({
            ...notification,
            isSeen: true,
            readAt: new Date().toISOString(),
          }))
        );
      }
    } catch (error) {
      logError(error, {
        context: "NotificationsPage.markAllAsRead",
        notificationIds: unreadNotificationIds,
      });
      console.warn("Failed to mark all notifications as read:", error);
      showError("Error", "Failed to mark all notifications as read", { type: 'error' });
    } finally {
      setMarkingAllAsRead(false);
    }
  }, [token, notifications, markingAllAsRead, refreshToken, showError]);

  const handleNotificationPress = useCallback(
    async (notification: Notification) => {
      if (!notification.isSeen) {
        markAsRead(notification.id);
      }

      // Always navigate regardless of read status
      const deeplink = notification.data?.deeplink;
      if (deeplink) {
        const parts = deeplink.split("/");
        const type = parts[2];
        const id = parts[3];

        if (type === "debate" && id) {
          router.push({
            pathname: "/(chat-room)/screen",
            params: {
              clerkId: userId,
              debateId: id,
              debateImage: notification.debateRoom?.image || "",
            },
          });
          return;
        } else if (type === "profile" && id) {
          router.push({
            pathname: "/(tabs)/[id]/page",
            params: { id },
          });
          return;
        } else {
          console.warn("Unrecognized deeplink type:", deeplink);
        }
      } else if (notification.debateRoomId) {
        router.push({
          pathname: "/(chat-room)/screen",
          params: {
            clerkId: userId,
            debateId: notification.debateRoomId,
            debateImage: notification.debateRoom?.image || "",
          },
        });
        return;
      } else if (notification.actorUserId) {
        router.push({
          pathname: "/(tabs)/[id]/page",
          params: { id: notification.actorUserId },
        });
        return;
      } else {
        showError("Notification", notification.body, { type: 'info' });
      }
    },
    [router, userId, markAsRead]
  );

  const renderNotificationCard = ({ item }: { item: Notification }) => {
    // For debate notifications, show debate image first
    // For non-debate notifications, show actor profile image first
    const displayImage = item.debateRoom?.image 
      ? item.debateRoom.image 
      : item.actorUser?.image || item.image;
    const isUnread = !item.isSeen;
    const isMarkingThisAsRead = markingAsRead === item.id;

    return (
      <Pressable
        style={styles.cardContainer}
        onPress={() => handleNotificationPress(item)}
        android_ripple={{ color: "rgba(255,255,255,0.03)" }}
      >
        <View style={[styles.card, isUnread && styles.unreadCard]}>
          {displayImage && (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: displayImage }}
                style={styles.notificationImage}
              />
            </View>
          )}

          <View style={styles.cardContent}>
            <View style={styles.contentHeader}>
              <View style={styles.textContainer}>
                <Text
                  style={styles.notificationTitle}
                  numberOfLines={2}
                  ellipsizeMode='tail'
                >
                  {item.title}
                </Text>
                <Text
                  style={styles.notificationBody}
                  numberOfLines={2}
                  ellipsizeMode='tail'
                >
                  {item.body}
                </Text>
              </View>

              {isUnread && (
                <TouchableOpacity
                  style={styles.markAsReadButton}
                  onPress={(event) => markAsRead(item.id, event)}
                  disabled={isMarkingThisAsRead}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {isMarkingThisAsRead ? (
                    <ActivityIndicator
                      size='small'
                      color={THEME.colors.primary}
                    />
                  ) : (
                    <Ionicons
                      name='checkmark-circle-outline'
                      size={16}
                      color={THEME.colors.primary}
                    />
                  )}
                </TouchableOpacity>
              )}
            </View>
            
            <Text style={styles.notificationTime}>
              {formatShort(item.createdAt)}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderSkeletonLoader = () => (
    <View style={styles.skeletonContainer}>
      {Array.from({ length: 6 }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name='notifications-off-outline'
        size={48}
        color={THEME.colors.textSecondary}
      />
      <Text style={styles.emptyStateTitle}>No notifications yet</Text>
      <Text style={styles.emptyStateText}>
        When you get notifications, they'll show up here
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorState}>
      <Ionicons
        name='alert-circle-outline'
        size={48}
        color={THEME.colors.textSecondary}
      />
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorText}>{fetchError}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
        <Text style={styles.retryButtonText}>Try again</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFooter = () =>
    loadingMore ? (
      <View style={styles.footerLoader}>
        <ActivityIndicator size='small' color={THEME.colors.textSecondary} />
      </View>
    ) : null;

  // Check if there are any unread notifications
  const hasUnreadNotifications = notifications.some(notification => !notification.isSeen);

  if (loading && notifications.length === 0 && !refreshing) {
    return (
      <View style={styles.container}>
        <Header 
          onBack={() => router.push("/")} 
          onReadAll={markAllAsRead}
          hasUnread={false}
          isMarkingAllAsRead={false}
        />
        {renderSkeletonLoader()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header 
        onBack={() => router.push("/")} 
        onReadAll={markAllAsRead}
        hasUnread={hasUnreadNotifications}
        isMarkingAllAsRead={markingAllAsRead}
      />

      {fetchError && notifications.length === 0 && !loading ? (
        renderError()
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotificationCard}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[THEME.colors.textSecondary]}
              tintColor={THEME.colors.textSecondary}
            />
          }
          ListEmptyComponent={loading || loadingMore ? null : renderEmptyState}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={[
            styles.listContent,
            notifications.length === 0 && { flex: 1 },
          ]}
          initialNumToRender={10}
          windowSize={7}
          removeClippedSubviews={true}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  headerSafe: {
    backgroundColor: THEME.colors.background,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: "row",
    backgroundColor: THEME.colors.background,
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: THEME.colors.text,
    flex: 1,
  },
  readAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: THEME.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 70,
  },
  readAllButtonDisabled: {
    opacity: 0.6,
  },
  readAllText: {
    color: THEME.colors.background,
    fontSize: 12,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  cardContainer: {
    marginBottom: 8,
  },
  card: {
    backgroundColor: THEME.colors.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    flexDirection: "row",
    overflow: "hidden",
    minHeight: 70,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: THEME.colors.primary,
  },
  imageContainer: {
    width: 48,
    height: 48,
    marginRight: 10,
    borderRadius: 6,
    overflow: "hidden",
    alignSelf: "flex-start",
    marginTop: 1,
  },
  notificationImage: {
    width: "100%",
    height: "100%",
    backgroundColor: THEME.colors.backgroundDarker,
  },
  cardContent: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 2,
  },
  contentHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    marginBottom: 4,
  },
  textContainer: {
    flex: 1,
    marginRight: 6,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: THEME.colors.text,
    lineHeight: 18,
    marginBottom: 2,
  },
  notificationBody: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    lineHeight: 16,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    fontWeight: "500",
  },
  markAsReadButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: "rgba(0, 255, 148, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    minWidth: 28,
    minHeight: 28,
    alignSelf: "flex-start",
  },

  // Skeleton styles (updated for new layout)
  skeletonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  skeletonCard: {
    backgroundColor: THEME.colors.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    flexDirection: "row",
    marginBottom: 8,
    overflow: "hidden",
    minHeight: 70,
    padding: 12,
  },
  skeletonImage: {
    width: 48,
    height: 48,
    marginRight: 10,
    borderRadius: 6,
    backgroundColor: THEME.colors.backgroundDarker,
    alignSelf: "flex-start",
    marginTop: 1,
  },
  skeletonContent: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 2,
  },
  skeletonHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  skeletonTitle: {
    height: 20,
    backgroundColor: THEME.colors.backgroundDarker,
    borderRadius: 4,
    flex: 1,
    marginRight: 12,
  },
  skeletonDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.backgroundDarker,
  },
  skeletonBody: {
    height: 16,
    backgroundColor: THEME.colors.backgroundDarker,
    borderRadius: 4,
    marginBottom: 6,
  },
  skeletonBodySecond: {
    height: 16,
    backgroundColor: THEME.colors.backgroundDarker,
    borderRadius: 4,
    width: "70%",
    marginBottom: 8,
  },
  skeletonTime: {
    height: 14,
    backgroundColor: THEME.colors.backgroundDarker,
    borderRadius: 4,
    width: "40%",
  },

  footerLoader: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: THEME.colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  errorState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: THEME.colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 15,
    color: THEME.colors.textSecondary,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: THEME.colors.cardBackground,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: THEME.colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
});

export default NotificationsPage;