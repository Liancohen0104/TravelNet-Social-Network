import { useState } from "react";
import usersApi from "../services/usersApi";
import "../css/LoginPage.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await usersApi.login(email, password);
      localStorage.setItem("token", res.token);
      window.location.href = "/";
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
  };

  return (
    <div className="login-container">
      <div className="login-left">
        <h1 className="logo">TravelNet</h1>
        <p className="description">
          Travel Social Network helps you connect and share with the people in your life.
        </p>
      </div>

      <div className="login-right">
        <form className="login-form" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email *"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError("");
            }}
            required
          />

          <input
            type="password"
            placeholder="Password *"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(""); 
            }}
            required
          />

          {error && <p className="error-text">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Loading..." : "Log In"}
          </button>

          <a href="/forgot-password" className="forgot-link">
            Forgotten password?
          </a>

          <hr />

          <a href="/register" className="create-account-btn">
            Create New Account
          </a>
        </form>
      </div>
    </div>
  );
}
