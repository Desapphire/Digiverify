import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";

function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await API.post("/auth/register", formData);
      if (res.data.success) {
        setSuccess("Registration successful! Redirecting to login...");
        setTimeout(() => navigate("/login"), 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <div className="auth-icon">
            <span className="icon">person_add</span>
          </div>
          <h2>Create Account</h2>
          <p>Register to start using DigiVerify</p>
        </div>
        {error && (
          <div className="error-msg">
            <span className="icon" style={{ fontSize: 18 }}>error</span>
            {error}
          </div>
        )}
        {success && (
          <div className="success-msg">
            <span className="icon" style={{ fontSize: 18 }}>check_circle</span>
            {success}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <div className="form-input-wrapper">
              <span className="icon">person</span>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Kartik"
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <div className="form-input-wrapper">
              <span className="icon">email</span>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label>Password</label>
            <div className="form-input-wrapper">
              <span className="icon">lock</span>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a strong password"
                required
              />
              <span
                className="icon toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: 14, cursor: "pointer", left: "auto" }}
              >
                {showPassword ? "visibility_off" : "visibility"}
              </span>
            </div>
          </div>
          {/* Bug #3: Role is always 'owner' — admin/verifier can only be set by an admin directly in the DB */}
          {/* Role dropdown removed from public registration */}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>
        <p className="auth-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
