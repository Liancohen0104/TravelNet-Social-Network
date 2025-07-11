import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import postApi from "../services/postApi";
import PostCard from "../components/PostCard";
import "../css/SearchPage.css";

export default function SearchPostsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const searchQuery = queryParams.get("q") || "";

  const { user: authUser } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const [filters, setFilters] = useState({
    text: "",
    authorName: "",
    fromDate: "",
    toDate: "",
  });

  const loaderRef = useRef(null);

  useEffect(() => {
    loadPosts(0, true);
  }, [filters, searchQuery]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        loadPosts(page + 1);
      }
    });
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => loaderRef.current && observer.unobserve(loaderRef.current);
  }, [loaderRef.current, hasMore, loading]);

  const loadPosts = async (pageToLoad, replace = false) => {
    setLoading(true);
    try {
      const searchParams = {
        skip: pageToLoad * 10,
        limit: 10,
      };

      const isFilterActive = Object.values(filters).some((val) => val);

      if (isFilterActive) {
        if (filters.text) searchParams.text = filters.text;
        if (filters.authorName) searchParams.authorName = filters.authorName;
        if (filters.fromDate) searchParams.fromDate = filters.fromDate;
        if (filters.toDate) searchParams.toDate = filters.toDate;
      } else {
        // כשאין שום פילטר – משתמשים ב-query מה-URL
        if (searchQuery) {
          searchParams.query = searchQuery;
        }
      }

      const res = await postApi.searchPosts(searchParams);
      const enrichedPosts = (res || []).map((post) => ({
        ...post,
        isLiked: post.likes?.includes(authUser?._id),
      }));

      if (replace) {
        setPosts(enrichedPosts);
      } else {
        setPosts((prev) => [...prev, ...enrichedPosts]);
      }

      setPage(pageToLoad);
      setHasMore(enrichedPosts.length === 10);
    } catch (err) {
      console.error("Search posts failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const updatePostInState = (updatedPost) => {
    setPosts((prev) =>
      prev.map((p) => (p._id === updatedPost._id ? updatedPost : p))
    );
  };

  return (
    <div className="search-page">
      <div className="filter-bar filter-posts">
        <div className="filter-top-row">
          <input
            type="text"
            placeholder="Content"
            name="text"
            value={filters.text}
            onChange={handleInputChange}
          />
          <input
            type="text"
            placeholder="Author Name"
            name="authorName"
            value={filters.authorName}
            onChange={handleInputChange}
          />
        </div>

        <div className="date-range-wrapper">
          <div className="date-input">
            <label htmlFor="fromDate">From date</label>
            <input
              type="date"
              name="fromDate"
              id="fromDate"
              value={filters.fromDate}
              onChange={handleInputChange}
            />
          </div>
          <div className="date-input">
            <label htmlFor="toDate">To date</label>
            <input
              type="date"
              name="toDate"
              id="toDate"
              value={filters.toDate}
              onChange={handleInputChange}
            />
          </div>
        </div>
      </div>

      <div className="post-list">
        {posts.map((post) => (
          <PostCard
            key={post._id}
            post={post}
            onPostUpdated={updatePostInState}
          />
        ))}
      </div>

      {loading && <p>Loading...</p>}
      <div ref={loaderRef} style={{ height: 50 }} />
    </div>
  );
}
