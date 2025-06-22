import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function AdminLayout() {
  return (
    <>
      <Navbar role="admin" />
      <main><Outlet /></main>
    </>
  );
}