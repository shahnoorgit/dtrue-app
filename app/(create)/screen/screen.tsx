import React, { useEffect, useState } from "react";
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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import axios from "axios";

import { cyberpunkTheme } from "@/constants/theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthToken } from "@/hook/clerk/useFetchjwtToken";
import { logError } from "@/utils/sentry/sentry";
import {
  trackDebateCreated,
  trackDebateCreationFailed,
} from "@/lib/posthog/events";

// Duration Options
const DURATION_OPTIONS = [
  { label: "24 Hours", hours: 24 },
  { label: "3 Days", hours: 72 },
  { label: "7 Days", hours: 168 },
];

// Image Selector Component
const DebateRoomImageSelector = ({
  imageUri,
  uploading,
  onPick,
  onCapture,
}: {
  imageUri: string | null;
  uploading: boolean;
  onPick: () => Promise<void>;
  onCapture: () => Promise<void>;
}) => (
  <View>
    <TouchableOpacity
      onPress={onPick}
      className='w-full h-96 border-2 rounded-2xl justify-center items-center mb-4 overflow-hidden'
      style={{
        borderColor: cyberpunkTheme.borders.glowing.borderColor,
        backgroundColor: "rgba(31, 41, 55, 0.5)",
      }}
    >
      {uploading ? (
        <ActivityIndicator size='large' color={cyberpunkTheme.colors.primary} />
      ) : imageUri ? (
        <Image
          source={{ uri: imageUri }}
          className='w-full h-full'
          resizeMode='cover'
        />
      ) : (
        <View className='items-center'>
          <Icon
            name='image-plus'
            size={64}
            color={cyberpunkTheme.colors.primary}
          />
          <Text className='text-gray-400 mt-2'>Upload Debate Room Image</Text>
        </View>
      )}
    </TouchableOpacity>
    <View className='flex-row justify-between'>
      <TouchableOpacity onPress={onPick} className='p-2'>
        <Text style={{ color: cyberpunkTheme.colors.primary }}>Pick</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onCapture} className='p-2'>
        <Text style={{ color: cyberpunkTheme.colors.primary }}>Camera</Text>
      </TouchableOpacity>
    </View>
  </View>
);

export default function CreateDebateRoomScreen() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDuration, setSelectedDuration] = useState(24);
  const [imageUri, setImageUri] = useState<string | null>(null); // local compressed preview
  const [cloudUrl, setCloudUrl] = useState<string | null>(null); // CDN url
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({ title: "", description: "" });
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

  // ---------- Image compression helper ----------
  const compressImage = async (
    uri: string,
    {
      maxWidth = 1080,
      compress = 0.8,
      format = ImageManipulator.SaveFormat.JPEG,
    } = {}
  ): Promise<{ uri: string; width?: number; height?: number }> => {
    // Resize + convert to JPEG
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      { compress, format, base64: false }
    );
    return { uri: result.uri, width: result.width, height: result.height };
  };

  // ---------- Utility: extract filename from URI ----------
  const getFileNameFromUri = (uri: string, fallback = "upload.jpg") => {
    try {
      const parts = uri.split("/");
      const last = parts[parts.length - 1];
      // Ensure .jpg extension
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

  // ---------- Upload compressed image to R2 using signed URL ----------
  const uploadToR2 = async (originalUri: string) => {
    setUploading(true);
    try {
      // 1) Compress image locally
      const compressed = await compressImage(originalUri, {
        maxWidth: 1080,
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
      });

      // 2) Determine key & filename (use timestamp + original name)
      const baseName = getFileNameFromUri(originalUri);
      const key = `uploads/${Date.now()}_${baseName.replace(
        /\.[^.]+$/,
        ".jpg"
      )}`;

      // 3) Request signed URL from backend
      const { data } = await axios.get(
        `${process.env.EXPO_PUBLIC_BASE_URL}/uploads/signed-url`,
        {
          params: { filename: key, type: "image/jpeg" },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const signedUrl: string = data.data.signedUrl;

      // 4) Convert compressed URI to blob and upload
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

      // 5) Construct public CDN URL (your existing CDN pattern)
      const publicUrl = `https://r2-image-cdn.letsdebate0.workers.dev/letsdebate-media/${key}`;
      setCloudUrl(publicUrl);
      setImageUri(compressed.uri);
    } catch (err) {
      console.error(err);
      logError(err, {
        context: "CreateDebateRoomScreen.uploadToR2",
        uri: originalUri ? "[REDACTED_URI]" : "undefined",
      });
      Alert.alert("Upload Error", "Unable to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // ---------- Pick from gallery ----------
  const pickImage = async () => {
    if (
      !(await requestPermission(
        ImagePicker.requestMediaLibraryPermissionsAsync,
        "Access to media library is needed."
      ))
    )
      return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1, // keep highest, we'll compress ourselves
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      await uploadToR2(result.assets[0].uri);
    }
  };

  // ---------- Take photo ----------
  const takePhoto = async () => {
    if (
      !(await requestPermission(
        ImagePicker.requestCameraPermissionsAsync,
        "Camera permission is needed."
      ))
    )
      return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      await uploadToR2(result.assets[0].uri);
    }
  };

  const validate = () => {
    const errs = { title: "", description: "" };
    let ok = true;
    if (!title.trim()) {
      errs.title = "Title is required";
      ok = false;
    }
    if (!description.trim()) {
      errs.description = "Description is required";
      ok = false;
    }
    if (!cloudUrl) {
      Alert.alert("Validation", "Please upload an image.");
      ok = false;
    }
    setErrors(errs);
    return ok;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const { data } = await axios.post(
        `${process.env.EXPO_PUBLIC_BASE_URL}/debate-room`,
        {
          title,
          description,
          image: cloudUrl,
          duration: selectedDuration,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (data.status === 401) {
        await refreshToken();
        return handleSubmit();
      }
      if (data.success) {
        trackDebateCreated({
          debateId: data.data.id,
          title: title,
          duration: selectedDuration,
          hasImage: !!imageUri,
          descriptionLength: description.length,
        });
        Alert.alert("Success", "Debate created!", [
          { text: "OK", onPress: () => router.push("/(tabs)") },
        ]);
      }
    } catch (err: any) {
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

  return (
    <SafeAreaView className='flex-1 bg-[#0A0A1A]'>
      <StatusBar style='light' backgroundColor='#0A0A1A' />

      {/* Header */}
      <View className='flex-row items-center px-4 py-2 mb-2'>
        <TouchableOpacity
          onPress={() => router.back()}
          className='p-2 bg-gray-800 rounded-full mr-4'
        >
          <Icon
            name='arrow-left-circle'
            color={cyberpunkTheme.colors.primary}
            size={28}
          />
        </TouchableOpacity>
        <Text className='text-2xl font-bold text-white flex-1'>
          Create Debate Room
        </Text>
      </View>

      {/* Loading Overlay */}
      {(submitting || uploading) && (
        <View className='absolute inset-0 bg-black/50 justify-center items-center z-20'>
          <ActivityIndicator
            size='large'
            color={cyberpunkTheme.colors.primary}
          />
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className='flex-1'
        keyboardVerticalOffset={80}
      >
        <ScrollView
          className='flex-grow px-4'
          contentContainerStyle={{ paddingBottom: 100 }}
          keyboardShouldPersistTaps='handled'
        >
          <DebateRoomImageSelector
            imageUri={imageUri}
            uploading={uploading}
            onPick={pickImage}
            onCapture={takePhoto}
          />

          {/* Title Field */}
          <View className='mb-4'>
            <View className='flex-row items-center bg-gray-800 border border-gray-700 rounded-xl p-4'>
              <Icon
                name='text'
                size={20}
                color={cyberpunkTheme.colors.primary}
              />
              <TextInput
                className='flex-1 ml-2 text-white'
                placeholder='Debate Room Title'
                placeholderTextColor={cyberpunkTheme.colors.text.muted}
                value={title}
                onChangeText={setTitle}
                maxLength={50}
              />
            </View>
            {errors.title && (
              <Text className='text-red-400 text-sm mt-1 pl-2'>
                {errors.title}
              </Text>
            )}
          </View>

          {/* Description Field */}
          <View className='mb-4'>
            <View className='flex-row items-start bg-gray-800 border border-gray-700 rounded-xl p-4'>
              <Icon
                name='text-long'
                size={20}
                color={cyberpunkTheme.colors.primary}
                className='mt-1'
              />
              <TextInput
                className='flex-1 ml-2 text-white min-h-[120px]'
                placeholder='Debate Room Description'
                placeholderTextColor={cyberpunkTheme.colors.text.muted}
                value={description}
                onChangeText={setDescription}
                multiline
                maxLength={250}
              />
            </View>
            {errors.description && (
              <Text className='text-red-400 text-sm mt-1 pl-2'>
                {errors.description}
              </Text>
            )}
          </View>

          {/* Duration Selector */}
          <View className='mb-4'>
            <Text className='text-white text-lg mb-2 pl-2'>
              Select Debate Duration
            </Text>
            <View className='flex-row justify-between'>
              {DURATION_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.hours}
                  onPress={() => setSelectedDuration(opt.hours)}
                  className={`flex-1 mx-1 p-3 rounded-xl items-center ${
                    selectedDuration === opt.hours
                      ? "bg-green-500/20 border border-green-400"
                      : "bg-gray-800"
                  }`}
                >
                  <Text
                    className={`text-base ${
                      selectedDuration === opt.hours
                        ? "text-green-400"
                        : "text-gray-300"
                    }`}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Create Button */}
      <View className='absolute rounded-xl bottom-0 left-0 right-0 p-4 bg-[#0A0A1A]'>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting || uploading}
          className='w-full'
        >
          <LinearGradient
            colors={
              submitting || uploading
                ? [cyberpunkTheme.colors.primary, cyberpunkTheme.colors.primary]
                : [cyberpunkTheme.colors.primary, cyberpunkTheme.colors.primary]
            }
            className='rounded-full py-4 items-center'
          >
            {submitting ? (
              <ActivityIndicator size='small' color='#000' />
            ) : (
              <Text className='text-black font-bold text-lg'>
                CREATE DEBATE ROOM
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
