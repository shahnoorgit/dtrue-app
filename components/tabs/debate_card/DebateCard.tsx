import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  Easing,
  Image,
  useWindowDimensions,
  Alert,
  Share,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { cyberpunkTheme } from "@/constants/theme";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import { useAuthToken } from "@/hook/clerk/useFetchjwtToken";
import { router } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { trackDebateJoined, trackContentShared } from "@/lib/posthog/events";
import ThreeDotsMenu from "@/components/ui/ThreeDotsMenu";
import ReportModal from "@/components/ui/ReportModal";
import { getResponsiveCardWidth, getResponsivePadding, scaleFontSize } from "@/utils/responsive";

const DebateCard = ({ debate, onJoinPress }) => {
  const [loading, setLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const { userId } = useAuth();
  const navigation = useNavigation();
  const [token, refreshToken] = useAuthToken();
  const { width } = useWindowDimensions();
  
  // Responsive dimensions
  const CARD_WIDTH = useMemo(() => getResponsiveCardWidth(24), [width]);
  const IMAGE_HEIGHT = useMemo(() => CARD_WIDTH * 0.6, [CARD_WIDTH]);
  const cardPadding = useMemo(() => getResponsivePadding(10), [width]);

  // Create animations only once
  const spinValue = useMemo(() => new Animated.Value(0), []);
  const pulseValue = useMemo(() => new Animated.Value(0), []);

  // Memoize interpolations
  const spin = useMemo(
    () =>
      spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "360deg"],
      }),
    [spinValue]
  );

  const glowOpacity = useMemo(
    () =>
      pulseValue.interpolate({
        inputRange: [0.5, 1],
        outputRange: [0.3, 0.6],
      }),
    [pulseValue]
  );

  // Start and stop animations based on loading state
  useEffect(() => {
    let spinAnimation;
    let pulseAnimation;

    if (loading) {
      // Rotation animation
      spinAnimation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      spinAnimation.start();

      // Pulse animation for glow effect
      pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseValue, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(pulseValue, {
            toValue: 0.5,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      );
      pulseAnimation.start();
    }

    // Cleanup animations when component unmounts or loading state changes
    return () => {
      if (spinAnimation) spinAnimation.stop();
      if (pulseAnimation) pulseAnimation.stop();
    };
  }, [loading, spinValue, pulseValue]);

  // Memoize helper functions to prevent recreation on each render
  const formatTimeRemaining = useCallback((hours) => {
    if (hours < 1) return "Ending soon";
    if (hours < 24) return `${hours}h remaining`;
    return `${Math.floor(hours / 24)}d ${hours % 24}h remaining`;
  }, []);

  const getUrgencyColor = useCallback((hours) => {
    if (hours < 6) return cyberpunkTheme.colors.secondary;
    if (hours < 24) return cyberpunkTheme.colors.accent;
    return cyberpunkTheme.colors.primary;
  }, []);

  const calculateTimeRemaining = useCallback((createdAt, durationHours) => {
    const creationTime = new Date(createdAt).getTime();
    const expiryTime = creationTime + durationHours * 60 * 60 * 1000;
    const remainingMs = expiryTime - new Date().getTime();
    return Math.max(0, Math.ceil(remainingMs / (60 * 60 * 1000)));
  }, []);

  const formatCategory = useCallback(
    (category) =>
      category
        ?.replace(/_/g, " ")
        ?.toLowerCase()
        ?.replace(/\b\w/g, (c) => c.toUpperCase()) || "",
    []
  );

  // Memoize computed values that depend on debate data
  const timeRemaining = useMemo(
    () => calculateTimeRemaining(debate.createdAt, debate.duration),
    [debate.createdAt, debate.duration, calculateTimeRemaining]
  );

  const mainCategory = useMemo(
    () =>
      debate.categories && debate.categories.length > 0
        ? formatCategory(debate.categories[0])
        : "General",
    [debate.categories, formatCategory]
  );

  // Optimize join handler
  const handleJoinPress = useCallback(async () => {
    if (!token) {
      Alert.alert("Please wait", "Authenticating...");
      return;
    }
    
    // Track debate join
    trackDebateJoined({
      debateId: debate.id,
      source: 'feed',
      debateTitle: debate.title
    });

    setLoading(true);
    try {
      const response = await axios.post(
        `${process.env.EXPO_PUBLIC_BASE_URL}/debate-participant`,
        { roomId: debate.id },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status !== 201) {
        throw new Error("Unexpected status: " + response.status);
      }

      router.push({
        pathname: "/(chat-room)/screen",
        params: {
          clerkId: userId,
          debateId: debate.id,
          debateImage: debate.image,
        },
      });
    } catch (error) {
      const status = error.response?.status;
      if (status === 404) {
        // Token might be expired/invalid — refresh and retry once
        await refreshToken();
        return handleJoinPress();
      }
      console.error("Error joining debate:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message ||
          "Failed to join debate. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [token, refreshToken, debate.id]);

  // Share handler
  const handleShare = useCallback(
    async (e) => {
      // prevent parent Pressable from triggering
      e?.stopPropagation?.();

      // Track content share
      trackContentShared({
        type: 'debate',
        contentId: debate.id,
        method: 'native'
      });

      const base =
        process.env.EXPO_PUBLIC_SHARE_URL || "https://links.dtrue.online";
      const shareUrl = `${base}/debate/${debate.id}`;

      try {
        await Share.share({
          title: debate.title,
          message: `${debate.title}\n\nJoin the debate: ${shareUrl}`,
          url: shareUrl,
        });
      } catch (err) {
        console.error("Share error", err);
        Alert.alert("Could not share", "Please try again.");
      }
    },
    [debate.id, debate.title]
  );

  // Report handler
  const handleReport = useCallback(() => {
    setShowReportModal(true);
  }, []);

  // Menu options
  const menuOptions = [
    {
      id: 'share',
      label: 'Share',
      icon: 'share-outline' as const,
      onPress: handleShare,
    },
    {
      id: 'report',
      label: 'Report',
      icon: 'alert-circle-outline' as const,
      onPress: handleReport,
      destructive: true,
    },
  ];

  // Memoized CyberpunkSpinner component to avoid recreation
  const CyberpunkSpinner = useMemo(() => {
    if (!loading) return null;

    return (
      <View className='absolute inset-0 flex items-center justify-center bg-[#03120F] bg-opacity-90 z-10 rounded-lg'>
        <View className='items-center'>
          <View className='relative w-20 h-20 mb-4'>
            {/* Outer glow */}
            <Animated.View
              style={{ opacity: glowOpacity }}
              className='absolute inset-0 bg-[#00FF94] rounded-full opacity-20'
            />

            {/* Outer ring */}
            <View className='absolute inset-0 border-2 border-[#00FF94] rounded-full' />

            {/* Middle ring with gradient */}
            <View className='absolute inset-0 m-1.5 border-2 border-[#0097B5] rounded-full' />

            {/* Animated spinner arm */}
            <Animated.View
              style={{ transform: [{ rotate: spin }] }}
              className='absolute inset-0'
            >
              <View className='w-full h-full items-center justify-center'>
                <LinearGradient
                  colors={["#00FF94", "#0097B5"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className='w-1 h-10 rounded-full absolute top-0'
                />
                <View className='w-2 h-2 rounded-full bg-[#00FF94] absolute top-0' />
              </View>
            </Animated.View>

            {/* Inner circle with icon */}
            <View className='absolute inset-0 m-4 bg-[#03120F] rounded-full flex items-center justify-center'>
              <Icon name='atom' size={24} color='#00FF94' />
            </View>
          </View>

          <Text className='text-[#00FF94] font-bold text-base tracking-wider'>
            JOINING DEBATE
          </Text>

          <View className='flex-row mt-1'>
            <Text className='text-[#00FF94] text-lg'>.</Text>
            <Text className='text-[#00FF94] text-lg'>.</Text>
            <Text className='text-[#00FF94] text-lg'>.</Text>
          </View>
        </View>
      </View>
    );
  }, [loading, glowOpacity, spin]);

  return (
    <Pressable
      style={[
        {
          width: CARD_WIDTH,
          borderRadius: 16,
          backgroundColor: cyberpunkTheme.colors.background.primary,
          borderWidth: 1,
          borderColor: cyberpunkTheme.colors.border.primary,
          marginVertical: 16,
          marginHorizontal: 12, // Adjusted for wider card
          overflow: "hidden",
        },
      ]}
      onPress={() => !loading && onJoinPress && onJoinPress(debate)}
      disabled={loading}
    >
      {/* Loading spinner overlay */}
      {CyberpunkSpinner}

      <View
        style={{
          position: "relative",
          overflow: "hidden",
          borderTopLeftRadius: 14,
          borderTopRightRadius: 14,
        }}
      >
        <Image
          source={{ uri: debate.image }}
          style={{ width: "100%", height: IMAGE_HEIGHT }}
          resizeMode='cover'
        />

        <View
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 6,
            elevation: 3,
            backgroundColor: cyberpunkTheme.colors.primary,
          }}
        >
          <Text style={{ color: cyberpunkTheme.colors.text.inverse, fontSize: 12, fontWeight: "700" }}>
            {mainCategory}
          </Text>
        </View>

        {/* Three dots menu (top-right) */}
        <View
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            padding: 4,
            borderRadius: 999,
            backgroundColor: cyberpunkTheme.colors.primaryDark + "DD",
            elevation: 4,
          }}
        >
          <ThreeDotsMenu options={menuOptions} />
        </View>
      </View>

      <View style={{ padding: cardPadding }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <Pressable
            onPress={() => {
              router.push({
                pathname: "/(tabs)/[id]/page",
                params: { id: debate.creator.id },
              });
            }}
            hitSlop={8}
            style={{ flexDirection: "row", alignItems: "center" }}
          >
            <Image
              source={{ uri: debate.creator.image }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
              }}
            />
            <View style={{ marginLeft: 8 }}>
              <Text
                style={{ color: cyberpunkTheme.colors.text.secondary, fontWeight: "bold", fontSize: scaleFontSize(14, 13, 15), flexShrink: 1 }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {debate.creator.username}
              </Text>
              <Text style={{ color: cyberpunkTheme.colors.text.muted, fontSize: 11 }} numberOfLines={1}>Creator</Text>
            </View>
          </Pressable>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: cyberpunkTheme.colors.primaryDark,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 12,
            }}
          >
            <Icon
              name='account-group'
              size={12}
              color={cyberpunkTheme.colors.text.inverse}
              style={{ marginRight: 4 }}
            />
            <Text style={{ color: cyberpunkTheme.colors.text.inverse, fontSize: 12, fontWeight: "700" }}>
              {debate.participantCount} Joined
            </Text>
          </View>
        </View>

        <Text
          style={{
            color: cyberpunkTheme.colors.text.secondary,
            fontWeight: "bold",
            fontSize: scaleFontSize(20, 18, 22),
            marginBottom: 10,
            lineHeight: 26,
            flexShrink: 1,
          }}
          numberOfLines={3}
          ellipsizeMode="tail"
        >
          {debate.title}
        </Text>

        {/* Creator Statement - Prominent Display */}
        {debate.creator_statement && (
          <View
            style={{
              backgroundColor: "rgba(0, 255, 148, 0.08)",
              borderLeftWidth: 3,
              borderLeftColor: cyberpunkTheme.colors.primary,
              borderRadius: 8,
              padding: 10,
              marginBottom: 10,
            }}
          >
            <Text
              style={{
                color: cyberpunkTheme.colors.primary,
                fontSize: 10,
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 4,
              }}
            >
              Statement
            </Text>
            <Text
              style={{
                color: cyberpunkTheme.colors.text.secondary,
                fontSize: scaleFontSize(14, 13, 15),
                fontWeight: "600",
                lineHeight: 20,
                fontStyle: "italic",
                flexShrink: 1,
              }}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              "{debate.creator_statement}"
            </Text>
          </View>
        )}

        {debate.description && (
          <Text
            style={{
              color: cyberpunkTheme.colors.text.muted,
              fontSize: scaleFontSize(14, 13, 15),
              marginBottom: 10,
              lineHeight: 20,
              flexShrink: 1,
            }}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {debate.description}
          </Text>
        )}

        <View
          style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 10 }}
        >
          {debate.subCategories &&
            debate.subCategories.slice(0, 3).map((tag) => (
              <View
                key={tag}
                style={{
                  backgroundColor: cyberpunkTheme.colors.background.secondary,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 6,
                  marginRight: 8,
                  marginBottom: 2,
                  borderWidth: 1,
                  borderColor: cyberpunkTheme.colors.border.primary,
                }}
              >
                <Text
                  style={{
                    color: cyberpunkTheme.colors.text.secondary,
                    fontSize: 10,
                    fontWeight: "600",
                  }}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  #{formatCategory(tag).replace(/\s+/g, "")}
                </Text>
              </View>
            ))}
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 15,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Icon
              name='clock-outline'
              size={16}
              color={cyberpunkTheme.colors.text.secondary}
              style={{ opacity: 0.9 }}
            />
            <Text
              style={{
                marginLeft: 6,
                color: cyberpunkTheme.colors.text.secondary,
                fontSize: 12,
                fontWeight: "500",
              }}
            >
              {formatTimeRemaining(timeRemaining)}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Icon
              name='vote-outline'
              size={16}
              color={cyberpunkTheme.colors.text.secondary}
              style={{ opacity: 0.9 }}
            />
            <Text
              style={{
                marginLeft: 6,
                color: cyberpunkTheme.colors.text.secondary,
                fontSize: 12,
                fontWeight: "500",
              }}
            >
              {debate.vote_count} votes
            </Text>
          </View>
        </View>

        <View style={{ marginBottom: 10 }}>
          <View
            style={{
              flexDirection: "row",
              height: 8,
              borderRadius: 4,
              backgroundColor: "#222", // dark track
              overflow: "hidden",
              marginBottom: 4,
            }}
          >
            {/* Agreed segment */}
            <View
              style={{
                flex: debate.agreedCount || 1,
                backgroundColor: "#00FF94", // green for agree
              }}
            />

            {/* Disagreed segment */}
            <View
              style={{
                flex: debate.disagreedCount || 1,
                backgroundColor: "#FF4757", // red for disagree
              }}
            />
          </View>

          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: "#00FF94",
                  marginRight: 6,
                }}
              />
              <Text style={{ color: "#00FF94", fontSize: 12, fontWeight: "600" }}>
                {debate.agreedCount} Agreed
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: "#FF4757",
                  marginRight: 6,
                }}
              />
              <Text style={{ color: "#FF4757", fontSize: 12, fontWeight: "600" }}>
                {debate.disagreedCount} Disagreed
              </Text>
            </View>
          </View>
        </View>

        <Pressable onPress={handleJoinPress} disabled={loading}>
          <LinearGradient
            colors={cyberpunkTheme.colors.gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              paddingVertical: 12,
              marginTop: 8,
              borderRadius: 8,
              alignItems: "center",
            }}
          >
            <Text style={{ color: cyberpunkTheme.colors.text.inverse, fontSize: 14, fontWeight: "700" }}>
              {loading ? "CONNECTING..." : "JOIN DEBATE"}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Report Modal */}
      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        target={{
          debateRoomId: debate.id,
        }}
        targetTitle={`debate: "${debate.title}"`}
      />
    </Pressable>
  );
};

export default DebateCard;
