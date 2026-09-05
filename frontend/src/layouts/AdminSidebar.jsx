import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminSidebar.css';
import { DigiVerifyLogo } from '../components/DigiVerifyLogo';
import {
    LayoutGrid,
    ShieldCheck,
    UserCheck,
    BadgeDollarSign,
    Lock,
    Scale,
    FileText,
    LogOut,
    ChevronLeft,
    Menu,
    ArrowLeftRight,
    Search
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

    const NavItem = ({ icon: Icon, label, active, onClick }) => (
        <button
            onClick={onClick}
            className={`admin-nav-item ${active ? 'active' : ''}`}
        >
            <div className={`nav-content ${isCollapsed ? 'centered' : ''}`}>
                <Icon size={19} />
                {!isCollapsed && <span>{label}</span>}
            </div>
            {isCollapsed && <div className="admin-tip">{label}</div>}
        </button>
    );

    return (
        <div className="flex" style={{ background: '#090D16', minHeight: '100vh' }}>
            {/* ── Sidebar ── */}
            <aside 
                className={`admin-sidebar ${isCollapsed ? 'admin-sidebar-collapsed' : 'admin-sidebar-expanded'}`}
                style={{ position: 'fixed', left: 0, top: 0, height: '100vh', display: 'flex', flexDirection: 'column' }}
            >
                {/* Logo Topbar */}
                <div className="admin-topbar">
                    <div className={`admin-logo-box ${isCollapsed ? 'collapsed' : ''}`}>
                        <DigiVerifyLogo size={30} subtitle="Authority Land Registry System" />
                    </div>
                    <button onClick={() => setIsCollapsed(!isCollapsed)} className="admin-collapse-btn">
                        {isCollapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
                    </button>
                </div>

                {/* Navigation Items - Exact Match to dashboard.png */}
                <div className="admin-nav-scroll">
                    <NavItem
                        icon={LayoutGrid}
                        label="Dashboard"
                        active={isPathActive('/authority')}
                        onClick={() => navigate('/authority')}
                    />
                    <NavItem
                        icon={ShieldCheck}
                        label="Property Verifications"
                        active={isPathStartsWith('/authority/property')}
                        onClick={() => navigate('/authority/property/latest')}
                    />
                    <NavItem
                        icon={UserCheck}
                        label="KYC Approvals"
                        active={isPathStartsWith('/authority/kyc')}
                        onClick={() => navigate('/authority/kyc/latest')}
                    />
                    <NavItem
                        icon={BadgeDollarSign}
                        label="Active Sales"
                        active={isPathStartsWith('/authority/sale')}
                        onClick={() => navigate('/authority/sale/latest')}
                    />
                    <NavItem
                        icon={Lock}
                        label="Fund Blocking"
                        active={isPathStartsWith('/authority/fund')}
                        onClick={() => navigate('/authority/fund/latest')}
                    />
                    <NavItem
                        icon={Scale}
                        label="Court Overrides"
                        active={isPathStartsWith('/authority/investigation')}
                        onClick={() => navigate('/authority/investigation/latest')}
                    />
                    <NavItem
                        icon={FileText}
                        label="System Logs"
                        active={isPathActive('/authority/logs')}
                        onClick={() => navigate('/authority/logs')}
                    />

                    <div style={{ margin: '1rem 0', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
                        <NavItem
                            icon={Search}
                            label="Wallet Search"
                            active={isPathActive('/authority/search')}
                            onClick={() => navigate('/authority/search')}
                        />
                    </div>
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
                                    {user?.name?.charAt(0) || 'A'}
                                </div>
                                <div className="admin-user-meta">
                                    <div className="admin-user-name">{user?.name || 'Admin'}</div>
                                    <span className="admin-user-role">{user?.role?.toUpperCase() || 'AUTHORITY'}</span>
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
                <div style={{ height: '100%' }}>
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminSidebar;
