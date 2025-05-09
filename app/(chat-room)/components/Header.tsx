import { View, Text, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { theme } from "../theme";
import { formatTimeRemaining } from "../utils";

interface HeaderProps {
  timeRemaining: number | null;
  insets: { top: number; bottom: number };
  debateImage: string | null;
  setShowModal: (show: boolean) => void;
  debateTitle: string;
  opinions: any[];
  agreePct: number;
}

const Header = ({
  timeRemaining,
  insets,
  debateImage,
  setShowModal,
  debateTitle,
  opinions,
  agreePct,
}: HeaderProps) => {
  return (
    <LinearGradient
      colors={["rgba(3, 18, 15, 0.95)", "rgba(8, 15, 18, 0.9)"]}
      style={{
        paddingTop: insets.top,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(0, 255, 148, 0.2)",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
          height: 54,
        }}
      >
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/rooms')}
          style={{ padding: 8, borderRadius: 16 }}
        >
          <Ionicons name='arrow-back' size={22} color={theme.colors.primary} />
        </TouchableOpacity>

        {debateImage && (
          <Image
            source={{ uri: String(debateImage) }}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              marginRight: 10,
              borderWidth: 1,
              borderColor: "rgba(0, 255, 148, 0.4)",
            }}
          />
        )}

        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={() => setShowModal(true)}
        >
          <Text
            style={{
              color: theme.colors.text,
              fontWeight: "bold",
              fontSize: 16,
            }}
            numberOfLines={1}
          >
            {debateTitle}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
              {opinions.length} opinions • Tap for details
            </Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "rgba(0, 255, 148, 0.1)",
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 10,
                marginLeft: 8,
              }}
            >
              <Ionicons
                name='time-outline'
                size={12}
                color={theme.colors.primary}
              />
              <Text
                style={{
                  color: theme.colors.primary,
                  fontSize: 11,
                  marginLeft: 2,
                  fontWeight: "500",
                }}
              >
                {formatTimeRemaining(timeRemaining!)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Progress bar - simplified */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          marginTop: 4,
        }}
      >
        <Text
          style={{
            color: theme.colors.primary,
            fontSize: 12,
            width: 24,
            fontWeight: "bold",
          }}
        >
          {Math.round(agreePct * 100)}%
        </Text>

        <View
          style={{
            flex: 1,
            height: 4,
            backgroundColor: "rgba(255, 0, 229, 0.2)",
            borderRadius: 8,
            overflow: "hidden",
            marginHorizontal: 6,
          }}
        >
          <View
            style={{
              height: "100%",
              width: `${agreePct * 100}%`,
              backgroundColor: theme.colors.primary,
              borderRadius: 8,
            }}
          />
        </View>

        <Text
          style={{
            color: theme.colors.secondary,
            fontSize: 12,
            width: 24,
            textAlign: "right",
            fontWeight: "bold",
          }}
        >
          {Math.round((1 - agreePct) * 100)}%
        </Text>
      </View>
    </LinearGradient>
  );
};

export default Header;
