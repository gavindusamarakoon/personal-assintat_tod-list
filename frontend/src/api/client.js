import axios from "axios";

// Point this at your backend. Defaults to local dev.
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const client = axios.create({ baseURL: BASE_URL });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default client;
