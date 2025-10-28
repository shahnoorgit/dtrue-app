import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { cyberpunkTheme } from '@/constants/theme';
import { reportingApi, ReportReason, REPORT_REASONS, CreateReportRequest, validateReportTarget } from '@/services/reportingApi';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  target: {
    debateRoomId?: string;
    participantId?: string;
    replyId?: string;
    reportedUserId?: string;
  };
  targetTitle?: string; // For display purposes
}

export default function ReportModal({
  visible,
  onClose,
  onSuccess,
  target,
  targetTitle = 'this content',
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Error', 'Please select a reason for reporting');
      return;
    }

    const { valid, error } = validateReportTarget(target);
    if (!valid) {
      Alert.alert('Error', error || 'Invalid report target');
      return;
    }

    setIsSubmitting(true);
    try {
      const reportData: CreateReportRequest = {
        reason: selectedReason,
        description: description.trim() || undefined,
        ...target,
      };

      await reportingApi.createReport(reportData);
      
      Alert.alert(
        'Report Submitted',
        'Thank you for your report. We will review it and take appropriate action.',
        [
          {
            text: 'OK',
            onPress: () => {
              onClose();
              onSuccess?.();
              // Reset form
              setSelectedReason(null);
              setDescription('');
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Report submission error:', error);
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Failed to submit report. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
    // Reset form
    setSelectedReason(null);
    setDescription('');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-gray-900">
        <LinearGradient
          colors={cyberpunkTheme.colors.gradients.background as [string, string]}
          className="absolute inset-0"
        />
        
        {/* Header */}
        <View className="flex-row items-center justify-between p-4 border-b border-gray-700">
          <TouchableOpacity
            onPress={handleClose}
            disabled={isSubmitting}
            className="p-2"
          >
            <Text className="text-blue-400 text-base font-medium">
              {isSubmitting ? 'Submitting...' : 'Cancel'}
            </Text>
          </TouchableOpacity>
          
          <Text className="text-white text-lg font-semibold">Report Content</Text>
          
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!selectedReason || isSubmitting}
            className="p-2"
          >
            <Text
              className={`text-base font-medium ${
                selectedReason && !isSubmitting
                  ? 'text-blue-400'
                  : 'text-gray-500'
              }`}
            >
              Submit
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 p-6">
          {/* Target Info */}
          <View className="mb-8">
            <Text className="text-white text-xl font-bold mb-3">
              What are you reporting?
            </Text>
            <Text className="text-gray-300 text-base leading-6">
              {targetTitle}
            </Text>
          </View>

          {/* Reason Selection */}
          <View className="mb-8">
            <Text className="text-white text-xl font-bold mb-6">
              Why are you reporting this?
            </Text>
            <View className="space-y-4">
              {Object.entries(REPORT_REASONS).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => setSelectedReason(key as ReportReason)}
                  className={`p-5 rounded-xl border-2 ${
                    selectedReason === key
                      ? 'border-blue-400 bg-blue-400/10'
                      : 'border-gray-600 bg-gray-800/50'
                  }`}
                  style={{ marginBottom: 12 }}
                >
                  <Text
                    className={`text-base font-medium ${
                      selectedReason === key ? 'text-blue-400' : 'text-gray-300'
                    }`}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Description */}
          <View className="mb-8">
            <Text className="text-white text-xl font-bold mb-3">
              Additional Details (Optional)
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Provide more details about why you're reporting this content..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={5}
              maxLength={1000}
              className="bg-gray-800/50 border-2 border-gray-600 rounded-xl p-5 text-white text-base"
              style={{ textAlignVertical: 'top', minHeight: 120 }}
              editable={!isSubmitting}
            />
            <Text className="text-gray-400 text-sm mt-3 text-right">
              {description.length}/1000 characters
            </Text>
          </View>

          {/* Info */}
          <View className="bg-blue-900/20 border-2 border-blue-700 rounded-xl p-5">
            <Text className="text-blue-300 text-sm leading-6">
              Your report will be reviewed by our moderation team. We take all reports seriously and will take appropriate action if our community guidelines are violated.
            </Text>
          </View>
        </ScrollView>

        {/* Loading Overlay */}
        {isSubmitting && (
          <View className="absolute inset-0 bg-black/50 items-center justify-center">
            <View className="bg-gray-800 rounded-lg p-6 items-center">
              <ActivityIndicator size="large" color="#60A5FA" />
              <Text className="text-white text-base mt-4">Submitting report...</Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
