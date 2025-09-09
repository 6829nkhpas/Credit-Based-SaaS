import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// User Management
export const userAPI = {
  // Test database connection
  testDB: async () => {
    const response = await api.get('/test-db');
    return response.data;
  },

  // Test credit operations
  testCredits: async (email: string) => {
    const response = await api.post('/credits/test', { email });
    return response.data;
  },

  // Test file operations
  testFiles: async (userId: string, fileName: string) => {
    const response = await api.post('/files/test', { userId, fileName });
    return response.data;
  },

  // Health check
  health: async () => {
    const response = await api.get('/health');
    return response.data;
  }
};

export interface User {
  id: string;
  email: string;
  credits: number;
}

export interface TestResult {
  success: boolean;
  message?: string;
  user?: User;
  testUser?: User;
  error?: string;
}
