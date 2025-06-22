import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FaHome,
  FaUsers,
  FaBell,
  FaMoon,
  FaFacebookMessenger,
} from "react-icons/fa";
import { FiLogOut } from "react-icons/fi";
import { MdAccountCircle } from "react-icons/md";
import { BiSearch } from "react-icons/bi";
import "../css/Navbar.css";
import "../css/Tooltip.css";
import { useAuth } from "../contexts/AuthContext";

export default function Navbar({ role, notificationsCount = 0 }) {
  const { user } = useAuth();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("darkMode") === "true";
  });

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
    localStorage.setItem("darkMode", darkMode);
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);
  const isActive = (path) => location.pathname.startsWith(path);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        <div className="logo-container tooltip">
          <Link to="/">
            <img src="/logoNavbar.png" alt="Logo" className="logo-image" />
          </Link>
        </div>

        <div className="search-wrapper tooltip">
          <BiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search ..."
            className="search-input"
            aria-label="Search"
          />
        </div>
      </div>

      {role === "user" && (
        <nav className="navbar-center" role="navigation" aria-label="Main Nav">
          <div className="tooltip">
            <Link
              to="/feed"
              className={`nav-icon ${isActive("/feed") ? "active" : ""}`}
              aria-label="Feed"
            >
              <FaHome />
            </Link>
            <span className="tooltiptext">Feed</span>
          </div>

          <div className="tooltip">
            <Link
              to="/messenger"
              className={`nav-icon ${isActive("/messenger") ? "active" : ""}`}
              aria-label="Messenger"
            >
              <FaFacebookMessenger />
            </Link>
            <span className="tooltiptext">Messenger</span>
          </div>

          <div className="tooltip">
            <Link
              to="/groups"
              className={`nav-icon ${isActive("/groups") ? "active" : ""}`}
              aria-label="Groups"
            >
              <FaUsers />
            </Link>
            <span className="tooltiptext">Groups</span>
          </div>

          <div className="tooltip">
            <Link
              to="/notifications"
              className={`nav-icon ${isActive("/notifications") ? "active" : ""}`}
              aria-label="Notifications"
            >
              <FaBell />
              {notificationsCount > 0 && (
                <span className="notification-dot">{notificationsCount}</span>
              )}
            </Link>
            <span className="tooltiptext">Notifications</span>
          </div>
        </nav>
      )}

      <div className="navbar-right">
        <div className="tooltip profile-wrapper" onClick={() => setDropdownOpen(!dropdownOpen)}>
          <img
            src={user?.imageURL}
            alt={`${user?.firstName} ${user?.lastName}`}
            className="profile-pic"
          />
          <span className="tooltiptext">Profile</span>

          {dropdownOpen && (
            <div className="dropdown-menu">
              <div className="dropdown-header">
                <img src={user?.imageURL} alt="Avatar" className="dropdown-avatar" />
                <span className="dropdown-name">
                  {user?.firstName} {user?.lastName}
                </span>
              </div>

              <Link to="/profile" className="dropdown-item">
                <MdAccountCircle /> Profile
              </Link>

              <button className="dropdown-item" onClick={handleLogout}>
                <FiLogOut /> Logout
              </button>
            </div>
          )}
        </div>

        <div className="tooltip">
          <button
            className="circle-btn theme-toggle"
            onClick={toggleDarkMode}
            aria-label="Toggle dark mode"
          >
            <FaMoon />
          </button>
          <span className="tooltiptext">Dark Mode</span>
        </div>
      </div>
    </header>
  );
}
