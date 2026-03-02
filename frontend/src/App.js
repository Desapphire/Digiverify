import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import API from "./services/api";
import Login from "./pages/Login";
import Register from "./pages/Register";
import OwnerDashboard from "./pages/OwnerDashboard";
import VerifierDashboard from "./pages/VerifierDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Navbar from "./components/Navbar";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const res = await API.get("/auth/me");
      if (res.data.success) {
        setUser(res.data.data);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      await API.post("/auth/logout");
      setUser(null);
    } catch (err) {
      console.error("Logout failed");
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading your workspace...</p>
      </div>
    );
  }

  const getDashboardRoute = () => {
    if (!user) return "/login";
    switch (user.role) {
      case "owner": return "/owner";
      case "verifier": return "/verifier";
      case "admin": return "/admin";
      default: return "/login";
    }
  };

  return (
    <Router>
      <div className="app">
        {user && <Navbar user={user} onLogout={handleLogout} />}
        {user ? (
          <div className="main-content">
            <Routes>
              <Route
                path="/owner"
                element={user.role === "owner" ? <OwnerDashboard user={user} /> : <Navigate to={getDashboardRoute()} />}
              />
              <Route
                path="/verifier"
                element={user.role === "verifier" ? <VerifierDashboard user={user} /> : <Navigate to={getDashboardRoute()} />}
              />
              <Route
                path="/admin"
                element={user.role === "admin" ? <AdminDashboard user={user} /> : <Navigate to={getDashboardRoute()} />}
              />
              <Route path="*" element={<Navigate to={getDashboardRoute()} />} />
            </Routes>
          </div>
        ) : (
          <Routes>
            <Route path="/login" element={<Login setUser={setUser} />} />
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        )}
      </div>
    </Router>
  );
}

export default App;
