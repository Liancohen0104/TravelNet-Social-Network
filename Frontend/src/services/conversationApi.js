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
};

export default conversationApi;
