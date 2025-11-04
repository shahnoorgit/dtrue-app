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
import { cyberpunkTheme } from "@/constants/theme";

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
    borderRadius: cyberpunkTheme.borderRadius.lg,
    padding: cyberpunkTheme.spacing.xl,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: cyberpunkTheme.colors.border.primary,
    backgroundColor: cyberpunkTheme.colors.background.surface,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: cyberpunkTheme.spacing.md,
  },
  profileImageContainer: {
    marginRight: cyberpunkTheme.spacing.lg,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: cyberpunkTheme.colors.text.primary,
  },
  statsContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginTop: cyberpunkTheme.spacing.sm,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: cyberpunkTheme.colors.text.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 14,
    color: cyberpunkTheme.colors.text.tertiary,
    fontWeight: "500",
  },
  userInfoSection: {
    marginBottom: cyberpunkTheme.spacing.md,
  },
  username: {
    fontSize: 24,
    fontWeight: "bold",
    color: cyberpunkTheme.colors.text.primary,
    marginBottom: cyberpunkTheme.spacing.xs,
  },
  bio: {
    fontSize: 14,
    color: cyberpunkTheme.colors.text.tertiary,
    lineHeight: 20,
  },
  followButton: {
    backgroundColor: cyberpunkTheme.colors.follow.button,
    paddingVertical: cyberpunkTheme.spacing.sm,
    paddingHorizontal: cyberpunkTheme.spacing.lg,
    borderRadius: 25, // Pill-shaped
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  followingButton: {
    backgroundColor: cyberpunkTheme.colors.semantic.success, // Green when following
  },
  followButtonText: {
    color: cyberpunkTheme.colors.follow.buttonText,
    fontSize: 16,
    fontWeight: "700",
  },
  followingButtonText: {
    color: "#FFFFFF", // White text when following
  },
});

export default ProfileCard;
