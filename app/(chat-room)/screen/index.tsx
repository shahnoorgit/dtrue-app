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
  Share,
  Alert,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
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
import { trackOpinionSubmitted, trackOpinionLiked, trackDebateJoined, trackContentShared } from "@/lib/posthog/events";
import { Modal } from "react-native";
import InstagramStyleReplyModal from "@/components/chat/opinion/InstagramStyleReplyModal";

export default function DebateRoom() {
  const { debateId, debateImage, clerkId } = useLocalSearchParams();
  const [token, refreshToken] = useAuthToken();
  const flatRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasFetchedInitialData = useRef(false);

  // UI state
  const [debateTitle, setDebateTitle] = useState(`Debate ${debateId}`);
  const [creatorStatement, setCreatorStatement] = useState("");
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [debateDescription, setDebateDescription] = useState("");
  const [opinions, setOpinions] = useState<any[]>([]);
  const [loadingOpinions, setLoadingOpinions] = useState(true);
  const [stance, setStance] = useState<"agree" | "disagree" | null>(null);
  const [userOpinion, setUserOpinion] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isNextPage, setNextPage] = useState<boolean | null>(null);
  const [likedUserIds, setLikedUserIds] = useState<string[]>([]);
  const [userOpinionId, setUserOpinionId] = useState<string | null>(null);
  const [isDebateActive, setIsDebateActive] = useState<boolean | null>(null);
  const [endedRoomResults, setEndedRoomResults] = useState<any>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  
  // Optimistic like state
  const [optimisticLikes, setOptimisticLikes] = useState<{[key: string]: {count: number, isLiked: boolean}}>({});
  const [pendingLikes, setPendingLikes] = useState<Set<string>>(new Set());
  
  // Edit opinion state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingOpinionData, setEditingOpinionData] = useState<any>(null);
  const [showEditMenu, setShowEditMenu] = useState(false);
  const [selectedOpinionForEdit, setSelectedOpinionForEdit] = useState<any>(null);
  
  // Reply modal state
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedOpinionForReply, setSelectedOpinionForReply] = useState<any>(null);
  
  // Menu modal state
  const [showMenuModal, setShowMenuModal] = useState(false);

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
      if (!(global as any).hasSeenDebateModal) {
        (global as any).hasSeenDebateModal = true;
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
        setCreatorStatement(roomData.creator_statement || "");
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
  const fetchOpinions = useCallback(async (pageNum = 1, isLoadMore = false) => {
    if (!debateId || !token) return;

    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setLoadingOpinions(true);
    }
    
    try {
      const { data } = await axios.get(
        `${process.env.EXPO_PUBLIC_BASE_URL}/debate-participant/opinion/${debateId}?page=${pageNum}&orderBy=${sort}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.data.currentUserOpinion && pageNum === 1) {
        setSubmitted(true);
        setUserOpinion(data.data.currentUserOpinion.opinion);
        setStance(data.data.currentUserOpinion.agreed ? "agree" : "disagree");
        setUserOpinionId(data.data.currentUserOpinion.user.clerkId);
      }

      if (data.success) {
        if (isLoadMore) {
          setOpinions(prev => [...prev, ...data.data.data]);
        } else {
          setOpinions(data.data.data);
          setSubmitted(data.data.some((o: any) => o.user.clerkId === clerkId));
        }
        setNextPage(data.data.nextPage);
      }
    } catch (err: any) {
      logError(err, {
        context: "DebateRoom.fetchOpinions",
        debateId: debateId ? `[REDACTED_DEBATE_ID]` : "undefined",
        page: pageNum,
        sort,
      });

      if (err.response?.status === 401) {
        await refreshToken();
        fetchOpinions(pageNum, isLoadMore);
      }
    } finally {
      setLoadingOpinions(false);
      setIsLoadingMore(false);
      setLoadingInitial(false);
    }
  }, [debateId, token, sort]);

  // Initialize data on token ready
  useEffect(() => {
    if (token) {
      fetchDebateRoomAndLikedUserIds();
    }
  }, [token]);

  // Fetch opinions only when debate is confirmed active
  useEffect(() => {
    if (isDebateActive === true && token && !hasFetchedInitialData.current) {
      hasFetchedInitialData.current = true;
      fetchOpinions();
    }
  }, [isDebateActive, token]);


  // Edit opinion
  const onEditOpinion = useCallback(async () => {
    if (!userOpinion.trim() || !stance || isLoading || !isDebateActive || !isEditMode) return;
    setIsLoading(true);
    try {
      const { data } = await axios.patch(
        `${process.env.EXPO_PUBLIC_BASE_URL}/debate-participant/opinion`,
        {
          roomId: debateId,
          opinion: userOpinion.trim(),
          isAgree: stance === "agree" ? true : false,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.statusCode === 200 || data.success) {
        setUserOpinion("");
        setStance(null);
        setIsEditMode(false);
        setEditingOpinionData(null);
        fetchOpinions();
        setTimeout(() => {
          flatRef.current?.scrollToEnd({ animated: true });
        }, 300);
      }
    } catch (err: any) {
      logError(err, {
        context: "DebateRoom.onEditOpinion",
        debateId: debateId ? `[REDACTED_DEBATE_ID]` : "undefined",
        stance,
        userOpinionLength: userOpinion.length,
      });

      if (err.response?.status === 401) {
        await refreshToken();
        onEditOpinion();
      }
    } finally {
      setIsLoading(false);
    }
  }, [debateId, token, userOpinion, stance, isDebateActive, isEditMode]);

  // Submit opinion
  const onSubmit = useCallback(async () => {
    if (!userOpinion.trim() || !stance || isLoading || !isDebateActive) return;
    
    // If in edit mode, call edit function instead
    if (isEditMode) {
      return onEditOpinion();
    }
    
    setIsLoading(true);
    trackOpinionSubmitted({
      debateId: debateId as string,
      stance: stance as 'for' | 'against',
      opinionLength: userOpinion.length,
      hasEvidence: userOpinion.length > 50, // Simple heuristic for evidence
      likedUserId: '',
      opinionAuthorId: ''
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
  }, [debateId, token, userOpinion, stance, isDebateActive, isEditMode, onEditOpinion]);

  // Handle like/unlike with optimistic updates
  const handleLike = async (userId: string, opinion: any) => {
    if (!token || !isDebateActive || pendingLikes.has(userId)) return;

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const isCurrentlyLiked = likedUserIds.includes(userId);
    const currentCount = opinion.upvotes || 0;
    
    // Optimistic update
    const newCount = isCurrentlyLiked ? currentCount - 1 : currentCount + 1;
    const newIsLiked = !isCurrentlyLiked;
    
    // Update optimistic state immediately
    setOptimisticLikes(prev => ({
      ...prev,
      [userId]: { count: newCount, isLiked: newIsLiked }
    }));
    
    // Add to pending set
    setPendingLikes(prev => new Set([...prev, userId]));
    
    // Update liked user IDs immediately
    if (newIsLiked) {
      setLikedUserIds(prev => [...prev, userId]);
    } else {
      setLikedUserIds(prev => prev.filter(id => id !== userId));
    }
    
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

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
          opinionAuthorId: opinion.userId,
          stance: opinion.agreed ? 'for' : 'against',
          opinionLength: opinion.opinion?.length || 0,
          hasEvidence: (opinion.opinion?.length || 0) > 50
        });
        
        // Update with actual server response
        setOpinions((prevOpinions) =>
          prevOpinions.map((op) =>
            op.userId === userId ? { ...op, upvotes: data.data.likes } : op
          )
        );
        
        // Update optimistic state with server data
        setOptimisticLikes(prev => ({
          ...prev,
          [userId]: { count: data.data.likes, isLiked: data.data.action === "liked" }
        }));
        
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

      // Rollback optimistic update on error
      setOptimisticLikes(prev => ({
        ...prev,
        [userId]: { count: currentCount, isLiked: isCurrentlyLiked }
      }));
      
      // Rollback liked user IDs
      if (isCurrentlyLiked) {
        setLikedUserIds(prev => [...prev, userId]);
      } else {
        setLikedUserIds(prev => prev.filter(id => id !== userId));
      }

      if (err.response?.status === 401) {
        await refreshToken();
        handleLike(userId, opinion);
      }
    } finally {
      // Remove from pending set
      setPendingLikes(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  // Vote stats calculation
  const agreedCount = useMemo(
    () => opinions.filter((o) => o.agreed).length,
    [opinions]
  );
  const totalVotes = Math.max(1, opinions.length);
  const agreePct = agreedCount / totalVotes;

  // Helper function to format date and time
  const formatDateTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      // Show time if within 24 hours
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } else if (diffInHours < 24 * 7) {
      // Show day of week if within a week
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } else {
      // Show full date for older posts
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }
  }, []);

  // Opinion renderer with improved UX
  const renderOpinion = useCallback(
    ({ item }: { item: any }) => {
      const isAgreed = item.agreed;
      const optimisticData = optimisticLikes[item.userId];
      const isLiked = optimisticData ? optimisticData.isLiked : likedUserIds.includes(item.userId);
      const upvotes = optimisticData ? optimisticData.count : item.upvotes;
      const isPending = pendingLikes.has(item.userId);
      
      return (
        <Pressable
          onLongPress={() => {
            // Long press - like the opinion
            if (isDebateActive && !isPending) {
              handleLike(item.userId, item);
            }
          }}
          delayLongPress={500}
          style={{
            marginHorizontal: 8,
            marginVertical: 4,
            alignSelf: isAgreed ? "flex-end" : "flex-start",
            maxWidth: "80%",
            borderRadius: 12,
            backgroundColor: isAgreed ? "rgba(0, 255, 148, 0.08)" : "rgba(255, 0, 229, 0.08)",
            borderLeftWidth: 2,
            borderLeftColor: isAgreed
              ? theme.colors.primary
              : theme.colors.secondary,
            borderWidth: 0,
            borderColor: "transparent",
            padding: 10,
            opacity: isPending ? 0.7 : 1,
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
                {formatDateTime(item.createdAt)}
              </Text>
              
              {/* 3-dot menu for user's own opinion */}
              {userOpinionId == item?.user.clerkId && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    setSelectedOpinionForEdit(item);
                    setShowEditMenu(true);
                  }}
                  hitSlop={10}
                  style={{ marginLeft: 8 }}
                >
                  <Ionicons
                    name="ellipsis-vertical"
                    size={16}
                    color={theme.colors.textMuted}
                  />
                </TouchableOpacity>
              )}
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
                  if (isDebateActive && !isPending) {
                    handleLike(item.userId, item);
                  }
                }}
                style={{ 
                  flexDirection: "row", 
                  alignItems: "center",
                  opacity: isPending ? 0.6 : 1,
                }}
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
                    fontWeight: isLiked ? "600" : "400",
                  }}
                >
                  {upvotes}
                </Text>
                {isPending && (
                  <ActivityIndicator 
                    size="small" 
                    color="#FF0055" 
                    style={{ marginLeft: 4 }} 
                  />
                )}
              </Pressable>

              {/* Reply Button with Count */}
              <Pressable
                onPress={() => handleOpenReplyModal(item)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginLeft: 16,
                }}
              >
                <Ionicons
                  name="chatbubble-outline"
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
                  {item.reply_count > 0 ? item.reply_count : 'Reply'}
                </Text>
              </Pressable>
            </View>

            {/* AI Flags Section */}
            <View style={{ marginTop: 8 }}>
              {item.aiFlagged ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "rgba(255, 60, 60, 0.08)",
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "rgba(255, 60, 60, 0.2)",
                  }}
                >
                  <Ionicons
                    name='alert-circle'
                    size={11}
                    color='rgba(255, 60, 60, 0.9)'
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={{
                      color: 'rgba(255, 60, 60, 0.9)',
                      fontSize: 11,
                      fontWeight: '500',
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
                    backgroundColor: "rgba(0, 255, 148, 0.08)",
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "rgba(0, 255, 148, 0.2)",
                  }}
                >
                  <MaterialCommunityIcons
                    name='robot'
                    size={11}
                    color={theme.colors.primary}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={{
                      color: theme.colors.primary,
                      fontSize: 11,
                      fontWeight: '500',
                    }}
                  >
                    AI Score: {item.aiScore || 0}%
                  </Text>
                </View>
              ) : null}
            </View>
          
        </Pressable>
      );
    },
    [handleLike, likedUserIds, isDebateActive, optimisticLikes, pendingLikes, userOpinionId, formatDateTime]
  );

  // Handle edit button click
  const handleEditClick = useCallback(() => {
    if (selectedOpinionForEdit) {
      setUserOpinion(selectedOpinionForEdit.opinion);
      setStance(selectedOpinionForEdit.agreed ? "agree" : "disagree");
      setIsEditMode(true);
      setEditingOpinionData(selectedOpinionForEdit);
      setSubmitted(false); // Allow input bar to show
      setShowEditMenu(false);
    }
  }, [selectedOpinionForEdit]);

  // Handle cancel edit
  const handleCancelEdit = useCallback(() => {
    setIsEditMode(false);
    setEditingOpinionData(null);
    setUserOpinion("");
    setStance(null);
    setSubmitted(true); // Hide input bar
  }, []);

  // Handle reply modal
  const handleOpenReplyModal = useCallback((opinion: any) => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    setSelectedOpinionForReply(opinion);
    setShowReplyModal(true);
  }, []);

  const handleCloseReplyModal = useCallback(() => {
    setShowReplyModal(false);
    setSelectedOpinionForReply(null);
  }, []);

  // Handle reply count update
  const handleReplyCreated = useCallback((participantUserId: string) => {
    // Update the opinion's reply_count in the opinions list
    setOpinions(prev => prev.map(opinion => 
      opinion.userId === participantUserId
        ? { ...opinion, reply_count: (opinion.reply_count || 0) + 1 }
        : opinion
    ));
  }, []);

  // Handle menu press
  const handleMenuPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowMenuModal(true);
  }, []);

  // Handle share debate
  const handleShareDebate = useCallback(async () => {
    setShowMenuModal(false);
    
    try {
      const base = process.env.EXPO_PUBLIC_SHARE_URL || "https://links-dev.dtrue.online";
      const shareUrl = `${base}/debate/${debateId}`;

      await Share.share({
        title: debateTitle,
        message: `${debateTitle}\n\nJoin the debate: ${shareUrl}`,
        url: shareUrl,
      });

      trackContentShared({
        type: 'debate',
        contentId: debateId as string,
        method: 'native'
      });
    } catch (err) {
      console.error("Share error", err);
      Alert.alert("Could not share", "Please try again.");
    }
  }, [debateId, debateTitle]);

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
        <DebateEndedResults
          results={endedRoomResults}
          insets={insets}
          debateTitle={debateTitle}
          debateImage={finalDebateImage || ""}
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
        onMenuPress={handleMenuPress}
      />

      {!loadingOpinions ? (
        <>
          <OpinionsList
            loadingOpinions={loadingOpinions}
            flatRef={flatRef}
            opinions={opinions}
            renderOpinion={renderOpinion}
            submitted={submitted}
            isNextPage={isNextPage || false}
            onLoadMore={() => {
              setPage(prev => prev + 1);
              fetchOpinions(page + 1, true);
            }}
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
            isEditMode={isEditMode}
            onCancelEdit={handleCancelEdit}
            creatorStatement={creatorStatement}
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
          showModal={showModal}
          agreePct={agreePct}
          setShowModal={setShowModal}
          debateDescription={debateDescription}
          debateImage={finalDebateImage}
          debateTitle={debateTitle}
          creatorStatement={creatorStatement}
          timeRemaining={timeRemaining}
          opinions={opinions}
          insets={insets}
        />
      )}

      {/* Edit Opinion Menu Modal */}
      <Modal
        visible={showEditMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEditMenu(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={() => setShowEditMenu(false)}
        >
          <View
            style={{
              backgroundColor: theme.colors.backgroundDarker,
              borderRadius: 16,
              padding: 20,
              width: "80%",
              maxWidth: 300,
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.1)",
            }}
          >
            <Text
              style={{
                color: theme.colors.text,
                fontSize: 18,
                fontWeight: "600",
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              Edit Opinion
            </Text>

            <TouchableOpacity
              onPress={handleEditClick}
              style={{
                backgroundColor: "rgba(0, 255, 148, 0.1)",
                borderRadius: 12,
                padding: 14,
                marginBottom: 10,
                borderWidth: 1,
                borderColor: theme.colors.primary,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="create-outline"
                  size={20}
                  color={theme.colors.primary}
                  style={{ marginRight: 10 }}
                />
                <Text
                  style={{
                    color: theme.colors.primary,
                    fontSize: 16,
                    fontWeight: "500",
                  }}
                >
                  Edit Opinion
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowEditMenu(false)}
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                borderRadius: 12,
                padding: 14,
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.1)",
              }}
            >
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: 16,
                  fontWeight: "500",
                  textAlign: "center",
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Instagram Style Reply Modal */}
      {selectedOpinionForReply && (
        <InstagramStyleReplyModal
          visible={showReplyModal}
          onClose={handleCloseReplyModal}
          opinionId={selectedOpinionForReply.id}
          debateRoomId={debateId as string}
          participantUserId={selectedOpinionForReply.userId}
          opinionAuthor={{
            username: selectedOpinionForReply.user.username,
            image: selectedOpinionForReply.user.image,
          }}
          opinionContent={selectedOpinionForReply.opinion}
          isAgreed={selectedOpinionForReply.agreed}
          opinionImage={selectedOpinionForReply.user.image}
          onReplyCreated={handleReplyCreated}
        />
      )}

      {/* Debate Menu Modal */}
      <Modal
        visible={showMenuModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMenuModal(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            justifyContent: "flex-end",
          }}
          onPress={() => setShowMenuModal(false)}
        >
          <View
            style={{
              backgroundColor: "#1A1A1A",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingBottom: Math.max(20, insets.bottom),
            }}
          >
            {/* Handle Bar */}
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: "rgba(255, 255, 255, 0.3)",
                borderRadius: 2,
                alignSelf: "center",
                marginTop: 12,
                marginBottom: 20,
              }}
            />

            {/* Share Option */}
            <TouchableOpacity
              onPress={handleShareDebate}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 16,
                paddingHorizontal: 20,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}
              >
                <Ionicons
                  name="share-social-outline"
                  size={20}
                  color="#FFF"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: "#FFF",
                    fontSize: 16,
                    fontWeight: "500",
                  }}
                >
                  Share Debate
                </Text>
                <Text
                  style={{
                    color: "rgba(255, 255, 255, 0.5)",
                    fontSize: 13,
                    marginTop: 2,
                  }}
                >
                  Invite others to join
                </Text>
              </View>
            </TouchableOpacity>

            {/* Cancel */}
            <TouchableOpacity
              onPress={() => setShowMenuModal(false)}
              style={{
                paddingVertical: 16,
                paddingHorizontal: 20,
              }}
            >
              <Text
                style={{
                  color: "rgba(255, 255, 255, 0.6)",
                  fontSize: 16,
                  fontWeight: "500",
                  textAlign: "center",
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
