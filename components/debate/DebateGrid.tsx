import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 48) / 3; // 3 columns with padding

const THEME = {
  colors: {
    primary: "#00FF94",
    background: "#080F12",
    cardBackground: "#262626",
    text: "#FFFFFF",
    textSecondary: "#a3a3a3",
    textMuted: "#9CA3AB",
    border: "#404040",
    success: "#10b981",
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  borderRadius: { sm: 8, md: 12, lg: 16, xl: 24 },
};

interface Debate {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  image: string;
  duration: number;
  active: boolean;
  keywords: string[];
  upvotes: number;
  joinedUsers: number;
}

interface DebateGridProps {
  debates: Debate[];
  onDebatePress: (debate: Debate) => void;
  loading?: boolean;
}

// Generate random grid sizes for aesthetic appeal
const getGridSize = (index: number) => {
  const sizes = [
    { width: 1, height: 1 }, // Small
    { width: 2, height: 1 }, // Wide
    { width: 1, height: 2 }, // Tall
    { width: 2, height: 2 }, // Large
  ];
  
  // Use index to create a pattern but still look random
  const sizeIndex = index % sizes.length;
  return sizes[sizeIndex];
};

const DebateGridItem: React.FC<{
  debate: Debate;
  size: { width: number; height: number };
  onPress: () => void;
}> = ({ debate, size, onPress }) => {
  const itemWidth = ITEM_SIZE * size.width + (size.width - 1) * 8; // 8px gap
  const itemHeight = ITEM_SIZE * size.height + (size.height - 1) * 8;

  return (
    <TouchableOpacity
      style={[
        styles.gridItem,
        {
          width: itemWidth,
          height: itemHeight,
        }
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Image source={{ uri: debate.image }} style={styles.debateImage} />
      
      {/* Overlay */}
      <View style={styles.overlay}>
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: debate.active ? THEME.colors.success : THEME.colors.textMuted }
          ]}>
            <Text style={styles.statusText}>
              {debate.active ? "Active" : "Ended"}
            </Text>
          </View>
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.debateTitle} numberOfLines={size.height > 1 ? 3 : 2}>
            {debate.title}
          </Text>
          
          {size.height > 1 && (
            <View style={styles.metricsContainer}>
              <View style={styles.metricItem}>
                <Ionicons name="people" size={12} color={THEME.colors.textMuted} />
                <Text style={styles.metricText}>{debate.joinedUsers}</Text>
              </View>
              <View style={styles.metricItem}>
                <Ionicons name="arrow-up" size={12} color={THEME.colors.textMuted} />
                <Text style={styles.metricText}>{debate.upvotes}</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const DebateGrid: React.FC<DebateGridProps> = ({ debates, onDebatePress, loading = false }) => {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading debates...</Text>
      </View>
    );
  }

  if (debates.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="chatbubbles-outline" size={48} color={THEME.colors.primary} />
        </View>
        <Text style={styles.emptyText}>No debates yet</Text>
        <Text style={styles.emptySubText}>User hasn't created any debates</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {debates.map((debate, index) => {
          const size = getGridSize(index);
          return (
            <DebateGridItem
              key={debate.id}
              debate={debate}
              size={size}
              onPress={() => onDebatePress(debate)}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: THEME.spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  gridItem: {
    borderRadius: THEME.borderRadius.md,
    overflow: 'hidden',
    backgroundColor: THEME.colors.cardBackground,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  debateImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'space-between',
    padding: THEME.spacing.sm,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    color: THEME.colors.text,
    fontSize: 10,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  debateTitle: {
    color: THEME.colors.text,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    marginBottom: 4,
  },
  metricsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  metricText: {
    color: THEME.colors.textMuted,
    fontSize: 10,
    fontWeight: '500',
  },
  loadingContainer: {
    padding: THEME.spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    color: THEME.colors.textMuted,
    fontSize: 14,
  },
  emptyContainer: {
    padding: THEME.spacing.xl,
    alignItems: 'center',
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 255, 148, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
    borderWidth: 2,
    borderColor: 'rgba(0, 255, 148, 0.2)',
  },
  emptyText: {
    color: THEME.colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubText: {
    color: THEME.colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
});

export default DebateGrid;