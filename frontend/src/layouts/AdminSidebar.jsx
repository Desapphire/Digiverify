import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminSidebar.css';
import {
    ShieldAlert,
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
    ArrowLeftRight
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

    // ── Nav Item ──
    const NavItem = ({ icon: Icon, label, active, onClick }) => (
        <button
            onClick={onClick}
            className={`admin-nav-item ${active ? 'active' : ''}`}
        >
            <div className={`nav-content ${isCollapsed ? 'centered' : ''}`}>
                <Icon size={18} />
                {!isCollapsed && <span>{label}</span>}
            </div>
            {isCollapsed && <div className="admin-tip">{label}</div>}
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
        <div className="flex" style={{ background: 'hsl(var(--color-bg-base))', minHeight: '100vh' }}>
            {/* ── Sidebar ── */}
            <aside className={`admin-sidebar ${isCollapsed ? 'admin-sidebar-collapsed' : 'admin-sidebar-expanded'}`}
                style={{ position: 'fixed', left: 0, top: 0, height: '100vh', display: 'flex', flexDirection: 'column' }}>

                {/* Logo */}
                <div className="admin-topbar">
                    <div className={`admin-logo-box ${isCollapsed ? 'collapsed' : ''}`}>
                        <div className="admin-logo-icon">
                            <img src="/logo.png" alt="Digiverify" style={{ width: 24, height: 24 }} />
                        </div>
                        <div className="admin-logo-text">
                            <span className="title">Digi<span className="accent">verify</span></span>
                            <span className="subtitle">Authority</span>
                        </div>
                    </div>
                    <button onClick={() => setIsCollapsed(!isCollapsed)} className="admin-collapse-btn">
                        {isCollapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
                    </button>
                </div>

                {/* Status */}
                {!isCollapsed && (
                    <div className="admin-status-bar">
                        <div className="admin-status-dot"></div>
                        <span className="admin-status-label">System Online</span>
                    </div>
                )}

                {/* Navigation */}
                <div className="admin-nav-scroll">
                    <NavSection divider={true}>
                        <NavItem
                            icon={LayoutDashboard}
                            label="Command Center"
                            active={isPathActive('/authority')}
                            onClick={() => navigate('/authority')}
                        />
                    </NavSection>

                    <NavSection title="Approvals" divider={true}>
                        <NavItem
                            icon={UserCheck}
                            label="KYC Approvals"
                            active={isPathStartsWith('/authority/kyc')}
                            onClick={() => navigate('/authority/kyc/latest')}
                        />
                        <NavItem
                            icon={Building2}
                            label="Property Verification"
                            active={isPathStartsWith('/authority/property')}
                            onClick={() => navigate('/authority/property/latest')}
                        />
                        <NavItem
                            icon={HandCoins}
                            label="Sale Approvals"
                            active={isPathStartsWith('/authority/sale')}
                            onClick={() => navigate('/authority/sale/latest')}
                        />
                        <NavItem
                            icon={Landmark}
                            label="Fund Block Confirm"
                            active={isPathStartsWith('/authority/fund')}
                            onClick={() => navigate('/authority/fund/latest')}
                        />
                        <NavItem
                            icon={KeyRound}
                            label="Wallet Recovery"
                            active={isPathStartsWith('/authority/wallet-recovery')}
                            onClick={() => navigate('/authority/wallet-recovery/latest')}
                        />
                    </NavSection>

                    <NavSection title="Investigation" divider={true}>
                        <NavItem
                            icon={Search}
                            label="Wallet Search"
                            active={isPathActive('/authority/search')}
                            onClick={() => navigate('/authority/search')}
                        />
                        <NavItem
                            icon={FileText}
                            label="Property Investigation"
                            active={isPathStartsWith('/authority/investigation')}
                            onClick={() => navigate('/authority/investigation/latest')}
                        />
                    </NavSection>

                    <NavSection title="System" divider={false}>
                        <NavItem
                            icon={ScrollText}
                            label="Audit Logs"
                            active={isPathActive('/authority/logs')}
                            onClick={() => navigate('/authority/logs')}
                        />
                    </NavSection>
                </div>

                {/* Footer */}
                <div className="admin-footer">
                    {!isCollapsed && (
                        <button onClick={() => navigate('/dashboard')} className="admin-switch-btn">
                            <ArrowLeftRight size={14} />
                            Switch to User View
                        </button>
                    )}

                    <div className={`admin-user-row ${isCollapsed ? 'compact' : ''}`}>
                        {!isCollapsed && (
                            <div className="admin-user-info">
                                <div className="admin-user-avatar">
                                    <div className="admin-user-avatar-inner">
                                        {user?.name?.charAt(0) || 'A'}
                                    </div>
                                </div>
                                <div className="admin-user-meta">
                                    <div className="admin-user-name">{user?.name || 'Admin'}</div>
                                    <span className="admin-user-role">{user?.role?.toUpperCase() || 'AUTHORITY'}</span>
                                </div>
                            </div>
                        )}
                        <button onClick={handleLogout} className="admin-logout-btn" title="Logout">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* ── Main Content ── */}
            <main className={`admin-main ${isCollapsed ? 'collapsed-main' : 'expanded'}`}>
                <div className="admin-blob-1"></div>
                <div className="admin-blob-2"></div>
                <div style={{ height: '100%' }}>
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminSidebar;
