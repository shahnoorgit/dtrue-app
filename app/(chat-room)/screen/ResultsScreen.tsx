import React from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../theme";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const DebateEndedResults = ({ results, insets, debateTitle, debateImage }) => {
  if (results?.code === 102) {
    return (
      <View
        style={[styles.waitContainer, { paddingBottom: insets.bottom + 40 }]}
      >
        <Text style={styles.waitTitle}>Debate Room Closed</Text>
        <Text style={styles.waitMessage}>
          The results are being prepared. You'll be notified once they are
          ready. 🚀
        </Text>
      </View>
    );
  }

  const agreed = Math.round(results.agreementRatio * results.totalParticipants);
  const disagreed = results.totalParticipants - agreed;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
    >
      <LinearGradient
        colors={[theme.colors.backgroundDarker, theme.colors.background]}
        style={styles.header}
      >
        <Image
          source={{ uri: debateImage }}
          style={styles.debateImage}
          resizeMode='cover'
        />
        <Text style={styles.title}>{debateTitle}</Text>
        <Text style={styles.subtitle}>Debate Ended - Final Results</Text>
      </LinearGradient>

      <View style={styles.resultsContainer}>
        {/* Participation Stats */}
        <View style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Participation Overview</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name='people' size={24} color={theme.colors.primary} />
              <Text style={styles.statValue}>{results.totalParticipants}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>

            <View style={styles.statItem}>
              <Ionicons name='thumbs-up' size={24} color='#00FF94' />
              <Text style={styles.statValue}>{agreed}</Text>
              <Text style={styles.statLabel}>Agreed</Text>
            </View>

            <View style={styles.statItem}>
              <Ionicons name='thumbs-down' size={24} color='#FF0055' />
              <Text style={styles.statValue}>{disagreed}</Text>
              <Text style={styles.statLabel}>Disagreed</Text>
            </View>
          </View>
        </View>

        {/* AI Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>AI Generated Summary</Text>
          <Text style={styles.summaryText}>{results.aiGeneratedSummary}</Text>
        </View>

        {/* Top Opinions */}
        <View style={styles.opinionsCard}>
          <Text style={styles.sectionTitle}>Top Opinionists</Text>

          {results.topOpinions.map((opinion, index) => (
            <View key={index} style={styles.opinionItem}>
              <Pressable
                onPress={() => {
                  router.push({
                    pathname: "/(tabs)/[id]/page",
                    params: { id: opinion.user.id },
                  });
                }}
                style={styles.opinionHeader}
              >
                <Image
                  source={{ uri: opinion.user.image }}
                  style={styles.avatar}
                />
                <Text style={styles.username}>{opinion.user.username}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Rank #{index + 1}</Text>
                </View>
              </Pressable>

              <Text style={styles.opinionText}>{opinion.opinion}</Text>

              <View style={styles.opinionFooter}>
                <View style={styles.likesContainer}>
                  <Ionicons name='thumbs-up' size={16} color='#FF0055' />
                  <Text style={styles.likesCount}>{opinion.upvotes} votes</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  waitContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    paddingHorizontal: 30,
  },
  waitTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 12,
  },
  waitMessage: {
    fontSize: 16,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 24,
  },
  header: {
    padding: 20,
    paddingTop: 40,
    alignItems: "center",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  debateImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.2)",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "white",
    marginTop: 15,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
    marginTop: 5,
  },
  resultsContainer: {
    padding: 20,
  },
  statsCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 15,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: theme.colors.text,
    marginVertical: 5,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  summaryCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.text,
  },
  opinionsCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    padding: 20,
  },
  opinionItem: {
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  opinionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  username: {
    color: theme.colors.text,
    fontWeight: "600",
    fontSize: 16,
  },
  badge: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: "auto",
  },
  badgeText: {
    color: "white",
    fontWeight: "800",
    fontSize: 12,
  },
  opinionText: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  opinionFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  likesContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,0,85,0.15)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  likesCount: {
    color: "#FF0055",
    fontWeight: "700",
    marginLeft: 5,
  },
});

export default DebateEndedResults;
