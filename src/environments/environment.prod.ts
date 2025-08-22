export const environment = {
  production: true,
  apiUrl: '/api',  // This will be relative to the current domain in production
  wsUrl: typeof window !== 'undefined' ? `wss://${window.location.host}` : ''
}; 