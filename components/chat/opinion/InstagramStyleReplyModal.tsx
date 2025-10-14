import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  Pressable,
  SafeAreaView,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/clerk-expo';
import { OpinionReply, useOpinionReplyService } from '@/services/opinionReplyApi';
import ReplyItem from './ReplyItem';
import ReplySkeleton from './ReplySkeleton';
import * as Haptics from 'expo-haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.75; // 75% of screen height

interface InstagramStyleReplyModalProps {
  visible: boolean;
  onClose: () => void;
  opinionId: string;
  debateRoomId: string;
  participantUserId: string;
  opinionAuthor: {
    username: string;
    image: string | null;
  };
  opinionContent: string;
  isAgreed: boolean;
  opinionImage?: string | null;
}

const theme = {
  colors: {
    primary: "#00FF94",
    secondary: "#FF00E5",
    background: "#080F12",
    backgroundDarker: "#03120F",
    text: "#FFFFFF",
    textMuted: "#8F9BB3",
    accent: "#FFC700",
  },
};

export default function InstagramStyleReplyModal({
  visible,
  onClose,
  opinionId,
  debateRoomId,
  participantUserId,
  opinionAuthor,
  opinionContent,
  isAgreed,
  opinionImage,
}: InstagramStyleReplyModalProps) {
  const { userId } = useAuth();
  const replyService = useOpinionReplyService();
  
  // Animation refs
  const translateY = useRef(new Animated.Value(MODAL_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  
  // State
  const [replies, setReplies] = useState<OpinionReply[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [childReplies, setChildReplies] = useState<{[key: string]: OpinionReply[]}>({});
  const [loadingChildReplies, setLoadingChildReplies] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<OpinionReply | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load initial replies
  const loadReplies = useCallback(async (pageNum = 1, isLoadMore = false) => {
    if (!userId || (pageNum === 1 && hasLoaded && !isLoadMore)) return;

    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await replyService.getRepliesForOpinion(
        participantUserId,
        pageNum,
        20,
        'date'
      );

      // Handle API response structure - optimized parsing
      let responseData: any[], responseMeta: any = {};
      
      if (Array.isArray(response)) {
        responseData = response;
      } else if (response && typeof response === 'object' && 'data' in response) {
        const resp = response as any;
        if (Array.isArray(resp.data)) {
          responseData = resp.data;
          responseMeta = resp.meta || {};
        } else if (resp.data?.data) {
          responseData = resp.data.data;
          responseMeta = resp.data.meta || {};
        } else {
          responseData = [];
        }
      } else {
        responseData = [];
      }

      // Ensure responseData is an array
      if (Array.isArray(responseData)) {
        if (isLoadMore) {
          setReplies(prev => [...prev, ...responseData]);
        } else {
          setReplies(responseData);
        }
      } else {
        console.warn('Expected array response, got:', responseData);
        if (isLoadMore) {
          // Don't add anything if not an array
        } else {
          setReplies([]);
        }
      }

      setHasNextPage(responseMeta.hasNextPage || false);
      setPage(pageNum);
      setHasLoaded(true);
    } catch (error) {
      console.error('Failed to load replies:', error);
      Alert.alert('Error', 'Failed to load replies. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [userId, participantUserId, replyService, hasLoaded]);

  // Load child replies
  const loadChildReplies = useCallback(async (replyId: string) => {
    if (loadingChildReplies.has(replyId)) return;

    setLoadingChildReplies(prev => new Set([...prev, replyId]));

    try {
      const response = await replyService.getChildReplies(replyId, 1, 50, 'date');
      
      // Handle API response structure
      let responseData: any[];
      
      if (response && typeof response === 'object' && 'data' in response) {
        const resp = response as any;
        if (Array.isArray(resp.data)) {
          responseData = resp.data;
        } else if (resp.data && resp.data.data) {
          responseData = resp.data.data;
        } else {
          responseData = resp.data || [];
        }
      } else if (Array.isArray(response)) {
        responseData = response;
      } else {
        responseData = (response as any)?.data || [];
      }
      
      // Ensure responseData is an array
      if (Array.isArray(responseData)) {
        setChildReplies(prev => ({
          ...prev,
          [replyId]: responseData,
        }));
      } else {
        console.warn('Expected array response for child replies, got:', responseData);
        setChildReplies(prev => ({
          ...prev,
          [replyId]: [],
        }));
      }
      setExpandedReplies(prev => new Set([...prev, replyId]));
    } catch (error) {
      console.error('Failed to load child replies:', error);
      Alert.alert('Error', 'Failed to load child replies. Please try again.');
    } finally {
      setLoadingChildReplies(prev => {
        const newSet = new Set(prev);
        newSet.delete(replyId);
        return newSet;
      });
    }
  }, [replyService, loadingChildReplies]);

  // Submit reply
  const submitReply = useCallback(async () => {
    if (!replyText.trim() || !userId || submitting) return;

    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const request = {
        debateRoomId,
        participantUserId,
        content: replyText.trim(),
        ...(replyingTo && { parentReplyId: replyingTo.id }),
      };

      const response = replyingTo 
        ? await replyService.createNestedReply(replyingTo.id, request)
        : await replyService.createReply(request);

      // Extract the actual reply data from the response
      let newReply: OpinionReply;
      if (response && typeof response === 'object' && 'data' in response) {
        newReply = response.data as OpinionReply;
      } else {
        newReply = response as OpinionReply;
      }

      // Add to appropriate list
      if (replyingTo) {
        setChildReplies(prev => ({
          ...prev,
          [replyingTo.id]: [newReply, ...(prev[replyingTo.id] || [])],
        }));
      } else {
        setReplies(prev => [newReply, ...prev]);
      }

      setReplyText('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Failed to submit reply:', error);
      Alert.alert('Error', 'Failed to submit reply. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [replyText, userId, submitting, debateRoomId, participantUserId, replyingTo, replyService]);

  // Handle reply to a specific reply
  const handleReply = useCallback((reply: OpinionReply) => {
    setReplyingTo(reply);
    setReplyText('');
  }, []);

  // Handle load more replies
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !loadingMore) {
      loadReplies(page + 1, true);
    }
  }, [hasNextPage, loadingMore, page, loadReplies]);

  // Handle load child replies
  const handleLoadChildReplies = useCallback((replyId: string) => {
    // Toggle expanded state
    if (expandedReplies.has(replyId)) {
      // Hide replies
      setExpandedReplies(prev => {
        const newSet = new Set(prev);
        newSet.delete(replyId);
        return newSet;
      });
    } else {
      // Show replies
      loadChildReplies(replyId);
    }
  }, [loadChildReplies, expandedReplies]);

  // Animation functions
  const showModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateY, backdropOpacity]);

  const hideModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: MODAL_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  }, [translateY, backdropOpacity, onClose]);

  // Handle touch-based dismiss
  const handleBackdropPress = () => {
    hideModal();
  };

  // Load replies when modal opens
  useEffect(() => {
    if (visible && !hasLoaded) {
      loadReplies();
      showModal();
    }
  }, [visible, hasLoaded, loadReplies, showModal]);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setReplies([]);
      setReplyText('');
      setReplyingTo(null);
      setPage(1);
      setHasNextPage(false);
      setExpandedReplies(new Set());
      setChildReplies({});
      setLoadingChildReplies(new Set());
      setHasLoaded(false);
      
      // Reset animation values
      translateY.setValue(MODAL_HEIGHT);
      backdropOpacity.setValue(0);
    }
  }, [visible, translateY, backdropOpacity]);

  const renderReply = ({ item }: { item: OpinionReply }) => (
    <ReplyItem
      key={item.id}
      reply={item}
      level={1}
      onReply={handleReply}
      onLoadReplies={handleLoadChildReplies}
      showReplies={expandedReplies.has(item.id)}
      childReplies={childReplies[item.id] || []}
      loadingChildReplies={loadingChildReplies.has(item.id)}
      debateRoomId={debateRoomId}
      participantUserId={participantUserId}
    />
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={hideModal}
      statusBarTranslucent
    >
      <View style={{ flex: 1 }}>
        {/* Backdrop */}
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            opacity: backdropOpacity,
          }}
        >
          <Pressable
            style={{ flex: 1 }}
            onPress={handleBackdropPress}
          />
        </Animated.View>

        {/* Modal Content */}
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: MODAL_HEIGHT,
            backgroundColor: theme.colors.background,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            transform: [{ translateY }],
          }}
        >
          <View style={{ flex: 1 }}>
              {/* Handle Bar */}
              <TouchableOpacity
                onPress={hideModal}
                style={{
                  alignItems: 'center',
                  paddingVertical: 8,
                  marginBottom: 8,
                }}
                activeOpacity={0.7}
              >
                <View
                  style={{
                    width: 40,
                    height: 4,
                    backgroundColor: theme.colors.textMuted,
                    borderRadius: 2,
                  }}
                />
              </TouchableOpacity>

              {/* Header */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingBottom: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: 'rgba(255, 255, 255, 0.1)',
                }}
              >
                <TouchableOpacity
                  onPress={hideModal}
                  style={{
                    padding: 8,
                    marginRight: 12,
                  }}
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={theme.colors.text}
                  />
                </TouchableOpacity>
                
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontSize: 18,
                      fontWeight: '600',
                    }}
                  >
                    Replies
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.textMuted,
                      fontSize: 14,
                    }}
                  >
                    {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                  </Text>
                </View>
              </View>

              {/* Original Opinion - Instagram Style */}
              <View
                style={{
                  backgroundColor: isAgreed 
                    ? 'rgba(0, 255, 148, 0.08)' 
                    : 'rgba(255, 0, 229, 0.08)',
                  margin: 16,
                  padding: 16,
                  borderRadius: 12,
                  borderLeftWidth: 3,
                  borderLeftColor: isAgreed 
                    ? theme.colors.primary 
                    : theme.colors.secondary,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontWeight: '600',
                      fontSize: 14,
                    }}
                  >
                    {opinionAuthor.username}
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.textMuted,
                      fontSize: 12,
                      marginLeft: 'auto',
                    }}
                  >
                    Original opinion
                  </Text>
                </View>
                <Text
                  style={{
                    color: theme.colors.text,
                    fontSize: 14,
                    lineHeight: 20,
                  }}
                >
                  {opinionContent}
                </Text>
              </View>

              {/* Replies List */}
              <FlatList
                data={replies}
                renderItem={renderReply}
                keyExtractor={(item) => item.id}
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 16 }}
                ListEmptyComponent={
                  loading ? (
                    <View style={{ padding: 16 }}>
                      <ReplySkeleton level={1} />
                      <ReplySkeleton level={1} />
                      <ReplySkeleton level={1} />
                    </View>
                  ) : (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                      <Ionicons
                        name="chatbubbles-outline"
                        size={48}
                        color={theme.colors.textMuted}
                      />
                      <Text
                        style={{
                          color: theme.colors.textMuted,
                          marginTop: 8,
                          fontSize: 16,
                        }}
                      >
                        No replies yet
                      </Text>
                      <Text
                        style={{
                          color: theme.colors.textMuted,
                          marginTop: 4,
                          fontSize: 14,
                          textAlign: 'center',
                        }}
                      >
                        Be the first to reply to this opinion
                      </Text>
                    </View>
                  )
                }
                ListFooterComponent={
                  loadingMore ? (
                    <View style={{ padding: 16 }}>
                      <ReplySkeleton level={1} />
                    </View>
                  ) : hasNextPage ? (
                    <TouchableOpacity
                      onPress={handleLoadMore}
                      style={{
                        padding: 16,
                        alignItems: 'center',
                        borderTopWidth: 1,
                        borderTopColor: 'rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <Text
                        style={{
                          color: theme.colors.primary,
                          fontSize: 14,
                          fontWeight: '500',
                        }}
                      >
                        Load more replies
                      </Text>
                    </TouchableOpacity>
                  ) : null
                }
              />

              {/* Reply Input - Instagram Style */}
              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: 'rgba(255, 255, 255, 0.1)',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  backgroundColor: theme.colors.backgroundDarker,
                }}
              >
                {replyingTo && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: 8,
                      padding: 8,
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.colors.textMuted,
                        fontSize: 12,
                        flex: 1,
                      }}
                    >
                      Replying to {replyingTo.user?.username || 'Unknown User'}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setReplyingTo(null)}
                      style={{ padding: 4 }}
                    >
                      <Ionicons
                        name="close"
                        size={16}
                        color={theme.colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                )}
                
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-end',
                  }}
                >
                  <TextInput
                    value={replyText}
                    onChangeText={setReplyText}
                    placeholder={replyingTo ? `Reply to ${replyingTo.user?.username || 'Unknown User'}...` : "Write a reply..."}
                    placeholderTextColor={theme.colors.textMuted}
                    style={{
                      flex: 1,
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: 20,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      color: theme.colors.text,
                      fontSize: 14,
                      maxHeight: 100,
                      marginRight: 8,
                    }}
                    multiline
                    textAlignVertical="top"
                  />
                  
                  <TouchableOpacity
                    onPress={submitReply}
                    disabled={!replyText.trim() || submitting}
                    style={{
                      backgroundColor: replyText.trim() && !submitting 
                        ? theme.colors.primary 
                        : 'rgba(255, 255, 255, 0.1)',
                      borderRadius: 20,
                      padding: 12,
                      opacity: replyText.trim() && !submitting ? 1 : 0.5,
                    }}
                  >
                    {submitting ? (
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          backgroundColor: 'rgba(255, 255, 255, 0.3)',
                          borderRadius: 10,
                        }}
                      />
                    ) : (
                      <Ionicons
                        name="send"
                        size={20}
                        color={replyText.trim() && !submitting 
                          ? theme.colors.background 
                          : theme.colors.textMuted}
                      />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
