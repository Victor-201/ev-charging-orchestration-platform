import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 60_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Set dynamic header on every request
apiClient.interceptors.request.use((config) => {
  if (config.headers) {
    config.headers['X-Kiosk-Key'] = import.meta.env.VITE_KIOSK_API_KEY;
  }
  return config;
});
