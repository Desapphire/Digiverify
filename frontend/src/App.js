import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import WalletRecovery from './pages/Auth/WalletRecovery';
import Dashboard from './pages/Dashboard/Dashboard';

import PropertyList from './pages/Properties/PropertyList';
import PropertyDetails from './pages/Properties/PropertyDetails';
import SalesList from './pages/Sales/SalesList';

import AuthorityDashboard from './pages/Admin/AuthorityDashboard';
import BankDashboard from './pages/Admin/BankDashboard';
import { Web3Provider } from './context/Web3Context';

import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    let user = null;
    if (userStr && userStr !== 'undefined') {
      try { user = JSON.parse(userStr); } catch (e) { }
    }

    if (token) {
      setIsAuthenticated(true);
      if (user) setUserRole(user.role);
    }
  }, []);

  const ProtectedRoute = ({ children }) => {
    if (!isAuthenticated) return <Navigate to="/login" />;
    return (
      <>
        <Navbar onLogout={() => { setIsAuthenticated(false); setUserRole(null); }} />
        {children}
      </>
    );
  };

  return (
    <Web3Provider>
      <Router>
        <div className="app-container">
          <main className="main-content">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
              <Route path="/login" element={!isAuthenticated ? <Login setAuth={(status) => {
                setIsAuthenticated(status);
                const userStr = localStorage.getItem('user');
                if (userStr && userStr !== 'undefined') {
                  try {
                    const u = JSON.parse(userStr);
                    if (u) setUserRole(u.role);
                  } catch (e) { }
                }
              }} /> : <Navigate to="/dashboard" />} />
              <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />} />
              <Route path="/recovery" element={<WalletRecovery />} />

              {/* General Protected Routes */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/properties" element={<ProtectedRoute><PropertyList type="my" /></ProtectedRoute>} />
              <Route path="/marketplace" element={<ProtectedRoute><PropertyList type="search" /></ProtectedRoute>} />
              <Route path="/properties/:id" element={<ProtectedRoute><PropertyDetails /></ProtectedRoute>} />
              <Route path="/sales" element={<ProtectedRoute><SalesList /></ProtectedRoute>} />

              {/* Admin Routes */}
              <Route path="/admin/approvals" element={<ProtectedRoute><AuthorityDashboard /></ProtectedRoute>} />
              <Route path="/bank" element={<ProtectedRoute><BankDashboard /></ProtectedRoute>} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
            </Routes>
          </main>
        </div>
      </Router>
    </Web3Provider>
  );
}

export default App;
