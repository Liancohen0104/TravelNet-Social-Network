import { useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../contexts/AuthContext";
import "../css/UserLayout.css";

export default function UserLayout() {
  const { user } = useAuth();
  const [activePanel, setActivePanel] = useState(null);

  return (
    <>
      <Navbar key={user?.username} role="user" onOpenPanel={setActivePanel} />

      <div className="layout-container">
        {/* צד שמאלי – נפתח לפי תפריט */}
        <div className="layout-left">
          {activePanel === "notifications" && (
            <div className="panel-box" id="notifications-panel"></div>
          )}
          {activePanel === "chat" && (
            <div className="panel-box" id="chat-panel"></div>
          )}
          {activePanel === "groups" && (
            <div className="panel-box" id="groups-panel"></div>
          )}
        </div>

        {/* מרכז - פיד*/}
        <div className="layout-main">
          <Outlet />
        </div>

       {/* צד ימין – חברים ובקשות */}
        <div className="layout-right">
          <div className="friend-requests-box" id="friend-requests-box"></div>
          <div className="online-friends-box" id="online-friends-box"></div>
        </div>
      </div>
    </>
  );
}
