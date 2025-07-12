import $ from "jquery";
import { BASE_URL, getAuthHeaders } from "./apiConfig";

const groupApi = {
  // יצירת קבוצה חדשה
  createGroup: (formData) =>
    $.ajax({
      url: `${BASE_URL}/groups/create-group`,
      method: "POST",
      headers: getAuthHeaders(),
      processData: false,
      contentType: false,
      data: formData,
    }),

  // עדכון פרטי קבוצה
  updateGroup: (groupId, formData) =>
    $.ajax({
      url: `${BASE_URL}/groups/${groupId}/update-group`,
      method: "PUT",
      headers: getAuthHeaders(),
      processData: false,
      contentType: false,
      data: formData,
    }),

  // מחיקת קבוצה
  deleteGroup: (groupId) =>
    $.ajax({
      url: `${BASE_URL}/groups/${groupId}/delete-group`,
      method: "DELETE",
      headers: getAuthHeaders(),
    }),

  // שליחת בקשת הצטרפות לקבוצה פרטית
  requestToJoinGroup: (groupId) =>
    $.ajax({
      url: `${BASE_URL}/groups/${groupId}/join-request`,
      method: "POST",
      headers: getAuthHeaders(),
    }),

  // אישור בקשת הצטרפות ע"י יוצר הקבוצה
  approveJoinRequest: (groupId, userId) =>
    $.ajax({
      url: `${BASE_URL}/groups/${groupId}/approve-join-request/${userId}`,
      method: "POST",
      headers: getAuthHeaders(),
    }),

  // סירוב/מחיקת בקשת הצטרפות
  rejectJoinRequest: (groupId, userId) =>
    $.ajax({
      url: `${BASE_URL}/groups/${groupId}/reject-join-request/${userId}`,
      method: "DELETE",
      headers: getAuthHeaders(),
    }),

  // הצטרפות מיידית לקבוצה ציבורית
  joinPublicGroup: (groupId) =>
    $.ajax({
      url: `${BASE_URL}/groups/${groupId}/join`,
      method: "POST",
      headers: getAuthHeaders(),
    }),

  // עזיבת קבוצה
  leaveGroup: (groupId) =>
    $.ajax({
      url: `${BASE_URL}/groups/${groupId}/leave`,
      method: "POST",
      headers: getAuthHeaders(),
    }),

  // קבלת פרטי קבוצה
  getGroupDetails: (groupId) =>
    $.ajax({
      url: `${BASE_URL}/groups/${groupId}/me`,
      method: "GET",
      headers: getAuthHeaders(),
    }),

  // קבלת חברי קבוצה
  getGroupMembers: (groupId) =>
    $.ajax({
      url: `${BASE_URL}/groups/${groupId}/members`,
      method: "GET",
      headers: getAuthHeaders(),
    }),

  // שליפת הפוסטים של הקבוצה
  getGroupPosts: (groupId, skip = 0, limit = 10) =>
    $.ajax({
      url: `${BASE_URL}/groups/${groupId}/posts`,
      method: "GET",
      headers: getAuthHeaders(),
      data: { skip, limit },
    }),

  // חיפוש קבוצות לפי שם, תיאור וסוג (ציבורי/פרטי)
  searchGroups: ({ query, name, description, isPublic, skip = 0, limit = 10 }) =>
  $.ajax({
    url: `${BASE_URL}/groups/search-groups`,
    method: "GET",
    headers: getAuthHeaders(),
    data: { query, name, description, isPublic, skip, limit },
  }),

  // הסרת משתמש מהקבוצה ע"י היוצר
  removeMemberFromGroup: (groupId, userId) =>
    $.ajax({
      url: `${BASE_URL}/groups/${groupId}/remove-member/${userId}`,
      method: "DELETE",
      headers: getAuthHeaders(),
  }),

};

export default groupApi;
