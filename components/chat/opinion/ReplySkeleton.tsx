import React from 'react';
import { View, Animated } from 'react-native';

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

interface ReplySkeletonProps {
  level: number;
}

export default function ReplySkeleton({ level }: ReplySkeletonProps) {
  const leftMargin = level * 24; // Match ReplyItem indentation

  return (
    <View style={{ marginLeft: leftMargin, marginBottom: 12 }}>
      <View
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.04)',
          borderRadius: 8,
          padding: 12,
          borderLeftWidth: 2,
          borderLeftColor: level === 1 ? theme.colors.primary : theme.colors.secondary,
          borderWidth: 0.5,
          borderColor: 'rgba(255, 255, 255, 0.1)',
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
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              marginRight: 10,
            }}
          />
          
          {/* Username Skeleton */}
          <View
            style={{
              width: 80,
              height: 14,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 4,
              marginRight: 8,
            }}
          />
          
          {/* Timestamp Skeleton */}
          <View
            style={{
              width: 40,
              height: 12,
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 4,
            }}
          />
        </View>

        {/* Content Skeleton */}
        <View style={{ marginBottom: 10 }}>
          <View
            style={{
              width: '100%',
              height: 14,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 4,
              marginBottom: 4,
            }}
          />
          <View
            style={{
              width: '70%',
              height: 14,
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
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
            <View
              style={{
                width: 50,
                height: 16,
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                borderRadius: 4,
                marginRight: 16,
              }}
            />
            
            {/* Reply Button Skeleton */}
            <View
              style={{
                width: 40,
                height: 16,
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                borderRadius: 4,
              }}
            />
          </View>
        </View>
      </View>
    </View>
  );
}
