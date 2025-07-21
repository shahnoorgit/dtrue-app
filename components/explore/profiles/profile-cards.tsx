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
    textMuted: "#8F9BB3",
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
    activeOpacity={0.7}
  >
    <LinearGradient
      colors={[THEME.colors.backgroundDarker, THEME.colors.background]}
      style={styles.profileCardGradient}
    >
      <Image source={{ uri: item.image }} style={styles.profileImage} />
      <View style={styles.profileInfo}>
        <Text style={styles.profileUsername}>@{item.username}</Text>
        <Text style={styles.profileId}> {item.about.slice(0, 8)}...</Text>
      </View>
      <Ionicons
        name='chevron-forward'
        size={20}
        color={THEME.colors.textMuted}
      />
    </LinearGradient>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  profileCard: {
    marginHorizontal: 4,
    marginBottom: 12,
  },
  profileCardGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fff",
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  profileUsername: {
    fontSize: 16,
    fontWeight: "600",
    color: THEME.colors.text,
    marginBottom: 4,
  },
  profileId: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
});

export default ProfileCard;
