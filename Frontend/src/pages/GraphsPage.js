import { useEffect, useState } from "react";
import adminApi from "../services/adminApi";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "../css/GraphsPage.css";

export default function GraphsPage() {
  const [data, setData] = useState({});
  const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088FE"];

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await adminApi.getGraphStats();
        setData(res);
      } catch (err) {
        console.error("Failed to fetch graph data:", err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="graphs-page">
      <h2>Statistics</h2>

      <div className="graph-card">
        <h3>Posts per Month</h3>
        <p className="graph-description">Shows how many posts were created each month.</p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.postsPerMonth}>
            <XAxis dataKey="month" />
            <YAxis />
            <CartesianGrid strokeDasharray="3 3" />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="count" stroke="#ff8042" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="graph-card">
        <h3>Average Posts per Group per Month</h3>
        <p className="graph-description">Compares average monthly posts across different groups.</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.avgPostsPerGroup}>
            <XAxis dataKey="groupName" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="averagePosts" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="graph-card">
        <h3>New Users per Month</h3>
        <p className="graph-description">Displays user registration trends by month.</p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.newUsersPerMonth}>
            <XAxis dataKey="month" />
            <YAxis />
            <CartesianGrid strokeDasharray="3 3" />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="count" stroke="#82ca9d" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="graph-card">
        <h3>Top 5 Most Active Users</h3>
        <p className="graph-description">Highlights users with the most posts and comments.</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.topActiveUsers}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="activityScore" fill="#ffc658" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="graph-card">
        <h3>Groups Distribution</h3>
        <p className="graph-description">Shows the proportion of public vs. private groups.</p>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data.groupTypes}
              dataKey="value"
              nameKey="type"
              cx="50%"
              cy="50%"
              outerRadius={100}
              fill="#8884d8"
              label
            >
              {data.groupTypes?.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
