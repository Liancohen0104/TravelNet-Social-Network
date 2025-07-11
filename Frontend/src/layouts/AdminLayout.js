import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import "../css/UserLayout.css";

export default function AdminLayout() {
  return (
    <>
      <Navbar role="admin" />
      <div className="layout-container">
        <div className="layout-main">
            <Outlet />
        </div>
      </div>
    </>
  );
}
