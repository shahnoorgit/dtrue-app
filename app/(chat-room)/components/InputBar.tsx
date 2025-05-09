import React from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Text,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../theme";

interface InputBarProps {
  insets: { top: number; bottom: number };
  setStance: (stance: "agree" | "disagree") => void;
  stance: "agree" | "disagree" | null;
  userOpinion: string;
  setUserOpinion: (opinion: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  submitted: boolean;
  showModal: boolean;
}

const InputBar: React.FC<InputBarProps> = ({
  insets,
  setStance,
  stance,
  userOpinion,
  setUserOpinion,
  onSubmit,
  isLoading,
  submitted,
  showModal,
}) => {
  if (showModal || submitted) {
    return null;
  }

  return (
    <LinearGradient
      colors={["rgba(3, 18, 15, 0.95)", "rgba(8, 15, 18, 0.9)"]}
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: 12,
        paddingBottom: Math.max(12, insets.bottom),
        borderTopWidth: 1,
        borderTopColor: "rgba(0, 255, 148, 0.2)",
      }}
    >
      {/* stance buttons */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          marginBottom: 8,
        }}
      >
        {(["agree", "disagree"] as const).map((opt) => (
          <TouchableOpacity
            key={opt}
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginHorizontal: 4,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
              borderWidth: 1,
              backgroundColor:
                stance === opt
                  ? opt === "agree"
                    ? "rgba(0, 255, 148, 0.15)"
                    : "rgba(255, 0, 229, 0.15)"
                  : "transparent",
              borderColor:
                stance === opt
                  ? opt === "agree"
                    ? theme.colors.primary
                    : theme.colors.secondary
                  : "rgba(143, 155, 179, 0.3)",
            }}
            onPress={() => setStance(opt)}
          >
            <MaterialCommunityIcons
              name={opt === "agree" ? "thumb-up" : "thumb-down"}
              size={16}
              color={
                stance === opt
                  ? opt === "agree"
                    ? theme.colors.primary
                    : theme.colors.secondary
                  : "#888"
              }
              style={{ marginRight: 4 }}
            />
            <Text
              style={{
                color:
                  stance === opt
                    ? opt === "agree"
                      ? theme.colors.primary
                      : theme.colors.secondary
                    : theme.colors.text,
                fontWeight: stance === opt ? "600" : "400",
              }}
            >
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* text input & send button */}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <TextInput
          value={userOpinion}
          onChangeText={setUserOpinion}
          placeholder='Your opinion…'
          placeholderTextColor='rgba(143, 155, 179, 0.6)'
          multiline
          style={{
            flex: 1,
            backgroundColor: "rgba(8, 15, 18, 0.6)",
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 8,
            color: theme.colors.text,
            maxHeight: 80,
            borderWidth: 1,
            borderColor: "rgba(0, 255, 148, 0.3)",
          }}
        />
        <TouchableOpacity
          onPress={onSubmit}
          disabled={!userOpinion.trim() || !stance || isLoading}
          style={{
            marginLeft: 8,
            padding: 10,
            borderRadius: 20,
            backgroundColor:
              userOpinion.trim() && stance && !isLoading
                ? theme.colors.primary
                : "rgba(8, 15, 18, 0.6)",
            opacity: userOpinion.trim() && stance && !isLoading ? 1 : 0.5,
          }}
        >
          {isLoading ? (
            <ActivityIndicator size='small' color='#080F12' />
          ) : (
            <Ionicons
              name='send'
              size={18}
              color={
                userOpinion.trim() && stance
                  ? "#080F12"
                  : "rgba(143, 155, 179, 0.6)"
              }
            />
          )}
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

export default InputBar;
