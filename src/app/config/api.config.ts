import { environment } from '../../environments/environment';

const getBaseUrl = () => {
  // In production (Vercel), API requests will be proxied to /api
  // In development, we use the full URL with port
  if (environment.production) {
    return '/api';
  }
  return 'http://localhost:4001';
};

export const API_CONFIG = {
  baseUrl: getBaseUrl(),
  endpoints: {
    solutions: '/solutions',  // Changed from /solution to /solutions for RESTful convention
    files: '/files'
  }
}; 