import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Pressable,
  Dimensions,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { cyberpunkTheme } from "@/constants/theme";
import * as Haptics from "expo-haptics";

const DebateFeed = () => {
  const [activeFilter, setActiveFilter] = useState("trending");
  const [screenHeight, setScreenHeight] = useState(
    Dimensions.get("window").height
  );
  const [tabBarHeight, setTabBarHeight] = useState(70); // Approximate height of tab bar

  // Update dimensions on rotation or window changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setScreenHeight(window.height);
    });
    return () => subscription.remove();
  }, []);

  // Animation for button presses
  const createButtonAnimation = () => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const handlePressIn = () => {
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }).start();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };
    const handlePressOut = () => {
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    };
    return { scaleAnim, handlePressIn, handlePressOut };
  };

  const headerButtonAnim = createButtonAnimation();
  const filterButtonAnim = createButtonAnimation();
  const debateButtonAnim = createButtonAnimation();

  // Dummy data (unchanged)
  const debates = [
    {
      id: 1,
      creator: {
        name: "NeuralNomad",
        avatar: "https://i.pravatar.cc/150?img=1",
        verified: true,
        followers: 24893,
      },
      topic:
        "Should quantum computing be regulated before it breaks current encryption?",
      category: "Technology",
      timeRemaining: 18,
      participants: 128,
      positions: { for: 58, against: 42 },
      tags: ["#QuantumTech", "#Cybersecurity", "#Regulation"],
      keyArgument: {
        author: "CryptoDefender",
        text: "Current banking systems rely on encryption...",
      },
    },
    {
      id: 2,
      creator: {
        name: "NeuralNomad",
        avatar: "https://i.pravatar.cc/150?img=1",
        verified: true,
        followers: 24893,
      },
      topic:
        "Should quantum computing be regulated before it breaks current encryption?",
      category: "Technology",
      timeRemaining: 18,
      participants: 128,
      positions: { for: 58, against: 42 },
      tags: ["#QuantumTech", "#Cybersecurity", "#Regulation"],
      keyArgument: {
        author: "CryptoDefender",
        text: "Current banking systems rely on encryption...",
      },
    },
    {
      id: 3,
      creator: {
        name: "NeuralNomad",
        avatar: "https://i.pravatar.cc/150?img=1",
        verified: true,
        followers: 24893,
      },
      topic:
        "Should quantum computing be regulated before it breaks current encryption?",
      category: "Technology",
      timeRemaining: 18,
      participants: 128,
      positions: { for: 58, against: 42 },
      tags: ["#QuantumTech", "#Cybersecurity", "#Regulation"],
      keyArgument: {
        author: "CryptoDefender",
        text: "Current banking systems rely on encryption...",
      },
    },
  ];

  const filterOptions = [
    { id: "trending", label: "Trending" },
    { id: "popular", label: "Popular" },
    { id: "new", label: "New" },
    { id: "closing", label: "Closing Soon" },
  ];

  const formatTimeRemaining = (hours) => {
    if (hours < 1) return "Ending soon";
    if (hours < 24) return `${hours}h remaining`;
    return `${Math.floor(hours / 24)}d ${hours % 24}h remaining`;
  };

  const getUrgencyColor = (hours) => {
    if (hours < 6) return cyberpunkTheme.colors.secondary; // #FF00E5
    if (hours < 24) return cyberpunkTheme.colors.accent; // #FFC700
    return cyberpunkTheme.colors.primary; // #00FF94
  };

  return (
    <View
      className='flex-1 bg-[#080F12]'
      style={{
        height: screenHeight - tabBarHeight, // Account for tab bar height
      }}
    >
      {/* Fixed Header */}
      <View className='bg-[#080F12] z-10'>
        {/* App Header */}
        <View className='flex-row justify-between items-center px-6 pt-8 pb-4 border-b border-[rgba(0,255,148,0.2)]'>
          <Text className='text-[#00FF94] text-lg font-bold tracking-wide'>
            Let's Debate
          </Text>
          <View className='flex-row items-center'>
            <Animated.View
              style={{ transform: [{ scale: headerButtonAnim.scaleAnim }] }}
            >
              <Pressable
                className='relative ml-4'
                onPressIn={headerButtonAnim.handlePressIn}
                onPressOut={headerButtonAnim.handlePressOut}
              >
                <Icon
                  name='account-group-outline'
                  size={22}
                  color={cyberpunkTheme.colors.text.muted}
                />
                <View className='absolute -top-0.5 -right-0.5 bg-[#FF00E5] rounded-full w-2 h-2' />
              </Pressable>
            </Animated.View>
            <Animated.View
              style={{ transform: [{ scale: headerButtonAnim.scaleAnim }] }}
            >
              <Pressable
                className='relative ml-5'
                onPressIn={headerButtonAnim.handlePressIn}
                onPressOut={headerButtonAnim.handlePressOut}
              >
                <Icon
                  name='bell-outline'
                  size={22}
                  color={cyberpunkTheme.colors.text.muted}
                />
                <View className='absolute -top-0.5 -right-0.5 bg-[#FF00E5] rounded-full w-2 h-2' />
              </Pressable>
            </Animated.View>
          </View>
        </View>

        {/* Filter Bar - Fixed Height */}
        <View className='h-14 border-b border-[rgba(0,255,148,0.1)]'>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 24,
              height: 56, // Fixed height
              alignItems: "center",
            }}
          >
            {filterOptions.map((option) => (
              <Animated.View
                key={option.id}
                style={{ transform: [{ scale: filterButtonAnim.scaleAnim }] }}
              >
                <Pressable
                  className={`mr-6 px-1 pb-2 border-b-2 ${
                    activeFilter === option.id
                      ? "border-[#00FF94]"
                      : "border-transparent"
                  }`}
                  onPress={() => setActiveFilter(option.id)}
                  onPressIn={filterButtonAnim.handlePressIn}
                  onPressOut={filterButtonAnim.handlePressOut}
                >
                  <Text
                    className={`text-sm ${
                      activeFilter === option.id
                        ? "text-[#00FF94] font-bold"
                        : "text-[#8F9BB3] font-medium"
                    } tracking-tight`}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              </Animated.View>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Debate Feed - Scrollable Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingVertical: 12,
          paddingBottom: tabBarHeight, // Add padding at bottom to ensure content isn't hidden behind tab bar
        }}
        style={{ flex: 1 }}
      >
        {debates.map((debate) => (
          <View
            key={debate.id}
            className='mx-6 mb-6 rounded-xl bg-[#03120F] border border-[rgba(0,255,148,0.4)] shadow-md shadow-[#00FF94] shadow-opacity-30 shadow-radius-10 elevation-8 overflow-hidden'
          >
            {/* Urgency Bar */}
            <View
              className='h-1'
              style={{ backgroundColor: getUrgencyColor(debate.timeRemaining) }}
            />

            {/* Debate Content */}
            <View className='p-6'>
              {/* Creator Info */}
              <View className='flex-row items-center mb-3'>
                <Image
                  source={{ uri: debate.creator.avatar }}
                  className='w-9 h-9 rounded-full border-2 border-[#00FF94]'
                />
                <View className='ml-3 flex-1'>
                  <View className='flex-row items-center'>
                    <Text className='text-[#E0F0EA] font-bold text-sm'>
                      {debate.creator.name}
                    </Text>
                    {debate.creator.verified && (
                      <View className='ml-1 bg-[#00FF94] rounded w-3 h-3 items-center justify-center'>
                        <Text className='text-[#03120F] text-[8px] font-bold'>
                          ✓
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text className='text-[#8F9BB3] text-xs'>
                    {debate.creator.followers.toLocaleString()} followers
                  </Text>
                </View>
                <View className='bg-[rgba(0,255,148,0.1)] px-3 py-1 rounded-md'>
                  <Text className='text-[#00FF94] text-xs font-semibold'>
                    {debate.category}
                  </Text>
                </View>
              </View>

              {/* Topic */}
              <Text className='text-[#E0F0EA] text-base font-bold mb-4 leading-6'>
                {debate.topic}
              </Text>

              {/* Tags */}
              <View className='flex-row flex-wrap mb-4'>
                {debate.tags.map((tag) => (
                  <Text
                    key={tag}
                    className='text-[#00FF94] text-xs mr-3 mb-1 opacity-70'
                  >
                    {tag}
                  </Text>
                ))}
              </View>

              {/* Stats */}
              <View className='flex-row justify-between mb-4'>
                <View className='bg-[#080F12] rounded-md py-2 px-3 flex-row items-center w-[48%] border border-[rgba(0,255,148,0.2)]'>
                  <Icon
                    name='clock-outline'
                    size={16}
                    color={getUrgencyColor(debate.timeRemaining)}
                    className='opacity-90'
                  />
                  <Text className='ml-2 text-[#E0F0EA] text-xs font-medium'>
                    {formatTimeRemaining(debate.timeRemaining)}
                  </Text>
                </View>
                <View className='bg-[#080F12] rounded-md py-2 px-3 flex-row items-center w-[48%] border border-[rgba(0,255,148,0.2)]'>
                  <Icon
                    name='account-group-outline'
                    size={16}
                    color={cyberpunkTheme.colors.primary}
                    className='opacity-90'
                  />
                  <Text className='ml-2 text-[#E0F0EA] text-xs font-medium'>
                    {debate.participants} participants
                  </Text>
                </View>
              </View>

              {/* Position Distribution */}
              <View className='mb-4'>
                <Text className='text-[#8F9BB3] text-xs font-medium mb-2'>
                  Position Distribution
                </Text>
                <View className='flex-row h-2 rounded-sm overflow-hidden bg-[#080F12]'>
                  <View
                    className='bg-[#00FF94] opacity-70'
                    style={{ width: `${debate.positions.for}%` }}
                  />
                  <View
                    className='bg-[#FF00E5] opacity-70'
                    style={{ width: `${debate.positions.against}%` }}
                  />
                </View>
                <View className='flex-row justify-between mt-2'>
                  <Text className='text-[#00FF94] text-xs font-semibold'>
                    {debate.positions.for}% For
                  </Text>
                  <Text className='text-[#FF00E5] text-xs font-semibold'>
                    {debate.positions.against}% Against
                  </Text>
                </View>
              </View>

              {/* Key Argument */}
              <View className='bg-[#080F12] p-4 rounded-md mb-4 border-l-4 border-[#00FF94]'>
                <View className='flex-row justify-between items-center mb-2'>
                  <Text className='text-[#00FF94] text-xs font-bold tracking-tight opacity-85'>
                    FEATURED ARGUMENT
                  </Text>
                </View>
                <Text className='text-[#E0F0EA] text-xs italic mb-2 leading-5'>
                  "{debate.keyArgument.text}"
                </Text>
                <Text className='text-[#8F9BB3] text-xs font-medium'>
                  by {debate.keyArgument.author}
                </Text>
              </View>

              {/* Join Debate Button */}
              <Animated.View
                style={{
                  transform: [{ scale: debateButtonAnim.scaleAnim }],
                  marginBottom: 24,
                }}
              >
                <Pressable
                  onPressIn={debateButtonAnim.handlePressIn}
                  onPressOut={debateButtonAnim.handlePressOut}
                >
                  <LinearGradient
                    colors={cyberpunkTheme.colors.gradients.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    className='rounded-md py-3 shadow-md shadow-[#00FF94] shadow-opacity-15 shadow-radius-10 elevation-3'
                  >
                    <Text className='text-[#03120F] font-bold text-center text-sm tracking-tight'>
                      JOIN DEBATE
                    </Text>
                  </LinearGradient>
                </Pressable>
              </Animated.View>

              {/* Action Buttons */}
              <View className='flex-row justify-between items-center'>
                <TouchableOpacity className='flex-row items-center bg-transparent px-3 py-2 rounded-sm'>
                  <Icon
                    name='share-variant-outline'
                    size={16}
                    color={cyberpunkTheme.colors.text.muted}
                  />
                  <Text className='ml-1 text-[#8F9BB3] text-xs font-medium'>
                    Share
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity className='flex-row items-center bg-transparent px-3 py-2 rounded-sm'>
                  <Icon
                    name='bookmark-outline'
                    size={16}
                    color={cyberpunkTheme.colors.text.muted}
                  />
                  <Text className='ml-1 text-[#8F9BB3] text-xs font-medium'>
                    Save
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity className='flex-row items-center bg-transparent px-3 py-2 rounded-sm'>
                  <Icon
                    name='dots-horizontal'
                    size={16}
                    color={cyberpunkTheme.colors.text.muted}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

export default DebateFeed;
