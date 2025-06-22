import $ from "jquery";
import { BASE_URL, getAuthHeaders } from "./apiConfig";

const usersApi = {
  // התחברות
  login: (email, password) =>
    $.ajax({
      url: `${BASE_URL}/users/login`,
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({ email, password }),
    }),

  // הרשמה
  register: (formData) =>
    $.ajax({
      url: `${BASE_URL}/users/register`,
      method: "POST",
      headers: getAuthHeaders(),
      processData: false,
      contentType: false,
      data: formData,
    }),

  // שליחת בקשה לאיפוס סיסמה
  forgotPassword: (email) =>
    $.ajax({
      url: `${BASE_URL}/users/forgot-password`,
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({ email }),
    }),

  // איפוס סיסמה בפועל
  resetPassword: ({ token, newPassword, confirmPassword }) =>
    $.ajax({
      url: `${BASE_URL}/users/reset-password`,
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({ token, newPassword, confirmPassword }),
    }),

  // שליפת המשתמש המחובר
  getCurrentUser: () =>
    $.ajax({
      url: `${BASE_URL}/users/me`,
      method: "GET",
      headers: getAuthHeaders(),
    }),

  // עדכון פרופיל
  updateProfile: (formData) =>
    $.ajax({
      url: `${BASE_URL}/users/update-profile`,
      method: "PUT",
      headers: getAuthHeaders(),
      processData: false,
      contentType: false,
      data: formData,
    }),

  // חיפוש משתמשים
  searchUsers: (params) =>
    $.ajax({
      url: `${BASE_URL}/users/search-users`,
      method: "GET",
      headers: getAuthHeaders(),
      data: params,
    }),

  // מחיקת המשתמש המחובר
  deleteMyAccount: () =>
    $.ajax({
      url: `${BASE_URL}/users/delete-me`,
      method: "DELETE",
      headers: getAuthHeaders(),
    }),

  // קבלת הפיד האישי
  getPersonalFeed: (page = 1, limit = 10) =>
    $.ajax({
      url: `${BASE_URL}/users/feed?page=${page}&limit=${limit}`,
      method: "GET",
      headers: getAuthHeaders(),
    }),

  // שליפת פוסטים של משתמש
  getUserPosts: (userId, skip = 0, limit = 10) =>
    $.ajax({
      url: `${BASE_URL}/users/${userId}/user-posts?skip=${skip}&limit=${limit}`,
      method: "GET",
      headers: getAuthHeaders(),
    }),

  // שמירת/הסרת פוסט שמור
  toggleSavePost: (postId) =>
    $.ajax({
      url: `${BASE_URL}/users/save-post/${postId}`,
      method: "POST",
      headers: getAuthHeaders(),
    }),

  // שליפת פוסטים שמורים
  getSavedPosts: (skip = 0, limit = 10) =>
    $.ajax({
      url: `${BASE_URL}/users/saved-posts?skip=${skip}&limit=${limit}`,
      method: "GET",
      headers: getAuthHeaders(),
    }),

  // שליחת בקשת חברות
  sendFriendRequest: (targetUserId) =>
    $.ajax({
      url: `${BASE_URL}/users/send-friend-request/${targetUserId}`,
      method: "POST",
      headers: getAuthHeaders(),
    }),

  // אישור בקשת חברות
  approveFriendRequest: (senderId) =>
    $.ajax({
      url: `${BASE_URL}/users/approve-friend-request/${senderId}`,
      method: "POST",
      headers: getAuthHeaders(),
    }),

  // דחיית בקשת חברות
  rejectFriendRequest: (senderId) =>
    $.ajax({
      url: `${BASE_URL}/users/reject-friend-request/${senderId}`,
      method: "DELETE",
      headers: getAuthHeaders(),
    }),

  // הסרת חבר
  unfriend: (targetUserId) =>
    $.ajax({
      url: `${BASE_URL}/users/unfriend/${targetUserId}`,
      method: "POST",
      headers: getAuthHeaders(),
    }),

  // בקשות חברות ממתינות
  getPendingRequests: () =>
    $.ajax({
      url: `${BASE_URL}/users/pending-requests`,
      method: "GET",
      headers: getAuthHeaders(),
    }),

  // קבוצות שאני חבר בהן
  getMyGroups: (skip = 0, limit = 10) =>
    $.ajax({
      url: `${BASE_URL}/users/my-groups?skip=${skip}&limit=${limit}`,
      method: "GET",
      headers: getAuthHeaders(),
    }),

  // בדיקה האם המשתמש עשה לפוסט לייק
  isPostLiked: (postId) =>
  $.ajax({
    url: `${BASE_URL}/users/likes/${postId}`,
    method: "GET",
    headers: getAuthHeaders(),
  }),

  // שליפת כל החברים של המשתמש המחובר
  getMyFriends: () =>
  $.ajax({
    url: `${BASE_URL}/users/my-friends`,
    method: "GET",
    headers: getAuthHeaders(),
  }),

};

export default usersApi;
