import React from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface OpinionsListProps {
  loadingOpinions: boolean;
  flatRef: React.RefObject<FlatList<any>>;
  opinions: any[];
  renderOpinion: ({ item }: { item: any }) => JSX.Element;
  submitted: boolean;
  isNextPage: boolean;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  isLoadingMore: boolean;
}

const OpinionsList: React.FC<OpinionsListProps> = ({
  loadingOpinions,
  flatRef,
  opinions,
  renderOpinion,
  submitted,
  isNextPage,
  setPage,
  isLoadingMore,
}) => {
  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name='chatbubble-ellipses-outline'
        size={64}
        color='rgba(255,255,255,0.3)'
      />
      <Text style={styles.emptyText}>Be the first to share your opinion</Text>
    </View>
  );

  const renderFooter = () =>
    isLoadingMore ? (
      <View style={styles.footerLoading}>
        <ActivityIndicator size='small' color='#FFF' />
      </View>
    ) : null;

  if (loadingOpinions) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#FFF' />
      </View>
    );
  }

  return (
    <FlatList
      ref={flatRef}
      data={opinions}
      keyExtractor={(_, idx) => idx.toString()}
      renderItem={({ item }) => (
        <View style={styles.itemContainer}>{renderOpinion({ item })}</View>
      )}
      inverted
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={10}
      removeClippedSubviews={Platform.OS === "android"}
      contentContainerStyle={{
        paddingTop: submitted ? 16 : 200,
        paddingBottom: 16,
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

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    transform: [{ scaleY: -1 }, { scaleX: -1 }],
  },
  emptyText: {
    color: "#FFF",
    textAlign: "center",
    marginTop: 12,
    fontSize: 16,
    maxWidth: "80%",
  },
  itemContainer: {
    marginVertical: 8,
  },
  footerLoading: {
    paddingVertical: 20,
  },
});
