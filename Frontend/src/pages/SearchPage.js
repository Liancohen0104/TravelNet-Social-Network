import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import searchApi from "../services/searchApi";
import PostCard from "../components/PostCard";
import { FaGlobeAmericas, FaLock } from "react-icons/fa";
import "../css/SearchPage.css";

export default function SearchPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [posts, setPosts] = useState([]);
  const queryParams = new URLSearchParams(location.search);
  const query = queryParams.get("q");

  const [results, setResults] = useState({ users: [], groups: [], posts: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    searchApi
        .generalSearch(query)
        .then((res) => {
            const data = res.data;

        const enrichedPosts = (data.posts || []).map((post) => ({
            ...post,
            isLiked: post.likes?.includes(authUser._id),
        }));

        setResults({
            users: data.users || [],
            groups: data.groups || [],
            posts: [], 
        });
        setPosts(enrichedPosts);
        })
        .catch((err) => console.error("Search error:", err))
        .finally(() => setLoading(false));
  }, [query]);

  const handleShowAll = (type) => {
    navigate(`/search/${type}?q=${query}`);
  };

  const updatePostInState = (updatedPost) => {
    setPosts((prev) =>
        prev.map((p) => (p._id === updatedPost._id ? updatedPost : p))
    );
  };

  return (
    <div className="search-page">
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="search-results">
          {/* Users */}
          <div className="search-section">
            <h3>Users</h3>
            {results.users?.length === 0 ? (
              <p>No users found</p>
            ) : (
              <>
                <div className="card-list">
                  {results.users.map((user) => (
                    <Link
                        to={`/profile/${user._id}`}
                        key={user._id}
                        className="card user-card horizontal-user-card"
                        >
                        <img
                            src={user.imageURL}
                            alt="avatar"
                            className="avatar small-circle"
                        />
                        <div className="user-info">
                            <div className="user-name">{user.fullName || `${user.firstName} ${user.lastName}`}</div>
                            <div className="location">{user.location}</div>
                            <div className="dob">
                            {user.dateOfBirth && new Date(user.dateOfBirth).toLocaleDateString()}
                            </div>
                        </div>
                    </Link>
                  ))}
                </div>
                <div className="show-all-wrapper">
                  <button className="show-all-button" onClick={() => handleShowAll("users")}>Show All</button>
                </div>
              </>
            )}
          </div>

          {/* Groups */}
          <div className="search-section">
            <h3>Groups</h3>
            {results.groups?.length === 0 ? (
              <p>No groups found</p>
            ) : (
              <>
                <div className="card-list">
                  {results.groups.map((group) => (
                    <Link
                      to={`/group/${group._id}`}
                      key={group._id}
                      className="card user-card horizontal-user-card"
                    >
                      <img
                        src={group.imageURL}
                        alt="group"
                        className="avatar small-circle"
                      />
                      <div className="user-info">
                        <div className="user-name">{group.name}</div>
                        <div className="desc">{group.description}</div>
                        <div className="privacy">
                            {group.isPublic ? <FaGlobeAmericas /> : <FaLock />}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="show-all-wrapper">
                  <button className="show-all-button" onClick={() => handleShowAll("groups")}>Show All</button>
                </div>
              </>
            )}
          </div>

          {/* Posts */}
          <div className="search-section">
            <h3>Posts</h3>
            {posts?.length === 0 ? (
              <p>No posts found</p>
            ) : (
              <>
                <div className="post-list">
                  {posts.map((post) => (
                    <PostCard
                        key={post._id}
                        post={post}
                        onPostUpdated={updatePostInState}
                    />
                  ))}
                </div>
                <div className="show-all-wrapper">
                  <button className="show-all-button" onClick={() => handleShowAll("posts")}>Show All</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
