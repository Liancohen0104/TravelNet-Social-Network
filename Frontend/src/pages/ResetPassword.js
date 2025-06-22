import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import usersApi from "../services/usersApi";
import "../css/ResetPassword.css";

export default function ResetPassword() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const token = queryParams.get("token");
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await usersApi.resetPassword({ token, newPassword, confirmPassword });
      setMessage("Password reset successfully.");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      if (err.response?.responseJSON?.detail) {
        setError(err.response.responseJSON.detail);
      } else if (err.response?.responseJSON) {
        setError(JSON.stringify(err.response.responseJSON));
      } else if (err.message) {
        setError(err.message);
      } else {
        setError("Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-container">
      <div className="reset-box">
        <h2>Reset Your Password</h2>
        <p>Please enter your new password below.</p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          {error && <p className="error-text">{error}</p>}
          {message && <p className="success-text">{message}</p>}

          <div className="reset-btn-container">
            <button type="submit" disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
