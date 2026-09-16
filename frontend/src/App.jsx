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
import SearchProperty from './pages/Dashboard/SearchProperty';
import Sale from './pages/Dashboard/Sale';
import PurchaseReview from './pages/Dashboard/PurchaseReview';
import FundBlocking from './pages/Dashboard/FundBlocking';
import Notifications from './pages/Dashboard/Notifications';
import WalletRecovery from './pages/Dashboard/WalletRecovery';
import Transactions from './pages/Dashboard/Transactions';
import ReapplyKYC from './pages/Dashboard/ReapplyKYC';
import ReapplyProperty from './pages/Dashboard/ReapplyProperty';
import Sidebar from './layouts/Sidebar';
import AdminSidebar from './layouts/AdminSidebar';
//Authority Admin Routes 
import AuthorityLogin from './pages/Admin/AuthorityLogin';
import AdminDashboard from './pages/Admin/AuthorityDashboard';
import KYCApproval from './pages/Admin/KYCApproval';
import ReKycApproval from './pages/Admin/ReKycApproval';
import PropertyVerification from './pages/Admin/PropertyVerification';
import SaleApproval from './pages/Admin/SaleApproval';
import FundBlockConfirmation from './pages/Admin/FundBlockConfirmation';
import WalletRecoveryApproval from './pages/Admin/WalletRecoveryApproval';
import PropertyInvestigation from './pages/Admin/PropertyInvestigation';
import WalletSearch from './pages/Admin/WalletSearch';
import SystemLogs from './pages/Admin/SystemLogs';
import RiskMonitor from './pages/Admin/RiskMonitor';
import RevenueAnalytics from './pages/Admin/RevenueAnalytics';
import DisputeCenter from './pages/Admin/DisputeCenter';
import BlockchainHealth from './pages/Admin/BlockchainHealth';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('Unhandled UI Error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#050505', color: '#fff', padding: '2rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#ef4444' }}>Something went wrong loading this page.</h2>
          <pre style={{ maxWidth: '600px', backgroundColor: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '0.5rem', overflowX: 'auto', fontSize: '0.85rem', marginBottom: '1.5rem', color: '#f87171' }}>
            {this.state.error?.toString()}
          </pre>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.href = '/login';
            }}
            style={{ padding: '0.75rem 1.5rem', borderRadius: '0.75rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Clear Cache & Reload Login
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Web3Provider>
          <Router>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/authority/login" element={<AuthorityLogin />} />

            {/* User Routes wrapped in Sidebar Layout */}
            <Route element={<Sidebar />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/my-properties" element={<MyProperties />} />
              <Route path="/register-property" element={<RegisterProperty />} />
              <Route path="/search-property" element={<SearchProperty />} />
              <Route path="/properties/:id" element={<PropertyDetails />} />
              <Route path="/sale" element={<Sale />} />
              <Route path="/sale/:id/review" element={<PurchaseReview />} />
              <Route path="/sale/:id/fund-block" element={<FundBlocking />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/wallet-recovery" element={<WalletRecovery />} />
              <Route path="/reapply-kyc" element={<ReapplyKYC />} />
              <Route path="/kyc/reapply" element={<ReapplyKYC />} />
              <Route path="/reapply-property/:id" element={<ReapplyProperty />} />
              <Route path="/properties/:id/reapply" element={<ReapplyProperty />} />
              <Route path="/transactions" element={<Transactions />} />
            </Route>

            {/* Authority Admin Routes — separate AdminSidebar layout */}
            <Route element={<AdminSidebar />}>
              <Route path="/authority" element={<AdminDashboard />} />
              <Route path="/authority/kyc" element={<KYCApproval />} />
              <Route path="/authority/kyc/:id" element={<KYCApproval />} />
              <Route path="/authority/re-kyc" element={<ReKycApproval />} />
              <Route path="/authority/kyc/reapplications" element={<ReKycApproval />} />
              <Route path="/authority/property" element={<PropertyVerification />} />
              <Route path="/authority/property/:id" element={<PropertyVerification />} />
              <Route path="/authority/sale" element={<SaleApproval />} />
              <Route path="/authority/sale/:id" element={<SaleApproval />} />
              <Route path="/authority/fund" element={<FundBlockConfirmation />} />
              <Route path="/authority/fund/:id" element={<FundBlockConfirmation />} />
              <Route path="/authority/wallet-recovery" element={<WalletRecoveryApproval />} />
              <Route path="/authority/wallet-recovery/:id" element={<WalletRecoveryApproval />} />
              <Route path="/authority/investigation" element={<PropertyInvestigation />} />
              <Route path="/authority/investigation/:id" element={<PropertyInvestigation />} />
              <Route path="/authority/risk-monitor" element={<RiskMonitor />} />
              <Route path="/authority/search" element={<WalletSearch />} />
              <Route path="/authority/revenue" element={<RevenueAnalytics />} />
              <Route path="/authority/disputes" element={<DisputeCenter />} />
              <Route path="/authority/blockchain-health" element={<BlockchainHealth />} />
              <Route path="/authority/logs" element={<SystemLogs />} />
            </Route>
          </Routes>
        </Router>
      </Web3Provider>
    </AuthProvider>
  </ErrorBoundary>
  );
}

export default App;

