import api from '../lib/api';

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    subscription_tier: string;
  };
  token: string;
  message: string;
}

export const authApi = {
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data.user;
  },

  updateProfile: async (data: { name?: string; avatar_url?: string }) => {
    const response = await api.put('/auth/me', data);
    return response.data.user;
  },
};

