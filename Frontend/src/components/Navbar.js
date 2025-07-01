import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FaUsers,
  FaBell,
  FaFacebookMessenger,
  FaHome
} from "react-icons/fa";
import { FiLogOut } from "react-icons/fi";
import { MdAccountCircle } from "react-icons/md";
import { BiSearch } from "react-icons/bi";
import "../css/Navbar.css";
import "../css/Tooltip.css";
import { useAuth } from "../contexts/AuthContext";

export default function Navbar({ role, onOpenPanel, activePanel, unreadNotifications, unreadMessages }) {
  const { user } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isPanelActive = (panelName) => activePanel === panelName;

  const location = useLocation();
  const isHome = location.pathname === "/";

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const handleTogglePanel = (panelName) => {
    onOpenPanel((prev) => (prev === panelName ? null : panelName));
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
         {/* Home */}
          <div className="tooltip">
            <Link
              to="/"
              className={`nav-icon ${isHome ? "active" : ""}`}
              aria-label="Home"
            >
              <FaHome />
            </Link>
            <span className="tooltiptext">Home</span>
          </div>

          {/* Notifications */}
          <div className="tooltip">
            <button
              className={`nav-icon ${isPanelActive("notifications") ? "active" : ""}`}
              onClick={() => handleTogglePanel("notifications")}
              aria-label="Notifications"
            >
              <FaBell />
              {unreadNotifications > 0 && (
                <span className="notification-dot">{unreadNotifications}</span>
              )}
            </button>
            <span className="tooltiptext">Notifications</span>
          </div>

          {/* Chat */}
          <div className="tooltip">
            <button
              className={`nav-icon ${isPanelActive("chat") ? "active" : ""}`}
              onClick={() => handleTogglePanel("chat")}
              aria-label="Messenger"
            >
              <FaFacebookMessenger />
              {unreadMessages > 0 && (
                <span className="notification-dot">{unreadMessages}</span>
              )}
            </button>
            <span className="tooltiptext">Messenger</span>
          </div>


          {/* Groups */}
          <div className="tooltip">
            <button
              className={`nav-icon ${isPanelActive("groups") ? "active" : ""}`}
              onClick={() => handleTogglePanel("groups")}
              aria-label="Groups"
            >
              <FaUsers />
            </button>
            <span className="tooltiptext">Groups</span>
          </div>
        </nav>
      )}

      {/* Profile */}
      <div className="navbar-right">
        <div className="tooltip profile-wrapper" onClick={() => setDropdownOpen(!dropdownOpen)}>
          <img
            src={user?.imageURL || "/default-avatar.png"}
            alt={`${user?.firstName} ${user?.lastName}`}
            className="profile-pic"
          />
          <span className="tooltiptext">Profile</span>

          {dropdownOpen && (
            <div className="dropdown-menu">
              <div className="dropdown-header">
                <img src={user?.imageURL || "/default-avatar.png"} alt="Avatar" className="dropdown-avatar" />
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
      </div>
    </header>
  );
}
