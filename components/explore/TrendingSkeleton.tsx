import React from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const THEME = {
  colors: {
    primary: "#00FF94",
    secondary: "#FF00E5",
    background: "#080F12",
    backgroundDarker: "#03120F",
    text: "#FFFFFF",
    textMuted: "#9CA3AB",
    skeletonBase: "#1f1f1f",
    skeletonHighlight: "#3a3a3a",
  },
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

const TrendingSkeleton = () => {
  return (
    <View style={styles.container}>
      {/* Render 3 skeleton trending debate cards */}
      {[...Array(3)].map((_, index) => (
        <View key={index} style={styles.cardContainer}>
          <View style={styles.card}>
            {/* Rank Badge Skeleton */}
            <SkeletonElement style={styles.rankBadge} />

            {/* Share Button Skeleton */}
            <SkeletonElement style={styles.shareButton} />

            {/* Debate Image Skeleton */}
            <SkeletonElement style={styles.debateImage} />

            <View style={styles.cardContent}>
              {/* Categories Skeleton */}
              <View style={styles.categoriesContainer}>
                <SkeletonElement style={styles.categoryTag} />
                <SkeletonElement style={styles.categoryTag} />
              </View>

              {/* Title Skeleton */}
              <SkeletonElement style={styles.debateTitle} />

              {/* Description Skeleton */}
              <SkeletonElement style={styles.debateDescription} />
              <SkeletonElement style={styles.debateDescriptionShort} />

              {/* Creator Info Skeleton */}
              <View style={styles.creatorContainer}>
                <SkeletonElement style={styles.creatorImage} />
                <View style={styles.creatorInfo}>
                  <SkeletonElement style={styles.creatorName} />
                  <SkeletonElement style={styles.creatorHandle} />
                </View>
                <SkeletonElement style={styles.timeAgo} />
              </View>

              {/* Stats Skeleton */}
              <View style={styles.statsContainer}>
                <SkeletonElement style={styles.statItem} />
              </View>

              {/* Action Button Skeleton */}
              <SkeletonElement style={styles.actionButton} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  cardContainer: {
    marginBottom: 20,
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: THEME.colors.backgroundDarker,
  },
  rankBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    zIndex: 1,
    width: 60,
    height: 30,
    borderRadius: 20,
  },
  shareButton: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  debateImage: {
    width: "100%",
    height: 200,
  },
  cardContent: {
    padding: 16,
  },
  categoriesContainer: {
    flexDirection: "row",
    marginBottom: 12,
  },
  categoryTag: {
    width: 80,
    height: 20,
    borderRadius: 12,
    marginRight: 8,
  },
  debateTitle: {
    width: "90%",
    height: 18,
    marginBottom: 8,
    borderRadius: 4,
  },
  debateDescription: {
    width: "100%",
    height: 14,
    marginBottom: 4,
    borderRadius: 4,
  },
  debateDescriptionShort: {
    width: "75%",
    height: 14,
    marginBottom: 16,
    borderRadius: 4,
  },
  creatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  creatorImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  creatorInfo: {
    flex: 1,
  },
  creatorName: {
    width: "60%",
    height: 14,
    marginBottom: 4,
    borderRadius: 4,
  },
  creatorHandle: {
    width: "40%",
    height: 12,
    borderRadius: 4,
  },
  timeAgo: {
    width: 50,
    height: 12,
    borderRadius: 4,
  },
  statsContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  statItem: {
    width: 60,
    height: 16,
    borderRadius: 4,
  },
  actionButton: {
    width: "100%",
    height: 44,
    borderRadius: 12,
  },
  skeletonBase: {
    backgroundColor: THEME.colors.skeletonBase,
    overflow: "hidden",
    position: "relative",
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default TrendingSkeleton;
