import { useEffect, useState, useRef, useCallback } from "react";
import usersApi from "../services/usersApi";
import PostCard from "./PostCard";
import CreatePostBox from "./CreatePostBox";
import "../css/Feed.css";

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const observer = useRef(null);

  const loadPosts = async (pageToLoad = page + 1) => {
    if (loading || !hasMore) return;
    setLoading(true);

    try {
      const res = await usersApi.getPersonalFeed(pageToLoad, 5);
      if (res.length < 5) {
        setHasMore(false);
      }
      setPosts((prev) => [...prev, ...res]);
      setPage((prev) => prev + 1);
    } catch (err) {
      console.error("Error loading feed:", err);
    } finally {
      setLoading(false);
    }
  };

  const reloadAllPosts = async () => {
    if (observer.current) observer.current.disconnect();
    setLoading(true);
    setPosts([]);
    setPage(0);
    setHasMore(true);

    try {
      const res = await usersApi.getPersonalFeed(1, 5);
      setPosts(res);
      setPage(1);
      if (res.length < 5) setHasMore(false);
    } catch (err) {
      console.error("Error reloading feed:", err);
    } finally {
      setLoading(false);
    }
  };

  const lastPostRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadPosts();
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );

  useEffect(() => {
    reloadAllPosts();
  }, []);

  return (
    <div className="post-list-box">
      <CreatePostBox onPostCreated={reloadAllPosts} />

      {posts.map((post, index) => (
        <PostCard
          key={post._id}
          post={post}
          ref={index === posts.length - 1 ? lastPostRef : null}
          onPostDeleted={(id) =>
            setPosts((prev) => prev.filter((p) => p._id !== id))
          }
          onPostUpdated={(updatedPost) =>
            setPosts((prev) =>
              updatedPost.isPublic
                ? prev.map((p) => (p._id === updatedPost._id ? updatedPost : p))
                : prev.filter((p) => p._id !== updatedPost._id)
            )
          }
        />
      ))}

      {loading && <div className="loading-spinner">Loading...</div>}
      {!hasMore && !loading && <div className="no-more-posts">No more posts</div>}
    </div>
  );
}
