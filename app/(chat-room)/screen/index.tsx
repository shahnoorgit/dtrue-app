import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Modal,
  Pressable,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthToken } from "../../../hook/clerk/useFetchjwtToken";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Simplified cyberpunk theme without glow effects
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

export default function DebateRoom() {
  const { debateId, debateImage, clerkId } = useLocalSearchParams();
  const router = useRouter();
  const [token, refreshToken] = useAuthToken();
  const flatRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // UI state
  const [debateTitle, setDebateTitle] = useState(`Debate ${debateId}`);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [debateDescription, setDebateDescription] = useState("");
  const [opinions, setOpinions] = useState<any[]>([]);
  const [loadingOpinions, setLoadingOpinions] = useState(true);
  const [stance, setStance] = useState<"agree" | "disagree" | null>(null);
  const [userOpinion, setUserOpinion] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(true);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isNextPage, setNextPage] = useState(null);

  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<"score" | "votes" | "date">("date");

  // Timer effect
  useEffect(() => {
    if (endTime) {
      const updateTimer = () => {
        const now = new Date();
        const diff = Math.max(
          0,
          Math.floor((endTime.getTime() - now.getTime()) / 1000)
        );
        setTimeRemaining(diff);
      };

      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [endTime]);

  // Format time remaining
  const formatTimeRemaining = () => {
    if (!timeRemaining) return "00:00:00";

    const hours = Math.floor(timeRemaining / 3600);
    const minutes = Math.floor((timeRemaining % 3600) / 60);
    const seconds = timeRemaining % 60;

    return [
      hours.toString().padStart(2, "0"),
      minutes.toString().padStart(2, "0"),
      seconds.toString().padStart(2, "0"),
    ].join(":");
  };

  useEffect(() => {
    // Only trigger once when debate description is first loaded
    if (debateDescription && !initialDataLoaded) {
      // Only show modal on first join/load, not on subsequent data refreshes
      setInitialDataLoaded(true);
      // Only show modal automatically on first app launch
      if (!global.hasSeenDebateModal) {
        global.hasSeenDebateModal = true;
        setShowModal(true);
      }
    }
  }, [debateDescription]);

  // Fetch debate metadata
  const fetchDebateRoom = useCallback(async () => {
    if (!debateId || !token) return;
    try {
      const { data } = await axios.get(
        `${process.env.EXPO_PUBLIC_BASE_URL}/debate-room/get-room/${debateId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        setDebateTitle(data.data.title);
        setDebateDescription(data.data.description || "");

        // Calculate end time based on creation time and duration
        if (data.data.createdAt && data.data.duration) {
          const creationDate = new Date(data.data.createdAt);
          const endDate = new Date(creationDate);
          // Add duration hours to creation date
          endDate.setHours(endDate.getHours() + data.data.duration);
          setEndTime(endDate);
        } else {
          // Fallback for testing - just to be safe
          const demoEndTime = new Date();
          demoEndTime.setHours(demoEndTime.getHours() + 1);
          setEndTime(demoEndTime);
        }
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        await refreshToken();
        fetchDebateRoom();
      }
    }
  }, [debateId, token]);

  // Timer effect - keep this as is
  useEffect(() => {
    if (endTime) {
      const updateTimer = () => {
        const now = new Date();
        const diff = Math.max(
          0,
          Math.floor((endTime.getTime() - now.getTime()) / 1000)
        );
        setTimeRemaining(diff);

        // If time is up, you might want to disable certain features
        if (diff <= 0) {
          // Handle debate ended state
          // For example, disable input, show message, etc.
        }
      };

      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [endTime]);

  // Fetch opinions
  const fetchOpinions = useCallback(async () => {
    if (!debateId || !token) return;
    setLoadingOpinions(true);
    try {
      const { data } = await axios.get(
        `${process.env.EXPO_PUBLIC_BASE_URL}/debate-participant/opinion/${debateId}?page=${page}&orderBy=${sort}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        setOpinions(data.data.data);
        setSubmitted(data.data.some((o: any) => o.user.clerkId === clerkId));
        setNextPage(data.data.nextPage);
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        await refreshToken();
        fetchOpinions();
      }
    } finally {
      setLoadingOpinions(false);
    }
  }, [debateId, token, page, sort]);

  // Initialize data on token ready
  useEffect(() => {
    if (token) {
      fetchDebateRoom();
      fetchOpinions();
    }
  }, [token]);

  // Submit opinion
  const onSubmit = useCallback(async () => {
    if (!userOpinion.trim() || !stance || isLoading) return;
    setIsLoading(true);
    try {
      const { data } = await axios.put(
        `${process.env.EXPO_PUBLIC_BASE_URL}/debate-participant/opinion`,
        {
          roomId: debateId,
          opinion: userOpinion.trim(),
          isAgree: stance === "agree" ? true : false,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log(data.data);
      if (data.statusCode === 200) {
        setUserOpinion("");
        setStance(null);
        setSubmitted(true);
        fetchOpinions();
        setTimeout(() => {
          flatRef.current?.scrollToEnd({ animated: true });
        }, 300);
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        await refreshToken();
        onSubmit();
      }
    } finally {
      setIsLoading(false);
    }
  }, [debateId, token, userOpinion, stance]);

  // Vote stats calculation
  const agreedCount = useMemo(
    () => opinions.filter((o) => o.agreed).length,
    [opinions]
  );
  const totalVotes = Math.max(1, opinions.length);
  const agreePct = agreedCount / totalVotes;

  // Opinion renderer - simplified without glow effects
  const renderOpinion = useCallback(({ item }: { item: any }) => {
    const isAgreed = item.agreed;

    return (
      <TouchableOpacity
        onPress={() => console.log(item.userId)}
        activeOpacity={0.8}
      >
        <View
          style={{
            marginHorizontal: 8,
            marginVertical: 4,
            alignSelf: isAgreed ? "flex-end" : "flex-start",
            maxWidth: "80%",
            borderRadius: 12,
            backgroundColor: isAgreed
              ? "rgba(0, 255, 148, 0.08)"
              : "rgba(255, 0, 229, 0.08)",
            borderLeftWidth: 2,
            borderLeftColor: isAgreed
              ? theme.colors.primary
              : theme.colors.secondary,
            padding: 10,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 4,
            }}
          >
            <Image
              source={{ uri: item.user.image }}
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                marginRight: 8,
                borderWidth: 1,
                borderColor: isAgreed
                  ? "rgba(0, 255, 148, 0.4)"
                  : "rgba(255, 0, 229, 0.4)",
              }}
            />
            <Text style={{ color: theme.colors.text, fontWeight: "600" }}>
              {item.user.username}
            </Text>
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: 12,
                marginLeft: "auto",
              }}
            >
              {new Date(item.createdAt).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })}
            </Text>
          </View>

          <Text style={{ color: theme.colors.text, lineHeight: 20 }}>
            {item.opinion}
          </Text>

          {/* Added vote count and AI review information */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 8,
            }}
          >
            {/* Upvotes */}
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name='thumbs-up'
                size={12}
                color={theme.colors.textMuted}
                style={{ marginRight: 4 }}
              />
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: 12,
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
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 8,
                }}
              >
                <Ionicons
                  name='alert-circle'
                  size={10}
                  color='rgba(255, 60, 60, 0.8)'
                  style={{ marginRight: 2 }}
                />
                <Text
                  style={{
                    color: "rgba(255, 60, 60, 0.8)",
                    fontSize: 10,
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
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 8,
                }}
              >
                <MaterialCommunityIcons
                  name='check-circle'
                  size={10}
                  color='rgba(60, 130, 255, 0.8)'
                  style={{ marginRight: 2 }}
                />
                <Text
                  style={{
                    color: "rgba(60, 130, 255, 0.8)",
                    fontSize: 10,
                  }}
                >
                  AI: {item.aiScore}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar
        barStyle='light-content'
        backgroundColor={theme.colors.backgroundDarker}
      />

      {/* Improved header alignment */}
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
            onPress={() => router.back()}
            style={{ padding: 8, borderRadius: 16 }}
          >
            <Ionicons
              name='arrow-back'
              size={22}
              color={theme.colors.primary}
            />
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
                  {formatTimeRemaining()}
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

      {/* Opinions list */}
      {loadingOpinions ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size='large' color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={opinions}
          keyExtractor={(item) => item.id}
          renderItem={renderOpinion}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={Platform.OS === "android"}
          contentContainerStyle={{
            paddingVertical: 8,
            paddingBottom: submitted ? 16 : 80,
          }}
          onEndReached={() => isNextPage && setPage((prev) => prev + 1)}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoadingMore && (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator size='small' color='green' />
              </View>
            )
          }
          ListEmptyComponent={
            <View
              style={{
                justifyContent: "center",
                alignItems: "center",
                paddingVertical: 60,
              }}
            >
              <Ionicons
                name='chatbubble-ellipses-outline'
                size={64}
                color='rgba(0, 255, 148, 0.3)'
              />
              <Text
                style={{
                  color: theme.colors.text,
                  textAlign: "center",
                  marginTop: 12,
                  maxWidth: "80%",
                }}
              >
                Be the first to share your opinion
              </Text>
            </View>
          }
        />
      )}

      {/* Input bar */}
      {!submitted && (
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
      )}

      {/* Debate description modal - fully opaque */}
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
              colors={["#03120F", "#080F12"]} // Fully opaque
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
                      {formatTimeRemaining()}
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
    </SafeAreaView>
  );
}
