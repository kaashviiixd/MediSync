import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  googleAuth: (data) => api.post('/auth/google', data),
};

export const doctorApi = {
  getDoctors: () => api.get('/doctors'),
  login: (data) => api.post('/doctor/login', data),
  getAppointments: (doctorId) => api.get(`/appointments/doctor/${doctorId}`),
  updateProfile: (data) => api.patch('/doctor/profile', data),
};

export const appointmentApi = {
  book: (data) => api.post('/appointments/book', data),
  getPatientAppointments: (patientId) => api.get(`/appointments/patient/${patientId}`),
  updateStatus: (id, status) => api.patch(`/appointments/${id}/status`, { status }),
  reschedule: (id, data) => api.patch(`/appointments/${id}/reschedule`, data),
};

export const chatApi = {
  saveMessage: (data) => api.post('/chat', data),
};

export const recordApi = {
  getPatientDocuments: (patientId) => api.get(`/documents/patient/${patientId}`),
  uploadDocument: (formData) => api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
};

export const profileApi = {
  getProfiles: (userId) => api.get(`/profiles/${userId}`),
  syncProfile: (data) => api.post('/profiles', data),
};

export const notificationApi = {
  getNotifications: (userId) => api.get(`/notifications/${userId}`),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: (userId) => api.patch(`/notifications/read-all/${userId}`),
};

export const meetingApi = {
  start: (data) => api.post('/meetings/start', data),
  join: (data) => api.post('/meetings/join', data),
  getDetails: (roomId) => api.get(`/meetings/details/${roomId}`),
  sendPrescription: (data) => api.post('/meetings/prescription', data),
};

export default api;
