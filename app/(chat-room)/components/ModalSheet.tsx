import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Modal,
  Pressable,
} from "react-native";

import { theme } from "../theme";
import { LinearGradient } from "expo-linear-gradient";
import { formatTimeRemaining } from "../utils";

interface ModalSheetProps {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  debateImage: string | null;
  debateTitle: string;
  debateDescription: string | null;
  timeRemaining: number | null;
  opinions: any[];
  agreePct: number;
  insets: { top: number; bottom: number };
}

const ModalSheet = ({
  showModal,
  setShowModal,
  debateImage,
  debateTitle,
  debateDescription,
  timeRemaining,
  opinions,
  agreePct,
  insets,
}: ModalSheetProps) => {
  return (
    <View>
      <Modal
        visible={showModal}
        transparent={true}
        animationType='slide'
        onRequestClose={() => setShowModal(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
          onPress={() => setShowModal(false)}
        >
          <View>
            <LinearGradient
              colors={["#03120F", "#080F12"]}
              style={{
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 20,
                paddingBottom: Math.max(20, insets.bottom),
                maxHeight: "70%",
                borderTopWidth: 1,
                borderTopColor: "rgba(0, 255, 148, 0.3)",
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 4,
                  backgroundColor: "rgba(255,255,255,0.3)",
                  borderRadius: 2,
                  alignSelf: "center",
                  marginBottom: 16,
                }}
              />

              <View
                style={{
                  flexDirection: "row",
                  marginBottom: 16,
                  alignItems: "center",
                }}
              >
                {debateImage && (
                  <Image
                    source={{ uri: String(debateImage) }}
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 25,
                      marginRight: 12,
                      borderWidth: 1,
                      borderColor: "rgba(0, 255, 148, 0.4)",
                    }}
                  />
                )}

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: theme.colors.primary,
                      fontSize: 18,
                      fontWeight: "bold",
                      marginBottom: 4,
                    }}
                  >
                    {debateTitle}
                  </Text>

                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text
                      style={{ color: theme.colors.textMuted, fontSize: 13 }}
                    >
                      Time remaining:
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.primary,
                        fontSize: 13,
                        fontWeight: "600",
                        marginLeft: 6,
                      }}
                    >
                      {formatTimeRemaining(timeRemaining!)}
                    </Text>
                  </View>
                </View>
              </View>

              <Text
                style={{
                  color: theme.colors.text,
                  lineHeight: 22,
                  marginBottom: 16,
                }}
              >
                {debateDescription ||
                  "No description available for this debate."}
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginVertical: 16,
                  paddingHorizontal: 8,
                }}
              >
                <Text
                  style={{
                    color: theme.colors.primary,
                    fontSize: 14,
                    width: 36,
                    fontWeight: "bold",
                  }}
                >
                  {Math.round(agreePct * 100)}%
                </Text>

                <View
                  style={{
                    flex: 1,
                    height: 6,
                    backgroundColor: "rgba(255, 0, 229, 0.2)",
                    borderRadius: 8,
                    overflow: "hidden",
                    marginHorizontal: 10,
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
                    fontSize: 14,
                    width: 36,
                    textAlign: "right",
                    fontWeight: "bold",
                  }}
                >
                  {Math.round((1 - agreePct) * 100)}%
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTopWidth: 1,
                  borderTopColor: "rgba(255,255,255,0.1)",
                  paddingTop: 16,
                  marginTop: 8,
                }}
              >
                <Text style={{ color: theme.colors.textMuted }}>
                  {opinions.length} opinions shared
                </Text>

                <TouchableOpacity
                  onPress={() => setShowModal(false)}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 8,
                    backgroundColor: theme.colors.primary,
                    borderRadius: 16,
                  }}
                >
                  <Text style={{ color: "#080F12", fontWeight: "600" }}>
                    Got it
                  </Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

export default ModalSheet;
