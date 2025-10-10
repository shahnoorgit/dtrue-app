import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Dimensions,
  Share,
  Pressable,
  Animated,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuthToken } from "@/hook/clerk/useFetchjwtToken";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, usePathname, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import ProfileSkeleton from "@/components/profile/ProfileSkeliton";
import DebateGrid from "@/components/debate/DebateGrid";
import TabScreenWrapper from "../components/TabScreenWrapper";
import ProfileCard from "@/components/profile/ProfileCard";
import { useAuth } from "@clerk/clerk-expo";
import { logError } from "@/utils/sentry/sentry"; // Added Sentry import

const { width, height } = Dimensions.get("window");

const THEME = {
  colors: {
    primary: "#00FF94",
    background: "#03120F",
    backgroundSecondary: "#1a1a1a",
    cardBackground: "#262626",
    surface: "#333333",
    text: "#FFFFFF",
    textSecondary: "#a3a3a3",
    textMuted: "#8F9BB3",
    border: "#404040",
    success: "#10b981",
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  borderRadius: { sm: 8, md: 12, lg: 16, xl: 24 },
};

interface User {
  id: string;
  name: string;
  username: string;
  clerkId: string;
  about: string;
  image: string;
  createdAt: string;
  following: any[];
  followers: any[];
  created_debates: Array<{
    _count: { participants: number; upvoted_by: number };
  }>;
}

interface Debate {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  image: string;
  duration: number;
  active: boolean;
  keywords: string[];
  upvotes: number;
  joinedUsers: number;
}

const DebateCard: React.FC<{
  item: Debate;
  onJoin: (item: Debate) => void;
  loading: boolean;
}> = ({ item, onJoin, loading }) => (
  <View style={styles.debateCard}>
    <View style={styles.debateImageContainer}>
      <Image source={{ uri: item.image }} style={styles.debateImage} />
      <View style={styles.debateStatus}>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: item.active
                ? THEME.colors.success
                : THEME.colors.textMuted,
            },
          ]}
        >
          <Text style={styles.statusText}>
            {item.active ? "Active" : "Ended"}
          </Text>
        </View>
      </View>
    </View>
    <View style={styles.debateInfo}>
      <Text style={styles.debateTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={styles.debateDescription} numberOfLines={2}>
        {item.description}
      </Text>
      <View style={styles.debateMetrics}>
        <View style={styles.metricItem}>
          <Ionicons name='people' size={14} color={THEME.colors.textMuted} />
          <Text style={styles.metricText}>{item.joinedUsers}</Text>
        </View>
        <View style={styles.metricItem}>
          <Ionicons name='arrow-up' size={14} color={THEME.colors.textMuted} />
          <Text style={styles.metricText}>{item.upvotes}</Text>
        </View>
        <View style={styles.metricItem}>
          <Ionicons name='time' size={14} color={THEME.colors.textMuted} />
          <Text style={styles.metricText}>{item.duration}h</Text>
        </View>
      </View>
      <View style={styles.keywordsContainer}>
        {item.keywords.slice(0, 3).map((keyword, index) => (
          <View key={index} style={styles.keywordTag}>
            <Text style={styles.keywordText}>{keyword}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity
        style={styles.enterButton}
        onPress={() => onJoin(item)}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size='small' color={THEME.colors.text} />
        ) : (
          <Text style={styles.enterButtonText}>Enter</Text>
        )}
      </TouchableOpacity>
    </View>
  </View>
);

const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [debates, setDebates] = useState<Debate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  const [joiningDebateId, setJoiningDebateId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [modalImageUri, setModalImageUri] = useState("");
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [token, fetchToken] = useAuthToken();
  const insets = useSafeAreaInsets();

  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const { userId } = useAuth();

  const fetchWithAuthRetry = useCallback(
    async (url: string): Promise<Response> => {
      let currentToken = token;
      if (!currentToken) {
        currentToken = await AsyncStorage.getItem("authToken");
        if (!currentToken) {
          await fetchToken();
          currentToken = await AsyncStorage.getItem("authToken");
        }
      }
      if (!currentToken) throw new Error("No authentication token available");
      let response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${currentToken}`,
          "Content-Type": "application/json",
        },
      });
      if (response.status === 401) {
        await fetchToken();
        currentToken = await AsyncStorage.getItem("authToken");
        if (!currentToken) throw new Error("Token refresh failed");
        response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${currentToken}`,
            "Content-Type": "application/json",
          },
        });
      }
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      return response;
    },
    [token, fetchToken]
  );

  const fetchProfileData = useCallback(async () => {
    if (!token && !dataFetched) return;
    setLoading(true);
    try {
      const [profileResponse, debatesResponse] = await Promise.all([
        fetchWithAuthRetry(
          `${process.env.EXPO_PUBLIC_BASE_URL}/user/profile/${id}`
        ),
        fetchWithAuthRetry(
          `${process.env.EXPO_PUBLIC_BASE_URL}/debate-room/get-user-created-rooms/${id}`
        ),
      ]);
      const profileData = await profileResponse.json();
      const debatesData = await debatesResponse.json();
      
      if (profileData.success) {
        setUser(profileData.data);
        // Check if I'm following them
        if (profileData.data.isFollowing) {
          setIsFollowing(true);
        }
      }
      if (debatesData.success) setDebates(debatesData.data);
      setDataFetched(true);
    } catch (error: any) {
      console.error("Error fetching profile data:", error);
      // Log error to Sentry
      logError(error, {
        context: "ProfilePage.fetchProfileData",
        userId: id ? "[REDACTED_USER_ID]" : "undefined",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchWithAuthRetry, token, dataFetched, id]);

  useEffect(() => {
    if (!token) return;
    fetchProfileData();
  }, [token, id]);

  const onRefresh = () => {
    setRefreshing(true);
    setDataFetched(false);
    setIsFollowing(false);
    fetchProfileData();
  };

  const handleJoinPress = useCallback(
    (debate: Debate) => {
      if (!token || !debate?.id) return;
      setJoiningDebateId(debate.id);
      try {
        router.push({
          pathname: "/(chat-room)/screen",
          params: {
            clerkId: id,
            debateId: debate.id,
            debateImage: debate.image || "",
          },
        });
      } catch (err: any) {
        console.error("Error joining debate:", err);
        // Log error to Sentry
        logError(err, {
          context: "ProfilePage.handleJoinPress",
          debateId: debate.id ? "[REDACTED_DEBATE_ID]" : "undefined",
          userId: id ? "[REDACTED_USER_ID]" : "undefined",
        });
        Alert.alert("Error", "Unable to join debate. Please try again.");
      } finally {
        setJoiningDebateId(null);
      }
    },
    [token, router, id]
  );

  const handleFollow = async () => {
    const url = `${process.env.EXPO_PUBLIC_BASE_URL}`;
    try {
      if (isFollowing) {
        const response = await fetch(`${url}/user/unfollow/${id}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (response.status == 401) {
          await fetchToken();
          return handleFollow();
        }
        const data = await response.json();
        if (data.success) {
          setIsFollowing(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        const response = await fetch(`${url}/user/follow/${id}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (response.status == 401) {
          await fetchToken();
          return handleFollow();
        }
        const data = await response.json();
        if (data.success) {
          setIsFollowing(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (error: any) {
      console.error("Error handling follow action:", error);
      // Log error to Sentry
      logError(error, {
        context: "ProfilePage.handleFollow",
        userId: id ? "[REDACTED_USER_ID]" : "undefined",
        action: isFollowing ? "unfollow" : "follow",
      });
      Alert.alert("Error", "Unable to follow/unfollow user. Please try again.");
    }
  };

  const handleShareProfile = async () => {
    if (!user) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const shareUrl = `${process.env.EXPO_PUBLIC_SHARE_URL}/profile/${user.id}`;
      const shareMessage = `Check out @${user.name}'s profile on Dtrue!\n\n${shareUrl}`;

      await Share.share({
        message: shareMessage,
        url: shareUrl,
        title: `@${user.name}'s Profile`,
      });
    } catch (error: any) {
      console.error("Error sharing profile:", error);
      // Log error to Sentry
      logError(error, {
        context: "ProfilePage.handleShareProfile",
        userId: user.id ? "[REDACTED_USER_ID]" : "undefined",
      });
      Alert.alert("Error", "Unable to share profile. Please try again.");
    }
  };

  const openImageModal = (uri: string) => {
    setModalImageUri(uri);
    setImageModalVisible(true);
  };

  const closeImageModal = () => {
    setImageModalVisible(false);
    setModalImageUri("");
  };

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons
          name='person-outline'
          size={48}
          color={THEME.colors.textMuted}
        />
        <Text style={styles.errorText}>User not found</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setDataFetched(false);
            fetchProfileData();
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderHeader = () => (
    <View>
      {/* Navigation Header */}
      <View style={[styles.navigationHeader, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 8 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <Ionicons name='chevron-back' size={24} color={THEME.colors.text} />
        </TouchableOpacity>

        <View style={[styles.headerActions, { top: insets.top + 8 }]}>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              handleShareProfile();
            }}
            accessibilityLabel='Share Profile'
          >
            <Ionicons
              name='share-social-sharp'
              size={24}
              color={THEME.colors.text}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Profile Card */}
      <View style={styles.profileCardContainer}>
        <ProfileCard
        user={user}
        isFollowing={isFollowing}
        onFollow={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          handleFollow();
        }}
        onFollowersPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push({
            pathname: "/(follow)/followers/[id]/page",
            params: {
              id: user.id,
              username: user.username,
              followersCount: user.followers?.length,
              image: user.image,
              backTo: pathname,
            },
          });
        }}
        onFollowingPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push({
            pathname: "/(follow)/following/[id]/page",
            params: {
              id: user.id,
              username: user.username,
              followersCount: user.followers?.length,
              image: user.image,
              backTo: pathname,
            },
          });
        }}
        onImagePress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          openImageModal(user.image);
        }}
        showFollowButton={user.clerkId !== userId}
        isCurrentUser={user.clerkId === userId}
        />
      </View>

      {/* Additional Info */}
      <View style={styles.additionalInfoSection}>
        <View style={styles.additionalStatItem}>
          <Ionicons name='calendar' size={16} color={THEME.colors.textMuted} />
          <Text style={styles.additionalStatText}>
            Joined {new Date(user.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View style={styles.debatesHeader}>
        <Text style={styles.debatesTitle}>Debates ({debates.length})</Text>
      </View>
    </View>
  );

  return (
    <TabScreenWrapper>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[THEME.colors.primary]}
            tintColor={THEME.colors.primary}
          />
        }
      >
        {renderHeader()}
        <DebateGrid
          debates={debates}
          onDebatePress={handleJoinPress}
          loading={loading}
        />
      </ScrollView>

      {/* Image Options Modal */}
      <Modal
        visible={showImageOptions}
        transparent={true}
        onRequestClose={() => setShowImageOptions(false)}
        animationType="fade"
      >
        <View style={styles.imageOptionsOverlay}>
          <View style={styles.imageOptionsContainer}>
            <View style={styles.imageOptionsHeader}>
              <Text style={styles.imageOptionsTitle}>Profile Image</Text>
              <TouchableOpacity
                onPress={() => setShowImageOptions(false)}
                style={styles.imageOptionsCloseButton}
              >
                <Ionicons name="close" size={24} color={THEME.colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.imageOptionsContent}>
              <TouchableOpacity
                style={styles.imageOptionButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowImageOptions(false);
                  openImageModal(user.image);
                }}
              >
                <Ionicons name="eye" size={24} color={THEME.colors.primary} />
                <Text style={styles.imageOptionText}>View Image</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Enhanced Image Modal */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        onRequestClose={closeImageModal}
        animationType="fade"
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            closeImageModal();
          }}
          activeOpacity={1}
        >
          <Image
            source={{ uri: modalImageUri }}
            style={styles.modalImage}
            resizeMode='contain'
          />
          <TouchableOpacity
            style={styles.closeModalButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              closeImageModal();
            }}
          >
            <Ionicons name='close' size={30} color='#FFFFFF' />
          </TouchableOpacity>
          <View style={styles.modalInfo}>
            <Text style={styles.modalInfoText}>Tap to close</Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </TabScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: THEME.colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: THEME.colors.textSecondary,
    fontWeight: "500",
    marginTop: THEME.spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: THEME.colors.background,
    paddingHorizontal: THEME.spacing.xl,
  },
  errorText: {
    fontSize: 18,
    color: THEME.colors.textSecondary,
    fontWeight: "600",
    marginTop: THEME.spacing.md,
    marginBottom: THEME.spacing.lg,
  },
  retryButton: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
  },
  retryButtonText: {
    color: THEME.colors.text,
    fontWeight: "600",
    fontSize: 16,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  navigationHeader: {
    paddingTop: 0,
    paddingBottom: THEME.spacing.md,
    position: 'relative',
  },
  headerSection: {
    paddingTop: 0,
    paddingBottom: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  backButton: {
    position: "absolute",
    left: THEME.spacing.md,
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.cardBackground,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  headerActions: {
    position: "absolute",
    right: THEME.spacing.md,
    zIndex: 1,
    flexDirection: "row",
    gap: THEME.spacing.sm,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.cardBackground,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  profileSection: {
    alignItems: "center",
    paddingHorizontal: THEME.spacing.md,
    marginTop: 20,
  },
  profileImageContainer: {
    position: "relative",
    marginBottom: THEME.spacing.md,
  },
  profileImageWrapper: {
    position: "relative",
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  profileImageBorder: {
    position: "absolute",
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 64,
    borderWidth: 3,
    borderColor: THEME.colors.primary,
  },
  profileImageShadow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    shadowColor: THEME.colors.primary,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  statsContainer: {
    flexDirection: "row",
    marginBottom: THEME.spacing.lg,
    gap: THEME.spacing.xl,
  },
  statItem: {
    alignItems: "center",
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: 'rgba(0, 255, 148, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 148, 0.1)',
  },
  statItemContent: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: THEME.colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    fontWeight: "500",
  },
  bioSection: {
    backgroundColor: THEME.colors.background,
    padding: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: THEME.spacing.sm,
  },
  name: {
    fontSize: 28,
    fontWeight: "bold",
    color: THEME.colors.text,
  },
  followButton: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
  },
  followingButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  followButtonText: {
    color: THEME.colors.text,
    fontWeight: "700",
    fontSize: 16,
  },
  followingButtonText: {
    color: THEME.colors.textSecondary,
  },
  bio: {
    fontSize: 16,
    color: THEME.colors.textSecondary,
    lineHeight: 24,
    marginBottom: THEME.spacing.md,
  },
  profileCardContainer: {
    marginTop: THEME.spacing.xl + 20, // More space below navigation icons
    paddingHorizontal: THEME.spacing.md,
  },
  additionalInfoSection: {
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    backgroundColor: THEME.colors.background,
  },
  additionalStatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: THEME.spacing.sm,
  },
  additionalStatText: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    fontWeight: "500",
  },
  debatesHeader: {
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.md,
    backgroundColor: THEME.colors.background,
  },
  debatesTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: THEME.colors.text,
  },
  debateCard: {
    marginVertical: THEME.spacing.sm,
    marginHorizontal: THEME.spacing.md,
    backgroundColor: THEME.colors.cardBackground,
    borderRadius: THEME.borderRadius.lg,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  debateImageContainer: {
    position: "relative",
  },
  debateImage: {
    width: "100%",
    height: 200,
  },
  debateStatus: {
    position: "absolute",
    top: THEME.spacing.sm,
    right: THEME.spacing.sm,
    zIndex: 1,
  },
  statusBadge: {
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.sm,
  },
  statusText: {
    color: THEME.colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  debateInfo: {
    padding: THEME.spacing.md,
  },
  debateTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
    lineHeight: 24,
  },
  debateDescription: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
    marginBottom: THEME.spacing.sm,
  },
  debateMetrics: {
    flexDirection: "row",
    gap: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
  },
  metricItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metricText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontWeight: "600",
  },
  keywordsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: THEME.spacing.xs,
    marginBottom: THEME.spacing.md,
  },
  keywordTag: {
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.sm,
  },
  keywordText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontWeight: "500",
  },
  enterButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: THEME.colors.primary,
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.lg,
    borderRadius: THEME.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  enterButtonText: {
    color: THEME.colors.primary,
    fontWeight: "700",
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: THEME.spacing.xl,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 255, 148, 0.1)',
    justifyContent: "center",
    alignItems: "center",
    marginBottom: THEME.spacing.md,
    borderWidth: 2,
    borderColor: 'rgba(0, 255, 148, 0.2)',
  },
  emptyText: {
    fontSize: 20,
    color: THEME.colors.text,
    marginTop: THEME.spacing.md,
    fontWeight: "bold",
    textAlign: "center",
  },
  emptySubText: {
    fontSize: 16,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.sm,
    textAlign: "center",
    lineHeight: 24,
  },
  // Enhanced Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalImage: {
    width: width,
    height: height * 0.8,
  },
  closeModalButton: {
    position: "absolute",
    top: 50,
    right: 20,
    padding: 12,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  modalInfo: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  modalInfoText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    fontWeight: "500",
  },
  // Image Options Modal Styles
  imageOptionsOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageOptionsContainer: {
    backgroundColor: THEME.colors.cardBackground,
    borderRadius: THEME.borderRadius.lg,
    width: "80%",
    maxWidth: 300,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  imageOptionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  imageOptionsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: THEME.colors.text,
  },
  imageOptionsCloseButton: {
    padding: 4,
  },
  imageOptionsContent: {
    padding: THEME.spacing.md,
  },
  imageOptionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: "rgba(0, 255, 148, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(0, 255, 148, 0.1)",
    marginBottom: THEME.spacing.sm,
  },
  imageOptionText: {
    marginLeft: THEME.spacing.md,
    fontSize: 16,
    fontWeight: "500",
    color: THEME.colors.text,
  },
});

export default ProfilePage;
