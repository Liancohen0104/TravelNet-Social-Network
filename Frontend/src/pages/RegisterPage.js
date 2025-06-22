import { useState } from "react";
import { useNavigate } from "react-router-dom";
import usersApi from "../services/usersApi";
import "../css/RegisterPage.css";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    image: null,
    bio: "",
    location: "",
    birthDay: "1",
    birthMonth: "January",
    birthYear: "2000",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const birthDate = new Date(`${formData.birthYear}-${months.indexOf(formData.birthMonth) + 1}-${formData.birthDay}`);

    const data = new FormData();
    data.append("firstName", formData.firstName);
    data.append("lastName", formData.lastName);
    data.append("email", formData.email);
    data.append("password", formData.password);
    data.append("confirmPassword", formData.confirmPassword); 
    data.append("bio", formData.bio);
    data.append("location", formData.location);
    data.append("dateOfBirth", birthDate.toISOString());
    if (formData.image) data.append("image", formData.image);

    try {
      setLoading(true);
      await usersApi.register(data);
      navigate("/login");
    } catch (err) {
      if (err.response?.data?.detail) {
        alert(err.response.data.detail);
      } else if (err.response?.data) {
        alert(JSON.stringify(err.response.data));
      } else if (err.message) {
        alert(err.message);
      } else {
        alert("Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-title">TravelNet</div>
      <form className="register-form" onSubmit={handleSubmit}>
        <h2>Create New Account</h2>
        <p>It's quick and easy.</p>
        <hr />

        <div className="name-fields">
          <input type="text" name="firstName" placeholder="First Name *" onChange={handleChange} required />
          <input type="text" name="lastName" placeholder="Last Name *" onChange={handleChange} required />
        </div>

        <input type="email" name="email" placeholder="Email *" onChange={handleChange} required />
        <input type="password" name="password" placeholder="Password *" onChange={handleChange} required />
        <input type="password" name="confirmPassword" placeholder="Confirm Password *" onChange={handleChange} required />

        <label>Date of Birth</label>
        <div className="dob-fields">
          <select name="birthDay" value={formData.birthDay} onChange={handleChange}>{Array.from({ length: 31 }, (_, i) => <option key={i+1}>{i+1}</option>)}</select>
          <select name="birthMonth" value={formData.birthMonth} onChange={handleChange}>{months.map((m) => <option key={m}>{m}</option>)}</select>
          <select name="birthYear" value={formData.birthYear} onChange={handleChange}>{Array.from({ length: 85 }, (_, i) => <option key={i}>{2025 - i}</option>)}</select>
        </div>

        <label>Upload profile picture</label>
        <div className="dob-fields">
            <input type="file" name="image" onChange={handleChange} accept="image/*" />
        </div>

        <textarea name="bio" placeholder="Short bio..." onChange={handleChange} />
        <input type="text" name="location" placeholder="Location" onChange={handleChange} />

        {error && <p className="error-text">{error}</p>}

        <button type="submit" disabled={loading}>{loading ? "Registering..." : "Register"}</button>

        <p className="login-link">Already have an account? <a href="/login">Login</a></p>
      </form>
    </div>
  );
}
