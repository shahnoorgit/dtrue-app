import React from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme";

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
  const renderEmptyComponent = () => (
    <View style={{ alignItems: "center", paddingVertical: 60 }}>
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
  );

  const renderFooter = () =>
    isLoadingMore ? (
      <View style={{ paddingVertical: 20 }}>
        <ActivityIndicator size='small' color={theme.colors.primary} />
      </View>
    ) : null;

  if (loadingOpinions) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size='large' color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      ref={flatRef}
      data={opinions}
      keyExtractor={(_, idx) => idx.toString()}
      renderItem={({ item }) => (
        <View style={{ marginVertical: 8 }}>{renderOpinion({ item })}</View>
      )}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={10}
      inverted // scroll from bottom to top
      removeClippedSubviews={Platform.OS === "android"}
      contentContainerStyle={{
        paddingTop: submitted ? 16 : 200, // visually bottom
        paddingBottom: 16, // visually top
        paddingHorizontal: 12,
      }}
      onEndReached={() => isNextPage && setPage((prev) => prev + 1)}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmptyComponent}
    />
  );
};

export default OpinionsList;
