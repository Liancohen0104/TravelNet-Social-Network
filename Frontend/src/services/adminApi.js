import $ from "jquery";
import { BASE_URL, getAuthHeaders } from "./apiConfig";

const adminApi = {
  // שליפת כל המשתמשים שאינם אדמין
  getAllUsers: (skip = 0, limit = 10) =>
  $.ajax({
    url: `${BASE_URL}/admin/users?skip=${skip}&limit=${limit}`,
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

  // שליפת כל הקבוצות
  getAllGroups: (skip = 0, limit = 10) =>
  $.ajax({
    url: `${BASE_URL}/admin/all-groups?skip=${skip}&limit=${limit}`,
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

  getGraphStats: () =>
  $.ajax({
    url: `${BASE_URL}/admin/graph-stats`,
    method: "GET",
    headers: getAuthHeaders(),
  }),

};

export default adminApi;
