import api from './api';
import axios from 'axios';

export const authService = {
  register: async (email, password) => {
    const response = await api.post('/auth/register', { email, password });
    return response.data;
  },

  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  getToken: () => {
    return localStorage.getItem('token');
  },

  setAuth: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },

  clearAuth: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};

export const projectsService = {
  getAll: async () => {
    const response = await api.get('/projects');
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/projects', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.patch(`/projects/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    await api.delete(`/projects/${id}`);
  },
};

export const mediaService = {
  getUploadUrl: async (projectId, filename, fileType) => {
    const response = await api.post('/media/upload-url', {
      projectId,
      filename,
      mimeType: fileType, // Backend expects 'mimeType' not 'fileType'
    });
    return response.data;
  },

  uploadToS3: async (presignedUrl, file, onProgress) => {
    await axios.put(presignedUrl, file, {
      headers: {
        'Content-Type': file.type,
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        if (onProgress) {
          onProgress(percentCompleted);
        }
      },
    });
  },

  getByProject: async (projectId) => {
    const response = await api.get(`/media?projectId=${projectId}`);
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/media/${id}`);
    return response.data;
  },

  getTranscript: async (mediaId) => {
    const response = await api.get(`/media/${mediaId}/transcript`);
    return response.data;
  },
};
