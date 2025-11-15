import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { cyberpunkTheme } from "@/constants/theme";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 24;
const IMAGE_HEIGHT = CARD_WIDTH * 0.6;

const SKELETON_THEME = {
  colors: {
    skeletonBase: "#1f1f1f",
    skeletonHighlight: "#3a3a3a",
  },
};

const SkeletonElement = ({ style }: { style: any }) => (
  <View style={[styles.skeletonBase, style]}>
    <LinearGradient
      colors={[
        SKELETON_THEME.colors.skeletonBase,
        SKELETON_THEME.colors.skeletonHighlight,
        SKELETON_THEME.colors.skeletonBase,
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.shimmer}
    />
  </View>
);

const FeedCardSkeleton = () => {
  return (
    <View style={styles.container}>
      {/* Render 3 skeleton feed cards */}
      {[...Array(3)].map((_, index) => (
        <View key={index} style={styles.cardWrapper}>
          <View style={styles.card}>
            {/* Image Section with Overlays */}
            <View style={styles.imageSection}>
              <SkeletonElement style={styles.debateImage} />
              
              {/* Category Badge (top-left overlay) */}
              <SkeletonElement style={styles.categoryBadge} />
              
              {/* Three Dots Menu (top-right overlay) */}
              <SkeletonElement style={styles.threeDotsMenu} />
            </View>

            {/* Card Content */}
            <View style={styles.cardContent}>
              {/* Creator Row */}
              <View style={styles.creatorRow}>
                <View style={styles.creatorSection}>
                  <SkeletonElement style={styles.creatorAvatar} />
                  <View style={styles.creatorInfo}>
                    <SkeletonElement style={styles.creatorName} />
                    <SkeletonElement style={styles.creatorLabel} />
                  </View>
                </View>
                <SkeletonElement style={styles.participantPill} />
              </View>

              {/* Title */}
              <SkeletonElement style={styles.title} />
              <SkeletonElement style={styles.titleShort} />

              {/* Creator Statement Box (UNIQUE FEATURE) */}
              <View style={styles.statementBox}>
                <SkeletonElement style={styles.statementLabel} />
                <SkeletonElement style={styles.statementText} />
                <SkeletonElement style={styles.statementTextShort} />
              </View>

              {/* Description */}
              <SkeletonElement style={styles.description} />
              <SkeletonElement style={styles.descriptionShort} />

              {/* Sub-category Tags */}
              <View style={styles.tagsContainer}>
                <SkeletonElement style={styles.tag} />
                <SkeletonElement style={styles.tag} />
                <SkeletonElement style={styles.tag} />
              </View>

              {/* Stats Row */}
              <View style={styles.statsRow}>
                <SkeletonElement style={styles.statItem} />
                <SkeletonElement style={styles.statItem} />
              </View>

              {/* Vote Distribution Bar (UNIQUE FEATURE) */}
              <View style={styles.voteSection}>
                <SkeletonElement style={styles.voteBar} />
                <View style={styles.voteLegend}>
                  <SkeletonElement style={styles.voteLegendItem} />
                  <SkeletonElement style={styles.voteLegendItem} />
                </View>
              </View>

              {/* Join Button */}
              <SkeletonElement style={styles.joinButton} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: cyberpunkTheme.colors.background.primary,
    paddingTop: 85, // HEADER_HEIGHT
    paddingBottom: 70, // Tab bar height
  },
  cardWrapper: {
    marginVertical: 16,
    marginHorizontal: 12,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    backgroundColor: cyberpunkTheme.colors.background.primary,
    borderWidth: 1,
    borderColor: cyberpunkTheme.colors.border.primary,
    overflow: "hidden",
  },
  
  // Image Section
  imageSection: {
    position: "relative",
    overflow: "hidden",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  debateImage: {
    width: "100%",
    height: IMAGE_HEIGHT,
  },
  categoryBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 80,
    height: 24,
    borderRadius: 6,
  },
  threeDotsMenu: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  
  // Card Content
  cardContent: {
    padding: 10,
  },
  
  // Creator Row
  creatorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  creatorSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  creatorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  creatorInfo: {
    marginLeft: 8,
  },
  creatorName: {
    width: 100,
    height: 14,
    borderRadius: 4,
    marginBottom: 4,
  },
  creatorLabel: {
    width: 50,
    height: 11,
    borderRadius: 4,
  },
  participantPill: {
    width: 90,
    height: 26,
    borderRadius: 12,
  },
  
  // Title
  title: {
    width: "90%",
    height: 20,
    borderRadius: 4,
    marginBottom: 6,
  },
  titleShort: {
    width: "60%",
    height: 20,
    borderRadius: 4,
    marginBottom: 10,
  },
  
  // Statement Box (UNIQUE to Feed)
  statementBox: {
    backgroundColor: "rgba(0, 255, 148, 0.08)",
    borderLeftWidth: 3,
    borderLeftColor: cyberpunkTheme.colors.primary,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  statementLabel: {
    width: 70,
    height: 10,
    borderRadius: 4,
    marginBottom: 4,
  },
  statementText: {
    width: "95%",
    height: 14,
    borderRadius: 4,
    marginBottom: 4,
  },
  statementTextShort: {
    width: "70%",
    height: 14,
    borderRadius: 4,
  },
  
  // Description
  description: {
    width: "100%",
    height: 14,
    borderRadius: 4,
    marginBottom: 4,
  },
  descriptionShort: {
    width: "80%",
    height: 14,
    borderRadius: 4,
    marginBottom: 10,
  },
  
  // Tags
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  tag: {
    width: 60,
    height: 22,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 2,
  },
  
  // Stats Row
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  statItem: {
    width: 100,
    height: 16,
    borderRadius: 4,
  },
  
  // Vote Section (UNIQUE to Feed)
  voteSection: {
    marginBottom: 10,
  },
  voteBar: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  voteLegend: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  voteLegendItem: {
    width: 90,
    height: 14,
    borderRadius: 4,
  },
  
  // Join Button
  joinButton: {
    width: "100%",
    height: 40,
    borderRadius: 8,
    marginTop: 8,
  },
  
  // Skeleton Base
  skeletonBase: {
    backgroundColor: SKELETON_THEME.colors.skeletonBase,
    overflow: "hidden",
    position: "relative",
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default FeedCardSkeleton;

