import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/clerk-expo';
import { OpinionReply, useOpinionReplyService } from '@/services/opinionReplyApi';
import ReplyItem from './ReplyItem';
import ReplySkeleton from './ReplySkeleton';
import * as Haptics from 'expo-haptics';

interface ReplyModalProps {
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
  onReplyCreated?: (participantUserId: string) => void;
}

const theme = {
  colors: {
    primary: "#00FF94",
    secondary: "#FF00E5",
    background: "#080F12",
    backgroundDarker: "#03120F",
    text: "#FFFFFF",
    textMuted: "#9CA3AB",
    accent: "#FFC700",
  },
};

export default function ReplyModal({
  visible,
  onClose,
  opinionId,
  debateRoomId,
  participantUserId,
  opinionAuthor,
  opinionContent,
  isAgreed,
  onReplyCreated,
}: ReplyModalProps) {
  const { userId } = useAuth();
  const replyService = useOpinionReplyService();
  
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
  const [hasLoaded, setHasLoaded] = useState(false); // Prevent multiple loads
  const [sortBy, setSortBy] = useState<'best' | 'top' | 'controversial' | 'date'>('best');
  const [isOpinionExpanded, setIsOpinionExpanded] = useState(false);

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
        sortBy
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
      setHasLoaded(true); // Mark as loaded
    } catch (error) {
      console.error('Failed to load replies:', error);
      Alert.alert('Error', 'Failed to load replies. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [userId, participantUserId, replyService, hasLoaded, sortBy]);

  // Load child replies
  const loadChildReplies = useCallback(async (replyId: string) => {
    if (loadingChildReplies.has(replyId)) return;

    setLoadingChildReplies(prev => new Set([...prev, replyId]));

    try {
      const response = await replyService.getChildReplies(replyId, 1, 50, sortBy);
      
      
      // Handle API response structure - check if it's wrapped in data property
      let responseData: any[];
      
      if (response && typeof response === 'object' && 'data' in response) {
        const resp = response as any;
        if (Array.isArray(resp.data)) {
          // Direct array response
          responseData = resp.data;
        } else if (resp.data && resp.data.data) {
          // Nested data structure (like existing APIs)
          responseData = resp.data.data;
        } else {
          // Fallback
          responseData = resp.data || [];
        }
      } else if (Array.isArray(response)) {
        // Direct array response
        responseData = response;
      } else {
        // Fallback - try to extract data
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
  }, [replyService, loadingChildReplies, sortBy]);

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

      // console.log('New reply data:', newReply); // Debug log

      // Add to appropriate list
      if (replyingTo) {
        // Add to child replies
        setChildReplies(prev => ({
          ...prev,
          [replyingTo.id]: [newReply, ...(prev[replyingTo.id] || [])],
        }));
        
        // Expand the parent to show the new reply
        setExpandedReplies(prev => new Set([...prev, replyingTo.id]));
        
        // Update parent reply's child count
        setReplies(prev => prev.map(r => 
          r.id === replyingTo.id 
            ? { ...r, childRepliesCount: (r.childRepliesCount || 0) + 1 }
            : r
        ));
        
        // Also check if replyingTo is in any child replies and update those
        setChildReplies(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(parentId => {
            updated[parentId] = updated[parentId].map(r =>
              r.id === replyingTo.id
                ? { ...r, childRepliesCount: (r.childRepliesCount || 0) + 1 }
                : r
            );
          });
          return updated;
        });
      } else {
        // Top-level reply
        setReplies(prev => [newReply, ...prev]);
        
        // Notify parent component to update opinion's reply count
        if (onReplyCreated) {
          onReplyCreated(participantUserId);
        }
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

  // Handle delete reply
  const handleDeleteReply = useCallback((replyId: string) => {
    // Remove from main replies list
    setReplies(prev => prev.filter(r => r.id !== replyId));
    
    // Remove from child replies
    setChildReplies(prev => {
      const newChildReplies = { ...prev };
      // Remove from any parent's child list
      Object.keys(newChildReplies).forEach(parentId => {
        newChildReplies[parentId] = newChildReplies[parentId].filter(r => r.id !== replyId);
      });
      return newChildReplies;
    });
  }, []);

  // Handle upvote reply
  const handleUpvoteReply = useCallback((replyId: string, upvoted: boolean, upvoteCount: number) => {
    // Ensure we have valid values
    const validUpvoted = upvoted ?? false;
    const validUpvoteCount = upvoteCount ?? 0;
    
    // Update in main replies list
    setReplies(prev => prev.map(r => 
      r.id === replyId 
        ? { ...r, isUpvoted: validUpvoted, upvotes: validUpvoteCount }
        : r
    ));
    
    // Update in child replies
    setChildReplies(prev => {
      const newChildReplies = { ...prev };
      Object.keys(newChildReplies).forEach(parentId => {
        newChildReplies[parentId] = newChildReplies[parentId].map(r =>
          r.id === replyId
            ? { ...r, isUpvoted: validUpvoted, upvotes: validUpvoteCount }
            : r
        );
      });
      return newChildReplies;
    });
  }, []);

  // Load replies when modal opens
  useEffect(() => {
    if (visible && !hasLoaded) {
      loadReplies();
    }
  }, [visible, hasLoaded]); // Only load if not already loaded

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
      setHasLoaded(false); // Reset loaded flag
      setSortBy('best'); // Reset sort to default
    }
  }, [visible]);

  // Reload replies when sort changes
  useEffect(() => {
    if (visible && hasLoaded) {
      setHasLoaded(false); // Force reload
      setReplies([]);
      setPage(1);
      loadReplies(1, false);
    }
  }, [sortBy]);

  const renderReply = ({ item }: { item: OpinionReply }) => (
    <ReplyItem
      reply={item}
      level={1}
      onReply={handleReply}
      onLoadReplies={handleLoadChildReplies}
      onDelete={handleDeleteReply}
      onUpvote={handleUpvoteReply}
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
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header - Compact */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(255, 255, 255, 0.1)',
            }}
          >
            <TouchableOpacity
              onPress={onClose}
              style={{
                padding: 6,
                marginRight: 12,
              }}
            >
              <Ionicons
                name="close"
                size={22}
                color={theme.colors.text}
              />
            </TouchableOpacity>
            
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: theme.colors.text,
                  fontSize: 16,
                  fontWeight: '600',
                }}
              >
                Replies ({replies.length})
              </Text>
            </View>
          </View>

          {/* Sort Tabs - Compact */}
          <View
            style={{
              flexDirection: 'row',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(255, 255, 255, 0.1)',
              gap: 6,
            }}
          >
            {(['best', 'top', 'controversial', 'date'] as const).map((sort) => (
              <TouchableOpacity
                key={sort}
                onPress={() => setSortBy(sort)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  backgroundColor: sortBy === sort 
                    ? theme.colors.primary 
                    : 'rgba(255, 255, 255, 0.05)',
                }}
              >
                <Text
                  style={{
                    color: sortBy === sort ? theme.colors.background : theme.colors.text,
                    fontSize: 12,
                    fontWeight: sortBy === sort ? '600' : '400',
                    textTransform: 'capitalize',
                  }}
                >
                  {sort}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Original Opinion - Expandable */}
          <View
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              marginHorizontal: 16,
              marginVertical: 8,
              padding: 8,
              borderRadius: 6,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 6,
                gap: 6,
              }}
            >
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontWeight: '600',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Original Opinion
              </Text>
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: 10,
                  opacity: 0.6,
                }}
              >
                by {opinionAuthor.username}
              </Text>
            </View>
            <Text
              style={{
                color: theme.colors.text,
                fontSize: 13,
                lineHeight: 18,
                opacity: 0.8,
              }}
              numberOfLines={isOpinionExpanded ? undefined : 2}
            >
              {opinionContent}
            </Text>
            {opinionContent.length > 100 && (
              <TouchableOpacity
                onPress={() => setIsOpinionExpanded(!isOpinionExpanded)}
                style={{ marginTop: 4 }}
              >
                <Text
                  style={{
                    color: theme.colors.primary,
                    fontSize: 11,
                    fontWeight: '500',
                  }}
                >
                  {isOpinionExpanded ? 'View less' : 'View more'}
                </Text>
              </TouchableOpacity>
            )}
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

          {/* Reply Input */}
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
                  Replying to {replyingTo.user.username}
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
                placeholder={replyingTo ? `Reply to ${replyingTo.user.username}...` : "Write a reply..."}
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
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
