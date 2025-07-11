import axios from "axios";
import { BASE_URL, getAuthHeaders } from "./apiConfig";

const searchApi = {
  generalSearch: (query) =>
    axios.get(`${BASE_URL}/search/all-categories`, {
      headers: getAuthHeaders(),
      params: { q: query },
    }),
};

export default searchApi;
