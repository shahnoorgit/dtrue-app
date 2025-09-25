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
    textMuted: "#8F9BB3",
    searchBackground: "#1A2332",
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

const ExploreSkeleton = () => {
  return (
    <View style={styles.container}>
      {/* Render 3 skeleton debate cards */}
      {[...Array(3)].map((_, index) => (
        <View key={index} style={styles.cardContainer}>
          <View style={styles.card}>
            {/* Debate Image Skeleton */}
            <SkeletonElement style={styles.debateImage} />

            <View style={styles.cardContent}>
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

                {/* Right side meta info */}
                <View style={styles.metaRight}>
                  <SkeletonElement style={styles.joinedPill} />
                  <SkeletonElement style={styles.shareButton} />
                </View>
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
  debateImage: {
    width: "100%",
    height: 200,
  },
  cardContent: {
    padding: 16,
  },
  debateTitle: {
    width: "85%",
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
  metaRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  joinedPill: {
    width: 80,
    height: 24,
    borderRadius: 14,
  },
  shareButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
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

export default ExploreSkeleton;
