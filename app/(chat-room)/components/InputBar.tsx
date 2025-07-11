import React from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Text,
  StyleSheet,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

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
  if (showModal || submitted) return null;

  const activeBg = "rgba(255,255,255,0.1)";
  const inactiveBg = "transparent";
  const activeBorder = "#FFF";
  const inactiveBorder = "rgba(200,200,200,0.3)";
  const placeholder = "rgba(200,200,200,0.6)";

  return (
    <LinearGradient
      colors={["#222", "#111"]}
      style={[styles.container, { paddingBottom: Math.max(12, insets.bottom) }]}
    >
      <View style={styles.stanceRow}>
        {["agree", "disagree"].map((opt) => {
          const selected = stance === opt;
          return (
            <TouchableOpacity
              key={opt}
              style={[
                styles.stanceButton,
                {
                  backgroundColor: selected ? activeBg : inactiveBg,
                  borderColor: selected ? activeBorder : inactiveBorder,
                },
              ]}
              onPress={() => setStance(opt as any)}
            >
              <MaterialCommunityIcons
                name={opt === "agree" ? "thumb-up" : "thumb-down"}
                size={16}
                color={selected ? "#FFF" : "#888"}
                style={styles.iconSpacing}
              />
              <Text
                style={[styles.stanceText, selected && styles.stanceTextActive]}
              >
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.inputRow}>
        <TextInput
          value={userOpinion}
          onChangeText={setUserOpinion}
          placeholder='Your opinion…'
          placeholderTextColor={placeholder}
          multiline
          style={styles.textInput}
        />
        <TouchableOpacity
          onPress={onSubmit}
          disabled={!userOpinion.trim() || !stance || isLoading}
          style={[
            styles.sendButton,
            { opacity: userOpinion.trim() && stance && !isLoading ? 1 : 0.5 },
          ]}
        >
          {isLoading ? (
            <ActivityIndicator size='small' color='#111' />
          ) : (
            <Ionicons
              name='send'
              size={20}
              color={userOpinion.trim() && stance ? "#FFF" : placeholder}
            />
          )}
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

export default InputBar;

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(200,200,200,0.2)",
  },
  stanceRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 8,
  },
  stanceButton: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconSpacing: {
    marginRight: 6,
  },
  stanceText: {
    color: "#DDD",
    fontWeight: "400",
  },
  stanceTextActive: {
    color: "#FFF",
    fontWeight: "600",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  textInput: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: "#FFF",
    maxHeight: 80,
    borderWidth: 1,
    borderColor: "rgba(200,200,200,0.3)",
  },
  sendButton: {
    marginLeft: 8,
    padding: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
});
