import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Pressable,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OpinionReply } from '@/services/opinionReplyApi';
import { useOpinionReplyService } from '@/services/opinionReplyApi';
import { useAuth } from '@clerk/clerk-expo';
import * as Haptics from 'expo-haptics';
import ReplySkeleton from './ReplySkeleton';

interface ReplyItemProps {
  reply: OpinionReply;
  level: number; // 0 = top level, 1 = first nested, 2 = second nested
  onReply: (reply: OpinionReply) => void;
  onLoadReplies?: (replyId: string) => void;
  showReplies?: boolean;
  childReplies?: OpinionReply[];
  loadingChildReplies?: boolean;
  debateRoomId: string;
  participantUserId: string;
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

const ReplyItem = React.memo(function ReplyItem({
  reply,
  level,
  onReply,
  onLoadReplies,
  showReplies = false,
  childReplies = [],
  loadingChildReplies = false,
  debateRoomId,
  participantUserId,
}: ReplyItemProps) {
  const { userId } = useAuth();
  const replyService = useOpinionReplyService();
  const [isUpvoting, setIsUpvoting] = useState(false);
  const [optimisticUpvotes, setOptimisticUpvotes] = useState(reply?.upvotes || 0);
  const [optimisticIsUpvoted, setOptimisticIsUpvoted] = useState(reply?.isUpvoted || false);

  // Safety check for reply object
  if (!reply || !reply.id) {
    console.warn('Invalid reply object:', reply);
    return null;
  }

  const maxLevel = 2; // Maximum nesting level (0, 1, 2)
  const canReply = level < maxLevel; // Hide reply button for level 2 (3rd level)
  const isOwner = reply.isOwner;

  // Format timestamp - memoized to prevent recalculation
  const formattedTime = useMemo(() => {
    const date = new Date(reply.createdAt);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  }, [reply.createdAt]);

  // Handle upvote - memoized to prevent recreation
  const handleUpvote = useCallback(async () => {
    if (isUpvoting) return;

    setIsUpvoting(true);
    
    // Optimistic update
    const newUpvoted = !optimisticIsUpvoted;
    const newUpvotes = newUpvoted ? optimisticUpvotes + 1 : optimisticUpvotes - 1;
    
    setOptimisticIsUpvoted(newUpvoted);
    setOptimisticUpvotes(newUpvotes);
    
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const response = await replyService.toggleUpvote(reply.id);
      setOptimisticUpvotes(response.upvoteCount);
      setOptimisticIsUpvoted(response.upvoted);
    } catch (error) {
      console.error('Failed to upvote reply:', error);
      // Rollback optimistic update
      setOptimisticIsUpvoted(!newUpvoted);
      setOptimisticUpvotes(optimisticUpvotes);
      Alert.alert('Error', 'Failed to upvote reply. Please try again.');
    } finally {
      setIsUpvoting(false);
    }
  }, [isUpvoting, optimisticIsUpvoted, optimisticUpvotes, reply.id, replyService]);

  // Handle reply - memoized
  const handleReply = useCallback(() => {
    if (canReply) {
      onReply(reply);
    }
  }, [canReply, onReply, reply]);

  // Handle load replies - memoized
  const handleLoadReplies = useCallback(() => {
    if (onLoadReplies && reply.childRepliesCount > 0) {
      onLoadReplies(reply.id);
    }
  }, [onLoadReplies, reply.childRepliesCount, reply.id]);

  // Handle toggle replies visibility
  const handleToggleReplies = useCallback(() => {
    if (showReplies) {
      // Hide replies - we need to pass this up to parent
      if (onLoadReplies) {
        onLoadReplies(reply.id); // This should toggle the visibility
      }
    } else {
      // Show replies
      handleLoadReplies();
    }
  }, [showReplies, onLoadReplies, reply.id, handleLoadReplies]);

  // Handle delete (only for owner)
  const handleDelete = () => {
    if (!isOwner) return;

    Alert.alert(
      'Delete Reply',
      'Are you sure you want to delete this reply?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await replyService.deleteReply(reply.id);
              // The parent component should handle removing this reply from the list
            } catch (error) {
              console.error('Failed to delete reply:', error);
              Alert.alert('Error', 'Failed to delete reply. Please try again.');
            }
          },
        },
      ]
    );
  };

  const leftMargin = level * 24; // Indent based on nesting level

  return (
    <View style={{ marginLeft: leftMargin, marginBottom: 12 }}>
      {/* Main Reply Content - Better Integrated Style */}
      <View
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.04)',
          borderRadius: 8,
          padding: 12,
          borderLeftWidth: 2,
          borderLeftColor: level === 1 
            ? theme.colors.primary 
            : theme.colors.secondary,
          borderWidth: 0.5,
          borderColor: 'rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Header - Better Integrated Style */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          {/* Child replies indicator */}
          {reply.childRepliesCount > 0 && (
            <View
              style={{
                width: 4,
                height: 4,
                borderRadius: 2,
                backgroundColor: theme.colors.primary,
                marginRight: 6,
                opacity: showReplies ? 1 : 0.5,
              }}
            />
          )}
          {/* Profile Image - Clickable */}
          <TouchableOpacity
            onPress={() => {
              // TODO: Navigate to user profile
              // console.log('Navigate to profile:', reply.user?.id);
            }}
            style={{ marginRight: 10 }}
          >
            <Image
              source={{ uri: reply.user?.image || 'https://via.placeholder.com/24' }}
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.2)',
              }}
            />
          </TouchableOpacity>
          
          {/* Username - Clickable */}
          <TouchableOpacity
            onPress={() => {
              // TODO: Navigate to user profile
              // console.log('Navigate to profile:', reply.user?.id);
            }}
          >
            <Text
              style={{
                color: theme.colors.text,
                fontWeight: '600',
                fontSize: 14,
              }}
            >
              {reply.user?.username || 'Unknown User'}
            </Text>
          </TouchableOpacity>
          
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: 12,
              marginLeft: 8,
            }}
          >
            {formattedTime}
          </Text>
          
          {/* Edit indicator */}
          {reply.isEdited && (
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: 11,
                marginLeft: 6,
                fontStyle: 'italic',
              }}
            >
              (edited)
            </Text>
          )}
        </View>

        {/* Reply Content - Better Integrated Style */}
        <Text
          style={{
            color: theme.colors.text,
            lineHeight: 20,
            fontSize: 14,
            marginBottom: 10,
          }}
        >
          {reply.isDeleted ? '[This reply has been deleted]' : reply.content}
        </Text>

        {/* Actions - Better Integrated Style */}
        {!reply.isDeleted && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* Upvote Button - Better Integrated Style */}
              <TouchableOpacity
                onPress={handleUpvote}
                disabled={isUpvoting}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginRight: 16,
                  opacity: isUpvoting ? 0.6 : 1,
                }}
              >
                <Ionicons
                  name={optimisticIsUpvoted ? 'thumbs-up' : 'thumbs-up-outline'}
                  size={16}
                  color={optimisticIsUpvoted ? theme.colors.primary : theme.colors.textMuted}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={{
                    color: optimisticIsUpvoted ? theme.colors.primary : theme.colors.textMuted,
                    fontSize: 13,
                    fontWeight: optimisticIsUpvoted ? '600' : '500',
                  }}
                >
                  {optimisticUpvotes}
                </Text>
                {isUpvoting && (
                  <View
                    style={{
                      width: 12,
                      height: 12,
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: 6,
                      marginLeft: 6,
                    }}
                  />
                )}
              </TouchableOpacity>

              {/* Reply Button - Better Integrated Style */}
              {canReply && (
                <TouchableOpacity
                  onPress={handleReply}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginRight: 16,
                  }}
                >
                  <Ionicons
                    name="chatbubble-outline"
                    size={16}
                    color={theme.colors.textMuted}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={{
                      color: theme.colors.textMuted,
                      fontSize: 13,
                      fontWeight: '500',
                    }}
                  >
                    Reply
                  </Text>
                </TouchableOpacity>
              )}

              {/* View/Hide Replies Button - Better Integrated Style */}
              {reply.childRepliesCount > 0 && (
                <TouchableOpacity
                  onPress={handleToggleReplies}
                  disabled={loadingChildReplies}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    opacity: loadingChildReplies ? 0.6 : 1,
                  }}
                >
                  <Animated.View
                    style={{
                      transform: [{ rotate: showReplies ? '180deg' : '0deg' }],
                    }}
                  >
                    <Ionicons
                      name="chevron-down"
                      size={14}
                      color={theme.colors.primary}
                      style={{ marginRight: 4 }}
                    />
                  </Animated.View>
                  <Text
                    style={{
                      color: theme.colors.primary,
                      fontSize: 13,
                      fontWeight: '600',
                    }}
                  >
                    {loadingChildReplies 
                      ? 'Loading...' 
                      : showReplies 
                        ? `Hide ${reply.childRepliesCount} ${reply.childRepliesCount === 1 ? 'reply' : 'replies'}`
                        : `View ${reply.childRepliesCount} ${reply.childRepliesCount === 1 ? 'reply' : 'replies'}`
                    }
                  </Text>
                  {loadingChildReplies && (
                    <View
                      style={{
                        width: 12,
                        height: 12,
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: 6,
                        marginLeft: 6,
                      }}
                    />
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Owner Actions - Better Integrated Style */}
            {isOwner && (
              <TouchableOpacity
                onPress={handleDelete}
                style={{
                  padding: 6,
                }}
              >
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={theme.colors.textMuted}
                />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Child Replies with Visual Connection */}
      {showReplies && childReplies.length > 0 && (
        <View style={{ marginTop: 8, position: 'relative' }}>
          {/* Connecting line for visual association */}
          <View
            style={{
              position: 'absolute',
              left: 12, // Align with profile image
              top: 0,
              bottom: 0,
              width: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 1,
            }}
          />
          
          {/* Child replies with better visual connection */}
          {childReplies.map((childReply, index) => (
            <View key={childReply.id} style={{ position: 'relative' }}>
              {/* Horizontal connector line */}
              <View
                style={{
                  position: 'absolute',
                  left: 12,
                  top: 20, // Align with profile image center
                  width: 12,
                  height: 2,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: 1,
                  zIndex: 1,
                }}
              />
              
              <ReplyItem
                reply={childReply}
                level={level + 1}
                onReply={onReply}
                onLoadReplies={onLoadReplies}
                showReplies={false} // Child replies don't show their own children by default
                childReplies={[]}
                loadingChildReplies={false}
                debateRoomId={debateRoomId}
                participantUserId={participantUserId}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
});

export default ReplyItem;
