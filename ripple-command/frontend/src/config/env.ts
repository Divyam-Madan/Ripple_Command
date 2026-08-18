export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api",
  wsUrl: import.meta.env.VITE_WS_URL ?? "ws://localhost:8000/ws",
  demoMode: (import.meta.env.VITE_DEMO_MODE ?? "true") === "true",
  enableMap: (import.meta.env.VITE_ENABLE_MAP ?? "false") === "true",
  enableAI: (import.meta.env.VITE_ENABLE_AI ?? "true") === "true",
};
