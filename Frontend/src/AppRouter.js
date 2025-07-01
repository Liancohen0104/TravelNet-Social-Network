import { Routes, Route } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";

// אורח
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordRequest from "./pages/ForgotPasswordRequest";
import ResetPassword from "./pages/ResetPassword";

// משתמש
import UserLayout from "./layouts/UserLayout";
import Feed from "./components/Feed";
import ProfilePage from "./pages/ProfilePage";
import GroupProfilePage from "./pages/GroupProfilePage";

// אדמין
// import AdminLayout from "./layouts/AdminLayout";
// import AdminDashboard from "./pages/AdminDashboard";
// import UserManagement from "./pages/UserManagement";
// import PostManagement from "./pages/PostManagement";

// כללי
import NotFound from "./pages/NotFound";
import ViewSharedPost from './pages/ViewSharedPost';

export default function AppRouter() {
  const { user } = useAuth();

  return (
    <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
        
    {/* אורח */}
    {!user && (
        <>
        <Route index element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordRequest />} />
        <Route path="/view-shared-post/:uuid" element={<ViewSharedPost />} />
        <Route path="*" element={<NotFound />} />
        </>
    )}

    {/* משתמש */}
    {user && !user.is_admin && (
        <>
        <Route path="/" element={<UserLayout />}>
          <Route index element={<Feed />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="profile/:id" element={<ProfilePage />} />
          <Route path="group/:groupId" element={<GroupProfilePage />} />
          <Route path="view-shared-post/:uuid" element={<ViewSharedPost />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        </>
    )}

    {/* אדמין */}
    {user?.is_admin && (
        <> {/* 
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/posts" element={<PostManagement />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<NotFound />} /> 
        </Route> */}
        </>
    )}
    </Routes>
  );
}
