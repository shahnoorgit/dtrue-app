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
  Animated,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
  InteractionManager,
  Keyboard,
  LayoutAnimation,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/clerk-expo';
import { OpinionReply, useOpinionReplyService } from '@/services/opinionReplyApi';
import ReplyItem from './ReplyItem';
import ReplySkeleton from './ReplySkeleton';
import * as Haptics from 'expo-haptics';
import { scaleFontSize, getResponsivePadding } from '@/utils/responsive';

const STATUS_BAR_HEIGHT = StatusBar.currentHeight || 0;

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
  onReplyCreated,
}: InstagramStyleReplyModalProps) {
  const { userId } = useAuth();
  const replyService = useOpinionReplyService();
  const insets = useSafeAreaInsets();
  const { height: SCREEN_HEIGHT } = useWindowDimensions();
  
  const MODAL_HEIGHT = Platform.select({
    ios: SCREEN_HEIGHT * 0.70,
    android: SCREEN_HEIGHT - STATUS_BAR_HEIGHT,
  }) || SCREEN_HEIGHT * 0.7;
  
  // Animation refs
  const translateY = useRef(new Animated.Value(MODAL_HEIGHT || 0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const listRef = useRef<FlatList>(null);
  
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
  const [sortBy, setSortBy] = useState<'best' | 'top' | 'controversial' | 'date'>('best');
  const [isOpinionExpanded, setIsOpinionExpanded] = useState(false);
  const [inputContainerHeight, setInputContainerHeight] = useState(64);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [listContentHeight, setListContentHeight] = useState(0);
  const [visibleHeight, setVisibleHeight] = useState(MODAL_HEIGHT);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Keyboard handling for Android modal (adjustResize doesn't apply within Modal)
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      const kbHeight = e.endCoordinates.height;
      setKeyboardHeight(kbHeight);
      setIsKeyboardVisible(true);
      setVisibleHeight(SCREEN_HEIGHT - kbHeight);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
      setVisibleHeight(MODAL_HEIGHT);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
      setHasLoaded(true);
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

  // Animation functions
  const showModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateY, backdropOpacity]);

  const hideModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: MODAL_HEIGHT || 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
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
      setLoading(true);
      showModal();
      InteractionManager.runAfterInteractions(() => {
        loadReplies();
      });
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
      setSortBy('best'); // Reset sort to default
      
      // Reset animation values
      translateY.setValue(MODAL_HEIGHT || 0);
      backdropOpacity.setValue(0);
    }
  }, [visible, translateY, backdropOpacity]);

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
      key={item.id}
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

  // Calculate dynamic heights and padding
  const actualModalHeight = Math.min(visibleHeight, SCREEN_HEIGHT - (insets.top || 0));
  const listAvailableHeight = actualModalHeight - (headerHeight || 0) - (inputContainerHeight || 0);
  const keyboardSpace = Platform.select({
    ios: keyboardHeight,
    android: isKeyboardVisible ? keyboardHeight : 0
  }) || 0;
  const bottomPadding = keyboardSpace + inputContainerHeight;

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
            height: actualModalHeight,
            overflow: 'hidden',
            backgroundColor: theme.colors.background,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            transform: [{ translateY }],
          }}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['bottom']}>
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={Platform.OS === 'ios' ? STATUS_BAR_HEIGHT : 0}
            >
              <View style={{ flex: 1 }}>
              {/* Header Block (measured for iOS keyboard offset) */}
              <View onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
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

                {/* Header - Compact */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingBottom: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <TouchableOpacity
                    onPress={hideModal}
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
                        numberOfLines={1}
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
                        flexShrink: 1,
                      }}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      by {opinionAuthor.username}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontSize: scaleFontSize(13, 12, 14),
                      lineHeight: 18,
                      opacity: 0.8,
                      flexShrink: 1,
                    }}
                    numberOfLines={isOpinionExpanded ? undefined : 2}
                    ellipsizeMode="tail"
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
              </View>

              {/* Replies List */}
              <FlatList
                ref={listRef}
                data={replies}
                renderItem={renderReply}
                keyExtractor={(item) => item.id}
                style={{ height: listAvailableHeight }}
                contentContainerStyle={{
                  paddingHorizontal: 16,
                  paddingBottom: bottomPadding,
                  flexGrow: 1,
                }}
                initialNumToRender={8}
                maxToRenderPerBatch={8}
                windowSize={7}
                removeClippedSubviews
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                onContentSizeChange={(w, h) => setListContentHeight(h)}
                maintainVisibleContentPosition={{
                  minIndexForVisible: 0,
                  autoscrollToTopThreshold: 10,
                }}
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
                  marginBottom: 0,
                }}
                onLayout={(e) => setInputContainerHeight(e.nativeEvent.layout.height)}
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
                    onFocus={() => {
                      if (listContentHeight > listAvailableHeight) {
                        InteractionManager.runAfterInteractions(() => {
                          listRef.current?.scrollToOffset({
                            offset: listContentHeight - listAvailableHeight,
                            animated: true
                          });
                        });
                      }
                    }}
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
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}
