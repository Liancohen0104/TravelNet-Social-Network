import $ from "jquery";
import { BASE_URL, getAuthHeaders } from "./apiConfig";

const notificationApi = {
  // שליפת כל ההתראות של המשתמש
  getAllNotifications: (page = 1) =>
    $.ajax({
      url: `${BASE_URL}/notifications/all-notification?page=${page}`,
      method: "GET",
      headers: getAuthHeaders(),
    }),

  // שליפת התראות שלא נקראו 
  getUnreadNotifications: (page = 1, limit = 10) =>
    $.ajax({
      url: `${BASE_URL}/notifications/unread-notification?page=${page}&limit=${limit}`,
      method: "GET",
      headers: getAuthHeaders(),
    }),

  // סימון התראה בודדת כנקראה
  markAsRead: (notificationId) =>
    $.ajax({
      url: `${BASE_URL}/notifications/${notificationId}/read`,
      method: "PATCH",
      headers: getAuthHeaders(),
    }),

  // סימון כל ההתראות כנקראו
  markAllAsRead: () =>
    $.ajax({
      url: `${BASE_URL}/notifications/read-all`,
      method: "PATCH",
      headers: getAuthHeaders(),
    }),

  // מחיקת התראה
  deleteNotification: (notificationId) =>
    $.ajax({
      url: `${BASE_URL}/notifications/${notificationId}/delete-notification`,
      method: "DELETE",
      headers: getAuthHeaders(),
    }),
};

export default notificationApi;
