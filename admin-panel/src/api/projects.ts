import api from '../lib/api';

export interface Project {
  id: string;
  portfolio_id: string;
  title: string;
  description: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectData {
  portfolio_id: string;
  title: string;
  description?: string;
  order_index?: number;
}

export interface UpdateProjectData {
  title?: string;
  description?: string;
  order_index?: number;
}

export const projectsApi = {
  getByPortfolio: async (portfolioId: string): Promise<Project[]> => {
    const response = await api.get<{ projects: Project[] }>(`/projects/portfolio/${portfolioId}`);
    return response.data.projects;
  },

  getById: async (id: string): Promise<Project> => {
    const response = await api.get<{ project: Project }>(`/projects/${id}`);
    return response.data.project;
  },

  create: async (data: CreateProjectData): Promise<Project> => {
    const response = await api.post<{ project: Project }>('/projects', data);
    return response.data.project;
  },

  update: async (id: string, data: UpdateProjectData): Promise<Project> => {
    const response = await api.put<{ project: Project }>(`/projects/${id}`, data);
    return response.data.project;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/projects/${id}`);
  },
};

