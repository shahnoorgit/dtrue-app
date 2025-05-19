import React, { useState } from "react";
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
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import axios from "axios";

import { cyberpunkTheme } from "@/constants/theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthToken } from "@/hook/clerk/useFetchjwtToken";

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
}) => (
  <View>
    <TouchableOpacity
      onPress={onPick}
      className='w-full h-96 border-2 rounded-2xl justify-center items-center mb-4 overflow-hidden'
      style={{
        borderColor: cyberpunkTheme.borders.glowing.borderColor,
        backgroundColor: "rgba(31, 41, 55, 0.5)", // Dark backdrop for image area
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
  </View>
);

// Main Screen
export default function CreateDebateRoomScreen() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDuration, setSelectedDuration] = useState(24);
  const [imageUri, setImageUri] = useState(null);
  const [cloudUrl, setCloudUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({ title: "", description: "" });
  const [token, refreshToken] = useAuthToken();

  const router = useRouter();

  const requestPermission = async (permissionFn, errorMsg) => {
    if (Platform.OS !== "web") {
      const { status } = await permissionFn();
      if (status !== "granted") {
        Alert.alert("Permission Required", errorMsg);
        return false;
      }
    }
    return true;
  };

  const uploadToCloudinary = async (uri) => {
    setUploading(true);
    try {
      const form = new FormData();
      const name = uri.split("/").pop();
      const match = /\.(\w+)$/.exec(name || "");
      form.append("file", {
        uri,
        name,
        type: match ? `image/${match[1]}` : "image/jpeg",
      });
      form.append("upload_preset", "lets_debate");

      const res = await fetch(
        "https://api.cloudinary.com/v1_1/shahnoorcloudinary/image/upload",
        { method: "POST", body: form }
      );
      const data = await res.json();
      if (data.secure_url) setCloudUrl(data.secure_url);
      else {
        console.error("Cloudinary Error:", data);
        Alert.alert("Upload Failed", "Unable to upload image.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Upload Error", "Check your connection and try again.");
    } finally {
      setUploading(false);
    }
  };

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
      quality: 1,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setImageUri(uri);
      await uploadToCloudinary(uri);
    }
  };

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
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setImageUri(uri);
      await uploadToCloudinary(uri);
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
        { title, description, image: cloudUrl, duration: selectedDuration },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (data.status == 401) {
        refreshToken();
        handleSubmit();
      }
      if (data.success) {
        Alert.alert("Success", "Debate created!", [
          { text: "OK", onPress: () => router.push("/(tabs)/debates") },
        ]);
      }
    } catch (err) {
      if (err.response?.status === 400) {
        Alert.alert("Notice", "You already have an active debate.");
      } else {
        Alert.alert("Error", "Failed to create debate room.");
        console.error(err);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className='flex-1 bg-[#0A0A1A]'>
      <StatusBar style='light' backgroundColor='#0A0A1A' />

      {/* Header with Back Button */}
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
            {errors.title ? (
              <Text className='text-red-400 text-sm mt-1 pl-2'>
                {errors.title}
              </Text>
            ) : null}
          </View>

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
            {errors.description ? (
              <Text className='text-red-400 text-sm mt-1 pl-2'>
                {errors.description}
              </Text>
            ) : null}
          </View>

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

      {/* Sticky Create Button */}
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
