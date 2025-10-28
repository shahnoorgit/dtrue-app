import { createAuthAxiosInstance } from '@/utils/axiosInstance';

export type ReportReason =
  | 'SPAM'
  | 'HARASSMENT'
  | 'HATE_SPEECH'
  | 'INAPPROPRIATE_CONTENT'
  | 'MISINFORMATION'
  | 'COPYRIGHT_VIOLATION'
  | 'PRIVACY_VIOLATION'
  | 'VIOLENCE_THREATS'
  | 'SELF_HARM'
  | 'OTHER';

export type ReportStatus = 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';

export interface ReportTarget {
  debateRoomId?: string;
  participantId?: string; // requires debateRoomId
  replyId?: string;
  reportedUserId?: string;
}

export interface CreateReportRequest {
  reason: ReportReason;
  description?: string;
  debateRoomId?: string;
  participantId?: string;
  replyId?: string;
  reportedUserId?: string;
}

export interface ReportResponse {
  id: string;
  reason: ReportReason;
  status: ReportStatus;
  description?: string;
  reporter: {
    id: string;
    name: string;
    username: string;
    image?: string;
  };
  debateRoom?: {
    id: string;
    title: string;
  };
  participant?: {
    user: {
      id: string;
      username: string;
    };
    opinion: string;
  };
  reply?: {
    id: string;
    content: string;
  };
  reportedUser?: {
    id: string;
    name: string;
    username: string;
    image?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface MyReportsResponse {
  reports: ReportResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const reportingApi = {
  async createReport(data: CreateReportRequest): Promise<ReportResponse> {
    const axiosInstance = createAuthAxiosInstance();
    const response = await axiosInstance.post('/reports', data);
    return response.data;
  },

  async getMyReports(page = 1, limit = 20): Promise<MyReportsResponse> {
    const axiosInstance = createAuthAxiosInstance();
    const response = await axiosInstance.get(`/reports/my-reports?page=${page}&limit=${limit}`);
    return response.data;
  },

  async getReportById(id: string): Promise<ReportResponse> {
    const axiosInstance = createAuthAxiosInstance();
    const response = await axiosInstance.get(`/reports/${id}`);
    return response.data;
  },
};

// Reason labels for UI
export const REPORT_REASONS: Record<ReportReason, string> = {
  SPAM: 'Spam',
  HARASSMENT: 'Harassment',
  HATE_SPEECH: 'Hate speech',
  INAPPROPRIATE_CONTENT: 'Inappropriate content',
  MISINFORMATION: 'Misinformation',
  COPYRIGHT_VIOLATION: 'Copyright violation',
  PRIVACY_VIOLATION: 'Privacy violation',
  VIOLENCE_THREATS: 'Violence or threats',
  SELF_HARM: 'Self-harm',
  OTHER: 'Other',
};

// Helper function to validate report target
export function validateReportTarget(target: ReportTarget): { valid: boolean; error?: string } {
  const { debateRoomId, participantId, replyId, reportedUserId } = target;
  
  const targetCount = [debateRoomId, participantId, replyId, reportedUserId].filter(Boolean).length;
  
  if (targetCount === 0) {
    return { valid: false, error: 'At least one target must be provided' };
  }
  
  if (targetCount > 1) {
    return { valid: false, error: 'Only one target can be provided' };
  }
  
  if (participantId && !debateRoomId) {
    return { valid: false, error: 'debateRoomId is required when reporting an opinion' };
  }
  
  return { valid: true };
}
