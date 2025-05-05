import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthToken } from "@/hook/clerk/useFetchjwtToken";

const Rooms = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const [token, refreshToken] = useAuthToken();

  const theme = {
    colors: {
      primary: "#00FF94",
      secondary: "#FF00E5",
      background: "#080F12",
      backgroundDarker: "#03120F",
      text: "#FFFFFF",
      textMuted: "#8F9BB3",
    },
  };

  const fetchDebateRooms = async () => {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BASE_URL}/debate-room/get-user-participated-rooms`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      if (response.status === 401) {
        refreshToken();
        fetchDebateRooms();
      }

      const data = await response.json();
      console.log("Fetched debate rooms:", data);
      setRooms(data.data);
    } catch (error) {
      console.error("Failed to fetch debate rooms:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDebateRooms();
  };

  useEffect(() => {
    fetchDebateRooms();
  }, []);

  const calculateTimeRemaining = (createdAt, durationHours) => {
    const creationDate = new Date(createdAt);
    const endDate = new Date(
      creationDate.getTime() + durationHours * 60 * 60 * 1000
    );
    const now = new Date();

    // If the debate has ended
    if (now > endDate) {
      return "Ended";
    }

    const remainingMs = endDate - now;
    const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
    const remainingMinutes = Math.floor(
      (remainingMs % (1000 * 60 * 60)) / (1000 * 60)
    );

    if (remainingHours > 0) {
      return `${remainingHours}h ${remainingMinutes}m left`;
    } else {
      return `${remainingMinutes}m left`;
    }
  };

  const navigateToDebate = (debate) => {
    router.push({
      pathname: "/(chat-room)/screen",
      params: {
        clerkId: debate?.userId,
        debateId: debate.id,
        debateImage: debate.image,
      },
    });
  };

  const renderDebateRoom = ({ item }) => {
    const debate = item.debateRoom;
    const timeRemaining = calculateTimeRemaining(
      debate.createdAt,
      debate.duration
    );

    return (
      <TouchableOpacity
        style={styles.debateCard}
        onPress={() => navigateToDebate(debate)}
        activeOpacity={0.7}
      >
        <Image source={{ uri: debate?.image }} style={styles.debateImage} />
        <View style={styles.debateInfo}>
          <Text style={styles.debateTitle} numberOfLines={1}>
            {debate.title}
          </Text>
          <Text style={styles.debateDescription} numberOfLines={2}>
            {debate.description}
          </Text>
          <View style={styles.debateStats}>
            <Text style={styles.timeRemaining}>{timeRemaining}</Text>
            <View style={styles.usersCount}>
              <Ionicons name='people' size={16} color={theme.colors.primary} />
              <Text style={styles.usersCountText}>
                {debate?.joinedUsers} joined
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size='large' color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Debate Rooms</Text>
        <TouchableOpacity style={styles.newDebateButton}>
          <Ionicons name='add-circle' size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {rooms.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name='chatbubbles-outline'
            size={64}
            color={theme.colors.textMuted}
          />
          <Text style={styles.emptyText}>No debate rooms yet</Text>
          <Text style={styles.emptySubtext}>
            Join or create a debate to get started
          </Text>
        </View>
      ) : (
        <FlatList
          data={rooms}
          renderItem={renderDebateRoom}
          keyExtractor={(item) => item.debateRoom.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#080F12",
    paddingHorizontal: 16,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  newDebateButton: {
    padding: 4,
  },
  listContainer: {
    paddingBottom: 16,
  },
  debateCard: {
    flexDirection: "row",
    backgroundColor: "#03120F",
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    elevation: 2,
    shadowColor: "#00FF94",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 1,
    borderLeftColor: "#00FF9455",
  },
  debateImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 14,
  },
  debateInfo: {
    flex: 1,
    justifyContent: "space-between",
  },
  debateTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  debateDescription: {
    fontSize: 14,
    color: "#8F9BB3",
    marginBottom: 8,
  },
  debateStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timeRemaining: {
    fontSize: 12,
    fontWeight: "600",
    color: "#00FF94",
  },
  usersCount: {
    flexDirection: "row",
    alignItems: "center",
  },
  usersCountText: {
    fontSize: 12,
    marginLeft: 4,
    color: "#8F9BB3",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 50,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#8F9BB3",
    marginTop: 8,
    textAlign: "center",
  },
});

export default Rooms;
