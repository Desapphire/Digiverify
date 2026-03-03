import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Web3Provider } from './context/Web3Context';
//Auth Routes
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
//User Routes
import Dashboard from './pages/Dashboard/Dashboard';
import Profile from './pages/Dashboard/Profile';
import MyProperties from './pages/Dashboard/MyProperties';
import RegisterProperty from './pages/Dashboard/RegisterProperty';
import PropertyDetails from './pages/Dashboard/PropertyDetails';
import Sale from './pages/Dashboard/Sale';
import PurchaseReview from './pages/Dashboard/PurchaseReview';
import FundBlocking from './pages/Dashboard/FundBlocking';
import Notifications from './pages/Dashboard/Notifications';
import WalletRecovery from './pages/Dashboard/WalletRecovery';
import Transactions from './pages/Dashboard/Transactions';
import Sidebar from './layouts/Sidebar';
//Authority Admin Routes 
import AdminDashboard from './pages/Admin/AuthorityDashboard';
import KYCApproval from './pages/Admin/KYCApproval';
import PropertyVerification from './pages/Admin/PropertyVerification';
import SaleApproval from './pages/Admin/SaleApproval';

//Auth Routesion App() {
return (
  <AuthProvider>
    <Web3Provider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* User Routes wrapped in Sidebar Layout */}
          <Route element={<Sidebar />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/my-properties" element={<MyProperties />} />
            <Route path="/register-property" element={<RegisterProperty />} />
            <Route path="/properties/:id" element={<PropertyDetails />} />
            <Route path="/sale" element={<Sale />} />
            <Route path="/sale/:id/review" element={<PurchaseReview />} />
            <Route path="/sale/:id/fund-block" element={<FundBlocking />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/wallet-recovery" element={<WalletRecovery />} />
            <Route path="/transactions" element={<Transactions />} />

            {/* Authority Admin Routes */}
            <Route path="/authority" element={<AdminDashboard />} />
            <Route path="/authority/kyc/:id" element={<KYCApproval />} />
            <Route path="/authority/property/:id" element={<PropertyVerification />} />
            <Route path="/authority/sale/:id" element={<SaleApproval />} />
          </Route>
        </Routes>
      </Router>
    </Web3Provider>
  </AuthProvider>
);
}

export default App;

