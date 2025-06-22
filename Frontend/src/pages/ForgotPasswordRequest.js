import { useState } from "react";
import usersApi from "../services/usersApi.js";
import "../css/ForgotPasswordRequest.css";

export default function ForgotPasswordRequest() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      await usersApi.forgotPassword(email);
      setMessage("Reset link sent to your email.");
    } catch (err) {
      if (err.response?.responseJSON?.detail) {
        setError(err.response.responseJSON.detail);
      } else if (err.response?.responseJSON) {
        setError(JSON.stringify(err.response.responseJSON));
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
    <div className="forgot-container">
      <div className="forgot-box">
        <h2>Find Your Account</h2>
        <p>Please enter your email address to search for your account.</p>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {error && <p className="error-text">{error}</p>}
          {message && <p className="success-text">{message}</p>}

          <div className="btn-group">
            <button type="button" onClick={() => (window.location.href = "/login")}>Cancel</button>
            <button type="submit" disabled={loading}>
              {loading ? "Sending..." : "Search"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
