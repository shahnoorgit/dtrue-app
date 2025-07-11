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

interface HeaderProps {
  timeRemaining: number | null;
  debateImage: string | null;
  setShowModal: (show: boolean) => void;
  debateTitle: string;
  opinions: any[];
  agreePct: number;
}

const Header: React.FC<HeaderProps> = ({
  timeRemaining,
  debateImage,
  setShowModal,
  debateTitle,
  opinions,
  agreePct,
}) => {
  const router = useRouter();
  const positivePct = Math.round(agreePct * 100);
  const negativePct = 100 - positivePct;

  return (
    <LinearGradient
      colors={["#222", "#111"]}
      start={[0, 0]}
      end={[0, 1]}
      style={styles.gradient}
    >
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.topRow}>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/rooms")}
            style={styles.backButton}
          >
            <Ionicons name='arrow-back' size={24} color='#FFF' />
          </TouchableOpacity>

          {debateImage && (
            <Image source={{ uri: debateImage }} style={styles.avatar} />
          )}

          <TouchableOpacity
            style={styles.titleContainer}
            onPress={() => setShowModal(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.titleText} numberOfLines={1}>
              {debateTitle}
            </Text>
            <View style={styles.subInfoRow}>
              <Text style={styles.subInfoText}>
                {opinions.length} opinions • Tap for details
              </Text>
              <View style={styles.timerBadge}>
                <Ionicons name='time-outline' size={14} color='#FFF' />
                <Text style={styles.timerText}>
                  {formatTimeRemaining(timeRemaining!)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.progressContainer}>
          <Text style={styles.progressLabel}>{positivePct}%</Text>
          <View style={styles.progressBarContainer}>
            <View style={{ flex: positivePct || 1, backgroundColor: "#FFF" }} />
            <View style={{ flex: negativePct || 1, backgroundColor: "#888" }} />
          </View>
          <Text style={styles.progressLabelSecondary}>{negativePct}%</Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default Header;

const styles = StyleSheet.create({
  gradient: {
    width: "100%",
    paddingBottom: 8,
  },
  safeArea: {},
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 60,
  },
  backButton: {
    padding: 8,
    borderRadius: 16,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginHorizontal: 12,
    borderWidth: 1,
    borderColor: "#FFF",
  },
  titleContainer: {
    flex: 1,
    justifyContent: "center",
  },
  titleText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 18,
  },
  subInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  subInfoText: {
    color: "#AAA",
    fontSize: 12,
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#333",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 10,
  },
  timerText: {
    color: "#FFF",
    fontSize: 12,
    marginLeft: 4,
    fontWeight: "600",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 10,
  },
  progressLabel: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
    width: 32,
    textAlign: "left",
  },
  progressBarContainer: {
    flex: 1,
    flexDirection: "row",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginHorizontal: 8,
  },
  progressLabelSecondary: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
    width: 32,
    textAlign: "right",
  },
});
