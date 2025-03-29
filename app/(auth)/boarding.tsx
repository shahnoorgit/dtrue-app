import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  Platform,
  Modal,
  Animated,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import {
  CategoryEnum,
  CATEGORY_INTERESTS,
  HOMOGENEOUS_CATEGORIES,
  HETEROGENEOUS_CATEGORIES,
} from "./../../enums/boarding";
import { cyberpunkTheme } from "@/constants/theme";

export default function OnboardingScreen() {
  // Step state
  const [currentStep, setCurrentStep] = useState(0);

  // Category selection state
  const [selectedCategories, setSelectedCategories] = useState<{
    [key in CategoryEnum]?: string[];
  }>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<CategoryEnum | null>(
    null
  );
  const [tempSelectedInterests, setTempSelectedInterests] = useState<string[]>(
    []
  );
  const [animatedValue] = useState(new Animated.Value(0));

  // Profile creation state
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState("");

  // Image picking methods
  const pickImage = async () => {
    if (Platform.OS !== "web") {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        alert("Sorry, we need camera roll permissions to make this work!");
        return;
      }
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        alert("Sorry, we need camera permissions to make this work!");
        return;
      }
    }
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  // Category selection methods
  const toggleCategory = (category: CategoryEnum) => {
    if (HOMOGENEOUS_CATEGORIES.includes(category)) {
      if (selectedCategories[category]) {
        const newSelectedCategories = { ...selectedCategories };
        delete newSelectedCategories[category];
        setSelectedCategories(newSelectedCategories);
      } else {
        setSelectedCategories((prev) => ({
          ...prev,
          [category]: CATEGORY_INTERESTS[category] || [],
        }));
      }
    } else {
      setCurrentCategory(category);
      setTempSelectedInterests(selectedCategories[category] || []);
      openModal();
    }
  };

  // Modal animation methods
  const openModal = useCallback(() => {
    setModalVisible(true);
    Animated.spring(animatedValue, {
      toValue: 1,
      useNativeDriver: true,
      tension: 40,
      friction: 6,
    }).start();
  }, [animatedValue]);

  const closeModal = useCallback(() => {
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setModalVisible(false));
  }, [animatedValue]);

  const toggleTempInterest = (interest: string) => {
    setTempSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const confirmSelection = () => {
    if (currentCategory) {
      const newSelectedCategories = { ...selectedCategories };
      if (tempSelectedInterests.length > 0) {
        newSelectedCategories[currentCategory] = tempSelectedInterests;
      } else {
        delete newSelectedCategories[currentCategory];
      }
      setSelectedCategories(newSelectedCategories);
    }
    closeModal();
  };

  const selectAllTempInterests = () => {
    setTempSelectedInterests(CATEGORY_INTERESTS[currentCategory] || []);
  };

  // Validation methods
  const validateUsername = () => {
    if (!username.trim()) {
      setUsernameError("Username is required");
      return false;
    }
    if (username.length < 3) {
      setUsernameError("Username must be at least 3 characters");
      return false;
    }
    if (username.length > 20) {
      setUsernameError("Username must be less than 20 characters");
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameError(
        "Username can only contain letters, numbers, and underscores"
      );
      return false;
    }
    setUsernameError("");
    return true;
  };

  // Navigation methods
  const goToNextStep = () => {
    if (currentStep === 0) {
      if (Object.keys(selectedCategories).length === 0) {
        alert("Please select at least one category");
        return;
      }
      setCurrentStep(1);
    } else if (currentStep === 1) {
      if (!validateUsername()) return;
      const submissionData = {
        categories: selectedCategories,
        profile: { username, bio, profileImage },
      };
      console.log("Submission Data:", JSON.stringify(submissionData, null, 2));
      alert("Profile Created Successfully!");
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  // Render the modal for interest selection using NativeWind classes
  const renderInterestModal = () => {
    const modalScale = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.7, 1],
    });
    const modalOpacity = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    return (
      <Modal
        visible={modalVisible}
        animationType='fade'
        transparent
        onRequestClose={closeModal}
      >
        <View className='flex-1 justify-center items-center bg-black/70'>
          <Animated.View
            style={{
              transform: [{ scale: modalScale }],
              opacity: modalOpacity,
            }}
            className='bg-gray-900 p-6 rounded-2xl w-4/5 max-h-[70%] shadow-2xl'
          >
            <View className='flex-row justify-between items-center mb-4'>
              <Text className='text-2xl font-bold text-white flex-1'>
                {currentCategory?.replace(/_/g, " ")} Interests
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Icon name='close' size={24} color='#FF6B6B' />
              </TouchableOpacity>
            </View>

            <ScrollView className='mb-4' showsVerticalScrollIndicator={false}>
              {CATEGORY_INTERESTS[currentCategory]?.map((interest) => (
                <TouchableOpacity
                  key={interest}
                  onPress={() => toggleTempInterest(interest)}
                  className='flex-row items-center mb-3 p-3 rounded-xl bg-gray-800'
                >
                  <Icon
                    name={
                      tempSelectedInterests.includes(interest)
                        ? "checkbox-marked"
                        : "checkbox-blank-outline"
                    }
                    size={24}
                    color={cyberpunkTheme.colors.primary}
                  />
                  <Text className='ml-3 text-white text-base'>
                    {interest.replace(/_/g, " ")}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View className='flex-row justify-between'>
              <TouchableOpacity
                onPress={selectAllTempInterests}
                className='bg-gray-800 px-4 py-2 rounded-xl'
              >
                <Text className='text-green-400 font-bold'>Select All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmSelection}
                className='bg-green-500 px-4 py-2 rounded-xl'
              >
                <Text className='text-black font-bold'>Confirm</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  };

  // Render category selection step using NativeWind classes
  const renderCategorySelection = () => (
    <View
      className='flex-1 p-6 pt-10'
      style={{ backgroundColor: cyberpunkTheme.colors.background.dark }}
    >
      <Text className='text-4xl font-bold text-white mb-4 text-center'>
        SELECT INTERESTS
      </Text>
      <Text className='text-gray-400 text-center mb-8'>
        Curate your debate universe
      </Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        {Object.values(CategoryEnum).map((category) => (
          <TouchableOpacity
            key={category}
            onPress={() => toggleCategory(category)}
            className={`rounded-xl overflow-hidden mb-4 ${
              selectedCategories[category] ? "border border-green-400/40" : ""
            }`}
          >
            <LinearGradient
              colors={
                selectedCategories[category]
                  ? ["rgba(0,255,148,0.1)", "rgba(0,255,148,0.05)"]
                  : ["rgba(8,15,18,0.7)", "rgba(3,18,17,0.7)"]
              }
              className='p-4 flex-row items-center justify-between'
            >
              <View className='flex-row items-center'>
                <Icon
                  name={
                    selectedCategories[category]
                      ? "check-circle"
                      : "circle-outline"
                  }
                  size={24}
                  color={cyberpunkTheme.colors.primary}
                />
                <Text
                  className={`ml-3 text-lg font-bold ${
                    selectedCategories[category]
                      ? "text-green-400"
                      : "text-gray-300"
                  }`}
                >
                  {category.replace(/_/g, " ")}
                </Text>
              </View>
              {HETEROGENEOUS_CATEGORIES.includes(category) && (
                <Icon
                  name='chevron-right'
                  size={24}
                  color={cyberpunkTheme.colors.primary}
                />
              )}
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // Render profile creation step using NativeWind classes
  const renderProfileCreation = () => (
    <View
      className='flex-1 p-6 pt-10'
      style={{ backgroundColor: cyberpunkTheme.colors.background.dark }}
    >
      <Text className='text-4xl font-bold text-white mb-4 text-center'>
        CREATE PROFILE
      </Text>
      <Text className='text-gray-400 text-center mb-8'>
        Define your digital identity
      </Text>
      <ScrollView contentContainerStyle={{ alignItems: "center" }}>
        {/* Profile Image Selection */}
        <TouchableOpacity
          onPress={pickImage}
          className='w-40 h-40 rounded-full border-2 justify-center items-center mb-6'
          style={{ borderColor: cyberpunkTheme.borders.glowing.borderColor }}
        >
          {profileImage ? (
            <Image
              source={{ uri: profileImage }}
              className='w-full h-full rounded-full'
            />
          ) : (
            <Icon
              name='camera-plus'
              size={48}
              color={cyberpunkTheme.colors.primary}
            />
          )}
        </TouchableOpacity>
        <View className='flex-row mb-6'>
          <TouchableOpacity onPress={pickImage} className='mr-4'>
            <Text className='text-green-400'>Choose Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={takePhoto}>
            <Text className='text-green-400'>Take Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Username Input */}
        <View className='w-full mb-4'>
          <View
            className='flex-row items-center bg-gray-800/70 rounded-xl border p-4'
            style={{ borderColor: "#444" }}
          >
            <Icon
              name='account'
              size={20}
              color={cyberpunkTheme.colors.primary}
            />
            <TextInput
              className='flex-1 ml-2 text-white'
              placeholder='Choose a username'
              placeholderTextColor={cyberpunkTheme.colors.text.muted}
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                if (usernameError) setUsernameError("");
              }}
            />
          </View>
          {usernameError ? (
            <Text className='text-red-400 text-sm mt-2'>{usernameError}</Text>
          ) : null}
        </View>

        {/* Bio Input */}
        <View className='w-full'>
          <View
            className='flex-row items-start bg-gray-800/70 rounded-xl border p-4'
            style={{ borderColor: "#444" }}
          >
            <Icon
              name='text'
              size={20}
              color={cyberpunkTheme.colors.primary}
              style={{ marginTop: 4 }}
            />
            <TextInput
              className='flex-1 ml-2 text-white'
              placeholder='Tell us about yourself (optional)'
              placeholderTextColor={cyberpunkTheme.colors.text.muted}
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={4}
              style={{ height: 100 }}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView
      className='flex-1 mt-10'
      style={{ backgroundColor: cyberpunkTheme.colors.background.dark }}
    >
      <StatusBar
        style='light'
        backgroundColor={cyberpunkTheme.colors.background.dark}
      />
      {currentStep === 0 ? renderCategorySelection() : renderProfileCreation()}
      {renderInterestModal()}
      <View className='absolute bottom-10 left-6 right-6 flex-row justify-between'>
        {currentStep > 0 && (
          <TouchableOpacity onPress={goToPreviousStep} className='flex-1 mr-4'>
            <LinearGradient
              colors={["rgba(8,15,18,0.7)", "rgba(3,18,17,0.7)"]}
              className='rounded-xl py-4 items-center'
            >
              <Text className='text-gray-300 font-bold text-lg'>BACK</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={goToNextStep}
          className={currentStep === 0 ? "w-full" : "flex-1"}
        >
          <LinearGradient
            colors={[cyberpunkTheme.colors.primary, "#00A3FF"]}
            className='rounded-xl py-4 items-center'
          >
            <Text className='text-black font-bold text-lg'>
              {currentStep === 0 ? "NEXT" : "COMPLETE"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
