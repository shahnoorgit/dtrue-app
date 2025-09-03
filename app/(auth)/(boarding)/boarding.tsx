import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  Modal,
  Animated,
  ActivityIndicator,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import axios from "axios";

import {
  CategoryEnum,
  CATEGORY_INTERESTS,
  HOMOGENEOUS_CATEGORIES,
  HETEROGENEOUS_CATEGORIES,
} from "../../../enums/boarding";
import { cyberpunkTheme } from "@/constants/theme";
import { useCreateUser } from "@/hook/useCreateUser";
import { useAuthToken } from "@/hook/clerk/useFetchjwtToken";

// Interest Modal Component using NativeWind classes
const InterestModal = ({
  visible,
  currentCategory,
  tempInterests,
  onToggleInterest,
  onConfirm,
  onSelectAll,
  onClose,
  animatedValue,
}) => {
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
      visible={visible}
      animationType='fade'
      transparent
      onRequestClose={onClose}
    >
      <View className='flex-1 justify-center items-center bg-black/70'>
        <Animated.View
          style={{ transform: [{ scale: modalScale }], opacity: modalOpacity }}
          className='bg-gray-900 p-6 rounded-2xl w-4/5 max-h-[70%] shadow-2xl'
        >
          <View className='flex-row justify-between items-center mb-4'>
            <Text className='text-2xl font-bold text-white flex-1'>
              {currentCategory?.replace(/_/g, " ")} Interests
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name='close' size={24} color='#FF6B6B' />
            </TouchableOpacity>
          </View>
          <ScrollView className='mb-4' showsVerticalScrollIndicator={false}>
            {CATEGORY_INTERESTS[currentCategory]?.map((interest) => (
              <TouchableOpacity
                key={interest}
                onPress={() => onToggleInterest(interest)}
                className='flex-row items-center mb-3 p-3 rounded-xl bg-gray-800'
              >
                <Icon
                  name={
                    tempInterests.includes(interest)
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
              onPress={onSelectAll}
              className='bg-gray-800 px-4 py-2 rounded-xl'
            >
              <Text className='text-green-400 font-bold'>Select All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
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

// Category Selection Step using NativeWind classes
const CategorySelectionStep = ({ selectedCategories, onToggleCategory }) => (
  <View
    className='flex-1 p-6 pt-12'
    style={{ backgroundColor: cyberpunkTheme.colors.background.dark }}
  >
    <Text className='text-4xl font-bold text-white text-center mt-6'>
      SELECT INTERESTS
    </Text>
    <Text className='text-gray-400 text-center mb-8'>
      Select Your Topic of Interest
    </Text>
    <ScrollView showsVerticalScrollIndicator={false}>
      {Object.values(CategoryEnum).map((category) => (
        <TouchableOpacity
          key={category}
          onPress={() => onToggleCategory(category)}
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

// Username Suggestions Component
const UsernameSuggestions = ({ suggestions, onSelectSuggestion }) => (
  <View className='mt-3'>
    <Text className='text-gray-400 mb-2'>Suggested usernames:</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {suggestions.map((suggestion, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => onSelectSuggestion(suggestion)}
          className='bg-gray-800 rounded-lg px-3 py-2 mr-2'
        >
          <Text className='text-green-400'>{suggestion}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
);

// Profile Image Selector using NativeWind classes
const ProfileImageSelector = ({
  profileImage,
  isUploading,
  profileImageUrl,
  onPickImage,
  onTakePhoto,
}) => (
  <>
    <TouchableOpacity
      onPress={onPickImage}
      className='w-40 h-40 rounded-full border-2 justify-center items-center mb-6'
      style={{ borderColor: cyberpunkTheme.borders.glowing.borderColor }}
    >
      {isUploading ? (
        <ActivityIndicator size='large' color={cyberpunkTheme.colors.primary} />
      ) : profileImage ? (
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
      <TouchableOpacity onPress={onPickImage} className='mr-4'>
        <Text className='text-green-400'>Choose Photo</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onTakePhoto}>
        <Text className='text-green-400'>Take Photo</Text>
      </TouchableOpacity>
    </View>
    {profileImageUrl && (
      <View className='mb-4'>
        <Text className='text-green-400 text-sm'>
          ✓ Image uploaded to cloud
        </Text>
      </View>
    )}
  </>
);

// Profile Creation Step using NativeWind classes
const ProfileCreationStep = ({
  username,
  onUsernameChange,
  usernameError,
  isCheckingUsername,
  isUsernameAvailable,
  suggestedUsernames,
  onSelectSuggestion,
  bio,
  onBioChange,
  profileImage,
  isUploading,
  profileImageUrl,
  onPickImage,
  onTakePhoto,
}) => (
  <View
    className='flex-1 p-6 pt-12'
    style={{ backgroundColor: cyberpunkTheme.colors.background.dark }}
  >
    <Text className='text-4xl font-bold text-white text-center mt-6'>
      CREATE PROFILE
    </Text>
    <Text className='text-gray-400 text-center mb-8'>
      Define your digital identity
    </Text>
    <ScrollView contentContainerStyle={{ alignItems: "center" }}>
      <ProfileImageSelector
        profileImage={profileImage}
        isUploading={isUploading}
        profileImageUrl={profileImageUrl}
        onPickImage={onPickImage}
        onTakePhoto={onTakePhoto}
      />
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
            onChangeText={onUsernameChange}
            autoCapitalize='none'
          />
          {isCheckingUsername ? (
            <ActivityIndicator
              size='small'
              color={cyberpunkTheme.colors.primary}
            />
          ) : isUsernameAvailable === true ? (
            <Icon name='check-circle' size={20} color='#00FF94' />
          ) : isUsernameAvailable === false ? (
            <Icon name='close-circle' size={20} color='#FF6B6B' />
          ) : null}
        </View>
        {usernameError ? (
          <Text className='text-red-400 text-sm mt-2'>{usernameError}</Text>
        ) : isUsernameAvailable === false ? (
          <Text className='text-red-400 text-sm mt-2'>
            This username is already taken
          </Text>
        ) : isUsernameAvailable === true ? (
          <Text className='text-green-400 text-sm mt-2'>
            Username is available!
          </Text>
        ) : null}
        {suggestedUsernames.length > 0 && (
          <UsernameSuggestions
            suggestions={suggestedUsernames}
            onSelectSuggestion={onSelectSuggestion}
          />
        )}
      </View>
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
            className='flex-1 ml-2 text-white h-24 text-base'
            placeholder='Tell us about yourself (optional)'
            placeholderTextColor={cyberpunkTheme.colors.text.muted}
            value={bio}
            onChangeText={onBioChange}
            multiline
          />
        </View>
      </View>
    </ScrollView>
  </View>
);

// Navigation Buttons using NativeWind classes
const NavigationButtons = ({
  currentStep,
  onPrevious,
  onNext,
  isUploading,
  isUsernameAvailable,
}) => (
  <View className='absolute bottom-10 left-6 right-6 flex-row justify-between'>
    {currentStep > 0 && (
      <TouchableOpacity onPress={onPrevious} className='flex-1 mr-4'>
        <LinearGradient
          colors={["rgba(8,15,18,0.7)", "rgba(3,18,17,0.7)"]}
          className='rounded-xl py-4 items-center'
        >
          <Text className='text-gray-300 font-bold text-lg'>BACK</Text>
        </LinearGradient>
      </TouchableOpacity>
    )}
    <TouchableOpacity
      onPress={onNext}
      className={currentStep === 0 ? "w-full" : "flex-1"}
      disabled={
        currentStep === 1 && (isUploading || isUsernameAvailable === false)
      }
    >
      <LinearGradient
        colors={
          isUploading || (currentStep === 1 && isUsernameAvailable === false)
            ? ["#888888", "#666666"]
            : [cyberpunkTheme.colors.primary, "#00A3FF"]
        }
        className='rounded-xl py-4 items-center'
      >
        {isUploading ? (
          <ActivityIndicator size='small' color='#000000' />
        ) : (
          <Text className='text-black font-bold text-lg'>
            {currentStep === 0 ? "NEXT" : "COMPLETE"}
          </Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  </View>
);

// Custom hook for username validation
const useUsernameValidator = () => {
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState(null);
  const [suggestedUsernames, setSuggestedUsernames] = useState([]);
  const [debounceTimeout, setDebounceTimeout] = useState(null);

  const generateUsernameSuggestions = useCallback((baseUsername) => {
    const suggestions = [
      `${baseUsername}${Math.floor(Math.random() * 1000)}`,
      `${baseUsername}_${Math.floor(Math.random() * 100)}`,
      `${baseUsername}${new Date().getFullYear()}`,
      `the_${baseUsername}`,
      `real_${baseUsername}`,
    ];
    const filteredSuggestions = [...new Set(suggestions)].filter(
      (name) =>
        name.length >= 3 && name.length <= 20 && /^[a-zA-Z0-9_]+$/.test(name)
    );
    setSuggestedUsernames(filteredSuggestions);
  }, []);

  const checkUsernameAvailability = useCallback(
    async (usernameToCheck) => {
      if (!usernameToCheck || usernameToCheck.length < 3) {
        setIsUsernameAvailable(null);
        setSuggestedUsernames([]);
        return;
      }
      setIsCheckingUsername(true);
      try {
        const response = await axios.get(
          `${process.env.EXPO_PUBLIC_BASE_URL}/user/username/available?username=${usernameToCheck}`
        );
        if (response.data.success && response.data.statusCode === 200) {
          setIsUsernameAvailable(response.data.data.available);
          if (!response.data.data.available) {
            generateUsernameSuggestions(usernameToCheck);
          } else {
            setSuggestedUsernames([]);
          }
        } else {
          console.error("Username check failed:", response.data);
          setIsUsernameAvailable(null);
        }
      } catch (error) {
        console.error("Error checking username:", error);
        setIsUsernameAvailable(null);
      } finally {
        setIsCheckingUsername(false);
      }
    },
    [generateUsernameSuggestions]
  );

  const handleUsernameChange = useCallback(
    (text) => {
      setUsername(text);
      if (usernameError) setUsernameError("");
      if (debounceTimeout) clearTimeout(debounceTimeout);
      const timeout = setTimeout(() => {
        if (text && text.length >= 3) {
          checkUsernameAvailability(text);
        } else {
          setIsUsernameAvailable(null);
          setSuggestedUsernames([]);
        }
      }, 500);
      setDebounceTimeout(timeout);
    },
    [checkUsernameAvailability, debounceTimeout, usernameError]
  );

  const selectSuggestedUsername = useCallback(
    (suggestion) => {
      setUsername(suggestion);
      checkUsernameAvailability(suggestion);
    },
    [checkUsernameAvailability]
  );

  const validateUsername = useCallback(() => {
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
    if (isUsernameAvailable === false) {
      setUsernameError("This username is already taken");
      return false;
    }
    setUsernameError("");
    return true;
  }, [username, isUsernameAvailable]);

  useEffect(() => {
    return () => {
      if (debounceTimeout) clearTimeout(debounceTimeout);
    };
  }, [debounceTimeout]);

  return {
    username,
    usernameError,
    isCheckingUsername,
    isUsernameAvailable,
    suggestedUsernames,
    handleUsernameChange,
    selectSuggestedUsername,
    validateUsername,
  };
};

// Custom hook for image handling with R2 upload
const useImageHandler = () => {
  const [profileImage, setProfileImage] = useState(null);
  const [profileImageUrl, setProfileImageUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [token, refreshToken] = useAuthToken();

  const requestPermission = async (
    permissionFn: () => Promise<any>,
    errorMsg: string
  ) => {
    if (Platform.OS !== "web") {
      const { status } = await permissionFn();
      if (status !== "granted") {
        Alert.alert("Permission Required", errorMsg);
        return false;
      }
    }
    return true;
  };

  const uploadToR2 = async (imageUri) => {
    setIsUploading(true);
    try {
      // 1. Generate a unique file key
      const name = imageUri.split("/").pop() || "profile.jpg";
      const key = `profiles/${Date.now()}_${name}`;

      // 2. Get signed URL from backend
      const { data } = await axios.get(
        `${process.env.EXPO_PUBLIC_BASE_URL}/uploads/signed-url`,
        {
          params: { filename: key, type: "image/jpeg" },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const signedUrl: string = data.data.signedUrl;

      // 3. Upload directly to R2
      try {
        const blob = await fetch(imageUri).then((r) => r.blob());
        const uploadRes = await fetch(signedUrl, {
          method: "PUT",
          headers: { "Content-Type": "image/jpeg" },
          body: blob,
        });
        if (!uploadRes.ok) throw new Error("Upload failed");
      } catch (error) {
        console.error("Image upload error:", error);
        throw error;
      }

      // 4. Construct public CDN URL
      const publicUrl = `https://r2-image-cdn.letsdebate0.workers.dev/letsdebate-media/${key}`;
      setProfileImageUrl(publicUrl);
      setProfileImage(imageUri);
      console.log("Image uploaded to R2:", publicUrl);
    } catch (error) {
      console.error("Error uploading to R2:", error);
      Alert.alert(
        "Upload Error",
        "Error uploading image. Please check your connection and try again."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const pickImage = async () => {
    if (
      !(await requestPermission(
        ImagePicker.requestMediaLibraryPermissionsAsync,
        "Sorry, we need camera roll permissions to make this work!"
      ))
    )
      return;

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) {
      await uploadToR2(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    if (
      !(await requestPermission(
        ImagePicker.requestCameraPermissionsAsync,
        "Sorry, we need camera permissions to make this work!"
      ))
    )
      return;

    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) {
      await uploadToR2(result.assets[0].uri);
    }
  };

  return { profileImage, profileImageUrl, isUploading, pickImage, takePhoto };
};

export default function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<{
    [key in CategoryEnum]?: string[];
  }>({});
  const [bio, setBio] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<CategoryEnum | null>(
    null
  );
  const [tempSelectedInterests, setTempSelectedInterests] = useState<string[]>(
    []
  );
  const [animatedValue] = useState(new Animated.Value(0));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    username,
    usernameError,
    isCheckingUsername,
    isUsernameAvailable,
    suggestedUsernames,
    handleUsernameChange,
    selectSuggestedUsername,
    validateUsername,
  } = useUsernameValidator();

  const { profileImage, profileImageUrl, isUploading, pickImage, takePhoto } =
    useImageHandler();

  const { addUser } = useCreateUser();
  const router = useRouter();

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

  const toggleCategory = useCallback(
    (category: CategoryEnum) => {
      if (HOMOGENEOUS_CATEGORIES.includes(category)) {
        setSelectedCategories((prev) => {
          const newSelected = { ...prev };
          if (newSelected[category]) {
            delete newSelected[category];
          } else {
            newSelected[category] = CATEGORY_INTERESTS[category] || [];
          }
          return newSelected;
        });
      } else {
        setCurrentCategory(category);
        setTempSelectedInterests(selectedCategories[category] || []);
        openModal();
      }
    },
    [selectedCategories, openModal]
  );

  const toggleTempInterest = useCallback((interest: string) => {
    setTempSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  }, []);

  const confirmSelection = useCallback(() => {
    if (currentCategory) {
      setSelectedCategories((prev) => {
        const newSelected = { ...prev };
        if (tempSelectedInterests.length > 0) {
          newSelected[currentCategory] = tempSelectedInterests;
        } else {
          delete newSelected[currentCategory];
        }
        return newSelected;
      });
    }
    closeModal();
  }, [currentCategory, tempSelectedInterests, closeModal]);

  const selectAllTempInterests = useCallback(() => {
    setTempSelectedInterests(CATEGORY_INTERESTS[currentCategory] || []);
  }, [currentCategory]);

  const goToNextStep = useCallback(() => {
    if (currentStep === 0) {
      if (Object.keys(selectedCategories).length === 0) {
        Alert.alert("Validation", "Please select at least one category");
        return;
      }
      setCurrentStep(1);
    } else if (currentStep === 1) {
      if (!validateUsername()) return;

      const submissionData = {
        categories: selectedCategories,
        profile: {
          username,
          bio,
          profileImage: profileImageUrl,
        },
      };

      (async () => {
        setIsSubmitting(true);
        try {
          const response = await addUser(submissionData);
          if (response) {
            console.log("User created successfully:", response);
            await new Promise((resolve) => setTimeout(resolve, 500));
            router.replace("/(tabs)");
            setTimeout(() => {
              router.replace("/(tabs)");
            }, 1000);
          } else {
            console.error("Failed to create user");
            setIsSubmitting(false);
            Alert.alert(
              "Error",
              "Failed to create user profile. Please try again."
            );
          }
        } catch (error) {
          console.error("Error creating user:", error);
          setIsSubmitting(false);
          Alert.alert(
            "Error",
            "An error occurred while creating your profile. Please try again."
          );
        }
      })();
    }
  }, [
    currentStep,
    selectedCategories,
    validateUsername,
    username,
    bio,
    profileImageUrl,
    addUser,
    router,
  ]);

  const goToPreviousStep = useCallback(() => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  }, [currentStep]);

  return (
    <View className='flex-1 bg-[#111] pt-6'>
      <StatusBar
        style='light'
        backgroundColor={cyberpunkTheme.colors.background.dark}
      />
      {isSubmitting && (
        <View className='absolute inset-0 z-10 bg-black/50 justify-center items-center'>
          <ActivityIndicator
            size='large'
            color={cyberpunkTheme.colors.primary}
          />
        </View>
      )}
      {currentStep === 0 ? (
        <CategorySelectionStep
          selectedCategories={selectedCategories}
          onToggleCategory={toggleCategory}
        />
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className='flex-1'
          keyboardVerticalOffset={80}
        >
          <ScrollView
            className='flex-1'
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps='handled'
          >
            <ProfileCreationStep
              username={username}
              onUsernameChange={handleUsernameChange}
              usernameError={usernameError}
              isCheckingUsername={isCheckingUsername}
              isUsernameAvailable={isUsernameAvailable}
              suggestedUsernames={suggestedUsernames}
              onSelectSuggestion={selectSuggestedUsername}
              bio={bio}
              onBioChange={setBio}
              profileImage={profileImage}
              isUploading={isUploading}
              profileImageUrl={profileImageUrl}
              onPickImage={pickImage}
              onTakePhoto={takePhoto}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
      <InterestModal
        visible={modalVisible}
        currentCategory={currentCategory}
        tempInterests={tempSelectedInterests}
        onToggleInterest={toggleTempInterest}
        onConfirm={confirmSelection}
        onSelectAll={selectAllTempInterests}
        onClose={closeModal}
        animatedValue={animatedValue}
      />
      <NavigationButtons
        currentStep={currentStep}
        onPrevious={goToPreviousStep}
        onNext={goToNextStep}
        isUploading={isSubmitting || isUploading}
        isUsernameAvailable={isUsernameAvailable}
      />
    </View>
  );
}
