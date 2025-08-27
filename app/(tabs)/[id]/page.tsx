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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthToken } from "@/hook/clerk/useFetchjwtToken";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, usePathname, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import ProfileSkeleton from "@/components/profile/ProfileSkeliton";
import { useAuth } from "@clerk/clerk-expo";

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
  const [token, fetchToken] = useAuthToken();

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
      if (profileData.success) setUser(profileData.data);
      if (debatesData.success) setDebates(debatesData.data);
      if (profileData.data.isFollowing) {
        setIsFollowing(true);
      }
      setDataFetched(true);
    } catch (error) {
      console.error("Error fetching profile data:", error);
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
    fetchProfileData();
  };

  const handleJoinPress = useCallback(
    async (debate: Debate) => {
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
      } catch (err) {
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
    } catch (error) {
      console.error("Error handling follow action:", error);
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
    } catch (error) {
      console.error("Error sharing profile:", error);
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
      <View style={styles.headerSection}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name='chevron-back' size={24} color={THEME.colors.text} />
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShareProfile}
            accessibilityLabel='Share Profile'
          >
            <Ionicons
              name='share-social-sharp'
              size={24}
              color={THEME.colors.text}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.profileSection}>
          <TouchableOpacity
            style={styles.profileImageContainer}
            onPress={() => openImageModal(user.image)}
          >
            <Image source={{ uri: user.image }} style={styles.profileImage} />
            <View style={styles.profileImageBorder} />
          </TouchableOpacity>
          <View style={styles.statsContainer}>
            <Pressable
              onPress={() => {
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
              style={styles.statItem}
            >
              <Text style={styles.statNumber}>
                {user.followers?.length || 0}
              </Text>
              <Text style={styles.statLabel}>Followers</Text>
            </Pressable>
            <Pressable
              onPress={() => {
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
              style={styles.statItem}
            >
              <Text style={styles.statNumber}>
                {user.following?.length || 0}
              </Text>
              <Text style={styles.statLabel}>Following</Text>
            </Pressable>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {user.created_debates?.length || 0}
              </Text>
              <Text style={styles.statLabel}>Debates</Text>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.bioSection}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>@{user.name}</Text>
          {user.clerkId === userId ? (
            ""
          ) : (
            <TouchableOpacity
              style={[
                styles.followButton,
                isFollowing && styles.followingButton,
              ]}
              onPress={handleFollow}
            >
              <Text
                style={[
                  styles.followButtonText,
                  isFollowing && styles.followingButtonText,
                ]}
              >
                {isFollowing ? "Following" : "Follow"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {user.about && <Text style={styles.bio}>{user.about}</Text>}
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
    <View style={styles.container}>
      <FlatList
        data={debates}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DebateCard
            item={item}
            onJoin={handleJoinPress}
            loading={joiningDebateId === item.id}
          />
        )}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[THEME.colors.primary]}
            tintColor={THEME.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name='chatbubbles-outline'
              size={64}
              color={THEME.colors.textMuted}
            />
            <Text style={styles.emptyText}>No debates created yet</Text>
            <Text style={styles.emptySubText}>
              User has not created any debates yet. Check back later!
            </Text>
          </View>
        }
      />

      {/* Image Modal */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        onRequestClose={closeImageModal}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={closeImageModal}
            activeOpacity={1}
          >
            <Image
              source={{ uri: modalImageUri }}
              style={styles.modalImage}
              resizeMode='contain'
            />
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={closeImageModal}
            >
              <Ionicons name='close' size={30} color='#FFFFFF' />
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
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
  headerSection: {
    paddingTop: 50,
    paddingBottom: THEME.spacing.md,
    backgroundColor: THEME.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  backButton: {
    position: "absolute",
    top: 50,
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
    top: 50,
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
  statsContainer: {
    flexDirection: "row",
    marginBottom: THEME.spacing.lg,
    gap: THEME.spacing.xl,
  },
  statItem: {
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
  emptyText: {
    fontSize: 18,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.md,
    fontWeight: "600",
    textAlign: "center",
  },
  emptySubText: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    marginTop: THEME.spacing.sm,
    textAlign: "center",
    lineHeight: 20,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalImage: {
    width: width * 0.9,
    height: height * 0.7,
  },
  closeModalButton: {
    position: "absolute",
    top: 50,
    right: 20,
    padding: 10,
  },
});

export default ProfilePage;
