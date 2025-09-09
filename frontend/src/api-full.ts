import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interfaces
export interface User {
  id: string;
  email: string;
  firstName: string;
  credits: number;
  role: string;
  isActive: boolean;
}

export interface TestResult {
  success: boolean;
  message?: string;
  error?: string;
  testUser?: User;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface CreditTransaction {
  id: string;
  amount: number;
  type: 'purchase' | 'usage' | 'refund' | 'bonus';
  description: string;
  createdAt: string;
}

export interface FileUpload {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  url?: string;
}

export interface Report {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'completed' | 'failed';
  fileId?: string;
  createdAt: string;
  completedAt?: string;
  downloadUrl?: string;
}

// API Service
export const userAPI = {
  // Authentication
  register: async (email: string, password: string, firstName: string): Promise<ApiResponse<{ user: User; accessToken: string }>> => {
    const response = await api.post('/auth/register', { email, password, firstName });
    return response.data;
  },

  login: async (email: string, password: string): Promise<ApiResponse<{ user: User; accessToken: string }>> => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  logout: async (): Promise<ApiResponse> => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  refreshToken: async (): Promise<ApiResponse<{ accessToken: string }>> => {
    const response = await api.post('/auth/refresh');
    return response.data;
  },

  // User Profile
  getProfile: async (token?: string): Promise<ApiResponse<User>> => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await api.get('/user/profile', { headers });
    return response.data;
  },

  updateProfile: async (data: { firstName?: string; email?: string }): Promise<ApiResponse<User>> => {
    const response = await api.put('/user/profile', data);
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<ApiResponse> => {
    const response = await api.put('/user/password', { currentPassword, newPassword });
    return response.data;
  },

  // Credits
  getCredits: async (): Promise<ApiResponse<{ credits: number; transactions: CreditTransaction[] }>> => {
    const response = await api.get('/user/credits');
    return response.data;
  },

  purchaseCredits: async (amount: number): Promise<ApiResponse<{ paymentUrl: string }>> => {
    const response = await api.post('/payments/purchase', { credits: amount });
    return response.data;
  },

  getCreditHistory: async (): Promise<ApiResponse<CreditTransaction[]>> => {
    const response = await api.get('/user/credits/history');
    return response.data;
  },

  // File Management
  uploadFile: async (file: File): Promise<ApiResponse<FileUpload>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/user/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getFiles: async (): Promise<ApiResponse<FileUpload[]>> => {
    const response = await api.get('/user/files');
    return response.data;
  },

  deleteFile: async (fileId: string): Promise<ApiResponse> => {
    const response = await api.delete(`/user/files/${fileId}`);
    return response.data;
  },

  downloadFile: async (fileId: string): Promise<Blob> => {
    const response = await api.get(`/user/files/${fileId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Reports
  generateReport: async (data: { title: string; description?: string; fileId?: string }): Promise<ApiResponse<Report>> => {
    const response = await api.post('/user/reports/generate', data);
    return response.data;
  },

  getReports: async (): Promise<ApiResponse<Report[]>> => {
    const response = await api.get('/user/reports');
    return response.data;
  },

  getReport: async (reportId: string): Promise<ApiResponse<Report>> => {
    const response = await api.get(`/user/reports/${reportId}`);
    return response.data;
  },

  downloadReport: async (reportId: string): Promise<Blob> => {
    const response = await api.get(`/user/reports/${reportId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Testing endpoints (keep for admin/testing)
  testDB: async (): Promise<TestResult> => {
    const response = await api.get('/test-db');
    return response.data;
  },

  testCredits: async (email: string): Promise<TestResult> => {
    const response = await api.post('/credits/test', { email });
    return response.data;
  },

  testFiles: async (userId: string, fileName: string): Promise<TestResult> => {
    const response = await api.post('/files/test', { userId, fileName });
    return response.data;
  },

  health: async (): Promise<{ status: string; timestamp: string }> => {
    const response = await api.get('/health');
    return response.data;
  },
};
