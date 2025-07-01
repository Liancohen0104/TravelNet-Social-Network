import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import postApi from "../services/postApi";
import PostCard from "../components/PostCard";
import { useAuth } from "../contexts/AuthContext";
import "../css/Navbar.css";
import "../css/ViewSharedPost.css"; // נוסיף עיצוב מותאם

export default function ViewSharedPost() {
  const { uuid } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPost() {
      try {
        const res = await postApi.getSharedPost(uuid);
        setPost(res);
      } catch (err) {
        if (err.responseJSON?.error) {
            setError(err.responseJSON.error);
        } else if (err.response?.data?.error) {
            setError(err.response.data.error);
        } else if (err.message) {
            setError(err.message);
        } else {
            setError("Something went wrong");
        }
        } finally {
        setLoading(false);
        }
    }
    fetchPost();
  }, [uuid]);

  if (loading) {
    return <div className="shared-post-container">Loading...</div>;
  }

  if (error) {
    return <div className="shared-post-container error">{error}</div>;
  }

  return (
    <>
      {!user && (
        <>
          <header className="navbar">
            <div className="navbar-left">
              <div className="logo-container tooltip">
                <Link to="/">
                  <img src="/logoNavbar.png" alt="Logo" className="logo-image" />
                </Link>
              </div>
            </div>
            <div>
              <a className="login-button" href="/login">Login</a>
            </div>
          </header>

          <div className="shared-post-wrapper">
            <div className="shared-post-container">
              <PostCard post={post} />
            </div>
          </div>
        </>
      )}

      {user && (
        <div className="shared-post-container">
          <PostCard post={post} />
        </div>
      )}
    </>
  );
}
