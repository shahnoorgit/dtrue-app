import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Modal,
  Pressable,
  Platform,
  Button,
} from "react-native";
import { theme } from "../theme";
import { Ionicons } from "@expo/vector-icons";

interface OpinionListProps {
  loadingOpinions: boolean;
  flatRef: React.RefObject<FlatList>;
  opinions: any[];
  renderOpinion: ({ item }: { item: any }) => JSX.Element;
  submitted: boolean;
  isNextPage: boolean;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  isLoadingMore: boolean;
}

const OpinionsList = ({
  loadingOpinions,
  flatRef,
  opinions,
  renderOpinion,
  submitted,
  isNextPage,
  setPage,
  isLoadingMore,
}: OpinionListProps) => {
  return (
    <View>
      {loadingOpinions ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size='large' color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={opinions}
          keyExtractor={(item, idx) => idx.toString()}
          renderItem={renderOpinion}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={Platform.OS === "android"}
          contentContainerStyle={{
            paddingVertical: 8,
            paddingBottom: submitted ? 16 : 80,
          }}
          onEndReached={() => isNextPage && setPage((prev) => prev + 1)}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoadingMore && (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator size='small' color='green' />
              </View>
            )
          }
          ListEmptyComponent={
            <View
              style={{
                justifyContent: "center",
                alignItems: "center",
                paddingVertical: 60,
              }}
            >
              <Ionicons
                name='chatbubble-ellipses-outline'
                size={64}
                color='rgba(0, 255, 148, 0.3)'
              />
              <Text
                style={{
                  color: theme.colors.text,
                  textAlign: "center",
                  marginTop: 12,
                  maxWidth: "80%",
                }}
              >
                Be the first to share your opinion
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default OpinionsList;
