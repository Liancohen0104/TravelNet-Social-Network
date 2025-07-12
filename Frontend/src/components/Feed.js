import { useEffect, useState, useRef, useCallback } from "react";
import usersApi from "../services/usersApi";
import groupApi from "../services/groupApi";
import PostCard from "./PostCard";
import CreatePostBox from "./CreatePostBox";
import { useAuth } from "../contexts/AuthContext";
import "../css/Feed.css";

export default function Feed({ userId = null, groupId = null, canCreatePost = true }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const observer = useRef(null);
  const [error, setError] = useState("");
  const { user: authUser } = useAuth();

  const handleError = (err) => {
    if (err.responseJSON?.error) {
      setError(err.responseJSON.error);
    } else if (err.response?.data?.error) {
      setError(err.response.data.error);
    } else if (err.message) {
      setError(err.message);
    } else {
      setError("Something went wrong");
    }
  };

  const loadPosts = async (pageToLoad = page + 1) => {
    if (loading || !hasMore) return;
    setLoading(true);

    try {
      let res;
      if (groupId) {
        res = await groupApi.getGroupPosts(groupId, (pageToLoad - 1) * 5, 5);
      } else if (userId) {
        res = await usersApi.getUserPosts(userId, (pageToLoad - 1) * 5, 5);
      } else {
        res = await usersApi.getPersonalFeed(pageToLoad, 5);
      }

      const enriched = res.map(post => ({
        ...post,
        isLiked: post.likes?.includes(authUser._id)
      }));

      if (res.length < 5) setHasMore(false);
      setPosts((prev) => [...prev, ...enriched]);
      setPage((prev) => prev + 1);
    } catch (err) {
      handleError(err);
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
      let res;
      if (groupId) {
        res = await groupApi.getGroupPosts(groupId, 0, 5);
      } else if (userId) {
        res = await usersApi.getUserPosts(userId, 0, 5);
      } else {
        res = await usersApi.getPersonalFeed(1, 5);
      }

      const enriched = res.map(post => ({
        ...post,
        isLiked: post.likes?.includes(authUser._id)
      }));

      setPosts(enriched);
      setPage(1);
      if (res.length < 5) setHasMore(false);
    } catch (err) {
      handleError(err);
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
    {canCreatePost && (authUser.role !== "admin") && (
      <CreatePostBox
        onPostCreated={reloadAllPosts}
        initialGroupId={groupId || null}
        isGroupContext={!!groupId}
      />
    )}

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
          isInsideGroup={!!groupId}
        />
      ))}

      {loading && <div className="loading-spinner">Loading...</div>}
      {!hasMore && !loading && <div className="no-more-posts">No more posts</div>}
      {error && <div className="error">{error}</div>}
    </div>
  );
}
