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
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Pressable,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthToken } from "../../../hook/clerk/useFetchjwtToken";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../theme";
import Header from "../components/Header";
import OpinionsList from "../components/OpinionsList";
import InputBar from "../components/InputBar";
import ModalSheet from "../components/ModalSheet";
import DebateEndedResults from "./ResultsScreen";
import { router } from "expo-router";
import { logError } from "@/utils/sentry/sentry";
import { trackOpinionSubmitted, trackOpinionLiked, trackDebateJoined } from "@/lib/posthog/events";

export default function DebateRoom() {
  const { debateId, debateImage, clerkId } = useLocalSearchParams();
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
  const [likedUserIds, setLikedUserIds] = useState<string[]>([]);
  const [userOpinionId, setUserOpinionId] = useState<string | null>(null);
  const [isDebateActive, setIsDebateActive] = useState<boolean | null>(null);
  const [endedRoomResults, setEndedRoomResults] = useState<any>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  useEffect(() => {
    // Track debate joined when user enters the room
    if (debateId) {
      trackDebateJoined({
        debateId: debateId as string,
        source: 'feed'
      });
    }
  }, [debateId]);

  // New state for dynamic image fetching
  const [fetchedDebateImage, setFetchedDebateImage] = useState<string | null>(
    null
  );
  const [loadingImage, setLoadingImage] = useState(false);

  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<"score" | "votes" | "date">("date");

  // Compute final image to use
  const finalDebateImage = useMemo(() => {
    if (debateImage) {
      return Array.isArray(debateImage) ? debateImage[0] : debateImage;
    }
    return fetchedDebateImage;
  }, [debateImage, fetchedDebateImage]);

  // Fetch public debate details for image
  const fetchPublicDebateDetails = useCallback(async () => {
    if (!debateId || debateImage) return; // Don't fetch if image is already provided

    setLoadingImage(true);
    try {
      const response = await axios.get(
        `${process.env.EXPO_PUBLIC_BASE_URL}/debate-room/get-room-public-details/${debateId}`
      );

      if (response.data.success && response.data.data.image) {
        setFetchedDebateImage(response.data.data.image);
        console.log("[IMAGE] Fetched debate image from public API");
      }
    } catch (err: any) {
      console.error("Failed to fetch public debate details:", err);
      logError(err, {
        context: "DebateRoom.fetchPublicDebateDetails",
        debateId: debateId ? `[REDACTED_DEBATE_ID]` : "undefined",
      });
    } finally {
      setLoadingImage(false);
    }
  }, [debateId, debateImage]);

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

  useEffect(() => {
    // Only trigger once when debate description is first loaded
    if (debateDescription && !initialDataLoaded) {
      setInitialDataLoaded(true);
      if (!global.hasSeenDebateModal) {
        global.hasSeenDebateModal = true;
        setShowModal(true);
      }
    }
  }, [debateDescription]);

  // Fetch public debate details when component mounts
  useEffect(() => {
    fetchPublicDebateDetails();
  }, [fetchPublicDebateDetails]);

  const fetchEndedRoomResults = useCallback(async () => {
    if (!debateId || !token) return;

    try {
      const response = await axios.get(
        `${process.env.EXPO_PUBLIC_BASE_URL}/debate-room/ended-room-results/${debateId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setEndedRoomResults(response.data.data);
      }
    } catch (err: any) {
      console.error("Failed to fetch ended room results:", err);
      logError(err, {
        context: "DebateRoom.fetchEndedRoomResults",
        debateId: debateId ? `[REDACTED_DEBATE_ID]` : "undefined",
      });
    } finally {
      setLoadingInitial(false);
    }
  }, [debateId, token]);

  // Fetch debate metadata and liked user IDs
  const fetchDebateRoomAndLikedUserIds = useCallback(async () => {
    if (!debateId || !token) return;

    try {
      const debateRoomResponse = await axios.get(
        `${process.env.EXPO_PUBLIC_BASE_URL}/debate-room/get-room/${debateId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (debateRoomResponse.data.success) {
        const roomData = debateRoomResponse.data.data;
        setDebateTitle(roomData.title);
        setDebateDescription(roomData.description || "");

        setIsDebateActive(roomData.active);

        if (roomData.active) {
          if (roomData.createdAt && roomData.duration) {
            const creationDate = new Date(roomData.createdAt);
            const endDate = new Date(creationDate);
            endDate.setHours(endDate.getHours() + roomData.duration);
            setEndTime(endDate);
          } else {
            const demoEndTime = new Date();
            demoEndTime.setHours(demoEndTime.getHours() + 1);
            setEndTime(demoEndTime);
          }
        } else {
          fetchEndedRoomResults();
          return;
        }
      }

      const likedUserIdsResponse = await axios.get(
        `${process.env.EXPO_PUBLIC_BASE_URL}/debate-participant/opinion/liked_by/${debateId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (likedUserIdsResponse.data.success) {
        setLikedUserIds(likedUserIdsResponse.data.data || []);
      }
    } catch (err: any) {
      console.error(err);
      logError(err, {
        context: "DebateRoom.fetchDebateRoomAndLikedUserIds",
        debateId: debateId ? `[REDACTED_DEBATE_ID]` : "undefined",
      });

      if (err.response?.status === 401) {
        await refreshToken();
        fetchDebateRoomAndLikedUserIds();
      }
    }
  }, [debateId, token]);

  // Fetch opinions
  const fetchOpinions = useCallback(async () => {
    if (!debateId || !token || !isDebateActive) return;

    setLoadingOpinions(true);
    try {
      const { data } = await axios.get(
        `${process.env.EXPO_PUBLIC_BASE_URL}/debate-participant/opinion/${debateId}?page=${page}&orderBy=${sort}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.data.currentUserOpinion) {
        setSubmitted(true);
        setUserOpinion(data.data.currentUserOpinion.opinion);
        setStance(data.data.currentUserOpinion.agreed ? "agree" : "disagree");
        setUserOpinionId(data.data.currentUserOpinion.user.clerkId);
      }

      if (data.success) {
        setOpinions(data.data.data);
        setSubmitted(data.data.some((o: any) => o.user.clerkId === clerkId));
        setNextPage(data.data.nextPage);
      }
    } catch (err: any) {
      logError(err, {
        context: "DebateRoom.fetchOpinions",
        debateId: debateId ? `[REDACTED_DEBATE_ID]` : "undefined",
        page,
        sort,
      });

      if (err.response?.status === 401) {
        await refreshToken();
        fetchOpinions();
      }
    } finally {
      setLoadingOpinions(false);
      setLoadingInitial(false);
    }
  }, [debateId, token, page, sort, isDebateActive]);

  // Initialize data on token ready
  useEffect(() => {
    if (token) {
      fetchDebateRoomAndLikedUserIds();
      if (isDebateActive) {
        fetchOpinions();
      }
    }
  }, [token, isDebateActive]);

  // Submit opinion
  const onSubmit = useCallback(async () => {
    if (!userOpinion.trim() || !stance || isLoading || !isDebateActive) return;
    setIsLoading(true);
    trackOpinionSubmitted({
      debateId: debateId as string,
      stance: stance as 'for' | 'against',
      opinionLength: userOpinion.length,
      hasEvidence: userOpinion.length > 50 // Simple heuristic for evidence
    });
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
      logError(err, {
        context: "DebateRoom.onSubmit",
        debateId: debateId ? `[REDACTED_DEBATE_ID]` : "undefined",
        stance,
        userOpinionLength: userOpinion.length,
      });

      if (err.response?.status === 401) {
        await refreshToken();
        onSubmit();
      }
    } finally {
      setIsLoading(false);
    }
  }, [debateId, token, userOpinion, stance, isDebateActive]);

  // Handle like/unlike
  const handleLike = async (userId: string) => {
    if (!token || !isDebateActive) return;

    try {
      const { data } = await axios.put(
        `${process.env.EXPO_PUBLIC_BASE_URL}/debate-participant/opinion/like/${userId}/${debateId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        trackOpinionLiked({
          debateId: debateId as string,
          likedUserId: userId as string,
          opinionAuthorId: opinion.userId
        });
        setOpinions((prevOpinions) =>
          prevOpinions.map((op) =>
            op.userId === userId ? { ...op, upvotes: data.data.likes } : op
          )
        );
        if (data.data.action === "liked") {
          setLikedUserIds((prev) => [...prev, userId]);
        } else if (data.data.action === "unliked") {
          setLikedUserIds((prev) => prev.filter((id) => id !== userId));
        }
      }
    } catch (err: any) {
      logError(err, {
        context: "DebateRoom.handleLike",
        debateId: debateId ? `[REDACTED_DEBATE_ID]` : "undefined",
        userId: userId ? `[REDACTED_USER_ID]` : "undefined",
      });

      if (err.response?.status === 401) {
        await refreshToken();
        handleLike(userId);
      }
    }
  };

  // Vote stats calculation
  const agreedCount = useMemo(
    () => opinions.filter((o) => o.agreed).length,
    [opinions]
  );
  const totalVotes = Math.max(1, opinions.length);
  const agreePct = agreedCount / totalVotes;

  // Opinion renderer
  const renderOpinion = useCallback(
    ({ item }: { item: any }) => {
      const isAgreed = item.agreed;
      const isLiked = likedUserIds.includes(item.userId);
      return (
        <TouchableOpacity activeOpacity={0.8} disabled={!isDebateActive}>
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
            <Pressable
              onPress={() => {
                router.push({
                  pathname: "/(tabs)/[id]/page",
                  params: { id: item.userId },
                });
              }}
              hitSlop={10}
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
                {userOpinionId == item?.user.clerkId
                  ? "You"
                  : item.user.username}
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
            </Pressable>

            <Text style={{ color: theme.colors.text, lineHeight: 20 }}>
              {item.opinion}
            </Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 8,
              }}
            >
              <Pressable
                onPress={() => {
                  handleLike(item.userId);
                }}
                style={{ flexDirection: "row", alignItems: "center" }}
              >
                <Ionicons
                  name={isLiked ? "thumbs-up" : "thumbs-up-outline"}
                  size={12}
                  color={isLiked ? "#FF0055" : theme.colors.textMuted}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={{
                    color: isLiked ? "#FF0055" : theme.colors.textMuted,
                    fontSize: 12,
                  }}
                >
                  {item.upvotes}
                </Text>
              </Pressable>

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
                    AI: {item.aiScore || 0}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [handleLike, likedUserIds, isDebateActive]
  );

  if (loadingInitial || isDebateActive === null) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
      >
        <StatusBar barStyle='light-content' />
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
          }}
        >
          <ActivityIndicator size='large' color={theme.colors.primary} />

          <Text
            style={{
              marginTop: 20,
              fontSize: 16,
              color: theme.colors.text,
              fontWeight: "600",
            }}
          >
            Loading Debate...
          </Text>

          <Text
            style={{
              marginTop: 6,
              fontSize: 13,
              color: theme.colors.textMuted,
            }}
          >
            Gathering strong opinions.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show ended debate results
  if (!isDebateActive && endedRoomResults) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
      >
        <StatusBar barStyle='light-content' />
        <Header
          timeRemaining={0}
          setShowModal={setShowModal}
          agreePct={endedRoomResults.agreementRatio}
          opinions={[]}
          debateTitle={debateTitle}
          debateImage={finalDebateImage}
          insets={insets}
          isDebateEnded={true}
          loadingImage={loadingImage}
        />

        <DebateEndedResults
          results={endedRoomResults}
          insets={insets}
          debateTitle={debateTitle}
          debateImage={finalDebateImage}
        />
      </SafeAreaView>
    );
  }

  // Show active debate room
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar
        barStyle='light-content'
        backgroundColor={theme.colors.backgroundDarker}
      />

      <Header
        timeRemaining={timeRemaining}
        setShowModal={setShowModal}
        agreePct={agreePct}
        opinions={opinions}
        debateTitle={debateTitle}
        debateImage={finalDebateImage}
        insets={insets}
        loadingImage={loadingImage}
      />

      {!loadingOpinions ? (
        <>
          <OpinionsList
            loadingOpinions={loadingOpinions}
            flatRef={flatRef}
            opinions={opinions}
            renderOpinion={renderOpinion}
            submitted={submitted}
            isNextPage={isNextPage}
            setPage={setPage}
            isLoadingMore={isLoadingMore}
          />
          <InputBar
            showModal={showModal}
            insets={insets}
            isLoading={isLoading}
            setStance={setStance}
            stance={stance}
            onSubmit={onSubmit}
            setUserOpinion={setUserOpinion}
            submitted={submitted}
            userOpinion={userOpinion}
          />
        </>
      ) : (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size='large' color={theme.colors.primary} />
        </View>
      )}

      {showModal && (
        <ModalSheet
          agreePct={agreePct}
          setShowModal={setShowModal}
          debateDescription={debateDescription}
          debateImage={finalDebateImage}
          debateTitle={debateTitle}
          timeRemaining={timeRemaining}
          opinions={opinions}
          insets={insets}
          debateId={debateId}
          loadingImage={loadingImage}
        />
      )}
    </SafeAreaView>
  );
}
