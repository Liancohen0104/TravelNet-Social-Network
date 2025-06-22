import $ from "jquery";
import { BASE_URL, getAuthHeaders } from "./apiConfig";

const adminApi = {
  // שליפת כל המשתמשים שאינם אדמין
  getAllUsers: () =>
    $.ajax({
      url: `${BASE_URL}/admin/users`,
      method: "GET",
      headers: getAuthHeaders(),
    }),

  // מחיקת משתמש
  deleteUser: (userId) =>
    $.ajax({
      url: `${BASE_URL}/admin/users/${userId}`,
      method: "DELETE",
      headers: getAuthHeaders(),
    }),

  // שליפת כל הפוסטים 
  getAllPosts: (skip = 0, limit = 10) =>
    $.ajax({
      url: `${BASE_URL}/admin/posts?skip=${skip}&limit=${limit}`,
      method: "GET",
      headers: getAuthHeaders(),
    }),

  // מחיקת פוסט 
  deletePost: (postId) =>
    $.ajax({
      url: `${BASE_URL}/admin/posts/${postId}`,
      method: "DELETE",
      headers: getAuthHeaders(),
    }),

  // שליפת כל הקבוצות
  getAllGroups: () =>
    $.ajax({
      url: `${BASE_URL}/admin/all-groups`,
      method: "GET",
      headers: getAuthHeaders(),
    }),

  // מחיקת קבוצה 
  deleteGroupByAdmin: (groupId) =>
    $.ajax({
      url: `${BASE_URL}/admin/delete-group/${groupId}`,
      method: "DELETE",
      headers: getAuthHeaders(),
    }),
};

export default adminApi;
