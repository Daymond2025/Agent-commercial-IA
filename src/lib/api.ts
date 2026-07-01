import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const BACKEND_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

const api = axios.create({
  baseURL: API_BASE,
});

// Certaines images enregistrées avant correctif backend ont une URL relative
// (ex: "/storage/…") qui pointe alors vers l'origine du frontend au lieu du backend.
export function mediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  return url.startsWith('/') ? `${BACKEND_ORIGIN}${url}` : url;
}

api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      Cookies.remove('token');
      Cookies.remove('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;