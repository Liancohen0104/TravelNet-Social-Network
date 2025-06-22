import $ from "jquery";
import { BASE_URL, getAuthHeaders } from "./apiConfig";

const postApi = {
  // יצירת פוסט
  createPost: (formData) =>
    $.ajax({
      url: `${BASE_URL}/posts/create-post`,
      method: "POST",
      headers: getAuthHeaders(),
      processData: false,
      contentType: false,
      data: formData,
    }),

  // עדכון פוסט
  updatePost: (id, formData) =>
    $.ajax({
      url: `${BASE_URL}/posts/${id}/update-post`,
      method: "PUT",
      headers: getAuthHeaders(),
      processData: false,
      contentType: false,
      data: formData,
    }),

  // מחיקת פוסט
  deletePost: (id) =>
    $.ajax({
      url: `${BASE_URL}/posts/${id}/delete-post`,
      method: "DELETE",
      headers: getAuthHeaders(),
    }),

  // שליפת פוסט לפי מזהה
  getPostById: (id) =>
    $.ajax({
      url: `${BASE_URL}/posts/${id}`,
      method: "GET",
      headers: getAuthHeaders(),
    }),

  // חיפוש פוסטים לפי תוכן, מחבר או תאריך
  searchPosts: (params) =>
    $.ajax({
      url: `${BASE_URL}/posts/search-post`,
      method: "GET",
      headers: getAuthHeaders(),
      data: params,
    }),

  // הוספה או הסרה של לייק לפוסט
  toggleLike: (id) =>
    $.ajax({
      url: `${BASE_URL}/posts/${id}/like`,
      method: "POST",
      headers: getAuthHeaders(),
    }),

  // הוספת תגובה לפוסט
  addComment: (id, text) =>
    $.ajax({
      url: `${BASE_URL}/posts/${id}/comment`,
      method: "POST",
      headers: getAuthHeaders(),
      contentType: "application/json",
      data: JSON.stringify({ text }),
    }),

  // מחיקת תגובה מתוך פוסט 
  deleteComment: (postId, commentId) =>
    $.ajax({
      url: `${BASE_URL}/posts/${postId}/comment/${commentId}`,
      method: "DELETE",
      headers: getAuthHeaders(),
    }),

  // יצירת קישור לשיתוף פוסט
  getShareLink: (id) =>
    $.ajax({
      url: `${BASE_URL}/posts/${id}/share-link`,
      method: "GET",
      headers: getAuthHeaders(),
    }),

  // שליפת פוסט משותף 
  getSharedPost: (id) =>
    $.ajax({
      url: `${BASE_URL}/posts/${id}/view-shared-post`,
      method: "GET",
      headers: getAuthHeaders(),
    }),

  // הפיכת פוסט לציבורי
  makePublic: (id) =>
    $.ajax({
      url: `${BASE_URL}/posts/${id}/make-public`,
      method: "PUT",
      headers: getAuthHeaders(),
    }),

  // הפיכת פוסט לפרטי
  makePrivate: (id) =>
    $.ajax({
      url: `${BASE_URL}/posts/${id}/make-private`,
      method: "PUT",
      headers: getAuthHeaders(),
    }),

  // שיתוף פוסט לפיד אישי או לקבוצה
  sharePostToFeed: (id, data) =>
    $.ajax({
      url: `${BASE_URL}/posts/${id}/share-to-feed`,
      method: "POST",
      headers: getAuthHeaders(),
      contentType: "application/json",
      data: JSON.stringify(data),
    }),
};

export default postApi;
