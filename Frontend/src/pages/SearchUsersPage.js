import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import usersApi from "../services/usersApi";
import "../css/SearchPage.css";

export default function SearchUsersPage() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const searchQuery = queryParams.get("q") || "";

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({
    fullName: "",
    location: "",
    minAge: "",
    maxAge: "",
  });

  const loaderRef = useRef(null);

  useEffect(() => {
    loadUsers(0, true);
  }, [searchQuery, filters]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        loadUsers(page + 1);
      }
    });
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => loaderRef.current && observer.unobserve(loaderRef.current);
  }, [loaderRef.current, hasMore, loading]);

  const loadUsers = async (pageToLoad, replace = false) => {
    setLoading(true);
    try {
      const searchParams = {
        skip: pageToLoad * 10,
        limit: 10,
      };

      // אם המשתמש מילא שדות פילטר – נעדיף אותם
      const anyFilterFilled =
        filters.fullName.trim() !== "" ||
        filters.location.trim() !== "" ||
        filters.minAge !== "" ||
        filters.maxAge !== "";

      if (anyFilterFilled) {
        searchParams.fullName = filters.fullName;
        searchParams.location = filters.location;
        searchParams.minAge = filters.minAge;
        searchParams.maxAge = filters.maxAge;
      } else if (searchQuery.trim() !== "") {
        searchParams.query = searchQuery.trim(); 
      }

      const res = await usersApi.searchUsers(searchParams);
      const newUsers = Array.isArray(res.users) ? res.users : res;

      if (replace) {
        setUsers(newUsers);
      } else {
        setUsers((prev) => [...prev, ...newUsers]);
      }

      setPage(pageToLoad);
      setHasMore(newUsers.length === 10);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="search-page">
      <div className="filter-bar filter-users">
        <div className="filter-column">
            <input
            type="text"
            placeholder="Name"
            name="fullName"
            value={filters.fullName}
            onChange={handleInputChange}
            />
            <input
            type="text"
            placeholder="City"
            name="location"
            value={filters.location}
            onChange={handleInputChange}
            />
        </div>

        <div className="filter-column">
            <input
            type="number"
            placeholder="Min Age"
            name="minAge"
            value={filters.minAge}
            onChange={handleInputChange}
            />
            <input
            type="number"
            placeholder="Max Age"
            name="maxAge"
            value={filters.maxAge}
            onChange={handleInputChange}
            />
        </div>
      </div>

      <div className="card-list">
        {users.map((user) => (
          <div
            key={user._id}
            className="card user-card horizontal-user-card"
            onClick={() => (window.location.href = `/profile/${user._id}`)}
          >
            <img
              src={user.imageURL}
              alt="avatar"
              className="avatar small-circle"
            />
            <div className="user-info">
              <div className="user-name">
                {user.fullName || `${user.firstName} ${user.lastName}`}
              </div>
              <div className="location">{user.location}</div>
              <div className="dob">
                {user.dateOfBirth &&
                  new Date(user.dateOfBirth).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {loading && <p>Loading...</p>}
      <div ref={loaderRef} style={{ height: 50 }} />
    </div>
  );
}
