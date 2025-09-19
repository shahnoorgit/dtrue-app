import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Alert,
  Animated,
  Dimensions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import axios from "axios";
import * as Haptics from "expo-haptics";

import { cyberpunkTheme } from "@/constants/theme";

const THEME = {
  colors: {
    primary: "#00FF94",
    background: "#080F12",
    surface: "#1A1A1A",
    text: "#FFFFFF",
    textSecondary: "#A3A3A3",
    textMuted: "#8F9BB3",
    border: "#404040",
    success: "#10B981",
    error: "#EF4444",
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  borderRadius: { sm: 8, md: 12, lg: 16, xl: 24 },
};
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthToken } from "@/hook/clerk/useFetchjwtToken";
import { logError } from "@/utils/sentry/sentry";
import {
  trackDebateCreated,
  trackDebateCreationFailed,
} from "@/lib/posthog/events";

const { width } = Dimensions.get('window');

// Duration Options
const DURATION_OPTIONS = [
  { label: "24 Hours", hours: 24, icon: "clock-outline" },
  { label: "3 Days", hours: 72, icon: "calendar-outline" },
  { label: "7 Days", hours: 168, icon: "calendar-week" },
];

// Modern Input Component
const ModernInput = ({
  icon,
  placeholder,
  value,
  onChangeText,
  multiline = false,
  maxLength,
  error,
  style,
}: {
  icon: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  multiline?: boolean;
  maxLength?: number;
  error?: string;
  style?: any;
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused]);

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [THEME.colors.border, THEME.colors.primary],
  });

  return (
    <View style={style}>
      <Animated.View
        style={[
          styles.inputContainer,
          {
            borderColor,
            borderWidth: isFocused ? 2 : 1,
          },
        ]}
      >
        <View style={styles.inputIconContainer}>
          <Icon
            name={icon}
            size={20}
            color={isFocused ? THEME.colors.primary : THEME.colors.textMuted}
          />
        </View>
        <TextInput
          style={[
            styles.textInput,
            multiline && styles.multilineInput,
          ]}
          placeholder={placeholder}
          placeholderTextColor={THEME.colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          multiline={multiline}
          maxLength={maxLength}
        />
        {maxLength && (
          <Text style={styles.characterCount}>
            {value.length}/{maxLength}
          </Text>
        )}
      </Animated.View>
      {error && (
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={16} color={THEME.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

// Modern Image Selector
const ModernImageSelector = ({
  imageUri,
  uploading,
  onPick,
  onCapture,
}: {
  imageUri: string | null;
  uploading: boolean;
  onPick: () => Promise<void>;
  onCapture: () => Promise<void>;
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    setIsPressed(true);
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.imageSection}>
      <Text style={styles.sectionTitle}>Debate Image</Text>
      <Animated.View
        style={[
          styles.imageContainer,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.imageSelector,
            isPressed && styles.imageSelectorPressed,
          ]}
          onPress={onPick}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
        >
          {uploading ? (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="large" color={THEME.colors.primary} />
              <Text style={styles.uploadingText}>Uploading...</Text>
            </View>
          ) : imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.selectedImage} />
          ) : (
            <View style={styles.placeholderContainer}>
              <Icon name="image-plus" size={48} color={THEME.colors.primary} />
              <Text style={styles.placeholderText}>Tap to add image</Text>
              <Text style={styles.placeholderSubtext}>Optional but recommended</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
      
      <View style={styles.imageActions}>
        <TouchableOpacity style={styles.imageAction} onPress={onPick}>
          <Icon name="folder-open" size={16} color={THEME.colors.primary} />
          <Text style={styles.imageActionText}>Gallery</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.imageAction} onPress={onCapture}>
          <Icon name="camera" size={16} color={THEME.colors.primary} />
          <Text style={styles.imageActionText}>Camera</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Success Animation Component
const SuccessAnimation = ({ visible, onComplete }: { visible: boolean; onComplete: () => void }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const checkmarkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Animate checkmark after a delay
      setTimeout(() => {
        Animated.spring(checkmarkAnim, {
          toValue: 1,
          tension: 200,
          friction: 10,
          useNativeDriver: true,
        }).start();
      }, 200);

      // Auto hide after 2 seconds
      setTimeout(() => {
        onComplete();
      }, 2000);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.successOverlay}>
      <Animated.View
        style={[
          styles.successContainer,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <View style={styles.successIconContainer}>
          <Animated.View
            style={[
              styles.checkmarkContainer,
              {
                transform: [{ scale: checkmarkAnim }],
              },
            ]}
          >
            <Icon name="check" size={48} color={THEME.colors.text} />
          </Animated.View>
        </View>
        <Text style={styles.successTitle}>Debate Created!</Text>
        <Text style={styles.successSubtext}>Your debate is now live</Text>
      </Animated.View>
    </View>
  );
};

export default function CreateDebateRoomScreen() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDuration, setSelectedDuration] = useState(24);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [cloudUrl, setCloudUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({ title: "", description: "" });
  const [showSuccess, setShowSuccess] = useState(false);
  const [token, refreshToken] = useAuthToken();

  const router = useRouter();

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

  const getFileNameFromUri = (uri: string, fallback = "upload.jpg") => {
    try {
      const parts = uri.split("/");
      const last = parts[parts.length - 1];
      if (last && last.includes(".")) {
        const name = last.split("?")[0];
        return name.endsWith(".jpg") || name.endsWith(".jpeg")
          ? name
          : `${name.split(".")[0]}.jpg`;
      }
      return fallback;
    } catch {
      return fallback;
    }
  };

  const uploadToR2 = async (originalUri: string) => {
    setUploading(true);
    try {
      const compressed = await compressImage(originalUri, {
        maxWidth: 1080,
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
      });

      const baseName = getFileNameFromUri(originalUri);
      const key = `uploads/${Date.now()}_${baseName.replace(
        /\.[^.]+$/,
        ".jpg"
      )}`;

      const { data } = await axios.get(
        `${process.env.EXPO_PUBLIC_BASE_URL}/uploads/signed-url`,
        {
          params: { filename: key, type: "image/jpeg" },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const signedUrl: string = data.data.signedUrl;

      try {
        const blob = await (await fetch(compressed.uri)).blob();

        const uploadRes = await fetch(signedUrl, {
          method: "PUT",
          headers: { "Content-Type": "image/jpeg" },
          body: blob,
        });

        if (!uploadRes.ok) {
          throw new Error(`Upload failed with status ${uploadRes.status}`);
        }
      } catch (error) {
        console.error("Image upload error:", error);
        logError(error, {
          context: "CreateDebateRoomScreen.uploadToR2",
          fileName: baseName,
        });
        throw error;
      }

      const cdnUrl = `https://cdn.dtrue.app/${key}`;
      setCloudUrl(cdnUrl);
      return cdnUrl;
    } catch (error) {
      console.error("Upload failed:", error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const pickImage = async () => {
    const hasPermission = await requestPermission(
      ImagePicker.requestMediaLibraryPermissionsAsync,
      "We need access to your photo library to upload images."
    );

    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const compressed = await compressImage(result.assets[0].uri);
        setImageUri(compressed.uri);
        await uploadToR2(compressed.uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const takePhoto = async () => {
    const hasPermission = await requestPermission(
      ImagePicker.requestCameraPermissionsAsync,
      "We need access to your camera to take photos."
    );

    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16, 9],
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const compressed = await compressImage(result.assets[0].uri);
        setImageUri(compressed.uri);
        await uploadToR2(compressed.uri);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Error", "Failed to take photo");
    }
  };

  const validateForm = () => {
    const newErrors = { title: "", description: "" };
    let isValid = true;

    if (!title.trim()) {
      newErrors.title = "Title is required";
      isValid = false;
    } else if (title.length < 5) {
      newErrors.title = "Title must be at least 5 characters";
      isValid = false;
    }

    if (!description.trim()) {
      newErrors.description = "Description is required";
      isValid = false;
    } else if (description.length < 20) {
      newErrors.description = "Description must be at least 20 characters";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const { data } = await axios.post(
        `${process.env.EXPO_PUBLIC_BASE_URL}/debates`,
        {
          title: title.trim(),
          description: description.trim(),
          duration: selectedDuration,
          image: cloudUrl,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        trackDebateCreated({
          debateId: data.data.id,
          title: title,
          duration: selectedDuration,
          hasImage: !!imageUri,
          descriptionLength: description.length,
        });

        setShowSuccess(true);
      }
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      logError(err, {
        context: "CreateDebateRoomScreen.handleSubmit",
        title: title ? "[REDACTED_TITLE]" : "undefined",
        descriptionLength: description.length,
        selectedDuration,
      });

      trackDebateCreationFailed({
        error: err.message,
        statusCode: err.response?.status,
      });

      console.error(err);
      Alert.alert("Error", "Failed to create debate room.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuccessComplete = () => {
    setShowSuccess(false);
    router.push("/(tabs)");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor="#080F12" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Icon name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Debate</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Image Section */}
          <ModernImageSelector
            imageUri={imageUri}
            uploading={uploading}
            onPick={pickImage}
            onCapture={takePhoto}
          />

          {/* Title Input */}
          <ModernInput
            icon="format-title"
            placeholder="What's your debate about?"
            value={title}
            onChangeText={setTitle}
            maxLength={50}
            error={errors.title}
            style={styles.inputSpacing}
          />

          {/* Description Input */}
          <ModernInput
            icon="text-long"
            placeholder="Describe the debate topic in detail..."
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={250}
            error={errors.description}
            style={styles.inputSpacing}
          />

          {/* Duration Section */}
          <View style={styles.durationSection}>
            <Text style={styles.sectionTitle}>Duration</Text>
            <View style={styles.durationOptions}>
              {DURATION_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.hours}
                  style={[
                    styles.durationOption,
                    selectedDuration === option.hours && styles.durationOptionSelected,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedDuration(option.hours);
                  }}
                >
                  <Icon
                    name={option.icon}
                    size={20}
                    color={selectedDuration === option.hours ? THEME.colors.text : THEME.colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.durationText,
                      selectedDuration === option.hours && styles.durationTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Create Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.createButton,
            (submitting || uploading) && styles.createButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting || uploading}
        >
          <LinearGradient
            colors={
              submitting || uploading
                ? [THEME.colors.border, THEME.colors.border]
                : [THEME.colors.primary, THEME.colors.primary]
            }
            style={styles.buttonGradient}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={THEME.colors.text} />
            ) : (
              <>
                <Icon name="plus" size={20} color={THEME.colors.text} />
                <Text style={styles.buttonText}>Create Debate</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Success Animation */}
      <SuccessAnimation
        visible={showSuccess}
        onComplete={handleSuccessComplete}
      />
    </SafeAreaView>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center" as const,
    fontSize: 18,
    fontWeight: "600" as const,
    color: THEME.colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexGrow: 1,
  },
  imageSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: THEME.colors.text,
    marginBottom: 12,
  },
  imageContainer: {
    borderRadius: 16,
    overflow: "hidden" as const,
  },
  imageSelector: {
    height: 180,
    backgroundColor: THEME.colors.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: THEME.colors.border,
    borderStyle: "dashed" as const,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  imageSelectorPressed: {
    backgroundColor: "rgba(0, 255, 148, 0.1)",
    borderColor: THEME.colors.primary,
  },
  uploadingContainer: {
    alignItems: "center" as const,
  },
  uploadingText: {
    color: THEME.colors.text,
    marginTop: 8,
    fontSize: 14,
  },
  selectedImage: {
    width: "100%" as const,
    height: "100%" as const,
  },
  placeholderContainer: {
    alignItems: "center" as const,
  },
  placeholderText: {
    color: THEME.colors.text,
    fontSize: 16,
    fontWeight: "500" as const,
    marginTop: 8,
  },
  placeholderSubtext: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  imageActions: {
    flexDirection: "row" as const,
    justifyContent: "center" as const,
    marginTop: 12,
    gap: 24,
  },
  imageAction: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  imageActionText: {
    color: THEME.colors.primary,
    fontSize: 14,
    fontWeight: "500" as const,
  },
  inputSpacing: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    backgroundColor: THEME.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputIconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  textInput: {
    flex: 1,
    color: THEME.colors.text,
    fontSize: 16,
    lineHeight: 22,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: "top" as const,
  },
  characterCount: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    marginLeft: 8,
  },
  errorContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginTop: 6,
    gap: 6,
  },
  errorText: {
    color: THEME.colors.error,
    fontSize: 12,
  },
  durationSection: {
    marginBottom: 24,
  },
  durationOptions: {
    flexDirection: "row" as const,
    gap: 12,
  },
  durationOption: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: THEME.colors.surface,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 8,
  },
  durationOptionSelected: {
    backgroundColor: THEME.colors.primary,
  },
  durationText: {
    color: THEME.colors.textMuted,
    fontSize: 14,
    fontWeight: "500" as const,
  },
  durationTextSelected: {
    color: THEME.colors.text,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: THEME.colors.background,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  createButton: {
    borderRadius: 12,
    overflow: "hidden" as const,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 16,
    gap: 8,
  },
  buttonText: {
    color: THEME.colors.text,
    fontSize: 16,
    fontWeight: "600" as const,
  },
  successOverlay: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    zIndex: 1000,
  },
  successContainer: {
    backgroundColor: THEME.colors.surface,
    borderRadius: 20,
    padding: 32,
    alignItems: "center" as const,
    maxWidth: width * 0.8,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.colors.primary,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginBottom: 16,
  },
  checkmarkContainer: {
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  successTitle: {
    color: THEME.colors.text,
    fontSize: 20,
    fontWeight: "600" as const,
    marginBottom: 8,
  },
  successSubtext: {
    color: THEME.colors.textMuted,
    fontSize: 14,
    textAlign: "center" as const,
  },
};