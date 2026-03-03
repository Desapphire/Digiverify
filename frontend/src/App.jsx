import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Web3Provider } from './context/Web3Context';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import UserDashboard from './pages/Dashboard/UserDashboard';
import RegisterProperty from './pages/Dashboard/RegisterProperty';
import PropertyDetails from './pages/Dashboard/PropertyDetails';

function App() {
  return (
    <AuthProvider>
      <Web3Provider>
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<UserDashboard />} />
            <Route path="/register-property" element={<RegisterProperty />} />
            <Route path="/properties/:id" element={<PropertyDetails />} />
          </Routes>
        </Router>
      </Web3Provider>
    </AuthProvider>
  );
}

export default App;
