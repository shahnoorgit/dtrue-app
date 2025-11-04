import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import { Image, TouchableOpacity } from "react-native";

const THEME = {
  colors: {
    primary: "#00FF94",
    secondary: "#FF00E5",
    background: "#080F12",
    backgroundDarker: "#03120F",
    text: "#FFFFFF",
    textMuted: "#9CA3AB",
    searchBackground: "#1A2332",
  },
};

type ProfileCardProps = {
  item: {
    id: string;
    username: string;
    image: string;
    about: string;
  };
  onPress: (item: { id: string; username: string; image: string }) => void;
};

const ProfileCard: React.FC<ProfileCardProps> = ({ item, onPress }) => (
  <TouchableOpacity
    style={styles.profileCard}
    onPress={() => onPress(item)}
    activeOpacity={0.8}
  >
    <LinearGradient
      colors={[THEME.colors.backgroundDarker, THEME.colors.background]}
      style={styles.profileCardGradient}
    >
      <View style={styles.profileImageContainer}>
        <Image source={{ uri: item.image }} style={styles.profileImage} />
      </View>
      <View style={styles.profileInfo}>
        <Text style={styles.profileUsername}>@{item.username}</Text>
        <Text style={styles.profileAbout} numberOfLines={2}>
          {item?.about || "No bio available"}
        </Text>
      </View>
      <View style={styles.chevronContainer}>
        <Ionicons
          name='chevron-forward'
          size={18}
          color={THEME.colors.textMuted}
        />
      </View>
    </LinearGradient>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  profileCard: {
    marginHorizontal: 4,
    marginBottom: 8,
  },
  profileCardGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profileImageContainer: {
    marginRight: 12,
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.colors.backgroundDarker,
  },
  profileInfo: {
    flex: 1,
    justifyContent: "center",
  },
  profileUsername: {
    fontSize: 15,
    fontWeight: "600",
    color: THEME.colors.text,
    marginBottom: 4,
  },
  profileAbout: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    lineHeight: 18,
  },
  chevronContainer: {
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default ProfileCard;
