import { cyberpunkTheme } from "@/constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import {
  Image,
  Pressable,
  Text,
  View,
  StyleSheet,
  Dimensions,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 32;
const IMAGE_HEIGHT = CARD_WIDTH * 0.6;

const DebateCard = ({ debate, onJoinPress }) => {
  const formatTimeRemaining = (hours) => {
    if (hours < 1) return "Ending soon";
    if (hours < 24) return `${hours}h remaining`;
    return `${Math.floor(hours / 24)}d ${hours % 24}h remaining`;
  };

  const getUrgencyColor = (hours) => {
    if (hours < 6) return cyberpunkTheme.colors.secondary;
    if (hours < 24) return cyberpunkTheme.colors.accent;
    return cyberpunkTheme.colors.primary;
  };

  const calculateTimeRemaining = (createdAt, durationHours) => {
    const creationTime = new Date(createdAt).getTime();
    const expiryTime = creationTime + durationHours * 60 * 60 * 1000;
    const remainingMs = expiryTime - new Date().getTime();
    return Math.max(0, Math.ceil(remainingMs / (60 * 60 * 1000)));
  };

  const formatCategory = (category) =>
    category
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const getMainCategory = (categories) =>
    categories && categories.length > 0
      ? formatCategory(categories[0])
      : "General";

  const timeRemaining = calculateTimeRemaining(
    debate.createdAt,
    debate.duration
  );

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { opacity: pressed ? 0.9 : 1 },
        { borderColor: getUrgencyColor(timeRemaining) },
      ]}
      onPress={() => onJoinPress(debate)}
    >
      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: debate.image }}
          style={styles.thumbnail}
          resizeMode='cover'
        />
        <LinearGradient
          colors={["transparent", "rgba(3, 18, 15, 0.8)"]}
          style={styles.imageGradient}
        />
        <View
          style={[
            styles.categoryBadge,
            { backgroundColor: cyberpunkTheme.colors.primary },
          ]}
        >
          <Text style={styles.categoryText}>
            {getMainCategory(debate.categories)}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.creatorInfo}>
            <Image
              source={{ uri: debate.creator.image }}
              style={styles.avatar}
            />
            <View style={{ marginLeft: 8 }}>
              <Text style={styles.username}>{debate.creator.username}</Text>
              <Text style={styles.role}>Creator</Text>
            </View>
          </View>
          <View style={styles.participantBadge}>
            <Icon
              name='account-group'
              size={12}
              color='#03120F'
              style={{ marginRight: 4 }}
            />
            <Text style={styles.participants}>
              {debate.participantCount} Joined
            </Text>
          </View>
        </View>

        <Text style={styles.title}>{debate.title}</Text>

        <View style={styles.tagsRow}>
          {debate.subCategories &&
            debate.subCategories.slice(0, 3).map((tag) => (
              <View key={tag} style={styles.tagBubble}>
                <Text style={styles.tagText}>
                  #{formatCategory(tag).replace(/\s+/g, "")}
                </Text>
              </View>
            ))}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Icon
              name='clock-outline'
              size={16}
              color={getUrgencyColor(timeRemaining)}
              style={{ opacity: 0.9 }}
            />
            <Text
              style={[
                styles.statText,
                { color: getUrgencyColor(timeRemaining) },
              ]}
            >
              {formatTimeRemaining(timeRemaining)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Icon
              name='vote-outline'
              size={16}
              color={cyberpunkTheme.colors.primary}
              style={{ opacity: 0.9 }}
            />
            <Text style={styles.statText}>{debate.vote_count} votes</Text>
          </View>
        </View>

        <View style={styles.distributionContainer}>
          <View style={styles.distribution}>
            <View
              style={[
                styles.distBar,
                { flex: debate.agreedCount, backgroundColor: "#00CC47" },
              ]}
            />
            <View
              style={[
                styles.distBar,
                { flex: debate.disagreedCount, backgroundColor: "#FF3D71" },
              ]}
            />
          </View>

          <View style={styles.distLabels}>
            <View style={styles.distLabelContainer}>
              <View style={styles.forDot} />
              <Text style={styles.forLabel}>{debate.agreedCount} Agreed</Text>
            </View>
            <View style={styles.distLabelContainer}>
              <View style={styles.againstDot} />
              <Text style={styles.againstLabel}>
                {debate.disagreedCount} Disagreed
              </Text>
            </View>
          </View>
        </View>

        <LinearGradient
          colors={cyberpunkTheme.colors.gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.joinButton}
        >
          <Text style={styles.joinText}>JOIN DEBATE</Text>
        </LinearGradient>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    backgroundColor: "#03120F",
    borderWidth: 2,
    elevation: 8,
    shadowColor: "#00FF94",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    marginVertical: 16,
    marginHorizontal: 16,
    overflow: "hidden",
  },
  imageWrapper: {
    position: "relative",
    overflow: "hidden",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  thumbnail: {
    width: "100%",
    height: IMAGE_HEIGHT,
  },
  imageGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: IMAGE_HEIGHT / 2,
  },
  categoryBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    elevation: 3,
  },
  categoryText: {
    color: "#03120F",
    fontSize: 12,
    fontWeight: "700",
  },
  content: {
    padding: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  creatorInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: cyberpunkTheme.colors.primary,
  },
  username: {
    color: "#E0F0EA",
    fontWeight: "bold",
    fontSize: 14,
  },
  role: {
    color: "#8F9BB3",
    fontSize: 11,
  },
  participantBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: cyberpunkTheme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  participants: {
    color: "#03120F",
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    color: "#E0F0EA",
    fontWeight: "bold",
    fontSize: 20,
    marginBottom: 10,
    lineHeight: 26,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  tagBubble: {
    backgroundColor: "rgba(0,255,148,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: "rgba(0,255,148,0.3)",
  },
  tagText: {
    color: cyberpunkTheme.colors.primary,
    fontSize: 11,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statText: {
    marginLeft: 6,
    color: "#E0F0EA",
    fontSize: 12,
    fontWeight: "500",
  },
  distributionContainer: {
    marginBottom: 10,
  },
  distribution: {
    flexDirection: "row",
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 2,
  },
  distBar: {
    height: 10,
  },
  distLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  distLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  forDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00CC47",
    marginRight: 6,
  },
  againstDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF3D71",
    marginRight: 6,
  },
  forLabel: {
    color: "#00CC47",
    fontSize: 12,
    fontWeight: "600",
  },
  againstLabel: {
    color: "#FF3D71",
    fontSize: 12,
    fontWeight: "600",
  },
  joinButton: {
    paddingVertical: 12,
    marginTop: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  joinText: {
    color: "#03120F",
    fontSize: 14,
    fontWeight: "700",
  },
});

export default DebateCard;
