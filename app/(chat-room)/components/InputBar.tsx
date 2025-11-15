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
  isEditMode?: boolean;
  onCancelEdit?: () => void;
  creatorStatement?: string;
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
  isEditMode = false,
  onCancelEdit,
  creatorStatement = "",
}) => {
  // Show input bar if in edit mode, even if submitted
  if (showModal || (submitted && !isEditMode)) return null;

  const agreeBg = "rgba(0, 255, 148, 0.15)";
  const disagreeBg = "rgba(255, 71, 87, 0.15)";
  const inactiveBg = "transparent";
  const agreeBorder = "#00FF94";
  const disagreeBorder = "#FF4757";
  const inactiveBorder = "rgba(200,200,200,0.3)";
  const placeholder = "rgba(200,200,200,0.6)";

  return (
    <LinearGradient
      colors={["#222", "#111"]}
      style={[styles.container, { paddingBottom: Math.max(12, insets.bottom) }]}
    >
      {/* Edit Mode Header */}
      {isEditMode && (
        <View style={styles.editModeHeader}>
          <View style={styles.editModeInfo}>
            <Ionicons name="create-outline" size={16} color="#00FF94" />
            <Text style={styles.editModeText} numberOfLines={1}>Editing your opinion</Text>
          </View>
          {onCancelEdit && (
            <TouchableOpacity onPress={onCancelEdit} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Show creator statement when stance is selected */}
      {stance && creatorStatement && (
        <View style={styles.statementBanner}>
          <Text style={[
            styles.statementLabel,
            { color: stance === "agree" ? "#00FF94" : "#FF4757" }
          ]}>
            {stance === "agree" ? "Agreeing with" : "Disagreeing with"}:
          </Text>
          <Text style={styles.statementText} numberOfLines={2} ellipsizeMode="tail">
            "{creatorStatement}"
          </Text>
        </View>
      )}

      <View style={styles.stanceRow}>
        {["agree", "disagree"].map((opt) => {
          const selected = stance === opt;
          const isAgree = opt === "agree";
          return (
            <TouchableOpacity
              key={opt}
              style={[
                styles.stanceButton,
                {
                  backgroundColor: selected 
                    ? (isAgree ? agreeBg : disagreeBg) 
                    : inactiveBg,
                  borderColor: selected 
                    ? (isAgree ? agreeBorder : disagreeBorder) 
                    : inactiveBorder,
                },
              ]}
              onPress={() => setStance(opt as any)}
            >
              <MaterialCommunityIcons
                name={opt === "agree" ? "thumb-up" : "thumb-down"}
                size={16}
                color={selected ? (isAgree ? "#00FF94" : "#FF4757") : "#888"}
                style={styles.iconSpacing}
              />
              <Text
                style={[
                  styles.stanceText, 
                  selected && { color: isAgree ? "#00FF94" : "#FF4757" }
                ]}
                numberOfLines={1}
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
          placeholder={isEditMode ? 'Edit your opinion…' : 'Your opinion…'}
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
              name={isEditMode ? 'checkmark' : 'send'}
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
  editModeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  editModeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  editModeText: {
    color: "#00FF94",
    fontSize: 13,
    fontWeight: "500",
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(255, 71, 87, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 71, 87, 0.3)",
  },
  cancelButtonText: {
    color: "#FF4757",
    fontSize: 12,
    fontWeight: "500",
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
  statementBanner: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#00FF94",
  },
  statementLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  statementText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
    fontStyle: "italic",
  },
});
