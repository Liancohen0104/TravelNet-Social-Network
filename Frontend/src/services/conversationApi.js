import $ from "jquery";
import { BASE_URL, getAuthHeaders } from "./apiConfig";

const conversationApi = {
  // שליפת כל השיחות של המשתמש 
  getConversations: (page = 1, pageSize = 20) =>
    $.ajax({
      url: `${BASE_URL}/conversations/all-conversations?page=${page}&pageSize=${pageSize}`,
      method: "GET",
      headers: getAuthHeaders(),
    }),


  // יצירת שיחה חדשה או שליפת קיימת
  getOrCreateConversation: (friendId) =>
    $.ajax({
      url: `${BASE_URL}/conversations/start`,
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ friendId }),
    }),

  // שליפת כל ההודעות בשיחה 
  getMessagesByConversation: (conversationId, page = 1, pageSize = 20) =>
    $.ajax({
      url: `${BASE_URL}/conversations/${conversationId}/messages?page=${page}&pageSize=${pageSize}`,
      method: "GET",
      headers: getAuthHeaders(),
    }),

  // סימון כל ההודעות הנכנסות כנקראו בשיחה מסוימת
  markMessagesAsRead: (conversationId) =>
    $.ajax({
      url: `${BASE_URL}/conversations/${conversationId}/mark-read`,
      method: "POST",
      headers: getAuthHeaders(),
    }),
  
  // סימון על השיחות כנקראו
  markAllMessagesAsRead: () =>
  $.ajax({
    url: `${BASE_URL}/conversations/mark-all-read`,
    method: "POST",
    headers: getAuthHeaders(),
  }),

  // מחיקת כל השיחות
  deleteAllConversations: () =>
  $.ajax({
    url: `${BASE_URL}/conversations/delete-all`,
    method: "POST",
    headers: getAuthHeaders(),
  }),

  // מחיקת שיחה
  deleteConversation: (conversationId) =>
  $.ajax({
    url: `${BASE_URL}/conversations/${conversationId}`,
    method: "DELETE",
    headers: getAuthHeaders(),
  }),

};
  
export default conversationApi;
