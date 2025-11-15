import React from 'react';
import { View, Animated } from 'react-native';

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

interface ReplySkeletonProps {
  level: number;
}

export default function ReplySkeleton({ level }: ReplySkeletonProps) {
  const leftMargin = level * 12; // Match ReplyItem indentation

  return (
    <View style={{ marginLeft: leftMargin, marginBottom: 8 }}>
      <View
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          borderRadius: 8,
          padding: 8,
        }}
      >
        {/* Header Skeleton */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          {/* Profile Image Skeleton */}
          <View
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              marginRight: 6,
            }}
          />
          
          {/* Username Skeleton */}
          <View
            style={{
              width: 70,
              height: 12,
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 4,
              marginRight: 6,
            }}
          />
          
          {/* Timestamp Skeleton */}
          <View
            style={{
              width: 36,
              height: 10,
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              borderRadius: 4,
            }}
          />
        </View>

        {/* Content Skeleton */}
        <View style={{ marginBottom: 8 }}>
          <View
            style={{
              width: '100%',
              height: 12,
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 4,
              marginBottom: 4,
            }}
          />
          <View
            style={{
              width: '65%',
              height: 12,
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              borderRadius: 4,
            }}
          />
        </View>

        {/* Actions Skeleton */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* Upvote Button Skeleton */}
            <View style={{ width: 44, height: 14, backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: 4, marginRight: 12 }} />
            
            {/* Reply Button Skeleton */}
            <View style={{ width: 36, height: 14, backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: 4 }} />
          </View>
        </View>
      </View>
    </View>
  );
}
