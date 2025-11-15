import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Dimensions,
  StyleSheet,
  Pressable,
  Modal,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { cyberpunkTheme } from '@/constants/theme';
import { SuggestedUser, suggestedUsersApi } from '@/services/suggestedUsersApi';
import { useAuthToken } from '@/hook/clerk/useFetchjwtToken';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 3; // 3 columns with padding

interface SuggestedUsersScreenProps {
  onComplete: () => void;
}

const SuggestedUsersScreen: React.FC<SuggestedUsersScreenProps> = ({ onComplete }) => {
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [followingLoading, setFollowingLoading] = useState<Set<string>>(new Set());
  const router = useRouter();
  const [token, refreshToken] = useAuthToken();

  // Fetch suggested users
  const fetchSuggestedUsers = useCallback(async () => {
    try {
      setLoading(true);
      const users = await suggestedUsersApi.getSuggestedUsers();
      setSuggestedUsers(users);
    } catch (error: any) {
      console.error('Error fetching suggested users:', error);
      Alert.alert('Error', 'Failed to load suggested users. You can skip this step.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchSuggestedUsers();
  }, [fetchSuggestedUsers]);

  // Follow user
  const handleFollow = useCallback(async (userId: string) => {
    if (followingLoading.has(userId) || following.has(userId)) return;

    try {
      setFollowingLoading(prev => new Set(prev).add(userId));
      
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const response = await fetch(`${process.env.EXPO_PUBLIC_BASE_URL}/user/follow/${userId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        await refreshToken();
        // Token will be updated in the hook, retry the request
        return await handleFollow(userId);
      }

      const data = await response.json();
      if (data.success) {
        setFollowing(prev => new Set(prev).add(userId));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error(data.message || 'Failed to follow user');
      }
    } catch (error: any) {
      console.error('Error following user:', error);
      Alert.alert('Error', 'Failed to follow user. Please try again.');
    } finally {
      setFollowingLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  }, [token, refreshToken, following, followingLoading]);

  // Skip onboarding
  const handleSkip = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onComplete();
  }, [onComplete]);

  // Continue to app
  const handleContinue = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onComplete();
  }, [onComplete]);

  const renderUserCard = ({ item }: { item: SuggestedUser }) => {
    const isFollowing = following.has(item.id);
    const isLoading = followingLoading.has(item.id);

    return (
      <View style={styles.userCard}>
        <Pressable
          onPress={() => handleFollow(item.id)}
          disabled={isLoading}
          style={[
            styles.cardContent,
            isFollowing && styles.followingCard,
          ]}
        >
          <Image source={{ uri: item.image }} style={styles.userImage} />
          
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.followersCount} numberOfLines={1}>
              {item.followersCount.toLocaleString()} followers
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => handleFollow(item.id)}
            disabled={isLoading}
            style={[
              styles.followButton,
              isFollowing && styles.followingButton,
            ]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={cyberpunkTheme.colors.primary} />
            ) : (
              <Ionicons
                name={isFollowing ? 'checkmark' : 'add'}
                size={16}
                color={isFollowing ? cyberpunkTheme.colors.primary : '#FFFFFF'}
              />
            )}
          </TouchableOpacity>
        </Pressable>
      </View>
    );
  };

  if (loading) {
    return (
      <Modal
        visible={true}
        animationType="fade"
        transparent={true}
        statusBarTranslucent={true}
      >
        <StatusBar backgroundColor="rgba(0, 0, 0, 0.8)" barStyle="light-content" />
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={['rgba(0, 0, 0, 0.8)', 'rgba(0, 0, 0, 0.9)'] as [string, string]}
            style={styles.blurBackground}
          />
        </View>
        <View style={styles.modalContainer}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={cyberpunkTheme.colors.primary} />
            <Text style={styles.loadingText}>Loading suggested users...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={true}
      animationType="fade"
      transparent={true}
      statusBarTranslucent={true}
      onRequestClose={handleSkip}
    >
      <StatusBar backgroundColor="rgba(0, 0, 0, 0.8)" barStyle="light-content" />
      
      {/* Blurred Background */}
      <View style={styles.modalOverlay}>
        <LinearGradient
          colors={['rgba(0, 0, 0, 0.8)', 'rgba(0, 0, 0, 0.9)'] as [string, string]}
          style={styles.blurBackground}
        />
      </View>

      {/* Modal Content */}
      <View style={styles.modalContainer}>
        <LinearGradient
          colors={['#080F12', '#03120F']}
          style={styles.gradient}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={styles.title}>Follow Suggested Users</Text>
              <TouchableOpacity
                onPress={handleSkip}
                style={styles.closeButton}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color={cyberpunkTheme.colors.text.muted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.subtitle}>
              Discover amazing debaters and follow users you find interesting
            </Text>
          </View>

          {/* Users Grid */}
          <View style={styles.gridContainer}>
            <FlatList
              data={suggestedUsers}
              renderItem={renderUserCard}
              keyExtractor={(item) => item.id}
              numColumns={3}
              columnWrapperStyle={styles.row}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.gridContent}
            />
          </View>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handleSkip}
              style={styles.skipButton}
              activeOpacity={0.8}
            >
              <Text style={styles.skipButtonText}>Skip for now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleContinue}
              style={styles.continueButton}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={cyberpunkTheme.colors.gradients.primary as [string, string]}
                style={styles.continueGradient}
              >
                <Text style={styles.continueButtonText}>
                  Continue to App
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  blurBackground: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    zIndex: 2,
  },
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: cyberpunkTheme.colors.background.primary,
  },
  loadingText: {
    color: cyberpunkTheme.colors.text.primary,
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 32,
    alignItems: 'center',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: cyberpunkTheme.colors.text.primary,
    textAlign: 'center',
    flex: 1,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  subtitle: {
    fontSize: 16,
    color: cyberpunkTheme.colors.text.muted,
    textAlign: 'center',
    lineHeight: 24,
  },
  gridContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  gridContent: {
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  userCard: {
    width: CARD_WIDTH,
    backgroundColor: cyberpunkTheme.colors.background.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cyberpunkTheme.colors.primary + '20',
    overflow: 'hidden',
  },
  cardContent: {
    padding: 12,
    alignItems: 'center',
  },
  followingCard: {
    borderColor: cyberpunkTheme.colors.primary,
    backgroundColor: cyberpunkTheme.colors.overlay.light,
  },
  userImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: cyberpunkTheme.colors.primary + '40',
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 8,
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: cyberpunkTheme.colors.text.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  followersCount: {
    fontSize: 12,
    color: cyberpunkTheme.colors.text.muted,
    textAlign: 'center',
  },
  followButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: cyberpunkTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: cyberpunkTheme.colors.primary,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 16,
  },
  skipButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    color: cyberpunkTheme.colors.text.muted,
    fontWeight: '500',
  },
  continueButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  continueGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: cyberpunkTheme.colors.background.primary,
  },
});

export default SuggestedUsersScreen;
