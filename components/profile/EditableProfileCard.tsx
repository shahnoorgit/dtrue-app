import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

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
    textMuted: "#9CA3AB",
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

interface EditableProfileCardProps {
  user: User;
  onFollowersPress?: () => void;
  onFollowingPress?: () => void;
  onImagePress?: () => void;
  // Name editing
  isEditingName: boolean;
  newNameText: string;
  onNameTextChange: (text: string) => void;
  onStartEditName: () => void;
  onSaveName: () => void;
  onCancelNameEdit: () => void;
  updatingName: boolean;
  isCheckingUsername: boolean;
  isUsernameAvailable: boolean | null;
  usernameError: string;
  // Bio editing
  isEditingAbout: boolean;
  newAboutText: string;
  onAboutTextChange: (text: string) => void;
  onStartEditAbout: () => void;
  onSaveAbout: () => void;
  onCancelAboutEdit: () => void;
  updatingAbout: boolean;
}

const EditableProfileCard: React.FC<EditableProfileCardProps> = ({
  user,
  onFollowersPress,
  onFollowingPress,
  onImagePress,
  // Name editing
  isEditingName,
  newNameText,
  onNameTextChange,
  onStartEditName,
  onSaveName,
  onCancelNameEdit,
  updatingName,
  isCheckingUsername,
  isUsernameAvailable,
  usernameError,
  // Bio editing
  isEditingAbout,
  newAboutText,
  onAboutTextChange,
  onStartEditAbout,
  onSaveAbout,
  onCancelAboutEdit,
  updatingAbout,
}) => {
  const followersCount = user.followers?.length || 0;
  const followingCount = user.following?.length || 0;
  const debatesCount = user.created_debates?.length || 0;

  return (
    <View style={styles.cardContainer}>
      <View style={styles.profileCard}>
        <View style={styles.cardContent}>
          {/* Profile Picture */}
          <TouchableOpacity 
            style={styles.profileImageContainer}
            onPress={onImagePress}
          >
            <Image source={{ uri: user.image }} style={styles.profileImage} />
          </TouchableOpacity>

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
          {/* Name Section */}
          {isEditingName ? (
            <View style={styles.editContainer}>
              <TextInput
                style={styles.nameInput}
                value={newNameText}
                onChangeText={onNameTextChange}
                placeholder="Enter your name"
                placeholderTextColor={THEME.colors.textMuted}
                maxLength={100}
                autoFocus
              />
              {/* Username availability feedback */}
              {newNameText.trim() && newNameText.trim() !== user?.name && (
                <View style={styles.usernameFeedback}>
                  {isCheckingUsername ? (
                    <View style={styles.usernameStatus}>
                      <ActivityIndicator size="small" color={THEME.colors.primary} />
                      <Text style={styles.usernameStatusText}>Checking...</Text>
                    </View>
                  ) : isUsernameAvailable === true ? (
                    <View style={styles.usernameStatus}>
                      <Ionicons name="checkmark-circle" size={14} color="#00FF94" />
                      <Text style={[styles.usernameStatusText, { color: "#00FF94" }]}>Available</Text>
                    </View>
                  ) : isUsernameAvailable === false ? (
                    <View style={styles.usernameStatus}>
                      <Ionicons name="close-circle" size={14} color="#FF6B6B" />
                      <Text style={[styles.usernameStatusText, { color: "#FF6B6B" }]}>Taken</Text>
                    </View>
                  ) : null}
                  {usernameError && (
                    <Text style={styles.usernameErrorText}>{usernameError}</Text>
                  )}
                </View>
              )}
              <View style={styles.editButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onCancelNameEdit}
                  disabled={updatingName}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.saveButton, 
                    (updatingName || isCheckingUsername || (newNameText.trim() !== user?.name && isUsernameAvailable === false)) && styles.disabledButton
                  ]}
                  onPress={onSaveName}
                  disabled={updatingName || isCheckingUsername || (newNameText.trim() !== user?.name && isUsernameAvailable === false)}
                >
                  {updatingName ? (
                    <ActivityIndicator size="small" color={THEME.colors.primary} />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.nameDisplayContainer}>
              <Text style={styles.username}>@{user.name}</Text>
              <TouchableOpacity
                style={styles.editIconButton}
                onPress={onStartEditName}
              >
                <Ionicons name="create-outline" size={18} color={THEME.colors.primary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Bio Section */}
          <View style={styles.bioContainer}>
            {isEditingAbout ? (
              <View style={styles.editContainer}>
                <TextInput
                  style={styles.bioInput}
                  value={newAboutText}
                  onChangeText={onAboutTextChange}
                  placeholder="Tell us about yourself..."
                  placeholderTextColor={THEME.colors.textMuted}
                  multiline
                  maxLength={500}
                  autoFocus
                />
                <View style={styles.editButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={onCancelAboutEdit}
                    disabled={updatingAbout}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveButton, updatingAbout && styles.disabledButton]}
                    onPress={onSaveAbout}
                    disabled={updatingAbout}
                  >
                    {updatingAbout ? (
                      <ActivityIndicator size="small" color={THEME.colors.primary} />
                    ) : (
                      <Text style={styles.saveButtonText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.bioDisplayContainer}>
                {user.about ? (
                  <Text style={styles.bio}>{user.about}</Text>
                ) : (
                  <Text style={styles.bioPlaceholder}>No bio yet. Tap to add one.</Text>
                )}
                <TouchableOpacity
                  style={styles.editIconButton}
                  onPress={onStartEditAbout}
                >
                  <Ionicons name="create-outline" size={18} color={THEME.colors.primary} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
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
  bioPlaceholder: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    fontStyle: "italic",
    lineHeight: 20,
  },
  // Edit functionality styles
  editContainer: {
    marginBottom: THEME.spacing.sm,
  },
  nameInput: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.sm,
    padding: THEME.spacing.sm,
    color: THEME.colors.text,
    fontSize: 24,
    fontWeight: "bold",
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.xs,
  },
  bioInput: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.sm,
    padding: THEME.spacing.sm,
    color: THEME.colors.text,
    fontSize: 14,
    lineHeight: 20,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.xs,
    minHeight: 60,
    textAlignVertical: "top",
  },
  editButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: THEME.spacing.sm,
  },
  cancelButton: {
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.xs,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  cancelButtonText: {
    color: THEME.colors.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
  saveButton: {
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.xs,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.primary,
  },
  saveButtonText: {
    color: THEME.colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },
  nameDisplayContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: THEME.spacing.sm,
  },
  bioDisplayContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  editIconButton: {
    padding: THEME.spacing.xs,
    marginLeft: THEME.spacing.sm,
  },
  bioContainer: {
    marginTop: THEME.spacing.xs,
  },
  // Username feedback styles
  usernameFeedback: {
    marginBottom: THEME.spacing.xs,
  },
  usernameStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: THEME.spacing.xs,
  },
  usernameStatusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  usernameErrorText: {
    fontSize: 12,
    color: "#FF6B6B",
    fontWeight: "500",
  },
});

export default EditableProfileCard;
