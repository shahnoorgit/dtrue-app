import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const THEME = {
  colors: {
    primary: "#00FF94",
    secondary: "#FF00E5",
    background: "#080F12",
    backgroundSecondary: "#1a1a1a",
    cardBackground: "#262626", // Original card background
    surface: "#333333",
    text: "#FFFFFF",
    textSecondary: "#a3a3a3",
    textMuted: "#8F9BB3",
    border: "#404040",
    success: "#10b981",
    followButtonBg: "#F5F5DC", // Light beige/off-white like in the image
    followButtonText: "#262626", // Dark text
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
  followers?: any[];
  following?: any[];
  created_debates?: any[];
  clerkId?: string;
}

interface ProfileCardProps {
  user: User;
  isFollowing?: boolean;
  onFollow?: () => void;
  onFollowersPress?: () => void;
  onFollowingPress?: () => void;
  onImagePress?: () => void;
  showFollowButton?: boolean;
  isCurrentUser?: boolean;
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  user,
  isFollowing = false,
  onFollow,
  onFollowersPress,
  onFollowingPress,
  onImagePress,
  showFollowButton = true,
  isCurrentUser = false,
}) => {
  const followersCount = user.followers?.length || 0;
  const followingCount = user.following?.length || 0;
  const debatesCount = user.created_debates?.length || 0;

  return (
    <View style={styles.cardContainer}>
      <View style={styles.profileCard}>
        <View style={styles.cardContent}>
          {/* Profile Picture */}
          <Pressable 
            style={styles.profileImageContainer}
            onPress={onImagePress}
            disabled={!onImagePress}
          >
            <Image source={{ uri: user.image }} style={styles.profileImage} />
          </Pressable>


          {/* Stats Section */}
          <View style={styles.statsContainer}>
            <Pressable
              onPress={onFollowersPress}
              style={styles.statItem}
              disabled={!onFollowersPress}
            >
              <Text style={styles.statNumber}>{followersCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </Pressable>
            
            <Pressable
              onPress={onFollowingPress}
              style={styles.statItem}
              disabled={!onFollowingPress}
            >
              <Text style={styles.statNumber}>{followingCount}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </Pressable>
            
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{debatesCount}</Text>
              <Text style={styles.statLabel}>Debates</Text>
            </View>
          </View>
        </View>

        {/* Username and Bio Section */}
        <View style={styles.userInfoSection}>
          <Text style={styles.username}>{user.name}</Text>
          {user.about && (
            <Text style={styles.bio} numberOfLines={3}>
              {user.about}
            </Text>
          )}
        </View>

        {/* Follow Button */}
        {showFollowButton && !isCurrentUser && (
          <TouchableOpacity
            style={[
              styles.followButton,
              isFollowing && styles.followingButton
            ]}
            onPress={onFollow}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.followButtonText,
              isFollowing && styles.followingButtonText
            ]}>
              {isFollowing ? "Following" : "Follow"}
            </Text>
          </TouchableOpacity>
        )}

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    // No padding - let it blend with outside
  },
  profileCard: {
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.xl,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.cardBackground,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: THEME.spacing.md,
  },
  profileImageContainer: {
    marginRight: THEME.spacing.lg,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: THEME.colors.text,
  },
  statsContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginTop: THEME.spacing.sm,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: THEME.colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    fontWeight: "500",
  },
  userInfoSection: {
    marginBottom: THEME.spacing.md,
  },
  username: {
    fontSize: 24,
    fontWeight: "bold",
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },
  bio: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
  },
  followButton: {
    backgroundColor: THEME.colors.followButtonBg,
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.lg,
    borderRadius: 25, // Pill-shaped
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  followingButton: {
    backgroundColor: THEME.colors.success, // Green when following
  },
  followButtonText: {
    color: THEME.colors.followButtonText,
    fontSize: 16,
    fontWeight: "700",
  },
  followingButtonText: {
    color: "#FFFFFF", // White text when following
  },
});

export default ProfileCard;
