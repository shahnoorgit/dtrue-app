import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { formatTimeRemaining } from "../utils";
import { trackContentShared } from "@/lib/posthog/events";

interface HeaderProps {
  timeRemaining: number | null;
  debateImage: string | null;
  setShowModal: (show: boolean) => void;
  debateTitle: string;
  opinions: any[];
  agreePct: number;
  onMenuPress?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  timeRemaining,
  debateImage,
  setShowModal,
  debateTitle,
  opinions,
  agreePct,
  onMenuPress,
}) => {
  const router = useRouter();
  const positivePct = Math.round(agreePct * 100);
  const negativePct = 100 - positivePct;

  return (
    <View style={styles.headerWrapper}>
      <LinearGradient
        colors={["rgba(26, 26, 26, 0.98)", "rgba(17, 17, 17, 0.95)"]}
        start={[0, 0]}
        end={[0, 1]}
        style={styles.gradient}
      >
        <SafeAreaView edges={["top"]} style={styles.safeArea}>
          {/* Compact Top Row */}
          <View style={styles.topRow}>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/rooms")}
              style={styles.backButton}
            >
              <Ionicons name='chevron-back' size={28} color='#FFF' />
            </TouchableOpacity>

            {debateImage && (
              <Image source={{ uri: debateImage }} style={styles.avatar} />
            )}

            <TouchableOpacity
              style={styles.titleContainer}
              onPress={() => setShowModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.titleRow}>
                <Text style={styles.titleText} numberOfLines={1}>
                  {debateTitle}
                </Text>
                <View style={styles.timerBadge}>
                  <Ionicons name='time-outline' size={11} color='rgba(255, 255, 255, 0.9)' />
                  <Text style={styles.timerText}>
                    {formatTimeRemaining(timeRemaining!)}
                  </Text>
                </View>
              </View>
              <Text style={styles.subInfoText}>
                {opinions.length} {opinions.length === 1 ? 'opinion' : 'opinions'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onMenuPress}
              style={styles.menuButton}
            >
              <Ionicons name='ellipsis-vertical' size={20} color='rgba(255, 255, 255, 0.8)' />
            </TouchableOpacity>
          </View>

          {/* Integrated Progress Bar */}
          <View style={styles.progressWrapper}>
            <View style={styles.progressContainer}>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressSegment, { flex: positivePct || 1, backgroundColor: "#00FF94" }]} />
                <View style={[styles.progressSegment, { flex: negativePct || 1, backgroundColor: "#FF4757" }]} />
              </View>
            </View>
            <View style={styles.progressLabels}>
              <View style={styles.labelGroup}>
                <View style={[styles.colorDot, { backgroundColor: "#00FF94" }]} />
                <Text style={[styles.progressLabel, { color: "#00FF94" }]}>{positivePct}%</Text>
              </View>
              <View style={styles.labelGroup}>
                <View style={[styles.colorDot, { backgroundColor: "#FF4757" }]} />
                <Text style={[styles.progressLabel, { color: "#FF4757" }]}>{negativePct}%</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
      <View style={styles.bottomShadow} />
    </View>
  );
};

export default Header;

const styles = StyleSheet.create({
  headerWrapper: {
    width: "100%",
  },
  gradient: {
    width: "100%",
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  safeArea: {},
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 50,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },
  menuButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  titleContainer: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  titleText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 16,
    flex: 1,
    letterSpacing: 0.2,
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  timerText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 10,
    marginLeft: 3,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  subInfoText: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 11,
    fontWeight: "400",
  },
  progressWrapper: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 8,
  },
  progressContainer: {
    marginBottom: 6,
  },
  progressBarContainer: {
    flexDirection: "row",
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  progressSegment: {
    height: "100%",
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  labelGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  colorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  bottomShadow: {
    height: 3,
    backgroundColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
});
