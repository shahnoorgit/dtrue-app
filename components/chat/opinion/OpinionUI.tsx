import { cyberpunkTheme } from "@/constants/theme";
import { useCallback } from "react";
import { Image, Text } from "react-native";
import { View } from "react-native";
import { TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

const theme = {
  colors: {
    primary: "#00FF94",
    secondary: "#FF00E5",
    background: "#080F12",
    backgroundDarker: "#03120F",
    text: "#FFFFFF",
    textMuted: "#8F9BB3",
  },
};

export function RenderOpinion({ item }: { item: any }) {
  const isAgreed = item.agreed;

  // Handle opinion press
  const handleOpinionPress = () => {
    console.log(item.userId);
  };

  return (
    <TouchableOpacity onPress={handleOpinionPress} activeOpacity={0.8}>
      <View
        style={{
          marginHorizontal: 12,
          marginVertical: 8,
          alignSelf: isAgreed ? "flex-end" : "flex-start",
          maxWidth: "82%",
          borderRadius: 16,
          backgroundColor: isAgreed
            ? "rgba(0, 255, 148, 0.08)"
            : "rgba(255, 0, 229, 0.08)",
          borderLeftWidth: 3,
          borderLeftColor: isAgreed
            ? cyberpunkTheme.colors.primary
            : cyberpunkTheme.colors.secondary,
          padding: 14,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          elevation: 2,
        }}
      >
        {/* Header: User info and timestamp */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 6,
          }}
        >
          <Image
            source={{ uri: item.user.image }}
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              marginRight: 10,
              borderWidth: 1.5,
              borderColor: isAgreed
                ? "rgba(0, 255, 148, 0.5)"
                : "rgba(255, 0, 229, 0.5)",
            }}
          />
          <Text
            style={{
              color: theme.colors.text,
              fontWeight: "700",
              fontSize: 15,
            }}
          >
            {item.user.username}
          </Text>
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: 12,
              marginLeft: "auto",
              fontWeight: "500",
            }}
          >
            {new Date(item.createdAt).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })}
          </Text>
        </View>

        {/* Opinion content */}
        <Text
          style={{
            color: theme.colors.text,
            lineHeight: 22,
            fontSize: 15,
            letterSpacing: 0.2,
            marginBottom: 8,
          }}
        >
          {item.opinion}
        </Text>

        {/* Footer: Votes and AI info */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 4,
          }}
        >
          {/* Upvotes */}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Icon
              name='thumbs-up'
              size={14}
              color={theme.colors.textMuted}
              style={{ marginRight: 4 }}
            />
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: 13,
                fontWeight: "500",
              }}
            >
              {item.upvotes}
            </Text>
          </View>

          {/* AI Review Status */}
          {item.aiFlagged ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "rgba(255, 60, 60, 0.1)",
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 12,
              }}
            >
              <Icon
                name='alert-circle'
                size={12}
                color='rgba(255, 60, 60, 0.8)'
                style={{ marginRight: 4 }}
              />
              <Text
                style={{
                  color: "rgba(255, 60, 60, 0.8)",
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                Flagged
              </Text>
            </View>
          ) : item.is_aiFeedback ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "rgba(60, 130, 255, 0.1)",
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 12,
              }}
            >
              <Icon
                name='check-circle'
                size={12}
                color='rgba(60, 130, 255, 0.8)'
                style={{ marginRight: 4 }}
              />
              <Text
                style={{
                  color: "rgba(60, 130, 255, 0.8)",
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                AI Score: {item.aiScore}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}
