import React from "react";
import { useNavigate } from "react-router-dom";

function Navbar({ user, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await onLogout();
    navigate("/login");
  };

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2);
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="navbar-logo">
          <span className="icon" style={{ fontSize: 20, color: "white" }}>verified_user</span>
        </div>
        <h2>DigiVerify</h2>
      </div>
      <div className="navbar-info">
        <div className="navbar-user">
          <div className="navbar-avatar">{getInitials(user.name)}</div>
          <div className="navbar-user-details">
            <span className="navbar-user-name">{user.name}</span>
            <span className="navbar-user-email">{user.email}</span>
          </div>
        </div>
        <span className={`role-badge role-${user.role}`}>{user.role}</span>
        <button className="btn-logout" onClick={handleLogout}>
          <span className="icon" style={{ fontSize: 16 }}>logout</span>
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
