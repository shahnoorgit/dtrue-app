// components/profile/ProfileSkeleton.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const THEME = {
  colors: {
    primary: "#00FF94",
    background: "#03120F",
    backgroundSecondary: "#1a1a1a",
    cardBackground: "#262626", // Base color for skeleton
    surface: "#333333",
    text: "#FFFFFF",
    textSecondary: "#a3a3a3",
    textMuted: "#8F9BB3",
    border: "#404040",
    success: "#10b981",
    skeletonHighlight: "#3a3a3a", // Lighter shade for shine effect
    skeletonBase: "#1f1f1f", // Darker shade, close to cardBackground
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  borderRadius: { sm: 8, md: 12, lg: 16, xl: 24 },
};

const SkeletonElement = ({ style }: { style: any }) => (
  <View style={[styles.skeletonBase, style]}>
    <LinearGradient
      colors={[
        THEME.colors.skeletonBase,
        THEME.colors.skeletonHighlight,
        THEME.colors.skeletonBase,
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.shimmer}
    />
  </View>
);

const ProfileSkeleton = () => {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={styles.container}>
      <View style={[styles.headerSection, { paddingTop: insets.top }]}>
        <View style={styles.topButtonRow}>
          <SkeletonElement style={styles.navButtonSkeleton} />
          <View style={{ flex: 1 }} />
          <SkeletonElement style={styles.navButtonSkeleton} />
        </View>

        {/* Profile Image */}
        <View style={styles.profileImageContainer}>
          <SkeletonElement style={styles.profileImageSkeleton} />
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          {[...Array(3)].map((_, index) => (
            <View key={index} style={styles.statItem}>
              <SkeletonElement style={styles.statNumberSkeleton} />
              <SkeletonElement style={styles.statLabelSkeleton} />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.bioSection}>
        <SkeletonElement style={styles.nameSkeleton} />
        <SkeletonElement style={styles.bioLineSkeleton} />
        <SkeletonElement style={styles.bioLineSkeletonShort} />
        <View style={styles.additionalStatItem}>
          <SkeletonElement style={styles.calendarIconSkeleton} />
          <SkeletonElement style={styles.joinedTextSkeleton} />
        </View>
      </View>

      {/* Debates Header Skeleton */}
      <View style={styles.debatesHeader}>
        <SkeletonElement style={styles.debatesTitleSkeleton} />
      </View>

      {/* Debate Card Skeletons (3 items) */}
      {[...Array(3)].map((_, index) => (
        <View key={index} style={styles.debateCard}>
          <SkeletonElement style={styles.debateImageSkeleton} />

          <View style={styles.debateInfo}>
            <SkeletonElement style={styles.debateTitleSkeleton} />
            <SkeletonElement style={styles.debateDescriptionLineSkeleton} />
            <SkeletonElement
              style={styles.debateDescriptionLineSkeletonShort}
            />

            <View style={styles.debateMetrics}>
              {[...Array(3)].map((_, i) => (
                <View key={i} style={styles.metricItem}>
                  <SkeletonElement style={styles.metricIconSkeleton} />
                  <SkeletonElement style={styles.metricTextSkeleton} />
                </View>
              ))}
            </View>

            <View style={styles.keywordsContainer}>
              {[...Array(3)].map((_, i) => (
                <SkeletonElement key={i} style={styles.keywordTagSkeleton} />
              ))}
            </View>

            <SkeletonElement style={styles.enterButtonSkeleton} />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  // --- Header Section ---
  headerSection: {
    paddingTop: 0,
    paddingBottom: THEME.spacing.md,
    backgroundColor: THEME.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    alignItems: "center",
  },
  topButtonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    position: "absolute",
    top: 8,
    left: THEME.spacing.md,
    right: THEME.spacing.md,
    zIndex: 1,
  },
  navButtonSkeleton: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  profileImageContainer: {
    marginBottom: THEME.spacing.md,
  },
  profileImageSkeleton: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  statsContainer: {
    flexDirection: "row",
    marginBottom: THEME.spacing.lg,
    gap: THEME.spacing.xl,
  },
  statItem: {
    alignItems: "center",
  },
  statNumberSkeleton: {
    width: 40, // Approximate width for a number
    height: 24,
    marginBottom: 4,
    borderRadius: 4,
  },
  statLabelSkeleton: {
    width: 60, // Approximate width for label
    height: 14,
    borderRadius: 4,
  },
  // --- Bio Section ---
  bioSection: {
    backgroundColor: THEME.colors.background,
    padding: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  nameSkeleton: {
    width: "60%", // Approximate width for name
    height: 28,
    marginBottom: THEME.spacing.sm,
    borderRadius: 4,
  },
  bioLineSkeleton: {
    width: "100%",
    height: 16,
    marginBottom: THEME.spacing.sm,
    borderRadius: 4,
  },
  bioLineSkeletonShort: {
    width: "80%",
    height: 16,
    marginBottom: THEME.spacing.md,
    borderRadius: 4,
  },
  additionalStatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: THEME.spacing.sm,
  },
  calendarIconSkeleton: {
    width: 16,
    height: 16,
    borderRadius: 8, // Circle
  },
  joinedTextSkeleton: {
    width: "40%", // Approximate width for date text
    height: 14,
    borderRadius: 4,
  },
  // --- Debates Header ---
  debatesHeader: {
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.md,
    backgroundColor: THEME.colors.background,
  },
  debatesTitleSkeleton: {
    width: "50%", // Approximate width for title
    height: 20,
    borderRadius: 4,
  },
  // --- Debate Card ---
  debateCard: {
    marginVertical: THEME.spacing.sm,
    marginHorizontal: THEME.spacing.md,
    backgroundColor: THEME.colors.cardBackground,
    borderRadius: THEME.borderRadius.lg,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  debateImageSkeleton: {
    width: "100%",
    height: 200,
    borderRadius: 0, // No rounding for image container top
  },
  debateInfo: {
    padding: THEME.spacing.md,
  },
  debateTitleSkeleton: {
    width: "80%", // Approximate width for title
    height: 18,
    marginBottom: THEME.spacing.sm,
    borderRadius: 4,
  },
  debateDescriptionLineSkeleton: {
    width: "100%",
    height: 14,
    marginBottom: THEME.spacing.sm,
    borderRadius: 4,
  },
  debateDescriptionLineSkeletonShort: {
    width: "90%",
    height: 14,
    marginBottom: THEME.spacing.sm,
    borderRadius: 4,
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
  metricIconSkeleton: {
    width: 14,
    height: 14,
    borderRadius: 7, // Circle
  },
  metricTextSkeleton: {
    width: 20, // Approximate width for small number
    height: 12,
    borderRadius: 4,
  },
  keywordsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: THEME.spacing.xs,
    marginBottom: THEME.spacing.md,
  },
  keywordTagSkeleton: {
    width: 60, // Approximate width for tag
    height: 12,
    borderRadius: THEME.borderRadius.sm,
  },
  enterButtonSkeleton: {
    width: "100%",
    height: 44,
    borderRadius: THEME.borderRadius.md,
  },
  // --- Skeleton Base Styles ---
  skeletonBase: {
    backgroundColor: THEME.colors.skeletonBase,
    overflow: "hidden",
    position: "relative", // Needed for absolute shimmer
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    // Animation would typically be handled by Animated API or library
    // For now, it provides the gradient look
  },
});

export default ProfileSkeleton;
