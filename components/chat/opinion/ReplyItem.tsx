import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
  onDelete?: (replyId: string) => void;
  onUpvote?: (replyId: string, upvoted: boolean, upvoteCount: number) => void;
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
  onDelete,
  onUpvote,
  showReplies = false,
  childReplies = [],
  loadingChildReplies = false,
  debateRoomId,
  participantUserId,
}: ReplyItemProps) {
  const { userId } = useAuth();
  const replyService = useOpinionReplyService();
  const [isUpvoting, setIsUpvoting] = useState(false);
  
  // Local state for upvotes - this is the source of truth for display
  const [localUpvoted, setLocalUpvoted] = useState(reply.isUpvoted || false);
  const [localUpvoteCount, setLocalUpvoteCount] = useState(reply.upvotes ?? 0);
  
  // Track if user has manually interacted with this reply
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // Safety check for reply object
  if (!reply || !reply.id) {
    console.warn('Invalid reply object:', reply);
    return null;
  }

  // Sync with props when they change (but not if user is currently interacting)
  useEffect(() => {
    if (!isUpvoting && !hasUserInteracted) {
      setLocalUpvoted(reply.isUpvoted || false);
      setLocalUpvoteCount(reply.upvotes ?? 0);
    }
  }, [reply.isUpvoted, reply.upvotes, isUpvoting, hasUserInteracted]);

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
    setHasUserInteracted(true);
    
    // Immediate optimistic update
    const newUpvoted = !localUpvoted;
    const newUpvoteCount = newUpvoted 
      ? localUpvoteCount + 1 
      : Math.max(0, localUpvoteCount - 1);
    
    setLocalUpvoted(newUpvoted);
    setLocalUpvoteCount(newUpvoteCount);
    
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const response = await replyService.toggleUpvote(reply.id);
      
      // Update with actual server response
      const serverUpvoted = response.upvoted ?? newUpvoted;
      const serverUpvoteCount = response.upvoteCount ?? newUpvoteCount;
      
      setLocalUpvoted(serverUpvoted);
      setLocalUpvoteCount(serverUpvoteCount);
      
      // Notify parent component to update its state
      if (onUpvote) {
        onUpvote(reply.id, serverUpvoted, serverUpvoteCount);
      }
      
      // Reset interaction flag after a delay
      setTimeout(() => {
        setHasUserInteracted(false);
      }, 1000);
    } catch (error) {
      console.error('Failed to upvote reply:', error);
      // Rollback on error
      setLocalUpvoted(!newUpvoted);
      setLocalUpvoteCount(newUpvoted ? localUpvoteCount : localUpvoteCount + 1);
      setHasUserInteracted(false);
      Alert.alert('Error', 'Failed to upvote reply. Please try again.');
    } finally {
      setIsUpvoting(false);
    }
  }, [isUpvoting, localUpvoted, localUpvoteCount, reply.id, replyService, onUpvote]);

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
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              // Notify parent component to remove this reply from the list
              if (onDelete) {
                onDelete(reply.id);
              }
            } catch (error) {
              console.error('Failed to delete reply:', error);
              Alert.alert('Error', 'Failed to delete reply. Please try again.');
            }
          },
        },
      ]
    );
  };

  const leftMargin = level * 12; // Minimal indent

  return (
    <View style={{ marginLeft: leftMargin, marginBottom: 8 }}>
      {/* Main Reply Content - Clean & Minimal */}
      <View
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          borderRadius: 8,
          padding: 8,
        }}
      >
        {/* Compact Header with Image */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 8,
            gap: 6,
          }}
        >
          {/* Profile Image - Small */}
          <Image
            source={{ uri: reply.user?.image || 'https://via.placeholder.com/18' }}
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
            }}
          />
          
          {/* Username - Compact */}
          <Text
            style={{
              color: theme.colors.text,
              fontWeight: '600',
              fontSize: 12,
            }}
          >
            {reply.user?.username || 'Unknown User'}
          </Text>
          
          {/* Time - Minimal */}
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: 10,
              opacity: 0.6,
            }}
          >
            {formattedTime}
          </Text>
          
          {/* Edit indicator */}
          {reply.isEdited && (
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: 9,
                opacity: 0.5,
              }}
            >
              edited
            </Text>
          )}
          
          {/* Delete button - Inline */}
          {isOwner && !reply.isDeleted && (
            <TouchableOpacity
              onPress={handleDelete}
              style={{
                marginLeft: 'auto',
                padding: 2,
              }}
            >
              <Ionicons
                name="trash-outline"
                size={13}
                color={theme.colors.textMuted}
                style={{ opacity: 0.6 }}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Reply Content - CLEAN & READABLE */}
        <Text
          style={{
            color: theme.colors.text,
            lineHeight: 22,
            fontSize: 15,
            marginBottom: 10,
            letterSpacing: 0.15,
          }}
        >
          {reply.isDeleted ? '[This reply has been deleted]' : reply.content}
        </Text>

        {/* Minimal Actions Bar */}
        {!reply.isDeleted && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
            {/* Upvote - Compact with Like Icon */}
            <TouchableOpacity
              onPress={handleUpvote}
              disabled={isUpvoting}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                opacity: isUpvoting ? 0.5 : 1,
              }}
            >
              <Ionicons
                name={localUpvoted ? 'heart' : 'heart-outline'}
                size={13}
                color={localUpvoted ? '#FF0055' : theme.colors.textMuted}
                style={{ marginRight: 3 }}
              />
              <Text
                style={{
                  color: localUpvoted ? '#FF0055' : theme.colors.textMuted,
                  fontSize: 11,
                  fontWeight: '500',
                }}
              >
                {localUpvoteCount}
              </Text>
            </TouchableOpacity>

            {/* Reply - Minimal */}
            {canReply && (
              <TouchableOpacity
                onPress={handleReply}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Ionicons
                  name="arrow-undo-outline"
                  size={13}
                  color={theme.colors.textMuted}
                  style={{ marginRight: 3 }}
                />
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    fontSize: 11,
                  }}
                >
                  Reply
                </Text>
              </TouchableOpacity>
            )}

            {/* View Replies - Minimal */}
            {reply.childRepliesCount > 0 && (
              <TouchableOpacity
                onPress={handleToggleReplies}
                disabled={loadingChildReplies}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  opacity: loadingChildReplies ? 0.5 : 1,
                }}
              >
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    fontSize: 11,
                  }}
                >
                  {loadingChildReplies 
                    ? '...' 
                    : showReplies 
                      ? `Hide ${reply.childRepliesCount}`
                      : `${reply.childRepliesCount} ${reply.childRepliesCount === 1 ? 'reply' : 'replies'}`
                  }
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Child Replies - Minimal */}
      {showReplies && childReplies.length > 0 && (
        <View style={{ marginTop: 4 }}>
          {childReplies.map((childReply) => (
            <ReplyItem
              key={childReply.id}
              reply={childReply}
              level={level + 1}
              onReply={onReply}
              onLoadReplies={onLoadReplies}
              onDelete={onDelete}
              onUpvote={onUpvote}
              showReplies={false}
              childReplies={[]}
              loadingChildReplies={false}
              debateRoomId={debateRoomId}
              participantUserId={participantUserId}
            />
          ))}
        </View>
      )}
    </View>
  );
});

export default ReplyItem;
