import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Image } from "react-native";
import { SignedIn } from "@clerk/clerk-expo";
import { useClerk } from "@clerk/clerk-expo";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";

const ProfilePage = () => {
  const [activeTab, setActiveTab] = useState("debates");
  const { signOut } = useClerk();

  // Mock user data
  const userData = {
    name: "Alex Ramirez",
    handle: "@debatemaster",
    followers: 12453,
    bio: "Digital philosopher. Evidence enthusiast. Seeking truth through structured dialogue.",
    stats: {
      debatesCreated: 14,
      debatesJoined: 37,
      evidenceSubmitted: 62,
      reputation: 4.8,
    },
    badges: [
      { name: "Evidence Expert", icon: "analytics" },
      { name: "Debate Champion", icon: "emoji-events" },
      { name: "Truth Seeker", icon: "search" },
      { name: "Thought Leader", icon: "lightbulb" },
    ],
    activeDebates: [
      {
        id: 1,
        title: "Should AI be regulated by global consensus?",
        participants: 34,
        timeRemaining: "12h",
      },
      {
        id: 2,
        title: "Is remote work the future of knowledge economy?",
        participants: 27,
        timeRemaining: "1d 6h",
      },
    ],
    pastDebates: [
      {
        id: 3,
        title:
          "Are cryptocurrencies a viable alternative to traditional banking?",
        participants: 42,
        result: "Inconclusive",
      },
      {
        id: 4,
        title: "Does social media amplify or reduce political polarization?",
        participants: 56,
        result: "For",
      },
      {
        id: 5,
        title:
          "Should space exploration be prioritized over ocean exploration?",
        participants: 23,
        result: "Against",
      },
    ],
  };

  // Helper function to determine result style class
  const getResultClass = (result) => {
    switch (result) {
      case "For":
        return "bg-[#00FF9415] text-[#00FF94]";
      case "Against":
        return "bg-[#FF00E515] text-[#FF00E5]";
      default:
        return "bg-[#FFC70015] text-[#FFC700]";
    }
  };

  return (
    <ScrollView className='flex-1 bg-[#080F12]'>
      {/* Profile Panel */}
      <View className='m-4 p-6 rounded-xl bg-[#080F1290] border border-[#00FF9430]'>
        <View className='flex-row justify-between items-start mb-6'>
          <Text className='text-[#00FF94] font-bold text-lg'>Profile</Text>
          <SignedIn>
            <TouchableOpacity
              onPress={() => signOut()}
              className='px-4 py-2 rounded-lg bg-[#FF00E515] border border-[#FF00E530]'
            >
              <Text className='text-[#FF00E5]'>Log Out</Text>
            </TouchableOpacity>
          </SignedIn>
        </View>

        <View className='flex-row flex-wrap'>
          {/* Avatar */}
          <LinearGradient
            colors={["#00FF94", "#02C39A"]}
            className='h-24 w-24 rounded-full items-center justify-center mb-4'
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text className='text-[#080F12] text-3xl font-bold'>
              {userData.name.charAt(0)}
            </Text>
          </LinearGradient>

          {/* User Info */}
          <View className='ml-4 flex-1'>
            <Text className='text-[#00FF94] text-2xl font-bold'>
              {userData.name}
            </Text>
            <Text className='text-[#8F9BB3] mb-1'>{userData.handle}</Text>
            <View className='bg-[#00FF9415] px-3 py-1 rounded-full self-start mb-2'>
              <Text className='text-[#E0F0EA] text-xs'>
                {userData.followers.toLocaleString()} followers
              </Text>
            </View>
            <Text className='text-[#E0F0EA]'>{userData.bio}</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View className='flex-row flex-wrap mt-6 mb-6'>
          <View className='w-1/2 pr-2 mb-2'>
            <View className='bg-[#080F1298] p-3 rounded-lg border border-[#00FF9420]'>
              <Text className='text-[#00FF94] text-xl font-bold text-center'>
                {userData.stats.debatesCreated}
              </Text>
              <Text className='text-[#8F9BB3] text-center text-xs'>
                Debates Created
              </Text>
            </View>
          </View>
          <View className='w-1/2 pl-2 mb-2'>
            <View className='bg-[#080F1298] p-3 rounded-lg border border-[#00FF9420]'>
              <Text className='text-[#00FF94] text-xl font-bold text-center'>
                {userData.stats.debatesJoined}
              </Text>
              <Text className='text-[#8F9BB3] text-center text-xs'>
                Debates Joined
              </Text>
            </View>
          </View>
          <View className='w-1/2 pr-2'>
            <View className='bg-[#080F1298] p-3 rounded-lg border border-[#00FF9420]'>
              <Text className='text-[#00FF94] text-xl font-bold text-center'>
                {userData.stats.evidenceSubmitted}
              </Text>
              <Text className='text-[#8F9BB3] text-center text-xs'>
                Evidence Submitted
              </Text>
            </View>
          </View>
          <View className='w-1/2 pl-2'>
            <View className='bg-[#080F1298] p-3 rounded-lg border border-[#00FF9420]'>
              <Text className='text-[#00FF94] text-xl font-bold text-center'>
                {userData.stats.reputation}
              </Text>
              <Text className='text-[#8F9BB3] text-center text-xs'>
                Reputation
              </Text>
            </View>
          </View>
        </View>

        {/* Badges */}
        <View className='mb-2'>
          <Text className='text-[#E0F0EA] font-medium mb-3'>Badges</Text>
          <View className='flex-row flex-wrap'>
            {userData.badges.map((badge, index) => (
              <View
                key={index}
                className='bg-[#FF00E515] border border-[#FF00E520] py-1 px-3 rounded-lg mr-2 mb-2 flex-row items-center'
              >
                <MaterialIcons name={badge.icon} size={16} color='#FF00E5' />
                <Text className='text-[#FF00E5] text-xs ml-1'>
                  {badge.name}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Debates Panel */}
      <View className='m-4 p-6 rounded-xl bg-[#080F1290] border border-[#00FF9430]'>
        {/* Tabs */}
        <View className='flex-row border-b border-[#00FF9420] mb-4'>
          <TouchableOpacity
            className='mr-4 pb-2 relative'
            onPress={() => setActiveTab("debates")}
          >
            <Text
              className={
                activeTab === "debates"
                  ? "text-[#00FF94] font-bold"
                  : "text-[#8F9BB3]"
              }
            >
              Active Debates
            </Text>
            {activeTab === "debates" && (
              <LinearGradient
                colors={["#00FF94", "#02C39A"]}
                className='h-0.5 absolute bottom-0 w-full'
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            className='pb-2 relative'
            onPress={() => setActiveTab("history")}
          >
            <Text
              className={
                activeTab === "history"
                  ? "text-[#00FF94] font-bold"
                  : "text-[#8F9BB3]"
              }
            >
              Debate History
            </Text>
            {activeTab === "history" && (
              <LinearGradient
                colors={["#00FF94", "#02C39A"]}
                className='h-0.5 absolute bottom-0 w-full'
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Active Debates */}
        {activeTab === "debates" && (
          <View>
            <View className='flex-row justify-between items-center mb-4'>
              <Text className='text-[#E0F0EA] font-medium'>
                Your Active Debates
              </Text>
              <LinearGradient
                colors={["#00FF94", "#02C39A"]}
                className='px-4 py-2 rounded-lg'
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text className='text-[#080F12] font-bold'>Create Debate</Text>
              </LinearGradient>
            </View>

            {userData.activeDebates.map((debate) => (
              <TouchableOpacity
                key={debate.id}
                className='bg-[#080F1298] p-4 rounded-lg border border-[#00FF9420] mb-3'
              >
                <Text className='text-[#E0F0EA] text-base mb-2'>
                  {debate.title}
                </Text>
                <View className='flex-row justify-between'>
                  <Text className='text-[#8F9BB3] text-xs'>
                    {debate.participants} participants
                  </Text>
                  <Text className='text-[#FFC700] text-xs'>
                    Time remaining: {debate.timeRemaining}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Debate History */}
        {activeTab === "history" && (
          <View>
            <Text className='text-[#E0F0EA] font-medium mb-4'>
              Past Debates
            </Text>

            {userData.pastDebates.map((debate) => (
              <TouchableOpacity
                key={debate.id}
                className='bg-[#080F1298] p-4 rounded-lg border border-[#00FF9420] mb-3'
              >
                <Text className='text-[#E0F0EA] text-base mb-2'>
                  {debate.title}
                </Text>
                <View className='flex-row justify-between'>
                  <Text className='text-[#8F9BB3] text-xs'>
                    {debate.participants} participants
                  </Text>
                  <View
                    className={`px-3 py-1 rounded-full ${getResultClass(
                      debate.result
                    )}`}
                  >
                    <Text className={getResultClass(debate.result)}>
                      {debate.result}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default ProfilePage;
