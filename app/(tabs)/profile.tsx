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
  ScrollView,
  Share,
  Pressable,
  Modal,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAuthToken } from "@/hook/clerk/useFetchjwtToken";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePathname, useRouter } from "expo-router";
import { useClerk } from "@clerk/clerk-expo";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import ProfileSkeleton from "@/components/profile/ProfileSkeliton";
import DebateGrid from "@/components/debate/DebateGrid";
import TabScreenWrapper from "./components/TabScreenWrapper";
import { logError } from "@/utils/sentry/sentry"; // Added Sentry import
import { invalidateUserCache } from "../_layout";
import {
  trackContentShared,
  trackProfileViewed,
  trackUserLoggedOut,
} from "@/lib/posthog/events";
import { useError } from "@/contexts/ErrorContext";

const THEME = {
  colors: {
    primary: "#00FF94",
    background: "#080F12",
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

// Logout Confirmation Modal Component
const LogoutConfirmationModal = ({ 
  visible, 
  onClose, 
  onConfirm, 
  isLoggingOut 
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoggingOut: boolean;
}) => {
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 0.8,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons
                name="log-out-outline"
                size={32}
                color={THEME.colors.primary}
              />
            </View>
            
            <Text style={styles.modalTitle}>Logout</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to logout? You'll need to sign in again to access your account.
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={onClose}
                disabled={isLoggingOut}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={onConfirm}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>Logout</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [debates, setDebates] = useState<Debate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  const [joiningDebateId, setJoiningDebateId] = useState<string | null>(null);
  
  const { showError } = useError();

  // Image update states
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [newImageUri, setNewImageUri] = useState<string | null>(null);
  const [newCloudUrl, setNewCloudUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [updating, setUpdating] = useState(false);

  // About/Bio update states
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [newAboutText, setNewAboutText] = useState("");
  const [updatingAbout, setUpdatingAbout] = useState(false);

  // Logout confirmation modal states
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Image options modal states
  const [showImageOptions, setShowImageOptions] = useState(false);
  
  // Image modal states
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [modalImageUri, setModalImageUri] = useState("");

  const pathname = usePathname();

  const [token, fetchToken] = useAuthToken();
  const route = useRoute();
  const navigation = useNavigation();
  const router = useRouter();
  const clerk = useClerk();
  const { username, userId } =
    (route.params as { username: string; userId: string }) || {};

  useEffect(() => {
    // Track profile view when user views their own profile
    if (username) {
      trackProfileViewed({
        profileId: userId || "",
        source: "own_profile",
        isOwnProfile: true,
      });
    }
  }, [userId, username]);

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

  // Share profile function
  const handleShareProfile = async () => {
    if (!user) return;
    trackContentShared({
      type: "profile",
      contentId: user.id,
      method: "native",
    });
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
      showError("Share Error", "Unable to share profile. Please try again.");
    }
  };

  // Permission request function
  const requestPermission = async (
    permissionFn: () => Promise<any>,
    errorMsg: string
  ) => {
    const { status } = await permissionFn();
    if (status !== "granted") {
      showError("Permission Required", errorMsg, { type: 'warning' });
      return false;
    }

    return true;
  };

  // Image compression helper
  const compressImage = async (
    uri: string,
    {
      maxWidth = 1080,
      compress = 0.8,
      format = ImageManipulator.SaveFormat.JPEG,
    } = {}
  ): Promise<{ uri: string; width?: number; height?: number }> => {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      { compress, format, base64: false }
    );
    return { uri: result.uri, width: result.width, height: result.height };
  };

  // Upload image to R2
  const uploadImageToR2 = async (uri: string) => {
    setUploading(true);
    try {
      // 1. Compress image first
      const compressed = await compressImage(uri, {
        maxWidth: 1080,
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
      });

      // 2. Generate a unique file key
      const name = uri.split("/").pop() || "profile.jpg";
      const key = `letsdebate-media/profiles/${Date.now()}_${name}`;

      // 3. Get signed URL from backend
      const response = await fetchWithAuthRetry(
        `${process.env.EXPO_PUBLIC_BASE_URL}/uploads/signed-url?filename=${key}&type=image/jpeg`
      );
      const data = await response.json();
      const signedUrl: string = data.data.signedUrl;

      // 4. Upload compressed image to R2
      try {
        const blob = await fetch(compressed.uri).then((r) => r.blob());
        const uploadRes = await fetch(signedUrl, {
          method: "PUT",
          headers: { "Content-Type": "image/jpeg" },
          body: blob,
        });
        if (!uploadRes.ok) {
          throw new Error("Upload failed");
        }
        // Image upload success - not critical for user behavior analysis
      } catch (error: any) {
        console.error("Image upload error:", error);
        // Log error to Sentry
        logError(error, {
          context: "ProfilePage.uploadImageToR2.upload",
          fileName: name,
        });
        throw error;
      }

      // 4. Construct public CDN URL
      const publicUrl = `https://dtrueimageworker.tech-10f.workers.dev/${key}`;
      setNewCloudUrl(publicUrl);
      setNewImageUri(uri);
      
      // 5. Automatically save to database after successful upload
      await handleSaveImageWithUrl(publicUrl);
    } catch (err: any) {
      console.error(err);
      // Log error to Sentry
      logError(err, {
        context: "ProfilePage.uploadImageToR2",
        uri: uri ? "[REDACTED_URI]" : "undefined",
      });
      showError("Upload Error", "Unable to upload image. Please try again.", { 
        type: 'error',
        showRetry: true,
        onRetry: () => uploadImageToR2(uri)
      });
    } finally {
      setUploading(false);
    }
  };

  // Pick image from library
  const pickImage = async () => {
    if (
      !(await requestPermission(
        ImagePicker.requestMediaLibraryPermissionsAsync,
        "Access to media library is needed."
      ))
    )
      return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Square aspect for profile image
      quality: 1,
    });

    if (!result.canceled) {
      await uploadImageToR2(result.assets[0].uri);
    }
  };

  // Take photo with camera
  const takePhoto = async () => {
    if (
      !(await requestPermission(
        ImagePicker.requestCameraPermissionsAsync,
        "Camera permission is needed."
      ))
    )
      return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1], // Square aspect for profile image
      quality: 1,
    });

    if (!result.canceled) {
      await uploadImageToR2(result.assets[0].uri);
    }
  };

  // Show image picker options
  const showImagePickerOptions = () => {
    // This will be handled by the image options modal instead of Alert
    setShowImageOptions(true);
  };

  // Save updated profile image with URL parameter
  const handleSaveImageWithUrl = async (imageUrl: string) => {
    setUpdating(true);
    try {
      // Get current token for the PATCH request
      let currentToken = token;
      if (!currentToken) {
        currentToken = await AsyncStorage.getItem("authToken");
        if (!currentToken) {
          await fetchToken();
          currentToken = await AsyncStorage.getItem("authToken");
        }
      }
      if (!currentToken) throw new Error("No authentication token available");

      // Make PATCH request to update profile image
      let response = await fetch(`${process.env.EXPO_PUBLIC_BASE_URL}/user`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${currentToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: imageUrl,
        }),
      });

      // Handle token refresh if needed
      if (response.status === 401) {
        await fetchToken();
        currentToken = await AsyncStorage.getItem("authToken");
        if (!currentToken) throw new Error("Token refresh failed");

        response = await fetch(
          `${process.env.EXPO_PUBLIC_BASE_URL}/user`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${currentToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              image: imageUrl,
            }),
          }
        );
      }

      if (!response.ok) {
        throw new Error(`Update failed: ${response.status}`);
      }

      const result = await response.json();

      console.log("API Response:", result);
      console.log("New Cloud URL:", imageUrl);
      console.log("Response Status:", response.status);

      // Check if the update was successful
      if (response.ok) {
        // Update local user state regardless of response format
        setUser((prev) => (prev ? { ...prev, image: imageUrl } : null));
        setIsEditingImage(false);
        setNewImageUri(null);
        setNewCloudUrl(null);
        showError("Success", "Profile image updated successfully!", { type: 'success' });
      } else {
        console.error("Update failed - Response:", result);
        throw new Error(result.message || result.error || "Update failed");
      }
    } catch (error: any) {
      console.error("Error updating profile image:", error);
      // Log error to Sentry
      logError(error, {
        context: "ProfilePage.handleSaveImageWithUrl",
        imageUrl: imageUrl ? "[REDACTED_URL]" : "undefined",
      });
      showError("Update Error", "Failed to update profile image. Please try again.", {
        type: 'error',
        showRetry: true,
        onRetry: () => handleSaveImageWithUrl(imageUrl)
      });
    } finally {
      setUpdating(false);
    }
  };

  // Save updated profile image (original function for manual saves)
  const handleSaveImage = async () => {
    if (!newCloudUrl) {
      showError("Validation Error", "Please select an image first.", { type: 'warning' });
      return;
    }
    await handleSaveImageWithUrl(newCloudUrl);
  };

  // Cancel image editing
  const handleCancelImageEdit = () => {
    setIsEditingImage(false);
    setNewImageUri(null);
    setNewCloudUrl(null);
  };

  // Open image modal
  const openImageModal = (uri: string) => {
    setModalImageUri(uri);
    setImageModalVisible(true);
  };

  // Close image modal
  const closeImageModal = () => {
    setImageModalVisible(false);
    setModalImageUri("");
  };

  // Start editing about section
  const handleStartEditAbout = () => {
    setNewAboutText(user?.about || "");
    setIsEditingAbout(true);
  };

  // Save updated about text
  const handleSaveAbout = async () => {
    if (!newAboutText.trim() && !user?.about) {
      showError("Validation Error", "Please enter some text for your bio.", { type: 'warning' });
      return;
    }

    setUpdatingAbout(true);
    try {
      // Get current token for the PATCH request
      let currentToken = token;
      if (!currentToken) {
        currentToken = await AsyncStorage.getItem("authToken");
        if (!currentToken) {
          await fetchToken();
          currentToken = await AsyncStorage.getItem("authToken");
        }
      }
      if (!currentToken) throw new Error("No authentication token available");

      // Make PATCH request to update about text
      let response = await fetch(
        `${process.env.EXPO_PUBLIC_BASE_URL}/user/about-update`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${currentToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            about: newAboutText.trim(),
          }),
        }
      );

      // Handle token refresh if needed
      if (response.status === 401) {
        await fetchToken();
        currentToken = await AsyncStorage.getItem("authToken");
        if (!currentToken) throw new Error("Token refresh failed");

        response = await fetch(
          `${process.env.EXPO_PUBLIC_BASE_URL}/user/about-update`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${currentToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              about: newAboutText.trim(),
            }),
          }
        );
      }

      if (!response.ok) {
        throw new Error(`Update failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Update local user state
        setUser((prev) =>
          prev ? { ...prev, about: newAboutText.trim() } : null
        );
        setIsEditingAbout(false);
        setNewAboutText("");
        showError("Success", "Bio updated successfully!", { type: 'success' });
      } else {
        throw new Error(result.message || "Update failed");
      }
    } catch (error: any) {
      console.error("Error updating about text:", error);
      // Log error to Sentry
      logError(error, {
        context: "ProfilePage.handleSaveAbout",
        newAboutTextLength: newAboutText.length,
      });
      showError("Update Error", "Failed to update bio. Please try again.", {
        type: 'error',
        showRetry: true,
        onRetry: () => handleSaveAbout()
      });
    } finally {
      setUpdatingAbout(false);
    }
  };

  // Cancel about editing
  const handleCancelAboutEdit = () => {
    setIsEditingAbout(false);
    setNewAboutText("");
  };

  const fetchProfileData = useCallback(async () => {
    if (!token && !dataFetched) return;
    setLoading(true);
    try {
      const [profileResponse, debatesResponse] = await Promise.all([
        fetchWithAuthRetry(`${process.env.EXPO_PUBLIC_BASE_URL}/user/profile`),
        fetchWithAuthRetry(
          `${process.env.EXPO_PUBLIC_BASE_URL}/debate-room/get-user-created-rooms`
        ),
      ]);
      const profileData = await profileResponse.json();
      const debatesData = await debatesResponse.json();
      if (profileData.success) setUser(profileData.data);
      if (debatesData.success) setDebates(debatesData.data);
      setDataFetched(true);
    } catch (error: any) {
      console.error("Error fetching profile data:", error);
      // Log error to Sentry
      logError(error, {
        context: "ProfilePage.fetchProfileData",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchWithAuthRetry, token, dataFetched]);

  useEffect(() => {
    if (token && !dataFetched) {
      fetchProfileData();
    }
  }, [token, dataFetched, fetchProfileData]);

  const onRefresh = () => {
    setRefreshing(true);
    setDataFetched(false);
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
            clerkId: userId,
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
          userId: userId ? "[REDACTED_USER_ID]" : "undefined",
        });
        showError("Join Error", "Unable to join debate. Please try again.", {
          type: 'error',
          showRetry: true,
          onRetry: () => handleJoinPress(debate)
        });
      } finally {
        setJoiningDebateId(null);
      }
    },
    [token, router, userId]
  );

  const handleLogoutPress = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    try {
      trackUserLoggedOut({
        reason: "manual",
      });
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await invalidateUserCache();
      await clerk.signOut();
      router.replace("/onboarding");
    } catch (error: any) {
      console.error("Error signing out:", error);
      // Log error to Sentry
      logError(error, {
        context: "ProfilePage.handleLogout",
      });
      showError("Logout Error", "Failed to logout. Please try again.", {
        type: 'error',
        showRetry: true,
        onRetry: () => handleLogoutConfirm()
      });
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
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
      <LinearGradient
        colors={['#080F12', '#0A1A1F', '#080F12']}
        style={styles.headerSection}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
        >
          <Ionicons name='chevron-back' size={24} color={THEME.colors.text} />
        </TouchableOpacity>

        <View style={styles.headerActions}>
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

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              handleLogoutPress();
            }}
            accessibilityLabel='Logout'
          >
            <Ionicons
              name='log-out-outline'
              size={24}
              color={THEME.colors.text}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowImageOptions(true);
              }}
            >
              <View style={styles.profileImageWrapper}>
                <Image
                  source={{ uri: newImageUri || user.image }}
                  style={styles.profileImage}
                />
                <View style={styles.profileImageBorder} />
                <View style={styles.profileImageShadow} />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.statsContainer}>
            <Pressable
              onPress={() => {
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
              style={styles.statItem}
            >
              <View style={styles.statItemContent}>
                <Text style={styles.statNumber}>
                  {user.followers?.length || 0}
                </Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({
                  pathname: "/(follow)/following/[id]/page",
                  params: {
                    id: user.id,
                    backTo: pathname,
                    username: user.username,
                    followersCount: user.followers?.length,
                    image: user.image,
                  },
                });
              }}
              style={styles.statItem}
            >
              <View style={styles.statItemContent}>
                <Text style={styles.statNumber}>
                  {user.following?.length || 0}
                </Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
            </Pressable>
            <View style={styles.statItem}>
              <View style={styles.statItemContent}>
                <Text style={styles.statNumber}>
                  {user.created_debates?.length || 0}
                </Text>
                <Text style={styles.statLabel}>Debates</Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>
      <View style={styles.bioSection}>
        <Text style={styles.name}>@{user.name}</Text>
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
      
      {/* Logout Confirmation Modal */}
      <LogoutConfirmationModal
        visible={showLogoutModal}
        onClose={handleLogoutCancel}
        onConfirm={handleLogoutConfirm}
        isLoggingOut={isLoggingOut}
      />

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
                  openImageModal(user?.image || "");
                }}
              >
                <Ionicons name="eye" size={24} color={THEME.colors.primary} />
                <Text style={styles.imageOptionText}>View Image</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.imageOptionButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowImageOptions(false);
                  showImagePickerOptions();
                }}
              >
                <Ionicons name="camera" size={24} color={THEME.colors.primary} />
                <Text style={styles.imageOptionText}>Upload Image</Text>
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
        <View style={styles.imageModalContainer}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              closeImageModal();
            }}
            activeOpacity={1}
          >
            <View style={styles.modalImageContainer}>
              <Image
                source={{ uri: modalImageUri }}
                style={styles.modalImage}
                resizeMode='contain'
              />
            </View>
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
        </View>
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
    paddingBottom: 100,
  },
  headerSection: {
    paddingTop: 50,
    paddingBottom: THEME.spacing.md,
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
    flexDirection: "row",
    gap: THEME.spacing.sm,
    zIndex: 1,
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
  logoutButton: {
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
  name: {
    fontSize: 28,
    fontWeight: "bold",
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
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
    marginBottom: THEME.spacing.lg,
  },
  createDebateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
    borderRadius: THEME.borderRadius.lg,
    gap: THEME.spacing.sm,
  },
  createDebateButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  editOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  editButtons: {
    flexDirection: "row",
    marginTop: 10,
    gap: 10,
    justifyContent: "center",
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 70,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: THEME.colors.textMuted,
  },
  saveButton: {
    backgroundColor: THEME.colors.primary,
  },
  cancelButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  saveButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: THEME.colors.cardBackground,
    borderRadius: 16,
    padding: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  modalContent: {
    padding: 24,
    alignItems: "center",
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(0, 255, 148, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: THEME.colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  modalCancelButton: {
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  modalConfirmButton: {
    backgroundColor: THEME.colors.primary,
  },
  modalCancelButtonText: {
    color: THEME.colors.text,
    fontWeight: "600",
    fontSize: 14,
  },
  modalConfirmButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
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
  // Enhanced Modal Styles
  imageModalContainer: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalImageContainer: {
    width: "90%",
    height: "70%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: THEME.colors.primary,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalImage: {
    width: "100%",
    height: "100%",
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
});

export default ProfilePage;
