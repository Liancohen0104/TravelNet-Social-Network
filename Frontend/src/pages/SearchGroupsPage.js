import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import groupApi from "../services/groupApi";
import "../css/SearchPage.css";
import { FaGlobeAmericas, FaLock } from "react-icons/fa";

export default function SearchGroupsPage() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const searchQuery = queryParams.get("q") || "";

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({
    name: "",
    description: "",
    isPublic: "",
  });

  const loaderRef = useRef(null);

  useEffect(() => {
    loadGroups(0, true);
  }, [searchQuery, filters]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        loadGroups(page + 1);
      }
    });
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => loaderRef.current && observer.unobserve(loaderRef.current);
  }, [loaderRef.current, hasMore, loading]);

  const loadGroups = async (pageToLoad, replace = false) => {
    setLoading(true);
    try {
      const searchParams = {
        skip: pageToLoad * 10,
        limit: 10,
      };

      if (filters.name || filters.description || filters.isPublic) {
        searchParams.name = filters.name;
        searchParams.description = filters.description;
        searchParams.isPublic = filters.isPublic;
      } else {
        searchParams.query = searchQuery;
      }

      const res = await groupApi.searchGroups(searchParams);
      const newGroups = Array.isArray(res.groups) ? res.groups : res;

      if (replace) {
        setGroups(newGroups);
      } else {
        setGroups((prev) => [...prev, ...newGroups]);
      }

      setPage(pageToLoad);
      setHasMore(newGroups.length === 10);
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
      <div className="filter-bar filter-groups">
        <div className="filter-top-row">
          <input
            type="text"
            placeholder="Group Name"
            name="name"
            value={filters.name}
            onChange={handleInputChange}
          />
          <input
            type="text"
            placeholder="Description"
            name="description"
            value={filters.description}
            onChange={handleInputChange}
          />
        </div>
        <div className="filter-bottom-row">
          <select
            name="isPublic"
            value={filters.isPublic}
            onChange={handleInputChange}
            className="is-public-select"
          >
            <option value="">All Types</option>
            <option value="true">Public Groups</option>
            <option value="false">Private Groups</option>
          </select>
        </div>
      </div>

      <div className="card-list">
        {groups.map((group) => (
          <div
            key={group._id}
            className="card user-card horizontal-user-card"
            onClick={() => (window.location.href = `/group/${group._id}`)}
          >
            <img
              src={group.imageURL}
              alt="group"
              className="avatar small-circle"
            />
            <div className="user-info">
              <div className="user-name">{group.name}</div>
              <div className="location">{group.description}</div>
              <div className="privacy">
                  {group.isPublic ? <FaGlobeAmericas /> : <FaLock />}
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
