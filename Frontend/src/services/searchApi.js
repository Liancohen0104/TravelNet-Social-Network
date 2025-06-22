// services/searchApi.js
import $ from "jquery";
import { BASE_URL, getAuthHeaders } from "./apiConfig";

const searchApi = {
  // חיפוש כללי – מחזיר משתמשים, קבוצות ופוסטים
  generalSearch: (query) =>
    $.ajax({
      url: `${BASE_URL}/search/all-categories?q=${encodeURIComponent(query)}`,
      method: "GET",
      headers: getAuthHeaders(),
    }),
};

export default searchApi;
