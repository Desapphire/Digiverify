import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminSidebar.css';
import {
    LayoutDashboard,
    UserCheck,
    Building2,
    HandCoins,
    Landmark,
    KeyRound,
    Search,
    FileText,
    ScrollText,
    LogOut,
    ChevronLeft,
    Menu,
    Shield,
    Bell,
    CheckCircle2,
    RefreshCcw,
    ShieldAlert,
    Receipt,
    Gavel,
    Cpu
} from 'lucide-react';

const AdminSidebar = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const isPathActive = (path) => location.pathname === path;
    const isPathStartsWith = (prefix) => location.pathname.startsWith(prefix);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getPageTitle = () => {
        const path = location.pathname;
        if (path === '/authority') return 'Overview Dashboard';
        if (path.startsWith('/authority/kyc')) return 'Identity Checks (KYC)';
        if (path.startsWith('/authority/property')) return 'Land & Properties';
        if (path.startsWith('/authority/sale')) return 'Property Sales';
        if (path.startsWith('/authority/fund')) return 'Payment Holds';
        if (path.startsWith('/authority/wallet-recovery')) return 'Account Recovery';
        if (path.startsWith('/authority/risk-monitor')) return 'AI Fraud & Risk Monitor';
        if (path.startsWith('/authority/search')) return 'Search Citizens';
        if (path.startsWith('/authority/investigation')) return 'Property Investigation';
        if (path.startsWith('/authority/revenue')) return 'Stamp Duty & Revenue Analytics';
        if (path.startsWith('/authority/disputes')) return 'Legal Disputes & Court Cases';
        if (path.startsWith('/authority/blockchain-health')) return 'Blockchain & System Infrastructure';
        if (path.startsWith('/authority/logs')) return 'Activity Logs';
        return 'Officer Portal';
    };

    // ── Nav Item ──
    const NavItem = ({ icon: Icon, label, active, onClick, badge }) => (
        <button
            onClick={onClick}
            className={`admin-nav-item ${active ? 'active' : ''}`}
            title={isCollapsed ? label : ''}
        >
            <div className={`nav-content ${isCollapsed ? 'centered' : ''}`}>
                <Icon size={18} />
                {!isCollapsed && <span>{label}</span>}
            </div>
            {!isCollapsed && badge && (
                <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '9999px',
                    background: '#2563EB',
                    color: '#FFFFFF'
                }}>
                    {badge}
                </span>
            )}
        </button>
    );

    // ── Section ──
    const NavSection = ({ title, children, divider = true }) => (
        <div className={`admin-nav-section ${divider ? 'with-divider' : ''}`}>
            {!isCollapsed && title && (
                <div className="admin-section-title">{title}</div>
            )}
            {children}
        </div>
    );

    return (
        <div className="admin-portal-wrapper">
            {/* ── Sidebar ── */}
            <aside className={`admin-sidebar ${isCollapsed ? 'admin-sidebar-collapsed' : 'admin-sidebar-expanded'}`}>

                {/* Logo */}
                <div className="admin-topbar">
                    <div className={`admin-logo-box ${isCollapsed ? 'collapsed' : ''}`}>
                        <div className="admin-logo-icon">
                            <Shield size={20} color="#FFFFFF" />
                        </div>
                        {!isCollapsed && (
                            <div className="admin-logo-text">
                                <span className="title">Digi<span className="accent">Verify</span></span>
                                <span className="subtitle">Officer Portal</span>
                            </div>
                        )}
                    </div>
                    <button onClick={() => setIsCollapsed(!isCollapsed)} className="admin-collapse-btn" title="Toggle Sidebar">
                        {isCollapsed ? <Menu size={16} /> : <ChevronLeft size={16} />}
                    </button>
                </div>

                {/* Navigation */}
                <div className="admin-nav-scroll">
                    <NavSection divider={true}>
                        <NavItem
                            icon={LayoutDashboard}
                            label="Dashboard"
                            active={isPathActive('/authority')}
                            onClick={() => navigate('/authority')}
                        />
                    </NavSection>

                    <NavSection title="Review & Approvals" divider={true}>
                        <NavItem
                            icon={UserCheck}
                            label="Identity Checks"
                            active={isPathStartsWith('/authority/kyc') && !isPathActive('/authority/re-kyc') && !isPathActive('/authority/kyc/reapplications')}
                            onClick={() => navigate('/authority/kyc')}
                        />
                        <NavItem
                            icon={RefreshCcw}
                            label="Re-KYC Reviews"
                            active={isPathActive('/authority/re-kyc') || isPathActive('/authority/kyc/reapplications')}
                            onClick={() => navigate('/authority/re-kyc')}
                        />
                        <NavItem
                            icon={Building2}
                            label="Land & Properties"
                            active={isPathStartsWith('/authority/property')}
                            onClick={() => navigate('/authority/property')}
                        />
                        <NavItem
                            icon={HandCoins}
                            label="Property Sales"
                            active={isPathStartsWith('/authority/sale')}
                            onClick={() => navigate('/authority/sale')}
                        />
                        <NavItem
                            icon={Landmark}
                            label="Payment Holds"
                            active={isPathStartsWith('/authority/fund')}
                            onClick={() => navigate('/authority/fund')}
                        />
                        <NavItem
                            icon={KeyRound}
                            label="Account Recovery"
                            active={isPathStartsWith('/authority/wallet-recovery')}
                            onClick={() => navigate('/authority/wallet-recovery')}
                        />
                    </NavSection>

                    <NavSection title="Governance & Intel" divider={true}>
                        <NavItem
                            icon={Receipt}
                            label="Revenue & Stamp Duty"
                            active={isPathStartsWith('/authority/revenue')}
                            onClick={() => navigate('/authority/revenue')}
                        />
                        <NavItem
                            icon={Gavel}
                            label="Court Cases & Disputes"
                            active={isPathStartsWith('/authority/disputes')}
                            onClick={() => navigate('/authority/disputes')}
                        />
                        <NavItem
                            icon={ShieldAlert}
                            label="Risk Monitor"
                            active={isPathStartsWith('/authority/risk-monitor')}
                            onClick={() => navigate('/authority/risk-monitor')}
                            badge="AI"
                        />
                    </NavSection>

                    <NavSection title="Search & Records" divider={true}>
                        <NavItem
                            icon={Search}
                            label="Find Citizen"
                            active={isPathActive('/authority/search')}
                            onClick={() => navigate('/authority/search')}
                        />
                        <NavItem
                            icon={FileText}
                            label="Check Property"
                            active={isPathStartsWith('/authority/investigation')}
                            onClick={() => navigate('/authority/investigation')}
                        />
                    </NavSection>

                    <NavSection title="Infrastructure & Audit" divider={false}>
                        <NavItem
                            icon={Cpu}
                            label="Blockchain Health"
                            active={isPathStartsWith('/authority/blockchain-health')}
                            onClick={() => navigate('/authority/blockchain-health')}
                        />
                        <NavItem
                            icon={ScrollText}
                            label="Activity Logs"
                            active={isPathActive('/authority/logs')}
                            onClick={() => navigate('/authority/logs')}
                        />
                    </NavSection>
                </div>

                {/* Footer */}
                <div className="admin-footer">
                    <div className="admin-user-row">
                        {!isCollapsed && (
                            <div className="admin-user-info">
                                <div className="admin-user-avatar">
                                    {user?.name?.charAt(0) || 'A'}
                                </div>
                                <div className="admin-user-meta">
                                    <div className="admin-user-name">{user?.name || 'Officer'}</div>
                                    <span className="admin-user-role">{user?.role?.toUpperCase() || 'OFFICER'}</span>
                                </div>
                            </div>
                        )}
                        <button onClick={handleLogout} className="admin-logout-btn" title="Logout">
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* ── Main Content ── */}
            <main className={`admin-main ${isCollapsed ? 'collapsed-main' : 'expanded'}`}>
                {/* Executive Top Navbar */}
                <header className="admin-navbar">
                    <div className="admin-navbar-title">
                        <span>Officer Portal</span>
                        <span style={{ color: '#CBD5E1' }}>/</span>
                        <span className="current-page">{getPageTitle()}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#ECFDF5',
                            border: '1px solid #A7F3D0',
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#047857'
                        }}>
                            <CheckCircle2 size={13} />
                            <span>Officer Active</span>
                        </div>
                    </div>
                </header>

                <div className="admin-content-container">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminSidebar;
