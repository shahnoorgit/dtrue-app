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
      <View style={{ flex: 1, backgroundColor: cyberpunkTheme.colors.background.primary }}>
        <LinearGradient
          colors={cyberpunkTheme.colors.gradients.background as [string, string]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        
        {/* Header */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: 16, 
          borderBottomWidth: 1, 
          borderBottomColor: cyberpunkTheme.colors.border.primary 
        }}>
          <TouchableOpacity
            onPress={handleClose}
            disabled={isSubmitting}
            style={{ padding: 8 }}
          >
            <Text style={{ 
              color: cyberpunkTheme.colors.primary, 
              fontSize: 16, 
              fontWeight: '500' 
            }}>
              {isSubmitting ? 'Submitting...' : 'Cancel'}
            </Text>
          </TouchableOpacity>
          
          <Text style={{ 
            color: cyberpunkTheme.colors.text.primary, 
            fontSize: 18, 
            fontWeight: '600' 
          }}>Report Content</Text>
          
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!selectedReason || isSubmitting}
            style={{ padding: 8 }}
          >
            <Text style={{
              fontSize: 16,
              fontWeight: '500',
              color: selectedReason && !isSubmitting
                ? cyberpunkTheme.colors.primary
                : cyberpunkTheme.colors.text.disabled
            }}>
              Submit
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1, padding: 24 }}>
          {/* Target Info */}
          <View style={{ marginBottom: 32 }}>
            <Text style={{ 
              color: cyberpunkTheme.colors.text.primary, 
              fontSize: 20, 
              fontWeight: '700', 
              marginBottom: 12 
            }}>
              What are you reporting?
            </Text>
            <Text style={{ 
              color: cyberpunkTheme.colors.text.tertiary, 
              fontSize: 16, 
              lineHeight: 24 
            }}>
              {targetTitle}
            </Text>
          </View>

          {/* Reason Selection */}
          <View style={{ marginBottom: 32 }}>
            <Text style={{ 
              color: cyberpunkTheme.colors.text.primary, 
              fontSize: 20, 
              fontWeight: '700', 
              marginBottom: 24 
            }}>
              Why are you reporting this?
            </Text>
            <View>
              {Object.entries(REPORT_REASONS).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => setSelectedReason(key as ReportReason)}
                  style={{
                    padding: 20,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: selectedReason === key 
                      ? cyberpunkTheme.colors.primary 
                      : cyberpunkTheme.colors.border.primary,
                    backgroundColor: selectedReason === key
                      ? cyberpunkTheme.colors.primary + '20'
                      : cyberpunkTheme.colors.background.elevated,
                    marginBottom: 12,
                  }}
                >
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '500',
                    color: selectedReason === key 
                      ? cyberpunkTheme.colors.primary 
                      : cyberpunkTheme.colors.text.tertiary,
                  }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Description */}
          <View style={{ marginBottom: 32 }}>
            <Text style={{ 
              color: cyberpunkTheme.colors.text.primary, 
              fontSize: 20, 
              fontWeight: '700', 
              marginBottom: 12 
            }}>
              Additional Details (Optional)
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Provide more details about why you're reporting this content..."
              placeholderTextColor={cyberpunkTheme.colors.text.muted}
              multiline
              numberOfLines={5}
              maxLength={1000}
              style={{
                backgroundColor: cyberpunkTheme.colors.background.elevated,
                borderWidth: 2,
                borderColor: cyberpunkTheme.colors.border.primary,
                borderRadius: 12,
                padding: 20,
                color: cyberpunkTheme.colors.text.primary,
                fontSize: 16,
                textAlignVertical: 'top',
                minHeight: 120,
              }}
              editable={!isSubmitting}
            />
            <Text style={{ 
              color: cyberpunkTheme.colors.text.muted, 
              fontSize: 14, 
              marginTop: 12, 
              textAlign: 'right' 
            }}>
              {description.length}/1000 characters
            </Text>
          </View>

          {/* Info */}
          <View style={{
            backgroundColor: cyberpunkTheme.colors.semantic.info + '20',
            borderWidth: 2,
            borderColor: cyberpunkTheme.colors.semantic.info,
            borderRadius: 12,
            padding: 20,
          }}>
            <Text style={{ 
              color: cyberpunkTheme.colors.semantic.infoLight, 
              fontSize: 14, 
              lineHeight: 21 
            }}>
              Your report will be reviewed by our moderation team. We take all reports seriously and will take appropriate action if our community guidelines are violated.
            </Text>
          </View>
        </ScrollView>

        {/* Loading Overlay */}
        {isSubmitting && (
          <View style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: cyberpunkTheme.colors.overlay.darker,
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <View style={{ 
              backgroundColor: cyberpunkTheme.colors.background.elevated, 
              borderRadius: 12, 
              padding: 24, 
              alignItems: 'center',
              borderWidth: 1,
              borderColor: cyberpunkTheme.colors.primary + '40',
            }}>
              <ActivityIndicator size="large" color={cyberpunkTheme.colors.primary} />
              <Text style={{ 
                color: cyberpunkTheme.colors.text.primary, 
                fontSize: 16, 
                marginTop: 16 
              }}>Submitting report...</Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
