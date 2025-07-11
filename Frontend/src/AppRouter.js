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
import SearchPage from "./pages/SearchPage";
import SearchUsersPage from "./pages/SearchUsersPage";
import SearchGroupsPage from "./pages/SearchGroupsPage";
import SearchPostsPage from "./pages/SearchPostsPage";

// אדמין
import AdminLayout from "./layouts/AdminLayout";
import UsersManagement from "./pages/UsersManagement";
import GroupsManagement from "./pages/GroupsManagement";
import GraphsPage from "./pages/GraphsPage";

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
    {user && user.role !== "admin" && (
        <>
        <Route path="/" element={<UserLayout />}>
          <Route index element={<Feed />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="profile/:id" element={<ProfilePage />} />
          <Route path="group/:groupId" element={<GroupProfilePage />} />
          <Route path="view-shared-post/:uuid" element={<ViewSharedPost />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/search/users" element={<SearchUsersPage />} />
          <Route path="/search/groups" element={<SearchGroupsPage />} />
          <Route path="/search/posts" element={<SearchPostsPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        </>
    )}

    {/* אדמין */}
    {user?.role === "admin" && (
        <> 
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<UsersManagement />} />
          <Route path="/users" element={<UsersManagement />} />
          <Route path="/groups" element={<GroupsManagement />} />
          <Route path="/graphs" element={<GraphsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="profile/:id" element={<ProfilePage />} />
          <Route path="group/:groupId" element={<GroupProfilePage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="/search/users" element={<SearchUsersPage />} />
          <Route path="/search/groups" element={<SearchGroupsPage />} />
          <Route path="/search/posts" element={<SearchPostsPage />} />
          <Route path="*" element={<NotFound />} /> 
        </Route> 
        </>
    )}
    </Routes>
  );
}
