export const BASE_URL = "http://localhost:4000/api";

// מחזיר כותרות אם קיי ם טוקן
export const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};
