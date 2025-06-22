import $ from "jquery";
import { BASE_URL, getAuthHeaders } from "./apiConfig";

const chatApi = {
  // שליחת הודעה בצ'אט
  sendMessage: (formData) =>
    $.ajax({
      url: `${BASE_URL}/chats/send`,
      method: "POST",
      headers: {
        ...getAuthHeaders(),
      },
      processData: false,
      contentType: false,
      data: formData,
    }),
};

export default chatApi;
