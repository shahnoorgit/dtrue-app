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
import { useUser } from "@clerk/clerk-expo";

import {
  CategoryEnum,
  CATEGORY_INTERESTS,
  HOMOGENEOUS_CATEGORIES,
  HETEROGENEOUS_CATEGORIES,
} from "../../../enums/boarding";
import { cyberpunkTheme } from "@/constants/theme";
import { useCreateUser } from "@/hook/useCreateUser";
import { useAuthToken } from "@/hook/clerk/useFetchjwtToken";
import { useFetchWithToken } from "@/hook/api/useFetchWithToken.";
import { useError } from "@/contexts/ErrorContext";
import {
  trackOnboardingCompleted,
  trackOnboardingAbandoned,
} from "@/lib/posthog/events";
import * as ImageManipulator from "expo-image-manipulator";
import { logError } from "@/utils/sentry/sentry";
import SuggestedUsersScreen from "@/components/onboarding/SuggestedUsersScreen";

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
    style={{ backgroundColor: cyberpunkTheme.colors.background.primary }}
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
      ) : profileImageUrl ? (
        <Image
          source={{ uri: profileImageUrl }}
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
    className='flex-1 p-6 pt-12 pb-4'
    style={{ backgroundColor: cyberpunkTheme.colors.background.primary }}
  >
    <Text className='text-4xl font-bold text-white text-center mt-6'>
      CREATE PROFILE
    </Text>
    <Text className='text-gray-400 text-center mb-8'>
      Define your digital identity
    </Text>
    <ScrollView 
      contentContainerStyle={{ alignItems: "center", paddingBottom: 20 }}
      showsVerticalScrollIndicator={false}
    >
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
            textAlignVertical='top'
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
  <View className='px-6 py-4 bg-[#111]'>
    <View className='flex-row justify-between'>
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
            <ActivityIndicator size='small' color={cyberpunkTheme.colors.text.inverse} />
          ) : (
            <Text className='text-black font-bold text-lg'>
              {currentStep === 0 ? "NEXT" : "COMPLETE"}
            </Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
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
  const { fetchWithToken } = useFetchWithToken();

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
        const response = await fetchWithToken(
          `${process.env.EXPO_PUBLIC_BASE_URL}/user/username/available?username=${usernameToCheck}`
        );
        if (response.success && response.statusCode === 200) {
          setIsUsernameAvailable(response.data.available);
          if (!response.data.available) {
            generateUsernameSuggestions(usernameToCheck);
          } else {
            setSuggestedUsernames([]);
          }
        } else {
          console.error("Username check failed:", response);
          setIsUsernameAvailable(null);
        }
      } catch (error: any) {
        console.error("Error checking username:", error);
        
        // Log error to Sentry
        logError(error, {
          context: "useUsernameValidator.checkUsernameAvailability",
          username: usernameToCheck,
        });
        
        setIsUsernameAvailable(null);
      } finally {
        setIsCheckingUsername(false);
      }
    },
    [generateUsernameSuggestions, fetchWithToken]
  );

  const handleUsernameChange = useCallback(
    (text) => {
      const trimmedText = text.trim();
      setUsername(trimmedText);
      if (usernameError) setUsernameError("");
      if (debounceTimeout) clearTimeout(debounceTimeout);
      const timeout = setTimeout(() => {
        if (trimmedText && trimmedText.length >= 3) {
          checkUsernameAvailability(trimmedText);
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
      const trimmedSuggestion = suggestion.trim();
      setUsername(trimmedSuggestion);
      checkUsernameAvailability(trimmedSuggestion);
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
const useImageHandler = (showError: any) => {
  const [profileImage, setProfileImage] = useState(null);
  const [profileImageUrl, setProfileImageUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [token, refreshToken] = useAuthToken();
  const { fetchWithToken } = useFetchWithToken();

  const requestPermission = async (
    permissionFn: () => Promise<any>,
    errorMsg: string
  ) => {
    if (Platform.OS !== "web") {
      const { status } = await permissionFn();
      if (status !== "granted") {
        showError("Permission Required", errorMsg, { type: 'warning' });
        return false;
      }
    }
    return true;
  };

  // Image compression helper
  const compressImage = async (
    uri: string,
    {
      maxWidth = 1080,
      compress = 0.8,
      format = ImageManipulator.SaveFormat.JPEG,
    } = {}
  ): Promise<{ uri: string; width?: number; height?: number }> => {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      { compress, format, base64: false }
    );
    return { uri: result.uri, width: result.width, height: result.height };
  };

  const uploadToR2 = async (imageUri) => {
    setIsUploading(true);
    try {
      // 1. Compress image first
      const compressed = await compressImage(imageUri, {
        maxWidth: 1080,
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
      });

      // 2. Generate a unique file key
      const name = imageUri.split("/").pop() || "profile.jpg";
      const key = `letsdebate-media/profiles/${Date.now()}_${name}`;

      // 3. Get signed URL from backend
      const response = await fetchWithToken(
        `${
          process.env.EXPO_PUBLIC_BASE_URL
        }/uploads/signed-url?filename=${encodeURIComponent(
          key
        )}&type=image/jpeg`
      );
      const signedUrl: string = response.data.signedUrl;

      // 4. Upload compressed image to R2
      try {
        const blob = await fetch(compressed.uri).then((r) => r.blob());
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
      const publicUrl = `https://dtrueimageworker.tech-10f.workers.dev/${key}`;
      setProfileImageUrl(publicUrl);
      setProfileImage(imageUri);
      console.log("Image uploaded to R2:", publicUrl);
    } catch (error: any) {
      console.error("Error uploading to R2:", error);
      
      // Log error to Sentry
      logError(error, {
        context: "useImageHandler.uploadToR2",
        imageUri: imageUri ? "present" : "missing",
        compressed: true,
      });
      
      showError("Upload Error", "Error uploading image. Please check your connection and try again.", {
        type: 'error',
        showRetry: true,
        onRetry: () => uploadToR2(profileImage!)
      });
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
  
  const { showError } = useError();
  const { user } = useUser();
  const [modalVisible, setModalVisible] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<CategoryEnum | null>(
    null
  );
  const [tempSelectedInterests, setTempSelectedInterests] = useState<string[]>(
    []
  );
  const [animatedValue] = useState(new Animated.Value(0));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [onboardingStartTime] = useState(Date.now());
  const [showSuggestedUsers, setShowSuggestedUsers] = useState(false);

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
    useImageHandler(showError);

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

  // Handle suggested users completion
  const handleSuggestedUsersComplete = useCallback(() => {
    setShowSuggestedUsers(false);
    router.replace("/(tabs)");
    setTimeout(() => {
      router.replace("/(tabs)");
    }, 1000);
  }, [router]);

   const goToNextStep = useCallback(() => {
    if (currentStep === 0) {
      if (Object.keys(selectedCategories).length === 0) {
        showError("Validation Error", "Please select at least one category", { type: 'warning' });
        return;
      }
      setCurrentStep(1);
    } else if (currentStep === 1) {
      if (!validateUsername()) return;
      if (!user) {
        showError("Authentication Error", "User session not found. Please sign in again.", { type: 'error' });
        return;
      }

      const submissionData = {
        categories: selectedCategories,
        profile: {
          username: username.trim(),
          bio: bio.trim(),
          profileImage: profileImageUrl,
        },
      };

      (async () => {
        setIsSubmitting(true);
        try {
          // STEP 1: Update Clerk metadata FIRST (single source of truth)
          console.log("[ONBOARDING] Updating Clerk metadata...");
          await user.update({
            unsafeMetadata: {
              onboarded: true,
              onboardedAt: Date.now(),
            },
          });
          console.log("[ONBOARDING] Clerk metadata updated successfully");

          // STEP 2: Create user in database
          console.log("[ONBOARDING] Creating user in database...");
          const response = await addUser(submissionData);
          
          if (response) {
            console.log("[ONBOARDING] User created in database successfully");
            trackOnboardingCompleted({
              hasProfileImage: !!profileImageUrl,
              username: username,
              timeToComplete: Date.now() - onboardingStartTime,
            });
            
            // Show suggested users screen
            setIsSubmitting(false); // Clear loading state
            await new Promise((resolve) => setTimeout(resolve, 500));
            setShowSuggestedUsers(true);
          } else {
            console.error("[ONBOARDING] Failed to create user in database");
            // Rollback Clerk metadata
            console.log("[ONBOARDING] Rolling back Clerk metadata...");
            await user.update({
              unsafeMetadata: {
                onboarded: false,
              },
            });
            
            setIsSubmitting(false);
            showError("Creation Error", "Failed to create user profile. Please try again.", {
              type: 'error',
              showRetry: true,
              onRetry: () => goToNextStep()
            });
          }
        } catch (error: any) {
          console.error("[ONBOARDING] Error during onboarding:", error);
          
          // Log error to Sentry
          logError(error, {
            context: "OnboardingScreen.goToNextStep",
            username: username,
            hasProfileImage: !!profileImageUrl,
            categoriesCount: Object.keys(selectedCategories).length,
            bioLength: bio.length,
            step: currentStep,
          });
          
          // Rollback Clerk metadata on error
          try {
            console.log("[ONBOARDING] Error occurred, rolling back Clerk metadata...");
            await user.update({
              unsafeMetadata: {
                onboarded: false,
              },
            });
          } catch (rollbackError) {
            console.error("[ONBOARDING] Failed to rollback Clerk metadata:", rollbackError);
            logError(rollbackError, {
              context: "OnboardingScreen.goToNextStep.rollback",
            });
          }
          
          setIsSubmitting(false);
          showError("Creation Error", "An error occurred while creating your profile. Please try again.", {
            type: 'error',
            showRetry: true,
            onRetry: () => goToNextStep()
          });
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
    user,
    showError,
    onboardingStartTime,
  ]);

  const goToPreviousStep = useCallback(() => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  }, [currentStep]);

  return (
    <>
      <View className='flex-1 bg-[#111] pt-6'>
        <StatusBar
          style='light'
          backgroundColor={cyberpunkTheme.colors.background.primary}
        />
        {isSubmitting && !showSuggestedUsers && (
          <View className='absolute inset-0 z-10 bg-black/50 justify-center items-center'>
            <ActivityIndicator
              size='large'
              color={cyberpunkTheme.colors.primary}
            />
          </View>
        )}
        {currentStep === 0 ? (
          <>
            <CategorySelectionStep
              selectedCategories={selectedCategories}
              onToggleCategory={toggleCategory}
            />
            <NavigationButtons
              currentStep={currentStep}
              onPrevious={goToPreviousStep}
              onNext={goToNextStep}
              isUploading={isSubmitting || isUploading}
              isUsernameAvailable={isUsernameAvailable}
            />
          </>
        ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className='flex-1'
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
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
            <NavigationButtons
              currentStep={currentStep}
              onPrevious={goToPreviousStep}
              onNext={goToNextStep}
              isUploading={isSubmitting || isUploading}
              isUsernameAvailable={isUsernameAvailable}
            />
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
      </View>
      
      {/* Suggested Users Screen - Rendered outside main container */}
      {showSuggestedUsers && (
        <SuggestedUsersScreen onComplete={handleSuggestedUsersComplete} />
      )}
    </>
  );
}
