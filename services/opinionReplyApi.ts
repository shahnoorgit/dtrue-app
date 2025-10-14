import { useFetchWithToken } from '@/hook/api/useFetchWithToken.';

// Types for opinion replies
export interface OpinionReply {
  id: string;
  content: string;
  user: {
    id: string;
    username: string;
    image: string | null;
  };
  createdAt: string;
  updatedAt: string;
  upvotes: number;
  isUpvoted: boolean;
  isEdited: boolean;
  isOwner: boolean;
  isDeleted: boolean;
  childRepliesCount: number;
}

export interface OpinionReplyResponse {
  data: OpinionReply[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface CreateReplyRequest {
  debateRoomId: string;
  participantUserId: string;
  content: string;
  parentReplyId?: string;
}

export interface CreateNestedReplyRequest {
  debateRoomId: string;
  participantUserId: string;
  content: string;
}

export interface UpdateReplyRequest {
  content: string;
}

export interface UpvoteResponse {
  upvoted: boolean;
  upvoteCount: number;
}

// Opinion Reply API Service using existing token management
export const useOpinionReplyService = () => {
  const { fetchWithToken } = useFetchWithToken();
  const baseUrl = process.env.EXPO_PUBLIC_BASE_URL || '';

  // Create a top-level reply to an opinion
  const createReply = async (request: CreateReplyRequest): Promise<OpinionReply> => {
    const response = await fetchWithToken(`${baseUrl}/opinion-reply`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return response;
  };

  // Create a nested reply to an existing reply
  const createNestedReply = async (replyId: string, request: CreateNestedReplyRequest): Promise<OpinionReply> => {
    const response = await fetchWithToken(`${baseUrl}/opinion-reply/${replyId}/reply`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return response;
  };

  // Get all top-level replies for a specific participant's opinion
  const getRepliesForOpinion = async (
    participantId: string,
    page: number = 1,
    pageSize: number = 20,
    orderBy: 'date' | 'upvotes' = 'date'
  ): Promise<OpinionReplyResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      orderBy,
    });
    const response = await fetchWithToken(`${baseUrl}/opinion-reply/opinion/${participantId}?${params}`);
    return response;
  };

  // Get child replies for a specific reply
  const getChildReplies = async (
    replyId: string,
    page: number = 1,
    pageSize: number = 20,
    orderBy: 'date' | 'upvotes' = 'date'
  ): Promise<OpinionReplyResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      orderBy,
    });
    const response = await fetchWithToken(`${baseUrl}/opinion-reply/${replyId}/replies?${params}`);
    return response;
  };

  // Get a single reply
  const getReply = async (replyId: string): Promise<OpinionReply> => {
    const response = await fetchWithToken(`${baseUrl}/opinion-reply/${replyId}`);
    return response;
  };

  // Update a reply
  const updateReply = async (replyId: string, request: UpdateReplyRequest): Promise<OpinionReply> => {
    const response = await fetchWithToken(`${baseUrl}/opinion-reply/${replyId}`, {
      method: 'PATCH',
      body: JSON.stringify(request),
    });
    return response;
  };

  // Delete a reply
  const deleteReply = async (replyId: string): Promise<{ success: boolean }> => {
    const response = await fetchWithToken(`${baseUrl}/opinion-reply/${replyId}`, {
      method: 'DELETE',
    });
    return response;
  };

  // Toggle upvote on a reply
  const toggleUpvote = async (replyId: string): Promise<UpvoteResponse> => {
    const response = await fetchWithToken(`${baseUrl}/opinion-reply/${replyId}/upvote`, {
      method: 'POST',
    });
    return response;
  };

  // Remove upvote from a reply
  const removeUpvote = async (replyId: string): Promise<{ success: boolean }> => {
    const response = await fetchWithToken(`${baseUrl}/opinion-reply/${replyId}/upvote`, {
      method: 'DELETE',
    });
    return response;
  };

  return {
    createReply,
    createNestedReply,
    getRepliesForOpinion,
    getChildReplies,
    getReply,
    updateReply,
    deleteReply,
    toggleUpvote,
    removeUpvote,
  };
};

