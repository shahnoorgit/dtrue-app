import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { formatTimeRemaining } from "../utils";

interface ModalSheetProps {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  debateImage: string | null;
  debateTitle: string;
  creatorStatement?: string;
  debateDescription: string | null;
  timeRemaining: number | null;
  opinions: any[];
  agreePct: number;
  insets: { top: number; bottom: number };
}

const ModalSheet: React.FC<ModalSheetProps> = ({
  showModal,
  setShowModal,
  debateImage,
  debateTitle,
  creatorStatement = "",
  debateDescription,
  timeRemaining,
  opinions,
  agreePct,
  insets,
}) => {
  const positivePct = Math.round(agreePct * 100);
  const negativePct = 100 - positivePct;
  const { height } = useWindowDimensions();
  
  // Calculate max height: 70% of screen, but ensure minimum space for button
  const maxModalHeight = Math.min(height * 0.7, height - 150);

  return (
    <Modal visible={showModal} transparent animationType='slide'>
      <Pressable style={styles.backdrop} onPress={() => setShowModal(false)}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <SafeAreaView style={styles.container}>
            <LinearGradient
              colors={["#222", "#111"]}
              start={[0, 0]}
              end={[0, 1]}
              style={[styles.sheet, { maxHeight: maxModalHeight }]}
            >
              <View style={styles.handle} />

              {/* Scrollable Content */}
              <ScrollView
                style={styles.scrollContent}
                contentContainerStyle={styles.scrollContentContainer}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                <View style={styles.headerRow}>
                  {debateImage && (
                    <Image source={{ uri: debateImage }} style={styles.avatar} />
                  )}
                  <View style={styles.headerTextContainer}>
                    <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
                      {debateTitle}
                    </Text>
                    <View style={styles.timeRow}>
                      <Ionicons name='time-outline' size={16} color='#FFF' />
                      <Text style={styles.timeText}>
                        {formatTimeRemaining(timeRemaining!)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Creator Statement - Prominent Display */}
                {creatorStatement && (
                  <View style={styles.statementContainer}>
                    <View style={styles.statementHeader}>
                      <Ionicons name="chatbox-ellipses" size={16} color="#00FF94" />
                      <Text style={styles.statementHeaderText}>Creator's Statement</Text>
                    </View>
                    <Text style={styles.statementText} numberOfLines={4} ellipsizeMode="tail">
                      "{creatorStatement}"
                    </Text>
                    <Text style={styles.statementSubtext}>
                      Choose to agree or disagree with this statement
                    </Text>
                  </View>
                )}

                <Text style={styles.description}>
                  {debateDescription || "No description available."}
                </Text>

                <View style={styles.progressSection}>
                  <Text style={[styles.progressLabel, { color: "#00FF94" }]}>{positivePct}%</Text>
                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressFill,
                        { flex: positivePct || 1, backgroundColor: "#00FF94" },
                      ]}
                    />
                    <View
                      style={[
                        styles.progressFill,
                        { flex: negativePct || 1, backgroundColor: "#FF4757" },
                      ]}
                    />
                  </View>
                  <Text style={[styles.progressLabel, { color: "#FF4757" }]}>{negativePct}%</Text>
                </View>
              </ScrollView>

              {/* Fixed Footer with Button - Always Visible */}
              <View style={[styles.footerRow, { paddingBottom: Math.max(12, insets.bottom) }]}>
                <Text style={styles.opinionCount}>
                  {opinions.length} opinion{opinions.length !== 1 ? 's' : ''} shared
                </Text>
                <TouchableOpacity
                  onPress={() => setShowModal(false)}
                  style={styles.button}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonText}>Got it</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default ModalSheet;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  container: {
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  scrollContent: {
    flexGrow: 0,
  },
  scrollContentContainer: {
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#FFF",
  },
  headerTextContainer: {
    flex: 1,
    flexShrink: 1,
  },
  title: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
    flexShrink: 1,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeText: {
    color: "#AAA",
    fontSize: 14,
    marginLeft: 6,
  },
  description: {
    color: "#DDD",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  progressSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  progressLabel: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
    width: 36,
    textAlign: "center",
  },
  progressBarContainer: {
    flex: 1,
    flexDirection: "row",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginHorizontal: 10,
  },
  progressFill: {
    height: "100%",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#333",
    paddingTop: 16,
    paddingHorizontal: 20,
    marginHorizontal: -20,
  },
  opinionCount: {
    color: "#AAA",
    fontSize: 13,
    flexShrink: 1,
  },
  button: {
    backgroundColor: "#FFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    minWidth: 100,
    minHeight: 44, // Minimum touch target
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#111",
    fontWeight: "600",
    fontSize: 16,
  },
  statementContainer: {
    backgroundColor: "rgba(0, 255, 148, 0.08)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#00FF94",
    borderWidth: 1,
    borderColor: "rgba(0, 255, 148, 0.2)",
  },
  statementHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  statementHeaderText: {
    color: "#00FF94",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  statementText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
    marginBottom: 8,
    fontStyle: "italic",
  },
  statementSubtext: {
    color: "#AAA",
    fontSize: 12,
    fontStyle: "italic",
  },
});
